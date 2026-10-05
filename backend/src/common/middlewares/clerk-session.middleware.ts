import { Injectable, type NestMiddleware } from '@nestjs/common'

import { ClerkIdentityService } from '../../modules/common/auth/clerk-identity.service.js'
import { ClerkTokenVerifier } from '../../modules/common/auth/clerk-token-verifier.js'

import type { AuthenticatedUser } from '../types/auth.type.js'
import type { NextFunction, Request, Response } from 'express'

export type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser
    authError?: unknown
}

/**
 * Authenticates every request that carries a Clerk session token and attaches
 * the local account as `request.user`. AuthGuard enforces it on protected
 * routes. Account resolution errors are kept on the request so the guard can
 * report them (for example 409, 502, or a 503 timeout) instead of a generic 401.
 */
@Injectable()
export class ClerkSessionMiddleware implements NestMiddleware {
    constructor(
        private readonly tokenVerifier: ClerkTokenVerifier,
        private readonly clerkIdentityService: ClerkIdentityService,
    ) {}

    async use(request: AuthenticatedRequest, _response: Response, next: NextFunction): Promise<void> {
        const token = request.headers.authorization?.startsWith('Bearer ')
            ? request.headers.authorization.slice('Bearer '.length).trim()
            : ''

        if (request.user || !token) {
            next()
            return
        }

        try {
            const clerkUserId = await this.tokenVerifier.verify(token)

            if (clerkUserId) {
                const account = await this.clerkIdentityService.resolveAccount(clerkUserId)

                request.user = {
                    userId: account.id,
                    email: account.email,
                    isAdmin: account.isAdmin,
                    clerkUserId,
                }
            }
        } catch (error) {
            request.authError = error
        }

        next()
    }
}
