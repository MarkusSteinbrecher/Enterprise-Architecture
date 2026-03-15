-- ============================================================================
-- Sample Data: SCOR Supply Chain Client
-- Cross-industry supply chain architecture based on SCOR DS framework
-- For use with: ./init_db.sh scor-client.db && sqlite3 scor-client.db < seed-scor-client.sql
-- ============================================================================

-- ── STRATEGY LAYER — Capabilities ─────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-cap-000', 'Capability', 'Supply Chain Management', 'Strategy',
 'Enterprise-level supply chain capability spanning planning, sourcing, manufacturing, fulfillment, and returns',
 'manual', '{"level": 0, "framework": "SCOR DS"}');

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-cap-001', 'Capability', 'Plan', 'Strategy',
 'Balance aggregate supply and demand across the full supply chain horizon',
 'manual', '{"level": 1, "scor_process": "P1"}'),
('sc-cap-002', 'Capability', 'Source', 'Strategy',
 'Procure direct materials and components from approved suppliers',
 'manual', '{"level": 1, "scor_process": "S1/S2"}'),
('sc-cap-003', 'Capability', 'Transform', 'Strategy',
 'Convert raw materials and components into finished products through manufacturing',
 'manual', '{"level": 1, "scor_process": "M2"}'),
('sc-cap-004', 'Capability', 'Fulfill', 'Strategy',
 'Process customer orders through picking, packing, shipping, and invoicing',
 'manual', '{"level": 1, "scor_process": "D1"}'),
('sc-cap-005', 'Capability', 'Return', 'Strategy',
 'Manage return of defective materials to suppliers including RMA and financial settlement',
 'manual', '{"level": 1, "scor_process": "SR1"}');

-- ── BUSINESS LAYER — Value Streams ───────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-vs-001', 'ValueStream', 'Plan-to-Produce', 'Strategy',
 'End-to-end value stream from demand signal through supply planning to production order release',
 'manual', '{"processes": ["sc-proc-001", "sc-proc-002", "sc-proc-003"]}'),
('sc-vs-002', 'ValueStream', 'Order-to-Cash', 'Strategy',
 'End-to-end value stream from customer order through fulfillment to invoicing and payment',
 'manual', '{"processes": ["sc-proc-004"]}'),
('sc-vs-003', 'ValueStream', 'Issue-to-Resolution', 'Strategy',
 'End-to-end value stream for handling quality non-conformances through return and financial settlement',
 'manual', '{"processes": ["sc-proc-005"]}');

-- ── BUSINESS LAYER — Actors ──────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-actor-001', 'BusinessActor', 'Planning Department', 'Business',
 'Organizational unit responsible for demand and supply planning across the supply chain',
 'manual', '{}'),
('sc-actor-002', 'BusinessActor', 'Procurement Department', 'Business',
 'Organizational unit responsible for supplier management and purchasing',
 'manual', '{}'),
('sc-actor-003', 'BusinessActor', 'Manufacturing Operations', 'Business',
 'Organizational unit responsible for production execution and quality',
 'manual', '{}'),
('sc-actor-004', 'BusinessActor', 'Warehouse & Logistics', 'Business',
 'Organizational unit responsible for warehousing, shipping, and transportation',
 'manual', '{}'),
('sc-actor-005', 'BusinessActor', 'Quality Management', 'Business',
 'Organizational unit responsible for quality assurance and non-conformance management',
 'manual', '{}'),
('sc-actor-006', 'BusinessActor', 'Finance & Accounting', 'Business',
 'Organizational unit responsible for accounts payable, receivable, and financial controls',
 'manual', '{}'),
('sc-actor-007', 'BusinessActor', 'Customer Service', 'Business',
 'Organizational unit responsible for customer order management and communication',
 'manual', '{}');

-- ── BUSINESS LAYER — Roles ───────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-role-001', 'BusinessRole', 'Supply Chain Planner', 'Business',
 'Orchestrates planning cycle, reviews exceptions, approves constrained supply plan',
 'manual', '{"department": "Planning"}'),
('sc-role-002', 'BusinessRole', 'Demand Planner', 'Business',
 'Provides and validates demand signals, explains statistical anomalies',
 'manual', '{"department": "Planning"}'),
('sc-role-003', 'BusinessRole', 'Buyer', 'Business',
 'Issues purchase orders, monitors order status, manages supplier deviations',
 'manual', '{"department": "Procurement"}'),
('sc-role-004', 'BusinessRole', 'Procurement Manager', 'Business',
 'Approves POs above delegation limit, resolves escalated supplier disputes',
 'manual', '{"department": "Procurement"}'),
('sc-role-005', 'BusinessRole', 'Production Scheduler', 'Business',
 'Confirms manufacturing capacity, schedules production orders, manages shop floor releases',
 'manual', '{"department": "Manufacturing"}'),
('sc-role-006', 'BusinessRole', 'Warehouse Operator', 'Business',
 'Receives goods, performs put-away, picks and packs orders, stages shipments',
 'manual', '{"department": "Warehouse & Logistics"}'),
('sc-role-007', 'BusinessRole', 'Quality Engineer', 'Business',
 'Executes inspections, raises NCRs, makes disposition decisions on non-conforming material',
 'manual', '{"department": "Quality"}'),
('sc-role-008', 'BusinessRole', 'Logistics Coordinator', 'Business',
 'Plans shipments, selects carriers, manages transportation documentation',
 'manual', '{"department": "Warehouse & Logistics"}'),
