// src/app/modules/admin/admin.routes.ts
import { Routes } from '@angular/router'
import { AdminGameProposalsComponent } from './components/admin-game-proposals/admin-game-proposals.component'
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component'
import { AdminPageComponent } from './components/admin-page/admin-page.component'

export const ADMIN_ROUTES: Routes = [
    {
        path: '', // Base path for /admin
        component: AdminLayoutComponent,
        children: [
            { path: '', redirectTo: 'panel', pathMatch: 'full' },
            { path: 'panel', component: AdminPageComponent },
            { path: 'proposals', component: AdminGameProposalsComponent },
        ],
    },
]
