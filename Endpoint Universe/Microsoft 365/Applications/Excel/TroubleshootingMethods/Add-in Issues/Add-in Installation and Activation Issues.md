# Add-in Installation and Activation Issues

## Overview

Installation and activation issues are among the most common problems with Excel add-ins. These issues can prevent add-ins from appearing in Excel, cause them to appear but not load, or result in specific error messages during startup. This document covers the diagnosis and resolution of these issues across different types of Excel add-ins.

## Common Installation and Activation Issues

### 1. Add-in Not Appearing in Excel

#### Symptoms
- Add-in does not appear in the add-ins list
- Add-in installer completes successfully but add-in cannot be found
- Add-in was previously available but disappeared after updates

#### Causes
- Incorrect installation location
- Registry entry issues
- Installation performed with insufficient permissions
- Incompatible add-in version
- Installation in wrong Office architecture (32-bit vs. 64-bit)

#### Diagnostic Steps
1. Verify Excel version and architecture (32-bit vs 64-bit)
   - File > Account > About Excel
   - Look for "32-bit" or "64-bit" in the version information

2. Check Add-in Lists in Excel
   - File > Options > Add-ins
   - Review all three sections: Active Application Add-ins, Inactive Application Add-ins, and Document-Related Add-ins
   - Check different add-in types: COM Add-ins, Excel Add-ins, etc.

3. Verify Installation Location
   - COM Add-ins: Check registry entries
   - Excel Add-ins: Verify in standard add-in locations
   - Office Store Add-ins: Check Office account association

4. Review Installation Logs
   - Check application installation logs for errors
   - Review Windows event logs for installation failures

#### Resolution Steps

##### For COM Add-ins
1. Verify registry keys exist in:
   - `HKEY_CURRENT_USER\Software\Microsoft\Office\Excel\Addins\[AddInID]`
   - `HKEY_LOCAL_MACHINE\Software\Microsoft\Office\Excel\Addins\[AddInID]`

2. Reinstall add-in with administrator privileges:
   - Right-click installer > Run as administrator
   - Ensure installing correct version for Excel architecture

3. Register COM add-in manually:
   ```
   regsvr32 "C:\Path\to\addin.dll"
   ```

##### For Excel Add-ins (.xla/.xlam)
1. Place add-in file in standard add-in location:
   - `C:\Users\[Username]\AppData\Roaming\Microsoft\AddIns`
   - `C:\Program Files\Microsoft Office\Office[Version]\Library`

2. Add add-in manually through Excel:
   - File > Options > Add-ins
   - Manage: Excel Add-ins > Go
   - Browse to the add-in file location

3. Check file permissions on add-in file:
   - Right-click file > Properties > Security
   - Ensure user has Read and Execute permissions

##### For Office Store Add-ins
1. Verify Microsoft account sign-in:
   - File > Account
   - Ensure user is signed in with the correct account

2. Refresh Office Store connection:
   - Insert > Get Add-ins
   - Sign out and sign back in to Office Store

3. Check internet connectivity and proxy settings:
   - Test connection to Office Store URLs
   - Verify proxy configuration if applicable

### 2. Add-in Listed But Not Loading

#### Symptoms
- Add-in appears in add-ins list but shows as inactive
- Add-in is checked/enabled but doesn't function
- "Load Behavior" shows as "Unloaded" or "Load Failed"

#### Causes
- Add-in crashed during previous session
- Missing dependencies
- Security or trust settings blocking add-in
- Corrupted add-in file
- Conflicting add-ins

#### Diagnostic Steps
1. Check Disabled Items list:
   - File > Options > Add-ins
   - Manage: Disabled Items > Go
   - See if add-in appears in this list

2. Review "Load Behavior" status for COM add-ins:
   - File > Options > Add-ins
   - Manage: COM Add-ins > Go
   - Note the load behavior for problematic add-ins

3. Check for error messages during Excel startup:
   - Launch Excel from command line with logging:
     ```
     excel.exe /l
     ```
   - Review log files in %TEMP%\Excel\Excel[n].log

4. Test in safe mode to check for conflicts:
   - Hold Ctrl while launching Excel
   - Or launch with: `excel.exe /safe`

#### Resolution Steps

##### For Disabled Items
1. Re-enable from Disabled Items list:
   - File > Options > Add-ins > Manage: Disabled Items > Go
   - Select the add-in and click "Enable"
   - Restart Excel

