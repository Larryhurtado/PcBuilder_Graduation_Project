# Plan de desarrollo de la plataforma

Agregador y Validador de Hardware · Plan de implementación desde cero

| | |
|---|---|
| Fuente técnica | *Diseño Integral del Sistema* (Corte 2). Ante cualquier contradicción, manda este documento. |
| Fuente funcional | *Ruta Scrum*: historias HU-01 a HU-27 y sus criterios de aceptación. |
| Arquitectura | Monolito modular (ADR-01): un backend desplegable con 9 módulos de dominio. |
| Backend, base de datos, worker y motor de compatibilidad | Erick Guapacha |
| Frontend (SPA React) | Larry Hurtado |
| Punto de partida | 15 de noviembre de 2026. El repositorio solo tiene el README. |

---

## 0. Alcance de esta entrega (aprox. 70 %, todo local)

**Decisión del 15-nov-2026 (revisada):** la entrega cubre al **comprador y al vendedor** de punta a punta y todo corre en el computador de cada uno. La revisión administrativa de documentos, las funciones de retención del comprador, las pruebas formales y el despliegue quedan para una etapa posterior. El corte parte de una propuesta de 19 historias y se comprobó contra la tabla del Product Backlog (sección 4 de la Ruta Scrum).

| Bloque | Historias incluidas | Puntos |
|---|---|---|
| Catálogo y ficha | HU-03, 09, 10, 11, 12 | 13 |
| Asistente y contacto | HU-01, 02, 04, 05, 06, 08 | 22 |
| Vendedor (B2B) | HU-17, 18, 19, 20, 21, 22, 23, 25 | 25 |
| **Total** | **19 de 27 historias (70,4 %)** | **60 de 84 puntos (71,4 %)** |

Las 27 historias suman **84 puntos**, no 85.

**Aplazadas (8 historias, 24 puntos):**
- HU-24, 26 y 27: carga y revisión de documentos, y bloqueo de publicación (8 puntos).
- HU-07, 13 y 14: enlace compartible y PDF, armados guardados y favoritos (10 puntos).
- HU-15 y 16: directorio y perfil público de tienda (6 puntos).

| | Incluido ahora | Aplazado |
|---|---|---|
| Fases | **0, 1** (sin HU-15 y 16), **2** (solo autenticación) y **3** (sin verificación documental) | Resto de las Fases 2 y 3, **4 y 5** (siguen descritas abajo para retomarlas) |
| Entorno | Local: PostgreSQL y almacenamiento de archivos (ver punto 5) | Vercel, Railway, S3 real, correo, dominio propio |
| Calidad | Pruebas unitarias del motor (CP-01 a CP-06 y la matriz de casos) y `db:verify` | E2E, k6, accesibilidad, usabilidad, informe del objetivo 4 |

### Ajustes a las fases incluidas (prevalecen sobre el texto de las fases)

1. **La base de datos ya está construida** (paquete `Paquete_Base_de_Datos_y_Diagramas.zip`: los 11 esquemas, las 33 tablas, los 28 componentes de BuildCores y 34 pruebas). Se copia a `db/` y se carga; lo nuevo se agrega con migraciones. Lo que se aplaza es la API y las pantallas de lo aplazado, no las tablas. Detalles y advertencias en la sección 5 de [plan-semana-1.md](plan-semana-1.md).
2. **Datos semilla:** `004_seed_demo.sql` aporta tiendas verificadas, ofertas y usuarios de ejemplo. El catálogo del comprador y el panel del vendedor se pueden probar desde el primer día, sin pasar por el flujo de alta.
3. **La autenticación es un requisito que no está en las 19 historias.** HU-25 y todos los endpoints de vendedor necesitan registro, inicio de sesión, refresco, cierre de sesión y `/me` (RNF-SEG-01 y 02). Se construye `identity` completo salvo la recuperación de contraseña. Lo que se aplaza de HU-13 son los armados guardados.
4. **Verificación simulada** (ver el apartado siguiente).
5. **Fotos de ofertas (HU-21 exige subirlas):** `StoragePort` con un adaptador de **disco local**: carpeta `storage/` ignorada por git y servida por la API, con subida directa por `PUT` a la API en lugar de URL firmada de S3. Al desplegar se cambia por el adaptador S3 sin tocar los módulos. Los documentos privados de verificación no se usan todavía.
6. **Correo:** sin Mailpit ni worker. El adaptador de `EmailPort` imprime en la consola de la API. La recuperación de contraseña (`/recuperar`) se aplaza.
7. **Métricas (HU-17):** `POST /events` guarda los eventos y `GET /seller/analytics/summary` los suma en vivo desde `analytics.offer_events`. La vista materializada y su refresco en el worker se aplazan.
8. **Sin Docker:** cada uno usa un PostgreSQL instalado en su máquina (el diseño pide 15 o superior; Erick ya tiene el 18). Los scripts de la base se ejecutan con `psql` (usan comandos propios de `psql`). Larry no necesita PostgreSQL mientras trabaje con los datos simulados.
9. **Módulos de la API que se crean ahora:** `identity`, `stores`, `catalog`, `compat`, `offers`, `analytics` y un `verification` mínimo (estado, `canPublish` y la aprobación de desarrollo). `builds` y `notifications` quedan como carpetas con su fachada vacía, para respetar la estructura de los 9 módulos. HU-11 (agregar al armador desde el catálogo) usa el almacén local del navegador, por eso no necesita `builds`.
10. **Sin dominio ni cookies entre sitios:** en local la SPA y la API van en `localhost`, así que la cookie de refresco funciona. El riesgo R-08 deja de aplicar hasta que se despliegue.
11. **Administrador:** existe un administrador semilla en la base, usado solo como autor de la aprobación simulada. No hay pantallas de administración.

