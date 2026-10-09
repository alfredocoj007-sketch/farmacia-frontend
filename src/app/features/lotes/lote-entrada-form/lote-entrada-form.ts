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
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  FormsModule,
} from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { LotesService } from '../../../core/services/lotes.service';
import { ProductosService } from '../../../core/services/productos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { LaboratoriosService } from '../../../core/services/laboratorios.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { Producto, Laboratorio } from '../../../core/models/producto.models';
import { Sucursal, CompraLoteResponse } from '../../../core/models/lote.models';

@Component({
  selector: 'app-lote-entrada-form',
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe],
  templateUrl: './lote-entrada-form.html',
  styleUrl: './lote-entrada-form.scss',
})
export class LoteEntradaForm implements OnInit {
  @Input() sucursalIdInicial?: number;
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly lotesService = inject(LotesService);
  private readonly productosService = inject(ProductosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly laboratoriosService = inject(LaboratoriosService);
  private readonly authService = inject(AuthService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');

  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly laboratorios = signal<Laboratorio[]>([]);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultadoCompra = signal<CompraLoteResponse | null>(null);

  // Snapshot reactivo de los renglones para cálculos automáticos en vivo
  protected readonly itemsSnapshot = signal<any[]>([]);

  protected readonly form = this.fb.group({
    proveedorId: [null as number | null],
    proveedorManual: [''],
    numeroFactura: ['', [Validators.required, Validators.maxLength(100)]],
    fechaFactura: [this.fechaHoy(), Validators.required],
    sucursalId: [null as number | null, Validators.required],
    observacion: [''],
    items: this.fb.array<FormGroup>([]),
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  // Métricas financieras reactivas calculadas al instante
  protected readonly totalProductosDistintos = computed(() => {
    return this.itemsSnapshot().filter((it) => it.productoId).length;
  });

  protected readonly totalUnidadesFisicas = computed(() => {
    return this.itemsSnapshot().reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0);
  });

  protected readonly montoTotalGlobal = computed(() => {
    return this.itemsSnapshot().reduce(
      (sum, it) => sum + (Number(it.cantidad) || 0) * (Number(it.costoUnitario) || 0),
      0,
    );
  });

  ngOnInit(): void {
    // 1. Cargar productos farmacéuticos activos
    this.productosService.findAll({ estado: 'ACTIVO', limit: 500 }).subscribe((r) => {
      this.productos.set(r.data);
    });

    // 2. Cargar proveedores / laboratorios farmacéuticos
    this.laboratoriosService.findAll().subscribe((labs) => {
      this.laboratorios.set(labs);
    });

    // 3. Cargar sucursales de la red y preseleccionar
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
      }
    });

    // 4. Agregar renglón inicial por defecto
    this.agregarRenglon();

    // 5. Suscribirse a cambios en los renglones para actualizar señales
    this.items.valueChanges.subscribe((vals) => {
      this.itemsSnapshot.set(vals ?? []);
    });
  }

  protected fechaHoy(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected fechaMinimaVencimiento(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1); // La fecha de vencimiento debe ser al menos a partir de mañana
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected agregarRenglon(): void {
    const itemGroup = this.fb.group({
      productoId: [null as number | null, Validators.required],
      numeroLote: ['', [Validators.required, Validators.maxLength(80)]],
      fechaVencimiento: ['', Validators.required],
      fechaFabricacion: [''],
      cantidad: [1, [Validators.required, Validators.min(0.001)]],
      costoUnitario: [0, [Validators.required, Validators.min(0)]],
    });

    this.items.push(itemGroup);
    this.itemsSnapshot.set(this.items.getRawValue());
  }

  protected eliminarRenglon(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.itemsSnapshot.set(this.items.getRawValue());
    }
  }

  protected subtotalRenglon(index: number): number {
    const it = this.items.at(index)?.value;
    if (!it) return 0;
    return (Number(it.cantidad) || 0) * (Number(it.costoUnitario) || 0);
  }

  protected onProductoSeleccionado(index: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const pId = target?.value ? Number(target.value) : null;
    if (pId) {
      const prod = this.productos().find((p) => Number(p.productoId) === pId);
      const group = this.items.at(index);
      if (group && prod) {
        // Si el costo actual es 0 y el producto tiene precio de venta, sugerir un costo estimado (60%)
        const costoActual = Number(group.get('costoUnitario')?.value || 0);
        if (costoActual === 0 && prod.precioVenta) {
          const costoSugerido = Number((prod.precioVenta * 0.6).toFixed(2));
          group.patchValue({ costoUnitario: costoSugerido });
        }
      }
    }
    this.itemsSnapshot.set(this.items.getRawValue());
  }

