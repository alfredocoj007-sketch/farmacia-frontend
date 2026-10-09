import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ToastService } from '../../../shared/toast/toast.service';
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
  private readonly toastService = inject(ToastService);

  readonly sucursalParaEditar = input<SucursalRed | null>(null);
  readonly guardado = output<void>();
  readonly cerrar = output<void>();

  // Estado del formulario
  protected readonly guardando = signal(false);
  protected readonly errorMensaje = signal<string | null>(null);

  // Catálogos geográficos
  protected readonly departamentos = signal<DepartamentoGeo[]>([]);
  protected readonly municipios = signal<MunicipioGeo[]>([]);

  // Sub-modal para registrar nuevo Departamento
  protected readonly modalNuevoDepartamento = signal(false);
  protected readonly nuevoDepNombre = signal('');
  protected readonly nuevoDepMunicipio = signal('');

  // Sub-modal para registrar nuevo Municipio
  protected readonly modalNuevoMunicipio = signal(false);
  protected readonly nuevoMunNombre = signal('');

  protected readonly guardandoGeo = signal(false);
  protected readonly errorGeo = signal<string | null>(null);

  // Nombre del departamento seleccionado actualmente
  protected readonly nombreDepartamentoActual = computed(() => {
    const id = this.departamentoId;
    return this.departamentos().find((d) => d.departamentoId === id)?.nombre || 'este Departamento';
  });

  // Campos
  protected nombre = '';
  protected tipoSucursal = 'FARMACIA';
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
      let tipo = editar.tipoSucursal;
      if (tipo === 'STAND') tipo = 'GAS_STAND';
      if (tipo === 'BODEGA_MATRIZ') tipo = 'BODEGA_CENTRAL';
      this.tipoSucursal = tipo || 'FARMACIA';
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

  // --- MÉTODOS DE CREACIÓN GEOGRÁFICA ---

  protected abrirCrearDepartamento(): void {
    this.nuevoDepNombre.set('');
    this.nuevoDepMunicipio.set('');
    this.errorGeo.set(null);
    this.modalNuevoDepartamento.set(true);
  }

  protected cerrarCrearDepartamento(): void {
    this.modalNuevoDepartamento.set(false);
    this.errorGeo.set(null);
  }

  protected guardarNuevoDepartamento(): void {
    const nombre = this.nuevoDepNombre().trim();
    if (!nombre) {
      this.errorGeo.set('El nombre del departamento es requerido.');
      return;
    }

    this.guardandoGeo.set(true);
    this.errorGeo.set(null);

    this.sucursalesService
      .crearDepartamento({
        nombre,
        municipioInicial: this.nuevoDepMunicipio().trim() || undefined,
      })
      .subscribe({
        next: (nuevoDep) => {
          this.guardandoGeo.set(false);
          this.toastService.success(`Departamento "${nuevoDep.nombre}" creado exitosamente.`);
          // Añadir a lista de departamentos
          const lista = [...this.departamentos(), nuevoDep].sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          );
          this.departamentos.set(lista);
          this.departamentoId = nuevoDep.departamentoId;

          if (nuevoDep.municipios && nuevoDep.municipios.length > 0) {
            this.municipios.set(nuevoDep.municipios);
            this.municipioId = nuevoDep.municipios[0].municipioId;
          } else {
            this.cargarMunicipios(nuevoDep.departamentoId);
          }

          this.cerrarCrearDepartamento();
        },
        error: (err) => {
          this.guardandoGeo.set(false);
          this.errorGeo.set(err.error?.message || 'Error al crear el departamento.');
        },
      });
  }

  protected abrirCrearMunicipio(): void {
    if (!this.departamentoId) {
      this.errorMensaje.set('Primero selecciona un Departamento para poder asociarle un Municipio.');
      return;
    }
    this.nuevoMunNombre.set('');
    this.errorGeo.set(null);
    this.modalNuevoMunicipio.set(true);
  }

  protected cerrarCrearMunicipio(): void {
    this.modalNuevoMunicipio.set(false);
    this.errorGeo.set(null);
  }

  protected guardarNuevoMunicipio(): void {
    const nombre = this.nuevoMunNombre().trim();
    if (!nombre) {
      this.errorGeo.set('El nombre del municipio es requerido.');
      return;
    }
    if (!this.departamentoId) {
      this.errorGeo.set('No hay un departamento seleccionado.');
      return;
    }

    this.guardandoGeo.set(true);
    this.errorGeo.set(null);

    this.sucursalesService
      .crearMunicipio({
        nombre,
        departamentoId: this.departamentoId,
      })
      .subscribe({
        next: (nuevoMun) => {
          this.guardandoGeo.set(false);
          this.toastService.success(`Municipio "${nuevoMun.nombre}" agregado exitosamente.`);
          const lista = [...this.municipios(), nuevoMun].sort((a, b) =>
            a.nombre.localeCompare(b.nombre),
          );
          this.municipios.set(lista);
          this.municipioId = nuevoMun.municipioId;
          this.cerrarCrearMunicipio();
        },
        error: (err) => {
          this.guardandoGeo.set(false);
          this.errorGeo.set(err.error?.message || 'Error al crear el municipio.');
        },
      });
  }
}
