# PasswordResetBot Troubleshooting Guide

## Overview

The PasswordResetBot is a Microsoft Teams bot designed to automate password reset processes for your organization. This guide provides comprehensive troubleshooting steps for common issues encountered with PasswordResetBot deployment, configuration, and operation. Following these steps will help you diagnose and resolve problems efficiently.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Authentication Issues](#authentication-issues)
- [Bot Registration Problems](#bot-registration-problems)
- [Deployment Issues](#deployment-issues)
- [Connection Issues](#connection-issues)
- [Password Reset Failures](#password-reset-failures)
- [Microsoft Entra Integration Issues](#microsoft-entra-integration-issues)
- [Teams Channel Issues](#teams-channel-issues)
- [Performance Problems](#performance-problems)
- [Logging and Debugging](#logging-and-debugging)
- [Security Considerations](#security-considerations)
- [Updating and Maintenance](#updating-and-maintenance)

## Prerequisites

Before troubleshooting, ensure you have:

- Administrator access to Microsoft Teams
- Access to Azure portal
- Microsoft Entra ID administrator permissions
- Access to Bot registration in Azure
- Required permission scopes configured
- Latest version of Bot Framework SDK installed

## Authentication Issues

### Client ID and Secret Problems

**Symptoms:**
- "Unauthorized" errors in bot logs
- Bot fails to authenticate with Azure services
- Error messages mentioning "invalid credentials"

**Resolution Steps:**
1. Verify the Microsoft App ID (Client ID) in your bot configuration:
   ```json
   {
     "MicrosoftAppType": "MultiTenant",
     "MicrosoftAppId": "<your-app-id>",
     "MicrosoftAppPassword": "<your-client-secret>",
     "MicrosoftAppTenantId": "<your-tenant-id>"
   }
   ```

2. Check if the client secret has expired:
   - Navigate to Azure Portal > App Registrations > Your Bot App > Certificates & Secrets
   - Check expiration dates on secrets
   - If expired, generate a new secret and update your configuration

3. Ensure the App ID matches the one in your Bot registration:
   - Go to Azure Portal > Azure Bot > Configuration 
   - Verify Microsoft App ID matches your code configuration

4. For local debugging, ensure that App ID and Password fields are empty in Bot Framework Emulator when testing locally without authentication.

### Token-Related Issues

**Symptoms:**
- Users unable to authenticate
- "Token acquisition failed" errors
- Authentication dialogs not appearing

**Resolution Steps:**
1. Check if `https://token.botframework.com` is included in `validDomains` in your app manifest:
   ```json
   "validDomains": [
     "token.botframework.com",
     "*.botframework.com"
   ]
   ```

2. Verify redirect URIs are correctly configured:
   - Go to App Registration > Authentication
   - Ensure redirect URI includes both:
     - Your bot endpoint (e.g., `https://your-bot-domain/api/messages`)
     - The Bot Framework redirect: `https://token.botframework.com/.auth/web/redirect`

3. Check Implicit grant flow settings:
   - In App Registration > Authentication
   - Enable "Access tokens" and "ID tokens" under Implicit grant

4. Verify proper scopes are requested in authentication code:
   ```csharp
   var connectionName = "<connection-name>";
   await Dialog.RunAsync(turnContext, conversationState.CreateProperty<DialogState>("DialogState"), cancellationToken);
   ```

## Bot Registration Problems

**Symptoms:**
- Bot doesn't appear in Teams
- Cannot add bot to Teams
- Error when uploading Teams app package

**Resolution Steps:**
1. Verify bot registration in Azure:
   - Go to Azure Portal > Azure Bot
   - Check if the bot registration exists and is properly configured

2. Check Microsoft App ID type:
   - Ensure App ID type is set to "MultiTenant" for broader availability
   - Single tenant may be required for specific organizational restrictions

3. Confirm Teams channel is added:
   - In Azure Bot > Channels
   - Verify Microsoft Teams appears as a connected channel

4. Check app manifest in Teams:
   - Ensure botId matches your Microsoft App ID
   - Verify scopes are properly set (personal, team, groupchat)
   ```json
   "bots": [
     {
       "botId": "<microsoft-app-id>",
       "scopes": ["personal", "team", "groupchat"]
     }
   ]
   ```

5. Review app permissions in manifest:
   - Ensure necessary permissions are included for password reset operations

## Deployment Issues

**Symptoms:**
- Deployment fails in Azure
- Application errors after deployment
- Bot works locally but fails in production

**Resolution Steps:**
1. Check Azure App Service configuration:
   - Verify app settings include:
     - MicrosoftAppType
     - MicrosoftAppId
     - MicrosoftAppPassword
     - MicrosoftAppTenantId

2. Examine deployment logs:
   - Check App Service logs in Azure Portal
   - Review deployment history for errors

3. Verify endpoint configurations:
   - In Bot Framework Developer Portal > Configuration > Bot Messaging
   - Ensure endpoint URL is correct (should be `https://<your-domain>/api/messages`)

4. Check for SSL/TLS issues:
   - Bot Framework requires HTTPS endpoints
   - Verify SSL certificate is valid and properly configured

5. For local testing with tunneling:
   - Use ngrok with proper configuration
   - Update bot endpoint to match the ngrok URL

## Connection Issues

**Symptoms:**
- Bot not responding to messages
- Timeouts in conversations
- "The bot is not responding" errors in Teams

**Resolution Steps:**
1. Check service health:
   - Verify Azure Bot Service status
   - Check Teams service health

2. Verify network connectivity:
   - If bot is hosted in a virtual network, ensure proper outbound connectivity
   - For user authentication, allowlist service provider endpoints (e.g., Microsoft Entra ID)
   - Allowlist Bot Framework service endpoints

3. Check firewall and network security rules:
   - Ensure outbound HTTPS (443) is allowed to Bot Framework services
   - Verify no network rules blocking communication

4. For isolated networks:
   - Configure Direct Line App Service extension 
   - Set up private endpoints as needed

5. Review bot service timeout settings:
   - Default timeouts may need adjustment for password reset operations

## Password Reset Failures

**Symptoms:**
- Bot acknowledges reset request but password not reset
- Error messages during reset process
- Password reset workflow incomplete

**Resolution Steps:**
1. Check Microsoft Graph API permissions:
   - Verify bot has `User.ReadWrite.All` or appropriate permissions
   - Ensure admin consent is granted for these permissions

2. Review Azure Function integration (if applicable):
   - Check function logs for errors
   - Verify function app settings and connection strings

3. Examine password policy compliance:
   - Ensure generated or user-provided passwords meet organizational policies
   - Check for password complexity requirements

4. Verify service account permissions:
   - Ensure the service account has sufficient permissions for password management
   - Check for conditional access policies that might affect service accounts

5. Test password reset API directly:
   - Use Graph Explorer to test password reset API calls
   - Verify correct API version and endpoints

## Microsoft Entra Integration Issues

**Symptoms:**
- Cannot find users in directory
- Permission errors with Entra ID
- Authentication flows breaking

**Resolution Steps:**
1. Check application permissions:
   - Verify app has required Graph API permissions:
     - User.Read.All (to find users)
     - User.ReadWrite.All (to reset passwords)
     - Directory.Read.All (to query directory)

2. Verify consent status:
   - Ensure admin consent is granted for all required permissions
   - Check for consent errors in application logs

3. Check for conditional access policies:
   - Review if any policies affect application authentication
   - Temporary access pass or other requirements may be in place

4. Verify Microsoft Entra B2B/B2C configuration (if applicable):
   - External identity sources may have different requirements
   - Check identity provider configuration

5. Note SSPR policy changes:
   - Beginning September 30, 2025, authentication methods can't be managed in legacy MFA and SSPR policies
   - Ensure your integration uses modern authentication policy management

## Teams Channel Issues

**Symptoms:**
- Bot appears in Azure but not in Teams
- Cannot message bot in Teams
- Bot card actions not working

**Resolution Steps:**
1. Verify Teams channel configuration:
   - In Azure Bot > Channels
   - Ensure Microsoft Teams channel is added and configured

2. Check app manifest:
   - Validate schema version is current
   - Ensure botId matches Microsoft App ID
   - Verify scopes and permissions

3. Review app installation status:
   - Check if app is approved in Teams admin center
   - Verify user has permissions to interact with the bot

4. For adaptive cards issues:
   - Verify adaptive cards are only used within Azure Communication Services use cases where all chat participants are Azure Communication Services users, and not for Teams interoperability use cases
   - Check card format and compliance with Teams card specifications

5. Test bot with Bot Framework Emulator:
   - Isolate if issue is Teams-specific or affects bot generally

## Performance Problems

**Symptoms:**
- Slow response times
- Timeouts during password reset operations
- High latency in bot interactions

**Resolution Steps:**
1. Check bot hosting resources:
   - Review CPU, memory, and connection usage in Azure
   - Consider scaling up or out if resources are constrained

2. Optimize code:
   - Review async operations and ensure proper patterns
   - Check for blocking calls or inefficient database queries

3. Analyze Azure Application Insights:
   - Review performance metrics and traces
   - Identify bottlenecks in request processing

4. Check external dependencies:
   - Monitor Microsoft Graph API call performance
   - Verify other integrated service response times

5. Implement caching where appropriate:
   - Cache directory information to reduce API calls
   - Implement token caching to reduce authentication overhead

## Logging and Debugging

### Enabling Detailed Logs

1. Enable Application Insights:
   ```json
   {
     "ApplicationInsights": {
       "InstrumentationKey": "<your-instrumentation-key>"
     }
   }
   ```

2. Configure trace levels in `appsettings.json`:
   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Information",
         "Microsoft": "Warning",
         "Microsoft.Hosting.Lifetime": "Information",
         "PasswordResetBot": "Debug"
       }
     }
   }
   ```

3. For device-specific logs on Teams Rooms devices, use Event Viewer and go to Applications and Services Log > Microsoft > Windows > Microsoft Entra ID > Operational

### Common Log Patterns and Solutions

| Log Pattern | Potential Issue | Resolution |
|-------------|----------------|------------|
| `Unauthorized_Client` | Client secret expired or incorrect | Generate new secret, update configuration |
| `MissingChannelAccount` | Bot cannot access user info | Check Teams channel configuration |
| `FailedToGetToken` | Authentication issue | Verify auth configuration and permissions |
| `GraphApiException` | Graph API permission or endpoint issue | Check Graph permissions and API version |
| `ConversationUpdateActivityHandler: Exception` | Error during conversation initialization | Review conversation state management |

## Security Considerations

1. Implement proper throttling:
   - Limit password reset attempts
   - Implement progressive delays after failed attempts

2. Audit logging:
   - Log all password reset requests
   - Include requester, target account, and result

3. Multi-factor authentication:
   - Teams users authenticate against Microsoft Entra ID in the client application, where developers exchange authentication tokens from Microsoft Entra ID for access tokens via the Communication Services Identity SDK
   - Consider requiring additional verification before processing password resets

4. IP and location restrictions:
   - Consider implementing conditional access based on location
   - Restrict to corporate networks if appropriate

5. Notification systems:
   - Notify users of password changes via alternate channels
   - Send alerts for suspicious reset patterns

## Updating and Maintenance

### Handling Bot Updates

1. Version control for bot code:
   - Maintain proper source control
   - Document changes between versions

2. Testing procedure:
   - Test in development environment
   - Use Bot Framework Emulator
   - Conduct integration tests with Teams

3. Updating client secrets:
   - Regularly rotate client secrets for security
   - Update all deployment environments with new secrets

4. Managing Teams app updates:
   - Version your Teams app manifest
   - Use app update process in Teams admin center

5. Monitoring after updates:
   - Watch for errors after deployment
   - Monitor performance metrics for regression

### Certificate Management

If using certificate-based authentication:

1. If you encounter "Client secrets are blocked by tenant-wide policy" errors, create a certificate instead
2. Monitor certificate expiration dates
3. Implement automated renewal processes
4. Update all environments when certificates change

## Common Error Messages and Solutions

| Error | Possible Cause | Solution |
|-------|---------------|----------|
| "The Microsoft App ID or password is incorrect" | Misconfigured app ID or secret | Verify values in Azure and bot configuration |
| "Failed to authenticate. Please try again" | Token expired or invalid | Check authentication configuration and token lifespan |
| "Bot not authorized" | Missing permissions | Verify bot has required permissions and admin consent |
| "Sorry, I couldn't reset the password" | Graph API error | Check Graph API permissions and error details |
| "The operation timed out" | Slow response from dependencies | Check network, increase timeouts, optimize code |

## References and Resources

- [Microsoft Teams Bot Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/bot-basics)
- [Azure Bot Service Documentation](https://learn.microsoft.com/en-us/azure/bot-service/)
- [Microsoft Graph API for Password Reset](https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0&tabs=http)
- [Bot Framework Authentication](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-authentication)
- [Azure Communication Services Integration](https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/chat/quickstart-botframework-integration)
