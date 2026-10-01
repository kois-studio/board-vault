import { randomUUID } from 'node:crypto'

import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { Response, NextFunction } from 'express'

import { requestContext } from '../logging/request-context'
import { structuredLog } from '../logging/structured-log'

import type { AuthenticatedRequest } from './clerk-session.middleware'

type RequestWithCorrelationId = AuthenticatedRequest & { requestId?: string }

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly LOGGER = new Logger(this.constructor.name)

    use(req: RequestWithCorrelationId, res: Response, next: NextFunction) {
        const requestId = randomUUID()
        const startedAt = Date.now()

        req.requestId = requestId
        res.setHeader('X-Request-Id', requestId)
        const path = req.originalUrl.split('?')[0] || req.url.split('?')[0]

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
                    // The route template (`/groups/:groupId`) groups requests in log search.
                    route: (req.route as { path?: string } | undefined)?.path,
                    statusCode: res.statusCode,
                    durationMs: Date.now() - startedAt,
                    accountId: req.user?.userId,
                }),
            )
        })
        // Every log line written while handling this request carries its id.
        requestContext.run({ requestId }, next)
    }
}
