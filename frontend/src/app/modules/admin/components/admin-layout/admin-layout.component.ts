import { CommonModule } from '@angular/common'
import { Component, signal } from '@angular/core'
import { RouterModule } from '@angular/router'
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component'

@Component({
    templateUrl: './admin-layout.component.html',
    imports: [CommonModule, RouterModule, AdminSidebarComponent],
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
