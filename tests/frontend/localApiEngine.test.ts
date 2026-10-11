import { expect, test } from 'vitest'
import examples from '../../contracts/examples.json'
import { EngineError } from '../../web/src/engines/index.ts'
import { LocalApiEngine } from '../../web/src/engines/local/LocalApiEngine.ts'
import { describeEngineConformance, exampleScenarioRequest } from './engineConformance.ts'
import { fakeApi } from './fakeApi.ts'

describeEngineConformance('LocalApiEngine', () => new LocalApiEngine(fakeApi().fetchFn), exampleScenarioRequest)

async function problemOf(action: Promise<unknown>) {
  try {
    await action
  } catch (error) {
    if (error instanceof EngineError) return error.problem
    throw error
  }
  throw new Error('expected a problem')
}

test('the session is created once, before the first call, however many calls race', async () => {
  const api = fakeApi()
  const engine = new LocalApiEngine(api.fetchFn)
  await Promise.all([engine.capabilities(), engine.listCases(), engine.capabilities()])
  expect(api.calls.filter((c) => c.path === '/session')).toHaveLength(1)
  expect(api.calls[0]).toMatchObject({ method: 'POST', path: '/session' })
})

test('a failed session attempt is retried on the next call', async () => {
  let attempts = 0
  const api = fakeApi()
  const flaky: typeof fetch = (input, init) => {
    if (String(input).endsWith('/session') && attempts++ === 0) return Promise.reject(new TypeError('offline'))
    return api.fetchFn(input, init)
  }
  const engine = new LocalApiEngine(flaky)
  expect(await problemOf(engine.capabilities())).toMatchObject({ code: 'INTERNAL', retryable: true })
  expect((await engine.capabilities()).profile).toBe(examples.Capabilities.profile)
})

test('both job submissions carry a fresh Idempotency-Key; reads carry none', async () => {
  const api = fakeApi()
  const engine = new LocalApiEngine(api.fetchFn)
  await engine.submitScenario(exampleScenarioRequest)
  await engine.submitScenario(exampleScenarioRequest)
  await engine.submitExplanation({ result_id: examples.ScenarioResult.id, question: 'Why?' })
  await engine.capabilities()
  const keys = api.calls.filter((c) => c.method === 'POST' && c.path !== '/session').map((c) => c.headers['Idempotency-Key'])
  expect(keys).toHaveLength(3)
  expect(new Set(keys).size).toBe(3)
  for (const key of keys) expect(key).toMatch(/^[0-9a-f-]{36}$/)
  expect(api.calls.find((c) => c.path === '/capabilities')!.headers['Idempotency-Key']).toBeUndefined()
  expect(api.calls.find((c) => c.path === '/scenarios')!.body).toEqual(exampleScenarioRequest)
})

test('a typed Problem from the API is passed through unchanged', async () => {
  const body = { code: 'OUT_OF_DOMAIN', message: 'horizon beyond the validated range', retryable: false, trace_id: 'abc' }
  const engine = new LocalApiEngine(fakeApi({ 'POST /scenarios': { status: 422, body } }).fetchFn)
  expect(await problemOf(engine.submitScenario(exampleScenarioRequest))).toEqual(body)
})

test('a full queue keeps its retry guidance', async () => {
  const body = { code: 'QUEUE_FULL', message: 'The queue is full.', retryable: true, trace_id: 'abc' }
  const engine = new LocalApiEngine(fakeApi({ 'POST /scenarios': { status: 429, body, headers: { 'Retry-After': '7' } } }).fetchFn)
  expect(await problemOf(engine.submitScenario(exampleScenarioRequest))).toMatchObject({
    code: 'QUEUE_FULL',
    retryable: true,
    message: 'The queue is full. Try again in 7 seconds.',
  })
})

test.each([
  [404, 'NOT_FOUND', false],
  [422, 'INVALID_INPUT', false],
  [429, 'QUEUE_FULL', true],
  [503, 'MODEL_UNAVAILABLE', true],
  [500, 'INTERNAL', false],
  [502, 'INTERNAL', true],
  [409, 'INTERNAL', false],
])('status %i with no readable body becomes %s', async (status, code, retryable) => {
  const engine = new LocalApiEngine(fakeApi({ 'GET /cases': { status, body: '<html>proxy error</html>' } }).fetchFn)
  expect(await problemOf(engine.listCases())).toMatchObject({ code, retryable })
})

test('a response that breaks the contract is a fault, not data', async () => {
  const broken = { ...examples.ScenarioResult, curves: [{ ...examples.ScenarioResult.curves[0], evidence: 'observed' }] }
  const engine = new LocalApiEngine(fakeApi({ [`GET /results/${examples.ScenarioResult.id}`]: { status: 200, body: broken } }).fetchFn)
  const problem = await problemOf(engine.getResult(examples.ScenarioResult.id))
  expect(problem.code).toBe('INTERNAL')
  expect(problem.message).toMatch(/does not match the contract/)
})

test('an unreachable API is a retryable problem', async () => {
  const engine = new LocalApiEngine(() => Promise.reject(new TypeError('Failed to fetch')))
  expect(await problemOf(engine.capabilities())).toMatchObject({ code: 'INTERNAL', retryable: true })
})
