import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LayoutHeaderComponent } from './layout/header/header.component'
import { LayoutFooterComponent } from './layout/footer/footer.component'
import { ToastComponent } from './components/toast/toast.component'
import { LocalStorageService } from './core/services/local-storage.service'
import { HttpClient } from '@angular/common/http'
import { environment } from '../environments/environment'

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, ToastComponent],
    templateUrl: './app.component.html',
})
export class AppComponent {
    title = 'frontend'

    constructor(
        private readonly localStorageService: LocalStorageService,
        private readonly http: HttpClient,
    ) {}

    get getToken() {
        return this.localStorageService.getToken() ? 'true' : 'false'
    }

    testGetUsers() {
        const url = `${environment.apiUrl}/users`
        this.http.get(url).subscribe({
            next: (data) => {
                alert('success')
                console.log('data', data)
            },
            error: (error) => {
                alert('error')
                console.error('error', error)
            },
        })
    }
}
