import { Injectable, Logger } from '@nestjs/common'

import { DatabaseService } from '../database/database.service.js'

import { AccountDeletionService } from './account-deletion.service.js'

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
    private readonly logger = new Logger(ClerkWebhookService.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly accountDeletionService: AccountDeletionService,
    ) {}

    async handle(event: WebhookEvent): Promise<void> {
        switch (event.type) {
            case 'user.updated':
                return this.syncUser(event.data)
            case 'user.deleted':
                return event.data.id ? this.accountDeletionService.deleteAccountForClerkUser(event.data.id) : undefined
            default:
                return
        }
    }

    /** Clerk owns the email and the username (ADR-0017); the account keeps a copy of each. */
    private async syncUser(user: UserJSON): Promise<void> {
        const account = await this.findLinkedAccount(user.id)

        if (!account) return

        await this.syncPrimaryEmail(user, account)
        await this.syncUsername(user, account)
    }

    private async syncPrimaryEmail(user: UserJSON, account: LinkedAccount): Promise<void> {
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

    private async syncUsername(user: UserJSON, account: LinkedAccount): Promise<void> {
        if (!user.username || user.username === account.username) return

        const owner = (await this.databaseService.accounts.getUserByUsername(user.username)).rows[0]

        if (owner && Number(owner.id) !== account.id) {
            this.logger.warn('A Clerk username change was not synced: the username belongs to another account')
            return
        }

        await this.databaseService.accounts.updateUsername(account.id, user.username)
        this.logger.log('Synced a username change from Clerk')
    }

    /** The active account linked to a Clerk user, or null when there is none or it is already deleted. */
    private async findLinkedAccount(clerkUserId: string): Promise<LinkedAccount | null> {
        const row = (await this.databaseService.accounts.getUserByClerkId(clerkUserId)).rows[0]

        if (!row || Boolean(row.isDeleted)) return null

        return { id: Number(row.id), email: String(row.email), username: String(row.username) }
    }
}

type LinkedAccount = { id: number; email: string; username: string }
