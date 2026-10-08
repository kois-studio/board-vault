import { Injectable } from '@nestjs/common'

import { AccountDeletionService } from './account-deletion.service.js'
import { ClerkAccountSyncService } from './clerk-account-sync.service.js'

import type { UserJSON } from '@clerk/backend'
import type { WebhookEvent } from '@clerk/backend/webhooks'

/**
 * Keeps local accounts in step with Clerk user lifecycle events (ADR-0013, ADR-0017).
 * Handlers are idempotent because Clerk retries deliveries. Log lines carry
 * no identifiers (see scripts/check-log-boundary.mjs); the Clerk dashboard
 * keeps each delivery for tracing.
 */
@Injectable()
export class ClerkWebhookService {
    constructor(
        private readonly clerkAccountSyncService: ClerkAccountSyncService,
        private readonly accountDeletionService: AccountDeletionService,
    ) {}

    async handle(event: WebhookEvent): Promise<void> {
        switch (event.type) {
            case 'user.updated':
                await this.syncUser(event.data)
                return
            case 'user.deleted':
                return event.data.id ? this.accountDeletionService.deleteAccountForClerkUser(event.data.id) : undefined
            default:
                return
        }
    }

    /** Clerk owns the email and the username (ADR-0017); the account keeps a copy of each. */
    private async syncUser(user: UserJSON): Promise<void> {
        const primary = user.email_addresses.find(emailAddress => emailAddress.id === user.primary_email_address_id)

        await this.clerkAccountSyncService.apply({
            clerkUserId: user.id,
            username: user.username,
            primaryEmail: primary?.email_address ?? null,
            primaryEmailVerified: primary?.verification?.status === 'verified',
        })
    }
}
