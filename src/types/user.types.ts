/**
 * SmartLab Store — Tipos de Usuarios, Perfiles, Clientes y Solicitudes Personalizadas
 * Alineados con docs/04_BASE_DATOS.md y 001_schema_tables.sql
 */

export type UserRole = 'customer' | 'admin' | 'CUSTOMER' | 'ADMIN';

export type DocumentType = 'DNI' | 'RUC' | 'CE' | 'OTRO';

export interface Profile {
  id: string; // UUID -> auth.users.id
  role_id: UserRole; // 'customer' | 'admin' (o 'ADMIN')
  role?: UserRole; // Alias de conveniencia sincronizado con role_id
  email: string; // NOT NULL, UNIQUE
  full_name: string; // NOT NULL
  phone_number: string; // NOT NULL (obligatorio para checkout y WhatsApp, sin SMS inicial)
  document_type: DocumentType | null;
  document_number: string | null;
  is_active: boolean;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string; // UUID -> profiles.id
  billing_business_name: string | null;
  billing_document_type: 'DNI' | 'RUC' | null;
  billing_document_number: string | null;
  total_orders_count: number;
  total_spent_amount: number; // en Soles (S/)
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  address_type: 'BILLING' | 'CONTACT';
  department: string;
  province: string;
  district: string;
  street_address: string;
  reference: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterCustomerInput {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  documentType?: DocumentType | null;
  documentNumber?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  fullName: string;
  phoneNumber: string;
  documentType?: DocumentType | null;
  documentNumber?: string | null;
  billingBusinessName?: string | null;
  billingDocumentType?: 'DNI' | 'RUC' | null;
  billingDocumentNumber?: string | null;
}

export type CustomRequestStatus =
  | 'RECIBIDO'
  | 'EN_EVALUACION'
  | 'COTIZADO'
  | 'CONVERTIDO_A_PEDIDO'
  | 'DESCARTADO';

export interface CustomRequest {
  id: string;
  customer_id: string | null;
  product_id: string | null;
  category_id: string;
  requester_name: string;
  requester_email: string; // NOT NULL
  requester_phone: string; // NOT NULL
  requirements_detail: string;
  quoted_price: number | null; // en Soles (S/)
  status: CustomRequestStatus;
  generated_order_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}
