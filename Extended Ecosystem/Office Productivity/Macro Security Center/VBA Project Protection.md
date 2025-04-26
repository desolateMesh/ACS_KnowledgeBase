# VBA Project Protection

## Overview

Microsoft Office VBA (Visual Basic for Applications) projects contain the code that powers macros, add-ins, and automation solutions. While these projects provide powerful functionality, they also represent a significant security risk if not properly protected. This document outlines a comprehensive approach to securing VBA projects in an enterprise environment, preventing unauthorized viewing, modification, or exploitation of VBA code.

## Protection Mechanisms

VBA project protection operates at multiple levels:

1. **Viewing Protection**: Prevents users from viewing VBA code
2. **Modification Protection**: Prevents unauthorized changes to VBA code
3. **Execution Control**: Manages when and how VBA code can run
4. **Distribution Security**: Secures VBA projects during deployment
5. **Runtime Monitoring**: Detects suspicious behaviors during execution

## Implementing VBA Project Password Protection

### Basic Protection

The most fundamental form of VBA project protection is password protection, which prevents casual users from viewing or modifying the code:

1. **In the VBA Editor (Alt+F11)**:
   - Right-click the project in the Project Explorer
   - Select "Project Properties"
   - Go to the "Protection" tab
   - Check "Lock project for viewing"
   - Enter and confirm a strong password
   - Click "OK"

```vb
' Sample code to programmatically protect a VBA project
Sub ProtectVBAProject()
    Dim VBProj As Object
    Dim Password As String
    
    Password = "StrongP@ssw0rd123!"  ' Use a secure password generation method
    
    ' Get reference to the VBA project
    Set VBProj = ThisWorkbook.VBProject
    
    ' Set protection
    VBProj.Protection = 1  ' 1 = Locked for viewing
    VBProj.WritePassword Password
    
    MsgBox "VBA Project has been protected with a password", vbInformation
End Sub
```

### Limitations of Basic Protection

Standard VBA password protection has several critical limitations:

1. Protection is easily bypassed using freely available tools
2. Password is stored in the file with weak encryption
3. No audit trail of access attempts
4. Same protection level for all users

## Enterprise-Grade VBA Protection

For organizations requiring stronger security, a multi-layered approach is necessary:

### 1. Digital Signing

Digital signatures ensure code integrity and authenticity:

```powershell
# PowerShell script to configure certificate for VBA signing
# Run on administrative workstation

# 1. Create certificate request
$cert = New-SelfSignedCertificate -Subject "CN=Contoso VBA Code Signing" -CertStoreLocation Cert:\CurrentUser\My -Type CodeSigningCert -KeyUsage DigitalSignature -KeySpec Signature -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" -KeyExportPolicy Exportable

# 2. Export certificate for distribution
$CertPassword = ConvertTo-SecureString -String "CertificateP@ssw0rd" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "C:\Certificates\ContosoVBASigning.pfx" -Password $CertPassword

# 3. Export public certificate for trust
Export-Certificate -Cert $cert -FilePath "C:\Certificates\ContosoVBASigning.cer"

# 4. Add to trusted publishers store via Group Policy
certutil -addstore -f -enterprise TrustedPublisher "C:\Certificates\ContosoVBASigning.cer"
```

### 2. Code Access Security (CAS) Policy

Implement Group Policy settings to control VBA execution:

```xml
<!-- Group Policy Administrative Template Excerpt -->
<policy name="VBAMacroSecurity" class="Machine" displayName="$(string.VBAMacroSecurity)" explainText="$(string.VBAMacroSecurity_Help)" key="Software\Policies\Microsoft\Office\16.0\Common\Security" valueName="VBASecurityLevel">
  <parentCategory ref="SecuritySettings" />
  <supportedOn ref="windows:SUPPORTED_Windows7" />
  <elements>
    <enum id="VBAMacroSecurity" valueName="VBAMacroSecurity" required="true">
      <item displayName="$(string.VBASecurityLevel_NoWarning)">
        <value>
          <decimal value="1" />
        </value>
      </item>
      <item displayName="$(string.VBASecurityLevel_Warning)">
        <value>
          <decimal value="2" />
        </value>
      </item>
      <item displayName="$(string.VBASecurityLevel_DigitalSignaturesOnly)">
        <value>
          <decimal value="3" />
        </value>
      </item>
      <item displayName="$(string.VBASecurityLevel_DisableAll)">
        <value>
          <decimal value="4" />
        </value>
      </item>
    </enum>
  </elements>
</policy>
```

### 3. Advanced VBA Project Encryption

Standard VBA protection can be enhanced with custom encryption solutions:

