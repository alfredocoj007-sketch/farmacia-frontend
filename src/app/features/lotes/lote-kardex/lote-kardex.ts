import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LotesService } from '../../../core/services/lotes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lote, MovimientoInventario } from '../../../core/models/lote.models';

@Component({
  selector: 'app-lote-kardex',
  imports: [RouterLink, DatePipe],
  templateUrl: './lote-kardex.html',
  styleUrl: './lote-kardex.scss',
})
export class LoteKardex implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly usuario = this.authService.currentUser;
  protected readonly lote = signal<Lote | null>(null);
  protected readonly lotesDelProducto = signal<Lote[]>([]);
  protected readonly movimientos = signal<MovimientoInventario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Filtros reactivos y metadatos de auditoría
  protected readonly filtroTipo = signal<'' | 'ENTRADA' | 'VENTA' | 'SALIDA' | 'AJUSTE'>('');
  protected readonly filtroSucursalId = signal<number | null>(null);
  protected readonly busqueda = signal<string>('');
  protected readonly ordenAscendente = signal<boolean>(false); // Por defecto más recientes primero (DESC)
  protected readonly fechaImpresion = signal<string>('');

  // Cálculo de días restantes de vida útil y semáforo FEFO
  protected readonly diasParaVencer = computed(() => {
    const l = this.lote();
    if (!l?.fechaVencimiento) return null;
    let fechaVenc: Date;
    if (typeof l.fechaVencimiento === 'string') {
      const parts = l.fechaVencimiento.split('T')[0].split('-').map(Number);
      fechaVenc = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(l.fechaVencimiento);
    } else {
      fechaVenc = new Date(l.fechaVencimiento);
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffMs = fechaVenc.getTime() - hoy.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  });

  // Metadatos para Reporte Oficial de Kardex Físico y Valorado
  protected readonly nombreSucursalConsultada = computed(() => {
    const sucId = this.filtroSucursalId();
    if (sucId === null) {
      return 'Todas las Sucursales (Consolidado)';
    }
    const suc = this.sucursalesDisponibles().find((s) => s.id === sucId);
    return suc?.nombre ?? `Sucursal #${sucId}`;
  });

  protected readonly stockSucursalConsultada = computed(() => {
    const sucId = this.filtroSucursalId();
    if (sucId === null) {
      return this.stockTotal();
    }
    const inv = (this.lote()?.inventarios ?? []).find(
      (i) => Number(i.sucursalId ?? i.sucursal?.sucursalId) === sucId,
    );
    return Number(inv?.cantidadDisponible ?? 0);
  });

  protected readonly estadoFefo = computed(() => {
    const dias = this.diasParaVencer();
    if (dias === null) {
      return { texto: 'Sin fecha', clase: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (dias < 0) {
      return {
        texto: `VENCIDO (${Math.abs(dias)}d)`,
        clase: 'bg-red-50 text-red-700 border-red-200 font-bold animate-pulse',
      };
    }
    if (dias <= 30) {
      return {
        texto: `URGENTE (${dias}d)`,
        clase: 'bg-amber-50 text-amber-700 border-amber-200 font-bold',
      };
    }
    if (dias <= 90) {
      return {
        texto: `PRÓXIMO (${dias}d)`,
        clase: 'bg-yellow-50 text-yellow-800 border-yellow-200 font-medium',
      };
    }
    return {
      texto: `VIGENTE (${dias}d)`,
      clase: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    };
  });

  // Stock físico total
  protected readonly stockTotal = computed(() =>
    (this.lote()?.inventarios ?? []).reduce(
      (sum, inv) => sum + Number(inv.cantidadDisponible),
      0,
    ),
  );

  // Valorización a costo (Capital invertido en bodega)
  protected readonly valorInventarioCosto = computed(() => {
    const l = this.lote();
    if (!l) return 0;
    return Number(l.costoUnitario || 0) * this.stockTotal();
  });

  // Valor comercial proyectado (Venta al público)
  protected readonly valorPotencialVenta = computed(() => {
    const l = this.lote();
    if (!l?.producto) return 0;
    return Number(l.producto.precioVenta || 0) * this.stockTotal();
  });

  // Margen bruto unitario y porcentaje
  protected readonly margenUnitario = computed(() => {
    const l = this.lote();
    if (!l?.producto) return 0;
    return Number(l.producto.precioVenta || 0) - Number(l.costoUnitario || 0);
  });

  protected readonly porcentajeMargen = computed(() => {
    const l = this.lote();
    if (!l?.producto || !l.producto.precioVenta) return 0;
    const margen = this.margenUnitario();
    return (margen / Number(l.producto.precioVenta)) * 100;
  });

  // Métricas de rotación
  protected readonly totalEntradas = computed(() =>
    this.movimientos()
      .filter((m) => m.tipoMovimiento === 'ENTRADA')
      .reduce((sum, m) => sum + Number(m.cantidad), 0),
  );

  protected readonly totalSalidas = computed(() =>
    this.movimientos()
      .filter((m) => m.tipoMovimiento === 'VENTA' || m.tipoMovimiento === 'AJUSTE' || m.tipoMovimiento === 'SALIDA')
      .reduce((sum, m) => sum + Number(m.cantidad), 0),
  );

  protected readonly porcentajeRotacion = computed(() => {
    const entradas = this.totalEntradas();
    if (entradas === 0) return 0;
    return Math.min(100, Math.round((this.totalSalidas() / entradas) * 100));
  });

  // Lista de sucursales con actividad en este lote
  protected readonly sucursalesDisponibles = computed(() => {
    const map = new Map<number, string>();
    for (const inv of this.lote()?.inventarios ?? []) {
      if (inv.sucursal) {
        map.set(inv.sucursal.sucursalId, inv.sucursal.nombre);
      }
    }
    for (const m of this.movimientos()) {
      if (m.inventario?.sucursal) {
        map.set(m.inventario.sucursal.sucursalId, m.inventario.sucursal.nombre);
      }
    }
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  });

  // Movimientos filtrados, buscados y ordenados
  protected readonly movimientosFiltrados = computed(() => {
    const tipo = this.filtroTipo();
    const sucId = this.filtroSucursalId();
    const q = this.busqueda().trim().toLowerCase();
    const asc = this.ordenAscendente();

    let lista = [...this.movimientos()];

    if (tipo) {
      lista = lista.filter((m) => m.tipoMovimiento === tipo);
    }

    if (sucId !== null) {
      lista = lista.filter((m) => m.inventario?.sucursal?.sucursalId === sucId);
    }

    if (q) {
      lista = lista.filter((m) => {
        const idMatch = String(m.movimientoInventarioId).includes(q);
        const obsMatch = m.observacion && m.observacion.toLowerCase().includes(q);
        const refTipoMatch = m.referenciaTipo && m.referenciaTipo.toLowerCase().includes(q);
        const refIdMatch = m.referenciaId && String(m.referenciaId).includes(q);
        const sucMatch =
          m.inventario?.sucursal?.nombre &&
          m.inventario.sucursal.nombre.toLowerCase().includes(q);
        return idMatch || obsMatch || refTipoMatch || refIdMatch || sucMatch;
      });
    }

    lista.sort((a, b) => {
      const timeA = new Date(a.fechaMovimiento).getTime();
      const timeB = new Date(b.fechaMovimiento).getTime();
      return asc ? timeA - timeB : timeB - timeA;
    });

    return lista;
  });

  ngOnInit(): void {
    this.actualizarFechaImpresion();
    this.route.paramMap.subscribe((params) => {
      const loteIdStr = params.get('id');
      if (loteIdStr) {
        this.cargarLote(Number(loteIdStr));
      }
    });
  }

  protected actualizarFechaImpresion(): void {
    const ahora = new Date();
    this.fechaImpresion.set(
      ahora.toLocaleString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    );
  }

  protected cargarLote(loteId: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.lotesService.findOne(loteId).subscribe({
      next: (lote) => {
        this.lote.set(lote);
        // Cargar todos los lotes hermanos de este mismo producto para el conmutador de lotes
        if (lote.productoId) {
          this.lotesService.findAll({ productoId: lote.productoId, limit: 100 }).subscribe({
            next: (res) => this.lotesDelProducto.set(res.data ?? []),
            error: () => {},
          });
        }
      },
      error: () => this.error.set('No se pudo cargar la ficha del lote.'),
    });

    this.lotesService.findMovimientos(loteId).subscribe({
      next: (movimientos) => {
        this.movimientos.set(movimientos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el historial del Kardex.');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarLote(loteId: number): void {
    this.router.navigate(['/lotes', loteId]);
  }

  protected cambiarFiltroTipo(tipo: '' | 'ENTRADA' | 'VENTA' | 'AJUSTE'): void {
    this.filtroTipo.set(tipo);
  }

  protected cambiarFiltroSucursal(evento: Event): void {
    const val = (evento.target as HTMLSelectElement).value;
    this.filtroSucursalId.set(val ? Number(val) : null);
  }

  protected actualizarBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected limpiarBusqueda(): void {
    this.busqueda.set('');
  }

  protected toggleOrden(): void {
    this.ordenAscendente.update((v) => !v);
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
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
