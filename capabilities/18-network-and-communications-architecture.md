# Capability 18: Network & Communications Architecture

**Domain:** Technology Architecture

## Purpose

To design network topologies, communication protocols, and connectivity solutions that provide reliable, secure, and performant connectivity across the enterprise, supporting on-premises, cloud, and hybrid environments.

## Scope

- Network topology and segmentation design
- WAN/LAN/SD-WAN architecture
- Cloud networking and hybrid connectivity
- Communication protocols and standards
- Edge computing and IoT connectivity
- Unified communications architecture

## Key Activities

- Design enterprise network topology and segmentation
- Architect WAN, LAN, and SD-WAN solutions
- Design cloud networking (VPCs, peering, transit gateways, PrivateLink)
- Plan hybrid connectivity (VPN, ExpressRoute/Direct Connect)
- Define network security zones and segmentation (microsegmentation, firewall policies)
- Design edge computing and IoT connectivity architecture
- Define communication protocol standards
- Plan network capacity and bandwidth
- Design unified communications architecture (voice, video, messaging)
- Architect DNS, load balancing, and CDN strategies
- Define network monitoring and observability approach

## Inputs

- Application and infrastructure architecture requirements
- Security requirements and security zones (Cap 17)
- Performance and latency requirements
- Business continuity and redundancy requirements
- Cloud architecture and multi-cloud strategy (Cap 16)
- Regulatory requirements (data residency, sovereignty)

## Outputs / Deliverables

- Network topology diagrams
- Network segmentation and security zone designs
- WAN/SD-WAN architecture
- Cloud networking architecture
- Hybrid connectivity designs
- Edge computing architecture
- Communication protocol standards
- Network capacity plans
- Unified communications architecture

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Network Architect | Leads network architecture design |
| Infrastructure Architect | Aligns network with infrastructure strategy |
| Security Architect | Defines network security requirements |
| Cloud Architect | Designs cloud networking components |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Network designed reactively; undocumented topology; flat network |
| 2 | Repeatable | Basic network segmentation; standard protocols defined; network diagrams maintained |
| 3 | Defined | Network architecture documented; SD-WAN and cloud networking adopted; segmentation enforced |
| 4 | Managed | Network performance monitored; automated provisioning; microsegmentation adopted |
| 5 | Optimizing | Intent-based networking; self-healing network; AI-driven network optimization; zero trust network |

## Key Metrics / KPIs

- Network availability and uptime (%)
- Network latency (average, P95, P99)
- Bandwidth utilization
- Network incident count and mean time to resolve
- Network segmentation coverage
- SD-WAN / cloud connectivity adoption rate

## Dependencies

- **Infrastructure & Cloud Architecture** (Cap 16) - Network underpins infrastructure and cloud
- **Security & Compliance Architecture** (Cap 17) - Network security zones and controls
- **Application Integration & API Management** (Cap 11) - Network supports integration traffic
- **Architecture Principles & Standards** (Cap 6) - Network standards defined
- **Risk & Technical Debt Management** (Cap 29) - Network risks assessed

## Tools & Technologies

- Network design tools (SolarWinds, NetBrain, draw.io)
- SD-WAN platforms (Cisco Viptela, VMware VeloCloud, Fortinet)
- Cloud networking (AWS VPC, Azure VNet, GCP VPC)
- Network monitoring (SolarWinds, Datadog, ThousandEyes)
- Firewall and segmentation (Palo Alto, Fortinet, Illumio)
- Load balancers and CDN (F5, Akamai, CloudFlare, AWS ALB/NLB)
