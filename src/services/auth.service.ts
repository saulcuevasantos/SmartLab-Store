/**
 * SmartLab Store — Servicio de Autenticación, Perfiles y Permisos (RBAC)
 * docs/08_PLAN_SPRINTS.md (Sprint 03) & docs/07_SEGURIDAD.md (Sección 2 y 3)
 *
 * Reglas aprobadas:
 * 1. Autenticación mediante correo electrónico + contraseña (sin verificación OTP por SMS).
 * 2. El correo electrónico es obligatorio y único para crear una cuenta.
 * 3. El número de teléfono es obligatorio para el checkout y contacto por WhatsApp.
 * 4. Sincronización estricta con el rol real en `public.profiles` (`customer` | `admin`).
 */

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  Profile,
  Customer,
  CustomerAddress,
  RegisterCustomerInput,
  LoginInput,
  UpdateProfileInput,
  DocumentType,
} from '../types/user.types';
import { sanitizeWhatsAppPhone } from '../utils/whatsapp';

export interface AuthSessionData {
  profile: Profile;
  customer: Customer | null;
  addresses: CustomerAddress[];
}

/**
 * Verifica de forma estricta e insensible a mayúsculas si un rol corresponde a Administrador ('admin' o 'ADMIN').
 */
export function isAdminRole(role?: string | null): boolean {
  return String(role || '').trim().toUpperCase() === 'ADMIN';
}

/**
 * Verifica que exista una sesión activa con rol ADMIN antes de ejecutar operaciones administrativas.
 * Complementa las políticas RLS de Supabase (`public.is_admin()`).
 */
export async function assertAdminSession(): Promise<Profile> {
  const session = await getCurrentSession();
  if (!session || !session.profile || !session.profile.is_active) {
    throw new Error('Debes iniciar sesión para realizar esta operación.');
  }
  if (!isAdminRole(session.profile.role_id)) {
    throw new Error('Acceso denegado: Se requieren permisos de Administrador (ADMIN).');
  }
  return session.profile;
}

// =============================================================================
// VALIDACIONES ESTRICTAS DE NEGOCIO (CORREO ÚNICO, TELÉFONO OBLIGATORIO, CLAVE)
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmailFormat(email: string): string | null {
  const clean = email.trim().toLowerCase();
  if (!clean) {
    return 'El correo electrónico es obligatorio para crear o acceder a tu cuenta.';
  }
  if (!EMAIL_REGEX.test(clean)) {
    return 'Ingresa un correo electrónico válido (ejemplo: nombre@correo.com).';
  }
  return null;
}

export function validateWhatsAppPhone(phone: string): string | null {
  const clean = phone.trim();
  if (!clean) {
    return 'El número de teléfono / WhatsApp es obligatorio para coordinar tu pago y enviarte los enlaces de descarga.';
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    return 'Ingresa un número de celular / WhatsApp válido (mínimo 9 dígitos, ej. 987 654 321).';
  }
  return null;
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return 'La contraseña debe tener como mínimo 8 caracteres.';
  }
  return null;
}

// =============================================================================
// ALMACENAMIENTO LOCAL DE RESPALDO (CUANDO SUPABASE USA CREDENCIALES PLACEHOLDER)
// Aplica exactamente las mismas reglas de unicidad de correo, obligatoriedad de
// teléfono y control de roles (`customer` vs `admin`) para pruebas integrales.
// =============================================================================

interface StoredLocalAccount {
  profile: Profile;
  passwordHash: string;
  customer: Customer;
  addresses: CustomerAddress[];
}

const LOCAL_ACCOUNTS_KEY = 'smartlab_store_accounts_v1';
const LOCAL_ACTIVE_UID_KEY = 'smartlab_store_active_uid_v1';

function hashPasswordSimulated(raw: string): string {
  return `sl_hash_${btoa(encodeURIComponent(raw))}`;
}

function getLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) {
      return seedDefaultLocalAccounts();
    }
    const parsed = JSON.parse(raw) as StoredLocalAccount[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedDefaultLocalAccounts();
  } catch {
    return seedDefaultLocalAccounts();
  }
}

function saveLocalAccounts(accounts: StoredLocalAccount[]): void {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function seedDefaultLocalAccounts(): StoredLocalAccount[] {
  const now = new Date().toISOString();
  const initial: StoredLocalAccount[] = [
    {
      profile: {
        id: '00000000-0000-4000-a000-000000000001',
        role_id: 'admin',
        role: 'admin',
        email: 'admin@smartlab.pe',
        full_name: 'Administrador SmartLab',
        phone_number: '51999888777',
        document_type: 'RUC',
        document_number: '20600000001',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      passwordHash: hashPasswordSimulated('AdminSmartLab2026!'),
      customer: {
        id: '00000000-0000-4000-a000-000000000001',
        billing_business_name: 'SmartLab Store Perú SAC',
        billing_document_type: 'RUC',
        billing_document_number: '20600000001',
        total_orders_count: 0,
        total_spent_amount: 0,
        created_at: now,
        updated_at: now,
      },
      addresses: [],
    },
    {
      profile: {
        id: '00000000-0000-4000-a000-000000000002',
        role_id: 'customer',
        role: 'customer',
        email: 'cliente@smartlab.pe',
        full_name: 'Carlos Mendoza',
        phone_number: '51987654321',
        document_type: 'DNI',
        document_number: '45678912',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      passwordHash: hashPasswordSimulated('Cliente2026!'),
      customer: {
        id: '00000000-0000-4000-a000-000000000002',
        billing_business_name: 'Inversiones Mendoza EIRL',
        billing_document_type: 'DNI',
        billing_document_number: '45678912',
        total_orders_count: 1,
        total_spent_amount: 49.0,
        created_at: now,
        updated_at: now,
      },
      addresses: [
        {
          id: 'addr-001',
          customer_id: '00000000-0000-4000-a000-000000000002',
          address_type: 'BILLING',
          department: 'Lima',
          province: 'Lima',
          district: 'Miraflores',
          street_address: 'Av. Arequipa 4120, Of. 302',
          reference: 'Frente al parque',
          is_default: true,
          created_at: now,
          updated_at: now,
        },
      ],
    },
  ];
  saveLocalAccounts(initial);
  return initial;
}

// =============================================================================
// FUNCIONES PRINCIPALES DEL SERVICIO DE AUTENTICACIÓN
// =============================================================================

/**
 * Obtiene el perfil completo (`profiles` + `customers` + `customer_addresses`) de un usuario por su UUID.
 * El rol proviene exclusivamente de la columna `role_id` en `public.profiles` (protegida por RLS y trigger).
 */
export async function fetchUserSessionData(userId: string): Promise<AuthSessionData | null> {
  if (!isSupabaseConfigured()) {
    const accounts = getLocalAccounts();
    const found = accounts.find((acc) => acc.profile.id === userId && acc.profile.is_active);
    if (!found) return null;
    const normalizedRole = isAdminRole(found.profile.role_id) ? 'admin' : 'customer';
    return {
      profile: { ...found.profile, role_id: normalizedRole, role: normalizedRole },
      customer: { ...found.customer },
      addresses: [...found.addresses],
    };
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr || !profileRow || !profileRow.is_active) {
    return null;
  }

  const normalizedRole = isAdminRole(profileRow.role_id) ? 'admin' : 'customer';

  const profile: Profile = {
    ...(profileRow as Profile),
    role_id: normalizedRole,
    role: normalizedRole,
  };

  const { data: customerRow } = await supabase
    .from('customers')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const { data: addressRows } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', userId)
    .order('is_default', { ascending: false });

  return {
    profile,
    customer: (customerRow as Customer) || null,
    addresses: (addressRows as CustomerAddress[]) || [],
  };
}

/**
 * Restaura la sesión activa al cargar la aplicación
 */
export async function getCurrentSession(): Promise<AuthSessionData | null> {
  if (!isSupabaseConfigured()) {
    const activeUid = localStorage.getItem(LOCAL_ACTIVE_UID_KEY);
    if (!activeUid) return null;
    return fetchUserSessionData(activeUid);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  return fetchUserSessionData(session.user.id);
}

/**
 * Registra un nuevo cliente con Correo Electrónico Obligatorio y Único + Contraseña + Teléfono Obligatorio
 * (Sin verificación OTP por SMS). Se utiliza tanto en `/registro` como en el Registro Rápido del Checkout.
 *
 * REGLA DE SEGURIDAD RBAC (Corrección Sprint 03):
 * - Todo usuario registrado desde la aplicación nace exclusiva e invariablemente con rol `customer`.
 * - Está bloqueada cualquier asignación de rol `admin` mediante el formulario de registro, el frontend
 *   o metadatos (`raw_user_meta_data`).
 * - La creación del primer administrador se realiza únicamente mediante configuración manual controlada en Supabase.
 */
export async function registerCustomer(input: RegisterCustomerInput): Promise<AuthSessionData> {
  const fullName = input.fullName.trim();
  const normalizedEmail = input.email.trim().toLowerCase();
  const rawPhone = input.phoneNumber.trim();
  const normalizedPhone = sanitizeWhatsAppPhone(rawPhone) || rawPhone;
  const docType: DocumentType | null = input.documentType || null;
  const docNumber = input.documentNumber?.trim() || null;

  if (!fullName || fullName.length < 2) {
    throw new Error('Ingresa tu nombre completo o razón social.');
  }

  const emailError = validateEmailFormat(normalizedEmail);
  if (emailError) {
    throw new Error(emailError);
  }

  const phoneError = validateWhatsAppPhone(rawPhone);
  if (phoneError) {
    throw new Error(phoneError);
  }

  const passwordError = validatePasswordStrength(input.password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  // Modo Local si Supabase aún tiene valores placeholder
  if (!isSupabaseConfigured()) {
    const accounts = getLocalAccounts();
    const duplicate = accounts.find(
      (acc) => acc.profile.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      throw new Error(
        'Este correo electrónico ya está registrado en SmartLab Store. Por favor inicia sesión o utiliza otro correo.'
      );
    }

    const now = new Date().toISOString();
    const newId = crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`;

    const newProfile: Profile = {
      id: newId,
      role_id: 'customer', // Forzado estrictamente a 'customer'
      role: 'customer',
      email: normalizedEmail,
      full_name: fullName,
      phone_number: normalizedPhone,
      document_type: docType,
      document_number: docNumber,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const newCustomer: Customer = {
      id: newId,
      billing_business_name: fullName,
      billing_document_type: docType === 'DNI' || docType === 'RUC' ? docType : null,
      billing_document_number: docNumber,
      total_orders_count: 0,
      total_spent_amount: 0,
      created_at: now,
      updated_at: now,
    };

    accounts.push({
      profile: newProfile,
      passwordHash: hashPasswordSimulated(input.password),
      customer: newCustomer,
      addresses: [],
    });

    saveLocalAccounts(accounts);
    localStorage.setItem(LOCAL_ACTIVE_UID_KEY, newId);

    return {
      profile: newProfile,
      customer: newCustomer,
      addresses: [],
    };
  }

  // Modo Supabase Real (Correo + Contraseña, sin SMS).
  // Jamás se incluye "role" ni "role_id" en options.data.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
        phone_number: normalizedPhone,
        document_type: docType,
        document_number: docNumber,
      },
    },
  });

  if (signUpError) {
    if (
      signUpError.message.toLowerCase().includes('already registered') ||
      signUpError.message.toLowerCase().includes('duplicate') ||
      signUpError.message.toLowerCase().includes('unique')
    ) {
      throw new Error(
        'Este correo electrónico ya está registrado en SmartLab Store. Por favor inicia sesión o utiliza otro correo.'
      );
    }
    throw new Error(signUpError.message);
  }

  const user = signUpData.user;
  if (!user) {
    throw new Error('No se pudo completar el registro de la cuenta.');
  }

  // Supabase devuelve identities vacío cuando el correo ya existe y email enumeration protection está activo
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    throw new Error(
      'Este correo electrónico ya está registrado en SmartLab Store. Por favor inicia sesión o utiliza otro correo.'
    );
  }

  // El trigger de base de datos `trg_on_auth_user_created` (`public.handle_new_auth_user`)
  // crea el registro en `public.profiles` con `role_id = 'customer'` y en `public.customers`.
  // Consultamos primero el perfil creado por el trigger sin enviar `role_id` desde el cliente.
  let sessionData = await fetchUserSessionData(user.id);

  if (!sessionData) {
    // Respaldo seguro solo si el trigger aún no insertó la fila (sin sobrescribir jamás role_id en perfiles existentes)
    await supabase.from('profiles').insert({
      id: user.id,
      role_id: 'customer',
      email: normalizedEmail,
      full_name: fullName,
      phone_number: normalizedPhone,
      document_type: docType,
      document_number: docNumber,
      is_active: true,
    });

    await supabase.from('customers').insert({
      id: user.id,
      billing_business_name: fullName,
      billing_document_type: docType === 'DNI' || docType === 'RUC' ? docType : null,
      billing_document_number: docNumber,
    });

    sessionData = await fetchUserSessionData(user.id);
  }

  if (!sessionData) {
    throw new Error('La cuenta fue creada, pero no se pudo cargar el perfil del cliente.');
  }

  return sessionData;
}

/**
 * Inicia sesión con correo electrónico + contraseña
 */
export async function loginWithEmailPassword(input: LoginInput): Promise<AuthSessionData> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const emailError = validateEmailFormat(normalizedEmail);
  if (emailError) {
    throw new Error(emailError);
  }

  if (!input.password) {
    throw new Error('Ingresa tu contraseña para iniciar sesión.');
  }

  if (!isSupabaseConfigured()) {
    const accounts = getLocalAccounts();
    const expectedHash = hashPasswordSimulated(input.password);
    const found = accounts.find(
      (acc) =>
        acc.profile.email.toLowerCase() === normalizedEmail &&
        acc.passwordHash === expectedHash
    );

    if (!found) {
      throw new Error('Correo electrónico o contraseña incorrectos.');
    }

    if (!found.profile.is_active) {
      throw new Error('Esta cuenta se encuentra desactivada. Contacta a soporte por WhatsApp.');
    }

    localStorage.setItem(LOCAL_ACTIVE_UID_KEY, found.profile.id);
    return {
      profile: { ...found.profile, role: found.profile.role_id },
      customer: { ...found.customer },
      addresses: [...found.addresses],
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: input.password,
  });

  if (error || !data.user) {
    throw new Error('Correo electrónico o contraseña incorrectos.');
  }

  const sessionData = await fetchUserSessionData(data.user.id);
  if (!sessionData) {
    await supabase.auth.signOut();
    throw new Error('Tu perfil no se encuentra activo o no existe.');
  }

  return sessionData;
}

/**
 * Cierra la sesión actual e invalida el almacenamiento local
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem(LOCAL_ACTIVE_UID_KEY);
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
}

/**
 * Actualiza los datos de perfil y facturación del cliente autenticado (manteniendo su rol y correo único)
 */
export async function updateCustomerProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<AuthSessionData> {
  const fullName = input.fullName.trim();
  const rawPhone = input.phoneNumber.trim();
  const normalizedPhone = sanitizeWhatsAppPhone(rawPhone) || rawPhone;

  if (!fullName || fullName.length < 2) {
    throw new Error('El nombre completo es obligatorio.');
  }

  const phoneError = validateWhatsAppPhone(rawPhone);
  if (phoneError) {
    throw new Error(phoneError);
  }

  if (!isSupabaseConfigured()) {
    const accounts = getLocalAccounts();
    const index = accounts.findIndex((acc) => acc.profile.id === userId);
    if (index === -1) {
      throw new Error('No se encontró el perfil del usuario.');
    }

    const now = new Date().toISOString();
    accounts[index].profile = {
      ...accounts[index].profile,
      full_name: fullName,
      phone_number: normalizedPhone,
      document_type: input.documentType ?? accounts[index].profile.document_type,
      document_number: input.documentNumber?.trim() || null,
      updated_at: now,
    };

    accounts[index].customer = {
      ...accounts[index].customer,
      billing_business_name: input.billingBusinessName?.trim() || null,
      billing_document_type: input.billingDocumentType ?? null,
      billing_document_number: input.billingDocumentNumber?.trim() || null,
      updated_at: now,
    };

    saveLocalAccounts(accounts);
    return {
      profile: { ...accounts[index].profile, role: accounts[index].profile.role_id },
      customer: { ...accounts[index].customer },
      addresses: [...accounts[index].addresses],
    };
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone_number: normalizedPhone,
      document_type: input.documentType ?? null,
      document_number: input.documentNumber?.trim() || null,
    })
    .eq('id', userId);

  if (profileErr) {
    throw new Error(profileErr.message);
  }

  const { error: customerErr } = await supabase
    .from('customers')
    .update({
      billing_business_name: input.billingBusinessName?.trim() || null,
      billing_document_type: input.billingDocumentType ?? null,
      billing_document_number: input.billingDocumentNumber?.trim() || null,
    })
    .eq('id', userId);

  if (customerErr) {
    throw new Error(customerErr.message);
  }

  const updated = await fetchUserSessionData(userId);
  if (!updated) {
    throw new Error('No se pudo recargar el perfil actualizado.');
  }
  return updated;
}

/**
 * Agrega una dirección opcional para referencia comercial o facturación del cliente
 */
export async function saveCustomerAddress(
  customerId: string,
  address: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at' | 'updated_at'>
): Promise<CustomerAddress[]> {
  if (!address.department.trim() || !address.province.trim() || !address.district.trim() || !address.street_address.trim()) {
    throw new Error('Completa departamento, provincia, distrito y dirección detallada.');
  }

  if (!isSupabaseConfigured()) {
    const accounts = getLocalAccounts();
    const index = accounts.findIndex((acc) => acc.profile.id === customerId);
    if (index === -1) throw new Error('Cliente no encontrado.');

    const now = new Date().toISOString();
    if (address.is_default) {
      accounts[index].addresses = accounts[index].addresses.map((a) => ({
        ...a,
        is_default: false,
      }));
    }

    const newAddr: CustomerAddress = {
      id: crypto.randomUUID ? crypto.randomUUID() : `addr-${Date.now()}`,
      customer_id: customerId,
      ...address,
      created_at: now,
      updated_at: now,
    };

    accounts[index].addresses.unshift(newAddr);
    saveLocalAccounts(accounts);
    return [...accounts[index].addresses];
  }

  if (address.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
  }

  const { error } = await supabase.from('customer_addresses').insert({
    customer_id: customerId,
    ...address,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });

  return (data as CustomerAddress[]) || [];
}

/**
 * Elimina una dirección del cliente
 */
export async function deleteCustomerAddress(
  customerId: string,
  addressId: string
): Promise<CustomerAddress[]> {
  if (!isSupabaseConfigured()) {
    const accounts = getLocalAccounts();
    const index = accounts.findIndex((acc) => acc.profile.id === customerId);
    if (index === -1) throw new Error('Cliente no encontrado.');

    accounts[index].addresses = accounts[index].addresses.filter((a) => a.id !== addressId);
    saveLocalAccounts(accounts);
    return [...accounts[index].addresses];
  }

  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', addressId)
    .eq('customer_id', customerId);

  if (error) {
    throw new Error(error.message);
  }

  const { data } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });

  return (data as CustomerAddress[]) || [];
}
