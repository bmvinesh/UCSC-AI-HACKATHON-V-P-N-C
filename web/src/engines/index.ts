import type { Profile } from '../config.ts'
import type { DomainEngine } from './DomainEngine.ts'
import { FixtureEngine } from './fixture/FixtureEngine.ts'
import { LocalApiEngine } from './local/LocalApiEngine.ts'

export type { DomainEngine } from './DomainEngine.ts'
export { EngineError, localProblem, toProblem } from './EngineError.ts'

export interface EngineChoice {
  engine: DomainEngine
  /** Shown in the UI so a fixture is never mistaken for a model or an API. */
  description: string
}

// The profile picks the engine at build time; nothing is probed at run time.
// The Pages profile runs on the synthetic fixtures until BrowserEngine (plan F5) exists.
export function createEngine(profile: Profile): EngineChoice {
  // The second test is a build-time constant, so a Pages bundle contains no API client at all.
  if (profile === 'local' && import.meta.env.VITE_PROFILE === 'local') {
    return { engine: new LocalApiEngine(), description: 'Connected to the local API on this machine.' }
  }
  return {
    engine: new FixtureEngine(),
    description: 'Synthetic contract fixtures. No model or API is connected.',
  }
}
