import { Injectable, type NestMiddleware } from '@nestjs/common'

import { localeFromAcceptLanguage } from '../i18n/locale.js'

import type { Locale } from '../i18n/locale.js'
import type { NextFunction, Request, Response } from 'express'

export type LocalizedRequest = Request & { locale?: Locale }

/** Sets `request.locale` from `Accept-Language` (ADR-0024): the reader's interface language. */
@Injectable()
export class LocaleMiddleware implements NestMiddleware {
    use(request: LocalizedRequest, _response: Response, next: NextFunction): void {
        request.locale = localeFromAcceptLanguage(request.headers['accept-language'])
        next()
    }
}
