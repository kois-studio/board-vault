import { DarkModeToggleComponent } from './dark-mode-toggle.component'

describe('DarkModeToggleComponent', () => {
    it('exposes the next theme action as its accessible label', () => {
        const component = new DarkModeToggleComponent()

        expect(component.modeLabel).toBe('Use dark mode')
        component.isDarkMode = true
        expect(component.modeLabel).toBe('Use light mode')
    })
})
