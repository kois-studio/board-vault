import { isPlainName, readableName } from './plainName'

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
    ])('accepts %s', (name) => {
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

describe('readable names saved before the rule (#350)', () => {
    it('keeps a plain name as it is', () => {
        expect(readableName('Ana Ruiz-Sáez 🎲')).toBe('Ana Ruiz-Sáez 🎲')
    })

    it('leaves the layout characters out', () => {
        expect(readableName('Private Group ⸻⸻⸻⸻')).toBe('Private Group')
        expect(readableName('A​na‮')).toBe('Ana')
    })

    it('keeps three characters of a name with nothing readable', () => {
        expect(readableName('⸻⸻⸻⸻⸻⸻')).toBe('⸻⸻⸻…')
    })
})
