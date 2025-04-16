# MAPI Over HTTP Configuration

## Overview

MAPI over HTTP (Messaging Application Programming Interface over HTTP) is the primary connectivity protocol for Outlook clients connecting to Exchange Server 2013 SP1 and later, as well as Exchange Online. This document provides comprehensive guidance on configuring, optimizing, and troubleshooting MAPI over HTTP to ensure reliable Outlook connectivity.

## Protocol Architecture

MAPI over HTTP was introduced as a replacement for RPC over HTTP (Outlook Anywhere) and offers several improvements:

1. **Direct transport layer connection** - MAPI commands are sent directly over HTTP, eliminating the RPC layer
2. **Connection resiliency** - Better handling of network interruptions and connection timeouts
3. **Performance optimization** - Reduced connection latency and improved battery life for mobile devices
4. **Enhanced security** - Designed with modern authentication methods in mind

### Protocol Components

The MAPI over HTTP architecture consists of:

1. **Client component** - Built into Outlook 2013 and later
2. **Transport layer** - HTTPS protocol for secure transmission
3. **Server component** - MAPI virtual directory on Exchange servers
4. **Authentication layer** - Integrated Windows Authentication, NTLM, Kerberos, or OAuth

### Communication Flow

```
Outlook Client → HTTP Request → Load Balancer → Exchange Client Access Server → Mailbox Server
```

## Protocol Version Control

### Supported Protocol Versions

| Client Version | Protocol Version | Features | Notes |
|----------------|-----------------|----------|-------|
| Outlook 2013 (15.0.4535.1004+) | 1 | Basic MAPI over HTTP | Initial implementation |
| Outlook 2016 (16.0.4266.1001+) | 2 | Performance improvements | Recommended minimum |
| Outlook 2019/Microsoft 365 | 3 | Enhanced security, compression | Current standard |
| Outlook 2021/Microsoft 365 | 4 | Advanced caching, resilience | Latest version |

### Configuring Client Protocol Version

The client protocol version can be managed through registry settings:

```
HKEY_CURRENT_USER\Software\Microsoft\Exchange\MapiHttpVersion
```

**Values:**
- Not set: Client uses highest supported version
- 1: Force version 1 protocol
- 0: Disable MAPI over HTTP (fall back to RPC over HTTP if available)

### PowerShell Commands for Server Version Control

```powershell
# Check current MAPI virtual directory settings
Get-MapiVirtualDirectory | FL Server,*URL*,*Version*,*Auth*

# Set minimum protocol version (Exchange Server)
Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -MinimumSupportedMapiHttpVersion 2

# Set maximum protocol version (Exchange Server)
Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -MaximumSupportedMapiHttpVersion 4
```

## Server-Side Configuration

### Enabling MAPI over HTTP on Exchange Server

MAPI over HTTP must be explicitly enabled on Exchange Server 2013 SP1 or later:

```powershell
# Check if MAPI over HTTP is enabled
Get-OrganizationConfig | FL MapiHttpEnabled

# Enable MAPI over HTTP
Set-OrganizationConfig -MapiHttpEnabled $true

# Verify the change
Get-OrganizationConfig | FL MapiHttpEnabled
```

### Configuring Virtual Directories

The MAPI virtual directory must be properly configured:

```powershell
# Get current configuration
Get-MapiVirtualDirectory | FL Server,*url*,*auth*

# Configure internal URL
Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -InternalUrl https://mail.contoso.com/mapi

# Configure external URL
Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -ExternalUrl https://mail.contoso.com/mapi

# Configure authentication methods
Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -IISAuthenticationMethods NTLM,Negotiate,OAuth
```

### URL Configuration Best Practices

1. **Use consistent URLs** - InternalURL and ExternalURL should match the primary mail domain
2. **Include SSL certificates** - Ensure certificates cover all MAPI URLs
3. **Avoid IP addresses** - Always use FQDNs instead of IP addresses
4. **Consider split-brain DNS** - For different internal/external routing

### TLS Configuration

MAPI over HTTP requires proper TLS configuration:

```powershell
# Check current TLS settings in IIS
Get-WebBinding -Name "Default Web Site" | Where-Object {$_.bindingInformation -like "*443*"}

# Configure strong TLS settings
New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" -Force
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" -Name "Enabled" -Value 1 -PropertyType DWORD
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" -Name "DisabledByDefault" -Value 0 -PropertyType DWORD
```

## Client-Side Configuration

### Registry Settings for MAPI over HTTP

```
HKEY_CURRENT_USER\Software\Microsoft\Exchange
```

| Value Name | Type | Description | Recommended Setting |
|------------|------|-------------|---------------------|
| MapiHttpEnabled | DWORD | Enable/disable MAPI over HTTP | 1 (enabled) |
| MapiHttpTimeout | DWORD | Timeout in seconds | 30-180 (environment dependent) |
| EnableMapiOverHttpExceptions | DWORD | Allow specific exceptions | 1 (enabled) |
| AllowMAPIOverNonHttps | DWORD | Allow unencrypted connection | 0 (disabled) |
| MapiHttpAllowFQDNListForV2 | String | FQDN exceptions for protocol v2 | blank (unless needed) |

### Group Policy Configuration

MAPI over HTTP can be configured via Group Policy:

1. **Create GPO** targeting Outlook clients
2. Navigate to **User Configuration → Preferences → Windows Settings → Registry**
3. Add registry settings for MAPI over HTTP configuration
4. Link GPO to appropriate Organizational Units

### Office Customization Tool (OCT)

For Office deployment:

1. Download Office Deployment Tool
2. Create configuration XML file with desired settings:
```xml
<Configuration>
  <Add OfficeClientEdition="64" Channel="Current">
    <Product ID="O365ProPlusRetail">
      <Language ID="en-us" />
      <ExcludeApp ID="Access" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
      <ExcludeApp ID="Publisher" />
    </Product>
  </Add>
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
  <Updates Enabled="TRUE" Channel="Current" />
  <Display Level="None" AcceptEULA="TRUE" />
  <Property Name="AUTOACTIVATE" Value="1" />
  <Property Name="MAPIOVERHTTP" Value="1" />
</Configuration>
```

## Proxy Server Compatibility

### Configuring Proxy Settings

MAPI over HTTP works with proxy servers but requires specific configuration:

1. **Authentication compatibility** - Proxy must support NTLM/Kerberos passthrough or OAuth
2. **Connection persistence** - Should maintain persistent connections
3. **Timeout settings** - Must allow longer timeouts for MAPI sessions
4. **SSL inspection** - If used, must properly handle Exchange certificates

### Recommended Proxy Exclusions

Add these URLs to proxy bypass list for optimal performance:

```
*.outlook.com
*.outlook.office365.com
*.exchange.microsoft.com
outlook.office365.com
autodiscover-s.outlook.com
```

### Client Proxy Configuration

On Outlook clients:

1. Open **File → Options → Advanced → Connection → Exchange Proxy Settings**
2. Configure appropriate proxy server settings
3. Enable **"On fast networks, connect using HTTP first, then connect using TCP/IP"**
4. Enable **"On slow networks, connect using HTTP first, then connect using TCP/IP"**

## Performance Optimization

### Server-Side Optimization

```powershell
# Configure MAPI Frontend Service
Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -MaximumConnections 100000

# Configure IIS settings for MAPI
Set-WebConfigurationProperty -Filter system.webServer/serverRuntime -Name uploadReadAheadSize -Value 102400 -PSPath "IIS:\Sites\Default Web Site\mapi"

# Optimize application pool
Set-WebConfigurationProperty -Filter system.applicationHost/applicationPools/add[@name='MSExchangeMapiFrontEndAppPool']/processModel -Name idleTimeout -Value "00:00:00"
```

### Client-Side Optimization

Registry settings for client performance:

```
HKEY_CURRENT_USER\Software\Microsoft\Exchange
```

| Value Name | Type | Description | Optimized Setting |
|------------|------|-------------|-------------------|
| ConnectionTimeout | DWORD | Connection timeout in seconds | 60 |
| ConnectionRetryCount | DWORD | Number of retries | 10 |
| ConnectionRetryDelay | DWORD | Delay between retries (ms) | 5000 |
| MaximumConnectionsPerServer | DWORD | Max connections | 10 |

