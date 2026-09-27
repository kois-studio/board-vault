import { DOCUMENT } from '@angular/common'
import { Directive, ElementRef, EventEmitter, HostListener, NgZone, OnDestroy, Output, Renderer2, inject } from '@angular/core'

const FOCUSABLE_SELECTOR =
    'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

@Directive({
    selector: '[appDialog]',
    standalone: true,
})
export class DialogDirective implements OnDestroy {
    private static activeDialogCount = 0
    private static previousBodyOverflow = ''

    @Output() readonly dialogClosed = new EventEmitter<void>()

    private readonly previousActiveElement: HTMLElement | null
    private readonly hostElement: HTMLElement
    private readonly document = inject(DOCUMENT)

    constructor(
        elementRef: ElementRef<HTMLElement>,
        private readonly renderer: Renderer2,
        private readonly zone: NgZone,
    ) {
        this.hostElement = elementRef.nativeElement
        this.previousActiveElement = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null
        this.renderer.setAttribute(this.hostElement, 'role', 'dialog')
        this.renderer.setAttribute(this.hostElement, 'aria-modal', 'true')
        this.lockBodyScroll()

        this.zone.runOutsideAngular(() => {
            queueMicrotask(() => {
                if (this.hostElement.isConnected) this.focusInitialElement()
            })
        })
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEscape(event: KeyboardEvent): void {
        event.preventDefault()
        event.stopPropagation()
        this.dialogClosed.emit()
    }

    @HostListener('keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return

        const focusableElements = this.getFocusableElements()
        if (focusableElements.length === 0) {
            event.preventDefault()
            this.hostElement.focus()
            return
        }

        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]
        const activeElement = this.document.activeElement

        if (event.shiftKey && activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }

    ngOnDestroy(): void {
        this.unlockBodyScroll()
        if (this.previousActiveElement?.isConnected) {
            this.zone.runOutsideAngular(() => queueMicrotask(() => this.previousActiveElement?.focus()))
        }
    }

    private focusInitialElement(): void {
        const focusableElement = this.getFocusableElements()[0]
        if (focusableElement) {
            focusableElement.focus()
            return
        }

        this.renderer.setAttribute(this.hostElement, 'tabindex', '-1')
        this.hostElement.focus()
    }

    private getFocusableElements(): Array<HTMLElement> {
        return Array.from(this.hostElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (element) => element.getClientRects().length > 0,
        )
    }

    private lockBodyScroll(): void {
        if (DialogDirective.activeDialogCount === 0) {
            DialogDirective.previousBodyOverflow = this.document.body.style.overflow
            this.renderer.setStyle(this.document.body, 'overflow', 'hidden')
        }
        DialogDirective.activeDialogCount += 1
    }

    private unlockBodyScroll(): void {
        DialogDirective.activeDialogCount = Math.max(0, DialogDirective.activeDialogCount - 1)
        if (DialogDirective.activeDialogCount === 0) {
            this.renderer.setStyle(this.document.body, 'overflow', DialogDirective.previousBodyOverflow)
        }
    }
}
