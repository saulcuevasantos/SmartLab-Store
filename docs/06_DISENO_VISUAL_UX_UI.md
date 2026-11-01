# Especificación de Diseño Visual UX/UI — SmartLab Store

**Referencia de Diseño:** [Techoze 04 (RisingBamboo)](https://techoze.risingbamboo.com/techoze-04/)  
**Marca:** SmartLab Store  
**Mercado y Moneda:** Perú — Soles Peruanos (`PEN` / `S/`)  
**Modelo de Productos:** FREE, PRO y PERSONALIZADO (Excel, Google Sheets, Sistemas, APKs Android, Automatizaciones y Recursos Digitales)  
**Medios de Pago y Despacho:** Yape, Plin y Transferencia Bancaria — Verificación manual y entrega inicial mediante mensajes preparados de WhatsApp

---

## 1. Fundamentos Visuales y Sistema de Diseño (Design System)

Para reproducir fielmente la experiencia visual de **Techoze-04**, SmartLab Store adopta su estética comercial tecnológica caracterizada por fondos limpios, contrastes nítidos, jerarquías de contenido modulares, navegación vertical organizada y micro-interacciones ágiles, sustituyendo todo referente de hardware físico por soluciones digitales de software.

### 1.1. Paleta de Colores Oficial

| Token de Color | Valor Hex | Uso en Techoze-04 / SmartLab Store |
| :--- | :--- | :--- |
| `--color-primary` | `#0A68FF` | Azul tecnológico vibrante (Techoze Blue). Botones principales, enlaces activos, iconos destacados, bordes de enfoque y barra de búsqueda. |
| `--color-primary-hover` | `#0854D1` | Estado hover de botones y elementos interactivos primarios. |
| `--color-secondary` | `#FF6B00` | Naranja energético / Coral de acción. Insignias de ofertas flash, contadores de tiempo (Deal of the Day), etiquetas de descuento y contadores de carrito. |
| `--color-secondary-hover` | `#E05E00` | Estado hover de botones de oferta o acción destacada. |
| `--color-dark-header` | `#0F172A` | Azul marino profundo / Medianoche. Fondo de la barra de categorías vertical desplegada y pie de página principal. |
| `--color-topbar-bg` | `#F8FAFC` | Fondo limpio para la barra superior informativa y separadores. |
| `--color-badge-free` | `#10B981` | Verde esmeralda. Distintivo para productos gratuitos (**FREE** / S/ 0.00). |
| `--color-badge-pro` | `#6366F1` | Púrpura índigo digital. Distintivo para productos profesionales de pago (**PRO**). |
| `--color-badge-custom`| `#F59E0B` | Ámbar dorado. Distintivo para productos **PERSONALIZADOS** bajo solicitud. |
| `--color-whatsapp` | `#25D366` | Verde oficial de WhatsApp para botones de envío de pedido en checkout y despacho de enlaces. |
| `--color-bg-body` | `#F4F6F8` | Gris neutro sutil para el fondo general del lienzo, otorgando contraste a las tarjetas blancas. |
| `--color-surface-white`| `#FFFFFF` | Blanco puro. Fondo de tarjetas de producto, banners, modales y barra de navegación principal. |
| `--color-border` | `#E2E8F0` | Líneas de división, bordes de tarjetas y cuadrículas de catálogo. |
| `--color-text-main` | `#1E293B` | Gris carbón oscuro para títulos, nombres de productos y encabezados. |
| `--color-text-muted` | `#64748B` | Gris intermedio para categorías, metadatos, textos secundarios y precios tachados. |
| `--color-price` | `#0A68FF` | Azul primario (o `#FF6B00` en oferta) para precios vigentes en Soles (`S/`). |

### 1.2. Tipografía Oficial Poppins y Escala Tipográfica Responsive
- **Familia Tipográfica Principal:** `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Justificación de Marca:** Poppins aporta una geometría moderna, clara y tecnológica, con excelente legibilidad y confort visual tanto en pantallas pequeñas de alta densidad (smartphones) como en monitores de escritorio de alta resolución.
- **Pesos Tipográficos Utilizados:**
  - `Regular (400)`: Textos descriptivos, cuerpos de texto, términos y condiciones, notas al pie.
  - `Medium (500)`: Enlaces de navegación, etiquetas secundarias, inputs y placeholders.
  - `Semi-Bold (600)`: Títulos de tarjetas de producto, botones de acción, subtítulos de sección y nombres de módulos.
  - `Bold (700)`: Títulos principales (`Hero Title`), precios vigentes en Soles (`S/`), badges de modalidad y encabezados de página.
- **Escala de Tamaños Responsive:**
  - `Hero Title`: 28px – 32px en móvil (`< 768px`), 36px – 44px en tablet y desktop (`≥ 768px`) con `line-height: 1.2`.
  - `Section Title`: 18px – 20px en móvil, 22px – 26px en desktop (`line-height: 1.3`, con acento inferior azul `#0A68FF`).
  - `Product Card Title`: 13px – 14px en móvil (máximo 2 líneas con `line-clamp-2`), 14px – 15px en desktop (`line-height: 1.4`).
  - `Body / Descriptions`: 13px – 14px (`line-height: 1.5`).
  - `Badges & Micro-Copy`: 10px – 11px en móvil, 11px – 12px en desktop (mayúsculas con `letter-spacing: 0.5px`).
  - `Price Main (S/)`: 16px – 18px en móvil, 18px – 22px en desktop (Font Weight: 700 / Bold).
  - `Price Strikethrough`: 12px – 13px en móvil, 13px – 14px en desktop (`line-through`, color `#64748B`).

### 1.3. Sombras, Bordes y Espaciados
- **Radio de Borde (`border-radius`):**
  - Botones y campos de búsqueda: `6px` a `8px`.
  - Tarjetas de producto y contenedores de banner: `10px` a `12px`.
  - Badges o distintivos: `4px` a `6px`.
- **Sombras (`box-shadow`):**
  - Tarjetas en reposo: `0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`.
  - Tarjetas en hover: `0 10px 25px -5px rgba(10, 104, 255, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`.
  - Dropdown y modales: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)`.
- **Ancho del Contenedor Central:** Máximo `1280px` a `1320px` centrado con padding lateral de `16px` en móvil y `24px` en desktop.

---

## 2. Anatomía del Encabezado (Header Techoze-04)

El encabezado de Techoze-04 se estructura en tres niveles diseñados para maximizar la navegación rápida y la conversión:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Entrega Digital por WhatsApp | Horario | Moneda: PEN (S/) | Mis Pedidos | FAQ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ MAIN HEADER:                                                                           │
│ [SmartLab Store]  [▼ Categorías | Buscar plantillas, sistemas, APKs... | 🔍]  [👤] [🛒 S/ 0.00] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ NAVIGATION BAR:                                                                        │
│ [☰ TODAS LAS CATEGORÍAS ▼]  Inicio  Excel  Sheets  Sistemas  Android  Auto  Free  │ [💬 WhatsApp Oficial] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Nivel 1: Top Bar Informativa
- **Fondo:** `#F8FAFC`, texto en 12px, borde inferior `#E2E8F0`.
- **Izquierda:** *"Herramientas digitales para negocios — Entrega de enlaces por WhatsApp tras verificar tu pago"*.
- **Derecha:**
  - Indicador de moneda: `PEN (S/)` (fijo).
  - Enlaces rápidos: *Seguimiento de Pedido*, *Preguntas Frecuentes*, *Contacto*.

