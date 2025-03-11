import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UsersService } from '../../users/users.service'
import type { GroupWithMembersAndGames } from 'src/common/types/group.type'
import { GroupsService } from 'src/modules/groups/groups.service'
import { GroupMembershipsService } from 'src/modules/core/group-memberships/group-memberships.service'

@Injectable()
export class DashboardService {
    constructor(
        private readonly usersService: UsersService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
    ) {}

    @LogFeature(new Logger('DashboardService'))
    async getGroupsOfUser(userId: number): Promise<Array<GroupWithMembersAndGames>> {
        const memberships = await this.groupMembershipsService.getGroupMembershipsByAccountId(userId)
        const groups = await Promise.all(memberships.map(async membership => this.groupsService.getGroupById(membership.groupId)))



        // return Promise.all(groups.map(async group => this.groupsService.getGroupById(group.id)))
        return []
    }
}
