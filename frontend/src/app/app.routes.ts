import { Routes } from '@angular/router'

// Components
import { LandingComponent } from './pages/landing/landing.component'
import { LoginComponent } from './pages/login/login.component'
import { RegisterComponent } from './pages/register/register.component'
import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { ProfileComponent } from './pages/profile/profile.component'

// Guards
import { AuthRedirectGuard } from './core/guards/auth-redirect.guard'
import { AuthGuard } from './core/guards/auth.guard'

export const routes: Routes = [
    // accessible to everyone
    { path: '', component: LandingComponent },
    // accessible to unauthenticated users
    { path: 'login', component: LoginComponent, canActivate: [AuthRedirectGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [AuthRedirectGuard] },
    // accessible to authenticated users
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
]
