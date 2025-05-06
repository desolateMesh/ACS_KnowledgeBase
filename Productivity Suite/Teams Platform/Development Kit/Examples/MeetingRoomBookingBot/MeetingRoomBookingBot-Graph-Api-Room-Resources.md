## Introduction

This document provides comprehensive details on how the Meeting Room Booking Bot integrates with Microsoft Graph API to access, query, and manage room resources. The Microsoft Graph API serves as the foundation for the bot's ability to discover meeting spaces, check availability, and create bookings within Microsoft 365.

## Microsoft Graph API Overview

Microsoft Graph API provides a unified programmability model to access the data and capabilities of Microsoft 365. For room booking scenarios, it offers powerful endpoints to:

- Retrieve lists of room resources
- Query room properties and attributes
- Check room availability
- Create and manage calendar events
- Schedule meetings with room resources

## Required Permissions

To access room resources through Microsoft Graph API, the Meeting Room Booking Bot requires these specific permissions:

| Permission | Type | Description |
|------------|------|-------------|
| `Calendars.ReadWrite` | Delegated/Application | Read and write calendars in all mailboxes |
| `Place.Read.All` | Delegated/Application | Read all company places (including room details) |
| `User.Read` | Delegated | Read user profile for the authenticated user |
| `User.ReadBasic.All` | Delegated/Application | Read basic properties of all users |

### Configuring Permissions

1. In the Azure AD portal, navigate to **App Registrations**
2. Select the bot's application registration
3. Go to **API Permissions**
4. Add each required permission
5. Grant admin consent for directory-wide permissions

```json
// Example application manifest section showing required permissions
\"requiredResourceAccess\": [
  {
    \"resourceAppId\": \"00000003-0000-0000-c000-000000000000\",
    \"resourceAccess\": [
      {
        \"id\": \"7b9103a5-4610-446b-9670-80643382c1fa\",
        \"type\": \"Scope\"
      },
      {
        \"id\": \"027523d3-72cc-46ba-9d64-16033dd7b97a\",
        \"type\": \"Scope\"
      },
      {
        \"id\": \"e1fe6dd8-ba31-4d61-89e7-88639da4683d\",
        \"type\": \"Scope\"
      },
      {
        \"id\": \"b340eb25-3456-403f-be2f-af7a0d370277\",
        \"type\": \"Scope\"
      }
    ]
  }
]
```

## Authentication Implementation

The Meeting Room Booking Bot uses the OAuth 2.0 client credentials flow to authenticate with Microsoft Graph. This approach is particularly suitable for server-to-server interactions without user context.

### Token Acquisition

```csharp
public class GraphClientService : IGraphClientService
{
    private readonly IConfidentialClientApplication _confidentialClientApplication;
    private readonly string[] _scopes = new[] { \"https://graph.microsoft.com/.default\" };
    
    public GraphClientService(IConfiguration configuration)
    {
        // Initialize the confidential client application with app credentials
        _confidentialClientApplication = ConfidentialClientApplicationBuilder
            .Create(configuration[\"MicrosoftAppId\"])
            .WithClientSecret(configuration[\"MicrosoftAppPassword\"])
            .WithAuthority(new Uri($\"https://login.microsoftonline.com/{configuration[\"TenantId\"]}\"))
            .Build();
    }
    
    public async Task<GraphServiceClient> GetAuthenticatedClientAsync()
    {
        // Acquire token for Microsoft Graph
        var authResult = await _confidentialClientApplication
            .AcquireTokenForClient(_scopes)
            .ExecuteAsync();
            
        // Create and return a Microsoft Graph client with the auth token
        return new GraphServiceClient(
            new DelegateAuthenticationProvider(requestMessage =>
            {
                requestMessage.Headers.Authorization =
                    new AuthenticationHeaderValue(\"Bearer\", authResult.AccessToken);
                return Task.CompletedTask;
            }));
    }
}
```

### Token Caching

For performance optimization, the bot implements token caching to avoid redundant authentication requests:

```csharp
// Add distributed token cache for performance optimization
services.AddDistributedMemoryCache();
services.AddSingleton<ITokenCacheProvider, DistributedTokenCacheProvider>();
```

## Room Resource Discovery

The Meeting Room Booking Bot uses several Graph API endpoints to discover and filter room resources available in the organization.

### Retrieving All Rooms

```csharp
public async Task<List<Room>> GetAllRoomsAsync()
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Query all room resources
    var places = await graphClient.Places
        .Request()
        .Filter(\"resourceType eq 'room'\")
        .Top(100) // Adjust based on number of rooms
        .GetAsync();
    
    // Transform to app model
    var rooms = new List<Room>();
    foreach (var place in places)
    {
        rooms.Add(new Room
        {
            Id = place.Id,
            DisplayName = place.DisplayName,
            EmailAddress = place.EmailAddress,
            Building = place.Building,
            FloorNumber = place.FloorNumber,
            Capacity = place.Capacity ?? 0,
            AudioDeviceName = place.AudioDeviceName,
            VideoDeviceName = place.VideoDeviceName,
            DisplayDeviceName = place.DisplayDeviceName,
            IsWheelChairAccessible = place.IsWheelChairAccessible ?? false,
            Tags = place.Tags?.ToList() ?? new List<string>()
        });
    }
    
    // Handle pagination if needed
    while (places.NextPageRequest != null)
    {
        places = await places.NextPageRequest.GetAsync();
        foreach (var place in places)
        {
            rooms.Add(new Room
            {
                Id = place.Id,
                DisplayName = place.DisplayName,
                EmailAddress = place.EmailAddress,
                Building = place.Building,
                FloorNumber = place.FloorNumber,
                Capacity = place.Capacity ?? 0,
                AudioDeviceName = place.AudioDeviceName,
                VideoDeviceName = place.VideoDeviceName,
                DisplayDeviceName = place.DisplayDeviceName,
                IsWheelChairAccessible = place.IsWheelChairAccessible ?? false,
                Tags = place.Tags?.ToList() ?? new List<string>()
            });
        }
    }
    
    return rooms;
}
```

### Filtering Rooms by Criteria

