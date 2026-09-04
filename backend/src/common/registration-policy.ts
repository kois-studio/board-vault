import { ForbiddenException } from '@nestjs/common'

export const PRIVATE_BETA_REGISTRATION_MESSAGE = 'Board Vault is currently in private beta. Registration is by invitation only.'

/**
 * Public registration is opt-in in production. Development and test keep the
 * legacy flow available unless the variable explicitly disables it.
 */
export function isSelfRegistrationEnabled(): boolean {
    const configuredValue = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED?.trim().toLowerCase()

    if (configuredValue) {
        return configuredValue === 'true'
    }

    return process.env.NODE_ENV !== 'production'
}

export function assertSelfRegistrationEnabled(): void {
    if (!isSelfRegistrationEnabled()) {
        throw new ForbiddenException(PRIVATE_BETA_REGISTRATION_MESSAGE)
    }
}
