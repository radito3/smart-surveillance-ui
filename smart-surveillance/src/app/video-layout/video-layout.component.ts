import { Component, OnInit, Inject, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ControlsComponent } from "../controls/controls.component";
import { NotificationService } from '../services/notification.service';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Notification } from '../models/notification.model';
import { CameraConfig } from '../models/camera-config.model';
import { BehaviorSubject, delay, filter, from, map, mergeMap, Observable, of, retry, switchMap, take, tap, throwError, timeout, timer } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';
import { environment } from '../../environments/environment';
import { LoadingIndicatorComponent } from "../loading-indicator/loading-indicator.component";
import { LoadingService } from '../services/loading.service';
import { Endpoints } from '../models/endpoints.model';
import { EndpointConfig } from '../models/endpoint-config.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-video-layout',
  standalone: true,
  imports: [NgIf, NgFor, MatButton, MatIcon, AsyncPipe, ControlsComponent, LoadingIndicatorComponent],
  templateUrl: './video-layout.component.html',
  styleUrl: './video-layout.component.css'
})
export class VideoLayoutComponent implements OnInit, AfterViewInit {

  @ViewChildren('videoElem') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;

  cameraIDs$ = new BehaviorSubject<string[]>([]);
  videoFeeds = Array(4).fill(null).map(() => ({ active: false, loading: false, indicator: new LoadingService() }));

  private cameraPlayers: Array<Hls | dashjs.MediaPlayerClass | null> = Array(4).fill(null);
  private layoutStyles = ['one', 'two', 'three', 'four'];
  private isDisplayingNotification: boolean = false;

  constructor(private notificationService: NotificationService,
              private httpClient: HttpClient,
              private snackBar: MatSnackBar,
              @Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    this.notificationService.notifications$
      .subscribe((payload: Notification) => this.displayNotification(payload.message, payload.cameraID));
  }