('sc-role-009', 'BusinessRole', 'Accounts Payable Clerk', 'Business',
 'Registers invoices, executes three-way match, schedules supplier payments',
 'manual', '{"department": "Finance"}'),
('sc-role-010', 'BusinessRole', 'Customer Service Representative', 'Business',
 'Receives and validates customer orders, manages order status communication',
 'manual', '{"department": "Customer Service"}'),
('sc-role-011', 'BusinessRole', 'S&OP Manager', 'Business',
 'Final approval authority for supply plans with significant business impact',
 'manual', '{"department": "Planning"}'),
('sc-role-012', 'BusinessRole', 'Plant Manager', 'Business',
 'Overall responsibility for manufacturing site operations and performance',
 'manual', '{"department": "Manufacturing"}');

-- ── BUSINESS LAYER — Events ──────────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-evt-001', 'BusinessEvent', 'Planning Cycle Opens', 'Business',
 'Periodic trigger (weekly or monthly) that initiates the supply planning process',
 'manual', '{"scor_process": "P1", "frequency": "weekly or monthly"}'),
('sc-evt-002', 'BusinessEvent', 'Purchase Order Released', 'Business',
 'Planned PO released from supply planning, triggering the procurement process',
 'manual', '{"scor_process": "S1/S2"}'),
('sc-evt-003', 'BusinessEvent', 'Production Order Released', 'Business',
 'Planned production order released from planning, triggering the manufacturing process',
 'manual', '{"scor_process": "M2"}'),
('sc-evt-004', 'BusinessEvent', 'Customer Order Received', 'Business',
 'Customer submits order via EDI, portal, or phone, triggering the fulfillment process',
 'manual', '{"scor_process": "D1"}'),
('sc-evt-005', 'BusinessEvent', 'Non-Conformance Identified', 'Business',
 'Defective material discovered at incoming inspection or during production',
 'manual', '{"scor_process": "SR1"}'),
('sc-evt-006', 'BusinessEvent', 'Supplier Delivery Received', 'Business',
 'Physical delivery arrives at receiving dock from supplier',
 'manual', '{"scor_process": "S1"}'),
('sc-evt-007', 'BusinessEvent', 'Invoice Received', 'Business',
 'Supplier invoice received via EDI, portal, or paper scan',
 'manual', '{"scor_process": "S1"}');

-- ── BUSINESS LAYER — Processes (Parents) ─────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-proc-001', 'BusinessProcess', 'Plan Supply Chain', 'Business',
 'Balances aggregate supply and demand. Takes demand signals and compares against supply resources to produce a constrained supply plan driving all downstream processes.',
 'manual', '{"scor_ref": "P1", "scor_level": 1, "cycle_time_target": "<2 hours"}'),
('sc-proc-002', 'BusinessProcess', 'Direct Procurement', 'Business',
 'Full purchase-to-receipt cycle: PO issuance, supplier confirmation, goods receipt, invoice matching, and payment approval.',
 'manual', '{"scor_ref": "S1/S2", "scor_level": 1, "cycle_time_target": "5-7 days"}'),
('sc-proc-003', 'BusinessProcess', 'Make to Order', 'Business',
 'Production execution for confirmed orders: scheduling, material issue, production, packaging, and finished goods staging.',
 'manual', '{"scor_ref": "M2", "scor_level": 1}'),
('sc-proc-004', 'BusinessProcess', 'Deliver Stocked Product', 'Business',
 'Customer order processing through picking, packing, shipping, and invoicing for stocked inventory.',
 'manual', '{"scor_ref": "D1", "scor_level": 1}'),
('sc-proc-005', 'BusinessProcess', 'Return Defective to Supplier', 'Business',
 'Manages return of non-conforming materials: defect identification, RMA, return shipment, replacement receipt, and financial settlement.',
 'manual', '{"scor_ref": "SR1", "scor_level": 1}');

-- ── BUSINESS LAYER — Processes (Sub-processes: Plan) ─────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-proc-011', 'BusinessProcess', 'Aggregate Supply Chain Requirements', 'Business',
 'P1.1: Aggregate all demand signals across time horizons and product/location combinations into a single unconstrained demand view.',
 'manual', '{"scor_ref": "P1.1", "scor_level": 2, "parent": "sc-proc-001"}'),
('sc-proc-012', 'BusinessProcess', 'Assess Supply Chain Resources', 'Business',
 'P1.2: Build a supply resource baseline — what stock, capacity, and inbound supply is available across the planning horizon.',
 'manual', '{"scor_ref": "P1.2", "scor_level": 2, "parent": "sc-proc-001"}'),
('sc-proc-013', 'BusinessProcess', 'Balance Supply and Demand', 'Business',
 'P1.3: Apply constraint-based planning to close supply-demand gaps. Generates the constrained supply plan.',
 'manual', '{"scor_ref": "P1.3", "scor_level": 2, "parent": "sc-proc-001"}'),
('sc-proc-014', 'BusinessProcess', 'Establish and Publish Plans', 'Business',
 'P1.4: Publish approved constrained plan to downstream executing processes. Confirms planned order releases.',
 'manual', '{"scor_ref": "P1.4", "scor_level": 2, "parent": "sc-proc-001"}');

-- ── BUSINESS LAYER — Processes (Sub-processes: Source) ───────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-proc-021', 'BusinessProcess', 'Schedule Product Deliveries', 'Business',
 'S1.1: Convert planned PO into firm PO and transmit to supplier. Confirm delivery schedule.',
 'manual', '{"scor_ref": "S1.1", "scor_level": 2, "parent": "sc-proc-002"}'),
