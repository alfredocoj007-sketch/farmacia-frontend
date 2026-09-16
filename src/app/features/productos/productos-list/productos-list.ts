import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/toast/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { ProductosService } from '../../../core/services/productos.service';
import { AuthService } from '../../../core/services/auth.service';
import { Producto } from '../../../core/models/producto.models';
import { ProductoForm } from '../producto-form/producto-form';

@Component({
  selector: 'app-productos-list',
  imports: [FormsModule, Modal, ProductoForm],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
})
export class ProductosList implements OnInit {
  private readonly productosService = inject(ProductosService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly productos = signal<Producto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly productoEnEdicion = signal<number | null | undefined>(undefined);

  protected q = '';
  protected estado: '' | 'ACTIVO' | 'INACTIVO' = '';

  ngOnInit(): void {
    this.cargar();
  }

  protected buscar(): void {
    this.page.set(1);
    this.cargar();
  }

  protected cambiarPagina(delta: number): void {
    this.page.set(this.page() + delta);
    this.cargar();
  }

  protected abrirCrear(): void {
    this.productoEnEdicion.set(null);
  }

  protected abrirEditar(producto: Producto): void {
    this.productoEnEdicion.set(producto.productoId);
  }

  protected cerrarFormulario(): void {
    this.productoEnEdicion.set(undefined);
  }

  protected onGuardado(): void {
    const esCreacion = this.productoEnEdicion() === null;
    this.cerrarFormulario();
    this.cargar();
    this.toastService.show(esCreacion ? 'Producto creado correctamente.' : 'Producto actualizado correctamente.');
  }

  protected desactivar(producto: Producto): void {
    this.productosService.desactivar(producto.productoId).subscribe(() => {
      this.cargar();
      this.toastService.show('Producto desactivado correctamente.');
    });
  }

  protected activar(producto: Producto): void {
    this.productosService.activar(producto.productoId).subscribe(() => {
      this.cargar();
      this.toastService.show('Producto activado correctamente.');
    });
  }

  protected esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  protected totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.productosService
      .findAll({
        q: this.q || undefined,
        estado: this.estado || undefined,
        page: this.page(),
        limit: this.limit,
      })
      .subscribe({
        next: (respuesta) => {
          this.productos.set(respuesta.data);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los productos.');
          this.cargando.set(false);
        },
      });
  }
}
