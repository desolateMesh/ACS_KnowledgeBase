# Teams JS SDK Integration

## Overview

The Microsoft Teams JavaScript Client SDK (Teams JS SDK) allows developers to integrate Teams functionalities into custom web applications, extend Teams capabilities, and create seamless experiences between Teams and third-party services. This document provides comprehensive guidance on integrating and using the Teams JS SDK in your development projects.

## Version Information

| Version | Release Date | Key Features | Support Status |
|---------|-------------|--------------|----------------|
| 2.22.0  | April 2025  | Enhanced mobile support, improved Teams AI capabilities | Current |
| 2.0.0   | October 2023 | Major architecture update, Promise-based API, TypeScript support | Supported |
| 1.x     | Pre-2023    | Callback-based API | Legacy (Migration recommended) |

## Prerequisites

Before integrating the Teams JS SDK, ensure your development environment meets these requirements:

- Node.js (version 16.0.0 or higher)
- npm or yarn package manager
- Web development knowledge (HTML, CSS, JavaScript/TypeScript)
- Microsoft 365 Developer account for testing
- Microsoft Teams client (desktop, web, or mobile)
- Azure subscription (if building backend services)

## Installation and Setup

### 1. Install the SDK

The Teams JS SDK is available as an npm package. Install it in your project using:

```bash
# Using npm
npm install @microsoft/teams-js

# Using yarn
yarn add @microsoft/teams-js
```

### 2. Import the SDK

Import the SDK in your application code:

```typescript
// JavaScript
import * as microsoftTeams from "@microsoft/teams-js";

// TypeScript
import * as microsoftTeams from "@microsoft/teams-js";
```

### 3. Initialize the SDK

Initialize the SDK before using any of its capabilities:

```typescript
// Initialize the Teams SDK
microsoftTeams.app.initialize().then(() => {
    // SDK is initialized and ready to use
    console.log("Teams SDK initialized successfully");
}).catch((error) => {
    // Handle initialization failure
    console.error("Failed to initialize Teams SDK", error);
});
```

## Key Capabilities

### 1. Authentication

Implement single sign-on (SSO) with Teams identity or integrate with other identity providers:

```typescript
// Authentication using SSO
microsoftTeams.authentication.getAuthToken({
    successCallback: (token) => {
        // Use the token for API calls
    },
    failureCallback: (error) => {
        // Handle authentication failure
    }
});

// Launch authentication popup
microsoftTeams.authentication.authenticate({
    url: "https://your-auth-page.com/auth",
    width: 600,
    height: 535,
    successCallback: (result) => {
        // Handle successful authentication
    },
    failureCallback: (reason) => {
        // Handle authentication failure
    }
});
```

### 2. Context Information

Access contextual information about the Teams environment, user, and current session:

```typescript
// Get the Teams context
microsoftTeams.app.getContext().then((context) => {
    // Access user information
    const userName = context.user.userPrincipalName;
    
    // Access team information (if in a team)
    const teamId = context.team?.internalId;
    
    // Access tenant information
    const tenantId = context.user.tenant.id;
    
    // Check if in meeting
    const isInMeeting = context.meeting?.id ? true : false;
}).catch((error) => {
    console.error("Failed to get context", error);
});
```

### 3. UI Integration

#### Dialog Management

Open and manage dialogs within Teams:

```typescript
// Open a dialog
microsoftTeams.dialog.open({
    title: "Dialog Title",
    url: "https://your-dialog-url.com",
    size: {
        height: 300,
        width: 400
    },
    fallbackUrl: "https://your-fallback-url.com"
});

// Close a dialog with result
microsoftTeams.dialog.submit("Result data", "appId");

// Close a dialog without result
microsoftTeams.dialog.close();
```

#### Tab Configuration

Configure custom tabs:

```typescript
// Register configuration changes handler
microsoftTeams.pages.config.registerOnSaveHandler((saveEvent) => {
    // Get configuration settings
    const settings = {
        entityId: "uniqueEntityId",
        contentUrl: "https://your-tab-url.com",
        websiteUrl: "https://your-website-url.com",
        suggestedDisplayName: "Tab Name"
    };
    
    // Set configuration settings
    microsoftTeams.pages.config.setConfig(settings);
    
    // Notify Teams that configuration is complete
    saveEvent.notifySuccess();
});

// Register validation handler
microsoftTeams.pages.config.registerOnValidateHandler((validationEvent) => {
    // Validate configuration
    const isValid = true; // Your validation logic
    
    // Notify Teams of validation result
    validationEvent.notifySuccess();
    // or: validationEvent.notifyFailure("Validation message");
});
```