```csharp
public async Task<List<Room>> FindRoomsByFilterAsync(RoomFilterOptions options)
{
    var rooms = await GetAllRoomsAsync();
    
    // Apply filters
    if (!string.IsNullOrEmpty(options.Building))
    {
        rooms = rooms.Where(r => r.Building == options.Building).ToList();
    }
    
    if (options.FloorNumber.HasValue)
    {
        rooms = rooms.Where(r => r.FloorNumber == options.FloorNumber).ToList();
    }
    
    if (options.MinCapacity.HasValue)
    {
        rooms = rooms.Where(r => r.Capacity >= options.MinCapacity.Value).ToList();
    }
    
    if (options.HasAudioDevice)
    {
        rooms = rooms.Where(r => !string.IsNullOrEmpty(r.AudioDeviceName)).ToList();
    }
    
    if (options.HasVideoDevice)
    {
        rooms = rooms.Where(r => !string.IsNullOrEmpty(r.VideoDeviceName)).ToList();
    }
    
    if (options.HasDisplayDevice)
    {
        rooms = rooms.Where(r => !string.IsNullOrEmpty(r.DisplayDeviceName)).ToList();
    }
    
    if (options.WheelChairAccessible)
    {
        rooms = rooms.Where(r => r.IsWheelChairAccessible).ToList();
    }
    
    if (options.Tags?.Any() == true)
    {
        rooms = rooms.Where(r => options.Tags.All(tag => r.Tags.Contains(tag))).ToList();
    }
    
    return rooms;
}
```

### Room Model

```csharp
public class Room
{
    public string Id { get; set; }
    public string DisplayName { get; set; }
    public string EmailAddress { get; set; }
    public string Building { get; set; }
    public int? FloorNumber { get; set; }
    public int Capacity { get; set; }
    public string AudioDeviceName { get; set; }
    public string VideoDeviceName { get; set; }
    public string DisplayDeviceName { get; set; }
    public bool IsWheelChairAccessible { get; set; }
    public List<string> Tags { get; set; } = new List<string>();
}

public class RoomFilterOptions
{
    public string Building { get; set; }
    public int? FloorNumber { get; set; }
    public int? MinCapacity { get; set; }
    public bool HasAudioDevice { get; set; }
    public bool HasVideoDevice { get; set; }
    public bool HasDisplayDevice { get; set; }
    public bool WheelChairAccessible { get; set; }
    public List<string> Tags { get; set; } = new List<string>();
}
```

## Checking Room Availability

Room availability is determined by checking the room's calendar for the requested time period.

### Schedule Checking

```csharp
public async Task<List<Room>> GetAvailableRoomsAsync(
    DateTime startDateTime, 
    DateTime endDateTime, 
    List<Room> roomsToCheck)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    var availableRooms = new List<Room>();
    
    // Schedule items query requires batch requests for performance
    var roomBatches = roomsToCheck.Select(r => r.EmailAddress)
                                   .Chunk(20)
                                   .ToList();
                                   
    foreach (var roomBatch in roomBatches)
    {
        var scheduleRequest = new ScheduleRequestObject
        {
            Schedules = roomBatch.ToList(),
            StartTime = new DateTimeTimeZone
            {
                DateTime = startDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
                TimeZone = \"UTC\"
            },
            EndTime = new DateTimeTimeZone
            {
                DateTime = endDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
                TimeZone = \"UTC\"
            },
            AvailabilityViewInterval = 15
        };
        
        var scheduleResults = await graphClient.Users[_organizerEmail]
            .Calendar
            .GetSchedule(scheduleRequest)
            .Request()
            .PostAsync();
            
        // Process results
        for (int i = 0; i < scheduleResults.Count; i++)
        {
            var scheduleResult = scheduleResults[i];
            var roomEmail = roomBatch[i];
            
            // Check if the room is available during the requested time
            bool isAvailable = true;
            
            // Check each schedule item
            foreach (var scheduleItem in scheduleResult.ScheduleItems)
            {
                // If there is any overlap, the room is not available
                if (!(scheduleItem.End.DateTime.ToDateTime() <= startDateTime || 
                      scheduleItem.Start.DateTime.ToDateTime() >= endDateTime))
                {
                    isAvailable = false;
                    break;
                }
            }
            
            // Alternative approach using availability view
            if (!string.IsNullOrEmpty(scheduleResult.AvailabilityView))
            {
                // Check if any time slot is busy (0 = free, 1 = tentative, 2 = busy, 3 = out of office, 4 = working elsewhere)
                isAvailable = !scheduleResult.AvailabilityView.Contains('2');
            }
            
            if (isAvailable)
            {
                var room = roomsToCheck.FirstOrDefault(r => r.EmailAddress == roomEmail);
                if (room != null)
                {
                    availableRooms.Add(room);
                }
            }
        }
    }
    
    return availableRooms;
}
```

### Request Extension for All-Day Availability

```csharp
// This function extends the above function to find rooms available for the whole day
public async Task<List<Room>> GetRoomsAvailableAllDayAsync(
    DateTime date, 
    List<Room> roomsToCheck)
{
    // Create the start and end of the work day
    var startDateTime = new DateTime(date.Year, date.Month, date.Day, 8, 0, 0);
    var endDateTime = new DateTime(date.Year, date.Month, date.Day, 18, 0, 0);
    
    return await GetAvailableRoomsAsync(startDateTime, endDateTime, roomsToCheck);
}
```

## Creating Room Bookings

Once a room is selected, the Meeting Room Booking Bot uses Graph API to create a calendar event with the room as a resource.

### Creating Calendar Events

```csharp
public async Task<string> BookRoomAsync(
    string userEmail,
    string roomEmail,
    string subject,
    DateTime startDateTime,
    DateTime endDateTime,
    string body = null,
    List<string> attendeeEmails = null)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Create the event object
    var calendarEvent = new Event
    {
        Subject = subject,
        Start = new DateTimeTimeZone
        {
            DateTime = startDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        End = new DateTimeTimeZone
        {
            DateTime = endDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        Body = new ItemBody
        {
            ContentType = BodyType.Html,
            Content = body ?? $\"Meeting room booking: {subject}\"
        },
        Location = new Location
        {
            DisplayName = roomEmail // Graph will resolve this to the room name
        },
        Attendees = new List<Attendee>()
    };
    
    // Add room as resource
    calendarEvent.Attendees.Add(new Attendee
    {
        EmailAddress = new EmailAddress
        {
            Address = roomEmail
        },
        Type = AttendeeType.Resource
    });
    
    // Add optional additional attendees
    if (attendeeEmails != null)
    {
        foreach (var attendeeEmail in attendeeEmails)
        {
            calendarEvent.Attendees.Add(new Attendee
            {
                EmailAddress = new EmailAddress
                {
                    Address = attendeeEmail
                },
                Type = AttendeeType.Required
            });
        }
    }
    
    // Create the event in the user's calendar
    var createdEvent = await graphClient.Users[userEmail]
        .Calendar
        .Events
        .Request()
        .AddAsync(calendarEvent);
        
    return createdEvent.Id;
}
```

