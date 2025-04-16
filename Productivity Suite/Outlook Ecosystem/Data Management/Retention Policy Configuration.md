# Retention Policy Configuration

## Overview

Retention policies in Exchange and Microsoft 365 enable organizations to manage the lifecycle of email content by specifying how long to keep items and what action to take when they reach the end of their retention period. This document provides comprehensive guidance on implementing, configuring, and managing retention policies effectively for compliance, storage optimization, and data governance.

## Retention Framework Fundamentals

### Key Components

The Microsoft 365 retention framework consists of these essential components:

1. **Retention Policies**: Container objects that group retention settings for application to mailboxes, sites, and other workloads

2. **Retention Tags**: Individual settings that define:
   - Retention period (how long to keep content)
   - Retention action (what happens when the period expires)
   - Scope of application (which items or folders are affected)

3. **Managed Folder Assistant (MFA)**: Background process that applies retention settings to items

4. **Retention Labels**: Advanced retention markers that can be applied manually or automatically to content

### Retention vs. Deletion

Understanding the difference between retention and deletion is critical:

| Concept | Definition | Purpose | Configuration |
|---------|------------|---------|---------------|
| Retention | Keeping content for a specified period | Compliance, legal requirements, business needs | Preservation policies, litigation hold |
| Deletion | Removing content after a specified period | Storage management, privacy, risk reduction | Deletion policies, expiration tags |
| Retention + Deletion | Keep content for a period, then delete | Complete lifecycle management | Retention policies with deletion action |

### Policy Types and Capabilities

There are several types of retention policies available:

1. **Exchange Retention Policies**: Legacy system using Messaging Records Management (MRM)
   - Applied to Exchange mailboxes only
   - Configured in Exchange Admin Center
   - Uses retention tags linked to policies

2. **Microsoft 365 Retention Policies**: Modern unified system
   - Applied across multiple workloads (Exchange, SharePoint, OneDrive, Teams)
   - Configured in Microsoft Purview compliance portal
   - Uses simplified creation workflow

3. **Adaptive Scopes**: Dynamic group-based retention
   - Automatically includes users based on attributes
   - Updates membership as attributes change
   - Reduces administrative overhead

## Tag-Based Retention

### Types of Retention Tags

Exchange Online supports several types of retention tags:

1. **Default Policy Tag (DPT)**:
   - Applies to untagged items
   - Only one DPT per retention policy
   - Defines "catch-all" behavior

2. **Retention Policy Tag (RPT)**:
   - Applies to specific default folders (Inbox, Sent Items, etc.)
   - Cannot be changed or moved by users
   - Provides consistent folder-level retention

3. **Personal Tag**:
   - Available for users to apply manually
   - Appears in Outlook's retention policy menu
   - Allows user-directed retention decisions

### Default Retention Tags

Exchange Online includes these built-in retention tags:

| Tag Name | Type | Retention Period | Retention Action | Purpose |
|----------|------|------------------|------------------|---------|
| Default 2 year move to archive | DPT | 2 years | Move to Archive | Basic archiving |
| Personal 1 year move to archive | Personal | 1 year | Move to Archive | User-applied archiving |
| 1 Month Delete | Personal | 1 month | Permanently Delete | Quick deletion |
| 1 Year Delete | Personal | 1 year | Permanently Delete | Annual cleanup |
| 5 Year Delete | Personal | 5 years | Permanently Delete | Extended retention |
| Never Delete | Personal | Unlimited | None | Permanent retention |
| Recoverable Items 14 days move to archive | RPT | 14 days | Move to Archive | Recoverable items management |

### Creating Custom Retention Tags

Custom retention tags can be created to meet specific business needs:

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline -UserPrincipalName admin@contoso.com

# Create a Default Policy Tag (DPT) for 3-year retention then deletion
New-RetentionPolicyTag -Name "Default 3 Year Delete" -Type All -RetentionEnabled $true -AgeLimitForRetention 1095 -RetentionAction PermanentlyDelete

# Create a Retention Policy Tag (RPT) for 7-year retention of Inbox items
New-RetentionPolicyTag -Name "Inbox 7 Year Archive" -Type Inbox -RetentionEnabled $true -AgeLimitForRetention 2555 -RetentionAction MoveToArchive

