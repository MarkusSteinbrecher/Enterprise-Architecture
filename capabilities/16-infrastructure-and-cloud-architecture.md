# Capability 16: Infrastructure & Cloud Architecture

**Domain:** Technology Architecture

## Purpose

To design and manage the compute, storage, network, and cloud infrastructure that underpins the application and data architectures, ensuring the technology foundation is scalable, resilient, secure, and cost-effective.

## Scope

- On-premises infrastructure architecture
- Cloud architecture (IaaS, PaaS, hybrid, multi-cloud)
- Compute, storage, and hosting platform design
- Disaster recovery and business continuity architecture
- Infrastructure automation and Infrastructure-as-Code (IaC)
- Cloud financial management (FinOps)

## Key Activities

- Design infrastructure architecture (compute, storage, hosting)
- Design cloud architecture and cloud adoption strategy (IaaS, PaaS, hybrid, multi-cloud)
- Define cloud-native architecture patterns (containers, serverless, managed services)
- Plan capacity and resource utilization
- Design disaster recovery and business continuity architecture (RTO/RPO)
- Implement Infrastructure-as-Code (IaC) patterns and standards
- Establish FinOps practices for cloud cost optimization
- Design for high availability, scalability, and performance
- Define hosting zone architecture (production, non-production, DMZ)
- Evaluate and select infrastructure and cloud platforms

## Inputs

- Application and data architecture requirements
- Non-functional requirements (performance, availability, scalability, DR)
- Security requirements (Cap 17)
- Business continuity requirements
- Budget and cost constraints
- Technology standards (Cap 6)

## Outputs / Deliverables

- Infrastructure architecture blueprints
- Cloud architecture designs and cloud adoption strategy
- Hosting zone architecture
- Capacity plans
- Disaster recovery / business continuity architecture
- Infrastructure-as-Code templates and standards
- FinOps reports and cost optimization recommendations
- Platform evaluation and selection reports

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Infrastructure Architect | Leads infrastructure architecture design |
| Cloud Architect | Designs cloud architecture and multi-cloud strategy |
| Platform Engineer | Implements infrastructure automation and IaC |
| Site Reliability Engineer (SRE) | Ensures infrastructure reliability and availability |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Infrastructure managed reactively; no architecture standards; manual provisioning |
| 2 | Repeatable | Basic infrastructure standards; initial cloud adoption; some automation |
| 3 | Defined | Infrastructure architecture defined; cloud strategy in place; IaC adopted; DR architecture documented |
| 4 | Managed | Automated provisioning; active FinOps; infrastructure performance monitored and optimized |
| 5 | Optimizing | Self-healing infrastructure; cloud-native by default; FinOps mature; continuous cost and performance optimization |

## Key Metrics / KPIs

- Infrastructure availability (uptime %)
- Cloud spend and optimization rate
- Infrastructure provisioning time
- DR readiness (RTO/RPO achievement in tests)
- IaC adoption rate (% of infrastructure managed as code)
- Cost per unit of compute/storage
- Cloud migration progress

## Dependencies

- **Application Portfolio Management** (Cap 10) - Applications deployed on infrastructure
- **Security & Compliance Architecture** (Cap 17) - Security controls at infrastructure layer
- **Network & Communications Architecture** (Cap 18) - Network underpins infrastructure
- **Solution Design & Patterns** (Cap 12) - Infrastructure influences solution design
- **Risk & Technical Debt Management** (Cap 29) - Infrastructure risks assessed and managed
- **Architecture Principles & Standards** (Cap 6) - Infrastructure standards defined

## Tools & Technologies

- Infrastructure-as-Code (Terraform, Pulumi, CloudFormation, Bicep)
- Cloud platforms (AWS, Azure, GCP)
- Container platforms (Kubernetes, Docker, OpenShift)
- Monitoring and observability (Datadog, Dynatrace, Grafana, Prometheus)
- FinOps tools (CloudHealth, Kubecost, AWS Cost Explorer)
- Capacity planning tools
