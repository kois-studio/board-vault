import { Module } from '@nestjs/common'

import { GroupPeopleFeatureGuard } from '../../../common/guards/group-people-feature.guard.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { GameTitlesModule } from '../game-titles/game-titles.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'

import { GroupPeopleController } from './group-people.controller.js'
import { GroupPeopleService } from './group-people.service.js'

@Module({
    imports: [DatabaseModule, GameTitlesModule, NotificationsModule],
    providers: [GroupPeopleService, GroupPeopleFeatureGuard],
    exports: [GroupPeopleService],
    controllers: [GroupPeopleController],
})
export class GroupPeopleModule {}
