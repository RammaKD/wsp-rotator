import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

interface WhatsappNumber {
  id: string;
  numero: string;
  nombre: string | null;
  orden: number;
  activo: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  numeros = signal<WhatsappNumber[]>([]);
  nuevoNumero = '';
  nuevoNombre = '';
  cargando = signal(false);
  errorMsg = signal('');

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.cargarNumeros();
  }

  async cargarNumeros() {
    this.cargando.set(true);
    const { data, error } = await this.supabaseService.getNumeros();

    if (error) {
      this.errorMsg.set('Error al cargar los números');
    } else {
      this.numeros.set(data as WhatsappNumber[]);
    }
    this.cargando.set(false);
  }

  async agregarNumero() {
    this.errorMsg.set('');

    const nombreLimpio = this.nuevoNombre.trim();
    const numeroLimpio = this.nuevoNumero.trim().replace(/\D/g, '');

    // Validación: nombre vacío
    if (!nombreLimpio) {
      this.errorMsg.set('El nombre no puede estar vacío');
      return;
    }

    // Validación: número vacío después de limpiar
    if (!numeroLimpio) {
      this.errorMsg.set('Ingresá un número válido (solo números)');
      return;
    }

    // Validación: longitud esperada (código de área + número, sin 54 ni 9)
    // Números argentinos: entre 10 y 11 dígitos según el área (ej: 1136473783 = 10 dígitos)
    if (numeroLimpio.length < 10 || numeroLimpio.length > 11) {
      this.errorMsg.set('El número debe tener 10 u 11 dígitos (sin 54 ni 9), ej: 1136473783');
      return;
    }

    const numeroCompleto = '549' + numeroLimpio;

    // Validación: número duplicado
    const yaExiste = this.numeros().some(n => n.numero === numeroCompleto);
    if (yaExiste) {
      this.errorMsg.set('Ese número ya está cargado en la rotación');
      return;
    }

    const siguienteOrden = this.numeros().length > 0
      ? Math.max(...this.numeros().map(n => n.orden)) + 1
      : 1;

    this.cargando.set(true);
    const { error } = await this.supabaseService.agregarNumero(
      numeroCompleto,
      siguienteOrden,
      nombreLimpio
    );

    if (error) {
      this.errorMsg.set('Error al guardar en la base de datos. Intentá de nuevo.');
    } else {
      this.nuevoNumero = '';
      this.nuevoNombre = '';
      await this.cargarNumeros();
    }
    this.cargando.set(false);
  }

  async eliminarNumero(id: string) {
    const confirmar = confirm('¿Seguro que querés eliminar este número de la rotación?');
    if (!confirmar) return;

    this.cargando.set(true);
    const { error } = await this.supabaseService.eliminarNumero(id);

    if (error) {
      this.errorMsg.set('Error al eliminar el número');
    } else {
      await this.cargarNumeros();
    }
    this.cargando.set(false);
  }

  async toggleActivo(numero: WhatsappNumber) {
    this.cargando.set(true);
    const { error } = await this.supabaseService.actualizarNumero(numero.id, { activo: !numero.activo });

    if (error) {
      this.errorMsg.set('Error al actualizar el número');
    } else {
      await this.cargarNumeros();
    }
    this.cargando.set(false);
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }
}