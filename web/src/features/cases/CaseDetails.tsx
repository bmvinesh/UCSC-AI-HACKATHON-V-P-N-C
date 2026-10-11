import type { CaseRecord } from '../../contracts/index.ts'
import { MEASUREMENT_LABELS, PHASE_LABELS, formatVolume } from '../labels.ts'

/** The measured facts of one case, with where each came from. */
export function CaseDetails({ record }: { record: CaseRecord }) {
  const { provenance } = record
  return (
    <section aria-labelledby="case-heading" className="rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="case-heading" className="text-base font-semibold">
          {record.label}
        </h3>
        {provenance.synthetic && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Synthetic, not patient data</span>}
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-slate-600">Baseline volume</dt>
        <dd>{formatVolume(record.baseline_volume_cm3)}</dd>
        <dt className="text-slate-600">Subtype</dt>
        <dd>{record.subtype ?? 'Not recorded'}</dd>
        <dt className="text-slate-600">Paclitaxel forecast</dt>
        <dd>{record.eligible_paclitaxel ? 'Eligible' : 'Not eligible'}</dd>
        <dt className="text-slate-600">Measurement method</dt>
        <dd>{provenance.measurement_method}</dd>
        <dt className="text-slate-600">Dataset</dt>
        <dd>
          {provenance.source_ref}, version {provenance.dataset_version}
        </dd>
        <dt className="text-slate-600">Regimen verified</dt>
        <dd>{provenance.regimen_verified ? 'Yes' : 'No'}</dd>
      </dl>

      <table className="mt-4 w-full border-collapse text-left tabular-nums">
        <caption className="pb-1 text-left font-medium">Observed measurements</caption>
        <thead>
          <tr className="border-b border-slate-300 text-slate-600">
            <th scope="col" className="py-1 pr-3 font-normal">Day</th>
            <th scope="col" className="py-1 pr-3 font-normal">Volume</th>
            <th scope="col" className="py-1 pr-3 font-normal">Measurement</th>
            <th scope="col" className="py-1 pr-3 font-normal">Phase</th>
            <th scope="col" className="py-1 font-normal">Source</th>
          </tr>
        </thead>
        <tbody>
          {record.observations.map((o) => (
            <tr key={o.day} className="border-b border-slate-100">
              <td className="py-1 pr-3">{o.day}</td>
              <td className="py-1 pr-3">{formatVolume(o.volume_cm3)}</td>
              <td className="py-1 pr-3">{MEASUREMENT_LABELS[o.measurement]}</td>
              <td className="py-1 pr-3">{PHASE_LABELS[o.phase]}</td>
              <td className="py-1">{o.source_ref}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {provenance.limitations.length > 0 && (
        <>
          <h4 className="mt-4 font-medium">Limitations of this record</h4>
          <ul className="mt-1 list-disc pl-5 text-slate-700">
            {provenance.limitations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
