import { Component, effect, input, signal, untracked } from '@angular/core'

@Component({
    imports: [],
    selector: 'image-background',
    host: { class: 'block' },
    templateUrl: 'image-background.component.html',
})
export class ImageBackgroundComponent {
    readonly src = input.required<string>()
    readonly alt = input('Game artwork')
    readonly loading = input<'eager' | 'lazy'>('lazy')

    public readonly hasError = signal(false)

    constructor() {
        // A new image gets a fresh chance to load.
        effect(() => {
            this.src()
            untracked(() => this.hasError.set(false))
        })
    }

    public handleImageError(): void {
        this.hasError.set(true)
    }
}
