import { Component, OnInit, Inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ButtonsComponent } from "../buttons/buttons.component";
import { NotificationService } from '../services/notification.service';
import { HttpClient } from '@angular/common/http';
import * as Forge from 'node-forge';
import Hls from 'hls.js';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
// import { loadPlayer, Player } from 'rtsp-relay/browser';
// @ts-ignore
import JSMpeg from '@cycjimmy/jsmpeg-player';
import * as dashjs from 'dashjs';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, MatButton, MatIcon, ButtonsComponent],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {
  cameras: Array<string> = [];

  cameraPlayers: Array<JSMpeg.Player | Hls | dashjs.MediaPlayerClass | null> = [];

  canvasCloseButtons: Array<boolean> = (new Array(10)).fill(false);

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
    const source: string = "";

    if (source.startsWith("rtsp") || source.startsWith("rtmp")) {
      // convert to ws endpoint
      const canvas = this.document.getElementById('canvas' + this.cameras.length) as HTMLCanvasElement;
      this.cameraPlayers.push(this.playWsStream(canvas, source));
    } else if (source.startsWith("http")) {
      if (source.endsWith("m3u8")) {
        this.cameraPlayers.push(this.playHlsStream(source));
      } else {
        this.cameraPlayers.push(this.playDashStream(source));
      }
    } else {
      this.notification = "Unsupported stream format";
      setTimeout(() => this.notification = null, 3000); // auto-hide after 3 seconds
      console.log("Unsupported stream format");
    }
  }

  private getCurrentPlaybackParentElement(): HTMLDivElement | null {
    switch (this.cameras.length) {
      case 1: return this.document.getElementById('singleCamera') as HTMLDivElement;
      case 2: return this.document.getElementById('twoCameras') as HTMLDivElement;
      case 3: return this.document.getElementById('threeCameras') as HTMLDivElement;
      case 4: return this.document.getElementById('fourCameras') as HTMLDivElement;
      default: return null;
    }
  }

  private createVideoElement(parent: HTMLDivElement): HTMLVideoElement {
    const videoElement = this.document.createElement('video');
    videoElement.controls = false;
    videoElement.autoplay = false;
    // style?
    parent.appendChild(videoElement);
    return videoElement;
  }

  private playWsStream(canvas: HTMLCanvasElement, path: string): JSMpeg.Player {
    return new JSMpeg.Player('ws://localhost:8080/ws/' + path, {
      audio: false,
      canvas: canvas,
      disableGl: true,
      pauseWhenHidden: true
    });
    // return loadPlayer({
    //   url: 'ws://localhost:8080/ws/' + path,
    //   canvas: canvas,
    //   disableGl: true,
    //   pauseWhenHidden: true,
    // })
  }

  private playDashStream(streamURL: string): dashjs.MediaPlayerClass {
    const video = this.createVideoElement(this.getCurrentPlaybackParentElement()!);
    const player = dashjs.MediaPlayer().create();
    player.initialize(video, streamURL, false);
    return player;
  }

  private playHlsStream(streamURL: string): Hls | null {
    const parent = this.getCurrentPlaybackParentElement();
    if (parent === null) {
      // append to cameras array and trigger a change detection, so that Angular can re-render the DOM tree
    }
    const videoElement = this.createVideoElement(parent!);

    if (Hls.isSupported()) {
      let hls = new Hls();
      hls.loadSource(streamURL);
      hls.attachMedia(videoElement);
      return hls;
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari/iOS
      videoElement.src = streamURL;
    } else {
      this.notification = "Can't play HLS stream";
      setTimeout(() => this.notification = null, 3000); // auto-hide after 3 seconds
      console.log("Can't play HLS stream");
    }
    return null;
  }

  stopStream(cameraID: string) {
    const index = this.cameras.indexOf(cameraID);

    const player = this.cameraPlayers[index];

    if (player === null) {
      // find video element and set src to ''
    }
    if (player instanceof JSMpeg.Player) {
      player.destroy();
    }
    if (player instanceof Hls) {
      player.destroy();
    }
    // if (player instanceof dashjs.MediaPlayerClass) {
    //   player.destroy();
    // }
    this.cameraPlayers.splice(index, 1);
  }

}
