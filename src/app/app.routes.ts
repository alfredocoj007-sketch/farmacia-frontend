import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-list/productos-list').then((m) => m.ProductosList),
      },
      {
        path: 'productos/nuevo',
        loadComponent: () =>
          import('./features/productos/producto-form/producto-form').then((m) => m.ProductoForm),
        canActivate: [roleGuard('ADMIN')],
      },
      {
        path: 'productos/:id/editar',
        loadComponent: () =>
          import('./features/productos/producto-form/producto-form').then((m) => m.ProductoForm),
        canActivate: [roleGuard('ADMIN')],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
