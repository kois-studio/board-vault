import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard'
import { SessionStatusDto } from '../../../common/types/auth.type'

import type { AuthenticatedUser } from '../../../common/types/auth.type'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
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
}
