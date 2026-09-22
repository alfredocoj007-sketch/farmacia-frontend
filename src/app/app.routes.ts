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
        canActivate: [roleGuard('ADMIN', 'VENDEDOR', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'productos',
        canActivate: [roleGuard('ADMIN', 'VENDEDOR', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () =>
          import('./features/productos/productos-list/productos-list').then((m) => m.ProductosList),
      },
      {
        path: 'lotes',
        canActivate: [roleGuard('ADMIN', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () => import('./features/lotes/lotes-list/lotes-list').then((m) => m.LotesList),
      },
      {
        path: 'lotes/kardex-general',
        canActivate: [roleGuard('ADMIN', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () =>
          import('./features/lotes/kardex-general/kardex-general').then((m) => m.KardexGeneral),
      },
      {
        path: 'lotes/:id',
        canActivate: [roleGuard('ADMIN', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () => import('./features/lotes/lote-kardex/lote-kardex').then((m) => m.LoteKardex),
      },
      {
        path: 'transferencias',
        canActivate: [roleGuard('ADMIN', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () =>
          import(
            './features/transferencias/transferencias-list/transferencias-list'
          ).then((m) => m.TransferenciasList),
      },
      {
        path: 'cajas',
        canActivate: [roleGuard('ADMIN', 'VENDEDOR', 'GERENTE')],
        loadComponent: () =>
          import('./features/cajas/cajas-list/cajas-list').then((m) => m.CajasList),
      },
      {
        path: 'ventas',
        canActivate: [roleGuard('ADMIN', 'VENDEDOR', 'GERENTE')],
        loadComponent: () =>
          import('./features/ventas/ventas').then((m) => m.Ventas),
      },
      {
        path: 'activos-fijos',
        canActivate: [roleGuard('ADMIN', 'FARMACEUTICO', 'GERENTE')],
        loadComponent: () =>
          import('./features/activos-fijos/activos-list/activos-list').then((m) => m.ActivosList),
      },
      {
        path: 'call-center',
        canActivate: [roleGuard('ADMIN', 'VENDEDOR', 'GERENTE')],
        loadComponent: () =>
          import('./features/call-center/pedidos-list/pedidos-list').then((m) => m.PedidosList),
      },
      {
        path: 'planillas',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/planillas/planillas-list/planillas-list').then((m) => m.PlanillasList),
      },
      {
        path: 'auditoria',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/auditoria/auditoria-list/auditoria-list').then((m) => m.AuditoriaList),
      },
      {
        path: 'sucursales',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/sucursales/sucursales-list/sucursales-list').then((m) => m.SucursalesList),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () =>
          import('./features/usuarios/usuarios-list/usuarios-list').then((m) => m.UsuariosList),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
