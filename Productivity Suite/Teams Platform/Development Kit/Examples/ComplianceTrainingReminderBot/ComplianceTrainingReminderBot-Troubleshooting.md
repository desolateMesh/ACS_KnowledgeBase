# Compliance Training Reminder Bot - Troubleshooting Guide

## Overview

This troubleshooting guide provides comprehensive instructions for identifying, diagnosing, and resolving common issues with the Compliance Training Reminder Bot. This document is intended for administrators, developers, and support personnel responsible for maintaining the bot's functionality in Microsoft Teams.

## Table of Contents

1. [Prerequisites and Environment Validation](#prerequisites-and-environment-validation)
2. [Common Error Scenarios](#common-error-scenarios)
3. [Bot Registration and Connectivity Issues](#bot-registration-and-connectivity-issues)
4. [Adaptive Card Rendering Problems](#adaptive-card-rendering-problems)
5. [Scheduled Message Delivery Failures](#scheduled-message-delivery-failures)
6. [User Completion Tracking Issues](#user-completion-tracking-issues)
7. [Database and Storage Errors](#database-and-storage-errors)
8. [Authentication and Permission Problems](#authentication-and-permission-problems)
9. [Teams Platform Limitations](#teams-platform-limitations)
10. [Logging and Diagnostics](#logging-and-diagnostics)
11. [Advanced Troubleshooting](#advanced-troubleshooting)
12. [FAQ](#faq)

## Prerequisites and Environment Validation

Before troubleshooting specific issues, verify that your environment meets all requirements:

### Bot Service Health Check

```powershell
# Check bot service status
$botServiceUrl = "https://your-bot-service-url/api/health"
$response = Invoke-RestMethod -Uri $botServiceUrl -Method Get
if ($response.status -eq "healthy") {
    Write-Output "Bot service is running correctly"
} else {
    Write-Output "Bot service has issues: $($response.details)"
}
```

### Required Dependencies

- Azure Bot Service: v4.14.0 or higher
- Bot Framework SDK: v4.15.0 or higher
- Azure Functions runtime: v3.0.15530 or higher
- Teams JS SDK: v2.0.0 or higher
- Node.js: v14.x or higher (if using Node.js implementation)
- .NET Core: 6.0 or higher (if using .NET implementation)

### Configuration Validation

Ensure all necessary configuration settings are properly defined:

- Microsoft App ID and Secret
- Teams Bot ID
- Storage connection strings
- Admin user list
- Default notification schedule
- AAD permissions and consent

## Common Error Scenarios

### Bot Not Responding to Commands

**Symptoms:**
- Bot does not reply to @mentions
- Messages sent to bot receive no response
- Error code 503 in Teams admin center

**Troubleshooting Steps:**

1. Verify bot service is running:
   ```powershell
   # Check if your Azure App Service/Function is running
   $appServiceName = "your-bot-app-service-name"
   $resourceGroup = "your-resource-group"
   
   az webapp show -n $appServiceName -g $resourceGroup --query state
   ```

2. Check bot messaging endpoint in Azure Bot Service configuration
3. Inspect application logs for exceptions
4. Verify network connectivity between Teams and bot service
5. Check if throttling limits have been reached

**Resolution:**
- Restart the bot service
- Update the messaging endpoint
- Fix any exceptions found in logs
- Implement exponential backoff for throttling issues

### Bot Installation Failures

**Symptoms:**
- "Something went wrong" error during installation
- Bot shows up but has no functionality
- Permission consent failures

**Troubleshooting Steps:**
1. Verify the Teams app manifest is valid
2. Check AAD app registration permissions
3. Ensure admin consent was granted
4. Verify bot registration in Azure

**Resolution:**
- Update app manifest to correct format
- Grant proper permissions in AAD
- Request admin consent
- Update bot registration

## Bot Registration and Connectivity Issues

### Invalid Bot Credentials

**Symptoms:**
- Authentication errors in logs
- "The bot authentication failed" messages
- 401 or 403 HTTP status codes

**Troubleshooting:**
1. Verify Microsoft App ID and Secret are correct and not expired
2. Check for certificate rotation issues
3. Test connectivity to Bot Framework Service

**Resolution:**
```powershell
# Update bot credentials in Azure (PowerShell example)
$botName = "ComplianceTrainingBot" 
$resourceGroup = "YourResourceGroup"
$appId = "your-microsoft-app-id"
$appSecret = "your-microsoft-app-secret"

az bot update --name $botName --resource-group $resourceGroup --app-id $appId --password $appSecret
```

### Messaging Endpoint Validation Failures

**Symptoms:**
- Bot registration shows "Messaging endpoint validation failed"
- Cannot save endpoint in Azure portal

**Troubleshooting:**
1. Ensure bot endpoint is publicly accessible
2. Verify HTTPS is properly configured with valid certificates
3. Check that the bot code properly handles validation requests

**Resolution:**
- Update DNS settings
- Renew or install proper SSL certificates
- Implement correct validation response handler

## Adaptive Card Rendering Problems

### Cards Not Displaying Correctly

**Symptoms:**
- Blank cards
- Cards with missing elements
- "This card couldn't be displayed" error

**Troubleshooting:**
1. Validate adaptive card JSON against schema
2. Check for unsupported features in Teams
3. Inspect network traffic for payload size issues

**Resolution:**
- Use the Adaptive Card Designer to validate your card design
- Remove unsupported features
- Reduce card size or complexity

**Example Card Validation:**
```javascript
// Example validation function
function validateAdaptiveCard(cardJson) {
    try {
        const schema = require('adaptivecards/lib/schema');
        const validator = new require('jsonschema').Validator();
        const validationResult = validator.validate(cardJson, schema);
        
        return {
            isValid: validationResult.valid,
            errors: validationResult.errors
        };
    } catch (error) {
        return {
            isValid: false,
            errors: [error.message]
        };
    }
}
```

### Card Action Handling Failures

**Symptoms:**
- Buttons do nothing when clicked
- "Something went wrong" after action submission
- Action payload not received by bot

**Troubleshooting:**
1. Check action URLs and ensure they're accessible
2. Verify action payload format
3. Inspect bot logs for action handler exceptions

**Resolution:**
- Update action URLs
- Fix payload format according to AdaptiveCards schema
- Implement proper error handling in action handlers

## Scheduled Message Delivery Failures

### Messages Not Sending on Schedule

**Symptoms:**
- Scheduled reminders never arrive
- Inconsistent delivery timing
- Messages delivered to some users but not others

**Troubleshooting:**
1. Verify timer function/job is running
2. Check schedule configuration and timezone settings
3. Inspect proactive messaging code for errors
4. Check user targeting logic

**Resolution:**

```csharp
// Example fix for timer function
public class ReminderFunction
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReminderFunction> _logger;
    private readonly IBotService _botService;

    public ReminderFunction(
        IConfiguration configuration,
        ILogger<ReminderFunction> logger,
        IBotService botService)
    {
        _configuration = configuration;
        _logger = logger;
        _botService = botService;
    }

    [FunctionName("ScheduledReminders")]
    public async Task Run([TimerTrigger("0 0 9 * * 1-5")] TimerInfo timer)
    {
        try {
            _logger.LogInformation("Scheduled reminder function started");
            
            // Get users due for reminders
            var users = await _botService.GetUsersRequiringReminders();
            
            // Send reminders
            foreach (var user in users)
            {
                try {
                    await _botService.SendProactiveMessage(
                        user.TeamsUserId,
                        user.ConversationReference,
                        user.ComplianceTrainingStatus);
                    
                    await _botService.LogReminderSent(user.Id);
                }
                catch (Exception ex) {
                    _logger.LogError(ex, "Failed to send reminder to user {UserId}", user.Id);
                    // Continue with next user instead of failing entire batch
                }
            }
            
            _logger.LogInformation("Scheduled reminder function completed successfully");
        }
        catch (Exception ex) {
            _logger.LogError(ex, "Scheduled reminder function failed");
            throw; // Rethrow to ensure Azure Functions runtime logs the failure
        }
    }
}
```

### Rate Limiting and Throttling

**Symptoms:**
- Some messages delivered, then failures
- 429 HTTP status codes in logs
- Messages delayed significantly

**Troubleshooting:**
1. Check for excessive message volume
2. Review Bot Framework Service limits
3. Inspect retry logic

**Resolution:**
- Implement batching with delays between messages
- Add exponential backoff for retries
- Distribute message load over longer periods

```javascript
// Example implementation of exponential backoff
async function sendWithRetry(conversationId, activity, maxAttempts = 5) {
    let attempt = 0;
    
    while (attempt < maxAttempts) {
        try {
            await botAdapter.continueConversation(conversationReference, async (context) => {
                await context.sendActivity(activity);
            });
            
            return true; // Success
        } catch (error) {
            if (error.code === 429) { // Too Many Requests
                attempt++;
                
                if (attempt >= maxAttempts) {
                    console.error(`Failed to send message after ${maxAttempts} attempts`);
                    return false;
                }
                
                // Exponential backoff with jitter
                const delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                console.log(`Rate limited. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                console.error('Error sending message:', error);
                return false; // Other error, don't retry
            }
        }
    }
}
```

## User Completion Tracking Issues

### Incomplete or Incorrect Tracking Data

**Symptoms:**
- Users who completed training still get reminders
- Completion status not updating after acknowledgment
- Inconsistent reporting data

**Troubleshooting:**
1. Check database/storage for data consistency
2. Verify card submission handlers
3. Inspect data storage transaction logs
4. Check for race conditions in update logic

**Resolution:**
- Implement database consistency checks
- Add robust error handling to submission handlers
- Use transactions for related updates

```csharp
// Example fix for tracking updates
public async Task<bool> UpdateCompletionStatus(string userId, string trainingId, bool isCompleted)
{
    try
    {
        // Using transactions to ensure consistency
        using (var transaction = await _dbContext.Database.BeginTransactionAsync())
        {
            try
            {
                var userTraining = await _dbContext.UserTrainingStatus
                    .Where(u => u.UserId == userId && u.TrainingId == trainingId)
                    .FirstOrDefaultAsync();
                
                if (userTraining == null)
                {
                    userTraining = new UserTrainingStatus
                    {
                        UserId = userId,
                        TrainingId = trainingId,
                        IsCompleted = isCompleted,
                        CompletionDate = isCompleted ? DateTime.UtcNow : null,
                        LastReminderDate = DateTime.UtcNow
                    };
                    
                    _dbContext.UserTrainingStatus.Add(userTraining);
                }
                else
                {
                    userTraining.IsCompleted = isCompleted;
                    userTraining.CompletionDate = isCompleted ? DateTime.UtcNow : userTraining.CompletionDate;
                    userTraining.LastReminderDate = DateTime.UtcNow;
                    
                    _dbContext.UserTrainingStatus.Update(userTraining);
                }
                
                // Log the activity for audit
                _dbContext.UserActivityLogs.Add(new UserActivityLog
                {
                    UserId = userId,
                    TrainingId = trainingId,
                    Action = isCompleted ? "Completed" : "Acknowledged",
                    Timestamp = DateTime.UtcNow
                });
                
                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();
                
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to update completion status for user {UserId}, training {TrainingId}", userId, trainingId);
                throw;
            }
        }
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Transaction failed for user {UserId}, training {TrainingId}", userId, trainingId);
        return false;
    }
}
```

### Data Synchronization Problems

**Symptoms:**
- Discrepancies between bot database and training systems
- Outdated user lists
- New employees not receiving notifications

**Troubleshooting:**
1. Check synchronization jobs and schedules
2. Verify API connections to HR and training systems
3. Inspect error logs for synchronization failures

**Resolution:**
- Update synchronization logic
- Implement more frequent sync jobs
- Add monitoring and alerts for sync failures

## Database and Storage Errors

### Connection Failures

**Symptoms:**
- Database connection timeout errors
- "Cannot connect to server" messages
- Intermittent storage access issues

**Troubleshooting:**
1. Check connection strings
2. Verify network access rules
3. Test database connectivity from bot service
4. Check for database service outages

**Resolution:**
- Update connection strings
- Add service endpoints or firewall rules
- Implement connection pooling with retry logic

### Query Performance Issues

**Symptoms:**
- Slow bot responses
- Timeouts during user interaction
- High database CPU usage

**Troubleshooting:**
1. Identify slow queries using database monitoring
2. Check for missing indexes
3. Review query patterns for inefficiencies

**Resolution:**
- Add appropriate indexes
- Optimize query logic
- Implement caching for frequent lookups

```sql
-- Example SQL index improvements
CREATE INDEX IX_UserTrainingStatus_UserId_TrainingId ON UserTrainingStatus (UserId, TrainingId);
CREATE INDEX IX_UserTrainingStatus_CompletionDate ON UserTrainingStatus (CompletionDate) INCLUDE (UserId);
CREATE INDEX IX_UserTrainingStatus_LastReminderDate ON UserTrainingStatus (LastReminderDate) INCLUDE (UserId);
```

## Authentication and Permission Problems

### Token Acquisition Failures

**Symptoms:**
- "Failed to obtain access token" errors
- Cannot connect to Microsoft Graph
- Permission-related exceptions

**Troubleshooting:**
1. Verify client credentials are correct
2. Check for expired certificates
3. Review required permissions in AAD app registration

**Resolution:**
- Update client credentials
- Renew certificates
- Add missing delegated or application permissions

### Tenant Restrictions

**Symptoms:**
- Bot works for some tenants but not others
- Conditional access policy blocking
- Regional restrictions affecting functionality

**Troubleshooting:**
1. Check tenant-specific configurations
2. Review Microsoft Graph API access
3. Identify regional deployment constraints

**Resolution:**
- Configure multi-tenant access correctly
- Implement regional compliance features
- Address tenant-specific security requirements

## Teams Platform Limitations

### API Constraints

**Symptoms:**
- Features work in testing but not in production
- Functionality differences between personal, channel, and meeting scopes
- API version compatibility issues

**Troubleshooting:**
1. Review Teams platform capabilities and limitations
2. Check for API version inconsistencies
3. Test in different scopes (personal, channel, meeting)

**Resolution:**
- Update implementation to work within platform constraints
- Use supported APIs for specific scopes
- Implement fallback mechanisms for unsupported features

### Client Versioning Issues

**Symptoms:**
- Features work for some users but not others
- Mobile vs. desktop client inconsistencies
- Certain card elements missing on some clients

**Troubleshooting:**
1. Test across different Teams client versions
2. Verify feature support across platforms (web, desktop, mobile)
3. Check for version-specific workarounds

**Resolution:**
- Implement adaptive feature detection
- Provide alternative experiences for older clients
- Use supported feature subsets for maximum compatibility

## Logging and Diagnostics

### Enabling Enhanced Logging

To troubleshoot complex issues, enable enhanced logging:

```csharp
// Configure enhanced logging
public static IHostBuilder CreateHostBuilder(string[] args) =>
    Host.CreateDefaultBuilder(args)
        .ConfigureLogging((context, loggingBuilder) =>
        {
            loggingBuilder.ClearProviders();
            loggingBuilder.AddConsole();
            
            // Add Application Insights if available
            if (!string.IsNullOrEmpty(context.Configuration["ApplicationInsights:InstrumentationKey"]))
            {
                loggingBuilder.AddApplicationInsights(
                    context.Configuration["ApplicationInsights:InstrumentationKey"]);
            }
            
            // Set minimum level based on environment
            var environmentName = context.Configuration["ASPNETCORE_ENVIRONMENT"];
            if (environmentName == "Development")
            {
                loggingBuilder.SetMinimumLevel(LogLevel.Debug);
            }
            else
            {
                loggingBuilder.SetMinimumLevel(LogLevel.Information);
            }
            
            // Configure category-specific log levels
            loggingBuilder.AddFilter("Microsoft", LogLevel.Warning);
            loggingBuilder.AddFilter("System", LogLevel.Warning);
            loggingBuilder.AddFilter("ComplianceTrainingBot", LogLevel.Debug);
        });
```

### Diagnostic Data Collection

When troubleshooting persistent issues, collect the following diagnostic information:

1. Bot service logs (last 24 hours)
2. Teams client logs (if available)
3. Azure Function execution logs
4. Database query performance data
5. Network trace between bot and Teams service
6. Azure Bot Service channel registration status

## Advanced Troubleshooting

### Network Traffic Analysis

For complex connectivity issues, analyze network traffic:

```powershell
# Example of using Fiddler to capture bot traffic
$env:HTTPS_PROXY = "http://127.0.0.1:8888"
$env:HTTP_PROXY = "http://127.0.0.1:8888"

# Run your test script
./Test-BotConnectivity.ps1

# Reset proxy settings
$env:HTTPS_PROXY = ""
$env:HTTP_PROXY = ""
```

### Deployment Verification

After troubleshooting and fixing issues, verify the deployment:

```powershell
# Verify bot service deployment
$botServiceUrl = "https://your-bot-service-url/api/version"
$response = Invoke-RestMethod -Uri $botServiceUrl -Method Get

Write-Output "Bot version: $($response.version)"
Write-Output "Environment: $($response.environment)"

# Check bot registration status
$botName = "ComplianceTrainingBot"
$resourceGroup = "YourResourceGroup"

az bot show --name $botName --resource-group $resourceGroup
```

## FAQ

### Why do some users receive multiple reminders on the same day?

This typically occurs due to:
1. Multiple reminder schedules overlapping
2. Database transaction failures causing duplicate entries
3. Timer function executing multiple times

**Resolution:** Implement deduplication logic in the reminder sending code and add a cooldown period between reminders for the same user.

### How do I reset a user's training completion status?

Use the admin commands or API:

```
POST /api/admin/reset-user-status
{
  "userId": "user-aad-id",
  "trainingId": "compliance-training-2023",
  "adminUserId": "admin-aad-id",
  "reason": "Rescheduled training"
}
```

### What should I do if the bot stops responding completely?

1. Check the bot service health in Azure
2. Verify Teams service status at https://status.dev.microsoft.com
3. Restart the bot service
4. Check for recent deployments or configuration changes
5. Review application logs for critical errors
6. If necessary, rollback to a previous known-good deployment

### How can I test scheduled messages without waiting for the actual schedule?

Use the test endpoint to trigger messages manually:

```
POST /api/debug/trigger-scheduled-reminder
{
  "userId": "target-user-id",
  "trainingId": "compliance-training-id"
}
```

Note: This endpoint should be secured and only available in non-production environments.

---

## Support and Additional Resources

For additional assistance, contact:
- Teams Platform Support: [Microsoft Teams Support](https://support.microsoft.com/teams)
- Bot Framework Support: [Bot Framework Issues](https://github.com/microsoft/botframework-sdk/issues)
- Internal Support Team: compliance-bot-support@yourcompany.com

### Relevant Documentation

- [Microsoft Teams Bot Documentation](https://docs.microsoft.com/microsoftteams/platform/bots/what-are-bots)
- [Bot Framework Troubleshooting Guide](https://docs.microsoft.com/azure/bot-service/bot-service-troubleshoot-bot-configuration)
- [Adaptive Cards Schema and Documentation](https://adaptivecards.io/documentation/)
- [Teams Platform Rate Limiting](https://docs.microsoft.com/microsoftteams/platform/concepts/bots/rate-limit)
