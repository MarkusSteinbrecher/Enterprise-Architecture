-- ============================================================================
-- Energy Client: Location elements and Association relationships
-- ArchiMate Location (composite) elements with Composition hierarchy
-- and Association relationships to BusinessActors and Facilities
-- ============================================================================

-- ── LOCATION ELEMENTS — Regions ───────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-eu',   'Location', 'Europe',        'Other', 'European operations — headquarters, R&D, and major manufacturing across 20+ countries', 'manual',
 '{"level": "region"}'),
('e-loc-na',   'Location', 'North America', 'Other', 'Americas operations — manufacturing, grid automation R&D, and regional sales', 'manual',
 '{"level": "region"}'),
('e-loc-apac', 'Location', 'Asia Pacific',  'Other', 'APAC operations — manufacturing, project delivery, and regional sales across 15+ countries', 'manual',
 '{"level": "region"}'),
('e-loc-mea',  'Location', 'Middle East & Africa', 'Other', 'MEA operations — project delivery, service, and regional sales', 'manual',
 '{"level": "region"}'),
('e-loc-latam','Location', 'Latin America', 'Other', 'Latin America operations — transformer manufacturing, project delivery, and service', 'manual',
 '{"level": "region"}');

-- ── LOCATION ELEMENTS — Countries ─────────────────────────────────────────────

-- Europe
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-ch', 'Location', 'Switzerland',  'Other', 'Global headquarters in Zürich, corporate functions, and Transformers BU leadership', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 2500}'),
('e-loc-se', 'Location', 'Sweden',       'Other', 'Largest operational footprint — Västerås (Grid Automation R&D, new campus) and Ludvika (HVDC, transformers, HV products)', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 8000}'),
('e-loc-de', 'Location', 'Germany',      'Other', 'Transformer manufacturing (Bad Honnef), grid automation, and sales — key European market', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 3500}'),
('e-loc-no', 'Location', 'Norway',       'Other', 'High voltage products manufacturing (Drammen) — circuit breakers and switchgear', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 1200}'),
('e-loc-es', 'Location', 'Spain',        'Other', 'Transformer manufacturing (Córdoba) and renewable energy project delivery', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 1000}'),
('e-loc-fi', 'Location', 'Finland',      'Other', 'New state-of-the-art transformer factory and grid automation operations', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 800}'),
('e-loc-pl', 'Location', 'Poland',       'Other', 'Shared services center (Kraków), IT operations, and manufacturing', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 2000}'),
('e-loc-it', 'Location', 'Italy',        'Other', 'Grid automation, HVDC project delivery, and transformer services', 'manual',
 '{"level": "country", "region": "Europe", "employees_approx": 800}');

-- North America
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-us', 'Location', 'United States', 'Other', 'Grid Automation hub (Raleigh), transformer manufacturing (South Boston VA, Jefferson City MO), HV switchgear (Mount Pleasant PA)', 'manual',
 '{"level": "country", "region": "North America", "employees_approx": 5000}'),
('e-loc-ca', 'Location', 'Canada',        'Other', 'Transformer manufacturing (Varennes QC), new HVDC simulation center (Montreal)', 'manual',
 '{"level": "country", "region": "North America", "employees_approx": 1500}'),
('e-loc-mx', 'Location', 'Mexico',        'Other', 'New distribution transformer factory (Reynosa) and service operations', 'manual',
 '{"level": "country", "region": "North America", "employees_approx": 1200}');

-- Asia Pacific
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-in', 'Location', 'India',         'Other', 'Major manufacturing hub — transformers, switchgear, relays (Savli/Vadodara, Maneja), HVDC projects', 'manual',
 '{"level": "country", "region": "Asia Pacific", "employees_approx": 7000}'),
('e-loc-cn', 'Location', 'China',         'Other', 'APAC headquarters (Beijing), transformer manufacturing (Chongqing), grid automation, HVDC projects', 'manual',
 '{"level": "country", "region": "Asia Pacific", "employees_approx": 4000}'),
('e-loc-au', 'Location', 'Australia',     'Other', 'Grid automation, HVDC interconnectors, transformer service center, and renewable grid integration', 'manual',
 '{"level": "country", "region": "Asia Pacific", "employees_approx": 600}'),
('e-loc-vn', 'Location', 'Vietnam',       'Other', 'Transformer manufacturing and assembly facility', 'manual',
 '{"level": "country", "region": "Asia Pacific", "employees_approx": 500}');

