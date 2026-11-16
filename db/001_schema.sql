-- =====================================================================
-- Agregador y Validador de Hardware - Esquema de base de datos (v1.0)
-- PostgreSQL 15+  |  Monolito modular: un esquema por módulo
-- Script idempotente para entorno nuevo: ejecutar sobre una BD vacía.
-- Convención: identificadores en inglés (snake_case); comentarios en español.
-- =====================================================================
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS citext;    -- correos sin distinción de mayúsculas
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- búsqueda aproximada en el buscador global
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- crypt()/gen_salt() solo para datos de demostración

-- ---------------------------------------------------------------------
-- 0. ESQUEMAS (uno por módulo + lectura compuesta + auditoría)
-- ---------------------------------------------------------------------
CREATE SCHEMA identity;       -- Módulo Identidad y acceso
CREATE SCHEMA stores;         -- Módulo Comercios (perfil, ubicación, WhatsApp)
CREATE SCHEMA verification;   -- Módulo Verificación de comercios
CREATE SCHEMA catalog;        -- Módulo Catálogo maestro (Base de Datos Maestra)
CREATE SCHEMA compat;         -- Módulo Compatibilidad (reglas y parámetros)
CREATE SCHEMA offers;         -- Módulo Ofertas (publicaciones de las tiendas)
CREATE SCHEMA builds;         -- Módulo Armados (configuraciones y favoritos)
CREATE SCHEMA analytics;      -- Módulo Analítica (vistas y clics a WhatsApp)
CREATE SCHEMA notifications;  -- Módulo Notificaciones (bandeja de salida de correos)
CREATE SCHEMA audit;          -- Auditoría transversal (solo inserción)
CREATE SCHEMA readmodel;      -- Vistas de lectura compuestas (único cruce permitido entre módulos)

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE identity.user_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE identity.user_status AS ENUM ('active', 'disabled');

CREATE TYPE catalog.component_category AS ENUM
  ('cpu', 'motherboard', 'ram', 'gpu', 'psu', 'case', 'cooler', 'storage');
CREATE TYPE catalog.component_status AS ENUM ('draft', 'active', 'discontinued');

CREATE TYPE verification.status AS ENUM
  ('not_submitted', 'pending_review', 'correction_requested', 'approved', 'rejected', 'suspended');
CREATE TYPE verification.doc_type AS ENUM ('rut_nit', 'chamber_of_commerce_cert', 'legal_rep_id');
CREATE TYPE verification.decision AS ENUM ('approve', 'request_correction', 'reject');

CREATE TYPE offers.item_condition AS ENUM ('new', 'used');
CREATE TYPE offers.offer_status AS ENUM ('active', 'paused');

CREATE TYPE analytics.event_type AS ENUM ('view', 'whatsapp_click');

