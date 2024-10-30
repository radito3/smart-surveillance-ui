import { Component, ElementRef, OnInit } from '@angular/core';
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import * as Forge from 'node-forge';

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

  private credsEncryptionKey: string = '';

  constructor(private notificationService: NotificationService, private httpClient: HttpClient) {}

  ngOnInit(): void {
    // TODO: perform a GET /endpoints to check any existing cameras, in case the UI pod has been restarted

    this.initializeDemoCameras();
    this.setupWebRTC();
  
    this.notificationService.notifications$.subscribe({
      next: (message) => {
        this.notification = message;
        setTimeout(() => this.notification = null, 5000); // auto-hide after 5 seconds
      }
    });

    this.httpClient.get('/config/public_key.pem', { responseType: 'text' })
      .subscribe(publicKey => {
        this.credsEncryptionKey = publicKey;
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

  private encryptCredentials(creds: string): string {
    // openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
    // openssl rsa -pubout -in private_key.pem -out public_key.pem

    const pubKey = Forge.pki.publicKeyFromPem(this.credsEncryptionKey);

    const encryptedCreds = pubKey.encrypt(creds);
    return encryptedCreds;
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
    // POST mediamtx/cameras {ID: str, analysisMode: str, source: str, enableTranscoding: bool, maxReaders?: int}
    // POST notification-service/configs {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
    // GET notification-service/notifications/{cameraID} -> SSE stream
  }
}
