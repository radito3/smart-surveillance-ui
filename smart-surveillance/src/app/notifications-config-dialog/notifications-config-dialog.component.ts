import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-notifications-config-dialog',
  standalone: true,
  imports: [],
  templateUrl: './notifications-config-dialog.component.html',
  styleUrl: './notifications-config-dialog.component.css'
})
export class NotificationsConfigDialogComponent implements OnInit {

  @Input() cameraID: string = '';
  
  @Output() configUpdated: EventEmitter<any> = new EventEmitter<any>();

  constructor(private httpClient: HttpClient, private notificationService: NotificationService) {}

  ngOnInit(): void {
    // POST notification-service/configs with default config
  }

  submit() {
    // POST notification-service/configs {camera_id: str, [{ui_popup?: bool, webhook_url?: str, smtp...}]}
    
    // if ui_popup is selected: 
    this.notificationService.connectToNotificationsChannel();
  }

}
