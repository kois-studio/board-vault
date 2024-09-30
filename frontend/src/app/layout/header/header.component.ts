import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    standalone: true,
})
export class LayoutHeaderComponent implements OnInit {
    public currentLocale = 'en';
    public styles = {
        link: 'b-0 cursor-pointer p-2 text-xl font-bold tracking-wider hover:text-green-600',
    };
    public isSessionValid = false;

    ngOnInit() {}
}