### Verificación simulada en esta entrega

La propuesta original sugería poner `verificado = true` por defecto. Así no funciona: la restricción `ck_store_verified_profile` exige NIT, WhatsApp, ciudad y dirección para que una tienda sea verificada, y el disparador de ofertas depende de ese mismo estado. En su lugar:

- `convertToSeller` (HU-25) crea la tienda y la solicitud en `not_submitted`, igual que en el diseño final.
- `npm run dev:approve-store -- <correo> <NIT>` hace lo que haría la aprobación real: fija el NIT, rellena `submitted_at` (lo exige `ck_req_submitted`), registra la decisión de `admin@demo.test` en `verification.reviews`, pasa la solicitud a `approved` y emite `verification.approved`. Así `stores.is_verified` y la vista pública se actualizan por el camino normal.
- Mientras la tienda no esté aprobada, `POST /seller/offers` responde `403 STORE_NOT_VERIFIED` (sale de `canPublish`, no cuesta trabajo extra) y el panel muestra el chip de estado.
- Las tiendas del seed ya vienen aprobadas.
- Al retomar HU-24, 26 y 27 solo se agregan la carga de documentos y la pantalla del administrador. El modelo y los eventos no cambian.

**Para la sustentación:** la verificación de comercios es el diferenciador central del Trabajo de Grado. En esta entrega está simulada y hay que decirlo así, sin presentarla como terminada. HU-24, 26 y 27 son de prioridad Alta; por eso no se puede afirmar que todas las historias Alta estén cubiertas.

---

## 1. Cómo trabajamos en paralelo

Los dos frentes avanzan al mismo tiempo gracias a un **contrato primero**.

1. Antes de implementar un endpoint, Erick publica su contrato en `packages/contracts`: esquema Zod de la petición y de la respuesta, más los códigos de error de la tabla 27 del Diseño.
2. Larry construye la pantalla contra ese contrato con datos simulados (MSW) sin esperar al backend.
3. Cuando el endpoint está listo, se apagan los simulados de esa ruta y se prueba integrado.

Tres piezas son compartidas y se acuerdan **antes** de cualquier pantalla:

| Pieza compartida | Responsable | Usuario |
|---|---|---|
| `packages/contracts`: esquemas Zod, DTO y códigos de error | Erick | Larry valida formularios con los mismos esquemas |
| `packages/compat-engine`: reglas RC-01 a RC-12, consumo y restricciones | Erick | Larry lo ejecuta en el navegador (respuesta instantánea, HU-04) |
| **DTO de especificaciones normalizadas** (`ComponentSpecs`) | Erick | Lo consume el motor en ambos lados; ver 1.1 |

### 1.1 DTO de especificaciones (contrato crítico)

> **Actualización del 15-nov-2026:** la forma definitiva es un objeto `specs` **plano por categoría** (por ejemplo `gpu.specs.lengthMm`), como en el ejemplo de código del Diseño (sección 5.6), y no el bloque anidado de abajo. Ver [contexto-frontend.md](contexto-frontend.md), sección 7.

El motor necesita las mismas especificaciones en el navegador y en el servidor. Se define una sola forma, en camelCase, que devuelven `GET /components/{id}`, `GET /offers` y `GET /offers/{id}`:

```js
// packages/contracts/src/specs.js (borrador)
{
  id, category,               // 'cpu' | 'motherboard' | 'ram' | 'gpu' | 'storage' | 'psu' | 'case' | 'cooler'
  version,                    // versión del componente en la Base Maestra
  cpu:         { socket, tdpW, memoryTypes },
  motherboard: { socket, formFactor, ramType, ramSlots, ramMaxGb, m2Slots },
  ram:         { ramType, speedMhz, modulesQty, capacityGb },
  gpu:         { tdpW, lengthMm, powerConnectors },
  psu:         { wattageW, formFactor, connectors },
  case:        { supportedMbFormFactors, supportedPsuFormFactors, maxGpuLengthMm, maxCoolerHeightMm },
  cooler:      { heightMm, sockets },
  storage:     { storageType, interface, capacityGb, formFactor }
}
// Solo viene el bloque de su categoría. Un dato faltante es null, nunca 0:
// así el motor puede responder "no verificable" (ADR-04).
```

### 1.2 Reglas del repositorio

- **Ramas:** `main` protegida. Una rama por historia o tarea: `feat/HU-04-motor`, `fix/...`, `chore/...`.
- **Pull requests:** cada PR lo revisa el otro integrante. Se fusiona con la CI en verde.
- **Commits:** convencionales (`feat:`, `fix:`, `test:`, `docs:`), con la HU en el mensaje cuando aplique.
- **Definition of Done:** la de la Ruta Scrum (5.3): código integrado en `main`, persistencia funcionando, criterios de aceptación probados, responsive y revisado por ambos.
- **Decisiones nuevas:** se registran como ADR en `docs/adr/` (siguiente número: ADR-16).

---

## 2. Estructura del monorepo

Basada en la sección 3.4 del Diseño, con un agregado: `packages/contracts`. Sin Docker.

```
PcBuilder_Graduation_Project/
├─ apps/
│  ├─ web/                      # Larry · React + Vite + Tailwind
│  │  └─ src/
│  │     ├─ app/                # router, guardas por rol, layout, providers
│  │     ├─ features/           # una carpeta por módulo: builder, catalog, stores,
│  │     │                      #   account, seller, verification, admin, home
│  │     ├─ shared/             # UI kit, cliente HTTP, hooks, utilidades
│  │     └─ mocks/              # handlers MSW por endpoint
│  └─ api/                      # Erick · Node.js + Express
│     └─ src/
│        ├─ modules/            # identity, stores, verification, catalog, compat,
│        │   └─ <módulo>/       #   offers, builds, analytics, notifications
│        │       ├─ routes.js  service.js  repository.js  events.js
│        │       └─ index.js    # fachada pública: lo único importable desde fuera (M-1)
│        ├─ kernel/             # config, db, event-bus, ports (storage, email), errors
│        ├─ http/               # helmet, cors, rate limit, auth, roles, validate, errors
│        ├─ server.js           # arranque de la API
│        └─ worker.js           # arranque del worker (cron + bandeja de correos)
├─ packages/
│  ├─ compat-engine/            # Erick · JS puro, sin dependencias de plataforma
│  └─ contracts/                # Erick · esquemas Zod y DTO compartidos
├─ db/
│  ├─ 001_schema.sql … 005_verify.sql
│  └─ migrations/               # cambios posteriores: 006_*.sql, 007_*.sql…
├─ tools/                       # scripts de BD (el importador de BuildCores queda para la Fase 4)
├─ docs/                        # diseño, ADR, plan, diccionario de datos
├─ storage/           # archivos subidos en local (ignorado por git)
└─ .github/workflows/ci.yml
```

### 2.1 Bibliotecas propuestas

| Capa | Bibliotecas |
|---|---|
| API | express, helmet, cors, express-rate-limit, zod, pg, jsonwebtoken, bcrypt, pino y pino-http, @aws-sdk/client-s3 con s3-request-presigner, nodemailer, node-cron |
| Pruebas backend | vitest, supertest y una base de pruebas en el PostgreSQL local para las pruebas de integración |
| Calidad | eslint (con `no-restricted-paths` para M-1), dependency-cruiser (M-2), prettier |
| Web | react-router, @tanstack/react-query, zustand, react-hook-form con @hookform/resolvers/zod, msw, jspdf (cotización, ADR-12), recharts (dashboard) |
| E2E y carga | playwright, k6 |

Se mantiene **JavaScript**, como en el Diseño (por ejemplo `evaluate.js` e `index.js`). Los tipos vienen de los esquemas Zod y de JSDoc. Sin ORM: consultas SQL parametrizadas con `pg` (ADR-06).

### 2.2 Entorno local

