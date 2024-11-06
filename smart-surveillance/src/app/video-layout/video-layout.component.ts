import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { PopupButtonComponent } from "../popup-button/popup-button.component";
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import * as Forge from 'node-forge';
import Hls from 'hls.js';
import { MatButton } from '@angular/material/button';
import { RawData, WebSocket } from 'ws';
import { FfmpegCommand } from 'fluent-ffmpeg';
// for some reason, ts can't resolve the dependency, even though it is installed correctly...
// @ts-ignore
import JSMpeg from '@cycjimmy/jsmpeg-player';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, MatButton, PopupButtonComponent],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {
  // List of connected cameras
  cameras: Array<{ id: string, stream: MediaStream }> = [];

  @ViewChild('video') videoElement!: ElementRef<HTMLVideoElement>;

  // ERROR TypeError: Cannot read properties of undefined (reading 'nativeElement')
  @ViewChild('canvas', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private hls!: Hls;

  private streamUrl: string = 'http://localhost:8554/mystream';

  peerConnection!: RTCPeerConnection;

  notification: string | null = null;

  private credsEncryptionKey: string = '';

  constructor(private notificationService: NotificationService, private httpClient: HttpClient) {}

  ngOnInit(): void {
    // TODO: perform a GET /endpoints to check any existing cameras, in case the UI pod has been restarted

    this.notificationService.notifications$.subscribe({
      next: (message) => {
        this.notification = message;
        setTimeout(() => this.notification = null, 10000); // auto-hide after 10 seconds
      }
    });

    const ctx = this.canvasElement.nativeElement.getContext('2d') as CanvasRenderingContext2D;

    const stream = new FfmpegCommand(this.streamUrl)
      .format('mp4')
      .pipe();
    
    stream.on('data', (data) => {
      // ws.send(data);
      const dataArr = new Uint8Array(data);
      const buffer = new JSMpeg.Buffer(dataArr);
      const packet = new JSMpeg.Packet(buffer);

      if (packet.type === 'video') {
        const image = packet.toImage();
        ctx.putImageData(image, 0, 0);
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

  startStream() {
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

    // is a websocket server even necessary?
    const wss = new WebSocket.Server({ port: 8085 });
    wss.on('connection', (ws) => {

      const stream = new FfmpegCommand(this.streamUrl)
        .format('mp4')
        .pipe();
      
      stream.on('data', (data) => {
        ws.send(data);
      });

      ws.on('close', () => {
        stream.destroy();
      });
    });

    const ctx = this.canvasElement.nativeElement.getContext('2d')!;

    const ws = new WebSocket('ws://localhost:8085');

    ws.on('message', (thisWs: WebSocket, data: RawData, isBinary: boolean) => {
      // const dataArr = new Uint8Array(data);a
      const buffer = new JSMpeg.Buffer(data);
      const packet = new JSMpeg.Packet(buffer);

      if (packet.type === 'video') {
        const image = packet.toImage();
        ctx.putImageData(image, 0, 0);
      }
    });

    // ws.onmessage = (event) => {
    //   const data = new Uint8Array(event.data);
    //   const buffer = new JSMpeg.Buffer(data);
    //   const packet = new JSMpeg.Packet(buffer);

    //   if (packet.type === 'video') {
    //     const image = packet.toImage();
    //     ctx.putImageData(image, 0, 0);
    //   }
    // };
  }

  stopStream() {
    // if (this.hls) {
    //   this.hls.destroy();
    // }
    // this.videoElement.nativeElement.src = '';
  }

  createCamera() {
    // POST mediamtx/cameras {ID: str, analysisMode: str, source: str, enableTranscoding: bool, maxReaders?: int}
    // POST notification-service/configs {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
    // GET notification-service/notifications/{cameraID} -> SSE stream
  }
}
