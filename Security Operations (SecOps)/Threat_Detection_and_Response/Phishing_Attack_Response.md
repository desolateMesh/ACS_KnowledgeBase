# Phishing Attack Response Guide

## Table of Contents
1. [Overview](#overview)
2. [Detection Phase](#detection-phase)
3. [Initial Response](#initial-response)
4. [Containment Procedures](#containment-procedures)
5. [Investigation Process](#investigation-process)
6. [Remediation Steps](#remediation-steps)
7. [Recovery Actions](#recovery-actions)
8. [Post-Incident Activities](#post-incident-activities)
9. [Prevention Strategies](#prevention-strategies)
10. [Automation and Tools](#automation-and-tools)
11. [Metrics and KPIs](#metrics-and-kpis)
12. [Reference Materials](#reference-materials)

## Overview

### Purpose
This guide provides comprehensive procedures for detecting, responding to, and mitigating phishing attacks. It serves as a definitive resource for security operations teams and AI-driven automation systems to effectively handle phishing incidents.

### Scope
This document covers:
- Email-based phishing attacks
- Spear phishing campaigns
- Business Email Compromise (BEC)
- Credential harvesting attacks
- Malware distribution via phishing
- SMS phishing (Smishing)
- Voice phishing (Vishing)

### Critical Response Timeframes
- **Detection to Initial Response**: 15 minutes
- **Initial Response to Containment**: 30 minutes
- **Containment to Full Investigation**: 2 hours
- **Investigation to Remediation**: 4 hours
- **Full Recovery**: 24-48 hours

## Detection Phase

### Automated Detection Methods

#### Email Security Gateway Analysis
```yaml
detection_rules:
  sender_reputation:
    - Check SPF records
    - Verify DKIM signatures
    - Analyze DMARC compliance
    - Reputation scoring threshold: < 70
  
  content_analysis:
    - Suspicious keywords: ["urgent", "verify account", "suspended", "click here"]
    - URL reputation check
    - Attachment scanning
    - Language anomaly detection
    
  behavioral_patterns:
    - New sender to organization
    - Similar domain spoofing
    - Unusual sending patterns
    - Geographic anomalies
```

#### User-Reported Indicators
1. **Suspicious Email Characteristics**:
   - Unexpected sender
   - Urgency or threat language
   - Grammar and spelling errors
   - Generic greetings
   - Suspicious attachments
   - Hover-over URL mismatches

2. **Reporting Channels**:
   - Dedicated phishing report button
   - Security hotline: [PHONE]
   - Email: phishing@company.com
   - Internal ticketing system

### Detection Tools Configuration

#### Microsoft Defender for Office 365
```json
{
  "anti_phishing_policy": {
    "enabled": true,
    "impersonation_protection": {
      "users": ["executives", "finance", "hr"],
      "domains": ["company.com", "partners.com"],
      "action": "quarantine"
    },
    "spoof_intelligence": {
      "enabled": true,
      "action": "move_to_junk"
    },
    "mailbox_intelligence": {
      "enabled": true,
      "protection_level": "aggressive"
    }
  }
}
```

#### SIEM Integration
```python
# Sample SIEM rule for phishing detection
rule phishing_detection {
    meta:
        description = "Detect potential phishing emails"
        severity = "high"
        
    condition:
        email.subject matches /.*urgent.*action.*required.*/i
        and email.sender_domain not in trusted_domains
        and (
            email.contains_url or
            email.has_attachment
        )
        and email.spf_result != "pass"
}
```

## Initial Response

### Immediate Actions Checklist

1. **Verify the Threat** (0-5 minutes)
   - [ ] Confirm phishing indicators
   - [ ] Assess impact scope
   - [ ] Document initial findings
   - [ ] Assign severity level

2. **Initiate Response Team** (5-10 minutes)
   - [ ] Alert SOC team lead
   - [ ] Notify on-call security analyst
   - [ ] Engage email administrator
   - [ ] Alert legal/compliance if needed

3. **Preserve Evidence** (10-15 minutes)
   - [ ] Export email headers
   - [ ] Capture email content
   - [ ] Screenshot phishing site (if applicable)
   - [ ] Log all affected users

### Severity Classification Matrix

| Severity | Indicators | Response Time | Escalation |
|----------|-----------|---------------|------------|
| Critical | Executive targeted, active credential theft, >100 users affected | Immediate | CISO, Legal |
| High | Malware payload, 25-100 users affected, financial data targeted | 15 minutes | Security Manager |
| Medium | No malware, <25 users, generic phishing | 30 minutes | SOC Lead |
| Low | Blocked by filters, no user interaction | 1 hour | Standard process |

## Containment Procedures

### Email Containment

#### PowerShell Commands for Office 365
```powershell
# Search and remove phishing emails
$searchName = "PhishingSearch_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Create compliance search
New-ComplianceSearch -Name $searchName -ExchangeLocation All -ContentMatchQuery 'subject:"Suspicious Subject" AND from:attacker@malicious.com'

# Start the search
Start-ComplianceSearch -Identity $searchName

# Wait for completion and review results
Get-ComplianceSearch -Identity $searchName | FL

# Delete malicious emails
New-ComplianceSearchAction -SearchName $searchName -Purge -PurgeType HardDelete
```

### URL Blocking

#### Firewall Rules
```bash
# Block malicious domains at firewall level
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" reject' --zone=public
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" forward-port port="80" protocol="tcp" reject' --zone=public
firewall-cmd --reload
```

#### DNS Sinkhole Configuration
```bind
; Sinkhole malicious domains
zone "malicious-phishing-site.com" {
    type master;
    file "/etc/bind/db.sinkhole";
};

zone "phishing-variant.com" {
    type master;
    file "/etc/bind/db.sinkhole";
};
```

### User Account Protection

#### Azure AD Conditional Access
```json
{
  "conditions": {
    "users": {
      "include": ["affected_users_group"]
    },
    "applications": {
      "include": ["All"]
    },
    "locations": {
      "include": ["Any"]
    }
  },
  "grantControls": {
    "builtInControls": [
      "mfa",
      "compliantDevice"
    ],
    "operator": "OR"
  },
  "sessionControls": {
    "signInFrequency": {
      "value": 1,
      "type": "hours"
    }
  }
}
```

## Investigation Process

### Forensic Analysis Workflow

1. **Email Header Analysis**
```python
import email
import json
from datetime import datetime

def analyze_email_headers(email_content):
    msg = email.message_from_string(email_content)
    
    analysis = {
        "timestamp": datetime.now().isoformat(),
        "headers": {
            "from": msg.get("From"),
            "to": msg.get("To"),
            "subject": msg.get("Subject"),
            "message_id": msg.get("Message-ID"),
            "received": msg.get_all("Received"),
            "spf": msg.get("Received-SPF"),
            "dkim": msg.get("DKIM-Signature"),
            "dmarc": msg.get("Authentication-Results")
        },
        "suspicious_indicators": []
    }
    
    # Check for spoofing indicators
    if not verify_spf(analysis["headers"]["spf"]):
        analysis["suspicious_indicators"].append("SPF_FAIL")
    
    if not verify_dkim(analysis["headers"]["dkim"]):
        analysis["suspicious_indicators"].append("DKIM_FAIL")
    
    return json.dumps(analysis, indent=2)
```

2. **URL Analysis**
```python
import requests
from urllib.parse import urlparse
import ssl
import socket

def analyze_phishing_url(url):
    analysis = {
        "url": url,
        "domain": urlparse(url).netloc,
        "ssl_info": {},
        "redirects": [],
        "content_analysis": {}
    }
    
    try:
        # Check SSL certificate
        context = ssl.create_default_context()
        with socket.create_connection((analysis["domain"], 443)) as sock:
            with context.wrap_socket(sock, server_hostname=analysis["domain"]) as ssock:
                cert = ssock.getpeercert()
                analysis["ssl_info"] = {
                    "issuer": dict(x[0] for x in cert['issuer']),
                    "valid_from": cert['notBefore'],
                    "valid_until": cert['notAfter']
                }
        
        # Check for redirects
        response = requests.get(url, allow_redirects=False, timeout=10)
        while response.status_code in [301, 302, 303, 307, 308]:
            analysis["redirects"].append(response.headers.get('Location'))
            response = requests.get(response.headers.get('Location'), 
                                  allow_redirects=False, timeout=10)
        
        # Analyze content
        if response.status_code == 200:
            analysis["content_analysis"] = {
                "title": extract_title(response.text),
                "forms": count_forms(response.text),
                "external_resources": find_external_resources(response.text)
            }
    
    except Exception as e:
        analysis["error"] = str(e)
    
    return analysis
```

### Attack Pattern Recognition

#### Common Phishing Patterns
```yaml
patterns:
  credential_harvesting:
    indicators:
      - Login forms mimicking legitimate services
      - URL shorteners hiding destination
      - Typosquatting domains
      - Recently registered domains
    
  malware_distribution:
    indicators:
      - Office documents with macros
      - JavaScript attachments
      - Executable files disguised as documents
      - Archive files with suspicious contents
  
  business_email_compromise:
    indicators:
      - Spoofed executive emails
      - Wire transfer requests
      - Urgent payment demands
      - Vendor impersonation
```

## Remediation Steps

### Account Remediation

1. **Password Reset Procedures**
```powershell
# Force password reset for affected users
$affectedUsers = Get-Content "affected_users.txt"

foreach ($user in $affectedUsers) {
    Set-AzureADUser -ObjectId $user -PasswordPolicies "DisablePasswordExpiration"
    Set-AzureADUserPassword -ObjectId $user -ForceChangePasswordNextLogin $true
    
    # Revoke all sessions
    Revoke-AzureADUserAllRefreshToken -ObjectId $user
}
```

2. **MFA Enforcement**
```powershell
# Enable MFA for affected accounts
$mfaSettings = New-Object -TypeName Microsoft.Online.Administration.StrongAuthenticationRequirement
$mfaSettings.RelyingParty = "*"
$mfaSettings.State = "Enforced"

foreach ($user in $affectedUsers) {
    Set-MsolUser -UserPrincipalName $user -StrongAuthenticationRequirements $mfaSettings
}
```

### System Remediation

#### Endpoint Scanning
```bash
#!/bin/bash
# Scan endpoints for IoCs

IoC_FILE="phishing_iocs.txt"
RESULTS_DIR="/var/log/phishing_scan"

mkdir -p $RESULTS_DIR

while IFS= read -r ioc; do
    echo "Scanning for IoC: $ioc"
    
    # File system scan
    find / -type f -name "*$ioc*" 2>/dev/null > "$RESULTS_DIR/file_matches_$ioc.txt"
    
    # Process scan
    ps aux | grep -i "$ioc" > "$RESULTS_DIR/process_matches_$ioc.txt"
    
    # Network connections
    netstat -an | grep "$ioc" > "$RESULTS_DIR/network_matches_$ioc.txt"
    
done < "$IoC_FILE"
```

#### Registry Cleanup (Windows)
```powershell
# Search and remove malicious registry entries
$registryPaths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run"
)

$maliciousPatterns = @("malware.exe", "phishing_tool", "suspicious_updater")

foreach ($path in $registryPaths) {
    $entries = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue
    
    foreach ($pattern in $maliciousPatterns) {
        $entries.PSObject.Properties | Where-Object { $_.Value -like "*$pattern*" } | ForEach-Object {
            Remove-ItemProperty -Path $path -Name $_.Name -Force
            Write-Log "Removed registry entry: $($_.Name) from $path"
        }
    }
}
```

## Recovery Actions

### Communication Templates

#### User Notification
```markdown
Subject: Important Security Alert - Phishing Attack Detected

Dear [User],

Our security team has identified that you may have received a phishing email on [DATE] at [TIME]. 

**Immediate Actions Required:**
1. Do not click any links or open attachments from the suspicious email
2. Change your password immediately at [LINK]
3. Enable two-factor authentication if not already active
4. Report any unusual account activity

**What We're Doing:**
- Removed the malicious email from all mailboxes
- Blocked the sender and associated domains
- Scanning all systems for potential compromise
- Monitoring for any unauthorized access

If you clicked any links or entered credentials, please contact the security team immediately at [CONTACT].

Thank you for your cooperation.
Security Team
```

#### Executive Summary
```markdown
# Phishing Attack Executive Summary

**Incident Date:** [DATE]
**Detection Time:** [TIME]
**Impact Assessment:** [Low/Medium/High/Critical]

## Key Findings
- Attack vector: [Email/SMS/Voice]
- Affected users: [NUMBER]
- Compromised accounts: [NUMBER]
- Data exposure risk: [Yes/No]

## Actions Taken
1. Contained threat within [X] minutes
2. Reset passwords for [X] accounts
3. Blocked [X] malicious domains
4. Removed [X] emails from mailboxes

## Business Impact
- Downtime: [X] hours
- Affected services: [LIST]
- Financial impact: [ESTIMATE]

## Next Steps
- Complete forensic analysis by [DATE]
- Update security training by [DATE]
- Implement additional controls by [DATE]
```

### Service Restoration

#### Email Service Restoration
```powershell
# Restore email services after containment
function Restore-EmailServices {
    param(
        [string[]]$AffectedUsers,
        [string]$IncidentID
    )
    
    # Remove transport rules created during incident
    Get-TransportRule | Where-Object { $_.Comments -like "*$IncidentID*" } | Remove-TransportRule
    
    # Restore user mailbox access
    foreach ($user in $AffectedUsers) {
        # Remove litigation hold if applied
        Set-Mailbox -Identity $user -LitigationHoldEnabled $false
        
        # Restore normal quota
        Set-Mailbox -Identity $user -ProhibitSendQuota 50GB -ProhibitSendReceiveQuota 52GB
        
        # Clear quarantine
        Get-QuarantineMessage -RecipientAddress $user | Release-QuarantineMessage
    }
    
    # Update service health dashboard
    Update-ServiceHealth -Service "Email" -Status "Operational" -IncidentID $IncidentID
}
```

## Post-Incident Activities

### Lessons Learned Meeting

#### Meeting Agenda Template
```markdown
# Phishing Incident Post-Mortem

**Date:** [DATE]
**Incident ID:** [ID]
**Attendees:** [LIST]

## Agenda

1. **Timeline Review** (15 min)
   - Detection point
   - Response actions
   - Resolution time

2. **What Went Well** (10 min)
   - Effective controls
   - Quick wins
   - Team coordination

3. **What Needs Improvement** (20 min)
   - Detection gaps
   - Response delays
   - Communication issues

4. **Root Cause Analysis** (15 min)
   - Attack vector
   - Vulnerability exploited
   - Human factors

5. **Action Items** (15 min)
   - Short-term fixes
   - Long-term improvements
   - Training needs

6. **Next Steps** (5 min)
   - Task assignments
   - Deadlines
   - Follow-up schedule
```

### Security Posture Improvements

#### Technical Controls Enhancement
```json
{
  "email_security": {
    "advanced_threat_protection": {
      "safe_attachments": true,
      "safe_links": true,
      "url_detonation": true,
      "attachment_sandboxing": true
    },
    "anti_spoofing": {
      "dmarc_policy": "reject",
      "spf_hard_fail": true,
      "internal_spoofing_protection": true
    }
  },
  "endpoint_protection": {
    "behavior_monitoring": true,
    "machine_learning": true,
    "exploit_protection": true,
    "network_protection": true
  },
  "user_training": {
    "phishing_simulation_frequency": "monthly",
    "mandatory_training": true,
    "role_based_training": true
  }
}
```

### Documentation Updates

#### Process Improvement Tracking
```yaml
improvement_areas:
  detection:
    - Implement AI-based content analysis
    - Enhance sender reputation scoring
    - Add behavioral anomaly detection
    
  response:
    - Automate initial containment
    - Improve cross-team communication
    - Streamline evidence collection
    
  recovery:
    - Faster account remediation
    - Automated service restoration
    - Better user communication
    
  prevention:
    - Enhanced email filtering
    - Improved user training
    - Regular phishing simulations
```

## Prevention Strategies

### User Training Program

#### Phishing Awareness Curriculum
```markdown
# Phishing Awareness Training Module

## Module 1: Recognizing Phishing (30 minutes)
- Common phishing tactics
- Red flags to watch for
- Real vs. fake examples
- Interactive quiz

## Module 2: Reporting Procedures (15 minutes)
- How to report suspicious emails
- Using the report phishing button
- When to call security
- Preserving evidence

## Module 3: Safe Practices (20 minutes)
- Verifying sender identity
- Hovering over links
- Handling attachments
- Password management

## Module 4: Advanced Threats (25 minutes)
- Spear phishing
- Business email compromise
- Vishing and smishing
- Social engineering

## Assessment (15 minutes)
- 20 question quiz
- Simulated phishing test
- Certification upon completion
```

### Technical Prevention Measures

#### Email Authentication Setup
```bash
# SPF Record
v=spf1 mx a:mail.company.com ip4:192.168.1.0/24 -all

# DKIM Record
default._domainkey IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4..."

# DMARC Record
_dmarc IN TXT "v=DMARC1; p=reject; rua=mailto:dmarc@company.com; ruf=mailto:dmarc-forensics@company.com; sp=reject; adkim=s; aspf=s"
```

#### Advanced Email Filtering Rules
```python
class PhishingFilter:
    def __init__(self):
        self.reputation_threshold = 70
        self.suspicious_patterns = [
            r'urgent.{0,20}action.{0,20}required',
            r'verify.{0,20}account.{0,20}immediately',
            r'suspended.{0,20}account',
            r'click.{0,20}here.{0,20}now'
        ]
        
    def analyze_email(self, email):
        score = 100
        
        # Check sender reputation
        if self.check_sender_reputation(email.sender) < self.reputation_threshold:
            score -= 30
            
        # Check for suspicious patterns
        for pattern in self.suspicious_patterns:
            if re.search(pattern, email.content, re.IGNORECASE):
                score -= 20
                
        # Check for URL shorteners
        if self.contains_url_shortener(email.content):
            score -= 25
            
        # Check attachment types
        if self.has_suspicious_attachment(email.attachments):
            score -= 40
            
        return score < 50  # True if likely phishing
```

## Automation and Tools

### Security Orchestration Playbook

#### SOAR Platform Integration
```yaml
playbook: phishing_response_automation
version: 1.0
trigger: email_reported_phishing

steps:
  - name: extract_iocs
    action: parse_email
    parameters:
      extract_urls: true
      extract_attachments: true
      extract_sender_info: true
    outputs:
      - urls
      - attachments
      - sender_data

  - name: reputation_check
    action: check_reputation
    inputs:
      urls: "{{ steps.extract_iocs.outputs.urls }}"
      sender: "{{ steps.extract_iocs.outputs.sender_data }}"
    outputs:
      - reputation_scores
      - threat_level

  - name: containment_decision
    action: evaluate_threat
    inputs:
      threat_level: "{{ steps.reputation_check.outputs.threat_level }}"
    outputs:
      - action_required
      - severity

  - name: auto_containment
    action: contain_threat
    conditions:
      - "{{ steps.containment_decision.outputs.action_required }} == true"
    parameters:
      block_sender: true
      quarantine_emails: true
      notify_users: true
    outputs:
      - containment_status
      - affected_users

  - name: create_ticket
    action: create_incident
    parameters:
      priority: "{{ steps.containment_decision.outputs.severity }}"
      title: "Phishing Attack - {{ steps.extract_iocs.outputs.sender_data.address }}"
      description: "Automated containment completed. Review required."
    outputs:
      - ticket_id

  - name: notify_soc
    action: send_notification
    parameters:
      channel: soc_alerts
      message: "Phishing incident {{ steps.create_ticket.outputs.ticket_id }} - Auto-contained"
```

### PowerShell Automation Scripts

#### Automated Response Script
```powershell
function Invoke-PhishingResponse {
    param(
        [Parameter(Mandatory=$true)]
        [string]$EmailMessageId,
        
        [Parameter(Mandatory=$true)]
        [string]$ReportedBy
    )
    
    # Initialize response object
    $response = @{
        MessageId = $EmailMessageId
        StartTime = Get-Date
        Actions = @()
        Status = "Processing"
    }
    
    try {
        # Step 1: Retrieve and analyze email
        Write-Host "Retrieving email message..." -ForegroundColor Yellow
        $message = Get-MessageTrace -MessageId $EmailMessageId
        $response.Actions += "Retrieved email message"
        
        # Step 2: Extract IoCs
        $iocs = @{
            Sender = $message.SenderAddress
            Subject = $message.Subject
            Recipients = $message.RecipientAddress
            URLs = Extract-URLsFromMessage -MessageId $EmailMessageId
            Attachments = Get-MessageAttachments -MessageId $EmailMessageId
        }
        $response.Actions += "Extracted IoCs"
        
        # Step 3: Check reputation
        $threatLevel = Get-ThreatLevel -IoCs $iocs
        $response.ThreatLevel = $threatLevel
        
        # Step 4: Automated containment
        if ($threatLevel -ge "Medium") {
            # Block sender
            New-BlockedSenderEntry -SenderAddress $iocs.Sender
            $response.Actions += "Blocked sender: $($iocs.Sender)"
            
            # Quarantine similar messages
            $quarantined = Search-AndQuarantine -Sender $iocs.Sender -Subject $iocs.Subject
            $response.Actions += "Quarantined $($quarantined.Count) messages"
            
            # Notify affected users
            Send-SecurityAlert -Recipients $iocs.Recipients -ThreatType "Phishing"
            $response.Actions += "Notified affected users"
        }
        
        # Step 5: Create incident ticket
        $ticket = New-SecurityIncident -Type "Phishing" -Severity $threatLevel -Data $iocs
        $response.TicketId = $ticket.Id
        
        $response.Status = "Completed"
        
    } catch {
        $response.Status = "Failed"
        $response.Error = $_.Exception.Message
    }
    
    $response.EndTime = Get-Date
    $response.Duration = ($response.EndTime - $response.StartTime).TotalMinutes
    
    return $response
}
```

## Metrics and KPIs

### Performance Indicators

#### Response Time Metrics
```sql
-- Average time to detect phishing
SELECT 
    AVG(DATEDIFF(minute, email_received, threat_detected)) as avg_detection_time,
    COUNT(*) as total_incidents,
    COUNT(CASE WHEN auto_detected = 1 THEN 1 END) as auto_detected,
    COUNT(CASE WHEN user_reported = 1 THEN 1 END) as user_reported
FROM phishing_incidents
WHERE incident_date >= DATEADD(month, -1, GETDATE());

-- Average time to contain
SELECT 
    AVG(DATEDIFF(minute, threat_detected, threat_contained)) as avg_containment_time,
    MIN(DATEDIFF(minute, threat_detected, threat_contained)) as min_containment_time,
    MAX(DATEDIFF(minute, threat_detected, threat_contained)) as max_containment_time
FROM phishing_incidents
WHERE incident_date >= DATEADD(month, -1, GETDATE())
AND threat_contained IS NOT NULL;
```

### Dashboard Configuration

#### Grafana Dashboard JSON
```json
{
  "dashboard": {
    "title": "Phishing Attack Metrics",
    "panels": [
      {
        "id": 1,
        "title": "Detection Rate",
        "type": "graph",
        "targets": [
          {
            "query": "rate(phishing_detected_total[5m])"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "gauge",
        "targets": [
          {
            "query": "avg(phishing_response_time_seconds)"
          }
        ]
      },
      {
        "id": 3,
        "title": "User Click Rate",
        "type": "stat",
        "targets": [
          {
            "query": "phishing_user_clicks_total / phishing_emails_sent_total * 100"
          }
        ]
      },
      {
        "id": 4,
        "title": "Top Targeted Departments",
        "type": "piechart",
        "targets": [
          {
            "query": "topk(5, phishing_targets_by_department)"
          }
        ]
      }
    ],
    "refresh": "5m",
    "time": {
      "from": "now-24h",
      "to": "now"
    }
  }
}
```

### Monthly Reporting Template

```markdown
# Monthly Phishing Attack Report

**Reporting Period:** [MONTH YEAR]
**Generated:** [DATE]

## Executive Summary
- Total phishing attempts: [NUMBER]
- Successful detections: [PERCENTAGE]%
- User click rate: [PERCENTAGE]%
- Average response time: [MINUTES] minutes

## Trend Analysis
![Phishing Trends Graph]

### Month-over-Month Comparison
| Metric | Current Month | Previous Month | Change |
|--------|---------------|----------------|--------|
| Total Attacks | X | Y | +/-% |
| Detection Rate | X% | Y% | +/-% |
| Response Time | X min | Y min | +/-% |
| False Positives | X | Y | +/-% |

## Top Attack Vectors
1. Credential Harvesting (X%)
2. Malware Distribution (X%)
3. Business Email Compromise (X%)
4. Gift Card Scams (X%)

## Targeted Departments
1. Finance (X%)
2. Human Resources (X%)
3. IT (X%)
4. Sales (X%)
5. Executive (X%)

## Training Effectiveness
- Users completed training: X%
- Phishing simulation results:
  - Click rate: X%
  - Report rate: X%
  - Improvement from last month: X%

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Next Steps
- [Action item 1]
- [Action item 2]
- [Action item 3]
```

## Reference Materials

### External Resources

1. **Industry Standards**
   - NIST Cyber Security Framework
   - ISO 27001/27002
   - SANS Incident Handling Guide
   - MITRE ATT&CK Framework

2. **Threat Intelligence**
   - PhishTank Database
   - APWG Phishing Reports
   - FBI IC3 Alerts
   - CISA Advisories

3. **Tools and Platforms**
   - Microsoft Defender for Office 365
   - Proofpoint Email Protection
   - KnowBe4 Security Awareness
   - Splunk Enterprise Security

### Internal Resources

1. **Documentation**
   - Incident Response Plan
   - Email Security Policy
   - User Training Materials
   - Technical Runbooks

2. **Contacts**
   - SOC Team: soc@company.com
   - Email Admin: emailadmin@company.com
   - Security Hotline: 1-800-XXX-XXXX
   - Legal Team: legal@company.com

3. **Templates**
   - Incident Report Form
   - User Communication Templates
   - Executive Briefing Format
   - Lessons Learned Template

### Quick Reference Commands

#### Office 365 PowerShell
```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@company.com

# Search for phishing emails
Get-MessageTrace -SenderAddress "phisher@malicious.com" -StartDate (Get-Date).AddDays(-7) -EndDate (Get-Date)

# Block sender domain
New-BlockedSenderEntry -SenderDomain "malicious.com"

# Remove emails from all mailboxes
Remove-Message -Identity <MessageID> -Confirm:$false
```

#### Linux Command Line
```bash
# Check mail logs for suspicious activity
grep -i "suspicious-domain.com" /var/log/mail.log

# Block IP at firewall
iptables -A INPUT -s 192.168.1.100 -j DROP

# Search for IOCs in files
find /home -type f -exec grep -l "phishing-string" {} \;
```

#### Windows Command Line
```cmd
# Check DNS cache for malicious domains
ipconfig /displaydns | findstr "malicious"

# Flush DNS cache
ipconfig /flushdns

# Check active connections
netstat -an | findstr ":443"
```

---

**Document Version:** 2.0
**Last Updated:** [CURRENT_DATE]
**Next Review:** [CURRENT_DATE + 90 days]
**Owner:** Security Operations Team
**Classification:** Internal Use Only

[CONTINUATION_POINT] - End of Phishing Attack Response Guide
