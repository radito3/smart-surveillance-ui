import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCameraDialogComponent } from './add-camera-dialog.component';

describe('AddCameraDialogComponent', () => {
  let component: AddCameraDialogComponent;
  let fixture: ComponentFixture<AddCameraDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCameraDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCameraDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
