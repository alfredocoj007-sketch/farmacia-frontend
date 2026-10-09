import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReportesService } from '../../../core/services/reportes.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  FiltroReporte,
  ReporteCaducidadResponse,
  ReporteCuadreCajasResponse,
  ReporteTopProductosResponse,
  ReporteValoracionInventarioResponse,
  ReporteVentasResponse,
} from '../../../core/models/reportes.models';
import { SucursalRed } from '../../../core/models/sucursal.models';

export type TabReporte = 'ventas' | 'caducidad' | 'valoracion' | 'top' | 'cajas';

@Component({
  selector: 'app-reportes-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './reportes-dashboard.html',
  styleUrl: './reportes-dashboard.scss',
})
export class ReportesDashboard implements OnInit {
  private readonly reportesService = inject(ReportesService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  // Usuario y permisos
  protected readonly usuario = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');
  protected readonly esGerente = computed(() => this.usuario()?.rol === 'GERENTE');
  protected readonly esFarmaceutico = computed(() => this.usuario()?.rol === 'FARMACEUTICO');

  // Pestaña Activa
  protected readonly tabActiva = signal<TabReporte>('ventas');

  // Filtros globales
  protected readonly sucursales = signal<SucursalRed[]>([]);
  protected readonly sucursalSeleccionada = signal<number | null>(null);
  protected readonly periodoSeleccionado = signal<string>('MES');
  protected readonly fechaInicio = signal<string>('');
  protected readonly fechaFin = signal<string>('');
  protected readonly limiteTop = signal<number>(10);

  // Estado de carga y error
  protected readonly cargando = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fechaGeneracion = signal<Date>(new Date());

  // Datos de los 5 reportes
  protected readonly reporteVentas = signal<ReporteVentasResponse | null>(null);
  protected readonly reporteCaducidad = signal<ReporteCaducidadResponse | null>(null);
  protected readonly reporteValoracion = signal<ReporteValoracionInventarioResponse | null>(null);
  protected readonly reporteTop = signal<ReporteTopProductosResponse | null>(null);
  protected readonly reporteCajas = signal<ReporteCuadreCajasResponse | null>(null);

  // Subfiltros para búsquedas locales dentro de tablas
  protected readonly busquedaDetalle = signal<string>('');
  protected readonly filtroUrgenciaFefo = signal<string>('TODOS');
  protected readonly topModo = signal<'UNIDADES' | 'INGRESOS'>('INGRESOS');

  // Lotes filtrados en reporte FEFO
  protected readonly lotesFiltrados = computed(() => {
    const data = this.reporteCaducidad();
    if (!data) return [];
    const query = this.busquedaDetalle().trim().toLowerCase();
    const urgencia = this.filtroUrgenciaFefo();

    return data.lotes.filter((lote) => {
      const matchText =
        !query ||
        lote.productoNombre.toLowerCase().includes(query) ||
        lote.numeroLote.toLowerCase().includes(query) ||
        lote.laboratorioNombre.toLowerCase().includes(query) ||
        lote.sucursalNombre.toLowerCase().includes(query);

      const matchUrgencia =
        urgencia === 'TODOS' ||
        (urgencia === 'VENCIDO' && lote.estadoUrgencia === 'VENCIDO') ||
        (urgencia === 'CRITICO' && lote.estadoUrgencia === 'CRITICO_30') ||
        (urgencia === 'ALERTA' && lote.estadoUrgencia === 'ALERTA_60') ||
        (urgencia === 'PREVENCION' && lote.estadoUrgencia === 'PREVENCION_90');

      return matchText && matchUrgencia;
    });
  });

  // Ventas filtradas en reporte Consolidado
  protected readonly ventasDetalleFiltradas = computed(() => {
    const data = this.reporteVentas();
    if (!data) return [];
    const query = this.busquedaDetalle().trim().toLowerCase();
    if (!query) return data.detalleVentas.slice(0, 50);

    return data.detalleVentas
      .filter(
        (v) =>
          v.clienteNombre.toLowerCase().includes(query) ||
          v.sucursalNombre.toLowerCase().includes(query) ||
          v.metodoPago.toLowerCase().includes(query) ||
          v.pedidoId.toString().includes(query),
      )
      .slice(0, 50);
  });

  // Inventario filtrado en valoración
  protected readonly inventarioDetalleFiltrado = computed(() => {
    const data = this.reporteValoracion();
    if (!data) return [];
    const query = this.busquedaDetalle().trim().toLowerCase();
    if (!query) return data.detalleInventario.slice(0, 50);

    return data.detalleInventario
      .filter(
        (i) =>
          i.productoNombre.toLowerCase().includes(query) ||
          i.categoriaNombre.toLowerCase().includes(query) ||
          i.sucursalNombre.toLowerCase().includes(query),
      )
      .slice(0, 50);
  });

  // Sesiones filtradas en cuadre de cajas
  protected readonly sesionesCajasFiltradas = computed(() => {
    const data = this.reporteCajas();
    if (!data) return [];
    const query = this.busquedaDetalle().trim().toLowerCase();
    if (!query) return data.sesiones;

    return data.sesiones.filter(
      (s) =>
        s.cajaNombre.toLowerCase().includes(query) ||
        s.empleadoNombre.toLowerCase().includes(query) ||
        s.sucursalNombre.toLowerCase().includes(query) ||
        s.estadoDiferencia.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab') as TabReporte;
    if (tabParam && ['ventas', 'caducidad', 'valoracion', 'top', 'cajas'].includes(tabParam)) {
      this.tabActiva.set(tabParam);
    }
    this.cargarSucursales();
    this.cargarReporteActual();
  }

  private cargarSucursales(): void {
    this.sucursalesService.findAll().subscribe({
      next: (data) => {
        this.sucursales.set(data);
      },
      error: (err) => console.error('Error al cargar sucursales:', err),
    });
  }

  cambiarTab(tab: TabReporte): void {
    this.tabActiva.set(tab);
    this.busquedaDetalle.set('');
    this.cargarReporteActual();
  }

  cambiarPeriodo(periodo: string): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarReporteActual();
  }

  onSucursalChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.sucursalSeleccionada.set(val ? Number(val) : null);
    this.cargarReporteActual();
  }

  cargarReporteActual(): void {
    const filtro: FiltroReporte = {
      sucursalId: this.sucursalSeleccionada() ?? undefined,
      periodo: this.periodoSeleccionado(),
      fechaInicio: this.fechaInicio() || undefined,
      fechaFin: this.fechaFin() || undefined,
      limite: this.limiteTop(),
    };

    this.cargando.set(true);
    this.error.set(null);
    this.fechaGeneracion.set(new Date());

    const tab = this.tabActiva();

    if (tab === 'ventas') {
      this.reportesService.obtenerReporteVentas(filtro).subscribe({
        next: (res) => {
          this.reporteVentas.set(res);
          this.cargando.set(false);
        },
        error: (err) => this.manejarError(err),
      });
    } else if (tab === 'caducidad') {
      this.reportesService.obtenerReporteCaducidad(filtro).subscribe({
        next: (res) => {
          this.reporteCaducidad.set(res);
          this.cargando.set(false);
        },
        error: (err) => this.manejarError(err),
      });
    } else if (tab === 'valoracion') {
      this.reportesService.obtenerReporteValoracion(filtro).subscribe({
        next: (res) => {
          this.reporteValoracion.set(res);
          this.cargando.set(false);
        },
        error: (err) => this.manejarError(err),
      });
    } else if (tab === 'top') {
      this.reportesService.obtenerReporteTopProductos(filtro).subscribe({
        next: (res) => {
          this.reporteTop.set(res);
          this.cargando.set(false);
        },
        error: (err) => this.manejarError(err),
      });
    } else if (tab === 'cajas') {
      this.reportesService.obtenerReporteCuadreCajas(filtro).subscribe({
        next: (res) => {
          this.reporteCajas.set(res);
          this.cargando.set(false);
        },
        error: (err) => this.manejarError(err),
      });
    }
  }

  private manejarError(err: any): void {
    console.error('Error al generar reporte:', err);
    this.error.set(
      err.error?.message ||
        'Ocurrió un error al obtener la información del reporte. Verifique la conexión con el servidor.',
    );
    this.cargando.set(false);
  }

  imprimirReporte(): void {
    window.print();
  }

  obtenerNombreSucursalFiltro(): string {
    const id = this.sucursalSeleccionada();
    if (!id) return 'Todas las Sucursales (Red Global)';
    const suc = this.sucursales().find((s) => s.sucursalId === id);
    return suc ? suc.nombre : `Sucursal #${id}`;
  }

  obtenerNombreReporteActivo(): string {
    const tab = this.tabActiva();
    switch (tab) {
      case 'ventas':
        return 'Reporte Consolidado de Ventas e Ingresos';
      case 'caducidad':
        return 'Reporte de Riesgo de Caducidad y Mermas (Auditoría FEFO)';
      case 'valoracion':
        return 'Reporte de Valoración Global de Inventario';
      case 'top':
        return 'Reporte de Top 10 Medicamentos Más Vendidos (Rotación)';
      case 'cajas':
        return 'Reporte de Arqueos y Cuadre de Cajas';
      default:
        return 'Informe Gerencial';
    }
  }

  obtenerDescripcionPeriodo(): string {
    const p = this.periodoSeleccionado();
    if (p === 'HOY') return 'Hoy';
    if (p === 'SEMANA') return 'Últimos 7 Días';
    if (p === 'MES') return 'Mes Actual';
    if (p === 'ANIO') return 'Año en Curso';
    if (p === 'HISTORICO') return 'Histórico Consolidado';
    if (p === 'PERSONALIZADO') {
      return `${this.fechaInicio() || 'Inicio'} al ${this.fechaFin() || 'Hoy'}`;
    }
    return p;
  }
}
