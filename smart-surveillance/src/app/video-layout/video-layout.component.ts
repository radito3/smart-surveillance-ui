import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, Inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ButtonsComponent } from "../buttons/buttons.component";
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import * as Forge from 'node-forge';
// import Hls from 'hls.js';
import { MatButton } from '@angular/material/button';
import { loadPlayer, Player } from 'rtsp-relay/browser';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, MatButton, ButtonsComponent],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {
  // List of connected cameras
  cameras: Array<{ id: string, stream: MediaStream }> = [];

  @ViewChild('canvas')
  canvasElement?: ElementRef<HTMLCanvasElement>;

  // private hls!: Hls;
  // peerConnection!: RTCPeerConnection;

  notification: string | null = null;

  private credsEncryptionKey: string = '';

  constructor(private notificationService: NotificationService,
     private httpClient: HttpClient,
     @Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    // TODO: perform a GET /endpoints to check any existing cameras, in case the UI pod has been restarted

    this.notificationService.notifications$.subscribe({
      next: (message) => {
        this.notification = message;
        setTimeout(() => this.notification = null, 10000); // auto-hide after 10 seconds
      }
    });

    // this.httpClient.get('/config/public_key.pem', { responseType: 'text' })
    //   .subscribe(publicKey => {
    //     this.credsEncryptionKey = publicKey;
    // });
  }

  private encryptCredentials(creds: string): string {
    // openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
    // openssl rsa -pubout -in private_key.pem -out public_key.pem

    const pubKey = Forge.pki.publicKeyFromPem(this.credsEncryptionKey);

    const encryptedCreds = pubKey.encrypt(creds);
    return encryptedCreds;
  }

  startStream(cameraConfig: any) {
    // if (Hls.isSupported()) {
    //   this.hls = new Hls();
    //   this.hls.loadSource(this.streamUrl);
    //   this.hls.attachMedia(this.videoElement.nativeElement);
    // } else if (this.videoElement.nativeElement.canPlayType('application/vnd.apple.mpegurl')) {
    //   // For Safari/iOS
    //   this.videoElement.nativeElement.src = this.streamUrl;
    // } else {
    //   console.log('can\'t play HLS stream');
    // }
  }

  private playStream(canvas: HTMLCanvasElement, path: string): Promise<Player> {
    return loadPlayer({
      url: 'ws://localhost:8080/ws/' + path,
      canvas: canvas,
      disableGl: true,
      pauseWhenHidden: true,
    })
  }

  stopStream(cameraID: string) {
    // if (this.hls) {
    //   this.hls.destroy();
    // }
    // this.videoElement.nativeElement.src = '';
  }

  private createCamera() {
    // POST mediamtx/cameras {ID: str, analysisMode: str, source: str, enableTranscoding: bool, maxReaders?: int}
    // POST notification-service/configs {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
    // GET notification-service/notifications/{cameraID} -> SSE stream
  }
}
