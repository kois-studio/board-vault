import { createSign, generateKeyPairSync } from 'node:crypto'

import { ClerkTokenVerifier } from './clerk-token-verifier.js'

/**
 * The real @clerk/backend, not a mock: with CLERK_JWT_KEY set, a session token is checked against
 * that key and nothing is fetched (#250).
 */
describe('ClerkTokenVerifier with CLERK_JWT_KEY', () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey
    const base64url = (value: string | Buffer) => Buffer.from(value).toString('base64url')

    function sessionToken(claims: Record<string, unknown>, key = privateKey): string {
        const now = Math.floor(Date.now() / 1000)
        const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'ins_test' }))
        const payload = base64url(
            JSON.stringify({
                iss: 'https://clerk.example.test',
                sub: 'user_clerk_123',
                iat: now - 5,
                nbf: now - 5,
                exp: now + 60,
                ...claims,
            }),
        )
        const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(key)

        return `${header}.${payload}.${base64url(signature)}`
    }

    const verifierWith = (config: Record<string, string>) => new ClerkTokenVerifier({ get: (key: string) => config[key] } as never)

    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no network in this test'))
    })

    afterEach(() => fetchSpy.mockRestore())

    it('accepts a token signed by the instance without asking Clerk', async () => {
        const verifier = verifierWith({ CLERK_SECRET_KEY: 'sk_test_example', CLERK_JWT_KEY: pem.trim().replace(/\n/g, '\\n') })

        await expect(verifier.verify(sessionToken({}))).resolves.toBe('user_clerk_123')
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('rejects a token signed by another key, an expired one, and one for another app', async () => {
        const now = Math.floor(Date.now() / 1000)
        const verifier = verifierWith({
            CLERK_SECRET_KEY: 'sk_test_example',
            CLERK_JWT_KEY: pem,
            CLERK_AUTHORIZED_PARTIES: 'https://board-vault.com',
        })

        await expect(verifier.verify(sessionToken({ azp: 'https://board-vault.com' }, other))).resolves.toBeNull()
        await expect(verifier.verify(sessionToken({ azp: 'https://board-vault.com', exp: now - 120 }))).resolves.toBeNull()
        await expect(verifier.verify(sessionToken({ azp: 'https://elsewhere.example' }))).resolves.toBeNull()
        await expect(verifier.verify(sessionToken({ azp: 'https://board-vault.com' }))).resolves.toBe('user_clerk_123')
        expect(fetchSpy).not.toHaveBeenCalled()
    })
})
