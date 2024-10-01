import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutHeaderComponent } from './layout/header/header.component';
import { LayoutFooterComponent } from './layout/footer/footer.component';
import { ToastComponent } from "./components/toast/toast.component";
import { LocalStorageService } from './core/services/local-storage.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, ToastComponent],
    templateUrl: './app.component.html',
})
export class AppComponent {
    title = 'frontend';

    constructor(private localStorageService: LocalStorageService) {}

    get getToken() {
        return this.localStorageService.getToken() ? 'true' : 'false';
    }
}
