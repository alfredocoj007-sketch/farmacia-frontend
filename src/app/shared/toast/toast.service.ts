import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private siguienteId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(mensaje: string, duracionMs = 3000): void {
    const id = this.siguienteId++;
    this.toasts.update((actuales) => [...actuales, { id, mensaje }]);

    setTimeout(() => {
      this.toasts.update((actuales) => actuales.filter((t) => t.id !== id));
    }, duracionMs);
  }

  dismiss(id: number): void {
    this.toasts.update((actuales) => actuales.filter((t) => t.id !== id));
  }
}