-- Middle East & Africa
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-ae', 'Location', 'United Arab Emirates', 'Other', 'Middle East hub (Abu Dhabi/Dubai) — project delivery, grid automation, service', 'manual',
 '{"level": "country", "region": "Middle East & Africa", "employees_approx": 400}'),
('e-loc-sa', 'Location', 'Saudi Arabia',  'Other', 'Grid modernization projects, HVDC, and transformer supply for Vision 2030 infrastructure', 'manual',
 '{"level": "country", "region": "Middle East & Africa", "employees_approx": 300}'),
('e-loc-za', 'Location', 'South Africa',  'Other', 'Africa hub — grid automation, transformer services, and renewable energy projects', 'manual',
 '{"level": "country", "region": "Middle East & Africa", "employees_approx": 400}');

-- Latin America
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-br', 'Location', 'Brazil',        'Other', 'Latin America hub (São Paulo/Guarulhos) — transformer manufacturing, HVDC projects, grid automation', 'manual',
 '{"level": "country", "region": "Latin America", "employees_approx": 2000}'),
('e-loc-co', 'Location', 'Colombia',      'Other', 'Transformer manufacturing (Dos Quebradas) and Andean regional operations', 'manual',
 '{"level": "country", "region": "Latin America", "employees_approx": 500}');

-- ── LOCATION ELEMENTS — Key Sites (city level) ───────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-loc-zurich',       'Location', 'Zürich, Switzerland',       'Other', 'Global headquarters — corporate functions, Transformers BU leadership, and executive offices', 'manual',
 '{"level": "site", "country": "e-loc-ch", "site_type": "headquarters"}'),
('e-loc-vasteras',     'Location', 'Västerås, Sweden',          'Other', 'Grid Automation R&D hub — new 1,800-person campus with R&D center and grid automation production facility', 'manual',
 '{"level": "site", "country": "e-loc-se", "site_type": "r_and_d_manufacturing"}'),
('e-loc-ludvika',      'Location', 'Ludvika, Sweden',           'Other', 'Flagship manufacturing campus — HVDC systems, power transformers, and high voltage products. $330M expansion underway', 'manual',
 '{"level": "site", "country": "e-loc-se", "site_type": "engineering_manufacturing"}'),
('e-loc-raleigh',      'Location', 'Raleigh, NC, USA',          'Other', 'Americas Grid Automation hub — SCADA/EMS development, customer support, and regional sales', 'manual',
 '{"level": "site", "country": "e-loc-us", "site_type": "regional_hub"}'),
('e-loc-southboston',  'Location', 'South Boston, VA, USA',     'Other', 'Power transformer manufacturing — $457M expansion announced for grid component production', 'manual',
 '{"level": "site", "country": "e-loc-us", "site_type": "manufacturing"}'),
('e-loc-jeffcity',     'Location', 'Jefferson City, MO, USA',   'Other', 'Transformer manufacturing facility serving North American utility and industrial customers', 'manual',
 '{"level": "site", "country": "e-loc-us", "site_type": "manufacturing"}'),
('e-loc-mtpleasant',   'Location', 'Mount Pleasant, PA, USA',   'Other', 'High voltage switchgear and circuit breaker manufacturing — expansion underway', 'manual',
 '{"level": "site", "country": "e-loc-us", "site_type": "manufacturing"}'),
('e-loc-beijing',      'Location', 'Beijing, China',            'Other', 'APAC headquarters — regional management, sales, and grid automation operations', 'manual',
 '{"level": "site", "country": "e-loc-cn", "site_type": "regional_hub"}'),
('e-loc-chongqing',    'Location', 'Chongqing, China',          'Other', 'Transformer manufacturing facility serving Chinese and APAC markets', 'manual',
 '{"level": "site", "country": "e-loc-cn", "site_type": "manufacturing"}'),
('e-loc-badhonnef',    'Location', 'Bad Honnef, Germany',       'Other', 'Power transformer manufacturing plant serving European markets', 'manual',
 '{"level": "site", "country": "e-loc-de", "site_type": "manufacturing"}'),
('e-loc-savli',        'Location', 'Savli (Vadodara), India',   'Other', 'Multi-product manufacturing complex — transformers, switchgear, protection relays. Largest site by area', 'manual',
 '{"level": "site", "country": "e-loc-in", "site_type": "manufacturing"}'),
