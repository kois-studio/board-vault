import { Injectable, Logger } from '@nestjs/common'

import { DatabaseService } from '../database/database.service'

import type { UserJSON } from '@clerk/backend'
import type { WebhookEvent } from '@clerk/backend/webhooks'

/**
 * Keeps local accounts in step with Clerk user lifecycle events (ADR-0013).
 * Handlers are idempotent because Clerk retries deliveries. Log lines carry
 * no identifiers (see scripts/check-log-boundary.mjs); the Clerk dashboard
 * keeps each delivery for tracing.
 */
@Injectable()
export class ClerkWebhookService {
    private readonly logger = new Logger(ClerkWebhookService.name)

    constructor(private readonly databaseService: DatabaseService) {}

    async handle(event: WebhookEvent): Promise<void> {
        switch (event.type) {
            case 'user.updated':
                return this.syncPrimaryEmail(event.data)
            case 'user.deleted':
                return this.softDeleteAccount(event.data.id)
            default:
                return
        }
    }

    private async syncPrimaryEmail(user: UserJSON): Promise<void> {
        const account = await this.findLinkedAccount(user.id)

        if (!account) return

        const primary = user.email_addresses.find(emailAddress => emailAddress.id === user.primary_email_address_id)

        if (!primary || primary.verification?.status !== 'verified' || primary.email_address === account.email) return

        const owner = (await this.databaseService.accounts.getUserByEmail(primary.email_address)).rows[0]

        if (owner && Number(owner.id) !== account.id) {
            this.logger.warn('A Clerk primary email change was not synced: the email belongs to another account')
            return
        }

        await this.databaseService.accounts.updateUserEmail(account.id, primary.email_address)
        this.logger.log('Synced a primary email change from Clerk')
    }

    private async softDeleteAccount(clerkUserId: string | undefined): Promise<void> {
        if (!clerkUserId) return

        const account = await this.findLinkedAccount(clerkUserId)

        if (!account) return

        await this.databaseService.accounts.softDeleteUserById(account.id)
        this.logger.log('Soft-deleted an account whose Clerk user was deleted')
    }

    /** The active account linked to a Clerk user, or null when there is none or it is already deleted. */
    private async findLinkedAccount(clerkUserId: string): Promise<{ id: number; email: string } | null> {
        const row = (await this.databaseService.accounts.getUserByClerkId(clerkUserId)).rows[0]

        if (!row || Boolean(row.isDeleted)) return null

        return { id: Number(row.id), email: String(row.email) }
    }
}
