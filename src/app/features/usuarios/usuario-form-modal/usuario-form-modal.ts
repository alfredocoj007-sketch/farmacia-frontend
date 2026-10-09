import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { ToastService } from '../../../shared/toast/toast.service';
import {
  EmpleadoDisponibleItem,
  RolItem,
  UsuarioItem,
} from '../../../core/models/usuario.models';
import { SucursalRed } from '../../../core/models/sucursal.models';

@Component({
  selector: 'app-usuario-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-form-modal.html',
  styleUrl: './usuario-form-modal.scss',
})
export class UsuarioFormModal implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

  @Input() usuarioAEditar: UsuarioItem | null = null;
  @Input() roles: RolItem[] = [];
  @Input() sucursales: SucursalRed[] = [];

  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  // Campos de formulario
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly telefono = signal('');
  protected readonly dpi = signal('');
  protected readonly rolId = signal<number | null>(null);
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly estado = signal<'ACTIVO' | 'INACTIVO'>('ACTIVO');

  // Integración y búsqueda de colaboradores de Planilla
  protected readonly empleados = signal<EmpleadoDisponibleItem[]>([]);
  protected readonly cargandoEmpleados = signal(false);
  protected readonly busquedaColaborador = signal('');
  protected readonly empleadoSeleccionado = signal<EmpleadoDisponibleItem | null>(null);
  protected readonly modoManual = signal(false);
  protected readonly mostrarDropdown = signal(false);

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mostrarPassword = signal(false);

  // Validación reactiva de seguridad de contraseña
  protected readonly tieneMinLongitud = computed(() => this.password().length >= 8);
  protected readonly tieneMayuscula = computed(() => /[A-Z]/.test(this.password()));
  protected readonly tieneMinuscula = computed(() => /[a-z]/.test(this.password()));
  protected readonly tieneNumero = computed(() => /[0-9]/.test(this.password()));
  protected readonly tieneEspecial = computed(() =>
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password()),
  );

  protected readonly puntajePassword = computed(() => {
    let puntos = 0;
    if (this.tieneMinLongitud()) puntos++;
    if (this.tieneMayuscula()) puntos++;
    if (this.tieneMinuscula()) puntos++;
    if (this.tieneNumero()) puntos++;
    if (this.tieneEspecial()) puntos++;
    return puntos;
  });

  protected readonly passwordValida = computed(() => {
    if (this.esEdicion && !this.password()) return true;
    return this.puntajePassword() === 5;
  });

  get esEdicion(): boolean {
    return this.usuarioAEditar !== null;
  }

  get esAdminProtegido(): boolean {
    return this.usuarioAEditar?.username?.trim().toLowerCase() === 'admin';
  }

  // Búsqueda en vivo de colaboradores (estilo buscador de productos POS)
  protected readonly colaboradoresFiltrados = computed(() => {
    const q = this.busquedaColaborador().trim().toLowerCase();
    const lista = this.empleados();
    if (!q) {
      // Mostrar prioritariamente los colaboradores sin usuario
      return [...lista].sort((a, b) => (a.tieneUsuario ? 1 : 0) - (b.tieneUsuario ? 1 : 0)).slice(0, 10);
    }
    return lista
      .filter((e) => {
        const matchNombre = e.nombreCompleto?.toLowerCase().includes(q);
        const matchDpi = e.dpi?.toLowerCase().includes(q);
        const matchPuesto = e.puesto?.nombre?.toLowerCase().includes(q);
        const matchSucursal = e.sucursal?.nombre?.toLowerCase().includes(q);
        const matchTel = e.telefono?.toLowerCase().includes(q);
        return matchNombre || matchDpi || matchPuesto || matchSucursal || matchTel;
      })
      .sort((a, b) => (a.tieneUsuario ? 1 : 0) - (b.tieneUsuario ? 1 : 0));
  });

  protected readonly totalColaboradoresSinUsuario = computed(
    () => this.empleados().filter((e) => !e.tieneUsuario).length,
  );

  ngOnInit(): void {
    if (this.usuarioAEditar) {
      const u = this.usuarioAEditar;
      this.username.set(u.username);
      this.nombre.set(u.empleado?.nombre || '');
      this.apellido.set(u.empleado?.apellido || '');
      this.telefono.set(u.empleado?.telefono || '');
      this.dpi.set(u.empleado?.dpi || '');
      this.rolId.set(u.rol?.rolId || null);
      this.sucursalId.set(u.empleado?.sucursal?.sucursalId || null);
      this.estado.set((u.estado as 'ACTIVO' | 'INACTIVO') || 'ACTIVO');
    } else {
      if (this.roles.length > 0) {
        this.rolId.set(this.roles[0].rolId);
      }
      if (this.sucursales.length > 0) {
        this.sucursalId.set(this.sucursales[0].sucursalId);
      }
      this.cargarEmpleadosDisponibles();
    }
  }

  protected cargarEmpleadosDisponibles(): void {
    this.cargandoEmpleados.set(true);
    this.usuariosService.listarEmpleadosDisponibles().subscribe({
      next: (lista) => {
        this.empleados.set(lista);
        this.cargandoEmpleados.set(false);
      },
      error: () => {
        this.cargandoEmpleados.set(false);
      },
    });
  }

  protected alternarVisibilidadPassword(): void {
    this.mostrarPassword.update((v) => !v);
  }

  protected alternarModoManual(): void {
    this.modoManual.update((v) => !v);
    if (this.modoManual()) {
      this.empleadoSeleccionado.set(null);
    }
  }

  protected seleccionarColaborador(emp: EmpleadoDisponibleItem): void {
    if (emp.tieneUsuario) {
      this.toastService.warning(
        `El colaborador "${emp.nombreCompleto}" ya cuenta con una cuenta de usuario activa (@${emp.username}).`,
      );
      return;
    }

    this.empleadoSeleccionado.set(emp);
    this.nombre.set(emp.nombre);
    this.apellido.set(emp.apellido);
    this.telefono.set(emp.telefono || '');
    this.dpi.set(emp.dpi || '');

    // Sincronizar sucursal si el colaborador tiene una asignada
    if (emp.sucursal?.sucursalId) {
      this.sucursalId.set(emp.sucursal.sucursalId);
    }

    // Auto-sugerir rol en base al puesto de trabajo
    if (emp.puesto?.nombre && this.roles.length > 0) {
      const puestoNorm = emp.puesto.nombre.toLowerCase();
      const rolEncontrado = this.roles.find((r) => {
        const rNorm = r.nombre.toLowerCase();
        if (puestoNorm.includes('admin') && rNorm.includes('admin')) return true;
        if (
          (puestoNorm.includes('vended') || puestoNorm.includes('cajer')) &&
          rNorm.includes('vendedor')
        )
          return true;
        if (
          (puestoNorm.includes('farmac') || puestoNorm.includes('regent')) &&
          rNorm.includes('farmaceutico')
        )
          return true;
        if (puestoNorm.includes('call') && rNorm.includes('call')) return true;
        return rNorm === puestoNorm;
      });
      if (rolEncontrado) {
        this.rolId.set(rolEncontrado.rolId);
      }
    }

    // Sugerir nombre de usuario limpio si no se ha ingresado uno
    if (!this.username().trim()) {
      const primerNombre = emp.nombre.trim().split(/\s+/)[0] || '';
      const primerApellido = emp.apellido.trim().split(/\s+/)[0] || '';
      const nombreNorm = primerNombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      const apellidoNorm = primerApellido
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

      if (nombreNorm && apellidoNorm) {
        this.username.set(`${nombreNorm}.${apellidoNorm}`);
      } else if (nombreNorm) {
        this.username.set(nombreNorm);
      }
    }

    this.mostrarDropdown.set(false);
    this.busquedaColaborador.set('');
  }

  protected deseleccionarColaborador(): void {
    this.empleadoSeleccionado.set(null);
  }

  protected limpiarBusquedaColaborador(): void {
    this.busquedaColaborador.set('');
  }

  protected onNombreInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    input.value = limpio;
    this.nombre.set(limpio);
  }

  protected onApellidoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    input.value = limpio;
    this.apellido.set(limpio);
  }

  protected onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '').slice(0, 8);
    input.value = limpio;
    this.telefono.set(limpio);
  }

  protected onDpiInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/\D/g, '').slice(0, 13);
    input.value = limpio;
    this.dpi.set(limpio);
  }

  protected async submit(): Promise<void> {
    this.error.set(null);

    // Validaciones básicas
    if (!this.esEdicion) {
      if (!this.username().trim()) {
        this.error.set('El nombre de usuario es obligatorio.');
        return;
      }
      if (!this.passwordValida()) {
        this.error.set(
          'La contraseña no cumple con todos los requisitos de seguridad (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo).',
        );
        return;
      }
      if (!this.modoManual() && !this.empleadoSeleccionado()) {
        this.error.set(
          'Por favor, busca y selecciona un colaborador o activa el modo "Ingreso manual".',
        );
        return;
      }
    } else if (this.password().trim().length > 0) {
      if (!this.passwordValida()) {
        this.error.set(
          'La nueva contraseña no cumple con todos los requisitos de seguridad (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo).',
        );
        return;
      }
    }

    const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

    if (!this.nombre().trim() || !regexLetras.test(this.nombre().trim())) {
      this.error.set('El nombre es obligatorio y solo puede contener letras (sin números ni símbolos).');
      return;
    }

    if (!this.apellido().trim() || !regexLetras.test(this.apellido().trim())) {
      this.error.set('El apellido es obligatorio y solo puede contener letras (sin números ni símbolos).');
      return;
    }

    if (this.telefono().trim().length > 0 && this.telefono().trim().length !== 8) {
      this.error.set('El teléfono debe tener exactamente 8 números (mínimo y máximo 8).');
      return;
    }

    if (this.dpi().trim().length > 0 && this.dpi().trim().length !== 13) {
      this.error.set('El DPI debe tener exactamente 13 números (mínimo y máximo 13).');
      return;
    }

    if (!this.rolId()) {
      this.error.set('Debes seleccionar un rol para el usuario.');
      return;
    }

    if (!this.sucursalId()) {
      this.error.set('Debes seleccionar la sucursal asignada.');
      return;
    }

    if (this.esEdicion) {
      const confirmado = await this.confirmService.confirm({
        title: '¿Confirmar cambios del usuario?',
        message: `¿Deseas guardar las modificaciones y reasignaciones para el usuario "${this.username()}"?`,
        confirmText: 'Sí, Guardar Cambios',
        cancelText: 'Cancelar',
        tipo: 'primary',
      });
      if (!confirmado) return;

      this.guardando.set(true);

      const payload: any = {
        nombre: this.nombre().trim(),
        apellido: this.apellido().trim(),
        telefono: this.telefono().trim() || undefined,
        rolId: this.esAdminProtegido && this.usuarioAEditar?.rol?.rolId
          ? this.usuarioAEditar.rol.rolId
          : Number(this.rolId()),
        sucursalId: Number(this.sucursalId()),
        estado: this.esAdminProtegido ? 'ACTIVO' : this.estado(),
      };

      if (this.password().trim().length >= 6) {
        payload.password = this.password().trim();
      }

      this.usuariosService.actualizar(this.usuarioAEditar!.credencialId, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastService.success('Usuario actualizado correctamente.');
          this.guardado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(
            err?.error?.message || 'Error al actualizar el usuario.',
          );
        },
      });
    } else {
      const empSel = this.empleadoSeleccionado();
      const titular = empSel
        ? `vincular las credenciales de "${this.username().trim().toLowerCase()}" a ${empSel.nombreCompleto}`
        : `crear al usuario "${this.username().trim().toLowerCase()}"`;

      const confirmado = await this.confirmService.confirm({
        title: '¿Registrar nuevo usuario?',
        message: `¿Deseas ${titular} con acceso al sistema?`,
        confirmText: 'Sí, Crear Usuario',
        cancelText: 'Cancelar',
        tipo: 'primary',
      });
      if (!confirmado) return;

      this.guardando.set(true);

      const payload: any = {
        username: this.username().trim().toLowerCase(),
        password: this.password().trim(),
        nombre: this.nombre().trim(),
        apellido: this.apellido().trim(),
        telefono: this.telefono().trim() || undefined,
        dpi: this.dpi().trim() || undefined,
        rolId: Number(this.rolId()),
        sucursalId: Number(this.sucursalId()),
      };

      if (empSel) {
        payload.empleadoId = empSel.empleadoId;
      }

      this.usuariosService.crear(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastService.success('Nuevo usuario registrado con éxito.');
          this.guardado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(
            err?.error?.message ||
              'Error al crear el usuario. Verifica que no exista un usuario con el mismo username.',
          );
        },
      });
    }
  }
}
