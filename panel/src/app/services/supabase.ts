import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

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
}