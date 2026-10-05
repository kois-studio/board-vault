import { TestBed } from '@angular/core/testing'
import { parseThemePreference, THEME_COLORS, ThemeService } from './theme.service'

describe('ThemeService', () => {
    let systemDark: boolean
    let listeners: Array<() => void>

    beforeEach(() => {
        systemDark = false
        listeners = []
        localStorage.clear()
        document.documentElement.classList.remove('dark')
        document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove())

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
        expect(themeColors()).toEqual([THEME_COLORS.dark, THEME_COLORS.dark])
    })

    it('keeps an explicit light or dark choice when the system theme changes', () => {
        const theme = TestBed.inject(ThemeService)

        theme.setPreference('light')
        changeSystemTheme(true)

        expect(theme.isDark()).toBe(false)
        expect(themeColors()).toEqual([THEME_COLORS.light, THEME_COLORS.light])

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
})