### Network Optimization

1. **Bandwidth allocation** - Prioritize MAPI traffic on QoS-enabled networks
2. **Latency management** - Keep client-to-server latency below 100ms if possible
3. **Connection persistence** - Configure firewalls to maintain MAPI session state

## Monitoring and Logging

### Client-Side Logging

Enable detailed MAPI logging in Outlook:

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Mail
```

| Value Name | Type | Value | Purpose |
|------------|------|-------|---------|
| EnableMAPIDetailsLogging | DWORD | 1 | Enable detailed MAPI logs |
| EnableMAPIProtocolLogging | DWORD | 1 | Enable protocol level logging |

Log location: `%TEMP%\Outlook Logging\`

### Server-Side Logging

On Exchange Server:

```powershell
# Enable MAPI protocol logging
Set-EventLogLevel -Identity "MSExchange MapiHttp\Protocol" -Level Expert

# Enable MAPI transport logging
Set-EventLogLevel -Identity "MSExchange MapiHttp\Transport" -Level Expert

# Check logs in Event Viewer
# Applications and Services Logs > Microsoft > Exchange > MAPI Client Access
```

### Performance Monitoring

Key metrics to monitor:

| Metric | Warning Threshold | Critical Threshold | Resolution |
|--------|-------------------|-------------------|------------|
| MAPI connection count | >5000 | >8000 | Scale out CAS servers |
| Average response time | >500ms | >1000ms | Network optimization |
| Authentication failures | >5% | >10% | Check authentication config |
| Connection timeouts | >2% | >5% | Increase timeout values |

## Troubleshooting

### Common Issues and Resolutions

1. **"Cannot connect to Exchange" errors**
   - Check MAPI virtual directory configuration
   - Verify client MAPI over HTTP settings
   - Test basic connectivity to MAPI endpoint

2. **Slow performance**
   - Check network latency between client and server
   - Monitor server-side resource utilization
   - Verify proxy server configuration

3. **Intermittent disconnections**
   - Increase client-side timeout values
   - Check for network stability issues
   - Verify load balancer persistence settings

4. **Authentication failures**
   - Verify authentication methods on virtual directory
   - Check client credentials and token validity
   - Test with basic authentication (for diagnostic purposes only)

### Diagnostic Commands

```powershell
# Test MAPI connectivity (Exchange Online)
$UserCredential = Get-Credential
$Session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri https://outlook.office365.com/powershell-liveid/ -Credential $UserCredential -Authentication Basic -AllowRedirection
Import-PSSession $Session -DisableNameChecking
Test-MAPIConnectivity -ProbeIdentity MapiProxyProbePriority

# Test MAPI connectivity (On-premises)
Test-MAPIConnectivity -Server ExchangeServer01

