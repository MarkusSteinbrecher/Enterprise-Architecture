-- ============================================================================
-- Energy Client: Process Enrichment
-- Adds ~100 relationships to the existing 20 BusinessProcess elements:
--   Composition (hierarchy), Triggering (sequence), Event triggers,
--   Role assignments, Application serving, Data access
-- Also updates all 20 processes with ai_impact properties
-- ============================================================================

-- ── COMPOSITION — Parent → Child process hierarchy ─────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Transformer Order-to-Delivery (001) → 5 children
('e-r-proc-001', 'Composition', 'O2D → Design',       'e-proc-001', 'e-proc-002', 'manual', '{}'),
('e-r-proc-002', 'Composition', 'O2D → Procurement',   'e-proc-001', 'e-proc-003', 'manual', '{}'),
('e-r-proc-003', 'Composition', 'O2D → Assembly',      'e-proc-001', 'e-proc-004', 'manual', '{}'),
('e-r-proc-004', 'Composition', 'O2D → FAT',           'e-proc-001', 'e-proc-005', 'manual', '{}'),
('e-r-proc-005', 'Composition', 'O2D → Transport',     'e-proc-001', 'e-proc-006', 'manual', '{}'),
-- Grid Fault Management (007) → 3 children
('e-r-proc-006', 'Composition', 'Fault Mgmt → Detection',    'e-proc-007', 'e-proc-008', 'manual', '{}'),
('e-r-proc-007', 'Composition', 'Fault Mgmt → Analysis',     'e-proc-007', 'e-proc-009', 'manual', '{}'),
('e-r-proc-008', 'Composition', 'Fault Mgmt → Restoration',  'e-proc-007', 'e-proc-010', 'manual', '{}'),
-- Predictive Maintenance Cycle (011) → 3 children
('e-r-proc-009', 'Composition', 'Pred Maint → Sensor Data',  'e-proc-011', 'e-proc-012', 'manual', '{}'),
('e-r-proc-010', 'Composition', 'Pred Maint → Assessment',   'e-proc-011', 'e-proc-013', 'manual', '{}'),
('e-r-proc-011', 'Composition', 'Pred Maint → Work Order',   'e-proc-011', 'e-proc-014', 'manual', '{}'),
-- Substation Commissioning (015) → 3 children
('e-r-proc-012', 'Composition', 'Commissioning → Installation', 'e-proc-015', 'e-proc-016', 'manual', '{}'),
('e-r-proc-013', 'Composition', 'Commissioning → Testing',      'e-proc-015', 'e-proc-017', 'manual', '{}'),
('e-r-proc-014', 'Composition', 'Commissioning → Handover',     'e-proc-015', 'e-proc-018', 'manual', '{}');

-- ── TRIGGERING — Sequential step ordering ──────────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Transformer Order-to-Delivery flow
('e-r-proc-020', 'Triggering', 'Design → Procurement',   'e-proc-002', 'e-proc-003', 'manual', '{}'),
('e-r-proc-021', 'Triggering', 'Procurement → Assembly',  'e-proc-003', 'e-proc-004', 'manual', '{}'),
('e-r-proc-022', 'Triggering', 'Assembly → FAT',          'e-proc-004', 'e-proc-005', 'manual', '{}'),
('e-r-proc-023', 'Triggering', 'FAT → Transport',         'e-proc-005', 'e-proc-006', 'manual', '{}'),
-- Grid Fault Management flow
('e-r-proc-024', 'Triggering', 'Detection → Analysis',    'e-proc-008', 'e-proc-009', 'manual', '{}'),
('e-r-proc-025', 'Triggering', 'Analysis → Restoration',  'e-proc-009', 'e-proc-010', 'manual', '{}'),
-- Predictive Maintenance flow
('e-r-proc-026', 'Triggering', 'Sensor Data → Assessment',  'e-proc-012', 'e-proc-013', 'manual', '{}'),
('e-r-proc-027', 'Triggering', 'Assessment → Work Order',   'e-proc-013', 'e-proc-014', 'manual', '{}'),
-- Substation Commissioning flow
('e-r-proc-028', 'Triggering', 'Installation → Testing',    'e-proc-016', 'e-proc-017', 'manual', '{}'),
('e-r-proc-029', 'Triggering', 'Testing → Handover',        'e-proc-017', 'e-proc-018', 'manual', '{}');

