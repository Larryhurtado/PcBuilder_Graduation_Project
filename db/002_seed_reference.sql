-- Datos de referencia: fuente de datos, reglas de compatibilidad y parámetros.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO catalog.data_sources(name, license, url, release_identifier, attribution_text) VALUES
('BuildCores OpenDB', 'CC BY-NC-SA 4.0', 'https://github.com/buildcores/buildcores-open-db', 'main (2026)',
 'Data from BuildCores OpenDB (https://github.com/buildcores/buildcores-open-db), licensed under CC BY-NC-SA 4.0. Changes: subset selection, normalization of socket names and mapping to a relational PostgreSQL model.');

INSERT INTO compat.rules(code, name, description, severity, is_mvp_core, related_hu) VALUES
('RC-01','Socket CPU - placa base','El socket del procesador debe ser igual al de la placa base.','error',true,'{HU-04,HU-06}'),
('RC-02','Tipo de RAM - placa base','El tipo de memoria (DDR4/DDR5) debe coincidir con el que soporta la placa base.','error',true,'{HU-04,HU-06}'),
('RC-03','Capacidad y módulos de RAM','Los módulos del kit no pueden superar las ranuras de la placa ni la capacidad máxima soportada.','error',true,'{HU-04}'),
('RC-04','Factor de forma placa - caja','La caja debe soportar el factor de forma de la placa base (ATX, Micro ATX, Mini-ITX).','error',true,'{HU-04,HU-06}'),
('RC-05','Longitud GPU - caja','La longitud de la tarjeta gráfica no puede superar el máximo admitido por la caja.','error',true,'{HU-04,HU-06}'),
('RC-06','Altura disipador - caja','La altura del disipador no puede superar la altura máxima admitida por la caja.','error',true,'{HU-04,HU-06}'),
('RC-07','Socket disipador - CPU','El disipador debe declarar soporte para el socket del procesador.','error',true,'{HU-04,HU-06}'),
('RC-08','Potencia de la fuente','La potencia de la fuente debe cubrir el consumo estimado (CPU + GPU + resto) con margen de seguridad.','error',true,'{HU-04,HU-05}'),
('RC-09','Memoria soportada por la CPU','El tipo de RAM debe estar entre los tipos de memoria que soporta el procesador.','error',false,'{HU-04}'),
('RC-10','Conectores PCIe de la fuente','La fuente debe ofrecer los conectores de alimentación que exige la tarjeta gráfica.','warning',false,'{HU-04}'),
('RC-11','Factor de forma fuente - caja','La caja debe soportar el factor de forma de la fuente de poder.','warning',false,'{HU-04}'),
('RC-12','Ranuras M.2 disponibles','Los SSD M.2 no pueden superar las ranuras M.2 de la placa base.','warning',false,'{HU-04}');

INSERT INTO compat.params(key, value, unit, description) VALUES
('base_system_watts',     75,  'W', 'Consumo estimado de placa, RAM, almacenamiento y ventiladores.'),
('psu_headroom_factor',   1.25,'x', 'Margen sobre el consumo estimado para recomendar potencia de fuente.'),
('psu_recommended_step',  50,  'W', 'Redondeo (hacia arriba) de la potencia recomendada.');
COMMIT;
