import examples from '../../contracts/examples.json'

export interface Recorded {
  method: string
  path: string
  headers: Record<string, string>
  body: unknown
}

type Reply = { status: number; body?: unknown; headers?: Record<string, string> }

const json = ({ status, body, headers }: Reply) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

const problem = (code: string, message: string, retryable = false) => ({ code, message, retryable, trace_id: 'fake-trace' })

/**
 * An in-memory stand-in for the REST table in docs/CONTRACTS.md, serving the
 * contract examples. It exists to test LocalApiEngine; it is not the API.
 * `override` replaces the reply for one "METHOD /path".
 */
export function fakeApi(override: Record<string, Reply> = {}) {
  const calls: Recorded[] = []
  const jobs = new Map<string, Record<string, unknown>>()
  let sessions = 0

  const newJob = (kind: string, resultId: string) => {
    const id = crypto.randomUUID()
    const base = { ...examples.JobRecord, id, kind, state: 'queued', progress: 0, result_id: null, error: null }
    jobs.set(id, base)
    // The second poll sees the finished job.
    setTimeout(() => jobs.get(id)?.state === 'queued' && jobs.set(id, { ...base, state: 'succeeded', progress: 1, result_id: resultId }), 10)
    return base
  }

  const route = (method: string, path: string, body: unknown): Reply => {
    const key = `${method} ${path}`
    if (override[key]) return override[key]
    if (key === 'POST /session') return { status: 201, body: {} }
    if (sessions === 0) return { status: 404, body: problem('NOT_FOUND', 'no session') }
    if (key === 'GET /capabilities') return { status: 200, body: examples.Capabilities }
    if (key === 'GET /cases') return { status: 200, body: [examples.CaseRecord] }
    if (key === 'POST /scenarios') {
      const horizon = (body as { horizon_days?: unknown }).horizon_days
      if (!Number.isInteger(horizon) || (horizon as number) > 84) return { status: 422, body: problem('INVALID_INPUT', 'horizon_days is out of range') }
      return { status: 202, body: newJob('scenario', examples.ScenarioResult.id) }
    }
    if (key === 'POST /explanations') return { status: 202, body: newJob('explanation', examples.ExplanationResult.id) }
    const [, kind, id, action] = path.split('/')
    if (kind === 'jobs' && jobs.has(id)) {
      if (action === 'cancel' && jobs.get(id)!.state === 'queued') jobs.set(id, { ...jobs.get(id)!, state: 'cancelled' })
      return { status: action ? 202 : 200, body: jobs.get(id) }
    }
    if (key === `GET /results/${examples.ScenarioResult.id}`) return { status: 200, body: examples.ScenarioResult }
    if (key === `GET /explanations/${examples.ExplanationResult.id}`) return { status: 200, body: examples.ExplanationResult }
    return { status: 404, body: problem('NOT_FOUND', `nothing at ${path}`) }
  }

  const fetchFn: typeof fetch = async (input, init) => {
    const path = String(input).replace('/api/v1', '')
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, path, headers: { ...(init?.headers as Record<string, string>) }, body })
    const reply = route(method, path, body)
    if (method === 'POST' && path === '/session' && reply.status === 201) sessions++
    return json(reply)
  }

  return { fetchFn, calls }
}
