import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoLayoutComponent } from "./video-layout/video-layout.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, VideoLayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'smart-surveillance';
}
