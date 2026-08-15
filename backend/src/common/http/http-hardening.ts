import { json, urlencoded, type NextFunction, type Request, type RequestHandler, type Response } from 'express'

export const REQUEST_BODY_LIMIT = '100kb'

export function createBodyParsers(): Array<RequestHandler> {
    return [json({ limit: REQUEST_BODY_LIMIT }), urlencoded({ extended: false, limit: REQUEST_BODY_LIMIT })]
}

export function applySecurityHeaders(
    _request: Request,
    response: Response,
    next: NextFunction,
    isProduction = process.env.NODE_ENV === 'production',
): void {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')

    if (isProduction) {
        response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    next()
}
