import { getCorsOrigins } from './cors'

describe('getCorsOrigins', () => {
    it('keeps localhost out of production defaults', () => {
        expect(getCorsOrigins('production')).toEqual(['https://board-vault.com'])
    })

    it('includes local development origins outside production', () => {
        expect(getCorsOrigins('development')).toEqual([
            'https://board-vault.com',
            'http://localhost:4200',
            'http://127.0.0.1:4200',
            'http://localhost:4300',
            'http://127.0.0.1:4300',
        ])
    })

    it('deduplicates configured origins and ignores wildcard configuration', () => {
        expect(getCorsOrigins('production', 'https://board-vault.com, https://preview.board-vault.com, *')).toEqual([
            'https://board-vault.com',
            'https://preview.board-vault.com',
        ])
    })
})
