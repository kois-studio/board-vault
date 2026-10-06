import sharp from 'sharp'

import { ArtworkError } from '../src/common/artwork/artwork.js'

/** A small PNG in the given colour, as a publisher's box image would arrive. */
export function pngImage(colour = '#4f46e5', size = 64): Promise<Buffer> {
    return sharp({ create: { width: size, height: size, channels: 3, background: colour } })
        .png()
        .toBuffer()
}

/**
 * Answers artwork downloads without the network: any `example.test` address is an image (its
 * colour depends on the address, so different addresses give different artwork), and an address
 * containing `missing` answers 404 like a dead link.
 */
export class FakeArtworkDownloader {
    readonly downloaded: Array<string> = []

    async download(address: string): Promise<Buffer> {
        this.downloaded.push(address)
        if (address.includes('missing')) throw new ArtworkError('example.test answered 404.')

        const hue = [...address].reduce((sum, character) => (sum + character.charCodeAt(0)) % 360, 0)

        return pngImage(`hsl(${hue}, 70%, 50%)`)
    }
}
