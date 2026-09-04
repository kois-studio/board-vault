import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsInt, IsNotEmpty, IsString, IsUrl, MaxLength, Min } from 'class-validator'

export const CLERK_GROUP_INVITATION_METADATA_KEY = 'boardVaultGroupInvitation'

export class ClerkGroupInvitationMetadata {
    @ApiProperty({ example: 42 })
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    inviterAccountId: number

    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(1)
    version: number
}

export class CreateClerkGroupInvitationBody {
    @ApiProperty({ example: 'friend@example.com' })
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    emailAddress: string
}

export class ClerkGroupInvitationDto {
    @ApiProperty({ example: 'invitation_123' })
    @IsString()
    @IsNotEmpty()
    invitationId: string

    @ApiProperty({ example: 'friend@example.com' })
    @IsEmail()
    emailAddress: string

    @ApiProperty({ example: 'https://accounts.example.com/sign-up?__clerk_ticket=...' })
    @IsUrl({ require_tld: false })
    @IsNotEmpty()
    @MaxLength(2048)
    url: string
}
