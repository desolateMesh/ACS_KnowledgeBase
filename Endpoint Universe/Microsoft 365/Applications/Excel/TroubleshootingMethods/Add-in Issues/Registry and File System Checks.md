# Registry and File System Checks for Excel Add-ins

## Overview

Registry and file system checks are crucial steps in troubleshooting Excel add-in issues. Many add-in problems stem from incorrect registry entries, missing files, or permission issues within the file system. This document provides comprehensive guidance on performing systematic registry and file system checks to diagnose and resolve Excel add-in problems.

## Registry Checks

### Registry Structure for Excel Add-ins

Excel uses several registry locations to track add-ins, depending on the add-in type and installation scope:

#### 1. COM Add-in Registry Locations

##### User-Specific COM Add-in Registration
```
HKEY_CURRENT_USER\Software\Microsoft\Office\Excel\Addins\[Add-in ID]
```

##### Machine-Wide COM Add-in Registration
```
HKEY_LOCAL_MACHINE\Software\Microsoft\Office\Excel\Addins\[Add-in ID]
```

##### 32-bit Add-ins on 64-bit Windows
```
HKEY_LOCAL_MACHINE\Software\WOW6432Node\Microsoft\Office\Excel\Addins\[Add-in ID]
```

#### 2. COM Component Registration

##### Class Registration
```
HKEY_CLASSES_ROOT\CLSID\[Class ID]
```

##### Interface Registration
```
HKEY_CLASSES_ROOT\Interface\[Interface ID]
```

##### Type Library Registration
```
HKEY_CLASSES_ROOT\TypeLib\[TypeLib ID]
```

#### 3. Office Add-in (JavaScript) Registration
```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\Developer\[User SID]\Runtime\Manifests
```

#### 4. Add-in Security and Trust Settings
```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Excel\Security
HKEY_CURRENT_USER\Software\Policies\Microsoft\Office\16.0\Excel\Security
```

#### 5. Disabled Items Registry
```
HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Excel\Resiliency\DisabledItems
```

### Critical Registry Values

#### COM Add-in Registry Values

| Value Name | Data Type | Description | Valid Settings |
|------------|-----------|-------------|----------------|
| LoadBehavior | REG_DWORD | Controls how and when the add-in loads | 0 = Disconnected<br>1 = Connected<br>2 = Load at startup<br>3 = Load at startup and connect<br>8 = Load on demand<br>9 = Load on demand and connect<br>16 = Connected first time, then loaded on demand |
| Description | REG_SZ | Description of the add-in | Text string |
| FriendlyName | REG_SZ | Display name for the add-in | Text string |
| CommandLineSafe | REG_DWORD | Whether add-in can load when Office starts from command line | 0 = No<br>1 = Yes |

#### COM Class Registration Values

| Value Name | Data Type | Description |
|------------|-----------|-------------|
| InprocServer32 | REG_SZ | Path to the add-in DLL |
| ThreadingModel | REG_SZ | COM threading model (e.g., "Apartment", "Both", "Free") |
| TypeLib | REG_SZ | GUID of the type library |
| Programmable | REG_SZ | Indicates if object is programmable |

### Registry Check Process

#### 1. Verify Add-in Registration Existence

Check if the add-in is registered in the appropriate location:

```powershell
# For current user
reg query "HKCU\Software\Microsoft\Office\Excel\Addins\[Add-in ID]"

# For all users
reg query "HKLM\Software\Microsoft\Office\Excel\Addins\[Add-in ID]"

# For 32-bit add-ins on 64-bit Windows
reg query "HKLM\Software\WOW6432Node\Microsoft\Office\Excel\Addins\[Add-in ID]"
```

#### 2. Verify LoadBehavior Value

Check the current LoadBehavior value:

```powershell
reg query "HKCU\Software\Microsoft\Office\Excel\Addins\[Add-in ID]" /v LoadBehavior
```

For most normal operations, this should be set to 3 (load at startup and connect).

#### 3. Check COM Component Registration

Verify the COM component is properly registered:

```powershell
# List all methods and properties for a COM object
oleview.exe

# Check registration for a specific DLL
regsvr32 /s /i "[Path to Add-in DLL]"
echo %ERRORLEVEL%
```

#### 4. Check for Disabled Items

Examine if the add-in appears in the disabled items list:

```powershell
reg query "HKCU\Software\Microsoft\Office\16.0\Excel\Resiliency\DisabledItems"
```

### Registry Repair Techniques

#### 1. Reset LoadBehavior

