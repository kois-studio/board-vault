import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { TailwindColor } from '../../../types/tailwind.type'

@Component({
    imports: [CommonModule],
    selector: 'app-badge',
    templateUrl: './badge.component.html',
})
export class BadgeComponent {
    @Input() showIndicator = false
    @Input() color: TailwindColor = 'indigo'
    @Input({ required: true }) text!: string | number
}
