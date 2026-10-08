import { Injectable, Logger } from '@nestjs/common'

import { CacheService } from '../cache/cache.service.js'
import { DatabaseService } from '../database/database.service.js'

import { ClerkIdentityService } from './clerk-identity.service.js'

/**
 * Account deletion (ADR-0018). Board Vault cleans up first, in one
 * transaction, and then removes the Clerk user. A deletion that starts in
 * Clerk (an operator in the Dashboard) reaches the same state through the
 * `user.deleted` webhook. Log lines carry no identifiers.
 */
@Injectable()
export class AccountDeletionService {
    private readonly logger = new Logger(AccountDeletionService.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly clerkIdentityService: ClerkIdentityService,
    ) {}

    /** The signed-in person deletes their own account. */
    async deleteOwnAccount(accountId: number, clerkUserId: string): Promise<void> {
        await this.deleteAccountData(accountId)
        await this.revokeSentInvitations(accountId)

        try {
            await this.clerkIdentityService.deleteClerkUser(clerkUserId)
        } catch {
            // The account is already gone for Board Vault: its sign-in is refused (isDeleted). An operator removes the Clerk user.
            this.logger.error('Deleted an account, but its Clerk user could not be removed; remove it from the Clerk Dashboard')
            return
        }

        this.logger.log('Deleted an account and its Clerk user')
    }

    /** Clerk deleted the user: run the same clean-up. Safe to repeat. */
    async deleteAccountForClerkUser(clerkUserId: string): Promise<void> {
        const row = (await this.databaseService.accounts.getUserByClerkId(clerkUserId)).rows[0]

        if (!row || Boolean(row.isDeleted)) return

        await this.deleteAccountData(Number(row.id))
        await this.revokeSentInvitations(Number(row.id))
        this.logger.log('Deleted an account whose Clerk user was deleted')
    }

    /**
     * Invitations sent go with the account (ADR-0018). Board Vault's own are deleted in the
     * transaction; Clerk's are revoked here, so their links stop working instead of opening an
     * account that the group no longer takes in. The deletion stands even if Clerk fails.
     */
    private async revokeSentInvitations(accountId: number): Promise<void> {
        try {
            const { failed } = await this.clerkIdentityService.revokeInvitationsFrom(accountId)

            if (failed > 0) this.logger.warn('Deleted an account, but some of its group invitations could not be revoked in Clerk')
        } catch {
            this.logger.warn('Deleted an account, but its group invitations could not be read from Clerk to revoke them')
        }
    }

    private async deleteAccountData(accountId: number): Promise<void> {
        await this.databaseService.accountDeletion.deleteAccount(accountId)
        // Reviews, collections, and group views of many people change at once; clearing the cache is always safe.
        // Rate limits are not cache: they stay, or every deletion would reset everyone's limits.
        const cleared = await this.cacheService.deleteCachedData()

        if (!cleared && this.cacheService.isEnabled()) {
            this.logger.warn('Deleted an account, but the cache could not be cleared; cached views expire on their own within a day')
        }
    }
}
