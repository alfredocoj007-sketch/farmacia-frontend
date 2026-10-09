import { Component, ElementRef, HostListener, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TransferenciasService } from '../../core/services/transferencias.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly transferenciasService = inject(TransferenciasService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly menuMovil = viewChild<ElementRef<HTMLElement>>('menuMovil');
  private intervaloNotificaciones: any = null;

  // Estado para detección de nuevos eventos en tiempo real
  private ultimoDespachoNotificadoId: number | null = null;
  private conteoRecepcionAnterior = 0;
  private ultimaSolicitudNotificadaId: number | null = null;
  private conteoDespachoAnterior = 0;
  private ultimaCancelacionNotificadaId: number | null = null;
  private primeraCarga = true;

  protected readonly usuario = this.authService.currentUser;
  protected readonly menuMovilAbierto = signal(false);
  protected readonly horaGuatemala = signal<string>('');
  private relojIntervalo: any = null;

  // Badge reactivo de notificaciones de transferencias
  protected readonly badgeTransferencias = this.transferenciasService.conteoBadge;
  protected readonly infoBadgeTransferencias = this.transferenciasService.infoBadge;

  protected readonly tipoBadgeTransferencias = computed(
    () => this.infoBadgeTransferencias()?.tipoBadge ?? 'NINGUNO',
  );

  protected readonly tooltipBadgeTransferencias = computed(() => {
    const info = this.infoBadgeTransferencias();
    if (!info || info.conteoBadge === 0) return '';
    if (info.tipoBadge === 'DESPACHO') {
      return `${info.conteoBadge} solicitud(es) de reabastecimiento pendiente(s) de despachar`;
    } else {
      return `${info.conteoBadge} envío(s) en tránsito por recibir en tu sede`;
    }
  });

  private actualizarReloj(): void {
    const ahora = new Date();
    const formato = new Intl.DateTimeFormat('es-GT', {
      timeZone: 'America/Guatemala',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(ahora);
    this.horaGuatemala.set(formato);
  }

  ngOnInit(): void {
    this.actualizarReloj();
    this.relojIntervalo = setInterval(() => this.actualizarReloj(), 1000);

    this.consultarNotificaciones();
    // Sondeo ligero cada 25 segundos para alertar en tiempo real
    this.intervaloNotificaciones = setInterval(() => {
      if (this.usuario()) {
        this.consultarNotificaciones();
      } else {
        this.primeraCarga = true;
      }
    }, 25000);
  }

  ngOnDestroy(): void {
    if (this.relojIntervalo) {
      clearInterval(this.relojIntervalo);
      this.relojIntervalo = null;
    }
    if (this.intervaloNotificaciones) {
      clearInterval(this.intervaloNotificaciones);
      this.intervaloNotificaciones = null;
    }
  }

  private consultarNotificaciones(): void {
    this.transferenciasService.actualizarConteoPendientes().subscribe({
      next: (info) => {
        if (!this.primeraCarga) {
          // Notificación para la SUCURSAL cuando Bodega Central aprueba y despacha
          if (info.tipoBadge === 'RECEPCION' && info.ultimoDespacho) {
            const esNuevoDespacho =
              this.ultimoDespachoNotificadoId !== null &&
              info.ultimoDespacho.transferenciaId !== this.ultimoDespachoNotificadoId;
            const incrementoConteo = info.pendientesRecepcion > this.conteoRecepcionAnterior;

            if (esNuevoDespacho || incrementoConteo) {
              this.reproducirSonidoNotificacion();
              const origen = info.ultimoDespacho.origenNombre
                ? ` desde ${info.ultimoDespacho.origenNombre}`
                : '';
              this.toastService.info(
                '🚀 ¡Solicitud Aprobada y en Camino!',
                `Bodega Central autorizó el envío #TRF-${info.ultimoDespacho.transferenciaId}${origen}. Los medicamentos ya vienen en camino hacia tu sede.`,
                9000,
              );
            }
          }

          // Notificación para BODEGA CENTRAL / ADMIN cuando una sucursal solicita
          if (info.tipoBadge === 'DESPACHO' && info.ultimaSolicitud) {
            const esNuevaSolicitud =
              this.ultimaSolicitudNotificadaId !== null &&
              info.ultimaSolicitud.transferenciaId !== this.ultimaSolicitudNotificadaId;
            const incrementoConteo = info.pendientesDespacho > this.conteoDespachoAnterior;

            if (esNuevaSolicitud || incrementoConteo) {
              this.reproducirSonidoNotificacion();
              const origen = info.ultimaSolicitud.origenNombre
                ? ` (${info.ultimaSolicitud.origenNombre})`
                : '';
              this.toastService.warning(
                '📦 ¡Nueva Solicitud de Reabastecimiento!',
                `Se recibió la solicitud #TRF-${info.ultimaSolicitud.transferenciaId}${origen}. Pendiente de revisión y autorización.`,
                9000,
              );
            }
          }

          // Notificación para BODEGA CENTRAL / ADMIN cuando un envío es Rechazado o Cancelado por discrepancia
          const esAdminOBodega = info.tipoBadge === 'DESPACHO' || this.usuario()?.rol === 'ADMIN';
          if (esAdminOBodega && info.ultimaCancelacion) {
            const esNuevaCancelacion =
              this.ultimaCancelacionNotificadaId !== null &&
              info.ultimaCancelacion.transferenciaId !== this.ultimaCancelacionNotificadaId;

            if (esNuevaCancelacion) {
              this.reproducirSonidoNotificacion();
              const destino = info.ultimaCancelacion.destinoNombre
                ? ` por ${info.ultimaCancelacion.destinoNombre}`
                : '';
              this.toastService.error(
                '❌ ¡Envío Cancelado / Rechazado!',
                `El envío #TRF-${info.ultimaCancelacion.transferenciaId} fue cancelado${destino}. El stock fue reintegrado a Bodega Central automáticamente.`,
                9000,
              );
            }
          }
        }

        this.ultimoDespachoNotificadoId = info.ultimoDespacho?.transferenciaId ?? null;
        this.conteoRecepcionAnterior = info.pendientesRecepcion;
        this.ultimaSolicitudNotificadaId = info.ultimaSolicitud?.transferenciaId ?? null;
        this.conteoDespachoAnterior = info.pendientesDespacho;
        this.ultimaCancelacionNotificadaId = info.ultimaCancelacion?.transferenciaId ?? null;
        this.primeraCarga = false;
      },
      error: () => {},
    });
  }

  private reproducirSonidoNotificacion(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Silencioso si el navegador restringe el audio antes de interacción
    }
  }

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
  protected readonly puedeVerPlanillas = computed(
    () => this.esAdmin() || this.esGerente(),
  );
  protected readonly puedeVerAuditoria = computed(() => this.esAdmin());
  protected readonly puedeVerSucursales = computed(() => this.esAdmin());
  protected readonly puedeVerUsuarios = computed(() => this.esAdmin());
  protected readonly puedeVerReportes = computed(
    () => this.esAdmin() || this.esGerente() || this.esFarmaceutico(),
  );

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
