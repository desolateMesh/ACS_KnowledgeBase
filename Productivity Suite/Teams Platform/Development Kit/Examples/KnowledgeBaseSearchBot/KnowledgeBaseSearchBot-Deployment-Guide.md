# KnowledgeBaseSearchBot Deployment Guide

## Introduction

This guide provides comprehensive instructions for deploying and configuring the KnowledgeBaseSearchBot in Microsoft Teams. The KnowledgeBaseSearchBot is a powerful tool that enables users to search across your organization's knowledge base using natural language queries directly within Teams. With advanced Azure Cognitive Search integration, this bot delivers relevant information quickly and efficiently.

## Prerequisites

Before beginning the deployment process, ensure you have the following:

### Required Resources

- **Microsoft 365 Tenant** with Teams enabled
- **Azure Subscription** with administrative access
- **Azure Cognitive Search** service (Standard tier or above recommended)
- **Bot Framework registration** in the Azure portal
- **App Registration** in Azure AD for bot authentication
- **SSL Certificate** for secure endpoints

### Required Tools

- **Azure CLI** (latest version)
- **Bot Framework CLI** (`npm install -g @microsoft/botframework-cli`)
- **Git** for source control
- **Node.js 16.x** or later (if deploying with JavaScript)
- **.NET 6.0 SDK** or later (if deploying with C#)
- **Visual Studio 2022** or **Visual Studio Code** with Bot Framework extension

### Required Permissions

- **Azure Administrator** or equivalent role
- **Microsoft Teams Administrator** for app deployment
- **Application Developer** role in Azure AD
- **Owner** or **Contributor** role on the Azure resource group

## Architecture Overview

The KnowledgeBaseSearchBot consists of several integrated components:

```
┌─────────────────────┐       ┌───────────────────┐       ┌─────────────────────┐
│                     │       │                   │       │                     │
│  Microsoft Teams    │───────│  Azure Bot        │───────│  Bot Logic          │
│  (Client Interface) │       │  Framework        │       │  (Node.js/C#)       │
│                     │       │                   │       │                     │
└─────────────────────┘       └───────────────────┘       └──────────┬──────────┘
                                                                      │
                                                                      │
                                                                      ▼
┌─────────────────────┐       ┌───────────────────┐       ┌─────────────────────┐
│                     │       │                   │       │                     │
│  Document           │───────│  Azure Cognitive  │◄──────│  Query Processing   │
│  Repositories       │       │  Search           │       │  & NLP Pipeline     │
│                     │       │                   │       │                     │
└─────────────────────┘       └───────────────────┘       └─────────────────────┘
```

### Key Components

1. **Teams Client Interface**: Where users interact with the bot
2. **Azure Bot Framework**: Manages the bot registration and channel connections
3. **Bot Logic**: The core application that processes requests and returns responses
4. **Query Processing**: Natural language processing to optimize search queries
5. **Azure Cognitive Search**: Indexes and searches the knowledge base content
6. **Document Repositories**: Sources of content including SharePoint, OneDrive, file shares, etc.

## Deployment Process

### 1. Azure Resources Setup

First, create the necessary Azure resources using either the Azure Portal or Azure CLI.

#### Azure CLI Method

```bash
# Login to Azure
az login

# Create a resource group
az group create --name "kb-search-bot-rg" --location "eastus"

# Create a Cognitive Search service (Standard tier)
az search service create --name "kb-search-service" --resource-group "kb-search-bot-rg" --sku "standard"

# Get the Cognitive Search admin key
az search admin-key show --service-name "kb-search-service" --resource-group "kb-search-bot-rg"

# Create an App Service plan
az appservice plan create --name "kb-search-bot-plan" --resource-group "kb-search-bot-rg" --sku S1

# Create a Web App for the bot
az webapp create --name "kb-search-bot-app" --resource-group "kb-search-bot-rg" --plan "kb-search-bot-plan"

# Create Bot Channels Registration
az bot create --name "kb-search-bot" --resource-group "kb-search-bot-rg" --kind registration --endpoint "https://kb-search-bot-app.azurewebsites.net/api/messages" --sku F0
```

#### Azure Portal Method

1. **Create Resource Group**:
   - Navigate to Resource Groups in Azure Portal
   - Click "Create resource group"
   - Enter name (e.g., "kb-search-bot-rg") and select region
   - Click "Review + create" then "Create"

2. **Create Cognitive Search Service**:
   - In the Azure Portal, click "Create a resource"
   - Search for "Azure Cognitive Search" and select it
   - Complete the required fields:
     - Subscription: Your subscription
     - Resource group: The group created above
     - Service name: "kb-search-service" (must be globally unique)
     - Location: Your preferred region
     - Pricing tier: Standard (recommended)
   - Click "Review + create" then "Create"
   - After deployment, navigate to the service and note the admin key from "Keys" section

3. **Create App Service Plan and Web App**:
   - In the Azure Portal, click "Create a resource"
   - Search for "Web App" and select it
   - Complete the required fields:
     - Resource Group: The group created above
     - Name: "kb-search-bot-app" (must be globally unique)
     - Publish: Code
     - Runtime stack: .NET 6 (LTS) or Node 16 (based on your implementation)
     - Operating System: Windows or Linux (as per your requirements)
     - Region: Your preferred region
     - App Service Plan: Create new, Standard S1 tier
   - Click "Review + create" then "Create"

4. **Create Bot Registration**:
   - In the Azure Portal, click "Create a resource"
   - Search for "Azure Bot" and select it
   - Complete the required fields:
     - Bot handle: "kb-search-bot"
     - Subscription: Your subscription
     - Resource group: The group created above
     - Pricing tier: F0 (Free)
     - Microsoft App ID: Create new
     - Creation type: Use existing app registration
   - Click "Review + create" then "Create"
   - After deployment, navigate to the Channel settings and set the messaging endpoint to: `https://kb-search-bot-app.azurewebsites.net/api/messages`

### 2. Application Configuration

#### 2.1 Configure Azure Cognitive Search

1. **Create Search Index**:
   - Navigate to your Azure Cognitive Search service in the Azure Portal
   - Select "Indexes" → "Add index"
   - Configure the index with the following fields:

     | Field Name | Type | Attributes |
     |------------|------|------------|
     | id | Edm.String | Key, Retrievable |
     | title | Edm.String | Retrievable, Searchable, Filterable |
     | content | Edm.String | Retrievable, Searchable |
     | documentUrl | Edm.String | Retrievable |
     | lastModified | Edm.DateTimeOffset | Retrievable, Filterable, Sortable |
     | author | Edm.String | Retrievable, Searchable, Filterable |
     | fileType | Edm.String | Retrievable, Filterable |
     | category | Edm.String | Retrievable, Filterable, Facetable |
     | tags | Collection(Edm.String) | Retrievable, Filterable, Facetable |

   - Configure Analyzers:
     - For the title and content fields, use the "Microsoft English Analyzer" for improved search quality
     - Configure synonyms if appropriate for your organization's terminology

2. **Create Data Source**:
   - If indexing from SharePoint or another specific source, create a data source connector
   - Go to "Data sources" → "Add data source"
   - Select your data source type (SharePoint Online, Blob Storage, etc.)
   - Follow the connection setup wizard and provide necessary credentials
   - Configure synchronization schedule if using a built-in indexer

#### 2.2 Configure Bot Application

1. **Clone the Bot Repository**:
   ```bash
   git clone https://github.com/your-organization/knowledge-base-search-bot.git
   cd knowledge-base-search-bot
   ```

2. **Update Configuration**:
   - For .NET application, modify `appsettings.json`:
   ```json
   {
     "MicrosoftAppId": "<your-bot-app-id>",
     "MicrosoftAppPassword": "<your-bot-app-password>",
     "SearchServiceName": "kb-search-service",
     "SearchApiKey": "<your-search-api-key>",
     "SearchIndexName": "knowledge-index",
     "MaxResults": 5,
     "FuzzySearchEnabled": true,
     "SemanticSearchEnabled": true,
     "LogLevel": "Information"
   }
   ```

   - For Node.js application, modify `.env` file:
   ```
   MicrosoftAppId=<your-bot-app-id>
   MicrosoftAppPassword=<your-bot-app-password>
   SearchServiceName=kb-search-service
   SearchApiKey=<your-search-api-key>
   SearchIndexName=knowledge-index
   MaxResults=5
   FuzzySearchEnabled=true
   SemanticSearchEnabled=true
   LogLevel=information
   ```

3. **Build and Test Locally**:
   - For .NET:
   ```bash
   dotnet build
   dotnet run
   ```

   - For Node.js:
   ```bash
   npm install
   npm start
   ```

   - Use the Bot Framework Emulator to test the bot before deployment:
     - Connect to `http://localhost:3978/api/messages`
     - Enter your Microsoft App ID and Password
     - Test various search queries

### 3. Bot Deployment

#### 3.1 Deploy to Azure App Service

1. **Prepare for Deployment**:
   - For .NET:
   ```bash
   dotnet publish -c Release -o ./publish
   ```

   - For Node.js:
   ```bash
   # Make sure engines is set in package.json
   # "engines": { "node": "16.x" }
   ```

2. **Deploy Using Azure CLI**:
   - For .NET:
   ```bash
   az webapp deployment source config-zip --resource-group "kb-search-bot-rg" --name "kb-search-bot-app" --src ./publish.zip
   ```

   - For Node.js:
   ```bash
   # Set Node.js version
   az webapp config appsettings set --resource-group "kb-search-bot-rg" --name "kb-search-bot-app" --settings WEBSITE_NODE_DEFAULT_VERSION=16.14.2

   # Deploy using Git
   az webapp deployment source config-local-git --resource-group "kb-search-bot-rg" --name "kb-search-bot-app"
   
   # Get deployment credentials
   az webapp deployment list-publishing-credentials --resource-group "kb-search-bot-rg" --name "kb-search-bot-app"
   
   # Add remote and push
   git remote add azure <publishing-url-from-previous-command>
   git push azure main
   ```

3. **Configure App Settings in Azure**:
   ```bash
   az webapp config appsettings set --resource-group "kb-search-bot-rg" --name "kb-search-bot-app" --settings \
   "MicrosoftAppId=<your-bot-app-id>" \
   "MicrosoftAppPassword=<your-bot-app-password>" \
   "SearchServiceName=kb-search-service" \
   "SearchApiKey=<your-search-api-key>" \
   "SearchIndexName=knowledge-index" \
   "MaxResults=5" \
   "FuzzySearchEnabled=true" \
   "SemanticSearchEnabled=true" \
   "LogLevel=Information"
   ```

4. **Verify Deployment**:
   - Check if the bot is running by navigating to: `https://kb-search-bot-app.azurewebsites.net/api/health` (if you implemented a health endpoint)
   - Use the Bot Framework Emulator to test the deployed bot by connecting to: `https://kb-search-bot-app.azurewebsites.net/api/messages`

#### 3.2 Configure Channels

1. **Enable Teams Channel**:
   - In the Azure Portal, navigate to your Bot resource
   - Go to "Channels" section
   - Click on the Microsoft Teams icon
   - Accept the terms and click "Save"

2. **Create Microsoft Teams App Manifest**:
   - Create a `manifest.json` file:
   ```json
   {
     "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
     "manifestVersion": "1.11",
     "version": "1.0.0",
     "id": "<your-bot-app-id>",
     "packageName": "com.yourcompany.knowledgebasebot",
     "developer": {
       "name": "Your Company Name",
       "websiteUrl": "https://www.yourcompany.com",
       "privacyUrl": "https://www.yourcompany.com/privacy",
       "termsOfUseUrl": "https://www.yourcompany.com/terms"
     },
     "icons": {
       "color": "color.png",
       "outline": "outline.png"
     },
     "name": {
       "short": "Knowledge Base",
       "full": "Knowledge Base Search Bot"
     },
     "description": {
       "short": "Search your knowledge base directly in Teams",
       "full": "This bot helps you find information from your organization's knowledge base using natural language queries directly within Microsoft Teams."
     },
     "accentColor": "#FFFFFF",
     "bots": [
       {
         "botId": "<your-bot-app-id>",
         "scopes": ["personal", "team", "groupchat"],
         "supportsFiles": false,
         "isNotificationOnly": false,
         "commandLists": [
           {
             "scopes": ["personal", "team", "groupchat"],
             "commands": [
               {
                 "title": "help",
                 "description": "Show help information"
               },
               {
                 "title": "search",
                 "description": "Search the knowledge base"
               },
               {
                 "title": "recent",
                 "description": "Show recent documents"
               }
             ]
           }
         ]
       }
     ],
     "permissions": ["identity", "messageTeamMembers"],
     "validDomains": [
       "*.azurewebsites.net",
       "*.botframework.com"
     ]
   }
   ```

3. **Create and Upload App Package**:
   - Create a ZIP file containing:
     - manifest.json
     - color.png (192x192 pixels)
     - outline.png (32x32 pixels)
   - In Microsoft Teams, go to "Apps" → "Manage your apps" → "Upload an app"
   - Select "Upload a custom app" and upload your ZIP file
   - Follow the prompts to complete the installation

### 4. Knowledge Base Indexing

#### 4.1 Directory Tree Scan

The KnowledgeBaseSearchBot can scan and index various directory structures. Configure and run a directory tree scan using the following steps:

1. **Configure Directory Scanner**:
   - Create a configuration file `scanConfig.json`:
   ```json
   {
     "rootPaths": [
       "/path/to/knowledge/base",
       "/path/to/documentation"
     ],
     "fileTypes": [".md", ".docx", ".pdf", ".txt", ".html"],
     "excludePatterns": ["**/temp/**", "**/private/**"],
     "maxDepth": 10,
     "followSymlinks": false,
     "outputPath": "./scan-results.json"
   }
   ```

2. **Run Directory Tree Scan**:
   - Using Node.js:
   ```javascript
   // directory-scanner.js
   const fs = require('fs');
   const path = require('path');
   const { KBDirectoryScanner } = require('./lib/kb-scanner');

   // Load configuration
   const scanConfig = JSON.parse(fs.readFileSync('scanConfig.json', 'utf8'));

   // Initialize scanner
   const scanner = new KBDirectoryScanner(scanConfig);

   // Run scan
   scanner.scan()
     .then(results => {
       console.log(`Scanned ${results.totalFiles} files in ${results.directories.length} directories`);
       console.log(`Found ${results.indexableContent.length} files with indexable content`);
       
       // Save results
       fs.writeFileSync(
         scanConfig.outputPath || 'scan-results.json',
         JSON.stringify(results, null, 2)
       );
     })
     .catch(error => {
       console.error('Scan failed:', error);
       process.exit(1);
     });
   ```

   - Run the scanner:
   ```bash
   node directory-scanner.js
   ```

3. **Index the Scanned Content**:
   - Process the scan results and upload to Azure Cognitive Search:
   ```javascript
   // index-content.js
   const fs = require('fs');
   const { SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');
   const { TextAnalyticsClient } = require('@azure/ai-text-analytics');

   // Load environment variables
   require('dotenv').config();

   // Load scan results
   const scanResults = JSON.parse(fs.readFileSync('scan-results.json', 'utf8'));

   // Initialize search client
   const searchClient = new SearchIndexClient(
     `https://${process.env.SearchServiceName}.search.windows.net`,
     process.env.SearchIndexName,
     new AzureKeyCredential(process.env.SearchApiKey)
   );

   // Initialize document client
   const documentClient = searchClient.getDocumentClient();

   // Process and upload documents in batches
   async function indexDocuments() {
     const documents = scanResults.indexableContent.map(item => ({
       id: item.id || generateId(item.path),
       title: item.title || path.basename(item.path),
       content: item.content,
       documentUrl: item.path.startsWith('http') ? item.path : `file://${item.path}`,
       lastModified: item.modifiedDate || new Date().toISOString(),
       author: item.author || 'Unknown',
       fileType: path.extname(item.path).substring(1),
       category: determineCategory(item.path),
       tags: item.tags || []
     }));

     // Process in batches of 1000 (Azure Cognitive Search limit)
     const batchSize = 1000;
     for (let i = 0; i < documents.length; i += batchSize) {
       const batch = documents.slice(i, i + batchSize);
       try {
         console.log(`Indexing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(documents.length / batchSize)}`);
         await documentClient.uploadDocuments(batch);
       } catch (error) {
         console.error(`Error indexing batch: ${error.message}`);
       }
     }

     console.log(`Indexed ${documents.length} documents successfully`);
   }

   // Helper functions
   function generateId(path) {
     return Buffer.from(path).toString('base64');
   }

   function determineCategory(path) {
     // Implement categorization logic based on your folder structure
     if (path.includes('/policies/')) return 'Policy';
     if (path.includes('/procedures/')) return 'Procedure';
     if (path.includes('/guides/')) return 'Guide';
     return 'General';
   }

   // Run indexing
   indexDocuments().catch(error => {
     console.error('Indexing failed:', error);
     process.exit(1);
   });
   ```

   - Run the indexer:
   ```bash
   node index-content.js
   ```

4. **Verify Indexing**:
   - Go to your Azure Cognitive Search service in the Azure Portal
   - Navigate to the "Indexes" section and select your index
   - Click "Search explorer" and run some test queries
   - Verify that your content is searchable and returns expected results

#### 4.2 Custom Document Processing Pipeline

For more advanced document processing, implement a custom pipeline:

1. **Extract Text and Metadata**:
   ```javascript
   // Example for PDF processing
   const pdf = require('pdf-parse');
   
   async function processPdfFile(filePath) {
     const dataBuffer = fs.readFileSync(filePath);
     const data = await pdf(dataBuffer);
     
     return {
       content: data.text,
       metadata: {
         title: data.info.Title || path.basename(filePath),
         author: data.info.Author || 'Unknown',
         creationDate: data.info.CreationDate,
         pageCount: data.numpages
       }
     };
   }
   ```

2. **Implement Content Enrichment**:
   ```javascript
   // Example using Azure Text Analytics for key phrase extraction
   async function enrichContent(content) {
     const textAnalyticsClient = new TextAnalyticsClient(
       `https://${process.env.TextAnalyticsEndpoint}.cognitiveservices.azure.com/`,
       new AzureKeyCredential(process.env.TextAnalyticsKey)
     );
     
     // Extract key phrases
     const keyPhraseResult = await textAnalyticsClient.extractKeyPhrases([{ id: "1", text: content }]);
     const keyPhrases = keyPhraseResult[0].keyPhrases;
     
     // Detect language
     const languageResult = await textAnalyticsClient.detectLanguage([{ id: "1", text: content }]);
     const language = languageResult[0].primaryLanguage.name;
     
     return {
       content: content,
       keyPhrases: keyPhrases,
       language: language
     };
   }
   ```

## Security Considerations

### Authentication and Authorization

1. **Bot Authentication**:
   - Store MicrosoftAppId and MicrosoftAppPassword securely
   - Use Azure Key Vault for production deployments
   ```csharp
   // Example of Key Vault integration in .NET
   public static async Task<BotConfiguration> LoadFromKeyVaultAsync()
   {
       var keyVaultUrl = Environment.GetEnvironmentVariable("KeyVaultUrl");
       var credential = new DefaultAzureCredential();
       var secretClient = new SecretClient(new Uri(keyVaultUrl), credential);
       
       var appId = await secretClient.GetSecretAsync("MicrosoftAppId");
       var appPassword = await secretClient.GetSecretAsync("MicrosoftAppPassword");
       var searchApiKey = await secretClient.GetSecretAsync("SearchApiKey");
       
       return new BotConfiguration
       {
           MicrosoftAppId = appId.Value.Value,
           MicrosoftAppPassword = appPassword.Value.Value,
           SearchApiKey = searchApiKey.Value.Value,
           // Other config properties
       };
   }
   ```

2. **Content Security**:
   - Implement role-based access control to restrict content visibility
   - Define security filters in search queries
   ```javascript
   // Example of security filtering in search query
   async function searchWithUserContext(query, userGroups) {
     return await searchClient.search(query, {
       filter: `${userGroups.map(g => `security/groups eq '${g}'`).join(' or ')}`,
       select: ["id", "title", "content", "documentUrl"],
       top: 5
     });
   }
   ```

### Data Protection

1. **Secure Communication**:
   - Ensure all endpoints use HTTPS
   - Configure TLS 1.2 or higher
   - Set secure cookie flags

2. **Content Filtering**:
   - Implement content filtering to exclude sensitive information
   - Use Azure Cognitive Services Content Moderator for automated filtering

3. **Audit Logging**:
   ```javascript
   // Example audit logging implementation
   function logSearchActivity(userId, query, results) {
     const logEntry = {
       timestamp: new Date().toISOString(),
       userId: userId,
       query: query,
       resultCount: results.length,
       resultIds: results.map(r => r.id),
       clientIp: request.headers['x-forwarded-for'] || request.connection.remoteAddress
     };
     
     // Log to Application Insights
     telemetryClient.trackEvent("SearchQuery", logEntry);
     
     // Optionally log to database for compliance purposes
     dbClient.collection('auditLogs').insertOne(logEntry);
   }
   ```

## Monitoring and Analytics

### Application Insights Integration

1. **Setup Application Insights**:
   ```bash
   # Create Application Insights resource
   az monitor app-insights component create --app "kb-search-bot-insights" --location "eastus" --resource-group "kb-search-bot-rg" --application-type web
   
   # Get instrumentation key
   az monitor app-insights component show --app "kb-search-bot-insights" --resource-group "kb-search-bot-rg" --query instrumentationKey -o tsv
   ```

2. **Integrate with Bot Application**:
   - For .NET:
   ```csharp
   // In Startup.cs
   services.AddApplicationInsightsTelemetry();
   
   // In Bot implementation
   public class KnowledgeBaseBot : ActivityHandler
   {
       private readonly TelemetryClient _telemetryClient;
       
       public KnowledgeBaseBot(TelemetryClient telemetryClient)
       {
           _telemetryClient = telemetryClient;
       }
       
       protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
       {
           // Track custom events
           _telemetryClient.TrackEvent("MessageReceived", new Dictionary<string, string>
           {
               { "text", turnContext.Activity.Text },
               { "channel", turnContext.Activity.ChannelId },
               { "userId", turnContext.Activity.From.Id }
           });
           
           // Bot logic
           await ProcessSearchQueryAsync(turnContext, cancellationToken);
       }
       
       // Other methods...
   }
   ```

   - For Node.js:
   ```javascript
   // Add to index.js
   const appInsights = require('applicationinsights');
   
   appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
     .setAutoDependencyCorrelation(true)
     .setAutoCollectRequests(true)
     .setAutoCollectPerformance(true)
     .setAutoCollectExceptions(true)
     .setAutoCollectDependencies(true)
     .setAutoCollectConsole(true)
     .setUseDiskRetryCaching(true)
     .start();
   ```

3. **Custom Logging**:
   ```javascript
   // Track search effectiveness
   function trackSearchEffectiveness(query, results, userFeedback) {
     const telemetryClient = appInsights.defaultClient;
     
     telemetryClient.trackMetric({
       name: "SearchResultCount", 
       value: results.length
     });
     
     telemetryClient.trackEvent({
       name: "SearchQuery",
       properties: {
         query: query,
         resultCount: results.length,
         topResultId: results.length > 0 ? results[0].id : null,
         userFeedback: userFeedback
       }
     });
     
     // Track query processing time
     telemetryClient.trackMetric({
       name: "QueryProcessingTime",
       value: processingTimeMs
     });
   }
   ```

### Dashboard and Reporting

1. **Create Custom Dashboard in Azure Portal**:
   - Navigate to your Application Insights resource
   - Go to "Dashboards" and create a new dashboard
   - Add charts for:
     - Query volume by time
     - Top search queries
     - Average response time
     - Success/failure rates
     - User satisfaction scores

2. **Setup Email Reports**:
   - Configure scheduled exports in Application Insights
   - Set up Power BI integration for advanced analytics

## Troubleshooting

### Common Issues and Solutions

1. **Bot Not Responding**:
   - Verify the bot service is running (`https://kb-search-bot-app.azurewebsites.net/api/health`)
   - Check Application Insights for exceptions
   - Verify Microsoft App ID and Password are correctly configured
   - Check the messaging endpoint in the Bot registration

