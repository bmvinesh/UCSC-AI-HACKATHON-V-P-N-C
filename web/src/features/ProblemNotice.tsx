import type { Problem } from '../contracts/index.ts'
import { PROBLEM_TITLES } from './labels.ts'

/** A typed failure, shown as a failure. The rest of the page stays usable around it. */
export function ProblemNotice({ problem, onRetry }: { problem: Problem; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <p className="font-medium">{PROBLEM_TITLES[problem.code]}</p>
      <p className="mt-1">{problem.message}</p>
      <p className="mt-1 text-xs text-red-800">
        Code {problem.code}, trace {problem.trace_id}
      </p>
      {onRetry && problem.retryable && (
        <button type="button" onClick={onRetry} className="mt-2 rounded border border-red-400 bg-white px-2 py-1 text-xs font-medium">
          Try again
        </button>
      )}
    </div>
  )
}
