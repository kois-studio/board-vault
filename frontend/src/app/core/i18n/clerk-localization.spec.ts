import { CLERK_BUNDLES, type ClerkLocalization, clerkLocalization } from './clerk-localization'

type Tree = { [key: string]: unknown }
const at = (tree: unknown, path: string): unknown => path.split('.').reduce<unknown>((node, key) => (node as Tree | undefined)?.[key], tree)

describe('clerkLocalization', () => {
    it('gives English only our own names, as before', async () => {
        expect(await clerkLocalization('en')).toEqual({
            userProfile: {
                navbar: { title: 'Sign-in', description: 'Manage how you sign in to Board Vault.', account: 'Sign-in' },
                start: { headerTitle__account: 'Sign-in details' },
            },
        })
    })

    it('fetches no Clerk bundle for English', async () => {
        const fetch = vi.fn(() => Promise.reject(new Error('not for English')) as Promise<ClerkLocalization>)
        const bundles = { es: fetch, fr: fetch, de: fetch, it: fetch }

        await clerkLocalization('en', bundles)
        expect(fetch).not.toHaveBeenCalled()
    })

    it('loads each language’s own Clerk bundle', async () => {
        const regions = { es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT' } as const
        for (const [locale, region] of Object.entries(regions)) {
            expect((await CLERK_BUNDLES[locale as keyof typeof regions]()).locale).toBe(region)
        }
    })

    it('keeps Clerk’s translations, fills only what it left in English, and puts our names last', async () => {
        const bundle = await CLERK_BUNDLES.es()
        const spanish = await clerkLocalization('es')

        expect(spanish.locale).toBe('es-ES')
        expect(at(spanish, 'signIn.start.title')).toBe(at(bundle, 'signIn.start.title'))
        // Clerk has no Spanish for it; unit tests run untranslated, so ours reads as the English source.
        expect(at(bundle, 'unstable__errors.zxcvbn.notEnough')).toBeUndefined()
        expect(at(spanish, 'unstable__errors.zxcvbn.notEnough')).toBe('Your password is not strong enough.')
        // Clerk's variables survive as placeholders.
        expect(at(spanish, 'signIn.start.titleCombined')).toBe('Continue to {{applicationName}}')
        expect(at(await clerkLocalization('it'), 'unstable__errors.passwordComplexity.minimumLength')).toBe('{{length}} or more characters')
        expect(at(spanish, 'userProfile.navbar.title')).toBe('Sign-in')
        // Clerk's module is shared by every load: merging must not write into it.
        expect(at(bundle, 'userProfile.navbar.title')).not.toBe('Sign-in')
    })

    it('never replaces a translation Clerk has with our fill', async () => {
        const bundle = await CLERK_BUNDLES.fr()
        const french = await clerkLocalization('fr')

        expect(at(bundle, 'unstable__errors.zxcvbn.notEnough')).toEqual(expect.any(String))
        expect(at(french, 'unstable__errors.zxcvbn.notEnough')).toBe(at(bundle, 'unstable__errors.zxcvbn.notEnough'))
    })

    it('falls back to Clerk’s English with our names when the bundle cannot load', async () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const failing = { ...CLERK_BUNDLES, de: () => Promise.reject(new Error('offline')) as Promise<ClerkLocalization> }

        expect(await clerkLocalization('de', failing)).toEqual(await clerkLocalization('en'))
        expect(error).toHaveBeenCalled()
        error.mockRestore()
    })
})
