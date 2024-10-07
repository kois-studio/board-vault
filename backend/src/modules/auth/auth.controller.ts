import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginUserDto, RegisterUserDto } from '../../common/types/user.type'
import { AccessTokenDto, SuccessDto } from '../../common/types/auth.type'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('/register')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'The user has been succesfully created' })
    async createUser(@Body() userDto: RegisterUserDto) {
        return this.authService.register(userDto.email, userDto.username, userDto.password)
    }

    @Post('/login')
    @ApiOperation({ summary: 'Log in a user' })
    @ApiResponse({ status: 201, type: AccessTokenDto, description: 'Successfully logged in' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async loginUser(@Body() loginDto: LoginUserDto) {
        return this.authService.login(loginDto.email, loginDto.password)
    }
}