### 2.2. Nivel 2: Main Header (Logo, Mega-Buscador y Acciones Rápidas)
- **Fondo:** Blanco `#FFFFFF`, altura de `80px`, centrado y espacioso.
- **Logo SmartLab Store (Izquierda):**
  - Isotipo tecnológico con tipografía sans-serif audaz. Texto *"SmartLab"* en azul primario `#0A68FF` y *"Store"* en gris carbón `#0F172A`.
- **Buscador Central Avanzado (Estilo Techoze-04):**
  - Estructura unificada con borde exterior de `2px` en azul `#0A68FF`.
  - Selector integrado a la izquierda con menú desplegable: *Todas las Categorías* (Excel, Google Sheets, Sistemas, Aplicaciones Android, Automatizaciones, Recursos Digitales).
  - Campo de entrada: *"Buscar plantillas Excel, Google Sheets, sistemas, APKs Android..."*.
  - Botón de búsqueda derecho: Fondo azul `#0A68FF`, icono de lupa y texto *"Buscar"*.
  - Desplegable de resultados rápidos con miniaturas, modalidad (`FREE`/`PRO`/`PERSONALIZADO`) y precios en `S/`.
- **Bloque de Acciones (Derecha):**
  - **Soporte WhatsApp:** Icono de contacto con micro-copy *"Consultas y Pagos"* y número oficial.
  - **Cuenta de Usuario (`👤`):** Icono con texto *"Mi Cuenta"* (Iniciar Sesión / Registro o Perfil).
  - **Mini-Carrito (`🛒`):** Icono con badge contador en naranja `#FF6B00` y texto *"Mi Carrito: S/ [Total]"*. Al clic o hover, despliega el Drawer lateral con los productos seleccionados, subtotal en `S/` y botones *Ver Carrito* y *Finalizar Compra*.

### 2.3. Nivel 3: Navigation Bar y Botón de Categorías Vertical
- **Botón "Todas las Categorías" (Izquierda):**
  - Ancho de `270px` (alineado exactamente con la columna izquierda del Hero en inicio).
  - Fondo azul oscuro `#0F172A` o azul primario `#0A68FF`, texto en blanco con icono (`☰`) y flecha desplegable.
- **Menú Principal Horizontal (Centro):**
  - Enlaces: *Inicio*, *Excel*, *Google Sheets*, *Sistemas*, *Apps Android*, *Automatizaciones*, *Recursos FREE*, *Ofertas*.
- **Llamado a la Acción Derecho:**
  - Enlace destacado: *"¿Necesitas un desarrollo a medida? Solicítalo aquí"*.

---

## 3. Estructura de la Página de Inicio (Homepage Techoze-04)

La página de inicio reproduce fielmente la maquetación modular, proporciones y bloques de Techoze-04 adaptados al catálogo digital de SmartLab Store:

### 3.1. Hero Section: Menú Vertical + Banner Principal + Mini Banners Laterales
- **Columna Izquierda (270px de ancho):**
  - Menú vertical desplegado con las 6 categorías oficiales:
    1. *Excel (`excel`)* — Plantillas y macros empresariales.
    2. *Google Sheets (`google_sheets`)* — Hojas colaborativas en la nube.
    3. *Sistemas (`sistemas`)* — Software de ventas, inventario y gestión.
    4. *Aplicaciones Android (`android_apps`)* — APKs operativas para negocios.
    5. *Automatizaciones (`automatizaciones`)* — Scripts y flujos de trabajo.
    6. *Recursos Digitales (`recursos_digitales`)* — Guías, packs y utilidades.
- **Columna Central (Slider / Hero Banner Principal):**
  - Proporción panorámica con gráficos limpios de dashboards, sistemas y apps móviles.
  - Badge superior: *"HERRAMIENTAS DIGITALES PARA EMPRENDEDORES Y MYPES"*
  - Titular principal: *"Automatiza tu Negocio con Plantillas Excel, Sistemas y Apps Android"*
  - Subtexto: *"Soluciones listas para usar en Soles (S/). Paga con Yape, Plin o transferencia y recibe tu enlace por WhatsApp."*
  - Botones de acción:
    - Botón primario: *"Explorar Catálogo PRO"* (Azul `#0A68FF`).
    - Botón secundario: *"Ver Recursos FREE (S/ 0.00)"*.
- **Columna Derecha (2 Banners Apilados - Stacked Banners):**
  - **Banner Superior:** Enfocado en *Sistemas & APKs Android Más Vendidos*, con botón *"Ver Sistemas"*.
  - **Banner Inferior:** Enfocado en *Productos PERSONALIZADOS bajo Solicitud*, con botón *"Solicitar a Medida"*.

