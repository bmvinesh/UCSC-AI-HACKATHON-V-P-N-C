import type { ExplanationTemplates, ScenarioResult } from '../../contracts/index.ts'
import { EngineError, localProblem } from '../EngineError.ts'

// The deterministic explanation: substitution into a data file, with no logic of its own.
// Rules are fixed by docs/CONTRACTS.md ("Explanation templates") and must reproduce
// Vinesh's rendered fixture byte for byte, so nothing here may be "improved" locally.

const PLACEHOLDER = /\{([^{}]+)\}/g

export interface RenderedExplanation {
  templateId: string
  text: string
  referencedFields: string[]
}

function invalid(message: string): EngineError {
  return new EngineError(localProblem('INTERNAL', `Explanation template is invalid: ${message}`))
}

/** Walks a dotted path. A segment is a field name or an integer index; -1 means the last item. */
function resolve(root: unknown, path: string): unknown {
  let node = root
  for (const segment of path.split('.')) {
    if (Array.isArray(node) && /^-?\d+$/.test(segment)) {
      const index = Number(segment)
      node = node[index < 0 ? node.length + index : index]
    } else if (node !== null && typeof node === 'object' && !Array.isArray(node) && Object.hasOwn(node, segment)) {
      node = (node as Record<string, unknown>)[segment]
    } else {
      throw invalid(`{${path}} does not resolve`)
    }
  }
  return node
}

function format(value: unknown, path: string, numberFormat: ExplanationTemplates['number_format']): string {
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') {
    // Fields ending _cm3 take the volume decimals, every other number the ratio decimals.
    const field = path.split('.').findLast((segment) => !/^-?\d+$/.test(segment)) ?? ''
    return value.toFixed(field.endsWith('_cm3') ? numberFormat.volume_cm3_decimals : numberFormat.ratio_decimals)
  }
  throw invalid(`{${path}} is not a scalar`)
}

/** Renders the first template whose `when_source` contains the result's source. */
export function renderExplanation(templates: ExplanationTemplates, result: ScenarioResult): RenderedExplanation {
  const template = templates.templates.find((candidate) => candidate.when_source.includes(result.source))
  if (!template) throw invalid(`no template covers source "${result.source}"`)
  return {
    templateId: template.id,
    text: template.text.replace(PLACEHOLDER, (_, path: string) => format(resolve(result, path), path, templates.number_format)),
    referencedFields: template.referenced_fields,
  }
}
