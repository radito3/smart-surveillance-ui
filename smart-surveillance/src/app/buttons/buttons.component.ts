import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';
import { NotificationsConfigDialogComponent } from '../notifications-config-dialog/notifications-config-dialog.component';
import { HttpClient } from '@angular/common/http';
import { NotificationConfig } from '../models/notification-config.model';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-buttons',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './buttons.component.html',
  styleUrl: './buttons.component.css'
})
export class ButtonsComponent {

  @Output() cameraAdded: EventEmitter<any> = new EventEmitter();

  private cameraConfigs: Map<string, any> = new Map();
  private notificationsChannelOpen: boolean = false;

  constructor(private dialog: MatDialog, private httpClient: HttpClient, private notificationService: NotificationService) {}

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
  }

}
