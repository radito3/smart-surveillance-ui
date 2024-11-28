import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CameraConfig } from '../models/camera-config.model';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatInput } from '@angular/material/input';
import { NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { timeout } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-add-camera-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatSlideToggle, MatButton, NgIf],
  templateUrl: './add-camera-dialog.component.html',
  styleUrl: './add-camera-dialog.component.css'
})
export class AddCameraDialogComponent {

  @Input() cameraIDs: Array<string> = [];

  @Output() submitCamera = new EventEmitter<CameraConfig>();

  form: FormGroup;
  submitClicked: boolean;

  constructor(private httpClient: HttpClient, private fb: FormBuilder) {
    this.submitClicked = false;
    this.form = this.fb.group({
      cameraID: ['', [Validators.required, this.cameraIDUniquenessValidator(this), Validators.minLength(1), Validators.maxLength(64)]],
      cameraSource: ['', [Validators.required, Validators.pattern('(rtsp|rtmp|http)://.+')]],
      transcoding: [false],
      recording: [false],
      maxReaders: [3, [Validators.min(2), Validators.max(10), Validators.pattern('^[0-9]+$')]],
    });
  }

  cameraIDUniquenessValidator(component: AddCameraDialogComponent): (group: AbstractControl) => ValidationErrors | null {
    // FIXME: the array isn't being passed by reference but by snapshot - need to have an active view of the array
    return (group: AbstractControl) => {
      // console.log('cameraIDs', component.cameraIDs);
      if (component.cameraIDs.includes(group.value)) {
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
    this.httpClient.post(environment.mediaMtxURL + '/endpoints', payload, { headers: headers })
      .pipe(timeout(5000))
      .subscribe({
        next: _ => this.submitCamera.emit(payload),
        error: err => {
          console.error('Could not create camera:', err);
          this.submitClicked = false;
        }
      });
  }
}
