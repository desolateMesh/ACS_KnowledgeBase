## Overview

The ACS Teams Utils library provides a comprehensive set of utility functions for integrating Azure Communication Services (ACS) with Microsoft Teams applications. This library simplifies common tasks related to authentication, context handling, UI integration, and communication features, making it easier to develop Teams applications that leverage ACS capabilities.

## Key Features

- **Teams SDK Integration**: Initialize and configure the Teams JavaScript SDK for ACS integration
- **Authentication**: Manage identity conversion between Teams and ACS
- **Chat Integration**: Initialize chat clients and handle messaging
- **Calling & Meeting Integration**: Join meetings, manage video streams, and handle calling features
- **UI Components**: Create ACS UI components that match Teams styling
- **Context Handling**: Validate and work with different Teams contexts
- **Notifications**: Register for and display notifications
- **Theme Integration**: Apply Teams themes to ACS UI components

## Prerequisites

- Microsoft Teams JavaScript SDK (`@microsoft/teams-js`)
- Azure Communication Services SDKs
  - `@azure/communication-calling`
  - `@azure/communication-chat`
  - `@azure/communication-common`
- Access to an Azure Communication Services resource
- Microsoft Teams application setup

## Installation

Add the ACS-Teams-Utils.js file to your project and import the necessary functions.

## Core Functions

### Teams SDK Initialization

#### `initializeTeamsSDK()`

Initializes the Teams SDK and ensures it's ready to use.

**Returns:**
- Promise resolving when Teams SDK is initialized

**Example:**

```javascript
import { initializeTeamsSDK } from './ACS-Teams-Utils';

async function initialize() {
    try {
        await initializeTeamsSDK();
        console.log('Teams SDK initialized successfully');
        // Continue with application initialization
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}
```

#### `getTeamsContext()`

Gets the current Teams context, including user and environment information.

**Returns:**
- Promise resolving to the Teams context object

**Example:**

```javascript
import { getTeamsContext } from './ACS-Teams-Utils';

async function getUserInfo() {
    try {
        const context = await getTeamsContext();
        console.log('Current user:', context.user.displayName);
        console.log('Theme:', context.theme);
        return context;
    } catch (error) {
        console.error('Error getting context:', error);
    }
}
```

### Identity Management

#### `convertTeamsUserToAcsIdentity(teamsContext, acsConfig)`

Converts a Teams user identity to an ACS compatible identity.

**Parameters:**
- `teamsContext` (Object): The Teams context object
- `acsConfig` (Object): ACS configuration options

**Returns:**
- Promise resolving to an object containing ACS user details

**Example:**

```javascript
import { getTeamsContext, convertTeamsUserToAcsIdentity } from './ACS-Teams-Utils';

async function getAcsIdentity() {
    try {
        const context = await getTeamsContext();
        const acsConfig = {
            identityServiceUrl: 'https://your-backend-service.com'
        };
        
        const acsIdentity = await convertTeamsUserToAcsIdentity(context, acsConfig);
        console.log('ACS User ID:', acsIdentity.acsUserId);
        return acsIdentity;
    } catch (error) {
        console.error('Error getting ACS identity:', error);
    }
}
```

#### `initializeAuthentication()`

Initializes authentication for an ACS-Teams integrated application.

**Returns:**
- Promise resolving to an authentication result with tokens

**Example:**

```javascript
import { initializeAuthentication } from './ACS-Teams-Utils';

async function authenticate() {
    try {
        const authResult = await initializeAuthentication();
        console.log('Authentication successful');
        
        // Store tokens securely
        sessionStorage.setItem('acsToken', authResult.acsToken);
        sessionStorage.setItem('acsUserId', authResult.acsUserId);
        
        return authResult;
    } catch (error) {
        console.error('Authentication failed:', error);
    }
}
```

### Chat Integration

#### `initializeChatClient(endpoint, token)`

Initializes an ACS chat client with the appropriate credentials.

**Parameters:**
- `endpoint` (string): The ACS endpoint
- `token` (string): The ACS access token

