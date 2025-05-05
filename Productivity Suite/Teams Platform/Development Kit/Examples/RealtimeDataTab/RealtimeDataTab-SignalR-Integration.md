# RealtimeDataTab - SignalR Integration

## Overview

This document provides comprehensive guidance on integrating Microsoft SignalR with the RealtimeDataTab application in Microsoft Teams. SignalR enables real-time, bidirectional communication between server and clients, allowing for immediate data updates without manual refreshing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Backend Setup](#backend-setup)
  - [SignalR Hub Implementation](#signalr-hub-implementation)
  - [Authentication Configuration](#authentication-configuration)
  - [Azure Deployment Considerations](#azure-deployment-considerations)
- [Frontend Integration](#frontend-integration)
  - [Establishing Connection](#establishing-connection)
  - [Subscribing to Updates](#subscribing-to-updates)
  - [Handling Connection Lifecycle](#handling-connection-lifecycle)
- [Data Protocols](#data-protocols)
  - [Message Format](#message-format)
  - [Data Transformation](#data-transformation)
- [Scaling Considerations](#scaling-considerations)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Example Implementation](#example-implementation)
- [References](#references)

## Prerequisites

Before integrating SignalR with RealtimeDataTab, ensure you have:

- Azure subscription with appropriate permissions
- Visual Studio 2022 or compatible IDE
- .NET 7.0 SDK or later
- Node.js 16.x or later
- RealtimeDataTab project framework already set up
- Microsoft Teams Developer account
- Familiarity with ASP.NET Core and React/TypeScript

## Architecture Overview

The RealtimeDataTab with SignalR integration uses a layered architecture:

1. **Backend Layer**: ASP.NET Core application hosting SignalR Hub
2. **Communication Layer**: SignalR services managing WebSocket connections
3. **Frontend Layer**: Teams application using SignalR client library
4. **Data Source Layer**: External systems providing real-time data

This architecture enables:
- Low-latency data updates (typically < 100ms)
- Connection state management across network changes
- Automatic fallback to alternative transport methods when WebSockets aren't available
- Scalable connection handling for enterprise deployments

## Backend Setup

### SignalR Hub Implementation

Create a dedicated SignalR Hub class that will handle real-time communications:

```csharp
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace RealtimeDataTab.Hubs
{
    public class DataHub : Hub
    {
        private readonly IDataService _dataService;
        
        public DataHub(IDataService dataService)
        {
            _dataService = dataService;
        }
        
        // Method called by clients to subscribe to specific data streams
        public async Task SubscribeToDataStream(string streamId)
        {
            // Add user to a SignalR group for this specific data stream
            await Groups.AddToGroupAsync(Context.ConnectionId, streamId);
            
            // Get initial data and send it to the client
            var initialData = await _dataService.GetInitialDataAsync(streamId);
            await Clients.Caller.SendAsync("ReceiveInitialData", initialData);
        }
        
        // Method called by clients to unsubscribe from a data stream
        public async Task UnsubscribeFromDataStream(string streamId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, streamId);
        }
        
        // Override method to handle client disconnect
        public override async Task OnDisconnectedAsync(Exception exception)
        {
            // Clean up resources or log disconnection
            await base.OnDisconnectedAsync(exception);
        }
    }
}
```

Register the SignalR Hub in your `Startup.cs` or `Program.cs`:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    // Other service registrations...
    
    services.AddSignalR(options =>
    {
        // Configure SignalR options
        options.EnableDetailedErrors = true; // For development only
        options.MaximumReceiveMessageSize = 102400; // 100 KB message size limit
        options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
        options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    })
    .AddAzureSignalR(Configuration.GetConnectionString("SignalR")) // For production scaling
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.PropertyNamingPolicy = null;
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Other app configurations...
    
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapHub<DataHub>("/datahub");
        // Other endpoint mappings...
    });
}
```

### Authentication Configuration

Secure your SignalR connections using Azure AD authentication:

```csharp
services.AddSignalR().AddAzureSignalR();

services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://login.microsoftonline.com/{Configuration["AzureAd:TenantId"]}";
        options.Audience = Configuration["AzureAd:ClientId"];
        
        // Configure for SignalR
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                
                // If the request is for our hub...
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/datahub"))
                {
                    // Read the token out of the query string
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
```

### Azure Deployment Considerations

For production deployment, use Azure SignalR Service:

1. Create an Azure SignalR Service resource in the Azure portal
2. Configure your application to use the ConnectionString in your configuration
3. Enable server-side scaling with Azure SignalR Service's built-in load balancing
4. Configure CORS settings if needed:

```csharp
services.AddCors(options =>
{
    options.AddPolicy("TeamsPolicy",
        builder => builder
            .WithOrigins("https://*.teams.microsoft.com")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Ensure this is called BEFORE UseRouting and UseEndpoints
app.UseCors("TeamsPolicy");
```

## Frontend Integration

### Establishing Connection

In your React/TypeScript Teams tab application, establish the SignalR connection:

```typescript
import * as signalR from "@microsoft/signalr";
import { useState, useEffect } from "react";
import { getTeamsToken } from "./authService";

export const useSignalRConnection = (hubUrl: string) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<string>("Disconnected");
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create connection
    const createConnection = async () => {
      try {
        // Get authentication token from Teams
        const token = await getTeamsToken();
        
        // Build connection with authentication
        const newConnection = new signalR.HubConnectionBuilder()
          .withUrl(hubUrl, { 
            accessTokenFactory: () => token,
            transport: signalR.HttpTransportType.WebSockets,
            skipNegotiation: true
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 15000, 30000]) // Retry policy
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Set up connection state change handler
        newConnection.onreconnecting(error => {
          setConnectionState("Reconnecting");
          console.warn("Connection lost, reconnecting...", error);
        });

        newConnection.onreconnected(connectionId => {
          setConnectionState("Connected");
          console.info("Connection reestablished. ConnectionId:", connectionId);
          // Re-subscribe to data streams if needed
        });

        newConnection.onclose(error => {
          setConnectionState("Disconnected");
          console.error("Connection closed.", error);
        });

        // Start the connection
        await newConnection.start();
        setConnection(newConnection);
        setConnectionState("Connected");
        console.info("SignalR connection established successfully");
      } catch (err) {
        setError(err as Error);
        setConnectionState("Failed");
        console.error("SignalR connection failed:", err);
      }
    };

    createConnection();

    // Clean up connection when component unmounts
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [hubUrl]);

  return { connection, connectionState, error };
};
```

### Subscribing to Updates

Create a custom hook to subscribe to data stream updates:

```typescript
import { useState, useEffect, useCallback } from "react";
import { HubConnection } from "@microsoft/signalr";

export const useDataStream = (
  connection: HubConnection | null,
  streamId: string
) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to data stream
  const subscribeToStream = useCallback(async () => {
    if (!connection) return;
    
    try {
      setIsLoading(true);
      
      // Register method to receive initial data
      connection.on("ReceiveInitialData", (initialData) => {
        setData(initialData);
        setIsLoading(false);
      });
      
      // Register method to receive updates
      connection.on("ReceiveDataUpdate", (update) => {
        setData(prevData => ({
          ...prevData,
          ...update
        }));
      });
      
      // Call hub method to subscribe
      await connection.invoke("SubscribeToDataStream", streamId);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, [connection, streamId]);

  // Unsubscribe from data stream
  const unsubscribeFromStream = useCallback(async () => {
    if (!connection) return;
    
    try {
      // Call hub method to unsubscribe
      await connection.invoke("UnsubscribeFromDataStream", streamId);
      
      // Remove event handlers
      connection.off("ReceiveInitialData");
      connection.off("ReceiveDataUpdate");
    } catch (err) {
      console.error("Error unsubscribing:", err);
    }
  }, [connection, streamId]);

  useEffect(() => {
    if (connection && connection.state === "Connected") {
      subscribeToStream();
    }
    
    return () => {
      unsubscribeFromStream();
    };
  }, [connection, subscribeToStream, unsubscribeFromStream]);

  return { data, isLoading, error };
};
```

### Handling Connection Lifecycle

Implement proper connection lifecycle handling in your component:

```typescript
import React from "react";
import { useSignalRConnection } from "./useSignalRConnection";
import { useDataStream } from "./useDataStream";

const RealtimeDataDisplay: React.FC = () => {
  const hubUrl = "https://your-backend.azurewebsites.net/datahub";
  const streamId = "performanceMetrics";
  
  const { connection, connectionState, error: connectionError } = 
    useSignalRConnection(hubUrl);
    
  const { data, isLoading, error: dataError } = 
    useDataStream(connection, streamId);
    
  if (connectionState === "Reconnecting") {
    return <div className="reconnecting">Reconnecting to data source...</div>;
  }
  
  if (connectionState === "Failed" || connectionError) {
    return (
      <div className="connection-error">
        Connection error: {connectionError?.message || "Failed to connect"}
      </div>
    );
  }
  
  if (isLoading) {
    return <div className="loading">Loading data...</div>;
  }
  
  if (dataError) {
    return <div className="data-error">Error: {dataError.message}</div>;
  }
  
  return (
    <div className="realtime-data">
      <h3>Live Performance Metrics</h3>
      <div className="connection-status">
        Status: {connectionState}
      </div>
      <div className="data-display">
        {data && (
          <>
            <div className="metric">
              <span>CPU Utilization:</span>
              <span>{data.cpuUtilization}%</span>
            </div>
            <div className="metric">
              <span>Memory Usage:</span>
              <span>{data.memoryUsage}MB</span>
            </div>
            <div className="metric">
              <span>Active Connections:</span>
              <span>{data.activeConnections}</span>
            </div>
            <div className="metric">
              <span>Last Updated:</span>
              <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RealtimeDataDisplay;
```

## Data Protocols

### Message Format

Standardize your real-time data message format:

```typescript
interface DataMessage {
  // Message identification
  messageId: string;
  timestamp: string;
  
  // Stream identification
  streamId: string;
  streamType: "metrics" | "alerts" | "status";
  
  // Payload
  data: {
    [key: string]: any;
  };
  
  // Metadata
  source: string;
  priority: "low" | "medium" | "high";
  expiresAt?: string;
}
```

### Data Transformation

Implement data transformation utilities to convert backend data to frontend-friendly formats:

```typescript
export const transformMetricsData = (rawData: any): MetricsViewModel => {
  return {
    cpuUtilization: Number(rawData.cpu_util).toFixed(1),
    memoryUsage: Math.round(rawData.mem_used_mb),
    activeConnections: rawData.active_conn,
    networkBandwidth: (rawData.network_mbps).toFixed(2),
    diskIOPs: Math.round(rawData.disk_iops),
    timestamp: new Date(rawData.ts).toISOString(),
    trend: calculateTrend(rawData.historical)
  };
};

export const calculateTrend = (historicalData: any[]): "up" | "down" | "stable" => {
  if (!historicalData || historicalData.length < 2) return "stable";
  
  const latest = historicalData[historicalData.length - 1];
  const previous = historicalData[historicalData.length - 2];
  const difference = latest - previous;
  
  if (Math.abs(difference) < 0.05 * previous) return "stable";
  return difference > 0 ? "up" : "down";
};
```

## Scaling Considerations

For enterprise-level deployments, consider these scaling practices:

1. **Use Azure SignalR Service**: Supports scaling to hundreds of thousands of concurrent connections
   ```powershell
   # Create Azure SignalR Service using Azure CLI
   az signalr create --name "realtimedata-signalr" --resource-group "your-resource-group" --sku "Standard_S1" --unit-count 1 --service-mode Default
   ```

2. **Implement Backplane**: For multi-server deployments, Azure SignalR Service handles this automatically

3. **Server-Side Batching**: Group frequent updates to reduce connection overhead
   ```csharp
   // In your background service
   private async Task SendBatchedUpdates(CancellationToken stoppingToken)
   {
       while (!stoppingToken.IsCancellationRequested)
       {
           // Process backlog of updates
           var batchedUpdates = await _backlogService.GetCurrentBatchAsync();
           
           // Group updates by stream ID
           var groupedUpdates = batchedUpdates
               .GroupBy(u => u.StreamId)
               .ToDictionary(g => g.Key, g => g.ToList());
           
           // Send batched updates to each group
           foreach (var group in groupedUpdates)
           {
               var streamId = group.Key;
               var mergedData = MergeUpdates(group.Value);
               
               await _hubContext.Clients.Group(streamId)
                   .SendAsync("ReceiveDataUpdate", mergedData);
           }
           
           await Task.Delay(1000, stoppingToken); // 1-second batching interval
       }
   }
   ```

4. **Client-Side Throttling**: Implement update throttling on the client
   ```typescript
   import { useEffect, useState } from "react";
   import { throttle } from "lodash";

   export const useThrottledState = (initialState, delay = 250) => {
     const [state, setState] = useState(initialState);
     const [throttledState, setThrottledState] = useState(initialState);
     
     useEffect(() => {
       const throttledSetState = throttle(setThrottledState, delay);
       throttledSetState(state);
       
       return () => {
         throttledSetState.cancel();
       };
     }, [state, delay]);
     
     return [throttledState, setState];
   };
   ```

## Security Best Practices

1. **Authentication**: Always use Azure AD authentication for SignalR connections

2. **Authorization**: Implement group-based authorization
   ```csharp
   [Authorize(Policy = "DataStreamSubscribers")]
   public class DataHub : Hub
   {
       // Hub methods implementation
   }
   ```

3. **Transport Security**: Enforce HTTPS and secure WebSockets (wss://)
   ```csharp
   public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
   {
       app.UseHttpsRedirection();
       // Other middleware configuration...
   }
   ```

4. **Input Validation**: Validate all client inputs
   ```csharp
   public async Task SubscribeToDataStream(string streamId)
   {
       // Validate the streamId
       if (string.IsNullOrEmpty(streamId) || !IsValidStreamId(streamId))
       {
           throw new HubException("Invalid stream ID format");
       }
       
       // Verify the user has permission to access this stream
       if (!await _authorizationService.CanAccessStreamAsync(Context.User, streamId))
       {
           throw new HubException("Not authorized to access this data stream");
       }
       
       // Proceed with subscription...
   }
   ```

5. **Rate Limiting**: Implement rate limiting for client-originated messages
   ```csharp
   public override async Task OnConnectedAsync()
   {
       // Set rate limit metadata
       Context.Items["MessageCount"] = 0;
       Context.Items["LastResetTime"] = DateTime.UtcNow;
       
       await base.OnConnectedAsync();
   }
   
   private bool ShouldRateLimit(HubCallerContext context)
   {
       var messageCount = (int)context.Items["MessageCount"];
       var lastResetTime = (DateTime)context.Items["LastResetTime"];
       
       // Reset counter if time window has passed
       if ((DateTime.UtcNow - lastResetTime).TotalMinutes >= 1)
       {
           context.Items["MessageCount"] = 1;
           context.Items["LastResetTime"] = DateTime.UtcNow;
           return false;
       }
       
       // Increment and check
       context.Items["MessageCount"] = messageCount + 1;
       return messageCount + 1 > 100; // Limit: 100 messages per minute
   }
   ```

## Troubleshooting

Common issues and resolutions:

| Issue | Possible Causes | Resolution |
|-------|----------------|------------|
| Connection cannot be established | Network connectivity, CORS, authentication | Check network logs, verify CORS configuration, validate authentication token |
| Connection drops frequently | Poor network quality, server timeout settings | Adjust reconnection policy, increase server timeouts, implement robust reconnection logic |
| Messages not received | Incorrect group subscription, client-side event handlers | Verify group subscription, check client event registration, inspect server logs |
| High latency | Network congestion, inefficient message handling | Implement message batching, optimize serialization, use performance monitoring |
| Connection limit exceeded | Too many concurrent connections | Use Azure SignalR Service, implement connection management, scale your backend |

Debugging steps:

1. Enable detailed SignalR logging:
   ```csharp
   services.AddSignalR(options =>
   {
       options.EnableDetailedErrors = true;
   });
   ```

2. Use browser developer tools to inspect WebSocket traffic

3. Implement server-side logging:
   ```csharp
   private readonly ILogger<DataHub> _logger;
   
   public DataHub(ILogger<DataHub> logger)
   {
       _logger = logger;
   }
   
   public override async Task OnConnectedAsync()
   {
       _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
       await base.OnConnectedAsync();
   }
   ```

## Example Implementation

Complete backend implementation for a real-time monitoring system:

```csharp
// DataMonitoringService.cs
public class DataMonitoringService : BackgroundService
{
    private readonly IHubContext<DataHub> _hubContext;
    private readonly IDataSourceConnector _dataConnector;
    private readonly ILogger<DataMonitoringService> _logger;
    
    public DataMonitoringService(
        IHubContext<DataHub> hubContext,
        IDataSourceConnector dataConnector,
        ILogger<DataMonitoringService> logger)
    {
        _hubContext = hubContext;
        _dataConnector = dataConnector;
        _logger = logger;
    }
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await _dataConnector.InitializeAsync();
            
            _logger.LogInformation("Data monitoring service started");
            
            // Subscribe to data source events
            _dataConnector.OnDataReceived += async (sender, data) =>
            {
                try
                {
                    // Transform data if needed
                    var transformedData = TransformData(data);
                    
                    // Send to appropriate group
                    await _hubContext.Clients
                        .Group(data.StreamId)
                        .SendAsync("ReceiveDataUpdate", transformedData, stoppingToken);
                        
                    _logger.LogDebug("Sent update to stream {StreamId}", data.StreamId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending data update");
                }
            };
            
            // Keep service running
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                _logger.LogDebug("Data monitoring service heartbeat");
            }
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "Fatal error in data monitoring service");
            throw;
        }
        finally
        {
            await _dataConnector.DisconnectAsync();
            _logger.LogInformation("Data monitoring service stopped");
        }
    }
    
    private object TransformData(RawDataEvent data)
    {
        // Transform data from source format to client-ready format
        return new
        {
            data.StreamId,
            Timestamp = DateTime.UtcNow,
            Values = data.Metrics.Select(m => new
            {
                Name = m.Key,
                Value = m.Value,
                Unit = GetUnitForMetric(m.Key)
            }).ToList()
        };
    }
    
    private string GetUnitForMetric(string metricName)
    {
        // Return appropriate unit based on metric name
        return metricName switch
        {
            "cpu" => "%",
            "memory" => "MB",
            "disk" => "GB",
            "network" => "Mbps",
            _ => ""
        };
    }
}
```

## References

- [Official ASP.NET Core SignalR Documentation](https://docs.microsoft.com/en-us/aspnet/core/signalr/)
- [Azure SignalR Service Documentation](https://docs.microsoft.com/en-us/azure/azure-signalr/)
- [Microsoft Teams Developer Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [SignalR JavaScript Client Documentation](https://docs.microsoft.com/en-us/aspnet/core/signalr/javascript-client)
- [CORS in ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/security/cors)
- [Microsoft Teams Client SDK](https://docs.microsoft.com/en-us/javascript/api/overview/msteams-client)
