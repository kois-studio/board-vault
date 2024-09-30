import { Controller, Logger } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    private readonly logger: Logger

    constructor() {
        this.logger = new Logger(this.constructor.name)
    }
}
