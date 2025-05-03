# KnowledgeBaseSearchBot Overview

## Introduction

The KnowledgeBaseSearchBot is a powerful Microsoft Teams bot designed to provide quick and efficient access to your organization's knowledge base. By leveraging Azure Cognitive Search and natural language processing, this bot allows users to query and retrieve information from multiple document sources through a conversational interface directly within Teams.

## Key Features

- **Natural Language Queries**: Users can ask questions in plain language, and the bot interprets and processes these queries intelligently.
- **Multi-Source Search**: Search across multiple document repositories including SharePoint, OneDrive, file shares, and custom databases.
- **Adaptive Card Responses**: Results are presented in rich, interactive Adaptive Cards for optimal readability and user experience.
- **Context-Aware Results**: The bot maintains conversation context to improve search relevance and follow-up questions.
- **Tab Integration**: Seamless integration with a companion Teams tab for advanced search and filtering capabilities.
- **Analytics Dashboard**: Track usage patterns, popular queries, and success rates to continuously improve the knowledge base.
- **Role-Based Access Control**: Respect existing permissions and security boundaries when retrieving information.
- **Proactive Suggestions**: Intelligent recommendations based on user activity and current context.

## Architecture Overview

The KnowledgeBaseSearchBot is built on a modern, scalable architecture that integrates several Azure services:

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

## User Experience

The KnowledgeBaseSearchBot provides a seamless and intuitive experience for end users:

### Conversation Flow

1. **Query Initiation**: Users @mention the bot in a channel or send a direct message with their query.
2. **Query Processing**: The bot processes the natural language query, extracting key entities and intent.
3. **Search Execution**: The query is transformed into an optimized search against the knowledge base index.
4. **Result Presentation**: Top results are formatted into an Adaptive Card with relevant snippets and source links.
5. **Follow-up Interaction**: Users can refine their search, ask for more details, or navigate to related topics.

### Example Interactions

**Basic Query**
```
User: @KnowledgeBaseBot What's our password reset policy?
Bot: [Adaptive Card with policy information and links to relevant documents]
```

**Follow-up Question**
```
User: How long do the new passwords need to be?
Bot: [Adaptive Card with password requirements and reference to security standards]
```

**Specific Document Request**
```
User: @KnowledgeBaseBot Find the Q1 sales report
Bot: [Adaptive Card with matching reports and preview information]
```

## Directory Structure

The KnowledgeBaseSearchBot can be used to scan and index various directory structures. Here's how to run a directory tree scan:

```javascript
// Example directory tree scan configuration
const scanConfig = {
  rootPaths: [
    '/path/to/knowledge/base',
    '/path/to/documentation'
  ],
  fileTypes: ['.md', '.docx', '.pdf', '.txt', '.html'],
  excludePatterns: ['**/temp/**', '**/private/**'],
  maxDepth: 10,
  followSymlinks: false
};

// Initialize the scanner
const scanner = new KBDirectoryScanner(scanConfig);

// Run the scan
scanner.scan()
  .then(results => {
    console.log(`Scanned ${results.totalFiles} files in ${results.directories.length} directories`);
    console.log(`Found ${results.indexableContent.length} files with indexable content`);
  })
  .catch(error => {
    console.error('Scan failed:', error);
  });
```

## Configuration Options

The KnowledgeBaseSearchBot is highly configurable to meet your organization's specific needs:

### Bot Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `name` | The name of the bot shown to users | "Knowledge Assistant" |
| `welcomeMessage` | Message shown when first interacting with the bot | "Hi! I can help you find information..." |
| `helpMessage` | Message shown when user requests help | "You can ask me questions about..." |
| `unknownQueryMessage` | Message shown when no results are found | "I couldn't find information about..." |
| `maxResults` | Maximum number of results to return | 5 |
| `suggestionsEnabled` | Whether to show related query suggestions | true |
| `feedbackEnabled` | Whether to collect user feedback on results | true |

### Search Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `searchEndpoint` | Azure Cognitive Search endpoint URL | Required |
| `searchKey` | Azure Cognitive Search API key | Required |
| `indexName` | Name of the search index | "knowledge-index" |
| `queryTimeout` | Timeout for search queries in seconds | 30 |
| `fuzzySearchEnabled` | Whether to enable fuzzy matching | true |
| `semanticSearchEnabled` | Whether to enable semantic search capabilities | true |
| `boostParameters` | Fields and boost values for relevance tuning | See documentation |
| `synonymMaps` | Custom synonym maps for query expansion | [] |

## Performance Considerations

The KnowledgeBaseSearchBot is designed for enterprise-scale deployments with performance optimization in several key areas:

### Response Time

- Typical query response time: 0.5-2 seconds
- Factors affecting performance:
  - Index size and complexity
  - Query complexity
  - Number of concurrent users
  - Azure service tier

### Scalability

- Supports knowledge bases up to 100GB+ of source content
- Handles 100+ concurrent users with proper configuration
- Horizontal scaling through Azure Bot Service

### Caching

- Result caching for common queries to improve response time
- Configurable cache expiration settings
- User-specific cache isolation

## Security and Compliance

The KnowledgeBaseSearchBot implements several security measures to protect sensitive information:

- **Authentication**: Azure AD integration for user authentication
- **Authorization**: Respects source system permissions (SharePoint, OneDrive, etc.)
- **Data Protection**: No persistent storage of search results beyond caching period
- **Audit Logging**: Comprehensive logging of all bot interactions
- **Compliance**: GDPR, HIPAA, and other compliance frameworks supported with proper configuration

