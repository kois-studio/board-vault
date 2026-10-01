import { verifyToken } from '@clerk/backend'

import { PROVIDER_TIMEOUT_MS, ProviderTimeoutError } from '../../../common/http/provider-timeout'

import { ClerkTokenVerifier } from './clerk-token-verifier'

jest.mock('@clerk/backend', () => ({
    verifyToken: jest.fn(),
}))

describe('ClerkTokenVerifier', () => {
    const mockedVerifyToken = jest.mocked(verifyToken)
    const verifierWith = (config: Record<string, string | undefined>) =>
        new ClerkTokenVerifier({ get: (key: string) => config[key] } as never)

    beforeEach(() => {
        mockedVerifyToken.mockReset()
    })

    it('returns the Clerk subject and enforces the authorized parties', async () => {
        mockedVerifyToken.mockResolvedValue({ sub: 'user_clerk_123' } as never)
        const verifier = verifierWith({
            CLERK_SECRET_KEY: 'sk_test_example',
            CLERK_AUTHORIZED_PARTIES: 'https://board-vault.com, http://localhost:4300',
        })

        await expect(verifier.verify('clerk-token')).resolves.toBe('user_clerk_123')
        expect(mockedVerifyToken).toHaveBeenCalledWith('clerk-token', {
            secretKey: 'sk_test_example',
            authorizedParties: ['https://board-vault.com', 'http://localhost:4300'],
        })
    })

    it('rejects tokens that fail verification', async () => {
        mockedVerifyToken.mockRejectedValue(new Error('expired'))

        await expect(verifierWith({ CLERK_SECRET_KEY: 'sk_test_example' }).verify('expired-token')).resolves.toBeNull()
    })

    it('reports a Clerk timeout instead of treating the token as invalid', async () => {
        jest.useFakeTimers()
        mockedVerifyToken.mockReturnValue(new Promise(() => {}))

        try {
            const verification = verifierWith({ CLERK_SECRET_KEY: 'sk_test_example' }).verify('clerk-token')
            const assertion = expect(verification).rejects.toBeInstanceOf(ProviderTimeoutError)

            await jest.advanceTimersByTimeAsync(PROVIDER_TIMEOUT_MS.clerk)
            await assertion
        } finally {
            jest.useRealTimers()
        }
    })

    it('rejects every token when Clerk is not configured', async () => {
        await expect(verifierWith({}).verify('clerk-token')).resolves.toBeNull()
        expect(mockedVerifyToken).not.toHaveBeenCalled()
    })
})