Sin Docker. Se necesita **Node.js 22 LTS** y un **PostgreSQL 15 o superior** instalado en Windows. Los puertos `StoragePort` y `EmailPort` usan adaptadores locales (disco y consola).

Scripts de Node que invocan a `psql` (los `.sql` del paquete usan comandos de `psql`, así que la biblioteca `pg` no sirve para ejecutarlos). Se agrega `C:\Program Files\PostgreSQL\18\bin` al PATH:

- `npm run db:reset` borra la base y ejecuta `001` a `004`, y las migraciones de `db/migrations/`.
- `npm run db:verify` ejecuta `005` e imprime PASS o FAIL por prueba.
- `npm run db:migrate` aplica `db/migrations/*` y registra cada archivo en `schema_migrations`.

---

## 3. Fases

Cada fase entrega algo que se puede demostrar de punta a punta. El orden sigue las dependencias del Product Backlog: la Base Maestra va primero, luego el flujo del comprador, luego las cuentas y al final el vendedor y el administrador.

### Fase 0 — Cimientos

**Objetivo:** repositorio listo, base de datos completa y verificada, API y SPA arrancando y CI en verde.

> **Actualización del 15-nov-2026:** la base de datos ya existe en el paquete del zip. El punto 3 de Erick (construir `001` a `005`) se reduce a copiar los scripts a `db/`, cargarlos, comprobar las 34 pruebas y agregar la migración `006`. El importador de BuildCores deja de ser necesario por ahora.

**Erick (backend)**

1. Monorepo con workspaces de npm, ESLint, Prettier, Vitest y `.editorconfig`. Node 22 LTS.
2. Un `.env` local con la cadena de conexión al PostgreSQL local. **Ningún `.env` se sube a git, ni siquiera de ejemplo**: las variables están documentadas en el README. Sin Docker.
3. **Base de datos (ya construida):** copiar a `db/` los scripts `001` a `005` y `run_all.sh` del paquete, cargarlos y comprobar que `005_verify.sql` da **34 de 34** (15 INV, 9 INT, 5 PER y 5 CMP). Agregar la migración `006_public_offers_detail.sql`, que amplía `readmodel.public_offers` con dirección, coordenadas y descripción para la ficha técnica (HU-12). Los scripts son de `psql`, no de `pg`: ver la sección 5 de [plan-semana-1.md](plan-semana-1.md).
4. Esqueleto de la API:
   - `kernel/`: configuración validada con Zod, pool de `pg`, bus de eventos en memoria, errores de dominio y los puertos `StoragePort` y `EmailPort` con adaptadores S3 y SMTP.
   - `http/`:
     - seguridad: helmet, CORS con lista blanca y límite de tasa;
     - trazabilidad: id de petición y pino-http;
     - acceso: middlewares `authenticate`, `requireRole` y `validate(zodSchema)`;
     - errores: manejador con el formato `{ code, message, details, requestId }`.
   - `GET /health` y `GET /ready`.
   - Una plantilla de módulo vacío que se copia para los 9 módulos.
5. CI en GitHub Actions: lint, dependency-cruiser, pruebas, `db:reset` y `db:verify` sobre un Postgres de servicio, y build del frontend.

**Larry (frontend)**

1. `apps/web` con Vite, React y Tailwind. Tokens de diseño tomados de las pantallas de Stitch y puntos de quiebre 360, 768 y 1280 px.
2. Router con **todas** las rutas de la tabla 28 como páginas vacías y guardas por rol (visitante, cliente, vendedor, administrador).
3. Layout responsive con la barra superior fija (buscador como espacio reservado) y un pie con los enlaces a `/terminos`, `/privacidad` y `/atribucion`.
4. Cliente HTTP:
   - envía el token de acceso;
   - ante `401 TOKEN_EXPIRED` llama una sola vez a `/auth/refresh` y reintenta;
   - convierte los códigos de error en mensajes para el usuario.
5. Proveedor de TanStack Query y configuración de MSW.
6. UI kit:
   - estructura: Button, Card, Modal o Drawer;
   - datos: Badge, Toggle;
   - estados: Skeleton, EmptyState, ErrorState;
   - **indicador de compatibilidad con icono y texto**, nunca solo color.
7. Páginas estáticas: términos, privacidad (Ley 1581), atribución de BuildCores, 404 y aviso de fallo de conexión.
8. Cerrar el prototipo navegable en Figma (DT-04).

**Terminado cuando:** `npm run db:reset` y `npm run db:verify` dan 34 de 34; la API responde `/ready` y la SPA navega entre las rutas vacías.

---

### Fase 1 — Flujo del comprador (núcleo del MVP)

