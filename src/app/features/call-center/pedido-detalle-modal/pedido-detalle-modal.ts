import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../core/services/pedidos.service';
import { CambiarEstadoPedidoRequest, PedidoCallCenter } from '../../../core/models/pedido.models';

@Component({
  selector: 'app-pedido-detalle-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-detalle-modal.html',
  styleUrl: './pedido-detalle-modal.scss',
})
export class PedidoDetalleModal implements OnInit {
  private readonly pedidosService = inject(PedidosService);

  @Input({ required: true }) pedidoId!: number;
  @Output() cerrar = new EventEmitter<void>();
  @Output() estadoCambiado = new EventEmitter<void>();

  protected readonly pedido = signal<PedidoCallCenter | null>(null);
  protected readonly cargando = signal(true);
  protected readonly actualizando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected personaRecibeConfirmacion = '';
  protected observacionEstado = '';

  protected imprimirGuia(): void {
    const tituloOriginal = document.title;
    document.title = '';
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.title = tituloOriginal;
        }, 800);
      }, 60);
    });
  }

  ngOnInit(): void {
    this.cargarPedido();
  }

  protected cargarPedido(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.pedidosService.obtenerPorId(this.pedidoId).subscribe({
      next: (data) => {
        this.pedido.set(data);
        this.personaRecibeConfirmacion = data.entrega?.personaRecibe || data.cliente?.nombre || '';
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información del pedido.');
        this.cargando.set(false);
      },
    });
  }

  protected avanzarEstado(nuevoEstado: 'EN_PREPARACION' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO'): void {
    this.actualizando.set(true);
    this.error.set(null);

    const req: CambiarEstadoPedidoRequest = {
      estado: nuevoEstado,
      personaRecibe: this.personaRecibeConfirmacion.trim() || undefined,
      observacion: this.observacionEstado.trim() || undefined,
    };

    this.pedidosService.actualizarEstado(this.pedidoId, req).subscribe({
      next: (actualizado) => {
        this.pedido.set(actualizado);
        this.actualizando.set(false);
        this.estadoCambiado.emit();
      },
      error: (err) => {
        this.actualizando.set(false);
        this.error.set(err.error?.message || 'Error al actualizar el estado del pedido.');
      },
    });
  }
}
