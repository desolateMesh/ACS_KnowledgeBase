/**
 * ACS-Bot-Helpers.js
 * 
 * A collection of helper functions for building Azure Communication Services (ACS) 
 * integrated bots within Microsoft Teams.
 * 
 * These utilities simplify common bot operations, manage authentication flows,
 * handle message processing, and provide consistent error handling patterns
 * for Teams bots that utilize Azure Communication Services.
 * 
 * @version 1.0.0
 * @license MIT
 */

// Dependencies
const { BotFrameworkAdapter, TurnContext } = require('botbuilder');
const { CommunicationIdentityClient } = require('@azure/communication-identity');
const { ChatClient } = require('@azure/communication-chat');
const { AzureKeyCredential } = require('@azure/core-auth');

/**
 * Creates an ACS identity for a Teams user, enabling them to interact with ACS resources
 * 
 * @param {string} userId - The Teams user ID to create an ACS identity for
 * @param {Object} acsConfig - Configuration with ACS connection string
 * @returns {Promise<Object>} Object containing ACS user ID and access token
 */
async function createAcsIdentityForTeamsUser(userId, acsConfig) {
    try {
        if (!userId || !acsConfig || !acsConfig.connectionString) {
            throw new Error('Missing required parameters for ACS identity creation');
        }
        
        // Create an identity client using the connection string
        const identityClient = new CommunicationIdentityClient(acsConfig.connectionString);
        
        // Create a new ACS identity
        const identityResponse = await identityClient.createUser();
        
        // Issue an access token with chat scope
        const tokenResponse = await identityClient.getToken(identityResponse, ["chat"]);
        
        // Store mapping between Teams userId and ACS identity for future reference
        await storeUserMapping(userId, identityResponse.communicationUserId);
        
        return {
            acsUserId: identityResponse.communicationUserId,
            acsToken: tokenResponse.token,
            expiresOn: tokenResponse.expiresOn
        };
    } catch (error) {
        console.error('Error creating ACS identity:', error);
        throw new Error(`Failed to create ACS identity: ${error.message}`);
    }
}

/**
 * Stores a mapping between Teams user ID and ACS communication user ID
 * 
 * @param {string} teamsUserId - The Teams user ID
 * @param {string} acsUserId - The ACS communication user ID
 * @returns {Promise<boolean>} Success indicator
 */
async function storeUserMapping(teamsUserId, acsUserId) {
    // Implementation will depend on your storage solution (e.g., Cosmos DB, Table Storage)
    // This is a placeholder implementation
    try {
        // Example storage call
        /* 
        await userMappingTable.createEntity({
            partitionKey: teamsUserId,
            rowKey: acsUserId,
            timestamp: new Date()
        });
        */
        
        console.log(`Mapped Teams user ${teamsUserId} to ACS user ${acsUserId}`);
        return true;
    } catch (error) {
        console.error('Error storing user mapping:', error);
        return false;
    }
}

/**
 * Retrieves an ACS user ID for a given Teams user ID from storage
 * 
 * @param {string} teamsUserId - The Teams user ID
 * @returns {Promise<string|null>} The ACS user ID or null if not found
 */
async function getAcsUserIdForTeamsUser(teamsUserId) {
    // Implementation will depend on your storage solution
    // This is a placeholder implementation
    try {
        /* 
        const entity = await userMappingTable.getEntity(teamsUserId);
        return entity.rowKey;
        */
        
        // Placeholder return for example purposes
        return null;
    } catch (error) {
        console.error('Error retrieving ACS user mapping:', error);
        return null;
    }
}

/**
 * Creates or retrieves a chat thread for a Teams conversation
 * 
 * @param {string} teamsConversationId - The Teams conversation ID
 * @param {string} acsUserId - The ACS user ID of the bot
 * @param {string} acsToken - The ACS access token for the bot
 * @param {Object} acsConfig - Configuration with ACS endpoint
 * @returns {Promise<string>} The chat thread ID
 */
