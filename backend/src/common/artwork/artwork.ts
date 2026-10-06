import { createHash } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

import sharp from 'sharp'

/**
 * Game artwork Board Vault keeps itself (ADR-0015): copied once, compressed, and served from
 * `/artwork/<gameId>-<hash>.webp`. Nothing here depends on Nest, so the import script uses it too.
 */

/** Longest side of the stored image, in pixels: sharp on the game page, small enough for Turso. */
export const ARTWORK_MAX_SIDE = 800
/** The largest source accepted, downloaded or uploaded. */
export const ARTWORK_MAX_SOURCE_BYTES = 8 * 1024 * 1024
/** How long a download may take. */
export const ARTWORK_DOWNLOAD_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3

/** `/artwork/12-0123456789abcdef.webp`: the game and the first 16 hex characters of the image's SHA-256. */
export const ARTWORK_FILE = /^(\d+)-([0-9a-f]{16})\.webp$/
export const ARTWORK_PATH = /^\/artwork\/(\d+)-([0-9a-f]{16})\.webp$/

export type ProcessedArtwork = {
    bytes: Buffer
    hash: string
    contentType: 'image/webp'
    width: number
    height: number
}

/** A source that cannot become artwork. The message is safe to show to the admin. */
export class ArtworkError extends Error {}

export function artworkPath(gameId: number, hash: string): string {
    return `/artwork/${gameId}-${hash}.webp`
}

/** The stored path an address points at, so the admin form can send back the artwork it showed. */
export function storedArtworkPath(value: string): string | null {
    let path = value.trim()

    try {
        path = new URL(path).pathname
    } catch {
        // Already a path.
    }

    return ARTWORK_PATH.test(path) ? path : null
}

/** Any image sharp reads, turned upright, fitted within the longest side, as WebP without metadata. */
export async function processArtwork(source: Buffer): Promise<ProcessedArtwork> {
    if (source.length > ARTWORK_MAX_SOURCE_BYTES) throw new ArtworkError('The image is larger than 8 MB.')

    try {
        const { data, info } = await sharp(source, { limitInputPixels: 40_000_000 })
            .rotate()
            .resize({ width: ARTWORK_MAX_SIDE, height: ARTWORK_MAX_SIDE, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true })

        return {
            bytes: data,
            hash: createHash('sha256').update(data).digest('hex').slice(0, 16),
            contentType: 'image/webp',
            width: info.width,
            height: info.height,
        }
    } catch {
        throw new ArtworkError('That file is not an image Board Vault can read.')
    }
}

// Loopback, private, link-local, carrier-grade NAT and other non-public ranges.
const PRIVATE_ADDRESSES = new BlockList()

for (const [network, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
    ['224.0.0.0', 3],
] as const) {
    PRIVATE_ADDRESSES.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [
    ['::', 127],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
] as const) {
    PRIVATE_ADDRESSES.addSubnet(network, prefix, 'ipv6')
}

function isPrivateAddress(address: string): boolean {
    const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1]

    if (mapped) return PRIVATE_ADDRESSES.check(mapped, 'ipv4')

    return PRIVATE_ADDRESSES.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4')
}

type Resolve = (hostname: string) => Promise<Array<string>>

const resolveHost: Resolve = async hostname => (await lookup(hostname, { all: true })).map(entry => entry.address)

/** Only public http(s) addresses: the server must never be pointed at itself or its network. */
async function assertPublicUrl(url: URL, resolve: Resolve): Promise<void> {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new ArtworkError('Use an http(s) address.')
    if (url.username || url.password) throw new ArtworkError('Use an address without a user name or password.')

    const hostname = url.hostname.replace(/^\[|\]$/g, '')
    let addresses: Array<string>

    try {
        addresses = isIP(hostname) ? [hostname] : await resolve(hostname)
    } catch {
        throw new ArtworkError(`${url.hostname} could not be found.`)
    }

    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
        throw new ArtworkError('That address is not on the public internet.')
    }
}

export type DownloadOptions = { fetch?: typeof fetch; resolve?: Resolve; timeoutMs?: number }

/**
 * Downloads an image for an admin: public http(s) only (every redirect checked again), up to
 * 8 MB, within the timeout. Anything else is an ArtworkError the admin can act on.
 */
export async function downloadArtwork(address: string, options: DownloadOptions = {}): Promise<Buffer> {
    const fetchImpl = options.fetch ?? fetch
    const resolve = options.resolve ?? resolveHost
    const signal = AbortSignal.timeout(options.timeoutMs ?? ARTWORK_DOWNLOAD_TIMEOUT_MS)
    let url: URL

    try {
        url = new URL(address.trim())
    } catch {
        throw new ArtworkError('Use a full http(s) address.')
    }

    try {
        for (let redirects = 0; ; redirects++) {
            await assertPublicUrl(url, resolve)

            const response = await fetchImpl(url, {
                redirect: 'manual',
                signal,
                headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0 (compatible; BoardVault/1.0; +https://board-vault.com)' },
            })

            if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
                if (redirects >= MAX_REDIRECTS) throw new ArtworkError('The address redirects too many times.')
                url = new URL(response.headers.get('location')!, url)
                continue
            }
            if (!response.ok || !response.body) throw new ArtworkError(`${url.hostname} answered ${response.status}.`)
            if (!(response.headers.get('content-type') ?? '').startsWith('image/')) {
                throw new ArtworkError('That address is a page, not an image. Open the image itself and copy its address.')
            }
            if (Number(response.headers.get('content-length') ?? 0) > ARTWORK_MAX_SOURCE_BYTES) {
                throw new ArtworkError('The image is larger than 8 MB.')
            }

            const chunks: Array<Uint8Array> = []
            let size = 0

            for await (const chunk of response.body) {
                size += chunk.length
                if (size > ARTWORK_MAX_SOURCE_BYTES) throw new ArtworkError('The image is larger than 8 MB.')
                chunks.push(chunk)
            }

            return Buffer.concat(chunks)
        }
    } catch (error) {
        if (error instanceof ArtworkError) throw error
        if (signal.aborted) throw new ArtworkError(`${url.hostname} took too long to answer.`)
        throw new ArtworkError(`${url.hostname} could not be reached.`)
    }
}
