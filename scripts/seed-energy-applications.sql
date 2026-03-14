-- ============================================================================
-- Energy Client: Expanded Application Landscape
-- Realistic enterprise application portfolio for a global energy manufacturer
-- Includes regional instances, redundant systems, and shadow IT
-- ============================================================================

-- ── ENTERPRISE BACKBONE — Regional ERP Instances ──────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
-- SAP regional instances (common in post-merger companies — ABB legacy + Hitachi unification)
('e-app-020', 'ApplicationComponent', 'SAP S/4HANA (Europe)', 'Application',
 'Primary ERP instance for European operations — finance, procurement, manufacturing, logistics. Migrated from legacy ABB ECC.',
 'manual', '{"vendor": "SAP", "version": "2023", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "mission_critical", "region": "Europe", "users_approx": 8000}'),
('e-app-021', 'ApplicationComponent', 'SAP S/4HANA (Americas)', 'Application',
 'Americas ERP instance — separate chart of accounts, US GAAP compliance, NAFTA trade management.',
 'manual', '{"vendor": "SAP", "version": "2023", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "mission_critical", "region": "Americas", "users_approx": 4000}'),
('e-app-022', 'ApplicationComponent', 'SAP S/4HANA (APAC)', 'Application',
 'Asia-Pacific ERP instance — multi-currency, local tax compliance (GST India, VAT China), regional procurement.',
 'manual', '{"vendor": "SAP", "version": "2023", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "mission_critical", "region": "Asia Pacific", "users_approx": 5000}'),
('e-app-023', 'ApplicationComponent', 'SAP ECC 6.0 (India Legacy)', 'Application',
 'Legacy ERP still in use at Savli and Maneja factories — scheduled for S/4HANA migration Q3 2026.',
 'manual', '{"vendor": "SAP", "version": "ECC 6.0 EHP8", "lifecycle_status": "phase_out", "hosting": "on-premise", "business_criticality": "high", "region": "India", "users_approx": 1200, "migration_target": "e-app-022"}');

-- ── CRM & SALES — Multiple systems across regions ─────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-030', 'ApplicationComponent', 'Salesforce Sales Cloud', 'Application',
 'Global CRM for sales pipeline management, opportunity tracking, and account management across all BUs.',
 'manual', '{"vendor": "Salesforce", "version": "Spring 26", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 3500}'),
('e-app-031', 'ApplicationComponent', 'Salesforce Service Cloud', 'Application',
 'Customer service and case management — warranty claims, service requests, and escalation tracking.',
 'manual', '{"vendor": "Salesforce", "version": "Spring 26", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 2000}'),
('e-app-032', 'ApplicationComponent', 'Salesforce CPQ', 'Application',
 'Configure-Price-Quote for complex transformer and switchgear product configurations and proposal generation.',
 'manual', '{"vendor": "Salesforce", "version": "Spring 26", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}'),
('e-app-033', 'ApplicationComponent', 'Microsoft Dynamics 365 (China)', 'Application',
 'Separate CRM for China operations due to data sovereignty requirements — sales, service, and local compliance.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "azure_china", "business_criticality": "high", "region": "China", "users_approx": 800}'),
('e-app-034', 'ApplicationComponent', 'Legacy CRM (Brazil)', 'Application',
 'TOTVS Protheus-based CRM and ERP module used by Brazil sales team — partial Salesforce integration.',
 'manual', '{"vendor": "TOTVS", "lifecycle_status": "tolerate", "hosting": "on-premise", "business_criticality": "medium", "region": "Brazil", "users_approx": 200}');

-- ── MANUFACTURING EXECUTION SYSTEMS — Per factory ─────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-040', 'ApplicationComponent', 'MES — Ludvika Transformers', 'Application',
 'ABB Ability MOM manufacturing execution system at Ludvika transformer factory — production scheduling, WIP tracking, quality.',
 'manual', '{"vendor": "ABB/Hitachi", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-ludvika"}'),