### Updating Room Bookings

```csharp
public async Task UpdateRoomBookingAsync(
    string userEmail,
    string eventId,
    string newSubject = null,
    DateTime? newStartDateTime = null,
    DateTime? newEndDateTime = null,
    string newBody = null,
    List<string> newAttendeeEmails = null)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Get the current event
    var existingEvent = await graphClient.Users[userEmail]
        .Events[eventId]
        .Request()
        .GetAsync();
        
    // Create update object with only the properties that need to change
    var updateEvent = new Event();
    
    if (!string.IsNullOrEmpty(newSubject))
    {
        updateEvent.Subject = newSubject;
    }
    
    if (newStartDateTime.HasValue)
    {
        updateEvent.Start = new DateTimeTimeZone
        {
            DateTime = newStartDateTime.Value.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        };
    }
    
    if (newEndDateTime.HasValue)
    {
        updateEvent.End = new DateTimeTimeZone
        {
            DateTime = newEndDateTime.Value.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        };
    }
    
    if (!string.IsNullOrEmpty(newBody))
    {
        updateEvent.Body = new ItemBody
        {
            ContentType = BodyType.Html,
            Content = newBody
        };
    }
    
    if (newAttendeeEmails != null)
    {
        // Preserve the room resource
        var roomAttendee = existingEvent.Attendees.FirstOrDefault(a => a.Type == AttendeeType.Resource);
        
        updateEvent.Attendees = new List<Attendee>();
        
        // Add room resource back
        if (roomAttendee != null)
        {
            updateEvent.Attendees.Add(roomAttendee);
        }
        
        // Add new attendees
        foreach (var attendeeEmail in newAttendeeEmails)
        {
            updateEvent.Attendees.Add(new Attendee
            {
                EmailAddress = new EmailAddress
                {
                    Address = attendeeEmail
                },
                Type = AttendeeType.Required
            });
        }
    }
    
    // Update the event
    await graphClient.Users[userEmail]
        .Events[eventId]
        .Request()
        .UpdateAsync(updateEvent);
}
```

### Canceling Room Bookings

```csharp
public async Task CancelRoomBookingAsync(string userEmail, string eventId)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Delete the event
    await graphClient.Users[userEmail]
        .Events[eventId]
        .Request()
        .DeleteAsync();
}
```

## Room Data Synchronization

For optimal performance, the Meeting Room Booking Bot implements a caching strategy to minimize Graph API calls.

### Room Cache Implementation

```csharp
public class RoomCacheService : IRoomCacheService
{
    private readonly IMemoryCache _cache;
    private readonly IGraphClientService _graphClientService;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromHours(1);
    private const string ROOMS_CACHE_KEY = \"ALL_ROOMS\";
    
    public RoomCacheService(IMemoryCache cache, IGraphClientService graphClientService)
    {
        _cache = cache;
        _graphClientService = graphClientService;
    }
    
    public async Task<List<Room>> GetAllRoomsAsync()
    {
        // Try to get from cache first
        if (_cache.TryGetValue(ROOMS_CACHE_KEY, out List<Room> cachedRooms))
        {
            return cachedRooms;
        }
        
        // Not in cache, fetch from Graph API
        var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
        var rooms = new List<Room>();
        
        try
        {
            // Query all room resources
            var places = await graphClient.Places
                .Request()
                .Filter(\"resourceType eq 'room'\")
                .GetAsync();
                
            // Transform to app model
            foreach (var place in places)
            {
                rooms.Add(new Room
                {
                    Id = place.Id,
                    DisplayName = place.DisplayName,
                    EmailAddress = place.EmailAddress,
                    Building = place.Building,
                    FloorNumber = place.FloorNumber,
                    Capacity = place.Capacity ?? 0,
                    AudioDeviceName = place.AudioDeviceName,
                    VideoDeviceName = place.VideoDeviceName,
                    DisplayDeviceName = place.DisplayDeviceName,
                    IsWheelChairAccessible = place.IsWheelChairAccessible ?? false,
                    Tags = place.Tags?.ToList() ?? new List<string>()
                });
            }
            
            // Handle pagination
            while (places.NextPageRequest != null)
            {
                places = await places.NextPageRequest.GetAsync();
                foreach (var place in places)
                {
                    rooms.Add(new Room
                    {
                        Id = place.Id,
                        DisplayName = place.DisplayName,
                        EmailAddress = place.EmailAddress,
                        Building = place.Building,
                        FloorNumber = place.FloorNumber,
                        Capacity = place.Capacity ?? 0,
                        AudioDeviceName = place.AudioDeviceName,
                        VideoDeviceName = place.VideoDeviceName,
                        DisplayDeviceName = place.DisplayDeviceName,
                        IsWheelChairAccessible = place.IsWheelChairAccessible ?? false,
                        Tags = place.Tags?.ToList() ?? new List<string>()
                    });
                }
            }
            
            // Store in cache
            _cache.Set(ROOMS_CACHE_KEY, rooms, _cacheDuration);
        }
        catch (Exception ex)
        {
            // Log exception details
            throw;
        }
        
        return rooms;
    }
    
    public async Task RefreshCacheAsync()
    {
        // Remove existing cache
        _cache.Remove(ROOMS_CACHE_KEY);
        
        // Refetch data
        await GetAllRoomsAsync();
    }
}
```

### Room Data Background Synchronization

```csharp
// Register background service
services.AddHostedService<RoomDataSyncService>();

// Background service implementation
public class RoomDataSyncService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _syncInterval = TimeSpan.FromHours(6);
    
    public RoomDataSyncService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var roomCacheService = scope.ServiceProvider.GetRequiredService<IRoomCacheService>();
                
                try
                {
                    // Refresh the room cache
                    await roomCacheService.RefreshCacheAsync();
                    
                    // Log successful sync
                }
                catch (Exception ex)
                {
                    // Log synchronization failure
                }
            }
            
            // Wait for the next sync interval
            await Task.Delay(_syncInterval, stoppingToken);
        }
    }
}
```

## Advanced Room Booking Scenarios

The Meeting Room Booking Bot supports several advanced room booking scenarios through Microsoft Graph API.

### Finding Suitable Rooms for Meetings

