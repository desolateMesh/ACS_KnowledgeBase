# Proactive Messaging in Azure Communication Services Bots

## Overview

Proactive messaging enables bots built on Azure Communication Services (ACS) to initiate conversations with users rather than waiting for users to send the first message. This capability is essential for scenarios like notifications, alerts, reminders, and service updates where timely communication is critical.

## Key Concepts

### What is Proactive Messaging?

Proactive messaging refers to a communication pattern where:
- A bot or service initiates the conversation
- Messages are sent without requiring user prompt
- Communication can begin outside of active conversation sessions
- Targeted messages can be sent to specific users or user groups

### Difference Between Reactive and Proactive Messaging

| Reactive Messaging | Proactive Messaging |
|-------------------|---------------------|
| User initiates the conversation | Bot initiates the conversation |
| Response to user queries | Unprompted notifications or alerts |
| Occurs within an existing conversation | Can create new conversation threads |
| Typically synchronous | Often asynchronous |

## Implementation Approaches

### 1. Direct Proactive Messaging

This approach involves directly sending messages to a user without an existing conversation context.

#### Technical Requirements

- User's ACS Identity/User ID or Teams User ID
- Bot registration in Azure
- Appropriate permissions and consent

#### Implementation Steps

1. **Obtain User Identity**:
   ```csharp
   // Example of obtaining user identity
   string userId = "8:acs:userId@domain.com";
   ```

2. **Create Conversation**:
   ```csharp
   // Create a new conversation reference
   var conversationReference = new ConversationReference
   {
       ChannelId = "acsChannel",
       User = new ChannelAccount { Id = userId },
       ServiceUrl = "https://acsbot.communication.azure.com"
   };
   ```

3. **Send Proactive Message**:
   ```csharp
   // Send a proactive message
   await adapter.ContinueConversationAsync(
       botAppId,
       conversationReference,
       async (turnContext, cancellationToken) =>
       {
           await turnContext.SendActivityAsync("This is a proactive notification from your ACS Bot.");
       },
       CancellationToken.None);
   ```

### 2. Scheduled Proactive Messaging

This approach involves scheduling messages to be sent at specific times or intervals.

#### Technical Components

- Azure Functions or WebJobs for scheduling
- Azure Storage for maintaining user state and scheduling information
- ACS Bot Framework SDK

#### Implementation Example

```csharp
[FunctionName("SendScheduledMessages")]
public static async Task Run(
    [TimerTrigger("0 */30 * * * *")] TimerInfo myTimer, // Runs every 30 minutes
    ILogger log)
{
    // Get users who should receive messages at this time
    var usersToNotify = await GetUsersToNotifyAsync();
    
    foreach (var user in usersToNotify)
    {
        // Create adapter
        var adapter = new BotFrameworkHttpAdapter();
        
        // Get conversation reference for user
        var conversationRef = await GetConversationReferenceAsync(user.Id);
        
        // Send proactive message
        await adapter.ContinueConversationAsync(
            botAppId,
            conversationRef,
            async (turnContext, cancellationToken) =>
            {
                await turnContext.SendActivityAsync($"Scheduled reminder: {user.ReminderMessage}");
            },
            CancellationToken.None);
    }
}
```

### 3. Event-Triggered Proactive Messaging

This approach sends messages in response to external events or triggers.

#### Event Sources

- Azure Event Grid
- Azure Service Bus
- Webhooks from external systems
- Database triggers

#### Implementation Pattern

1. **Configure Event Subscription**:
   ```csharp
   // Azure Function triggered by Event Grid
   [FunctionName("ProcessEvent")]
   public static async Task Run(
       [EventGridTrigger] EventGridEvent eventGridEvent,
       ILogger log)
   {
       // Deserialize event data
       var eventData = JsonConvert.DeserializeObject<MyEventData>(eventGridEvent.Data.ToString());
       
       // Get affected users
       var users = await GetAffectedUsersAsync(eventData);
       
       // Send proactive notifications
       foreach (var user in users)
       {
           await SendProactiveMessageAsync(user.Id, $"Alert: {eventData.AlertMessage}");
       }
   }
   ```

## Best Practices

### 1. User Consent and Privacy

