import type { Capabilities, CaseRecord, ScenarioRequest } from '../../contracts/index.ts'

// The contract requires a seed. The frontend has no public setting for it yet
// (plan request D8), so it uses the same default as APP_SEED in .env.example.
const DEFAULT_SEED = 7

export interface ScenarioChoice {
  engine: ScenarioRequest['engine']
  horizonDays: number
  intervention: ScenarioRequest['intervention']
  sensitivityScale: number
}

export function modelVersionFor(engine: ScenarioRequest['engine'], capabilities: Capabilities): string | null {
  return engine === 'empirical' ? capabilities.empirical_model_version : capabilities.mechanistic_model_version
}

/**
 * Why an engine cannot be offered for this case, or null when it can.
 * This only decides what the form offers. Admission stays with the engine,
 * which answers with a Problem when a request is not acceptable.
 */
export function unavailableReason(engine: ScenarioRequest['engine'], record: CaseRecord, capabilities: Capabilities): string | null {
  const available = engine === 'empirical' ? capabilities.empirical_available : capabilities.mechanistic_available
  if (!available || modelVersionFor(engine, capabilities) === null) return 'This engine is not available in this build.'
  if (engine === 'empirical' && !record.eligible_paclitaxel) {
    return 'This case is not eligible for the empirical paclitaxel forecast.'
  }
  return null
}

export function buildRequest(choice: ScenarioChoice, record: CaseRecord, modelVersion: string): ScenarioRequest {
  const empirical = choice.engine === 'empirical'
  return {
    contract_version: 1,
    case_id: record.id,
    engine: choice.engine,
    horizon_days: choice.horizonDays,
    // The empirical engine forecasts paclitaxel at the fitted setting only.
    intervention: empirical ? 'paclitaxel' : choice.intervention,
    sensitivity_scale: empirical ? 1 : choice.sensitivityScale,
    model_version: modelVersion,
    seed: DEFAULT_SEED,
  }
}
