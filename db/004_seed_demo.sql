-- Datos de demostración 100 % FICTICIOS (correos @demo.test, NIT y teléfonos inventados).
-- Contraseña de todas las cuentas de prueba: Demo#2026  (hash bcrypt generado con pgcrypto).
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO identity.users(email, password_hash, full_name, role, terms_accepted_at, privacy_policy_version)
SELECT e, crypt('Demo#2026', gen_salt('bf', 12)), n, r::identity.user_role, now(), 'v1.0'
FROM (VALUES
 ('admin@demo.test',      'Administrador Demo',      'admin'),
 ('comprador1@demo.test', 'Camila Rojas (demo)',     'buyer'),
 ('comprador2@demo.test', 'Julián Pérez (demo)',     'buyer'),
 ('vendedor1@demo.test',  'Tecno Pasarela (demo)',   'seller'),
 ('vendedor2@demo.test',  'Unilago Gaming (demo)',   'seller'),
 ('vendedor3@demo.test',  'Cómputo Sur (demo)',      'seller'),
 ('vendedor4@demo.test',  'Hardware Plus (demo)',    'seller'),
 ('vendedor5@demo.test',  'Electro Nova (demo)',     'seller')
) AS t(e, n, r);

-- Comercios en distintos estados del flujo de verificación
INSERT INTO stores.stores(owner_user_id, legal_name, trade_name, nit, description, whatsapp_e164, department, city, address, commercial_center, latitude, longitude)
SELECT u.id, v.legal, v.trade, v.nit, v.descr, v.wa, v.dep, v.city, v.addr, v.cc, v.lat, v.lng
FROM (VALUES
 ('vendedor1@demo.test','Tecno Pasarela S.A.S. (demo)','TecnoPasarela Cali','900000001-1','Componentes y ensamble de equipos.','+573000000001','Valle del Cauca','Cali','Local 214, C.C. Pasarela','C.C. Pasarela',3.451600,-76.532000),
 ('vendedor2@demo.test','Unilago Gaming S.A.S. (demo)','Unilago Gaming','900000002-2','Hardware gamer y estaciones de trabajo.','+573000000002','Bogotá D.C.','Bogotá','Local 305, C.C. Unilago','C.C. Unilago',4.668000,-74.056000),
 ('vendedor3@demo.test','Cómputo Sur S.A.S. (demo)','ComputoSur','900000003-3','Distribuidor de componentes.','+573000000003','Antioquia','Medellín','Cra. 50 # 10-20',NULL,6.244200,-75.581200),
 ('vendedor4@demo.test','Hardware Plus S.A.S. (demo)','HardwarePlus','900000004-4',NULL,'+573000000004','Atlántico','Barranquilla','Cl. 72 # 45-10',NULL,NULL,NULL),
 ('vendedor5@demo.test','Electro Nova S.A.S. (demo)','ElectroNova',NULL,NULL,'+573000000005','Santander','Bucaramanga','Cl. 35 # 19-40',NULL,NULL,NULL)
) AS v(email, legal, trade, nit, descr, wa, dep, city, addr, cc, lat, lng)
JOIN identity.users u ON u.email = v.email;

INSERT INTO verification.requests(store_id, status)
SELECT id, 'not_submitted' FROM stores.stores;

-- Documentos ficticios (no existen en ningún bucket)
INSERT INTO verification.documents(request_id, doc_type, storage_key, original_name, mime_type, size_bytes, sha256)
SELECT r.id, d.t::verification.doc_type, 'demo/' || r.id || '/' || d.t || '.pdf', d.t || '.pdf', 'application/pdf', 120000,
       encode(digest(r.id::text || d.t, 'sha256'), 'hex')
FROM verification.requests r
JOIN stores.stores s ON s.id = r.store_id
CROSS JOIN (VALUES ('rut_nit'),('chamber_of_commerce_cert'),('legal_rep_id')) AS d(t)
WHERE s.trade_name IN ('TecnoPasarela Cali','Unilago Gaming','ComputoSur','HardwarePlus');

-- Estados: aprobado x2, pendiente, corrección solicitada, suspendido
UPDATE verification.requests r SET status='approved', submitted_at=now()-interval '20 days', reviewed_at=now()-interval '16 days',
       reviewed_by=(SELECT id FROM identity.users WHERE email='admin@demo.test'), reviewer_note='Documentos conformes.'
  FROM stores.stores s WHERE s.id=r.store_id AND s.trade_name IN ('TecnoPasarela Cali','Unilago Gaming');
UPDATE verification.requests r SET status='pending_review', submitted_at=now()-interval '2 days'
  FROM stores.stores s WHERE s.id=r.store_id AND s.trade_name='ComputoSur';