('e-app-041', 'ApplicationComponent', 'MES — Bad Honnef', 'Application',
 'Manufacturing execution system at Bad Honnef transformer plant — production orders, shop floor control, test data.',
 'manual', '{"vendor": "Siemens Opcenter", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-badhonnef"}'),
('e-app-042', 'ApplicationComponent', 'MES — Savli', 'Application',
 'Manufacturing execution for multi-product Savli complex — transformers, switchgear, relays. Custom-built on .NET.',
 'manual', '{"vendor": "In-house", "lifecycle_status": "tolerate", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-savli"}'),
('e-app-043', 'ApplicationComponent', 'MES — Varennes', 'Application',
 'AVEVA MES at Varennes transformer plant — production tracking, quality checkpoints, genealogy.',
 'manual', '{"vendor": "AVEVA", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-varennes"}'),
('e-app-044', 'ApplicationComponent', 'MES — Drammen', 'Application',
 'Manufacturing execution for HV circuit breaker and switchgear production at Drammen factory.',
 'manual', '{"vendor": "ABB/Hitachi", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-drammen"}'),
('e-app-045', 'ApplicationComponent', 'MES — South Boston', 'Application',
 'New MES deployment for expanded South Boston transformer factory — SAP Manufacturing Integration.',
 'manual', '{"vendor": "SAP ME", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-southboston"}'),
('e-app-046', 'ApplicationComponent', 'MES — Chongqing', 'Application',
 'Manufacturing execution at Chongqing transformer factory — adapted for local compliance and reporting.',
 'manual', '{"vendor": "Siemens Opcenter", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "location": "e-loc-chongqing"}');

-- ── PLM & ENGINEERING ─────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-050', 'ApplicationComponent', 'SAP PLM (Global)', 'Application',
 'Global product lifecycle management — engineering change management, BOM, document control across all BUs.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high", "users_approx": 3000}'),
('e-app-051', 'ApplicationComponent', 'Teamcenter PLM (Transformers)', 'Application',
 'Siemens Teamcenter used by Transformer BU for 3D CAD data management, simulation data, and design review workflows.',
 'manual', '{"vendor": "Siemens", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "users_approx": 800}'),
('e-app-052', 'ApplicationComponent', 'Transformer Design System (TDS)', 'Application',
 'Proprietary transformer engineering calculation and optimization software — core IP, developed in-house over 30+ years.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "mission_critical", "users_approx": 400}'),
('e-app-053', 'ApplicationComponent', 'AutoCAD / Inventor', 'Application',
 'Autodesk suite used for 2D/3D mechanical design — transformer tank design, bushing layouts, factory floor planning.',
 'manual', '{"vendor": "Autodesk", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 600}'),
('e-app-054', 'ApplicationComponent', 'ETAP Power Systems', 'Application',
 'Power system analysis software — short-circuit studies, protection coordination, load flow for substation design.',
 'manual', '{"vendor": "ETAP", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "users_approx": 300}'),
('e-app-055', 'ApplicationComponent', 'PCM600', 'Application',
 'Protection and Control IED Manager — configuration, parameterization, and signal management for Relion relays and RTU500.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "users_approx": 500}'),
('e-app-056', 'ApplicationComponent', 'MATLAB/Simulink', 'Application',
 'Numerical computing environment for HVDC control system simulation, power electronics modelling, and ML prototyping.',
 'manual', '{"vendor": "MathWorks", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "medium", "users_approx": 250}'),
('e-app-057', 'ApplicationComponent', 'IdentiQ Digital Twin', 'Application',
 'Digital twin platform for HVDC and power quality installations — real-time simulation, predictive scenarios, operator training.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}');

-- ── GRID AUTOMATION & OT SOFTWARE ─────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-060', 'ApplicationComponent', 'Network Manager ADMS', 'Application',
 'Advanced Distribution Management System — outage management, FLISR, DER management for distribution operators.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "mission_critical"}'),
