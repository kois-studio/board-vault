// auth.controller.ts
import { BadRequestException, Body, Controller, Get, Post, Query, Param, NotFoundException, UseGuards, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { AccessTokenDto, ForgotPasswordDto, ResetPasswordDto, SuccessDto, TokenStatusDto } from '../../../common/types/auth.type'
import { LoginUserDto, RegisterUserDto } from '../../../common/types/user.type'

import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Validate JWT token and get user status' })
    @ApiResponse({ status: 200, description: 'Token is valid and user status returned', type: TokenStatusDto })
    @ApiResponse({ status: 401, description: 'Unauthorized - Token is invalid or expired' })
    async getTokenStatus(@Req() request: any): Promise<TokenStatusDto> {
        // If JwtAuthGuard passes, the request.user object will be populated by your JwtStrategy's validate method.
        // The guard itself handles the 401 if the token is bad.

        // Ensure userId is a number if it comes as a string from the token
        const userId = typeof request.user.userId === 'string' ? parseInt(request.user.userId, 10) : request.user.userId

        return {
            isValid: true,
            userId,
            isAdmin: request.user.isAdmin || false,
        }
    }

    @Post('/register')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'The user has been successfully created' })
    async createUser(@Body() userDto: RegisterUserDto) {
        return this.authService.register(userDto.email, userDto.username, userDto.password)
    }

    @Post('/login')
    @ApiOperation({ summary: 'Log in a user' })
    @ApiResponse({ status: 201, type: AccessTokenDto, description: 'Successfully logged in' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async loginUser(@Body() loginDto: LoginUserDto) {
        return this.authService.login(loginDto.email, loginDto.password)
    }

    @Get('/check-email')
    @ApiOperation({ summary: 'Check if an email exists' })
    @ApiResponse({ status: 200, description: 'Email availability status' })
    @ApiResponse({ status: 400, description: 'Email is required' })
    async checkEmail(@Query('email') email: string) {
        if (!email) {
            throw new BadRequestException('Email is required')
        }
        const isAvailable = await this.authService.checkEmail(email)

        return { isAvailable }
    }

    @Get('/check-username')
    @ApiOperation({ summary: 'Check if a username exists' })
    @ApiResponse({ status: 200, description: 'Username availability status' })
    @ApiResponse({ status: 400, description: 'Username is required' })
    async checkUsername(@Query('username') username: string) {
        if (!username) {
            throw new BadRequestException('Username is required')
        }
        const isAvailable = await this.authService.checkUsername(username)

        return { isAvailable }
    }

    @Get('/verify-email/:token')
    @ApiOperation({ summary: 'Verify user email' })
    @ApiResponse({ status: 200, description: 'Email successfully verified' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyEmail(@Param('token') token: string) {
        const result = await this.authService.verifyEmail(token)

        if (!result) {
            throw new NotFoundException('Invalid or expired token')
        }
        return { message: 'Email successfully verified' }
    }

    @Post('/forgot-password')
    @ApiOperation({ summary: 'Request a password reset' })
    @ApiResponse({ status: 200, description: 'Password reset link sent' })
    @ApiResponse({ status: 400, description: 'Email is required' })
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        const { email } = forgotPasswordDto

        if (!email) {
            throw new BadRequestException('Email is required')
        }
        await this.authService.forgotPassword(email)
        return { message: 'Password reset link sent' }
    }

    @Post('/reset-password/:token')
    @ApiOperation({ summary: 'Reset user password' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Param('token') token: string, @Body() resetPasswordDto: ResetPasswordDto) {
        const result = await this.authService.resetPassword(token, resetPasswordDto.password)

        if (!result) {
            throw new NotFoundException('Invalid or expired token')
        }
        return { message: 'Password reset successfully' }
    }
}
