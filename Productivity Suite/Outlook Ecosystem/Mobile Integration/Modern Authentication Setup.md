# Modern Authentication Setup

## Overview

Modern Authentication in Exchange and Microsoft 365 provides enhanced security features beyond traditional basic authentication, including multi-factor authentication (MFA), conditional access, and token-based authentication mechanisms. This document provides comprehensive guidance on implementing, configuring, and troubleshooting Modern Authentication for mobile Outlook clients and other Exchange ActiveSync applications.

## Authentication Fundamentals

### Authentication Methods Comparison

Understanding authentication methods is essential for proper implementation:

| Authentication Method | Security Level | User Experience | Mobile Support | Key Features |
|----------------------|----------------|----------------|----------------|--------------|
| Basic Authentication | Low | Simple, password-only | Universal | Username/password only, no MFA, plaintext credentials |
| Modern Authentication | High | Token-based, may require additional steps | Most modern apps | OAuth 2.0, MFA support, conditional access |
| Certificate-Based | Very High | Certificate installation required | Limited | No passwords, device-bound identity, complex setup |
| Hybrid Authentication | High | Varies by configuration | Most modern apps | On-premises + cloud integration, federation |

### OAuth 2.0 Flow Overview

Modern Authentication uses OAuth 2.0, which follows this authentication flow:

1. **User initiates login**: Mobile app requests authentication
2. **App redirects to authorization server**: Microsoft Entra ID (formerly Azure AD) presents login form
3. **User authenticates**: Provides credentials, completes MFA if required
4. **Authorization server issues token**: After successful authentication
5. **App receives token**: Used for subsequent resource access
6. **Resource server validates token**: Exchange Online validates the token
7. **Access granted**: Mobile app can access mailbox data

### Token Components

Modern Authentication relies on these token types:

1. **Access Token**:
   - Short-lived (typically 1 hour)
   - Used to access protected resources
   - Contains user identity and permissions
   - Bearer token format

2. **Refresh Token**:
   - Longer-lived (up to 90 days by default)
   - Used to obtain new access tokens
   - Stored securely on device
   - Can be revoked remotely

3. **ID Token**:
   - Contains user identity information
   - Used by the client application
   - OpenID Connect standard
   - JWT (JSON Web Token) format

## Hybrid Modern Auth (HMA)

### HMA Architecture

Hybrid Modern Authentication enables modern auth for environments with both Exchange Online and on-premises Exchange:

1. **Components**:
   - Exchange Online
   - Exchange On-premises (2013 SP1 or later)
   - Microsoft Entra ID (Azure AD)
   - Azure AD Connect
   - Web Application Proxy (optional)

2. **Authentication flow**:
   - Initial authentication to Microsoft Entra ID
   - Token issuance for both cloud and on-premises
   - On-premises Exchange validates token with Azure AD

3. **Prerequisites**:
   - Azure AD Connect deployed and configured
   - Directory synchronization established
   - Exchange Server 2013 SP1 or later
   - Valid SSL certificates
   - Proper namespace planning

### HMA Configuration

To enable Hybrid Modern Authentication for on-premises Exchange:

1. **Prepare environment**:
   ```powershell
   # Verify Exchange version is compatible
   Get-ExchangeServer | Format-Table Name,AdminDisplayVersion
   
   # Check OAuth configuration
   Get-AuthConfig | Format-List *enabled*,*uri*
   
   # Ensure Azure AD Connect is properly configured
   Get-ADSyncConnector | Format-List Name,Type,ConnectorVersion
   ```

2. **Configure OAuth endpoints**:
   ```powershell
   # Set the Authorization Server configuration
   Set-AuthConfig -OAuthAuthorizationEndpointPath "https://login.microsoftonline.com/common/oauth2/authorize" -OAuthTokenEndpointPath "https://login.microsoftonline.com/common/oauth2/token"
   
   # Configure local authorization metadata
   Set-AuthConfig -LocalAuthorizationEndpointPath "https://mail.contoso.com/Microsoft-Server-ActiveSync" -LocalTokenEndpointPath "https://mail.contoso.com/Microsoft-Server-ActiveSync"
   ```

3. **Enable Hybrid Modern Authentication**:
   ```powershell
   # Enable Modern Authentication
   Set-OrganizationConfig -OAuth2ClientProfileEnabled $true
   
   # Enable HMA for on-premises
   Set-AuthConfig -OAuthAuthorizationEndpointPath "https://login.microsoftonline.com/common/oauth2/authorize" -OAuthTokenEndpointPath "https://login.microsoftonline.com/common/oauth2/token" -Confirm:$false
   
   # Update Auth configuration
   Get-AuthConfig | Set-AuthConfig -Confirm:$false
   ```

