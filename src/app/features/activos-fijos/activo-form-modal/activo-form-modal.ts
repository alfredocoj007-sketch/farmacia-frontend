import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ActivosFijosService } from '../../../core/services/activos-fijos.service';
import { CategoriaActivo, CreateActivoFijoRequest } from '../../../core/models/activo-fijo.models';
import { Sucursal } from '../../../core/models/lote.models';

@Component({
  selector: 'app-activo-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activo-form-modal.html',
})
export class ActivoFormModal implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly activosService = inject(ActivosFijosService);

  @Input() categorias: CategoriaActivo[] = [];
  @Input() sucursales: Sucursal[] = [];
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  protected readonly usuarioActual = this.authService.currentUser;
  protected readonly esAdmin = computed(() => this.usuarioActual()?.rol === 'ADMIN');

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected form: CreateActivoFijoRequest = {
    codigoActivo: '',
    descripcion: '',
    categoriaActivoId: 0,
    sucursalId: 0,
    marca: '',
    modelo: '',
    numeroSerie: '',
    fechaAdquisicion: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    valorAdquisicion: 0,
    valorResidual: 0,
  };

  ngOnInit(): void {
    if (!this.esAdmin() && this.usuarioActual()?.sucursalId) {
      this.form.sucursalId = this.usuarioActual()!.sucursalId!;
    }
  }

  protected submit(): void {
    if (!this.form.codigoActivo.trim()) {
      this.error.set('El código de activo es obligatorio.');
      return;
    }
    if (!this.form.descripcion.trim()) {
      this.error.set('La descripción del activo o equipo es obligatoria.');
      return;
    }
    if (!this.form.categoriaActivoId) {
      this.error.set('Debe seleccionar una categoría de activo.');
      return;
    }
    if (!this.esAdmin() && this.usuarioActual()?.sucursalId) {
      this.form.sucursalId = this.usuarioActual()!.sucursalId!;
    }
    if (!this.form.sucursalId) {
      this.error.set('Debe seleccionar la sucursal de asignación inicial.');
      return;
    }
    if (this.form.valorAdquisicion <= 0) {
      this.error.set('El valor de adquisición debe ser mayor a Q 0.00.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const payload: CreateActivoFijoRequest = {
      ...this.form,
      codigoActivo: this.form.codigoActivo.trim().toUpperCase(),
      descripcion: this.form.descripcion.trim(),
      categoriaActivoId: Number(this.form.categoriaActivoId),
      sucursalId: Number(this.form.sucursalId),
      marca: this.form.marca?.trim() || undefined,
      modelo: this.form.modelo?.trim() || undefined,
      numeroSerie: this.form.numeroSerie?.trim() || undefined,
      valorAdquisicion: Number(this.form.valorAdquisicion),
      valorResidual: Number(this.form.valorResidual || 0),
    };

    this.activosService.crear(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(
          err.error?.message || 'Error al dar de alta el activo patrimonial.',
        );
      },
    });
  }
}