-- ── TRIGGERING — BusinessEvent → Process ───────────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-proc-030', 'Triggering', 'Grid Fault → Detection',         'e-evt-001', 'e-proc-008', 'manual', '{}'),
('e-r-proc-031', 'Triggering', 'Maint Threshold → Sensor Data',  'e-evt-002', 'e-proc-012', 'manual', '{}'),
('e-r-proc-032', 'Triggering', 'Order Received → Quote-to-Order', 'e-evt-003', 'e-proc-019', 'manual', '{}'),
('e-r-proc-033', 'Triggering', 'FAT Complete → Transport',        'e-evt-004', 'e-proc-006', 'manual', '{}'),
('e-r-proc-034', 'Triggering', 'Safety Incident → Fault Mgmt',   'e-evt-005', 'e-proc-007', 'manual', '{}');

-- ── ASSIGNMENT — BusinessRole → Process ────────────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Grid Operator (001) → grid processes
('e-r-proc-040', 'Assignment', 'Grid Operator → Fault Mgmt',        'e-role-001', 'e-proc-007', 'manual', '{}'),
('e-r-proc-041', 'Assignment', 'Grid Operator → Detection',          'e-role-001', 'e-proc-008', 'manual', '{}'),
('e-r-proc-042', 'Assignment', 'Grid Operator → Restoration',        'e-role-001', 'e-proc-010', 'manual', '{}'),
-- Field Service Engineer (002) → field processes
('e-r-proc-043', 'Assignment', 'Field Eng → Installation',           'e-role-002', 'e-proc-016', 'manual', '{}'),
('e-r-proc-044', 'Assignment', 'Field Eng → Restoration',            'e-role-002', 'e-proc-010', 'manual', '{}'),
('e-r-proc-045', 'Assignment', 'Field Eng → Work Order Exec',        'e-role-002', 'e-proc-014', 'manual', '{}'),
-- Asset Manager (003) → maintenance
('e-r-proc-046', 'Assignment', 'Asset Mgr → Pred Maint',             'e-role-003', 'e-proc-011', 'manual', '{}'),
('e-r-proc-047', 'Assignment', 'Asset Mgr → Condition Assessment',   'e-role-003', 'e-proc-013', 'manual', '{}'),
-- Protection Engineer (004) → fault analysis, testing
('e-r-proc-048', 'Assignment', 'Protection Eng → Fault Analysis',    'e-role-004', 'e-proc-009', 'manual', '{}'),
('e-r-proc-049', 'Assignment', 'Protection Eng → Comm Testing',      'e-role-004', 'e-proc-017', 'manual', '{}'),
-- Plant Manager (006) → manufacturing
('e-r-proc-050', 'Assignment', 'Plant Mgr → O2D',                    'e-role-006', 'e-proc-001', 'manual', '{}'),
('e-r-proc-051', 'Assignment', 'Plant Mgr → Assembly',               'e-role-006', 'e-proc-004', 'manual', '{}'),
-- Solution Architect (007) → design, commissioning
('e-r-proc-052', 'Assignment', 'Solution Arch → Design',             'e-role-007', 'e-proc-002', 'manual', '{}'),
('e-r-proc-053', 'Assignment', 'Solution Arch → Commissioning',      'e-role-007', 'e-proc-015', 'manual', '{}'),
-- Quality Inspector (008) → testing
('e-r-proc-054', 'Assignment', 'Quality Insp → FAT',                 'e-role-008', 'e-proc-005', 'manual', '{}'),
('e-r-proc-055', 'Assignment', 'Quality Insp → Comm Testing',        'e-role-008', 'e-proc-017', 'manual', '{}'),
-- Procurement Manager (009) → procurement, supplier
('e-r-proc-056', 'Assignment', 'Procurement Mgr → Procurement',      'e-role-009', 'e-proc-003', 'manual', '{}'),
('e-r-proc-057', 'Assignment', 'Procurement Mgr → Supplier Qual',    'e-role-009', 'e-proc-020', 'manual', '{}'),
-- Customer Success Manager (010) → handover, quote
('e-r-proc-058', 'Assignment', 'CSM → Handover',                     'e-role-010', 'e-proc-018', 'manual', '{}'),
('e-r-proc-059', 'Assignment', 'CSM → Quote-to-Order',               'e-role-010', 'e-proc-019', 'manual', '{}'),
-- R&D Engineer (011) → design
('e-r-proc-060', 'Assignment', 'R&D Eng → Transformer Design',       'e-role-011', 'e-proc-002', 'manual', '{}'),
-- HSE Manager (012) → safety-sensitive processes
('e-r-proc-061', 'Assignment', 'HSE Mgr → Assembly',                 'e-role-012', 'e-proc-004', 'manual', '{}'),
('e-r-proc-062', 'Assignment', 'HSE Mgr → Installation',             'e-role-012', 'e-proc-016', 'manual', '{}');