('e-loc-varennes',     'Location', 'Varennes, QC, Canada',      'Other', 'Power transformer manufacturing — $100M+ modernization and expansion program', 'manual',
 '{"level": "site", "country": "e-loc-ca", "site_type": "manufacturing"}'),
('e-loc-montreal',     'Location', 'Montreal, QC, Canada',      'Other', 'New HVDC simulation center — advanced testing and simulation for HVDC converter stations', 'manual',
 '{"level": "site", "country": "e-loc-ca", "site_type": "r_and_d"}'),
('e-loc-cordoba',      'Location', 'Córdoba, Spain',            'Other', 'Transformer production plant serving European and North African markets', 'manual',
 '{"level": "site", "country": "e-loc-es", "site_type": "manufacturing"}'),
('e-loc-drammen',      'Location', 'Drammen, Norway',           'Other', 'High voltage products factory — circuit breakers and gas-insulated switchgear', 'manual',
 '{"level": "site", "country": "e-loc-no", "site_type": "manufacturing"}'),
('e-loc-krakow',       'Location', 'Kraków, Poland',            'Other', 'Shared services center — IT, finance, HR, and digital operations', 'manual',
 '{"level": "site", "country": "e-loc-pl", "site_type": "shared_services"}'),
('e-loc-reynosa',      'Location', 'Reynosa, Mexico',           'Other', 'New distribution transformer factory under construction', 'manual',
 '{"level": "site", "country": "e-loc-mx", "site_type": "manufacturing"}'),
('e-loc-saopaulo',     'Location', 'São Paulo, Brazil',         'Other', 'Latin America hub — regional management, transformer factory, HVDC project delivery', 'manual',
 '{"level": "site", "country": "e-loc-br", "site_type": "regional_hub"}'),
('e-loc-dosquebradas', 'Location', 'Dos Quebradas, Colombia',   'Other', 'Transformer manufacturing facility serving Andean and Caribbean markets', 'manual',
 '{"level": "site", "country": "e-loc-co", "site_type": "manufacturing"}');

-- ── RELATIONSHIPS — Region → Country (Composition) ───────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Europe
('e-r-loc-001', 'Composition', 'Europe → Switzerland',  'e-loc-eu', 'e-loc-ch', 'manual', '{}'),
('e-r-loc-002', 'Composition', 'Europe → Sweden',       'e-loc-eu', 'e-loc-se', 'manual', '{}'),
('e-r-loc-003', 'Composition', 'Europe → Germany',      'e-loc-eu', 'e-loc-de', 'manual', '{}'),
('e-r-loc-004', 'Composition', 'Europe → Norway',       'e-loc-eu', 'e-loc-no', 'manual', '{}'),
('e-r-loc-005', 'Composition', 'Europe → Spain',        'e-loc-eu', 'e-loc-es', 'manual', '{}'),
('e-r-loc-006', 'Composition', 'Europe → Finland',      'e-loc-eu', 'e-loc-fi', 'manual', '{}'),
('e-r-loc-007', 'Composition', 'Europe → Poland',       'e-loc-eu', 'e-loc-pl', 'manual', '{}'),
('e-r-loc-008', 'Composition', 'Europe → Italy',        'e-loc-eu', 'e-loc-it', 'manual', '{}'),
-- North America
('e-r-loc-010', 'Composition', 'North America → USA',   'e-loc-na', 'e-loc-us', 'manual', '{}'),
('e-r-loc-011', 'Composition', 'North America → Canada','e-loc-na', 'e-loc-ca', 'manual', '{}'),
('e-r-loc-012', 'Composition', 'North America → Mexico','e-loc-na', 'e-loc-mx', 'manual', '{}'),
-- Asia Pacific
('e-r-loc-020', 'Composition', 'APAC → India',          'e-loc-apac', 'e-loc-in', 'manual', '{}'),
('e-r-loc-021', 'Composition', 'APAC → China',          'e-loc-apac', 'e-loc-cn', 'manual', '{}'),
('e-r-loc-022', 'Composition', 'APAC → Australia',      'e-loc-apac', 'e-loc-au', 'manual', '{}'),
('e-r-loc-023', 'Composition', 'APAC → Vietnam',        'e-loc-apac', 'e-loc-vn', 'manual', '{}'),
-- Middle East & Africa
('e-r-loc-030', 'Composition', 'MEA → UAE',             'e-loc-mea', 'e-loc-ae', 'manual', '{}'),
('e-r-loc-031', 'Composition', 'MEA → Saudi Arabia',    'e-loc-mea', 'e-loc-sa', 'manual', '{}'),
('e-r-loc-032', 'Composition', 'MEA → South Africa',    'e-loc-mea', 'e-loc-za', 'manual', '{}'),
-- Latin America
('e-r-loc-040', 'Composition', 'LatAm → Brazil',        'e-loc-latam', 'e-loc-br', 'manual', '{}'),
('e-r-loc-041', 'Composition', 'LatAm → Colombia',      'e-loc-latam', 'e-loc-co', 'manual', '{}');

