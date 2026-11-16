# Plan de una semana (16 al 22 de noviembre de 2026)

Complementa a [plan-de-desarrollo.md](plan-de-desarrollo.md). Aquí solo está lo que cabe en siete días, jornada por jornada, con las pruebas unitarias incluidas. Lo que no cabe queda en el plan general.

Reparto: **Erick** backend y motor de compatibilidad. **Larry** frontend. Entorno local, sin Docker: PostgreSQL 18 ya instalado y Node.js 22 LTS por instalar.

**Estado al 15 de noviembre:** hoy solo se define el plan. El trabajo de código empieza el lunes 16.

**Novedad:** la base de datos ya existe (`Paquete_Base_de_Datos_y_Diagramas.zip`). Esto le devuelve a Erick cerca de dos días respecto al plan anterior, porque ya no hay que construir el esquema ni los datos semilla. Ver la sección 5.

---

## 1. Qué se espera lograr (estimación, no medición)

Las historias se ordenan en niveles. Cada nivel solo se empieza cuando el anterior está terminado **con sus pruebas**.

| Nivel | Historias | Puntos | Expectativa |
|---|---|---|---|
| **1. Núcleo del comprador** + autenticación | HU-01, 03, 04, 05, 06, 08, 09, 10, 11, 12 y `identity` | 32 | Se espera terminar |
| **2. Publicar ofertas** | HU-02, 22, 23, 25, 20, 21 | 20 | Probable |
| **3. Gestión del vendedor** | HU-19, 18, 17 | 8 | Posible, ahora que la base ya está hecha |
| **4. Extra** (solo si los niveles 1 a 3 están terminados) | HU-15, 16, 14, 13, 07 | 16 | Poco probable en una semana |

Los niveles 1 a 3 suman los 60 puntos (19 historias) del corte del 70 %. El nivel 4 son historias que quedaron aplazadas y que reutilizan tablas ya creadas. Sigue siendo una estimación: la velocidad real de ustedes se conoce al final del segundo día. Si el ritmo no alcanza, se recorta según la sección 6.

**Decisión para ir más rápido:** no hay CI, E2E ni pruebas de carga esta semana. Sí hay pruebas unitarias, y pocas pruebas de integración contra la base local.

---

## 2. Estrategia de pruebas unitarias

| Capa | Herramientas | Qué se prueba | Meta |
|---|---|---|---|
| `compat-engine` | Vitest | Cada regla RC-01 a RC-08 en sus cuatro estados (ok, fail, unknown, not_applicable), consumo y fuente recomendada, restricciones por categoría. Los casos CP-01 a CP-06 del Diseño más una matriz propia de casos compatibles e incompatibles. | ≥ 90 % de líneas |
| Backend: servicios | Vitest con repositorios falsos en memoria | Reglas de negocio de cada módulo sin base de datos: publicar exige tienda verificada, duplicados, conversión de rol, filtros, rotación del token de refresco. | ≥ 70 % de líneas |
| Backend: validación y HTTP | Vitest y supertest sobre una app mínima | Esquemas Zod, middlewares `authenticate`, `requireRole` y `validate`, traducción de errores de PostgreSQL a códigos de negocio, formato `{ code, message, details, requestId }`. | Cada middleware y cada código de error |
| Backend: base de datos | `db:verify` (el `005_verify.sql` del paquete) | Las 34 pruebas ya escritas: 15 de inserción inválida, 9 de integridad, 5 de permisos y 5 de reglas. Se agregan las propias si se crean migraciones. | 34 de 34 en verde |
| Backend: integración (pocas) | Vitest, supertest y una base `hardware_validator_test` | Un recorrido por módulo: registro e inicio de sesión, búsqueda de ofertas, publicar una oferta. Se ejecuta con `npm run test:int`, aparte de las unitarias. | Un caso feliz y uno de error por módulo |
| Frontend: utilidades y estado | Vitest | `formatCOP`, `buildWhatsAppUrl` (número E.164 y mensaje codificado), almacén del armado (agregar, cambiar, quitar, persistir), validación Zod de formularios. | ≥ 80 % de líneas |
| Frontend: componentes | Vitest, React Testing Library y jsdom | Indicador de compatibilidad (icono y texto, no solo color), tarjeta de oferta, filtros, ranura del armador, aviso de reglas, formulario en cascada, interruptor de visibilidad. | Cada componente con comportamiento propio |
| Frontend: páginas | Testing Library y MSW | Armador (el conflicto aparece y desaparece), catálogo (filtros y orden), inicio de sesión, publicar oferta. | Un flujo por pantalla principal |

