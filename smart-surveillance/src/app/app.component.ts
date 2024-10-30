import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PopupButtonComponent } from './popup-button/popup-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PopupButtonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'smart-surveillance';
}