-- ── SERVING — Application → Process ────────────────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Transformer Design (002)
('e-r-proc-070', 'Serving', 'TDS → Design',              'e-app-010', 'e-proc-002', 'manual', '{}'),
('e-r-proc-071', 'Serving', 'AutoCAD → Design',          'e-app-053', 'e-proc-002', 'manual', '{}'),
('e-r-proc-072', 'Serving', 'Teamcenter → Design',       'e-app-051', 'e-proc-002', 'manual', '{}'),
-- Material Procurement (003)
('e-r-proc-073', 'Serving', 'SAP S/4HANA → Procurement', 'e-app-006', 'e-proc-003', 'manual', '{}'),
('e-r-proc-074', 'Serving', 'SAP Ariba → Procurement',   'e-app-090', 'e-proc-003', 'manual', '{}'),
-- Assembly (004)
('e-r-proc-075', 'Serving', 'MES Ludvika → Assembly',    'e-app-040', 'e-proc-004', 'manual', '{}'),
('e-r-proc-076', 'Serving', 'SAP PLM → Assembly',        'e-app-007', 'e-proc-004', 'manual', '{}'),
-- FAT (005)
('e-r-proc-077', 'Serving', 'SAP QM → FAT',              'e-app-100', 'e-proc-005', 'manual', '{}'),
('e-r-proc-078', 'Serving', 'PQ Analyzer → FAT',         'e-app-013', 'e-proc-005', 'manual', '{}'),
-- Transport (006)
('e-r-proc-079', 'Serving', 'SAP TM → Transport',        'e-app-094', 'e-proc-006', 'manual', '{}'),
-- Fault Detection (008)
('e-r-proc-080', 'Serving', 'MicroSCADA → Detection',    'e-app-002', 'e-proc-008', 'manual', '{}'),
('e-r-proc-081', 'Serving', 'Network Mgr → Detection',   'e-app-003', 'e-proc-008', 'manual', '{}'),
-- Fault Analysis (009)
('e-r-proc-082', 'Serving', 'Network Mgr → Analysis',    'e-app-003', 'e-proc-009', 'manual', '{}'),
('e-r-proc-083', 'Serving', 'Lumada APM → Analysis',     'e-app-001', 'e-proc-009', 'manual', '{}'),
-- Service Restoration (010)
('e-r-proc-084', 'Serving', 'MicroSCADA → Restoration',  'e-app-002', 'e-proc-010', 'manual', '{}'),
('e-r-proc-085', 'Serving', 'ADMS → Restoration',        'e-app-060', 'e-proc-010', 'manual', '{}'),
-- Sensor Data Collection (012)
('e-r-proc-086', 'Serving', 'Lumada APM → Sensor Data',  'e-app-001', 'e-proc-012', 'manual', '{}'),
('e-r-proc-087', 'Serving', 'Databricks → Sensor Data',  'e-app-162', 'e-proc-012', 'manual', '{}'),
-- Condition Assessment (013)
('e-r-proc-088', 'Serving', 'Lumada APM → Assessment',   'e-app-001', 'e-proc-013', 'manual', '{}'),
('e-r-proc-089', 'Serving', 'IdentiQ → Assessment',      'e-app-057', 'e-proc-013', 'manual', '{}'),
-- Work Order Generation (014)
('e-r-proc-090', 'Serving', 'Lumada EAM → Work Order',   'e-app-067', 'e-proc-014', 'manual', '{}'),
('e-r-proc-091', 'Serving', 'Field Mobile → Work Order',  'e-app-070', 'e-proc-014', 'manual', '{}'),
-- Equipment Installation (016)
('e-r-proc-092', 'Serving', 'Field Mobile → Installation', 'e-app-070', 'e-proc-016', 'manual', '{}'),
('e-r-proc-093', 'Serving', 'PCM600 → Installation',      'e-app-055', 'e-proc-016', 'manual', '{}'),
-- Commissioning Testing (017)
('e-r-proc-094', 'Serving', 'ETAP → Comm Testing',        'e-app-054', 'e-proc-017', 'manual', '{}'),
('e-r-proc-095', 'Serving', 'PCM600 → Comm Testing',      'e-app-055', 'e-proc-017', 'manual', '{}'),
('e-r-proc-096', 'Serving', 'Polarion → Comm Testing',    'e-app-101', 'e-proc-017', 'manual', '{}'),
-- Customer Handover (018)
('e-r-proc-097', 'Serving', 'Salesforce → Handover',      'e-app-030', 'e-proc-018', 'manual', '{}'),
('e-r-proc-098', 'Serving', 'SharePoint → Handover',      'e-app-141', 'e-proc-018', 'manual', '{}'),
-- Quote-to-Order (019)
('e-r-proc-099', 'Serving', 'Salesforce → Quote',         'e-app-030', 'e-proc-019', 'manual', '{}'),
('e-r-proc-100', 'Serving', 'CPQ → Quote',                'e-app-032', 'e-proc-019', 'manual', '{}'),
-- Supplier Qualification (020)
('e-r-proc-101', 'Serving', 'SAP Ariba → Supplier Qual',  'e-app-090', 'e-proc-020', 'manual', '{}'),
('e-r-proc-102', 'Serving', 'SAP QM → Supplier Qual',     'e-app-100', 'e-proc-020', 'manual', '{}');