### 3.2. Barra de Propuesta de Valor (Value Proposition - 4 Columnas)
Ubicada debajo del Hero, con fondo blanco, bordes redondeados y 4 bloques informativos:
1. **Entrega Individual por WhatsApp:** *"Recibe el enlace de cada producto apenas se verifique el 100 % de su pago"*.
2. **Pagos Locales en Soles (`S/`):** *"Yape, Plin y Transferencia Bancaria con soporte de pagos parciales"*.
3. **Recursos FREE, PRO y a Medida:** *"Herramientas gratuitas, profesionales y adaptadas a tu flujo de trabajo"*.
4. **Versiones Documentadas:** *"Control claro de versiones, requisitos técnicos e instrucciones de uso"*.

### 3.3. Sección "Deal of the Day" / Oferta Destacada con Cuenta Regresiva
Reproduce el bloque promocional de Techoze-04:
- **Encabezado de Sección:** Título *"Oferta Destacada"* acompañado por el contador regresivo (`Días : Horas : Minutos : Segundos`) en cajas `#0F172A`.
- **Composición:**
  - **Tarjeta Destacada Izquierda:** Producto PRO en promoción con galería de capturas, badge de descuento en `#FF6B00`, especificaciones de versión, precio regular tachado y precio promocional en `S/`.
  - **Cuadrícula Derecha:** Productos adicionales en oferta o novedades de la semana en formato horizontal compacto.

### 3.4. Secciones de Catálogo por Pestañas (Destacados, Más Vendidos, Novedades y Categorías)
- **Barra de Pestañas Superior:** Permite alternar entre *Destacados*, *Más Vendidos*, *Novedades*, *Ofertas* y filtrar por las 6 categorías (*Excel*, *Google Sheets*, *Sistemas*, *Android*, *Automatizaciones*, *Recursos Digitales*).
- **Cuadrícula de Productos:** 4 columnas en desktop, 2 en móvil, utilizando la tarjeta Techoze-04.

### 3.5. Banners Promocionales Intermedios y Zona FREE / Personalizados
- **Doble Banner Intermedio (50% / 50%):** Destacando colecciones de *Excel & Google Sheets* y *Automatizaciones & Sistemas*.
- **Zona de Productos FREE (`S/ 0.00`):** Selección de herramientas gratuitas con badge verde `#10B981`.
- **Bloque de Productos Personalizados:** Sección para enviar requerimientos de software o adaptación de plantillas a medida.

---

## 4. Diseño Detallado de la Tarjeta de Producto (Product Card Techoze-04)

```text
┌───────────────────────────────────────┐
│ [PRO] [OFERTA -25%]                   │
│                                       │
│          IMAGEN DE PORTADA            │
│          (Formato 1:1 limpio)         │
│                                       │
│       [👁 Vista Rápida] [🛒 Añadir]    │ (Visible en Hover)
├───────────────────────────────────────┤
│ EXCEL • v2.1                          │
│ Plantilla de Control de Inventario    │
│ y Kardex Automático Empresarial       │
│                                       │
│ S/ 49.00   S/ 65.00                   │
│                                       │
│ [ 🛒 Agregar al Carrito ]             │
└───────────────────────────────────────┘
```

### 4.1. Elementos y Proporciones
1. **Contenedor:** Fondo blanco `#FFFFFF`, borde `1px solid #E2E8F0`, radio `10px`, sombra suave al hover.
2. **Badges Superiores (Esquina Superior Izquierda):**
   - Modalidad obligatoria: **FREE** (`#10B981`), **PRO** (`#6366F1`) o **PERSONALIZADO** (`#F59E0B`).
   - Descuento (si `is_on_promotion = true`): Badge naranja `#FF6B00` con el porcentaje de ahorro.
3. **Imagen del Producto:** Proporción `1:1` sobre fondo `#F8FAFC`, con ligero zoom al pasar el cursor y barra flotante de *Vista Rápida* y *Añadir al Carrito*.
4. **Información Comercial y Técnica:**
   - Categoría en mayúsculas y etiqueta de versión actual (ej. `v2.1`).
   - Título del producto en 2 líneas máximo (`14px–15px` semi-bold).
   - Precio expresado en Soles (`S/`): muestra `S/ 0.00 (GRATIS)` para productos FREE, precio vigente y precio regular tachado para productos PRO en oferta, o precio base / cotización para productos personalizados.
5. **Botón de Acción Inferior:**
   - Producto PRO / FREE: *"Agregar al Carrito"* o *"Obtener Gratis"*.
   - Producto PERSONALIZADO: *"Solicitar a Medida"*.

---

## 5. Páginas del Embudo de Compra y Reglas UX Comerciales

### 5.1. Ficha Detallada de Producto
- **Columna Izquierda:** Visor principal de imágenes y miniaturas.
- **Columna Derecha:**
  - Categoría, título, SKU, badge de modalidad (`FREE`, `PRO`, `PERSONALIZADO`) y versión vigente.
  - Precio en Soles (`S/`) y ahorro si está en promoción.
  - Resumen de requisitos técnicos (compatibilidad de Excel, Google Sheets, versión de Android, etc.).
  - Botones de acción (*Agregar al Carrito*, *Comprar Ahora* o *Solicitar Personalización*).
  - Recuadro informativo del flujo de compra: *"1. Finaliza tu pedido en el checkout → 2. Envía tu comprobante de Yape, Plin o transferencia por WhatsApp → 3. Recibe tu enlace individual de descarga apenas se verifique el 100 % del pago"*.

### 5.2. Carrito de Compras
- Listado de productos seleccionados (licencia unitaria `quantity = 1` por producto), mostrando miniatura, nombre, versión, modalidad y precio en `S/`.
- Campo para validar y aplicar cupones de descuento.
- Resumen de importes: Importe bruto, descuento aplicado y **Total Neto a Pagar en `S/`**.
- Botón principal: *"Continuar al Checkout"*.

