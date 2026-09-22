import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  titulo?: string;
  mensaje: string;
  tipo: ToastTipo;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private siguienteId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(mensaje: string, tipo: ToastTipo = 'success', duracionMs = 3500): void {
    const id = this.siguienteId++;
    this.toasts.update((actuales) => [...actuales, { id, mensaje, tipo }]);

    setTimeout(() => {
      this.dismiss(id);
    }, duracionMs);
  }

  showWithTitle(titulo: string, mensaje: string, tipo: ToastTipo = 'success', duracionMs = 3500): void {
    const id = this.siguienteId++;
    this.toasts.update((actuales) => [...actuales, { id, titulo, mensaje, tipo }]);

    setTimeout(() => {
      this.dismiss(id);
    }, duracionMs);
  }

  success(tituloOMensaje: string, detalleODuracion?: string | number, duracionMs = 3500): void {
    if (typeof detalleODuracion === 'string') {
      this.showWithTitle(tituloOMensaje, detalleODuracion, 'success', duracionMs);
    } else {
      this.show(tituloOMensaje, 'success', typeof detalleODuracion === 'number' ? detalleODuracion : 3500);
    }
  }

  error(tituloOMensaje: string, detalleODuracion?: string | number, duracionMs = 4500): void {
    if (typeof detalleODuracion === 'string') {
      this.showWithTitle(tituloOMensaje, detalleODuracion, 'error', duracionMs);
    } else {
      this.show(tituloOMensaje, 'error', typeof detalleODuracion === 'number' ? detalleODuracion : 4500);
    }
  }

  info(tituloOMensaje: string, detalleODuracion?: string | number, duracionMs = 3500): void {
    if (typeof detalleODuracion === 'string') {
      this.showWithTitle(tituloOMensaje, detalleODuracion, 'info', duracionMs);
    } else {
      this.show(tituloOMensaje, 'info', typeof detalleODuracion === 'number' ? detalleODuracion : 3500);
    }
  }

  warning(tituloOMensaje: string, detalleODuracion?: string | number, duracionMs = 4000): void {
    if (typeof detalleODuracion === 'string') {
      this.showWithTitle(tituloOMensaje, detalleODuracion, 'warning', duracionMs);
    } else {
      this.show(tituloOMensaje, 'warning', typeof detalleODuracion === 'number' ? detalleODuracion : 4000);
    }
  }

  dismiss(id: number): void {
    this.toasts.update((actuales) => actuales.filter((t) => t.id !== id));
  }
}
