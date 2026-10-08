import { Injectable, Logger } from '@nestjs/common'

import { DatabaseService } from '../database/database.service.js'

import type { ClerkFieldSync, ClerkSyncResultDto } from '../../../common/types/auth.type.js'

/** What Board Vault copies from a Clerk user: the username and the primary email (ADR-0017). */
export type ClerkProfile = {
    clerkUserId: string
    username: string | null
    primaryEmail: string | null
    primaryEmailVerified: boolean
}

/**
 * Copies a Clerk user's username and primary email to its linked account. The `user.updated`
 * webhook and `POST /auth/sync-from-clerk` both run it, so a change lands the same way whichever
 * arrives first; running it twice changes nothing. A value another account already has is not
 * taken. Log lines carry no identifiers (see scripts/check-log-boundary.mjs).
 */
@Injectable()
export class ClerkAccountSyncService {
    private readonly logger = new Logger(ClerkAccountSyncService.name)

    constructor(private readonly databaseService: DatabaseService) {}

    /** Null when the Clerk user has no active linked account. */
    async apply(profile: ClerkProfile): Promise<ClerkSyncResultDto | null> {
        const account = await this.findLinkedAccount(profile.clerkUserId)

        if (!account) return null

        return {
            email: await this.syncPrimaryEmail(profile, account),
            username: await this.syncUsername(profile, account),
        }
    }

    private async syncPrimaryEmail(profile: ClerkProfile, account: LinkedAccount): Promise<ClerkFieldSync> {
        const email = profile.primaryEmail

        if (!email || !profile.primaryEmailVerified || email === account.email) return 'unchanged'

        const owner = (await this.databaseService.accounts.getUserByEmail(email)).rows[0]

        if (owner && Number(owner.id) !== account.id) {
            this.logger.warn('A Clerk primary email change was not synced: the email belongs to another account')
            return 'taken'
        }

        await this.databaseService.accounts.updateUserEmail(account.id, email)
        this.logger.log('Synced a primary email change from Clerk')
        return 'updated'
    }

    private async syncUsername(profile: ClerkProfile, account: LinkedAccount): Promise<ClerkFieldSync> {
        const username = profile.username

        if (!username || username === account.username) return 'unchanged'

        const owner = (await this.databaseService.accounts.getUserByUsername(username)).rows[0]

        if (owner && Number(owner.id) !== account.id) {
            this.logger.warn('A Clerk username change was not synced: the username belongs to another account')
            return 'taken'
        }

        await this.databaseService.accounts.updateUsername(account.id, username)
        this.logger.log('Synced a username change from Clerk')
        return 'updated'
    }

    /** The active account linked to a Clerk user, or null when there is none or it is already deleted. */
    private async findLinkedAccount(clerkUserId: string): Promise<LinkedAccount | null> {
        const row = (await this.databaseService.accounts.getUserByClerkId(clerkUserId)).rows[0]

        if (!row || Boolean(row.isDeleted)) return null

        return { id: Number(row.id), email: String(row.email), username: String(row.username) }
    }
}

type LinkedAccount = { id: number; email: string; username: string }
