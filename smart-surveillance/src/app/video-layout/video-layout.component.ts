import { Component, ElementRef, OnInit } from '@angular/core';

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

  constructor() {}

  ngOnInit(): void {
    // Simulate camera connections for demo
    this.initializeDemoCameras();
    this.setupWebRTC();
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

  setupWebRTC() {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    // Create WebRTC peer connection
    this.peerConnection = new RTCPeerConnection(configuration);

    // Attach the stream received from Janus to the video element
    this.peerConnection.ontrack = (event) => {
      this.videoElement.nativeElement.srcObject = event.streams[0];
    };

    // Setup signaling (here, you'd normally connect to Janus or a signaling server)
    this.createOffer();
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send the offer to the signaling server (e.g., Janus Gateway)
    this.sendToSignalingServer(offer);
  }

  sendToSignalingServer(offer: RTCSessionDescriptionInit) {
    // Here you'd implement WebSocket communication with Janus or the media server
    // This is a placeholder function.
    console.log('Sending offer to signaling server:', offer);
  }
}