('sc-proc-022', 'BusinessProcess', 'Receive Product', 'Business',
 'S1.2: Receive physical delivery from supplier, verify against PO and ASN, post goods receipt.',
 'manual', '{"scor_ref": "S1.2", "scor_level": 2, "parent": "sc-proc-002"}'),
('sc-proc-023', 'BusinessProcess', 'Verify Product', 'Business',
 'S1.3: Confirm received product meets quality requirements before releasing to stock.',
 'manual', '{"scor_ref": "S1.3", "scor_level": 2, "parent": "sc-proc-002"}'),
('sc-proc-024', 'BusinessProcess', 'Transfer Product', 'Business',
 'S1.4: Transfer received and verified inventory to designated storage or consumption location.',
 'manual', '{"scor_ref": "S1.4", "scor_level": 2, "parent": "sc-proc-002"}'),
('sc-proc-025', 'BusinessProcess', 'Authorise Supplier Payment', 'Business',
 'S1.5: Match supplier invoice against PO and goods receipt. Approve payment for matched invoices.',
 'manual', '{"scor_ref": "S1.5", "scor_level": 2, "parent": "sc-proc-002"}');

-- ── BUSINESS LAYER — Processes (Sub-processes: Make) ─────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-proc-031', 'BusinessProcess', 'Schedule Production', 'Business',
 'M2.1: Load production order into scheduling system, backward-schedule through routing, confirm capacity and materials.',
 'manual', '{"scor_ref": "M2.1", "scor_level": 2, "parent": "sc-proc-003"}'),
('sc-proc-032', 'BusinessProcess', 'Issue Materials', 'Business',
 'M2.2: Generate pick list from BOM, apply FEFO/FIFO lot selection, pick and deliver to production staging.',
 'manual', '{"scor_ref": "M2.2", "scor_level": 2, "parent": "sc-proc-003"}'),
('sc-proc-033', 'BusinessProcess', 'Produce and Test', 'Business',
 'M2.3: Execute production steps per work instructions with in-process quality checks at control points.',
 'manual', '{"scor_ref": "M2.3", "scor_level": 2, "parent": "sc-proc-003"}'),
('sc-proc-034', 'BusinessProcess', 'Package', 'Business',
 'M2.4: Apply primary packaging and labelling, secondary/tertiary packaging, SSCC/GS1 labels.',
 'manual', '{"scor_ref": "M2.4", "scor_level": 2, "parent": "sc-proc-003"}'),
('sc-proc-035', 'BusinessProcess', 'Stage Finished Goods', 'Business',
 'M2.5: Final product inspection, release to finished goods inventory, close production order.',
 'manual', '{"scor_ref": "M2.5", "scor_level": 2, "parent": "sc-proc-003"}');

-- ── BUSINESS LAYER — Processes (Sub-processes: Deliver) ──────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-proc-041', 'BusinessProcess', 'Receive and Validate Order', 'Business',
 'D1.2: Register customer order in ERP, validate header and lines, run credit and ATP checks.',
 'manual', '{"scor_ref": "D1.2", "scor_level": 2, "parent": "sc-proc-004"}'),
('sc-proc-042', 'BusinessProcess', 'Reserve Inventory and Set CDD', 'Business',
 'D1.3: Hard-allocate inventory to order, calculate committed delivery date, confirm to customer.',
 'manual', '{"scor_ref": "D1.3", "scor_level": 2, "parent": "sc-proc-004"}'),
('sc-proc-043', 'BusinessProcess', 'Consolidate Orders', 'Business',
 'D1.4: Group orders by carrier, route, and ship date. Create pick waves and release to WMS.',
 'manual', '{"scor_ref": "D1.4", "scor_level": 2, "parent": "sc-proc-004"}'),
('sc-proc-044', 'BusinessProcess', 'Pick Pack and Ship', 'Business',
 'D1.5/D1.6/D1.10: Warehouse picking, packing, carrier booking, loading, goods issue, and ASN transmission.',
 'manual', '{"scor_ref": "D1.5-D1.10", "scor_level": 2, "parent": "sc-proc-004"}'),
('sc-proc-045', 'BusinessProcess', 'Invoice Customer', 'Business',
 'D1.11: Generate invoice on goods issue, apply pricing/freight/tax, transmit to customer, post to AR.',
 'manual', '{"scor_ref": "D1.11", "scor_level": 2, "parent": "sc-proc-004"}');

-- ── BUSINESS LAYER — Processes (Sub-processes: Return) ───────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-proc-051', 'BusinessProcess', 'Identify Defect and Disposition', 'Business',
 'SR1.1: Raise NCR with defect details, quarantine affected material, assess scope and make disposition decision.',
 'manual', '{"scor_ref": "SR1.1", "scor_level": 2, "parent": "sc-proc-005"}'),
('sc-proc-052', 'BusinessProcess', 'Request RMA', 'Business',
 'SR1.2: Contact supplier with NCR evidence, request RMA number and return terms.',
 'manual', '{"scor_ref": "SR1.2", "scor_level": 2, "parent": "sc-proc-005"}'),
('sc-proc-053', 'BusinessProcess', 'Prepare and Ship Return', 'Business',
 'SR1.3: Retrieve quarantined material, package per instructions, generate return docs, book carrier.',
 'manual', '{"scor_ref": "SR1.3", "scor_level": 2, "parent": "sc-proc-005"}'),
