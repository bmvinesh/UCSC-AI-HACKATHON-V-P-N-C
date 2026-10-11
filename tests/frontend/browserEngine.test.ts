import { expect, test } from 'vitest'
import examples from '../../contracts/examples.json'
import { parseContract, type ScenarioRequest } from '../../web/src/contracts/index.ts'
import { BrowserEngine } from '../../web/src/engines/browser/BrowserEngine.ts'
import type { RunGraph } from '../../web/src/engines/browser/inference.ts'
import { loadRelease } from '../../web/src/engines/browser/loadRelease.ts'
import { EngineError } from '../../web/src/engines/index.ts'
import { describeEngineConformance } from './engineConformance.ts'
import { ELIGIBLE_CASE, constantGraph, fakeRelease } from './fakeRelease.ts'

const mechanistic: ScenarioRequest = { ...parseContract('ScenarioRequest', examples.ScenarioRequest), model_version: examples.MechanisticManifest.model_version }
const empirical: ScenarioRequest = { ...mechanistic, engine: 'empirical', case_id: ELIGIBLE_CASE.id, model_version: examples.EmpiricalManifest.model_version }

const make = (runGraph: RunGraph = constantGraph(), release = fakeRelease()) => new BrowserEngine(release.fetchArtifact, runGraph)

describeEngineConformance('BrowserEngine', () => make(), mechanistic)

async function finished(engine: BrowserEngine, request: ScenarioRequest) {
  let job = await engine.submitScenario(request)
  for (let i = 0; i < 100 && (job.state === 'queued' || job.state === 'running'); i++) {
    await new Promise((resolve) => setTimeout(resolve, 2))
    job = await engine.getJob(job.id)
  }
  return job
}

async function problemOf(action: Promise<unknown>) {
  try {
    await action
  } catch (error) {
    if (error instanceof EngineError) return error.problem
    throw error
  }
  throw new Error('expected a problem')
}

test('a complete release loads with nothing degraded, and reports the Pages profile with no chat', async () => {
  expect(await make().capabilities()).toEqual({
    profile: 'pages',
    empirical_available: true,
    mechanistic_available: true,
    chat_available: false,
    empirical_model_version: examples.EmpiricalManifest.model_version,
    mechanistic_model_version: examples.MechanisticManifest.model_version,
    status: 'ready',
    degraded_reasons: [],
  })
})

test('only files named by the release are requested, and the release loads once', async () => {
  const release = fakeRelease()
  const engine = new BrowserEngine(release.fetchArtifact, constantGraph())
  await Promise.all([engine.capabilities(), engine.listCases(), engine.capabilities()])
  expect([...release.requested].sort()).toEqual([...release.files.keys()].sort())
})

test('a model whose bytes fail their hash disables that engine only, with a reason', async () => {
  const release = fakeRelease((files) => files.set(examples.MechanisticManifest.onnx_path, new TextEncoder().encode('tampered')))
  const capabilities = await make(constantGraph(), release).capabilities()
  expect(capabilities).toMatchObject({ mechanistic_available: false, mechanistic_model_version: null, empirical_available: true, status: 'degraded' })
  expect(capabilities.degraded_reasons).toEqual([`The mechanistic what-if is unavailable: ${examples.MechanisticManifest.onnx_path} does not match its recorded SHA-256`])
  expect((await problemOf(make(constantGraph(), release).submitScenario(mechanistic))).code).toBe('MODEL_UNAVAILABLE')
})

test('the contract example index (no empirical manifest, zero hashes) degrades instead of failing', async () => {
  const release = fakeRelease((files) => files.set('release-index.json', new TextEncoder().encode(JSON.stringify(examples.ReleaseIndex))))
  const loaded = await loadRelease(release.fetchArtifact)
  expect(loaded.empirical).toBeNull()
  expect(loaded.mechanistic).toBeNull()
  expect(loaded.cases).toEqual([])
  expect(loaded.degradedReasons).toHaveLength(4)
  expect(loaded.degradedReasons[0]).toBe('The empirical forecast is unavailable: the release does not include it')
})

test('a missing or malformed release index is a retryable MODEL_UNAVAILABLE problem', async () => {
  const missing = fakeRelease((files) => files.delete('release-index.json'))
  expect(await problemOf(make(constantGraph(), missing).capabilities())).toMatchObject({ code: 'MODEL_UNAVAILABLE', retryable: true })
  const malformed = fakeRelease((files) => files.set('release-index.json', new TextEncoder().encode('{"release_id": 3}')))
  expect((await problemOf(make(constantGraph(), malformed).listCases())).code).toBe('MODEL_UNAVAILABLE')
})

test('the mechanistic graph is fed raw values in the contract layout', async () => {
  const calls: Parameters<RunGraph>[] = []
  await finished(make(constantGraph(calls)), { ...mechanistic, horizon_days: 3, intervention: 'none', sensitivity_scale: 1.5 })
  const [, feeds, outputs] = calls[0]
  expect(outputs).toEqual(['volume_cm3', 'lower_cm3', 'upper_cm3'])
  expect(Object.fromEntries(Object.entries(feeds).map(([name, t]) => [name, { data: [...t.data], dims: t.dims }]))).toEqual({
    baseline_volume_cm3: { data: [10], dims: [1] },
    days: { data: [0, 1, 2, 3], dims: [4] },
    intervention_on: { data: [0], dims: [1] },
    sensitivity_scale: { data: [1.5], dims: [1] },
  })
})

