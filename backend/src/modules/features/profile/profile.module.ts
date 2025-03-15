import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'
import { GroupMembershipsModule } from '../../core/group-memberships/group-memberships.module'
import { GroupsModule } from '../../core/groups/groups.module'
import { InvitationsModule } from '../../core/invitations/invitations.module'
import { NotificationsModule } from '../../core/notifications/notifications.module'
import { UsersModule } from '../../core/users/users.module'

import { ProfileController } from './profile.controller'
import { ProfileService } from './profile.service'

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
