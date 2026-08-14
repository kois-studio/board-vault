import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'

import { CollectionController } from '../../modules/features/collection/collection.controller'
import { DashboardController } from '../../modules/features/dashboard/dashboard.controller'
import { PlayController } from '../../modules/features/play/play.controller'
import { ProfileController } from '../../modules/features/profile/profile.controller'
import { UsersController } from '../../modules/core/users/users.controller'

import { UserOwnershipGuard } from './ownership.guard'

const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
        switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext

const hasOwnershipGuard = (controller: object, method: string) => {
    const handler = (controller as Record<string, unknown>)[method] as object

    return (Reflect.getMetadata(GUARDS_METADATA, handler) as Array<unknown> | undefined)?.includes(UserOwnershipGuard)
}

describe('UserOwnershipGuard', () => {
    it('allows a request when the route user matches the authenticated user', () => {
        const guard = new UserOwnershipGuard()

        expect(guard.canActivate(createContext({ user: { userId: 7 }, params: { userId: '7' } }))).toBe(true)
    })

    it('denies a request when the route user differs from the authenticated user', () => {
        const guard = new UserOwnershipGuard()

        expect(() => guard.canActivate(createContext({ user: { userId: 7 }, params: { userId: '8' } }))).toThrow(ForbiddenException)
    })

    it('is attached to user-scoped read routes', () => {
        expect(hasOwnershipGuard(UsersController.prototype, 'getUserById')).toBe(true)
        expect(hasOwnershipGuard(DashboardController.prototype, 'getGroupsOfUser')).toBe(true)
        expect(hasOwnershipGuard(CollectionController.prototype, 'getGamesOwnedByUser')).toBe(true)
        expect(hasOwnershipGuard(CollectionController.prototype, 'getGamesNotOwnedByUser')).toBe(true)
        expect(hasOwnershipGuard(CollectionController.prototype, 'getReviewsOfUser')).toBe(true)
        expect(hasOwnershipGuard(CollectionController.prototype, 'getUserWishlist')).toBe(true)
        expect(hasOwnershipGuard(PlayController.prototype, 'getUserGamesHistory')).toBe(true)
        expect(hasOwnershipGuard(ProfileController.prototype, 'getUserById')).toBe(true)
        expect(hasOwnershipGuard(ProfileController.prototype, 'getNotificationsByAccountId')).toBe(true)
        expect(hasOwnershipGuard(ProfileController.prototype, 'getUserInvitations')).toBe(true)
    })

    it('protects every collection read and mutation route', () => {
        const collectionMethods = [
            'getGamesOwnedByUser',
            'getGameViewByUserId',
            'addGameToUserCollection',
            'removeGameFromUserCollection',
            'updateGameOwnership',
            'toggleWishlist',
            'getGamesNotOwnedByUser',
            'getReviewsOfUser',
            'saveGameReview',
            'getUserWishlist',
            'getUserCollectionActivities',
        ]

        for (const method of collectionMethods) {
            expect(hasOwnershipGuard(CollectionController.prototype, method)).toBe(true)
        }
    })
})
