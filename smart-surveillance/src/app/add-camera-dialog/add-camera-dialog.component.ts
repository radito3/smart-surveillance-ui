import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { CameraConfig } from '../models/camera-config.model';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatInput } from '@angular/material/input';
import { NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-add-camera-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatSlideToggle, MatButton, NgIf],
  templateUrl: './add-camera-dialog.component.html',
  styleUrl: './add-camera-dialog.component.css'
})
export class AddCameraDialogComponent {

  @Output() submitCamera = new EventEmitter<CameraConfig>();

  form: FormGroup;
  submitClicked: boolean;

  constructor(private httpClient: HttpClient, private fb: FormBuilder) {
    this.submitClicked = false;
    this.form = this.fb.group({
      cameraID: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(64)]],
      cameraSource: ['', [Validators.required, Validators.pattern('(rtsp|rtmp|http)://.+')]],
      transcoding: [false],
      recording: [false],
      maxReaders: [3, [Validators.min(2), Validators.max(10), Validators.pattern('^[0-9]+$')]],
    });
  }

  onSubmit() {
    this.submitClicked = true;
    const payload = {...this.form.value} as CameraConfig;
    this.httpClient.post('http://mediamtx.hub.svc.cluster.local/endpoints', payload)
      .subscribe({
        next: _ => this.submitCamera.emit(payload),
        error: err => console.error('Could not create camera', err)
      });
  }
}
