import { expect, test } from 'vitest'
import { parseProfile } from './config.ts'

test('accepts the two build profiles', () => {
  expect(parseProfile('local')).toBe('local')
  expect(parseProfile('pages')).toBe('pages')
})

test('rejects a missing or unknown profile instead of guessing', () => {
  expect(() => parseProfile(undefined)).toThrow(/VITE_PROFILE/)
  expect(() => parseProfile('production')).toThrow(/VITE_PROFILE/)
})
