import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common'

import { GroupsService } from '../../modules/core/groups/groups.service'

@Injectable()
export class GroupOwnerGuard implements CanActivate {
    private readonly LOGGER = new Logger(this.constructor.name)

    constructor(private readonly groupsService: GroupsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const userId = Number(request.user?.userId)
        const groupId = Number(request.params.groupId)

        if (!userId || !groupId) {
            throw new ForbiddenException('Missing user or group information')
        }

        const group = await this.groupsService.getGroupById(groupId)

        if (group.createdBy !== userId) {
            this.LOGGER.warn(`User ${userId} attempted to access group ${groupId} as its owner`)
            throw new ForbiddenException('You are not the owner of this group')
        }

        return true
    }
}
