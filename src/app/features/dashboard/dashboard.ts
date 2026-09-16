import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthenticatedUser } from '../../core/models/auth.models';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly perfil = signal<AuthenticatedUser | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly usuario = this.authService.currentUser;

  ngOnInit(): void {
    this.authService.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el perfil.');
        this.cargando.set(false);
      },
    });
  }

  protected cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
