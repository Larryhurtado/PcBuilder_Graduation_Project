# Contexto del proyecto para el asistente de frontend

Documento para el asistente de IA (y para Larry) que construye `apps/web`. Resume qué se va a construir, qué se decidió y cómo habla el frontend con el backend. Se puede pegar completo como contexto.

**Convención de estados:**
- **[Decidido]**: acordado entre Erick y Larry; no cambiar sin hablar con ellos.
- **[Propuesto]**: sugerencia razonable que Erick todavía no ha implementado ni confirmado. Úsala para empezar con datos simulados.

**Regla de oro:** cuando Erick publique los esquemas Zod en `packages/contracts`, **esos esquemas mandan** sobre lo que dice este documento. Los datos simulados (MSW) deben ajustarse a ellos.

---

## 1. Qué es el proyecto

**Agregador y Validador de Hardware**: trabajo de grado de Ingeniería de Sistemas (UNIAJC, Cali). Plataforma web, en español, con dos funciones:

1. **Asistente de ensamblaje (armador):** el usuario elige piezas de un PC y el sistema valida la compatibilidad (reglas RC-01 a RC-08), calcula el consumo en vatios y recomienda la fuente de poder.
2. **Mostrador de ofertas** de tiendas locales colombianas (C.C. Pasarela en Cali, C.C. Unilago en Bogotá). Cada oferta lleva a un botón de **WhatsApp** (enlace `wa.me`). No hay pagos ni envíos: la compra se acuerda por WhatsApp.

Los vendedores son empresas que publican ofertas eligiendo **Categoría → Marca → Modelo** de una base maestra de componentes (así no escriben especificaciones a mano). Un comercio solo puede publicar si está **verificado**.

**Actores:** visitante (sin sesión), cliente (`buyer`), vendedor (`seller`), administrador (`admin`). **Esta semana no se construye ninguna pantalla de administrador.**

**Equipo:** Erick Guapacha (backend, base de datos, motor de compatibilidad) y Larry Hurtado (frontend). Monolito modular en el backend.

---

## 2. Alcance de esta entrega

**[Decidido]** Entrega local (todo en el computador de cada uno), enfocada en **comprador y vendedor**: 19 de las 27 historias de usuario. Sin despliegue y sin pruebas E2E.

| Nivel | Historias | Qué incluye |
|---|---|---|
| 1. Comprador | HU-01, 03, 04, 05, 06, 08, 09, 10, 11, 12 y autenticación | Inicio, buscador, catálogo con filtros y orden, ficha técnica, armador con validación, consumo, selector de piezas compatibles, WhatsApp, registro e inicio de sesión |
| 2. Publicar ofertas | HU-02, 22, 23, 25, 20, 21 | Ofertas destacadas en inicio, convertirse en vendedor, perfil del negocio, WhatsApp oficial, publicar en cascada con fotos |
| 3. Gestión del vendedor | HU-19, 18, 17 | Inventario, interruptor de visibilidad, panel de métricas |
| 4. Extra (solo si sobra tiempo) | HU-15, 16, 14, 13, 07 | Directorio y perfil de tienda, favoritos, armados guardados, enlace compartible y PDF |

**Fuera de alcance esta semana (no construir):** carga de documentos de verificación (HU-24), panel y revisión del administrador (HU-26), pantalla de bloqueo por verificación como flujo completo (HU-27), recuperación de contraseña, rutas `/admin/*`.

**[Decidido] La verificación del vendedor está simulada.** El backend tiene un comando de desarrollo que aprueba una tienda. El frontend solo muestra el **estado** de verificación (chip y mensaje) y bloquea "Publicar producto" si no está aprobada. Los botones "Guardar", "Compartir enlace" y "Descargar cotización" del armador, mientras no existan (nivel 4), se muestran **deshabilitados** con el texto "Próximamente" **[Propuesto]**.

---

## 3. Decisiones tomadas

