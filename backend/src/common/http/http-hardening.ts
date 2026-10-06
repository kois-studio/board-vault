import { json, raw, urlencoded, type NextFunction, type Request, type RequestHandler, type Response } from 'express'

export const REQUEST_BODY_LIMIT = '100kb'
/** An admin's artwork upload; Vercel refuses request bodies above 4.5 MB anyway. */
export const ARTWORK_UPLOAD_LIMIT = '4mb'
const ARTWORK_UPLOAD_ROUTE = /^\/admin\/games\/\d+\/artwork(?:\?|$)/

/** A request whose exact body bytes were kept for signature checks (webhook routes only). */
export type RawBodyRequest = Request & { rawBody?: Buffer }

// Webhook signatures cover the exact bytes received, so keep them for those routes.
function keepWebhookRawBody(request: RawBodyRequest, _response: Response, buffer: Buffer): void {
    if (request.originalUrl?.startsWith('/webhooks/')) {
        request.rawBody = buffer
    }
}

export function createBodyParsers(): Array<RequestHandler> {
    return [
        json({ limit: REQUEST_BODY_LIMIT, verify: keepWebhookRawBody }),
        urlencoded({ extended: false, limit: REQUEST_BODY_LIMIT }),
        // Image bytes, only on the artwork upload route; everywhere else an image body stays unread.
        raw({
            limit: ARTWORK_UPLOAD_LIMIT,
            type: request => ARTWORK_UPLOAD_ROUTE.test(request.url ?? '') && String(request.headers['content-type']).startsWith('image/'),
        }),
    ]
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