('sc-proc-054', 'BusinessProcess', 'Receive Replacement', 'Business',
 'SR1.4: Receive replacement shipment from supplier with enhanced inspection.',
 'manual', '{"scor_ref": "SR1.4", "scor_level": 2, "parent": "sc-proc-005"}'),
('sc-proc-055', 'BusinessProcess', 'Financial Settlement', 'Business',
 'SR1.5: Receive and validate supplier credit note, post to AP, close NCR, update supplier scorecard.',
 'manual', '{"scor_ref": "SR1.5", "scor_level": 2, "parent": "sc-proc-005"}');

-- ── BUSINESS LAYER — Data Objects ────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-data-001', 'DataObject', 'Demand Forecast', 'Business',
 'Statistical demand forecast by SKU, location, and time bucket for the planning horizon',
 'manual', '{"owner": "Demand Planning"}'),
('sc-data-002', 'DataObject', 'Supply Plan', 'Business',
 'Constrained supply plan with planned purchase orders, production orders, and transfer orders',
 'manual', '{"owner": "Supply Chain Planning"}'),
('sc-data-003', 'DataObject', 'Purchase Order', 'Business',
 'Firm purchase order issued to supplier with item, quantity, price, delivery date, and terms',
 'manual', '{"owner": "Procurement"}'),
('sc-data-004', 'DataObject', 'Production Order', 'Business',
 'Order to manufacture a specific product quantity with routing, BOM, and scheduled dates',
 'manual', '{"owner": "Manufacturing"}'),
('sc-data-005', 'DataObject', 'Goods Receipt', 'Business',
 'Confirmation of received goods against a purchase order with quantity and quality status',
 'manual', '{"owner": "Warehouse"}'),
('sc-data-006', 'DataObject', 'Sales Order', 'Business',
 'Confirmed customer order with items, quantities, prices, delivery address, and committed delivery date',
 'manual', '{"owner": "Customer Service"}'),
('sc-data-007', 'DataObject', 'Shipment', 'Business',
 'Shipment record with carrier, tracking number, bill of lading, and delivery status',
 'manual', '{"owner": "Logistics"}'),
('sc-data-008', 'DataObject', 'Invoice', 'Business',
 'Commercial invoice issued to customer or received from supplier for goods and services',
 'manual', '{"owner": "Finance"}'),
('sc-data-009', 'DataObject', 'Non-Conformance Report', 'Business',
 'Quality non-conformance record with defect details, scope assessment, and disposition decision',
 'manual', '{"owner": "Quality"}'),
('sc-data-010', 'DataObject', 'RMA Record', 'Business',
 'Return material authorization record with supplier agreement, return terms, and tracking',
 'manual', '{"owner": "Quality / Procurement"}'),
('sc-data-011', 'DataObject', 'Inventory Position', 'Business',
 'Current stock levels by SKU, location, lot, and quality status (available, quarantine, in-transit)',
 'manual', '{"owner": "Warehouse"}'),
('sc-data-012', 'DataObject', 'Credit Note', 'Business',
 'Supplier credit note for returned or defective goods, validated against PO and return records',
 'manual', '{"owner": "Finance"}'),
('sc-data-013', 'DataObject', 'Bill of Materials', 'Business',
 'Structured list of materials and components required to manufacture a product',
 'manual', '{"owner": "Engineering / Manufacturing"}'),
('sc-data-014', 'DataObject', 'Inspection Record', 'Business',
 'Quality inspection results with pass/fail decision, measurements, and certifications',
 'manual', '{"owner": "Quality"}'),
('sc-data-015', 'DataObject', 'Supplier Scorecard', 'Business',
 'Aggregated supplier performance metrics: on-time delivery, quality rate, responsiveness',
 'manual', '{"owner": "Procurement"}');

-- ── APPLICATION LAYER — Applications ─────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-app-001', 'ApplicationComponent', 'ERP System', 'Application',
 'Enterprise Resource Planning — core transactional system for procurement, manufacturing, sales, and finance',
 'manual', '{"vendor": "SAP", "product": "S/4HANA", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "mission_critical"}'),
('sc-app-002', 'ApplicationComponent', 'Advanced Planning System', 'Application',
 'Constraint-based planning and optimization engine for supply chain planning',
 'manual', '{"vendor": "SAP", "product": "IBP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('sc-app-003', 'ApplicationComponent', 'Warehouse Management System', 'Application',
 'Manages warehouse operations: receiving, put-away, picking, packing, and shipping',
 'manual', '{"vendor": "SAP", "product": "EWM", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('sc-app-004', 'ApplicationComponent', 'Manufacturing Execution System', 'Application',
 'Shop floor control: production order execution, work instructions, data collection, and OEE tracking',
 'manual', '{"vendor": "Siemens", "product": "Opcenter", "lifecycle_status": "active", "hosting": "on-premise", "business_criticality": "high"}'),
('sc-app-005', 'ApplicationComponent', 'Transport Management System', 'Application',
 'Carrier selection, shipment planning, freight cost management, and tracking',
 'manual', '{"vendor": "SAP", "product": "TM", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}'),
('sc-app-006', 'ApplicationComponent', 'Quality Management System', 'Application',
 'Inspection planning, execution, non-conformance management, and corrective actions',
 'manual', '{"vendor": "SAP", "product": "QM", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('sc-app-007', 'ApplicationComponent', 'Supplier Portal', 'Application',
 'Supplier-facing portal for PO confirmation, ASN submission, invoice submission, and collaboration',
 'manual', '{"vendor": "SAP", "product": "Ariba Network", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}'),