-- ---------------------------------------------------------------------
-- 2. IDENTIDAD Y ACCESO
-- ---------------------------------------------------------------------
CREATE TABLE identity.users (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  citext NOT NULL UNIQUE,
  password_hash          text   NOT NULL,                     -- bcrypt (RNF-SEG-02)
  full_name              text   NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  role                   identity.user_role   NOT NULL DEFAULT 'buyer',
  status                 identity.user_status NOT NULL DEFAULT 'active',
  terms_accepted_at      timestamptz NOT NULL,                -- consentimiento (Ley 1581/2012)
  privacy_policy_version text        NOT NULL,
  last_login_at          timestamptz,
  anonymized_at          timestamptz,                         -- derecho de supresión
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_users_email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE TABLE identity.refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,                           -- solo se guarda el hash (SHA-256)
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_tokens_user ON identity.refresh_tokens(user_id) WHERE revoked_at IS NULL;

CREATE TABLE identity.password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. COMERCIOS
-- ---------------------------------------------------------------------
CREATE TABLE stores.stores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id     uuid NOT NULL UNIQUE REFERENCES identity.users(id),   -- 1 usuario = 1 comercio
  legal_name        text NOT NULL CHECK (char_length(legal_name) BETWEEN 2 AND 200),
  trade_name        text NOT NULL CHECK (char_length(trade_name) BETWEEN 2 AND 120),
  nit               text CHECK (nit ~ '^[0-9]{8,10}-[0-9]$'),             -- se anula al suspender (sin lista negra)
  description       text CHECK (char_length(description) <= 1000),
  logo_key          text,
  whatsapp_e164     text CHECK (whatsapp_e164 ~ '^\+[1-9][0-9]{7,14}$'),  -- HU-23
  department        text,
  city              text,
  address           text,
  commercial_center text,                                                  -- p. ej. C.C. Pasarela (Cali)
  latitude          numeric(9,6) CHECK (latitude  BETWEEN -90  AND 90),
  longitude         numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  opening_hours     jsonb,
  is_verified       boolean NOT NULL DEFAULT false,   -- copia de lectura; la fuente es verification.requests
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- Un comercio verificado debe tener el perfil mínimo completo para ser contactado
  CONSTRAINT ck_store_verified_profile CHECK (
    NOT is_verified OR (whatsapp_e164 IS NOT NULL AND city IS NOT NULL AND address IS NOT NULL AND nit IS NOT NULL))
);
CREATE UNIQUE INDEX uq_stores_nit_verified ON stores.stores(nit) WHERE is_verified;
CREATE INDEX ix_stores_city_verified ON stores.stores(department, city) WHERE is_verified;
CREATE INDEX ix_stores_trade_name_trgm ON stores.stores USING gin (trade_name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 4. VERIFICACIÓN DE COMERCIOS
-- ---------------------------------------------------------------------
CREATE TABLE verification.requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL UNIQUE REFERENCES stores.stores(id) ON DELETE CASCADE,
  status        verification.status NOT NULL DEFAULT 'not_submitted',
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid REFERENCES identity.users(id),
  reviewer_note text,
  deadline_at   timestamptz,     -- plazo de 15 días tras corrección o rechazo
  suspended_at  timestamptz,
  can_reapply_at timestamptz,    -- suspensión + 30 días
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_req_deadline  CHECK (status NOT IN ('correction_requested','rejected') OR deadline_at IS NOT NULL),
  CONSTRAINT ck_req_suspended CHECK (status <> 'suspended' OR (suspended_at IS NOT NULL AND can_reapply_at IS NOT NULL)),
  CONSTRAINT ck_req_approved  CHECK (status <> 'approved' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
  CONSTRAINT ck_req_submitted CHECK (status = 'not_submitted' OR submitted_at IS NOT NULL OR status = 'suspended')
);
CREATE INDEX ix_req_queue    ON verification.requests(submitted_at) WHERE status = 'pending_review';
CREATE INDEX ix_req_deadline ON verification.requests(deadline_at)  WHERE status IN ('correction_requested','rejected');

CREATE TABLE verification.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES verification.requests(id) ON DELETE CASCADE,
  doc_type      verification.doc_type NOT NULL,
  storage_key   text NOT NULL UNIQUE,                       -- bucket privado, acceso por URL firmada
  original_name text NOT NULL,
  mime_type     text NOT NULL CHECK (mime_type IN ('application/pdf','image/jpeg','image/png')),
  size_bytes    integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),   -- máx. 5 MB
  sha256        char(64) NOT NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, doc_type)                             -- un documento vigente por tipo
);

