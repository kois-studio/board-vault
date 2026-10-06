import { containsPattern, LIKE_ESCAPE } from './like-pattern.js'

describe('containsPattern', () => {
    it('matches the term anywhere', () => {
        expect(containsPattern('love-letter')).toBe('%love-letter%')
    })

    it('reads LIKE wildcards and the escape character as plain characters', () => {
        expect(containsPattern('__')).toBe('%\\_\\_%')
        expect(containsPattern('50%')).toBe('%50\\%%')
        expect(containsPattern('a\\b')).toBe('%a\\\\b%')
    })

    it('pairs with an escape clause on that same character', () => {
        expect(LIKE_ESCAPE).toBe("ESCAPE '\\'")
    })
})
