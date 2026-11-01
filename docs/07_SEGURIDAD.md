# Políticas y Medidas de Seguridad — SmartLab Store

**Arquitectura:** React + TypeScript + Vite (Cloudflare Pages) & Supabase (Auth, PostgreSQL, RLS, RPC, Storage) & GitHub  
**Moneda y Operación:** Soles Peruanos (`PEN` / `S/`) — Pagos vía Yape, Plin y Transferencia Bancaria  
**Principio Rector:** *"La seguridad reside en el servidor y la base de datos (Supabase RLS, restricciones SQL y funciones transaccionales). Ocultar un botón o proteger una ruta en React solo mejora la experiencia de usuario (UX); nunca sustituye la autorización en backend."*

---

## 1. Matriz de Controles por Capa Tecnológica

| Vector de Seguridad | Capa Frontend (React + Vite en Cloudflare Pages) | Capa Backend / Base de Datos (Supabase PostgreSQL + Storage) | Capa Servidor / Edge (Cloudflare Workers / Futuro Proxy) |
| :--- | :--- | :--- | :--- |
| **Autenticación y Datos de Contacto** | Manejo de sesión con Supabase Auth SDK (`correo + contraseña`, flujo PKCE); registro rápido integrado en checkout; validación de correo obligatorio/único y teléfono obligatorio (sin SMS inicial). | Emisión y validación de tokens JWT; tabla `profiles` con `email NOT NULL UNIQUE` y `phone_number NOT NULL`. | Validación de JWT en cabeceras `Authorization: Bearer <token>` cuando se invoquen Workers. |
| **Control de Acceso (RBAC)** | Guardianes visuales de rutas (`<AdminRoute>`, `<PrivateRoute>`); redirecciones ante roles no autorizados. | **Row Level Security (RLS)** obligatorio en el 100 % de tablas públicas; función `public.is_admin()`. | Ejecución de tareas privilegiadas únicamente previa verificación de rol `admin`. |
| **Integridad Financiera y de Pedidos** | Cálculo informativo en carrito y bloqueo visual de formularios inválidos. | Funciones RPC transaccionales, restricciones `CHECK`, triggers contra sobreasignación y preservación de saldos históricos en pedidos vencidos (72h por defecto, configurable). | Validación en servidor cuando aplique. |
| **Seguridad de Entregas y Enlaces** | Ocultación de botones de descarga en ítems no pagados al 100 %; generación de mensajes preparados de WhatsApp para el admin. | RLS en `download_links` y `deliveries` que bloquea la lectura si `is_fully_paid = false` o `is_enabled = false`. | Preparado para futura migración de enlaces permanentes (Drive/MediaFire) a enlaces temporales firmados. |
| **Protección de Secretos** | Exclusivamente variables públicas con prefijo `VITE_` (`VITE_SUPABASE_ANON_KEY`). **Cero claves privadas**. | Clave `service_role` restringida al entorno interno de Supabase; nunca expuesta en cliente. | Almacenamiento de `SUPABASE_SERVICE_ROLE_KEY` como secreto cifrado en Cloudflare Workers. |

---

## 2. Autenticación, Sesiones y Protección de Datos Personales

### 2.1. Registro, Inicio y Cierre de Sesión (Correo + Contraseña, Sin SMS Inicial)
- **Proveedor de Identidad:** Se utiliza **Supabase Auth** mediante **correo electrónico + contraseña** y flujo **PKCE (Proof Key for Code Exchange)**.
- **Reglas de Identificación y Registro Rápido:**
  - **El correo electrónico es obligatorio y único** para crear una cuenta (`profiles.email NOT NULL UNIQUE`).
  - **El número de teléfono es obligatorio** para el checkout y el contacto por WhatsApp (`profiles.phone_number NOT NULL`, `orders.buyer_phone NOT NULL`).
  - **La verificación SMS estará desactivada inicialmente:** No se envían códigos OTP por SMS, evitando costos adicionales y fricción en el checkout; el número de teléfono se valida por formato y se emplea para la comunicación de pago y entrega por WhatsApp.
  - **Registro rápido integrado en el checkout:** Los compradores visitantes crean su cuenta (correo único + contraseña + nombre + teléfono obligatorio) directamente al confirmar el checkout, quedando autenticados para consultar sus pedidos y estados desde su cuenta (`/mi-cuenta/pedidos`).
- **Políticas de Contraseñas y Cierre de Sesión:**
  - Contraseñas con mínimo 8 caracteres almacenadas bajo hash criptográfico seguro en Supabase Auth.
  - El cierre de sesión (`signOut`) invalida el token de actualización y limpia inmediatamente el estado de sesión en el navegador.