('e-app-061', 'ApplicationComponent', 'Network Manager GMS', 'Application',
 'Generation Management System — automatic generation control, economic dispatch, reserve management.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high"}'),
('e-app-062', 'ApplicationComponent', 'RTU500 Firmware', 'Application',
 'Remote Terminal Unit firmware deployed on RTU500 series — substation data acquisition, control, and IEC 61850/DNP3 protocol.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "embedded", "business_criticality": "mission_critical"}'),
('e-app-063', 'ApplicationComponent', 'FOXMAN-UN', 'Application',
 'Network management system for FOX615 utility communication platform — teleprotection, MPLS network supervision.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high"}'),
('e-app-064', 'ApplicationComponent', 'e-mesh SCADA', 'Application',
 'Edge SCADA for distributed energy resources — solar, wind, battery storage, and microgrid management.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}'),
('e-app-065', 'ApplicationComponent', 'Relion 670 Series Firmware', 'Application',
 'Protection relay firmware for transmission protection — line distance, busbar, transformer, and generator protection.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "embedded", "business_criticality": "mission_critical"}'),
('e-app-066', 'ApplicationComponent', 'Relion 650 Series Firmware', 'Application',
 'Protection relay firmware for distribution protection — feeder, motor, capacitor bank, and overcurrent protection.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "embedded", "business_criticality": "high"}'),
('e-app-067', 'ApplicationComponent', 'Lumada EAM', 'Application',
 'Lumada Enterprise Asset Management — work management, scheduling, inventory, and maintenance planning for utilities.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-068', 'ApplicationComponent', 'Lumada FSM', 'Application',
 'Lumada Field Service Management — crew scheduling, mobile work orders, route optimization, and offline capability.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}');

-- ── FIELD SERVICE & OPERATIONS ────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-070', 'ApplicationComponent', 'Field Service Mobile (iOS/Android)', 'Application',
 'Mobile app for field engineers — work orders, checklists, photo capture, offline mode, and GPS tracking.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "mobile", "business_criticality": "high", "users_approx": 4000}'),
('e-app-071', 'ApplicationComponent', 'SAP PM (Plant Maintenance)', 'Application',
 'Plant maintenance module within SAP — maintenance orders, equipment master, functional locations for internal assets.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-072', 'ApplicationComponent', 'Maximo APM (Legacy)', 'Application',
 'IBM Maximo asset performance management inherited from ABB — still used at 3 European factories for internal maintenance.',
 'manual', '{"vendor": "IBM", "lifecycle_status": "phase_out", "hosting": "on-premise", "business_criticality": "medium", "migration_target": "e-app-071", "locations": ["e-loc-ludvika", "e-loc-badhonnef", "e-loc-drammen"]}'),
('e-app-073', 'ApplicationComponent', 'Lumada Inspection Insights', 'Application',
 'AI-powered visual inspection platform — image-based defect detection for transformers, switchgear, and field assets.',
 'manual', '{"vendor": "Hitachi Energy", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}');

-- ── HR & PEOPLE ───────────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-080', 'ApplicationComponent', 'SAP SuccessFactors', 'Application',
 'Global HCM platform — employee central, recruitment, learning, performance, and succession planning for 45K employees.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 45000}'),
('e-app-081', 'ApplicationComponent', 'Workday (Payroll Americas)', 'Application',
 'Payroll processing for US, Canada, Mexico, and Brazil — separate from SuccessFactors due to ABB migration complexity.',
 'manual', '{"vendor": "Workday", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "region": "Americas"}'),
('e-app-082', 'ApplicationComponent', 'SAP Payroll (Europe/APAC)', 'Application',
 'Payroll processing for European and APAC countries — integrated with SuccessFactors Employee Central.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high", "region": "Europe/APAC"}'),
