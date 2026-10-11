import { useId, useState, type FormEvent } from 'react'
import { HORIZON_DAYS, SENSITIVITY_SCALE, type Capabilities, type CaseRecord, type ScenarioRequest } from '../../contracts/index.ts'
import { ENGINE_LABELS, INTERVENTION_LABELS } from '../labels.ts'
import { buildRequest, modelVersionFor, unavailableReason, type ScenarioChoice } from './buildRequest.ts'

const ENGINES: ScenarioRequest['engine'][] = ['empirical', 'mechanistic']
const INTERVENTIONS: ScenarioRequest['intervention'][] = ['paclitaxel', 'none']
const DEFAULT_HORIZON_DAYS = 21

interface Props {
  record: CaseRecord
  capabilities: Capabilities
  busy: boolean
  onSubmit: (request: ScenarioRequest) => void
}

/** There is no dose, schedule or prescribing control here, by design. */
export function ScenarioControls({ record, capabilities, busy, onSubmit }: Props) {
  const id = useId()
  const reasons = Object.fromEntries(ENGINES.map((e) => [e, unavailableReason(e, record, capabilities)])) as Record<ScenarioRequest['engine'], string | null>
  const [choice, setChoice] = useState<ScenarioChoice>({
    engine: ENGINES.find((e) => reasons[e] === null) ?? 'mechanistic',
    horizonDays: DEFAULT_HORIZON_DAYS,
    intervention: 'paclitaxel',
    sensitivityScale: 1,
  })
  const empirical = choice.engine === 'empirical'
  const modelVersion = modelVersionFor(choice.engine, capabilities)
  const blocked = reasons[choice.engine]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (modelVersion !== null && blocked === null) onSubmit(buildRequest(choice, record, modelVersion))
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded border border-slate-200 bg-white p-4 text-sm">
      <fieldset>
        <legend className="font-medium">Engine</legend>
        {ENGINES.map((engine) => (
          <div key={engine} className="mt-1">
            <label className="flex items-center gap-2">
              <input type="radio" name={`${id}-engine`} checked={choice.engine === engine} disabled={reasons[engine] !== null} onChange={() => setChoice({ ...choice, engine })} />
              {ENGINE_LABELS[engine]}
            </label>
            {reasons[engine] && <p className="ml-6 text-xs text-slate-600">{reasons[engine]}</p>}
          </div>
        ))}
      </fieldset>

      <div>
        <label htmlFor={`${id}-horizon`} className="font-medium">
          Horizon in whole days ({HORIZON_DAYS.min} to {HORIZON_DAYS.max})
        </label>
        <input
          id={`${id}-horizon`}
          type="number"
          required
          step={1}
          min={HORIZON_DAYS.min}
          max={HORIZON_DAYS.max}
          value={choice.horizonDays}
          onChange={(e) => setChoice({ ...choice, horizonDays: e.target.valueAsNumber })}
          className="mt-1 block w-28 rounded border border-slate-300 px-2 py-1"
        />
        <p className="mt-1 text-xs text-slate-600">An engine may support a shorter horizon than this and will say so.</p>
      </div>

      <fieldset disabled={empirical}>
        <legend className="font-medium">Intervention</legend>
        {INTERVENTIONS.map((intervention) => (
          <label key={intervention} className="mt-1 flex items-center gap-2">
            <input
              type="radio"
              name={`${id}-intervention`}
              checked={(empirical ? 'paclitaxel' : choice.intervention) === intervention}
              onChange={() => setChoice({ ...choice, intervention })}
            />
            {INTERVENTION_LABELS[intervention]}
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor={`${id}-scale`} className="font-medium">
          What-if sensitivity scale: {(empirical ? 1 : choice.sensitivityScale).toFixed(1)}
        </label>
        <input
          id={`${id}-scale`}
          type="range"
          disabled={empirical}
          min={SENSITIVITY_SCALE.min}
          max={SENSITIVITY_SCALE.max}
          step={0.1}
          value={empirical ? 1 : choice.sensitivityScale}
          onChange={(e) => setChoice({ ...choice, sensitivityScale: e.target.valueAsNumber })}
          className="mt-1 block w-full"
        />
        <p className="mt-1 text-xs text-slate-600">
          {empirical
            ? 'The empirical forecast covers paclitaxel at the fitted setting only, so these two controls are fixed.'
            : 'An educational multiplier on the assumed drug effect. It is not a dose.'}
        </p>
      </div>

      <button type="submit" disabled={busy || blocked !== null} className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white disabled:bg-slate-400">
        {busy ? 'Running' : 'Run scenario'}
      </button>
    </form>
  )
}
