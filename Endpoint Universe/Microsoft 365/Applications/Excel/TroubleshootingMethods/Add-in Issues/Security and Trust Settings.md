# Security and Trust Settings for Excel Add-ins

## Overview

Excel's security and trust settings play a crucial role in add-in functionality. These settings are designed to protect users from potentially harmful code, but they can also prevent legitimate add-ins from loading or functioning properly. This document covers the various security settings that affect Excel add-ins, how to diagnose security-related issues, and how to appropriately configure security settings while maintaining organizational security standards.

## Excel Security Architecture

### Security Components Affecting Add-ins

Excel's security model includes several components that can impact add-in behavior:

1. **Trust Center**
   - Central location for security settings in Excel
   - Controls macro security, trusted locations, trusted publishers, and add-in behavior

2. **Protected View**
   - Isolated "sandbox" environment for opening potentially risky files
   - Restricts add-in loading and functionality

3. **Document Trust**
   - File-level trust settings
   - Can override certain global security settings

4. **Application Trust**
   - Controls whether add-ins can run without prompting
   - Determines which add-ins are considered trusted

5. **Digital Signatures**
   - Verifies the identity of add-in publishers
   - Validates add-in integrity

### Security Layers

Excel implements security in multiple layers, all of which must allow an add-in to function properly:

1. **Windows Security**
   - User Account Control (UAC)
   - File system permissions
   - Registry access controls

2. **Office Security**
   - Trust Center global settings
   - Add-in loading policies
   - Macro security settings

3. **Excel-Specific Security**
   - Excel add-in trust settings
   - Worksheet protection
   - VBA project protection

4. **Add-in-Specific Security**
   - Add-in's own security requirements
   - Licensing verification
   - Feature access controls

## Common Security-Related Add-in Issues

### 1. Add-ins Blocked by Macro Security

#### Symptoms
- Add-in doesn't load
- "Macros are disabled" message appears
- Security warning appears in the message bar

#### Causes
- Macro security level set too high
- Add-in not from trusted publisher
- Unsigned add-in code
- Add-in located in untrusted location

#### Diagnostic Steps
1. Check current macro security level:
   - File > Options > Trust Center > Trust Center Settings > Macro Settings

2. Verify if the add-in is digitally signed:
   - Right-click the add-in file > Properties > Digital Signatures tab
   - Note whether a valid signature is present

3. Check trusted publishers list:
   - File > Options > Trust Center > Trust Center Settings > Trusted Publishers
   - Verify if the add-in's publisher is listed

4. Check if the add-in location is trusted:
   - File > Options > Trust Center > Trust Center Settings > Trusted Locations
   - Compare with the add-in's file location

#### Resolution Steps
1. Adjust macro security level:
   - For testing: Set to "Enable all macros" (not recommended for permanent use)
   - For production: Set to "Disable all macros with notification" and use trusted locations

2. Add the add-in location to trusted locations:
   - File > Options > Trust Center > Trust Center Settings > Trusted Locations
   - Click "Add new location"
   - Browse to the folder containing the add-in
   - Check "Subfolders of this location are also trusted" if needed

3. Add publisher to trusted publishers:
   - When prompted by a security warning, click "Enable Content"
   - Select "Trust all documents from this publisher"

4. Create a properly signed version of the add-in:
   - Obtain a valid code signing certificate
   - Sign the add-in using appropriate tools

### 2. Add-ins Blocked by Protected View

#### Symptoms
- "Protected View" banner appears at the top of Excel
- Add-ins don't load when file is in Protected View
- Limited functionality until file is actively enabled

#### Causes
- File opened from internet location
- File in Outlook attachment
- File in potentially unsafe location
- File blocked by File Block settings

#### Diagnostic Steps
1. Verify if Protected View is active:
   - Look for "Protected View" banner at the top of Excel
   - Check if file was opened from internet or email

2. Check Protected View settings:
   - File > Options > Trust Center > Trust Center Settings > Protected View
   - Note which Protected View options are enabled

