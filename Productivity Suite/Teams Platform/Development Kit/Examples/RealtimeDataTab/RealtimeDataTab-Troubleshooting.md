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
- "Failed to connect" error message displayed to users

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
       options.AddPolicy("TeamsPolicy",
           builder => builder
               .WithOrigins(
                   "https://*.teams.microsoft.com",
                   "https://*.teams.microsoft.us",
                   "https://*.teams.cloudapi.de",
                   "https://*.teams.microsoft.cn",
                   "https://devspaces.skype.com"
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
- "Reconnecting..." message appears frequently
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
     setConnectionState("Reconnecting");
     console.warn("Connection lost, reconnecting...", error);
   });
   
   connection.onreconnected(connectionId => {
     // Update UI to show reconnected state
     setConnectionState("Connected");
     console.info("Connection reestablished.");
     
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
   services.AddSignalR().AddAzureSignalR(Configuration["Azure:SignalR:ConnectionString"]);
   ```

## Authentication Problems

### Token Expiration Issues

**Symptoms:**
- Connections work initially but fail after some time
- "Unauthorized" errors appear in logs after running for a while
- Authentication required errors in the browser console

**Diagnostic Steps:**

1. **Check token lifecycle:**
   - Log token issuance and expiration times
   - Verify token handling