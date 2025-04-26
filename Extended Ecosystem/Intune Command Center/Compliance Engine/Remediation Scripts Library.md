# Remediation Scripts Library

## Overview

This document provides a comprehensive collection of remediation scripts to address common compliance issues detected by Microsoft Intune. These scripts can be deployed using Intune Remediation Scripts (Proactive Remediation) feature or through custom compliance policies with remediation actions.

## Implementation Methods

### Proactive Remediation
- **Detection Script**: Identifies non-compliant state
- **Remediation Script**: Applies fix for detected issue
- **Assignment Groups**: Target specific device collections
- **Schedule**: Configure run frequency and timing
- **Reporting**: Monitor success/failure metrics

### PowerShell Script Deployment
- **Direct Script Assignment**: Deploy via PowerShell scripts policy
- **Run Context**: System vs. User context execution
- **Script Signing**: Requirements for script signatures
- **Output Collection**: Gather script execution results

### Win32 App Deployment
- **Application Packaging**: Wrap scripts as Win32 applications
- **Requirement Rules**: Configure detection logic
- **Installation Commands**: Set up execution parameters
- **Supersedence**: Manage script versioning

## Script Collections

### BitLocker Remediation

#### Check BitLocker Status
```powershell
# Detection Script
$BitLockerVolume = Get-BitLockerVolume -MountPoint "C:"
if ($BitLockerVolume.ProtectionStatus -eq "On") {
    Write-Output "Compliant: BitLocker is enabled on the system drive"
    Exit 0
} else {
    Write-Output "Non-compliant: BitLocker is not enabled on the system drive"
    Exit 1
}
```

#### Enable BitLocker
```powershell
# Remediation Script
try {
    # Check for TPM readiness
    $TPM = Get-Tpm
    if ($TPM.TpmReady -ne $true) {
        Write-Output "TPM is not ready. Initializing TPM..."
        Initialize-Tpm -AllowClear -AllowPhysicalPresence
    }
    
    # Check for BitLocker status before enabling
    $BitLockerVolume = Get-BitLockerVolume -MountPoint "C:"
    if ($BitLockerVolume.ProtectionStatus -eq "Off") {
        # Enable BitLocker with TPM
        Enable-BitLocker -MountPoint "C:" -TpmProtector
        
        # Backup recovery key to Azure AD
        $BLV = Get-BitLockerVolume -MountPoint "C:"
        $RecoveryProtector = $BLV.KeyProtector | Where-Object { $_.KeyProtectorType -eq "RecoveryPassword" }
        if ($RecoveryProtector) {
            BackupToAAD-BitLockerKeyProtector -MountPoint "C:" -KeyProtectorId $RecoveryProtector.KeyProtectorId
            Write-Output "BitLocker enabled and recovery key backed up to Azure AD"
            Exit 0
        } else {
            # Add recovery key if not present
            Add-BitLockerKeyProtector -MountPoint "C:" -RecoveryPasswordProtector
            $BLV = Get-BitLockerVolume -MountPoint "C:"
            $RecoveryProtector = $BLV.KeyProtector | Where-Object { $_.KeyProtectorType -eq "RecoveryPassword" }
            BackupToAAD-BitLockerKeyProtector -MountPoint "C:" -KeyProtectorId $RecoveryProtector.KeyProtectorId
            Write-Output "BitLocker enabled with recovery protector and backed up to Azure AD"
            Exit 0
        }
    } else {
        Write-Output "BitLocker is already enabled on drive C:"
        Exit 0
    }
} catch {
    Write-Error "Error enabling BitLocker: $_"
    Exit 1
}
```

### Antivirus Management

#### Check Defender Status
```powershell
# Detection Script
try {
    $DefenderStatus = Get-MpComputerStatus
    
    # Check if real-time protection is enabled
    $RTProtection = $DefenderStatus.RealTimeProtectionEnabled
    
    # Check if definitions are up to date (less than 3 days old)
    $DefAge = $DefenderStatus.AntivirusSignatureAge
    $DefUpToDate = $DefAge -le 3
    
    if ($RTProtection -and $DefUpToDate) {
        Write-Output "Compliant: Microsoft Defender is properly configured"
        Exit 0
    } else {
        if (-not $RTProtection) {
            Write-Output "Non-compliant: Real-time protection is disabled"
        }
        if (-not $DefUpToDate) {
            Write-Output "Non-compliant: Antivirus definitions are out of date ($DefAge days old)"
        }
        Exit 1
    }
} catch {
    Write-Error "Error checking Microsoft Defender status: $_"
    Exit 1
}
```

