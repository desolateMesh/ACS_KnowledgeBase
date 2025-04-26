# ACS Bot Helpers Library

## Overview

The ACS Bot Helpers library provides a comprehensive set of utility functions for integrating Azure Communication Services (ACS) with Microsoft Teams bots. This library simplifies common bot operations, manages authentication flows, handles message processing, and provides consistent error handling patterns.

## Key Features

- **Identity Management**: Create and manage ACS identities for Teams users
- **Chat Thread Management**: Create and manage ACS chat threads mapped to Teams conversations
- **Messaging Integration**: Forward messages between Teams and ACS
- **Adaptive Card Support**: Handle adaptive card actions for ACS integration
- **Error Handling**: Consistent error handling patterns for ACS operations
- **Token Management**: Manage ACS access tokens and refresh them when needed

## Prerequisites

- Azure Communication Services resource
- Bot Framework SDK
- Teams Bot integration
- Node.js environment

## Installation

Add the ACS-Bot-Helpers.js file to your project's libraries or utilities folder.

## Configuration

The library requires ACS connection string and endpoint. These can be provided through environment variables:

```javascript
// .env file
ACS_CONNECTION_STRING=endpoint=https://your-acs-resource.communication.azure.com/;accessKey=your-access-key
ACS_ENDPOINT=https://your-acs-resource.communication.azure.com/
```

## Core Functions

### Identity Management

#### `createAcsIdentityForTeamsUser(userId, acsConfig)`

Creates an ACS identity for a Teams user, enabling them to interact with ACS resources.

**Parameters:**
- `userId` (string): The Teams user ID
- `acsConfig` (object): Configuration with ACS connection string

**Returns:**
- Promise resolving to an object containing:
  - `acsUserId`: The ACS user ID
  - `acsToken`: The ACS access token
  - `expiresOn`: Token expiration time

**Example:**

```javascript
const { createAcsIdentityForTeamsUser, getAcsConfig } = require('./ACS-Bot-Helpers');

async function onMemberAdded(context) {
    try {
        const acsConfig = getAcsConfig();
        const teamsUserId = context.activity.from.id;
        
        const identity = await createAcsIdentityForTeamsUser(teamsUserId, acsConfig);
        console.log(`Created ACS identity: ${identity.acsUserId}`);
        
        // Store the token and user ID in your secure storage
    } catch (error) {
        console.error('Error creating identity:', error);
    }
}
```

#### `getAcsUserIdForTeamsUser(teamsUserId)`

Retrieves an ACS user ID for a given Teams user ID from storage.

**Parameters:**
- `teamsUserId` (string): The Teams user ID

**Returns:**
- Promise resolving to the ACS user ID or null if not found

**Example:**

```javascript
const { getAcsUserIdForTeamsUser } = require('./ACS-Bot-Helpers');

async function processUserMessage(context) {
    const teamsUserId = context.activity.from.id;
    const acsUserId = await getAcsUserIdForTeamsUser(teamsUserId);
    
    if (acsUserId) {
        console.log(`Found ACS identity: ${acsUserId}`);
        // Process message with ACS identity
    } else {
        console.log('User not yet registered with ACS');
        // Create an ACS identity for the user
    }
}
```

### Chat Thread Management

#### `createOrGetChatThread(teamsConversationId, acsUserId, acsToken, acsConfig)`

Creates or retrieves a chat thread for a Teams conversation.

**Parameters:**
- `teamsConversationId` (string): The Teams conversation ID
- `acsUserId` (string): The ACS user ID of the bot
- `acsToken` (string): The ACS access token for the bot
- `acsConfig` (object): Configuration with ACS endpoint

**Returns:**
- Promise resolving to the chat thread ID

**Example:**

