import { Component, Input } from '@angular/core'

@Component({
    selector: 'app-tags',
    templateUrl: 'tags.component.html',
})
export class TagsComponent {
    @Input() tags: Array<{ tag: string; category: string }> = []
}