('e-app-083', 'ApplicationComponent', 'Cornerstone OnDemand', 'Application',
 'Learning management system — safety training, product certification, compliance courses, and technical skill development.',
 'manual', '{"vendor": "Cornerstone", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium", "users_approx": 42000}');

-- ── FINANCE & PROCUREMENT ─────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-090', 'ApplicationComponent', 'SAP Ariba', 'Application',
 'Procurement platform — sourcing, supplier management, contract lifecycle, and P2P for strategic and indirect spend.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high"}'),
('e-app-091', 'ApplicationComponent', 'SAP Concur', 'Application',
 'Travel and expense management for global workforce — booking, expense reports, and compliance monitoring.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium", "users_approx": 35000}'),
('e-app-092', 'ApplicationComponent', 'SAP BPC (Consolidation)', 'Application',
 'Business Planning & Consolidation — financial planning, group consolidation, statutory and management reporting.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "mission_critical"}'),
('e-app-093', 'ApplicationComponent', 'Coupa (Indirect Procurement)', 'Application',
 'Business spend management for indirect categories — office supplies, IT equipment, MRO at non-SAP locations.',
 'manual', '{"vendor": "Coupa", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}'),
('e-app-094', 'ApplicationComponent', 'SAP TM (Transportation Management)', 'Application',
 'Transportation management — heavy transport planning for transformers, freight management, carrier collaboration.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}');

-- ── QUALITY MANAGEMENT ────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-100', 'ApplicationComponent', 'SAP QM (Quality Management)', 'Application',
 'Quality management integrated with production — inspection plans, quality notifications, certificates, and SPC.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-101', 'ApplicationComponent', 'Siemens Polarion (Test Management)', 'Application',
 'Requirements and test management for protection relay and SCADA software — V-model traceability and IEC 61850 conformance.',
 'manual', '{"vendor": "Siemens", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high"}'),
('e-app-102', 'ApplicationComponent', 'ETQ Reliance (CAPA)', 'Application',
 'Corrective and preventive action management — non-conformance tracking, root cause analysis, 8D reports across factories.',
 'manual', '{"vendor": "Hexagon", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}');

-- ── SUPPLY CHAIN & LOGISTICS ──────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-110', 'ApplicationComponent', 'SAP IBP (Integrated Business Planning)', 'Application',
 'Demand planning, supply planning, and S&OP for transformers and HV products across global manufacturing network.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high"}'),
('e-app-111', 'ApplicationComponent', 'SAP EWM (Extended Warehouse)', 'Application',
 'Warehouse management for spare parts distribution centers in Zürich, Raleigh, and Singapore.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-112', 'ApplicationComponent', 'Oracle WMS (India Warehouse)', 'Application',
 'Warehouse management at Savli spare parts depot — legacy Oracle system, partial SAP EWM integration.',
 'manual', '{"vendor": "Oracle", "lifecycle_status": "tolerate", "hosting": "on-premise", "business_criticality": "medium", "region": "India", "migration_target": "e-app-111"}');

-- ── IT SERVICE MANAGEMENT & MONITORING ────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-120', 'ApplicationComponent', 'ServiceNow ITSM', 'Application',
 'Global IT service management — incident, problem, change, and request management across IT and OT.',
 'manual', '{"vendor": "ServiceNow", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 45000}'),
('e-app-121', 'ApplicationComponent', 'ServiceNow ITOM', 'Application',
 'IT operations management — CMDB, discovery, cloud management, event management for 5000+ CI items.',
 'manual', '{"vendor": "ServiceNow", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high"}'),
('e-app-122', 'ApplicationComponent', 'ServiceNow HRSD', 'Application',
 'HR Service Delivery — employee onboarding/offboarding, HR case management, knowledge base for 45K employees.',
 'manual', '{"vendor": "ServiceNow", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}'),
