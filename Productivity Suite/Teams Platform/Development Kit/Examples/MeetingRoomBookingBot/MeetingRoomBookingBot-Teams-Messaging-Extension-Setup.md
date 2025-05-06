# Meeting Room Booking Bot - Teams Messaging Extension Setup

## Overview

The Meeting Room Booking Bot includes a Microsoft Teams Messaging Extension component that allows users to quickly search for and book meeting rooms directly from the Teams compose box, command bar, or from messages. This document provides comprehensive guidance on configuring, registering, and implementing the Teams Messaging Extension feature of the Meeting Room Booking Bot.

## What are Teams Messaging Extensions?

Teams Messaging Extensions are interactive components that allow users to interact with external services directly within the Teams client. The Meeting Room Booking Bot leverages messaging extensions to:

1. **Search for available rooms** based on capacity, location, and time criteria
2. **Display room details** and availability in rich adaptive cards
3. **Complete the booking process** without leaving the Teams context
4. **Share booking information** with colleagues in chats and channels

## Prerequisites

Before implementing the Teams Messaging Extension, ensure you have:

- A Microsoft 365 tenant with Teams administration rights
- An Azure subscription for hosting the bot service
- Visual Studio 2019 or later with the Teams development tools
- Bot Framework SDK installed
- Microsoft Graph API permissions configured for room resources
- Completed the core bot implementation (see [MeetingRoomBookingBot-Deployment-Guide.md](./MeetingRoomBookingBot-Deployment-Guide.md))

## Types of Commands Supported

The Meeting Room Booking Bot messaging extension implements two types of commands:

### 1. Search Commands
- Allows users to search for available rooms by location, capacity, and time
- Returns results as a list of card previews
- Enables users to select and insert complete room details into messages

### 2. Action Commands
- Provides forms for users to input booking requirements
- Shows available rooms based on criteria
- Completes the booking process via task modules (dialog forms)
- Confirms bookings with adaptive cards in the conversation

## Implementation Steps

### Step 1: Configure the Bot Registration

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Access your Bot Channels Registration or Azure Bot resource
3. Ensure the Microsoft Teams channel is enabled
4. Add the messaging extension endpoint URL (typically `https://[your-bot-domain]/api/messages`)
5. Update the following settings:
   ```json
   {
     "name": "MeetingRoomBookingBot",
     "msaAppId": "[your-bot-app-id]",
     "messagingEndpoint": "https://[your-bot-domain]/api/messages",
     "supportsFiles": false,
     "supportsCalling": false,
     "supportsVideo": false
   }
   ```

### Step 2: Create the Teams App Manifest

Create a `manifest.json` file with the following configuration:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
  "manifestVersion": "1.11",
  "version": "1.0.0",
  "id": "[your-bot-app-id]",
  "packageName": "com.contoso.meetingroombot",
  "developer": {
    "name": "Contoso",
    "websiteUrl": "https://contoso.com",
    "privacyUrl": "https://contoso.com/privacy",
    "termsOfUseUrl": "https://contoso.com/termsofuse"
  },
  "name": {
    "short": "Meeting Room Booker",
    "full": "Meeting Room Booking Bot"
  },
  "description": {
    "short": "Quickly find and book meeting rooms in Teams",
    "full": "The Meeting Room Booking Bot helps you easily search for and book available meeting rooms directly from Microsoft Teams. Find rooms by capacity, location, and amenities, and book them without leaving your conversation."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#007FFF",
  "bots": [
    {
      "botId": "[your-bot-app-id]",
      "scopes": [
        "personal",
        "team",
        "groupchat"
      ],
      "supportsFiles": false,
      "isNotificationOnly": false
    }
  ],
  "composeExtensions": [
    {
      "botId": "[your-bot-app-id]",
      "canUpdateConfiguration": true,
      "commands": [
        {
          "id": "findRooms",
          "type": "query",
          "title": "Find Rooms",
          "description": "Search for available meeting rooms",
          "initialRun": false,
          "fetchTask": false,
          "context": [
            "compose",
            "commandBox"
          ],
          "parameters": [
            {
              "name": "searchQuery",
              "title": "Search Query",
              "description": "Enter location, capacity, or room name",
              "inputType": "text"
            },
            {
              "name": "startTime",
              "title": "Start Time",
              "description": "When do you need the room?",
              "inputType": "datetime"
            },
            {
              "name": "duration",
              "title": "Duration (minutes)",
              "description": "How long do you need the room?",
              "inputType": "number"
            }
          ]
        },
        {
          "id": "bookRoom",
          "type": "action",
          "title": "Book a Room",
          "description": "Create a new room booking",
          "initialRun": false,
          "fetchTask": true,
          "context": [
            "compose",
            "commandBox",
            "message"
          ],
          "parameters": [
            {
              "name": "param",
              "title": "Parameter",
              "description": "",
              "inputType": "text"
            }
          ]
        }
      ]
    }
  ],
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": [
    "[your-bot-domain]"
  ]
}
```

Replace placeholders (`[your-bot-app-id]`, `[your-bot-domain]`) with your actual values.

### Step 3: Implement the Messaging Extension Handlers

Add the following code to your bot implementation to handle messaging extension requests:

```csharp
// MessagingExtensionHandler.cs

