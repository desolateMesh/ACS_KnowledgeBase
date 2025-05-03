# Knowledge Base Search Bot: Adaptive Card Response Examples

## Overview

This document provides comprehensive examples of Adaptive Card responses used in the Knowledge Base Search Bot. Adaptive Cards are used to present search results, display information, and provide interactive elements for users to navigate the knowledge base efficiently within Microsoft Teams.

## Table of Contents

- [Basic Structure](#basic-structure)
- [Response Types](#response-types)
  - [Search Results Response](#search-results-response)
  - [Article Detail Response](#article-detail-response)
  - [No Results Found Response](#no-results-found-response)
  - [Suggested Articles Response](#suggested-articles-response)
  - [Error Response](#error-response)
- [Interactive Elements](#interactive-elements)
  - [Pagination Controls](#pagination-controls)
  - [Filtering Options](#filtering-options)
  - [Category Navigation](#category-navigation)
  - [Feedback Mechanism](#feedback-mechanism)
- [Advanced Response Templates](#advanced-response-templates)
  - [Rich Media Response](#rich-media-response)
  - [Multi-section Response](#multi-section-response)
  - [Deep-linked Content Response](#deep-linked-content-response)
- [Implementation Guidelines](#implementation-guidelines)
  - [Accessibility Considerations](#accessibility-considerations)
  - [Performance Optimization](#performance-optimization)
  - [Responsive Design](#responsive-design)
- [Card Schemas](#card-schemas)
- [Running a Directory Tree](#running-a-directory-tree)

## Basic Structure

All Knowledge Base Search Bot Adaptive Cards follow a consistent structure for user familiarity and ease of navigation.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Knowledge Base Search Results",
          "weight": "bolder",
          "size": "medium",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Results for query: '${searchQuery}'",
          "isSubtle": true,
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "id": "resultsContainer",
      "items": []
    }
  ],
  "actions": []
}
```

## Response Types

### Search Results Response

When a user submits a search query, the bot returns a list of relevant articles from the knowledge base using this card structure.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Knowledge Base Search Results",
          "weight": "bolder",
          "size": "medium"
        },
        {
          "type": "TextBlock",
          "text": "Found 5 results for 'azure update manager'",
          "isSubtle": true
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Filter by:",
                  "wrap": true
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "Input.ChoiceSet",
                  "id": "categoryFilter",
                  "style": "compact",
                  "choices": [
                    {
                      "title": "All Categories",
                      "value": "all"
                    },
                    {
                      "title": "Azure",
                      "value": "azure"
                    },
                    {
                      "title": "Windows",
                      "value": "windows"
                    },
                    {
                      "title": "Office 365",
                      "value": "office365"
                    }
                  ],
                  "value": "all"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "Container",
      "separator": true,
      "items": [
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Article:",
              "value": "Azure Update Manager Overview"
            },
            {
              "title": "Category:",
              "value": "Azure > Management"
            },
            {
              "title": "Last Updated:",
              "value": "2024-10-15"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Comprehensive guide to Azure Update Manager, including setup, configuration, and best practices for managing updates across your Azure resources.",
          "wrap": true
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "View Article",
              "url": "https://internal.company.com/kb/azure-update-manager-overview"
            },
            {
              "type": "Action.Submit",
              "title": "Get Summary",
              "data": {
                "id": "AZ-UPDATE-0023",
                "action": "getSummary"
              }
            }
          ]
        }
      ]
    },
    // Additional result items would follow the same pattern
    {
      "type": "Container",
      "separator": true,
      "items": [
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Article:",
              "value": "Scheduling Updates with Azure Update Manager"
            },
            {
              "title": "Category:",
              "value": "Azure > Management"
            },
            {
              "title": "Last Updated:",
              "value": "2024-09-22"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Learn how to create and manage update schedules for your Azure resources using Azure Update Manager.",
          "wrap": true
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "View Article",
              "url": "https://internal.company.com/kb/scheduling-updates-azure-update-manager"
            },
            {
              "type": "Action.Submit",
              "title": "Get Summary",
              "data": {
                "id": "AZ-UPDATE-0024",
                "action": "getSummary"
              }
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Next Page",
      "data": {
        "action": "nextPage",
        "currentPage": 1,
        "query": "azure update manager"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Refine Search",
      "data": {
        "action": "refineSearch"
      }
    }
  ]
}
```

### Article Detail Response

When a user clicks on an article from the search results, a detailed view of the article is displayed.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Azure Update Manager Overview",
          "weight": "bolder",
          "size": "large",
          "wrap": true
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Category:",
              "value": "Azure > Management"
            },
            {
              "title": "Last Updated:",
              "value": "2024-10-15"
            },
            {
              "title": "Author:",
              "value": "Cloud Services Team"
            },
            {
              "title": "Article ID:",
              "value": "AZ-UPDATE-0023"
            }
          ]
        },
        {
          "type": "TextBlock",
          "text": "Overview",
          "weight": "bolder",
          "size": "medium",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Azure Update Manager provides a unified update management solution for your Azure VMs, Azure Arc-enabled servers, and on-premises servers. This service allows you to assess the status of available updates, schedule deployments, and review deployment results to verify updates are successfully applied across your hybrid environment.",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Key Features",
          "weight": "bolder",
          "size": "medium",
          "wrap": true
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Centralized Management:",
              "value": "Single pane of glass for managing updates across hybrid environments"
            },
            {
              "title": "Maintenance Windows:",
              "value": "Schedule updates during specific time windows to minimize disruption"
            },
            {
              "title": "Dynamic Grouping:",
              "value": "Create groups of machines based on tags, location, or other properties"
            },
            {
              "title": "Compliance Reporting:",
              "value": "Track update compliance across your environment"
            },
            {
              "title": "Integration:",
              "value": "Works with Azure Automation and Azure Policy"
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Open Full Article",
      "url": "https://internal.company.com/kb/azure-update-manager-overview"
    },
    {
      "type": "Action.Submit",
      "title": "Back to Results",
      "data": {
        "action": "backToResults",
        "query": "azure update manager"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Mark as Helpful",
      "data": {
        "action": "markHelpful",
        "articleId": "AZ-UPDATE-0023"
      }
    }
  ]
}
```

### No Results Found Response

When a search query yields no results, a helpful card is displayed with suggestions.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "No Results Found",
          "weight": "bolder",
          "size": "medium",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Sorry, we couldn't find any knowledge base articles for 'advanced quantum computing'.",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Suggestions:",
          "weight": "bolder",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "• Check your spelling\n• Try more general terms\n• Try different keywords\n• Browse by category instead",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Popular Topics:",
          "weight": "bolder",
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Azure Services",
                      "data": {
                        "action": "search",
                        "query": "azure services"
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Office 365",
                      "data": {
                        "action": "search",
                        "query": "office 365"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Windows 11",
                      "data": {
                        "action": "search",
                        "query": "windows 11"
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Teams",
                      "data": {
                        "action": "search",
                        "query": "teams"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Browse Categories",
      "data": {
        "action": "browseCategories"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Create Support Ticket",
      "data": {
        "action": "createTicket",
        "query": "advanced quantum computing"
      }
    }
  ]
}
```

### Suggested Articles Response

This card is displayed when the bot proactively suggests articles based on user context or previous interactions.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Knowledge Base Article Suggestions",
          "weight": "bolder",
          "size": "medium",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Based on your recent activities, you might find these articles helpful:",
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "separator": true,
      "items": [
        {
          "type": "TextBlock",
          "text": "Windows 11 Enterprise Deployment Guide",
          "weight": "bolder",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "A step-by-step guide for deploying Windows 11 in enterprise environments using MDM and Group Policy.",
          "wrap": true
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "View Article",
              "url": "https://internal.company.com/kb/windows-11-enterprise-deployment"
            }
          ]
        }
      ]
    },
    {
      "type": "Container",
      "separator": true,
      "items": [
        {
          "type": "TextBlock",
          "text": "Windows 11 Feature Update Troubleshooting",
          "weight": "bolder",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Solutions for common issues encountered during Windows 11 feature updates.",
          "wrap": true
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "View Article",
              "url": "https://internal.company.com/kb/windows-11-update-troubleshooting"
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Search Knowledge Base",
      "data": {
        "action": "showSearchForm"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Not Helpful",
      "data": {
        "action": "notHelpful"
      }
    }
  ]
}
```

### Error Response

This card is displayed when an error occurs during a search operation.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Search Error",
          "weight": "bolder",
          "size": "medium",
          "wrap": true,
          "color": "attention"
        },
        {
          "type": "TextBlock",
          "text": "We encountered an error while searching the knowledge base. This might be due to a temporary issue with the search service.",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Error details: Unable to connect to search index 'kb-index' (Error code: KB-SEARCH-1045)",
          "wrap": true,
          "isSubtle": true,
          "size": "small"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Try Again",
      "data": {
        "action": "retrySearch",
        "query": "azure update manager"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Report Issue",
      "data": {
        "action": "reportIssue",
        "errorCode": "KB-SEARCH-1045"
      }
    }
  ]
}
```

## Interactive Elements

### Pagination Controls

Pagination controls are implemented using action buttons at the bottom of search result cards.

```json
"actions": [
  {
    "type": "Action.Submit",
    "title": "Previous Page",
    "data": {
      "action": "prevPage",
      "currentPage": 2,
      "query": "azure virtual machines"
    },
    "isEnabled": true
  },
  {
    "type": "Action.Submit",
    "title": "Next Page",
    "data": {
      "action": "nextPage",
      "currentPage": 2,
      "query": "azure virtual machines"
    },
    "isEnabled": true
  }
]
```

When a user is on the first page, the "Previous Page" button should be disabled:

```json
{
  "type": "Action.Submit",
  "title": "Previous Page",
  "data": {
    "action": "prevPage",
    "currentPage": 1,
    "query": "azure virtual machines"
  },
  "isEnabled": false
}
```

Similarly, when a user is on the last page, the "Next Page" button should be disabled.

### Filtering Options

Filtering options allow users to narrow down search results by various criteria.

```json
{
  "type": "Container",
  "items": [
    {
      "type": "TextBlock",
      "text": "Filter Results",
      "weight": "bolder"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "categoryFilter",
      "style": "expanded",
      "choices": [
        {
          "title": "All Categories",
          "value": "all"
        },
        {
          "title": "Azure",
          "value": "azure"
        },
        {
          "title": "Office 365",
          "value": "office365"
        },
        {
          "title": "Windows",
          "value": "windows"
        },
        {
          "title": "Teams",
          "value": "teams"
        }
      ],
      "value": "all"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "dateFilter",
      "style": "compact",
      "choices": [
        {
          "title": "Any Date",
          "value": "any"
        },
        {
          "title": "Last Week",
          "value": "week"
        },
        {
          "title": "Last Month",
          "value": "month"
        },
        {
          "title": "Last 3 Months",
          "value": "quarter"
        },
        {
          "title": "Last Year",
          "value": "year"
        }
      ],
      "value": "any"
    },
    {
      "type": "ActionSet",
      "actions": [
        {
          "type": "Action.Submit",
          "title": "Apply Filters",
          "data": {
            "action": "applyFilters",
            "query": "azure virtual machines"
          }
        }
      ]
    }
  ]
}
```

### Category Navigation

Category navigation allows users to browse the knowledge base by predefined categories.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Knowledge Base Categories",
          "weight": "bolder",
          "size": "medium",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Browse articles by category:",
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Microsoft Azure",
                  "weight": "bolder",
                  "wrap": true
                },
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Virtual Machines",
                      "data": {
                        "action": "browseCategory",
                        "category": "azure/virtual-machines"
                      }
                    }
                  ]
                },
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Storage",
                      "data": {
                        "action": "browseCategory",
                        "category": "azure/storage"
                      }
                    }
                  ]
                },
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Networking",
                      "data": {
                        "action": "browseCategory",
                        "category": "azure/networking"
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Microsoft 365",
                  "weight": "bolder",
                  "wrap": true
                },
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Teams",
                      "data": {
                        "action": "browseCategory",
                        "category": "microsoft365/teams"
                      }
                    }
                  ]
                },
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "Exchange Online",
                      "data": {
                        "action": "browseCategory",
                        "category": "microsoft365/exchange"
                      }
                    }
                  ]
                },
                {
                  "type": "ActionSet",
                  "actions": [
                    {
                      "type": "Action.Submit",
                      "title": "SharePoint Online",
                      "data": {
                        "action": "browseCategory",
                        "category": "microsoft365/sharepoint"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Search Knowledge Base",
      "data": {
        "action": "showSearchForm"
      }
    },
    {
      "type": "Action.Submit",
      "title": "View Popular Articles",
      "data": {
        "action": "viewPopular"
      }
    }
  ]
}
```

### Feedback Mechanism

Feedback mechanisms allow users to rate the helpfulness of articles and provide additional comments.

```json
{
  "type": "Container",
  "items": [
    {
      "type": "TextBlock",
      "text": "Was this article helpful?",
      "wrap": true
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "ActionSet",
              "actions": [
                {
                  "type": "Action.Submit",
                  "title": "👍 Yes",
                  "data": {
                    "action": "articleFeedback",
                    "articleId": "AZ-UPDATE-0023",
                    "rating": "helpful"
                  }
                }
              ]
            }
          ]
        },
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "ActionSet",
              "actions": [
                {
                  "type": "Action.Submit",
                  "title": "👎 No",
                  "data": {
                    "action": "articleFeedback",
                    "articleId": "AZ-UPDATE-0023",
                    "rating": "notHelpful"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

When a user submits feedback, a follow-up card can be displayed:

```json
{
  "type": "Container",
  "items": [
    {
      "type": "TextBlock",
      "text": "Thank you for your feedback!",
      "wrap": true
    },
    {
      "type": "Input.Text",
      "id": "feedbackComment",
      "placeholder": "Additional comments (optional)",
      "isMultiline": true
    },
    {
      "type": "ActionSet",
      "actions": [
        {
          "type": "Action.Submit",
          "title": "Submit Comments",
          "data": {
            "action": "submitFeedbackComments",
            "articleId": "AZ-UPDATE-0023"
          }
        },
        {
          "type": "Action.Submit",
          "title": "Skip",
          "data": {
            "action": "skipFeedbackComments"
          }
        }
      ]
    }
  ]
}
```

## Advanced Response Templates

### Rich Media Response

This template includes rich media elements like images and charts.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Azure Update Manager Architecture",
          "weight": "bolder",
          "size": "large",
          "wrap": true
        },
        {
          "type": "Image",
          "url": "https://internal.company.com/kb/images/azure-update-manager-architecture.png",
          "altText": "Azure Update Manager Architecture Diagram",
          "size": "large"
        },
        {
          "type": "TextBlock",
          "text": "The diagram above illustrates the Azure Update Manager architecture, showing how it interacts with various Azure services and on-premises resources.",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Key Components:",
          "weight": "bolder",
          "wrap": true
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Update Center:",
              "value": "Central management interface in Azure Portal"
            },
            {
              "title": "Maintenance Configuration:",
              "value": "Defines update schedules and maintenance windows"
            },
            {
              "title": "Assessment Service:",
              "value": "Evaluates update status across resources"
            },
            {
              "title": "Deployment Service:",
              "value": "Orchestrates update installations"
            },
            {
              "title": "Azure Arc:",
              "value": "Extends management to non-Azure machines"
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Full Documentation",
      "url": "https://internal.company.com/kb/azure-update-manager-architecture"
    },
    {
      "type": "Action.Submit",
      "title": "Download as PDF",
      "data": {
        "action": "downloadPDF",
        "articleId": "AZ-UPDATE-ARCH-001"
      }
    }
  ]
}
```

### Multi-section Response

This template organizes content into multiple collapsible sections for better readability.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Azure Update Manager Comprehensive Guide",
          "weight": "bolder",
          "size": "large",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "This guide covers all aspects of Azure Update Manager, from initial setup to advanced configurations and troubleshooting.",
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Section 1: Getting Started",
                  "weight": "bolder",
                  "wrap": true
                }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "Image",
                  "url": "https://adaptivecards.io/content/down.png",
                  "altText": "Collapse",
                  "selectAction": {
                    "type": "Action.ToggleVisibility",
                    "targetElements": [
                      "section1Content",
                      "section1CollapseIcon",
                      "section1ExpandIcon"
                    ]
                  },
                  "id": "section1CollapseIcon"
                },
                {
                  "type": "Image",
                  "url": "https://adaptivecards.io/content/up.png",
                  "altText": "Expand",
                  "selectAction": {
                    "type": "Action.ToggleVisibility",
                    "targetElements": [
                      "section1Content",
                      "section1CollapseIcon",
                      "section1ExpandIcon"
                    ]
                  },
                  "id": "section1ExpandIcon",
                  "isVisible": false
                }
              ]
            }
          ]
        },
        {
          "type": "Container",
          "id": "section1Content",
          "items": [
            {
              "type": "TextBlock",
              "text": "Azure Update Manager provides a unified solution for managing updates across your hybrid environment. To get started:",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "text": "1. Enable the Azure Update Manager service in your subscription\n2. Register your machines (Azure VMs, Arc servers, etc.)\n3. Create a maintenance configuration\n4. Schedule your first assessment",
              "wrap": true
            },
            {
              "type": "ActionSet",
              "actions": [
                {
                  "type": "Action.OpenUrl",
                  "title": "View Setup Guide",
                  "url": "https://internal.company.com/kb/azure-update-manager-setup"
                }
              ]
            }
          ]
        }
      ]
    },
    // Additional sections would follow the same pattern
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Section 2: Creating Maintenance Configurations",
                  "weight": "bolder",
                  "wrap": true
                }
              ]
            },
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "Image",
                  "url": "https://adaptivecards.io/content/down.png",
                  "altText": "Collapse",
                  "selectAction": {
                    "type": "Action.ToggleVisibility",
                    "targetElements": [
                      "section2Content",
                      "section2CollapseIcon",
                      "section2ExpandIcon"
                    ]
                  },
                  "id": "section2CollapseIcon",
                  "isVisible": false
                },
                {
                  "type": "Image",
                  "url": "https://adaptivecards.io/content/up.png",
                  "altText": "Expand",
                  "selectAction": {
                    "type": "Action.ToggleVisibility",
                    "targetElements": [
                      "section2Content",
                      "section2CollapseIcon",
                      "section2ExpandIcon"
                    ]
                  },
                  "id": "section2ExpandIcon"
                }
              ]
            }
          ]
        },
        {
          "type": "Container",
          "id": "section2Content",
          "items": [
            {
              "type": "TextBlock",
              "text": "Maintenance configurations define when and how updates are applied. Key considerations include:",
              "wrap": true,
              "isVisible": false
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Full Documentation",
      "url": "https://internal.company.com/kb/azure-update-manager-guide"
    },
    {
      "type": "Action.Submit",
      "title": "Back to Search Results",
      "data": {
        "action": "backToResults"
      }
    }
  ]
}
```

### Deep-linked Content Response

This template provides deep links to specific sections of documentation or related resources.

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Azure Update Manager Troubleshooting",
          "weight": "bolder",
          "size": "large",
          "wrap": true
        },
        {
          "type": "TextBlock",
          "text": "Select a specific issue to jump directly to the solution:",
          "wrap": true
        }
      ]
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "Updates Not Appearing in Portal",
              "url": "https://internal.company.com/kb/azure-update-manager-troubleshooting#updates-not-appearing"
            }
          ]
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "Update Installation Failures",
              "url": "https://internal.company.com/kb/azure-update-manager-troubleshooting#installation-failures"
            }
          ]
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "Machines Not Reporting Status",
              "url": "https://internal.company.com/kb/azure-update-manager-troubleshooting#reporting-issues"
            }
          ]
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "Maintenance Configuration Issues",
              "url": "https://internal.company.com/kb/azure-update-manager-troubleshooting#configuration-issues"
            }
          ]
        },
        {
          "type": "ActionSet",
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "Arc Server Connection Problems",
              "url": "https://internal.company.com/kb/azure-update-manager-troubleshooting#arc-connection"
            }
          ]
        }
      ]
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Related Resources:",
          "weight": "bolder",
          "wrap": true
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "Error Code Reference:",
              "value": "[View Error Codes](https://internal.company.com/kb/azure-update-manager-error-codes)"
            },
            {
              "title": "Log Collection Tool:",
              "value": "[Download Tool](https://internal.company.com/kb/azure-update-manager-log-collector)"
            },
            {
              "title": "Support Ticket:",
              "value": "[Create Ticket](https://internal.company.com/support/new-ticket?category=azure-update-manager)"
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Complete Troubleshooting Guide",
      "url": "https://internal.company.com/kb/azure-update-manager-troubleshooting"
    },
    {
      "type": "Action.Submit",
      "title": "Back to Search Results",
      "data": {
        "action": "backToResults"
      }
    }
  ]
}
```

## Implementation Guidelines

### Accessibility Considerations

When designing Adaptive Cards for the Knowledge Base Search Bot, follow these accessibility guidelines:

1. **Text Alternatives**: Always include alt text for images using the `altText` property.

```json
{
  "type": "Image",
  "url": "https://internal.company.com/kb/images/azure-architecture.png",
  "altText": "Azure Update Manager Architecture Diagram"
}
```

2. **Color Contrast**: Ensure sufficient contrast between text and background colors. Avoid using color as the only means of conveying information.

3. **Keyboard Navigation**: Design cards to be navigable using keyboard controls.

4. **Screen Reader Support**: Use clear, descriptive labels for interactive elements.

5. **Text Size**: Use appropriate text sizes and allow for text wrapping.

```json
{
  "type": "TextBlock",
  "text": "Important information about Azure Update Manager",
  "size": "medium",
  "wrap": true
}
```

### Performance Optimization

To ensure optimal performance of Adaptive Cards in Teams:

1. **Minimize Card Size**: Keep the JSON payload under 28KB to prevent performance issues.

2. **Limit Media**: Use images judiciously and optimize their file sizes.

3. **Pagination**: For large result sets, implement pagination rather than attempting to display all results in a single card.

4. **Lazy Loading**: For complex cards, consider implementing a progressive disclosure pattern where additional content is loaded on demand.

5. **Caching**: Implement caching mechanisms for frequently accessed knowledge base content.

### Responsive Design

Design cards to display well on various devices and screen sizes:

1. **Flexible Layouts**: Use `stretch` width columns where appropriate.

```json
{
  "type": "ColumnSet",
  "columns": [
    {
      "type": "Column",
      "width": "stretch",
      "items": []
    },
    {
      "type": "Column",
      "width": "auto",
      "items": []
    }
  ]
}
```

2. **Prioritize Content**: Place the most important information at the top of the card.

3. **Image Sizing**: Use responsive image sizing to adapt to different screen sizes.

4. **Text Wrapping**: Always enable text wrapping for TextBlock elements.

## Card Schemas

All Adaptive Cards used in the Knowledge Base Search Bot conform to the Adaptive Card schema version 1.5. The full schema reference can be found at [https://adaptivecards.io/explorer/](https://adaptivecards.io/explorer/).

The base schema structure is as follows:

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [],
  "actions": []
}
```

