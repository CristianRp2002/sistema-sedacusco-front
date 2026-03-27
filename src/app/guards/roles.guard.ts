import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const rolesGuard = (rolesPermitidos: string[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const userStr = localStorage.getItem('user');
    if (!userStr) { router.navigate(['/login']); return false; }

    const user = JSON.parse(userStr);
    const rolUsuario = user?.rol?.nombre;

    if (rolesPermitidos.includes(rolUsuario)) return true;

    router.navigate(['/inicio']);
    return false;
  };
};