async function createOrGetChatThread(teamsConversationId, acsUserId, acsToken, acsConfig) {
    try {
        // First check if we already have a thread ID for this conversation
        const existingThreadId = await getChatThreadForConversation(teamsConversationId);
        if (existingThreadId) {
            return existingThreadId;
        }
        
        // Create a new chat client
        const chatClient = new ChatClient(
            acsConfig.endpoint,
            new AzureKeyCredential(acsToken)
        );
        
        // Create a new chat thread
        const createChatThreadRequest = {
            topic: `Teams Conversation ${teamsConversationId}`,
        };
        
        const createChatThreadResult = await chatClient.createChatThread(createChatThreadRequest);
        const threadId = createChatThreadResult.chatThread.id;
        
        // Store mapping between Teams conversation and ACS chat thread
        await storeThreadMapping(teamsConversationId, threadId);
        
        return threadId;
    } catch (error) {
        console.error('Error creating or getting chat thread:', error);
        throw new Error(`Failed to create or get chat thread: ${error.message}`);
    }
}

/**
 * Stores a mapping between Teams conversation ID and ACS chat thread ID
 * 
 * @param {string} teamsConversationId - The Teams conversation ID
 * @param {string} threadId - The ACS chat thread ID
 * @returns {Promise<boolean>} Success indicator
 */
async function storeThreadMapping(teamsConversationId, threadId) {
    // Implementation will depend on your storage solution
    // This is a placeholder implementation
    try {
        /* 
        await threadMappingTable.createEntity({
            partitionKey: teamsConversationId,
            rowKey: threadId,
            timestamp: new Date()
        });
        */
        
        console.log(`Mapped Teams conversation ${teamsConversationId} to ACS thread ${threadId}`);
        return true;
    } catch (error) {
        console.error('Error storing thread mapping:', error);
        return false;
    }
}

/**
 * Retrieves an ACS chat thread ID for a given Teams conversation ID
 * 
 * @param {string} teamsConversationId - The Teams conversation ID
 * @returns {Promise<string|null>} The ACS chat thread ID or null if not found
 */
async function getChatThreadForConversation(teamsConversationId) {
    // Implementation will depend on your storage solution
    // This is a placeholder implementation
    try {
        /* 
        const entity = await threadMappingTable.getEntity(teamsConversationId);
        return entity.rowKey;
        */
        
        // Placeholder return for example purposes
        return null;
    } catch (error) {
        console.error('Error retrieving chat thread mapping:', error);
        return null;
    }
}

/**
 * Sends a message to an ACS chat thread
 * 
 * @param {string} threadId - The ACS chat thread ID
 * @param {string} content - The content of the message
 * @param {string} acsUserId - The ACS user ID sending the message
 * @param {string} acsToken - The ACS access token
 * @param {Object} acsConfig - Configuration with ACS endpoint
 * @returns {Promise<string>} The message ID of the sent message
 */
async function sendMessageToThread(threadId, content, acsUserId, acsToken, acsConfig) {
    try {
        // Create a new chat client
        const chatClient = new ChatClient(
            acsConfig.endpoint,
            new AzureKeyCredential(acsToken)
        );
        
        // Get a thread client
        const threadClient = chatClient.getChatThreadClient(threadId);
        
        // Send the message
        const sendMessageRequest = {
            content: content
        };
        
        const sendMessageResult = await threadClient.sendMessage(sendMessageRequest);
        return sendMessageResult.id;
    } catch (error) {
        console.error('Error sending message to thread:', error);
        throw new Error(`Failed to send message to thread: ${error.message}`);
    }
}

/**
 * Forwards a message from Teams to an ACS chat thread
 * 
 * @param {TurnContext} context - The Bot Framework turn context
 * @param {Object} acsConfig - Configuration with ACS details
 * @returns {Promise<boolean>} Success indicator
 */
async function forwardTeamsMessageToAcs(context, acsConfig) {
    try {
        // Get the Teams conversation ID
        const teamsConversationId = context.activity.conversation.id;
        
        // Get the bot's ACS identity and token
        // In a real implementation, you would retrieve this from a secure storage
        const botAcsId = 'your-bot-acs-id';
        const botAcsToken = 'your-bot-acs-token';
        
        // Get or create a chat thread for this conversation
        const threadId = await createOrGetChatThread(
            teamsConversationId,
            botAcsId,
            botAcsToken,
            acsConfig
        );
        
        // Forward the message content
        const messageContent = context.activity.text;
        const messageId = await sendMessageToThread(
            threadId,
            messageContent,
            botAcsId,
            botAcsToken,
            acsConfig
        );
        
        return !!messageId;
    } catch (error) {
        console.error('Error forwarding Teams message to ACS:', error);
        return false;
    }
}

