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
const authEnabled = publishableKey.length > 0 && process.env.CLERK_AUTH_ENABLED !== 'false'
const selfRegistrationEnabled = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED === 'true'

const runtimeConfig = {
    clerkAuthEnabled: authEnabled,
    clerkPublishableKey: publishableKey,
    selfRegistrationEnabled,
}

await writeFile(
    resolve(process.cwd(), 'public/runtime-config.js'),
    `globalThis.__BOARD_VAULT_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};\n`,
)
