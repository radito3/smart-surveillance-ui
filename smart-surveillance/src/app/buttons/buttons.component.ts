import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';
import { NotificationsConfigDialogComponent } from '../notifications-config-dialog/notifications-config-dialog.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-buttons',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './buttons.component.html',
  styleUrl: './buttons.component.css'
})
export class ButtonsComponent {

  @Output() cameraAdded: EventEmitter<any> = new EventEmitter();
  @Output() notificationsConfigUpdated: EventEmitter<any> = new EventEmitter();

  constructor(private dialog: MatDialog, private httpClient: HttpClient) {}

  openAddCameraDialog() {
    const dialogRef = this.dialog.open(AddCameraDialogComponent);
    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: any) => {
      this.cameraAdded.emit(cameraConfig);
    });
  }

  openConfigNotificationsDialog() {
    const dialogRef = this.dialog.open(NotificationsConfigDialogComponent);
    dialogRef.componentInstance.configUpdated.subscribe((notificationsConfig: any) => {
      this.notificationsConfigUpdated.emit(notificationsConfig);
    });
  }

  startAnalysis() {
    // the ML pipeline deployment is already created when creating the camera endpoint...
    // maybe store the camera config in the in-memory array in the video-layout component
    // and use it here
    this.httpClient.post('placeholder', null);
  }

  anonymyze() {
    this.httpClient.post('/anonymyze', null);
    // recreate the players with a anon- prefixed path
  }

}