### 2.2. Protección de Datos Personales
- Los datos personales de los clientes (nombre, correo obligatorio y único, teléfono obligatorio, DNI/RUC opcional y capturas de comprobantes) están protegidos por políticas RLS de aislamiento por propietario (`auth.uid()`).
- Ningún visitante ni cliente puede consultar perfiles, correos, teléfonos ni pedidos pertenecientes a otros compradores.

---

## 3. Roles, Permisos y Control de Acceso (RBAC)

El sistema aplica tres niveles de acceso verificados en base de datos:

1. **Visitante (`anon`):**
   - Solo lectura del catálogo activo (`categories`, `products`, `product_images`, `product_versions`), configuración pública (`store_settings` con `is_public = true`) y gestión de su carrito temporal.
   - **Prohibido:** Consultar enlaces de descarga de pago, pedidos, clientes o comprobantes.
2. **Cliente Autenticado (`authenticated` / `customer`):**
   - Puede finalizar el checkout para crear sus propios pedidos (`orders` y `order_items`), consultar el estado y saldos de sus pedidos y adjuntar comprobantes en revisión (`payments` con estado `PENDIENTE`).
   - Solo puede leer registros de `deliveries` de sus propios ítems cuando estén pagados al 100 % (`is_fully_paid = true`) y habilitados (`is_enabled = true`).
   - **Prohibido:** Aprobar pagos, asignar importes en `payment_allocations`, habilitar entregas, modificar precios o solicitar reembolsos sobre productos cuyo enlace ya fue enviado.
3. **Administrador (`admin`):**
   - Único rol autorizado en base de datos para gestionar el catálogo, verificar comprobantes de pago, asignar importes por producto, enviar y habilitar enlaces de entrega, registrar resoluciones administrativas, ejecutar cancelaciones manuales, registrar reembolsos efectivos y auditar eventos.

### Función de Verificación de Rol en PostgreSQL
Definida en el esquema `public` para ser invocada por todas las políticas RLS:

```text
Función: public.is_admin()
Atributos: SECURITY DEFINER, SET search_path = public
Retorna: BOOLEAN
Lógica: Retorna TRUE únicamente si existe un registro en public.profiles donde id = auth.uid(), upper(trim(role_id)) = 'ADMIN' e is_active = true.
```

### 3.1. Procedimiento Seguro de Creación del Primer Administrador y Blindaje contra Escalamiento de Rol (Corrección Retroactiva Sprint 03)

1. **Imposibilidad de Autoasignación del Rol `ADMIN`:**
   - **En el Registro (`signUp`):** El frontend (`auth.service.ts`) jamás envía `role_id` ni ejecuta `.upsert()` sobre `public.profiles` al registrar un usuario. El trigger `public.handle_new_auth_user()` (`AFTER INSERT ON auth.users`) asigna de forma estática `role_id = 'customer'`, ignorando cualquier campo `role`, `role_id` o `is_admin` inyectado en `raw_user_meta_data`.
   - **En Modificaciones Directas (`public.profiles`):** Además de la política RLS `profiles_update_own`, el trigger `trg_prevent_profile_role_escalation` (`BEFORE INSERT OR UPDATE ON public.profiles`, incluido en `005_admin_bootstrap_and_role_hardening.sql`) fuerza `role_id = 'customer'` en inserciones de cliente y lanza una excepción SQL si un usuario sin rol `ADMIN` intenta modificar `role_id`, `is_active` o `email`.
2. **Procedimiento Controlado para Habilitar el Primer Administrador en Supabase:**
   - **Paso 1:** Asegurar que las migraciones `001` a `005` (`005_admin_bootstrap_and_role_hardening.sql`) estén aplicadas en el proyecto de Supabase.
   - **Paso 2:** Crear el usuario desde la pantalla de registro (`/registro`) o desde **Supabase Dashboard → Authentication → Users → Add User** con su correo electrónico y contraseña segura. El usuario nacerá con `role_id = 'customer'`.
   - **Paso 3:** Ingresar a **Supabase Dashboard → SQL Editor** (contexto privilegiado de base de datos, sin exponer jamás `service_role` en el navegador) y ejecutar:
     ```sql
     SELECT public.promote_user_to_admin('admin@smartlab.pe');
     ```
     *(Opcionalmente, de forma directa en el SQL Editor: `UPDATE public.profiles SET role_id = 'admin', is_active = true, updated_at = now() WHERE lower(trim(email)) = lower(trim('admin@smartlab.pe'));`).*
   - **Paso 4:** Verificar la promoción ejecutando:
     ```sql
     SELECT id, email, full_name, role_id, is_active FROM public.profiles WHERE lower(email) = 'admin@smartlab.pe';
     ```