('sc-app-008', 'ApplicationComponent', 'Demand Planning System', 'Application',
 'Statistical forecasting, demand sensing, and consensus demand planning',
 'manual', '{"vendor": "SAP", "product": "IBP Demand", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('sc-app-009', 'ApplicationComponent', 'EDI Platform', 'Application',
 'Electronic data interchange for automated document exchange with suppliers and customers (850/856/810)',
 'manual', '{"vendor": "OpenText", "product": "B2B Managed Services", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}'),
('sc-app-010', 'ApplicationComponent', 'Customer Order Portal', 'Application',
 'Customer-facing portal for order entry, order status tracking, and self-service',
 'manual', '{"vendor": "Salesforce", "product": "Commerce Cloud", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}'),
('sc-app-011', 'ApplicationComponent', 'Accounts Payable System', 'Application',
 'Invoice processing, three-way matching, payment scheduling, and supplier ledger management',
 'manual', '{"vendor": "SAP", "product": "S/4HANA FI-AP", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "high"}'),
('sc-app-012', 'ApplicationComponent', 'Document Capture System', 'Application',
 'Automated capture and OCR of supplier invoices and delivery documents',
 'manual', '{"vendor": "OpenText", "product": "Intelligent Capture", "lifecycle_status": "active", "hosting": "cloud", "business_criticality": "medium"}');

-- ── TECHNOLOGY LAYER — Technology Services ───────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-tc-001', 'TechnologyService', 'Planning Optimization Engine', 'Technology',
 'Constraint-based solver for MRP/optimization algorithms in supply planning',
 'manual', '{}'),
('sc-tc-002', 'TechnologyService', 'Barcode/RFID Scanning Service', 'Technology',
 'Mobile scanning infrastructure for warehouse receiving, put-away, picking, and shipping',
 'manual', '{}'),
('sc-tc-003', 'TechnologyService', 'EDI Translation Service', 'Technology',
 'Translates business documents between internal formats and EDI standards (ANSI X12, EDIFACT)',
 'manual', '{}'),
('sc-tc-004', 'TechnologyService', 'Invoice OCR Service', 'Technology',
 'Optical character recognition for extracting structured data from paper/PDF invoices',
 'manual', '{}'),
('sc-tc-005', 'TechnologyService', 'Carrier Integration API', 'Technology',
 'API gateway for real-time carrier rate quotes, booking, tracking, and proof of delivery',
 'manual', '{}');

-- ── PHYSICAL LAYER — Locations ───────────────────────────────────────────────

INSERT INTO element (id, type, name, layer, description, source_system, properties) VALUES
('sc-loc-001', 'Location', 'Central Distribution Center', 'Other',
 'Main distribution hub handling inbound receiving and outbound shipping',
 'manual', '{"type": "distribution_center", "region": "Central"}'),
('sc-loc-002', 'Location', 'Manufacturing Plant A', 'Other',
 'Primary manufacturing facility for make-to-order production',
 'manual', '{"type": "manufacturing", "region": "Central"}'),
('sc-loc-003', 'Location', 'Manufacturing Plant B', 'Other',
 'Secondary manufacturing facility',
 'manual', '{"type": "manufacturing", "region": "West"}'),
('sc-loc-004', 'Location', 'Regional Warehouse East', 'Other',
 'Regional forward stocking location for east region fulfillment',
 'manual', '{"type": "warehouse", "region": "East"}'),
('sc-loc-005', 'Location', 'Regional Warehouse West', 'Other',
 'Regional forward stocking location for west region fulfillment',
 'manual', '{"type": "warehouse", "region": "West"}'),
('sc-loc-006', 'Location', 'Headquarters', 'Other',
 'Corporate headquarters housing planning, procurement, and finance teams',
 'manual', '{"type": "office", "region": "Central"}');

-- ══════════════════════════════════════════════════════════════════════════════
-- RELATIONSHIPS
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Composition: Capability hierarchy ────────────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
('sc-r-cap-001', 'Composition', 'sc-cap-000', 'sc-cap-001', 'manual'),
('sc-r-cap-002', 'Composition', 'sc-cap-000', 'sc-cap-002', 'manual'),
('sc-r-cap-003', 'Composition', 'sc-cap-000', 'sc-cap-003', 'manual'),
('sc-r-cap-004', 'Composition', 'sc-cap-000', 'sc-cap-004', 'manual'),
('sc-r-cap-005', 'Composition', 'sc-cap-000', 'sc-cap-005', 'manual');

