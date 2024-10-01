import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginUserDto, RegisterUserDto } from 'src/common/types/shared/user.type'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    /**
     * ## Create a user
     * @returns
     */
    @Post('/register')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'The user has been succesfully created' })
    async createUser(@Body() userDto: RegisterUserDto) {
        return this.authService.register(userDto.email, userDto.alias, userDto.password)
    }

    /**
     * ## Login a user
     * @returns JWT token
     */
    @Post('/login')
    @ApiOperation({ summary: 'Log in a user' })
    @ApiResponse({ status: 200, description: 'Successfully logged in' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async loginUser(@Body() loginDto: LoginUserDto) {
        return this.authService.login(loginDto.email, loginDto.password)
    }
}
