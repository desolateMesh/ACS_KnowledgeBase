# Meeting Room Booking Bot - Troubleshooting Guide

## Table of Contents

- [Introduction](#introduction)
- [Deployment Issues](#deployment-issues)
- [Authentication Problems](#authentication-problems)
- [Microsoft Graph API Issues](#microsoft-graph-api-issues)
- [Teams Integration Challenges](#teams-integration-challenges)
- [Room Booking Failures](#room-booking-failures)
- [Adaptive Card Rendering Issues](#adaptive-card-rendering-issues)
- [Performance Considerations](#performance-considerations)
- [Logging and Diagnostics](#logging-and-diagnostics)
- [Common Error Codes](#common-error-codes)
- [Advanced Troubleshooting](#advanced-troubleshooting)

## Introduction

This troubleshooting guide addresses common issues that may arise when deploying, configuring, and using the Meeting Room Booking Bot in Microsoft Teams. It covers problems ranging from initial setup to runtime errors and provides step-by-step resolution procedures.

The Meeting Room Booking Bot is a complex system that integrates several Microsoft technologies:
- Microsoft Teams Platform
- Bot Framework
- Microsoft Graph API
- Azure Services
- Exchange Online

Issues can occur at any of these integration points, so this guide is organized by functional areas to help quickly identify and resolve problems.

## Deployment Issues

### Azure Resource Deployment Failures

#### Symptoms
- Azure ARM template deployment fails
- Resources not created in Azure
- Deployment shows "Failed" status in Azure Portal

#### Possible Causes
1. Insufficient permissions in Azure subscription
2. Resource name conflicts
3. Resource quota limitations
4. Invalid template parameters

#### Resolution Steps

1. **Verify Azure Permissions**:
   ```powershell
   # Check current user role assignments
   Get-AzRoleAssignment -SignInName user@contoso.com
   ```
   Ensure the deploying account has at least "Contributor" role at the subscription or resource group level.

2. **Check for Resource Name Conflicts**:
   ```bash
   # Check if a web app with the same name exists
   az webapp list --query "[?name=='MeetingRoomBookingBot']"
   ```
   If results return, choose a different name for your deployment.

3. **Validate Resource Quotas**:
   ```bash
   az vm list-usage --location eastus --query "[?name.value=='standardF2Family']"
   ```
   Request quota increases if needed through Azure Portal.

4. **Validate Template Parameters**:
   ```bash
   az deployment group validate --resource-group MeetingRoomBookingBot-RG --template-file ./deploy/azuredeploy.json --parameters @./deploy/parameters.json
   ```
   Fix any validation errors before retrying deployment.

### Bot Service Registration Problems

#### Symptoms
- Bot registration appears successful but shows warning states
- Bot cannot be messaged in Teams
- Error: "Bot not found" when attempting to contact the bot

#### Possible Causes
1. Incorrect Application (Client) ID
2. Messaging endpoint not properly configured
3. Bot not properly registered with Microsoft Teams channel
4. Bot Service registration has not fully propagated

#### Resolution Steps

1. **Verify Bot Registration**:
   ```bash
   az bot show --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG
   ```
   Check that the `appId` matches your Azure AD Application ID.

2. **Ensure Messaging Endpoint is Correct**:
   ```bash
   az bot update --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG --endpoint "https://your-app-name.azurewebsites.net/api/messages"
   ```
   The endpoint should point to your deployed bot application's message endpoint.

3. **Verify Teams Channel Registration**:
   ```bash
   az bot msteams show --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG
   ```
   If not configured, add the MS Teams channel:
   ```bash
   az bot msteams create --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG
   ```

4. **Test Bot Registration Health**:
   Use Bot Framework Emulator to test direct connection to your bot, bypassing Teams integration.

### Web App Deployment Issues

#### Symptoms
- Deployment to App Service fails
- Bot service runs but doesn't respond to messages
- HTTP 5xx errors when accessing the bot's endpoint

#### Possible Causes
1. Incorrect build configuration
2. Missing dependencies in deployment package
3. App settings misconfiguration
4. Insufficient App Service plan resources

#### Resolution Steps

1. **Check Build Configuration**:
   Ensure you're building with the right configuration:
   ```bash
   dotnet publish -c Release
   ```

2. **Verify Dependencies**:
   Check `csproj` for proper package references and ensure they're included in the publish output.

3. **Validate App Settings**:
   ```bash
   # Check current app settings
   az webapp config appsettings list --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG
   ```
   Ensure required settings (`MicrosoftAppId`, `MicrosoftAppPassword`, etc.) are correctly configured.

4. **Monitor App Service Performance**:
   Check CPU, memory usage, and request queuing in Azure Portal. Consider scaling up if resources are constrained.

5. **Review Deployment Logs**:
   ```bash
   az webapp log deployment show --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG
   ```
   Address any errors in the deployment process.

## Authentication Problems

### Bot Authentication Failures

#### Symptoms
- Bot returns "Unauthorized" errors
- Messages in Teams show "There was an error sending this message"
- Bot fails when trying to access Microsoft Graph API

#### Possible Causes
1. Invalid or expired client secret
2. Incorrect App ID configuration
3. Missing Azure AD permissions
4. SSL certificate validation issues

#### Resolution Steps

1. **Verify Azure AD App Registration**:
   Check that the Application (client) ID in your configuration matches the registered app in Azure AD.

2. **Check Client Secret Validity**:
   Client secrets have expiration dates. Verify the secret hasn't expired in Azure AD App Registration > Certificates & secrets.
   
   If expired, create a new client secret:
   ```bash
   # Update the bot's secret in Key Vault
   az keyvault secret set --vault-name MeetingRoomBookingBot-KV --name BotFrameworkSecret --value "new-secret-value"
   
   # Update the bot's secret in App Settings (if not using Key Vault)
   az webapp config appsettings set --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG --settings MicrosoftAppPassword="new-secret-value"
   ```

3. **Confirm Azure AD Permissions**:
   - Ensure required Graph API permissions are granted
   - Check that admin consent has been provided for the permissions
   
   ```powershell
   # PowerShell command to grant admin consent
   Connect-AzureAD
   $requiredResourceAccess = Get-AzureADServicePrincipal -Filter "AppId eq '00000003-0000-0000-c000-000000000000'"
   $resourceAccess = New-Object -TypeName Microsoft.Open.AzureAD.Model.RequiredResourceAccess
   $resourceAccess.ResourceAppId = $requiredResourceAccess.AppId
   # Add permissions here
   # Grant consent
   New-AzureADServicePrincipalKeyCredential -ObjectId $servicePrincipalId -CustomKeyIdentifier "ConsentKey" -StartDate $startDate -EndDate $endDate -Type Symmetric -Value $keyValue
   ```

4. **Test Authentication Flow**:
   Create a simple test endpoint in your bot to validate authentication:
   
   ```csharp
   [Route("api/test-auth")]
   public async Task<IActionResult> TestAuth()
   {
       try
       {
           var token = await _graphClientService.GetTokenAsync();
           return Ok(new { Status = "Authenticated", TokenInfo = new { ExpiresOn = token.ExpiresOn } });
       }
       catch (Exception ex)
       {
           return BadRequest(new { Error = ex.Message, StackTrace = ex.StackTrace });
       }
   }
   ```

### Microsoft Graph Authentication Issues

#### Symptoms
- Bot authenticates with Teams but fails when attempting to access Graph API
- Error messages related to insufficient permissions
- "Access denied" or "Forbidden" responses from Graph API calls

#### Possible Causes
1. Missing Graph API permissions
2. Admin consent not granted
3. Invalid Graph API scopes
4. Token acquisition failure

#### Resolution Steps

1. **Verify Graph API Permissions**:
   Required permissions for the Meeting Room Booking Bot:
   - `Calendars.ReadWrite`
   - `Calendars.ReadWrite.Shared`
   - `Place.Read.All`
   - `User.Read`
   - `User.ReadBasic.All`

   Check permissions in Azure AD > App registrations > [Your App] > API permissions.

2. **Grant Admin Consent**:
   In Azure AD > App registrations > [Your App] > API permissions, click the "Grant admin consent for [tenant]" button.

3. **Validate Token Request**:
   Examine the exact scopes requested in the authentication flow:
   
   ```csharp
   // Correct scopes example
   string[] scopes = new string[] { "https://graph.microsoft.com/.default" };
   ```
   
   When using client credentials flow, always use the `.default` scope.

4. **Test Graph API Access**:
   Create a diagnostic endpoint or use the Graph Explorer to test API access:
   
   ```csharp
   [Route("api/test-graph")]
   public async Task<IActionResult> TestGraph()
   {
       try
       {
           var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
           var places = await graphClient.Places
               .Request()
               .Filter("resourceType eq 'room'")
               .GetAsync();
           
           return Ok(new { PlacesCount = places.Count });
       }
       catch (Exception ex)
       {
           return BadRequest(new { Error = ex.Message, StackTrace = ex.StackTrace });
       }
   }
   ```

## Microsoft Graph API Issues

### Room Data Retrieval Problems

#### Symptoms
- Bot can't find any meeting rooms
- Room capacity or details are incorrect
- Rooms appear in the bot but without complete information

#### Possible Causes
1. Room resources not properly configured in Exchange
2. Missing place metadata
3. Incorrect Graph API query filters
4. Exchange permission issues

#### Resolution Steps

1. **Verify Room Resources in Exchange**:
   Use Exchange PowerShell to check room configuration:
   
   ```powershell
   # Connect to Exchange Online
   Connect-ExchangeOnline
   
   # List all room resources
   Get-Mailbox -RecipientTypeDetails RoomMailbox | Format-Table Name, DisplayName, PrimarySmtpAddress
   
   # Check room details
   Get-Place -Identity "room@contoso.com" | Format-List
   ```

2. **Check Room Mailbox Configuration**:
   ```powershell
   Get-CalendarProcessing -Identity "room@contoso.com" | Format-List
   ```
   
   Ensure `AutomateProcessing` is set to `AutoAccept`.

3. **Update Room Metadata**:
   Room capacity and other attributes should be properly set:
   
   ```powershell
   Set-Place -Identity "room@contoso.com" -Capacity 10 -Building "Building A" -Floor 3 -AudioDeviceName "Polycom" -VideoDeviceName "Surface Hub" -DisplayDeviceName "Projector"
   ```

4. **Test Graph API Room Queries**:
   Try different filters to ensure rooms are being returned:
   
   ```csharp
   // Try broader filters first
   var places = await graphClient.Places
       .Request()
       .GetAsync();
   
   // Then narrow down
   var rooms = await graphClient.Places
       .Request()
       .Filter("resourceType eq 'room'")
       .GetAsync();
   ```

### Calendar Availability Issues

#### Symptoms
- Rooms show as available when they're actually booked
- Conflicting bookings occur
- Calendar events created by the bot don't appear in room calendars

#### Possible Causes
1. Caching issues with availability data
2. Time zone mismatches
3. Permission issues for room calendars
4. AutoAccept processor delays

#### Resolution Steps

1. **Verify Room Schedule Access**:
   Test room calendar access directly:
   
   ```csharp
   var scheduleItems = await graphClient.Users[roomEmail]
       .Calendar
       .GetSchedule(new List<String>() { roomEmail },
           startTime,
           endTime,
           60)
       .Request()
       .PostAsync();
   ```

2. **Check Time Zone Handling**:
   Ensure consistent time zone usage between user requests and Graph API calls:
   
   ```csharp
   // Always specify time zones in Graph API requests
   var startTime = new DateTimeTimeZone
   {
       DateTime = start.ToString("o"),
       TimeZone = "Pacific Standard Time"
   };
   
   var endTime = new DateTimeTimeZone
   {
       DateTime = end.ToString("o"),
       TimeZone = "Pacific Standard Time"
   };
   ```

3. **Add Delay After Booking**:
   Room resource processing can take time; add validation after booking:
   
   ```csharp
   // Add a short delay to allow Exchange to process
   await Task.Delay(TimeSpan.FromSeconds(2));
   
   // Verify booking success
   var events = await graphClient.Users[roomEmail]
       .Calendar
       .Events
       .Request()
       .Filter($"start/dateTime ge '{startDateTime.ToString("o")}' and end/dateTime le '{endDateTime.ToString("o")}'")
       .GetAsync();
   ```

4. **Implement Conflict Resolution**:
   Add additional availability checks right before booking:
   
   ```csharp
   // Final availability check before booking
   var scheduleItems = await GetRoomScheduleAsync(graphClient, roomEmail, startTime, endTime);
   if (scheduleItems.Any(s => s.Status == "Busy"))
   {
       throw new BookingConflictException("Room has been booked by another user.");
   }
   ```

### Event Creation Failures

#### Symptoms
- Bot reports successful booking but no event appears in calendar
- Events created with incorrect details
- Events created but room not reserved

#### Possible Causes
1. Insufficient permissions for event creation
2. Malformed event data
3. Room mailbox processing rules blocking automated bookings
4. Resource constraints (e.g., overlapping bookings)

#### Resolution Steps

1. **Verify Event Creation Permissions**:
   Ensure the bot has `Calendars.ReadWrite` permission and proper tenant-wide permissions.

2. **Validate Event Format**:
   Check event creation payload:
   
   ```csharp
   var newEvent = new Event
   {
       Subject = meetingTitle,
       Body = new ItemBody
       {
           ContentType = BodyType.Text,
           Content = meetingDetails
       },
       Start = new DateTimeTimeZone
       {
           DateTime = startDateTime.ToString("o"),
           TimeZone = "Pacific Standard Time"
       },
       End = new DateTimeTimeZone
       {
           DateTime = endDateTime.ToString("o"),
           TimeZone = "Pacific Standard Time"
       },
       Location = new Location
       {
           DisplayName = roomDisplayName,
           LocationUri = roomEmail,
           LocationType = LocationType.ConferenceRoom
       },
       Attendees = new List<Attendee>()
       {
           new Attendee
           {
               EmailAddress = new EmailAddress
               {
                   Address = roomEmail,
                   Name = roomDisplayName
               },
               Type = AttendeeType.Resource
           }
       }
   };
   ```

3. **Check Room AutoAccept Settings**:
   ```powershell
   Get-CalendarProcessing -Identity "room@contoso.com" | Format-List AutomateProcessing, BookingWindowInDays, ProcessExternalMeetingMessages
   ```
   
   Ensure settings align with your organization's requirements.

4. **Implement Detailed Error Handling**:
   Add specific error detection for common booking issues:
   
   ```csharp
   try
   {
       var createdEvent = await graphClient.Me.Events
           .Request()
           .AddAsync(newEvent);
       return createdEvent;
   }
   catch (ServiceException ex)
   {
       if (ex.StatusCode == HttpStatusCode.BadRequest && ex.Error.Message.Contains("Conflict"))
       {
           throw new BookingConflictException("Room is already booked for the requested time.");
       }
       else if (ex.StatusCode == HttpStatusCode.Forbidden)
       {
           throw new PermissionException("Insufficient permissions to book this room.");
       }
       throw;
   }
   ```

## Teams Integration Challenges

### Bot Installation Issues

#### Symptoms
- Bot cannot be added to Teams
- Error during app installation
- Bot appears in Teams but cannot be messaged

#### Possible Causes
1. Invalid Teams app manifest
2. Missing bot registration
3. Teams app policies blocking installation
4. Bot framework endpoint unreachable

#### Resolution Steps

1. **Validate Teams App Manifest**:
   Check your `manifest.json` for:
   - Valid GUID for `id`
   - Matching `botId` with your Azure AD App ID
   - Properly formatted properties (especially URLs)
   - Valid icon files (PNG format, correct dimensions)

   Use the App Studio in Teams to validate your manifest.

2. **Verify Bot Framework Integration**:
   Ensure the bot is registered with MS Teams channel:
   
   ```bash
   az bot msteams show --name MeetingRoomBookingBot --resource-group MeetingRoomBookingBot-RG
   ```

3. **Check Teams App Policies**:
   Contact your Teams administrator to verify:
   - App setup policies allow custom app installation
   - Bot messaging is not restricted by policy
   - The specific bot application is not blocked

4. **Test Bot Framework Connectivity**:
   Verify the bot endpoint is reachable:
   
   ```bash
   # Test endpoint connectivity
   curl -I https://your-bot-url.azurewebsites.net/api/messages
   ```
   
   Expected response: HTTP 200 or 405 (Method Not Allowed for GET requests)

### Messaging Extension Problems

#### Symptoms
- Messaging extension doesn't appear in Teams compose box
- Extension appears but returns errors when used
- Search functionality doesn't return results

#### Possible Causes
1. Incorrect messaging extension configuration in manifest
2. Missing handler for messaging extension in bot code
3. Search command errors
4. Authentication issues specific to messaging extensions

#### Resolution Steps

1. **Verify Manifest Configuration**:
   Check your `manifest.json` for proper messaging extension configuration:
   
   ```json
   "composeExtensions": [
     {
       "botId": "00000000-0000-0000-0000-000000000000",
       "canUpdateConfiguration": true,
       "commands": [
         {
           "id": "searchRooms",
           "type": "query",
           "title": "Search Rooms",
           "description": "Search for available meeting rooms",
           "initialRun": false,
           "parameters": [
             {
               "name": "searchQuery",
               "title": "Search Query",
               "description": "Room search criteria",
               "inputType": "text"
             }
           ]
         }
       ]
     }
   ]
   ```

2. **Implement Messaging Extension Handler**:
   Ensure your bot has a handler for messaging extensions:
   
   ```csharp
   protected override async Task<MessagingExtensionResponse> OnTeamsMessagingExtensionQueryAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionQuery query, CancellationToken cancellationToken)
   {
       try
       {
           var searchQuery = query.Parameters[0].Value as string;
           var rooms = await _roomBookingService.SearchRoomsAsync(searchQuery);
           
           // Build messaging extension response
           var attachments = new List<MessagingExtensionAttachment>();
           foreach (var room in rooms)
           {
               attachments.Add(new MessagingExtensionAttachment
               {
                   Content = CreateRoomCard(room),
                   ContentType = AdaptiveCard.ContentType,
                   Preview = CreateRoomPreviewCard(room)
               });
           }
           
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
       catch (Exception ex)
       {
           return new MessagingExtensionResponse
           {
               ComposeExtension = new MessagingExtensionResult
               {
                   Type = "message",
                   Text = $"Error searching for rooms: {ex.Message}"
               }
           };
       }
   }
   ```

3. **Add Debug Logging for Messaging Extensions**:
   ```csharp
   protected override async Task<MessagingExtensionResponse> OnTeamsMessagingExtensionQueryAsync(ITurnContext<IInvokeActivity> turnContext, MessagingExtensionQuery query, CancellationToken cancellationToken)
   {
       try
       {
           _logger.LogInformation("Messaging extension query received: {QueryText}", 
               query.Parameters?[0].Value);
           
           // Existing code...
       }
       catch (Exception ex)
       {
           _logger.LogError(ex, "Messaging extension error");
           // Error handling...
       }
   }
   ```

4. **Test Messaging Extension Independently**:
   Create a diagnostic command in your messaging extension to validate functionality:
   
   ```json
   {
     "id": "testExtension",
     "type": "query",
     "title": "Test Extension",
     "description": "Tests the messaging extension functionality"
   }
   ```
   
   Implement a simple handler that returns a static response to validate the integration.

### Adaptive Card Rendering Issues

#### Symptoms
- Cards appear blank or with missing elements in Teams
- Interactive elements don't work
- Card layout appears broken
- Cards don't update when expected

#### Possible Causes
1. Incorrect adaptive card schema
2. Unsupported adaptive card elements
3. Card payload too large
4. Action handling issues

#### Resolution Steps

1. **Validate Adaptive Card Schema**:
   Use the [Adaptive Card Designer](https://adaptivecards.io/designer/) to validate your cards.
   
   Ensure your card uses a supported schema version:
   ```json
   {
     "type": "AdaptiveCard",
     "version": "1.3",
     "body": [
       // Card elements
     ]
   }
   ```

2. **Check for Unsupported Elements**:
   Teams has specific limitations on adaptive card elements. Verify all elements are supported by Teams.
   
   Common issues:
   - Rich text formatting limitations
   - Input validation restrictions
   - Action button limitations

3. **Optimize Card Size**:
   Large cards may be truncated. Keep payload under 28KB:
   
   ```csharp
   // Verify card size before sending
   var cardJson = JsonConvert.SerializeObject(card);
   var cardSize = Encoding.UTF8.GetByteCount(cardJson);
   if (cardSize > 28 * 1024)
   {
       _logger.LogWarning("Card size ({Size}KB) exceeds recommended limit of 28KB", cardSize / 1024);
       // Simplify card...
   }
   ```

4. **Debug Action Handling**:
   Add logging to action handlers:
   
   ```csharp
   protected override async Task<InvokeResponse> OnTeamsAdaptiveCardSubmitActionAsync(
       ITurnContext<IInvokeActivity> turnContext, 
       AdaptiveCardInvokeValue adaptiveCardInvokeValue, 
       CancellationToken cancellationToken)
   {
       _logger.LogInformation("Card action received: {ActionData}", 
           JsonConvert.SerializeObject(adaptiveCardInvokeValue.Action));
       
       try
       {
           // Process action...
           return InvokeResponse.OK();
       }
       catch (Exception ex)
       {
           _logger.LogError(ex, "Error processing card action");
           return InvokeResponse.ApplicationError(ex.Message);
       }
   }
   ```

5. **Implement Card Updates Correctly**:
   For updating cards after action submission:
   
   ```csharp
   // Store activity ID for updates
   var activityId = turnContext.Activity.Id;
   var conversationId = turnContext.Activity.Conversation.Id;
   
   // Update card
   var updatedCard = new Attachment
   {
       ContentType = AdaptiveCard.ContentType,
       Content = updatedCardJson
   };
   
   await turnContext.UpdateActivityAsync(
       new Activity
       {
           Id = activityId,
           Type = ActivityTypes.Message,
           Conversation = new ConversationAccount { Id = conversationId },
           Attachments = new List<Attachment> { updatedCard }
       },
       cancellationToken);
   ```

## Room Booking Failures

### Booking Conflict Issues

#### Symptoms
- Users receive "Room unavailable" errors for seemingly available rooms
- Double-bookings occur
- Bookings succeed but are later canceled

#### Possible Causes
1. Race conditions in booking process
2. Stale availability data
3. Exchange calendar processing delays
4. Room policy restrictions

#### Resolution Steps

1. **Implement Pre-Booking Availability Check**:
   Add a final availability check immediately before booking:
   
   ```csharp
   public async Task<Event> BookRoomAsync(string roomEmail, DateTime startTime, DateTime endTime, string subject)
   {
       // Get fresh availability data right before booking
       var availability = await CheckRoomAvailabilityAsync(roomEmail, startTime, endTime);
       if (!availability.IsAvailable)
       {
           throw new BookingConflictException($"Room {roomEmail} is no longer available for the requested time.");
       }
       
       // Proceed with booking
       var newEvent = new Event { /* event details */ };
       return await _graphClient.Me.Events.Request().AddAsync(newEvent);
   }
   ```

2. **Implement Optimistic Concurrency**:
   Use ETag-based concurrency to detect conflicts:
   
   ```csharp
   // Get calendar first to get ETag
   var calendar = await _graphClient.Users[roomEmail].Calendar.Request().GetAsync();
   string etagValue = calendar.ETag;
   
   // Use ETag in booking request header
   var requestOptions = new List<Option>
   {
       new HeaderOption("If-Match", etagValue)
   };
   
   try
   {
       var createdEvent = await _graphClient.Me.Events.Request(requestOptions).AddAsync(newEvent);
       return createdEvent;
   }
   catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.PreconditionFailed)
   {
       throw new BookingConflictException("Calendar was modified by another process. Please retry your booking.");
   }
   ```

3. **Check Room Booking Policies**:
   Verify room booking policies in Exchange:
   
   ```powershell
   Get-CalendarProcessing -Identity "room@contoso.com" | Format-Table AutomateProcessing, BookingWindowInDays, AllowConflicts, MaximumDurationInMinutes
   ```
   
   Common policy issues:
   - `BookingWindowInDays` too restrictive
   - `MaximumDurationInMinutes` limit exceeded
   - Special processing rules for specific time periods

4. **Implement Booking Confirmation Check**:
   After booking, verify the event was actually created:
   
   ```csharp
   public async Task<bool> VerifyBookingSucceededAsync(string roomEmail, string eventId, TimeSpan timeout)
   {
       var deadline = DateTime.UtcNow.Add(timeout);
       while (DateTime.UtcNow < deadline)
       {
           try
           {
               var @event = await _graphClient.Users[roomEmail].Events[eventId].Request().GetAsync();
               if (@event.Status == "confirmed")
               {
                   return true;
               }
           }
           catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
           {
               // Event not found yet, may still be processing
           }
           
           await Task.Delay(TimeSpan.FromSeconds(1));
       }
       
       return false;
   }
   ```

### Room Filtering and Search Issues

#### Symptoms
- No rooms returned in search results
- Incorrect rooms shown based on capacity/equipment requirements
- Rooms missing amenity information

#### Possible Causes
1. Incomplete room metadata in Exchange
2. Incorrect filter parameters
3. Locality/building filters not applied correctly
4. Insufficient room properties returned in queries

#### Resolution Steps

1. **Verify Room Metadata**:
   Check if rooms have the necessary metadata:
   
   ```powershell
   # Check room place information
   Get-Place -Identity "room@contoso.com" | Format-List
   ```
   
   Required metadata for filtering:
   - `Capacity`
   - `Building`
   - `Floor`
   - Equipment properties (if used for filtering)

2. **Improve Room Queries**:
   Enhance Graph API queries to include all relevant properties:
   
   ```csharp
   var places = await _graphClient.Places
       .Request()
       .Select("id,displayName,address,geoCoordinates,phone,capacity,building,floorNumber,floorLabel,audioDeviceName,videoDeviceName,displayDeviceName")
       .Filter("resourceType eq 'room'")
       .GetAsync();
   ```

3. **Add Custom Metadata Support**:
   For organization-specific room attributes, use Exchange extended properties:
   
   ```csharp
   // Define custom property for room amenities
   var amenitiesProperty = new SingleValueLegacyExtendedProperty
   {
       Id = "String {00020329-0000-0000-C000-000000000046} Name RoomAmenities",
       Value = "Whiteboard,Projector,VideoConference"
   };
   
   // Create a room with custom property
   var newRoom = new Place
   {
       DisplayName = "Conference Room A",
       Capacity = 10,
       Building = "Building A",
       // Other properties...
       AdditionalData = new Dictionary<string, object>()
       {
           {"singleValueExtendedProperties", new List<SingleValueLegacyExtendedProperty>() { amenitiesProperty }}
       }
   };
   ```

4. **Implement Client-Side Filtering**:
   Supplement Graph API filters with additional client-side filtering for more complex requirements:
   
   ```csharp
   // Get all rooms first
   var allRooms = await _graphClient.Places
       .Request()
       .Filter("resourceType eq 'room'")
       .GetAsync();
   
   // Perform advanced filtering on client side
   var filteredRooms = allRooms.CurrentPage
       .Where(r => r.Building == buildingFilter)
       .Where(r => r.Capacity >= minCapacity && r.Capacity <= maxCapacity)
       .Where(r => string.IsNullOrEmpty(equipmentFilter) || 
                  (r.AudioDeviceName?.Contains(equipmentFilter, StringComparison.OrdinalIgnoreCase) == true) ||
                  (r.VideoDeviceName?.Contains(equipmentFilter, StringComparison.OrdinalIgnoreCase) == true))
       .ToList();
   ```

## Performance Considerations

### Bot Response Latency

#### Symptoms
- Bot takes too long to respond to messages
- Timeouts during room searches
- Search operations time out in Teams

#### Possible Causes
1. Inefficient Graph API queries
2. Too many sequential API calls
3. Insufficient App Service resources
4. Missing caching for repetitive queries

#### Resolution Steps

1. **Optimize Graph API Queries**:
   Use `$select` and `$filter` to reduce data transfer:
   
   ```csharp
   // More efficient query with specific fields
   var rooms = await _graphClient.Places
       .Request()
       .Select("id,displayName,capacity,building")
       .Filter("resourceType eq 'room' and capacity ge 4")
       .GetAsync();
   ```

2. **Implement Parallel Processing**:
   Execute independent operations in parallel:
   
   ```csharp
   // Get room information in parallel
   var roomTasks = roomEmails.Select(email => 
       _graphClient.Users[email].Request().Select("displayName,mail").GetAsync());
   
   var rooms = await Task.WhenAll(roomTasks);
   ```

3. **Add Caching for Common Queries**:
   Cache room data to reduce repeated Graph API calls:
   
   ```csharp
   private readonly MemoryCache _cache = new MemoryCache(new MemoryCacheOptions());
   
   public async Task<List<Room>> GetAllRoomsAsync()
   {
       string cacheKey = "AllRooms";
       if (_cache.TryGetValue(cacheKey, out List<Room> cachedRooms))
       {
           return cachedRooms;
       }
       
       // Query rooms from Graph API
       var places = await _graphClient.Places
           .Request()
           .Filter("resourceType eq 'room'")
           .GetAsync();
       
       var rooms = places.CurrentPage.Select(MapPlaceToRoom).ToList();
       
       // Cache result for 15 minutes
       _cache.Set(cacheKey, rooms, TimeSpan.FromMinutes(15));
       
       return rooms;
   }
   ```

4. **Implement Smarter Paging**:
   For large room lists, use paging to improve response times:
   
   ```csharp
   public async Task<List<Room>> SearchRoomsPagedAsync(string filter, int pageSize, string nextPageToken = null)
   {
       var query = _graphClient.Places
           .Request()
           .Filter($"resourceType eq 'room' and {filter}")
           .Top(pageSize);
       
       if (!string.IsNullOrEmpty(nextPageToken))
       {
           query = query.Skip(nextPageToken);
       }
       
       var results = await query.GetAsync();
       
       return new PagedResult<Room>
       {
           Items = results.CurrentPage.Select(MapPlaceToRoom).ToList(),
           NextPageToken = results.NextPageRequest?.QueryOptions
               .FirstOrDefault(o => o.Name == "$skip")?.Value
       };
   }
   ```

5. **Scale App Service Plan**:
   Increase resources allocated to the bot:
   
   ```bash
   # Scale up to a higher tier
   az appservice plan update --name MeetingRoomBookingBot-ASP --resource-group MeetingRoomBookingBot-RG --sku P1V2
   
   # Scale out to multiple instances
   az appservice plan update --name MeetingRoomBookingBot-ASP --resource-group MeetingRoomBookingBot-RG --number-of-workers 3
   ```

### Memory and Resource Usage

#### Symptoms
- Bot application crashes with out-of-memory errors
- Performance degrades over time
- High CPU usage during operations

#### Possible Causes
1. Memory leaks in long-running processes
2. Large data sets held in memory
3. Inefficient resource management
4. Repeated initialization of expensive objects

#### Resolution Steps

1. **Implement Memory Management**:
   Limit in-memory data size:
   
   ```csharp
   // Limit collection sizes
   const int MaxCacheItems = 100;
   
   // Trim cache when it grows too large
   if (_roomCache.Count > MaxCacheItems)
   {
       var keysToRemove = _roomCache.Keys
           .OrderBy(k => _roomCache[k].LastAccessed)
           .Take(_roomCache.Count - MaxCacheItems)
           .ToList();
       
       foreach (var key in keysToRemove)
       {
           _roomCache.Remove(key);
       }
   }
   ```

2. **Use Proper Disposal Patterns**:
   Ensure IDisposable resources are properly managed:
   
   ```csharp
   // Use using statements for disposable resources
   using (var httpClient = new HttpClient())
   {
       var response = await httpClient.GetAsync(url);
       // Process response
   }
   
   // For factory-created clients, register for DI with proper lifetime
   services.AddHttpClient("GraphClient", client =>
   {
       client.BaseAddress = new Uri("https://graph.microsoft.com/v1.0/");
   }).SetHandlerLifetime(TimeSpan.FromMinutes(5));
   ```

3. **Implement Singleton Services**:
   Use singleton pattern for expensive resources:
   
   ```csharp
   // In Startup.cs
   services.AddSingleton<IGraphClientFactory, GraphClientFactory>();
   services.AddSingleton<IRoomCacheService, RoomCacheService>();
   services.AddTransient<IRoomBookingService, RoomBookingService>();
   ```

4. **Monitor Memory Usage**:
   Add memory monitoring to detect issues:
   
   ```csharp
   private void LogMemoryUsage(string operationName)
   {
       var process = Process.GetCurrentProcess();
       _logger.LogInformation(
           "Memory usage after {Operation}: {WorkingSet}MB",
           operationName,
           process.WorkingSet64 / (1024 * 1024));
   }
   ```

## Logging and Diagnostics

### Effective Logging Strategies

#### Key Areas to Log
1. User interactions with the bot
2. Graph API calls (requests and responses)
3. Room booking operations
4. Authentication attempts
5. Error conditions and exceptions

#### Implementation

1. **Configure Structured Logging**:
   Add comprehensive logging to `Program.cs`:
   
   ```csharp
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
               
               // Add Application Insights if key is available
               var appInsightsKey = hostingContext.Configuration["ApplicationInsights:InstrumentationKey"];
               if (!string.IsNullOrEmpty(appInsightsKey))
               {
                   logging.AddApplicationInsights(appInsightsKey);
               }
               
               logging.AddFilter<ApplicationInsightsLoggerProvider>("", LogLevel.Information);
               logging.AddFilter<ApplicationInsightsLoggerProvider>("Microsoft", LogLevel.Warning);
           });
   ```

2. **Add Bot Activity Logging**:
   Create a logging middleware:
   
   ```csharp
   public class BotLoggingMiddleware : IMiddleware
   {
       private readonly ILogger<BotLoggingMiddleware> _logger;
       
       public BotLoggingMiddleware(ILogger<BotLoggingMiddleware> logger)
       {
           _logger = logger;
       }
       
       public async Task OnTurnAsync(ITurnContext context, NextDelegate next, CancellationToken cancellationToken = default)
       {
           // Log incoming activity
           _logger.LogInformation(
               "Bot received activity: Type={ActivityType}, Text={Text}, From={From}, Conversation={Conversation}",
               context.Activity.Type,
               context.Activity.Text?.Substring(0, Math.Min(50, context.Activity.Text?.Length ?? 0)) ?? "",
               context.Activity.From.Id,
               context.Activity.Conversation.Id);
           
           // Process the activity
           await next(cancellationToken);
           
           // Log outgoing activities
           var responseActivities = context.Activity?.GetConversationReference()?.GetContinuationActivities();
           if (responseActivities != null)
           {
               foreach (var activity in responseActivities)
               {
                   _logger.LogInformation(
                       "Bot sent activity: Type={ActivityType}, Id={Id}",
                       activity.Type,
                       activity.Id);
               }
           }
       }
   }
   ```

3. **Log Graph API Operations**:
   Add logging to Graph API client:
   
   ```csharp
   public async Task<List<Room>> GetAvailableRoomsAsync(DateTime startTime, DateTime endTime, int capacity = 0)
   {
       _logger.LogInformation(
           "Getting available rooms: StartTime={StartTime}, EndTime={EndTime}, Capacity={Capacity}",
           startTime, endTime, capacity);
       
       try
       {
           var graphClient = await _graphClientFactory.GetAuthenticatedClientAsync();
           
           _logger.LogDebug("Querying Graph API for places");
           var places = await graphClient.Places
               .Request()
               .Filter("resourceType eq 'room'")
               .GetAsync();
           
           _logger.LogInformation("Retrieved {Count} places from Graph API", places.Count);
           
           // Process results...
           
           return availableRooms;
       }
       catch (Exception ex)
       {
           _logger.LogError(ex, "Error getting available rooms");
           throw;
       }
   }
   ```

4. **Error Telemetry**:
   Add detailed error reporting:
   
   ```csharp
   try
   {
       // Operation that might fail
   }
   catch (ServiceException ex) when (ex is GraphServiceException graphEx)
   {
       _logger.LogError(ex, 
           "Graph API error: Code={ErrorCode}, Message={ErrorMessage}, RequestId={RequestId}",
           graphEx.Error.Code,
           graphEx.Error.Message,
           graphEx.ResponseHeaders.GetValues("request-id").FirstOrDefault());
       
       // Handle specific error conditions
       if (graphEx.StatusCode == HttpStatusCode.TooManyRequests)
       {
           // Implement retry with backoff
       }
       
       throw;
   }
   catch (Exception ex)
   {
       _logger.LogError(ex, "Unexpected error during room booking");
       throw;
   }
   ```

### Diagnostic Endpoints

Add diagnostic endpoints for troubleshooting:

```csharp
[ApiController]
[Route("api/diagnostics")]
public class DiagnosticsController : ControllerBase
{
    private readonly IGraphClientService _graphClient;
    private readonly IRoomBookingService _roomService;
    private readonly ILogger<DiagnosticsController> _logger;
    
    public DiagnosticsController(
        IGraphClientService graphClient, 
        IRoomBookingService roomService,
        ILogger<DiagnosticsController> logger)
    {
        _graphClient = graphClient;
        _roomService = roomService;
        _logger = logger;
    }
    
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new 
        { 
            Status = "Healthy", 
            Timestamp = DateTime.UtcNow 
        });
    }
    
    [HttpGet("graph-connection")]
    public async Task<IActionResult> TestGraphConnection()
    {
        try
        {
            var client = await _graphClient.GetAuthenticatedClientAsync();
            var me = await client.Me.Request().GetAsync();
            
            return Ok(new 
            { 
                Status = "Connected",
                User = me.DisplayName,
                Email = me.Mail
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Graph connection test failed");
            return BadRequest(new { Error = ex.Message });
        }
    }
    
    [HttpGet("rooms")]
    public async Task<IActionResult> GetRooms()
    {
        try
        {
            var rooms = await _roomService.GetAllRoomsAsync();
            return Ok(new { Count = rooms.Count, Rooms = rooms });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Room retrieval failed");
            return BadRequest(new { Error = ex.Message });
        }
    }
}
```

## Common Error Codes

### Microsoft Graph API Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `ErrorItemNotFound` | Requested resource doesn't exist | Verify room email addresses, check for typos |
| `ErrorAccessDenied` | Insufficient permissions | Check Graph API permission grants, ensure admin consent |
| `ErrorCalendarUserNotFound` | Calendar user not found | Verify room resource exists in Exchange |
| `ErrorCalendarWriteAccessDenied` | Cannot write to calendar | Check room booking permissions, verify AutoAccept settings |
| `ErrorDuplicateSOAPHeader` | Authentication issue | Refresh auth token, check for token expiration |
| `ErrorInternalServerTransientError` | Temporary Graph API error | Implement retry logic with exponential backoff |
| `ErrorIrresolvableConflict` | Booking conflict | Check for overlapping meetings, refresh availability data |
| `ErrorInvalidRequest` | Malformed request | Validate request format, check property types and required fields |
| `ErrorServerBusy` | Service throttling | Implement retry logic, reduce request frequency |
| `ErrorTimeoutExpired` | Request timed out | Check network connectivity, simplify request, consider batching |

### Bot Framework Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `MissingRegistration` | Bot registration issue | Verify Bot Framework registration, check App ID/Password |
| `ServiceFailure` | Bot service error | Check Azure Bot Service status, review service logs |
| `MessageSizeTooBig` | Message exceeds size limit | Reduce adaptive card complexity, split into multiple messages |
| `BadArgument` | Invalid parameter | Check parameter formats in bot requests, validate inputs |
| `NotFound` | Resource not found | Verify endpoint URLs, check conversation references |
| `Unauthorized` | Authentication failed | Verify bot credentials, check token validity |
| `MethodNotAllowed` | Invalid HTTP method | Ensure correct HTTP methods for endpoints |
| `UnsupportedMediaType` | Unsupported content type | Check content types in requests |
| `PreconditionFailed` | Concurrency issue | Implement optimistic concurrency with eTags |
| `TooManyRequests` | Rate limiting | Implement throttling strategy, add retry with backoff |

### Teams-Specific Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `BadRequest` | Invalid Teams request | Check Teams manifest format, validate messaging extension parameters |
| `Operation_NotImplemented` | Unsupported operation | Verify Teams client version supports feature |
| `InvalidAuthenticationToken` | Token validation failed | Check SSO configuration, refresh token |
| `ResourceNotFound` | Teams resource not found | Verify Teams app installation, check tenant ID |
| `PayloadSizeExceeded` | Message too large | Reduce adaptive card size, simplify card layout |
| `ActivitySizeExceeded` | Activity exceeds size limit | Reduce activity payload size, simplify message |
| `CardsMaximumAttempts` | Too many card updates | Limit card updates, consolidate changes |
| `MissingProperty` | Required property missing | Check for all required properties in manifest and cards |
| `ErrorContentTypeNotSupported` | Unsupported content type | Use only supported content types in Teams |
| `NotPermittedByApp` | App policy restriction | Check Teams app policies, ensure app is approved |

## Advanced Troubleshooting

### Fiddler/Network Trace Analysis

For intercepting and analyzing HTTP traffic:

1. **Set Up Fiddler for HTTPS Decryption**:
   - Install [Fiddler](https://www.telerik.com/fiddler)
   - Enable HTTPS decryption: Tools > Options > HTTPS > Decrypt HTTPS traffic
   - Export Fiddler's root certificate and install it in the Trusted Root store

2. **Configure Application to Use Proxy**:
   ```csharp
   // In development environment only
   services.AddHttpClient("GraphClient", client =>
   {
       client.BaseAddress = new Uri("https://graph.microsoft.com/v1.0/");
   }).ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
   {
       Proxy = new WebProxy("http://127.0.0.1:8888"),
       UseProxy = true
   });
   ```

3. **Filter Traces**:
   - Use Fiddler's filters to focus on specific hosts: `host eq graph.microsoft.com`
   - Save sessions for offline analysis

4. **Analyze Common Issues**:
   - 401 Unauthorized: Check authorization headers and tokens
   - 403 Forbidden: Check permissions and consent
   - 429 Too Many Requests: Implement throttling strategies
   - Slow response times: Check network latency and service performance

### Application Insights Query Examples

Use these Kusto Query Language (KQL) examples in Application Insights:

1. **Error Tracking**:
   ```kusto
   exceptions
   | where timestamp > ago(24h)
   | where cloud_RoleName == "MeetingRoomBookingBot"
   | order by timestamp desc
   | project timestamp, operation_Id, operation_Name, message, details
   ```

2. **Performance Analysis**:
   ```kusto
   requests
   | where timestamp > ago(24h)
   | where cloud_RoleName == "MeetingRoomBookingBot"
   | summarize count(), avg(duration), percentile(duration, 95) by name
   | order by avg_duration desc
   ```

3. **Graph API Dependency Tracking**:
   ```kusto
   dependencies
   | where timestamp > ago(24h)
   | where cloud_RoleName == "MeetingRoomBookingBot"
   | where target == "graph.microsoft.com"
   | summarize count(), avg(duration), percentile(duration, 95) by name
   | order by avg_duration desc
   ```

4. **User Activity Analysis**:
   ```kusto
   customEvents
   | where timestamp > ago(7d)
   | where name == "BotMessageReceived"
   | summarize count() by bin(timestamp, 1h), tostring(customDimensions.userId)
   | render timechart
   ```

5. **Failed Room Bookings**:
   ```kusto
   exceptions
   | where timestamp > ago(7d)
   | where cloud_RoleName == "MeetingRoomBookingBot"
   | where operation_Name == "BookRoom"
   | summarize count() by bin(timestamp, 1d), type
   | render barchart
   ```

### Graph Explorer Debugging

Use [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer) for interactive troubleshooting:

1. **Test Place Resource Queries**:
   ```
   GET https://graph.microsoft.com/v1.0/places
   ```

2. **Check Room Details**:
   ```
   GET https://graph.microsoft.com/v1.0/places/room@contoso.com
   ```

3. **Test Calendar Availability**:
   ```
   POST https://graph.microsoft.com/v1.0/users/room@contoso.com/calendar/getSchedule
   Content-Type: application/json
   
   {
     "schedules": ["room@contoso.com"],
     "startTime": {
       "dateTime": "2023-04-04T09:00:00",
       "timeZone": "Pacific Standard Time"
     },
     "endTime": {
       "dateTime": "2023-04-04T17:00:00",
       "timeZone": "Pacific Standard Time"
     },
     "availabilityViewInterval": 15
   }
   ```

4. **Create Test Event**:
   ```
   POST https://graph.microsoft.com/v1.0/me/events
   Content-Type: application/json
   
   {
     "subject": "Test Meeting",
     "start": {
       "dateTime": "2023-04-04T10:00:00",
       "timeZone": "Pacific Standard Time"
     },
     "end": {
       "dateTime": "2023-04-04T11:00:00",
       "timeZone": "Pacific Standard Time"
     },
     "location": {
       "displayName": "Test Room",
       "locationUri": "room@contoso.com",
       "locationType": "conferenceRoom"
     },
     "attendees": [
       {
         "emailAddress": {
           "address": "room@contoso.com",
           "name": "Test Room"
         },
         "type": "resource"
       }
     ]
   }
   ```

5. **Check Room Mailbox Settings**:
   ```
   GET https://graph.microsoft.com/v1.0/users/room@contoso.com/mailboxSettings
   ```

### Health Checks and Monitoring

Implement comprehensive health checks:

```csharp
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // Add health checks
        services.AddHealthChecks()
            .AddCheck<BotFrameworkHealthCheck>("BotFramework")
            .AddCheck<GraphApiHealthCheck>("MicrosoftGraph")
            .AddCheck<RoomBookingHealthCheck>("RoomBooking");
    }
    
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        // Configure health check endpoint
        app.UseHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = "application/json";
                
                var response = new
                {
                    Status = report.Status.ToString(),
                    Duration = report.TotalDuration,
                    Checks = report.Entries.Select(e => new
                    {
                        Component = e.Key,
                        Status = e.Value.Status.ToString(),
                        Description = e.Value.Description,
                        Duration = e.Value.Duration
                    })
                };
                
                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            }
        });
    }
}

public class GraphApiHealthCheck : IHealthCheck
{
    private readonly IGraphClientService _graphClient;
    
    public GraphApiHealthCheck(IGraphClientService graphClient)
    {
        _graphClient = graphClient;
    }
    
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var client = await _graphClient.GetAuthenticatedClientAsync();
            await client.Me.Request().GetAsync(cancellationToken);
            
            return HealthCheckResult.Healthy("Graph API connection is healthy");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Unable to connect to Graph API", ex);
        }
    }
}
```

---

This troubleshooting guide covers the most common issues encountered when deploying and using the Meeting Room Booking Bot. For additional assistance, contact your organization's support team or refer to the Microsoft documentation for the specific components involved.

Remember to follow secure practices when storing and accessing sensitive information like application credentials, and always test changes in a non-production environment before deploying to production.