- Always obtain appropriate consent before sending proactive messages
- Provide clear opt-out mechanisms
- Comply with relevant privacy regulations (GDPR, CCPA, etc.)
- Document data retention policies

### 2. Message Frequency and Timing

- Avoid sending too many messages in a short timeframe
- Consider time zones when scheduling messages
- Implement rate limiting to prevent spam-like behavior
- Allow users to set preferred notification times

### 3. Error Handling and Resilience

- Implement retry mechanisms for failed message delivery
- Log delivery failures for analysis
- Handle user unavailability scenarios gracefully
- Consider using queues to manage message delivery

```csharp
public async Task SendProactiveMessageWithRetry(string userId, string message, int maxRetries = 3)
{
    int attempts = 0;
    bool success = false;
    
    while (!success && attempts < maxRetries)
    {
        try
        {
            await SendProactiveMessageAsync(userId, message);
            success = true;
        }
        catch (Exception ex)
        {
            attempts++;
            _logger.LogWarning($"Failed to send proactive message to {userId}. Attempt {attempts} of {maxRetries}. Error: {ex.Message}");
            
            if (attempts < maxRetries)
            {
                // Exponential backoff
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempts)));
            }
        }
    }
    
    if (!success)
    {
        _logger.LogError($"Failed to send proactive message to {userId} after {maxRetries} attempts.");
        // Consider storing failed messages for later delivery
    }
}
```

### 4. User Experience Considerations

- Provide context in your messages
- Include deep links to relevant content when applicable
- Consider message priority and categorization
- Test proactive messaging flows with real users

## Integration with Other Azure Services

### 1. Azure Logic Apps

Use Logic Apps to create workflows that trigger proactive messages based on complex conditions:

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "actions": {
      "Send_Proactive_Message": {
        "inputs": {
          "body": {
            "userId": "@triggerBody()?['userId']",
            "message": "Your order status has changed to: @{triggerBody()?['orderStatus']}"
          },
          "function": {
            "id": "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Web/sites/{function-app-name}/functions/SendProactiveMessage"
          }
        },
        "type": "Function"
      }
    },
    "triggers": {
      "When_an_order_status_changes": {
        // Logic App trigger configuration
      }
    }
  }
}
```

### 2. Azure Event Grid

Subscribe to events from various Azure services to trigger proactive messages:

```csharp
// Configure Event Grid subscription
var eventGridSubscription = new EventGridSubscription
{
    Destination = new WebHookEventSubscriptionDestination
    {
        EndpointUrl = "https://your-function-app.azurewebsites.net/api/ProcessEvent"
    },
    Filter = new EventSubscriptionFilter
    {
        IncludedEventTypes = new[] { "Microsoft.Storage.BlobCreated", "Microsoft.Storage.BlobDeleted" }
    }
};

// Create or update the subscription
await eventGridClient.EventSubscriptions.CreateOrUpdateAsync(
    scope,
    eventGridSubscriptionName,
    eventGridSubscription);
