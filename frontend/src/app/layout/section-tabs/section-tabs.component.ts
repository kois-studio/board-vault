import { Component, computed, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { activeSectionFor, isUrlWithin, shownUrl } from '../app-sections'

/** The subsection tabs of the current section (Collection, Play), as the page's own second row. */
@Component({
    imports: [RouterLink, IconComponent],
    selector: 'app-layout-section-tabs',
    templateUrl: 'section-tabs.component.html',
})
export class LayoutSectionTabsComponent {
    private readonly router = inject(Router)

    private readonly url = shownUrl(this.router)

    public readonly subsections = computed(() => activeSectionFor(this.url())?.subsections ?? null)

    public isActive(path: string): boolean {
        return isUrlWithin(this.url(), path)
    }
}
