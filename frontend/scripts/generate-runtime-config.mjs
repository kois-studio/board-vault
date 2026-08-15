import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const publishableKey = process.env.CLERK_PUBLISHABLE_KEY?.trim() ?? ''
const authEnabled = publishableKey.length > 0 && process.env.CLERK_AUTH_ENABLED !== 'false'

const runtimeConfig = {
    clerkAuthEnabled: authEnabled,
    clerkPublishableKey: publishableKey,
}

await writeFile(
    resolve(process.cwd(), 'public/runtime-config.js'),
    `globalThis.__BOARD_VAULT_RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};\n`,
)