#### Fix Defender Configuration
```powershell
# Remediation Script
try {
    # Enable real-time protection if disabled
    $DefenderStatus = Get-MpComputerStatus
    if (-not $DefenderStatus.RealTimeProtectionEnabled) {
        Set-MpPreference -DisableRealtimeMonitoring $false
        Write-Output "Enabled real-time protection"
    }
    
    # Update definitions if outdated
    if ($DefenderStatus.AntivirusSignatureAge -gt 3) {
        Start-Process -FilePath "C:\Program Files\Windows Defender\MpCmdRun.exe" -ArgumentList "-SignatureUpdate" -Wait
        Write-Output "Updated antivirus definitions"
    }
    
    # Verify changes
    $NewStatus = Get-MpComputerStatus
    if ($NewStatus.RealTimeProtectionEnabled -and $NewStatus.AntivirusSignatureAge -le 3) {
        Write-Output "Successfully remediated Microsoft Defender configuration"
        Exit 0
    } else {
        Write-Output "Remediation attempted but verification failed"
        Exit 1
    }
} catch {
    Write-Error "Error remediating Microsoft Defender: $_"
    Exit 1
}
```

### Windows Update Compliance

#### Check Update Status
```powershell
# Detection Script
try {
    # Get missing updates count
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Criteria = "IsInstalled=0 and Type='Software' and IsHidden=0"
    $SearchResult = $Searcher.Search($Criteria)
    
    # Check for pending reboots
    $PendingReboot = $false
    if (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired") {
        $PendingReboot = $true
    }
    
    if ($SearchResult.Updates.Count -eq 0 -and -not $PendingReboot) {
        Write-Output "Compliant: No missing updates or pending reboots"
        Exit 0
    } else {
        if ($SearchResult.Updates.Count -gt 0) {
            Write-Output "Non-compliant: $($SearchResult.Updates.Count) updates missing"
        }
        if ($PendingReboot) {
            Write-Output "Non-compliant: Pending reboot required"
        }
        Exit 1
    }
} catch {
    Write-Error "Error checking Windows Update status: $_"
    Exit 1
}
```

#### Install Missing Updates
```powershell
# Remediation Script
try {
    # Check for missing updates
    $Session = New-Object -ComObject Microsoft.Update.Session
    $Searcher = $Session.CreateUpdateSearcher()
    $Criteria = "IsInstalled=0 and Type='Software' and IsHidden=0"
    $SearchResult = $Searcher.Search($Criteria)
    
    if ($SearchResult.Updates.Count -gt 0) {
        Write-Output "Found $($SearchResult.Updates.Count) updates to install"
        
        # Create updater object
        $Updater = $Session.CreateUpdateDownloader()
        $Updater.Updates = $SearchResult.Updates
        
        # Download updates
        Write-Output "Downloading updates..."
        $DownloadResult = $Updater.Download()
        
        if ($DownloadResult.ResultCode -eq 2) { # SucceededWithErrors (2)
            Write-Output "Updates downloaded with some errors"
        } elseif ($DownloadResult.ResultCode -eq 3) { # Succeeded (3)
            Write-Output "Updates downloaded successfully"
        } else {
            Write-Output "Failed to download some updates"
        }
        
        # Install updates
        $Installer = $Session.CreateUpdateInstaller()
        $Installer.Updates = $SearchResult.Updates
        
        Write-Output "Installing updates..."
        $InstallResult = $Installer.Install()
        
        if ($InstallResult.RebootRequired) {
            Write-Output "Installation complete but reboot required"
            # Schedule reboot during maintenance window if needed
            # Shutdown -r -t 43200 -c "Scheduled reboot for Windows Updates" -d p:4:1
        } else {
            Write-Output "Updates installed successfully"
        }
        
        Exit 0
    } else {
        Write-Output "No updates to install"
        Exit 0
    }
} catch {
    Write-Error "Error installing Windows Updates: $_"
    Exit 1
}
```