**Returns:**
- The initialized chat client

**Example:**

```javascript
import { initializeChatClient } from './ACS-Teams-Utils';

function setupChatClient(endpoint, token) {
    try {
        const chatClient = initializeChatClient(endpoint, token);
        console.log('Chat client initialized');
        return chatClient;
    } catch (error) {
        console.error('Error initializing chat client:', error);
    }
}
```

#### `registerForChatNotifications(chatClient, threadId, notificationHandler)`

Registers for ACS chat notifications in Teams context.

**Parameters:**
- `chatClient` (ChatClient): The ACS chat client
- `threadId` (string): The ACS thread ID
- `notificationHandler` (Function): Function to handle notifications

**Returns:**
- Promise resolving to void

**Example:**

```javascript
import { initializeChatClient, registerForChatNotifications } from './ACS-Teams-Utils';

async function setupChatNotifications(endpoint, token, threadId) {
    try {
        const chatClient = initializeChatClient(endpoint, token);
        
        await registerForChatNotifications(chatClient, threadId, (notification) => {
            console.log('Notification received:', notification.type);
            
            // Handle different notification types
            switch (notification.type) {
                case 'message':
                    displayNewMessage(notification.sender, notification.content);
                    break;
                case 'typing':
                    showTypingIndicator(notification.sender);
                    break;
                case 'participantsAdded':
                    updateParticipantList(notification.participants, true);
                    break;
                case 'participantsRemoved':
                    updateParticipantList(notification.participants, false);
                    break;
            }
        });
        
        console.log('Chat notifications registered');
    } catch (error) {
        console.error('Error setting up chat notifications:', error);
    }
}
```

### Calling & Meeting Integration

#### `initializeCallingClient(token)`

Initializes an ACS calling client with the appropriate credentials.

**Parameters:**
- `token` (string): The ACS access token

**Returns:**
- Promise resolving to the call agent

**Example:**

```javascript
import { initializeCallingClient } from './ACS-Teams-Utils';

async function setupCallingClient(token) {
    try {
        const callAgent = await initializeCallingClient(token);
        console.log('Call agent initialized');
        return callAgent;
    } catch (error) {
        console.error('Error initializing calling client:', error);
    }
}
```

#### `joinTeamsMeeting(callAgent, meetingLink, options)`

Joins a Teams meeting using ACS interoperability.

**Parameters:**
- `callAgent` (CallAgent): The ACS call agent
- `meetingLink` (string): The Teams meeting link or ID
- `options` (Object, optional): Options for joining the meeting

**Returns:**
- Promise resolving to the call object representing the meeting

**Example:**

```javascript
import { initializeCallingClient, joinTeamsMeeting, setupLocalVideo } from './ACS-Teams-Utils';

async function joinMeeting(token, meetingLink) {
    try {
        // Initialize the calling client
        const callAgent = await initializeCallingClient(token);
        
        // Set up local video if needed
        const localVideoStream = await setupLocalVideo(callClient);
        
        // Join the meeting
        const call = await joinTeamsMeeting(callAgent, meetingLink, {
            videoOptions: {
                localVideoStreams: [localVideoStream]
            },
            audioOptions: {
                muted: false
            }
        });
        
        console.log('Joined Teams meeting');
        return call;
    } catch (error) {
        console.error('Error joining meeting:', error);
    }
}
```

#### `setupLocalVideo(callClient)`

Sets up local video for a Teams meeting.

**Parameters:**
- `callClient` (CallClient): The ACS call client

**Returns:**
- Promise resolving to the local video stream

**Example:**

```javascript
import { setupLocalVideo } from './ACS-Teams-Utils';

async function initializeLocalVideo(callClient) {
    try {
        const localVideoStream = await setupLocalVideo(callClient);
        
        // Display preview of local video
        const videoElement = document.getElementById('localVideoContainer');
        const renderer = new VideoStreamRenderer(localVideoStream);
        const view = await renderer.createView();
        videoElement.appendChild(view.target);
        
        return localVideoStream;
    } catch (error) {
        console.error('Error setting up local video:', error);
    }
}
```

