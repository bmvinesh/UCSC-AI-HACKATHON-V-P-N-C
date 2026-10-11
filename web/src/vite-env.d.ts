/// <reference types="vite/client" />

// Public build settings. Nothing secret may ever be added here: VITE_* ships in the bundle.
interface ImportMetaEnv {
  readonly VITE_PROFILE?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