-- ── Composition: Process hierarchy ───────────────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
('sc-r-proc-001', 'Composition', 'sc-proc-001', 'sc-proc-011', 'manual'),
('sc-r-proc-002', 'Composition', 'sc-proc-001', 'sc-proc-012', 'manual'),
('sc-r-proc-003', 'Composition', 'sc-proc-001', 'sc-proc-013', 'manual'),
('sc-r-proc-004', 'Composition', 'sc-proc-001', 'sc-proc-014', 'manual'),
('sc-r-proc-005', 'Composition', 'sc-proc-002', 'sc-proc-021', 'manual'),
('sc-r-proc-006', 'Composition', 'sc-proc-002', 'sc-proc-022', 'manual'),
('sc-r-proc-007', 'Composition', 'sc-proc-002', 'sc-proc-023', 'manual'),
('sc-r-proc-008', 'Composition', 'sc-proc-002', 'sc-proc-024', 'manual'),
('sc-r-proc-009', 'Composition', 'sc-proc-002', 'sc-proc-025', 'manual'),
('sc-r-proc-010', 'Composition', 'sc-proc-003', 'sc-proc-031', 'manual'),
('sc-r-proc-011', 'Composition', 'sc-proc-003', 'sc-proc-032', 'manual'),
('sc-r-proc-012', 'Composition', 'sc-proc-003', 'sc-proc-033', 'manual'),
('sc-r-proc-013', 'Composition', 'sc-proc-003', 'sc-proc-034', 'manual'),
('sc-r-proc-014', 'Composition', 'sc-proc-003', 'sc-proc-035', 'manual'),
('sc-r-proc-015', 'Composition', 'sc-proc-004', 'sc-proc-041', 'manual'),
('sc-r-proc-016', 'Composition', 'sc-proc-004', 'sc-proc-042', 'manual'),
('sc-r-proc-017', 'Composition', 'sc-proc-004', 'sc-proc-043', 'manual'),
('sc-r-proc-018', 'Composition', 'sc-proc-004', 'sc-proc-044', 'manual'),
('sc-r-proc-019', 'Composition', 'sc-proc-004', 'sc-proc-045', 'manual'),
('sc-r-proc-020', 'Composition', 'sc-proc-005', 'sc-proc-051', 'manual'),
('sc-r-proc-021', 'Composition', 'sc-proc-005', 'sc-proc-052', 'manual'),
('sc-r-proc-022', 'Composition', 'sc-proc-005', 'sc-proc-053', 'manual'),
('sc-r-proc-023', 'Composition', 'sc-proc-005', 'sc-proc-054', 'manual'),
('sc-r-proc-024', 'Composition', 'sc-proc-005', 'sc-proc-055', 'manual');

-- ── Triggering: Process flow within each parent ──────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
-- Plan
('sc-r-trig-001', 'Triggering', 'sc-proc-011', 'sc-proc-012', 'manual'),
('sc-r-trig-002', 'Triggering', 'sc-proc-012', 'sc-proc-013', 'manual'),
('sc-r-trig-003', 'Triggering', 'sc-proc-013', 'sc-proc-014', 'manual'),
-- Source
('sc-r-trig-004', 'Triggering', 'sc-proc-021', 'sc-proc-022', 'manual'),
('sc-r-trig-005', 'Triggering', 'sc-proc-022', 'sc-proc-023', 'manual'),
('sc-r-trig-006', 'Triggering', 'sc-proc-023', 'sc-proc-024', 'manual'),
('sc-r-trig-007', 'Triggering', 'sc-proc-024', 'sc-proc-025', 'manual'),
-- Make
('sc-r-trig-008', 'Triggering', 'sc-proc-031', 'sc-proc-032', 'manual'),
('sc-r-trig-009', 'Triggering', 'sc-proc-032', 'sc-proc-033', 'manual'),
('sc-r-trig-010', 'Triggering', 'sc-proc-033', 'sc-proc-034', 'manual'),
('sc-r-trig-011', 'Triggering', 'sc-proc-034', 'sc-proc-035', 'manual'),
-- Deliver
('sc-r-trig-012', 'Triggering', 'sc-proc-041', 'sc-proc-042', 'manual'),
('sc-r-trig-013', 'Triggering', 'sc-proc-042', 'sc-proc-043', 'manual'),
('sc-r-trig-014', 'Triggering', 'sc-proc-043', 'sc-proc-044', 'manual'),
('sc-r-trig-015', 'Triggering', 'sc-proc-044', 'sc-proc-045', 'manual'),
-- Return
('sc-r-trig-016', 'Triggering', 'sc-proc-051', 'sc-proc-052', 'manual'),
('sc-r-trig-017', 'Triggering', 'sc-proc-052', 'sc-proc-053', 'manual'),
('sc-r-trig-018', 'Triggering', 'sc-proc-053', 'sc-proc-054', 'manual'),
('sc-r-trig-019', 'Triggering', 'sc-proc-054', 'sc-proc-055', 'manual');

-- ── Triggering: Cross-process (SCOR chain) ───────────────────────────────────

INSERT INTO relationship (id, type, name, source_element, target_element, source_system) VALUES
('sc-r-trig-100', 'Triggering', 'Plan releases POs to Source', 'sc-proc-014', 'sc-proc-021', 'manual'),
('sc-r-trig-101', 'Triggering', 'Plan releases production orders to Make', 'sc-proc-014', 'sc-proc-031', 'manual'),
('sc-r-trig-102', 'Triggering', 'Plan publishes ATP to Deliver', 'sc-proc-014', 'sc-proc-041', 'manual'),
('sc-r-trig-103', 'Triggering', 'Source feeds materials to Make', 'sc-proc-024', 'sc-proc-032', 'manual'),
('sc-r-trig-104', 'Triggering', 'Make stages FG for Deliver', 'sc-proc-035', 'sc-proc-043', 'manual'),
('sc-r-trig-105', 'Triggering', 'Quality rejection triggers Return', 'sc-proc-023', 'sc-proc-051', 'manual');

-- ── Triggering: Events to processes ──────────────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
('sc-r-evt-001', 'Triggering', 'sc-evt-001', 'sc-proc-011', 'manual'),
('sc-r-evt-002', 'Triggering', 'sc-evt-002', 'sc-proc-021', 'manual'),
('sc-r-evt-003', 'Triggering', 'sc-evt-003', 'sc-proc-031', 'manual'),
('sc-r-evt-004', 'Triggering', 'sc-evt-004', 'sc-proc-041', 'manual'),
('sc-r-evt-005', 'Triggering', 'sc-evt-005', 'sc-proc-051', 'manual'),
('sc-r-evt-006', 'Triggering', 'sc-evt-006', 'sc-proc-022', 'manual'),
('sc-r-evt-007', 'Triggering', 'sc-evt-007', 'sc-proc-025', 'manual');

