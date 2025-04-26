/**
 * ACS-Teams-Utils.js
 * 
 * A comprehensive utility library for integrating Azure Communication Services (ACS)
 * with Microsoft Teams applications, providing helpers for common tasks related to
 * authentication, context handling, UI integration, and communication features.
 * 
 * These utilities simplify the development of Teams applications that utilize
 * ACS features like chat, calling, and meeting integrations.
 * 
 * @version 1.0.0
 * @license MIT
 */

// Dependencies
import * as microsoftTeams from '@microsoft/teams-js';
import { CallClient, CallAgent, VideoStreamRenderer, LocalVideoStream } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import { ChatClient } from '@azure/communication-chat';
import { AzureKeyCredential } from '@azure/core-auth';

/**
 * Initialize the Teams SDK and ensure it's ready to use
 * 
 * @returns {Promise<void>} Resolves when Teams SDK is initialized
 */
export async function initializeTeamsSDK() {
    try {
        // Initialize the Teams SDK
        await microsoftTeams.app.initialize();
        console.log('Teams SDK initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Teams SDK:', error);
        throw error;
    }
}

/**
 * Get the current Teams context, including user and environment information
 * 
 * @returns {Promise<Object>} The Teams context object
 */
export async function getTeamsContext() {
    try {
        const context = await microsoftTeams.app.getContext();
        return context;
    } catch (error) {
        console.error('Failed to get Teams context:', error);
        throw error;
    }
}

/**
 * Convert a Teams user identity to an ACS compatible identity
 * 
 * @param {Object} teamsContext - The Teams context object
 * @param {Object} acsConfig - ACS configuration options
 * @returns {Promise<Object>} Object containing ACS user details
 */
export async function convertTeamsUserToAcsIdentity(teamsContext, acsConfig) {
    try {
        if (!teamsContext || !teamsContext.user || !teamsContext.user.id) {
            throw new Error('Invalid Teams context or missing user information');
        }

        // This would typically involve a server-side call to exchange the Teams token
        // for an ACS token through your backend service
        const response = await fetch(`${acsConfig.identityServiceUrl}/api/getAcsIdentity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamsUserId: teamsContext.user.id
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to convert Teams identity: ${response.statusText}`);
        }

        const acsIdentity = await response.json();
        return {
            acsUserId: acsIdentity.communicationUserId,
            acsToken: acsIdentity.token,
            expiresOn: acsIdentity.expiresOn
        };
    } catch (error) {
        console.error('Error converting Teams user to ACS identity:', error);
        throw error;
    }
}

/**
 * Initialize an ACS chat client with the appropriate credentials
 * 
 * @param {string} endpoint - The ACS endpoint
 * @param {string} token - The ACS access token
 * @returns {ChatClient} The initialized chat client
 */
export function initializeChatClient(endpoint, token) {
    try {
        // Create an ACS token credential
        const tokenCredential = new AzureCommunicationTokenCredential(token);
        
        // Initialize the chat client
        const chatClient = new ChatClient(endpoint, tokenCredential);
        return chatClient;
    } catch (error) {
        console.error('Error initializing ACS chat client:', error);
        throw error;
    }
}

/**
 * Initialize an ACS calling client with the appropriate credentials
 * 
 * @param {string} token - The ACS access token
 * @returns {Promise<CallAgent>} The initialized call agent
 */
export async function initializeCallingClient(token) {
    try {
        // Create an ACS token credential
        const tokenCredential = new AzureCommunicationTokenCredential(token);
        
        // Initialize the call client
        const callClient = new CallClient();
        
        // Initialize the call agent
        const callAgent = await callClient.createCallAgent(tokenCredential);
        return callAgent;
    } catch (error) {
        console.error('Error initializing ACS calling client:', error);
        throw error;
    }
}

/**
 * Join a Teams meeting using ACS interoperability
 * 
 * @param {CallAgent} callAgent - The ACS call agent
 * @param {string} meetingLink - The Teams meeting link or ID
 * @param {Object} options - Options for joining the meeting
 * @returns {Promise<Object>} The call object representing the meeting
 */
export async function joinTeamsMeeting(callAgent, meetingLink, options = {}) {
    try {
        // Default options
        const defaultOptions = {
            videoOptions: {
                localVideoStreams: undefined
            },
            audioOptions: {
                muted: false
            }
        };
        
        // Merge options
        const joinOptions = { ...defaultOptions, ...options };
        
        // Join the Teams meeting
        const call = callAgent.join({ meetingLink }, joinOptions);
        return call;
    } catch (error) {
        console.error('Error joining Teams meeting:', error);
        throw error;
    }
}

