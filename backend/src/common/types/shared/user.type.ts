import { ApiProperty, PartialType, PickType } from '@nestjs/swagger'

// Base User as it comes from the database
export class UserCompleteDto {
    @ApiProperty({
        example: 1,
        description: 'The unique identifier for the user.',
    })
    id: number

    @ApiProperty({
        example: 'email@test.com',
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
        example: 'David',
        description: "The user's display alias.",
    })
    alias: string

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
export class UserGetDto extends PickType(UserCompleteDto, ['id', 'email', 'alias', 'imageUrl']) {}

// POST requests --> no id or createdAt
export class CreateUserBody extends PickType(UserCompleteDto, ['email', 'alias', 'password', 'imageUrl']) {}

// PUT requests --> editable fields
export class UpdateUserBody extends PartialType(PickType(UserCompleteDto, ['email', 'alias', 'password', 'imageUrl'])) {}

// POST /auth/register and POST /auth/login
export class RegisterUserDto extends PickType(UserCompleteDto, ['email', 'alias', 'password']) {}
export class LoginUserDto extends PickType(UserCompleteDto, ['email', 'password']) {}
