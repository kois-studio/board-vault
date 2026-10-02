import { CommonModule } from '@angular/common'
import { Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TailwindColor } from '../../../types/tailwind.type'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [CommonModule, RouterLink, IconComponent],
    selector: 'app-card-section',
    templateUrl: 'card-section.component.html',
})
export class CardSectionComponent {
    readonly icon = input.required<string>()
    readonly titleText = input.required<string>()
    readonly description = input.required<string>()
    readonly cardLink = input<string | null>(null)
    readonly color = input<TailwindColor>('indigo')
    readonly comingSoon = input(false)
}
