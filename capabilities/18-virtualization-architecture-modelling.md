# Capability 18: Virtualization Architecture Modelling

**Domain:** Architecture Development – Technology Architecture

*NEW PROPOSED DRAFT*

**Tagline:** Design virtualized and containerized infrastructure to optimize resource utilization, agility, scalability.

## Definition

Virtualization Architecture Modelling involves designing and documenting virtualized compute, storage, and network resources, including virtual machines, containers, and cloud-based infrastructure.

## Objectives

Design flexible and efficient virtualization architectures that optimize resource utilization while supporting application requirements for performance, availability, and scalability. Enable rapid provisioning and deployment of infrastructure. Support modern application patterns including microservices, cloud-native, and hybrid cloud architectures.

## Tasks

1. **Identify virtualization requirements** from application architecture, business requirements, and non-functional requirements.
2. **Define virtualization strategy and platforms** including hypervisors, container platforms, and cloud services.
3. **Define topology, orchestration, automation, scaling,** and lifecycle management of virtualized resources.
4. **Apply virtualization patterns and standards** (e.g., resource optimization, high availability, disaster recovery). Design for cloud-native and hybrid architectures where appropriate.
5. **Document security and compliance requirements.** Validate virtualization architecture with stakeholders and ensure feasibility.
6. **Maintain and evolve** virtualization architecture as technology and business requirements change.

## Inputs

- Application architecture and requirements
- Non-functional requirements (performance, scalability, availability, portability)
- Technology standards and reference architectures
- Existing virtualization and cloud infrastructure

## Outputs

- Virtualization architecture diagrams and models
- Platform specifications, container and orchestration designs
- Resource allocation and capacity specifications
- Cloud integration and hybrid architecture designs

## Roles

- Technology Architect (A)
- Application Architect (C)
- Lead Enterprise Architect (I)

## Common Issues with an Immature Capability

- Inconsistent virtualization approaches across environments, creating complexity and operational overhead.
- Resource sprawl and inefficient utilization due to lack of proper governance and monitoring.
- Poor container strategy, leading to unmanaged proliferation and security risks.
- Vendor lock-in from over-reliance on proprietary virtualization or cloud platforms.

## Pragmatic Approach – Essentials That Are Needed for Success

- Start with workload analysis and understand application requirements. Use reference architectures and standardize on platforms.
- Design for cloud-native where appropriate - embrace containers and orchestration for modern applications.
- Plan for hybrid and multi-cloud - design for portability and avoid vendor lock-in.
- Automate provisioning and lifecycle management. Build in observability for resource utilization, performance, and costs.

## Additional Information

- TOGAF Technology Architecture
- Cloud Native Computing Foundation (CNCF)
- Container Orchestration Patterns