3. **Control de Acceso a `/admin`:**
   - El administrador inicia sesión en `/login` con su correo y contraseña.
   - Si no existe sesión activa al intentar acceder a `/admin/*`, `<AdminRoute>` redirige a `/login`.
   - Si existe sesión activa pero el perfil tiene rol `customer` (no `ADMIN`), `<AdminRoute>` deniega el acceso mostrando la pantalla `403 Acceso Denegado (RBAC)` y las políticas RLS de Supabase bloquean cualquier consulta o escritura administrativa.

---

## 4. Políticas de Seguridad por Fila (Row Level Security - RLS)

Todas las tablas del esquema `public` tienen RLS obligatorio (`ENABLE ROW LEVEL SECURITY`).

| Tabla | Operación `SELECT` | Operación `INSERT` | Operación `UPDATE` | Operación `DELETE` |
| :--- | :--- | :--- | :--- | :--- |
| `roles` | Público / Autenticado | Solo `admin` | Solo `admin` | Prohibido |
| `profiles` / `customers` | Propio (`id = auth.uid()`) o `admin` | Propio al registrarse o `admin` | Propio (sin cambiar `role_id` ni `is_active`) o `admin` | Prohibido (borrado lógico) |
| `customer_addresses` | Propio (`customer_id = auth.uid()`) o `admin` | Propio o `admin` | Propio o `admin` | Propio o `admin` |
| `custom_requests` | Propio (`customer_id = auth.uid()`) o `admin` | Público / Cliente (con teléfono obligatorio) | Solo `admin` | Prohibido |
| `categories` / `products` / `product_images` / `product_versions` | Público si `is_active = true`; `admin` ve todos | Solo `admin` | Solo `admin` | Prohibido en productos con pedidos (borrado lógico) |
| `download_links` | Solo `admin`, o `customer` con entrega activa y pagada al 100 % | Solo `admin` | Solo `admin` | Solo `admin` |
| `carts` / `cart_items` | Propio (`user_id` o `session_token`) o `admin` | Propio | Propio | Propio |
| `orders` / `order_items` | Propio (`customer_id = auth.uid()`) o `admin` | Cliente vía función segura de checkout (`PENDIENTE_PAGO`) o `admin` | Solo `admin` (snapshots son inmutables) | **Prohibido para todos** |
| `payments` | Propio (`order.customer_id = auth.uid()`) o `admin` | Cliente (solo en estado `PENDIENTE` y `amount_verified = NULL`) o `admin` | Solo `admin` | **Prohibido para todos** |
| `payment_allocations` | Propio (`order.customer_id = auth.uid()`) o `admin` | **Solo `admin`** | **Solo `admin`** | **Prohibido** (se usa reversión controlada) |
| `deliveries` | Solo `admin`, o `customer` dueño si `is_fully_paid = true`, `is_enabled = true` y `revoked_at IS NULL` | **Solo `admin`** | **Solo `admin`** | **Prohibido** (se usa revocación) |
| `coupons` / `coupon_usages` | `coupons` activos para validar; `coupon_usages` propios o `admin` | `coupons`: solo `admin`; `coupon_usages`: en creación de pedido | Solo `admin` | Prohibido |
| `administrative_resolutions` | **Solo `admin`** | **Solo `admin`** | Prohibido (inmutable) | Prohibido |
| `order_cancellations` | Propio (`order.customer_id = auth.uid()`) o `admin` | **Solo `admin`** (requiere `resolution_id`) | Solo `admin` | Prohibido |
| `refunds` | Propio (`order.customer_id = auth.uid()`) o `admin` | **Solo `admin`** (bloqueado si el ítem ya fue entregado) | **Solo `admin`** | Prohibido |
| `store_settings` | Público si `is_public = true`; `admin` ve todos | Solo `admin` | Solo `admin` | Solo `admin` |
| `order_status_history` | Propio (`order.customer_id = auth.uid()`) o `admin` | Sistema / `admin` | Prohibido (inmutable) | Prohibido |
| `audit_logs` | **Solo `admin`** | Triggers del sistema / `admin` | **Prohibido (inmutable)** | **Prohibido** |

---

## 5. Seguridad de Enlaces de Descarga y Almacenamiento Privado

