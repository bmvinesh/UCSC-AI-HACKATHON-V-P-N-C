import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import App from './App.tsx'
import { parseRoute } from './routing/useHashRoute.ts'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

test('shows which build profile is running', () => {
  render(<App profile="pages" />)
  expect(screen.getByText('Public browser build')).toBeTruthy()
})

test('follows the hash route and marks the current section', () => {
  render(<App profile="local" />)
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Cases')

  act(() => {
    window.location.hash = '#/model'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Model and assumptions')
  expect(screen.getByRole('link', { name: 'Model and assumptions' }).getAttribute('aria-current')).toBe('page')
})

test('an unknown hash falls back to the case list', () => {
  expect(parseRoute('#/nope')).toBe('cases')
  expect(parseRoute('')).toBe('cases')
})