### 5.3. Checkout con Registro Rápido Integrado, Creación del Pedido y Apertura de WhatsApp
El diseño del checkout refleja con exactitud las reglas comerciales y de autenticación aprobadas:
- **Bloque 1 — Datos del Comprador y Registro Rápido Integrado:**
  - **Si el cliente no ha iniciado sesión:** Presenta el bloque de **Registro Rápido Integrado en el Checkout** (con pestaña rápida para *Iniciar Sesión* si ya tiene cuenta):
    - **Nombre completo:** Campo obligatorio (`*`).
    - **Correo electrónico:** Campo **obligatorio (`*`) y único**, utilizado para crear la cuenta del cliente y vincular sus pedidos.
    - **Contraseña:** Campo **obligatorio (`*`)** (mínimo 8 caracteres) para que el cliente pueda acceder a su cuenta y consultar el estado de sus pedidos.
    - **Teléfono / WhatsApp:** Campo **obligatorio (`*`)**, con nota clara: *"Aquí coordinaremos tu pago y te enviaremos los enlaces de descarga (sin verificación por SMS)"*.
  - **Si el cliente ya tiene sesión activa:** Muestra sus datos precargados (nombre, correo electrónico y teléfono/WhatsApp obligatorio editable).
  - **Campos adicionales opcionales:** Documento (DNI / RUC) y Notas del pedido.
- **Bloque 2 — Selección de Método de Pago e Instrucciones:**
  - Tarjetas seleccionables para **Yape**, **Plin** y **Transferencia Bancaria**.
  - Muestra los datos oficiales de cobro de SmartLab Store (código QR, número de celular, cuentas bancarias en Soles, CCI y nombre del titular) junto con un aviso informativo sobre el flujo y el plazo de vigencia:
    > *"El pedido se creará al finalizar este checkout (con una vigencia predeterminada de 72 horas) y se abrirá WhatsApp con tu código de pedido para que envíes manualmente tu comprobante de pago. Recuerda que los comprobantes en revisión no confirman el pago hasta su verificación administrativa."*
- **Bloque 3 — Confirmación y Apertura de WhatsApp:**
  - Botón principal destacado (con icono de WhatsApp): **"Finalizar Pedido y Enviar Comprobante por WhatsApp"**.
  - **Comportamiento exacto:**
    1. Si es un cliente nuevo, crea su cuenta (`email + contraseña`) e inicia su sesión automáticamente.
    2. Crea el pedido en la base de datos en estado `PENDIENTE_PAGO` (guardando los snapshots de cada producto y asignando `expires_at` según el plazo predeterminado de **72 horas** configurado en el panel administrativo).
    3. Muestra en pantalla la confirmación con el código único del pedido (ej. `SL-2026-000452`) y acceso directo a `/mi-cuenta/pedidos`.
    4. Abre automáticamente WhatsApp con el mensaje preparado que incluye el código del pedido, los productos, el total en `S/` y el método de pago elegido, para que el cliente adjunte y envíe manualmente su comprobante.

### 5.4. Cuenta del Cliente, Seguimiento por Producto y Descargas
- **Acceso mediante Correo Electrónico + Contraseña:** El cliente accede en cualquier momento a `/mi-cuenta` utilizando el correo electrónico único y la contraseña registrados en su cuenta o durante el checkout.
- **Vista de Mis Pedidos (`/mi-cuenta/pedidos`):**
  - Permite al cliente consultar todos sus pedidos históricos y activos con su código, fecha de creación, fecha de vencimiento (72 horas por defecto), estado general (`PENDIENTE_PAGO`, `PAGO_EN_REVISION`, `PAGO_PARCIAL`, `PAGO_VERIFICADO`, `COMPLETADO`, `VENCIDO`, `OBSERVADO`, `CANCELADO`, `REEMBOLSADO`), total neto en `S/`, total verificado pagado y saldo pendiente.
  - Si un pedido está en `PAGO_EN_REVISION`, muestra una alerta clara: *"Tu comprobante está en revisión administrativa. Los comprobantes en revisión aún no confirman el pago"*.
  - Si un pedido está en `VENCIDO` (tras cumplirse las 72 horas configurables sin completar el 100 % del pago), muestra una nota informativa: *"Este pedido venció por plazo de espera, pero conserva íntegramente tus pagos verificados (S/ X.XX), asignaciones por producto y saldos históricos"*.
- **Tabla de Estado Individual por Producto dentro del Pedido:**
  - Cada producto del pedido muestra:
    - Nombre y versión histórica adquirida.
    - Precio neto del producto (`S/`), monto pagado asignado (`S/`) y saldo pendiente (`S/`).
    - Badge de estado de pago del producto (`SIN PAGO`, `PAGO PARCIAL`, `100% PAGADO`).
    - Badge de estado de entrega (`PENDIENTE DE PAGO AL 100%`, `LISTO PARA ENTREGA`, `ENLACE ENVIADO`, `REVOCADO`).
  - **Control visual y técnico de enlaces:**
    - Mientras el producto no esté pagado al 100 % y entregado, el enlace no existe en la vista y se muestra el botón *"Enviar comprobante / Completar saldo por WhatsApp"*.
    - Cuando el producto está pagado al 100 % y su entrega fue enviada por el administrador, muestra el acceso al enlace individual (Google Drive / MediaFire, o futuro enlace temporal) y el aviso de que los productos con enlace enviado no son reembolsables.

---

## 6. Pie de Página (Footer Techoze-04)

### 6.1. Footer Oscuro de 4 Columnas (`#0F172A`)
El pie de página reproduce la estructura de 4 columnas de Techoze-04, ofreciendo respaldo institucional y comercial:
- **Columna 1 — Marca y Contacto Oficial:** Logotipo SmartLab Store sobre fondo oscuro, descripción de la propuesta digital, enlace directo al WhatsApp oficial de atención, horario de atención y verificación manual de pagos, y correo oficial.
- **Columna 2 — Categorías del Catálogo:** Enlaces directos a las 6 categorías oficiales (*Excel*, *Google Sheets*, *Sistemas*, *Aplicaciones Android*, *Automatizaciones*, *Recursos Digitales*).
- **Columna 3 — Guía de Compra y Transparencia:** Instrucciones para pagar con Yape, Plin o Transferencia Bancaria, explicación de pagos parciales, política de no reembolso para productos con enlace ya enviado y preguntas sobre entrega digital.
- **Columna 4 — Mi Cuenta y Soporte:** Acceso a *Mi Cuenta*, *Seguimiento de Pedidos*, *Preguntas Frecuentes (FAQ)* y formulario de *Solicitudes Personalizadas*.
- **Barra Inferior de Copyright:** Aviso de derechos reservados, métodos de pago aceptados (logos de Yape, Plin, BCP, BBVA, Interbank) y mención de moneda oficial en Soles (`PEN`).

