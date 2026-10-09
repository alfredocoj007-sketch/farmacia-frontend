import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { LotesService } from '../../../core/services/lotes.service';
import { ProductosService } from '../../../core/services/productos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { Producto } from '../../../core/models/producto.models';
import {
  Lote,
  MovimientoInventario,
  Sucursal,
} from '../../../core/models/lote.models';

@Component({
  selector: 'app-lote-salida-form',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './lote-salida-form.html',
  styleUrl: './lote-salida-form.scss',
})
export class LoteSalidaForm implements OnInit {
  @Input() sucursalIdInicial?: number;
  @Input() productoIdInicial?: number;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly lotesService = inject(LotesService);
  private readonly productosService = inject(ProductosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');

  // Modo de despacho: 'FEFO' (Automático por caducidad) o 'MANUAL' (Excepción justificada)
  protected readonly modoDespacho = signal<'FEFO' | 'MANUAL'>('FEFO');
  protected motivoExcepcion: string = '';

  protected readonly form = this.fb.group({
    productoId: [null as number | null, Validators.required],
    sucursalId: [null as number | null, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.001)]],
    tipoMovimiento: ['VENTA' as 'VENTA' | 'AJUSTE', Validators.required],
    loteId: [null as number | null],
    observacion: [''],
  });

  // Signals reactivos para disparar los computed() ante cualquier cambio en los selectores
  protected readonly sucursalSeleccionadaId = signal<number | null>(null);
  protected readonly productoSeleccionadoId = signal<number | null>(null);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly lotesDelProducto = signal<Lote[]>([]);
  protected readonly cargandoLotes = signal(false);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<MovimientoInventario[] | null>(null);

  // Nombre legible de la sucursal seleccionada actualmente
  protected readonly nombreSucursalSeleccionada = computed(() => {
    const id = this.sucursalSeleccionadaId();
    if (!id) return 'la sede seleccionada';
    const found = this.sucursales().find((s) => Number(s.sucursalId) === Number(id));
    return found ? `${found.nombre} (#SUC-${found.sucursalId})` : `Sede #${id}`;
  });

  // Lotes con existencia disponibles en la sucursal seleccionada ordenados por fecha de vencimiento (FEFO)
  protected readonly lotesDisponiblesEnSucursal = computed(() => {
    const sucursalId = this.sucursalSeleccionadaId();
    if (!sucursalId) return [];

    return this.lotesDelProducto()
      .map((lote) => {
        const inv = (lote.inventarios ?? []).find(
          (i) => Number(i.sucursalId ?? i.sucursal?.sucursalId) === Number(sucursalId),
        );
        const disp = inv ? Number(inv.cantidadDisponible) : 0;
        return {
          lote,
          disponible: disp,
        };
      })
      .filter((item) => item.disponible > 0)
      .sort((a, b) => {
        const tA = new Date(a.lote.fechaVencimiento).getTime();
        const tB = new Date(b.lote.fechaVencimiento).getTime();
        return tA - tB;
      });
  });

  // Lote recomendado prioritario por FEFO (el que vence primero con stock)
  protected readonly loteFefoRecomendado = computed(() => {
    const disponibles = this.lotesDisponiblesEnSucursal();
    return disponibles.length > 0 ? disponibles[0] : null;
  });

  // Stock total sumado en la sucursal
  protected readonly stockDisponibleSucursal = computed(() => {
    const disponibles = this.lotesDisponiblesEnSucursal();
    if (disponibles.length === 0) return 0;
    return disponibles.reduce((sum, item) => sum + item.disponible, 0);
  });

  ngOnInit(): void {
    // Sincronizar reactividad inmediata de sucursalId con signal
    this.form.get('sucursalId')?.valueChanges.subscribe((sId) => {
      const parsed = sId !== null && sId !== undefined ? Number(sId) : null;
      this.sucursalSeleccionadaId.set(parsed);
      this.form.patchValue({ loteId: null }, { emitEvent: false });
    });

    // Sincronizar reactividad inmediata de productoId con signal y cargar sus lotes
    this.form.get('productoId')?.valueChanges.subscribe((prodId) => {
      const parsed = prodId !== null && prodId !== undefined ? Number(prodId) : null;
      this.productoSeleccionadoId.set(parsed);
      this.form.patchValue({ loteId: null }, { emitEvent: false });
      if (parsed) {
        this.cargarLotesDeProducto(parsed);
      } else {
        this.lotesDelProducto.set([]);
      }
    });

    this.productosService
      .findAll({ estado: 'ACTIVO', limit: 300 })
      .subscribe((r) => {
        this.productos.set(r.data);
        if (this.productoIdInicial) {
          const pId = Number(this.productoIdInicial);
          this.form.patchValue({ productoId: pId });
          this.productoSeleccionadoId.set(pId);
        }
      });

    this.sucursalesService.findAll().subscribe((sucursales) => {
      this.sucursales.set(sucursales);
      const preseleccion = !this.esAdmin()
        ? this.usuario()?.sucursalId
        : (this.sucursalIdInicial ?? this.usuario()?.sucursalId);
      const idFinal = preseleccion
        ? Number(preseleccion)
        : sucursales.length > 0
          ? Number(sucursales[0].sucursalId)
          : null;

      if (idFinal) {
        this.form.patchValue({ sucursalId: idFinal });
        this.sucursalSeleccionadaId.set(idFinal);
      }
    });
  }

  protected onSucursalChange(event: Event): void {
    const rawVal = (event.target as HTMLSelectElement)?.value;
    // Si viene en formato select nativo o de angular
    const formVal = this.form.get('sucursalId')?.value;
    const finalId = formVal !== null && formVal !== undefined ? Number(formVal) : (rawVal ? Number(rawVal) : null);
    if (finalId !== null && !isNaN(finalId)) {
      this.sucursalSeleccionadaId.set(finalId);
    }
  }

  protected onProductoChange(event: Event): void {
    const rawVal = (event.target as HTMLSelectElement)?.value;
    const formVal = this.form.get('productoId')?.value;
    const finalId = formVal !== null && formVal !== undefined ? Number(formVal) : (rawVal ? Number(rawVal) : null);
    if (finalId !== null && !isNaN(finalId)) {
      this.productoSeleccionadoId.set(finalId);
    }
  }


  protected cambiarModoDespacho(modo: 'FEFO' | 'MANUAL'): void {
    this.modoDespacho.set(modo);
    this.error.set(null);
    if (modo === 'FEFO') {
      this.form.patchValue({ loteId: null });
      this.motivoExcepcion = '';
    } else {
      // En modo manual, si hay lotes disponibles, preseleccionar el primero
      const disponibles = this.lotesDisponiblesEnSucursal();
      if (disponibles.length > 0) {
        this.form.patchValue({ loteId: disponibles[0].lote.loteId });
      }
    }
  }

  protected cerrarConResultado(): void {
    this.guardado.emit();
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    if (!this.esAdmin() && this.usuario()?.sucursalId) {
      v.sucursalId = this.usuario()!.sucursalId!;
    }

    // Validaciones específicas para el modo Excepción Manual
    if (this.modoDespacho() === 'MANUAL') {
      if (!v.loteId) {
        this.error.set(
          'En modo de Excepción Manual debes seleccionar el lote específico que deseas descargar.',
        );
        return;
      }
      if (!this.motivoExcepcion.trim()) {
        this.error.set(
          'Por políticas de auditoría e inventario, debes indicar el motivo de la excepción manual (ej. rotura, merma, retiro de lote).',
        );
        return;
      }
    }

    const prod = this.productos().find((p) => Number(p.productoId) === Number(v.productoId));
    const prodNombre = prod ? prod.nombre : 'el producto seleccionado';
    const tipoTxt = v.tipoMovimiento === 'VENTA' ? 'Despacho por Venta' : 'Ajuste / Merma de Inventario';
    const cant = Number(v.cantidad);

    const confirmado = await this.confirmService.confirm({
      title: '¿Confirmar salida de inventario?',
      message: `Se descontarán ${cant} unidad${cant !== 1 ? 'es' : ''} de "${prodNombre}" en ${this.nombreSucursalSeleccionada()} (${tipoTxt}).`,
      confirmText: 'Sí, Confirmar Salida',
      cancelText: 'Cancelar',
      tipo: 'warning',
    });

    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.resultado.set(null);

    let observacionFinal = v.observacion?.trim() || '';
    if (this.modoDespacho() === 'MANUAL') {
      const tagExcepcion = `[EXCEPCIÓN MANUAL: ${this.motivoExcepcion.trim()}]`;
      observacionFinal = observacionFinal
        ? `${tagExcepcion} ${observacionFinal}`
        : tagExcepcion;
    }

    this.lotesService
      .registrarSalida({
        productoId: Number(v.productoId!),
        sucursalId: Number(v.sucursalId!),
        cantidad: Number(v.cantidad!),
        tipoMovimiento: v.tipoMovimiento!,
        loteId: this.modoDespacho() === 'MANUAL' && v.loteId ? Number(v.loteId) : undefined,
        observacion: observacionFinal || undefined,
      })
      .subscribe({
        next: (movimientos) => {
          this.guardando.set(false);
          this.resultado.set(movimientos);
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(
            err.error?.message?.toString?.() ?? 'No se pudo registrar la salida.',
          );
        },
      });
  }

  private cargarLotesDeProducto(productoId: number): void {
    this.cargandoLotes.set(true);
    this.lotesService.findAll({ productoId, limit: 100 }).subscribe({
      next: (res) => {
        this.lotesDelProducto.set(res.data);
        this.cargandoLotes.set(false);
      },
      error: () => {
        this.lotesDelProducto.set([]);
        this.cargandoLotes.set(false);
      },
    });
  }
}
