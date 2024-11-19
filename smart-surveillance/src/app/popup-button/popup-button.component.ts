import { Component } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-popup-button',
  standalone: true,
  imports: [NgFor, NgIf, MatButtonModule, MatIconModule],
  templateUrl: './popup-button.component.html',
  styleUrl: './popup-button.component.css',
  animations: [
    trigger('popOut', [
      state('hidden', style({ opacity: 0, transform: 'translateY(20px)' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('hidden => visible', animate('300ms ease-out')),
      transition('visible => hidden', animate('200ms ease-in')),
    ]),
    trigger('spin', [
      state('start', style({ transform: 'rotate(0deg)' })),
      state('end', style({ transform: 'rotate(90deg)' })),
      transition('start => end', animate('300ms ease-in-out')),
    ]),
    // trigger('hoverTooltip', [
    //   state('hidden', style({ opacity: 0 })),
    //   state('visible', style({ opacity: 1 })),
    //   transition('hidden => visible', animate('300ms ease-in')),
    //   transition('visible => hidden', animate('500ms ease-out'))
    // ])
  ]
})
export class PopupButtonComponent {
  isExpanded = false;
  spinState = 'start';
  hoverTooltipVisible = false;

  toggleButtons() {
    this.isExpanded = !this.isExpanded;
    this.spinState = this.spinState === 'start' ? 'end' : 'start';
  }

  showHoverTooltip() {
    this.hoverTooltipVisible = true;
    // setTimeout(() => this.hoverTooltipVisible = true, 300);
  }

  hideHoverTooltip() {
    this.hoverTooltipVisible = false;
    // setTimeout(() => this.hoverTooltipVisible = false, 500);
  }
}
