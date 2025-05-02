# Compliance Training Reminder Bot - Scheduled Proactive Messages

## Overview

The Scheduled Proactive Messages component is a critical feature of the Compliance Training Reminder Bot that enables automated, timely communication with users regarding their compliance training requirements. This document provides comprehensive information about implementing, configuring, and troubleshooting the scheduled proactive messages functionality.

## Table of Contents

- [Introduction](#introduction)
- [Architecture](#architecture)
- [Implementation Guide](#implementation-guide)
- [Configuration Options](#configuration-options)
- [Message Templates](#message-templates)
- [Schedule Management](#schedule-management)
- [User Targeting](#user-targeting)
- [Testing and Validation](#testing-and-validation)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Code Examples](#code-examples)
- [Related Components](#related-components)

## Introduction

Scheduled Proactive Messages are automated communications sent by the Compliance Training Reminder Bot to users without requiring any user initiation. These messages serve several essential purposes:

1. **Initial Notifications**: Inform users when new compliance training is assigned
2. **Reminders**: Periodically remind users of upcoming deadlines
3. **Escalations**: Send increasingly urgent notifications as deadlines approach
4. **Overdue Alerts**: Notify users and optionally their managers when training is overdue
5. **Completion Acknowledgments**: Confirm when a user has successfully completed training

Unlike reactive bot conversations that require user initiation, proactive messages allow the bot to establish contact based on predefined schedules and triggers, ensuring timely compliance with organizational training requirements.

## Architecture

The Scheduled Proactive Messages component consists of several interconnected services:

### Core Components

1. **Message Scheduler Service**: Orchestrates when messages should be sent based on configurable rules
2. **User Data Service**: Maintains information about users, their training assignments, and completion status
3. **Bot Conversation Service**: Manages the creation and delivery of proactive messages
4. **Template Service**: Stores and renders message templates with user-specific data
5. **Azure Timer Functions**: Triggers scheduled processes at configured intervals

### Integration Points

- **Microsoft Teams API**: Creates new conversations with users and sends messages
- **Azure Active Directory**: Retrieves user information
- **Compliance Training System**: Accesses training assignment and completion data
- **Application Insights**: Logs message delivery metrics and errors

### Data Flow

1. The Timer Function triggers at scheduled intervals
2. The Scheduler Service identifies users requiring notifications
3. The Template Service generates personalized message content
4. The Bot Conversation Service establishes or continues conversations with users
5. The Teams API delivers the messages to users
6. Delivery status is logged in Application Insights

## Implementation Guide

### Prerequisites

- Azure subscription with access to create Azure Functions
- Microsoft Teams tenant with administrative access
- Bot Framework registration
- Visual Studio 2019 or later
- .NET Core 3.1 or .NET 5.0+
- Bot Framework SDK v4.14.0 or later

### Setup Process

1. **Register the Bot in Azure Bot Service**

   Register your bot in the Azure portal to receive necessary credentials:

   ```
   az bot create --kind webapp --name "ComplianceTrainingBot" --resource-group "MyResourceGroup" --location "West US"
   ```

2. **Configure Azure Timer Function**

   Create a Timer Function with the appropriate CRON expression for your notification schedule:

   ```csharp
   [FunctionName("ScheduledReminderFunction")]
   public static async Task Run(
       [TimerTrigger("0 0 9 * * *")] TimerInfo myTimer, 
       ILogger log)
   {
       log.LogInformation($"Scheduled reminder function executed at: {DateTime.Now}");
       await SendScheduledReminders();
   }
   ```

3. **Implement Conversation Reference Storage**

   Create a durable storage mechanism for conversation references:

   ```csharp
   public class ConversationReferenceRepository
   {
       private readonly CosmosClient _cosmosClient;
       private readonly Container _container;
       
       public ConversationReferenceRepository(string connectionString, string databaseId, string containerId)
       {
           _cosmosClient = new CosmosClient(connectionString);
           _container = _cosmosClient.GetContainer(databaseId, containerId);
       }
       
       public async Task SaveConversationReferenceAsync(string userId, ConversationReference reference)
       {
           var document = new { id = userId, userId = userId, reference = reference };
           await _container.UpsertItemAsync(document);
       }
       
       public async Task<ConversationReference> GetConversationReferenceAsync(string userId)
       {
           try
           {
               var response = await _container.ReadItemAsync<dynamic>(userId, new PartitionKey(userId));
               return JsonConvert.DeserializeObject<ConversationReference>(response.Resource.reference.ToString());
           }
           catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
           {
               return null;
           }
       }
   }
   ```

4. **Implement Proactive Message Sending Logic**

   Add the core logic to send proactive messages:

   ```csharp
   public class ProactiveMessageService
   {
       private readonly BotAdapter _adapter;
       private readonly ConversationReferenceRepository _repository;
       private readonly ILogger _logger;
       
       public ProactiveMessageService(BotAdapter adapter, ConversationReferenceRepository repository, ILogger logger)
       {
           _adapter = adapter;
           _repository = repository;
           _logger = logger;
       }
       
       public async Task SendMessageAsync(string userId, string message)
       {
           var conversationReference = await _repository.GetConversationReferenceAsync(userId);
           
           if (conversationReference == null)
           {
               _logger.LogWarning($"No conversation reference found for user {userId}");
               return;
           }
           
           await _adapter.ContinueConversationAsync(
               AppCredentials.MicrosoftAppId,
               conversationReference,
               async (turnContext, cancellationToken) =>
               {
                   await turnContext.SendActivityAsync(message, cancellationToken: cancellationToken);
               },
               CancellationToken.None);
       }
   }
   ```

5. **Configure User Targeting Logic**

   Implement logic to determine which users need notifications:

   ```csharp
   public class UserTargetingService
   {
       private readonly ComplianceTrainingRepository _trainingRepository;
       
       public UserTargetingService(ComplianceTrainingRepository trainingRepository)
       {
           _trainingRepository = trainingRepository;
       }
       
       public async Task<IEnumerable<TargetedUser>> GetUsersNeedingRemindersAsync()
       {
           var assignments = await _trainingRepository.GetActiveAssignmentsAsync();
           var targetedUsers = new List<TargetedUser>();
           
           foreach (var assignment in assignments)
           {
               if (!assignment.IsCompleted)
               {
                   var daysUntilDeadline = (assignment.Deadline - DateTime.Now).Days;
                   
                   if (daysUntilDeadline <= 7) // One week reminder
                   {
                       targetedUsers.Add(new TargetedUser
                       {
                           UserId = assignment.UserId,
                           AssignmentId = assignment.Id,
                           ReminderType = daysUntilDeadline <= 1 ? ReminderType.Urgent : ReminderType.Standard,
                           TrainingInfo = assignment
                       });
                   }
               }
           }
           
           return targetedUsers;
       }
   }
   ```

## Configuration Options

The Scheduled Proactive Messages component can be customized through various configuration options:

### Application Settings

| Setting Name | Description | Default Value | Example |
|--------------|-------------|---------------|---------|
| `ReminderSchedules:Initial` | When to send initial notifications | `0 0 9 * * *` | `0 0 9 * * 1-5` (9 AM weekdays) |
| `ReminderSchedules:Standard` | When to send standard reminders | `0 0 9 * * *` | `0 0 9 * * 1,3,5` (Mon, Wed, Fri) |
| `ReminderSchedules:Urgent` | When to send urgent reminders | `0 0 9,14 * * *` | `0 0 9,14 * * 1-5` (9 AM, 2 PM weekdays) |
| `ReminderSchedules:Overdue` | When to send overdue notifications | `0 0 9 * * *` | `0 0 9 * * 1-5` (9 AM weekdays) |
| `ReminderThresholds:Urgent` | Days before deadline for urgent reminders | `3` | `5` |
| `ReminderThresholds:ManagerEscalation` | Days overdue before manager notification | `7` | `5` |
| `ReminderThresholds:MaxReminders` | Maximum reminders per assignment | `5` | `7` |
| `Templates:Initial` | Template for initial notification | See Templates section | - |
| `Templates:Standard` | Template for standard reminders | See Templates section | - |
| `Templates:Urgent` | Template for urgent reminders | See Templates section | - |
| `Templates:Overdue` | Template for overdue notifications | See Templates section | - |
| `Templates:ManagerNotification` | Template for manager notifications | See Templates section | - |
| `Templates:Completion` | Template for completion acknowledgments | See Templates section | - |

### Environment Variables

| Variable Name | Description | Default |
|---------------|-------------|---------|
| `MSTeams:ServiceUrl` | Teams service URL | - |
| `MSTeams:TenantId` | Teams tenant ID | - |
| `Bot:MicrosoftAppId` | Bot Framework app ID | - |
| `Bot:MicrosoftAppPassword` | Bot Framework app password | - |
| `CosmosDB:ConnectionString` | CosmosDB connection string | - |
| `CosmosDB:DatabaseId` | CosmosDB database ID | `ComplianceBot` |
| `CosmosDB:ConversationContainer` | CosmosDB container for conversations | `Conversations` |
| `CosmosDB:UserTrackingContainer` | CosmosDB container for user tracking | `UserTracking` |

## Message Templates

The system uses Adaptive Cards for rich, interactive messages. Templates can be customized in the Azure Portal configuration or in the appsettings.json file:

### Initial Notification Template

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "New Compliance Training Assigned"
    },
    {
      "type": "TextBlock",
      "text": "Hello ${UserName},",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "You have been assigned a new compliance training: ${TrainingName}",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Deadline",
          "value": "${Deadline}"
        },
        {
          "title": "Required By",
          "value": "${RequiredBy}"
        },
        {
          "title": "Estimated Duration",
          "value": "${Duration} minutes"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Start Training",
      "url": "${TrainingUrl}"
    },
    {
      "type": "Action.Submit",
      "title": "Remind Me Later",
      "data": {
        "action": "remind_later",
        "trainingId": "${TrainingId}"
      }
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5"
}
```

### Standard Reminder Template

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Compliance Training Reminder"
    },
    {
      "type": "TextBlock",
      "text": "Hello ${UserName},",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "This is a reminder that you need to complete the following compliance training: ${TrainingName}",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Deadline",
          "value": "${Deadline}"
        },
        {
          "title": "Days Remaining",
          "value": "${DaysRemaining}"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Start Training",
      "url": "${TrainingUrl}"
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5"
}
```

### Urgent Reminder Template

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "⚠️ URGENT: Compliance Training Deadline Approaching",
      "color": "Attention"
    },
    {
      "type": "TextBlock",
      "text": "Hello ${UserName},",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your deadline for completing the required compliance training is approaching rapidly: ${TrainingName}",
      "wrap": true,
      "weight": "Bolder"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Deadline",
          "value": "${Deadline}"
        },
        {
          "title": "Days Remaining",
          "value": "${DaysRemaining}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Please complete this training as soon as possible to maintain compliance.",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Complete Now",
      "url": "${TrainingUrl}"
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5"
}
```

### Template Variables

The following variables can be used in any template:

| Variable | Description | Example |
|----------|-------------|---------|
| `${UserName}` | User's display name | "John Smith" |
| `${TrainingName}` | Name of the training | "Data Privacy 2025" |
| `${TrainingId}` | Unique ID of the training | "TRAIN-2025-DP101" |
| `${TrainingUrl}` | Direct link to start the training | "https://training.example.com/course/123" |
| `${Deadline}` | Formatted deadline date | "May 15, 2025" |
| `${DaysRemaining}` | Days until deadline | "7" |
| `${RequiredBy}` | Department or regulation requiring training | "GDPR Compliance" |
| `${Duration}` | Estimated duration in minutes | "45" |
| `${CompletionDate}` | Date of completion (for acknowledgments) | "April 28, 2025" |

## Schedule Management

The scheduling system uses CRON expressions to determine when messages should be sent. These can be configured in the Azure Portal or in the appsettings.json file.

### Default Schedule

By default, the system follows this schedule:

- **Initial Notifications**: Sent immediately upon assignment
- **Standard Reminders**: Sent at 9:00 AM local time on weekdays, starting 14 days before the deadline
- **Urgent Reminders**: Sent at 9:00 AM and 2:00 PM local time on weekdays, starting 3 days before the deadline
- **Overdue Notifications**: Sent at 9:00 AM local time on weekdays, starting the day after the deadline
- **Manager Escalations**: Sent 7 days after the deadline if training remains incomplete

### Schedule Customization

To modify the schedule, update the CRON expressions in the configuration:

```json
"ReminderSchedules": {
  "Initial": "0 0 9 * * *",
  "Standard": "0 0 9 * * 1-5",
  "Urgent": "0 0 9,14 * * 1-5",
  "Overdue": "0 0 9 * * 1-5"
}
```

### Frequency Control

To prevent message fatigue, the system implements the following controls:

- Maximum of one standard reminder per 72 hours
- Maximum of two urgent reminders per 24 hours
- Maximum total number of reminders configurable via `ReminderThresholds:MaxReminders`

## User Targeting

### Target Criteria

Users are targeted for reminders based on the following criteria:

1. **Assignment Status**: User must have an active, incomplete training assignment
2. **Deadline Proximity**: Time remaining until the deadline determines message urgency
3. **Message History**: Previous messages sent for this assignment are considered
4. **User Preferences**: Respects Do Not Disturb settings and working hours
5. **Organizational Role**: Manager notifications follow separate targeting rules

### Targeting Logic Implementation

```csharp
public async Task<IEnumerable<TargetedUser>> GetTargetedUsersAsync(ReminderType reminderType)
{
    var allUsers = await _trainingRepository.GetUsersWithIncompleteTrainingAsync();
    var targetedUsers = new List<TargetedUser>();
    
    foreach (var user in allUsers)
    {
        var assignments = user.Assignments.Where(a => !a.IsCompleted);
        
        foreach (var assignment in assignments)
        {
            var daysUntilDeadline = (assignment.Deadline - DateTime.Now).Days;
            var reminderHistory = await _reminderRepository.GetReminderHistoryAsync(user.Id, assignment.Id);
            
            if (ShouldSendReminder(reminderType, daysUntilDeadline, reminderHistory))
            {
                targetedUsers.Add(new TargetedUser
                {
                    UserId = user.Id,
                    AssignmentId = assignment.Id,
                    ReminderType = reminderType,
                    TrainingInfo = assignment
                });
            }
        }
    }
    
    return targetedUsers;
}

private bool ShouldSendReminder(ReminderType reminderType, int daysUntilDeadline, IEnumerable<ReminderHistory> history)
{
    // Implementation details for determining if a reminder should be sent
    // based on type, deadline proximity, and previous message history
}
```

## Testing and Validation

### Local Testing

To test the scheduled proactive messages locally:

1. Use the Bot Framework Emulator to simulate Teams messages
2. Create test users with varying training assignments
3. Manually trigger the Timer Function to simulate scheduled execution
4. Verify message content and delivery in the emulator

### Debug Mode

Enable debug mode in the configuration to output detailed logs and simulate immediate delivery:

```json
"Debug": {
  "EnableDetailedLogs": true,
  "BypassSchedule": true,
  "SimulateDelivery": true,
  "TestUsers": ["user1@example.com", "user2@example.com"]
}
```

### Validation Tests

Before deployment, validate the following:

1. **Message Delivery**: Ensure messages are delivered on schedule
2. **Template Rendering**: Verify variables are correctly substituted
3. **User Targeting**: Confirm the right users receive the right messages
4. **Action Handling**: Test interactive message actions
5. **Error Handling**: Verify graceful handling of delivery failures

## Monitoring and Logging

### Key Metrics

The system logs the following metrics to Application Insights:

- **Message Attempts**: Total number of attempted message deliveries
- **Successful Deliveries**: Number of successfully delivered messages
- **Delivery Failures**: Number of failed deliveries, with error details
- **User Response Rate**: Percentage of messages that received user interaction
- **Completion Rate**: Percentage of assignments completed after notifications

### Log Categories

Logs are categorized as follows:

- `ComplianceBot.Scheduler`: Scheduler execution events
- `ComplianceBot.Targeting`: User targeting logic events
- `ComplianceBot.Templates`: Template rendering events
- `ComplianceBot.Delivery`: Message delivery events
- `ComplianceBot.Interactions`: User interaction events

### Sample Log Queries

Monitor system performance with these Application Insights queries:

```kusto
// Success rate of message delivery
traces
| where timestamp > ago(24h)
| where customDimensions.Category == "ComplianceBot.Delivery"
| summarize SuccessCount = countif(severityLevel < 2), FailureCount = countif(severityLevel >= 2) by bin(timestamp, 1h)
| extend SuccessRate = SuccessCount * 100.0 / (SuccessCount + FailureCount)
| render timechart

// Most common delivery failures
exceptions
| where timestamp > ago(7d)
| where customDimensions.Category == "ComplianceBot.Delivery"
| summarize Count = count() by Type, outerMessage
| order by Count desc
| take 10

// Training completion rates after notification
traces
| where timestamp > ago(30d)
| where customDimensions.Category == "ComplianceBot.Interactions"
| where message contains "Training completed"
| summarize CompletionsWithin24h = countif(customDimensions.CompletionTimeFromLastReminder < 24),
          CompletionsWithin48h = countif(customDimensions.CompletionTimeFromLastReminder < 48),
          CompletionsWithin72h = countif(customDimensions.CompletionTimeFromLastReminder < 72)
| extend Total = CompletionsWithin24h + CompletionsWithin48h + CompletionsWithin72h
| extend Within24hPercent = CompletionsWithin24h * 100.0 / Total
```

## Troubleshooting

### Common Issues

#### Message Delivery Failures

**Symptom**: Messages not being delivered to users

**Possible Causes**:
- Bot not installed for the user
- Invalid conversation reference
- Teams service URL has changed
- Bot authentication failure

**Resolution**:
1. Verify the bot is installed for the user
2. Check if conversation references are current
3. Update the Teams service URL if necessary
4. Validate bot credentials and permissions

#### Schedule Execution Issues

**Symptom**: Scheduled messages not triggering

**Possible Causes**:
- Timer Function not running
- Invalid CRON expression
- Scheduler service errors

**Resolution**:
1. Check Azure Function execution logs
2. Validate CRON expressions
3. Verify scheduler service configuration

#### Template Rendering Issues

**Symptom**: Messages appear with unresolved variables or formatting errors

**Possible Causes**:
- Missing template variables
- Invalid template syntax
- Incorrect user or training data

**Resolution**:
1. Verify all required variables are available
2. Check template syntax using the Adaptive Card Designer
3. Validate user and training data integrity

### Support Diagnostics

For advanced troubleshooting, enable diagnostic mode:

```csharp
// In Startup.cs
services.AddComplianceBotDiagnostics(options =>
{
    options.EnableDetailedLogging = true;
    options.EnableEntityTracing = true;
    options.EnableConversationDumps = true;
    options.DiagnosticStoragePath = "compliance-bot-diagnostics";
});
```

## Best Practices

### Message Design

1. **Clear Purpose**: Each message should have a single, clear objective
2. **Actionable Content**: Include direct action buttons for immediate response
3. **Personalization**: Use the user's name and specific training details
4. **Urgency Signaling**: Use visual cues to indicate urgency level
5. **Concise Text**: Keep messages brief and focused

### Scheduling

1. **Respect Working Hours**: Schedule messages during business hours only
2. **Progressive Frequency**: Increase frequency as deadlines approach
3. **Avoid Weekends**: Unless urgent, avoid scheduling on weekends
4. **Time Zone Awareness**: Adjust delivery times based on user time zones
5. **Batching**: Group messages to avoid multiple interruptions

### User Experience

1. **Easy Opt-Out**: Provide clear options to snooze or reduce frequency
2. **Completion Recognition**: Acknowledge when users complete training
3. **Context Retention**: Maintain conversation context between messages
4. **Consistent Branding**: Use consistent visual identity in all messages
5. **Help Access**: Offer easy access to help resources

## Code Examples

### Scheduled Function Implementation

```csharp
[FunctionName("ScheduledComplianceReminders")]
public static async Task RunAsync(
    [TimerTrigger("0 0 9 * * *")] TimerInfo myTimer,
    [CosmosDB("ComplianceBot", "Configuration", Connection = "CosmosDbConnection")] DocumentClient configClient,
    [CosmosDB("ComplianceBot", "UserTracking", Connection = "CosmosDbConnection")] DocumentClient userClient,
    ILogger log)
{
    log.LogInformation($"Compliance reminder function executed at: {DateTime.Now}");
    
    // Initialize services
    var configRepository = new ConfigurationRepository(configClient);
    var userRepository = new UserTrackingRepository(userClient);
    var botService = new BotService(configRepository);
    
    // Get configuration
    var config = await configRepository.GetConfigurationAsync();
    
    // Determine reminder type based on time of day
    var reminderType = DateTime.Now.Hour >= 14 ? ReminderType.Urgent : ReminderType.Standard;
    
    // Get users needing reminders
    var targetingService = new UserTargetingService(userRepository, config);
    var targetedUsers = await targetingService.GetTargetedUsersAsync(reminderType);
    
    log.LogInformation($"Found {targetedUsers.Count()} users requiring {reminderType} reminders");
    
    // Send reminders
    foreach (var user in targetedUsers)
    {
        try
        {
            await botService.SendReminderAsync(user.UserId, user.AssignmentId, reminderType);
            await userRepository.LogReminderSentAsync(user.UserId, user.AssignmentId, reminderType);
            log.LogInformation($"Sent {reminderType} reminder to user {user.UserId} for assignment {user.AssignmentId}");
        }
        catch (Exception ex)
        {
            log.LogError(ex, $"Failed to send reminder to user {user.UserId}: {ex.Message}");
        }
    }
}
```

### Proactive Message Delivery

```csharp
public class BotService
{
    private readonly BotFrameworkAdapter _adapter;
    private readonly ConversationReferenceRepository _conversationRepository;
    private readonly TemplateService _templateService;
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;
    
    public BotService(
        BotFrameworkAdapter adapter,
        ConversationReferenceRepository conversationRepository,
        TemplateService templateService,
        IConfiguration configuration,
        ILogger logger)
    {
        _adapter = adapter;
        _conversationRepository = conversationRepository;
        _templateService = templateService;
        _configuration = configuration;
        _logger = logger;
    }
    
    public async Task SendReminderAsync(string userId, string assignmentId, ReminderType reminderType)
    {
        // Get conversation reference
        var conversationReference = await _conversationRepository.GetConversationReferenceAsync(userId);
        
        if (conversationReference == null)
        {
            _logger.LogWarning($"No conversation reference found for user {userId}");
            await EnsureConversationReferenceAsync(userId);
            conversationReference = await _conversationRepository.GetConversationReferenceAsync(userId);
            
            if (conversationReference == null)
            {
                throw new Exception($"Could not establish conversation with user {userId}");
            }
        }
        
        // Get assignment details
        var assignment = await _trainingRepository.GetAssignmentAsync(assignmentId);
        
        if (assignment == null)
        {
            throw new Exception($"Assignment {assignmentId} not found");
        }
        
        // Get user details
        var user = await _userRepository.GetUserAsync(userId);
        
        // Prepare template data
        var templateData = new Dictionary<string, string>
        {
            ["UserName"] = user.DisplayName,
            ["TrainingName"] = assignment.TrainingName,
            ["TrainingId"] = assignment.Id,
            ["TrainingUrl"] = assignment.TrainingUrl,
            ["Deadline"] = assignment.Deadline.ToString("MMMM d, yyyy"),
            ["DaysRemaining"] = Math.Max(0, (assignment.Deadline - DateTime.Now).Days).ToString(),
            ["RequiredBy"] = assignment.RequiredBy,
            ["Duration"] = assignment.EstimatedDurationMinutes.ToString()
        };
        
        // Get template based on reminder type
        string templateName;
        switch (reminderType)
        {
            case ReminderType.Initial:
                templateName = "Templates:Initial";
                break;
            case ReminderType.Standard:
                templateName = "Templates:Standard";
                break;
            case ReminderType.Urgent:
                templateName = "Templates:Urgent";
                break;
            case ReminderType.Overdue:
                templateName = "Templates:Overdue";
                break;
            default:
                templateName = "Templates:Standard";
                break;
        }
        
        // Render template
        var messageContent = await _templateService.RenderTemplateAsync(templateName, templateData);
        
        // Send message
        await _adapter.ContinueConversationAsync(
            _configuration["Bot:MicrosoftAppId"],
            conversationReference,
            async (turnContext, cancellationToken) =>
            {
                var activity = MessageFactory.Attachment(new Attachment
                {
                    ContentType = "application/vnd.microsoft.card.adaptive",
                    Content = JsonConvert.DeserializeObject(messageContent)
                });
                
                await turnContext.SendActivityAsync(activity, cancellationToken);
            },
            CancellationToken.None);
    }
    
    private async Task EnsureConversationReferenceAsync(string userId)
    {
        // Implementation to establish a new conversation with the user
        // using Microsoft Graph API to get user details and Teams API to create conversation
    }
}
```

## Related Components

The Scheduled Proactive Messages component interacts with other parts of the Compliance Training Reminder Bot:

- [Compliance Training Reminder Bot - Overview](ComplianceTrainingReminderBot-Overview.md): System architecture and component relationships
- [Compliance Training Reminder Bot - Adaptive Card Acknowledgement](ComplianceTrainingReminderBot-Adaptive-Card-Acknowledgement.md): User interaction with message cards
- [Compliance Training Reminder Bot - User Completion Tracking](ComplianceTrainingReminderBot-User-Completion-Tracking.md): Monitoring training progress
- [Compliance Training Reminder Bot - Deployment Guide](ComplianceTrainingReminderBot-Deployment-Guide.md): Deployment and configuration instructions
- [Compliance Training Reminder Bot - Security And Audit](ComplianceTrainingReminderBot-Security-And-Audit.md): Security considerations
- [Compliance Training Reminder Bot - Troubleshooting](ComplianceTrainingReminderBot-Troubleshooting.md): Additional troubleshooting guidance
