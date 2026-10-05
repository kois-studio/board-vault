// src/app/modules/admin/admin.routes.ts
import { Routes } from '@angular/router'
import { AdminGameProposalsComponent } from './components/admin-game-proposals/admin-game-proposals.component'
import { AdminGamesManageComponent } from './components/admin-games-manage/admin-games-manage.component'
import { AdminPageComponent } from './components/admin-page/admin-page.component'
import { AdminProposalReviewComponent } from './components/admin-proposal-review/admin-proposal-review.component'
import { AdminShellComponent } from './components/admin-shell/admin-shell.component'
import { AdminTagsManageComponent } from './components/admin-tags-manage/admin-tags-manage.component'

export const ADMIN_ROUTES: Routes = [
    {
        path: '', // Base path for /admin. No default child: on phones /admin is the list of areas.
        component: AdminShellComponent,
        children: [
            { path: 'panel', component: AdminPageComponent },
            { path: 'proposals', component: AdminGameProposalsComponent },
            { path: 'proposals/:id', component: AdminProposalReviewComponent },
            { path: 'manage-games', component: AdminGamesManageComponent },
            { path: 'manage-tags', component: AdminTagsManageComponent },
        ],
    },
]
