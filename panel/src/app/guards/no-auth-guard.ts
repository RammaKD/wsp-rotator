import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';

export const noAuthGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const session = await supabaseService.getSession();

  if (session) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};