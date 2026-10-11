import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import domainSchema from '../../../contracts/domain.schema.json'
import templatesSchema from '../../../contracts/explanation-templates.schema.json'
import parityFixtureSchema from '../../../contracts/parity-fixture.schema.json'
import releaseIndexSchema from '../../../contracts/release-index.schema.json'
import type * as T from '../../.contracts/types'

// Runtime validation against the source schemas. This checks shape and bounds only;
// the contract's semantic rules are not re-encoded here.

export interface ContractTypes {
  Capabilities: T.Capabilities
  CaseRecord: T.CaseRecord
  EmpiricalManifest: T.EmpiricalManifest
  ExplanationRequest: T.ExplanationRequest
  ExplanationResult: T.ExplanationResult
  ExplanationTemplates: T.ExplanationTemplates
  JobRecord: T.JobRecord
  MechanisticManifest: T.MechanisticManifest
  ParityFixture: T.ParityFixture
  Problem: T.Problem
  ReleaseIndex: T.ReleaseIndex
  ScenarioRequest: T.ScenarioRequest
  ScenarioResult: T.ScenarioResult
}
export type ContractName = keyof ContractTypes

const ARTIFACT_SCHEMA_IDS: Partial<Record<ContractName, string>> = {
  ExplanationTemplates: templatesSchema.$id,
  ParityFixture: parityFixtureSchema.$id,
  ReleaseIndex: releaseIndexSchema.$id,
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
for (const schema of [domainSchema, templatesSchema, parityFixtureSchema, releaseIndexSchema]) {
  ajv.addSchema(schema)
}

function validatorFor(name: ContractName): ValidateFunction {
  const ref = ARTIFACT_SCHEMA_IDS[name] ?? `${domainSchema.$id}#/$defs/${name}`
  const validator = ajv.getSchema(ref)
  if (!validator) throw new Error(`no contract schema for ${name}`)
  return validator
}

export class ContractError extends Error {
  readonly contract: ContractName
  readonly issues: string[]

  constructor(contract: ContractName, issues: string[]) {
    super(`${contract} does not match the contract: ${issues.join('; ')}`)
    this.name = 'ContractError'
    this.contract = contract
    this.issues = issues
  }
}

/** Returns `value` typed as the named contract, or throws ContractError. Never coerces. */
export function parseContract<K extends ContractName>(name: K, value: unknown): ContractTypes[K] {
  const validator = validatorFor(name)
  if (!validator(value)) {
    const issues = (validator.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`)
    throw new ContractError(name, issues)
  }
  return value as ContractTypes[K]
}
