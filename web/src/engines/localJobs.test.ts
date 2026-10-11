import { expect, test } from 'vitest'
import { EngineError } from './EngineError.ts'
import { LocalJobs } from './localJobs.ts'

const RESULT_ID = '00000000-0000-4000-8000-000000000002'

test('a job starts queued with no result and no error', () => {
  const job = new LocalJobs().create('scenario')
  expect(job).toMatchObject({ state: 'queued', progress: 0, result_id: null, error: null })
})

test('success sets the result and full progress', () => {
  const jobs = new LocalJobs()
  const done = jobs.succeed(jobs.create('scenario').id, RESULT_ID)
  expect(done).toMatchObject({ state: 'succeeded', progress: 1, result_id: RESULT_ID, error: null })
  expect(jobs.isActive(done.id)).toBe(false)
})

test('a cancelled job ignores a late completion', () => {
  const jobs = new LocalJobs()
  const { id } = jobs.create('scenario')
  jobs.cancel(id)
  expect(jobs.succeed(id, RESULT_ID)).toMatchObject({ state: 'cancelled', result_id: null })
})

test('a failed job carries its Problem and no result', () => {
  const jobs = new LocalJobs()
  const problem = { code: 'INTERNAL' as const, message: 'worker stopped', retryable: true, trace_id: 'browser-test' }
  expect(jobs.fail(jobs.create('explanation').id, problem)).toMatchObject({ state: 'failed', result_id: null, error: problem })
})

test('an unknown job id is a NOT_FOUND problem', () => {
  expect(() => new LocalJobs().get('missing')).toThrow(EngineError)
})
