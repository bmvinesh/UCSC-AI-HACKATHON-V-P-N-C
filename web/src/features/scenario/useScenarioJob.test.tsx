import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, test } from 'vitest'
import examples from '../../../../contracts/examples.json'
import { parseContract } from '../../contracts/index.ts'
import { FixtureEngine } from '../../engines/fixture/FixtureEngine.ts'
import type { DomainEngine } from '../../engines/index.ts'
import { EngineContext } from '../EngineContext.ts'
import { useScenarioJob, type PollSchedule } from './useScenarioJob.ts'

const FAST: PollSchedule = { initialMs: 5, maxMs: 20, factor: 1.5 }
const request = parseContract('ScenarioRequest', examples.ScenarioRequest)

function setup(engine: DomainEngine) {
  const wrapper = ({ children }: { children: ReactNode }) => <EngineContext value={engine}>{children}</EngineContext>
  return renderHook(() => useScenarioJob(FAST), { wrapper })
}

test('a run goes active, then done with the stored result', async () => {
  const { result } = setup(new FixtureEngine(150))
  act(() => void result.current.run(request))
  await waitFor(() => expect(result.current.state.phase).toBe('active'))
  await waitFor(() => expect(result.current.state.phase).toBe('done'))
  expect(result.current.state).toMatchObject({ result: { id: examples.ScenarioResult.id } })
})

test('a response for an earlier request is dropped after a reset', async () => {
  const { result } = setup(new FixtureEngine(150))
  act(() => void result.current.run(request))
  await waitFor(() => expect(result.current.state.phase).toBe('active'))
  act(() => result.current.reset())
  await new Promise((resolve) => setTimeout(resolve, 300))
  expect(result.current.state.phase).toBe('idle')
})

test('only the latest of two overlapping runs is shown', async () => {
  const engine = new FixtureEngine(30)
  let submissions = 0
  const submit = engine.submitScenario.bind(engine)
  engine.submitScenario = (r) => {
    submissions++
    return submit(r)
  }
  const { result } = setup(engine)
  act(() => void result.current.run(request))
  act(() => void result.current.run(request))
  await waitFor(() => expect(result.current.state.phase).toBe('done'))
  expect(submissions).toBe(2)
  const shown = result.current.state
  await new Promise((resolve) => setTimeout(resolve, 80))
  expect(result.current.state).toBe(shown)
})

test('cancel ends the job with no result', async () => {
  const { result } = setup(new FixtureEngine(200))
  act(() => void result.current.run(request))
  await waitFor(() => expect(result.current.state.phase).toBe('active'))
  await act(() => result.current.cancel())
  expect(result.current.state).toMatchObject({ phase: 'cancelled', job: { state: 'cancelled', result_id: null } })
  await new Promise((resolve) => setTimeout(resolve, 260))
  expect(result.current.state.phase).toBe('cancelled')
})

test('a rejected request becomes a problem, never a result', async () => {
  const { result } = setup(new FixtureEngine())
  await act(() => result.current.run({ ...request, horizon_days: 400 }))
  expect(result.current.state).toMatchObject({ phase: 'problem', problem: { code: 'INVALID_INPUT' } })
})

test('a failed job surfaces the job error', async () => {
  const engine = new FixtureEngine()
  const failed = { ...parseContract('JobRecord', examples.JobRecord), state: 'failed' as const, progress: 0.4, result_id: null,
    error: { code: 'MODEL_UNAVAILABLE' as const, message: 'no artifact', retryable: false, trace_id: 't-1' } }
  engine.submitScenario = async () => failed
  const { result } = setup(engine)
  await act(() => result.current.run(request))
  expect(result.current.state).toMatchObject({ phase: 'problem', problem: { code: 'MODEL_UNAVAILABLE', message: 'no artifact' } })
})
