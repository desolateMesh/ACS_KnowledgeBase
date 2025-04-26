## Overview

This document provides in-depth guidance on leveraging advanced Microsoft Teams JavaScript SDK features for Azure Communication Services (ACS) integration. These capabilities enable developers to create sophisticated, deeply integrated experiences that combine the collaborative power of Microsoft Teams with the communication capabilities of ACS. This knowledge base resource covers both standard SDK features and advanced techniques that unlock powerful integration scenarios.

## Table of Contents

- [SDK Configuration and Initialization](#sdk-configuration-and-initialization)
- [Deep Context Integration](#deep-context-integration)
- [Advanced Authentication Patterns](#advanced-authentication-patterns)
- [Meeting and Calling Integration](#meeting-and-calling-integration)
- [Real-time Communication](#real-time-communication)
- [Adaptive UI and Theming](#adaptive-ui-and-theming)
- [Advanced Dialog and Task Modules](#advanced-dialog-and-task-modules)
- [Storage and Caching Strategies](#storage-and-caching-strategies)
- [Performance Optimization](#performance-optimization)
- [Collaboration Features](#collaboration-features)
- [Advanced Event Handling](#advanced-event-handling)
- [Mobile and Cross-platform Considerations](#mobile-and-cross-platform-considerations)
- [Security Best Practices](#security-best-practices)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)
- [Case Studies and Examples](#case-studies-and-examples)

## SDK Configuration and Initialization

### Optimized Initialization

- **Staged Loading**: Progressive SDK initialization for faster perceived performance
  ```javascript
  // Basic initialization
  microsoftTeams.initialize();
  
  // Then load additional components as needed
  function loadAdvancedFeatures() {
    return Promise.all([
      import('@microsoft/teams-js/dist/MicrosoftTeams.min'),
      import('@azure/communication-calling')
    ]).then(([teamsModule, acsModule]) => {
      // Initialize advanced features
      window.Calling = acsModule;
      initializeCallingFeatures();
    });
  }
  
  // Trigger advanced loading when appropriate
  microsoftTeams.getContext((context) => {
    if (context.frameContext === 'content') {
      loadAdvancedFeatures();
    }
  });
  ```

- **Version Compatibility**: Handling different SDK versions across environments
  ```javascript
  // Check Teams client SDK version
  microsoftTeams.getContext((context) => {
    const clientSdkVersion = parseFloat(context.hostClientType);
    
    if (clientSdkVersion >= 2.0) {
      // Use modern APIs
      initializeModernFeatures();
    } else {
      // Use legacy APIs with fallbacks
      initializeLegacyFeatures();
    }
  });
  ```

- **Error Handling**: Robust initialization error management
- **Environment Detection**: Adapting initialization based on host environment

### SDK Module Management

- **Module Loading Strategies**: Selectively loading SDK modules for performance
  ```javascript
  // Selective module import
  import { initialize, getContext } from '@microsoft/teams-js/dist/MicrosoftTeams';
  import { sharing } from '@microsoft/teams-js/dist/modules/sharing';
  
  // Initialize core functionality
  initialize();
  
  // Conditionally load additional modules
  function enableSharingFeatures() {
    // Ensure sharing module is available
    if (sharing) {
      // Setup sharing features
      configureSharingModule();
    }
  }
  ```

- **Dependency Management**: Handling SDK dependencies efficiently
- **Versioning Strategy**: Managing multiple SDK versions in complex apps
- **Polyfill Implementation**: Providing fallbacks for older clients

## Deep Context Integration

### Advanced Context Utilization

- **Extended Context Properties**: Leveraging all available context information
  ```javascript
  microsoftTeams.getContext((context) => {
    // Basic context properties
    const {
      entityId,
      subEntityId,
      locale,
      theme,
      teamId,
      channelId,
      userObjectId,
      userPrincipalName,
      tid
    } = context;
    
    // Advanced properties
    const {
      hostClientType,      // Client type and version
      frameContext,        // Content context (content, task, settings, etc.)
      sharepoint,          // SharePoint context if available
      isFullScreen,        // Full screen mode status
      meetingId,           // Meeting ID if in meeting
      chatId,              // Chat ID if in chat
      isTeamArchived       // Team archived status
    } = context;
    
    // Use context to customize experience
    customizeExperience(context);
  });
  ```

- **Context Change Monitoring**: Detecting and responding to context changes
  ```javascript
  // Register for theme changes
  microsoftTeams.registerOnThemeChangeHandler((theme) => {
    updateTheme(theme);
  });
  
  // Monitor for frame context changes (e.g., going full screen)
  let lastFrameContext = null;
  function monitorFrameContext() {
    microsoftTeams.getContext((context) => {
      if (context.frameContext !== lastFrameContext) {
        lastFrameContext = context.frameContext;
        handleFrameContextChange(context.frameContext);
      }
      
      // Continue monitoring
      setTimeout(monitorFrameContext, 1000);
    });
  }
  ```

- **Multi-context Applications**: Building apps that work across Teams contexts
- **Advanced Personalization**: Deeply personalizing experiences based on context

### Context-Aware Feature Toggling

- **Feature Detection**: Determining available features based on context
  ```javascript
  // Detect available features
  function detectAvailableFeatures() {
    return new Promise((resolve) => {
      microsoftTeams.getContext((context) => {
        const features = {
          calling: false,
          meeting: false,
          stageSharing: false,
          filePreviews: false
        };
        
        // Check context and client info
        if (context.hostClientType) {
          const clientVersion = parseFloat(context.hostClientType);
          
          features.calling = clientVersion >= 1.4;
          features.meeting = clientVersion >= 1.5 && !!context.meetingId;
          features.stageSharing = clientVersion >= 1.9 && !!context.meetingId;
          features.filePreviews = clientVersion >= 1.6;
        }
        
        resolve(features);
      });
    });
  }
  ```

- **Progressive Enhancement**: Incrementally enabling features based on context
- **Graceful Degradation**: Falling back gracefully when features aren't available
- **A/B Testing Framework**: Testing different features with different users

## Advanced Authentication Patterns

### Multi-service Authentication

- **Authentication Flow Orchestration**: Managing authentication across services
  ```javascript
  async function authenticateServices() {
    try {
      // Get Teams SSO token
      const teamsToken = await microsoftTeams.authentication.getAuthToken();
      
      // Exchange for service-specific tokens
      const tokenResponses = await Promise.all([
        exchangeTokenForService('graph', teamsToken),
        exchangeTokenForService('acs', teamsToken)
      ]);
      
      // Store tokens securely
      const [graphToken, acsToken] = tokenResponses;
      secureTokenStorage.set('graph', graphToken);
      secureTokenStorage.set('acs', acsToken);
      
      return {
        graph: graphToken,
        acs: acsToken
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      // Fallback to interactive auth if needed
      return fallbackToInteractiveAuth();
    }
  }
  
  // Exchange Teams token for service-specific token
  async function exchangeTokenForService(service, teamsToken) {
    const response = await fetch(`/api/token-exchange?service=${service}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teamsToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get token for ${service}`);
    }
    
    const tokenData = await response.json();
    return tokenData.token;
  }
  ```

- **Token Management System**: Centralized token handling and refresh
  ```javascript
  // Token management system
  class TokenManager {
    constructor() {
      this.tokens = {};
      this.refreshPromises = {};
    }
    
    async getToken(service) {
      // Check if token exists and is valid
      if (this.isTokenValid(service)) {
        return this.tokens[service].token;
      }
      
      // Check if refresh is already in progress
      if (this.refreshPromises[service]) {
        return this.refreshPromises[service];
      }
      
      // Start token refresh
      this.refreshPromises[service] = this.refreshToken(service)
        .finally(() => {
          this.refreshPromises[service] = null;
        });
        
      return this.refreshPromises[service];
    }
    
    async refreshToken(service) {
      // Refresh logic varies by service
      switch (service) {
        case 'acs':
          return this.refreshAcsToken();
        case 'graph':
          return this.refreshGraphToken();
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    }
    
    isTokenValid(service) {
      if (!this.tokens[service]) return false;
      
      const tokenData = this.tokens[service];
      const expirationTime = tokenData.expiresAt;
      
      // Consider token expired 5 minutes before actual expiration
      return Date.now() < (expirationTime - 300000);
    }
    
    // Service-specific refresh methods
    async refreshAcsToken() {
      // ACS token refresh logic
    }
    
    async refreshGraphToken() {
      // Graph token refresh logic
    }
  }
  ```

- **Consent Management**: Handling incremental and dynamic consent
- **Identity Correlation**: Mapping identities across different services

### Advanced SSO Patterns

- **Silent Authentication Optimization**: Maximizing silent auth success rate
  ```javascript
  // Optimized silent authentication
  async function performSilentAuth() {
    try {
      // Try Teams SSO
      const token = await microsoftTeams.authentication.getAuthToken({
        resources: [\"https://graph.microsoft.com\"],
        silent: true
      });
      
      return { token, method: 'sso' };
    } catch (error) {
      console.log('Silent SSO failed, trying stored refresh token');
      
      try {
        // Try using refresh token
        const token = await refreshTokenAuth();
        return { token, method: 'refresh' };
      } catch (refreshError) {
        console.log('All silent methods failed, need interactive auth');
        throw new Error('Interactive authentication required');
      }
    }
  }
  ```

- **Auth State Persistence**: Maintaining authentication across sessions
- **Conditional Authentication**: Authenticating based on feature requirements
- **Delegated Permissions Management**: Handling permission scopes dynamically

## Meeting and Calling Integration

### ACS Calling Integration

- **Meeting Join Experience**: Creating custom meeting join flows
  ```javascript
  async function joinTeamsMeeting(meetingId) {
    try {
      // Get ACS token
      const acsTokenResponse = await getAcsTokenForMeeting(meetingId);
      const { token, userId } = acsTokenResponse;
      
      // Create ACS CallAgent
      const tokenCredential = new AzureCommunicationTokenCredential(token);
      const callClient = new CallClient();
      const callAgent = await callClient.createCallAgent(tokenCredential, { displayName: currentUser.displayName });
      
      // Get Teams meeting info
      const meetingInfo = await getMeetingInfo(meetingId);
      
      // Join meeting
      const locator = new MeetingLocator(meetingInfo.joinUrl);
      const call = callAgent.join(locator, {
        videoOptions: { localVideoStreams: localVideoStream ? [localVideoStream] : undefined },
        audioOptions: { muted: true }
      });
      
      return call;
    } catch (error) {
      console.error('Failed to join meeting:', error);
      throw error;
    }
  }
  ```

- **Seamless Call Transitions**: Moving calls between Teams and ACS
- **Custom Call Controls**: Implementing specialized calling interfaces
- **Call Recording and Transcription**: Adding advanced media capture

### Meeting Stage Integration

- **Shared Meeting Experiences**: Creating content for the meeting stage
  ```javascript
  // Share content to meeting stage
  function shareToMeetingStage(contentUrl) {
    microsoftTeams.meeting.shareAppContentToStage((error, result) => {
      if (error) {
        console.error('Failed to share to stage:', error);
        return;
      }
      
      if (result) {
        console.log('Successfully shared to stage');
        updateUIForStageSharing(true);
      }
    }, contentUrl);
  }
  
  // Listen for stage sharing changes
  microsoftTeams.meeting.getAppContentStageSharingState((error, state) => {
    if (!error) {
      updateUIForStageSharing(state.isSharing);
    }
  });
  
  microsoftTeams.meeting.registerAppContentStageSharingStateChangeHandler((state) => {
    updateUIForStageSharing(state.isSharing);
  });
  ```

- **Interactive Presentations**: Building multi-user interactive content
- **Media Synchronization**: Keeping media in sync across participants
- **Audience Engagement Tools**: Creating polls, Q&A, and feedback systems

## Real-time Communication

### ACS Chat Integration

- **Persistent Chat**: Implementing persistent chat experiences
  ```javascript
  // Initialize ACS Chat client
  async function initializeChatClient(endpoint, userIdentity, token) {
    try {
      // Create token credential
      const tokenCredential = new AzureCommunicationTokenCredential(token);
      
      // Initialize chat client
      const chatClient = new ChatClient(endpoint, tokenCredential);
      
      // Start real-time notifications
      await chatClient.startRealtimeNotifications();
      
      // Register event handlers
      chatClient.on(\"chatMessageReceived\", (event) => {
        handleNewMessage(event);
      });
      
      chatClient.on(\"typingIndicatorReceived\", (event) => {
        showTypingIndicator(event.sender, event.recipient);
      });
      
      chatClient.on(\"readReceiptReceived\", (event) => {
        updateMessageReadStatus(event.sender, event.chatMessageId);
      });
      
      return chatClient;
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      throw error;
    }
  }
  ```

- **Real-time Notifications**: Managing real-time chat notifications
- **Message Threading**: Implementing threaded conversations
- **Rich Message Content**: Supporting rich content in messages

### Real-time Data Synchronization

- **Presence Integration**: Showing and updating user presence
  ```javascript
  // Get presence for a batch of users
  async function getUsersPresence(userIds) {
    try {
      // Get Graph token
      const token = await tokenManager.getToken('graph');
      
      // Batch presence requests
      const requests = userIds.map(id => ({
        id,
        method: 'GET',
        url: `/users/${id}/presence`
      }));
      
      // Make batch request to Graph API
      const response = await fetch('https://graph.microsoft.com/v1.0/$batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
      
      const data = await response.json();
      
      // Process and return presence data
      return data.responses.reduce((result, item) => {
        if (item.status === 200) {
          result[item.id] = item.body;
        }
        return result;
      }, {});
    } catch (error) {
      console.error('Failed to get presence:', error);
      return {};
    }
  }
  ```

- **Collaborative Editing**: Enabling real-time document collaboration
- **Activity Notifications**: Showing real-time user activity
- **Synchronized Views**: Keeping multiple users' views in sync

## Adaptive UI and Theming

### Advanced Theme Integration

- **Dynamic Theme Adaptation**: Responsive theme changes with visual transitions
  ```javascript
  // Enhanced theme handling with transitions
  microsoftTeams.registerOnThemeChangeHandler((theme) => {
    // Add transition class
    document.body.classList.add('theme-transitioning');
    
    // Update CSS variables for new theme
    updateThemeVariables(theme);
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  });
  
  function updateThemeVariables(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--background-color', '#201f1f');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--primary-color', '#6264a7');
      root.style.setProperty('--secondary-color', '#c8c6c4');
      // Additional dark theme variables
    } else if (theme === 'contrast') {
      root.style.setProperty('--background-color', '#000000');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--primary-color', '#ffff01');
      root.style.setProperty('--secondary-color', '#ffffff');
      // Additional high contrast variables
    } else {
      // Default light theme
      root.style.setProperty('--background-color', '#f3f2f1');
      root.style.setProperty('--text-color', '#252423');
      root.style.setProperty('--primary-color', '#6264a7');
      root.style.setProperty('--secondary-color', '#484644');
      // Additional light theme variables
    }
  }
  ```

- **Theme Customization**: Supporting custom themes beyond Teams defaults
- **Component-level Theming**: Applying themes at component granularity
- **Accessibility-enhanced Theming**: Ensuring accessible color combinations

### Responsive Framework Integration

- **Teams-aware Responsive Design**: Responsive design specific to Teams
  ```javascript
  // Teams-specific responsive design
  function configureResponsiveLayout() {
    microsoftTeams.getContext((context) => {
      const { frameContext, hostClientType } = context;
      
      // Apply layout class based on context
      document.body.classList.add(`layout-${frameContext}`);
      
      // Detect mobile client
      const isMobile = hostClientType && 
                      (hostClientType.includes('iOS') || 
                       hostClientType.includes('Android'));
                       
      if (isMobile) {
        document.body.classList.add('mobile-client');
      }
      
      // Configure specific layout adjustments
      if (frameContext === 'meetingSidePanel') {
        enableCompactLayout();
      } else if (frameContext === 'content' && isMobile) {
        enableMobileScrollOptimizations();
      }
    });
  }
  ```

- **Context-specific Layouts**: Tailoring layouts for different Teams contexts
- **Dynamic Space Utilization**: Adapting to available screen space
- **Touch-optimized Interfaces**: Creating touch-friendly experiences

## Advanced Dialog and Task Modules

### Enhanced Task Modules

- **Multi-step Task Modules**: Creating wizard-like experiences
  ```javascript
  // Multi-step task module manager
  class TaskWizard {
    constructor(steps) {
      this.steps = steps;
      this.currentStep = 0;
      this.data = {};
    }
    
    start() {
      this.showCurrentStep();
    }
    
    showCurrentStep() {
      const step = this.steps[this.currentStep];
      
      microsoftTeams.tasks.startTask({
        url: step.url,
        title: step.title,
        height: step.height || 'medium',
        width: step.width || 'medium',
        fallbackUrl: step.fallbackUrl
      }, (result) => {
        this.handleStepResult(result);
      });
    }
    
    handleStepResult(result) {
      // Handle task cancellation
      if (!result) {
        this.onCancelled();
        return;
      }
      
      // Store step data
      this.data[this.steps[this.currentStep].id] = result;
      
      // Check if we've reached the final step
      if (this.currentStep === this.steps.length - 1) {
        this.onCompleted(this.data);
        return;
      }
      
      // Move to next step
      this.currentStep;
      this.showCurrentStep();
    }
    
    onCancelled() {
      // Handle wizard cancellation
      console.log('Wizard cancelled');
    }
    
    onCompleted(allData) {
      // Process complete wizard data
      console.log('Wizard completed', allData);
    }
  }
  ```

- **Rich Media Task Modules**: Embedding dynamic content in task modules
- **Context-aware Task Modules**: Adapting task modules to Teams context
- **Task Module Chaining**: Creating sequences of connected task modules

### Advanced Dialog Patterns

- **Confirmation Patterns**: Implementing user confirmation flows
  ```javascript
  // Enhanced confirmation dialog
  function showConfirmationDialog(options) {
    return new Promise((resolve) => {
      microsoftTeams.tasks.startTask({
        url: `${baseUrl}/confirm.html?title=${encodeURIComponent(options.title)}&message=${encodeURIComponent(options.message)}`,
        title: options.title,
        height: 'small',
        width: 'small'
      }, (result) => {
        resolve(result && result.confirmed === true);
      });
    });
  }
  
  // Usage
  async function deleteItem(itemId) {
    const confirmed = await showConfirmationDialog({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.'
    });
    
    if (confirmed) {
      // Proceed with deletion
      await deleteItemFromApi(itemId);
      showNotification('Item deleted successfully');
    }
  }
  ```

- **Form Validation**: Advanced validation in dialog forms
- **Contextual Help**: Providing in-context assistance in dialogs
- **Progressive Disclosure**: Revealing options based on user choices

## Storage and Caching Strategies

### Advanced State Management

- **Unified State Architecture**: Coordinated state across components
  ```javascript
  // Unified state management
  class TeamsAppState {
    constructor() {
      this.store = {
        user: null,
        context: null,
        documents: [],
        settings: {},
        uiState: {
          currentView: 'list',
          selectedItem: null,
          isLoading: false
        }
      };
      
      this.listeners = [];
    }
    
    // Get current state
    getState() {
      return { ...this.store };
    }
    
    // Update state
    setState(partialState) {
      // Deep merge partial state
      this.store = deepMerge(this.store, partialState);
      
      // Notify listeners
      this.notifyListeners();
    }
    
    // Subscribe to state changes
    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }
    
    // Notify all listeners
    notifyListeners() {
      const state = this.getState();
      this.listeners.forEach(listener => listener(state));
    }
    
    // Initialize state with Teams context
    async initialize() {
      this.setState({ uiState: { isLoading: true } });
      
      try {
        // Get Teams context
        const context = await new Promise((resolve) => {
          microsoftTeams.getContext(context => resolve(context));
        });
        
        // Get user info from Graph
        const user = await fetchUserInfo(context.userObjectId);
        
        // Get application settings
        const settings = await fetchSettings();
        
        // Update state with initial data
        this.setState({
          context,
          user,
          settings,
          uiState: { isLoading: false }
        });
      } catch (error) {
        console.error('Failed to initialize state:', error);
        this.setState({
          uiState: { isLoading: false, error: 'Failed to initialize application' }
        });
      }
    }
  }
  ```

- **Persistent State**: Maintaining state across sessions
- **Shared State**: Sharing state between different parts of the app
- **State Change Tracking**: Monitoring and logging state changes

### Caching Implementation

- **Tiered Caching Strategy**: Multi-level caching for performance
  ```javascript
  // Multi-level cache implementation
  class TeamsCache {
    constructor() {
      // Memory cache (session only)
      this.memoryCache = new Map();
      
      // Initialize storage
      this.initializeStorage();
    }
    
    async initializeStorage() {
      try {
        // Check if IndexedDB is available
        if ('indexedDB' in window) {
          this.db = await this.openIndexedDB();
        }
      } catch (error) {
        console.warn('Failed to initialize IndexedDB cache:', error);
      }
    }
    
    async openIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('TeamsAppCache', 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          db.createObjectStore('items', { keyPath: 'key' });
        };
        
        request.onsuccess = (event) => {
          resolve(event.target.result);
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    }
    
    // Get an item from cache with multi-level strategy
    async get(key, options = {}) {
      const { skipMemory = false, ttl = 3600000 } = options;
      
      // Check memory cache first (unless skipped)
      if (!skipMemory) {
        const memoryItem = this.memoryCache.get(key);
        if (memoryItem && Date.now() < memoryItem.expires) {
          return memoryItem.value;
        }
      }
      
      // Check IndexedDB if available
      if (this.db) {
        try {
          const dbItem = await this.getFromDB(key);
          if (dbItem && Date.now() < dbItem.expires) {
            // Refresh memory cache
            this.memoryCache.set(key, {
              value: dbItem.value,
              expires: dbItem.expires
            });
            return dbItem.value;
          }
        } catch (error) {
          console.warn(`Failed to get \"${key}\" from IndexedDB:`, error);
        }
      }
      
      // Check localStorage as last resort
      try {
        const lsItem = localStorage.getItem(`cache_${key}`);
        if (lsItem) {
          const parsedItem = JSON.parse(lsItem);
          if (Date.now() < parsedItem.expires) {
            // Refresh memory cache
            this.memoryCache.set(key, {
              value: parsedItem.value,
              expires: parsedItem.expires
            });
            return parsedItem.value;
          }
        }
      } catch (error) {
        console.warn(`Failed to get "${key}" from localStorage:`, error);
      }
      
      // Return null if not found in any cache
      return null;
    }
    
    // Get an item from the IndexedDB cache
    async getFromDB(key) {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('IndexedDB not initialized'));
          return;
        }
        
        try {
          const transaction = this.db.transaction(['items'], 'readonly');
          const store = transaction.objectStore('items');
          const request = store.get(key);
          
          request.onsuccess = () => {
            resolve(request.result);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (error) {
          reject(error);
        }
      });
    }
    
    // Store an item in all cache layers
    async set(key, value, options = {}) {
      const { ttl = 3600000 } = options; // Default TTL: 1 hour
      const expires = Date.now()  ttl;
      
      // Create the cache item
      const item = {
        key,
        value,
        expires
      };
      
      // Store in memory cache
      this.memoryCache.set(key, {
        value,
        expires
      });
      
      // Store in IndexedDB if available
      if (this.db) {
        try {
          await this.storeInDB(item);
        } catch (error) {
          console.warn(`Failed to store "${key}" in IndexedDB:`, error);
        }
      }
      
      // Store in localStorage as fallback
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify({
          value,
          expires
        }));
      } catch (error) {
        console.warn(`Failed to store "${key}" in localStorage:`, error);
      }
      
      return true;
    }
    
    // Store an item in IndexedDB
    async storeInDB(item) {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('IndexedDB not initialized'));
          return;
        }
        
        try {
          const transaction = this.db.transaction(['items'], 'readwrite');
          const store = transaction.objectStore('items');
          const request = store.put(item);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (error) {
          reject(error);
        }
      });
    }
    
    // Remove an item from all cache layers
    async remove(key) {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from IndexedDB if available
      if (this.db) {
        try {
          await this.removeFromDB(key);
        } catch (error) {
          console.warn(`Failed to remove "${key}" from IndexedDB:`, error);
        }
      }
      
      // Remove from localStorage
      try {
        localStorage.removeItem(`cache_${key}`);
      } catch (error) {
        console.warn(`Failed to remove "${key}" from localStorage:`, error);
      }
      
      return true;
    }
    
    // Remove an item from IndexedDB
    async removeFromDB(key) {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('IndexedDB not initialized'));
          return;
        }
        
        try {
          const transaction = this.db.transaction(['items'], 'readwrite');
          const store = transaction.objectStore('items');
          const request = store.delete(key);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (error) {
          reject(error);
        }
      });
    }
    
    // Clear all items from all cache layers
    async clear() {
      // Clear memory cache
      this.memoryCache.clear();
      
      // Clear IndexedDB if available
      if (this.db) {
        try {
          await this.clearDB();
        } catch (error) {
          console.warn('Failed to clear IndexedDB cache:', error);
        }
      }
      
      // Clear localStorage cache items
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i) {
          const key = localStorage.key(i);
          if (key.startsWith('cache_')) {
            keysToRemove.push(key);
          }
        }
        
        // Remove all cache items
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
      
      return true;
    }
    
    // Clear all items from IndexedDB
    async clearDB() {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('IndexedDB not initialized'));
          return;
        }
        
        try {
          const transaction = this.db.transaction(['items'], 'readwrite');
          const store = transaction.objectStore('items');
          const request = store.clear();
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (error) {
          reject(error);
        }
      });
    }
    
    // Cleanup expired items from all cache layers
    async cleanupExpired() {
      const now = Date.now();
      
      // Cleanup memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        if (now >= item.expires) {
          this.memoryCache.delete(key);
        }
      }
      
      // Cleanup IndexedDB if available
      if (this.db) {
        try {
          await this.cleanupExpiredFromDB(now);
        } catch (error) {
          console.warn('Failed to cleanup expired items from IndexedDB:', error);
        }
      }
      
      // Cleanup localStorage
      try {
        for (let i = 0; i < localStorage.length; i) {
          const key = localStorage.key(i);
          if (key.startsWith('cache_')) {
            try {
              const item = JSON.parse(localStorage.getItem(key));
              if (now >= item.expires) {
                localStorage.removeItem(key);
              }
            } catch (parseError) {
              // Remove invalid items
              localStorage.removeItem(key);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to cleanup expired items from localStorage:', error);
      }
      
      return true;
    }
    
    // Cleanup expired items from IndexedDB
    async cleanupExpiredFromDB(now) {
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('IndexedDB not initialized'));
          return;
        }
        
        try {
          const transaction = this.db.transaction(['items'], 'readwrite');
          const store = transaction.objectStore('items');
          const request = store.openCursor();
          
          const keysToDelete = [];
          
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            
            if (cursor) {
              const item = cursor.value;
              
              if (now >= item.expires) {
                keysToDelete.push(item.key);
              }
              
              cursor.continue();
            } else {
              // Delete all expired items
              const deletePromises = keysToDelete.map(key => this.removeFromDB(key));
              Promise.all(deletePromises)
                .then(() => resolve(true))
                .catch(error => reject(error));
            }
          };
          
          request.onerror = (event) => {
            reject(event.target.error);
          };
        } catch (error) {
          reject(error);
        }
      });
    }
  }
  // Token manager with automatic refresh
  class TokenManager {
    constructor(initialToken, expiryTime, refreshCallback) {
      this.token = initialToken;
      this.expiryTime = expiryTime;
      this.refreshCallback = refreshCallback;
      this.refreshTimer = null;
      
      // Set up refresh timer
      this.scheduleRefresh();
    }
    
    scheduleRefresh() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }
      
      // Refresh 5 minutes before expiry
      const timeToRefresh = Math.max(0, this.expiryTime - Date.now() - (5 * 60 * 1000));
      
      this.refreshTimer = setTimeout(async () => {
        try {
          const { token, expiryTime } = await this.refreshCallback();
          this.token = token;
          this.expiryTime = expiryTime;
          this.scheduleRefresh();
        } catch (error) {
          console.error('Failed to refresh token:', error);
          // Retry after 30 seconds
          setTimeout(() => this.scheduleRefresh(), 30000);
        }
      }, timeToRefresh);
    }
    
    getToken() {
      if (Date.now() >= this.expiryTime) {
        throw new Error('Token expired and refresh failed');
      }
      return this.token;
    }
    
    dispose() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
  }
  ```

## Collaboration Features

### Shared Context Collaboration

- **Activity Feed Integration**: Publishing and consuming activity feed items
  ```javascript
  // Post to activity feed
  async function postActivityFeedItem(teamId, channelId, activity) {
    const token = await tokenManager.getToken('graph');
    
    const feedItem = {
      appActivityId: generateUniqueId(),
      activityType: activity.type,
      previewText: activity.previewText,
      activityText: activity.text,
      templateParameters: activity.parameters
    };
    
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedItem)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to post activity: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error posting to activity feed:', error);
      throw error;
    }
  }
  ```

- **Shared App State**: Keeping state synchronized across users
  ```javascript
  // Shared app state using a backend service
  class SharedStateManager {
    constructor(sessionId, userId) {
      this.sessionId = sessionId;
      this.userId = userId;
      this.localState = {};
      this.lastSequence = 0;
      this.listeners = new Map();
      
      // Initialize SignalR connection
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`/api/stateHub?sessionId=${sessionId}&userId=${userId}`)
        .withAutomaticReconnect()
        .build();
      
      // Register SignalR event handlers
      this.connection.on('stateUpdated', (update) => {
        this.handleRemoteUpdate(update);
      });
      
      // Start connection
      this.connection.start()
        .then(() => console.log('Connected to shared state hub'))
        .catch(err => console.error('Failed to connect to shared state hub:', err));
    }
    
    // Subscribe to state changes
    subscribe(path, callback) {
      if (!this.listeners.has(path)) {
        this.listeners.set(path, new Set());
      }
      
      this.listeners.get(path).add(callback);
      
      return () => {
        this.listeners.get(path).delete(callback);
      };
    }
    
    // Update local state and broadcast to others
    async updateState(path, value) {
      // Update local state
      const pathParts = path.split('.');
      let current = this.localState;
      
      for (let i = 0; i < pathParts.length - 1; i) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      
      // Notify local listeners
      this.notifyListeners(path, value);
      
      // Send update to server
      try {
        const update = {
          sessionId: this.sessionId,
          userId: this.userId,
          path,
          value,
          sequence: this.lastSequence,
          timestamp: Date.now()
        };
        
        await this.connection.invoke('BroadcastStateUpdate', update);
      } catch (error) {
        console.error('Failed to broadcast state update:', error);
      }
    }
    
    // Handle updates from other users
    handleRemoteUpdate(update) {
      // Update local state with remote change
      const pathParts = update.path.split('.');
      let current = this.localState;
      
      for (let i = 0; i < pathParts.length - 1; i) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[pathParts[pathParts.length - 1]] = update.value;
      
      // Notify listeners
      this.notifyListeners(update.path, update.value);
    }
    
    // Notify all listeners for a path
    notifyListeners(path, value) {
      // Find all relevant paths (including parent paths)
      const pathParts = path.split('.');
      const relevantPaths = [];
      
      let currentPath = '';
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        relevantPaths.push(currentPath);
      }
      
      // Notify listeners for each relevant path
      for (const relevantPath of relevantPaths) {
        const listeners = this.listeners.get(relevantPath);
        if (listeners) {
          listeners.forEach(callback => {
            try {
              callback(value, path);
            } catch (error) {
              console.error(`Error in state listener for path ${relevantPath}:`, error);
            }
          });
        }
      }
    }
    
    // Clean up resources
    dispose() {
      if (this.connection) {
        this.connection.stop();
      }
      
      this.listeners.clear();
    }
  }
  ```

- **Contextual Collaboration**: Sharing content with context preservation
- **Multi-user Coordination**: Managing multi-user experiences

### File and Content Integration

- **Intelligent File Handling**: Advanced file operations with Teams
  ```javascript
  // Enhanced file picker with metadata extraction
  async function openFilePicker(options) {
    return new Promise((resolve, reject) => {
      microsoftTeams.media.selectMedia({
        mediaType: microsoftTeams.media.MediaType.Image,
        maxMediaCount: options.maxFiles || 1,
        imageProps: {
          sources: [microsoftTeams.media.Source.Camera, microsoftTeams.media.Source.Gallery],
          startMode: microsoftTeams.media.CameraStartMode.Photo,
          ink: false,
          cameraSwitcher: true,
          textSticker: false,
          enableFilter: false
        }
      }, async (error, files) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          // Process files and extract metadata
          const processedFiles = await Promise.all(files.map(async file => {
            // Get file content
            const content = await fetchFileContent(file.content);
            
            // Extract metadata based on file type
            const metadata = await extractFileMetadata(file, content);
            
            return {
              id: file.id,
              name: file.name,
              content,
              contentType: file.mimeType,
              size: content.byteLength,
              metadata
            };
          }));
          
          resolve(processedFiles);
        } catch (processError) {
          reject(processError);
        }
      });
    });
  }
  
  // Extract metadata from files
  async function extractFileMetadata(file, content) {
    const metadata = {
      timestamp: Date.now(),
      dimensions: null,
      location: null,
      author: null
    };
    
    try {
      // Extract image metadata if it's an image
      if (file.mimeType.startsWith('image/')) {
        const imageBlob = new Blob([content], { type: file.mimeType });
        const imageUrl = URL.createObjectURL(imageBlob);
        
        // Create image element to get dimensions
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            metadata.dimensions = {
              width: img.naturalWidth,
              height: img.naturalHeight
            };
            URL.revokeObjectURL(imageUrl);
            resolve();
          };
          img.src = imageUrl;
        });
        
        // Try to extract EXIF data if JPEG
        if (file.mimeType === 'image/jpeg') {
          const exifData = await extractExifData(content);
          if (exifData.gps) {
            metadata.location = exifData.gps;
          }
          if (exifData.author) {
            metadata.author = exifData.author;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract file metadata:', error);
    }
    
    return metadata;
  }
  ```

- **OneDrive Integration**: Seamless OneDrive access and operations
- **Collaborative Document Editing**: Multi-user document experiences
- **Content Intelligence**: Adding intelligence to content handling

## Mobile and Cross-platform Considerations

### Mobile-optimized Experiences

- **Touch-First Design**: Optimizing for touch interactions
  ```javascript
  // Mobile-optimized event handling
  function setupMobileInteractions(element) {
    // Track touch state
    let touchStarted = false;
    let lastTap = 0;
    let touchTimer = null;
    
    // Add larger touch targets
    element.classList.add('touch-optimized');
    
    // Handle touch start
    element.addEventListener('touchstart', (event) => {
      touchStarted = true;
      
      // Add active state
      element.classList.add('touch-active');
      
      // Set up long press detection
      touchTimer = setTimeout(() => {
        if (touchStarted) {
          // Handle long press
          handleLongPress(event);
        }
      }, 800);
    }, { passive: true });
    
    // Handle touch end
    element.addEventListener('touchend', (event) => {
      touchStarted = false;
      
      // Remove active state
      element.classList.remove('touch-active');
      
      // Clear long press timer
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      
      // Detect double tap
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
        // Handle double tap
        handleDoubleTap(event);
        event.preventDefault();
      } 
      
      lastTap = currentTime;
    });
    
    // Handle touch cancel
    element.addEventListener('touchcancel', () => {
      touchStarted = false;
      element.classList.remove('touch-active');
      
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });
  }
  ```

- **Mobile Performance Optimization**: Ensuring smooth mobile experiences
- **Responsive Input Handling**: Supporting varied input methods
- **Mobile-specific Features**: Leveraging mobile capabilities

### Cross-platform Consistency

- **Adaptive Rendering**: Adjusting UI for different platforms
  ```javascript
  // Platform detection and adaptation
  function configurePlatformAdaptations() {
    microsoftTeams.getContext((context) => {
      // Detect platform
      const platform = detectPlatform(context.hostClientType);
      
      // Apply platform-specific CSS
      document.body.classList.add(`platform-${platform}`);
      
      // Configure platform-specific behaviors
      switch (platform) {
        case 'desktop':
          enableDesktopFeatures();
          break;
        case 'web':
          enableWebFeatures();
          break;
        case 'ios':
          enableIosFeatures();
          break;
        case 'android':
          enableAndroidFeatures();
          break;
      }
      
      // Adjust UI density based on platform
      adjustUiDensity(platform);
    });
  }
  
  // Detect platform from context
  function detectPlatform(hostClientType) {
    if (!hostClientType) return 'web';
    
    const lowerCaseClient = hostClientType.toLowerCase();
    
    if (lowerCaseClient.includes('android')) {
      return 'android';
    } else if (lowerCaseClient.includes('ios')) {
      return 'ios';
    } else if (lowerCaseClient.includes('desktop')) {
      return 'desktop';
    } else {
      return 'web';
    }
  }
  ```

- **Feature Detection**: Dynamically enabling features by platform
- **Consistent Theming**: Maintaining visual consistency across platforms
- **Capability Adaptation**: Adapting to platform capabilities

## Debugging and Troubleshooting

### Advanced Debugging Techniques

- **Diagnostic Logging**: Comprehensive logging for troubleshooting
  ```javascript
  // Advanced diagnostic logging system
  class DiagnosticLogger {
    constructor(options = {}) {
      this.options = {
        minLevel: options.minLevel || 'info',
        includeTimestamps: options.includeTimestamps !== false,
        includeCaller: options.includeCaller !== false,
        includeContext: options.includeContext !== false,
        maxEntries: options.maxEntries || 1000,
        persistLogs: options.persistLogs !== false,
        remoteLogging: options.remoteLogging || false,
        remoteLogEndpoint: options.remoteLogEndpoint || ''
      };
      
      this.levels = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5
      };
      
      this.entries = [];
      
      // Restore persisted logs if enabled
      if (this.options.persistLogs) {
        this.loadPersistedLogs();
      }
      
      // Register error listener
      window.addEventListener('error', (event) => {
        this.logUnhandledError(event);
      });
      
      // Register unhandled promise rejection listener
      window.addEventListener('unhandledrejection', (event) => {
        this.logUnhandledRejection(event);
      });
    }
    
    // Log methods for different levels
    trace(message, ...args) {
      this.log('trace', message, args);
    }
    
    debug(message, ...args) {
      this.log('debug', message, args);
    }
    
    info(message, ...args) {
      this.log('info', message, args);
    }
    
    warn(message, ...args) {
      this.log('warn', message, args);
    }
    
    error(message, ...args) {
      this.log('error', message, args);
    }
    
    fatal(message, ...args) {
      this.log('fatal', message, args);
    }
    
    // Main log method
    log(level, message, args = [], context = {}) {
      // Check if level is enabled
      if (this.levels[level] < this.levels[this.options.minLevel]) {
        return;
      }
      
      // Create log entry
      const entry = {
        level,
        message,
        args: args.map(arg => this.sanitizeArg(arg)),
        timestamp: new Date().toISOString()
      };
      
      // Add caller information if enabled
      if (this.options.includeCaller) {
        entry.caller = this.getCaller();
      }
      
      // Add context information if enabled
      if (this.options.includeContext) {
        entry.context = {
          ...this.getTeamsContext(),
          ...context
        };
      }
      
      // Add entry to log
      this.entries.push(entry);
      
      // Trim log if exceeded max entries
      if (this.entries.length > this.options.maxEntries) {
        this.entries = this.entries.slice(this.entries.length - this.options.maxEntries);
      }
      
      // Output to console
      this.outputToConsole(entry);
      
      // Persist logs if enabled
      if (this.options.persistLogs) {
        this.persistLogs();
      }
      
      // Send to remote logging if enabled
      if (this.options.remoteLogging) {
        this.sendToRemoteLogging(entry);
      }
    }
    
    // Clean object references for JSON serialization
    sanitizeArg(arg) {
      try {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
            _type: 'Error'
          };
        }
        
        return arg;
      } catch (e) {
        return '[Sanitization failed]';
      }
    }
    
    // Get caller information
    getCaller() {
      try {
        const err = new Error();
        const stack = err.stack.split('\
');
        
        // Remove first 3 lines (Error, getCaller, log method)
        const callerLine = stack[3];
        
        if (callerLine) {
          // Extract function and location
          const matches = callerLine.match(/at (.*) \\((.*)\\)/) || 
                          callerLine.match(/at (.*)/);
          
          if (matches && matches.length >= 2) {
            return {
              function: matches[1].trim(),
              location: matches[2] || ''
            };
          }
        }
        
        return { function: 'unknown', location: '' };
      } catch (e) {
        return { function: 'unknown', location: '' };
      }
    }
    
    // Get Teams context information
    getTeamsContext() {
      try {
        if (window.microsoftTeams) {
          const context = {};
          
          microsoftTeams.getContext((teamsContext) => {
            Object.assign(context, teamsContext);
          });
          
          return context;
        }
      } catch (e) {
        // Ignore errors
      }
      
      return {};
    }
    
    // Output log entry to console
    outputToConsole(entry) {
      const prefix = this.options.includeTimestamps ? `[${entry.timestamp}] ` : '';
      const levelPrefix = `[${entry.level.toUpperCase()}]`;
      
      // Choose console method based on level
      let consoleMethod;
      switch (entry.level) {
        case 'trace':
        case 'debug':
          consoleMethod = console.debug || console.log;
          break;
        case 'info':
          consoleMethod = console.info || console.log;
          break;
        case 'warn':
          consoleMethod = console.warn;
          break;
        case 'error':
        case 'fatal':
          consoleMethod = console.error;
          break;
        default:
          consoleMethod = console.log;
      }
      
      // Output to console
      if (entry.args && entry.args.length > 0) {
        consoleMethod(`${prefix}${levelPrefix} ${entry.message}`, ...entry.args);
      } else {
        consoleMethod(`${prefix}${levelPrefix} ${entry.message}`);
      }
    }
    
    // Log unhandled errors
    logUnhandledError(event) {
      this.error('Unhandled error', event.error || event.message, {
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    }
    
    // Log unhandled promise rejections
    logUnhandledRejection(event) {
      this.error('Unhandled promise rejection', event.reason);
    }
    
    // Persist logs to localStorage
    persistLogs() {
      try {
        localStorage.setItem('teams_app_logs', JSON.stringify(this.entries));
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Load persisted logs from localStorage
    loadPersistedLogs() {
      try {
        const storedLogs = localStorage.getItem('teams_app_logs');
        if (storedLogs) {
          this.entries = JSON.parse(storedLogs);
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Send log entry to remote logging endpoint
    sendToRemoteLogging(entry) {
      if (!this.options.remoteLogEndpoint) {
        return;
      }
      
      try {
        fetch(this.options.remoteLogEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry),
          // Use keepalive to ensure logs sent even on page close
          keepalive: true
        }).catch(() => {
          // Ignore network errors
        });
      } catch (e) {
        // Ignore fetch errors
      }
    }
    
    // Export logs as JSON
    exportLogs() {
      return JSON.stringify(this.entries, null, 2);
    }
    
    // Clear all logs
    clearLogs() {
      this.entries = [];
      
      if (this.options.persistLogs) {
        this.persistLogs();
      }
    }
  }

- **Runtime Inspection**: Examining app state during execution
- **API Call Tracing**: Monitoring and debugging API interactions
- **Performance Profiling**: Identifying and fixing performance issues

### Telemetry and Monitoring

- **User Interaction Tracking**: Capturing user behavior telemetry
  ```javascript
  // User interaction telemetry system
  class UserTelemetry {
    constructor(options = {}) {
      this.options = {
        sessionId: options.sessionId || this.generateSessionId(),
        batchSize: options.batchSize || 10,
        flushInterval: options.flushInterval || 30000,
        endpointUrl: options.endpointUrl || '/api/telemetry',
        includeContext: options.includeContext !== false
      };
      
      this.events = [];
      this.context = {};
      this.flushTimer = null;
      
      // Load Teams context if available
      if (this.options.includeContext) {
        this.loadTeamsContext();
      }
      
      // Set up periodic flush
      this.startFlushTimer();
      
      // Set up before unload handler
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
    
    // Generate unique session ID
    generateSessionId() {
      return 'session_'  Math.random().toString(36).substring(2, 15)  
             Math.random().toString(36).substring(2, 15);
    }
    
    // Load Teams context
    loadTeamsContext() {
      if (window.microsoftTeams) {
        microsoftTeams.getContext((context) => {
          this.context = {
            userId: context.userObjectId,
            tenantId: context.tid,
            theme: context.theme,
            hostClientType: context.hostClientType,
            locale: context.locale
          };
        });
      }
    }
    
    // Track a user event
    trackEvent(eventName, properties = {}) {
      // Create event object
      const event = {
        eventName,
        properties,
        timestamp: new Date().toISOString(),
        sessionId: this.options.sessionId
      };
      
      // Add context if available
      if (Object.keys(this.context).length > 0) {
        event.context = this.context;
      }
      
      // Add event to queue
      this.events.push(event);
      
      // Flush if batch size reached
      if (this.events.length >= this.options.batchSize) {
        this.flush();
      }
    }
    
    // Track page view
    trackPageView(pageName, properties = {}) {
      this.trackEvent('PageView', {
        pageName,
        ...properties
      });
    }
    
    // Track user action
    trackAction(actionName, properties = {}) {
      this.trackEvent('UserAction', {
        actionName,
        ...properties
      });
    }
    
    // Track API call
    trackApiCall(endpoint, properties = {}) {
      this.trackEvent('ApiCall', {
        endpoint,
        ...properties
      });
    }
    
    // Track error
    trackError(errorName, properties = {}) {
      this.trackEvent('Error', {
        errorName,
        ...properties
      });
    }
    
    // Start flush timer
    startFlushTimer() {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      
      this.flushTimer = setInterval(() => {
        if (this.events.length > 0) {
          this.flush();
        }
      }, this.options.flushInterval);
    }
    
    // Flush events to endpoint
    flush(isSync = false) {
      if (this.events.length === 0) {
        return;
      }
      
      // Copy events and clear queue
      const eventsToSend = [...this.events];
      this.events = [];
      
      // Prepare request
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: eventsToSend
        })
      };
      
      // Use sendBeacon for sync flush (page unload)
      if (isSync && navigator.sendBeacon) {
        try {
          const blob = new Blob([fetchOptions.body], { type: 'application/json' });
          navigator.sendBeacon(this.options.endpointUrl, blob);
          return;
        } catch (e) {
          // Fall back to fetch if sendBeacon fails
        }
      }
      
      // Use fetch for async flush
      fetch(this.options.endpointUrl, fetchOptions).catch(() => {
        // Add events back to queue on failure
        this.events.unshift(...eventsToSend);
        
        // Limit queue size to prevent memory issues
        if (this.events.length > this.options.batchSize * 3) {
          this.events = this.events.slice(-this.options.batchSize * 3);
        }
      });
    }
    
    // Dispose and clean up
    dispose() {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      
      // Flush any remaining events
      this.flush(true);
    }
  }
  ```

- **Error Monitoring**: Detecting and reporting errors
- **Performance Metrics Collection**: Gathering app performance data
- **Usage Analytics**: Analyzing feature usage patterns

## Case Studies and Examples

### Enterprise Integration Patterns

- **Corporate Directory Integration**: Connecting Teams and ACS with corporate identity
  ```javascript
  // Example: Corporate directory integration with Teams and ACS
  async function initializeDirectoryIntegration() {
    try {
      // Get Teams context
      const context = await getTeamsContext();
      
      // Get user token
      const token = await microsoftTeams.authentication.getAuthToken();
      
      // Exchange for Graph token
      const graphToken = await exchangeTokenForGraph(token);
      
      // Fetch user's organizational data
      const orgData = await fetchOrganizationalData(graphToken, context.userObjectId);
      
      // Initialize ACS identity
      const acsToken = await exchangeTokenForACS(token);
      const acsIdentity = await initializeAcsIdentity(acsToken, orgData);
      
      // Set up directory search provider
      initializeDirectorySearchProvider(graphToken, acsIdentity);
      
      // Return integrated identity info
      return {
        teamsIdentity: context,
        graphIdentity: orgData,
        acsIdentity
      };
    } catch (error) {
      console.error('Failed to initialize directory integration:', error);
      throw error;
    }
  }
  
  // Initialize directory search
  function initializeDirectorySearchProvider(graphToken, acsIdentity) {
    // Create provider for directory search
    directoryProvider = {
      searchUsers: async (query, options = {}) => {
        // Implement search with MS Graph
        const searchResults = await searchUsersInGraph(graphToken, query, options);
        
        // Map results to include ACS identities
        return mapGraphResultsToAcsIdentities(searchResults);
      },
      
      getUserDetails: async (userId) => {
        // Get detailed user info from Graph
        const userDetails = await getUserDetailsFromGraph(graphToken, userId);
        
        // Enhance with ACS identity
        return enhanceUserWithAcsIdentity(userDetails);
      },
      
      getUserPresence: async (userIds) => {
        // Get presence for multiple users
        return getPresenceForUsers(graphToken, userIds);
      }
    };
    
    return directoryProvider;
  }
  ```

- **Helpdesk Integration**: Building helpdesk solutions with Teams and ACS
- **Field Service Solutions**: Creating field service apps with real-time communication
- **Healthcare Communication**: Building secure healthcare communication solutions

### Implementation Strategies

- **Staged Deployment**: Incrementally rolling out Teams and ACS features
  ```javascript
  // Feature flag system for staged rollout
  class FeatureFlagManager {
    constructor(options = {}) {
      this.options = {
        endpoint: options.endpoint || '/api/featureFlags',
        refreshInterval: options.refreshInterval || 300000,
        defaultFlags: options.defaultFlags || {}
      };
      
      this.flags = { ...this.options.defaultFlags };
      this.lastRefresh = 0;
      
      // Load initial flags
      this.refreshFlags();
    }
    
    // Check if feature is enabled
    isEnabled(featureName, defaultValue = false) {
      // Check if flags need refresh
      const now = Date.now();
      if (now - this.lastRefresh > this.options.refreshInterval) {
        // Refresh async without blocking current check
        this.refreshFlags();
      }
      
      // Return feature status or default
      return this.flags[featureName] !== undefined ? 
        this.flags[featureName] : defaultValue;
    }
    
    // Refresh flags from server
    async refreshFlags() {
      try {
        // Get Teams context
        const context = await new Promise(resolve => {
          microsoftTeams.getContext(context => resolve(context));
        });
        
        // Get flags from server with context
        const response = await fetch(this.options.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: context.userObjectId,
            tenantId: context.tid,
            hostClientType: context.hostClientType,
            locale: context.locale
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          this.flags = data.flags || {};
          this.lastRefresh = Date.now();
        }
      } catch (error) {
        console.warn('Failed to refresh feature flags:', error);
      }
    }
  }

- **Migration Patterns**: Migrating from basic to advanced integration  
- **Reusable Components**: Building reusable components for Teams and ACS  
- **Architecture Patterns**: Reference architectures for Teams and ACS integration  

```javascript
// Token manager with automatic refresh
class TokenManager {
  constructor(initialToken, expiryTime, refreshCallback) {
    this.token = initialToken;
    this.expiryTime = expiryTime;
    this.refreshCallback = refreshCallback;
    this.refreshTimer = null;

    // Kick-off the first refresh timer
    this.scheduleRefresh();
  }

  scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh 5 minutes before expiry
    const timeToRefresh = Math.max(
      0,
      this.expiryTime - Date.now() - 5 * 60 * 1000
    );

    this.refreshTimer = setTimeout(async () => {
      try {
        const { token, expiryTime } = await this.refreshCallback();
        this.token = token;
        this.expiryTime = expiryTime;
        this.scheduleRefresh();           // start next cycle
      } catch (err) {
        console.error('Failed to refresh token:', err);
        setTimeout(() => this.scheduleRefresh(), 30_000); // retry in 30 s
      }
    }, timeToRefresh);
  }

  getToken() {
    if (Date.now() >= this.expiryTime) {
      throw new Error(
        'Token expired and refresh failed or not completed'
      );
    }
    return this.token;
  }

  dispose() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
```
## Collaboration Features

### Shared Context Collaboration

- **Activity Feed Integration**: Publishing and consuming activity feed items
  ```javascript
  // Post to activity feed
  async function postActivityFeedItem(teamId, channelId, activity) {
    const token = await tokenManager.getToken('graph');
    
    const feedItem = {
      appActivityId: generateUniqueId(),
      activityType: activity.type,
      previewText: activity.previewText,
      activityText: activity.text,
      templateParameters: activity.parameters
    };
    
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedItem)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to post activity: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error posting to activity feed:', error);
      throw error;
    }
  }
  ```

- **Shared App State**: Keeping state synchronized across users
  ```javascript
  // Shared app state using a backend service
  class SharedStateManager {
    constructor(sessionId, userId) {
      this.sessionId = sessionId;
      this.userId = userId;
      this.localState = {};
      this.lastSequence = 0;
      this.listeners = new Map();
      
      // Initialize SignalR connection
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(`/api/stateHub?sessionId=${sessionId}&userId=${userId}`)
        .withAutomaticReconnect()
        .build();
      
      // Register SignalR event handlers
      this.connection.on('stateUpdated', (update) => {
        this.handleRemoteUpdate(update);
      });
      
      // Start connection
      this.connection.start()
        .then(() => console.log('Connected to shared state hub'))
        .catch(err => console.error('Failed to connect to shared state hub:', err));
    }
    
    // Subscribe to state changes
    subscribe(path, callback) {
      if (!this.listeners.has(path)) {
        this.listeners.set(path, new Set());
      }
      
      this.listeners.get(path).add(callback);
      
      return () => {
        this.listeners.get(path).delete(callback);
      };
    }
    
    // Update local state and broadcast to others
    async updateState(path, value) {
      // Update local state
      const pathParts = path.split('.');
      let current = this.localState;
      
      for (let i = 0; i < pathParts.length - 1; i) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      
      // Notify local listeners
      this.notifyListeners(path, value);
      
      // Send update to server
      try {
        const update = {
          sessionId: this.sessionId,
          userId: this.userId,
          path,
          value,
          sequence: this.lastSequence,
          timestamp: Date.now()
        };
        
        await this.connection.invoke('BroadcastStateUpdate', update);
      } catch (error) {
        console.error('Failed to broadcast state update:', error);
      }
    }
    
    // Handle updates from other users
    handleRemoteUpdate(update) {
      // Update local state with remote change
      const pathParts = update.path.split('.');
      let current = this.localState;
      
      for (let i = 0; i < pathParts.length - 1; i) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[pathParts[pathParts.length - 1]] = update.value;
      
      // Notify listeners
      this.notifyListeners(update.path, update.value);
    }
    
    // Notify all listeners for a path
    notifyListeners(path, value) {
      // Find all relevant paths (including parent paths)
      const pathParts = path.split('.');
      const relevantPaths = [];
      
      let currentPath = '';
      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        relevantPaths.push(currentPath);
      }
      
      // Notify listeners for each relevant path
      for (const relevantPath of relevantPaths) {
        const listeners = this.listeners.get(relevantPath);
        if (listeners) {
          listeners.forEach(callback => {
            try {
              callback(value, path);
            } catch (error) {
              console.error(`Error in state listener for path ${relevantPath}:`, error);
            }
          });
        }
      }
    }
    
    // Clean up resources
    dispose() {
      if (this.connection) {
        this.connection.stop();
      }
      
      this.listeners.clear();
    }
  }
  ```

- **Contextual Collaboration**: Sharing content with context preservation
- **Multi-user Coordination**: Managing multi-user experiences

### File and Content Integration

- **Intelligent File Handling**: Advanced file operations with Teams
  ```javascript
  // Enhanced file picker with metadata extraction
  async function openFilePicker(options) {
    return new Promise((resolve, reject) => {
      microsoftTeams.media.selectMedia({
        mediaType: microsoftTeams.media.MediaType.Image,
        maxMediaCount: options.maxFiles || 1,
        imageProps: {
          sources: [microsoftTeams.media.Source.Camera, microsoftTeams.media.Source.Gallery],
          startMode: microsoftTeams.media.CameraStartMode.Photo,
          ink: false,
          cameraSwitcher: true,
          textSticker: false,
          enableFilter: false
        }
      }, async (error, files) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          // Process files and extract metadata
          const processedFiles = await Promise.all(files.map(async file => {
            // Get file content
            const content = await fetchFileContent(file.content);
            
            // Extract metadata based on file type
            const metadata = await extractFileMetadata(file, content);
            
            return {
              id: file.id,
              name: file.name,
              content,
              contentType: file.mimeType,
              size: content.byteLength,
              metadata
            };
          }));
          
          resolve(processedFiles);
        } catch (processError) {
          reject(processError);
        }
      });
    });
  }
  
  // Extract metadata from files
  async function extractFileMetadata(file, content) {
    const metadata = {
      timestamp: Date.now(),
      dimensions: null,
      location: null,
      author: null
    };
    
    try {
      // Extract image metadata if it's an image
      if (file.mimeType.startsWith('image/')) {
        const imageBlob = new Blob([content], { type: file.mimeType });
        const imageUrl = URL.createObjectURL(imageBlob);
        
        // Create image element to get dimensions
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            metadata.dimensions = {
              width: img.naturalWidth,
              height: img.naturalHeight
            };
            URL.revokeObjectURL(imageUrl);
            resolve();
          };
          img.src = imageUrl;
        });
        
        // Try to extract EXIF data if JPEG
        if (file.mimeType === 'image/jpeg') {
          const exifData = await extractExifData(content);
          if (exifData.gps) {
            metadata.location = exifData.gps;
          }
          if (exifData.author) {
            metadata.author = exifData.author;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract file metadata:', error);
    }
    
    return metadata;
  }
  ```

- **OneDrive Integration**: Seamless OneDrive access and operations
- **Collaborative Document Editing**: Multi-user document experiences
- **Content Intelligence**: Adding intelligence to content handling

## Mobile and Cross-platform Considerations

### Mobile-optimized Experiences

- **Touch-First Design**: Optimizing for touch interactions
  ```javascript
  // Mobile-optimized event handling
  function setupMobileInteractions(element) {
    // Track touch state
    let touchStarted = false;
    let lastTap = 0;
    let touchTimer = null;
    
    // Add larger touch targets
    element.classList.add('touch-optimized');
    
    // Handle touch start
    element.addEventListener('touchstart', (event) => {
      touchStarted = true;
      
      // Add active state
      element.classList.add('touch-active');
      
      // Set up long press detection
      touchTimer = setTimeout(() => {
        if (touchStarted) {
          // Handle long press
          handleLongPress(event);
        }
      }, 800);
    }, { passive: true });
    
    // Handle touch end
    element.addEventListener('touchend', (event) => {
      touchStarted = false;
      
      // Remove active state
      element.classList.remove('touch-active');
      
      // Clear long press timer
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      
      // Detect double tap
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
        // Handle double tap
        handleDoubleTap(event);
        event.preventDefault();
      } 
      
      lastTap = currentTime;
    });
    
    // Handle touch cancel
    element.addEventListener('touchcancel', () => {
      touchStarted = false;
      element.classList.remove('touch-active');
      
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });
  }
  ```

- **Mobile Performance Optimization**: Ensuring smooth mobile experiences
- **Responsive Input Handling**: Supporting varied input methods
- **Mobile-specific Features**: Leveraging mobile capabilities

### Cross-platform Consistency

- **Adaptive Rendering**: Adjusting UI for different platforms
  ```javascript
  // Platform detection and adaptation
  function configurePlatformAdaptations() {
    microsoftTeams.getContext((context) => {
      // Detect platform
      const platform = detectPlatform(context.hostClientType);
      
      // Apply platform-specific CSS
      document.body.classList.add(`platform-${platform}`);
      
      // Configure platform-specific behaviors
      switch (platform) {
        case 'desktop':
          enableDesktopFeatures();
          break;
        case 'web':
          enableWebFeatures();
          break;
        case 'ios':
          enableIosFeatures();
          break;
        case 'android':
          enableAndroidFeatures();
          break;
      }
      
      // Adjust UI density based on platform
      adjustUiDensity(platform);
    });
  }
  
  // Detect platform from context
  function detectPlatform(hostClientType) {
    if (!hostClientType) return 'web';
    
    const lowerCaseClient = hostClientType.toLowerCase();
    
    if (lowerCaseClient.includes('android')) {
      return 'android';
    } else if (lowerCaseClient.includes('ios')) {
      return 'ios';
    } else if (lowerCaseClient.includes('desktop')) {
      return 'desktop';
    } else {
      return 'web';
   }
  }
  

