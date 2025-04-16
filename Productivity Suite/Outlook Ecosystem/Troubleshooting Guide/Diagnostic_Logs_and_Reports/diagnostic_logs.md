# Diagnostic Logs and Reports for Outlook Troubleshooting

## Overview

This document provides comprehensive guidance on collecting, analyzing, and interpreting diagnostic data from the Outlook ecosystem. Effective log collection and analysis are essential for troubleshooting complex issues, particularly those that cannot be easily reproduced or occur intermittently.

## Log Collection Methods

### Outlook Client Logging

#### Enable ETL Logging in Outlook for Windows

1. **Create registry keys** (can be distributed via GPO):

```
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Mail]
"EnableLogging"=dword:00000001
"EnableETW"=dword:00000001

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Calendar]
"EnableCalendarLogging"=dword:00000001

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Diagnostics]
"RPCMaxLoggingBytes"=dword:00ffffff
"RPCRecordingDuration"=dword:00000017
"EnableMailLogging"=dword:00000001
"EnableRTELogging"=dword:00000001
"EnablePSTLogging"=dword:00000001
"EnableSearchLogging"=dword:00000001
```

2. **Locate generated logs**:
   - `%TEMP%\Outlook Logging\`
   - Look for `.etl` files with naming pattern: `olkdiag_*.etl`

3. **Disable logging** once the issue is captured:

```
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Mail]
"EnableLogging"=dword:00000000
"EnableETW"=dword:00000000

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Calendar]
"EnableCalendarLogging"=dword:00000000

[HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Diagnostics]
"EnableMailLogging"=dword:00000000
"EnableRTELogging"=dword:00000000
"EnablePSTLogging"=dword:00000000
"EnableSearchLogging"=dword:00000000
```

#### Command-Line Logging

For immediate diagnostics without registry modification:

```
outlook.exe /log /rpcdiag /autodiscover
```

Options include:
- `/log` - Enable general Outlook logging
- `/rpcdiag` - Log RPC communications
- `/autodiscover` - Log Autodiscover process

#### Outlook Mac Logging

1. **Enable logging**:
   - Hold Option key and select Help > Troubleshooting
   - Enable "Logging" and set appropriate levels

2. **Locate logs**:
   - `~/Library/Containers/com.microsoft.Outlook/Data/Library/Logs/`
   - Look for files with pattern `Outlook_*.log`

### Network Trace Collection

#### Fiddler Trace

1. **Setup**:
   - Download and install [Fiddler](https://www.telerik.com/fiddler)
   - Configure HTTPS decryption (Tools > Options > HTTPS > Decrypt HTTPS Traffic)
   - Accept the certificate prompt

2. **Capturing**:
   - Start Fiddler before reproducing the issue
   - Clear the existing captured data (File > Clear All Sessions)
   - Reproduce the issue in Outlook
   - Save the trace (File > Save > All Sessions)

3. **Filtering recommendations**:
   - Host filter: `outlook.office365.com; outlook.office.com; autodiscover-s.outlook.com`
   - Process filter: `OUTLOOK.EXE`
   - HTTP status: Focus on non-200 responses (4xx, 5xx)

#### Netmon/Wireshark Capture

For lower-level network issues:

1. **Install** [Wireshark](https://www.wireshark.org/) or Microsoft Network Monitor

2. **Capture configuration**:
   - Filter for Outlook server traffic: `host outlook.office365.com or host autodiscover-s.outlook.com`
   - Filter for Outlook process: `tcp.port == 443 and proc:outlook.exe`

3. **Analyze packets**:
   - Focus on TCP handshake issues
   - Check for TLS negotiation failures
   - Identify DNS resolution problems

### Exchange Server Logs

#### Exchange Online PowerShell Diagnostics

1. **Connect to Exchange Online**:

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
```

2. **Mail flow troubleshooting**:

```powershell
# Check message trace for a specific sender
Get-MessageTrace -SenderAddress user@contoso.com -StartDate (Get-Date).AddHours(-24) -EndDate (Get-Date)

# Get detailed message tracking
$MessageID = "<message-id-from-headers>"
Get-MessageTraceDetail -MessageId $MessageID
```

3. **Export mail flow logs**:

```powershell
# Export message trace to CSV
Get-MessageTrace -SenderAddress user@contoso.com -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date) | Export-Csv -Path "C:\Logs\MessageTrace.csv" -NoTypeInformation
```

#### Exchange Admin Center Reports

