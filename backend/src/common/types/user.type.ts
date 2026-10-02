import { ApiProperty, PickType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
    ArrayMaxSize,
    IsArray,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    isNotEmpty,
    MaxLength,
    Min,
    ValidateBy,
    ValidateNested,
} from 'class-validator'

import { GameCompleteDto } from './game.type'

// Initials are only shown, and so only required, on an initials avatar. Icon
// and emoji avatars may keep empty initials, and the API must accept back the
// avatar it returned.
const RequiredForInitialsAvatar = () =>
    ValidateBy({
        name: 'requiredForInitialsAvatar',
        validator: {
            validate: (value, args) => (args?.object as AvatarDto | undefined)?.type !== 'initials' || isNotEmpty(value),
            defaultMessage: () => 'initials should not be empty for an initials avatar',
        },
    })

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
    @RequiredForInitialsAvatar()
    @MaxLength(8)
    initials: string
}

/**
 * Account response. Credentials belong to Clerk (ADR-0012); the local
 * Account row holds only the Board Vault profile and authorization flags.
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
 * PUT /users/:userId requests --> safe profile fields only
 */
export class UpdateUserBody {
    @ApiProperty({ example: 'sample-user', required: false })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    username?: string

    @ApiProperty({ example: 'Sample User', required: false })
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
