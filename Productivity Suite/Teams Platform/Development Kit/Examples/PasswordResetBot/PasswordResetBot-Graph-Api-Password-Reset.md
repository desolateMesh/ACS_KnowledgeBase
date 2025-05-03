# Password Reset Bot with Microsoft Graph API Integration

## Overview

The Password Reset Bot is a Microsoft Teams application that enables users to perform self-service password resets within the Teams environment. This solution leverages the Microsoft Graph API to securely manage password reset operations, providing a seamless experience for end users while maintaining robust security controls. The bot can be deployed as part of an organization's identity management strategy, reducing helpdesk tickets and improving user productivity.

## Architecture

### Core Components

1. **Teams Bot Application** - Front-end interface for user interaction within Microsoft Teams
2. **Authentication Service** - Handles OAuth 2.0 flows and token management for secure Graph API access
3. **Microsoft Graph API Client** - Orchestrates API calls to Azure AD for password reset operations
4. **Verification Service** - Manages multi-factor authentication (MFA) challenges during the reset process
5. **Audit Logging Component** - Records all password reset attempts and outcomes for compliance

### System Diagram

```
┌─────────────────┐      ┌───────────────────┐     ┌───────────────────┐
│                 │      │                   │     │                   │
│  Microsoft      │◄────►│  Password Reset   │◄───►│  Microsoft Graph  │
│  Teams Client   │      │  Bot Application  │     │  API              │
│                 │      │                   │     │                   │
└─────────────────┘      └───────────┬───────┘     └───────────────────┘
                                     │
                                     ▼
                         ┌─────────────────────┐
                         │                     │
                         │  Azure AD / Entra   │
                         │  ID                 │
                         │                     │
                         └─────────────────────┘
```

## Prerequisites

### Permissions and Accounts

1. **Azure Subscription** - Active subscription with administrative access
2. **Microsoft 365 Developer Account** - For Teams app deployment and testing
3. **Azure AD Application Registration** - With appropriate Graph API permissions
4. **Administrator Role** - Global Admin or User Administrator role for permission consent

### Technical Requirements

1. **Development Environment**:
   - Visual Studio 2022 or Visual Studio Code
   - .NET 7.0 or later
   - Bot Framework SDK v4 or later
   - Microsoft Graph SDK for .NET

2. **Microsoft Graph API Permissions**:
   - `User.ReadWrite.All` - For password reset operations
   - `Directory.ReadWrite.All` - For user lookups and directory operations
   - `AuditLog.Read.All` - For audit logging (optional)

3. **Azure Resources**:
   - Azure Bot Service
   - Azure App Service Plan
   - Azure Key Vault (for secure credential storage)
   - Application Insights (for monitoring)

## Implementation Guide

### Step 1: Application Registration