/**
 * Set up local video for a Teams meeting
 * 
 * @param {CallClient} callClient - The ACS call client
 * @returns {Promise<LocalVideoStream>} The local video stream
 */
export async function setupLocalVideo(callClient) {
    try {
        // Get available video devices
        const deviceManager = await callClient.getDeviceManager();
        const cameras = await deviceManager.getCameras();
        
        if (cameras.length === 0) {
            throw new Error('No cameras available');
        }
        
        // Create a local video stream using the first camera
        const localVideoStream = new LocalVideoStream(cameras[0]);
        return localVideoStream;
    } catch (error) {
        console.error('Error setting up local video:', error);
        throw error;
    }
}

/**
 * Render a remote participant's video stream
 * 
 * @param {RemoteVideoStream} stream - The remote video stream
 * @param {string} elementId - The ID of the HTML element to render the video in
 * @returns {Promise<VideoStreamRenderer>} The video stream renderer
 */
export async function renderRemoteVideo(stream, elementId) {
    try {
        // Create a renderer
        const renderer = new VideoStreamRenderer(stream);
        
        // Create a view
        const view = await renderer.createView();
        
        // Attach the view to the specified element
        const videoElement = document.getElementById(elementId);
        if (!videoElement) {
            throw new Error(`Element with ID ${elementId} not found`);
        }
        
        videoElement.appendChild(view.target);
        return renderer;
    } catch (error) {
        console.error('Error rendering remote video:', error);
        throw error;
    }
}

/**
 * Adaptive Card template for displaying ACS status in Teams
 * 
 * @param {Object} options - Customization options for the card
 * @returns {Object} Adaptive Card JSON
 */
export function createAcsStatusCard(options) {
    return {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        version: '1.3',
        body: [
            {
                type: 'TextBlock',
                text: options.title || 'Communication Status',
                size: 'Large',
                weight: 'Bolder'
            },
            {
                type: 'TextBlock',
                text: options.description || 'Current status of your communication services',
                wrap: true
            },
            {
                type: 'FactSet',
                facts: [
                    {
                        title: 'Status',
                        value: options.status || 'Connected'
                    },
                    {
                        title: 'Last Updated',
                        value: options.lastUpdated || new Date().toLocaleString()
                    }
                ]
            }
        ],
        actions: options.actions || [
            {
                type: 'Action.Submit',
                title: 'Refresh Status',
                data: {
                    actionType: 'refreshStatus'
                }
            }
        ]
    };
}

/**
 * Open a deep link within Teams
 * 
 * @param {string} url - The deep link URL
 * @returns {Promise<void>}
 */
export function openTeamsDeepLink(url) {
    return new Promise((resolve, reject) => {
        microsoftTeams.app.openLink(url)
            .then(() => resolve())
            .catch(error => {
                console.error('Error opening Teams deep link:', error);
                reject(error);
            });
    });
}

/**
 * Register a handler for Teams theme changes to update ACS UI accordingly
 * 
 * @param {Function} callback - Function to call when theme changes
 * @returns {void}
 */
export function registerThemeChangeHandler(callback) {
    microsoftTeams.app.registerOnThemeChangeHandler((theme) => {
        console.log(`Theme changed to: ${theme}`);
        
        // Call the provided callback with the new theme
        if (typeof callback === 'function') {
            callback(theme);
        }
        
        // Apply theme-specific styles to ACS UI elements
        applyThemeToAcsUI(theme);
    });
}

/**
 * Apply Teams theme to ACS UI elements
 * 
 * @param {string} theme - The Teams theme ('default', 'dark', or 'contrast')
 * @returns {void}
 */
export function applyThemeToAcsUI(theme) {
    const root = document.documentElement;
    
    // Define theme variables
    let backgroundColor, textColor, primaryColor, accentColor;
    
    switch (theme) {
        case 'dark':
            backgroundColor = '#2d2c2c';
            textColor = '#ffffff';
            primaryColor = '#6264a7';
            accentColor = '#5b5fc7';
            break;
        case 'contrast':
            backgroundColor = '#000000';
            textColor = '#ffffff';
            primaryColor = '#ffff01';
            accentColor = '#00ff00';
            break;
        case 'default':
        default:
            backgroundColor = '#f3f2f1';
            textColor = '#252423';
            primaryColor = '#6264a7';
            accentColor = '#5b5fc7';
            break;
    }
    
    // Apply theme variables to CSS custom properties
    root.style.setProperty('--acs-background-color', backgroundColor);
    root.style.setProperty('--acs-text-color', textColor);
    root.style.setProperty('--acs-primary-color', primaryColor);
    root.style.setProperty('--acs-accent-color', accentColor);
}