```vb
' Advanced VBA project protection using custom encryption
' Store this in a separate, secured module

Option Explicit

Private Const ENCRYPTION_KEY As String = "YourOrganizationSecretKey2024!"

' Encrypt VBA code before storing
Public Function EncryptModule(ModuleCode As String) As String
    Dim i As Long
    Dim keyPos As Long
    Dim encryptedCode As String
    
    encryptedCode = ""
    keyPos = 1
    
    For i = 1 To Len(ModuleCode)
        Dim charAsc As Integer
        Dim keyAsc As Integer
        Dim encAsc As Integer
        
        charAsc = Asc(Mid$(ModuleCode, i, 1))
        keyAsc = Asc(Mid$(ENCRYPTION_KEY, keyPos, 1))
        
        ' XOR encryption
        encAsc = charAsc Xor keyAsc
        
        encryptedCode = encryptedCode & Chr$(encAsc)
        
        keyPos = keyPos + 1
        If keyPos > Len(ENCRYPTION_KEY) Then keyPos = 1
    Next i
    
    EncryptModule = encryptedCode
End Function

' Decrypt VBA code when needed
Public Function DecryptModule(EncryptedCode As String) As String
    Dim i As Long
    Dim keyPos As Long
    Dim decryptedCode As String
    
    decryptedCode = ""
    keyPos = 1
    
    For i = 1 To Len(EncryptedCode)
        Dim encAsc As Integer
        Dim keyAsc As Integer
        Dim charAsc As Integer
        
        encAsc = Asc(Mid$(EncryptedCode, i, 1))
        keyAsc = Asc(Mid$(ENCRYPTION_KEY, keyPos, 1))
        
        ' XOR decryption (same operation as encryption with XOR)
        charAsc = encAsc Xor keyAsc
        
        decryptedCode = decryptedCode & Chr$(charAsc)
        
        keyPos = keyPos + 1
        If keyPos > Len(ENCRYPTION_KEY) Then keyPos = 1
    Next i
    
    DecryptModule = decryptedCode
End Function

' Load module only when proper authentication is provided
Public Function LoadProtectedModule(ModuleName As String, UserCredential As String) As Boolean
    ' Implementation of authentication logic here
    If Not AuthenticateUser(UserCredential) Then
        LoadProtectedModule = False
        Exit Function
    End If
    
    ' Load the encrypted module from custom storage
    Dim encryptedCode As String
    encryptedCode = GetStoredModuleCode(ModuleName)
    
    ' Decrypt the code
    Dim moduleCode As String
    moduleCode = DecryptModule(encryptedCode)
    
    ' Import the code into a temporary module
    On Error GoTo ErrorHandler
    Dim tempModule As Object
    Set tempModule = ThisWorkbook.VBProject.VBComponents.Add(1) ' 1 = vbext_ct_StdModule
    tempModule.CodeModule.AddFromString moduleCode
    
    LoadProtectedModule = True
    Exit Function
    
ErrorHandler:
    LoadProtectedModule = False
End Function

' Implement secure authentication
Private Function AuthenticateUser(Credential As String) As Boolean
    ' Connect to enterprise authentication system
    ' This would typically interface with Active Directory or other identity provider
    ' Simplified example:
    
    Dim authService As Object
    On Error Resume Next
    Set authService = CreateObject("Contoso.AuthenticationService")
    
    If authService Is Nothing Then
        ' Fallback to local validation if service unavailable
        AuthenticateUser = (Credential = "LocalOverridePassword")
    Else
        AuthenticateUser = authService.ValidateCredential(Credential, "VBAAccess")
    End If
End Function

' Retrieve encrypted module code from secure storage
Private Function GetStoredModuleCode(ModuleName As String) As String
    ' In a real implementation, this would likely retrieve from:
    ' 1. Custom document properties (encrypted)
    ' 2. External secure database
    ' 3. Secured file in protected location
    
    ' Simplified example using custom document property
    On Error Resume Next
    GetStoredModuleCode = ThisWorkbook.CustomDocumentProperties("EncModule_" & ModuleName).Value
    
    If Err.Number <> 0 Then
        GetStoredModuleCode = ""
    End If
End Function
```

### 4. Runtime Protection

Implement runtime monitoring to detect and prevent suspicious behaviors:

```vb
' Runtime protection handler
' Add to ThisWorkbook module

Private WithEvents App As Application

Private Sub Workbook_Open()
    Set App = Application
    InitializeSecurityMonitoring
End Sub

Private Sub App_WorkbookBeforeSave(ByVal Wb As Workbook, ByVal SaveAsUI As Boolean, Cancel As Boolean)
    ' Check for potential unauthorized modifications to VBA project
    If Wb.Name = ThisWorkbook.Name Then
        If VBAProjectHasChanged() Then
            ' Log the attempt
            LogSecurityEvent "Unauthorized VBA modification attempt detected before save"
            
            ' Optionally prevent save
            If Not UserHasModificationRights() Then
                MsgBox "You do not have permission to save changes to the VBA project.", vbCritical
                Cancel = True
            End If
        End If
    End If
End Sub

Private Function VBAProjectHasChanged() As Boolean
    ' Implementation would compare current VBA project state
    ' with a stored hash or other integrity check
    ' This is a placeholder for the concept
    
    Static ProjectHash As String
    
    If ProjectHash = "" Then
        ' First run, store the hash
        ProjectHash = CalculateVBAProjectHash()
        VBAProjectHasChanged = False
    Else
        ' Compare current hash with stored hash
        Dim currentHash As String
        currentHash = CalculateVBAProjectHash()
        
        VBAProjectHasChanged = (currentHash <> ProjectHash)
    End If
End Function

Private Function CalculateVBAProjectHash() As String
    ' In a real implementation, this would:
    ' 1. Extract all code from all modules
    ' 2. Calculate a cryptographic hash (SHA-256 recommended)
    ' 3. Return the hash as a string
    
    ' Placeholder implementation
    CalculateVBAProjectHash = "HashImplementationNeeded"
End Function

Private Sub InitializeSecurityMonitoring()
    ' Setup event hooks and monitoring
    ' Initialize security logging
    
    ' Example: Hook Windows API for deeper monitoring
    SetupAPIHooks
    
    ' Log initialization
    LogSecurityEvent "VBA Security monitoring initialized"
End Sub

Private Sub SetupAPIHooks()
    ' In a real implementation, this would set up hooks to monitor
    ' potentially dangerous API calls from VBA
    ' Requires advanced Windows API knowledge
    
    ' Note: This concept requires external library support
    ' and would typically be implemented via an add-in
End Sub

Private Function UserHasModificationRights() As Boolean
    ' Check if current user has rights to modify VBA
    ' Typically would check against Active Directory group membership
    
    ' Simplified example:
    Dim userName As String
    userName = Environ("USERNAME")
    
    ' Check against list of authorized developers
    UserHasModificationRights = IsUserInGroup(userName, "VBA_Developers")
End Function

Private Function IsUserInGroup(userName As String, groupName As String) As Boolean
    ' In a real implementation, this would query Active Directory
    ' For simplified example, check against a stored list
    
    Dim authorizedUsers As String
    authorizedUsers = GetSetting("CompanyVBASecurity", "AuthGroups", groupName, "")
    
    IsUserInGroup = (InStr(1, authorizedUsers, userName, vbTextCompare) > 0)
End Function

Private Sub LogSecurityEvent(eventDescription As String)
    ' Log security events to centralized system
    ' Options include:
    ' 1. Windows Event Log
    ' 2. Network logging server
    ' 3. Secure audit file
    
    ' Simplified example - write to secure log file
    Dim logFile As String
    logFile = "C:\SecurityLogs\VBASecurity.log"
    
    On Error Resume Next
    
    Open logFile For Append As #1
    Print #1, Now & vbTab & Environ("USERNAME") & vbTab & ThisWorkbook.Name & vbTab & eventDescription
    Close #1
    
    ' If enterprise logging is available, use it
    On Error Resume Next
    Dim logService As Object
    Set logService = CreateObject("Contoso.SecurityLogging")
    
    If Not logService Is Nothing Then
        logService.LogEvent "VBASecurity", eventDescription, 2 ' 2 = Warning level
    End If
End Sub
```

