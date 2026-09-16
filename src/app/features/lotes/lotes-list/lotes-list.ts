import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LotesService } from '../../../core/services/lotes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lote } from '../../../core/models/lote.models';

@Component({
  selector: 'app-lotes-list',
  imports: [RouterLink],
  templateUrl: './lotes-list.html',
  styleUrl: './lotes-list.scss',
})
export class LotesList implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly authService = inject(AuthService);

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
