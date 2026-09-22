import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/toast/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { LotesService } from '../../../core/services/lotes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lote, Sucursal } from '../../../core/models/lote.models';
import { LoteEntradaForm } from '../lote-entrada-form/lote-entrada-form';
import { LoteSalidaForm } from '../lote-salida-form/lote-salida-form';

type ModalAbierto = 'entrada' | 'salida' | null;

export interface LoteItemViewModel extends Lote {
  diasParaVencer: number;
  estadoVencimiento: 'VENCIDO' | 'CRITICO' | 'ALERTA' | 'VIGENTE';
  stockTotal: number;
}

@Component({
  selector: 'app-lotes-list',
  imports: [RouterLink, FormsModule, Modal, LoteEntradaForm, LoteSalidaForm, DatePipe],
  templateUrl: './lotes-list.html',
  styleUrl: './lotes-list.scss',
})
export class LotesList implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly todosLosLotes = signal<LoteItemViewModel[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly modalAbierto = signal<ModalAbierto>(null);

  // Filtros reactivos con Angular Signals
  protected readonly q = signal('');
  protected readonly filtroVencimiento = signal<'' | 'VENCIDO' | 'URGENTE' | 'POR_VENCER' | 'VIGENTE'>('');
  protected readonly filtroStock = signal<'' | 'CON_STOCK' | 'SIN_STOCK'>('');
  protected readonly sucursalSeleccionada = signal<number | ''>('');

  // Paginación del lado del cliente para respuesta inmediata
  protected readonly page = signal(1);
  protected readonly limit = 10;

  // Métricas generales
  protected readonly totalLotesContador = computed(() => this.todosLosLotes().length);
  protected readonly stockGlobalTotal = computed(() =>
    this.todosLosLotes().reduce((sum, l) => sum + l.stockTotal, 0),
  );

  // Conteo de lotes por categoría de vencimiento FEFO
  protected readonly conteoFiltros = computed(() => {
    const lotes = this.todosLosLotes();
    let vigentes = 0;
    let porVencer = 0;
    let urgentes = 0;
    let vencidos = 0;

    for (const l of lotes) {
      if (l.diasParaVencer < 0) {
        vencidos++;
      } else {
        vigentes++;
        if (l.diasParaVencer <= 90) {
          porVencer++;
        }
        if (l.diasParaVencer <= 30) {
          urgentes++;
        }
      }
    }

    return {
      todos: lotes.length,
      vigentes,
      porVencer,
      urgentes,
      vencidos,
    };
  });

  protected readonly lotesVencidosContador = computed(
    () => this.conteoFiltros().vencidos,
  );
  protected readonly lotesCriticosContador = computed(
    () => this.conteoFiltros().porVencer,
  );

  // Lista filtrada reactiva en tiempo real
  protected readonly lotesFiltrados = computed(() => {
    let list = this.todosLosLotes();
    const query = this.q().trim().toLowerCase();
    const venc = this.filtroVencimiento();
    const stock = this.filtroStock();
    const sucIdRaw = this.sucursalSeleccionada();
    const sucId = sucIdRaw !== '' ? Number(sucIdRaw) : null;

    // 1. Filtro por término de búsqueda (lote, nombre o código)
    if (query) {
      list = list.filter(
        (l) =>
          (l.numeroLote?.toLowerCase().includes(query) ?? false) ||
          (l.producto?.nombre?.toLowerCase().includes(query) ?? false) ||
          (l.producto?.codigoProducto?.toLowerCase().includes(query) ?? false),
      );
    }

    // 2. Filtro de caducidad FEFO
    if (venc) {
      if (venc === 'VENCIDO') {
        list = list.filter((l) => l.diasParaVencer < 0);
      } else if (venc === 'URGENTE') {
        list = list.filter((l) => l.diasParaVencer >= 0 && l.diasParaVencer <= 30);
      } else if (venc === 'POR_VENCER') {
        list = list.filter((l) => l.diasParaVencer >= 0 && l.diasParaVencer <= 90);
      } else if (venc === 'VIGENTE') {
        list = list.filter((l) => l.diasParaVencer >= 0);
      }
    }

    // 3. Filtro por Sucursal y Stock
    if (sucId !== null) {
      list = list.filter((l) => {
        const invSucursal = (l.inventarios ?? []).find(
          (inv) => Number(inv.sucursalId ?? inv.sucursal?.sucursalId) === sucId,
        );
        if (!invSucursal) return false;

        const stockSucursal = Number(invSucursal.cantidadDisponible ?? 0);
        if (stock === 'CON_STOCK') {
          return stockSucursal > 0;
        } else if (stock === 'SIN_STOCK') {
          return stockSucursal === 0;
        }
        return true;
      });
    } else {
      if (stock === 'CON_STOCK') {
        list = list.filter((l) => l.stockTotal > 0);
      } else if (stock === 'SIN_STOCK') {
        list = list.filter((l) => l.stockTotal === 0);
      }
    }

    return list;
  });

  protected readonly lotesPaginados = computed(() => {
    const inicio = (this.page() - 1) * this.limit;
    return this.lotesFiltrados().slice(inicio, inicio + this.limit);
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.lotesFiltrados().length / this.limit)),
  );

  protected readonly filtrosActivosCount = computed(() => {
    let count = 0;
    if (this.q().trim()) count++;
    if (this.filtroVencimiento()) count++;
    if (this.filtroStock()) count++;
    if (this.sucursalSeleccionada() !== '') count++;
    return count;
  });

  ngOnInit(): void {
    this.cargarSucursales();
    this.cargar();
  }

  protected onSearchInput(valor: string = ''): void {
    this.q.set(valor);
    this.page.set(1);
  }

  protected cambiarFiltroVencimiento(valor: '' | 'VENCIDO' | 'URGENTE' | 'POR_VENCER' | 'VIGENTE'): void {
    this.filtroVencimiento.set(valor);
    this.page.set(1);
  }

  protected cambiarFiltroStock(valor: '' | 'CON_STOCK' | 'SIN_STOCK'): void {
    this.filtroStock.set(valor);
    this.page.set(1);
  }

  protected cambiarSucursal(valor: any): void {
    const num = valor === '' || valor === null || valor === undefined ? '' : Number(valor);
    this.sucursalSeleccionada.set(num);
    this.page.set(1);
  }

  protected limpiarFiltros(): void {
    this.q.set('');
    this.filtroVencimiento.set('');
    this.filtroStock.set('');
    this.sucursalSeleccionada.set('');
    this.page.set(1);
  }

  protected cambiarPagina(delta: number): void {
    const nueva = this.page() + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.page.set(nueva);
    }
  }

  protected irAPagina(p: number): void {
    this.page.set(p);
  }

  protected listaPaginas(): number[] {
    const total = this.totalPaginas();
    const actual = this.page();
    const paginas: number[] = [];

    const inicio = Math.max(1, actual - 2);
    const fin = Math.min(total, actual + 2);

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  protected esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  protected abrirEntrada(): void {
    this.modalAbierto.set('entrada');
  }

  protected abrirSalida(): void {
    this.modalAbierto.set('salida');
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(null);
  }

  protected onEntradaGuardada(): void {
    this.cerrarModal();
    this.cargar();
    this.toastService.success(
      '¡Entrada de lote registrada con éxito!',
      'El lote de medicamentos ha sido ingresado al stock y kardex de la sede.',
    );
  }

  protected onSalidaGuardada(): void {
    this.cerrarModal();
    this.cargar();
    this.toastService.success(
      '¡Salida de inventario aplicada!',
      'El ajuste de existencias fue descontado correctamente.',
    );
  }

  protected textoDiasVencimiento(dias: number): string {
    if (dias < 0) return `Venció hace ${Math.abs(dias)} días`;
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    if (dias <= 30) return `Vence en ${dias} días`;
    if (dias <= 90) return `Vence en ${Math.round(dias / 30)} meses`;
    return `${dias} días restantes`;
  }

  private cargarSucursales(): void {
    this.sucursalesService.findAll().subscribe({
      next: (suc) => this.sucursales.set(suc),
      error: () => {},
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // Cargamos lotes para indexar el catálogo completo de inventario
    this.lotesService.findAll({ limit: 500 }).subscribe({
      next: (respuesta) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const items: LoteItemViewModel[] = (respuesta.data ?? []).map((lote) => {
          let fVencDate: Date;
          if (typeof lote.fechaVencimiento === 'string') {
            const dateOnly = lote.fechaVencimiento.split('T')[0];
            const parts = dateOnly.split('-').map(Number);
            fVencDate = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(lote.fechaVencimiento);
          } else {
            fVencDate = new Date(lote.fechaVencimiento);
            fVencDate.setHours(0, 0, 0, 0);
          }

          const diffMs = fVencDate.getTime() - hoy.getTime();
          const dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
          const stock = (lote.inventarios ?? []).reduce(
            (sum, inv) => sum + Number(inv.cantidadDisponible ?? 0),
            0,
          );

          let estadoV: 'VENCIDO' | 'CRITICO' | 'ALERTA' | 'VIGENTE';
          if (dias < 0) {
            estadoV = 'VENCIDO';
          } else if (dias <= 30) {
            estadoV = 'CRITICO';
          } else if (dias <= 90) {
            estadoV = 'ALERTA';
          } else {
            estadoV = 'VIGENTE';
          }

          return {
            ...lote,
            costoUnitario: Number(lote.costoUnitario ?? 0),
            diasParaVencer: dias,
            estadoVencimiento: estadoV,
            stockTotal: stock,
          };
        });

        this.todosLosLotes.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los lotes de inventario.');
        this.cargando.set(false);
      },
    });
  }
}
