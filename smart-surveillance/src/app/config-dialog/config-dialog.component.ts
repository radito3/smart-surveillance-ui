import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { AnalysisMode, Config, WebhookAuthType } from '../models/config.model';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatOption, MatSelect } from '@angular/material/select';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatSlideToggle,
            MatButton, MatSelect, MatOption, NgIf, NgFor],
  templateUrl: './config-dialog.component.html',
  styleUrl: './config-dialog.component.css'
})
export class ConfigDialogComponent {

  @Output() configUpdated: EventEmitter<Config> = new EventEmitter<Config>();

  analysisTypes = AnalysisMode;
  analysisTypeKeys = Object.values(AnalysisMode);
  webhookAuthTypes = WebhookAuthType;
  webhookAuthTypeKeys = Object.values(WebhookAuthType);

  form: FormGroup;
  submitClicked: boolean;

  constructor(private httpClient: HttpClient, private fb: FormBuilder) {
    this.submitClicked = false;
    this.form = this.fb.group({
      analysisMode: [AnalysisMode.Behaviour],
      uiPopup: [true],
      webhookURL: ['', Validators.pattern('http(s?)://.+')],
      webhookTimeout: ['10', [Validators.min(1), Validators.max(300), Validators.pattern('^[0-9]+$')]],
      webhookAuthType: [null],
      webhookCreds: [''],
      smtpServer: [''],
      smtpSender: ['', Validators.email],
      smtpRecipient: ['', Validators.email],
      smtpCreds: ['']
    }, {
      validators: [this.webhookCredentialsValidator, this.smtpCredentialsValidator],
      updateOn: 'change'
    })
  }

  webhookCredentialsValidator(group: AbstractControl): ValidationErrors | null {
    const type = group.get('webhookAuthType')?.value;
    const creds = group.get('webhookCreds')?.value;

    if (creds && !type) {
      return { invalidCreds: true }; // custom error key
    }
    if (type && !creds) {
      return { invalidCreds: true };
    }
    return null;
  }

  smtpCredentialsValidator(group: AbstractControl): ValidationErrors | null {
    const sender = group.get('smtpSender')?.value
    const creds = group.get('smtpCreds')?.value;

    if (!sender && !creds) {
      return null;
    }
    if (sender && group.get('smtpSender')?.valid && creds) {
      return null;
    }
    return { incompleteCreds: true };
  }

  onSubmit() {
    this.submitClicked = true;
    const payload = {...this.form.value} as Config;
    this.httpClient.post('http://notification-service.hub.svc.cluster.local/config', payload)
      .pipe(timeout(5000))
      .subscribe({
        next: _ => this.configUpdated.emit(payload),
        error: err => {
          console.error('Could not send config request:', err);
          this.submitClicked = false;
        }
      });
  }

}
