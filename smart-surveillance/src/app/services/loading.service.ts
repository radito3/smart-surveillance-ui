import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'any'
})
export class LoadingService {

    private loadingSubject = new BehaviorSubject<boolean>(false);

    show(): void {
        this.loadingSubject.next(true);
    }

    hide(): void {
        this.loadingSubject.next(false);
    }

    get toggle$(): Observable<boolean> {
        return this.loadingSubject.asObservable();
    }
}
