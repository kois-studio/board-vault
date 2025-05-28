import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { RouterModule } from '@angular/router'

@Component({
    selector: 'app-admin-sidebar',
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-sidebar.component.html',
})
export class AdminSidebarComponent {}
