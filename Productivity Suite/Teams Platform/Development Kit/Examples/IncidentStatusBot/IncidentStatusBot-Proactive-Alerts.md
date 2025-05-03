# Incident Status Bot: Proactive Alerts

## Overview

The Incident Status Bot is a Microsoft Teams application designed to send proactive notifications and status updates about ongoing incidents to Teams channels, group chats, or individual users. This bot enables IT support teams, operations staff, and stakeholders to stay informed about critical incidents in real-time without having to constantly check monitoring dashboards or request status updates.

## Key Features

- **Proactive Incident Notifications**: Automatically sends alerts when new incidents are detected or created
- **Status Updates**: Provides real-time updates as incident status changes (investigating, mitigating, resolved, etc.)
- **Adaptive Card Interface**: Rich, interactive cards with visual status indicators and action buttons
- **User-Specific Views**: Displays different information based on user roles and permissions
- **Targeted Communication**: Sends alerts to relevant stakeholders based on incident severity and impact
- **Bi-directional Communication**: Allows users to acknowledge, update, or take action on incidents directly from the notification
- **Sequential Workflow Support**: Enables structured incident response processes with guided steps
- **Automatic Refresh**: Cards automatically update to reflect the latest incident status

## Architecture

The Incident Status Bot architecture consists of the following components:

1. **Teams Bot Application**: A Microsoft Bot Framework v4 bot that integrates with Microsoft Teams
2. **Azure Functions**: Backend processing for handling notifications and incident updates
3. **Storage Service**: Stores incident data, conversation references, and notification history
4. **Adaptive Cards**: Rich, interactive UI components for displaying incident information
5. **Notification Service**: Manages the delivery of proactive messages to appropriate channels/users

### Communication Flow

```
[Incident Source] → [Azure Functions] → [Bot Framework] → [Teams Client] → [End User]
```

1. An incident is detected or created in the source system
2. Azure Functions processes the incident data
3. The bot framework sends proactive messages to Teams
4. Teams clients display notifications to relevant users
5. Users can interact with the notification to take action

## Implementation Requirements

### Prerequisites

- **Microsoft 365 Developer Account**: For testing and deployment
- **Azure Subscription**: For hosting bot services and resources
- **Teams Developer Portal Access**: For app registration and configuration
- **Bot Framework SDK**: Version 4.6 or later
- **Azure Functions**: To handle incident data and trigger notifications
- **Storage Account**: For storing conversation references and incident state

### Development Environment Setup

1. Install Visual Studio or Visual Studio Code
2. Install the Teams Toolkit extension
3. Configure Bot Framework tools
4. Set up Azure Functions development environment
5. Install appropriate NuGet packages for bot development

## Core Components

### 1. Proactive Messaging

The bot uses proactive messaging capabilities to initiate conversations without user prompting. This is essential for alerting users about new incidents or status changes.

Key considerations for proactive messaging:

- Messages must provide clear context about why they're being sent
- Include appropriate severity indicators and timestamps
- Store conversation references to enable future proactive messages
- Handle error cases when messages can't be delivered

### 2. Adaptive Cards

Adaptive Cards provide rich, interactive interfaces for incident information. The bot uses several card types:

- **Incident Alert Card**: Initial notification with basic incident details
- **Incident Status Card**: Detailed view with current status and metrics
- **Action Required Card**: Prompts users to take specific actions
- **Resolution Card**: Confirmation of incident closure with summary information

Card design best practices:

- Use consistent color coding for severity levels
- Include clear headings and concise descriptions
- Provide action buttons for common responses
- Support automatic refresh for status updates
- Display user-specific views based on roles

### 3. Notification Storage

To maintain state and enable proactive messaging, the bot stores:

- Conversation references for each channel/user
- Incident status history
- Message delivery status for tracking
- User acknowledgment data

Storage options include:

- Azure Table Storage for structured incident data
- Azure Blob Storage for conversation references
- Azure Cosmos DB for more complex scenarios

## Implementation Examples

### Sending a Proactive Incident Alert

The bot uses the Bot Framework's `ContinueConversationAsync` method to send proactive messages to Teams:

```csharp
// Example implementation pattern for sending proactive messages
public async Task SendIncidentAlertAsync(IncidentData incident, CancellationToken cancellationToken)
{
    // Retrieve stored conversation references
    foreach (var conversationReference in _conversationReferences.Values)
    {
        // Continue the conversation with stored reference
        await _adapter.ContinueConversationAsync(
            _botId,
            conversationReference,
            async (turnContext, ct) =>
            {
                // Create and send incident alert card
                var card = CreateIncidentAlertCard(incident);
                var response = MessageFactory.Attachment(card);
                
                // Add notification text that appears in the Teams activity feed
                response.Summary = $"New Incident Alert: {incident.Title}";
                
                await turnContext.SendActivityAsync(response, ct);
            },
            cancellationToken);
    }
}
```

### Updating Incident Status Cards

The bot can update previously sent cards when incident status changes:

