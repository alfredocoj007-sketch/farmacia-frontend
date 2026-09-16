import { Component, OnInit, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LotesService } from '../../../core/services/lotes.service';
import { Lote, MovimientoInventario } from '../../../core/models/lote.models';

@Component({
  selector: 'app-lote-kardex',
  imports: [RouterLink, SlicePipe],
  templateUrl: './lote-kardex.html',
  styleUrl: './lote-kardex.scss',
})
export class LoteKardex implements OnInit {
  private readonly lotesService = inject(LotesService);
  private readonly route = inject(ActivatedRoute);

  protected readonly lote = signal<Lote | null>(null);
  protected readonly movimientos = signal<MovimientoInventario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const loteId = Number(this.route.snapshot.paramMap.get('id'));

    this.lotesService.findOne(loteId).subscribe({
      next: (lote) => this.lote.set(lote),
      error: () => this.error.set('No se pudo cargar el lote.'),
    });

    this.lotesService.findMovimientos(loteId).subscribe({
      next: (movimientos) => {
        this.movimientos.set(movimientos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el Kardex.');
        this.cargando.set(false);
      },
    });
  }
}