### 4. Collaboration Features

Access and work with collaborative features in Teams:

```typescript
// Share content to Teams chat
microsoftTeams.sharing.shareWebContent({
    content: [
        {
            type: "URL",
            url: "https://your-url.com",
            preview: true
        }
    ]
});

// Get participant information in a meeting
microsoftTeams.meeting.getParticipants().then((participants) => {
    // Process participant information
    participants.forEach(participant => {
        console.log(`${participant.displayName} (${participant.userId})`);
    });
}).catch((error) => {
    console.error("Failed to get participants", error);
});
```

### 5. Deep Linking

Create deep links to different Teams resources:

```typescript
// Generate a deep link to a chat
const chatDeepLink = microsoftTeams.createDeepLink({
    subEntityId: "chatThreadId",
    subEntityLabel: "Chat Name",
    appId: "your-app-id",
    channelId: "channelId", // Optional
});

// Open a deep link
microsoftTeams.app.openLink("https://teams.microsoft.com/l/team/...");
```

## Advanced Integration Scenarios

### 1. Adaptive Cards Integration

Integrate with Adaptive Cards for rich interactive experiences:

```typescript
// Send an Adaptive Card to the current conversation
microsoftTeams.tasks.startTask({
    card: {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
            type: "AdaptiveCard",
            version: "1.2",
            body: [
                {
                    type: "TextBlock",
                    text: "Hello, Adaptive Card!"
                },
                {
                    type: "Input.Text",
                    id: "userInput",
                    placeholder: "Enter your response"
                }
            ],
            actions: [
                {
                    type: "Action.Submit",
                    title: "Submit"
                }
            ]
        }
    },
    width: 500,
    height: 300,
    title: "Adaptive Card Task",
    completionBotId: "your-bot-id"
});
```

### 2. Live Share SDK Integration

Enable real-time collaborative experiences in your apps using Live Share SDK:

```typescript
import { LiveShareClient } from "@microsoft/live-share";
import { ContainerSchema, SharedMap } from "fluid-framework";

// Initialize Live Share client
const liveShare = new LiveShareClient();

// Join a Fluid container session
const schema = new ContainerSchema({
    initialObjects: { 
        sharedData: SharedMap 
    }
});

// Join the Fluid container
const { container } = await liveShare.joinContainer(schema);
const sharedMap = container.initialObjects.sharedData;

// Handle changes in shared data
sharedMap.on("valueChanged", (changed, local) => {
    console.log(`Value changed: ${changed.key} = ${sharedMap.get(changed.key)}`);
});

// Make changes to shared data
sharedMap.set("documentStatus", "editing");
```

### 3. Meeting Extensions

Create and integrate meeting extensions for collaborative experiences:

```typescript
// Register meeting ready handler
microsoftTeams.meeting.registerMeetingReady(() => {
    console.log("Meeting is ready");
});

// Get meeting details
microsoftTeams.meeting.getMeetingDetails().then((meetingDetails) => {
    console.log(`Meeting ID: ${meetingDetails.id}`);
    console.log(`Meeting Type: ${meetingDetails.type}`);
}).catch((error) => {
    console.error("Failed to get meeting details", error);
});

// Share content to meeting stage
microsoftTeams.meeting.shareAppContentToStage((error, result) => {
    if (error) {
        console.error("Failed to share content", error);
    } else {
        console.log("Content shared successfully");
    }
}, "https://your-app-url.com");
```

## Performance Best Practices

1. **Lazy Loading**: Only initialize and load the Teams JS SDK components when needed to reduce initial load time:

```typescript
// Lazy load the Teams SDK
let teamsSDK;
async function loadTeamsSDK() {
    if (!teamsSDK) {
        teamsSDK = await import("@microsoft/teams-js");
        await teamsSDK.app.initialize();
    }
    return teamsSDK;
}
```

2. **Error Handling**: Implement robust error handling for all SDK operations:

