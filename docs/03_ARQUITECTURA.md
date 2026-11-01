# Arquitectura Técnica — SmartLab Store

## 1. Arquitectura General y Comunicación entre Componentes

### 1.1. Visión General del Stack
**SmartLab Store** adopta una arquitectura moderna orientada a servicios sin servidor (*Serverless / JAMstack*), priorizando capas gratuitas (*free tiers*), alta disponibilidad, bajo costo operativo y mínimo mantenimiento para el mercado peruano (`PEN` / `S/`).

| Capa | Tecnología Obligatoria | Rol en SmartLab Store |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript | Aplicación de página única (SPA) tipada para la tienda pública (diseño Techoze-04) y el panel administrativo. |
| **Empaquetado y Construcción** | Vite | Entorno de desarrollo rápido y generación de archivos estáticos optimizados para producción. |
| **Estilos** | CSS Modular / CSS Organizado | Estilos encapsulados por componente y variables CSS globales sin sobrecarga de librerías innecesarias. |
| **Base de Datos y Backend (BaaS)** | Supabase (PostgreSQL) | Almacenamiento relacional de catálogo, clientes, pedidos, pagos, asignaciones por producto, entregas, cupones, configuración y auditoría. |
| **Autenticación y Roles** | Supabase Auth | Registro e inicio de sesión de clientes y administradores mediante **correo electrónico + contraseña** (correo obligatorio y único, verificación SMS desactivada inicialmente y registro rápido integrado en el checkout). |
| **Almacenamiento de Imágenes** | Supabase Storage | Alojamiento de portadas y galerías de productos, banners de tienda (`public-assets`) y capturas de comprobantes de pago (`payment-receipts`). |
| **Almacenamiento de Entregables** | Google Drive y MediaFire (Inicial) | Repositorios externos iniciales mediante enlaces permanentes gestionados por producto/versión, con arquitectura preparada para migrar a almacenamiento privado en la nube con enlaces temporales firmados. |
| **Canal de Comprobantes y Entrega** | WhatsApp (Enlaces `wa.me` preparados) | Apertura automática en checkout con código/resumen de pedido para envío manual de comprobantes, y despacho administrativo de enlaces individuales mediante mensajes preparados de WhatsApp. |
| **Control de Versiones** | GitHub | Repositorio central de código fuente e integración continua con el entorno de despliegue. |
| **Hosting Frontend** | Cloudflare Pages | Distribución global por CDN de la aplicación compilada con Vite. |
| **Funciones de Servidor** | Cloudflare Workers | Ejecución en el borde (*edge*) cuando sea necesario para validaciones de servidor o futura generación de enlaces temporales de descarga. |

### 1.2. Flujo de Comunicación entre Componentes
1. **Cliente Web (Navegador) → Cloudflare Pages:** El usuario o administrador accede a la aplicación web servida estáticamente desde la red global de Cloudflare Pages.
2. **Frontend (React) → Supabase (Auth, Database, Storage):**
   - El frontend se comunica con la API de Supabase utilizando exclusivamente la clave pública anónima (`anon key`) combinada con el token JWT del usuario autenticado.
   - Las políticas de **Row Level Security (RLS)** y funciones transaccionales (`RPC`) en PostgreSQL garantizan qué registros puede leer o modificar cada rol (visitante, cliente autenticado o administrador).
3. **Integración de Flujo Manual con WhatsApp:**
   - **En el Checkout:** Al confirmar la compra, el frontend registra el pedido en Supabase (`PENDIENTE_PAGO`) y abre una URL estructurada de WhatsApp (`https://wa.me/...`) con el código y resumen del pedido para que el cliente envíe manualmente su comprobante de Yape, Plin o transferencia bancaria.
   - **En el Panel Administrativo (Entregas):** Una vez que el administrador verifica manualmente el pago y asigna el 100 % del importe a un producto, el panel administrativo genera el mensaje preparado de WhatsApp hacia el teléfono obligatorio del cliente con el enlace individual de descarga y registra el envío (`ENTREGADO`).
4. **Acceso y Evolución de Archivos Descargables (Drive/MediaFire → Descargas Temporales):**
   - **Fase Inicial (Enlaces permanentes de Google Drive y MediaFire):** Los enlaces base o personalizados se almacenan en tablas protegidas por RLS (`download_links` y `deliveries`). Nunca se exponen en el catálogo público. Solo cuando un ítem tiene el 100 % del pago verificado (`is_fully_paid = true`), el administrador envía el enlace por WhatsApp y lo habilita en la vista privada del cliente.
   - **Fase Futura (Almacenamiento privado y enlaces temporales):** La capa de servicios (`deliveries.service.ts`) y la tabla `deliveries` están desacopladas del proveedor de archivos; cuando se migre de Drive/MediaFire a un bucket privado (Supabase Storage privado o Cloudflare R2), un **Cloudflare Worker** verificará el `access_token` de la entrega y emitirá una URL firmada temporal de corta duración sin cambiar la estructura de pedidos ni pagos.