### 6.2. Adaptación del Footer en Móvil y Tablet
- En móvil (`< 768px`): Las 4 columnas se apilan verticalmente en acordeones colapsables o bloques limpios con separación de `20px`, asegurando que no sobrecarguen el scroll vertical y dejando espacio para la barra inferior fija de la app.
- En tablet (`768px – 1023px`): Se organiza en una cuadrícula de 2x2 columnas balanceadas con espaciado uniforme.

---

## 7. Especificación Integral de Diseño Responsive (Mobile-First, Tablet y Desktop)

SmartLab Store implementa una arquitectura de diseño **Mobile-First**, garantizando que la experiencia de compra y consulta sea fluida, ergonómica y rápida en smartphones, a la vez que aprovecha al máximo el espacio visual en tablets y pantallas de escritorio sin distorsiones ni compromisos funcionales.

### 7.1. Breakpoints Oficiales del Sistema

| Dispositivo / Pantalla | Rango de Ancho | Prefijo Tailwind | Enfoque de Maquetación |
| :--- | :--- | :--- | :--- |
| **Móvil Compacto** | `< 480px` | *(base)* | 1 columna en listas densas; 2 columnas ultra-compactas en catálogo; Bottom Bar fija. |
| **Móvil Estándar** | `480px – 767px` | `sm:` | 2 columnas en catálogo; banners fluidos; formularios a ancho completo. |
| **Tablet** | `768px – 1023px` | `md:` | 2 a 3 columnas en catálogo; navegación por Drawer lateral; 2 columnas en checkout. |
| **Laptop / Escritorio Pequeño** | `1024px – 1279px` | `lg:` | 3 a 4 columnas en catálogo; menú de categorías colapsable por botón; panel admin con sidebar compacto. |
| **Escritorio Estándar** | `1280px – 1535px` | `xl:` | 4 columnas en catálogo; menú vertical Techoze-04 desplegado (270px); panel admin completo. |
| **Pantallas Ultra-Anchas** | `≥ 1536px` | `2xl:` | Contenedor centrado restringido a `max-w-7xl` (`1280px` a `1320px`) para evitar dispersión visual. |

### 7.2. Experiencia y Maquetación en Dispositivos Móviles (`< 768px`) — Mobile-First

1. **Navegación Móvil y Barra Inferior Fija (Bottom App Bar):**
   - **Header Móvil Compacto (`height: 60px`):**
     - Botón hamburguesa izquierdo para abrir el Drawer de categorías.
     - Logotipo SmartLab Store centrado o alineado a la izquierda.
     - Botón de búsqueda rápida y acceso al mini-carrito con badge numérico naranja (`#FF6B00`).
   - **Barra de Búsqueda Móvil Secundaria:**
     - Ubicada justo debajo del header principal, sticky o integrada, con placeholder: *"Buscar plantillas, sistemas, APKs..."* y acceso rápido a filtros.
   - **Menú Inferior Fijo Tipo Aplicación (Bottom Bar):**
     - Fijado en la parte inferior de la pantalla (`position: fixed; bottom: 0; left: 0; right: 0; height: 60px; z-index: 50`).
     - Fondo blanco puro `#FFFFFF` con borde superior sutil `#E2E8F0` y elevación suave (`box-shadow: 0 -2px 10px rgba(0,0,0,0.06)`).
     - **5 accesos ergonómicos al alcance del pulgar:**
       1. **Inicio:** Icono Home + texto "Inicio" (`#0A68FF` cuando está activo).
       2. **Categorías:** Icono Grid + texto "Categorías" (abre el Drawer lateral con las 6 categorías).
       3. **Carrito:** Icono Carrito con badge contador naranja (`#FF6B00`) + texto "Carrito" (`/carrito`).
       4. **WhatsApp:** Icono oficial WhatsApp (`#25D366`) para soporte y consultas inmediatas.
       5. **Mi Cuenta:** Icono Usuario + texto "Cuenta" (conduce a `/mi-cuenta/pedidos` o `/login`).
     - Padding inferior de seguridad (`padding-bottom: env(safe-area-inset-bottom)`) para dispositivos con barra de gestos (iOS / Android modernos).
     - El contenedor principal de la página incluye un `padding-bottom: 76px` para evitar que la barra inferior oculte contenido o botones.

2. **Tarjetas de Producto Adaptadas para Móvil:**
   - Cuadrícula de 2 columnas balanceadas con espaciado de `10px` a `12px`.
   - Imagen de portada en proporción fija `1:1` con `object-fit: cover` sobre fondo `#F8FAFC`.
   - Badges compactos superpuestos con padding reducido (`px-2 py-0.5`, texto en `10px` bold): `FREE`, `PRO`, `PERSONALIZADO` y porcentaje de oferta.
   - Título del producto con tipografía Poppins a `13px` semi-bold, limitado estrictamente a 2 líneas (`line-clamp-2`, altura fija `2.8em`), garantizando que todas las tarjetas mantengan la misma altura sin saltos visuales.
   - Precios claros en Soles (`S/ 0.00` o precio regular/oferta) y botón táctil completo *"Agregar"* o *"Ver"*.

3. **Botones Cómodos y Accesibilidad Táctil:**
   - **Dimensiones Mínimas:** Todo elemento interactivo (botones, selectores, checkboxes, enlaces de navegación) posee un área táctil mínima de **`44px x 44px`** (idealmente **`48px`** de altura en botones primarios de llamada a la acción).
   - **Separación Táctil:** Espaciado mínimo de `8px` a `12px` entre botones contiguos para evitar pulsaciones erróneas involuntarias.
   - **Feedback Visual Inmediato:** Transición táctil suave al toque (`active:scale-[0.98]` y `active:bg-opacity-90`), con anillo de enfoque accesible (`focus-visible:ring-2 focus-visible:ring-[#0A68FF]`).

