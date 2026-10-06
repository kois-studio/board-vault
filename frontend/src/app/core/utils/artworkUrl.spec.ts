import { resolveArtworkUrl } from './artworkUrl'

describe('resolveArtworkUrl', () => {
    it('serves stored artwork from the API', () => {
        expect(resolveArtworkUrl('/artwork/12-0123456789abcdef.webp', 'https://backend.board-vault.com/')).toBe(
            'https://backend.board-vault.com/artwork/12-0123456789abcdef.webp',
        )
    })

    it('leaves an external address and no artwork alone', () => {
        expect(resolveArtworkUrl('https://example.com/box.png', 'https://backend.board-vault.com')).toBe('https://example.com/box.png')
        expect(resolveArtworkUrl('', 'https://backend.board-vault.com')).toBe('')
    })
})