CREATE TABLE verification.reviews (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id  uuid NOT NULL REFERENCES verification.requests(id) ON DELETE CASCADE,
  admin_id    uuid NOT NULL REFERENCES identity.users(id),
  decision    verification.decision NOT NULL,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_review_note CHECK (decision = 'approve' OR char_length(btrim(coalesce(note,''))) > 0)
);
CREATE INDEX ix_reviews_request ON verification.reviews(request_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 5. CATÁLOGO MAESTRO (Base de Datos Maestra, controlada y versionada)
-- ---------------------------------------------------------------------
CREATE TABLE catalog.data_sources (
  id                 smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name               text NOT NULL UNIQUE,
  license            text NOT NULL,
  url                text,
  release_identifier text,
  attribution_text   text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE catalog.brands (
  id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  citext NOT NULL UNIQUE,
  slug  text   NOT NULL UNIQUE
);

CREATE TABLE catalog.sockets (
  id    smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name  citext NOT NULL UNIQUE      -- nombre normalizado: 'AM5', 'LGA 1700'
);

CREATE TABLE catalog.components (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      catalog.component_category NOT NULL,
  brand_id      integer NOT NULL REFERENCES catalog.brands(id),
  model         text NOT NULL,
  display_name  text NOT NULL,
  part_numbers  text[] NOT NULL DEFAULT '{}',
  opendb_id     uuid UNIQUE,                                -- referencia al registro de BuildCores OpenDB
  source_id     smallint REFERENCES catalog.data_sources(id),
  release_year  smallint CHECK (release_year BETWEEN 1990 AND 2100),
  status        catalog.component_status NOT NULL DEFAULT 'active',
  version       integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  extra_specs   jsonb NOT NULL DEFAULT '{}'::jsonb,          -- atributos que no participan en reglas
  search_vector tsvector GENERATED ALWAYS AS
                (to_tsvector('simple', coalesce(display_name,'') || ' ' || coalesce(model,''))) STORED,
  created_by    uuid REFERENCES identity.users(id),
  updated_by    uuid REFERENCES identity.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, category),                                      -- permite clave foránea compuesta desde subtipos
  UNIQUE (brand_id, category, model)
);
CREATE INDEX ix_components_category_brand ON catalog.components(category, brand_id) WHERE status = 'active';
CREATE INDEX ix_components_search ON catalog.components USING gin (search_vector);
CREATE INDEX ix_components_name_trgm ON catalog.components USING gin (display_name gin_trgm_ops);

-- Subtipos (herencia por tablas de clase): columnas normalizadas que usan las reglas de compatibilidad.
CREATE TABLE catalog.cpu_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'cpu' CHECK (category = 'cpu'),
  socket_id     smallint NOT NULL REFERENCES catalog.sockets(id),
  tdp_w         smallint NOT NULL CHECK (tdp_w > 0),
  cores         smallint CHECK (cores > 0),
  threads       smallint CHECK (threads > 0),
  base_clock_ghz  numeric(4,2),
  boost_clock_ghz numeric(4,2),
  memory_types  text[],                                       -- {'DDR4','DDR5'}; NULL = desconocido
  has_integrated_graphics boolean,
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);
CREATE INDEX ix_cpu_socket ON catalog.cpu_specs(socket_id);

CREATE TABLE catalog.motherboard_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'motherboard' CHECK (category = 'motherboard'),
  socket_id     smallint NOT NULL REFERENCES catalog.sockets(id),
  form_factor   text NOT NULL,                                -- ATX, Micro ATX, Mini-ITX, EATX
  chipset       text,
  ram_type      text NOT NULL CHECK (ram_type ~ '^DDR[1-5]$'),
  ram_slots     smallint NOT NULL CHECK (ram_slots BETWEEN 1 AND 16),
  ram_max_gb    integer CHECK (ram_max_gb > 0),
  m2_slots      smallint NOT NULL DEFAULT 0 CHECK (m2_slots >= 0),
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);
CREATE INDEX ix_mb_socket_ram ON catalog.motherboard_specs(socket_id, ram_type);

CREATE TABLE catalog.ram_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'ram' CHECK (category = 'ram'),
  ram_type      text NOT NULL CHECK (ram_type ~ '^DDR[1-5]$'),
  speed_mhz     integer NOT NULL CHECK (speed_mhz > 0),
  modules_qty   smallint NOT NULL CHECK (modules_qty BETWEEN 1 AND 8),
  capacity_gb   integer NOT NULL CHECK (capacity_gb > 0),     -- capacidad total del kit
  form_factor   text,                                         -- DIMM / SODIMM
  cas_latency   smallint,
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);
CREATE INDEX ix_ram_type ON catalog.ram_specs(ram_type);

