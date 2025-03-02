import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { TailwindColor } from '../../../types/tailwind.type'

@Component({
    imports: [CommonModule, RouterLink],
    selector: 'app-card-section',
    templateUrl: 'card-section.component.html',
})
export class CardSectionComponent {
    @Input({ required: true }) icon!: string
    @Input({ required: true }) titleText!: string
    @Input({ required: true }) description!: string
    @Input({ required: true }) cardLink!: string
    @Input() color: TailwindColor = 'indigo'
}