/**
 * Adds a Teams user to an ACS chat thread
 * 
 * @param {string} teamsUserId - The Teams user ID
 * @param {string} threadId - The ACS chat thread ID
 * @param {Object} acsConfig - Configuration with ACS details
 * @returns {Promise<boolean>} Success indicator
 */
async function addTeamsUserToThread(teamsUserId, threadId, acsConfig) {
    try {
        // Get the user's ACS ID (or create one if it doesn't exist)
        let acsUserId = await getAcsUserIdForTeamsUser(teamsUserId);
        
        if (!acsUserId) {
            const identity = await createAcsIdentityForTeamsUser(teamsUserId, acsConfig);
            acsUserId = identity.acsUserId;
        }
        
        // Get a bot token for ACS
        // In a real implementation, you would retrieve this from a secure storage
        const botAcsToken = 'your-bot-acs-token';
        
        // Create a new chat client
        const chatClient = new ChatClient(
            acsConfig.endpoint,
            new AzureKeyCredential(botAcsToken)
        );
        
        // Get a thread client
        const threadClient = chatClient.getChatThreadClient(threadId);
        
        // Add the user
        await threadClient.addParticipants({
            participants: [
                {
                    id: { communicationUserId: acsUserId },
                    displayName: `Teams User ${teamsUserId}`
                }
            ]
        });
        
        return true;
    } catch (error) {
        console.error('Error adding Teams user to ACS thread:', error);
        return false;
    }
}

/**
 * Handles adaptive card actions from Teams
 * 
 * @param {TurnContext} context - The Bot Framework turn context
 * @returns {Promise<void>}
 */
async function handleAdaptiveCardAction(context) {
    try {
        const action = context.activity.value;
        
        if (!action) {
            return;
        }
        
        switch (action.actionType) {
            case 'joinAcsThread':
                await handleJoinThreadAction(context, action);
                break;
            case 'sendAcsMessage':
                await handleSendMessageAction(context, action);
                break;
            default:
                console.log(`Unknown action type: ${action.actionType}`);
                break;
        }
    } catch (error) {
        console.error('Error handling adaptive card action:', error);
    }
}

/**
 * Handles a request to join an ACS thread
 * 
 * @param {TurnContext} context - The Bot Framework turn context
 * @param {Object} action - The action data
 * @returns {Promise<void>}
 */
async function handleJoinThreadAction(context, action) {
    // Implementation of handling join thread action
    // This would typically create an ACS identity for the user if needed
    // and add them to the specified thread
    
    await context.sendActivity('Processing your request to join the thread...');
    // Call addTeamsUserToThread with the appropriate parameters
}

/**
 * Handles a request to send a message to an ACS thread
 * 
 * @param {TurnContext} context - The Bot Framework turn context
 * @param {Object} action - The action data
 * @returns {Promise<void>}
 */
async function handleSendMessageAction(context, action) {
    // Implementation of handling send message action
    // This would typically retrieve the user's ACS identity and token
    // and use it to send a message to the specified thread
    
    await context.sendActivity('Sending your message to the thread...');
    // Call sendMessageToThread with the appropriate parameters
}

/**
 * Creates an adaptive card for Teams with ACS integration options
 * 
 * @param {Object} options - Options for the card
 * @returns {Object} An adaptive card JSON object
 */
