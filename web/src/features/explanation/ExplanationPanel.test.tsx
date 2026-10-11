import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import examples from '../../../../contracts/examples.json'
import { parseContract, type ExplanationResult } from '../../contracts/index.ts'
import { FixtureEngine } from '../../engines/fixture/FixtureEngine.ts'
import type { DomainEngine } from '../../engines/index.ts'
import { EngineContext } from '../EngineContext.ts'
import { ExplanationPanel } from './ExplanationPanel.tsx'

afterEach(cleanup)

const FAST = { initialMs: 5, maxMs: 20, factor: 1.5 }
const result = parseContract('ScenarioResult', examples.ScenarioResult)

function setup(chatAvailable: boolean, explanation?: Partial<ExplanationResult>, engine: DomainEngine = new FixtureEngine()) {
  const asked: string[] = []
  const submit = engine.submitExplanation.bind(engine)
  engine.submitExplanation = (request) => {
    asked.push(request.question)
    return submit(request)
  }
  if (explanation) {
    const get = engine.getExplanation.bind(engine)
    engine.getExplanation = async (id) => ({ ...(await get(id)), ...explanation })
  }
  render(
    <EngineContext value={engine}>
      <ExplanationPanel result={result} chatAvailable={chatAvailable} schedule={FAST} />
    </EngineContext>,
  )
  return asked
}

test('without chat, the panel says chat is a local GX10 feature and offers the fixed explanation', async () => {
  const asked = setup(false)
  expect(screen.getByText(/Chat with the Qwen model is a local GX10 feature/)).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show the fixed explanation' }))
  expect(await screen.findByText(examples.ExplanationResult.text)).toBeTruthy()
  expect(screen.getByText('Fixed template filled from this result')).toBeTruthy()
  expect(screen.getByText(examples.ExplanationResult.warnings[0])).toBeTruthy()
  expect(asked).toEqual(['Explain the current result.'])
})

test('with chat, the typed question is sent and the Qwen source and model are shown', async () => {
  const asked = setup(true, { source: 'qwen', model_id: 'qwen-test-id', warnings: [] })
  const button = screen.getByRole('button', { name: 'Ask' }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Why does it fall?  ' } })
  fireEvent.click(button)
  expect(await screen.findByText(/Written by the local Qwen model, model qwen-test-id/)).toBeTruthy()
  expect(asked).toEqual(['Why does it fall?'])
})

test('cached Qwen text is labelled as cached', async () => {
  setup(true, { source: 'cached_qwen', model_id: 'qwen-test-id' })
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Why?' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
  expect(await screen.findByText(/Cached text from the local Qwen model/)).toBeTruthy()
})

test('a failed explanation shows a problem and no text', async () => {
  const engine = new FixtureEngine()
  engine.submitExplanation = async () => {
    throw new Error('runtime unreachable')
  }
  render(
    <EngineContext value={engine}>
      <ExplanationPanel result={result} chatAvailable={false} schedule={FAST} />
    </EngineContext>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show the fixed explanation' }))
  expect((await screen.findByRole('alert')).textContent).toContain('runtime unreachable')
  expect(screen.queryByText(examples.ExplanationResult.text)).toBeNull()
})
