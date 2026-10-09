import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransferenciasService } from '../../../core/services/transferencias.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sucursal } from '../../../core/models/lote.models';
import { LoteDisponibleTransferencia } from '../../../core/models/transferencia.models';

export interface ItemTransferenciaForm {
  loteId: number;
  numeroLote: string;
  productoNombre: string;
  codigoProducto: string;
  fechaVencimiento?: string | Date;
  categoria?: string;
  stockDisponible: number;
  cantidadSolicitada: number;
}

@Component({
  selector: 'app-transferencia-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transferencia-form.html',
  styleUrl: './transferencia-form.scss',
})
export class TransferenciaForm implements OnInit {
  private readonly transferenciasService = inject(TransferenciasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly confirmService = inject(ConfirmService);
  private readonly authService = inject(AuthService);

  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  protected readonly usuarioActual = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuarioActual()?.rol === 'ADMIN');
  protected readonly sucursalAsignadaId = computed(() => this.usuarioActual()?.sucursalId);

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly lotesDisponibles = signal<LoteDisponibleTransferencia[]>([]);
  protected readonly cargando = signal(true);
  protected readonly cargandoLotes = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly sucursalOrigenId = signal<number | null>(null);
  protected readonly sucursalDestinoId = signal<number | null>(null);
  protected readonly observacion = signal<string>('');

  // Selector e interactividad con reactividad pura (Estilo Call Center)
  protected readonly busquedaLote = signal<string>('');
  protected readonly cantidadItem = signal<number>(1);
  protected readonly loteSeleccionadoId = signal<number | null>(null);
  protected readonly soloConStock = signal<boolean>(true);

  // Lista acumulada de medicamentos a transferir
  protected readonly items = signal<ItemTransferenciaForm[]>([]);

  // Nombres de sucursales para confirmaciones y UI
  protected readonly nombreSucursalOrigen = computed(() => {
    const id = this.sucursalOrigenId();
    return this.sucursales().find((s) => s.sucursalId === id)?.nombre ?? 'Bodega Central';
  });

  protected readonly nombreSucursalDestino = computed(() => {
    const id = this.sucursalDestinoId();
    return this.sucursales().find((s) => s.sucursalId === id)?.nombre ?? 'Sucursal Solicitante';
  });

  // Bodega Central como centro suministrador autorizado
  protected readonly bodegaCentral = computed(() => {
    return this.sucursales().find((s) => s.tipoSucursal === 'BODEGA_CENTRAL') ?? this.sucursales()[0] ?? null;
  });

  // Farmacias y stands solicitantes (excluyendo a Bodega Central como destino)
  protected readonly sucursalesSolicitantes = computed(() => {
    const centralId = this.bodegaCentral()?.sucursalId;
    return this.sucursales().filter((s) => s.sucursalId !== centralId);
  });

  // Lotes filtrados en tiempo real por búsqueda y criterio FEFO
  protected readonly lotesFiltradosEnOrigen = computed(() => {
    const disponibles = this.lotesDisponibles();
    const query = this.busquedaLote().trim().toLowerCase();
    const soloStock = this.soloConStock();

    let lista = disponibles;
    // Si no hay búsqueda de texto activa y tiene activado el filtro de solo stock:
    if (soloStock && !query) {
      lista = lista.filter((item) => item.stockDisponible > 0 && !item.agotado);
    }

    if (!query) {
      return lista;
    }

    return lista.filter((item) => {
      const nombre = (item.producto?.nombre ?? '').toLowerCase();
      const codigo = (item.producto?.codigoProducto ?? '').toLowerCase();
      const formula = (item.producto?.principioActivo ?? '').toLowerCase();
      const numLote = (item.numeroLote ?? '').toLowerCase();
      const cat = (item.producto?.categoria ?? '').toLowerCase();
      return nombre.includes(query) || codigo.includes(query) || formula.includes(query) || numLote.includes(query) || cat.includes(query);
    });
  });

  // Sugerencias rápidas (populares de Bodega Central con existencias)
  protected readonly sugerenciasRapidas = computed(() => {
    return this.lotesDisponibles()
      .filter((l) => l.stockDisponible > 0 && !l.agotado)
      .slice(0, 6);
  });

  // Detalle del lote seleccionado actualmente (opcional)
  protected readonly loteSeleccionadoDetalle = computed(() => {
    const loteId = this.loteSeleccionadoId();
    if (!loteId) return null;
    return this.lotesDisponibles().find((item) => item.loteId === loteId) ?? null;
  });

