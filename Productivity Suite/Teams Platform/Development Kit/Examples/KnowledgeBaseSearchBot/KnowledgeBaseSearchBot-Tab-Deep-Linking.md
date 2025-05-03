# KnowledgeBaseSearchBot Tab Deep Linking

## Overview

The KnowledgeBaseSearchBot Tab Deep Linking functionality enables seamless navigation between conversational bot interactions and the detailed search experience in the KnowledgeBaseSearchBot tab. This integration provides a cohesive knowledge discovery experience by allowing users to transition from quick bot answers to comprehensive search interfaces with preserved context. This document outlines the architecture, implementation, and best practices for tab deep linking.

## Table of Contents

1. [Deep Linking Architecture](#deep-linking-architecture)
2. [Implementation Guide](#implementation-guide)
3. [Context Preservation](#context-preservation)
4. [URL Structure and Parameters](#url-structure-and-parameters)
5. [User Experience Flow](#user-experience-flow)
6. [Security Considerations](#security-considerations)
7. [Directory Tree Integration](#directory-tree-integration)
8. [Performance Optimization](#performance-optimization)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Scenarios](#advanced-scenarios)

## Deep Linking Architecture

The deep linking system connects the KnowledgeBaseSearchBot's conversational interface with its tab interface through a specialized URL scheme and context-sharing mechanism.

### Core Components

1. **Deep Link Generator**: Creates properly formatted deep links with encoded context parameters
2. **Context Serialization Service**: Converts complex search states into URL-compatible formats
3. **Tab Context Receiver**: Processes incoming deep links and restores search context
4. **State Preservation Handler**: Maintains consistent state across bot and tab experiences

### Architectural Flow

```
┌───────────────────┐    ┌─────────────────────────┐    ┌───────────────────┐
│                   │    │                         │    │                   │
│  Bot Conversation │───►│  Deep Link Generation   │───►│  Teams Tab        │
│  Interface        │    │  & Context Encoding     │    │  Interface        │
│                   │    │                         │    │                   │
└───────────────────┘    └─────────────────────────┘    └───────────────────┘
                                      ▲                          │
                                      │                          │
                                      │                          ▼
                                      │                  ┌───────────────────┐
                                      │                  │                   │
                                      └──────────────────│  Context State    │
                                                         │  Restoration      │
                                                         │                   │
                                                         └───────────────────┘
```

### Integration Points

- **Teams Bot Framework**: For generating and sending deep links in adaptive cards
- **Teams Tab SDK**: For processing incoming deep links and state parameters
- **Azure Cognitive Search**: For preserving complex search parameters across interfaces
- **Application State Management**: For seamless context sharing between experiences

## Implementation Guide

### Bot-Side Implementation

The KnowledgeBaseSearchBot generates deep links to the tab interface when providing search results. These links preserve the current search context and user intent.

#### Deep Link Generation (Node.js)

```javascript
/**
 * Generate a deep link to the knowledge base tab with the current search context
 * @param {string} teamId - The Teams team ID
 * @param {string} channelId - The Teams channel ID 
 * @param {string} query - The user's search query
 * @param {Object} searchContext - Additional search parameters and filters
 * @returns {string} The formatted deep link URL
 */
function generateKnowledgeBaseTabDeepLink(teamId, channelId, query, searchContext = {}) {
  // Base URL for the tab
  const baseTabUrl = `https://teams.microsoft.com/l/entity/${process.env.TEAMS_APP_ID}/knowledgebase`;
  
  // Encode search context as Base64 to avoid URL character issues
  const encodedContext = Buffer.from(JSON.stringify({
    query: query,
    filters: searchContext.filters || [],
    facets: searchContext.selectedFacets || {},
    sortOrder: searchContext.sortOrder || 'relevance',
    resultsView: searchContext.resultsView || 'list',
    pageSize: searchContext.pageSize || 10,
    timestamp: new Date().toISOString()
  })).toString('base64');
  
  // Construct full deep link with context
  const deepLink = `${baseTabUrl}?context=${encodedContext}&teamId=${teamId}&channelId=${channelId}`;
  
  return deepLink;
}
```

#### Including Deep Links in Adaptive Cards

```javascript
/**
 * Create an adaptive card with search results and a deep link to the tab
 * @param {Array} searchResults - The search results to display
 * @param {string} query - The original search query
 * @param {Object} searchContext - Search context and parameters
 * @param {Object} teamInfo - Teams context information
 * @returns {Object} The adaptive card payload
 */
function createSearchResultsCard(searchResults, query, searchContext, teamInfo) {
  // Generate deep link to tab
  const deepLink = generateKnowledgeBaseTabDeepLink(
    teamInfo.teamId,
    teamInfo.channelId,
    query,
    searchContext
  );
  
  // Create adaptive card with search results and view more button
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.3',
    body: [
      {
        type: 'TextBlock',
        size: 'Medium',
        weight: 'Bolder',
        text: `Search results for "${query}"`
      },
      {
        type: 'TextBlock',
        text: `Found ${searchResults.count} results`,
        spacing: 'None'
      },
      {
        type: 'Container',
        items: searchResults.results.slice(0, 3).map(result => ({
          type: 'Container',
          style: 'emphasis',
          spacing: 'medium',
          items: [
            {
              type: 'TextBlock',
              text: result.title,
              weight: 'Bolder',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: result.snippet,
              wrap: true,
              size: 'Small'
            }
          ],
          selectAction: {
            type: 'Action.OpenUrl',
            url: result.url
          }
        }))
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View all results in Knowledge Base',
        url: deepLink
      }
    ]
  };
}
```

### Tab-Side Implementation

The KnowledgeBaseSearchBot tab parses incoming deep links and restores the search context to provide a seamless transition from the bot conversation.

#### Processing Deep Links (React.js)

```javascript
import { useEffect, useState } from 'react';
import { app, pages } from '@microsoft/teams-js';

/**
 * Hook to process deep link parameters in the Teams tab
 * @returns {Object} The extracted search context
 */
function useDeepLinkParameters() {
  const [searchContext, setSearchContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Initialize Teams SDK
    app.initialize().then(() => {
      // Get current context from Teams
      app.getContext().then(context => {
        try {
          // Extract and process deep link parameters
          const urlParams = new URLSearchParams(window.location.search);
          const encodedContext = urlParams.get('context');
          
          if (encodedContext) {
            // Decode the Base64 context parameter
            const decodedContext = JSON.parse(
              Buffer.from(encodedContext, 'base64').toString('utf-8')
            );
            
            // Set the decoded search context
            setSearchContext(decodedContext);
          } else {
            // No deep link context found, use default empty state
            setSearchContext({
              query: '',
              filters: [],
              facets: {},
              sortOrder: 'relevance',
              resultsView: 'list',
              pageSize: 10
            });
          }
          
          setIsLoading(false);
        } catch (e) {
          setError('Error processing deep link parameters');
          setIsLoading(false);
          console.error('Deep link processing error:', e);
        }
      });
    }).catch(err => {
      setError('Error initializing Teams app');
      setIsLoading(false);
      console.error('Teams initialization error:', err);
    });
  }, []);
  
  return { searchContext, isLoading, error };
}

// Example usage in a Tab component
function KnowledgeBaseSearchTab() {
  const { searchContext, isLoading, error } = useDeepLinkParameters();
  
  if (isLoading) {
    return <div>Loading search context...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div className="search-tab">
      <SearchHeader query={searchContext.query} />
      <SearchFilters 
        selectedFacets={searchContext.facets} 
        activeFilters={searchContext.filters} 
      />
      <SearchResults 
        initialQuery={searchContext.query}
        initialFilters={searchContext.filters}
        sortOrder={searchContext.sortOrder}
        viewType={searchContext.resultsView}
      />
    </div>
  );
}
```

## Context Preservation

The deep linking system preserves several types of context when transitioning from the bot to the tab interface:

### Preserved Context Elements

1. **Search Query**: The original user question or search terms
2. **Filters**: Any applied constraints that narrow search results
3. **Selected Facets**: User-selected category refinements
4. **Sort Order**: The chosen result ordering (relevance, date, etc.)
5. **Result View**: The preferred visualization of results (list, grid, etc.)
6. **Page Size**: Number of results displayed per page
7. **Position**: Where in a result set the user was viewing
8. **Conversation History**: Optional context from previous exchanges

### Context Serialization

Complex search contexts are serialized in a compact format to fit within URL length constraints:

```javascript
/**
 * Serialize complex search context into a compact URL-friendly format
 * @param {Object} searchContext - The full search context object
 * @returns {string} Base64 encoded compact representation
 */
function serializeSearchContext(searchContext) {
  // Create minimal representation with abbreviated keys
  const compactContext = {
    q: searchContext.query,                     // Query
    f: compactifyFilters(searchContext.filters), // Filters (compressed)
    fc: Object.entries(searchContext.facets)     // Selected facets
      .reduce((acc, [key, value]) => {
        acc[key.substring(0, 2)] = value;       // Use abbreviation for keys
        return acc;
      }, {}),
    s: searchContext.sortOrder.charAt(0),       // Sort (r=relevance, d=date, etc.)
    v: searchContext.resultsView.charAt(0),     // View (l=list, g=grid, etc.)
    p: searchContext.pageSize,                  // Page size
    i: searchContext.startIndex || 0            // Start index
  };
  
  // Convert to JSON and encode as Base64
  return Buffer.from(JSON.stringify(compactContext)).toString('base64');
}

/**
 * Compactify filter expressions to reduce size
 * @param {Array} filters - Array of filter objects
 * @returns {Array} Compressed filter representation
 */
function compactifyFilters(filters) {
  // Use abbreviated syntax for common filters
  return filters.map(filter => {
    // Abbreviate field names and operators
    const fieldAbbr = abbreviateFieldName(filter.field);
    const opAbbr = abbreviateOperator(filter.operator);
    
    // Return compact [field, operator, value] array
    return [fieldAbbr, opAbbr, filter.value];
  });
}
```

## URL Structure and Parameters

The deep link URL structure follows a standardized format to ensure consistent interpretation:

### Deep Link URL Format

```
https://teams.microsoft.com/l/entity/{appId}/knowledgebase?context={encodedContext}&teamId={teamId}&channelId={channelId}
```

### Core Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `appId` | The Teams app ID for the KnowledgeBaseSearchBot | `"1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p"` |
| `context` | Base64-encoded search context | `"eyJxIjoicGFzc3dvcmQgcG9saWN5IiwiZiI6W1sicCI..."` |
| `teamId` | The Microsoft Teams team ID | `"19:1234567890abcdef@thread.tacv2"` |
| `channelId` | The Microsoft Teams channel ID | `"19:abcdef1234567890@thread.tacv2"` |

### Context Parameter Structure

The decoded `context` parameter contains a JSON object with the following structure:

```json
{
  "query": "password policy",
  "filters": [
    { "field": "documentType", "operator": "eq", "value": "policy" }
  ],
  "facets": {
    "department": ["IT", "Security"],
    "contentType": ["Documentation"]
  },
  "sortOrder": "relevance",
  "resultsView": "list",
  "pageSize": 10,
  "timestamp": "2023-04-15T10:30:45.123Z"
}
```

## User Experience Flow

The deep linking system creates a seamless experience for users transitioning between the bot and tab interfaces.

### Bot to Tab Flow

1. **Conversation Initiation**: User asks a question to the bot in a Teams chat or channel
2. **Bot Response**: Bot provides a concise answer with a subset of search results
3. **Deep Link Presentation**: Bot includes a "View in Knowledge Base" button with deep link
4. **User Activation**: User clicks the deep link button
5. **Tab Navigation**: Teams opens the Knowledge Base tab with preserved context
6. **Context Restoration**: Tab loads with the same search query, filters, and state
7. **Expanded Experience**: User sees full search results with additional filtering options

### Example User Journey

1. User in Teams channel: *"@KnowledgeBot what's our password policy?"*
2. Bot responds with: *"Our password policy requires a minimum of 12 characters including at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character. Passwords must be changed every 90 days and cannot match any of the previous 10 passwords. [View full policy in Knowledge Base]"*
3. User clicks "View full policy in Knowledge Base"
4. Teams tab opens with:
   - Search query pre-filled with "password policy"
   - Results filtered to policy documents
   - IT Security department facet pre-selected
   - Full result set displayed with additional filtering options

## Security Considerations

### Context Parameter Validation

The tab application must validate all incoming context parameters to prevent injection attacks:

```javascript
/**
 * Validate incoming context parameters for security
 * @param {Object} context - The decoded context object
 * @returns {Object} Sanitized context object
 */
function validateContextParameters(context) {
  const sanitized = {
    // Validate and sanitize query (prevent script injection)
    query: context.query ? sanitizeText(context.query).substring(0, 200) : '',
    
    // Validate filters (only allow known fields and operators)
    filters: Array.isArray(context.filters) 
      ? context.filters
          .filter(f => isValidFilterField(f.field) && isValidFilterOperator(f.operator))
          .map(f => ({
            field: sanitizeText(f.field),
            operator: sanitizeText(f.operator),
            value: sanitizeFilterValue(f.value)
          }))
      : [],
    
    // Validate facets (only allow known facet fields)
    facets: context.facets && typeof context.facets === 'object'
      ? Object.entries(context.facets)
          .filter(([key]) => isValidFacetField(key))
          .reduce((acc, [key, value]) => {
            acc[sanitizeText(key)] = Array.isArray(value) 
              ? value.map(v => sanitizeText(v))
              : [];
            return acc;
          }, {})
      : {},
    
    // Validate other parameters (use defaults if invalid)
    sortOrder: isValidSortOrder(context.sortOrder) 
      ? context.sortOrder 
      : 'relevance',
    
    resultsView: isValidResultsView(context.resultsView)
      ? context.resultsView
      : 'list',
    
    pageSize: isValidPageSize(context.pageSize)
      ? parseInt(context.pageSize, 10)
      : 10
  };
  
  return sanitized;
}
```

### Deep Link Authentication

The tab must verify that the incoming deep link is from an authorized source:

```javascript
/**
 * Verify that the deep link comes from an authorized source
 * @param {Object} context - The Teams context object
 * @param {string} teamId - The team ID from the URL
 * @param {string} channelId - The channel ID from the URL
 * @returns {boolean} Whether the deep link is authorized
 */
function verifyDeepLinkSource(context, teamId, channelId) {
  // Verify the Teams context matches the URL parameters
  if (context.teamId !== teamId) {
    console.warn('Team ID mismatch in deep link');
    return false;
  }
  
  if (channelId && context.channelId !== channelId) {
    console.warn('Channel ID mismatch in deep link');
    return false;
  }
  
  // Check if deep link timestamp is recent (prevent replay attacks)
  const timestamp = context.timestamp ? new Date(context.timestamp) : null;
  if (timestamp) {
    const now = new Date();
    const differenceInMinutes = (now - timestamp) / (1000 * 60);
    
    if (differenceInMinutes > 60) {
      console.warn('Deep link timestamp is too old');
      return false;
    }
  }
  
  return true;
}
```

## Directory Tree Integration

The KnowledgeBaseSearchBot Tab Deep Linking functionality includes specialized capabilities for navigating and searching directory tree structures. This allows users to seamlessly transition from conversation to browsing hierarchical data repositories.

### Directory Tree Navigation

The deep linking system includes parameters specifically for directory tree navigation:

```javascript
/**
 * Generate a deep link to a specific directory in the knowledge base
 * @param {string} directoryPath - The path to the directory
 * @param {Object} teamInfo - Teams context information
 * @returns {string} The formatted deep link URL
 */
function generateDirectoryTreeDeepLink(directoryPath, teamInfo) {
  // Base URL for the tab
  const baseTabUrl = `https://teams.microsoft.com/l/entity/${process.env.TEAMS_APP_ID}/knowledgebase`;
  
  // Encode context with directory navigation info
  const encodedContext = Buffer.from(JSON.stringify({
    viewType: 'directoryTree',
    path: directoryPath,
    expandedNodes: [directoryPath],
    timestamp: new Date().toISOString()
  })).toString('base64');
  
  // Construct full deep link
  return `${baseTabUrl}?context=${encodedContext}&teamId=${teamInfo.teamId}&channelId=${teamInfo.channelId}`;
}
```

### Directory Tree Visualization

When following a directory tree deep link, the tab can render a specialized tree visualization:

```javascript
/**
 * Render a directory tree visualization based on deep link parameters
 * @param {string} rootPath - The root directory path
 * @param {Array} expandedNodes - Array of paths to expanded nodes
 * @returns {JSX.Element} The directory tree component
 */
function DirectoryTreeView({ rootPath, expandedNodes = [] }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch directory tree data
    fetchDirectoryTree(rootPath)
      .then(data => {
        setTreeData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching directory tree:', error);
        setLoading(false);
      });
  }, [rootPath]);
  
  if (loading) {
    return <div>Loading directory structure...</div>;
  }
  
  if (!treeData) {
    return <div>Error loading directory structure</div>;
  }
  
  return (
    <div className="directory-tree-container">
      <h2>Directory: {rootPath}</h2>
      <DirectoryTreeComponent 
        data={treeData} 
        expandedNodes={expandedNodes}
        onNodeSelect={handleNodeSelect}
      />
    </div>
  );
}
```

### Running a Directory Tree Scan

The Knowledge Base tab includes functionality to scan and display directory structures:

```javascript
/**
 * Scan a directory tree and generate indexable content
 * @param {string} rootPath - The root directory to scan
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} The directory tree structure
 */
async function scanDirectoryTree(rootPath, options = {}) {
  try {
    console.log(`Starting directory tree scan at: ${rootPath}`);
    
    const defaultOptions = {
      maxDepth: 10,
      includeFiles: true,
      includeDirectories: true,
      includeHidden: false,
      includeStats: true,
      fileExtensions: ['.docx', '.pdf', '.txt', '.md', '.xlsx', '.pptx', '.html'],
      excludePatterns: ['node_modules', 'temp', '.git']
    };
    
    const scanOptions = { ...defaultOptions, ...options };
    
    // Start scanning from root path
    const result = await recursiveScan(rootPath, 0, scanOptions);
    
    console.log(`Directory scan complete. Found ${result.stats.files} files in ${result.stats.directories} directories`);
    
    return result;
  } catch (error) {
    console.error('Directory scan failed:', error);
    throw error;
  }
}

/**
 * Recursively scan a directory
 * @param {string} path - The current path to scan
 * @param {number} depth - The current depth in the tree
 * @param {Object} options - Scan options
 * @returns {Promise<Object>} The directory subtree
 */
async function recursiveScan(path, depth, options) {
  // Check depth limit
  if (depth > options.maxDepth) {
    return null;
  }
  
  const stats = {
    files: 0,
    directories: 0,
    totalSize: 0
  };
  
  try {
    // Read directory contents
    const entries = await fs.promises.readdir(path, { withFileTypes: true });
    
    // Process directories and files
    const children = [];
    
    for (const entry of entries) {
      const childPath = `${path}/${entry.name}`;
      
      // Skip hidden files if configured
      if (!options.includeHidden && entry.name.startsWith('.')) {
        continue;
      }
      
      // Skip excluded patterns
      if (options.excludePatterns.some(pattern => 
        entry.name.includes(pattern) || childPath.includes(pattern)
      )) {
        continue;
      }
      
      if (entry.isDirectory()) {
        stats.directories++;
        
        if (options.includeDirectories) {
          // Recursively scan subdirectory
          const subtree = await recursiveScan(
            childPath, 
            depth + 1, 
            options
          );
          
          if (subtree) {
            children.push({
              name: entry.name,
              path: childPath,
              type: 'directory',
              children: subtree.children
            });
            
            // Aggregate stats from subdirectory
            stats.files += subtree.stats.files;
            stats.directories += subtree.stats.directories;
            stats.totalSize += subtree.stats.totalSize;
          }
        }
      } else if (entry.isFile()) {
        // Check file extension if filter is active
        const ext = path.extname(entry.name).toLowerCase();
        if (options.fileExtensions.length > 0 && 
            !options.fileExtensions.includes(ext)) {
          continue;
        }
        
        stats.files++;
        
        if (options.includeFiles) {
          let fileInfo = {
            name: entry.name,
            path: childPath,
            type: 'file',
            extension: ext
          };
          
          // Add file stats if requested
          if (options.includeStats) {
            const fileStat = await fs.promises.stat(childPath);
            fileInfo.size = fileStat.size;
            fileInfo.created = fileStat.birthtime;
            fileInfo.modified = fileStat.mtime;
            
            stats.totalSize += fileStat.size;
          }
          
          children.push(fileInfo);
        }
      }
    }
    
    return {
      children: children.sort((a, b) => {
        // Sort directories first, then alphabetically
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      }),
      stats
    };
  } catch (error) {
    console.error(`Error scanning directory ${path}:`, error);
    return {
      children: [],
      stats,
      error: error.message
    };
  }
}
```

### Generating Directory Tree CSV Index

The tab interface can generate a CSV index of the directory structure for download or further processing:

```javascript
/**
 * Generate a CSV index from the directory tree structure
 * @param {Object} directoryTree - The directory tree object
 * @returns {string} CSV formatted index
 */
function generateDirectoryCsvIndex(directoryTree) {
  // CSV headers
  let csv = 'FullPath,Name,ParentPath,IsDirectory,FileSize,LastModified\n';
  
  // Process tree recursively
  function processNode(node, parentPath) {
    // Skip if no node
    if (!node) return;
    
    // Add entry for current node
    const isDirectory = node.type === 'directory';
    const size = isDirectory ? '' : (node.size || '');
    const modified = node.modified ? node.modified.toISOString() : '';
    
    csv += `"${node.path}","${node.name}","${parentPath}",${isDirectory},${size},"${modified}"\n`;
    
    // Process children recursively
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        processNode(child, node.path);
      }
    }
  }
  
  // Start processing from root
  processNode(directoryTree, '');
  
  return csv;
}
```

### Directory Tree Command-Line Interface

The KnowledgeBaseSearchBot includes a command-line interface for scanning directory trees and generating indexes:

```bash
# Basic directory tree scan
kbsb-scan --path "C:\KnowledgeBase" --output "directory-index.json"

# Generate CSV index
kbsb-scan --path "C:\KnowledgeBase" --format csv --output "directory-index.csv"

# Advanced scan with filters
kbsb-scan --path "C:\KnowledgeBase" --max-depth 5 --include "*.docx,*.pdf,*.md" 
          --exclude "temp/,drafts/" --stats --output "filtered-index.json"

# Generate deep link URL
kbsb-scan --path "C:\KnowledgeBase" --generate-deep-link --team-id "team123" --channel-id "channel456"
```

## Performance Optimization

### Deep Link Size Optimization

To ensure deep links remain under URL length limits (typically 2048 characters), several optimization techniques are employed:

1. **Context Compression**: Abbreviating field names and using compact data structures
2. **Selective Context**: Including only essential parameters needed for state restoration
3. **Base64 Efficiency**: Using URL-safe Base64 encoding without padding
4. **Content Referencing**: Storing complex state server-side and including only reference IDs in links

### Memory Management

The tab application uses efficient memory practices when handling deep link context:

```javascript
/**
 * Efficiently process large directory structures in batches to avoid memory issues
 * @param {Object} directoryData - The directory tree data
 * @param {number} batchSize - Number of nodes to process per batch
 * @returns {Promise<void>}
 */
async function processBatchedDirectoryTree(directoryData, batchSize = 100) {
  // Use a queue to process nodes in batches
  const nodeQueue = [directoryData];
  let processedCount = 0;
  
  while (nodeQueue.length > 0) {
    // Process a batch of nodes
    const batchNodes = nodeQueue.splice(0, batchSize);
    
    // Process each node in the batch
    for (const node of batchNodes) {
      await processNode(node);
      processedCount++;
      
      // Queue children for processing
      if (node.children && node.children.length > 0) {
        nodeQueue.push(...node.children);
      }
    }
    
    // Allow UI to update and garbage collection to occur
    await new Promise(resolve => setTimeout(resolve, 0));
    
    console.log(`Processed ${processedCount} nodes, ${nodeQueue.length} remaining`);
  }
}
```

## Troubleshooting

### Common Deep Linking Issues

| Issue | Possible Causes | Resolution |
|-------|----------------|------------|
| Deep link does not open tab | Invalid app ID in URL | Verify app ID matches Teams app manifest |
| Context parameters missing | URL truncation or encoding error | Ensure context is properly Base64 encoded and check URL length limits |
| Search context not restored | Context processing error | Check browser console for parsing errors |
| Permission errors | User lacks access to tab or content | Validate user permissions before generating deep links |
| Broken navigation flow | Tab app structure changed | Update deep link generation to match current tab routing |

### Debugging Deep Links

To debug deep link issues, use the following approach:

1. **Enable Debug Mode**:
   ```javascript
   // Add to tab initialization
   if (urlParams.has('debug')) {
     console.log('Deep Link Debug Mode Enabled');
     console.log('Raw context parameter:', urlParams.get('context'));
     try {
       const decodedContext = JSON.parse(
         Buffer.from(urlParams.get('context'), 'base64').toString('utf-8')
       );
       console.log('Decoded context:', decodedContext);
     } catch (e) {
       console.error('Context decoding error:', e);
     }
   }
   ```

2. **Test with Simplified Context**:
   Create test links with minimal context to isolate issues:
   ```
   https://teams.microsoft.com/l/entity/{appId}/knowledgebase?context=eyJxIjoidGVzdCJ9&teamId={teamId}
   ```

3. **Validate URL Length**:
   Ensure deep links remain under URL length limits:
   ```javascript
   const deepLink = generateDeepLink(context, teamInfo);
   if (deepLink.length > 2048) {
     console.warn(`Deep link exceeds recommended length: ${deepLink.length} chars`);
     // Fall back to simplified link
     return generateSimplifiedDeepLink(context, teamInfo);
   }
   ```

## Advanced Scenarios

### Cross-Tab Navigation

The KnowledgeBaseSearchBot supports deep linking between different tabs for specialized workflows:

```javascript
/**
 * Generate a deep link to a specific tab within the app
 * @param {string} tabId - The target tab ID
 * @param {Object} context - The context to preserve
 * @param {Object} teamInfo - Teams context information
 * @returns {string} The formatted deep link URL
 */
function generateCrossTabDeepLink(tabId, context, teamInfo) {
  const baseTabUrl = `https://teams.microsoft.com/l/entity/${process.env.TEAMS_APP_ID}/${tabId}`;
  
  const encodedContext = Buffer.from(JSON.stringify({
    ...context,
    sourceTab: 'knowledgebase',
    timestamp: new Date().toISOString()
  })).toString('base64');
  
  return `${baseTabUrl}?context=${encodedContext}&teamId=${teamInfo.teamId}&channelId=${teamInfo.channelId}`;
}
```

### Personalized Deep Links

Create user-specific deep links that incorporate user preferences and history:

```javascript
/**
 * Generate a personalized deep link based on user preferences
 * @param {string} userId - The user's ID
 * @param {string} query - The search query
 * @param {Object} teamInfo - Teams context information
 * @returns {Promise<string>} The personalized deep link
 */
async function generatePersonalizedDeepLink(userId, query, teamInfo) {
  // Fetch user preferences
  const preferences = await getUserPreferences(userId);
  
  // Fetch user's recent searches
  const recentSearches = await getUserRecentSearches(userId);
  
  // Create personalized context
  const context = {
    query,
    defaultFilters: preferences.defaultFilters || [],
    preferredView: preferences.preferredView || 'list',
    preferredSortOrder: preferences.preferredSortOrder || 'relevance',
    pageSize: preferences.pageSize || 10,
    recentSearches: recentSearches.slice(0, 5), // Include 5 most recent searches
    timestamp: new Date().toISOString()
  };
  
  // Generate deep link with personalized context
  return generateKnowledgeBaseTabDeepLink(
    teamInfo.teamId,
    teamInfo.channelId,
    query,
    context
  );
}
```

### Multi-Step Deep Linking

Support guided workflows that navigate through multiple tabs with preserved context:

```javascript
/**
 * Create a workflow navigation sequence with deep links
 * @param {Array} steps - The workflow steps
 * @param {Object} context - The shared context
 * @param {Object} teamInfo - Teams context information
 * @returns {Array} Array of deep links for the workflow
 */
function createWorkflowDeepLinks(steps, context, teamInfo) {
  return steps.map((step, index) => {
    // Add workflow progression metadata to context
    const stepContext = {
      ...context,
      workflowId: context.workflowId || uuidv4(),
      currentStep: index + 1,
      totalSteps: steps.length,
      stepName: step.name
    };
    
    // Generate appropriate deep link based on step type
    switch (step.type) {
      case 'search':
        return generateKnowledgeBaseTabDeepLink(
          teamInfo.teamId,
          teamInfo.channelId,
          step.query,
          stepContext
        );
      case 'directory':
        return generateDirectoryTreeDeepLink(
          step.path,
          teamInfo,
          stepContext
        );
      case 'document':
        return generateDocumentViewDeepLink(
          step.documentId,
          teamInfo,
          stepContext
        );
      default:
        return null;
    }
  }).filter(Boolean); // Remove any null links
}
```

By implementing these deep linking capabilities, the KnowledgeBaseSearchBot creates a seamless, context-preserving experience for users as they navigate between conversation and comprehensive search interfaces.
