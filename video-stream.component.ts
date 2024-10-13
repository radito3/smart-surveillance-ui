import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';

@Component({
  selector: 'app-video-stream',
  templateUrl: './video-stream.component.html',
  styleUrls: ['./video-stream.component.css'],
})
export class VideoStreamComponent implements OnInit {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef;
  peerConnection!: RTCPeerConnection;

  constructor() {}

  ngOnInit(): void {
    this.setupWebRTC();
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