```javascript
const { createOrGetChatThread, getAcsConfig } = require('./ACS-Bot-Helpers');

async function setupChatThread(context) {
    const acsConfig = getAcsConfig();
    const teamsConversationId = context.activity.conversation.id;
    const botAcsId = 'your-bot-acs-id'; // Retrieved from secure storage
    const botAcsToken = 'your-bot-acs-token'; // Retrieved from secure storage
    
    const threadId = await createOrGetChatThread(
        teamsConversationId,
        botAcsId,
        botAcsToken,
        acsConfig
    );
    
    console.log(`Using chat thread: ${threadId}`);
    return threadId;
}
```

#### `getChatThreadForConversation(teamsConversationId)`

Retrieves an ACS chat thread ID for a given Teams conversation ID.

**Parameters:**
- `teamsConversationId` (string): The Teams conversation ID

**Returns:**
- Promise resolving to the ACS chat thread ID or null if not found

**Example:**

```javascript
const { getChatThreadForConversation } = require('./ACS-Bot-Helpers');

async function checkExistingThread(context) {
    const teamsConversationId = context.activity.conversation.id;
    const threadId = await getChatThreadForConversation(teamsConversationId);
    
    if (threadId) {
        console.log(`Found existing thread: ${threadId}`);
        return threadId;
    } else {
        console.log('No existing thread found, creating new one');
        // Create a new thread
        return null;
    }
}
```

### Messaging

#### `sendMessageToThread(threadId, content, acsUserId, acsToken, acsConfig)`

Sends a message to an ACS chat thread.

**Parameters:**
- `threadId` (string): The ACS chat thread ID
- `content` (string): The content of the message
- `acsUserId` (string): The ACS user ID sending the message
- `acsToken` (string): The ACS access token
- `acsConfig` (object): Configuration with ACS endpoint

**Returns:**
- Promise resolving to the message ID of the sent message

**Example:**

```javascript
const { sendMessageToThread, getAcsConfig } = require('./ACS-Bot-Helpers');

async function sendNotification(threadId, message) {
    const acsConfig = getAcsConfig();
    const botAcsId = 'your-bot-acs-id'; // Retrieved from secure storage
    const botAcsToken = 'your-bot-acs-token'; // Retrieved from secure storage
    
    const messageId = await sendMessageToThread(
        threadId,
        message,
        botAcsId,
        botAcsToken,
        acsConfig
    );
    
    console.log(`Sent message: ${messageId}`);
    return messageId;
}
```

#### `forwardTeamsMessageToAcs(context, acsConfig)`

Forwards a message from Teams to an ACS chat thread.

**Parameters:**
- `context` (TurnContext): The Bot Framework turn context
- `acsConfig` (object): Configuration with ACS details

**Returns:**
- Promise resolving to a success indicator

**Example:**

```javascript
const { forwardTeamsMessageToAcs, getAcsConfig } = require('./ACS-Bot-Helpers');

async function onMessageActivity(context) {
    const acsConfig = getAcsConfig();
    
    // Forward the message to ACS
    const success = await forwardTeamsMessageToAcs(context, acsConfig);
    
    if (success) {
        console.log('Successfully forwarded message to ACS');
    } else {
        console.log('Failed to forward message to ACS');
    }
    
    // Continue processing the message
    await context.sendActivity('I received your message!');
}
```

### User Management

#### `addTeamsUserToThread(teamsUserId, threadId, acsConfig)`

Adds a Teams user to an ACS chat thread.

**Parameters:**
- `teamsUserId` (string): The Teams user ID
- `threadId` (string): The ACS chat thread ID
- `acsConfig` (object): Configuration with ACS details

**Returns:**
- Promise resolving to a success indicator

**Example:**

```javascript
const { addTeamsUserToThread, getAcsConfig } = require('./ACS-Bot-Helpers');

async function addUserToConversation(context, threadId) {
    const acsConfig = getAcsConfig();
    const teamsUserId = context.activity.from.id;
    
    const success = await addTeamsUserToThread(teamsUserId, threadId, acsConfig);
    
    if (success) {
        await context.sendActivity('You have been added to the conversation');
    } else {
        await context.sendActivity('Failed to add you to the conversation');
    }
}
```