---

## 2. Estructura de Carpetas y Archivos

El proyecto sigue una arquitectura modular por dominios y responsabilidades, manteniendo una base limpia y alineada con los ocho documentos del proyecto:

```text
smartlab-store/
├── docs/                          # Documentación funcional y técnica completa del proyecto
│   ├── 01_VISION_PROYECTO.md
│   ├── 02_REQUERIMIENTOS.md
│   ├── 03_ARQUITECTURA.md
│   ├── 04_BASE_DATOS.md
│   ├── 05_PEDIDOS_PAGOS.md
│   ├── 06_DISENO_VISUAL_UX_UI.md
│   ├── 07_SEGURIDAD.md
│   └── 08_PLAN_SPRINTS.md
├── public/                        # Activos estáticos públicos y configuración Cloudflare
│   ├── _headers                   # Cabeceras HTTP de seguridad (CSP, X-Frame-Options)
│   └── _redirects                 # Regla SPA (/* /index.html 200)
├── supabase/
│   └── migrations/                # Scripts SQL de esquema, funciones RPC, triggers y RLS
├── src/
│   ├── assets/                    # Iconos locales y recursos gráficos estáticos
│   ├── styles/                    # Arquitectura CSS organizada (Sistema Techoze-04)
│   │   ├── variables.css          # Variables globales (paleta Techoze-04, tipografía, radios)
│   │   ├── reset.css              # Normalización de estilos base
│   │   └── utilities.css          # Clases utilitarias reutilizables
│   ├── config/                    # Configuración e inicialización de clientes
│   │   ├── env.ts                 # Validación y exportación tipada de variables VITE_
│   │   └── supabaseClient.ts      # Instancia única del cliente Supabase (anon key)
│   ├── types/                     # Definiciones globales de TypeScript
│   │   ├── catalog.types.ts       # Productos (FREE/PRO/PERSONALIZADO), categorías, versiones
│   │   ├── order.types.ts         # Carrito, pedidos (vencimiento 72h), pagos, asignaciones, entregas
│   │   └── user.types.ts          # Perfiles (correo obligatorio y único, teléfono obligatorio) y roles
│   ├── context/                   # Estado global ligero con React Context
│   │   ├── AuthContext.tsx        # Sesión de usuario y rol (customer / admin)
│   │   └── CartContext.tsx        # Estado del carrito en S/ (PEN) y cupones aplicados
│   ├── services/                  # Capa de acceso a datos (llamadas a Supabase / RPC / Workers)
│   │   ├── auth.service.ts
│   │   ├── catalog.service.ts
│   │   ├── coupons.service.ts
│   │   ├── orders.service.ts
│   │   ├── payments.service.ts
│   │   ├── deliveries.service.ts
│   │   ├── cancellations.service.ts
│   │   ├── storage.service.ts
│   │   └── admin.service.ts
│   ├── utils/                     # Utilidades transversales
│   │   ├── whatsapp.ts            # Generador de enlaces y mensajes preparados de WhatsApp
│   │   └── currency.ts            # Formateo numérico estricto en Soles (PEN / S/)
│   ├── hooks/                     # Custom hooks reutilizables (useAuth, useCart, useCatalog)
│   ├── components/                # Componentes UI compartidos
│   │   ├── common/                # Botones, badges, modales, alertas, tablas (con .module.css)
│   │   └── guards/                # Protectores de rutas (PrivateRoute, AdminRoute)
│   ├── layouts/                   # Estructuras visuales diferenciadas
│   │   ├── PublicLayout/          # Header Techoze-04 (3 niveles), mega-buscador, footer
│   │   └── AdminLayout/           # Sidebar administrativa (#0F172A), topbar operativa
│   ├── modules/                   # Módulos funcionales separados por área
│   │   ├── store/                 # Área A: Tienda Pública (Fiel a Techoze-04)
│   │   │   ├── home/              # Inicio, menú vertical, hero, Deal of the Day, tabs
│   │   │   ├── catalog/           # Catálogo, buscador y filtros
│   │   │   ├── product-detail/    # Ficha de producto (imágenes, versión, precio S/, modalidades)
│   │   │   ├── custom-request/    # Solicitud de productos personalizados
│   │   │   ├── cart/              # Carrito de compras y validación de cupones
│   │   │   ├── checkout/          # Datos comprador, creación de pedido y apertura de WhatsApp
│   │   │   ├── account/           # Login, registro, perfil, historial de pedidos, saldos y descargas
│   │   │   └── support/           # Contacto y Preguntas Frecuentes (FAQ)
│   │   └── admin/                 # Área B: Panel Administrativo
│   │       ├── dashboard/         # KPIs comerciales, pagos por verificar y entregas listas
│   │       ├── products/          # CRUD de productos, categorías, versiones, enlaces e imágenes
│   │       ├── pricing/           # Gestión de precios en S/ y promociones
│   │       ├── customers/         # Directorio e historial de clientes
│   │       ├── orders/            # Gestión de pedidos, estados, vencimientos y solicitudes a medida
│   │       ├── payments/          # Verificación manual de comprobantes y asignación por producto
│   │       ├── deliveries/        # Despacho individual por WhatsApp (solo ítems 100% pagados)
│   │       ├── coupons/           # Gestión de cupones de descuento
│   │       ├── cancellations/     # Cancelaciones, resoluciones administrativas y reembolsos
│   │       ├── audit/             # Bitácora inmutable de auditoría (audit_logs)
│   │       └── reports-settings/  # Reportes en S/ y configuración general (cuentas, QR, WhatsApp)
│   ├── routes/                    # Definición central de rutas públicas, de cliente y de admin
│   │   └── AppRouter.tsx
│   ├── App.tsx                    # Punto de montaje de proveedores y enrutador
│   └── main.tsx                   # Punto de entrada de React
├── workers/                       # Código de Cloudflare Workers (para funciones edge futuras)
├── .env.example                   # Plantilla de variables de entorno públicas
├── index.html                     # Documento raíz HTML
├── package.json                   # Dependencias mínimas y scripts de construcción
├── tsconfig.json                  # Configuración estricta de TypeScript
└── vite.config.ts                 # Configuración de empaquetado de Vite
```