### Device Encryption Verification

#### Check Encryption Status
```powershell
# Detection Script
try {
    $EncryptionStatus = $false
    
    # Check for BitLocker on Windows
    if (Get-Command Get-BitLockerVolume -ErrorAction SilentlyContinue) {
        $SystemDrive = Get-BitLockerVolume -MountPoint $env:SystemDrive
        if ($SystemDrive.ProtectionStatus -eq "On") {
            $EncryptionStatus = $true
        }
    }
    
    # Additional check for device encryption
    if (-not $EncryptionStatus) {
        $DeviceEncryption = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\BitLocker\OSVolume" -Name "EncryptionFlags" -ErrorAction SilentlyContinue
        if ($null -ne $DeviceEncryption -and $DeviceEncryption.EncryptionFlags -gt 0) {
            $EncryptionStatus = $true
        }
    }
    
    if ($EncryptionStatus) {
        Write-Output "Compliant: Device encryption is enabled"
        Exit 0
    } else {
        Write-Output "Non-compliant: Device encryption is not enabled"
        Exit 1
    }
} catch {
    Write-Error "Error checking encryption status: $_"
    Exit 1
}
```

### Certificate Management

#### Verify Certificate Installation
```powershell
# Detection Script
try {
    $CertThumbprint = "0123456789ABCDEF0123456789ABCDEF01234567"
    $CertExists = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $CertThumbprint }
    
    if ($null -ne $CertExists) {
        # Check if certificate is valid
        $Now = Get-Date
        if ($CertExists.NotAfter -gt $Now -and $CertExists.NotBefore -lt $Now) {
            Write-Output "Compliant: Required certificate is installed and valid"
            Exit 0
        } else {
            Write-Output "Non-compliant: Certificate is expired or not yet valid"
            Exit 1
        }
    } else {
        Write-Output "Non-compliant: Required certificate is not installed"
        Exit 1
    }
} catch {
    Write-Error "Error checking certificate: $_"
    Exit 1
}
```

#### Install Certificate
```powershell
# Remediation Script
try {
    # Define certificate information
    $CertThumbprint = "0123456789ABCDEF0123456789ABCDEF01234567"
    $CertName = "CompanyRootCA.cer"
    $CertURL = "https://certificates.company.com/$CertName"
    $CertPath = "$env:TEMP\$CertName"
    
    # Check if certificate already exists
    $CertExists = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $CertThumbprint }
    if ($null -eq $CertExists) {
        # Download certificate
        Invoke-WebRequest -Uri $CertURL -OutFile $CertPath
        
        # Install certificate
        Import-Certificate -FilePath $CertPath -CertStoreLocation Cert:\LocalMachine\My
        
        # Verify installation
        $CertInstalled = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $CertThumbprint }
        if ($null -ne $CertInstalled) {
            Write-Output "Certificate installed successfully"
            Exit 0
        } else {
            Write-Output "Certificate installation failed"
            Exit 1
        }
    } else {
        Write-Output "Certificate already installed"
        Exit 0
    }
} catch {
    Write-Error "Error installing certificate: $_"
    Exit 1
}
```

### Firewall Management

#### Check Firewall Status
```powershell
# Detection Script
try {
    $FirewallProfiles = Get-NetFirewallProfile
    $AllEnabled = $true
    
    foreach ($Profile in $FirewallProfiles) {
        if ($Profile.Enabled -eq $false) {
            $AllEnabled = $false
            Write-Output "Non-compliant: Firewall profile '$($Profile.Name)' is disabled"
        }
    }
    
    if ($AllEnabled) {
        Write-Output "Compliant: All firewall profiles are enabled"
        Exit 0
    } else {
        Exit 1
    }
} catch {
    Write-Error "Error checking firewall status: $_"
    Exit 1
}
```

