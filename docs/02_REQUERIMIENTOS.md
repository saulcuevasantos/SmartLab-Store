# Requerimientos Funcionales — SmartLab Store

## 1. Introducción
Este documento especifica los requerimientos funcionales de **SmartLab Store**, alineados con la visión comercial definida en `01_VISION_PROYECTO.md`. Contempla la comercialización de herramientas y soluciones digitales en el mercado peruano en Soles (`PEN` / `S/`), abarcando productos gratuitos (**FREE**), profesionales de pago (**PRO**) y soluciones personalizadas bajo solicitud (**PERSONALIZADO**), en las categorías de **Excel**, **Google Sheets**, **Sistemas**, **Aplicaciones Android**, **Automatizaciones** y **Recursos Digitales**, con pagos vía **Yape**, **Plin** y **transferencia bancaria**, verificación manual de comprobantes, asignación de pagos por producto y entrega digital inicial mediante mensajes preparados de **WhatsApp**.

---

## Área A. Tienda Pública

### A.1. Inicio, Banners y Categorías
- **Propósito:** Presentar la propuesta de valor de SmartLab Store (bajo la estructura visual Techoze-04), destacar novedades u ofertas y facilitar el acceso rápido a las líneas de productos digitales.
- **Funcionalidades:**
  - Visualización de barra superior informativa, encabezado con mega-buscador, menú vertical de categorías, slider principal y banners laterales apilados.
  - Acceso directo a las seis categorías oficiales: Excel, Google Sheets, Sistemas, Aplicaciones Android, Automatizaciones y Recursos Digitales.
  - Secciones de oferta destacada con cuenta regresiva (*Deal of the Day*), pestañas por categoría, zona de productos FREE y bloque de solicitudes personalizadas.
- **Acciones principales:**
  - Navegar hacia una categoría específica desde el menú vertical o accesos rápidos.
  - Hacer clic en los llamados a la acción (CTA) de los banners para dirigirse a un producto, categoría o formulario de solicitud personalizada.
  - Explorar vitrinas de productos destacados, más vendidos, novedades y ofertas.

### A.2. Catálogo, Buscador y Filtros
- **Propósito:** Permitir a los usuarios explorar, buscar y segmentar de manera rápida los productos digitales disponibles en la tienda.
- **Funcionalidades:**
  - Listado paginado o estructurado de productos activos con vista resumida (imagen 1:1, título, versión, categoría, distintivo FREE/PRO/PERSONALIZADO y precio en `S/`).
  - Buscador por palabras clave con selector de categoría integrado.
  - Filtros combinables por categoría, modalidad de producto (`FREE`, `PRO`, `PERSONALIZADO`), estado de promoción y rango de precios en Soles (`S/`).
  - Ordenamiento del listado (más recientes, más vendidos, menor a mayor precio, mayor a menor precio).
- **Acciones principales:**
  - Ingresar términos en la barra de búsqueda y visualizar resultados reactivos.
  - Aplicar o limpiar filtros de categoría, modalidad y precio.
  - Abrir la vista rápida (*Quick View*) o seleccionar un producto para ir a su ficha detallada.

### A.3. Fichas de Productos
- **Propósito:** Mostrar toda la información técnica, visual y comercial necesaria para que el usuario evalúe el producto digital antes de descargarlo, comprarlo o solicitarlo.
- **Funcionalidades:**
  - Galería de imágenes y capturas del producto.
  - Título, categoría asignada, SKU y distintivo de modalidad (**FREE**, **PRO** o **PERSONALIZADO**).
  - Descripción detallada del propósito de la herramienta y el problema que resuelve.
  - Listado de características funcionales y requisitos técnicos (versión de Excel, compatibilidad con Android, requisitos de uso).
  - Información de la versión actual del producto y notas de versión (*changelog*).
  - Visualización del precio regular en Soles (`S/`) y precio promocional (si aplica).
- **Acciones principales:**
  - Ampliar o recorrer la galería de imágenes del producto.
  - Revisar especificaciones técnicas, alcance y versión.
  - Ejecutar la acción principal según el tipo de producto: obtener/descargar (FREE), agregar al carrito o comprar ahora (PRO), o solicitar cotización/adaptación (PERSONALIZADO).