function createAcsIntegrationCard(options) {
    return {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        version: '1.3',
        body: [
            {
                type: 'TextBlock',
                text: options.title || 'Azure Communication Services Integration',
                size: 'Large',
                weight: 'Bolder'
            },
            {
                type: 'TextBlock',
                text: options.description || 'Connect to ACS services',
                wrap: true
            }
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Join Chat Thread',
                data: {
                    actionType: 'joinAcsThread',
                    threadId: options.threadId
                }
            },
            {
                type: 'Action.ShowCard',
                title: 'Send Message',
                card: {
                    type: 'AdaptiveCard',
                    body: [
                        {
                            type: 'Input.Text',
                            id: 'messageText',
                            placeholder: 'Type your message here',
                            isMultiline: true
                        }
                    ],
                    actions: [
                        {
                            type: 'Action.Submit',
                            title: 'Send',
                            data: {
                                actionType: 'sendAcsMessage',
                                threadId: options.threadId
                            }
                        }
                    ]
                }
            }
        ]
    };
}

/**
 * Handles errors in ACS operations with appropriate logging and responses
 * 
 * @param {Error} error - The error that occurred
 * @param {TurnContext} context - The Bot Framework turn context (optional)
 * @returns {Promise<void>}
 */
async function handleAcsError(error, context) {
    console.error('ACS error occurred:', error);
    
    // Determine the user-friendly error message
    let userMessage;
    
    if (error.code === 'Unauthorized') {
        userMessage = 'Your authorization to access communication services has expired. Please try again.';
    } else if (error.code === 'ResourceNotFound') {
        userMessage = 'The requested communication resource could not be found.';
    } else if (error.code === 'TooManyRequests') {
        userMessage = 'The service is currently busy. Please try again in a few minutes.';
    } else {
        userMessage = 'An error occurred while processing your request. Our team has been notified.';
    }
    
    // Send a message to the user if a context is provided
    if (context) {
        await context.sendActivity(userMessage);
    }
    
    // Additional error handling like sending telemetry could be added here
}

/**
 * Gets configuration for ACS from environment variables or settings
 * 
 * @returns {Object} ACS configuration object
 */
function getAcsConfig() {
    return {
        connectionString: process.env.ACS_CONNECTION_STRING,
        endpoint: process.env.ACS_ENDPOINT
    };
}

/**
 * Refreshes an ACS access token before it expires
 * 
 * @param {string} acsUserId - The ACS user ID
 * @param {Object} acsConfig - Configuration with ACS connection string
 * @returns {Promise<Object>} Object containing the new token and expiration
 */
async function refreshAcsToken(acsUserId, acsConfig) {
    try {
        // Create an identity client using the connection string
        const identityClient = new CommunicationIdentityClient(acsConfig.connectionString);
        
        // Issue a new access token with chat scope
        const tokenResponse = await identityClient.getToken(
            { communicationUserId: acsUserId },
            ["chat"]
        );
        
        return {
            token: tokenResponse.token,
            expiresOn: tokenResponse.expiresOn
        };
    } catch (error) {
        console.error('Error refreshing ACS token:', error);
        throw new Error(`Failed to refresh ACS token: ${error.message}`);
    }
}

/**
 * Sets up a middleware for handling ACS integration in a Teams bot
 * 
 * @param {BotFrameworkAdapter} adapter - The Bot Framework adapter
 * @param {Object} acsConfig - Configuration with ACS details
 * @returns {void}
 */
function setupAcsMiddleware(adapter, acsConfig) {
    adapter.use(async (context, next) => {
        try {
            // Check if this is a message activity
            if (context.activity.type === 'message') {
                // Forward the message to ACS (only if needed for your scenario)
                await forwardTeamsMessageToAcs(context, acsConfig);
            }
            // Check if this is a card action
            else if (context.activity.type === 'invoke' && context.activity.name === 'adaptiveCard/action') {
                // Handle adaptive card action
                await handleAdaptiveCardAction(context);
            }
            
            // Call next middleware
            await next();
        } catch (error) {
            // Handle the error
            await handleAcsError(error, context);
        }
    });
}

// Export the helper functions
module.exports = {
    createAcsIdentityForTeamsUser,
    getAcsUserIdForTeamsUser,
    createOrGetChatThread,
    sendMessageToThread,
    forwardTeamsMessageToAcs,
    addTeamsUserToThread,
    handleAdaptiveCardAction,
    createAcsIntegrationCard,
    handleAcsError,
    getAcsConfig,
    refreshAcsToken,
    setupAcsMiddleware
};