**Reglas de trabajo con las pruebas:**
- Una historia no se da por terminada sin sus pruebas en verde (esto ya está en la Definition of Done de la Ruta Scrum).
- `npm test` ejecuta todos los espacios de trabajo; `npm run test:int` solo las de integración.
- En el motor se escribe primero el caso (CP-01 a CP-06) y luego se programa la regla.
- Los informes de cobertura se guardan con cada ejecución para usarlos como evidencia del informe de pruebas.

---

## 3. Jornadas

### Lunes 16 — Arranque

| Erick | Larry |
|---|---|
| Instalar Node.js 22 LTS. Monorepo con workspaces, ESLint, Prettier, Vitest y `.env.example`. | Instalar Node.js. `apps/web` con Vite, Tailwind, Vitest, Testing Library y MSW. |
| **Copiar el paquete a `db/` y cargarlo:** `db:reset` y `db:verify` deben dar 34 de 34 (ver sección 5 por los detalles de Windows). Migración `006` para ampliar `readmodel.public_offers`. | **Importar las pantallas de Stitch** como referencia (`docs/design/`) y pasar sus colores, tipografías y espaciados a la configuración de Tailwind. |
| `packages/contracts` con el DTO `ComponentSpecs` y los códigos de error. Empezar `compat-engine` con RC-01 a RC-04 y sus pruebas. | Router con las 28 rutas vacías y guardas por rol. Diseño base responsive (360, 768 y 1280 px) y barra superior. |

**Hito:** la base cargada con 34 de 34 pruebas; `npm test` en verde en ambos extremos; motor con RC-01 a RC-04.

### Martes 17 — Motor completo y catálogo con datos simulados

| Erick | Larry |
|---|---|
| **`compat-engine` completo:** RC-05 a RC-08, `estimateWatts`, `constraintsFor` y la matriz de casos. Se deja listo **antes de terminar la jornada**, porque Larry lo necesita mañana. | Componentes base reconstruidos en React a partir de Stitch (botón, tarjeta, modal, esqueleto, estados vacío y de error, indicador de compatibilidad). Utilidades `formatCOP` y `buildWhatsAppUrl` con pruebas. |
| Esqueleto de la API: configuración, conexión a PostgreSQL con conversión de tipos numéricos, errores, middlewares y `/health` y `/ready`. | Inicio (HU-01, 02) y buscador (HU-03) con datos simulados. Catálogo (HU-09, 10): filtros, orden, paginación y "sin resultados". |

**Hito:** el motor evalúa el caso CP-01 y devuelve 300 W y 400 W recomendados. El catálogo funciona con datos simulados.

### Miércoles 18 — API de lectura y armador

| Erick | Larry |
|---|---|
| Módulos `catalog` (búsqueda y ficha), `compat` (`validate` y `constraints`) y `offers` de lectura (`GET /offers`, `featured`, `{id}`). `POST /events`. Crear las particiones del mes al arrancar. Pruebas de servicios y de HTTP más una prueba de integración por módulo. | **Armador (HU-04, 05, 06):** almacén del armado persistido en sesión, motor ejecutándose en el navegador, 8 ranuras, resumen de estado y consumo, avisos por regla con las medidas. Pruebas del almacén y de los componentes. |
| Publicar los contratos Zod de estos endpoints el mismo día. | Al final de la jornada, **apagar los datos simulados** del catálogo y conectarlo al backend real. |

**Hito:** catálogo con datos reales de la base. El armador marca "RC-02 incompatible" al mezclar placa DDR5 y RAM DDR4.

### Jueves 19 — Ficha, selector compatible y autenticación

| Erick | Larry |
|---|---|
| Módulo `identity` (registro, inicio de sesión, refresco rotatorio, cierre de sesión y `/me`) con bcrypt, JWT de 15 minutos y cookie de refresco. Middlewares de roles. Pruebas del servicio y de los middlewares. | Ficha técnica (HU-12). Selector "+ Elegir componente" que usa `/compat/constraints` y muestra solo piezas compatibles (HU-06). "Agregar al armador" desde el catálogo (HU-11). |
| Ajustar el filtrado de `offers` según lo que pida el selector. | `/ingresar` y `/registro` con validación Zod compartida y sesión persistente. Pruebas de las páginas. |

**Hito:** el nivel 1 completo y probado. Se puede armar un PC, ver el consumo, contactar una tienda por WhatsApp e iniciar sesión.

### Viernes 20 — Vendedor: alta, perfil y publicación

| Erick | Larry |
|---|---|
| `stores`: convertir a vendedor (HU-25), perfil y ubicación (HU-22), WhatsApp en E.164 (HU-23). `verification` mínimo con `canPublish` y `npm run dev:approve-store`. | `/vender` (HU-25), `/vendedor/negocio` (HU-22, 23) y el chip de estado de verificación. Pruebas de formularios. |
| `catalog` marcas y modelos, `StoragePort` con adaptador de disco y `offers` del vendedor (crear, listar, editar). Pruebas de servicios: publicar exige tienda verificada, duplicado y precio inválido. | Asistente de publicación en cascada (HU-20, 21) en 4 pasos, con datos simulados hasta la tarde. |

