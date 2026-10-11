import { useState } from 'react'
import type { Capabilities, CaseRecord, ScenarioResult } from '../../contracts/index.ts'
import type { DomainEngine } from '../../engines/index.ts'
import { ProblemNotice } from '../ProblemNotice.tsx'
import { seriesFromResults } from '../chart/series.ts'
import { VolumeChart } from '../chart/VolumeChart.tsx'
import { ResultFacts } from '../model/ResultFacts.tsx'
import { ScenarioControls } from '../scenario/ScenarioControls.tsx'
import { useScenarioJob } from '../scenario/useScenarioJob.ts'
import { useEngineQuery } from '../useEngineQuery.ts'
import { CaseDetails } from './CaseDetails.tsx'

const readCases = (engine: DomainEngine) => engine.listCases()

export function CasesPage({ capabilities }: { capabilities: Capabilities }) {
  const cases = useEngineQuery(readCases)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (cases.status === 'loading') return <p className="text-sm text-slate-600">Loading cases.</p>
  if (cases.status === 'problem') return <ProblemNotice problem={cases.problem} onRetry={cases.retry} />
  if (cases.data.length === 0) return <p className="text-sm text-slate-600">No demonstration case is available.</p>

  const record = cases.data.find((c) => c.id === selectedId) ?? cases.data[0]
  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
      <nav aria-label="Cases">
        <ul className="space-y-1 text-sm">
          {cases.data.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                aria-current={c.id === record.id ? 'true' : undefined}
                onClick={() => setSelectedId(c.id)}
                className="w-full rounded border border-transparent px-3 py-2 text-left hover:bg-slate-100 aria-[current=true]:border-slate-300 aria-[current=true]:bg-white aria-[current=true]:font-medium"
              >
                {c.label}
                <span className="block text-xs font-normal text-slate-600">{c.provenance.synthetic ? 'Synthetic' : 'De-identified record'}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* The key resets every piece of scenario state when the case changes. */}
      <CaseWorkspace key={record.id} record={record} capabilities={capabilities} />
    </div>
  )
}

function CaseWorkspace({ record, capabilities }: { record: CaseRecord; capabilities: Capabilities }) {
  const { state, run, cancel } = useScenarioJob()
  const [pinned, setPinned] = useState<ScenarioResult | null>(null)
  const current = state.phase === 'done' ? state.result : null
  const results = [pinned, current].filter((r): r is ScenarioResult => r !== null && r.request.case_id === record.id)
  const shown = results.filter((r, i) => results.findIndex((other) => other.id === r.id) === i)

  return (
    <div className="min-w-0 space-y-4">
      <CaseDetails record={record} />
      <VolumeChart observations={record.observations} series={seriesFromResults(shown)} />

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <ScenarioControls record={record} capabilities={capabilities} busy={state.phase === 'active'} onSubmit={run} />
        <div className="min-w-0 space-y-4">
          <div aria-live="polite" className="text-sm">
            {state.phase === 'idle' && <p className="text-slate-600">No scenario has been run for this case.</p>}
            {state.phase === 'active' && (
              <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-white p-3">
                <progress value={state.job.progress} max={1} className="h-2 w-40" aria-label="Job progress" />
                <span>
                  Job {state.job.state}, {Math.round(state.job.progress * 100)}%
                </span>
                <button type="button" onClick={cancel} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium">
                  Cancel
                </button>
              </div>
            )}
            {state.phase === 'cancelled' && <p className="rounded border border-slate-200 bg-white p-3">The job was cancelled. No result was produced.</p>}
            {state.phase === 'problem' && <ProblemNotice problem={state.problem} />}
          </div>

          {current && (
            <>
              <ResultFacts result={current} heading="Current result" />
              {pinned?.id !== current.id && (
                <button type="button" onClick={() => setPinned(current)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">
                  Keep on the chart for comparison
                </button>
              )}
            </>
          )}
          {pinned && pinned.id !== current?.id && <ResultFacts result={pinned} heading="Kept for comparison" />}
          {pinned && (
            <button type="button" onClick={() => setPinned(null)} className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">
              Remove the kept result
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
