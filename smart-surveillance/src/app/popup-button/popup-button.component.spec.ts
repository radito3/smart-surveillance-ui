import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupButtonComponent } from './popup-button.component';

describe('PopupButtonComponent', () => {
  let component: PopupButtonComponent;
  let fixture: ComponentFixture<PopupButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