# Create a Personal Tag for 10-year retention
New-RetentionPolicyTag -Name "Business Critical 10 Years" -Type Personal -RetentionEnabled $true -AgeLimitForRetention 3650 -RetentionAction MoveToArchive
```

### Retention Actions

When items reach their retention age, one of these actions occurs:

1. **Delete and Allow Recovery**: Moves items to the Recoverable Items folder
   - Users can recover within the deleted item retention period (default: 14 days)
   - Appropriate for most general deletion scenarios

2. **Permanently Delete**: Removes items completely
   - No recovery possible by users
   - Bypasses Recoverable Items folder
   - Use with caution for sensitive information

3. **Move to Archive**: Relocates items to the archive mailbox
   - Preserves items but reduces primary mailbox size
   - Requires archive mailbox to be enabled
   - Good for items needed occasionally but not daily

4. **Mark as Past Retention Limit**: Flags items only
   - No automatic action taken
   - Requires manual intervention
   - Useful for awareness without enforcement

### Age Calculation Methods

The starting point for age calculation can be configured:

1. **Message Delivery Date/Creation Date**: When the item was received or created
   - Default for most scenarios
   - Most intuitive for users

2. **Message Modification Date**: When the item was last changed
   - Resets the retention clock when items are edited
   - Can be problematic as editing extends retention

3. **Custom Start Date**: Fixed date specified in properties
   - Allows manual override of retention starting point
   - Useful for project-based retention

## Retention Policy Configuration

### Creating Retention Policies

Retention policies group tags for assignment to mailboxes:

```powershell
# Create a new retention policy
New-RetentionPolicy -Name "Standard User Policy" -RetentionPolicyTagLinks "Default 2 year move to archive","Personal 1 year move to archive","1 Month Delete","1 Year Delete","Never Delete"

# Create a legal department policy with more tags
New-RetentionPolicy -Name "Legal Department Policy" -RetentionPolicyTagLinks "Default 7 year delete","Inbox 7 Year Archive","Business Critical 10 Years","1 Year Delete","Never Delete"
```

### Assigning Policies to Mailboxes

Policies can be assigned to individual mailboxes or groups:

```powershell
# Assign policy to a single mailbox
Set-Mailbox -Identity user@contoso.com -RetentionPolicy "Standard User Policy"

# Assign policy to multiple mailboxes (based on department)
$legalUsers = Get-User -Filter {Department -eq "Legal"} | Select-Object -ExpandProperty UserPrincipalName
foreach ($user in $legalUsers) {
    Set-Mailbox -Identity $user -RetentionPolicy "Legal Department Policy"
    Write-Host "Assigned Legal Department Policy to $user"
}

# Assign policy to all mailboxes
Get-Mailbox -ResultSize Unlimited | Set-Mailbox -RetentionPolicy "Standard User Policy"
```

### Verifying Policy Assignment

After assignment, verify policy application:

```powershell
# Check policy assignment for a mailbox
Get-Mailbox -Identity user@contoso.com | Select-Object Name,RetentionPolicy

# Generate report of all mailboxes and their retention policies
Get-Mailbox -ResultSize Unlimited | Select-Object Name,UserPrincipalName,RetentionPolicy | Export-Csv -Path "C:\RetentionPolicyReport.csv" -NoTypeInformation
```

## Managed Folder Assistant

### MFA Process Overview

The Managed Folder Assistant (MFA) is a background process that:

1. Evaluates items in mailboxes against applicable retention policies
2. Stamps items with appropriate retention tags
3. Takes action on items that have reached their retention age
4. Processes each mailbox on a schedule (typically every 7 days)

### Triggering Manual Processing

For testing or urgent application, manually trigger MFA:

```powershell
# Start Managed Folder Assistant for a single mailbox
Start-ManagedFolderAssistant -Identity user@contoso.com

# Process multiple mailboxes
$mailboxes = Get-Mailbox -Filter {RetentionPolicy -eq "Legal Department Policy"}
foreach ($mailbox in $mailboxes) {
    Start-ManagedFolderAssistant -Identity $mailbox.UserPrincipalName
    Write-Host "Processing $($mailbox.UserPrincipalName)..."
    Start-Sleep -Seconds 5 # Avoid throttling
}
```

### Monitoring MFA Activity

Track MFA processing to ensure proper application:

```powershell
# Check when MFA last ran on a mailbox
Get-MailboxFolderStatistics -Identity user@contoso.com -FolderScope RecoverableItems | Select-Object Name,LastProcessedTime

