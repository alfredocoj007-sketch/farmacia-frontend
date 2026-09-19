import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Modal } from '../../../shared/modal/modal';
import {
  AuditoriaEvento,
  CredencialSeguridad,
  EstadisticasAuditoria,
  FiltrosAuditoria,
  RolSeguridad,
} from '../../../core/models/auditoria.models';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuditoriaDetalleModal } from '../auditoria-detalle-modal/auditoria-detalle-modal';

@Component({
  selector: 'app-auditoria-list',
  imports: [FormsModule, DatePipe, Modal, AuditoriaDetalleModal],
  templateUrl: './auditoria-list.html',
  styleUrl: './auditoria-list.scss',
})
export class AuditoriaList implements OnInit {
  private readonly auditoriaService = inject(AuditoriaService);

  // Pestaña principal: 'bitacora' | 'seguridad'
  protected readonly tabActiva = signal<'bitacora' | 'seguridad'>('bitacora');
  // Sub-vista de bitácora: 'tabla' | 'timeline'
  protected readonly vistaActiva = signal<'tabla' | 'timeline'>('tabla');

  // Estados de Carga
  protected readonly cargando = signal(false);
  protected readonly cargandoStats = signal(false);
  protected readonly cargandoSeguridad = signal(false);

  // Datos
  protected readonly estadisticas = signal<EstadisticasAuditoria | null>(null);
  protected readonly eventos = signal<AuditoriaEvento[]>([]);
  protected readonly roles = signal<RolSeguridad[]>([]);
  protected readonly credenciales = signal<CredencialSeguridad[]>([]);

  // Paginación
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly limit = signal(10);
  protected readonly totalPages = signal(1);

  // Modal de Detalle
  protected readonly eventoSeleccionado = signal<AuditoriaEvento | null>(null);

  // Filtros reactivos
  protected readonly busqueda = signal('');
  protected readonly moduloSeleccionado = signal('');
  protected readonly operacionSeleccionada = signal('');
  protected readonly severidadSeleccionada = signal('');
  protected readonly fechaInicio = signal('');
  protected readonly fechaFin = signal('');

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarEventos();
    this.cargarSeguridad();
  }

  protected cambiarTab(tab: 'bitacora' | 'seguridad'): void {
    this.tabActiva.set(tab);
    if (tab === 'seguridad' && this.roles().length === 0) {
      this.cargarSeguridad();
    }
  }

  protected cambiarVista(vista: 'tabla' | 'timeline'): void {
    this.vistaActiva.set(vista);
  }

  protected cargarEstadisticas(): void {
    this.cargandoStats.set(true);
    this.auditoriaService.obtenerEstadisticas().subscribe({
      next: (stats) => {
        this.estadisticas.set(stats);
        this.cargandoStats.set(false);
      },
      error: () => this.cargandoStats.set(false),
    });
  }

  protected cargarEventos(): void {
    this.cargando.set(true);

    const filtros: FiltrosAuditoria = {
      page: this.page(),
      limit: this.limit(),
      q: this.busqueda() ? this.busqueda().trim() : undefined,
      modulo: this.moduloSeleccionado() || undefined,
      operacion: this.operacionSeleccionada() || undefined,
      fechaInicio: this.fechaInicio() || undefined,
      fechaFin: this.fechaFin() || undefined,
    };

    // Si seleccionó severidad y no hay operación específica
    if (this.severidadSeleccionada() === 'critica' && !this.operacionSeleccionada()) {
      filtros.q = filtros.q ? `${filtros.q} DELETE AJUSTE` : undefined;
    }

    this.auditoriaService.listarEventos(filtros).subscribe({
      next: (res) => {
        let items = res.items;

        // Filtrado en cliente de severidad si aplica
        if (this.severidadSeleccionada() === 'critica') {
          items = items.filter((e) => this.esCritico(e.operacion));
        } else if (this.severidadSeleccionada() === 'operativa') {
          items = items.filter((e) => this.esOperativo(e.operacion));
        } else if (this.severidadSeleccionada() === 'informativa') {
          items = items.filter((e) => this.esInformativo(e.operacion));
        }

        this.eventos.set(items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages || 1);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected cargarSeguridad(): void {
    this.cargandoSeguridad.set(true);
    this.auditoriaService.obtenerRolesYUsuarios().subscribe({
      next: (res) => {
        this.roles.set(res.roles);
        this.credenciales.set(res.credenciales);
        this.cargandoSeguridad.set(false);
      },
      error: () => this.cargandoSeguridad.set(false),
    });
  }

  protected aplicarFiltros(): void {
    this.page.set(1);
    this.cargarEventos();
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.moduloSeleccionado.set('');
    this.operacionSeleccionada.set('');
    this.severidadSeleccionada.set('');
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.page.set(1);
    this.cargarEventos();
  }

  protected cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPages()) {
      this.page.set(nuevaPagina);
      this.cargarEventos();
    }
  }

  protected abrirDetalle(evento: AuditoriaEvento): void {
    this.eventoSeleccionado.set(evento);
  }

  protected cerrarDetalle(): void {
    this.eventoSeleccionado.set(null);
  }

  protected imprimirBitacora(): void {
    window.print();
  }

  // Clasificadores de severidad
  protected esCritico(op: string): boolean {
    return (
      op === 'DELETE' ||
      op === 'AJUSTE' ||
      op === 'ARQUEO_FALTANTE' ||
      op === 'EXCEPCION_MANUAL' ||
      op === 'LOGIN_FALLIDO' ||
      op === 'AJUSTE_SALARIO'
    );
  }

  protected esOperativo(op: string): boolean {
    return (
      op === 'UPDATE' ||
      op === 'TRANSFERENCIA' ||
      op === 'ARQUEO' ||
      op === 'INSERT'
    );
  }

  protected esInformativo(op: string): boolean {
    return op === 'LOGIN' || op === 'LOGOUT';
  }
}
