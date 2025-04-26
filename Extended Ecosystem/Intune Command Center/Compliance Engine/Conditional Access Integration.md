# Conditional Access Integration with Compliance Policies

## Overview

This document outlines the integration between Microsoft Intune Compliance Policies and Azure AD Conditional Access. This powerful combination allows organizations to ensure that only compliant devices can access corporate resources, creating a robust security framework for modern workplace environments.

## Core Components

### Compliance State Evaluation
- **Device Health**: Evaluation based on device security state
- **Compliance Status**: Binary state (Compliant/Non-Compliant)
- **Grace Period**: Configurable remediation timeframe before enforcement
- **Real-time Monitoring**: Continuous assessment of device compliance

### Conditional Access Policies
- **Grant Controls**: Allow/block access based on compliance state
- **Session Controls**: Limit capabilities based on risk factors
- **Application Targeting**: Apply to specific cloud apps
- **Device Platform Conditions**: Target specific operating systems
- **Named Locations**: Apply different rules based on network location

## Integration Architecture

### Data Flow
1. **Device Evaluation**: Intune client assesses device against compliance policies
2. **Status Reporting**: Compliance state reported to Intune service
3. **Azure AD Integration**: Device compliance state synchronized to Azure AD
4. **Access Request**: User attempts to access protected resource
5. **Conditional Evaluation**: Azure AD checks compliance state as part of conditional access evaluation
6. **Access Decision**: Grant or deny access based on policy configuration

### System Components
- **Microsoft Endpoint Manager**: Manages compliance policies
- **Intune Management Extension**: Extends compliance checks on Windows
- **Company Portal**: Provides user remediation interface
- **Azure AD**: Stores device compliance state
- **Resource Providers**: Office 365, SharePoint, Exchange, etc.

## Implementation Models

### Basic Integration
```
Compliance Policy → Conditional Access → Block Non-Compliant
```
Simple model blocking all non-compliant devices from accessing all cloud applications

### Graduated Implementation
```
Compliance Policy → Grace Period → Limited Access → Full Block
```
Tiered approach allowing users time to remediate while restricting certain capabilities

### Risk-Based Model
```
Compliance Policy + Risk Detection → Dynamic Access Controls
```
Advanced implementation combining compliance state with user risk level for adaptive controls

### Multi-Tier Protection
```
Compliance Policies (Basic/Enhanced/Strict) → Multiple CA Policies → Resource-Specific Controls
```
Layered implementation with different requirements for different resource sensitivity levels

## Configuration Guidelines

### Prerequisite Configuration
- **Device Registration**: Ensure Azure AD device registration is configured
- **Co-management**: Configure co-management settings for hybrid environments
- **Platform Enrollment**: Enable management for all required platforms
- **License Requirements**: Verify Azure AD Premium P1/P2 and Microsoft Intune licenses

### Policy Configuration Strategy

#### 1. Define Scope
- **User Groups**: Target specific departments or roles
- **Device Platforms**: Create platform-specific policies
- **Application Sensitivity**: Map applications to security requirements
- **Exclusions**: Identify emergency access accounts and testing groups

#### 2. Compliance Policy Creation
- **Platform Policies**: Create dedicated policies for each OS platform
- **Tiered Requirements**: Consider basic, enhanced, and strict policy levels
- **Grace Periods**: Configure appropriate remediation timeframes
- **Notification Templates**: Customize user communication

#### 3. Conditional Access Policy Configuration
- **Named Policy**: `[Access Level]-[Resource Type]-[Requirement]`
- **Cloud Apps**: Target specific applications or all cloud apps
- **Conditions**: Configure user, device platform, and location conditions
- **Access Controls**: Select "Require device to be marked as compliant"
- **Session Controls**: Configure app enforcement controls if needed

#### 4. Testing and Validation
- **Pilot Group**: Deploy to limited test group first
- **Report-Only Mode**: Use for impact assessment without enforcement
- **Staged Rollout**: Implement gradually across organization
- **Monitoring Plan**: Establish KPIs and success metrics

## Advanced Configurations

### Multi-Factor Authentication (MFA) Integration
```
Device Compliance + MFA → Resource Access
```
- **Combined Requirements**: Require both device compliance and MFA
- **Risk-Based Application**: Apply MFA only for high-risk scenarios
- **Compliant Device Bypass**: Configure trusted devices to bypass MFA requirements

### App Protection Policy Integration
```
Device Compliance + App Protection → Data Protection
```
- **Application-Level Controls**: Enforce in-app protection policies
- **Data Containment**: Configure app protection policies for compliant/non-compliant scenarios
- **Managed Browser Requirements**: Force web access through managed browsers

### Network Location Awareness
```
Device Compliance + Network Location → Variable Access Controls
```
- **On-Premises Access**: Different requirements for corporate network
- **Remote Access**: Stricter controls for remote connection scenarios
- **Named Locations**: Configure trusted vs. untrusted networks

### Windows Hello for Business
```
Device Compliance + Windows Hello → Enhanced Authentication
```
- **Passwordless Strategy**: Enforce Windows Hello authentication
- **Security Key Integration**: Configure FIDO2 security key requirements
- **Combined Controls**: Require both compliance and specific authentication methods

## Troubleshooting

### Common Issues and Resolutions

#### Policy Application Issues
- **Synchronization Delays**: Force device sync and wait for processing
- **Assignment Conflicts**: Check for overlapping or conflicting assignments
- **Status Reporting Errors**: Verify client connectivity and logs

