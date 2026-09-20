import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  protected readonly confirmService = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.confirmService.active()) {
      this.confirmService.handleCancel();
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  protected onEnter(event: Event): void {
    if (this.confirmService.active()) {
      event.preventDefault();
      this.confirmService.handleConfirm();
    }
  }
}