## Deployment Strategies

### Option 1: Centralized Management via VSTO Add-in

For maximum security, deploy VBA protection via a Visual Studio Tools for Office (VSTO) Add-in:

```csharp
// C# VSTO Add-in for enterprise VBA security management
// This is a conceptual example - full implementation would require significantly more code

using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Runtime.InteropServices;
using Microsoft.Office.Core;
using Microsoft.Office.Interop.Excel;
using System.DirectoryServices.AccountManagement;

namespace Contoso.Office.VBASecurity
{
    public class VBASecurityManager
    {
        private const string EVENT_SOURCE = "Contoso VBA Security";
        private const string EVENT_LOG = "Application";
        
        // Registry key for trusted signature list
        private const string TRUSTED_SIGS_KEY = @"Software\Contoso\VBASecurity\TrustedSignatures";
        
        public void SecureVBAProject(Microsoft.Office.Interop.Excel.Workbook workbook)
        {
            try
            {
                // Check if current user has rights to access VBA project
                if (!CurrentUserHasVBAAccess())
                {
                    throw new UnauthorizedAccessException("User does not have rights to access VBA projects");
                }
                
                // Get reference to VBA project
                Microsoft.Vbe.Interop.VBProject vbaProject = workbook.VBProject;
                
                // Apply enterprise password
                string securePassword = GenerateSecurePassword();
                vbaProject.Protection = Microsoft.Vbe.Interop.vbext_ProjectProtection.vbext_pp_locked;
                vbaProject.WritePassword(securePassword);
                
                // Store password securely in enterprise vault
                StorePasswordInSecureVault(workbook.Name, securePassword);
                
                // Add digital signature if not already signed
                if (!ProjectIsSigned(vbaProject))
                {
                    SignVBAProject(workbook);
                }
                
                // Calculate and store integrity hash
                string projectHash = CalculateVBAProjectHash(vbaProject);
                StoreProjectHash(workbook.Name, projectHash);
                
                // Log the security operation
                LogSecurityEvent($"VBA Project in {workbook.Name} has been secured", 
                                System.Diagnostics.EventLogEntryType.Information);
            }
            catch (Exception ex)
            {
                LogSecurityEvent($"Error securing VBA project: {ex.Message}", 
                                System.Diagnostics.EventLogEntryType.Error);
                throw;
            }
        }
        
        private bool CurrentUserHasVBAAccess()
        {
            try
            {
                // Check if user is member of VBA Developers group
                using (PrincipalContext context = new PrincipalContext(ContextType.Domain))
                {
                    UserPrincipal user = UserPrincipal.Current;
                    GroupPrincipal group = GroupPrincipal.FindByIdentity(context, "VBA_Developers");
                    
                    if (user != null && group != null)
                    {
                        return user.IsMemberOf(group);
                    }
                }
                
                return false;
            }
            catch
            {
                // Fallback to local check if domain check fails
                return IsUserInLocalAdmins();
            }
        }
        
        private bool IsUserInLocalAdmins()
        {
            // Simplified check - in real implementation would properly check local admin group
            return System.Security.Principal.WindowsIdentity.GetCurrent().Name.EndsWith("Administrator");
        }
        
        private string GenerateSecurePassword()
        {
            // Generate a cryptographically secure password
            using (RNGCryptoServiceProvider rng = new RNGCryptoServiceProvider())
            {
                byte[] tokenData = new byte[32];
                rng.GetBytes(tokenData);
                
                // Convert to Base64 and take first 20 chars - strong enough for VBA protection
                return Convert.ToBase64String(tokenData).Substring(0, 20);
            }
        }
        
        private void StorePasswordInSecureVault(string documentName, string password)
        {
            // In a real implementation, this would store the password in a secure
            // enterprise credential vault like Azure Key Vault or HashiCorp Vault
            
            // Simplified example using a local encrypted file
            string encryptedPassword = EncryptString(password);
            string vaultPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "Contoso\\VBASecurity\\PasswordVault.dat");
                
            // Ensure directory exists
            Directory.CreateDirectory(Path.GetDirectoryName(vaultPath));
            
            // Store in format: DocumentName|EncryptedPassword
            using (StreamWriter writer = File.AppendText(vaultPath))
            {
                writer.WriteLine($"{documentName}|{encryptedPassword}");
            }
            
            // Set secure ACLs on the file
            SetSecureFilePermissions(vaultPath);
        }
        
        private string EncryptString(string plainText)
        {
            // This would use proper encryption in a real implementation
            // Simplified example using Protected Data API
            byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] encryptedBytes = ProtectedData.Protect(
                plainBytes, 
                null, 
                DataProtectionScope.LocalMachine);
                
            return Convert.ToBase64String(encryptedBytes);
        }
        
        private bool ProjectIsSigned(Microsoft.Vbe.Interop.VBProject vbaProject)
        {
            // Check if the project has a valid digital signature
            try
            {
                dynamic signatureInfo = vbaProject.Signature;
                return signatureInfo != null && signatureInfo.IsValid;
            }
            catch
            {
                return false;
            }
        }
        
        private void SignVBAProject(Microsoft.Office.Interop.Excel.Workbook workbook)
        {
            // In a real implementation, this would:
            // 1. Save the workbook if needed
            // 2. Use a secure certificate from certificate store 
            // 3. Call signtool.exe or other signing utility
            
            // Conceptual example:
            string filePath = workbook.FullName;
            if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath))
            {
                throw new InvalidOperationException("Workbook must be saved before signing");
            }
            
            // Call external signing tool
            System.Diagnostics.Process signingProcess = new System.Diagnostics.Process();
            signingProcess.StartInfo.FileName = "signtool.exe";
            signingProcess.StartInfo.Arguments = $"sign /a /n \"Contoso VBA Code Signing\" \"{filePath}\"";
            signingProcess.StartInfo.UseShellExecute = false;
            signingProcess.StartInfo.RedirectStandardOutput = true;
            signingProcess.StartInfo.CreateNoWindow = true;
            
            signingProcess.Start();
            string output = signingProcess.StandardOutput.ReadToEnd();
            signingProcess.WaitForExit();
            
            if (signingProcess.ExitCode != 0)
            {
                throw new InvalidOperationException($"Failed to sign VBA project: {output}");
            }
        }
        
        private string CalculateVBAProjectHash(Microsoft.Vbe.Interop.VBProject vbaProject)
        {
            // Extract all code from all modules and calculate hash
            StringBuilder allCode = new StringBuilder();
            
            foreach (Microsoft.Vbe.Interop.VBComponent component in vbaProject.VBComponents)
            {
                Microsoft.Vbe.Interop.CodeModule codeModule = component.CodeModule;
                if (codeModule.CountOfLines > 0)
                {
                    allCode.AppendLine("--- Module: " + component.Name + " ---");
                    allCode.AppendLine(codeModule.get_Lines(1, codeModule.CountOfLines));
                }
            }
            
            // Calculate SHA-256 hash
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(allCode.ToString()));
                return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            }
        }
        
        private void StoreProjectHash(string documentName, string hash)
        {
            // Store hash in secure location for later verification
            // This could be a database, secure file, or registry
            
            // Example using registry (would need admin rights)
            try
            {
                Microsoft.Win32.Registry.LocalMachine.CreateSubKey(
                    $"SOFTWARE\\Contoso\\VBASecurity\\ProjectHashes\\{documentName}")
                    .SetValue("Hash", hash);
            }
            catch (Exception ex)
            {
                LogSecurityEvent($"Failed to store project hash: {ex.Message}",
                               System.Diagnostics.EventLogEntryType.Warning);
            }
        }
        
        private void LogSecurityEvent(string message, System.Diagnostics.EventLogEntryType eventType)
        {
            // Log to Windows Event Log
            if (!System.Diagnostics.EventLog.SourceExists(EVENT_SOURCE))
            {
                System.Diagnostics.EventLog.CreateEventSource(EVENT_SOURCE, EVENT_LOG);
            }
            
            System.Diagnostics.EventLog.WriteEntry(EVENT_SOURCE, message, eventType);
            
            // Could also log to SIEM system or other enterprise logging
        }
        
        private void SetSecureFilePermissions(string filePath)
        {
            // Set proper NTFS permissions on sensitive files
            // This is a placeholder - real implementation would use proper ACL configuration
            
            // Example would configure ACLs to restrict to specific groups
            // such as IT Administrators and VBA Developers
        }
    }
}
```

