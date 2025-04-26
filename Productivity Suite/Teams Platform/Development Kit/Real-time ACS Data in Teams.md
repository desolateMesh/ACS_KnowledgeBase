# Overview

This document provides a comprehensive guide for integrating real-time Azure Communication Services (ACS) data within Microsoft Teams applications. By leveraging ACS real-time capabilities, developers can create dynamic, interactive, and data-rich experiences that enhance collaboration and communication within Microsoft Teams.

Azure Communication Services offers a robust platform for real-time communication that can be seamlessly integrated with Microsoft Teams. This integration enables applications to display, update, and interact with data in real-time, providing users with immediate access to critical information without leaving their Teams environment.

## Key Concepts

### Real-time Data in Communication Contexts

Real-time data refers to information that is delivered immediately after collection, with minimal delay between data generation and visualization. In the context of Azure Communication Services and Microsoft Teams, real-time data capabilities enable:

- Live updates of communication metrics and status
- Immediate reflection of user actions and system events
- Continuous data streams for monitoring and analysis
- Instantaneous notification of important events or changes

### Synchronous vs. Asynchronous Communication Patterns

| Synchronous Communication | Asynchronous Communication |
|---------------------------|----------------------------|
| Immediate response required | Deferred response acceptable |
| All participants engaged simultaneously | Participants engage at different times |
| Examples: video calls, live chat | Examples: email, voicemail |

ACS supports both patterns and can be integrated into Teams applications that leverage either approach.

## Integration Architecture

### High-Level Architecture

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│               │      │               │      │               │
│  Teams Client │◄────►│  Teams App    │◄────►│  Azure        │
│               │      │  (Tab/Bot)    │      │  Communication │
│               │      │               │      │  Services      │
└───────────────┘      └───────┬───────┘      └───────┬───────┘
                              │                      │
                              │                      │
                       ┌──────▼──────────────────────▼──────┐
                       │                                    │
                       │  Azure Services (Event Hub,        │
                       │  SignalR, Event Grid, etc.)        │
                       │                                    │
                       └────────────────────────────────────┘
```

### Components and Responsibilities

1. **Teams Client**: User interface where real-time data is displayed and interacted with
2. **Teams App**: Custom app that hosts the integration (Tabs, Bots, or Message Extensions)
3. **Azure Communication Services**: Provides communication capabilities and data
4. **Supporting Azure Services**: Enable real-time data flow (Event Hub, SignalR, Event Grid)
5. **Backend Services**: Process and transform data before delivery to the client

## Implementation Approaches

### 1. SignalR Service Integration

Azure SignalR Service provides an easy way to add real-time web functionality to applications. It can be used to push content updates from ACS to clients in real-time.

#### Implementation Steps:

1. **Set up Azure SignalR Service**:

```csharp
// Create a SignalR Service client
var serviceClient = new ServiceClient(connectionString);

// Create a hub context for your Teams application
var hubContext = serviceClient.CreateHubContext(\"teamsHub\");
```

2. **Connect to SignalR from Teams Tab**:

```javascript
// Initialize SignalR connection in Teams tab
const connection = new signalR.HubConnectionBuilder()
    .withUrl(\"/teamsHub\", {
        accessTokenFactory: () => getTokenAsync()
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

// Start the connection
connection.start().catch(err => console.error(err));

// Handle incoming messages
connection.on(\"updateCallStats\", (callData) => {
    // Update UI with real-time call statistics
    updateCallStatisticsUI(callData);
});
```

3. **Send ACS Events to SignalR**:

```csharp
// Process ACS event and broadcast to all connected clients
public async Task ProcessAcsEventAsync(AcsEvent acsEvent)
{
    await _hubContext.Clients.All.SendAsync(\"updateCallStats\", new {
        CallId = acsEvent.CallId,
        Duration = acsEvent.Duration,
        Quality = acsEvent.Quality,
        Participants = acsEvent.Participants,
        Timestamp = DateTime.UtcNow
    });
}
```

### 2. Event Grid Integration

Azure Event Grid enables reactive programming and near-real-time event delivery at scale.

#### Event Grid Setup:

```csharp
// Create a custom Event Grid topic
var eventGridClient = new EventGridClient(credentials);

// Define ACS event
var eventGridEvent = new EventGridEvent
{
    Id = Guid.NewGuid().ToString(),
    EventType = \"ACS.CallStarted\",
    Data = JsonConvert.SerializeObject(callData),
    EventTime = DateTime.UtcNow,
    Subject = $\"calls/{callData.CallId}\",
    DataVersion = \"1.0\"
};

