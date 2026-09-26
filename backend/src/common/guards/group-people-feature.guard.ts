import { CanActivate, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class GroupPeopleFeatureGuard implements CanActivate {
    canActivate(): boolean {
        if (process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED?.trim().toLowerCase() === 'false') {
            throw new NotFoundException('Group-person features are temporarily unavailable')
        }

        return true
    }
}
