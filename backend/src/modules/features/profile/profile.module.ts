import { Module } from '@nestjs/common'
import { ProfileService } from './profile.service'
import { ProfileController } from './profile.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { NotificationsModule } from 'src/modules/core/notifications/notifications.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        NotificationsModule,
    ],
    providers: [ProfileService],
    exports: [ProfileService],
    controllers: [ProfileController],
})
export class ProfileModule {}