// Publish event to custom topic
await eventGridClient.PublishEventsAsync(
    topicHostname,
    new List<EventGridEvent> { eventGridEvent }
);
```

#### Teams App Subscription:

```csharp
// Azure Function to receive Event Grid events
[FunctionName(\"ProcessAcsEvents\")]
public static async Task Run(
    [EventGridTrigger] EventGridEvent eventGridEvent,
    [SignalR(HubName = \"teamsHub\")] IAsyncCollector<SignalRMessage> signalRMessages,
    ILogger log)
{
    // Process event and send to SignalR
    await signalRMessages.AddAsync(
        new SignalRMessage
        {
            Target = \"updateCallStats\",
            Arguments = new[] { eventGridEvent.Data }
        });
}
```

### 3. Direct API Integration

For simpler scenarios, direct API calls can be used to fetch real-time data.

#### Polling Implementation:

```javascript
// Client-side polling for ACS data in Teams tab
function startPolling(interval = 5000) {
    setInterval(async () => {
        try {
            const response = await fetch('/api/acsStats', {
                headers: {
                    'Authorization': `Bearer ${await getAccessToken()}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateDashboard(data);
            }
        } catch (error) {
            console.error('Error fetching ACS data:', error);
        }
    }, interval);
}
```

#### Server-side API Endpoint:

```csharp
[HttpGet(\"api/acsStats\")]
[Authorize]
public async Task<IActionResult> GetAcsStats()
{
    // Get user identity from token
    var userId = User.FindFirst(\"http://schemas.microsoft.com/identity/claims/objectidentifier\")?.Value;
    
    // Retrieve real-time ACS data for the user
    var acsData = await _acsService.GetUserStatsAsync(userId);
    
    return Ok(acsData);
}
```

## Real-time Data Types and Use Cases

### 1. Call and Meeting Statistics

Real-time metrics related to voice and video calls:

```javascript
// Example structure of call statistics data
const callStats = {
    callId: \"call-123456\",
    startTime: \"2023-04-26T14:30:00Z\",
    duration: 1250, // seconds
    participants: [
        {
            id: \"user1\",
            name: \"Alice Smith\",
            audioQuality: 85, // percentage
            videoQuality: 90, // percentage
            network: {
                jitter: 15, // ms
                packetLoss: 0.2, // percentage
                roundTripTime: 120 // ms
            },
            speaking: true,
            muted: false,
            camera: \"on\"
        },
        // Additional participants...
    ],
    overallQuality: \"excellent\" // excellent, good, fair, poor
};

// Update UI with call statistics
function updateCallQualityIndicators(stats) {
    document.getElementById('call-quality').innerText = stats.overallQuality;
    document.getElementById('call-duration').innerText = formatDuration(stats.duration);
    
    // Update participant list with quality indicators
    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = '';
    
    stats.participants.forEach(participant => {
        const participantElement = document.createElement('div');
        participantElement.className = 'participant';
        
        // Create quality indicator elements
        const audioIndicator = document.createElement('div');
        audioIndicator.className = `audio-quality quality-${getQualityLevel(participant.audioQuality)}`;
        
        const videoIndicator = document.createElement('div');
        videoIndicator.className = `video-quality quality-${getQualityLevel(participant.videoQuality)}`;
        
        // Add participant name and indicators to element
        participantElement.innerHTML = `
            <span class=\"name\">${participant.name}</span>
            <span class=\"status\">${participant.speaking ? 'Speaking' : ''}</span>
        `;
        participantElement.appendChild(audioIndicator);
        participantElement.appendChild(videoIndicator);
        
        participantsList.appendChild(participantElement);
    });
}
```

### 2. Chat and Message Status

Real-time updates about chat messages, including delivery and read status:

```javascript
// Listen for message status updates
connection.on(\"messageStatusChanged\", (messageData) => {
    // Update message status in UI
    updateMessageStatus(messageData.messageId, messageData.status);
});

// Update message status indicators
function updateMessageStatus(messageId, status) {
    const messageElement = document.querySelector(`[data-message-id=\"${messageId}\"]`);
    if (!messageElement) return;
    
    const statusElement = messageElement.querySelector('.message-status');
    
    // Update status icon and text
    switch (status) {
        case 'sent':
            statusElement.innerHTML = '<i class=\"icon-sent\"></i> Sent';
            break;
        case 'delivered':
            statusElement.innerHTML = '<i class=\"icon-delivered\"></i> Delivered';
            break;
        case 'read':
            statusElement.innerHTML = '<i class=\"icon-read\"></i> Read';
            break;
        case 'failed':
            statusElement.innerHTML = '<i class=\"icon-failed\"></i> Failed to send';
            break;
    }
}
```

### 3. Presence Information

Real-time user presence status:

```javascript
// Listen for presence updates
connection.on(\"presenceChanged\", (presenceData) => {
    // Update presence indicator in UI
    updatePresenceIndicator(presenceData.userId, presenceData.status);
});

// Update presence indicators
function updatePresenceIndicator(userId, status) {
    const userElements = document.querySelectorAll(`[data-user-id=\"${userId}\"]`);
    
    userElements.forEach(element => {
        // Remove existing status classes
        element.classList.remove('status-available', 'status-away', 'status-busy', 'status-offline');
        
        // Add new status class
        element.classList.add(`status-${status.toLowerCase()}`);
        
        // Update tooltip
        const tooltip = element.querySelector('.status-tooltip');
        if (tooltip) {
            tooltip.innerText = status.charAt(0).toUpperCase() + status.slice(1);
        }
    });
}
```

### 4. Collaborative Document Editing

Real-time updates for collaborative document editing in Teams:

```javascript
// Initialize collaborative document
const documentEditor = {
    content: '',
    version: 0,
    users: new Map()
};

// Handle user cursor position updates
connection.on(\"cursorMoved\", (data) => {
    documentEditor.users.set(data.userId, {
        name: data.userName,
        position: data.position,
        lastActive: new Date()
    });
    
    updateUserCursors();
});

// Handle document content updates
connection.on(\"contentChanged\", (data) => {
    // Only apply updates if they're newer than our current version
    if (data.version > documentEditor.version) {
        documentEditor.content = data.content;
        documentEditor.version = data.version;
        
        // Update editor content without moving cursor
        updateEditorContent(documentEditor.content);
    }
});

// Send cursor position updates
function sendCursorPosition(position) {
    connection.invoke(\"UpdateCursor\", {
        documentId: currentDocumentId,
        position: position
    });
}

// Send content changes
function sendContentChange(content) {
    connection.invoke(\"UpdateContent\", {
        documentId: currentDocumentId,
        content: content,
        version: documentEditor.version + 1
    });
}
```

## Performance Considerations

### 1. Connection Management

Efficient management of real-time connections is crucial for performance:

```javascript
// Connection management with reconnection logic
function setupRobustConnection() {
    let reconnectDelay = 1000; // Start with 1 second delay
    const maxReconnectDelay = 30000; // Maximum 30 second delay
    
    connection.onclose(async (error) => {
        console.log(`Connection closed due to error: ${error}`);
        
        // Implement exponential backoff for reconnection
        await new Promise(resolve => setTimeout(resolve, reconnectDelay));
        reconnectDelay = Math.min(reconnectDelay * 1.5, maxReconnectDelay);
        
        try {
            await connection.start();
            console.log(\"Reconnected successfully\");
            reconnectDelay = 1000; // Reset delay after successful connection
        } catch (err) {
            console.error(`Failed to reconnect: ${err}`);
            // Try again with exponential backoff
            setupRobustConnection();
        }
    });
}
```

### 2. Data Optimization

Minimize data transfer for better performance:

```javascript
// Send only changes instead of full data
function sendDelta(changes) {
    connection.invoke(\"UpdatePartial\", {
        documentId: currentDocumentId,
        changes: changes,
        baseVersion: documentEditor.version
    });
}

// Handle partial updates
connection.on(\"partialUpdate\", (data) => {
    if (data.baseVersion === documentEditor.version) {
        // Apply changes to current content
        documentEditor.content = applyChanges(documentEditor.content, data.changes);
        documentEditor.version++;
        
        // Update UI
        updateEditorContent(documentEditor.content);
    } else {
        // Request full content if versions are out of sync
        connection.invoke(\"RequestFullContent\", {
            documentId: currentDocumentId
        });
    }
});
```

### 3. Throttling and Rate Limiting

Implement throttling to prevent overwhelming servers or clients:

```javascript
// Client-side throttling for rapid updates
function createThrottledSender(interval) {
    let pendingUpdates = [];
    let sendTimeout = null;
    
    return function(update) {
        pendingUpdates.push(update);
        
        if (!sendTimeout) {
            sendTimeout = setTimeout(() => {
                // Batch and send updates
                const batchedUpdate = {
                    type: \"batchUpdate\",
                    updates: [...pendingUpdates]
                };
                
                connection.invoke(\"ProcessBatchUpdate\", batchedUpdate);
                
                // Reset for next batch
                pendingUpdates = [];
                sendTimeout = null;
            }, interval);
        }
    };
}

// Create throttled senders for different types of updates
const sendThrottledCursorUpdate = createThrottledSender(100); // 10 updates per second max
const sendThrottledContentUpdate = createThrottledSender(300); // ~3 updates per second max
```

## Security and Compliance

### 1. Authentication and Authorization

Secure real-time connections with proper authentication:

```javascript
// Get Azure AD token for SignalR connection
async function getSignalRToken() {
    // Get access token from Teams context
    const token = await getTeamsTokenAsync();
    
    // Exchange Teams token for SignalR token
    const response = await fetch('/api/signalr/negotiate', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to get SignalR token');
    }
    
    return await response.json();
}

// Set up authenticated connection
const connection = new signalR.HubConnectionBuilder()
    .withUrl(\"/teamsHub\", {
        accessTokenFactory: getSignalRToken
    })
    .build();
```

### 2. Data Privacy

Ensure sensitive data is handled appropriately:

```csharp
// Server-side filtering of sensitive data
public class AcsDataFilter
{
    public AcsCallData FilterSensitiveData(AcsCallData callData, ClaimsPrincipal user)
    {
        // Check user permissions
        bool isAdmin = user.IsInRole(\"Admin\");
        bool isCallParticipant = callData.Participants.Any(p => p.UserId == user.FindFirstValue(\"sub\"));
        
        if (!isAdmin && !isCallParticipant) {
            // Return minimal data for non-participants
            return new AcsCallData
            {
                CallId = callData.CallId,
                StartTime = callData.StartTime,
                Status = callData.Status,
                // Exclude detailed metrics and participant information
                Participants = null,
                DetailedMetrics = null
            };
        }
        
        if (!isAdmin) {
            // For participants who aren't admins, remove some sensitive metrics
            callData.DetailedMetrics?.RemoveSensitiveData();
        }
        
        return callData;
    }
}
```

### 3. Compliance Requirements

Ensure compliance with organizational and regulatory requirements:

```csharp
// Implement compliance logging for real-time data
public class ComplianceLogger
{
    private readonly ILogger _logger;
    private readonly AcsComplianceSettings _settings;
    
    public ComplianceLogger(ILogger logger, IOptions<AcsComplianceSettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
    }
    
    public void LogDataAccess(string userId, string dataType, string operation, string resourceId)
    {
        if (_settings.EnableComplianceLogging) {
            _logger.LogInformation(
                \"ComplianceLog: User {UserId} performed {Operation} on {DataType} with ID {ResourceId} at {Timestamp}\",
                userId,
                operation,
                dataType,
                resourceId,
                DateTime.UtcNow
            );
        }
    }
    
    public void LogDataSharing(string senderId, string recipientId, string dataType, string resourceId)
    {
        if (_settings.EnableComplianceLogging) {
            _logger.LogInformation(
                \"ComplianceLog: User {SenderId} shared {DataType} with ID {ResourceId} with user {RecipientId} at {Timestamp}\",
                senderId,
                dataType,
                resourceId,
                recipientId,
                DateTime.UtcNow
            );
        }
    }
}
```

## UI Integration Patterns

### 1. Teams Tabs

Integrate real-time ACS data in custom Teams tabs:

```typescript
// React component for ACS call quality in Teams tab
import * as React from 'react';
import { useState, useEffect } from 'react';
import * as microsoftTeams from \"@microsoft/teams-js\";
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

interface CallQualityProps {
    callId: string;
}

export const CallQuality: React.FC<CallQualityProps> = ({ callId }) => {
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [callData, setCallData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    // Initialize Teams SDK
    useEffect(() => {
        microsoftTeams.initialize();
    }, []);
    
    // Set up SignalR connection
    useEffect(() => {
        const initializeSignalR = async () => {
            try {
                // Get authentication token from Teams
                const token = await new Promise<string>((resolve, reject) => {
                    microsoftTeams.authentication.getAuthToken({
                        successCallback: resolve,
                        failureCallback: reject
                    });
                });
                
                // Create SignalR connection
                const newConnection = new HubConnectionBuilder()
                    .withUrl('/acsHub', { accessTokenFactory: () => token })
                    .withAutomaticReconnect()
                    .build();
                
                // Set up event handlers
                newConnection.on('callDataUpdated', (data) => {
                    if (data.callId === callId) {
                        setCallData(data);
                    }
                });
                
                // Start connection
                await newConnection.start();
                setConnection(newConnection);
                
                // Request initial data
                await newConnection.invoke('JoinCallMonitoring', callId);
                setLoading(false);
            } catch (err) {
                setError(`Failed to connect: ${err}`);
                setLoading(false);
            }
        };
        
        initializeSignalR();
        
        // Clean up on unmount
        return () => {
            connection?.stop();
        };
    }, [callId]);
    
    if (loading) return <div>Loading call data...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!callData) return <div>No data available for this call</div>;
    
    return (
        <div className=\"call-quality-container\">
            <h2>Call Quality Dashboard</h2>
            <div className=\"call-info\">
                <div className=\"call-id\">Call ID: {callData.callId}</div>
                <div className=\"call-duration\">Duration: {formatDuration(callData.duration)}</div>
                <div className=\"call-quality\">
                    Overall Quality: 
                    <span className={`quality-indicator ${callData.overallQuality.toLowerCase()}`}>
                        {callData.overallQuality}
                    </span>
                </div>
            </div>
            
            <h3>Participants</h3>
            <div className=\"participants-list\">
                {callData.participants.map((participant) => (
                    <div key={participant.id} className=\"participant-card\">
                        <div className=\"participant-name\">{participant.name}</div>
                        <div className=\"participant-status\">
                            {participant.speaking && <span className=\"speaking-indicator\">Speaking</span>}
                            {participant.muted && <span className=\"muted-indicator\">Muted</span>}
                            <span className={`camera-indicator ${participant.camera}`}>
                                Camera: {participant.camera}
                            </span>
                        </div>
                        <div className=\"quality-metrics\">
                            <div className=\"metric\">
                                <span className=\"metric-label\">Audio:</span>
                                <span className={`metric-value quality-${getQualityLevel(participant.audioQuality)}`}>
                                    {participant.audioQuality}%
                                </span>
                            </div>
                            <div className=\"metric\">
                                <span className=\"metric-label\">Video:</span>
                                <span className={`metric-value quality-${getQualityLevel(participant.videoQuality)}`}>
                                    {participant.videoQuality}%
                                </span>
                            </div>
                            <div className=\"metric\">
                                <span className=\"metric-label\">Network:</span>
                                <span className={`metric-value quality-${getNetworkQualityLevel(participant.network)}`}>
                                    {getNetworkQuality(participant.network)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper functions
function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function getQualityLevel(percentage: number): string {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 70) return 'good';
    if (percentage >= 50) return 'fair';
    return 'poor';
}

function getNetworkQualityLevel(network: any): string {
    if (network.packetLoss < 0.5 && network.jitter < 30 && network.roundTripTime < 150) return 'excellent';
    if (network.packetLoss < 2 && network.jitter < 60 && network.roundTripTime < 250) return 'good';
    if (network.packetLoss < 5 && network.jitter < 100 && network.roundTripTime < 400) return 'fair';
    return 'poor';
}

function getNetworkQuality(network: any): string {
    const level = getNetworkQualityLevel(network);
    return level.charAt(0).toUpperCase() + level.slice(1);
}
```

### 2. Adaptive Cards

Deliver real-time updates using Adaptive Cards:

```javascript
// Function to generate Adaptive Card for call notification
function generateCallNotificationCard(callData) {
    return {
        type: \"AdaptiveCard\",
        version: \"1.3\",
        body: [
            {
                type: \"Container\",
                items: [
                    {
                        type: \"TextBlock\",
                        size: \"Medium\",
                        weight: \"Bolder\",
                        text: \"Incoming Call\"
                    },
                    {
                        type: \"TextBlock\",
                        spacing: \"None\",
                        text: `From: ${callData.callerName}`,
                        isSubtle: true,
                        wrap: true
                    },
                    {
                        type: \"TextBlock\",
                        text: `Topic: ${callData.topic || \"Not specified\"}`,
                        wrap: true
                    }
                ]
            }
        ],
        actions: [
            {
                type: \"Action.Execute\",
                title: \"Answer\",
                verb: \"answerCall\",
                data: {
                    callId: callData.callId
                }
            },
            {
                type: \"Action.Execute\",
                title: \"Decline\",
                verb: \"declineCall\",
                data: {
                    callId: callData.callId,
                    reason: \"busy\"
                }
            }
        ]
    };
}

// Update Adaptive Card with real-time call status
connection.on(\"callStatusChanged\", (callData) => {
    // Find existing card and update it
    const card = generateCallStatusCard(callData);
    updateAdaptiveCard(callData.callId, card);
});

// Function to update an existing Adaptive Card
async function updateAdaptiveCard(callId, cardContent) {
    const updateCardMessage = {
        type: \"message\",
        attachments: [
            {
                contentType: \"application/vnd.microsoft.card.adaptive\",
                content: cardContent
            }
        ]
    };
    
    await microsoftTeams.tasks.updateTask(updateCardMessage);
}
```

### 3. Bot Integration

Integrate real-time ACS data with Teams bots:

```csharp
// Bot implementation for real-time ACS updates
[Route(\"api/messages\")]
[ApiController]
public class BotController : ControllerBase
{
    private readonly BotAdapter _adapter;
    private readonly IBot _bot;
    private readonly IHubContext<AcsHub> _hubContext;
    
    public BotController(BotAdapter adapter, IBot bot, IHubContext<AcsHub> hubContext)
    {
        _adapter = adapter;
        _bot = bot;
        _hubContext = hubContext;
    }
    
    [HttpPost]
    public async Task PostAsync()
    {
        await _adapter.ProcessAsync(Request, Response, _bot);
    }
}

// Bot implementation
public class AcsMonitorBot : ActivityHandler
{
    private readonly IHubContext<AcsHub> _hubContext;
    private readonly ConcurrentDictionary<string, ConversationReference> _conversationReferences;
    
    public AcsMonitorBot(IHubContext<AcsHub> hubContext)
    {
        _hubContext = hubContext;
        _conversationReferences = new ConcurrentDictionary<string, ConversationReference>();
    }
    
    protected override Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        // Add or update conversation reference
        AddOrUpdateConversationReference(turnContext.Activity as Activity);
        
        return base.OnMessageActivityAsync(turnContext, cancellationToken);
    }
    
    private void AddOrUpdateConversationReference(Activity activity)
    {
        var conversationReference = activity.GetConversationReference();
        _conversationReferences.AddOrUpdate(
            activity.From.Id,
            conversationReference,
            (key, oldValue) => conversationReference);
    }
    
    // Method to send proactive notifications about ACS events
    public async Task SendAcsNotificationAsync(string userId, AcsEvent acsEvent)
    {
        if (_conversationReferences.TryGetValue(userId, out var conversationReference))
        {
            await _adapter.ContinueConversationAsync(
                _botAppId,
                conversationReference,
                async (turnContext, cancellationToken) =>
                {
                    // Create Adaptive Card for ACS event
                    var cardAttachment = CreateAcsEventCard(acsEvent);
                    
                    // Send card to user
                    await turnContext.SendActivityAsync(
                        MessageFactory.Attachment(cardAttachment),
                        cancellationToken);
                },
                CancellationToken.None);
        }
    }
    
    private Attachment CreateAcsEventCard(AcsEvent acsEvent)
    {
        // Create appropriate card based on event type
        AdaptiveCard card;
        
        switch (acsEvent.EventType)
        {
            case \"CallStarted\":
                card = CreateCallStartedCard(acsEvent);
                break;
            case \"CallEnded\":
                card = CreateCallEndedCard(acsEvent);
                break;
            case \"ParticipantJoined\":
                card = CreateParticipantJoinedCard(acsEvent);
                break;
            default:
                card = CreateGenericEventCard(acsEvent);
                break;
        }
        
        return new Attachment
        {
            ContentType = AdaptiveCard.ContentType,
            Content = card
        };
    }
}
```

## Integration with Azure Services

### 1. Azure Monitor Integration

Monitor real-time ACS performance metrics:

```csharp
// Configure Azure Monitor for ACS monitoring
public class AcsMonitoringService
{
    private readonly TelemetryClient _telemetryClient;
    
    public AcsMonitoringService(TelemetryClient telemetryClient)
    {
        _telemetryClient = telemetryClient;
    }
    
    public void TrackCallMetrics(AcsCallMetrics metrics)
    {
        // Track custom event for call
        _telemetryClient.TrackEvent(\"AcsCallCompleted\", new Dictionary<string, string>
        {
            { \"CallId\", metrics.CallId },
            { \"ParticipantCount\", metrics.ParticipantCount.ToString() },
            { \"CallType\", metrics.CallType }
        }, new Dictionary<string, double>
        {
            { \"Duration\", metrics.DurationSeconds },
            { \"OverallQuality\", metrics.OverallQualityScore },
            { \"AudioQuality\", metrics.AudioQualityScore },
            { \"VideoQuality\", metrics.VideoQualityScore },
            { \"AveragePacketLoss\", metrics.AveragePacketLoss },
            { \"AverageJitter\", metrics.AverageJitter },
            { \"AverageLatency\", metrics.AverageLatency }
        });
        
        // Track availability for SLA monitoring
        _telemetryClient.TrackAvailability(
            \"ACS Call Service\",
            DateTimeOffset.FromUnixTimeMilliseconds(metrics.StartTimeMilliseconds),
            TimeSpan.FromSeconds(metrics.DurationSeconds),
            metrics.Location,
            metrics.WasSuccessful,
            metrics.FailureReason
        );
    }
}
```

### 2. Azure Functions Integration

Process ACS events with Azure Functions:

```csharp
// Azure Function to process ACS events and update real-time data
public static class AcsEventProcessor
{
    [FunctionName(\"ProcessAcsEvents\")]
    public static async Task Run(
        [EventHubTrigger(\"acs-events\", Connection = \"AcsEventHubConnection\")] EventData[] events,
        [SignalR(HubName = \"acsHub\")] IAsyncCollector<SignalRMessage> signalRMessages,
        ILogger log)
    {
        foreach (var eventData in events)
        {
            try
            {
                // Parse event data
                string messageBody = Encoding.UTF8.GetString(eventData.Body.Array, eventData.Body.Offset, eventData.Body.Count);
                var acsEvent = JsonConvert.DeserializeObject<AcsEvent>(messageBody);
                
                // Route to appropriate handler based on event type
                switch (acsEvent.EventType)
                {
                    case \"Microsoft.Communication.CallStarted\":
                        await HandleCallStartedEvent(acsEvent, signalRMessages);
                        break;
                    case \"Microsoft.Communication.CallEnded\":
                        await HandleCallEndedEvent(acsEvent, signalRMessages);
                        break;
                    case \"Microsoft.Communication.ParticipantJoined\":
                        await HandleParticipantJoinedEvent(acsEvent, signalRMessages);
                        break;
                    case \"Microsoft.Communication.ParticipantLeft\":
                        await HandleParticipantLeftEvent(acsEvent, signalRMessages);
                        break;
                    default:
                        log.LogInformation($\"Unhandled event type: {acsEvent.EventType}\");
                        break;
                }
            }
            catch (Exception ex)
            {
                log.LogError($\"Error processing event: {ex.Message}\");
            }
        }
    }
    
    private static async Task HandleCallStartedEvent(
        AcsEvent acsEvent,
        IAsyncCollector<SignalRMessage> signalRMessages)
    {
        // Extract call data
        var callData = acsEvent.Data.ToObject<CallEventData>();
        
        // Send real-time update to clients monitoring this call
        await signalRMessages.AddAsync(new SignalRMessage
        {
            Target = \"callStatusChanged\",
            Arguments = new[] { new {
                callId = callData.CallId,
                status = \"started\",
                startTime = callData.StartTime,
                participants = callData.Participants,
                callContext = callData.Context
            }}
        });
        
        // Send update to group monitoring all calls
        await signalRMessages.AddAsync(new SignalRMessage
        {
            Target = \"callListUpdated\",
            GroupName = \"call-monitors\",
            Arguments = new[] { new {
                action = \"added\",
                callId = callData.CallId,
                startTime = callData.StartTime,
                participantCount = callData.Participants.Count
            }}
        });
    }
}
```

### 3. Cosmos DB Change Feed

Use Cosmos DB Change Feed for real-time data updates:

```csharp
// Azure Function triggered by Cosmos DB Change Feed
public static class CosmosDbChangeProcessor
{
    [FunctionName(\"ProcessAcsDataChanges\")]
    public static async Task Run(
        [CosmosDBTrigger(
            databaseName: \"AcsData\",
            collectionName: \"CallRecords\",
            ConnectionStringSetting = \"CosmosDbConnection\",
            LeaseCollectionName = \"leases\",
            CreateLeaseCollectionIfNotExists = true)]
        IReadOnlyList<Document> documents,
        [SignalR(HubName = \"acsHub\")] IAsyncCollector<SignalRMessage> signalRMessages,
        ILogger log)
    {
        if (documents != null && documents.Count > 0)
        {
            log.LogInformation($\"Processing {documents.Count} document changes\");
            
            foreach (var document in documents)
            {
                // Parse document as call record
                var callRecord = JsonConvert.DeserializeObject<AcsCallRecord>(document.ToString());
                
                // Update real-time clients about the change
                await signalRMessages.AddAsync(new SignalRMessage
                {
                    Target = \"callRecordUpdated\",
                    Arguments = new[] { callRecord }
                });
                
                // Send targeted update to clients monitoring specific call
                await signalRMessages.AddAsync(new SignalRMessage
                {
                    Target = \"callDataUpdated\",
                    GroupName = $\"call-{callRecord.CallId}\",
                    Arguments = new[] { callRecord }
                });
            }
        }
    }
}
```

## Testing and Troubleshooting

### 1. Testing Real-time Connections

Implement connection testing and diagnostics:

```javascript
// Connection diagnostics tool for Teams tabs
const connectionDiagnostics = {
    startTime: null,
    endTime: null,
    status: 'idle',
    error: null,
    pingResults: [],
    
    async testConnection() {
        this.startTime = performance.now();
        this.status = 'connecting';
        this.error = null;
        this.pingResults = [];
        
        try {
            // Create test connection
            const connection = new signalR.HubConnectionBuilder()
                .withUrl(\"/diagnosticsHub\")
                .build();
            
            // Set up listeners
            connection.on(\"pingResponse\", (timestamp, serverTime) => {
                const receivedTime = performance.now();
                const roundTripTime = receivedTime - timestamp;
                
                this.pingResults.push({
                    sentTime: timestamp,
                    receivedTime: receivedTime,
                    serverTime: serverTime,
                    roundTripTime: roundTripTime
                });
                
                // Update UI with test results
                updatePingResults(this.pingResults);
            });
            
            // Start connection
            await connection.start();
            
            // Send ping requests
            for (let i = 0; i < 5; i++) {
                await connection.invoke(\"Ping\", performance.now());
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Close connection
            await connection.stop();
            
            this.status = 'completed';
            this.endTime = performance.now();
            
            // Calculate and display results
            const totalTime = this.endTime - this.startTime;
            const avgRtt = this.pingResults.reduce((sum, result) => sum + result.roundTripTime, 0) / this.pingResults.length;
            
            return {
                success: true,
                totalTime: totalTime,
                averageRoundTripTime: avgRtt,
                pingResults: this.pingResults
            };
        } catch (error) {
            this.status = 'failed';
            this.error = error.message;
            this.endTime = performance.now();
            
            return {
                success: false,
                error: error.message,
                totalTime: this.endTime - this.startTime
            };
        }
    }
};
```

### 2. Logging and Diagnostics

Implement comprehensive logging for troubleshooting:

```csharp
// Enhanced logging for real-time ACS components
public class AcsRealTimeLogger
{
    private readonly ILogger _logger;
    private readonly string _componentName;
    
    public AcsRealTimeLogger(ILogger logger, string componentName)
    {
        _logger = logger;
        _componentName = componentName;
    }
    
    public void LogConnectionEvent(string userId, string eventType, string details = null)
    {
        _logger.LogInformation(
            \"ACS Connection {EventType} for user {UserId} in {Component}. {Details}\",
            eventType,
            userId,
            _componentName,
            details ?? \"No additional details\"
        );
    }
    
    public void LogDataEvent(string dataType, string operation, string targetId, int dataSizeBytes)
    {
        _logger.LogInformation(
            \"ACS Data {Operation} of type {DataType} for {TargetId} in {Component}. Size: {DataSize} bytes\",
            operation,
            dataType,
            targetId,
            _componentName,
            dataSizeBytes
        );
    }
    
    public void LogPerformanceMetric(string metricName, double value, Dictionary<string, string> dimensions = null)
    {
        using (_logger.BeginScope(dimensions))
        {
            _logger.LogInformation(
                \"ACS Performance Metric: {MetricName} = {MetricValue} in {Component}\",
                metricName,
                value,
                _componentName
            );
        }
    }
    
    public void LogError(Exception exception, string context, string userId = null)
    {
        _logger.LogError(
            exception,
            \"ACS Error in {Component} for context {Context}, User: {UserId}\",
            _componentName,
            context,
            userId ?? \"Unknown\"
        );
    }
}
```

### 3. Error Handling Strategies

Implement robust error handling for real-time components:

```typescript
// Error handling in TypeScript client
class RealTimeErrorHandler {
    private readonly errorCounts: Map<string, number> = new Map();
    private readonly maxRetries: number = 3;
    private readonly cooldownPeriod: number = 60000; // 1 minute cooldown
    private readonly cooldowns: Map<string, number> = new Map();
    
    public handleError(errorType: string, error: Error, context?: any): ErrorHandlingResult {
        console.error(`ACS Error: ${errorType}`, error, context);
        
        // Check if in cooldown
        const now = Date.now();
        const cooldownUntil = this.cooldowns.get(errorType) || 0;
        
        if (now < cooldownUntil) {
            return {
                action: 'cooldown',
                retryAfter: Math.ceil((cooldownUntil - now) / 1000),
                message: `Too many ${errorType} errors. Retry after cooldown.`
            };
        }
        
        // Increment error count
        const currentCount = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, currentCount + 1);
        
        // Check if should enter cooldown
        if (currentCount + 1 >= this.maxRetries) {
            this.cooldowns.set(errorType, now + this.cooldownPeriod);
            this.errorCounts.set(errorType, 0);
            
            // Log to monitoring system
            this.logToMonitoring(errorType, error, context);
            
            return {
                action: 'cooldown',
                retryAfter: Math.ceil(this.cooldownPeriod / 1000),
                message: `Too many ${errorType} errors. Cooling down.`
            };
        }
        
        // Determine retry strategy based on error type
        switch (errorType) {
            case 'connection':
                return {
                    action: 'retry',
                    retryAfter: Math.pow(2, currentCount), // Exponential backoff
                    message: 'Connection error. Retrying...'
                };
                
            case 'authentication':
                return {
                    action: 'refresh',
                    message: 'Authentication error. Refreshing token...'
                };
                
            case 'timeout':
                return {
                    action: 'retry',
                    retryAfter: 5,
                    message: 'Request timed out. Retrying...'
                };
                
            default:
                return {
                    action: 'notify',
                    message: `An error occurred: ${error.message}`
                };
        }
    }
    
    private logToMonitoring(errorType: string, error: Error, context?: any): void {
        // Implement integration with monitoring system
        // This could send telemetry data to Application Insights, etc.
    }
    
    public resetErrorCount(errorType: string): void {
        this.errorCounts.set(errorType, 0);
    }
}

interface ErrorHandlingResult {
    action: 'retry' | 'refresh' | 'cooldown' | 'notify';
    retryAfter?: number;
    message: string;
}
```

## Case Studies and Examples

### 1. Call Center Dashboard

Real-time call center monitoring in Teams:

```typescript
// Call Center Dashboard Component
import * as React from 'react';
import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { Chart } from 'chart.js/auto';

export const CallCenterDashboard: React.FC = () => {
    const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
    const [queueStats, setQueueStats] = useState<QueueStats>({
        totalInQueue: 0,
        averageWaitTime: 0,
        oldestCallTime: 0,
        callsHandled: 0,
        callsAbandoned: 0
    });
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    
    // Initialize connection
    useEffect(() => {
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl('/callCenterHub')
            .withAutomaticReconnect()
            .build();
            
        // Set up event handlers
        newConnection.on('agentStatsUpdated', (updatedStats) => {
            setAgentStats(updatedStats);
        });
        
        newConnection.on('queueStatsUpdated', (updatedStats) => {
            setQueueStats(updatedStats);
        });
        
        // Start connection
        newConnection
            .start()
            .then(() => {
                console.log('Connected to call center hub');
                setConnection(newConnection);
            })
            .catch((err) => console.error('Connection failed: ', err));
            
        // Clean up on unmount
        return () => {
            newConnection.stop();
        };
    }, []);
    
    // Request data when connected
    useEffect(() => {
        if (connection) {
            connection.invoke('RequestCurrentStats');
        }
    }, [connection]);
    
    // Set up charts when data is available
    useEffect(() => {
        if (agentStats.length > 0) {
            setupAgentChart();
        }
    }, [agentStats]);
    
    // Set up agent performance chart
    const setupAgentChart = () => {
        const ctx = document.getElementById('agentPerformanceChart') as HTMLCanvasElement;
        
        if (!ctx) return;
        
        // Create or update chart
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: agentStats.map(agent => agent.name),
                datasets: [
                    {
                        label: 'Calls Handled',
                        data: agentStats.map(agent => agent.callsHandled),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Average Handling Time (sec)',
                        data: agentStats.map(agent => agent.averageHandlingTime),
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };
    
    return (
        <div className=\"call-center-dashboard\">
            <div className=\"dashboard-header\">
                <h1>Call Center Real-time Dashboard</h1>
                <div className=\"connection-status\">
                    Status: {connection?.state || 'Connecting...'}
                </div>
            </div>
            
            <div className=\"queue-stats-panel\">
                <h2>Queue Statistics</h2>
                <div className=\"stats-grid\">
                    <div className=\"stat-card\">
                        <div className=\"stat-value\">{queueStats.totalInQueue}</div>
                        <div className=\"stat-label\">Calls in Queue</div>
                    </div>
                    <div className=\"stat-card\">
                        <div className=\"stat-value\">{Math.round(queueStats.averageWaitTime)}s</div>
                        <div className=\"stat-label\">Avg. Wait Time</div>
                    </div>
                    <div className=\"stat-card\">
                        <div className=\"stat-value\">{Math.round(queueStats.oldestCallTime)}s</div>
                        <div className=\"stat-label\">Oldest Call Wait</div>
                    </div>
                    <div className=\"stat-card\">
                        <div className=\"stat-value\">{queueStats.callsHandled}</div>
                        <div className=\"stat-label\">Calls Handled</div>
                    </div>
                    <div className=\"stat-card\">
                        <div className=\"stat-value\">{queueStats.callsAbandoned}</div>
                        <div className=\"stat-label\">Calls Abandoned</div>
                    </div>
                </div>
            </div>
            
            <div className=\"agent-performance-panel\">
                <h2>Agent Performance</h2>
                <div className=\"chart-container\">
                    <canvas id=\"agentPerformanceChart\"></canvas>
                </div>
                
                <div className=\"agent-status-list\">
                    <h3>Agent Status</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Agent</th>
                                <th>Status</th>
                                <th>Current Call</th>
                                <th>Duration</th>
                                <th>Calls Handled</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agentStats.map(agent => (
                                <tr key={agent.id} className={`status-${agent.status.toLowerCase()}`}>
                                    <td>{agent.name}</td>
                                    <td>{agent.status}</td>
                                    <td>{agent.currentCallId || '-'}</td>
                                    <td>{agent.currentCallDuration ? `${Math.round(agent.currentCallDuration)}s` : '-'}</td>
                                    <td>{agent.callsHandled}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

interface AgentStats {
    id: string;
    name: string;
    status: string;
    currentCallId: string | null;
    currentCallDuration: number | null;
    callsHandled: number;
    averageHandlingTime: number;
}

interface QueueStats {
    totalInQueue: number;
    averageWaitTime: number;
    oldestCallTime: number;
    callsHandled: number;
    callsAbandoned: number;
}
```

### 2. Live Support Chat

Real-time support chat with ACS in Teams:

```typescript
// Live Support Chat Component
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import * as microsoftTeams from \"@microsoft/teams-js\";
import { ChatClient, ChatThreadClient } from \"@azure/communication-chat\";
import { AzureCommunicationTokenCredential } from \"@azure/communication-common\";

export const LiveSupportChat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [threadClient, setThreadClient] = useState<ChatThreadClient | null>(null);
    const [user, setUser] = useState<ChatUser | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Initialize Teams SDK
    useEffect(() => {
        microsoftTeams.initialize();
        
        // Get Teams context
        microsoftTeams.getContext(context => {
            // Initialize chat with user info
            initializeChat(context.userObjectId, context.userPrincipalName);
        });
    }, []);
    
    // Scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const initializeChat = async (userId: string, userEmail: string) => {
        try {
            setIsLoading(true);
            
            // Get ACS token for the user
            const response = await fetch('/api/getChatToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    userEmail
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to get chat token');
            }
            
            const tokenData = await response.json();
            
            // Set up chat client
            const credential = new AzureCommunicationTokenCredential(tokenData.token);
            const chatClient = new ChatClient(tokenData.endpoint, credential);
            
            // Set user info
            setUser({
                id: tokenData.communicationUserId,
                displayName: userEmail.split('@')[0],
                email: userEmail
            });
            
            // Get or create chat thread
            const threadResponse = await fetch('/api/getChatThread', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: tokenData.communicationUserId
                })
            });
            
            if (!threadResponse.ok) {
                throw new Error('Failed to get chat thread');
            }
            
            const threadData = await threadResponse.json();
            
            // Create thread client
            const threadClient = chatClient.getChatThreadClient(threadData.threadId);
            setThreadClient(threadClient);
            
            // Start real-time notifications
            await chatClient.startRealtimeNotifications();
            
            // Subscribe to new message events
            chatClient.on(\"chatMessageReceived\", (event) => {
                if (event.threadId === threadData.threadId) {
                    const newMessage: ChatMessage = {
                        id: event.id,
                        content: event.message,
                        sender: {
                            id: event.sender.communicationUserId,
                            displayName: event.senderDisplayName || 'Unknown User'
                        },
                        timestamp: new Date(event.createdOn),
                        type: event.type
                    };
                    
                    setMessages(currentMessages => [...currentMessages, newMessage]);
                }
            });
            
            // Get existing messages
            const messagesResponse = await threadClient.listMessages();
            
            const existingMessages: ChatMessage[] = [];
            for await (const message of messagesResponse) {
                if (message.type === 'text') {
                    existingMessages.push({
                        id: message.id,
                        content: message.content?.message || '',
                        sender: {
                            id: message.sender?.communicationUserId || '',
                            displayName: message.senderDisplayName || 'Unknown User'
                        },
                        timestamp: new Date(message.createdOn),
                        type: message.type
                    });
                }
            }
            
            // Sort messages by timestamp
            existingMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            setMessages(existingMessages);
            
            setIsLoading(false);
        } catch (err) {
            console.error('Chat initialization error:', err);
            setError('Failed to initialize chat: ' + (err as Error).message);
            setIsLoading(false);
        }
    };
    
    const sendMessage = async () => {
        if (!inputMessage.trim() || !threadClient || !user) return;
        
        try {
            const sendResult = await threadClient.sendMessage({
                content: inputMessage
            });
            
            // Clear input field
            setInputMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            // Show error to user
            setError('Failed to send message. Please try again.');
        }
    };
    
    if (isLoading) {
        return <div className=\"loading-container\">Loading support chat...</div>;
    }
    
    if (error) {
        return <div className=\"error-container\">Error: {error}</div>;
    }
    
    return (
        <div className=\"live-support-chat\">
            <div className=\"chat-header\">
                <h2>Live Support Chat</h2>
                <div className=\"chat-status\">
                    {threadClient ? <span className=\"status-online\">Connected</span> : <span className=\"status-offline\">Disconnected</span>}
                </div>
            </div>
            
            <div className=\"messages-container\">
                {messages.length === 0 ? (
                    <div className=\"no-messages\">
                        <p>No messages yet. Start the conversation by sending a message.</p>
                    </div>
                ) : (
                    messages.map(message => (
                        <div 
                            key={message.id} 
                            className={`message ${message.sender.id === user?.id ? 'sent' : 'received'}`}
                        >
                            <div className=\"message-sender\">{message.sender.displayName}</div>
                            <div className=\"message-content\">{message.content}</div>
                            <div className=\"message-time\">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div className=\"message-input\">
                <input 
                    type=\"text\" 
                    placeholder=\"Type your message here...\" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!inputMessage.trim()}>Send</button>
            </div>
        </div>
    );
};

interface ChatMessage {
    id: string;
    content: string;
    sender: {
        id: string;
        displayName: string;
    };
    timestamp: Date;
    type: string;
}

interface ChatUser {
    id: string;
    displayName: string;
    email: string;
}
```

## Future Directions and Best Practices

### 1. AI Integration

Enhance real-time ACS data with AI capabilities:

```javascript
// AI-powered real-time call analysis
async function analyzeCallInRealTime(callData) {
    // Extract audio for sentiment analysis
    const audioSamples = callData.audioSamples;
    
    // Call Azure Cognitive Services for sentiment analysis
    const sentimentResponse = await fetch('/api/analyzeSentiment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audioSamples })
    });
    
    const sentimentResults = await sentimentResponse.json();
    
    // Update call metadata with sentiment analysis
    const updatedCallData = {
        ...callData,
        sentimentAnalysis: {
            overallSentiment: sentimentResults.sentiment,
            confidenceScore: sentimentResults.confidenceScore,
            emotionalSigns: sentimentResults.emotions,
            recommendedActions: sentimentResults.recommendations
        }
    };
    
    // Update real-time dashboard with sentiment data
    updateCallDashboard(updatedCallData);
    
    // Alert for negative sentiment if needed
    if (updatedCallData.sentimentAnalysis.overallSentiment === 'negative' && 
        updatedCallData.sentimentAnalysis.confidenceScore > 0.8) {
        
        triggerNegativeSentimentAlert(updatedCallData);
    }
}
```

### 2. Scalability Patterns

Implement patterns for scaling real-time ACS applications:

```csharp
// Scalable SignalR backplane with Azure Redis Cache
public void ConfigureServices(IServiceCollection services)
{
    var signalRServerBuilder = services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = true;
        options.MaximumReceiveMessageSize = 102400; // 100 KB
        options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
        options.KeepAliveInterval = TimeSpan.FromSeconds(20);
    });
    
    // Add Redis backplane for scaling across multiple servers
    signalRServerBuilder.AddAzureSignalR(Configuration.GetConnectionString(\"SignalR\"));
    
    // Add Redis backplane for scaling across multiple servers
    signalRServerBuilder.AddStackExchangeRedis(Configuration.GetConnectionString(\"Redis\"), options =>
    {
        options.Configuration.ChannelPrefix = \"AcsTeams\";
    });
    
    // Configure the rest of the services
    services.AddControllers();
    services.AddAzureCommunicationServices(Configuration.GetConnectionString(\"ACS\"));
    
    // Add caching
    services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = Configuration.GetConnectionString(\"Redis\");
        options.InstanceName = \"AcsTeams_\";
    });
}
```

### 3. Mobile and Cross-Platform Support

Ensure real-time ACS data works across platforms:

```typescript
// Cross-platform real-time data handling
class AcsDataClient {
    private connection: signalR.HubConnection | null = null;
    private options: AcsDataClientOptions;
    private reconnectTimer: any = null;
    private deviceInfo: DeviceInfo;
    
    constructor(options: AcsDataClientOptions) {
        this.options = {
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            ...options
        };
        
        this.deviceInfo = this.detectDevice();
    }
    
    public async initialize(): Promise<void> {
        // Create platform-specific connection configuration
        const connectionBuilder = new signalR.HubConnectionBuilder()
            .withUrl(this.options.hubUrl, {
                accessTokenFactory: () => this.getAccessToken(),
                transport: this.getOptimalTransport()
            })
            .withAutomaticReconnect(this.getReconnectPolicy())
            .configureLogging(this.getLogLevel())
            .build();
        
        // Set up connection event handlers
        this.connection = connectionBuilder;
        
        // Handle connection events
        this.connection.onclose(this.handleConnectionClosed.bind(this));
        
        // Handle reconnection
        this.connection.onreconnecting(this.handleReconnecting.bind(this));
        this.connection.onreconnected(this.handleReconnected.bind(this));
        
        // Start connection
        try {
            await this.connection.start();
            console.log('Connected to ACS data hub');
            this.registerDeviceSpecificHandlers();
        } catch (error) {
            console.error('Failed to connect:', error);
            this.scheduleReconnect();
            throw error;
        }
    }
    
    private detectDevice(): DeviceInfo {
        // Detect device type and capabilities
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        
        let deviceType = 'unknown';
        let browserName = 'unknown';
        let operatingSystem = 'unknown';
        
        // Detect device type
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            deviceType = 'mobile';
            
            if (/iPhone|iPad|iPod/i.test(userAgent)) {
                operatingSystem = 'ios';
            } else if (/Android/i.test(userAgent)) {
                operatingSystem = 'android';
            }
        } else {
            deviceType = 'desktop';
            
            if (/Win/.test(platform)) {
                operatingSystem = 'windows';
            } else if (/Mac/.test(platform)) {
                operatingSystem = 'macos';
            } else if (/Linux/.test(platform)) {
                operatingSystem = 'linux';
            }
        }
        
        // Detect browser
        if (/Chrome/.test(userAgent) && !/Edge/.test(userAgent)) {
            browserName = 'chrome';
        } else if (/Firefox/.test(userAgent)) {
            browserName = 'firefox';
        } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
            browserName = 'safari';
        } else if (/Edge/.test(userAgent)) {
            browserName = 'edge';
        }
        
        return {
            type: deviceType,
            browser: browserName,
            os: operatingSystem,
            isMobile: deviceType === 'mobile',
            isTablet: /iPad/i.test(userAgent),
            supportsWebSockets: 'WebSocket' in window,
            supportsSSE: 'EventSource' in window,
            supportsPush: 'PushManager' in window
        };
    }
    
    private getOptimalTransport(): signalR.HttpTransportType {
        // Choose optimal transport based on device capabilities
        if (this.deviceInfo.supportsWebSockets) {
            return signalR.HttpTransportType.WebSockets;
        } else {
            return signalR.HttpTransportType.LongPolling;
        }
    }
    
    private getReconnectPolicy(): number[] {
        // Implement exponential backoff for reconnection
        if (this.deviceInfo.isMobile) {
            // More conservative policy for mobile devices to save battery
            return [1000, 3000, 5000, 10000, 15000, 30000];
        } else {
            // More aggressive reconnection for desktop
            return [500, 1000, 2000, 5000, 10000, 20000];
        }
    }
    
    private getLogLevel(): signalR.LogLevel {
        // Set appropriate log level based on environment
        return this.options.debug ? signalR.LogLevel.Debug : signalR.LogLevel.Error;
    }
    
    private async getAccessToken(): Promise<string> {
        // Implement platform-specific token acquisition
        if (this.deviceInfo.browser === 'edge' && window.navigator.userAgent.indexOf('Teams') !== -1) {
            // Teams-specific authentication
            return await this.getTeamsToken();
        } else {
            // Standard authentication
            return await this.options.tokenProvider();
        }
    }
    
    private async getTeamsToken(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            try {
                // Use Teams SDK for authentication
                microsoftTeams.authentication.getAuthToken({
                    successCallback: (token: string) => resolve(token),
                    failureCallback: (error: string) => reject(new Error(error))
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    private handleConnectionClosed(error?: Error): void {
        console.warn('Connection closed', error);
        
        if (error) {
            this.scheduleReconnect();
        }
    }
    
    private handleReconnecting(error?: Error): void {
        console.warn('Reconnecting...', error);
        
        // Notify UI that connection is unstable
        if (this.options.onConnectionStateChanged) {
            this.options.onConnectionStateChanged('reconnecting');
        }
    }
    
    private handleReconnected(connectionId?: string): void {
        console.log('Reconnected. Connection ID:', connectionId);
        
        // Notify UI that connection is restored
        if (this.options.onConnectionStateChanged) {
            this.options.onConnectionStateChanged('connected');
        }
        
        // Refresh data after reconnection
        this.refreshDataAfterReconnection();
    }
    
    private scheduleReconnect(): void {
        if (this.reconnectTimer !== null) {
            return; // Already scheduled
        }
        
        const delay = this.options.reconnectInterval;
        
        console.log(`Scheduling reconnect in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            
            try {
                await this.initialize();
            } catch (error) {
                console.error('Reconnect failed:', error);
            }
        }, delay);
    }
    
    private registerDeviceSpecificHandlers(): void {
        // Add handlers based on device type
        if (this.deviceInfo.isMobile) {
            // Mobile-specific handlers
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            
            // Handle background/foreground transitions on mobile
            if (this.deviceInfo.os === 'ios' || this.deviceInfo.os === 'android') {
                this.registerMobileAppStateHandlers();
            }
        } else {
            // Desktop-specific handlers
            window.addEventListener('online', this.handleOnlineStateChange.bind(this));
            window.addEventListener('offline', this.handleOnlineStateChange.bind(this));
        }
    }
    
    private registerMobileAppStateHandlers(): void {
        // Register for platform-specific lifecycle events
        document.addEventListener('pause', () => {
            // App going to background
            this.handleAppBackground();
        });
        
        document.addEventListener('resume', () => {
            // App coming to foreground
            this.handleAppForeground();
        });
    }
    
    private handleVisibilityChange(): void {
        if (document.visibilityState === 'hidden') {
            // Page is hidden, may want to reduce updates
            this.pauseNonEssentialUpdates();
        } else {
            // Page is visible again
            this.resumeAllUpdates();
            this.refreshDataAfterReconnection();
        }
    }
    
    private handleOnlineStateChange(): void {
        if (navigator.onLine) {
            // Browser is online, try to reconnect
            this.scheduleReconnect();
        } else {
            // Browser is offline, may want to show offline indicator
            if (this.options.onConnectionStateChanged) {
                this.options.onConnectionStateChanged('disconnected');
            }
        }
    }
    
    private handleAppBackground(): void {
        // App going to background - reduce resource usage
        this.pauseNonEssentialUpdates();
    }
    
    private handleAppForeground(): void {
        // App coming to foreground - resume normal operation
        this.resumeAllUpdates();
        this.refreshDataAfterReconnection();
    }
    
    private pauseNonEssentialUpdates(): void {
        // Reduce update frequency when app is in background
        if (this.connection) {
            this.connection.invoke('ReduceUpdateFrequency');
        }
    }
    
    private resumeAllUpdates(): void {
        // Resume normal update frequency
        if (this.connection) {
            this.connection.invoke('ResumeNormalUpdateFrequency');
        }
    }
    
    private async refreshDataAfterReconnection(): void {
        // Refresh any stale data after reconnection
        if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
            try {
                // Request latest data
                await this.connection.invoke('GetLatestData');
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
        }
    }
    
    // Public methods for interacting with real-time data
    public async subscribeToData(dataType: string, callback: (data: any) => void): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }
        
        // Register callback for data updates
        this.connection.on(`${dataType}Updated`, callback);
        
        // Subscribe to updates on the server
        await this.connection.invoke('SubscribeToDataUpdates', dataType);
    }
    
    public async unsubscribeFromData(dataType: string): Promise<void> {
        if (!this.connection) {
            return;
        }
        
        // Unsubscribe from updates on the server
        await this.connection.invoke('UnsubscribeFromDataUpdates', dataType);
        
        // Remove the handler
        this.connection.off(`${dataType}Updated`);
    }
    
    public async sendData(dataType: string, data: any): Promise<void> {
        if (!this.connection) {
            throw new Error('Connection not initialized');
        }
        
        // Send data to the server
        await this.connection.invoke('SendData', dataType, data);
    }
    
    public async disconnect(): Promise<void> {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.connection) {
            await this.connection.stop();
            this.connection = null;
        }
    }
}

// Interface definitions for the client
interface AcsDataClientOptions {
    hubUrl: string;
    tokenProvider: () => Promise<string>;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    debug?: boolean;
    onConnectionStateChanged?: (state: ConnectionState) => void;
}

interface DeviceInfo {
    type: string;
    browser: string;
    os: string;
    isMobile: boolean;
    isTablet: boolean;
    supportsWebSockets: boolean;
    supportsSSE: boolean;
    supportsPush: boolean;
}

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';
```

### Example Usage in Teams Tab:

```typescript
// Initialize cross-platform client in Teams tab
async function initializeRealTimeData(): Promise<void> {
    try {
        // Initialize Teams SDK
        await microsoftTeams.initialize();
        
        // Create ACS data client
        const acsDataClient = new AcsDataClient({
            hubUrl: 'https://your-service.com/acsHub',
            tokenProvider: getAuthToken,
            debug: true,
            onConnectionStateChanged: (state) => {
                updateConnectionStatus(state);
            }
        });
        
        // Initialize connection
        await acsDataClient.initialize();
        
        // Subscribe to different data types
        await acsDataClient.subscribeToData('callStats', (data) => {
            updateCallStatsUI(data);
        });
        
        await acsDataClient.subscribeToData('presenceInfo', (data) => {
            updatePresenceIndicators(data);
        });
        
        // Handle tab visibility changes
        microsoftTeams.registerOnThemeChangeHandler((theme) => {
            applyTheme(theme);
        });
    } catch (error) {
        console.error('Failed to initialize real-time data:', error);
        showErrorMessage('Could not connect to real-time data service');
    }
}

// Get auth token from Teams
async function getAuthToken(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        microsoftTeams.authentication.getAuthToken({
            successCallback: (token) => resolve(token),
            failureCallback: (error) => reject(new Error(error))
        });
    });
}

// Update UI based on connection state
function updateConnectionStatus(state: ConnectionState): void {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    // Update status indicator
    statusElement.className = `connection-status status-${state}`;
    
    switch (state) {
        case 'connected':
            statusElement.innerText = 'Connected';
            hideReconnectingIndicator();
            break;
        case 'disconnected':
            statusElement.innerText = 'Disconnected';
            showOfflineExperience();
            break;
        case 'reconnecting':
            statusElement.innerText = 'Reconnecting...';
            showReconnectingIndicator();
            break;
    }
}
```

## References and Resources

### Official Documentation

- [Azure Communication Services Documentation](https://docs.microsoft.com/en-us/azure/communication-services/)
- [Microsoft Teams Integration Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/app-studio-overview)
- [Azure SignalR Service Documentation](https://docs.microsoft.com/en-us/azure/azure-signalr/signalr-overview)

### Sample Projects

- [ACS Teams Integration Samples](https://github.com/Azure-Samples/communication-services-web-calling-tutorial)
- [Real-time Data in Teams Tabs Sample](https://github.com/OfficeDev/Microsoft-Teams-Samples)

### Best Practices

1. **Performance Optimization**
   - Use WebSockets transport when available
   - Implement data throttling for high-frequency updates
   - Consider client capabilities when designing real-time experiences

2. **Reliability**
   - Implement robust reconnection logic
   - Provide offline functionality when possible
   - Cache critical data for quick recovery after reconnection

3. **User Experience**
   - Show clear connection status indicators
   - Provide appropriate loading and error states
   - Adapt experience based on network conditions

4. **Security**
   - Implement proper authentication and authorization
   - Validate all incoming real-time data
   - Use HTTPS for all communications

## Troubleshooting Guide

| Issue                              | Possible Cause                               | Solution                                                                                     |
|------------------------------------|----------------------------------------------|----------------------------------------------------------------------------------------------|
| Connection repeatedly fails        | Network firewall blocking WebSockets         | Switch to **LongPolling** transport or configure the firewall                                |
| High latency on mobile devices     | Poor mobile-network connectivity             | Reduce update frequency; batch updates                                                       |
| Memory leaks                       | Failure to unsubscribe from events           | Ensure proper cleanup in component life-cycle methods                                        |
| Authentication failures            | Expired tokens                               | Implement a robust token-refresh mechanism                                                   |
| Data inconsistency after reconnect | Missed events during disconnect              | Request a full data refresh immediately after the connection is re-established               |