```typescript
// Add global error handling
try {
    // Teams SDK operations
} catch (error) {
    // Log error to your monitoring system
    console.error("Teams SDK operation failed", error);
    
    // User-friendly error message
    displayErrorToUser("We encountered an issue connecting to Teams. Please refresh and try again.");
    
    // Fallback behavior
    implementFallbackLogic();
}
```

3. **Feature Detection**: Check for feature availability before using it:

```typescript
// Check if a feature is supported
if (microsoftTeams.meeting) {
    // Use meeting APIs
} else {
    // Provide alternative experience
    console.log("Meeting API is not supported in current context");
}
```

## Debugging and Troubleshooting

### Common Issues and Resolutions

1. **SDK Initialization Failure**
   - **Symptoms**: Functions return undefined, SDK operations fail
   - **Resolution**: 
     - Ensure SDK is initialized before use
     - Check browser console for errors
     - Verify Teams is correctly loaded in iframe

2. **Authentication Issues**
   - **Symptoms**: Unable to get auth token, auth popups blocked
   - **Resolution**:
     - Check tenant and app registration configuration
     - Ensure redirect URLs are properly configured
     - Use the Teams SDK authentication for Teams-aware auth

3. **Mobile-specific Issues**
   - **Symptoms**: Features work on desktop but not on mobile
   - **Resolution**:
     - Check feature support matrix for mobile
     - Implement adaptive designs for mobile interfaces
     - Test thoroughly on all target devices

### Logging and Diagnostics

Enable debug logging for better troubleshooting:

```typescript
// Enable debug logging
microsoftTeams.app.initialize({
    debugConfig: {
        enableDebug: true,
        debugLevel: "Verbose"
    }
}).then(() => {
    console.log("Teams SDK initialized with debugging enabled");
}).catch((error) => {
    console.error("Failed to initialize Teams SDK", error);
});
```

## Migration Guide

### Migrating from v1.x to v2.x

1. **Update Installation**:
   ```bash
   npm uninstall @microsoft/teams-js@1
   npm install @microsoft/teams-js
   ```

2. **Replace callback pattern with Promises**:
   ```typescript
   // Old v1.x code
   microsoftTeams.getContext((context) => {
       // Use context
   });
   
   // New v2.x code
   microsoftTeams.app.getContext().then((context) => {
       // Use context
   });
   ```

3. **Update namespaces**:
   - Replace `microsoftTeams.settings` with `microsoftTeams.pages.config`
   - Replace `microsoftTeams.navigateCrossDomain` with `microsoftTeams.app.openLink`

4. **Update authentication methods**:
   ```typescript
   // Old v1.x code
   microsoftTeams.authentication.authenticate({
       url: "https://your-auth-page.com",
       successCallback: (result) => {},
       failureCallback: (reason) => {}
   });
   
   // New v2.x code
   microsoftTeams.authentication.authenticate({
       url: "https://your-auth-page.com",
   }).then((result) => {
       // Success
   }).catch((error) => {
       // Failure
   });
   ```

## Security Considerations

1. **Handle sensitive data securely**:
   - Never store auth tokens or sensitive user data in localStorage or sessionStorage
   - Use secure, HTTP-only cookies for persistent tokens
   - Implement proper HTTPS throughout your application

2. **Validate input and context**:
   - Always validate data received from Teams context
   - Implement proper authorization checks based on Teams identity

3. **SSO token handling**:
   - Validate tokens on your backend before granting access
   - Implement proper token refresh logic
   - Set appropriate token expiration times

```typescript
// Example of secure token handling
microsoftTeams.authentication.getAuthToken({
    successCallback: (token) => {
        // Send token to backend for validation
        fetch("https://your-api.com/validate-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token })
        })
        .then(response => response.json())
        .then(validatedData => {
            // Proceed with validated data
        });
    },
    failureCallback: (error) => {
        // Handle authentication failure
        console.error("Authentication failed", error);
    }
});
```

## Testing and Deployment

### Testing Your Integration

1. **Local development**:
   - Use the Teams Toolkit for VS Code or Visual Studio
   - Use ngrok or similar tools to expose local development endpoints
   - Test in different Teams contexts (personal, channel, meeting)

2. **Automated testing**:
   - Implement unit tests for components
   - Use mocking libraries to simulate Teams context
   - Implement integration tests for end-to-end flows