2. Reset the disabled items list (last resort):
   - Close Excel
   - Navigate to: `%APPDATA%\Microsoft\Excel\`
   - Rename or delete XLSTART folder
   - Restart Excel

##### For COM Add-ins with Load Failures
1. Check and install missing dependencies:
   - Use Dependency Walker to identify missing DLLs
   - Install required components (e.g., Visual C++ Redistributables)

2. Repair Office installation:
   - Control Panel > Programs > Programs and Features
   - Select Microsoft Office > Change > Repair

3. Re-register the COM add-in:
   ```
   regsvr32 /u "C:\Path\to\addin.dll"
   regsvr32 "C:\Path\to\addin.dll"
   ```

##### For Excel Add-ins (.xla/.xlam)
1. Adjust macro security settings:
   - File > Options > Trust Center > Trust Center Settings
   - Macro Settings > Enable all macros (temporarily for testing)
   - Trusted Locations > Add new location for add-in folder

2. Check for file corruption:
   - Create backup of add-in file
   - Try to open the add-in file directly in Excel
   - Replace with clean copy if available

##### For Office Store Add-ins
1. Clear Office cache:
   - Close all Office applications
   - Delete contents of: `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`
   - Restart Excel

2. Reinstall the add-in:
   - Remove from My Add-ins
   - Reinstall from Office Store

### 3. Activation Errors and Prompts

#### Symptoms
- Error messages during add-in activation
- Repeated activation prompts
- Licensing or registration failures
- "Compiled error in hidden module" messages

#### Causes
- Expired or invalid licenses
- Incorrect registration information
- VBA project corruption
- Missing references in VBA projects
- Network connectivity issues for license validation

#### Diagnostic Steps
1. Document exact error messages and codes

2. Check add-in license status:
   - Review license information in add-in's "About" dialog
   - Verify expiration dates
   - Check for activation status

3. Test network connectivity:
   - Verify connection to license servers
   - Test on alternative network if possible

4. For VBA errors, examine references:
   - Alt+F11 to open VBA editor
   - Tools > References
   - Look for "MISSING:" references

#### Resolution Steps

##### For License/Activation Issues
1. Update license information:
   - Launch add-in activation/registration process
   - Enter correct license key or credentials
   - Contact vendor for license reset if necessary

2. Check system date and time:
   - Ensure system clock is accurate
   - Incorrect dates can cause license validation failures

3. Clear cached credentials:
   - Control Panel > Credential Manager
   - Remove saved credentials for the add-in
   - Re-enter when prompted

##### For VBA Reference Issues
1. Fix broken references:
   - Alt+F11 to open VBA editor
   - Tools > References
   - Uncheck "MISSING:" references
   - Add correct references as needed

2. Recompile VBA project:
   - Alt+F11 to open VBA editor
   - Debug > Compile VBA Project

##### For Persistent Activation Prompts
1. Check registry settings for add-in activation:
   - Look for values in HKCU and HKLM Office add-in keys
   - Ensure "LoadBehavior" is set to 3 (loaded and connected)

2. Clear Office activation cache:
   - Close all Office applications
   - Delete contents of: `%LOCALAPPDATA%\Microsoft\Office\16.0\Licensing\`
   - Restart Excel

## Advanced Troubleshooting

### Logging and Monitoring

1. Enable advanced add-in logging:
   ```
   reg add HKCU\Software\Microsoft\Office\16.0\Excel\Options /v AddinLoadBehaviorLog /t REG_DWORD /d 1
   ```

2. Use Process Monitor to track add-in loading:
   - Filter for excel.exe process
   - Monitor file and registry access during add-in loading
   - Look for "ACCESS DENIED" or "NOT FOUND" results

3. Review extended Office logs:
   - Enable Office logging: File > Options > Advanced > Enable logging
   - Review logs in %TEMP%\Office\

### Installation Mode Considerations

1. Click-to-Run vs. MSI differences:
   - Different installation paths
   - Different registry locations
   - Different update mechanisms

2. Per-user vs. per-machine installations:
   - Check for conflicts between user and machine installations
   - Verify appropriate permission levels
   - Consider standardizing on one approach

3. Terminal Server/Citrix environments:
   - Special considerations for shared environments
   - Use of mandatory profiles
   - Application virtualization impacts

## Prevention Best Practices

1. Standardize add-in deployment:
   - Use consistent installation methods
   - Document add-in versions and compatibility requirements
   - Create standard operating procedures for updates

2. Testing protocol for add-ins:
   - Test in isolated environment before deployment
   - Verify compatibility with existing add-ins
   - Document baseline performance

3. Add-in inventory management:
   - Maintain central registry of approved add-ins
   - Track versions and compatibility information
   - Schedule regular review of deployed add-ins

## Related Documents
- [Diagnostic Steps](Diagnostic%20Steps.md)
- [COM Add-in Troubleshooting](COM%20Add-in%20Troubleshooting.md)
- [Security and Trust Settings](Security%20and%20Trust%20Settings.md)
- [Registry and File System Checks](Registry%20and%20File%20System%20Checks.md)
- [Office Store Add-in Troubleshooting](Office%20Store%20Add-in%20Troubleshooting.md)
