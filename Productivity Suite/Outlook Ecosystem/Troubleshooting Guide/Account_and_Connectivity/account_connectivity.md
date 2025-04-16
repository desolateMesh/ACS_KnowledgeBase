# Account and Connectivity Troubleshooting

## Overview

This document provides comprehensive troubleshooting approaches for resolving account configuration and connectivity issues in Outlook clients. These problems typically manifest as inability to send/receive emails, authentication prompts, or connection errors.

## Common Symptoms

- Repeated password prompts
- "Cannot connect to server" errors
- Offline status despite network connectivity
- Slow connection performance
- Intermittent connectivity issues
- Authentication failures
- TLS/SSL errors
- Autodiscover failures

## Prerequisites for Troubleshooting

- Confirm network connectivity (ping test, web browser access)
- Verify user credentials are valid in Azure AD/Active Directory
- Check service status on [Microsoft 365 Service Health Dashboard](https://admin.microsoft.com/Adminportal/Home#/servicehealth)
- Identify recent changes to network, firewall, or account settings

## Autodiscover Troubleshooting

### Autodiscover Process Overview

Autodiscover is the mechanism Outlook uses to automatically configure connection settings using only the email address and password. The process follows this sequence:

1. Local XML file in the profile directory
2. SCP lookup in Active Directory (domain-joined machines)
3. HTTPS root domain query: https://contoso.com/autodiscover/autodiscover.xml
4. HTTPS autodiscover domain query: https://autodiscover.contoso.com/autodiscover/autodiscover.xml
5. HTTP redirect method with autodiscover.contoso.com
6. SRV record lookup in DNS
7. Outlook.com service (Microsoft 365 accounts only)

### SRV Record Validation

1. Run the following command to check SRV record configuration:

```powershell
Resolve-DnsName -Name _autodiscover._tcp.contoso.com -Type SRV
```

2. Verify the record returns the correct Exchange server with appropriate priority and weight values.

3. For Microsoft 365 accounts, the record should point to outlook.office365.com.

### Testing Autodiscover Endpoints

Use the Microsoft Remote Connectivity Analyzer (https://testconnectivity.microsoft.com):

1. Select "Outlook Autodiscover" test
2. Enter email address and credentials
3. Review detailed test results indicating which autodiscover methods succeeded or failed

## Authentication Issues

### Modern Authentication Troubleshooting

1. Verify Modern Authentication is enabled in tenant:

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline

# Check Modern Auth status
Get-OrganizationConfig | Format-List Name,OAuth*
```

2. Check if specific authentication methods are blocked for the user in Azure AD Conditional Access policies.

3. Verify the Outlook client version supports Modern Authentication.

4. Clear the Office credentials from Credential Manager:
   - Control Panel > Credential Manager
   - Remove all entries related to Office, Microsoft, or outlook.office365.com

### Basic Authentication Issues

> **Note:** Basic Authentication is being deprecated across Microsoft 365 services. Migration to Modern Authentication is recommended.

If Basic Authentication is still in use:

1. Verify Basic Authentication is still enabled for the required protocol (IMAP, POP, EWS, etc.)

2. Test credentials manually using:

```powershell
$Credential = Get-Credential
$Session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri https://outlook.office365.com/powershell-liveid/ -Credential $Credential -Authentication Basic -AllowRedirection
```

3. Check for IP restrictions or Conditional Access policies that might block Basic Authentication.

## Network Connectivity Issues

### Firewall and Proxy Configuration

1. Verify the following endpoints are accessible:
   - outlook.office365.com (TCP 443)
   - outlook.office.com (TCP 443)
   - autodiscover-s.outlook.com (TCP 443)

2. For proxy servers, ensure:
   - Authentication methods are compatible with Outlook
   - TLS inspection is correctly configured for Office 365 endpoints
   - All required Microsoft 365 URLs are allowlisted

3. Test connectivity using Telnet to verify port access:

```
telnet outlook.office365.com 443
```

### Fiddler Trace Analysis

1. Install and configure Fiddler from [Telerik's website](https://www.telerik.com/fiddler)

2. Enable HTTPS decryption in Fiddler (Tools > Options > HTTPS)

3. Launch Outlook while Fiddler is capturing

4. Look for:
   - Failed connections (status code 4xx or 5xx)
   - TLS negotiation failures
   - Excessive latency in responses
   - Authentication challenges not being met correctly

5. Common error patterns:
   - 401 Unauthorized: Authentication failure
   - 403 Forbidden: Access denied by policy
   - 404 Not Found: Incorrect URL (often autodiscover related)
   - 407 Proxy Authentication Required: Proxy credentials needed
   - 408 Request Timeout: Network latency or server issues
   - 500-level errors: Server-side issues

## Exchange Online Connection Issues

### Connection Test with PowerShell

```powershell
# Test Exchange Online PowerShell connection
$UserCredential = Get-Credential
$Session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri https://outlook.office365.com/powershell-liveid/ -Credential $UserCredential -Authentication Basic -AllowRedirection
Import-PSSession $Session -DisableNameChecking
```

### Hybrid Environment Configuration

For hybrid Exchange deployments, check:

1. Organization relationship configuration:

```powershell
Get-OrganizationRelationship | Format-List
```

2. Availability service configuration:

```powershell
Get-AvailabilityAddressSpace | Format-List
```

3. OAuth configuration between on-premises and cloud:

```powershell
Get-IntraOrganizationConnector | Format-List
```

## Client-Specific Configuration Issues

### Outlook for Windows

1. Create a new Outlook profile to test if the issue is profile-specific:
   - Control Panel > Mail > Show Profiles > Add

2. Run Outlook in safe mode to test if add-ins are causing issues:
   - Hold Ctrl while launching Outlook or run `outlook.exe /safe`

3. Reset navigation pane settings:
   - `outlook.exe /resetnavpane`

4. Check for corrupt OST file and run the Inbox Repair Tool (scanpst.exe)

### Outlook for Mac

1. Clear Outlook cache:
   - Hold Option while opening Outlook and select "Clear Cache"

2. Reset Outlook preferences:
   - Delete ~/Library/Preferences/com.microsoft.Outlook.plist

3. Create a new profile:
   - Hold Option while opening Outlook and select "New Identity"

### Outlook Mobile

1. Remove and re-add the account
2. Clear app cache (device settings)
3. Verify device enrollment status in Intune (if applicable)
4. Check for Conditional Access policies specifically targeting mobile devices

## Advanced Troubleshooting

### MAPI Over HTTP Configuration

1. Verify MAPI/HTTP is enabled in Exchange Online:

```powershell
Get-OrganizationConfig | Format-List MapiHttpEnabled
```

2. Check client-side registry settings:

```
HKEY_CURRENT_USER\Software\Microsoft\Exchange\Exchange Provider
```

3. Enable MAPI/HTTP logging in Outlook:

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Mail
EnableMapiHttpTracing (DWORD) = 1
```

### Connection Throttling Issues

1. Check if the user is being throttled by Exchange:

```powershell
Get-ThrottlingPolicyAssociation -Identity user@contoso.com | Format-List
```

2. Review EWS logs for throttling errors (error code 429)

3. Implement client-side throttling mitigations:
   - Reduce polling frequency
   - Implement exponential backoff for retry attempts
   - Stagger connection attempts in large deployments

## Resolution Reference Table

| Symptom | Common Causes | Primary Solutions |
|---------|---------------|-------------------|
| Repeated password prompts | Cached credentials issue, MFA configuration | Clear credential cache, reset Azure AD tokens |
| Cannot connect to server | Network connectivity, firewall blocks | Verify firewall rules, test endpoint connectivity |
| Offline status | Network detection failure, cached mode issue | Reset Work Offline status, verify connection settings |
| Autodiscover failures | DNS misconfiguration, SRV record issues | Validate DNS records, test autodiscover endpoints |
| TLS/SSL errors | Certificate issues, TLS version mismatch | Update client, check required TLS versions |
| Authentication failures | Invalid credentials, disabled account | Verify account status in Azure AD, test authentication |
| Intermittent connectivity | Network reliability, throttling | Monitor connection patterns, check for throttling |

## Escalation Procedure

If the issue persists after following this troubleshooting guide:

1. Collect diagnostic logs:
   - Enable Outlook ETL logging
   - Capture Fiddler trace during issue reproduction
   - Export Outlook Test Email AutoConfiguration results

2. Document environment details:
   - Outlook client version and build
   - Operating system details
   - Network configuration
   - Recent changes

3. Open a support ticket with the Global Service Desk with collected data

## Related Documentation

- [Connectivity Testing Tools Guide](link-to-testing-tools-guide)
- [Exchange Online Connection Requirements](link-to-requirements-doc)
- [Microsoft Support and Recovery Assistant (SaRA)](https://aka.ms/SaRA)
- [Outlook Registry Settings Reference](link-to-registry-reference)
