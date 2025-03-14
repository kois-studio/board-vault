import { Module } from '@nestjs/common'
import { ProfileService } from './profile.service'
import { ProfileController } from './profile.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { NotificationsModule } from '../../core/notifications/notifications.module'
import { GroupsModule } from '../../core/groups/groups.module'
import { InvitationsModule } from '../../invitations/invitations.module'
import { GroupMembershipsModule } from '../../core/group-memberships/group-memberships.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        NotificationsModule,
        GroupsModule,
        InvitationsModule,
        GroupMembershipsModule,
    ],
    providers: [ProfileService],
    exports: [ProfileService],
    controllers: [ProfileController],
})
export class ProfileModule {}
