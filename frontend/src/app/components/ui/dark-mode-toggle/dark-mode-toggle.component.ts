import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-dark-mode-toggle',
    templateUrl: './dark-mode-toggle.component.html',
})
export class DarkModeToggleComponent implements OnInit {
    public isDarkMode = false

    public get modeLabel(): string {
        return this.isDarkMode ? 'Use light mode' : 'Use dark mode'
    }

    ngOnInit(): void {
        if (document.documentElement.classList.contains('dark')) {
            this.isDarkMode = true
            return
        }

        // Load preferred color scheme
        if (localStorage.getItem('theme')) {
            console.log(`${localStorage.getItem('theme')} mode selected on localStorage`)
            localStorage.getItem('theme') === 'dark' ? this.toggleDarkMode() : null
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            console.log('dark mode selected on OS')
            this.toggleDarkMode()
        }
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode

        const newMode = this.isDarkMode ? 'dark' : 'light'
        document.body.dataset['theme'] = newMode
        localStorage.setItem('theme', newMode)
        document.documentElement.classList.toggle('dark')
    }
}
