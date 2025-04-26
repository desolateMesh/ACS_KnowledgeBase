# Trusted Locations Configuration

## Overview

Trusted Locations in Microsoft Office provide a mechanism to designate specific directories as safe sources for opening files without security prompts. This document outlines enterprise best practices for configuring, managing, and securing Trusted Locations across an organization to maintain a balance between security and productivity.

## Key Concepts

### What Are Trusted Locations?

Trusted Locations are directories that Microsoft Office applications consider secure. When a user opens a file from a Trusted Location:

- Macros run without security warnings
- ActiveX controls operate without restrictions
- File validation checks may be bypassed
- External content can be loaded automatically

This powerful exemption from security controls makes proper management of Trusted Locations critical to maintaining organizational security.

## Deployment Architecture

### Centralized Management Model

```
┌─────────────────────────┐
│                         │
│  Group Policy Objects   │◄────┐
│                         │     │
└─────────────────────────┘     │
            │                   │
            ▼                   │
┌─────────────────────────┐     │
│                         │     │
│  Trusted Locations      │     │
│  Central Registry       │     │
│                         │     │
└─────────────────────────┘     │
            │                   │
            ▼                   │
┌─────────────────────────┐     │
│                         │     │
│  End-User Workstations  │─────┘
│                         │
└─────────────────────────┘
```

### Technical Components

1. **Group Policy Objects (GPOs)**
   - Configure Office Trust Center settings
   - Disable user-defined Trusted Locations
   - Push approved Trusted Locations to clients

2. **Secure File Shares**
   - Centralized network locations with appropriate ACLs
   - Regular security audits and monitoring
   - Version control integration (optional)

3. **Validation and Monitoring**
   - File integrity monitoring
   - Access logging and auditing
   - Regular security scanning

## Implementation Guide

### Prerequisites

- Domain-joined environment with Active Directory
- Administrative access to Group Policy Management
- Microsoft Office 2016 or later
- Secure file shares with proper access controls

### Step 1: Define Trusted Location Strategy

Before implementing Trusted Locations, establish organizational policies covering:

1. **Approval Process**
   - Who can request new Trusted Locations
   - Review and approval workflow
   - Documentation requirements

2. **Location Types**
   - Network vs. local locations
   - Department-specific vs. organization-wide
   - Template locations vs. working document locations

3. **Security Standards**
   - Minimum access control requirements
   - Monitoring and auditing requirements
   - Periodic review frequency

### Step 2: Create Secure File Shares

For each approved Trusted Location, establish properly secured file shares:

```powershell
# Example: PowerShell script to create a secure file share for templates
# Run with administrative privileges

# 1. Create the directory
$SharePath = "E:\OfficeTemplates\Finance"
New-Item -Path $SharePath -ItemType Directory -Force

# 2. Set NTFS permissions
$Acl = Get-Acl -Path $SharePath
$Acl.SetAccessRuleProtection($true, $false) # Disable inheritance

# Add specific permissions
$ReadExecuteRule = New-Object System.Security.AccessControl.FileSystemAccessRule("DOMAIN\Finance Users", "ReadAndExecute", "ContainerInherit, ObjectInherit", "None", "Allow")
$ModifyRule = New-Object System.Security.AccessControl.FileSystemAccessRule("DOMAIN\Finance Managers", "Modify", "ContainerInherit, ObjectInherit", "None", "Allow")
$FullControlRule = New-Object System.Security.AccessControl.FileSystemAccessRule("DOMAIN\IT Administrators", "FullControl", "ContainerInherit, ObjectInherit", "None", "Allow")

$Acl.AddAccessRule($ReadExecuteRule)
$Acl.AddAccessRule($ModifyRule)
$Acl.AddAccessRule($FullControlRule)
Set-Acl -Path $SharePath -AclObject $Acl

# 3. Create the share
New-SmbShare -Name "FinanceTemplates" -Path $SharePath -Description "Finance Department Templates" -FullAccess "DOMAIN\IT Administrators" -ChangeAccess "DOMAIN\Finance Managers" -ReadAccess "DOMAIN\Finance Users"

# 4. Enable access-based enumeration (users only see what they have access to)
Set-SmbShare -Name "FinanceTemplates" -FolderEnumerationMode AccessBased
```

### Step 3: Configure Group Policy

Create and configure GPOs to manage Trusted Locations across the organization:

1. **Open Group Policy Management Console**
   - Create a new GPO named "Office Trusted Locations Policy"
   - Edit the new GPO

2. **Navigate to Office Trust Center Settings**
   - User Configuration > Administrative Templates > Microsoft Office 20XX > Security Settings > Trust Center

3. **Configure Key Settings**

   ```
   a. Disable all Trusted Locations
      Path: Trust Center > Trusted Locations
      Setting: Disable all Trusted Locations
      Value: Disabled (to allow Trusted Locations)
   
   b. Block user-defined locations
      Path: Trust Center > Trusted Locations
      Setting: Allow Trusted Locations on the network
      Value: Enabled (to allow network Trusted Locations)
   
   c. Disallow users from adding locations
      Path: Trust Center > Trusted Locations
      Setting: Disallow users from adding/changing locations
      Value: Enabled
   ```

4. **Add Approved Trusted Locations**

   For each application (Word, Excel, PowerPoint, etc.):
   
   ```
   Path: Trust Center > Trusted Locations > [Application Name]
   Setting: [Application Name] - Add Trusted Location #1, #2, etc.
   
   Values for each location:
   - Path: \\server\share\path
   - Description: [Purpose of this Trusted Location]
   - Allow Subfolders: Enabled (if appropriate)
   - Date (Optional): [Date this location was approved]
   ```

5. **Configure Additional Security Settings**

   ```
   Path: Trust Center > Trusted Documents
   Setting: Disable Trusted Documents
   Value: Enabled (to prevent automatic trusting of documents)
   
   Path: Trust Center > Macro Settings
   Setting: VBA Macro Notification Settings 
   Value: Disable all macros except digitally signed macros
   ```

6. **Link GPO to Appropriate OUs**
   - Link to organizational units containing user accounts
   - Set appropriate WMI filters if needed (e.g., by Office version)

### Step 4: Testing and Verification

Before full deployment, test the configuration:

1. **Lab Testing**
   - Verify GPO application with `gpresult /r`
   - Test file access from Trusted Locations
   - Verify security restrictions are enforced

2. **Pilot Deployment**
   - Select representative user group
   - Deploy GPO to pilot OU
   - Collect feedback and monitor for issues

3. **Validation Scripts**

```powershell
# Validation Script: Verify Trusted Location Configuration
# Save as Check-TrustedLocations.ps1

param (
    [Parameter(Mandatory=$true)]
    [string]$UserName,
    
    [Parameter(Mandatory=$false)]
    [string]$Application = "Excel"
)

function Get-OfficeVersion {
    $officeVersions = @(
        "16.0", # Office 2016, 2019, 365
        "15.0", # Office 2013
        "14.0"  # Office 2010
    )
    
    foreach ($version in $officeVersions) {
        $keyPath = "HKCU:\Software\Microsoft\Office\$version\$Application"
        if (Test-Path $keyPath) {
            return $version
        }
    }
    
    return $null
}

function Get-TrustedLocations {
    param (
        [string]$OfficeVersion,
        [string]$Application
    )
    
    $locations = @()
    $trustCenterPath = "HKCU:\Software\Microsoft\Office\$OfficeVersion\$Application\Security\Trusted Locations"
    
    if (Test-Path $trustCenterPath) {
        $locationKeys = Get-ChildItem -Path $trustCenterPath
        
        foreach ($key in $locationKeys) {
            $locationPath = $key.GetValue("Path")
            $description = $key.GetValue("Description")
            $allowSubfolders = $key.GetValue("AllowSubfolders")
            $date = $key.GetValue("Date")
            
            if ($locationPath) {
                $locations += [PSCustomObject]@{
                    Path = $locationPath
                    Description = $description
                    AllowSubfolders = $allowSubfolders
                    Date = $date
                    RegistryKey = $key.Name
                }
            }
        }
    }
    
    return $locations
}

# Main execution
$officeVersion = Get-OfficeVersion
if (-not $officeVersion) {
    Write-Error "Could not detect $Application installation for user $UserName"
    exit 1
}

Write-Output "Checking $Application Trusted Locations for user $UserName (Office version $officeVersion)..."

$trustedLocations = Get-TrustedLocations -OfficeVersion $officeVersion -Application $Application

if ($trustedLocations.Count -eq 0) {
    Write-Output "No Trusted Locations configured for $Application."
} else {
    Write-Output "$($trustedLocations.Count) Trusted Locations found:"
    $trustedLocations | Format-Table -Property Path, Description, AllowSubfolders, Date -AutoSize
}

# Check if user can modify Trusted Locations
$disallowUserChanges = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Office\$officeVersion\$Application\Security\Trusted Locations" -Name "DisallowUserChanges" -ErrorAction SilentlyContinue).DisallowUserChanges

if ($disallowUserChanges -eq 1) {
    Write-Output "User is prevented from adding/changing Trusted Locations (DisallowUserChanges = 1)"
} else {
    Write-Warning "User is allowed to add/change Trusted Locations (DisallowUserChanges = 0 or not set)"
}
```

