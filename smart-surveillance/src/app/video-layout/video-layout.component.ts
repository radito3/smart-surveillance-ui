import { Component, OnInit, Inject, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ControlsComponent } from "../controls/controls.component";
import { NotificationService } from '../services/notification.service';
import Hls from 'hls.js';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
// @ts-ignore
import JSMpeg from '@cycjimmy/jsmpeg-player';
import * as dashjs from 'dashjs';
import { Notification } from '../models/notification.model';
import { CameraConfig } from '../models/camera-config.model';
import { AfterRenderDirective } from './after-render.directive';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, MatButton, MatIcon, ControlsComponent, AfterRenderDirective],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {

  @ViewChildren(AfterRenderDirective) canvases?: QueryList<AfterRenderDirective>;
  
  cameraIDs: Array<string> = [];
  cameraPlayers: Array<JSMpeg.Player | Hls | dashjs.MediaPlayerClass | null> = [];
  canvasCloseButtons: Array<boolean> = (new Array(10)).fill(false);
  notification: string | null = null;

  constructor(private notificationService: NotificationService,
              private cdr: ChangeDetectorRef,
              @Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    // TODO: perform a GET /endpoints to check any existing cameras, in case the UI pod has been restarted

    this.notificationService.notifications$.subscribe({
      next: (payload: Notification) => {
        this.notification = payload.message;
        setTimeout(() => this.notification = null, 10000); // auto-hide after 10 seconds
      }
    });
  }

  addCamera(cameraConfig: CameraConfig) {
    this.cameraIDs.push(cameraConfig.ID);
    this.cdr.detectChanges();
    this.startStream(cameraConfig.source);
  }

  startStream(source: string) {
    if (source.startsWith("rtsp") || source.startsWith("rtmp")) {
      // TODO: ensure there is a path
      const streamPath = source.split('/').filter(Boolean).pop() ?? '';
      // TODO: the canvas is not always the last element
      this.cameraPlayers.push(this.playWsStream(this.canvases?.last.element!, streamPath));
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
    // FIXME: document.getElementById won't work - switch with the QueryList
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
    return new JSMpeg.Player('ws://mediamtx.hub.svc.cluster.local/ws/' + path, {
      audio: false,
      canvas: canvas,
      disableGl: true, // TODO: prefer using WebGL
      pauseWhenHidden: true
    });
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
