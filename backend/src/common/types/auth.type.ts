import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString } from 'class-validator'

export class SuccessDto {
    @ApiProperty({ example: true, description: 'The success status of the operation.' })
    success: boolean
}

export class AccessTokenDto {
    @ApiProperty({ example: 'eyJhbGcifasdjghnsndgi...', description: 'The JWT access token.' })
    accessToken: string
}

export class ForgotPasswordDto {
    @ApiProperty({ description: 'The email address of the user' })
    @IsEmail()
    email: string
}

export class ResetPasswordDto {
    @ApiProperty({ description: 'The new password for the user' })
    @IsString()
    password: string
}
