import { CommonModule } from '@angular/common'
import { Component, signal } from '@angular/core'
import { RouterModule } from '@angular/router'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component'

@Component({
    templateUrl: './admin-layout.component.html',
    imports: [CommonModule, RouterModule, AdminSidebarComponent, IconComponent],
})
export class AdminLayoutComponent {
    // --------------------------------------------------------------------------
    //        Component signals
    // --------------------------------------------------------------------------
    // Start collapsed so the admin area is usable on narrow screens.
    public readonly isSidebarCollapsed = signal(true)

    // --------------------------------------------------------------------------
    //        Component methods
    // --------------------------------------------------------------------------
    public toggleSidebar(): void {
        this.isSidebarCollapsed.update((value) => !value)
    }
}
