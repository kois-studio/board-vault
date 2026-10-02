import { Component, input } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [IconComponent],
    selector: 'app-spinner',
    templateUrl: 'spinner.component.html',
})
export class SpinnerComponent {
    readonly size = input<'small' | 'medium' | 'large'>('small')
    readonly label = input<string | null>('Loading')
    readonly text = input<string | null>(null)
}
