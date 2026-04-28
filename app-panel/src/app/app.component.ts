// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet, Router,
  NavigationStart, NavigationEnd,
  NavigationCancel, NavigationError
} from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="nav-progress-bar" [class.active]="navegando"></div>
    <router-outlet></router-outlet>
  `,
  styles: [`
    .nav-progress-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #82368C, #F31A73, #801AD3);
      transform: scaleX(0);
      transform-origin: left center;
      opacity: 0;
      z-index: 99999;
      transition: opacity 0.2s;
    }
    .nav-progress-bar.active {
      opacity: 1;
      transform: scaleX(0.85);
      transition: transform 3s cubic-bezier(0.1, 0.4, 0.8, 1), opacity 0.2s;
    }
  `]
})
export class AppComponent implements OnInit {
  navegando = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.navegando = true;
      }
      if (
        event instanceof NavigationEnd    ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Sin setTimeout — directo, dentro de NgZone siempre
        this.navegando = false;
      }
    });
  }
}