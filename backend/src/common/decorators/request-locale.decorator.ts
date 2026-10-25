import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

import { DEFAULT_LOCALE } from '../i18n/locale.js'

import type { Locale } from '../i18n/locale.js'
import type { LocalizedRequest } from '../middlewares/locale.middleware.js'

/** The reader's interface language, set by LocaleMiddleware. */
export const RequestLocale = createParamDecorator(
    (_data: unknown, context: ExecutionContext): Locale => context.switchToHttp().getRequest<LocalizedRequest>().locale ?? DEFAULT_LOCALE,
)
