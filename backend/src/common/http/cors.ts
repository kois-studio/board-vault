const PRODUCTION_CORS_ORIGINS = ['https://board-vault.com']
const DEVELOPMENT_CORS_ORIGINS = [...PRODUCTION_CORS_ORIGINS, 'http://localhost:4200', 'http://127.0.0.1:4200']

export function getCorsOrigins(nodeEnvironment = process.env.NODE_ENV, configuredOrigins = process.env.CORS_ORIGINS): string[] {
    const defaultOrigins = nodeEnvironment === 'production' ? PRODUCTION_CORS_ORIGINS : DEVELOPMENT_CORS_ORIGINS
    const additions = configuredOrigins
        ?.split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0 && origin !== '*')

    return [...new Set([...defaultOrigins, ...(additions ?? [])])]
}
