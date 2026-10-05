import { verifyToken } from '@clerk/backend'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ProviderTimeoutError, withTimeout } from '../../../common/http/provider-timeout.js'

/**
 * Verifies Clerk session tokens. Tests replace this provider with a fake
 * through Nest's `overrideProvider`; there is no runtime bypass.
 */
@Injectable()
export class ClerkTokenVerifier {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Returns the Clerk user id of a valid session token, or null. A Clerk
     * timeout is rethrown: answering 401 would sign the user out of the app.
     */
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
            const verification = await withTimeout(
                verifyToken(token, {
                    secretKey,
                    ...(authorizedParties.length ? { authorizedParties } : {}),
                }),
                'clerk',
            )

            return verification?.sub || null
        } catch (error) {
            if (error instanceof ProviderTimeoutError) {
                throw error
            }

            return null
        }
    }
}
