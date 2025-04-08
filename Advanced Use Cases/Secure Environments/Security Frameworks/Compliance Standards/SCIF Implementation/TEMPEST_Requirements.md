# TEMPEST Requirements

## Overview

TEMPEST refers to the standards, guidelines, and security measures designed to protect sensitive information from being compromised by unintentional electromagnetic emanations. This document outlines the TEMPEST requirements for printer infrastructure within Sensitive Compartmented Information Facilities (SCIFs) and other secure environments.

## TEMPEST Fundamentals

### What is TEMPEST?

TEMPEST is both:

1. A codename for the security concerns related to compromising emanations from electronic equipment
2. A set of standards for securing equipment against these vulnerabilities

Electronic devices, including printers, can unintentionally emit electromagnetic signals that can be intercepted and reconstructed to reveal the original data being processed. TEMPEST countermeasures aim to prevent this form of surveillance.

### TEMPEST Classification Levels

TEMPEST protection is typically classified into three levels:

- **Level I** - Compromising Emanations Laboratory Test Standard
- **Level II** - Laboratory Test Standard for Protected Facility Equipment
- **Level III** - Laboratory Test Standard for Tactical Mobile Equipment

For SCIF environments, Level I or Level II equipment is typically required, depending on the classification level of information processed and the facility's physical location.

## TEMPEST Requirements for Printers

### Hardware Requirements

#### Certified Equipment

- **TEMPEST Certification**: Printers must be certified to the appropriate TEMPEST level based on facility requirements
- **Certification Verification**: Documentation verifying TEMPEST certification should be maintained and available for inspection
- **Equipment Labeling**: Proper labeling of TEMPEST-certified equipment must be maintained
- **Certification Currency**: Ensure certification is current and not expired

#### Physical Design

- **Shielding**: Appropriate electromagnetic shielding materials in printer construction
- **Filtered Connections**: All electrical connections must have appropriate filters
- **Grounding**: Proper grounding of all components
- **Cable Shielding**: Use of shielded cables for all connections
- **Power Line Filtering**: Implementation of power line filters to prevent leakage

### Installation Requirements

#### Physical Placement

- **RED/BLACK Separation**: Maintain physical separation between classified (RED) and unclassified (BLACK) equipment
- **Zone Protection**: Follow zone protection guidelines based on facility TEMPEST countermeasure requirements
- **Minimum Distances**: Maintain required distances from:
  - Facility perimeter
  - Windows and other potential RF leak points
  - Unclassified equipment
  - Uncontrolled areas

#### Cabling and Power

- **Dedicated Circuits**: Use of dedicated power circuits
- **Cable Routing**: Appropriate routing of cables to minimize emanation risks
- **Cable Separation**: Maintain separation between RED and BLACK cables
- **Conduit Requirements**: Use of appropriate conduit for cables when required
- **Fiber Optics**: Consider fiber optic connections where possible to eliminate electrical emanations

#### Network Considerations

- **Network Isolation**: Physical isolation from non-TEMPEST networks
- **Connectivity Limitations**: Restrictions on wireless or external network connections
- **Network Equipment**: Use of TEMPEST-certified network equipment for printer connections
- **Fiber Preference**: Preference for fiber optic network connections over copper

### Operational Requirements

#### Usage Policies

- **Processing Restrictions**: Limitations on the classification levels that can be processed
- **Operational Modes**: Specific operational modes for different security levels
- **Concurrent Operations**: Rules for concurrent processing of different classification levels
- **Distance Requirements**: Operational distance requirements from non-cleared personnel

#### Maintenance Procedures

- **Cleared Personnel**: Maintenance performed only by appropriately cleared personnel
- **Maintenance Equipment**: Use of TEMPEST-certified maintenance equipment
- **Component Replacement**: Requirements for replacement components
- **Disposal Procedures**: Secure disposal of TEMPEST equipment and components
- **Documentation Control**: Control of maintenance documentation and records

#### Periodic Testing

- **Emanation Testing**: Schedule for TEMPEST emanation testing
- **Test Documentation**: Maintenance of test results and documentation
- **Remediation Procedures**: Processes for addressing testing failures
- **Certification Renewal**: Requirements for periodic recertification

## Facility Considerations

### Physical Security Requirements

