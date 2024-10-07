import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { GameDto } from './game.type'

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
    display_name: string

    @ApiProperty({ example: 'https://example.com/profile.jpg' })
    imageUrl: string

    @ApiProperty({ example: false })
    is_deleted: boolean
}

/**
 * GET requests --> no password hash included
 */
export class UserGetDto extends OmitType(UserCompleteDto, ['password']) {}

/**
 * POST requests --> no db generated props
 */
export class CreateUserBody extends OmitType(UserCompleteDto, ['id', 'createdAt', 'is_deleted']) {}

/**
 * PUT requests --> editable fields
 */
export class UpdateUserBody extends PartialType(PickType(UserCompleteDto, ['email', 'username', 'password', 'display_name', 'imageUrl'])) {}

/**
 * POST /auth/register
 */
export class RegisterUserDto extends PickType(UserCompleteDto, ['email', 'username', 'password']) {}

/**
 * POST /auth/login
 */
export class LoginUserDto extends PickType(UserCompleteDto, ['email', 'password']) {}

/**
 * User containing the games they have
 */
export class UserWithGames extends UserGetDto {
    @ApiProperty({ type: [GameDto], description: 'The games the user has.' })
    games: Array<GameDto>
}
