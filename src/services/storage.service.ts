/**
 * SmartLab Store — Servicio de Almacenamiento (Supabase Storage)
 * - `payment-receipts` (Privado): comprobantes de clientes.
 * - `public-assets` (Público, máx. 5 MB): códigos QR de Yape/Plin y activos públicos de la tienda.
 */

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { PublicAssetUploadResult } from '../types/order.types';

const RECEIPTS_BUCKET = 'payment-receipts';
const MAX_RECEIPT_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const PUBLIC_ASSETS_BUCKET = 'public-assets';
export const MAX_PUBLIC_ASSET_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (5,242,880 bytes)
export const ALLOWED_PUBLIC_ASSET_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
] as const;

export type PublicAssetFolder =
  | 'qr/yape'
  | 'qr/plin'
  | 'categories'
  | 'home/slides/desktop'
  | 'home/slides/mobile'
  | 'home/promos'
  | 'home/banners/desktop'
  | 'home/banners/mobile'
  | 'home/info'
  | (string & {});

export interface UploadReceiptResult {
  path: string | null;
  url: string | null;
  error: string | null;
}

export interface DeletePublicAssetResult {
  success: boolean;
  error: string | null;
}

/**
 * Convierte un archivo a Data URL (Base64) únicamente para el fallback local de comprobantes en revisión
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo procesar el archivo del comprobante.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Espera asíncrona para reintentos ante fallos transitorios de red
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifica que Supabase esté configurado y que el usuario actual tenga sesión activa con rol ADMIN
 * antes de ejecutar operaciones de escritura/eliminación en `public-assets`.
 */
async function verifyAdminStorageAccess(): Promise<{ authorized: boolean; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return {
      authorized: false,
      error:
        'Supabase Storage no está configurado en este entorno. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para subir activos al bucket public-assets.',
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        authorized: false,
        error: 'Debes iniciar sesión como administrador para gestionar activos públicos.',
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role_id, is_active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.id !== authData.user.id) {
      return {
        authorized: false,
        error: 'No se pudo verificar el perfil administrativo del usuario actual.',
      };
    }

    const role = profile.role_id ?? (profile as { role?: string | null }).role ?? '';
    const isAdmin = String(role).trim().toUpperCase() === 'ADMIN';

    if (!isAdmin || profile.is_active !== true) {
      return {
        authorized: false,
        error: 'Acceso denegado: solo los usuarios con rol ADMIN pueden subir o eliminar activos en public-assets.',
      };
    }

    return { authorized: true, error: null };
  } catch (err) {
    return {
      authorized: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error al validar permisos administrativos para Supabase Storage.',
    };
  }
}

/**
 * Extrae de forma segura la ruta relativa dentro del bucket `public-assets`
 * a partir de una URL pública de Supabase o un path relativo (`qr/yape/...` o `categories/...`).
 */
export function extractPublicAssetStoragePath(pathOrUrl: string): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return null;
  }

  let candidatePath = trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const marker = `/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/`;
    const idx = trimmed.indexOf(marker);
    if (idx === -1) {
      return null;
    }
    candidatePath = decodeURIComponent(trimmed.slice(idx + marker.length).split('?')[0]);
  }

  const normalized = candidatePath.replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    return null;
  }

  return normalized;
}

/**
 * Verifica que una URL o ruta apunte específicamente a un activo dentro de `categories/`
 * en el bucket `public-assets`, evitando eliminar rutas ajenas (ej. `qr/yape/`, URLs externas o SVG embebidos).
 */
export function isCategoryPublicAssetUrl(pathOrUrl: string | null | undefined): boolean {
  if (!pathOrUrl) return false;
  const storagePath = extractPublicAssetStoragePath(pathOrUrl);
  if (!storagePath) return false;
  return storagePath.startsWith('categories/');
}

/**
 * Verifica que una URL o ruta apunte específicamente a un activo dentro de `home/slides/desktop/`
 * o `home/slides/mobile/` en el bucket `public-assets`.
 */
export function isHomepageSlidePublicAssetUrl(
  pathOrUrl: string | null | undefined,
  variant?: 'desktop' | 'mobile'
): boolean {
  if (!pathOrUrl) return false;
  const storagePath = extractPublicAssetStoragePath(pathOrUrl);
  if (!storagePath) return false;
  if (variant === 'desktop') {
    return storagePath.startsWith('home/slides/desktop/');
  }
  if (variant === 'mobile') {
    return storagePath.startsWith('home/slides/mobile/');
  }
  return (
    storagePath.startsWith('home/slides/desktop/') ||
    storagePath.startsWith('home/slides/mobile/')
  );
}

/**
 * Verifica que una URL o ruta apunte específicamente a un activo dentro de `home/promos/`
 * en el bucket `public-assets`, evitando eliminar archivos de otros módulos.
 */
