import { Component, computed, input } from '@angular/core'
import type { Tone } from '../../../types/tone.type'

const BADGE: Record<Tone, string> = {
    primary: 'bg-bv-primary-soft text-bv-on-primary-soft',
    accent: 'bg-bv-accent text-bv-on-accent',
    success: 'bg-bv-success/15 text-bv-success',
    warning: 'bg-bv-warning/15 text-bv-warning',
    danger: 'bg-bv-danger/15 text-bv-danger',
    neutral: 'bg-bv-surface-2 text-bv-text-muted',
}

const INDICATOR: Record<Tone, string> = {
    primary: 'bg-bv-primary',
    accent: 'bg-bv-on-accent',
    success: 'bg-bv-success',
    warning: 'bg-bv-warning',
    danger: 'bg-bv-danger',
    neutral: 'bg-bv-text-muted',
}

/** A small informative label, such as a count on a card. */
@Component({
    selector: 'app-badge',
    templateUrl: './badge.component.html',
})
export class BadgeComponent {
    readonly showIndicator = input(false)
    readonly tone = input<Tone>('primary')
    readonly text = input.required<string | number>()

    protected readonly badgeClass = computed(() => BADGE[this.tone()])
    protected readonly indicatorClass = computed(() => INDICATOR[this.tone()])
}
