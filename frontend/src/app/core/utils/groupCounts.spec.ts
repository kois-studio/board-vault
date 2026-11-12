import { groupGameCount, groupPeopleCount } from './groupCounts'

describe('group counts', () => {
    it('counts members and people without an account', () => {
        expect(groupPeopleCount({ gameCount: 0, members: [{}, {}], placeholders: [{}] })).toBe(3)
        expect(groupPeopleCount({ gameCount: 0, members: [{}] })).toBe(1)
    })

    it('counts the group’s games as the server does, each once whoever owns it (#262)', () => {
        expect(groupGameCount({ gameCount: 11, members: [{}], placeholders: [{}, {}] })).toBe(11)
        expect(groupGameCount({ gameCount: 0, members: [] })).toBe(0)
    })
})
