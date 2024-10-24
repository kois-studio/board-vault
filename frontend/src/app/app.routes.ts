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
import { LandingComponent } from './pages/landing/landing.component'
import { LoginComponent } from './pages/login/login.component'
import { MeetNewComponent } from './pages/meet-new/meet-new.component'
import { PageNotFoundComponent } from './pages/page-not-found/page-not-found.component'
import { RegisterComponent } from './pages/register/register.component'
import { ReviewComponent } from './pages/reviews/reviews.component'

export const routes: Routes = [
    {
        path: '',
        component: LayoutCompleteComponent,
        children: [
            // accessible to everyone
            { path: '', component: LandingComponent },
            // accessible to authenticated users
            { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
            { path: 'games', component: GamesComponent, canActivate: [AuthGuard] },
            { path: 'reviews', component: ReviewComponent, canActivate: [AuthGuard] },
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
            { path: 'group/new', component: GroupNewComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId/edit', component: GroupEditComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId/leave', component: GroupLeaveComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId/delete', component: GroupDeleteComponent, canActivate: [AuthGuard] },
            { path: 'group/:groupId/meet/new', component: MeetNewComponent, canActivate: [AuthGuard] },
        ],
    },
    { path: '**', component: PageNotFoundComponent }, // Wildcard route for a 404 page
]