1. **[Decidido] Fuentes de verdad:** el *Diseño Integral del Sistema* para lo técnico; la *Ruta Scrum* para las historias de usuario y sus criterios de aceptación. Ante una contradicción, manda el Diseño.
2. **[Decidido] Entorno:** local, sin Docker. Node.js 22 LTS. Erick usa PostgreSQL 18 instalado en Windows. Larry no necesita PostgreSQL mientras use datos simulados.
3. **[Decidido] 8 categorías de componente:** `cpu`, `motherboard`, `ram`, `gpu`, `psu`, `case`, `cooler`, `storage`. No existen monitor, sistema operativo ni periféricos en el MVP.
4. **[Decidido] Rutas sin tildes:** `/armador` (no `/builder`), `/catalogo`, `/vendedor/verificacion`.
5. **[Decidido] Sesión:** token de acceso JWT de **15 minutos** y token de refresco de **7 días** en cookie `HttpOnly` (rotatorio). Ver sección 6.
6. **[Decidido] Precios** como **enteros en pesos colombianos (COP)**, sin decimales. Fechas en ISO 8601 UTC; se muestran en zona `America/Bogota`.
7. **[Decidido] El motor de compatibilidad corre en el navegador** (paquete `@hw/compat-engine`, JavaScript puro) para respuesta instantánea. El servidor vuelve a validar solo al guardar o compartir (nivel 4).
8. **[Decidido] Resultado de cada regla en tres estados visibles** (más uno interno): compatible, incompatible, **no verificable** (falta un dato en la base) y no aplica (no se muestra). Un dato faltante **nunca** se muestra como compatible.
9. **[Decidido] Contrato primero:** Erick publica el esquema Zod de cada endpoint **antes** de programarlo. Larry construye cada pantalla con MSW y apaga los simulados cuando el endpoint real exista.
10. **[Decidido] Pruebas unitarias obligatorias** en cada historia (ver sección 12). Sin CI ni E2E esta semana.
11. **[Decidido] Los diseños de pantalla los hizo Stitch (Google).** Son referencia visual: se reconstruyen como componentes React con Tailwind, no se pega el HTML exportado tal cual.
12. **[Decidido] Responsive y accesibilidad:** 360, 768 y 1280 px sin desplazamiento horizontal; las tablas pasan a tarjetas en móvil; contraste AA; botones táctiles de al menos 44 px; **el estado de compatibilidad siempre con icono y texto, nunca solo color**.
13. **[Decidido] Reparto de ramas:** una rama por historia, PR revisado por el otro, fusión a `main` el mismo día.

---

## 4. Stack del frontend

**[Decidido]** React + Vite + Tailwind CSS, JavaScript (sin TypeScript; los tipos salen de los esquemas Zod y de JSDoc).

| Necesidad | Biblioteca |
|---|---|
| Rutas con guardas por rol | `react-router` |
| Estado del servidor (caché, reintentos, paginación) | `@tanstack/react-query` |
| Estado del armado en curso | `zustand` con persistencia en `sessionStorage` |
| Formularios | `react-hook-form` + `@hookform/resolvers/zod` + `zod` |
| Datos simulados en desarrollo y pruebas | `msw` |
| Pruebas | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` |
| Gráfico del panel (se puede recortar) | `recharts` |
| PDF de cotización (solo nivel 4) | `jspdf` |

**Estructura de `apps/web/src`** **[Decidido]**:

```
app/        router, guardas por rol, layout, proveedores
features/   una carpeta por módulo: home, catalog, builder, account, seller, verification, stores
shared/     UI kit, cliente HTTP, hooks, utilidades (formatCOP, buildWhatsAppUrl…)
mocks/      handlers de MSW por endpoint (se comparten entre el navegador y las pruebas)
```

Paquetes del monorepo que el frontend importa:
- `@hw/compat-engine`: reglas de compatibilidad, consumo y restricciones (lo programa Erick).
- `@hw/contracts`: esquemas Zod de peticiones y respuestas y códigos de error (lo publica Erick).

---

## 5. Cómo se comunica con el backend

**Convenciones [Decidido salvo donde se indica]:**

| Tema | Convención |
|---|---|
| Prefijo y versión | `/api/v1`. JSON en UTF-8. |
| Dirección local **[Propuesto]** | API en `http://localhost:3000`, web en `http://localhost:5173`. En Vite se configura un **proxy** de `/api` hacia el puerto 3000, así el frontend llama siempre a rutas relativas (`/api/v1/...`) y no hay problemas de CORS. |
| Autenticación | Cabecera `Authorization: Bearer <accessToken>`. El refresco viaja en cookie, por lo que las llamadas a `/auth/*` usan `credentials: 'include'`. |
| Errores | Siempre `{ "code": "STORE_NOT_VERIFIED", "message": "…", "details": {…}, "requestId": "…" }` con el código HTTP adecuado (400, 401, 403, 404, 409, 422, 429). El frontend decide el mensaje según `code`, no según `message`. |
| Paginación | Por cursor: parámetros `limit` y `cursor`; respuesta `{ "items": [...], "nextCursor": "…" \| null }`. |
| Precios | Enteros en COP (`priceCop: 849000`). Se muestran con separador de miles: `$849.000`. |
| Fechas | ISO 8601 UTC en el JSON. |
| Identificadores | UUID para entidades de negocio; los códigos de categoría son texto. |
| Campos | camelCase en el JSON. |
| Valores desconocidos | `null`, nunca `0`. Un `null` en una especificación significa "dato no verificable". |

### Códigos de error de negocio y mensaje al usuario

| `code` | HTTP | Mensaje al usuario |
|---|---|---|
| `STORE_NOT_VERIFIED` | 403 | Aún no puedes publicar productos hasta que tu negocio sea verificado. |
| `OFFER_DUPLICATE` | 409 | Ya tienes publicado este producto en ese estado. |
| `COMPONENT_NOT_FOUND` | 404 | El producto no está disponible en el catálogo. |
| `FILE_REJECTED` | 422 | El archivo debe ser PDF, JPG o PNG de hasta 5 MB. (Para fotos: JPG o PNG.) |
| `ROLE_FORBIDDEN` | 403 | No tienes permiso para esta acción. |
| `TOKEN_EXPIRED` | 401 | La sesión expiró; se renueva con el refresco. |
| `RATE_LIMITED` | 429 | Demasiados intentos. Intenta de nuevo en unos minutos. |
| `VALIDATION_ERROR` **[Propuesto]** | 400 o 422 | Mostrar los errores por campo que vengan en `details`. |

