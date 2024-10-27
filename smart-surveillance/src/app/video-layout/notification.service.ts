import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new Subject<string>();

  constructor(private zone: NgZone) {}

  public connectToNotifications(cameraId: string) {
    const eventSource = new EventSource('http://notif-service.addr:8080/notifications/' + cameraId);

    eventSource.onmessage = (event) => {
      this.zone.run(() => {
        this.notificationsSubject.next(event.data);
      });
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };
  }

  get notifications$(): Observable<string> {
    return this.notificationsSubject.asObservable();
  }
}
