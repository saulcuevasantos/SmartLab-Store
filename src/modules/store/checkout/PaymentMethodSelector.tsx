/**
 * SmartLab Store — Selector de Método de Pago en Soles Peruanos (Yape, Plin, Transferencia)
 * Integrado dinámicamente con `public.store_settings` (`key = payment_methods_config`) — Sprint A3
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Building2,
  QrCode,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  PaymentMethod,
  PaymentMethodsBankAccountEntry,
} from '../../../types/order.types';
import {
  CheckoutStoreSettings,
  getActiveBankAccounts,
  getEnabledCheckoutPaymentMethods,
} from '../../../services/orders.service';
import { formatPEN } from '../../../utils/currency';

export interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelectMethod: (method: PaymentMethod) => void;
  selectedBankAccount?: PaymentMethodsBankAccountEntry | null;
  onSelectBankAccount?: (account: PaymentMethodsBankAccountEntry) => void;
  settings: CheckoutStoreSettings;
  netTotalPen: number;
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
}

function isSameBankAccount(
  a: PaymentMethodsBankAccountEntry | null | undefined,
  b: PaymentMethodsBankAccountEntry | null | undefined
): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return (
    a.bank === b.bank &&
    a.account_number === b.account_number &&
    a.cci === b.cci &&
    a.holder === b.holder
  );
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  selectedBankAccount = null,
  onSelectBankAccount,
  settings,
  netTotalPen,
  isLoading = false,
  loadError = null,
  onRetryLoad,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [qrLoadFailed, setQrLoadFailed] = useState<Record<'YAPE' | 'PLIN', boolean>>({
    YAPE: false,
    PLIN: false,
  });

  const paymentConfig = settings.paymentMethodsConfig;
  const yapeQrUrl = paymentConfig?.yape?.qr_url?.trim() || null;
  const plinQrUrl = paymentConfig?.plin?.qr_url?.trim() || null;

  useEffect(() => {
    setQrLoadFailed((prev) => ({ ...prev, YAPE: false }));
  }, [yapeQrUrl]);

  useEffect(() => {
    setQrLoadFailed((prev) => ({ ...prev, PLIN: false }));
  }, [plinQrUrl]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/\s+/g, ''));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  const enabledMethodIds = getEnabledCheckoutPaymentMethods(paymentConfig);
  const activeBankAccounts = getActiveBankAccounts(paymentConfig);

  const allMethodDefinitions: {
    id: PaymentMethod;
    methodName: string;
    title: string;
    subtitle: string;
    badge: string;
  }[] = [
    {
      id: 'YAPE',
      methodName: 'Yape',
      title: 'Yape (Soles S/)',
      subtitle: 'Pago inmediato por número de celular o código QR oficial',
      badge: 'Más rápido',
    },
    {
      id: 'PLIN',
      methodName: 'Plin',
      title: 'Plin (Soles S/)',
      subtitle: 'Interbank, BBVA, Scotiabank y cajas afiliadas a Plin',
      badge: 'Sin comisión',
    },
    {
      id: 'TRANSFERENCIA',
      methodName: 'Transferencia Bancaria',
      title: 'Transferencia Bancaria (S/)',
      subtitle: 'Cuentas oficiales activas en Soles Peruanos (Número de cuenta y CCI)',
      badge: 'Empresas y montos altos',
    },
  ];

  const availableMethods = allMethodDefinitions.filter((m) =>
    enabledMethodIds.includes(m.id)
  );

  // 1. Estado de carga de configuración
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
              Paso 2 — Medio de Pago en Soles (PEN)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Consultando métodos de pago habilitados...
            </h3>
          </div>
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-center gap-2.5 text-slate-500">
          <RefreshCw className="w-6 h-6 text-[#0A68FF] animate-spin" />
          <p className="text-xs sm:text-sm font-medium text-slate-600">
            Cargando configuración actualizada de pagos desde la tienda...
          </p>
        </div>
      </div>
    );
  }

  // 2. Estado de error en la consulta de configuración
  if (loadError) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
              Paso 2 — Medio de Pago en Soles (PEN)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Selecciona cómo abonarás {formatPEN(netTotalPen)}
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <strong className="font-bold block">
                No se pudo cargar la configuración de métodos de pago
              </strong>
              <p className="text-red-700 leading-relaxed">{loadError}</p>
            </div>
          </div>

          {onRetryLoad && (
            <button
              type="button"
              onClick={onRetryLoad}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Estado cuando todos los métodos de pago están deshabilitados o sin cuentas activas
  if (availableMethods.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
              Paso 2 — Medio de Pago en Soles (PEN)
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Selecciona cómo abonarás {formatPEN(netTotalPen)}
            </h3>
          </div>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5 flex items-start gap-3 text-amber-950">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs sm:text-sm">
            <strong className="font-bold block">
              Los métodos de pago no están disponibles temporalmente
            </strong>
            <p className="text-amber-900/90 leading-relaxed">
              En este momento no hay medios de pago habilitados para procesar tu pedido en el checkout. Por favor intenta nuevamente más tarde o comunícate con nuestro canal de soporte.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const yapePhone = paymentConfig?.yape?.phone || settings.yapeNumber;
  const yapeHolder = paymentConfig?.yape?.holder || settings.yapeHolder;
  const plinPhone = paymentConfig?.plin?.phone || settings.plinNumber;
  const plinHolder = paymentConfig?.plin?.holder || settings.plinHolder;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Paso 2 — Medio de Pago en Soles (PEN)
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Selecciona cómo abonarás {formatPEN(netTotalPen)}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          Reserva válida por {settings.orderExpirationHours} horas
        </span>
      </div>

      {/* Tarjetas de selección de método (únicamente métodos habilitados y configurados) */}
      <div
        className={`grid grid-cols-1 gap-3 ${
          availableMethods.length === 1
            ? 'sm:grid-cols-1'
            : availableMethods.length === 2
              ? 'sm:grid-cols-2'
              : 'sm:grid-cols-3'
        }`}
      >
        {availableMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelectMethod(method.id)}
              className={`text-left p-4 rounded-xl border-2 transition flex flex-col justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'border-[#0A68FF] bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    method.id === 'YAPE'
                      ? 'bg-purple-100 text-purple-700'
                      : method.id === 'PLIN'
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-blue-100 text-[#0A68FF]'
                  }`}
                >
                  {method.id === 'TRANSFERENCIA' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {method.badge}
                </span>
              </div>

              <div>
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-[#0A68FF]' : 'border-slate-400'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#0A68FF]" />}
                  </span>
                  {method.title}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{method.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle de cuenta oficial YAPE */}
      {selectedMethod === 'YAPE' && enabledMethodIds.includes('YAPE') && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-purple-700 text-white text-xs font-bold">
                Método: Yape (Soles S/)
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Yapea exactamente <span className="text-purple-700">{formatPEN(netTotalPen)}</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-purple-200 rounded-lg px-3.5 py-2.5">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Número de celular Yape</span>
                    <strong className="text-base font-mono text-slate-900">
                      {yapePhone}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(yapePhone, 'yape')}
                    className="px-3 py-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedKey === 'yape' ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar número
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-white border border-purple-100 rounded-lg px-3.5 py-2">
                  <span className="text-[11px] text-slate-500 block">Titular de la cuenta</span>
                  <strong className="text-xs sm:text-sm text-slate-800">
                    {yapeHolder}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bloque QR de Yape: muestra QR real si existe qr_url */}
            <div className="bg-white border border-purple-200 rounded-xl p-4 flex flex-col items-center text-center">
              {yapeQrUrl && !qrLoadFailed.YAPE ? (
                <>
                  <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg border border-purple-100 bg-white flex items-center justify-center p-1.5 shadow-2xs overflow-hidden">
                    <img
                      src={yapeQrUrl}
                      alt="Código QR oficial de Yape"
                      onError={() =>
                        setQrLoadFailed((prev) => ({ ...prev, YAPE: true }))
                      }
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 mt-2">
                    Escanea el código QR oficial de Yape
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Guarda la captura de tu operación
                  </span>
                </>
              ) : (
                <>
                  <div className="w-28 h-28 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex flex-col items-center justify-center p-2">
                    <QrCode className="w-10 h-10 text-purple-500" />
                    <span className="text-[10px] font-bold tracking-wider uppercase mt-1.5">
                      PAGO POR NÚMERO
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 mt-2">
                    Yapea directamente al celular indicado
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Guarda la captura de tu operación
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de cuenta oficial PLIN */}
      {selectedMethod === 'PLIN' && enabledMethodIds.includes('PLIN') && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-700 text-white text-xs font-bold">
                Método: Plin (Soles S/)
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Plinea el importe de <span className="text-cyan-700">{formatPEN(netTotalPen)}</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-cyan-200 rounded-lg px-3.5 py-2.5">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Número de celular Plin</span>
                    <strong className="text-base font-mono text-slate-900">
                      {plinPhone}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(plinPhone, 'plin')}
                    className="px-3 py-1.5 rounded-md bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedKey === 'plin' ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar número
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-white border border-cyan-100 rounded-lg px-3.5 py-2">
                  <span className="text-[11px] text-slate-500 block">Titular de la cuenta</span>
                  <strong className="text-xs sm:text-sm text-slate-800">
                    {plinHolder}
                  </strong>
                </div>
              </div>
            </div>

            {/* Bloque QR de Plin: muestra QR real si existe qr_url */}
            <div className="bg-white border border-cyan-200 rounded-xl p-4 flex flex-col items-center text-center">
              {plinQrUrl && !qrLoadFailed.PLIN ? (
                <>
                  <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-lg border border-cyan-100 bg-white flex items-center justify-center p-1.5 shadow-2xs overflow-hidden">
                    <img
                      src={plinQrUrl}
                      alt="Código QR oficial de Plin"
                      onError={() =>
                        setQrLoadFailed((prev) => ({ ...prev, PLIN: true }))
                      }
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 mt-2">
                    Escanea el código QR oficial de Plin
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Compatible con BBVA, Interbank y Scotiabank
                  </span>
                </>
              ) : (
                <>
                  <div className="w-28 h-28 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 flex flex-col items-center justify-center p-2">
                    <QrCode className="w-10 h-10 text-cyan-600" />
                    <span className="text-[10px] font-bold tracking-wider uppercase mt-1.5">
                      PAGO POR NÚMERO
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 mt-2">
                    Envía al número de celular afiliado a Plin
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Compatible con BBVA, Interbank y Scotiabank
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detalle de TRANSFERENCIA BANCARIA: muestra solo cuentas activas y permite seleccionar una cuenta concreta */}
      {selectedMethod === 'TRANSFERENCIA' &&
        enabledMethodIds.includes('TRANSFERENCIA') &&
        activeBankAccounts.length > 0 && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#0A68FF] text-white text-xs font-bold">
                  Método: Transferencia Bancaria
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  Selecciona la cuenta bancaria donde transferirás {formatPEN(netTotalPen)}:
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-600">
                {activeBankAccounts.length === 1
                  ? '1 cuenta activa disponible'
                  : `${activeBankAccounts.length} cuentas activas disponibles`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeBankAccounts.map((acc, index) => {
                const isAccountSelected = isSameBankAccount(selectedBankAccount, acc);
                const accountKey = acc.id || `${acc.bank}-${acc.account_number}-${index}`;

                return (
                  <div
                    key={accountKey}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectBankAccount?.(acc)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBankAccount?.(acc);
                      }
                    }}
                    className={`rounded-xl p-4 space-y-3 transition border-2 text-left cursor-pointer ${
                      isAccountSelected
                        ? 'bg-white border-[#0A68FF] shadow-xs ring-2 ring-blue-100'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-start gap-2">
                        <span
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            isAccountSelected ? 'border-[#0A68FF]' : 'border-slate-400'
                          }`}
                        >
                          {isAccountSelected && (
                            <span className="w-2 h-2 rounded-full bg-[#0A68FF]" />
                          )}
                        </span>
                        <div>
                          <strong className="text-sm font-bold text-slate-900 block">
                            {acc.bank}
                          </strong>
                          {acc.account_type && (
                            <span className="text-[11px] text-slate-500 block">
                              {acc.account_type}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] border border-blue-200">
                          Moneda: {acc.currency || 'PEN (S/)'}
                        </span>
                        {isAccountSelected && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Cuenta seleccionada
                          </span>
                        )}
                      </div>
                    </div>

                    {acc.account_number && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Número de Cuenta
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {acc.account_number}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBankAccount?.(acc);
                            handleCopy(acc.account_number, `acc-${index}`);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `acc-${index}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copiar
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {acc.cci && (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Código Interbancario (CCI)
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {acc.cci}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBankAccount?.(acc);
                            handleCopy(acc.cci, `cci-${index}`);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === `cci-${index}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> CCI
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                      <span>
                        Titular: <strong className="text-slate-800">{acc.holder}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Aviso normativo de verificación manual y entrega por WhatsApp */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">
            Importante sobre la verificación de pagos y entrega de licencias:
          </p>
          <p className="text-amber-900/90 leading-relaxed">
            Al hacer clic en <strong>Finalizar Pedido y Abrir WhatsApp</strong>, se generará tu código único de pedido con vigencia de{' '}
            <strong>{settings.orderExpirationHours} horas</strong> y se abrirá nuestro WhatsApp oficial para que envíes tu comprobante. Los enlaces de descarga privados (Google Drive / MediaFire) se envían por producto únicamente tras la verificación administrativa del pago.
          </p>
        </div>
      </div>
    </div>
  );
};