export function isHomepagePromoCardPublicAssetUrl(
  pathOrUrl: string | null | undefined
): boolean {
  if (!pathOrUrl) return false;
  const storagePath = extractPublicAssetStoragePath(pathOrUrl);
  if (!storagePath) return false;
  return storagePath.startsWith('home/promos/');
}

/**
 * Verifica que una URL o ruta apunte específicamente a un activo dentro de `home/banners/desktop/`
 * o `home/banners/mobile/` en el bucket `public-assets`, evitando eliminar archivos de otros módulos.
 */
export function isHomepageBannerPublicAssetUrl(
  pathOrUrl: string | null | undefined,
  variant?: 'desktop' | 'mobile'
): boolean {
  if (!pathOrUrl) return false;
  const storagePath = extractPublicAssetStoragePath(pathOrUrl);
  if (!storagePath) return false;
  if (variant === 'desktop') {
    return storagePath.startsWith('home/banners/desktop/');
  }
  if (variant === 'mobile') {
    return storagePath.startsWith('home/banners/mobile/');
  }
  return (
    storagePath.startsWith('home/banners/desktop/') ||
    storagePath.startsWith('home/banners/mobile/')
  );
}

/**
 * Verifica que una URL o ruta apunte específicamente a un activo dentro de `home/info/`
 * en el bucket `public-assets`, evitando eliminar archivos de otros módulos.
 */
export function isHomepageInfoCardPublicAssetUrl(
  pathOrUrl: string | null | undefined
): boolean {
  if (!pathOrUrl) return false;
  const storagePath = extractPublicAssetStoragePath(pathOrUrl);
  if (!storagePath) return false;
  return storagePath.startsWith('home/info/');
}

/**
 * Sube un activo público (ej. QR de Yape en `qr/yape/` o QR de Plin en `qr/plin/`)
 * al bucket `public-assets` de Supabase Storage.
 * - Valida MIME (`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`).
 * - Valida tamaño máximo de 5 MB.
 * - Genera nombre único y devuelve URL pública real (nunca DataURL).
 * - Maneja errores y reintentos ante fallos de red transitorios.
 */
export async function uploadPublicStoreAsset(
  file: File,
  folder: PublicAssetFolder,
  options?: { maxRetries?: number }
): Promise<PublicAssetUploadResult> {
  if (!file) {
    return {
      path: null,
      publicUrl: null,
      error: 'Debes seleccionar un archivo de imagen válido.',
    };
  }

  if (
    !ALLOWED_PUBLIC_ASSET_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_PUBLIC_ASSET_MIME_TYPES)[number]
    )
  ) {
    return {
      path: null,
      publicUrl: null,
      error:
        'Formato de imagen no permitido. Usa únicamente JPG (image/jpeg), PNG (image/png), WEBP (image/webp) o SVG (image/svg+xml).',
    };
  }

  if (file.size <= 0) {
    return {
      path: null,
      publicUrl: null,
      error: 'El archivo seleccionado está vacío.',
    };
  }

  if (file.size > MAX_PUBLIC_ASSET_SIZE_BYTES) {
    return {
      path: null,
      publicUrl: null,
      error: 'La imagen supera el tamaño máximo permitido de 5 MB para el bucket public-assets.',
    };
  }

  const accessCheck = await verifyAdminStorageAccess();
  if (!accessCheck.authorized) {
    return {
      path: null,
      publicUrl: null,
      error: accessCheck.error || 'No tienes permisos para subir archivos a public-assets.',
    };
  }

  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  if (!cleanFolder || cleanFolder.includes('..')) {
    return {
      path: null,
      publicUrl: null,
      error: 'Carpeta de destino inválida para public-assets.',
    };
  }

  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  const fallbackExt = extensionMap[file.type] || 'png';
  const sanitizedBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48);
  const rawExt = file.name.includes('.')
    ? file.name
        .split('.')
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '') || fallbackExt
    : fallbackExt;

  const uniqueSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  const storagePath = `${cleanFolder}/${Date.now()}_${uniqueSuffix}_${sanitizedBaseName || 'asset'}.${rawExt}`;
  const maxRetries = Math.max(0, Math.min(3, options?.maxRetries ?? 2));
  let lastErrorMsg = 'Error al subir la imagen al bucket public-assets.';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(PUBLIC_ASSETS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        lastErrorMsg = error.message || 'Error en Supabase Storage al subir el activo.';
        const lowerMsg = lastErrorMsg.toLowerCase();
        // No reintentar si es error de permisos RLS, autenticación o validación
        if (
          lowerMsg.includes('row-level security') ||
          lowerMsg.includes('unauthorized') ||
          lowerMsg.includes('forbidden') ||
          lowerMsg.includes('payload too large') ||
          lowerMsg.includes('mime')
        ) {
          return {
            path: null,
            publicUrl: null,
            error: `No se pudo subir el activo a public-assets: ${lastErrorMsg}`,
          };
        }

        if (attempt < maxRetries) {
          await delay(400 * (attempt + 1));
          continue;
        }
        return {
          path: null,
          publicUrl: null,
          error: `Error tras ${attempt + 1} intentos al subir el activo: ${lastErrorMsg}`,
        };
      }

      if (!data?.path) {
        lastErrorMsg = 'Supabase Storage no devolvió la ruta del archivo subido.';
        if (attempt < maxRetries) {
          await delay(400 * (attempt + 1));
          continue;
        }
        return { path: null, publicUrl: null, error: lastErrorMsg };
      }

      const { data: publicUrlData } = supabase.storage
        .from(PUBLIC_ASSETS_BUCKET)
        .getPublicUrl(data.path);

      const publicUrl = publicUrlData?.publicUrl || null;
      if (
        !publicUrl ||
        (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://'))
      ) {
        return {
          path: null,
          publicUrl: null,
          error: 'No se pudo obtener una URL pública válida desde el bucket public-assets.',
        };
      }

      return {
        path: data.path,
        publicUrl,
        error: null,
      };
    } catch (err) {
      lastErrorMsg =
        err instanceof Error ? err.message : 'Error inesperado de red al subir el activo.';
      if (attempt < maxRetries) {
        await delay(400 * (attempt + 1));
        continue;
      }
    }
  }

  return {
    path: null,
    publicUrl: null,
    error: lastErrorMsg,
  };
}

