# Agregador y Validador de Hardware

Trabajo de grado de Ingeniería de Sistemas (UNIAJC, Cali). Plataforma web que valida la compatibilidad entre componentes de computador y agrega las ofertas de tiendas locales colombianas, con contacto directo por WhatsApp.

**Equipo:** Larry Hurtado (frontend) y Erick Guapacha (backend, base de datos y motor de compatibilidad).

## Requisitos

- **Node.js 22 o superior** (el proyecto se probó con Node 24 LTS).
- **PostgreSQL 15 o superior** instalado en local (solo para el backend; el frontend puede trabajar con datos simulados).
- Git.

## Primeros pasos

```bash
npm install
# crear el archivo .env en la raíz (ver "Variables de entorno")
npm test                 # pruebas de todos los espacios de trabajo
```

| Comando                 | Qué hace                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev:api`       | Arranca la API en `http://localhost:3000` (`/health` y `/ready` para comprobarla). |
| `npm run dev:web`       | Arranca el frontend en `http://localhost:5173` (reenvía `/api` a la API).          |
| `npm test`              | Ejecuta las pruebas unitarias de la API, la web y los paquetes.                    |
| `npm run test:coverage` | Igual que `npm test`, con informe de cobertura.                                    |
| `npm run lint`          | Revisa el código con ESLint.                                                       |
| `npm run format`        | Formatea el código con Prettier.                                                   |

## Variables de entorno

Se definen en un único archivo `.env` en la raíz del repositorio, que **se crea a mano en cada equipo y nunca se sube a git** (tampoco una plantilla). Todas son opcionales salvo `DATABASE_URL` cuando se use la base de datos.

| Variable           | Valor por defecto        | Para qué                                                                                       |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | (ninguno)                | Conexión a PostgreSQL: `postgres://postgres:<clave>@localhost:5432/<nombre>`.                  |
| `PORT`             | `3000`                   | Puerto de la API.                                                                              |
| `CORS_ORIGIN`      | `http://localhost:5173`  | Orígenes permitidos, separados por coma.                                                       |
| `LOG_LEVEL`        | `info`                   | Nivel de registro de la API.                                                                   |
| `ANALYTICS_SECRET` | (aleatorio por arranque) | Secreto (mínimo 16 caracteres) con el que se calcula el hash anónimo de sesión de los eventos. |
| `NODE_ENV`         | `development`            | Entorno de ejecución.                                                                          |
| `VITE_USE_MOCKS`   | `false`                  | `true` hace que el navegador use los datos simulados (MSW) en vez de la API.                   |

### Cómo crear tu `.env`

1. En la **raíz** del repositorio (junto a `package.json`) crea un archivo llamado exactamente `.env`. En PowerShell: `notepad .env` y acepta crearlo.
2. Escribe, cambiando `TU_CLAVE` por la contraseña de tu usuario `postgres`:

   ```
   DATABASE_URL=postgres://postgres:TU_CLAVE@localhost:5432/hardware_validator
   ```

3. Si la clave tiene caracteres especiales, escríbelos codificados: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `%` → `%25`.
4. Sin espacios alrededor del `=` y sin comillas.
5. Comprueba que git lo ignora: `git check-ignore .env` debe imprimir `.env`.

El nombre de la base debe empezar por `hardware_validator`: el comando `db:reset` se niega a tocar cualquier otra.

## Base de datos

Los scripts de `db/` son la única fuente de verdad del esquema (no se edita la base a mano en pgAdmin). Se ejecutan con `psql`, que se encuentra solo si está en el PATH o en `C:\Program Files\PostgreSQL`.

| Comando              | Qué hace                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run db:reset`   | Borra y recrea la base de `DATABASE_URL`, carga los scripts `001` a `004` y aplica las migraciones.   |
| `npm run db:verify`  | Ejecuta `005_verify.sql`: las 34 pruebas de integridad, permisos y reglas (todas deben decir `PASS`). |
| `npm run db:migrate` | Aplica solo las migraciones nuevas de `db/migrations/` y las anota en `schema_migrations`.            |

Para mirar las tablas puedes conectar pgAdmin 4 (o la extensión de PostgreSQL de VS Code) al mismo servidor; solo para consultar.

Cuentas de demostración (datos ficticios): `comprador1@demo.test`, `vendedor1@demo.test`, `admin@demo.test`… todas con la contraseña `Demo#2026`.

## Estructura

```
apps/
  api/                 Backend: Node.js + Express (monolito modular de 9 módulos)
  web/                 Frontend: React + Vite + Tailwind
packages/
  compat-engine/       Motor de compatibilidad (JavaScript puro, corre en navegador y servidor)
  contracts/           Códigos de error y esquemas Zod compartidos entre API y web
db/                    Scripts SQL y migraciones de PostgreSQL
docs/                  Planes, contexto y diseño
```

## Documentación

- [`docs/plan-de-desarrollo.md`](docs/plan-de-desarrollo.md): fases, reparto y decisiones.
- [`docs/plan-semana-1.md`](docs/plan-semana-1.md): plan de la primera semana y estrategia de pruebas.
- [`docs/contexto-frontend.md`](docs/contexto-frontend.md): contexto y contrato con el backend para el frontend.

## Atribución de datos

Los datos de componentes provienen de [BuildCores OpenDB](https://github.com/buildcores/buildcores-open-db) (licencia CC BY-NC-SA 4.0). El uso de este proyecto es educativo y no comercial.
