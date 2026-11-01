/**
 * SmartLab Store — Configuración de Variables de Entorno del Frontend
 * docs/03_ARQUITECTURA.md (Sección 5)
 *
 * REGLA DE SEGURIDAD CRÍTICA:
 * Nunca exponer SUPABASE_SERVICE_ROLE_KEY ni contraseñas privadas en este archivo ni en el cliente.
 */

export interface AppEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  storeName: string;
  storeCurrency: string;
  whatsappNumber: string;
  appUrl: string;
  isDev: boolean;
}

export const env: AppEnvConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  storeName: import.meta.env.VITE_STORE_NAME || 'SmartLab Store',
  storeCurrency: import.meta.env.VITE_STORE_CURRENCY || 'PEN',
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || '51900000000',
  appUrl: import.meta.env.VITE_APP_URL || import.meta.env.APP_URL || '',
  isDev: import.meta.env.DEV || false,
};

// Validación defensiva en desarrollo
if (env.isDev) {
  // Verificación de seguridad: asegurar que no haya filtración accidental de claves de servicio
  const rawEnv = JSON.stringify(import.meta.env);
  if (rawEnv.includes('service_role') || rawEnv.includes('SERVICE_ROLE')) {
    console.error('ALERTA DE SEGURIDAD: Se detectó una clave service_role en el entorno del cliente.');
  }
}
