import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, Min } from 'class-validator'

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

    @ApiProperty({ example: 21, required: false, nullable: true })
    @IsInt()
    @Min(1)
    groupPersonId?: number
}

export class CreateClerkGroupInvitationBody {
    @ApiProperty({ example: 'friend@example.com' })
    @IsEmail()
    @IsNotEmpty()
    @IsString()
    @MaxLength(320)
    emailAddress: string

    @ApiProperty({ example: 21, required: false, description: 'Optional placeholder to offer the invitee for claiming.' })
    @IsOptional()
    @IsInt()
    @Min(1)
    groupPersonId?: number
}

export class ClerkGroupInvitationDto {
    @ApiProperty({ example: 'inv_123' })
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

export class ClerkGroupInvitationSummaryDto {
    @ApiProperty({ example: 'inv_123' })
    @IsString()
    @IsNotEmpty()
    invitationId: string

    @ApiProperty({ example: 'friend@example.com' })
    @IsEmail()
    emailAddress: string

    @ApiProperty({ example: 'pending', enum: ['pending'] })
    @IsIn(['pending'])
    status: 'pending'

    @ApiProperty({ example: '2026-09-05T10:00:00.000Z' })
    @IsDateString()
    createdAt: string
}

export class ClerkInvitationIdParam {
    @ApiProperty({ example: 42 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    groupId: number

    @ApiProperty({ example: 'inv_123' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    @Matches(/^inv_[a-zA-Z0-9_-]+$/)
    invitationId: string
}