**Hito:** un cliente se convierte en vendedor, se aprueba con el comando de desarrollo y publica una oferta que aparece en el catálogo.

### Sábado 21 — Gestión del vendedor y remates

| Erick | Larry |
|---|---|
| Visibilidad (`PATCH .../visibility`), baja lógica y `analytics` con el resumen en vivo para el panel. | Inventario (HU-19, 18): tabla, precio editable en línea e interruptor. Panel de métricas (HU-17). |
| Completar las pruebas que falten y revisar la cobertura. Si hay tiempo: `GET /stores` y `/stores/{id}` (HU-15, 16). | Revisión responsive a 360 px en todas las pantallas. Estados vacío, cargando y de error. |

**Hito:** el nivel 2 completo y el nivel 3 terminado o muy avanzado.

### Domingo 22 — Integración, pruebas y entrega

| Ambos |
|---|
| Recorrido completo de comprador y de vendedor en el navegador, anotando errores. Corrección de los errores encontrados. |
| Ejecución completa de `npm test`, `npm run test:int` y `db:verify`. Informes de cobertura guardados en `docs/`. |
| README de arranque (instalar Node, cargar la base, `npm run dev`) y guion corto de la demostración. |
| Lista de lo que quedó fuera, por historia, para decidir la semana siguiente. Si se va adelantado, empezar el nivel 4. |

---

## 4. Ritmo diario y reglas para no estorbarse

- **Reunión corta al empezar** (10 minutos): qué se entrega hoy y qué necesita el otro.
- **El contrato primero:** Erick publica el esquema Zod de cada endpoint **antes** de programarlo; Larry lo usa para sus datos simulados.
- **Ramas cortas:** una por historia o tarea, y se fusiona a `main` el mismo día con revisión del otro. Un PR por historia con sus pruebas.
- **Nada de trabajo oculto:** si algo se bloquea más de media hora, se avisa. El orden de cortes de la sección 6 se decide ahí mismo.
- **Cada jornada termina con algo que se puede ver funcionando**, no con código a medias.

---

## 5. Lo que ya trae el paquete de base de datos

Revisé el contenido del zip. Sin ejecutar nada, esto es lo que hay y lo que hay que tener en cuenta.

### Contenido

| Elemento | Detalle |
|---|---|
| `001_schema.sql` | 11 esquemas, tipos, 33 tablas, índices, disparadores, funciones, vistas `readmodel`, vista materializada y roles `hw_app` y `hw_readonly`. |
| `002_seed_reference.sql` | Fuente BuildCores con su atribución, las 12 reglas RC-01 a RC-12 y los 3 parámetros (75 W, 1,25 y múltiplos de 50). |
| `003_seed_components.sql` | **28 componentes reales ya generados** (4 CPU, 5 placas, 4 RAM, 3 GPU, 3 fuentes, 3 cajas, 3 disipadores y 3 SSD), con su versión inicial. |
| `004_seed_demo.sql` | 8 usuarios, 5 tiendas en distintos estados, 22 ofertas, 2 armados, favoritos, eventos de analítica, correos y auditoría. |
| `005_verify.sql` | 34 pruebas: 15 INV, 9 INT, 5 PER y 5 CMP. |
| `run_all.sh` | Recrea la base y ejecuta los cinco scripts. |
| `diagramas/` | Los diagramas del Diseño con sus fuentes (`.dot` y `.mmd`). No hace falta tocarlos. |
| `tools/` | Scripts de Python para generar diagramas y la semilla. No se necesitan: la semilla ya está generada. |

**Consecuencias para el plan:** ya **no hay que descargar BuildCores** ni escribir el importador esta semana, y la construcción de la base desaparece de la jornada de Erick.

### Cuentas de demostración

Contraseña de todas: `Demo#2026`. Los hashes son bcrypt (`$2a$`), compatibles con las bibliotecas de Node.

| Correo | Rol | Estado de la tienda |
|---|---|---|
| `admin@demo.test` | Administrador | (usado como autor de la aprobación de desarrollo) |
| `comprador1@demo.test`, `comprador2@demo.test` | Comprador | |
| `vendedor1@demo.test` (TecnoPasarela Cali) | Vendedor | Aprobada, con 10 ofertas |
| `vendedor2@demo.test` (Unilago Gaming) | Vendedor | Aprobada, con 12 ofertas (una pausada) |
| `vendedor3@demo.test` (ComputoSur) | Vendedor | Pendiente de revisión: sirve para probar `dev:approve-store` |
| `vendedor4@demo.test` (HardwarePlus) | Vendedor | Corrección solicitada |
| `vendedor5@demo.test` (ElectroNova) | Vendedor | Suspendida |