### Option 2: Group Policy Deployment

For broader organizational deployment, use Group Policy and registry settings:

```powershell
# PowerShell script to configure VBA security via registry
# Deploy through Group Policy as a startup script

# 1. Configure Office security settings
$officeVersions = @("16.0", "15.0") # Office 2016/2019/365, 2013
$officeApps = @("Excel", "Word", "PowerPoint", "Access", "Outlook")

foreach ($version in $officeVersions) {
    foreach ($app in $officeApps) {
        $appPath = "HKLM:\SOFTWARE\Policies\Microsoft\Office\$version\$app"
        $securityPath = "$appPath\Security"
        
        # Ensure paths exist
        if (!(Test-Path $appPath)) {
            New-Item -Path $appPath -Force | Out-Null
        }
        if (!(Test-Path $securityPath)) {
            New-Item -Path $securityPath -Force | Out-Null
        }
        
        # VBA Security Settings
        Set-ItemProperty -Path $securityPath -Name "VBAWarnings" -Value 2 -Type DWord
        
        # Trust access settings
        $trustAccessPath = "$securityPath\Trusted Locations"
        if (!(Test-Path $trustAccessPath)) {
            New-Item -Path $trustAccessPath -Force | Out-Null
        }
        
        # Disable user-defined trusted locations
        Set-ItemProperty -Path $trustAccessPath -Name "AllowUserLocations" -Value 0 -Type DWord
    }
}

# 2. Install trusted certificates for VBA signing
$certPath = "\\domain\netlogon\Certificates\VBASigning.cer"
if (Test-Path $certPath) {
    # Import to Trusted Publishers store
    Import-Certificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\TrustedPublisher
}

# 3. Configure developer workstation exceptions (based on security group membership)
$isDeveloper = $false

# Check if computer is in VBA developer group
$computerName = $env:COMPUTERNAME
$domain = $env:USERDOMAIN

try {
    $searcher = [adsisearcher]"(&(objectCategory=computer)(name=$computerName))"
    $computerObj = $searcher.FindOne()
    
    if ($computerObj) {
        $computerDN = $computerObj.Properties["distinguishedname"]
        
        # Check group membership
        $groupSearcher = [adsisearcher]"(&(objectCategory=group)(name=VBA_DeveloperWorkstations))"
        $groupObj = $groupSearcher.FindOne()
        
        if ($groupObj) {
            $groupDN = $groupObj.Properties["distinguishedname"]
            
            # Check if computer is member of group
            $memberSearcher = [adsisearcher]"(&(objectCategory=computer)(memberOf=$groupDN)(name=$computerName))"
            $isDeveloper = ($memberSearcher.FindOne() -ne $null)
        }
    }
} catch {
    # AD query failed, use fallback method
    # Check for presence of developer marker file
    $isDeveloper = Test-Path "C:\ProgramData\Contoso\VBADeveloper.marker"
}

# If developer workstation, apply special settings
if ($isDeveloper) {
    foreach ($version in $officeVersions) {
        foreach ($app in $officeApps) {
            $securityPath = "HKLM:\SOFTWARE\Policies\Microsoft\Office\$version\$app\Security"
            
            # Allow access to VBA project
            Set-ItemProperty -Path $securityPath -Name "AccessVBOM" -Value 1 -Type DWord
            
            # Developer-specific trust settings (still require digital signature)
            Set-ItemProperty -Path $securityPath -Name "VBAWarnings" -Value 3 -Type DWord
        }
    }
}
```

