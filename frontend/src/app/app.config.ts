import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { routes } from './app.routes'
import { authInterceptor } from './core/interceptors/auth.interceptor'
import { ClerkService } from './core/services/clerk.service'

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideAppInitializer(() => inject(ClerkService).initialize()),
    ],
}
