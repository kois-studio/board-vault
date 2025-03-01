import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
    standalone: true,
    imports: [RouterLink],
    selector: 'app-card-section',
    templateUrl: 'card-section.component.html',
})
export class CardSectionComponent {
    @Input({ required: true }) icon!: string
    @Input({ required: true }) title!: string
    @Input({ required: true }) description!: string
    @Input({ required: true }) cardLink!: string
}
