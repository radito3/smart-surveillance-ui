import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Inject, Output } from '@angular/core';
import { CameraConfig } from '../models/camera-config.model';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatInput } from '@angular/material/input';
import { NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-add-camera-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, MatFormField, MatLabel, MatInput, MatError, MatSlideToggle, MatButton],
  templateUrl: './add-camera-dialog.component.html',
  styleUrl: './add-camera-dialog.component.css'
})
export class AddCameraDialogComponent {

  @Output() submitCamera = new EventEmitter<CameraConfig>();

  form: FormGroup;
  submitClicked: boolean;

  constructor(private httpClient: HttpClient,
              private fb: FormBuilder,
              @Inject(MAT_DIALOG_DATA) private data: any) {
    this.submitClicked = false;
    this.form = this.fb.group({
      cameraID: ['', [Validators.required, this.cameraIDUniquenessValidator(data.cameraIDs), Validators.minLength(1), Validators.maxLength(64)]],
      cameraSource: ['', [Validators.required, Validators.pattern('(rtsp|rtmp|http)://.+')]],
      transcoding: [false],
      recording: [false],
      maxReaders: [3, [Validators.min(2), Validators.max(10), Validators.pattern('^[0-9]+$')]],
    });
  }

  cameraIDUniquenessValidator(cameraIDs: string[]): (group: AbstractControl) => ValidationErrors | null {
    return (group: AbstractControl) => {
      const cameraID = group.value
      if (cameraID && cameraID.length > 0 && cameraIDs.includes(cameraID)) {
        return { nonUnique: true };
      }
      return null;
    };
  }

  onSubmit() {
    this.submitClicked = true;
    const payload = new CameraConfig(
      this.form.value.cameraID,
      this.form.value.cameraSource,
      this.form.value.transcoding,
      this.form.value.recording,
      this.form.value.maxReaders
    );

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.httpClient.post(environment.mediaMtxURL + '/endpoints', payload, { headers: headers, responseType: 'text' })
      .pipe(timeout(5000))
      .subscribe({
        next: () => this.submitCamera.emit(payload),
        error: err => {
          console.error('Could not create camera: ', err);
          this.submitClicked = false;
        }
      });
  }
}
