import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Notification } from '../models/notification.model';
import { environment } from '../../environments/environment';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  // a second subject is created to allow users of the service to subscribe to
  // notifications$ before any connection is made
  private notificationsQueue = new Subject<Notification>();
  private notificationStream: WebSocketSubject<Notification> | null = null;

  public connectToNotificationsChannel() {
    this.notificationStream = webSocket<Notification>(environment.notificationServiceURL + '/notifications-stream');
    this.notificationStream?.subscribe(message => this.notificationsQueue.next(message));
  }

  public disconnectNotificationChannel(): void {
    this.notificationStream?.complete();
    this.notificationStream = null;
  }

  get notifications$(): Observable<Notification> {
    return this.notificationsQueue.asObservable();
  }
}
