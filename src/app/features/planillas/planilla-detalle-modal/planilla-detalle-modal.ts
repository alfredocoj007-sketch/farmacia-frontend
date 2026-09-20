import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, SlicePipe } from '@angular/common';
import { PlanillaCompleta, PlanillaDetalle } from '../../../core/models/planilla.models';
import { PlanillasService } from '../../../core/services/planillas.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-planilla-detalle-modal',
  imports: [FormsModule, SlicePipe, DatePipe],
  templateUrl: './planilla-detalle-modal.html',
})
export class PlanillaDetalleModal implements OnInit {
  private readonly planillasService = inject(PlanillasService);
  private readonly toastService = inject(ToastService);

  @Input({ required: true }) planillaId!: number;
  @Output() cerrar = new EventEmitter<void>();
  @Output() planillaActualizada = new EventEmitter<PlanillaCompleta>();

  protected readonly planilla = signal<PlanillaCompleta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  // Edición rápida de línea con calculadora de Horas Extras según Código de Trabajo
  protected detalleEnEdicion = signal<PlanillaDetalle | null>(null);
  protected editHorasExtra = 0;
  protected cantidadHorasExtra = 0;
  protected valorHoraNormal = 0;
  protected valorHoraExtra = 0;
  protected sueldoBaseMensualCalculado = 0;
  protected editBonificaciones = 250;

  ngOnInit(): void {
    this.cargarPlanilla();
  }

  protected esPlanillaQuincenal(): boolean {
    const p = this.planilla();
    if (!p) return false;
    if (p.esQuincenal !== undefined) return p.esQuincenal;
    const diffMs = Math.abs(new Date(p.fechaFin).getTime() - new Date(p.fechaInicio).getTime());
    const diasCiclo = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diasCiclo <= 16;
  }