4. **Verify configuration**:
   ```powershell
   # Check Modern Auth status
   Get-OrganizationConfig | Format-List OAuth*
   
   # Verify AuthConfig
   Get-AuthConfig | Format-List *OAuth*
   
   # Restart IIS to apply changes
   Invoke-Command -ComputerName (Get-ExchangeServer).Name -ScriptBlock {iisreset /noforce}
   ```

### HMA Troubleshooting

Common issues when implementing HMA:

1. **Certificate problems**:
   - ADFS certificate expired
   - Certificate mismatch
   - Resolution: Update and validate all certificates

2. **Namespace issues**:
   - EWS URLs not accessible
   - Autodiscover misconfiguration
   - Resolution: Verify URL configuration in Get-WebServicesVirtualDirectory

3. **Azure AD Connect problems**:
   - Sync errors or mismatched attributes
   - UPN mismatch between on-premises and cloud
   - Resolution: Troubleshoot AAD Connect synchronization

## ADAL vs. MSAL Migration

### Understanding ADAL and MSAL

Microsoft authentication libraries have evolved:

1. **ADAL (Azure AD Authentication Library)**:
   - Legacy authentication library
   - Supported Azure AD v1.0 endpoint
   - Limited to organizational accounts only
   - Being deprecated

2. **MSAL (Microsoft Authentication Library)**:
   - Current modern authentication library
   - Supports Microsoft identity platform v2.0
   - Works with both organizational and personal accounts
   - Enhanced security and functionality

### Migration Process

Transition from ADAL to MSAL with these steps:

1. **Inventory ADAL dependencies**:
   - Identify applications using ADAL
   - Document version and integration points
   - Assess custom applications

2. **Update Microsoft applications**:
   - Update Office suite to current versions
   - Implement Microsoft 365 Apps update policy
   - Enable automatic updates where possible

3. **Modify custom applications**:
   - Update code to use MSAL libraries
   - Use Microsoft identity platform endpoints
   - Test authentication flows thoroughly

4. **Monitor token usage**:
   ```powershell
   # Connect to Microsoft Graph PowerShell
   Connect-MgGraph -Scopes "AuditLog.Read.All"
   
   # Get sign-in logs showing authentication library
   Get-MgAuditLogSignIn -Filter "appDisplayName eq 'Outlook Mobile'" -Top 10 | Select-Object CreatedDateTime,AppDisplayName,ClientAppUsed,AuthenticationProcessingDetails
   ```

### Handling ADAL Deprecation

Prepare for ADAL deprecation with these strategies:

1. **Conditional Access policies**:
   - Create policies to block legacy authentication
   - Implement graduated enforcement
   - Monitor for authentication failures

2. **User communication**:
   - Notify users of required app updates
   - Provide clear upgrade instructions
   - Establish support channels for issues

3. **Fallback strategy**:
   - Document exceptions process
   - Create emergency access accounts
   - Define legacy app support timeline

## Mobile App Configuration

### Outlook for iOS/Android Setup

Configure Outlook mobile apps for Modern Authentication:

1. **Prerequisites**:
   - Modern Authentication enabled in tenant
   - Appropriate licenses assigned
   - Updated app version installed

2. **App configuration**:
   - Enable "Require Managed Account" in app settings
   - Configure app protection policies (if using Intune)
   - Set authentication timeout policies

3. **Deployment methods**:
   - Direct user installation
   - Managed app deployment via MDM
   - Company Portal distribution

4. **Configuration profiles** (Intune):
   ```json
   {
     "outlook_enable_modern_auth": true,
     "outlook_refresh_token_lifetime": 90,
     "outlook_require_biometric_auth": true,
     "outlook_disable_account_adding": false
   }
   ```

### Third-Party Client Support

Managing Modern Authentication with non-Microsoft clients:

1. **Compatibility verification**:
   - Check vendor documentation for OAuth support
   - Test authentication flow before deployment
   - Identify potential limitations

2. **Common third-party clients**:
   - Nine Email: Full OAuth support
   - Samsung Email: Recent versions support OAuth
   - Gmail app: Supports OAuth for Outlook/Exchange accounts
   - Apple Mail: Supports OAuth on iOS 14+

