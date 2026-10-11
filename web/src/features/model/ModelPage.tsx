import type { Capabilities } from '../../contracts/index.ts'
import { ENGINE_LABELS, STATUS_LABELS } from '../labels.ts'

/** What this build can and cannot do, straight from the engine's capabilities. */
export function ModelPage({ capabilities, engineDescription }: { capabilities: Capabilities; engineDescription: string }) {
  const engines = [
    { name: ENGINE_LABELS.empirical, available: capabilities.empirical_available, version: capabilities.empirical_model_version },
    { name: ENGINE_LABELS.mechanistic, available: capabilities.mechanistic_available, version: capabilities.mechanistic_model_version },
  ]
  return (
    <div className="space-y-4 text-sm">
      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold">What is running</h3>
        <p className="mt-2">{engineDescription}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-600">Status</dt>
          <dd>{STATUS_LABELS[capabilities.status]}</dd>
          {engines.map((engine) => (
            <div key={engine.name} className="contents">
              <dt className="text-slate-600">{engine.name}</dt>
              <dd>{engine.available && engine.version ? `Available, version ${engine.version}` : 'Not available'}</dd>
            </div>
          ))}
          <dt className="text-slate-600">Explanation chat</dt>
          <dd>{capabilities.chat_available ? 'Available on this machine' : 'Not available in this build. It runs only on the local GX10.'}</dd>
        </dl>
        {capabilities.degraded_reasons.length > 0 && (
          <>
            <h4 className="mt-4 font-medium">Why something is unavailable</h4>
            <ul className="mt-1 list-disc pl-5 text-slate-700">
              {capabilities.degraded_reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold">How to read the results</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
          <li>Observed points are measurements from the case record. Volume from MRI is an imaging measure, not a cell count.</li>
          <li>The empirical forecast describes early change seen during paclitaxel treatment. It does not show what the drug caused.</li>
          <li>The mechanistic what-if, including the no-intervention curve, is illustrative. Its parameters are assumptions, and no untreated patients were observed.</li>
          <li>A shaded range from a parameter sweep shows sensitivity to those assumptions. It is not a confidence interval.</li>
          <li>Nothing here is a dosing or treatment recommendation.</li>
        </ul>
        <p className="mt-3 text-slate-600">Trained-model details (training data, patient counts, validated horizon) will appear here once a model artifact is published.</p>
      </section>
    </div>
  )
}
