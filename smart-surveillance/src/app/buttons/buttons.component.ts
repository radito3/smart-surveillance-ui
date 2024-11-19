import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
// import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddCameraDialogComponent } from '../add-camera-dialog/add-camera-dialog.component';

@Component({
  selector: 'app-buttons',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './buttons.component.html',
  styleUrl: './buttons.component.css'
})
export class ButtonsComponent {

  @Output() cameraAdded: EventEmitter<any> = new EventEmitter(); 

  constructor(private dialog: MatDialog) {}

  openDialog() {
    const dialogRef = this.dialog.open(AddCameraDialogComponent);
    dialogRef.componentInstance.submitCamera.subscribe((cameraConfig: any) => {
      this.cameraAdded.emit(cameraConfig);
    });
  }

}
