import { Component, DestroyRef, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { ToastComponent } from './components/toast/toast.component'

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastComponent],
    templateUrl: './app.component.html',
})
export class AppComponent {
    private readonly router = inject(Router)
    private readonly destroyRef = inject(DestroyRef)

    constructor() {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                setTimeout(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
            })
    }
}