- **Shielded Enclosures**: Requirements for RF shielded rooms or areas for printers
- **Inspections**: Physical security inspection requirements
- **Access Controls**: Access restrictions to TEMPEST equipment areas
- **Visual Security**: Prevention of visual observation of classified information

### Facility Zones

- **Zone Designations**: Understanding zone designations (0, 1, 2, 3) and their implications
- **Zone Requirements**: Meeting physical and technical security requirements for zones
- **Inspection Points**: Establishing inspection points between zones
- **Visitor Control**: Managing visitors between zones

### Infrastructure Support

- **Power Conditioning**: Requirements for power conditioning and filtration
- **HVAC Considerations**: Addressing HVAC penetrations and requirements
- **Signal Line Filters**: Implementation of signal line filters
- **Ground Systems**: Proper grounding systems for TEMPEST protection

## Testing and Certification

### Initial Certification

- **Testing Agencies**: Authorized agencies for TEMPEST testing
- **Test Procedures**: Overview of testing procedures
- **Certification Documentation**: Required documentation for certification
- **Acceptance Criteria**: Criteria for passing TEMPEST certification

### Periodic Testing

- **Testing Frequency**: Required frequency of TEMPEST testing
- **Test Coverage**: Areas and systems requiring testing
- **Test Equipment**: Authorized test equipment
- **Test Documentation**: Requirements for test documentation

### Configuration Management

- **Baseline Configuration**: Establishing baseline configurations for TEMPEST systems
- **Change Control**: Managing changes to TEMPEST-certified systems
- **Documentation Requirements**: Configuration documentation requirements
- **Lifecycle Management**: Managing TEMPEST equipment through lifecycle

## Implementation Guidelines

### Risk Assessment

- **Threat Analysis**: Assessing TEMPEST threats to the facility
- **Vulnerability Assessment**: Identifying potential vulnerabilities
- **Risk Mitigation**: Strategies for mitigating identified risks
- **Continuous Monitoring**: Approaches for ongoing risk assessment

### Countermeasure Selection

- **Equipment Selection**: Guidelines for selecting appropriate TEMPEST equipment
- **Cost-Benefit Analysis**: Balancing security requirements with costs
- **Layered Defense**: Implementing multiple layers of TEMPEST protection
- **Alternative Approaches**: When non-TEMPEST solutions may be appropriate

### Documentation and Training

- **Policy Development**: Creating TEMPEST policies and procedures
- **Personnel Training**: Training requirements for personnel
- **Documentation Standards**: Standards for TEMPEST documentation
- **Awareness Programs**: Developing TEMPEST awareness programs

## Compliance and Audit

### Regulatory Framework

- **Governing Directives**: Key directives governing TEMPEST requirements
- **Compliance Responsibilities**: Organizational responsibilities for compliance
- **Reporting Requirements**: Required reporting for TEMPEST compliance
- **Waiver Process**: Process for requesting waivers or exceptions

### Audit Procedures

- **Audit Scope**: Areas covered in TEMPEST compliance audits
- **Audit Frequency**: Required frequency of audits
- **Audit Documentation**: Documentation requirements for audits
- **Finding Remediation**: Process for addressing audit findings

### Incident Response

- **Compromise Indicators**: Indicators of potential TEMPEST compromise
- **Reporting Procedures**: Procedures for reporting potential compromises
- **Investigation Process**: Process for investigating TEMPEST incidents
- **Remediation Actions**: Required actions following a confirmed compromise

## References and Resources

- Intelligence Community Directive (ICD) 705
- NSTISSAM TEMPEST/1-92 (or current version)
- Committee on National Security Systems (CNSS) Instructions
- NIST Special Publication 800-53
- ISO/IEC 27001 controls related to TEMPEST

## Related Documentation

- [SCIF-Compliant Printer Setup](../../../SCIF-Compliant%20Printer%20Setup.md)
- [Air-Gapped Network Printing](../../../Air-Gapped%20Network%20Printing.md)
- [Physical Security: EMI Shielding](../../../Physical%20Security/Environmental%20Controls/EMI_Shielding.md)
- [Physical Security: Faraday Cage Installation](../../../Physical%20Security/Environmental%20Controls/Faraday_Cage_Installation.md)
