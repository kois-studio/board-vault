import { createClerkClient, type User as ClerkUser } from '@clerk/backend'
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { UsersService } from '../../core/users/users.service'

import type { AvatarDto, UserGetDto } from '../../../common/types/user.type'

@Injectable()
export class ClerkIdentityService {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {}

    /**
     * Resolves a verified Clerk subject to a local Account row.
     * Existing links win; an exact primary-email match is linked, and a new
     * local domain account is provisioned for a new Clerk identity.
     */
    async resolveAccount(clerkUserId: string): Promise<UserGetDto> {
        try {
            const linkedUser = await this.usersService.getUserByClerkId(clerkUserId)

            if (linkedUser.isDeleted) {
                throw new UnauthorizedException('The Board Vault account is unavailable')
            }

            return linkedUser
        } catch (error) {
            // An unlinked Clerk identity is expected during the migration.
            if (!(error instanceof NotFoundException)) {
                throw error
            }
        }

        const clerkUser = await this.getClerkClient().users.getUser(clerkUserId)
        const primaryEmailAddress = clerkUser.emailAddresses.find(emailAddress => emailAddress.id === clerkUser.primaryEmailAddressId)
        const primaryEmail = primaryEmailAddress?.emailAddress

        if (!primaryEmail) {
            throw new UnauthorizedException('The Clerk account has no primary email address')
        }

        if (primaryEmailAddress?.verification?.status !== 'verified') {
            throw new UnauthorizedException('The Clerk primary email address is not verified')
        }

        let localUser: UserGetDto

        try {
            localUser = await this.usersService.getUserByEmail(primaryEmail)
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error
            }
            return this.provisionAccount(clerkUserId, clerkUser, primaryEmail)
        }

        if (localUser.isDeleted) {
            throw new UnauthorizedException('The Board Vault account is unavailable')
        }

        try {
            return await this.usersService.linkClerkUser(localUser.id, clerkUserId)
        } catch {
            throw new ConflictException('This Clerk account could not be linked to the preserved Board Vault account')
        }
    }

    private getClerkClient() {
        const secretKey = this.configService.get<string>('CLERK_SECRET_KEY')

        if (!secretKey) {
            throw new InternalServerErrorException('Clerk backend integration is not configured')
        }

        return createClerkClient({ secretKey })
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
            // A concurrent first request may have created the same Clerk row.
            // Re-read both identity keys before reporting a real conflict.
            try {
                return await this.usersService.getUserByClerkId(clerkUserId)
            } catch (error) {
                if (!(error instanceof NotFoundException)) {
                    throw error
                }
            }

            try {
                const account = await this.usersService.getUserByEmail(email)

                if (account.isDeleted) {
                    throw new UnauthorizedException('The Board Vault account is unavailable')
                }
                return await this.usersService.linkClerkUser(account.id, clerkUserId)
            } catch (error) {
                if (error instanceof UnauthorizedException) {
                    throw error
                }
                throw new ConflictException('The Clerk account could not be provisioned as a Board Vault account')
            }
        }

        return this.usersService.getUserByClerkId(clerkUserId)
    }

    private async buildUsername(clerkUsername: string | null, email: string, clerkUserId: string): Promise<string> {
        const base = (clerkUsername || email.split('@')[0]).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
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

        const safeName = (fullName || username || email.split('@')[0]).slice(0, 255)

        return safeName.length >= 4 ? safeName : `Player ${safeName}`
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
