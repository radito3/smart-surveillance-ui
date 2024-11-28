import { Component, OnInit, Inject, ChangeDetectorRef, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ControlsComponent } from "../controls/controls.component";
import { NotificationService } from '../services/notification.service';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Notification } from '../models/notification.model';
import { CameraConfig } from '../models/camera-config.model';
import { filter, from, interval, map, retry, take, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgIf, NgFor, MatButton, MatIcon, ControlsComponent],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit {

  @ViewChildren('videoElem') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;

  cameraIDs: Array<string> = [];
  cameraPlayers: Array<Hls | dashjs.MediaPlayerClass | null> = [];

  videoFeeds = Array(4).fill({ active: false });
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

    const index = this.cameraIDs.length - 1;
    this.videoFeeds[index].active = true;
    const videoElem = this.videoElements.toArray()[index].nativeElement;
    this.startStream(videoElem, index, cameraConfig.source, "camera-" + cameraConfig.ID);
  }

  startStream(videoElem: HTMLVideoElement, index: number, source: string, path: string) {
    console.log(this.cameraIDs.length);
    if (source.startsWith("rtsp") || source.startsWith("rtmp")) {
      source = environment.mediaMtxURL + '/static/' + path + ".m3u8"
    }
    if (source.startsWith("http")) {
      if (source.endsWith("m3u8")) {
        this.cameraPlayers.push(this.playHlsStream(videoElem, index, source))
      } else {
        this.cameraPlayers.push(this.playDashStream(videoElem, source));
      }
    } else {
      this.notification = "Unsupported stream format";
      setTimeout(() => this.notification = null, 10000); // auto-hide after 10 seconds
      console.log("Unsupported stream format");
      this.cameraIDs.splice(index, 1);
      this.cdr.detectChanges();
    }
    console.log(this.cameraIDs.length);
  }

  private playDashStream(video: HTMLVideoElement, streamURL: string): dashjs.MediaPlayerClass {
    const player = dashjs.MediaPlayer().create();
    player.initialize(video, streamURL, false);
    return player;
  }

  private playHlsStream(video: HTMLVideoElement, index: number, streamURL: string): Hls | null {
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
            this.stopStream(index);
            break;
        }
      }
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());

    // TODO: show loading indicator in that respective <div>

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
          // TODO: hide the loading indicator
          hls.loadSource(streamURL);
          hls.attachMedia(video);
        },
        error: () => {
          console.error('Manifest not available after retries.');
          this.stopStream(index);
        },
      });
    return hls;
  }

  toggleAnonymyzedStreams(anonymization: boolean) {
    from(this.cameraPlayers)
      .pipe(
        filter(player => player !== null),
        map((value, index) => ({ index, value }))
      )
      .subscribe(tuple => {
        const idx = tuple.index;
        const player = tuple.value;

        if (player instanceof Hls) {
          const streamPath = anonymization ? 'anon-camera-' : 'camera-' + this.cameraIDs[idx]
          this.changeStream(player, environment.mediaMtxURL + '/static/' + streamPath)
        } else {
          // for future dev: handle DASH players...
          console.log("Anonymizing MPEG-DASH streams not yet implemented");
        }
      });
  }

  private changeStream(player: Hls, newUrl: string) {
    player.stopLoad();
    player.loadSource(newUrl);
    player.startLoad();
  }

  stopStreams() {
    for (let i = 0; i < this.cameraIDs.length; i++) {
      this.stopStream(i)
    }
  }

  stopStream(index: number) {
    this.videoFeeds[index].active = false;
    const player: Hls | dashjs.MediaPlayerClass | null = this.cameraPlayers[index];

    if (player === null) {
      const videoElem = this.document.getElementById('video'+ index) as HTMLVideoElement;
      videoElem.src = '';
    } else {
      player.destroy();
    }

    this.cameraPlayers.splice(index, 1);
    // console.log(this.cameraIDs.length);
    this.cameraIDs.splice(index, 1);
    // console.log(this.cameraIDs.length);
    this.cdr.detectChanges();
  }

}
