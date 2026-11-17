import { isPlainName } from './is-plain-name.js'

describe('plain names (#350)', () => {
    it.each([
        'Ana',
        'José María',
        "D'Artagnan",
        'Jean-Luc',
        'Ana – the second',
        'Mr. T & co.',
        'Nguyễn Thị',
        '小明',
        'محمد',
        'राहुल',
        'Ola 👋',
        '👩‍👩‍👧‍👦',
        '🇪🇸',
        'Player 2',
        'DuckDevs TestGroup',
    ])('accepts %s', name => {
        expect(isPlainName(name)).toBe(true)
    })

    it.each([
        ['long dashes', '⸻⸻⸻'],
        ['a long dash among letters', 'Private Group ⸻⸻'],
        ['box drawing', 'Ana ━━━'],
        ['block elements', '█████'],
        ['the widest ligature', '﷽'],
        ['a bidi override', 'Ana‮evil'],
        ['a zero-width space', 'A​na'],
        ['a line break', 'Ana\nBen'],
        ['a tab', 'Ana\tBen'],
        ['stacked marks', `A${'́'.repeat(8)}na`],
        ['private use', 'Ana '],
        ['only punctuation', '...'],
        ['only spaces', '   '],
    ])('refuses %s', (_, name) => {
        expect(isPlainName(name)).toBe(false)
    })
})
