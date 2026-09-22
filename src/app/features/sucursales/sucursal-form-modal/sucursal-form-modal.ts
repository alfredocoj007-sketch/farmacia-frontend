import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SucursalesService } from '../../../core/services/sucursales.service';
import {
  CreateSucursalRequest,
  DepartamentoGeo,
  MunicipioGeo,
  SucursalRed,
  UpdateSucursalRequest,
} from '../../../core/models/sucursal.models';

@Component({
  selector: 'app-sucursal-form-modal',
  imports: [FormsModule],
  templateUrl: './sucursal-form-modal.html',
})
export class SucursalFormModal implements OnInit {
  private readonly sucursalesService = inject(SucursalesService);

  readonly sucursalParaEditar = input<SucursalRed | null>(null);
  readonly guardado = output<void>();
  readonly cerrar = output<void>();

  // Estado del formulario
  protected readonly guardando = signal(false);
  protected readonly errorMensaje = signal<string | null>(null);

  // Catálogos geográficos
  protected readonly departamentos = signal<DepartamentoGeo[]>([]);
  protected readonly municipios = signal<MunicipioGeo[]>([]);

  // Campos
  protected nombre = '';
  protected tipoSucursal = 'MALL_STAND';
  protected departamentoId: number | null = null;
  protected municipioId: number | null = null;
  protected direccion = '';
  protected telefono = '';
  protected estado = 'ACTIVA';

  ngOnInit(): void {
    this.cargarDepartamentos();
    const editar = this.sucursalParaEditar();
    if (editar) {
      this.nombre = editar.nombre;
      this.tipoSucursal = editar.tipoSucursal;
      this.direccion = editar.direccion;
      this.telefono = editar.telefono || '';
      this.estado = editar.estado;
      if (editar.municipio) {
        this.municipioId = editar.municipio.municipioId;
        if (editar.municipio.departamento) {
          this.departamentoId = editar.municipio.departamento.departamentoId;
          this.cargarMunicipios(this.departamentoId);
        }
      }
    }
  }

  protected cargarDepartamentos(): void {
    this.sucursalesService.obtenerDepartamentos().subscribe({
      next: (deps) => {
        this.departamentos.set(deps);
        if (!this.departamentoId && deps.length > 0) {
          this.departamentoId = deps[0].departamentoId;
          this.cargarMunicipios(this.departamentoId);
        }
      },
      error: () => this.errorMensaje.set('No se pudieron cargar los departamentos.'),
    });
  }

  protected onDepartamentoChange(): void {
    if (this.departamentoId) {
      this.cargarMunicipios(this.departamentoId);
    }
  }

  protected cargarMunicipios(depId: number): void {
    this.sucursalesService.obtenerMunicipios(depId).subscribe({
      next: (muns) => {
        this.municipios.set(muns);
        if (muns.length > 0 && (!this.municipioId || !muns.some((m) => m.municipioId === this.municipioId))) {
          this.municipioId = muns[0].municipioId;
        }
      },
      error: () => this.errorMensaje.set('No se pudieron cargar los municipios.'),
    });
  }

  protected guardar(): void {
    if (!this.nombre.trim()) {
      this.errorMensaje.set('El nombre de la sucursal es obligatorio.');
      return;
    }
    if (!this.direccion.trim()) {
      this.errorMensaje.set('La dirección física es obligatoria.');
      return;
    }
    if (!this.municipioId) {
      this.errorMensaje.set('Debes seleccionar un municipio.');
      return;
    }

    this.guardando.set(true);
    this.errorMensaje.set(null);

    const editar = this.sucursalParaEditar();
    if (editar) {
      const dto: UpdateSucursalRequest = {
        nombre: this.nombre.trim(),
        tipoSucursal: this.tipoSucursal,
        direccion: this.direccion.trim(),
        telefono: this.telefono.trim() || undefined,
        municipioId: this.municipioId,
        estado: this.estado,
      };

      this.sucursalesService.actualizar(editar.sucursalId, dto).subscribe({
        next: () => {
          this.guardando.set(false);
          this.guardado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorMensaje.set(err.error?.message || 'Error al actualizar la sucursal.');
        },
      });
    } else {
      const dto: CreateSucursalRequest = {
        nombre: this.nombre.trim(),
        tipoSucursal: this.tipoSucursal,
        direccion: this.direccion.trim(),
        telefono: this.telefono.trim() || undefined,
        municipioId: this.municipioId,
        estado: this.estado,
      };

      this.sucursalesService.crear(dto).subscribe({
        next: () => {
          this.guardando.set(false);
          this.guardado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorMensaje.set(err.error?.message || 'Error al crear la sucursal.');
        },
      });
    }
  }
}