3. **Troubleshooting third-party apps**:
   - Check app-specific OAuth implementation
   - Verify registration in Azure AD
   - Test with Microsoft's own apps for comparison

### App-Specific Passwords

For legacy applications not supporting Modern Authentication:

1. **Creating app passwords**:
   - Navigate to [https://mysignins.microsoft.com/security-info](https://mysignins.microsoft.com/security-info)
   - Select "Add method" → "App password"
   - Name the password and generate

2. **App password limitations**:
   - Bypass MFA and conditional access
   - Cannot be selectively revoked (all-or-nothing)
   - No individual password expiration options
   - Limited audit trail

3. **Implementing app password policy**:
   ```powershell
   # Check if app passwords are allowed
   Get-MsolUserByUserPrincipalName -UserPrincipalName user@contoso.com | Select-Object DisplayName,StrongPasswordRequired,StrongAuthenticationMethods
   
   # Disable app passwords for a user
   Set-MsolUser -UserPrincipalName user@contoso.com -StrongAuthenticationMethod @()
   
   # Disable app passwords at directory level
   Set-MsolCompanySettings -AllowedToUseSSPR $true -AllowedToUseSelfServicePasswordResetRegistrationMethod @("OneWaySMS","TwoWayVoice") -AllowedToUseAppPasswords $false
   ```

## Multi-Factor Authentication (MFA)

### MFA Implementation for Mobile

Enable and configure MFA for mobile users:

1. **MFA methods for mobile devices**:
   - Microsoft Authenticator app (recommended)
   - SMS verification codes
   - Phone call verification
   - OATH hardware tokens

2. **Enabling MFA**:
   ```powershell
   # Enable MFA for a specific user
   $st = New-Object -TypeName Microsoft.Online.Administration.StrongAuthenticationRequirement
   $st.RelyingParty = "*"
   $st.State = "Enabled"
   $sta = @($st)
   Set-MsolUser -UserPrincipalName user@contoso.com -StrongAuthenticationRequirements $sta
   
   # Enable MFA for a group (using Conditional Access)
   # This requires Azure AD Premium and Conditional Access policies
   ```

3. **User experience considerations**:
   - App prompts vs. browser prompts
   - Registration process guidance
   - Handling offline scenarios
   - Backup authentication methods

### Conditional Access Integration

Enhance security with context-based access control:

1. **Mobile-specific conditions**:
   - Device compliance status
   - Network location (IP address ranges)
   - Application being used
   - Risk detection

2. **Creating mobile-focused policies**:
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "Policy.Read.All","Policy.ReadWrite.ConditionalAccess"
   
   # Create policy parameters
   $conditions = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessConditionSet
   $conditions.Applications = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessApplicationCondition
   $conditions.Applications.IncludeApplications = @("Office365")
   $conditions.Users = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessUserCondition
   $conditions.Users.IncludeGroups = @("mobile-users-group-id")
   $conditions.ClientAppTypes = @("MobileAppsAndDesktopClients")
   
   $controls = New-Object -TypeName Microsoft.Open.MSGraph.Model.ConditionalAccessGrantControls
   $controls._Operator = "OR"
   $controls.BuiltInControls = @("MFA")
   
   # Create the policy
   New-MgIdentityConditionalAccessPolicy -DisplayName "Require MFA for Mobile Apps" -State "enabled" -Conditions $conditions -GrantControls $controls
   ```

3. **Testing and rollout strategy**:
   - Enable in report-only mode initially
   - Target test group before full deployment
   - Monitor sign-in logs for potential issues
   - Implement emergency access accounts

### Authentication Failure Handling

Prepare for authentication failures:

1. **Common failure scenarios**:
   - Network connectivity issues
   - Token expiration during offline period
   - MFA method unavailability
   - Device compromise detection

2. **User guidance preparation**:
   - Create clear error resolution steps
   - Provide alternative authentication options
   - Document support escalation process
   - Prepare common troubleshooting scenarios

3. **Support desk preparation**:
   - Train support staff on OAuth error codes
   - Create verification procedures
   - Establish MFA bypass protocols (temporary)
   - Document token revocation process

## Security Best Practices

### Token Lifetime Configuration

Optimize token security through lifetime settings:

1. **Default token lifetimes**:
   - Access token: 1 hour
   - Refresh token: 90 days (14 days if inactive)
   - Session token: Configurable up to 24 hours

2. **Modifying token policies** (requires Azure AD Premium):
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "Policy.ReadWrite.Authorization"
   
   # Create token lifetime policy
   $definition = @"
   {
     "TokenLifetimePolicy": {
       "Version": 1,
       "AccessTokenLifetime": "04:00:00",
       "MaxInactiveTime": "30.00:00:00",
       "MaxAgeSingleFactor": "until-revoked",
       "MaxAgeMultiFactor": "until-revoked",
       "MaxAgeSessionSingleFactor": "until-revoked",
       "MaxAgeSessionMultiFactor": "until-revoked"
     }
   }
   "@
   
   # Create the policy
   New-MgPolicyTokenLifetimePolicy -Definition $definition -DisplayName "Mobile Apps Token Policy" -IsOrganizationDefault
   ```

3. **Security considerations**:
   - Shorter lifetimes increase security but impact usability
   - Consider device type and risk profile
   - Balance offline access needs with security
   - Implement different policies for different risk levels

### Device Registration

Enhance security through device registration:

1. **Azure AD device registration**:
   - Enables device-based Conditional Access
   - Provides device identity for authentication
   - Links device to user for compliance reporting

2. **Registration process**:
   - Automatic during first authentication (modern clients)
   - MDM-initiated registration
   - User-initiated through Settings app

3. **Verification and management**:
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "Device.Read.All"
   
   # Get registered devices
   Get-MgDevice -Filter "displayName eq 'user-iPhone'" | Format-List DisplayName,OperatingSystem,OperatingSystemVersion,TrustType,ApproximateLastSignInDateTime
   
   # Check specific user's devices
   Get-MgUserRegisteredDevice -UserId "user@contoso.com" | Format-List DisplayName,DeviceId,OperatingSystem
   ```

### Token Revocation

Implement token revocation processes for security incidents:

1. **Revocation scenarios**:
   - Device loss or theft
   - User termination
   - Suspicious activity detection
   - Compliance failure

2. **Revocation methods**:
   ```powershell
   # Revoke all refresh tokens for a user
   Revoke-MgUserSignInSession -UserId "user@contoso.com"
   
   # Force password reset (revokes all tokens)
   Set-MgUserPassword -UserId "user@contoso.com" -ForceChangePasswordNextSignIn
   
   # Disable user account (most immediate)
   Update-MgUser -UserId "user@contoso.com" -AccountEnabled:$false
   ```

3. **Targeted device revocation**:
   ```powershell
   # Remove specific device
   Remove-MgUserRegisteredDevice -UserId "user@contoso.com" -DeviceId "device-id"
   
   # Block specific device from ActiveSync
   Set-CASMailbox -Identity "user@contoso.com" -ActiveSyncBlockedDeviceIDs "device-id"
   ```

## Monitoring and Reporting

### Authentication Success/Failure Monitoring

Track authentication activities for security and troubleshooting:

1. **Key metrics to monitor**:
   - Success/failure rate by authentication method
   - MFA success/failure rate
   - Token usage patterns
   - Legacy authentication attempts

2. **Azure AD Sign-in Logs**:
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "AuditLog.Read.All"
   
   # Get mobile authentication failures
   $startTime = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
   Get-MgAuditLogSignIn -Filter "clientAppUsed eq 'Mobile Apps and Desktop clients' and status/errorCode ne 0 and createdDateTime ge $startTime" | Format-Table CreatedDateTime,UserPrincipalName,AppDisplayName,Status
   
   # Get legacy authentication attempts
   Get-MgAuditLogSignIn -Filter "clientAppUsed eq 'Exchange ActiveSync' and authenticationRequirement eq 'singleFactorAuthentication'" | Format-Table CreatedDateTime,UserPrincipalName,IpAddress,Location
   ```

3. **Creating custom reports**:
   ```powershell
   # Export authentication data to CSV
   $authData = Get-MgAuditLogSignIn -Filter "appDisplayName eq 'Outlook Mobile'" -Top 1000
   $authData | Select-Object CreatedDateTime,UserPrincipalName,AppDisplayName,ClientAppUsed,DeviceDetail,Location,Status | Export-Csv -Path "C:\Reports\OutlookMobileAuth.csv" -NoTypeInformation
   ```

### User Authentication Status

Monitor and report on users' authentication methods:

1. **MFA registration status**:
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "UserAuthenticationMethod.Read.All"
   
   # Get user's authentication methods
   Get-MgUserAuthenticationMethod -UserId "user@contoso.com" | Format-Table Id,AdditionalProperties
   
   # Get users without MFA methods
   Get-MgReportAuthenticationMethodUserRegistrationDetail -Filter "isMfaRegistered eq false" | Format-Table UserPrincipalName,UserDisplayName,IsMfaRegistered
   ```

2. **Authentication method details**:
   ```powershell
   # Get users with mobile app authentication
   Get-MgReportAuthenticationMethodUserRegistrationDetail -Filter "methodsRegistered/any(m:m eq 'microsoftAuthenticatorPush')" | Format-Table UserPrincipalName,UserDisplayName
   ```

3. **Device registration report**:
   ```powershell
   # Get device registration report
   $users = Get-MgUser -Filter "userType eq 'Member'" -Top 100
   $deviceReport = @()
   foreach ($user in $users) {
       $devices = Get-MgUserRegisteredDevice -UserId $user.Id
       if ($devices) {
           foreach ($device in $devices) {
               $deviceReport += [PSCustomObject]@{
                   UserDisplayName = $user.DisplayName
                   UserPrincipalName = $user.UserPrincipalName
                   DeviceName = $device.DisplayName
                   DeviceOS = $device.OperatingSystem
                   DeviceOSVersion = $device.OperatingSystemVersion
                   LastSignIn = $device.ApproximateLastSignInDateTime
               }
           }
       }
   }
   $deviceReport | Export-Csv -Path "C:\Reports\DeviceRegistration.csv" -NoTypeInformation
   ```

### Compliance Monitoring

Ensure ongoing security compliance:

1. **Legacy authentication usage**:
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "AuditLog.Read.All"
   
   # Get legacy authentication usage
   $startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
   $legacyAuth = Get-MgAuditLogSignIn -Filter "createdDateTime ge $startDate and clientAppUsed in ('Exchange ActiveSync', 'IMAP', 'MAPI', 'Other clients', 'POP3', 'SMTP')"
   
   # Summarize by protocol
   $legacyAuth | Group-Object ClientAppUsed | Select-Object Name,Count | Sort-Object Count -Descending
   
   # Summarize by user
   $legacyAuth | Group-Object UserPrincipalName | Select-Object Name,Count | Sort-Object Count -Descending | Select-Object -First 10
   ```

2. **Conditional Access effectiveness**:
   ```powershell
   # Get Conditional Access outcomes
   $caResults = Get-MgAuditLogSignIn -Filter "conditionalAccessStatus ne 'notApplied'"
   
   # Summarize by result
   $caResults | Group-Object ConditionalAccessStatus | Select-Object Name,Count
   
   # Get policy-specific results
   $caResults | Where-Object {$_.ConditionalAccessStatus -eq "failure"} | ForEach-Object {
       $_.AppliedConditionalAccessPolicies | Where-Object {$_.Result -eq "failure"} | Select-Object DisplayName,Result
   } | Group-Object DisplayName | Select-Object Name,Count
   ```

3. **Risk detection monitoring**:
   ```powershell
   # Connect to Microsoft Graph
   Connect-MgGraph -Scopes "IdentityRiskEvent.Read.All"
   
   # Get risk detections
   Get-MgRiskDetection -Filter "riskEventType eq 'unfamiliarLocationRiskEvent'" | Format-Table DetectedDateTime,UsePrincipalName,RiskEventType,RiskLevel
   ```

## Decision Tree for Authentication Issues

```
START: Mobile Authentication Issue
├── Is Modern Authentication enabled?
│   ├── NO → Enable Modern Authentication:
│   │         1. For Exchange Online:
│   │            Set-OrganizationConfig -OAuth2ClientProfileEnabled $true
│   │         2. For Hybrid environments:
│   │            a. Configure OAuth endpoints
│   │            b. Update AuthConfig
│   │            c. Restart IIS
│   │         3. Verify Mobile app supports Modern Auth
│   │         4. Configure app-specific settings
│   └── YES → Is the app configured for Modern Auth?
│       ├── NO → Configure app settings:
│       │         1. Update to latest app version
│       │         2. Verify app supports OAuth
│       │         3. Remove and re-add account
│       │         4. Check for app-specific configurations:
│       │            a. OAuth toggle settings
│       │            b. Advanced authentication options
│       │            c. Security settings that affect auth
│       └── YES → Is MFA causing issues?
│           ├── YES → Troubleshoot MFA configuration:
│           │         1. Verify MFA registration status:
│           │            Get-MgUserAuthenticationMethod -UserId "user@contoso.com"
│           │         2. Check for MFA interruptions:
│           │            a. Network connectivity issues
│           │            b. Push notification delivery
│           │            c. Time-based code sync issues
│           │         3. Validate Conditional Access policies:
│           │            a. Report-only vs. enforced policies
│           │            b. Exclusions and inclusions
│           │            c. Device compliance requirements
│           │         4. Test with alternate MFA method
│           └── NO → Is token management the issue?
│               ├── YES → Check token configuration:
│               │         1. Verify token lifetime settings
│               │         2. Check for token revocation:
│               │            a. Password changes
│               │            b. Explicit revocation
│               │            c. Conditional Access change
│               │         3. Examine token acquisition logs:
│               │            Get-MgAuditLogSignIn for user
│               │         4. Test token refresh:
│               │            a. Force token refresh in app
│               │            b. Clear app cache/data
│               │            c. Recreate authentication
│               └── NO → Are there device-specific issues?
│                       1. Check device registration:
│                          Get-MgUserRegisteredDevice -UserId "user@contoso.com"
│                       2. Verify device compliance:
│                          Intune device compliance status
│                       3. Test connectivity on device:
│                          Network, proxy, firewall settings
│                       4. Review device restrictions:
│                          a. ActiveSync block status
│                          b. Device model/OS compatibility
│                          c. Corporate access limitations
```

## Implementation Checklist

Ensure successful Modern Authentication deployment with this comprehensive checklist:

### Planning Phase
- [ ] Document current authentication methods and clients
- [ ] Identify authentication dependencies and integrations
- [ ] Determine MFA strategy and methods
- [ ] Plan user communication and training
- [ ] Create support desk procedures
- [ ] Define success metrics and monitoring plan

### Development Phase
- [ ] Enable Modern Authentication in test environment
- [ ] Configure OAuth endpoints for hybrid scenarios
- [ ] Test with representative mobile clients
- [ ] Validate MFA functionality
- [ ] Create Conditional Access policies
- [ ] Develop remediation procedures for failures

### Deployment Phase
- [ ] Communicate changes to users
- [ ] Enable Modern Authentication in production
- [ ] Deploy MFA registration requirements
- [ ] Implement Conditional Access policies
- [ ] Monitor authentication success rates
- [ ] Provide user support for transition

### Maintenance Phase
- [ ] Monitor authentication patterns
- [ ] Review and adjust token lifetimes
- [ ] Update Conditional Access policies
- [ ] Clean up unused device registrations
- [ ] Audit legacy authentication usage
- [ ] Update security documentation

## References and Resources

### Microsoft Documentation

1. **Modern Authentication Overview**: [Microsoft Learn](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/enable-or-disable-modern-authentication-in-exchange-online)

2. **Hybrid Modern Authentication**: [Microsoft Learn](https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/hybrid-modern-authentication/hybrid-modern-authentication-overview)

3. **Microsoft Authentication Libraries**: [Microsoft Identity Platform](https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-overview)

### Community Resources

1. **Microsoft 365 Community**: [Tech Community Authentication Forum](https://techcommunity.microsoft.com/t5/security-compliance-identity/bd-p/SecurityComplianceIdentityOverview)

2. **Outlook Mobile Team Blog**: [Exchange Team Blog](https://techcommunity.microsoft.com/t5/exchange-team-blog/bg-p/Exchange)

3. **Identity Standards Documentation**: [OAuth and OpenID Connect](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-protocols)

### Troubleshooting Tools

1. **Microsoft Remote Connectivity Analyzer**: [ExRCA](https://testconnectivity.microsoft.com/)

2. **Microsoft Support and Recovery Assistant**: [SARA](https://aka.ms/SaRA)

3. **Azure AD Authentication and Authorization Tool**: [AAD Diagnostics Portal](https://portal.aad.diagnostic.office.com/)

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2022-06-08 | Authentication Team | Initial documentation |
| 1.1 | 2022-09-12 | Mobile Team | Added mobile app configuration |
| 1.2 | 2023-01-25 | Security Team | Enhanced MFA sections |
| 1.3 | 2023-05-10 | Identity Team | Updated token management guidance |
| 2.0 | 2023-10-15 | Authentication Team | Major update for ADAL/MSAL migration |
| 2.1 | 2024-02-22 | Cloud Team | Updated Microsoft identity platform references |
