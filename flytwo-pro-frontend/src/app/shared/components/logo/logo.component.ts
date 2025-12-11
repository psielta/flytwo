import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="8"
        [attr.stroke]="color"
        stroke-width="4"
      />
      <path
        [attr.fill]="color"
        d="M20 25 L50 25 L50 33 L30 33 L30 45 L45 45 L45 53 L30 53 L30 75 L20 75 Z"
      />
      <path
        [attr.fill]="color"
        d="M50 25 L80 25 L80 33 L65 33 L65 75 L55 75 L55 33 L50 33 Z"
      />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class LogoComponent {
  @Input() size = 32;
  @Input() color = 'currentColor';
}
