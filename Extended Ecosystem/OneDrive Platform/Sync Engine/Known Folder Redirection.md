# Known Folder Redirection for OneDrive

## Overview

Known Folder Redirection (KFR) is a OneDrive feature that automatically syncs the Windows Known Folders (Desktop, Documents, and Pictures) to OneDrive. This document provides comprehensive guidance on implementing, managing, and troubleshooting Known Folder Redirection for OneDrive in enterprise environments.

## Core Concepts

Known Folder Redirection leverages Windows' shell folders technology to seamlessly redirect user data to OneDrive while maintaining the familiar user experience. When enabled:

- Files in the Desktop, Documents, and Pictures folders are automatically synced to OneDrive
- Users access their files as they normally would, with no change in workflow
- Files become available across all devices signed into the same account
- Data is protected by OneDrive's cloud backup capabilities

## Business Value

Implementing Known Folder Redirection delivers significant benefits:

- **Data Protection**: Automatic backup of critical user files to the cloud
- **Device Flexibility**: Seamless access to important files across multiple devices
- **Simplified Migration**: Easier transition between devices and OS upgrades
- **Storage Optimization**: Reduced local storage requirements when used with Files On-Demand
- **Disaster Recovery**: Quick recovery of user files in case of device failure or loss
- **Cost Reduction**: Decreased reliance on traditional backup systems for endpoint devices

## Implementation Methods

### Method 1: Group Policy Deployment (Recommended for Enterprises)