-- ── ACCESS — Process → BusinessObject ──────────────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Transformer Design → creates specs and BOMs
('e-r-proc-110', 'Access', 'Design → Design Spec',           'e-proc-002', 'e-obj-009', 'manual', '{"access_type": "write"}'),
('e-r-proc-111', 'Access', 'Design → BOM',                   'e-proc-002', 'e-obj-015', 'manual', '{"access_type": "write"}'),
-- Material Procurement → reads BOM, manages spare parts
('e-r-proc-112', 'Access', 'Procurement → BOM',              'e-proc-003', 'e-obj-015', 'manual', '{"access_type": "read"}'),
('e-r-proc-113', 'Access', 'Procurement → Spare Part',       'e-proc-003', 'e-obj-012', 'manual', '{"access_type": "read"}'),
-- Assembly → produces transformer
('e-r-proc-114', 'Access', 'Assembly → Transformer',         'e-proc-004', 'e-obj-002', 'manual', '{"access_type": "write"}'),
-- FAT → creates test certificate, reads transformer
('e-r-proc-115', 'Access', 'FAT → Test Certificate',         'e-proc-005', 'e-obj-010', 'manual', '{"access_type": "write"}'),
('e-r-proc-116', 'Access', 'FAT → Transformer',              'e-proc-005', 'e-obj-002', 'manual', '{"access_type": "read"}'),
-- Transport → reads transformer data
('e-r-proc-117', 'Access', 'Transport → Transformer',        'e-proc-006', 'e-obj-002', 'manual', '{"access_type": "read"}'),
-- Fault Detection → creates fault report
('e-r-proc-118', 'Access', 'Detection → Fault Report',       'e-proc-008', 'e-obj-008', 'manual', '{"access_type": "write"}'),
-- Fault Analysis → reads/updates fault report
('e-r-proc-119', 'Access', 'Analysis → Fault Report',        'e-proc-009', 'e-obj-008', 'manual', '{"access_type": "readwrite"}'),
-- Service Restoration → updates grid asset status
('e-r-proc-120', 'Access', 'Restoration → Grid Asset',       'e-proc-010', 'e-obj-001', 'manual', '{"access_type": "readwrite"}'),
-- Sensor Data → reads energy readings
('e-r-proc-121', 'Access', 'Sensor Data → Energy Reading',   'e-proc-012', 'e-obj-007', 'manual', '{"access_type": "read"}'),
-- Condition Assessment → reads grid asset health
('e-r-proc-122', 'Access', 'Assessment → Grid Asset',        'e-proc-013', 'e-obj-001', 'manual', '{"access_type": "read"}'),
('e-r-proc-123', 'Access', 'Assessment → Maint Record',      'e-proc-013', 'e-obj-006', 'manual', '{"access_type": "read"}'),
-- Work Order Generation → creates work orders
('e-r-proc-124', 'Access', 'Work Order Gen → Work Order',    'e-proc-014', 'e-obj-005', 'manual', '{"access_type": "write"}'),
-- Equipment Installation → updates substation
('e-r-proc-125', 'Access', 'Installation → Substation',      'e-proc-016', 'e-obj-003', 'manual', '{"access_type": "readwrite"}'),
-- Commissioning Testing → creates test certificate
('e-r-proc-126', 'Access', 'Comm Testing → Test Certificate', 'e-proc-017', 'e-obj-010', 'manual', '{"access_type": "write"}'),
-- Customer Handover → reads/updates contract
('e-r-proc-127', 'Access', 'Handover → Customer Contract',   'e-proc-018', 'e-obj-011', 'manual', '{"access_type": "readwrite"}'),
-- Quote-to-Order → creates customer order
('e-r-proc-128', 'Access', 'Quote → Customer Order',         'e-proc-019', 'e-obj-014', 'manual', '{"access_type": "write"}'),
('e-r-proc-129', 'Access', 'Quote → Customer Contract',      'e-proc-019', 'e-obj-011', 'manual', '{"access_type": "read"}'),
-- Supplier Qualification → reads spare part data
('e-r-proc-130', 'Access', 'Supplier Qual → Spare Part',     'e-proc-020', 'e-obj-012', 'manual', '{"access_type": "read"}');

