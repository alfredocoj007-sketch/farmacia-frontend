import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/toast/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { LotesService } from '../../../core/services/lotes.service';
import { AuthService } from '../../../core/services/auth.service';
import { Lote } from '../../../core/models/lote.models';
import { LoteEntradaForm } from '../lote-entrada-form/lote-entrada-form';
import { LoteSalidaForm } from '../lote-salida-form/lote-salida-form';

type ModalAbierto = 'entrada' | 'salida' | null;

@Component({
  selector: 'app-lotes-list',
  imports: [RouterLink, Modal, LoteEntradaForm, LoteSalidaForm],
  templateUrl: './lotes-list.html',
  styleUrl: './lotes-list.scss',
})
export class LotesList implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected readonly usuario = this.authService.currentUser;
  protected readonly lotes = signal<Lote[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = 20;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly modalAbierto = signal<ModalAbierto>(null);

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
    this.modalAbierto.set('entrada');
  }

  protected abrirSalida(): void {
    this.modalAbierto.set('salida');
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(null);
  }

  protected onEntradaGuardada(): void {
    this.cerrarModal();
    this.cargar();
    this.toastService.show('Entrada registrada correctamente.');
  }

  protected onSalidaGuardada(): void {
    this.cerrarModal();
    this.cargar();
    this.toastService.show('Salida registrada correctamente.');
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
