import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [CommonModule, IconComponent],
    selector: 'app-dark-mode-toggle',
    templateUrl: './dark-mode-toggle.component.html',
})
export class DarkModeToggleComponent implements OnInit {
    public isDarkMode = false

    public get modeLabel(): string {
        return this.isDarkMode ? 'Use light mode' : 'Use dark mode'
    }

    ngOnInit(): void {
        this.isDarkMode = document.documentElement.classList.contains('dark')
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode

        const newMode = this.isDarkMode ? 'dark' : 'light'
        localStorage.setItem('theme', newMode)
        document.documentElement.classList.toggle('dark', this.isDarkMode)
    }
}
