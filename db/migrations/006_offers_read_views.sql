-- Vistas de lectura para el catálogo público de ofertas (GET /offers, GET /offers/{id}).
-- Todo cruce entre módulos pasa por el esquema readmodel (regla M-3).

-- 1) public_offers: se agregan al final la descripción, la dirección y coordenadas del local
--    (ficha técnica, HU-12) y la marca del componente (filtro por marca, HU-09).
--    Las columnas existentes conservan su orden: así CREATE OR REPLACE no rompe
--    readmodel.best_price_by_component.
CREATE OR REPLACE VIEW readmodel.public_offers AS
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
       (SELECT i.storage_key FROM offers.offer_images i WHERE i.offer_id = o.id ORDER BY i.position LIMIT 1) AS cover_image_key,
       o.description,
       s.address,
       s.latitude,
       s.longitude,
       c.brand_id
  FROM offers.offers o
  JOIN stores.stores s     ON s.id = o.store_id AND s.is_verified
  JOIN catalog.components c ON c.id = o.component_id AND c.status = 'active'
  JOIN catalog.brands b     ON b.id = c.brand_id
 WHERE o.status = 'active' AND o.deleted_at IS NULL;

-- 2) component_filter_attrs: atributos de cada componente activo que usan los filtros técnicos
--    (socket, tipo de RAM, medidas…). Un valor NULL significa "dato desconocido": las piezas con
--    datos faltantes no se ocultan, se muestran como "no verificable".
CREATE VIEW readmodel.component_filter_attrs AS
SELECT c.id AS component_id,
       c.category,
       COALESCE(cpu_sk.name, mb_sk.name)::text AS socket,
       COALESCE(mb.ram_type, ram.ram_type)     AS ram_type,
       mb.form_factor                          AS board_form_factor,
       cs.supported_mb_form_factors            AS case_mb_form_factors,
       cs.max_gpu_length_mm,
       cs.max_cooler_height_mm,
       cooler.height_mm                        AS cooler_height_mm,
       (SELECT array_agg(sk.name::text ORDER BY sk.name)
          FROM catalog.cooler_sockets x JOIN catalog.sockets sk ON sk.id = x.socket_id
         WHERE x.cooler_id = c.id)             AS cooler_sockets,
       gpu.length_mm                           AS gpu_length_mm,
       psu.wattage_w                           AS psu_wattage_w
  FROM catalog.components c
  LEFT JOIN catalog.cpu_specs cpu         ON cpu.component_id = c.id
  LEFT JOIN catalog.sockets cpu_sk        ON cpu_sk.id = cpu.socket_id
  LEFT JOIN catalog.motherboard_specs mb  ON mb.component_id = c.id
  LEFT JOIN catalog.sockets mb_sk         ON mb_sk.id = mb.socket_id
  LEFT JOIN catalog.ram_specs ram         ON ram.component_id = c.id
  LEFT JOIN catalog.gpu_specs gpu         ON gpu.component_id = c.id
  LEFT JOIN catalog.psu_specs psu         ON psu.component_id = c.id
  LEFT JOIN catalog.case_specs cs         ON cs.component_id = c.id
  LEFT JOIN catalog.cooler_specs cooler   ON cooler.component_id = c.id
 WHERE c.status = 'active';

GRANT SELECT ON readmodel.component_filter_attrs TO hw_app, hw_readonly;
