import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout';
import { Inicio } from './pages/inicio/inicio';
import { Usuarios } from './pages/usuarios/usuarios';
import { Estaciones } from './pages/estaciones/estaciones';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: 'inicio', component: Inicio },
      { path: 'usuarios', component: Usuarios},
      { path: 'estaciones', component: Estaciones },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  }
];