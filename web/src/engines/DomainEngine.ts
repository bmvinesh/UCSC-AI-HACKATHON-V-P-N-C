import type {
  Capabilities,
  CaseRecord,
  ExplanationRequest,
  ExplanationResult,
  JobRecord,
  ScenarioRequest,
  ScenarioResult,
} from '../contracts/index.ts'

/**
 * The one interface the UI talks to (docs/CONTRACTS.md, Hour 1 checklist).
 * Features import this type only: never a concrete engine, `fetch` or the ONNX runtime.
 * A rejected promise carries an EngineError with a contract Problem.
 */
export interface DomainEngine {
  capabilities(): Promise<Capabilities>
  listCases(): Promise<CaseRecord[]>
  submitScenario(request: ScenarioRequest): Promise<JobRecord>
  getJob(id: string): Promise<JobRecord>
  cancelJob(id: string): Promise<JobRecord>
  getResult(id: string): Promise<ScenarioResult>
  submitExplanation(request: ExplanationRequest): Promise<JobRecord>
  getExplanation(id: string): Promise<ExplanationResult>
}