#### `renderRemoteVideo(stream, elementId)`

Renders a remote participant's video stream.

**Parameters:**
- `stream` (RemoteVideoStream): The remote video stream
- `elementId` (string): The ID of the HTML element to render the video in

**Returns:**
- Promise resolving to the video stream renderer

**Example:**

```javascript
import { renderRemoteVideo } from './ACS-Teams-Utils';

async function displayRemoteVideo(remoteVideoStream, participantId) {
    try {
        // Create a container for this participant's video
        const containerId = `participant-${participantId}`;
        const container = document.createElement('div');
        container.id = containerId;
        document.getElementById('remoteVideosContainer').appendChild(container);
        
        // Render the video
        const renderer = await renderRemoteVideo(remoteVideoStream, containerId);
        return renderer;
    } catch (error) {
        console.error('Error rendering remote video:', error);
    }
}
```

### UI Components

#### `createAcsStatusCard(options)`

Creates an adaptive card template for displaying ACS status in Teams.

**Parameters:**
- `options` (Object): Customization options for the card

**Returns:**
- Adaptive Card JSON

**Example:**

```javascript
import { createAcsStatusCard } from './ACS-Teams-Utils';

function displayStatusCard(status) {
    const card = createAcsStatusCard({
        title: 'Communication Services Status',
        description: 'Current status of your communication connection',
        status: status,
        lastUpdated: new Date().toLocaleString(),
        actions: [
            {
                type: 'Action.Submit',
                title: 'Reconnect',
                data: {
                    actionType: 'reconnect'
                }
            }
        ]
    });
    
    // Send the card to Teams
    microsoftTeams.tasks.submitTask(card);
}
```

#### `setupAcsCallUI(callOptions)`

Sets up an ACS call UI integrated with Teams styling.

**Parameters:**
- `callOptions` (Object): Call configuration options

**Returns:**
- Object containing call UI elements and controls

**Example:**

```javascript
import { setupAcsCallUI, getTeamsContext, applyThemeToAcsUI } from './ACS-Teams-Utils';

async function createCallInterface() {
    // Get Teams context for theme information
    const context = await getTeamsContext();
    
    // Set up call UI
    const callUI = setupAcsCallUI({
        allowMute: true,
        allowVideo: true,
        allowScreenShare: true
    });
    
    // Apply Teams theme
    applyThemeToAcsUI(context.theme);
    
    // Set up event handlers for UI controls
    callUI.controls.muteButton.addEventListener('click', toggleMute);
    callUI.controls.videoButton.addEventListener('click', toggleVideo);
    callUI.controls.endCallButton.addEventListener('click', endCall);
    
    return callUI;
}
```

#### `generateAcsStyles(theme)`

Generates CSS styles for ACS UI components based on Teams theme.

**Parameters:**
- `theme` (string): The Teams theme name

**Returns:**
- CSS styles as a string

**Example:**

```javascript
import { generateAcsStyles, getTeamsContext } from './ACS-Teams-Utils';

async function applyTeamsStylesToAcs() {
    // Get current Teams theme
    const context = await getTeamsContext();
    const theme = context.theme;
    
    // Generate CSS
    const css = generateAcsStyles(theme);
    
    // Apply CSS to the page
    const styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
}
```

#### `injectAcsStyles(theme)`

Injects ACS styles into the current page based on Teams theme.

**Parameters:**
- `theme` (string): The Teams theme

**Returns:**
- void

**Example:**

```javascript
import { injectAcsStyles, getTeamsContext, registerThemeChangeHandler } from './ACS-Teams-Utils';

async function setupTheming() {
    // Get current theme
    const context = await getTeamsContext();
    
    // Apply initial styles
    injectAcsStyles(context.theme);
    
    // Register for theme changes
    registerThemeChangeHandler((newTheme) => {
        injectAcsStyles(newTheme);
    });
}
```