```typescript
// Example of mocking Teams SDK for testing
jest.mock("@microsoft/teams-js", () => ({
    app: {
        initialize: jest.fn().mockResolvedValue(undefined),
        getContext: jest.fn().mockResolvedValue({
            user: {
                id: "test-user-id",
                displayName: "Test User",
                userPrincipalName: "test.user@example.com"
            },
            team: {
                internalId: "test-team-id"
            }
        })
    }
}));
```

### Deployment Checklist

1. **Pre-deployment validation**:
   - Verify all API endpoints are secured with HTTPS
   - Ensure all environments (dev, test, prod) are properly configured
   - Validate Teams manifest file

2. **App distribution**:
   - Package your app for Teams App Catalog
   - Consider distribution options (organization-wide, specific users, public)
   - Prepare documentation for end-users

3. **Post-deployment monitoring**:
   - Implement application monitoring
   - Set up error tracking and reporting
   - Monitor usage analytics

## Resources and Support

### Official Documentation

- [Microsoft Teams Developer Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- [Teams JS SDK Reference](https://learn.microsoft.com/en-us/javascript/api/@microsoft/teams-js/?view=msteams-client-js-latest)
- [Microsoft Teams Samples on GitHub](https://github.com/OfficeDev/Microsoft-Teams-Samples)

### Community Resources

- [Microsoft Q&A for Teams Development](https://learn.microsoft.com/en-us/answers/topics/teams-development.html)
- [Stack Overflow - Microsoft Teams tag](https://stackoverflow.com/questions/tagged/microsoft-teams)
- [Microsoft Teams Developer Community](https://techcommunity.microsoft.com/t5/microsoft-teams-developer/bd-p/microsoftteamsdevelopment)

### Support Channels

- **Technical Issues**: Submit support tickets through Microsoft 365 Admin Center
- **API Questions**: Post on Microsoft Q&A or Stack Overflow
- **Feature Requests**: Submit through the Microsoft 365 Developer Platform Ideas forum

## Appendix: Context Properties Reference

The following table lists the key properties available in the Teams context object:

| Property | Description | Example Value |
|----------|-------------|---------------|
| `context.app.locale` | User's locale | "en-us" |
| `context.app.sessionId` | Current session ID | "123456789" |
| `context.app.theme` | Current Teams theme | "default", "dark", "contrast" |
| `context.page.id` | Current page ID | "tab123" |
| `context.page.frameContext` | Current frame context | "content", "settings", "remove", "sidePanel" |
| `context.user.id` | User's Teams ID | "29:1XJKJMvc5GBtc2JwZq0oj8tHZmzrQgFmB39ATiQWA85gQtHieVkKilBZ9XHoq9j7Zaqt7CZ-NJWi7me2kHTL3Bw" |
| `context.user.displayName` | User's display name | "John Doe" |
| `context.user.userPrincipalName` | User's UPN | "john.doe@example.com" |
| `context.user.tenant.id` | User's tenant ID | "72f988bf-86f1-41af-91ab-2d7cd011db47" |
| `context.team.internalId` | Team ID (if in a team) | "19:cbe3683f25094106b644568d52ae1f4c@thread.skype" |
| `context.team.displayName` | Team name (if in a team) | "Engineering Team" |
| `context.channel.id` | Channel ID (if in a channel) | "19:d25cfbe5004648c28354b2a1a7b322bc@thread.skype" |
| `context.channel.displayName` | Channel name (if in a channel) | "General" |
| `context.chat.id` | Chat ID (if in a chat) | "19:meeting_MjdhNjM4YzUtYzExZi00OTFkLTkzZTAtNTVlNmZmMDhkNGU2@thread.v2" |
| `context.meeting.id` | Meeting ID (if in a meeting) | "MCMxOTptZWV0aW5nX1lXTnBZV3hjZFc1V1lXeHNZbUZqYXpsMGVWUjVVR1JtUVhWamFuZzVkM2czUjBGdldtNTNhV0pzZWpFek1qTTBRQHRocmVhZC52Mg==" |

## How to Contribute

If you find issues or have suggestions for improving this documentation:

1. Submit an issue on our GitHub repository
2. Create a pull request with your proposed changes
3. Join our regular community calls for Teams developers
4. Provide feedback through the product feedback channels