-- ── Assignment: Roles to processes ───────────────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
-- Planning
('sc-r-role-001', 'Assignment', 'sc-role-001', 'sc-proc-001', 'manual'),
('sc-r-role-002', 'Assignment', 'sc-role-002', 'sc-proc-011', 'manual'),
('sc-r-role-001a', 'Assignment', 'sc-role-001', 'sc-proc-012', 'manual'),
('sc-r-role-001b', 'Assignment', 'sc-role-001', 'sc-proc-013', 'manual'),
('sc-r-role-011a', 'Assignment', 'sc-role-011', 'sc-proc-014', 'manual'),
('sc-r-role-005a', 'Assignment', 'sc-role-005', 'sc-proc-013', 'manual'),
-- Source
('sc-r-role-003a', 'Assignment', 'sc-role-003', 'sc-proc-021', 'manual'),
('sc-r-role-004a', 'Assignment', 'sc-role-004', 'sc-proc-021', 'manual'),
('sc-r-role-006a', 'Assignment', 'sc-role-006', 'sc-proc-022', 'manual'),
('sc-r-role-007a', 'Assignment', 'sc-role-007', 'sc-proc-023', 'manual'),
('sc-r-role-006b', 'Assignment', 'sc-role-006', 'sc-proc-024', 'manual'),
('sc-r-role-009a', 'Assignment', 'sc-role-009', 'sc-proc-025', 'manual'),
('sc-r-role-003b', 'Assignment', 'sc-role-003', 'sc-proc-025', 'manual'),
-- Make
('sc-r-role-005b', 'Assignment', 'sc-role-005', 'sc-proc-031', 'manual'),
('sc-r-role-006c', 'Assignment', 'sc-role-006', 'sc-proc-032', 'manual'),
('sc-r-role-007b', 'Assignment', 'sc-role-007', 'sc-proc-033', 'manual'),
('sc-r-role-006d', 'Assignment', 'sc-role-006', 'sc-proc-034', 'manual'),
('sc-r-role-007c', 'Assignment', 'sc-role-007', 'sc-proc-035', 'manual'),
-- Deliver
('sc-r-role-010a', 'Assignment', 'sc-role-010', 'sc-proc-041', 'manual'),
('sc-r-role-006e', 'Assignment', 'sc-role-006', 'sc-proc-044', 'manual'),
('sc-r-role-008a', 'Assignment', 'sc-role-008', 'sc-proc-044', 'manual'),
-- Return
('sc-r-role-007d', 'Assignment', 'sc-role-007', 'sc-proc-051', 'manual'),
('sc-r-role-003c', 'Assignment', 'sc-role-003', 'sc-proc-052', 'manual'),
('sc-r-role-006f', 'Assignment', 'sc-role-006', 'sc-proc-053', 'manual'),
('sc-r-role-009b', 'Assignment', 'sc-role-009', 'sc-proc-055', 'manual');

-- ── Serving: Applications to processes ───────────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
-- Plan
('sc-r-app-001', 'Serving', 'sc-app-002', 'sc-proc-011', 'manual'),
('sc-r-app-002', 'Serving', 'sc-app-008', 'sc-proc-011', 'manual'),
('sc-r-app-003', 'Serving', 'sc-app-001', 'sc-proc-012', 'manual'),
('sc-r-app-004', 'Serving', 'sc-app-003', 'sc-proc-012', 'manual'),
('sc-r-app-005', 'Serving', 'sc-app-002', 'sc-proc-013', 'manual'),
('sc-r-app-006', 'Serving', 'sc-app-001', 'sc-proc-014', 'manual'),
-- Source
('sc-r-app-007', 'Serving', 'sc-app-001', 'sc-proc-021', 'manual'),
('sc-r-app-008', 'Serving', 'sc-app-007', 'sc-proc-021', 'manual'),
('sc-r-app-009', 'Serving', 'sc-app-009', 'sc-proc-021', 'manual'),
('sc-r-app-010', 'Serving', 'sc-app-003', 'sc-proc-022', 'manual'),
('sc-r-app-011', 'Serving', 'sc-app-001', 'sc-proc-022', 'manual'),
('sc-r-app-012', 'Serving', 'sc-app-006', 'sc-proc-023', 'manual'),
('sc-r-app-013', 'Serving', 'sc-app-003', 'sc-proc-024', 'manual'),
('sc-r-app-014', 'Serving', 'sc-app-011', 'sc-proc-025', 'manual'),
('sc-r-app-015', 'Serving', 'sc-app-012', 'sc-proc-025', 'manual'),
-- Make
('sc-r-app-016', 'Serving', 'sc-app-001', 'sc-proc-031', 'manual'),
('sc-r-app-017', 'Serving', 'sc-app-004', 'sc-proc-031', 'manual'),
('sc-r-app-018', 'Serving', 'sc-app-003', 'sc-proc-032', 'manual'),
('sc-r-app-019', 'Serving', 'sc-app-004', 'sc-proc-033', 'manual'),
('sc-r-app-020', 'Serving', 'sc-app-006', 'sc-proc-033', 'manual'),
('sc-r-app-021', 'Serving', 'sc-app-004', 'sc-proc-034', 'manual'),
('sc-r-app-022', 'Serving', 'sc-app-006', 'sc-proc-035', 'manual'),
('sc-r-app-023', 'Serving', 'sc-app-001', 'sc-proc-035', 'manual'),
-- Deliver
('sc-r-app-024', 'Serving', 'sc-app-001', 'sc-proc-041', 'manual'),
('sc-r-app-025', 'Serving', 'sc-app-010', 'sc-proc-041', 'manual'),
('sc-r-app-026', 'Serving', 'sc-app-001', 'sc-proc-042', 'manual'),
('sc-r-app-027', 'Serving', 'sc-app-003', 'sc-proc-043', 'manual'),
('sc-r-app-028', 'Serving', 'sc-app-003', 'sc-proc-044', 'manual'),
('sc-r-app-029', 'Serving', 'sc-app-005', 'sc-proc-044', 'manual'),
('sc-r-app-030', 'Serving', 'sc-app-001', 'sc-proc-045', 'manual'),
('sc-r-app-031', 'Serving', 'sc-app-009', 'sc-proc-045', 'manual'),
-- Return
('sc-r-app-032', 'Serving', 'sc-app-006', 'sc-proc-051', 'manual'),
('sc-r-app-033', 'Serving', 'sc-app-003', 'sc-proc-051', 'manual'),
('sc-r-app-034', 'Serving', 'sc-app-007', 'sc-proc-052', 'manual'),
('sc-r-app-035', 'Serving', 'sc-app-001', 'sc-proc-052', 'manual'),
('sc-r-app-036', 'Serving', 'sc-app-003', 'sc-proc-053', 'manual'),
('sc-r-app-037', 'Serving', 'sc-app-005', 'sc-proc-053', 'manual'),
('sc-r-app-038', 'Serving', 'sc-app-011', 'sc-proc-055', 'manual'),
('sc-r-app-039', 'Serving', 'sc-app-006', 'sc-proc-055', 'manual');

