import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Mail,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Badge, Button, Alert } from '../../../components/common';
import { buildSupportWhatsAppUrl } from '../../../utils/whatsapp';
import { env } from '../../../config/env';

interface FaqItem {
  id: string;
  category: 'Pedidos y Checkout' | 'Pagos y Vencimientos' | 'Entregas y Reembolsos';
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Pedidos y Checkout',
    question: '¿Cómo realizo una compra y qué datos son obligatorios?',
    answer:
      'Para comprar en SmartLab Store necesitas una cuenta con tu correo electrónico (obligatorio y único) y tu número de teléfono de WhatsApp (obligatorio). Si aún no tienes cuenta, puedes registrarte directamente dentro del mismo Checkout (Registro Rápido Integrado) sin necesidad de verificación SMS. Al finalizar el checkout se crea tu pedido con un código único (ej. SL-2026-000101) y se abre WhatsApp con el resumen.',
  },
  {
    id: 'faq-2',
    category: 'Pagos y Vencimientos',
    question: '¿Qué métodos de pago aceptan y en qué moneda están los precios?',
    answer:
      'Todos nuestros precios están expresados exclusivamente en Soles Peruanos (PEN / S/). Aceptamos pagos mediante Yape, Plin y transferencia bancaria. Una vez creado tu pedido en el checkout, envías la captura o comprobante de tu pago manualmente por WhatsApp indicando el código de tu pedido.',
  },
  {
    id: 'faq-3',
    category: 'Pagos y Vencimientos',
    question: '¿El envío del comprobante confirma automáticamente mi pago?',
    answer:
      'No. Los comprobantes enviados entran en estado PAGO EN REVISIÓN y no confirman el pago de forma automática. Un administrador de SmartLab Store verifica manualmente la operación bancaria o de billetera digital (Yape/Plin) y asigna el importe verificado a cada producto de tu pedido.',
  },
  {
    id: 'faq-4',
    category: 'Pagos y Vencimientos',
    question: '¿Puedo realizar pagos parciales si mi pedido tiene varios productos?',
    answer:
      'Sí. SmartLab Store permite pagos parciales y asignaciones individuales por producto. Sin embargo, por regla comercial estricta, cada producto dentro del pedido solo habilita su entrega digital cuando dicho producto alcanza el 100 % de su pago verificado.',
  },
  {
    id: 'faq-5',
    category: 'Pagos y Vencimientos',
    question: '¿Cuánto tiempo tengo para pagar mi pedido y qué ocurre si vence?',
    answer:
      'Los pedidos tienen un plazo de vencimiento predeterminado de 72 horas desde su creación (configurable por administración). Si el pedido vence, pasa a estado VENCIDO pero conserva íntegramente todos sus pagos verificados y saldos históricos: nunca se eliminan abonos previos y un administrador puede reactivarlo o resolverlo.',
  },
  {
    id: 'faq-6',
    category: 'Entregas y Reembolsos',
    question: '¿Cómo recibo el enlace de descarga de mis productos?',
    answer:
      'Una vez que un producto tiene el 100 % de su pago verificado, nuestro equipo realiza la entrega mediante un mensaje preparado de WhatsApp con el enlace oficial de descarga (Google Drive o MediaFire en la fase actual) y además podrás consultarlo desde la sección "Mis Pedidos" en tu cuenta.',
  },
  {
    id: 'faq-7',
    category: 'Entregas y Reembolsos',
    question: '¿Cuál es la política de cancelación y reembolsos?',
    answer:
      'Al tratarse de bienes digitales descargables, cualquier producto cuyo enlace de descarga ya haya sido enviado al cliente se registra como ENTREGADO y NO ES REEMBOLSABLE bajo ninguna circunstancia. Solo los saldos de productos que aún no hayan sido entregados pueden evaluarse para devolución o reasignación administrativa.',
  },
];

