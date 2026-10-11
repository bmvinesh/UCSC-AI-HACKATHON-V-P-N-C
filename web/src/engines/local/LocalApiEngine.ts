import {
  ContractError,
  parseContract,
  type Capabilities,
  type CaseRecord,
  type ContractName,
  type ContractTypes,
  type ExplanationRequest,
  type ExplanationResult,
  type JobRecord,
  type Problem,
  type ScenarioRequest,
  type ScenarioResult,
} from '../../contracts/index.ts'
import type { DomainEngine } from '../DomainEngine.ts'
import { EngineError, localProblem } from '../EngineError.ts'

const API = '/api/v1'

// Used only when an error response carries no valid Problem body (docs/CONTRACTS.md, REST contract).
const STATUS_CODES: Record<number, Problem['code']> = {
  404: 'NOT_FOUND',
  422: 'INVALID_INPUT',
  429: 'QUEUE_FULL',
  503: 'MODEL_UNAVAILABLE',
}
// 502 and 504 come from a proxy in front of an API that is down or still starting.
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504])

interface Call {
  method: 'GET' | 'POST'
  path: string
  body?: unknown
  /** Scenario and explanation POSTs must carry an Idempotency-Key. */
  idempotent?: boolean
}

/**
 * The local profile's engine: the same-origin FastAPI app on the GX10.
 * It holds no numerical logic and no job rules; every response is validated
 * against the contract before the UI sees it.
 */
export class LocalApiEngine implements DomainEngine {
  private readonly fetchFn: typeof fetch
  private session: Promise<void> | null = null

  constructor(fetchFn: typeof fetch = (...args) => fetch(...args)) {
    this.fetchFn = fetchFn
  }

  capabilities(): Promise<Capabilities> {
    return this.read('Capabilities', { method: 'GET', path: '/capabilities' })
  }

  async listCases(): Promise<CaseRecord[]> {
    const list = await this.call({ method: 'GET', path: '/cases' })
    if (!Array.isArray(list)) throw mismatch('CaseRecord', ['/ must be an array'])
    return list.map((item) => validated('CaseRecord', item))
  }

  submitScenario(request: ScenarioRequest): Promise<JobRecord> {
    return this.read('JobRecord', { method: 'POST', path: '/scenarios', body: request, idempotent: true })
  }

  getJob(id: string): Promise<JobRecord> {
    return this.read('JobRecord', { method: 'GET', path: `/jobs/${encodeURIComponent(id)}` })
  }

  cancelJob(id: string): Promise<JobRecord> {
    return this.read('JobRecord', { method: 'POST', path: `/jobs/${encodeURIComponent(id)}/cancel` })
  }

  getResult(id: string): Promise<ScenarioResult> {
    return this.read('ScenarioResult', { method: 'GET', path: `/results/${encodeURIComponent(id)}` })
  }

  submitExplanation(request: ExplanationRequest): Promise<JobRecord> {
    return this.read('JobRecord', { method: 'POST', path: '/explanations', body: request, idempotent: true })
  }

  getExplanation(id: string): Promise<ExplanationResult> {
    return this.read('ExplanationResult', { method: 'GET', path: `/explanations/${encodeURIComponent(id)}` })
  }

  private async read<K extends ContractName>(name: K, call: Call): Promise<ContractTypes[K]> {
    return validated(name, await this.call(call))
  }

  private async call(call: Call): Promise<unknown> {
    await this.ensureSession()
    return this.send(call)
  }

  /** One session for the page. A failed attempt is forgotten so the next call tries again. */
  private ensureSession(): Promise<void> {
    this.session ??= this.send({ method: 'POST', path: '/session' }).then(
      () => undefined,
      (error) => {
        this.session = null
        throw error
      },
    )
    return this.session
  }

  private async send({ method, path, body, idempotent }: Call): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (idempotent) headers['Idempotency-Key'] = crypto.randomUUID()

    let response: Response
    try {
      response = await this.fetchFn(API + path, {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new EngineError(localProblem('INTERNAL', 'The local API did not answer. Check that the app is running on this machine.', true))
    }

    const payload: unknown = await response.json().catch(() => undefined)
    if (!response.ok) throw new EngineError(problemFrom(response, payload))
    return payload
  }
}

function validated<K extends ContractName>(name: K, value: unknown): ContractTypes[K] {
  try {
    return parseContract(name, value)
  } catch (error) {
    throw mismatch(name, error instanceof ContractError ? error.issues : [String(error)])
  }
}

/** A response that breaks the contract is a fault, shown as one. It is never cast into shape. */
function mismatch(name: ContractName, issues: string[]): EngineError {
  return new EngineError(localProblem('INTERNAL', `The local API returned a ${name} that does not match the contract: ${issues.join('; ')}`))
}

function problemFrom(response: Response, payload: unknown): Problem {
  let problem: Problem
  try {
    problem = parseContract('Problem', payload)
  } catch {
    const code = STATUS_CODES[response.status] ?? 'INTERNAL'
    problem = localProblem(code, `The local API answered with status ${response.status} and no readable problem.`, RETRYABLE_STATUSES.has(response.status))
  }
  const retryAfter = response.headers.get('Retry-After')
  return retryAfter ? { ...problem, message: `${problem.message} Try again in ${retryAfter} seconds.` } : problem
}
