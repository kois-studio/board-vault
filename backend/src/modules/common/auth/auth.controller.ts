import { Controller, Delete, Get, HttpCode, NotFoundException, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { RateLimit, RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'
import { ClerkSyncResultDto, SessionStatusDto } from '../../../common/types/auth.type.js'

import { AccountDeletionService } from './account-deletion.service.js'
import { ClerkAccountSyncService } from './clerk-account-sync.service.js'
import { ClerkIdentityService } from './clerk-identity.service.js'

import type { AuthenticatedUser } from '../../../common/types/auth.type.js'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly accountDeletionService: AccountDeletionService,
        private readonly clerkIdentityService: ClerkIdentityService,
        private readonly clerkAccountSyncService: ClerkAccountSyncService,
    ) {}

    @Get('/clerk/status')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Resolve the Clerk session to its Board Vault account' })
    @ApiResponse({ status: 200, type: SessionStatusDto, description: 'The session is valid' })
    @ApiResponse({ status: 401, description: 'The Clerk session is missing, invalid, or expired' })
    @ApiResponse({ status: 409, description: 'The email already belongs to another Board Vault account' })
    getSessionStatus(@Req() request: { user: AuthenticatedUser }): SessionStatusDto {
        return {
            isValid: true,
            userId: request.user.userId,
            isAdmin: request.user.isAdmin,
            clerkUserId: request.user.clerkUserId,
        }
    }

    @Post('/sync-from-clerk')
    @UseGuards(AuthGuard, RateLimitGuard)
    @RateLimit(30, 3600)
    @ApiBearerAuth()
    @HttpCode(200)
    @ApiOperation({
        summary: "Copy the signed-in user's username and primary email from Clerk now (ADR-0017)",
        description:
            'Reads the user from Clerk with the secret key, so nothing comes from the request, and applies it as the user.updated webhook does. The app calls it after a change in Clerk instead of waiting for the webhook, which never reaches a local API.',
    })
    @ApiResponse({ status: 200, type: ClerkSyncResultDto, description: 'What changed; `taken` means another account has the value' })
    @ApiResponse({ status: 401, description: 'The Clerk session is missing, invalid, or expired' })
    @ApiResponse({ status: 429, description: 'Too many requests' })
    async syncFromClerk(@Req() request: { user: AuthenticatedUser }): Promise<ClerkSyncResultDto> {
        const profile = await this.clerkIdentityService.getClerkProfile(request.user.clerkUserId)
        const result = await this.clerkAccountSyncService.apply(profile)

        if (!result) throw new NotFoundException('The Board Vault account is unavailable')

        return result
    }

    @Delete('/account')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @HttpCode(204)
    @ApiOperation({
        summary: 'Delete the signed-in account (ADR-0018)',
        description:
            'Removes private data, keeps the person in group history as "Deleted account", passes owned groups on, and then deletes the Clerk user. Cannot be undone.',
    })
    @ApiResponse({ status: 204, description: 'The account was deleted' })
    @ApiResponse({ status: 401, description: 'The Clerk session is missing, invalid, or expired' })
    async deleteAccount(@Req() request: { user: AuthenticatedUser }): Promise<void> {
        await this.accountDeletionService.deleteOwnAccount(request.user.userId, request.user.clerkUserId)
    }
}