  private displayNotification(message: string, cameraID?: string) {
    if (this.isDisplayingNotification) {
      return;
    }

    this.isDisplayingNotification = true;
    let cameraIndex: number = -1;
    if (cameraID) {
      cameraIndex = this.cameraIDs$.value.indexOf(cameraID);
      this.videoElements.toArray()[cameraIndex].nativeElement.style.setProperty('border', '8px solid red');
    }

    const snackBarRef = this.snackBar.open(message, 'Dismiss', {
      verticalPosition: 'top',
      horizontalPosition: 'center',
      panelClass: cameraID ? ['notification-snackbar', 'notification-alert'] : 'notification-snackbar'
    });

    snackBarRef.afterDismissed()
      .pipe(
        tap(() => this.isDisplayingNotification = false),
        mergeMap(() => of(null).pipe(
          delay(5000),
          // if the notification was dismissed but appears again within the 5s window, do not remove the border
          filter(() => cameraID != undefined && !this.isDisplayingNotification),
          tap(() => this.videoElements.toArray()[cameraIndex].nativeElement.style.removeProperty('border'))
        ))
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    // recreate video feeds in case the Web UI pod has been restarted
    this.httpClient.get<Endpoints>(environment.mediaMtxURL + '/endpoints')
      .pipe(timeout(5000), retry({ count: 3, delay: 2000 }))
      .pipe(
        switchMap(endpoints =>
          // paging?
          from(endpoints.items).pipe(
            take(4),
            tap(endpoint => console.log('Reconnecting camera stream: ', endpoint.name)),
            map(endpoint => this.mapEndpointToCameraConfig(endpoint))
          )
        )
      )
      .subscribe({
        next: config => this.addCamera(config),
        error: err => console.error('Could not fetch endpoints: ', err)
      })
  }

  private mapEndpointToCameraConfig(endpoint: EndpointConfig) {
    // for future dev: if the endpoint is not RTSP/RTMP, we don't know the source URL as MediaMTX does not return it
    const mediaMtxHost = this.getVideoSourceHostname();
    // the port doesn't matter as in the case of RTSP/RTMP endpoints, we rewrite the source address anyway
    const source = endpoint.source.type.substring(0, 5) + '://' + mediaMtxHost + '/' + endpoint.name;
    // this can corrupt the name if it is an anonymyzed stream
    // but those are indended for recordings anyway, so that is permissable
    const ID = endpoint.name.replace('camera-', '');
    return new CameraConfig(ID, source);
  }

  private getVideoSourceHostname(): string {
    // assume the cluster shares the same domain name across its services
    let hostname = this.document.location.hostname; // the DNS name of the one that hosts the UI
    let parts = hostname.split('.');
    if (parts.length > 2) { // if there is a subdomain (e.g. web-ui.k8s.example.com)
      parts[0] = 'mediamtx'; // switch the service name from web-ui to mediamtx
      hostname = parts.join('.');
    }
    return hostname;
  }

  addCamera(cameraConfig: CameraConfig) {
    this.cameraIDs$.next([...this.cameraIDs$.value, cameraConfig.ID]);

    this.updateVideoContianerStyleClass();

    const index = this.cameraIDs$.value.length - 1;
    const videoElem = this.videoElements.toArray()[index].nativeElement;

    const player = this.startStream(videoElem, index, cameraConfig.source, "camera-" + cameraConfig.ID);
    if (player !== null) {
      this.cameraPlayers[index] = player;
    } else {
      this.videoFeeds[index].active = false;
      this.cameraIDs$.next(this.cameraIDs$.value.filter(val => val != cameraConfig.ID));
    }
  }

  private updateVideoContianerStyleClass() {
    const container = this.document.getElementById('video-container') as HTMLDivElement;
    container.classList.remove(...this.layoutStyles);
    if (this.cameraIDs$.value.length != 0) {
      container.classList.add(this.layoutStyles[this.cameraIDs$.value.length - 1]);
    }
  }

  startStream(video: HTMLVideoElement, index: number, source: string, path: string): Hls | dashjs.MediaPlayerClass | null {
    if (source.startsWith("rtsp") || source.startsWith("rtmp")) {
      const hostname = this.getVideoSourceHostname();
      source = 'http://' + hostname + ':8080/static/' + path + ".m3u8";
    }

    if (!source.startsWith("http")) {
      console.error("Unsupported stream format for " + source);
      this.displayNotification("Unsupported stream format");
      return null;
    }

    if (source.endsWith("m3u8")) {
      const player = this.playHlsStream(video, index, source);
      if (player === null) {
        console.error("Can't play HLS stream " + source);
        this.displayNotification("Can't play HLS stream");
        return null;
      }
      return player;
    } else {
      return this.playDashStream(video, source);
    }
  }

  private playDashStream(video: HTMLVideoElement, streamURL: string): dashjs.MediaPlayerClass {
    const player = dashjs.MediaPlayer().create();
    player.initialize(video, streamURL, false);
    return player;
  }

  private playHlsStream(video: HTMLVideoElement, index: number, streamURL: string): Hls | null {
    if (!Hls.isSupported()) {
      return null;
    }

    let hls = new Hls({
      // debug: true,
      capLevelToPlayerSize: true,
      enableSoftwareAES: false,
      // progressive: true
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      console.log('hls error: ', data)
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('fatal media error encountered, trying to recover');
            hls.recoverMediaError();
            break;
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('fatal network error encountered: ', data);
            break;
          default:
            console.log('cannot recover hls error. stopping stream ' + index)
            hls.destroy();
            this.stopStream(index);
            break;
        }
      }
    });

    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());

    this.videoFeeds[index].loading = true;
    this.videoFeeds[index].indicator.show();

    // the HLS manifest file isn't created immediately - poll until it is present
    this.pollHlsManifestUntilPresent(streamURL).subscribe({
        next: () => {
          this.videoFeeds[index].active = true;
          hls.loadSource(streamURL);
          hls.attachMedia(video);
        },
        error: () => {
          console.error('Manifest not available after retries.');
          this.stopStream(index);
        },
        complete: () => {
          this.videoFeeds[index].loading = false;
          this.videoFeeds[index].indicator.hide();
        }
      });
    return hls;
  }

  private pollHlsManifestUntilPresent(url: string): Observable<any> {
    return this.httpClient.get(url, { observe: 'response', responseType: 'text' })
      .pipe(
        // a large retry window is necessary because the HLS files are created relatively slow
        retry({
          count: 15,
          delay: (err: HttpErrorResponse, retryCount: number) => {
            if (err.status == 404) {
              return timer(5000);
            }
            console.error('Unexpected error while fetching manifest: ', err);
            return throwError(() => err);
          }
        })
      );
  }

  toggleAnonymyzedStreams(anonymization: boolean) {
    for (let i = 0; i < this.cameraPlayers.length; i++) {
      const player = this.cameraPlayers[i];
      if (player instanceof Hls) {
        this.videoFeeds[i].active = false;
        const streamPath = (anonymization ? 'anon-camera-' : 'camera-') + this.cameraIDs$.value[i] + '.m3u8';
        this.changeStream(i, player, environment.mediaMtxURL + '/static/' + streamPath);
      } else if (player != null) {
        // for future dev: handle DASH players...
        console.log("Anonymizing MPEG-DASH streams not yet implemented");
      }
    }
  }

  private changeStream(index: number, player: Hls, newUrl: string) {
    player.stopLoad();
    this.videoFeeds[index].loading = true;
    this.videoFeeds[index].indicator.show();

    this.pollHlsManifestUntilPresent(newUrl).subscribe({
      next: () => {
        this.videoFeeds[index].active = true;
        player.loadSource(newUrl);
        player.startLoad();
      },
      error: () => {
        console.error('Manifest not available after retries.');
        this.stopStream(index);
      },
      complete: () => {
        this.videoFeeds[index].loading = false;
        this.videoFeeds[index].indicator.hide();
      }
    });
  }

  stopAllStreams() {
    const numCameras = this.cameraIDs$.value.length;
    for (let i = 0; i < numCameras; i++) {
      this.videoFeeds[i].active = false;
      this.cameraPlayers[i]?.destroy();
    }
    this.cameraIDs$.next([]);
    this.updateVideoContianerStyleClass();
  }

  stopStream(index: number) {
    this.videoFeeds[index].active = false;
    this.cameraPlayers[index]?.destroy();
    this.cameraIDs$.next(this.cameraIDs$.value.filter((val, idx) => idx != index));
    this.updateVideoContianerStyleClass();
  }

}
