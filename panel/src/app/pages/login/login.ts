import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';

  errorMsg = signal('');
  cargando = signal(false);

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onSubmit() {
    this.errorMsg.set('');
    this.cargando.set(true);

    try {
      const { error } = await this.supabaseService.login(this.email, this.password);

      if (error) {
        this.errorMsg.set('Email o contraseña incorrectos');
        return;
      }

      this.router.navigate(['/dashboard']);
    } catch (e) {
      this.errorMsg.set('Ocurrió un error al intentar ingresar');
      console.error(e);
    } finally {
      this.cargando.set(false);
    }
  }
}