-- ── RELATIONSHIPS — Country → Site (Composition) ─────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-loc-100', 'Composition', 'Switzerland → Zürich',       'e-loc-ch', 'e-loc-zurich',      'manual', '{}'),
('e-r-loc-101', 'Composition', 'Sweden → Västerås',          'e-loc-se', 'e-loc-vasteras',    'manual', '{}'),
('e-r-loc-102', 'Composition', 'Sweden → Ludvika',           'e-loc-se', 'e-loc-ludvika',     'manual', '{}'),
('e-r-loc-103', 'Composition', 'USA → Raleigh',              'e-loc-us', 'e-loc-raleigh',     'manual', '{}'),
('e-r-loc-104', 'Composition', 'USA → South Boston',         'e-loc-us', 'e-loc-southboston', 'manual', '{}'),
('e-r-loc-105', 'Composition', 'USA → Jefferson City',       'e-loc-us', 'e-loc-jeffcity',    'manual', '{}'),
('e-r-loc-106', 'Composition', 'USA → Mount Pleasant',       'e-loc-us', 'e-loc-mtpleasant',  'manual', '{}'),
('e-r-loc-107', 'Composition', 'China → Beijing',            'e-loc-cn', 'e-loc-beijing',     'manual', '{}'),
('e-r-loc-108', 'Composition', 'China → Chongqing',          'e-loc-cn', 'e-loc-chongqing',   'manual', '{}'),
('e-r-loc-109', 'Composition', 'Germany → Bad Honnef',       'e-loc-de', 'e-loc-badhonnef',   'manual', '{}'),
('e-r-loc-110', 'Composition', 'India → Savli',              'e-loc-in', 'e-loc-savli',       'manual', '{}'),
('e-r-loc-111', 'Composition', 'Canada → Varennes',          'e-loc-ca', 'e-loc-varennes',    'manual', '{}'),
('e-r-loc-112', 'Composition', 'Canada → Montreal',          'e-loc-ca', 'e-loc-montreal',    'manual', '{}'),
('e-r-loc-113', 'Composition', 'Spain → Córdoba',            'e-loc-es', 'e-loc-cordoba',     'manual', '{}'),
('e-r-loc-114', 'Composition', 'Norway → Drammen',           'e-loc-no', 'e-loc-drammen',     'manual', '{}'),
('e-r-loc-115', 'Composition', 'Poland → Kraków',            'e-loc-pl', 'e-loc-krakow',      'manual', '{}'),
('e-r-loc-116', 'Composition', 'Mexico → Reynosa',           'e-loc-mx', 'e-loc-reynosa',     'manual', '{}'),
('e-r-loc-117', 'Composition', 'Brazil → São Paulo',         'e-loc-br', 'e-loc-saopaulo',    'manual', '{}'),
('e-r-loc-118', 'Composition', 'Colombia → Dos Quebradas',   'e-loc-co', 'e-loc-dosquebradas','manual', '{}');

