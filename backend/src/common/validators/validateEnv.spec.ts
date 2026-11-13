import { Logger } from '@nestjs/common'

import { validateEnv } from './validateEnv.js'

describe('validateEnv and CLERK_JWT_KEY (#250)', () => {
    const saved = { ...process.env }
    let exit: ReturnType<typeof vi.spyOn>
    let logged: Array<string>

    beforeEach(() => {
        process.env = {
            ...saved,
            NODE_ENV: 'test',
            TURSO_DATABASE_URL: 'file:local.sqlite',
            CLERK_SECRET_KEY: 'sk_test_example',
            UPSTASH_REDIS_REST_DISABLE: 'true',
        }
        delete process.env.CLERK_JWT_KEY
        logged = []
        exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
        vi.spyOn(Logger.prototype, 'error').mockImplementation(message => void logged.push(String(message)))
    })

    afterEach(() => {
        process.env = saved
        vi.restoreAllMocks()
    })

    it('starts without a key: tokens are checked against the keys Clerk publishes', () => {
        validateEnv()

        expect(exit).not.toHaveBeenCalled()
    })

    it('starts with a PEM public key, on one line or several', () => {
        process.env.CLERK_JWT_KEY = '-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\\n-----END PUBLIC KEY-----'
        validateEnv()

        expect(exit).not.toHaveBeenCalled()
    })

    it('refuses to start with something else, which would answer 401 to everyone', () => {
        process.env.CLERK_JWT_KEY = 'sk_test_example'
        validateEnv()

        expect(exit).toHaveBeenCalledWith(1)
        expect(logged).toContain('Invalid in .env file: CLERK_JWT_KEY')
        // The value itself is never logged.
        expect(logged.join('\n')).not.toContain('sk_test_example')
    })
})

describe('validateEnv and RATE_LIMIT_KEY_SECRET (#321)', () => {
    const saved = { ...process.env }
    let exit: ReturnType<typeof vi.spyOn>
    let logged: Array<string>

    beforeEach(() => {
        process.env = {
            ...saved,
            NODE_ENV: 'production',
            TURSO_DATABASE_URL: 'file:local.sqlite',
            CLERK_SECRET_KEY: 'sk_test_example',
            CLERK_AUTHORIZED_PARTIES: 'https://board-vault.com',
            USAGE_PSEUDONYM_SECRET: 'usage-secret',
            CRON_SECRET: 'cron-secret',
            RATE_LIMIT_KEY_SECRET: 'rate-limit-secret',
            UPSTASH_REDIS_REST_DISABLE: 'true',
        }
        delete process.env.CLERK_JWT_KEY
        logged = []
        exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
        vi.spyOn(Logger.prototype, 'error').mockImplementation(message => void logged.push(String(message)))
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    })

    afterEach(() => {
        process.env = saved
        vi.restoreAllMocks()
    })

    it('starts in production with the secret set', () => {
        validateEnv()

        expect(exit).not.toHaveBeenCalled()
    })

    it('refuses to start in production without it', () => {
        delete process.env.RATE_LIMIT_KEY_SECRET
        validateEnv()

        expect(exit).toHaveBeenCalledWith(1)
        expect(logged).toContain('Missing in production environment: RATE_LIMIT_KEY_SECRET')
    })

    it('is optional outside production', () => {
        process.env.NODE_ENV = 'development'
        delete process.env.RATE_LIMIT_KEY_SECRET
        validateEnv()

        expect(exit).not.toHaveBeenCalled()
    })
})