3. Check File Block settings:
   - File > Options > Trust Center > Trust Center Settings > File Block Settings
   - Verify if the file type is being blocked

#### Resolution Steps
1. Click "Enable Editing" in the Protected View banner:
   - This takes the file out of Protected View for the current session
   - Add-ins should then be able to load

2. Adjust Protected View settings:
   - File > Options > Trust Center > Trust Center Settings > Protected View
   - Uncheck specific Protected View options as needed
   - Note: Disabling Protected View reduces security protections

3. Save file to trusted location:
   - Save the file to a location designated as trusted
   - Reopen the file from the trusted location

4. Modify File Block settings:
   - File > Options > Trust Center > Trust Center Settings > File Block Settings
   - Adjust settings for specific file types
   - Set "Open behavior" to "Open selected file types in Protected View and allow editing"

### 3. ActiveX and COM Security Issues

#### Symptoms
- "Cannot create ActiveX control" error
- COM add-in doesn't initialize
- Add-in loads but ActiveX components don't function

#### Causes
- ActiveX controls disabled in Trust Center
- Internet Explorer security settings
- Kill bit set for specific controls
- Missing ActiveX registrations

#### Diagnostic Steps
1. Check ActiveX settings in Trust Center:
   - File > Options > Trust Center > Trust Center Settings > ActiveX Settings
   - Note current settings

2. Check Internet Explorer security settings:
   - Internet Explorer > Tools > Internet Options > Security
   - Verify ActiveX settings for appropriate zones

3. Check for kill bits:
   - Registry locations for ActiveX kill bits:
     ```
     HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Internet Explorer\ActiveX Compatibility\{CLSID}
     ```
   - Look for "Compatibility Flags" DWORD with value containing 0x00000400

4. Verify ActiveX registration:
   - Use OleView tool to check component registration
   - Check if the control is properly registered

#### Resolution Steps
1. Adjust ActiveX settings in Trust Center:
   - File > Options > Trust Center > Trust Center Settings > ActiveX Settings
   - Set to "Prompt me before enabling all controls with minimal restrictions"
   - For internal applications, consider "Enable all controls without restrictions"

2. Modify Internet Explorer security settings:
   - Set appropriate zone for the add-in location
   - Adjust ActiveX settings for that zone

3. Remove kill bits (if appropriate):
   - Note: Kill bits are often set for security reasons
   - Only remove if absolutely necessary and the control is from a trusted source
   - Delete the registry key or change the Compatibility Flags value

4. Re-register ActiveX components:
   ```
   regsvr32 "[Path to ActiveX Control]"
   ```

### 4. Add-in Certification and Signature Issues

#### Symptoms
- "Digital signature is invalid" warnings
- Add-in blocked due to untrusted publisher
- Certificate-related errors during add-in loading

#### Causes
- Expired digital certificate
- Untrusted certificate authority
- Broken signature due to file modification
- Certificate not installed in trusted root store

#### Diagnostic Steps
1. Check certificate details:
   - Right-click add-in file > Properties > Digital Signatures
   - Select the signature > Details > View Certificate
   - Note validity period, issuer, and status

2. Verify certificate chain:
   - In certificate details, select "Certification Path" tab
   - Check if all certificates in the chain are valid

3. Check trusted root certificates:
   - In certificate dialog, check if the root CA is trusted
   - Verify if intermediate certificates are properly installed

4. Examine signature timestamp:
   - Check if the signature includes a timestamp
   - Verify if the timestamp is from a trusted timestamp authority

#### Resolution Steps
1. Install certificates in trusted stores:
   - Open certificate details > Install Certificate
   - Select "Current User" or "Local Machine" store
   - Place root CA certificate in "Trusted Root Certification Authorities"
   - Place intermediate certificates in "Intermediate Certification Authorities"

2. Update add-in with valid signature:
   - Obtain an updated version with valid signature
   - If internal add-in, re-sign with current certificate

3. Trust publisher when prompted:
   - When security warning appears, select "Trust all from publisher"
   - This adds the publisher to the Trusted Publishers list

