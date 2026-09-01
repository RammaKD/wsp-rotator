import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private realtimeChannel: ReturnType<SupabaseClient['channel']> | null = null;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // ---------- AUTH ----------

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  async logout() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // ---------- CRUD DE NÚMEROS ----------

  async getNumeros() {
    const { data, error } = await this.supabase
      .from('whatsapp_numbers')
      .select('*')
      .order('orden', { ascending: true });
    return { data, error };
  }

  async agregarNumero(numero: string, orden: number, nombre?: string) {
    const { data, error } = await this.supabase
      .from('whatsapp_numbers')
      .insert([{ numero, orden, nombre }]);
    return { data, error };
  }

  async actualizarNumero(id: string, cambios: Partial<{ numero: string; orden: number; activo: boolean; nombre: string }>) {
    const { data, error } = await this.supabase
      .from('whatsapp_numbers')
      .update(cambios)
      .eq('id', id);
    return { data, error };
  }

  async eliminarNumero(id: string) {
    const { data, error } = await this.supabase
      .from('whatsapp_numbers')
      .delete()
      .eq('id', id);

    if (error) {
      return { data, error };
    }

    const { data: numeros, error: errorConsulta } = await this.supabase
      .from('whatsapp_numbers')
      .select('id, orden')
      .order('orden', { ascending: true });

    if (errorConsulta) {
      return { data, error: errorConsulta };
    }

    const actualizaciones = (numeros ?? [])
      .map((numero, indice) => ({ id: numero.id, orden: indice + 1 }))
      .filter((numero, indice) => numero.orden !== numeros[indice].orden)
      .map(({ id, orden }) =>
        this.supabase
          .from('whatsapp_numbers')
          .update({ orden })
          .eq('id', id)
      );

    const resultados = await Promise.all(actualizaciones);
    const errorReordenando = resultados.find(resultado => resultado.error)?.error;

    return { data, error: errorReordenando ?? null };
  }

  // ---------- CONFIGURACIÓN (mensaje global) ----------
  async getConfig() {
    const { data, error } = await this.supabase
      .from('app_config')
      .select('*')
      .eq('id', 1)
      .single();
    return { data, error };
  }

  async getRotatorState() {
    const { data, error } = await this.supabase
      .from('rotator_state')
      .select('*')
      .limit(1)
      .maybeSingle();

    return { data, error };
  }

  async getUltimoNumeroUsado() {
    const { data, error } = await this.supabase
      .from('rotator_state')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { data: null, error };
    }

    const numeroUsado = data.ultimo_numero ?? data.last_number ?? data.numero ?? null;
    const nombreUsado = data.ultimo_numero_nombre ?? data.last_number_name ?? data.nombre ?? 'Sin nombre';
    const ordenUsado = data.ultimo_orden ?? data.last_order ?? data.orden ?? null;

    if (!numeroUsado) {
      return { data: null, error: null };
    }

    return {
      data: {
        numero: numeroUsado,
        nombre: nombreUsado,
        orden: ordenUsado
      },
      error: null
    };
  }

  async actualizarUltimoNumero(numero: string, nombre?: string) {
    const payload: Record<string, string | number | null> = {
      ultimo_numero: numero,
      ultimo_numero_nombre: nombre || null
    };

    const { data, error } = await this.supabase
      .from('rotator_state')
      .update(payload)
      .eq('id', 1);

    return { data, error };
  }

  async actualizarMensaje(mensaje: string) {
    const { data, error } = await this.supabase
      .from('app_config')
      .update({ mensaje_default: mensaje })
      .eq('id', 1);
    return { data, error };
  }

  // ---------- ESTADÍSTICAS ----------
  async resetearClicks() {
    const { data, error } = await this.supabase
      .from('whatsapp_numbers')
      .update({ clicks: 0 })
      .not('id', 'is', null);

    return { data, error };
  }

  async resetearClicksNumero(id: string) {
    const { data, error } = await this.supabase
      .from('whatsapp_numbers')
      .update({ clicks: 0 })
      .eq('id', id);

    return { data, error };
  }

  subscribeToDashboardChanges(onChange: () => void) {
    if (this.realtimeChannel) {
      return;
    }

    this.realtimeChannel = this.supabase.channel('dashboard-realtime');

    this.realtimeChannel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_numbers' },
        () => onChange())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'app_config' },
        () => onChange())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rotator_state' },
        () => onChange())
      .subscribe();
  }

  unsubscribeDashboardChanges() {
    if (!this.realtimeChannel) {
      return;
    }

    this.supabase.removeChannel(this.realtimeChannel);
    this.realtimeChannel = null;
  }
}