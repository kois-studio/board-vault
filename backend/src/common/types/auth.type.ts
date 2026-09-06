import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator'

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

export class CheckEmailDto {
    @ApiProperty({ description: 'The email address to check' })
    @IsEmail()
    email: string
}

export class CheckUsernameDto {
    @ApiProperty({ description: 'The username to check' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    username: string
}

export class ResetPasswordDto {
    @ApiProperty({ description: 'The new password for the user' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
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