### Puntos a tener en cuenta (algunos no verificados)

1. **Los scripts usan comandos propios de `psql`** (`\set`, `\o /dev/null`, `\echo`). Hay que ejecutarlos con `psql`, no con la biblioteca `pg` de Node. En Windows, `psql` está en `C:\Program Files\PostgreSQL\18\bin`, que no está en el PATH.
2. **`run_all.sh` es de bash.** Sirve desde Git Bash con esa carpeta en el PATH, o con un script de Node que invoque a `psql`.
3. **Posible fallo en Windows (no verificado):** `005_verify.sql` usa `\o /dev/null`. Es posible que en Windows falle. Es lo primero que se prueba el lunes; si falla, se cambia por `\o NUL`.
4. **`node-pg` devuelve `numeric` y `bigint` como texto.** Los precios (`numeric(12,0)`) tienen que convertirse a número entero al leerlos, como pide el Diseño (COP como enteros).
5. **La vista `readmodel.public_offers` se queda corta para la ficha técnica (HU-12):** no trae dirección, coordenadas ni descripción. La migración `006` la amplía. No incluye las especificaciones; la API las trae de las tablas de especificaciones.
6. **`dev:approve-store` debe cumplir las restricciones de la tabla:** fijar `submitted_at` (`ck_req_submitted`), `reviewed_by` y `reviewed_at` (`ck_req_approved`) y que la tienda tenga NIT, WhatsApp, ciudad y dirección (`ck_store_verified_profile`).
7. **Traducción de errores de PostgreSQL a la API:**
   - `23514` con el mensaje `STORE_NOT_VERIFIED` pasa a `403 STORE_NOT_VERIFIED`.
   - `23505` sobre `uq_offer_live` pasa a `409 OFFER_DUPLICATE`.
   - `23503` pasa a `404` o `422` según el caso.
8. **Particiones de analítica:** el seed solo crea las del mes anterior, el actual y el siguiente. La API llama a `analytics.ensure_month_partition` al arrancar, sin necesidad de worker.
9. **La vista materializada `store_daily_stats`** no la puede refrescar el rol `hw_app` (no es el dueño). Por eso el resumen del panel se calcula en vivo.
10. **Conexión local:** para ir rápido, la API usa el usuario `postgres` en `.env`. Crear un usuario de conexión que herede de `hw_app` queda para el despliegue.
11. **Diferencia con el Diseño (aplazada):** la tabla `verification.requests` del zip trata el rechazo distinto al Anexo C del Diseño (en el zip, el rechazo exige un plazo de 15 días; en el Anexo C exige la fecha de reintento a 30 días). Pertenece a HU-26, que está aplazada. Se resuelve con una migración cuando se retome.

---

## 6. Antes de empezar el lunes

| # | Qué | Quién |
|---|---|---|
| 1 | Instalar Node.js 22 LTS (`winget install OpenJS.NodeJS.LTS`) y reabrir la terminal. | Erick y Larry |
| 2 | **Compartir las pantallas de Stitch** (carpeta o zip con el HTML/Tailwind y las capturas, o el enlace del proyecto). No venían en el zip de la base de datos. | Larry |
| 3 | Un solo repositorio compartido en GitHub (el de Larry) con `main` protegida y acceso de Erick. | Larry |
| 4 | Agregar `C:\Program Files\PostgreSQL\18\bin` al PATH y tener a mano la contraseña del usuario `postgres`. | Erick |
| 5 | Acordar la forma del DTO `ComponentSpecs` y los filtros de `GET /offers`. | Ambos |

## 7. Si el ritmo no alcanza, se recorta en este orden

1. Nivel 4 completo (HU-15, 16, 14, 13, 07).
2. HU-17 (panel de métricas) y HU-18 (interruptor de visibilidad).
3. HU-19 (inventario completo): queda solo el listado.
4. Subida de varias fotos: queda 1 foto por oferta.
5. RC-09 a RC-12 (ya están fuera de esta semana).

**No se recorta:** RC-01 a RC-08 con sus pruebas, el catálogo con filtros, el botón de WhatsApp, el armador con selector de piezas compatibles, la autenticación y la publicación asistida.

## 8. Terminado de la semana

- Un visitante arma el caso CP-01 (300 W, 400 W recomendados), ve conflictos con texto e icono y contacta una tienda en un clic.
- Un cliente inicia sesión, se convierte en vendedor, se aprueba con `dev:approve-store` y publica una oferta con foto en la cascada Categoría → Marca → Modelo.
- `npm test`, `npm run test:int` y `db:verify` (34 de 34) en verde, con cobertura guardada.
- La verificación documental figura como **simulada** en el README y en la demostración.
