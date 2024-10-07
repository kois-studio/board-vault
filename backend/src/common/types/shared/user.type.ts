import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { GameDto } from './game.type'

// Base User as it comes from the database
export class UserCompleteDto {
    @ApiProperty({
        example: 1,
        description: 'The unique identifier for the user.',
    })
    id: number

    @ApiProperty({
        example: 'test@test.com',
        description: "The user's email address.",
    })
    email: string

    @ApiProperty({
        example: '12345678',
        description: "The user's hashed password.",
    })
    password: string

    @ApiProperty({
        example: '2024-09-28 10:02:39',
        description: 'The date and time the account was created.',
    })
    createdAt: string

    @ApiProperty({
        example: 'dawichi',
        description: "The user's username.",
    })
    username: string

    @ApiProperty({
        example: 'David F.',
        description: "The user's display name.",
    })
    display_name: string

    @ApiProperty({
        example: 'https://example.com/profile.jpg',
        description: "The user's profile image URL.",
    })
    imageUrl: string

    @ApiProperty({
        example: false,
        description: 'Whether the user has been deleted.',
    })
    is_deleted: boolean
}

// GET requests --> no password hash included
export class UserGetDto extends OmitType(UserCompleteDto, ['password']) {}

// POST requests --> no db generated props
export class CreateUserBody extends OmitType(UserCompleteDto, ['id', 'createdAt', 'is_deleted']) {}

// PUT requests --> editable fields
export class UpdateUserBody extends PartialType(PickType(UserCompleteDto, ['email', 'username', 'password', 'display_name', 'imageUrl'])) {}

// POST /auth/register and POST /auth/login
export class RegisterUserDto extends PickType(UserCompleteDto, ['email', 'username', 'password']) {}
export class LoginUserDto extends PickType(UserCompleteDto, ['email', 'password']) {}

// Other custom structures apart from the CRUD operations
export class UserWithGames extends UserGetDto {
    @ApiProperty({ type: [GameDto], description: 'The games the user has.' })
    games: Array<GameDto>
}