2. **Search Not Working**:
   - Verify Azure Cognitive Search service is active
   - Check search API key permissions
   - Verify index exists and contains documents
   - Test search query directly in Search Explorer

3. **Performance Issues**:
   - Check App Service plan tier (consider scaling up)
   - Optimize search queries with proper fields and filters
   - Implement caching for frequent queries
   - Use pagination for large result sets

### Diagnostic Logging

Enhance your logging for better troubleshooting:

```javascript
// Configure logging levels
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LogLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'bot.log' })
  ]
});

// Usage
logger.info('Bot initialized', { appId: process.env.MicrosoftAppId });
logger.error('Search failed', { query: query, error: error.message, stack: error.stack });
```

## Advanced Configuration

### Conversation Context Management

Implement conversation context tracking to support follow-up questions:

```javascript
class ConversationContextManager {
  constructor() {
    // Initialize conversation state storage
    this.conversationState = new Map();
  }
  
  updateContext(userId, query, results) {
    // Update the context for a specific user
    if (!this.conversationState.has(userId)) {
      this.conversationState.set(userId, {
        recentQueries: [],
        entityContext: new Map(),
        lastResults: null
      });
    }
    
    const userContext = this.conversationState.get(userId);
    
    // Update recent queries (keep last 5)
    userContext.recentQueries.unshift(query);
    if (userContext.recentQueries.length > 5) {
      userContext.recentQueries.pop();
    }
    
    // Extract and update entity context
    const entities = this.extractEntities(query);
    entities.forEach(entity => {
      userContext.entityContext.set(entity.type, entity.value);
    });
    
    // Store last results
    userContext.lastResults = results;
  }
  
  getContext(userId) {
    return this.conversationState.get(userId) || null;
  }
  
  extractEntities(query) {
    // Implementation of entity extraction
    // Returns array of {type, value} objects
    return [];
  }
}
```

