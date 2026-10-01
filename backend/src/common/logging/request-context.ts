import { AsyncLocalStorage } from 'node:async_hooks'

/** The request a log line belongs to, set by LoggerMiddleware. */
export const requestContext = new AsyncLocalStorage<{ requestId: string }>()