---

## 3. Separación entre Tienda Pública y Panel Administrativo

Aunque ambas áreas conviven en el mismo repositorio para compartir tipos de TypeScript (`types/`), servicios (`services/`) y componentes base (`components/common/`), se encuentran estrictamente separadas a nivel lógico, visual y de seguridad:

### 3.1. Separación de Enrutamiento y Layouts
- **Rutas de Tienda Pública (`/`, `/catalogo`, `/producto/:slug`, `/checkout`):** Envueltas en `PublicLayout` (estética comercial Techoze-04). La ruta `/checkout` integra el **registro rápido de cliente** (correo obligatorio y único + contraseña, junto con teléfono obligatorio para WhatsApp) en caso de que el visitante aún no haya iniciado sesión, creando su cuenta y su pedido en un solo paso.
- **Rutas de Cuenta de Cliente (`/mi-cuenta/*`):** Envueltas en `PrivateRoute`, que verifica una sesión activa en Supabase Auth para que el cliente pueda **consultar sus pedidos, estados, saldos por producto** y acceder a las entregas autorizadas.
- **Rutas del Panel Administrativo (`/admin/*`):** Envueltas en `AdminRoute` y renderizadas bajo `AdminLayout` (interfaz SaaS operativa de alta densidad). Utilizan carga diferida (*Lazy Loading* / `React.lazy`) para no incrementar el tamaño del paquete descargado por los visitantes de la tienda.

### 3.2. Separación de Permisos, Acceso Administrativo y Seguridad de Datos (Corrección Retroactiva Sprint 03)
- **Validación en Frontend (UX y Control de Rutas):**
  - El guardián `AdminRoute` verifica el estado de autenticación y el rol del perfil (`public.profiles.role_id`):
    - **Sin sesión activa:** Redirige inmediatamente a `/login` guardando la ubicación de origen (`state.from`).
    - **Con sesión activa pero sin rol `ADMIN` (`role_id` distinto de `'admin'` / `'ADMIN'` o cuenta inactiva):** Deniega el acceso renderizando una vista de bloqueo `403 Acceso Denegado (RBAC)` sin montar el `AdminLayout` ni los módulos administrativos, ofreciendo cerrar sesión para ingresar con una cuenta autorizada.
    - **Con sesión activa y rol `ADMIN`:** Permite el acceso a `/admin/*`.