### 5.1. Diferencia entre Enlaces Iniciales (Drive/MediaFire) y Futuras Descargas Temporales
La arquitectura de seguridad contempla dos etapas claramente diferenciadas:

1. **Etapa Inicial — Enlaces Permanentes de Google Drive y MediaFire (`PERMANENT_EXTERNAL`):**
   - Los archivos descargables se alojan inicialmente en cuentas de Google Drive y MediaFire administradas por SmartLab Store.
   - **Protección en Base de Datos:** Las URLs nunca se incluyen en la tabla `products` ni se devuelven en consultas del catálogo público. Residen en `download_links` y `deliveries`, protegidas por RLS.
   - **Control de Entrega:** Un enlace solo se envía manualmente por el administrador mediante un mensaje preparado de WhatsApp (y se habilita en la cuenta del cliente) cuando el producto específico tiene `is_fully_paid = true` (100 % pagado).
   - **Limitación Conocida y Mitigación:** Al ser enlaces externos de Drive/MediaFire, una vez enviado el enlace al cliente comprador, el archivo depende de los permisos del proveedor externo. Por ello:
     - **Regla comercial de blindaje:** Todo producto cuyo enlace ya fue enviado (`sent_at IS NOT NULL` / `ENTREGADO`) queda bloqueado de forma definitiva contra reembolsos.
     - En caso de rotación o actualización de enlaces por seguridad, el administrador puede cambiar la URL en `download_links` o asignar una `custom_download_url` por pedido.
2. **Etapa Futura — Almacenamiento Privado y Enlaces Temporales (`TEMPORARY_SIGNED`):**
   - Cuando se apruebe la migración hacia almacenamiento privado en la nube (Supabase Storage privado o Cloudflare R2), `download_links.link_mode` cambiará a `TEMPORARY_SIGNED`.
   - El cliente ya no verá una URL permanente, sino que utilizará el `deliveries.access_token` con fecha de caducidad (`token_expires_at`) para que un **Cloudflare Worker** valide en tiempo real que el pedido sigue activo y genere una URL firmada temporal de pocos minutos de duración.

### 5.2. Seguridad en Supabase Storage (Imágenes y Comprobantes)
- **Bucket `public-assets` (Público de solo lectura):** Almacena imágenes de productos, categorías y banners. Escritura restringida a `public.is_admin() = true`. Límite de 2 MB y formatos de imagen seguros (`webp`, `png`, `jpg`).
- **Bucket `payment-receipts` (Privado):** Almacena capturas de comprobantes de pago (recibidos por WhatsApp o subidos en web) y comprobantes de devolución de reembolsos. Acceso público bloqueado; visualización exclusiva mediante URLs firmadas temporales para el dueño del pedido y el administrador.

---

## 6. Controles en Operaciones Financieras, Pagos, Entregas y Reembolsos

1. **Integridad en la Creación del Pedido en Checkout:**
   - El frontend nunca dicta el precio de un producto al crear el pedido. La función en base de datos consulta el precio vigente real en `products`, valida el cupón en `coupons`, genera los snapshots inmutables en `order_items` y crea el pedido en `PENDIENTE_PAGO`.
2. **Comprobantes en Revisión No Confirman Pago:**
   - Un registro en `payments` con `verification_status = 'PENDIENTE'` no puede tener asignaciones en `payment_allocations` ni modificar `total_paid_amount` ni habilitar entregas.
3. **Prohibición Técnica de Sobreasignación de Pagos:**
   - Validada por trigger en PostgreSQL: la suma de `payment_allocations.allocated_amount` para un `payment_id` nunca puede superar `payments.amount_verified`, y para un `order_item_id` nunca puede superar `order_items.subtotal_price`.
4. **Entrega Exclusiva al 100 % de Pago:**
   - Restricción `CHECK` y política RLS impiden que un ítem pase a `LISTO_PARA_ENTREGA` o `ENTREGADO`, o que `deliveries.is_enabled` sea `true`, si `order_items.is_fully_paid` es `false`.
5. **Vencimiento de 72 Horas (Configurable) y Conservación de Saldos Históricos:**
   - Todo pedido se crea con un plazo de vencimiento predeterminado de **72 horas** (configurable desde el panel administrativo en `store_settings`).
   - Al pasar un pedido al estado `VENCIDO`, un trigger en PostgreSQL aplica las reglas financieras definidas e impide eliminar pagos (`payments`, `payment_allocations`) o alterar saldos históricos (`total_paid_amount` y `allocated_paid_amount`).
