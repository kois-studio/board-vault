import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNumber, IsString } from 'class-validator'

export class SuccessDto {
    @ApiProperty({ example: true, description: 'The success status of the operation.' })
    @IsBoolean()
    success: boolean
}

/**
 * The local identity attached to a request by ClerkSessionMiddleware.
 */
export type AuthenticatedUser = {
    userId: number
    email: string
    isAdmin: boolean
    clerkUserId: string
}

export class SessionStatusDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    isValid: boolean

    @ApiProperty({ example: 1 })
    @IsNumber()
    userId: number

    @ApiProperty({ example: false })
    @IsBoolean()
    isAdmin: boolean

    @ApiProperty({ example: 'user_2abc' })
    @IsString()
    clerkUserId: string
}