**Feature Detection**: Dynamically enabling features by platform
**Consistent Theming**: Maintaining visual consistency across platforms
**Capability Adaptation**: Adapting to platform capabilities

## Debugging and Troubleshooting

### Advanced Debugging Techniques

 **Diagnostic Logging**: Comprehensive logging for troubleshooting
  ```javascript
  // Advanced diagnostic logging system
  class DiagnosticLogger {
    constructor(options = {}) {
      this.options = {
        minLevel: options.minLevel || 'info',
        includeTimestamps: options.includeTimestamps !== false,
        includeCaller: options.includeCaller !== false,
        includeContext: options.includeContext !== false,
        maxEntries: options.maxEntries || 1000,
        persistLogs: options.persistLogs !== false,
        remoteLogging: options.remoteLogging || false,
        remoteLogEndpoint: options.remoteLogEndpoint || ''
      };
      
      this.levels = {
        trace: 0,
        debug: 1,
        info: 2,
        warn: 3,
        error: 4,
        fatal: 5
      };
      
      this.entries = [];
      
      // Restore persisted logs if enabled
      if (this.options.persistLogs) {
        this.loadPersistedLogs();
      }
      
      // Register error listener
      window.addEventListener('error', (event) => {
        this.logUnhandledError(event);
      });
      
      // Register unhandled promise rejection listener
      window.addEventListener('unhandledrejection', (event) => {
        this.logUnhandledRejection(event);
      });
    }
    
    // Log methods for different levels
    trace(message, ...args) {
      this.log('trace', message, args);
    }
    
    debug(message, ...args) {
      this.log('debug', message, args);
    }
    
    info(message, ...args) {
      this.log('info', message, args);
    }
    
    warn(message, ...args) {
      this.log('warn', message, args);
    }
    
    error(message, ...args) {
      this.log('error', message, args);
    }
    
    fatal(message, ...args) {
      this.log('fatal', message, args);
    }
    
    // Main log method
    log(level, message, args = [], context = {}) {
      // Check if level is enabled
      if (this.levels[level] < this.levels[this.options.minLevel]) {
        return;
      }
      
      // Create log entry
      const entry = {
        level,
        message,
        args: args.map(arg => this.sanitizeArg(arg)),
        timestamp: new Date().toISOString()
      };
      
      // Add caller information if enabled
      if (this.options.includeCaller) {
        entry.caller = this.getCaller();
      }
      
      // Add context information if enabled
      if (this.options.includeContext) {
        entry.context = {
          ...this.getTeamsContext(),
          ...context
        };
      }
      
      // Add entry to log
      this.entries.push(entry);
      
      // Trim log if exceeded max entries
      if (this.entries.length > this.options.maxEntries) {
        this.entries = this.entries.slice(this.entries.length - this.options.maxEntries);
      }
      
      // Output to console
      this.outputToConsole(entry);
      
      // Persist logs if enabled
      if (this.options.persistLogs) {
        this.persistLogs();
      }
      
      // Send to remote logging if enabled
      if (this.options.remoteLogging) {
        this.sendToRemoteLogging(entry);
      }
    }
    
    // Clean object references for JSON serialization
    sanitizeArg(arg) {
      try {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack,
            _type: 'Error'
          };
        }
        
        return arg;
      } catch (e) {
        return '[Sanitization failed]';
      }
    }
    
    // Get caller information
    getCaller() {
      try {
        const err = new Error();
        const stack = err.stack.split('\n');
        
        // Remove first 3 lines (Error, getCaller, log method)
        const callerLine = stack[3];
        
        if (callerLine) {
          // Extract function and location
          const matches = callerLine.match(/at (.*) \((.*)\)/) || 
                          callerLine.match(/at (.*)/);
          
          if (matches && matches.length >= 2) {
            return {
              function: matches[1].trim(),
              location: matches[2] || ''
            };
          }
        }
        
        return { function: 'unknown', location: '' };
      } catch (e) {
        return { function: 'unknown', location: '' };
      }
    }
    
    // Get Teams context information
    getTeamsContext() {
      try {
        if (window.microsoftTeams) {
          const context = {};
          
          microsoftTeams.getContext((teamsContext) => {
            Object.assign(context, teamsContext);
          });
          
          return context;
        }
      } catch (e) {
        // Ignore errors
      }
      
      return {};
    }
    
    // Output log entry to console
    outputToConsole(entry) {
      const prefix = this.options.includeTimestamps ? `[${entry.timestamp}] ` : '';
      const levelPrefix = `[${entry.level.toUpperCase()}]`;
      
      // Choose console method based on level
      let consoleMethod;
      switch (entry.level) {
        case 'trace':
        case 'debug':
          consoleMethod = console.debug || console.log;
          break;
        case 'info':
          consoleMethod = console.info || console.log;
          break;
        case 'warn':
          consoleMethod = console.warn;
          break;
        case 'error':
        case 'fatal':
          consoleMethod = console.error;
          break;
        default:
          consoleMethod = console.log;
      }
      
      // Output to console
      if (entry.args && entry.args.length > 0) {
        consoleMethod(`${prefix}${levelPrefix} ${entry.message}`, ...entry.args);
      } else {
        consoleMethod(`${prefix}${levelPrefix} ${entry.message}`);
      }
    }
    
    // Log unhandled errors
    logUnhandledError(event) {
      this.error('Unhandled error', event.error || event.message, {
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    }
    
    // Log unhandled promise rejections
    logUnhandledRejection(event) {
      this.error('Unhandled promise rejection', event.reason);
    }
    
    // Persist logs to localStorage
    persistLogs() {
      try {
        localStorage.setItem('teams_app_logs', JSON.stringify(this.entries));
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Load persisted logs from localStorage
    loadPersistedLogs() {
      try {
        const storedLogs = localStorage.getItem('teams_app_logs');
        if (storedLogs) {
          this.entries = JSON.parse(storedLogs);
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Send log entry to remote logging endpoint
    sendToRemoteLogging(entry) {
      if (!this.options.remoteLogEndpoint) {
        return;
      }
      
      try {
        fetch(this.options.remoteLogEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(entry),
          // Use keepalive to ensure logs sent even on page close
          keepalive: true
        }).catch(() => {
          // Ignore network errors
        });
      } catch (e) {
        // Ignore fetch errors
      }
    }
    
    // Export logs as JSON
    exportLogs() {
      return JSON.stringify(this.entries, null, 2);
    }
    
    // Clear all logs
    clearLogs() {
      this.entries = [];
      
      if (this.options.persistLogs) {
        this.persistLogs();
      }
    }
  }
  ```

