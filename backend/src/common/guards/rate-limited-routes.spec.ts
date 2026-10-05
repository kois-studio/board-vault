import { GUARDS_METADATA } from '@nestjs/common/constants'

import { GroupsController } from '../../modules/core/groups/groups.controller.js'
import { InvitationsController } from '../../modules/core/invitations/invitations.controller.js'
import { ProfileController } from '../../modules/features/profile/profile.controller.js'

import { RATE_LIMIT_METADATA, RateLimitGuard } from './rate-limit.guard.js'

// Routes that send email or create shared records must stay rate limited.
describe('rate-limited routes', () => {
    const cases = [
        ['POST /groups/:groupId/clerk-invitations', GroupsController.prototype.createClerkInvitation],
        ['POST /invitations', InvitationsController.prototype.createInvitation],
        ['POST /invitations/byUsername', InvitationsController.prototype.createInvitationByUsername],
        ['POST /profile/users/:userId/proposals', ProfileController.prototype.createGameProposal],
    ] as const

    it.each(cases)('%s has RateLimitGuard and a budget', (_route, handler) => {
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RateLimitGuard)
        expect(Reflect.getMetadata(RATE_LIMIT_METADATA, handler)).toEqual(
            expect.objectContaining({ limit: expect.any(Number), windowSeconds: expect.any(Number) }),
        )
    })
})
