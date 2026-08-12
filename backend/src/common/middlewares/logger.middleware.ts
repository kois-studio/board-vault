import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly LOGGER = new Logger(this.constructor.name)

    use(req: Request, res: Response, next: NextFunction) {
        this.LOGGER.verbose(`${req.method} ${req.originalUrl}`)
        this.LOGGER.debug(`Authorization header present: ${Boolean(req.headers['authorization'])}`)
        next()
    }
}
