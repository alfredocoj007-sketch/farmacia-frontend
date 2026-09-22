import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

const ROLE_ALIASES: Record<string, string[]> = {
  ADMIN: ['ADMIN'],
  GERENTE: ['GERENTE', 'VENDEDOR', 'CAJERO', 'FARMACEUTICO', 'BODEGA'],
  VENDEDOR: ['VENDEDOR', 'CAJERO'],
  CAJERO: ['CAJERO', 'VENDEDOR'],
  FARMACEUTICO: ['FARMACEUTICO', 'BODEGA'],
  BODEGA: ['BODEGA', 'FARMACEUTICO'],
};

export function roleGuard(...rolesPermitidos: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const toastService = inject(ToastService);
    const usuario = authService.currentUser();

    if (usuario && usuario.rol) {
      const userRole = usuario.rol.toUpperCase();
      const aliases = ROLE_ALIASES[userRole] || [userRole];
      const hasAccess = rolesPermitidos.some((r) => {
        const target = r.toUpperCase();
        return userRole === target || aliases.includes(target);
      });

      if (hasAccess) {
        return true;
      }
    }

    toastService.warning(
      'Acceso Denegado',
      `El rol "${usuario?.rol || 'Sin Rol'}" no tiene autorización para acceder a ese módulo.`,
    );

    router.navigate(['/dashboard']);
    return false;
  };
}
