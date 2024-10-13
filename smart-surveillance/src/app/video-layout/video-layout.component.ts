import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {
  // List of connected cameras
  cameras: Array<{ id: string, stream: MediaStream }> = [];

  constructor() {}

  ngOnInit(): void {
    // Simulate camera connections for demo
    this.initializeDemoCameras();
  }

  initializeDemoCameras() {
    // For demo purposes, simulate connected cameras
    // Replace this with actual camera stream logic
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.cameras = [
          { id: 'camera1', stream },
          { id: 'camera2', stream },
          { id: 'camera3', stream },
          { id: 'camera4', stream }
        ];
      })
      .catch(err => {
        console.error('Error accessing cameras:', err);
      });
  }
}
