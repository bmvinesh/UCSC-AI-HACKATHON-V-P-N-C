import { FixtureEngine } from '../../web/src/engines/fixture/FixtureEngine.ts'
import { describeEngineConformance, exampleScenarioRequest } from './engineConformance.ts'

describeEngineConformance('FixtureEngine', () => new FixtureEngine(), exampleScenarioRequest)