---

## 6. Autenticación y sesión

**[Decidido]**
- El **token de acceso** (JWT, 15 min) se guarda **solo en memoria** (no en `localStorage`).
- El **token de refresco** (7 días) lo pone el servidor en una cookie `HttpOnly`; el frontend no lo ve.
- Al cargar la aplicación, se llama a `POST /auth/refresh`; si responde con un token, se restaura la sesión; si responde 401, el usuario es visitante.
- Ante `401 TOKEN_EXPIRED` en cualquier llamada: se llama **una sola vez** a `/auth/refresh`, se actualiza el token y se reintenta la petición. Si el refresco falla, se cierra la sesión y se redirige a `/ingresar`.
- **No decodifiquen el JWT** para mostrar datos: usen `GET /me`.
- Los roles son `buyer`, `seller` y `admin`. Las guardas del router usan el rol del usuario.
- Al convertirse en vendedor (`POST /seller/convert`), la respuesta trae un **token nuevo con rol vendedor**: hay que reemplazar el token en memoria.

**Reglas de los formularios de cuenta [Decidido]:** correo con formato válido; contraseña de al menos 10 caracteres; nombre de 2 a 120 caracteres; el registro exige aceptar términos y política de privacidad (se envía la versión aceptada, `v1.0`).

---

## 7. Datos del catálogo: forma de un componente

**[Propuesto, basado en la base de datos ya construida]** Las especificaciones llegan en un objeto `specs` **plano por categoría**, en camelCase. Un dato desconocido es `null`. Los valores de los ejemplos de este documento son ilustrativos, salvo los de la sección 13.

```jsonc
{
  "id": "uuid",
  "category": "gpu",              // cpu | motherboard | ram | gpu | psu | case | cooler | storage
  "brand": "MSI",
  "model": "…",
  "displayName": "…",
  "version": 1,                   // versión del dato en la Base Maestra
  "specs": { "tdpW": 160, "lengthMm": 244, "slotWidth": 2.0, "interface": "PCIe 4.0", "memoryGb": 8, "powerConnectors": { "pcie_8_pin": 1 } }
}
```

**Campos de `specs` por categoría** (nombres tomados de las columnas de la base):

| Categoría | Campos |
|---|---|
| `cpu` | `socket`, `tdpW`, `cores`, `threads`, `baseClockGhz`, `boostClockGhz`, `memoryTypes` (lista, p. ej. `["DDR5"]`), `hasIntegratedGraphics` |
| `motherboard` | `socket`, `formFactor` (ATX, Micro ATX, Mini-ITX, EATX), `chipset`, `ramType` (DDR4/DDR5), `ramSlots`, `ramMaxGb`, `m2Slots` |
| `ram` | `ramType`, `speedMhz`, `modulesQty`, `capacityGb` (del kit completo), `formFactor`, `casLatency` |
| `gpu` | `tdpW`, `lengthMm`, `slotWidth`, `interface`, `memoryGb`, `powerConnectors` |
| `psu` | `wattageW`, `formFactor`, `efficiencyRating`, `modular`, `connectors` |
| `case` | `formFactor`, `supportedMbFormFactors` (lista), `supportedPsuFormFactors` (lista o `null`), `maxGpuLengthMm`, `maxCoolerHeightMm` |
| `cooler` | `heightMm`, `waterCooled`, `radiatorMm`, `sockets` (lista de sockets que soporta) |
| `storage` | `storageType` (SSD/HDD), `interface` (NVMe/SATA), `capacityGb`, `formFactor` |

**Importante para la interfaz:**
- **No hay imágenes de componentes ni de ofertas en los datos de demostración.** Usar una imagen de relleno por categoría (icono) cuando `coverImageUrl` sea `null`.
- Algunos datos faltan a propósito (en la base real, la altura máxima de disipador solo está en el 36 % de las cajas y el formato de fuente en el 19 %). El frontend debe soportar `null` y mostrar "no verificable".

---

## 8. Motor de compatibilidad (`@hw/compat-engine`)

**[Decidido el diseño; la firma exacta la confirma Erick el martes 17]**

```js
import { evaluate, constraintsFor, estimateWatts } from '@hw/compat-engine';

// Un armado: cada ranura con las especificaciones planas de la pieza elegida (sección 7)
const build = { cpu, motherboard, ram, gpu, psu, pcCase, cooler, storage }; // todas opcionales

const result = evaluate(build, params);
// {
//   results: [{ code: 'RC-05', status: 'ok' | 'fail' | 'unknown' | 'not_applicable',
//               severity: 'error' | 'warning', parts: ['gpu','case'], message: '…' }],
//   summary: { incompatible: n, unknown: n, ok: n },
//   estimatedWatts: 300,
//   recommendedPsuW: 400
// }

const filters = constraintsFor('motherboard', build);
// p. ej. { socket: 'AM5', ram_type: 'DDR5' } → se pasan como filtros a GET /offers
```