4. **Formularios Optimizados para Pantallas Táctiles:**
   - **Altura Cómoda:** Campos de texto (`input`, `select`, `textarea`) con altura mínima de **`48px`** y padding interior holgado (`px-3.5`).
   - **Prevención de Zoom Automático en iOS:** Tamaño de fuente mínimo de **`16px`** (`text-base`) en todos los inputs para impedir que Safari en iOS aplique zoom involuntario al enfocar un campo.
   - **Teclados Virtuales Semánticos:**
     - `type="tel"` y `inputmode="tel"` para el número de teléfono/WhatsApp obligatorio.
     - `type="email"` e `inputmode="email"` con `autocapitalize="none"` para el correo electrónico obligatorio único.
     - `type="password"` con botón integrado para alternar visibilidad (mostrar/ocultar contraseña).
     - `inputmode="numeric"` para códigos de comprobante de pago o DNI/RUC.
   - **Etiquetas Claras:** Labels legibles situados sobre los campos (no confiados exclusivamente en placeholders), con asterisco rojo (`*`) para campos obligatorios.

5. **Carrito y Checkout Móvil Accesible:**
   - **Mini-Carrito en Drawer:** Se despliega como panel lateral o Bottom Sheet desde la parte inferior, ocupando el 90 % del ancho de la pantalla, con listado deslizable y total neto visible.
   - **Checkout Móvil Lineal:**
     - Distribución en una sola columna vertical ordenada:
       1. Bloque de Registro Rápido Integrado / Inicio de sesión.
       2. Selector de Método de Pago con tarjetas táctiles grandes (Yape, Plin, Transferencia).
       3. Datos de pago con botón táctil para copiar número de celular o cuenta CCI al portapapeles.
       4. Botón verde flotante o al pie a pantalla completa: **"Finalizar Pedido y Enviar Comprobante por WhatsApp"** (`height: 52px`, icono destacado, fuente Poppins `15px` bold).

### 7.3. Experiencia y Distribución en Tablets (`768px – 1023px`)

1. **Uso Eficiente del Espacio Intermedio:**
   - La página de inicio reorganiza el Hero Section: el banner principal ocupa el 70 % y el bloque lateral se posiciona debajo o en tarjeta destacada de 30 %.
   - El catálogo adopta una cuadrícula equilibrada de **3 columnas** con espaciado de `16px`.
2. **Navegación Adaptable:**
   - Header intermedio: mega-buscador visible de tamaño medio (`320px – 400px`), menú de categorías accesible mediante botón desplegable con Drawer lateral.
   - La Bottom Bar móvil se oculta opcionalmente o se transiciona a la barra de estado superior según la orientación (vertical u horizontal).
3. **Ficha de Producto y Checkout en 2 Columnas:**
   - Ficha de producto: 45 % columna de imágenes y 55 % información comercial y compra.
   - Checkout: 60 % formulario del comprador y método de pago / 40 % resumen de pedido en bloque `sticky` lateral derecho.

### 7.4. Experiencia en Computadoras y Pantallas Amplias (`≥ 1024px`)

1. **Aprovechamiento Integral del Espacio Visual:**
   - **Contenedor Principal Centrado:** Ancho máximo de `1280px` a `1320px` (`max-w-7xl` con `mx-auto` y `px-6`), evitando que el contenido se estire excesivamente en pantallas de 24" o 27" y manteniendo una distancia de lectura ergonómica.
   - **Catálogo en 4 Columnas:** Cuadrícula de 4 columnas (y opción de 5 columnas en monitores muy amplios para secciones de ofertas o novedades).
2. **Encabezado Completo de 3 Niveles Techoze-04:**
   - Top Bar informativa con horario, moneda `PEN (S/)` y enlaces rápidos.
   - Main Header con mega-buscador central de más de `550px` con selector integrado de categorías.
   - Navigation Bar con menú vertical permanente de 270px en el Hero de la página de inicio y enlaces horizontales directos.
3. **Interacciones Enriquecidas de Escritorio:**
   - Hover cards con zoom sutil en imágenes de producto, aparición de botones de *Vista Rápida* y *Añadir al Carrito*.
   - Mini-carrito desplegable flotante al pasar el cursor o hacer clic sobre el icono de la cesta.
   - Checkout amplio en 2 columnas con resumen pegajoso (`position: sticky; top: 90px`).

### 7.5. Prevención Rigurosa de Defectos Visuales y Técnicos Comunes

1. **Cero Desplazamiento Horizontal Involuntario (`Horizontal Scroll` / `Overflow-X`):**
   - El contenedor raíz y el body configuran obligatoriamente `overflow-x: hidden; width: 100%; max-width: 100vw; box-sizing: border-box`.
   - Todos los elementos utilizan el modelo de caja `*, *::before, *::after { box-sizing: border-box; }`.
   - Prohibido el uso de anchos rígidos en píxeles mayores a `100%` o `100vw`. Todo layout utiliza `w-full`, `max-w-...`, porcentajes o unidades flexibles (`fr`).
   - Márgenes negativos utilizados en cuadrículas (como en flexbox o Tailwind `-mx-...`) deben estar estrictamente contenidos dentro de elementos con padding compensatorio para no desbordar el viewport en móvil.

2. **Cero Textos Cortados o Desbordados:**
   - **Títulos de Tarjetas de Producto:** Uso estricto de utilidades multilínea con truncamiento inteligente (`overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; height: 2.8em`).
   - **Códigos de Pedido, URLs y Correos:** Aplicación obligatoria de `overflow-wrap: break-word; word-break: break-all` en cadenas largas (ej. `SL-2026-000452`, hashes, correos o enlaces de descarga) para impedir que empujen el ancho de la tarjeta o modal.
   - **Escalado Tipográfico Fluido:** Títulos principales utilizan escalado adaptativo por breakpoint (`text-2xl sm:text-3xl lg:text-4xl`) para asegurar que palabras largas en español ("Automatizaciones", "Personalizados") no rompan el contenedor.

3. **Cero Botones Superpuestos o Aplastados:**
   - Todos los contenedores de botones de acción configuran `display: flex; flex-wrap: wrap; gap: 8px` a `16px`.
   - En pantallas pequeñas (`< 640px`), los grupos de botones de doble acción (ej. *"Ver Detalles"* y *"Agregar al Carrito"*, o *"Copiar Datos"* y *"Enviar WhatsApp"*) se apilan verticalmente con `flex-direction: column; width: 100%`, evitando que compitan por espacio o se solapen visualmente.
   - Los textos dentro de los botones tienen `white-space: nowrap` o espaciado suficiente para evitar cortes accidentales de líneas.

