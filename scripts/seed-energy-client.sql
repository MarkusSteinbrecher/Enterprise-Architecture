-- ============================================================================
-- Sample Data: Energy Company Architecture (Hitachi Energy-inspired)
-- Comprehensive capabilities across all business units and locations
-- For use with: ea init --db energy_client.db && sqlite3 energy_client.db < seed-energy-client.sql
-- ============================================================================

-- ── STRATEGY LAYER — Capabilities ─────────────────────────────────────────────

-- Level 0: Enterprise
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-000', 'Capability', 'Energy Solutions & Services', 'Strategy',
 'Enterprise-level capability encompassing all business units delivering energy infrastructure solutions and lifecycle services globally',
 'manual', '{"level": 0}');

-- Level 1: Business Unit Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-001', 'Capability', 'Grid Automation', 'Strategy',
 'Delivering grid automation solutions including SCADA, EMS, DMS, and advanced distribution management systems',
 'manual', '{"level": 1, "business_unit": "Grid Automation", "hq": "Västerås, Sweden"}'),
('e-cap-002', 'Capability', 'Grid Integration', 'Strategy',
 'HVDC transmission systems, FACTS devices, power quality solutions, and grid interconnection projects',
 'manual', '{"level": 1, "business_unit": "Grid Integration", "hq": "Ludvika, Sweden"}'),
('e-cap-003', 'Capability', 'High Voltage Products', 'Strategy',
 'Manufacturing and servicing high voltage switchgear, circuit breakers, instrument transformers, and bushings',
 'manual', '{"level": 1, "business_unit": "High Voltage Products", "hq": "Ludvika, Sweden"}'),
('e-cap-004', 'Capability', 'Transformers', 'Strategy',
 'Design, manufacture, and servicing of power transformers, traction transformers, and specialty units',
 'manual', '{"level": 1, "business_unit": "Transformers", "hq": "Zürich, Switzerland"}'),
('e-cap-005', 'Capability', 'Service & Operations', 'Strategy',
 'Lifecycle services including field service, spare parts, asset management, and digital services for installed base',
 'manual', '{"level": 1, "business_unit": "Service & Operations", "hq": "Zürich, Switzerland"}');

-- Level 2: Grid Automation Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-010', 'Capability', 'SCADA & Energy Management', 'Strategy',
 'Supervisory control and data acquisition systems and energy management for transmission and distribution grids',
 'manual', '{"level": 2, "parent": "e-cap-001"}'),
('e-cap-011', 'Capability', 'Distribution Management', 'Strategy',
 'Advanced distribution management systems (ADMS) for smart grid operations including outage management and FLISR',
 'manual', '{"level": 2, "parent": "e-cap-001"}'),
('e-cap-012', 'Capability', 'Grid Monitoring & Analytics', 'Strategy',
 'Real-time monitoring of grid assets, power flows, and system health with analytics and visualization',
 'manual', '{"level": 2, "parent": "e-cap-001"}'),
('e-cap-013', 'Capability', 'Protection & Control', 'Strategy',
 'Protection relay systems, bay controllers, and station automation for substations and grid protection',
 'manual', '{"level": 2, "parent": "e-cap-001"}'),
('e-cap-014', 'Capability', 'Communication Networks', 'Strategy',
 'Mission-critical communication infrastructure for utility operations including fiber, wireless, and MPLS networks',
 'manual', '{"level": 2, "parent": "e-cap-001"}');

-- Level 2: Grid Integration Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-020', 'Capability', 'HVDC Systems', 'Strategy',
 'High voltage direct current transmission systems for long-distance power transfer and grid interconnection',
 'manual', '{"level": 2, "parent": "e-cap-002"}'),
('e-cap-021', 'Capability', 'FACTS & Power Quality', 'Strategy',
 'Flexible AC transmission systems, static VAR compensators, and power quality solutions for grid stability',
 'manual', '{"level": 2, "parent": "e-cap-002"}'),
('e-cap-022', 'Capability', 'Offshore Wind Connection', 'Strategy',
 'HVDC and HVAC solutions for connecting offshore wind farms to onshore grids',
 'manual', '{"level": 2, "parent": "e-cap-002"}'),
('e-cap-023', 'Capability', 'Grid Interconnection', 'Strategy',
 'Cross-border and inter-regional grid interconnection projects enabling power exchange between markets',
 'manual', '{"level": 2, "parent": "e-cap-002"}'),
('e-cap-024', 'Capability', 'Energy Storage Integration', 'Strategy',
 'Grid-scale battery energy storage systems and integration with renewable energy sources',
 'manual', '{"level": 2, "parent": "e-cap-002"}');

-- Level 2: High Voltage Products Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-030', 'Capability', 'Circuit Breaker Manufacturing', 'Strategy',
 'Design and production of high voltage circuit breakers (dead tank, live tank) for transmission and distribution',
 'manual', '{"level": 2, "parent": "e-cap-003"}'),
('e-cap-031', 'Capability', 'Gas-Insulated Switchgear', 'Strategy',
 'Manufacturing SF6 and eco-efficient gas-insulated switchgear (GIS) for substations and compact installations',
 'manual', '{"level": 2, "parent": "e-cap-003"}'),
('e-cap-032', 'Capability', 'Instrument Transformers', 'Strategy',
 'Production of current and voltage transformers for metering and protection applications',
 'manual', '{"level": 2, "parent": "e-cap-003"}'),
('e-cap-033', 'Capability', 'Bushings & Surge Arresters', 'Strategy',
 'Manufacturing high voltage bushings and surge arresters for transformers and switchgear',
 'manual', '{"level": 2, "parent": "e-cap-003"}'),
('e-cap-034', 'Capability', 'Generator Circuit Breakers', 'Strategy',
 'Specialized circuit breakers for power plant generator protection and synchronization',
 'manual', '{"level": 2, "parent": "e-cap-003"}');

-- Level 2: Transformer Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-040', 'Capability', 'Power Transformer Engineering', 'Strategy',
 'Custom engineering and design of power transformers to customer specifications and international standards',
 'manual', '{"level": 2, "parent": "e-cap-004"}'),
('e-cap-041', 'Capability', 'Transformer Manufacturing', 'Strategy',
 'Core assembly, winding, tank fabrication, and final assembly of power transformers in global factories',
 'manual', '{"level": 2, "parent": "e-cap-004"}'),
('e-cap-042', 'Capability', 'Traction Transformers', 'Strategy',
 'Design and manufacture of transformers for rail traction systems and electric mobility applications',
 'manual', '{"level": 2, "parent": "e-cap-004"}'),
('e-cap-043', 'Capability', 'Transformer Testing & Quality', 'Strategy',
 'Factory acceptance testing, type testing, and quality assurance per IEC/IEEE standards',
 'manual', '{"level": 2, "parent": "e-cap-004"}'),
('e-cap-044', 'Capability', 'Transformer Lifecycle Management', 'Strategy',
 'Monitoring, diagnostics, and lifecycle extension services for installed transformer fleet',
 'manual', '{"level": 2, "parent": "e-cap-004"}');

-- Level 2: Service & Operations Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-050', 'Capability', 'Field Service Operations', 'Strategy',
 'Dispatching and managing field service engineers for installation, maintenance, and repair across global sites',
 'manual', '{"level": 2, "parent": "e-cap-005"}'),
('e-cap-051', 'Capability', 'Predictive Maintenance', 'Strategy',
 'Sensor-based condition monitoring and ML-driven failure prediction for proactive maintenance scheduling',
 'manual', '{"level": 2, "parent": "e-cap-005"}'),