Nota: la ranura de la caja se llama `pcCase` en el armado (porque `case` es palabra reservada). El estado interno `ok/fail/unknown` se muestra en pantalla como **Compatible / Incompatible / No verificable**.

**Reglas del MVP:**

| Código | Regla |
|---|---|
| RC-01 | Socket de la CPU = socket de la placa |
| RC-02 | Tipo de RAM = tipo que soporta la placa |
| RC-03 | Módulos del kit ≤ ranuras de la placa y capacidad ≤ máximo de la placa |
| RC-04 | Factor de forma de la placa ∈ formatos que soporta la caja |
| RC-05 | Longitud de la GPU ≤ máximo de la caja |
| RC-06 | Altura del disipador ≤ máximo de la caja |
| RC-07 | Socket de la CPU ∈ sockets que soporta el disipador |
| RC-08 | Potencia de la fuente ≥ consumo estimado × 1,25 |

(RC-09 a RC-12 quedan fuera de esta semana.)

**Consumo:** `estimatedWatts = TDP de la CPU + TDP de la GPU + 75`. `recommendedPsuW = ceil(estimatedWatts × 1,25 / 50) × 50`. Ejemplo: 65 + 160 + 75 = 300 W → 375 → **400 W recomendados**. Los valores 75, 1,25 y 50 son parámetros en la base; el motor trae los mismos valores por defecto.

**Mensajes de incompatibilidad** deben incluir las medidas: por ejemplo "La GPU mide 338 mm y la caja admite 330 mm". Un dato faltante se muestra como "No verificable: falta {dato}; confírmalo con la tienda".

**Selector de piezas compatibles (HU-06):** al pulsar "+ Elegir componente", se calculan los filtros con `constraintsFor` y se piden las ofertas con esos filtros. Las piezas con datos faltantes **no se ocultan**: se muestran con la etiqueta "no verificable". Si no hay alternativas compatibles, se avisa y se sugiere cambiar una pieza.

---

## 9. Endpoints que usa el frontend

Las formas de petición y respuesta están **[Propuestas]** hasta que Erick publique los esquemas. Las rutas, el acceso y el uso vienen del Diseño Integral **[Decidido]**.

### Nivel 1: comprador

| Método y ruta | Acceso | Uso | HU |
|---|---|---|---|
| `GET /catalog/search?q=` | Público | Buscador global con sugerencias | 03 |
| `GET /components/{id}` | Público | Ficha técnica: especificaciones, versión, fuente | 12 |
| `GET /offers` | Público | Catálogo con filtros, orden y paginación | 02, 09, 10, 12 |
| `GET /offers/featured` | Público | Ofertas destacadas del inicio | 02 |
| `GET /offers/{id}` | Público | Detalle de una oferta | 08, 12 |
| `POST /compat/constraints` | Público | Filtros del selector (opcional: también se calculan en el navegador) | 06 |
| `POST /compat/validate` | Público | Validación de autoridad (opcional esta semana) | 04, 05 |
| `POST /events` | Público | Registrar vista o clic a WhatsApp | 08 |
| `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Ver sección 6 | Sesión | 13 |
| `GET /me` | Autenticado | Usuario actual | 13 |

**`GET /offers`: parámetros**

| Parámetro | Valores |
|---|---|
| `category` | una de las 8 categorías |
| `brandId` | id numérico de marca |
| `componentId` | para listar las ofertas de un componente (ficha) |
| `q` | texto libre |
| `minPrice`, `maxPrice` | enteros COP |
| `condition` | `new` o `used` |
| `city`, `commercialCenter`, `storeId` | texto o UUID |
| `socket`, `ram_type`, `form_factor`… | filtros técnicos (los mismos que devuelve `constraintsFor`; los nombres exactos los fija `@hw/contracts`) |
| `sort` | `price_asc`, `price_desc`, `newest` |
| `limit`, `cursor` | paginación |
| `includeSpecs` **[Propuesto]** | `true` para traer `component.specs` en cada oferta (lo necesita el armador para evaluar sin pedidos extra) |

**Forma de una oferta en el listado** **[Propuesto]**:

```json
{
  "offerId": "uuid",
  "priceCop": 849000,
  "condition": "new",
  "warrantyMonths": 12,
  "publishedAt": "2026-11-10T15:04:05Z",
  "coverImageUrl": null,
  "component": { "id": "uuid", "category": "cpu", "brand": "AMD", "model": "7600",
                 "displayName": "AMD Ryzen 5 7600", "specs": { "socket": "AM5", "tdpW": 65, "memoryTypes": ["DDR5"] } },
  "store": { "id": "uuid", "name": "TecnoPasarela Cali", "city": "Cali", "department": "Valle del Cauca",
             "commercialCenter": "C.C. Pasarela", "whatsappE164": "+573000000001" }
}
```

`GET /offers/{id}` añade `description`, `images` y, en `store`, `address`, `latitude`, `longitude`.

**`POST /events` [Propuesto]:** cuerpo `{ "offerId": "uuid", "type": "view" | "whatsapp_click" }`, respuesta `204`. Se envía con `navigator.sendBeacon` (cuerpo JSON como `Blob` con tipo `application/json`) para que no se pierda al abrir WhatsApp.

**Auth [Propuesto]:**

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /auth/register` | `{ email, password, fullName, acceptTerms: true, privacyPolicyVersion: "v1.0" }` | `201 { user, accessToken }` |
| `POST /auth/login` | `{ email, password }` | `200 { user, accessToken }` + cookie de refresco |
| `POST /auth/refresh` | (cookie) | `200 { accessToken }` |
| `POST /auth/logout` | (cookie) | `204` |
| `GET /me` | | `{ id, email, fullName, role, status }` |

