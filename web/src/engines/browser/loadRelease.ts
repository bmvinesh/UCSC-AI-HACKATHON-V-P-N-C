import {
  parseContract,
  type CaseRecord,
  type ContractName,
  type ContractTypes,
  type EmpiricalManifest,
  type ExplanationTemplates,
  type MechanisticManifest,
} from '../../contracts/index.ts'
import { EngineError, localProblem } from '../EngineError.ts'

/** Reads one file under artifacts/public/ by its release-relative path. */
export type FetchArtifact = (path: string) => Promise<ArrayBuffer>

export interface LoadedEngine<M> {
  manifest: M
  model: ArrayBuffer
}

export interface LoadedRelease {
  releaseId: string
  cases: CaseRecord[]
  templates: ExplanationTemplates | null
  empirical: LoadedEngine<EmpiricalManifest> | null
  mechanistic: LoadedEngine<MechanisticManifest> | null
  /** Why each missing piece is missing, in words a user can read. */
  degradedReasons: string[]
}

interface FileRef {
  path: string
  sha256: string
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Bytes are used only after their hash matches the one the release index or manifest names. */
async function verified(fetchArtifact: FetchArtifact, ref: FileRef): Promise<ArrayBuffer> {
  const bytes = await fetchArtifact(ref.path)
  if ((await sha256Hex(bytes)) !== ref.sha256) throw new Error(`${ref.path} does not match its recorded SHA-256`)
  return bytes
}

const parseJson = (bytes: ArrayBuffer): unknown => JSON.parse(new TextDecoder().decode(bytes))

async function loadEngine<K extends 'EmpiricalManifest' | 'MechanisticManifest'>(
  fetchArtifact: FetchArtifact,
  name: K,
  ref: FileRef | null,
): Promise<LoadedEngine<ContractTypes[K]>> {
  if (!ref) throw new Error('the release does not include it')
  const manifest = parseContract(name, parseJson(await verified(fetchArtifact, ref)))
  const model = await verified(fetchArtifact, { path: manifest.onnx_path, sha256: manifest.onnx_sha256 })
  return { manifest, model }
}

/**
 * Loads everything the release index lists. A piece that is absent, unreadable, off-schema
 * or fails its hash is left out with a reason; the rest of the release still loads.
 * Only an unusable index itself is fatal.
 */
export async function loadRelease(fetchArtifact: FetchArtifact): Promise<LoadedRelease> {
  let index: ContractTypes['ReleaseIndex']
  try {
    index = parseContract('ReleaseIndex', parseJson(await fetchArtifact('release-index.json')))
  } catch (error) {
    throw new EngineError(localProblem('MODEL_UNAVAILABLE', `The release index could not be loaded: ${message(error)}`, true))
  }

  const degradedReasons: string[] = []
  const attempt = async <T>(what: string, load: () => Promise<T>): Promise<T | null> => {
    try {
      return await load()
    } catch (error) {
      degradedReasons.push(`${what} is unavailable: ${message(error)}`)
      return null
    }
  }
  const json = <K extends ContractName>(name: K, ref: FileRef) => async () => parseContract(name, parseJson(await verified(fetchArtifact, ref)))

  const empirical = await attempt('The empirical forecast', () => loadEngine(fetchArtifact, 'EmpiricalManifest', index.empirical_manifest))
  const mechanistic = await attempt('The mechanistic what-if', () => loadEngine(fetchArtifact, 'MechanisticManifest', index.mechanistic_manifest))
  const templates = await attempt('The fixed explanation', json('ExplanationTemplates', index.explanation_templates))

  const cases: CaseRecord[] = []
  for (const catalog of index.case_catalogs) {
    const records = await attempt(`Case catalog ${catalog.path}`, async () => {
      const list = parseJson(await verified(fetchArtifact, catalog))
      if (!Array.isArray(list)) throw new Error('it is not a list of cases')
      return list.map((item) => parseContract('CaseRecord', item))
    })
    if (records) cases.push(...records)
  }

  return { releaseId: index.release_id, cases, templates, empirical, mechanistic, degradedReasons }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
