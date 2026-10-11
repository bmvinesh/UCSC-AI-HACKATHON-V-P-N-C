import {
  ContractError,
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
import { EngineError, localProblem, toProblem } from '../EngineError.ts'
import { LocalJobs } from '../localJobs.ts'
import { admissionProblem } from './admission.ts'
import { assembleResult, buildFeeds, outputNames, type RunGraph } from './inference.ts'
import { loadRelease, type FetchArtifact, type LoadedRelease } from './loadRelease.ts'
import { renderExplanation } from './renderTemplate.ts'

/**
 * The Pages profile's engine. Everything comes from static files under artifacts/public/:
 * it never calls an API, localhost or a chat endpoint. Both engines run as ONNX graphs
 * through `runGraph`, and results use the same DTOs and job handles as the local API.
 */
export class BrowserEngine implements DomainEngine {
  private readonly jobs = new LocalJobs()
  private readonly results = new Map<string, ScenarioResult>()
  private readonly explanations = new Map<string, ExplanationResult>()
  private readonly fetchArtifact: FetchArtifact
  private readonly runGraph: RunGraph
  private release: Promise<LoadedRelease> | null = null

  constructor(fetchArtifact: FetchArtifact, runGraph: RunGraph) {
    this.fetchArtifact = fetchArtifact
    this.runGraph = runGraph
  }

  /** The release loads once. A failed load is forgotten so a retry can succeed. */
  private loaded(): Promise<LoadedRelease> {
    this.release ??= loadRelease(this.fetchArtifact).catch((error) => {
      this.release = null
      throw error
    })
    return this.release
  }

  async capabilities(): Promise<Capabilities> {
    const release = await this.loaded()
    return {
      profile: 'pages',
      empirical_available: release.empirical !== null,
      mechanistic_available: release.mechanistic !== null,
      chat_available: false,
      empirical_model_version: release.empirical?.manifest.model_version ?? null,
      mechanistic_model_version: release.mechanistic?.manifest.model_version ?? null,
      status: release.degradedReasons.length === 0 ? 'ready' : 'degraded',
      degraded_reasons: release.degradedReasons,
    }
  }

  async listCases(): Promise<CaseRecord[]> {
    return (await this.loaded()).cases
  }

  async submitScenario(request: ScenarioRequest): Promise<JobRecord> {
    const valid = validRequest('ScenarioRequest', request)
    const release = await this.loaded()
    const record = release.cases.find((c) => c.id === valid.case_id)
    if (!record) throw new EngineError(localProblem('NOT_FOUND', `No case with id ${valid.case_id}.`))
    const engine = valid.engine === 'empirical' ? release.empirical : release.mechanistic
    if (!engine) throw new EngineError(localProblem('MODEL_UNAVAILABLE', `The ${valid.engine} engine is not available in this release.`))
    const rejected = admissionProblem(valid, record, engine.manifest)
    if (rejected) throw new EngineError(rejected)

    const job = this.jobs.create('scenario')
    const { feeds, days } = buildFeeds(engine.manifest, valid, record)
    this.runGraph(engine.model, feeds, outputNames(engine.manifest))
      .then((outputs) => {
        if (!this.jobs.isActive(job.id)) return // cancelled while the graph ran
        const result = parseContract('ScenarioResult', assembleResult(engine.manifest, valid, record, days, outputs))
        this.results.set(result.id, result)
        this.jobs.succeed(job.id, result.id)
      })
      .catch((error) => this.jobs.fail(job.id, toProblem(error)))
    return job
  }

  async getJob(id: string): Promise<JobRecord> {
    return this.jobs.get(id)
  }

  async cancelJob(id: string): Promise<JobRecord> {
    return this.jobs.cancel(id)
  }

  async getResult(id: string): Promise<ScenarioResult> {
    const result = this.results.get(id)
    if (!result) throw new EngineError(localProblem('NOT_FOUND', `No result with id ${id}.`))
    return result
  }

  /** There is no chat here. The answer is the fixed template for the stored result, labelled as one. */
  async submitExplanation(request: ExplanationRequest): Promise<JobRecord> {
    const valid = validRequest('ExplanationRequest', request)
    const result = await this.getResult(valid.result_id)
    const { templates } = await this.loaded()
    if (!templates) throw new EngineError(localProblem('MODEL_UNAVAILABLE', 'The fixed explanation is not available in this release.'))

    const job = this.jobs.create('explanation')
    try {
      const rendered = renderExplanation(templates, result)
      const explanation = parseContract('ExplanationResult', {
        id: crypto.randomUUID(),
        result_id: result.id,
        source: 'template',
        text: rendered.text,
        referenced_fields: rendered.referencedFields,
        model_id: null,
        warnings: [],
      })
      this.explanations.set(explanation.id, explanation)
      return this.jobs.succeed(job.id, explanation.id)
    } catch (error) {
      return this.jobs.fail(job.id, toProblem(error))
    }
  }

  async getExplanation(id: string): Promise<ExplanationResult> {
    const explanation = this.explanations.get(id)
    if (!explanation) throw new EngineError(localProblem('NOT_FOUND', `No explanation with id ${id}.`))
    return explanation
  }
}

function validRequest<K extends 'ScenarioRequest' | 'ExplanationRequest'>(name: K, request: unknown) {
  try {
    return parseContract(name, request)
  } catch (error) {
    throw new EngineError(localProblem('INVALID_INPUT', error instanceof ContractError ? error.message : String(error)))
  }
}
