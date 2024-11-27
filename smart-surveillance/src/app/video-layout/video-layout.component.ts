import { Component, OnInit, Inject, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ControlsComponent } from "../controls/controls.component";
import { NotificationService } from '../services/notification.service';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Notification } from '../models/notification.model';
import { CameraConfig } from '../models/camera-config.model';
import { AfterRenderDirective } from './after-render.directive';
import { interval, retry, take, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase, NgSwitchDefault, NgIf, MatButton, MatIcon, ControlsComponent, AfterRenderDirective],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {

  @ViewChildren(AfterRenderDirective) videoRefs?: QueryList<AfterRenderDirective>;

  cameraIDs: Array<string> = [];
  cameraPlayers: Array<Hls | dashjs.MediaPlayerClass | null> = [];

  canvasCloseButtons: Array<boolean> = (new Array(10)).fill(false);
  notification: string | null = null;

  constructor(private notificationService: NotificationService,
              private httpClient: HttpClient,
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
    this.startStream(cameraConfig.source, "camera-" + cameraConfig.ID);
  }

  startStream(source: string, path: string) {
    if (source.startsWith("rtsp") || source.startsWith("rtmp")) {
      source = 'http://mediamtx.hub.svc.cluster.local/static/' + path + ".m3u8"
    }
    if (source.startsWith("http")) {
      if (source.endsWith("m3u8")) {
        // TODO: the <video> is not always the last element
        this.cameraPlayers.push(this.playHlsStream(this.videoRefs?.last.element!, source))
      } else {
        this.cameraPlayers.push(this.playDashStream(this.videoRefs?.last.element!, source));
      }
    } else {
      this.notification = "Unsupported stream format";
      setTimeout(() => this.notification = null, 3000); // auto-hide after 10 seconds
      console.log("Unsupported stream format");
    }
  }

  private playDashStream(video: HTMLVideoElement, streamURL: string): dashjs.MediaPlayerClass {
    const player = dashjs.MediaPlayer().create();
    player.initialize(video, streamURL, false);
    return player;
  }

  private playHlsStream(video: HTMLVideoElement, streamURL: string): Hls | null {
    if (!Hls.isSupported()) {
      this.notification = "Can't play HLS stream";
      setTimeout(() => this.notification = null, 10000); // auto-hide after 10 seconds
      console.error("Can't play HLS stream");
      return null;
    }

    let hls = new Hls({
      // debug: true,
      capLevelToPlayerSize: true,
      enableSoftwareAES: false,
      // progressive: true
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.log('error: ', data)
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('fatal media error encountered, try to recover');
            hls.recoverMediaError();
            break;
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('fatal network error encountered:', data);
            break;
          default:
            // cannot recover
            hls.destroy();
            this.stopStream(0); // TODO: figure out index
            break;
        }
      }
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());

    // the HLS manifest file isn't created immediately - poll until it is present
    this.httpClient.get(streamURL, { observe: 'response', responseType: 'text' })
      .pipe(
        retry({
          count: 10,
          delay: (err: HttpErrorResponse, retryCount: number) => {
            if (err.status == 404) {
              return interval(3000).pipe(take(1));
            }
            console.error('Unexpected error while fetching manifest:', err);
            return throwError(() => err);
          }
        })
      )
      .subscribe({
        next: () => {
          hls.loadSource(streamURL);
          hls.attachMedia(video);
        },
        error: () => {
          console.error('Manifest not available after retries.');
          this.stopStream(0); // TODO: figure out index
        },
      });
    return hls;
  }

  stopStream(index: number) {
    const player = this.cameraPlayers[index];

    if (player === null) {
      const videoElem = this.document.getElementById('video'+ (index + 1)) as HTMLVideoElement;
      videoElem.src = '';
    }
    if (player instanceof Hls) {
      player.destroy();
    }
    // this class isn't found by the type system...
    // if (player instanceof dashjs.MediaPlayerClass) {
    //   player.destroy();
    // }

    // FIXME: the page isn't automatically re-rendered after this change
    this.cameraPlayers.splice(index, 1);
    this.cameraIDs.splice(index, 1);
  }

}
