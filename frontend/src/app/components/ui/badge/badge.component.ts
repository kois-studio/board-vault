import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-badge',
    templateUrl: './badge.component.html',
})
export class BadgeComponent {
    @Input() showIndicator = false
    @Input() color: 'indigo' | 'red' | 'green' | 'blue' | 'gray' | 'yellow' = 'indigo'
    @Input({ required: true }) text!: string | number
}
