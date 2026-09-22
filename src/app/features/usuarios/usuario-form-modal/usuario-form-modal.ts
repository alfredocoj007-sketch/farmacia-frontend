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
import { RolItem, UsuarioItem } from '../../../core/models/usuario.models';
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
    }
  }

  protected alternarVisibilidadPassword(): void {
    this.mostrarPassword.update((v) => !v);
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
        rolId: Number(this.rolId()),
        sucursalId: Number(this.sucursalId()),
        estado: this.estado(),
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
      const confirmado = await this.confirmService.confirm({
        title: '¿Registrar nuevo usuario?',
        message: `¿Deseas dar de alta al usuario "${this.username().trim().toLowerCase()}" con acceso al sistema?`,
        confirmText: 'Sí, Crear Usuario',
        cancelText: 'Cancelar',
        tipo: 'primary',
      });
      if (!confirmado) return;

      this.guardando.set(true);

      const payload = {
        username: this.username().trim().toLowerCase(),
        password: this.password().trim(),
        nombre: this.nombre().trim(),
        apellido: this.apellido().trim(),
        telefono: this.telefono().trim() || undefined,
        dpi: this.dpi().trim() || undefined,
        rolId: Number(this.rolId()),
        sucursalId: Number(this.sucursalId()),
      };

      this.usuariosService.crear(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.toastService.success('Nuevo usuario registrado con éxito.');
          this.guardado.emit();
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(
            err?.error?.message || 'Error al crear el usuario. Verifica que no exista un usuario con el mismo username.',
          );
        },
      });
    }
  }
}