4. **Cero Distorsión o Deformación de Imágenes:**
   - **Portadas de Productos y Miniaturas:** Siempre enmarcadas en contenedores con relación de aspecto estricta `aspect-square` (`aspect-ratio: 1 / 1`) y `object-fit: cover` sobre fondo gris neutro `#F8FAFC`. Queda prohibido alterar las proporciones originales estirando la imagen de forma no uniforme (`width` y `height` desacoplados sin `object-fit`).
   - **Banners Promocionales y Hero Sliders:** Proporción panorámica adaptativa (`aspect-ratio: 16 / 9` en móvil, `21 / 9` o `3 / 1` en desktop) con `object-fit: cover`, garantizando que el punto focal y los textos no se recorten ni se distorsionen.
   - **Logotipos de Métodos de Pago y Badges:** Uso de `object-fit: contain` dentro de cajas protectoras de tamaño fijo (`width: 36px; height: 36px`) para conservar su geometría original.

### 7.6. Adaptación Responsive de Tablas y Datos Complejos

1. **En la Tienda Pública (`/mi-cuenta/pedidos` y Detalle de Pedido):**
   - **En Escritorio (`≥ 1024px`):** Tabla tradicional completa con columnas de: Código, Fecha, Productos Adquiridos, Total en `S/`, Monto Pagado, Saldo Pendiente, Estado General, Estado de Entrega y Acciones.
   - **En Móviles y Tablets (`< 1024px`) — Modo Card View (Tarjetas Apiladas):**
     - La tabla tabular se sustituye por **Tarjetas de Pedido Apiladas**.
     - Cada pedido se presenta como una tarjeta modular con:
       - Cabecera con código de pedido destacado, fecha y badge de estado general.
       - Sub-tarjeta para cada producto con su nombre, versión, importe (`S/`), badge de pago (`SIN PAGO`, `PAGO PARCIAL`, `100% PAGADO`) y badge de entrega.
       - Resumen de saldo pendiente y botón accesible a pantalla completa para enviar comprobante o contactar por WhatsApp.
     - Esta estructura elimina la necesidad de scroll horizontal en la cuenta del cliente y ofrece una lectura instantánea.

2. **En el Panel Administrativo (Gestión de Pedidos, Pagos y Asignaciones):**
   - **Desplazamiento Horizontal Controlado en Tablas Densas:**
     - En pantallas de escritorio y laptops, las tablas operativas con múltiples columnas de datos financieros se alojan dentro de un contenedor con `overflow-x: auto; -webkit-overflow-scrolling: touch;`.
     - **Encabezados Pegajosos (`position: sticky; top: 0`):** Los títulos de columna permanecen visibles durante el desplazamiento vertical.
     - **Columnas Clave Fijas (`position: sticky; left: 0`):** La columna de identificación (código de pedido o cliente) permanece anclada a la izquierda mientras se desplazan las columnas de montos y operaciones, con una sombra sutil divisoria.
     - Barra de desplazamiento personalizada, delgada y visible para que el operador sepa que existen más columnas disponibles.
   - **Modo Mobile Admin Card View (`< 768px`):**
     - Si el administrador accede desde un smartphone o tablet pequeña, las tablas de pedidos y pagos activan una vista de tarjetas operativas compactas con menú desplegable tipo acordeón para:
       - Ver la captura del comprobante.
       - Aprobar el monto verificado en `S/`.
       - Asignar el importe por producto.
       - Presionar el botón verde para enviar el enlace por WhatsApp.

---

## 8. Adaptación del Diseño al Panel Administrativo

