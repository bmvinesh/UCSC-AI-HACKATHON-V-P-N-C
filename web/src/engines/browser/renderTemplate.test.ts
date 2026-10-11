import { expect, test } from 'vitest'
import examples from '../../../../contracts/examples.json'
import { parseContract, type ExplanationTemplates } from '../../contracts/index.ts'
import { EngineError } from '../EngineError.ts'
import { renderExplanation } from './renderTemplate.ts'

const templates = parseContract('ExplanationTemplates', examples.ExplanationTemplates)
const result = parseContract('ScenarioResult', examples.ScenarioResult)

const withText = (text: string, numberFormat = templates.number_format): ExplanationTemplates => ({
  ...templates,
  number_format: numberFormat,
  templates: [{ ...templates.templates[0], when_source: ['synthetic'], text }],
})
const render = (text: string, numberFormat?: ExplanationTemplates['number_format']) => renderExplanation(withText(text, numberFormat), result).text

test('renders the contract example template from the example result', () => {
  expect(renderExplanation(templates, result)).toEqual({
    templateId: 'illustrative-basic',
    text: 'This mechanistic what-if over 21.00 days is illustrative and cannot establish treatment efficacy.',
    referencedFields: ['request.engine', 'request.horizon_days', 'assumptions'],
  })
})

test('volumes take the volume decimals; indices and -1 select points', () => {
  expect(render('{curves.0.points.0.volume_cm3} to {curves.0.points.-1.volume_cm3} by day {curves.-1.points.-1.day}')).toBe('10.0 to 8.0 by day 21.00')
})

test('rounding is toFixed on the binary value, including a tie', () => {
  const tied = structuredClone(result)
  tied.curves[0].points[0].volume_cm3 = 0.125 // exactly representable: a true tie at 2 decimals
  tied.curves[0].points[1].volume_cm3 = 1.005 // stored just below 1.005
  const text = renderExplanation(withText('{curves.0.points.0.volume_cm3} {curves.0.points.1.volume_cm3}', { volume_cm3_decimals: 2, ratio_decimals: 2 }), tied).text
  expect(text).toBe(`${(0.125).toFixed(2)} ${(1.005).toFixed(2)}`)
  expect(text).toBe('0.13 1.00')
})

test('strings and booleans render as they are', () => {
  expect(render('{source} {provenance.synthetic} {assumptions.0}')).toBe(`synthetic true ${result.assumptions[0]}`)
})

test('the first matching template wins', () => {
  const two: ExplanationTemplates = {
    ...templates,
    templates: [
      { id: 'other', when_source: ['trained_model'], text: 'not this', referenced_fields: ['source'] },
      { id: 'first', when_source: ['synthetic', 'cached'], text: 'first', referenced_fields: ['source'] },
      { id: 'second', when_source: ['synthetic'], text: 'second', referenced_fields: ['source'] },
    ],
  }
  expect(renderExplanation(two, result).templateId).toBe('first')
})

test.each([
  ['a missing field', '{request.dose_mg}'],
  ['an object', '{request}'],
  ['an array', '{assumptions}'],
  ['null', '{origin_source}'],
  ['an index past the end', '{curves.0.points.9.volume_cm3}'],
  ['an inherited property', '{assumptions.length}'],
])('a placeholder resolving to %s makes the template invalid', (_, text) => {
  expect(() => render(text)).toThrow(EngineError)
})

test('a result whose source no template covers is an error, not an empty explanation', () => {
  const trained = { ...result, source: 'trained_model' as const }
  expect(() => renderExplanation(templates, trained)).toThrow(/no template covers/)
})
