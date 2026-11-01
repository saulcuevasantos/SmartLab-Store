/**
 * SmartLab Store — Cliente Único de Supabase para el Frontend
 * docs/03_ARQUITECTURA.md (Sección 4.1) y docs/08_PLAN_SPRINTS.md (Sprint 02)
 *
 * REGLA DE SEGURIDAD CRÍTICA:
 * Este cliente utiliza exclusivamente la clave pública `VITE_SUPABASE_ANON_KEY`.
 * La seguridad real reside en las políticas Row Level Security (RLS) y triggers
 * definidos en `/supabase/migrations/001..004.sql`.
 * Jamás debe utilizarse `service_role` en el navegador.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Indica si las variables de entorno apuntan a un proyecto real de Supabase
 * (y no a los valores de marcador de posición de `.env.example`).
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(env.supabaseUrl) &&
    Boolean(env.supabaseAnonKey) &&
    !env.supabaseUrl.includes('placeholder-project.supabase.co') &&
    !env.supabaseUrl.includes('tu-proyecto.supabase.co') &&
    env.supabaseAnonKey !== 'placeholder-anon-key' &&
    !env.supabaseAnonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  );
}

/**
 * Instancia única (Singleton) del cliente Supabase con configuración segura de sesión
 */
export const supabase: SupabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'smartlab_store_auth_token',
  },
  db: {
    schema: 'public',
  },
});

/**
 * Nombres oficiales de los buckets de Supabase Storage definidos en 004_storage_buckets.sql
 */
export const STORAGE_BUCKETS = {
  PUBLIC_ASSETS: 'public-assets',
  PAYMENT_RECEIPTS: 'payment-receipts',
} as const;