UPDATE verification.requests r SET status='correction_requested', submitted_at=now()-interval '9 days', reviewed_at=now()-interval '5 days',
       reviewed_by=(SELECT id FROM identity.users WHERE email='admin@demo.test'),
       reviewer_note='El certificado de existencia está vencido (más de 30 días). Cargue uno vigente.', deadline_at=now()+interval '10 days'
  FROM stores.stores s WHERE s.id=r.store_id AND s.trade_name='HardwarePlus';
UPDATE verification.requests r SET status='suspended', submitted_at=now()-interval '40 days', suspended_at=now()-interval '3 days',
       can_reapply_at=now()+interval '27 days'
  FROM stores.stores s WHERE s.id=r.store_id AND s.trade_name='ElectroNova';
-- La suspensión elimina documentos y el NIT (sin lista negra)
UPDATE stores.stores SET nit = NULL WHERE trade_name='ElectroNova';

INSERT INTO verification.reviews(request_id, admin_id, decision, note)
SELECT r.id, (SELECT id FROM identity.users WHERE email='admin@demo.test'),
       CASE r.status WHEN 'approved' THEN 'approve' ELSE 'request_correction' END::verification.decision, r.reviewer_note
  FROM verification.requests r WHERE r.status IN ('approved','correction_requested');

-- Evento de lectura: el comercio queda marcado como verificado (lo hace el servicio al aprobar)
UPDATE stores.stores s SET is_verified = true
  FROM verification.requests r WHERE r.store_id = s.id AND r.status = 'approved';

-- Ofertas (solo comercios verificados; el disparador lo exige)
INSERT INTO offers.offers(store_id, component_id, price_cop, item_condition, warranty_months, description)
SELECT s.id, c.id, v.price, v.cond::offers.item_condition, v.warr, v.descr
FROM (VALUES
 ('TecnoPasarela Cali','6b03b443', 859000,'new', 12,'Procesador AM5 nuevo, sellado.'),
 ('TecnoPasarela Cali','04984638', 529000,'new', 12,'Ryzen 5 5600 con cooler incluido.'),
 ('TecnoPasarela Cali','011e1664', 589000,'new', 12,'Placa B650M para AM5.'),
 ('TecnoPasarela Cali','01c7e802', 479000,'new', 12,'Placa B550 para AM4.'),
 ('TecnoPasarela Cali','01aa1aa3', 469000,'new', 12,'Kit DDR5 32 GB (2x16).'),
 ('TecnoPasarela Cali','025a42be', 189000,'used',  3,'Kit DDR4 16 GB usado, probado.'),
 ('TecnoPasarela Cali','06cb3a7e',1950000,'new', 24,'RTX 4060 Ti 8 GB.'),
 ('TecnoPasarela Cali','0d707b52', 489000,'new', 60,'Fuente modular 750 W Gold.'),
 ('TecnoPasarela Cali','090334a6', 429000,'new', 12,'Caja ATX con buen flujo de aire.'),
 ('TecnoPasarela Cali','010abcce',  99000,'new',  6,'Disipador de aire 155 mm.'),
 ('Unilago Gaming','4dcfffec',1699000,'new', 12,'Ryzen 7 7800X3D.'),
 ('Unilago Gaming','6b03b443', 879000,'new', 12,'Ryzen 5 7600 nuevo.'),
 ('Unilago Gaming','034a0f7a', 749000,'new', 12,'Placa B650 ATX con WiFi.'),
 ('Unilago Gaming','01f0cbe4', 499000,'new', 12,'Kit DDR5-5600 32 GB.'),
 ('Unilago Gaming','0727e86b',3050000,'new', 24,'RTX 4070 SUPER 12 GB.'),
 ('Unilago Gaming','06aadbb9',1290000,'new', 12,'RX 7600 8 GB.'),
 ('Unilago Gaming','0a2050c2', 519000,'new', 60,'Fuente 750 W ATX 3.0.'),
 ('Unilago Gaming','0acbff4f', 589000,'new', 12,'Caja Mini-ITX compacta.'),
 ('Unilago Gaming','03aa26f2', 139000,'new', 12,'Peerless Assassin 140 SE.'),
 ('Unilago Gaming','036ace82', 299000,'new', 36,'SSD NVMe 1 TB.'),
 ('Unilago Gaming','000deb7d', 559000,'new', 12,'Placa LGA 1700 DDR4.'),
 ('Unilago Gaming','19fbd8f2', 639000,'new', 12,'Intel Core i5-12400F.')
) AS v(store, pre, price, cond, warr, descr)
JOIN stores.stores s ON s.trade_name = v.store
JOIN catalog.components c ON c.opendb_id::text LIKE v.pre || '%';

