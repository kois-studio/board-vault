import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
})
export class LayoutHeaderComponent implements OnInit {
    public currentLocale = 'en';
    public styles = {
        link: 'b-0 cursor-pointer p-2 text-xl font-bold tracking-wider hover:text-green-600',
    };
    public isSessionValid = false;

    ngOnInit() {}
}
