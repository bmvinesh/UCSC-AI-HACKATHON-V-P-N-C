import { PROFILE_LABELS, type Profile } from './config.ts'
import { ROUTES, routeHref, useHashRoute, type Route } from './routing/useHashRoute.ts'

const ROUTE_LABELS: Record<Route, string> = {
  cases: 'Cases',
  model: 'Model and assumptions',
}

export default function App({ profile }: { profile: Profile }) {
  const route = useHashRoute()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <h1 className="text-lg font-semibold">OncoGrowth</h1>
          <nav aria-label="Sections" className="flex gap-4 text-sm">
            {ROUTES.map((name) => (
              <a
                key={name}
                href={routeHref(name)}
                aria-current={name === route ? 'page' : undefined}
                className="rounded px-1 py-0.5 text-slate-600 underline-offset-4 hover:underline focus-visible:outline-2 aria-[current=page]:font-medium aria-[current=page]:text-slate-900"
              >
                {ROUTE_LABELS[name]}
              </a>
            ))}
          </nav>
          <span className="ml-auto rounded-full border border-slate-300 px-3 py-0.5 text-xs text-slate-700">
            {PROFILE_LABELS[profile]}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h2 className="text-xl font-semibold">{ROUTE_LABELS[route]}</h2>
        <p className="mt-2 text-sm text-slate-600">Nothing is loaded yet. No case, model or result is available in this build.</p>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-5xl px-4 py-3 text-xs text-slate-600">
          Research demonstration of breast tumour volume under paclitaxel. Not a medical device and not for treatment decisions.
        </p>
      </footer>
    </div>
  )
}
