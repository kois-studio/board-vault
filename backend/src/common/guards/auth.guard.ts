import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

import type { AuthenticatedRequest } from '../middlewares/clerk-session.middleware'

/**
 * Requires the Clerk-authenticated account that ClerkSessionMiddleware
 * attached to the request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

        if (request.user) {
            return true
        }

        if (request.authError) {
            throw request.authError
        }

        throw new UnauthorizedException('A valid session is required')
    }
}
