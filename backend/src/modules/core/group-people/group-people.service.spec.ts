import { ForbiddenException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { GroupPeopleService } from './group-people.service'

import type { Mock } from 'vitest'

describe('GroupPeopleService participant boundaries', () => {
    const personRow = [21, 12, null, 'placeholder', 'active', 'Ana', null, '2026-09-26', '2026-09-26', null]

    function createService(overrides: Record<string, Mock> = {}) {
        const databaseService = {
            getGroupMembershipById: vi.fn().mockResolvedValue({ rows: [[1, 12]] }),
            getGroupById: vi.fn().mockResolvedValue({ rows: [[12, null, 7]] }),
            getUserById: vi
                .fn()
                .mockResolvedValue({ rows: [{ id: 7, email: 'friend@example.com', username: 'friend', displayName: 'Friend' }] }),
            getClaimableGroupPersonIds: vi.fn().mockResolvedValue({ rows: [[21]] }),
            getGroupPersonGameCatalog: vi.fn().mockResolvedValue({ rows: [[42, 'image', 60, 2, 4, 'Catan', 'Catan', 'Catán']] }),
            getGroupPeople: vi.fn().mockResolvedValue({ rows: [personRow] }),
            getGroupPersonOwnership: vi.fn().mockResolvedValue({ rows: [[42, 'asserted', 'placeholder_setup', 7, null, 'a', 'b']] }),
            getGroupPersonPreferences: vi.fn().mockResolvedValue({ rows: [[42, 'favorite', 'placeholder_setup', 7, 'a', 'b']] }),
            getGroupPersonById: vi.fn().mockResolvedValue({ rows: [personRow] }),
            getGameById: vi.fn().mockResolvedValue({ rows: [[42]] }),
            claimGroupPerson: vi.fn().mockResolvedValue({ claimed: true, alreadyClaimed: false }),
            getLinkedGroupPersonByAccount: vi.fn().mockResolvedValue({ rows: [] }),
            createLinkedGroupPerson: vi.fn().mockResolvedValue({ lastInsertRowid: 22 }),
            ...overrides,
        }

        return { service: new GroupPeopleService(fakeDatabase(databaseService)), databaseService }
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

    it('returns a group-scoped catalog for ownership assertions without exposing private collections', async () => {
        const { service, databaseService } = createService()

        await expect(service.getCatalog(7, 12, 'catan')).resolves.toEqual([
            expect.objectContaining({ id: 42, title: 'Catan', titleTranslations: { en: 'Catan', es: 'Catán' } }),
        ])
        expect(databaseService.getGroupPersonGameCatalog).toHaveBeenCalledWith('catan')
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
        const { service, databaseService } = createService({ getGroupMembershipById: vi.fn().mockResolvedValue({ rows: [] }) })

        await expect(service.claim(99, 12, 21, {})).rejects.toBeInstanceOf(ForbiddenException)
        expect(databaseService.getUserById).not.toHaveBeenCalled()
        expect(databaseService.claimGroupPerson).not.toHaveBeenCalled()
    })

    it('makes joining as a new person idempotent', async () => {
        const existing = { ...personRow, 2: 7, 3: 'linked', 5: 'Friend' }
        const { service, databaseService } = createService({
            getLinkedGroupPersonByAccount: vi.fn().mockResolvedValue({ rows: [existing] }),
        })

        await expect(service.joinAsNewPerson(7, 12)).resolves.toEqual(expect.objectContaining({ id: 21, kind: 'linked' }))
        expect(databaseService.createLinkedGroupPerson).not.toHaveBeenCalled()
    })
})
