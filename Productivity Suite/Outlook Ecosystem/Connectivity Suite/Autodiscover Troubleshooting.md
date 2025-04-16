# Autodiscover Troubleshooting

## Overview

Autodiscover is the service that allows Outlook clients to automatically configure connection settings for Exchange mailboxes. This document provides comprehensive guidance on troubleshooting Autodiscover issues that affect Outlook connectivity, with a focus on diagnostic techniques, common problems, and resolution methods.

## Autodiscover Flow Process

Understanding the Autodiscover process helps in effective troubleshooting:

1. **Initial Lookup**: Outlook attempts to contact the Autodiscover service using the email domain:
   - `https://autodiscover.domain.com/autodiscover/autodiscover.xml`

2. **SCP Lookup**: For domain-joined computers, Outlook queries Active Directory for Service Connection Points

3. **Fallback Methods**: If initial attempts fail, Outlook tries these methods in sequence:
   - `https://domain.com/autodiscover/autodiscover.xml`
   - DNS SRV record lookup: `_autodiscover._tcp.domain.com`
   - Autodiscover redirect lookup: `http://autodiscover.domain.com/autodiscover/autodiscover.xml`
   - Local XML file (if configured)
   - Microsoft Office 365 redirection service: `https://autodiscover-s.outlook.com/autodiscover/autodiscover.xml`

4. **Authentication**: Autodiscover attempts authentication using current user credentials

5. **Profile Configuration**: If successful, Outlook configures the profile using the returned settings

## DNS SRV Record Validation

### Proper DNS SRV Record Format

The correct format for an Autodiscover SRV record is:
```
_autodiscover._tcp.domain.com. IN SRV 0 0 443 autodiscover.domain.com.
```

### Validating SRV Records

```powershell
# Using Windows command line
nslookup -type=SRV _autodiscover._tcp.domain.com

# Using PowerShell
Resolve-DnsName -Name _autodiscover._tcp.domain.com -Type SRV

# Expected successful output would show:
# service = 0 100 443 autodiscover.domain.com.
```

### Common SRV Record Issues

1. **Missing Record**: No SRV record found for the domain
   - Resolution: Create the SRV record with correct format

2. **Incorrect Port**: SRV record points to wrong port (should be 443 for HTTPS)
   - Resolution: Update SRV record to use port 443

3. **Wrong Target**: SRV record points to non-existent server
   - Resolution: Verify target server exists and has valid certificate

4. **Propagation Delay**: Recently updated records not yet propagated
   - Resolution: Wait for DNS propagation or flush DNS cache

## Registry Key Analysis

Autodiscover behavior can be modified through registry settings:

### Key Registry Locations

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\AutoDiscover
HKEY_CURRENT_USER\Software\Policies\Microsoft\Office\16.0\Outlook\AutoDiscover
```

### Important Registry Values

| Value Name | Type | Description | Recommended Setting |
|------------|------|-------------|---------------------|
| ExcludeScpLookup | DWORD | Prevents SCP lookup in Active Directory | 0 (unless troubleshooting SCP issues) |
| ExcludeHttpsAutoDiscoverDomain | DWORD | Prevents domain-based HTTPS lookup | 0 (enable domain lookup) |
| ExcludeHttpsRootDomain | DWORD | Prevents root domain HTTPS lookup | 0 (enable root domain) |
| ExcludeHttpRedirect | DWORD | Prevents following HTTP redirects | 0 (allow redirects) |
| ExcludeSrvRecord | DWORD | Prevents SRV record lookup | 0 (enable SRV lookup) |
| ExcludeLastKnownGoodUrl | DWORD | Prevents using cached successful URL | 0 (use cached URL) |
| ExcludeExplicitO365Endpoint | DWORD | Prevents Office 365 endpoint lookup | 0 (allow O365 lookup) |

### Checking and Modifying Registry Settings

```powershell
# Check Autodiscover registry settings
$path = "HKCU:\Software\Microsoft\Office\16.0\Outlook\AutoDiscover"
if (Test-Path $path) {
    Get-ItemProperty $path | Select-Object Exclude*
}

# Reset problematic Autodiscover registry settings (run as admin)
$path = "HKCU:\Software\Microsoft\Office\16.0\Outlook\AutoDiscover"
if (Test-Path $path) {
    $excludeProps = Get-ItemProperty $path | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -like "Exclude*" }
    foreach ($prop in $excludeProps) {
        Set-ItemProperty -Path $path -Name $prop.Name -Value 0
    }
}
```

## Client Log Parsing Guide

### Enabling Autodiscover Logging

```powershell
# Enable Outlook ETL logging for Autodiscover
$logPath = "$env:TEMP\OutlookAutoDiscover"
if (-not (Test-Path $logPath)) { New-Item -Path $logPath -ItemType Directory }