  protected cargarPlanilla(): void {
    this.cargando.set(true);
    this.planillasService.obtenerPlanillaPorId(this.planillaId).subscribe({
      next: (res) => {
        this.planilla.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error al cargar la planilla.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirEdicionDetalle(d: PlanillaDetalle): void {
    this.detalleEnEdicion.set(d);
    this.editHorasExtra = d.horasExtra;
    this.editBonificaciones = d.bonificaciones;

    // Regla del Código de Trabajo de Guatemala:
    // Base de cálculo = Salario Mensual Completo / 240 horas (30 días x 8 horas).
    // Si la planilla es Quincenal (<= 16 días), el salario base pagado en la fila es el de la quincena (50%),
    // por lo que el salario mensual completo para la fórmula legal de las 240 horas es d.salarioBase * 2.
    const esQuincena = this.esPlanillaQuincenal();
    const sueldoBaseMensual = d.salarioMensual || (esQuincena ? d.salarioBase * 2 : d.salarioBase);
    this.sueldoBaseMensualCalculado = Number(sueldoBaseMensual.toFixed(2));

    this.valorHoraNormal = Number((sueldoBaseMensual / 240).toFixed(2));
    // Recargo legal del 50% (factor 1.5):
    this.valorHoraExtra = Number((this.valorHoraNormal * 1.5).toFixed(2));

    this.cantidadHorasExtra =
      this.valorHoraExtra > 0 ? Number((d.horasExtra / this.valorHoraExtra).toFixed(1)) : 0;
  }

  protected onCantidadHorasChange(): void {
    this.editHorasExtra = Number((this.cantidadHorasExtra * this.valorHoraExtra).toFixed(2));
  }

  protected onMontoHorasChange(): void {
    if (this.valorHoraExtra > 0) {
      this.cantidadHorasExtra = Number((this.editHorasExtra / this.valorHoraExtra).toFixed(1));
    }
  }

  protected cancelarEdicionDetalle(): void {
    this.detalleEnEdicion.set(null);
  }

  protected guardarEdicionDetalle(): void {
    const d = this.detalleEnEdicion();
    if (!d) return;

    this.procesando.set(true);
    this.planillasService
      .actualizarDetallePlanilla(this.planillaId, d.planillaDetalleId, {
        horasExtra: Number(this.editHorasExtra),
        bonificaciones: Number(this.editBonificaciones),
      })
      .subscribe({
        next: (res) => {
          this.planilla.set(res);
          this.detalleEnEdicion.set(null);
          this.procesando.set(false);
          this.toastService.info(
            '¡Línea Actualizada!',
            'Se recalcularon las horas extras, bonificaciones e IGSS del colaborador.',
          );
          this.planillaActualizada.emit(res);
        },
        error: (err) => {
          this.procesando.set(false);
          const msg = err.error?.message || 'Error al actualizar el detalle salarial.';
          this.error.set(msg);
          this.toastService.error('Error al Actualizar Línea', msg);
        },
      });
  }

  protected readonly modalConfirmacionVisible = signal(false);

  protected cuentaOrigenSeleccionada = 'Banco Industrial - Monetaria No. 004-102938-1';
  protected metodoPagoSeleccionado = 'TRANSFERENCIA_BANCARIA';

  protected readonly opcionesOrigenFondos = [
    {
      id: 'bi',
      label: 'Banco Industrial - Monetaria No. 004-102938-1',
      tipo: 'Cuenta Bancaria Monetaria',
      icono: '🏦',
      cuenta: 'Banco Industrial - Monetaria No. 004-102938-1',
      metodo: 'TRANSFERENCIA_BANCARIA',
    },
    {
      id: 'banrural',
      label: 'Banrural - Monetaria No. 302-847291-5',
      tipo: 'Cuenta Bancaria Monetaria',
      icono: '🏦',
      cuenta: 'Banrural - Monetaria No. 302-847291-5',
      metodo: 'TRANSFERENCIA_BANCARIA',
    },
    {
      id: 'bac',
      label: 'BAC Credomatic - Monetaria No. 901-582014-2',
      tipo: 'Cuenta Bancaria Monetaria',
      icono: '🏦',
      cuenta: 'BAC Credomatic - Monetaria No. 901-582014-2',
      metodo: 'TRANSFERENCIA_BANCARIA',
    },
    {
      id: 'caja',
      label: 'Caja General / Fondos en Efectivo',
      tipo: 'Efectivo Central de Farmacia',
      icono: '💵',
      cuenta: 'Caja General / Efectivo de Farmacia',
      metodo: 'EFECTIVO',
    },
  ];

  protected seleccionarOrigenFondos(cuenta: string, metodo: string): void {
    this.cuentaOrigenSeleccionada = cuenta;
    this.metodoPagoSeleccionado = metodo;
  }

  protected abrirConfirmacionPago(): void {
    this.modalConfirmacionVisible.set(true);
  }

  protected cancelarConfirmacionPago(): void {
    this.modalConfirmacionVisible.set(false);
  }

  protected ejecutarPagoPlanilla(): void {
    this.procesando.set(true);
    this.planillasService
      .pagarPlanilla(this.planillaId, {
        cuentaOrigen: this.cuentaOrigenSeleccionada,
        metodoPago: this.metodoPagoSeleccionado,
      })
      .subscribe({
        next: (res) => {
          this.planilla.set(res);
          this.modalConfirmacionVisible.set(false);
          this.procesando.set(false);
          this.toastService.success(
            '¡Planilla Pagada!',
            `La planilla #${this.planillaId} ha sido liquidada desde ${this.cuentaOrigenSeleccionada}.`,
          );
          this.planillaActualizada.emit(res);
        },
        error: (err) => {
          this.procesando.set(false);
          const msg = err.error?.message || 'Error al procesar el pago de la planilla.';
          this.error.set(msg);
          this.toastService.error('Error al Pagar Planilla', msg);
        },
      });
  }

  protected readonly generandoPdf = signal(false);

  protected imprimirNomina(): void {
    this.descargarBoletasPdf();
  }

  protected descargarBoletasPdf(): void {
    this.generandoPdf.set(true);
    this.toastService.info(
      'Generando Boletas PDF',
      'Generando boletas oficiales de nómina según Código de Trabajo...',
    );

    this.planillasService.descargarBoletasPlanillaPdf(this.planillaId).subscribe({
      next: (blob) => {
        this.generandoPdf.set(false);
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
        this.toastService.success(
          '¡Boletas Generadas!',
          'El archivo PDF de boletas de pago se abrió correctamente.',
        );
      },
      error: (err) => {
        this.generandoPdf.set(false);
        const msg = err.error?.message || 'Error al generar las boletas de pago en PDF.';
        this.toastService.error('Error en Boletas PDF', msg);
      },
    });
  }

  protected descargarBoletaIndividual(d: PlanillaDetalle): void {
    this.toastService.info(
      'Generando Boleta Individual',
      `Preparando boleta de pago para ${d.nombreEmpleado}...`,
    );

    this.planillasService
      .descargarBoletaIndividualPdf(this.planillaId, d.planillaDetalleId)
      .subscribe({
        next: (blob) => {
          const fileURL = URL.createObjectURL(blob);
          window.open(fileURL, '_blank');
          this.toastService.success(
            '¡Boleta Generada!',
            `Boleta de pago de ${d.nombreEmpleado} abierta exitosamente.`,
          );
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al generar la boleta individual en PDF.';
          this.toastService.error('Error en Boleta Individual', msg);
        },
      });
  }

  protected exportarReporteGeneral(): void {
    const p = this.planilla();
    if (!p || !p.detalles || p.detalles.length === 0) {
      this.toastService.warning('Sin Datos', 'No hay detalles de colaboradores para exportar.');
      return;
    }

    const headers = [
      'Folio Detalle',
      'Colaborador',
      'DPI / CUI',
      'Puesto Laboral',
      'Sucursal Asignada',
      'Salario Base (Q)',
      'Bonificaciones (Q)',
      'Horas Extra (Q)',
      'Retención IGSS 4.83% (Q)',
      'Líquido a Pagar (Q)',
    ];

    const rows = p.detalles.map((d) => [
      d.planillaDetalleId,
      `"${d.nombreEmpleado}"`,
      `"${d.dpi}"`,
      `"${d.puestoNombre}"`,
      `"${d.sucursalNombre}"`,
      d.salarioBase.toFixed(2),
      d.bonificaciones.toFixed(2),
      d.horasExtra.toFixed(2),
      d.descuentos.toFixed(2),
      d.totalPagar.toFixed(2),
    ]);

    const csvContent =
      '\uFEFF' +
      [
        `REPORTE OFICIAL DE NÓMINA - PLANILLA #${p.planillaId}`,
        `Período: ${p.fechaInicio?.substring(0, 10)} al ${p.fechaFin?.substring(0, 10)}`,
        `Estado: ${p.estado} - Fecha de Pago: ${p.fechaPago ? p.fechaPago.substring(0, 10) : 'Pendiente'}`,
        `Total Masa Bruta: Q ${p.totalBruto.toFixed(2)} | Retenciones IGSS: Q ${p.totalDescuentos.toFixed(2)} | Total Neto a Pagar: Q ${p.totalNeto.toFixed(2)}`,
        '',
        headers.join(';'),
        ...rows.map((r) => r.join(';')),
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Planilla_${p.planillaId}_${p.fechaInicio?.substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.toastService.success(
      '¡Reporte Exportado!',
      'El reporte de nómina en formato Excel/CSV para contabilidad e IGSS se generó con éxito.',
    );
  }
}
