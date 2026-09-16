import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { ProductosService } from '../../../core/services/productos.service';
import { AuthService } from '../../../core/services/auth.service';
import { Producto } from '../../../core/models/producto.models';
import { ProductoForm, ProductoFormData } from '../producto-form/producto-form';

@Component({
  selector: 'app-productos-list',
  imports: [FormsModule, MatButtonModule],
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
})
export class ProductosList implements OnInit {
  private readonly productosService = inject(ProductosService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

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

  protected abrirCrear(): void {
    this.abrirFormulario(null, 'Producto creado correctamente.');
  }

  protected abrirEditar(producto: Producto): void {
    this.abrirFormulario(producto.productoId, 'Producto actualizado correctamente.');
  }

  protected desactivar(producto: Producto): void {
    this.productosService.desactivar(producto.productoId).subscribe(() => {
      this.cargar();
      this.avisar('Producto desactivado correctamente.');
    });
  }

  protected activar(producto: Producto): void {
    this.productosService.activar(producto.productoId).subscribe(() => {
      this.cargar();
      this.avisar('Producto activado correctamente.');
    });
  }

  protected esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  protected totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  private abrirFormulario(productoId: number | null, mensajeExito: string): void {
    const ref = this.dialog.open<ProductoForm, ProductoFormData, boolean>(ProductoForm, {
      width: '600px',
      maxWidth: '95vw',
      data: { productoId },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        this.cargar();
        this.avisar(mensajeExito);
      }
    });
  }

  private avisar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
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