### A.4. Productos FREE, PRO y Personalizados
- **Propósito:** Gestionar el comportamiento específico de adquisición según las tres modalidades del modelo de negocio de SmartLab Store.
- **Funcionalidades:**
  - **Modalidad FREE (`S/ 0.00`):** Permite generar el pedido sin costo o acceder a la entrega gratuita dado que su importe requerido es `S/ 0.00` (100 % cubierto desde su creación).
  - **Modalidad PRO:** Flujo comercial de pago en Soles (`S/`) que permite adquirir uno o varios productos en un mismo pedido, con verificación manual de pagos y asignación de importes por producto.
  - **Modalidad PERSONALIZADO:** Permite registrar una solicitud de desarrollo o adaptación a medida (indicando nombre, correo electrónico, teléfono obligatorio para WhatsApp, categoría y detalle del requerimiento) y, una vez cotizado, gestionarlo como un ítem de pedido con precio acordado en `S/`.
- **Acciones principales:**
  - Adquirir sin costo recursos gratuitos.
  - Añadir uno o varios productos PRO al carrito para proceder al checkout.
  - Enviar una solicitud de producto personalizado o abrir consulta directa por WhatsApp.

### A.5. Carrito de Compras
- **Propósito:** Agrupar uno o varios productos digitales seleccionados por el cliente antes de iniciar el proceso de checkout y calcular los importes en Soles (`S/`).
- **Funcionalidades:**
  - Resumen de productos agregados con miniatura, nombre, versión, modalidad y precio unitario vigente en `S/` (cantidad fija `1` por licencia de producto).
  - Campo para ingreso y validación de cupones de descuento activos.
  - Cálculo automático de importe bruto, descuentos aplicados (promociones o cupones) y monto total neto a pagar en `PEN` (`S/`).
- **Acciones principales:**
  - Agregar o quitar productos digitales del carrito (sin permitir duplicados del mismo producto).
  - Aplicar o remover un código de cupón de descuento.
  - Vaciar el carrito o avanzar hacia la pantalla de Checkout.

### A.6. Checkout con Registro Rápido Integrado, Creación del Pedido y Envío a WhatsApp
- **Propósito:** Identificar o registrar rápidamente al comprador, recopilar su teléfono obligatorio para contacto por WhatsApp, crear formalmente el pedido (con vencimiento predeterminado de 72 horas) y abrir WhatsApp con el código y resumen del pedido para el envío manual del comprobante.
- **Funcionalidades:**
  - **Registro rápido integrado en el checkout:** Si el comprador aún no ha iniciado sesión, puede crear su cuenta directamente dentro del checkout ingresando su **correo electrónico (obligatorio y único)** y **contraseña**, o iniciar sesión sin abandonar el proceso de compra. Si ya tiene sesión activa, sus datos se precargan automáticamente.
  - **Datos obligatorios del comprador:** Nombre completo, **correo electrónico obligatorio y único** (vinculado a su cuenta) y **número de teléfono obligatorio para el checkout y contacto por WhatsApp** (sin verificación SMS inicialmente). El documento (DNI/RUC) es opcional.
  - Selección informativa del método de pago preferido: **Yape**, **Plin** o **Transferencia bancaria**.
  - Visualización clara de las instrucciones de pago oficiales de SmartLab Store (número de celular y QR para Yape/Plin, cuentas bancarias en Soles, CCI y nombre del titular) junto con el monto total neto en `S/` y la indicación del plazo de vencimiento del pedido (**72 horas predeterminadas**, configurable desde el panel administrativo).
  - **Creación del pedido al finalizar el checkout:** Al confirmar el checkout, el sistema registra inmediatamente el pedido en estado `PENDIENTE_PAGO` con su código único (ej. `SL-2026-000123`), calcula su fecha de vencimiento (`expires_at`, 72 horas por defecto) y guarda el snapshot histórico de cada producto (nombre, versión y precio en `S/`).
  - **Apertura automática/directa de WhatsApp:** Tras crear el pedido, el checkout abre WhatsApp hacia el número oficial de SmartLab Store con un mensaje preparado que incluye el código del pedido, los productos solicitados, el monto total en `S/` y el medio de pago elegido, para que **el cliente envíe su comprobante manualmente**.
  - Opción complementaria para que el cliente también pueda subir la imagen del comprobante y número de operación desde el detalle de su pedido en su cuenta web.