public async Task<MessagingExtensionResponse> HandleMessagingExtensionQueryAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionQuery query, CancellationToken cancellationToken)
{
    // Extract parameters from the query
    var searchQuery = query.Parameters?.FirstOrDefault(p => p.Name == "searchQuery")?.Value as string ?? string.Empty;
    var startTimeParam = query.Parameters?.FirstOrDefault(p => p.Name == "startTime")?.Value as string;
    var durationParam = query.Parameters?.FirstOrDefault(p => p.Name == "duration")?.Value as string;
    
    // Parse and validate parameters
    DateTime startTime = string.IsNullOrEmpty(startTimeParam) 
        ? DateTime.Now.AddMinutes(15).RoundToNearest(TimeSpan.FromMinutes(15)) 
        : DateTime.Parse(startTimeParam);
    
    int duration = string.IsNullOrEmpty(durationParam) ? 30 : int.Parse(durationParam);
    DateTime endTime = startTime.AddMinutes(duration);
    
    // Get available rooms from the service
    var rooms = await _roomService.GetAvailableRoomsAsync(startTime, endTime, searchQuery);
    
    // Create card attachments for each room
    var attachments = new List<MessagingExtensionAttachment>();
    foreach (var room in rooms)
    {
        var card = new HeroCard
        {
            Title = room.DisplayName,
            Subtitle = $"Capacity: {room.Capacity} | {room.Building} {room.Floor}",
            Text = $"Available from {startTime:h:mm tt} to {endTime:h:mm tt}",
            Buttons = new List<CardAction>
            {
                new CardAction(ActionTypes.ImBack, "Book this room", value: $"book {room.Id} from {startTime:yyyy-MM-ddTHH:mm:ss} to {endTime:yyyy-MM-ddTHH:mm:ss}")
            }
        };
        
        attachments.Add(new MessagingExtensionAttachment
        {
            ContentType = HeroCard.ContentType,
            Content = card,
            Preview = card.ToAttachment()
        });
    }
    
    // Return results
    return new MessagingExtensionResponse
    {
        ComposeExtension = new MessagingExtensionResult
        {
            Type = "result",
            AttachmentLayout = "list",
            Attachments = attachments
        }
    };
}

