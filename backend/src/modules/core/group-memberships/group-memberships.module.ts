import { Module } from '@nestjs/common'
import { GroupMembershipsService } from './group-memberships.service'
import { GroupMembershipsController } from './group-memberships.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [GroupMembershipsService],
    exports: [GroupMembershipsService],
    controllers: [GroupMembershipsController],
})
export class GroupMembershipsModule {}
