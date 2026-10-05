import { DestroyRef, DOCUMENT, Injectable, inject, signal } from '@angular/core'

export type ThemePreference = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'

/** The browser status-bar colour for each resolved theme: the `--bv-bg` token. */
export const THEME_COLORS = { light: '#F3EDF9', dark: '#201C20' } as const

export function parseThemePreference(value: string | null): ThemePreference {
    return value === 'light' || value === 'dark' ? value : 'system'
}

/**
 * Owns the colour scheme. `system` follows the OS live; `light` and `dark` override it.
 * The inline script in `index.html` applies the same rules before the first paint.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly document = inject(DOCUMENT)
    private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null

    public readonly preference = signal<ThemePreference>(parseThemePreference(this.readStored()))
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

        try {
            this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference)
        } catch {
            // Storage can be unavailable (private mode); the choice still applies for this visit.
        }

        this.apply()
    }

    private apply(): void {
        const preference = this.preference()
        const isDark = preference === 'dark' || (preference === 'system' && !!this.media?.matches)

        this.isDark.set(isDark)
        this.document.documentElement.classList.toggle('dark', isDark)

        for (const meta of Array.from(this.document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))) {
            meta.content = isDark ? THEME_COLORS.dark : THEME_COLORS.light
        }
    }

    private readStored(): string | null {
        try {
            return this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) ?? null
        } catch {
            return null
        }
    }
}