# Review MFA logs (requires admin access to Exchange servers)
Get-EventLog -LogName Application -Source "MSExchange Mailbox Assistants" -After (Get-Date).AddDays(-1) | Where-Object {$_.Message -like "*Managed Folder Assistant*"} | Format-List
```

## Microsoft 365 Retention Policies

### Creating M365 Retention Policies

Microsoft 365 retention policies offer simplified, cross-workload configuration:

1. **Access the Microsoft Purview compliance portal**:
   - Navigate to [compliance.microsoft.com](https://compliance.microsoft.com)
   - Go to Data lifecycle management → Retention policies

2. **Create a new retention policy**:
   - Click "New retention policy"
   - Name the policy and add a description
   - Choose locations (Exchange, SharePoint, OneDrive, Teams)
   - Select specific users or apply to all
   - Define retention period and action

3. **PowerShell implementation** (advanced configuration):

```powershell
# Connect to Security & Compliance PowerShell
Connect-IPPSSession -UserPrincipalName admin@contoso.com

# Create a new retention policy
New-RetentionCompliancePolicy -Name "Company-Wide 5 Year Retention" -ExchangeLocation All -SharePointLocation All -OneDriveLocation All -TeamsChannelLocation All -TeamsPrivateChannelLocation All -TeamsChatLocation All -ModernGroupLocation All

# Create the retention rule
New-RetentionComplianceRule -Name "5 Year Then Delete" -Policy "Company-Wide 5 Year Retention" -RetentionDuration 1825 -RetentionComplianceAction Delete -ExpirationDateOption Created
```

### Advanced Configurations

For more complex scenarios, configure these advanced settings:

1. **Content Types**:
   - Filter based on sensitive information types
   - Include/exclude specific keywords
   - Target specific message classes

2. **Adaptive Scopes**:
   ```powershell
   # Create user scope for Finance department
   New-AdaptiveScope -Name "Finance Department Scope" -ScopeType User -SourceType GroupProperty -GroupProperty Department -Value "Finance"
   
   # Create site scope for Project X
   New-AdaptiveScope -Name "Project X Sites" -ScopeType Site -SourceType SiteProperty -SiteProperty Title -Value "Project X*" -IncludeInScope PatternMatch
   
   # Apply policy to adaptive scope
   New-RetentionCompliancePolicy -Name "Finance 7 Year Retention" -AdaptiveScopeLocation "Finance Department Scope"
   ```

3. **Disposition Review**:
   - Require manual review before deletion
   - Create approval workflows
   - Document disposition actions

### Resolving Policy Conflicts

When multiple policies apply, these conflict resolution rules determine the outcome:

1. **Retention always wins over deletion**: If one policy says to retain and another to delete, the content is retained

2. **Longest retention period prevails**: If multiple policies specify different retention periods, the longest is applied

3. **Explicit wins over implicit**: Specifically targeted policies override general policies

4. **Shortest deletion period wins**: If multiple deletion policies apply, the shortest period determines when content is deleted

### Policy Metrics and Monitoring

Track policy effectiveness with monitoring tools:

```powershell
# Get retention policy statistics
Get-RetentionCompliancePolicy | Get-RetentionCompliancePolicyStatistics | Format-Table Name,Locations,Enabled,Items

# Report on items pending disposition
$dispositionReport = @()
$policies = Get-RetentionCompliancePolicy
foreach ($policy in $policies) {
    $stats = Get-RetentionCompliancePolicyStatistics -Identity $policy.Identity
    $dispositionReport += [PSCustomObject]@{
        PolicyName = $policy.Name
        ItemsSubjectToPolicy = $stats.Items
        Locations = ($policy.LocationNames -join ", ")
        LastModified = $policy.LastModified
    }
}
$dispositionReport | Format-Table -AutoSize
```

## Legal Hold vs In-Place Hold

### Hold Types and Capabilities

Holds preserve content regardless of retention policies:

| Hold Type | Scope | Configuration | Duration | User Visibility |
|-----------|-------|---------------|----------|----------------|
| Litigation Hold | Entire mailbox | Mailbox setting | Indefinite or time-based | Can be hidden from user |
| eDiscovery Hold | Query-based | eDiscovery case | Case duration | Hidden from user |
| In-Place Hold | Query-based (legacy) | EAC In-Place eDiscovery | Time-based | Hidden from user |
| Retention Hold | Prevents policy processing | Mailbox setting | Time-based | Can notify user |

### Implementing Litigation Hold

Apply litigation hold to preserve all mailbox content:

```powershell
# Enable indefinite litigation hold
Set-Mailbox -Identity user@contoso.com -LitigationHoldEnabled $true

