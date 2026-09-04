type BoardVaultRuntimeConfig = {
    clerkAuthEnabled?: boolean
    clerkPublishableKey?: string
    selfRegistrationEnabled?: boolean
}

const runtimeConfig = (globalThis as { __BOARD_VAULT_RUNTIME_CONFIG__?: BoardVaultRuntimeConfig }).__BOARD_VAULT_RUNTIME_CONFIG__

export const environment = {
    production: true,
    apiUrl: 'https://backend.board-vault.com',
    clerkPublishableKey: runtimeConfig?.clerkPublishableKey ?? '',
    clerkAuthEnabled: runtimeConfig?.clerkAuthEnabled === true,
    selfRegistrationEnabled: runtimeConfig?.selfRegistrationEnabled === true,
}