### Option 3: Azure Information Protection

For enterprises with Microsoft 365, integrate VBA protection with Azure Information Protection:

```powershell
# PowerShell script for Azure Information Protection configuration
# Run with AIPService module installed

# 1. Connect to AIP service
Connect-AipService

# 2. Create template for VBA-enabled documents
$templateName = "VBA-Protected Documents"
$templateDescription = "Template for documents with protected VBA code"

$rights = @("VIEW", "VIEWRIGHTSDATA", "EDIT", "DOCEDIT")
$developersGroup = "VBA_Developers@contoso.com"

$developerRights = @("VIEW", "VIEWRIGHTSDATA", "EDIT", "DOCEDIT", "EXTRACT", "PRINT", "OWNER")

# Create template
$template = New-AipServiceRightsDefinition -Rights $rights
$developerTemplate = New-AipServiceRightsDefinition -Rights $developerRights -Identity $developersGroup

$templates = @($template, $developerTemplate)

New-AipServiceTemplate -Names @{Default=$templateName} -Descriptions @{Default=$templateDescription} -RightsDefinitions $templates

# 3. Configure automatic protection for VBA-containing documents
Set-AipServiceConfiguration -EnableLabelByCustomProperty $true

# 4. Publish policy that applies template automatically
$policy = Get-AipServicePolicy
$newLabel = New-AipServiceLabel -Title "VBA Protected" -Tooltip "Documents containing VBA code" -Name "vba-protected" -Comment "Protected VBA document policy"

Set-AipServiceLabel -Identity $newLabel.ID -Protection @{TemplateId=$template.Id}

# Add label to policy
Set-AipServicePolicy -AddLabel $newLabel.ID

# 5. Configure auto-labeling
$conditionText = "ObjectModel.HasVBA"
$autoLabelCondition = New-AipServiceAutoLabelCondition -Condition $conditionText -Type Property

Set-AipServicePolicy -AdvancedSettings @{AutoLabelConditions=$autoLabelCondition.ID}
```

## Security Monitoring

### Event Detection Rules

Implement the following detection rules for VBA security:

1. **Unauthorized VBA Access Attempts**
   - Monitor for failed password attempts on VBA projects
   - Track access to VBA projects outside of approved processes
   - Alert on attempts to modify VBA code without proper permissions

2. **Digital Signature Verification Failures**
   - Monitor for attempts to load unsigned VBA code
   - Track digital signature validation failures
   - Alert on attempts to circumvent signature checks

3. **Suspicious VBA Runtime Behavior**
   - Detect attempts to run Windows API calls from VBA
   - Monitor file I/O operations from VBA code
   - Track network connection attempts from VBA

### Sample SIEM Rule (Splunk)

```
# Splunk search for detecting suspicious VBA activity
index=windows source="WinEventLog:Application" EventCode=7016 
    (Message="*VBA*" OR Message="*Visual Basic*") 
    (Message="*password*" OR Message="*signature*" OR Message="*CreateObject*" OR 
     Message="*Shell*" OR Message="*ActiveX*" OR Message="*DllRegisterServer*" OR
     Message="*CallWindowProc*")
| stats count by Computer, Message, User
| where count > 3
| sort -count
```

### PowerShell Monitoring Script

