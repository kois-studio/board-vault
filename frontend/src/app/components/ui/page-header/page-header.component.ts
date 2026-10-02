import { Component, input } from '@angular/core'
import { ContainerWrapperComponent } from '../container-wrapper/container-wrapper.component'

@Component({
    imports: [ContainerWrapperComponent],
    selector: 'app-page-header',
    templateUrl: 'page-header.component.html',
})
export class PageHeaderComponent {
    // Title text. (subtitle is displayed as <ng-content />)
    readonly titleText = input.required<string>()

    // Aside of the title/subtitle, you may display a main-action button
    readonly showActionButton = input(
        false,
        // TODO: a (?) icon to display extra info? check title-subtitle.component.ts
        // The text to display in the help text of the page header.
    )

    // TODO: a (?) icon to display extra info? check title-subtitle.component.ts
    // The text to display in the help text of the page header.
    readonly helpText = input<string>()
}