```

### 3. Azure Monitor Alerts

Use Azure Monitor to detect system issues and trigger notifications:

```json
{
  "properties": {
    "description": "Alert when service availability drops below threshold",
    "severity": 1,
    "enabled": true,
    "scopes": [
      "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Insights/components/{application-insights-name}"
    ],
    "evaluationFrequency": "PT1M",
    "windowSize": "PT5M",
    "criteria": {
      "odata.type": "Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria",
      "allOf": [
        {
          "name": "Availability",
          "metricName": "availabilityResults/availabilityPercentage",
          "operator": "LessThan",
          "threshold": 90,
          "timeAggregation": "Average"
        }
      ]
    },
    "actions": [
      {
        "actionGroupId": "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Insights/actionGroups/{action-group-name}"
      }
    ]
  }
}
```

## Advanced Scenarios

### 1. Adaptive Cards in Proactive Messages

Enhance proactive messages with interactive Adaptive Cards:

```csharp
public async Task SendProactiveAdaptiveCard(string userId, string title, string description)
{
    var adaptiveCard = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
    {
        Body = new List<AdaptiveElement>
        {
            new AdaptiveTextBlock { Text = title, Size = AdaptiveTextSize.Large, Weight = AdaptiveTextWeight.Bolder },
            new AdaptiveTextBlock { Text = description, Wrap = true },
            new AdaptiveActionSet
            {
                Actions = new List<AdaptiveAction>
                {
                    new AdaptiveSubmitAction { Title = "View Details", Data = new { action = "viewDetails" } },
                    new AdaptiveSubmitAction { Title = "Dismiss", Data = new { action = "dismiss" } }
                }
            }
        }
    };
    
    var conversationReference = await GetConversationReferenceAsync(userId);
    
    await adapter.ContinueConversationAsync(
        botAppId,
        conversationReference,
        async (turnContext, cancellationToken) =>
        {
            var activity = MessageFactory.Attachment(new Attachment
            {
                ContentType = AdaptiveCard.ContentType,
                Content = adaptiveCard
            });
            
            await turnContext.SendActivityAsync(activity);
        },
        CancellationToken.None);
}
```

### 2. Multi-Channel Proactive Messaging

Send proactive messages across multiple channels (Teams, SMS, Email):

```csharp
public async Task SendMultiChannelProactiveMessage(string userId, string message)
{
    // Get user communication preferences
    var userPreferences = await _userService.GetCommunicationPreferencesAsync(userId);
    
    // Send to Teams if enabled
    if (userPreferences.TeamsEnabled)
    {
        await SendTeamsProactiveMessageAsync(userPreferences.TeamsUserId, message);
    }
    
    // Send via SMS if enabled
    if (userPreferences.SmsEnabled)
    {
        await _smsService.SendSmsAsync(userPreferences.PhoneNumber, message);
    }
    
    // Send via email if enabled
    if (userPreferences.EmailEnabled)
    {
        await _emailService.SendEmailAsync(userPreferences.EmailAddress, "Notification", message);
    }
}
```

### 3. Conversational AI in Proactive Messages

Combine proactive messaging with conversational AI capabilities:

```csharp
public async Task SendProactiveAIMessage(string userId, string context)
{
    // Get user data for personalization
    var userData = await _userService.GetUserDataAsync(userId);
    
    // Generate personalized message using Azure OpenAI Service
    var messageContent = await _openAiService.GeneratePersonalizedMessageAsync(
        userData,
        context,
        _botSettings.MessageTemplate);
    
    // Send the AI-generated message proactively
    await SendProactiveMessageAsync(userId, messageContent);
}
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| 401 Unauthorized | Invalid bot credentials | Verify Bot Framework authentication credentials |
| 403 Forbidden | Insufficient permissions | Check required permissions and consent |
| 404 Not Found | Invalid user ID or conversation | Verify user identity and conversation reference |
| Message delivery failure | User unavailable | Implement retry mechanism with backoff strategy |
| Rate limiting | Too many messages in short time | Implement throttling and message queuing |

### Diagnostic Steps

1. **Enable Verbose Logging**:
   ```csharp
   var adapter = new BotFrameworkHttpAdapter(new AdapterRecordingOptions
   {
       LoggingLevel = LogLevel.Trace
   });
   ```

2. **Monitor Bot Framework Service Health**:
   - Check Azure Service Health dashboard
   - Verify ACS service status

3. **Validate Message Payload**:
   - Ensure message format is correct
   - Check for message size limits

4. **Verify Bot Registration**:
   - Confirm bot registration in Azure portal
   - Check endpoint URL configuration

## Security Considerations

### 1. Authentication and Authorization

- Use bot authentication tokens securely
- Implement proper secret management
- Rotate credentials regularly
- Use Azure Key Vault for storing secrets

### 2. Data Protection

- Encrypt sensitive data
- Minimize personal information in messages
- Implement proper data retention policies
- Follow the principle of least privilege

### 3. Compliance

- Ensure messaging complies with regulations
- Maintain audit trails of sent messages
- Document consent management
- Consider regional data residency requirements

## Performance Optimization

### 1. Batching and Bulk Sending

For sending messages to multiple users:

```csharp
public async Task SendBulkProactiveMessages(List<string> userIds, string message)
{
    // Create batches of users (e.g., 100 per batch)
    var userBatches = userIds.Chunk(100);
    
    foreach (var batch in userBatches)
    {
        // Create tasks for each user in the batch
        var sendTasks = batch.Select(userId => 
            SendProactiveMessageAsync(userId, message));
        
        // Execute batch in parallel with limited concurrency
        await Task.WhenAll(sendTasks);
        
        // Add delay between batches to avoid throttling
        await Task.Delay(TimeSpan.FromSeconds(1));
    }
}
```

