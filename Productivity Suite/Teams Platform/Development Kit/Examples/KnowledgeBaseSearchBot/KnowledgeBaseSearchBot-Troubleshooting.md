# KnowledgeBaseSearchBot Troubleshooting Guide

## Introduction

This comprehensive troubleshooting guide provides solutions for common issues encountered when deploying, configuring, and using the KnowledgeBaseSearchBot for Microsoft Teams. Use this document to diagnose and resolve problems efficiently, ensuring optimal performance of your knowledge base search solution.

## Table of Contents

- [Prerequisites Verification](#prerequisites-verification)
- [Deployment Issues](#deployment-issues)
- [Connection and Authentication Problems](#connection-and-authentication-problems)
- [Search Functionality Issues](#search-functionality-issues)
- [Performance Optimization](#performance-optimization)
- [User Experience Problems](#user-experience-problems)
- [Adaptive Card Rendering Issues](#adaptive-card-rendering-issues)
- [Indexing and Content Access Problems](#indexing-and-content-access-problems)
- [Directory Tree Scan Troubleshooting](#directory-tree-scan-troubleshooting)
- [Logging and Diagnostics](#logging-and-diagnostics)
- [Common Error Codes](#common-error-codes)
- [Frequently Asked Questions](#frequently-asked-questions)

## Prerequisites Verification

Before troubleshooting specific issues, verify that all prerequisites are properly configured:

### Azure Services Checklist

| Service | Verification Method | Common Issues |
|---------|---------------------|--------------|
| **Azure Bot Service** | Azure Portal > Resource > Status | • Service not provisioned<br>• Wrong pricing tier (requires S1 or higher) |
| **Azure Cognitive Search** | Azure Portal > Search Service > Overview | • Service not provisioned<br>• Index not created<br>• Wrong pricing tier (requires Basic or higher) |
| **Azure App Service** | Azure Portal > App Service > Overview | • Service stopped<br>• Incorrect configuration<br>• Insufficient scaling |
| **Azure Application Insights** | Azure Portal > App Insights > Overview | • Not properly connected<br>• Sampling rate too low |
| **Azure Key Vault** | Azure Portal > Key Vault > Access Policies | • Missing access policies<br>• Expired secrets |

### Microsoft Teams Configuration Checklist

| Configuration | Verification Method | Common Issues |
|---------------|---------------------|--------------|
| **Bot Registration** | Teams Admin Center > Manage Apps | • Bot not registered<br>• Missing permissions |
| **App Manifest** | Visual Studio Code > Manifest.json | • Invalid manifest format<br>• Missing required fields |
| **Teams App Permissions** | Teams Admin Center > Permission Policies | • Bot blocked by policy<br>• Missing RSC permissions |
| **Bot Sideloading** | Teams Client > Apps > Upload Custom App | • Sideloading disabled<br>• Manifest validation errors |

## Deployment Issues

### Bot Registration Failed

**Symptoms:**
- Error during bot registration
- "Failed to register bot" message in Azure Portal
- Bot ID not generated

**Solutions:**
1. Verify Azure subscription has sufficient permissions
2. Check for naming conflicts with existing bot registrations
3. Validate App ID and password are correctly configured
4. Ensure the bot endpoint URL is accessible and has valid SSL

### Azure Deployment Errors

**Symptoms:**
- ARM template deployment fails
- Resource creation errors in Azure
- Missing or incomplete resource provisioning

**Solutions:**
1. Check Azure subscription quota and limits
2. Verify resource naming follows Azure conventions
3. Ensure all dependent resources are created first
4. Review deployment logs for specific error messages:
   ```powershell
   # PowerShell command to check deployment logs
   Get-AzResourceGroupDeploymentOperation -DeploymentName "KnowledgeBaseBot" -ResourceGroupName "YourResourceGroup"
   ```

### Teams App Package Installation Issues

**Symptoms:**
- Error uploading app package to Teams
- App appears in Teams but fails to initialize
- Permission errors when accessing the app

**Solutions:**
1. Validate the manifest.json file structure
2. Ensure all icon files are correctly referenced and accessible
3. Check that bot endpoints are properly configured and accessible
4. Verify the app is approved in Teams Admin Center

## Connection and Authentication Problems

### Bot Framework Authentication Failures

**Symptoms:**
- Bot fails to authenticate with Bot Framework
- Error messages about invalid credentials
- Bot appears offline in Teams

**Solutions:**
1. Verify App ID and App Password are correctly configured
2. Check that the Microsoft App ID is valid and active
3. Rotate and update the Microsoft App Password if necessary
4. Ensure the bot is registered in the correct Azure tenant

```json
// Check configuration in settings.json
{
  "MicrosoftAppId": "YOUR_APP_ID",
  "MicrosoftAppPassword": "YOUR_APP_PASSWORD",
  "MicrosoftAppTenantId": "YOUR_TENANT_ID"
}
```

### Azure Cognitive Search Connection Issues

**Symptoms:**
- Bot cannot connect to search service
- Error messages about search endpoint or key
- Empty search results despite valid queries

**Solutions:**
1. Verify search service endpoint URL is correct
2. Check that the search API key is valid and has appropriate permissions
3. Ensure the index name matches the configured value
4. Test direct connectivity to the search endpoint from the bot server:

```javascript
// Test search connectivity
const { SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');

async function testSearchConnection() {
  try {
    const client = new SearchIndexClient(
      process.env.SEARCH_ENDPOINT,
      process.env.SEARCH_INDEX,
      new AzureKeyCredential(process.env.SEARCH_API_KEY)
    );
    
    const result = await client.getIndexStatistics();
    console.log('Connection successful:', result);
    return true;
  } catch (error) {
    console.error('Search connection failed:', error);
    return false;
  }
}
```

### Microsoft Graph API Authorization Problems

**Symptoms:**
- Cannot access user or organizational data
- Permission errors when retrieving documents
- Graph API calls returning 401 or 403 status codes

**Solutions:**
1. Verify the bot has appropriate Graph API permissions
2. Check that admin consent has been granted for required permissions
3. Ensure the authentication flow is properly implemented
4. Validate token acquisition and refresh logic:

```javascript
// Example Graph API token validation
const { ConfidentialClientApplication } = require('@azure/msal-node');

async function validateGraphToken() {
  try {
    const config = {
      auth: {
        clientId: process.env.MICROSOFT_APP_ID,
        clientSecret: process.env.MICROSOFT_APP_PASSWORD,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`
      }
    };
    
    const client = new ConfidentialClientApplication(config);
    const result = await client.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });
    
    console.log('Token acquired successfully');
    return result.accessToken;
  } catch (error) {
    console.error('Token acquisition failed:', error);
    return null;
  }
}
```

## Search Functionality Issues

### No Search Results Returned

**Symptoms:**
- Bot returns "No results found" for common queries
- Search appears to be working but returns empty results
- Previously working queries stop returning results

**Solutions:**
1. Verify the index contains documents by checking index statistics
2. Ensure the query syntax is correctly formatted
3. Check if filters are too restrictive
4. Test the same query directly against the Cognitive Search REST API:

```bash
# Test query using curl
curl -X POST "https://your-search-service.search.windows.net/indexes/your-index/docs/search?api-version=2020-06-30" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_SEARCH_API_KEY" \
  -d '{"search": "your query", "top": 10}'
```

### Irrelevant Search Results

**Symptoms:**
- Search returns results unrelated to the query
- Results are not ordered by relevance
- Incorrect document types being returned

**Solutions:**
1. Review and refine the search scoring profiles
2. Adjust field weightings to prioritize important content
3. Add or update synonym maps for common terms
4. Implement or refine semantic search configuration:

```javascript
// Enhanced search with semantic configuration
async function enhancedSearch(query) {
  try {
    const searchClient = new SearchClient(
      process.env.SEARCH_ENDPOINT,
      process.env.SEARCH_INDEX,
      new AzureKeyCredential(process.env.SEARCH_API_KEY)
    );
    
    const results = await searchClient.search(query, {
      queryType: 'semantic',
      semanticConfiguration: 'default',
      captions: 'extractive',
      answers: 'extractive',
      top: 5,
      select: ['title', 'content', 'category', 'lastModified', 'documentUrl'],
      orderBy: ['@search.score desc']
    });
    
    return results;
  } catch (error) {
    console.error('Enhanced search failed:', error);
    return null;
  }
}
```

### Query Processing Errors

**Symptoms:**
- Error messages when processing specific queries
- Unexpected query parsing behaviors
- Search fails for queries with special characters

**Solutions:**
1. Implement query sanitization to handle special characters
2. Add query pre-processing to handle common patterns
3. Use query suggestion and auto-complete to guide users
4. Implement robust error handling for query processing:

```javascript
function sanitizeQuery(query) {
  if (!query) return '';
  
  // Remove potentially problematic characters
  let sanitized = query.replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g, ' ');
  
  // Remove extra whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Add any specific replacements
  const replacements = [
    { pattern: /\bAI\b/g, replacement: 'artificial intelligence' },
    { pattern: /\bML\b/g, replacement: 'machine learning' }
  ];
  
  replacements.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  return sanitized;
}
```

## Performance Optimization

### Slow Search Response Times

**Symptoms:**
- Searches take more than 2 seconds to complete
- Performance degrades with increased usage
- Timeout errors during search operations

**Solutions:**
1. Optimize the search index with proper field configurations
2. Implement caching for common queries
3. Scale up the Azure Cognitive Search service tier
4. Monitor and optimize query patterns:

```javascript
// Implementing response caching
const NodeCache = require('node-cache');
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

async function cachedSearch(query, filters = {}) {
  const cacheKey = `${query}_${JSON.stringify(filters)}`;
  
  // Check if result is in cache
  const cachedResult = searchCache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for query:', query);
    return cachedResult;
  }
  
  // Perform search and store in cache
  try {
    const result = await performSearch(query, filters);
    searchCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}
```

### Bot Response Latency

**Symptoms:**
- Bot takes a long time to respond to messages
- Timeouts during complex operations
- Increased latency during peak usage times

**Solutions:**
1. Implement asynchronous processing for long-running operations
2. Optimize bot framework conversation state management
3. Scale out the bot service with multiple instances
4. Use Application Insights to identify bottlenecks:

```javascript
// Add performance tracking with Application Insights
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
  .setAutoCollectPerformance(true)
  .setAutoCollectDependencies(true)
  .start();

const client = appInsights.defaultClient;

async function trackedSearch(query, userId) {
  // Start tracking request
  const startTime = Date.now();
  
  try {
    // Perform search
    const result = await performSearch(query);
    
    // Track successful search
    client.trackRequest({
      name: 'Search Operation',
      url: 'internal://search',
      duration: Date.now() - startTime,
      resultCode: 200,
      success: true,
      properties: {
        query: query,
        resultCount: result.length,
        userId: userId
      }
    });
    
    return result;
  } catch (error) {
    // Track failed search
    client.trackRequest({
      name: 'Search Operation',
      url: 'internal://search',
      duration: Date.now() - startTime,
      resultCode: 500,
      success: false,
      properties: {
        query: query,
        error: error.message,
        userId: userId
      }
    });
    
    throw error;
  }
}
```

### Memory Consumption Issues

**Symptoms:**
- Bot service showing high memory usage
- Out of memory errors
- Performance degradation over time

**Solutions:**
1. Implement proper memory management and garbage collection
2. Optimize large object handling
3. Configure appropriate scaling rules based on memory metrics
4. Monitor and profile memory usage:

```javascript
// Memory usage monitoring
function logMemoryUsage() {
  const used = process.memoryUsage();
  const memoryLog = {
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`
  };
  
  console.log('Memory usage:', memoryLog);
  
  // Track with Application Insights if configured
  if (appInsights && appInsights.defaultClient) {
    appInsights.defaultClient.trackMetric({
      name: 'MemoryUsage', 
      value: used.heapUsed / 1024 / 1024
    });
  }
}

// Log memory usage every 5 minutes
setInterval(logMemoryUsage, 5 * 60 * 1000);
```

## User Experience Problems

### Bot Not Responding to Messages

**Symptoms:**
- Bot does not answer user messages
- "The bot is typing" indicator appears but no response is sent
- Inconsistent responses to similar queries

**Solutions:**
1. Check bot service health and connectivity
2. Verify message handling logic for the specific message types
3. Implement timeout handling for long-running operations
4. Add comprehensive error handling for user interactions:

```javascript
// Robust message handling with timeouts
class RobustMessageHandler {
  constructor(bot) {
    this.bot = bot;
    this.operationTimeouts = new Map();
  }
  
  async handleMessage(context, next) {
    const conversationId = context.activity.conversation.id;
    const messageId = context.activity.id;
    const operationKey = `${conversationId}:${messageId}`;
    
    try {
      // Set typing indicator
      await context.sendActivity({ type: 'typing' });
      
      // Set timeout for operation
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, 30000); // 30 second timeout
        
        this.operationTimeouts.set(operationKey, timeoutId);
      });
      
      // Process message with timeout
      const result = await Promise.race([
        this.processMessage(context),
        timeoutPromise
      ]);
      
      // Clear timeout
      this.clearTimeout(operationKey);
      
      return result;
    } catch (error) {
      // Clear timeout
      this.clearTimeout(operationKey);
      
      // Handle error
      console.error('Message handling error:', error);
      await context.sendActivity('I encountered a problem processing your request. Please try again.');
      
      // Log error
      if (appInsights && appInsights.defaultClient) {
        appInsights.defaultClient.trackException({ exception: error });
      }
    }
    
    // Call next middleware
    await next();
  }
  
  clearTimeout(operationKey) {
    const timeoutId = this.operationTimeouts.get(operationKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.operationTimeouts.delete(operationKey);
    }
  }
  
  async processMessage(context) {
    // Implement message processing logic
  }
}
```

### Context Loss Between Messages

**Symptoms:**
- Bot forgets previous interactions within the same conversation
- Unable to handle follow-up questions
- Loses reference to previous search results

**Solutions:**
1. Implement proper conversation state management
2. Store and retrieve context for ongoing conversations
3. Use entity extraction to maintain subject continuity
4. Implement a conversation memory system:

```javascript
// Conversation memory management
class ConversationMemory {
  constructor(storage) {
    this.storage = storage;
    this.memoryTimeToLive = 30 * 60 * 1000; // 30 minutes
  }
  
  async getMemory(userId, conversationId) {
    const key = this.getStorageKey(userId, conversationId);
    const memoryItem = await this.storage.read([key]);
    
    if (memoryItem && memoryItem[key]) {
      const memory = memoryItem[key];
      
      // Check if memory is expired
      if (memory.timestamp && Date.now() - memory.timestamp > this.memoryTimeToLive) {
        await this.clearMemory(userId, conversationId);
        return this.getDefaultMemory();
      }
      
      return memory;
    }
    
    return this.getDefaultMemory();
  }
  
  async saveMemory(userId, conversationId, memory) {
    const key = this.getStorageKey(userId, conversationId);
    memory.timestamp = Date.now();
    
    const changes = {};
    changes[key] = memory;
    
    await this.storage.write(changes);
  }
  
  async clearMemory(userId, conversationId) {
    const key = this.getStorageKey(userId, conversationId);
    await this.storage.delete([key]);
  }
  
  getStorageKey(userId, conversationId) {
    return `${userId}:${conversationId}`;
  }
  
  getDefaultMemory() {
    return {
      recentQueries: [],
      entities: {},
      lastResults: null,
      activeTopics: [],
      timestamp: Date.now()
    };
  }
}
```

### Conversation Flow Issues

**Symptoms:**
- Bot does not maintain coherent conversation flow
- Responses do not follow natural dialogue patterns
- Difficulty with multi-turn interactions

**Solutions:**
1. Implement conversation flow management
2. Use dialog management system for complex interactions
3. Track conversation state and user intent
4. Structure conversations with dialog waterfall steps:

```javascript
// Dialog-based conversation flow
const { ComponentDialog, WaterfallDialog, TextPrompt } = require('botbuilder-dialogs');

class SearchDialog extends ComponentDialog {
  constructor(id) {
    super(id);
    
    // Add prompts
    this.addDialog(new TextPrompt('textPrompt'));
    
    // Add waterfall dialog
    this.addDialog(new WaterfallDialog('searchWaterfall', [
      this.initializeSearch.bind(this),
      this.processQuery.bind(this),
      this.displayResults.bind(this),
      this.handleFollowUp.bind(this)
    ]));
    
    // Set initial dialog
    this.initialDialogId = 'searchWaterfall';
  }
  
  async initializeSearch(step) {
    // Initialize search state
    step.values.searchState = {
      originalQuery: step.options.query || null,
      currentQuery: step.options.query || null,
      filters: {},
      results: null,
      page: 1
    };
    
    if (step.values.searchState.originalQuery) {
      return await step.next();
    }
    
    return await step.prompt('textPrompt', 'What would you like to search for?');
  }
  
  async processQuery(step) {
    // Get or update query
    if (!step.values.searchState.currentQuery) {
      step.values.searchState.currentQuery = step.result;
      step.values.searchState.originalQuery = step.result;
    }
    
    // Perform search
    const results = await this.performSearch(step.values.searchState.currentQuery, step.values.searchState.filters);
    step.values.searchState.results = results;
    
    return await step.next();
  }
  
  async displayResults(step) {
    const { results } = step.values.searchState;
    
    if (!results || results.length === 0) {
      await step.context.sendActivity('I couldn\'t find any results for your query.');
      return await step.endDialog();
    }
    
    // Create and send results card
    const resultsCard = this.createResultsCard(results);
    await step.context.sendActivity({ attachments: [resultsCard] });
    
    return await step.next();
  }
  
  async handleFollowUp(step) {
    await step.context.sendActivity('Is there anything else you\'d like to know about these results?');
    return await step.endDialog(step.values.searchState);
  }
  
  async performSearch(query, filters) {
    // Implement search logic
  }
  
  createResultsCard(results) {
    // Implement results card creation
  }
}
```

## Adaptive Card Rendering Issues

### Cards Not Displaying Correctly

**Symptoms:**
- Adaptive Cards show formatting errors
- Cards appear differently across different Teams clients
- Interactive elements not working as expected

**Solutions:**
1. Validate Adaptive Card JSON against schema
2. Test cards with the Adaptive Card Designer
3. Ensure compatibility with Teams-specific requirements
4. Implement proper error handling for card rendering:

```javascript
// Robust Adaptive Card rendering
function createSafeAdaptiveCard(cardData) {
  try {
    // Validate card structure
    if (!cardData || !cardData.version || !cardData.type || !cardData.body) {
      throw new Error('Invalid card structure');
    }
    
    // Ensure version is supported by Teams
    if (cardData.version !== '1.3') {
      cardData.version = '1.3';
    }
    
    // Validate body elements
    if (Array.isArray(cardData.body)) {
      cardData.body = cardData.body.filter(element => {
        return element && typeof element === 'object' && element.type;
      });
    } else {
      cardData.body = [];
    }
    
    // Validate actions
    if (Array.isArray(cardData.actions)) {
      cardData.actions = cardData.actions.filter(action => {
        return action && typeof action === 'object' && action.type;
      });
    }
    
    return CardFactory.adaptiveCard(cardData);
  } catch (error) {
    console.error('Error creating adaptive card:', error);
    
    // Return a simple fallback card
    return CardFactory.adaptiveCard({
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: 'Sorry, there was a problem displaying this card.',
          wrap: true
        }
      ]
    });
  }
}
```

### Action Button Failures

**Symptoms:**
- Card action buttons do not trigger responses
- Action handling errors in bot code
- Inconsistent action behavior across clients

**Solutions:**
1. Verify action handler implementation in bot code
2. Ensure action IDs are unique and properly referenced
3. Validate the action data format
4. Implement comprehensive action handling:

```javascript
// Robust action handling
async function handleCardAction(context) {
  try {
    // Verify this is a card action
    if (context.activity.type !== 'message' || !context.activity.value) {
      return false;
    }
    
    const actionData = context.activity.value;
    
    // Handle different action types
    switch (actionData.action) {
      case 'showDetails':
        await handleShowDetailsAction(context, actionData);
        break;
        
      case 'refineSearch':
        await handleRefineSearchAction(context, actionData);
        break;
        
      case 'provideFeedback':
        await handleFeedbackAction(context, actionData);
        break;
        
      default:
        console.warn('Unknown action type:', actionData.action);
        await context.sendActivity('I\'m not sure how to process that action.');
        return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error handling card action:', error);
    await context.sendActivity('There was a problem processing your request.');
    return false;
  }
}

async function handleShowDetailsAction(context, actionData) {
  // Implementation for showing document details
}

async function handleRefineSearchAction(context, actionData) {
  // Implementation for refining search
}

async function handleFeedbackAction(context, actionData) {
  // Implementation for handling user feedback
}
```

### Image Rendering Problems

**Symptoms:**
- Images in cards do not display
- Image sizing or aspect ratio issues
- Broken image links

**Solutions:**
1. Ensure images are hosted on accessible HTTPS endpoints
2. Verify image URLs are properly formatted
3. Set appropriate image size and style properties
4. Implement image error handling:

```javascript
// Image helper functions
function getImageElement(imageUrl, altText = '', size = 'medium') {
  // Validate image URL
  if (!imageUrl || !isValidUrl(imageUrl)) {
    return getFallbackImageElement(altText);
  }
  
  // Ensure HTTPS
  if (imageUrl.startsWith('http:')) {
    imageUrl = imageUrl.replace('http:', 'https:');
  }
  
  return {
    type: 'Image',
    url: imageUrl,
    altText: altText || 'Image',
    size: size,
    onError: {
      type: 'TextBlock',
      text: altText || 'Image not available',
      wrap: true
    }
  };
}

function getFallbackImageElement(altText) {
  return {
    type: 'TextBlock',
    text: altText || 'Image not available',
    wrap: true
  };
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}
```

## Indexing and Content Access Problems

### Missing Content in Search Results

**Symptoms:**
- Known content does not appear in search results
- Recently added documents are not searchable
- Incomplete document content in results

**Solutions:**
1. Verify indexing pipeline is working correctly
2. Check document processing and extraction settings
3. Validate content access permissions
4. Monitor indexing operations:

```javascript
// Index monitoring function
async function checkIndexingStatus() {
  try {
    const searchServiceClient = new SearchServiceClient(
      process.env.SEARCH_ENDPOINT,
      new AzureKeyCredential(process.env.SEARCH_ADMIN_KEY)
    );
    
    // Get index statistics
    const indexStats = await searchServiceClient.getIndexStatistics(process.env.SEARCH_INDEX);
    console.log('Index statistics:', indexStats);
    
    // Check indexer status
    const indexerStatus = await searchServiceClient.getIndexerStatus(process.env.SEARCH_INDEXER);
    console.log('Indexer status:', indexerStatus);
    
    // Check for indexing errors
    if (indexerStatus.lastResult && indexerStatus.lastResult.status === 'error') {
      console.error('Indexer errors:', indexerStatus.lastResult.errorMessage);
      // Send alert
      await sendIndexingErrorAlert(indexerStatus.lastResult);
    }
    
    return {
      documentCount: indexStats.documentCount,
      indexerStatus: indexerStatus.status,
      lastIndexingTime: indexerStatus.lastResult ? indexerStatus.lastResult.endTime : null,
      hasErrors: indexerStatus.lastResult && indexerStatus.lastResult.status === 'error'
    };
  } catch (error) {
    console.error('Error checking indexing status:', error);
    return null;
  }
}

async function sendIndexingErrorAlert(indexerResult) {
  // Implement alerting logic (email, Teams notification, etc.)
}
```

### Document Access Permission Issues

**Symptoms:**
- Search returns results user should not be able to see
- Missing results that should be accessible
- Permission-related errors during search

**Solutions:**
1. Implement security trimming in search results
2. Ensure proper identity flow from Teams to search service
3. Configure Azure Cognitive Search security filters
4. Implement permission-based result filtering:

```javascript
// Security-trimmed search
async function securityTrimmedSearch(query, user) {
  try {
    // Get user groups and permissions
    const userIdentity = await getUserIdentity(user);
    
    // Build security filter
    const securityFilter = buildSecurityFilter(userIdentity);
    
    // Perform search with security filter
    const searchClient = new SearchClient(
      process.env.SEARCH_ENDPOINT,
      process.env.SEARCH_INDEX,
      new AzureKeyCredential(process.env.SEARCH_API_KEY)
    );
    
    const results = await searchClient.search(query, {
      filter: securityFilter,
      select: ['id', 'title', 'content', 'documentUrl', 'lastModified', 'author'],
      top: 10
    });
    
    return results;
  } catch (error) {
    console.error('Security-trimmed search failed:', error);
    throw error;
  }
}

async function getUserIdentity(user) {
  // Implementation to get user groups and permissions
}

function buildSecurityFilter(userIdentity) {
  // Build OData filter expression for security filtering
  const allowedGroups = userIdentity.groups.map(group => `allowedGroups/any(g: g eq '${group}')`);
  const allowedUsers = `allowedUsers/any(u: u eq '${userIdentity.id}')`;
  
  return `isPublic eq true or ${allowedUsers} or ${allowedGroups.join(' or ')}`;
}
```

### Indexer Configuration Problems

**Symptoms:**
- Indexing errors in Azure portal
- Missing fields in indexed documents
- Document content not properly extracted

**Solutions:**
1. Review and update field mappings
2. Check content extraction settings for different file types
3. Validate data source connection configuration
4. Implement custom skills for complex content extraction:

```javascript
// Example indexer configuration
const indexerConfig = {
  name: 'knowledge-indexer',
  dataSourceName: 'knowledge-data-source',
  targetIndexName: 'knowledge-index',
  schedule: {
    interval: 'PT1H' // Run every hour
  },
  parameters: {
    batchSize: 100,
    maxFailedItems: 10,
    maxFailedItemsPerBatch: 5
  },
  fieldMappings: [
    {
      sourceFieldName: 'metadata_storage_name',
      targetFieldName: 'fileName'
    },
    {
      sourceFieldName: 'metadata_storage_path',
      targetFieldName: 'documentUrl'
    },
    {
      sourceFieldName: 'metadata_storage_last_modified',
      targetFieldName: 'lastModified'
    }
  ],
  outputFieldMappings: [
    {
      sourceFieldName: '/document/content',
      targetFieldName: 'content',
      mappingFunction: null
    },
    {
      sourceFieldName: '/document/normalized_images/*/text',
      targetFieldName: 'imageText',
      mappingFunction: null
    },
    {
      sourceFieldName: '/document/pages/*/keyPhrases/*',
      targetFieldName: 'keyPhrases',
      mappingFunction: null
    }
  ]
};
```

## Directory Tree Scan Troubleshooting

### Running a Directory Tree Scan

To diagnose issues with content access and indexing, you can run a directory tree scan to verify file accessibility and structure:

```javascript
// Directory tree scan utility
const fs = require('fs');
const path = require('path');

class DirectoryScanner {
  constructor(options = {}) {
    this.options = {
      maxDepth: options.maxDepth || 10,
      excludePatterns: options.excludePatterns || [],
      fileTypes: options.fileTypes || null,
      followSymlinks: options.followSymlinks || false,
      verbose: options.verbose || false
    };
    
    this.stats = {
      directories: 0,
      files: 0,
      errors: 0,
      skipped: 0,
      byType: {}
    };
  }
  
  async scanDirectory(rootPath) {
    console.log(`Starting directory scan at: ${rootPath}`);
    const startTime = Date.now();
    
    try {
      const tree = await this.buildDirectoryTree(rootPath, 0);
      
      const endTime = Date.now();
      console.log(`Scan completed in ${(endTime - startTime) / 1000} seconds`);
      console.log(`Directories: ${this.stats.directories}`);
      console.log(`Files: ${this.stats.files}`);
      console.log(`Errors: ${this.stats.errors}`);
      console.log(`Skipped: ${this.stats.skipped}`);
      console.log('File types:', this.stats.byType);
      
      return {
        tree,
        stats: this.stats,
        scanTime: endTime - startTime
      };
    } catch (error) {
      console.error('Directory scan failed:', error);
      throw error;
    }
  }
  
  async buildDirectoryTree(currentPath, depth) {
    // Check max depth
    if (depth > this.options.maxDepth) {
      if (this.options.verbose) {
        console.log(`Max depth reached at: ${currentPath}`);
      }
      this.stats.skipped++;
      return null;
    }
    
    // Check if path should be excluded
    if (this.shouldExclude(currentPath)) {
      if (this.options.verbose) {
        console.log(`Excluded path: ${currentPath}`);
      }
      this.stats.skipped++;
      return null;
    }
    
    try {
      const stats = await fs.promises.stat(currentPath);
      
      if (stats.isDirectory()) {
        this.stats.directories++;
        
        // Read directory contents
        const items = await fs.promises.readdir(currentPath);
        const children = [];
        
        // Process each item
        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const child = await this.buildDirectoryTree(itemPath, depth + 1);
          
          if (child) {
            children.push(child);
          }
        }
        
        return {
          name: path.basename(currentPath),
          path: currentPath,
          type: 'directory',
          children
        };
      } else if (stats.isFile()) {
        const fileType = path.extname(currentPath).toLowerCase();
        
        // Check if file type should be included
        if (this.options.fileTypes && !this.options.fileTypes.includes(fileType)) {
          if (this.options.verbose) {
            console.log(`Skipped file type: ${currentPath}`);
          }
          this.stats.skipped++;
          return null;
        }
        
        this.stats.files++;
        
        // Track file type statistics
        if (!this.stats.byType[fileType]) {
          this.stats.byType[fileType] = 0;
        }
        this.stats.byType[fileType]++;
        
        return {
          name: path.basename(currentPath),
          path: currentPath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime
        };
      } else if (stats.isSymbolicLink() && this.options.followSymlinks) {
        const targetPath = await fs.promises.readlink(currentPath);
        return await this.buildDirectoryTree(targetPath, depth + 1);
      }
      
      return null;
    } catch (error) {
      console.error(`Error scanning path: ${currentPath}`, error);
      this.stats.errors++;
      return {
        name: path.basename(currentPath),
        path: currentPath,
        type: 'error',
        error: error.message
      };
    }
  }
  
  shouldExclude(pathToCheck) {
    return this.options.excludePatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(pathToCheck);
      } else {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(pathToCheck);
      }
    });
  }
}

// Usage example
async function runDirectoryScan() {
  const scanner = new DirectoryScanner({
    maxDepth: 5,
    excludePatterns: [
      '**/.git/**',
      '**/node_modules/**',
      '**/bin/**',
      '**/obj/**'
    ],
    fileTypes: ['.md', '.docx', '.pdf', '.txt', '.html'],
    followSymlinks: false,
    verbose: true
  });
  
  try {
    const result = await scanner.scanDirectory('C:/path/to/knowledge/base');
    console.log(JSON.stringify(result.tree, null, 2));
    
    // Optionally save results to file
    await fs.promises.writeFile(
      'directory-scan-results.json',
      JSON.stringify(result, null, 2)
    );
    
    return result;
  } catch (error) {
    console.error('Directory scan failed:', error);
    return null;
  }
}
```

### Directory Scanning Issues

**Symptoms:**
- Directory scan fails or times out
- Missing files or directories in scan results
- Permission errors during scanning

**Solutions:**
1. Verify directory permissions and access rights
2. Check for path length limitations (especially on Windows)
3. Optimize scan performance for large directories
4. Implement scanning in batches or with pagination:

```javascript
// Batch directory scanner
class BatchDirectoryScanner extends DirectoryScanner {
  constructor(options = {}) {
    super(options);
    this.batchSize = options.batchSize || 1000;
    this.delayBetweenBatches = options.delayBetweenBatches || 1000; // ms
  }
  
  async scanDirectoryInBatches(rootPath) {
    console.log(`Starting batch directory scan at: ${rootPath}`);
    const startTime = Date.now();
    
    try {
      const queue = [{ path: rootPath, depth: 0 }];
      const result = {
        name: path.basename(rootPath),
        path: rootPath,
        type: 'directory',
        children: []
      };
      
      const nodeMap = new Map();
      nodeMap.set(rootPath, result);
      
      let batchCount = 0;
      
      while (queue.length > 0) {
        console.log(`Batch ${++batchCount}: Processing ${Math.min(this.batchSize, queue.length)} items (${queue.length} total in queue)`);
        
        // Process a batch of items
        const batch = queue.splice(0, this.batchSize);
        await this.processBatch(batch, queue, nodeMap);
        
        // Add a delay between batches to prevent resource exhaustion
        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
        }
      }
      
      const endTime = Date.now();
      console.log(`Batch scan completed in ${(endTime - startTime) / 1000} seconds`);
      console.log(`Batches: ${batchCount}`);
      console.log(`Directories: ${this.stats.directories}`);
      console.log(`Files: ${this.stats.files}`);
      console.log(`Errors: ${this.stats.errors}`);
      console.log(`Skipped: ${this.stats.skipped}`);
      
      return {
        tree: result,
        stats: this.stats,
        scanTime: endTime - startTime
      };
    } catch (error) {
      console.error('Batch directory scan failed:', error);
      throw error;
    }
  }
  
  async processBatch(batch, queue, nodeMap) {
    // Process batch items in parallel
    await Promise.all(batch.map(async ({ path: currentPath, depth }) => {
      // Skip if max depth reached
      if (depth > this.options.maxDepth) {
        this.stats.skipped++;
        return;
      }
      
      // Skip if path should be excluded
      if (this.shouldExclude(currentPath)) {
        this.stats.skipped++;
        return;
      }
      
      try {
        const stats = await fs.promises.stat(currentPath);
        
        if (stats.isDirectory()) {
          this.stats.directories++;
          
          // Read directory contents
          const items = await fs.promises.readdir(currentPath);
          
          // Add children to queue
          for (const item of items) {
            const itemPath = path.join(currentPath, item);
            queue.push({ path: itemPath, depth: depth + 1 });
            
            // Create node for directory
            const dirNode = {
              name: item,
              path: itemPath,
              type: 'directory',
              children: []
            };
            
            // Add to parent's children
            const parentNode = nodeMap.get(currentPath);
            if (parentNode) {
              parentNode.children.push(dirNode);
            }
            
            // Add to node map
            nodeMap.set(itemPath, dirNode);
          }
        } else if (stats.isFile()) {
          const fileType = path.extname(currentPath).toLowerCase();
          
          // Check if file type should be included
          if (this.options.fileTypes && !this.options.fileTypes.includes(fileType)) {
            this.stats.skipped++;
            return;
          }
          
          this.stats.files++;
          
          // Track file type statistics
          if (!this.stats.byType[fileType]) {
            this.stats.byType[fileType] = 0;
          }
          this.stats.byType[fileType]++;
          
          const fileName = path.basename(currentPath);
          const fileNode = {
            name: fileName,
            path: currentPath,
            type: 'file',
            size: stats.size,
            modified: stats.mtime
          };
          
          // Add to parent's children
          const parentPath = path.dirname(currentPath);
          const parentNode = nodeMap.get(parentPath);
          if (parentNode) {
            parentNode.children.push(fileNode);
          }
        }
      } catch (error) {
        console.error(`Error scanning path: ${currentPath}`, error);
        this.stats.errors++;
        
        // Add error node to parent
        const parentPath = path.dirname(currentPath);
        const parentNode = nodeMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push({
            name: path.basename(currentPath),
            path: currentPath,
            type: 'error',
            error: error.message
          });
        }
      }
    }));
  }
}
```

## Logging and Diagnostics

### Enabling Comprehensive Logging

To troubleshoot complex issues, implement comprehensive logging:

```javascript
// Logging configuration
const winston = require('winston');
require('winston-daily-rotate-file');

// Configure logger
const configureLogger = () => {
  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Define file transports
  const fileTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/bot-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: logFormat
  });

  const errorFileTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: logFormat
  });

  // Define console transport for development
  const consoleTransport = new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  });

  // Create logger with transports
  const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: { service: 'knowledge-bot' },
    transports: [
      fileTransport,
      errorFileTransport,
      consoleTransport
    ]
  });

  return logger;
};

// Create and export logger
const logger = configureLogger();

// Extend logger with categories
const extendedLogger = {
  general: logger,
  search: logger.child({ category: 'search' }),
  bot: logger.child({ category: 'bot' }),
  dialog: logger.child({ category: 'dialog' }),
  index: logger.child({ category: 'index' }),
  api: logger.child({ category: 'api' })
};

module.exports = extendedLogger;
```

### Diagnostic Tools

**Built-in Diagnostic Commands:**

The KnowledgeBaseSearchBot includes diagnostic commands that can be run directly in Teams:

```
/diagnostics status - Check overall bot status
/diagnostics search [query] - Test search functionality
/diagnostics index - Check indexing status
/diagnostics permissions - Verify current user permissions
/diagnostics clear - Clear conversation state for troubleshooting
/diagnostics version - Show bot version and configuration details
```

**Health Check Endpoint:**

The bot service provides a health check endpoint for monitoring:

```javascript
// Health check endpoint implementation
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: process.env.BOT_VERSION || '1.0.0',
      services: {
        botFramework: false,
        cognitiveSearch: false,
        storage: false
      },
      uptime: Math.floor(process.uptime())
    };
    
    // Check Bot Framework connectivity
    try {
      await checkBotFrameworkConnectivity();
      health.services.botFramework = true;
    } catch (error) {
      health.status = 'Degraded';
      health.botFrameworkError = error.message;
    }
    
    // Check Cognitive Search connectivity
    try {
      await checkSearchConnectivity();
      health.services.cognitiveSearch = true;
    } catch (error) {
      health.status = 'Degraded';
      health.searchError = error.message;
    }
    
    // Check storage connectivity
    try {
      await checkStorageConnectivity();
      health.services.storage = true;
    } catch (error) {
      health.status = 'Degraded';
      health.storageError = error.message;
    }
    
    // Return health check response
    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

async function checkBotFrameworkConnectivity() {
  // Implementation to check Bot Framework connectivity
}

async function checkSearchConnectivity() {
  // Implementation to check Cognitive Search connectivity
}

async function checkStorageConnectivity() {
  // Implementation to check storage connectivity
}
```

## Common Error Codes

| Error Code | Description | Troubleshooting Steps |
|------------|-------------|----------------------|
| **BOT-001** | Bot initialization failed | • Check environment variables<br>• Verify service dependencies<br>• Check for network connectivity issues |
| **BOT-002** | Message processing error | • Review bot logic for errors<br>• Check for malformed messages<br>• Verify activity handler implementation |
| **BOT-003** | Dialog stack error | • Check for dialog stack corruption<br>• Verify dialog step implementation<br>• Reset user conversation state if needed |
| **SEARCH-001** | Search service connection error | • Verify search endpoint URL<br>• Check API key validity<br>• Test network connectivity to search service |
| **SEARCH-002** | Query syntax error | • Check for invalid query characters<br>• Verify query preprocessing logic<br>• Test with simplified query |
| **SEARCH-003** | Search timeout error | • Check search service performance<br>• Verify query complexity<br>• Increase timeout settings if needed |
| **INDEX-001** | Indexer failure | • Check indexer run history in Azure Portal<br>• Verify data source connectivity<br>• Review document processing errors |
| **INDEX-002** | Document processing error | • Check file formats and encoding<br>• Verify content extraction settings<br>• Test with sample documents |
| **AUTH-001** | Authentication error | • Verify Azure AD app registration<br>• Check client credentials<br>• Ensure proper permission consent |
| **AUTH-002** | Authorization error | • Check user permissions<br>• Verify security trimming implementation<br>• Test with different user accounts |
| **CARD-001** | Adaptive Card rendering error | • Validate card JSON format<br>• Check for unsupported features<br>• Test in different Teams clients |

## Frequently Asked Questions

### General Issues

**Q: The bot doesn't respond to my messages in Teams**

A: This could be due to several issues:
1. Check if the bot service is running and healthy
2. Verify the Teams app is properly installed and configured
3. Check network connectivity between Teams and the bot endpoint
4. Verify message handling logic in the bot code
5. Look for errors in bot logs related to message processing

**Q: How can I restart the bot if it's not responding?**

A: To restart the bot service:
1. Access the Azure Portal
2. Navigate to the App Service resource
3. Select "Restart" from the top menu
4. Wait for the service to restart (usually takes 1-2 minutes)
5. Test the bot again in Teams

### Search Issues

**Q: Search results are not relevant to my queries**

A: To improve search relevance:
1. Check the query processing logic in the bot code
2. Review the search scoring profiles in Azure Cognitive Search
3. Adjust field weights to prioritize important content
4. Implement or refine semantic search capabilities
5. Consider adding synonym maps for common terms

**Q: Why are some documents missing from search results?**

A: Missing documents could be due to:
1. Indexing issues - check indexer status and logs
2. Permission problems - verify security filtering
3. Content format issues - ensure proper content extraction
4. Query limitations - check query syntax and filters
5. Index freshness - verify indexing frequency

### Performance Issues

**Q: The bot is slow to respond, especially for complex queries**

A: To improve performance:
1. Optimize search query construction
2. Implement query result caching
3. Scale up the Azure Cognitive Search service tier
4. Monitor and optimize bot service resource usage
5. Use Application Insights to identify bottlenecks

**Q: How can I handle increased user load?**

A: For scaling the bot service:
1. Configure auto-scaling in Azure App Service
2. Increase the instance count during peak usage times
3. Optimize resource-intensive operations
4. Implement efficient conversation state management
5. Consider premium service tiers for critical workloads

### Integration Issues

**Q: Can I integrate the bot with other systems?**

A: Yes, the KnowledgeBaseSearchBot supports integration with:
1. SharePoint document libraries
2. OneDrive for Business
3. Microsoft Graph API
4. Custom REST APIs
5. Azure DevOps and other Azure services

Implement integration using appropriate client libraries and authentication methods.

**Q: How can I extend the bot with custom functionality?**

A: The bot can be extended by:
1. Adding new dialog handlers for specialized commands
2. Implementing custom skills in the search pipeline
3. Creating new Adaptive Card templates for specific content types
4. Connecting to additional data sources
5. Implementing custom analytics and reporting

## Advanced Troubleshooting

For complex issues that aren't resolved by the solutions above, try these advanced troubleshooting techniques:

### Remote Debugging

Enable remote debugging for Node.js applications:

```javascript
// Start with debugging enabled
// NODE_OPTIONS="--inspect=0.0.0.0:9229" node app.js

// Add configuration to App Service
const inspectMode = process.env.INSPECT_MODE === 'true';
if (inspectMode) {
  require('inspector').open(9229, '0.0.0.0', true);
  console.log('Remote debugging enabled on port 9229');
}
```

### Performance Profiling

Use performance profiling to identify bottlenecks:

```javascript
// Memory usage profiling
const v8 = require('v8');
const fs = require('fs');

function captureHeapSnapshot() {
  const snapshotStream = v8.getHeapSnapshot();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `heapsnapshot-${timestamp}.heapsnapshot`;
  
  const fileStream = fs.createWriteStream(fileName);
  snapshotStream.pipe(fileStream);
  
  snapshotStream.on('end', () => {
    console.log(`Heap snapshot written to ${fileName}`);
  });
}

// Capture snapshot on demand or periodically
app.get('/admin/heapsnapshot', (req, res) => {
  captureHeapSnapshot();
  res.send('Heap snapshot capture initiated');
});
```

### Network Traffic Analysis

Implement network traffic monitoring:

```javascript
// HTTP request tracking middleware
function requestTracker(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 15);
  
  // Track request start
  console.log(`[${requestId}] Request started: ${req.method} ${req.url}`);
  
  // Track request headers
  console.log(`[${requestId}] Headers: ${JSON.stringify(req.headers)}`);
  
  // Track request body for non-GET requests
  if (req.method !== 'GET' && req.body) {
    console.log(`[${requestId}] Body: ${JSON.stringify(req.body)}`);
  }
  
  // Track response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Response completed: ${res.statusCode} (${duration}ms)`);
  };
  
  next();
}

// Apply middleware
app.use(requestTracker);
```

---

This troubleshooting guide provides a comprehensive resource for diagnosing and resolving issues with the KnowledgeBaseSearchBot. For additional assistance, contact the ACS Support Team or refer to the other documentation files in this directory.
