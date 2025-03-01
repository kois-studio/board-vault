import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-badge',
    templateUrl: './badge.component.html',
})
export class BadgeComponent {
    @Input() type: 'number' | 'indicator' = 'number'
    @Input() color: 'indigo' | 'red' | 'green' | 'blue' | 'gray' = 'indigo'
    @Input() text: string = 'aa'
}
