import type { Problem } from '../../contracts/index.ts'
import { ProblemNotice } from '../ProblemNotice.tsx'
import type { EngineJob } from './useEngineJob.ts'

interface Props {
  state: EngineJob<unknown>
  idleText: string
  onCancel: () => void
}

/** Progress, cancellation and failure for one job. A finished job renders nothing here. */
export function JobStatus({ state, idleText, onCancel }: Props) {
  return (
    <div aria-live="polite" className="text-sm">
      {state.phase === 'idle' && <p className="text-slate-600">{idleText}</p>}
      {state.phase === 'active' && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white p-3">
          <progress value={state.job.progress} max={1} className="h-2 w-40" aria-label="Job progress" />
          <span>
            Job {state.job.state}, {Math.round(state.job.progress * 100)}%
          </span>
          <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium">
            Cancel
          </button>
        </div>
      )}
      {state.phase === 'cancelled' && <p className="rounded border border-slate-200 bg-white p-3">The job was cancelled. No result was produced.</p>}
      {state.phase === 'problem' && <ProblemNotice problem={state.problem as Problem} />}
    </div>
  )
}