### Context Handling

#### `validateContextForAcs()`

Validates if the current context is appropriate for ACS features.

**Returns:**
- Promise resolving to validation result with context details

**Example:**

```javascript
import { validateContextForAcs } from './ACS-Teams-Utils';

async function checkAvailableFeatures() {
    try {
        const validationResult = await validateContextForAcs();
        
        // Enable/disable features based on availability
        if (validationResult.availableFeatures.chat) {
            enableChatFeature();
        }
        
        if (validationResult.availableFeatures.calling) {
            enableCallingFeature();
        }
        
        if (validationResult.availableFeatures.meeting) {
            enableMeetingFeature();
        }
        
        return validationResult;
    } catch (error) {
        console.error('Error validating context:', error);
    }
}
```

#### `getTeamsMeetingContext()`

Gets the current Teams meeting context for ACS integration.

**Returns:**
- Promise resolving to the meeting context

**Example:**

```javascript
import { getTeamsMeetingContext } from './ACS-Teams-Utils';

async function getMeetingInfo() {
    try {
        const meetingContext = await getTeamsMeetingContext();
        
        console.log('Meeting ID:', meetingContext.id);
        console.log('Meeting type:', meetingContext.meetingType);
        
        return meetingContext;
    } catch (error) {
        console.error('Error getting meeting context:', error);
    }
}
```

### Notifications

#### `showTeamsNotification(notificationInfo)`

Shows a Teams notification.

**Parameters:**
- `notificationInfo` (Object): Notification details

**Returns:**
- Promise resolving to void

**Example:**

```javascript
import { showTeamsNotification } from './ACS-Teams-Utils';

async function notifyUser(message, title = 'Notification') {
    try {
        await showTeamsNotification({
            title: title,
            message: message,
            iconUrl: 'https://your-app.com/images/icon.png'
        });
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}
```

### Other Utility Functions

#### `openTeamsDeepLink(url)`

Opens a deep link within Teams.

**Parameters:**
- `url` (string): The deep link URL

**Returns:**
- Promise resolving to void

**Example:**

```javascript
import { openTeamsDeepLink } from './ACS-Teams-Utils';

async function navigateToChannel(teamId, channelId) {
    try {
        const deepLink = `https://teams.microsoft.com/l/channel/${channelId}/${encodeURIComponent('General')}?groupId=${teamId}`;
        await openTeamsDeepLink(deepLink);
    } catch (error) {
        console.error('Error opening deep link:', error);
    }
}
```

#### `configureTeamsForAcs(options)`

Sets up Teams SDK configuration with ACS-specific settings.

**Parameters:**
- `options` (Object): Configuration options

**Returns:**
- Promise resolving to void

**Example:**

```javascript
import { configureTeamsForAcs } from './ACS-Teams-Utils';

async function setupTeamsConfiguration() {
    try {
        await configureTeamsForAcs({
            customConfig: {
                // Custom Teams SDK configuration options
            }
        });
        
        console.log('Teams configured for ACS integration');
    } catch (error) {
        console.error('Error configuring Teams:', error);
    }
}
```

## Integration Patterns

### Basic Teams Tab with ACS Chat

```javascript
import * as AcsTeamsUtils from './ACS-Teams-Utils';

