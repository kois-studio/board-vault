import type { GroupPersonWorkspaceType } from '../../api/api.types'
import { canTakePart } from './groupPeople'

describe('canTakePart', () => {
    const entry = (person: Partial<GroupPersonWorkspaceType['person']>) =>
        ({
            person: { id: 1, accountId: null, displayName: 'Ana', status: 'active', avatar: null, ...person },
        }) as unknown as GroupPersonWorkspaceType

    it('lets members and people without an account take part', () => {
        expect(canTakePart(entry({ accountId: 6, standing: 'member' }))).toBe(true)
        expect(canTakePart(entry({ kind: 'placeholder' } as never))).toBe(true)
    })

    it('leaves out archived people, people who left the group, and deleted accounts', () => {
        expect(canTakePart(entry({ status: 'archived' }))).toBe(false)
        expect(canTakePart(entry({ accountId: 5, standing: 'left' }))).toBe(false)
        expect(canTakePart(entry({ accountId: 5, standing: 'deleted' }))).toBe(false)
    })
})