- **Acciones principales:**
  - Completar el registro rápido integrado (o usar su sesión activa) e ingresar el número de teléfono obligatorio para WhatsApp.
  - Elegir el método de pago (Yape, Plin o transferencia bancaria).
  - Finalizar el checkout para crear el pedido y abrir WhatsApp con el resumen preparado.
  - Enviar manualmente el comprobante de pago por WhatsApp (o adjuntarlo en su historial de pedidos).

### A.7. Registro e Inicio de Sesión de Clientes y Administradores
- **Propósito:** Permitir a los usuarios crear y acceder a su cuenta personal para gestionar sus compras y consultar sus pedidos y estados, así como permitir que el administrador autenticado ingrese de forma segura al panel administrativo (`/admin`).
- **Funcionalidades:**
  - **Autenticación mediante correo electrónico + contraseña** en Supabase Auth.
  - **Correo electrónico obligatorio y único** para crear una cuenta.
  - **Número de teléfono obligatorio** para el checkout y contacto por WhatsApp.
  - **Verificación SMS desactivada inicialmente:** El teléfono se valida en formato numérico sin requerir envío de códigos OTP por SMS.
  - Disponible tanto desde las páginas dedicadas de Login/Registro como mediante el **registro rápido integrado en el checkout**.
  - **Asignación exclusiva de rol cliente en el registro (Corrección Retroactiva Sprint 03):** Todo registro público o desde checkout asigna de forma forzada e inmutable el rol `customer` en el servidor (`trg_on_auth_user_created` y `trg_prevent_profile_role_escalation`), ignorando cualquier metadato (`raw_user_meta_data`) o intento de autoasignación del rol `ADMIN`.
  - **Habilitación controlada del primer Administrador:** El primer administrador no se crea desde un formulario público; se habilita mediante configuración manual controlada en Supabase SQL Editor (`public.promote_user_to_admin(email)`) e inicia sesión por `/login` con su correo y contraseña.
  - Recuperación de contraseña por correo electrónico y gestión de perfil del cliente.
- **Acciones principales:**
  - Registrarse con correo electrónico único, contraseña, nombre y teléfono (en página de registro o en el registro rápido del checkout) obteniendo siempre el rol `customer`.
  - Iniciar y cerrar sesión (redirigiendo automáticamente a `/admin` si el perfil verificado tiene rol `ADMIN`, o a `/mi-cuenta` si es cliente).
  - Actualizar datos de perfil y teléfono de contacto (sin posibilidad de modificar `role_id` ni `is_active`).

### A.8. Historial y Seguimiento de Pedidos desde la Cuenta del Cliente
- **Propósito:** Permitir que **el cliente consulte sus pedidos y estados desde su cuenta**, brindando transparencia sobre el estado de pago y entrega individual de cada producto, sus saldos pendientes y los enlaces habilitados.
- **Funcionalidades:**
  - Listado histórico de pedidos del cliente en `/mi-cuenta/pedidos` con fecha de creación, fecha de vencimiento, código de pedido, monto total neto en `S/`, monto total verificado abonado, saldo pendiente y estado general del pedido (`PENDIENTE_PAGO`, `PAGO_EN_REVISION`, `PAGO_PARCIAL`, `PAGO_VERIFICADO`, `COMPLETADO`, `VENCIDO`, `OBSERVADO`, `CANCELADO`, `REEMBOLSADO`).
  - **Desglose individual por producto dentro del pedido:** Muestra para cada producto su precio neto, monto pagado asignado, saldo faltante y estado de entrega individual (`PENDIENTE_PAGO`, `LISTO_PARA_ENTREGA`, `ENTREGADO`, `REVOCADO`).
  - Aviso claro de que **los comprobantes en revisión no confirman el pago** hasta ser verificados por el administrador, y que **al vencer un pedido se conservan íntegramente sus pagos verificados y saldos históricos**.
  - Acceso a los enlaces de descarga únicamente para aquellos productos cuyo pago asignado esté al 100 % y cuya entrega haya sido autorizada/enviada.
