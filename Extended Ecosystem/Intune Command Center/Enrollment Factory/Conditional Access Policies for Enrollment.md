# Conditional Access Policies for Enrollment

## Overview

This comprehensive guide details the design, implementation, and management of Conditional Access (CA) policies specifically optimized for device enrollment scenarios in Microsoft Intune. It provides strategic approaches for balancing security requirements with a smooth enrollment experience, ensuring devices can be securely onboarded while maintaining appropriate access controls.

## Table of Contents

1. [Conditional Access Fundamentals for Enrollment](#conditional-access-fundamentals-for-enrollment)
2. [Policy Design Principles](#policy-design-principles)
3. [Enrollment-Specific Policy Configurations](#enrollment-specific-policy-configurations)
4. [Platform-Specific Considerations](#platform-specific-considerations)
5. [Authentication Methods During Enrollment](#authentication-methods-during-enrollment)
6. [Risk-Based Policies for Enrollment](#risk-based-policies-for-enrollment)
7. [Temporary Access and Bootstrapping](#temporary-access-and-bootstrapping)
8. [Staged Policy Implementation](#staged-policy-implementation)
9. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
10. [Advanced Scenarios](#advanced-scenarios)
11. [Policy Templates and Examples](#policy-templates-and-examples)
12. [Integration with Identity Governance](#integration-with-identity-governance)

## Conditional Access Fundamentals for Enrollment

### Key Concepts for Enrollment Scenarios

Understanding these core concepts is essential for enrollment CA policy design:

1. **Device Identity Establishment**:
   - During enrollment, devices transition from unidentified to managed state
   - Initial authentication occurs before device compliance can be evaluated
   - Device identity creation is a prerequisite for applying device-based conditions

2. **Enrollment-Specific Service Dependencies**:
   - Microsoft Intune Service
   - Azure AD Join process
   - Enterprise State Roaming
   - Device Registration Service
   - Windows Autopilot Deployment Service (for Autopilot)

3. **Critical Assignments and Permissions**:
   - Device enrollment restrictions in Intune
   - RBAC permissions for enrollment
   - Azure AD device settings configuration
   - License requirements for enrollment

### Enrollment Process Authentication Flow

The authentication sequence during enrollment:

1. User credentials validation against Azure AD
2. Conditional Access policy evaluation 
3. Device identification and registration
4. MDM enrollment protocol authentication
5. Certificate issuance for device authentication
6. Policy and profile delivery to device

### Potential Security Challenges

Common security considerations during enrollment:

1. **Authentication Bootstrapping**:
   - Initial device has no identity or compliance status
   - Traditional security controls may block enrollment process
   - Need mechanisms to establish identity securely

2. **Network Considerations**:
   - Devices may enroll from untrusted networks
   - Network-based policies may interfere with enrollment
   - VPN requirements may create circular dependencies

3. **Compliance State Transition**:
   - Devices start in non-compliant state
   - Grace periods for compliance status achievement
   - Temporary access requirements during provisioning

## Policy Design Principles

### Strategic Design Approach

Key principles for effective enrollment CA design:

1. **Segmentation and Layering**:
   - Create dedicated enrollment-specific policies
   - Layer policies by combining enrollment exemptions with general security policies
   - Use named locations to differentiate enrollment contexts

2. **Exclusion-Based Design Pattern**:
   - Exclude enrollment service endpoints from more restrictive policies
   - Create enrollment-specific policies with appropriate conditions
   - Use authentication context to differentiate enrollment vs. post-enrollment

3. **Least Privilege Principle**:
   - Grant minimal permissions needed for successful enrollment
   - Restrict enrollment capabilities to specific users/groups
   - Implement time-bound access for enrollment administrators

### Policy Component Analysis

Carefully consider each policy component for enrollment scenarios:

1. **Assignments**:
   - **Users and groups**: Target enrollment policies to specific user populations
   - **Cloud apps**: Identify and target enrollment-dependent services
   - **Conditions**: Tailor network, device, and risk conditions appropriately

2. **Access Controls**:
   - **Grant controls**: Balance MFA requirements with enrollment usability
   - **Session controls**: Consider impacts on enrollment session persistence
   - **Custom controls**: Integrate third-party enrollment-specific validations

### Design Decision Framework

Systematic approach to enrollment CA policy design:

1. **Risk Assessment**:
   - Identify enrollment security threats and vulnerabilities
   - Evaluate likelihood and impact of security incidents
   - Determine acceptable risk level for enrollment process

2. **Security vs. Usability Balance**:
   - Assess administrative overhead of security controls
   - Evaluate user experience impact during enrollment
   - Quantify potential support costs from policy complexity

3. **Technical Constraints Mapping**:
   - Document platform-specific enrollment limitations
   - Identify service dependencies and requirements
   - Map network infrastructure constraints

## Enrollment-Specific Policy Configurations

### Critical Cloud Application Configuration

Configure CA policies to address these essential enrollment apps:

1. **Microsoft Intune Enrollment**:
   - App ID: 0000000a-0000-0000-c000-000000000000
   - Essential for MDM enrollment protocol

2. **Azure Device Registration Service**:
   - App ID: 01cb2876-7ebd-4aa4-9cc9-d28bd4d359a9
   - Required for device identity creation

3. **Microsoft Intune**:
   - App ID: d4ebce55-015a-49b5-a083-c84d1797ae8c
   - Needed for policy and profile delivery

4. **Microsoft Autopilot**:
   - App ID: b90d5b8f-5503-4153-b545-b31cecfaece2
   - Essential for Autopilot provisioning

### Enrollment-Specific Named Locations

Create and configure these named locations for enrollment:

1. **Corporate Enrollment Locations**:
   - Internal networks designated for IT-driven enrollment
   - Trusted enrollment environments with physical security
   - Wired networks with filtering and monitoring

2. **Vendor/Partner Locations**:
   - Trusted partner facilities for device preparation
   - Pre-provisioning and white glove service locations
   - Device staging areas with controlled access

3. **Factory Provisioning Locations**:
   - OEM facilities performing pre-enrollment
   - Drop-ship preparation environments
   - Vendor provisioning networks

### Authentication Requirements

Tailor authentication requirements specifically for enrollment:

1. **MFA Configuration**:
   - Consider MFA impact on bulk enrollment scenarios
   - Evaluate number verification vs. app-based approval methods
   - Implement location-based MFA exemptions for controlled enrollment

2. **Authentication Strength**:
   - Define appropriate authentication strength for enrollment context
   - Balance security requirements with practical enrollment workflows
   - Consider hardware token requirements for high-security environments

3. **Authentication Persistence**:
   - Configure appropriate token lifetimes for enrollment
   - Set session persistence parameters 
   - Consider single sign-on impacts during multi-stage enrollment

## Platform-Specific Considerations

### Windows Enrollment Considerations

Tailor CA policies for Windows enrollment scenarios:

1. **Windows Autopilot**:
   - Ensure policies permit Azure AD Join during OOBE
   - Allow access to Windows Autopilot service endpoints
   - Consider self-deploying mode authentication requirements
   - Configure white glove provisioning access appropriately

2. **Domain Join Considerations**:
   - For hybrid Azure AD join, ensure connectivity to on-premises AD
   - Configure policies to allow hybrid join process
   - Address certificate-based authentication needs
   - Allow access to domain controllers during enrollment

3. **Windows 365 Cloud PC Provisioning**:
   - Permit provisioning service access
   - Configure policies for virtual device enrollment
   - Address network requirements for streaming endpoints

### iOS/iPadOS Enrollment Considerations

Apple-specific enrollment CA configuration:

1. **Apple Business/School Manager Integration**:
   - Allow enrollment from ABM/ASM service endpoints
   - Configure policies for DEP enrollment flow
   - Ensure token-based enrollment authentication works with CA

2. **User Authentication Flow**:
   - Consider Company Portal app authentication requirements
   - Address web-based vs. app-based enrollment differences
   - Configure policies for Shared iPad enrollment scenarios

3. **Supervised Mode Considerations**:
   - Adjust policies based on supervision state
   - Consider different requirements for supervised vs. unsupervised
   - Address kiosk and shared device enrollment needs

### Android Enrollment Considerations

Android-specific enrollment policy considerations:

1. **Work Profile Enrollment**:
   - Configure appropriate authentication for profile creation
   - Consider impact of MFA on profile setup process
   - Address Google account integration requirements

2. **Android Enterprise Enrollment Types**:
   - Fully managed device enrollment considerations
   - Corporate-owned, personally-enabled (COPE) requirements
   - Dedicated device authentication configuration

3. **Zero-touch Provisioning**:
   - Allow access from Google Zero-touch service
   - Configure authentication for automated provisioning
   - Address token-based enrollment requirements

### macOS Enrollment Considerations

Apple macOS enrollment policy considerations:

1. **User-Approved MDM Enrollment**:
   - Address user approval requirement impact on policies
   - Configure appropriate authentication for approval flow
   - Consider System Extension approvals

2. **Automated Device Enrollment (ADE)**:
   - Allow Apple Business Manager integration
   - Configure policies for automated enrollment
   - Address bootstrap token requirements

3. **Authentication Methods**:
   - Support for modern authentication on older macOS versions
   - Certificate-based authentication considerations
   - Local admin account provisioning requirements

## Authentication Methods During Enrollment

### MFA Implementation Strategy

Strategic MFA configuration for enrollment:

1. **Temporary MFA Exclusions**:
   - Time-bound exclusions during enrollment windows
   - Location-based exclusions for trusted enrollment environments
   - Group-based exclusions for devices during provisioning

2. **Step-Up Authentication**:
   - Progressive authentication requirements as enrollment progresses
   - Initial basic auth followed by stronger auth later in process
   - Risk-based adaptive requirements during enrollment stages

3. **Authentication Method Selection**:
   - Choose appropriate MFA methods for enrollment context
   - Consider Microsoft Authenticator app vs. SMS vs. FIDO2
   - Implement resilient backup methods for enrollment scenarios

### Authentication Strength Policies

Configure authentication strength specifically for enrollment:

1. **Phishing-Resistant Requirements**:
   - Determine when to require phishing-resistant methods
   - Configure certificate-based authentication where appropriate
   - Balance FIDO2 security benefits with enrollment practicality

2. **Authentication Context**:
   - Implement authentication contexts specific to enrollment
   - Create enrollment authentication context for targeted policies
   - Differentiate provisioning vs. management authentication contexts

### User and Group Strategy

Optimize user targeting for enrollment authentication:

1. **Enrollment Administrator Policies**:
   - Create specific policies for enrollment administrators
   - Implement privileged access management for enrollment roles
   - Configure time-bound elevated access for provisioning

2. **Service Account Management**:
   - Configure appropriate policies for enrollment service accounts
   - Address automation requirements for bulk operations
   - Implement secure credential management for enrollment services

3. **End-User Enrollment Experience**:
   - Balance security with user friction during self-enrollment
   - Configure policies for supervised vs. self-service enrollment
   - Address first-time enrollment vs. re-enrollment differences

## Risk-Based Policies for Enrollment

### User Risk Configuration

Configure user risk handling during enrollment:

1. **User Risk Assessment During Enrollment**:
   - Define acceptable user risk levels for different enrollment scenarios
   - Configure risk-adaptive authentication requirements
   - Implement remediation paths for risky users during enrollment

2. **User Risk Level Mapping**:
   - Low risk: Allow standard enrollment
   - Medium risk: Require additional verification
   - High risk: Restrict to supervised enrollment only

3. **Risk Remediation Options**:
   - Self-service password reset integration
   - MFA proofing requirements
   - Admin-driven risk remediation workflows

### Sign-in Risk Management

Configure sign-in risk policies for enrollment:

1. **Sign-in Risk Evaluation**:
   - Assess login behavior anomalies during enrollment
   - Monitor location and device characteristics
   - Identify potential enrollment-time attacks

2. **Atypical Travel Handling**:
   - Configure policies for enrollment from unexpected locations
   - Address legitimate global deployment scenarios
   - Implement verification processes for unusual enrollment locations

3. **Impossible Travel Mitigation**:
   - Configure appropriate time windows for distributed enrollments
   - Implement approval workflows for flagged enrollment attempts
   - Create country/region-based policies for global deployments

### Device Risk Integration

Incorporate device risk assessment into enrollment workflow:

1. **Pre-enrollment Risk Assessment**:
   - Evaluate device health before enrollment completion
   - Implement partner compliance solutions during provisioning
   - Configure attestation requirements where applicable

2. **Zero-Day Risk Mitigation**:
   - Address unknown device patching status during enrollment
   - Configure grace periods for compliance achievement
   - Implement compensating controls during vulnerability remediation

3. **Compliance Transition Strategy**:
   - Define path from unmanaged to fully compliant
   - Configure staged compliance requirements
   - Implement grace periods appropriate to risk level

## Temporary Access and Bootstrapping

### Bootstrapping Strategy

Solutions for the enrollment authentication bootstrap problem:

1. **Temporary Access Credentials**:
   - Create time-limited enrollment credentials
   - Configure just-in-time access for enrollment
   - Implement approval workflows for enrollment access

2. **Location-Based Bootstrapping**:
   - Define secure enrollment locations
   - Configure relaxed policies for trusted networks
   - Implement network segmentation for enrollment traffic

3. **Device-Based Bootstrapping**:
   - Use trusted devices for enrolling new devices
   - Implement enrollment station concept
   - Configure device certificate bootstrapping

### Time-Limited Exceptions

Configure time-bound enrollment exceptions:

1. **Time Window Configuration**:
   - Schedule enrollment windows with adjusted policies
   - Configure automatic policy enablement/disablement
   - Implement enrollment scheduling system

2. **Just-in-Time Access**:
   - Enable enrollment permissions only when needed
   - Configure Privileged Identity Management for enrollment roles
   - Implement approval workflows for enrollment access

3. **Staged Policy Activation**:
   - Define progressive security policy implementation
   - Configure automatic policy transition based on enrollment state
   - Implement enrollment phases with increasing security requirements

### Secure Enrollment Stations

Implement physically secured enrollment solutions:

1. **Enrollment Station Design**:
   - Configure dedicated enrollment devices
   - Implement physical security controls
   - Create isolated network segments for enrollment

2. **Enrollment Admin Workstations**:
   - Harden devices used for enrollment administration
   - Implement privileged access workstation concept
   - Configure enhanced monitoring for enrollment stations

3. **Kiosk Mode Enrollment**:
   - Configure self-service enrollment kiosks
   - Implement session isolation between enrollments
   - Configure automatic state reset between users

## Staged Policy Implementation

### Progressive Policy Implementation

Implement enrollment security in stages:

1. **Phase 1: Basic Enrollment Security**:
   - Allow enrollment with minimal restrictions
   - Implement basic user verification
   - Focus on successful enrollment completion

2. **Phase 2: Enhanced Security Measures**:
   - Add location-based restrictions
   - Implement risk-based policies
   - Require stronger authentication for sensitive groups

3. **Phase 3: Zero Trust Enrollment**:
   - Implement comprehensive device attestation
   - Require phishing-resistant authentication
   - Deploy continuous access evaluation

### Policy Transition Triggers

Define events that trigger policy progression:

1. **Time-Based Transitions**:
   - Schedule policy transitions at specific dates
   - Configure automatic policy updates
   - Implement gradual security enhancement

2. **Adoption-Based Triggers**:
   - Transition policies based on enrollment success rates
   - Measure and respond to support ticket volumes
   - Adjust based on user feedback

3. **Risk-Triggered Adjustments**:
   - Increase security in response to threat intelligence
   - Adjust based on observed attack patterns
   - Implement temporary lockdowns when needed

### Communication Strategy

Develop a plan for communicating policy changes:

1. **User Notification Strategy**:
   - Advance communication of policy changes
   - Clear guidance on authentication requirements
   - Visual explainers for enrollment steps

2. **IT Staff Preparation**:
   - Training on policy transition timeline
   - Support protocols for each phase
   - Troubleshooting guides for common issues

3. **Executive Reporting**:
   - Security posture improvement metrics
   - Risk reduction measurement
   - Balance business impact with security enhancement

## Monitoring and Troubleshooting

### CA Policy Monitoring

Implement comprehensive policy monitoring:

1. **Sign-in Logs Analysis**:
   - Review enrollment authentication patterns
   - Monitor for policy-related failures
   - Track MFA usage during enrollment

2. **Policy Report Monitoring**:
   - Review policy effectiveness reports
   - Track policy application frequency
   - Identify policies causing user friction

3. **Alert Configuration**:
   - Configure alerts for unusual enrollment patterns
   - Set up notifications for policy failure spikes
   - Implement automated response to potential attacks

### Enrollment Success Tracking

Measure enrollment effectiveness:

1. **Enrollment Completion Rates**:
   - Track successful enrollments vs. attempts
   - Measure time to complete enrollment
   - Identify abandonment points in process

2. **Policy Impact Analysis**:
   - Correlate policy changes with enrollment metrics
   - Measure support ticket volume by policy
   - Calculate business impact of security controls

3. **User Experience Measurement**:
   - Collect feedback on enrollment process
   - Track satisfaction scores
   - Measure productivity impact of enrollment controls

### Troubleshooting Methodology

Systematic approach to enrollment policy troubleshooting:

1. **Diagnostic Data Collection**:
   - Gather Azure AD sign-in logs
   - Collect device enrollment logs
   - Review conditional access reports

2. **Common Failure Analysis**:
   - MFA failures during enrollment
   - Location-based policy blocks
   - Device compatibility issues with policies

3. **Remediation Strategies**:
   - Temporary policy exclusions
   - Break-glass accounts for critical scenarios
   - Guided troubleshooting for end users

## Advanced Scenarios

### High-Security Environments

Enhanced security for sensitive deployments:

1. **Zero Trust Enrollment**:
   - Implement continuous authentication during enrollment
   - Require hardware attestation for device verification
   - Deploy enhanced monitoring during provisioning

2. **Air-Gapped Enrollment**:
   - Configure policies for disconnected environments
   - Implement certificate-based enrollment
   - Design secure bootstrapping for isolated networks

3. **Classified Environment Configuration**:
   - Implement separation of duties during enrollment
   - Configure multi-party authorization
   - Deploy enhanced auditing and verification

### BYOD-Specific Considerations

Tailor policies for personally-owned devices:

1. **BYOD Enrollment Policies**:
   - Balance security with privacy considerations
   - Configure appropriate access boundaries
   - Implement terms of use acceptance

2. **Limited Enrollment Scope**:
   - Define appropriate management scope for personal devices
   - Configure privacy-preserving enrollment options
   - Implement user consent and transparency

3. **Data Protection Enforcement**:
   - Configure app protection policies during enrollment
   - Implement conditional launching policies
   - Deploy secure container configurations

### Frontline Worker Scenarios

Address unique frontline device enrollment needs:

1. **Shared Device Enrollment**:
   - Configure policies for multi-user devices
   - Implement shared device mode enrollment
   - Address authentication in shared contexts

2. **Kiosk Provisioning**:
   - Configure unattended enrollment for kiosks
   - Implement auto-provisioning with minimal interaction
   - Deploy secure single-purpose configurations

3. **Ruggedized Device Considerations**:
   - Address limited input capabilities
   - Configure policies for offline-first devices
   - Implement simplified enrollment for field devices

## Policy Templates and Examples

### Standard Security Enrollment Policy

Basic enrollment policy template:

```
Policy Name: Standard Enrollment Access
State: Enabled

Assignments:
- Users/Groups: All Users
- Exclude: Enrollment Administrators, Break-Glass Accounts
- Cloud Apps: Microsoft Intune Enrollment, Device Registration Service
- Conditions:
  - Locations: Any location
  - Device Platforms: Any platform

Access Controls:
- Grant: Require MFA
- Session: None
```

### Enhanced Security Enrollment Template

Intermediate security level template:

```
Policy Name: Enhanced Enrollment Security
State: Enabled

Assignments:
- Users/Groups: All Users
- Exclude: Enrollment Administrators
- Cloud Apps: Microsoft Intune Enrollment, Device Registration Service
- Conditions:
  - Locations: Exclude trusted locations
  - Device Platforms: Any platform
  - User Risk: Low, Medium
  - Sign-in Risk: Low, Medium

Access Controls:
- Grant: Require MFA, Require device to be marked as compliant
  (Require one of the selected controls)
- Session: None
```

### High Security Enrollment Template

Advanced security enrollment template:

```
Policy Name: High Security Enrollment
State: Enabled

Assignments:
- Users/Groups: Executive Team, Finance, HR
- Exclude: None
- Cloud Apps: Microsoft Intune Enrollment, Device Registration Service
- Conditions:
  - Locations: Named locations only
  - Device Platforms: Windows, macOS
  - User Risk: None
  - Sign-in Risk: None

Access Controls:
- Grant: Require MFA, Require device to be marked as compliant,
  Require approved client app, Require authentication strength
- Session: Sign-in frequency
```

## Integration with Identity Governance

### Privileged Access Management

Secure enrollment administrative functions:

1. **Enrollment Administrator PIM**:
   - Configure just-in-time access for enrollment admins
   - Implement approval workflows for elevated access
   - Define appropriate time windows for enrollment operations

2. **Role Separation Strategy**:
   - Separate device registration from policy management
   - Implement least-privilege model for enrollment functions
   - Configure approval chains for sensitive operations

3. **Administrative MFA Requirements**:
   - Require strong authentication for enrollment administration
   - Implement device-bound authentication for admins
   - Configure passwordless options for administrative functions

### Access Reviews and Certification

Implement governance for enrollment permissions:

1. **Regular Access Reviews**:
   - Schedule quarterly review of enrollment permissions
   - Implement attestation for continued access
   - Configure automated revocation of unused access

2. **Entitlement Management**:
   - Create access packages for enrollment roles
   - Implement time-bound assignment of enrollment functions
   - Configure appropriate approval workflows

3. **Compliance Reporting**:
   - Generate reports on enrollment privilege distribution
   - Track separation of duties compliance
   - Document governance for audit requirements

### Integration with External Identity Providers

Configure CA policies for federated enrollment:

1. **SAML Provider Integration**:
   - Configure enrollment authentication with external IdPs
   - Implement appropriate claims mapping
   - Address MFA passthrough requirements

2. **B2B Enrollment Considerations**:
   - Configure policies for partner enrollment access
   - Implement appropriate external identity verification
   - Address cross-tenant enrollment requirements

3. **Identity Verification Services**:
   - Integrate third-party identity verification
   - Configure progressive identity proofing
   - Implement appropriate verification based on device sensitivity

---

## Additional Resources

- [Microsoft Learn: Conditional Access](https://learn.microsoft.com/en-us/azure/active-directory/conditional-access/)
- [Intune Enrollment Documentation](https://learn.microsoft.com/en-us/mem/intune/enrollment/)
- [Zero Trust Security Model](https://learn.microsoft.com/en-us/security/zero-trust/)
- [Microsoft Security Best Practices](https://learn.microsoft.com/en-us/security/compass/microsoft-security-compass-introduction)

---

*Last updated: April 2025*