1. Navigate to the [Azure Portal](https://portal.azure.com) and sign in with admin credentials
2. Go to **Azure Active Directory** > **App registrations** > **New registration**
3. Configure the application:
   - **Name**: PasswordResetBot
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web > `https://token.botframework.com/.auth/web/redirect`
4. Record the **Application (client) ID** and **Directory (tenant) ID** for later use
5. Under **Certificates & secrets**, create a new client secret and record the value
6. Configure API permissions:
   - Microsoft Graph > Application permissions:
     - `User.ReadWrite.All`
     - `Directory.ReadWrite.All`
   - Click "Grant admin consent"

### Step 2: Bot Registration

1. Go to **Azure Portal** > **Create a resource** > search for "Bot Channels Registration"
2. Configure the bot:
   - **Bot handle**: PasswordResetBot
   - **Messaging endpoint**: URL of your deployed bot (placeholder if not deployed yet)
   - **Microsoft App ID**: Use the Application ID from Step 1
3. Configure additional bot settings:
   - Enable Microsoft Teams channel
   - Set up OAuth Connection Settings with the App Registration details

### Step 3: Bot Development

#### Project Setup

1. Create a new Bot Framework project using the Teams Bot template
2. Install required NuGet packages:
   ```bash
   dotnet add package Microsoft.Bot.Builder.Teams
   dotnet add package Microsoft.Identity.Client
   dotnet add package Microsoft.Graph
   dotnet add package Azure.Security.KeyVault.Secrets
   ```

#### Authentication Configuration

Add the following to your appsettings.json file:

```json
{
  "MicrosoftAppId": "<Your-App-ID>",
  "MicrosoftAppPassword": "<Your-App-Secret>",
  "MicrosoftAppTenantId": "<Your-Tenant-ID>",
  "ConnectionName": "PasswordResetAuth",
  "GraphApiScopes": [
    "https://graph.microsoft.com/.default"
  ],
  "KeyVaultName": "<Your-KeyVault-Name>"
}
```

#### Bot Dialog Implementation

Create a dialog flow for password reset operations:

```csharp
public class PasswordResetDialog : ComponentDialog
{
    private const string InitialPrompt = "InitialPrompt";
    private const string UserIdPrompt = "UserIdPrompt";
    private const string VerificationPrompt = "VerificationPrompt";
    private const string NewPasswordPrompt = "NewPasswordPrompt";
    private const string ConfirmPasswordPrompt = "ConfirmPasswordPrompt";
    
    private readonly IGraphServiceClient _graphClient;
    private readonly ILogger<PasswordResetDialog> _logger;
    
    public PasswordResetDialog(
        string dialogId,
        IGraphServiceClient graphClient,
        ILogger<PasswordResetDialog> logger)
        : base(dialogId)
    {
        _graphClient = graphClient;
        _logger = logger;
        
        AddDialog(new TextPrompt(InitialPrompt));
        AddDialog(new TextPrompt(UserIdPrompt, ValidateUserIdAsync));
        AddDialog(new TextPrompt(VerificationPrompt, ValidateVerificationCodeAsync));
        AddDialog(new TextPrompt(NewPasswordPrompt, ValidatePasswordAsync));
        AddDialog(new TextPrompt(ConfirmPasswordPrompt, ValidateConfirmPasswordAsync));
        
        AddDialog(new WaterfallDialog("PasswordResetFlow", new WaterfallStep[]
        {
            IntroStepAsync,
            CollectUserIdAsync,
            VerifyUserAsync,
            CollectNewPasswordAsync,
            ConfirmNewPasswordAsync,
            ResetPasswordAsync,
            FinalStepAsync
        }));
        
        InitialDialogId = "PasswordResetFlow";
    }
    
    // Dialog steps and validation methods implementation
    // ...
}
```

#### Graph API Client Service

Implement the service to interact with Microsoft Graph API:

```csharp
public class GraphApiService : IGraphApiService
{
    private readonly IGraphServiceClient _graphClient;
    private readonly ILogger<GraphApiService> _logger;
    
    public GraphApiService(
        IGraphServiceClient graphClient,
        ILogger<GraphApiService> logger)
    {
        _graphClient = graphClient;
        _logger = logger;
    }
    
    public async Task<bool> ValidateUserAsync(string userId)
    {
        try
        {
            var user = await _graphClient.Users[userId]
                .Request()
                .Select("id,userPrincipalName,displayName")
                .GetAsync();
                
            return user != null;
        }
        catch (ServiceException ex)
        {
            _logger.LogError(ex, "Error validating user {UserId}", userId);
            return false;
        }
    }
    
    public async Task<bool> ResetPasswordAsync(string userId, string newPassword)
    {
        try
        {
            // Create password profile with new password
            var passwordProfile = new PasswordProfile
            {
                ForceChangePasswordNextSignIn = false,
                Password = newPassword
            };
            
            // Update user with new password
            await _graphClient.Users[userId]
                .Request()
                .UpdateAsync(new User
                {
                    PasswordProfile = passwordProfile
                });
                
            _logger.LogInformation("Password reset successful for user {UserId}", userId);
            return true;
        }
        catch (ServiceException ex)
        {
            _logger.LogError(ex, "Error resetting password for user {UserId}", userId);
            return false;
        }
    }
    
    public async Task LogPasswordResetActivityAsync(string userId, bool success, string initiatedBy)
    {
        // Implement audit logging logic
        // This could write to Application Insights, a database, or a custom logging endpoint
    }
}
```

#### Authentication Helper for Graph API

```csharp
public class GraphAuthenticationProvider : IAuthenticationProvider
{
    private readonly IConfidentialClientApplication _clientApplication;
    private readonly string[] _scopes;
    
    public GraphAuthenticationProvider(
        string clientId,
        string clientSecret,
        string tenantId,
        string[] scopes)
    {
        _clientApplication = ConfidentialClientApplicationBuilder
            .Create(clientId)
            .WithClientSecret(clientSecret)
            .WithAuthority(new Uri($"https://login.microsoftonline.com/{tenantId}"))
            .Build();
            
        _scopes = scopes;
    }
    
    public async Task AuthenticateRequestAsync(HttpRequestMessage request)
    {
        var token = await GetAccessTokenAsync();
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
    
    private async Task<string> GetAccessTokenAsync()
    {
        try
        {
            var result = await _clientApplication.AcquireTokenForClient(_scopes).ExecuteAsync();
            return result.AccessToken;
        }
        catch (MsalException ex)
        {
            throw new ServiceException("Unable to acquire token for Graph API", ex);
        }
    }
}
```

### Step 4: Security Considerations

#### Password Policy Enforcement

Implement strong password validation that enforces your organization's policy:

```csharp
private async Task<bool> ValidatePasswordAsync(PromptValidatorContext<string> promptContext, CancellationToken cancellationToken)
{
    var password = promptContext.Recognized.Value;
    
    // Example password policy checks
    bool hasMinimumLength = password.Length >= 12;
    bool hasUpperCase = Regex.IsMatch(password, "[A-Z]");
    bool hasLowerCase = Regex.IsMatch(password, "[a-z]");
    bool hasDigit = Regex.IsMatch(password, "[0-9]");
    bool hasSpecialChar = Regex.IsMatch(password, "[^A-Za-z0-9]");
    bool doesNotContainUsername = !password.Contains(currentUserId, StringComparison.OrdinalIgnoreCase);
    
    bool isValid = hasMinimumLength && hasUpperCase && hasLowerCase && 
                   hasDigit && hasSpecialChar && doesNotContainUsername;
    
    if (!isValid)
    {
        await promptContext.Context.SendActivityAsync(
            "Password does not meet complexity requirements. " +
            "Please use at least 12 characters including uppercase, lowercase, " +
            "numbers, and special characters.", cancellationToken: cancellationToken);
    }
    
    return isValid;
}
```

#### Multi-Factor Authentication Integration

For enhanced security, implement MFA verification before password reset:

```csharp
public async Task<bool> SendVerificationCodeAsync(string userId)
{
    try
    {
        // In a production environment, this should integrate with your organization's 
        // MFA provider or use Azure AD's built-in capabilities
        
        // Example: Send verification code via Graph API to user's registered phone or email
        
        // For demonstration purposes, we're logging this action
        _logger.LogInformation("Verification code sent to user {UserId}", userId);
        return true;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error sending verification code to user {UserId}", userId);
        return false;
    }
}
```

#### Secure Storage of Sensitive Data

```csharp
// Use Azure Key Vault to retrieve secrets
public async Task<string> GetSecretAsync(string secretName)
{
    try
    {
        var keyVaultName = _configuration["KeyVaultName"];
        var kvUri = $"https://{keyVaultName}.vault.azure.net";
        
        var secretClient = new SecretClient(new Uri(kvUri), new DefaultAzureCredential());
        var secret = await secretClient.GetSecretAsync(secretName);
        
        return secret.Value.Value;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving secret {SecretName}", secretName);
        throw;
    }
}
```

### Step 5: Deployment

#### Azure Deployment with ARM Template

Create an ARM template (azuredeploy.json) for consistent deployment:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "botServiceName": {
      "type": "string",
      "metadata": {
        "description": "The name for the Bot Service"
      }
    },
    "appServicePlanName": {
      "type": "string",
      "metadata": {
        "description": "The name for the App Service Plan"
      }
    },
    "botAppId": {
      "type": "string",
      "metadata": {
        "description": "The Microsoft App ID for the bot"
      }
    },
    "botAppPassword": {
      "type": "securestring",
      "metadata": {
        "description": "The Microsoft App Password for the bot"
      }
    },
    "keyVaultName": {
      "type": "string",
      "metadata": {
        "description": "Name of the Key Vault to store secrets"
      }
    }
  },
  "resources": [
    // App Service Plan, Bot Service, Key Vault, Application Insights resources
    // ...
  ],
  "outputs": {
    // Deployment outputs
    // ...
  }
}
```

#### CI/CD Pipeline with GitHub Actions

Create a GitHub Actions workflow (.github/workflows/deploy.yml) for automated deployment:

```yaml
name: Deploy Password Reset Bot

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: '7.0.x'
        
    - name: Restore dependencies
      run: dotnet restore
      
    - name: Build
      run: dotnet build --no-restore --configuration Release
      
    - name: Test
      run: dotnet test --no-build --configuration Release
      
    - name: Publish
      run: dotnet publish --no-build --configuration Release --output ./publish
      
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ secrets.AZURE_APP_NAME }}
        publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
        package: ./publish
