// Derives TypeScript types from the contract schemas into the git-ignored .contracts/.
// Interim for Chaandan's generated clients (plan slice F2). The schemas in ../contracts
// stay the only source of truth: nothing here is committed or edited by hand.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { compile } from 'json-schema-to-typescript'

const CONTRACTS = new URL('../../contracts/', import.meta.url)
const OUT_DIR = new URL('../.contracts/', import.meta.url)
// Whole-file artifact schemas, exposed under these type names beside the domain $defs.
const ARTIFACTS = {
  ReleaseIndex: 'release-index.schema.json',
  ExplanationTemplates: 'explanation-templates.schema.json',
  ParityFixture: 'parity-fixture.schema.json',
  Preprocessing: 'preprocessing.schema.json',
}

const read = async (name) => JSON.parse(await readFile(new URL(name, CONTRACTS), 'utf8'))

const domain = await read('domain.schema.json')
const DOMAIN_REF = `${domain.$id}#/$defs/`

// Cross-file references become local ones so every type is emitted exactly once.
function localize(node) {
  if (Array.isArray(node)) return node.map(localize)
  if (node === null || typeof node !== 'object') return node
  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === '$id' || key === '$schema' || key === 'title') continue
    out[key] = key === '$ref' && typeof value === 'string' && value.startsWith(DOMAIN_REF)
      ? `#/$defs/${value.slice(DOMAIN_REF.length)}`
      : localize(value)
  }
  return out
}

const $defs = localize(domain.$defs)
for (const [name, file] of Object.entries(ARTIFACTS)) $defs[name] = localize(await read(file))

const types = await compile({ $defs }, 'Contracts', {
  unreachableDefinitions: true,
  ignoreMinAndMaxItems: true, // plain arrays; the validators enforce the bounds
  additionalProperties: false,
  bannerComment: '/* Derived from contracts/*.json by scripts/derive-contracts.mjs. Do not edit or commit. */',
})

await mkdir(OUT_DIR, { recursive: true })
await writeFile(new URL('types.d.ts', OUT_DIR), types)
console.log(`derived ${Object.keys($defs).length} contract types`)