- **Runtime Inspection**: Examining app state during execution
- **API Call Tracing**: Monitoring and debugging API interactions
- **Performance Profiling**: Identifying and fixing performance issues

### Telemetry and Monitoring

- **User Interaction Tracking**: Capturing user behavior telemetry
  ```javascript
  // User interaction telemetry system
  class UserTelemetry {
    constructor(options = {}) {
      this.options = {
        sessionId: options.sessionId || this.generateSessionId(),
        batchSize: options.batchSize || 10,
        flushInterval: options.flushInterval || 30000,
        endpointUrl: options.endpointUrl || '/api/telemetry',
        includeContext: options.includeContext !== false
      };
      
      this.events = [];
      this.context = {};
      this.flushTimer = null;
      
      // Load Teams context if available
      if (this.options.includeContext) {
        this.loadTeamsContext();
      }
      
      // Set up periodic flush
      this.startFlushTimer();
      
      // Set up before unload handler
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
    
    // Generate unique session ID
    generateSessionId() {
      return 'session_'  Math.random().toString(36).substring(2, 15)  
             Math.random().toString(36).substring(2, 15);
    }
    
    // Load Teams context
    loadTeamsContext() {
      if (window.microsoftTeams) {
        microsoftTeams.getContext((context) => {
          this.context = {
            userId: context.userObjectId,
            tenantId: context.tid,
            theme: context.theme,
            hostClientType: context.hostClientType,
            locale: context.locale
          };
        });
      }
    }
    
    // Track a user event
    trackEvent(eventName, properties = {}) {
      // Create event object
      const event = {
        eventName,
        properties,
        timestamp: new Date().toISOString(),
        sessionId: this.options.sessionId
      };
      
      // Add context if available
      if (Object.keys(this.context).length > 0) {
        event.context = this.context;
      }
      
      // Add event to queue
      this.events.push(event);
      
      // Flush if batch size reached
      if (this.events.length >= this.options.batchSize) {
        this.flush();
      }
    }
    
    // Track page view
    trackPageView(pageName, properties = {}) {
      this.trackEvent('PageView', {
        pageName,
        ...properties
      });
    }
    
    // Track user action
    trackAction(actionName, properties = {}) {
      this.trackEvent('UserAction', {
        actionName,
        ...properties
      });
    }
    
    // Track API call
    trackApiCall(endpoint, properties = {}) {
      this.trackEvent('ApiCall', {
        endpoint,
        ...properties
      });
    }
    
    // Track error
    trackError(errorName, properties = {}) {
      this.trackEvent('Error', {
        errorName,
        ...properties
      });
    }
    
    // Start flush timer
    startFlushTimer() {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }
      
      this.flushTimer = setInterval(() => {
        if (this.events.length > 0) {
          this.flush();
        }
      }, this.options.flushInterval);
    }
    
    // Flush events to endpoint
    flush(isSync = false) {
      if (this.events.length === 0) {
        return;
      }
      
      // Copy events and clear queue
      const eventsToSend = [...this.events];
      this.events = [];
      
      // Prepare request
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: eventsToSend
        })
      };
      
      // Use sendBeacon for sync flush (page unload)
      if (isSync && navigator.sendBeacon) {
        try {
          const blob = new Blob([fetchOptions.body], { type: 'application/json' });
          navigator.sendBeacon(this.options.endpointUrl, blob);
          return;
        } catch (e) {
          // Fall back to fetch if sendBeacon fails
        }
      }
      
      // Use fetch for async flush
      fetch(this.options.endpointUrl, fetchOptions).catch(() => {
        // Add events back to queue on failure
        this.events.unshift(...eventsToSend);
        
        // Limit queue size to prevent memory issues
        if (this.events.length > this.options.batchSize * 3) {
          this.events = this.events.slice(-this.options.batchSize * 3);
        }
      });
    }
    
    // Dispose and clean up
    dispose() {
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = null;
      }
      
      // Flush any remaining events
      this.flush(true);
    }
  }
  ```

