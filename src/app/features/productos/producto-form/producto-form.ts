import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.scss',
})
export class ProductoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productosService = inject(ProductosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = this.fb.group({
    nombre: ['', Validators.required],
    codigoProducto: ['', Validators.required],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
    porcentajeIva: [12, [Validators.min(0), Validators.max(100)]],
    requiereReceta: [false],
    principioActivo: [''],
    presentacion: [''],
    concentracion: [''],
  });

  protected readonly modoEdicion = signal(false);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  private productoId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    this.productoId = Number(idParam);
    this.modoEdicion.set(true);
    this.cargando.set(true);

    this.productosService.findOne(this.productoId).subscribe({
      next: (producto) => {
        this.form.patchValue({
          nombre: producto.nombre,
          codigoProducto: producto.codigoProducto,
          precioVenta: producto.precioVenta,
          porcentajeIva: producto.porcentajeIva,
          requiereReceta: producto.requiereReceta === 'S',
          principioActivo: producto.principioActivo ?? '',
          presentacion: producto.presentacion ?? '',
          concentracion: producto.concentracion ?? '',
        });
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el producto.');
        this.cargando.set(false);
      },
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const valores = this.form.getRawValue();
    const payload = {
      nombre: valores.nombre!,
      codigoProducto: valores.codigoProducto!,
      precioVenta: valores.precioVenta!,
      porcentajeIva: valores.porcentajeIva ?? undefined,
      requiereReceta: valores.requiereReceta ?? undefined,
      principioActivo: valores.principioActivo || undefined,
      presentacion: valores.presentacion || undefined,
      concentracion: valores.concentracion || undefined,
    };

    const peticion = this.modoEdicion()
      ? this.productosService.update(this.productoId!, payload)
      : this.productosService.create(payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/productos']);
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err.error?.message?.toString?.() ?? 'No se pudo guardar el producto.');
      },
    });
  }
}
