import { TestBed } from '@angular/core/testing'
import { ThemeService } from '../../../core/services/theme.service'
import { DarkModeToggleComponent } from './dark-mode-toggle.component'

describe('DarkModeToggleComponent', () => {
    afterEach(() => localStorage.clear())

    it('names the next theme and switches to it through ThemeService', () => {
        const component = TestBed.runInInjectionContext(() => new DarkModeToggleComponent())
        const theme = TestBed.inject(ThemeService)

        theme.setPreference('light')
        expect(component.modeLabel()).toBe('Use dark mode')

        component.toggleDarkMode()
        expect(theme.preference()).toBe('dark')
        expect(component.modeLabel()).toBe('Use light mode')
    })
})
