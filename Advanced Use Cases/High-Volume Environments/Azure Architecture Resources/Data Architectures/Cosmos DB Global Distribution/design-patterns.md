# Azure Cosmos DB Global Distribution: Design Patterns

## Overview

Azure Cosmos DB's global distribution capabilities allow organizations to deploy databases across multiple Azure regions worldwide. This document outlines key design patterns, best practices, and architectural considerations for implementing an effective globally distributed Cosmos DB solution that maximizes availability, performance, and resilience while minimizing costs and complexity.

## Table of Contents

- [Multi-Region Write Design Patterns](#multi-region-write-design-patterns)
- [Read Distribution Patterns](#read-distribution-patterns)
- [Conflict Resolution Patterns](#conflict-resolution-patterns)
- [Partition Key Design Patterns](#partition-key-design-patterns)
- [Cost Optimization Patterns](#cost-optimization-patterns)
- [Data Synchronization Patterns](#data-synchronization-patterns)
- [Disaster Recovery Patterns](#disaster-recovery-patterns)
- [Performance Optimization Patterns](#performance-optimization-patterns)
- [Security Design Patterns](#security-design-patterns)
- [Monitoring and Maintenance Patterns](#monitoring-and-maintenance-patterns)
- [Pattern Decision Matrix](#pattern-decision-matrix)

## Multi-Region Write Design Patterns

### Active-Active Pattern

**Description:**  
Multi-region writes are enabled across all regions in the Cosmos DB deployment, allowing write operations from any deployed region.

**Implementation Details:**
- Configure Cosmos DB with multi-region writes enabled
- Client applications connect to their nearest region
- All regions can accept both read and write operations
- Conflict resolution policies must be defined (see [Conflict Resolution Patterns](#conflict-resolution-patterns))

**Best For:**
- Applications requiring high write availability
- Globally distributed user bases with write-heavy workloads
- Scenarios where regional outages cannot impact write availability

**Considerations:**
- Increases complexity of conflict resolution
- May result in higher storage requirements due to conflict versions
- Slightly higher latency for write operations compared to single-region writes
- RU consumption is higher due to replication overhead

**Code Example:**
```csharp
// C# SDK configuration for multi-region writes
CosmosClientOptions options = new CosmosClientOptions
{
    ApplicationRegion = "West US",  // Client's nearest region
    ApplicationPreferredRegions = new List<string> {"West US", "East US", "North Europe"},
    EnableEndpointDiscovery = true,
};

CosmosClient client = new CosmosClient(connectionString, options);
```

### Active-Passive Pattern

**Description:**  
Single-region write with multi-region reads. Only one region accepts write operations, while multiple regions can serve read operations.

**Implementation Details:**
- Designate one region as the write region
- Configure remaining regions as read regions
- Client applications are configured to write to the primary region
- Read operations can be served from any region

**Best For:**
- Workloads with lower write requirements and high read distribution
- Scenarios where write consistency is critical
- Applications that can tolerate write region outages with manual failover

**Considerations:**
- Lower write availability during regional outages
- Lower write latency for users near the write region
- Simplified conflict resolution (conflicts only occur during manual failover)
- Reduced RU consumption compared to multi-region writes

**Code Example:**
```csharp
// C# SDK configuration for single-region writes with multi-region reads
CosmosClientOptions options = new CosmosClientOptions
{
    ApplicationRegion = "West US",  // Primary write region
    ApplicationPreferredRegions = new List<string> {"West US", "East US", "North Europe"},
    EnableEndpointDiscovery = true,
};

CosmosClient client = new CosmosClient(connectionString, options);
```

### Dynamic Multi-Master Pattern

**Description:**  
A hybrid approach where the system dynamically switches between active-active and active-passive configurations based on application needs or regional conditions.

**Implementation Details:**
- Implement application-level logic to determine write mode
- Monitor regional performance metrics
- Adjust client configuration dynamically
- Utilize Cosmos DB's failover APIs programmatically

**Best For:**
- Applications with varying load patterns
- Systems requiring optimization for both cost and performance
- Multi-tenant solutions with different SLA requirements

**Considerations:**
- Higher implementation complexity
- Requires sophisticated monitoring and switching logic
- More testing needed to validate different operational modes
- May require custom client libraries

## Read Distribution Patterns

### Nearest Region Pattern

**Description:**  
Client applications always read from their geographically nearest Cosmos DB region to minimize latency.

**Implementation Details:**
- Configure client SDK with EnableEndpointDiscovery = true
- Set ApplicationPreferredRegions with regions in order of preference
- Cosmos DB SDK automatically routes read requests to the nearest available region

**Best For:**
- Applications prioritizing read latency
- Global user bases accessing common data
- Content delivery applications

**Code Example:**
```csharp
// C# SDK configuration for nearest region reads
CosmosClientOptions options = new CosmosClientOptions
{
    ConnectionMode = ConnectionMode.Direct,
    EnableEndpointDiscovery = true,
    ApplicationPreferredRegions = new List<string> {"West US", "East US", "North Europe", "East Asia", "Australia East"},
};

CosmosClient client = new CosmosClient(connectionString, options);
```

### Consistency-Based Routing Pattern

**Description:**  
Read operations are routed based on the required consistency level, with strong consistency reads directed to the write region and other consistency levels served from nearest regions.

**Implementation Details:**
- Configure different client instances for different consistency levels
- Use strong consistency client for critical operations
- Use eventual consistency client for general read operations

**Best For:**
- Applications with mixed consistency requirements
- Financial services applications
- Systems with regulatory compliance requirements

**Code Example:**
```csharp
// Critical operations client with strong consistency
CosmosClientOptions strongOptions = new CosmosClientOptions
{
    ApplicationRegion = writeRegion,  // Always use write region
    ConsistencyLevel = ConsistencyLevel.Strong
};
CosmosClient strongClient = new CosmosClient(connectionString, strongOptions);

// General operations client with eventual consistency
CosmosClientOptions eventualOptions = new CosmosClientOptions
{
    ApplicationPreferredRegions = new List<string> {"West US", "East US", "North Europe"},
    ConsistencyLevel = ConsistencyLevel.Eventual,
    EnableEndpointDiscovery = true
};
CosmosClient eventualClient = new CosmosClient(connectionString, eventualOptions);
```

### Read-Heavy Region Pattern

**Description:**  
Specific regions are designated for handling read-heavy workloads and are provisioned with higher RU/s capacity to accommodate high read throughput.

**Implementation Details:**
- Identify regions with high read demands
- Increase RU/s allocations in those regions
- Configure client applications to prefer these regions for read operations

**Best For:**
- Workloads with geographic hotspots
- Analytics and reporting systems
- Applications with predictable regional read patterns

## Conflict Resolution Patterns

### Last-Writer-Wins (LWW) Pattern

**Description:**  
Conflicts are automatically resolved by selecting the version with the highest timestamp value.

**Implementation Details:**
- Configure the `/\_ts` system property or a custom timestamp property as the conflict resolution path
- Ensure system clocks are synchronized across client applications
- No additional client-side logic required

**Best For:**
- Simple multi-region write scenarios
- Systems where the most recent update should always prevail
- Applications with infrequent concurrent updates to the same items

**Configuration Example:**
```json
{
  "conflictResolutionPolicy": {
    "mode": "lastWriterWins",
    "conflictResolutionPath": "/timestamp"
  }
}
```

### Custom Conflict Resolution Procedure Pattern

**Description:**  
Conflicts are resolved using a server-side stored procedure that implements custom logic to merge conflicting versions or apply business rules.

**Implementation Details:**
- Create a stored procedure that handles conflict resolution logic
- Register the stored procedure as the conflict resolution procedure
- Implement merge logic based on business requirements

**Best For:**
- Complex data models requiring smart merging
- Applications with business-specific conflict resolution rules
- Scenarios where data fusion is preferable to choosing one version

**Example Stored Procedure:**
```javascript
function resolveConflict(conflictingItems) {
    var accepted = conflictingItems[0];
    
    // Custom merge logic example for a shopping cart
    for (var i = 1; i < conflictingItems.length; i++) {
        // Merge items from all conflicting versions
        if (conflictingItems[i].items) {
            if (!accepted.items) accepted.items = [];
            accepted.items = accepted.items.concat(conflictingItems[i].items);
            
            // Remove duplicates
            accepted.items = Array.from(new Set(accepted.items.map(JSON.stringify))).map(JSON.parse);
        }
    }
    
    return accepted;
}
```

### Conflict Feed Pattern

**Description:**  
Conflicts are captured in a conflict feed and resolved asynchronously by an external process or user intervention.

**Implementation Details:**
- Configure conflict resolution mode to "custom"
- Set the conflict resolution procedure to null
- Implement a background processor to read the conflicts feed
- Apply business logic to resolve conflicts and update the winning document

**Best For:**
- Applications requiring human intervention for conflict resolution
- Complex business scenarios where automated resolution is difficult
- Regulatory environments requiring audit trails of conflict resolution

**Code Example:**
```csharp
// Read conflicts feed
FeedIterator<ConflictProperties> conflictFeed = container.Conflicts.GetConflictQueryIterator();
while (conflictFeed.HasMoreResults)
{
    FeedResponse<ConflictProperties> conflicts = await conflictFeed.ReadNextAsync();
    foreach (ConflictProperties conflict in conflicts)
    {
        // Read all conflict versions
        FeedResponse<dynamic> conflictingItems = await container.Conflicts
            .ReadConflictFeedAsync(conflict.SourceResourceId);
        
        // Apply custom resolution logic
        dynamic resolvedItem = ApplyCustomResolutionLogic(conflictingItems);
        
        // Replace with resolved version
        await container.ReplaceItemAsync(resolvedItem, conflict.SourceResourceId);
        
        // Delete the conflict
        await container.Conflicts.DeleteAsync(conflict.ResourceId, new PartitionKey(conflict.PartitionKey));
    }
}
```

## Partition Key Design Patterns

### Hierarchical Partition Key Pattern

**Description:**  
Combines multiple properties into a single partition key to create a hierarchical distribution strategy that optimizes for both global distribution and query performance.

**Implementation Details:**
- Create composite partition keys using a delimiter
- Include geography information in the partition key for regional data affinity
- Structure composite keys with most-significant values first

**Example:**
```json
{
  "id": "customer-12345",
  "partitionKey": "US-WA-Seattle",  // Region-State-City
  "data": { ... }
}
```

**Best For:**
- Data with natural hierarchical organization
- Applications with region-specific query patterns
- Systems requiring both global distribution and local performance

### Synthetic Partition Key Pattern

**Description:**  
Uses computed values as partition keys to ensure optimal distribution across regions while maintaining query efficiency.

**Implementation Details:**
- Generate synthetic keys based on application-specific algorithms
- Consider regional affinity when generating keys
- Implement consistent hashing for partition key generation

**Example Algorithm:**
```csharp
string GeneratePartitionKey(string userId, string region)
{
    // Ensure users in the same region are more likely to be in the same partition
    int hashCode = (userId + region).GetHashCode();
    int partitionNumber = Math.Abs(hashCode % 20);  // 20 logical partitions
    return $"{region}-{partitionNumber}";
}
```

**Best For:**
- Very large datasets needing even distribution
- Applications with complex regional routing requirements
- Workloads with unpredictable growth patterns

### Global-Local Partition Key Pattern

**Description:**  
Uses different partition key strategies for global and local data, with globally accessed data using a distribution-optimized key and locally accessed data using a query-optimized key.

**Implementation Details:**
- Implement a routing layer that directs requests to appropriate containers
- Use one container with geography-based partition keys for global data
- Use region-specific containers with performance-optimized partition keys for local data

**Best For:**
- Applications with mixed global and local data access patterns
- Systems with region-specific regulatory requirements
- Multi-tenant applications with different regional needs

## Cost Optimization Patterns

### Regional RU Provisioning Pattern

**Description:**  
Allocates different RU/s levels to different regions based on regional usage patterns to optimize costs.

**Implementation Details:**
- Analyze regional usage patterns
- Provision higher RU/s in high-usage regions and lower RU/s in low-usage regions
- Implement automatic RU/s scaling based on regional demand

**Best For:**
- Applications with predictable regional usage patterns
- Cost-sensitive deployments
- Systems with significant regional usage differences

**Azure CLI Example:**
```bash
# Create a Cosmos DB account with different RU allocations per region
az cosmosdb create \
  --name mycosmosdb \
  --resource-group myResourceGroup \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westus failoverPriority=1 isZoneRedundant=true \
  --locations regionName=northeurope failoverPriority=2 isZoneRedundant=true

# Configure the container with region-specific RU/s
az cosmosdb sql container create \
  --account-name mycosmosdb \
  --database-name mydb \
  --name mycontainer \
  --partition-key-path "/partitionKey" \
  --throughput-policy "regional" \
  --region "eastus" --throughput 10000 \
  --region "westus" --throughput 5000 \
  --region "northeurope" --throughput 3000
```

### Time-Based Scaling Pattern

**Description:**  
Scales RU/s allocations up and down according to time-based usage patterns in different regions.

**Implementation Details:**
- Identify time-based usage patterns for each region
- Implement scheduled RU/s scaling using Azure Functions or Logic Apps
- Monitor usage to adjust schedules as patterns change

**Best For:**
- Applications with predictable time-based usage patterns
- Global applications spanning multiple time zones
- Cost-sensitive deployments

**Azure Function Example:**
```csharp
[FunctionName("ScaleCosmosDbRU")]
public static async Task Run([TimerTrigger("0 0 * * * *")] TimerInfo myTimer, ILogger log)
{
    // Get current time in different regions
    var utcNow = DateTime.UtcNow;
    var eastUsTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(utcNow, "Eastern Standard Time");
    var westEuropeTime = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(utcNow, "W. Europe Standard Time");
    
    // Scale US region during US business hours
    if (eastUsTime.Hour >= 9 && eastUsTime.Hour < 17)
    {
        await ScaleRegionalRU("eastus", 10000);
    }
    else
    {
        await ScaleRegionalRU("eastus", 5000);
    }
    
    // Scale Europe region during Europe business hours
    if (westEuropeTime.Hour >= 9 && westEuropeTime.Hour < 17)
    {
        await ScaleRegionalRU("westeurope", 10000);
    }
    else
    {
        await ScaleRegionalRU("westeurope", 5000);
    }
}
```

### Read-Write Separation Pattern

**Description:**  
Optimizes costs by maintaining a smaller number of write regions with higher RU/s and a larger number of read regions with lower RU/s.

**Implementation Details:**
- Configure a single write region (or minimal number of write regions)
- Deploy multiple read regions with lower RU/s provisioning
- Route write operations to write regions and read operations to read regions

**Best For:**
- Read-heavy workloads
- Applications with cost constraints
- Global applications with centralized write operations

## Data Synchronization Patterns

### Eventual Consistency Pattern

**Description:**  
Leverages Cosmos DB's native replication to achieve eventual consistency across regions with minimal application complexity.

**Implementation Details:**
- Configure Cosmos DB with appropriate consistency level (typically Eventual or Consistent Prefix)
- Allow Cosmos DB to handle replication automatically
- Design application to tolerate eventual consistency

**Best For:**
- Applications tolerant of eventual consistency
- Social media, content delivery, and catalog applications
- Systems prioritizing availability and performance over consistency

**Code Example:**
```csharp
// Configure client for eventual consistency
CosmosClientOptions options = new CosmosClientOptions
{
    ConsistencyLevel = ConsistencyLevel.Eventual,
    ApplicationPreferredRegions = new List<string> {"West US", "East US", "North Europe"},
};

CosmosClient client = new CosmosClient(connectionString, options);
```

### Change Feed Distribution Pattern

**Description:**  
Uses the Cosmos DB Change Feed to implement custom synchronization logic between regions or between Cosmos DB and other systems.

**Implementation Details:**
- Deploy Azure Functions with Cosmos DB triggers in each region
- Process change feed to implement custom synchronization logic
- Use event-driven architecture to propagate changes

**Best For:**
- Complex synchronization requirements
- Hybrid data architectures
- Systems requiring transformation during synchronization

**Azure Function Example:**
```csharp
[FunctionName("ProcessChangeFeed")]
public static async Task Run(
    [CosmosDBTrigger(
        databaseName: "mydb",
        containerName: "mycontainer",
        ConnectionStringSetting = "CosmosDBConnection",
        LeaseContainerName = "leases",
        CreateLeaseContainerIfNotExists = true)]IReadOnlyList<Document> documents,
    [CosmosDB(
        databaseName: "mydb",
        containerName: "synccontainer",
        ConnectionStringSetting = "CosmosDBConnection")]
        DocumentClient client,
    ILogger log)
{
    if (documents != null && documents.Count > 0)
    {
        foreach (var document in documents)
        {
            // Apply transformation logic
            var transformedDoc = TransformDocument(document);
            
            // Sync to target system
            await client.UpsertDocumentAsync(
                UriFactory.CreateDocumentCollectionUri("mydb", "synccontainer"),
                transformedDoc);
        }
    }
}
```

### Session Consistency Pattern

**Description:**  
Uses session tokens to ensure read-your-writes consistency for users while allowing globally distributed operations.

**Implementation Details:**
- Configure Cosmos DB with Session consistency level
- Store and transmit session tokens with user sessions
- Include session tokens in read requests

**Best For:**
- User-centric applications requiring read-your-writes consistency
- E-commerce and financial applications
- Applications where users interact primarily with their own data

**Code Example:**
```csharp
// After a write operation, capture session token
ItemResponse<MyDocument> response = await container.CreateItemAsync<MyDocument>(myDocument);
string sessionToken = response.Headers.Session;

// Store session token (e.g., in user session)
HttpContext.Session.SetString("CosmosSessionToken", sessionToken);

// For subsequent read operations
string sessionToken = HttpContext.Session.GetString("CosmosSessionToken");
ItemRequestOptions options = new ItemRequestOptions
{
    SessionToken = sessionToken
};

// Read with session token
ItemResponse<MyDocument> readResponse = await container.ReadItemAsync<MyDocument>(
    id, new PartitionKey(partitionKey), options);
```

## Disaster Recovery Patterns

### Multi-Region Failover Pattern

**Description:**  
Establishes automated failover capabilities across multiple regions to ensure continuous availability during regional outages.

**Implementation Details:**
- Configure Cosmos DB with automatic failover
- Prioritize regions for failover sequence
- Implement client-side retry policies
- Test failover scenarios regularly

**Best For:**
- Mission-critical applications
- Systems with stringent availability requirements
- Global applications requiring 24/7 operation

**Azure CLI Configuration:**
```bash
# Set up automatic failover priorities
az cosmosdb update \
  --name mycosmosdb \
  --resource-group myResourceGroup \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westus failoverPriority=1 isZoneRedundant=true \
  --locations regionName=northeurope failoverPriority=2 isZoneRedundant=true \
  --enable-automatic-failover true
```

### Regional Isolation Pattern

**Description:**  
Isolates critical workloads to specific regions to ensure that problems in one region do not impact operations in others.

**Implementation Details:**
- Segment workloads by region
- Implement separate connection strings for different regions
- Use container-level isolation for critical workloads

**Best For:**
- Applications with regulatory requirements for data sovereignty
- Systems with regionally isolated components
- Multi-tenant applications with tenant-specific requirements

**Code Example:**
```csharp
// Configure clients for different regional workloads
CosmosClientOptions usOptions = new CosmosClientOptions
{
    ApplicationRegion = "East US",
    EnableEndpointDiscovery = false  // Lock to specific region
};
CosmosClient usClient = new CosmosClient(usConnectionString, usOptions);

CosmosClientOptions euOptions = new CosmosClientOptions
{
    ApplicationRegion = "West Europe",
    EnableEndpointDiscovery = false  // Lock to specific region
};
CosmosClient euClient = new CosmosClient(euConnectionString, euOptions);
```

### Backup and Restore Pattern

**Description:**  
Implements point-in-time backups that can be restored to any region in case of catastrophic failures.

**Implementation Details:**
- Configure Cosmos DB continuous backup mode
- Implement regular backup validation
- Create automated restore procedures for different failure scenarios
- Test restore operations to validate recovery time objectives (RTOs)

**Best For:**
- Regulated industries requiring backup retention
- Applications with stringent data protection requirements
- Systems requiring point-in-time recovery capabilities

**Azure CLI Configuration:**
```bash
# Enable continuous backup with a 30-day retention
az cosmosdb update \
  --name mycosmosdb \
  --resource-group myResourceGroup \
  --backup-policy-type Continuous \
  --backup-interval 30 \
  --backup-retention 30
```

**Restore Example:**
```bash
# Restore to a point in time
az cosmosdb restore \
  --target-database-account-name myrestoredcosmosdb \
  --source-database-account-name mycosmosdb \
  --restore-timestamp "2023-04-15T04:00:00Z" \
  --location-name "East US" \
  --resource-group myResourceGroup
```

## Performance Optimization Patterns

### Geographical Routing Pattern

**Description:**  
Directs users to the nearest Cosmos DB region based on their location to minimize latency.

**Implementation Details:**
- Deploy Azure Traffic Manager or Azure Front Door
- Configure geographical routing rules
- Implement client-side region detection and routing

**Best For:**
- Global applications prioritizing user experience
- Content delivery applications
- Multi-region applications with regional user clusters

**Azure Traffic Manager Configuration:**
```json
{
  "properties": {
    "profileStatus": "Enabled",
    "trafficRoutingMethod": "Performance",
    "dnsConfig": {
      "relativeName": "myapp",
      "ttl": 30
    },
    "monitorConfig": {
      "protocol": "HTTPS",
      "port": 443,
      "path": "/api/health",
      "intervalInSeconds": 30,
      "timeoutInSeconds": 10,
      "toleratedNumberOfFailures": 3
    },
    "endpoints": [
      {
        "name": "EastUSEndpoint",
        "type": "Microsoft.Network/trafficManagerProfiles/azureEndpoints",
        "properties": {
          "targetResourceId": "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Web/sites/{site-name-east-us}",
          "endpointStatus": "Enabled",
          "weight": 100
        }
      },
      {
        "name": "WestEuropeEndpoint",
        "type": "Microsoft.Network/trafficManagerProfiles/azureEndpoints",
        "properties": {
          "targetResourceId": "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Web/sites/{site-name-west-europe}",
          "endpointStatus": "Enabled",
          "weight": 100
        }
      }
    ]
  }
}
```

### Global Index Pattern

**Description:**  
Implements a global search index that aggregates data from multiple regional Cosmos DB deployments to enable efficient global search capabilities.

**Implementation Details:**
- Deploy Azure Cognitive Search in multiple regions
- Use Cosmos DB Change Feed to update search indexes
- Implement a federated search layer to query across regions

**Best For:**
- Applications requiring complex search capabilities
- Content platforms with full-text search requirements
- E-commerce and catalog applications

**Architecture Diagram:**
```
[Cosmos DB Region 1] --> [Change Feed] --> [Azure Function] --> [Search Index Region 1]
[Cosmos DB Region 2] --> [Change Feed] --> [Azure Function] --> [Search Index Region 2]
                                                                       |
                                                                       v
[Client] --> [API Gateway] --> [Federated Search Service] --> [Search Indices]
```

### Data Locality Pattern

**Description:**  
Organizes data to ensure that frequently accessed data is stored in the regions where it is most commonly accessed.

**Implementation Details:**
- Analyze access patterns to identify data locality requirements
- Implement data placement strategies based on access patterns
- Use partition keys that promote data locality
- Implement TTL for region-specific transient data

**Best For:**
- Applications with strong regional data affinity
- Systems with predictable regional access patterns
- Applications with data sovereignty requirements

**Code Example:**
```csharp
// Example of storing data with region-specific TTL
var document = new MyDocument
{
    Id = "item-123",
    PartitionKey = "eu-region",
    Data = "...",
    // TTL for data that is only relevant in Europe for 24 hours
    TimeToLive = isEuropeanRegionalData ? 86400 : -1
};

await container.CreateItemAsync(document);
```

## Security Design Patterns

### Regional Private Endpoint Pattern

**Description:**  
Secures Cosmos DB access in each region using private endpoints to ensure data access only through authorized networks.

**Implementation Details:**
- Deploy private endpoints in each region
- Configure VNet integration
- Implement NSGs to restrict access
- Disable public network access

**Best For:**
- Enterprise applications with strict security requirements
- Financial and healthcare applications
- Systems handling sensitive personal data

**Azure CLI Configuration:**
```bash
# Create private endpoint for each region
az network private-endpoint create \
  --name myPrivateEndpoint-eastus \
  --resource-group myResourceGroup \
  --vnet-name myVNet-eastus \
  --subnet mySubnet \
  --private-connection-resource-id /subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb \
  --group-id Sql \
  --connection-name myConnection-eastus \
  --location eastus

az network private-endpoint create \
  --name myPrivateEndpoint-westus \
  --resource-group myResourceGroup \
  --vnet-name myVNet-westus \
  --subnet mySubnet \
  --private-connection-resource-id /subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb \
  --group-id Sql \
  --connection-name myConnection-westus \
  --location westus
```

### Regional RBAC Pattern

**Description:**  
Implements role-based access control with region-specific permissions to enable granular security across a global deployment.

**Implementation Details:**
- Define region-specific roles
- Assign permissions based on regional requirements
- Implement custom RBAC using Azure AD and Cosmos DB keys
- Use separate service principals for different regions

**Best For:**
- Multi-tenant applications with regional access restrictions
- Systems with region-specific compliance requirements
- Global applications with distributed operations teams

**Azure RBAC Example:**
```json
{
  "Name": "Cosmos DB East US Reader",
  "Description": "Can read data in East US region only",
  "Actions": [
    "Microsoft.DocumentDB/databaseAccounts/readMetadata/action",
    "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read"
  ],
  "NotActions": [],
  "DataActions": [
    "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read"
  ],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb"
  ],
  "Condition": "..."  // Condition that restricts to East US endpoint
}
```

### Key Rotation Pattern

**Description:**  
Implements automated key rotation for Cosmos DB accounts in all regions to maintain security without service disruption.

**Implementation Details:**
- Implement automated key rotation procedures
- Use Azure Key Vault to store and manage keys
- Configure applications to retrieve keys dynamically
- Implement key rotation history for audit purposes

**Best For:**
- Applications with stringent security requirements
- Regulated industries requiring regular key rotation
- Systems with compliance requirements for key management

**Azure Function Example:**
```csharp
[FunctionName("RotateCosmosDBKeys")]
public static async Task Run(
    [TimerTrigger("0 0 0 1 * *")] TimerInfo myTimer,  // Monthly rotation
    ILogger log)
{
    // Get the Cosmos DB account
    var cosmosDBAccount = await cosmosDBClient.DatabaseAccounts.GetAsync(
        resourceGroupName,
        accountName);
    
    // Regenerate the secondary key
    await cosmosDBClient.DatabaseAccounts.RegenerateKeyAsync(
        resourceGroupName,
        accountName,
        new RegenerateKeyParameters(KeyKind.Secondary));
    
    // Update applications to use the new secondary key
    await UpdateApplicationsWithNewKey("secondary");
    
    // Wait for propagation
    await Task.Delay(TimeSpan.FromHours(1));
    
    // Swap keys in applications
    await SwapApplicationKeys();
    
    // Wait for applications to switch to the new key
    await Task.Delay(TimeSpan.FromHours(1));
    
    // Regenerate the primary key
    await cosmosDBClient.DatabaseAccounts.RegenerateKeyAsync(
        resourceGroupName,
        accountName,
        new RegenerateKeyParameters(KeyKind.Primary));
    
    // Update the primary key in key vault
    await UpdateKeyVaultWithNewPrimaryKey();
}
```

## Monitoring and Maintenance Patterns

### Regional Health Monitoring Pattern

**Description:**  
Implements comprehensive monitoring for each Cosmos DB region to detect performance issues, outages, and anomalies.

**Implementation Details:**
- Deploy Azure Monitor in each region
- Configure region-specific alerts
- Implement custom metrics for regional performance
- Create regional health dashboards

**Best For:**
- Mission-critical applications
- Global deployments requiring 24/7 monitoring
- Systems with strict SLAs

**Azure Monitor Configuration:**
```json
{
  "properties": {
    "displayName": "Regional RU Consumption Alert",
    "description": "Alerts when RU consumption exceeds 80% of provisioned capacity in any region",
    "severity": 2,
    "enabled": true,
    "evaluationFrequency": "PT1M",
    "windowSize": "PT5M",
    "criteria": {
      "allOf": [
        {
          "metricName": "NormalizedRUConsumption",
          "metricNamespace": "Microsoft.DocumentDB/databaseAccounts",
          "name": "Metric1",
          "operator": "GreaterThan",
          "threshold": 80,
          "timeAggregation": "Average",
          "criterionType": "StaticThresholdCriterion",
          "dimensions": [
            {
              "name": "Region",
              "operator": "Include",
              "values": [
                "East US",
                "West US",
                "North Europe"
              ]
            }
          ]
        }
      ],
      "odata.type": "Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria"
    },
    "actions": [
      {
        "actionGroupId": "/subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.Insights/actionGroups/myActionGroup"
      }
    ]
  }
}
```

### Regional Maintenance Window Pattern

**Description:**  
Schedules maintenance activities for different regions at different times to ensure continuous global availability.

**Implementation Details:**
- Define non-overlapping maintenance windows for each region
- Implement automated maintenance procedures
- Configure traffic routing during maintenance
- Implement pre and post-maintenance health checks

**Best For:**
- Systems requiring zero-downtime maintenance
- Global applications with 24/7 availability requirements
- Applications with complex maintenance requirements

**Maintenance Schedule Example:**
```json
{
  "maintenanceWindows": [
    {
      "region": "East US",
      "dayOfWeek": "Sunday",
      "startHour": 2,
      "durationHours": 4,
      "maintenanceTasks": ["IndexRebuild", "PerformanceOptimization", "SecurityPatching"]
    },
    {
      "region": "West US",
      "dayOfWeek": "Wednesday",
      "startHour": 2,
      "durationHours": 4,
      "maintenanceTasks": ["IndexRebuild", "PerformanceOptimization", "SecurityPatching"]
    },
    {
      "region": "North Europe",
      "dayOfWeek": "Saturday",
      "startHour": 2,
      "durationHours": 4,
      "maintenanceTasks": ["IndexRebuild", "PerformanceOptimization", "SecurityPatching"]
    }
  ]
}
```

### Synthetic Transaction Pattern

**Description:**  
Executes synthetic transactions in each region to monitor performance, latency, and availability from a user perspective.

**Implementation Details:**
- Deploy Azure Functions in each region
- Implement synthetic transaction logic
- Record performance metrics
- Configure alerts for anomalies

**Best For:**
- User-facing applications
- Systems with strict performance SLAs
- Global applications with region-specific performance requirements

**Azure Function Example:**
```csharp
[FunctionName("SyntheticTransactionMonitor")]
public static async Task Run(
    [TimerTrigger("*/5 * * * *")] TimerInfo myTimer,  // Run every 5 minutes
    ILogger log)
{
    // Create test document
    var testDoc = new { id = Guid.NewGuid().ToString(), data = "test" };
    
    // Measure write latency
    var stopwatch = Stopwatch.StartNew();
    var writeResponse = await container.CreateItemAsync(testDoc);
    stopwatch.Stop();
    var writeLatency = stopwatch.ElapsedMilliseconds;
    
    // Measure read latency
    stopwatch.Restart();
    var readResponse = await container.ReadItemAsync<dynamic>(
        testDoc.id, new PartitionKey(testDoc.id));
    stopwatch.Stop();
    var readLatency = stopwatch.ElapsedMilliseconds;
    
    // Measure query latency
    var sql = "SELECT * FROM c WHERE c.id = @id";
    var queryDef = new QueryDefinition(sql).WithParameter("@id", testDoc.id);
    stopwatch.Restart();
    var iterator = container.GetItemQueryIterator<dynamic>(queryDef);
    while (iterator.HasMoreResults)
    {
        var response = await iterator.ReadNextAsync();
    }
    stopwatch.Stop();
    var queryLatency = stopwatch.ElapsedMilliseconds;
    
    // Log performance metrics
    log.LogMetric("WriteLatency", writeLatency, new Dictionary<string, object> {
        { "Region", Environment.GetEnvironmentVariable("REGION_NAME") },
        { "Operation", "Write" }
    });
    log.LogMetric("ReadLatency", readLatency, new Dictionary<string, object> {
        { "Region", Environment.GetEnvironmentVariable("REGION_NAME") },
        { "Operation", "Read" }
    });
    log.LogMetric("QueryLatency", queryLatency, new Dictionary<string, object> {
        { "Region", Environment.GetEnvironmentVariable("REGION_NAME") },
        { "Operation", "Query" }
    });
    
    // Clean up test document
    await container.DeleteItemAsync<dynamic>(testDoc.id, new PartitionKey(testDoc.id));
}
```

## Pattern Decision Matrix

Use this decision matrix to help select the right combination of patterns for your Cosmos DB global distribution architecture:

| **Requirement** | **Recommended Primary Pattern** | **Complementary Patterns** |
|-----------------|--------------------------------|----------------------------|
| Highest availability | Active-Active Pattern | Multi-Region Failover, Synthetic Transaction Pattern |
| Lowest global latency | Nearest Region Pattern | Geographical Routing, Data Locality |
| Cost optimization | Regional RU Provisioning | Read-Write Separation, Time-Based Scaling |
| Data sovereignty | Regional Isolation | Regional Private Endpoint, Regional RBAC |
| Strong consistency | Active-Passive Pattern | Consistency-Based Routing, Single Write Region |
| Complex conflict resolution | Custom Conflict Resolution | Change Feed Distribution, Conflict Feed |
| Real-time analytics | Global Index Pattern | Read-Heavy Region, Data Locality |
| Mission-critical workloads | Multi-Region Failover | Regional Health Monitoring, Synthetic Transaction |

## Conclusion

Designing an effective globally distributed Cosmos DB architecture requires careful consideration of various patterns and their combinations. By selecting the right patterns for your specific requirements, you can create a solution that balances performance, availability, cost, and complexity.

Remember that these patterns can be combined and adapted to meet specific needs. Always test your architecture thoroughly in a staging environment before deploying to production, and continuously monitor performance metrics to identify opportunities for optimization.

## References

- [Azure Cosmos DB Documentation](https://docs.microsoft.com/en-us/azure/cosmos-db/)
- [Multi-region writes in Azure Cosmos DB](https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-multi-master)
- [Azure Cosmos DB consistency levels](https://docs.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Azure Cosmos DB partition key design](https://docs.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Azure Cosmos DB conflict resolution](https://docs.microsoft.com/en-us/azure/cosmos-db/conflict-resolution-policies)
- [Azure Cosmos DB change feed](https://docs.microsoft.com/en-us/azure/cosmos-db/change-feed)
- [Azure Cosmos DB private endpoint](https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-configure-private-endpoints)
