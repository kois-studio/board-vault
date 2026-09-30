import { verifyToken } from '@clerk/backend'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * Verifies Clerk session tokens. Tests replace this provider with a fake
 * through Nest's `overrideProvider`; there is no runtime bypass.
 */
@Injectable()
export class ClerkTokenVerifier {
    constructor(private readonly configService: ConfigService) {}

    /** Returns the Clerk user id of a valid session token, or null. */
    async verify(token: string): Promise<string | null> {
        const secretKey = this.configService.get<string>('CLERK_SECRET_KEY')

        if (!secretKey) {
            return null
        }

        const authorizedParties =
            this.configService
                .get<string>('CLERK_AUTHORIZED_PARTIES')
                ?.split(',')
                .map(value => value.trim())
                .filter(Boolean) ?? []

        try {
            const verification = await verifyToken(token, {
                secretKey,
                ...(authorizedParties.length ? { authorizedParties } : {}),
            })

            return verification?.sub || null
        } catch {
            return null
        }
    }
}