('e-app-123', 'ApplicationComponent', 'Splunk Enterprise', 'Application',
 'Log management and security analytics — aggregating logs from IT, OT, cloud, and edge across global infrastructure.',
 'manual', '{"vendor": "Splunk/Cisco", "lifecycle_status": "active", "hosting": "hybrid", "business_criticality": "high"}'),
('e-app-124', 'ApplicationComponent', 'Datadog', 'Application',
 'Cloud-native monitoring for Lumada platform, customer portals, and Azure-hosted digital services.',
 'manual', '{"vendor": "Datadog", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high"}'),
('e-app-125', 'ApplicationComponent', 'PagerDuty', 'Application',
 'Incident response and on-call management for digital services, cloud infrastructure, and customer-facing platforms.',
 'manual', '{"vendor": "PagerDuty", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}');

-- ── CYBERSECURITY ─────────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-130', 'ApplicationComponent', 'Microsoft Sentinel (SIEM)', 'Application',
 'Cloud-native SIEM for IT security monitoring — threat detection, investigation, and automated response across Azure and M365.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-131', 'ApplicationComponent', 'Claroty (OT Security)', 'Application',
 'OT network security monitoring — asset discovery, vulnerability management, and threat detection for industrial control systems.',
 'manual', '{"vendor": "Claroty", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high"}'),
('e-app-132', 'ApplicationComponent', 'CrowdStrike Falcon', 'Application',
 'Endpoint detection and response (EDR) — deployed on all corporate endpoints and engineering workstations.',
 'manual', '{"vendor": "CrowdStrike", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "endpoints": 50000}'),
('e-app-133', 'ApplicationComponent', 'CyberArk PAM', 'Application',
 'Privileged access management — vault for admin credentials, OT system passwords, and service accounts.',
 'manual', '{"vendor": "CyberArk", "lifecycle_status": "active", "hosting": "hybrid", "business_criticality": "high"}');

-- ── COLLABORATION & PRODUCTIVITY ──────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-140', 'ApplicationComponent', 'Microsoft Teams', 'Application',
 'Enterprise collaboration — chat, video calls, channels, and meeting platform for 45K global workforce.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 45000}'),
('e-app-141', 'ApplicationComponent', 'SharePoint Online', 'Application',
 'Document management, intranet portals, and team sites — engineering documents, project wikis, and department pages.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high"}'),
('e-app-142', 'ApplicationComponent', 'Confluence (Engineering Wiki)', 'Application',
 'Technical knowledge base for Grid Automation and HVDC R&D teams — design standards, how-to guides, and architecture docs.',
 'manual', '{"vendor": "Atlassian", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium", "users_approx": 3000}'),
('e-app-143', 'ApplicationComponent', 'Jira (R&D)', 'Application',
 'Software development project management for Grid Automation, Lumada, and digital services teams — agile boards, sprints, releases.',
 'manual', '{"vendor": "Atlassian", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high", "users_approx": 2500}'),
('e-app-144', 'ApplicationComponent', 'Azure DevOps', 'Application',
 'CI/CD pipelines, source code repositories, and work items for Lumada platform, customer portals, and IoT services.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-145', 'ApplicationComponent', 'GitHub Enterprise', 'Application',
 'Source code management for open-source contributions, MicroSCADA integrations, and community-facing SDKs.',
 'manual', '{"vendor": "GitHub/Microsoft", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}');

-- ── PROJECT MANAGEMENT ────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-150', 'ApplicationComponent', 'SAP PS (Project System)', 'Application',
 'Project accounting and cost management for large infrastructure projects — WBS, milestones, revenue recognition.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-151', 'ApplicationComponent', 'Primavera P6', 'Application',
 'Enterprise project scheduling for large HVDC and substation projects — critical path, resource levelling, multi-project.',
 'manual', '{"vendor": "Oracle", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high", "users_approx": 500}'),
('e-app-152', 'ApplicationComponent', 'Microsoft Project Online', 'Application',
 'Portfolio and project management for mid-size projects and internal initiatives — lighter alternative to Primavera.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium", "users_approx": 2000}');

