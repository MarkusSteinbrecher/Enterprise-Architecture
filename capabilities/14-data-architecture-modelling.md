# Capability 14: Data Architecture Modelling

**Domain:** Architecture Development – Data Architecture

**Tagline:** Design logical and physical data structures that implement business objects.

## Definition

Data Architecture Modelling involves creating detailed logical and physical data models that translate business objects into implementable data structures. It defines how data is organized, stored, and accessed, ensuring data consistency, integrity, and optimal performance.

## Objectives

Transform conceptual business objects into logical and physical data models that can be implemented in databases and systems. Ensure data structures support business requirements while maintaining data quality, integrity, and performance. Enable effective database design and data integration across the enterprise.

## Tasks

1. **Translate business objects** into logical data models, defining entities, attributes, primary/foreign keys, and relationships.
2. **Define data types,** constraints, and validation rules at the technical level.
3. **Apply data modeling principles** including normalization, referential integrity, and data standardization.
4. **Create physical data models** optimized for specific database platforms and performance requirements.
5. **Validate data models** with stakeholders (data owners, architects, developers) and ensure alignment with business requirements.
6. **Maintain and evolve** data models as business and technical requirements change.

## Inputs

- Conceptual data model (business object model)
- Business requirements and use cases
- Existing database schemas and data models
- Performance and scalability requirements
- Technology standards and database platforms

## Outputs

- Logical data models (entity-relationship diagrams, ERDs)
- Physical data models (database schemas and specs)
- Data dictionary and metadata documentation
- Data model to business object mapping
- Data integrity and validation rules

## Roles

- Data Architect (A)
- Database Administrator
- Application Architect
- Data Owner/Steward
- Lead Enterprise Architect

## Common Issues with an Immature Capability

- Inconsistent data models across systems, data silos and integration challenges.
- Poor normalization or over-normalization, causing performance issues or data redundancy.
- Lack of standardization in naming conventions, data types, and methods.
- Disconnect between logical and physical models, implementation gaps.
- Inadequate documentation, making maintenance and evolution difficult.

## Pragmatic Approach – Essentials That Are Needed for Success

- Structure leads physical: Define logical models before physical implementation.
- Validate with both business and technical stakeholders
- Use standard notation (e.g., ERD, UML) and consistent naming conventions.
- Balance normalization with performance
- Model for reusability - design data structures shared across applications.
- Document data dictionaries, definitions, and rationale — keep evolution in mind.

## Additional Information

- Data Modeling Techniques (Normalization, Denormalization)
- TOGAF Data Architecture
- DAMA-DMBOK Data Modeling
