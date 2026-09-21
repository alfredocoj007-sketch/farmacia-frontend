import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransferenciasService } from '../../../core/services/transferencias.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { Transferencia } from '../../../core/models/transferencia.models';
import { Sucursal } from '../../../core/models/lote.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Modal } from '../../../shared/modal/modal';
import { TransferenciaForm } from '../transferencia-form/transferencia-form';
import { TransferenciaDetalleModal } from '../transferencia-detalle-modal/transferencia-detalle-modal';

@Component({
  selector: 'app-transferencias-list',
  imports: [FormsModule, Modal, TransferenciaForm, TransferenciaDetalleModal],
  templateUrl: './transferencias-list.html',
  styleUrl: './transferencias-list.scss',
})
export class TransferenciasList implements OnInit {
  private readonly transferenciasService = inject(TransferenciasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  protected readonly usuarioActual = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuarioActual()?.rol === 'ADMIN');
  protected readonly sucursalAsignadaId = computed(() => this.usuarioActual()?.sucursalId);

  protected readonly transferencias = signal<Transferencia[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Filtros reactivos
  protected readonly filtroEstado = signal<string>('');
  protected readonly filtroOrigenId = signal<number | null>(null);
  protected readonly filtroDestinoId = signal<number | null>(null);
  protected readonly busqueda = signal<string>('');

  // Modales
  protected readonly modalCrearAbierto = signal(false);
  protected readonly transferenciaSeleccionada = signal<Transferencia | null>(null);

  // KPIs
  protected readonly totalTransferencias = computed(
    () => this.transferencias().length,
  );

  protected readonly totalEnTransito = computed(
    () => this.transferencias().filter((t) => t.estado === 'EN_TRANSITO').length,
  );

  protected readonly totalSolicitadas = computed(
    () => this.transferencias().filter((t) => t.estado === 'SOLICITADA').length,
  );

  protected readonly totalRecibidas = computed(
    () => this.transferencias().filter((t) => t.estado === 'RECIBIDA').length,
  );

  // Lista filtrada
  protected readonly transferenciasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const origenId = this.filtroOrigenId();
    const destinoId = this.filtroDestinoId();
    const q = this.busqueda().trim().toLowerCase();

    return this.transferencias().filter((t) => {
      if (estado && t.estado !== estado) return false;
      if (origenId && t.sucursalOrigen?.sucursalId !== origenId) return false;
      if (destinoId && t.sucursalDestino?.sucursalId !== destinoId) return false;

      if (q) {
        const idMatch = String(t.transferenciaId).includes(q);
        const origenMatch = t.sucursalOrigen?.nombre?.toLowerCase().includes(q);
        const destinoMatch = t.sucursalDestino?.nombre?.toLowerCase().includes(q);
        const obsMatch = t.observacion?.toLowerCase().includes(q);
        if (!idMatch && !origenMatch && !destinoMatch && !obsMatch) return false;
      }

      return true;
    });
  });

  // Paginación (10 registros por página estrictamente)
  protected readonly page = signal(1);
  protected readonly limit = 10;
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.transferenciasFiltradas().length / this.limit)),
  );
  protected readonly transferenciasPaginadas = computed(() => {
    const inicio = (this.page() - 1) * this.limit;
    return this.transferenciasFiltradas().slice(inicio, inicio + this.limit);
  });
  protected readonly listaPaginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.page();
    const paginas: number[] = [];
    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  });

  protected cambiarPagina(delta: number): void {
    const nueva = this.page() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.page.set(nueva);
    }
  }

  protected irAPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas()) {
      this.page.set(p);
    }
  }

  ngOnInit(): void {
    this.cargarTransferencias();
    this.sucursalesService.findAll().subscribe({
      next: (data) => this.sucursales.set(data),
    });
  }

  protected cargarTransferencias(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.transferenciasService.findAll({ limit: 200 }).subscribe({
      next: (res) => {
        this.transferencias.set(res.data);
        this.page.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las transferencias inter-sucursales.');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarFiltroEstado(estado: string): void {
    this.filtroEstado.set(estado);
    this.page.set(1);
  }

  protected abrirModalCrear(): void {
    this.modalCrearAbierto.set(true);
  }

  protected cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  protected onTransferenciaCreada(): void {
    this.cerrarModalCrear();
    this.cargarTransferencias();
    this.toastService.success(
      '¡Transferencia registrada!',
      'La orden de traslado entre sedes ha sido creada y puesta en tránsito.',
    );
  }

  protected verDetalle(t: Transferencia): void {
    this.transferenciasService.findOne(t.transferenciaId).subscribe({
      next: (full) => this.transferenciaSeleccionada.set(full),
      error: () => this.transferenciaSeleccionada.set(t),
    });
  }

  protected cerrarDetalle(): void {
    this.transferenciaSeleccionada.set(null);
  }

  protected onTransferenciaActualizada(): void {
    this.cerrarDetalle();
    this.cargarTransferencias();
    this.toastService.success(
      '¡Transferencia actualizada!',
      'El estado y la recepción del cargamento han sido confirmados.',
    );
  }

  protected formatearFecha(fechaStr: string | Date | null | undefined): string {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected contarUnidadesTotales(t: Transferencia): number {
    return (t.transferenciaDetalles ?? []).reduce(
      (sum, d) => sum + Number(d.cantidadSolicitada || 0),
      0,
    );
  }

  protected esDestinoMiSucursal(t: Transferencia): boolean {
    const miSucursalId = this.sucursalAsignadaId();
    if (!miSucursalId) return false;
    return Number(t.sucursalDestino?.sucursalId) === Number(miSucursalId);
  }
}