### Niveles 2 y 3: vendedor

| Método y ruta | Acceso | Uso | HU |
|---|---|---|---|
| `POST /seller/convert` | Cliente | Convertirse en vendedor: `{ legalName, tradeName }` → `201 { store, accessToken }` | 25 |
| `GET /seller/store` | Vendedor | Perfil del negocio | 22, 23 |
| `PATCH /seller/store` | Vendedor | Actualizar perfil, ubicación y WhatsApp | 22, 23 |
| `GET /seller/verification/status` | Vendedor | Estado de verificación | 27 |
| `GET /catalog/brands?category=` | Vendedor | Marcas de la categoría (paso 1 de la cascada) | 20 |
| `GET /catalog/models?category=&brandId=` | Vendedor | Modelos de la marca (paso 2) | 20 |
| `GET /components/{id}` | Público | Al elegir el modelo se cargan sus especificaciones | 20 |
| `POST /seller/offers/images/presign` | Vendedor verificado | Preparar la subida de una foto | 21 |
| `POST /seller/offers` | Vendedor verificado | Crear la oferta | 20, 21 |
| `GET /seller/offers` | Vendedor | Inventario | 19 |
| `PATCH /seller/offers/{id}` | Vendedor verificado, dueño | Editar precio y datos | 19 |
| `PATCH /seller/offers/{id}/visibility` | Vendedor verificado, dueño | Activar o pausar: `{ "status": "active" \| "paused" }` | 18 |
| `DELETE /seller/offers/{id}` | Vendedor, dueño | Baja lógica | 19 |
| `GET /seller/analytics/summary?from=&to=` | Vendedor | Métricas del panel | 17 |

**Formas [Propuestas]:**

- **Tienda (`store`):** `{ id, legalName, tradeName, description, logoUrl, whatsappE164, department, city, address, commercialCenter, latitude, longitude, openingHours, isVerified }`.
- **Estado de verificación:** `{ status, submittedAt, reviewerNote, deadlineAt, canReapplyAt }`, con `status` ∈ `not_submitted | pending_review | correction_requested | approved | rejected | suspended`.
- **Subida de fotos (mismo flujo que tendrá producción):** (1) `POST /seller/offers/images/presign` con `{ fileName, mimeType, sizeBytes }` devuelve `{ uploadUrl, storageKey }`; (2) el navegador hace `PUT` del archivo a `uploadUrl`; (3) al crear la oferta se envía la lista de `storageKey`. Máximo **5 fotos**, de hasta **5 MB**, formato JPG o PNG. En local `uploadUrl` apunta a la propia API.
- **Crear oferta:** `{ componentId, priceCop, condition: "new" | "used", warrantyMonths, description, imageKeys: [] }`. El vendedor solo completa precio, estado, garantía, descripción y fotos; las especificaciones vienen del modelo elegido.
- **Resumen del panel:** `{ totals: { views, whatsappClicks, activeOffers, pausedOffers }, daily: [{ day, views, whatsappClicks }] }`. El panel ofrece rangos de 7 o 30 días.

**Validaciones que el frontend repite con Zod [Decidido]:**

| Campo | Regla |
|---|---|
| Precio | entero mayor que 0, hasta 12 dígitos |
| Garantía | entero de 0 a 120 meses |
| Descripción de la oferta y del negocio | hasta 1000 caracteres |
| Razón social | 2 a 200 caracteres |
| Nombre comercial | 2 a 120 caracteres |
| WhatsApp | el usuario escribe un celular colombiano de 10 dígitos que empieza en 3 (`^3\d{9}$`); se envía como E.164 `+57XXXXXXXXXX` |
| Fotos | máximo 5 por oferta |

---

## 10. Botón de WhatsApp

**[Decidido]** Enlace `https://wa.me/<número E.164 sin el signo +>?text=<mensaje codificado con encodeURIComponent>`. No hay API de WhatsApp.

Mensaje prellenado (el usuario puede editarlo antes de enviar):

