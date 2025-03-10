import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UsersService } from '../../users/users.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import type { UserGetDto } from '../../../common/types/user.type'
import type { NotificationDto } from '../../../common/types/notification.type'

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
    ) {}

    @LogFeature(new Logger('ProfileService'))
    async getUserByEmail(email: string): Promise<UserGetDto> {
        return this.usersService.getUserByEmail(email)
    }

    @LogFeature(new Logger('ProfileService'))
    async getNotificationsByAccountId(accountId: number): Promise<Array<NotificationDto>> {
        return this.notificationsService.getNotificationsByAccountId(accountId)
    }
}
