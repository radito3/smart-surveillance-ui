import { Component, ElementRef, OnInit } from '@angular/core';
import { NotificationService } from './notification.service';

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

  // @ViewChild('videoElement', { static: true })
  videoElement!: ElementRef;
  peerConnection!: RTCPeerConnection;

  notification: string | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.initializeDemoCameras();
    this.setupWebRTC();
  
    this.notificationService.notifications$.subscribe({
      next: (message) => {
        this.notification = message;
        setTimeout(() => this.notification = null, 5000); // auto-hide after 5 seconds
      }
    });
  }

  // delet dis
  initializeDemoCameras() {
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

  setupWebRTC() {
    // Create WebRTC peer connection
    this.peerConnection = new RTCPeerConnection();

    // Attach the stream received from Janus to the video element
    this.peerConnection.ontrack = (event) => {
      this.videoElement.nativeElement.srcObject = event.streams[0];
    };
  }

  createCamera() {
    // POST mediamtx.addr:8080/cameras {ID: str, analysisMode: str, source: str, enableTranscoding: bool, maxReaders?: int}
    // POST notif-service.addr:8080/add {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
    // GET notif-service.addr:8080/notifications/{cameraID} -> SSE stream
  }
}
