# Capability 17: Security & Compliance Architecture

**Domain:** Technology Architecture

## Purpose

To design security controls, frameworks, and patterns that protect the enterprise across all architecture domains (business, application, data, infrastructure), ensuring compliance with security regulations and standards.

## Scope

- Security architecture framework and reference architecture
- Identity and access management (IAM) architecture
- Threat modelling and security risk assessment
- Security patterns and controls across architecture layers
- Security compliance architecture (regulatory, industry standards)
- Zero trust architecture

## Key Activities

- Define the enterprise security architecture framework
- Design identity and access management (IAM) architecture
- Conduct threat modelling and security risk assessments
- Define security controls and patterns per architecture layer (network, application, data, infrastructure)
- Design zero trust architecture
- Develop security reference architecture
- Conduct security architecture reviews and assurance
- Map security controls to regulatory and compliance requirements (ISO 27001, NIST, SOC2, PCI-DSS)
- Design cloud security architecture
- Define incident response architecture
- Maintain security pattern catalog

## Inputs

- Business and regulatory security requirements
- Threat intelligence and risk assessments
- Architecture blueprints (application, data, infrastructure)
- Security standards (ISO 27001, NIST CSF, CIS Controls)
- Compliance requirements (PCI-DSS, SOC2, HIPAA, etc.)
- Incident history and lessons learned

## Outputs / Deliverables

- Security architecture framework document
- Security reference architecture
- IAM architecture design
- Threat models (per system/domain)
- Security control catalog
- Security pattern catalog
- Security architecture review reports
- Compliance mapping (controls to regulations)
- Zero trust architecture design

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Security Architect | Leads security architecture design |
| CISO | Sets security strategy and risk appetite |
| Identity Architect | Designs IAM architecture |
| Cloud Security Architect | Designs cloud-specific security controls |
| Enterprise Architect | Ensures security is embedded across all domains |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Security addressed reactively after incidents; no architecture framework |
| 2 | Repeatable | Basic security controls defined; some standards in place; ad-hoc security reviews |
| 3 | Defined | Security architecture framework established; security-by-design adopted; threat modelling practiced |
| 4 | Managed | Security architecture actively enforced; continuous monitoring; zero trust adoption progressing |
| 5 | Optimizing | Zero trust mature; automated security assurance; adaptive and predictive security; DevSecOps integrated |

## Key Metrics / KPIs

- Number of security incidents / breaches
- Security architecture review coverage (% of projects reviewed)
- Compliance audit results (findings count and severity)
- Mean time to detect / respond (MTTD/MTTR)
- Security control effectiveness scores
- Vulnerability remediation rate and time
- Zero trust adoption progress

## Dependencies

- **Infrastructure & Cloud Architecture** (Cap 16) - Security controls at infrastructure layer
- **Solution Design & Patterns** (Cap 12) - Security patterns in solution design
- **Data Governance & Quality** (Cap 14) - Data classification drives security controls
- **Architecture Compliance & Assurance** (Cap 28) - Security compliance assurance
- **Risk & Technical Debt Management** (Cap 29) - Security risks feed enterprise risk management
- **Architecture Principles & Standards** (Cap 6) - Security standards defined

## Tools & Technologies

- Threat modelling tools (STRIDE, Microsoft Threat Modeling Tool, OWASP Threat Dragon)
- SIEM platforms (Splunk, Microsoft Sentinel, Elastic Security)
- IAM platforms (Okta, Azure AD/Entra, Ping Identity)
- Vulnerability scanning tools (Qualys, Nessus, Snyk)
- Cloud security posture management (Prisma Cloud, Wiz, AWS Security Hub)
- Zero trust platforms
- Security frameworks (MITRE ATT&CK, NIST CSF, SABSA)