# Enable time-based litigation hold (e.g., 7 years)
Set-Mailbox -Identity user@contoso.com -LitigationHoldEnabled $true -LitigationHoldDuration 2555

# Add hold notification to user
Set-Mailbox -Identity user@contoso.com -LitigationHoldEnabled $true -RetentionComment "Legal hold for Johnson case" -RetentionUrl "https://intranet.contoso.com/legal/holds"

# Verify litigation hold status
Get-Mailbox -Identity user@contoso.com | Format-List Name,LitigationHoldEnabled,LitigationHoldDuration,LitigationHoldDate
```

### Implementing eDiscovery Hold

Create targeted hold through eDiscovery cases:

1. **Access compliance center**:
   - Go to eDiscovery → Core eDiscovery
   - Create a new case

2. **Configure hold**:
   - Add hold to the case
   - Select users or groups
   - Define query conditions (keywords, dates)
   - Apply the hold

3. **PowerShell implementation**:
   ```powershell
   # Connect to Security & Compliance PowerShell
   Connect-IPPSSession
   
   # Create eDiscovery case
   New-ComplianceCase -Name "Johnson Litigation" -Description "Financial documents related to Johnson case"
   
   # Create hold for specific content
   New-CaseHoldPolicy -Name "Johnson Financial Documents" -Case "Johnson Litigation" -ExchangeLocation user1@contoso.com,user2@contoso.com
   
   # Add rule with search conditions
   New-CaseHoldRule -Name "Johnson Financials" -Policy "Johnson Financial Documents" -ContentMatchQuery "budget OR forecast OR financial statement" -StartDate "1/1/2022" -EndDate "12/31/2022"
   ```

### Retention Hold Configuration

Temporarily suspend retention policy processing:

```powershell
# Enable retention hold
Set-Mailbox -Identity user@contoso.com -RetentionHoldEnabled $true

# Enable timed retention hold (e.g., during vacation)
Set-Mailbox -Identity user@contoso.com -RetentionHoldEnabled $true -StartDateForRetentionHold "7/1/2023" -EndDateForRetentionHold "7/31/2023"

