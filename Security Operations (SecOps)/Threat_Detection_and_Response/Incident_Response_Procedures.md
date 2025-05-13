## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Introduction](#introduction)
3. [Incident Classification Framework](#incident-classification-framework)
4. [Incident Response Team Structure](#incident-response-team-structure)
5. [Incident Response Lifecycle](#incident-response-lifecycle)
6. [Detection and Analysis](#detection-and-analysis)
7. [Containment, Eradication, and Recovery](#containment-eradication-and-recovery)
8. [Post-Incident Activities](#post-incident-activities)
9. [Communication Protocols](#communication-protocols)
10. [Escalation Procedures](#escalation-procedures)
11. [Evidence Collection and Preservation](#evidence-collection-and-preservation)
12. [Automation and Tooling](#automation-and-tooling)
13. [Azure-Specific Incident Response](#azure-specific-incident-response)
14. [Integration with Security Operations Center (SOC)](#integration-with-security-operations-center-soc)
15. [Continuous Improvement](#continuous-improvement)
16. [Appendices](#appendices)

## Executive Summary

This document provides comprehensive incident response procedures designed to enable rapid, effective, and consistent response to security incidents. These procedures align with industry standards including NIST SP 800-61, ISO/IEC 27035, and SANS incident response frameworks, while incorporating Azure-specific capabilities and automation opportunities.

### Key Principles
- **Rapid Response**: Minimize time to detect and respond to incidents
- **Consistent Methodology**: Standardized procedures ensure predictable outcomes
- **Evidence-Based Decision Making**: Data-driven approach to incident handling
- **Continuous Improvement**: Learn from each incident to enhance procedures
- **Automation First**: Leverage automation to reduce manual effort and human error

## Introduction

### Purpose
This document establishes standardized procedures for detecting, analyzing, and responding to security incidents within the organization's Azure cloud environment and related systems. These procedures ensure:
- Rapid identification and containment of security threats
- Minimal business impact from security incidents
- Proper evidence collection for forensic analysis
- Compliance with regulatory requirements
- Continuous improvement of security posture

### Scope
These procedures apply to:
- All security incidents affecting Azure resources
- Hybrid cloud environments with Azure connectivity
- On-premises systems integrated with Azure
- Third-party services connected to Azure infrastructure
- Data breaches involving Azure-hosted data
- Compliance violations in Azure environments

### Definitions
- **Security Incident**: An event that violates security policies, indicates a compromise, or threatens the confidentiality, integrity, or availability of information assets
- **Security Event**: Any observable occurrence in a system or network
- **Indicator of Compromise (IoC)**: Forensic artifact that suggests an intrusion
- **Incident Response Team (IRT)**: Designated personnel responsible for incident handling
- **Mean Time to Detect (MTTD)**: Average time to identify a security incident
- **Mean Time to Respond (MTTR)**: Average time to contain and remediate an incident

## Incident Classification Framework

### Severity Levels

#### Critical (Severity 1)
**Definition**: Incidents with immediate and severe business impact
**Characteristics**:
- Active data exfiltration in progress
- Complete system compromise
- Ransomware encryption of critical systems
- Regulatory compliance breach with immediate reporting requirements
- Customer data exposure affecting > 1000 records

**Response Requirements**:
- Immediate notification of CISO and executive team
- 24/7 incident response team activation
- External stakeholder communication within 1 hour
- Regulatory notification per compliance requirements

**SLA**: 
- Detection to response: 15 minutes
- Initial containment: 1 hour
- Full containment: 4 hours

#### High (Severity 2)
**Definition**: Significant security incidents with potential for major impact
**Characteristics**:
- Suspicious lateral movement detected
- Privileged account compromise
- Malware infection on critical systems
- Attempted data exfiltration
- Customer data exposure affecting < 1000 records

**Response Requirements**:
- Notification of security management within 30 minutes
- Core incident response team activation
- Business unit notification within 2 hours

**SLA**:
- Detection to response: 30 minutes
- Initial containment: 2 hours
- Full containment: 8 hours

#### Medium (Severity 3)
**Definition**: Security incidents with moderate business impact
**Characteristics**:
- Malware on non-critical systems
- Suspicious authentication patterns
- Policy violations with security implications
- Vulnerability exploitation attempts
- Phishing campaigns targeting employees

**Response Requirements**:
- Security team notification within 1 hour
- Standard incident response procedures
- Affected department notification

**SLA**:
- Detection to response: 2 hours
- Initial containment: 4 hours
- Full containment: 24 hours

#### Low (Severity 4)
**Definition**: Minor security events requiring investigation
**Characteristics**:
- Failed authentication attempts
- Port scanning activities
- Non-malicious policy violations
- False positive alerts requiring validation

**Response Requirements**:
- Standard security team review
- Documentation in incident tracking system
- Trend analysis for pattern detection

**SLA**:
- Detection to response: 8 hours
- Resolution: 48 hours

### Incident Categories

#### 1. Malware Infections
**Description**: Systems infected with malicious software
**Common Indicators**:
- Unusual network traffic patterns
- Unexpected system processes
- File encryption activities
- Registry modifications
- Antivirus alerts

**Initial Response**:
```bash
# Azure CLI command to isolate VM
az vm deallocate --resource-group <rg-name> --name <vm-name>

# PowerShell to quarantine on-premises system
Invoke-Command -ComputerName <hostname> -ScriptBlock {
    Stop-Computer -Force
}
```

#### 2. Unauthorized Access
**Description**: Illegitimate access to systems or data
**Common Indicators**:
- Failed login attempts from unusual locations
- Privilege escalation attempts
- Access to sensitive resources outside normal hours
- Multiple concurrent sessions for single user
- Use of dormant accounts

**Initial Response**:
```powershell
# Disable compromised account in Azure AD
Set-AzureADUser -ObjectId <user-id> -AccountEnabled $false

# Revoke all sessions
Revoke-AzureADUserAllRefreshToken -ObjectId <user-id>
```

#### 3. Data Breach
**Description**: Unauthorized access, disclosure, or exfiltration of sensitive data
**Common Indicators**:
- Large data transfers to external destinations
- Database dumps or exports
- Unusual file access patterns
- Email forwarding rules to external domains
- Cloud storage synchronization to unauthorized accounts

**Initial Response**:
```bash
# Monitor data exfiltration with Azure Sentinel
let timeframe = 1h;
let threshold = 100MB;
NetworkCommunicationEvents
| where TimeGenerated > ago(timeframe)
| where RemoteUrl !in (ApprovedDomains)
| summarize TotalBytes = sum(SentBytes) by SourceIP
| where TotalBytes > threshold
```

#### 4. Denial of Service (DoS)
**Description**: Attacks aimed at disrupting service availability
**Common Indicators**:
- Abnormal traffic spikes
- Resource exhaustion
- Service degradation
- Application crashes
- Network congestion

**Initial Response**:
```bash
# Enable Azure DDoS Protection
az network ddos-protection create \\
    --resource-group <rg-name> \\
    --name <protection-name> \\
    --location <location>

# Configure traffic filtering
az network nsg rule create \\
    --resource-group <rg-name> \\
    --nsg-name <nsg-name> \\
    --name BlockSuspiciousTraffic \\
    --priority 100 \\
    --source-address-prefixes <suspicious-ip> \\
    --destination-port-ranges '*' \\
    --access Deny
```

#### 5. Insider Threat
**Description**: Malicious activities by authorized users
**Common Indicators**:
- Access to systems outside job responsibilities
- Data downloads before resignation
- Unauthorized privilege modifications
- Bypassing security controls
- Unusual working hours

**Initial Response**:
```powershell
# Monitor privileged actions
Search-UnifiedAuditLog -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date) -Operations \"Add member to role\",\"Remove member from role\" -ResultSize 5000

# Enable enhanced auditing
Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true
```

#### 6. Ransomware
**Description**: Malware that encrypts data for ransom
**Common Indicators**:
- Mass file encryption
- Ransom notes in directories
- File extension changes
- Rapid disk I/O activity
- Shadow copy deletion

**Initial Response**:
```powershell
# Immediately isolate affected systems
# For Azure VMs
$vm = Get-AzVM -ResourceGroupName <rg-name> -Name <vm-name>
Stop-AzVM -ResourceGroupName <rg-name> -Name <vm-name> -Force

# Enable Azure Backup instant recovery
Enable-AzRecoveryServicesBackupProtection -Policy <policy-object> -Name <vm-name> -ResourceGroupName <rg-name>

# Check for volume shadow copies
vssadmin list shadows /for=C:
```

## Incident Response Team Structure

### Core Team Roles

#### Incident Response Manager
**Responsibilities**:
- Overall incident coordination
- Decision-making authority
- External communication management
- Resource allocation
- Escalation decisions

**Required Skills**:
- Incident management certification (GCIH, GNFA)
- Leadership and communication
- Risk assessment
- Business continuity planning

**Contact**: [24/7 phone number]
**Backup**: [Secondary contact]

#### Security Analyst
**Responsibilities**:
- Technical investigation
- Evidence collection
- Threat analysis
- System forensics
- Malware analysis

**Required Skills**:
- GIAC certifications (GCFA, GNFA)
- Azure security expertise
- Forensic tools proficiency
- Scripting abilities (PowerShell, Python)

**Contact**: [Contact information]
**Backup**: [Secondary contact]

#### Network Security Engineer
**Responsibilities**:
- Network traffic analysis
- Firewall rule modifications
- Network isolation implementation
- Traffic capture and analysis
- DDoS mitigation

**Required Skills**:
- Network security certifications
- Azure networking expertise
- Packet analysis
- IDS/IPS management

**Contact**: [Contact information]
**Backup**: [Secondary contact]

#### System Administrator
**Responsibilities**:
- System isolation
- Patch deployment
- System restoration
- Access control modifications
- Log collection

**Required Skills**:
- Azure administration
- Operating system expertise
- Automation tools
- Backup and recovery

**Contact**: [Contact information]
**Backup**: [Secondary contact]

#### Legal/Compliance Officer
**Responsibilities**:
- Regulatory requirement assessment
- Evidence chain of custody
- Legal guidance
- Law enforcement liaison
- Compliance reporting

**Required Skills**:
- Legal expertise
- Regulatory knowledge
- Data privacy laws
- Evidence handling

**Contact**: [Contact information]
**Backup**: [Secondary contact]

#### Communications Lead
**Responsibilities**:
- Stakeholder communication
- Public relations
- Customer notifications
- Internal updates
- Media relations

**Required Skills**:
- Crisis communication
- Public relations
- Technical writing
- Stakeholder management

**Contact**: [Contact information]
**Backup**: [Secondary contact]

### Extended Team Members

#### Cloud Architect
**When to Engage**: Cloud infrastructure incidents
**Responsibilities**: 
- Cloud service configuration
- Architecture security review
- Cloud-native solution design

#### Database Administrator
**When to Engage**: Database compromise or data breach
**Responsibilities**:
- Database security assessment
- Query analysis
- Data recovery
- Access audit

#### Application Developer
**When to Engage**: Application-layer attacks
**Responsibilities**:
- Code review
- Application logs analysis
- Security patch development
- API security assessment

#### Third-Party Vendors
**When to Engage**: Vendor system compromise
**Responsibilities**:
- Vendor system isolation
- Patch coordination
- Technical support
- Incident investigation support

### RACI Matrix

| Activity | Incident Manager | Security Analyst | Network Engineer | System Admin | Legal | Communications |
|----------|-----------------|------------------|------------------|--------------|-------|----------------|
| Initial Assessment | A/R | R | C | C | I | I |
| Severity Classification | A/R | R | C | C | C | I |
| Containment Decision | A | R | R | R | C | I |
| Evidence Collection | I | R | R | R | C | - |
| Stakeholder Communication | A | I | I | I | C | R |
| System Recovery | A | C | C | R | I | I |
| Regulatory Reporting | A | C | - | - | R | C |
| Post-Incident Review | R | R | R | R | C | C |

**Legend**: R = Responsible, A = Accountable, C = Consulted, I = Informed

## Incident Response Lifecycle

### 1. Preparation Phase

#### Security Monitoring Infrastructure
**Azure Sentinel Configuration**:
```kusto
// Custom alert rule for suspicious activities
let timeframe = 5m;
let threshold = 5;
SecurityEvent
| where TimeGenerated > ago(timeframe)
| where EventID == 4625 // Failed logon
| summarize FailedAttempts = count() by Account, Computer, IpAddress
| where FailedAttempts > threshold
| project-rename UserAccount = Account, 
                TargetComputer = Computer,
                SourceIP = IpAddress
```

**Azure Monitor Alerts**:
```json
{
  \"location\": \"eastus\",
  \"properties\": {
    \"severity\": 2,
    \"enabled\": true,
    \"scopes\": [\"/subscriptions/{subscription-id}\"],
    \"evaluationFrequency\": \"PT5M\",
    \"windowSize\": \"PT5M\",
    \"targetResourceTypes\": [\"Microsoft.Compute/virtualMachines\"],
    \"criteria\": {
      \"allOf\": [{
        \"query\": \"Perf | where ObjectName == 'Processor' and CounterName == '% Processor Time' | summarize AverageValue = avg(CounterValue) by bin(TimeGenerated, 5m)\",
        \"threshold\": 90,
        \"operator\": \"GreaterThan\"
      }]
    },
    \"actions\": {
      \"actionGroups\": [\"/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Insights/actionGroups/{action-group}\"]
    }
  }
}
```

#### Incident Response Tools
**Essential Toolset**:

1. **Forensic Tools**:
   - Azure Disk Snapshot for imaging
   - Autopsy/Sleuth Kit for file system analysis
   - Volatility for memory analysis
   - FTK Imager for evidence collection

2. **Network Analysis**:
   - Wireshark for packet capture
   - NetworkMiner for network forensics
   - Azure Network Watcher for cloud traffic
   - Zeek (formerly Bro) for network monitoring

3. **Log Analysis**:
   - Azure Log Analytics
   - Splunk/ELK Stack
   - PowerShell for log parsing
   - Azure Data Explorer for large-scale analysis

4. **Malware Analysis**:
   - IDA Pro/Ghidra for reverse engineering
   - Cuckoo Sandbox for behavioral analysis
   - VirusTotal for reputation checking
   - YARA for pattern matching

**Tool Deployment Script**:
```powershell
# Install incident response tools on investigation workstation
$tools = @{
    \"SysinternalsSuite\" = \"https://download.sysinternals.com/files/SysinternalsSuite.zip\"
    \"Wireshark\" = \"https://1.as.dl.wireshark.org/win64/Wireshark-win64-latest.exe\"
    \"NetworkMiner\" = \"https://www.netresec.com/?download=NetworkMiner\"
}

foreach ($tool in $tools.GetEnumerator()) {
    Write-Host \"Installing $($tool.Key)...\"
    Invoke-WebRequest -Uri $tool.Value -OutFile \"$env:TEMP\\$($tool.Key).zip\"
    Expand-Archive -Path \"$env:TEMP\\$($tool.Key).zip\" -DestinationPath \"C:\\IRTools\\$($tool.Key)\"
}
```

#### Communication Templates

**Initial Incident Notification**:
```
Subject: [URGENT] Security Incident - [Incident ID] - [Severity Level]

Incident Summary:
- Incident ID: [Generated ID]
- Detection Time: [Timestamp]
- Severity: [Critical/High/Medium/Low]
- Affected Systems: [System list]
- Initial Assessment: [Brief description]

Immediate Actions Taken:
- [Action 1]
- [Action 2]

Next Steps:
- [Planned action 1]
- [Planned action 2]

Incident Command:
- Incident Manager: [Name]
- Technical Lead: [Name]
- Communication Lead: [Name]

Updates will be provided every [frequency].

Contact: [Phone] | [Email] | [Slack Channel]
```

**Stakeholder Update Template**:
```
Subject: Security Incident Update - [Incident ID] - Update #[Number]

Current Status: [Investigating/Contained/Resolved]

Progress Since Last Update:
- [Completed action 1]
- [Completed action 2]

Key Findings:
- [Finding 1]
- [Finding 2]

Business Impact:
- Affected Services: [List]
- User Impact: [Number/Description]
- Estimated Recovery: [Timeframe]

Next Steps:
- [Planned action 1]
- [Timeline]

Questions/Concerns: [Contact information]

Next Update: [Scheduled time]
```

### 2. Detection and Analysis Phase

#### Detection Methods

**1. Automated Detection**:
```powershell
# Azure Sentinel Analytics Rule
let timeframe = 15m;
let threshold = 10;
SigninLogs
| where TimeGenerated > ago(timeframe)
| where ResultType != \"0\" // Failed logins
| summarize 
    FailedAttempts = count(),
    DistinctIPs = dcount(IPAddress),
    DistinctCountries = dcount(LocationDetails.countryOrRegion)
    by UserPrincipalName
| where FailedAttempts > threshold and DistinctIPs > 3
| project UserPrincipalName, FailedAttempts, DistinctIPs, DistinctCountries, 
    AlertSeverity = case(
        FailedAttempts > 50, \"High\",
        FailedAttempts > 20, \"Medium\",
        \"Low\")
```

**2. Threat Hunting Queries**:
```kusto
// Detect potential data exfiltration
let timeframe = 24h;
let data_threshold = 1GB;
union withsource=\"Table\" *
| where TimeGenerated > ago(timeframe)
| where isnotempty(SentBytes)
| summarize TotalDataOut = sum(todouble(SentBytes)) by SourceIP, DestinationIP
| where TotalDataOut > data_threshold
| join kind=leftouter (
    DeviceNetworkEvents
    | where TimeGenerated > ago(timeframe)
    | distinct DeviceId, LocalIP
) on $left.SourceIP == $right.LocalIP
| project SourceIP, DestinationIP, TotalDataGB = TotalDataOut/1024/1024/1024, DeviceId
```

**3. User Behavior Analytics**:
```kusto
// Detect unusual login patterns
let historical_window = 30d;
let detection_window = 1h;
let UserLogons = SigninLogs
| where TimeGenerated > ago(historical_window)
| project UserPrincipalName, IPAddress, Location, TimeGenerated;
let HistoricalData = UserLogons
| where TimeGenerated < ago(detection_window)
| summarize 
    HistoricalIPs = make_set(IPAddress),
    HistoricalLocations = make_set(Location)
    by UserPrincipalName;
let RecentData = UserLogons
| where TimeGenerated > ago(detection_window);
RecentData
| join kind=inner (HistoricalData) on UserPrincipalName
| where IPAddress !in (HistoricalIPs) or Location !in (HistoricalLocations)
| project UserPrincipalName, NewIP = IPAddress, NewLocation = Location, TimeGenerated
```

#### Initial Analysis Procedures

**Step 1: Alert Validation**
```powershell
# Validate suspicious process alert
function Validate-SuspiciousProcess {
    param(
        [string]$ComputerName,
        [string]$ProcessName,
        [string]$ProcessId
    )
    
    # Get process details
    $process = Get-WmiObject Win32_Process -ComputerName $ComputerName -Filter \"ProcessId=$ProcessId\"
    
    # Check process hash against threat intelligence
    $fileHash = Get-FileHash -Path $process.ExecutablePath -Algorithm SHA256
    $threatIntel = Invoke-RestMethod -Uri \"https://api.threatintel.com/check/$($fileHash.Hash)\"
    
    # Collect process metadata
    $processInfo = @{
        Name = $process.Name
        Path = $process.ExecutablePath
        CommandLine = $process.CommandLine
        ParentProcess = (Get-Process -Id $process.ParentProcessId).Name
        User = $process.GetOwner().User
        StartTime = $process.ConvertToDateTime($process.CreationDate)
        Hash = $fileHash.Hash
        ThreatIntelResult = $threatIntel
    }
    
    return $processInfo
}
```

**Step 2: Scope Assessment**
```powershell
# Determine incident scope
function Assess-IncidentScope {
    param(
        [string]$InitialIndicator,
        [string]$IndicatorType
    )
    
    $scope = @{
        AffectedSystems = @()
        AffectedUsers = @()
        TimeRange = @{}
        Indicators = @()
    }
    
    switch ($IndicatorType) {
        \"IPAddress\" {
            # Find all systems that communicated with suspicious IP
            $scope.AffectedSystems = Search-AzureLog -Query \"
                NetworkCommunicationEvents
                | where RemoteIP == '$InitialIndicator'
                | distinct DeviceName
            \"
        }
        \"FileHash\" {
            # Find all systems with the malicious file
            $scope.AffectedSystems = Search-AzureLog -Query \"
                DeviceFileEvents
                | where SHA256 == '$InitialIndicator'
                | distinct DeviceName
            \"
        }
        \"UserAccount\" {
            # Find all systems accessed by compromised account
            $scope.AffectedSystems = Search-AzureLog -Query \"
                DeviceLogonEvents
                | where AccountName == '$InitialIndicator'
                | distinct DeviceName
            \"
        }
    }
    
    return $scope
}
```

**Step 3: Evidence Collection**
```powershell
# Automated evidence collection
function Collect-IncidentEvidence {
    param(
        [string]$IncidentId,
        [string[]]$AffectedSystems
    )
    
    $evidencePath = \"\\\\evidence-share\\$IncidentId\"
    New-Item -ItemType Directory -Path $evidencePath -Force
    
    foreach ($system in $AffectedSystems) {
        Write-Host \"Collecting evidence from $system...\"
        
        # Memory dump
        Invoke-Command -ComputerName $system -ScriptBlock {
            & \"C:\\Tools\\DumpIt.exe\" /q /n \"$using:evidencePath\\$using:system-memory.dmp\"
        }
        
        # Event logs
        $logTypes = @(\"System\", \"Security\", \"Application\", \"Microsoft-Windows-Sysmon/Operational\")
        foreach ($log in $logTypes) {
            wevtutil export-log $log \"$evidencePath\\$system-$log.evtx\" /remote:$system
        }
        
        # Running processes
        Get-Process -ComputerName $system | Export-Csv \"$evidencePath\\$system-processes.csv\"
        
        # Network connections
        Invoke-Command -ComputerName $system -ScriptBlock {
            netstat -anob | Out-File \"$using:evidencePath\\$using:system-netstat.txt\"
        }
        
        # Registry snapshot
        Invoke-Command -ComputerName $system -ScriptBlock {
            reg export HKLM \"$using:evidencePath\\$using:system-HKLM.reg\"
            reg export HKCU \"$using:evidencePath\\$using:system-HKCU.reg\"
        }
    }
    
    # Create evidence manifest
    Get-ChildItem $evidencePath | Select-Object Name, Length, LastWriteTime | 
        Export-Csv \"$evidencePath\\evidence-manifest.csv\"
}
```

#### Analysis Techniques

**1. Timeline Analysis**:
```powershell
# Create unified timeline
function Create-IncidentTimeline {
    param(
        [string]$IncidentId,
        [datetime]$StartTime,
        [datetime]$EndTime
    )
    
    $timeline = @()
    
    # Collect events from multiple sources
    $sources = @{
        \"AzureActivity\" = \"AzureActivity | where TimeGenerated between ($StartTime .. $EndTime)\"
        \"SecurityEvents\" = \"SecurityEvent | where TimeGenerated between ($StartTime .. $EndTime)\"
        \"SigninLogs\" = \"SigninLogs | where TimeGenerated between ($StartTime .. $EndTime)\"
        \"AuditLogs\" = \"AuditLogs | where TimeGenerated between ($StartTime .. $EndTime)\"
    }
    
    foreach ($source in $sources.GetEnumerator()) {
        $events = Invoke-AzureLogQuery -Query $source.Value
        foreach ($event in $events) {
            $timeline += [PSCustomObject]@{
                Timestamp = $event.TimeGenerated
                Source = $source.Key
                EventType = $event.EventName ?? $event.OperationName ?? $event.Activity
                Details = $event
                Severity = Assess-EventSeverity $event
            }
        }
    }
    
    # Sort timeline and export
    $timeline | Sort-Object Timestamp | Export-Csv \"$IncidentId-timeline.csv\"
    
    # Create visual timeline
    Create-TimelineVisualization -Timeline $timeline -OutputPath \"$IncidentId-timeline.html\"
}
```

**2. Root Cause Analysis**:
```powershell
# Identify initial compromise vector
function Find-RootCause {
    param(
        [string]$CompromisedEntity,
        [datetime]$IncidentTime
    )
    
    # Look back 7 days before incident
    $lookbackTime = $IncidentTime.AddDays(-7)
    
    # Check for suspicious email
    $emailQuery = @\"
        EmailEvents
        | where RecipientEmailAddress == '$CompromisedEntity'
        | where TimeGenerated between ($lookbackTime .. $IncidentTime)
        | where ThreatTypes contains \"Phish\" or ThreatTypes contains \"Malware\"
        | project TimeGenerated, Subject, SenderFromAddress, ThreatTypes, NetworkMessageId
\"@
    
    # Check for vulnerable software
    $vulnerabilityQuery = @\"
        DeviceTvmSoftwareVulnerabilities
        | where DeviceName == '$CompromisedEntity'
        | where TimeGenerated <= $IncidentTime
        | where VulnerabilitySeverityLevel in (\"Critical\", \"High\")
        | project TimeGenerated, SoftwareName, CveId, VulnerabilitySeverityLevel
\"@
    
    # Check for unusual authentication
    $authQuery = @\"
        SigninLogs
        | where UserPrincipalName == '$CompromisedEntity' or AppDisplayName == '$CompromisedEntity'
        | where TimeGenerated between ($lookbackTime .. $IncidentTime)
        | where ResultType != \"0\" or RiskLevel != \"none\"
        | project TimeGenerated, UserPrincipalName, IPAddress, ResultType, RiskLevel
\"@
    
    $results = @{
        SuspiciousEmails = Invoke-AzureLogQuery -Query $emailQuery
        Vulnerabilities = Invoke-AzureLogQuery -Query $vulnerabilityQuery
        AuthenticationIssues = Invoke-AzureLogQuery -Query $authQuery
    }
    
    return $results
}
```

### 3. Containment Strategies

#### Short-Term Containment

**Network Isolation**:
```powershell
# Isolate compromised systems
function Invoke-NetworkIsolation {
    param(
        [string[]]$CompromisedSystems,
        [string]$IsolationVLAN = \"999\"
    )
    
    foreach ($system in $CompromisedSystems) {
        # For Azure VMs
        if (Test-AzureVM -VMName $system) {
            # Apply isolation NSG
            $nsg = New-AzNetworkSecurityGroup -Name \"IR-Isolation-$system\" -ResourceGroupName \"IR-Isolation\" -Location \"eastus\"
            
            # Deny all inbound except from IR team
            $nsgRule = New-AzNetworkSecurityRuleConfig -Name \"DenyAllInbound\" `
                -Protocol \"*\" `
                -Direction Inbound `
                -Priority 100 `
                -SourceAddressPrefix \"*\" `
                -SourcePortRange \"*\" `
                -DestinationAddressPrefix \"*\" `
                -DestinationPortRange \"*\" `
                -Access Deny
            
            $nsg.SecurityRules.Add($nsgRule)
            Set-AzNetworkSecurityGroup -NetworkSecurityGroup $nsg
            
            # Apply NSG to VM
            $vm = Get-AzVM -Name $system
            $nic = Get-AzNetworkInterface -ResourceId $vm.NetworkProfile.NetworkInterfaces[0].Id
            $nic.NetworkSecurityGroup = $nsg
            Set-AzNetworkInterface -NetworkInterface $nic
        }
        
        # For on-premises systems
        else {
            # Configure switch port isolation
            Invoke-Command -ComputerName \"switch-mgmt-01\" -ScriptBlock {
                # Cisco command to isolate port
                $config = @\"
                interface $using:system
                switchport access vlan $using:IsolationVLAN
                shutdown
                no shutdown
\"@
                Send-SwitchCommand -Commands $config
            }
        }
    }
}
```

**Account Lockdown**:
```powershell
# Disable compromised accounts
function Disable-CompromisedAccounts {
    param(
        [string[]]$UserAccounts,
        [switch]$RevokeTokens
    )
    
    foreach ($account in $UserAccounts) {
        # Disable Azure AD account
        Set-AzureADUser -ObjectId $account -AccountEnabled $false
        
        # Revoke all tokens if specified
        if ($RevokeTokens) {
            Revoke-AzureADUserAllRefreshToken -ObjectId $account
        }
        
        # Disable on-premises AD account
        Disable-ADAccount -Identity $account
        
        # Change password to random value
        $newPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 20 | ForEach-Object {[char]$_})
        Set-ADAccountPassword -Identity $account -NewPassword (ConvertTo-SecureString $newPassword -AsPlainText -Force) -Reset
        
        # Remove from privileged groups
        $privilegedGroups = Get-ADUser -Identity $account -Properties MemberOf | 
            Select-Object -ExpandProperty MemberOf |
            Where-Object { $_ -match \"admin|privileged|domain admins\" }
            
        foreach ($group in $privilegedGroups) {
            Remove-ADGroupMember -Identity $group -Members $account -Confirm:$false
        }
        
        # Log actions
        Write-EventLog -LogName \"Security\" -Source \"IR-AccountLockdown\" -EventId 9001 `
            -Message \"Account $account disabled as part of incident response\"
    }
}
```

#### Long-Term Containment

**System Rebuild Planning**:
```powershell
# Plan for system rebuild
function Plan-SystemRebuild {
    param(
        [string]$SystemName,
        [string]$IncidentId
    )
    
    $rebuildPlan = @{
        SystemName = $SystemName
        IncidentId = $IncidentId
        CurrentState = @{}
        RebuildSteps = @()
        DataBackup = @{}
        ValidationSteps = @()
    }
    
    # Capture current configuration
    if (Test-AzureVM -VMName $SystemName) {
        $vm = Get-AzVM -Name $SystemName
        $rebuildPlan.CurrentState = @{
            ResourceGroup = $vm.ResourceGroupName
            Location = $vm.Location
            Size = $vm.HardwareProfile.VmSize
            OSDisk = $vm.StorageProfile.OsDisk
            DataDisks = $vm.StorageProfile.DataDisks
            NetworkInterfaces = $vm.NetworkProfile.NetworkInterfaces
            Tags = $vm.Tags
        }
    }
    
    # Define rebuild steps
    $rebuildPlan.RebuildSteps = @(
        \"1. Create snapshot of current disks\"
        \"2. Deploy new VM from approved image\"
        \"3. Apply security baseline configuration\"
        \"4. Restore data from clean backup\"
        \"5. Reinstall required applications\"
        \"6. Apply all security patches\"
        \"7. Configure monitoring and logging\"
        \"8. Perform security validation\"
        \"9. Restore network connectivity\"
        \"10. Monitor for 48 hours\"
    )
    
    # Identify clean backup
    $rebuildPlan.DataBackup = Find-CleanBackup -SystemName $SystemName -BeforeDate $IncidentTime
    
    # Validation checklist
    $rebuildPlan.ValidationSteps = @(
        @{Check = \"Antivirus scan completed\"; Status = \"Pending\"},
        @{Check = \"Vulnerability scan passed\"; Status = \"Pending\"},
        @{Check = \"Security baseline applied\"; Status = \"Pending\"},
        @{Check = \"Logging configured\"; Status = \"Pending\"},
        @{Check = \"Monitoring alerts active\"; Status = \"Pending\"},
        @{Check = \"No suspicious processes\"; Status = \"Pending\"},
        @{Check = \"No unauthorized accounts\"; Status = \"Pending\"},
        @{Check = \"Firewall rules validated\"; Status = \"Pending\"}
    )
    
    # Export plan
    $rebuildPlan | ConvertTo-Json -Depth 5 | Out-File \"$IncidentId-$SystemName-rebuild.json\"
    
    return $rebuildPlan
}
```

### 4. Eradication Procedures

#### Malware Removal
```powershell
# Remove identified malware
function Remove-Malware {
    param(
        [string]$SystemName,
        [string]$MalwareHash,
        [string[]]$MalwarePaths
    )
    
    # Stop malicious processes
    $processes = Get-Process -ComputerName $SystemName | 
        Where-Object { 
            $hash = Get-FileHash $_.Path -Algorithm SHA256 -ErrorAction SilentlyContinue
            $hash.Hash -eq $MalwareHash 
        }
    
    foreach ($process in $processes) {
        Stop-Process -Id $process.Id -Force
    }
    
    # Remove malware files
    foreach ($path in $MalwarePaths) {
        Remove-Item -Path \"\\\\$SystemName\\$($path.Replace(':', '$'))\" -Force -ErrorAction SilentlyContinue
    }
    
    # Clean registry entries
    $registryKeys = @(
        \"HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\",
        \"HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\",
        \"HKLM:\\SYSTEM\\CurrentControlSet\\Services\"
    )
    
    Invoke-Command -ComputerName $SystemName -ScriptBlock {
        foreach ($key in $using:registryKeys) {
            Get-ItemProperty -Path $key | ForEach-Object {
                if ($_.PSObject.Properties.Value -match $using:MalwareHash) {
                    Remove-ItemProperty -Path $key -Name $_.PSObject.Properties.Name
                }
            }
        }
    }
    
    # Remove scheduled tasks
    $tasks = Get-ScheduledTask -CimSession $SystemName | 
        Where-Object { $_.Actions.Execute -match $MalwareHash }
    
    foreach ($task in $tasks) {
        Unregister-ScheduledTask -TaskName $task.TaskName -CimSession $SystemName -Confirm:$false
    }
    
    # Clear malware persistence
    Clear-MalwarePersistence -SystemName $SystemName -Hash $MalwareHash
}
```

#### Vulnerability Patching
```powershell
# Apply security patches
function Apply-SecurityPatches {
    param(
        [string[]]$Systems,
        [string[]]$CVEList
    )
    
    foreach ($system in $Systems) {
        Write-Host \"Patching $system...\"
        
        # For Windows systems
        if ((Get-WmiObject -Class Win32_OperatingSystem -ComputerName $system).Caption -match \"Windows\") {
            # Install specific updates
            foreach ($cve in $CVEList) {
                $update = Find-WindowsUpdate -CVE $cve
                if ($update) {
                    Install-WindowsUpdate -ComputerName $system -KBNumber $update.KBNumber
                }
            }
            
            # Install all critical updates
            Invoke-Command -ComputerName $system -ScriptBlock {
                Install-Module PSWindowsUpdate -Force
                Get-WindowsUpdate -AcceptAll -Install -AutoReboot:$false -Severity Critical
            }
        }
        
        # For Linux systems
        elseif (Test-LinuxSystem -SystemName $system) {
            Invoke-SSHCommand -HostName $system -Command @\"
                # Update package lists
                sudo apt-get update || sudo yum check-update
                
                # Apply security updates
                sudo apt-get upgrade -y --security || sudo yum update --security -y
                
                # Check for specific CVEs
                for cve in $($CVEList -join ' '); do
                    sudo apt-get install --only-upgrade $(dpkg -l | grep -i \\$cve | awk '{print $2}')
                done
\"@
        }
        
        # Verify patch installation
        Test-PatchInstallation -SystemName $system -CVEList $CVEList
    }
}
```

### 5. Recovery Procedures

#### System Restoration
```powershell
# Restore systems to production
function Restore-SystemToProduction {
    param(
        [string]$SystemName,
        [string]$IncidentId,
        [hashtable]$ValidationResults
    )
    
    # Pre-restoration checks
    if (-not (Test-SystemReadiness -SystemName $SystemName -ValidationResults $ValidationResults)) {
        throw \"System $SystemName failed readiness checks\"
    }
    
    # Restore network connectivity
    if (Test-AzureVM -VMName $SystemName) {
        # Remove isolation NSG
        $vm = Get-AzVM -Name $SystemName
        $nic = Get-AzNetworkInterface -ResourceId $vm.NetworkProfile.NetworkInterfaces[0].Id
        $prodNSG = Get-AzNetworkSecurityGroup -Name \"Production-NSG\" -ResourceGroupName $vm.ResourceGroupName
        $nic.NetworkSecurityGroup = $prodNSG
        Set-AzNetworkInterface -NetworkInterface $nic
    }
    
    # Re-enable services
    $services = @(\"W3SVC\", \"MSSQLSERVER\", \"CustomAppService\")
    foreach ($service in $services) {
        Set-Service -Name $service -ComputerName $SystemName -StartupType Automatic
        Start-Service -Name $service -ComputerName $SystemName
    }
    
    # Restore user access
    $authorizedUsers = Get-AuthorizedUsers -SystemName $SystemName
    foreach ($user in $authorizedUsers) {
        Grant-SystemAccess -SystemName $SystemName -UserName $user -AccessLevel $user.RequiredAccess
    }
    
    # Enable monitoring
    Enable-SecurityMonitoring -SystemName $SystemName -Enhanced:$true
    
    # Document restoration
    $restorationLog = @{
        SystemName = $SystemName
        IncidentId = $IncidentId
        RestorationTime = Get-Date
        RestoredBy = $env:USERNAME
        ValidationResults = $ValidationResults
        MonitoringEnabled = $true
        PostRestoreTasks = @(
            \"Monitor for anomalies - 72 hours\",
            \"Daily vulnerability scan - 7 days\",
            \"Review access logs - 14 days\"
        )
    }
    
    $restorationLog | ConvertTo-Json | Out-File \"$IncidentId-$SystemName-restoration.json\"
}
```

#### Data Recovery
```powershell
# Recover critical data
function Recover-CriticalData {
    param(
        [string]$SourceBackup,
        [string]$TargetSystem,
        [datetime]$RecoveryPoint,
        [string[]]$DataPaths
    )
    
    # Verify backup integrity
    if (-not (Test-BackupIntegrity -BackupPath $SourceBackup -RecoveryPoint $RecoveryPoint)) {
        throw \"Backup integrity check failed\"
    }
    
    # Mount backup
    $backupMount = Mount-Backup -BackupPath $SourceBackup -RecoveryPoint $RecoveryPoint
    
    try {
        foreach ($path in $DataPaths) {
            # Scan for malware before restoration
            $scanResult = Start-MalwareScan -Path \"$backupMount\\$path\"
            if ($scanResult.ThreatDetected) {
                Write-Warning \"Threat detected in $path - skipping restoration\"
                continue
            }
            
            # Restore data
            Copy-Item -Path \"$backupMount\\$path\" -Destination \"\\\\$TargetSystem\\$($path.Replace(':', '$'))\" -Recurse -Force
            
            # Verify restoration
            $sourceHash = Get-FileHash -Path \"$backupMount\\$path\" -Algorithm SHA256
            $targetHash = Get-FileHash -Path \"\\\\$TargetSystem\\$($path.Replace(':', '$'))\" -Algorithm SHA256
            
            if ($sourceHash.Hash -ne $targetHash.Hash) {
                throw \"Data integrity check failed for $path\"
            }
        }
        
        # Set appropriate permissions
        foreach ($path in $DataPaths) {
            Reset-FilePermissions -Path \"\\\\$TargetSystem\\$($path.Replace(':', '$'))\" -InheritFromParent
        }
    }
    finally {
        Dismount-Backup -MountPath $backupMount
    }
}
```

### 6. Post-Incident Activities

#### Lessons Learned Meeting
```powershell
# Generate post-incident report
function Generate-PostIncidentReport {
    param(
        [string]$IncidentId,
        [datetime]$IncidentStart,
        [datetime]$IncidentEnd
    )
    
    $report = @{
        IncidentId = $IncidentId
        Timeline = @{
            Start = $IncidentStart
            End = $IncidentEnd
            Duration = ($IncidentEnd - $IncidentStart).TotalHours
        }
        Impact = @{
            SystemsAffected = Get-AffectedSystems -IncidentId $IncidentId
            UsersImpacted = Get-ImpactedUsers -IncidentId $IncidentId
            DataCompromised = Get-CompromisedData -IncidentId $IncidentId
            ServiceDowntime = Calculate-ServiceDowntime -IncidentId $IncidentId
            EstimatedCost = Calculate-IncidentCost -IncidentId $IncidentId
        }
        RootCause = Get-IncidentRootCause -IncidentId $IncidentId
        Timeline = Get-IncidentTimeline -IncidentId $IncidentId
        Response = @{
            DetectionMethod = Get-DetectionMethod -IncidentId $IncidentId
            ResponseTime = Get-ResponseMetrics -IncidentId $IncidentId
            ContainmentActions = Get-ContainmentActions -IncidentId $IncidentId
            EradicationSteps = Get-EradicationSteps -IncidentId $IncidentId
            RecoveryProcess = Get-RecoveryProcess -IncidentId $IncidentId
        }
        Recommendations = @(
            \"Implement additional monitoring for [specific threat]\",
            \"Update incident response procedures section [X]\",
            \"Conduct training on [specific skill gap]\",
            \"Deploy [specific security control]\",
            \"Review and update [specific policy]\"
        )
        Metrics = @{
            MTTD = Calculate-MTTD -IncidentId $IncidentId
            MTTR = Calculate-MTTR -IncidentId $IncidentId
            MTTC = Calculate-MTTC -IncidentId $IncidentId
        }
    }
    
    # Generate executive summary
    $executiveSummary = @\"
# Incident $IncidentId - Executive Summary

## Overview
- **Incident Type**: $(Get-IncidentType -IncidentId $IncidentId)
- **Severity**: $(Get-IncidentSeverity -IncidentId $IncidentId)
- **Duration**: $($report.Timeline.Duration) hours
- **Business Impact**: $($report.Impact.EstimatedCost)

## Key Findings
1. Root cause: $($report.RootCause.Summary)
2. Initial compromise: $($report.RootCause.InitialVector)
3. Extent of breach: $($report.Impact.SystemsAffected.Count) systems, $($report.Impact.UsersImpacted.Count) users

## Response Effectiveness
- Detection time: $($report.Metrics.MTTD) minutes
- Response time: $($report.Metrics.MTTR) minutes
- Containment time: $($report.Metrics.MTTC) minutes

## Recommendations
$(($report.Recommendations | ForEach-Object { \"- $_\" }) -join \"`n\")

## Next Steps
- Implement recommendations within 30 days
- Conduct table-top exercise based on lessons learned
- Update security policies and procedures
\"@
    
    # Export full report
    $report | ConvertTo-Json -Depth 5 | Out-File \"$IncidentId-post-incident-report.json\"
    $executiveSummary | Out-File \"$IncidentId-executive-summary.md\"
    
    # Generate metrics dashboard
    Create-IncidentMetricsDashboard -Report $report -OutputPath \"$IncidentId-metrics.html\"
    
    return $report
}
```

#### Improvement Actions
```powershell
# Implement improvement recommendations
function Implement-ImprovementActions {
    param(
        [PSCustomObject]$PostIncidentReport,
        [string]$IncidentId
    )
    
    $improvements = @()
    
    foreach ($recommendation in $PostIncidentReport.Recommendations) {
        $improvement = @{
            Recommendation = $recommendation
            Status = \"Pending\"
            AssignedTo = $null
            DueDate = (Get-Date).AddDays(30)
            Implementation = @()
            Validation = @()
        }
        
        # Parse recommendation type
        switch -Regex ($recommendation) {
            \"monitoring\" {
                $improvement.Implementation = @(
                    \"Create detection rule in Azure Sentinel\",
                    \"Configure alert threshold\",
                    \"Set up automated response\",
                    \"Test detection logic\"
                )
                $improvement.AssignedTo = \"Security Operations\"
            }
            \"procedures\" {
                $improvement.Implementation = @(
                    \"Review current procedure\",
                    \"Draft updated procedure\",
                    \"Peer review\",
                    \"Approval from management\",
                    \"Team training\"
                )
                $improvement.AssignedTo = \"Security Governance\"
            }
            \"training\" {
                $improvement.Implementation = @(
                    \"Identify skill gaps\",
                    \"Develop training content\",
                    \"Schedule training sessions\",
                    \"Conduct training\",
                    \"Assess effectiveness\"
                )
                $improvement.AssignedTo = \"Security Training Team\"
            }
            \"security control\" {
                $improvement.Implementation = @(
                    \"Evaluate control options\",
                    \"Pilot deployment\",
                    \"Performance testing\",
                    \"Full deployment\",
                    \"Monitor effectiveness\"
                )
                $improvement.AssignedTo = \"Security Architecture\"
            }
        }
        
        $improvements += $improvement
    }
    
    # Create improvement tracking
    foreach ($improvement in $improvements) {
        New-ImprovementTicket -Improvement $improvement -IncidentId $IncidentId
    }
    
    # Generate improvement roadmap
    $roadmap = Create-ImprovementRoadmap -Improvements $improvements
    $roadmap | Export-Excel -Path \"$IncidentId-improvement-roadmap.xlsx\"
    
    return $improvements
}
```

## Communication Protocols

### Internal Communication Matrix

| Incident Severity | Initial Notification | Update Frequency | Escalation Time | Communication Method |
|------------------|---------------------|------------------|-----------------|---------------------|
| Critical | Immediate | Every 30 minutes | Immediate | Phone + Email + Slack |
| High | Within 15 minutes | Every hour | 30 minutes | Email + Slack |
| Medium | Within 1 hour | Every 4 hours | 2 hours | Email + Slack |
| Low | Within 4 hours | Daily | 24 hours | Email |

### External Communication Guidelines

#### Customer Communication
```powershell
# Generate customer notification
function New-CustomerNotification {
    param(
        [string]$IncidentId,
        [string]$Severity,
        [string[]]$AffectedServices,
        [int]$CustomerCount
    )
    
    $template = @\"
Dear Valued Customer,

We are writing to inform you of a security incident that may have affected your account.

**Incident Details:**
- Incident ID: $IncidentId
- Date Detected: $(Get-Date -Format \"yyyy-MM-dd HH:mm\")
- Severity: $Severity
- Affected Services: $($AffectedServices -join \", \")

**What Happened:**
[Provide clear, non-technical description of the incident]

**Impact to You:**
[Describe specific impact to customer]

**Actions We've Taken:**
- Immediately contained the incident
- Conducted thorough investigation
- Implemented additional security measures
- Notified appropriate authorities

**Actions You Should Take:**
1. Change your password immediately
2. Review your account activity
3. Enable multi-factor authentication
4. Monitor for suspicious activity

**Additional Information:**
- FAQ: [Link to FAQ]
- Support: [Support contact information]
- Updates: [Status page URL]

We take the security of your data seriously and apologize for any inconvenience.

Sincerely,
[Security Team]
\"@
    
    return $template
}
```

#### Regulatory Notification
```powershell
# Generate regulatory notification
function New-RegulatoryNotification {
    param(
        [string]$IncidentId,
        [string]$Regulation, # GDPR, HIPAA, PCI-DSS, etc.
        [hashtable]$IncidentDetails
    )
    
    $notifications = @{
        \"GDPR\" = @{
            Deadline = 72
            Authority = \"Data Protection Authority\"
            Template = \"gdpr-breach-notification.docx\"
            RequiredInfo = @(
                \"Nature of breach\",
                \"Categories of data\",
                \"Number of individuals\",
                \"Likely consequences\",
                \"Measures taken\"
            )
        }
        \"HIPAA\" = @{
            Deadline = 60
            Authority = \"HHS Office for Civil Rights\"
            Template = \"hipaa-breach-notification.docx\"
            RequiredInfo = @(
                \"PHI involved\",
                \"Individuals affected\",
                \"Discovery date\",
                \"Breach description\",
                \"Mitigation steps\"
            )
        }
    }
    
    $notificationReq = $notifications[$Regulation]
    
    $notification = @{
        IncidentId = $IncidentId
        Regulation = $Regulation
        DueDate = (Get-Date).AddDays($notificationReq.Deadline)
        Authority = $notificationReq.Authority
        Status = \"Pending\"
        Content = @{}
    }
    
    # Populate required information
    foreach ($field in $notificationReq.RequiredInfo) {
        $notification.Content[$field] = Get-IncidentInfo -IncidentId $IncidentId -InfoType $field
    }
    
    # Generate notification document
    New-RegulatoryDocument -Template $notificationReq.Template -Content $notification.Content -OutputPath \"$IncidentId-$Regulation-notification.pdf\"
    
    return $notification
}
```

## Automation and Tooling

### Automated Response Actions

#### Auto-Containment Rules
```powershell
# Configure automatic containment
function Set-AutoContainmentRules {
    param(
        [string]$RuleName,
        [string]$Condition,
        [string]$Action,
        [int]$Severity
    )
    
    # Azure Sentinel Playbook
    $playbookDefinition = @{
        \"$schema\" = \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\"
        \"contentVersion\" = \"1.0.0.0\"
        \"parameters\" = @{}
        \"variables\" = @{}
        \"resources\" = @(
            @{
                \"type\" = \"Microsoft.Logic/workflows\"
                \"apiVersion\" = \"2019-05-01\"
                \"name\" = $RuleName
                \"location\" = \"[resourceGroup().location]\"
                \"properties\" = @{
                    \"state\" = \"Enabled\"
                    \"definition\" = @{
                        \"$schema\" = \"https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#\"
                        \"triggers\" = @{
                            \"When_incident_is_created\" = @{
                                \"type\" = \"ApiConnectionWebhook\"
                                \"inputs\" = @{
                                    \"body\" = @{
                                        \"callback_url\" = \"@{listCallbackUrl()}\"
                                    }
                                }
                            }
                        }
                        \"actions\" = @{
                            \"Parse_Incident\" = @{
                                \"type\" = \"ParseJson\"
                                \"inputs\" = @{
                                    \"content\" = \"@triggerBody()\"
                                    \"schema\" = Get-IncidentSchema
                                }
                            }
                            \"Check_Condition\" = @{
                                \"type\" = \"If\"
                                \"expression\" = @{
                                    \"and\" = @(
                                        @{
                                            \"equals\" = @(\"@body('Parse_Incident')?['Severity']\", $Severity)
                                        }
                                    )
                                }
                                \"actions\" = @{
                                    \"Execute_Containment\" = @{
                                        \"type\" = \"Function\"
                                        \"inputs\" = @{
                                            \"function\" = @{
                                                \"id\" = \"/subscriptions/{subId}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{funcApp}/functions/AutoContainment\"
                                            }
                                            \"body\" = @{
                                                \"IncidentId\" = \"@body('Parse_Incident')?['IncidentId']\"
                                                \"Action\" = $Action
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        )
    }
    
    # Deploy playbook
    New-AzResourceGroupDeployment -ResourceGroupName \"SecurityAutomation\" `
        -TemplateObject $playbookDefinition `
        -Name \"$RuleName-deployment\"
}
```

#### Automated Evidence Collection
```powershell
# Automated evidence collection function
function Start-AutomatedForensics {
    param(
        [string]$IncidentId,
        [string]$AffectedSystem,
        [string]$EvidenceStore
    )
    
    $collectionJob = Start-Job -ScriptBlock {
        param($System, $Store, $Incident)
        
        # Create evidence container
        $timestamp = Get-Date -Format \"yyyyMMdd-HHmmss\"
        $evidencePath = \"$Store\\$Incident\\$System\\$timestamp\"
        New-Item -ItemType Directory -Path $evidencePath -Force
        
        # Memory dump
        Write-Host \"Collecting memory dump...\"
        & \"C:\\Tools\\WinPMEM\\winpmem.exe\" -o \"$evidencePath\\memory.raw\"
        
        # System information
        Write-Host \"Collecting system information...\"
        systeminfo | Out-File \"$evidencePath\\systeminfo.txt\"
        Get-ComputerInfo | Export-Csv \"$evidencePath\\computerinfo.csv\"
        
        # Network state
        Write-Host \"Collecting network state...\"
        netstat -anob | Out-File \"$evidencePath\
etstat.txt\"
        Get-NetTCPConnection | Export-Csv \"$evidencePath\	cpconnections.csv\"
        Get-NetUDPEndpoint | Export-Csv \"$evidencePath\\udpendpoints.csv\"
        arp -a | Out-File \"$evidencePath\\arp.txt\"
        route print | Out-File \"$evidencePath\\routes.txt\"
        nslookup -type=any _ldap._tcp | Out-File \"$evidencePath\\dns.txt\"
        
        # Process information
        Write-Host \"Collecting process information...\"
        Get-Process | Export-Csv \"$evidencePath\\processes.csv\"
        Get-CimInstance Win32_Process | Export-Csv \"$evidencePath\\processes-detailed.csv\"
        wmic process get Name,ProcessId,ParentProcessId,CommandLine /format:csv | Out-File \"$evidencePath\\process-tree.csv\"
        
        # Service information
        Write-Host \"Collecting service information...\"
        Get-Service | Export-Csv \"$evidencePath\\services.csv\"
        sc query | Out-File \"$evidencePath\\services-detailed.txt\"
        
        # Scheduled tasks
        Write-Host \"Collecting scheduled tasks...\"
        Get-ScheduledTask | Export-Csv \"$evidencePath\\scheduledtasks.csv\"
        schtasks /query /fo csv /v | Out-File \"$evidencePath\\scheduledtasks-detailed.csv\"
        
        # User information
        Write-Host \"Collecting user information...\"
        Get-LocalUser | Export-Csv \"$evidencePath\\localusers.csv\"
        Get-LocalGroup | Export-Csv \"$evidencePath\\localgroups.csv\"
        Get-LocalGroupMember -Group \"Administrators\" | Export-Csv \"$evidencePath\\administrators.csv\"
        
        # Registry
        Write-Host \"Collecting registry information...\"
        reg export HKLM \"$evidencePath\\HKLM.reg\"
        reg export HKCU \"$evidencePath\\HKCU.reg\"
        reg export HKU \"$evidencePath\\HKU.reg\"
        
        # Event logs
        Write-Host \"Collecting event logs...\"
        $logs = @(\"System\", \"Security\", \"Application\", \"Microsoft-Windows-Sysmon/Operational\", \"Microsoft-Windows-PowerShell/Operational\")
        foreach ($log in $logs) {
            wevtutil epl $log \"$evidencePath\\$log.evtx\"
        }
        
        # File system artifacts
        Write-Host \"Collecting file system artifacts...\"
        Get-ChildItem -Path \"C:\\Users\" -Include \"*.exe\",\"*.dll\",\"*.bat\",\"*.ps1\",\"*.cmd\" -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-7) } |
            Export-Csv \"$evidencePath\\recent-executables.csv\"
        
        # Prefetch files
        Copy-Item \"C:\\Windows\\Prefetch\\*\" \"$evidencePath\\Prefetch\\\" -ErrorAction SilentlyContinue
        
        # Browser history
        Write-Host \"Collecting browser artifacts...\"
        $browsers = @{
            \"Chrome\" = \"$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\History\"
            \"Firefox\" = \"$env:APPDATA\\Mozilla\\Firefox\\Profiles\\*.default\\places.sqlite\"
            \"Edge\" = \"$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\History\"
        }
        
        foreach ($browser in $browsers.GetEnumerator()) {
            if (Test-Path $browser.Value) {
                Copy-Item $browser.Value \"$evidencePath\\$($browser.Key)-history\" -ErrorAction SilentlyContinue
            }
        }
        
        # Create hash manifest
        Write-Host \"Creating evidence manifest...\"
        Get-ChildItem -Path $evidencePath -Recurse | 
            ForEach-Object {
                [PSCustomObject]@{
                    Path = $_.FullName
                    Hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash
                    Size = $_.Length
                    Created = $_.CreationTime
                    Modified = $_.LastWriteTime
                }
            } | Export-Csv \"$evidencePath\\evidence-manifest.csv\"
        
        # Compress evidence
        Write-Host \"Compressing evidence...\"
        Compress-Archive -Path $evidencePath -DestinationPath \"$Store\\$Incident\\$System-$timestamp.zip\"
        
        return \"Evidence collection completed for $System\"
    } -ArgumentList $AffectedSystem, $EvidenceStore, $IncidentId
    
    return $collectionJob
}
```

### Orchestration Platform Integration

#### SOAR Integration
```powershell
# Integrate with SOAR platform
function Connect-SOARPlatform {
    param(
        [string]$SOAREndpoint,
        [string]$APIKey,
        [string]$IncidentId
    )
    
    $headers = @{
        \"Authorization\" = \"Bearer $APIKey\"
        \"Content-Type\" = \"application/json\"
    }
    
    # Create incident in SOAR
    $incidentData = @{
        id = $IncidentId
        title = Get-IncidentTitle -IncidentId $IncidentId
        severity = Get-IncidentSeverity -IncidentId $IncidentId
        description = Get-IncidentDescription -IncidentId $IncidentId
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        status = "active"
        artifacts = Get-IncidentArtifacts -IncidentId $IncidentId
        observables = Get-IncidentObservables -IncidentId $IncidentId
        affected_systems = Get-AffectedSystems -IncidentId $IncidentId
        indicators = Get-IncidentIndicators -IncidentId $IncidentId
        tags = @(
            "automated_response",
            "azure_cloud",
            "incident_type:$(Get-IncidentType -IncidentId $IncidentId)"
        )
    }
    
    # Submit to SOAR platform
    $response = Invoke-RestMethod -Uri "$SOAREndpoint/api/v1/incidents" `
        -Method POST `
        -Headers $headers `
        -Body ($incidentData | ConvertTo-Json)
    
    # Create automated workflow
    $workflow = @{
        incident_id = $response.id
        workflow_name = "Azure-Security-Incident-Response"
        steps = @(
            @{
                action = "collect_evidence"
                parameters = @{
                    systems = $incidentData.affected_systems
                    types = @("logs", "memory", "network", "registry")
                }
            },
            @{
                action = "analyze_indicators"
                parameters = @{
                    indicators = $incidentData.indicators
                    threat_feeds = @("Azure-ThreatIntel", "VirusTotal", "AlienVault")
                }
            },
            @{
                action = "containment_actions"
                parameters = @{
                    auto_isolate = $true
                    disable_accounts = $true
                    block_ips = $true
                }
            }
        )
    }
    
    # Execute workflow
    $workflowResponse = Invoke-RestMethod -Uri "$SOAREndpoint/api/v1/workflows" `
        -Method POST `
        -Headers $headers `
        -Body ($workflow | ConvertTo-Json -Depth 5)
    
    return @{
        SOARIncidentId = $response.id
        WorkflowId = $workflowResponse.workflow_id
        Status = $workflowResponse.status
    }
}
```

### Threat Intelligence Integration

#### Automated Threat Feed Processing
```powershell
# Process threat intelligence feeds
function Process-ThreatIntelligenceFeeds {
    param(
        [string[]]$FeedSources,
        [string]$IndicatorType
    )
    
    $indicators = @()
    
    foreach ($feed in $FeedSources) {
        switch ($feed) {
            "Azure-ThreatIntel" {
                $azureIndicators = Get-AzureThreatIndicators -Type $IndicatorType
                $indicators += $azureIndicators
            }
            "MISP" {
                $mispIndicators = Get-MISPIndicators -Server $MISPServer -ApiKey $MISPApiKey -Type $IndicatorType
                $indicators += $mispIndicators
            }
            "OTX" {
                $otxIndicators = Get-OTXIndicators -ApiKey $OTXApiKey -Type $IndicatorType
                $indicators += $otxIndicators
            }
            "TAXII" {
                $taxiiIndicators = Get-TAXIIFeeds -Server $TAXIIServer -Collection $TAXIICollection -Type $IndicatorType
                $indicators += $taxiiIndicators
            }
        }
    }
    
    # Deduplicate indicators
    $uniqueIndicators = $indicators | Sort-Object -Property Value -Unique
    
    # Enrich indicators with context
    foreach ($indicator in $uniqueIndicators) {
        $indicator.Context = Get-IndicatorContext -Indicator $indicator.Value -Type $indicator.Type
        $indicator.Confidence = Calculate-IndicatorConfidence -Indicator $indicator
        $indicator.LastSeen = Get-Date
    }
    
    # Store in threat intelligence database
    Store-ThreatIndicators -Indicators $uniqueIndicators
    
    return $uniqueIndicators
}
```

#### Real-Time Indicator Matching
```powershell
# Match indicators against live traffic
function Invoke-IndicatorMatching {
    param(
        [string[]]$DataSources,
        [timespan]$TimeWindow = (New-TimeSpan -Hours 1)
    )
    
    $matches = @()
    $startTime = (Get-Date).Add(-$TimeWindow)
    
    # Get active indicators
    $activeIndicators = Get-ActiveThreatIndicators
    
    foreach ($source in $DataSources) {
        switch ($source) {
            "NetworkLogs" {
                $query = @"
                    NetworkCommunicationEvents
                    | where TimeGenerated > datetime('$startTime')
                    | where RemoteIP in ($($activeIndicators.Where{$_.Type -eq 'IP'}.Value -join ','))
                    | project TimeGenerated, DeviceName, RemoteIP, RemotePort, ProcessName
"@
                $matches += Invoke-AzureLogQuery -Query $query
            }
            "DNSLogs" {
                $query = @"
                    DnsEvents
                    | where TimeGenerated > datetime('$startTime')
                    | where Name in ($($activeIndicators.Where{$_.Type -eq 'Domain'}.Value -join ','))
                    | project TimeGenerated, Computer, Name, IPAddresses, ClientIP
"@
                $matches += Invoke-AzureLogQuery -Query $query
            }
            "FileEvents" {
                $query = @"
                    DeviceFileEvents
                    | where TimeGenerated > datetime('$startTime')
                    | where SHA256 in ($($activeIndicators.Where{$_.Type -eq 'FileHash'}.Value -join ','))
                    | project TimeGenerated, DeviceName, FileName, FolderPath, SHA256
"@
                $matches += Invoke-AzureLogQuery -Query $query
            }
        }
    }
    
    # Create alerts for matches
    foreach ($match in $matches) {
        New-ThreatIndicatorAlert -Match $match -Severity High
    }
    
    return $matches
}
```

### Cloud Security Response

#### Azure-Specific Response Actions
```powershell
# Azure resource isolation
function Invoke-AzureResourceIsolation {
    param(
        [string]$ResourceId,
        [string]$IsolationType
    )
    
    $resource = Get-AzResource -ResourceId $ResourceId
    
    switch ($resource.ResourceType) {
        "Microsoft.Compute/virtualMachines" {
            # Isolate VM
            $vm = Get-AzVM -ResourceGroupName $resource.ResourceGroupName -Name $resource.Name
            
            # Create isolation NSG
            $isolationNSG = New-AzNetworkSecurityGroup -Name "$($vm.Name)-isolation" `
                -ResourceGroupName $resource.ResourceGroupName `
                -Location $vm.Location
            
            # Deny all traffic
            $denyRule = New-AzNetworkSecurityRuleConfig -Name "DenyAll" `
                -Priority 100 `
                -Direction Inbound `
                -Access Deny `
                -Protocol * `
                -SourceAddressPrefix * `
                -SourcePortRange * `
                -DestinationAddressPrefix * `
                -DestinationPortRange *
            
            $isolationNSG.SecurityRules.Add($denyRule)
            Set-AzNetworkSecurityGroup -NetworkSecurityGroup $isolationNSG
            
            # Apply to VM
            $nic = Get-AzNetworkInterface -ResourceId $vm.NetworkProfile.NetworkInterfaces[0].Id
            $nic.NetworkSecurityGroup = $isolationNSG
            Set-AzNetworkInterface -NetworkInterface $nic
        }
        "Microsoft.Storage/storageAccounts" {
            # Disable public access
            Set-AzStorageAccount -ResourceGroupName $resource.ResourceGroupName `
                -Name $resource.Name `
                -PublicNetworkAccess Disabled
            
            # Rotate keys
            New-AzStorageAccountKey -ResourceGroupName $resource.ResourceGroupName `
                -Name $resource.Name `
                -KeyName key1
        }
        "Microsoft.Sql/servers/databases" {
            # Apply firewall rules
            $server = $resource.Name.Split('/')[0]
            $database = $resource.Name.Split('/')[1]
            
            # Remove all firewall rules
            Get-AzSqlServerFirewallRule -ResourceGroupName $resource.ResourceGroupName `
                -ServerName $server | Remove-AzSqlServerFirewallRule
            
            # Add IR team access only
            New-AzSqlServerFirewallRule -ResourceGroupName $resource.ResourceGroupName `
                -ServerName $server `
                -FirewallRuleName "IRTeamAccess" `
                -StartIpAddress "10.0.0.1" `
                -EndIpAddress "10.0.0.10"
        }
    }
    
    # Log isolation action
    Write-IsolationLog -ResourceId $ResourceId -Action $IsolationType -Timestamp (Get-Date)
}
```

#### Container Security Response
```powershell
# Container incident response
function Respond-ContainerIncident {
    param(
        [string]$ContainerName,
        [string]$PodName,
        [string]$Namespace,
        [string]$ClusterName
    )
    
    # Connect to AKS cluster
    Import-AzAksCredential -ResourceGroupName $ResourceGroup -Name $ClusterName
    
    # Isolate container
    kubectl label pod $PodName -n $Namespace security=quarantine
    
    # Create network policy for isolation
    $networkPolicy = @"
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: quarantine-$PodName
      namespace: $Namespace
    spec:
      podSelector:
        matchLabels:
          security: quarantine
      policyTypes:
      - Ingress
      - Egress
      ingress: []
      egress:
      - to:
        - podSelector:
            matchLabels:
              app: security-scanner
"@
    
    $networkPolicy | kubectl apply -f -
    
    # Capture container state
    kubectl exec $PodName -n $Namespace -- tar cf /tmp/container-snapshot.tar /
    kubectl cp $Namespace/$PodName:/tmp/container-snapshot.tar ./evidence/$ContainerName-snapshot.tar
    
    # Get container logs
    kubectl logs $PodName -n $Namespace --all-containers=true > "./evidence/$ContainerName-logs.txt"
    
    # Describe pod for metadata
    kubectl describe pod $PodName -n $Namespace > "./evidence/$ContainerName-metadata.txt"
    
    # Export container image for analysis
    $imageInfo = kubectl get pod $PodName -n $Namespace -o jsonpath='{.spec.containers[*].image}'
    docker save $imageInfo -o "./evidence/$ContainerName-image.tar"
    
    # Create forensic container for analysis
    kubectl run forensics-$PodName --image=security/forensics:latest `
        --overrides='{"spec":{"nodeSelector":{"kubernetes.io/hostname":"forensics-node"}}}'
    
    return @{
        ContainerName = $ContainerName
        PodName = $PodName
        IsolationTime = Get-Date
        EvidenceCollected = $true
    }
}
```

## Regulatory Compliance

### Compliance Mapping
```powershell
# Map incident to compliance requirements
function Get-ComplianceRequirements {
    param(
        [string]$IncidentType,
        [string[]]$AffectedDataTypes,
        [string[]]$AffectedRegions
    )
    
    $requirements = @()
    
    # GDPR Requirements
    if ($AffectedRegions -contains "EU" -or $AffectedDataTypes -contains "PersonalData") {
        $requirements += @{
            Regulation = "GDPR"
            NotificationDeadline = 72
            NotifyAuthority = $true
            NotifyIndividuals = $AffectedDataTypes -contains "PersonalData"
            DocumentationRequired = @(
                "Nature of the breach",
                "Categories and number of individuals concerned",
                "Categories and number of personal data records",
                "Name and contact details of DPO",
                "Likely consequences",
                "Measures taken or proposed"
            )
        }
    }
    
    # HIPAA Requirements
    if ($AffectedDataTypes -contains "PHI" -or $AffectedDataTypes -contains "HealthData") {
        $requirements += @{
            Regulation = "HIPAA"
            NotificationDeadline = 60
            NotifyAuthority = $true
            NotifyIndividuals = $true
            NotifyMedia = (Get-AffectedIndividualCount) -gt 500
            DocumentationRequired = @(
                "Description of breach",
                "Types of PHI involved",
                "Cause of breach",
                "Actions taken",
                "Risk assessment",
                "Mitigation measures"
            )
        }
    }
    
    # PCI-DSS Requirements
    if ($AffectedDataTypes -contains "PaymentCard" -or $AffectedDataTypes -contains "CardholderData") {
        $requirements += @{
            Regulation = "PCI-DSS"
            NotificationDeadline = 24
            NotifyCardBrands = $true
            NotifyAcquirer = $true
            NotifyIndividuals = $false
            DocumentationRequired = @(
                "Incident summary",
                "Systems affected",
                "Data compromised",
                "Timeline of events",
                "Containment actions",
                "Root cause analysis"
            )
        }
    }
    
    # SOX Requirements
    if ($AffectedDataTypes -contains "FinancialData" -or $AffectedSystems -contains "FinancialSystem") {
        $requirements += @{
            Regulation = "SOX"
            NotificationDeadline = 4
            NotifyAuditors = $true
            NotifySEC = $true
            DocumentationRequired = @(
                "Impact on financial reporting",
                "Internal control deficiencies",
                "Remediation timeline",
                "Management response"
            )
        }
    }
    
    return $requirements
}
```

### Breach Notification Automation
```powershell
# Automate breach notifications
function Send-BreachNotifications {
    param(
        [string]$IncidentId,
        [hashtable[]]$ComplianceRequirements
    )
    
    foreach ($requirement in $ComplianceRequirements) {
        # Generate notification content
        $notification = Generate-ComplianceNotification -IncidentId $IncidentId -Requirement $requirement
        
        # Submit to regulatory authority
        switch ($requirement.Regulation) {
            "GDPR" {
                Submit-GDPRNotification -Content $notification -Authority $requirement.NotifyAuthority
            }
            "HIPAA" {
                Submit-HIPAANotification -Content $notification -OCR $true
                if ($requirement.NotifyMedia) {
                    Submit-MediaNotification -Content $notification
                }
            }
            "PCI-DSS" {
                foreach ($cardBrand in @("Visa", "Mastercard", "Amex", "Discover")) {
                    Submit-CardBrandNotification -Brand $cardBrand -Content $notification
                }
            }
        }
        
        # Track notification status
        Update-ComplianceTracking -IncidentId $IncidentId `
            -Regulation $requirement.Regulation `
            -NotificationSent $true `
            -SentDate (Get-Date)
    }
}
```

## Performance Metrics

### KPI Monitoring
```powershell
# Monitor incident response KPIs
function Get-IncidentResponseMetrics {
    param(
        [datetime]$StartDate,
        [datetime]$EndDate
    )
    
    $incidents = Get-IncidentsByDateRange -Start $StartDate -End $EndDate
    
    $metrics = @{
        TotalIncidents = $incidents.Count
        SeverityBreakdown = $incidents | Group-Object Severity | Select-Object Name, Count
        MTTD = @{}
        MTTR = @{}
        MTTC = @{}
        ContainmentRate = @{}
        RecurrenceRate = @{}
    }
    
    # Calculate Mean Time to Detect (MTTD)
    foreach ($severity in @("Critical", "High", "Medium", "Low")) {
        $severityIncidents = $incidents | Where-Object { $_.Severity -eq $severity }
        if ($severityIncidents) {
            $mttd = ($severityIncidents | Measure-Object -Property DetectionTime -Average).Average
            $metrics.MTTD[$severity] = [math]::Round($mttd, 2)
        }
    }
    
    # Calculate Mean Time to Respond (MTTR)
    foreach ($severity in @("Critical", "High", "Medium", "Low")) {
        $severityIncidents = $incidents | Where-Object { $_.Severity -eq $severity }
        if ($severityIncidents) {
            $mttr = ($severityIncidents | Measure-Object -Property ResponseTime -Average).Average
            $metrics.MTTR[$severity] = [math]::Round($mttr, 2)
        }
    }
    
    # Calculate Mean Time to Contain (MTTC)
    foreach ($severity in @("Critical", "High", "Medium", "Low")) {
        $severityIncidents = $incidents | Where-Object { $_.Severity -eq $severity }
        if ($severityIncidents) {
            $mttc = ($severityIncidents | Measure-Object -Property ContainmentTime -Average).Average
            $metrics.MTTC[$severity] = [math]::Round($mttc, 2)
        }
    }
    
    # Calculate containment rate within SLA
    foreach ($severity in @("Critical", "High", "Medium", "Low")) {
        $severityIncidents = $incidents | Where-Object { $_.Severity -eq $severity }
        if ($severityIncidents) {
            $withinSLA = $severityIncidents | Where-Object { $_.ContainmentTime -le $_.SLATarget }
            $metrics.ContainmentRate[$severity] = [math]::Round(($withinSLA.Count / $severityIncidents.Count) * 100, 2)
        }
    }
    
    # Calculate recurrence rate
    $recurringIncidents = $incidents | Where-Object { $_.RootCause -in (Get-PreviousIncidentRootCauses) }
    $metrics.RecurrenceRate = [math]::Round(($recurringIncidents.Count / $incidents.Count) * 100, 2)
    
    # Generate metrics report
    $report = @"
# Incident Response Metrics Report
## Period: $($StartDate.ToString('yyyy-MM-dd')) to $($EndDate.ToString('yyyy-MM-dd'))

### Summary
- Total Incidents: $($metrics.TotalIncidents)
- Recurrence Rate: $($metrics.RecurrenceRate)%

### Severity Breakdown
$($metrics.SeverityBreakdown | Format-Table | Out-String)

### Mean Time to Detect (MTTD)
$(($metrics.MTTD.GetEnumerator() | ForEach-Object { "- $($_.Key): $($_.Value) minutes" }) -join "`n")

### Mean Time to Respond (MTTR)
$(($metrics.MTTR.GetEnumerator() | ForEach-Object { "- $($_.Key): $($_.Value) minutes" }) -join "`n")

### Mean Time to Contain (MTTC)
$(($metrics.MTTC.GetEnumerator() | ForEach-Object { "- $($_.Key): $($_.Value) minutes" }) -join "`n")

### Containment Rate (Within SLA)
$(($metrics.ContainmentRate.GetEnumerator() | ForEach-Object { "- $($_.Key): $($_.Value)%" }) -join "`n")
"@
    
    # Export metrics
    $metrics | Export-Csv "IR-Metrics-$(Get-Date -Format 'yyyyMMdd').csv"
    $report | Out-File "IR-Metrics-Report-$(Get-Date -Format 'yyyyMMdd').md"
    
    return $metrics
}
```

### Continuous Improvement
```powershell
# Track improvement initiatives
function New-ImprovementInitiative {
    param(
        [string]$Title,
        [string]$Description,
        [string]$Category,
        [string]$Owner,
        [datetime]$DueDate
    )
    
    $initiative = @{
        Id = New-Guid
        Title = $Title
        Description = $Description
        Category = $Category
        Owner = $Owner
        Status = "Planning"
        CreatedDate = Get-Date
        DueDate = $DueDate
        Tasks = @()
        Metrics = @{
            BaselineValue = $null
            TargetValue = $null
            CurrentValue = $null
        }
    }
    
    # Define improvement tasks
    switch ($Category) {
        "DetectionCapability" {
            $initiative.Tasks = @(
                "Identify detection gaps",
                "Develop new detection rules",
                "Test detection accuracy",
                "Deploy to production",
                "Monitor effectiveness"
            )
        }
        "ResponseAutomation" {
            $initiative.Tasks = @(
                "Identify manual processes",
                "Design automation workflow",
                "Develop automation scripts",
                "Test automation",
                "Deploy and monitor"
            )
        }
        "ProcessImprovement" {
            $initiative.Tasks = @(
                "Analyze current process",
                "Identify bottlenecks",
                "Design improved process",
                "Update documentation",
                "Train team members"
            )
        }
    }
    
    # Store initiative
    Save-ImprovementInitiative -Initiative $initiative
    
    # Create tracking dashboard
    New-ImprovementDashboard -InitiativeId $initiative.Id
    
    return $initiative
}
```

## Training and Exercises

### Tabletop Exercises
```powershell
# Configure tabletop exercise
function New-TabletopExercise {
    param(
        [string]$ScenarioName,
        [string]$IncidentType,
        [string[]]$Participants,
        [datetime]$ScheduledDate
    )
    
    $exercise = @{
        Id = New-Guid
        Name = $ScenarioName
        Type = "Tabletop"
        IncidentType = $IncidentType
        ScheduledDate = $ScheduledDate
        Participants = $Participants
        Scenario = @{}
        Injects = @()
        Evaluation = @{}
    }
    
    # Load scenario template
    $scenarioTemplate = Get-ScenarioTemplate -Type $IncidentType
    
    # Customize scenario
    $exercise.Scenario = @{
        Background = $scenarioTemplate.Background
        InitialIndicators = $scenarioTemplate.InitialIndicators
        Objectives = @(
            "Test incident detection capabilities",
            "Evaluate communication procedures",
            "Assess decision-making process",
            "Identify improvement areas"
        )
        SuccessCriteria = @(
            "Incident detected within 15 minutes",
            "Correct severity classification",
            "Appropriate escalation",
            "Effective containment decision"
        )
    }
    
    # Create exercise injects
    $exercise.Injects = @(
        @{
            Time = "T+0"
            Event = "Security alert triggered"
            ExpectedAction = "Investigate alert"
        },
        @{
            Time = "T+15"
            Event = "Additional indicators discovered"
            ExpectedAction = "Escalate to management"
        },
        @{
            Time = "T+30"
            Event = "Lateral movement detected"
            ExpectedAction = "Initiate containment"
        },
        @{
            Time = "T+45"
            Event = "Data exfiltration attempt"
            ExpectedAction = "Block external communication"
        }
    )
    
    # Generate exercise materials
    New-ExerciseMaterials -Exercise $exercise
    
    # Schedule exercise
    Schedule-TabletopExercise -Exercise $exercise
    
    return $exercise
}
```

### Skill Development
```powershell
# Track team skill development
function Update-TeamSkillMatrix {
    param(
        [string]$TeamMember,
        [hashtable]$SkillAssessment
    )
    
    $skills = @{
        "Incident Detection" = @{
            CurrentLevel = $SkillAssessment.IncidentDetection
            TargetLevel = 4
            TrainingRequired = $null
        }
        "Forensic Analysis" = @{
            CurrentLevel = $SkillAssessment.ForensicAnalysis
            TargetLevel = 4
            TrainingRequired = $null
        }
        "Malware Analysis" = @{
            CurrentLevel = $SkillAssessment.MalwareAnalysis
            TargetLevel = 3
            TrainingRequired = $null
        }
        "Cloud Security" = @{
            CurrentLevel = $SkillAssessment.CloudSecurity
            TargetLevel = 4
            TrainingRequired = $null
        }
        "Automation/Scripting" = @{
            CurrentLevel = $SkillAssessment.Automation
            TargetLevel = 4
            TrainingRequired = $null
        }
    }
    
    # Identify training needs
    foreach ($skill in $skills.Keys) {
        if ($skills[$skill].CurrentLevel -lt $skills[$skill].TargetLevel) {
            $skills[$skill].TrainingRequired = Get-TrainingRecommendation `
                -Skill $skill `
                -CurrentLevel $skills[$skill].CurrentLevel `
                -TargetLevel $skills[$skill].TargetLevel
        }
    }
    
    # Create development plan
    $developmentPlan = @{
        TeamMember = $TeamMember
        AssessmentDate = Get-Date
        Skills = $skills
        TrainingPlan = @()
        Timeline = @{}
    }
    
    # Generate training plan
    foreach ($skill in $skills.Keys) {
        if ($skills[$skill].TrainingRequired) {
            $developmentPlan.TrainingPlan += @{
                Skill = $skill
                Training = $skills[$skill].TrainingRequired
                Priority = Calculate-TrainingPriority -Skill $skill -Gap ($skills[$skill].TargetLevel - $skills[$skill].CurrentLevel)
                EstimatedDuration = Get-TrainingDuration -Training $skills[$skill].TrainingRequired
            }
        }
    }
    
    # Save development plan
    Save-DevelopmentPlan -Plan $developmentPlan
    
    return $developmentPlan
}
```

## Appendices

### A. Tool Configurations

#### Azure Sentinel Rules
```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "workspaceName": {
            "type": "string"
        }
    },
    "resources": [
        {
            "type": "Microsoft.OperationalInsights/workspaces/providers/alertRules",
            "apiVersion": "2020-01-01",
            "name": "[concat(parameters('workspaceName'),'/Microsoft.SecurityInsights/HighRiskSignIn')]",
            "properties": {
                "displayName": "High Risk Sign-in Activity",
                "description": "Detects high-risk sign-in attempts based on multiple factors",
                "severity": "High",
                "enabled": true,
                "query": "let timeframe = 1h;\nSigninLogs\n| where TimeGenerated > ago(timeframe)\n| where RiskLevel == 'high' or RiskLevel == 'medium'\n| where ResultType != '0'\n| summarize FailedAttempts = count(), DistinctIPs = dcount(IPAddress) by UserPrincipalName\n| where FailedAttempts > 5 or DistinctIPs > 3",
                "queryFrequency": "PT5M",
                "queryPeriod": "PT1H",
                "triggerOperator": "GreaterThan",
                "triggerThreshold": 0,
                "suppressionDuration": "PT1H",
                "suppressionEnabled": false,
                "tactics": ["InitialAccess", "CredentialAccess"],
                "incidentConfiguration": {
                    "createIncident": true,
                    "groupingConfiguration": {
                        "enabled": true,
                        "reopenClosedIncident": false,
                        "lookbackDuration": "PT5H",
                        "entitiesMatchingMethod": "All"
                    }
                }
            }
        }
    ]
}
```

### B. Response Runbooks

#### Critical Incident Response Runbook
```yaml
name: Critical Incident Response
version: 2.0
last_updated: 2024-01-15

trigger:
  severity: Critical
  indicators:
    - active_exploitation
    - data_exfiltration
    - ransomware_encryption
    - privileged_account_compromise

initial_response:
  time_limit: 15_minutes
  actions:
    - notify_incident_manager:
        method: phone
        message: "Critical security incident detected"
    - create_incident_ticket:
        priority: P1
        assignee: incident_response_team
    - begin_evidence_collection:
        automated: true
        scope: affected_systems

containment:
  time_limit: 1_hour
  decision_tree:
    - if: active_data_exfiltration
      then:
        - block_outbound_traffic
        - isolate_affected_systems
        - disable_compromised_accounts
    - if: ransomware_detected
      then:
        - disconnect_network_shares
        - isolate_infected_systems
        - preserve_encryption_artifacts
    - if: privileged_account_compromise
      then:
        - disable_all_privileged_accounts
        - reset_service_accounts
        - audit_recent_changes

communication:
  internal:
    - executive_team:
        time: immediate
        method: phone_and_email
    - legal_team:
        time: within_30_minutes
        method: email
    - affected_business_units:
        time: within_1_hour
        method: email
  external:
    - customers:
        condition: if_data_breach_confirmed
        time: per_regulatory_requirements
        method: email_and_website
    - regulators:
        condition: if_required_by_law
        time: per_compliance_requirements
        method: official_notification

escalation:
  triggers:
    - containment_failure
    - scope_expansion
    - media_attention
  actions:
    - notify_ciso
    - engage_external_ir_firm
    - activate_crisis_management_team
```

### C. Contact Lists

#### Emergency Contacts
```yaml
incident_response_team:
  primary:
    - name: Incident Manager
      phone: "+1-555-0001"
      email: "incident.manager@company.com"
      availability: "24/7"
    - name: Security Lead
      phone: "+1-555-0002"
      email: "security.lead@company.com"
      availability: "24/7"
  
  escalation:
    - name: CISO
      phone: "+1-555-0003"
      email: "ciso@company.com"
      availability: "Business hours + on-call"
    - name: CTO
      phone: "+1-555-0004"
      email: "cto@company.com"
      availability: "Business hours + on-call"

external_resources:
  forensics_firm:
    name: "CyberForensics Inc"
    phone: "+1-555-0100"
    email: "support@cyberforensics.com"
    account_number: "CF-12345"
  
  legal_counsel:
    name: "Smith & Associates"
    phone: "+1-555-0200"
    email: "cyber@smithlaw.com"
    retainer: "active"
  
  public_relations:
    name: "Crisis Communications LLC"
    phone: "+1-555-0300"
    email: "urgent@crisiscommunications.com"
    availability: "24/7"

regulatory_contacts:
  gdpr:
    authority: "Data Protection Authority"
    phone: "+44-20-555-0001"
    email: "breach@dataprotection.gov"
    portal: "https://breach.dataprotection.gov"
  
  hipaa:
    authority: "HHS Office for Civil Rights"
    phone: "+1-800-555-0001"
    email: "breach@hhs.gov"
    portal: "https://ocrportal.hhs.gov"
```

### D. Evidence Chain of Custody

#### Chain of Custody Form Template
```yaml
evidence_custody_form:
  case_information:
    incident_id: "${INCIDENT_ID}"
    date_opened: "${DATE}"
    case_officer: "${OFFICER_NAME}"
    classification: "${CLASSIFICATION}"
  
  evidence_details:
    item_number: "${ITEM_NUMBER}"
    description: "${DESCRIPTION}"
    source_system: "${SOURCE}"
    collection_method: "${METHOD}"
    hash_value: "${SHA256_HASH}"
    size: "${SIZE_BYTES}"
  
  custody_log:
    - date_time: "${TIMESTAMP}"
      action: "${ACTION}"
      from_person: "${FROM_NAME}"
      to_person: "${TO_NAME}"
      location: "${LOCATION}"
      purpose: "${PURPOSE}"
      signature: "${SIGNATURE_HASH}"
  
  storage_information:
    location: "${STORAGE_LOCATION}"
    access_control: "${ACCESS_LEVEL}"
    encryption: "${ENCRYPTION_METHOD}"
    backup_location: "${BACKUP_LOCATION}"
  
  validation:
    integrity_check: "${HASH_VERIFICATION}"
    last_verified: "${VERIFICATION_DATE}"
    verified_by: "${VERIFIER_NAME}"
```

### E. Lessons Learned Template

#### Post-Incident Review Document
```markdown
# Post-Incident Review: [Incident ID]

## Executive Summary
- **Incident Type**: [Type]
- **Severity**: [Level]
- **Duration**: [Start] to [End]
- **Business Impact**: [Description]
- **Root Cause**: [Summary]

## Timeline of Events
1. **Detection**: [Time] - [How detected]
2. **Initial Response**: [Time] - [Actions taken]
3. **Escalation**: [Time] - [Who notified]
4. **Containment**: [Time] - [Methods used]
5. **Eradication**: [Time] - [Steps taken]
6. **Recovery**: [Time] - [Systems restored]
7. **Closure**: [Time] - [Final status]

## What Went Well
- [Success point 1]
- [Success point 2]
- [Success point 3]

## Areas for Improvement
- [Improvement area 1]
  - **Issue**: [Description]
  - **Impact**: [How it affected response]
  - **Recommendation**: [Proposed solution]
  
- [Improvement area 2]
  - **Issue**: [Description]
  - **Impact**: [How it affected response]
  - **Recommendation**: [Proposed solution]

## Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| [Action 1] | [Name] | [Date] | [High/Medium/Low] |
| [Action 2] | [Name] | [Date] | [High/Medium/Low] |
| [Action 3] | [Name] | [Date] | [High/Medium/Low] |

## Metrics
- **MTTD**: [Minutes]
- **MTTR**: [Minutes]
- **MTTC**: [Minutes]
- **Downtime**: [Minutes]
- **Affected Users**: [Count]
- **Data Impacted**: [Amount]

## Recommendations
1. **Process Updates**:
   - [Update 1]
   - [Update 2]

2. **Tool Improvements**:
   - [Tool 1]
   - [Tool 2]

3. **Training Needs**:
   - [Training 1]
   - [Training 2]

## Appendices
- A. [Full incident timeline]
- B. [Technical analysis]
- C. [Communication logs]
- D. [Evidence summary]
```

---

## Document Control

- **Version**: 3.0
- **Last Updated**: January 2024
- **Next Review**: July 2024
- **Owner**: Security Operations Team
- **Classification**: Confidential

### Distribution List
- Security Operations Team
- IT Management
- Legal Department
- Compliance Team
- Executive Leadership

---
**END OF DOCUMENT**