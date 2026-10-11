import type { ScenarioResult } from '../../contracts/index.ts'
import { ENGINE_LABELS, INTERVENTION_LABELS, describeSource } from '../labels.ts'

/** What a result is, what it assumed and what it warns about. Nothing here is computed. */
export function ResultFacts({ result, heading }: { result: ScenarioResult; heading: string }) {
  const { request } = result
  return (
    <section className="rounded border border-slate-200 bg-white p-4 text-sm">
      <h3 className="text-base font-semibold">{heading}</h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-slate-600">Source</dt>
        <dd className="font-medium">{describeSource(result)}</dd>
        <dt className="text-slate-600">Request</dt>
        <dd>
          {ENGINE_LABELS[request.engine]}, {INTERVENTION_LABELS[request.intervention]}, {request.horizon_days} days, sensitivity scale {request.sensitivity_scale}
        </dd>
        <dt className="text-slate-600">Model version</dt>
        <dd>{result.model_version}</dd>
        <dt className="text-slate-600">Created</dt>
        <dd>{result.created_at}</dd>
      </dl>
      <FactList title="Assumptions" items={result.assumptions} empty="None stated." />
      <FactList title="Warnings" items={result.warnings} empty="None." />
      <FactList title="Limitations of the underlying data" items={result.provenance.limitations} empty="None stated." />
    </section>
  )
}

function FactList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <>
      <h4 className="mt-4 font-medium">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-slate-600">{empty}</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-slate-700">
          {items.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </>
  )
}