4. For expired certificates with valid timestamp:
   - If signature was timestamped when certificate was valid
   - Trust the publisher explicitly in Trusted Publishers list

### 5. Group Policy Restrictions

#### Symptoms
- Add-ins consistently blocked despite local settings
- Security settings cannot be changed
- "Some settings are managed by your system administrator" messages

#### Causes
- Group Policy settings override user preferences
- Organization-wide security policies
- Administrative templates applying restrictions

#### Diagnostic Steps
1. Run Group Policy Results:
   ```
   gpresult /h gpresult.html
   ```
   - Open the HTML file and search for Office/Excel policies

2. Check effective policy settings:
   - Registry locations for policy-enforced settings:
     ```
     HKEY_CURRENT_USER\Software\Policies\Microsoft\Office\16.0\Excel\Security
     HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Office\16.0\Excel\Security
     ```

3. Identify specific blocking policies:
   - Look for settings related to:
     - VBA Macro Notification Settings
     - Trusted Locations
     - Trusted Publishers
     - Add-in Behavior

4. Check for application management policies:
   - AppLocker or other application control policies
   - Software Restriction Policies
   - Windows Defender Application Control policies

#### Resolution Steps
1. Document policy conflicts:
   - Identify which policies are blocking the add-in
   - Document business justification for changing policy

2. Request policy exceptions:
   - Contact IT administrators with specific policy adjustment request
   - Provide documentation of business impact

3. Implement targeted policy adjustments:
   - Security groups for users requiring add-in access
   - Security filtering for GPOs
   - Item-level targeting for preference items

4. Alternative solutions:
   - Use Office add-ins (web-based) which have different security model
   - Repackage add-in to meet security requirements
   - Develop alternative workflow not requiring the blocked functionality

## Trust Center Configuration Guide

### Optimal Security Settings for Different Scenarios

#### Development Environment
- Macro Settings: Enable all macros
- Trust access to VBA project object model: Enabled
- Trusted Locations: Development directories added
- ActiveX Settings: Enable all controls
- Purpose: Maximum flexibility for testing and development

#### Standard Business Environment
- Macro Settings: Disable all macros with notification
- Trust access to VBA project object model: Disabled
- Trusted Locations: Specific business application directories
- Trusted Publishers: Approved vendor certificates
- Protected View: Enabled for Internet and Attachment files
- Purpose: Balance of security and functionality

#### High-Security Environment
- Macro Settings: Disable all macros except digitally signed macros
- Trust access to VBA project object model: Disabled
- Trusted Locations: Minimal, tightly controlled locations
- Trusted Publishers: Strictly vetted certificates
- Protected View: All options enabled
- File Block Settings: Restrictive settings
- Purpose: Maximum security with carefully managed exceptions

### Creating a Trusted Location Strategy

Trusted locations allow Excel to open files with reduced security restrictions, making them ideal for legitimate add-ins.

#### Best Practices for Trusted Locations

1. **Principle of Least Privilege**
   - Add only the minimum necessary locations
   - Use subfolder restrictions where appropriate
   - Consider read-only trusted locations

2. **Network Location Considerations**
   - Only trust network locations with proper access controls
   - Consider disabling "Allow Trusted Locations on my network"
   - Use UNC paths rather than mapped drives

3. **Documentation Requirements**
   - Document all trusted locations
   - Include business justification
   - Note owner/responsible party
   - Include review date

4. **Implementation Strategy**
   - Use Group Policy to enforce organization-wide trusted locations
   - Consider using path variables for flexibility
   - Implement regular audit and review process

#### Sample Trusted Location Implementation

1. **Departmental Structure**
   ```
   \\server\finance\excel-addins\     (Finance department add-ins)
   \\server\hr\excel-addins\          (HR department add-ins)
   \\server\common\excel-addins\      (Company-wide add-ins)
   ```

2. **User-Specific Add-ins**
   ```
   %APPDATA%\Microsoft\Excel\Trusted\  (User-specific trusted location)
   ```

3. **Application-Specific Folders**
   ```
   C:\Program Files\CompanyApp\Excel\  (Application-specific add-ins)
   ```

