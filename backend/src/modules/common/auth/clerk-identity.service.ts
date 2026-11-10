import { createClerkClient, type User as ClerkUser } from '@clerk/backend'
import { ConflictException, Injectable, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { API_ERROR_CODES, BoardVaultHttpException } from '../../../common/http/api-error.js'
import { ProviderTimeoutError, withTimeout } from '../../../common/http/provider-timeout.js'
import { DEFAULT_LOCALE } from '../../../common/i18n/locale.js'
import { assertSelfRegistrationEnabled } from '../../../common/registration-policy.js'
import { shortName } from '../../../common/utils/display-name.js'
import { UsageService } from '../../core/usage/usage.service.js'
import { UsersService } from '../../core/users/users.service.js'

import type { ClerkProfile } from './clerk-account-sync.service.js'
import type { Locale } from '../../../common/i18n/locale.js'
import type { AvatarDto, UserGetDto } from '../../../common/types/user.type.js'

@Injectable()
export class ClerkIdentityService {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        @Optional() private readonly usageService?: UsageService,
    ) {}

    /**
     * Resolves a verified Clerk subject to its local Account row, created on first sight in the
     * language they signed up in (`locale`).
     * Every account is linked by `clerkUserId` (ADR-0012). An unlinked Clerk user gets a new
     * account only while self-registration is open; groups invite them by username afterwards
     * (#277). An email that already belongs to another account is never linked implicitly.
     */
    async resolveAccount(clerkUserId: string, locale: Locale = DEFAULT_LOCALE): Promise<UserGetDto> {
        const linkedUser = await this.findUser(() => this.usersService.getUserByClerkId(clerkUserId))

        if (linkedUser) {
            if (linkedUser.isDeleted) {
                throw new UnauthorizedException('The Board Vault account is unavailable')
            }

            return linkedUser
        }

        const clerkUser = await this.withClerkProviderBoundary(() => this.getClerkClient().users.getUser(clerkUserId))
        const primaryEmailAddress = clerkUser.emailAddresses.find(emailAddress => emailAddress.id === clerkUser.primaryEmailAddressId)
        const primaryEmail = primaryEmailAddress?.emailAddress

        if (!primaryEmail) {
            throw new UnauthorizedException('The Clerk account has no primary email address')
        }

        if (primaryEmailAddress?.verification?.status !== 'verified') {
            throw new UnauthorizedException('The Clerk primary email address is not verified')
        }

        if (await this.findUser(() => this.usersService.getUserByEmail(primaryEmail))) {
            throw new BoardVaultHttpException(
                API_ERROR_CODES.ACCOUNT_EMAIL_CONFLICT,
                409,
                'This email already belongs to another Board Vault account',
            )
        }

        assertSelfRegistrationEnabled()

        const provisionedAccount = await this.provisionAccount(clerkUserId, clerkUser, primaryEmail, locale)

        await this.usageService?.record(provisionedAccount.id, 'account_created')

        return provisionedAccount
    }

    /** The username and primary email Clerk has now, read with the secret key, for `POST /auth/sync-from-clerk`. */
    async getClerkProfile(clerkUserId: string): Promise<ClerkProfile> {
        const user = await this.withClerkProviderBoundary(() => this.getClerkClient().users.getUser(clerkUserId))
        const primary = user.emailAddresses.find(emailAddress => emailAddress.id === user.primaryEmailAddressId)

        return {
            clerkUserId,
            username: user.username,
            primaryEmail: primary?.emailAddress ?? null,
            primaryEmailVerified: primary?.verification?.status === 'verified',
        }
    }

    /** Removes the Clerk user behind a deleted account; a user Clerk no longer has counts as removed. */
    async deleteClerkUser(clerkUserId: string): Promise<void> {
        await this.withClerkProviderBoundary(async () => {
            try {
                await this.getClerkClient().users.deleteUser(clerkUserId)
            } catch (error) {
                if ((error as { status?: number }).status !== 404) throw error
            }
        })
    }

    private async findUser(lookup: () => Promise<UserGetDto>): Promise<UserGetDto | null> {
        try {
            return await lookup()
        } catch (error) {
            if (error instanceof NotFoundException) {
                return null
            }
            throw error
        }
    }

    private getClerkClient() {
        const secretKey = this.configService.get<string>('CLERK_SECRET_KEY')

        if (!secretKey) {
            throw new BoardVaultHttpException(API_ERROR_CODES.CLERK_INTEGRATION_MISCONFIGURED, 500, 'Clerk integration is not configured')
        }

        return createClerkClient({ secretKey })
    }

    private async withClerkProviderBoundary<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await withTimeout(operation(), 'clerk')
        } catch (error) {
            if (error instanceof BoardVaultHttpException || error instanceof ProviderTimeoutError) {
                throw error
            }

            throw new BoardVaultHttpException(
                API_ERROR_CODES.CLERK_PROVIDER_UNAVAILABLE,
                502,
                'The identity provider is temporarily unavailable',
            )
        }
    }

    private async provisionAccount(clerkUserId: string, clerkUser: ClerkUser, email: string, locale: Locale): Promise<UserGetDto> {
        const username = await this.buildUsername(clerkUser.username, email, clerkUserId)
        const displayName = this.buildDisplayName(clerkUser.firstName, clerkUser.lastName, clerkUser.username, email)
        const avatar = this.buildAvatar(displayName)

        try {
            await this.usersService.createClerkUser({
                email,
                username,
                displayName,
                avatar,
                clerkUserId,
                locale,
            })
        } catch {
            // A concurrent first request may have created the same row.
            const account = await this.findUser(() => this.usersService.getUserByClerkId(clerkUserId))

            if (account) {
                return account
            }
            throw new ConflictException('The Clerk account could not be provisioned as a Board Vault account')
        }

        return this.usersService.getUserByClerkId(clerkUserId)
    }

    private async buildUsername(clerkUsername: string | null, email: string, clerkUserId: string): Promise<string> {
        const base = (clerkUsername || email.split('@')[0] || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
        const safeBase = base.length >= 4 ? base : `player${clerkUserId.slice(-8)}`

        try {
            await this.usersService.getUserByUsername(safeBase)
            return `${safeBase.slice(0, 32)}-${clerkUserId.slice(-6)}`
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error
            }
        }

        return safeBase
    }

    private buildDisplayName(firstName: string | null, lastName: string | null, username: string | null, email: string): string {
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

        const safeName = (fullName || username || email.split('@')[0] || '').trim()

        // Short names are real names ("Ana"); only an empty one needs a stand-in (#125).
        return shortName(safeName) || 'Player'
    }

    private buildAvatar(displayName: string): AvatarDto {
        const initials = displayName
            .split(/\s+/)
            .filter(Boolean)
            .map(part => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()

        return {
            backgroundColor: '#6366F1',
            iconName: null,
            emoji: null,
            type: 'initials',
            initials: initials || 'BV',
        }
    }
}