### Search Enhancement Options

1. **Synonym Maps**:
   - Create a synonym map in Azure Cognitive Search
   ```json
   {
     "name": "business-synonyms",
     "synonyms": [
       "KPI, key performance indicator, performance metric",
       "ROI, return on investment",
       "P&L, profit and loss, income statement"
     ]
   }
   ```

2. **Boosting Important Content**:
   - Implement boosting in search queries
   ```javascript
   const searchOptions = {
     searchText: query,
     searchFields: ["title^3", "content", "tags^2"],
     select: ["id", "title", "content", "documentUrl"],
     top: 5,
     queryType: "full"
   };
   ```

3. **Semantic Search**:
   - Enable semantic ranking for improved natural language understanding
   ```javascript
   const searchOptions = {
     searchText: query,
     queryType: "semantic",
     semanticConfiguration: "default",
     top: 5
   };
   ```

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Index Refresh**:
   - Schedule regular index updates to capture new content
   - Implement incremental indexing for efficiency
   - Setup monitoring for index freshness

2. **Bot Framework Updates**:
   - Subscribe to Bot Framework release notes
   - Test updates in a staging environment before production
   - Maintain backward compatibility

3. **Security Patches**:
   - Enable automatic updates for App Service
   - Regularly review and update dependencies
   - Perform security scans

