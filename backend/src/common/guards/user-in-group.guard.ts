import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'

import { safeErrorName } from '../../common/logging/structured-log.js'
import { GroupMembershipsService } from '../../modules/core/group-memberships/group-memberships.service.js'

@Injectable()
export class UserInGroupGuard implements CanActivate {
    private readonly LOGGER = new Logger(this.constructor.name)

    constructor(private readonly groupMembershipsService: GroupMembershipsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const user: undefined | { userId: number } = request.user // Set by JwtStrategy
        const userId = Number(user?.userId)
        const groupId = Number(request.params.groupId ?? request.body?.groupId)

        if (!userId || !groupId) {
            this.LOGGER.error('Missing userId or groupId')
            throw new ForbiddenException('Missing user or group information')
        }

        // Only a missing membership means "not in the group" (403). A failed lookup, such as a database timeout, is
        // rethrown as is so ApiErrorFilter answers 503 (or 500) and a member is never told they are not one (#245).
        let membership: Awaited<ReturnType<GroupMembershipsService['getSafeGroupMembershipById']>>

        try {
            membership = await this.groupMembershipsService.getSafeGroupMembershipById(userId, groupId)
        } catch (error) {
            // A warning: ApiErrorFilter logs the failure itself (provider.timeout or http.request.failed).
            this.LOGGER.warn(`Error checking group membership (${safeErrorName(error)})`)
            throw error
        }

        if (!membership) {
            this.LOGGER.error('A user attempted to access a group without membership')
            throw new ForbiddenException('You are not a member of this group and do not have permission to access this information')
        }

        return true // User is in the group
    }
}