-- Una oferta pausada (interruptor de visibilidad)
UPDATE offers.offers SET status='paused'
 WHERE store_id=(SELECT id FROM stores.stores WHERE trade_name='Unilago Gaming')
   AND component_id=(SELECT id FROM catalog.components WHERE opendb_id::text LIKE '06aadbb9%');
-- Un ajuste de precio para alimentar el historial
UPDATE offers.offers SET price_cop = 849000
 WHERE store_id=(SELECT id FROM stores.stores WHERE trade_name='TecnoPasarela Cali')
   AND component_id=(SELECT id FROM catalog.components WHERE opendb_id::text LIKE '6b03b443%');

-- Armados: A (anónimo compartido, compatible, AM5/DDR5) y B (de comprador1, con incompatibilidades a propósito)
INSERT INTO builds.builds(user_id, name, share_code, estimated_watts) VALUES
 (NULL, 'Gamer AM5 1080p', 'Ab3dE9fG2h', 300),
 ((SELECT id FROM identity.users WHERE email='comprador1@demo.test'), 'Prueba mezclada (incompatible)', 'Zx8Qw1Er5T', 140);

INSERT INTO builds.build_items(build_id, category, slot, component_id, offer_id, unit_price_cop)
SELECT b.id, c.category, 1, c.id, o.id, o.price_cop
FROM (VALUES
 ('Ab3dE9fG2h','6b03b443'),('Ab3dE9fG2h','011e1664'),('Ab3dE9fG2h','01aa1aa3'),('Ab3dE9fG2h','06cb3a7e'),
 ('Ab3dE9fG2h','0d707b52'),('Ab3dE9fG2h','090334a6'),('Ab3dE9fG2h','010abcce'),('Ab3dE9fG2h','036ace82'),
 ('Zx8Qw1Er5T','04984638'),('Zx8Qw1Er5T','011e1664'),('Zx8Qw1Er5T','025a42be'),('Zx8Qw1Er5T','0acbff4f')
) AS v(code, pre)
JOIN builds.builds b ON b.share_code = v.code
JOIN catalog.components c ON c.opendb_id::text LIKE v.pre || '%'
LEFT JOIN LATERAL (SELECT o2.id, o2.price_cop FROM offers.offers o2 WHERE o2.component_id=c.id AND o2.deleted_at IS NULL AND o2.status='active' ORDER BY o2.price_cop LIMIT 1) o ON true;

INSERT INTO builds.wishlist_items(user_id, component_id)
SELECT u.id, c.id FROM identity.users u, catalog.components c
 WHERE u.email='comprador1@demo.test' AND c.opendb_id::text LIKE ANY (ARRAY['4dcfffec%','0727e86b%']);

-- Analítica: eventos sintéticos de los últimos 10 días (sin datos personales)
SELECT analytics.ensure_month_partition((now() - interval '1 month')::date);
SELECT analytics.ensure_month_partition(now()::date);
SELECT analytics.ensure_month_partition((now() + interval '1 month')::date);

INSERT INTO analytics.offer_events(offer_id, store_id, event_type, session_hash, occurred_at)
SELECT o.id, o.store_id,
       CASE WHEN g % 5 = 0 THEN 'whatsapp_click' ELSE 'view' END::analytics.event_type,
       encode(digest('sesion-' || (g % 37) || '-' || o.id, 'sha256'), 'hex'),
       now() - (g % 10) * interval '1 day' - (g % 24) * interval '1 hour'
FROM offers.offers o, generate_series(1, 14) AS g
WHERE o.deleted_at IS NULL;
REFRESH MATERIALIZED VIEW analytics.store_daily_stats;

-- Bandeja de correos y auditoría de ejemplo
INSERT INTO notifications.email_outbox(user_id, to_email, template, payload, status, sent_at)
SELECT u.id, u.email, 'verification_approved', jsonb_build_object('store', s.trade_name), 'sent', now() - interval '16 days'
  FROM stores.stores s JOIN identity.users u ON u.id = s.owner_user_id WHERE s.is_verified;
INSERT INTO notifications.email_outbox(user_id, to_email, template, payload)
SELECT u.id, u.email, 'verification_correction_requested', jsonb_build_object('store', s.trade_name, 'deadline_days', 15)
  FROM stores.stores s JOIN identity.users u ON u.id = s.owner_user_id WHERE s.trade_name='HardwarePlus';
INSERT INTO audit.events(actor_user_id, action, entity, entity_id, details)
SELECT (SELECT id FROM identity.users WHERE email='admin@demo.test'), 'verification.approved', 'verification.requests', r.id::text, '{"via":"seed"}'
  FROM verification.requests r WHERE r.status='approved';
COMMIT;
