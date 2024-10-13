import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoLayoutComponent } from './video-layout.component';

describe('VideoLayoutComponent', () => {
  let component: VideoLayoutComponent;
  let fixture: ComponentFixture<VideoLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
