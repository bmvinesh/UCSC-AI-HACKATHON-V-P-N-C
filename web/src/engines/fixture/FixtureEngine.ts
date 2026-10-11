import examples from '../../../../contracts/examples.json'
import {
  parseContract,
  type Capabilities,
  type CaseRecord,
  type ExplanationRequest,
  type ExplanationResult,
  type JobRecord,
  type ScenarioRequest,
  type ScenarioResult,
} from '../../contracts/index.ts'
import type { DomainEngine } from '../DomainEngine.ts'
import { EngineError, localProblem } from '../EngineError.ts'
import { LocalJobs } from '../localJobs.ts'

/**
 * Serves the labelled synthetic payloads in contracts/examples.json, unchanged.
 * It computes nothing: every scenario returns the same canned result, so the UI
 * can be built before an API or a model exists. Jobs finish after `delayMs`.
 */
export class FixtureEngine implements DomainEngine {
  private readonly jobs = new LocalJobs()
  private readonly capabilitiesFixture: Capabilities = parseContract('Capabilities', examples.Capabilities)
  private readonly caseFixture: CaseRecord = parseContract('CaseRecord', examples.CaseRecord)
  private readonly result: ScenarioResult = parseContract('ScenarioResult', examples.ScenarioResult)
  private readonly explanation: ExplanationResult = parseContract('ExplanationResult', examples.ExplanationResult)
  private readonly delayMs: number

  constructor(delayMs = 0) {
    this.delayMs = delayMs
  }

  async capabilities(): Promise<Capabilities> {
    return this.capabilitiesFixture
  }

  async listCases(): Promise<CaseRecord[]> {
    return [this.caseFixture]
  }

  async submitScenario(request: ScenarioRequest): Promise<JobRecord> {
    const valid = this.validated('ScenarioRequest', request)
    if (valid.case_id !== this.caseFixture.id) {
      throw new EngineError(localProblem('NOT_FOUND', `No case with id ${valid.case_id}.`))
    }
    return this.finishLater('scenario', this.result.id)
  }

  async getJob(id: string): Promise<JobRecord> {
    return this.jobs.get(id)
  }

  async cancelJob(id: string): Promise<JobRecord> {
    return this.jobs.cancel(id)
  }

  async getResult(id: string): Promise<ScenarioResult> {
    if (id !== this.result.id) throw new EngineError(localProblem('NOT_FOUND', `No result with id ${id}.`))
    return this.result
  }

  async submitExplanation(request: ExplanationRequest): Promise<JobRecord> {
    const valid = this.validated('ExplanationRequest', request)
    if (valid.result_id !== this.result.id) {
      throw new EngineError(localProblem('NOT_FOUND', `No result with id ${valid.result_id}.`))
    }
    return this.finishLater('explanation', this.explanation.id)
  }

  async getExplanation(id: string): Promise<ExplanationResult> {
    if (id !== this.explanation.id) throw new EngineError(localProblem('NOT_FOUND', `No explanation with id ${id}.`))
    return this.explanation
  }

  private validated<K extends 'ScenarioRequest' | 'ExplanationRequest'>(name: K, request: unknown) {
    try {
      return parseContract(name, request)
    } catch (error) {
      throw new EngineError(localProblem('INVALID_INPUT', error instanceof Error ? error.message : String(error)))
    }
  }

  private finishLater(kind: JobRecord['kind'], resultId: string): JobRecord {
    const job = this.jobs.create(kind)
    setTimeout(() => this.jobs.succeed(job.id, resultId), this.delayMs)
    return job
  }
}