- **Prohibición de Autoasignación de Rol `ADMIN`:**
  - El servicio `auth.service.ts` nunca envía ni sobrescribe `role_id` desde el navegador durante el registro (`signUp`).
  - En PostgreSQL, el trigger `trg_on_auth_user_created` crea todo perfil nuevo con `role_id = 'customer'` ignorando cualquier metadato en `raw_user_meta_data`, y el trigger `trg_prevent_profile_role_escalation` (`BEFORE INSERT OR UPDATE ON public.profiles`) bloquea a nivel de motor cualquier intento de un usuario no administrador de asignarse `ADMIN` o alterar `role_id` / `is_active`.
- **Creación Controlada del Primer Administrador:**
  - Se ejecuta exclusivamente mediante configuración manual controlada en el SQL Editor de Supabase invocando `SELECT public.promote_user_to_admin('correo@dominio.com');` (definida en la migración `005_admin_bootstrap_and_role_hardening.sql`), sin exponer jamás `service_role` ni credenciales privilegiadas en el frontend.
- **Validación Real en Backend (Supabase RLS):** La ocultación de rutas o botones en React es solo la primera barrera. La verdadera barrera de seguridad reside en **Supabase Row Level Security (RLS)** apoyada en la función `public.is_admin()` (`upper(trim(role_id)) = 'ADMIN' AND is_active = true`):
  - Las tablas y operaciones administrativas (modificación de productos, verificación de pagos, asignación de importes en `payment_allocations`, habilitación de enlaces de Google Drive/MediaFire en `deliveries`, cancelaciones, reembolsos y lectura de `audit_logs`) rechazan cualquier operación SQL que no provenga de un usuario con rol `admin` / `ADMIN` activo en la base de datos.

---

## 4. Conexión con Supabase

### 4.1. Cliente Único en el Frontend (`supabaseClient.ts`)
La aplicación inicializa una única instancia del cliente oficial de Supabase utilizando la URL del proyecto y la clave pública `anon`. Esta clave es segura para el navegador únicamente porque todas las tablas tienen políticas **RLS (Row Level Security)** activas. Jamás se incluye ni expone `service_role` en el navegador.

### 4.2. Uso de los Servicios de Supabase
1. **Supabase Auth:**
   - Gestiona el registro e inicio de sesión de clientes y administradores mediante **correo electrónico + contraseña** con tokens JWT renovados automáticamente (flujo PKCE).
   - **Correo obligatorio y único:** Todo usuario requiere un correo electrónico único para crear su cuenta.
   - **Teléfono obligatorio y sin SMS inicial:** El número de teléfono es obligatorio en el registro/checkout para el contacto y entrega por WhatsApp, pero **la verificación SMS estará desactivada inicialmente** (sin costos ni dependencia de pasarelas SMS).
   - **Registro rápido en Checkout y Rol por Defecto:** Permite registrar al comprador con correo + contraseña + teléfono directamente durante el checkout, asignándole siempre el rol `customer` en servidor.
2. **Supabase Database (PostgreSQL):**
   - Almacena el catálogo de las 6 categorías, productos (`FREE`, `PRO`, `PERSONALIZADO`), precios en `PEN (S/)`, cupones, pedidos (con **vencimiento predeterminado de 72 horas**, configurable desde el panel administrativo en `store_settings`), ítems con snapshots históricos, pagos, asignaciones de pago por producto (`payment_allocations`), entregas individuales (`deliveries`), cancelaciones, resoluciones administrativas, reembolsos y auditoría (`audit_logs`).
   - Las operaciones compuestas críticas (creación de pedido en checkout con cálculo real de precios, aprobación de pago con asignación a productos sin sobreasignación, y cancelación manual con bloqueo de entregas pendientes) se ejecutan mediante **funciones transaccionales PostgreSQL (`RPC`)** para garantizar atomicidad ACID.
3. **Supabase Storage:**
   - **Bucket Público (`public-assets`):** Almacena imágenes de portada de productos, capturas de galería, códigos QR públicos de cobro y banners de la tienda. Solo el rol `admin` tiene permiso de escritura/eliminación; la lectura es pública.
   - **Bucket Privado (`payment-receipts`):** Almacena las capturas de comprobantes de pago (Yape, Plin, transferencia bancaria) adjuntadas por el cliente o por el administrador al recibir el comprobante por WhatsApp, así como los comprobantes de reembolsos ejecutados. Solo el propietario del pedido y el administrador pueden acceder mediante URLs firmadas temporales.

---

## 5. Variables de Entorno

### 5.1. Regla Estricta de Seguridad de Claves
- **PROHIBIDO en el Frontend:** La clave `SUPABASE_SERVICE_ROLE_KEY` (clave `service_role` que ignora las políticas RLS) y cualquier credencial privada **NUNCA** deben incluirse en archivos `.env` consumidos por Vite, ni llevar el prefijo `VITE_`, ni enviarse al navegador bajo ninguna circunstancia.
- **Permitido en el Frontend:** Únicamente variables públicas de conexión que llevan el prefijo `VITE_`.

