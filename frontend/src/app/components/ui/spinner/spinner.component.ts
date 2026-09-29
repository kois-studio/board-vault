import { Component, Input } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [IconComponent],
    selector: 'app-spinner',
    templateUrl: 'spinner.component.html',
})
export class SpinnerComponent {
    @Input() size: 'small' | 'medium' | 'large' = 'small'
    @Input() label: string | null = 'Loading'
    @Input() text: string | null = null
}