```powershell
# PowerShell script for monitoring VBA access
# Run as scheduled task or background process

function Monitor-VBAAccess {
    param (
        [string]$LogPath = "C:\SecurityLogs\VBAAccess.log",
        [string]$AlertThreshold = 3
    )
    
    # Create log directory if it doesn't exist
    $logDir = Split-Path -Path $LogPath -Parent
    if (!(Test-Path $logDir)) {
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    
    # Get Office processes
    $officeProcesses = Get-Process | Where-Object { 
        $_.ProcessName -match "excel|word|powerpnt|msaccess|outlook"
    }
    
    foreach ($process in $officeProcesses) {
        # Get process details
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)"
        $userName = $processInfo.GetOwner().User
        $domain = $processInfo.GetOwner().Domain
        
        # Check for VBA project access
        $hasVBOM = $false
        try {
            $officeApp = [System.Runtime.InteropServices.Marshal]::GetActiveObject($process.ProcessName)
            if ($officeApp) {
                try {
                    # Try to access VBA project
                    $vbaProject = $officeApp.VBE.ActiveVBProject
                    if ($vbaProject) {
                        $hasVBOM = $true
                    }
                } catch {
                    # Access denied to VBA project
                }
            }
        } catch {
            # Could not get active object
        }
        
        if ($hasVBOM) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $logEntry = "$timestamp,$domain\$userName,$($process.ProcessName),$($process.Id),VBA_Access"
            
            # Append to log
            Add-Content -Path $LogPath -Value $logEntry
            
            # Check if this user has exceeded threshold
            $recentLogs = Get-Content -Path $LogPath | Where-Object { 
                $_ -match "$domain\\$userName" -and
                $_ -match "VBA_Access" -and
                [DateTime]::ParseExact($_.Split(',')[0], "yyyy-MM-dd HH:mm:ss", $null) -gt (Get-Date).AddHours(-1)
            }
            
            if ($recentLogs.Count -gt $AlertThreshold) {
                # Alert on suspicious activity
                $alertMessage = "ALERT: Excessive VBA project access by $domain\$userName ($($recentLogs.Count) in the last hour)"
                
                # Log to Event Log
                New-EventLog -LogName Application -Source "VBA Security Monitoring" -ErrorAction SilentlyContinue
                Write-EventLog -LogName Application -Source "VBA Security Monitoring" -EventId 7016 -EntryType Warning -Message $alertMessage
                
                # Could also send email alert, create ticket, etc.
            }
        }
    }
}

# Run monitoring function
Monitor-VBAAccess
```

## Remediation Procedures

### Handling Compromised VBA Projects

1. **Immediate Response**
   - Isolate affected documents
   - Revoke digital signatures if compromised
   - Block document sharing

2. **Forensic Analysis**
   - Extract VBA code for analysis
   - Determine the nature of the compromise
   - Identify entry point and exploit method

3. **Recovery Actions**
   - Restore from secure backup
   - Re-sign with new certificates
   - Apply additional protections

### Step-by-Step Incident Response

```powershell
# PowerShell Incident Response Script for Compromised VBA
# Run by security team during incident

param (
    [Parameter(Mandatory=$true)]
    [string]$DocumentPath,
    
    [Parameter(Mandatory=$true)]
    [string]$CaseNumber,
    
    [Parameter(Mandatory=$false)]
    [string]$ForensicsFolder = "C:\Forensics\VBA"
)

# 1. Create case folder
$caseFolder = Join-Path -Path $ForensicsFolder -ChildPath $CaseNumber
New-Item -Path $caseFolder -ItemType Directory -Force | Out-Null

# 2. Copy document for analysis (preserving original)
$documentName = Split-Path -Path $DocumentPath -Leaf
$documentCopy = Join-Path -Path $caseFolder -ChildPath $documentName
Copy-Item -Path $DocumentPath -Destination $documentCopy -Force

# 3. Create evidence log
$logPath = Join-Path -Path $caseFolder -ChildPath "investigation-log.txt"
"Timestamp,Action,Details" | Out-File -FilePath $logPath -Encoding utf8

function Log-Evidence {
    param (
        [string]$Action,
        [string]$Details
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp,$Action,$Details" | Out-File -FilePath $logPath -Append -Encoding utf8
}

Log-Evidence -Action "CaseInitiated" -Details "Document: $documentName"

# 4. Extract metadata
$metadataPath = Join-Path -Path $caseFolder -ChildPath "metadata.txt"
try {
    $objShell = New-Object -ComObject Shell.Application
    $objFolder = $objShell.NameSpace((Split-Path -Path $DocumentPath -Parent))
    $objFile = $objFolder.ParseName((Split-Path -Path $DocumentPath -Leaf))
    
    $metadata = @()
    for ($i = 0; $i -lt 300; $i++) {
        $name = $objFolder.GetDetailsOf($null, $i)
        $value = $objFolder.GetDetailsOf($objFile, $i)
        
        if ($name -and $value) {
            $metadata += "$name`: $value"
        }
    }
    
    $metadata | Out-File -FilePath $metadataPath -Encoding utf8
    Log-Evidence -Action "MetadataExtracted" -Details "Saved to: metadata.txt"
} catch {
    Log-Evidence -Action "MetadataExtractionFailed" -Details $_.Exception.Message
}

# 5. Check digital signature
$signaturePath = Join-Path -Path $caseFolder -ChildPath "signature.txt"
try {
    $signature = Get-AuthenticodeSignature -FilePath $DocumentPath
    $signatureInfo = @(
        "Signature Status: $($signature.Status)",
        "Signer Certificate: $($signature.SignerCertificate.Subject)",
        "Timestamp: $($signature.TimeStamperCertificate)",
        "Valid From: $($signature.SignerCertificate.NotBefore)",
        "Valid To: $($signature.SignerCertificate.NotAfter)",
        "Issuer: $($signature.SignerCertificate.Issuer)",
        "Thumbprint: $($signature.SignerCertificate.Thumbprint)"
    )
    
    $signatureInfo | Out-File -FilePath $signaturePath -Encoding utf8
    Log-Evidence -Action "SignatureVerified" -Details "Status: $($signature.Status)"
} catch {
    Log-Evidence -Action "SignatureVerificationFailed" -Details $_.Exception.Message
}