- **Acciones principales:**
  - Consultar desde su cuenta todos sus pedidos, el estado general y el saldo pagado/pendiente de cada producto.
  - Enviar por WhatsApp o subir un nuevo comprobante (para pagos parciales adicionales o subsanación de comprobantes observados).
  - Acceder a los enlaces de los productos que ya se encuentran pagados al 100 % y entregados.

### A.9. Página de Contacto y Preguntas Frecuentes (FAQ)
- **Propósito:** Resolver dudas habituales sobre el funcionamiento de la tienda, métodos de pago, pagos parciales, vencimiento de pedidos, tiempos de verificación y entrega por WhatsApp, además de ofrecer un canal directo de comunicación.
- **Funcionalidades:**
  - Sección de Preguntas Frecuentes (FAQ) organizada por temas: registro rápido en checkout, envío de comprobantes por WhatsApp, verificación manual de Yape/Plin/Transferencia, pagos parciales, plazo de vencimiento de 72 horas, entrega de enlaces al 100 % del pago y política de no reembolso de productos con enlace enviado.
  - Formulario de contacto y botón directo al WhatsApp oficial de SmartLab Store.
- **Acciones principales:**
  - Consultar respuestas en el listado desplegable de preguntas frecuentes.
  - Enviar una consulta o abrir chat directo de soporte por WhatsApp.

---

## Área B. Panel Administrativo

### B.0. Control de Acceso Administrativo y Habilitación del Primer ADMIN (Corrección Retroactiva Sprint 03)
- **Propósito:** Garantizar que el acceso a `/admin` y todas las operaciones administrativas estén restringidos exclusivamente a cuentas con rol `ADMIN` (`admin` / `ADMIN`) verificadas en base de datos.
- **Funcionalidades:**
  - **Inicio de sesión administrativo:** El administrador inicia sesión en `/login` con su correo electrónico y contraseña registrados en Supabase Auth.
  - **Comprobación de sesión y rol en `/admin/*`:**
    - Si **no existe sesión activa**, el guardián `<AdminRoute>` redirige inmediatamente a `/login` (conservando la ruta solicitada).
    - Si **existe sesión activa pero el perfil no tiene rol `ADMIN`** (o está inactivo), el sistema deniega el acceso mostrando una pantalla de bloqueo `403 Acceso Denegado (RBAC)` con opción de cerrar sesión o volver a la tienda pública.
  - **Protección en Base de Datos (RLS y Triggers):** Ninguna operación administrativa depende únicamente del frontend; todas las tablas exigen `public.is_admin() = true` en Supabase RLS y un trigger `BEFORE INSERT OR UPDATE` en `public.profiles` bloquea cualquier intento de un usuario de asignarse a sí mismo el rol `ADMIN`.

### B.1. Dashboard Comercial
- **Propósito:** Ofrecer al administrador una vista centralizada del estado operativo y comercial de SmartLab Store.
- **Funcionalidades:**
  - Indicadores principales (KPIs): pagos/comprobantes en revisión, productos listos para entrega (pagados al 100 % pendientes de envío por WhatsApp), pedidos con pago parcial o vencidos con saldo a favor, ingresos verificados acumulados en Soles (`S/`) y solicitudes personalizadas recibidas.
  - Accesos rápidos a las tareas operativas críticas (verificar pagos, asignar importes y enviar enlaces por WhatsApp).
- **Acciones principales:**
  - Filtrar métricas comerciales por rango de fechas.
  - Acceder directamente a los pedidos que requieren verificación manual o despacho de enlaces.

### B.2. Gestión de Productos, Categorías, Versiones e Imágenes
- **Propósito:** Administrar el catálogo completo de productos digitales, sus versiones, enlaces base en Google Drive/MediaFire y las seis categorías del negocio.
- **Funcionalidades:**
  - CRUD completo de productos digitales (crear, listar, editar, activar/desactivar o archivar de forma lógica).
  - Asignación de categoría (`excel`, `google_sheets`, `sistemas`, `android_apps`, `automatizaciones`, `recursos_digitales`) y modalidad (`FREE`, `PRO`, `PERSONALIZADO`).
  - Gestión de galería de imágenes por producto en Supabase Storage (`public-assets`).
  - Gestión de versiones (`product_versions`) y registro de **enlaces de descarga iniciales en Google Drive y MediaFire** (`download_links`), preparado para soportar en el futuro rutas de almacenamiento privado y enlaces temporales.