-- ── BI & ANALYTICS ────────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-160', 'ApplicationComponent', 'Power BI', 'Application',
 'Enterprise BI platform — financial dashboards, sales analytics, manufacturing KPIs, and executive reporting.',
 'manual', '{"vendor": "Microsoft", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 5000}'),
('e-app-161', 'ApplicationComponent', 'SAP Analytics Cloud', 'Application',
 'Planning and analytics on top of S/4HANA data — budget planning, forecast, and integrated financial analysis.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}'),
('e-app-162', 'ApplicationComponent', 'Databricks (Data Platform)', 'Application',
 'Lakehouse platform for data engineering and data science — processing grid telemetry, training ML models, feature engineering.',
 'manual', '{"vendor": "Databricks", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('e-app-163', 'ApplicationComponent', 'Grafana (OT Monitoring)', 'Application',
 'Real-time operational dashboards for factory OT systems, SCADA test environments, and R&D lab monitoring.',
 'manual', '{"vendor": "Grafana Labs", "lifecycle_status": "active", "hosting": "hybrid", "business_criticality": "medium"}');

-- ── HSE & COMPLIANCE ──────────────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-app-170', 'ApplicationComponent', 'Enablon HSE', 'Application',
 'Health, safety, and environment management — incident reporting, risk assessments, audits, and permit-to-work across all sites.',
 'manual', '{"vendor": "Wolters Kluwer", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "high", "users_approx": 15000}'),
('e-app-171', 'ApplicationComponent', 'SAP EHS (Environment & Health)', 'Application',
 'Dangerous goods management, chemical compliance, and environmental reporting — integrated with SAP logistics.',
 'manual', '{"vendor": "SAP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}'),
('e-app-172', 'ApplicationComponent', 'GRC Platform (OneTrust)', 'Application',
 'Governance, risk, and compliance — privacy management (GDPR), third-party risk, ESG reporting, and policy management.',
 'manual', '{"vendor": "OneTrust", "lifecycle_status": "active", "hosting": "saas", "business_criticality": "medium"}');

-- ── ADDITIONAL DATA OBJECTS ───────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-data-010', 'DataObject', 'Supplier Master', 'Application',
 'Global supplier master — vendor qualifications, spend data, contracts, and performance scorecards.',
 'manual', '{}'),
('e-data-011', 'DataObject', 'Employee Master', 'Application',
 'HR master data — personal, organizational, compensation, and skill/certification records for 45K employees.',
 'manual', '{}'),
('e-data-012', 'DataObject', 'Project Data Warehouse', 'Application',
 'Consolidated project financials, milestones, and resource data across Primavera, SAP PS, and MS Project.',
 'manual', '{}'),
('e-data-013', 'DataObject', 'Product Configuration Rules', 'Application',
 'Transformer and switchgear configuration rules, constraint models, and pricing matrices for CPQ.',
 'manual', '{}'),
('e-data-014', 'DataObject', 'OT Security Asset Inventory', 'Application',
 'Inventory of all OT assets — PLCs, RTUs, relays, HMIs — with firmware versions, vulnerabilities, and network segments.',
 'manual', '{}'),
('e-data-015', 'DataObject', 'HSE Incident Database', 'Application',
 'All safety incidents, near-misses, environmental events, and audit findings across global operations.',
 'manual', '{}'),
('e-data-016', 'DataObject', 'Quality Records Store', 'Application',
 'Test certificates, inspection reports, non-conformance records, and CAPA documentation per IEC/ISO requirements.',
 'manual', '{}');

-- ── ADDITIONAL APPLICATION SERVICES ───────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('e-asvc-010', 'ApplicationService', 'Identity & SSO Service', 'Application',
 'Azure AD-based single sign-on and identity federation for all enterprise SaaS and on-premise applications.',
 'manual', '{}'),
