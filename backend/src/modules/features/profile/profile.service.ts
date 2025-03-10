import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import type { UserCompleteDto, UserGetDto } from '../../../common/types/user.type'
import { UsersService } from '../../users/users.service'

@Injectable()
export class ProfileService {
    constructor(private readonly usersService: UsersService) {}

    @LogFeature(new Logger('ProfileService'))
    async getUserByEmail(email: string): Promise<UserGetDto> {
        return this.usersService.getUserByEmail(email)
    }
}
