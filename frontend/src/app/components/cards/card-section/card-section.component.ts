import { Component, computed, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { Tone } from '../../../types/tone.type'
import { IconComponent } from '../../ui/icon/icon.component'

/**
 * Each tone tints the whole card faintly and the icon tile more strongly. The
 * card mixes the tone into the surface, so it stays opaque on the page
 * background in both themes.
 */
const TONE_CLASSES: Record<Tone, { card: string; tile: string }> = {
    primary: {
        card: 'border-bv-primary/25 bg-[color-mix(in_oklab,var(--bv-primary)_10%,var(--bv-surface))] hover:border-bv-primary/50',
        tile: 'bg-bv-primary/15 text-bv-primary',
    },
    accent: {
        card: 'border-bv-accent/50 bg-[color-mix(in_oklab,var(--bv-accent)_15%,var(--bv-surface))] hover:border-bv-accent',
        tile: 'bg-bv-accent text-bv-on-accent',
    },
    success: {
        card: 'border-bv-success/25 bg-[color-mix(in_oklab,var(--bv-success)_10%,var(--bv-surface))] hover:border-bv-success/50',
        tile: 'bg-bv-success/15 text-bv-success',
    },
    warning: {
        card: 'border-bv-warning/25 bg-[color-mix(in_oklab,var(--bv-warning)_10%,var(--bv-surface))] hover:border-bv-warning/50',
        tile: 'bg-bv-warning/15 text-bv-warning',
    },
    danger: {
        card: 'border-bv-danger/25 bg-[color-mix(in_oklab,var(--bv-danger)_10%,var(--bv-surface))] hover:border-bv-danger/50',
        tile: 'bg-bv-danger/15 text-bv-danger',
    },
    neutral: {
        card: 'border-bv-border bg-bv-surface hover:border-bv-primary/40',
        tile: 'bg-bv-surface-2 text-bv-text-muted',
    },
}

@Component({
    imports: [RouterLink, IconComponent],
    selector: 'app-card-section',
    templateUrl: 'card-section.component.html',
})
export class CardSectionComponent {
    readonly icon = input.required<string>()
    readonly titleText = input.required<string>()
    readonly description = input.required<string>()
    readonly cardLink = input<string | null>(null)
    /** Tints the card and its icon tile. */
    readonly tone = input<Tone>('primary')
    readonly comingSoon = input(false)

    protected readonly cardClass = computed(() => TONE_CLASSES[this.tone()].card)
    protected readonly iconTileClass = computed(() => TONE_CLASSES[this.tone()].tile)
}
