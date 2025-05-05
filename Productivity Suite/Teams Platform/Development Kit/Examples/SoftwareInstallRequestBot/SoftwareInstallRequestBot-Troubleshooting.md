# Software Install Request Bot - Troubleshooting Guide

## Introduction

This comprehensive troubleshooting guide provides solutions for common issues encountered with the Software Install Request Bot, a Microsoft Teams-based solution for automating software installation requests. Use this document to diagnose and resolve problems across the bot's components, from deployment to operations.

## Table of Contents

- [Diagnostic Approach](#diagnostic-approach)
- [Common Issues](#common-issues)
  - [Deployment Issues](#deployment-issues)
  - [Teams Integration Issues](#teams-integration-issues)
  - [Authentication Issues](#authentication-issues)
  - [Bot Communication Issues](#bot-communication-issues)
  - [Adaptive Card Issues](#adaptive-card-issues)
  - [Approval Workflow Issues](#approval-workflow-issues)
  - [ITSM Integration Issues](#itsm-integration-issues)
  - [Notification Issues](#notification-issues)
  - [Performance Issues](#performance-issues)
- [Logging and Monitoring](#logging-and-monitoring)
- [Advanced Debugging Techniques](#advanced-debugging-techniques)
- [Contacting Support](#contacting-support)

## Diagnostic Approach

When troubleshooting the Software Install Request Bot, follow this systematic approach:

1. **Identify the failure point**: Determine which component in the request flow is failing
2. **Check logs**: Review logs at the identified failure point for error messages
3. **Verify configurations**: Ensure all configuration settings are correct
4. **Test connectivity**: Confirm all services can communicate with each other
5. **Isolate the issue**: Test individual components to narrow down the problem
6. **Apply resolution**: Implement the appropriate fix based on your findings
7. **Verify the fix**: Test to ensure the resolution has addressed the issue

## Common Issues

### Deployment Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Resource deployment failure | Azure deployment fails with error message | Insufficient permissions | Ensure the deploying account has Contributor role for the resource group |
| | | Resource name conflicts | Choose unique names for all resources or use the `uniqueString()` function in ARM templates |
| | | Resource limits reached | Check subscription quotas and request increases if needed |
| Bot registration issues | Bot channels registration fails | Duplicate bot ID | Use a unique bot ID that is not already registered |
| | | Invalid configuration | Verify all required fields are completed in the registration process |
| Teams app packaging error | App package validation fails | Manifest.json format errors | Use the Teams App Studio validator to check manifest.json |
| | | Missing icons or files | Ensure all referenced files are included in the package |
| Teams app deployment rejection | App is rejected during approval process | Policy violations | Review Teams app policies and ensure compliance |
| | | Missing privacy policy/terms of use | Add required links to privacy policy and terms of use |

#### Resolution Steps for Deployment Issues:

```powershell
# Check resource provider registration status
az provider show --namespace Microsoft.BotService --query "registrationState"

# Register resource provider if needed
az provider register --namespace Microsoft.BotService

# Validate ARM template before deployment
az deployment group validate --resource-group SoftwareRequestBot-RG --template-file deploy/azuredeploy.json

# Verify Teams app manifest
npm install -g office-addin-manifest
validate-office-addin manifest.json
```

### Teams Integration Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Bot not appearing in Teams | Bot not discoverable in Teams | App not installed properly | Reinstall the app and check installation logs |
| | | App not approved for tenant | Check with Teams admin to approve the app |
| Bot unresponsive in Teams | Bot does not respond to messages | Messaging endpoint incorrect | Verify the messaging endpoint in Bot Framework registration |
| | | Bot service not running | Check Azure Bot Service status and restart if needed |
| Command not recognized | `/request-software` command fails | Command not registered | Register command in manifest.json and update app |
| | | Command handler not implemented | Verify command handler exists in bot code |
| Tab rendering issues | Teams tab doesn't load content | Content URL issues | Check content URL and ensure it's HTTPS |
| | | CSP violations | Review Content Security Policy settings |

#### Resolving Teams Integration Issues:

```csharp
// Verify command registration in manifest.json
"commandLists": [
    {
        "commands": [
            {
                "title": "request-software",
                "description": "Request new software installation"
            }
        ],
        "scopes": ["personal", "team", "groupchat"]
    }
]

// Check command handler implementation
[Command("request-software")]
public async Task HandleSoftwareRequestCommand(ITurnContext turnContext, CancellationToken cancellationToken)
{
    // Implementation should be present
}
```

### Authentication Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Authentication failure | "Unauthorized" errors in logs | Invalid credentials | Verify and update bot credentials |
| | | Expired tokens | Implement proper token refresh logic |
| | | Missing permissions | Check required permissions in Azure AD app registration |
| SSO failure | Single Sign-On doesn't work | Incorrect SSO configuration | Review SSO configuration in manifest and Azure AD |
| | | Missing consent | Ensure admin consent has been provided for required permissions |
| Permission issues | "Access denied" errors | Insufficient permissions | Add required permissions and get admin consent |
| | | Role assignment missing | Assign appropriate roles to the service principal |
| Token acquisition failures | "Failed to acquire token" errors | Configuration issues | Check authentication flow and tenant ID configuration |
| | | Authentication endpoints unreachable | Verify network connectivity to authentication endpoints |

#### Fixing Authentication Issues:

```csharp
// Correct token acquisition with proper error handling
public async Task<string> GetTokenForResource(string resourceId)
{
    try
    {
        var authResult = await _confidentialClientApplication
            .AcquireTokenForClient(new[] { $"{resourceId}/.default" })
            .ExecuteAsync();
        return authResult.AccessToken;
    }
    catch (MsalServiceException ex) when (ex.Message.Contains("AADSTS70011"))
    {
        _logger.LogError("Invalid scope: {Error}", ex.Message);
        throw new ConfigurationException("Invalid resource ID or permission not granted");
    }
    catch (MsalServiceException ex)
    {
        _logger.LogError("Authentication error: {Error}", ex.Message);
        throw;
    }
}
```

### Bot Communication Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Connection errors | Bot disconnects frequently | Network issues | Check network stability and DNS configuration |
| | | Service limits reached | Increase service plan or optimize connection usage |
| Message delivery failures | Messages not reaching Teams | Endpoint configuration issues | Verify bot endpoint URL in Bot Framework |
| | | Channel misconfiguration | Check Teams channel configuration in Azure Bot Service |
| Slow response times | Bot takes too long to respond | Performance bottlenecks | Profile code and optimize slow operations |
| | | Insufficient resources | Scale up the bot service plan |
| Incomplete message handling | Bot doesn't process all messages | Faulty message processing logic | Debug the message handling pipeline |
| | | Exceptions in message handlers | Implement proper exception handling |
| Proactive messaging fails | Bot can't send notifications | Conversation reference not stored | Ensure conversation references are stored properly |
| | | Invalid conversation reference | Validate conversation references before use |

#### Resolving Bot Communication Issues:

```csharp
// Optimized proactive messaging with retry logic
public async Task SendProactiveMessageAsync(ConversationReference conversationReference, string message, int maxRetries = 3)
{
    int retryCount = 0;
    bool messageSent = false;

    while (!messageSent && retryCount < maxRetries)
    {
        try
        {
            await _adapter.ContinueConversationAsync(
                _botAppId,
                conversationReference,
                async (turnContext, cancellationToken) =>
                {
                    await turnContext.SendActivityAsync(message, cancellationToken: cancellationToken);
                },
                default);
            
            messageSent = true;
            _logger.LogInformation("Proactive message sent successfully");
        }
        catch (Exception ex)
        {
            retryCount++;
            _logger.LogWarning($"Failed to send proactive message (Attempt {retryCount}/{maxRetries}): {ex.Message}");
            
            if (retryCount < maxRetries)
            {
                // Exponential backoff
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount)));
            }
            else
            {
                _logger.LogError($"Failed to send proactive message after {maxRetries} attempts: {ex.Message}");
                throw;
            }
        }
    }
}
```

### Adaptive Card Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Cards not rendering | Blank or error message in Teams | JSON structure errors | Validate Adaptive Card JSON against schema |
| | | Unsupported features | Ensure all card elements are supported in Teams |
| Form submission failures | "Unable to submit form" errors | Action URL configuration | Verify the action URL in card payload |
| | | Request payload issues | Check form data structure and validation |
| Card input validation errors | Invalid input errors | Validation rules misconfiguration | Correct validation rules in card definition |
| | | Client-side validation failing | Implement proper client-side validation |
| Card update failures | Cards not updating on status change | Card ID issues | Ensure card IDs are consistent for updates |
| | | Update action misconfigured | Verify update action is properly configured |
| Action handling failures | Card actions don't trigger expected behavior | Action handler issues | Debug action handler implementation |
| | | Action payload incorrect | Verify action data structure |

#### Fixing Adaptive Card Issues:

```json
// Validating an Adaptive Card JSON structure
{
    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    "type": "AdaptiveCard",
    "version": "1.3",
    "body": [
        {
            "type": "TextBlock",
            "text": "Software Installation Request",
            "weight": "Bolder",
            "size": "Medium"
        },
        {
            "type": "Input.Text",
            "id": "softwareName",
            "label": "Software Name",
            "isRequired": true,
            "errorMessage": "Software name is required"
        },
        {
            "type": "Input.Text",
            "id": "version",
            "label": "Version (Optional)"
        },
        {
            "type": "Input.Text",
            "id": "justification",
            "label": "Business Justification",
            "isMultiline": true,
            "isRequired": true,
            "errorMessage": "Please provide a business justification"
        }
    ],
    "actions": [
        {
            "type": "Action.Submit",
            "title": "Submit Request",
            "data": {
                "actionType": "submitRequest"
            }
        }
    ]
}
```

```csharp
// Properly handling card action responses
public async Task<InvokeResponse> OnTeamsCardActionInvokeAsync(ITurnContext<IInvokeActivity> turnContext, CancellationToken cancellationToken)
{
    try
    {
        var action = JsonConvert.DeserializeObject<CardActionInvokeValue>(turnContext.Activity.Value.ToString());
        
        switch (action.ActionType)
        {
            case "submitRequest":
                var request = new SoftwareRequest
                {
                    SoftwareName = action.SoftwareName,
                    SoftwareVersion = action.Version,
                    BusinessJustification = action.Justification,
                    RequesterId = turnContext.Activity.From.Id
                };
                
                await _requestProcessor.ProcessNewRequestAsync(request);
                
                return CreateInvokeResponseWithMessage("Your software request has been submitted successfully.");
                
            case "approveRequest":
                await _approvalService.ApproveRequestAsync(action.RequestId, turnContext.Activity.From.Id);
                return CreateInvokeResponseWithMessage("Request approved successfully.");
                
            case "rejectRequest":
                await _approvalService.RejectRequestAsync(action.RequestId, turnContext.Activity.From.Id, action.Reason);
                return CreateInvokeResponseWithMessage("Request rejected.");
                
            default:
                _logger.LogWarning($"Unknown action type: {action.ActionType}");
                return CreateInvokeResponseWithMessage("Unknown action.");
        }
    }
    catch (Exception ex)
    {
        _logger.LogError($"Error handling card action: {ex.Message}");
        return CreateInvokeResponseWithMessage("An error occurred processing your request.");
    }
}

private InvokeResponse CreateInvokeResponseWithMessage(string message)
{
    return new InvokeResponse
    {
        Status = 200,
        Body = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveTextBlock
                {
                    Text = message,
                    Weight = AdaptiveTextWeight.Bolder
                }
            }
        }
    };
}
```

### Approval Workflow Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Approvers not identified | "No approvers found" error | Approver mapping configuration | Check approver mapping configuration |
| | | AD group membership issues | Verify AD group memberships for approvers |
| Approval requests not sent | Approvers don't receive notifications | Notification failure | Check notification service logs |
| | | Invalid approver information | Validate approver contact information |
| Approval chain breaks | Workflow stalls at a specific stage | Multi-level approval misconfiguration | Review approval chain configuration |
| | | Approver unavailability | Implement backup approver configuration |
| Approval actions not registered | System doesn't recognize approvals | Action handler issues | Debug approval action handlers |
| | | Data persistence failures | Check database connections and writes |
| Escalations not triggered | No escalation after timeout | Escalation timer misconfiguration | Verify escalation timer settings |
| | | Escalation logic failures | Debug escalation trigger logic |

#### Resolving Approval Workflow Issues:

```csharp
// Implementing robust approver identification
public async Task<List<string>> GetApproversForRequestAsync(SoftwareRequest request)
{
    try
    {
        // Primary approach: Direct configuration mapping
        var approvers = await _approverConfigService.GetApproversForSoftwareCategoryAsync(request.SoftwareCategory);
        
        if (approvers.Any())
        {
            _logger.LogInformation($"Found {approvers.Count} configured approvers for category {request.SoftwareCategory}");
            return approvers;
        }
        
        // Fallback: Organizational hierarchy
        var managerChain = await _directoryService.GetManagementChainAsync(request.RequesterId, maxLevels: 2);
        
        if (managerChain.Any())
        {
            _logger.LogInformation($"Using management chain with {managerChain.Count} managers as approvers");
            return managerChain;
        }
        
        // Last resort: Default approvers
        var defaultApprovers = _configuration.GetSection("DefaultApprovers").Get<List<string>>();
        
        if (defaultApprovers != null && defaultApprovers.Any())
        {
            _logger.LogInformation("Using default approvers");
            return defaultApprovers;
        }
        
        _logger.LogError("No approvers found for request");
        throw new ApprovalConfigurationException("No approvers could be identified for this request");
    }
    catch (Exception ex) when (ex is not ApprovalConfigurationException)
    {
        _logger.LogError($"Error identifying approvers: {ex.Message}");
        throw new ApprovalConfigurationException("Error while identifying approvers", ex);
    }
}

// Implementing approval escalation
public async Task CheckForEscalationsAsync()
{
    var pendingApprovals = await _requestRepository.GetPendingApprovalsOlderThanAsync(
        TimeSpan.FromHours(_configuration.GetValue<int>("ApprovalEscalationHours", 24)));
    
    foreach (var pendingApproval in pendingApprovals)
    {
        try
        {
            _logger.LogInformation($"Processing escalation for request {pendingApproval.RequestId}");
            
            // Get escalation path
            var escalationApprover = await _escalationService.GetEscalationApproverAsync(
                pendingApproval.CurrentApproverId);
            
            if (escalationApprover == null)
            {
                _logger.LogWarning($"No escalation approver found for {pendingApproval.CurrentApproverId}");
                continue;
            }
            
            // Update approval assignment
            await _requestRepository.UpdateApproverAsync(
                pendingApproval.RequestId, 
                escalationApprover);
            
            // Send notifications
            await _notificationService.SendEscalationNotificationAsync(
                pendingApproval, 
                escalationApprover);
            
            await _notificationService.SendEscalationInfoToRequesterAsync(
                pendingApproval);
            
            _logger.LogInformation($"Escalated approval for request {pendingApproval.RequestId} to {escalationApprover}");
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error processing escalation for request {pendingApproval.RequestId}: {ex.Message}");
        }
    }
}
```

### ITSM Integration Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Ticket creation failure | ITSM system shows no new tickets | API configuration issues | Verify API endpoints and authentication |
| | | Payload formatting errors | Check payload structure against API requirements |
| Status synchronization issues | Status updates not reflected | Webhook configuration | Verify webhook configuration in ITSM system |
| | | Event handling issues | Debug event handler implementation |
| Field mapping errors | Data appears in wrong fields | Field mapping configuration | Update field mapping configuration |
| | | Data type mismatches | Ensure data types match between systems |
| Connection timeouts | Operations time out | Network connectivity | Check network connectivity and firewall rules |
| | | ITSM system performance | Monitor ITSM system performance |
| Authentication failures | "Unauthorized" errors | Expired credentials | Update API credentials |
| | | Insufficient permissions | Request additional API permissions |

#### Resolving ITSM Integration Issues:

```csharp
// Robust ITSM integration with retry and error handling
public async Task<string> CreateServiceNowTicketAsync(SoftwareRequest request)
{
    // Configure retry policy
    var retryPolicy = Policy
        .Handle<HttpRequestException>()
        .Or<TaskCanceledException>()
        .OrResult<HttpResponseMessage>(r => !r.IsSuccessStatusCode)
        .WaitAndRetryAsync(
            3,
            retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            (result, timeSpan, retryCount, context) =>
            {
                _logger.LogWarning($"ServiceNow ticket creation attempt {retryCount} failed. Waiting {timeSpan} before next retry.");
            });

    try
    {
        // Prepare ticket data with proper mapping
        var ticketData = new Dictionary<string, object>
        {
            ["short_description"] = $"Software Installation Request: {request.SoftwareName}",
            ["description"] = FormatTicketDescription(request),
            ["urgency"] = MapUrgencyLevel(request.UrgencyLevel),
            ["impact"] = MapImpactLevel(request.UrgencyLevel),
            ["assignment_group"] = _configuration["ServiceNow:SoftwareAssignmentGroup"],
            ["caller_id"] = await GetServiceNowUserIdAsync(request.RequesterId),
            ["u_software_name"] = request.SoftwareName,
            ["u_software_version"] = request.SoftwareVersion ?? "Latest",
            ["u_business_justification"] = request.BusinessJustification,
            ["u_request_source"] = "Teams Bot"
        };

        // Execute with retry policy
        var response = await retryPolicy.ExecuteAsync(async () =>
        {
            var serviceNowClient = _httpClientFactory.CreateClient("ServiceNowClient");
            return await serviceNowClient.PostAsJsonAsync("api/now/table/incident", ticketData);
        });

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError($"ServiceNow API returned an error. Status: {response.StatusCode}, Content: {errorContent}");
            throw new IntegrationException($"Failed to create ServiceNow ticket. Status code: {response.StatusCode}");
        }

        var responseBody = await response.Content.ReadFromJsonAsync<ServiceNowResponse>();
        
        if (responseBody?.result?.sys_id == null)
        {
            _logger.LogError("ServiceNow response did not contain a valid ticket ID");
            throw new IntegrationException("ServiceNow response did not contain a valid ticket ID");
        }
        
        _logger.LogInformation($"Successfully created ServiceNow ticket {responseBody.result.sys_id}");
        return responseBody.result.sys_id;
    }
    catch (Exception ex)
    {
        _logger.LogError($"Error creating ServiceNow ticket: {ex}");
        throw new IntegrationException("Failed to create ServiceNow ticket", ex);
    }
}
```

### Notification Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| Notifications not sent | Users don't receive alerts | Messaging permissions | Check bot permissions for proactive messaging |
| | | Invalid conversation references | Verify stored conversation references |
| Delayed notifications | Notifications arrive late | Service throttling | Implement proper throttling handling |
| | | Background job issues | Check background job execution |
| Missing notification content | Notifications lack required information | Template errors | Check notification templates |
| | | Data retrieval issues | Verify data availability for notifications |
| Duplicate notifications | Users receive multiple identical alerts | Race conditions | Implement idempotent notification handling |
| | | Retry logic issues | Review and fix retry logic |
| Notification formatting issues | Content appears incorrectly | Template rendering problems | Debug template rendering |
| | | Encoding issues | Check for proper text encoding |

#### Solving Notification Issues:

```csharp
// Implementing idempotent notification handling
public async Task SendNotificationAsync(string userId, NotificationType type, string referenceId, string message)
{
    // Generate deterministic notification ID
    var notificationId = $"{type}_{referenceId}_{DateTime.UtcNow.Date:yyyyMMdd}";
    
    // Check if notification already sent
    if (await _notificationRepository.HasNotificationBeenSentAsync(notificationId))
    {
        _logger.LogInformation($"Notification {notificationId} already sent, skipping");
        return;
    }
    
    try
    {
        // Get valid conversation reference
        var conversationReference = await _conversationStore.GetConversationReferenceAsync(userId);
        
        if (conversationReference == null)
        {
            _logger.LogWarning($"No conversation reference found for user {userId}");
            return;
        }
        
        // Create notification card
        var card = CreateNotificationCard(type, referenceId, message);
        
        // Send notification
        await _adapter.ContinueConversationAsync(
            _botAppId,
            conversationReference,
            async (turnContext, cancellationToken) =>
            {
                var activity = MessageFactory.Attachment(card);
                await turnContext.SendActivityAsync(activity, cancellationToken);
            },
            default);
        
        // Mark as sent
        await _notificationRepository.MarkNotificationSentAsync(notificationId);
        
        _logger.LogInformation($"Successfully sent notification {notificationId} to user {userId}");
    }
    catch (Exception ex)
    {
        _logger.LogError($"Failed to send notification {notificationId} to user {userId}: {ex.Message}");
        throw;
    }
}
```

### Performance Issues

| Issue | Symptoms | Possible Cause | Resolution |
|-------|----------|----------------|------------|
| High latency | Slow response times | Insufficient resources | Scale up service plan |
| | | Inefficient code | Optimize code paths and database queries |
| Memory leaks | Increasing memory usage over time | Resource disposal issues | Ensure proper disposal of resources |
| | | Caching problems | Review and fix caching strategies |
| Database bottlenecks | Slow database operations | Missing indexes | Add appropriate database indexes |
| | | Inefficient queries | Optimize database queries |
| CPU spikes | High CPU utilization | Computational inefficiencies | Profile and optimize CPU-intensive operations |
| | | Background processing issues | Review background job scheduling |
| Connection pool exhaustion | Connection-related errors | Connection leaks | Ensure connections are properly closed |
| | | Insufficient pool size | Increase connection pool size |

#### Addressing Performance Issues:

```csharp
// Optimizing database queries with proper indexing
// Add this to your database migration
public static void OptimizeRequestsTable(MigrationBuilder migrationBuilder)
{
    // Index for status-based queries (most common filtering scenario)
    migrationBuilder.CreateIndex(
        name: "IX_Requests_Status",
        table: "Requests",
        column: "Status");
    
    // Composite index for approver-based queries with status filtering
    migrationBuilder.CreateIndex(
        name: "IX_Requests_ApproverId_Status",
        table: "Requests",
        columns: new[] { "CurrentApproverId", "Status" });
    
    // Index for requester-based queries
    migrationBuilder.CreateIndex(
        name: "IX_Requests_RequesterId",
        table: "Requests",
        column: "RequesterId");
}

// Implementing efficient caching with memory optimization
public class CachedApproverService : IApproverService
{
    private readonly IApproverService _innerService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CachedApproverService> _logger;
    private readonly TimeSpan _cacheExpiration;
    
    public CachedApproverService(
        IApproverService innerService, 
        IMemoryCache cache,
        ILogger<CachedApproverService> logger,
        IConfiguration configuration)
    {
        _innerService = innerService;
        _cache = cache;
        _logger = logger;
        _cacheExpiration = TimeSpan.FromMinutes(
            configuration.GetValue<int>("Cache:ApproverExpirationMinutes", 15));
    }
    
    public async Task<List<string>> GetApproversForCategoryAsync(string category)
    {
        var cacheKey = $"approvers_{category}";
        
        if (_cache.TryGetValue(cacheKey, out List<string> cachedApprovers))
        {
            _logger.LogDebug($"Cache hit for approvers of category {category}");
            return cachedApprovers;
        }
        
        _logger.LogDebug($"Cache miss for approvers of category {category}");
        var approvers = await _innerService.GetApproversForCategoryAsync(category);
        
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(_cacheExpiration)
            .SetSize(1); // Size is relative to other cached items
        
        _cache.Set(cacheKey, approvers, cacheOptions);
        
        return approvers;
    }
}
```

## Logging and Monitoring

Effective logging and monitoring are essential for troubleshooting the Software Install Request Bot. Here's how to set up and use them:

### Configuring Logging

1. **Application Insights Setup**:

   ```json
   // In appsettings.json
   {
     "ApplicationInsights": {
       "InstrumentationKey": "your-instrumentation-key",
       "LogLevel": {
         "Default": "Information",
         "Microsoft": "Warning",
         "Microsoft.Hosting.Lifetime": "Information",
         "SoftwareRequestBot": "Debug"
       }
     }
   }
   ```

2. **Structured Logging Implementation**:

   ```csharp
   // In Program.cs
   public static IHostBuilder CreateHostBuilder(string[] args) =>
       Host.CreateDefaultBuilder(args)
           .ConfigureWebHostDefaults(webBuilder =>
           {
               webBuilder.UseStartup<Startup>();
           })
           .ConfigureLogging((hostingContext, logging) =>
           {
               logging.ClearProviders();
               logging.AddConsole();
               logging.AddApplicationInsights();
               
               // Add custom enrichers
               logging.AddFilter<ApplicationInsightsLoggerProvider>(
                   "SoftwareRequestBot", LogLevel.Debug);
           });
   ```

3. **Key Metrics to Monitor**:

   - Request volume and success rate
   - Approval response time
   - ITSM integration success rate
   - Bot response time
   - Error frequency by component
   - Active user count

### Log Analysis Techniques

To effectively analyze logs for troubleshooting:

1. **Correlation ID Tracking**:

   ```csharp
   // Add a correlation ID to each request flow
   public async Task ProcessRequestAsync(SoftwareRequest request)
   {
       var correlationId = Guid.NewGuid().ToString();
       using (_logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
       {
           _logger.LogInformation("Processing software request {RequestId} for {SoftwareName}", 
               request.RequestId, request.SoftwareName);
           
           // Process the request...
       }
   }
   ```

2. **Kusto Query Examples for Application Insights**:

   ```kusto
   // Find all errors for a specific request
   traces
   | where customDimensions.CorrelationId == "specific-correlation-id"
   | where severityLevel >= 3
   | order by timestamp asc
   
   // Identify most common errors
   exceptions
   | where timestamp > ago(24h)
   | summarize count() by type, method, outerMessage
   | top 10 by count_ desc
   
   // Track performance over time
   requests
   | where name contains "ProcessSoftwareRequest"
   | summarize avg(duration), percentile(duration, 95) by bin(timestamp, 1h)
   | render timechart
   ```

## Advanced Debugging Techniques

For complex issues, use these advanced debugging approaches:

### Bot Framework Emulator

1. **Local Debugging Setup**:

   ```bash
   # Install Bot Framework Emulator
   npm install -g @microsoft/botframework-emulator
   
   # Start the bot locally
   dotnet run --project SoftwareRequestBot.csproj
   
   # Connect with the emulator to http://localhost:3978/api/messages
   ```

2. **Conversation Flow Analysis**:

   - Use the Inspector feature to examine message contents
   - Review the full activity JSON for detailed debugging
   - Test different conversation paths in isolation

### Network Traffic Analysis

For integration issues, analyze the network traffic:

1. **Azure API Management Tracing**:

   ```bash
   # Enable tracing in Azure API Management
   az apim api operation update \
       --resource-group SoftwareRequestBot-RG \
       --service-name SoftwareRequestBot-APIM \
       --api-id software-request-bot-api \
       --operation-id ProcessRequest \
       --set tracingEnabled=true
   ```

2. **Fiddler Inspection for Local Development**:

   - Configure Fiddler to decrypt HTTPS traffic
   - Add request and response breakpoints
   - Filter traffic to isolate relevant endpoints

### Environment Isolation Testing

Test components in isolation to identify issues:

1. **Mock External Services**:

   ```csharp
   // Mock ITSM service for isolated testing
   public class MockITSMService : IITSMService
   {
       private readonly ILogger<MockITSMService> _logger;
       
       public MockITSMService(ILogger<MockITSMService> logger)
       {
           _logger = logger;
       }
       
       public async Task<string> CreateTicketAsync(SoftwareRequest request)
       {
           _logger.LogInformation("Creating mock ticket for request {RequestId}", request.RequestId);
           await Task.Delay(100); // Simulate network delay
           return $"MOCK-{Guid.NewGuid()}";
       }
       
       // Implement other methods with predictable behaviors
   }
   ```

2. **Component Isolation Testing**:

   ```powershell
   # Test bot messaging in isolation
   $headers = @{
       "Content-Type" = "application/json"
   }
   
   $body = @{
       type = "message"
       text = "/request-software"
       from = @{
           id = "test-user-id"
           name = "Test User"
       }
       recipient = @{
           id = "bot-id"
       }
       conversation = @{
           id = "test-conversation-id"
       }
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "https://your-bot-url/api/messages" -Method Post -Headers $headers -Body $body
   ```

## Contacting Support

If you've followed all troubleshooting steps and still encounter issues, follow these support escalation procedures:

### Escalation Path

1. **Internal Support**:
   - Consult your organization's IT support team
   - Check the internal knowledge base for known issues

2. **Microsoft Support**:
   - File a support ticket through the Azure portal
   - Provide detailed information including:
     - Error messages and logs
     - Steps to reproduce
     - Environment details
     - Recent changes to the system

3. **Community Resources**:
   - Microsoft Q&A: Submit questions to [Microsoft Q&A](https://docs.microsoft.com/en-us/answers/topics/azure-bot-service.html)
   - Stack Overflow: Use tags `azure-bot-service`, `microsoft-teams`, and `adaptive-cards`
   - GitHub Issues: Report potential bugs in the Bot Framework components

### Information to Provide

When seeking support, prepare the following information:

1. **Environment Details**:
   - Azure regions and subscription details
   - Bot Framework SDK version
   - Teams client version
   - Resource names and IDs

2. **Diagnostic Information**:
   - Application Insights logs
   - Error messages and stack traces
   - Correlation IDs for specific failures
   - Screenshots of UI issues

3. **Reproduction Steps**:
   - Clear, numbered steps to reproduce the issue
   - Expected behavior vs. actual behavior
   - Frequency of the issue (intermittent or consistent)

4. **Recent Changes**:
   - Recent deployments or updates
   - Configuration changes
   - External system changes (ITSM, Azure AD, etc.)

---

By following this troubleshooting guide, you should be able to diagnose and resolve most issues with the Software Install Request Bot. Remember to start with the systematic approach outlined at the beginning and work through the specific issues and solutions relevant to your situation.
