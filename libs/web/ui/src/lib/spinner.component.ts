import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    class="spinner"
    [style.--size.px]="size"
    role="status"
    aria-label="Carregando"
  ></div>`,
  styles: [
    `
      .spinner {
        --size: 24px;
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        border: 3px solid #e5e7eb;
        border-top-color: #2563eb;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class SpinnerComponent {
  @Input() size = 24;
}