# Create registry key to enable logging
$regPath = "HKCU:\Software\Microsoft\Office\16.0\Outlook\Options\Mail"
if (-not (Test-Path $regPath)) { New-Item -Path $regPath -Force }
Set-ItemProperty -Path $regPath -Name "EnableLogging" -Value 1 -Type DWORD
Set-ItemProperty -Path $regPath -Name "AutodiscoverDebugLogging" -Value 1 -Type DWORD
```

### Analyzing Autodiscover Logs

1. **Locate the log files**:
   - Outlook ETL logs: `%TEMP%\Outlook Logging\`
   - Autodiscover detailed logs: `%TEMP%\OutlookAutoDiscover\`

2. **Key patterns to look for**:
   - "Failed to reach Autodiscover endpoint" - Indicates connectivity issue
   - "Authentication failed" - Credentials or authentication method problem
   - "SSL certificate validation failed" - Certificate trust issue
   - "SRV record lookup failed" - DNS configuration problem
   - "Autodiscover succeeded" - Successful endpoint found

3. **Using Fiddler or Network Captures**:
   - Filter for `autodiscover.xml` in the URL
   - Check HTTP response codes (200=success, 401=auth failed, 404=not found)
   - Verify certificate validity in HTTPS connections
   - Look for redirects in the response headers

## Common Issues and Resolutions

### Authentication Failures

**Symptoms**:
- Repeated password prompts
- "Your password has expired" messages
- Error code 401 in logs

**Diagnostic Steps**:
1. Verify user credentials are correct
2. Check if modern authentication is required
3. Test basic authentication if supported
4. Look for multi-factor authentication issues

**Resolution Options**:
1. Update stored credentials in Windows Credential Manager
2. Enable modern authentication on client and server
3. Check for password expiry or account lockout
4. Verify identity providers for federated authentication

### Certificate Problems

**Symptoms**:
- "The security certificate has a problem" warnings
- "Cannot verify server identity" errors
- SSL/TLS handshake failures in logs

**Diagnostic Steps**:
1. View certificate details in browser
2. Check certificate validity dates
3. Verify certificate name matches autodiscover endpoint
4. Check trusted root certificate authorities

**Resolution Options**:
1. Install required root/intermediate certificates
2. Update certificate with proper subject alternative names
3. Fix certificate name mismatch issues
4. Update client date/time if incorrect

### DNS Configuration Issues

**Symptoms**:
- Long delays in profile creation
- "Cannot find server settings" errors
- Failed SRV lookups in logs

**Diagnostic Steps**:
1. Verify internal and external DNS resolution
2. Check for split-brain DNS configuration issues
3. Validate SRV and CNAME record configurations
4. Test DNS resolution from various networks

**Resolution Options**:
1. Create or correct Autodiscover DNS records
2. Update DNS TTL for faster propagation
3. Configure split-brain DNS properly for internal/external clients
4. Use hosts file for testing (temporary workaround only)

### Proxy and Firewall Interference

**Symptoms**:
- Connectivity works on some networks but not others
- Timeout errors when contacting Autodiscover
- Connection reset errors

**Diagnostic Steps**:
1. Check proxy settings in Outlook and Windows
2. Test connectivity with proxy disabled
3. Verify firewall rules for HTTPS traffic
4. Validate outbound connection to Autodiscover endpoints

**Resolution Options**:
1. Configure proxy exception for Autodiscover endpoints
2. Adjust firewall rules to permit required traffic
3. Update proxy autoconfiguration scripts
4. Implement proper TLS inspection if used

## Testing and Verification Tools

### Microsoft Remote Connectivity Analyzer

URL: [https://testconnectivity.microsoft.com/](https://testconnectivity.microsoft.com/)

**Testing Autodiscover**:
1. Select "Outlook Autodiscover" test
2. Enter email address and credentials
3. Review detailed test results for each Autodiscover method
4. Check specific errors and recommendations

### PowerShell Commands for Testing

```powershell
# Test Autodiscover for Exchange Online
$UserCredential = Get-Credential
$Session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri https://outlook.office365.com/powershell-liveid/ -Credential $UserCredential -Authentication Basic -AllowRedirection
Import-PSSession $Session -DisableNameChecking
Test-OutlookConnectivity -RunFromServerId:$null -ProbeIdentity:OutlookAutodiscover

# Test Autodiscover for on-premises Exchange
$credential = Get-Credential
Test-OutlookWebServices -Identity user@domain.com -MailboxCredential $credential
```

### Autodiscover XML Request Tool

For manual testing of Autodiscover endpoints:

1. Create an XML file named `autodiscover_test.xml` with the content:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
  <Request>
    <EMailAddress>user@domain.com</EMailAddress>
    <AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
  </Request>
</Autodiscover>
```