```

### Step 6: Teams App Packaging

Create a Teams app manifest (manifest.json) for distribution:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
  "manifestVersion": "1.11",
  "version": "1.0.0",
  "id": "{{botAppId}}",
  "packageName": "com.contoso.passwordresetbot",
  "developer": {
    "name": "Contoso IT",
    "websiteUrl": "https://contoso.com",
    "privacyUrl": "https://contoso.com/privacy",
    "termsOfUseUrl": "https://contoso.com/terms"
  },
  "name": {
    "short": "Password Reset",
    "full": "Password Reset Bot for Microsoft Teams"
  },
  "description": {
    "short": "Reset your password securely from Teams",
    "full": "A self-service password reset solution that allows users to securely reset their passwords directly from Microsoft Teams."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "{{botAppId}}",
      "scopes": [
        "personal"
      ],
      "supportsFiles": false,
      "isNotificationOnly": false
    }
  ],
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": [
    "token.botframework.com",
    "*.azurewebsites.net"
  ]
}
```

## User Experience

### Password Reset Flow

1. **Initiation**: User starts conversation with the Password Reset Bot in Teams
2. **Authentication**: User authenticates using organizational credentials
3. **Verification**: System verifies user identity through MFA (if configured)
4. **Password Reset**: User specifies a new password meeting organizational requirements
5. **Confirmation**: System confirms successful password reset
6. **Notification**: User receives success notification with additional security reminders