#### Enable Firewall
```powershell
# Remediation Script
try {
    $FirewallProfiles = Get-NetFirewallProfile
    $ChangeMade = $false
    
    foreach ($Profile in $FirewallProfiles) {
        if ($Profile.Enabled -eq $false) {
            Set-NetFirewallProfile -Name $Profile.Name -Enabled True
            Write-Output "Enabled firewall profile: $($Profile.Name)"
            $ChangeMade = $true
        }
    }
    
    if ($ChangeMade) {
        Write-Output "Firewall profiles have been enabled"
    } else {
        Write-Output "All firewall profiles were already enabled"
    }
    
    # Verify changes
    $AllEnabled = $true
    $FirewallProfiles = Get-NetFirewallProfile
    
    foreach ($Profile in $FirewallProfiles) {
        if ($Profile.Enabled -eq $false) {
            $AllEnabled = $false
        }
    }
    
    if ($AllEnabled) {
        Exit 0
    } else {
        Write-Output "Failed to enable all firewall profiles"
        Exit 1
    }
} catch {
    Write-Error "Error enabling firewall: $_"
    Exit 1
}
```

### Local Administrator Management

#### Check Local Admin Membership
```powershell
# Detection Script
try {
    $AdminGroupSID = "S-1-5-32-544"
    $AdminGroup = [ADSI]"WinNT://./Administrators,group"
    $Members = @($AdminGroup.Invoke("Members"))
    
    # Get current members
    $CurrentAdmins = @()
    foreach ($Member in $Members) {
        $AdsPath = $Member.GetType().InvokeMember("ADsPath", "GetProperty", $null, $Member, $null)
        $Name = $AdsPath.Replace("WinNT://", "").Replace("/", "\")
        $CurrentAdmins += $Name
    }
    
    # Define authorized administrators
    $AuthorizedAdmins = @(
        "NT AUTHORITY\SYSTEM",
        "BUILTIN\Administrators",
        "DOMAIN\IT-AdminGroup"
    )
    
    # Check for unauthorized admins
    $Unauthorized = $false
    foreach ($Admin in $CurrentAdmins) {
        $IsAuthorized = $false
        foreach ($Auth in $AuthorizedAdmins) {
            if ($Admin -eq $Auth -or $Admin -match $Auth) {
                $IsAuthorized = $true
                break
            }
        }
        
        if (-not $IsAuthorized) {
            Write-Output "Non-compliant: Unauthorized admin account found: $Admin"
            $Unauthorized = $true
        }
    }
    
    if (-not $Unauthorized) {
        Write-Output "Compliant: All admin accounts are authorized"
        Exit 0
    } else {
        Exit 1
    }
} catch {
    Write-Error "Error checking local admin membership: $_"
    Exit 1
}
```

#### Remove Unauthorized Admins
```powershell
# Remediation Script
try {
    $AdminGroupSID = "S-1-5-32-544"
    $AdminGroup = [ADSI]"WinNT://./Administrators,group"
    $Members = @($AdminGroup.Invoke("Members"))
    
    # Define authorized administrators
    $AuthorizedAdmins = @(
        "NT AUTHORITY\SYSTEM",
        "BUILTIN\Administrators",
        "DOMAIN\IT-AdminGroup"
    )
    
    # Check each member
    foreach ($Member in $Members) {
        $AdsPath = $Member.GetType().InvokeMember("ADsPath", "GetProperty", $null, $Member, $null)
        $Name = $AdsPath.Replace("WinNT://", "").Replace("/", "\")
        
        # Skip if member is in authorized list
        $IsAuthorized = $false
        foreach ($Auth in $AuthorizedAdmins) {
            if ($Name -eq $Auth -or $Name -match $Auth) {
                $IsAuthorized = $true
                break
            }
        }
        
        # Remove if not authorized
        if (-not $IsAuthorized) {
            Write-Output "Removing unauthorized admin: $Name"
            $Domain, $User = $Name.Split("\")
            if ($Domain -eq $env:COMPUTERNAME) {
                $LocalUser = [ADSI]"WinNT://./$User,user"
                $AdminGroup.Remove($LocalUser.Path)
            } else {
                $ADSIUser = [ADSI]"WinNT://$Domain/$User"
                $AdminGroup.Remove($ADSIUser.Path)
            }
        }
    }
    
    Write-Output "Successfully removed unauthorized admin accounts"
    Exit 0
} catch {
    Write-Error "Error removing unauthorized admins: $_"
    Exit 1
}
```

### Secure Boot Verification

