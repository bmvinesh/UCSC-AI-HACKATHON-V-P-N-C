import type { Problem } from '../contracts/index.ts'

/** Every engine failure the UI can see. It always carries a contract Problem. */
export class EngineError extends Error {
  readonly problem: Problem

  constructor(problem: Problem) {
    super(problem.message)
    this.name = 'EngineError'
    this.problem = problem
  }
}

/** A Problem raised inside the browser, where no server issued a trace id. */
export function localProblem(code: Problem['code'], message: string, retryable = false): Problem {
  return { code, message, retryable, trace_id: `browser-${crypto.randomUUID()}` }
}
