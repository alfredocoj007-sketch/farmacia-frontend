import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LotesService } from '../../../core/services/lotes.service';
import { ProductosService } from '../../../core/services/productos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { Producto } from '../../../core/models/producto.models';
import { Sucursal } from '../../../core/models/lote.models';

@Component({
  selector: 'app-lote-entrada-form',
  imports: [ReactiveFormsModule],
  templateUrl: './lote-entrada-form.html',
  styleUrl: './lote-entrada-form.scss',
})
export class LoteEntradaForm implements OnInit {
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly lotesService = inject(LotesService);
  private readonly productosService = inject(ProductosService);
  private readonly sucursalesService = inject(SucursalesService);

  protected readonly form = this.fb.group({
    productoId: [null as number | null, Validators.required],
    sucursalId: [null as number | null, Validators.required],
    numeroLote: ['', Validators.required],
    fechaVencimiento: ['', Validators.required],
    fechaFabricacion: [''],
    costoUnitario: [0, [Validators.required, Validators.min(0)]],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    observacion: [''],
  });

  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.productosService.findAll({ estado: 'ACTIVO', limit: 200 }).subscribe((r) => this.productos.set(r.data));
    this.sucursalesService.findAll().subscribe((sucursales) => this.sucursales.set(sucursales));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();

    this.lotesService
      .registrarEntrada({
        productoId: v.productoId!,
        sucursalId: v.sucursalId!,
        numeroLote: v.numeroLote!,
        fechaVencimiento: v.fechaVencimiento!,
        fechaFabricacion: v.fechaFabricacion || undefined,
        costoUnitario: v.costoUnitario!,
        cantidad: v.cantidad!,
        observacion: v.observacion || undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.guardado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(err.error?.message?.toString?.() ?? 'No se pudo registrar la entrada.');
        },
      });
  }
}
