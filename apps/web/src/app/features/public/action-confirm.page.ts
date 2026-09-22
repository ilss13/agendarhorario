import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionTokenApi } from '@agendarhorario/web-data-access';
import type { ActionPreviewDto } from '@agendarhorario/contracts';
import { EmptyStateComponent, SpinnerComponent } from '@agendarhorario/web-ui';
import { formatBrDateTime } from '@agendarhorario/utils';
import type { ApiError } from '../../core/http/error.interceptor';

@Component({
  selector: 'app-action-confirm-page',
  standalone: true,
  imports: [EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './action-confirm.page.html',
  styleUrl: './action-confirm.page.scss',
})
export class ActionConfirmPageComponent {
  private readonly api = inject(ActionTokenApi);
  private readonly route = inject(ActivatedRoute);

  readonly preview = signal<ActionPreviewDto | null>(null);
  readonly result = signal<{ status: ActionPreviewDto['appointment']['status'] } | null>(null);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loadError.set('Token ausente');
      return;
    }
    this.loading.set(true);
    this.api.preview(token).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loading.set(false);
      },
      error: (err: ApiError) => {
        this.loading.set(false);
        this.loadError.set(err.message ?? 'Não foi possível carregar o link');
      },
    });
  }

  submit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    const preview = this.preview();
    if (!token || !preview) return;
    this.submitting.set(true);
    this.submitError.set(null);
    this.api.confirm(token, preview.kind).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.result.set(result);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.submitError.set(err.message ?? 'Não foi possível processar a ação');
      },
    });
  }

  formatDate(iso: string): string {
    return formatBrDateTime(iso);
  }

  statusLabel(status: ActionPreviewDto['appointment']['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Aguardando confirmação';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'COMPLETED':
        return 'Concluído';
      case 'NO_SHOW':
        return 'Não compareceu';
    }
  }
}