test('the empirical graph is fed one row per day, baseline untransformed', async () => {
  const calls: Parameters<RunGraph>[] = []
  await finished(make(constantGraph(calls)), { ...empirical, horizon_days: 2 })
  const [, feeds, outputs] = calls[0]
  expect(outputs).toEqual(['volume_cm3'])
  expect([...feeds.baseline_volume_cm3.data]).toEqual([10, 10, 10])
  expect(feeds.baseline_volume_cm3.dims).toEqual([3, 1])
  expect([...feeds.elapsed_days.data]).toEqual([0, 1, 2])
  expect(feeds.elapsed_days.dims).toEqual([3, 1])
})

test('results follow the source table: mechanistic assumption', async () => {
  const engine = make()
  const result = await engine.getResult((await finished(engine, { ...mechanistic, horizon_days: 5 })).result_id!)
  expect(result).toMatchObject({ source: 'mechanistic', origin_source: null, model_version: examples.MechanisticManifest.model_version, assumptions: examples.MechanisticManifest.assumptions })
  expect(result.curves).toHaveLength(1)
  expect(result.curves[0]).toMatchObject({ evidence: 'illustrative', band_kind: 'sensitivity' })
  expect(result.curves[0].points.map((p) => p.day)).toEqual([0, 1, 2, 3, 4, 5])
  expect(result.curves[0].points[0]).toEqual({ day: 0, volume_cm3: 10, lower_cm3: 10, upper_cm3: 10 })
})

test('results follow the source table: empirical trained on synthetic data is labelled synthetic, with no band', async () => {
  const engine = make()
  const result = await engine.getResult((await finished(engine, empirical)).result_id!)
  expect(result.source).toBe('synthetic')
  expect(result.curves[0]).toMatchObject({ evidence: 'forecast', band_kind: 'none' })
  expect(result.curves[0].points.every((p) => p.lower_cm3 === null && p.upper_cm3 === null)).toBe(true)
  expect(result.curves[0].points).toHaveLength(empirical.horizon_days + 1)
})

test.each([
  ['a NaN', (v: Float32Array) => v.fill(Number.NaN, 2, 3)],
  ['a negative volume', (v: Float32Array) => v.fill(-0.5, 1, 2)],
  ['too few values', (v: Float32Array) => v.slice(1)],
])('a graph that returns %s fails the job; nothing is clipped into range', async (_, damage) => {
  const good = constantGraph()
  const bad: RunGraph = async (...args) => {
    const outputs = await good(...args)
    return { ...outputs, volume_cm3: damage(outputs.volume_cm3) }
  }
  const job = await finished(make(bad), mechanistic)
  expect(job).toMatchObject({ state: 'failed', result_id: null, error: { code: 'INTERNAL' } })
})

test('a worker failure fails the job with a problem and the engine keeps working', async () => {
  let fail = true
  const good = constantGraph()
  const flaky: RunGraph = (...args) => (fail ? Promise.reject(new Error('worker crashed')) : good(...args))
  const engine = make(flaky)
  expect(await finished(engine, mechanistic)).toMatchObject({ state: 'failed', error: { code: 'INTERNAL', message: 'worker crashed' } })
  fail = false
  expect((await finished(engine, mechanistic)).state).toBe('succeeded')
})

test('a job cancelled while the graph runs never gains a result', async () => {
  let release!: () => void
  const good = constantGraph()
  const slow: RunGraph = async (...args) => {
    await new Promise<void>((resolve) => (release = resolve))
    return good(...args)
  }
  const engine = make(slow)
  const job = await engine.submitScenario(mechanistic)
  expect((await engine.cancelJob(job.id)).state).toBe('cancelled')
  release()
  await new Promise((resolve) => setTimeout(resolve, 5))
  expect(await engine.getJob(job.id)).toMatchObject({ state: 'cancelled', result_id: null })
})

test.each([
  ['a horizon beyond the validated range', { ...empirical, horizon_days: 22 }, 'OUT_OF_DOMAIN'],
  ['the no-intervention comparator on the empirical engine', { ...empirical, intervention: 'none' as const }, 'INVALID_INPUT'],
  ['a sensitivity scale on the empirical engine', { ...empirical, sensitivity_scale: 1.5 }, 'INVALID_INPUT'],
  ['an ineligible case on the empirical engine', { ...empirical, case_id: examples.CaseRecord.id }, 'INVALID_INPUT'],
  ['a model version that is not loaded', { ...mechanistic, model_version: 'other' }, 'INVALID_INPUT'],
  ['an unknown case', { ...mechanistic, case_id: '00000000-0000-4000-8000-00000000dead' }, 'NOT_FOUND'],
])('admission rejects %s', async (_, request, code) => {
  const calls: Parameters<RunGraph>[] = []
  expect((await problemOf(make(constantGraph(calls)).submitScenario(request))).code).toBe(code)
  expect(calls).toHaveLength(0)
})

test('the explanation is the fixed template for the stored result, labelled as a template', async () => {
  const engine = make()
  const scenario = await finished(engine, mechanistic)
  const job = await engine.submitExplanation({ result_id: scenario.result_id!, question: 'Explain the current result.' })
  const explanation = await engine.getExplanation(job.result_id!)
  expect(explanation).toMatchObject({
    result_id: scenario.result_id,
    source: 'template',
    model_id: null,
    text: 'This mechanistic what-if over 21.00 days is illustrative and cannot establish treatment efficacy.',
  })
})