- **Acciones principales:**
  - Publicar y editar productos FREE, PRO o PERSONALIZADO.
  - Subir, ordenar o eliminar imágenes de portada y galería.
  - Registrar nuevas versiones y actualizar sus enlaces de Google Drive o MediaFire.

### B.3. Gestión de Precios y Promociones
- **Propósito:** Configurar los valores comerciales en Soles (`S/`) de los productos PRO y aplicar descuentos promocionales.
- **Funcionalidades:**
  - Definición de precio regular en `PEN` (`S/`) para cada producto PRO (`S/ 0.00` obligatorio para productos FREE).
  - Configuración de precio promocional menor al precio regular y activación/desactivación de oferta.
  - Configuración de producto destacado en oferta (*Deal of the Day*).
- **Acciones principales:**
  - Establecer o modificar el precio en Soles (`S/`) de un producto (sin afectar los snapshots históricos de pedidos ya creados).
  - Activar o desactivar promociones.

### B.4. Gestión de Clientes
- **Propósito:** Administrar el directorio de compradores y consultar su historial de pedidos, pagos, saldos y entregas.
- **Funcionalidades:**
  - Listado y buscador de clientes por nombre, correo electrónico (obligatorio y único), teléfono obligatorio para WhatsApp o documento.
  - Ficha del cliente con datos de contacto, historial de pedidos, pagos verificados, saldos en pedidos parciales o vencidos y solicitudes personalizadas.
  - Control de estado de cuenta (activo / suspendido).
- **Acciones principales:**
  - Consultar clientes y revisar su historial comercial.
  - Actualizar datos de soporte o estado del cliente.

### B.5. Gestión de Pedidos, Estados y Vencimientos (72 Horas Configurables)
- **Propósito:** Controlar el ciclo de vida completo de cada pedido multi-producto, incluyendo vencimientos configurables y solicitudes personalizadas.
- **Funcionalidades:**
  - Bandeja de pedidos con filtros por estado (`PENDIENTE_PAGO`, `PAGO_EN_REVISION`, `PAGO_PARCIAL`, `PAGO_VERIFICADO`, `COMPLETADO`, `VENCIDO`, `OBSERVADO`, `CANCELADO`, `REEMBOLSADO`), fecha, método de pago y cliente.
  - Vista detallada del pedido con sus productos (snapshots inmutables), estado de pago y estado de entrega individual de cada ítem.
  - **Gestión de vencimientos (72 horas predeterminadas, configurable):** Los pedidos tienen un plazo de vencimiento predeterminado de **72 horas** desde su creación, configurable desde el panel administrativo. Al vencer un pedido (`VENCIDO`), se aplican las reglas financieras y de asignación de pagos ya definidas, **sin eliminar pagos ni alterar saldos históricos**, permitiendo reactivarlo si el cliente abona el saldo restante o resolverlo administrativamente.
  - Bandeja de solicitudes de productos personalizados (`custom_requests`) para cotizar y generar pedidos a medida.
- **Acciones principales:**
  - Gestionar las transiciones de estado del pedido y revisar el historial de cambios (`order_status_history`).
  - Marcar o reactivar pedidos vencidos conservando íntegramente sus abonos y saldos históricos.
  - Registrar notas internas y atender solicitudes personalizadas.