### Example Dialog Flow

```
User: "Hi, I need to reset my password"

Bot: "Welcome to the Password Reset Bot. This service allows you to securely reset your password. 
     To proceed, I'll need to verify your identity. Please provide your work email address."

User: "john.smith@contoso.com"

Bot: "Thank you. For security purposes, I've sent a verification code to your registered 
     mobile device. Please enter the 6-digit code."

User: "123456"

Bot: "Verification successful. Please enter your new password. Your password must:
     - Be at least 12 characters long
     - Include uppercase and lowercase letters
     - Include at least one number and one special character
     - Not contain your username"

User: "NewP@ssw0rd123"

Bot: "Please confirm your new password by entering it again."

User: "NewP@ssw0rd123"

Bot: "Your password has been successfully reset. For security reasons, you'll be asked to sign 
     in again with your new password on all your devices. Is there anything else I can help 
     with today?"
```

## Monitoring and Auditing

### Audit Logging

All password reset activities are logged with the following information:

- User ID of the account being reset
- Timestamp of the request
- IP address and device information
- Success/failure status
- Error details (if applicable)

Audit logs are stored securely and can be accessed by security administrators through:

1. Azure Portal > Azure AD > Audit Logs
2. Custom reporting dashboard (if implemented)
3. SIEM integration via Azure Monitor

### Performance Monitoring

Monitor the health and performance of the Password Reset Bot using:

1. **Application Insights**: 
   - Track request rates, response times, and failures
   - Set up alerts for abnormal patterns

2. **Azure Bot Service Analytics**:
   - Monitor user engagement metrics
   - Track conversation completion rates

3. **Custom Telemetry**:
   - Track password reset success/failure rates
   - Monitor usage patterns for capacity planning

## Security Best Practices

1. **Principle of Least Privilege**:
   - Assign only required Graph API permissions
   - Use managed identities where possible

2. **Token Handling**:
   - Never store access tokens in client-side code
   - Implement token caching with appropriate expiration

3. **Error Handling**:
   - Implement generic error messages to users
   - Log detailed errors securely for administrators

4. **Rate Limiting**:
   - Implement throttling to prevent brute force attacks
   - Lock accounts after multiple failed attempts

5. **Regular Security Reviews**:
   - Conduct periodic security assessments
   - Update dependencies to address vulnerabilities

## Troubleshooting

### Common Issues and Resolutions

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| "Insufficient permissions" error | Missing Graph API permissions | Ensure admin consent is granted for all required permissions |
| Bot not responding | Bot service not running | Check Azure App Service status and logs |
| Authentication failures | Token expiration or invalid credentials | Verify client secret hasn't expired and check app registration |
| Password complexity errors | User entered password not meeting requirements | Provide clear guidance on password requirements to users |
| MFA verification failures | User timeout or incorrect code | Allow users to request a new verification code |

