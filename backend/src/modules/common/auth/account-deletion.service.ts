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
        this.logger.log('Deleted an account whose Clerk user was deleted')
    }

    private async deleteAccountData(accountId: number): Promise<void> {
        await this.databaseService.accountDeletion.deleteAccount(accountId)
        // Reviews, collections, and group views of many people change at once; clearing the cache is always safe.
        await this.cacheService.deleteAll()
    }
}
