-- Generado por tools/opendb_seed.py desde BuildCores OpenDB (CC BY-NC-SA 4.0). No editar a mano.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO catalog.sockets(name) VALUES ('AM4') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('AM5') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1150') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1151') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1155') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1156') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1200') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1700') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 1851') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 2011') ON CONFLICT DO NOTHING;
INSERT INTO catalog.sockets(name) VALUES ('LGA 2066') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('AMD', 'amd') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('ASUS', 'asus') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Cooler Master', 'cooler-master') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Corsair', 'corsair') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Crucial', 'crucial') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('DeepCool', 'deepcool') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('G.SKILL', 'g-skill') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Intel', 'intel') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Kingston', 'kingston') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Kingston Technology', 'kingston-technology') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('MSI', 'msi') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('NZXT', 'nzxt') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Noctua', 'noctua') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('Thermalright', 'thermalright') ON CONFLICT DO NOTHING;
INSERT INTO catalog.brands(name, slug) VALUES ('XFX', 'xfx') ON CONFLICT DO NOTHING;
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cpu', (SELECT id FROM catalog.brands WHERE name = 'AMD'), '5600', 'AMD Ryzen 5 5600', ARRAY['100-100000927BOX','AMD Ryzen 5 5600','100100000927BOX']::text[], '04984638-674b-4384-8866-a7b20d55f8b4', 1, 2022, '{"series": "Ryzen 5 5000"}'::jsonb);
INSERT INTO catalog.cpu_specs(component_id,socket_id,tdp_w,cores,threads,base_clock_ghz,boost_clock_ghz,memory_types,has_integrated_graphics)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '04984638-674b-4384-8866-a7b20d55f8b4'),(SELECT id FROM catalog.sockets WHERE name='AM4'),65,6,12,3.5,4.4,ARRAY['DDR4']::text[],true);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '04984638-674b-4384-8866-a7b20d55f8b4'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cpu', (SELECT id FROM catalog.brands WHERE name = 'AMD'), '7600', 'AMD Ryzen 5 7600', ARRAY['100-100001015BOX','100-00001015BOX']::text[], '6b03b443-7b22-491c-b301-7e2a285359df', 1, 2023, '{"series": "AMD Ryzen 5 7000"}'::jsonb);
INSERT INTO catalog.cpu_specs(component_id,socket_id,tdp_w,cores,threads,base_clock_ghz,boost_clock_ghz,memory_types,has_integrated_graphics)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '6b03b443-7b22-491c-b301-7e2a285359df'),(SELECT id FROM catalog.sockets WHERE name='AM5'),65,6,12,3.8,5.1,ARRAY['DDR5']::text[],true);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '6b03b443-7b22-491c-b301-7e2a285359df'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cpu', (SELECT id FROM catalog.brands WHERE name = 'AMD'), '7800X3D', 'AMD Ryzen 7 7800X3D', ARRAY['100-100000910WOF','AMD Ryzen 7 7800X3D','100100000910WOF']::text[], '4dcfffec-423b-4052-8aca-db6c0f84bb43', 1, 2023, '{"series": "Ryzen 7 7000"}'::jsonb);
INSERT INTO catalog.cpu_specs(component_id,socket_id,tdp_w,cores,threads,base_clock_ghz,boost_clock_ghz,memory_types,has_integrated_graphics)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '4dcfffec-423b-4052-8aca-db6c0f84bb43'),(SELECT id FROM catalog.sockets WHERE name='AM5'),120,8,16,4.2,5,ARRAY['DDR5']::text[],true);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '4dcfffec-423b-4052-8aca-db6c0f84bb43'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cpu', (SELECT id FROM catalog.brands WHERE name = 'Intel'), '12400F', 'Intel Core i5 12400F', ARRAY['BX8071512400F','i5-12400F','BX8071512400']::text[], '19fbd8f2-a226-4b83-9e5d-683db638d337', 1, 2022, '{"series": "Core i5 12000"}'::jsonb);
INSERT INTO catalog.cpu_specs(component_id,socket_id,tdp_w,cores,threads,base_clock_ghz,boost_clock_ghz,memory_types,has_integrated_graphics)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '19fbd8f2-a226-4b83-9e5d-683db638d337'),(SELECT id FROM catalog.sockets WHERE name='LGA 1700'),65,6,12,2.5,4.4,ARRAY['DDR5','DDR4']::text[],true);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '19fbd8f2-a226-4b83-9e5d-683db638d337'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('motherboard', (SELECT id FROM catalog.brands WHERE name = 'MSI'), 'B650M-P', 'MSI PRO B650M-P', ARRAY['PRO B650M-P','PROB650M-P']::text[], '011e1664-de3e-4923-9e24-1ba2dbb138e6', 1, 2023, '{"series": "PRO", "color": ["BLACK", "GREY"]}'::jsonb);
INSERT INTO catalog.motherboard_specs(component_id,socket_id,form_factor,chipset,ram_type,ram_slots,ram_max_gb,m2_slots)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '011e1664-de3e-4923-9e24-1ba2dbb138e6'),(SELECT id FROM catalog.sockets WHERE name='AM5'),'Micro ATX','AMD B650','DDR5',4,256,2);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '011e1664-de3e-4923-9e24-1ba2dbb138e6'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('motherboard', (SELECT id FROM catalog.brands WHERE name = 'MSI'), 'B650 PLUS WIFI', 'MSI B650 GAMING PLUS WIFI DDR5 ATX', ARRAY['B650 GAMING PLUS WIFI','7E26-001R','911-7E26-001','B650GPWIFI','B650GamingPlusWiFi']::text[], '034a0f7a-a5a5-4ea6-8f2a-cb49cce48c98', 1, 2023, '{"series": "GAMING", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.motherboard_specs(component_id,socket_id,form_factor,chipset,ram_type,ram_slots,ram_max_gb,m2_slots)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '034a0f7a-a5a5-4ea6-8f2a-cb49cce48c98'),(SELECT id FROM catalog.sockets WHERE name='AM5'),'ATX','AMD B650','DDR5',4,256,2);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '034a0f7a-a5a5-4ea6-8f2a-cb49cce48c98'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('motherboard', (SELECT id FROM catalog.brands WHERE name = 'MSI'), 'B550-A PRO (CEC)', 'MSI B550-A PRO (CEC)', ARRAY['B550-A PRO (CEC)']::text[], '01c7e802-799d-4ed2-87b4-08b8e572fe52', 1, 2020, '{"series": "PRO", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.motherboard_specs(component_id,socket_id,form_factor,chipset,ram_type,ram_slots,ram_max_gb,m2_slots)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '01c7e802-799d-4ed2-87b4-08b8e572fe52'),(SELECT id FROM catalog.sockets WHERE name='AM4'),'ATX','AMD B550','DDR4',4,128,2);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '01c7e802-799d-4ed2-87b4-08b8e572fe52'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('motherboard', (SELECT id FROM catalog.brands WHERE name = 'ASUS'), 'B760M-AYW WIFI D4', 'ASUS B760M-AYW WIFI D4 LGA1700 DDR4 Micro-ATX', '{}'::text[], '000deb7d-a2c6-4134-9d33-ffc0508cb277', 1, 2022, '{"series": "AYW", "color": ["GREY", "BLACK"]}'::jsonb);
INSERT INTO catalog.motherboard_specs(component_id,socket_id,form_factor,chipset,ram_type,ram_slots,ram_max_gb,m2_slots)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '000deb7d-a2c6-4134-9d33-ffc0508cb277'),(SELECT id FROM catalog.sockets WHERE name='LGA 1700'),'Micro ATX','Intel B760','DDR4',2,64,2);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '000deb7d-a2c6-4134-9d33-ffc0508cb277'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('motherboard', (SELECT id FROM catalog.brands WHERE name = 'ASUS'), 'H610', 'Asus H610 PRIME H610I-PLUS D4-CSM DDR4 Mini ITX', ARRAY['PRIME H610I-PLUS D4-CSM','90MB1B20-M0EAYC']::text[], '05ab0e02-062c-44f7-a636-828af44f4644', 1, NULL, '{"series": "H610", "color": ["GREY", "BLACK"]}'::jsonb);
INSERT INTO catalog.motherboard_specs(component_id,socket_id,form_factor,chipset,ram_type,ram_slots,ram_max_gb,m2_slots)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '05ab0e02-062c-44f7-a636-828af44f4644'),(SELECT id FROM catalog.sockets WHERE name='LGA 1700'),'Mini-ITX','Intel H610','DDR4',2,64,3);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '05ab0e02-062c-44f7-a636-828af44f4644'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('ram', (SELECT id FROM catalog.brands WHERE name = 'Corsair'), 'Vengeance', 'Corsair Vengeance Black DDR5-6200 CL32 32GB (2x16GB)', ARRAY['CMK32GX5M2X6200C32']::text[], '01aa1aa3-c1c7-4d4f-9872-ce0c94739ca8', 1, NULL, '{"series": "Vengeance", "color": ["BLACK", "GREY"]}'::jsonb);
INSERT INTO catalog.ram_specs(component_id,ram_type,speed_mhz,modules_qty,capacity_gb,form_factor,cas_latency)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '01aa1aa3-c1c7-4d4f-9872-ce0c94739ca8'),'DDR5',6200,2,32,'DIMM',32);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '01aa1aa3-c1c7-4d4f-9872-ce0c94739ca8'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('ram', (SELECT id FROM catalog.brands WHERE name = 'G.SKILL'), 'Trident Z5', 'G.Skill Trident Z5 Metallic Silver DDR5-5600 CL36 32GB (2x16GB)', ARRAY['F5-5600J3636C16GX2-TZ5S']::text[], '01f0cbe4-4b57-49cc-a0f7-29dc75df4688', 1, 2021, '{"series": "Trident Z5", "color": ["GREY", "BLACK"]}'::jsonb);
INSERT INTO catalog.ram_specs(component_id,ram_type,speed_mhz,modules_qty,capacity_gb,form_factor,cas_latency)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '01f0cbe4-4b57-49cc-a0f7-29dc75df4688'),'DDR5',5600,2,32,'DIMM',36);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '01f0cbe4-4b57-49cc-a0f7-29dc75df4688'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('ram', (SELECT id FROM catalog.brands WHERE name = 'Kingston'), '2666 CL16', 'Kingston HyperX Fury Black DDR4-2666 CL16 16GB (2x8GB)', ARRAY['HX426C16FB3K2','16','HX426C16FB3K2/16','HX426C16FB2K2/16']::text[], '025a42be-bf0f-4181-93ce-5d0527241bfb', 1, NULL, '{"series": "HyperX", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.ram_specs(component_id,ram_type,speed_mhz,modules_qty,capacity_gb,form_factor,cas_latency)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '025a42be-bf0f-4181-93ce-5d0527241bfb'),'DDR4',2666,2,16,'DIMM',16);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '025a42be-bf0f-4181-93ce-5d0527241bfb'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('ram', (SELECT id FROM catalog.brands WHERE name = 'Corsair'), 'Default', 'Corsair Vengeance LPX Black DDR4-4000 CL18 64GB (2x32GB)', ARRAY['CMK64GX4M2G4000C18']::text[], '02470f94-e037-4af6-8af7-f2d4ef71895f', 1, NULL, '{"series": "Vengeance LPX", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.ram_specs(component_id,ram_type,speed_mhz,modules_qty,capacity_gb,form_factor,cas_latency)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '02470f94-e037-4af6-8af7-f2d4ef71895f'),'DDR4',4000,2,64,'DIMM',18);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '02470f94-e037-4af6-8af7-f2d4ef71895f'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('gpu', (SELECT id FROM catalog.brands WHERE name = 'MSI'), 'Gaming X Trio', 'MSI GeForce RTX 4060 Ti GAMING X TRIO 8G GDDR6', ARRAY['GeForce RTX 4060 Ti GAMING X TRIO 8G','RTX4060TiGAMINGXTRIO8G']::text[], '06cb3a7e-23af-4b09-ac1d-36614c4a1a89', 1, 2023, '{"series": "Gaming X Trio", "color": ["BLACK", "GREY"]}'::jsonb);
INSERT INTO catalog.gpu_specs(component_id,tdp_w,length_mm,slot_width,interface,memory_gb,power_connectors)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '06cb3a7e-23af-4b09-ac1d-36614c4a1a89'),160,338,2.6,'PCIe 4.0 x8',8,'{"pcie_6_pin": 0, "pcie_8_pin": 1, "pcie_12VHPWR": 0, "pcie_12V_2x6": 0}'::jsonb);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '06cb3a7e-23af-4b09-ac1d-36614c4a1a89'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('gpu', (SELECT id FROM catalog.brands WHERE name = 'XFX'), 'Core Edition', 'XFX SPEEDSTER SWFT 210 AMD Radeon RX 7600 Core Edition 8GB GDDR6', ARRAY['RX-76PSWFTFY']::text[], '06aadbb9-bb14-4047-9f35-0777a9a1d8f8', 1, 2023, '{"series": "Speedster SWFT 210", "color": ["BLACK", "GREY"]}'::jsonb);
INSERT INTO catalog.gpu_specs(component_id,tdp_w,length_mm,slot_width,interface,memory_gb,power_connectors)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '06aadbb9-bb14-4047-9f35-0777a9a1d8f8'),165,241,2,'PCIe 4.0 x8',8,'{"pcie_6_pin": 0, "pcie_8_pin": 1, "pcie_12VHPWR": 0, "pcie_12V_2x6": 0}'::jsonb);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '06aadbb9-bb14-4047-9f35-0777a9a1d8f8'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('gpu', (SELECT id FROM catalog.brands WHERE name = 'ASUS'), 'Dual', 'Asus DUAL GeForce RTX 4070 SUPER 12GB GDDR6X White', '{}'::text[], '0727e86b-28e0-4e2f-ac18-ab3c5cd0382b', 1, 2024, '{"series": "Dual", "color": ["WHITE"]}'::jsonb);
INSERT INTO catalog.gpu_specs(component_id,tdp_w,length_mm,slot_width,interface,memory_gb,power_connectors)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0727e86b-28e0-4e2f-ac18-ab3c5cd0382b'),220,267,2.5,'PCIe 4.0 x16',12,'{"pcie_6_pin": 0, "pcie_8_pin": 0, "pcie_12VHPWR": 1, "pcie_12V_2x6": 0}'::jsonb);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '0727e86b-28e0-4e2f-ac18-ab3c5cd0382b'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('psu', (SELECT id FROM catalog.brands WHERE name = 'Corsair'), '750W Gold', 'Corsair RM750 750W 80+ Gold Certified Fully Modular ATX', ARRAY['CP-9020234-NA','CP-9020234-UK','CP-9020234-AU']::text[], '0d707b52-7d6e-4824-8126-84c7c1bd830b', 1, NULL, '{"series": "RM750", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.psu_specs(component_id,wattage_w,form_factor,efficiency_rating,modular,connectors)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0d707b52-7d6e-4824-8126-84c7c1bd830b'),750,'ATX','80+ Gold','Full','{"atx_24_pin": 1, "eps_8_pin": 0, "pcie_12vhpwr": 0, "pcie_6_plus_2_pin": 0, "sata": 14, "molex_4_pin": 0, "floppy_4_pin": 0}'::jsonb);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '0d707b52-7d6e-4824-8126-84c7c1bd830b'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('psu', (SELECT id FROM catalog.brands WHERE name = 'Corsair'), '650W Bronze', 'Corsair CV650 Black 650W Non-Modular 80+ Bronze Certified ATX', ARRAY['CP-9020236-NA','CP-9020211-NA','CP-9020236-UK','CP-9020236-EU','CP-9020236-AU']::text[], '0e1d710b-c5e2-4ec3-beb8-a65102b7cdc6', 1, NULL, '{"series": "CV650", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.psu_specs(component_id,wattage_w,form_factor,efficiency_rating,modular,connectors)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0e1d710b-c5e2-4ec3-beb8-a65102b7cdc6'),650,'ATX','80+ Bronze','Non-Modular','{"atx_24_pin": 1, "eps_8_pin": 0, "pcie_12vhpwr": 0, "pcie_6_plus_2_pin": 0, "sata": 10, "molex_4_pin": 0, "floppy_4_pin": 0}'::jsonb);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '0e1d710b-c5e2-4ec3-beb8-a65102b7cdc6'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('psu', (SELECT id FROM catalog.brands WHERE name = 'Cooler Master'), '750W Gold', 'Cooler Master MWE Gold V2 White ATX3.0 750W Fully Modular 80+ Gold Certified', ARRAY['MPE-7501-AFAAG-3G','MPE-7501-AFAAG-3GU2','MPE-7501-AFAAG-3GAU','MPE-7501-AFAAG-3GUS','MPE-7501-AFAAG-3GWO','MPE-7501-AFAAG-3GEU','MPE-7501-AFAAG-3GUK']::text[], '0a2050c2-b4a0-454c-be91-1141cb7fa49b', 1, NULL, '{"series": "MWE", "color": ["WHITE"]}'::jsonb);
INSERT INTO catalog.psu_specs(component_id,wattage_w,form_factor,efficiency_rating,modular,connectors)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0a2050c2-b4a0-454c-be91-1141cb7fa49b'),750,'ATX','80+ Gold','Full','{"atx_24_pin": 1, "eps_8_pin": 2, "pcie_12vhpwr": 1, "pcie_6_plus_2_pin": 4, "sata": 12, "molex_4_pin": 4, "floppy_4_pin": 0}'::jsonb);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '0a2050c2-b4a0-454c-be91-1141cb7fa49b'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('case', (SELECT id FROM catalog.brands WHERE name = 'Corsair'), 'AIRFLOW w/750 W Power Supply', 'Corsair 4000D Airflow ATX Mid Tower Black Tempered Glass Side Panel, w/750 W Power Supply', '{}'::text[], '090334a6-3c7c-42e6-9b7c-901b9781f7cd', 1, 2020, '{"series": "4000D", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.case_specs(component_id,form_factor,supported_mb_form_factors,supported_psu_form_factors,max_gpu_length_mm,max_cooler_height_mm)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '090334a6-3c7c-42e6-9b7c-901b9781f7cd'),'ATX Mid Tower',ARRAY['ATX','Micro ATX','Mini-ITX','EATX']::text[],ARRAY['ATX']::text[],360,170);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '090334a6-3c7c-42e6-9b7c-901b9781f7cd'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('case', (SELECT id FROM catalog.brands WHERE name = 'Cooler Master'), 'MasterBox NR200P', 'Cooler Master MasterBox NR200P Mini-ITX Desktop Purple with Steel Side Panel', '{}'::text[], '0acbff4f-326f-4451-a9a2-c0b624cb8693', 1, 2020, '{"series": "MasterBox NR200P", "color": ["PURPLE"]}'::jsonb);
INSERT INTO catalog.case_specs(component_id,form_factor,supported_mb_form_factors,supported_psu_form_factors,max_gpu_length_mm,max_cooler_height_mm)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0acbff4f-326f-4451-a9a2-c0b624cb8693'),'Mini ITX Tower',ARRAY['Mini-ITX']::text[],ARRAY['SFX','SFX-L']::text[],330,153);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '0acbff4f-326f-4451-a9a2-c0b624cb8693'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('case', (SELECT id FROM catalog.brands WHERE name = 'NZXT'), 'H510', 'NZXT H510 Elite ATX Mid Tower Black with Tempered Glass Side Panel and Front I/O: USB 3.2 Gen 2 Type-C, USB 3.2 Gen 1 Type-A', ARRAY['CA-H510E-B1']::text[], '07d99520-525a-4ec0-9e75-2f29aa97e9c7', 1, NULL, '{"series": "H510", "color": ["BLACK"]}'::jsonb);
INSERT INTO catalog.case_specs(component_id,form_factor,supported_mb_form_factors,supported_psu_form_factors,max_gpu_length_mm,max_cooler_height_mm)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '07d99520-525a-4ec0-9e75-2f29aa97e9c7'),'ATX Mid Tower',ARRAY['ATX','Micro ATX','Mini-ITX']::text[],NULL,381,NULL);
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '07d99520-525a-4ec0-9e75-2f29aa97e9c7'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cooler', (SELECT id FROM catalog.brands WHERE name = 'DeepCool'), 'Deepcool AK400 Air 155mm Black / Silver', 'Deepcool AK400 Air 155mm Black / Silver', '{}'::text[], '010abcce-a3d8-488c-a89d-9713092820c1', 1, 2022, '{"color": ["BLACK", "GREY"]}'::jsonb);
INSERT INTO catalog.cooler_specs(component_id,height_mm,water_cooled,radiator_mm)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),155,false,NULL);
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='AM4'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='AM5'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1150'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1151'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1155'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1156'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1200'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1700'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'),(SELECT id FROM catalog.sockets WHERE name='LGA 1851'));
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '010abcce-a3d8-488c-a89d-9713092820c1'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cooler', (SELECT id FROM catalog.brands WHERE name = 'Thermalright'), '140 SE', 'Thermalright Peerless Assassin 140 SE Black/Silver', '{}'::text[], '03aa26f2-4307-46c6-85b1-36ad768a12c6', 1, 2024, '{"series": "Peerless Assassin", "color": ["BLACK", "GREY"]}'::jsonb);
INSERT INTO catalog.cooler_specs(component_id,height_mm,water_cooled,radiator_mm)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),158,false,NULL);
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='AM5'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='AM4'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1155'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1156'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1150'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1151'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1851'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1700'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'),(SELECT id FROM catalog.sockets WHERE name='LGA 1200'));
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '03aa26f2-4307-46c6-85b1-36ad768a12c6'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('cooler', (SELECT id FROM catalog.brands WHERE name = 'Noctua'), 'Gray / Silver', 'Noctua NH-U12S redux 70.75 CFM Air 158mm Gray / Silver', ARRAY['NH-U12S redux','NH-U12Sredux','NH-U12S REDUX']::text[], '0f209c92-bf00-4a8d-a345-2c76731aea28', 1, NULL, '{"series": "NH-U12S", "color": ["GREY", "WHITE"]}'::jsonb);
INSERT INTO catalog.cooler_specs(component_id,height_mm,water_cooled,radiator_mm)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),158,false,NULL);
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='AM4'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='AM5'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1150'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1151'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1155'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1156'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1200'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1700'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 1851'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 2011'));
INSERT INTO catalog.cooler_sockets(cooler_id,socket_id) VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'),(SELECT id FROM catalog.sockets WHERE name='LGA 2066'));
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '0f209c92-bf00-4a8d-a345-2c76731aea28'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('storage', (SELECT id FROM catalog.brands WHERE name = 'Kingston'), '1000GB', 'Kingston NV1 1TB M.2-2280 SSD PCIe 3.0 x4 NVMe', ARRAY['SNVS','1000G','SNVS/1000G']::text[], '024add70-c987-4042-8958-06f853d6c089', 1, NULL, '{"series": "NV1"}'::jsonb);
INSERT INTO catalog.storage_specs(component_id,storage_type,interface,capacity_gb,form_factor)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '024add70-c987-4042-8958-06f853d6c089'),'SSD','NVMe',1000,'M.2-2280');
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '024add70-c987-4042-8958-06f853d6c089'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('storage', (SELECT id FROM catalog.brands WHERE name = 'Kingston Technology'), '1TB', 'Kingston NV3 PCIe 4.0 NVMe SSD 2280 1TB', ARRAY['SNV3S/1000G','SNV3S1000G']::text[], '036ace82-80b8-4408-bde3-359bc999ee80', 1, 2024, '{"series": "NV3"}'::jsonb);
INSERT INTO catalog.storage_specs(component_id,storage_type,interface,capacity_gb,form_factor)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '036ace82-80b8-4408-bde3-359bc999ee80'),'SSD','NVMe',1000,'M.2-2280');
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '036ace82-80b8-4408-bde3-359bc999ee80'), 'Carga inicial desde BuildCores OpenDB', NULL);
INSERT INTO catalog.components(category, brand_id, model, display_name, part_numbers, opendb_id, source_id, release_year, extra_specs)
VALUES ('storage', (SELECT id FROM catalog.brands WHERE name = 'Crucial'), '1000GB', 'Crucial P310 1TB SSD M.2 PCIe 4.0 NVMe', ARRAY['CT1000P310SSD8','CT1000P310SSD801']::text[], '00b812fe-7098-4716-8ce9-855ea3674b76', 1, NULL, '{"series": "P310"}'::jsonb);
INSERT INTO catalog.storage_specs(component_id,storage_type,interface,capacity_gb,form_factor)
VALUES ((SELECT id FROM catalog.components WHERE opendb_id = '00b812fe-7098-4716-8ce9-855ea3674b76'),'SSD','NVMe',1000,'M.2-2280');
SELECT catalog.publish_version((SELECT id FROM catalog.components WHERE opendb_id = '00b812fe-7098-4716-8ce9-855ea3674b76'), 'Carga inicial desde BuildCores OpenDB', NULL);
COMMIT;
