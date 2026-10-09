import { createClerkClient, type User as ClerkUser } from '@clerk/backend'
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { API_ERROR_CODES, BoardVaultHttpException } from '../../../common/http/api-error.js'
import { ProviderTimeoutError, withTimeout } from '../../../common/http/provider-timeout.js'
import { assertSelfRegistrationEnabled } from '../../../common/registration-policy.js'
import {
    CLERK_GROUP_INVITATION_METADATA_KEY,
    type ClerkGroupInvitationDto,
    type ClerkGroupInvitationSummaryDto,
    type ClerkGroupInvitationMetadata,
} from '../../../common/types/clerk-invitation.type.js'
import { ActivityNotifier } from '../../core/notifications/activity-notifier.service.js'
import { UsersService } from '../../core/users/users.service.js'
import { DatabaseService } from '../database/database.service.js'

import type { ClerkProfile } from './clerk-account-sync.service.js'
import type { AvatarDto, UserGetDto } from '../../../common/types/user.type.js'

@Injectable()
export class ClerkIdentityService {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly databaseService: DatabaseService,
        private readonly activityNotifier: ActivityNotifier,
    ) {}

    async createGroupInvitation(
        groupId: number,
        inviterAccountId: number,
        emailAddress: string,
        groupPersonId?: number,
    ): Promise<ClerkGroupInvitationDto> {
        await this.assertGroupOwner(groupId, inviterAccountId)

        if (groupPersonId !== undefined) {
            const person = await this.databaseService.groups.getGroupPersonById(groupPersonId, groupId)

            const [personRow] = person.rows

            if (!personRow || String(personRow[3]) !== 'placeholder' || personRow[2] !== null) {
                throw new NotFoundException('The selected placeholder is not available for claiming')
            }
            const claimTarget = await this.databaseService.groups.setGroupPersonClaimEmail(groupPersonId, groupId, emailAddress)

            if (claimTarget.rowsAffected !== 1) {
                throw new NotFoundException('The selected placeholder is not available for claiming')
            }
        }

        const invitation = await this.withClerkProviderBoundary(() =>
            this.getClerkClient().invitations.createInvitation({
                emailAddress,
                expiresInDays: 30,
                notify: true,
                redirectUrl: this.getInvitationRedirectUrl(),
                publicMetadata: {
                    [CLERK_GROUP_INVITATION_METADATA_KEY]: {
                        groupId,
                        inviterAccountId,
                        version: groupPersonId === undefined ? 1 : 2,
                        ...(groupPersonId === undefined ? {} : { groupPersonId }),
                    },
                },
            }),
        )

        if (!invitation.url) {
            throw new BoardVaultHttpException(
                API_ERROR_CODES.CLERK_INVITATION_LINK_UNAVAILABLE,
                502,
                'The invitation provider did not return a usable link',
            )
        }

        return {
            invitationId: invitation.id,
            emailAddress: invitation.emailAddress,
            url: invitation.url,
        }
    }

    async getGroupInvitations(groupId: number, inviterAccountId: number): Promise<Array<ClerkGroupInvitationSummaryDto>> {
        await this.assertGroupOwner(groupId, inviterAccountId)

        const invitations = await this.listPendingGroupInvitations()

        return invitations
            .filter(({ metadata }) => metadata.groupId === groupId && metadata.inviterAccountId === inviterAccountId)
            .map(({ invitation }) => ({
                invitationId: invitation.id,
                emailAddress: invitation.emailAddress,
                status: 'pending' as const,
                createdAt: new Date(invitation.createdAt).toISOString(),
            }))
    }

    /**
     * Revokes every pending group invitation an account sent, for account deletion (ADR-0018:
     * invitations sent go with the account). Their links stop working in Clerk, instead of opening
     * an account that no group takes in. Placeholder claims they targeted are released.
     * Returns how many could not be revoked; the rest are revoked even if one fails.
     */
    async revokeInvitationsFrom(inviterAccountId: number): Promise<{ revoked: number; failed: number }> {
        const invitations = (await this.listPendingGroupInvitations()).filter(
            ({ metadata }) => metadata.inviterAccountId === inviterAccountId,
        )
        let revoked = 0
        let failed = 0
        const clerkClient = this.getClerkClient()

        for (const { invitation, metadata } of invitations) {
            try {
                await this.withClerkProviderBoundary(() => clerkClient.invitations.revokeInvitation(invitation.id))
                if (metadata.groupPersonId !== undefined) {
                    await this.databaseService.groups.clearGroupPersonClaimEmail(
                        metadata.groupPersonId,
                        metadata.groupId,
                        invitation.emailAddress,
                    )
                }
                revoked++
            } catch {
                failed++
            }
        }

        return { revoked, failed }
    }

    /** Every pending Clerk invitation that carries Board Vault group metadata, all pages. */
    private async listPendingGroupInvitations(): Promise<
        Array<{ invitation: { id: string; emailAddress: string; createdAt: number }; metadata: ClerkGroupInvitationMetadata }>
    > {
        const invitations: Array<{
            invitation: { id: string; emailAddress: string; createdAt: number }
            metadata: ClerkGroupInvitationMetadata
        }> = []
        const clerkClient = this.getClerkClient()
        const limit = 500
        let offset = 0

        while (true) {
            const page = await this.withClerkProviderBoundary(() =>
                clerkClient.invitations.getInvitationList({
                    limit,
                    offset,
                    orderBy: '-created_at',
                    status: 'pending',
                }),
            )

            for (const invitation of page.data) {
                let metadata: ClerkGroupInvitationMetadata | null = null

                try {
                    metadata = this.getGroupInvitationMetadata(invitation.publicMetadata)
                } catch {
                    // Ignore malformed metadata belonging to another integration.
                    continue
                }

                if (metadata) invitations.push({ invitation, metadata })
            }

            offset += page.data.length
            if (offset >= page.totalCount || page.data.length === 0) break
        }

        return invitations
    }

    async revokeGroupInvitation(groupId: number, inviterAccountId: number, invitationId: string): Promise<{ success: true }> {
        await this.assertGroupOwner(groupId, inviterAccountId)

        const page = await this.withClerkProviderBoundary(() =>
            this.getClerkClient().invitations.getInvitationList({ query: invitationId, limit: 10 }),
        )
        const invitation = page.data.find(candidate => candidate.id === invitationId)

        if (!invitation || invitation.status !== 'pending') {
            throw new NotFoundException('Pending invitation not found')
        }

        let metadata: ClerkGroupInvitationMetadata | null = null

        try {
            metadata = this.getGroupInvitationMetadata(invitation.publicMetadata)
        } catch {
            metadata = null
        }

        if (!metadata || metadata.groupId !== groupId || metadata.inviterAccountId !== inviterAccountId) {
            throw new NotFoundException('Pending invitation not found')
        }

        await this.withClerkProviderBoundary(() => this.getClerkClient().invitations.revokeInvitation(invitationId))
        if (metadata.groupPersonId !== undefined) {
            await this.databaseService.groups.clearGroupPersonClaimEmail(metadata.groupPersonId, groupId, invitation.emailAddress)
        }
        return { success: true }
    }

    /**
     * Resolves a verified Clerk subject to its local Account row.
     * Every account is linked by `clerkUserId` (ADR-0012). An unlinked Clerk
     * user gets a new account only through a group invitation or open
     * self-registration. An email that already belongs to another account is
     * never linked implicitly.
     */
    async resolveAccount(clerkUserId: string): Promise<UserGetDto> {
        const linkedUser = await this.findUser(() => this.usersService.getUserByClerkId(clerkUserId))

        if (linkedUser) {
            if (linkedUser.isDeleted) {
                throw new UnauthorizedException('The Board Vault account is unavailable')
            }

            return linkedUser
        }

        const clerkUser = await this.withClerkProviderBoundary(() => this.getClerkClient().users.getUser(clerkUserId))
        const groupInvitation = this.getGroupInvitationMetadata(clerkUser.publicMetadata)
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

        if (!groupInvitation) {
            assertSelfRegistrationEnabled()
        } else {
            // Checked before the account exists: an invitation the group no longer honours (its owner
            // changed or the group is gone) must not leave an account that belongs to no group.
            await this.assertInvitationStillValid(groupInvitation)
        }

        const provisionedAccount = await this.provisionAccount(clerkUserId, clerkUser, primaryEmail)

        if (groupInvitation) {
            await this.databaseService.groups.joinGroupFromClerkInvitation(provisionedAccount.id, groupInvitation)
            await this.activityNotifier.memberJoined(groupInvitation.groupId, provisionedAccount.id)
        }

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

    private getInvitationRedirectUrl(): string {
        const configuredUrl = this.configService.get<string>('BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL')?.trim()

        if (configuredUrl) {
            return configuredUrl
        }

        if (process.env.NODE_ENV !== 'production') {
            return 'http://localhost:4200/register'
        }

        throw new BoardVaultHttpException(
            API_ERROR_CODES.CLERK_INVITATION_REDIRECT_MISCONFIGURED,
            500,
            'The invitation redirect is not configured',
        )
    }

    private async assertInvitationStillValid(invitation: ClerkGroupInvitationMetadata): Promise<void> {
        const group = await this.databaseService.groups.getGroupById(invitation.groupId)

        if (Number(group.rows[0]?.[2]) !== invitation.inviterAccountId) {
            throw new NotFoundException('The group invitation is no longer valid')
        }
    }

    private async assertGroupOwner(groupId: number, inviterAccountId: number): Promise<void> {
        const group = await this.databaseService.groups.getGroupById(groupId)

        if (Number(group.rows[0]?.[2]) !== inviterAccountId) {
            throw new ForbiddenException('You are not the owner of this group')
        }
    }

    private getGroupInvitationMetadata(publicMetadata: unknown): ClerkGroupInvitationMetadata | null {
        if (!publicMetadata || typeof publicMetadata !== 'object') {
            return null
        }

        const metadata = (publicMetadata as Record<string, unknown>)[CLERK_GROUP_INVITATION_METADATA_KEY]

        if (!metadata || typeof metadata !== 'object') {
            return null
        }

        const candidate = metadata as Record<string, unknown>

        if (
            (candidate.version !== 1 && candidate.version !== 2) ||
            !Number.isInteger(candidate.groupId) ||
            Number(candidate.groupId) < 1 ||
            !Number.isInteger(candidate.inviterAccountId) ||
            Number(candidate.inviterAccountId) < 1 ||
            (candidate.version === 2 && (!Number.isInteger(candidate.groupPersonId) || Number(candidate.groupPersonId) < 1))
        ) {
            throw new ForbiddenException('The Clerk invitation metadata is invalid')
        }

        return {
            groupId: Number(candidate.groupId),
            inviterAccountId: Number(candidate.inviterAccountId),
            version: Number(candidate.version),
            ...(candidate.groupPersonId === undefined ? {} : { groupPersonId: Number(candidate.groupPersonId) }),
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
                'The invitation provider is temporarily unavailable',
            )
        }
    }

    private async provisionAccount(clerkUserId: string, clerkUser: ClerkUser, email: string): Promise<UserGetDto> {
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

        const safeName = (fullName || username || email.split('@')[0] || '').trim().slice(0, 100)

        // Short names are real names ("Ana"); only an empty one needs a stand-in (#125).
        return safeName || 'Player'
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
