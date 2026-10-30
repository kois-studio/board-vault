import { settingsSections } from './settings.component'

describe('settingsSections', () => {
    it('lists Language after Appearance when there are languages to choose from', () => {
        expect(settingsSections(true).items.map((item) => item.link)).toEqual([
            '/settings/profile',
            '/settings/appearance',
            '/settings/language',
            '/settings/account',
            '/settings/privacy',
        ])
    })

    it('leaves Language out when there is nothing to choose', () => {
        expect(settingsSections(false).items.map((item) => item.link)).not.toContain('/settings/language')
    })
})