('e-asvc-011', 'ApplicationService', 'Master Data Integration Service', 'Application',
 'Enterprise integration bus synchronizing customer, supplier, material, and employee master data across SAP, Salesforce, and ServiceNow.',
 'manual', '{}'),
('e-asvc-012', 'ApplicationService', 'OT Data Gateway Service', 'Application',
 'Protocol translation and data ingestion service bridging IEC 61850/DNP3/Modbus from substations to the Azure IoT platform.',
 'manual', '{}'),
('e-asvc-013', 'ApplicationService', 'Document Management Service', 'Application',
 'Centralized document and drawing management — cross-referencing SAP PLM, Teamcenter, and SharePoint repositories.',
 'manual', '{}');

-- ── RELATIONSHIPS — New applications → Locations (Association) ────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
-- Regional ERP → Region
('e-r-app-001', 'Association', 'SAP Europe at Europe',       'e-loc-eu',    'e-app-020', 'manual', '{}'),
('e-r-app-002', 'Association', 'SAP Americas at N. America', 'e-loc-na',    'e-app-021', 'manual', '{}'),
('e-r-app-003', 'Association', 'SAP APAC at APAC',           'e-loc-apac',  'e-app-022', 'manual', '{}'),
('e-r-app-004', 'Association', 'SAP ECC Legacy at India',    'e-loc-in',    'e-app-023', 'manual', '{}'),
-- CRM regional
('e-r-app-005', 'Association', 'Dynamics CRM at China',      'e-loc-cn',    'e-app-033', 'manual', '{}'),
('e-r-app-006', 'Association', 'Legacy CRM at Brazil',       'e-loc-br',    'e-app-034', 'manual', '{}'),
-- MES → Sites
('e-r-app-010', 'Association', 'MES Ludvika at Ludvika',          'e-loc-ludvika',     'e-app-040', 'manual', '{}'),
('e-r-app-011', 'Association', 'MES Bad Honnef at Bad Honnef',    'e-loc-badhonnef',   'e-app-041', 'manual', '{}'),
('e-r-app-012', 'Association', 'MES Savli at Savli',              'e-loc-savli',       'e-app-042', 'manual', '{}'),
('e-r-app-013', 'Association', 'MES Varennes at Varennes',        'e-loc-varennes',    'e-app-043', 'manual', '{}'),
('e-r-app-014', 'Association', 'MES Drammen at Drammen',          'e-loc-drammen',     'e-app-044', 'manual', '{}'),
('e-r-app-015', 'Association', 'MES South Boston at South Boston', 'e-loc-southboston', 'e-app-045', 'manual', '{}'),
('e-r-app-016', 'Association', 'MES Chongqing at Chongqing',      'e-loc-chongqing',   'e-app-046', 'manual', '{}'),
-- Payroll regional
('e-r-app-020', 'Association', 'Workday Payroll at Americas',     'e-loc-na',    'e-app-081', 'manual', '{}'),
('e-r-app-021', 'Association', 'Oracle WMS at India',             'e-loc-in',    'e-app-112', 'manual', '{}'),
-- Maximo legacy
('e-r-app-022', 'Association', 'Maximo at Ludvika',          'e-loc-ludvika',   'e-app-072', 'manual', '{}'),
('e-r-app-023', 'Association', 'Maximo at Bad Honnef',       'e-loc-badhonnef', 'e-app-072', 'manual', '{}'),
('e-r-app-024', 'Association', 'Maximo at Drammen',          'e-loc-drammen',   'e-app-072', 'manual', '{}');