# 6. Extract VBA code (requires Office installed)
$vbaOutputFolder = Join-Path -Path $caseFolder -ChildPath "VBACode"
New-Item -Path $vbaOutputFolder -ItemType Directory -Force | Out-Null

try {
    # This part requires Office to be installed
    $extension = [System.IO.Path]::GetExtension($DocumentPath).ToLower()
    
    switch ($extension) {
        ".xlsx" { $appId = "Excel.Application" }
        ".docx" { $appId = "Word.Application" }
        ".pptx" { $appId = "PowerPoint.Application" }
        ".xlsm" { $appId = "Excel.Application" }
        ".docm" { $appId = "Word.Application" }
        ".pptm" { $appId = "PowerPoint.Application" }
        default { throw "Unsupported file type: $extension" }
    }
    
    $app = New-Object -ComObject $appId
    $app.Visible = $false
    $app.DisplayAlerts = $false
    
    try {
        $doc = $app.Workbooks.Open($documentCopy)  # For Excel
    } catch {
        try {
            $doc = $app.Documents.Open($documentCopy)  # For Word
        } catch {
            $doc = $app.Presentations.Open($documentCopy)  # For PowerPoint
        }
    }
    
    for ($i = 1; $i -le $doc.VBProject.VBComponents.Count; $i++) {
        $component = $doc.VBProject.VBComponents.Item($i)
        $moduleName = $component.Name
        $moduleType = $component.Type  # 1=Standard, 2=Class, 3=Form, etc.
        
        # Extract code
        $moduleCode = $component.CodeModule.Lines(1, $component.CodeModule.CountOfLines)
        $moduleTypeName = switch ($moduleType) {
            1 { "StdModule" }
            2 { "ClassModule" }
            3 { "Form" }
            11 { "ActiveXDesigner" }
            100 { "Document" }
            default { "Unknown" }
        }
        
        $outputPath = Join-Path -Path $vbaOutputFolder -ChildPath "$moduleName-$moduleTypeName.bas"
        $moduleCode | Out-File -FilePath $outputPath -Encoding utf8
        
        Log-Evidence -Action "VBACodeExtracted" -Details "Module: $moduleName, Type: $moduleTypeName"
    }
    
    # Check for suspicious code patterns
    $suspiciousPatterns = @(
        "Shell",
        "CreateObject",
        "WScript.Shell",
        "ActiveX",
        "RegWrite",
        "ExecuteExcel4Macro",
        "CallByName",
        "URLDownloadToFile",
        "WebRequest",
        "HTTP",
        "Environ",
        "ShellExecute",
        "CallWindowProc",
        "Base64",
        "DllRegisterServer",
        "HKEY_",
        "Chr\([0-9]+\)"
    )
    
    $suspiciousFindings = @()
    
    foreach ($file in Get-ChildItem -Path $vbaOutputFolder -Filter "*.bas") {
        $content = Get-Content -Path $file.FullName -Raw
        
        foreach ($pattern in $suspiciousPatterns) {
            if ($content -match $pattern) {
                $contextLines = ($content -split "`n" | Select-String -Pattern $pattern -Context 2,2)
                $suspiciousFindings += "File: $($file.Name), Pattern: $pattern, Context: $contextLines"
            }
        }
    }
    
    if ($suspiciousFindings.Count -gt 0) {
        $findingsPath = Join-Path -Path $caseFolder -ChildPath "suspicious-findings.txt"
        $suspiciousFindings | Out-File -FilePath $findingsPath -Encoding utf8
        Log-Evidence -Action "SuspiciousCodeFound" -Details "Count: $($suspiciousFindings.Count), See: suspicious-findings.txt"
    } else {
        Log-Evidence -Action "NoSuspiciousCodeFound" -Details "None of the known patterns detected"
    }
    
    # Close document and application
    $doc.Close($false)
    $app.Quit()
    
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
    
} catch {
    Log-Evidence -Action "VBAExtractionFailed" -Details $_.Exception.Message
}

