-- Resumen de componentes para el inventario del vendedor (módulo offers).
-- A diferencia de readmodel.public_offers, incluye componentes que ya no están activos:
-- el vendedor debe seguir viendo el nombre de lo que tiene publicado.
CREATE VIEW readmodel.component_summary AS
SELECT c.id AS component_id,
       c.category,
       c.display_name,
       c.model,
       b.name::text AS brand,
       c.status::text AS status
  FROM catalog.components c
  JOIN catalog.brands b ON b.id = c.brand_id;

GRANT SELECT ON readmodel.component_summary TO hw_app, hw_readonly;