### Step 5: Full Deployment

1. **Rollout Schedule**
   - Deploy to departments in phases
   - Communicate changes to end users
   - Provide help desk training

2. **Document Configuration**
   - Record all approved Trusted Locations
   - Document security controls and access rights
   - Create change management process

3. **Ongoing Management**
   - Establish regular review cycle
   - Document request and approval process
   - Implement monitoring and alerting

## Security Considerations

### Risk Assessment Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Unauthorized content added to Trusted Location | High | Medium | Access controls, file integrity monitoring |
| Excessive permissions on Trusted Locations | High | Medium | Regular permission audits, least privilege principle |
| Too many Trusted Locations | Medium | High | Consolidation of locations, strict approval process |
| Network Trusted Locations unavailable | Medium | Low | Local caching, redundant network paths |
| Malicious content exploiting Trust | Critical | Low | Anti-malware scanning, content validation |

### Best Practices

1. **Minimize Trusted Locations**
   - Consolidate where possible
   - Use application-specific locations
   - Avoid user-specific Trusted Locations

2. **Secure Access Controls**
   - Apply least privilege principle
   - Separate read and write permissions
   - Implement change approval workflows
   - Use security groups for access management

3. **Monitor and Audit**
   - Enable file access auditing
   - Set up alerts for suspicious activities
   - Regularly scan Trusted Locations for malware
   - Review modified files periodically

4. **Use Additional Controls**
   - Deploy application whitelisting
   - Implement just-in-time access for content authors
   - Consider Privileged Access Workstations for content creation

## Troubleshooting

### Common Issues

#### Files Still Prompt for Macro Enablement
- **Cause**: Path mismatches, UNC vs. mapped drives, case sensitivity
- **Solution**: Verify the exact path format in Group Policy vs. how users access the location

#### Document Trust Not Persisting
- **Cause**: Trusted Documents feature disabled or not working
- **Solution**: Check Trusted Documents settings, verify user has write permissions to the Trusted Documents store

#### Access Denied to Trusted Locations
- **Cause**: Permission issues, networking problems
- **Solution**: Verify network connectivity, check effective user permissions with Access Enum or similar tool

### Advanced Troubleshooting

```powershell
# Registry examination for trust center settings
# Save as Examine-TrustCenterSettings.ps1

param (
    [Parameter(Mandatory=$false)]
    [string]$Application = "Excel",
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "16.0"
)

function Get-RegistryValues {
    param (
        [string]$Path
    )
    
    if (-not (Test-Path $Path)) {
        Write-Warning "Path does not exist: $Path"
        return $null
    }
    
    $values = Get-ItemProperty -Path $Path
    $properties = $values.PSObject.Properties | Where-Object { 
        $_.Name -ne "PSPath" -and
        $_.Name -ne "PSParentPath" -and
        $_.Name -ne "PSChildName" -and
        $_.Name -ne "PSDrive" -and
        $_.Name -ne "PSProvider"
    }
    
    $result = @{}
    foreach ($prop in $properties) {
        $result[$prop.Name] = $prop.Value
    }
    
    return $result
}

# Check main Trust Center settings
$trustCenterPath = "HKCU:\Software\Microsoft\Office\$Version\$Application\Security\Trusted Locations"
Write-Output "Trust Center main settings:"
Get-RegistryValues -Path $trustCenterPath | Format-Table -AutoSize

# Check Group Policy settings
$gpoPath = "HKCU:\Software\Policies\Microsoft\Office\$Version\$Application\Security\Trusted Locations"
Write-Output "`nGroup Policy settings:"
if (Test-Path $gpoPath) {
    Get-RegistryValues -Path $gpoPath | Format-Table -AutoSize
} else {
    Write-Output "No Group Policy settings found at: $gpoPath"
}

