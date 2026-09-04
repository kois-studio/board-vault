import { ApiProperty, OmitType, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator'

import { GameCompleteDto } from './game.type'

export class AvatarDto {
    @ApiProperty({ example: '#3B82F6' })
    @IsString()
    @IsNotEmpty()
    backgroundColor: string

    @ApiProperty({ example: 'person-fill' })
    @IsOptional()
    @IsString()
    iconName: string | null

    @ApiProperty({ example: null })
    @IsOptional()
    @IsString()
    emoji: string | null

    @ApiProperty({ example: 'icon' })
    @IsIn(['icon', 'emoji', 'initials'])
    type: 'icon' | 'emoji' | 'initials'

    @ApiProperty({ example: 'AB' })
    @IsString()
    @IsNotEmpty()
    initials: string
}

/**
 * base User as it comes from db
 */
export class UserCompleteDto {
    @ApiProperty({ example: 1 })
    id: number

    @ApiProperty({ example: 'jose@email.com' })
    email: string

    @ApiProperty({ example: '12345678' })
    password: string

    @ApiProperty({ example: '2024-09-28 10:02:39' })
    createdAt: string

    @ApiProperty({ example: 'joseantonio' })
    username: string

    @ApiProperty({ example: 'Jose Antonio' })
    displayName: string

    @ApiProperty({ type: AvatarDto, description: 'The avatar of the user.' })
    avatar: AvatarDto

    @ApiProperty({ example: false })
    isDeleted: boolean

    @ApiProperty({ example: false })
    isAdmin: boolean

    @ApiProperty({ example: false })
    email_verified: boolean

    @ApiProperty({ example: null })
    verification_token: string | null

    @ApiProperty({ example: null })
    password_reset_token: string | null
}

/**
 * GET requests --> no password hash included
 */
export class UserGetDto extends OmitType(UserCompleteDto, ['password', 'verification_token', 'password_reset_token']) {}

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
 * POST requests --> no db generated props
 */
export class CreateUserBody extends OmitType(UserCompleteDto, [
    'id',
    'createdAt',
    'isDeleted',
    'isAdmin',
    'email_verified',
    'verification_token',
    'password_reset_token',
]) {}

/**
 * PUT /users/:userId requests --> safe profile fields only
 */
export class UpdateUserBody {
    @ApiProperty({ example: 'joseantonio', required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    username?: string

    @ApiProperty({ example: 'Jose Antonio', required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
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
        UserCompleteDto,
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
    username: string

    @ApiProperty({ example: 'correct-horse-battery-staple' })
    @IsString()
    @IsNotEmpty()
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
    @IsInt({ each: true })
    @Min(1, { each: true })
    gamesToAdd: Array<number>

    @ApiProperty({ type: [Number], description: 'The games to remove from user' })
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    gamesToRemove: Array<number>
}
