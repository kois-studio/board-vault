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

/** What happened to one field copied from Clerk: already equal, copied, or held by another account. */
export type ClerkFieldSync = 'unchanged' | 'updated' | 'taken'

const CLERK_FIELD_SYNC: Array<ClerkFieldSync> = ['unchanged', 'updated', 'taken']

/** The result of copying the signed-in Clerk user's username and primary email to the account. */
export class ClerkSyncResultDto {
    @ApiProperty({ enum: CLERK_FIELD_SYNC, example: 'updated', description: '`taken`: another account has this username' })
    username: ClerkFieldSync

    @ApiProperty({
        enum: CLERK_FIELD_SYNC,
        example: 'unchanged',
        description: 'Only a verified primary email is copied. `taken`: another account has it',
    })
    email: ClerkFieldSync
}
