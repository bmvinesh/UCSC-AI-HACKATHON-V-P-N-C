import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { parseProfile } from './config.ts'
import { createEngine } from './engines/index.ts'
import './index.css'

// A build without a valid profile fails here, loudly, instead of guessing one.
const profile = parseProfile(import.meta.env.VITE_PROFILE)

const { engine, description } = createEngine(profile)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App profile={profile} engine={engine} engineDescription={description} />
  </StrictMode>,
)
