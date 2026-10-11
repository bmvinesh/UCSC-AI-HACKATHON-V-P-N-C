import examples from '../../contracts/examples.json'
import type { RunGraph } from '../../web/src/engines/browser/inference.ts'
import type { FetchArtifact } from '../../web/src/engines/browser/loadRelease.ts'

const encode = (value: unknown) => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value))
const sha256 = async (bytes: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.slice().buffer)), (b) => b.toString(16).padStart(2, '0')).join('')

export const ELIGIBLE_CASE = { ...examples.CaseRecord, id: '00000000-0000-4000-8000-0000000000e1', label: 'Eligible synthetic case', eligible_paclitaxel: true }

/**
 * A complete artifacts/public/ tree held in memory, built from the contract examples
 * with real hashes. The "model" files are placeholder bytes: no ONNX graph exists yet,
 * so tests pair this with `constantGraph`, a test double.
 */
export function fakeRelease(change: (files: Map<string, Uint8Array>) => void = () => {}) {
  const files = new Map<string, Uint8Array>()
  const put = async (path: string, value: unknown) => {
    const bytes = encode(value)
    files.set(path, bytes)
    return { path, sha256: await sha256(bytes) }
  }

  const build = async () => {
    const empiricalModel = await put(examples.EmpiricalManifest.onnx_path, 'placeholder bytes, not an ONNX graph (empirical)')
    const mechanisticModel = await put(examples.MechanisticManifest.onnx_path, 'placeholder bytes, not an ONNX graph (mechanistic)')
    await put('release-index.json', {
      ...examples.ReleaseIndex,
      empirical_manifest: await put('empirical/synthetic-fixture-v1/manifest.json', { ...examples.EmpiricalManifest, onnx_sha256: empiricalModel.sha256 }),
      mechanistic_manifest: await put('mechanistic/mech-fixture-v1/manifest.json', { ...examples.MechanisticManifest, onnx_sha256: mechanisticModel.sha256 }),
      case_catalogs: [{ ...(await put('cases/synthetic-v1.json', [examples.CaseRecord, ELIGIBLE_CASE])), source: 'synthetic' }],
      explanation_templates: await put('templates/explanations-v1.json', examples.ExplanationTemplates),
    })
    change(files)
  }
  /** Resolves once the tree and its hashes exist. `fetchArtifact` waits for it. */
  const ready = build()

  const requested: string[] = []
  const fetchArtifact: FetchArtifact = async (path) => {
    await ready
    requested.push(path)
    const bytes = files.get(path)
    if (!bytes) throw new Error(`${path} was not found`)
    return bytes.slice().buffer
  }
  return { fetchArtifact, requested, files, ready }
}

/** A test double for the ONNX worker: every output equals the baseline input. It is not a model. */
export function constantGraph(calls: Parameters<RunGraph>[] = []): RunGraph {
  return async (model, feeds, outputs) => {
    calls.push([model, feeds, outputs])
    const length = (feeds.days ?? feeds.elapsed_days).data.length
    const baseline = feeds.baseline_volume_cm3.data[0]
    return Object.fromEntries(outputs.map((name) => [name, new Float32Array(length).fill(baseline)]))
  }
}