  // Total de unidades solicitadas en la guía
  protected readonly totalUnidadesTransferencia = computed(() => {
    return this.items().reduce((sum, i) => sum + i.cantidadSolicitada, 0);
  });

  ngOnInit(): void {
    this.cargando.set(true);
    this.sucursalesService.findAll().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        const central = data.find((s) => s.tipoSucursal === 'BODEGA_CENTRAL') ?? data[0];
        if (central) {
          this.sucursalOrigenId.set(central.sucursalId);
          this.cargarLotesOrigen(central.sucursalId);
        } else {
          this.cargarLotesOrigen();
        }

        const userSucId = this.sucursalAsignadaId();
        const esAdmin = this.esAdmin();

        if (!esAdmin && userSucId) {
          this.sucursalDestinoId.set(userSucId);
        } else {
          const primeraFarmacia = data.find((s) => s.sucursalId !== central?.sucursalId);
          if (primeraFarmacia) {
            this.sucursalDestinoId.set(primeraFarmacia.sucursalId);
          }
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar las sucursales.');
        this.cargando.set(false);
      },
    });
  }

  protected cargarLotesOrigen(origenId?: number): void {
    this.cargandoLotes.set(true);
    this.transferenciasService.getLotesDisponibles(origenId).subscribe({
      next: (res) => {
        this.lotesDisponibles.set(res ?? []);
        this.cargandoLotes.set(false);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las existencias de Bodega Central.');
        this.cargandoLotes.set(false);
        this.cargando.set(false);
      },
    });
  }

  protected onDestinoChange(val: any): void {
    const userSucId = this.sucursalAsignadaId();
    const esAdmin = this.esAdmin();
    if (!esAdmin && userSucId) {
      this.sucursalDestinoId.set(userSucId);
      return;
    }
    const id = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    this.sucursalDestinoId.set(id);
    this.error.set(null);
  }

  protected onBusquedaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busquedaLote.set(input.value);
    this.error.set(null);
  }

  protected limpiarBusqueda(): void {
    this.busquedaLote.set('');
    this.error.set(null);
  }

  protected alternarSoloStock(): void {
    this.soloConStock.set(!this.soloConStock());
  }

  protected ajustarCantidad(delta: number): void {
    const maxStock = this.loteSeleccionadoDetalle()?.stockDisponible || 9999;
    const nueva = this.cantidadItem() + delta;
    if (nueva >= 1 && nueva <= maxStock) {
      this.cantidadItem.set(nueva);
    }
  }

  protected seleccionarLote(lote: LoteDisponibleTransferencia): void {
    if (lote.stockDisponible <= 0 || lote.agotado) {
      this.error.set(`"${lote.producto?.nombre || lote.numeroLote}" se encuentra AGOTADO en Bodega Central.`);
      return;
    }
    this.loteSeleccionadoId.set(lote.loteId);
    this.cantidadItem.set(1);
    this.error.set(null);
  }

  protected deseleccionarLote(): void {
    this.loteSeleccionadoId.set(null);
    this.cantidadItem.set(1);
  }

  /**
   * Añade directamente un lote/medicamento a la guía de transferencia con validación estricta de stock y FEFO.
   */
  protected agregarItemDirecto(item: LoteDisponibleTransferencia, cant = 1): void {
    if (!item) return;

    if (item.stockDisponible <= 0 || item.agotado) {
      this.error.set(`"${item.producto?.nombre || item.numeroLote}" se encuentra AGOTADO en Bodega Central. No se puede transferir.`);
      return;
    }

    if (cant <= 0) return;

    const items = [...this.items()];
    const index = items.findIndex((i) => i.loteId === item.loteId);
    const yaEnGuia = index >= 0 ? items[index].cantidadSolicitada : 0;
    const cantFinal = yaEnGuia + cant;

    if (cantFinal > item.stockDisponible) {
      this.error.set(
        `La cantidad total solicitada (${cantFinal} uds) supera las existencias disponibles en Bodega Central (${item.stockDisponible} uds) para el lote ${item.numeroLote}. Ya tienes ${yaEnGuia} uds en la lista.`,
      );
      return;
    }

    if (index >= 0) {
      items[index].cantidadSolicitada = cantFinal;
    } else {
      items.push({
        loteId: item.loteId,
        numeroLote: item.numeroLote,
        productoNombre: item.producto?.nombre ?? 'Medicamento',
        codigoProducto: item.producto?.codigoProducto ?? '—',
        fechaVencimiento: item.fechaVencimiento,
        categoria: item.producto?.categoria,
        stockDisponible: item.stockDisponible,
        cantidadSolicitada: cant,
      });
    }

    this.items.set(items);
    this.loteSeleccionadoId.set(null);
    this.cantidadItem.set(1);
    this.error.set(null);
  }

  /**
   * Al presionar Enter en el input o pulsar el botón principal "+ Añadir a la Transferencia"
   */
  protected onEnterBusqueda(): void {
    const sel = this.loteSeleccionadoDetalle();
    if (sel) {
      this.agregarItemDirecto(sel, this.cantidadItem());
      return;
    }

    const filtrados = this.lotesFiltradosEnOrigen();
    const disponible = filtrados.find((l) => l.stockDisponible > 0 && !l.agotado);

    if (disponible) {
      this.agregarItemDirecto(disponible, this.cantidadItem());
    } else if (filtrados.length > 0) {
      this.error.set(`Los medicamentos o lotes encontrados para "${this.busquedaLote()}" están AGOTADOS en Bodega Central.`);
    } else if (this.busquedaLote().trim()) {
      this.error.set(`No se encontró ningún medicamento o lote con el criterio "${this.busquedaLote()}".`);
    }
  }

  protected ajustarCantidadTransferencia(index: number, delta: number): void {
    const items = [...this.items()];
    const it = items[index];
    const nueva = it.cantidadSolicitada + delta;
    if (nueva <= 0) {
      this.eliminarItem(index);
      return;
    }
    if (nueva > it.stockDisponible) {
      this.error.set(
        `No puedes solicitar más de ${it.stockDisponible} unidades (existencia total en Bodega Central).`,
      );
      return;
    }
    it.cantidadSolicitada = nueva;
    this.items.set(items);
    this.error.set(null);
  }

  protected eliminarItem(index: number): void {
    this.items.update((prev) => prev.filter((_, i) => i !== index));
    this.error.set(null);
  }

  protected formatearFecha(f: string | Date | null | undefined): string {
    if (!f) return '—';
    const s = String(f);
    return s.includes('T') ? s.split('T')[0] : s;
  }

  protected calcularDiasParaVencer(f: string | Date | null | undefined): number {
    if (!f) return 0;
    const vto = new Date(f);
    const hoy = new Date();
    return Math.max(0, Math.ceil((vto.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)));
  }

  protected getCantidadYaEnLista(loteId: number): number {
    const found = this.items().find((i) => i.loteId === loteId);
    return found ? found.cantidadSolicitada : 0;
  }

  protected async submit(): Promise<void> {
    const origenId = this.sucursalOrigenId();
    const destinoId = this.sucursalDestinoId();

    if (!origenId || !destinoId) {
      this.error.set('Debes seleccionar la sucursal de origen y la de destino.');
      return;
    }

    if (Number(origenId) === Number(destinoId)) {
      this.error.set('La sucursal de origen y la de destino no pueden ser la misma.');
      return;
    }

    if (this.items().length === 0) {
      this.error.set('Debes agregar al menos un medicamento a la transferencia.');
      return;
    }

    const confirmado = await this.confirmService.confirm({
      title: '¿Enviar Solicitud de Reabastecimiento?',
      message: `Se creará la solicitud para que Bodega Central suministre ${this.items().length} medicamento(s) (${this.totalUnidadesTransferencia()} unidades) a "${this.nombreSucursalDestino()}". La solicitud quedará en estado PENDIENTE para revisión y despacho de Bodega Central.`,
      confirmText: 'Sí, Enviar Solicitud',
      cancelText: 'Cancelar',
      tipo: 'primary',
    });

    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const payload = {
      sucursalOrigenId: Number(origenId),
      sucursalDestinoId: Number(destinoId),
      observacion: this.observacion().trim() || undefined,
      detalles: this.items().map((i) => ({
        loteId: i.loteId,
        cantidadSolicitada: i.cantidadSolicitada,
      })),
    };

    this.transferenciasService.create(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(
          err?.error?.message || 'Ocurrió un error al registrar la solicitud de transferencia.',
        );
      },
    });
  }
}