-- ── RELATIONSHIPS — Site → BusinessActor (Association) ────────────────────────
-- Links existing BusinessActors to their Location

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-loc-200', 'Association', 'Zürich HQ at Zürich',              'e-loc-zurich',     'e-actor-001', 'manual', '{}'),
('e-r-loc-201', 'Association', 'Västerås Operations at Västerås',  'e-loc-vasteras',   'e-actor-002', 'manual', '{}'),
('e-r-loc-202', 'Association', 'Ludvika Operations at Ludvika',    'e-loc-ludvika',    'e-actor-003', 'manual', '{}'),
('e-r-loc-203', 'Association', 'Raleigh Hub at Raleigh',           'e-loc-raleigh',    'e-actor-004', 'manual', '{}'),
('e-r-loc-204', 'Association', 'Beijing Office at Beijing',        'e-loc-beijing',    'e-actor-005', 'manual', '{}'),
('e-r-loc-205', 'Association', 'Bad Honnef Factory at Bad Honnef', 'e-loc-badhonnef',  'e-actor-006', 'manual', '{}'),
('e-r-loc-206', 'Association', 'Savli Factory at Savli',           'e-loc-savli',      'e-actor-007', 'manual', '{}'),
('e-r-loc-207', 'Association', 'Varennes Factory at Varennes',     'e-loc-varennes',   'e-actor-008', 'manual', '{}'),
('e-r-loc-208', 'Association', 'Córdoba Plant at Córdoba',         'e-loc-cordoba',    'e-actor-009', 'manual', '{}'),
('e-r-loc-209', 'Association', 'Drammen Factory at Drammen',       'e-loc-drammen',    'e-actor-010', 'manual', '{}');

-- ── RELATIONSHIPS — Site → Facility (Association) ─────────────────────────────
-- Links existing Facilities to their Location

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-loc-300', 'Association', 'Ludvika Campus at Ludvika',            'e-loc-ludvika',    'e-fac-001', 'manual', '{}'),
('e-r-loc-301', 'Association', 'Bad Honnef Factory at Bad Honnef',     'e-loc-badhonnef',  'e-fac-002', 'manual', '{}'),
('e-r-loc-302', 'Association', 'Savli Complex at Savli',               'e-loc-savli',      'e-fac-003', 'manual', '{}'),
('e-r-loc-303', 'Association', 'Varennes Plant at Varennes',           'e-loc-varennes',   'e-fac-004', 'manual', '{}'),
('e-r-loc-304', 'Association', 'Drammen Factory at Drammen',           'e-loc-drammen',    'e-fac-005', 'manual', '{}');

-- ── RELATIONSHIPS — Site → Technology Node (Association) ──────────────────────
-- Links key infrastructure to locations

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-loc-400', 'Association', 'Zürich DC at Zürich',                  'e-loc-zurich',     'e-node-002', 'manual', '{}'),
('e-r-loc-401', 'Association', 'Västerås Control Center at Västerås',  'e-loc-vasteras',   'e-node-003', 'manual', '{}');

-- ── NEW BUSINESS ACTORS — Additional manufacturing sites from research ────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-actor-011', 'BusinessActor', 'South Boston Factory',     'Business',
 'Power transformer manufacturing facility in South Boston, Virginia — $457M expansion for grid components',
 'manual', '{"location": "South Boston, VA, USA", "type": "manufacturing"}'),
('e-actor-012', 'BusinessActor', 'Jefferson City Factory',   'Business',
 'Transformer manufacturing facility in Jefferson City, Missouri serving North American markets',
 'manual', '{"location": "Jefferson City, MO, USA", "type": "manufacturing"}'),
('e-actor-013', 'BusinessActor', 'Mount Pleasant Factory',   'Business',
 'High voltage switchgear and circuit breaker manufacturing in Mount Pleasant, Pennsylvania — expansion underway',
 'manual', '{"location": "Mount Pleasant, PA, USA", "type": "manufacturing"}'),
('e-actor-014', 'BusinessActor', 'Chongqing Factory',       'Business',
 'Transformer manufacturing facility in Chongqing, China serving Chinese and APAC markets',
 'manual', '{"location": "Chongqing, China", "type": "manufacturing"}'),
('e-actor-015', 'BusinessActor', 'Reynosa Factory',          'Business',
 'New distribution transformer factory in Reynosa, Mexico under construction',
 'manual', '{"location": "Reynosa, Mexico", "type": "manufacturing"}'),
('e-actor-016', 'BusinessActor', 'São Paulo Hub',            'Business',
 'Latin America regional hub in São Paulo — management, transformer production, and HVDC project delivery',
 'manual', '{"location": "São Paulo, Brazil", "type": "regional_hub"}'),
('e-actor-017', 'BusinessActor', 'Dos Quebradas Factory',    'Business',
 'Transformer manufacturing facility in Dos Quebradas, Colombia',
 'manual', '{"location": "Dos Quebradas, Colombia", "type": "manufacturing"}'),