#### Check Secure Boot Status
```powershell
# Detection Script
try {
    $SecureBootStatus = Confirm-SecureBootUEFI -ErrorAction SilentlyContinue
    
    if ($null -eq $SecureBootStatus) {
        Write-Output "Non-compliant: Secure Boot not supported on this device"
        Exit 1
    } elseif ($SecureBootStatus -eq $true) {
        Write-Output "Compliant: Secure Boot is enabled"
        Exit 0
    } else {
        Write-Output "Non-compliant: Secure Boot is disabled"
        Exit 1
    }
} catch {
    Write-Error "Error checking Secure Boot status: $_"
    Exit 1
}
```

### TPM Verification

#### Check TPM Status
```powershell
# Detection Script
try {
    $TPM = Get-Tpm
    
    if ($null -eq $TPM) {
        Write-Output "Non-compliant: TPM not available on this device"
        Exit 1
    } elseif ($TPM.TpmPresent -and $TPM.TpmReady -and $TPM.TpmEnabled) {
        # Check TPM version
        $TPMVersion = Get-WmiObject -Namespace "root\cimv2\security\microsofttpm" -Class "Win32_Tpm" -ErrorAction SilentlyContinue
        if ($null -ne $TPMVersion -and $TPMVersion.SpecVersion -like "*2.0*") {
            Write-Output "Compliant: TPM 2.0 is present, enabled, and ready"
            Exit 0
        } else {
            Write-Output "Non-compliant: TPM is available but not version 2.0"
            Exit 1
        }
    } else {
        Write-Output "Non-compliant: TPM is not enabled or not ready"
        Exit 1
    }
} catch {
    Write-Error "Error checking TPM status: $_"
    Exit 1
}
```

#### Enable TPM
```powershell
# Remediation Script
try {
    $TPM = Get-Tpm
    
    if ($null -ne $TPM -and $TPM.TpmPresent) {
        if (-not $TPM.TpmReady -or -not $TPM.TpmEnabled) {
            # Initialize TPM
            Write-Output "Initializing TPM..."
            Initialize-Tpm -AllowClear -AllowPhysicalPresence
            
            # Verify TPM status after initialization
            $TPMAfter = Get-Tpm
            if ($TPMAfter.TpmReady -and $TPMAfter.TpmEnabled) {
                Write-Output "Successfully enabled TPM"
                Exit 0
            } else {
                Write-Output "Failed to enable TPM, may require BIOS interaction"
                Exit 1
            }
        } else {
            Write-Output "TPM is already enabled and ready"
            Exit 0
        }
    } else {
        Write-Output "TPM not present on this device"
        Exit 1
    }
} catch {
    Write-Error "Error enabling TPM: $_"
    Exit 1
}
```

### Windows Defender Management

#### Check Defender Settings
```powershell
# Detection Script
try {
    $DefenderSettings = Get-MpPreference
    $DefenderStatus = Get-MpComputerStatus
    
    $Compliant = $true
    $Issues = @()
    
    # Check real-time protection
    if (-not $DefenderStatus.RealTimeProtectionEnabled) {
        $Compliant = $false
        $Issues += "Real-time protection is disabled"
    }
    
    # Check cloud-based protection
    if (-not $DefenderSettings.MAPSReporting -eq 2) { # Advanced MAPS
        $Compliant = $false
        $Issues += "Cloud-based protection is not set to Advanced"
    }
    
    # Check sample submission
    if (-not $DefenderSettings.SubmitSamplesConsent -eq 1) { # Always prompt
        $Compliant = $false
        $Issues += "Sample submission not set to 'Always prompt'"
    }
    
    # Check definitions age
    if ($DefenderStatus.AntivirusSignatureAge -gt 3) {
        $Compliant = $false
        $Issues += "Antivirus definitions are out of date ($($DefenderStatus.AntivirusSignatureAge) days old)"
    }
    
    # Check tamper protection
    if (-not $DefenderSettings.TamperProtection) {
        $Compliant = $false
        $Issues += "Tamper Protection is disabled"
    }
    
    if ($Compliant) {
        Write-Output "Compliant: Windows Defender is properly configured"
        Exit 0
    } else {
        Write-Output "Non-compliant: Windows Defender has configuration issues: $($Issues -join ', ')"
        Exit 1
    }
} catch {
    Write-Error "Error checking Windows Defender settings: $_"
    Exit 1
}
```

