# Compliance Policy Creation Guide

## Overview

This document provides comprehensive guidelines for creating effective compliance policies in Microsoft Intune. Compliance policies define the rules and settings that devices must meet to be considered compliant, which can then be used with Conditional Access to allow or block access to corporate resources.

## Policy Components

### Device Health
- **Jailbreak Detection**: Identifies compromised iOS/iPadOS devices
- **Microsoft Defender**: Requires Microsoft Defender to be enabled, up-to-date, and reporting healthy status
- **Device Threat Levels**: Set actions based on threat levels detected by Mobile Threat Defense solutions
- **Windows Health Attestation**: Ensures Secure Boot, Code Integrity, Early Launch Antimalware, and TPM are enabled

### Device Properties
- **Minimum OS Version**: Sets required minimum version for each platform
- **Maximum OS Version**: Sets maximum allowed OS version
- **Valid Operating Systems**: Specify which operating systems are permitted
- **Manufacturer/Model/Device Type**: Control hardware inventory by limiting to specific makes/models

### System Security
- **Encryption**: Require storage encryption on devices
- **Password Requirements**: Define complexity, length, history, and expiration
- **Firewalls**: Ensure Windows Firewall is active
- **Antivirus**: Require updated antivirus solutions
- **Secure Boot**: Mandate Secure Boot be enabled
- **Code Integrity**: Ensure drivers are properly signed

### Configuration Requirements
- **Conditional Access Integration**: Verify required applications and configurations
- **Certificates**: Require specific certificates to be installed
- **App Protection**: Ensure Microsoft App Protection policies are assigned

## Platform-Specific Requirements

### Windows
- **BitLocker Encryption**: Require device encryption
- **Secure Boot**: Ensure hardware security features are active
- **TPM Version**: Specify minimum TPM version (2.0 recommended)
- **Antivirus Signatures**: Set maximum age for definition updates

### iOS/iPadOS
- **Supervised Mode**: Require Apple Supervised mode for enhanced management
- **FRP Lock**: Detect Factory Reset Protection status
- **Managed Email Profile**: Ensure corporate email profile is in place

### Android
- **SafetyNet Attestation**: Verify device integrity
- **Threat Scan**: Require Google Play Protect scans
- **Enterprise Device**: Distinguish between personally-owned and corporate devices

### macOS
- **FileVault Encryption**: Ensure disk encryption is enabled
- **Gatekeeper**: Control application installation sources
- **System Integrity Protection**: Verify SIP is active

## Best Practices

### Policy Naming Conventions
```
[Platform]-[Classification]-[Purpose]-[Version]
```
Example: `WIN10-CORP-StandardCompliance-v1.0`

### Grouping and Assignment Strategy
- **Platform-Specific**: Create separate policies for each OS platform
- **Risk Levels**: Consider creating tiered policies (Basic, Enhanced, Strict)
- **User Types**: Adjust requirements based on job roles and access needs
- **Exclusion Groups**: Always create exception groups for testing and emergency access
- **Piloting Strategy**: Use dynamic groups for phased rollout

### Compliance Timelines
- **Grace Period**: Set appropriate remediation grace periods based on policy severity
- Non-critical: 3-7 days
- Security-critical: 1-3 days
- High-security environments: 8-24 hours

### Notification Templates
- **Company Branding**: Include corporate logo in notifications
- **Support Information**: Always provide help desk contact information
- **Self-Help**: Link to remediation instructions in portal
- **Escalation Path**: Define timeline for notification escalation
- **Message Customization**: Use clear, action-oriented language

## Implementation Workflow

1. **Assessment**
   - Inventory current devices and OS versions
   - Identify security requirements and regulatory needs
   - Establish baseline requirements for all devices

2. **Design**
   - Draft policies for each platform
   - Define compliance criteria based on security posture
   - Create testing protocols for validation

3. **Testing**
   - Deploy to pilot group
   - Validate reporting and monitoring
   - Tune policy settings based on feedback

