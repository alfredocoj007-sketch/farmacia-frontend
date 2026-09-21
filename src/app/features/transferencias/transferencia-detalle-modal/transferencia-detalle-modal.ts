import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransferenciasService } from '../../../core/services/transferencias.service';
import { AuthService } from '../../../core/services/auth.service';
import { Transferencia } from '../../../core/models/transferencia.models';
import { ConfirmService } from '../../../shared/confirm/confirm.service';

@Component({
  selector: 'app-transferencia-detalle-modal',
  imports: [FormsModule],
  templateUrl: './transferencia-detalle-modal.html',
  styleUrl: './transferencia-detalle-modal.scss',
})
export class TransferenciaDetalleModal {
  private readonly transferenciasService = inject(TransferenciasService);
  private readonly confirmService = inject(ConfirmService);
  private readonly authService = inject(AuthService);

  @Input({ required: true }) transferencia!: Transferencia;
  @Output() actualizado = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  protected readonly usuario = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');
  protected readonly sucursalAsignadaId = computed(() => this.usuario()?.sucursalId);

  // ¿Puede autorizar y despachar? ADMIN o personal de Bodega Central / Origen
  protected readonly puedeDespachar = computed(() => {
    if (this.esAdmin()) return true;
    const userSuc = this.sucursalAsignadaId();
    return !!(userSuc && Number(userSuc) === Number(this.transferencia?.sucursalOrigen?.sucursalId));
  });

  // ¿Puede recibir en destino? ADMIN o personal de la farmacia destino
  protected readonly puedeRecibir = computed(() => {
    if (this.esAdmin()) return true;
    const userSuc = this.sucursalAsignadaId();
    return !!(userSuc && Number(userSuc) === Number(this.transferencia?.sucursalDestino?.sucursalId));
  });

  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Modal in-app de confirmación para cancelar transferencia
  protected readonly modalCancelarVisible = signal(false);
  protected readonly motivoCancelacion = signal('');
  protected readonly errorCancelar = signal<string | null>(null);

  protected async enviarDespacho(): Promise<void> {
    const confirmado = await this.confirmService.confirm({
      title: '¿Aprobar y Despachar desde Bodega Central?',
      message:
        'Al autorizar y despachar este envío, se descontarán físicamente las existencias en Bodega Central y la solicitud pasará a estado En Tránsito hacia la farmacia solicitante. ¿Deseas proceder?',
      confirmText: 'Sí, Despachar a Ruta',
      cancelText: 'Cancelar',
      tipo: 'warning',
    });
    if (!confirmado) return;

    this.procesando.set(true);
    this.error.set(null);

    this.transferenciasService.enviar(this.transferencia.transferenciaId, {}).subscribe({
      next: () => {
        this.procesando.set(false);
        this.actualizado.emit();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(
          err?.error?.message || 'Error al despachar la transferencia.',
        );
      },
    });
  }

  protected async confirmarRecepcion(): Promise<void> {
    const confirmado = await this.confirmService.confirm({
      title: '¿Confirmar Recepción en Farmacia Receptora?',
      message:
        '¿Confirmas la recepción física de la mercadería en la sucursal solicitante? El inventario será ingresado atómicamente a su stock local.',
      confirmText: 'Sí, Recibir e Ingresar Stock',
      cancelText: 'Cancelar',
      tipo: 'primary',
    });
    if (!confirmado) return;

    this.procesando.set(true);
    this.error.set(null);

    this.transferenciasService.recibir(this.transferencia.transferenciaId, {}).subscribe({
      next: () => {
        this.procesando.set(false);
        this.actualizado.emit();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(
          err?.error?.message || 'Error al confirmar la recepción.',
        );
      },
    });
  }

  protected abrirModalCancelar(): void {
    this.motivoCancelacion.set('');
    this.errorCancelar.set(null);
    this.modalCancelarVisible.set(true);
  }

  protected cerrarModalCancelar(): void {
    this.modalCancelarVisible.set(false);
    this.errorCancelar.set(null);
  }

  protected confirmarCancelacion(): void {
    const motivo = this.motivoCancelacion().trim();
    if (!motivo) {
      this.errorCancelar.set('Debes ingresar un motivo o justificación de cancelación.');
      return;
    }

    this.procesando.set(true);
    this.errorCancelar.set(null);

    this.transferenciasService.cancelar(this.transferencia.transferenciaId, motivo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.modalCancelarVisible.set(false);
        this.actualizado.emit();
      },
      error: (err) => {
        this.procesando.set(false);
        this.errorCancelar.set(
          err?.error?.message || 'Error al cancelar la transferencia.',
        );
      },
    });
  }

  protected imprimirGuia(): void {
    window.print();
  }

  protected formatearFechaHora(fechaStr: string | Date | null | undefined): string {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatearFecha(fechaStr: string | Date | null | undefined): string {
    if (!fechaStr) return '—';
    const s = String(fechaStr);
    return s.includes('T') ? s.split('T')[0] : s;
  }

  protected badgeEstadoClass(): string {
    switch (this.transferencia.estado) {
      case 'SOLICITADA':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'EN_TRANSITO':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'RECIBIDA':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'CANCELADA':
        return 'bg-red-50 text-red-800 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }
}