```csharp
public async Task<List<Room>> FindSuitableRoomsForMeetingAsync(
    DateTime startDateTime,
    DateTime endDateTime,
    int requiredCapacity,
    string preferredBuilding = null,
    List<string> requiredEquipment = null)
{
    // Get all rooms
    var allRooms = await _roomCacheService.GetAllRoomsAsync();
    
    // Apply capacity filter
    var capacityFilteredRooms = allRooms.Where(r => r.Capacity >= requiredCapacity).ToList();
    
    // Apply building preference if specified
    if (!string.IsNullOrEmpty(preferredBuilding))
    {
        capacityFilteredRooms = capacityFilteredRooms
            .OrderByDescending(r => r.Building == preferredBuilding)
            .ToList();
    }
    
    // Apply equipment requirements if specified
    if (requiredEquipment != null && requiredEquipment.Any())
    {
        var equipmentFilteredRooms = new List<Room>();
        
        foreach (var room in capacityFilteredRooms)
        {
            bool hasAllEquipment = true;
            
            foreach (var equipment in requiredEquipment)
            {
                if (equipment.Equals(\"Audio\", StringComparison.OrdinalIgnoreCase) && 
                    string.IsNullOrEmpty(room.AudioDeviceName))
                {
                    hasAllEquipment = false;
                    break;
                }
                
                if (equipment.Equals(\"Video\", StringComparison.OrdinalIgnoreCase) && 
                    string.IsNullOrEmpty(room.VideoDeviceName))
                {
                    hasAllEquipment = false;
                    break;
                }
                
                if (equipment.Equals(\"Display\", StringComparison.OrdinalIgnoreCase) && 
                    string.IsNullOrEmpty(room.DisplayDeviceName))
                {
                    hasAllEquipment = false;
                    break;
                }
                
                // Check if the equipment is in the room's tags
                if (!room.Tags.Contains(equipment, StringComparer.OrdinalIgnoreCase))
                {
                    hasAllEquipment = false;
                    break;
                }
            }
            
            if (hasAllEquipment)
            {
                equipmentFilteredRooms.Add(room);
            }
        }
        
        capacityFilteredRooms = equipmentFilteredRooms;
    }
    
    // Check availability for filtered rooms
    var availableRooms = await GetAvailableRoomsAsync(
        startDateTime, 
        endDateTime, 
        capacityFilteredRooms);
        
    return availableRooms;
}
```

### Finding Next Available Time Slot

```csharp
public async Task<DateTime?> FindNextAvailableTimeSlotAsync(
    string roomEmail,
    DateTime startDate,
    DateTime endDate,
    TimeSpan meetingDuration,
    List<TimeSpan> preferredStartTimes)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Create a schedule request for the entire period
    var scheduleRequest = new ScheduleRequestObject
    {
        Schedules = new List<string> { roomEmail },
        StartTime = new DateTimeTimeZone
        {
            DateTime = startDate.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        EndTime = new DateTimeTimeZone
        {
            DateTime = endDate.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        AvailabilityViewInterval = 15
    };
    
    var scheduleResults = await graphClient.Users[_organizerEmail]
        .Calendar
        .GetSchedule(scheduleRequest)
        .Request()
        .PostAsync();
        
    if (scheduleResults.Count == 0)
    {
        return null;
    }
    
    var roomSchedule = scheduleResults[0];
    var busyTimes = roomSchedule.ScheduleItems
        .Where(item => item.Status == \"Busy\")
        .Select(item => new
        {
            Start = item.Start.DateTime.ToDateTime(),
            End = item.End.DateTime.ToDateTime()
        })
        .ToList();
    
    // Check each day in the date range
    for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
    {
        // Check each preferred start time
        foreach (var preferredStartTime in preferredStartTimes)
        {
            var proposedStartTime = date.Add(preferredStartTime);
            var proposedEndTime = proposedStartTime.Add(meetingDuration);
            
            // Skip if the proposed time is in the past
            if (proposedStartTime < DateTime.UtcNow)
            {
                continue;
            }
            
            // Check if the proposed time overlaps with any busy times
            bool isAvailable = true;
            foreach (var busyTime in busyTimes)
            {
                if (proposedStartTime < busyTime.End && proposedEndTime > busyTime.Start)
                {
                    isAvailable = false;
                    break;
                }
            }
            
            if (isAvailable)
            {
                return proposedStartTime;
            }
        }
    }
    
    // If no preferred time is available, find any available time slot
    for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
    {
        // Start at 8 AM and check every 30 minutes until 6 PM
        for (int hour = 8; hour < 18; hour++)
        {
            for (int minute = 0; minute < 60; minute += 30)
            {
                var proposedStartTime = new DateTime(date.Year, date.Month, date.Day, hour, minute, 0);
                var proposedEndTime = proposedStartTime.Add(meetingDuration);
                
                // Skip if the proposed time is in the past
                if (proposedStartTime < DateTime.UtcNow)
                {
                    continue;
                }
                
                // Check if the proposed time overlaps with any busy times
                bool isAvailable = true;
                foreach (var busyTime in busyTimes)
                {
                    if (proposedStartTime < busyTime.End && proposedEndTime > busyTime.Start)
                    {
                        isAvailable = false;
                        break;
                    }
                }
                
                if (isAvailable)
                {
                    return proposedStartTime;
                }
            }
        }
    }
    
    return null; // No available time found
}
```

### Recurring Room Bookings