### Diagnostic Steps

1. **Check Bot Health**:
   ```powershell
   # Check if bot service is running
   Invoke-WebRequest -Uri "https://<your-bot-service>.azurewebsites.net/api/health"
   ```

2. **Verify Graph API Connection**:
   ```csharp
   // Test Graph API connectivity
   try
   {
       var me = await graphClient.Me.Request().GetAsync();
       _logger.LogInformation("Graph API connection successful");
       return true;
   }
   catch (Exception ex)
   {
       _logger.LogError(ex, "Graph API connection failed");
       return false;
   }
   ```

3. **Review Application Insights Logs**:
   - Navigate to Azure Portal > App Service > Application Insights
   - Check Failures and Exceptions sections

## Integration Scenarios

### Integration with ITSM Systems

Connect the Password Reset Bot with IT Service Management platforms:

```csharp
public async Task CreateServiceNowTicket(string userId, string issueDescription)
{
    // Implementation example for ServiceNow integration
    var serviceNowUrl = _configuration["ServiceNow:ApiUrl"];
    var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes(
        $"{_configuration["ServiceNow:Username"]}:{_configuration["ServiceNow:Password"]}"));
    
    using var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
    
    var content = new StringContent(JsonSerializer.Serialize(new
    {
        caller_id = userId,
        short_description = "Password Reset Issue",
        description = issueDescription,
        category = "account",
        subcategory = "password"
    }), Encoding.UTF8, "application/json");
    
    var response = await client.PostAsync($"{serviceNowUrl}/api/now/table/incident", content);
    
    if (response.IsSuccessStatusCode)
    {
        var result = await response.Content.ReadAsStringAsync();
        _logger.LogInformation("ServiceNow ticket created: {Result}", result);
    }
    else
    {
        _logger.LogError("Failed to create ServiceNow ticket: {StatusCode}", response.StatusCode);
    }
}
```

### Integration with Azure AD Identity Protection

Enhance password reset security with Azure AD Identity Protection:

```csharp
public async Task<RiskDetectionResult> CheckUserRiskStatus(string userId)
{
    try
    {
        // Query Azure AD Identity Protection for risk information
        var riskDetections = await _graphClient.RiskyUsers[userId]
            .Request()
            .GetAsync();
            
        return new RiskDetectionResult
        {
            IsRisky = riskDetections.RiskLevel != RiskLevel.None,
            RiskLevel = riskDetections.RiskLevel,
            RiskDetails = riskDetections.RiskDetail
        };
    }
    catch (ServiceException ex)
    {
        _logger.LogError(ex, "Error checking risk status for user {UserId}", userId);
        return new RiskDetectionResult
        {
            IsRisky = false,
            RiskLevel = RiskLevel.None,
            RiskDetails = RiskDetail.None
        };
    }
}
```

## Compliance and Governance

### Data Handling and Retention

- Password data is never stored in the application
- Temporary verification codes are stored securely and expire after 10 minutes
- Audit logs are retained according to organizational policy (default: 90 days)

### Regulatory Considerations

Ensure compliance with relevant regulations:

- **GDPR**: Implement appropriate data handling practices for EU users
- **SOC 2**: Maintain audit trails and access controls
- **NIST**: Follow NIST SP 800-63B guidelines for password management

## Scaling and Performance

### Horizontal Scaling

The application is designed for horizontal scaling:

- Azure App Service auto-scaling based on CPU usage
- Azure Bot Service handles conversation state management
- Stateless architecture allows for load balancing

### Performance Optimizations

- Implement caching for frequently accessed, non-sensitive data
- Use Azure Front Door for global distribution
- Optimize Graph API calls with select statements

## Future Enhancements

1. **Self-service Account Unlock**: Extend functionality to allow users to unlock their accounts
2. **Proactive Password Expiry Notifications**: Send reminders before passwords expire
3. **Advanced Analytics Dashboard**: Provide insights on password reset patterns
4. **Natural Language Processing**: Improve bot conversational capabilities
5. **Additional Authentication Methods**: Support biometric verification options

## References

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0)
- [Bot Framework Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Teams Platform Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [Azure AD Password Management](https://docs.microsoft.com/en-us/azure/active-directory/authentication/concept-sspr-howitworks)
- [OAuth 2.0 and OpenID Connect](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols)