# Check retention hold status
Get-Mailbox -Identity user@contoso.com | Select-Object RetentionHoldEnabled,StartDateForRetentionHold,EndDateForRetentionHold
```

## User Experience and Training

### Outlook Client Experience

Retention policies appear differently based on Outlook version:

1. **Outlook Desktop**:
   - Retention tags visible in Assign Policy dropdown
   - Policy information shown in item properties
   - Archive policy indicated in folder properties

2. **Outlook Web App (OWA)**:
   - Limited retention tag visibility
   - Basic policy information in item properties
   - Less granular control than desktop client

3. **Outlook Mobile**:
   - Minimal retention visibility
   - Cannot apply personal tags
   - Can view archived items

### User Training Materials

Develop these training resources for effective user adoption:

1. **Quick Reference Guide**:
   - Retention policy overview
   - How to identify applied retention tags
   - Steps to apply personal tags

2. **Video Tutorials**:
   - Demonstrate tag application
   - Show archive access methods
   - Explain retention policy concepts

3. **FAQ Document**:
   - Address common retention questions
   - Explain compliance requirements
   - Clarify user responsibilities

### User Notification Templates

Effective communication templates for rollout:

1. **Policy Introduction Email**:
   ```
   Subject: Important: New Email Retention Policies Effective [Date]
   
   Dear [Name],
   
   Effective [Date], our organization is implementing new email retention policies to improve compliance and storage management. These policies will:
   
   - Automatically move items older than [X] years to your archive
   - Delete items in certain folders after [Y] years
   - Provide you with options to tag important emails for longer retention
   
   For more information, please review the attached guide and attend the upcoming training session on [Date/Time].
   
   IT Support Team
   ```

2. **Training Invitation**:
   ```
   Subject: Required Training: Email Retention Policy Changes
   
   You're invited to a training session on our new email retention policies.
   
   Date: [Date]
   Time: [Time]
   Location: [Location/Virtual Link]
   
   This session will cover:
   - How the new policies affect your email
   - How to access archived items
   - How to apply retention tags to important emails
   
   Attendance is required as these changes affect all email users.
   ```

3. **Go-Live Reminder**:
   ```
   Subject: REMINDER: Email Retention Policies Effective Tomorrow
   
   This is a reminder that our new email retention policies take effect tomorrow.
   
   Key points to remember:
   - Items older than [X] years will begin moving to your archive
   - The process occurs gradually over several weeks
   - No immediate action is required on your part
   - Support resources are available at [Link]
   
   Contact the helpdesk with any questions.
   ```

## Compliance and Governance

### GDPR Print Job Logging Requirements

For European Union GDPR compliance:

1. **Enable mailbox audit logging**:
   ```powershell
   # Enable detailed mailbox auditing
   Set-Mailbox -Identity user@contoso.com -AuditEnabled $true -AuditLogAgeLimit 180 -AuditAdmin Update,Move,MoveToDeletedItems,SoftDelete,HardDelete -AuditDelegate Update,Move,MoveToDeletedItems,SoftDelete,HardDelete -AuditOwner Update,Move,MoveToDeletedItems,SoftDelete,HardDelete
   ```

2. **Implement advanced retention**:
   - Create special tags for GDPR-relevant content
   - Configure disposition review for deletion verification
   - Document retention decisions

3. **Configure data subject request process**:
   - Create content search templates for PII identification
   - Develop workflow for handling deletion requests
   - Implement export process for data portability

### HIPAA-Compliant Print Workflows

For healthcare organizations requiring HIPAA compliance:

1. **Enhanced security measures**:
   - Configure transport rules for PHI detection
   - Implement encryption for sensitive communications
   - Apply special retention for health information

2. **Documentation requirements**:
   - Maintain audit logs for retention policy changes
   - Document justification for retention periods
   - Create compliance reports for regulators

3. **Training and awareness**:
   - Develop specialized training for healthcare staff
   - Create visual indicators for HIPAA data
   - Implement regular compliance reviews

### ISO 27001 for Print Infrastructure

For organizations seeking ISO 27001 certification:

1. **Policy documentation**:
   - Formally document retention strategy
   - Create policy exception procedures
   - Maintain retention decision logs

2. **Regular testing**:
   - Validate retention policy application
   - Test recovery from archive
   - Verify deletion mechanisms

3. **Continuous improvement**:
   - Regularly review retention effectiveness
   - Update policies based on compliance requirements
   - Maintain audit trail of policy changes

## Decision Tree for Retention Policy Configuration

```
START: Retention Policy Need Identified
├── What is the primary goal?
│   ├── Compliance/Legal Requirements → Identify specific regulations:
│   │   ├── GDPR → Configure:
│   │   │     1. Right to be forgotten capabilities
│   │   │     2. Data minimization policies (auto-delete after purpose)
│   │   │     3. Audit logging for all retention actions
│   │   │     4. Implement with:
│   │   │        - Retention labels with disposition review
│   │   │        - Regular access reviews
│   │   │        - Subject request workflows
│   │   ├── HIPAA → Configure:
│   │   │     1. Minimum 6-year retention for PHI
│   │   │     2. Secure disposal mechanisms
│   │   │     3. Access controls with retention policies
│   │   │     4. Implement with:
│   │   │        - Specialized tags for health information
│   │   │        - Encryption policy integration
│   │   │        - Comprehensive audit logging
│   │   └── Industry-Specific → Configure:
│   │         1. Research specific requirements
│   │         2. Document retention periods with justification
│   │         3. Implement defensible deletion
│   │         4. Create policy based on legal guidance
│   ├── Storage Management → Assess environment:
│   │   ├── Exchange Online → Configure:
│   │   │     1. Tiered retention approach (age-based)
│   │   │     2. Auto-archive policies for older content
│   │   │     3. Targeted deletion for low-value content
│   │   │     4. Implement with:
│   │   │        - Move to archive actions for most content
│   │   │        - Delete actions for transitory content
│   │   │        - Regular storage reporting
│   │   └── On-Premises Exchange → Configure:
│   │         1. More aggressive archiving due to storage constraints
│   │         2. Database management integration
│   │         3. Backup strategy alignment
│   │         4. Implement with:
│   │            - Archive database management
│   │            - Storage monitoring integration
│   │            - Tiered storage approach
│   └── Business Process Optimization → Identify workflow needs:
│       ├── Knowledge Management → Configure:
│       │     1. Category-based retention 
│       │     2. Project lifecycle alignment
│       │     3. Collaboration-focused approaches
│       │     4. Implement with:
│       │        - Custom personal tags for projects
│       │        - Team-based policies
│       │        - Integration with information architecture
│       └── Role-Based Requirements → Configure:
│             1. Department-specific policies
│             2. Role-aligned retention
│             3. User-managed exceptions process
│             4. Implement with:
│                - Adaptive scopes for dynamic assignment
│                - Department-based tag sets
│                - Training for specialized roles
```

## Implementation Checklist

Ensure successful deployment with this comprehensive checklist:

### Planning Phase
- [ ] Document retention requirements (legal, business, regulatory)
- [ ] Map requirements to retention periods and actions
- [ ] Identify user populations and specialized needs
- [ ] Design tag and policy structure
- [ ] Create communication and training plan
- [ ] Define success metrics

### Development Phase
- [ ] Create retention tags in test environment
- [ ] Configure retention policies
- [ ] Test policy application and processing
- [ ] Verify MFA functionality
- [ ] Develop automated assignment scripts
- [ ] Create user documentation

### Deployment Phase
- [ ] Communicate changes to users
- [ ] Conduct training sessions
- [ ] Deploy policies to pilot group
- [ ] Validate pilot results
- [ ] Adjust configuration as needed
- [ ] Deploy to full organization

### Maintenance Phase
- [ ] Monitor policy effectiveness
- [ ] Generate compliance reports
- [ ] Address user feedback
- [ ] Perform regular policy reviews
- [ ] Update for new compliance requirements
- [ ] Document ongoing decisions

## References and Resources

### Microsoft Documentation

1. **Retention Policies in Exchange Online**: [Microsoft Learn Documentation](https://learn.microsoft.com/en-us/exchange/security-and-compliance/messaging-records-management/retention-policies)

2. **Microsoft Purview Retention Overview**: [Microsoft Learn Documentation](https://learn.microsoft.com/en-us/purview/retention)

3. **PowerShell Commands for Retention**: [Microsoft Learn Documentation](https://learn.microsoft.com/en-us/powershell/module/exchange/?view=exchange-ps#policy-and-compliance)

### Community Resources

1. **Microsoft Tech Community**: [Information Protection & Governance Forum](https://techcommunity.microsoft.com/t5/security-compliance-and-identity/bd-p/SecurityComplianceIdentityOverview)

2. **Exchange Team Blog**: [Exchange Team Blog](https://techcommunity.microsoft.com/t5/exchange-team-blog/bg-p/Exchange)

3. **Microsoft 365 Community**: [Microsoft 365 Technical Community](https://techcommunity.microsoft.com/t5/microsoft-365/ct-p/microsoft365)

### Training Materials

1. **Microsoft Learn Path**: [Manage Information Protection and Governance in Microsoft 365](https://learn.microsoft.com/en-us/training/paths/manage-information-protection-governance-microsoft-365/)

2. **Video Tutorials**: [Microsoft Mechanics YouTube Channel](https://www.youtube.com/user/OfficeGarageSeries)

3. **Interactive Guides**: [Microsoft 365 Interactive Guides](https://adoption.microsoft.com/files/)

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2022-03-15 | Compliance Team | Initial documentation |
| 1.1 | 2022-08-22 | Exchange Admin | Added PowerShell examples |
| 1.2 | 2023-01-17 | Security Team | Enhanced compliance sections |
| 1.3 | 2023-06-05 | Training Dept | Added user experience section |
| 2.0 | 2023-11-20 | Compliance Team | Major update for Microsoft Purview integration |
| 2.1 | 2024-02-15 | Legal Department | Updated regulatory requirements |
