type BoardVaultRuntimeConfig = {
    clerkPublishableKey?: string
    selfRegistrationEnabled?: boolean
    previewLocales?: boolean
}

const runtimeConfig = (globalThis as { __BOARD_VAULT_RUNTIME_CONFIG__?: BoardVaultRuntimeConfig }).__BOARD_VAULT_RUNTIME_CONFIG__

export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000',
    clerkPublishableKey: runtimeConfig?.clerkPublishableKey ?? '',
    selfRegistrationEnabled: runtimeConfig?.selfRegistrationEnabled === true,
    /** Every supported language in the language menu, not only the offered ones (ADR-0024): everywhere but production. */
    previewLocales: runtimeConfig?.previewLocales === true,
}