CREATE TABLE catalog.gpu_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'gpu' CHECK (category = 'gpu'),
  tdp_w         smallint NOT NULL CHECK (tdp_w > 0),
  length_mm     smallint CHECK (length_mm > 0),               -- NULL = no verificable
  slot_width    numeric(3,1),
  interface     text,
  memory_gb     smallint,
  power_connectors jsonb,                                     -- {"pcie_8_pin":2,"pcie_12vhpwr":0}
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);

CREATE TABLE catalog.psu_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'psu' CHECK (category = 'psu'),
  wattage_w     integer NOT NULL CHECK (wattage_w > 0),
  form_factor   text,
  efficiency_rating text,
  modular       text,
  connectors    jsonb,
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);

CREATE TABLE catalog.case_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'case' CHECK (category = 'case'),
  form_factor   text,
  supported_mb_form_factors  text[] NOT NULL CHECK (cardinality(supported_mb_form_factors) > 0),
  supported_psu_form_factors text[],                          -- NULL = no verificable
  max_gpu_length_mm     smallint CHECK (max_gpu_length_mm > 0),
  max_cooler_height_mm  smallint CHECK (max_cooler_height_mm > 0),
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);

CREATE TABLE catalog.cooler_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'cooler' CHECK (category = 'cooler'),
  height_mm     smallint CHECK (height_mm > 0),               -- NULL = no verificable
  water_cooled  boolean,
  radiator_mm   smallint,
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);

CREATE TABLE catalog.cooler_sockets (
  cooler_id  uuid     NOT NULL REFERENCES catalog.cooler_specs(component_id) ON DELETE CASCADE,
  socket_id  smallint NOT NULL REFERENCES catalog.sockets(id),
  PRIMARY KEY (cooler_id, socket_id)
);
CREATE INDEX ix_cooler_sockets_socket ON catalog.cooler_sockets(socket_id);

CREATE TABLE catalog.storage_specs (
  component_id  uuid PRIMARY KEY,
  category      catalog.component_category NOT NULL DEFAULT 'storage' CHECK (category = 'storage'),
  storage_type  text NOT NULL,                                -- SSD / HDD
  interface     text NOT NULL,                                -- NVMe / SATA
  capacity_gb   integer NOT NULL CHECK (capacity_gb > 0),
  form_factor   text,
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category) ON DELETE CASCADE
);

CREATE TABLE catalog.component_versions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  component_id  uuid NOT NULL REFERENCES catalog.components(id) ON DELETE CASCADE,
  version       integer NOT NULL,
  snapshot      jsonb NOT NULL,                                -- registro completo en esa versión
  change_reason text NOT NULL CHECK (char_length(btrim(change_reason)) > 0),
  changed_by    uuid REFERENCES identity.users(id),
  changed_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_id, version)
);

-- Registra una nueva versión: incrementa components.version y guarda la instantánea (cabecera + subtipo).
-- La invoca el servicio de catálogo dentro de la misma transacción que modifica el componente.
CREATE FUNCTION catalog.publish_version(p_component_id uuid, p_reason text, p_user uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_cat catalog.component_category;
  v_ver integer;
  v_snap jsonb;
  v_spec jsonb;
BEGIN
  SELECT category INTO v_cat FROM catalog.components WHERE id = p_component_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Componente % no existe', p_component_id; END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_ver FROM catalog.component_versions WHERE component_id = p_component_id;
  UPDATE catalog.components
     SET version = v_ver, updated_at = now(), updated_by = p_user
   WHERE id = p_component_id;

  SELECT to_jsonb(c) - 'search_vector' INTO v_snap FROM catalog.components c WHERE c.id = p_component_id;
  EXECUTE format('SELECT to_jsonb(s) FROM catalog.%I s WHERE s.component_id = $1', v_cat::text || '_specs')
     INTO v_spec USING p_component_id;
  INSERT INTO catalog.component_versions(component_id, version, snapshot, change_reason, changed_by)
  VALUES (p_component_id, v_ver, v_snap || jsonb_build_object('specs', COALESCE(v_spec, '{}'::jsonb)), p_reason, p_user);
  RETURN v_ver;
END $$;

-- ---------------------------------------------------------------------
-- 6. COMPATIBILIDAD (registro de reglas y parámetros; la lógica vive en el motor)
-- ---------------------------------------------------------------------
CREATE TABLE compat.rules (
  code         text PRIMARY KEY CHECK (code ~ '^RC-[0-9]{2}$'),
  name         text NOT NULL,
  description  text NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('error', 'warning')),
  is_enabled   boolean NOT NULL DEFAULT true,
  is_mvp_core  boolean NOT NULL DEFAULT true,
  related_hu   text[] NOT NULL DEFAULT '{HU-04}'
);

