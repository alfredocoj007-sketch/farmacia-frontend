import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticatedUser, LoginRequest, LoginResponse } from '../models/auth.models';

const TOKEN_KEY = 'farmacia_token';
const USUARIO_KEY = 'farmacia_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuario = signal<LoginResponse['usuario'] | null>(this.leerUsuarioGuardado());
  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly currentUser = this.usuario.asReadonly();
  readonly isAuthenticated = computed(() => this.token() !== null);

  constructor(private readonly http: HttpClient) {}

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credenciales).pipe(
      tap((respuesta) => {
        localStorage.setItem(TOKEN_KEY, respuesta.accessToken);
        localStorage.setItem(USUARIO_KEY, JSON.stringify(respuesta.usuario));
        this.token.set(respuesta.accessToken);
        this.usuario.set(respuesta.usuario);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.token.set(null);
    this.usuario.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  obtenerPerfil(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(`${environment.apiUrl}/auth/perfil`);
  }

  private leerUsuarioGuardado(): LoginResponse['usuario'] | null {
    const guardado = localStorage.getItem(USUARIO_KEY);
    return guardado ? JSON.parse(guardado) : null;
  }
}