#### Configure Defender Settings
```powershell
# Remediation Script
try {
    $DefenderSettings = Get-MpPreference
    $DefenderStatus = Get-MpComputerStatus
    $Changes = @()
    
    # Enable real-time protection if disabled
    if (-not $DefenderStatus.RealTimeProtectionEnabled) {
        Set-MpPreference -DisableRealtimeMonitoring $false
        $Changes += "Enabled real-time protection"
    }
    
    # Enable cloud-based protection if not set to Advanced
    if (-not $DefenderSettings.MAPSReporting -eq 2) {
        Set-MpPreference -MAPSReporting 2
        $Changes += "Set cloud-based protection to Advanced"
    }
    
    # Configure sample submission
    if (-not $DefenderSettings.SubmitSamplesConsent -eq 1) {
        Set-MpPreference -SubmitSamplesConsent 1
        $Changes += "Set sample submission to 'Always prompt'"
    }
    
    # Update definitions if outdated
    if ($DefenderStatus.AntivirusSignatureAge -gt 3) {
        Start-Process -FilePath "C:\Program Files\Windows Defender\MpCmdRun.exe" -ArgumentList "-SignatureUpdate" -Wait
        $Changes += "Updated antivirus definitions"
    }
    
    # Enable tamper protection if disabled
    if (-not $DefenderSettings.TamperProtection) {
        Set-MpPreference -TamperProtection $true
        $Changes += "Enabled Tamper Protection"
    }
    
    if ($Changes.Count -gt 0) {
        Write-Output "Windows Defender settings updated: $($Changes -join ', ')"
    } else {
        Write-Output "No changes needed for Windows Defender settings"
    }
    
    Exit 0
} catch {
    Write-Error "Error configuring Windows Defender: $_"
    Exit 1
}
```

## Execution Framework

### Script Deployment Workflow

1. **Script Development & Testing**
   - Create and test in isolated environment
   - Review with security team
   - Document expected behavior and limitations

2. **Deployment Preparation**
   - Package scripts appropriately
   - Set up test device groups
   - Configure logging and monitoring

3. **Pilot Deployment**
   - Deploy to limited test group
   - Monitor for errors and performance issues
   - Gather feedback on remediation effectiveness

4. **Full Deployment**
   - Roll out to production in phases
   - Monitor compliance improvements
   - Track success/failure metrics

5. **Maintenance**
   - Update scripts for OS changes
   - Tune detection logic
   - Add new remediations as needed

### Logging & Monitoring

#### PowerShell Logging
```powershell
function Write-Log {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('Information','Warning','Error')]
        [string]$Level = 'Information',
        
        [Parameter(Mandatory=$false)]
        [string]$LogFilePath = "$env:ProgramData\ComplianceScripts\Logs\Remediation_$(Get-Date -Format 'yyyyMMdd').log"
    )
    
    # Create log directory if it doesn't exist
    $LogDir = Split-Path $LogFilePath -Parent
    if (-not (Test-Path $LogDir)) {
        New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
    }
    
    # Format log entry
    $TimeStamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $LogEntry = "$TimeStamp [$Level] $Message"
    
    # Write to log file
    Add-Content -Path $LogFilePath -Value $LogEntry
    
    # Write to console if running in verbose mode
    if ($VerbosePreference -eq 'Continue') {
        Write-Verbose $LogEntry
    }
    
    # Write to event log for errors
    if ($Level -eq 'Error') {
        Write-EventLog -LogName Application -Source "ComplianceRemediation" -EventId 1001 -EntryType Error -Message $Message -Category 0
    }
}

# Create Event Log source if it doesn't exist
if (-not [System.Diagnostics.EventLog]::SourceExists("ComplianceRemediation")) {
    New-EventLog -LogName Application -Source "ComplianceRemediation"
}
```

