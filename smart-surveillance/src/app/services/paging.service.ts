import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EndpointConfig } from '../models/endpoint-config.model';
import { Endpoints } from '../models/endpoints.model';
import { environment } from '../../environments/environment';
import { expand, map, Observable, of, reduce, retry, takeWhile, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PagingService {

  constructor(private httpClient: HttpClient) {}

  public getAllEndpoints(): Observable<Array<EndpointConfig>> {
    let page = 1;
    let pageSize = 20;
    return this.fetchPage(page, pageSize)
      .pipe(
        expand((endpoints: Endpoints) => {
          page = page + 1;
          const hasMorePages = page <= Math.ceil(endpoints.itemCount / pageSize);
          return hasMorePages ? this.fetchPage(page, pageSize) : of(null);
        }),
        takeWhile(response => response !== null),
        map(response => response?.items ?? []),
        reduce((acc: Array<EndpointConfig>, items) => [...acc, ...items], [])
      )
  }

  private fetchPage(page: number = 1, perPage: number = 20): Observable<Endpoints> {
    return this.httpClient.get<Endpoints>(environment.mediaMtxURL + '/endpoints?page=' + page + '&itemsPerPage=' + perPage)
      .pipe(timeout(5000), retry({ count: 3, delay: 2000 }))
  }

}
