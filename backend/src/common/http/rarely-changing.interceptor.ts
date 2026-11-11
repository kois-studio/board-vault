import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { tap } from 'rxjs'

import type { Response } from 'express'
import type { Observable } from 'rxjs'

/**
 * The reader's browser may reuse the answer for five minutes. For a day after that it may still show
 * it once more while it fetches a fresh one in the background, so a change can take a load to show. `private`: only the browser keeps it, never a shared cache.
 */
export const RARELY_CHANGING_CACHE = 'private, max-age=300, stale-while-revalidate=86400'

/**
 * Lets the browser keep a successful answer that changes rarely and is the same for every reader
 * (#254). Only for routes whose answer depends on nothing but the URL and the reader's language,
 * never on who asks: the browser keeps it whoever signs in next. An error answer is never kept:
 * the header is set only once the handler has succeeded, and ApiErrorFilter removes it.
 *
 * Used by `GET /collection/tags`. docs/api.md lists the routes.
 */
@Injectable()
export class RarelyChangingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const response = context.switchToHttp().getResponse<Response>()

        return next.handle().pipe(
            tap(() => {
                response.setHeader('Cache-Control', RARELY_CHANGING_CACHE)
                // The answer is in the reader's language (ADR-0024). Appended, so CORS's `Vary: Origin` stays.
                response.vary('Accept-Language')
            }),
        )
    }
}
