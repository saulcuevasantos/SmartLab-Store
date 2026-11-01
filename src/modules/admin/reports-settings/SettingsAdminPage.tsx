/**
 * SmartLab Store — Configuración General de la Tienda (Plazo 72h, Cuentas S/, Yape, Plin, WhatsApp)
 * docs/08_PLAN_SPRINTS.md (Sprint 08) y docs/05_PEDIDOS_PAGOS.md
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Clock,
  Smartphone,
  Building2,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  MessageCircle,
  BarChart3,
  QrCode,
  Upload,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  AdminStoreSettingsExtended,
  getAdminStoreSettings,
  saveAdminStoreSettings,
  uploadAndSavePaymentMethodQr,
  removePaymentMethodQr,
} from '../../../services/admin.service';
import { QrWalletMethod } from '../../../types/order.types';
import { ALLOWED_PUBLIC_ASSET_MIME_TYPES } from '../../../services/storage.service';

export const SettingsAdminPage: React.FC = () => {
  const [settings, setSettings] = useState<AdminStoreSettingsExtended | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Estados independientes para gestión de QR de Yape y Plin (Sprint A2)
  const [uploadingQr, setUploadingQr] = useState<Record<QrWalletMethod, boolean>>({
    yape: false,
    plin: false,
  });
  const [removingQr, setRemovingQr] = useState<Record<QrWalletMethod, boolean>>({
    yape: false,
    plin: false,
  });
  const [qrError, setQrError] = useState<Record<QrWalletMethod, string | null>>({
    yape: null,
    plin: null,
  });
  const [qrSuccess, setQrSuccess] = useState<Record<QrWalletMethod, string | null>>({
    yape: null,
    plin: null,
  });

  const yapeFileInputRef = useRef<HTMLInputElement | null>(null);
  const plinFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getAdminStoreSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        Cargando configuración operativa de SmartLab Store...
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(null);

    try {
      const updated = await saveAdminStoreSettings(settings);
      setSettings(updated);
      setSavedSuccess(
        `Configuración actualizada exitosamente en store_settings (key/value JSONB). El plazo de vencimiento (${updated.orderExpirationHours} horas) y las cuentas en S/ ya están vigentes en el Checkout.`
      );
      setTimeout(() => setSavedSuccess(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQrFileSelected = async (
    method: QrWalletMethod,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;

    setQrError((prev) => ({ ...prev, [method]: null }));
    setQrSuccess((prev) => ({ ...prev, [method]: null }));
    setUploadingQr((prev) => ({ ...prev, [method]: true }));

    try {
      const result = await uploadAndSavePaymentMethodQr(method, file, settings);
      if (result.error || !result.settings) {
        setQrError((prev) => ({
          ...prev,
          [method]:
            result.error ||
            `No se pudo actualizar el código QR de ${method.toUpperCase()}.`,
        }));
        return;
      }

      setSettings(result.settings);
      setQrSuccess((prev) => ({
        ...prev,
        [method]: `Código QR de ${method.toUpperCase()} subido a public-assets (qr/${method}/) y guardado en payment_methods_config.${method}.qr_url.`,
      }));
      setTimeout(() => {
        setQrSuccess((prev) => ({ ...prev, [method]: null }));
      }, 6000);
    } finally {
      setUploadingQr((prev) => ({ ...prev, [method]: false }));
    }
  };

  const handleRemoveQr = async (method: QrWalletMethod) => {
    if (!settings) return;

    setQrError((prev) => ({ ...prev, [method]: null }));
    setQrSuccess((prev) => ({ ...prev, [method]: null }));
    setRemovingQr((prev) => ({ ...prev, [method]: true }));

    try {
      const result = await removePaymentMethodQr(method, settings);
      if (result.error || !result.settings) {
        setQrError((prev) => ({
          ...prev,
          [method]:
            result.error ||
            `No se pudo eliminar el código QR de ${method.toUpperCase()}.`,
        }));
        return;
      }

      setSettings(result.settings);
      setQrSuccess((prev) => ({
        ...prev,
        [method]: `Código QR de ${method.toUpperCase()} eliminado de payment_methods_config.${method}.qr_url y del bucket public-assets.`,
      }));
      setTimeout(() => {
        setQrSuccess((prev) => ({ ...prev, [method]: null }));
      }, 6000);
    } finally {
      setRemovingQr((prev) => ({ ...prev, [method]: false }));
    }
  };

  const handleAddBankAccount = () => {
    setSettings({
      ...settings,
      bankAccounts: [
        ...settings.bankAccounts,
        {
          bankName: 'BBVA Perú',
          accountType: 'Cuenta Corriente en Soles',
          currency: 'PEN',
          accountNumber: '',
          cci: '',
          holderName: settings.yapeHolder || 'SMARTLAB SOLUTIONS PERU SAC',
        },
      ],
    });
  };

  const handleRemoveBankAccount = (idx: number) => {
    setSettings({
      ...settings,
      bankAccounts: settings.bankAccounts.filter((_, i) => i !== idx),
    });
  };

  const yapeQrUrl = settings.paymentMethodsConfig?.yape.qr_url ?? null;
  const plinQrUrl = settings.paymentMethodsConfig?.plin.qr_url ?? null;
  const acceptMimeTypes = ALLOWED_PUBLIC_ASSET_MIME_TYPES.join(',');

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Parámetros Globales • Moneda Exclusiva PEN (S/)
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#0A68FF]" />
            Configuración General, Cuentas de Pago y Plazo de 72 Horas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Persistencia estructurada por clave/valor JSONB (`payment_methods_config`, `order_expiration_hours`, `whatsapp_official_number`, `support_email`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/reports"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-2 transition"
          >
            <BarChart3 className="w-4 h-4 text-[#0A68FF]" />
            Ver Reportes Comerciales (S/)
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando cambios...' : 'Guardar Configuración Global'}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{savedSuccess}</span>
        </div>
      )}

      {/* 1. Regla de Vencimiento de Pedidos (72h por defecto) y Contacto WhatsApp */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">
            Vencimiento de Pedidos (`order_expiration_hours`) y WhatsApp Oficial
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
            <label className="block text-xs font-bold text-amber-950 mb-1">
              Plazo de Vencimiento de Pedidos (Horas) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="720"
              required
              value={settings.orderExpirationHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  orderExpirationHours: Number(e.target.value),
                })
              }
              className="w-full h-10 px-3 rounded-lg border border-amber-300 bg-white text-sm font-extrabold text-slate-900"
            />
            <span className="text-[11px] text-amber-900 block mt-1">
              Predeterminado: <strong>72 horas</strong>. Al vencer pasa a `VENCIDO` preservando abonos previos.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Oficial para Recepción de Pedidos <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={settings.officialWhatsappPhone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    officialWhatsappPhone: e.target.value,
                  })
                }
                placeholder="51999888777"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm font-mono font-bold text-slate-900"
              />
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Incluye código de país (51 para Perú).
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Oficial de Soporte
            </label>
            <input
              type="email"
              required
              value={settings.supportEmail}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  supportEmail: e.target.value,
                })
              }
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 2. Configuración de Billeteras Digitales en Soles (Yape y Plin) + Gestión de QR en public-assets */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">
              Billeteras Digitales Oficiales en Soles (`S/`): Yape y Plin
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            Bucket: <code className="font-mono font-bold text-slate-700">public-assets</code> • Máx. 5 MB (JPG, PNG, WEBP, SVG)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* YAPE */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded bg-purple-700 text-white text-[11px] font-bold">
                  YAPE OFICIAL (PEN)
                </span>
                <span className="text-[11px] font-mono text-purple-900/70">
                  qr/yape/
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número Celular Yape
                </label>
                <input
                  type="text"
                  value={settings.yapeNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, yapeNumber: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titular de Cuenta Yape
                </label>
                <input
                  type="text"
                  value={settings.yapeHolder}
                  onChange={(e) =>
                    setSettings({ ...settings, yapeHolder: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Cargador y Previsualización de QR Yape */}
            <div className="pt-3 border-t border-purple-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-700" />
                  Código QR Oficial Yape (`yape.qr_url`)
                </span>
                {yapeQrUrl && (
                  <a
                    href={yapeQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-purple-700 hover:underline inline-flex items-center gap-1"
                  >
                    Abrir URL pública
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-purple-200/80">
                <div className="w-32 h-32 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {yapeQrUrl ? (
                    <img
                      src={yapeQrUrl}
                      alt="Código QR Yape"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <QrCode className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] font-semibold block">
                        Sin QR configurado
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <input
                    ref={yapeFileInputRef}
                    type="file"
                    accept={acceptMimeTypes}
                    onChange={(e) => handleQrFileSelected('yape', e)}
                    className="hidden"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={uploadingQr.yape || removingQr.yape}
                      onClick={() => yapeFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {uploadingQr.yape ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Subiendo QR...
                        </>
                      ) : yapeQrUrl ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reemplazar QR Yape
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Subir QR Yape
                        </>
                      )}
                    </button>

                    {yapeQrUrl && (
                      <button
                        type="button"
                        disabled={uploadingQr.yape || removingQr.yape}
                        onClick={() => handleRemoveQr('yape')}
                        className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {removingQr.yape ? 'Eliminando...' : 'Eliminar QR'}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Formatos permitidos: JPG, PNG, WEBP o SVG (máx. 5 MB). Al reemplazar, el QR anterior se elimina únicamente tras confirmar el guardado en <code className="font-mono">store_settings</code>.
                  </p>
                </div>
              </div>

              {qrError.yape && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{qrError.yape}</span>
                </div>
              )}

              {qrSuccess.yape && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{qrSuccess.yape}</span>
                </div>
              )}
            </div>
          </div>

          {/* PLIN */}
          <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/30 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded bg-cyan-700 text-white text-[11px] font-bold">
                  PLIN OFICIAL (PEN)
                </span>
                <span className="text-[11px] font-mono text-cyan-900/70">
                  qr/plin/
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número Celular Plin
                </label>
                <input
                  type="text"
                  value={settings.plinNumber}
                  onChange={(e) =>
                    setSettings({ ...settings, plinNumber: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titular de Cuenta Plin
                </label>
                <input
                  type="text"
                  value={settings.plinHolder}
                  onChange={(e) =>
                    setSettings({ ...settings, plinHolder: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Cargador y Previsualización de QR Plin */}
            <div className="pt-3 border-t border-cyan-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-950 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-cyan-700" />
                  Código QR Oficial Plin (`plin.qr_url`)
                </span>
                {plinQrUrl && (
                  <a
                    href={plinQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-cyan-700 hover:underline inline-flex items-center gap-1"
                  >
                    Abrir URL pública
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-cyan-200/80">
                <div className="w-32 h-32 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {plinQrUrl ? (
                    <img
                      src={plinQrUrl}
                      alt="Código QR Plin"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <QrCode className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] font-semibold block">
                        Sin QR configurado
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <input
                    ref={plinFileInputRef}
                    type="file"
                    accept={acceptMimeTypes}
                    onChange={(e) => handleQrFileSelected('plin', e)}
                    className="hidden"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={uploadingQr.plin || removingQr.plin}
                      onClick={() => plinFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {uploadingQr.plin ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Subiendo QR...
                        </>
                      ) : plinQrUrl ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reemplazar QR Plin
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Subir QR Plin
                        </>
                      )}
                    </button>

                    {plinQrUrl && (
                      <button
                        type="button"
                        disabled={uploadingQr.plin || removingQr.plin}
                        onClick={() => handleRemoveQr('plin')}
                        className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {removingQr.plin ? 'Eliminando...' : 'Eliminar QR'}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Formatos permitidos: JPG, PNG, WEBP o SVG (máx. 5 MB). Al reemplazar, el QR anterior se elimina únicamente tras confirmar el guardado en <code className="font-mono">store_settings</code>.
                  </p>
                </div>
              </div>

              {qrError.plin && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{qrError.plin}</span>
                </div>
              )}

              {qrSuccess.plin && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{qrSuccess.plin}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Cuentas Bancarias en Soles (BCP / Interbank / CCI) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0A68FF]" />
            <h2 className="text-base font-bold text-slate-900">
              Cuentas Bancarias Recaudadoras en Soles (`PEN / S/`)
            </h2>
          </div>

          <button
            type="button"
            onClick={handleAddBankAccount}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar Banco
          </button>
        </div>

        <div className="space-y-3">
          {settings.bankAccounts.map((acc, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70 items-end"
            >
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Entidad Bancaria
                </label>
                <input
                  type="text"
                  value={acc.bankName}
                  onChange={(e) => {
                    const next = [...settings.bankAccounts];
                    next[index].bankName = e.target.value;
                    setSettings({ ...settings, bankAccounts: next });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs font-bold text-slate-900"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  N° Cuenta en Soles (S/)
                </label>
                <input
                  type="text"
                  value={acc.accountNumber}
                  onChange={(e) => {
                    const next = [...settings.bankAccounts];
                    next[index].accountNumber = e.target.value;
                    setSettings({ ...settings, bankAccounts: next });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs font-mono text-slate-900"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Código Interbancario (CCI)
                </label>
                <input
                  type="text"
                  value={acc.cci}
                  onChange={(e) => {
                    const next = [...settings.bankAccounts];
                    next[index].cci = e.target.value;
                    setSettings({ ...settings, bankAccounts: next });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs font-mono text-slate-700"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Titular
                </label>
                <input
                  type="text"
                  value={acc.holderName}
                  onChange={(e) => {
                    const next = [...settings.bankAccounts];
                    next[index].holderName = e.target.value;
                    setSettings({ ...settings, bankAccounts: next });
                  }}
                  className="w-full h-9 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-700"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveBankAccount(index)}
                  className="p-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Eliminar cuenta"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Banners y Mensajes Comerciales */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Textos de Portada y Barra Promocional
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título Hero Principal
            </label>
            <input
              type="text"
              value={settings.heroBannerTitle}
              onChange={(e) =>
                setSettings({ ...settings, heroBannerTitle: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Barra Superior de Anuncio
            </label>
            <input
              type="text"
              value={settings.promoBarText}
              onChange={(e) =>
                setSettings({ ...settings, promoBarText: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