public async Task<MessagingExtensionActionResponse> HandleMessagingExtensionFetchTaskAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionAction action, CancellationToken cancellationToken)
{
    // Create the booking form as an Adaptive Card
    var card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
    {
        Body = new List<AdaptiveElement>
        {
            new AdaptiveTextBlock
            {
                Text = "Book a Meeting Room",
                Size = AdaptiveTextSize.Large,
                Weight = AdaptiveTextWeight.Bolder
            },
            new AdaptiveTextBlock
            {
                Text = "Meeting Details",
                Weight = AdaptiveTextWeight.Bolder
            },
            new AdaptiveTextInput
            {
                Id = "meetingTitle",
                Placeholder = "Enter meeting title",
                Label = "Title",
                IsRequired = true
            },
            new AdaptiveDateInput
            {
                Id = "meetingDate",
                Value = DateTime.Today.ToString("yyyy-MM-dd"),
                Label = "Date",
                IsRequired = true
            },
            new AdaptiveTimeInput
            {
                Id = "startTime",
                Value = DateTime.Now.AddMinutes(15).RoundToNearest(TimeSpan.FromMinutes(15)).ToString("HH:mm"),
                Label = "Start Time",
                IsRequired = true
            },
            new AdaptiveChoiceSetInput
            {
                Id = "duration",
                Label = "Duration",
                IsRequired = true,
                Value = "30",
                Choices = new List<AdaptiveChoice>
                {
                    new AdaptiveChoice { Title = "30 minutes", Value = "30" },
                    new AdaptiveChoice { Title = "1 hour", Value = "60" },
                    new AdaptiveChoice { Title = "1.5 hours", Value = "90" },
                    new AdaptiveChoice { Title = "2 hours", Value = "120" }
                }
            },
            new AdaptiveNumberInput
            {
                Id = "capacity",
                Label = "Required Capacity",
                Min = 1,
                Value = 2,
                IsRequired = true
            },
            new AdaptiveTextInput
            {
                Id = "location",
                Placeholder = "Enter preferred location (optional)",
                Label = "Location"
            }
        },
        Actions = new List<AdaptiveAction>
        {
            new AdaptiveSubmitAction
            {
                Title = "Find Available Rooms",
                Data = new { action = "findRooms" }
            }
        }
    };
    
    // Return the task module response with the adaptive card
    return new MessagingExtensionActionResponse
    {
        Task = new TaskModuleContinueResponse
        {
            Value = new TaskModuleTaskInfo
            {
                Card = new Attachment
                {
                    ContentType = AdaptiveCard.ContentType,
                    Content = card
                },
                Height = 450,
                Width = 500,
                Title = "Book a Meeting Room"
            }
        }
    };
}

