import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';
import { NotificationsConfigDialogComponent } from '../notifications-config-dialog/notifications-config-dialog.component';
import { HttpClient } from '@angular/common/http';
import { NotificationConfig } from '../models/notification-config.model';
import { NotificationService } from '../services/notification.service';
import { BehaviorSubject, catchError, filter, map, of, retry, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './controls.component.html',
  styleUrl: './controls.component.css'
})
export class ControlsComponent implements OnChanges {

  @Input() cameraIDs: Array<string> = [];

  @Output() cameraAdded: EventEmitter<any> = new EventEmitter();

  cameraConfigs: Map<string, any> = new Map();
  private cameraIDs$ = new BehaviorSubject<string>('');
  private notificationsChannelOpen: boolean = false;

  constructor(private dialog: MatDialog, private httpClient: HttpClient,
              private notificationService: NotificationService) {
    this.cameraIDs$.pipe(
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cameraIDs'] && this.cameraIDs.length > 0) {
      let IDsNotPresent: string[] = [];

      for (let ID of this.cameraConfigs.keys()) {
        if (!this.cameraIDs.includes(ID)) {
          IDsNotPresent.push(ID);
        }
      }

      IDsNotPresent.forEach(this.cameraIDs$.next);
    }
  }

  openAddCameraDialog() {
    const dialogRef = this.dialog.open(AddCameraDialogComponent);
    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: any) => {
      this.cameraAdded.emit(cameraConfig);
      this.cameraConfigs.set("<ID>", cameraConfig);
    });
  }

  openConfigNotificationsDialog() {
    const dialogRef = this.dialog.open(NotificationsConfigDialogComponent);
    dialogRef.componentInstance.configUpdated.subscribe((notificationsConfig: NotificationConfig) => {
      if (notificationsConfig.uiPopup && !this.notificationsChannelOpen) {
        this.notificationService.connectToNotificationsChannel();
        this.notificationsChannelOpen = true;
      }
      if (!notificationsConfig.uiPopup && this.notificationsChannelOpen) {
        this.notificationService.disconnectNotificationChannel();
        this.notificationsChannelOpen = false;
      }
    });
  }

  startAnalysis() {
    for (let [ID, config] of this.cameraConfigs) {
      this.httpClient.post('http://mediamtx.hub.svc.cluster.local/analysis/'+ ID + '?analysisMode=' + config["analysisMode"], null); 
    }
  }

  anonymyze() {
    for (let ID of this.cameraConfigs.keys()) {
      this.httpClient.post('http://mediamtx.hub.svc.cluster.local/anonymyze/camera-' + ID, null);
      // recreate the players with a anon- prefixed path
    }
    // what about turning it off?
  }

}
