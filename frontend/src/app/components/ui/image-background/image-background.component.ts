import { Component, effect, input, signal, untracked } from '@angular/core'

@Component({
    imports: [],
    selector: 'image-background',
    host: { class: 'block' },
    templateUrl: 'image-background.component.html',
})
export class ImageBackgroundComponent {
    readonly src = input.required<string>()
    readonly alt = input($localize`:Description of a game's picture when no other is given:Game artwork`)

    readonly loading = input<'eager' | 'lazy'>('lazy')

    public readonly hasError = signal(false)

    public unavailableLabel(): string {
        return $localize`:Name of the placeholder shown when a picture does not load; the placeholder is what the picture shows, such as Game artwork:${this.alt()}:picture: unavailable`
    }

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
