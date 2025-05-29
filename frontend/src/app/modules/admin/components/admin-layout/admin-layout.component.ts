import { Component } from '@angular/core'
import { RouterModule } from '@angular/router'
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component'

@Component({
    templateUrl: './admin-layout.component.html',
    imports: [RouterModule, AdminSidebarComponent],
})
export class AdminLayoutComponent {}