4. **Deployment**
   - Implement phased rollout plan
   - Monitor compliance rates and issues
   - Provide support resources and documentation

5. **Maintenance**
   - Schedule regular policy reviews (quarterly recommended)
   - Update OS version requirements as new releases are validated
   - Track emerging security threats and adjust policies accordingly

## Troubleshooting

### Common Issues and Resolutions

#### Policy Not Applied
- **Check Assignment**: Verify policy is assigned to the correct groups
- **Sync Device**: Initiate manual sync on device
- **Check Conflicts**: Look for policy conflicts in reporting

#### False Non-Compliance
- **Encryption Reporting**: Ensure encryption APIs are functioning
- **Check Scoping**: Verify device is in correct groups
- **Grace Period**: Check if within remediation grace period

#### User Experience Issues
- **Notification Fatigue**: Adjust frequency and content of notifications
- **Self-Service Portal Access**: Ensure users can access Company Portal
- **Documentation**: Provide clear remediation steps

### Monitoring and Reporting
- **Compliance Dashboard**: Review daily for emerging issues
- **Exception Reporting**: Track devices with policy exceptions
- **Non-Compliance Trends**: Monitor patterns across device types or departments

## Integration Points

- **Microsoft Endpoint Manager**: Primary management console
- **Azure Active Directory**: Authentication and group management
- **Conditional Access**: Access control based on compliance status
- **Defender for Endpoint**: Enhanced security posture assessment
- **Log Analytics**: Advanced reporting and alerting

## Automation Opportunities

- **Remediation Scripts**: Automate fixes for common compliance issues
- **Dynamic Group Updates**: Automatically manage group membership based on device attributes
- **Compliance History**: Track compliance state changes over time
- **Alert Automation**: Create automated alerts for non-compliance patterns

## Compliance Policy APIs

### Key API Endpoints
- **Create Policy**: `POST /deviceManagement/deviceCompliancePolicies`
- **Get Policies**: `GET /deviceManagement/deviceCompliancePolicies`
- **Update Policy**: `PATCH /deviceManagement/deviceCompliancePolicies/{id}`
- **Delete Policy**: `DELETE /deviceManagement/deviceCompliancePolicies/{id}`
- **Assign Policy**: `POST /deviceManagement/deviceCompliancePolicies/{id}/assign`

### Example API Request (PowerShell)
```powershell
# Get Authentication Token
$authToken = Get-MsalToken -ClientId $clientId -TenantId $tenantId

# Create a new compliance policy
$policyBody = @{
    "@odata.type" = "#microsoft.graph.windows10CompliancePolicy"
    "displayName" = "Windows 10 Security Compliance"
    "description" = "Baseline security requirements for Windows 10 devices"
    "passwordRequired" = $true
    "passwordBlockSimple" = $true
    "passwordRequiredToUnlockFromIdle" = $true
    "passwordMinutesOfInactivityBeforeLock" = 15
    "passwordExpirationDays" = 90
    "passwordMinimumLength" = 8
    "passwordMinimumCharacterSetCount" = 3
    "osMinimumVersion" = "10.0.19043.0"
    "secureBootEnabled" = $true
    "bitLockerEnabled" = $true
    "activeFirewallRequired" = $true
}

Invoke-RestMethod -Headers @{Authorization = "Bearer $($authToken.AccessToken)"} `
    -Uri "https://graph.microsoft.com/beta/deviceManagement/deviceCompliancePolicies" `
    -Method POST -Body ($policyBody | ConvertTo-Json) -ContentType "application/json"
```

## Reference Documentation

- [Microsoft Intune Documentation](https://docs.microsoft.com/en-us/mem/intune/)
- [Compliance Policy Settings Reference](https://docs.microsoft.com/en-us/mem/intune/protect/device-compliance-get-started)
- [Microsoft Graph API for Intune](https://docs.microsoft.com/en-us/graph/api/resources/intune-device-conceptual?view=graph-rest-beta)
- [Security Baseline Recommendations](https://docs.microsoft.com/en-us/mem/intune/protect/security-baselines)