-- ── AI IMPACT — Property updates for all 20 processes ──────────────────────

-- Transformer Order-to-Delivery (macro process)
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Transformers BU',
  '$.ai_impact', json('{"rating":"high","approach":"hybrid","summary":"End-to-end orchestration with AI-optimized design, predictive procurement, and autonomous quality gates","current_state":"Manually coordinated 9-14 month cycle with sequential handoffs between engineering, procurement, manufacturing, and logistics teams","ai_opportunity":"AI orchestration agent manages the full value chain — generative design reduces cycle by 30%, predictive procurement prevents delays, computer vision automates quality checks, route optimization for heavy transport","techniques":["process-orchestration","generative-design","predictive-analytics","computer-vision"],"estimated_value":"40-60% cycle time reduction","readiness":"medium","barriers":["Legacy MES integration","Cross-BU coordination complexity","30+ year proprietary design tools"]}'))
) WHERE id = 'e-proc-001';

-- Transformer Design
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Transformers BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-augmented","summary":"Generative design exploration with AI co-pilot for transformer engineering","current_state":"Expert engineers use proprietary TDS software with 30+ years of accumulated rules — each design takes 2-6 weeks of iterative calculation","ai_opportunity":"Generative AI explores design space against constraints (IEC standards, thermal limits, material costs), proposes optimized designs for engineer review, auto-generates BOM and 3D models","techniques":["generative-design","constraint-optimization","digital-twin","knowledge-graphs"],"estimated_value":"50-70% design time reduction","readiness":"medium","barriers":["Proprietary TDS codebase is hard to integrate","Engineering IP sensitivity","Regulatory certification of AI-generated designs"]}'))
) WHERE id = 'e-proc-002';

-- Material Procurement
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Supply Chain',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"Autonomous procurement agent handles sourcing, negotiation, and order placement for standard materials","current_state":"Procurement managers manually source copper, core steel, insulation oil from approved suppliers — 4-8 week lead times, price volatility on commodities","ai_opportunity":"AI agent monitors commodity markets, predicts price movements, auto-negotiates with pre-qualified suppliers via Ariba, triggers purchase orders when optimal conditions met","techniques":["predictive-analytics","autonomous-negotiation","supply-chain-optimization","market-intelligence"],"estimated_value":"15-25% material cost reduction","readiness":"high","barriers":["Supplier willingness for API-based negotiation","Commodity market unpredictability"]}'))
) WHERE id = 'e-proc-003';