('e-cap-052', 'Capability', 'Asset Performance Management', 'Strategy',
 'Monitoring, analyzing, and optimizing performance and health of the installed equipment base',
 'manual', '{"level": 2, "parent": "e-cap-005"}'),
('e-cap-053', 'Capability', 'Spare Parts & Logistics', 'Strategy',
 'Global spare parts inventory management, warehousing, and distribution to support installed base',
 'manual', '{"level": 2, "parent": "e-cap-005"}'),
('e-cap-054', 'Capability', 'Digital Services', 'Strategy',
 'Cloud-based digital services including asset monitoring portals, analytics dashboards, and remote diagnostics',
 'manual', '{"level": 2, "parent": "e-cap-005"}');

-- Level 2: Cross-cutting / Corporate Capabilities
INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-cap-060', 'Capability', 'Research & Development', 'Strategy',
 'Innovation and R&D across power electronics, materials science, software, and AI/ML for energy applications',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-061', 'Capability', 'Supply Chain Management', 'Strategy',
 'Global procurement, supplier management, logistics, and supply chain optimization for raw materials and components',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-062', 'Capability', 'Sales & Customer Management', 'Strategy',
 'Global sales operations, key account management, and customer relationship management across all business units',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-063', 'Capability', 'Project Delivery', 'Strategy',
 'End-to-end project management and delivery for complex turnkey energy infrastructure projects',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-064', 'Capability', 'Health, Safety & Environment', 'Strategy',
 'HSE management across all operations including manufacturing, field service, and construction sites',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-065', 'Capability', 'Sustainability & Decarbonisation', 'Strategy',
 'Environmental sustainability programs, carbon footprint reduction, and circular economy initiatives',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-066', 'Capability', 'Cybersecurity', 'Strategy',
 'IT and OT cybersecurity including industrial control system security, network segmentation, and incident response',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-067', 'Capability', 'Regulatory & Compliance', 'Strategy',
 'Compliance with energy regulations, grid codes, trade compliance, and environmental standards globally',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-068', 'Capability', 'People & Talent Management', 'Strategy',
 'Workforce planning, talent acquisition, learning and development, and succession planning',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-069', 'Capability', 'Finance & Controlling', 'Strategy',
 'Financial planning, accounting, controlling, treasury, and investor relations',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-070', 'Capability', 'Digital & IT', 'Strategy',
 'Enterprise IT infrastructure, application portfolio management, digital transformation, and data management',
 'manual', '{"level": 2, "parent": "e-cap-000"}'),
('e-cap-071', 'Capability', 'Quality Management', 'Strategy',
 'Enterprise quality management systems, ISO certifications, continuous improvement, and lean manufacturing',
 'manual', '{"level": 2, "parent": "e-cap-000"}');

-- ── STRATEGY LAYER — Value Streams ────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-vs-001', 'ValueStream', 'Order-to-Delivery', 'Strategy',
 'End-to-end value stream from customer order through engineering, manufacturing, testing, and delivery',
 'manual', '{}'),
('e-vs-002', 'ValueStream', 'Incident-to-Resolution', 'Strategy',
 'Grid incident detection through fault analysis, crew dispatch, and full service restoration',
 'manual', '{}'),
('e-vs-003', 'ValueStream', 'Design-to-Commission', 'Strategy',
 'Solution design through installation, testing, energization, and substation/plant commissioning',
 'manual', '{}'),
('e-vs-004', 'ValueStream', 'Maintain-to-Optimize', 'Strategy',
 'Maintenance planning through execution to asset performance optimization and lifecycle extension',
 'manual', '{}'),
('e-vs-005', 'ValueStream', 'Quote-to-Cash', 'Strategy',
 'Customer inquiry and quotation through contract negotiation, delivery, invoicing, and revenue recognition',
 'manual', '{}'),
('e-vs-006', 'ValueStream', 'Innovate-to-Market', 'Strategy',
 'R&D innovation through product development, prototyping, certification, and market launch',
 'manual', '{}');

-- ── STRATEGY LAYER — Resources ────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-res-001', 'Resource', 'Digital Workforce', 'Strategy',
 'Pool of digitally skilled engineers, data scientists, and software developers driving energy transition',
 'manual', '{}'),
('e-res-002', 'Resource', 'Engineering Expertise', 'Strategy',
 'Deep domain expertise in power systems, transformer design, grid protection, and HVDC engineering',
 'manual', '{}'),
('e-res-003', 'Resource', 'Grid Data Assets', 'Strategy',
 'Decades of accumulated grid telemetry, maintenance records, and operational data from global installations',
 'manual', '{}'),
('e-res-004', 'Resource', 'Manufacturing Infrastructure', 'Strategy',
 'Global network of factories, test labs, and assembly facilities in 40+ countries',
 'manual', '{}'),
('e-res-005', 'Resource', 'Partner Network', 'Strategy',
 'Ecosystem of technology partners, system integrators, EPC contractors, and channel partners worldwide',
 'manual', '{}'),
('e-res-006', 'Resource', 'Customer Relationships', 'Strategy',
 'Long-term relationships with utilities, grid operators, industrial customers, and transport operators globally',
 'manual', '{}'),
('e-res-007', 'Resource', 'Intellectual Property', 'Strategy',
 'Patent portfolio covering power electronics, grid automation, transformer design, and digital solutions',
 'manual', '{}');

-- ── BUSINESS LAYER — Actors (Locations / Business Units) ──────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-actor-001', 'BusinessActor', 'Zürich HQ', 'Business',
 'Global headquarters in Zürich, Switzerland — corporate functions and Transformers BU leadership',
 'manual', '{"location": "Zürich, Switzerland", "type": "headquarters"}'),
('e-actor-002', 'BusinessActor', 'Västerås Operations', 'Business',
 'Major operations hub in Västerås, Sweden — Grid Automation R&D and manufacturing',
 'manual', '{"location": "Västerås, Sweden", "type": "r_and_d_manufacturing"}'),
('e-actor-003', 'BusinessActor', 'Ludvika Operations', 'Business',
 'Engineering and manufacturing center in Ludvika, Sweden — HVDC, transformers, and HV products',
 'manual', '{"location": "Ludvika, Sweden", "type": "engineering_manufacturing"}'),
('e-actor-004', 'BusinessActor', 'Raleigh Hub', 'Business',
 'Americas hub in Raleigh, NC — Grid Automation, sales, and customer support for North America',
 'manual', '{"location": "Raleigh, NC, USA", "type": "regional_hub"}'),
('e-actor-005', 'BusinessActor', 'Beijing Office', 'Business',
 'Asia-Pacific operations — manufacturing, sales, and project delivery for China and APAC region',
 'manual', '{"location": "Beijing, China", "type": "regional_hub"}'),
('e-actor-006', 'BusinessActor', 'Bad Honnef Factory', 'Business',
 'Transformer manufacturing facility in Bad Honnef, Germany',
 'manual', '{"location": "Bad Honnef, Germany", "type": "manufacturing"}'),
('e-actor-007', 'BusinessActor', 'Savli Factory', 'Business',
 'Transformer and switchgear manufacturing facility in Savli (Vadodara), India',
 'manual', '{"location": "Savli, India", "type": "manufacturing"}'),
('e-actor-008', 'BusinessActor', 'Varennes Factory', 'Business',
 'Transformer manufacturing facility in Varennes, Québec, Canada',
 'manual', '{"location": "Varennes, Canada", "type": "manufacturing"}'),
