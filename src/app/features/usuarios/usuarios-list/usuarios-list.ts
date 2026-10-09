import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { SucursalesService } from '../../../core/services/sucursales.service';
import { ConfirmService } from '../../../shared/confirm/confirm.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { Modal } from '../../../shared/modal/modal';
import { UsuarioFormModal } from '../usuario-form-modal/usuario-form-modal';
import { RolItem, UsuarioItem } from '../../../core/models/usuario.models';
import { SucursalRed } from '../../../core/models/sucursal.models';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, UsuarioFormModal],
  templateUrl: './usuarios-list.html',
  styleUrl: './usuarios-list.scss',
})
export class UsuariosList implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly sucursalesService = inject(SucursalesService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toastService = inject(ToastService);

  protected readonly usuarios = signal<UsuarioItem[]>([]);
  protected readonly roles = signal<RolItem[]>([]);
  protected readonly sucursales = signal<SucursalRed[]>([]);
  protected readonly cargando = signal(true);

  // Filtros reactivos
  protected readonly busqueda = signal<string>('');
  protected readonly filtroRolId = signal<string>('');
  protected readonly filtroSucursalId = signal<string>('');
  protected readonly filtroEstado = signal<string>('');

  // Modales
  protected readonly modalAbierto = signal(false);
  protected readonly usuarioSeleccionado = signal<UsuarioItem | null>(null);

  // KPIs
  protected readonly totalUsuarios = computed(() => this.usuarios().length);
  protected readonly totalActivos = computed(
    () => this.usuarios().filter((u) => u.estado === 'ACTIVO').length,
  );
  protected readonly totalAdmins = computed(
    () => this.usuarios().filter((u) => u.rol?.nombre === 'ADMIN').length,
  );
  protected readonly totalSucursalesConPersonal = computed(() => {
    const ids = new Set(
      this.usuarios()
        .map((u) => u.empleado?.sucursal?.sucursalId)
        .filter((id): id is number => id !== null && id !== undefined),
    );
    return ids.size;
  });

  // Lista filtrada en tiempo real
  protected readonly usuariosFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const rol = this.filtroRolId();
    const suc = this.filtroSucursalId();
    const est = this.filtroEstado();

    return this.usuarios().filter((u) => {
      if (rol && String(u.rol?.rolId) !== rol) return false;
      if (suc && String(u.empleado?.sucursal?.sucursalId) !== suc) return false;
      if (est && u.estado !== est) return false;

      if (!q) return true;

      const userMatch = u.username?.toLowerCase().includes(q);
      const nombreMatch = u.empleado?.nombre?.toLowerCase().includes(q);
      const apellidoMatch = u.empleado?.apellido?.toLowerCase().includes(q);
      const rolMatch = u.rol?.nombre?.toLowerCase().includes(q);
      const sucMatch = u.empleado?.sucursal?.nombre?.toLowerCase().includes(q);

      return userMatch || nombreMatch || apellidoMatch || rolMatch || sucMatch;
    });
  });

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarUsuarios();
  }

  protected cargarCatalogos(): void {
    this.usuariosService.listarRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.toastService.error('Error al cargar catálogo de roles.'),
    });

    this.sucursalesService.findAll().subscribe({
      next: (sucursales) => this.sucursales.set(sucursales),
      error: () => this.toastService.error('Error al cargar red de sucursales.'),
    });
  }

  protected cargarUsuarios(): void {
    this.cargando.set(true);
    this.usuariosService.findAll().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toastService.error('Error al consultar lista de usuarios.');
      },
    });
  }

  protected abrirModalCrear(): void {
    this.usuarioSeleccionado.set(null);
    this.modalAbierto.set(true);
  }

  protected abrirModalEditar(usuario: UsuarioItem): void {
    this.usuarioSeleccionado.set(usuario);
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.usuarioSeleccionado.set(null);
  }

  protected onGuardado(): void {
    this.cerrarModal();
    this.cargarUsuarios();
  }

  protected esUsuarioProtegido(usuario: UsuarioItem): boolean {
    return usuario.username?.trim().toLowerCase() === 'admin';
  }

  protected async cambiarEstadoUsuario(usuario: UsuarioItem): Promise<void> {
    if (this.esUsuarioProtegido(usuario)) {
      this.toastService.warning(
        'El usuario Administrador Principal (admin) está protegido y no puede ser desactivado.',
      );
      return;
    }

    const nuevoEstado = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const esDesactivar = nuevoEstado === 'INACTIVO';

    const confirmado = await this.confirmService.confirm({
      title: esDesactivar
        ? '¿Desactivar acceso de usuario?'
        : '¿Reactivar acceso de usuario?',
      message: esDesactivar
        ? `¿Confirmas suspender el acceso de "${usuario.username}" (${usuario.empleado ? usuario.empleado.nombre + ' ' + usuario.empleado.apellido : 'Sin nombre'})? No podrá iniciar sesión en la plataforma.`
        : `¿Confirmas reactivar la cuenta de "${usuario.username}"? El colaborador podrá volver a ingresar al sistema.`,
      confirmText: esDesactivar ? 'Sí, Desactivar' : 'Sí, Activar',
      cancelText: 'Cancelar',
      tipo: esDesactivar ? 'danger' : 'primary',
    });

    if (!confirmado) return;

    this.usuariosService
      .cambiarEstado(usuario.credencialId, nuevoEstado as 'ACTIVO' | 'INACTIVO')
      .subscribe({
        next: () => {
          this.toastService.success(
            `Usuario ${esDesactivar ? 'desactivado' : 'reactivado'} con éxito.`,
          );
          this.cargarUsuarios();
        },
        error: (err) => {
          this.toastService.error(
            err?.error?.message || 'No se pudo cambiar el estado del usuario.',
          );
        },
      });
  }

  protected badgeRolClass(rolNombre?: string): string {
    const rol = (rolNombre || '').toUpperCase();
    if (rol.includes('ADMIN')) {
      return 'bg-violet-50 text-violet-700 border-violet-200';
    }
    if (rol.includes('VENDEDOR') || rol.includes('CAJERO')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (rol.includes('FARMACEUTICO')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  }

  protected formatearFecha(fechaStr: string | Date | null | undefined): string {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return String(fechaStr);
    return d.toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
