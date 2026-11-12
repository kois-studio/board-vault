import { Component } from '@angular/core'

/** A group card on Home while your groups load (#261), in the size of `app-card-group`. */
@Component({
    selector: 'app-skeleton-card-group',
    host: { class: 'block', 'aria-hidden': 'true', 'data-testid': 'group-card-skeleton' },
    templateUrl: 'skeleton-card-group.component.html',
})
export class SkeletonCardGroupComponent {
    protected readonly faces = [1, 2, 3]
    protected readonly shortcuts = [1, 2, 3]
}
