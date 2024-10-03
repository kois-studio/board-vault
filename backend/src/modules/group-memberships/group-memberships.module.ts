import { Module } from '@nestjs/common'
import { GroupMembershipsService } from './group-memberships.service'
import { GroupMembershipsController } from './group-memberships.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [GroupMembershipsService, DatabaseService],
    exports: [GroupMembershipsService],
    controllers: [GroupMembershipsController],
})
export class GroupMembershipsModule {}
