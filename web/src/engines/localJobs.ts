import { parseContract, type JobRecord, type Problem } from '../contracts/index.ts'
import { EngineError, localProblem } from './EngineError.ts'

type Kind = JobRecord['kind']
const TERMINAL: ReadonlySet<JobRecord['state']> = new Set(['succeeded', 'failed', 'cancelled'])

/**
 * Job handles for engines that run in the browser, so they return the same
 * JobRecord DTO as the local API. Every record is validated before it is stored.
 */
export class LocalJobs {
  private readonly jobs = new Map<string, JobRecord>()

  create(kind: Kind): JobRecord {
    const now = new Date().toISOString()
    return this.store({
      id: crypto.randomUUID(),
      kind,
      state: 'queued',
      progress: 0,
      result_id: null,
      error: null,
      created_at: now,
      updated_at: now,
    })
  }

  get(id: string): JobRecord {
    const job = this.jobs.get(id)
    if (!job) throw new EngineError(localProblem('NOT_FOUND', `No job with id ${id}.`))
    return job
  }

  isActive(id: string): boolean {
    return !TERMINAL.has(this.get(id).state)
  }

  /** Terminal jobs never change again: a late completion after a cancel is dropped. */
  succeed(id: string, resultId: string): JobRecord {
    return this.finish(id, { state: 'succeeded', progress: 1, result_id: resultId, error: null })
  }

  fail(id: string, problem: Problem): JobRecord {
    return this.finish(id, { state: 'failed', result_id: null, error: problem })
  }

  /** Cancelling a finished job returns it unchanged, as the REST contract does. */
  cancel(id: string): JobRecord {
    return this.finish(id, { state: 'cancelled', result_id: null, error: null })
  }

  private finish(id: string, change: Partial<JobRecord>): JobRecord {
    const job = this.get(id)
    if (TERMINAL.has(job.state)) return job
    return this.store({ ...job, ...change, updated_at: new Date().toISOString() })
  }

  private store(job: JobRecord): JobRecord {
    this.jobs.set(job.id, parseContract('JobRecord', job))
    return job
  }
}
