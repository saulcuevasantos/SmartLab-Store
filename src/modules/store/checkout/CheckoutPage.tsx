/**
 * SmartLab Store — Página de Checkout con Registro Rápido, Creación de Pedido (72h) y Apertura de WhatsApp
 * docs/08_PLAN_SPRINTS.md (Sprint 07), docs/05_PEDIDOS_PAGOS.md y docs/06_DISENO_VISUAL_UX_UI.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Upload,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { useCart } from '../../../hooks/useCart';
import { useAuth } from '../../../hooks/useAuth';
import { QuickAuthSection, CheckoutCustomerContact } from './QuickAuthSection';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import {
  CheckoutStoreSettings,
  DEFAULT_CHECKOUT_STORE_SETTINGS,
  getCheckoutStoreSettings,
  getActiveBankAccounts,
  getEnabledCheckoutPaymentMethods,
  createOrderFromCheckout,
  submitPaymentReceipt,
  OrderWithDetails,
} from '../../../services/orders.service';
import { uploadPaymentReceipt } from '../../../services/storage.service';
import {
  PaymentMethod,
  PaymentMethodsBankAccountEntry,
} from '../../../types/order.types';
import { formatPEN } from '../../../utils/currency';
import {
  buildOrderWhatsAppUrl,
  buildOrderWhatsAppMessage,
  OrderWhatsAppParams,
} from '../../../utils/whatsapp';

export const CheckoutPage: React.FC = () => {
  const {
    items,
    itemCount,
    grossSubtotalPen,
    discountPen,
    netTotalPen,
    appliedCoupon,
    clearCart,
  } = useCart();

  const { isAuthenticated, profile, customer } = useAuth();

  const [storeSettings, setStoreSettings] = useState<CheckoutStoreSettings>(
    DEFAULT_CHECKOUT_STORE_SETTINGS
  );
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [contact, setContact] = useState<CheckoutCustomerContact>({
    fullName: '',
    email: '',
    phoneNumber: '',
    documentType: '',
    documentNumber: '',
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] =
    useState<PaymentMethodsBankAccountEntry | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Estado tras finalizar el pedido exitosamente
  const [createdOrder, setCreatedOrder] = useState<OrderWithDetails | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [whatsappMessagePreview, setWhatsappMessagePreview] = useState<string>('');
  const [copiedOrderCode, setCopiedOrderCode] = useState(false);

  // Estado para subida opcional de comprobante inmediato tras crear el pedido
  const [operationNumber, setOperationNumber] = useState('');
  const [originPhone, setOriginPhone] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState<string | null>(null);
  const [receiptErrorMsg, setReceiptErrorMsg] = useState<string | null>(null);

  const loadCheckoutSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    setSettingsError(null);

    try {
      const loaded = await getCheckoutStoreSettings();
      setStoreSettings(loaded);

      if (loaded.settingsLoadError) {
        setSettingsError(loaded.settingsLoadError);
        setSelectedPaymentMethod(null);
        setSelectedBankAccount(null);
        return;
      }

      const enabledMethods = getEnabledCheckoutPaymentMethods(loaded.paymentMethodsConfig);
      const activeAccounts = getActiveBankAccounts(loaded.paymentMethodsConfig);

      const resolvedMethod: PaymentMethod | null = enabledMethods[0] ?? null;
      setSelectedPaymentMethod((prev) => {
        const nextMethod = prev && enabledMethods.includes(prev) ? prev : resolvedMethod;
        if (nextMethod === 'TRANSFERENCIA') {
          setSelectedBankAccount((prevAcc) => {
            if (activeAccounts.length === 0) return null;
            if (
              prevAcc &&
              activeAccounts.some(
                (a) =>
                  a.bank === prevAcc.bank &&
                  a.account_number === prevAcc.account_number &&
                  a.cci === prevAcc.cci
              )
            ) {
              return prevAcc;
            }
            return activeAccounts[0];
          });
        } else {
          setSelectedBankAccount(null);
        }
        return nextMethod;
      });
    } catch (err) {
      setSettingsError(
        err instanceof Error
          ? err.message
          : 'Error al consultar la configuración de métodos de pago.'
      );
      setSelectedPaymentMethod(null);
      setSelectedBankAccount(null);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    loadCheckoutSettings();
  }, [loadCheckoutSettings]);

  const enabledPaymentMethods = getEnabledCheckoutPaymentMethods(
    storeSettings.paymentMethodsConfig
  );
  const activeBankAccounts = getActiveBankAccounts(storeSettings.paymentMethodsConfig);

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    if (!enabledPaymentMethods.includes(method)) return;
    setSelectedPaymentMethod(method);
    setCheckoutError(null);

    if (method === 'TRANSFERENCIA') {
      setSelectedBankAccount((prevAcc) => {
        if (
          prevAcc &&
          activeBankAccounts.some(
            (a) =>
              a.bank === prevAcc.bank &&
              a.account_number === prevAcc.account_number &&
              a.cci === prevAcc.cci
          )
        ) {
          return prevAcc;
        }
        return activeBankAccounts[0] ?? null;
      });
    } else {
      setSelectedBankAccount(null);
    }
  };

  const handleSelectBankAccount = (account: PaymentMethodsBankAccountEntry) => {
    setSelectedPaymentMethod('TRANSFERENCIA');
    setSelectedBankAccount(account);
    setCheckoutError(null);
  };

  // Sincronizar datos del cliente cuando inicia sesión o se registra en QuickAuthSection
  useEffect(() => {
    if (profile) {
      setContact((prev) => ({
        fullName: prev.fullName || profile.full_name || '',
        email: profile.email || prev.email || '',
        phoneNumber: prev.phoneNumber || profile.phone_number || '',
        documentType:
          prev.documentType ||
          profile.document_type ||
          (customer?.billing_document_type as CheckoutCustomerContact['documentType']) ||
          '',
        documentNumber:
          prev.documentNumber ||
          profile.document_number ||
          customer?.billing_document_number ||
          '',
      }));
      setOriginPhone((prev) => prev || profile.phone_number || '');
    }
  }, [profile, customer]);

  const triggerSafeExternalLink = (url: string) => {
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      // El usuario también cuenta con el botón directo en la pantalla de confirmación
    }
  };

  const handleCompleteCheckout = async () => {
    setCheckoutError(null);

    if (isLoadingSettings) {
      setCheckoutError(
        'Por favor espera a que termine de cargarse la configuración de métodos de pago.'
      );
      return;
    }

    if (settingsError) {
      setCheckoutError(
        'No es posible completar el pedido porque hubo un error al consultar la configuración de métodos de pago.'
      );
      return;
    }

    if (enabledPaymentMethods.length === 0 || !selectedPaymentMethod) {
      setCheckoutError(
        'Los métodos de pago no están disponibles temporalmente. No es posible finalizar el checkout en este momento.'
      );
      return;
    }

    if (!enabledPaymentMethods.includes(selectedPaymentMethod)) {
      setCheckoutError('El método de pago seleccionado no se encuentra habilitado.');
      return;
    }

    if (selectedPaymentMethod === 'TRANSFERENCIA' && !selectedBankAccount) {
      setCheckoutError(
        'Por favor selecciona una cuenta bancaria activa para realizar la transferencia.'
      );
      return;
    }

    if (!isAuthenticated || !profile) {
      setCheckoutError(
        'Por favor completa el Paso 1 (Crear Cuenta Rápida o Iniciar Sesión) antes de finalizar tu pedido.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!contact.fullName.trim() || !contact.email.trim() || !contact.phoneNumber.trim()) {
      setCheckoutError(
        'El nombre completo, correo electrónico y teléfono de WhatsApp son obligatorios para registrar tu pedido.'
      );
      return;
    }

    if (items.length === 0) {
      setCheckoutError('Tu carrito está vacío.');
      return;
    }

    setIsCreatingOrder(true);

    try {
      const bankAccountNote =
        selectedPaymentMethod === 'TRANSFERENCIA' && selectedBankAccount
          ? `Cuenta seleccionada: ${selectedBankAccount.bank} (${selectedBankAccount.currency || 'PEN'}) - Cta: ${selectedBankAccount.account_number}${selectedBankAccount.cci ? ` - CCI: ${selectedBankAccount.cci}` : ''} - Titular: ${selectedBankAccount.holder}`
          : '';
      const composedCustomerNotes = [bankAccountNote, customerNotes.trim()]
        .filter(Boolean)
        .join(' | ');

      const result = await createOrderFromCheckout({
        customerId: profile.id,
        customerFullName: contact.fullName,
        customerEmail: contact.email,
        customerPhone: contact.phoneNumber,
        customerDocumentType: contact.documentType || null,
        customerDocumentNumber: contact.documentNumber || null,
        preferredPaymentMethod: selectedPaymentMethod,
        customerNotes: composedCustomerNotes,
        cartItems: items,
        grossSubtotalPen,
        discountPen,
        netTotalPen,
        appliedCoupon,
      });

      if (result.error || !result.order) {
        setCheckoutError(result.error || 'No se pudo crear el pedido.');
        setIsCreatingOrder(false);
        return;
      }

      const newOrd = result.order;
      const paymentMethodLabel =
        newOrd.payment_method_selected === 'TRANSFERENCIA' && selectedBankAccount
          ? `TRANSFERENCIA (${selectedBankAccount.bank} - ${selectedBankAccount.currency || 'PEN'} - Cta: ${selectedBankAccount.account_number})`
          : newOrd.payment_method_selected;

      const waParams: OrderWhatsAppParams = {
        orderCode: newOrd.order_code,
        buyerName: newOrd.buyer_name,
        paymentMethod: paymentMethodLabel,
        items: (newOrd.items || []).map((it) => ({
          name: it.product_name_snapshot,
          version: it.product_version_snapshot,
          price: it.final_item_price_pen,
        })),
        totalNetPen: newOrd.total_net_pen,
        storeWhatsAppNumber: storeSettings.officialWhatsappPhone,
      };

      const builtUrl = buildOrderWhatsAppUrl(waParams);
      const builtMsg = buildOrderWhatsAppMessage(waParams);

      setCreatedOrder(newOrd);
      setWhatsappUrl(builtUrl);
      setWhatsappMessagePreview(builtMsg);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Abrir WhatsApp con el código y resumen del pedido
      triggerSafeExternalLink(builtUrl);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : 'Error inesperado al crear el pedido.'
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCopyOrderCode = async () => {
    if (!createdOrder) return;
    try {
      await navigator.clipboard.writeText(createdOrder.order_code);
      setCopiedOrderCode(true);
      setTimeout(() => setCopiedOrderCode(false), 2000);
    } catch {
      // Ignorar
    }
  };

  const handleQuickReceiptUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;

    setReceiptErrorMsg(null);
    setReceiptSuccessMsg(null);
    setIsUploadingReceipt(true);

    try {
      let receiptPath: string | null = null;
      let receiptUrl: string | null = null;

      if (receiptFile) {
        const uploaded = await uploadPaymentReceipt(createdOrder.id, receiptFile);
        if (uploaded.error) {
          setReceiptErrorMsg(uploaded.error);
          setIsUploadingReceipt(false);
          return;
        }
        receiptPath = uploaded.path;
        receiptUrl = uploaded.url;
      }

      if (!receiptFile && !operationNumber.trim()) {
        setReceiptErrorMsg(
          'Adjunta la captura de tu comprobante o ingresa el número de operación.'
        );
        setIsUploadingReceipt(false);
        return;
      }

      const res = await submitPaymentReceipt({
        orderId: createdOrder.id,
        registeredByUserId: profile?.id || createdOrder.customer_id,
        paymentMethod: createdOrder.payment_method_selected,
        amountReportedPen: createdOrder.total_net_pen,
        operationNumber,
        originPhone: originPhone || createdOrder.buyer_phone,
        bankName:
          createdOrder.payment_method_selected === 'TRANSFERENCIA'
            ? selectedBankAccount?.bank
            : undefined,
        receiptImagePath: receiptPath,
        receiptImageUrl: receiptUrl,
      });

      if (res.error || !res.order) {
        setReceiptErrorMsg(res.error || 'No se pudo registrar el comprobante.');
      } else {
        setCreatedOrder(res.order);
        setReceiptSuccessMsg(
          'Tu comprobante fue registrado en estado EN REVISIÓN. Recuerda que el pago y los enlaces de descarga se habilitan únicamente cuando el administrador verifique el abono.'
        );
        setOperationNumber('');
        setReceiptFile(null);
      }
    } catch (err) {
      setReceiptErrorMsg(
        err instanceof Error ? err.message : 'Error al enviar el comprobante.'
      );
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // ============================================================================
  // VISTA 1: CONFIRMACIÓN DE PEDIDO CREADO + ENVÍO DE COMPROBANTE POR WHATSAPP
  // ============================================================================
  if (createdOrder) {
    const expiresDateFormatted = new Date(createdOrder.expires_at).toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return (
      <div className="smartlab-container py-8 sm:py-12 max-w-4xl">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Cabecera de Éxito */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Pedido Registrado Exitosamente
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  Código de Pedido: {createdOrder.order_code}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Asociado a <strong>{createdOrder.buyer_email}</strong> • WhatsApp:{' '}
                  <strong>{createdOrder.buyer_phone}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyOrderCode}
              className="self-start sm:self-center px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
            >
              {copiedOrderCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Código copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar código
                </>
              )}
            </button>
          </div>

          {/* Resumen de estado y vencimiento 72h */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                Estado Actual del Pedido
              </span>
              <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {createdOrder.status === 'PAGO_EN_REVISION'
                  ? 'PAGO EN REVISIÓN'
                  : createdOrder.status === 'PAGO_VERIFICADO'
                    ? 'PAGO VERIFICADO'
                    : 'PENDIENTE DE PAGO'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                Total Neto a Pagar (PEN)
              </span>
              <strong className="text-lg font-bold text-[#0A68FF] block mt-1">
                {formatPEN(createdOrder.total_net_pen)}
              </strong>
              <span className="text-[11px] text-slate-500">
                Pagado verificado: {formatPEN(createdOrder.total_paid_verified_pen)}
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <span className="text-[11px] font-semibold uppercase text-amber-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Vigencia de Reserva ({storeSettings.orderExpirationHours}h)
              </span>
              <strong className="text-xs sm:text-sm font-bold text-slate-900 block mt-1">
                Vence: {expiresDateFormatted}
              </strong>
              <span className="text-[11px] text-amber-800">
                Si vence, conserva tus abonos previos y saldos
              </span>
            </div>
          </div>

          {/* Acción Principal: Abrir WhatsApp con código y resumen */}
          <div className="bg-emerald-50/80 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  <MessageCircle className="w-4 h-4" /> Paso Final Obligatorio
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Envía tu comprobante de pago por nuestro WhatsApp Oficial
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Haz clic en el botón verde para abrir WhatsApp con tu código{' '}
                  <strong>{createdOrder.order_code}</strong> y el detalle de tus productos en Soles.
                </p>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-6 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shrink-0 transition"
              >
                <MessageCircle className="w-5 h-5" />
                Abrir WhatsApp y Enviar Comprobante
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Vista previa del mensaje preparado para WhatsApp */}
            <details className="bg-white/90 border border-emerald-200 rounded-xl p-3.5 text-xs">
              <summary className="font-semibold text-slate-700 cursor-pointer select-none">
                Ver mensaje automático preparado para WhatsApp
              </summary>
              <pre className="mt-2.5 whitespace-pre-wrap font-mono text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {whatsappMessagePreview}
              </pre>
            </details>
          </div>

          {/* Formulario opcional para adjuntar el comprobante también en la plataforma */}
          {createdOrder.total_net_pen > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#0A68FF]" />
                  ¿Ya realizaste el pago? Adjunta tu comprobante aquí (Opcional)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tu comprobante quedará registrado como <strong>EN REVISIÓN</strong> para agilizar la validación del administrador.
                </p>
              </div>

              {receiptSuccessMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{receiptSuccessMsg}</span>
                </div>
              )}

              {receiptErrorMsg && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{receiptErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleQuickReceiptUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° de Operación (Yape / Plin / Banco)
                  </label>
                  <input
                    type="text"
                    value={operationNumber}
                    onChange={(e) => setOperationNumber(e.target.value)}
                    placeholder="Ej. 04829103"
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Captura del comprobante (Imagen/PDF)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full h-11 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0A68FF]"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isUploadingReceipt}
                    className="w-full h-11 px-4 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white font-semibold text-xs sm:text-sm transition"
                  >
                    {isUploadingReceipt ? 'Subiendo comprobante...' : 'Registrar Comprobante en Revisión'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Botones de navegación a Mis Pedidos o Catálogo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <Link
              to="/catalogo"
              className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 transition"
            >
              ← Volver al Catálogo
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/mi-cuenta/pedidos"
                className="px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 transition"
              >
                Ver Todos Mis Pedidos
              </Link>
              <Link
                to={`/mi-cuenta/pedidos/${createdOrder.id}`}
                className="px-5 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
              >
                <FileText className="w-4 h-4" />
                Ver Estado y Detalle del Pedido
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 2: CARRITO VACÍO (SI ENTRA A /CHECKOUT SIN PRODUCTOS)
  // ============================================================================
  if (itemCount === 0) {
    return (
      <div className="smartlab-container py-12 max-w-2xl text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0A68FF] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Tu carrito está vacío para el Checkout
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Agrega software, plantillas de ingeniería o herramientas técnicas desde nuestro catálogo en Soles (S/) antes de proceder al pago.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/catalogo"
              className="px-5 py-2.5 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-sm font-semibold transition"
            >
              Explorar Catálogo Digital
            </Link>
            {isAuthenticated && (
              <Link
                to="/mi-cuenta/pedidos"
                className="px-5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
              >
                Consultar Mis Pedidos
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VISTA 3: FLUJO PRINCIPAL DE CHECKOUT (CUENTA RÁPIDA + PAGO EN S/ + RESUMEN)
  // ============================================================================
  return (
    <div className="smartlab-container py-6 sm:py-10">
      {/* Encabezado y retorno al carrito */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link
            to="/carrito"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0A68FF] mb-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Carrito
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Finalizar Compra y Coordinar Entrega por WhatsApp
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Moneda única: <strong>Soles Peruanos (PEN / S/)</strong>
          </span>
        </div>
      </div>

      {checkoutError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block">Revisa antes de continuar:</strong>
            <span>{checkoutError}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Columna Izquierda: Paso 1 (Cuenta / Registro Rápido), Paso 2 (Pago en S/), Paso 3 (Notas) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Paso 1: Registro Rápido Integrado o Confirmación de Cuenta */}
          <QuickAuthSection
            contact={contact}
            onContactChange={setContact}
            onAuthComplete={() => setCheckoutError(null)}
          />

          {/* Paso 2: Selección de Método de Pago en S/ */}
          <PaymentMethodSelector
            selectedMethod={selectedPaymentMethod}
            onSelectMethod={handleSelectPaymentMethod}
            selectedBankAccount={selectedBankAccount}
            onSelectBankAccount={handleSelectBankAccount}
            settings={storeSettings}
            netTotalPen={netTotalPen}
            isLoading={isLoadingSettings}
            loadError={settingsError}
            onRetryLoad={loadCheckoutSettings}
          />

          {/* Paso 3: Notas adicionales del comprador */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-3">
            <label className="block text-xs sm:text-sm font-bold text-slate-900">
              Notas o indicaciones adicionales para tu pedido (Opcional)
            </label>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Ej. Abonaré primero el software principal o requiero comprobante con RUC..."
              className="w-full p-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Columna Derecha: Resumen Financiero en Soles (PEN / S/) y Botón de Creación de Pedido */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h2 className="text-base font-bold text-slate-900">
                Resumen del Pedido ({itemCount})
              </h2>
              <span className="text-xs font-semibold text-slate-500">Precios en S/</span>
            </div>

            {/* Lista de ítems con desglose individual */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.product.modalidad} • {item.product.current_version || 'v1.0'}
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mt-1 break-safe">
                      {item.product.name}
                    </h4>
                    {item.couponDiscountAllocatedPen > 0 && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                        Cupón prorrateado: -{formatPEN(item.couponDiscountAllocatedPen)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-slate-900 block">
                      {formatPEN(item.netItemPricePen)}
                    </span>
                    {item.couponDiscountAllocatedPen > 0 && (
                      <span className="text-[11px] text-slate-400 line-through block">
                        {formatPEN(item.unitPricePen)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotales y Descuento en Soles */}
            <div className="space-y-2 pt-3 border-t border-slate-200 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal bruto ({itemCount} licencias)</span>
                <span className="font-semibold text-slate-900">
                  {formatPEN(grossSubtotalPen)}
                </span>
              </div>

              {appliedCoupon && discountPen > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="flex items-center gap-1 text-xs font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    Cupón ({appliedCoupon.code})
                  </span>
                  <span className="font-bold">-{formatPEN(discountPen)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                <div>
                  <span className="text-base font-bold text-slate-900 block">
                    Total Neto a Pagar
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Moneda: Soles Peruanos (PEN)
                  </span>
                </div>
                <span className="text-xl font-extrabold text-[#0A68FF]">
                  {formatPEN(netTotalPen)}
                </span>
              </div>
            </div>

            {/* Botón Principal de Creación de Pedido y Apertura de WhatsApp */}
            <button
              type="button"
              onClick={handleCompleteCheckout}
              disabled={
                isCreatingOrder ||
                isLoadingSettings ||
                Boolean(settingsError) ||
                enabledPaymentMethods.length === 0 ||
                !selectedPaymentMethod ||
                (selectedPaymentMethod === 'TRANSFERENCIA' && !selectedBankAccount)
              }
              className="w-full min-h-12 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 shrink-0" />
              <span>
                {isCreatingOrder
                  ? 'Generando Pedido...'
                  : isLoadingSettings
                    ? 'Cargando Métodos de Pago...'
                    : 'Finalizar Pedido y Abrir WhatsApp'}
              </span>
            </button>

            {!isLoadingSettings && !settingsError && enabledPaymentMethods.length === 0 && (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-center font-medium">
                Los métodos de pago no están disponibles temporalmente. La finalización del pedido se encuentra bloqueada hasta que se habilite al menos un método de pago.
              </p>
            )}

            {!isAuthenticated && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
                Completa primero el <strong>Paso 1 (Crear Cuenta Rápida o Iniciar Sesión)</strong> en el formulario de la izquierda para habilitar la generación del pedido.
              </p>
            )}

            <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Vigencia predeterminada del pedido: <strong>{storeSettings.orderExpirationHours} horas</strong>.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Admite pagos totales o parciales por producto en Soles (S/).
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