- **Error Monitoring**: Detecting and reporting errors
- **Performance Metrics Collection**: Gathering app performance data
- **Usage Analytics**: Analyzing feature usage patterns

## Case Studies and Examples

### Enterprise Integration Patterns

- **Corporate Directory Integration**: Connecting Teams and ACS with corporate identity
  ```javascript
  // Example: Corporate directory integration with Teams and ACS
  async function initializeDirectoryIntegration() {
    try {
      // Get Teams context
      const context = await getTeamsContext();
      
      // Get user token
      const token = await microsoftTeams.authentication.getAuthToken();
      
      // Exchange for Graph token
      const graphToken = await exchangeTokenForGraph(token);
      
      // Fetch user's organizational data
      const orgData = await fetchOrganizationalData(graphToken, context.userObjectId);
      
      // Initialize ACS identity
      const acsToken = await exchangeTokenForACS(token);
      const acsIdentity = await initializeAcsIdentity(acsToken, orgData);
      
      // Set up directory search provider
      initializeDirectorySearchProvider(graphToken, acsIdentity);
      
      // Return integrated identity info
      return {
        teamsIdentity: context,
        graphIdentity: orgData,
        acsIdentity
      };
    } catch (error) {
      console.error('Failed to initialize directory integration:', error);
      throw error;
    }
  }
  
  // Initialize directory search
  function initializeDirectorySearchProvider(graphToken, acsIdentity) {
    // Create provider for directory search
    directoryProvider = {
      searchUsers: async (query, options = {}) => {
        // Implement search with MS Graph
        const searchResults = await searchUsersInGraph(graphToken, query, options);
        
        // Map results to include ACS identities
        return mapGraphResultsToAcsIdentities(searchResults);
      },
      
      getUserDetails: async (userId) => {
        // Get detailed user info from Graph
        const userDetails = await getUserDetailsFromGraph(graphToken, userId);
        
        // Enhance with ACS identity
        return enhanceUserWithAcsIdentity(userDetails);
      },
      
      getUserPresence: async (userIds) => {
        // Get presence for multiple users
        return getPresenceForUsers(graphToken, userIds);
      }
    };
    
    return directoryProvider;
  }
  ```

