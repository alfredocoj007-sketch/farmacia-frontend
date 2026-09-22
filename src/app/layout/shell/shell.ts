import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menuMovil = viewChild<ElementRef<HTMLElement>>('menuMovil');

  protected readonly usuario = this.authService.currentUser;
  protected readonly menuMovilAbierto = signal(false);

  // Permisos de roles para navegación reactiva
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');
  protected readonly esVendedor = computed(() =>
    ['VENDEDOR', 'CAJERO'].includes(this.usuario()?.rol ?? ''),
  );
  protected readonly esFarmaceutico = computed(() =>
    ['FARMACEUTICO', 'BODEGA'].includes(this.usuario()?.rol ?? ''),
  );
  protected readonly esGerente = computed(() => this.usuario()?.rol === 'GERENTE');

  protected readonly puedeVerLotes = computed(
    () => this.esAdmin() || this.esFarmaceutico() || this.esGerente(),
  );
  protected readonly puedeVerTransferencias = computed(
    () => this.esAdmin() || this.esFarmaceutico() || this.esGerente(),
  );
  protected readonly puedeVerCajas = computed(
    () => this.esAdmin() || this.esVendedor() || this.esGerente(),
  );
  protected readonly puedeVerVentas = computed(
    () => this.esAdmin() || this.esVendedor() || this.esGerente(),
  );
  protected readonly puedeVerActivos = computed(
    () => this.esAdmin() || this.esFarmaceutico() || this.esGerente(),
  );
  protected readonly puedeVerCallCenter = computed(
    () => this.esAdmin() || this.esVendedor() || this.esGerente(),
  );
  protected readonly puedeVerPlanillas = computed(() => this.esAdmin());
  protected readonly puedeVerAuditoria = computed(() => this.esAdmin());
  protected readonly puedeVerSucursales = computed(() => this.esAdmin());
  protected readonly puedeVerUsuarios = computed(() => this.esAdmin());

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuMovilAbierto()) return;
    const contenedor = this.menuMovil()?.nativeElement;
    if (contenedor && !contenedor.contains(event.target as Node)) {
      this.menuMovilAbierto.set(false);
    }
  }

  protected alternarMenuMovil(): void {
    this.menuMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  protected cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
