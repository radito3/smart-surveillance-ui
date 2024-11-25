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
import { retry, timeout } from 'rxjs';
import * as Forge from 'node-forge';

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

  private credsEncryptionKey: string = '';

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
      validators: [this.webhookCredentialsValidator, this.smtpCredentialsValidator]
    })

    this.httpClient.get('/config/public_key.pem', { responseType: 'text' })
      .pipe(timeout(2000), retry(3))
      .subscribe({
        next: publicKey => this.credsEncryptionKey = publicKey,
        error: err => console.error('Could not fetch credentials public key:', err)
      });
  }

  webhookCredentialsValidator(group: AbstractControl): ValidationErrors | null {
    const type = group.get('webhookAuthType')?.value;
    const creds = group.get('webhookCreds')?.value;

    const numEmpty = [!type, !creds]
      .map((condition: boolean) => condition ? 1 : 0)
      .reduce((total: number, current: number) => total + current, 0);

    if (numEmpty == 1) {
      return { invalidCreds: true };
    }
    return null;
  }

  smtpCredentialsValidator(group: AbstractControl): ValidationErrors | null {
    const server = group.get('smtpServer')?.value;
    const sender = group.get('smtpSender')?.value;
    const recipient = group.get('smtpRecipient')?.value;
    const creds = group.get('smtpCreds')?.value;

    const allEmpty = [
      !server, !sender, !recipient, !creds
    ].every(Boolean);

    if (allEmpty) {
      return null;
    }

    const allPresentAndValid = [
      server,
      sender, group.get('smtpSender')?.valid,
      recipient, group.get('smtpRecipient')?.valid,
      creds
    ].every(Boolean);

    if (!allPresentAndValid) {
      return { incompleteCreds: true };
    }
    return null;
  }

  onSubmit() {
    this.submitClicked = true;
    const payload = {...this.form.value} as Config;
    if (payload.webhookCredentials) {
      payload.webhookCredentials = this.encryptCredentials(payload.webhookCredentials);
    }
    if (payload.smtpCredentials) {
      payload.smtpCredentials = this.encryptCredentials(payload.smtpCredentials);
    }

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

  private encryptCredentials(creds: string): string {
    // openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:4096
    // openssl rsa -pubout -in private_key.pem -out public_key.pem

    const pubKey = Forge.pki.publicKeyFromPem(this.credsEncryptionKey);

    const encryptedCreds = pubKey.encrypt(creds);
    return encryptedCreds;
  }

}
