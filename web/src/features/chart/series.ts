import type { Curve, CurvePoint, ScenarioResult } from '../../contracts/index.ts'
import { BAND_LABELS, ENGINE_LABELS, EVIDENCE_LABELS, INTERVENTION_LABELS } from '../labels.ts'

// Colour follows the entity (engine and intervention), never the drawing order, so
// pinning or removing a result does not repaint the others. Validated with the
// dataviz palette checker for colour-blind separation on a light surface.
const SERIES_COLORS = {
  'empirical:paclitaxel': '#2a78d6',
  'mechanistic:paclitaxel': '#eb6834',
  'mechanistic:none': '#1baf7a',
  'empirical:none': '#2a78d6', // the contract never admits this pair
} as const

export interface ChartSeries {
  key: string
  /** Legend text: what the curve is, and how much evidence stands behind it. */
  label: string
  detail: string
  color: string
  /** Illustrative curves are dashed, so evidence never depends on colour alone. */
  dashed: boolean
  hasBand: boolean
  points: CurvePoint[]
}

function toSeries(result: ScenarioResult, curve: Curve, index: number): ChartSeries {
  const { engine, intervention } = result.request
  return {
    key: `${result.id}:${index}`,
    label: `${ENGINE_LABELS[engine]}, ${INTERVENTION_LABELS[intervention]}: ${curve.label}`,
    detail: `${EVIDENCE_LABELS[curve.evidence]}. ${BAND_LABELS[curve.band_kind]}.`,
    color: SERIES_COLORS[`${engine}:${intervention}`],
    dashed: curve.evidence === 'illustrative',
    hasBand: curve.band_kind !== 'none' && curve.points.some((p) => p.lower_cm3 !== null && p.upper_cm3 !== null),
    points: curve.points,
  }
}

/** One series per curve of each result, in the order given. */
export function seriesFromResults(results: ScenarioResult[]): ChartSeries[] {
  return results.flatMap((result) => result.curves.map((curve, index) => toSeries(result, curve, index)))
}
