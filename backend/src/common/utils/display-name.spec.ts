import { DISPLAY_NAME_MAX_LENGTH, shortName } from './display-name.js'

describe('short display names', () => {
    it('keeps a name within the limit as it is', () => {
        expect(shortName('Ana')).toBe('Ana')
        expect(shortName('W'.repeat(DISPLAY_NAME_MAX_LENGTH))).toBe('W'.repeat(DISPLAY_NAME_MAX_LENGTH))
    })

    it('cuts a longer name to the limit, ellipsis included', () => {
        expect(shortName('SomeVerySuperLongNameForBoardVault')).toBe('SomeVerySuperLongNa…')
        expect(shortName('W'.repeat(100))).toHaveLength(DISPLAY_NAME_MAX_LENGTH)
    })

    it('does not leave a space before the ellipsis', () => {
        expect(shortName('Bartholomew Montgom ery the Third')).toBe('Bartholomew Montgom…')
        expect(shortName('Bartholomew Montgo ery the Third')).toBe('Bartholomew Montgo…')
    })

    it('never splits an emoji or an accented letter', () => {
        expect(shortName(`${'a'.repeat(18)}👩‍👩‍👧‍👦 more`)).toBe(`${'a'.repeat(18)}👩‍👩‍👧‍👦…`)
    })
})
