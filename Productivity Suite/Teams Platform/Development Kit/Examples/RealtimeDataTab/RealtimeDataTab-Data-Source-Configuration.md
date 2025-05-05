# RealtimeDataTab: Data Source Configuration Guide

## Overview

The RealtimeDataTab example demonstrates how to build a Microsoft Teams tab application that displays real-time data from various data sources. This document provides comprehensive guidance on configuring data sources for the RealtimeDataTab application, enabling developers to integrate real-time data feeds seamlessly into their Teams applications.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Supported Data Sources](#supported-data-sources)
- [Configuration Format](#configuration-format)
- [Authentication Methods](#authentication-methods)
- [Connection Configuration](#connection-configuration)
- [Data Transformation](#data-transformation)
- [Polling and Real-time Updates](#polling-and-real-time-updates)
- [Error Handling](#error-handling)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Prerequisites

Before configuring data sources for the RealtimeDataTab, ensure you have:

- Microsoft Teams Development Kit installed
- Node.js (version 14.x or higher)
- npm (version 6.x or higher)
- A Microsoft 365 developer account with administrative privileges
- Azure subscription (for Azure-based data sources)
- Appropriate API credentials for your data sources

## Supported Data Sources

The RealtimeDataTab supports the following data source types:

### REST APIs

- **Standard REST**: Any REST API that returns JSON data
- **GraphQL**: GraphQL endpoints with query capability
- **OData**: OData v4 compliant endpoints

### Database Connections

- **Azure SQL Database**: Direct connection to Azure SQL
- **Azure Cosmos DB**: Connection to Cosmos DB collections
- **MongoDB**: Connection to MongoDB databases
- **PostgreSQL**: Connection to PostgreSQL databases

### Azure Services

- **Azure Event Hub**: Real-time event processing
- **Azure IoT Hub**: IoT device data streams
- **Azure SignalR Service**: Real-time web functionality

### Other Data Sources

- **SharePoint Lists**: Direct integration with Microsoft 365
- **Excel Online**: Data from Excel workbooks
- **CSV Files**: Local or remote CSV files
- **WebSockets**: Direct WebSocket connections

## Configuration Format

Data source configurations use a standard JSON format that specifies connection details, authentication, and data handling preferences.

### Basic Configuration Structure

```json
{
  "dataSourceId": "unique-source-identifier",
  "type": "source-type",
  "name": "User-friendly name",
  "description": "Brief description of this data source",
  "connection": {
    // connection specific properties
  },
  "authentication": {
    // authentication specific properties
  },
  "transformation": {
    // optional data transformation rules
  },
  "polling": {
    // polling configuration (if not using real-time feed)
  },
  "errorHandling": {
    // error handling configuration
  }
}
```

## Authentication Methods

RealtimeDataTab supports several authentication mechanisms:

### OAuth 2.0

```json
"authentication": {
  "type": "oauth2",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "scope": "required-scopes",
  "tokenEndpoint": "https://token.endpoint.com/oauth/token",
  "grantType": "client_credentials"
}
```

### API Key

```json
"authentication": {
  "type": "apiKey",
  "key": "your-api-key",
  "headerName": "X-API-Key"
}
```

### Basic Authentication

```json
"authentication": {
  "type": "basic",
  "username": "username",
  "password": "password"
}
```

### Azure Active Directory (AAD)

```json
"authentication": {
  "type": "aad",
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "resource": "target-resource"
}
```

### Connection String

```json
"authentication": {
  "type": "connectionString",
  "connectionString": "your-connection-string"
}
```

## Connection Configuration

Connection configurations vary by data source type:

### REST API Configuration

```json
"connection": {
  "baseUrl": "https://api.example.com/v1",
  "endpoint": "/data",
  "method": "GET",
  "headers": {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  "queryParameters": {
    "limit": 100,
    "format": "json"
  }
}
```

### Database Configuration

```json
"connection": {
  "server": "server-name.database.windows.net",
  "database": "database-name",
  "schema": "dbo",
  "table": "TableName",
  "port": 1433,
  "encrypt": true,
  "query": "SELECT * FROM TableName WHERE condition = @paramValue"
}
```

### Azure Event Hub Configuration

```json
"connection": {
  "eventHubNamespace": "your-namespace",
  "eventHubName": "your-event-hub",
  "consumerGroup": "$Default",
  "partitionId": "0"
}
```

### WebSocket Configuration

```json
"connection": {
  "url": "wss://realtime.example.com/socket",
  "protocols": ["v1.protocol.example"],
  "reconnectInterval": 5000,
  "maxRetries": 10
}
```

## Data Transformation

The transformation section allows you to define how the raw data should be processed before display:

```json
"transformation": {
  "enabled": true,
  "mapping": {
    "id": "$.data.id",
    "timestamp": "$.data.created_at",
    "value": "$.data.metrics.value",
    "status": "$.data.status"
  },
  "filters": [
    {
      "field": "$.data.status",
      "operator": "notEquals",
      "value": "error"
    },
    {
      "field": "$.data.metrics.value",
      "operator": "greaterThan",
      "value": 0
    }
  ],
  "sort": {
    "field": "timestamp",
    "direction": "descending"
  },
  "aggregation": {
    "type": "sum",
    "field": "value",
    "groupBy": "category"
  }
}
```

The transformation supports JSONPath expressions for advanced data extraction and manipulation.

## Polling and Real-time Updates

For data sources that don't natively support real-time updates, a polling mechanism can be configured:

```json
"polling": {
  "enabled": true,
  "interval": 30000,
  "maxItems": 100,
  "incrementalKey": "timestamp",
  "backoff": {
    "initialInterval": 5000,
    "maxInterval": 60000,
    "multiplier": 1.5
  }
}
```

For real-time sources, configure the real-time connection:

```json
"realtime": {
  "type": "signalr", // or "websocket", "sse", etc.
  "hubUrl": "https://realtime.example.com/hub",
  "events": ["dataUpdated", "statusChanged"],
  "connectionTimeout": 30000,
  "reconnectPolicy": "exponentialBackoff"
}
```

## Error Handling

Configure how the application handles data source errors:

```json
"errorHandling": {
  "retryAttempts": 3,
  "retryDelay": 2000,
  "retryStrategy": "exponential", // or "fixed", "linear"
  "fallbackBehavior": "showLastSuccessful",
  "errorNotification": {
    "displayToUser": true,
    "logToConsole": true,
    "sendTelemetry": true
  },
  "timeoutMs": 15000
}
```

## Examples

### Example 1: REST API with OAuth2

```json
{
  "dataSourceId": "sales-api",
  "type": "rest",
  "name": "Sales Data API",
  "description": "Real-time sales data from central API",
  "connection": {
    "baseUrl": "https://api.company.com/v2",
    "endpoint": "/sales/realtime",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    "queryParameters": {
      "region": "north-america",
      "detailed": true
    }
  },
  "authentication": {
    "type": "oauth2",
    "clientId": "{{SALES_API_CLIENT_ID}}",
    "clientSecret": "{{SALES_API_CLIENT_SECRET}}",
    "scope": "read:sales",
    "tokenEndpoint": "https://auth.company.com/oauth/token",
    "grantType": "client_credentials"
  },
  "transformation": {
    "enabled": true,
    "mapping": {
      "transactionId": "$.transactions[*].id",
      "amount": "$.transactions[*].amount",
      "product": "$.transactions[*].product.name",
      "timestamp": "$.transactions[*].createdAt"
    },
    "filters": [
      {
        "field": "$.transactions[*].status",
        "operator": "equals",
        "value": "completed"
      }
    ],
    "sort": {
      "field": "timestamp",
      "direction": "descending"
    }
  },
  "polling": {
    "enabled": true,
    "interval": 60000,
    "maxItems": 50
  },
  "errorHandling": {
    "retryAttempts": 3,
    "retryDelay": 2000,
    "timeoutMs": 10000
  }
}
```

### Example 2: Azure SQL Database

```json
{
  "dataSourceId": "inventory-db",
  "type": "azuresql",
  "name": "Inventory Database",
  "description": "Product inventory levels from Azure SQL",
  "connection": {
    "server": "inventory-sql.database.windows.net",
    "database": "ProductInventory",
    "query": "SELECT ProductId, Name, StockLevel, LastUpdated FROM Inventory WHERE StockLevel < @threshold ORDER BY LastUpdated DESC",
    "parameters": {
      "threshold": 20
    }
  },
  "authentication": {
    "type": "aad",
    "tenantId": "{{TENANT_ID}}",
    "clientId": "{{SQL_CLIENT_ID}}",
    "clientSecret": "{{SQL_CLIENT_SECRET}}"
  },
  "transformation": {
    "enabled": true,
    "mapping": {
      "id": "ProductId",
      "name": "Name",
      "stock": "StockLevel",
      "updated": "LastUpdated"
    }
  },
  "polling": {
    "enabled": true,
    "interval": 300000
  },
  "errorHandling": {
    "retryAttempts": 2,
    "fallbackBehavior": "showLastSuccessful"
  }
}
```

### Example 3: WebSocket Connection

```json
{
  "dataSourceId": "market-data",
  "type": "websocket",
  "name": "Market Data Feed",
  "description": "Real-time market data ticker",
  "connection": {
    "url": "wss://markets.example.com/feed",
    "protocols": ["v2.marketdata.protocol"],
    "reconnectInterval": 3000,
    "maxRetries": 10,
    "subscriptionMessage": {
      "action": "subscribe",
      "symbols": ["MSFT", "AAPL", "GOOGL", "AMZN"]
    }
  },
  "authentication": {
    "type": "apiKey",
    "key": "{{MARKET_API_KEY}}",
    "headerName": "X-API-Key"
  },
  "transformation": {
    "enabled": true,
    "mapping": {
      "symbol": "$.symbol",
      "price": "$.price",
      "change": "$.change",
      "volume": "$.volume",
      "timestamp": "$.timestamp"
    },
    "filters": [
      {
        "field": "$.type",
        "operator": "equals",
        "value": "trade"
      }
    ]
  },
  "errorHandling": {
    "retryStrategy": "exponential",
    "errorNotification": {
      "displayToUser": true
    }
  }
}
```

## Troubleshooting

### Common Issues and Resolutions

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Authentication failures | Expired credentials or incorrect OAuth configuration | Verify that all credential values are current and properly formatted |
| Timeout errors | Slow data source response or network issues | Increase the timeout value in errorHandling configuration |
| Empty data results | Incorrect query parameters or overly restrictive filters | Review and relax filter criteria, verify endpoint URL |
| Rate limiting | Too frequent API calls | Increase polling interval, implement exponential backoff strategy |
| Data mapping errors | JSONPath expressions not matching data structure | Verify the actual response format and update mapping expressions |
| Connection refused | Firewall restrictions or network configuration | Ensure that the Teams client can access the data source endpoint |
| CORS issues | API doesn't allow cross-origin requests | Configure your API to allow requests from the Teams domain |

### Diagnostic Steps

1. **Check Authentication**: Verify that authentication credentials are correct and not expired
2. **Examine Network Logs**: Use browser developer tools to check for network errors
3. **Test API Directly**: Use a tool like Postman to test API endpoints outside of Teams
4. **Verify JSON Parsing**: Ensure that the response format matches your expectations
5. **Check Environment Variables**: Verify that all environment variables are correctly populated
6. **Review Service Health**: Check the status of dependent services
7. **Test with Minimal Configuration**: Simplify your configuration to isolate issues

## Best Practices

### Security Considerations

1. **Never hardcode secrets** in configuration files; use environment variables or Azure Key Vault
2. **Implement least privilege access** for all data source credentials
3. **Regularly rotate API keys** and other credentials
4. **Use OAuth flows** instead of basic authentication when possible
5. **Validate and sanitize** all data received from external sources
6. **Use HTTPS for all connections** to ensure data is encrypted in transit
7. **Implement proper error handling** that doesn't leak sensitive information

### Performance Optimization

1. **Choose appropriate polling intervals** based on data change frequency
2. **Implement pagination** for large datasets
3. **Use incremental data fetching** where supported
4. **Cache results** when appropriate to reduce API calls
5. **Implement request batching** for multiple simultaneous data needs
6. **Optimize queries** to retrieve only required fields
7. **Use websockets or server-sent events** for truly real-time requirements

### Configuration Management

1. **Store configurations in version control**
2. **Separate configurations by environment** (dev, test, production)
3. **Implement configuration validation** to catch errors early
4. **Document all custom configurations**
5. **Implement a change approval process** for production configurations
6. **Use consistent naming conventions** across all data sources
7. **Maintain a registry** of all data sources and their owners