1. Navigate to [Exchange Admin Center](https://admin.exchange.microsoft.com)
2. Select Reports > Mail flow
3. Configure report parameters and download in desired format

### Microsoft 365 Admin Center Logs

1. Navigate to [Microsoft 365 Admin Center](https://admin.microsoft.com)
2. Go to Health > Service health or Message center
3. Export reports as needed for documentation

## Automated Diagnostic Tools

### Microsoft Support and Recovery Assistant (SaRA)

1. **Download** [Microsoft Support and Recovery Assistant](https://aka.ms/SaRA)
2. **Run** the tool and select "Outlook" as the problematic app
3. **Follow** the wizard to collect relevant diagnostics
4. **Review** the findings and apply suggested resolutions
5. **Save** diagnostic report for support cases if needed

### Outlook Diagnostic Service

1. In Outlook, select **File > Help > Contact Support**
2. Choose "Run diagnostics"
3. Review results and apply suggested fixes

## Log Analysis Techniques

### Log Analysis for Common Issues

| Issue Type | Key Log Indicators | Where to Look |
|------------|-------------------|---------------|
| Authentication | 401 errors, token failures | Fiddler trace, ETL logs |
| Connectivity | DNS failures, TCP errors | Wireshark, Fiddler trace |
| Performance | High response times | Fiddler timeline, ETL performance markers |
| Sync issues | Sync command errors | ETL logs, message trace logs |
| Search problems | IndexState errors | Search diagnostic ETL logs |
| Calendar issues | Exchange 500 errors | Calendar ETL logs, message trace |

### ETL Log Analysis

1. **Common error patterns**:
   - `[Error]` entries indicate failures
   - Code patterns: `0x8***` (Windows errors), `0x4***` (COM errors)
   - Time correlation between actions and errors

2. **Performance indicators**:
   - Look for operation timings exceeding thresholds
   - Check for retry patterns suggesting timeouts
   - Identify resource bottlenecks (CPU, memory, disk)

### Fiddler Trace Analysis Steps

1. **Status code review**:
   - 200/201: Successful operations
   - 401/403: Authentication/authorization failures
   - 404: Resource not found (often autodiscover paths)
   - 408: Request timeout (network issues)
   - 429: Throttling/rate limiting
   - 500-level: Server-side failures

2. **Sequence analysis**:
   - Review the chain of requests for logical flow
   - Identify missing or out-of-sequence requests
   - Check for excessive retry patterns

3. **Performance metrics**:
   - Time to first byte (TTFB)
   - Overall response time
   - DNS lookup time
   - SSL handshake duration

## Advanced Diagnostic Techniques

### Process Monitor Analysis

1. **Download** [Process Monitor](https://docs.microsoft.com/en-us/sysinternals/downloads/procmon)
2. **Configure filters**:
   - Process Name is "OUTLOOK.EXE"
   - Operation includes "File System" or "Registry" as needed
3. **Capture** during issue reproduction
4. **Analyze** for access denied errors, file contention, or registry issues

### Memory Dump Analysis

For crash or hang scenarios:

1. **Generate dump**:
   - Task Manager > Details > Right-click OUTLOOK.EXE > Create dump file
   - Or use Windows Error Reporting collected dumps

2. **Analyze with WinDbg**:
   - Load symbols from Microsoft Symbol Server
   - Run `!analyze -v` for initial crash analysis
   - Check stack traces using `k` command
   - Look for exception information

## Specialized Log Analysis

### MAPI HTTP Protocol Logging

1. **Enable** MAPI HTTP logging:

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Mail
EnableMapiHttpTracing (DWORD) = 1
MapiHttpTracingLocation (STRING) = C:\Logs\MapiHttp
```

2. **Collect logs** during issue reproduction
3. **Analyze** request/response patterns in log files

### Autodiscover Troubleshooting Logs

1. **Enable** Autodiscover logging:

```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\AutoDiscover
EnableLogging (DWORD) = 1
```

2. **Review logs** at:
   - `%TEMP%\Outlook Logging\AutoDiscover*.log`

3. **Key indicators**:
   - Successful/failed endpoints
   - Redirect chains
   - Certificate errors
   - Authentication failures

## Interpreting and Documenting Results

### Effective Log Documentation

When submitting logs for escalation:

1. **Provide context**:
   - Precise description of the issue
   - Steps to reproduce
   - Timing of log collection relative to issue occurrence
   - Environment details (OS, Outlook version, network type)

2. **Highlight relevant sections**:
   - Timestamp of issue occurrence
   - Error codes and messages
   - Changed behavior compared to baseline

3. **Include related logs**:
   - Combine client and server logs where possible
   - Include before, during, and after issue timeframes

### Common Error Code Reference

| Error Code | Description | Common Resolution Paths |
|------------|-------------|-------------------------|
| 0x8004010F | Cannot access Outlook data | Repair OST/PST, check NTFS permissions |
| 0x80040600 | Invalid formatting in profile | Reset mail profile |
| 0x80042108 | Cannot connect to mail server | Check network and server status |
| 0x80042109 | Authentication failure | Verify credentials, check MFA status |
| 0x8004011D | Cannot open PST/OST file | Run scanpst.exe, check file permissions |
| 0x80070005 | Access denied | Check permissions on resources |
| 0x8007000E | Out of memory | Check available system resources |
| 0x80072EE2 | Cannot establish connection | Verify network connectivity |
| 0x80072EFD | TLS/SSL error | Check certificate configuration |
| 0x80072F0D | Server name not resolved | Check DNS configuration |

## Log Handling and Security

### Data Privacy Considerations

When collecting and sharing logs:

1. **Sanitize sensitive data**:
   - Remove personally identifiable information (PII)
   - Redact email addresses, names, and IP addresses as appropriate
   - Exclude authentication tokens and passwords

2. **Secure transmission**:
   - Use encrypted channels for log transfer
   - Password-protect log archives
   - Follow organizational data handling policies

3. **Retention policy**:
   - Delete logs once issue is resolved
   - Follow organizational retention policies
   - Consider legal/compliance requirements

## Related Resources

- [Microsoft Exchange Server Diagnostic Tools](link-to-exchange-tools)
- [Office 365 Troubleshooting Resources](link-to-o365-resources)
- [Outlook Logging Registry Settings Reference](link-to-registry-settings)
- [Professional Outlook Troubleshooting Courses](link-to-training)