### 2. Caching

Implement caching for conversation references:

```csharp
public class ConversationReferenceCache
{
    private readonly IDistributedCache _cache;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromHours(24);
    
    public ConversationReferenceCache(IDistributedCache cache)
    {
        _cache = cache;
    }
    
    public async Task<ConversationReference> GetConversationReferenceAsync(string userId)
    {
        var cacheKey = $"ConvRef_{userId}";
        var cachedData = await _cache.GetStringAsync(cacheKey);
        
        if (!string.IsNullOrEmpty(cachedData))
        {
            return JsonConvert.DeserializeObject<ConversationReference>(cachedData);
        }
        
        // Cache miss - retrieve from database
        var conversationRef = await _conversationRepository.GetConversationReferenceAsync(userId);
        
        if (conversationRef != null)
        {
            // Update cache
            await _cache.SetStringAsync(
                cacheKey,
                JsonConvert.SerializeObject(conversationRef),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _cacheDuration
                });
        }
        
        return conversationRef;
    }
}
```

## Metrics and Monitoring

### 1. Key Performance Indicators

- Message delivery rate
- Delivery latency
- User engagement rate
- Error rates by category
- Channel reliability

### 2. Implementing Telemetry

```csharp
public async Task SendProactiveMessageWithTelemetry(string userId, string message)
{
    var sw = Stopwatch.StartNew();
    bool success = false;
    Exception exception = null;
    
    try
    {
        await SendProactiveMessageAsync(userId, message);
        success = true;
    }
    catch (Exception ex)
    {
        exception = ex;
        throw;
    }
    finally
    {
        sw.Stop();
        
        // Record telemetry
        _telemetryClient.TrackEvent("ProactiveMessageSent", 
            new Dictionary<string, string>
            {
                { "UserId", userId },
                { "MessageType", "Notification" },
                { "Success", success.ToString() },
                { "ErrorType", exception?.GetType().Name },
                { "ErrorMessage", exception?.Message }
            },
            new Dictionary<string, double>
            {
                { "DurationMs", sw.ElapsedMilliseconds }
            });
    }
}
```

### 3. Azure Application Insights Dashboard

Create a dashboard to monitor proactive messaging performance:

```json
{
  "properties": {
    "lenses": {
      "0": {
        "order": 0,
        "parts": {
          "0": {
            "position": {
              "x": 0,
              "y": 0,
              "colSpan": 6,
              "rowSpan": 4
            },
            "metadata": {
              "inputs": [
                {
                  "name": "queryId",
                  "value": "ProactiveMessageDeliveryRate"
                }
              ],
              "type": "Extension/AppInsightsExtension/PartType/AnalyticsPart"
            }
          },
          "1": {
            "position": {
              "x": 6,
              "y": 0,
              "colSpan": 6,
              "rowSpan": 4
            },
            "metadata": {
              "inputs": [
                {
                  "name": "queryId",
                  "value": "ProactiveMessageLatency"
                }
              ],
              "type": "Extension/AppInsightsExtension/PartType/AnalyticsPart"
            }
          }
        }
      }
    }
  }
}
```

## Case Studies and Patterns

### 1. Notification Service Architecture

Implement a centralized notification service:

```csharp
public class NotificationService
{
    private readonly IRepository<User> _userRepository;
    private readonly IRepository<NotificationTemplate> _templateRepository;
    private readonly IBotAdapter _botAdapter;
    private readonly string _botAppId;
    
    public NotificationService(
        IRepository<User> userRepository,
        IRepository<NotificationTemplate> templateRepository,
        IBotAdapter botAdapter,
        IOptions<BotSettings> botSettings)
    {
        _userRepository = userRepository;
        _templateRepository = templateRepository;
        _botAdapter = botAdapter;
        _botAppId = botSettings.Value.MicrosoftAppId;
    }
    
    public async Task SendNotificationAsync(
        string notificationType,
        string userId,
        Dictionary<string, string> templateData)
    {
        // Get the user
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) throw new UserNotFoundException(userId);
        
        // Get notification template
        var template = await _templateRepository.GetByTypeAsync(notificationType);
        if (template == null) throw new TemplateNotFoundException(notificationType);
        
        // Apply template data
        var messageContent = ApplyTemplateData(template.Content, templateData);
        
        // Get conversation reference
        var conversationRef = await GetConversationReferenceAsync(userId);
        
        // Send proactive message
        await _botAdapter.ContinueConversationAsync(
            _botAppId,
            conversationRef,
            async (turnContext, cancellationToken) =>
            {
                await turnContext.SendActivityAsync(messageContent);
            },
            CancellationToken.None);
    }
    
    private string ApplyTemplateData(string template, Dictionary<string, string> data)
    {
        var result = template;
        foreach (var item in data)
        {
            result = result.Replace($"{{{item.Key}}}", item.Value);
        }
        return result;
    }
}
```