```csharp
public async Task<string> BookRecurringMeetingAsync(
    string userEmail,
    string roomEmail,
    string subject,
    DateTime startDateTime,
    DateTime endDateTime,
    RecurrencePattern recurrencePattern,
    DateTime recurrenceEndDate,
    string body = null,
    List<string> attendeeEmails = null)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Create the recurrence pattern
    var pattern = new Microsoft.Graph.RecurrencePattern
    {
        Type = RecurrencePatternType.Weekly,
        Interval = 1,
        DaysOfWeek = new List<DayOfWeek> { startDateTime.DayOfWeek.ToGraphDayOfWeek() }
    };
    
    switch (recurrencePattern)
    {
        case RecurrencePattern.Daily:
            pattern.Type = RecurrencePatternType.Daily;
            break;
        case RecurrencePattern.Weekly:
            pattern.Type = RecurrencePatternType.Weekly;
            break;
        case RecurrencePattern.Monthly:
            pattern.Type = RecurrencePatternType.Monthly;
            break;
    }
    
    // Create recurrence range
    var range = new RecurrenceRange
    {
        Type = RecurrenceRangeType.EndDate,
        StartDate = new Date(startDateTime.Year, startDateTime.Month, startDateTime.Day),
        EndDate = new Date(recurrenceEndDate.Year, recurrenceEndDate.Month, recurrenceEndDate.Day)
    };
    
    // Create the event with recurrence
    var calendarEvent = new Event
    {
        Subject = subject,
        Start = new DateTimeTimeZone
        {
            DateTime = startDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        End = new DateTimeTimeZone
        {
            DateTime = endDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        Body = new ItemBody
        {
            ContentType = BodyType.Html,
            Content = body ?? $\"Recurring meeting room booking: {subject}\"
        },
        Location = new Location
        {
            DisplayName = roomEmail
        },
        Attendees = new List<Attendee>(),
        Recurrence = new PatternedRecurrence
        {
            Pattern = pattern,
            Range = range
        }
    };
    
    // Add room as resource
    calendarEvent.Attendees.Add(new Attendee
    {
        EmailAddress = new EmailAddress
        {
            Address = roomEmail
        },
        Type = AttendeeType.Resource
    });
    
    // Add optional additional attendees
    if (attendeeEmails != null)
    {
        foreach (var attendeeEmail in attendeeEmails)
        {
            calendarEvent.Attendees.Add(new Attendee
            {
                EmailAddress = new EmailAddress
                {
                    Address = attendeeEmail
                },
                Type = AttendeeType.Required
            });
        }
    }
    
    // Create the event in the user's calendar
    var createdEvent = await graphClient.Users[userEmail]
        .Calendar
        .Events
        .Request()
        .AddAsync(calendarEvent);
        
    return createdEvent.Id;
}

// Extension method to convert System.DayOfWeek to Microsoft.Graph.DayOfWeek
public static class DayOfWeekExtensions
{
    public static Microsoft.Graph.DayOfWeek ToGraphDayOfWeek(this System.DayOfWeek dayOfWeek)
    {
        return dayOfWeek switch
        {
            System.DayOfWeek.Sunday => Microsoft.Graph.DayOfWeek.Sunday,
            System.DayOfWeek.Monday => Microsoft.Graph.DayOfWeek.Monday,
            System.DayOfWeek.Tuesday => Microsoft.Graph.DayOfWeek.Tuesday,
            System.DayOfWeek.Wednesday => Microsoft.Graph.DayOfWeek.Wednesday,
            System.DayOfWeek.Thursday => Microsoft.Graph.DayOfWeek.Thursday,
            System.DayOfWeek.Friday => Microsoft.Graph.DayOfWeek.Friday,
            System.DayOfWeek.Saturday => Microsoft.Graph.DayOfWeek.Saturday,
            _ => throw new ArgumentOutOfRangeException(nameof(dayOfWeek))
        };
    }
}

public enum RecurrencePattern
{
    Daily,
    Weekly,
    Monthly
}
```

## Error Handling & Resilience

Robust error handling is essential when working with Microsoft Graph API, especially for room resource operations.

### Exception Handling

```csharp
public async Task<(bool Success, string ErrorMessage)> TryBookRoomAsync(
    string userEmail,
    string roomEmail,
    string subject,
    DateTime startDateTime,
    DateTime endDateTime,
    string body = null,
    List<string> attendeeEmails = null)
{
    try
    {
        await BookRoomAsync(
            userEmail,
            roomEmail,
            subject,
            startDateTime,
            endDateTime,
            body,
            attendeeEmails);
            
        return (true, null);
    }
    catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.Conflict)
    {
        // Room is already booked at this time
        return (false, \"The room is already booked for this time slot.\");
    }
    catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.Forbidden)
    {
        // Insufficient permissions
        return (false, \"The application does not have sufficient permissions to book this room.\");
    }
    catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
    {
        // Room not found
        return (false, \"The specified room could not be found.\");
    }
    catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.TooManyRequests)
    {
        // Rate limiting
        return (false, \"The request was rate limited. Please try again later.\");
    }
    catch (ServiceException ex)
    {
        // Other Graph API errors
        return (false, $\"An error occurred when booking the room: {ex.Message}\");
    }
    catch (Exception ex)
    {
        // General errors
        return (false, \"An unexpected error occurred.\");
    }
}
```

### Retry Policies

```csharp
public class GraphClientServiceWithRetry : IGraphClientService
{
    private readonly IGraphClientService _innerGraphClientService;
    private readonly ILogger<GraphClientServiceWithRetry> _logger;
    
    public GraphClientServiceWithRetry(
        IGraphClientService graphClientService,
        ILogger<GraphClientServiceWithRetry> logger)
    {
        _innerGraphClientService = graphClientService;
        _logger = logger;
    }
    
    public async Task<GraphServiceClient> GetAuthenticatedClientAsync()
    {
        // Use Polly for retry policies
        var retryPolicy = Policy
            .Handle<ServiceException>(ex => 
                // Retry on transient errors only
                ex.StatusCode == HttpStatusCode.TooManyRequests ||
                ex.StatusCode == HttpStatusCode.ServiceUnavailable ||
                ex.StatusCode == HttpStatusCode.GatewayTimeout)
            .WaitAndRetryAsync(
                3, // Number of retries
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), // Exponential backoff
                (exception, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning(
                        \"Retry {RetryCount} encountered error when calling Graph API. \" +
                        \"Waiting {TimeSpan} before next retry. Error: {Error}\",
                        retryCount, timeSpan, exception.Message);
                });
                
        return await retryPolicy.ExecuteAsync(() => 
            _innerGraphClientService.GetAuthenticatedClientAsync());
    }
}
```

### Token Refresh Handling

```csharp
public class TokenRefreshHandler
{
    private readonly IGraphClientService _graphClientService;
    private readonly ILogger<TokenRefreshHandler> _logger;
    
    public TokenRefreshHandler(
        IGraphClientService graphClientService,
        ILogger<TokenRefreshHandler> logger)
    {
        _graphClientService = graphClientService;
        _logger = logger;
    }
    
    public async Task<T> ExecuteWithTokenRefreshAsync<T>(Func<GraphServiceClient, Task<T>> graphAction)
    {
        try
        {
            var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
            return await graphAction(graphClient);
        }
        catch (ServiceException ex) when (ex.StatusCode == HttpStatusCode.Unauthorized)
        {
            _logger.LogInformation(\"Received unauthorized response. Refreshing token and retrying...\");
            
            // Force a new token by getting a new client
            var graphClient = await _graphClientService.GetAuthenticatedClientAsync(forceRefresh: true);
            
            // Retry the operation with the new token
            return await graphAction(graphClient);
        }
    }
}
```

## Performance Optimization

Optimizing Graph API calls is important for improving the Meeting Room Booking Bot's responsiveness.

### Batch Requests

