import { LocaleMiddleware } from './locale.middleware.js'

import type { LocalizedRequest } from './locale.middleware.js'

describe('LocaleMiddleware', () => {
    const run = (header?: string) => {
        const request = { headers: header === undefined ? {} : { 'accept-language': header } } as LocalizedRequest
        const next = vi.fn()

        new LocaleMiddleware().use(request, {} as never, next)
        expect(next).toHaveBeenCalledOnce()
        return request.locale
    }

    it('sets the reader language from Accept-Language', () => {
        expect(run('it')).toBe('it')
        expect(run('fr-FR,fr;q=0.9')).toBe('fr')
    })

    it('reads English without a header or a supported language', () => {
        expect(run()).toBe('en')
        expect(run('ja')).toBe('en')
    })
})