```csharp
// Example implementation pattern for updating existing cards
public async Task UpdateIncidentStatusAsync(IncidentData updatedIncident, CancellationToken cancellationToken)
{
    // Retrieve message mapping (incident ID to message ID)
    if (_messageMapping.TryGetValue(updatedIncident.Id, out var messageInfo))
    {
        await _adapter.ContinueConversationAsync(
            _botId,
            messageInfo.ConversationReference,
            async (turnContext, ct) =>
            {
                // Create updated card
                var updatedCard = CreateIncidentStatusCard(updatedIncident);
                
                // Create update activity
                var updateActivity = new Activity(ActivityTypes.Message)
                {
                    Id = messageInfo.ActivityId,
                    Conversation = turnContext.Activity.Conversation,
                    Attachments = new List<Attachment> { updatedCard }
                };
                
                // Update the existing message
                await turnContext.UpdateActivityAsync(updateActivity, ct);
            },
            cancellationToken);
    }
}
```

### Creating Auto-Refreshing Incident Cards

For cards that need to refresh automatically as incident status changes:

```csharp
// Example implementation pattern for auto-refreshing cards
public Attachment CreateRefreshableIncidentCard(IncidentData incident, string userId)
{
    // Create card with refresh property
    var card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 5))
    {
        Body = new List<AdaptiveElement>
        {
            // Card content elements
        },
        Actions = new List<AdaptiveAction>
        {
            // Card actions
        },
        // Auto-refresh configuration
        Refresh = new AdaptiveRefresh
        {
            Action = new AdaptiveExecuteAction
            {
                Verb = "refreshCard",
                Data = new Dictionary<string, object> { { "incidentId", incident.Id } }
            },
            UserIds = new List<string> { userId }
        }
    };
    
    return new Attachment
    {
        ContentType = AdaptiveCard.ContentType,
        Content = card
    };
}
```

## Best Practices

### Notification Design

1. **Clear Context**: Always explain why the notification is being sent
2. **Concise Information**: Present the most important information first
3. **Action Orientation**: Make it clear what actions users can take
4. **Visual Hierarchy**: Use consistent formatting for different severity levels
5. **Avoid Notification Fatigue**: Combine related updates when possible

### Proactive Messaging

1. **Store Conversation References**: Cache references when users interact with the bot
2. **Error Handling**: Implement retry logic for failed message delivery
3. **Service URL Trust**: Use `MicrosoftAppCredentials.TrustServiceUrl()` to prevent 401 errors
4. **Rate Limiting**: Respect Teams API limits (maximum 50 RPS per app per tenant)
5. **Targeted Distribution**: Send messages only to relevant stakeholders

### User Experience

1. **Acknowledge Receipt**: Confirm when users interact with notifications
2. **Status Visibility**: Make current status clear at a glance
3. **Consistent Updates**: Use the same format for all related notifications
4. **User Control**: Allow users to customize notification preferences
5. **Seamless Transitions**: Provide links to related systems or resources

## Integration Points

The Incident Status Bot can integrate with various systems:

1. **Monitoring Tools**: Azure Monitor, Datadog, Prometheus, etc.
2. **ITSM Systems**: ServiceNow, Jira, Azure DevOps
3. **Alerting Platforms**: PagerDuty, OpsGenie, xMatters
4. **Custom Applications**: Via webhook endpoints

## Deployment

### Azure Resource Requirements

- Azure Bot Service
- Azure Functions
- Azure Storage Account
- Azure Application Insights (for monitoring)

### Teams App Manifest

The Teams app manifest should include:

- Bot configuration with appropriate scopes (personal, team, groupChat)
- Required permissions for sending proactive messages
- App icons and branding
- Proper description of bot capabilities

### Installation Process

1. Register the bot in Azure Bot Service
2. Deploy Azure Functions
3. Configure storage services
4. Package and deploy the Teams application
5. Install the app in target Teams environments

## Security and Compliance

1. **Authentication**: Use secure Bot Framework authentication
2. **Authorization**: Implement role-based access for different incident actions
3. **Data Protection**: Encrypt sensitive incident data
4. **Audit Logging**: Track all notification events and user interactions
5. **Information Classification**: Follow organizational guidelines for incident data

## Troubleshooting

### Common Issues

1. **401 Unauthorized Errors**: Ensure proper service URL trust configuration
2. **Message Delivery Failures**: Check bot registration and endpoint availability
3. **Card Rendering Issues**: Verify Adaptive Card schema compatibility
4. **Notification Storage Errors**: Confirm storage account connectivity
5. **Rate Limiting**: Implement backoff strategy for high-volume notifications

### Logging and Monitoring

1. Configure Application Insights for bot telemetry
2. Log key events in notification lifecycle
3. Set up alerts for delivery failures
4. Monitor storage service performance
5. Track user engagement with notifications

## Extending the Bot

### Additional Capabilities

1. **Scheduled Reports**: Regular status summaries on active incidents
2. **Analytics Dashboard**: Incident response metrics and trends
3. **Multi-channel Delivery**: Extend to other channels beyond Teams
4. **Custom Triggers**: Allow users to subscribe to specific incident types
5. **Resolution Workflows**: Guide users through incident resolution steps

### Integration Development

1. Create webhook endpoints for external systems
2. Implement adapters for different incident sources
3. Develop custom card templates for specific incident types
4. Build conversation extensions for complex interactions
5. Add AI capabilities for incident classification and routing

## References

- [Microsoft Bot Framework Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Teams Bot Development Guide](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Adaptive Cards Schema](https://adaptivecards.io/explorer/)
- [Proactive Messaging in Teams](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [Bot Framework SDK for .NET](https://docs.microsoft.com/en-us/dotnet/api/microsoft.bot.builder)
