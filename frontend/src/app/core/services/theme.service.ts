import { DestroyRef, DOCUMENT, Injectable, inject, signal } from '@angular/core'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ThemePalette = 'ciruela' | 'felt' | 'harbor' | 'graphite'
export type TextSize = 'default' | 'large' | 'larger'

export const THEME_STORAGE_KEY = 'theme'
export const PALETTE_STORAGE_KEY = 'palette'
export const TEXT_SIZE_STORAGE_KEY = 'text-size'

export const THEME_PALETTES: ReadonlyArray<ThemePalette> = ['ciruela', 'felt', 'harbor', 'graphite']
export const TEXT_SIZES: ReadonlyArray<TextSize> = ['default', 'large', 'larger']

/**
 * Each theme's browser status-bar colours (its `--bv-bg` tokens in styles.css) and its light-mode
 * `--bv-primary`, which Clerk's own UI takes. The script in `index.html` keeps a copy of the
 * status-bar colours; `npm run check:contrast` checks all of them against styles.css.
 */
export const THEME_COLORS: Record<ThemePalette, { light: string; dark: string; primary: string }> = {
    ciruela: { light: '#F3EDF9', dark: '#201C20', primary: '#8A2C7A' },
    felt: { light: '#E8F1ED', dark: '#161F1C', primary: '#0F6E62' },
    harbor: { light: '#EAF0F7', dark: '#171C23', primary: '#1F5FA8' },
    graphite: { light: '#EEEFF1', dark: '#1A1B1E', primary: '#3A4250' },
}

export function parseThemePreference(value: string | null): ThemePreference {
    return value === 'light' || value === 'dark' ? value : 'system'
}

export function parseThemePalette(value: string | null): ThemePalette {
    return THEME_PALETTES.find((palette) => palette === value) ?? 'ciruela'
}

export function parseTextSize(value: string | null): TextSize {
    return TEXT_SIZES.find((size) => size === value) ?? 'default'
}

/**
 * Owns the appearance: the colour scheme, the theme, and the text size, all saved on this device.
 * `system` follows the OS live; `light` and `dark` override it. The theme is `<html data-theme>`,
 * the text size `<html data-text-size>`. The inline script in `index.html` applies the same rules
 * before the first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT)
    private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null

    public readonly preference = signal<ThemePreference>(parseThemePreference(this.readStored(THEME_STORAGE_KEY)))
    public readonly palette = signal<ThemePalette>(parseThemePalette(this.readStored(PALETTE_STORAGE_KEY)))
    public readonly textSize = signal<TextSize>(parseTextSize(this.readStored(TEXT_SIZE_STORAGE_KEY)))
    /** The theme actually shown. */
    public readonly isDark = signal(false)

    constructor() {
        const onSystemChange = () => {
            if (this.preference() === 'system') this.apply()
        }

        this.media?.addEventListener('change', onSystemChange)
        inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', onSystemChange))
        this.apply()
    }

    public setPreference(preference: ThemePreference): void {
        this.preference.set(preference)
        this.store(THEME_STORAGE_KEY, preference)
        this.apply()
    }

    public setPalette(palette: ThemePalette): void {
        this.palette.set(palette)
        this.store(PALETTE_STORAGE_KEY, palette)
        this.apply()
    }

    public setTextSize(size: TextSize): void {
        this.textSize.set(size)
        this.store(TEXT_SIZE_STORAGE_KEY, size)
        this.apply()
    }

    private apply(): void {
        const preference = this.preference()
        const isDark = preference === 'dark' || (preference === 'system' && !!this.media?.matches)
        const root = this.document.documentElement

        this.isDark.set(isDark)
        root.classList.toggle('dark', isDark)
        root.dataset['theme'] = this.palette()

        if (this.textSize() === 'default') delete root.dataset['textSize']
        else root.dataset['textSize'] = this.textSize()

        const colors = THEME_COLORS[this.palette()]
        for (const meta of Array.from(this.document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))) {
            meta.content = isDark ? colors.dark : colors.light
        }
    }

    private store(key: string, value: string): void {
        try {
            this.document.defaultView?.localStorage.setItem(key, value)
        } catch {
            // Storage can be unavailable (private mode); the choice still applies for this visit.
        }
    }

    private readStored(key: string): string | null {
        try {
            return this.document.defaultView?.localStorage.getItem(key) ?? null
        } catch {
            return null
        }
    }
}