-- Transformer Assembly
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Transformers BU',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-augmented","summary":"AI-guided assembly with real-time quality monitoring and adaptive scheduling","current_state":"Skilled workers follow work instructions across 8-12 week assembly cycles — manual quality checks at defined gates, production scheduling via MES","ai_opportunity":"Computer vision monitors assembly quality in real-time, digital twin tracks progress vs plan, AI adjusts production schedule dynamically based on supply chain status and workforce availability","techniques":["computer-vision","digital-twin","dynamic-scheduling","anomaly-detection"],"estimated_value":"20-30% defect reduction, 15% throughput improvement","readiness":"medium","barriers":["Factory floor connectivity gaps","Skilled workforce resistance to AI oversight","Varying MES maturity across 7 factories"]}'))
) WHERE id = 'e-proc-004';

-- Factory Acceptance Testing
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Quality',
  '$.ai_impact', json('{"rating":"high","approach":"agent-augmented","summary":"AI-powered test analysis with automated anomaly detection and certificate generation","current_state":"Manual test execution over 1-2 weeks per unit — engineers analyze waveforms, partial discharge patterns, and thermal data against IEC 60076 requirements","ai_opportunity":"ML models analyze test data in real-time, flag anomalies automatically, compare against fleet-wide historical patterns, auto-generate test certificates and reports","techniques":["anomaly-detection","pattern-recognition","automated-reporting","predictive-quality"],"estimated_value":"40% faster test analysis, 90% auto-generated reports","readiness":"high","barriers":["IEC certification requirements for AI-assisted testing","Customer acceptance of AI-generated certificates"]}'))
) WHERE id = 'e-proc-005';

-- Heavy Transport & Delivery
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Logistics',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-native","summary":"Autonomous route planning and permit orchestration for heavy transformer transport","current_state":"Logistics specialists manually plan routes for 200-400 ton transformer shipments — bridge clearances, road permits, police escorts, port coordination","ai_opportunity":"AI agent plans optimal routes considering weight restrictions, bridge ratings, weather, permits in parallel, real-time tracking with automated stakeholder notifications","techniques":["route-optimization","geospatial-analysis","document-automation","real-time-tracking"],"estimated_value":"30% faster permit processing, 20% logistics cost reduction","readiness":"medium","barriers":["Varying permit systems across countries","Physical infrastructure constraints","Weather dependency"]}'))
) WHERE id = 'e-proc-006';

-- Grid Fault Management (macro process)
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Grid Automation BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"Near-autonomous fault management from detection through analysis to coordinated restoration","current_state":"Operators monitor SCADA dashboards, manually analyze alarm cascades, coordinate switching operations with field crews via radio/phone","ai_opportunity":"AI agent processes SCADA events in real-time, performs instant root cause analysis using graph-based grid model, recommends optimal switching sequence, auto-dispatches crews with mobile work orders","techniques":["real-time-analytics","graph-analysis","automated-dispatch","digital-twin"],"estimated_value":"60-80% faster restoration, 50% reduction in customer-minutes-lost","readiness":"high","barriers":["Safety regulations require human approval for switching","Union requirements for operator staffing","Varying SCADA system maturity across utilities"]}'))
) WHERE id = 'e-proc-007';

-- Fault Detection & Isolation
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Grid Automation BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"ML-powered fault detection reduces identification time from minutes to seconds","current_state":"SCADA alarms trigger operator attention — manual correlation of protection relay events, alarm flooding during major faults obscures root cause","ai_opportunity":"ML model trained on historical fault signatures processes relay data and SCADA events in real-time, identifies fault type and location within seconds, filters alarm noise automatically","techniques":["real-time-ml","signal-processing","alarm-management","pattern-recognition"],"estimated_value":"95% faster fault identification, 80% alarm reduction during cascading events","readiness":"high","barriers":["Model training requires labeled historical fault data","Protection relay firmware compatibility"]}'))
) WHERE id = 'e-proc-008';

-- Fault Analysis & Root Cause
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Grid Automation BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-augmented","summary":"Graph-based causal analysis identifies root causes using grid topology and event correlation","current_state":"Protection engineers manually review event sequences, disturbance recordings, and fault waveforms — analysis can take hours for complex cascading faults","ai_opportunity":"AI traverses grid topology graph to trace fault propagation, correlates protection relay sequences with physical grid model, generates root cause report with confidence scores","techniques":["graph-analysis","causal-inference","waveform-analysis","knowledge-graphs"],"estimated_value":"70% faster root cause identification","readiness":"medium","barriers":["Incomplete grid topology data","Legacy relay event format variations"]}'))
) WHERE id = 'e-proc-009';

