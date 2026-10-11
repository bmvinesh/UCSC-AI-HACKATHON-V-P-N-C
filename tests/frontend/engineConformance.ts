import { expect, test } from 'vitest'
import examples from '../../contracts/examples.json'
import { parseContract, type JobRecord, type ScenarioRequest } from '../../web/src/contracts/index.ts'
import { EngineError, type DomainEngine } from '../../web/src/engines/index.ts'

const UNKNOWN_ID = '00000000-0000-4000-8000-00000000ffff'

async function settle(engine: DomainEngine, job: JobRecord): Promise<JobRecord> {
  let current = job
  for (let i = 0; i < 200 && (current.state === 'queued' || current.state === 'running'); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5))
    current = await engine.getJob(current.id)
  }
  return current
}

async function problemCode(action: Promise<unknown>): Promise<string> {
  try {
    await action
  } catch (error) {
    if (error instanceof EngineError) return parseContract('Problem', error.problem).code
    throw error
  }
  return 'no error'
}

/**
 * The behaviour every DomainEngine must share, so the UI cannot tell them apart.
 * Each engine's test file calls this with a factory and a request the engine accepts.
 */
export function describeEngineConformance(name: string, make: () => DomainEngine, request: ScenarioRequest) {
  test(`${name}: capabilities and cases match the contract`, async () => {
    const engine = make()
    parseContract('Capabilities', await engine.capabilities())
    const cases = await engine.listCases()
    expect(cases.length).toBeGreaterThan(0)
    for (const record of cases) parseContract('CaseRecord', record)
  })

  test(`${name}: a scenario job reaches a result that matches the contract`, async () => {
    const engine = make()
    const queued = parseContract('JobRecord', await engine.submitScenario(request))
    expect(queued.kind).toBe('scenario')
    const done = parseContract('JobRecord', await settle(engine, queued))
    expect(done.state).toBe('succeeded')
    expect(done.progress).toBe(1)
    expect(done.error).toBeNull()
    const result = parseContract('ScenarioResult', await engine.getResult(done.result_id!))
    expect(result.id).toBe(done.result_id)
    for (const curve of result.curves) expect(curve.points[0].day).toBe(0)
  })

  test(`${name}: an explanation job resolves through its result_id`, async () => {
    const engine = make()
    const scenario = await settle(engine, await engine.submitScenario(request))
    const queued = await engine.submitExplanation({ result_id: scenario.result_id!, question: 'What does this show?' })
    expect(queued.kind).toBe('explanation')
    const done = parseContract('JobRecord', await settle(engine, queued))
    expect(done.state).toBe('succeeded')
    const explanation = parseContract('ExplanationResult', await engine.getExplanation(done.result_id!))
    expect(explanation.result_id).toBe(scenario.result_id)
  })

  test(`${name}: cancel is cooperative and idempotent`, async () => {
    const engine = make()
    const job = await engine.submitScenario(request)
    const cancelled = parseContract('JobRecord', await engine.cancelJob(job.id))
    expect(['cancelled', 'queued', 'running', 'succeeded']).toContain(cancelled.state)
    const final = await settle(engine, cancelled)
    expect((await engine.cancelJob(job.id)).state).toBe(final.state)
    if (final.state === 'cancelled') expect(final.result_id).toBeNull()
  })

  test(`${name}: failures are typed Problems`, async () => {
    const engine = make()
    expect(await problemCode(engine.getJob(UNKNOWN_ID))).toBe('NOT_FOUND')
    expect(await problemCode(engine.getResult(UNKNOWN_ID))).toBe('NOT_FOUND')
    expect(await problemCode(engine.getExplanation(UNKNOWN_ID))).toBe('NOT_FOUND')
    expect(await problemCode(engine.submitScenario({ ...request, horizon_days: 21.5 }))).toBe('INVALID_INPUT')
    expect(await problemCode(engine.submitScenario({ ...request, horizon_days: 85 }))).toBe('INVALID_INPUT')
  })
}

export const exampleScenarioRequest = parseContract('ScenarioRequest', examples.ScenarioRequest)