# 7. Run anti-malware scan on document
try {
    Start-Process -FilePath "C:\Program Files\Windows Defender\MpCmdRun.exe" -ArgumentList "-Scan -ScanType 3 -File `"$documentCopy`"" -Wait -NoNewWindow
    Log-Evidence -Action "AntiMalwareScanCompleted" -Details "Windows Defender scan completed"
} catch {
    Log-Evidence -Action "AntiMalwareScanFailed" -Details $_.Exception.Message
}

# 8. Create report
$reportPath = Join-Path -Path $caseFolder -ChildPath "investigation-report.txt"
$logContent = Get-Content -Path $logPath
$reportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$report = @"
# VBA Security Incident Investigation Report
## Case Number: $CaseNumber
## Date: $reportDate
## Document: $documentName

### Investigation Timeline
$($logContent | ForEach-Object { $_ })

### Findings
- Digital Signature: $(if (Test-Path $signaturePath) { (Get-Content -Path $signaturePath -First 1) } else { "Not verified" })
- Suspicious Code: $(if (Test-Path (Join-Path -Path $caseFolder -ChildPath "suspicious-findings.txt")) { "DETECTED - See suspicious-findings.txt" } else { "None detected" })
- Recommendation: [TO BE FILLED BY INVESTIGATOR]

### Next Steps
1. [TO BE FILLED BY INVESTIGATOR]
2. [TO BE FILLED BY INVESTIGATOR]
3. [TO BE FILLED BY INVESTIGATOR]

### Investigator Notes
[TO BE FILLED BY INVESTIGATOR]
"@

$report | Out-File -FilePath $reportPath -Encoding utf8
Log-Evidence -Action "ReportGenerated" -Details "Report created: investigation-report.txt"

Write-Output "VBA Security Incident Response completed for case $CaseNumber"
Write-Output "Evidence and reports available at: $caseFolder"
```

## Compliance and Best Practices

### Regulatory Considerations

VBA security requirements vary by industry:

| Industry | Standard | VBA Requirements |
|----------|----------|-----------------|
| Finance  | PCI DSS  | Digitally signed macros only, VBA code review for all financial calculations |
| Healthcare | HIPAA | Access controls for VBA, audit logs of VBA execution with PHI |
| Government | NIST 800-53 | Application whitelisting, code signing, integrity verification |
| Manufacturing | ISO 27001 | Change control for VBA code, segregation of duties |

### Best Practices Checklist

- [ ] Implement VBA password protection on all projects
- [ ] Deploy digital code signing for all VBA projects
- [ ] Configure Group Policy to enforce macro security
- [ ] Implement runtime monitoring for suspicious behaviors
- [ ] Establish VBA code review procedures
- [ ] Document all authorized VBA developers and projects
- [ ] Train users on macro security awareness
- [ ] Implement regular scanning of VBA-enabled documents
- [ ] Configure centralized logging of VBA security events
- [ ] Establish incident response procedures for VBA-related incidents

## References

- [Microsoft Documentation: VBA Security](https://docs.microsoft.com/en-us/office/vba/library-reference/concepts/security-considerations-for-office-vba-macros)
- [NIST Special Publication 800-53: Security Controls](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)
- [OWASP: Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [CIS Microsoft Office Security Benchmark](https://www.cisecurity.org/benchmark/microsoft_office/)

## Appendix

### VBA Security Glossary

| Term | Definition |
|------|------------|
| VBA Project | Collection of modules, forms, and classes that make up a macro project |
| Digital Signature | Cryptographic signature that verifies code authenticity and integrity |
| Trusted Publisher | Entity whose digital certificates are trusted to sign code |
| Code Access Security | Framework for controlling what code can do at runtime |
| VBA Password | Basic protection mechanism for VBA projects |
| Trust Center | Office security management interface |
| VSTO | Visual Studio Tools for Office - framework for Office extensions |
| Protected View | Restricted mode for opening documents from untrusted sources |

### Advanced VBA Security Tools

1. **Microsoft EMET (Enhanced Mitigation Experience Toolkit)**
   - Configure for Office applications
   - Adds protection against memory-based attacks

2. **Process Monitor**
   - Track file and registry operations from VBA
   - Identify suspicious behaviors

3. **AppLocker**
   - Restrict which macro-enabled documents can run
   - Enforce application control policies

4. **Office Telemetry Dashboard**
   - Track macro usage across organization
   - Identify unauthorized VBA projects

### Security Architecture Diagram

```
┌───────────────────────────────┐     ┌───────────────────────────────┐
│                               │     │                               │
│  Enterprise Certificate       │     │  Group Policy                 │
│  Authority                    │     │  Management                   │
│                               │     │                               │
└───────────────────────────────┘     └───────────────────────────────┘
           │                                       │
           │                                       │
           ▼                                       ▼
┌───────────────────────────────┐     ┌───────────────────────────────┐
│                               │     │                               │
│  Code Signing                 │     │  Security Policy              │
│  Infrastructure               │     │  Deployment                   │
│                               │     │                               │
└───────────────────────────────┘     └───────────────────────────────┘
           │                                       │
           │                                       │
           ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                        VBA Security Framework                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │                 │   │                 │   │                 │   │
│  │  Viewing        │   │  Modification   │   │  Execution      │   │
│  │  Protection     │   │  Protection     │   │  Control        │   │
│  │                 │   │                 │   │                 │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │                 │   │                 │   │                 │   │
│  │  Distribution   │   │  Runtime        │   │  Incident       │   │
│  │  Security       │   │  Monitoring     │   │  Response       │   │
│  │                 │   │                 │   │                 │   │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           │                    │                    │
           ▼                    ▼                    ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│                   │  │                   │  │                   │
│  Developer        │  │  End-User         │  │  Security         │
│  Workstations     │  │  Workstations     │  │  Monitoring       │
│                   │  │                   │  │                   │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Sample Enterprise VBA Security Policy

```
# Contoso Corporation VBA Security Policy

## Purpose
This policy defines the security requirements for VBA code development, 
distribution, and execution within Contoso Corporation.

## Scope
This policy applies to all VBA code in Microsoft Office documents used 
within Contoso Corporation, regardless of origin.

## Policy Requirements

### 1. Development Requirements
1.1. All VBA development must be performed by authorized developers
1.2. VBA development must only occur on designated developer workstations
1.3. All VBA code must undergo peer review before production use
1.4. VBA code must not contain hardcoded credentials or sensitive data
1.5. VBA code must be properly commented and documented

### 2. Protection Requirements
2.1. All VBA projects must have password protection enabled
2.2. VBA project passwords must follow corporate password complexity requirements
2.3. VBA project passwords must be stored in the corporate password vault
2.4. VBA projects must be locked for viewing

### 3. Distribution Requirements
3.1. All production VBA code must be digitally signed
3.2. Digital signatures must use corporate-approved certificates
3.3. Distribution of VBA-enabled documents must occur through approved channels
3.4. VBA-enabled documents must be registered in the central inventory

### 4. Execution Requirements
4.1. Only signed macros from trusted publishers may be executed
4.2. Users may not override macro security settings
4.3. Temporary exceptions require security team approval
4.4. All macro executions must be logged for audit purposes

## Enforcement
Violations of this policy may result in disciplinary action up to and 
including termination of employment or business relationship.

## Exceptions
Exceptions to this policy must be approved by the Information Security 
Officer and documented in the risk register.
```