-- ── Access: Processes to data objects ────────────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, access_type, source_system) VALUES
-- Plan
('sc-r-acc-001', 'Access', 'sc-proc-011', 'sc-data-001', 'read', 'manual'),
('sc-r-acc-002', 'Access', 'sc-proc-012', 'sc-data-011', 'read', 'manual'),
('sc-r-acc-003', 'Access', 'sc-proc-013', 'sc-data-002', 'write', 'manual'),
('sc-r-acc-004', 'Access', 'sc-proc-014', 'sc-data-003', 'write', 'manual'),
('sc-r-acc-005', 'Access', 'sc-proc-014', 'sc-data-004', 'write', 'manual'),
-- Source
('sc-r-acc-006', 'Access', 'sc-proc-021', 'sc-data-003', 'readwrite', 'manual'),
('sc-r-acc-007', 'Access', 'sc-proc-022', 'sc-data-005', 'write', 'manual'),
('sc-r-acc-008', 'Access', 'sc-proc-022', 'sc-data-011', 'write', 'manual'),
('sc-r-acc-009', 'Access', 'sc-proc-023', 'sc-data-014', 'write', 'manual'),
('sc-r-acc-010', 'Access', 'sc-proc-023', 'sc-data-009', 'write', 'manual'),
('sc-r-acc-011', 'Access', 'sc-proc-025', 'sc-data-008', 'readwrite', 'manual'),
-- Make
('sc-r-acc-012', 'Access', 'sc-proc-031', 'sc-data-004', 'readwrite', 'manual'),
('sc-r-acc-013', 'Access', 'sc-proc-032', 'sc-data-013', 'read', 'manual'),
('sc-r-acc-014', 'Access', 'sc-proc-032', 'sc-data-011', 'write', 'manual'),
('sc-r-acc-015', 'Access', 'sc-proc-033', 'sc-data-014', 'write', 'manual'),
('sc-r-acc-016', 'Access', 'sc-proc-035', 'sc-data-011', 'write', 'manual'),
-- Deliver
('sc-r-acc-017', 'Access', 'sc-proc-041', 'sc-data-006', 'write', 'manual'),
('sc-r-acc-018', 'Access', 'sc-proc-042', 'sc-data-011', 'readwrite', 'manual'),
('sc-r-acc-019', 'Access', 'sc-proc-044', 'sc-data-007', 'write', 'manual'),
('sc-r-acc-020', 'Access', 'sc-proc-045', 'sc-data-008', 'write', 'manual'),
-- Return
('sc-r-acc-021', 'Access', 'sc-proc-051', 'sc-data-009', 'write', 'manual'),
('sc-r-acc-022', 'Access', 'sc-proc-052', 'sc-data-010', 'write', 'manual'),
('sc-r-acc-023', 'Access', 'sc-proc-055', 'sc-data-012', 'readwrite', 'manual'),
('sc-r-acc-024', 'Access', 'sc-proc-055', 'sc-data-015', 'write', 'manual');

-- ── Realization: Capabilities to processes ───────────────────────────────────

INSERT INTO relationship (id, type, source_element, target_element, source_system) VALUES
('sc-r-real-001', 'Realization', 'sc-proc-001', 'sc-cap-001', 'manual'),
('sc-r-real-002', 'Realization', 'sc-proc-002', 'sc-cap-002', 'manual'),
('sc-r-real-003', 'Realization', 'sc-proc-003', 'sc-cap-003', 'manual'),
('sc-r-real-004', 'Realization', 'sc-proc-004', 'sc-cap-004', 'manual'),
('sc-r-real-005', 'Realization', 'sc-proc-005', 'sc-cap-005', 'manual');
