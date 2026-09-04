import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

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
