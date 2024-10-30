import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { trigger, state, style, transition, animate } from '@angular/animations';


@Component({
  selector: 'app-popup-button',
  standalone: true,
  imports: [NgFor, MatButtonModule, MatIconModule],
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
  ]
})
export class PopupButtonComponent {
  isExpanded = false;
  spinState = 'start';

  toggleButtons() {
    this.isExpanded = !this.isExpanded;
    this.spinState = this.spinState === 'start' ? 'end' : 'start';
  }
}
