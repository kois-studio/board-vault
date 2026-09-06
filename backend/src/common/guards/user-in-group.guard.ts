import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'

import { safeErrorName } from '../../common/logging/structured-log'
import { GroupMembershipsService } from '../../modules/core/group-memberships/group-memberships.service'

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

        try {
            // Check if the user is a member of the group
            const membership = await this.groupMembershipsService.getSafeGroupMembershipById(userId, groupId)

            if (!membership) {
                this.LOGGER.error(`User ${userId} is not a member of group ${groupId}`)
                throw new ForbiddenException('You are not a member of this group and do not have permission to access this information')
            }

            return true // User is in the group
        } catch (error) {
            this.LOGGER.error(`Error checking group membership (${safeErrorName(error)})`)
            throw new ForbiddenException('Error verifying group membership')
        }
    }
}