  protected onValorCambiado(): void {
    this.itemsSnapshot.set(this.items.getRawValue());
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Por favor completa los campos obligatorios marcados en rojo.');
      return;
    }

    if (this.items.length === 0) {
      this.error.set('Debes agregar al menos un renglón de producto a la factura.');
      return;
    }

    const v = this.form.getRawValue();
    if (!this.esAdmin() && this.usuario()?.sucursalId) {
      v.sucursalId = this.usuario()!.sucursalId!;
    }

    const itemsPayload = (v.items ?? []).map((it: any) => ({
      productoId: Number(it.productoId),
      numeroLote: (it.numeroLote || '').trim(),
      fechaVencimiento: it.fechaVencimiento,
      fechaFabricacion: it.fechaFabricacion || undefined,
      costoUnitario: Number(it.costoUnitario),
      cantidad: Number(it.cantidad),
    }));

    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < itemsPayload.length; i++) {
      const it = itemsPayload[i];
      if (!it.productoId || isNaN(it.productoId)) {
        this.error.set(`En el renglón #${i + 1} debes seleccionar un medicamento.`);
        return;
      }
      if (!it.numeroLote) {
        this.error.set(`En el renglón #${i + 1} debes indicar el número de lote.`);
        return;
      }
      if (!it.fechaVencimiento) {
        this.error.set(`En el renglón #${i + 1} debes indicar la fecha de vencimiento.`);
        return;
      }

      // Validar que la fecha de vencimiento sea estrictamente futura
      const [vYear, vMonth, vDay] = it.fechaVencimiento.split('-').map(Number);
      const fVenc = new Date(vYear, vMonth - 1, vDay);
      if (isNaN(fVenc.getTime()) || fVenc <= hoyDate) {
        this.error.set(
          `En el renglón #${i + 1} (Lote "${it.numeroLote}"), la fecha de vencimiento (${it.fechaVencimiento}) ya caducó o es hoy. Por regulación sanitaria no se permite la compra de medicamentos vencidos.`,
        );
        return;
      }

      // Si se especificó fecha de fabricación, vencimiento debe ser posterior
      if (it.fechaFabricacion) {
        const [fYear, fMonth, fDay] = it.fechaFabricacion.split('-').map(Number);
        const fFab = new Date(fYear, fMonth - 1, fDay);
        if (fVenc <= fFab) {
          this.error.set(
            `En el renglón #${i + 1} (Lote "${it.numeroLote}"), la fecha de vencimiento debe ser posterior a la fecha de fabricación.`,
          );
          return;
        }
      }

      if (it.cantidad <= 0) {
        this.error.set(`En el renglón #${i + 1} la cantidad de unidades debe ser mayor a cero.`);
        return;
      }
    }

    let proveedorFinal: string | undefined = undefined;
    let provId: number | undefined = undefined;

    if (v.proveedorId) {
      provId = Number(v.proveedorId);
      const lab = this.laboratorios().find((l) => Number(l.laboratorioId) === provId);
      proveedorFinal = lab ? lab.nombre : undefined;
    } else if (v.proveedorManual?.trim()) {
      proveedorFinal = v.proveedorManual.trim();
    }

    const totalUds = this.totalUnidadesFisicas();
    const totalMonto = this.montoTotalGlobal();
    const sucNombre =
      this.sucursales().find((s) => Number(s.sucursalId) === Number(v.sucursalId))?.nombre ??
      'la sucursal seleccionada';
    const numFactura = (v.numeroFactura || '').trim() || 'S/N';

    const confirmado = await this.confirmService.confirm({
      title: '¿Confirmar registro de entrada de inventario?',
      message: `Se ingresarán ${totalUds} unidades (${itemsPayload.length} renglón${itemsPayload.length > 1 ? 'es' : ''}) a la sede "${sucNombre}" con un monto de compra de Q ${totalMonto.toFixed(2)} (Factura: ${numFactura}).`,
      confirmText: 'Sí, Registrar Entrada',
      cancelText: 'Cancelar',
      tipo: 'primary',
    });

    if (!confirmado) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    this.lotesService
      .registrarCompra({
        proveedorId: provId,
        proveedorNombre: proveedorFinal,
        numeroFactura: (v.numeroFactura || '').trim(),
        fechaFactura: v.fechaFactura || this.fechaHoy(),
        sucursalId: Number(v.sucursalId),
        observacion: v.observacion?.trim() || undefined,
        items: itemsPayload,
      })
      .subscribe({
        next: (resp) => {
          this.guardando.set(false);
          this.resultadoCompra.set(resp);
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(
            err.error?.message?.toString?.() ?? 'Error al procesar la factura de compra.',
          );
        },
      });
  }

  protected cerrarConExito(): void {
    this.guardado.emit();
  }
}
