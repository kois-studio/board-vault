import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common'

import { GroupsService } from '../../modules/core/groups/groups.service'

@Injectable()
export class GroupOwnerGuard implements CanActivate {
    private readonly LOGGER = new Logger(this.constructor.name)

    constructor(private readonly groupsService: GroupsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const userId = Number(request.user?.userId)
        // Canonical group routes carry the identifier in the URL. Deprecated
        // invitation creation keeps it in the request body, so ownership must
        // be enforced consistently at both boundaries.
        const groupId = Number(request.params.groupId ?? request.body?.groupId)

        if (!userId || !groupId) {
            throw new ForbiddenException('Missing user or group information')
        }

        const group = await this.groupsService.getGroupById(groupId)

        if (group.createdBy !== userId) {
            this.LOGGER.warn('A user attempted to access a group-owner action without ownership')
            throw new ForbiddenException('You are not the owner of this group')
        }

        return true
    }
}