If an add-in is not loading properly, reset its LoadBehavior value:

```powershell
reg add "HKCU\Software\Microsoft\Office\Excel\Addins\[Add-in ID]" /v LoadBehavior /t REG_DWORD /d 3 /f
```

#### 2. Re-register COM Components

```powershell
# Unregister
regsvr32 /u "[Path to Add-in DLL]"

# Register
regsvr32 "[Path to Add-in DLL]"
```

#### 3. Clear Disabled Items

Clear the list of disabled items:

```powershell
reg delete "HKCU\Software\Microsoft\Office\16.0\Excel\Resiliency" /v DisabledItems /f
```

#### 4. Create Missing Registry Entries

If an add-in is not appearing, manually create the registry entries:

```powershell
reg add "HKCU\Software\Microsoft\Office\Excel\Addins\[Add-in ID]" /v Description /t REG_SZ /d "[Description]" /f
reg add "HKCU\Software\Microsoft\Office\Excel\Addins\[Add-in ID]" /v FriendlyName /t REG_SZ /d "[Name]" /f
reg add "HKCU\Software\Microsoft\Office\Excel\Addins\[Add-in ID]" /v LoadBehavior /t REG_DWORD /d 3 /f
```

## File System Checks

### Add-in File Locations

Excel add-ins can be stored in various locations depending on their type and installation scope:

#### 1. COM Add-ins
- User-specific: Variable locations defined in registry
- Machine-wide: Typically in Program Files directories
- Example: `C:\Program Files\[Vendor]\[Add-in Name]\`

#### 2. Excel Add-ins (.xla, .xlam)
- User-specific: `C:\Users\[Username]\AppData\Roaming\Microsoft\AddIns\`
- Machine-wide: `C:\Program Files\Microsoft Office\Office16\Library\`
- Trusted locations: Custom directories specified in Trust Center

#### 3. Office Store Add-ins
- `C:\Users\[Username]\AppData\Local\Microsoft\Office\16.0\Wef\`
- `C:\Users\[Username]\AppData\Local\Microsoft\Office\16.0\Wef\[Manifests or WebExtensions]\`

#### 4. VBA Add-ins
- Excel startup folder: `C:\Users\[Username]\AppData\Roaming\Microsoft\Excel\XLSTART\`
- Alternate startup folder: `C:\Program Files\Microsoft Office\Office16\XLSTART\`

### File System Check Process

#### 1. Verify Add-in File Existence

Check if the add-in files exist in the expected locations:

```powershell
# Get add-in location from registry for COM add-ins
$addinPath = (Get-ItemProperty -Path "HKCU:\Software\Classes\CLSID\[Class ID]\InprocServer32" -Name "(Default)").("(Default)")
Test-Path $addinPath

# Check standard Excel add-in locations
Test-Path "C:\Users\$env:USERNAME\AppData\Roaming\Microsoft\AddIns\[Add-in Name].xlam"
```

#### 2. Check File Permissions

Verify proper permissions for add-in files:

```powershell
# Get current permissions
icacls "[Path to Add-in File]"

# Grant necessary permissions
icacls "[Path to Add-in File]" /grant "[Username]:(RX)"
```

#### 3. Check File Integrity

Verify the add-in file isn't corrupted:

```powershell
# Get file hash
Get-FileHash "[Path to Add-in File]" -Algorithm SHA256

# Compare with known good hash
if ((Get-FileHash "[Path to Add-in File]").Hash -eq "[Known Good Hash]") {
    Write-Host "File integrity verified"
} else {
    Write-Host "File may be corrupted"
}
```

#### 4. Scan for Missing Dependencies

Check for missing dependencies using tools like Dependency Walker:

```powershell
# Check DLL dependencies
dumpbin /dependents "[Path to Add-in DLL]"
```

### File System Repair Techniques

#### 1. Restore Add-in Files

If add-in files are missing or corrupted, restore them:

```powershell
# Copy from backup or source location
Copy-Item "[Source Path]" -Destination "[Destination Path]" -Force
```

#### 2. Reset Permissions

Fix permission issues:

```powershell
# Reset permissions to defaults
icacls "[Path to Add-in File]" /reset

# Grant specific permissions
icacls "[Path to Add-in File]" /grant "Users:(RX)" /grant "Administrators:(F)"
```

#### 3. Clear Office Cache Files

Clear cached add-in files:

```powershell
# Close all Office applications first
Stop-Process -Name "excel" -Force -ErrorAction SilentlyContinue