> Hola, vi tu publicación de {producto} a {precio} COP en {plataforma}. ¿Sigue disponible?

Ejemplo: número `+573000000001` → `https://wa.me/573000000001?text=Hola%2C%20vi%20tu%20publicaci%C3%B3n%20de%20…`.

Flujo: al hacer clic, primero se envía el evento `whatsapp_click` con `sendBeacon` y luego se abre el enlace. Debe lograrse en **máximo 2 clics** desde la tarjeta o la ficha (idealmente 1). El nombre de la plataforma lo define una constante del frontend.

---

## 11. Pantallas y rutas

**Esta semana [Decidido]:**

| Ruta | Pantalla | Acceso | HU |
|---|---|---|---|
| `/` | Inicio: botón destacado hacia el armador y ofertas destacadas | Todos | 01, 02 |
| `/armador` | Asistente de ensamblaje | Todos | 04, 05, 06, 11 |
| `/catalogo` | Catálogo con filtros y orden | Todos | 03, 09, 10, 11 |
| `/producto/:id` | Ficha técnica y ofertas por tienda | Todos | 08, 12 |
| `/ingresar`, `/registro` | Autenticación | Visitante | 13 |
| `/vender` | Solicitud para convertirse en vendedor | Cliente | 25 |
| `/vendedor` | Panel de métricas | Vendedor | 17 |
| `/vendedor/inventario` | Inventario, precio editable, interruptor de visibilidad | Vendedor | 18, 19 |
| `/vendedor/publicar` | Publicación asistida en 4 pasos | Vendedor verificado | 20, 21 |
| `/vendedor/negocio` | Identidad, ubicación y WhatsApp | Vendedor | 22, 23 |
| `/vendedor/verificacion` | **Solo el estado** de verificación (sin carga de documentos) | Vendedor | 27 |
| `/terminos`, `/privacidad`, `/atribucion` | Páginas estáticas | Todos | Ley 1581 |
| `*` | No encontrado y fallo de conexión con botón de reintento | Todos | |

**Nivel 4 (si sobra tiempo):** `/armado/:codigo`, `/tiendas`, `/tiendas/:id`, `/cuenta`, `/cuenta/armados`, `/cuenta/favoritos`.

**Barra superior persistente:** logo, buscador global con sugerencias, enlaces al catálogo y al armador, y acceso a iniciar sesión o al panel de vendedor.

### Armador (la pantalla más importante)

- **Resumen superior:** estado global (incompatibles, no verificables, compatibles), consumo estimado en vatios y fuente recomendada.
- **8 ranuras** (CPU, placa base, RAM, GPU, almacenamiento, fuente, caja, disipador). Vacía: botón "+ Elegir componente". Llena: imagen (o relleno), nombre, tienda, precio COP, estado de reglas, "Cambiar" y "Quitar".
- **Selector de piezas:** panel lateral (pantalla completa en móvil) con solo piezas compatibles, filtros, orden y tarjetas con "Agregar".
- **Avisos de reglas:** lista con estado, piezas involucradas y explicación con medidas.
- **Total** en COP y botón de WhatsApp por pieza.
- **Estados:** vacío (invitar a empezar por procesador o placa), cargando (esqueletos), sin resultados compatibles, error de red (reintentar).
- El armado vive en `zustand` persistido en `sessionStorage`, así no se pierde al recargar.

**Criterios de aceptación del armador:** (1) al elegir un procesador AM5, el selector de placas muestra solo socket AM5; (2) al combinar placa DDR5 con RAM DDR4 aparece "RC-02 incompatible" señalando ambas piezas; (3) el consumo es la suma de los TDP más 75 W y la fuente recomendada se redondea hacia arriba a múltiplos de 50 W; (4) a 360 px no hay desplazamiento horizontal.

### Panel del vendedor

- Barra del negocio con el **chip de estado de verificación** (color y texto).
- Indicadores: visitas a ofertas, clics a WhatsApp, ofertas activas y pausadas; selector de 7 o 30 días y gráfico diario.
- **Bloqueo:** si el estado no es `approved`, "Publicar producto" aparece deshabilitado con el aviso exacto *"Aún no puedes publicar productos hasta que tu negocio sea verificado"* y un enlace a `/vendedor/verificacion`.
- **Publicar, 4 pasos:** (1) Categoría → Marca → Modelo en cascada, (2) precio, estado, garantía y descripción, (3) hasta 5 fotos, (4) revisión y publicación.
- El interruptor de visibilidad oculta la oferta del catálogo **de inmediato**.

### Mensajes por estado de verificación (pantalla de estado)

| Estado | Mensaje |
|---|---|
| `not_submitted` | Verificación pendiente. (Esta semana la carga de documentos no existe: indicar que la verificación se aprueba en modo demostración.) |
| `pending_review` | Tu solicitud está en revisión. Tiempo estimado: 3 a 5 días hábiles (máximo 15). |
| `correction_requested` | Nota del administrador y plazo de 15 días. |
| `rejected` | Motivo y fecha desde la cual puede volver a solicitar. |
| `approved` | Negocio verificado, con la fecha. |
| `suspended` | Tu cuenta de vendedor está deshabilitada. |

