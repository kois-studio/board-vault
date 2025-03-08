import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

@Component({
    imports: [CommonModule],
    selector: 'app-spinner',
    templateUrl: 'spinner.component.html',
})
export class SpinnerComponent {
    @Input() size: 'small' | 'medium' | 'large' = 'small'
}