2. Use PowerShell to test the endpoint:
```powershell
$url = "https://autodiscover.domain.com/autodiscover/autodiscover.xml"
$credential = Get-Credential
$xml = Get-Content .\autodiscover_test.xml
$bytes = [System.Text.Encoding]::UTF8.GetBytes($xml)

$request = [System.Net.WebRequest]::Create($url)
$request.Method = "POST"
$request.ContentType = "text/xml"
$request.ContentLength = $bytes.Length
$request.Credentials = $credential
$request.Headers.Add("User-Agent", "AutodiscoverTest")

$requestStream = $request.GetRequestStream()
$requestStream.Write($bytes, 0, $bytes.Length)
$requestStream.Close()

try {
    $response = $request.GetResponse()
    $responseStream = $response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($responseStream)
    $responseXml = $reader.ReadToEnd()
    $responseXml
} catch [System.Net.WebException] {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseXml = $reader.ReadToEnd()
        $responseXml
    }
}
```

## Advanced Troubleshooting Scenarios

### Hybrid Environment Autodiscover Issues

In hybrid Exchange/Office 365 environments:

1. **Check Autodiscover endpoint priority**:
   - Verify which endpoint (on-premises or cloud) should handle requests
   - Configure DNS to point to correct endpoint

2. **Verify hybrid configuration**:
   - Check Organization Relationship settings
   - Validate OAuth configuration
   - Ensure correct Availability Address Space settings

3. **Test mailbox-specific issues**:
   - Ensure correct TargetAddress (ExternalEmailAddress) on mail-enabled users
   - Verify mailbox type (on-premises vs cloud) matches Autodiscover endpoint

4. **Resolution steps**:
   - Update InternalUrl and ExternalUrl on on-premises Autodiscover virtual directory
   - Configure split-brain DNS if needed
   - Set appropriate Autodiscover SCP in Active Directory

### Mobile Device Autodiscover

For mobile devices using ActiveSync:

1. **Verify autodiscover.json endpoint**:
   - Test `https://autodiscover.domain.com/autodiscover/autodiscover.json`
   - Check content type: `application/autodiscover+json`

2. **Common mobile-specific issues**:
   - TLS version compatibility
   - User Agent string filtering
   - ActiveSync virtual directory configuration

3. **Resolution steps**:
   - Configure TLS settings to support mobile clients
   - Update ActiveSync virtual directory URLs
   - Check mobile device access rules in Exchange

## Preventive Maintenance

To minimize Autodiscover issues, implement these preventive measures:

1. **Regular certificate maintenance**:
   - Monitor certificate expiration dates
   - Ensure certificate includes all required domain names
   - Maintain proper certificate trust chains

2. **DNS health checks**:
   - Verify internal and external DNS resolution regularly
   - Monitor for unauthorized DNS changes
   - Validate SRV and CNAME records monthly

3. **Client configuration auditing**:
   - Check for policy-enforced registry settings
   - Ensure consistent proxy configuration
   - Validate Outlook version and update status

4. **Documentation maintenance**:
   - Keep Autodiscover endpoint inventory updated
   - Document custom configurations and exceptions
   - Maintain troubleshooting runbooks for common scenarios

## Decision Tree for Autodiscover Issues

```
START: Autodiscover Issue Detected
├── Is the issue affecting all users?
│   ├── YES → Check infrastructure:
│   │         1. Verify external DNS records for autodiscover.domain.com
│   │         2. Check certificate validity on Autodiscover endpoint
│   │         3. Test network connectivity to Autodiscover URLs
│   │         4. Validate SCP records in Active Directory
│   └── NO → Is the issue specific to certain networks?
│       ├── YES → Check network-specific settings:
│       │         1. Verify proxy configuration for affected networks
│       │         2. Check firewall rules for HTTPS traffic (port 443)
│       │         3. Test internal vs. external DNS resolution
│       │         4. Verify split-brain DNS configuration if applicable
│       └── NO → Is the issue specific to certain clients?
│           ├── YES → Check client configuration:
│           │         1. Verify Outlook version and updates
│           │         2. Check client-specific registry settings
│           │         3. Inspect credential cache for outdated entries
│           │         4. Test with new Outlook profile
│           └── NO → Is the issue specific to certain mailboxes?
│               ├── YES → Check mailbox configuration:
│               │         1. Verify mailbox location (on-premises vs. cloud)
│               │         2. Check user proxy addresses and routing
│               │         3. Validate authentication methods for the mailbox
│               │         4. Test with account-specific diagnostics
│               └── NO → Conduct comprehensive testing:
│                       1. Enable detailed Autodiscover logging
│                       2. Use Microsoft Remote Connectivity Analyzer
│                       3. Perform network captures during Autodiscover process
│                       4. Test each Autodiscover method manually
```