El panel administrativo conserva la paleta de colores (`#0F172A`, `#0A68FF`, `#F4F6F8`, `#FFFFFF`) y la tipografía Poppins, estructurándose como un **panel de control operativo de alta densidad (SaaS)** adaptado a pantallas táctiles y escritorios:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [SmartLab Admin]  |  🔍 Buscar pedido, teléfono, operación...   [🔔 Pendientes] [Admin]│
├─────────────────┬──────────────────────────────────────────────────────────────────────┤
│ 📊 Dashboard    │ KPIs: [Comprobantes en Revisión] [Listos p/ WhatsApp] [Ingresos S/]  │
│ 📦 Productos    ├──────────────────────────────────────────────────────────────────────┤
│ 📑 Pedidos      │ DETALLE OPERATIVO DEL PEDIDO #SL-2026-000102 (Estado: PAGO_PARCIAL)  │
│ 💳 Pagos & Asig.│ 1. Verificar Pago (Yape/Plin/Banco) -> Asignar S/ a cada producto    │
│ 💬 Entregas WA  │ 2. Ítem B (100% pagado): [💬 Enviar Enlace Preparado por WhatsApp]   │
│ ⚖️ Cancel/Reemb.│ 3. Ítem A (Pago parcial S/ 40 de S/ 120): [🔒 Entrega Bloqueada]     │
│ 🛡️ Auditoría    │                                                                      │
│ ⚙️ Configuración│                                                                      │
└─────────────────┴──────────────────────────────────────────────────────────────────────┘
```

### 8.1. Comportamiento Responsive del Panel Administrativo
- **Sidebar de Navegación Lateral:**
  - **En Escritorio Amplio (`≥ 1280px`):** Sidebar fija desplegada con ancho de `260px`, iconos claros y nombres de sección.
  - **En Laptops (`1024px – 1279px`):** Sidebar colapsable a modo icono (`width: 72px`) con tooltips informativos al pasar el cursor o expandible con botón toggle.
  - **En Tablets y Móviles (`< 1024px`):** Sidebar oculta que se abre como Drawer flotante de pantalla completa mediante botón en la cabecera.
- **Módulos Visuales Operativos Adaptados:**
  1. **Verificación y Asignación de Pagos (`/admin/payments`):**
     - En escritorio: visor de comprobante a la izquierda (45 %) y matriz de asignación por producto a la derecha (55 %).
     - En móvil/tablet: pestañas alternables (*1. Comprobante*, *2. Asignación*), con barras de progreso individuales táctiles (`S/ pagado / S/ total`) e indicador visual contra sobreasignación.
  2. **Despacho Individual por WhatsApp (`/admin/deliveries`):**
     - Botón verde táctil **"Enviar Enlace por WhatsApp"** (`min-height: 44px`) activo solo cuando el ítem tiene `100% PAGADO`, abriendo la app de WhatsApp con un toque.
  3. **Cancelaciones, Resoluciones y Reembolsos (`/admin/cancellations`):**
     - Formulario con campos de texto amplios y selector de motivo de resolución apto para teclado táctil o ratón.

---

## 9. Criterios de Aceptación Responsive por Pantalla y Módulo

Para certificar que SmartLab Store cumple estrictamente con los estándares de diseño responsive y calidad UX/UI en cualquier dispositivo, se establecen los siguientes criterios verificables:

### 9.1. Dispositivos Móviles (`< 768px`)
1. **Navegación Móvil y Bottom Bar:**
   - La Bottom App Bar se mantiene anclada en la parte inferior en todo momento, sin sobreponerse al contenido gracias al padding inferior de seguridad.
   - El Drawer lateral de categorías se abre suavemente desde el botón inferior o del header, permitiendo navegar por las 6 categorías sin recargar la página.
   - El mini-carrito es accesible con un solo toque desde la Bottom Bar mostrando el total acumulado en `S/`.
2. **Catálogo y Tarjetas de Producto:**
   - La cuadrícula de catálogo muestra exactamente 2 columnas balanceadas en smartphones estándar, sin desbordamiento ni cortes laterales.
   - Las imágenes de producto conservan su relación de aspecto cuadrada `1:1` sin deformación.
   - Los títulos de las tarjetas de producto no exceden las 2 líneas y mantienen alineadas las alturas de las tarjetas en la misma fila.
   - Los botones de acción en las tarjetas tienen un área táctil mínima de `44px x 44px`.
3. **Formularios, Carrito y Checkout Móvil:**
   - Ningún campo de texto dispara el zoom automático en navegadores móviles (tamaño de fuente `≥ 16px`).
   - El teclado virtual numérico o telefónico se abre automáticamente en los campos de teléfono/WhatsApp y códigos numéricos.
   - El bloque de Registro Rápido Integrado en el checkout se despliega en una sola columna legible y cómoda.
   - El botón final para enviar el comprobante por WhatsApp tiene un ancho del 100 %, altura `≥ 48px`, icono visible y abre la aplicación oficial de WhatsApp con el mensaje codificado correctamente.

### 9.2. Dispositivos Tablets (`768px – 1023px`)
1. El catálogo de productos se distribuye en 3 columnas proporcionales con espaciado uniforme de `16px`.
2. La ficha de producto organiza las imágenes y la información comercial en 2 columnas proporcionadas (45% / 55%) sin solapamientos.
3. El checkout presenta el formulario del comprador a la izquierda y el resumen del pedido a la derecha con posicionamiento pegajoso (`sticky`).
4. Los modales y drawers ocupan un máximo del 80 % del ancho de la pantalla, centrados y con fondo oscuro semitransparente.

### 9.3. Computadoras y Pantallas Amplias (`≥ 1024px`)
1. El contenedor principal se mantiene centrado con un ancho máximo de `1280px` a `1320px`, sin estirar textos ni imágenes en pantallas panorámicas.
2. El mega-buscador de la cabecera tiene un ancho mínimo de `500px`, con selector desplegable de categorías funcional e integrado.
3. En la página de inicio, el menú vertical de 270px se muestra desplegado por defecto en el Hero Section con las 6 categorías oficiales.
4. Las tarjetas de producto muestran micro-interacciones al pasar el cursor (ligero zoom de imagen, elevación de sombra y aparición de botones de acción rápida).

### 9.4. Prevención de Defectos Visuales Críticos (Multi-Dispositivo)
1. **Cero Desplazamiento Horizontal:** No existe scroll horizontal involuntario en ninguna resolución entre `320px` y `2560px` de ancho.
2. **Cero Textos Cortados:** Ningún título, descripción, código de pedido ni precio aparece recortado, encimado o ilegible; los enlaces largos o identificadores se ajustan con salto de línea controlado.
3. **Cero Botones Superpuestos:** Ningún botón se superpone a otro elemento interactivo o texto en ningún punto de quiebre. En móvil, los botones múltiples se apilan verticalmente con ancho completo.
4. **Cero Deformación de Imágenes:** Ninguna miniatura, captura ni banner presenta achatamiento, estiramiento ni proporciones distorsionadas; se respeta `object-fit: cover` u `object-fit: contain` según su propósito.

### 9.5. Adaptación de Tablas de Datos Públicas y Administrativas
1. **En `/mi-cuenta/pedidos`:** En pantallas menores a `1024px`, la vista tabular se transforma en tarjetas apiladas (*Card View*) con toda la información de pagos, saldos y entregas por producto legible sin scroll lateral.
2. **En el Panel Administrativo:** En pantallas de escritorio, las tablas densas cuentan con contenedor con desplazamiento horizontal controlado (`overflow-x: auto`), primera columna pegajosa y encabezados fijos. En pantallas menores a `768px`, se activa el modo de tarjetas administrativas compactas con acordeones operativos.

### 9.6. Fidelidad a la Identidad Visual y Accesibilidad
1. **Tipografía Poppins:** Se aplica de forma consistente en toda la interfaz (400 regular para textos, 500 para navegación, 600 para títulos de tarjetas y 700 para encabezados y precios).
2. **Paleta SmartLab Store:** Se mantienen intactos los contrastes oficiales (`#0A68FF` primario, `#FF6B00` ofertas, `#0F172A` medianoche, `#10B981` FREE, `#6366F1` PRO, `#F59E0B` personalizado, `#25D366` WhatsApp), cumpliendo el ratio de contraste WCAG AA (`≥ 4.5:1`) sobre fondos claros y oscuros.
3. **Moneda e Información Comercial:** Los precios se muestran uniformemente con el símbolo oficial en Soles (`S/`) y dos decimales, con diferenciación clara de productos gratuitos (`S/ 0.00 (GRATIS)`).
