import domainSchema from '../../../contracts/domain.schema.json'

// Input bounds, read from the schema so the controls and the contract cannot disagree.
const request = domainSchema.$defs.ScenarioRequest.properties

export const HORIZON_DAYS = {
  min: request.horizon_days.minimum,
  max: request.horizon_days.maximum,
} as const

export const SENSITIVITY_SCALE = {
  min: request.sensitivity_scale.minimum,
  max: request.sensitivity_scale.maximum,
} as const

export const QUESTION_MAX_LENGTH = domainSchema.$defs.ExplanationRequest.properties.question.maxLength
