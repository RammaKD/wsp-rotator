import { Component, OnDestroy, OnInit, signal } from '@angular/core';
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
  clicks: number;
}

interface LastRotationStatus {
  numero: string;
  nombre: string | null;
  orden: number | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  numeros = signal<WhatsappNumber[]>([]);
  ultimoNumero = signal<LastRotationStatus | null>(null);
  nuevoNumero = '';
  nuevoNombre = '';
  cargando = signal(false);
  errorMsg = signal('');
  mensajeDefault = signal('');
  editandoMensaje = false;
  mensajeInput = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.supabaseService.subscribeToDashboardChanges(() => {
      this.cargarNumeros();
      this.cargarConfig();
      this.cargarUltimoNumero();
    });

    await this.cargarNumeros();
    await this.cargarConfig();
    await this.cargarUltimoNumero();
  }

  ngOnDestroy() {
    this.supabaseService.unsubscribeDashboardChanges();
  }

  formatearNumero(numero: string): string {
    const digits = numero.replace(/\D/g, '');

    if (!digits) {
      return numero;
    }

    if (digits.startsWith('54')) {
      const resto = digits.slice(2);

      if (resto.length >= 11) {
        const prefijo = resto.slice(0, 1);
        const codigoArea = resto.slice(1, 3);
        const local = resto.slice(3);

        if (local.length >= 8) {
          return `+54 ${prefijo} ${codigoArea} ${local.slice(0, 4)}-${local.slice(4)}`;
        }

        return `+54 ${prefijo} ${codigoArea} ${local}`;
      }

      return `+54 ${resto}`;
    }

    return `+${digits}`;
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

  async cargarConfig() {
    const { data, error } = await this.supabaseService.getConfig();
    if (!error && data) {
      this.mensajeDefault.set(data.mensaje_default || '');
      this.mensajeInput = data.mensaje_default || '';
    }

    const { data: ultimoNumeroUsado, error: ultimoNumeroError } = await this.supabaseService.getUltimoNumeroUsado();

    if (!ultimoNumeroError && ultimoNumeroUsado) {
      this.ultimoNumero.set({
        numero: ultimoNumeroUsado.numero,
        nombre: ultimoNumeroUsado.nombre ?? 'Sin nombre',
        orden: ultimoNumeroUsado.orden ?? null
      });
      return;
    }

    this.ultimoNumero.set(null);
  }

  async cargarUltimoNumero() {
    await this.cargarConfig();
  }

  async guardarMensaje() {
    if (!this.mensajeInput.trim()) {
      Swal.fire('Error', 'El mensaje no puede estar vacío', 'error');
      return;
    }

    this.cargando.set(true);
    const { error } = await this.supabaseService.actualizarMensaje(this.mensajeInput.trim());

    if (error) {
      Swal.fire('Error', 'No se pudo guardar el mensaje', 'error');
    } else {
      this.mensajeDefault.set(this.mensajeInput.trim());
      this.editandoMensaje = false;
      Swal.fire({ icon: 'success', title: 'Mensaje actualizado', timer: 1200, showConfirmButton: false });
    }
    this.cargando.set(false);
  }

  totalClicks() {
    return this.numeros().reduce((acc, n) => acc + (n.clicks || 0), 0);
  }

  async resetearEstadisticas() {
    const resultado = await Swal.fire({
      title: '¿Resetear estadísticas?',
      text: 'Todos los contadores de clics volverán a 0. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });

    if (!resultado.isConfirmed) return;

    this.cargando.set(true);
    const { error } = await this.supabaseService.resetearClicks();

    if (error) {
      Swal.fire('Error', 'No se pudieron resetear las estadísticas', 'error');
    } else {
      await this.cargarNumeros();
      Swal.fire({ icon: 'success', title: 'Estadísticas reseteadas', timer: 1200, showConfirmButton: false });
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

  async resetearClicksNumero(numero: WhatsappNumber) {
    const resultado = await Swal.fire({
      title: '¿Resetear clicks?',
      text: `Se reiniciará el contador de "${numero.nombre || this.formatearNumero(numero.numero)}" a 0.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!resultado.isConfirmed) return;

    this.cargando.set(true);
    const { error } = await this.supabaseService.resetearClicksNumero(numero.id);

    if (error) {
      Swal.fire('Error', 'No se pudo reiniciar el contador', 'error');
    } else {
      await this.cargarNumeros();
      Swal.fire({
        icon: 'success',
        title: 'Contador reiniciado',
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