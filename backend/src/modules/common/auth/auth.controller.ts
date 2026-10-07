import { Controller, Delete, Get, HttpCode, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { SessionStatusDto } from '../../../common/types/auth.type.js'

import { AccountDeletionService } from './account-deletion.service.js'

import type { AuthenticatedUser } from '../../../common/types/auth.type.js'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly accountDeletionService: AccountDeletionService) {}

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