**Historias:** HU-01, 02, 03, 04, 05, 06, 08, 09, 10, 11 y 12. HU-15 y 16 se aplazan: se omiten las filas de `stores` público y de Tiendas.

**Erick (backend)**

| Entrega | Detalle | HU |
|---|---|---|
| `packages/compat-engine` | `evaluate`, `estimateWatts` y `constraintsFor` (sección 5.6 del Diseño). Reglas RC-01 a RC-08 obligatorias; RC-09 a RC-12 si alcanza el tiempo (R-04). Cuatro estados: ok, fail, unknown y not_applicable. Pruebas unitarias con los casos CP-01 a CP-06 más una **matriz ampliada de casos compatibles e incompatibles**, que alimenta el informe de pruebas del objetivo 4. **Se entrega primero**: Larry lo necesita para el builder. | 04, 05, 06 |
| Módulo `catalog` (lectura) | Fachada `getComponent`, `getSpecs`, `search` y `exists`. `GET /catalog/search?q=` con tsvector y trigramas. `GET /components/{id}` con especificaciones, versión, fuente y atribución, más encabezados `ETag` y `Cache-Control` ligados a la versión. | 03, 12 |
| Módulo `compat` | `POST /compat/validate` y `POST /compat/constraints`. Lee las reglas activas de `compat.rules` y los parámetros de `compat.params`. | 04, 05, 06 |
| Módulo `offers` (lectura) | `GET /offers`: filtros por categoría, marca, precio, condición, ciudad, tienda, socket y tipo de RAM; orden `price_asc`, `price_desc` o `newest`; paginación por cursor. Solo lee de `readmodel.public_offers`. `GET /offers/featured` y `GET /offers/{id}`. | 02, 09, 10, 12, 16 |
| Módulo `stores` (público) | `GET /stores`, con filtro por ciudad o centro comercial y solo comercios verificados, y `GET /stores/{id}`. | 15, 16 |
| Módulo `analytics` (escritura) | `POST /events` (vista o clic a WhatsApp): sesión con hash con sal diaria, sin guardar la IP; deduplicación en una ventana corta; límite de tasa. | 08 |

**Larry (frontend)**

| Pantalla o pieza | Detalle | HU |
|---|---|---|
| Inicio `/` | Botón destacado hacia `/armador`, sin login, y tarjetas de ofertas destacadas. | 01, 02 |
| Buscador global | Sugerencias en tiempo real con *debounce* contra `/catalog/search`. | 03 |
| Catálogo `/catalogo` | Filtros combinados (en un panel en móvil), selector de orden que se conserva al paginar, estado "sin resultados". | 09, 10 |
| Tarjeta de oferta | Foto, precio en COP, Nuevo/Usado, garantía, tienda y ciudad. Botón de WhatsApp: `sendBeacon` a `/events` y luego `wa.me` con el mensaje prellenado, en un clic. Botón "Agregar al armado". | 08, 11 |
| Ficha `/producto/:id` | Tabla de especificaciones con versión y fuente, y ofertas por tienda ordenadas por precio. | 12 |
| Asistente `/armador` | Almacén Zustand persistido en sessionStorage, con 8 ranuras. El motor corre en el navegador al agregar o quitar piezas. Resumen superior con incompatibles, no verificables, consumo y fuente recomendada. El selector "+ Elegir componente" pide `/compat/constraints` y luego `/offers` con esos filtros. Avisos por regla con las medidas. Estados vacío, cargando, sin compatibles y error. | 04, 05, 06, 11 |
| Tiendas | Directorio filtrable `/tiendas` y perfil `/tiendas/:id` con su catálogo y búsqueda interna. | 15, 16 |

**Terminado cuando:** un visitante arma el caso CP-01 y ve todo compatible con 300 W consumidos y 400 W recomendados; al cambiar a DDR4 aparece "RC-02 incompatible"; al elegir un Ryzen 5 7600 solo se ofrecen placas AM5; contacta una tienda por WhatsApp en un clic, y la página no se desplaza horizontalmente a 360 px.

---

### Fase 2 — Cuentas, armados guardados y favoritos

> **Alcance ahora:** solo `identity` (registro, inicio de sesión, refresco, cierre de sesión y `/me`) y las pantallas `/ingresar` y `/registro`. `builds`, favoritos, enlace compartible, PDF, `/cuenta` completo y la recuperación de contraseña se aplazan (HU-07, 13 y 14).

**Historias:** HU-07, 13 y 14.

**Erick (backend)**

