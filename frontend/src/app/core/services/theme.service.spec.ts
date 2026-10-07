import { TestBed } from '@angular/core/testing'
import { parseTextSize, parseThemePalette, parseThemePreference, THEME_COLORS, ThemeService } from './theme.service'

describe('ThemeService', () => {
    let systemDark: boolean
    let listeners: Array<() => void>

    beforeEach(() => {
        systemDark = false
        listeners = []
        localStorage.clear()
        document.documentElement.classList.remove('dark')
        delete document.documentElement.dataset['theme']
        delete document.documentElement.dataset['textSize']
        for (const meta of Array.from(document.head.querySelectorAll('meta[name="theme-color"]'))) meta.remove()

        for (const media of ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']) {
            const meta = document.createElement('meta')
            meta.name = 'theme-color'
            meta.media = media
            document.head.append(meta)
        }

        // jsdom has no matchMedia; this one reports `systemDark` and records change listeners.
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: (query: string) =>
                ({
                    media: query,
                    get matches() {
                        return systemDark
                    },
                    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
                    removeEventListener: vi.fn(),
                }) as unknown as MediaQueryList,
        })
    })

    afterEach(() => {
        Reflect.deleteProperty(window, 'matchMedia')
        TestBed.resetTestingModule()
    })

    function themeColors(): Array<string> {
        return Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')).map((meta) => meta.content)
    }

    function changeSystemTheme(dark: boolean): void {
        systemDark = dark
        for (const listener of listeners) listener()
    }

    it('defaults to the system theme and follows it live', () => {
        const theme = TestBed.inject(ThemeService)

        expect(theme.preference()).toBe('system')
        expect(theme.isDark()).toBe(false)

        changeSystemTheme(true)

        expect(theme.isDark()).toBe(true)
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(themeColors()).toEqual([THEME_COLORS.ciruela.dark, THEME_COLORS.ciruela.dark])
    })

    it('keeps an explicit light or dark choice when the system theme changes', () => {
        const theme = TestBed.inject(ThemeService)

        theme.setPreference('light')
        changeSystemTheme(true)

        expect(theme.isDark()).toBe(false)
        expect(themeColors()).toEqual([THEME_COLORS.ciruela.light, THEME_COLORS.ciruela.light])

        theme.setPreference('dark')
        changeSystemTheme(false)

        expect(theme.isDark()).toBe(true)
        expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('reads a choice saved by the old two-state toggle', () => {
        localStorage.setItem('theme', 'dark')

        const theme = TestBed.inject(ThemeService)

        expect(theme.preference()).toBe('dark')
        expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('treats unknown stored values as system', () => {
        expect(parseThemePreference('sepia')).toBe('system')
        expect(parseThemePreference(null)).toBe('system')
        expect(parseThemePreference('light')).toBe('light')
    })

    it('wears Ciruela until another theme is chosen, and keeps the choice', () => {
        const theme = TestBed.inject(ThemeService)

        expect(document.documentElement.dataset['theme']).toBe('ciruela')

        theme.setPreference('dark')
        theme.setPalette('harbor')

        expect(document.documentElement.dataset['theme']).toBe('harbor')
        expect(themeColors()).toEqual([THEME_COLORS.harbor.dark, THEME_COLORS.harbor.dark])
        expect(localStorage.getItem('palette')).toBe('harbor')
    })

    it('reads a saved theme and text size at startup', () => {
        localStorage.setItem('palette', 'felt')
        localStorage.setItem('text-size', 'larger')

        const theme = TestBed.inject(ThemeService)

        expect(theme.palette()).toBe('felt')
        expect(document.documentElement.dataset['theme']).toBe('felt')
        expect(document.documentElement.dataset['textSize']).toBe('larger')
    })

    it('sets the text size on the page, and clears it for the default size', () => {
        const theme = TestBed.inject(ThemeService)

        expect(document.documentElement.dataset['textSize']).toBeUndefined()

        theme.setTextSize('large')
        expect(document.documentElement.dataset['textSize']).toBe('large')
        expect(localStorage.getItem('text-size')).toBe('large')

        theme.setTextSize('default')
        expect(document.documentElement.dataset['textSize']).toBeUndefined()
    })

    it('falls back to Ciruela and the default size for unknown stored values', () => {
        expect(parseThemePalette('toString')).toBe('ciruela')
        expect(parseThemePalette(null)).toBe('ciruela')
        expect(parseThemePalette('graphite')).toBe('graphite')
        expect(parseTextSize('huge')).toBe('default')
        expect(parseTextSize('large')).toBe('large')
    })
})