-- Service Restoration
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Grid Automation BU',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-augmented","summary":"AI recommends optimal restoration sequence while human operators approve critical switching","current_state":"Operators plan switching sequence manually, coordinate with field crews and neighboring grid operators, execute step-by-step with safety checks","ai_opportunity":"AI generates optimal restoration plan considering load priorities, equipment ratings, and crew availability — presents ranked options to operator for approval, auto-dispatches field crews","techniques":["optimization","constraint-satisfaction","crew-scheduling","real-time-simulation"],"estimated_value":"40% faster restoration, optimized load shedding decisions","readiness":"medium","barriers":["Safety regulations mandate human approval","Coordination with external grid operators","Real-time simulation accuracy"]}'))
) WHERE id = 'e-proc-010';

-- Predictive Maintenance Cycle (macro process)
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Service & Operations BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"Fully autonomous maintenance cycle from data collection through analysis to work order generation","current_state":"Periodic condition assessments with manual data review — maintenance often reactive or calendar-based rather than condition-based","ai_opportunity":"Autonomous agent continuously monitors asset health, runs predictive models, generates and prioritizes work orders, optimizes maintenance windows across fleet","techniques":["predictive-maintenance","anomaly-detection","fleet-optimization","autonomous-scheduling"],"estimated_value":"30-50% reduction in unplanned outages, 25% maintenance cost reduction","readiness":"high","barriers":["Sensor coverage gaps on older assets","Model accuracy for rare failure modes"]}'))
) WHERE id = 'e-proc-011';

-- Sensor Data Collection
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Service & Operations BU',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-native","summary":"Automated data pipeline with AI-driven quality checks and adaptive sampling rates","current_state":"Fixed-interval sensor polling via RTUs and IoT gateways — data flows through OPC-UA to Lumada data lake, manual data quality checks","ai_opportunity":"AI adjusts sampling rates based on asset condition (increase frequency when degradation detected), auto-validates data quality, fills gaps with interpolation, flags sensor failures","techniques":["edge-ai","adaptive-sampling","data-quality-automation","anomaly-detection"],"estimated_value":"40% reduction in data quality issues, 60% storage optimization","readiness":"high","barriers":["Legacy RTU firmware limitations","Bandwidth constraints at remote substations"]}'))
) WHERE id = 'e-proc-012';

-- Condition Assessment
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Service & Operations BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"ML models continuously score asset health and predict remaining useful life","current_state":"Engineers periodically review dissolved gas analysis, vibration, and temperature data — manual health scoring using industry standards (IEEE C57.104)","ai_opportunity":"ML ensemble combines DGA, vibration, thermal, and electrical data into real-time health score, predicts RUL with confidence intervals, detects incipient faults months before failure","techniques":["predictive-ml","ensemble-models","remaining-useful-life","dissolved-gas-analysis"],"estimated_value":"85% failure prediction accuracy, 6-month advance warning for major failures","readiness":"high","barriers":["Model explainability for critical decisions","Limited failure data for rare transformer types"]}'))
) WHERE id = 'e-proc-013';

-- Work Order Generation
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Service & Operations BU',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"Autonomous work order creation with intelligent prioritization and resource optimization","current_state":"Maintenance planners manually create work orders based on condition reports, schedule crews using spreadsheets and EAM system","ai_opportunity":"AI agent auto-generates work orders from condition assessments, optimizes priority based on risk and business impact, matches required skills to available crews, books optimal maintenance windows","techniques":["autonomous-scheduling","resource-optimization","risk-based-prioritization","workforce-planning"],"estimated_value":"80% reduction in manual planning effort, 25% better resource utilization","readiness":"high","barriers":["Union scheduling requirements","Integration with multiple EAM systems across regions"]}'))
) WHERE id = 'e-proc-014';

-- Substation Commissioning (macro process)
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Grid Integration BU',
  '$.ai_impact', json('{"rating":"medium","approach":"hybrid","summary":"AI-assisted commissioning with digital twin validation and automated documentation","current_state":"6-12 month commissioning cycle with sequential installation, testing, and handover phases — heavy documentation requirements per IEC 62271","ai_opportunity":"Digital twin validates configuration before physical installation, AI assists test plan generation and results analysis, automated document assembly for handover package","techniques":["digital-twin","automated-testing","document-automation","configuration-validation"],"estimated_value":"25-35% faster commissioning cycle","readiness":"medium","barriers":["Physical installation still requires skilled crews","Customer-specific acceptance criteria","Regulatory inspection requirements"]}'))
) WHERE id = 'e-proc-015';