## Running a Directory Tree

To display the full structure of the Knowledge Base, you can use the following PowerShell command to generate a directory tree:

```powershell
# Function to display a directory tree
function Show-DirectoryTree {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path,
        
        [Parameter(Mandatory=$false)]
        [int]$IndentLevel = 0,
        
        [Parameter(Mandatory=$false)]
        [string]$Prefix = "",
        
        [Parameter(Mandatory=$false)]
        [int]$MaxDepth = 10,
        
        [Parameter(Mandatory=$false)]
        [switch]$IncludeFiles
    )
    
    if ($IndentLevel -gt $MaxDepth) {
        return
    }
    
    $indent = "    " * $IndentLevel
    
    try {
        $items = Get-ChildItem -Path $Path -ErrorAction Stop
        
        foreach ($item in $items) {
            if ($item.PSIsContainer) {
                # Directory
                Write-Host "$indent$Prefix$($item.Name)\"
                Show-DirectoryTree -Path $item.FullName -IndentLevel ($IndentLevel + 1) -Prefix $Prefix -MaxDepth $MaxDepth -IncludeFiles:$IncludeFiles
            }
            elseif ($IncludeFiles) {
                # File (only if IncludeFiles is specified)
                Write-Host "$indent$Prefix$($item.Name)"
            }
        }
    }
    catch {
        Write-Error "Error accessing path: $Path. $_"
    }
}

# Example usage
Show-DirectoryTree -Path "C:\Users\jrochau\projects\ACS_KnowledgeBase" -IncludeFiles
```