-- ── RELATIONSHIPS — Application → Data (Access) ──────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-app-100', 'Access', 'SAP Europe → Customer Master',     'e-app-020', 'e-data-004', 'manual', '{}'),
('e-r-app-101', 'Access', 'SAP Europe → Supplier Master',     'e-app-020', 'e-data-010', 'manual', '{}'),
('e-r-app-102', 'Access', 'SAP Europe → Engineering BOM',     'e-app-020', 'e-data-005', 'manual', '{}'),
('e-r-app-103', 'Access', 'SuccessFactors → Employee Master', 'e-app-080', 'e-data-011', 'manual', '{}'),
('e-r-app-104', 'Access', 'Salesforce → Customer Master',     'e-app-030', 'e-data-004', 'manual', '{}'),
('e-r-app-105', 'Access', 'SAP Ariba → Supplier Master',      'e-app-090', 'e-data-010', 'manual', '{}'),
('e-r-app-106', 'Access', 'Teamcenter → Engineering BOM',     'e-app-051', 'e-data-005', 'manual', '{}'),
('e-r-app-107', 'Access', 'Databricks → Telemetry Data',      'e-app-162', 'e-data-002', 'manual', '{}'),
('e-r-app-108', 'Access', 'Databricks → ML Models',           'e-app-162', 'e-data-006', 'manual', '{}'),
('e-r-app-109', 'Access', 'Claroty → OT Security Inventory',  'e-app-131', 'e-data-014', 'manual', '{}'),
('e-r-app-110', 'Access', 'Enablon → HSE Incidents',          'e-app-170', 'e-data-015', 'manual', '{}'),
('e-r-app-111', 'Access', 'SAP QM → Quality Records',         'e-app-100', 'e-data-016', 'manual', '{}'),
('e-r-app-112', 'Access', 'ETQ → Quality Records',            'e-app-102', 'e-data-016', 'manual', '{}'),
('e-r-app-113', 'Access', 'CPQ → Config Rules',               'e-app-032', 'e-data-013', 'manual', '{}'),
('e-r-app-114', 'Access', 'Primavera → Project DW',           'e-app-151', 'e-data-012', 'manual', '{}'),
('e-r-app-115', 'Access', 'SAP PS → Project DW',              'e-app-150', 'e-data-012', 'manual', '{}');

-- ── RELATIONSHIPS — Application → Business Service (Serving) ──────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system, properties) VALUES
('e-r-app-200', 'Serving', 'Lumada FSM → Field Dispatch',        'e-app-068', 'e-svc-007', 'manual', '{}'),
('e-r-app-201', 'Serving', 'Lumada EAM → Asset Lifecycle',       'e-app-067', 'e-svc-002', 'manual', '{}'),
('e-r-app-202', 'Serving', 'SAP IBP → Spare Parts Mgmt',        'e-app-110', 'e-svc-009', 'manual', '{}'),
('e-r-app-203', 'Serving', 'FOXMAN → Grid Monitoring',           'e-app-063', 'e-svc-001', 'manual', '{}'),
('e-r-app-204', 'Serving', 'PCM600 → Protection Config',         'e-app-055', 'e-svc-005', 'manual', '{}'),
('e-r-app-205', 'Serving', 'Enablon → Training & Cert',          'e-app-170', 'e-svc-012', 'manual', '{}'),
('e-r-app-206', 'Serving', 'Lumada Inspection → QA Service',     'e-app-073', 'e-svc-008', 'manual', '{}'),
('e-r-app-207', 'Serving', 'Salesforce Service → Remote Diag',   'e-app-031', 'e-svc-010', 'manual', '{}');

-- ── Now remove the old single-instance apps that are replaced by expanded ones ─
-- Delete old e-app-006 (SAP S/4HANA - single), e-app-007 (SAP PLM), e-app-008 (Salesforce),
-- e-app-009 (ServiceNow), e-app-010 (Transformer Design), e-app-012 (Field Service Mobile)
-- Their relationships were already seeded in the original file, so we keep those

-- NOTE: We keep the original 16 apps (e-app-001 through e-app-016) intact.
-- The new apps above supplement them — representing regional instances, MES per factory,
-- and the broader enterprise application portfolio that was missing.