('e-actor-018', 'BusinessActor', 'Kraków Service Center',    'Business',
 'Shared services center in Kraków — IT, finance, HR, and digital operations supporting global operations',
 'manual', '{"location": "Kraków, Poland", "type": "shared_services"}'),
('e-actor-019', 'BusinessActor', 'Montreal HVDC Center',     'Business',
 'New HVDC simulation center in Montreal — advanced testing and simulation for converter stations',
 'manual', '{"location": "Montreal, Canada", "type": "r_and_d"}');

-- ── RELATIONSHIPS — New actors → Sites (Association) ──────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-loc-210', 'Association', 'South Boston Factory at South Boston',   'e-loc-southboston',  'e-actor-011', 'manual', '{}'),
('e-r-loc-211', 'Association', 'Jefferson City Factory at Jefferson City','e-loc-jeffcity',     'e-actor-012', 'manual', '{}'),
('e-r-loc-212', 'Association', 'Mount Pleasant Factory at Mt Pleasant',  'e-loc-mtpleasant',   'e-actor-013', 'manual', '{}'),
('e-r-loc-213', 'Association', 'Chongqing Factory at Chongqing',        'e-loc-chongqing',    'e-actor-014', 'manual', '{}'),
('e-r-loc-214', 'Association', 'Reynosa Factory at Reynosa',            'e-loc-reynosa',      'e-actor-015', 'manual', '{}'),
('e-r-loc-215', 'Association', 'São Paulo Hub at São Paulo',            'e-loc-saopaulo',     'e-actor-016', 'manual', '{}'),
('e-r-loc-216', 'Association', 'Dos Quebradas Factory at Dos Quebradas','e-loc-dosquebradas', 'e-actor-017', 'manual', '{}'),
('e-r-loc-217', 'Association', 'Kraków Center at Kraków',              'e-loc-krakow',       'e-actor-018', 'manual', '{}'),
('e-r-loc-218', 'Association', 'Montreal Center at Montreal',           'e-loc-montreal',     'e-actor-019', 'manual', '{}');

-- ── NEW FACILITIES — Additional manufacturing sites ───────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-fac-006', 'Facility', 'South Boston Transformer Plant',  'Physical',
 'Power transformer manufacturing — major expansion ($457M) to increase grid component production capacity',
 'manual', '{"location": "South Boston, VA, USA", "area_sqm": 55000}'),
('e-fac-007', 'Facility', 'Jefferson City Transformer Plant', 'Physical',
 'Transformer manufacturing facility serving North American utility customers',
 'manual', '{"location": "Jefferson City, MO, USA", "area_sqm": 40000}'),
('e-fac-008', 'Facility', 'Mount Pleasant HV Factory',       'Physical',
 'High voltage switchgear and circuit breaker manufacturing — expansion for increased grid demand',
 'manual', '{"location": "Mount Pleasant, PA, USA", "area_sqm": 30000}'),
('e-fac-009', 'Facility', 'Chongqing Transformer Factory',   'Physical',
 'Transformer manufacturing facility in Chongqing serving Chinese and APAC markets',
 'manual', '{"location": "Chongqing, China", "area_sqm": 45000}'),
('e-fac-010', 'Facility', 'Dos Quebradas Transformer Plant',  'Physical',
 'Transformer manufacturing facility serving Andean and Caribbean regional markets',
 'manual', '{"location": "Dos Quebradas, Colombia", "area_sqm": 25000}');

-- ── RELATIONSHIPS — New facilities → Sites (Association) ──────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-loc-305', 'Association', 'South Boston Plant at South Boston',     'e-loc-southboston',  'e-fac-006', 'manual', '{}'),
('e-r-loc-306', 'Association', 'Jefferson City Plant at Jefferson City', 'e-loc-jeffcity',     'e-fac-007', 'manual', '{}'),
('e-r-loc-307', 'Association', 'Mount Pleasant Factory at Mt Pleasant',  'e-loc-mtpleasant',   'e-fac-008', 'manual', '{}'),
('e-r-loc-308', 'Association', 'Chongqing Factory at Chongqing',        'e-loc-chongqing',    'e-fac-009', 'manual', '{}'),
('e-r-loc-309', 'Association', 'Dos Quebradas Plant at Dos Quebradas',  'e-loc-dosquebradas', 'e-fac-010', 'manual', '{}');
