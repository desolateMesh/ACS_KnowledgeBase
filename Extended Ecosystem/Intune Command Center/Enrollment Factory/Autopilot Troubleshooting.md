# Windows Autopilot Troubleshooting Guide

## Overview

This comprehensive guide addresses common issues encountered during Windows Autopilot deployment and enrollment processes. It provides systematic troubleshooting approaches, diagnostic tools, and resolution strategies to ensure successful device provisioning in enterprise environments.

## Table of Contents

1. [Pre-Enrollment Troubleshooting](#pre-enrollment-troubleshooting)
2. [Hardware Hash Collection Issues](#hardware-hash-collection-issues)
3. [Profile Assignment Problems](#profile-assignment-problems)
4. [Network Connectivity Issues](#network-connectivity-issues)
5. [Authentication and Identity Errors](#authentication-and-identity-errors)
6. [ESP (Enrollment Status Page) Failures](#esp-failures)
7. [Application Deployment Issues](#application-deployment-issues)
8. [Policy Application Problems](#policy-application-problems)
9. [Post-Enrollment Verification](#post-enrollment-verification)
10. [Log Collection and Analysis](#log-collection-and-analysis)
11. [Escalation Procedures](#escalation-procedures)
12. [Common Error Codes](#common-error-codes)

## Pre-Enrollment Troubleshooting

### Prerequisites Verification

Ensure these prerequisites are met before beginning Autopilot troubleshooting:

- Valid Microsoft Endpoint Manager (Intune) subscription
- Azure AD Premium licenses assigned to users
- Windows 10/11 Pro, Enterprise, or Education (version 1809 or later recommended)
- TPM 2.0 chip (recommended but not strictly required)
- Devices registered in Autopilot service
- Network connectivity to Microsoft services

### Device Registration Status Check

1. Open the Microsoft Endpoint Manager admin center
2. Navigate to **Devices** > **Windows** > **Windows enrollment** > **Devices**
3. Verify the device appears in the list with correct serial number and model
4. Check for "Assigned to Autopilot" status = Yes
5. Confirm the correct deployment profile is assigned

If the device is not appearing:

```powershell
# Run on target device to generate hardware hash
Install-Script -Name Get-WindowsAutoPilotInfo
Get-WindowsAutoPilotInfo -OutputFile AutopilotHWID.csv
```

## Hardware Hash Collection Issues

### Manual Hash Collection Troubleshooting

If hardware hash collection fails:

1. Ensure PowerShell is running as Administrator
2. Check execution policy with `Get-ExecutionPolicy` (should be RemoteSigned or Unrestricted)
3. Update PowerShell modules:

```powershell
Update-Module AzureAD
Update-Module WindowsAutopilotIntune
Install-Script -Name Get-WindowsAutoPilotInfo -Force
```

4. Verify TPM is functioning properly:
   - Press Win+R, type `tpm.msc`, and check TPM status
   - Run `Get-Tpm` in PowerShell to verify TPM is ready

### OEM Direct Registration Issues

For devices registered by OEM that don't appear in Autopilot:

1. Verify purchase date (allow 1-2 business days for processing)
2. Contact OEM with proof of purchase and serial numbers
3. Request Commercial PKID registration confirmation
4. Check that devices were purchased as business devices, not consumer models

## Profile Assignment Problems

### Group Assignment Issues

If profiles aren't applying correctly:

1. Verify dynamic device group membership criteria
2. Check for conflicting assignments or priority issues
3. Try direct profile assignment to the device (bypassing groups)
4. Review Group Policy conflicts with Autopilot configuration

### Profile Settings Verification

Confirm profile configuration:

1. Deployment mode (User-driven vs Self-deploying)
2. Out-of-box experience settings
3. Domain join configuration
4. User account type
5. Language and region settings
6. Convert all targeted devices to Autopilot setting

### Sync Issues

Force synchronization if profile changes aren't appearing:

1. In Endpoint Manager admin center, navigate to **Tenant administration** > **Tenant status**
2. Select **Connector status** and find Intune service connector
3. Click **Sync** and wait for completion
4. Force device sync with:

```powershell
Invoke-AutopilotSync
```

## Network Connectivity Issues

### Required Endpoints

Ensure network access to these critical endpoints:

- *.windows.com
- *.windowsupdate.com
- *.microsoft.com
- login.microsoftonline.com
- *.msftauth.net
- *.msauthimages.net
- *.msecnd.net
- *.msedge.net
- enterpriseregistration.windows.net
- management.azure.com
- graph.microsoft.com
- *.netowcloud.com

### Proxy and Firewall Configuration

1. Test network connectivity using:

```powershell
Test-DeviceRegConnectivity
Test-AutopilotNetworkConnectivity
```

2. Verify proxy settings during OOBE:
   - Configure proxy before starting Autopilot
   - Consider using Delivery Optimization for bandwidth management
   - Ensure SSL inspection isn't breaking connections to Microsoft services

### Network Troubleshooting Steps

1. Test basic connectivity: `ping www.microsoft.com`
2. Verify DNS resolution is working
3. Check client IP addressing is correct
4. Test with direct internet connection (bypass proxy/firewall)
5. Capture network trace during enrollment for detailed analysis

## Authentication and Identity Errors

### User Authentication Issues

Common authentication error troubleshooting:

1. Verify user has valid license assigned
2. Check if user is blocked or credentials expired
3. Test authentication with user at https://portal.office.com
4. Check multi-factor authentication configuration
5. Review Conditional Access policies that might block enrollment

### Tenant Authentication Problems

For tenant-level authentication issues:

1. Verify Azure AD Connect synchronization status
2. Check for tenant-wide service issues at https://status.office365.com
3. Review federation configuration if using AD FS
4. Test device joining Azure AD manually to isolate Autopilot-specific issues

### Credentials Not Working

If credentials are rejected during enrollment:

1. Reset user password
2. Temporarily exclude user from MFA during enrollment
3. Check UPN suffix matching and routing
4. Verify no character encoding issues in username/password

## ESP (Enrollment Status Page) Failures

### Common ESP Failures

Troubleshoot based on failure location:

1. Device preparation (0-33%):
   - Check Autopilot profile assignment
   - Verify Azure AD join configuration
   - Review MDM enrollment settings

2. Device setup (33-66%):
   - Check device configuration profiles
   - Review security policies
   - Verify certificate deployment

3. Account setup (66-100%):
   - Check user-targeted applications
   - Review user configuration profiles
   - Verify OneDrive setup configuration

### ESP Timeout Issues

If ESP times out:

1. Check timeout settings in ESP configuration (default is 60 minutes)
2. Review required app installations (reduce if possible)
3. Consider setting "Allow users to reset device" to Yes for testing
4. Temporarily set "Block device use until all apps and profiles are installed" to No

### ESP Logging and Diagnostics

Collect and analyze ESP logs:

1. Access Event Viewer > Applications and Services Logs > Microsoft > Windows > ModernDeployment-Diagnostics-Provider
2. Check setupdiag logs in %WINDIR%\Logs\SetupDiag
3. Review Autopilot diagnostics:

```powershell
# On enrolled device
Test-AutopilotESPStatus
Get-AutopilotESPStatus
Get-AutopilotDiagnostics
```

## Application Deployment Issues

### Application Installation Failures

When apps fail to install during ESP:

1. Check if app is properly uploaded and assigned in Intune
2. Verify app dependencies are available
3. Test app installation manually on a test device
4. Review app installation requirements (OS version, architecture)
5. Check for app conflicts or prerequisite issues

### Prioritizing Critical Applications

For ESP performance optimization:

1. Mark truly essential apps as "required" for ESP
2. Use "Available" installation intent for non-critical apps
3. Configure app dependencies correctly
4. Consider using Win32 app priority settings (1-32, lower is higher priority)

### Win32 App Troubleshooting

For specific Win32 app issues:

1. Check IntuneManagementExtension.log on client
2. Verify detection rules are working correctly
3. Test installation command line parameters
4. Check for return code issues in the deployment script
5. Ensure content preparation process completed successfully

## Policy Application Problems

### Policy Processing Failures

When policies don't apply correctly:

1. Check client-side MDM diagnostic report:
   - Settings > Accounts > Access work or school > Info > Create report
   - Review MDM logs for policy application errors

2. Verify policy syntax and compatibility:
   - Check for policy conflicts
   - Verify OMA-URI settings are correct
   - Ensure policy is appropriate for OS version

3. Force policy sync:
```powershell
Start-Process "ms-settings:workplace"
# Click the "Sync" button in settings
```

### Troubleshooting Specific Policies

For certificate, Wi-Fi, VPN or other profile issues:

1. Check specific policy logs in Event Viewer
2. Verify prerequisite configurations exist (e.g., SCEP server for certificates)
3. Test policy on already-enrolled device before using in Autopilot
4. Break complex policy sets into smaller, incremental deployments

## Post-Enrollment Verification

### Verify Device State

Confirm successful enrollment with these checks:

1. Device shows as managed in Endpoint Manager
2. Correct policies show as applied in device portal
3. Required applications are installed
4. Device appears in correct Azure AD groups
5. BitLocker keys are escrowed (if configured)
6. Windows Update policies applied correctly

### Diagnostic Data Collection

Gather diagnostic data for analysis:

1. From an administrative PowerShell prompt:

```powershell
# Install script
Install-Script -Name Get-AutopilotDiagnostics

# Collect diagnostics
Get-AutopilotDiagnostics -Online -SavePath C:\Logs
```

2. Create MDM diagnostic report:
   - Settings > Accounts > Access work or school
   - Select the MDM account > Info > Create report
   - Save the report for analysis

## Log Collection and Analysis

### Critical Log Locations

Key logs for autopilot troubleshooting:

1. **Event Viewer Logs**:
   - Applications and Services Logs > Microsoft > Windows
   - Subfolders: DeviceManagement-Enterprise-Diagnostics-Provider, Shell-Core, User Device Registration

2. **Setup and OOBE Logs**:
   - %WINDIR%\Logs\Setupact.log
   - %WINDIR%\Panther\*.log
   - %WINDIR%\Logs\mosetup\*.log

3. **Intune Management Extension Logs**:
   - %ProgramData%\Microsoft\IntuneManagementExtension\Logs

### Log Analysis Techniques

1. Use CMTrace or Windows Event Viewer for log review
2. Search for specific error codes or failure messages
3. Look for timestamps around the point of failure
4. Correlate events across multiple log sources
5. Focus on warnings and errors rather than informational messages

## Escalation Procedures

### When to Escalate

Escalate to Microsoft Support when:

1. All troubleshooting steps have been exhausted
2. Error codes don't appear in documentation
3. Issues affect multiple devices consistently
4. Service-side issues are suspected
5. Profile assignment works but enrollment fails repeatedly

### Information to Collect Before Escalation

1. Device serial number and hardware hash
2. Autopilot profile configuration (export from portal)
3. Screenshots of error messages
4. Network configuration details
5. Complete device logs using MdmDiagnosticsTool
6. Timeline of when issue started
7. Any recent changes to environment

## Common Error Codes

### Autopilot Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| 0x80180014 | Device not recognized as Autopilot device | Verify device registration and sync |
| 0x801c03ea | Network connectivity issues | Check endpoints and proxy configuration |
| 0x80004005 | Unspecified failure | Check device logs for more specific error |
| 0x800705b4 | Timeout occurred | Check network and service health |
| 0x80070774 | Domain join in progress | Wait for domain join to complete |
| 0x80070002 | File not found | Missing resources or corrupt installation |
| 0x80090011 | Keyset does not exist | TPM issues, may need TPM clear |

### ESP Error Codes

| Error Stage | Common Issues | Troubleshooting |
|-------------|---------------|----------------|
| Device preparation | Azure AD join failures, network issues | Check AAD logs, network connectivity |
| Device setup | Profile application failures, timeout | Review MDM logs, increase timeout |
| Account setup | Application installation failures | Check IME logs, app configuration |

---

## Additional Resources

- [Microsoft Learn: Windows Autopilot](https://learn.microsoft.com/en-us/mem/autopilot/troubleshoot-oobe)
- [Intune Troubleshooting Guide](https://learn.microsoft.com/en-us/mem/intune/fundamentals/help-desk-operators)
- [Autopilot Known Issues](https://learn.microsoft.com/en-us/mem/autopilot/known-issues)
- [Windows Autopilot FAQ](https://learn.microsoft.com/en-us/mem/autopilot/windows-autopilot-faq)

---

*Last updated: April 2025*