#### Result Reporting
```powershell
function Report-RemediationResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$ScriptName,
        
        [Parameter(Mandatory=$true)]
        [bool]$Success,
        
        [Parameter(Mandatory=$false)]
        [string]$Message = "",
        
        [Parameter(Mandatory=$false)]
        [string]$ReportServer = "https://reports.company.com/api/compliance"
    )
    
    try {
        # Gather system information
        $ComputerInfo = Get-ComputerInfo
        $OSInfo = $ComputerInfo.OsName + " " + $ComputerInfo.OsVersion
        
        # Create report object
        $Report = @{
            DeviceName = $env:COMPUTERNAME
            ScriptName = $ScriptName
            Success = $Success
            Message = $Message
            ExecutionTime = Get-Date -Format "o"
            OperatingSystem = $OSInfo
            UserName = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        }
        
        # Convert to JSON
        $JsonReport = $Report | ConvertTo-Json
        
        # Send to reporting server if available
        if (Test-NetConnection -ComputerName $ReportServer.Replace("https://", "").Split("/")[0] -Port 443 -InformationLevel Quiet) {
            Invoke-RestMethod -Uri $ReportServer -Method Post -Body $JsonReport -ContentType "application/json"
        }
        
        # Always log locally
        Write-Log -Message "Remediation report: $($Report.ScriptName) - Success: $($Report.Success) - $($Report.Message)" -Level $(if ($Success) { "Information" } else { "Error" })
        
        return $true
    } catch {
        Write-Log -Message "Failed to report remediation result: $_" -Level "Error"
        return $false
    }
}
```

## Advanced Scenarios

### Registry-Based Compliance

#### Verify Registry Settings
```powershell
# Detection Script
try {
    $RequiredSettings = @{
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" = @{
            "AUOptions" = 4
            "NoAutoUpdate" = 0
            "EnableFeaturedSoftware" = 1
        }
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" = @{
            "ElevateNonAdmins" = 1
            "TargetGroupEnabled" = 1
        }
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" = @{
            "EnableLUA" = 1
            "ConsentPromptBehaviorAdmin" = 2
        }
    }
    
    $NonCompliant = $false
    $Issues = @()
    
    foreach ($KeyPath in $RequiredSettings.Keys) {
        if (-not (Test-Path $KeyPath)) {
            $NonCompliant = $true
            $Issues += "Registry key not found: $KeyPath"
            continue
        }
        
        foreach ($ValueName in $RequiredSettings[$KeyPath].Keys) {
            $ExpectedValue = $RequiredSettings[$KeyPath][$ValueName]
            $ActualValue = Get-ItemProperty -Path $KeyPath -Name $ValueName -ErrorAction SilentlyContinue
            
            if ($null -eq $ActualValue -or $ActualValue.$ValueName -ne $ExpectedValue) {
                $NonCompliant = $true
                if ($null -eq $ActualValue) {
                    $Issues += "Registry value not found: $KeyPath\$ValueName"
                } else {
                    $Issues += "Registry value mismatch: $KeyPath\$ValueName - Expected: $ExpectedValue, Actual: $($ActualValue.$ValueName)"
                }
            }
        }
    }
    
    if ($NonCompliant) {
        Write-Output "Non-compliant: Registry settings incorrect - $($Issues -join '; ')"
        Exit 1
    } else {
        Write-Output "Compliant: All registry settings match expected values"
        Exit 0
    }
} catch {
    Write-Error "Error checking registry settings: $_"
    Exit 1
}
```

#### Configure Registry Settings
```powershell
# Remediation Script
try {
    $RequiredSettings = @{
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" = @{
            "AUOptions" = 4
            "NoAutoUpdate" = 0
            "EnableFeaturedSoftware" = 1
        }
        "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" = @{
            "ElevateNonAdmins" = 1
            "TargetGroupEnabled" = 1
        }
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" = @{
            "EnableLUA" = 1
            "ConsentPromptBehaviorAdmin" = 2
        }
    }
    
    $Changes = @()
    
    foreach ($KeyPath in $RequiredSettings.Keys) {
        if (-not (Test-Path $KeyPath)) {
            New-Item -Path $KeyPath -Force | Out-Null
            $Changes += "Created registry key: $KeyPath"
        }
        
        foreach ($ValueName in $RequiredSettings[$KeyPath].Keys) {
            $ExpectedValue = $RequiredSettings[$KeyPath][$ValueName]
            $ActualValue = Get-ItemProperty -Path $KeyPath -Name $ValueName -ErrorAction SilentlyContinue
            
            if ($null -eq $ActualValue -or $ActualValue.$ValueName -ne $ExpectedValue) {
                Set-ItemProperty -Path $KeyPath -Name $ValueName -Value $ExpectedValue -Type DWord
                $Changes += "Updated registry value: $KeyPath\$ValueName to $ExpectedValue"
            }
        }
    }
    
    if ($Changes.Count -gt 0) {
        Write-Output "Registry settings updated: $($Changes -join '; ')"
    } else {
        Write-Output "No registry settings needed updating"
    }
    
    Exit 0
} catch {
    Write-Error "Error updating registry settings: $_"
    Exit 1
}
```

