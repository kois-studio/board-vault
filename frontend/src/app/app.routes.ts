import { Routes } from '@angular/router'

// Components
import { DashboardComponent } from './pages/dashboard/dashboard.component'
import { RegisterComponent } from './pages/register/register.component'
import { LoginComponent } from './pages/login/login.component'
import { ProfileComponent } from './pages/profile/profile.component'

// Guards
import { AuthRedirectGuard } from './core/guards/auth-redirect.guard'
import { AuthGuard } from './core/guards/auth.guard'

export const routes: Routes = [
    { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
    { path: 'register', component: RegisterComponent, canActivate: [AuthRedirectGuard] },
    { path: 'login', component: LoginComponent, canActivate: [AuthRedirectGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
]
