import { ApiProperty, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
    ArrayMaxSize,
    IsArray,
    IsEmail,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator'

import { GameCompleteDto } from './game.type'

export class AvatarDto {
    @ApiProperty({ example: '#3B82F6' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(24)
    backgroundColor: string

    @ApiProperty({ example: 'person-fill' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    iconName: string | null

    @ApiProperty({ example: null })
    @IsOptional()
    @IsString()
    @MaxLength(16)
    emoji: string | null

    @ApiProperty({ example: 'icon' })
    @IsIn(['icon', 'emoji', 'initials'])
    type: 'icon' | 'emoji' | 'initials'

    @ApiProperty({ example: 'AB' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(8)
    initials: string
}

/**
 * Internal account record as it comes from the database.
 *
 * This is deliberately a type rather than a decorated Swagger class. Password
 * hashes and one-time tokens must stay inside backend services and must never
 * become part of an HTTP response schema by inheritance.
 */
export type UserRecord = {
    id: number
    email: string
    password: string
    createdAt: string
    username: string
    displayName: string
    avatar: AvatarDto
    isDeleted: boolean
    isAdmin: boolean
    email_verified: boolean
    verification_token: string | null
    password_reset_token: string | null
}

/**
 * Safe account response. Sensitive database-only fields are intentionally
 * declared nowhere on this HTTP DTO.
 */
export class UserGetDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'user@example.test' })
    email: string

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    createdAt: string

    @ApiProperty({ example: 'sample-user' })
    username: string

    @ApiProperty({ example: 'Sample User' })
    displayName: string

    @ApiProperty({ type: AvatarDto, description: 'The avatar of the user.' })
    avatar: AvatarDto

    @ApiProperty({ example: false })
    isDeleted: boolean

    @ApiProperty({ example: false })
    isAdmin: boolean

    @ApiProperty({ example: false })
    email_verified: boolean
}

/**
 * Authenticated self-profile response. Account state and administrator flags
 * belong to dedicated auth/admin contracts, not the ordinary profile payload.
 */
export class UserSelfDto extends PickType(UserGetDto, ['id', 'email', 'username', 'displayName', 'avatar', 'createdAt']) {}

/**
 * Public identity used when a user is nested in another user's response.
 * Email and account-state fields are reserved for dedicated self/admin boundaries.
 */
export class UserPublicDto extends PickType(UserGetDto, ['id', 'username', 'displayName', 'avatar']) {}

/**
 * Internal account creation input. This is not an HTTP DTO; public
 * registration uses RegisterUserDto below.
 */
export type CreateUserBody = Pick<UserRecord, 'email' | 'password' | 'username' | 'displayName' | 'avatar'>

/**
 * PUT /users/:userId requests --> safe profile fields only
 */
export class UpdateUserBody {
    @ApiProperty({ example: 'joseantonio', required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    username?: string

    @ApiProperty({ example: 'Jose Antonio', required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    displayName?: string

    @ApiProperty({ type: AvatarDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => AvatarDto)
    avatar?: AvatarDto
}

/**
 * Internal account-state updates used by authentication workflows.
 * This type must never be used as an HTTP request body.
 */
export type UpdateUserRecord = Partial<
    Pick<
        UserRecord,
        | 'email'
        | 'username'
        | 'password'
        | 'displayName'
        | 'avatar'
        | 'isAdmin'
        | 'email_verified'
        | 'verification_token'
        | 'password_reset_token'
    >
> & {
    /** Internal UTC epoch-second expiry for the email verification token. */
    verification_token_expires_at?: number | null
    /** Internal UTC epoch-second expiry for the password reset token. */
    password_reset_token_expires_at?: number | null
}

/**
 * POST /auth/register
 */
export class RegisterUserDto {
    @ApiProperty({ example: 'jose@email.com' })
    @IsEmail()
    email: string

    @ApiProperty({ example: 'joseantonio' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    username: string

    @ApiProperty({ example: 'correct-horse-battery-staple' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    password: string
}

/**
 * POST /auth/login
 */
export class LoginUserDto {
    @ApiProperty({ example: 'jose@email.com' })
    @IsEmail()
    email: string

    @ApiProperty({ example: 'correct-horse-battery-staple' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    password: string
}

/**
 * User containing the games they have
 */
export class UserWithGames extends UserGetDto {
    @ApiProperty({ type: [GameCompleteDto], description: 'The games the user has.' })
    games: Array<GameCompleteDto>
}

/**
 * Public identity plus games used for group member responses.
 */
export class UserPublicWithGames extends UserPublicDto {
    @ApiProperty({ type: [GameCompleteDto], description: 'The games the user has.' })
    games: Array<GameCompleteDto>
}

export class UserUpdateGamesBody {
    @ApiProperty({ type: [Number], description: 'The games to add to user' })
    @IsArray()
    @ArrayMaxSize(1000)
    @IsInt({ each: true })
    @Min(1, { each: true })
    gamesToAdd: Array<number>

    @ApiProperty({ type: [Number], description: 'The games to remove from user' })
    @IsArray()
    @ArrayMaxSize(1000)
    @IsInt({ each: true })
    @Min(1, { each: true })
    gamesToRemove: Array<number>
}
