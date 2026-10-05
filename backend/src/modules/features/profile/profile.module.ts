import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { GameProposalModule } from '../../core/game-proposal/game-proposal.module.js'
import { GroupsModule } from '../../core/groups/groups.module.js'
import { InvitationsModule } from '../../core/invitations/invitations.module.js'
import { NotificationsModule } from '../../core/notifications/notifications.module.js'
import { UsersModule } from '../../core/users/users.module.js'

import { ProfileController } from './profile.controller.js'
import { ProfileService } from './profile.service.js'

@Module({
    imports: [CacheModule, DatabaseModule, UsersModule, NotificationsModule, GroupsModule, InvitationsModule, GameProposalModule],
    providers: [ProfileService],
    exports: [ProfileService],
    controllers: [ProfileController],
})
export class ProfileModule {}
