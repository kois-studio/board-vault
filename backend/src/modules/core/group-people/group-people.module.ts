import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { GroupPeopleController } from './group-people.controller'
import { GroupPeopleService } from './group-people.service'

@Module({
    imports: [DatabaseModule],
    providers: [GroupPeopleService],
    exports: [GroupPeopleService],
    controllers: [GroupPeopleController],
})
export class GroupPeopleModule {}