# Check specific location settings
$locationsPath = Get-ChildItem -Path $trustCenterPath -ErrorAction SilentlyContinue
if ($locationsPath) {
    Write-Output "`nConfigured Trusted Locations:"
    foreach ($location in $locationsPath) {
        Write-Output "`nLocation: $($location.PSChildName)"
        Get-RegistryValues -Path $location.PSPath | Format-Table -AutoSize
    }
} else {
    Write-Output "`nNo configured Trusted Locations found."
}

# Test UNC path resolution for network locations
$networkLocations = Get-ChildItem -Path $trustCenterPath -ErrorAction SilentlyContinue | 
    Where-Object { $_.GetValue("Path") -like "\\*" }

if ($networkLocations) {
    Write-Output "`nTesting network path resolution for Trusted Locations:"
    foreach ($location in $networkLocations) {
        $path = $location.GetValue("Path")
        Write-Output "Testing: $path"
        if (Test-Path -Path $path -ErrorAction SilentlyContinue) {
            Write-Output "  ✓ Path accessible"
        } else {
            Write-Warning "  ✗ Path not accessible"
        }
    }
}
```

## Administration and Management

### Change Management Process

1. **Request Submission**
   - Department submits Trusted Location request
   - Business justification required
   - Security assessment completed

2. **Security Review**
   - IT Security evaluates risk
   - Alternatives considered
   - Recommends approval or denial

3. **Implementation**
   - GPO updated with new location
   - Documentation updated
   - Notification sent to requestor

### Audit and Compliance

Regular audits should include:

- Verification of GPO settings
- Permission reviews on Trusted Locations
- Content scanning for suspicious files
- User access pattern analysis
- Compliance with organizational policies

### Documentation Template

```markdown
# Trusted Location Documentation

## Location Details
- **Path**: \\server\share\department\templates
- **Description**: Finance Department Approved Templates
- **Date Added**: YYYY-MM-DD
- **Requested By**: [Name/Department]
- **Approved By**: [Name/Role]
- **GPO Name**: Office-TrustedLocations-Finance

## Security Controls
- **Read Access**: Finance-Users (Domain Group)
- **Write Access**: Finance-TemplateAdmins (Domain Group)
- **Full Access**: IT-Administrators (Domain Group)
- **Auditing**: Enabled for successful and failed access
- **Anti-malware**: Real-time scanning enabled
- **File Types**: Restricted to .dotx, .xltx, .potx

## Review Information
- **Last Review Date**: YYYY-MM-DD
- **Reviewed By**: [Name/Role]
- **Next Review Date**: YYYY-MM-DD
- **Compliance Status**: Compliant/Non-compliant
- **Remediation Required**: Yes/No

## Notes
- [Additional context or special considerations]
```

## References

- [Microsoft Documentation: Plan Trusted Locations](https://docs.microsoft.com/en-us/DeployOffice/security/plan-trusted-locations)
- [NIST SP 800-53: Security Controls](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)
- [CIS Microsoft Office Benchmark](https://www.cisecurity.org/benchmark/microsoft_office/)
- [MITRE ATT&CK: Trusted Developer Utilities Proxy Execution](https://attack.mitre.org/techniques/T1127/)

## Appendix

### Group Policy Settings Reference

The following table provides a comprehensive list of Group Policy settings related to Trusted Locations:

| Setting Path | Setting Name | Recommended Value | Notes |
|--------------|--------------|-------------------|-------|
| Trust Center\Trusted Locations | AllowNetworkLocations | Enabled | Required for network shares |
| Trust Center\Trusted Locations | DisallowUserAddition | Enabled | Prevent user-defined locations |
| Trust Center\Trusted Locations | RequireFullPath | Enabled | Ensures specific path targeting |
| Word\Trust Center\Trusted Locations | Location1Path | \\\\server\\share\\templates | Organization templates |
| Word\Trust Center\Trusted Locations | Location1Description | Corporate Templates | Informational |
| Word\Trust Center\Trusted Locations | Location1AllowSubfolders | Enabled | If needed |
| Excel\Trust Center\Trusted Locations | Location1Path | \\\\server\\share\\finance | Finance templates |
| Excel\Trust Center\Trusted Locations | Location1Description | Finance Templates | Informational |
| PowerPoint\Trust Center\Trusted Locations | Location1Path | \\\\server\\share\\presentations | Presentation templates |
| Trust Center\Trusted Documents | DisableTrustedDocuments | Enabled | Prevents auto-trust |
| Trust Center\Macro Settings | VBAWarnings | 2 | Disable unsigned macros |

### Active Directory Security Group Structure

```
Enterprise Office Security Groups
├── OfficeTrustedLocation-Managers
│   ├── Finance-TemplateAdmins
│   ├── HR-TemplateAdmins
│   ├── Marketing-TemplateAdmins
│   └── Operations-TemplateAdmins
├── OfficeTrustedLocation-Users
│   ├── Finance-Users
│   ├── HR-Users
│   ├── Marketing-Users
│   └── Operations-Users
└── OfficeTrustedLocation-Auditors
    └── IT-SecurityTeam
