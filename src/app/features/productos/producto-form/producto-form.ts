import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';
import { CategoriasProductoService } from '../../../core/services/categorias-producto.service';
import { LaboratoriosService } from '../../../core/services/laboratorios.service';
import { UnidadesMedidaService } from '../../../core/services/unidades-medida.service';
import { CategoriaProducto, Laboratorio, UnidadMedida } from '../../../core/models/producto.models';

@Component({
  selector: 'app-producto-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.scss',
})
export class ProductoForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productosService = inject(ProductosService);
  private readonly categoriasService = inject(CategoriasProductoService);
  private readonly laboratoriosService = inject(LaboratoriosService);
  private readonly unidadesMedidaService = inject(UnidadesMedidaService);
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
    categoriaId: [null as number | null],
    laboratorioId: [null as number | null],
    unidadMedidaId: [null as number | null],
  });

  protected readonly modoEdicion = signal(false);
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categorias = signal<CategoriaProducto[]>([]);
  protected readonly laboratorios = signal<Laboratorio[]>([]);
  protected readonly unidadesMedida = signal<UnidadMedida[]>([]);

  private productoId: number | null = null;

  ngOnInit(): void {
    this.categoriasService.findAll().subscribe((c) => this.categorias.set(c));
    this.laboratoriosService.findAll().subscribe((l) => this.laboratorios.set(l));
    this.unidadesMedidaService.findAll().subscribe((u) => this.unidadesMedida.set(u));

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
          categoriaId: producto.categoria?.categoriaId ?? null,
          laboratorioId: producto.laboratorio?.laboratorioId ?? null,
          unidadMedidaId: producto.unidadMedida?.unidadMedidaId ?? null,
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
      categoriaId: valores.categoriaId ?? undefined,
      laboratorioId: valores.laboratorioId ?? undefined,
      unidadMedidaId: valores.unidadMedidaId ?? undefined,
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
