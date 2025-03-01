import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'

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
    @Input() color: 'blue' | 'indigo' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray' = 'indigo'
}
