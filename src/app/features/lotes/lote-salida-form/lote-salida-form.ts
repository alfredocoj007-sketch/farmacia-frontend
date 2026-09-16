import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LotesService } from '../../../core/services/lotes.service';
import { ProductosService } from '../../../core/services/productos.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { AuthService } from '../../../core/services/auth.service';
import { Producto } from '../../../core/models/producto.models';
import { MovimientoInventario, Sucursal } from '../../../core/models/lote.models';

@Component({
  selector: 'app-lote-salida-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './lote-salida-form.html',
  styleUrl: './lote-salida-form.scss',
})
export class LoteSalidaForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly lotesService = inject(LotesService);
  private readonly productosService = inject(ProductosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<LoteSalidaForm, boolean>);

  protected readonly usuario = this.authService.currentUser;

  protected readonly form = this.fb.group({
    productoId: [null as number | null, Validators.required],
    sucursalId: [null as number | null, Validators.required],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    tipoMovimiento: ['VENTA' as 'VENTA' | 'AJUSTE', Validators.required],
    loteId: [null as number | null],
    observacion: [''],
  });

  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<MovimientoInventario[] | null>(null);

  ngOnInit(): void {
    this.productosService.findAll({ estado: 'ACTIVO', limit: 200 }).subscribe((r) => this.productos.set(r.data));
    this.sucursalesService.findAll().subscribe((sucursales) => this.sucursales.set(sucursales));
  }

  protected esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  protected cancelar(): void {
    this.dialogRef.close(false);
  }

  protected cerrarConResultado(): void {
    this.dialogRef.close(true);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.resultado.set(null);

    const v = this.form.getRawValue();

    this.lotesService
      .registrarSalida({
        productoId: v.productoId!,
        sucursalId: v.sucursalId!,
        cantidad: v.cantidad!,
        tipoMovimiento: v.tipoMovimiento!,
        loteId: v.loteId ?? undefined,
        observacion: v.observacion || undefined,
      })
      .subscribe({
        next: (movimientos) => {
          this.guardando.set(false);
          this.resultado.set(movimientos);
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(err.error?.message?.toString?.() ?? 'No se pudo registrar la salida.');
        },
      });
  }
}