public async Task<MessagingExtensionActionResponse> HandleMessagingExtensionSubmitActionAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionAction action, CancellationToken cancellationToken)
{
    // Extract data from the submitted form
    var data = JsonConvert.DeserializeObject<BookingFormData>(action.Data.ToString());
    
    if (data.action == "findRooms")
    {
        // Parse input data
        DateTime meetingDate = DateTime.Parse(data.meetingDate);
        DateTime startTime = DateTime.Parse($"{meetingDate.ToString("yyyy-MM-dd")} {data.startTime}");
        DateTime endTime = startTime.AddMinutes(int.Parse(data.duration));
        int capacity = data.capacity;
        string location = data.location ?? string.Empty;
        
        // Get available rooms
        var rooms = await _roomService.GetAvailableRoomsAsync(startTime, endTime, location, capacity);
        
        // Create room selection card
        var roomSelectionCard = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveTextBlock
                {
                    Text = "Available Rooms",
                    Size = AdaptiveTextSize.Large,
                    Weight = AdaptiveTextWeight.Bolder
                },
                new AdaptiveTextBlock
                {
                    Text = $"Meeting: {data.meetingTitle}",
                    Wrap = true
                },
                new AdaptiveTextBlock
                {
                    Text = $"Time: {startTime:MMM d, yyyy h:mm tt} - {endTime:h:mm tt}",
                    Wrap = true
                }
            }
        };
        
        // Add room options
        if (rooms.Count > 0)
        {
            var roomChoices = new List<AdaptiveChoice>();
            foreach (var room in rooms)
            {
                roomChoices.Add(new AdaptiveChoice 
                { 
                    Title = $"{room.DisplayName} (Capacity: {room.Capacity})", 
                    Value = room.Id 
                });
            }
            
            roomSelectionCard.Body.Add(new AdaptiveChoiceSetInput
            {
                Id = "selectedRoom",
                Style = AdaptiveChoiceInputStyle.Expanded,
                Choices = roomChoices,
                IsRequired = true
            });
            
            roomSelectionCard.Actions = new List<AdaptiveAction>
            {
                new AdaptiveSubmitAction
                {
                    Title = "Book Selected Room",
                    Data = new 
                    { 
                        action = "bookSelectedRoom",
                        meetingTitle = data.meetingTitle,
                        startTime = startTime.ToString("o"),
                        endTime = endTime.ToString("o")
                    }
                }
            };
        }
        else
        {
            roomSelectionCard.Body.Add(new AdaptiveTextBlock
            {
                Text = "No rooms available matching your criteria. Please try different parameters.",
                Wrap = true
            });
            
            roomSelectionCard.Actions = new List<AdaptiveAction>
            {
                new AdaptiveSubmitAction
                {
                    Title = "Back to Search",
                    Data = new { action = "backToSearch" }
                }
            };
        }
        
        return new MessagingExtensionActionResponse
        {
            Task = new TaskModuleContinueResponse
            {
                Value = new TaskModuleTaskInfo
                {
                    Card = new Attachment
                    {
                        ContentType = AdaptiveCard.ContentType,
                        Content = roomSelectionCard
                    },
                    Height = 450,
                    Width = 500,
                    Title = "Available Rooms"
                }
            }
        };
    }
    else if (data.action == "bookSelectedRoom")
    {
        // Extract booking details
        string roomId = data.selectedRoom;
        string meetingTitle = data.meetingTitle;
        DateTime startTime = DateTime.Parse(data.startTime);
        DateTime endTime = DateTime.Parse(data.endTime);
        
        // Create the booking
        var booking = await _roomService.BookRoomAsync(roomId, meetingTitle, startTime, endTime);
        
        // Create confirmation card for sharing in the conversation
        var room = await _roomService.GetRoomDetailsAsync(roomId);
        var confirmationCard = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveTextBlock
                {
                    Text = "Room Booked Successfully",
                    Size = AdaptiveTextSize.Large,
                    Weight = AdaptiveTextWeight.Bolder,
                    Color = AdaptiveTextColor.Good
                },
                new AdaptiveTextBlock
                {
                    Text = meetingTitle,
                    Weight = AdaptiveTextWeight.Bolder,
                    Size = AdaptiveTextSize.Medium,
                    Wrap = true
                },
                new AdaptiveColumnSet
                {
                    Columns = new List<AdaptiveColumn>
                    {
                        new AdaptiveColumn
                        {
                            Width = "auto",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = "📅",
                                    Size = AdaptiveTextSize.Medium
                                }
                            }
                        },
                        new AdaptiveColumn
                        {
                            Width = "stretch",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = $"{startTime:MMM d, yyyy}",
                                    Wrap = true
                                }
                            }
                        }
                    }
                },
                new AdaptiveColumnSet
                {
                    Columns = new List<AdaptiveColumn>
                    {
                        new AdaptiveColumn
                        {
                            Width = "auto",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = "⏰",
                                    Size = AdaptiveTextSize.Medium
                                }
                            }
                        },
                        new AdaptiveColumn
                        {
                            Width = "stretch",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = $"{startTime:h:mm tt} - {endTime:h:mm tt}",
                                    Wrap = true
                                }
                            }
                        }
                    }
                },
                new AdaptiveColumnSet
                {
                    Columns = new List<AdaptiveColumn>
                    {
                        new AdaptiveColumn
                        {
                            Width = "auto",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = "🏢",
                                    Size = AdaptiveTextSize.Medium
                                }
                            }
                        },
                        new AdaptiveColumn
                        {
                            Width = "stretch",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = $"{room.DisplayName} ({room.Building}, Floor {room.Floor})",
                                    Wrap = true
                                }
                            }
                        }
                    }
                },
                new AdaptiveColumnSet
                {
                    Columns = new List<AdaptiveColumn>
                    {
                        new AdaptiveColumn
                        {
                            Width = "auto",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = "👥",
                                    Size = AdaptiveTextSize.Medium
                                }
                            }
                        },
                        new AdaptiveColumn
                        {
                            Width = "stretch",
                            Items = new List<AdaptiveElement>
                            {
                                new AdaptiveTextBlock
                                {
                                    Text = $"Capacity: {room.Capacity} people",
                                    Wrap = true
                                }
                            }
                        }
                    }
                }
            },
            Actions = new List<AdaptiveAction>
            {
                new AdaptiveOpenUrlAction
                {
                    Title = "View in Calendar",
                    Url = new Uri(booking.WebLink)
                }
            }
        };
        
        // Return the card to be shared in the conversation
        return new MessagingExtensionActionResponse
        {
            ComposeExtension = new MessagingExtensionResult
            {
                Type = "result",
                AttachmentLayout = "list",
                Attachments = new List<MessagingExtensionAttachment>
                {
                    new MessagingExtensionAttachment
                    {
                        ContentType = AdaptiveCard.ContentType,
                        Content = confirmationCard
                    }
                }
            }
        };
    }
    
    // Default case - return to search form
    return await HandleMessagingExtensionFetchTaskAsync(turnContext, action, cancellationToken);
}
```

### Step 4: Register Message Extension Handlers in the Bot

Update your bot implementation to handle messaging extension activities:

```csharp
// MeetingRoomBot.cs

