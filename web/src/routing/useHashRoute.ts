import { useSyncExternalStore } from 'react'

// Hash routing keeps deep links and reloads working under the GitHub Pages
// repository path, where the server knows only index.html.

export const ROUTES = ['cases', 'model'] as const
export type Route = (typeof ROUTES)[number]

export function parseRoute(hash: string): Route {
  const name = hash.replace(/^#\/?/, '')
  return ROUTES.find((route) => route === name) ?? 'cases'
}

export function routeHref(route: Route): string {
  return `#/${route}`
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useHashRoute(): Route {
  return useSyncExternalStore(subscribe, () => parseRoute(window.location.hash))
}
