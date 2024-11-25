import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';
import { ConfigDialogComponent } from '../config-dialog/config-dialog.component';
import { HttpClient } from '@angular/common/http';
import { AnalysisMode, Config } from '../models/config.model';
import { NotificationService } from '../services/notification.service';
import { BehaviorSubject, catchError, filter, map, of, retry, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CameraConfig } from '../models/camera-config.model';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css'
})
export class ControlsComponent implements OnChanges, OnInit {

  @Input() cameraIDs: Array<string> = [];

  @Output() cameraAdded: EventEmitter<CameraConfig> = new EventEmitter();

  analysisOpText: string = "Start";
  cameraConfigs: Map<string, CameraConfig> = new Map();

  private analysisMode: AnalysisMode = AnalysisMode.Behaviour;
  private removedCameraIDs$ = new BehaviorSubject<string>('');
  private notificationsChannelOpen: boolean = false;
  private isAnalysisOn: boolean = false;

  constructor(private dialog: MatDialog, private httpClient: HttpClient,
              private notificationService: NotificationService) {
    this.removedCameraIDs$.pipe(
        filter(value => value.length > 0),
        switchMap((ID: string) =>
          this.httpClient.delete("http://mediamtx.hub.svc.cluster.local/analysis/" + ID).pipe(
            catchError(err => {
              console.error('Stop analysis request failed', err);
              return of(null); // Handle error gracefully
            }),
            retry(3),
            map(_ => ID)
          )
        ),
        switchMap((ID: string) =>
          this.httpClient.delete("http://mediamtx.hub.svc.cluster.local/endpoints/" + ID).pipe(
            catchError(err => {
              console.error('Delete endpoint request failed', err);
              return of(null); // Handle error gracefully
            }),
            retry(3),
            map(_ => ID)
          )
        ),
        takeUntilDestroyed()
      ).subscribe({
        next: (ID: string) => this.cameraConfigs.delete(ID),
        error: (err) => console.error('Error deleting camera', err)
      });
  }

  ngOnInit(): void {
    // POST notification-service/configs with default config
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cameraIDs'] && this.cameraIDs.length > 0) {
      let IDsNotPresent: string[] = [];

      for (let ID of this.cameraConfigs.keys()) {
        if (!this.cameraIDs.includes(ID)) {
          IDsNotPresent.push(ID);
        }
      }

      IDsNotPresent.forEach(this.removedCameraIDs$.next);
    }
  }

  openAddCameraDialog() {
    // TODO: the dialog box is a bit small, figure out how to make it larger
    const dialogRef = this.dialog.open(AddCameraDialogComponent, {height: '37rem', width: '37rem'});
    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: CameraConfig) => {
      this.cameraAdded.emit(cameraConfig);
      this.cameraConfigs.set(cameraConfig.ID, cameraConfig);
      if (this.isAnalysisOn) {
        this.httpClient.post('http://mediamtx.hub.svc.cluster.local/analysis/'+ cameraConfig.ID + '?analysisMode=' + this.analysisMode, null)
          .subscribe({
            error: err => console.error('Could not start analysis for Camera ' + cameraConfig.ID, err)
          });
      }
      this.dialog.closeAll();
    });
  }

  openConfigDialog() {
    const dialogRef = this.dialog.open(ConfigDialogComponent);
    dialogRef.componentInstance.configUpdated.subscribe((config: Config) => {
      this.analysisMode = config.analysisMode;
      if (config.uiPopup && !this.notificationsChannelOpen) {
        this.notificationService.connectToNotificationsChannel();
        this.notificationsChannelOpen = true;
      }
      if (!config.uiPopup && this.notificationsChannelOpen) {
        this.notificationService.disconnectNotificationChannel();
        this.notificationsChannelOpen = false;
      }
      this.dialog.closeAll();
    });
  }

  toggleAnalysis() {
    if (this.isAnalysisOn) {
      this.isAnalysisOn = false;
      this.analysisOpText = "Start";
      for (let ID of this.cameraConfigs.keys()) {
        this.httpClient.delete('http://mediamtx.hub.svc.cluster.local/analysis/'+ ID)
          .subscribe({
            error: err => console.error('Could not stop analysis for Camera ' + ID, err)
          });
      }
    } else {
      this.isAnalysisOn = true;
      this.analysisOpText = "Stop";
      for (let [ID, config] of this.cameraConfigs) {
        this.httpClient.post('http://mediamtx.hub.svc.cluster.local/analysis/'+ ID + '?analysisMode=' + this.analysisMode, null)
          .subscribe({
            error: err => console.error('Could not start analysis for Camera ' + ID, err)
          });
      }
    }
  }

  anonymyze() {
    for (let ID of this.cameraConfigs.keys()) {
      this.httpClient.post('http://mediamtx.hub.svc.cluster.local/anonymyze/camera-' + ID, null)
        .subscribe({
          error: err => console.error('Could not anonymyze Stream ' + ID, err)
        });
      // recreate the players with a anon- prefixed path
    }
    // what about turning it off?
  }

}
