import { useCallback, useEffect, useState } from 'react'
import type { Problem } from '../contracts/index.ts'
import { toProblem, type DomainEngine } from '../engines/index.ts'
import { useEngine } from './EngineContext.ts'

export type Query<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'problem'; problem: Problem }

/** Loads one read from the engine. `retry` runs it again after a Problem. */
export function useEngineQuery<T>(read: (engine: DomainEngine) => Promise<T>): Query<T> & { retry: () => void } {
  const engine = useEngine()
  const [attempt, setAttempt] = useState(0)
  const [query, setQuery] = useState<Query<T>>({ status: 'loading' })

  useEffect(() => {
    let current = true
    setQuery({ status: 'loading' })
    read(engine).then(
      (data) => current && setQuery({ status: 'ready', data }),
      (error) => current && setQuery({ status: 'problem', problem: toProblem(error) }),
    )
    return () => {
      current = false
    }
    // `read` is a stable module-level function at every call site.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...query, retry }
}
