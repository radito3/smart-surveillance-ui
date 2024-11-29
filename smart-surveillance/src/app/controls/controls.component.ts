import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';
import { ConfigDialogComponent } from '../config-dialog/config-dialog.component';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AnalysisMode, Config } from '../models/config.model';
import { NotificationService } from '../services/notification.service';
import { BehaviorSubject, catchError, filter, from, map, Observable, of, retry, switchMap, tap, throwError, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CameraConfig } from '../models/camera-config.model';
import { environment } from '../../environments/environment';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [NgIf, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css'
})
export class ControlsComponent implements OnInit {

  @Input() cameraIDs$?: Observable<string[]>;

  @Output() cameraAdded: EventEmitter<CameraConfig> = new EventEmitter();
  @Output() anonymizationToggled: EventEmitter<boolean> = new EventEmitter();
  @Output() camerasClosed: EventEmitter<boolean> = new EventEmitter();

  cameraIDs: Array<string> = [];
  analysisOpText: string = "Start";
  anonymyzePrefix: string = "";
  cameraConfigs: Map<string, CameraConfig> = new Map();

  private analysisMode: AnalysisMode = AnalysisMode.Behaviour;
  private removedCameraIDs$ = new BehaviorSubject<string>('');
  private notificationsChannelOpen: boolean = false;
  private isAnalysisOn: boolean = false;
  private anonymizationState: boolean = false;

  constructor(private dialog: MatDialog,
              private httpClient: HttpClient,
              private notificationService: NotificationService) {
    this.removedCameraIDs$
      .pipe(
        filter(value => value.length > 0),
        tap(ID => console.log('Cleaning up resources for Camera with ID: ' + ID)),
        switchMap((ID: string) =>
          this.isAnalysisOn
            ? this.makeDeleteRequest('/analysis/' + ID).pipe(map(() => ID))
            : of(ID)
        ),
        switchMap((ID: string) =>
          // since the Web UI will delete endpoints, it acts as an Admin panel for the surveillance system
          // if any other non-browser clients are connected to the endpoints, their connections will be broken
          this.makeDeleteRequest('/endpoints/camera-' + ID).pipe(map(() => ID))
        ),
        takeUntilDestroyed()
      )
      .subscribe({
        next: (ID: string) => this.cameraConfigs.delete(ID),
        error: err => console.error('Error removing camera:', err)
      });
  }

  private makeDeleteRequest(path: string): Observable<any> {
    return this.httpClient.delete(environment.mediaMtxURL + path, { responseType: 'text' })
      .pipe(
        timeout(5000),
        retry(3),
        catchError(err => {
          console.error('DELETE ' + path + ' request failed:', err);
          return throwError(() => err);
        }),
      );
  }

  ngOnInit(): void {
    this.cameraIDs$?.pipe(takeUntilDestroyed())
      .subscribe(cameraIDs => this.handleCameraIDsChanges(cameraIDs));

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.httpClient.post(environment.notificationServiceURL + '/config', {config: [new Config()]}, { headers: headers })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status == 409) {
            return of(null); // config already set
          }
          return throwError(() => err);
        }),
        timeout(5000)
      )
      .subscribe({
        next: () => {
          this.notificationService.connectToNotificationsChannel();
          this.notificationsChannelOpen = true;
        },
        error: err => console.error('Could not send config request:', err)
      });
  }

  private handleCameraIDsChanges(cameraIDs: string[]) {
    this.cameraIDs = cameraIDs;
    if (cameraIDs.length > 0) {
      let IDsNotPresent: string[] = [];

      for (let ID of this.cameraConfigs.keys()) {
        if (!cameraIDs.includes(ID)) {
          IDsNotPresent.push(ID);
        }
      }

      IDsNotPresent.forEach(ID => this.removedCameraIDs$.next(ID));
    }
  }

  openAddCameraDialog() {
    const dialogRef = this.dialog.open(AddCameraDialogComponent, {
      height: '37rem', width: '37rem',
      data: { cameraIDs: this.cameraIDs }
    });
    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: CameraConfig) => {
      this.cameraAdded.emit(cameraConfig);
      this.cameraConfigs.set(cameraConfig.ID, cameraConfig);
      this.dialog.closeAll();

      if (this.isAnalysisOn) {
        this.httpClient.post(environment.mediaMtxURL + '/analysis/' + cameraConfig.ID + '?analysisMode=' + this.analysisMode, null)
          .pipe(timeout(5000))
          .subscribe({
            error: err => console.error('Could not start analysis for Camera ' + cameraConfig.ID, err)
          });
      }
    });
  }

  openConfigDialog() {
    const dialogRef = this.dialog.open(ConfigDialogComponent, {height: '40rem', width: '37rem'});
    dialogRef.componentInstance.configUpdated.subscribe((config: Config) => {
      this.analysisMode = config.analysisMode;
      this.dialog.closeAll();

      if (config.uiPopup && !this.notificationsChannelOpen) {
        this.notificationService.connectToNotificationsChannel();
        this.notificationsChannelOpen = true;
      }
      if (!config.uiPopup && this.notificationsChannelOpen) {
        this.notificationService.disconnectNotificationChannel();
        this.notificationsChannelOpen = false;
      }
    });
  }

  toggleAnalysis() {
    if (this.isAnalysisOn) {
      this.isAnalysisOn = false;
      this.analysisOpText = "Start";

      for (let ID of this.cameraConfigs.keys()) {
        this.httpClient.delete(environment.mediaMtxURL + '/analysis/'+ ID, { responseType: 'text' })
          .pipe(timeout(5000), retry(3))
          .subscribe({
            error: err => console.error('Could not stop analysis for Camera ' + ID, err)
          });
      }
    } else {
      this.isAnalysisOn = true;
      this.analysisOpText = "Stop";

      for (let ID of this.cameraConfigs.keys()) {
        this.httpClient.post(environment.mediaMtxURL + '/analysis/'+ ID + '?analysisMode=' + this.analysisMode, null)
          .pipe(timeout(5000))
          .subscribe({
            error: err => console.error('Could not start analysis for Camera ' + ID, err)
          });
      }
    }
  }

  toggleAnonymisation() {
    from([...this.cameraConfigs.keys()])
      .pipe(
        switchMap(ID => this.httpClient.post(environment.mediaMtxURL + '/anonymyze/camera-' + ID, null)
          .pipe(timeout(5000))
        )
      )
      .subscribe({
        next: () => {
          this.anonymizationState = !this.anonymizationState;
          this.anonymizationToggled.emit(this.anonymizationState);
          this.anonymyzePrefix = this.anonymizationState ? "De-" : "";
        },
        error: err => console.error('Could not anonymyze streams: ', err)
      });
  }

  closeCameras() {
    this.camerasClosed.emit(true);
  }

}
