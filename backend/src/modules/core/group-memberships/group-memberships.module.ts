import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { GroupMembershipsController } from './group-memberships.controller'
import { GroupMembershipsService } from './group-memberships.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [GroupMembershipsService],
    exports: [GroupMembershipsService],
    controllers: [GroupMembershipsController],
})
export class GroupMembershipsModule {}
