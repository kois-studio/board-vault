type BoardVaultRuntimeConfig = {
    clerkAuthEnabled?: boolean
    clerkPublishableKey?: string
    selfRegistrationEnabled?: boolean
}

const runtimeConfig = (globalThis as { __BOARD_VAULT_RUNTIME_CONFIG__?: BoardVaultRuntimeConfig }).__BOARD_VAULT_RUNTIME_CONFIG__

export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000',
    clerkPublishableKey: runtimeConfig?.clerkPublishableKey ?? '',
    clerkAuthEnabled: runtimeConfig?.clerkAuthEnabled === true,
    selfRegistrationEnabled: runtimeConfig?.selfRegistrationEnabled === true,
}
