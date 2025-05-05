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
                       User`
}