### Adaptive Card Support

#### `handleAdaptiveCardAction(context)`

Handles adaptive card actions from Teams.

**Parameters:**
- `context` (TurnContext): The Bot Framework turn context

**Returns:**
- Promise resolving to void

**Example:**

```javascript
const { handleAdaptiveCardAction } = require('./ACS-Bot-Helpers');

async function onInvokeActivity(context) {
    if (context.activity.name === 'adaptiveCard/action') {
        await handleAdaptiveCardAction(context);
    }
}
```

#### `createAcsIntegrationCard(options)`

Creates an adaptive card for Teams with ACS integration options.

**Parameters:**
- `options` (object): Options for the card including title, description, and threadId

**Returns:**
- An adaptive card JSON object

**Example:**

```javascript
const { createAcsIntegrationCard } = require('./ACS-Bot-Helpers');

async function sendIntegrationCard(context, threadId) {
    const card = createAcsIntegrationCard({
        title: 'Join our ACS Chat',
        description: 'Connect to our Azure Communication Services chat',
        threadId: threadId
    });
    
    const attachment = { contentType: 'application/vnd.microsoft.card.adaptive', content: card };
    await context.sendActivity({ attachments: [attachment] });
}
```

### Error Handling

#### `handleAcsError(error, context)`

Handles errors in ACS operations with appropriate logging and responses.

**Parameters:**
- `error` (Error): The error that occurred
- `context` (TurnContext, optional): The Bot Framework turn context

**Returns:**
- Promise resolving to void

**Example:**

```javascript
const { handleAcsError } = require('./ACS-Bot-Helpers');

async function processAcsOperation(context) {
    try {
        // Perform ACS operation
    } catch (error) {
        await handleAcsError(error, context);
    }
}
```

### Token Management

#### `refreshAcsToken(acsUserId, acsConfig)`

Refreshes an ACS access token before it expires.

**Parameters:**
- `acsUserId` (string): The ACS user ID
- `acsConfig` (object): Configuration with ACS connection string

**Returns:**
- Promise resolving to an object containing the new token and expiration

**Example:**

```javascript
const { refreshAcsToken, getAcsConfig } = require('./ACS-Bot-Helpers');

async function ensureValidToken(acsUserId, currentToken, expiresOn) {
    const now = new Date();
    const expiryDate = new Date(expiresOn);
    
    // If token expires in less than 10 minutes, refresh it
    if ((expiryDate.getTime() - now.getTime()) < 600000) {
        console.log('Token is about to expire, refreshing');
        const acsConfig = getAcsConfig();
        const tokenInfo = await refreshAcsToken(acsUserId, acsConfig);
        return tokenInfo;
    }
    
    return { token: currentToken, expiresOn: expiresOn };
}
```

### Middleware

#### `setupAcsMiddleware(adapter, acsConfig)`

Sets up a middleware for handling ACS integration in a Teams bot.

**Parameters:**
- `adapter` (BotFrameworkAdapter): The Bot Framework adapter
- `acsConfig` (object): Configuration with ACS details

**Returns:**
- void

**Example:**

```javascript
const { BotFrameworkAdapter } = require('botbuilder');
const { setupAcsMiddleware, getAcsConfig } = require('./ACS-Bot-Helpers');

function configureBot() {
    const adapter = new BotFrameworkAdapter({
        appId: process.env.MicrosoftAppId,
        appPassword: process.env.MicrosoftAppPassword
    });
    
    const acsConfig = getAcsConfig();
    
    // Set up ACS middleware
    setupAcsMiddleware(adapter, acsConfig);
    
    return adapter;
}
```

## Integration Patterns

### Basic Bot Integration

