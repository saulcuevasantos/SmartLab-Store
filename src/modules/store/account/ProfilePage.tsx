/**
 * SmartLab Store — Gestión de Perfil, Direcciones y Cuenta del Cliente (/mi-cuenta/perfil)
 * docs/08_PLAN_SPRINTS.md (Sprint 03)
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  Package,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { DocumentType } from '../../../types/user.types';
import { formatPEN } from '../../../utils/currency';

export const ProfilePage: React.FC = () => {
  const {
    profile,
    customer,
    addresses,
    isAdmin,
    updateProfile,
    addAddress,
    removeAddress,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [documentType, setDocumentType] = useState<DocumentType | ''>(
    profile?.document_type || ''
  );
  const [documentNumber, setDocumentNumber] = useState(profile?.document_number || '');
  const [billingBusinessName, setBillingBusinessName] = useState(
    customer?.billing_business_name || ''
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Estado para nueva dirección opcional
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrType, setAddrType] = useState<'BILLING' | 'CONTACT'>('BILLING');
  const [department, setDepartment] = useState('Lima');
  const [province, setProvince] = useState('Lima');
  const [district, setDistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [reference, setReference] = useState('');
  const [isDefaultAddr, setIsDefaultAddr] = useState(true);
  const [isSavingAddr, setIsSavingAddr] = useState(false);

  if (!profile) {
    return null;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setIsSavingProfile(true);

    try {
      await updateProfile({
        fullName,
        phoneNumber,
        documentType: documentType ? (documentType as DocumentType) : null,
        documentNumber: documentNumber || null,
        billingBusinessName: billingBusinessName || null,
        billingDocumentType:
          documentType === 'DNI' || documentType === 'RUC' ? documentType : null,
        billingDocumentNumber: documentNumber || null,
      });
      setProfileFeedback({
        type: 'success',
        message: 'Tus datos de perfil y teléfono WhatsApp se actualizaron correctamente.',
      });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo actualizar el perfil.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddr(true);
    setProfileFeedback(null);

    try {
      await addAddress({
        address_type: addrType,
        department,
        province,
        district,
        street_address: streetAddress,
        reference: reference || null,
        is_default: isDefaultAddr,
      });
      setDistrict('');
      setStreetAddress('');
      setReference('');
      setShowAddressForm(false);
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudo guardar la dirección.',
      });
    } finally {
      setIsSavingAddr(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="smartlab-container py-8">
      {/* Cabecera de Mi Cuenta */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0A68FF]">
              Rol: {profile.role_id === 'admin' ? 'Administrador' : 'Cliente'}
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              Cuenta Activa
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{profile.full_name}</h1>
          <p className="text-xs sm:text-sm text-slate-500 break-safe">
            {profile.email} • WhatsApp: <strong>{profile.phone_number}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/mi-cuenta/pedidos"
            className="touch-target px-4 py-2.5 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
          >
            <Package className="w-4 h-4" />
            Mis Pedidos y Estados
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="touch-target px-4 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
            >
              <Shield className="w-4 h-4" />
              Panel Admin
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="touch-target px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 text-xs sm:text-sm font-medium flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Resumen Comercial del Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium block">Pedidos Registrados</span>
          <strong className="text-xl font-bold text-slate-900 mt-1 block">
            {customer?.total_orders_count ?? 0}
          </strong>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium block">
            Total Pagado Verificado (PEN)
          </span>
          <strong className="text-xl font-bold text-[#0A68FF] mt-1 block">
            {formatPEN(customer?.total_spent_amount ?? 0)}
          </strong>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium block">
            WhatsApp de Entrega Digital
          </span>
          <strong className="text-base font-bold text-emerald-600 mt-1.5 block">
            +{profile.phone_number}
          </strong>
        </div>
      </div>

      {profileFeedback && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
            profileFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {profileFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span>{profileFeedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Datos Personales y WhatsApp */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <User className="w-5 h-5 text-[#0A68FF]" />
            Datos Personales y Teléfono de Contacto
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Mantén actualizado tu número de teléfono/WhatsApp para recibir los enlaces de tus productos pagados al 100 %.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo Electrónico Único (No editable)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-200 bg-slate-100 text-base text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Teléfono / WhatsApp Obligatorio <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType | '')}
                  className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base text-slate-800 bg-white focus:outline-none focus:border-[#0A68FF]"
                >
                  <option value="">Sin especificar</option>
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="CE">Carné de Extranjería</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Número de Documento
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="DNI o RUC"
                  className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Razón Social (Opcional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={billingBusinessName}
                    onChange={(e) => setBillingBusinessName(e.target.value)}
                    placeholder="Empresa SAC"
                    className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="touch-target px-6 h-12 bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition"
              >
                {isSavingProfile ? 'Guardando cambios...' : 'Guardar Datos de Perfil'}
              </button>
            </div>
          </form>
        </div>

        {/* Direcciones Opcionales de Facturación / Contacto */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#0A68FF]" />
                Direcciones (Opcional)
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressForm((prev) => !prev)}
                className="text-xs font-semibold text-[#0A68FF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddressForm ? 'Cancelar' : 'Agregar'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Direcciones de referencia comercial o facturación (toda entrega de productos es 100 % digital).
            </p>

            {showAddressForm && (
              <form
                onSubmit={handleAddAddress}
                className="mb-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Departamento"
                    className="w-full h-11 px-3 rounded border border-slate-300 text-base bg-white"
                  />
                  <input
                    type="text"
                    required
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Provincia"
                    className="w-full h-11 px-3 rounded border border-slate-300 text-base bg-white"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Distrito (ej. San Isidro)"
                  className="w-full h-11 px-3 rounded border border-slate-300 text-base bg-white"
                />
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Av. / Calle / Número"
                  className="w-full h-11 px-3 rounded border border-slate-300 text-base bg-white"
                />
                <div className="flex items-center justify-between pt-1">
                  <select
                    value={addrType}
                    onChange={(e) => setAddrType(e.target.value as 'BILLING' | 'CONTACT')}
                    className="h-10 px-2 rounded border border-slate-300 text-xs bg-white"
                  >
                    <option value="BILLING">Facturación</option>
                    <option value="CONTACT">Contacto</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isSavingAddr}
                    className="px-4 h-10 bg-[#0A68FF] text-white text-xs font-semibold rounded hover:bg-[#0854D1]"
                  >
                    {isSavingAddr ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                No tienes direcciones registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {addr.district}, {addr.province} ({addr.department})
                      </span>
                      <span className="text-slate-600 block mt-0.5">{addr.street_address}</span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                        {addr.address_type === 'BILLING' ? 'Facturación' : 'Contacto'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAddress(addr.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                      aria-label="Eliminar dirección"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
