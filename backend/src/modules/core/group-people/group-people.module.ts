import { Module } from '@nestjs/common'

import { GroupPeopleFeatureGuard } from '../../../common/guards/group-people-feature.guard'
import { DatabaseModule } from '../../common/database/database.module'

import { GroupPeopleController } from './group-people.controller'
import { GroupPeopleService } from './group-people.service'

@Module({
    imports: [DatabaseModule],
    providers: [GroupPeopleService, GroupPeopleFeatureGuard],
    exports: [GroupPeopleService],
    controllers: [GroupPeopleController],
})
export class GroupPeopleModule {}
