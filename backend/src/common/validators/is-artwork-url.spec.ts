import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'

import { ApproveGameProposalBody, UpdateAdminGameBody } from '../types/admin.type.js'
import { CreateGameProposalBody } from '../types/game-proposal.type.js'

import { isArtworkUrl } from './is-artwork-url.js'

describe('isArtworkUrl', () => {
    it('accepts no artwork, or an http(s) address with a host', () => {
        expect(isArtworkUrl('')).toBe(true)
        expect(isArtworkUrl('   ')).toBe(true)
        expect(isArtworkUrl('https://cf.geekdo-images.com/pic123.jpg')).toBe(true)
        expect(isArtworkUrl('http://example.test/cover.png?size=large&v=2')).toBe(true)
        expect(isArtworkUrl(' https://example.test/cover.png ')).toBe(true)
    })

    it('rejects anything that is not a web address', () => {
        expect(isArtworkUrl('not a url')).toBe(false)
        expect(isArtworkUrl('javascript:alert(1)')).toBe(false)
        expect(isArtworkUrl('data:image/png;base64,AAAA')).toBe(false)
        expect(isArtworkUrl('ftp://example.test/cover.png')).toBe(false)
        expect(isArtworkUrl('/images/cover.png')).toBe(false)
        expect(isArtworkUrl('https://')).toBe(false)
        expect(isArtworkUrl(42)).toBe(false)
    })

    it('accepts a stored artwork path, which an admin form sends back to keep it', () => {
        expect(isArtworkUrl('/artwork/12-0123456789abcdef.webp')).toBe(true)
        expect(isArtworkUrl('/artwork/12-0123456789abcdef.png')).toBe(false)
    })
})

describe('artwork URLs in request bodies', () => {
    const errorsFor = async <T extends object>(type: new () => T, body: object) =>
        (await validate(plainToInstance(type, body))).map(error => error.property)

    it('checks the artwork of a new proposal', async () => {
        expect(await errorsFor(CreateGameProposalBody, { title: 'Azul', imageUrl: 'javascript:alert(1)' })).toEqual(['imageUrl'])
        expect(await errorsFor(CreateGameProposalBody, { title: 'Azul', imageUrl: 'https://example.test/azul.jpg' })).toEqual([])
        expect(await errorsFor(CreateGameProposalBody, { title: 'Azul', imageUrl: '' })).toEqual([])
        expect(await errorsFor(CreateGameProposalBody, { title: 'Azul' })).toEqual([])
    })

    it('checks the artwork an admin sets on a game or an approval, where empty means none', async () => {
        expect(await errorsFor(UpdateAdminGameBody, { imageUrl: 'not a url' })).toEqual(['imageUrl'])
        expect(await errorsFor(UpdateAdminGameBody, { imageUrl: '' })).toEqual([])
        expect(await errorsFor(ApproveGameProposalBody, { imageUrl: 'ftp://example.test/cover.png' })).toEqual(['imageUrl'])
        expect(await errorsFor(ApproveGameProposalBody, { imageUrl: 'https://example.test/cover.png' })).toEqual([])
    })
})
