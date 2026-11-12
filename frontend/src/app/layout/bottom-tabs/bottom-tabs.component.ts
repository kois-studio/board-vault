import { Component, computed, inject } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { APP_SECTIONS, activeSectionFor, shownUrl } from '../app-sections'

/** The main sections within thumb reach on phones and tablets (below `lg`, where the header has no section links). */
@Component({
    selector: 'app-layout-bottom-tabs',
    imports: [RouterLink, IconComponent],
    templateUrl: './bottom-tabs.component.html',
})
export class LayoutBottomTabsComponent {
    private readonly router = inject(Router)

    public readonly sections = APP_SECTIONS

    private readonly url = shownUrl(this.router)

    public readonly activeSection = computed(() => activeSectionFor(this.url()))
}
