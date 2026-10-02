import { Component, input } from '@angular/core'

@Component({
    selector: 'app-tags',
    templateUrl: 'tags.component.html',
})
export class TagsComponent {
    readonly tags = input<
        Array<{
            tag: string
            category: string
        }>
    >([])
}