### Azure AD Integration

#### Verify Azure AD Join Status
```powershell
# Detection Script
try {
    $DsRegStatus = dsregcmd /status
    $AzureADJoined = $DsRegStatus | Select-String "AzureAdJoined : YES" -Quiet
    $WorkplaceJoined = $DsRegStatus | Select-String "WorkplaceJoined : YES" -Quiet
    
    if ($AzureADJoined) {
        Write-Output "Compliant: Device is Azure AD joined"
        Exit 0
    } elseif ($WorkplaceJoined) {
        Write-Output "Partially compliant: Device is Workplace joined but not Azure AD joined"
        Exit 1
    } else {
        Write-Output "Non-compliant: Device is not connected to Azure AD"
        Exit 1
    }
} catch {
    Write-Error "Error checking Azure AD join status: $_"
    Exit 1
}
```

## Integration Scenarios

### Scheduled Task Management

#### Check Schedule Task Existence
```powershell
# Detection Script
try {
    $TaskName = "CompanySecurityScan"
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($null -eq $Task) {
        Write-Output "Non-compliant: Required scheduled task '$TaskName' not found"
        Exit 1
    } else {
        # Check if task is enabled
        if ($Task.State -eq "Disabled") {
            Write-Output "Non-compliant: Scheduled task '$TaskName' is disabled"
            Exit 1
        }
        
        # Check last run result
        $TaskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
        if ($TaskInfo.LastTaskResult -ne 0) {
            Write-Output "Non-compliant: Scheduled task '$TaskName' last run failed with result $($TaskInfo.LastTaskResult)"
            Exit 1
        }
        
        Write-Output "Compliant: Scheduled task '$TaskName' exists, is enabled, and last run succeeded"
        Exit 0
    }
} catch {
    Write-Error "Error checking scheduled task: $_"
    Exit 1
}
```

#### Create Scheduled Task
```powershell
# Remediation Script
try {
    $TaskName = "CompanySecurityScan"
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($null -eq $Task) {
        # Create the task
        $Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File 'C:\Program Files\CompanySecurity\SecurityScan.ps1'"
        $Trigger = New-ScheduledTaskTrigger -Daily -At 3am
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal
        
        Write-Output "Created scheduled task '$TaskName'"
        Exit 0
    } else {
        # Enable the task if disabled
        if ($Task.State -eq "Disabled") {
            Enable-ScheduledTask -TaskName $TaskName
            Write-Output "Enabled scheduled task '$TaskName'"
        }
        
        # Run the task to fix last run result if failed
        $TaskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
        if ($TaskInfo.LastTaskResult -ne 0) {
            Start-ScheduledTask -TaskName $TaskName
            Write-Output "Started scheduled task '$TaskName'"
        }
        
        Write-Output "Scheduled task '$TaskName' is now properly configured"
        Exit 0
    }
} catch {
    Write-Error "Error configuring scheduled task: $_"
    Exit 1
}
```

## Reference Documentation

- [Microsoft Intune Documentation](https://docs.microsoft.com/en-us/mem/intune/)
- [Proactive Remediation in Intune](https://docs.microsoft.com/en-us/mem/analytics/proactive-remediations)
- [PowerShell Scripting in Intune](https://docs.microsoft.com/en-us/mem/intune/apps/intune-management-extension)
- [Microsoft Graph API for Intune](https://docs.microsoft.com/en-us/graph/api/resources/intune-device-conceptual?view=graph-rest-beta)