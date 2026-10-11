import type { Capabilities, Curve, ExplanationResult, Observation, Problem, ScenarioRequest, ScenarioResult } from '../contracts/index.ts'

// Display text for every contract enum. Each map is exhaustive, so a new enum value
// in the contract fails the typecheck here instead of rendering as a blank label.

export const EVIDENCE_LABELS: Record<Curve['evidence'], string> = {
  forecast: 'Forecast',
  illustrative: 'Illustrative what-if',
}

export const BAND_LABELS: Record<Curve['band_kind'], string> = {
  none: 'No band',
  sensitivity: 'Sensitivity range from a parameter sweep, not a confidence interval',
  empirical_interval: 'Empirical interval',
}

export const SOURCE_LABELS: Record<ScenarioResult['source'], string> = {
  trained_model: 'Model trained on patient data',
  conditional_calibration: 'Mechanistic model, conditionally calibrated',
  mechanistic: 'Mechanistic model with assumed parameters',
  cached: 'Cached result',
  synthetic: 'Synthetic',
}

export const ENGINE_LABELS: Record<ScenarioRequest['engine'], string> = {
  empirical: 'Empirical forecast',
  mechanistic: 'Mechanistic what-if',
}

export const INTERVENTION_LABELS: Record<ScenarioRequest['intervention'], string> = {
  paclitaxel: 'Paclitaxel',
  none: 'No intervention (comparator)',
}

export const MEASUREMENT_LABELS: Record<Observation['measurement'], string> = {
  ftv: 'Functional tumour volume (MRI)',
  mask_volume: 'Mask volume',
  synthetic: 'Synthetic value',
}

export const PHASE_LABELS: Record<Observation['phase'], string> = {
  baseline: 'Baseline',
  early_paclitaxel: 'Early paclitaxel',
}

export const STATUS_LABELS: Record<Capabilities['status'], string> = {
  ready: 'Ready',
  degraded: 'Degraded',
  starting: 'Starting',
}

export const EXPLANATION_SOURCE_LABELS: Record<ExplanationResult['source'], string> = {
  qwen: 'Written by the local Qwen model',
  cached_qwen: 'Cached text from the local Qwen model',
  template: 'Fixed template filled from this result',
}

export const PROBLEM_TITLES: Record<Problem['code'], string> = {
  INVALID_INPUT: 'That input is not valid',
  NOT_FOUND: 'Not found',
  QUEUE_FULL: 'The queue is full',
  MODEL_UNAVAILABLE: 'This engine is unavailable',
  OUT_OF_DOMAIN: 'Outside the supported range',
  DEPENDENCY_TIMEOUT: 'A dependency timed out',
  INTERRUPTED: 'The job was interrupted',
  INTERNAL: 'Something went wrong',
}

/** Volumes are always shown with their unit. Rounding here is display only. */
export function formatVolume(cm3: number): string {
  return `${cm3.toFixed(2)} cm³`
}

/** A cached result names where it originally came from. */
export function describeSource(result: ScenarioResult): string {
  const label = SOURCE_LABELS[result.source]
  return result.origin_source ? `${label}, originally: ${SOURCE_LABELS[result.origin_source]}` : label
}
