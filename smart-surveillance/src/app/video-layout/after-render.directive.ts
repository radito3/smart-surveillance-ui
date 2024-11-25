import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({
  selector: '[appAfterRender]',
  standalone: true
})
export class AfterRenderDirective implements OnInit {

  constructor(private el: ElementRef) {}

  ngOnInit() {
    // console.log('Element is rendered:', this.el.nativeElement);
    // this.callback();
  }

  get element(): HTMLCanvasElement {
    return this.el.nativeElement as HTMLCanvasElement;
  }
}
