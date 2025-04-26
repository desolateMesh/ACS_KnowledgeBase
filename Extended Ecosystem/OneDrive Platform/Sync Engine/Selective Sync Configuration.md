# Selective Sync Configuration for OneDrive

## Overview

Selective Sync is a core feature of the OneDrive sync engine that allows users and administrators to choose specific folders for synchronization while excluding others. This capability optimizes storage usage, improves performance, and enhances the user experience by providing granular control over which content is synchronized to each device. This document provides comprehensive guidance on implementing, managing, and troubleshooting Selective Sync for OneDrive in enterprise environments.

## Core Concepts

### Selective Sync vs. Files On-Demand

| Feature | Selective Sync | Files On-Demand |
|---------|----------------|-----------------|
| **Functionality** | Completely excludes selected folders from downloading | Downloads placeholder files for all content |
| **Local Storage** | Selected content only | Placeholders for all files, content downloaded on access |
| **Offline Access** | Available for synced folders only | Available for downloaded files only |
| **Visibility** | Excluded folders not visible in File Explorer | All files visible with online/offline status icons |
| **Implementation** | Per-device configuration | Tenant or device-wide setting |
| **Best Use Case** | Devices with severe storage constraints | General usage with occasional storage optimization |

### Key Benefits

- **Storage Optimization**: Only sync essential folders to devices with limited storage
- **Bandwidth Conservation**: Reduce network usage by excluding large, non-essential folders
- **Performance Improvement**: Faster initial sync and improved sync reliability
- **Device-Specific Customization**: Configure different sync settings for different devices
- **Simplified User Experience**: Hide irrelevant content on specific devices

## Implementation Methods

### Method 1: User-Controlled Configuration

1. **User Interface Steps**:
   - Right-click the OneDrive icon in the system tray
   - Select "Settings" > "Account" tab
   - Click "Choose folders"
   - Uncheck folders to exclude from sync
   - Click "OK" to apply changes

2. **User Experience**:
   - Simple checkbox interface for folder selection
   - Changes apply after confirmation
   - Unselected folders are removed from local storage
   - Settings are per-device and per-account

### Method 2: Administrative Configuration via Group Policy

