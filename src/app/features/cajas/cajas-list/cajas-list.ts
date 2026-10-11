import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CajasService } from '../../../core/services/cajas.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { Caja } from '../../../core/models/caja.models';
import { Sucursal } from '../../../core/models/lote.models';
import { ToastService } from '../../../shared/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Modal } from '../../../shared/modal/modal';
import { CajaAperturaModal } from '../caja-apertura-modal/caja-apertura-modal';
import { CajaMovimientoModal } from '../caja-movimiento-modal/caja-movimiento-modal';
import { CajaArqueoModal } from '../caja-arqueo-modal/caja-arqueo-modal';
import { CajaHistorialModal } from '../caja-historial-modal/caja-historial-modal';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cajas-list',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Modal,
    CajaAperturaModal,
    CajaMovimientoModal,
    CajaArqueoModal,
    CajaHistorialModal,
  ],
  templateUrl: './cajas-list.html',
  styleUrl: './cajas-list.scss',
})
export class CajasList implements OnInit, OnDestroy {
  private readonly cajasService = inject(CajasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly cajas = signal<Caja[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Reloj reactivo en vivo para cálculo de turnos y sincronía
  protected readonly ahora = signal<Date>(new Date());
  private relojTimer: any = null;

  protected readonly esAdmin = computed(() => this.authService.currentUser()?.rol === 'ADMIN');
  protected readonly sucursalAsignadaId = computed(() => this.authService.currentUser()?.sucursalId);
  protected readonly nombreSucursalAsignada = computed(() => {
    const u = this.authService.currentUser();
    if (u?.sucursalNombre) return u.sucursalNombre;
    const match = this.sucursales().find((s) => s.sucursalId === u?.sucursalId);
    return match?.nombre || 'Sucursal Asignada';
  });

  // Modales
  protected readonly cajaApertura = signal<Caja | null>(null);
  protected readonly cajaMovimiento = signal<{ caja: Caja; sesionId: number } | null>(null);
  protected readonly cajaArqueo = signal<Caja | null>(null);
  protected readonly cajaHistorial = signal<Caja | null>(null);

  // Métricas computadas
  protected readonly sucursalActual = computed(() => {
    const id = this.sucursalId();
    return this.sucursales().find((s) => s.sucursalId === id) || null;
  });

  protected readonly totalCajas = computed(() => this.cajas().length);
  protected readonly cajasAbiertas = computed(
    () => this.cajas().filter((c) => c.sesionActiva !== null && c.sesionActiva !== undefined).length,
  );
  protected readonly cajasCerradas = computed(() => this.totalCajas() - this.cajasAbiertas());

  protected readonly saldoTotalSucursal = computed(() => {
    return this.cajas().reduce((sum, c) => {
      if (c.sesionActiva) {
        const saldo =
          Number(c.sesionActiva.saldoInicial) +
          Number(c.sesionActiva.totalIngresos) -
          Number(c.sesionActiva.totalEgresos);
        return sum + saldo;
      }
      return sum;
    }, 0);
  });

  ngOnInit(): void {
    this.cargarSucursales();
    this.ngZone.runOutsideAngular(() => {
      this.relojTimer = setInterval(() => {
        this.ahora.set(new Date());
        this.cdr.markForCheck();
      }, 30000);
    });
  }

  ngOnDestroy(): void {
    if (this.relojTimer) {
      clearInterval(this.relojTimer);
      this.relojTimer = null;
    }
  }

  protected calcularTiempoEnTurno(fechaIso: string): string {
    if (!fechaIso) return '';
    const inicio = new Date(fechaIso).getTime();
    const actual = this.ahora().getTime();
    const diffMs = Math.max(0, actual - inicio);
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (horas === 0) {
      return mins <= 1 ? '1 min' : `${mins} min`;
    }
    return `${horas}h ${mins}m`;
  }

  protected cargarSucursales(): void {
    this.cargando.set(true);
    this.sucursalesService.findAll().subscribe({
      next: (sucursales) => {
        this.sucursales.set(sucursales);
        if (sucursales.length > 0) {
          const userSucId = this.authService.currentUser()?.sucursalId;
          const esAdmin = this.esAdmin();

          let idInicial = sucursales[0].sucursalId;
          if (!esAdmin && userSucId) {
            const match = sucursales.find((s) => s.sucursalId === userSucId);
            if (match) {
              idInicial = userSucId;
            }
          }

          this.sucursalId.set(idInicial);
          this.cargarCajas(idInicial);
        } else {
          this.cargando.set(false);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar las sucursales.');
        this.cargando.set(false);
      },
    });
  }

  protected onSucursalChange(id: number): void {
    const userSucId = this.authService.currentUser()?.sucursalId;
    const esAdmin = this.esAdmin();

    if (!esAdmin && userSucId && Number(id) !== Number(userSucId)) {
      this.toastService.warning(
        'Acceso Restringido',
        'Solo puedes gestionar cajas de tu sucursal asignada.',
      );
      this.sucursalId.set(userSucId);
      return;
    }

    this.sucursalId.set(id);
    this.cargarCajas(id);
  }

  protected cargarCajas(sucursalId: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.cajasService.listarPorSucursal(sucursalId).subscribe({
      next: (cajas) => {
        this.cajas.set(cajas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las cajas de la sucursal.');
        this.cargando.set(false);
      },
    });
  }

  // Apertura
  protected abrirModalApertura(caja: Caja): void {
    this.cajaApertura.set(caja);
  }

  protected onTurnoAbierto(): void {
    this.cajaApertura.set(null);
    const id = this.sucursalId();
    if (id) this.cargarCajas(id);
    this.toastService.success(
      '¡Turno de caja abierto con éxito!',
      'Se ha registrado el fondo inicial de sencillo y la caja está lista para ventas.',
    );
  }

  // Movimiento
  protected abrirModalMovimiento(caja: Caja): void {
    if (!caja.sesionActiva) return;
    this.cajaMovimiento.set({ caja, sesionId: caja.sesionActiva.sesionCajaId });
  }

  protected onMovimientoRegistrado(): void {
    this.cajaMovimiento.set(null);
    const id = this.sucursalId();
    if (id) this.cargarCajas(id);
    this.toastService.success(
      '¡Movimiento de caja registrado!',
      'El flujo de efectivo ha sido asentado correctamente en la sesión activa.',
    );
  }

  // Arqueo y Cierre
  protected abrirModalArqueo(caja: Caja): void {
    this.cajaArqueo.set(caja);
  }

  protected onArqueoFinalizado(): void {
    this.cajaArqueo.set(null);
    const id = this.sucursalId();
    if (id) this.cargarCajas(id);
    this.toastService.success(
      '¡Arqueo y Cierre completado!',
      'Se ha cerrado el turno de caja y cuadrado los fondos con éxito.',
    );
  }

  // Historial
  protected abrirModalHistorial(caja: Caja): void {
    this.cajaHistorial.set(caja);
  }
}