- **Helpdesk Integration**: Building helpdesk solutions with Teams and ACS
- **Field Service Solutions**: Creating field service apps with real-time communication
- **Healthcare Communication**: Building secure healthcare communication solutions

### Implementation Strategies

- **Staged Deployment**: Incrementally rolling out Teams and ACS features
  ```javascript
  // Feature flag system for staged rollout
  class FeatureFlagManager {
    constructor(options = {}) {
      this.options = {
        endpoint: options.endpoint || '/api/featureFlags',
        refreshInterval: options.refreshInterval || 300000,
        defaultFlags: options.defaultFlags || {}
      };
      
      this.flags = { ...this.options.defaultFlags };
      this.lastRefresh = 0;
      
      // Load initial flags
      this.refreshFlags();
    }
    
    // Check if feature is enabled
    isEnabled(featureName, defaultValue = false) {
      // Check if flags need refresh
      const now = Date.now();
      if (now - this.lastRefresh > this.options.refreshInterval) {
        // Refresh async without blocking current check
        this.refreshFlags();
      }
      
      // Return feature status or default
      return this.flags[featureName] !== undefined ? 
        this.flags[featureName] : defaultValue;
    }
    
    // Refresh flags from server
    async refreshFlags() {
      try {
        // Get Teams context
        const context = await new Promise(resolve => {
          microsoftTeams.getContext(context => resolve(context));
        });
        
        // Get flags from server with context
        const response = await fetch(this.options.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: context.userObjectId,
            tenantId: context.tid,
            hostClientType: context.hostClientType,
            locale: context.locale
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          this.flags = data.flags || {};
          this.lastRefresh = Date.now();
        }
      } catch (error) {
        console.warn('Failed to refresh feature flags:', error);
      }
    }
  }
  ```

- **Migration Patterns**: Migrating from basic to advanced integration
- **Reusable Components**: Building reusable components for Teams and ACS
- **Architecture Patterns**: Reference architectures for Teams and ACS integration