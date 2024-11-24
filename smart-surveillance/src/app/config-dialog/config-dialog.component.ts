import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { AnalysisMode, Config } from '../models/config.model';

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [],
  templateUrl: './config-dialog.component.html',
  styleUrl: './config-dialog.component.css'
})
export class ConfigDialogComponent {

  @Output() configUpdated: EventEmitter<Config> = new EventEmitter<Config>();

  constructor(private httpClient: HttpClient) {}

  submit() {
    // POST notification-service/configs {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
    this.configUpdated.emit(new Config(AnalysisMode.Activity, true, '', ''))
  }

}