```

### PowerShell Script: Export Trusted Locations

```powershell
# Export-TrustedLocations.ps1
# Script to export all Trusted Locations from a workstation for documentation

param (
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = "$env:USERPROFILE\Desktop\TrustedLocations.csv"
)

$officeApps = @("Word", "Excel", "PowerPoint", "Access", "Outlook", "Publisher", "Visio", "Project")
$officeVersions = @("16.0", "15.0", "14.0") # Office 2016/2019/365, 2013, 2010

$results = @()

foreach ($version in $officeVersions) {
    foreach ($app in $officeApps) {
        $basePath = "HKCU:\Software\Microsoft\Office\$version\$app\Security\Trusted Locations"
        $gpoPath = "HKCU:\Software\Policies\Microsoft\Office\$version\$app\Security\Trusted Locations"
        
        # Check for policy-defined locations
        if (Test-Path $gpoPath) {
            $policySettings = Get-ItemProperty -Path $gpoPath -ErrorAction SilentlyContinue
            
            # Extract general settings
            $allowNetworkLocations = $policySettings.AllowNetworkLocations
            $disallowUserAddition = $policySettings.DisallowUserAddition
            
            # Get individual locations
            $locationKeys = Get-ChildItem -Path $gpoPath -ErrorAction SilentlyContinue | 
                Where-Object { $_.PSChildName -match "^Location\d+$" }
            
            foreach ($key in $locationKeys) {
                $locationProps = Get-ItemProperty -Path $key.PSPath
                
                $locationInfo = [PSCustomObject]@{
                    Application = $app
                    Version = $version
                    Source = "Group Policy"
                    Path = $locationProps.Path
                    Description = $locationProps.Description
                    AllowSubfolders = $locationProps.AllowSubfolders
                    Date = $locationProps.Date
                }
                
                $results += $locationInfo
            }
        }
        
        # Check for user-defined locations
        if (Test-Path $basePath) {
            $locationKeys = Get-ChildItem -Path $basePath -ErrorAction SilentlyContinue | 
                Where-Object { $_.PSChildName -notmatch "^Location\d+$" }
            
            foreach ($key in $locationKeys) {
                $locationProps = Get-ItemProperty -Path $key.PSPath
                
                if ($locationProps.Path) {
                    $locationInfo = [PSCustomObject]@{
                        Application = $app
                        Version = $version
                        Source = "User Defined"
                        Path = $locationProps.Path
                        Description = $locationProps.Description
                        AllowSubfolders = $locationProps.AllowSubfolders
                        Date = $locationProps.Date
                    }
                    
                    $results += $locationInfo
                }
            }
        }
    }
}

# Export results to CSV
$results | Export-Csv -Path $OutputPath -NoTypeInformation

Write-Output "$($results.Count) Trusted Locations exported to: $OutputPath"
```

### Remediation Checklist

- [ ] Review and document all existing Trusted Locations
- [ ] Remove redundant or unnecessary locations
- [ ] Verify proper permissions on all Trusted Locations
- [ ] Implement file integrity monitoring
- [ ] Validate Group Policy settings
- [ ] Disable user-defined Trusted Locations
- [ ] Create auditing and reporting process
- [ ] Establish regular review cycles
- [ ] Configure anti-malware scanning for Trusted Locations
- [ ] Document approved Trusted Locations
- [ ] Train IT staff on Trusted Locations management
- [ ] Develop user communication plan