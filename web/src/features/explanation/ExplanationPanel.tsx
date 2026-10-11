import { useId, useState, type FormEvent } from 'react'
import { QUESTION_MAX_LENGTH, type ExplanationRequest, type ScenarioResult } from '../../contracts/index.ts'
import type { DomainEngine } from '../../engines/index.ts'
import { JobStatus } from '../jobs/JobStatus.tsx'
import { useEngineJob, type PollSchedule } from '../jobs/useEngineJob.ts'
import { EXPLANATION_SOURCE_LABELS } from '../labels.ts'

// Asked when no chat model is available: the engine answers from its fixed template.
const FIXED_QUESTION = 'Explain the current result.'

const submit = (engine: DomainEngine, request: ExplanationRequest) => engine.submitExplanation(request)
const fetchResult = (engine: DomainEngine, id: string) => engine.getExplanation(id)

interface Props {
  result: ScenarioResult
  chatAvailable: boolean
  schedule?: PollSchedule
}

/**
 * An explanation of one stored result. The text always shows where it came from,
 * and a failed explanation never touches the chart or the result beside it.
 */
export function ExplanationPanel({ result, chatAvailable, schedule }: Props) {
  const id = useId()
  const [question, setQuestion] = useState('')
  const { state, run, cancel } = useEngineJob(submit, fetchResult, schedule)
  const busy = state.phase === 'active'

  const ask = (event: FormEvent) => {
    event.preventDefault()
    void run({ result_id: result.id, question: chatAvailable ? question.trim() : FIXED_QUESTION })
  }

  return (
    <section className="rounded border border-slate-200 bg-white p-4 text-sm">
      <h3 className="text-base font-semibold">Explanation</h3>
      <form onSubmit={ask} className="mt-3 space-y-2">
        {chatAvailable ? (
          <>
            <label htmlFor={`${id}-question`} className="font-medium">
              Ask the local model about this result
            </label>
            <textarea
              id={`${id}-question`}
              required
              rows={2}
              maxLength={QUESTION_MAX_LENGTH}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="block w-full rounded border border-slate-300 px-2 py-1"
            />
            <p className="text-xs text-slate-600">It explains the stored numbers. It cannot add measurements, judge efficacy or advise on treatment.</p>
          </>
        ) : (
          <p className="text-slate-700">Chat with the Qwen model is a local GX10 feature and is not part of this build. A fixed explanation of the current result is available instead.</p>
        )}
        <button type="submit" disabled={busy || (chatAvailable && question.trim() === '')} className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white disabled:bg-slate-400">
          {busy ? 'Working' : chatAvailable ? 'Ask' : 'Show the fixed explanation'}
        </button>
      </form>

      <div className="mt-3">
        <JobStatus state={state} idleText="No explanation has been requested." onCancel={cancel} />
        {state.phase === 'done' && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-700">
              {EXPLANATION_SOURCE_LABELS[state.result.source]}
              {state.result.model_id && `, model ${state.result.model_id}`}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{state.result.text}</p>
            <p className="mt-2 text-xs text-slate-600">Based on these fields of the result: {state.result.referenced_fields.join(', ')}</p>
            {state.result.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
                {state.result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
