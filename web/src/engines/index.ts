import type { Profile } from '../config.ts'
import type { DomainEngine } from './DomainEngine.ts'
import { FixtureEngine } from './fixture/FixtureEngine.ts'

export type { DomainEngine } from './DomainEngine.ts'
export { EngineError, localProblem, toProblem } from './EngineError.ts'

export interface EngineChoice {
  engine: DomainEngine
  /** Shown in the UI so a fixture is never mistaken for a model or an API. */
  description: string
}

// The profile picks the engine at build time. Until LocalApiEngine (plan F4) and
// BrowserEngine (plan F5) exist, both profiles run on the synthetic fixtures.
export function createEngine(_profile: Profile): EngineChoice {
  return {
    engine: new FixtureEngine(),
    description: 'Synthetic contract fixtures. No model or API is connected.',
  }
}
