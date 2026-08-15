import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class SuccessDto {
    @ApiProperty({ example: true, description: 'The success status of the operation.' })
    @IsBoolean()
    success: boolean
}

export class AccessTokenDto {
    @ApiProperty({ example: 'eyJhbGcifasdjghnsndgi...', description: 'The JWT access token.' })
    @IsString()
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
    @IsNotEmpty()
    password: string
}

export class TokenStatusDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    isValid: boolean

    @ApiProperty({ example: 1 })
    @IsNumber()
    userId: number

    @ApiProperty({ example: false })
    @IsBoolean()
    isAdmin: boolean
}
