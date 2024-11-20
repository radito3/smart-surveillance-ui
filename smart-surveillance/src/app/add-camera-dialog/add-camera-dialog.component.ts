import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-add-camera-dialog',
  standalone: true,
  imports: [],
  templateUrl: './add-camera-dialog.component.html',
  styleUrl: './add-camera-dialog.component.css'
})
export class AddCameraDialogComponent {

  @Output() submitCamera = new EventEmitter<any>();

  constructor(private httpClient: HttpClient) {}

  submit() {
    // POST mediamtx/cameras {ID: str, analysisMode: str, source: str, enableTranscoding: bool, maxReaders?: int}
  }
}