1. **Prerequisites**:
   - OneDrive sync client version 18.111.0603.0004 or later
   - Group Policy Management tools
   - Administrative templates for OneDrive ([download link](https://docs.microsoft.com/en-us/onedrive/use-group-policy))

2. **Configuration Steps**:
   - Install the OneDrive administrative template files
   - Open Group Policy Management Console
   - Create or edit an appropriate GPO
   - Navigate to: Computer Configuration → Administrative Templates → OneDrive
   - Configure the policy "Configure team site libraries to sync automatically":
     ```
     State: Enabled
     Team site libraries to sync automatically: 
     [{"libraryName":"Documents","tenantId":"1111-2222-3333-4444","siteId":"5555-6666-7777-8888","webId":"9999-aaaa-bbbb-cccc","folderId":"dddd-eeee-ffff-0000","contentClass":"1","webPath":"'sites/contoso","webTitle":"Contoso"}]
     ```
   - Also consider: "Prevent users from changing the OneDrive sync client folders location"
   - Link the GPO to appropriate OUs containing user accounts
   - Force a Group Policy update: `gpupdate /force`

3. **Documentation for JSON Structure**:
   - Each library is defined as a JSON object
   - Required parameters:
     - libraryName: Display name of the library
     - tenantId: GUID of the tenant
     - siteId: GUID of the site
     - webId: GUID of the web
     - folderId: GUID of the folder (root of library)
   - Optional parameters:
     - contentClass: Type of content (1 for team site)
     - webPath: Server-relative URL path
     - webTitle: Title of the web
     - excludedFolders: Array of folder paths to exclude from sync

### Method 3: PowerShell and Registry Configuration

For scripted or automated deployments:

```powershell
# Sample PowerShell script to configure Selective Sync
# Create registry keys for a specific account
$accountID = "1111-2222-3333-4444"  # Business account ID
$registryPath = "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\$accountID\Tenants\TenantName\ScopeSettings"

if (!(Test-Path $registryPath)) { 
    New-Item -Path $registryPath -Force | Out-Null 
}

# Exclude specific folders for sync
$foldersToExclude = @(
    "Shared Documents/Marketing Materials",
    "Shared Documents/Archive",
    "Shared Documents/Large Media Files"
)

# Create registry entries for each excluded folder
foreach ($folder in $foldersToExclude) {
    $folderHash = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($folder))
    New-ItemProperty -Path $registryPath -Name $folderHash -Value 0 -PropertyType DWORD -Force | Out-Null
}

# Restart OneDrive process to apply changes
Get-Process -Name "OneDrive" | Stop-Process -Force
Start-Process "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"
```

## Advanced Configuration Options

### Tenant-Scoped Exclusions

For organization-wide folder exclusions:

```powershell
# Configure tenant-wide exclusions using the SharePoint Online Management Shell
Connect-SPOService -Url https://contoso-admin.sharepoint.com

# Exclude specific file types from sync
Set-SPOTenant -ExcludedFileExtensions ".pst,.avi,.mp4"

# Exclude specific folder paths from sync
$exclusions = @"
[
  {
    "name": "Marketing Assets",
    "path": "/sites/marketing/Shared Documents/Assets"
  },
  {
    "name": "Historical Archives",
    "path": "/sites/teams/Shared Documents/Archives"
  }
]
"@

Set-SPOTenant -ExcludedFolderPaths $exclusions
```

### Automatic Library Mapping

To automatically map specific libraries on sync client installation:

```powershell
# Registry configuration for automatic library mapping
$registryPath = "HKLM:\SOFTWARE\Policies\Microsoft\OneDrive\TenantAutoMount"

if (!(Test-Path $registryPath)) {
    New-Item -Path $registryPath -Force | Out-Null
}

$libraryMapping = @"
[
  {
    "libraryName": "Documents",
    "tenantId": "1111-2222-3333-4444",
    "siteId": "5555-6666-7777-8888",
    "webId": "9999-aaaa-bbbb-cccc",
    "folderId": "dddd-eeee-ffff-0000",
    "exclusions": [
      "Marketing/Videos",
      "Archive/2020"
    ]
  }
]
"@

New-ItemProperty -Path $registryPath -Name "LibraryMappings" -Value $libraryMapping -PropertyType String -Force | Out-Null
```

### Library-Specific Settings

Configure sync behavior for specific libraries:

```powershell
# Configure sync behavior for specific libraries
$librarySettings = @"
[
  {
    "libraryName": "Engineering Documents",
    "tenantId": "1111-2222-3333-4444",
    "siteId": "5555-6666-7777-8888",
    "webId": "9999-aaaa-bbbb-cccc",
    "folderId": "dddd-eeee-ffff-0000",
    "syncBehavior": "PreferOnline",
    "exclusions": [
      "Historical Data",
      "Large CAD Files"
    ]
  }
]
"@

Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\OneDrive" -Name "LibrarySettings" -Value $librarySettings -Type String
```

## Deployment Planning

### Assessment Phase

1. **Content Inventory**:
   - Audit existing OneDrive and SharePoint libraries
   - Identify folder structure and organization
   - Map content types to departments/teams
   - Determine size distribution of folders and files

2. **User Needs Analysis**:
   - Survey user groups about sync requirements
   - Identify device-specific constraints (e.g., field devices vs. office workstations)
   - Document role-based access patterns

3. **Technical Limitations Consideration**:
   - Maximum of 300,000 files can be synced per user
   - Individual files cannot exceed 250GB
   - Path length limitation of 260 characters (Windows)
   - Sync client version compatibility (minimum version 17.3.6943.0625)

### Implementation Strategy

1. **Pilot Deployment**:
   - Select representative user group
   - Define initial selective sync settings
   - Collect feedback and usage statistics
   - Refine configuration based on pilot results

2. **Rollout Phases**:
   - Phase 1: IT and power users
   - Phase 2: Department-by-department rollout
   - Phase 3: Organization-wide deployment
   - Allow 1-2 weeks between phases for evaluation

3. **User Communication Plan**:
   - Pre-implementation announcements (2 weeks prior)
   - Day-of instruction emails
   - Post-implementation support communications
   - Quick reference guides for common tasks

## Monitoring and Management

### Performance Monitoring

1. **Sync Health Metrics**:
   - Sync success rate
   - Average sync completion time
   - Items in queue count
   - Errors per device/user

2. **PowerShell Monitoring Script**:
   ```powershell
   function Get-OneDriveSyncStatus {
       param (
           [string]$ComputerName = $env:COMPUTERNAME,
           [string]$Username = $env:USERNAME
       )
       
       $syncEngineEventLog = Get-WinEvent -ComputerName $ComputerName -LogName "Microsoft-OneDrive/SyncEngine/Operational" -MaxEvents 100 | 
           Where-Object { $_.Message -like "*Selective sync configuration changed*" }
       
       $syncStatus = @{
           LastConfigChange = $syncEngineEventLog | Select-Object -First 1 -ExpandProperty TimeCreated
           ExcludedFolderCount = ($syncEngineEventLog | Where-Object { $_.Message -like "*excluded*" }).Count
           IncludedFolderCount = ($syncEngineEventLog | Where-Object { $_.Message -like "*included*" }).Count
           ErrorCount = ($syncEngineEventLog | Where-Object { $_.LevelDisplayName -eq "Error" }).Count
       }
       
       return $syncStatus
   }
   ```

3. **Central Reporting**:
   - Aggregate sync client logs to central location
   - Create dashboard for sync status visibility
   - Set up alerts for sync failures or configuration changes

### Management Tools

1. **Microsoft 365 Admin Center**:
   - OneDrive sync status reports
   - Storage usage monitoring
   - User account management

2. **Microsoft Endpoint Manager**:
   - Deploy and manage sync client configuration
   - Monitor client health
   - Remediate sync issues remotely

3. **PowerShell Administration**:
   ```powershell
   # Get selective sync configuration for current user
   function Get-SelectiveSyncFolders {
       $business1Path = "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1"
       
       if (Test-Path $business1Path) {
           $scopeID = Get-ItemProperty -Path $business1Path -Name "ScopeIdOfCurrentNamespace" -ErrorAction SilentlyContinue
           
           if ($scopeID) {
               $scopePath = "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1\Tenants\$($scopeID.ScopeIdOfCurrentNamespace)\ScopeSettings"
               
               if (Test-Path $scopePath) {
                   $settings = Get-ItemProperty -Path $scopePath
                   
                   $excludedFolders = @()
                   foreach ($prop in $settings.PSObject.Properties) {
                       if ($prop.Name -notmatch "PS" -and $prop.Value -eq 0) {
                           try {
                               $folderPath = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($prop.Name))
                               $excludedFolders += $folderPath
                           } catch {
                               # Not a Base64 encoded folder path
                           }
                       }
                   }
                   
                   return $excludedFolders
               }
           }
       }
       
       return "No selective sync configuration found"
   }
   ```

## Troubleshooting Common Issues

### Issue: Folders Reappearing After Exclusion

**Possible Causes and Solutions**:
- **Multiple OneDrive Accounts**: 
  - Verify correct account is being configured
  - Check sign-in status: `Get-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts" | Format-List`

- **Policy Conflict**:
  - Check for conflicting GPO settings
  - Review mandatory sync folders in admin center
  - Run `gpresult /h report.html` to identify policy conflicts

- **Sync Engine Issues**:
  - Reset OneDrive sync engine: 
    ```
    %localappdata%\Microsoft\OneDrive\onedrive.exe /reset
    ```
  - Wait 2-3 minutes, then restart OneDrive

### Issue: Unable to Configure Selective Sync

**Possible Causes and Solutions**:
- **Insufficient Permissions**:
  - Verify user has appropriate SharePoint permissions
  - Check for tenant restrictions:
    ```powershell
    Connect-SPOService -Url https://contoso-admin.sharepoint.com
    Get-SPOTenant | Select-Object DisableUserSelectiveSync
    ```

- **Client Version Issues**:
  - Verify OneDrive client version is 17.3.6943.0625 or later
  - Force client update:
    ```
    %localappdata%\Microsoft\OneDrive\onedrive.exe /update
    ```

- **Registry Corruption**:
  - Backup and delete account registry keys:
    ```powershell
    Remove-Item -Path "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1\Tenants" -Recurse -Force
    ```
  - Restart OneDrive to recreate registry structure

### Issue: Excessive Storage Usage Despite Selective Sync

**Possible Causes and Solutions**:
- **Orphaned Sync Files**:
  - Check for orphaned files in OneDrive cache:
    ```
    %localappdata%\Microsoft\OneDrive\onedrive.exe /cleanup
    ```

- **Hidden Folders**:
  - Check for hidden folders still syncing:
    ```powershell
    Get-ChildItem -Path "$env:USERPROFILE\OneDrive - Company" -Hidden -Recurse | Measure-Object -Property Length -Sum
    ```

- **Files On-Demand Not Enabled**:
  - Verify Files On-Demand is enabled:
    ```powershell
    Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\OneDrive" -Name "FilesOnDemandEnabled" -ErrorAction SilentlyContinue
    ```
  - Enable if needed:
    ```powershell
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\OneDrive" -Name "FilesOnDemandEnabled" -Value 1 -Type DWORD
    ```

## Best Practices

### Folder Organization Strategies

1. **Top-Level Organization**:
   - Limit first-level folders to 10-15 maximum
   - Use descriptive, consistent naming conventions
   - Group related content into logical collections

2. **Subfolder Structure**:
   - Limit folder hierarchy to 3-4 levels maximum
   - Keep filenames under 128 characters
   - Avoid special characters in folder names

3. **Content Segregation**:
   - Separate frequently accessed files from archive content
   - Isolate large media files in dedicated folders
   - Group content by function rather than by project or date

### Optimization Recommendations

1. **Performance Optimization**:
   - Exclude folders containing more than 100,000 small files
   - Separate large media files (>1GB) into dedicated libraries
   - Use SharePoint document sets for complex file collections

2. **Storage Optimization**:
   - Implement archive processes for old content
   - Set up retention policies for automatic cleanup
   - Establish clear guidelines for appropriate OneDrive usage

3. **User Experience Enhancement**:
   - Create default selective sync templates for different roles
   - Provide self-service configuration guides
   - Implement automated notifications for storage thresholds

## Enterprise Integration

### Integration with SharePoint and Teams

1. **SharePoint Sync Considerations**:
   - Use the same selective sync principles for SharePoint libraries
   - Configure specific folders for Teams channel syncing
   - Implement consistent folder structures across platforms

2. **Cross-Platform Management**:
   ```powershell
   # Script to standardize selective sync across platforms
   function Set-StandardSelectiveSync {
       param (
           [string]$UserPrincipalName,
           [string]$TemplateName = "Standard"
       )
       
       # Templates defined as hashtables
       $templates = @{
           "Standard" = @(
               "Archive",
               "Large Media",
               "Historical Projects"
           );
           "Field" = @(
               "Archive",
               "Large Media",
               "Historical Projects",
               "Reference Materials",
               "Training Videos"
           );
           "Executive" = @(
               "Archive"
           )
       }
       
       # Get selected template
       $excludeFolders = $templates[$TemplateName]
       
       # Apply to OneDrive
       Apply-SelectiveSyncTemplate -UserPrincipalName $UserPrincipalName -ExcludeFolders $excludeFolders -Platform "OneDrive"
       
       # Apply to SharePoint libraries
       Apply-SelectiveSyncTemplate -UserPrincipalName $UserPrincipalName -ExcludeFolders $excludeFolders -Platform "SharePoint"
   }
   ```

### Identity and Access Management

1. **Conditional Access**:
   - Implement device-specific sync policies
   - Restrict sync on unmanaged devices
   - Configure location-based sync restrictions

2. **Security Considerations**:
   - Implement data loss prevention for synced content
   - Configure sensitivity labels for automatic protection
   - Set up alerts for unusual sync patterns

## Advanced Scenarios

### Multi-Tenant Configuration

For organizations with multiple Microsoft 365 tenants:

```powershell
# Configure selective sync across multiple tenants
$tenants = @(
    @{
        Name = "Primary";
        TenantId = "1111-2222-3333-4444";
        ExcludeFolders = @("Archive", "Marketing Assets")
    },
    @{
        Name = "Subsidiary";
        TenantId = "5555-6666-7777-8888";
        ExcludeFolders = @("Historical", "Videos", "Large Files")
    }
)

foreach ($tenant in $tenants) {
    $regPath = "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1\Tenants\$($tenant.TenantId)\ScopeSettings"
    
    if (!(Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    
    foreach ($folder in $tenant.ExcludeFolders) {
        $folderHash = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($folder))
        New-ItemProperty -Path $regPath -Name $folderHash -Value 0 -PropertyType DWORD -Force | Out-Null
    }
}
```

### Hybrid Cloud Configurations

For organizations with both cloud and on-premises content:

1. **OneDrive-SharePoint Server Integration**:
   - Configure hybrid SharePoint environments
   - Implement consistent selective sync across environments
   - Use migration tools to consolidate content where appropriate

2. **Hybrid Governance Considerations**:
   - Develop unified content policies across environments
   - Implement consistent retention and lifecycle management
   - Establish clear boundaries for content location decisions

## References and Resources

- [Official Microsoft Selective Sync Documentation](https://docs.microsoft.com/en-us/onedrive/use-selective-sync)
- [OneDrive Administrative Template Files](https://docs.microsoft.com/en-us/onedrive/use-group-policy)
- [OneDrive Sync Client Release Notes](https://support.office.com/en-us/article/new-onedrive-sync-client-release-notes-845dcf18-f921-435e-bf28-4e24b95e5fc0)
- [OneDrive Technical Community](https://techcommunity.microsoft.com/t5/OneDrive-for-Business/bd-p/OneDriveforBusiness)

---

*Last Updated: April 2025*
*Author: ACS Knowledge Base Team*