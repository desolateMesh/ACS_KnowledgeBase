# Knowledge Base Search Bot - Indexing Strategy

## Overview

The Knowledge Base Search Bot Indexing Strategy defines the approach for efficiently scanning, indexing, and organizing information from multiple sources to enable fast, accurate search capabilities within Microsoft Teams. This document provides comprehensive guidance on setting up and maintaining the indexing pipeline for the Knowledge Base Search Bot.

## Table of Contents

1. [Indexing Architecture](#indexing-architecture)
2. [Supported Content Sources](#supported-content-sources)
3. [Indexing Pipeline](#indexing-pipeline)
4. [Content Analysis & Processing](#content-analysis--processing)
5. [Metadata Extraction](#metadata-extraction)
6. [Security & Access Control](#security--access-control)
7. [Incremental Updates](#incremental-updates)
8. [Scheduling & Optimization](#scheduling--optimization)
9. [Monitoring & Reporting](#monitoring--reporting)
10. [Troubleshooting](#troubleshooting)
11. [Directory Tree Scanning Implementation](#directory-tree-scanning-implementation)

## Indexing Architecture

The Knowledge Base Search Bot uses a multi-tier indexing architecture to efficiently process and store searchable content:

### Components

- **Content Connectors**: Specialized modules that connect to different data sources (SharePoint, file systems, databases, etc.)
- **Content Processing Pipeline**: Extracts text, processes content, and identifies relationships
- **Index Storage Service**: Azure Search or Azure Cognitive Search service that maintains the searchable index
- **Metadata Database**: Azure SQL Database storing metadata about indexed content
- **Index Management API**: RESTful API for managing and monitoring the indexing process
- **Security & Access Control Service**: Enforces user permissions during indexing and search

### Scalability Considerations

- Horizontal scaling of indexing workers for large content repositories
- Partitioning strategies for multimillion-document knowledge bases
- Index sharding for performance optimization
- Throttling mechanisms to prevent service degradation

## Supported Content Sources

The Knowledge Base Search Bot can index content from the following sources:

### Document Repositories
- SharePoint Online document libraries
- SharePoint on-premises document libraries
- OneDrive for Business folders
- Network file shares
- Local file systems

### Collaboration Platforms
- Microsoft Teams messages and files (via Graph API)
- SharePoint sites and pages
- Confluence wikis
- Azure DevOps wikis

### Structured Data Sources
- Azure SQL databases
- Microsoft Dataverse
- SharePoint lists
- Excel files (with appropriate structure)

### Custom Sources
- REST API endpoints (with configured connectors)
- Third-party SaaS platforms (via connectors)
- Legacy document management systems

## Indexing Pipeline

The Knowledge Base Search Bot uses a sophisticated pipeline for processing content:

### 1. Discovery Phase
- Content discovery across configured sources
- File-type identification
- Change detection (modified/new/deleted content)
- Access control mapping

### 2. Extraction Phase
- Text extraction from multiple file formats
- Image and diagram OCR processing
- Table structure extraction
- Metadata harvesting

### 3. Processing Phase
- Content classification
- Entity recognition (people, locations, technologies)
- Language detection
- Content categorization
- Relationship mapping between documents

### 4. Enrichment Phase
- Synonym expansion
- Acronym identification
- Key phrase extraction
- Sentiment analysis
- Technical term detection

### 5. Indexing Phase
- Tokenization and normalization
- Index entry creation
- Relevance scoring setup
- Facet generation
- Full-text search optimization

## Content Analysis & Processing

The Knowledge Base Search Bot employs advanced techniques for content understanding:

### Text Processing
- **Language Detection**: Automatically identifies document language
- **Text Extraction**: Supports 100+ file formats including PDF, Office, images via OCR
- **Content Classification**: Categorizes content (procedure, reference, troubleshooting, etc.)
- **Summarization**: Generates document summaries for quick preview

### AI-Enhanced Analysis
- **Entity Recognition**: Identifies people, products, technologies, locations
- **Key Concept Extraction**: Identifies main topics and concepts
- **Relationship Mapping**: Builds connections between related documents
- **Intent Classification**: Identifies document purpose and use cases

### Special Content Handling
- **Code Snippet Detection**: Special handling for programming code
- **Table Extraction**: Preserves table structure for searchability
- **Diagram Analysis**: OCR and structural analysis of technical diagrams
- **Form Recognition**: Extracts structure from forms and templates

## Metadata Extraction

The bot extracts and indexes rich metadata to enhance search capabilities:

### Standard Metadata
- Creation date/time
- Last modified date/time
- Author(s)
- Title
- File size and type
- Version history (where available)

### Extended Metadata
- Document owner
- Approval status
- Review cycle information
- Compliance classification
- Department/team association
- Product/service relationship
- Geographic relevance

### Custom Metadata
- Support for custom metadata fields from source systems
- Configurable metadata extraction from document content
- Metadata inference from document context and location

## Security & Access Control

The indexing strategy incorporates robust security measures:

### Access Control Integration
- Preservation of source system security models
- Support for Azure AD security groups
- Role-based access control for index management
- Document-level security trimming

### Secure Indexing
- Encrypted content processing
- No persistent storage of sensitive content outside authorized repositories
- Secure token handling for data source access
- Audit logging of all indexing operations

### Compliance Features
- Support for content segregation (multi-tenant environments)
- Data residency controls
- Automated PII detection and handling
- GDPR compliance support

## Incremental Updates

To maintain index freshness with minimal overhead:

### Change Detection Methods
- Time-based scanning (configurable intervals)
- Event-driven updates (when supported by source)
- Change log monitoring
- Delta token management for Microsoft Graph API sources

### Optimization Strategies
- Priority-based indexing (critical content indexed first)
- Rate limiting for minimal impact on source systems
- Parallel processing of different source types
- Batched updates to improve throughput

### Update Scheduling
- Configurable full reindex schedule
- Peak/off-peak scheduling options
- Tenant-aware throttling
- Resource-aware scheduling

## Scheduling & Optimization

Detailed scheduling capabilities ensure efficient resource utilization:

### Scheduling Options
- Time-based schedules (hourly, daily, weekly)
- Event-based triggers
- Manual triggering via admin interface
- API-initiated indexing operations

### Resource Optimization
- Multi-threaded content processing
- Batch size optimization
- Connection pooling
- Incremental processing of large repositories

### Performance Tuning
- Automatic throttling based on system load
- Prioritization of high-value content sources
- Configurable resource allocation
- Caching of frequent extraction patterns

## Monitoring & Reporting

Comprehensive monitoring ensures indexing health:

### Real-time Monitoring
- Indexing job status dashboard
- Error rate monitoring
- Processing throughput metrics
- Queue depth visualization

### Reporting Capabilities
- Index coverage reports
- Processing time analytics
- Error classification and trending
- Content source health checks

### Alerting System
- Threshold-based alerts
- Failed job notifications
- System health monitoring
- Security violation alerts

## Troubleshooting

Guidelines for resolving common indexing issues:

### Common Issues and Resolutions
- Content connector authentication failures
- File format extraction errors
- Rate limiting and throttling handling
- Index corruption recovery

### Diagnostic Tools
- Indexing log analysis
- Content processing inspection tools
- Test extraction utilities
- Index verification tools

### Recovery Procedures
- Failed job restart protocols
- Partial reindexing procedures
- Index repair utilities
- Source connection recovery

## Directory Tree Scanning Implementation

The Knowledge Base Search Bot includes a robust directory tree scanning capability for file system sources. This section describes the implementation and provides code examples.

### Directory Tree Scanner Architecture

The directory scanning component uses a recursive approach to traverse directory structures, identify files, and process them for indexing. The scanner supports:

- Efficient traversal of deep directory structures
- File filtering based on extensions, patterns, and metadata
- Incremental scanning with change detection
- Parallel processing for performance optimization

### Implementation Example

Below is a simplified implementation of the directory tree scanner in C#:

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace KnowledgeBaseSearchBot.Indexing
{
    public class DirectoryTreeScanner
    {
        private readonly IndexingOptions _options;
        private readonly IContentProcessor _contentProcessor;
        private readonly ILogger _logger;

        public DirectoryTreeScanner(
            IndexingOptions options,
            IContentProcessor contentProcessor,
            ILogger logger)
        {
            _options = options ?? throw new ArgumentNullException(nameof(options));
            _contentProcessor = contentProcessor ?? throw new ArgumentNullException(nameof(contentProcessor));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<ScanResults> ScanDirectoryTreeAsync(string rootPath)
        {
            _logger.LogInformation($"Starting directory tree scan at: {rootPath}");
            
            var results = new ScanResults();
            
            if (!Directory.Exists(rootPath))
            {
                _logger.LogError($"Root path does not exist: {rootPath}");
                results.Success = false;
                results.ErrorMessage = $"Directory not found: {rootPath}";
                return results;
            }

            var startTime = DateTime.UtcNow;
            var fileCount = 0;
            var errorCount = 0;

            try
            {
                var directoryQueue = new Queue<string>();
                directoryQueue.Enqueue(rootPath);

                // Process each directory in the queue
                while (directoryQueue.Count > 0)
                {
                    var currentDirectory = directoryQueue.Dequeue();
                    
                    try
                    {
                        // Get subdirectories and add to queue
                        var subdirectories = Directory.GetDirectories(currentDirectory);
                        foreach (var subdirectory in subdirectories)
                        {
                            // Skip excluded directories
                            if (!IsExcludedDirectory(subdirectory))
                            {
                                directoryQueue.Enqueue(subdirectory);
                                results.DirectoriesScanned++;
                            }
                        }

                        // Process files in current directory
                        var files = Directory.GetFiles(currentDirectory);
                        foreach (var file in files)
                        {
                            // Skip excluded files
                            if (!IsExcludedFile(file))
                            {
                                try
                                {
                                    await ProcessFileAsync(file);
                                    fileCount++;
                                    results.FilesProcessed++;
                                }
                                catch (Exception fileEx)
                                {
                                    _logger.LogError(fileEx, $"Error processing file: {file}");
                                    errorCount++;
                                    results.FilesWithErrors++;
                                }
                            }
                        }
                    }
                    catch (Exception dirEx)
                    {
                        _logger.LogError(dirEx, $"Error accessing directory: {currentDirectory}");
                        errorCount++;
                        results.DirectoriesWithErrors++;
                    }
                }

                results.Success = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Directory tree scan failed");
                results.Success = false;
                results.ErrorMessage = ex.Message;
            }

            var endTime = DateTime.UtcNow;
            results.DurationSeconds = (endTime - startTime).TotalSeconds;
            
            _logger.LogInformation($"Directory scan completed. Processed {fileCount} files with {errorCount} errors in {results.DurationSeconds} seconds");
            
            return results;
        }

        private bool IsExcludedDirectory(string directoryPath)
        {
            var directoryName = Path.GetFileName(directoryPath);
            
            // Check against exclusion patterns
            return _options.ExcludedDirectories.Any(pattern => 
                directoryName.Equals(pattern, StringComparison.OrdinalIgnoreCase) ||
                directoryName.StartsWith(pattern, StringComparison.OrdinalIgnoreCase));
        }

        private bool IsExcludedFile(string filePath)
        {
            var fileName = Path.GetFileName(filePath);
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            
            // Check file extensions
            if (!_options.IncludedFileExtensions.Contains(extension))
                return true;
                
            // Check against exclusion patterns
            return _options.ExcludedFilePatterns.Any(pattern => 
                fileName.Contains(pattern, StringComparison.OrdinalIgnoreCase));
        }

        private async Task ProcessFileAsync(string filePath)
        {
            var fileInfo = new FileInfo(filePath);
            
            // Skip files beyond size limit
            if (fileInfo.Length > _options.MaxFileSizeBytes)
            {
                _logger.LogWarning($"Skipping file exceeding size limit: {filePath} ({fileInfo.Length} bytes)");
                return;
            }
            
            // Skip files unchanged since last scan if incremental mode
            if (_options.IncrementalScanOnly && 
                fileInfo.LastWriteTimeUtc <= _options.LastScanTime)
            {
                return;
            }
            
            // Create document metadata
            var metadata = new DocumentMetadata
            {
                FilePath = filePath,
                FileName = fileInfo.Name,
                FileSize = fileInfo.Length,
                CreationTime = fileInfo.CreationTimeUtc,
                LastModifiedTime = fileInfo.LastWriteTimeUtc,
                FileExtension = fileInfo.Extension
            };
            
            // Submit to processing pipeline
            await _contentProcessor.ProcessDocumentAsync(filePath, metadata);
        }
    }

    public class ScanResults
    {
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public int FilesProcessed { get; set; }
        public int FilesWithErrors { get; set; }
        public int DirectoriesScanned { get; set; }
        public int DirectoriesWithErrors { get; set; }
        public double DurationSeconds { get; set; }
    }
}
```

### Running a Directory Tree Scan

To run a directory tree scan with the Knowledge Base Search Bot, use the following approaches:

#### From the Admin Portal

1. Navigate to the Knowledge Base Search Bot administration portal
2. Select "Indexing" → "Content Sources"
3. Click "Add Source" and select "File System"
4. Enter the root directory path and configure scan options
5. Click "Start Scan" to begin the indexing process

#### Using PowerShell

```powershell
# Import the Knowledge Base Search Bot module
Import-Module KnowledgeBaseSearchBot

# Set scan parameters
$scanParams = @{
    RootPath = "C:\KnowledgeBase"
    IncludeExtensions = @(".docx", ".pdf", ".txt", ".md", ".html", ".xlsx")
    ExcludeDirectories = @("temp", "archive", "logs")
    MaxThreads = 4
    IncrementalScan = $true
}

# Start the scan
Start-KBSBDirectoryScan @scanParams
```

#### Using REST API

```
POST /api/v1/indexing/directory-scan
Content-Type: application/json
Authorization: Bearer <api-token>

{
  "rootPath": "C:\\KnowledgeBase",
  "includeExtensions": [".docx", ".pdf", ".txt", ".md", ".html", ".xlsx"],
  "excludeDirectories": ["temp", "archive", "logs"],
  "maxThreads": 4,
  "incrementalScan": true
}
```

### Directory Tree Command Line Tool

The Knowledge Base Search Bot includes a command-line tool for scanning directory trees and generating index data:

```bash
# Basic scan
kbsb-scan --path "C:\KnowledgeBase" --output "index-data.json"

# Incremental scan with filters
kbsb-scan --path "C:\KnowledgeBase" --include "*.docx,*.pdf,*.md" --exclude "temp/,logs/" --incremental

# Advanced options
kbsb-scan --path "C:\KnowledgeBase" --threads 8 --max-size 100MB --verbose --report-file "scan-report.txt"
```

### CSV Index Generation

The Knowledge Base Search Bot can generate a CSV index file representing the directory structure for simplified analysis and visualization:

```powershell
# Generate a CSV index file
kbsb-scan --path "C:\KnowledgeBase" --csv-index "knowledge-base-index.csv" --include-metadata
```

The generated CSV includes the following columns:
- FullPath: Complete path to the file or directory
- Name: File or directory name
- ParentPath: Path to the parent directory
- IsDirectory: Boolean indicating if entry is a directory
- FileSize: Size in bytes (for files)
- LastModified: Last modification timestamp

### Monitoring Scan Progress

During directory tree scanning, you can monitor progress through:

1. Real-time logging to console with `--verbose` option
2. Progress indicators in the admin portal
3. Status API endpoints for programmatic monitoring
4. Generated report files with detailed statistics

### Performance Optimization Tips

- Use SSD storage for the index database
- Configure appropriate thread count based on system resources
- Enable file extension filtering to skip irrelevant formats
- Schedule large scans during off-peak hours
- Implement incremental scanning for regular updates
- Use exclusion patterns for temporary and non-essential directories
- Consider network bandwidth when scanning remote file shares

### Integration with Search Service

After directory tree scanning, the indexed data is automatically integrated with the Knowledge Base Search Bot's query service, enabling immediate search capabilities for the processed content.
