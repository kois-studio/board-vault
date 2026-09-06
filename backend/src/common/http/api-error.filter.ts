import { randomUUID } from 'node:crypto'

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'

import { structuredLog } from '../logging/structured-log'

import type { Request, Response } from 'express'

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

    catch(exception: unknown, host: ArgumentsHost): void {
        const http = host.switchToHttp()
        const request = http.getRequest<Request>()
        const response = http.getResponse<Response>()
        const requestId = (request as Request & { requestId?: string }).requestId ?? randomUUID()
        const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
        const payload = exception instanceof HttpException ? exception.getResponse() : undefined
        const normalized = this.normalizePayload(payload, statusCode)

        if (!(exception instanceof HttpException)) {
            this.logger.error(
                structuredLog('http.request.failed', {
                    requestId,
                    method: request.method,
                    path: request.path || (request.originalUrl ?? request.url).split('?')[0],
                    statusCode,
                }),
            )
        }

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

        if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
            return { code: defaultCode, message: 'Request failed' }
        }

        if (typeof payload === 'string') {
            return { code: defaultCode, message: payload }
        }

        if (!payload || typeof payload !== 'object') {
            return { code: defaultCode, message: 'Request failed' }
        }

        const candidate = payload as { error?: unknown; message?: unknown }
        const details = Array.isArray(candidate.message)
            ? candidate.message.filter((item): item is string => typeof item === 'string' && item.length > 0)
            : undefined
        const message =
            details && details.length > 0
                ? statusCode === HttpStatus.BAD_REQUEST
                    ? 'Request validation failed'
                    : details[0]
                : typeof candidate.message === 'string' && candidate.message.length > 0
                  ? candidate.message
                  : 'Request failed'
        const code =
            typeof candidate.error === 'string' && candidate.error.length > 0
                ? candidate.error.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()
                : defaultCode

        return { code, message, ...(details && details.length > 0 ? { details } : {}) }
    }
}
