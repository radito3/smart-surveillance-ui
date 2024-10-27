import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new Subject<string>();

  constructor(private zone: NgZone) {
    this.connectToNotifications();
  }

  private connectToNotifications() {
    const eventSource = new EventSource('http://localhost:8080/notifications');

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
