import { DestroyRef, DOCUMENT, ElementRef, inject, Signal, signal } from '@angular/core'
import { NavigationEnd, Router } from '@angular/router'

export type Disclosure = {
    readonly isOpen: Signal<boolean>
    toggle(): void
    /** Closes the panel; `restoreFocus` sends focus back to the trigger (Escape, choosing an item that stays on the page). */
    close(restoreFocus?: boolean): void
}

/**
 * The disclosure pattern for header popovers: a trigger button with `aria-expanded` and a panel.
 * Escape closes and returns focus to the trigger; a click outside the host or a navigation closes without moving focus.
 * Call from an injection context; the host element is the component's own element.
 */
export function injectDisclosure(trigger: () => ElementRef<HTMLElement> | undefined): Disclosure {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
    const document = inject(DOCUMENT)
    const isOpen = signal(false)

    const close = (restoreFocus = false) => {
        if (!isOpen()) return
        isOpen.set(false)
        if (restoreFocus) trigger()?.nativeElement.focus()
    }
    const onClick = (event: MouseEvent) => {
        if (!host.contains(event.target as Node)) close()
    }
    const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen()) {
            event.stopPropagation()
            close(true)
        }
    }

    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeydown)
    const navigation = inject(Router, { optional: true })?.events.subscribe((event) => {
        if (event instanceof NavigationEnd) close()
    })
    inject(DestroyRef).onDestroy(() => {
        navigation?.unsubscribe()
        document.removeEventListener('click', onClick)
        document.removeEventListener('keydown', onKeydown)
    })

    return { isOpen: isOpen.asReadonly(), toggle: () => isOpen.update((open) => !open), close }
}