```javascript
const { BotFrameworkAdapter } = require('botbuilder');
const { 
    setupAcsMiddleware, 
    getAcsConfig, 
    createAcsIdentityForTeamsUser,
    createOrGetChatThread
} = require('./ACS-Bot-Helpers');

// Configure the bot
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Set up ACS middleware
const acsConfig = getAcsConfig();
setupAcsMiddleware(adapter, acsConfig);

// Handle messages
adapter.onTurn(async (context) => {
    // Create an ACS identity for the user if needed
    if (context.activity.type === 'conversationUpdate' && context.activity.membersAdded) {
        for (const member of context.activity.membersAdded) {
            if (member.id !== context.activity.recipient.id) {
                const teamsUserId = member.id;
                await createAcsIdentityForTeamsUser(teamsUserId, acsConfig);
            }
        }
    }
    
    // Process messages
    if (context.activity.type === 'message') {
        await context.sendActivity(`You said: ${context.activity.text}`);
    }
});
```

### Multi-Team Collaboration

```javascript
const { 
    createOrGetChatThread,
    sendMessageToThread,
    addTeamsUserToThread,
    getAcsConfig
} = require('./ACS-Bot-Helpers');

async function setupCollaborationThread(context, teamMembers) {
    try {
        const acsConfig = getAcsConfig();
        const teamsConversationId = context.activity.conversation.id;
        const botAcsId = 'your-bot-acs-id';
        const botAcsToken = 'your-bot-acs-token';
        
        // Create or get a chat thread
        const threadId = await createOrGetChatThread(
            teamsConversationId,
            botAcsId,
            botAcsToken,
            acsConfig
        );
        
        // Add team members to the thread
        for (const memberId of teamMembers) {
            await addTeamsUserToThread(memberId, threadId, acsConfig);
        }
        
        // Send a welcome message
        await sendMessageToThread(
            threadId,
            'Welcome to the collaboration thread!',
            botAcsId,
            botAcsToken,
            acsConfig
        );
        
        return threadId;
    } catch (error) {
        console.error('Error setting up collaboration thread:', error);
        throw error;
    }
}
```

## Best Practices

### Security

1. **Store tokens securely**: Never hardcode tokens or connection strings. Use environment variables or a secure key vault.
2. **Refresh tokens regularly**: Use the `refreshAcsToken` function to ensure tokens are valid before usage.
3. **Validate user identity**: Always verify the Teams user ID before creating or retrieving ACS identities.

### Performance

1. **Cache thread mappings**: Implement a caching mechanism to reduce database calls for thread mapping lookups.
2. **Batch operations**: When adding multiple users to a thread, batch the requests if possible.
3. **Handle rate limiting**: Implement retry logic with exponential backoff for ACS operations that might be rate-limited.

### Reliability

1. **Implement error handling**: Always use try-catch blocks and the `handleAcsError` function to handle exceptions.
2. **Log operations**: Log the start and completion of key operations for troubleshooting.
3. **Implement fallback mechanisms**: Have fallback mechanisms for critical communication paths in case ACS is unavailable.

## Troubleshooting

### Common Issues

1. **Unauthorized errors**: Usually indicates an expired token or incorrect connection string. Ensure tokens are refreshed regularly.
2. **Resource not found errors**: Check that the thread ID, user ID, or other resource identifiers are correct.
3. **Too many requests errors**: Implement rate limiting and retry logic in your application.

### Logging

Enable detailed logging to diagnose issues:

```javascript
// Enable detailed logging
process.env.DEBUG = 'azure:communication:*';
```

### Examples of Common Error Messages

```
Error: Failed to create ACS identity: Unauthorized
Error: Failed to create or get chat thread: ResourceNotFound
Error: Failed to send message to thread: TooManyRequests
```

## References

- [Azure Communication Services Documentation](https://learn.microsoft.com/en-us/azure/communication-services/)
- [Microsoft Teams Bot Framework Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-basics)
- [Adaptive Cards Documentation](https://learn.microsoft.com/en-us/adaptive-cards/)

## Version History

- **1.0.0** - Initial release with core functionality
