import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LotesService } from '../../../core/services/lotes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/services/auth.service';
import { MovimientoInventario, Sucursal } from '../../../core/models/lote.models';

@Component({
  selector: 'app-kardex-general',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './kardex-general.html',
  styleUrl: './kardex-general.scss',
})
export class KardexGeneral implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly authService = inject(AuthService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');
  protected readonly movimientos = signal<MovimientoInventario[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly cargando = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  // Filtros interactivos
  protected readonly busqueda = signal<string>('');
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly filtroTipo = signal<'' | 'ENTRADA' | 'VENTA' | 'SALIDA' | 'AJUSTE'>('');
  protected readonly fechaDesde = signal<string>('');
  protected readonly fechaHasta = signal<string>('');
  protected readonly ordenAscendente = signal<boolean>(false);
  protected readonly fechaImpresion = signal<string>('');

  // Paginación en cliente
  protected readonly page = signal<number>(1);
  protected readonly pageSize = signal<number>(25);

  // Movimientos filtrados
  protected readonly movimientosFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const sucId = this.filtroSucursalId();
    const tipo = this.filtroTipo();
    const fDesde = this.fechaDesde();
    const fHasta = this.fechaHasta();
    const asc = this.ordenAscendente();

    let lista = [...this.movimientos()];

    if (tipo) {
      lista = lista.filter((m) => m.tipoMovimiento === tipo);
    }

    if (sucId !== null) {
      lista = lista.filter((m) => {
        const id = m.inventario?.sucursalId ?? m.inventario?.sucursal?.sucursalId;
        return Number(id) === sucId;
      });
    }

    if (fDesde) {
      const desdeTime = new Date(fDesde).getTime();
      lista = lista.filter((m) => new Date(m.fechaMovimiento).getTime() >= desdeTime);
    }

    if (fHasta) {
      const hastaDate = new Date(fHasta);
      hastaDate.setHours(23, 59, 59, 999);
      const hastaTime = hastaDate.getTime();
      lista = lista.filter((m) => new Date(m.fechaMovimiento).getTime() <= hastaTime);
    }

    if (q) {
      lista = lista.filter((m) => {
        const prod = m.inventario?.lote?.producto;
        const lote = m.inventario?.lote;
        const nombreProd = prod?.nombre?.toLowerCase() ?? '';
        const sku = prod?.codigoProducto?.toLowerCase() ?? '';
        const principio = prod?.principioActivo?.toLowerCase() ?? '';
        const numLote = lote?.numeroLote?.toLowerCase() ?? '';
        const obs = m.observacion?.toLowerCase() ?? '';
        const refTipo = m.referenciaTipo?.toLowerCase() ?? '';
        const refId = String(m.referenciaId ?? '');
        const movId = String(m.movimientoInventarioId);
        const sucNombre = m.inventario?.sucursal?.nombre?.toLowerCase() ?? '';

        return (
          nombreProd.includes(q) ||
          sku.includes(q) ||
          principio.includes(q) ||
          numLote.includes(q) ||
          obs.includes(q) ||
          refTipo.includes(q) ||
          refId.includes(q) ||
          movId.includes(q) ||
          sucNombre.includes(q)
        );
      });
    }

    lista.sort((a, b) => {
      const timeA = new Date(a.fechaMovimiento).getTime();
      const timeB = new Date(b.fechaMovimiento).getTime();
      return asc ? timeA - timeB : timeB - timeA;
    });

    return lista;
  });

  // Métricas
  protected readonly totalMovimientos = computed(() => this.movimientosFiltrados().length);

  protected readonly totalUnidadesEntrada = computed(() =>
    this.movimientosFiltrados()
      .filter((m) => m.tipoMovimiento === 'ENTRADA')
      .reduce((acc, m) => acc + Number(m.cantidad || 0), 0),
  );

  protected readonly totalUnidadesSalida = computed(() =>
    this.movimientosFiltrados()
      .filter((m) => m.tipoMovimiento === 'VENTA' || m.tipoMovimiento === 'SALIDA')
      .reduce((acc, m) => acc + Number(m.cantidad || 0), 0),
  );

  protected readonly totalUnidadesAjuste = computed(() =>
    this.movimientosFiltrados()
      .filter((m) => m.tipoMovimiento === 'AJUSTE')
      .reduce((acc, m) => acc + Number(m.cantidad || 0), 0),
  );

  // Nombre de la sucursal seleccionada para el reporte impreso
  protected readonly nombreSucursalFiltro = computed(() => {
    const sucId = this.filtroSucursalId();
    if (sucId === null) return 'Todas las Sucursales (Consolidado General)';
    const suc = this.sucursales().find((s) => s.sucursalId === sucId);
    return suc?.nombre ?? `Sucursal #${sucId}`;
  });

  // Paginación computada
  protected readonly totalPaginas = computed(() => {
    const total = this.totalMovimientos();
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  protected readonly movimientosPaginados = computed(() => {
    const p = this.page();
    const size = this.pageSize();
    const start = (p - 1) * size;
    return this.movimientosFiltrados().slice(start, start + size);
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

  ngOnInit(): void {
    if (!this.esAdmin() && this.usuario()?.sucursalId) {
      this.filtroSucursalId.set(this.usuario()!.sucursalId!);
    }
    this.actualizarFechaImpresion();
    this.cargarSucursales();
    this.cargarMovimientos();
  }

  protected actualizarFechaImpresion(): void {
    const ahora = new Date();
    this.fechaImpresion.set(
      ahora.toLocaleString('es-GT', {
        timeZone: 'America/Guatemala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    );
  }

  protected cargarSucursales(): void {
    this.sucursalesService.findAll().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res.data ?? [];
        this.sucursales.set(list);
      },
      error: () => {},
    });
  }

  protected cargarMovimientos(): void {
    this.cargando.set(true);
    this.error.set(null);

    const sucId = !this.esAdmin()
      ? (this.usuario()?.sucursalId ?? undefined)
      : (this.filtroSucursalId() ?? undefined);

    const params: any = { limit: 500 };
    if (sucId) {
      params.sucursalId = sucId;
    }

    this.lotesService.findAllMovimientos(params).subscribe({
      next: (res) => {
        this.movimientos.set(res.data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial de Kardex.');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarFiltroSucursal(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroSucursalId.set(val ? Number(val) : null);
    this.page.set(1);
    this.cargarMovimientos();
  }

  protected cambiarFiltroTipo(tipo: '' | 'ENTRADA' | 'VENTA' | 'AJUSTE'): void {
    this.filtroTipo.set(tipo);
    this.page.set(1);
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected limpiarBusqueda(): void {
    this.busqueda.set('');
    this.page.set(1);
  }

  protected cambiarFechaDesde(evento: Event): void {
    this.fechaDesde.set((evento.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected cambiarFechaHasta(evento: Event): void {
    this.fechaHasta.set((evento.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected limpiarFechas(): void {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.page.set(1);
  }

  protected toggleOrden(): void {
    this.ordenAscendente.update((v) => !v);
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

  protected imprimirKardex(): void {
    this.actualizarFechaImpresion();
    setTimeout(() => {
      window.print();
    }, 50);
  }

  protected formatearFechaHora(fechaStr: string | Date | undefined): string {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleString('es-GT', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  protected formatearFecha(fechaStr: string | Date | undefined): string {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