1. Módulo `identity`:
   - Registro con aceptación de términos y la versión de la política.
   - Inicio de sesión con bcrypt de costo 12.
   - **Token de acceso JWT de 15 minutos y refresco rotatorio de 7 días** en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`, guardado como hash (ADR-09).
   - `logout`, y `forgot` y `reset` con token de un solo uso y la misma respuesta exista o no el correo.
   - `GET`, `PATCH` y `DELETE /me`. Este último anonimiza la cuenta y emite `user.anonymized`.
   - Límite de tasa estricto en el inicio de sesión y en la recuperación.
2. Módulo `notifications`, versión mínima: tabla `email_outbox`, plantilla `password_reset` y el worker que envía con reintentos (Mailpit en local).
3. Módulo `builds`:
   - `POST /builds`: valida otra vez con el motor y guarda el precio unitario del momento.
   - `GET /builds/{shareCode}` con un código de 10 caracteres.
   - `GET`, `PUT` y `DELETE /me/builds`, y clonar un armado.
   - Favoritos con `GET`, `PUT` y `DELETE /me/wishlist`.
   - Consumir `user.anonymized`.

**Larry (frontend)**

1. `/ingresar`, `/registro` y `/recuperar` con validación Zod compartida.
2. `/cuenta`: perfil, edición y eliminación de la cuenta con confirmación.
3. `/cuenta/armados`: lista con fecha y costo total, abrir, clonar y eliminar.
4. `/cuenta/favoritos` y el corazón en las tarjetas, con la opción de enviar al armador.
5. En el asistente: "Guardar" (pide sesión), "Compartir enlace" con `/armado/:codigo` en modo lectura y "editar copia", y **"Descargar cotización"** en PDF generado en el navegador con precios en COP (ADR-12).

**Terminado cuando:** un cliente guarda un armado, lo abre desde otro navegador con el enlace y descarga el PDF; el token expira y se renueva solo.

---

### Fase 3 — Vendedor, verificación y publicación (ENTRA PARCIALMENTE)

> **Alcance ahora:** HU-17 a 23 y HU-25. Del backend entran `stores` (convertir y perfil), `offers` del vendedor, `catalog` (marcas y modelos), la subida de fotos y el resumen de analítica. Del frontend entran `/vender`, `/vendedor`, `/vendedor/negocio`, `/vendedor/publicar`, `/vendedor/inventario` y el chip de estado de verificación.
>
> **Se aplaza (HU-24, 26 y 27):** carga de documentos al bucket privado, cola y decisión del administrador, plazos de corrección, correos de verificación y las pantallas `/admin/*`. Se sustituyen por la verificación simulada de la sección 0.

**Historias:** HU-17 a HU-27.

**Erick (backend)**

1. `stores`:
   - `POST /seller/convert`: llama `setRole` y `openRequest` y devuelve un token nuevo con rol de vendedor.
   - `GET` y `PATCH /seller/store`: perfil, ubicación y WhatsApp en formato E.164.
   - Consumir `verification.approved` y `verification.suspended` para mantener `is_verified`.
2. `verification`:
   - Lado del vendedor:
     - documentos: URL firmada de subida al bucket **privado** (PDF, JPG o PNG de hasta 5 MB), registro con SHA-256 y borrado;
     - envío: `submit`, que exige los tres documentos y el perfil completo;
     - consultas: `status` y la fachada `canPublish`.
   - Lado del administrador: cola por antigüedad, detalle, lectura de un documento con URL firmada de 60 segundos y **registro en auditoría**, y `POST .../decision` con la máquina de estados de la tabla 18 (nota obligatoria si no se aprueba, plazo de 15 días para la corrección, borrado inmediato de documentos al rechazar, reintento a los 30 días).
   - Publicar los eventos `verification.*`.
3. `notifications`: plantillas `verification_submitted`, `verification_approved`, `verification_correction_requested`, `verification_rejected` y `verification_suspended`.
4. `offers` del vendedor:
   - Endpoints: `GET` y `POST /seller/offers`, `PATCH /{id}`, `PATCH /{id}/visibility`, `DELETE /{id}` (baja lógica) y la URL firmada para las fotos.
   - Validaciones: `canPublish` en cada escritura y el disparador de la base como segunda barrera (`403 STORE_NOT_VERIFIED`), más `409 OFFER_DUPLICATE`.
   - Eventos: consumir `verification.suspended` para pausar todas las ofertas de la tienda.
5. `catalog`: `GET /catalog/brands` y `GET /catalog/models` para la cascada.
6. `analytics`: `GET /seller/analytics/summary?from=&to=` desde la vista materializada.

**Larry (frontend)**

1. `/vender`: solicitud para convertirse en vendedor.
2. `/vendedor`:
   - barra con el chip del estado de verificación;
   - indicadores de vistas, clics a WhatsApp, ofertas activas y pausadas;
   - selector de 7 o 30 días y gráfico diario.
3. `/vendedor/negocio`: perfil, logo, dirección, centro comercial, horario y WhatsApp.
4. `/vendedor/verificacion`: los 6 estados de la tabla 32, cada uno con sus mensajes y acciones.
5. `/vendedor/publicar`: asistente de 4 pasos.
   1. Categoría, marca y modelo en cascada desde la Base Maestra.
   2. Precio, estado, garantía y descripción.
   3. Hasta 5 fotos, subidas directo al bucket.
   4. Revisión y publicación.

   Si el vendedor no está verificado, el formulario queda bloqueado con el mensaje exacto de HU-27.
6. `/vendedor/inventario`: tabla (tarjetas en móvil) con precio editable en línea, interruptor de visibilidad y eliminación con confirmación.
7. Administración: `/admin` con los pendientes y `/admin/verificaciones/:id` con visor de documentos y decisión con nota.

**Terminado cuando:** un cliente se convierte en vendedor, no puede publicar, sube sus documentos; el administrador pide una corrección, el vendedor reenvía, el administrador aprueba y el vendedor publica una oferta que aparece en el catálogo; el clic a WhatsApp se refleja en su panel.

---

### Fase 4 — Gobierno del catálogo y operación (APLAZADA)

**Erick (backend)**

1. **Importador de BuildCores OpenDB** en Node (`tools/opendb-import` y `POST /admin/components/import`):
   - lee los JSON;
   - normaliza sockets y tipos;
   - escribe en `catalog.*` con una versión por registro;
   - conserva `opendb_id`, la fuente y la licencia.

   `003_seed_components.sql` ya viene generado en el paquete (28 componentes); este importador solo hace falta para cargar más.
2. `POST` y `PATCH /admin/components` con motivo obligatorio, usando `publish_version`, y `GET /admin/components/{id}/versions`.
3. Tareas idempotentes del worker:
   - vencimiento de plazos de corrección, que suspende la solicitud, borra documentos y anula el NIT;
   - creación anticipada de particiones mensuales;
   - refresco de `store_daily_stats`;
   - purgas: eventos a los 13 meses, tokens vencidos y bandeja de correos a los 90 días;
   - conciliación INT-04 de `is_verified`.

**Larry (frontend)**

1. `/admin/catalogo`: lista, edición con motivo e historial de versiones.
2. Carga del archivo de importación con el resumen del resultado.

**Terminado cuando:** el administrador corrige un dato (por ejemplo la altura máxima de un disipador en una caja), la ficha muestra la versión nueva y la regla RC-06 pasa de "no verificable" a un resultado definitivo.

---

### Fase 5 — Calidad, despliegue y evidencias del objetivo 4 (APLAZADA)

**Ambos**

1. **Despliegue en staging desde la Fase 1** (no esperar al final):
   - Vercel para la web;
   - Railway para la API, el worker y PostgreSQL;
   - almacenamiento S3 y proveedor de correo;
   - **dominio propio con subdominios `www.` y `api.`** para que funcione la cookie de refresco (R-08).
2. Pruebas E2E con Playwright de los tres flujos críticos (sección 8 del Diseño).
3. Prueba de carga con k6: **50 usuarios concurrentes** y el 95 % de las consultas por debajo de 2 s (RNF-PERF-01).
4. Revisión responsive en 360, 768 y 1280 px; accesibilidad AA; lista de chequeo de seguridad de la tabla 34.
5. Monitoreo externo de disponibilidad (RNF-DISP-01) durante el periodo de pruebas.
6. Pruebas de usabilidad con el grupo piloto y **informe de pruebas** con los indicadores del objetivo específico 4:
   - % de casos compatibles identificados correctamente y % de incompatibles rechazados (matriz del motor);
   - errores detectados y tiempo de respuesta (k6);
   - % de tareas de usabilidad completadas y satisfacción de los usuarios de prueba.

---

## 4. Orden de trabajo de esta entrega

Sin fechas por sprint: se avanza por hitos. Cada hito se cierra cuando se puede demostrar.

| Hito | Erick (backend) | Larry (frontend) |
|---|---|---|
| A. Cimientos | Monorepo, Postgres local, scripts 001 a 005 con 34 pruebas, esqueleto de la API | Base de la aplicación, todas las rutas vacías con guardas, componentes de interfaz |
| B. Motor y catálogo | `compat-engine` con sus pruebas, `catalog`, `compat` y `offers` de lectura | Inicio, catálogo y ficha con datos simulados |
| C. Armador | `POST /compat/constraints`, `POST /events` | Armador completo con el motor en el navegador y filtro de piezas compatibles |
| D. Identidad | `identity` (sin recuperación de contraseña) | `/ingresar`, `/registro`, sesión y guardas por rol |
| E. Vendedor | `stores` (convertir y perfil), `offers` del vendedor, `catalog` (marcas y modelos), `StoragePort`, resumen de analítica y `dev:approve-store` | `/vender`, `/vendedor`, `/vendedor/negocio`, `/vendedor/publicar` e `/vendedor/inventario` |

**Si falta tiempo, se recorta en este orden:** RC-09 a RC-12, el gráfico diario del panel (quedan los números), bajar de 5 fotos por oferta a 1 y la edición de precio en línea.

**Lo que no se recorta:** RC-01 a RC-08, el catálogo con filtros, el botón de WhatsApp, el armador con el filtro de piezas compatibles y la publicación asistida en cascada.

---

## 5. Decisiones que resuelven contradicciones entre documentos

Se aplica el Diseño Integral. Larry, como Product Owner, debe actualizar el texto de la Ruta Scrum y del Trabajo de Grado donde se indica.

| Tema | Decisión | Documento que hay que corregir |
|---|---|---|
| Categorías del motor | 8 categorías: CPU, placa base, RAM, GPU, almacenamiento, **fuente**, caja y disipador. Monitor, sistema operativo y periféricos quedan fuera del MVP. | Trabajo de Grado, marco conceptual |
| Ruta del asistente | `/armador`. Todas las rutas sin tilde: `/catalogo`, `/vendedor/verificacion`. | HU-01 (`/builder`) y tabla 28 del Diseño |
| Sesión | Acceso de 15 minutos y refresco de 7 días (ADR-09). | RNF-SEG-01 (8 horas) |
| Formatos de documentos | PDF, JPG o PNG de hasta 5 MB. | HU-24 (solo PDF) |
| Rechazo y suspensión | Tabla 18 del Diseño: borrado inmediato al rechazar y reintento a los 30 días del rechazo o de la suspensión. | Criterios de HU-26 |
| Pruebas de la base | 34 pruebas (15 + 9 + 5 + 5). | Tabla 2 del Diseño y SB-12 (35) |
| Número de historias | 27. | SB-05 y la tabla INVEST (25) |
| "Módulo de usados" | No existe como módulo: es el campo Nuevo/Usado de la oferta. | Fase 1, actividad 2 del Trabajo de Grado |
| Dónde se valida la compatibilidad | En el motor JS (navegador y servidor). La base garantiza la integridad de los datos, no evalúa las reglas. | Justificación del Trabajo de Grado |
| Importador de BuildCores | **Propuesta ADR-16:** en Node en lugar de Python, porque se reutiliza en `/admin/components/import` y mantiene una sola pila tecnológica. | Anexo A del Diseño |

## 6. Pendientes por confirmar

Para esta entrega importan el 1 (instalar Node) y el 4 (borrador de armados, que solo aplica cuando se retome `builds`). El 2 se resuelve en local con el adaptador de disco y el 6 con el administrador semilla y `dev:approve-store`. El 3 y el 5 se retoman con el despliegue y la verificación real.

| # | Pregunta | Por qué importa | Necesaria antes de |
|---|---|---|---|
| 1 | Resuelto: no se usa Docker. Falta instalar Node.js 22 LTS (Erick y Larry). | Entorno local | Fase 0 |
| 2 | Proveedor de almacenamiento S3 (Cloudflare R2, AWS S3, Supabase Storage…) y de correo (Resend, Brevo, SMTP…). | Puertos de almacenamiento y correo | Fase 3 |
| 3 | ¿Compran un dominio propio? Sin él, la cookie de refresco entre `vercel.app` y `railway.app` no funciona (R-08). | Sesión en producción | Staging |
| 4 | Un armado con incompatibilidades "se puede guardar como borrador", pero la API responde 422. Propuesta: `POST /builds` acepta `draft: true` y guarda con aviso. | Contrato de builds | Fase 2 |
| 5 | Suspensión: ¿la persona conserva su cuenta de cliente? (el Diseño lo deja "por confirmar"). Propuesta: sí, solo pierde el Dashboard B2B. | Manejador del evento | Fase 3 |
| 6 | ¿Quién es el administrador en la demo y cómo se crea? Propuesta: una cuenta semilla en `004_seed_demo.sql` y un script `create-admin` para producción. | Acceso al panel admin | Fase 3 |
