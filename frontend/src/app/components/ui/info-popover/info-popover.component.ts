import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

let nextId = 0

/**
 * A (?) button that explains a feature in a small panel. A mouse opens it on
 * hover; a click or tap pins it open until the next click, Escape, or a click
 * outside. Put the explanation in the content.
 */
@Component({
    imports: [IconComponent],
    selector: 'app-info-popover',
    host: { class: 'relative inline-flex' },
    templateUrl: 'info-popover.component.html',
})
export class InfoPopoverComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

    /** Accessible name for the button, such as "About recent activity". */
    readonly label = input.required<string>()

    protected readonly panelId = `info-popover-${nextId++}`
    protected readonly pinned = signal(false)
    protected readonly hovered = signal(false)

    protected isOpen(): boolean {
        return this.pinned() || this.hovered()
    }

    /** A click pins a hover preview open; a click on a pinned panel closes it. */
    protected toggle(): void {
        if (this.pinned()) {
            this.close()
        } else {
            this.pinned.set(true)
        }
    }

    protected onPointerEnter(event: PointerEvent): void {
        if (event.pointerType === 'mouse') this.hovered.set(true)
    }

    protected onPointerLeave(event: PointerEvent): void {
        if (event.pointerType === 'mouse') this.hovered.set(false)
    }

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (!this.host.nativeElement.contains(event.target as Node)) this.close()
    }

    @HostListener('keydown.escape')
    protected close(): void {
        this.pinned.set(false)
        this.hovered.set(false)
    }
}
