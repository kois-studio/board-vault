import { ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, IsUrl } from 'class-validator'

// UserDto for GET requests
export class UserDto {
    @ApiProperty({
        example: 1,
        description: 'The unique identifier for the user.',
    })
    id: number

    @ApiProperty({
        example: 'david@test.com',
        description: "The user's email address.",
    })
    email: string

    @ApiProperty({
        example: '$2a$14$.nywJt3bPWo7f2tpuGOjWu1.rBpJX2kpU94yQoIzcnyzwlAexEsRe',
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
}

// CreateUserDto for POST requests
export class CreateUserDto {
    @ApiProperty({
        example: 'example@test.com',
        description: "The user's email address.",
    })
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty({
        example: 'password123',
        description: "The user's password.",
    })
    @IsString()
    @IsNotEmpty()
    password: string

    @ApiProperty({
        example: 'David',
        description: "The user's alias or display name.",
    })
    @IsString()
    @IsNotEmpty()
    alias: string

    @ApiProperty({
        example: 'https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg',
        description: "The URL of the user's profile image.",
    })
    @IsUrl()
    @IsNotEmpty()
    imageUrl: string
}

// UpdateUserDto for PUT requests (all fields optional)
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Createe user but without imageUrl
export class RegisterUserDto extends PickType(CreateUserDto, ['email', 'alias', 'password']) {}
export class LoginUserDto extends PickType(CreateUserDto, ['email', 'password']) {}
