import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SucursalesService } from '../../../core/services/sucursales.service';
import {
  SucursalDetalleCompleto,
  SucursalRed,
} from '../../../core/models/sucursal.models';

@Component({
  selector: 'app-sucursal-detalle-modal',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './sucursal-detalle-modal.html',
  styleUrl: './sucursal-detalle-modal.scss',
})
export class SucursalDetalleModal implements OnInit {
  private readonly sucursalesService = inject(SucursalesService);

  readonly sucursalId = input.required<number>();
  readonly cerrar = output<void>();
  readonly editar = output<SucursalRed>();

  protected readonly cargando = signal(true);
  protected readonly detalle = signal<SucursalDetalleCompleto | null>(null);
  protected readonly subTabActiva = signal<'equipo' | 'cajas' | 'activos' | 'stock'>('equipo');

  ngOnInit(): void {
    this.cargarDetalle();
  }

  protected cargarDetalle(): void {
    this.cargando.set(true);
    this.sucursalesService.obtenerPorId(this.sucursalId()).subscribe({
      next: (data) => {
        this.detalle.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected cambiarSubTab(tab: 'equipo' | 'cajas' | 'activos' | 'stock'): void {
    this.subTabActiva.set(tab);
  }

  protected emitirEdicion(): void {
    const s = this.detalle()?.sucursal;
    if (s) {
      this.editar.emit(s);
    }
  }

  protected imprimir(): void {
    window.print();
  }
}
