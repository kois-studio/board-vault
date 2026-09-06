import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { CreateGameProposalBody } from './game-proposal.type'
import { LegacyCreateGroupParams } from './group.type'
import { CreateNotificationRequestBody } from './notification.type'
import { CreatePlaySessionBody, UpdateSessionShortlistBody } from './session.type'
import { RegisterUserDto, UserUpdateGamesBody } from './user.type'

describe('request boundary limits', () => {
    async function validationErrors<T extends object>(type: new () => T, value: object) {
        return validate(plainToInstance(type, value))
    }

    it('bounds legacy registration credentials and proposal text', async () => {
        const registrationErrors = await validationErrors(RegisterUserDto, {
            email: 'friend@example.com',
            username: 'a'.repeat(51),
            password: 'a'.repeat(129),
        })
        const proposalErrors = await validationErrors(CreateGameProposalBody, {
            title: 'a'.repeat(201),
        })

        expect(registrationErrors.map(error => error.property)).toEqual(expect.arrayContaining(['username', 'password']))
        expect(proposalErrors.map(error => error.property)).toContain('title')
    })

    it('bounds notification text and bulk collection updates', async () => {
        const notificationErrors = await validationErrors(CreateNotificationRequestBody, {
            type: 'a'.repeat(101),
            message: 'a'.repeat(1001),
            data: {},
        })
        const collectionErrors = await validationErrors(UserUpdateGamesBody, {
            gamesToAdd: Array.from({ length: 1001 }, (_, index) => index + 1),
            gamesToRemove: [],
        })

        expect(notificationErrors.map(error => error.property)).toEqual(expect.arrayContaining(['type', 'message']))
        expect(collectionErrors.map(error => error.property)).toContain('gamesToAdd')
    })

    it('bounds session collections without rejecting the intentional empty shortlist', async () => {
        const shortlistErrors = await validationErrors(UpdateSessionShortlistBody, {
            plannedGameIds: Array.from({ length: 101 }, (_, index) => index + 1),
        })
        const sessionErrors = await validationErrors(CreatePlaySessionBody, {
            groupId: 1,
            sessionDate: '2026-09-13T19:30:00.000Z',
            timezone: 'Europe/Madrid',
            attendeeIds: [1],
            games: Array.from({ length: 101 }, (_, index) => ({ gameId: index + 1, participantIds: [1] })),
        })

        expect(shortlistErrors.map(error => error.property)).toContain('plannedGameIds')
        expect(sessionErrors.map(error => error.property)).toContain('games')
    })

    it('bounds the deprecated URL-based group creation parameters', async () => {
        const errors = await validationErrors(LegacyCreateGroupParams, {
            userId: '7',
            groupName: 'a'.repeat(101),
        })

        expect(errors.map(error => error.property)).toContain('groupName')
        expect(errors.map(error => error.property)).not.toContain('userId')
    })
})