async function initializeTeamsTabWithChat() {
    try {
        // Initialize Teams SDK
        await AcsTeamsUtils.initializeTeamsSDK();
        
        // Get Teams context
        const context = await AcsTeamsUtils.getTeamsContext();
        
        // Apply Teams theme to ACS components
        AcsTeamsUtils.injectAcsStyles(context.theme);
        
        // Register for theme changes
        AcsTeamsUtils.registerThemeChangeHandler((theme) => {
            AcsTeamsUtils.injectAcsStyles(theme);
        });
        
        // Initialize authentication
        const authResult = await AcsTeamsUtils.initializeAuthentication();
        
        // Initialize ACS chat
        const chatClient = AcsTeamsUtils.initializeChatClient(
            'https://your-acs-resource.communication.azure.com',
            authResult.acsToken
        );
        
        // Create or retrieve chat thread
        // This would typically be handled by your backend service
        const threadId = 'your-thread-id';
        
        // Register for chat notifications
        await AcsTeamsUtils.registerForChatNotifications(
            chatClient,
            threadId,
            handleChatNotification
        );
        
        console.log('Teams tab with ACS chat initialized');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function handleChatNotification(notification) {
    // Update UI based on notification type
    console.log('Notification received:', notification);
}
```

### Teams Meeting Integration with ACS Calling

```javascript
import * as AcsTeamsUtils from './ACS-Teams-Utils';

async function initializeMeetingIntegration() {
    try {
        // Initialize Teams SDK
        await AcsTeamsUtils.initializeTeamsSDK();
        
        // Get meeting context
        const meetingContext = await AcsTeamsUtils.getTeamsMeetingContext();
        
        // Set up UI
        const callUI = AcsTeamsUtils.setupAcsCallUI({
            allowMute: true,
            allowVideo: true
        });
        
        // Initialize authentication
        const authResult = await AcsTeamsUtils.initializeAuthentication();
        
        // Initialize ACS calling
        const callClient = new CallClient();
        const callAgent = await AcsTeamsUtils.initializeCallingClient(authResult.acsToken);
        
        // Set up local video
        const localVideoStream = await AcsTeamsUtils.setupLocalVideo(callClient);
        
        // Join Teams meeting
        const call = await AcsTeamsUtils.joinTeamsMeeting(
            callAgent,
            meetingContext.meetingLink,
            {
                videoOptions: {
                    localVideoStreams: [localVideoStream]
                }
            }
        );
        
        // Set up event handlers for remote participants
        call.on('remoteParticipantsUpdated', handleRemoteParticipants);
        
        console.log('Meeting integration initialized');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

function handleRemoteParticipants(event) {
    // Handle remote participants joining or leaving
    event.added.forEach(participant => {
        // Set up video rendering for this participant
        setupParticipantVideo(participant);
    });
    
    event.removed.forEach(participant => {
        // Clean up UI for this participant
        removeParticipantVideo(participant);
    });
}

async function setupParticipantVideo(participant) {
    // Get the first video stream from this participant
    const streams = participant.videoStreams;
    if (streams.length > 0) {
        const stream = streams[0];
        
        // Create a container for this participant
        const containerId = `participant-${participant.identifier.communicationUserId}`;
        const container = document.createElement('div');
        container.id = containerId;
        document.getElementById('remoteVideosContainer').appendChild(container);
        
        // Render the video
        await AcsTeamsUtils.renderRemoteVideo(stream, containerId);
    }
}
```

## Best Practices

### Performance

1. **Lazy Initialization**: Only initialize components when needed to improve startup time.

```javascript
// Instead of initializing everything at once:
let chatClient = null;

async function getChatClient(endpoint, token) {
    if (!chatClient) {
        chatClient = AcsTeamsUtils.initializeChatClient(endpoint, token);
    }
    return chatClient;
}
```

2. **Efficient UI Updates**: Only update UI elements that have changed.

```javascript
function updateParticipantList(participants, isAdded) {
    // Instead of rebuilding the entire list
    if (isAdded) {
        participants.forEach(participant => {
            if (!document.getElementById(`participant-${participant.id}`)) {
                addParticipantToList(participant);
            }
        });
    } else {
        participants.forEach(participant => {
            const element = document.getElementById(`participant-${participant.id}`);
            if (element) {
                element.remove();
            }
        });
    }
}
```

3. **Event Debouncing**: Debounce frequent events to prevent performance issues.

```javascript
let typingTimeout = null;

function handleTyping() {
    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Send typing indicator
    sendTypingIndicator();
    
    // Set timeout to clear typing indicator after 2 seconds
    typingTimeout = setTimeout(() => {
        // Clear typing indicator
        typingTimeout = null;
    }, 2000);
}
```

### Security

1. **Token Handling**: Never store ACS tokens in localStorage; use sessionStorage or memory.

```javascript
// Store token securely
function securelyStoreToken(token, expiresOn) {
    // Use sessionStorage (cleared when browser tab is closed)
    sessionStorage.setItem('acsToken', token);
    sessionStorage.setItem('tokenExpiry', expiresOn.toISOString());
    
    // Set a timer to refresh before expiration
    const expiryTime = new Date(expiresOn).getTime();
    const currentTime = Date.now();
    const timeToExpiry = expiryTime - currentTime;
    
    // Refresh 5 minutes before expiration
    const refreshTime = Math.max(timeToExpiry - 300000, 0);
    
    setTimeout(refreshToken, refreshTime);
}
```

2. **Input Validation**: Always validate inputs especially when used in API calls.

```javascript
function validateThreadId(threadId) {
    // Check if threadId matches expected format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!threadId || typeof threadId !== 'string' || !guidRegex.test(threadId)) {
        throw new Error('Invalid thread ID format');
    }
    
    return threadId;
}
```

### Accessibility

1. **Color Contrast**: Ensure all UI components have sufficient color contrast.

```javascript
// Modify the generated styles to ensure accessibility
function enhanceAccessibility(theme) {
    const styles = AcsTeamsUtils.generateAcsStyles(theme);
    
    // Ensure buttons have proper focus indicators
    const enhancedStyles = styles + `
        .acs-button:focus {
            outline: 2px solid ${theme === 'dark' ? '#ffffff' : '#000000'};
            outline-offset: 2px;
        }
        
        .acs-control-button:focus {
            outline: 2px solid ${theme === 'dark' ? '#ffffff' : '#000000'};
            outline-offset: 2px;
        }
    `;
    
    return enhancedStyles;
}
```

2. **Keyboard Navigation**: Ensure all interactive elements can be accessed via keyboard.

```javascript
function setupKeyboardAccessibility() {
    // Add keyboard event listeners
    document.addEventListener('keydown', (event) => {
        // Handle Escape key to exit full screen video
        if (event.key === 'Escape' && isFullScreenActive) {
            exitFullScreen();
        }
        
        // Toggle mute with M key
        if (event.key === 'm' && !isInputFocused()) {
            toggleMute();
        }
        
        // Toggle video with V key
        if (event.key === 'v' && !isInputFocused()) {
            toggleVideo();
        }
    });
}
```

## Troubleshooting

### Common Issues

1. **Teams SDK not initialized**: This is a common error when trying to use Teams SDK functions.

   **Solution**: Always call `initializeTeamsSDK()` before using any Teams SDK functions.

2. **ACS token expired**: Occurs when trying to use an expired ACS token.

   **Solution**: Implement token refresh logic and check token expiration before operations.

   ```javascript
   function isTokenExpired(tokenExpiryTime) {
       // Check if token expires in less than 5 minutes
       return (new Date(tokenExpiryTime).getTime() - Date.now()) < 300000;
   }
   
   async function ensureValidToken(acsUserId, currentToken, expiryTime) {
       if (isTokenExpired(expiryTime)) {
           // Refresh token
           const authResult = await AcsTeamsUtils.initializeAuthentication();
           return {
               token: authResult.acsToken,
               expiresOn: authResult.expiresOn
           };
       }
       
       return { token: currentToken, expiresOn: expiryTime };
   }
   ```

3. **Video rendering issues**: Problems displaying video streams.

   **Solution**: Check if the HTML container exists before trying to render video.

   ```javascript
   async function safeRenderVideo(stream, containerId) {
       const container = document.getElementById(containerId);
       
       if (!container) {
           console.error(`Container ${containerId} not found`);
           
           // Create container if it doesn't exist
           const newContainer = document.createElement('div');
           newContainer.id = containerId;
           document.body.appendChild(newContainer);
       }
       
       try {
           const renderer = await AcsTeamsUtils.renderRemoteVideo(stream, containerId);
           return renderer;
       } catch (error) {
           console.error('Error rendering video:', error);
           return null;
       }
   }
   ```

### Logging

Enable detailed logging for troubleshooting:

```javascript
function enableDetailedLogging() {
    // Set up a console logger that captures logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Array to store logs
    const logs = [];
    
    // Override console methods
    console.log = function(...args) {
        // Call original method
        originalConsoleLog.apply(console, args);
        
        // Store log
        logs.push({
            type: 'log',
            timestamp: new Date(),
            message: args
        });
    };
    
    console.error = function(...args) {
        originalConsoleError.apply(console, args);
        
        logs.push({
            type: 'error',
            timestamp: new Date(),
            message: args
        });
    };
    
    console.warn = function(...args) {
        originalConsoleWarn.apply(console, args);
        
        logs.push({
            type: 'warning',
            timestamp: new Date(),
            message: args
        });
    };
    
    // Add function to download logs
    window.downloadAcsLogs = function() {
        const logText = logs.map(log => 
            `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${JSON.stringify(log.message)}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `acs-teams-logs-${new Date().toISOString()}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    };
    
    return {
        getLogs: () => [...logs],
        clearLogs: () => { logs.length = 0; },
        downloadLogs: window.downloadAcsLogs
    };
}
```

### Network Diagnostics

Diagnose network issues affecting ACS connections:

```javascript
async function diagnoseCommunicationIssues() {
    const results = {
        internetConnectivity: false,
        acsEndpointReachable: false,
        teamsEndpointReachable: false,
        mediaPermissions: false,
        details: {}
    };
    
    // Check basic internet connectivity
    try {
        const response = await fetch('https://www.microsoft.com', { 
            method: 'HEAD', 
            mode: 'no-cors',
            cache: 'no-store' 
        });
        results.internetConnectivity = true;
    } catch (error) {
        results.details.internetError = error.message;
    }
    
    // Check ACS endpoint
    if (results.internetConnectivity) {
        try {
            const response = await fetch('https://global.communication.azure.com', { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-store' 
            });
            results.acsEndpointReachable = true;
        } catch (error) {
            results.details.acsEndpointError = error.message;
        }
    }
    
    // Check Teams endpoint
    if (results.internetConnectivity) {
        try {
            const response = await fetch('https://teams.microsoft.com', { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-store' 
            });
            results.teamsEndpointReachable = true;
        } catch (error) {
            results.details.teamsEndpointError = error.message;
        }
    }
    
    // Check media permissions
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        results.mediaPermissions = true;
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        results.details.mediaPermissionsError = error.message;
    }
    
    return results;
}
```

## Version Information

### Version History

- **1.0.0** - Initial release with core functionality
- **1.0.1** - Added proper theme support and accessibility improvements
- **1.1.0** - Enhanced calling features and meeting integration
- **1.2.0** - Added diagnostics and improved error handling

### Compatibility Table

| Feature | Teams SDK Version | ACS SDK Version | Browser Support |
|---------|-------------------|-----------------|-----------------|
| Chat    | 2.0.0+            | 1.2.0+          | Chrome, Edge, Firefox, Safari |
| Calling | 2.0.0+            | 1.2.0+          | Chrome, Edge, Safari (limited) |
| Meetings| 2.0.0+            | 1.3.0+          | Chrome, Edge |
| UI Components | 2.0.0+       | Any             | All modern browsers |

## Further Resources

- [Azure Communication Services Documentation](https://learn.microsoft.com/en-us/azure/communication-services/)
- [Microsoft Teams JavaScript SDK Documentation](https://learn.microsoft.com/en-us/javascript/api/overview/msteams-client)
- [Teams Interoperability with ACS](https://learn.microsoft.com/en-us/azure/communication-services/concepts/teams-interop)
- [ACS GitHub Samples](https://github.com/Azure-Samples/communication-services-javascript-quickstarts)

## License

MIT License

## Contributors

- Azure Communication Services Team
- Microsoft Teams Developer Platform
