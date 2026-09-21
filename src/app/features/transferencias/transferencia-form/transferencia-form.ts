import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TransferenciasService } from '../../../core/services/transferencias.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { LotesService } from '../../../core/services/lotes.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lote, Sucursal } from '../../../core/models/lote.models';

export interface ItemTransferenciaForm {
  loteId: number;
  numeroLote: string;
  productoNombre: string;
  codigoProducto: string;
  stockDisponible: number;
  cantidadSolicitada: number;
}

@Component({
  selector: 'app-transferencia-form',
  imports: [FormsModule],
  templateUrl: './transferencia-form.html',
  styleUrl: './transferencia-form.scss',
})
export class TransferenciaForm implements OnInit {
  private readonly transferenciasService = inject(TransferenciasService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly lotesService = inject(LotesService);
  private readonly confirmService = inject(ConfirmService);
  private readonly authService = inject(AuthService);

  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  protected readonly usuarioActual = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuarioActual()?.rol === 'ADMIN');
  protected readonly sucursalAsignadaId = computed(() => this.usuarioActual()?.sucursalId);

  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly todosLotes = signal<Lote[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly sucursalOrigenId = signal<number | null>(null);
  protected readonly sucursalDestinoId = signal<number | null>(null);
  protected readonly observacion = signal<string>('');

  // Selector de ítem individual
  protected readonly loteSeleccionadoId = signal<number | null>(null);
  protected readonly cantidadItem = signal<number>(1);

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

  // Lotes que tienen stock disponible en la sucursal de origen seleccionada (Bodega Central)
  protected readonly lotesDisponiblesEnOrigen = computed(() => {
    const origenId = this.sucursalOrigenId();
    const lotes = this.todosLotes();
    if (!origenId) return [];

    return lotes
      .map((lote) => {
        const inv = (lote.inventarios ?? []).find(
          (i) => Number(i.sucursal?.sucursalId ?? i.sucursalId) === Number(origenId),
        );
        const disp = inv ? Number(inv.cantidadDisponible) : 0;
        return {
          lote,
          stockDisponible: disp,
        };
      })
      .filter((item) => item.stockDisponible > 0);
  });

  // Stock disponible del lote seleccionado actualmente
  protected readonly stockLoteSeleccionado = computed(() => {
    const loteId = this.loteSeleccionadoId();
    if (!loteId) return 0;
    const encontrado = this.lotesDisponiblesEnOrigen().find(
      (item) => item.lote.loteId === loteId,
    );
    return encontrado?.stockDisponible ?? 0;
  });
  protected readonly stockDisponibleSeleccionado = this.stockLoteSeleccionado;

  ngOnInit(): void {
    this.sucursalesService.findAll().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        const central = data.find((s) => s.tipoSucursal === 'BODEGA_CENTRAL') ?? data[0];
        if (central) {
          this.sucursalOrigenId.set(central.sucursalId);
        }

        const userSucId = this.sucursalAsignadaId();
        const esAdmin = this.esAdmin();

        if (!esAdmin && userSucId) {
          this.sucursalDestinoId.set(userSucId);
        } else {
          const primeraFarmacia = data.find(
            (s) => s.sucursalId !== central?.sucursalId,
          );
          if (primeraFarmacia) {
            this.sucursalDestinoId.set(primeraFarmacia.sucursalId);
          }
        }
      },
      error: () => this.error.set('No se pudieron cargar las sucursales.'),
    });

    this.lotesService.findAll({ limit: 300 }).subscribe({
      next: (res) => {
        this.todosLotes.set(res.data);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los lotes del sistema.');
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

  protected onLoteChange(val: any): void {
    const id = val !== null && val !== undefined && val !== '' ? Number(val) : null;
    this.loteSeleccionadoId.set(id);
    this.cantidadItem.set(1);
    this.error.set(null);
  }

  protected onCantidadChange(val: any): void {
    const cant = Number(val);
    this.cantidadItem.set(isNaN(cant) || cant < 1 ? 1 : cant);
  }

  protected formatearFecha(f: string | Date | null | undefined): string {
    if (!f) return '—';
    const s = String(f);
    return s.includes('T') ? s.split('T')[0] : s;
  }

  protected agregarItem(): void {
    const loteId = this.loteSeleccionadoId();
    const cant = this.cantidadItem();

    if (!loteId || cant <= 0) {
      this.error.set('Selecciona un lote y especifica una cantidad válida.');
      return;
    }

    const itemEncontrado = this.lotesDisponiblesEnOrigen().find(
      (l) => l.lote.loteId === Number(loteId),
    );

    if (!itemEncontrado) {
      this.error.set('El lote seleccionado no está disponible en la sucursal de origen.');
      return;
    }

    if (cant > itemEncontrado.stockDisponible) {
      this.error.set(
        `La cantidad solicitada (${cant}) supera las existencias en la farmacia origen (${itemEncontrado.stockDisponible} uds).`,
      );
      return;
    }

    // Verificar si ya está en la lista
    const yaExiste = this.items().some(
      (i) => i.loteId === itemEncontrado.lote.loteId,
    );
    if (yaExiste) {
      this.error.set('Este lote ya fue agregado a la lista. Puedes modificar su cantidad o eliminarlo.');
      return;
    }

    this.items.update((prev) => [
      ...prev,
      {
        loteId: itemEncontrado.lote.loteId,
        numeroLote: itemEncontrado.lote.numeroLote,
        productoNombre: itemEncontrado.lote.producto?.nombre ?? 'Medicamento',
        codigoProducto: itemEncontrado.lote.producto?.codigoProducto ?? '—',
        stockDisponible: itemEncontrado.stockDisponible,
        cantidadSolicitada: cant,
      },
    ]);

    // Resetear selector de ítem
    this.loteSeleccionadoId.set(null);
    this.cantidadItem.set(1);
    this.error.set(null);
  }

  protected eliminarItem(index: number): void {
    this.items.update((prev) => prev.filter((_, i) => i !== index));
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
      message: `Se creará la solicitud para que Bodega Central suministre ${this.items().length} medicamento(s) a "${this.nombreSucursalDestino()}". La solicitud quedará en estado PENDIENTE para revisión y despacho de Bodega Central.`,
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