### B.6. Verificación Manual de Pagos y Asignación por Producto
- **Propósito:** Validar manualmente los comprobantes recibidos (por WhatsApp o web) de Yape, Plin o transferencia bancaria y distribuir cada importe verificado entre los productos del pedido.
- **Funcionalidades:**
  - Registro de comprobantes recibidos por WhatsApp o revisión de comprobantes subidos por el cliente (visor privado de capturas, método de pago, importe reportado, número de operación y fecha).
  - Dictamen de verificación manual:
    - **En revisión (`PENDIENTE`):** No confirma pago ni suma al saldo pagado.
    - **Aprobado (`APROBADO`):** El administrador confirma que el dinero ingresó a la cuenta real y define el `amount_verified`.
    - **Observado (`OBSERVADO`) / Rechazado (`RECHAZADO`):** Registra el motivo de inconsistencia para notificar al cliente por WhatsApp.
  - **Asignación de pagos por producto (`payment_allocations`):** Herramienta para distribuir el `amount_verified` de un pago aprobado entre uno o varios productos del pedido:
    - Soporta **pagos parciales** y múltiples abonos a lo largo del tiempo.
    - Bloquea cualquier intento de **sobreasignación** (no se puede asignar más que el monto verificado del pago ni superar el precio neto pendiente de cada producto).
    - Actualiza automáticamente el estado `is_fully_paid = true` únicamente en los productos que alcanzan el 100 % de su precio neto.
- **Acciones principales:**
  - Registrar o inspeccionar un comprobante de Yape, Plin o transferencia bancaria.
  - Aprobar, observar o rechazar el pago.
  - Asignar el monto verificado a los productos correspondientes del pedido.

### B.7. Gestión de Entregas Individuales por WhatsApp
- **Propósito:** Ejecutar y controlar la entrega digital individual de cada producto únicamente cuando dicho producto se encuentre pagado al 100 %.
- **Funcionalidades:**
  - Bloqueo estricto en interfaz y base de datos: No permite habilitar ni enviar enlaces de productos cuyo saldo pagado sea menor al 100 % (`is_fully_paid = false`).
  - Selección del enlace base del producto (Google Drive / MediaFire) o asignación de un enlace personalizado (`custom_download_url`) para el ítem del pedido.
  - **Generador de mensajes preparados de WhatsApp por producto:** Una vez que el producto está pagado al 100 %, el administrador dispone de un botón que prepara y abre el mensaje de WhatsApp dirigido al teléfono del cliente con el enlace individual de descarga, nombre del producto, versión e instrucciones, marcando el ítem como `ENTREGADO` y registrando la fecha/hora de envío (`sent_at`) y el administrador responsable.
  - Habilitación simultánea del enlace en el panel web del cliente y preparación para futura migración a enlaces temporales firmados.
- **Acciones principales:**
  - Verificar que el producto individual esté pagado al 100 % (`LISTO_PARA_ENTREGA`).
  - Enviar manualmente el enlace individual al cliente mediante el mensaje preparado de WhatsApp y marcar la entrega como realizada (`ENTREGADO`).
  - Revocar enlaces en caso de cancelación o resolución administrativa sobre ítems no entregados.

### B.8. Gestión de Cupones
- **Propósito:** Crear y administrar códigos promocionales de descuento aplicables en el carrito de compras.
- **Funcionalidades:**
  - Creación de cupones con código único, tipo de descuento (porcentaje o monto fijo en `S/`), compra mínima, tope de descuento, fechas de vigencia y límite de usos.
  - Activación y desactivación manual de cupones y consulta de historial de canjes (`coupon_usages`).
- **Acciones principales:**
  - Crear, editar y activar/desactivar cupones de descuento.

### B.9. Cancelaciones, Resoluciones Administrativas y Reembolsos
- **Propósito:** Gestionar de forma controlada la anulación de pedidos, el bloqueo de entregas pendientes y la devolución efectiva de dinero sobre productos no entregados.
- **Funcionalidades:**
  - **Cancelación manual:** Al cancelar manualmente un pedido, el sistema **bloquea inmediatamente todas las entregas pendientes** y exige registrar una **resolución administrativa** (`administrative_resolutions`) con el sustento de la decisión.
  - **Regla estricta de reembolsos:**
    - **Un producto cuyo enlace ya fue enviado (`ENTREGADO` / `sent_at IS NOT NULL`) NO es reembolsable bajo ninguna circunstancia.**
    - **Los productos no entregados** (con pagos parciales o totales previos al envío del enlace) pueden evaluarse administrativamente para reembolso.
  - **Registro de reembolso efectivo (`refunds`):** Un reembolso solo se considera completado y cambia el estado cuando el administrador registra la devolución real del dinero en `S/` indicando método (Yape, Plin o Transferencia), cuenta/celular de destino, titular, número de operación de devolución y comprobante.
