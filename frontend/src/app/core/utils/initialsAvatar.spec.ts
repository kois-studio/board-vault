import { initialsAvatar } from './initialsAvatar'

describe('initialsAvatar', () => {
    it('falls back to initials for people without an avatar', () => {
        expect(initialsAvatar('ana belén')).toEqual(expect.objectContaining({ type: 'initials', initials: 'AB' }))
        expect(initialsAvatar('Nora')).toEqual(expect.objectContaining({ initials: 'N' }))
    })
})
