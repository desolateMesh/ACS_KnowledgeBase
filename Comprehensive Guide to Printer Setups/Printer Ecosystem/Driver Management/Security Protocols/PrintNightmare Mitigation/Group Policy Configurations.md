# Group Policy Configurations for PrintNightmare Mitigation

## 1. Purpose
This document provides detailed Group Policy Objects (GPO) and configuration settings to mitigate the **PrintNightmare** vulnerability (CVE-2021-34527) across Windows environments. It enables AI-driven agents to:
- Automate GPO creation and linking
- Apply registry-based policies
- Validate settings compliance
- Roll out fixes and monitor status

## 2. Scope
- **Affected Versions**: Windows Server 2012 R2, 2016, 2019, 2022; Windows 8.1, 10, 11
- **Target Objects**: Domain controllers, member servers, workstations
- **Policy Types**: Administrative Templates, Registry Preferences, Security Settings

## 3. Definitions
- **PrintNightmare**: Remote code execution vulnerability in Windows Print Spooler service
- **Point-and-Print Restrictions**: Controls for driver installation behavior
- **Package Point and Print**: Restricts driver installation to signed packages
- **Printer Driver Installation Policies**: Settings controlling installation prompts and restrictions

## 4. GPO Structure
- **GPO Name**: `Mitigate_PrintNightmare`
- **Linking**: OU containing all computers, with security filtering to `Authenticated Users`
- **Precedence**: High (set to 1)

## 5. Administrative Template Settings (ADMX)
| Setting Path                                                | Name                                              | Value                                 |
|-------------------------------------------------------------|---------------------------------------------------|---------------------------------------|
| Computer Configuration → Policies → Administrative Templates → Printers | `Allow Print Spooler to accept client connections` | Disabled                              |
| Computer Configuration → Policies → Administrative Templates → Printers | `Allow print driver installation`                  | Disabled                              |
| Computer Configuration → Policies → Administrative Templates → System → Driver Installation | `Allow non-administrators to install drivers for these device setup classes` | Blank list (restrict all classes) |

## 6. Registry-Based Policies
For environments without ADMX, deploy via **Group Policy Preferences**:
```powershell
# Disable inbound remote RPC calls
New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers' -Force
New-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers' -Name 'RpcAuthnLevelPrivacyEnabled' -Value 1 -PropertyType DWord -Force

# Restrict printer driver installation
New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint' -Force
New-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint' -Name 'RestrictDriverInstallationToAdministrators' -Value 1 -PropertyType DWord -Force
New-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint' -Name 'UpdatePromptSettings' -Value 2 -PropertyType DWord -Force
# 0 = Do not show prompt
# 1 = Show warning only
# 2 = Show warning and elevation prompt
```

## 7. Security Settings
- **Service Configuration**: Disable `Print Spooler` service on domain controllers.
  ```powershell
  Set-Service -Name Spooler -StartupType Disabled
  Stop-Service -Name Spooler
  ```
- **Firewall**: Block inbound RPC port 445 and 135 on servers not requiring printing.

## 8. Compliance Validation
- **PowerShell Script** to check policy:
```powershell
$settings = Get-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint'
if ($settings.RestrictDriverInstallationToAdministrators -eq 1) { Write-Output 'Compliant' } else { Write-Output 'Non-Compliant' }
```
- **GPO Report**: `Get-GPOReport -Name Mitigate_PrintNightmare -ReportType HTML -Path .\GPOReport.html`

## 9. Deployment Automation
- **Ansible Playbook** snippet for registry keys:
```yaml
- name: Apply PrintNightmare Mitigation
  hosts: windows_servers
  tasks:
    - name: Set RPC AuthNLevel
      win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers
        name: RpcAuthnLevelPrivacyEnabled
        data: 1
        type: dword
    - name: Restrict Driver Install
      win_regedit:
        path: HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Printers\PointAndPrint
        name: RestrictDriverInstallationToAdministrators
        data: 1
        type: dword
```

## 10. Monitoring & Reporting
- **Event Logs**: Monitor `Microsoft-Windows-PrintService/Admin` for error ID 3172 (Point and Print restriction).
- **SIEM Integration**: Forward relevant events and GPO change logs to central SIEM.
- **Alerts**: Trigger on Print Spooler start attempts on domain controllers.

## 11. Rollback Plan
- Remove GPO link or set `Enabled` back to `Not Configured` for impacted settings.
- Enable `Print Spooler` service via GPO or script:
  ```powershell
  Set-Service -Name Spooler -StartupType Automatic
  Start-Service -Name Spooler
  ```

## 12. References
- Microsoft Security Advisory CVE-2021-34527: https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-34527  
- Point and Print Restrictions GPO: https://docs.microsoft.com/windows-server/administration/group-policy/gpo/pointandprintrestrictions  
- PowerShell Cmdlets for GPO: https://docs.microsoft.com/powershell/module/grouppolicy/  

