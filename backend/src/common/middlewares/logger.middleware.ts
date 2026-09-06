import { randomUUID } from 'node:crypto'

import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

import { structuredLog } from '../logging/structured-log'

type RequestWithCorrelationId = Request & { requestId?: string }

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly LOGGER = new Logger(this.constructor.name)

    use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
        const requestId = randomUUID()
        const startedAt = Date.now()

        req.requestId = requestId
        res.setHeader('X-Request-Id', requestId)
        const path = req.path || req.originalUrl.split('?')[0]

        this.LOGGER.log(
            structuredLog('http.request.started', {
                requestId,
                method: req.method,
                path,
                hasAuthorization: Boolean(req.headers.authorization),
            }),
        )
        res.once('finish', () => {
            this.LOGGER.log(
                structuredLog('http.request.completed', {
                    requestId,
                    method: req.method,
                    path,
                    statusCode: res.statusCode,
                    durationMs: Date.now() - startedAt,
                }),
            )
        })
        next()
    }
}
