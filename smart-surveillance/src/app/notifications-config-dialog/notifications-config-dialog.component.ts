import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NotificationConfig } from '../models/notification-config.model';

@Component({
  selector: 'app-notifications-config-dialog',
  standalone: true,
  imports: [],
  templateUrl: './notifications-config-dialog.component.html',
  styleUrl: './notifications-config-dialog.component.css'
})
export class NotificationsConfigDialogComponent implements OnInit {

  @Output() configUpdated: EventEmitter<NotificationConfig> = new EventEmitter<NotificationConfig>();

  constructor(private httpClient: HttpClient) {}

  ngOnInit(): void {
    // POST notification-service/configs with default config
  }

  submit() {
    // POST notification-service/configs {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
  }

}
