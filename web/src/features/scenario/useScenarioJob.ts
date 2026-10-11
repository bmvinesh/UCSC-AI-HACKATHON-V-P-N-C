import { useCallback, useEffect, useRef, useState } from 'react'
import type { JobRecord, Problem, ScenarioRequest, ScenarioResult } from '../../contracts/index.ts'
import { localProblem, toProblem } from '../../engines/index.ts'
import { useEngine } from '../EngineContext.ts'

export type ScenarioJob =
  | { phase: 'idle' }
  | { phase: 'active'; job: JobRecord }
  | { phase: 'done'; job: JobRecord; result: ScenarioResult }
  | { phase: 'cancelled'; job: JobRecord }
  | { phase: 'problem'; problem: Problem }

export interface PollSchedule {
  initialMs: number
  maxMs: number
  factor: number
}
// docs/CONTRACTS.md: poll at 1 s while active, with bounded backoff.
const DEFAULT_SCHEDULE: PollSchedule = { initialMs: 1000, maxMs: 5000, factor: 1.5 }

const isActive = (job: JobRecord) => job.state === 'queued' || job.state === 'running'
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs one scenario at a time. Each run, reset or unmount takes a new ticket, and a
 * response that arrives holding an old ticket is dropped, so a result for an earlier
 * case or request is never shown.
 */
export function useScenarioJob(schedule: PollSchedule = DEFAULT_SCHEDULE) {
  const engine = useEngine()
  const [state, setState] = useState<ScenarioJob>({ phase: 'idle' })
  const ticket = useRef(0)

  useEffect(() => () => void ticket.current++, [])

  const run = useCallback(
    async (request: ScenarioRequest) => {
      const mine = ++ticket.current
      const current = () => mine === ticket.current
      try {
        let job = await engine.submitScenario(request)
        if (!current()) return
        setState({ phase: 'active', job })

        for (let delay = schedule.initialMs; isActive(job); delay = Math.min(delay * schedule.factor, schedule.maxMs)) {
          await wait(delay)
          if (!current()) return
          job = await engine.getJob(job.id)
          if (!current()) return
          if (isActive(job)) setState({ phase: 'active', job })
        }

        if (job.state === 'succeeded' && job.result_id) {
          const result = await engine.getResult(job.result_id)
          if (current()) setState({ phase: 'done', job, result })
        } else if (job.state === 'cancelled') {
          setState({ phase: 'cancelled', job })
        } else {
          setState({ phase: 'problem', problem: job.error ?? localProblem('INTERNAL', `Job ended as ${job.state} with no error.`) })
        }
      } catch (error) {
        if (current()) setState({ phase: 'problem', problem: toProblem(error) })
      }
    },
    [engine, schedule],
  )

  const cancel = useCallback(async () => {
    if (state.phase !== 'active') return
    const mine = ticket.current
    try {
      // The poll loop sees the cancelled state; a queued job is cancelled at once.
      const job = await engine.cancelJob(state.job.id)
      if (mine === ticket.current && job.state === 'cancelled') {
        ticket.current++
        setState({ phase: 'cancelled', job })
      }
    } catch (error) {
      if (mine === ticket.current) setState({ phase: 'problem', problem: toProblem(error) })
    }
  }, [engine, state])

  const reset = useCallback(() => {
    ticket.current++
    setState({ phase: 'idle' })
  }, [])

  return { state, run, cancel, reset }
}