1. **Prerequisites**:
   - OneDrive sync client version 18.111.0603.0004 or later
   - Group Policy Management tools
   - Administrative templates for OneDrive ([download link](https://docs.microsoft.com/en-us/onedrive/use-group-policy))

2. **Configuration Steps**:
   - Install the OneDrive administrative template files
   - Open Group Policy Management Console
   - Create or edit an appropriate GPO
   - Navigate to: Computer Configuration → Administrative Templates → OneDrive
   - Configure the following policies:

     ```
     "Silently redirect Windows known folders to OneDrive" = Enabled
     "Prevent users from redirecting their Windows known folders to their PC" = Enabled (Optional)
     "Prevent users from moving their Windows known folders to OneDrive" = Disabled
     ```

   - Link the GPO to appropriate OUs containing user accounts
   - Force a Group Policy update: `gpupdate /force`

3. **Verification**:
   - Run `gpresult /r` on client machines to verify policy application
   - Check OneDrive sync client settings for known folder status
   - Review OneDrive logs at %localappdata%\Microsoft\OneDrive\logs\

### Method 2: Tenant-Level Configuration

1. **Configuration Steps**:
   - Log in to the Microsoft 365 Admin Center
   - Navigate to: Admin centers → SharePoint → Settings → OneDrive Sync
   - In the "Redirect and move Windows known folders to OneDrive" section, select "Prompt users to move their folders"
   - Choose notification frequency and customize the message (optional)
   - Click "Save"

2. **User Experience**:
   - Users receive a notification prompting them to redirect known folders
   - They can choose to redirect all folders or select specific ones
   - Existing files are moved to OneDrive automatically

### Method 3: PowerShell Deployment

For scripted or automated deployments:

```powershell
# Sample PowerShell script to deploy Known Folder Redirection
# Create registry keys
$registryPath = "HKLM:\SOFTWARE\Policies\Microsoft\OneDrive"
if (!(Test-Path $registryPath)) { New-Item -Path $registryPath -Force | Out-Null }

# Enable silent redirection
New-ItemProperty -Path $registryPath -Name "KFMSilentOptIn" -Value "1111-2222-3333-4444" -PropertyType String -Force | Out-Null
# Replace with your tenant ID

# Prevent opt-out (optional)
New-ItemProperty -Path $registryPath -Name "KFMBlockOptOut" -Value 1 -PropertyType DWORD -Force | Out-Null

# Prevent redirection to local PC
New-ItemProperty -Path $registryPath -Name "KFMBlockOptIn" -Value 0 -PropertyType DWORD -Force | Out-Null

# Restart OneDrive process to apply changes
Get-Process -Name "OneDrive" | Stop-Process -Force
Start-Process "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe"
```

## Detailed Configuration Options

### Selective Folder Redirection

You can choose to redirect specific known folders instead of all three:

| Registry Value | Folder |
|----------------|--------|
| 1 | Documents |
| 2 | Pictures |
| 4 | Desktop |

For example, to redirect only Documents and Desktop:
```powershell
New-ItemProperty -Path $registryPath -Name "KFMSilentOptInFolders" -Value 5 -PropertyType DWORD -Force | Out-Null
# 5 = 1 (Documents) + 4 (Desktop)
```

### Advanced Group Policy Settings

| Policy Setting | Description | Recommended Value |
|----------------|-------------|-------------------|
| KFMOptInWithWizard | Shows the KFR wizard to users | Disabled |
| KFMSilentOptIn | Silently redirects without user prompt | Enabled with Tenant ID |
| KFMBlockOptOut | Prevents users from redirecting back to local folders | Enabled |
| FilesOnDemandEnabled | Enables Files On-Demand for optimized storage | Enabled |
| KFMOptInNoWizard | Prompts users without the wizard | Disabled |

## Migration Considerations

### Data Volume Planning

1. **Inventory Existing Data**:
   - Audit average known folder sizes across your organization
   - Identify outliers with exceptionally large folders
   - Calculate required OneDrive storage capacity

2. **Bandwidth Assessment**:
   - Estimate initial migration impact on network bandwidth
   - Consider implementing during off-hours for large organizations
   - Utilize throttling controls if needed:
     ```powershell
     Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" -Name "AutomaticUploadBandwidthPercentage" -Value 40 -Type DWORD
     ```

3. **Storage Limitations**:
   - Standard OneDrive accounts include 1TB of storage per user
   - Files exceeding 250GB cannot be synced
   - Maximum of 300,000 files can be synced

### User Communication Strategy

1. **Preparation Communication**:
   - Notify users before implementation with timeline and benefits
   - Provide FAQ document addressing common concerns
   - Highlight benefits of automatic backup and cross-device access

2. **Training Resources**:
   - Offer quick training sessions on OneDrive basics
   - Provide guidance on Files On-Demand functionality
   - Create reference sheets for common operations

3. **IT Support Preparation**:
   - Train help desk staff on common issues and solutions
   - Develop troubleshooting guides and escalation procedures
   - Monitor initial deployment closely

## Monitoring and Management

### Health Monitoring

1. **OneDrive Sync Status Reports**:
   ```powershell
   Get-ODStatus | Export-Csv -Path "C:\Reports\ODSyncStatus.csv" -NoTypeInformation
   ```

2. **Registry Auditing**:
   Monitor registry keys for unexpected changes:
   ```
   HKLM:\SOFTWARE\Policies\Microsoft\OneDrive
   HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1
   ```

3. **Event Log Analysis**:
   Review the following event logs for KFR issues:
   - Application Log: Source "OneDrive"
   - Microsoft-Windows-Folder Redirection: Operational Log

### Management Tools

1. **OneDrive Admin Center**:
   - View sync status across organization
   - Identify problematic clients
   - Manage storage limits and sharing settings

2. **Endpoint Manager/Intune**:
   - Deploy configuration changes
   - Monitor client compliance
   - Remediate issues remotely

3. **PowerShell Management**:
   ```powershell
   # Check if KFR is enabled
   function Check-KFRStatus {
       $regPath = "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1"
       if (Test-Path $regPath) {
           $kfmFolders = Get-ItemProperty -Path $regPath -Name "KfmFoldersProtectedNow" -ErrorAction SilentlyContinue
           if ($kfmFolders) {
               return "KFR Enabled. Protected folders: $($kfmFolders.KfmFoldersProtectedNow)"
           }
       }
       return "KFR not enabled"
   }
   ```

## Troubleshooting Common Issues

### Issue: Files Not Syncing After Redirection

**Possible Causes and Solutions**:
- **OneDrive Not Running**:
  - Verify OneDrive process is running
  - Check startup settings: `Get-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "OneDrive"`

- **Authentication Problems**:
  - Reset OneDrive credentials:
    ```
    %localappdata%\Microsoft\OneDrive\onedrive.exe /reset
    ```
  - Restart OneDrive and verify account connection

- **Sync Engine Issues**:
  - Review sync logs at `%localappdata%\Microsoft\OneDrive\logs\`
  - Reset the sync engine: 
    ```
    %localappdata%\Microsoft\OneDrive\onedrive.exe /reset
    ```

### Issue: Known Folder Redirection Failed to Configure

**Possible Causes and Solutions**:
- **Policy Conflict**:
  - Check for conflicting folder redirection policies in Group Policy
  - Run `gpresult /h report.html` and review for conflicts

- **Permissions Issues**:
  - Verify user has write permissions to the known folders
  - Check OneDrive folder permissions: `icacls "%userprofile%\OneDrive - Company"`

- **Registry Corruption**:
  - Clear KFR registry settings and reapply:
    ```powershell
    Remove-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive\Accounts\Business1" -Name "KfmFoldersProtectedNow" -ErrorAction SilentlyContinue
    ```

### Issue: Users Receiving Multiple Redirection Prompts

**Possible Causes and Solutions**:
- **Multiple Policies**:
  - Check for duplicate GPO application
  - Streamline policy deployment to avoid overlaps

- **Failed Previous Attempts**:
  - Clear the "KFMSpooferSet" registry value:
    ```powershell
    Remove-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" -Name "KFMSpooferSet" -ErrorAction SilentlyContinue
    ```

## Best Practices and Optimization

### Performance Optimization

1. **Files On-Demand Integration**:
   - Always enable Files On-Demand alongside KFR
   - Configure default file download behavior:
     ```powershell
     # Set files to online-only by default
     Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\OneDrive" -Name "FilesOnDemandEnabled" -Value 1 -Type DWORD
     ```

2. **Selective Sync Considerations**:
   - Advise users on folder organization strategies
   - Create guidance for large file management
   - Establish clear policies for personal vs. business data

3. **Network Optimization**:
   - Implement split-tunneling for VPN users to improve sync performance
   - Consider deploying BITS throttling during business hours
   - Exclude OneDrive processes from network inspection when possible

### Security Considerations

1. **Conditional Access**:
   - Implement device-based conditional access policies for OneDrive
   - Restrict access from unmanaged devices for sensitive data

2. **Data Loss Prevention**:
   - Configure DLP policies for content in redirected folders
   - Implement sensitivity labels for automatic protection

3. **Ransomware Protection**:
   - Enable OneDrive's built-in ransomware detection
   - Educate users on the file restoration process
   - Configure version history retention periods

## Compliance and Governance

### Data Residency

- Configure Multi-Geo capabilities for organizations with regional data storage requirements
- Map user locations to appropriate data centers using PowerShell:
  ```powershell
  Set-MsolUser -UserPrincipalName user@contoso.com -PreferredDataLocation "EUR"
  ```

### Legal Hold and eDiscovery

- Configure retention policies for known folders
- Document KFR implementation for legal/compliance teams
- Train eDiscovery specialists on OneDrive data collection processes

### Backup Policies

- Determine whether additional backup solutions are needed beyond OneDrive
- Configure Office 365 retention policies for longer-term retention
- Document restore procedures for end-user and IT staff

## References and Resources

- [Official Microsoft KFR Documentation](https://docs.microsoft.com/en-us/onedrive/redirect-known-folders)
- [OneDrive Administrative Template Files](https://docs.microsoft.com/en-us/onedrive/use-group-policy)
- [OneDrive Sync Client Release Notes](https://support.office.com/en-us/article/new-onedrive-sync-client-release-notes-845dcf18-f921-435e-bf28-4e24b95e5fc0)
- [OneDrive Technical Community](https://techcommunity.microsoft.com/t5/OneDrive-for-Business/bd-p/OneDriveforBusiness)

---

*Last Updated: April 2025*
*Author: ACS Knowledge Base Team*