import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProductosService } from '../../core/services/productos.service';
import { LotesService } from '../../core/services/lotes.service';
import { AuthenticatedUser } from '../../core/models/auth.models';

interface CategoriaBarra {
  nombre: string;
  cantidad: number;
  porcentaje: number;
}

interface VencimientoProximo {
  loteId: number;
  producto: string;
  numeroLote: string;
  fechaVencimiento: string;
  diasParaVencer: number;
  stock: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly productosService = inject(ProductosService);
  private readonly lotesService = inject(LotesService);

  protected readonly perfil = signal<AuthenticatedUser | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalProductos = signal(0);
  protected readonly productosActivos = signal(0);
  protected readonly productosInactivos = signal(0);
  protected readonly totalLotes = signal(0);
  protected readonly stockTotal = signal(0);
  protected readonly categorias = signal<CategoriaBarra[]>([]);
  protected readonly vencimientos = signal<VencimientoProximo[]>([]);
  protected readonly cargandoKpis = signal(true);

  ngOnInit(): void {
    this.authService.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el perfil.');
        this.cargando.set(false);
      },
    });

    this.cargarKpis();
  }

  protected colorEstado(dias: number): 'good' | 'warning' | 'serious' | 'critical' {
    if (dias < 7) return 'critical';
    if (dias < 30) return 'serious';
    if (dias < 90) return 'warning';
    return 'good';
  }

  protected iconoEstado(dias: number): string {
    if (dias < 30) return 'error';
    if (dias < 90) return 'warning';
    return 'check_circle';
  }

  protected textoEstado(dias: number): string {
    if (dias < 0) return 'Vencido';
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    return `Vence en ${dias} días`;
  }

  private cargarKpis(): void {
    this.cargandoKpis.set(true);

    forkJoin({
      total: this.productosService.findAll({ limit: 1 }),
      activos: this.productosService.findAll({ estado: 'ACTIVO', limit: 1 }),
      inactivos: this.productosService.findAll({ estado: 'INACTIVO', limit: 1 }),
      productosActivosCompleto: this.productosService.findAll({ estado: 'ACTIVO', limit: 500 }),
      lotes: this.lotesService.findAll({ limit: 500 }),
    }).subscribe({
      next: ({ total, activos, inactivos, productosActivosCompleto, lotes }) => {
        this.totalProductos.set(total.total);
        this.productosActivos.set(activos.total);
        this.productosInactivos.set(inactivos.total);
        this.totalLotes.set(lotes.total);

        const stockTotal = lotes.data
          .flatMap((l) => l.inventarios ?? [])
          .reduce((sum, inv) => sum + Number(inv.cantidadDisponible), 0);
        this.stockTotal.set(stockTotal);

        this.categorias.set(this.agruparPorCategoria(productosActivosCompleto.data.map((p) => p.categoria?.nombre ?? 'Sin categoría')));

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        this.vencimientos.set(
          lotes.data
            .filter((l) => (l.inventarios ?? []).some((inv) => Number(inv.cantidadDisponible) > 0))
            .slice(0, 5)
            .map((l) => {
              const vencimiento = new Date(l.fechaVencimiento);
              const diasParaVencer = Math.round((vencimiento.getTime() - hoy.getTime()) / 86400000);
              return {
                loteId: l.loteId,
                producto: l.producto?.nombre ?? '—',
                numeroLote: l.numeroLote,
                fechaVencimiento: l.fechaVencimiento,
                diasParaVencer,
                stock: (l.inventarios ?? []).reduce((s, inv) => s + Number(inv.cantidadDisponible), 0),
              };
            }),
        );

        this.cargandoKpis.set(false);
      },
      error: () => {
        this.cargandoKpis.set(false);
      },
    });
  }

  private agruparPorCategoria(nombres: string[]): CategoriaBarra[] {
    const conteos = new Map<string, number>();
    for (const nombre of nombres) {
      conteos.set(nombre, (conteos.get(nombre) ?? 0) + 1);
    }

    const entradas = [...conteos.entries()].sort((a, b) => b[1] - a[1]);
    const top = entradas.slice(0, 7);
    const resto = entradas.slice(7).reduce((sum, [, cantidad]) => sum + cantidad, 0);
    if (resto > 0) {
      top.push(['Otras', resto]);
    }

    const max = Math.max(1, ...top.map(([, cantidad]) => cantidad));
    return top.map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
      porcentaje: Math.round((cantidad / max) * 100),
    }));
  }
}
