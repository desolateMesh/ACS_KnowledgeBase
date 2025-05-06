## Overview

This comprehensive troubleshooting guide addresses common issues encountered when implementing, deploying, and using the RealtimeDataTab in Microsoft Teams. The guide is organized by component area, with detailed diagnostic steps and solutions for each issue.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Authentication Problems](#authentication-problems)
- [Data Visualization Issues](#data-visualization-issues)
- [SignalR Specific Problems](#signalr-specific-problems)
- [Performance Optimization](#performance-optimization)
- [Teams Integration Challenges](#teams-integration-challenges)
- [Backend Service Issues](#backend-service-issues)
- [Development Environment Setup](#development-environment-setup)
- [Deployment Troubleshooting](#deployment-troubleshooting)
- [Advanced Diagnostics](#advanced-diagnostics)

## Connection Issues

### Connection Cannot Be Established

**Symptoms:**
- Real-time data doesn't appear in the Teams tab
- Browser console shows WebSocket connection errors
- \"Failed to connect\" error message displayed to users

**Diagnostic Steps:**

1. **Check backend service health:**
   ```powershell
   # Using Azure CLI to check Function App status
   az functionapp show --name <your-function-app-name> --resource-group <resource-group-name> --query state
   ```

2. **Verify network connectivity:**
   - Ensure the client network allows WebSocket connections
   - Check corporate firewall settings for WebSocket restrictions
   - Test backend endpoint accessibility with a simple HTTP request

3. **Inspect browser console for specific error messages:**
   - CORS-related errors
   - Authentication token errors
   - Transport negotiation failures

**Solutions:**

1. **CORS Configuration Fix:**
   Update your backend CORS settings to include all required Teams domains:

   ```csharp
   services.AddCors(options =>
   {
       options.AddPolicy(\"TeamsPolicy\",
           builder => builder
               .WithOrigins(
                   \"https://*.teams.microsoft.com\",
                   \"https://*.teams.microsoft.us\",
                   \"https://*.teams.cloudapi.de\",
                   \"https://*.teams.microsoft.cn\",
                   \"https://devspaces.skype.com\"
               )
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials());
   });
   ```

2. **Network Configuration:**
   - Ensure ports 443 (HTTPS) and WebSocket traffic are allowed through firewalls
   - For corporate environments, request WebSocket protocol allowance from IT department

3. **SignalR Fallback Transport:**
   Configure SignalR to use fallback transport options:

   ```typescript
   const connection = new signalR.HubConnectionBuilder()
     .withUrl(hubUrl, {
       skipNegotiation: false, // Allow negotiation to find best transport
       transport: undefined // Don't force WebSockets, allow fallback
     })
     .build();
   ```

### Intermittent Connection Drops

**Symptoms:**
- Data updates stop periodically
- \"Reconnecting...\" message appears frequently
- Connection states fluctuate between connected and reconnecting

**Diagnostic Steps:**

1. **Monitor connection stability:**
   - Implement logging for connection state changes
   - Track reconnection frequency and duration
   - Capture network events preceding disconnections

2. **Check network quality:**
   - Test network latency to backend services
   - Monitor for packet loss or network congestion
   - Verify stable connectivity throughout your organization

**Solutions:**

1. **Robust Reconnection Strategy:**
   Implement a progressive backoff strategy:

   ```typescript
   const connection = new signalR.HubConnectionBuilder()
     .withUrl(hubUrl)
     .withAutomaticReconnect([0, 2000, 10000, 30000, 60000, 300000]) // Progressive backoff
     .build();
   
   connection.onreconnecting(error => {
     // Update UI to show reconnecting state
     setConnectionState(\"Reconnecting\");
     console.warn(\"Connection lost, reconnecting...\", error);
   });
   
   connection.onreconnected(connectionId => {
     // Update UI to show reconnected state
     setConnectionState(\"Connected\");
     console.info(\"Connection reestablished.\");
     
     // Re-subscribe to necessary data streams
     resubscribeToDataStreams();
   });
   ```

2. **Connection Keepalive:**
   Adjust server-side keepalive settings for more reliable connections:

   ```csharp
   services.AddSignalR(options => {
       options.ClientTimeoutInterval = TimeSpan.FromMinutes(2);
       options.KeepAliveInterval = TimeSpan.FromSeconds(15);
   });
   ```

3. **Azure SignalR Service:**
   For production environments, migrate to Azure SignalR Service for better reliability:

   ```csharp
   services.AddSignalR().AddAzureSignalR(Configuration[\"Azure:SignalR:ConnectionString\"]);
   ```

## Authentication Problems

### Token Expiration Issues

**Symptoms:**
- Connections work initially but fail after some time
- \"Unauthorized\" errors appear in logs after running for a while
- Authentication required errors in the browser console

**Diagnostic Steps:**

1. **Check token lifecycle:**
   - Log token issuance and expiration times
   - Verify token handling in the application
   - Monitor authentication state across page refreshes

2. **Inspect token claims and expiration:**
   ```javascript
   // Decode JWT token (client-side)
   function decodeJwt(token) {
     const base64Url = token.split('.')[1];
     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
     const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
       return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
     }).join(''));
     return JSON.parse(jsonPayload);
   }
   
   // Check expiration time
   const decodedToken = decodeJwt(authToken);
   console.log(\"Token expires:\", new Date(decodedToken.exp * 1000).toLocaleString());
   ```

**Solutions:**

1. **Proactive Token Renewal:**
   Implement token refresh logic before expiration:

   ```typescript
   export const useAuthToken = () => {
     const [token, setToken] = useState<string | null>(null);
     
     // Function to fetch a new token
     const refreshToken = useCallback(async () => {
       try {
         const newToken = await getTeamsAuthToken();
         setToken(newToken);
         return newToken;
       } catch (error) {
         console.error('Failed to refresh token:', error);
         return null;
       }
     }, []);
     
     // Set up automatic token refresh
     useEffect(() => {
       const fetchInitialToken = async () => {
         await refreshToken();
       };
       
       fetchInitialToken();
       
       // Set up refresh interval (refresh 5 minutes before expiration)
       const interval = setInterval(async () => {
         if (token) {
           const decoded = decodeJwt(token);
           const expiryTime = decoded.exp * 1000;
           const currentTime = Date.now();
           const timeToExpiry = expiryTime - currentTime;
           
           // If token expires in less than 5 minutes, refresh it
           if (timeToExpiry < 300000) {
             await refreshToken();
           }
         }
       }, 60000); // Check every minute
       
       return () => clearInterval(interval);
     }, [refreshToken, token]);
     
     return { token, refreshToken };
   };
   ```

2. **Update SignalR Connection to Handle Token Updates:**
   ```typescript
   // Create a connection with a token provider function
   const connection = new signalR.HubConnectionBuilder()
     .withUrl(hubUrl, { 
       accessTokenFactory: async () => {
         // This will be called whenever the connection needs to authenticate
         const currentToken = await authService.getCurrentToken();
         if (authService.isTokenExpiring(currentToken)) {
           return await authService.refreshToken();
         }
         return currentToken;
       }
     })
     .build();
   ```

### Single Sign-On (SSO) Issues

**Symptoms:**
- Users repeatedly prompted for authentication
- Authentication works in the browser but fails in Teams
- Inconsistent authentication experience across different clients

**Diagnostic Steps:**

1. **Validate Teams SSO configuration:**
   - Check Teams app manifest for correct OAuth settings
   - Verify Azure AD application registration
   - Test authentication flow outside of Teams context

2. **Check consent status:**
   - Verify if admin consent was provided for organization-wide permissions
   - Check user consent status for required permissions

**Solutions:**

1. **Correct Teams App Manifest Configuration:**
   Ensure proper WebApplicationInfo section in manifest:

   ```json
   \"webApplicationInfo\": {
     \"id\": \"your-azure-ad-app-id\",
     \"resource\": \"api://yourdomain.com/your-azure-ad-app-id\"
   }
   ```

2. **Implement Teams SSO Authentication:**
   ```typescript
   import * as microsoftTeams from \"@microsoft/teams-js\";
   
   const getTeamsAuthToken = async () => {
     return new Promise<string>((resolve, reject) => {
       microsoftTeams.initialize();
       
       // Get SSO token from Teams
       microsoftTeams.authentication.getAuthToken({
         successCallback: (token) => {
           resolve(token);
         },
         failureCallback: (error) => {
           console.error(\"Error getting SSO token:\", error);
           reject(error);
         }
       });
     });
   };
   
   // Exchange Teams token for access token with required scopes
   const exchangeTeamsTokenForGraphToken = async (teamsToken) => {
     const response = await fetch('https://your-backend-api/exchangeToken', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ token: teamsToken })
     });
     
     if (!response.ok) {
       throw new Error('Failed to exchange token');
     }
     
     const { accessToken } = await response.json();
     return accessToken;
   };
   ```

3. **Server-Side Token Exchange:**
   Implement an API to exchange Teams token for a properly scoped Graph token:

   ```csharp
   [HttpPost(\"exchangeToken\")]
   public async Task<IActionResult> ExchangeToken([FromBody] TokenRequest request)
   {
       try
       {
           // Validate the Teams token
           var validationResult = await _tokenValidator.ValidateTokenAsync(request.Token);
           if (!validationResult.IsValid)
           {
               return Unauthorized(\"Invalid Teams token\");
           }
           
           // Exchange for Graph token with On-Behalf-Of flow
           var graphToken = await _tokenService.GetOnBehalfOfTokenAsync(
               request.Token, 
               new[] { \"https://graph.microsoft.com/User.Read\" }
           );
           
           return Ok(new { accessToken = graphToken });
       }
       catch (Exception ex)
       {
           _logger.LogError(ex, \"Token exchange failed\");
           return StatusCode(500, \"Token exchange failed\");
       }
   }
   ```

## Data Visualization Issues

### Charts Not Rendering

**Symptoms:**
- Blank space where charts should appear
- JavaScript errors in console related to chart rendering
- Charts appear briefly and then disappear

**Diagnostic Steps:**

1. **Inspect client-side errors:**
   - Check browser console for JavaScript errors
   - Verify DOM elements for chart containers are present
   - Confirm data is being received correctly

2. **Validate data format:**
   - Log the data structure being passed to charting components
   - Check for null or undefined values in critical fields
   - Verify data types match chart component expectations

**Solutions:**

1. **Implement Data Validation and Transformation:**
   ```typescript
   const prepareChartData = (rawData) => {
     // Guard against missing data
     if (!rawData || !Array.isArray(rawData.series)) {
       console.warn('Invalid data format received:', rawData);
       return null;
     }
     
     // Transform data into chart-friendly format
     return {
       labels: rawData.series.map(item => {
         // Format date as readable string
         return new Date(item.timestamp).toLocaleTimeString();
       }),
       datasets: [{
         label: rawData.metricName || 'Value',
         data: rawData.series.map(item => {
           // Ensure numeric values and handle nulls
           return item.value !== null ? Number(item.value) : null;
         }),
         borderColor: '#0078d4',
         backgroundColor: 'rgba(0, 120, 212, 0.1)',
         tension: 0.4
       }]
     };
   };
   ```

2. **Add Fallback Rendering:**
   ```typescript
   const DataChart = ({ data }) => {
     const chartRef = useRef(null);
     const [renderError, setRenderError] = useState(false);
     
     useEffect(() => {
       if (!data) return;
       
       try {
         const chartData = prepareChartData(data);
         if (!chartData) {
           setRenderError(true);
           return;
         }
         
         // Render chart with the data
         const chart = new Chart(chartRef.current, {
           type: 'line',
           data: chartData,
           options: chartOptions
         });
         
         return () => chart.destroy();
       } catch (error) {
         console.error('Chart rendering failed:', error);
         setRenderError(true);
       }
     }, [data]);
     
     if (renderError) {
       return (
         <div className=\"chart-error\">
           <p>Unable to display chart. Data format may be invalid.</p>
           <pre>{JSON.stringify(data, null, 2)}</pre>
         </div>
       );
     }
     
     return (
       <div className=\"chart-container\">
         <canvas ref={chartRef} />
       </div>
     );
   };
   ```

3. **Optimize Chart Rendering for Teams:**
   ```typescript
   // Teams-specific chart options
   const getChartOptions = (theme) => {
     const isDarkTheme = theme === 'dark';
     
     return {
       responsive: true,
       maintainAspectRatio: false,
       animation: {
         duration: 150 // Faster animations for better performance
       },
       scales: {
         x: {
           grid: {
             color: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
           },
           ticks: {
             color: isDarkTheme ? '#ffffff' : '#333333',
             maxRotation: 0, // Horizontal labels
             autoSkip: true,
             maxTicksLimit: 8 // Limit number of labels shown
           }
         },
         y: {
           grid: {
             color: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
           },
           ticks: {
             color: isDarkTheme ? '#ffffff' : '#333333'
           }
         }
       },
       plugins: {
         legend: {
           labels: {
             color: isDarkTheme ? '#ffffff' : '#333333'
           }
         },
         tooltip: {
           backgroundColor: isDarkTheme ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
           titleColor: isDarkTheme ? '#ffffff' : '#333333',
           bodyColor: isDarkTheme ? '#ffffff' : '#333333',
           borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
           borderWidth: 1
         }
       }
     };
   };
   ```

### Data Not Updating in Real-time

**Symptoms:**
- Chart displays initial data but doesn't update
- Updates occur only after page refresh
- Delayed or inconsistent updates

**Diagnostic Steps:**

1. **Verify SignalR message reception:**
   - Add console logging for received messages
   - Check if event handlers are being triggered
   - Monitor network traffic for incoming WebSocket messages

2. **Inspect component update lifecycle:**
   - Check React component re-rendering
   - Verify state updates are triggering correctly
   - Look for component optimization issues that might prevent updates

**Solutions:**

1. **Debug SignalR Message Reception:**
   Add comprehensive logging to trace the message flow:

   ```typescript
   useEffect(() => {
     if (!connection) return;
     
     console.log(\"Setting up SignalR message handlers\");
     
     // Register handler with detailed logging
     connection.on(\"ReceiveDataUpdate\", (update) => {
       console.log(\"Data update received:\", update);
       console.log(\"Previous data state:\", data);
       
       // Update state with new data
       setData(prevData => {
         const newData = { ...prevData, ...update };
         console.log(\"New data state:\", newData);
         return newData;
       });
     });
     
     return () => {
       console.log(\"Removing SignalR message handlers\");
       connection.off(\"ReceiveDataUpdate\");
     };
   }, [connection, setData]);
   ```

2. **Implement Optimized State Updates:**
   ```typescript
   // Custom hook for handling real-time data updates with optimization
   export const useRealTimeData = (initialData = null) => {
     const [data, setData] = useState(initialData);
     const updateQueue = useRef([]);
     const processingUpdates = useRef(false);
     
     // Process updates in batches to avoid excessive re-renders
     const processUpdateQueue = useCallback(() => {
       if (processingUpdates.current || updateQueue.current.length === 0) {
         return;
       }
       
       processingUpdates.current = true;
       
       // Take all current updates and clear the queue
       const updates = [...updateQueue.current];
       updateQueue.current = [];
       
       // Apply all updates at once
       setData(currentData => {
         return updates.reduce((result, update) => {
           return { ...result, ...update };
         }, currentData || {});
       });
       
       processingUpdates.current = false;
       
       // Process any new updates that may have been added
       if (updateQueue.current.length > 0) {
         setTimeout(processUpdateQueue, 0);
       }
     }, []);
     
     // Function to queue an update
     const queueUpdate = useCallback((update) => {
       updateQueue.current.push(update);
       
       if (!processingUpdates.current) {
         processUpdateQueue();
       }
     }, [processUpdateQueue]);
     
     return [data, queueUpdate, setData];
   };
   ```

3. **Implement Health Check for Real-time Updates:**
   ```typescript
   // Monitor update health and reconnect if needed
   export const useUpdateHealthCheck = (connection, expectedIntervalMs = 5000) => {
     const [updateHealth, setUpdateHealth] = useState('unknown');
     const lastUpdateTime = useRef(Date.now());
     
     useEffect(() => {
       if (!connection) return;
       
       // Handler for data updates
       const handleDataUpdate = () => {
         lastUpdateTime.current = Date.now();
         setUpdateHealth('healthy');
       };
       
       // Register for updates
       connection.on(\"ReceiveDataUpdate\", handleDataUpdate);
       
       // Check update health periodically
       const healthCheckInterval = setInterval(() => {
         const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
         
         if (timeSinceLastUpdate > expectedIntervalMs * 3) {
           // No updates in 3x the expected interval - unhealthy
           setUpdateHealth('unhealthy');
           
           // Attempt to reset connection if in connected state
           if (connection.state === 'Connected') {
             console.warn('No updates received for an extended period. Restarting connection...');
             connection.stop().then(() => connection.start());
           }
         } else if (timeSinceLastUpdate > expectedIntervalMs * 1.5) {
           // No updates in 1.5x the expected interval - warning
           setUpdateHealth('warning');
         }
       }, Math.min(expectedIntervalMs, 10000));
       
       return () => {
         clearInterval(healthCheckInterval);
         connection.off(\"ReceiveDataUpdate\", handleDataUpdate);
       };
     }, [connection, expectedIntervalMs]);
     
     return updateHealth;
   };
   ```

## SignalR Specific Problems

### Transport Negotiation Failures

**Symptoms:**
- \"Error during negotiation request\" in console
- Connection attempts fail during negotiation phase
- Repeated failed connection attempts

**Diagnostic Steps:**

1. **Monitor negotiation requests:**
   - Check Network tab in browser tools for negotiation request
   - Verify response content and status codes
   - Look for specific error messages in response

2. **Test endpoint access:**
   - Verify `/negotiate` endpoint is accessible
   - Check for CORS issues in preflight requests
   - Confirm authentication headers are correct

**Solutions:**

1. **Explicitly Configure Transport Options:**
   ```typescript
   const connection = new signalR.HubConnectionBuilder()
     .withUrl(hubUrl, {
       skipNegotiation: false,
       transport: signalR.HttpTransportType.WebSockets | 
                 signalR.HttpTransportType.ServerSentEvents |
                 signalR.HttpTransportType.LongPolling
     })
     .build();
   ```

2. **Server-side Transport Configuration:**
   ```csharp
   services.AddSignalR(options => {
       // Enable detailed errors for debugging
       options.EnableDetailedErrors = true;
   }).AddHubOptions<DataHub>(options => {
       // Configure supported transports
       options.SupportedProtocols = new List<string> { 
           \"websocket\", 
           \"serversentevents\", 
           \"longpolling\" 
       };
   });
   ```

3. **CORS Configuration for Negotiation:**
   ```csharp
   app.UseCors(builder => {
       builder.WithOrigins(\"https://*.teams.microsoft.com\")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .WithExposedHeaders(\"Content-Disposition\"); // Important for file downloads
   });
   
   // MUST be placed in the correct middleware order
   app.UseRouting();
   app.UseCors(\"TeamsPolicy\"); // Apply CORS before endpoints
   app.UseAuthentication();
   app.UseAuthorization();
   app.UseEndpoints(endpoints => {
       endpoints.MapHub<DataHub>(\"/datahub\");
   });
   ```

### Group Subscription Issues

**Symptoms:**
- Some users don't receive updates for specific data streams
- Updates are broadcast to all users instead of specific groups
- Inconsistent update behavior across users

**Diagnostic Steps:**

1. **Verify group management:**
   - Log group addition and removal operations
   - Check group membership during connection and message sending
   - Validate group names and connection IDs

2. **Test group messaging:**
   - Create a test endpoint to manually send messages to specific groups
   - Verify message routing behavior with different group configurations

**Solutions:**

1. **Implement Robust Group Management:**
   ```csharp
   public class DataHub : Hub
   {
       private readonly ILogger<DataHub> _logger;
       private static readonly ConcurrentDictionary<string, HashSet<string>> _connectionGroups = 
           new ConcurrentDictionary<string, HashSet<string>>();
       
       public DataHub(ILogger<DataHub> logger)
       {
           _logger = logger;
       }
       
       public override async Task OnConnectedAsync()
       {
           _logger.LogInformation(\"Client connected: {ConnectionId}\", Context.ConnectionId);
           await base.OnConnectedAsync();
       }
       
       public override async Task OnDisconnectedAsync(Exception exception)
       {
           // Clean up group memberships for this connection
           var connectionId = Context.ConnectionId;
           
           // Find all groups this connection was a member of
           var groupsToRemove = _connectionGroups
               .Where(kvp => kvp.Value.Contains(connectionId))
               .Select(kvp => kvp.Key)
               .ToList();
           
           // Remove connection from all groups
           foreach (var groupName in groupsToRemove)
           {
               await Groups.RemoveFromGroupAsync(connectionId, groupName);
               
               // Update in-memory tracking
               if (_connectionGroups.TryGetValue(groupName, out var connections))
               {
                   connections.Remove(connectionId);
               }
           }
           
           _logger.LogInformation(\"Client disconnected: {ConnectionId}\", connectionId);
           await base.OnDisconnectedAsync(exception);
       }
       
       public async Task SubscribeToDataStream(string streamId)
       {
           try
           {
               var connectionId = Context.ConnectionId;
               
               // Validate the stream ID
               if (string.IsNullOrEmpty(streamId))
               {
                   _logger.LogWarning(\"Invalid stream ID provided by {ConnectionId}\", connectionId);
                   throw new HubException(\"Invalid stream ID\");
               }
               
               // Add to SignalR group
               await Groups.AddToGroupAsync(connectionId, streamId);
               
               // Track in memory
               _connectionGroups.AddOrUpdate(
                   streamId,
                   new HashSet<string> { connectionId },
                   (key, existingSet) => {
                       existingSet.Add(connectionId);
                       return existingSet;
                   }
               );
               
               _logger.LogInformation(\"Client {ConnectionId} subscribed to stream {StreamId}\", 
                   connectionId, streamId);
               
               // Notify client of successful subscription
               await Clients.Caller.SendAsync(\"SubscriptionConfirmed\", streamId);
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, \"Error subscribing to data stream\");
               throw;
           }
       }
       
       public async Task UnsubscribeFromDataStream(string streamId)
       {
           try
           {
               var connectionId = Context.ConnectionId;
               
               // Remove from SignalR group
               await Groups.RemoveFromGroupAsync(connectionId, streamId);
               
               // Update in-memory tracking
               if (_connectionGroups.TryGetValue(streamId, out var connections))
               {
                   connections.Remove(connectionId);
               }
               
               _logger.LogInformation(\"Client {ConnectionId} unsubscribed from stream {StreamId}\", 
                   connectionId, streamId);
               
               // Notify client of successful unsubscription
               await Clients.Caller.SendAsync(\"UnsubscriptionConfirmed\", streamId);
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, \"Error unsubscribing from data stream\");
               throw;
           }
       }
   }
   ```

2. **Client-side Subscription Management:**
   ```typescript
   export const useDataStreamSubscription = (connection, streamIds) => {
     const [subscriptions, setSubscriptions] = useState({});
     const [isLoading, setIsLoading] = useState(true);
     const [error, setError] = useState(null);
     
     useEffect(() => {
       if (!connection || !streamIds || streamIds.length === 0) {
         return;
       }
       
       const subscribeToStreams = async () => {
         setIsLoading(true);
         setError(null);
         
         try {
           // Set up confirmation handlers
           connection.on(\"SubscriptionConfirmed\", (streamId) => {
             console.log(`Subscription confirmed for stream: ${streamId}`);
             setSubscriptions(prev => ({
               ...prev,
               [streamId]: { status: 'subscribed', timestamp: Date.now() }
             }));
           });
           
           connection.on(\"UnsubscriptionConfirmed\", (streamId) => {
             console.log(`Unsubscription confirmed for stream: ${streamId}`);
             setSubscriptions(prev => {
               const newSubscriptions = { ...prev };
               delete newSubscriptions[streamId];
               return newSubscriptions;
             });
           });
           
           // Subscribe to each stream
           const subscriptionPromises = streamIds.map(async (streamId) => {
             try {
               await connection.invoke(\"SubscribeToDataStream\", streamId);
               return streamId;
             } catch (err) {
               console.error(`Failed to subscribe to ${streamId}:`, err);
               throw err;
             }
           });
           
           await Promise.all(subscriptionPromises);
           setIsLoading(false);
         } catch (err) {
           setError(err);
           setIsLoading(false);
         }
       };
       
       if (connection.state === \"Connected\") {
         subscribeToStreams();
       } else {
         connection.onreconnected(() => {
           // Resubscribe when reconnection happens
           subscribeToStreams();
         });
       }
       
       return () => {
         // Unsubscribe when component unmounts
         if (connection && connection.state === \"Connected\") {
           Object.keys(subscriptions).forEach(streamId => {
             connection.invoke(\"UnsubscribeFromDataStream\", streamId)
               .catch(err => console.error(`Error unsubscribing from ${streamId}:`, err));
           });
         }
         
         connection.off(\"SubscriptionConfirmed\");
         connection.off(\"UnsubscriptionConfirmed\");
       };
     }, [connection, JSON.stringify(streamIds)]);
     
     return { subscriptions, isLoading, error };
   };
   ```

### Message Size Limitations

**Symptoms:**
- Large data updates fail to transmit
- \"Maximum message size exceeded\" errors
- Truncated data received by clients

**Diagnostic Steps:**

1. **Monitor message sizes:**
   - Log payload sizes before sending
   - Check WebSocket frame sizes
   - Look for errors related to message size limits

2. **Analyze data patterns:**
   - Identify which data streams exceed size limits
   - Check for unnecessarily large payloads
   - Monitor frequency and size of updates

**Solutions:**

1. **Increase SignalR Message Size Limit:**
   ```csharp
   services.AddSignalR(options => {
       // Increase maximum message size (default is 32KB)
       options.MaximumReceiveMessageSize = 512 * 1024; // 512KB
   });
   ```

2. **Implement Data Pagination:**
   ```csharp
   public async Task SendLargeDataUpdate(string streamId, byte[] data)
   {
       // Configuration
       const int chunkSize = 30000; // ~30KB chunks
       
       // Calculate number of chunks needed
       int totalChunks = (int)Math.Ceiling(data.Length / (double)chunkSize);
       
       // Send metadata first
       await Clients.Group(streamId).SendAsync(\"DataUpdateStart\", new {
           StreamId = streamId,
           TotalChunks = totalChunks,
           TotalSize = data.Length,
           UpdateId = Guid.NewGuid().ToString()
       });
       
       // Send each chunk
       for (int i = 0; i < totalChunks; i++)
       {
           int startIndex = i * chunkSize;
           int length = Math.Min(chunkSize, data.Length - startIndex);
           byte[] chunk = new byte[length];
           Array.Copy(data, startIndex, chunk, 0, length);
           
           await Clients.Group(streamId).SendAsync(\"DataUpdateChunk\", new {
               StreamId = streamId,
               ChunkIndex = i,
               Data = Convert.ToBase64String(chunk)
           });
       }
       
       // Signal completion
       await Clients.Group(streamId).SendAsync(\"DataUpdateComplete\", streamId);
   }
   ```

3. **Client-side Chunk Assembly:**
   ```typescript
   // Handler for large data updates
   export const useLargeDataStream = (connection) => {
     const [isReceiving, setIsReceiving] = useState(false);
     const [progress, setProgress] = useState(0);
     const [data, setData] = useState(null);
     
     const dataBuffer = useRef({});
     
     useEffect(() => {
       if (!connection) return;
       
       connection.on(\"DataUpdateStart\", (metadata) => {
         setIsReceiving(true);
         setProgress(0);
         
         // Initialize buffer for this update
         dataBuffer.current[metadata.UpdateId] = {
           chunks: new Array(metadata.TotalChunks),
           received: 0,
           totalChunks: metadata.TotalChunks,
           streamId: metadata.StreamId
         };
       });
       
       connection.on(\"DataUpdateChunk\", (chunk) => {
         const updateBuffer = Object.values(dataBuffer.current)
           .find(buffer => buffer.streamId === chunk.StreamId);
         
         if (updateBuffer) {
           // Store this chunk
           updateBuffer.chunks[chunk.ChunkIndex] = chunk.Data;
           updateBuffer.received++;
           
           // Update progress
           setProgress(Math.floor((updateBuffer.received / updateBuffer.totalChunks) * 100));
         }
       });
       
       connection.on(\"DataUpdateComplete\", (streamId) => {
         // Find the buffer for this stream
         const updateId = Object.keys(dataBuffer.current)
           .find(key => dataBuffer.current[key].streamId === streamId);
         
         if (updateId) {
           const updateBuffer = dataBuffer.current[updateId];
           
           // Combine all chunks
           const base64Data = updateBuffer.chunks.join('');
           try {
             // Decode base64 data
             const binaryData = atob(base64Data);
             
             // Convert to appropriate format and update state
             const parsedData = JSON.parse(binaryData);
             setData(parsedData);
             
             // Clean up buffer
             delete dataBuffer.current[updateId];
           } catch (error) {
             console.error(\"Error processing assembled data:\", error);
           }
           
           setIsReceiving(false);
         }
       });
       
       return () => {
         connection.off(\"DataUpdateStart\");
         connection.off(\"DataUpdateChunk\");
         connection.off(\"DataUpdateComplete\");
       };
     }, [connection]);
     
     return { data, isReceiving, progress };
   };
   ```

## Performance Optimization

### High CPU Usage

**Symptoms:**
- Teams client becomes sluggish when tab is active
- High CPU utilization in browser's task manager
- Performance degrades over time

**Diagnostic Steps:**

1. **Profile rendering performance:**
   - Use browser Performance tools to identify bottlenecks
   - Monitor component render counts
   - Check for frequent re-renders

2. **Analyze data update patterns:**
   - Identify update frequency and volume
   - Look for redundant or inefficient data processing
   - Monitor memory usage patterns

**Solutions:**

1. **Optimize React Component Rendering:**
   ```typescript
   // Use React.memo to prevent unnecessary re-renders
   const DataDisplay = React.memo(({ data }) => {
     // Component implementation
   }, (prevProps, nextProps) => {
     // Custom comparison function
     // Return true if props are equal (no re-render needed)
     if (!prevProps.data && !nextProps.data) return true;
     if (!prevProps.data || !nextProps.data) return false;
     
     // Compare only what matters for rendering
     return prevProps.data.timestamp === nextProps.data.timestamp &&
            prevProps.data.value === nextProps.data.value;
   });
   ```

2. **Throttle Real-time Updates:**
   ```typescript
   import { throttle } from 'lodash';

   export const useThrottledDataUpdates = (connection, updateInterval = 1000) => {
     const [data, setData] = useState(null);
     const pendingUpdate = useRef(null);
     
     // Create throttled update function
     const throttledUpdate = useCallback(
       throttle((newData) => {
         setData(newData);
         pendingUpdate.current = null;
       }, updateInterval, { leading: false, trailing: true }),
       [updateInterval]
     );
     
     useEffect(() => {
       if (!connection) return;
       
       connection.on(\"ReceiveDataUpdate\", (update) => {
         // Store the latest update
         pendingUpdate.current = update;
         
         // Apply throttled update
         throttledUpdate(update);
       });
       
       return () => {
         connection.off(\"ReceiveDataUpdate\");
         throttledUpdate.cancel();
       };
     }, [connection, throttledUpdate]);
     
     return data;
   };
   ```

3. **Implement Virtual Rendering for Large Datasets:**
   ```typescript
   import { FixedSizeList as List } from 'react-window';
   
   const DataTable = ({ items }) => {
     // Render only the visible portion of a large dataset
     return (
       <List
         height={500}
         width=\"100%\"
         itemCount={items.length}
         itemSize={35}
       >
         {({ index, style }) => (
           <div style={style} className=\"data-row\">
             <div>{items[index].timestamp}</div>
             <div>{items[index].value}</div>
           </div>
         )}
       </List>
     );
   };
   ```

### Memory Leaks

**Symptoms:**
- Tab performance degrades over time
- Memory usage continuously increases
- Browser eventually crashes or becomes unresponsive

**Diagnostic Steps:**

1. **Monitor memory usage:**
   - Use browser Memory tools to take snapshots
   - Compare snapshots to identify retained objects
   - Look for detached DOM elements

2. **Check for stale closures and event listeners:**
   - Review useEffect cleanup functions
   - Check for subscription cleanup
   - Verify event listener removal

**Solutions:**

1. **Proper Effect Cleanup:**
   ```typescript
   useEffect(() => {
     // Component event listeners
     window.addEventListener('resize', handleResize);
     
     // SignalR event handlers
     connection.on(\"DataUpdate\", handleDataUpdate);
     
     // Periodic operations
     const refreshInterval = setInterval(refreshData, 30000);
     
     // Cleanup function - crucial for preventing memory leaks
     return () => {
       // Remove event listeners
       window.removeEventListener('resize', handleResize);
       
       // Remove SignalR handlers
       connection.off(\"DataUpdate\", handleDataUpdate);
       
       // Clear any timers
       clearInterval(refreshInterval);
     };
   }, [connection]);
   ```

2. **Implementing a Garbage Collection Mechanism:**
   ```typescript
   export const useDataCache = (maxCacheSize = 1000) => {
     const [cache, setCache] = useState({});
     
     // Add data to cache
     const addToCache = useCallback((key, data) => {
       setCache(prevCache => {
         const newCache = { ...prevCache, [key]: { data, timestamp: Date.now() } };
         
         // Check if cache has grown too large
         if (Object.keys(newCache).length > maxCacheSize) {
           return pruneCache(newCache);
         }
         
         return newCache;
       });
     }, [maxCacheSize]);
     
     // Prune the cache when it gets too large
     const pruneCache = useCallback((currentCache) => {
       // Sort entries by age
       const entries = Object.entries(currentCache)
         .sort((a, b) => a[1].timestamp - b[1].timestamp);
       
       // Remove oldest 25% of entries
       const removeCount = Math.floor(entries.length * 0.25);
       const prunedEntries = entries.slice(removeCount);
       
       // Rebuild cache from remaining entries
       return prunedEntries.reduce((newCache, [key, value]) => {
         newCache[key] = value;
         return newCache;
       }, {});
     }, []);
     
     // Periodically clean up old data (older than 1 hour)
     useEffect(() => {
       const cleanupInterval = setInterval(() => {
         const oneHourAgo = Date.now() - (60 * 60 * 1000);
         
         setCache(prevCache => {
           const newCache = { ...prevCache };
           
           // Remove entries older than 1 hour
           Object.keys(newCache).forEach(key => {
             if (newCache[key].timestamp < oneHourAgo) {
               delete newCache[key];
             }
           });
           
           return newCache;
         });
       }, 15 * 60 * 1000); // Run every 15 minutes
       
       return () => clearInterval(cleanupInterval);
     }, []);
     
     return [cache, addToCache];
   };
   ```

3. **Optimize Chart Rendering to Prevent Memory Leaks:**
   ```typescript
   const DataChart = ({ data }) => {
     const chartRef = useRef(null);
     const chartInstance = useRef(null);
     
     useEffect(() => {
       // If chart instance exists, destroy it before creating a new one
       if (chartInstance.current) {
         chartInstance.current.destroy();
         chartInstance.current = null;
       }
       
       if (!chartRef.current || !data) return;
       
       // Create new chart
       const ctx = chartRef.current.getContext('2d');
       chartInstance.current = new Chart(ctx, {
         type: 'line',
         data: {
           // Chart data configuration
         },
         options: {
           // Chart options
         }
       });
       
       // Ensure chart is destroyed on unmount
       return () => {
         if (chartInstance.current) {
           chartInstance.current.destroy();
           chartInstance.current = null;
         }
       };
     }, [data]);
     
     return <canvas ref={chartRef} />;
   };
   ```

## Teams Integration Challenges

### Theme Adaptation Issues

**Symptoms:**
- UI elements don't match Teams theme
- Text unreadable in dark mode
- Visual inconsistencies when switching themes

**Diagnostic Steps:**

1. **Test theme detection:**
   - Verify Teams context theme property is correctly read
   - Check CSS class application based on theme
   - Test theme switching behavior

2. **Inspect style conflicts:**
   - Look for hardcoded colors that override theme
   - Check for CSS specificity issues
   - Verify chart theming configuration

**Solutions:**

1. **Implement Teams Theme Integration:**
   ```typescript
   import * as microsoftTeams from \"@microsoft/teams-js\";
   import { createContext, useContext, useEffect, useState } from \"react\";

   // Create a theme context
   const TeamsThemeContext = createContext({
     theme: 'default',
     colors: {
       brand: '#0078d4',
       text: '#252423',
       background: '#f5f5f5'
     }
   });

   export const TeamsThemeProvider = ({ children }) => {
     const [themeState, setThemeState] = useState({
       theme: 'default',
       colors: {
         brand: '#0078d4',
         text: '#252423',
         background: '#f5f5f5'
       }
     });
     
     useEffect(() => {
       microsoftTeams.initialize();
       
       // Get current theme
       microsoftTeams.getContext((context) => {
         updateTheme(context.theme);
       });
       
       // Register for theme changes
       microsoftTeams.registerOnThemeChangeHandler((theme) => {
         updateTheme(theme);
       });
       
       // Map Teams theme to color tokens
       const updateTheme = (theme) => {
         let colors = {};
         
         switch (theme) {
           case 'dark':
             colors = {
               brand: '#0078d4',
               text: '#ffffff',
               background: '#201f1f',
               surfaceLow: '#2d2c2c',
               surfaceNeutral: '#3b3a39',
               surfaceHigh: '#484644',
               borderLow: '#605e5c',
               borderHigh: '#979593'
             };
             break;
             
           case 'contrast':
             colors = {
               brand: '#ffff00',
               text: '#ffffff',
               background: '#000000',
               surfaceLow: '#1f1f1f',
               surfaceNeutral: '#2d2d2d',
               surfaceHigh: '#3b3b3b',
               borderLow: '#ffffff',
               borderHigh: '#ffffff'
             };
             break;
             
           default: // light
             colors = {
               brand: '#0078d4',
               text: '#252423',
               background: '#f5f5f5',
               surfaceLow: '#f3f2f1',
               surfaceNeutral: '#edebe9',
               surfaceHigh: '#e1dfdd',
               borderLow: '#c8c6c4',
               borderHigh: '#9b9899'
             };
         }
         
         setThemeState({
           theme,
           colors
         });
         
         // Apply theme to document
         document.body.setAttribute('data-theme', theme);
       };
     }, []);
     
     return (
       <TeamsThemeContext.Provider value={themeState}>
         {children}
       </TeamsThemeContext.Provider>
     );
   };

   // Hook to use theme
   export const useTeamsTheme = () => useContext(TeamsThemeContext);
   ```

2. **Apply Theme Using CSS Variables:**
   ```css
   /* Base theme setup */
   :root {
     /* Default (light) theme variables */
     --brand-color: #0078d4;
     --text-color: #252423;
     --background-color: #f5f5f5;
     --surface-color: #ffffff;
     --border-color: #c8c6c4;
     --chart-grid-color: rgba(0, 0, 0, 0.1);
     --chart-line-color: #0078d4;
     --chart-background: rgba(0, 120, 212, 0.1);
   }

   /* Dark theme */
   [data-theme='dark'] {
     --brand-color: #0078d4;
     --text-color: #ffffff;
     --background-color: #201f1f;
     --surface-color: #2d2c2c;
     --border-color: #605e5c;
     --chart-grid-color: rgba(255, 255, 255, 0.1);
     --chart-line-color: #1aebff;
     --chart-background: rgba(26, 235, 255, 0.1);
   }

   /* High contrast theme */
   [data-theme='contrast'] {
     --brand-color: #ffff00;
     --text-color: #ffffff;
     --background-color: #000000;
     --surface-color: #1f1f1f;
     --border-color: #ffffff;
     --chart-grid-color: rgba(255, 255, 255, 0.5);
     --chart-line-color: #ffff00;
     --chart-background: transparent;
   }

   /* Apply theme variables to components */
   .card {
     background-color: var(--surface-color);
     color: var(--text-color);
     border: 1px solid var(--border-color);
   }

   .button-primary {
     background-color: var(--brand-color);
     color: white;
   }

   .chart-container {
     background-color: var(--surface-color);
     border: 1px solid var(--border-color);
   }
   ```

3. **Theme-Aware Charts:**
   ```typescript
   import { useTeamsTheme } from './TeamsThemeProvider';

   const ThemedChart = ({ data }) => {
     const { theme, colors } = useTeamsTheme();
     const chartRef = useRef(null);
     
     useEffect(() => {
       if (!chartRef.current || !data) return;
       
       const isDarkTheme = theme === 'dark';
       const isContrastTheme = theme === 'contrast';
       
       const chart = new Chart(chartRef.current, {
         type: 'line',
         data: {
           labels: data.labels,
           datasets: [{
             label: data.title,
             data: data.values,
             borderColor: isContrastTheme ? '#ffff00' : 
                           isDarkTheme ? '#1aebff' : '#0078d4',
             backgroundColor: isContrastTheme ? 'transparent' : 
                              isDarkTheme ? 'rgba(26, 235, 255, 0.1)' : 
                                           'rgba(0, 120, 212, 0.1)',
             tension: 0.4,
             borderWidth: isContrastTheme ? 3 : 2
           }]
         },
         options: {
           responsive: true,
           scales: {
             x: {
               grid: {
                 color: isContrastTheme ? 'rgba(255, 255, 255, 0.5)' : 
                         isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 
                                      'rgba(0, 0, 0, 0.1)'
               },
               ticks: {
                 color: colors.text
               }
             },
             y: {
               grid: {
                 color: isContrastTheme ? 'rgba(255, 255, 255, 0.5)' : 
                         isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 
                                      'rgba(0, 0, 0, 0.1)'
               },
               ticks: {
                 color: colors.text
               }
             }
           },
           plugins: {
             legend: {
               labels: {
                 color: colors.text
               }
             },
             tooltip: {
               backgroundColor: isDarkTheme ? '#3b3a39' : '#ffffff',
               titleColor: colors.text,
               bodyColor: colors.text,
               borderColor: colors.borderLow,
               borderWidth: 1
             }
           }
         }
       });
       
       return () => chart.destroy();
     }, [data, theme, colors]);
     
     return <canvas ref={chartRef} />;
   };
   ```

### Mobile Responsiveness Issues

**Symptoms:**
- UI elements overlap or cut off on mobile
- Charts unreadable on small screens
- Interaction difficult on touch devices

**Diagnostic Steps:**

1. **Test across device sizes:**
   - Use browser device emulation
   - Check breakpoint behavior
   - Test touch interactions

2. **Analyze layout issues:**
   - Identify fixed-width elements
   - Check for overflow issues
   - Look for touch target size problems

**Solutions:**

1. **Implement Responsive Layouts:**
   ```css
   /* Base responsive grid */
   .dashboard-grid {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
     gap: 16px;
     width: 100%;
   }

   /* Adjust for mobile */
   @media (max-width: 480px) {
     .dashboard-grid {
       grid-template-columns: 1fr;
     }
     
     .dashboard-card {
       min-height: 200px;
     }
     
     .data-table {
       font-size: 14px;
     }
     
     .chart-container {
       height: 200px;
     }
   }

   /* Adjust for tablets */
   @media (min-width: 481px) and (max-width: 768px) {
     .dashboard-grid {
       grid-template-columns: repeat(2, 1fr);
     }
   }

   /* Ensure touch targets are large enough */
   .control-button {
     min-width: 44px;
     min-height: 44px;
     padding: 12px;
   }
   ```

2. **Create Mobile-Optimized Components:**
   ```typescript
   import { useEffect, useState } from 'react';

   // Custom hook to detect mobile view
   const useMobileDetection = () => {
     const [isMobile, setIsMobile] = useState(false);
     
     useEffect(() => {
       const checkMobile = () => {
         setIsMobile(window.innerWidth <= 480);
       };
       
       // Check on initial render
       checkMobile();
       
       // Add resize listener
       window.addEventListener('resize', checkMobile);
       return () => window.removeEventListener('resize', checkMobile);
     }, []);
     
     return isMobile;
   };

   // Responsive chart component
   const ResponsiveDataChart = ({ data }) => {
     const isMobile = useMobileDetection();
     const chartRef = useRef(null);
     
     useEffect(() => {
       if (!chartRef.current || !data) return;
       
       const ctx = chartRef.current.getContext('2d');
       const chart = new Chart(ctx, {
         type: 'line',
         data: {
           labels: data.labels,
           datasets: [{
             label: data.title,
             data: data.values,
             borderColor: '#0078d4',
             backgroundColor: 'rgba(0, 120, 212, 0.1)',
             tension: 0.4
           }]
         },
         options: {
           responsive: true,
           maintainAspectRatio: false,
           plugins: {
             legend: {
               display: !isMobile // Hide legend on mobile
             },
             tooltip: {
               enabled: true
             }
           },
           scales: {
             x: {
               ticks: {
                 maxRotation: isMobile ? 45 : 0, // Rotate labels on mobile
                 autoSkip: true,
                 maxTicksLimit: isMobile ? 6 : 12 // Fewer labels on mobile
               }
             }
           }
         }
       });
       
       return () => chart.destroy();
     }, [data, isMobile]);
     
     return (
       <div className={`chart-container ${isMobile ? 'chart-mobile' : ''}`}>
         <canvas ref={chartRef} />
       </div>
     );
   };
   ```

3. **Implement Touch-Friendly Interactions:**
   ```typescript
   const DataControls = ({ onRefresh, onTimeRangeChange }) => {
     const isMobile = useMobileDetection();
     const [timeRange, setTimeRange] = useState('1h');
     
     // Handle time range change
     const handleTimeRangeChange = (range) => {
       setTimeRange(range);
       onTimeRangeChange(range);
     };
     
     return (
       <div className={`data-controls ${isMobile ? 'controls-mobile' : ''}`}>
         {isMobile ? (
           // Mobile view - dropdown selector
           <div className=\"control-group\">
             <label htmlFor=\"time-range\">Time Range:</label>
             <select 
               id=\"time-range\"
               value={timeRange}
               onChange={(e) => handleTimeRangeChange(e.target.value)}
               className=\"touch-friendly-select\"
             >
               <option value=\"1h\">Last Hour</option>
               <option value=\"6h\">Last 6 Hours</option>
               <option value=\"24h\">Last 24 Hours</option>
               <option value=\"7d\">Last 7 Days</option>
             </select>
           </div>
         ) : (
           // Desktop view - button group
           <div className=\"control-group button-group\">
             <button 
               className={`control-button ${timeRange === '1h' ? 'active' : ''}`}
               onClick={() => handleTimeRangeChange('1h')}
             >
               1h
             </button>
             <button 
               className={`control-button ${timeRange === '6h' ? 'active' : ''}`}
               onClick={() => handleTimeRangeChange('6h')}
             >
               6h
             </button>
             <button 
               className={`control-button ${timeRange === '24h' ? 'active' : ''}`}
               onClick={() => handleTimeRangeChange('24h')}
             >
               24h
             </button>
             <button 
               className={`control-button ${timeRange === '7d' ? 'active' : ''}`}
               onClick={() => handleTimeRangeChange('7d')}
             >
               7d
             </button>
           </div>
         )}
         
         <button 
           className=\"refresh-button touch-friendly\"
           onClick={onRefresh}
           aria-label=\"Refresh data\"
         >
           <RefreshIcon size={isMobile ? 24 : 16} />
           {!isMobile && <span>Refresh</span>}
         </button>
       </div>
     );
   };
   ```

### Context/Permission Issues

**Symptoms:**
- \"Access denied\" errors for data sources
- Tab fails to load in some Teams contexts
- Authentication works for some users but not others

**Diagnostic Steps:**

1. **Check Teams context:**
   - Validate user and team context information
   - Verify permission scopes in app manifest
   - Test in different Teams contexts (personal, team, chat)

2. **Review authentication flow:**
   - Trace token acquisition process
   - Verify permission grants
   - Check for tenant restrictions

**Solutions:**

1. **Implement Context-Aware Permissions:**
   ```typescript
   import * as microsoftTeams from \"@microsoft/teams-js\";

   export const useTeamsContext = () => {
     const [context, setContext] = useState(null);
     const [error, setError] = useState(null);
     const [isLoading, setIsLoading] = useState(true);
     
     useEffect(() => {
       microsoftTeams.initialize();
       
       microsoftTeams.getContext((ctx) => {
         setContext(ctx);
         setIsLoading(false);
       });
       
       microsoftTeams.initialize.addEventListener('error', (error) => {
         setError(error);
         setIsLoading(false);
       });
     }, []);
     
     return { context, error, isLoading };
   };

   const DataAccessProvider = ({ children }) => {
     const { context, error, isLoading } = useTeamsContext();
     const [permissions, setPermissions] = useState({
       canRead: false,
       canWrite: false,
       canAdmin: false
     });
     
     useEffect(() => {
       if (!context) return;
       
       // Determine permissions based on Teams context
       const checkPermissions = async () => {
         try {
           // Get user identity
           const userToken = await getAuthToken();
           
           // Call backend to check permissions
           const response = await fetch('/api/checkPermissions', {
             headers: {
               'Authorization': `Bearer ${userToken}`,
               'X-Teams-Context': JSON.stringify({
                 teamId: context.teamId,
                 channelId: context.channelId,
                 userObjectId: context.userObjectId
               })
             }
           });
           
           if (response.ok) {
             const permissionsData = await response.json();
             setPermissions(permissionsData);
           } else {
             // Default to read-only on error
             setPermissions({ canRead: true, canWrite: false, canAdmin: false });
           }
         } catch (err) {
           console.error(\"Error checking permissions:\", err);
           // Default to read-only on error
           setPermissions({ canRead: true, canWrite: false, canAdmin: false });
         }
       };
       
       checkPermissions();
     }, [context]);
     
     if (isLoading) {
       return <div>Loading Teams context...</div>;
     }
     
     if (error) {
       return (
         <div className=\"error-container\">
           <h3>Teams Context Error</h3>
           <p>There was a problem accessing Teams context: {error.message}</p>
         </div>
       );
     }
     
     // Provide context and permissions to children
     return (
       <PermissionsContext.Provider value={permissions}>
         <TeamsContext.Provider value={context}>
           {children}
         </TeamsContext.Provider>
       </PermissionsContext.Provider>
     );
   };
   ```

2. **Server-Side Permission Validation:**
   ```csharp
   [Authorize]
   [Route(\"api/[controller]\")]
   [ApiController]
   public class DataController : ControllerBase
   {
       private readonly ITeamsPermissionService _permissionService;
       private readonly ILogger<DataController> _logger;
       
       public DataController(
           ITeamsPermissionService permissionService,
           ILogger<DataController> logger)
       {
           _permissionService = permissionService;
           _logger = logger;
       }
       
       [HttpGet(\"streams/{streamId}\")]
       public async Task<IActionResult> GetStreamData(string streamId)
       {
           try
           {
               // Extract Teams context from request
               if (!Request.Headers.TryGetValue(\"X-Teams-Context\", out var contextHeader))
               {
                   return BadRequest(\"Teams context required\");
               }
               
               var teamsContext = JsonSerializer.Deserialize<TeamsContext>(contextHeader.ToString());
               
               // Check permissions
               bool hasReadAccess = await _permissionService.UserCanAccessStream(
                   User,
                   teamsContext.TeamId,
                   teamsContext.ChannelId,
                   streamId,
                   PermissionLevel.Read
               );
               
               if (!hasReadAccess)
               {
                   _logger.LogWarning(
                       \"User {UserId} attempted to access stream {StreamId} without permission in team {TeamId}\",
                       User.Identity.Name,
                       streamId,
                       teamsContext.TeamId);
                       
                   return Forbid(\"You don't have permission to access this data stream\");
               }
               
               // User has permission, retrieve the data
               var streamData = await _dataService.GetStreamDataAsync(
                   streamId,
                   teamsContext.TeamId,
                   teamsContext.ChannelId);
                   
               return Ok(streamData);
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, \"Error retrieving stream data\");
               return StatusCode(500, \"An error occurred while retrieving data\");
           }
       }
   }
   ```

## Backend Service Issues

### API Connection Failures

**Symptoms:**
- \"Failed to fetch\" errors in console
- Data doesn't load even when SignalR connection is established
- API calls return 4xx or 5xx errors

**Diagnostic Steps:**

1. **Inspect API requests:**
   - Check Network tab in browser dev tools
   - Verify request parameters and headers
   - Examine response status codes and error messages

2. **Test API endpoints:**
   - Use tools like Postman to test endpoints directly
   - Verify authentication headers are correct
   - Check for CORS issues in preflight requests

**Solutions:**

1. **Implement Robust API Error Handling:**
   ```typescript
   export const useApiRequest = (url, options = {}) => {
     const [data, setData] = useState(null);
     const [error, setError] = useState(null);
     const [isLoading, setIsLoading] = useState(false);
     const [retryCount, setRetryCount] = useState(0);
     
     const fetchData = useCallback(async () => {
       if (!url) return;
       
       setIsLoading(true);
       setError(null);
       
       try {
         // Get authentication token
         const token = await getAuthToken();
         
         // Make API request
         const response = await fetch(url, {
           ...options,
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json',
             ...options.headers
           }
         });
         
         if (!response.ok) {
           // Handle common error status codes
           switch (response.status) {
             case 401:
               // Unauthorized - token might be expired
               throw new Error('Authentication error. Please refresh the page and try again.');
               
             case 403:
               // Forbidden - user doesn't have permission
               throw new Error('You don\\'t have permission to access this resource.');
               
             case 404:
               // Not found
               throw new Error('The requested resource could not be found.');
               
             case 429:
               // Too many requests
               throw new Error('Rate limit exceeded. Please try again later.');
               
             default:
               // Generic error message
               throw new Error(`API request failed with status: ${response.status}`);
           }
         }
         
         const responseData = await response.json();
         setData(responseData);
         setRetryCount(0); // Reset retry count on success
       } catch (err) {
         setError(err.message || 'An error occurred while fetching data');
         console.error('API request failed:', err);
       } finally {
         setIsLoading(false);
       }
     }, [url, options, retryCount]);
     
     // Implement retry mechanism
     const retry = useCallback(() => {
       setRetryCount(prev => prev + 1);
     }, []);
     
     // Fetch data initially and when dependencies change
     useEffect(() => {
       fetchData();
     }, [fetchData]);
     
     return { data, error, isLoading, retry, refresh: fetchData };
   };
   ```

2. **Add Exponential Backoff Retry Logic:**
   ```typescript
   export const useApiWithRetry = (url, options = {}) => {
     const [data, setData] = useState(null);
     const [error, setError] = useState(null);
     const [isLoading, setIsLoading] = useState(false);
     
     const fetchWithRetry = useCallback(async (retries = 3, baseDelay = 1000) => {
       setIsLoading(true);
       setError(null);
       
       let attempt = 0;
       let lastError = null;
       
       while (attempt <= retries) {
         try {
           // Get authentication token
           const token = await getAuthToken();
           
           // Make API request
           const response = await fetch(url, {
             ...options,
             headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               ...options.headers
             }
           });
           
           if (!response.ok) {
             throw new Error(`API request failed with status: ${response.status}`);
           }
           
           const responseData = await response.json();
           setData(responseData);
           setIsLoading(false);
           return responseData;
         } catch (err) {
           lastError = err;
           
           // If we've used all retries, give up
           if (attempt === retries) {
             break;
           }
           
           // Calculate exponential backoff delay with jitter
           const delay = Math.min(
             baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
             30000 // Max 30 second delay
           );
           
           console.warn(`API request failed (attempt ${attempt + 1}/${retries + 1}). Retrying in ${Math.round(delay)}ms...`);
           
           // Wait before retrying
           await new Promise(resolve => setTimeout(resolve, delay));
           
           attempt++;
         }
       }
       
       // All retries failed
       setError(lastError?.message || 'API request failed after multiple attempts');
       setIsLoading(false);
       return null;
     }, [url, options]);
     
     // Initiate the fetch with retry
     useEffect(() => {
       fetchWithRetry();
     }, [fetchWithRetry]);
     
     return { data, error, isLoading, retry: () => fetchWithRetry() };
   };
   ```

3. **Implement Circuit Breaker Pattern:**
   ```typescript
   // Circuit breaker state (outside of component to be shared)
   const circuitState = {
     failures: 0,
     lastFailure: 0,
     status: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
   };
   
   export const useApiWithCircuitBreaker = (url, options = {}) => {
     const [data, setData] = useState(null);
     const [error, setError] = useState(null);
     const [isLoading, setIsLoading] = useState(false);
     const [circuitStatus, setCircuitStatus] = useState(circuitState.status);
     
     // Configure circuit breaker
     const FAILURE_THRESHOLD = 5; // Number of failures before opening circuit
     const RESET_TIMEOUT = 30000; // Time to wait before attempting reset (half-open)
     
     const fetchData = useCallback(async () => {
       // Check if circuit is OPEN
       if (circuitState.status === 'OPEN') {
         const timeSinceLastFailure = Date.now() - circuitState.lastFailure;
         
         if (timeSinceLastFailure < RESET_TIMEOUT) {
           setError('Service is currently unavailable. Please try again later.');
           return null;
         } else {
           // Move to HALF_OPEN state
           circuitState.status = 'HALF_OPEN';
           setCircuitStatus('HALF_OPEN');
         }
       }
       
       setIsLoading(true);
       
       try {
         // Get authentication token
         const token = await getAuthToken();
         
         // Make API request
         const response = await fetch(url, {
           ...options,
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json',
             ...options.headers
           }
         });
         
         if (!response.ok) {
           throw new Error(`API request failed with status: ${response.status}`);
         }
         
         const responseData = await response.json();
         
         // Success - reset circuit if it was half-open
         if (circuitState.status === 'HALF_OPEN') {
           circuitState.status = 'CLOSED';
           circuitState.failures = 0;
           setCircuitStatus('CLOSED');
         }
         
         setData(responseData);
         setError(null);
         return responseData;
       } catch (err) {
         // Record failure
         circuitState.failures++;
         circuitState.lastFailure = Date.now();
         
         // Check if threshold exceeded
         if (circuitState.failures >= FAILURE_THRESHOLD || 
             circuitState.status === 'HALF_OPEN') {
           circuitState.status = 'OPEN';
           setCircuitStatus('OPEN');
           setError('Service is currently unavailable. Please try again later.');
         } else {
           setError(err.message || 'An error occurred while fetching data');
         }
         
         return null;
       } finally {
         setIsLoading(false);
       }
     }, [url, options]);
     
     // Initial fetch
     useEffect(() => {
       fetchData();
     }, [fetchData]);
     
     return { 
       data, 
       error, 
       isLoading, 
       circuitStatus,
       retry: fetchData
     };
   };
   ```

### Service Configuration Issues

**Symptoms:**
- Backend service returns unexpected error responses
- Authentication works but authorization fails
- Expected features aren't available in responses

**Diagnostic Steps:**

1. **Verify service configuration:**
   - Check environment variables and configuration files
   - Confirm service connection strings are correct
   - Verify correct API versions are being used

2. **Examine service logs:**
   - Check backend logs for errors and warnings
   - Look for configuration-related messages
   - Verify service startup completed successfully

**Solutions:**

1. **Implement Configuration Validation:**
   ```csharp
   public class ConfigurationValidator : IHostedService
   {
       private readonly IConfiguration _configuration;
       private readonly ILogger<ConfigurationValidator> _logger;
       
       public ConfigurationValidator(
           IConfiguration configuration,
           ILogger<ConfigurationValidator> logger)
       {
           _configuration = configuration;
           _logger = logger;
       }
       
       public Task StartAsync(CancellationToken cancellationToken)
       {
           // Validate required configuration
           ValidateConnectionStrings();
           ValidateAuthSettings();
           ValidateApiKeys();
           
           return Task.CompletedTask;
       }
       
       public Task StopAsync(CancellationToken cancellationToken)
       {
           return Task.CompletedTask;
       }
       
       private void ValidateConnectionStrings()
       {
           _logger.LogInformation(\"Validating connection strings...\");
           
           // Check SQL connection string
           ValidateConfigurationValue(\"ConnectionStrings:SqlDatabase\");
           
           // Check SignalR connection string (if using Azure SignalR Service)
           ValidateConfigurationValue(\"Azure:SignalR:ConnectionString\", optional: true);
           
           // Check storage connection string
           ValidateConfigurationValue(\"Azure:Storage:ConnectionString\");
       }
       
       private void ValidateAuthSettings()
       {
           _logger.LogInformation(\"Validating authentication settings...\");
           
           // Azure AD settings
           ValidateConfigurationValue(\"AzureAd:Instance\");
           ValidateConfigurationValue(\"AzureAd:TenantId\");
           ValidateConfigurationValue(\"AzureAd:ClientId\");
           
           // Validate client secret in production only
           if (!_configuration[\"ASPNETCORE_ENVIRONMENT\"].Equals(\"Development\", StringComparison.OrdinalIgnoreCase))
           {
               ValidateConfigurationValue(\"AzureAd:ClientSecret\");
           }
       }
       
       private void ValidateApiKeys()
       {
           _logger.LogInformation(\"Validating API keys...\");
           
           // Check for external APIs
           ValidateConfigurationValue(\"ExternalApis:DataService:ApiKey\", optional: true);
       }
       
       private void ValidateConfigurationValue(string key, bool optional = false)
       {
           var value = _configuration[key];
           
           if (string.IsNullOrWhiteSpace(value))
           {
               if (optional)
               {
                   _logger.LogWarning(\"Optional configuration value {Key} is not set\", key);
               }
               else
               {
                   _logger.LogError(\"Required configuration value {Key} is not set\", key);
                   throw new InvalidOperationException($\"Required configuration value '{key}' is not set\");
               }
           }
           else
           {
               _logger.LogDebug(\"Configuration value {Key} is set\", key);
           }
       }
   }
   ```

2. **Add Health Check Endpoints:**
   ```csharp
   public void ConfigureServices(IServiceCollection services)
   {
       // Add health checks
       services.AddHealthChecks()
           // Check database connectivity
           .AddSqlServer(
               Configuration[\"ConnectionStrings:SqlDatabase\"],
               name: \"database\",
               tags: new[] { \"db\", \"sql\", \"sqlserver\" })
           // Check Azure Storage
           .AddAzureBlobStorage(
               Configuration[\"Azure:Storage:ConnectionString\"],
               name: \"storage\",
               tags: new[] { \"storage\", \"blob\" })
           // Check Azure SignalR Service (if using)
           .AddAzureSignalR(
               Configuration[\"Azure:SignalR:ConnectionString\"],
               name: \"signalr\",
               tags: new[] { \"signalr\" })
           // Custom health check for additional dependencies
           .AddCheck<DataSourceHealthCheck>(
               \"data_source\",
               tags: new[] { \"api\", \"external\" });
   }
   
   public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
   {
       // Configure health check endpoints
       app.UseHealthChecks(\"/health\", new HealthCheckOptions
       {
           ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
       });
       
       // Add a detailed endpoint for internal monitoring
       app.UseHealthChecks(\"/health/details\", new HealthCheckOptions
       {
           Predicate = _ => true,
           ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
           AllowCachingResponses = false
       });
   }
   ```

3. **Implement Feature Flags:**
   ```csharp
   // Startup configuration
   public void ConfigureServices(IServiceCollection services)
   {
       // Add feature management
       services.AddFeatureManagement()
           .AddFeatureFilter<PercentageFilter>()
           .AddFeatureFilter<TimeWindowFilter>();
   }
   
   // Feature flags configuration (appsettings.json)
   {
     \"FeatureManagement\": {
       \"RealtimeUpdates\": true,
       \"AdvancedVisualization\": true,
       \"DataExport\": true,
       \"BatchProcessing\": {
         \"EnabledFor\": [
           {
             \"Name\": \"TimeWindow\",
             \"Parameters\": {
               \"Start\": \"2023-01-01T00:00:00Z\",
               \"End\": \"2023-12-31T23:59:59Z\"
             }
           }
         ]
       },
       \"AIInsights\": {
         \"EnabledFor\": [
           {
             \"Name\": \"Percentage\",
             \"Parameters\": {
               \"Value\": 20
             }
           }
         ]
       }
     }
   }
   
   // Usage in controller
   [ApiController]
   [Route(\"api/[controller]\")]
   public class DataController : ControllerBase
   {
       private readonly IFeatureManager _featureManager;
       
       public DataController(IFeatureManager featureManager)
       {
           _featureManager = featureManager;
       }
       
       [HttpGet(\"export\")]
       public async Task<IActionResult> ExportData()
       {
           if (!await _featureManager.IsEnabledAsync(\"DataExport\"))
           {
               return NotFound(\"This feature is currently unavailable\");
           }
           
           // Feature enabled, proceed with export
           return Ok(new { success = true });
       }
   }
   
   // Usage in React component
   const DataVisualization = () => {
     const [features, setFeatures] = useState({});
     
     useEffect(() => {
       // Fetch available features from API
       const fetchFeatures = async () => {
         const response = await fetch('/api/features');
         if (response.ok) {
           const data = await response.json();
           setFeatures(data);
         }
       };
       
       fetchFeatures();
     }, []);
     
     return (
       <div className=\"visualization-container\">
         <h2>Real-time Data Visualization</h2>
         
         {/* Base visualization always available */}
         <BasicChart data={data} />
         
         {/* Advanced visualization conditionally rendered */}
         {features.advancedVisualization && (
           <AdvancedVisualization data={data} />
         )}
         
         {/* Export option conditionally rendered */}
         {features.dataExport && (
           <button onClick={handleExport}>Export Data</button>
         )}
       </div>
     );
   };
   ```

## Development Environment Setup

### Local Development Issues

**Symptoms:**
- Local development environment doesn't match production behavior
- Backend services fail to start or connect locally
- Authentication doesn't work in local environment

**Diagnostic Steps:**

1. **Verify local environment setup:**
   - Check required SDKs and runtimes are installed
   - Verify environment variables and configuration
   - Confirm all dependencies are available locally

2. **Test with local emulators:**
   - Use Azure Storage Emulator for local storage
   - Test with local SQL database
   - Use authentication emulation where applicable

**Solutions:**

1. **Create Development Config Profiles:**
   ```json
   // appsettings.Development.json
   {
     \"Logging\": {
       \"LogLevel\": {
         \"Default\": \"Debug\",
         \"Microsoft\": \"Information\",
         \"Microsoft.Hosting.Lifetime\": \"Information\"
       }
     },
     \"ConnectionStrings\": {
       \"SqlDatabase\": \"Server=(localdb)\\\\MSSQLLocalDB;Database=RealtimeData;Trusted_Connection=True;\"
     },
     \"Azure\": {
       \"SignalR\": {
         \"ConnectionString\": \"\",
         \"UseLocalService\": true
       },
       \"Storage\": {
         \"ConnectionString\": \"UseDevelopmentStorage=true\"
       }
     },
     \"AzureAd\": {
       \"Instance\": \"https://login.microsoftonline.com/\",
       \"TenantId\": \"common\",
       \"ClientId\": \"your-client-id-for-dev\",
       \"ClientSecret\": \"your-client-secret-for-dev\",
       \"AllowWebApiToBeAuthorizedByACL\": true
     },
     \"AllowedOrigins\": [
       \"http://localhost:3000\",
       \"https://localhost:3000\",
       \"https://*.azurewebsites.net\"
     ]
   }
   ```

2. **Setup Docker Development Environment:**
   ```yaml
   # docker-compose.yml
   version: '3'
   
   services:
     api:
       build:
         context: ./backend
         dockerfile: Dockerfile.dev
       ports:
         - \"5000:5000\"
       environment:
         - ASPNETCORE_ENVIRONMENT=Development
         - ASPNETCORE_URLS=http://+:5000
         - ConnectionStrings__SqlDatabase=Server=db;Database=RealtimeData;User=sa;Password=YourStrong!Passw0rd;
         - Azure__Storage__ConnectionString=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://storage:10000/devstoreaccount1;
       depends_on:
         - db
         - storage
     
     client:
       build:
         context: ./client
         dockerfile: Dockerfile.dev
       ports:
         - \"3000:3000\"
       volumes:
         - ./client/src:/app/src
       environment:
         - REACT_APP_API_URL=http://localhost:5000
       depends_on:
         - api
     
     db:
       image: mcr.microsoft.com/mssql/server:2019-latest
       ports:
         - \"1433:1433\"
       environment:
         - ACCEPT_EULA=Y
         - SA_PASSWORD=YourStrong!Passw0rd
       volumes:
         - sqldata:/var/opt/mssql
     
     storage:
       image: mcr.microsoft.com/azure-storage/azurite
       ports:
         - \"10000:10000\" # Blob
         - \"10001:10001\" # Queue
         - \"10002:10002\" # Table
       volumes:
         - azurite_data:/data
   
   volumes:
     sqldata:
     azurite_data:
   ```

3. **Create Authentication Simulator for Local Development:**
   ```typescript
   // auth-simulator.js
   const express = require('express');
   const jwt = require('jsonwebtoken');
   const cors = require('cors');
   
   const app = express();
   app.use(cors());
   app.use(express.json());
   
   // Secret key for signing tokens (dev only)
   const JWT_SECRET = 'development-secret-key';
   
   // Sample users
   const users = [
     {
       id: '1',
       name: 'Test Admin User',
       email: 'admin@example.com',
       roles: ['Admin', 'User']
     },
     {
       id: '2',
       name: 'Test Standard User',
       email: 'user@example.com',
       roles: ['User']
     },
     {
       id: '3',
       name: 'Test Read-Only User',
       email: 'readonly@example.com',
       roles: ['ReadOnly']
     }
   ];
   
   // Endpoint to get a test token
   app.post('/auth/token', (req, res) => {
     const { email } = req.body;
     
     // Find user (or use first user as default)
     const user = users.find(u => u.email === email) || users[0];
     
     // Create a token that expires in 1 hour
     const token = jwt.sign(
       {
         sub: user.id,
         name: user.name,
         email: user.email,
         roles: user.roles,
         oid: `test-${user.id}`,
         // Include Teams context for testing
         'https://schemas.microsoft.com/identity/claims/scope': 'user.read',
         teams_context: {
           teamId: 'test-team-id',
           channelId: 'test-channel-id'
         }
       },
       JWT_SECRET,
       { expiresIn: '1h' }
     );
     
     res.json({
       token,
       expiresIn: 3600,
       user: {
         id: user.id,
         name: user.name,
         email: user.email,
         roles: user.roles
       }
     });
   });
   
   // Middleware to verify token
   app.use('/auth/verify', (req, res) => {
     const authHeader = req.headers.authorization;
     
     if (!authHeader || !authHeader.startsWith('Bearer ')) {
       return res.status(401).json({ error: 'No token provided' });
     }
     
     const token = authHeader.split(' ')[1];
     
     try {
       const decoded = jwt.verify(token, JWT_SECRET);
       res.json({
         valid: true,
         user: decoded
       });
     } catch (err) {
       res.status(401).json({
         valid: false,
         error: err.message
       });
     }
   });
   
   // Start server
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => {
     console.log(`Auth simulator running on port ${PORT}`);
   });
   ```
   
   Then in your React app:
   ```typescript
   // Use dev auth in development environment
   const getAuthToken = async () => {
     if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_AUTH_SIMULATOR === 'true') {
       // Use auth simulator in development
       const response = await fetch('http://localhost:3001/auth/token', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({ email: 'admin@example.com' })
       });
       
       if (response.ok) {
         const data = await response.json();
         return data.token;
       }
       
       throw new Error('Failed to get development auth token');
     } else {
       // Use real Teams SSO in production
       return await getTeamsAuthToken();
     }
   };
   ```

## Deployment Troubleshooting

### Azure Deployment Issues

**Symptoms:**
- App deployment fails with errors
- App deploys but doesn't function correctly
- Performance issues in production not seen in development

**Diagnostic Steps:**

1. **Check deployment logs:**
   - Review Azure DevOps or GitHub Actions logs
   - Check App Service deployment logs
   - Verify all resources were provisioned correctly

2. **Inspect application logs:**
   - Check Application Insights logs
   - Review App Service logs
   - Look for exceptions and errors in production

**Solutions:**

1. **Implement Comprehensive Logging:**
   ```csharp
   // Program.cs or Startup.cs
   public static IHostBuilder CreateHostBuilder(string[] args) =>
       Host.CreateDefaultBuilder(args)
           .ConfigureLogging((hostingContext, logging) =>
           {
               logging.ClearProviders();
               logging.AddConsole();
               
               // Add Application Insights logging in non-development environments
               if (!hostingContext.HostingEnvironment.IsDevelopment())
               {
                   logging.AddApplicationInsights(
                       hostingContext.Configuration[\"ApplicationInsights:InstrumentationKey\"]);
               }
               
               // Configure log filtering
               logging.AddFilter<ApplicationInsightsLoggerProvider>
                   (\"Microsoft\", LogLevel.Warning);
               logging.AddFilter<ApplicationInsightsLoggerProvider>
                   (\"System\", LogLevel.Warning);
               logging.AddFilter<ApplicationInsightsLoggerProvider>
                   (\"YourAppNamespace\", LogLevel.Information);
           })
           .ConfigureWebHostDefaults(webBuilder =>
           {
               webBuilder.UseStartup<Startup>();
           });
   ```

2. **Create Azure Deployment Template:**
   ```json
   // azure-deploy.json (ARM Template)
   {
     \"$schema\": \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\",
     \"contentVersion\": \"1.0.0.0\",
     \"parameters\": {
       \"appName\": {
         \"type\": \"string\",
         \"metadata\": {
           \"description\": \"Base name for all resources\"
         }
       },
       \"location\": {
         \"type\": \"string\",
         \"defaultValue\": \"[resourceGroup().location]\",
         \"metadata\": {
           \"description\": \"Location for all resources\"
         }
       },
       \"sqlAdminLogin\": {
         \"type\": \"string\",
         \"metadata\": {
           \"description\": \"SQL Server admin username\"
         }
       },
       \"sqlAdminPassword\": {
         \"type\": \"securestring\",
         \"metadata\": {
           \"description\": \"SQL Server admin password\"
         }
       }
     },
     \"variables\": {
       \"appServicePlanName\": \"[concat(parameters('appName'), '-plan')]\",
       \"webAppName\": \"[concat(parameters('appName'), '-app')]\",
       \"sqlServerName\": \"[concat(parameters('appName'), '-sql')]\",
       \"sqlDatabaseName\": \"RealtimeData\",
       \"storageAccountName\": \"[concat(toLower(replace(parameters('appName'), '-', '')), 'storage')]\",
       \"signalRName\": \"[concat(parameters('appName'), '-signalr')]\",
       \"appInsightsName\": \"[concat(parameters('appName'), '-insights')]\"
     },
     \"resources\": [
       {
         \"type\": \"Microsoft.Web/serverfarms\",
         \"apiVersion\": \"2020-06-01\",
         \"name\": \"[variables('appServicePlanName')]\",
         \"location\": \"[parameters('location')]\",
         \"sku\": {
           \"name\": \"P1v2\",
           \"tier\": \"PremiumV2\",
           \"size\": \"P1v2\",
           \"family\": \"Pv2\",
           \"capacity\": 1
         },
         \"properties\": {
           \"reserved\": false
         }
       },
       {
         \"type\": \"Microsoft.Web/sites\",
         \"apiVersion\": \"2020-06-01\",
         \"name\": \"[variables('webAppName')]\",
         \"location\": \"[parameters('location')]\",
         \"dependsOn\": [
           \"[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]\",
           \"[resourceId('Microsoft.Insights/components', variables('appInsightsName'))]\",
           \"[resourceId('Microsoft.SignalRService/SignalR', variables('signalRName'))]\",
           \"[resourceId('Microsoft.Sql/servers/databases', variables('sqlServerName'), variables('sqlDatabaseName'))]\",
           \"[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]\"
         ],
         \"properties\": {
           \"serverFarmId\": \"[resourceId('Microsoft.Web/serverfarms', variables('appServicePlanName'))]\",
           \"httpsOnly\": true,
           \"siteConfig\": {
             \"webSocketsEnabled\": true,
             \"alwaysOn\": true,
             \"http20Enabled\": true,
             \"minTlsVersion\": \"1.2\",
             \"appSettings\": [
               {
                 \"name\": \"APPINSIGHTS_INSTRUMENTATIONKEY\",
                 \"value\": \"[reference(resourceId('microsoft.insights/components', variables('appInsightsName')), '2020-02-02').InstrumentationKey]\"
               },
               {
                 \"name\": \"ApplicationInsights__InstrumentationKey\",
                 \"value\": \"[reference(resourceId('microsoft.insights/components', variables('appInsightsName')), '2020-02-02').InstrumentationKey]\"
               },
               {
                 \"name\": \"Azure__SignalR__ConnectionString\",
                 \"value\": \"[listKeys(resourceId('Microsoft.SignalRService/SignalR', variables('signalRName')), '2020-05-01').primaryConnectionString]\"
               },
               {
                 \"name\": \"Azure__Storage__ConnectionString\",
                 \"value\": \"[concat('DefaultEndpointsProtocol=https;AccountName=', variables('storageAccountName'), ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName')), '2019-06-01').keys[0].value, ';EndpointSuffix=core.windows.net')]\"
               },
               {
                 \"name\": \"ConnectionStrings__SqlDatabase\",
                 \"value\": \"[concat('Server=tcp:', variables('sqlServerName'), '.database.windows.net,1433;Database=', variables('sqlDatabaseName'), ';User ID=', parameters('sqlAdminLogin'), '@', variables('sqlServerName'), ';Password=', parameters('sqlAdminPassword'), ';Encrypt=true;Connection Timeout=30;')]\"
               }
             ]
           }
         }
       },
       {
         \"type\": \"Microsoft.Storage/storageAccounts\",
         \"apiVersion\": \"2019-06-01\",
         \"name\": \"[variables('storageAccountName')]\",
         \"location\": \"[parameters('location')]\",
         \"sku\": {
           \"name\": \"Standard_LRS\"
         },
         \"kind\": \"StorageV2\",
         \"properties\": {
           \"supportsHttpsTrafficOnly\": true,
           \"minimumTlsVersion\": \"TLS1_2\"
         }
       },
       {
         \"type\": \"Microsoft.Sql/servers\",
         \"apiVersion\": \"2019-06-01-preview\",
         \"name\": \"[variables('sqlServerName')]\",
         \"location\": \"[parameters('location')]\",
         \"properties\": {
           \"administratorLogin\": \"[parameters('sqlAdminLogin')]\",
           \"administratorLoginPassword\": \"[parameters('sqlAdminPassword')]\",
           \"version\": \"12.0\"
         },
         \"resources\": [
           {
             \"type\": \"databases\",
             \"apiVersion\": \"2019-06-01-preview\",
             \"name\": \"[variables('sqlDatabaseName')]\",
             \"location\": \"[parameters('location')]\",
             \"dependsOn\": [
               \"[resourceId('Microsoft.Sql/servers', variables('sqlServerName'))]\"
             ],
             \"sku\": {
               \"name\": \"S1\",
               \"tier\": \"Standard\"
             },
             \"properties\": {
               \"collation\": \"SQL_Latin1_General_CP1_CI_AS\"
             }
           },
           {
             \"type\": \"firewallRules\",
             \"apiVersion\": \"2014-04-01\",
             \"name\": \"AllowAllAzureIPs\",
             \"dependsOn\": [
               \"[resourceId('Microsoft.Sql/servers', variables('sqlServerName'))]\"
             ],
             \"properties\": {
               \"startIpAddress\": \"0.0.0.0\",
               \"endIpAddress\": \"0.0.0.0\"
             }
           }
         ]
       },
       {
         \"type\": \"Microsoft.SignalRService/SignalR\",
         \"apiVersion\": \"2020-05-01\",
         \"name\": \"[variables('signalRName')]\",
         \"location\": \"[parameters('location')]\",
         \"sku\": {
           \"name\": \"Standard_S1\",
           \"tier\": \"Standard\",
           \"capacity\": 1
         },
         \"properties\": {
           \"features\": [
             {
               \"flag\": \"ServiceMode\",
               \"value\": \"Default\"
             }
           ],
           \"cors\": {
             \"allowedOrigins\": [
               \"https://teams.microsoft.com\",
               \"[concat('https://', variables('webAppName'), '.azurewebsites.net')]\"
             ]
           }
         }
       },
       {
         \"type\": \"Microsoft.Insights/components\",
         \"apiVersion\": \"2020-02-02\",
         \"name\": \"[variables('appInsightsName')]\",
         \"location\": \"[parameters('location')]\",
         \"kind\": \"web\",
         \"properties\": {
           \"Application_Type\": \"web\",
           \"Request_Source\": \"rest\"
         }
       }
     ],
     \"outputs\": {
       \"webAppUrl\": {
         \"type\": \"string\",
         \"value\": \"[concat('https://', reference(resourceId('Microsoft.Web/sites', variables('webAppName'))).defaultHostName)]\"
       },
       \"appInsightsKey\": {
         \"type\": \"string\",
         \"value\": \"[reference(resourceId('microsoft.insights/components', variables('appInsightsName')), '2020-02-02').InstrumentationKey]\"
       }
     }
   }
   ```

3. **Setup GitHub Action Workflow:**
   ```yaml
   # .github/workflows/azure-deploy.yml
   name: Deploy to Azure
   
   on:
     push:
       branches: [ main ]
   
   env:
     AZURE_WEBAPP_NAME: realtimedata-app
     AZURE_WEBAPP_PACKAGE_PATH: './publish'
     DOTNET_VERSION: '6.0.x'
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v2
       
       - name: Setup .NET Core
         uses: actions/setup-dotnet@v1
         with:
           dotnet-version: ${{ env.DOTNET_VERSION }}
       
       - name: Restore dependencies
         run: dotnet restore
       
       - name: Build
         run: dotnet build --configuration Release --no-restore
       
       - name: Test
         run: dotnet test --no-restore --verbosity normal
       
       - name: Publish
         run: dotnet publish -c Release -o ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}
       
       - name: Deploy to Azure Web App
         uses: azure/webapps-deploy@v2
         with:
           app-name: ${{ env.AZURE_WEBAPP_NAME }}
           publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
           package: ${{ env.AZURE_WEBAPP_PACKAGE_PATH }}
       
       - name: Build and Push React Client
         run: |
           cd client
           npm ci
           npm run build
           cd build
           echo \"Deploying client...\"
       
       - name: Deploy React Client to Azure Storage
         uses: azure/cli@v1
         with:
           inlineScript: |
             az storage blob upload-batch \\
               --account-name realtimedata${{ github.run_number }} \\
               --auth-mode key \\
               --account-key ${{ secrets.AZURE_STORAGE_KEY }} \\
               --source './client/build' \\
               --destination '$web'
   ```

## Advanced Diagnostics

### Performance Profiling

**Symptoms:**
- App becomes sluggish under load
- Memory usage increases over time
- Specific operations take longer than expected

**Diagnostic Steps:**

1. **Profile backend performance:**
   - Use Application Insights profiler
   - Set up performance counters
   - Monitor memory and CPU usage

2. **Profile frontend performance:**
   - Use browser performance tools
   - Analyze render times and component lifecycle
   - Look for excessive re-renders or DOM updates

**Solutions:**

1. **Implement Application Insights Profiling:**
   ```csharp
   // Startup.cs
   public void ConfigureServices(IServiceCollection services)
   {
       // Add Application Insights
       services.AddApplicationInsightsTelemetry(Configuration[\"ApplicationInsights:InstrumentationKey\"]);
       
       // Enable Profiler
       services.ConfigureTelemetryModule<DependencyTrackingTelemetryModule>((module, o) =>
       {
           module.EnableSqlCommandTextInstrumentation = true;
       });
   }
   ```

2. **Add Custom Performance Monitoring:**
   ```csharp
   public class PerformanceMiddleware
   {
       private readonly RequestDelegate _next;
       private readonly ILogger<PerformanceMiddleware> _logger;
       private readonly DiagnosticListener _diagnosticListener;
       
       public PerformanceMiddleware(
           RequestDelegate next,
           ILogger<PerformanceMiddleware> logger,
           DiagnosticListener diagnosticListener)
       {
           _next = next;
           _logger = logger;
           _diagnosticListener = diagnosticListener;
       }
       
       public async Task InvokeAsync(HttpContext context)
       {
           var start = Stopwatch.GetTimestamp();
           var path = context.Request.Path;
           var method = context.Request.Method;
           
           try
           {
               // Track memory before request
               var memoryBefore = GC.GetTotalMemory(false);
               
               // Execute the request
               await _next(context);
               
               // Record elapsed time
               var elapsed = GetElapsedMilliseconds(start, Stopwatch.GetTimestamp());
               var statusCode = context.Response.StatusCode;
               
               // Track memory after request
               var memoryAfter = GC.GetTotalMemory(false);
               var memoryDelta = memoryAfter - memoryBefore;
               
               // Log performance metrics
               if (elapsed > 500) // Log slow requests
               {
                   _logger.LogWarning(
                       \"Long running request: {Method} {Path} took {ElapsedMilliseconds}ms with status {StatusCode}\",
                       method, path, elapsed, statusCode);
               }
               
               // Log memory usage
               if (memoryDelta > 50 * 1024 * 1024) // 50 MB
               {
                   _logger.LogWarning(
                       \"High memory usage: {Method} {Path} allocated {MemoryBytes} bytes\",
                       method, path, memoryDelta);
               }
               
               // Write diagnostic event
               if (_diagnosticListener.IsEnabled(\"Microsoft.AspNetCore.Diagnostics.PerformanceCheck\"))
               {
                   _diagnosticListener.Write(
                       \"Microsoft.AspNetCore.Diagnostics.PerformanceCheck\",
                       new
                       {
                           Path = path,
                           Method = method,
                           ElapsedMilliseconds = elapsed,
                           StatusCode = statusCode,
                           MemoryDelta = memoryDelta
                       });
               }
           }
           catch (Exception)
           {
               // Still log timing on exceptions
               var elapsed = GetElapsedMilliseconds(start, Stopwatch.GetTimestamp());
               _logger.LogError(
                   \"Request failed: {Method} {Path} took {ElapsedMilliseconds}ms\",
                   method, path, elapsed);
               
               throw;
           }
       }
       
       private static double GetElapsedMilliseconds(long start, long stop)
       {
           return (stop - start) * 1000 / (double)Stopwatch.Frequency;
       }
   }
   
   // Extension method for adding the middleware
   public static class PerformanceMiddlewareExtensions
   {
       public static IApplicationBuilder UsePerformanceMonitoring(this IApplicationBuilder builder)
       {
           return builder.UseMiddleware<PerformanceMiddleware>();
       }
   }
   ```

3. **Add Frontend Performance Monitoring:**
   ```typescript
   // performance-monitor.ts
   class PerformanceMonitor {
     private measures: Record<string, number[]> = {};
     private isEnabled: boolean = false;
     
     constructor() {
       // Enable in non-production environments or with query param
       this.isEnabled = 
         process.env.NODE_ENV !== 'production' || 
         window.location.search.includes('enablePerfMonitoring=true');
     }
     
     // Start measuring an operation
     public startMeasure(name: string): (() => number) {
       if (!this.isEnabled) return () => 0;
       
       const start = performance.now();
       
       // Return function that ends the measurement
       return () => {
         const duration = performance.now() - start;
         this.recordMeasurement(name, duration);
         return duration;
       };
     }
     
     // Record a measurement
     private recordMeasurement(name: string, duration: number): void {
       if (!this.measures[name]) {
         this.measures[name] = [];
       }
       
       this.measures[name].push(duration);
       
       // Keep only the last 100 measurements
       if (this.measures[name].length > 100) {
         this.measures[name].shift();
       }
       
       // Log if slow
       if (duration > 100) {
         console.warn(`Slow operation: ${name} took ${Math.round(duration)}ms`);
       }
     }
     
     // Get statistics for a measurement
     public getStats(name: string): {
       avg: number;
       min: number;
       max: number;
       count: number;
       p95: number;
     } | null {
       if (!this.isEnabled || !this.measures[name] || this.measures[name].length === 0) {
         return null;
       }
       
       const values = [...this.measures[name]].sort((a, b) => a - b);
       const sum = values.reduce((a, b) => a + b, 0);
       const count = values.length;
       const p95Index = Math.floor(count * 0.95);
       
       return {
         avg: Math.round(sum / count),
         min: Math.round(values[0]),
         max: Math.round(values[count - 1]),
         count,
         p95: Math.round(values[p95Index])
       };
     }
     
     // Get all measurements
     public getAllStats(): Record<string, ReturnType<PerformanceMonitor['getStats']>> {
       if (!this.isEnabled) return {};
       
       const result: Record<string, ReturnType<PerformanceMonitor['getStats']>> = {};
       
       Object.keys(this.measures).forEach(key => {
         result[key] = this.getStats(key);
       });
       
       return result;
     }
     
     // Reset all measurements
     public reset(): void {
       this.measures = {};
     }
     
     // Create a React hook for measuring component render time
     public createRenderTimeHook() {
       const monitor = this;
       
       return function useRenderTime(componentName: string) {
         const startTimeRef = useRef<number>(0);
         
         useEffect(() => {
           if (startTimeRef.current > 0) {
             const duration = performance.now() - startTimeRef.current;
             monitor.recordMeasurement(`render_${componentName}`, duration);
           }
         });
         
         useEffect(() => {
           // Measure mount time
           monitor.recordMeasurement(
             `mount_${componentName}`, 
             performance.now() - startTimeRef.current
           );
           
           return () => {
             // Measure unmount time
             const start = performance.now();
             requestAnimationFrame(() => {
               monitor.recordMeasurement(
                 `unmount_${componentName}`, 
                 performance.now() - start
               );
             });
           };
         }, []);
         
         // Record render start time
         startTimeRef.current = performance.now();
       };
     }
   }
   
   // Create singleton instance
   export const perfMonitor = new PerformanceMonitor();
   export const useRenderTime = perfMonitor.createRenderTimeHook();
   ```

### Debugging Complex Issues

**Symptoms:**
- Intermittent errors that are difficult to reproduce
- Issues that only occur in specific environments
- Race conditions or timing-related bugs

**Diagnostic Steps:**

1. **Enhanced logging:**
   - Implement detailed logging with context information
   - Use correlation IDs to track requests across components
   - Log important state transitions and events

2. **Utilize diagnostic tools:**
   - Set up Application Insights snapshots
   - Use debugging proxies to inspect network traffic
   - Implement feature flags for controlled testing

**Solutions:**

1. **Implement Diagnostic Controller:**
   ```csharp
   [ApiController]
   [Route(\"api/[controller]\")]
   public class DiagnosticsController : ControllerBase
   {
       private readonly ILogger<DiagnosticsController> _logger;
       private readonly IWebHostEnvironment _environment;
       private readonly IConfiguration _configuration;
       
       public DiagnosticsController(
           ILogger<DiagnosticsController> logger,
           IWebHostEnvironment environment,
           IConfiguration configuration)
       {
           _logger = logger;
           _environment = environment;
           _configuration = configuration;
       }
       
       [HttpGet(\"health\")]
       public IActionResult GetHealth()
       {
           return Ok(new {
               status = \"healthy\",
               environment = _environment.EnvironmentName,
               timestamp = DateTimeOffset.UtcNow
           });
       }
       
       [HttpGet(\"config\")]
       [Authorize(Roles = \"Admin\")]
       public IActionResult GetConfig()
       {
           // Only return non-sensitive configuration
           var safeConfig = new Dictionary<string, object>();
           
           // Get allowed configuration sections
           foreach (var section in new[] { \"FeatureManagement\", \"Logging\", \"AllowedOrigins\" })
           {
               var configSection = _configuration.GetSection(section);
               if (configSection.Exists())
               {
                   safeConfig[section] = configSection.Get<object>();
               }
           }
           
           return Ok(safeConfig);
       }
       
       [HttpGet(\"connection\")]
       public IActionResult GetConnectionInfo()
       {
           var connectionInfo = new {
               remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString(),
               userAgent = Request.Headers[\"User-Agent\"].ToString(),
               protocol = Request.Protocol,
               isHttps = Request.IsHttps,
               scheme = Request.Scheme
           };
           
           return Ok(connectionInfo);
       }
       
       [HttpPost(\"test-error\")]
       [Authorize(Roles = \"Admin\")]
       public IActionResult TestError()
       {
           try
           {
               // Generate a test exception
               throw new InvalidOperationException(\"This is a test exception\");
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, \"Test exception generated from diagnostics controller\");
               return StatusCode(500, new { message = \"Test error generated successfully\" });
           }
       }
   }
   ```

2. **Use Correlation IDs for Request Tracing:**
   ```csharp
   public class CorrelationMiddleware
   {
       private const string CorrelationIdHeaderName = \"X-Correlation-Id\";
       private readonly RequestDelegate _next;
       private readonly ILogger<CorrelationMiddleware> _logger;
       
       public CorrelationMiddleware(RequestDelegate next, ILogger<CorrelationMiddleware> logger)
       {
           _next = next;
           _logger = logger;
       }
       
       public async Task InvokeAsync(HttpContext context)
       {
           // Extract correlation ID from request header or create new one
           if (!context.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var correlationId) || 
               string.IsNullOrEmpty(correlationId))
           {
               correlationId = Guid.NewGuid().ToString();
           }
           
           // Add correlation ID to response headers
           context.Response.OnStarting(() => {
               context.Response.Headers.Add(CorrelationIdHeaderName, correlationId.ToString());
               return Task.CompletedTask;
           });
           
           // Add correlation ID to LogContext
           using (LogContext.PushProperty(\"CorrelationId\", correlationId.ToString()))
           {
               _logger.LogInformation(
                   \"Request {Method} {Path} started with correlation ID {CorrelationId}\",
                   context.Request.Method,
                   context.Request.Path,
                   correlationId);
               
               try
               {
                   await _next(context);
               }
               finally
               {
                   _logger.LogInformation(
                       \"Request {Method} {Path} completed with status code {StatusCode}\",
                       context.Request.Method,
                       context.Request.Path,
                       context.Response.StatusCode);
               }
           }
       }
   }
   ```

3. **Implement Client-Side Diagnostic Tools:**
   ```typescript
   // diagnostics-panel.tsx
   import React, { useState, useEffect } from 'react';
   import { perfMonitor } from './performance-monitor';
   
   interface DiagnosticsState {
     isVisible: boolean;
     connectionInfo: any;
     performanceStats: Record<string, any>;
     signalRState: string;
     signalRConnectionId: string | null;
     errors: Array<{ message: string; timestamp: string; }>;
     features: Record<string, boolean>;
   }
   
   export const DiagnosticsPanel: React.FC = () => {
     const [state, setState] = useState<DiagnosticsState>({
       isVisible: false,
       connectionInfo: null,
       performanceStats: {},
       signalRState: 'Disconnected',
       signalRConnectionId: null,
       errors: [],
       features: {}
     });
     
     useEffect(() => {
       // Check if diagnostics should be enabled
       const enableDiagnostics = 
         process.env.NODE_ENV !== 'production' || 
         localStorage.getItem('enableDiagnostics') === 'true' ||
         window.location.search.includes('diagnostics=true');
       
       if (!enableDiagnostics) return;
       
       // Setup keyboard shortcut (Ctrl+Shift+D)
       const handleKeyDown = (e: KeyboardEvent) => {
         if (e.ctrlKey && e.shiftKey && e.key === 'D') {
           setState(prev => ({ ...prev, isVisible: !prev.isVisible }));
         }
       };
       
       window.addEventListener('keydown', handleKeyDown);
       
       // Collect initial diagnostics
       fetchDiagnosticData();
       
       // Set up periodic updates
       const interval = setInterval(() => {
         if (state.isVisible) {
           updateDiagnostics();
         }
       }, 2000);
       
       return () => {
         window.removeEventListener('keydown', handleKeyDown);
         clearInterval(interval);
       };
     }, [state.isVisible]);
     
     const fetchDiagnosticData = async () => {
       try {
         const response = await fetch('/api/diagnostics/connection');
         if (response.ok) {
           const connectionInfo = await response.json();
           setState(prev => ({ ...prev, connectionInfo }));
         }
       } catch (error) {
         console.error('Failed to fetch diagnostic data:', error);
       }
     };
     
     const updateDiagnostics = () => {
       // Update performance stats
       setState(prev => ({
         ...prev,
         performanceStats: perfMonitor.getAllStats(),
         signalRState: (window as any).signalRConnection?.state || 'Disconnected',
         signalRConnectionId: (window as any).signalRConnection?.connectionId || null
       }));
     };
     
     const captureError = (message: string) => {
       setState(prev => ({
         ...prev,
         errors: [
           ...prev.errors,
           { message, timestamp: new Date().toISOString() }
         ].slice(-10) // Keep only the most recent 10 errors
       }));
     };
     
     // Intercept console.error in development
     useEffect(() => {
       if (process.env.NODE_ENV !== 'production') {
         const originalConsoleError = console.error;
         
         console.error = (...args) => {
           originalConsoleError(...args);
           captureError(args.map(arg => 
             typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
           ).join(' '));
         };
         
         return () => {
           console.error = originalConsoleError;
         };
       }
     }, []);
     
     if (!state.isVisible) return null;
     
     return (
       <div className=\"diagnostics-panel\">
         <h3>Teams Real-time Data Tab Diagnostics</h3>
         
         <div className=\"diagnostics-section\">
           <h4>Connection</h4>
           <div className=\"diagnostics-data\">
             {state.connectionInfo ? (
               <pre>{JSON.stringify(state.connectionInfo, null, 2)}</pre>
             ) : (
               <p>Loading connection info...</p>
             )}
           </div>
         </div>
         
         <div className=\"diagnostics-section\">
           <h4>SignalR</h4>
           <div className=\"diagnostics-data\">
             <p><strong>State:</strong> {state.signalRState}</p>
             <p><strong>Connection ID:</strong> {state.signalRConnectionId || 'None'}</p>
             <button onClick={() => {
               (window as any).signalRConnection?.stop();
               setTimeout(() => (window as any).signalRConnection?.start(), 1000);
             }}>
               Restart Connection
             </button>
           </div>
         </div>
         
         <div className=\"diagnostics-section\">
           <h4>Performance</h4>
           <div className=\"diagnostics-data\">
             <table>
               <thead>
                 <tr>
                   <th>Metric</th>
                   <th>Average (ms)</th>
                   <th>P95 (ms)</th>
                   <th>Count</th>
                 </tr>
               </thead>
               <tbody>
                 {Object.entries(state.performanceStats).map(([key, stats]) => (
                   <tr key={key}>
                     <td>{key}</td>
                     <td>{stats?.avg || '-'}</td>
                     <td>{stats?.p95 || '-'}</td>
                     <td>{stats?.count || 0}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
             <button onClick={() => perfMonitor.reset()}>
               Reset Metrics
             </button>
           </div>
         </div>
         
         <div className=\"diagnostics-section\">
           <h4>Recent Errors ({state.errors.length})</h4>
           <div className=\"diagnostics-data\">
             {state.errors.length > 0 ? (
               <ul className=\"error-list\">
                 {state.errors.map((error, index) => (
                   <li key={index}>
                     <span className=\"timestamp\">{error.timestamp}</span>
                     <span className=\"message\">{error.message}</span>
                   </li>
                 ))}
               </ul>
             ) : (
               <p>No errors captured</p>
             )}
             <button onClick={() => setState(prev => ({ ...prev, errors: [] }))}>
               Clear Errors
             </button>
           </div>
         </div>
         
         <div className=\"diagnostics-section\">
           <h4>Feature Flags</h4>
           <div className=\"diagnostics-data\">
             {Object.entries(state.features).length > 0 ? (
               <ul>
                 {Object.entries(state.features).map(([feature, enabled]) => (
                   <li key={feature}>
                     <span className={`feature-flag ${enabled ? 'enabled' : 'disabled'}`}>
                       {feature}: {enabled ? 'Enabled' : 'Disabled'}
                     </span>
                   </li>
                 ))}
               </ul>
             ) : (
               <p>No feature flags detected</p>
             )}
           </div>
         </div>
         
         <button 
           className=\"close-button\" 
           onClick={() => setState(prev => ({ ...prev, isVisible: false }))}
         >
           Close
         </button>
       </div>
     );
   };
   ```

   ```css
   /* diagnostics-panel.css */
   .diagnostics-panel {
     position: fixed;
     top: 10px;
     right: 10px;
     width: 500px;
     max-height: 80vh;
     overflow-y: auto;
     background-color: rgba(32, 32, 32, 0.9);
     color: #f0f0f0;
     border-radius: 8px;
     padding: 16px;
     font-family: monospace;
     font-size: 12px;
     z-index: 10000;
     box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
   }
   
   .diagnostics-panel h3 {
     margin-top: 0;
     padding-bottom: 8px;
     border-bottom: 1px solid #555;
     color: #0078d4;
   }
   
   .diagnostics-section {
     margin-bottom: 16px;
   }
   
   .diagnostics-section h4 {
     margin: 0 0 8px 0;
     font-size: 14px;
   }
   
   .diagnostics-data {
     background-color: rgba(0, 0, 0, 0.2);
     padding: 8px;
     border-radius: 4px;
   }
   
   .diagnostics-panel table {
     width: 100%;
     border-collapse: collapse;
   }
   
   .diagnostics-panel th, .diagnostics-panel td {
     text-align: left;
     padding: 4px 8px;
     border-bottom: 1px solid #444;
   }
   
   .error-list {
     list-style: none;
     padding: 0;
     margin: 0;
   }
   
   .error-list li {
     margin-bottom: 6px;
     padding-bottom: 6px;
     border-bottom: 1px solid #444;
   }
   
   .timestamp {
     display: block;
     color: #888;
     font-size: 10px;
   }
   
   .feature-flag {
     display: inline-block;
     padding: 2px 6px;
     border-radius: 4px;
   }
   
   .feature-flag.enabled {
     background-color: rgba(0, 160, 70, 0.3);
   }
   
   .feature-flag.disabled {
     background-color: rgba(200, 30, 30, 0.3);
   }
   
   .diagnostics-panel button {
     background-color: #0078d4;
     color: white;
     border: none;
     padding: 4px 8px;
     border-radius: 4px;
     cursor: pointer;
     margin-right: 8px;
     margin-top: 8px;
   }
   
   .diagnostics-panel button:hover {
     background-color: #106ebe;
   }
   
   .close-button {
     display: block;
     width: 100%;
     margin-top: 16px !important;
     text-align: center;
   }
   ```

## Conclusion

This troubleshooting guide covers the most common issues you might encounter when implementing and deploying the RealtimeDataTab in Microsoft Teams. By following the diagnostic steps and implementing the provided solutions, you can build a robust real-time data experience that works reliably across different environments and user scenarios.

Remember these key principles when troubleshooting:

1. **Start with proper logging and diagnostics** to identify the root cause of issues.

2. **Implement robust error handling and fallbacks** in both frontend and backend components.

3. **Consider the Teams-specific challenges** around authentication, theming, and mobile responsiveness.

4. **Use appropriate monitoring and profiling tools** to detect performance issues before users encounter them.

5. **Test in all Teams contexts** (personal, team, channel, mobile, desktop) to ensure consistent behavior.

When deploying updates, consider using feature flags and progressive rollouts to minimize risk and control the release of new functionality. This approach allows you to quickly disable problematic features without requiring a full redeployment.

For additional help, consider these resources:

- [Teams Developer Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- [SignalR Documentation](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction)
- [Azure SignalR Service](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-overview)
- [Application Insights for ASP.NET Core](https://learn.microsoft.com/en-us/azure/azure-monitor/app/asp-net-core)

By combining these practices with the specific solutions provided in this guide, you can create a high-quality, reliable real-time data experience for your Microsoft Teams users.
