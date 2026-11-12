import { randomUUID } from 'node:crypto'

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'

import { structuredLog } from '../logging/structured-log.js'
import { afterResponse } from '../utils/after-response.js'

import { API_ERROR_CODES, BoardVaultHttpException } from './api-error.js'
import { ProviderTimeoutError } from './provider-timeout.js'

import type { Request, Response } from 'express'

/** What the filter needs to keep an unexpected exception as a problem report (`ProblemsService`). */
export type ProblemRecorder = {
    recordFromApi(error: unknown, request: { method: string; route?: { path?: string }; requestId?: string }): Promise<void>
}

export type ApiErrorResponse = {
    statusCode: number
    code: string
    message: string
    details?: Array<string>
    requestId: string
}

/**
 * Keep error responses predictable for the Angular client and safe to expose
 * at the edge. Validation details remain useful, while arbitrary exception
 * objects, SQL, provider responses, and stack traces never cross the HTTP
 * boundary.
 */
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger(ApiErrorFilter.name)

    /** `problems` keeps unexpected exceptions as problem reports (ADR-0028); without it they are only logged. */
    constructor(private readonly problems?: ProblemRecorder) {}

    catch(caught: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp()
        const request = http.getRequest<Request>()
        const response = http.getResponse<Response>()
        const requestId = (request as Request & { requestId?: string }).requestId ?? randomUUID()
        let exception = caught

        if (caught instanceof ProviderTimeoutError) {
            this.logger.warn(
                structuredLog('provider.timeout', {
                    requestId,
                    provider: caught.provider,
                    method: request.method,
                    path: (request.originalUrl ?? request.url).split('?')[0],
                }),
            )
            exception = new BoardVaultHttpException(
                caught.provider === 'database' ? API_ERROR_CODES.DATABASE_TIMEOUT : API_ERROR_CODES.CLERK_TIMEOUT,
                HttpStatus.SERVICE_UNAVAILABLE,
                'A service the app depends on is slow to respond. Try again in a moment.',
            )
        }

        const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
        const payload = exception instanceof HttpException ? exception.getResponse() : undefined
        const normalized = this.normalizePayload(payload, statusCode)

        if (!(exception instanceof HttpException)) {
            this.logger.error(
                structuredLog('http.request.failed', {
                    requestId,
                    method: request.method,
                    path: (request.originalUrl ?? request.url).split('?')[0],
                    statusCode,
                }),
            )
            // After the answer on Vercel; recordFromApi catches and logs its own failure.
            const problems = this.problems

            if (problems)
                void afterResponse(() =>
                    problems.recordFromApi(caught, {
                        method: request.method,
                        route: (request as Request & { route?: { path?: string } }).route,
                        requestId,
                    }),
                )
        }

        // An error answer is never kept by a browser, even on a route that lets it keep its answers (#254).
        response.removeHeader('Cache-Control')
        response.setHeader('X-Request-Id', requestId)
        response.status(statusCode).json({
            statusCode,
            code: normalized.code,
            message: normalized.message,
            ...(normalized.details ? { details: normalized.details } : {}),
            requestId,
        } satisfies ApiErrorResponse)
    }

    private normalizePayload(
        payload: string | object | undefined,
        statusCode: number,
    ): {
        code: string
        message: string
        details?: Array<string>
    } {
        const defaultCode = HttpStatus[statusCode] ?? 'HTTP_ERROR'

        if (typeof payload === 'string') {
            if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
                return { code: defaultCode, message: 'Request failed' }
            }
            return { code: defaultCode, message: payload }
        }

        if (!payload || typeof payload !== 'object') {
            return { code: defaultCode, message: 'Request failed' }
        }

        const candidate = payload as { code?: unknown; error?: unknown; message?: unknown }
        const explicitCode = typeof candidate.code === 'string' && /^[A-Z][A-Z0-9_]+$/.test(candidate.code) ? candidate.code : undefined

        if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            return explicitCode
                ? {
                      code: explicitCode,
                      message: typeof candidate.message === 'string' && candidate.message.length > 0 ? candidate.message : 'Request failed',
                  }
                : { code: defaultCode, message: 'Request failed' }
        }

        const details = Array.isArray(candidate.message)
            ? candidate.message.filter((item): item is string => typeof item === 'string' && item.length > 0)
            : undefined
        const message =
            details && details.length > 0
                ? statusCode === HttpStatus.BAD_REQUEST
                    ? 'Request validation failed'
                    : (details[0] ?? 'Request failed')
                : typeof candidate.message === 'string' && candidate.message.length > 0
                  ? candidate.message
                  : 'Request failed'
        const code =
            explicitCode ??
            (typeof candidate.error === 'string' && candidate.error.length > 0
                ? candidate.error.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()
                : defaultCode)

        return { code, message, ...(details && details.length > 0 ? { details } : {}) }
    }
}
