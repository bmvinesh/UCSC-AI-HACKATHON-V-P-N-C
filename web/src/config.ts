// Build-time configuration. The runtime profile is chosen when the bundle is built
// and is never probed at run time: a Pages build must not look for a local API.

export const PROFILES = ['local', 'pages'] as const
export type Profile = (typeof PROFILES)[number]

export function parseProfile(value: string | undefined): Profile {
  const match = PROFILES.find((profile) => profile === value)
  if (!match) {
    throw new Error(`VITE_PROFILE must be one of ${PROFILES.join(', ')}; got "${value ?? ''}"`)
  }
  return match
}

export const PROFILE_LABELS: Record<Profile, string> = {
  local: 'Local GX10 build',
  pages: 'Public browser build',
}
