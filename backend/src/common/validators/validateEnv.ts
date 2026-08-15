import { Logger } from '@nestjs/common'

/**
 * ## Validate if environment variables are set
 *
 * @returns Array with erros if any
 */
export function validateEnv(): void {
    const logger = new Logger(validateEnv.name)
    const err = []

    if (!process.env.TURSO_DATABASE_URL) {
        err.push('Missing in .env file: TURSO_DATABASE_URL')
        err.push('Example value: "libsql://<db-name>-<username>.turso.io"\n')
    }

    if (!process.env.TURSO_AUTH_TOKEN) {
        err.push('Missing in .env file: TURSO_AUTH_TOKEN')
        err.push('Example value: "eyJfdjsbrEzr..."\n')
    }

    if (!process.env.JWT_SECRET) {
        err.push('Missing in .env file: JWT_SECRET')
        err.push('Example value: "eyJfdjsbrEzr..."\n')
    }

    const redisDisabled = process.env.UPSTASH_REDIS_REST_DISABLE === 'true'

    if (!redisDisabled) {
        if (!process.env.UPSTASH_REDIS_REST_URL) {
            err.push('Missing in .env file: UPSTASH_REDIS_REST_URL')
        }

        if (!process.env.UPSTASH_REDIS_REST_TOKEN) {
            err.push('Missing in .env file: UPSTASH_REDIS_REST_TOKEN')
        }
    }

    if (err.length > 0) {
        err.forEach(error => logger.error(error))
        process.exit(1)
    }
}