# Check connection count
Get-Counter -Counter "\MSExchange MapiHttp\Current Connections"
```

### Network Diagnostics

1. **Test basic connectivity**:
   ```
   telnet mail.contoso.com 443
   ```

2. **Check certificate validity**:
   ```powershell
   $req = [Net.HttpWebRequest]::Create("https://mail.contoso.com/mapi")
   $req.GetResponse() | Out-Null
   $req.ServicePoint.Certificate.GetExpirationDateString()
   ```

3. **Verify HTTP response**:
   ```powershell
   $req = [Net.HttpWebRequest]::Create("https://mail.contoso.com/mapi/emsmdb")
   $req.Method = "OPTIONS"
   $req.GetResponse().Headers["X-ServerApplication"]
   # Should return "Exchange/15.X.X.X"
   ```

## Migration from RPC over HTTP

### Migration Assessment

Before migrating from RPC over HTTP (Outlook Anywhere):

1. **Client readiness**:
   - Verify Outlook 2013 SP1 or later
   - Check for required Windows updates
   - Assess third-party add-in compatibility

2. **Server readiness**:
   - Exchange 2013 SP1 or later
   - Required Windows updates
   - Sufficient resources for protocol processing

3. **Network readiness**:
   - Firewall rules for MAPI over HTTP
   - Proxy server compatibility
   - SSL inspection configurations

### Migration Process

1. **Preparation phase**:
   ```powershell
   # Set up MAPI virtual directory
   Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -InternalUrl https://mail.contoso.com/mapi -ExternalUrl https://mail.contoso.com/mapi
   
   # Configure authentication
   Set-MapiVirtualDirectory -Identity "SERVERNAME\mapi (Default Web Site)" -IISAuthenticationMethods NTLM,Negotiate,OAuth
   
   # Run IIS Reset
   Invoke-Command -ComputerName SERVERNAME -ScriptBlock {iisreset /noforce}
   ```

2. **Testing phase**:
   - Test with pilot user group
   - Enable MAPI over HTTP for test users only
   - Monitor performance and connectivity

3. **Deployment phase**:
   ```powershell
   # Enable MAPI over HTTP organization-wide
   Set-OrganizationConfig -MapiHttpEnabled $true
   ```

4. **Verification phase**:
   - Monitor client connection methods
   - Check for connection errors
   - Verify performance metrics

### Coexistence Settings

During migration, to allow both protocols:

```powershell
# Allow both protocols to operate simultaneously
Set-OrganizationConfig -MapiHttpEnabled $true

# Keep RPC over HTTP enabled
Get-OutlookAnywhere | Set-OutlookAnywhere -ExternalClientsRequireSsl $true -InternalClientsRequireSsl $true -ExternalClientAuthenticationMethod Ntlm
```

## Decision Tree for MAPI Over HTTP Issues

```
START: MAPI over HTTP Issue
├── Is MAPI over HTTP enabled?
│   ├── NO → Enable MAPI over HTTP:
│   │         1. On server: Set-OrganizationConfig -MapiHttpEnabled $true
│   │         2. On client: Set MapiHttpEnabled registry value to 1
│   │         3. Verify configuration with Test-MAPIConnectivity
│   └── YES → Can Outlook connect using MAPI over HTTP?
│       ├── NO → Check connectivity fundamentals:
│       │         1. Verify MAPI virtual directory configuration
│       │         2. Test network connectivity to MAPI endpoints
│       │         3. Check authentication settings
│       │         4. Verify SSL certificates are valid
│       │         5. Check client registry settings for MAPI over HTTP
│       └── YES → Is performance poor or connectivity intermittent?
│           ├── YES → Optimize configuration:
│           │         1. Check network latency and stability
│           │         2. Adjust timeout values if needed
│           │         3. Verify proxy configuration
│           │         4. Optimize resource allocation on server
│           │         5. Consider client-side performance settings
│           └── NO → Are there compatibility issues with specific clients?
│               ├── YES → Address client-specific issues:
│               │         1. Verify Outlook version and updates
│               │         2. Check for problematic add-ins
│               │         3. Test with new profile
│               │         4. Consider protocol version compatibility
│               └── NO → Is infrastructure properly configured?
│                       1. Verify load balancer settings
│                       2. Check for SSL offloading issues
│                       3. Validate Exchange health overall
│                       4. Monitor MAPI service performance
```

## References and Resources

1. **Microsoft Documentation**:
   - [Configure MAPI over HTTP in Exchange Server](https://docs.microsoft.com/en-us/exchange/configure-mapi-over-http-exchange-2013-help)
   - [MAPI over HTTP in Exchange Online](https://docs.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/mapi-over-http/mapi-over-http)

2. **PowerShell References**:
   - [Get-MapiVirtualDirectory](https://docs.microsoft.com/en-us/powershell/module/exchange/get-mapivirtualdirectory)
   - [Set-MapiVirtualDirectory](https://docs.microsoft.com/en-us/powershell/module/exchange/set-mapivirtualdirectory)
   - [Test-MAPIConnectivity](https://docs.microsoft.com/en-us/powershell/module/exchange/test-mapiconnectivity)

3. **Best Practices**:
   - [Exchange Deployment Assistant](https://aka.ms/exdeploy)
   - [Exchange Server Role Requirements Calculator](https://aka.ms/exchangecalc)
