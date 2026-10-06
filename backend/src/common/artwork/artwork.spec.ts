import sharp from 'sharp'

import { ArtworkError, downloadArtwork, processArtwork, storedArtworkPath } from './artwork.js'

const publicHost = async () => ['93.184.215.14']

function imageResponse(body: Buffer | string, headers: Record<string, string> = {}, status = 200): Response {
    return new Response(typeof body === 'string' ? body : new Uint8Array(body), {
        status,
        headers: { 'content-type': 'image/png', ...headers },
    })
}

describe('processArtwork', () => {
    it('stores a large image as WebP no larger than 800 pixels, upright and without metadata', async () => {
        // 1200×600 marked as rotated a quarter turn: stored upright as 400×800.
        const photo = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#e11d48' } })
            .jpeg()
            .withMetadata({ orientation: 6 })
            .toBuffer()

        const artwork = await processArtwork(photo)
        const metadata = await sharp(artwork.bytes).metadata()

        expect(artwork).toEqual(expect.objectContaining({ contentType: 'image/webp', width: 400, height: 800 }))
        expect(artwork.hash).toMatch(/^[0-9a-f]{16}$/)
        expect(metadata.format).toBe('webp')
        expect(metadata.exif).toBeUndefined()
    })

    it('never enlarges a small image, and the same bytes give the same address', async () => {
        const small = await sharp({ create: { width: 120, height: 90, channels: 3, background: '#2563eb' } })
            .png()
            .toBuffer()

        const [first, second] = await Promise.all([processArtwork(small), processArtwork(small)])

        expect([first.width, first.height]).toEqual([120, 90])
        expect(first.hash).toBe(second.hash)
    })

    it('refuses what is not an image', async () => {
        await expect(processArtwork(Buffer.from('<html>hello</html>'))).rejects.toThrow(ArtworkError)
    })
})

describe('downloadArtwork', () => {
    it('downloads a public image', async () => {
        const fetch = vi.fn().mockResolvedValue(imageResponse('image bytes'))

        await expect(downloadArtwork(' https://images.example.com/azul.png ', { fetch, resolve: publicHost })).resolves.toEqual(
            Buffer.from('image bytes'),
        )
        expect(fetch).toHaveBeenCalledWith(new URL('https://images.example.com/azul.png'), expect.objectContaining({ redirect: 'manual' }))
    })

    it.each([
        ['http://127.0.0.1/admin.png'],
        ['http://localhost/admin.png'],
        ['http://[::1]/admin.png'],
        ['http://169.254.169.254/latest/meta-data'],
        ['http://10.0.0.8/box.png'],
        ['http://192.168.1.10/box.png'],
        ['http://[::ffff:10.0.0.8]/box.png'],
    ])('never downloads from a non-public address: %s', async address => {
        const fetch = vi.fn()
        const resolve = async (hostname: string) => (hostname === 'localhost' ? ['127.0.0.1'] : ['93.184.215.14'])

        await expect(downloadArtwork(address, { fetch, resolve })).rejects.toThrow('That address is not on the public internet.')
        expect(fetch).not.toHaveBeenCalled()
    })

    it('checks every redirect again', async () => {
        const fetch = vi.fn().mockResolvedValue(imageResponse('', { location: 'http://10.0.0.8/secret.png' }, 302))

        await expect(downloadArtwork('https://images.example.com/azul.png', { fetch, resolve: publicHost })).rejects.toThrow(
            'That address is not on the public internet.',
        )
        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('follows a few public redirects, then gives up', async () => {
        const fetch = vi.fn().mockResolvedValue(imageResponse('', { location: '/next.png' }, 301))

        await expect(downloadArtwork('https://images.example.com/loop.png', { fetch, resolve: publicHost })).rejects.toThrow(
            'The address redirects too many times.',
        )
        expect(fetch).toHaveBeenCalledTimes(4)
    })

    it.each([
        ['ftp://images.example.com/azul.png', 'Use an http(s) address.'],
        ['https://user:secret@images.example.com/azul.png', 'Use an address without a user name or password.'],
        ['not an address', 'Use a full http(s) address.'],
    ])('refuses %s', async (address, message) => {
        await expect(downloadArtwork(address, { fetch: vi.fn(), resolve: publicHost })).rejects.toThrow(message)
    })

    it('tells the admin when the site answers with an error or a web page', async () => {
        const notFound = vi.fn().mockResolvedValue(imageResponse('', {}, 404))
        const page = vi.fn().mockResolvedValue(imageResponse('<html></html>', { 'content-type': 'text/html' }))

        await expect(downloadArtwork('https://shop.example.com/box.png', { fetch: notFound, resolve: publicHost })).rejects.toThrow(
            'shop.example.com answered 404.',
        )
        await expect(downloadArtwork('https://shop.example.com/box', { fetch: page, resolve: publicHost })).rejects.toThrow(
            'That address is a page, not an image.',
        )
    })

    it('stops reading an image larger than 8 MB', async () => {
        const fetch = vi.fn().mockResolvedValue(imageResponse(Buffer.alloc(9 * 1024 * 1024)))

        await expect(downloadArtwork('https://images.example.com/huge.png', { fetch, resolve: publicHost })).rejects.toThrow(
            'The image is larger than 8 MB.',
        )
    })

    it('names the site that could not be reached', async () => {
        const fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))

        await expect(downloadArtwork('https://down.example.com/box.png', { fetch, resolve: publicHost })).rejects.toThrow(
            'down.example.com could not be reached.',
        )
    })
})

describe('storedArtworkPath', () => {
    it('finds the stored path in the full address the app shows, and nothing else', () => {
        expect(storedArtworkPath('https://backend.board-vault.com/artwork/12-0123456789abcdef.webp')).toBe(
            '/artwork/12-0123456789abcdef.webp',
        )
        expect(storedArtworkPath('/artwork/12-0123456789abcdef.webp')).toBe('/artwork/12-0123456789abcdef.webp')
        expect(storedArtworkPath('https://example.com/box.png')).toBeNull()
        expect(storedArtworkPath('/artwork/12-xyz.webp')).toBeNull()
    })
})