/**
 * Show a Teams native loading indicator
 * 
 * @param {string} message - The loading message to display
 * @returns {Promise<void>}
 */
export async function showTeamsLoadingIndicator(message) {
    try {
        await microsoftTeams.app.showLoadingIndicator({
            title: message || 'Loading Communication Services'
        });
    } catch (error) {
        console.error('Error showing Teams loading indicator:', error);
    }
}

/**
 * Hide the Teams native loading indicator
 * 
 * @returns {Promise<void>}
 */
export async function hideTeamsLoadingIndicator() {
    try {
        await microsoftTeams.app.hideLoadingIndicator();
    } catch (error) {
        console.error('Error hiding Teams loading indicator:', error);
    }
}

/**
 * Register a handler for back button navigation in Teams
 * 
 * @param {Function} handler - Function to call when back button is pressed
 * @returns {void}
 */
export function registerBackButtonHandler(handler) {
    microsoftTeams.pages.registerBackButtonHandler(() => {
        // Call the provided handler
        if (typeof handler === 'function') {
            return handler();
        }
        return true;
    });
}

/**
 * Share ACS content to a Teams meeting
 * 
 * @param {string} threadId - The ACS thread ID
 * @param {string} meetingId - The Teams meeting ID
 * @param {Object} content - The content to share
 * @returns {Promise<boolean>} Success indicator
 */
export async function shareAcsContentToTeamsMeeting(threadId, meetingId, content) {
    try {
        // Example implementation - in a real scenario, this would use the
        // appropriate APIs to share content from an ACS thread to a Teams meeting
        
        // First, verify the meeting is active
        const meetingContext = await microsoftTeams.meeting.getMeetingDetails();
        
        if (meetingContext.id !== meetingId) {
            throw new Error('Meeting ID mismatch');
        }
        
        // Then, share the content
        // This is a placeholder implementation
        /* 
        await microsoftTeams.meeting.shareAppContentToStage((err, result) => {
            if (err) {
                throw err;
            }
            return result.success;
        }, appContentUrl);
        */
        
        console.log(`Shared content from ACS thread ${threadId} to Teams meeting ${meetingId}`);
        return true;
    } catch (error) {
        console.error('Error sharing ACS content to Teams meeting:', error);
        return false;
    }
}

/**
 * Set up an ACS call UI integrated with Teams styling
 * 
 * @param {Object} callOptions - Call configuration options
 * @returns {Object} Object containing call UI elements and controls
 */
export function setupAcsCallUI(callOptions) {
    // Create UI container
    const containerDiv = document.createElement('div');
    containerDiv.className = 'acs-call-container';
    
    // Create video display area
    const videoDiv = document.createElement('div');
    videoDiv.id = 'acs-video-display';
    videoDiv.className = 'acs-video-display';
    containerDiv.appendChild(videoDiv);
    
    // Create call controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'acs-call-controls';
    
    // Add mute button
    const muteButton = document.createElement('button');
    muteButton.className = 'acs-control-button acs-mute-button';
    muteButton.innerHTML = '<i class="acs-icon acs-icon-mic"></i>';
    muteButton.title = 'Mute';
    controlsDiv.appendChild(muteButton);
    
    // Add video button
    const videoButton = document.createElement('button');
    videoButton.className = 'acs-control-button acs-video-button';
    videoButton.innerHTML = '<i class="acs-icon acs-icon-video"></i>';
    videoButton.title = 'Camera';
    controlsDiv.appendChild(videoButton);
    
    // Add end call button
    const endCallButton = document.createElement('button');
    endCallButton.className = 'acs-control-button acs-end-call-button';
    endCallButton.innerHTML = '<i class="acs-icon acs-icon-end-call"></i>';
    endCallButton.title = 'End Call';
    controlsDiv.appendChild(endCallButton);
    
    // Add controls to the container
    containerDiv.appendChild(controlsDiv);
    
    // Add container to the document
    document.body.appendChild(containerDiv);
    
    // Get Teams theme
    microsoftTeams.app.getContext().then(context => {
        applyThemeToAcsUI(context.theme);
    });
    
    // Return UI elements and controls for further customization
    return {
        container: containerDiv,
        videoDisplay: videoDiv,
        controls: {
            muteButton,
            videoButton,
            endCallButton
        }
    };
}

