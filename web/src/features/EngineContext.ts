import { createContext, useContext } from 'react'
import type { DomainEngine } from '../engines/index.ts'

export const EngineContext = createContext<DomainEngine | null>(null)

/** Features reach the engine only through this hook, never through a concrete class. */
export function useEngine(): DomainEngine {
  const engine = useContext(EngineContext)
  if (!engine) throw new Error('useEngine needs an EngineContext value')
  return engine
}