## Deployment Prerequisites

Before deploying the KnowledgeBaseSearchBot, ensure you have:

1. **Microsoft 365 Tenant** with Teams enabled
2. **Azure Subscription** for hosting bot services
3. **Azure Cognitive Search** service (Standard tier or above recommended)
4. **App Registration** in Azure AD for bot authentication
5. **Bot Framework Registration** in Azure
6. **SSL Certificates** for secure communication

## Related Documentation

- [KnowledgeBaseSearchBot-Deployment-Guide.md](./KnowledgeBaseSearchBot-Deployment-Guide.md)
- [KnowledgeBaseSearchBot-Indexing-Strategy.md](./KnowledgeBaseSearchBot-Indexing-Strategy.md)
- [KnowledgeBaseSearchBot-Query-Optimization.md](./KnowledgeBaseSearchBot-Query-Optimization.md)
- [KnowledgeBaseSearchBot-Adaptive-Card-Response-Examples.md](./KnowledgeBaseSearchBot-Adaptive-Card-Response-Examples.md)
- [KnowledgeBaseSearchBot-Tab-Deep-Linking.md](./KnowledgeBaseSearchBot-Tab-Deep-Linking.md)
- [KnowledgeBaseSearchBot-Troubleshooting.md](./KnowledgeBaseSearchBot-Troubleshooting.md)

## Sample Implementation Code

Below is a simplified example of the core search handling logic:

```javascript
// Sample bot dialog for handling search queries
const { CardFactory } = require('botbuilder');
const { SearchIndexClient, AzureKeyCredential } = require('@azure/search-documents');

class SearchDialog {
  constructor(config) {
    this.searchClient = new SearchIndexClient(
      config.searchEndpoint,
      config.indexName,
      new AzureKeyCredential(config.searchKey)
    );
  }

  async handleSearchQuery(context, query) {
    try {
      // Process the natural language query
      const processedQuery = this.preprocessQuery(query);
      
      // Execute search
      const searchResults = await this.searchClient.search(processedQuery, {
        select: ['id', 'title', 'content', 'documentUrl', 'lastModified', 'author'],
        top: 5,
        queryType: 'semantic',
        semanticConfiguration: 'default',
        highlightFields: 'content',
        includeTotalCount: true
      });
      
      // Transform results into adaptive card
      const resultCard = this.createResultsCard(searchResults);
      
      // Send response
      await context.sendActivity({ 
        attachments: [CardFactory.adaptiveCard(resultCard)]
      });
      
      // Log the interaction
      this.logSearchInteraction(context, query, searchResults);
      
    } catch (error) {
      console.error('Search error:', error);
      await context.sendActivity('I encountered an error while searching. Please try again.');
    }
  }
  
  preprocessQuery(query) {
    // Implement query preprocessing logic
    // - Remove stopwords
    // - Extract entities
    // - Apply synonyms
    // - Format for search API
    return query;
  }
  
  createResultsCard(searchResults) {
    // Create adaptive card with search results
    // Implementation details in KnowledgeBaseSearchBot-Adaptive-Card-Response-Examples.md
    return resultCardJson;
  }
  
  logSearchInteraction(context, query, results) {
    // Log interaction for analytics
    // - User information
    // - Query text
    // - Results returned
    // - Timestamp
  }
}

module.exports.SearchDialog = SearchDialog;
```

## Advanced Features

### Conversation Context Tracking

The bot maintains conversation context to improve follow-up questions:

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

### Knowledge Graph Integration

The bot can leverage a knowledge graph for enhanced understanding:

```javascript
class KnowledgeGraphEnhancer {
  constructor(graphEndpoint, graphKey) {
    this.graphEndpoint = graphEndpoint;
    this.graphKey = graphKey;
  }
  
  async enhanceQuery(query, userContext) {
    // Connect query to knowledge graph entities
    const graphResults = await this.queryKnowledgeGraph(query);
    
    // Enhance original query with graph insights
    return this.constructEnhancedQuery(query, graphResults, userContext);
  }
  
  async queryKnowledgeGraph(query) {
    // Implementation of knowledge graph query
    // Returns relevant entities and relationships
  }
  
  constructEnhancedQuery(originalQuery, graphResults, userContext) {
    // Combine original query with graph insights
    // Consider user context for personalization
    return enhancedQuery;
  }
}
```

## Best Practices for Knowledge Base Structure

To optimize the performance and effectiveness of the KnowledgeBaseSearchBot, follow these best practices for structuring your knowledge base:

1. **Clear Document Organization**: Maintain a logical folder hierarchy that reflects your organization's structure.

2. **Consistent Naming Conventions**: Adopt standardized file naming patterns for easier categorization and identification.

3. **Metadata Enrichment**: Add comprehensive metadata to all documents, including:
   - Document type/category
   - Ownership information
   - Creation and review dates
   - Target audience
   - Content tags

4. **Content Formatting**:
   - Use clear headings and subheadings
   - Include concise summaries at the beginning of documents
   - Structure content with lists and tables where appropriate
   - Maintain consistent terminology

5. **Regular Content Reviews**:
   - Implement scheduled reviews of knowledge base content
   - Archive or update outdated information
   - Track content freshness and relevance

## Support and Feedback

For issues, enhancement requests, or questions about the KnowledgeBaseSearchBot, contact the ACS Support Team or submit requests through the internal support system.

The development team actively monitors usage patterns and search analytics to continuously improve the bot's capabilities.