/**
 * Create Teams meeting and get link for use with ACS
 * 
 * @param {Object} meetingDetails - Meeting configuration details
 * @returns {Promise<string>} The Teams meeting link
 */
export async function createTeamsMeetingForAcs(meetingDetails) {
    try {
        // This would typically call a server-side API to create a Teams meeting
        const response = await fetch('/api/createTeamsMeeting', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: meetingDetails.subject,
                startTime: meetingDetails.startTime,
                endTime: meetingDetails.endTime,
                attendees: meetingDetails.attendees
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create Teams meeting: ${response.statusText}`);
        }
        
        const meetingInfo = await response.json();
        return meetingInfo.joinLink;
    } catch (error) {
        console.error('Error creating Teams meeting:', error);
        throw error;
    }
}

/**
 * Synchronize participant information between Teams and ACS
 * 
 * @param {Object} teamsContext - The Teams context
 * @param {Object} acsThread - The ACS thread information
 * @returns {Promise<Object>} Mapping between Teams users and ACS identities
 */
export async function syncParticipantInfo(teamsContext, acsThread) {
    try {
        // This would typically call a server-side API to synchronize participants
        const response = await fetch('/api/syncParticipants', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teamsContext,
                acsThreadId: acsThread.threadId
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to sync participants: ${response.statusText}`);
        }
        
        const mappingInfo = await response.json();
        return mappingInfo.userMappings;
    } catch (error) {
        console.error('Error synchronizing participant info:', error);
        throw error;
    }
}

/**
 * Register for ACS chat notifications in Teams context
 * 
 * @param {ChatClient} chatClient - The ACS chat client
 * @param {string} threadId - The ACS thread ID
 * @param {Function} notificationHandler - Function to handle notifications
 * @returns {Promise<void>}
 */
export async function registerForChatNotifications(chatClient, threadId, notificationHandler) {
    try {
        // Get the chat thread client
        const threadClient = chatClient.getChatThreadClient(threadId);
        
        // Set up event handlers for real-time notifications
        chatClient.startRealtimeNotifications();
        
        // Register for chat message received event
        chatClient.on('chatMessageReceived', (event) => {
            if (event.threadId === threadId) {
                // Call the notification handler
                notificationHandler({
                    type: 'message',
                    sender: event.sender,
                    content: event.message,
                    timestamp: event.createdOn
                });
                
                // Show Teams notification if the user is not in the current thread view
                showTeamsNotification({
                    title: `Message from ${event.sender.displayName}`,
                    message: event.message
                });
            }
        });
        
        // Register for typing indicator events
        chatClient.on('typingIndicatorReceived', (event) => {
            if (event.threadId === threadId) {
                notificationHandler({
                    type: 'typing',
                    sender: event.sender,
                    timestamp: new Date()
                });
            }
        });
        
        // Register for participant changes
        chatClient.on('participantsAdded', (event) => {
            if (event.threadId === threadId) {
                notificationHandler({
                    type: 'participantsAdded',
                    participants: event.participantsAdded,
                    timestamp: new Date()
                });
            }
        });
        
        chatClient.on('participantsRemoved', (event) => {
            if (event.threadId === threadId) {
                notificationHandler({
                    type: 'participantsRemoved',
                    participants: event.participantsRemoved,
                    timestamp: new Date()
                });
            }
        });
    } catch (error) {
        console.error('Error registering for chat notifications:', error);
        throw error;
    }
}

/**
 * Show a Teams notification
 * 
 * @param {Object} notificationInfo - Notification details
 * @returns {Promise<void>}
 */
export async function showTeamsNotification(notificationInfo) {
    try {
        await microsoftTeams.notifications.showNotification({
            type: 'message',
            title: notificationInfo.title,
            message: notificationInfo.message,
            customData: notificationInfo.customData || {},
            iconUrl: notificationInfo.iconUrl
        });
    } catch (error) {
        console.error('Error showing Teams notification:', error);
    }
}

/**
 * Initialize authentication for an ACS-Teams integrated application
 * 
 * @returns {Promise<Object>} Authentication result with tokens
 */