protected override async Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default)
{
    // Process different types of activities
    switch (turnContext.Activity.Type)
    {
        case ActivityTypes.Message:
            await HandleMessageActivityAsync(turnContext, cancellationToken);
            break;
            
        case ActivityTypes.Invoke:
            await HandleInvokeActivityAsync(turnContext, cancellationToken);
            break;
            
        // Handle other activity types...
        
        default:
            await turnContext.SendActivityAsync($"Unhandled activity type: {turnContext.Activity.Type}");
            break;
    }
}

private async Task HandleInvokeActivityAsync(ITurnContext turnContext, CancellationToken cancellationToken)
{
    // Handle different invoke types
    var activity = turnContext.Activity;
    
    // Handle messaging extension query
    if (activity.Name == "composeExtension/query")
    {
        var query = JsonConvert.DeserializeObject<MessagingExtensionQuery>(activity.Value.ToString());
        var response = await _messagingExtensionHandler.HandleMessagingExtensionQueryAsync(turnContext, query, cancellationToken);
        await turnContext.SendActivityAsync(MessageFactory.Text("Handling your query..."), cancellationToken);
        return;
    }
    
    // Handle messaging extension fetch task (action command)
    if (activity.Name == "composeExtension/fetchTask")
    {
        var action = JsonConvert.DeserializeObject<MessagingExtensionAction>(activity.Value.ToString());
        var response = await _messagingExtensionHandler.HandleMessagingExtensionFetchTaskAsync(turnContext, action, cancellationToken);
        await turnContext.SendActivityAsync(MessageFactory.Text("Opening booking form..."), cancellationToken);
        return;
    }
    
    // Handle messaging extension submit action
    if (activity.Name == "composeExtension/submitAction")
    {
        var action = JsonConvert.DeserializeObject<MessagingExtensionAction>(activity.Value.ToString());
        var response = await _messagingExtensionHandler.HandleMessagingExtensionSubmitActionAsync(turnContext, action, cancellationToken);
        
        // Process the response
        if (response.ComposeExtension != null)
        {
            // This is a response to be inserted in the conversation
            // No need to send an activity, Teams will handle displaying the result
        }
        else if (response.Task != null)
        {
            // This is a response that should continue with a task module
            // No need to send an activity, Teams will handle showing the task module
        }
        
        return;
    }
    
    // Handle other invoke types...
}
```

### Step 5: Package and Deploy the Teams App

1. Create a ZIP package with:
   - `manifest.json`
   - `color.png` (192x192 pixel app icon)
   - `outline.png` (32x32 pixel transparent outline icon)

2. Deploy the app in one of these ways:
   - **For testing**: Upload directly to a Teams client
     - Go to Teams > Apps > Manage your apps > Upload a custom app
     - Select the ZIP package and upload

   - **For organization-wide deployment**:
     - Go to the Teams Admin Center
     - Navigate to Teams apps > Manage apps
     - Upload the ZIP package
     - Set appropriate policies to distribute the app

## App Configuration Options

The Messaging Extension provides several configuration options to customize its behavior:

### Customizing Search Parameters

Additional search parameters can be added to the `findRooms` command:

```json
"parameters": [
  {
    "name": "amenities",
    "title": "Required Amenities",
    "description": "Select required room features",
    "inputType": "choiceset",
    "choices": [
      {
        "title": "Projector",
        "value": "projector"
      },
      {
        "title": "Whiteboard",
        "value": "whiteboard"
      },
      {
        "title": "Video Conferencing",
        "value": "video"
      }
    ]
  }
]
```

### Adding Link Unfurling

To enable the bot to unfurl meeting room links, add the following to the `composeExtensions` section:

```json
"messageHandlers": [
  {
    "type": "link",
    "value": {
      "domains": [
        "contoso.com/rooms",
        "rooms.contoso.com"
      ]
    }
  }
]
```

## Testing and Verification

### Testing the Messaging Extension

1. After installing the app, verify messaging extension functionality:
   - Click the "..." button in the compose box
   - Find your app in the menu
   - Test the search function with various criteria
   - Verify results display correctly
   - Complete a booking and check that it appears in the room's calendar

### Common Issues and Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Extension not appearing | App manifest incorrect | Verify bot ID and messaging extension configuration |
| Search returns no results | Query parameters incorrect | Check parameter parsing and validation |
| Room booking fails | Graph API permissions insufficient | Verify app has `Calendars.ReadWrite` permission |
| Task module doesn't open | Handler code error | Check for exceptions in fetch task handler |
| Card not displaying correctly | Adaptive card schema issue | Verify card schema against Teams requirements |

## Security Considerations

### Authentication and Authorization

The messaging extension uses the bot's credentials to access Microsoft Graph API. Ensure:

1. The bot has the minimum required permissions
2. User identities are validated before making booking requests
3. Room booking permissions are enforced (if applicable)

### Data Protection

1. Do not store personal data within the bot state
2. Encrypt any sensitive configuration values
3. Use Azure Key Vault for credential storage

## Best Practices

1. **Responsive Design**: Keep task modules and cards mobile-friendly
2. **Performance**: Optimize Graph API queries to minimize load times
3. **Error Handling**: Provide clear user feedback for all error conditions
4. **Validation**: Validate all user inputs before processing
5. **Localization**: Support multiple languages for global deployments
6. **Accessibility**: Design cards with accessibility in mind

## Integration with Other Bot Features

The Teams Messaging Extension works alongside other bot capabilities:

1. **Conversational Bot**: Users can also interact via direct chat
2. **Proactive Notifications**: Send booking reminders or updates
3. **Adaptive Cards**: Share booking confirmations in channels

## Additional Resources

- [Microsoft Teams Messaging Extensions Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
- [Bot Framework SDK Documentation](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-overview)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Microsoft Graph Room Resources API](https://learn.microsoft.com/en-us/graph/api/resources/place)

## Support and Maintenance

### Version Compatibility

This implementation is compatible with:
- Teams desktop client (Windows and Mac)
- Teams web client
- Teams mobile applications (iOS and Android)
- Microsoft Teams SDK v4.12.0 and above

### Update Process

When updating the messaging extension:
1. Increment the version number in the manifest
2. Update the app package
3. Re-upload through the Teams Admin Center
4. Test thoroughly in a staging environment before production

---

*This documentation is part of the Meeting Room Booking Bot implementation guide. For additional components, refer to the other documents in this directory.*