```csharp
public async Task<Dictionary<string, bool>> CheckMultipleRoomsAvailabilityAsync(
    List<string> roomEmails,
    DateTime startDateTime,
    DateTime endDateTime)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    var batch = new BatchRequestContent();
    var requestIds = new Dictionary<string, string>();
    
    // Create batch request
    foreach (var roomEmail in roomEmails)
    {
        var requestId = Guid.NewGuid().ToString();
        
        // Create schedule request for this room
        var scheduleRequest = new ScheduleRequestObject
        {
            Schedules = new List<string> { roomEmail },
            StartTime = new DateTimeTimeZone
            {
                DateTime = startDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
                TimeZone = \"UTC\"
            },
            EndTime = new DateTimeTimeZone
            {
                DateTime = endDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
                TimeZone = \"UTC\"
            },
            AvailabilityViewInterval = 15
        };
        
        // Add request to batch
        var request = graphClient.Users[_organizerEmail]
            .Calendar
            .GetSchedule(scheduleRequest)
            .Request()
            .GetHttpRequestMessage();
            
        batch.AddBatchRequestStep(new BatchRequestStep(requestId, request));
        requestIds.Add(requestId, roomEmail);
    }
    
    // Execute batch request
    var batchResponse = await graphClient.Batch.Request().PostAsync(batch);
    
    // Process results
    var availabilityResults = new Dictionary<string, bool>();
    
    foreach (var requestId in requestIds.Keys)
    {
        if (batchResponse.Responses.ContainsKey(requestId))
        {
            var response = batchResponse.Responses[requestId];
            
            if (response.StatusCode == 200)
            {
                var content = await response.GetResponseObjectAsync<ScheduleInformationCollectionResponse>();
                
                if (content?.Value?.Count > 0)
                {
                    var scheduleInfo = content.Value[0];
                    
                    // Check if the room is available during this time
                    bool isAvailable = true;
                    
                    foreach (var scheduleItem in scheduleInfo.ScheduleItems)
                    {
                        if (!(scheduleItem.End.DateTime.ToDateTime() <= startDateTime || 
                              scheduleItem.Start.DateTime.ToDateTime() >= endDateTime))
                        {
                            isAvailable = false;
                            break;
                        }
                    }
                    
                    availabilityResults.Add(requestIds[requestId], isAvailable);
                }
                else
                {
                    // No schedule information returned
                    availabilityResults.Add(requestIds[requestId], true);
                }
            }
            else
            {
                // Request failed
                availabilityResults.Add(requestIds[requestId], false);
            }
        }
    }
    
    return availabilityResults;
}
```

### Field Selection

```csharp
public async Task<List<Room>> GetRoomBasicInfoAsync()
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    // Query only the fields we need
    var places = await graphClient.Places
        .Request()
        .Filter(\"resourceType eq 'room'\")
        .Select(\"id,displayName,emailAddress,building,capacity\")
        .GetAsync();
        
    // Transform to app model with only basic info
    var rooms = new List<Room>();
    foreach (var place in places)
    {
        rooms.Add(new Room
        {
            Id = place.Id,
            DisplayName = place.DisplayName,
            EmailAddress = place.EmailAddress,
            Building = place.Building,
            Capacity = place.Capacity ?? 0
        });
    }
    
    // Handle pagination
    while (places.NextPageRequest != null)
    {
        places = await places.NextPageRequest.GetAsync();
        foreach (var place in places)
        {
            rooms.Add(new Room
            {
                Id = place.Id,
                DisplayName = place.DisplayName,
                EmailAddress = place.EmailAddress,
                Building = place.Building,
                Capacity = place.Capacity ?? 0
            });
        }
    }
    
    return rooms;
}
```

### Parallel Processing

```csharp
public async Task<List<Room>> GetAvailableRoomsParallelAsync(
    DateTime startDateTime, 
    DateTime endDateTime, 
    List<Room> roomsToCheck)
{
    var availableRooms = new ConcurrentBag<Room>();
    
    // Process up to 5 rooms in parallel
    await Parallel.ForEachAsync(
        roomsToCheck.AsEnumerable(),
        new ParallelOptions { MaxDegreeOfParallelism = 5 },
        async (room, token) =>
        {
            // Check if this room is available
            var isAvailable = await IsRoomAvailableAsync(room.EmailAddress, startDateTime, endDateTime);
            
            if (isAvailable)
            {
                availableRooms.Add(room);
            }
        });
    
    return availableRooms.ToList();
}

private async Task<bool> IsRoomAvailableAsync(
    string roomEmail,
    DateTime startDateTime,
    DateTime endDateTime)
{
    var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
    
    var scheduleRequest = new ScheduleRequestObject
    {
        Schedules = new List<string> { roomEmail },
        StartTime = new DateTimeTimeZone
        {
            DateTime = startDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        EndTime = new DateTimeTimeZone
        {
            DateTime = endDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
            TimeZone = \"UTC\"
        },
        AvailabilityViewInterval = 15
    };
    
    var scheduleResults = await graphClient.Users[_organizerEmail]
        .Calendar
        .GetSchedule(scheduleRequest)
        .Request()
        .PostAsync();
        
    if (scheduleResults.Count == 0)
    {
        return false;
    }
    
    var scheduleResult = scheduleResults[0];
    
    // Check if the room is available during the requested time
    foreach (var scheduleItem in scheduleResult.ScheduleItems)
    {
        // If there is any overlap, the room is not available
        if (!(scheduleItem.End.DateTime.ToDateTime() <= startDateTime || 
              scheduleItem.Start.DateTime.ToDateTime() >= endDateTime))
        {
            return false;
        }
    }
    
    return true;
}
```

## Monitoring and Diagnostics

Implementing proper monitoring is essential for the Meeting Room Booking Bot to ensure reliable operation.

### Request Tracking