Mensaje de confianza que debe aparecer en la plataforma: **la verificación confirma que el negocio existe, no garantiza el cumplimiento de sus ofertas.**

---

## 12. Pruebas unitarias del frontend

**[Decidido]** Una historia no está terminada sin sus pruebas en verde.

| Qué | Cómo | Meta |
|---|---|---|
| Utilidades: `formatCOP`, `buildWhatsAppUrl` (número E.164 y mensaje codificado), validadores Zod | Vitest | ≥ 80 % de líneas |
| Almacén del armado (agregar, cambiar, quitar, persistir en sesión) | Vitest | ≥ 80 % de líneas |
| Componentes: indicador de compatibilidad (icono y texto), tarjeta de oferta, filtros, ranura del armador, aviso de reglas, formulario en cascada, interruptor de visibilidad | Testing Library | Todo componente con comportamiento propio |
| Páginas principales: armador (el conflicto aparece y desaparece), catálogo (filtros y orden), inicio de sesión, publicar oferta | Testing Library + MSW | Un flujo por pantalla |

Convenciones:
- Los `handlers` de MSW viven en `src/mocks/` y se usan **tanto en el navegador (desarrollo) como en las pruebas**.
- Todos los datos simulados deben cumplir los esquemas de `@hw/contracts`.
- Probar los tres estados del indicador de compatibilidad y el caso de `null` (no verificable).

---

## 13. Datos de demostración para simulados y pruebas

Datos reales de la base ya construida (todos ficticios salvo las piezas de hardware, que vienen de BuildCores OpenDB, licencia CC BY-NC-SA 4.0). **Hay que mostrar la atribución en `/atribucion`, en el pie del sitio y en la ficha técnica:**