#### User Experience Problems
- **Access Denied Messages**: Customize with clear remediation instructions
- **Remediation Guidance**: Provide self-service options in Company Portal
- **Device Registration Failures**: Troubleshoot Azure AD Join process

#### Monitoring and Diagnostics
- **Compliance Reports**: Review device compliance state reports
- **Conditional Access Reports**: Check sign-in logs and policy reports
- **Client-Side Logs**: Analyze device logs for troubleshooting

## PowerShell Automation

### Compliance Status Reporting
```powershell
# Get Compliance Status for Devices
Connect-MSGraph
$complianceReport = Get-IntuneManagedDevice | Select-Object deviceName, userPrincipalName, operatingSystem, complianceState, lastSyncDateTime
$complianceReport | Export-CSV -Path "ComplianceReport-$(Get-Date -Format 'yyyyMMdd').csv" -NoTypeInformation
```

### Conditional Access Policy Creation
```powershell
# Create Conditional Access Policy requiring device compliance
$params = @{
    displayName = "Require Compliant Device for Office 365"
    state = "enabled"
    conditions = @{
        clientAppTypes = @("browser", "mobileAppsAndDesktopClients")
        applications = @{
            includeApplications = @("Office365")
        }
        users = @{
            includeGroups = @("group-id-here")
            excludeGroups = @("emergency-access-group-id")
        }
    }
    grantControls = @{
        operator = "AND"
        builtInControls = @("compliantDevice")
    }
}

New-AzureADMSConditionalAccessPolicy @params
```

### Compliance Status Management
```powershell
# Target Non-Compliant Devices for Action
$nonCompliant = Get-IntuneManagedDevice | Where-Object {$_.complianceState -eq "noncompliant"}

foreach ($device in $nonCompliant) {
    # Send notification to user
    Invoke-IntuneManagedDeviceComplianceAction -managedDeviceId $device.id -actionName "sendCustomNotificationToCompanyPortal"
    
    # Force sync to check for compliance again
    Invoke-IntuneManagedDeviceSyncDevice -managedDeviceId $device.id
}
```

## Integration Scenarios

### Scenario 1: Hybrid Environment
- **Challenge**: Managing both cloud and on-premises resources
- **Solution**:
  - Configure device compliance policies in Intune
  - Set up Azure AD Conditional Access for cloud apps
  - Deploy VPN with Azure AD authentication
  - Configure on-premises NPS extension for RADIUS authentication

### Scenario 2: BYOD Implementation
- **Challenge**: Balancing security with user privacy
- **Solution**:
  - Create platform-specific compliance policies with privacy considerations
  - Configure Conditional Access with app protection for unmanaged devices
  - Implement MAM without enrollment where appropriate
  - Use application-specific controls instead of full device management

### Scenario 3: Highly Regulated Industry
- **Challenge**: Meeting strict regulatory requirements
- **Solution**:
  - Implement strict compliance policies with advanced security requirements
  - Configure tiered Conditional Access with MFA requirements
  - Enable Continuous Access Evaluation
  - Implement session controls and adaptive policies
  - Require managed devices for sensitive data access

## API Integration

### Key APIs for Integration

#### Microsoft Graph API Endpoints
- **Compliance Policies**: `/deviceManagement/deviceCompliancePolicies`
- **Compliance State**: `/deviceManagement/managedDevices/{id}/deviceCompliancePolicy`
- **Conditional Access**: `/identity/conditionalAccess/policies`
- **Device Information**: `/deviceManagement/managedDevices`

#### Example: Monitoring Compliance with Logic Apps
```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/schemas/2016-06-01/Microsoft.Logic.json",
    "triggers": {
      "Recurrence": {
        "recurrence": {
          "frequency": "Day",
          "interval": 1
        },
        "type": "Recurrence"
      }
    },
    "actions": {
      "Get_Devices": {
        "runAfter": {},
        "type": "Http",
        "inputs": {
          "method": "GET",
          "uri": "https://graph.microsoft.com/beta/deviceManagement/managedDevices?$filter=complianceState eq 'noncompliant'",
          "authentication": {
            "type": "ManagedServiceIdentity"
          }
        }
      },
      "For_Each_Device": {
        "foreach": "@body('Get_Devices').value",
        "actions": {
          "Send_Notification": {
            "runAfter": {},
            "type": "Http",
            "inputs": {
              "method": "POST",
              "uri": "https://graph.microsoft.com/beta/deviceManagement/managedDevices/@{items('For_Each_Device').id}/sendCustomNotificationToCompanyPortal",
              "body": {
                "notificationTitle": "Compliance Reminder",
                "notificationBody": "Your device is currently not compliant with security policies. Please open Company Portal to resolve."
              },
              "authentication": {
                "type": "ManagedServiceIdentity"
              }
            }
          }
        },
        "runAfter": {
          "Get_Devices": [
            "Succeeded"
          ]
        },
        "type": "Foreach"
      }
    }
  }
}
```

## Reference Documentation

- [Microsoft Intune Documentation](https://docs.microsoft.com/en-us/mem/intune/)
- [Azure AD Conditional Access](https://docs.microsoft.com/en-us/azure/active-directory/conditional-access/)
- [Microsoft Graph API for Intune](https://docs.microsoft.com/en-us/graph/api/resources/intune-device-conceptual?view=graph-rest-beta)
- [Conditional Access API Documentation](https://docs.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy?view=graph-rest-beta)