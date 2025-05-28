import { Component } from '@angular/core'
import { RouterModule } from '@angular/router'
import { AdminSidebarComponent } from '../admin-sidebar/admin-sidebar.component'

@Component({
    selector: 'app-admin-layout',
    templateUrl: './admin-layout.component.html',
    imports: [RouterModule, AdminSidebarComponent],
})
export class AdminLayoutComponent {}
