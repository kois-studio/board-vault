// src/app/modules/admin/admin.routes.ts
import { Routes } from '@angular/router'
import { AdminPageComponent } from './components/admin-page/admin-page.component'
import { AdminLayoutComponent } from './components/layout-admin/admin-layout.component'

export const ADMIN_ROUTES: Routes = [
    {
        path: '', // Base path for /admin
        component: AdminLayoutComponent,
        children: [
            { path: '', redirectTo: 'panel', pathMatch: 'full' },
            { path: 'panel', component: AdminPageComponent },
        ],
    },
]
