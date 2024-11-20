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

  private cameraConfigs: Map<string, any> = new Map();

  constructor(private dialog: MatDialog, private httpClient: HttpClient) {}

  openAddCameraDialog() {
    const dialogRef = this.dialog.open(AddCameraDialogComponent);
    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: any) => {
      this.cameraAdded.emit(cameraConfig);
      this.cameraConfigs.set("<ID>", cameraConfig);
    });
  }

  openConfigNotificationsDialog() {
    const dialogRef = this.dialog.open(NotificationsConfigDialogComponent);
    dialogRef.componentInstance.configUpdated.subscribe((notificationsConfig: any) => {
      this.notificationsConfigUpdated.emit(notificationsConfig);
    });
  }

  startAnalysis() {
    for (let [ID, config] of this.cameraConfigs) {
      this.httpClient.post('http://mediamtx.hub.svc.cluster.local/analysis', {'ID': ID, 'config': config}); 
    }
  }

  anonymyze() {
    this.httpClient.post('http://mediamtx.hub.svc.cluster.local/anonymyze', {});
    // recreate the players with a anon- prefixed path
  }

}