### 5.2. Variables del Frontend (Vite / Cloudflare Pages)
Definidas en `.env.example` para desarrollo local y en el panel de configuración de Cloudflare Pages para producción:

```env
# URL pública del proyecto en Supabase
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"

# Clave pública anónima (segura para navegador siempre que RLS esté activo)
VITE_SUPABASE_ANON_KEY="tu-anon-key-publica"

# URL opcional de Cloudflare Worker para operaciones de servidor o futuras descargas temporales
VITE_WORKER_API_URL="https://api-smartlab.tu-dominio.workers.dev"
```

### 5.3. Variables Privadas del Servidor (Exclusivas de Cloudflare Workers)
Configuradas únicamente como secretos cifrados (*Encrypted Secrets*) dentro del entorno de **Cloudflare Workers** y jamás accesibles desde React:

```env
# Exclusivo para ejecución interna en Cloudflare Workers cuando sea indispensable
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="clave-privada-nunca-expuesta-al-navegador"
```

---

## 6. Integración con Cloudflare Pages y Workers

### 6.1. Despliegue Continuo en Cloudflare Pages
- **Conexión con GitHub:** El repositorio de GitHub se vincula directamente con **Cloudflare Pages**.
- **Configuración de Compilación (Build):**
  - *Comando de construcción:* `npm run build`
  - *Directorio de salida:* `dist`
  - *Rama de producción:* `main` (las ramas secundarias o Pull Requests generan despliegues de vista previa automáticos).
- **Enrutamiento SPA y Seguridad HTTP:**
  - Se incluye `public/_redirects` (`/* /index.html 200`) para resolver las rutas de React al recargar el navegador.
  - Se incluye `public/_headers` para aplicar cabeceras de seguridad (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

### 6.2. Uso de Cloudflare Workers (Funciones de Servidor bajo Demanda)
El sistema opera en su fase inicial conectando el frontend con Supabase mediante políticas RLS y funciones PostgreSQL (`RPC`), utilizando WhatsApp para la recepción manual de comprobantes y el envío asistido de enlaces de Google Drive y MediaFire. Los **Cloudflare Workers** quedan preparados en la arquitectura para:
- **Migración futura a enlaces temporales:** Servir como proxy o firmador de URLs temporales de un solo uso o con expiración corta cuando los archivos descargables se trasladen de Google Drive/MediaFire a almacenamiento privado.
- **Tareas programadas o integraciones futuras:** Ejecución de procesos en servidor que requieran secretos privados sin exponerlos al navegador.

---

## 7. Desarrollo, Mantenimiento y Escalabilidad

### 7.1. Flujo de Desarrollo y Mantenimiento
1. **Tipado Estricto y Modularidad:** El uso de TypeScript en toda la aplicación asegura que cualquier cambio en la estructura de productos, pedidos, asignaciones de pago o entregas sea detectado en tiempo de compilación antes de subir cambios a GitHub.
2. **Estilos con CSS Modular y Variables Globales:** El uso de módulos CSS (`NombreComponente.module.css`) apoyados en las variables del diseño Techoze-04 evita colisiones de clases entre la tienda pública y el panel administrativo.
3. **Control de Versiones en GitHub:** Trabajo organizado por sprints secuenciales, manteniendo la rama principal (`main`) siempre estable y libre de datos de prueba ficticios.

### 7.2. Estrategia de Escalabilidad Progresiva de Entregables
La arquitectura distingue claramente entre la operación inicial y su evolución futura sin requerir rediseñar la base de datos:
- **Etapa 1 (Lanzamiento — Enlaces permanentes en Google Drive y MediaFire):**
  - Los archivos descargables se alojan en Google Drive y MediaFire.
  - Sus URLs se registran en `download_links` (`provider = 'GOOGLE_DRIVE' | 'MEDIAFIRE'`) o como enlace específico en `deliveries.custom_download_url`.
  - Cuando un producto alcanza el 100 % de pago verificado, el administrador envía manualmente el enlace al cliente mediante un mensaje preparado de WhatsApp y habilita su visualización en la cuenta del cliente.
- **Etapa 2 (Evolución futura — Almacenamiento privado y descargas temporales):**
  - Los archivos se trasladan a un bucket privado (`PRIVATE_STORAGE`) y el campo `deliveries.access_token` (junto con `token_expires_at`) permite que un Cloudflare Worker genere enlaces de descarga temporales con caducidad automática, manteniendo intacto todo el historial de pedidos, pagos y entregas.
