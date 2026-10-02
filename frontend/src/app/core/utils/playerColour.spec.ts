import { PLAYER_COLOURS, playerColourStyle } from './playerColour'

describe('playerColourStyle', () => {
    it('renders each player colour through its theme token', () => {
        PLAYER_COLOURS.forEach((hex, index) => {
            expect(playerColourStyle(hex)).toEqual({ background: `var(--bv-player-${index + 1})`, color: 'var(--bv-on-player)' })
        })
    })

    it('maps colours of the earlier palette onto a player colour', () => {
        expect(playerColourStyle('#6366f1').background).toBe('var(--bv-player-7)')
        expect(playerColourStyle('#EF4444').background).toBe('var(--bv-player-1)')
    })

    it('renders greys as a neutral avatar and keeps unknown colours', () => {
        expect(playerColourStyle('#1F2937')).toEqual({ background: 'var(--bv-text-muted)', color: 'var(--bv-surface)' })
        expect(playerColourStyle('#123456')).toEqual({ background: '#123456', color: '#FFFFFF' })
    })
})
