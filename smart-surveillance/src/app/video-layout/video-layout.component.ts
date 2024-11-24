import { Component, OnInit, Inject } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ControlsComponent } from "../controls/controls.component";
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
import { Notification } from '../models/notification.model';
import { CameraConfig } from '../models/camera-config.model';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, MatButton, MatIcon, ControlsComponent],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {

  cameraIDs: Array<string> = [];
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
      next: (payload: Notification) => {
        this.notification = payload.message;
        setTimeout(() => this.notification = null, 10000); // auto-hide after 10 seconds
      }
    });

    this.httpClient.get('/config/public_key.pem', { responseType: 'text' })
      .subscribe(publicKey => this.credsEncryptionKey = publicKey);
  }

  private encryptCredentials(creds: string): string {
    // openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
    // openssl rsa -pubout -in private_key.pem -out public_key.pem

    const pubKey = Forge.pki.publicKeyFromPem(this.credsEncryptionKey);

    const encryptedCreds = pubKey.encrypt(creds);
    return encryptedCreds;
  }

  startStream(cameraConfig: CameraConfig) {
    // FIXME: there is a TypeError where it doesn't find the method startsWith on a string???
    if (cameraConfig.source.startsWith("rtsp") || cameraConfig.source.startsWith("rtmp")) {
      const canvas = this.document.getElementById('canvas' + this.cameraIDs.length) as HTMLCanvasElement;
      const streamPath = cameraConfig.source.split('/').filter(Boolean).pop()!;
      this.cameraPlayers.push(this.playWsStream(canvas, streamPath));
    } else if (cameraConfig.source.startsWith("http")) {
      if (cameraConfig.source.endsWith("m3u8")) {
        this.cameraPlayers.push(this.playHlsStream(cameraConfig.source));
      } else {
        this.cameraPlayers.push(this.playDashStream(cameraConfig.source));
      }
    } else {
      this.notification = "Unsupported stream format";
      setTimeout(() => this.notification = null, 3000); // auto-hide after 3 seconds
      console.log("Unsupported stream format");
    }
  }

  private getCurrentPlaybackParentElement(): HTMLDivElement | null {
    switch (this.cameraIDs.length) {
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
    return new JSMpeg.Player('ws://mediamtx.hub.svc.cluster.local:8080/ws/' + path, {
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
      // append to cameras array
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
    const index = this.cameraIDs.indexOf(cameraID);
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
    this.cameraIDs.splice(index, 1);
  }

}