('e-actor-009', 'BusinessActor', 'Cordoba Plant', 'Business',
 'Transformer production plant in Córdoba, Spain',
 'manual', '{"location": "Córdoba, Spain", "type": "manufacturing"}'),
('e-actor-010', 'BusinessActor', 'Drammen Factory', 'Business',
 'High voltage products manufacturing facility in Drammen, Norway',
 'manual', '{"location": "Drammen, Norway", "type": "manufacturing"}');

-- ── BUSINESS LAYER — Roles ────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-role-001', 'BusinessRole', 'Grid Operator', 'Business',
 'Monitors and controls grid operations from control centers, managing real-time power flows',
 'manual', '{}'),
('e-role-002', 'BusinessRole', 'Field Service Engineer', 'Business',
 'Performs on-site installation, maintenance, and repair of grid and substation equipment',
 'manual', '{}'),
('e-role-003', 'BusinessRole', 'Asset Manager', 'Business',
 'Manages lifecycle of physical grid assets including condition assessment and replacement planning',
 'manual', '{}'),
('e-role-004', 'BusinessRole', 'Protection Engineer', 'Business',
 'Designs and configures protection relay schemes and fault isolation strategies',
 'manual', '{}'),
('e-role-005', 'BusinessRole', 'Energy Trader', 'Business',
 'Manages energy market positions and optimizes trading strategies based on grid and market data',
 'manual', '{}'),
('e-role-006', 'BusinessRole', 'Plant Manager', 'Business',
 'Oversees manufacturing operations at transformer and equipment production facilities',
 'manual', '{}'),
('e-role-007', 'BusinessRole', 'Solution Architect', 'Business',
 'Designs end-to-end technical solutions for customer grid and substation projects',
 'manual', '{}'),
('e-role-008', 'BusinessRole', 'Quality Inspector', 'Business',
 'Performs quality inspections and testing on manufactured equipment and field installations',
 'manual', '{}'),
('e-role-009', 'BusinessRole', 'Procurement Manager', 'Business',
 'Manages supplier relationships, sourcing strategies, and procurement of materials',
 'manual', '{}'),
('e-role-010', 'BusinessRole', 'Customer Success Manager', 'Business',
 'Manages ongoing customer relationships, ensures service delivery, identifies expansion opportunities',
 'manual', '{}'),
('e-role-011', 'BusinessRole', 'R&D Engineer', 'Business',
 'Develops new technologies, products, and solutions across power electronics and software domains',
 'manual', '{}'),
('e-role-012', 'BusinessRole', 'HSE Manager', 'Business',
 'Manages health, safety, and environmental programs at operational sites',
 'manual', '{}');

-- ── BUSINESS LAYER — Services ─────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-svc-001', 'BusinessService', 'Grid Monitoring Service', 'Business',
 'Real-time monitoring of grid assets, power flows, and system conditions for operators',
 'manual', '{}'),
('e-svc-002', 'BusinessService', 'Asset Lifecycle Management', 'Business',
 'Comprehensive management of asset lifecycle from commissioning through maintenance to decommissioning',
 'manual', '{}'),
('e-svc-003', 'BusinessService', 'Predictive Maintenance Service', 'Business',
 'Proactive maintenance service using AI-driven analytics to prevent unplanned equipment failures',
 'manual', '{}'),
('e-svc-004', 'BusinessService', 'Energy Management Service', 'Business',
 'Optimizing energy production, distribution, and consumption across grid networks',
 'manual', '{}'),
('e-svc-005', 'BusinessService', 'Protection Relay Configuration', 'Business',
 'Designing, configuring, and validating protection relay settings and schemes',
 'manual', '{}'),
('e-svc-006', 'BusinessService', 'Transformer Design Service', 'Business',
 'Custom engineering design service for power transformers meeting customer specifications',
 'manual', '{}'),
('e-svc-007', 'BusinessService', 'Field Service Dispatch', 'Business',
 'Coordinated dispatch of field service engineers with appropriate skills and equipment',
 'manual', '{}'),
('e-svc-008', 'BusinessService', 'Quality Assurance Service', 'Business',
 'Quality inspection and assurance service for manufactured products and field installations',
 'manual', '{}'),
('e-svc-009', 'BusinessService', 'Spare Parts Management', 'Business',
 'Sourcing, stocking, and delivering spare parts for installed equipment base',
 'manual', '{}'),
('e-svc-010', 'BusinessService', 'Remote Diagnostics', 'Business',
 'Remote analysis and troubleshooting of equipment issues using connected sensor data',
 'manual', '{}'),
('e-svc-011', 'BusinessService', 'Cybersecurity Assessment', 'Business',
 'Assessment and hardening of OT/IT cybersecurity posture for grid and substation systems',
 'manual', '{}'),
('e-svc-012', 'BusinessService', 'Training & Certification', 'Business',
 'Training programs and certification for operators, engineers, and maintenance personnel',
 'manual', '{}'),
('e-svc-013', 'BusinessService', 'Project Management Service', 'Business',
 'Turnkey project management for substation, HVDC, and grid automation projects',
 'manual', '{}'),
('e-svc-014', 'BusinessService', 'Consulting & Advisory', 'Business',
 'Energy consulting services including grid studies, feasibility assessments, and digital roadmaps',
 'manual', '{}');

-- ── BUSINESS LAYER — Processes ────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-proc-001', 'BusinessProcess', 'Transformer Order-to-Delivery', 'Business',
 'End-to-end process for fulfilling a power transformer order from design through shipping',
 'manual', '{"owner": "Transformers BU"}'),
('e-proc-002', 'BusinessProcess', 'Transformer Design', 'Business',
 'Engineering design of transformer based on customer specifications and standards',
 'manual', '{"owner": "Transformers BU"}'),
('e-proc-003', 'BusinessProcess', 'Material Procurement', 'Business',
 'Sourcing and procurement of copper, steel, insulation oil, and materials for production',
 'manual', '{"owner": "Supply Chain"}'),
('e-proc-004', 'BusinessProcess', 'Transformer Assembly', 'Business',
 'Physical assembly of transformer core, windings, tank, and auxiliary systems',
 'manual', '{"owner": "Transformers BU"}'),
('e-proc-005', 'BusinessProcess', 'Factory Acceptance Testing', 'Business',
 'Comprehensive electrical and mechanical testing of completed transformer before shipment',
 'manual', '{"owner": "Quality"}'),
('e-proc-006', 'BusinessProcess', 'Heavy Transport & Delivery', 'Business',
 'Logistics planning and execution for heavy transport of finished transformers to customer sites',
 'manual', '{"owner": "Logistics"}'),
('e-proc-007', 'BusinessProcess', 'Grid Fault Management', 'Business',
 'Detecting, analyzing, and resolving faults on the electrical grid',
 'manual', '{"owner": "Grid Automation BU"}'),
('e-proc-008', 'BusinessProcess', 'Fault Detection & Isolation', 'Business',
 'Real-time detection of grid faults using SCADA telemetry and protection relay data',
 'manual', '{"owner": "Grid Automation BU"}'),
('e-proc-009', 'BusinessProcess', 'Fault Analysis & Root Cause', 'Business',
 'Root cause analysis of grid faults using event logs, waveform data, and historical patterns',
 'manual', '{"owner": "Grid Automation BU"}'),
('e-proc-010', 'BusinessProcess', 'Service Restoration', 'Business',
 'Coordinated restoration of grid service including switching operations and crew dispatch',
 'manual', '{"owner": "Grid Automation BU"}'),
