import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import examples from '../../contracts/examples.json'
import App from './App.tsx'
import { FixtureEngine } from './engines/fixture/FixtureEngine.ts'
import type { DomainEngine } from './engines/index.ts'
import { parseRoute } from './routing/useHashRoute.ts'

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const DESCRIPTION = 'Synthetic contract fixtures. No model or API is connected.'

function renderApp(profile: 'local' | 'pages' = 'local', engine: DomainEngine = new FixtureEngine()) {
  return render(<App profile={profile} engine={engine} engineDescription={DESCRIPTION} />)
}

test('shows which build profile and which engine are running', async () => {
  renderApp('pages')
  expect(screen.getByText('Public browser build')).toBeTruthy()
  expect(screen.getByText(DESCRIPTION)).toBeTruthy()
  await screen.findByRole('heading', { name: examples.CaseRecord.label })
})

test('follows the hash route and marks the current section', async () => {
  renderApp()
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Cases')

  act(() => {
    window.location.hash = '#/model'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
  expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Model and assumptions')
  expect(screen.getByRole('link', { name: 'Model and assumptions' }).getAttribute('aria-current')).toBe('page')
  await screen.findByText(/Nothing here is a dosing or treatment recommendation/)
})

test('an unknown hash falls back to the case list', () => {
  expect(parseRoute('#/nope')).toBe('cases')
  expect(parseRoute('')).toBe('cases')
})

test('a case shows its observations with units, source and the synthetic label', async () => {
  renderApp()
  const details = (await screen.findByRole('heading', { name: examples.CaseRecord.label })).closest('section')!
  expect(within(details).getByText('Synthetic, not patient data')).toBeTruthy()
  expect(within(details).getAllByText('10.00 cm³').length).toBeGreaterThan(0)
  expect(within(details).getByText(examples.CaseRecord.observations[0].source_ref)).toBeTruthy()
  expect(within(details).getByText(examples.CaseRecord.provenance.limitations[0])).toBeTruthy()
})

test('the empirical engine is not offered for an ineligible case, and says why', async () => {
  renderApp()
  const empirical = (await screen.findByLabelText('Empirical forecast')) as HTMLInputElement
  expect(empirical.disabled).toBe(true)
  expect(screen.getByText(/not available in this build|not eligible/)).toBeTruthy()
})

test('running a scenario shows the result with its source, assumptions and evidence label', async () => {
  renderApp()
  fireEvent.click(await screen.findByRole('button', { name: 'Run scenario' }))
  expect(await screen.findByText(/Job queued/)).toBeTruthy()

  const facts = (await screen.findByRole('heading', { name: 'Current result' }, { timeout: 3000 })).closest('section')!
  expect(within(facts).getByText('Synthetic')).toBeTruthy()
  expect(within(facts).getByText(examples.ScenarioResult.assumptions[0])).toBeTruthy()
  expect(within(facts).getByText(examples.ScenarioResult.warnings[0])).toBeTruthy()
  // The curve is labelled illustrative in text, not only by its dashed line.
  expect(screen.getByText(/Illustrative what-if\./)).toBeTruthy()
  expect(screen.getByText(/measured values from the case record/)).toBeTruthy()
})

test('a failing engine shows a typed problem and the page stays usable', async () => {
  const engine = new FixtureEngine()
  engine.listCases = async () => {
    throw new Error('catalog unreadable')
  }
  renderApp('local', engine)
  const alert = await screen.findByRole('alert')
  expect(within(alert).getByText('catalog unreadable')).toBeTruthy()
  expect(within(alert).getByText(/Code INTERNAL/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Model and assumptions' })).toBeTruthy()
})