```csharp
public class GraphClientServiceWithTelemetry : IGraphClientService
{
    private readonly IGraphClientService _innerGraphClientService;
    private readonly ITelemetryClient _telemetryClient;
    
    public GraphClientServiceWithTelemetry(
        IGraphClientService graphClientService,
        ITelemetryClient telemetryClient)
    {
        _innerGraphClientService = graphClientService;
        _telemetryClient = telemetryClient;
    }
    
    public async Task<GraphServiceClient> GetAuthenticatedClientAsync()
    {
        var graphClient = await _innerGraphClientService.GetAuthenticatedClientAsync();
        
        // Add telemetry middleware to track all requests
        graphClient.HttpProvider.MiddlewareStack.Remove<TelemetryHandler>();
        graphClient.HttpProvider.MiddlewareStack.Add(new TelemetryHandler(
            _telemetryClient,
            correlationId: Guid.NewGuid().ToString(),
            applicationName: \"MeetingRoomBookingBot\"));
            
        return graphClient;
    }
}

// Telemetry middleware to track Graph API calls
public class TelemetryHandler : DelegatingHandler
{
    private readonly ITelemetryClient _telemetryClient;
    private readonly string _correlationId;
    private readonly string _applicationName;
    
    public TelemetryHandler(
        ITelemetryClient telemetryClient,
        string correlationId,
        string applicationName)
    {
        _telemetryClient = telemetryClient;
        _correlationId = correlationId;
        _applicationName = applicationName;
        InnerHandler = new HttpClientHandler();
    }
    
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        // Start tracking the request
        var requestUri = request.RequestUri.ToString();
        var requestMethod = request.Method.ToString();
        
        var startTime = DateTime.UtcNow;
        var stopwatch = Stopwatch.StartNew();
        
        // Create dependency telemetry
        var telemetry = new DependencyTelemetry
        {
            Name = $\"{requestMethod} {request.RequestUri.AbsolutePath}\",
            Target = request.RequestUri.Host,
            Data = requestUri,
            Type = \"Microsoft Graph API\",
            Timestamp = startTime
        };
        
        // Add custom properties
        telemetry.Properties[\"CorrelationId\"] = _correlationId;
        telemetry.Properties[\"ApplicationName\"] = _applicationName;
        
        HttpResponseMessage response = null;
        
        try
        {
            // Add request headers for correlation
            request.Headers.Add(\"client-request-id\", _correlationId);
            request.Headers.Add(\"User-Agent\", $\"{_applicationName}/1.0\");
            
            // Send the request
            response = await base.SendAsync(request, cancellationToken);
            
            // Track success/failure
            stopwatch.Stop();
            telemetry.Duration = stopwatch.Elapsed;
            telemetry.Success = response.IsSuccessStatusCode;
            telemetry.ResultCode = response.StatusCode.ToString();
            
            if (!response.IsSuccessStatusCode)
            {
                // Include response content for error diagnosis
                var content = await response.Content.ReadAsStringAsync();
                telemetry.Properties[\"ErrorDetails\"] = content;
            }
            
            return response;
        }
        catch (Exception ex)
        {
            // Track exception
            stopwatch.Stop();
            telemetry.Duration = stopwatch.Elapsed;
            telemetry.Success = false;
            telemetry.ResultCode = \"Exception\";
            telemetry.Properties[\"Exception\"] = ex.ToString();
            
            throw;
        }
        finally
        {
            // Track the telemetry
            _telemetryClient.TrackDependency(telemetry);
        }
    }
}
```

### Logging

```csharp
public class RoomBookingService : IRoomBookingService
{
    private readonly IGraphClientService _graphClientService;
    private readonly ILogger<RoomBookingService> _logger;
    
    public RoomBookingService(
        IGraphClientService graphClientService,
        ILogger<RoomBookingService> logger)
    {
        _graphClientService = graphClientService;
        _logger = logger;
    }
    
    public async Task<string> BookRoomAsync(
        string userEmail,
        string roomEmail,
        string subject,
        DateTime startDateTime,
        DateTime endDateTime,
        string body = null,
        List<string> attendeeEmails = null)
    {
        _logger.LogInformation(
            \"Booking room {RoomEmail} for user {UserEmail} from {StartTime} to {EndTime}\",
            roomEmail, userEmail, startDateTime, endDateTime);
            
        try
        {
            var graphClient = await _graphClientService.GetAuthenticatedClientAsync();
            
            // Create the event object
            var calendarEvent = new Event
            {
                Subject = subject,
                Start = new DateTimeTimeZone
                {
                    DateTime = startDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
                    TimeZone = \"UTC\"
                },
                End = new DateTimeTimeZone
                {
                    DateTime = endDateTime.ToString(\"yyyy-MM-ddTHH:mm:ss\"),
                    TimeZone = \"UTC\"
                },
                Body = new ItemBody
                {
                    ContentType = BodyType.Html,
                    Content = body ?? $\"Meeting room booking: {subject}\"
                },
                Location = new Location
                {
                    DisplayName = roomEmail
                },
                Attendees = new List<Attendee>()
            };
            
            // Add room as resource
            calendarEvent.Attendees.Add(new Attendee
            {
                EmailAddress = new EmailAddress
                {
                    Address = roomEmail
                },
                Type = AttendeeType.Resource
            });
            
            // Add optional additional attendees
            if (attendeeEmails != null)
            {
                foreach (var attendeeEmail in attendeeEmails)
                {
                    calendarEvent.Attendees.Add(new Attendee
                    {
                        EmailAddress = new EmailAddress
                        {
                            Address = attendeeEmail
                        },
                        Type = AttendeeType.Required
                    });
                }
            }
            
            // Create the event in the user's calendar
            var createdEvent = await graphClient.Users[userEmail]
                .Calendar
                .Events
                .Request()
                .AddAsync(calendarEvent);
                
            _logger.LogInformation(
                \"Successfully booked room {RoomEmail}. Event ID: {EventId}\",
                roomEmail, createdEvent.Id);
                
            return createdEvent.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                \"Error booking room {RoomEmail} for user {UserEmail}\",
                roomEmail, userEmail);
                
            throw;
        }
    }
    
    // Other methods with similar logging...
}
```

## Security Best Practices

Securing the Meeting Room Booking Bot's interactions with Microsoft Graph API is critical.

### Secure Token Handling