6. **Bloqueo por Cancelación Manual y Resolución Obligatoria:**
   - Ninguna cancelación manual puede registrarse en `order_cancellations` sin un `resolution_id` válido en `administrative_resolutions`, y su ejecución revoca inmediatamente todas las entregas pendientes del pedido.
7. **Bloqueo de Reembolso en Productos con Enlace Enviado y Prueba de Devolución Efectiva:**
   - Trigger en PostgreSQL rechaza cualquier inserción en `refunds` si el `order_item_id` tiene `item_delivery_status = 'ENTREGADO'` o `deliveries.sent_at IS NOT NULL`.
   - Restricción `CHECK` en `refunds` impide marcar un reembolso como `COMPLETADO` si no se han registrado el método de devolución, cuenta de destino, número de operación y fecha efectiva de transferencia.

---

## 7. Protección de Claves, Variables de Entorno y Mitigación Web

### 7.1. Prohibición Absoluta de Exponer `service_role` en el Frontend
- La clave `SUPABASE_SERVICE_ROLE_KEY` **jamás** debe incluirse en variables con prefijo `VITE_`, ni en el repositorio de GitHub, ni en la configuración de compilación de Cloudflare Pages.
- El frontend utiliza únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

### 7.2. Protección contra SQL Injection, XSS, CSRF y Abuso
- **SQL Injection:** Uso exclusivo de consultas parametrizadas y llamadas RPC tipadas mediante `@supabase/supabase-js`.
- **XSS (Cross-Site Scripting):** Escapado nativo de React, prohibición de `dangerouslySetInnerHTML` con datos de usuario y cabeceras `Content-Security-Policy (CSP)`, `X-Content-Type-Options: nosniff` y `X-Frame-Options: DENY` en `public/_headers`.
- **CSRF:** Autenticación basada en tokens JWT enviados en cabeceras `Authorization: Bearer`, inmune a ataques CSRF de formulario tradicional.
- **Abuso de Formularios:** Límites de tasa (*Rate Limiting*) en Supabase Auth y campos *honeypot* en formularios de contacto y solicitudes personalizadas.

---

## 8. Auditoría, Copias de Seguridad y Manejo de Errores

1. **Bitácora Inmutable (`audit_logs`):**
   - Registra automáticamente toda acción administrativa crítica: verificación de pagos, asignación de importes por producto, envío de enlaces por WhatsApp, cancelaciones manuales, resoluciones administrativas, reembolsos completados y cambios de precios/configuración.
2. **Copias de Seguridad y Recuperación:**
   - Respaldos automáticos de la base de datos PostgreSQL en Supabase y exportaciones periódicas de seguridad.
   - Control de versiones en GitHub con capacidad de reversión inmediata (*rollback*) de despliegues en Cloudflare Pages.
3. **Manejo Seguro de Errores:**
   - Los errores mostrados al usuario en la interfaz son claros y orientados a la acción, sin exponer jamás nombres internos de tablas, trazas SQL ni detalles de infraestructura.

---

## 9. Checklist de Pruebas de Seguridad Antes de Producción (Validado en Sprint 11)

- [x] **Verificación de RLS al 100 %:** Comprobar que todas las tablas tienen RLS activo y que un cliente no puede leer pedidos, pagos ni enlaces de otro cliente.
- [x] **Escaneo de Paquete Compilado (`dist/`):** Confirmar que `service_role` no existe en ningún archivo generado por Vite.
- [x] **Prueba de Comprobante en Revisión:** Registrar un comprobante en estado `PENDIENTE` / `EN_REVISION` y verificar que el saldo pagado siga en `S/ 0.00` y los enlaces permanezcan inaccesibles.
- [x] **Prueba de Pago Parcial y Sobreasignación:** Verificar un pago parcial, comprobar que solo el producto cubierto al 100 % permite entrega y que la base de datos rechaza cualquier intento de asignar más dinero que el monto verificado.
- [x] **Prueba de Pedido Vencido:** Marcar un pedido con pago parcial como `VENCIDO` y comprobar que conserva intactos sus pagos verificados y saldos por producto.
- [x] **Prueba de Bloqueo de Reembolso tras Envío de Enlace:** Intentar registrar un reembolso sobre un producto cuyo enlace ya fue enviado (`ENTREGADO`) y verificar que la base de datos y el servicio rechacen la operación.
- [x] **Prueba de Cancelación Manual y Reembolso Efectivo:** Ejecutar una cancelación manual verificando que bloquee todas las entregas pendientes, exija resolución administrativa y que un reembolso de producto no entregado solo pase a `COMPLETADO` al registrar los datos de la devolución efectiva del dinero.
