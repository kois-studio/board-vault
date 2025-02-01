import { Routes } from '@angular/router'
import { AuthRedirectGuard } from './core/guards/auth-redirect.guard'
import { AuthGuard } from './core/guards/auth.guard'
import { LayoutBasicComponent } from './layout/layout-basic/layout-basic.component'
import { LayoutCompleteComponent } from './layout/layout-complete/layout-complete.component'
import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { GamesComponent } from './pages/games/games.component'
import { GroupDeleteComponent } from './pages/group-delete/group-delete.component'
import { GroupEditComponent } from './pages/group-edit/group-edit.component'
import { GroupLeaveComponent } from './pages/group-leave/group-leave.component'
import { GroupNewComponent } from './pages/group-new/group-new.component'
import { GroupViewComponent } from './pages/group-view/group-view.component'
import { LandingComponent } from './pages/landing/landing.component'
import { LoginComponent } from './pages/login/login.component'
import { MeetViewComponent } from './pages/meet-view/meet-view.component'
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component'
import { RegisterComponent } from './pages/register/register.component'
import { ReviewComponent } from './pages/reviews/reviews.component'

/**
 * Which route uses LayoutBasicComponent and which uses LayoutCompleteComponent?
 * The idea is to differentiate between when the user is making an *action* or only visualizing information.
 *
 * `LayoutBasicComponent`: you are executing an action that will change the state of the application.
 *    - auth actions (login, register, recover password, etc)
 *    - CRUD actions (create a new group or edit its data)
 *
 * `LayoutCompleteComponent`: you are only visualizing information.
 *   - dashboard
 *   - group details
 *
 * The reason is that by doing this, the user gets a "focused" experience on the action they are doing. 0 distractions.
 */
export const routes: Routes = [
    {
        path: '',
        component: LayoutCompleteComponent,
        children: [
            // accessible to everyone
            { path: '', component: LandingComponent }, // cannot move it to routes[n>0] unless routes[0].path !== ''
            // accessible to authenticated users
            { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
            { path: 'games', component: GamesComponent, canActivate: [AuthGuard] },
            { path: 'reviews', component: ReviewComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId', component: GroupViewComponent, canActivate: [AuthGuard] },
            { path: 'meets/:meetId', component: MeetViewComponent, canActivate: [AuthGuard] },
        ],
    },
    {
        path: '',
        component: LayoutBasicComponent,
        children: [
            // accessible to unauthenticated users
            { path: 'login', component: LoginComponent, canActivate: [AuthRedirectGuard] },
            { path: 'register', component: RegisterComponent, canActivate: [AuthRedirectGuard] },
            // accessible to authenticated users
            { path: 'create-group', component: GroupNewComponent, canActivate: [AuthGuard] }, // 'group/new' would break in 'group/:groupId'
            { path: 'group/:groupId/edit', component: GroupEditComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId/leave', component: GroupLeaveComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId/delete', component: GroupDeleteComponent, canActivate: [AuthGuard] },
        ],
    },
    { path: '**', component: PageNotFoundComponent }, // Wildcard route for a 404 page
]