```csharp
public class SecureGraphClientService : IGraphClientService
{
    private readonly IKeyVaultService _keyVaultService;
    private readonly IMemoryCache _cache;
    private readonly string _appId;
    private readonly string _tenantId;
    private readonly string _certificateThumbprint;
    private const string TOKEN_CACHE_KEY = \"GraphApiToken\";
    
    public SecureGraphClientService(
        IConfiguration configuration,
        IKeyVaultService keyVaultService,
        IMemoryCache cache)
    {
        _keyVaultService = keyVaultService;
        _cache = cache;
        _appId = configuration[\"AzureAd:ClientId\"];
        _tenantId = configuration[\"AzureAd:TenantId\"];
        _certificateThumbprint = configuration[\"AzureAd:CertificateThumbprint\"];
    }
    
    public async Task<GraphServiceClient> GetAuthenticatedClientAsync(bool forceRefresh = false)
    {
        // Try to get token from cache unless forced refresh
        if (!forceRefresh && _cache.TryGetValue(TOKEN_CACHE_KEY, out string cachedToken))
        {
            return CreateGraphClientWithToken(cachedToken);
        }
        
        // Get certificate from Key Vault
        var certificate = await _keyVaultService.GetCertificateAsync(_certificateThumbprint);
        
        // Create confidential client with certificate
        var confidentialClient = ConfidentialClientApplicationBuilder
            .Create(_appId)
            .WithCertificate(certificate)
            .WithAuthority(new Uri($\"https://login.microsoftonline.com/{_tenantId}\"))
            .Build();
            
        // Acquire token
        var authResult = await confidentialClient
            .AcquireTokenForClient(new[] { \"https://graph.microsoft.com/.default\" })
            .ExecuteAsync();
            
        // Cache token (with some buffer before expiration)
        var expirationBuffer = TimeSpan.FromMinutes(5);
        var cacheExpiration = DateTimeOffset.Now.AddSeconds(authResult.ExpiresIn).Subtract(expirationBuffer);
        _cache.Set(TOKEN_CACHE_KEY, authResult.AccessToken, cacheExpiration);
        
        return CreateGraphClientWithToken(authResult.AccessToken);
    }
    
    private GraphServiceClient CreateGraphClientWithToken(string token)
    {
        return new GraphServiceClient(
            new DelegateAuthenticationProvider(requestMessage =>
            {
                requestMessage.Headers.Authorization =
                    new AuthenticationHeaderValue(\"Bearer\", token);
                return Task.CompletedTask;
            }));
    }
}

// Key Vault service for secure certificate retrieval
public class KeyVaultService : IKeyVaultService
{
    private readonly IConfiguration _configuration;
    private readonly SecretClient _secretClient;
    private readonly CertificateClient _certificateClient;
    
    public KeyVaultService(IConfiguration configuration)
    {
        _configuration = configuration;
        
        // Use managed identity for Key Vault access
        var keyVaultUri = new Uri(_configuration[\"KeyVault:Uri\"]);
        var credential = new DefaultAzureCredential();
        
        _secretClient = new SecretClient(keyVaultUri, credential);
        _certificateClient = new CertificateClient(keyVaultUri, credential);
    }
    
    public async Task<X509Certificate2> GetCertificateAsync(string thumbprint)
    {
        // Get certificate from Key Vault
        var certificateName = await GetCertificateNameByThumbprintAsync(thumbprint);
        var certificateBundle = await _certificateClient.GetCertificateAsync(certificateName);
        var certificateSecret = await _secretClient.GetSecretAsync(certificateBundle.Value.SecretId.Segments.Last());
        
        // Convert to X509Certificate2
        var certificateBytes = Convert.FromBase64String(certificateSecret.Value.Value);
        return new X509Certificate2(certificateBytes, string.Empty, X509KeyStorageFlags.MachineKeySet);
    }
    
    private async Task<string> GetCertificateNameByThumbprintAsync(string thumbprint)
    {
        // List all certificates and find by thumbprint
        var certificates = _certificateClient.GetPropertiesOfCertificatesAsync();
        
        await foreach (var certificate in certificates)
        {
            var certWithDetails = await _certificateClient.GetCertificateAsync(certificate.Name);
            if (certWithDetails.Value.Properties.X509Thumbprint.ToHexString().Equals(thumbprint, StringComparison.OrdinalIgnoreCase))
            {
                return certificate.Name;
            }
        }
        
        throw new KeyNotFoundException($\"Certificate with thumbprint {thumbprint} not found in Key Vault.\");
    }
}
```

### Least Privilege Permissions

```csharp
// Recommended approach for app registrations:
// 1. Create separate app registrations for different bot functions
// 2. Assign only necessary permissions to each

// Room discovery app registration
/*
\"requiredResourceAccess\": [
  {
    \"resourceAppId\": \"00000003-0000-0000-c000-000000000000\",
    \"resourceAccess\": [
      {
        // Place.Read.All - Read places in all site collections
        \"id\": \"027523d3-72cc-46ba-9d64-16033dd7b97a\",
        \"type\": \"Scope\"
      }
    ]
  }
]
*/

// Room booking app registration
/*
\"requiredResourceAccess\": [
  {
    \"resourceAppId\": \"00000003-0000-0000-c000-000000000000\",
    \"resourceAccess\": [
      {
        // Calendars.ReadWrite - Read and write calendars
        \"id\": \"7b9103a5-4610-446b-9670-80643382c1fa\",
        \"type\": \"Scope\"
      },
      {
        // User.Read - Sign in and read user profile
        \"id\": \"e1fe6dd8-ba31-4d61-89e7-88639da4683d\",
        \"type\": \"Scope\"
      }
    ]
  }
]
*/

// Service registration that combines clients based on the operation
public class MultiClientGraphService : IGraphClientService
{
    private readonly IGraphClientService _readOnlyGraphClient;
    private readonly IGraphClientService _calendarWriteGraphClient;
    
    public MultiClientGraphService(
        [FromKeyedServices(\"ReadOnly\")] IGraphClientService readOnlyGraphClient,
        [FromKeyedServices(\"CalendarWrite\")] IGraphClientService calendarWriteGraphClient)
    {
        _readOnlyGraphClient = readOnlyGraphClient;
        _calendarWriteGraphClient = calendarWriteGraphClient;
    }
    
    public async Task<GraphServiceClient> GetRoomDiscoveryClientAsync()
    {
        return await _readOnlyGraphClient.GetAuthenticatedClientAsync();
    }
    
    public async Task<GraphServiceClient> GetCalendarBookingClientAsync()
    {
        return await _calendarWriteGraphClient.GetAuthenticatedClientAsync();
    }
}
```

## Best Practices and Recommendations

Follow these best practices for implementing Microsoft Graph API with the Meeting Room Booking Bot:

### 1. Error Handling Guidelines

- Always implement proper error handling for Graph API calls
- Use specific error handling for different error codes
- Implement retry strategies for transient errors
- Log detailed information for troubleshooting

### 2. Performance Optimization

- Minimize the number of Graph API calls
- Use batching for multiple operations
- Implement caching for room resources
- Specify only required fields in queries
- Use parallel processing when appropriate

### 3. Security Best Practices

- Use certificate-based authentication instead of client secrets
- Store certificates and secrets in Azure Key Vault
- Implement token caching with proper expiration
- Follow the principle of least privilege for permissions
- Use application permissions for service-to-service scenarios

### 4. Deployment Recommendations

- Deploy with managed identities where possible
- Implement proper monitoring and logging
- Use separate app registrations for different functions
- Implement proper throttling management
- Test thoroughly with various room configurations

## References and Additional Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [Microsoft Graph Places API](https://docs.microsoft.com/en-us/graph/api/resources/place)
- [Microsoft Graph Calendar API](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
