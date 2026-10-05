import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { GroupMembershipsController } from './group-memberships.controller.js'
import { GroupMembershipsService } from './group-memberships.service.js'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [GroupMembershipsService],
    exports: [GroupMembershipsService],
    controllers: [GroupMembershipsController],
})
export class GroupMembershipsModule {}