### 2. Event-Driven Architecture

Implement an event-driven system for proactive messaging:

```csharp
// Event publisher
public class SystemEventPublisher
{
    private readonly IServiceBusClient _serviceBusClient;
    
    public SystemEventPublisher(IServiceBusClient serviceBusClient)
    {
        _serviceBusClient = serviceBusClient;
    }
    
    public async Task PublishEventAsync(SystemEvent eventData)
    {
        var message = new ServiceBusMessage(JsonConvert.SerializeObject(eventData))
        {
            ContentType = "application/json",
            Subject = eventData.EventType,
            MessageId = Guid.NewGuid().ToString(),
            CorrelationId = eventData.CorrelationId
        };
        
        await _serviceBusClient.SendMessageAsync("system-events", message);
    }
}

// Event consumer
[FunctionName("ProcessSystemEvents")]
public static async Task Run(
    [ServiceBusTrigger("system-events")] string message,
    ILogger log)
{
    var eventData = JsonConvert.DeserializeObject<SystemEvent>(message);
    
    // Process different event types
    switch (eventData.EventType)
    {
        case "OrderCreated":
            await ProcessOrderCreatedEventAsync(eventData);
            break;
        case "PaymentProcessed":
            await ProcessPaymentEventAsync(eventData);
            break;
        case "ShipmentStatusChanged":
            await ProcessShipmentStatusChangeAsync(eventData);
            break;
    }
}

// Send proactive notification based on event
private static async Task ProcessOrderCreatedEventAsync(SystemEvent eventData)
{
    // Get order details
    var orderData = eventData.Data.ToObject<OrderData>();
    
    // Get user ID
    var userId = await GetUserIdFromOrderAsync(orderData.OrderId);
    
    // Send proactive message
    await SendProactiveMessageAsync(
        userId,
        $"Your order #{orderData.OrderNumber} has been created and is being processed.");
}
```

## References and Resources

### Official Documentation

- [Azure Communication Services Documentation](https://docs.microsoft.com/en-us/azure/communication-services/)
- [Bot Framework SDK Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Microsoft Teams Bot Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)

### Sample Projects

- [ACS Proactive Messaging Sample](https://github.com/Azure-Samples/communication-services-dotnet-quickstarts/)
- [Bot Framework Proactive Messaging Sample](https://github.com/microsoft/BotBuilder-Samples/tree/main/samples/csharp_dotnetcore/16.proactive-messages)

### Community Resources

- [Microsoft Q&A for Azure Communication Services](https://docs.microsoft.com/en-us/answers/topics/azure-communication-services.html)
- [Stack Overflow - Azure Communication Services Tag](https://stackoverflow.com/questions/tagged/azure-communication-services)

## Appendix

### Glossary of Terms

| Term | Definition |
|------|------------|
| ACS | Azure Communication Services, a cloud-based communication platform |
| Bot Framework | Microsoft's framework for building conversational AI applications |
| Proactive Messaging | Bot-initiated communication without user prompting |
| Conversation Reference | Object that contains information needed to resume a conversation |
| Adaptive Card | Interactive, customizable card format for rich bot communication |
| Event Grid | Azure service for event routing and delivery |
| Logic App | Azure service for automating workflows and business processes |

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2023-06-15 | Initial document |
| 1.1 | 2023-09-22 | Added multi-channel section |
| 1.2 | 2024-01-10 | Updated code examples for latest SDK |
| 1.3 | 2024-03-05 | Added performance optimization section |
