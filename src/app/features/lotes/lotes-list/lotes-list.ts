import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { LotesService } from '../../../core/services/lotes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lote } from '../../../core/models/lote.models';
import { LoteEntradaForm } from '../lote-entrada-form/lote-entrada-form';
import { LoteSalidaForm } from '../lote-salida-form/lote-salida-form';

@Component({
  selector: 'app-lotes-list',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './lotes-list.html',
  styleUrl: './lotes-list.scss',
})
export class LotesList implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly usuario = this.authService.currentUser;
  protected readonly lotes = signal<Lote[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarPagina(delta: number): void {
    this.page.set(this.page() + delta);
    this.cargar();
  }

  protected esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  protected totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit));
  }

  protected stockTotal(lote: Lote): number {
    return (lote.inventarios ?? []).reduce((sum, inv) => sum + Number(inv.cantidadDisponible), 0);
  }

  protected abrirEntrada(): void {
    const ref = this.dialog.open<LoteEntradaForm, unknown, boolean>(LoteEntradaForm, {
      width: '600px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        this.cargar();
        this.avisar('Entrada registrada correctamente.');
      }
    });
  }

  protected abrirSalida(): void {
    const ref = this.dialog.open<LoteSalidaForm, unknown, boolean>(LoteSalidaForm, {
      width: '600px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        this.cargar();
        this.avisar('Salida registrada correctamente.');
      }
    });
  }

  private avisar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.lotesService.findAll({ page: this.page(), limit: this.limit }).subscribe({
      next: (respuesta) => {
        this.lotes.set(respuesta.data);
        this.total.set(respuesta.total);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los lotes.');
        this.cargando.set(false);
      },
    });
  }
}