/**
 * Elimina de forma segura un activo del bucket `public-assets` a partir de su ruta o URL pública.
 */
export async function deletePublicStoreAsset(
  pathOrUrl: string,
  options?: { maxRetries?: number }
): Promise<DeletePublicAssetResult> {
  const storagePath = extractPublicAssetStoragePath(pathOrUrl);
  if (!storagePath) {
    return {
      success: false,
      error: 'Ruta o URL de activo público no válida para el bucket public-assets.',
    };
  }

  const accessCheck = await verifyAdminStorageAccess();
  if (!accessCheck.authorized) {
    return {
      success: false,
      error: accessCheck.error || 'No tienes permisos para eliminar archivos de public-assets.',
    };
  }

  const maxRetries = Math.max(0, Math.min(3, options?.maxRetries ?? 2));
  let lastErrorMsg = 'No se pudo eliminar el activo anterior de public-assets.';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(PUBLIC_ASSETS_BUCKET)
        .remove([storagePath]);

      if (!error) {
        return { success: true, error: null };
      }

      lastErrorMsg = error.message || lastErrorMsg;
      const lowerMsg = lastErrorMsg.toLowerCase();
      if (
        lowerMsg.includes('row-level security') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('forbidden')
      ) {
        return {
          success: false,
          error: `Permiso denegado al eliminar activo de public-assets: ${lastErrorMsg}`,
        };
      }

      if (attempt < maxRetries) {
        await delay(350 * (attempt + 1));
        continue;
      }
    } catch (err) {
      lastErrorMsg =
        err instanceof Error ? err.message : 'Error de red al eliminar activo de public-assets.';
      if (attempt < maxRetries) {
        await delay(350 * (attempt + 1));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastErrorMsg,
  };
}

/**
 * Sube una captura o PDF de comprobante de pago al bucket privado `payment-receipts`
 */
export async function uploadPaymentReceipt(
  orderId: string,
  file: File
): Promise<UploadReceiptResult> {
  if (!file) {
    return { path: null, url: null, error: 'Debes seleccionar una imagen o PDF del comprobante.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      path: null,
      url: null,
      error: 'Formato no permitido. Sube una captura en JPG, PNG, WEBP o PDF.',
    };
  }

  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return {
      path: null,
      url: null,
      error: 'El archivo supera el tamaño máximo permitido de 8 MB.',
    };
  }

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `orders/${orderId}/${Date.now()}_${cleanFileName}`;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!error && data?.path) {
        const { data: signedData } = await supabase.storage
          .from(RECEIPTS_BUCKET)
          .createSignedUrl(data.path, 60 * 60 * 24 * 7); // 7 días

        return {
          path: data.path,
          url: signedData?.signedUrl || null,
          error: null,
        };
      }
    } catch {
      // Continuar a fallback local si el bucket aún no está aprovisionado en el entorno
    }
  }

  try {
    // Si el archivo es menor a 1.5 MB lo guardamos como Data URL para que sea visible tras recargar;
    // si es mayor, usamos un Object URL seguro de sesión.
    const url =
      file.size <= 1.5 * 1024 * 1024 ? await fileToDataUrl(file) : URL.createObjectURL(file);

    return {
      path: storagePath,
      url,
      error: null,
    };
  } catch (err) {
    return {
      path: null,
      url: null,
      error: err instanceof Error ? err.message : 'Error al procesar el comprobante.',
    };
  }
}

