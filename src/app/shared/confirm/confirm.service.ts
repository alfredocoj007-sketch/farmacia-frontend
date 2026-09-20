import { Injectable, signal } from '@angular/core';

export type ConfirmTipo = 'primary' | 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tipo?: ConfirmTipo;
}

interface ActiveConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly active = signal<ActiveConfirm | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.active.set({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        tipo: options.tipo ?? 'primary',
        resolve,
      });
    });
  }

  handleConfirm(): void {
    const current = this.active();
    if (current) {
      this.active.set(null);
      current.resolve(true);
    }
  }

  handleCancel(): void {
    const current = this.active();
    if (current) {
      this.active.set(null);
      current.resolve(false);
    }
  }
}
