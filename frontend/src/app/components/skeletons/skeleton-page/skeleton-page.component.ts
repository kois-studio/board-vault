import { Component } from '@angular/core'
import { ContainerWrapperComponent } from '../../ui/container-wrapper/container-wrapper.component'

/**
 * A page in general (heading, a row of cards, a list), for when the app does not know yet what the page will show:
 * while a signed-in person's account is confirmed (#259). Pages that know their shape use their own skeletons.
 */
@Component({
    imports: [ContainerWrapperComponent],
    selector: 'app-skeleton-page',
    templateUrl: 'skeleton-page.component.html',
})
export class SkeletonPageComponent {
    protected readonly cards = [1, 2, 3]
    protected readonly rows = [1, 2, 3]
}