# Clear Office cache
Remove-Item "$env:LOCALAPPDATA\Microsoft\Office\16.0\Wef\*" -Recurse -Force
```

#### 4. Repair Office Installation

Use Office repair functionality to fix system files:

```powershell
# Run Office repair through control panel
# Alternative: use Office Setup with repair parameter
Start-Process "C:\Program Files\Microsoft Office\Office16\OSPP.VBS" -ArgumentList "/repair"
```

## Advanced Diagnostic Techniques

### Registry Monitoring with Process Monitor

1. Download and run Process Monitor
2. Set filters:
   - Process Name is excel.exe
   - Operation is RegOpenKey
   - Path contains "Addins"
3. Launch Excel and observe registry access
4. Look for "ACCESS DENIED" or "NAME NOT FOUND" results

### File Access Monitoring

1. In Process Monitor, set filters:
   - Process Name is excel.exe
   - Operation is ReadFile, WriteFile
   - Path contains add-in name or location
2. Launch Excel with the add-in
3. Observe file access patterns and errors

### Automated Add-in Registry Analysis

Use PowerShell to automate registry analysis:

```powershell
function Analyze-ExcelAddins {
    $addinsPaths = @(
        "HKCU:\Software\Microsoft\Office\Excel\Addins\*",
        "HKLM:\Software\Microsoft\Office\Excel\Addins\*",
        "HKLM:\Software\WOW6432Node\Microsoft\Office\Excel\Addins\*"
    )
    
    foreach($path in $addinsPaths) {
        if(Test-Path $path) {
            Get-ChildItem $path | ForEach-Object {
                $addin = $_
                $addinName = $addin.PSChildName
                $loadBehavior = (Get-ItemProperty $addin.PSPath).LoadBehavior
                
                Write-Host "Add-in: $addinName"
                Write-Host "Registry Path: $($addin.PSPath)"
                Write-Host "Load Behavior: $loadBehavior"
                
                # Check if DLL exists for COM add-ins
                $clsid = $addinName
                $clsidPath = "HKLM:\Software\Classes\CLSID\$clsid\InprocServer32"
                if(Test-Path $clsidPath) {
                    $dllPath = (Get-ItemProperty $clsidPath).'(default)'
                    $dllExists = Test-Path $dllPath
                    Write-Host "DLL Path: $dllPath"
                    Write-Host "DLL Exists: $dllExists"
                }
                
                Write-Host "-------------------"
            }
        }
    }
}

Analyze-ExcelAddins
```

## Special Cases

### Office 365 Click-to-Run Considerations

Office 365 Click-to-Run (C2R) installations have some special considerations:

1. Registry virtualization:
   - Office may use virtualized registry locations
   - Check C2R-specific registry paths

2. File system restrictions:
   - Some directories may be protected or reset during updates
   - Avoid placing add-ins in Office program directories

3. Update impact:
   - Updates may reset certain registry values
   - Consider using user-specific locations for persistence

### Troubleshooting Strategies for Different Office Versions

| Office Version | Registry Path Variations | Notes |
|----------------|-------------------------|-------|
| Office 2016/2019/365 | ...\16.0\... | Most current versions use 16.0 |
| Office 2013 | ...\15.0\... | Check for legacy paths |
| Office 2010 | ...\14.0\... | May require legacy support |
| Mixed Environment | Multiple version paths | Check all applicable paths |

### Terminal Server/Citrix Environments

Special considerations for multi-user environments:

1. User profile loading:
   - Registry hives loaded/unloaded with user sessions
   - Consider using mandatory profiles for consistency

2. Permission model:
   - More restrictive permissions on shared systems
   - May need special accommodation for add-ins

3. File location strategies:
   - Use UNC paths for centralized storage
   - Consider application virtualization for complex add-ins

## Documentation and Reporting

When performing registry and file system checks, document the following:

1. **Registry State**
   - Exact paths checked
   - Key values found
   - Modifications made

2. **File System State**
   - File locations
   - Permissions
   - File versions and timestamps

3. **Repair Actions**
   - Commands executed
   - Before and after snapshots
   - Manual changes made

4. **Environment Information**
   - Office version and update channel
   - Windows version and update status
   - User permissions and context

## Related Documents
- [COM Add-in Troubleshooting](COM%20Add-in%20Troubleshooting.md)
- [Add-in Installation and Activation Issues](Add-in%20Installation%20and%20Activation%20Issues.md)
- [Advanced Troubleshooting Techniques](Advanced%20Troubleshooting%20Techniques.md)
- [Diagnostic Steps](Diagnostic%20Steps.md)
