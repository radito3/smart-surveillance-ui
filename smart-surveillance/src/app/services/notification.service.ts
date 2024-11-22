import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new Subject<Notification>();
  private popupNotificationStream: EventSource | null = null;

  constructor(private zone: NgZone) {}

  public connectToNotificationsChannel() {
    const eventSource = new EventSource('http://notification-service.hub.svc.cluster.local/notifications-stream');

    eventSource.onmessage = (event) => {
      this.zone.run(() => {
        this.notificationsSubject.next(event.data);
      });
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    this.popupNotificationStream = eventSource;
  }

  public disconnectNotificationChannel(): void {
    if (this.popupNotificationStream !== null) {
      this.popupNotificationStream.close();
      this.popupNotificationStream = null;
    }
  }

  get notifications$(): Observable<Notification> {
    return this.notificationsSubject.asObservable();
  }
}
