import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const backendEnvFile = resolve(repositoryRoot, 'backend/.env')

// Backend and frontend integration settings come from one ignored local file.
// Only the public Clerk key and public feature flags are written to runtime config.
if (existsSync(backendEnvFile)) {
    process.loadEnvFile(backendEnvFile)
}

const publishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim() ?? ''
const selfRegistrationEnabled = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED === 'true'

if (!publishableKey) {
    // Clerk is the only sign-in method, so the app builds but nobody can sign in.
    console.warn('generate-runtime-config: CLERK_PUBLISHABLE_KEY is not set; sign-in will be unavailable.')
}

const runtimeConfig = {
    clerkPublishableKey: publishableKey,
    selfRegistrationEnabled,
}

await writeFile(
    resolve(process.cwd(), 'public/runtime-config.js'),
    `globalThis.__BOARD_VAULT_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};\n`,
)
