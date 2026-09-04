import { verifyToken } from '@clerk/backend'
import { Injectable, type NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ClerkIdentityService } from '../../modules/common/auth/clerk-identity.service'

import type { NextFunction, Request, Response } from 'express'

type AuthenticatedRequest = Request & {
    user?: {
        userId: number
        email: string
        isAdmin: boolean
        clerkUserId: string
        authProvider: 'clerk'
    }
}

/**
 * Resolves Clerk sessions before the existing JWT guard runs.
 *
 * The application keeps JwtAuthGuard as the compatibility boundary during
 * rollout. This middleware lets that guard accept an already-resolved Clerk
 * identity without weakening the legacy Passport strategy.
 */
@Injectable()
export class ClerkSessionMiddleware implements NestMiddleware {
    constructor(
        private readonly configService: ConfigService,
        private readonly clerkIdentityService: ClerkIdentityService,
    ) {}

    async use(request: AuthenticatedRequest, _response: Response, next: NextFunction): Promise<void> {
        if (request.path.startsWith('/auth') || request.user || !request.headers.authorization?.startsWith('Bearer ')) {
            next()
            return
        }

        const token = request.headers.authorization.slice('Bearer '.length).trim()
        const secretKey = this.configService.get<string>('CLERK_SECRET_KEY')

        if (!token || !secretKey) {
            next()
            return
        }

        try {
            const verification = await verifyToken(token, {
                secretKey,
                ...(this.getAuthorizedParties().length ? { authorizedParties: this.getAuthorizedParties() } : {}),
            })

            if (verification.sub) {
                const account = await this.clerkIdentityService.resolveAccount(verification.sub)

                request.user = {
                    userId: account.id,
                    email: account.email,
                    isAdmin: account.isAdmin,
                    clerkUserId: verification.sub,
                    authProvider: 'clerk',
                }
            }
        } catch {
            // Leave invalid or unlinked sessions untouched. A protected route's
            // guard will return the appropriate unauthorized response, while
            // legacy JWT requests continue to Passport unchanged.
        }

        next()
    }

    private getAuthorizedParties(): string[] {
        return (
            this.configService
                .get<string>('CLERK_AUTHORIZED_PARTIES')
                ?.split(',')
                .map(value => value.trim())
                .filter(Boolean) ?? []
        )
    }
}