- **Acciones principales:**
  - Cancelar un pedido bloqueando entregas pendientes y registrando la resolución administrativa obligatoria.
  - Evaluar importes abonados en productos no entregados.
  - Ejecutar la devolución de dinero y registrar los datos de la transferencia efectiva para completar el reembolso.

### B.10. Reportes, Auditoría y Configuración General
- **Propósito:** Analizar el desempeño comercial, auditar acciones críticas y administrar los parámetros operativos de SmartLab Store.
- **Funcionalidades:**
  - **Reportes comerciales:** Ingresos verificados en `S/` por fecha, categoría y método de pago; saldos pendientes en pedidos parciales o vencidos; productos más vendidos y reembolsos ejecutados.
  - **Visor de Auditoría (`audit_logs`):** Consulta inmutable de acciones administrativas (verificación de pagos, asignaciones por producto, envíos de enlaces, cancelaciones, resoluciones y reembolsos).
  - **Configuración General (`store_settings`):** Administración del número oficial de WhatsApp de la tienda, números y códigos QR de Yape y Plin, cuentas bancarias (BCP, BBVA, Interbank) y titulares, **plazo de vencimiento de pedidos (`order_expiration_hours`, predeterminado en 72 horas y configurable)**, banners de inicio y preguntas frecuentes (FAQ).
- **Acciones principales:**
  - Consultar reportes comerciales y registros de auditoría.
  - Actualizar cuentas de pago, QR, WhatsApp oficial, horas de vencimiento de pedidos y contenidos configurables de la tienda.

---

## 2. Matriz de Permisos por Rol

| Módulo / Acción | Visitante (No autenticado) | Cliente Registrado | Administrador |
| :--- | :---: | :---: | :---: |
| Explorar inicio, catálogo, buscador, filtros y fichas de producto | Sí | Sí | Sí |
| Consultar página de contacto y Preguntas Frecuentes (FAQ) | Sí | Sí | Sí |
| Agregar productos al carrito y validar cupones | Sí | Sí | Sí |
| Registrarse e iniciar sesión con correo electrónico único + contraseña | Sí | Sí | Sí |
| Completar Checkout con registro rápido integrado, crear pedido y abrir WhatsApp | Sí (Crea su cuenta mediante el registro rápido integrado en el checkout con correo único + teléfono obligatorio) | Sí | N/A (Gestión interna) |
| Enviar comprobante manualmente por WhatsApp / subir captura en pedido | No (Se autentica al finalizar el checkout) | Sí (Solo en pedidos propios) | Sí (Registro manual de soporte) |
| Consultar sus pedidos, estados y saldos desde su cuenta | No | Sí (Solo propios) | Sí (Todos los pedidos) |
| Recibir y acceder a enlaces de productos pagados al 100 % | No | Sí (Solo ítems 100 % pagados y entregados) | Sí (Control total) |
| Gestionar catálogo, categorías, versiones, precios y cupones | No | No | Sí (Exclusivo) |
| Verificar comprobantes (Yape/Plin/Banco) y asignar importes por producto | No | No | Sí (Exclusivo) |
| Enviar enlaces individuales por WhatsApp y gestionar entregas | No | No | Sí (Exclusivo) |
| Ejecutar cancelaciones, resoluciones administrativas y reembolsos efectivos | No | No | Sí (Exclusivo) |
| Consultar bitácora de auditoría, reportes y configuración general (incl. vencimiento 72h) | No | No | Sí (Exclusivo) |

---

## 3. Validaciones Importantes del Sistema

1. **Autenticación, Registro Rápido y Datos del Comprador:**
   - **Autenticación mediante correo electrónico + contraseña**, con **verificación SMS desactivada inicialmente**.
   - **El correo electrónico es obligatorio y único** para crear una cuenta.
   - **El número de teléfono es obligatorio** para el checkout y el contacto por WhatsApp.
   - El **registro rápido está integrado en el checkout** para usuarios nuevos, vinculando inmediatamente el pedido creado a su cuenta para que puedan consultar sus pedidos y estados.
