// src/app/modules/admin/admin.routes.ts
import { Routes } from '@angular/router'
import { AdminGameProposalsComponent } from './components/admin-game-proposals/admin-game-proposals.component'
import { AdminGamesManageComponent } from './components/admin-games-manage/admin-games-manage.component'
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component'
import { AdminPageComponent } from './components/admin-page/admin-page.component'
import { AdminTagsManageComponent } from './components/admin-tags-manage/admin-tags-manage.component'

export const ADMIN_ROUTES: Routes = [
    {
        path: '', // Base path for /admin
        component: AdminLayoutComponent,
        children: [
            { path: '', redirectTo: 'panel', pathMatch: 'full' },
            { path: 'panel', component: AdminPageComponent },
            { path: 'proposals', component: AdminGameProposalsComponent },
            { path: 'manage-games', component: AdminGamesManageComponent },
            { path: 'manage-tags', component: AdminTagsManageComponent },
        ],
    },
]
