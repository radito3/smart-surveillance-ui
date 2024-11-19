import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsConfigDialogComponent } from './notifications-config-dialog.component';

describe('NotificationsConfigDialogComponent', () => {
  let component: NotificationsConfigDialogComponent;
  let fixture: ComponentFixture<NotificationsConfigDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsConfigDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
