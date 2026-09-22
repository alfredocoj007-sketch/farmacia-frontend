import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastHost } from './shared/toast/toast-host/toast-host';
import { ConfirmDialog } from './shared/confirm/confirm-dialog';

@Component({
  imports: [RouterOutlet, ToastHost, ConfirmDialog],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
