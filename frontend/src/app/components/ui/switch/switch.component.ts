import { Component, input, output } from '@angular/core'

/** An on/off switch. The text that names it lives next to it; pass its id as `labelledBy`. */
@Component({
    selector: 'app-switch',
    template: `
        <button
            type="button"
            role="switch"
            class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-bv-primary focus-visible:ring-offset-2 disabled:opacity-60 motion-reduce:transition-none"
            [class.bg-bv-primary]="checked()"
            [class.bg-bv-border]="!checked()"
            [attr.aria-checked]="checked()"
            [attr.aria-labelledby]="labelledBy()"
            [disabled]="disabled()"
            (click)="toggled.emit(!checked())"
        >
            <span
                class="inline-block size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none"
                [class.translate-x-6]="checked()"
                [class.translate-x-1]="!checked()"
            ></span>
        </button>
    `,
})
export class SwitchComponent {
    readonly checked = input.required<boolean>()
    readonly labelledBy = input.required<string>()
    readonly disabled = input(false)
    /** The value the switch asks to change to. The parent decides whether it does. */
    readonly toggled = output<boolean>()
}
