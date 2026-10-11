// The single place the app gets contract types and validators from.
// Today both are derived from ../../../contracts/*.json (see scripts/derive-contracts.mjs).
// When Chaandan's generated clients land in src/generated/, only this folder changes.
export type {
  Capabilities,
  CaseRecord,
  Curve,
  CurvePoint,
  EmpiricalManifest,
  ExplanationRequest,
  ExplanationResult,
  ExplanationTemplates,
  JobRecord,
  MechanisticManifest,
  Observation,
  ParityFixture,
  Problem,
  Provenance,
  ReleaseIndex,
  ScenarioRequest,
  ScenarioResult,
} from '../../.contracts/types'
export { ContractError, parseContract, type ContractName, type ContractTypes } from './validate.ts'
export { HORIZON_DAYS, QUESTION_MAX_LENGTH, SENSITIVITY_SCALE } from './bounds.ts'
