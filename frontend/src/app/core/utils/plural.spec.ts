import { CountPipe, PlayersPipe } from '../pipes/count.pipe'
import { countOf, playerRange } from './plural'

describe('plural', () => {
    it('counts one in the singular and the rest in the plural', () => {
        expect(countOf(1, 'game')).toBe('1 game')
        expect(countOf(0, 'game')).toBe('0 games')
        expect(countOf(3, 'game')).toBe('3 games')
        expect(countOf(1, 'person', 'people')).toBe('1 person')
        expect(countOf(2, 'person', 'people')).toBe('2 people')
    })

    it('shows one number when a game takes an exact number of players', () => {
        expect(playerRange(2, 4)).toBe('2–4 players')
        expect(playerRange(2, 2)).toBe('2 players')
        expect(playerRange(1, 1)).toBe('1 player')
        expect(playerRange(2, 4, true)).toBe('2–4')
        expect(playerRange(2, 2, true)).toBe('2')
    })

    it('works the same through the template pipes', () => {
        expect(new CountPipe().transform(1, 'vote')).toBe('1 vote')
        expect(new PlayersPipe().transform({ minPlayers: 2, maxPlayers: 2 })).toBe('2 players')
        expect(new PlayersPipe().transform({ minPlayers: 3, maxPlayers: 5 }, 'short')).toBe('3–5')
    })
})