('e-proc-011', 'BusinessProcess', 'Predictive Maintenance Cycle', 'Business',
 'Continuous cycle of data collection, model-based analysis, and proactive maintenance execution',
 'manual', '{"owner": "Service & Operations BU"}'),
('e-proc-012', 'BusinessProcess', 'Sensor Data Collection', 'Business',
 'Automated collection of sensor readings from grid assets including temperature, vibration, dissolved gas',
 'manual', '{"owner": "Service & Operations BU"}'),
('e-proc-013', 'BusinessProcess', 'Condition Assessment', 'Business',
 'Running predictive models on collected sensor data to generate health scores and failure predictions',
 'manual', '{"owner": "Service & Operations BU"}'),
('e-proc-014', 'BusinessProcess', 'Work Order Generation', 'Business',
 'Automatic creation of maintenance work orders based on predictions and threshold breaches',
 'manual', '{"owner": "Service & Operations BU"}'),
('e-proc-015', 'BusinessProcess', 'Substation Commissioning', 'Business',
 'Bringing a newly constructed or upgraded substation into operational service',
 'manual', '{"owner": "Grid Integration BU"}'),
('e-proc-016', 'BusinessProcess', 'Equipment Installation', 'Business',
 'Physical installation and connection of switchgear, transformers, and protection equipment',
 'manual', '{"owner": "Service & Operations BU"}'),
('e-proc-017', 'BusinessProcess', 'Commissioning Testing', 'Business',
 'Functional and protection testing of all substation equipment before energization',
 'manual', '{"owner": "Grid Integration BU"}'),
('e-proc-018', 'BusinessProcess', 'Customer Handover', 'Business',
 'Formal handover of commissioned substation or system to customer with documentation and training',
 'manual', '{"owner": "Project Delivery"}'),
('e-proc-019', 'BusinessProcess', 'Quote-to-Order', 'Business',
 'End-to-end process from customer inquiry through technical specification, quotation, and order booking',
 'manual', '{"owner": "Sales"}'),
('e-proc-020', 'BusinessProcess', 'Supplier Qualification', 'Business',
 'Evaluating and qualifying suppliers for critical materials and components',
 'manual', '{"owner": "Supply Chain"}');

-- ── BUSINESS LAYER — Objects ──────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-obj-001', 'BusinessObject', 'Grid Asset', 'Business',
 'Any physical asset on the electrical grid including transformers, breakers, and lines',
 'manual', '{}'),
('e-obj-002', 'BusinessObject', 'Transformer', 'Business',
 'Power transformer unit as a business entity with specifications, history, and lifecycle data',
 'manual', '{}'),
('e-obj-003', 'BusinessObject', 'Substation', 'Business',
 'Electrical substation as a managed facility with equipment inventory and operational data',
 'manual', '{}'),
('e-obj-004', 'BusinessObject', 'Protection Relay', 'Business',
 'Protection relay device with configuration settings, firmware version, and test records',
 'manual', '{}'),
('e-obj-005', 'BusinessObject', 'Work Order', 'Business',
 'Maintenance or service work order with scope, assignment, scheduling, and completion data',
 'manual', '{}'),
('e-obj-006', 'BusinessObject', 'Maintenance Record', 'Business',
 'Historical record of maintenance activities performed on grid assets',
 'manual', '{}'),
('e-obj-007', 'BusinessObject', 'Energy Reading', 'Business',
 'Measured energy production or consumption data point from metering equipment',
 'manual', '{}'),
('e-obj-008', 'BusinessObject', 'Fault Report', 'Business',
 'Documented report of a grid fault including sequence of events, impact, and resolution',
 'manual', '{}'),
('e-obj-009', 'BusinessObject', 'Design Specification', 'Business',
 'Technical specification document for custom-engineered equipment or solutions',
 'manual', '{}'),
('e-obj-010', 'BusinessObject', 'Test Certificate', 'Business',
 'Certified test results for manufactured or installed equipment per IEC standards',
 'manual', '{}'),
('e-obj-011', 'BusinessObject', 'Customer Contract', 'Business',
 'Commercial agreement covering product delivery and/or service provision',
 'manual', '{}'),
('e-obj-012', 'BusinessObject', 'Spare Part', 'Business',
 'Replacement component for grid or plant equipment with stock levels and lead times',
 'manual', '{}'),
('e-obj-013', 'BusinessObject', 'Safety Incident', 'Business',
 'Documented safety incident or near-miss with investigation findings and corrective actions',
 'manual', '{}'),
('e-obj-014', 'BusinessObject', 'Customer Order', 'Business',
 'Confirmed customer order with product specifications, delivery schedule, and commercial terms',
 'manual', '{}'),
('e-obj-015', 'BusinessObject', 'Bill of Materials', 'Business',
 'Structured list of raw materials, components, and assemblies required to manufacture a product',
 'manual', '{}');

-- ── BUSINESS LAYER — Functions ────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-func-001', 'BusinessFunction', 'Demand Forecasting', 'Business',
 'Forecasting energy demand patterns to optimize grid operations and resource allocation',
 'manual', '{}'),
('e-func-002', 'BusinessFunction', 'Load Balancing', 'Business',
 'Balancing electrical load across grid segments to maintain stability and efficiency',
 'manual', '{}'),
('e-func-003', 'BusinessFunction', 'Asset Health Scoring', 'Business',
 'Scoring health condition of grid assets based on multiple data sources and degradation models',
 'manual', '{}'),
('e-func-004', 'BusinessFunction', 'Production Planning', 'Business',
 'Planning and scheduling transformer and equipment production across global factories',
 'manual', '{}'),
('e-func-005', 'BusinessFunction', 'Quality Control', 'Business',
 'Statistical quality control and inspection of manufactured equipment components',
 'manual', '{}'),
('e-func-006', 'BusinessFunction', 'Contract Management', 'Business',
 'Managing customer and supplier contracts throughout their lifecycle',
 'manual', '{}'),
('e-func-007', 'BusinessFunction', 'Regulatory Reporting', 'Business',
 'Preparing and submitting regulatory compliance reports to authorities',
 'manual', '{}'),
('e-func-008', 'BusinessFunction', 'Inventory Management', 'Business',
 'Managing inventory levels of spare parts, raw materials, and finished goods across warehouses',
 'manual', '{}');

-- ── BUSINESS LAYER — Events ───────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-evt-001', 'BusinessEvent', 'Grid Fault Detected', 'Business',
 'Triggered when SCADA or protection relays detect a fault condition on the grid',
 'manual', '{}'),
('e-evt-002', 'BusinessEvent', 'Maintenance Threshold Reached', 'Business',
 'Triggered when asset health score falls below a predefined maintenance threshold',
 'manual', '{}'),
('e-evt-003', 'BusinessEvent', 'Order Received', 'Business',
 'Triggered when a new customer order is received and validated',
 'manual', '{}'),
('e-evt-004', 'BusinessEvent', 'Factory Test Completed', 'Business',
 'Triggered when factory acceptance testing is completed for a manufactured unit',
 'manual', '{}'),
('e-evt-005', 'BusinessEvent', 'Safety Incident Reported', 'Business',
 'Triggered when a safety incident or near-miss is reported at any operational site',
 'manual', '{}');

-- ── APPLICATION LAYER ─────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-001', 'ApplicationComponent', 'Lumada APM', 'Application',
 'Lumada Asset Performance Management — predictive analytics and condition monitoring platform',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud"}'),