### Managing Trusted Publishers

Trusted Publishers allow Excel to trust digitally signed content from specific certificate issuers.

#### Certificate Management Process

1. **Certificate Acquisition**
   - Internal PKI or commercial certificate providers
   - Key length and algorithm requirements
   - Validity period considerations

2. **Certificate Distribution**
   - Group Policy deployment
   - Email distribution with instructions
   - Self-service portal for internal certificates

3. **Certificate Maintenance**
   - Renewal process
   - Revocation handling
   - Testing procedures for new certificates

#### Trusted Publishers Implementation

1. **Adding Publishers via Group Policy**
   - Computer Configuration > Administrative Templates > Microsoft Office > Security Settings > Trusted Publishers
   - Deploy certificates to certificate stores

2. **Manual Publisher Trust Process**
   - Document process for users
   - Verification steps before trusting
   - Approval workflow if required

3. **Certificate Revocation Checking**
   - Enable CRL checking
   - OCSP configuration
   - Handling offline scenarios

## Advanced Security Configuration

### VBA Project Access Control

VBA project access is required for add-ins that need to modify Excel's VBA environment:

1. **Trust Access to the VBA Project Object Model**
   - File > Options > Trust Center > Trust Center Settings > Macro Settings
   - Enable "Trust access to the VBA project object model"
   - Warning: This setting allows automated modification of VBA code

2. **Group Policy Control**
   - Registry key: 
     ```
     HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Excel\Security\AccessVBOM
     ```
   - 1 = Enabled, 0 = Disabled
   - Can be controlled via Group Policy

3. **Security Implications**
   - Potential for malicious code to inject into VBA projects
   - Mitigation: Use only with trusted add-ins and in controlled environments
   - Consider enabling only for specific users or groups

### Add-in Security Enforcement

Methods to ensure only approved add-ins can be loaded:

1. **Application Control Policies**
   - AppLocker rules for Excel add-in files
   - Software Restriction Policies
   - Windows Defender Application Control

2. **Add-in Management via Group Policy**
   - List of approved add-ins
   - Block unapproved add-in installation
   - Enforce add-in security requirements

3. **Centralized Add-in Deployment**
   - Controlled distribution points
   - Version management
   - Automated security scanning

### Security Monitoring and Auditing

Approaches to monitor and audit Excel add-in security:

1. **Logging and Monitoring**
   - Enable Office telemetry
   - Configure Windows event logging
   - Monitor for security exceptions

2. **Security Compliance Checking**
   - Regular audit of trusted locations
   - Verification of trusted publishers
   - Review of macro security settings

3. **Incident Response Process**
   - Document response to suspected malicious add-ins
   - Evidence collection procedures
   - Remediation steps

## Security Troubleshooting Decision Tree

Use this decision tree to diagnose and resolve Excel add-in security issues:

1. **Is the add-in loading at all?**
   - No → Check if blocked by security settings
   - Yes → Proceed to functionality check

2. **If not loading, is there a security warning?**
   - Yes → Determine warning type and follow appropriate resolution path
   - No → Check if silently blocked by policy or disabled items

3. **If security warning shows, what type?**
   - Macro security → Adjust macro settings or use trusted location
   - Digital signature → Address certificate issues
   - Protected View → Enable editing or adjust Protected View settings

4. **If add-in loads but doesn't function correctly:**
   - Check for partial security restrictions
   - Verify if specific features are being blocked
   - Test for permission or access issues

5. **If settings cannot be changed locally:**
   - Identify Group Policy restrictions
   - Request appropriate exceptions
   - Consider alternative approaches

## Related Documents
- [Overview of Excel Add-in Issues](Overview%20of%20Excel%20Add-in%20Issues.md)
- [Add-in Installation and Activation Issues](Add-in%20Installation%20and%20Activation%20Issues.md)
- [Registry and File System Checks](Registry%20and%20File%20System%20Checks.md)
- [Documentation and Ticketing](Documentation%20and%20Ticketing.md)
- [Best Practices and Prevention](Best%20Practices%20and%20Prevention.md)