export async function initializeAuthentication() {
    try {
        // Get Teams context
        const context = await microsoftTeams.app.getContext();
        
        // Get authentication token for the user
        const result = await microsoftTeams.authentication.getAuthToken();
        
        // Exchange the Teams token for ACS token on the server
        const response = await fetch('/api/exchangeTokenForAcs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${result.token}`
            },
            body: JSON.stringify({
                userId: context.user.id
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to exchange token: ${response.statusText}`);
        }
        
        const tokenInfo = await response.json();
        
        return {
            teamsToken: result.token,
            acsToken: tokenInfo.token,
            acsUserId: tokenInfo.communicationUserId,
            expiresOn: tokenInfo.expiresOn
        };
    } catch (error) {
        console.error('Error initializing authentication:', error);
        throw error;
    }
}

/**
 * Set up Teams SDK configuration with ACS-specific settings
 * 
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
export async function configureTeamsForAcs(options) {
    try {
        // Register required Teams capabilities
        await microsoftTeams.app.initialize();
        
        // Request permissions needed for ACS
        await microsoftTeams.app.requestPermissions([
            'identity',
            'messageTeamMembers'
        ]);
        
        // Apply any custom configuration
        if (options.customConfig) {
            // Apply custom Teams SDK configuration
        }
        
        console.log('Teams SDK configured for ACS integration');
    } catch (error) {
        console.error('Error configuring Teams for ACS:', error);
        throw error;
    }
}

/**
 * Get the current Teams meeting context for ACS integration
 * 
 * @returns {Promise<Object>} The meeting context
 */
export async function getTeamsMeetingContext() {
    try {
        await microsoftTeams.app.initialize();
        const meetingContext = await microsoftTeams.meeting.getMeetingDetails();
        return meetingContext;
    } catch (error) {
        console.error('Error getting Teams meeting context:', error);
        throw error;
    }
}

/**
 * Validate if the current context is appropriate for ACS features
 * 
 * @returns {Promise<Object>} Validation result with context details
 */
export async function validateContextForAcs() {
    try {
        const context = await microsoftTeams.app.getContext();
        
        // Check if we're in a supported context
        const isSupported = {
            inTeams: !!context.teamId,
            inPersonalApp: context.frameContext === 'content',
            inTab: context.frameContext === 'content' || context.frameContext === 'task',
            inMeeting: context.frameContext === 'meetingStage' || context.frameContext === 'sidePanel',
            inChat: !!context.chatId,
            isMultiWindow: !!context.isMultiWindow
        };
        
        // Determine which ACS features are available
        const availableFeatures = {
            chat: isSupported.inTeams || isSupported.inChat || isSupported.inPersonalApp,
            calling: isSupported.inPersonalApp || isSupported.inChat,
            meeting: isSupported.inMeeting,
            screenSharing: isSupported.inMeeting || isSupported.inPersonalApp
        };
        
        return {
            isSupported,
            availableFeatures,
            context
        };
    } catch (error) {
        console.error('Error validating context for ACS:', error);
        throw error;
    }
}

/**
 * Generate CSS styles for ACS UI components based on Teams theme
 * 
 * @param {string} theme - The Teams theme name
 * @returns {string} CSS styles as a string
 */
export function generateAcsStyles(theme) {
    // Define theme variables
    let backgroundColor, textColor, primaryColor, accentColor, errorColor;
    
    switch (theme) {
        case 'dark':
            backgroundColor = '#2d2c2c';
            textColor = '#ffffff';
            primaryColor = '#6264a7';
            accentColor = '#5b5fc7';
            errorColor = '#f25022';
            break;
        case 'contrast':
            backgroundColor = '#000000';
            textColor = '#ffffff';
            primaryColor = '#ffff01';
            accentColor = '#00ff00';
            errorColor = '#ff0000';
            break;
        case 'default':
        default:
            backgroundColor = '#f3f2f1';
            textColor = '#252423';
            primaryColor = '#6264a7';
            accentColor = '#5b5fc7';
            errorColor = '#e74c3c';
            break;
    }
    
    // Generate CSS
    return `
        .acs-container {
            background-color: ${backgroundColor};
            color: ${textColor};
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
            padding: 16px;
            border-radius: 4px;
        }
        
        .acs-button {
            background-color: ${primaryColor};
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: background-color 0.2s ease;
        }
        
        .acs-button:hover {
            background-color: ${accentColor};
        }
        
        .acs-button-secondary {
            background-color: transparent;
            color: ${primaryColor};
            border: 1px solid ${primaryColor};
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        
        .acs-button-secondary:hover {
            background-color: rgba(98, 100, 167, 0.1);
        }
        
        .acs-input {
            background-color: ${theme === 'dark' ? '#3b3a39' : '#ffffff'};
            color: ${textColor};
            border: 1px solid ${theme === 'dark' ? '#4f4f4f' : '#d1d1d1'};
            padding: 8px 12px;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
        }
        
        .acs-input:focus {
            border-color: ${primaryColor};
            outline: none;
        }
        
        .acs-error {
            color: ${errorColor};
            font-size: 14px;
            margin-top: 4px;
        }
        
        .acs-call-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: ${backgroundColor};
        }
        
        .acs-video-display {
            flex: 1;
            background-color: ${theme === 'dark' ? '#1a1a1a' : '#f0f0f0'};
            border-radius: 4px;
            overflow: hidden;
            position: relative;
        }
        
        .acs-call-controls {
            display: flex;
            justify-content: center;
            padding: 16px;
            gap: 16px;
        }
        
        .acs-control-button {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background-color: ${theme === 'dark' ? '#3b3a39' : '#ffffff'};
            color: ${textColor};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        
        .acs-control-button:hover {
            background-color: ${theme === 'dark' ? '#4f4f4f' : '#f0f0f0'};
        }
        
        .acs-end-call-button {
            background-color: #e74c3c;
            color: #ffffff;
        }
        
        .acs-end-call-button:hover {
            background-color: #c0392b;
        }
        
        .acs-icon {
            font-size: 18px;
        }
        
        .acs-chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            background-color: ${backgroundColor};
        }
        
        .acs-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        
        .acs-message {
            margin-bottom: 16px;
            max-width: 70%;
        }
        
        .acs-message-sent {
            align-self: flex-end;
            background-color: ${primaryColor};
            color: #ffffff;
            border-radius: 16px 16px 0 16px;
            padding: 8px 16px;
            margin-left: auto;
        }
        
        .acs-message-received {
            align-self: flex-start;
            background-color: ${theme === 'dark' ? '#3b3a39' : '#ffffff'};
            color: ${textColor};
            border-radius: 16px 16px 16px 0;
            padding: 8px 16px;
        }
        
        .acs-chat-input-container {
            display: flex;
            padding: 16px;
            border-top: 1px solid ${theme === 'dark' ? '#4f4f4f' : '#d1d1d1'};
        }
        
        .acs-chat-input {
            flex: 1;
            background-color: ${theme === 'dark' ? '#3b3a39' : '#ffffff'};
            color: ${textColor};
            border: 1px solid ${theme === 'dark' ? '#4f4f4f' : '#d1d1d1'};
            padding: 8px 12px;
            border-radius: 20px;
            margin-right: 8px;
        }
        
        .acs-chat-send-button {
            background-color: ${primaryColor};
            color: #ffffff;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
    `;
}

/**
 * Inject ACS styles into the current page based on Teams theme
 * 
 * @param {string} theme - The Teams theme
 * @returns {void}
 */
export function injectAcsStyles(theme) {
    // Generate the CSS
    const css = generateAcsStyles(theme);
    
    // Check if a style element already exists
    let styleElement = document.getElementById('acs-teams-styles');
    
    if (!styleElement) {
        // Create a new style element
        styleElement = document.createElement('style');
        styleElement.id = 'acs-teams-styles';
        document.head.appendChild(styleElement);
    }
    
    // Set the CSS content
    styleElement.textContent = css;
}

// Export all utility functions
export default {
    initializeTeamsSDK,
    getTeamsContext,
    convertTeamsUserToAcsIdentity,
    initializeChatClient,
    initializeCallingClient,
    joinTeamsMeeting,
    setupLocalVideo,
    renderRemoteVideo,
    createAcsStatusCard,
    openTeamsDeepLink,
    registerThemeChangeHandler,
    applyThemeToAcsUI,
    showTeamsLoadingIndicator,
    hideTeamsLoadingIndicator,
    registerBackButtonHandler,
    shareAcsContentToTeamsMeeting,
    setupAcsCallUI,
    createTeamsMeetingForAcs,
    syncParticipantInfo,
    registerForChatNotifications,
    showTeamsNotification,
    initializeAuthentication,
    configureTeamsForAcs,
    getTeamsMeetingContext,
    validateContextForAcs,
    generateAcsStyles,
    injectAcsStyles
};