-- Equipment Installation
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Service & Operations BU',
  '$.ai_impact', json('{"rating":"low","approach":"agent-augmented","summary":"AR-guided installation with real-time quality verification","current_state":"Field engineers follow detailed work instructions for physical equipment installation — experienced crews needed for HV connections and protection wiring","ai_opportunity":"AR overlay guides less experienced installers through procedures, computer vision verifies connection correctness, real-time comparison against digital twin to catch errors before energization","techniques":["augmented-reality","computer-vision","digital-twin","guided-procedures"],"estimated_value":"15% faster installation, 30% reduction in rework","readiness":"low","barriers":["Harsh substation environment limits AR device usage","HV safety zone restrictions","Skilled trade workforce resistance"]}'))
) WHERE id = 'e-proc-016';

-- Commissioning Testing
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Grid Integration BU',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-augmented","summary":"AI automates test sequence execution and results analysis against standards","current_state":"Protection engineers manually execute test plans — relay injection testing, trip time verification, interlocking checks per IEC standards","ai_opportunity":"AI generates optimal test sequence from protection scheme, auto-analyzes results against IEC limits, compares with fleet-wide baselines, generates compliance reports","techniques":["automated-testing","standards-compliance","statistical-analysis","automated-reporting"],"estimated_value":"40% faster testing phase, automated compliance documentation","readiness":"medium","barriers":["Safety requirements for test isolation","Customer witness requirements","Protection scheme complexity varies significantly"]}'))
) WHERE id = 'e-proc-017';

-- Customer Handover
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Project Delivery',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-augmented","summary":"Automated handover package assembly with AI-powered completeness verification","current_state":"Project managers manually compile handover documentation — as-built drawings, test certificates, O&M manuals, warranty terms — often delayed by missing documents","ai_opportunity":"AI agent assembles handover package from PLM, test systems, and project data, verifies completeness against contract requirements, auto-generates training materials from technical documentation","techniques":["document-automation","completeness-verification","content-generation","knowledge-extraction"],"estimated_value":"60% faster document assembly, 90% first-time completeness","readiness":"medium","barriers":["Documents scattered across multiple systems","Customer-specific format requirements","Multilingual documentation needs"]}'))
) WHERE id = 'e-proc-018';

-- Quote-to-Order
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Sales',
  '$.ai_impact', json('{"rating":"high","approach":"agent-native","summary":"AI-driven configuration, pricing, and proposal generation for complex energy solutions","current_state":"Sales engineers spend 2-4 weeks configuring technical solutions, manually calculating costs, and assembling proposals for complex transformer and grid projects","ai_opportunity":"AI agent interprets customer requirements, auto-configures optimal solution from product catalog, generates pricing with margin optimization, produces professional proposal document","techniques":["configuration-ai","pricing-optimization","document-generation","requirement-extraction"],"estimated_value":"70% faster quote generation, 15% margin improvement","readiness":"high","barriers":["Complex product configurations need expert validation","Customer relationship nuances","Competitive pricing sensitivity"]}'))
) WHERE id = 'e-proc-019';

-- Supplier Qualification
UPDATE element SET properties = json_set(properties,
  '$.owner', 'Supply Chain',
  '$.ai_impact', json('{"rating":"medium","approach":"agent-augmented","summary":"AI-powered supplier risk assessment and automated qualification workflows","current_state":"Procurement team manually evaluates suppliers through questionnaires, site audits, financial checks, and quality certifications — 3-6 month qualification cycle","ai_opportunity":"AI agent continuously monitors supplier risk signals (financial health, ESG scores, news sentiment), auto-scores against qualification criteria, recommends approval with risk assessment","techniques":["risk-scoring","nlp-sentiment","continuous-monitoring","automated-workflow"],"estimated_value":"50% faster qualification, continuous risk monitoring vs point-in-time","readiness":"medium","barriers":["Supplier data availability varies by region","Audit requirements still need physical presence","Cultural factors in supplier relationships"]}'))
) WHERE id = 'e-proc-020';