### Backup and Recovery

1. **Regular Backups**:
   - Backup Azure Cognitive Search index definitions
   - Backup bot configuration and customizations
   - Document settings and custom code

2. **Disaster Recovery Plan**:
   - Create a documented recovery procedure
   - Setup geo-replication for critical resources
   - Schedule periodic recovery drills

## Conclusion

The KnowledgeBaseSearchBot provides a powerful way for Teams users to access your organization's knowledge base through natural language queries. By following this deployment guide, you have set up a scalable, secure, and high-performance search solution that integrates seamlessly with Microsoft Teams.

For further assistance, refer to the following resources:

- [KnowledgeBaseSearchBot-Overview.md](./KnowledgeBaseSearchBot-Overview.md)
- [KnowledgeBaseSearchBot-Indexing-Strategy.md](./KnowledgeBaseSearchBot-Indexing-Strategy.md)
- [KnowledgeBaseSearchBot-Query-Optimization.md](./KnowledgeBaseSearchBot-Query-Optimization.md)
- [KnowledgeBaseSearchBot-Adaptive-Card-Response-Examples.md](./KnowledgeBaseSearchBot-Adaptive-Card-Response-Examples.md)
- [KnowledgeBaseSearchBot-Tab-Deep-Linking.md](./KnowledgeBaseSearchBot-Tab-Deep-Linking.md)
- [KnowledgeBaseSearchBot-Troubleshooting.md](./KnowledgeBaseSearchBot-Troubleshooting.md)