2. **Creación del Pedido, Vencimiento de 72 Horas y Comprobantes en Revisión:**
   - El pedido se crea al finalizar el checkout en estado `PENDIENTE_PAGO`, con un **vencimiento predeterminado de 72 horas** (configurable desde el panel administrativo), y abre WhatsApp con el código y resumen del pedido.
   - El envío de un comprobante cambia el estado de seguimiento a `PAGO_EN_REVISION`, pero **los comprobantes en revisión no confirman el pago** ni incrementan el saldo pagado de ningún producto hasta que el administrador apruebe el pago y realice la asignación.
3. **Pagos Parciales, Asignación por Producto y No Sobreasignación:**
   - Todo pago aprobado (`amount_verified`) debe asignarse explícitamente a uno o más ítems del pedido (`payment_allocations`).
   - La suma asignada de un pago nunca puede superar su `amount_verified`, y la suma de pagos asignados a un producto nunca puede superar su precio neto (`subtotal_price`).
   - Un pedido con abonos verificados menores al total neto permanece en `PAGO_PARCIAL`.
4. **Reglas Financieras en Pedidos Vencidos:**
   - Al vencer un pedido (`VENCIDO` tras las 72 horas predeterminadas o el plazo configurado), **se aplican las reglas financieras y de asignación de pagos definidas, sin eliminar pagos ni alterar saldos históricos**.
5. **Restricción Estricta de Entrega al 100 % del Pago:**
   - Ningún producto puede marcarse como entregado ni mostrar/enviar su enlace de descarga mientras su saldo pagado asignado sea menor al 100 % de su importe neto (`allocated_paid_amount < subtotal_price`).
6. **Bloqueo por Cancelación y Regla de Reembolsos:**
   - Una cancelación manual bloquea automáticamente todas las entregas pendientes del pedido y exige registrar una resolución administrativa.
   - **Un producto cuyo enlace ya fue enviado (`ENTREGADO`) no es reembolsable.** Solo los productos no entregados pueden ser evaluados para reembolso, el cual requiere el registro de la devolución efectiva del dinero para considerarse completado.

---

## 4. Criterios de Aceptación Globales

### 4.1. Para la Tienda Pública
- **CA-01 (Exploración y Catálogo):** El usuario puede navegar por el diseño Techoze-04, filtrar por las 6 categorías oficiales y por modalidad (`FREE`, `PRO`, `PERSONALIZADO`), visualizando precios en `S/` y versiones.
- **CA-02 (Checkout con Registro Rápido y Apertura de WhatsApp):** El comprador puede finalizar el checkout mediante su sesión activa o el registro rápido integrado (con correo electrónico obligatorio y único + contraseña, y número de teléfono obligatorio para WhatsApp sin SMS inicial), creándose el pedido con vencimiento predeterminado de 72 horas y abriéndose WhatsApp con el código y resumen del pedido para enviar el comprobante manualmente.
- **CA-03 (Consulta de Pedidos y Estados desde su Cuenta):** El cliente puede iniciar sesión con su correo y contraseña y consultar desde su cuenta todos sus pedidos y estados, diferenciando comprobantes en revisión (que aún no confirman pago), pagos parciales asignados a cada producto, saldos históricos conservados en pedidos vencidos y enlaces disponibles solo para productos pagados al 100 % y entregados.

### 4.2. Para el Panel Administrativo
- **CA-04 (Administración de Catálogo, Configuración y Vencimiento):** El administrador gestiona productos, categorías, versiones, precios en `S/`, cupones, enlaces iniciales de Google Drive/MediaFire y el plazo de vencimiento de pedidos (72 horas por defecto).
- **CA-05 (Verificación y Asignación por Producto):** El administrador verifica manualmente los pagos de Yape, Plin o transferencia bancaria y asigna el importe a cada producto del pedido sin permitir sobreasignaciones.
- **CA-06 (Entrega Manual Preparada por WhatsApp):** Cuando un producto alcanza el 100 % de pago verificado, el administrador puede enviar su enlace individual mediante un mensaje preparado de WhatsApp y dejar registrada la entrega.
- **CA-07 (Cancelaciones, Reembolsos y Auditoría):** Al cancelar manualmente un pedido se bloquean todas las entregas pendientes y se exige resolución administrativa; el sistema impide reembolsar productos cuyo enlace ya fue enviado y solo marca un reembolso como completado al registrar la devolución efectiva del dinero, dejando traza en auditoría.
