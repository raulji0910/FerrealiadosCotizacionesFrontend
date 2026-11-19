import { Rol } from './usuario.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  nombre: string;
  email: string;
  // Todos los roles del usuario (multirol). 'rol' es el principal: lo traían las sesiones viejas.
  roles: Rol[];
  rol?: Rol;
}
