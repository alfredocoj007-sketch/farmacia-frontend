import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidosService } from '../../../core/services/pedidos.service';
import { CambiarEstadoPedidoRequest, PedidoCallCenter } from '../../../core/models/pedido.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { LOGO_PROSALUD_BASE64 } from '../../../core/constants/assets.constants';

@Component({
  selector: 'app-pedido-detalle-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedido-detalle-modal.html',
  styleUrl: './pedido-detalle-modal.scss',
})
export class PedidoDetalleModal implements OnInit {
  private readonly pedidosService = inject(PedidosService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  @Input({ required: true }) pedidoId!: number;
  @Input() pedidoInicial?: PedidoCallCenter | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() estadoCambiado = new EventEmitter<void>();

  protected readonly pedido = signal<PedidoCallCenter | null>(null);
  protected readonly cargando = signal(true);
  protected readonly actualizando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected personaRecibeConfirmacion = '';
  protected observacionEstado = '';
  protected readonly mostrarFormularioCancelacion = signal(false);
  protected motivoCancelacion = '';

  protected imprimirGuia(): void {
    const guiaEl = document.querySelector('.guia-impresion');
    if (!guiaEl) {
      window.print();
      return;
    }

    // Proteger la pantalla contra parpadeos del motor de impresión del navegador
    document.body.classList.add('print-iframe-active');

    const idIframe = 'iframe-impresion-guia';
    const anterior = document.getElementById(idIframe);
    if (anterior) anterior.remove();

    const iframe = document.createElement('iframe');
    iframe.id = idIframe;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '8.5in';
    iframe.style.height = '11in';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    // Reemplazar la referencia al logo por Base64 pre-cargado para 0ms de tiempo de espera
    let contenidoGuia = guiaEl.innerHTML;
    contenidoGuia = contenidoGuia.replace(
      /src=["']assets\/images\/logo-prosalud\.png["']/g,
      `src="${LOGO_PROSALUD_BASE64}"`,
    );

    const docHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Guia-Despacho-PED-${this.pedidoId}</title>
  <style>
    * { box-sizing: border-box; }
    @page {
      size: letter portrait;
      margin: 10mm 14mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .guia-impresion {
      display: block !important;
      width: 100%;
    }
    .guia-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .guia-logo {
      width: 65px;
      height: 65px;
      object-fit: contain;
    }
    .guia-grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .guia-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 10px;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .guia-tabla {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 12px;
    }
    .guia-tabla th, .guia-tabla td {
      border: 1px solid #94a3b8;
      padding: 5px 8px;
      font-size: 11px;
    }
    .guia-tabla th {
      background-color: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .guia-firmas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 22px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .guia-firma-bloque {
      border-top: 1.5px solid #475569;
      text-align: center;
      padding-top: 6px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="guia-impresion">
    ${contenidoGuia}
  </div>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);

    const limpiar = () => {
      document.body.classList.remove('print-iframe-active');
      setTimeout(() => {
        iframe.remove();
      }, 500);
    };

    iframe.onload = () => {
      URL.revokeObjectURL(blobUrl);
      setTimeout(() => {
        try {
          iframe.contentWindow?.addEventListener('afterprint', limpiar, { once: true });
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(limpiar, 12000);
        } catch (e) {
          console.error('Error al imprimir', e);
          limpiar();
        }
      }, 40);
    };

    iframe.src = blobUrl;
  }

  ngOnInit(): void {
    if (this.pedidoInicial) {
      this.pedido.set(this.pedidoInicial);
      this.personaRecibeConfirmacion =
        this.pedidoInicial.entrega?.personaRecibe || this.pedidoInicial.cliente?.nombre || '';
      this.cargando.set(false);
      this.cargarPedido(false);
    } else {
      this.cargarPedido(true);
    }
  }

  protected cargarPedido(mostrarSpinner = true): void {
    if (mostrarSpinner) {
      this.cargando.set(true);
    }
    this.error.set(null);

    this.pedidosService.obtenerPorId(this.pedidoId).subscribe({
      next: (data) => {
        this.pedido.set(data);
        if (!this.personaRecibeConfirmacion) {
          this.personaRecibeConfirmacion = data.entrega?.personaRecibe || data.cliente?.nombre || '';
        }
        this.cargando.set(false);
      },
      error: () => {
        if (mostrarSpinner) {
          this.error.set('No se pudo cargar la información del pedido.');
          this.cargando.set(false);
        }
      },
    });
  }

  protected avanzarEstado(
    nuevoEstado: 'EN_PREPARACION' | 'EN_RUTA' | 'ENTREGADO' | 'CANCELADO',
    observacionPersonalizada?: string,
  ): void {
    this.actualizando.set(true);
    this.error.set(null);

    const obs = (observacionPersonalizada !== undefined ? observacionPersonalizada : this.observacionEstado).trim();

    const req: CambiarEstadoPedidoRequest = {
      estado: nuevoEstado,
      personaRecibe: this.personaRecibeConfirmacion.trim() || undefined,
      observacion: obs || undefined,
    };

    this.pedidosService.actualizarEstado(this.pedidoId, req).subscribe({
      next: (actualizado) => {
        this.pedido.set(actualizado);
        this.actualizando.set(false);
        if (nuevoEstado === 'ENTREGADO') {
          this.toastService.success(
            '¡Confirmación de Pago Liquidado!',
            `El cobro de Q${Number(actualizado.total).toFixed(2)} para el pedido #PED-${this.pedidoId} ha sido liquidado en caja y registrado exitosamente.`,
            5000,
          );
        } else if (nuevoEstado === 'CANCELADO') {
          this.toastService.warning(
            'Pedido Cancelado',
            `Se liberaron las reservas de inventario del pedido #PED-${this.pedidoId}.${obs ? ' Motivo: ' + obs : ''}`,
            5000,
          );
        } else {
          this.toastService.info(
            'Estado Actualizado',
            `El pedido avanzó a ${nuevoEstado}.`,
            4000,
          );
        }
        this.estadoCambiado.emit();
      },
      error: (err) => {
        this.actualizando.set(false);
        const errorMsg = err.error?.message || 'Error al actualizar el estado del pedido.';
        this.error.set(errorMsg);
        this.toastService.error('Error al Liquidar Pago', errorMsg, 6000);
      },
    });
  }

  protected liquidarPago(): void {
    if (this.actualizando()) return;
    this.avanzarEstado('ENTREGADO');
  }

  protected iniciarCancelacion(): void {
    this.mostrarFormularioCancelacion.set(true);
    this.motivoCancelacion = '';
    this.toastService.warning(
      '¿Estás seguro de que deseas cancelar la orden?',
      `Ingresa el motivo de cancelación para la orden #PED-${this.pedidoId}.`,
      4500,
    );
  }

  protected cancelarCancelacion(): void {
    this.mostrarFormularioCancelacion.set(false);
    this.motivoCancelacion = '';
  }

  protected confirmarCancelacion(): void {
    const motivo = this.motivoCancelacion.trim();
    if (!motivo) {
      this.toastService.error('Motivo Requerido', 'Por favor ingresa la razón por la cual se cancela la orden.');
      return;
    }
    this.mostrarFormularioCancelacion.set(false);
    this.avanzarEstado('CANCELADO', motivo);
  }

  protected tieneMedicamentosConReceta(): boolean {
    return (this.pedido()?.detalles || []).some((d) => d.requiereReceta === 'S');
  }
}
