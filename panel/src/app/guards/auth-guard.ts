import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const session = await supabaseService.getSession();

  if (session) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};