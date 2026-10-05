import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { ThemeService } from '../../../core/services/theme.service'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [CommonModule, IconComponent],
    selector: 'app-dark-mode-toggle',
    templateUrl: './dark-mode-toggle.component.html',
})
export class DarkModeToggleComponent {
    private readonly theme = inject(ThemeService)

    public readonly isDarkMode = this.theme.isDark
    public readonly modeLabel = computed(() => (this.isDarkMode() ? 'Use light mode' : 'Use dark mode'))

    toggleDarkMode(): void {
        this.theme.setPreference(this.isDarkMode() ? 'light' : 'dark')
    }
}
