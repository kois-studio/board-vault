import { createClerkClient } from '@clerk/backend'
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { UsersService } from '../../core/users/users.service'

import type { UserGetDto } from '../../../common/types/user.type'

@Injectable()
export class ClerkIdentityService {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {}

    /**
     * Resolves a verified Clerk subject to the preserved local Account row.
     * Existing links win; otherwise an exact primary-email match is linked.
     */
    async resolveAccount(clerkUserId: string): Promise<UserGetDto> {
        try {
            return await this.usersService.getUserByClerkId(clerkUserId)
        } catch (error) {
            // An unlinked Clerk identity is expected during the migration.
            if (!(error instanceof NotFoundException)) {
                throw error
            }
        }

        const clerkUser = await this.getClerkClient().users.getUser(clerkUserId)
        const primaryEmail = clerkUser.emailAddresses.find(
            emailAddress => emailAddress.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress

        if (!primaryEmail) {
            throw new UnauthorizedException('The Clerk account has no primary email address')
        }

        let localUser: UserGetDto

        try {
            localUser = await this.usersService.getUserByEmail(primaryEmail)
        } catch (error) {
            if (!(error instanceof NotFoundException)) {
                throw error
            }
            throw new ConflictException(
                'No preserved Board Vault account matches this Clerk email; manual account provisioning is required',
            )
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
}
