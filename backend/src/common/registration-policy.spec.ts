import { ForbiddenException } from '@nestjs/common'

import { API_ERROR_CODES } from './http/api-error'
import { assertSelfRegistrationEnabled, isSelfRegistrationEnabled } from './registration-policy'

describe('registration policy', () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalSetting = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

    afterEach(() => {
        if (originalNodeEnv === undefined) delete process.env.NODE_ENV
        else process.env.NODE_ENV = originalNodeEnv

        if (originalSetting === undefined) delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
        else process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = originalSetting
    })

    it('keeps production self-registration closed unless explicitly enabled', () => {
        process.env.NODE_ENV = 'production'
        delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        expect(isSelfRegistrationEnabled()).toBe(false)
        expect(() => assertSelfRegistrationEnabled()).toThrow(ForbiddenException)
    })

    it('preserves local development and test flows by default', () => {
        for (const nodeEnv of ['development', 'test']) {
            process.env.NODE_ENV = nodeEnv
            delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

            expect(isSelfRegistrationEnabled()).toBe(true)
        }
    })

    it('lets operators explicitly close or open the policy', () => {
        process.env.NODE_ENV = 'development'
        process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = 'false'
        expect(isSelfRegistrationEnabled()).toBe(false)

        process.env.NODE_ENV = 'production'
        process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = 'true'
        expect(isSelfRegistrationEnabled()).toBe(true)
        expect(() => assertSelfRegistrationEnabled()).not.toThrow()
    })

    it('returns the stable private-beta error code when closed', () => {
        process.env.NODE_ENV = 'production'
        delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        try {
            assertSelfRegistrationEnabled()
            expect.unreachable('Expected registration to be rejected')
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenException)
            expect((error as ForbiddenException).getResponse()).toEqual(
                expect.objectContaining({ code: API_ERROR_CODES.PRIVATE_BETA_REGISTRATION_CLOSED }),
            )
        }
    })
})
