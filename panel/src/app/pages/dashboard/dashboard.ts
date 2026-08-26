import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
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
      Swal.fire('Error', 'No se pudieron cargar los números', 'error');
    } else {
      this.numeros.set(data as WhatsappNumber[]);
    }
    this.cargando.set(false);
  }

  async agregarNumero() {
    this.errorMsg.set('');

    const nombreLimpio = this.nuevoNombre.trim();
    const numeroLimpio = this.nuevoNumero.trim().replace(/\D/g, '');

    if (!nombreLimpio) {
      this.errorMsg.set('El nombre no puede estar vacío');
      return;
    }

    if (!numeroLimpio) {
      this.errorMsg.set('Ingresá un número válido (solo números)');
      return;
    }

    if (numeroLimpio.length < 10 || numeroLimpio.length > 11) {
      this.errorMsg.set('El número debe tener 10 u 11 dígitos, ej: 1136473783');
      return;
    }

    const numeroCompleto = '549' + numeroLimpio;

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
      Swal.fire('Error', 'No se pudo guardar el número', 'error');
    } else {
      this.nuevoNumero = '';
      this.nuevoNombre = '';
      await this.cargarNumeros();
      Swal.fire({
        icon: 'success',
        title: 'Número agregado',
        timer: 1200,
        showConfirmButton: false
      });
    }
    this.cargando.set(false);
  }

  async eliminarNumero(id: string) {
    const resultado = await Swal.fire({
      title: '¿Eliminar número?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!resultado.isConfirmed) return;

    this.cargando.set(true);
    const { error } = await this.supabaseService.eliminarNumero(id);

    if (error) {
      Swal.fire('Error', 'No se pudo eliminar el número', 'error');
    } else {
      await this.cargarNumeros();
      Swal.fire({
        icon: 'success',
        title: 'Eliminado',
        timer: 1000,
        showConfirmButton: false
      });
    }
    this.cargando.set(false);
  }

  async toggleActivo(numero: WhatsappNumber) {
    this.cargando.set(true);
    const { error } = await this.supabaseService.actualizarNumero(numero.id, { activo: !numero.activo });

    if (error) {
      Swal.fire('Error', 'No se pudo actualizar el número', 'error');
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