import type { CaseRecord, Curve, CurvePoint, EmpiricalManifest, MechanisticManifest, ScenarioRequest, ScenarioResult } from '../../contracts/index.ts'

export interface Tensor {
  data: Float32Array
  dims: number[]
}

/**
 * Runs one ONNX graph. The Web Worker implements this with ONNX Runtime Web; tests
 * pass a double. It knows nothing about volumes or days: tensors in, tensors out.
 */
export type RunGraph = (model: ArrayBuffer, feeds: Record<string, Tensor>, outputs: string[]) => Promise<Record<string, Float32Array>>

type Manifest = EmpiricalManifest | MechanisticManifest

const column = (values: number[]): Tensor => ({ data: Float32Array.from(values), dims: [values.length, 1] })
const vector = (values: number[]): Tensor => ({ data: Float32Array.from(values), dims: [values.length] })

/** One point per whole day from 0 to the horizon, as the contract fixes the grid. */
const dayGrid = (horizonDays: number) => Array.from({ length: horizonDays + 1 }, (_, day) => day)

/** Raw values in, in the tensor layout of docs/CONTRACTS.md. No transform is applied here: they live in the graph. */
export function buildFeeds(manifest: Manifest, request: ScenarioRequest, record: CaseRecord): { feeds: Record<string, Tensor>; days: number[] } {
  const days = dayGrid(request.horizon_days)
  const baseline = record.baseline_volume_cm3
  if (manifest.engine === 'empirical') {
    return { days, feeds: { baseline_volume_cm3: column(days.map(() => baseline)), elapsed_days: column(days) } }
  }
  return {
    days,
    feeds: {
      baseline_volume_cm3: vector([baseline]),
      days: vector(days),
      intervention_on: vector([request.intervention === 'paclitaxel' ? 1 : 0]),
      sensitivity_scale: vector([request.sensitivity_scale]),
    },
  }
}

export function outputNames(manifest: Manifest): string[] {
  return manifest.engine === 'empirical' ? ['volume_cm3'] : ['volume_cm3', 'lower_cm3', 'upper_cm3']
}

function column_of(outputs: Record<string, Float32Array>, name: string, length: number): Float32Array {
  const values = outputs[name]
  if (!values || values.length !== length) throw new Error(`The graph returned ${values?.length ?? 'no'} values for ${name}; expected ${length}.`)
  // A graph that produces a bad number has failed. The value is reported, never clipped into range.
  const bad = values.findIndex((value) => !Number.isFinite(value) || value < 0)
  if (bad !== -1) throw new Error(`The graph returned an invalid ${name} at day ${bad}: ${values[bad]}.`)
  return values
}

// docs/CONTRACTS.md, "DTO assembly": source, evidence and band kind per engine and condition.
function labels(manifest: Manifest): Pick<ScenarioResult, 'source'> & Pick<Curve, 'evidence' | 'band_kind'> {
  if (manifest.engine === 'empirical') {
    return { source: manifest.trained_on === 'real' ? 'trained_model' : 'synthetic', evidence: 'forecast', band_kind: 'none' }
  }
  return { source: manifest.parameter_basis === 'assumption' ? 'mechanistic' : 'conditional_calibration', evidence: 'illustrative', band_kind: 'sensitivity' }
}

const CURVE_LABELS = { empirical: 'Early treated forecast', mechanistic: 'Illustrative what-if' } as const

/** Turns graph outputs into the contract's ScenarioResult. It copies numbers; it computes none. */
export function assembleResult(
  manifest: Manifest,
  request: ScenarioRequest,
  record: CaseRecord,
  days: number[],
  outputs: Record<string, Float32Array>,
): ScenarioResult {
  const { source, evidence, band_kind } = labels(manifest)
  const volume = column_of(outputs, 'volume_cm3', days.length)
  const banded = manifest.engine === 'mechanistic'
  const lower = banded ? column_of(outputs, 'lower_cm3', days.length) : null
  const upper = banded ? column_of(outputs, 'upper_cm3', days.length) : null

  const points: CurvePoint[] = days.map((day, i) => ({
    day,
    volume_cm3: volume[i],
    lower_cm3: lower ? lower[i] : null,
    upper_cm3: upper ? upper[i] : null,
  }))

  return {
    id: crypto.randomUUID(),
    request,
    source,
    origin_source: null,
    curves: [{ label: CURVE_LABELS[manifest.engine], evidence, band_kind, points }],
    model_version: manifest.model_version,
    assumptions: manifest.engine === 'mechanistic' ? manifest.assumptions : [],
    warnings: manifest.limits,
    provenance: record.provenance,
    created_at: new Date().toISOString(),
  }
}
