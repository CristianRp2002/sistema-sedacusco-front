import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { Inicio } from './pages/inicio/inicio';
import { Usuarios } from './pages/usuarios/usuarios';
import { Estaciones } from './pages/estaciones/estaciones';
import { Partes } from './pages/partes/partes';
import { Reportes } from './pages/reportes/reportes';
import { NuevoParte } from './pages/nuevo-parte/nuevo-parte';
import { TiposActivo } from './pages/tipos-activo/tipos-activo';
import { rolesGuard } from './guards/roles.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      // Todos los roles
      { path: 'inicio',      component: Inicio },
      { path: 'partes',      component: Partes },
      { path: 'nuevo-parte', component: NuevoParte },
      { path: 'reportes',    component: Reportes },

      // Solo ADMIN y JEFE
      { path: 'usuarios',     component: Usuarios,    canActivate: [rolesGuard(['ADMIN', 'JEFE'])] },
      { path: 'estaciones',   component: Estaciones,  canActivate: [rolesGuard(['ADMIN', 'JEFE'])] },
      { path: 'tipos-activo', component: TiposActivo, canActivate: [rolesGuard(['ADMIN', 'JEFE'])] },

      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  }
];