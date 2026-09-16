import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductosService } from '../../../core/services/productos.service';
import { AuthService } from '../../../core/services/auth.service';
import { Producto } from '../../../core/models/producto.models';

@Component({
  selector: 'app-productos-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
})
export class ProductosList implements OnInit {
  private readonly productosService = inject(ProductosService);
  private readonly authService = inject(AuthService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly productos = signal<Producto[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

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

  protected desactivar(producto: Producto): void {
    this.productosService.desactivar(producto.productoId).subscribe(() => this.cargar());
  }

  protected activar(producto: Producto): void {
    this.productosService.activar(producto.productoId).subscribe(() => this.cargar());
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