export const SupportFaqPage: React.FC = () => {
  const [openId, setOpenId] = useState<string>(FAQ_ITEMS[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactOrderCode, setContactOrderCode] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [contactSent, setContactSent] = useState<boolean>(false);

  const filteredFaqs =
    selectedCategory === 'Todas'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === selectedCategory);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setContactSent(true);
  };

  const directSupportWhatsAppUrl = buildSupportWhatsAppUrl(
    contactMessage.trim()
      ? `Hola SmartLab Store, soy ${contactName || 'cliente'} (${contactEmail}). ${
          contactOrderCode ? `Pedido: ${contactOrderCode}. ` : ''
        }Consulta: ${contactMessage}`
      : 'Hola SmartLab Store, tengo una consulta sobre sus productos digitales y el proceso de compra.'
  );

  return (
    <div className="smartlab-container py-6 sm:py-8 space-y-10">
      {/* Cabecera de Soporte y FAQ */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="primary">CENTRO DE AYUDA</Badge>
            <span className="text-xs font-semibold text-slate-500">
              Atención directa por WhatsApp
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Preguntas Frecuentes y Soporte al Cliente
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Resuelve tus dudas sobre el registro rápido en checkout, pagos en Soles (S/) con Yape, Plin o transferencia, pagos parciales, vencimientos de 72 horas y entregas individuales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a href={directSupportWhatsAppUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="whatsapp"
              size="md"
              leftIcon={<MessageCircle className="w-4 h-4" />}
            >
              Escribir al WhatsApp Oficial
            </Button>
          </a>
          <Link to="/solicitud-personalizada">
            <Button variant="outline" size="md">
              Solicitar Producto a Medida
            </Button>
          </Link>
        </div>
      </section>

      {/* Bloque Principal: Acordeón de Preguntas Frecuentes + Formulario de Contacto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Preguntas Frecuentes (FAQ) */}
        <section className="lg:col-span-7 space-y-4" aria-labelledby="faq-section-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="faq-section-heading"
              className="text-lg font-bold text-slate-900 flex items-center gap-2"
            >
              <HelpCircle className="w-5 h-5 text-[#0A68FF]" />
              Preguntas Frecuentes Oficiales
            </h2>

            {/* Filtro por tema */}
            <div className="flex flex-wrap gap-1.5">
              {['Todas', 'Pedidos y Checkout', 'Pagos y Vencimientos', 'Entregas y Reembolsos'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#0A68FF] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? '' : item.id)}
                    aria-expanded={isOpen}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
                        {item.category}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                        {item.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#0A68FF]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Columna Derecha: Formulario de Contacto y Canales Oficiales */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">
              Envíanos una consulta directa
            </h2>
            <p className="text-xs text-slate-500">
              Si tienes dudas sobre un producto o el estado de tu pedido, completa este formulario o abre el chat directo en WhatsApp.
            </p>

            {contactSent ? (
              <div className="space-y-4">
                <Alert variant="success" title="Mensaje preparado">
                  Hemos registrado tu consulta. Para recibir atención inmediata en tiempo real, haz clic en el botón inferior para enviarla por WhatsApp.
                </Alert>
                <a
                  href={directSupportWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button
                    variant="whatsapp"
                    size="md"
                    fullWidth
                    leftIcon={<MessageCircle className="w-4 h-4" />}
                  >
                    Abrir Conversación en WhatsApp
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setContactSent(false);
                    setContactMessage('');
                  }}
                >
                  Redactar otra consulta
                </Button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="support-name"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Nombre Completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="support-name"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[42px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-email"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Correo Electrónico <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="cliente@correo.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[42px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-order"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Código de Pedido (Opcional)
                  </label>
                  <input
                    id="support-order"
                    type="text"
                    value={contactOrderCode}
                    onChange={(e) => setContactOrderCode(e.target.value)}
                    placeholder="Ej. SL-2026-000101"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[42px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-msg"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Mensaje o Consulta <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="support-msg"
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escribe aquí tu duda sobre un producto, pago o entrega..."
                    className="w-full p-3 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Enviar Consulta
                </Button>
              </form>
            )}
          </div>

          {/* Tarjeta de Canales y Horarios Oficiales */}
          <div className="bg-[#0F172A] text-white rounded-2xl p-6 space-y-3 text-xs">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Canales Oficiales SmartLab Store
            </h3>
            <div className="space-y-2 text-slate-300">
              <p className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>WhatsApp Oficial: +{env.whatsappNumber}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Correo: soporte@smartlab.pe</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Verificación de pagos: Lunes a Sábado (9:00 a.m. – 8:00 p.m.)</span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
