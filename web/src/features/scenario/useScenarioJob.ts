import type { ScenarioRequest, ScenarioResult } from '../../contracts/index.ts'
import type { DomainEngine } from '../../engines/index.ts'
import { useEngineJob, type EngineJob, type PollSchedule } from '../jobs/useEngineJob.ts'

export type ScenarioJob = EngineJob<ScenarioResult>
export type { PollSchedule }

const submit = (engine: DomainEngine, request: ScenarioRequest) => engine.submitScenario(request)
const fetchResult = (engine: DomainEngine, id: string) => engine.getResult(id)

export function useScenarioJob(schedule?: PollSchedule) {
  return useEngineJob(submit, fetchResult, schedule)
}