('e-app-002', 'ApplicationComponent', 'MicroSCADA X', 'Application',
 'Substation automation and SCADA system for monitoring and control of distribution and transmission grids',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise"}'),
('e-app-003', 'ApplicationComponent', 'Network Manager SCADA/EMS', 'Application',
 'Advanced SCADA and Energy Management System for large-scale transmission grid operations',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise"}'),
('e-app-004', 'ApplicationComponent', 'e-mesh EnergyPortfolio', 'Application',
 'Energy portfolio management and optimization platform for renewables and distributed energy resources',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud"}'),
('e-app-005', 'ApplicationComponent', 'Relion Protection Relays', 'Application',
 'Family of protection and control relays with embedded firmware for substation protection schemes',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "embedded"}'),
('e-app-006', 'ApplicationComponent', 'SAP S/4HANA', 'Application',
 'Enterprise resource planning system — finance, procurement, manufacturing, and logistics',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "mission_critical"}'),
('e-app-007', 'ApplicationComponent', 'SAP PLM', 'Application',
 'Product lifecycle management for engineering BOM, change management, and document control',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud"}'),
('e-app-008', 'ApplicationComponent', 'Salesforce CRM', 'Application',
 'Customer relationship management — sales pipeline, account management, and service cases',
 'manual', '{"vendor": "Salesforce", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high"}'),
('e-app-009', 'ApplicationComponent', 'ServiceNow ITSM', 'Application',
 'IT service management — incident, change, and problem management across IT and OT',
 'manual', '{"vendor": "ServiceNow", "lifecycle_status": "active", "hosting": "saas"}'),
('e-app-010', 'ApplicationComponent', 'Transformer Design System', 'Application',
 'Proprietary transformer engineering and design calculation software',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise"}'),
('e-app-011', 'ApplicationComponent', 'Fleet Management Portal', 'Application',
 'Customer-facing portal for monitoring installed equipment fleet, service history, and diagnostics',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud"}'),
('e-app-012', 'ApplicationComponent', 'Field Service Mobile App', 'Application',
 'Mobile application for field service engineers — work orders, checklists, and offline data capture',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "mobile"}'),
('e-app-013', 'ApplicationComponent', 'Power Quality Analyzer', 'Application',
 'Power quality monitoring and analysis platform for grid harmonics, voltage sags, and transients',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise"}'),
('e-app-014', 'ApplicationComponent', 'Cybersecurity Operations Center', 'Application',
 'OT/IT security monitoring platform with SIEM integration, threat detection, and incident response',
 'manual', '{"vendor": "Multiple", "lifecycle_status": "active", "hosting": "hybrid"}'),
('e-app-015', 'ApplicationComponent', 'Microsoft 365', 'Application',
 'Enterprise collaboration suite — Teams, SharePoint, Exchange, and OneDrive for global workforce',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "saas"}'),
('e-app-016', 'ApplicationComponent', 'MACH SCADA', 'Application',
 'Control system platform for HVDC converter stations and FACTS installations',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise"}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-asvc-001', 'ApplicationService', 'Asset Monitoring API', 'Application',
 'REST API exposing real-time and historical asset health data to internal and customer applications',
 'manual', '{}'),
('e-asvc-002', 'ApplicationService', 'Grid Telemetry API', 'Application',
 'API for accessing SCADA measurements, events, and alarms from grid operations',
 'manual', '{}'),
('e-asvc-003', 'ApplicationService', 'Work Order API', 'Application',
 'API for creating, updating, and querying maintenance work orders across systems',
 'manual', '{}'),
('e-asvc-004', 'ApplicationService', 'Customer Portal Service', 'Application',
 'Backend service for the customer-facing fleet management and service portal',
 'manual', '{}'),
('e-asvc-005', 'ApplicationService', 'Engineering Calculation Service', 'Application',
 'API for running transformer design calculations and optimization algorithms',
 'manual', '{}'),
('e-asvc-006', 'ApplicationService', 'Predictive Analytics Service', 'Application',
 'ML model serving API for asset failure prediction, remaining useful life estimation, and anomaly detection',
 'manual', '{}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-data-001', 'DataObject', 'Asset Registry', 'Application',
 'Master data store for all managed grid assets — identity, specifications, location, and ownership',
 'manual', '{}'),
('e-data-002', 'DataObject', 'Telemetry Data Lake', 'Application',
 'Time-series data store for grid measurements, sensor readings, and SCADA historian data',
 'manual', '{}'),
('e-data-003', 'DataObject', 'Maintenance History', 'Application',
 'Complete history of maintenance activities, inspections, and test results per asset',
 'manual', '{}'),
('e-data-004', 'DataObject', 'Customer Master', 'Application',
 'Customer master data — accounts, contacts, contracts, and installed base per customer',
 'manual', '{}'),
('e-data-005', 'DataObject', 'Engineering BOM', 'Application',
 'Engineering bill of materials and product structure data for manufactured equipment',
 'manual', '{}'),
('e-data-006', 'DataObject', 'ML Model Repository', 'Application',
 'Repository of trained predictive models with versioning, performance metrics, and deployment status',
 'manual', '{}');

-- ── TECHNOLOGY LAYER ──────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-node-001', 'Node', 'Azure Cloud Platform', 'Technology',
 'Microsoft Azure cloud infrastructure hosting Lumada, customer portals, and enterprise SaaS workloads',
 'manual', '{"provider": "Microsoft Azure", "regions": "West Europe, East US, Southeast Asia"}'),
('e-node-002', 'Node', 'Zürich Data Center', 'Technology',
 'On-premise data center at HQ hosting SAP, engineering systems, and corporate IT workloads',
 'manual', '{"location": "Zürich, Switzerland", "type": "on-premise"}'),
('e-node-003', 'Node', 'Västerås Control Center', 'Technology',
 'Operations technology center hosting grid automation development and testing environments',
 'manual', '{"location": "Västerås, Sweden", "type": "ot_center"}'),
('e-node-004', 'Node', 'Edge Gateway (Substation)', 'Technology',
 'Edge computing gateway deployed at customer substations for local data processing and protocol translation',
 'manual', '{"type": "edge", "deployed": "per-substation"}'),
('e-node-005', 'Node', 'IoT Platform', 'Technology',
 'Azure IoT Hub infrastructure for connecting and managing millions of grid asset sensors globally',
 'manual', '{"provider": "Microsoft Azure", "type": "iot_platform"}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-sw-001', 'SystemSoftware', 'Kubernetes (AKS)', 'Technology',
 'Azure Kubernetes Service orchestrating containerized Lumada and digital services workloads',
 'manual', '{}'),
('e-sw-002', 'SystemSoftware', 'SAP HANA', 'Technology',
 'In-memory database platform for SAP S/4HANA enterprise system',
 'manual', '{}'),
('e-sw-003', 'SystemSoftware', 'Azure Data Explorer', 'Technology',
 'Time-series analytics engine for processing grid telemetry data at scale',
 'manual', '{}'),
('e-sw-004', 'SystemSoftware', 'PostgreSQL', 'Technology',
 'Relational database for application backends, asset registries, and operational data',
 'manual', '{}'),
('e-sw-005', 'SystemSoftware', 'Apache Kafka', 'Technology',
 'Event streaming platform for real-time data pipelines between OT, IoT, and IT systems',
 'manual', '{}'),
('e-sw-006', 'SystemSoftware', 'MLflow', 'Technology',
 'ML platform for experiment tracking, model registry, and model deployment lifecycle',
 'manual', '{}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-tsvc-001', 'TechnologyService', 'Cloud Compute Service', 'Technology',
 'Scalable compute infrastructure for running enterprise and digital service workloads',
 'manual', '{}'),
('e-tsvc-002', 'TechnologyService', 'Edge Computing Service', 'Technology',
 'Local compute at substation edge gateways for real-time data processing and protocol conversion',
 'manual', '{}'),
('e-tsvc-003', 'TechnologyService', 'Data Lake Service', 'Technology',
 'Scalable storage and query service for grid telemetry, sensor data, and analytics datasets',
 'manual', '{}'),
('e-tsvc-004', 'TechnologyService', 'Identity & Access Management', 'Technology',
 'Authentication and authorization service for enterprise users, service accounts, and API access',
 'manual', '{}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-net-001', 'CommunicationNetwork', 'Corporate WAN', 'Technology',
 'Global MPLS wide-area network connecting manufacturing sites, offices, and data centers',
 'manual', '{}'),
('e-net-002', 'CommunicationNetwork', 'OT Network', 'Technology',
 'Isolated operational technology network for SCADA, protection relays, and industrial control systems',
 'manual', '{}'),
('e-net-003', 'CommunicationNetwork', 'Customer VPN', 'Technology',
 'Secure VPN tunnels connecting to customer substations and control centers for remote access',
 'manual', '{}');

-- ── MOTIVATION LAYER ──────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-stkh-001', 'Stakeholder', 'Utility Customers', 'Motivation',
 'Transmission and distribution utilities that purchase and operate grid equipment and systems',
 'manual', '{}'),
('e-stkh-002', 'Stakeholder', 'Industrial Customers', 'Motivation',
 'Large industrial facilities requiring power infrastructure, transformers, and energy management',
 'manual', '{}'),
('e-stkh-003', 'Stakeholder', 'Grid Regulators', 'Motivation',
 'National and regional energy regulators setting grid codes, safety standards, and market rules',
 'manual', '{}'),
('e-stkh-004', 'Stakeholder', 'Hitachi Group', 'Motivation',
 'Parent company providing strategic direction, investment, and cross-BU synergies',
 'manual', '{}'),
('e-stkh-005', 'Stakeholder', 'Employees & Engineers', 'Motivation',
 'Global workforce of 42,000+ across engineering, manufacturing, services, and corporate functions',
 'manual', '{}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-goal-001', 'Goal', 'Carbon Neutral by 2030', 'Motivation',
 'Achieve carbon neutrality across own operations by 2030 in alignment with Science-Based Targets',
 'manual', '{}'),
('e-goal-002', 'Goal', '100% Fossil-Free Electricity', 'Motivation',
 'Enable 100% fossil-free electricity generation globally through grid modernization and renewables integration',
 'manual', '{}'),
('e-goal-003', 'Goal', 'Digital-First Customer Engagement', 'Motivation',
 'Transform customer engagement through digital portals, remote services, and self-service capabilities',
 'manual', '{}'),
('e-goal-004', 'Goal', 'Predictive Operations at Scale', 'Motivation',
 'Deploy AI/ML-driven predictive maintenance and operations across the entire installed base',
 'manual', '{}'),
('e-goal-005', 'Goal', 'Zero Harm', 'Motivation',
 'Achieve zero injuries and safety incidents across all manufacturing and field operations',
 'manual', '{}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-drv-001', 'Driver', 'Energy Transition', 'Motivation',
 'Global shift from fossil fuels to renewable energy sources requiring grid modernization at scale',
 'manual', '{}'),
('e-drv-002', 'Driver', 'Grid Electrification', 'Motivation',
 'Increasing electrification of transport, heating, and industry driving unprecedented grid capacity demand',
 'manual', '{}'),
('e-drv-003', 'Driver', 'Aging Grid Infrastructure', 'Motivation',
 'Much of global grid infrastructure is 40-60 years old and requires replacement or major refurbishment',
 'manual', '{}'),
('e-drv-004', 'Driver', 'Cybersecurity Threats', 'Motivation',
 'Growing nation-state and criminal cyber threats targeting critical energy infrastructure',
 'manual', '{}'),
('e-drv-005', 'Driver', 'Skills Shortage', 'Motivation',
 'Global shortage of power systems engineers and skilled field service technicians',
 'manual', '{}'),
('e-drv-006', 'Driver', 'Decentralisation of Energy', 'Motivation',
 'Shift from centralized generation to distributed energy resources (solar, wind, storage, prosumers)',
 'manual', '{}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-princ-001', 'Principle', 'Safety First', 'Motivation',
 'Safety of people, equipment, and the grid is the overriding priority in all design and operational decisions',
 'manual', '{}'),
('e-princ-002', 'Principle', 'Interoperability by Default', 'Motivation',
 'All systems and products must support open standards (IEC 61850, CIM, IEC 61968/61970) for interoperability',
 'manual', '{}'),
('e-princ-003', 'Principle', 'Secure by Design', 'Motivation',
 'Cybersecurity is built into products and systems from design phase, not bolted on afterward',
 'manual', '{}'),
('e-princ-004', 'Principle', 'Data-Driven Decisions', 'Motivation',
 'Operational and strategic decisions are informed by data analytics and AI insights wherever possible',
 'manual', '{}'),
('e-princ-005', 'Principle', 'Sustainability in Design', 'Motivation',
 'Products and solutions are designed for minimal environmental impact, recyclability, and long service life',
 'manual', '{}');

-- ── PHYSICAL LAYER ────────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-fac-001', 'Facility', 'Ludvika Manufacturing Campus', 'Physical',
 'Primary transformer and HVDC manufacturing facility in Ludvika, Sweden',
 'manual', '{"location": "Ludvika, Sweden", "area_sqm": 180000}'),
('e-fac-002', 'Facility', 'Bad Honnef Transformer Factory', 'Physical',
 'Power transformer manufacturing plant in Bad Honnef, Germany',
 'manual', '{"location": "Bad Honnef, Germany", "area_sqm": 45000}'),
('e-fac-003', 'Facility', 'Savli Manufacturing Complex', 'Physical',
 'Multi-product manufacturing facility for transformers, switchgear, and relays in Savli, India',
 'manual', '{"location": "Savli (Vadodara), India", "area_sqm": 250000}'),
('e-fac-004', 'Facility', 'Varennes Transformer Plant', 'Physical',
 'Transformer manufacturing facility in Varennes, Québec, Canada',
 'manual', '{"location": "Varennes, Canada", "area_sqm": 35000}'),
('e-fac-005', 'Facility', 'Drammen HV Products Factory', 'Physical',
 'High voltage circuit breaker and switchgear manufacturing in Drammen, Norway',
 'manual', '{"location": "Drammen, Norway", "area_sqm": 28000}');

-- ── RELATIONSHIPS ─────────────────────────────────────────────────────────────

-- Capability hierarchy (Composition: parent composed-of child)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-001', 'Composition', 'Enterprise → Grid Automation', 'e-cap-000', 'e-cap-001', 'manual', '{}'),
('e-r-002', 'Composition', 'Enterprise → Grid Integration', 'e-cap-000', 'e-cap-002', 'manual', '{}'),
('e-r-003', 'Composition', 'Enterprise → HV Products', 'e-cap-000', 'e-cap-003', 'manual', '{}'),
('e-r-004', 'Composition', 'Enterprise → Transformers', 'e-cap-000', 'e-cap-004', 'manual', '{}'),
('e-r-005', 'Composition', 'Enterprise → Service & Ops', 'e-cap-000', 'e-cap-005', 'manual', '{}'),
-- Grid Automation sub-capabilities
('e-r-010', 'Composition', 'Grid Automation → SCADA/EMS', 'e-cap-001', 'e-cap-010', 'manual', '{}'),
('e-r-011', 'Composition', 'Grid Automation → DMS', 'e-cap-001', 'e-cap-011', 'manual', '{}'),
('e-r-012', 'Composition', 'Grid Automation → Monitoring', 'e-cap-001', 'e-cap-012', 'manual', '{}'),
('e-r-013', 'Composition', 'Grid Automation → Protection', 'e-cap-001', 'e-cap-013', 'manual', '{}'),
('e-r-014', 'Composition', 'Grid Automation → Comms', 'e-cap-001', 'e-cap-014', 'manual', '{}'),
-- Grid Integration sub-capabilities
('e-r-020', 'Composition', 'Grid Integration → HVDC', 'e-cap-002', 'e-cap-020', 'manual', '{}'),
('e-r-021', 'Composition', 'Grid Integration → FACTS', 'e-cap-002', 'e-cap-021', 'manual', '{}'),
('e-r-022', 'Composition', 'Grid Integration → Offshore', 'e-cap-002', 'e-cap-022', 'manual', '{}'),
('e-r-023', 'Composition', 'Grid Integration → Interconnection', 'e-cap-002', 'e-cap-023', 'manual', '{}'),
('e-r-024', 'Composition', 'Grid Integration → Storage', 'e-cap-002', 'e-cap-024', 'manual', '{}'),
-- HV Products sub-capabilities
('e-r-030', 'Composition', 'HV Products → Breakers', 'e-cap-003', 'e-cap-030', 'manual', '{}'),
('e-r-031', 'Composition', 'HV Products → GIS', 'e-cap-003', 'e-cap-031', 'manual', '{}'),
('e-r-032', 'Composition', 'HV Products → Instrument Tx', 'e-cap-003', 'e-cap-032', 'manual', '{}'),
('e-r-033', 'Composition', 'HV Products → Bushings', 'e-cap-003', 'e-cap-033', 'manual', '{}'),
('e-r-034', 'Composition', 'HV Products → Gen Breakers', 'e-cap-003', 'e-cap-034', 'manual', '{}'),
-- Transformer sub-capabilities
('e-r-040', 'Composition', 'Transformers → Engineering', 'e-cap-004', 'e-cap-040', 'manual', '{}'),
('e-r-041', 'Composition', 'Transformers → Manufacturing', 'e-cap-004', 'e-cap-041', 'manual', '{}'),
('e-r-042', 'Composition', 'Transformers → Traction', 'e-cap-004', 'e-cap-042', 'manual', '{}'),
('e-r-043', 'Composition', 'Transformers → Testing', 'e-cap-004', 'e-cap-043', 'manual', '{}'),
('e-r-044', 'Composition', 'Transformers → Lifecycle', 'e-cap-004', 'e-cap-044', 'manual', '{}'),
-- Service & Operations sub-capabilities
('e-r-050', 'Composition', 'Service → Field Ops', 'e-cap-005', 'e-cap-050', 'manual', '{}'),
('e-r-051', 'Composition', 'Service → Predictive', 'e-cap-005', 'e-cap-051', 'manual', '{}'),
('e-r-052', 'Composition', 'Service → APM', 'e-cap-005', 'e-cap-052', 'manual', '{}'),
('e-r-053', 'Composition', 'Service → Spare Parts', 'e-cap-005', 'e-cap-053', 'manual', '{}'),
('e-r-054', 'Composition', 'Service → Digital', 'e-cap-005', 'e-cap-054', 'manual', '{}'),
-- Cross-cutting capabilities
('e-r-060', 'Composition', 'Enterprise → R&D', 'e-cap-000', 'e-cap-060', 'manual', '{}'),
('e-r-061', 'Composition', 'Enterprise → Supply Chain', 'e-cap-000', 'e-cap-061', 'manual', '{}'),
('e-r-062', 'Composition', 'Enterprise → Sales', 'e-cap-000', 'e-cap-062', 'manual', '{}'),
('e-r-063', 'Composition', 'Enterprise → Project Delivery', 'e-cap-000', 'e-cap-063', 'manual', '{}'),
('e-r-064', 'Composition', 'Enterprise → HSE', 'e-cap-000', 'e-cap-064', 'manual', '{}'),
('e-r-065', 'Composition', 'Enterprise → Sustainability', 'e-cap-000', 'e-cap-065', 'manual', '{}'),
('e-r-066', 'Composition', 'Enterprise → Cybersecurity', 'e-cap-000', 'e-cap-066', 'manual', '{}'),
('e-r-067', 'Composition', 'Enterprise → Regulatory', 'e-cap-000', 'e-cap-067', 'manual', '{}'),
('e-r-068', 'Composition', 'Enterprise → People', 'e-cap-000', 'e-cap-068', 'manual', '{}'),
('e-r-069', 'Composition', 'Enterprise → Finance', 'e-cap-000', 'e-cap-069', 'manual', '{}'),
('e-r-070', 'Composition', 'Enterprise → Digital & IT', 'e-cap-000', 'e-cap-070', 'manual', '{}'),
('e-r-071', 'Composition', 'Enterprise → Quality', 'e-cap-000', 'e-cap-071', 'manual', '{}');

-- Capability → Process Realization
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-100', 'Realization', 'Transformers → Order-to-Delivery', 'e-cap-004', 'e-proc-001', 'manual', '{}'),
('e-r-101', 'Realization', 'Engineering → Design', 'e-cap-040', 'e-proc-002', 'manual', '{}'),
('e-r-102', 'Realization', 'Supply Chain → Procurement', 'e-cap-061', 'e-proc-003', 'manual', '{}'),
('e-r-103', 'Realization', 'Manufacturing → Assembly', 'e-cap-041', 'e-proc-004', 'manual', '{}'),
('e-r-104', 'Realization', 'Testing → FAT', 'e-cap-043', 'e-proc-005', 'manual', '{}'),
('e-r-105', 'Realization', 'Grid Automation → Fault Mgmt', 'e-cap-001', 'e-proc-007', 'manual', '{}'),
('e-r-106', 'Realization', 'Protection → Detection', 'e-cap-013', 'e-proc-008', 'manual', '{}'),
('e-r-107', 'Realization', 'Monitoring → Analysis', 'e-cap-012', 'e-proc-009', 'manual', '{}'),
('e-r-108', 'Realization', 'Predictive → Maintenance', 'e-cap-051', 'e-proc-011', 'manual', '{}'),
('e-r-109', 'Realization', 'Grid Integration → Commissioning', 'e-cap-002', 'e-proc-015', 'manual', '{}'),
('e-r-110', 'Realization', 'Field Service → Installation', 'e-cap-050', 'e-proc-016', 'manual', '{}'),
('e-r-111', 'Realization', 'Sales → Quote-to-Order', 'e-cap-062', 'e-proc-019', 'manual', '{}');

-- Process → Service (Serving)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-120', 'Serving', 'Design Service → Design Process', 'e-svc-006', 'e-proc-002', 'manual', '{}'),
('e-r-121', 'Serving', 'QA Service → FAT', 'e-svc-008', 'e-proc-005', 'manual', '{}'),
('e-r-122', 'Serving', 'Grid Monitoring → Fault Detection', 'e-svc-001', 'e-proc-008', 'manual', '{}'),
('e-r-123', 'Serving', 'Predictive Maint → Condition', 'e-svc-003', 'e-proc-013', 'manual', '{}'),
('e-r-124', 'Serving', 'Field Dispatch → Installation', 'e-svc-007', 'e-proc-016', 'manual', '{}'),
('e-r-125', 'Serving', 'Spare Parts → Work Orders', 'e-svc-009', 'e-proc-014', 'manual', '{}');

-- Application → Business Service (Realization)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-200', 'Realization', 'Lumada APM → Predictive Service', 'e-app-001', 'e-svc-003', 'manual', '{}'),
('e-r-201', 'Realization', 'MicroSCADA → Grid Monitoring', 'e-app-002', 'e-svc-001', 'manual', '{}'),
('e-r-202', 'Realization', 'Network Manager → Grid Monitoring', 'e-app-003', 'e-svc-001', 'manual', '{}'),
('e-r-203', 'Realization', 'e-mesh → Energy Mgmt Service', 'e-app-004', 'e-svc-004', 'manual', '{}'),
('e-r-204', 'Realization', 'Relion → Protection Config', 'e-app-005', 'e-svc-005', 'manual', '{}'),
('e-r-205', 'Realization', 'Transformer Design → Design Svc', 'e-app-010', 'e-svc-006', 'manual', '{}'),
('e-r-206', 'Realization', 'Fleet Portal → Remote Diagnostics', 'e-app-011', 'e-svc-010', 'manual', '{}'),
('e-r-207', 'Realization', 'Field App → Field Dispatch', 'e-app-012', 'e-svc-007', 'manual', '{}'),
('e-r-208', 'Realization', 'CyberSOC → Cybersecurity', 'e-app-014', 'e-svc-011', 'manual', '{}');

-- Application → Data (Access)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-250', 'Access', 'Lumada APM → Telemetry', 'e-app-001', 'e-data-002', 'manual', '{}'),
('e-r-251', 'Access', 'Lumada APM → Asset Registry', 'e-app-001', 'e-data-001', 'manual', '{}'),
('e-r-252', 'Access', 'Lumada APM → ML Models', 'e-app-001', 'e-data-006', 'manual', '{}'),
('e-r-253', 'Access', 'MicroSCADA → Telemetry', 'e-app-002', 'e-data-002', 'manual', '{}'),
('e-r-254', 'Access', 'SAP → Customer Master', 'e-app-006', 'e-data-004', 'manual', '{}'),
('e-r-255', 'Access', 'SAP PLM → Engineering BOM', 'e-app-007', 'e-data-005', 'manual', '{}'),
('e-r-256', 'Access', 'Salesforce → Customer Master', 'e-app-008', 'e-data-004', 'manual', '{}'),
('e-r-257', 'Access', 'Fleet Portal → Asset Registry', 'e-app-011', 'e-data-001', 'manual', '{}'),
('e-r-258', 'Access', 'Field App → Maintenance History', 'e-app-012', 'e-data-003', 'manual', '{}');

-- Technology → Application (Serving)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-300', 'Serving', 'Azure → Lumada APM', 'e-node-001', 'e-app-001', 'manual', '{}'),
('e-r-301', 'Serving', 'Azure → e-mesh', 'e-node-001', 'e-app-004', 'manual', '{}'),
('e-r-302', 'Serving', 'Azure → Fleet Portal', 'e-node-001', 'e-app-011', 'manual', '{}'),
('e-r-303', 'Serving', 'Zürich DC → SAP', 'e-node-002', 'e-app-006', 'manual', '{}'),
('e-r-304', 'Serving', 'Zürich DC → SAP PLM', 'e-node-002', 'e-app-007', 'manual', '{}'),
('e-r-305', 'Serving', 'Västerås → MicroSCADA dev', 'e-node-003', 'e-app-002', 'manual', '{}'),
('e-r-306', 'Serving', 'Edge → Relion Relays', 'e-node-004', 'e-app-005', 'manual', '{}'),
('e-r-307', 'Serving', 'IoT → Lumada APM', 'e-node-005', 'e-app-001', 'manual', '{}');

-- Physical → Technology (Assignment)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-400', 'Assignment', 'Ludvika → Västerås OT', 'e-fac-001', 'e-node-003', 'manual', '{}'),
('e-r-401', 'Assignment', 'Savli → Edge Gateways', 'e-fac-003', 'e-node-004', 'manual', '{}');

-- Motivation → Strategy (Influence)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-500', 'Influence', 'Energy Transition → HVDC', 'e-drv-001', 'e-cap-020', 'manual', '{"modifier": "++"}'),
('e-r-501', 'Influence', 'Energy Transition → Offshore Wind', 'e-drv-001', 'e-cap-022', 'manual', '{"modifier": "++"}'),
('e-r-502', 'Influence', 'Energy Transition → Storage', 'e-drv-001', 'e-cap-024', 'manual', '{"modifier": "++"}'),
('e-r-503', 'Influence', 'Aging Grid → Service & Ops', 'e-drv-003', 'e-cap-005', 'manual', '{"modifier": "++"}'),
('e-r-504', 'Influence', 'Aging Grid → Predictive', 'e-drv-003', 'e-cap-051', 'manual', '{"modifier": "+"}'),
('e-r-505', 'Influence', 'Cyber Threats → Cybersecurity', 'e-drv-004', 'e-cap-066', 'manual', '{"modifier": "++"}'),
('e-r-506', 'Influence', 'Skills Shortage → Digital', 'e-drv-005', 'e-cap-054', 'manual', '{"modifier": "+"}'),
('e-r-507', 'Influence', 'Decentralisation → DMS', 'e-drv-006', 'e-cap-011', 'manual', '{"modifier": "++"}'),
('e-r-508', 'Influence', 'Grid Electrification → Grid Automation', 'e-drv-002', 'e-cap-001', 'manual', '{"modifier": "++"}');

-- Goal → Capability (Realization)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-520', 'Realization', 'Sustainability → Carbon Neutral', 'e-cap-065', 'e-goal-001', 'manual', '{}'),
('e-r-521', 'Realization', 'HVDC → Fossil-Free', 'e-cap-020', 'e-goal-002', 'manual', '{}'),
('e-r-522', 'Realization', 'Digital Services → Digital-First', 'e-cap-054', 'e-goal-003', 'manual', '{}'),
('e-r-523', 'Realization', 'Predictive → Predictive at Scale', 'e-cap-051', 'e-goal-004', 'manual', '{}'),
('e-r-524', 'Realization', 'HSE → Zero Harm', 'e-cap-064', 'e-goal-005', 'manual', '{}');

-- Value Stream → Process (Realization)
INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-600', 'Realization', 'Order-to-Delivery → Transformer O2D', 'e-vs-001', 'e-proc-001', 'manual', '{}'),
('e-r-601', 'Realization', 'Incident-to-Resolution → Fault Mgmt', 'e-vs-002', 'e-proc-007', 'manual', '{}'),
('e-r-602', 'Realization', 'Design-to-Commission → Commissioning', 'e-vs-003', 'e-proc-015', 'manual', '{}'),
('e-r-603', 'Realization', 'Maintain-to-Optimize → Predictive', 'e-vs-004', 'e-proc-011', 'manual', '{}'),
('e-r-604', 'Realization', 'Quote-to-Cash → Quote-to-Order', 'e-vs-005', 'e-proc-019', 'manual', '{}');
