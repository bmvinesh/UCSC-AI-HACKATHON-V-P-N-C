import { expect, test } from 'vitest'
import examples from '../../../contracts/examples.json'
import { ContractError, parseContract, type ContractName } from './index.ts'

const NAMES = Object.keys(examples).filter((key) => !key.startsWith('_')) as ContractName[]

test.each(NAMES)('the %s example matches its schema', (name) => {
  expect(parseContract(name, examples[name])).toBe(examples[name])
})

test('a result curve cannot be labelled observed', () => {
  const result = structuredClone(examples.ScenarioResult)
  result.curves[0].evidence = 'observed'
  expect(() => parseContract('ScenarioResult', result)).toThrow(ContractError)
})

test('the horizon is a whole number of days within bounds', () => {
  expect(() => parseContract('ScenarioRequest', { ...examples.ScenarioRequest, horizon_days: 21.5 })).toThrow(ContractError)
  expect(() => parseContract('ScenarioRequest', { ...examples.ScenarioRequest, horizon_days: 0 })).toThrow(ContractError)
})

test('extra fields are rejected and the issue names the path', () => {
  try {
    parseContract('JobRecord', { ...examples.JobRecord, surprise: true })
    expect.unreachable()
  } catch (error) {
    expect(error).toBeInstanceOf(ContractError)
    expect((error as ContractError).issues.join(' ')).toMatch(/additional properties/)
  }
})

test('non-finite numbers are rejected', () => {
  const record = structuredClone(examples.CaseRecord)
  record.baseline_volume_cm3 = Number.NaN
  expect(() => parseContract('CaseRecord', record)).toThrow(ContractError)
})
