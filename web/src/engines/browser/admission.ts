import type { CaseRecord, EmpiricalManifest, MechanisticManifest, Problem, ScenarioRequest } from '../../contracts/index.ts'
import { localProblem } from '../EngineError.ts'

/**
 * The admission rules of docs/CONTRACTS.md (ScenarioRequest), for the profile that has
 * no Python. The authority is Vinesh's `admission_check`; this must give the same
 * answer and exists only because Pages cannot call it (plan question Q11). The problem
 * codes for the non-horizon rules are my reading until his rejected-request fixtures exist.
 */
export function admissionProblem(request: ScenarioRequest, record: CaseRecord, manifest: EmpiricalManifest | MechanisticManifest): Problem | null {
  if (request.model_version !== manifest.model_version) {
    return localProblem('INVALID_INPUT', `Model version ${request.model_version} is not the loaded version ${manifest.model_version}.`)
  }
  if (manifest.engine === 'empirical') {
    if (request.intervention !== 'paclitaxel') return localProblem('INVALID_INPUT', 'The empirical forecast covers paclitaxel only.')
    if (request.sensitivity_scale !== 1) return localProblem('INVALID_INPUT', 'The empirical forecast has no sensitivity scale; it must be 1.')
    if (!record.eligible_paclitaxel) return localProblem('INVALID_INPUT', 'This case is not eligible for the empirical paclitaxel forecast.')
    if (request.horizon_days > manifest.validated_horizon_days) {
      return localProblem('OUT_OF_DOMAIN', `The empirical forecast is validated to ${manifest.validated_horizon_days} days; ${request.horizon_days} was requested.`)
    }
  } else if (request.horizon_days > manifest.max_horizon_days) {
    return localProblem('OUT_OF_DOMAIN', `The mechanistic what-if supports up to ${manifest.max_horizon_days} days; ${request.horizon_days} was requested.`)
  }
  return null
}