You can also use the following Node.js script to generate a directory tree and export it to JSON format:

```javascript
const fs = require('fs');
const path = require('path');

function createDirectoryTree(dirPath, options = {}) {
    const { 
        maxDepth = Infinity, 
        currentDepth = 0,
        includeFiles = true,
        excludePattern = null 
    } = options;
    
    if (currentDepth > maxDepth) return null;
    
    const name = path.basename(dirPath);
    const stats = fs.statSync(dirPath);
    
    if (excludePattern && excludePattern.test(name)) return null;
    
    if (!stats.isDirectory()) {
        return { name, type: 'file' };
    }
    
    const children = fs.readdirSync(dirPath)
        .map(child => {
            const childPath = path.join(dirPath, child);
            const childStats = fs.statSync(childPath);
            
            if (childStats.isDirectory()) {
                return createDirectoryTree(childPath, {
                    ...options,
                    currentDepth: currentDepth + 1
                });
            } else if (includeFiles) {
                return { name: child, type: 'file' };
            }
            
            return null;
        })
        .filter(Boolean);
    
    return { name, type: 'directory', children };
}

// Example usage
const tree = createDirectoryTree('C:/Users/jrochau/projects/ACS_KnowledgeBase', {
    includeFiles: true,
    maxDepth: 5
});

fs.writeFileSync('knowledge-base-tree.json', JSON.stringify(tree, null, 2));
console.log('Directory tree saved to knowledge-base-tree.json');
```

For more advanced visualization, you can incorporate this data into an Adaptive Card with collapsible sections:

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "Knowledge Base Directory Structure",
      "weight": "bolder",
      "size": "large",
      "wrap": true
    },
    {
      "type": "Container",
      "id": "treeContainer",
      "items": [
        // Tree structure would be dynamically generated here
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Expand All",
      "data": {
        "action": "expandAll"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Collapse All",
      "data": {
        "action": "collapseAll"
      }
    }
  ]
}
```

This documentation provides comprehensive examples and guidelines for implementing Adaptive Card responses in the Knowledge Base Search Bot. By following these patterns, you can create a consistent, user-friendly experience for knowledge base searches within Microsoft Teams.
