import { Component, HostListener, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Input() maxWidthClass = 'max-w-2xl';
  @Output() cerrar = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.cerrar.emit();
  }

  protected onBackdropClick(): void {
    this.cerrar.emit();
  }
}
