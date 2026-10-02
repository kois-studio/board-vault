import { Component, computed, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { Tone } from '../../../types/tone.type'
import { IconComponent } from '../../ui/icon/icon.component'

const ICON_TILE: Record<Tone, string> = {
    primary: 'bg-bv-primary-soft text-bv-on-primary-soft',
    accent: 'bg-bv-accent text-bv-on-accent',
    success: 'bg-bv-success/15 text-bv-success',
    warning: 'bg-bv-warning/15 text-bv-warning',
    danger: 'bg-bv-danger/15 text-bv-danger',
    neutral: 'bg-bv-surface-2 text-bv-text-muted',
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
    /** Tints the icon tile. */
    readonly tone = input<Tone>('primary')
    readonly comingSoon = input(false)

    protected readonly iconTileClass = computed(() => ICON_TILE[this.tone()])
}