## Appendix

### Directory Tree Structure

To view the complete directory structure of your knowledge base, use the following command:

```bash
# Using PowerShell
Get-ChildItem -Path "C:\path\to\knowledge\base" -Recurse | Select-Object FullName, LastWriteTime, Length | Export-Csv -Path "directory-tree.csv" -NoTypeInformation

# Using Bash
find /path/to/knowledge/base -type f -printf "%p,%T@,%s\n" > directory-tree.csv
```

For a more structured analysis, implement a recursive directory scanning function:

```javascript
// directory-tree.js
const fs = require('fs');
const path = require('path');

function scanDirectory(rootPath, options = {}) {
  const defaultOptions = {
    maxDepth: Infinity,
    excludePatterns: [],
    includeFiles: true,
    includeDirectories: true,
    followSymlinks: false
  };
  
  const opts = { ...defaultOptions, ...options };
  const result = { directories: [], files: [] };
  
  function isExcluded(p) {
    return opts.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(p);
    });
  }
  
  function scan(currentPath, depth = 0) {
    if (depth > opts.maxDepth) return;
    if (isExcluded(currentPath)) return;
    
    const stats = fs.statSync(currentPath);
    const isSymlink = fs.lstatSync(currentPath).isSymbolicLink();
    
    if (isSymlink && !opts.followSymlinks) return;
    
    if (stats.isDirectory()) {
      if (opts.includeDirectories) {
        result.directories.push({
          path: currentPath,
          name: path.basename(currentPath),
          modifiedDate: stats.mtime
        });
      }
      
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        scan(path.join(currentPath, item), depth + 1);
      });
    } else if (stats.isFile() && opts.includeFiles) {
      result.files.push({
        path: currentPath,
        name: path.basename(currentPath),
        extension: path.extname(currentPath),
        size: stats.size,
        modifiedDate: stats.mtime
      });
    }
  }
  
  scan(rootPath);
  return result;
}

// Example usage
const directoryTree = scanDirectory('C:/path/to/knowledge/base', {
  maxDepth: 10,
  excludePatterns: ['**/node_modules/**', '**/.git/**'],
  followSymlinks: false
});

console.log(`Found ${directoryTree.directories.length} directories and ${directoryTree.files.length} files`);
fs.writeFileSync('directory-tree.json', JSON.stringify(directoryTree, null, 2));
```

This comprehensive deployment guide provides all the necessary information to successfully deploy and maintain the KnowledgeBaseSearchBot in your Microsoft Teams environment.
