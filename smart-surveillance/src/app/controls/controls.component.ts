import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';
import { ConfigDialogComponent } from '../config-dialog/config-dialog.component';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { AnalysisMode, Config } from '../models/config.model';
import { NotificationService } from '../services/notification.service';
import { catchError, concatMap, from, mergeMap, Observable, of, retry, throwError, timeout } from 'rxjs';
import { CameraConfig } from '../models/camera-config.model';
import { environment } from '../../environments/environment';
import { NgIf } from '@angular/common';
import { RecordingsComponent } from '../recordings/recordings.component';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [NgIf, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css'
})
export class ControlsComponent implements OnInit, OnChanges {

  @Input() cameraIDs: Array<string> | null = [];

  @Output() cameraAdded: EventEmitter<CameraConfig> = new EventEmitter();
  @Output() anonymizationToggled: EventEmitter<boolean> = new EventEmitter();
  @Output() camerasClosed: EventEmitter<boolean> = new EventEmitter();

  analysisOpText: string = "Start";
  recordingPrefix: string = "Start";
  anonymyzePrefix: string = "";

  private analysisMode: AnalysisMode = AnalysisMode.Behaviour;
  private notificationsChannelOpen: boolean = false;
  private isAnalysisOn: boolean = false;
  private recordingState: boolean = false;
  private anonymizationState: boolean = false;

  constructor(private dialog: MatDialog,
              private httpClient: HttpClient,
              private notificationService: NotificationService) {}

  ngOnInit(): void {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.httpClient.post(environment.notificationServiceURL + '/config', {config: [new Config()]}, { headers: headers, responseType: 'text' })
      .pipe(
        catchError(err => this.handleConflict(err, '/config')),
        timeout(5000)
      )
      .subscribe({
        next: () => {
          this.notificationService.connectToNotificationsChannel();
          this.notificationsChannelOpen = true;
        },
        error: err => console.error('Could not send config request: ', err)
      });
  }

  private handleConflict(err: HttpErrorResponse, path: string): Observable<any> {
    if (err.status == 409) {
      console.log('Resource ' + path + ' already present');
      return of(null);
    }
    console.error('POST ' + path + ' request failed: ', err);
    return throwError(() => err);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['cameraIDs']) {
      return;
    }

    for (let ID of changes['cameraIDs'].previousValue ?? []) {
      if (this.cameraIDs?.includes(ID)) {
        continue;
      }

      console.log('Cleaning up resources for Camera with ID: ' + ID);
      // since the Web UI will delete endpoints, it acts as an Admin panel for the surveillance system
      // if any other non-browser clients are connected to the endpoints, their connections will be broken
      let operation = this.makeDeleteRequest('/endpoints/camera-' + ID);

      if (this.isAnalysisOn) {
        operation = this.makeDeleteRequest('/analysis/' + ID).pipe(
          // the DELETE /analysis/{ID} request should not block the deletion of the camera endpoint
          catchError(() => {
            console.log('Analysis delete request failed. Continuing...');
            return of(null);
          }),
          concatMap(() => this.makeDeleteRequest('/endpoints/camera-' + ID))
        );
      }

      operation.subscribe({
        error: err => console.error('Error cleaning up resources for Camera ' + ID, err)
      });
    }
  }

  private makeDeleteRequest(path: string): Observable<any> {
    return this.httpClient.delete(environment.mediaMtxURL + path, { responseType: 'text' })
      .pipe(
        timeout(5000),
        retry({ count: 3, delay: 2000 }),
        catchError(err => this.handleNotFound(err, path)),
      );
  }

  private handleNotFound(err: HttpErrorResponse, path: string): Observable<any> {
    if (err.status == 404) {
      console.log('Resource ' + path + ' already deleted');
      return of(null);
    }
    console.error('DELETE ' + path + ' request failed: ', err);
    return throwError(() => err);
  }

  openAddCameraDialog() {
    const dialogRef = this.dialog.open(AddCameraDialogComponent, {
      height: '37rem', width: '37rem',
      data: { cameraIDs: this.cameraIDs }
    });

    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: CameraConfig) => {
      this.cameraAdded.emit(cameraConfig);
      this.dialog.closeAll();

      if (this.isAnalysisOn) {
        this.makeAnalysisCall(cameraConfig.ID, true).subscribe({
          error: err => console.error('Could not start analysis for Camera ' + cameraConfig.ID, err)
        });
      }
    });
  }

  openConfigDialog() {
    const dialogRef = this.dialog.open(ConfigDialogComponent, {
      height: '40rem', width: '37rem'
    });

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
    from(this.cameraIDs ?? [])
      .pipe(
        mergeMap(ID => this.makeAnalysisCall(ID, !this.isAnalysisOn))
      )
      .subscribe({
        error: err => console.error('Could not ' + this.isAnalysisOn ? 'stop' : 'start' + ' analysis: ', err),
        complete: () => {
          this.isAnalysisOn = !this.isAnalysisOn;
          this.analysisOpText = this.isAnalysisOn ? "Stop" : "Start";
        }
      });
  }

  private makeAnalysisCall(ID: string, shouldAnalyse: boolean): Observable<any> {
    if (shouldAnalyse) {
      return this.httpClient.post(environment.mediaMtxURL + '/analysis/' + ID + '?analysisMode=' + this.analysisMode.toLowerCase(), null, { responseType: 'text' })
        .pipe(
          catchError(err => this.handleConflict(err, '/analysis/' + ID)),
          timeout(5000)
        )
    }
    return this.makeDeleteRequest('/analysis/' + ID)
  }

  openRecordingsDialog() {
    this.dialog.open(RecordingsComponent, {
      height: '37rem', width: '37rem'
    });
  }

  toggleRecordingAll() {
    const payload = { record: !this.recordingState };
    from(this.cameraIDs ?? [])
      .pipe(
        mergeMap(ID => this.httpClient.patch(environment.mediaMtxURL + '/endpoints/camera-' + ID, payload, { responseType: 'text' })
          .pipe(
            timeout(5000)
          )
        )
      )
      .subscribe({
        error: err => console.error('Could not start recording: ', err),
        complete: () => {
          this.recordingState = !this.recordingState;
          this.recordingPrefix = this.recordingState ? "Stop" : "Start";
        }
      })
  }

  toggleAnonymisation() {
    from(this.cameraIDs ?? [])
      .pipe(
        mergeMap(ID => this.httpClient.post(environment.mediaMtxURL + '/anonymyze/camera-' + ID, null, { responseType: 'text' })
          .pipe(
            catchError(err => this.handleConflict(err, '/anonymyze/camera-' + ID)),
            timeout(30000)
          )
        )
      )
      .subscribe({
        error: err => console.error('Could not anonymyze streams: ', err),
        complete: () => {
          this.anonymizationState = !this.anonymizationState;
          this.anonymizationToggled.emit(this.anonymizationState);
          this.anonymyzePrefix = this.anonymizationState ? "De-" : "";
        }
      });
  }

  closeCameras() {
    this.camerasClosed.emit(true);
  }

}