CREATE TABLE compat.params (
  key          text PRIMARY KEY,
  value        numeric NOT NULL,
  unit         text,
  description  text NOT NULL
);

-- ---------------------------------------------------------------------
-- 7. OFERTAS
-- ---------------------------------------------------------------------
CREATE TABLE offers.offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores.stores(id),
  component_id    uuid NOT NULL REFERENCES catalog.components(id),
  price_cop       numeric(12,0) NOT NULL CHECK (price_cop > 0),
  item_condition  offers.item_condition NOT NULL,
  warranty_months smallint NOT NULL DEFAULT 0 CHECK (warranty_months BETWEEN 0 AND 120),
  description     text CHECK (char_length(description) <= 1000),
  status          offers.offer_status NOT NULL DEFAULT 'active',    -- interruptor de visibilidad (HU-18)
  published_at    timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz                                        -- baja lógica (HU-19)
);
CREATE UNIQUE INDEX uq_offer_live ON offers.offers(store_id, component_id, item_condition) WHERE deleted_at IS NULL;
CREATE INDEX ix_offers_component_price ON offers.offers(component_id, price_cop) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX ix_offers_store ON offers.offers(store_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_offers_recent ON offers.offers(published_at DESC) WHERE status = 'active' AND deleted_at IS NULL;

CREATE TABLE offers.offer_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id    uuid NOT NULL REFERENCES offers.offers(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  position    smallint NOT NULL CHECK (position BETWEEN 1 AND 5),
  alt_text    text,
  UNIQUE (offer_id, position)
);

CREATE TABLE offers.offer_price_history (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_id    uuid NOT NULL REFERENCES offers.offers(id) ON DELETE CASCADE,
  price_cop   numeric(12,0) NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_price_history_offer ON offers.offer_price_history(offer_id, changed_at DESC);

-- Defensa en profundidad de HU-27: ninguna oferta puede quedar activa si el comercio no está verificado.
CREATE FUNCTION offers.fn_require_verified_store() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM stores.stores s WHERE s.id = NEW.store_id AND s.is_verified) THEN
    RAISE EXCEPTION 'STORE_NOT_VERIFIED: el comercio % no está verificado', NEW.store_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_offers_require_verified
  BEFORE INSERT OR UPDATE OF status, store_id ON offers.offers
  FOR EACH ROW EXECUTE FUNCTION offers.fn_require_verified_store();

CREATE FUNCTION offers.fn_track_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.price_cop IS DISTINCT FROM OLD.price_cop THEN
    INSERT INTO offers.offer_price_history(offer_id, price_cop) VALUES (NEW.id, NEW.price_cop);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_offers_price_history
  AFTER INSERT ON offers.offers FOR EACH ROW EXECUTE FUNCTION offers.fn_track_price();
CREATE FUNCTION offers.fn_touch_and_track() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price_cop IS DISTINCT FROM OLD.price_cop THEN
    INSERT INTO offers.offer_price_history(offer_id, price_cop) VALUES (NEW.id, NEW.price_cop);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_offers_touch
  BEFORE UPDATE ON offers.offers FOR EACH ROW EXECUTE FUNCTION offers.fn_touch_and_track();

-- ---------------------------------------------------------------------
-- 8. ARMADOS Y FAVORITOS
-- ---------------------------------------------------------------------
CREATE TABLE builds.builds (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES identity.users(id) ON DELETE SET NULL,   -- NULL = armado anónimo compartido
  name             text NOT NULL DEFAULT 'Mi configuración' CHECK (char_length(name) BETWEEN 1 AND 100),
  share_code       text NOT NULL UNIQUE CHECK (share_code ~ '^[A-Za-z0-9]{10}$'),   -- URL permanente (HU-07)
  estimated_watts  integer CHECK (estimated_watts >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_builds_user ON builds.builds(user_id, updated_at DESC) WHERE user_id IS NOT NULL;

CREATE TABLE builds.build_items (
  build_id       uuid NOT NULL REFERENCES builds.builds(id) ON DELETE CASCADE,
  category       catalog.component_category NOT NULL,
  slot           smallint NOT NULL DEFAULT 1 CHECK (slot BETWEEN 1 AND 4),
  component_id   uuid NOT NULL,
  offer_id       uuid REFERENCES offers.offers(id) ON DELETE SET NULL,
  unit_price_cop numeric(12,0) CHECK (unit_price_cop > 0),       -- precio al momento de armar
  PRIMARY KEY (build_id, category, slot),
  -- el componente debe pertenecer a la categoría de la ranura
  FOREIGN KEY (component_id, category) REFERENCES catalog.components(id, category)
);
CREATE INDEX ix_build_items_component ON builds.build_items(component_id);

CREATE TABLE builds.wishlist_items (
  user_id       uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  component_id  uuid NOT NULL REFERENCES catalog.components(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, component_id)
);

-- ---------------------------------------------------------------------
-- 9. ANALÍTICA (eventos particionados por mes; sin datos personales)
-- ---------------------------------------------------------------------
CREATE TABLE analytics.offer_events (
  id            bigint GENERATED ALWAYS AS IDENTITY,
  offer_id      uuid NOT NULL REFERENCES offers.offers(id) ON DELETE CASCADE,
  store_id      uuid NOT NULL REFERENCES stores.stores(id),
  event_type    analytics.event_type NOT NULL,
  session_hash  char(64) NOT NULL,         -- hash(sal diaria + IP + agente): no reversible
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE analytics.offer_events_default PARTITION OF analytics.offer_events DEFAULT;

CREATE FUNCTION analytics.ensure_month_partition(p_month date) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name  text := format('offer_events_%s', to_char(v_start, 'YYYY_MM'));
BEGIN
  IF to_regclass(format('analytics.%I', v_name)) IS NULL THEN
    EXECUTE format('CREATE TABLE analytics.%I PARTITION OF analytics.offer_events FOR VALUES FROM (%L) TO (%L)',
                   v_name, v_start, v_end);
  END IF;
END $$;

CREATE INDEX ix_events_store_time ON analytics.offer_events(store_id, occurred_at DESC);
CREATE INDEX ix_events_offer_time ON analytics.offer_events(offer_id, occurred_at DESC);

CREATE MATERIALIZED VIEW analytics.store_daily_stats AS
SELECT store_id,
       (occurred_at AT TIME ZONE 'America/Bogota')::date AS day,
       count(*) FILTER (WHERE event_type = 'view')            AS views,
       count(*) FILTER (WHERE event_type = 'whatsapp_click')  AS whatsapp_clicks,
       count(DISTINCT session_hash)                           AS unique_sessions
  FROM analytics.offer_events
 GROUP BY 1, 2;
CREATE UNIQUE INDEX uq_store_daily_stats ON analytics.store_daily_stats(store_id, day);

-- Retención: los eventos crudos se conservan 13 meses; los agregados diarios, sin límite.
CREATE FUNCTION analytics.purge_old_events(p_retain interval DEFAULT interval '13 months') RETURNS bigint
LANGUAGE sql AS $$
  WITH d AS (DELETE FROM analytics.offer_events WHERE occurred_at < now() - p_retain RETURNING 1)
  SELECT count(*) FROM d;
$$;

-- ---------------------------------------------------------------------
-- 10. NOTIFICACIONES (patrón bandeja de salida) Y AUDITORÍA
-- ---------------------------------------------------------------------
CREATE TABLE notifications.email_outbox (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  to_email      citext NOT NULL,
  template      text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts      smallint NOT NULL DEFAULT 0,
  last_error    text,
  scheduled_at  timestamptz NOT NULL DEFAULT now(),
  sent_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_outbox_pending ON notifications.email_outbox(scheduled_at) WHERE status = 'pending';

CREATE TABLE audit.events (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id  uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  action         text NOT NULL,
  entity         text NOT NULL,
  entity_id      text,
  details        jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_entity ON audit.events(entity, entity_id);
CREATE INDEX ix_audit_time   ON audit.events(occurred_at DESC);

CREATE FUNCTION audit.fn_block_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit.events es de solo inserción'; END $$;
CREATE TRIGGER trg_audit_append_only
  BEFORE UPDATE OR DELETE ON audit.events FOR EACH ROW EXECUTE FUNCTION audit.fn_block_changes();

-- ---------------------------------------------------------------------
-- 11. MODELO DE LECTURA (único punto autorizado de cruce entre módulos)
-- ---------------------------------------------------------------------
CREATE VIEW readmodel.public_offers AS
SELECT o.id                AS offer_id,
       o.price_cop,
       o.item_condition,
       o.warranty_months,
       o.published_at,
       c.id                AS component_id,
       c.category,
       c.display_name,
       c.model,
       b.name              AS brand,
       s.id                AS store_id,
       s.trade_name        AS store_name,
       s.city, s.department, s.commercial_center,
       s.whatsapp_e164,
       (SELECT i.storage_key FROM offers.offer_images i WHERE i.offer_id = o.id ORDER BY i.position LIMIT 1) AS cover_image_key
  FROM offers.offers o
  JOIN stores.stores s     ON s.id = o.store_id AND s.is_verified
  JOIN catalog.components c ON c.id = o.component_id AND c.status = 'active'
  JOIN catalog.brands b     ON b.id = c.brand_id
 WHERE o.status = 'active' AND o.deleted_at IS NULL;

CREATE VIEW readmodel.best_price_by_component AS
SELECT component_id, min(price_cop) AS min_price_cop, count(*) AS offers_count
  FROM readmodel.public_offers GROUP BY component_id;

-- ---------------------------------------------------------------------
-- 12. ROLES Y PERMISOS (mínimo privilegio; los usuarios de conexión heredan de estos roles)
-- ---------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hw_app')      THEN CREATE ROLE hw_app      NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hw_readonly') THEN CREATE ROLE hw_readonly NOLOGIN; END IF;
END $$;

-- Aplicación: DML sobre sus esquemas; sin DDL; auditoría solo INSERT/SELECT
GRANT USAGE ON SCHEMA identity, stores, verification, catalog, compat, offers, builds,
                      analytics, notifications, audit, readmodel TO hw_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA
      identity, stores, verification, catalog, compat, offers, builds, analytics, notifications TO hw_app;
GRANT SELECT, INSERT ON audit.events TO hw_app;
GRANT SELECT ON ALL TABLES IN SCHEMA readmodel TO hw_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA catalog, verification, offers, analytics, audit TO hw_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA catalog, analytics TO hw_app;

-- Solo lectura (reportes, tutores): sin datos personales ni documentos
GRANT USAGE ON SCHEMA catalog, compat, offers, analytics, readmodel TO hw_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA catalog, compat, readmodel TO hw_readonly;
GRANT SELECT ON analytics.store_daily_stats TO hw_readonly;
REVOKE ALL ON ALL TABLES IN SCHEMA identity, verification, notifications, audit FROM hw_readonly;
