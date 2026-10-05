import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { UpdateUserBody } from './user.type.js'

describe('UpdateUserBody avatar', () => {
    const avatar = { backgroundColor: '#EF4444', iconName: null, emoji: '😎', type: 'emoji', initials: '' }

    async function avatarErrors(value: object) {
        const [error] = await validate(plainToInstance(UpdateUserBody, { avatar: value }), { whitelist: true, forbidNonWhitelisted: true })

        return (error?.children ?? []).map(child => child.property)
    }

    it('accepts an emoji or icon avatar whose initials are empty', async () => {
        expect(await avatarErrors(avatar)).toEqual([])
        expect(await avatarErrors({ ...avatar, type: 'icon', iconName: 'person-fill', emoji: null })).toEqual([])
    })

    it('requires initials for an initials avatar', async () => {
        expect(await avatarErrors({ ...avatar, type: 'initials', emoji: null })).toEqual(['initials'])
        expect(await avatarErrors({ ...avatar, type: 'initials', emoji: null, initials: 'BL' })).toEqual([])
    })

    it('still bounds and types the initials', async () => {
        expect(await avatarErrors({ ...avatar, initials: 'a'.repeat(9) })).toEqual(['initials'])
        expect(await avatarErrors({ ...avatar, initials: 42 })).toEqual(['initials'])
        expect(await avatarErrors({ ...avatar, initials: undefined })).toEqual(['initials'])
    })
})
