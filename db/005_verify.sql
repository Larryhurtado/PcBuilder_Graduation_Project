-- Verificación de integridad, restricciones, permisos y reglas de compatibilidad de referencia.
-- Ejecutar tras 001-004. Resultado esperado: todas las pruebas en PASS.
\set ON_ERROR_STOP on
\pset format aligned
CREATE TEMP TABLE test_results(id text, descr text, passed boolean, detail text);

-- Ejecuta una instrucción que DEBE fallar con el SQLSTATE indicado (la transacción interna se revierte siempre).
CREATE FUNCTION pg_temp.expect_error(p_id text, p_descr text, p_sql text, p_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    INSERT INTO test_results VALUES (p_id, p_descr, false, 'la instrucción no falló');
    RAISE EXCEPTION USING ERRCODE = 'ZZ001', MESSAGE = 'rollback_test';
  EXCEPTION
    WHEN SQLSTATE 'ZZ001' THEN NULL;  -- revertir cambios de la prueba que no falló
    WHEN OTHERS THEN
      IF SQLSTATE = p_state THEN INSERT INTO test_results VALUES (p_id, p_descr, true, 'SQLSTATE ' || SQLSTATE);
      ELSE INSERT INTO test_results VALUES (p_id, p_descr, false, 'SQLSTATE ' || SQLSTATE || ': ' || SQLERRM); END IF;
  END;
END $$;
CREATE FUNCTION pg_temp.expect_true(p_id text, p_descr text, p_sql text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r boolean;
BEGIN EXECUTE p_sql INTO r; INSERT INTO test_results VALUES (p_id, p_descr, COALESCE(r, false), NULL); END $$;

\o /dev/null
-- A. Pruebas de inserción inválida (RNF-MANT-01)
SELECT pg_temp.expect_error('INV-01','FK: oferta con componente inexistente',
 $q$INSERT INTO offers.offers(store_id,component_id,price_cop,item_condition) SELECT id, gen_random_uuid(), 1000, 'new' FROM stores.stores WHERE is_verified LIMIT 1$q$, '23503');
SELECT pg_temp.expect_error('INV-02','NOT NULL: oferta sin precio',
 $q$INSERT INTO offers.offers(store_id,component_id,item_condition) SELECT s.id, c.id, 'new' FROM stores.stores s, catalog.components c WHERE s.is_verified LIMIT 1$q$, '23502');
SELECT pg_temp.expect_error('INV-03','UNIQUE: correo duplicado (sin distinguir mayúsculas)',
 $q$INSERT INTO identity.users(email,password_hash,full_name,terms_accepted_at,privacy_policy_version) VALUES ('ADMIN@demo.test','x','Duplicado',now(),'v1.0')$q$, '23505');
SELECT pg_temp.expect_error('INV-04','CHECK: precio menor o igual a cero',
 $q$UPDATE offers.offers SET price_cop = 0 WHERE id = (SELECT id FROM offers.offers LIMIT 1)$q$, '23514');
SELECT pg_temp.expect_error('INV-05','Regla HU-27: publicar con comercio no verificado',
 $q$INSERT INTO offers.offers(store_id,component_id,price_cop,item_condition) SELECT s.id, c.id, 500000, 'new' FROM stores.stores s, catalog.components c WHERE s.trade_name='ComputoSur' LIMIT 1$q$, '23514');
SELECT pg_temp.expect_error('INV-06','FK compuesta: GPU registrada como ranura de CPU en un armado',
 $q$INSERT INTO builds.build_items(build_id,category,slot,component_id) SELECT b.id,'cpu',2,c.id FROM builds.builds b, catalog.components c WHERE c.category='gpu' LIMIT 1$q$, '23503');
SELECT pg_temp.expect_error('INV-07','FK compuesta: especificación de CPU sobre un componente que es GPU',
 $q$INSERT INTO catalog.cpu_specs(component_id,socket_id,tdp_w) SELECT c.id,(SELECT id FROM catalog.sockets LIMIT 1),65 FROM catalog.components c WHERE c.category='gpu' LIMIT 1$q$, '23503');
SELECT pg_temp.expect_error('INV-08','UNIQUE parcial: segunda oferta viva del mismo producto/estado en la misma tienda',
 $q$INSERT INTO offers.offers(store_id,component_id,price_cop,item_condition) SELECT store_id,component_id,price_cop,item_condition FROM offers.offers WHERE deleted_at IS NULL LIMIT 1$q$, '23505');
SELECT pg_temp.expect_error('INV-09','Auditoría de solo inserción: UPDATE bloqueado',
 $q$UPDATE audit.events SET action='x'$q$, 'P0001');
SELECT pg_temp.expect_error('INV-10','CHECK: formato de WhatsApp (E.164)',
 $q$UPDATE stores.stores SET whatsapp_e164 = '3001234567' WHERE is_verified$q$, '23514');
SELECT pg_temp.expect_error('INV-11','CHECK: comercio verificado sin dirección',
 $q$UPDATE stores.stores SET address = NULL WHERE is_verified$q$, '23514');
SELECT pg_temp.expect_error('INV-12','CHECK: rechazo sin motivo',
 $q$INSERT INTO verification.reviews(request_id,admin_id,decision,note) SELECT r.id,u.id,'reject','  ' FROM verification.requests r, identity.users u WHERE u.role='admin' LIMIT 1$q$, '23514');
SELECT pg_temp.expect_error('INV-13','CHECK: documento mayor a 5 MB',
 $q$UPDATE verification.documents SET size_bytes = 6000000$q$, '23514');
SELECT pg_temp.expect_error('INV-14','CHECK: estado "corrección solicitada" sin plazo',
 $q$UPDATE verification.requests SET status='correction_requested', deadline_at=NULL WHERE status='pending_review'$q$, '23514');
SELECT pg_temp.expect_error('INV-15','CHECK: tipo de RAM inválido en placa',
 $q$UPDATE catalog.motherboard_specs SET ram_type='SDRAM'$q$, '23514');

-- B. Integridad lógica del modelo
SELECT pg_temp.expect_true('INT-01','Todo componente activo tiene su fila de subtipo',
 $q$SELECT NOT EXISTS (SELECT 1 FROM catalog.components c WHERE NOT EXISTS (
      SELECT 1 FROM (SELECT component_id FROM catalog.cpu_specs UNION ALL SELECT component_id FROM catalog.motherboard_specs
        UNION ALL SELECT component_id FROM catalog.ram_specs UNION ALL SELECT component_id FROM catalog.gpu_specs
        UNION ALL SELECT component_id FROM catalog.psu_specs UNION ALL SELECT component_id FROM catalog.case_specs
        UNION ALL SELECT component_id FROM catalog.cooler_specs UNION ALL SELECT component_id FROM catalog.storage_specs) s
      WHERE s.component_id = c.id))$q$);
SELECT pg_temp.expect_true('INT-02','Todo disipador declara al menos un socket',
 $q$SELECT NOT EXISTS (SELECT 1 FROM catalog.cooler_specs c WHERE NOT EXISTS (SELECT 1 FROM catalog.cooler_sockets s WHERE s.cooler_id=c.component_id))$q$);
SELECT pg_temp.expect_true('INT-03','Versión actual de cada componente coincide con su historial',
 $q$SELECT NOT EXISTS (SELECT 1 FROM catalog.components c WHERE c.version <> (SELECT max(version) FROM catalog.component_versions v WHERE v.component_id=c.id))$q$);
SELECT pg_temp.expect_true('INT-04','stores.is_verified coincide con verification.requests (aprobado)',
 $q$SELECT NOT EXISTS (SELECT 1 FROM stores.stores s JOIN verification.requests r ON r.store_id=s.id WHERE s.is_verified <> (r.status='approved'))$q$);
SELECT pg_temp.expect_true('INT-05','Sin ofertas activas de comercios no verificados',
 $q$SELECT NOT EXISTS (SELECT 1 FROM offers.offers o JOIN stores.stores s ON s.id=o.store_id WHERE o.status='active' AND o.deleted_at IS NULL AND NOT s.is_verified)$q$);
SELECT pg_temp.expect_true('INT-06','Comercios suspendidos sin NIT conservado',
 $q$SELECT NOT EXISTS (SELECT 1 FROM stores.stores s JOIN verification.requests r ON r.store_id=s.id WHERE r.status='suspended' AND s.nit IS NOT NULL)$q$);
SELECT pg_temp.expect_true('INT-07','Historial de precios registró el ajuste de precio',
 $q$SELECT (SELECT count(*) FROM offers.offer_price_history h JOIN offers.offers o ON o.id=h.offer_id WHERE o.price_cop = 849000) >= 2$q$);
SELECT pg_temp.expect_true('INT-08','Vista pública excluye ofertas pausadas',
 $q$SELECT (SELECT count(*) FROM readmodel.public_offers) = (SELECT count(*) FROM offers.offers WHERE status='active' AND deleted_at IS NULL)$q$);
SELECT pg_temp.expect_true('INT-09','Eventos de analítica no contienen datos personales (solo hash de 64 caracteres)',
 $q$SELECT NOT EXISTS (SELECT 1 FROM analytics.offer_events WHERE session_hash !~ '^[0-9a-f]{64}$')$q$);

-- C. Permisos (mínimo privilegio)
SELECT pg_temp.expect_error('PER-01','hw_readonly no puede leer identity.users',
 $q$SET LOCAL ROLE hw_readonly; SELECT * FROM identity.users$q$, '42501');
SELECT pg_temp.expect_error('PER-02','hw_readonly no puede leer documentos de verificación',
 $q$SET LOCAL ROLE hw_readonly; SELECT * FROM verification.documents$q$, '42501');
SELECT pg_temp.expect_error('PER-03','hw_app no puede borrar auditoría',
 $q$SET LOCAL ROLE hw_app; DELETE FROM audit.events$q$, '42501');
SELECT pg_temp.expect_error('PER-04','hw_app no puede ejecutar DDL',
 $q$SET LOCAL ROLE hw_app; CREATE TABLE public.intruso(x int)$q$, '42501');
SELECT pg_temp.expect_true('PER-05','hw_readonly sí puede leer el modelo público de ofertas',
 $q$SELECT has_table_privilege('hw_readonly','readmodel.public_offers','SELECT')$q$);

-- D. Reglas de compatibilidad de referencia aplicadas por SQL a los armados de demostración
CREATE TEMP VIEW build_rule_check AS
WITH it AS (
  SELECT b.share_code, bi.category, bi.component_id FROM builds.builds b JOIN builds.build_items bi ON bi.build_id=b.id),
cpu AS (SELECT it.share_code, s.* FROM it JOIN catalog.cpu_specs s ON s.component_id=it.component_id),
mb  AS (SELECT it.share_code, s.* FROM it JOIN catalog.motherboard_specs s ON s.component_id=it.component_id),
ram AS (SELECT it.share_code, s.* FROM it JOIN catalog.ram_specs s ON s.component_id=it.component_id),
gpu AS (SELECT it.share_code, s.* FROM it JOIN catalog.gpu_specs s ON s.component_id=it.component_id),
psu AS (SELECT it.share_code, s.* FROM it JOIN catalog.psu_specs s ON s.component_id=it.component_id),
cool AS (SELECT it.share_code, s.* FROM it JOIN catalog.cooler_specs s ON s.component_id=it.component_id),
cs  AS (SELECT it.share_code, s.* FROM it JOIN catalog.case_specs s ON s.component_id=it.component_id)
SELECT mb.share_code, 'RC-01' AS rule, CASE WHEN cpu.socket_id = mb.socket_id THEN 'compatible' ELSE 'incompatible' END AS result
  FROM mb JOIN cpu USING (share_code)
UNION ALL
SELECT mb.share_code, 'RC-02', CASE WHEN ram.ram_type = mb.ram_type THEN 'compatible' ELSE 'incompatible' END
  FROM mb JOIN ram USING (share_code)
UNION ALL
SELECT mb.share_code, 'RC-04', CASE WHEN mb.form_factor = ANY (cs.supported_mb_form_factors) THEN 'compatible' ELSE 'incompatible' END
  FROM mb JOIN cs USING (share_code)
UNION ALL
SELECT gpu.share_code, 'RC-05',
       CASE WHEN gpu.length_mm IS NULL OR cs.max_gpu_length_mm IS NULL THEN 'no_verificable'
            WHEN gpu.length_mm <= cs.max_gpu_length_mm THEN 'compatible' ELSE 'incompatible' END
  FROM gpu JOIN cs USING (share_code)
UNION ALL
SELECT cool.share_code, 'RC-06',
       CASE WHEN cool.height_mm IS NULL OR cs.max_cooler_height_mm IS NULL THEN 'no_verificable'
            WHEN cool.height_mm <= cs.max_cooler_height_mm THEN 'compatible' ELSE 'incompatible' END
  FROM cool JOIN cs USING (share_code)
UNION ALL
SELECT cool.share_code, 'RC-07',
       CASE WHEN EXISTS (SELECT 1 FROM catalog.cooler_sockets k WHERE k.cooler_id = cool.component_id AND k.socket_id = cpu.socket_id)
            THEN 'compatible' ELSE 'incompatible' END
  FROM cool JOIN cpu USING (share_code)
UNION ALL
SELECT psu.share_code, 'RC-08',
       CASE WHEN psu.wattage_w >= (cpu.tdp_w + COALESCE(gpu.tdp_w, 0) + (SELECT value FROM compat.params WHERE key='base_system_watts'))
                                  * (SELECT value FROM compat.params WHERE key='psu_headroom_factor')
            THEN 'compatible' ELSE 'incompatible' END
  FROM psu JOIN cpu USING (share_code) LEFT JOIN gpu USING (share_code);

SELECT pg_temp.expect_true('CMP-01','Armado A (AM5/DDR5): las 7 reglas evaluables (RC-01, 02, 04 a 08) son compatibles',
 $q$SELECT count(*)=7 AND bool_and(result='compatible') FROM build_rule_check WHERE share_code='Ab3dE9fG2h'$q$);
SELECT pg_temp.expect_true('CMP-02','Armado B: detecta RC-01 (socket AM4 vs AM5) como incompatible',
 $q$SELECT EXISTS (SELECT 1 FROM build_rule_check WHERE share_code='Zx8Qw1Er5T' AND rule='RC-01' AND result='incompatible')$q$);
SELECT pg_temp.expect_true('CMP-03','Armado B: detecta RC-02 (DDR4 vs DDR5) como incompatible',
 $q$SELECT EXISTS (SELECT 1 FROM build_rule_check WHERE share_code='Zx8Qw1Er5T' AND rule='RC-02' AND result='incompatible')$q$);
SELECT pg_temp.expect_true('CMP-05','Armado B: detecta RC-04 (placa Micro ATX en caja solo Mini-ITX) como incompatible',
 $q$SELECT EXISTS (SELECT 1 FROM build_rule_check WHERE share_code='Zx8Qw1Er5T' AND rule='RC-04' AND result='incompatible')$q$);
SELECT pg_temp.expect_true('CMP-04','Filtro HU-06: placas compatibles con la CPU Ryzen 5 7600 = solo socket AM5',
 $q$SELECT count(*)>0 AND bool_and(sk.name='AM5') FROM catalog.motherboard_specs m JOIN catalog.sockets sk ON sk.id=m.socket_id
     WHERE m.socket_id = (SELECT socket_id FROM catalog.cpu_specs cs JOIN catalog.components c ON c.id=cs.component_id WHERE c.display_name='AMD Ryzen 5 7600')$q$);

\o
\echo
SELECT id, CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS resultado, descr, detail FROM test_results ORDER BY id;
SELECT count(*) FILTER (WHERE passed) AS aprobadas, count(*) FILTER (WHERE NOT passed) AS fallidas, count(*) AS total FROM test_results;
