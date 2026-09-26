import { ForbiddenException } from '@nestjs/common'

import { GroupPeopleService } from './group-people.service'

describe('GroupPeopleService participant boundaries', () => {
    const personRow = [21, 12, null, 'placeholder', 'active', 'Ana', null, '2026-09-26', '2026-09-26', null]

    function createService(overrides: Record<string, jest.Mock> = {}) {
        const databaseService = {
            getGroupMembershipById: jest.fn().mockResolvedValue({ rows: [[1, 12]] }),
            getGroupById: jest.fn().mockResolvedValue({ rows: [[12, null, 7]] }),
            getUserById: jest.fn().mockResolvedValue({ rows: [[7, 'friend@example.com', null, 'friend', null, 'Friend']] }),
            getClaimableGroupPersonIds: jest.fn().mockResolvedValue({ rows: [[21]] }),
            getGroupPeople: jest.fn().mockResolvedValue({ rows: [personRow] }),
            getGroupPersonOwnership: jest.fn().mockResolvedValue({ rows: [[42, 'asserted', 'placeholder_setup', 7, null, 'a', 'b']] }),
            getGroupPersonPreferences: jest.fn().mockResolvedValue({ rows: [[42, 'favorite', 'placeholder_setup', 7, 'a', 'b']] }),
            getGroupPersonById: jest.fn().mockResolvedValue({ rows: [personRow] }),
            getGameById: jest.fn().mockResolvedValue({ rows: [[42]] }),
            claimGroupPerson: jest.fn().mockResolvedValue({ claimed: true, alreadyClaimed: false }),
            getLinkedGroupPersonByAccount: jest.fn().mockResolvedValue({ rows: [] }),
            createLinkedGroupPerson: jest.fn().mockResolvedValue({ lastInsertRowid: 22 }),
            ...overrides,
        }

        return { service: new GroupPeopleService(databaseService as never), databaseService }
    }

    it('marks only email-targeted placeholders as claimable', async () => {
        const { service } = createService()

        await expect(service.getWorkspace(7, 12)).resolves.toEqual([
            expect.objectContaining({
                claimable: true,
                person: expect.objectContaining({ id: 21, kind: 'placeholder' }),
            }),
        ])
    })

    it('uses the authenticated account email and never trusts claim selections as identity', async () => {
        const { service, databaseService } = createService()

        await expect(service.claim(7, 12, 21, { ownershipGameIds: [42, 999], preferenceGameIds: [42] })).resolves.toEqual({
            success: true,
            alreadyClaimed: false,
        })
        expect(databaseService.claimGroupPerson).toHaveBeenCalledWith({
            groupId: 12,
            groupPersonId: 21,
            accountId: 7,
            email: 'friend@example.com',
            keepOwnershipGameIds: [42],
            keepPreferenceGameIds: [42],
            importOwnershipToCollection: false,
        })
    })

    it('rejects a non-member before reading or mutating participant data', async () => {
        const { service, databaseService } = createService({ getGroupMembershipById: jest.fn().mockResolvedValue({ rows: [] }) })

        await expect(service.claim(99, 12, 21, {})).rejects.toBeInstanceOf(ForbiddenException)
        expect(databaseService.getUserById).not.toHaveBeenCalled()
        expect(databaseService.claimGroupPerson).not.toHaveBeenCalled()
    })

    it('makes joining as a new person idempotent', async () => {
        const existing = { ...personRow, 2: 7, 3: 'linked', 5: 'Friend' }
        const { service, databaseService } = createService({
            getLinkedGroupPersonByAccount: jest.fn().mockResolvedValue({ rows: [existing] }),
        })

        await expect(service.joinAsNewPerson(7, 12)).resolves.toEqual(expect.objectContaining({ id: 21, kind: 'linked' }))
        expect(databaseService.createLinkedGroupPerson).not.toHaveBeenCalled()
    })
})