> Data from BuildCores OpenDB (https://github.com/buildcores/buildcores-open-db), licensed under CC BY-NC-SA 4.0.

**Cuentas** (contraseña de todas: `Demo#2026`):

| Correo | Rol | Observación |
|---|---|---|
| `comprador1@demo.test`, `comprador2@demo.test` | `buyer` | |
| `vendedor1@demo.test` | `seller` | TecnoPasarela Cali, **verificada**, 10 ofertas |
| `vendedor2@demo.test` | `seller` | Unilago Gaming, **verificada**, 12 ofertas (una pausada) |
| `vendedor3@demo.test` | `seller` | ComputoSur, pendiente de revisión |
| `vendedor4@demo.test` | `seller` | HardwarePlus, corrección solicitada |
| `vendedor5@demo.test` | `seller` | ElectroNova, suspendida |
| `admin@demo.test` | `admin` | No tiene pantallas esta semana |

**Tiendas verificadas (las únicas que aparecen en el catálogo público):**

| Tienda | Ciudad | Dirección | WhatsApp |
|---|---|---|---|
| TecnoPasarela Cali | Cali (Valle del Cauca) | Local 214, C.C. Pasarela | `+573000000001` |
| Unilago Gaming | Bogotá (Bogotá D.C.) | Local 305, C.C. Unilago | `+573000000002` |

**Catálogo semilla: 28 componentes** (4 CPU, 5 placas, 4 RAM, 3 GPU, 3 fuentes, 3 cajas, 3 disipadores, 3 SSD). Ejemplos con su precio de demostración:

| Pieza | Precio (COP) | Tienda |
|---|---|---|
| AMD Ryzen 5 7600 (AM5, 65 W, DDR5) | 849.000 y 879.000 | TecnoPasarela y Unilago |
| AMD Ryzen 7 7800X3D | 1.699.000 | Unilago |
| AMD Ryzen 5 5600 (AM4, 65 W, DDR4) | 529.000 | TecnoPasarela |
| Placa B650M para AM5 | 589.000 | TecnoPasarela |
| Placa B550 para AM4 | 479.000 | TecnoPasarela |
| Kit DDR5 32 GB (2×16) | 469.000 | TecnoPasarela |
| Kit DDR4 16 GB usado | 189.000 | TecnoPasarela |
| RTX 4060 Ti 8 GB | 1.950.000 | TecnoPasarela |
| RTX 4070 SUPER 12 GB | 3.050.000 | Unilago |
| Fuente modular 750 W | 489.000 | TecnoPasarela |
| Caja ATX | 429.000 | TecnoPasarela |
| Caja Mini-ITX compacta | 589.000 | Unilago |

**Casos de prueba del motor** (sirven también para las pruebas de la interfaz):

| Caso | Armado | Resultado esperado |
|---|---|---|
| CP-01 | Ryzen 5 7600, MSI PRO B650M-P, DDR5-6200 32 GB, RTX 4060 Ti, RM750, Corsair 4000D, AK400, NV3 1 TB | RC-01, 02, 04, 05, 06, 07 y 08 compatibles. Consumo **300 W**, fuente recomendada **400 W** |
| CP-02 | Ryzen 5 5600 (AM4) con placa B650M (AM5) | RC-01 incompatible (socket) |
| CP-03 | Memoria DDR4 con placa DDR5 | RC-02 incompatible (tipo de RAM) |
| CP-04 | Placa Micro ATX en caja NR200P (solo Mini-ITX) | RC-04 incompatible (factor de forma) |
| CP-05 | Caja sin dato de altura de disipador | RC-06 **no verificable** (no "compatible") |
| CP-06 | CPU Ryzen 5 7600 elegida | El selector de placas muestra solo socket AM5 |

---

## 14. Plan de Larry para la semana (16 al 22 de noviembre)

| Día | Qué construye | Hito |
|---|---|---|
| Lun 16 | Proyecto Vite + Tailwind + Vitest + Testing Library + MSW. Pasar colores, tipografías y espaciados de Stitch a la configuración de Tailwind. Router con todas las rutas vacías y guardas por rol. Diseño base responsive y barra superior. | `npm test` en verde; rutas navegables |
| Mar 17 | Componentes base en React a partir de Stitch. `formatCOP` y `buildWhatsAppUrl` con pruebas. Inicio y buscador (datos simulados). Catálogo con filtros, orden y paginación. | Catálogo con datos simulados |
| Mié 18 | **Armador** completo (almacén, motor en el navegador, 8 ranuras, resumen, avisos). Al final del día, apagar los simulados del catálogo y conectarlo a la API real. | Armador marca "RC-02 incompatible" al mezclar DDR5 y DDR4 |
| Jue 19 | Ficha técnica. Selector "+ Elegir componente" que muestra solo piezas compatibles. "Agregar al armador" desde el catálogo. `/ingresar` y `/registro` con sesión. | **Nivel 1 completo** |
| Vie 20 | `/vender`, `/vendedor/negocio`, chip de verificación. Asistente de publicación en cascada (4 pasos) con datos simulados hasta la tarde. | Un cliente se convierte en vendedor y publica una oferta |
| Sáb 21 | Inventario (precio editable e interruptor), panel de métricas, revisión responsive a 360 px, estados vacío, cargando y de error. | Nivel 2 completo; nivel 3 terminado o avanzado |
| Dom 22 | Integración con el backend, corrección de errores, pruebas y cobertura, README y guion de demostración. | Entrega |

**Fechas en que Erick entrega contratos y endpoints** (de lo que depende Larry):
- Mar 17: `@hw/compat-engine` listo y `@hw/contracts` con el DTO de componentes y los errores.
- Mié 18: `GET /catalog/search`, `GET /components/{id}`, `GET /offers` (y `featured`, `{id}`), `POST /compat/*`, `POST /events`.
- Jue 19: `POST /auth/*` y `GET /me`.
- Vie 20: `/seller/*`, `GET /catalog/brands` y `/models`, subida de fotos y `GET /seller/verification/status`.
- Sáb 21: `PATCH /seller/offers/{id}/visibility`, baja y `GET /seller/analytics/summary`.

**Si el ritmo no alcanza, se recorta en este orden:** nivel 4, panel de métricas (HU-17) e interruptor (HU-18), inventario completo (queda el listado), varias fotos (queda una).

**No se recorta:** el catálogo con filtros, el botón de WhatsApp, el armador con selector de piezas compatibles, la autenticación y la publicación asistida.

---

## 15. Pendientes y dudas abiertas

| # | Tema | Quién lo resuelve |
|---|---|---|
| 1 | **Las pantallas de Stitch aún no están en el repositorio.** Ponerlas en `docs/design/` (HTML/Tailwind y capturas). | Larry |
| 2 | Confirmar el repositorio compartido en GitHub (el de Larry) con `main` protegida. | Larry |
| 3 | Confirmar puertos y el proxy de Vite (propuesta: API en 3000, web en 5173). | Erick y Larry |
| 4 | Forma final de las respuestas (secciones 7 y 9): vendrá de `@hw/contracts`. | Erick |
| 5 | Firma exacta de `evaluate` y `constraintsFor` y forma del armado (sección 8). | Erick, martes 17 |
| 6 | Si el motor recibe los parámetros (75, 1,25, 50) o usa valores por defecto. | Erick |
| 7 | Nombres exactos de los filtros técnicos de `GET /offers` (el Diseño usa `socket` y `ram_type`). | Erick |
| 8 | Nombre público de la plataforma para el mensaje de WhatsApp y el encabezado. | Larry y Erick |

---

## 16. Documentos del repositorio

- `docs/plan-de-desarrollo.md`: plan general por fases y decisiones que resuelven contradicciones.
- `docs/plan-semana-1.md`: plan de la primera semana con la estrategia de pruebas.
- `docs/contexto-frontend.md`: este documento.
- Diseño Integral del Sistema (PDF): arquitectura, modelo de datos, endpoints, flujos, seguridad. Es la fuente técnica de mayor autoridad.
- Ruta Scrum (PDF): las 27 historias de usuario y sus criterios de aceptación.
