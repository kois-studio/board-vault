import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TailwindColor } from '../../../types/tailwind.type'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [CommonModule, RouterLink, IconComponent],
    selector: 'app-card-section',
    templateUrl: 'card-section.component.html',
})
export class CardSectionComponent {
    @Input({ required: true }) icon!: string
    @Input({ required: true }) titleText!: string
    @Input({ required: true }) description!: string
    @Input() cardLink: string | null = null
    @Input() color: TailwindColor = 'indigo'
    @Input() comingSoon = false
}
