## Overview

This comprehensive guide details the planning, implementation, monitoring, and optimization of globally distributed Azure Cosmos DB deployments. It provides actionable instructions, best practices, architectural patterns, and troubleshooting guidance for enterprise-grade implementations supporting high-volume environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Planning Your Global Distribution Strategy](#planning-your-global-distribution-strategy)
- [Implementation Steps](#implementation-steps)
- [Multi-Region Writes Configuration](#multi-region-writes-configuration)
- [Consistency Models and Trade-offs](#consistency-models-and-trade-offs)
- [Data Partitioning Strategies](#data-partitioning-strategies)
- [Availability and Disaster Recovery](#availability-and-disaster-recovery)
- [Performance Tuning and Optimization](#performance-tuning-and-optimization)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Cost Management Strategies](#cost-management-strategies)
- [Security Considerations](#security-considerations)
- [Integration with Other Azure Services](#integration-with-other-azure-services)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Advanced Scenarios](#advanced-scenarios)

## Prerequisites

### Azure Subscription Requirements

- Enterprise Agreement or Pay-As-You-Go subscription with appropriate spending limits
- Role-Based Access Control (RBAC) permissions:
  - Cosmos DB Account Contributor or Owner role
  - Network Contributor (if implementing VNet integration)
  - Key Vault Contributor (for managing secrets)

### Technical Prerequisites

- Azure CLI 2.40.0 or later
- Azure PowerShell Az module 7.5.0 or later
- Terraform 1.3.0+ (if using IaC approach)
- Azure Resource Manager templates (if using ARM deployment)
- Bicep 0.15.0+ (if using Bicep for deployments)

### Network Requirements

- Express Route or VPN connections between on-premises and Azure (for hybrid scenarios)
- Outbound connectivity to Cosmos DB endpoints from all client applications
- Sufficient bandwidth between regions for replication traffic
- Network Security Group (NSG) rules allowing required traffic

## Planning Your Global Distribution Strategy

### Region Selection Criteria

When selecting Azure regions for your globally distributed Cosmos DB deployment, consider:

1. **Latency to end-users**: 
   - Use Azure speed test tools to measure latency from user locations to different Azure regions
   - Prioritize regions that minimize round-trip time for your largest user bases

2. **Regulatory and data sovereignty requirements**:
   - Ensure compliance with regional data residency requirements
   - Consider paired regions for disaster recovery that comply with same regulations

3. **Service availability by region**:
   - Verify Cosmos DB API availability in target regions
   - Confirm availability zone support if required

4. **Cost considerations**:
   - Be aware that pricing varies by region
   - Evaluate reserved capacity options for write regions

5. **Paired regions**:
   - Leverage Azure's region pairs for coordinated platform updates and prioritized recovery

### Distribution Strategy Decision Matrix

| Scenario | Recommended Strategy | Advantages | Considerations |
|----------|---------------------|------------|----------------|
| Global read-heavy workload | Single write region with multiple read regions | Cost-efficient, simplifies consistency management | Higher write latency for global users |
| Write-intensive global application | Multi-region writes | Low latency writes for all users, improved availability | Higher RU cost, requires conflict resolution strategy |
| Regional applications with global DR | Regional read/write pairs with additional read regions | Balanced performance and cost | More complex routing logic required |
| Compliance-focused deployment | Geography-specific clusters with restricted replication | Meets data sovereignty requirements | May require multiple Cosmos DB accounts |

## Implementation Steps

### 1. Create a Globally Distributed Cosmos DB Account

#### Using Azure Portal

1. Navigate to Azure Portal and create a new Cosmos DB account
2. Select the appropriate API (SQL, MongoDB, Cassandra, etc.)
3. Configure initial write region and read regions
4. Set the default consistency level
5. Enable multi-region writes if required
6. Configure network, backup, and encryption settings

#### Using Azure CLI

```bash
# Create a Cosmos DB account with global distribution
az cosmosdb create \\
    --name \"your-globally-distributed-account\" \\
    --resource-group \"your-resource-group\" \\
    --kind GlobalDocumentDB \\
    --locations regionName=\"East US\" failoverPriority=0 isZoneRedundant=true \\
    --locations regionName=\"West Europe\" failoverPriority=1 isZoneRedundant=true \\
    --locations regionName=\"Southeast Asia\" failoverPriority=2 isZoneRedundant=true \\
    --default-consistency-level \"Session\" \\
    --enable-multiple-write-locations true \\
    --enable-automatic-failover true
```

#### Using ARM Template

```json
{
  \"$schema\": \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\",
  \"contentVersion\": \"1.0.0.0\",
  \"parameters\": {
    \"accountName\": {
      \"type\": \"string\",
      \"defaultValue\": \"your-globally-distributed-account\",
      \"metadata\": {
        \"description\": \"Cosmos DB account name\"
      }
    },
    \"primaryRegion\": {
      \"type\": \"string\",
      \"defaultValue\": \"East US\",
      \"metadata\": {
        \"description\": \"Primary write region\"
      }
    },
    \"secondaryRegion\": {
      \"type\": \"string\",
      \"defaultValue\": \"West Europe\",
      \"metadata\": {
        \"description\": \"Secondary region\"
      }
    },
    \"tertiaryRegion\": {
      \"type\": \"string\",
      \"defaultValue\": \"Southeast Asia\",
      \"metadata\": {
        \"description\": \"Tertiary region\"
      }
    },
    \"defaultConsistencyLevel\": {
      \"type\": \"string\",
      \"defaultValue\": \"Session\",
      \"allowedValues\": [ \"Eventual\", \"ConsistentPrefix\", \"Session\", \"BoundedStaleness\", \"Strong\" ],
      \"metadata\": {
        \"description\": \"Default consistency level\"
      }
    },
    \"enableMultipleWriteLocations\": {
      \"type\": \"bool\",
      \"defaultValue\": true,
      \"metadata\": {
        \"description\": \"Enable multi-region writes\"
      }
    }
  },
  \"resources\": [
    {
      \"type\": \"Microsoft.DocumentDB/databaseAccounts\",
      \"apiVersion\": \"2022-05-15\",
      \"name\": \"[parameters('accountName')]\",
      \"location\": \"[parameters('primaryRegion')]\",
      \"kind\": \"GlobalDocumentDB\",
      \"properties\": {
        \"consistencyPolicy\": {
          \"defaultConsistencyLevel\": \"[parameters('defaultConsistencyLevel')]\"
        },
        \"locations\": [
          {
            \"locationName\": \"[parameters('primaryRegion')]\",
            \"failoverPriority\": 0,
            \"isZoneRedundant\": true
          },
          {
            \"locationName\": \"[parameters('secondaryRegion')]\",
            \"failoverPriority\": 1,
            \"isZoneRedundant\": true
          },
          {
            \"locationName\": \"[parameters('tertiaryRegion')]\",
            \"failoverPriority\": 2,
            \"isZoneRedundant\": true
          }
        ],
        \"enableMultipleWriteLocations\": \"[parameters('enableMultipleWriteLocations')]\",
        \"enableAutomaticFailover\": true,
        \"capabilities\": []
      }
    }
  ]
}
```

#### Using Terraform

```hcl
resource \"azurerm_cosmosdb_account\" \"global_cosmos\" {
  name                = \"your-globally-distributed-account\"
  location            = \"East US\"
  resource_group_name = \"your-resource-group\"
  offer_type          = \"Standard\"
  kind                = \"GlobalDocumentDB\"

  enable_automatic_failover = true
  enable_multiple_write_locations = true

  consistency_policy {
    consistency_level       = \"Session\"
  }

  geo_location {
    location          = \"East US\"
    failover_priority = 0
    zone_redundant    = true
  }

  geo_location {
    location          = \"West Europe\"
    failover_priority = 1
    zone_redundant    = true
  }

  geo_location {
    location          = \"Southeast Asia\"
    failover_priority = 2
    zone_redundant    = true
  }
}
```

### 2. Create Database and Containers with Appropriate Throughput

When creating databases and containers in a globally distributed Cosmos DB account:

#### Throughput Provisioning Options

- **Shared Database Throughput**: Cost-effective for multiple containers with varying workloads
- **Dedicated Container Throughput**: Better isolation and predictable performance for critical containers
- **Autoscale Throughput**: Recommended for variable workloads with peaks and valleys

#### Container Creation with Appropriate Partition Keys

```csharp
// C# SDK example - Creating a container with a composite partition key
DatabaseResponse database = await cosmosClient.CreateDatabaseIfNotExistsAsync(
    id: \"RetailDatabase\",
    throughput: 10000);

ContainerProperties containerProperties = new ContainerProperties(
    id: \"ProductCatalog\",
    partitionKeyPaths: new List<string> { \"/categoryId\", \"/region\" });

// Add indexing policy for global distribution optimization
containerProperties.IndexingPolicy = new IndexingPolicy
{
    Automatic = true,
    IndexingMode = IndexingMode.Consistent,
    IncludedPaths = { new IncludedPath { Path = \"/*\" } },
    ExcludedPaths = { new ExcludedPath { Path = \"/description/*\" } }
};

// Configure Time-To-Live for automatic document expiration
containerProperties.DefaultTimeToLive = -1; // no expiration by default

ContainerResponse containerResponse = await database.Database.CreateContainerIfNotExistsAsync(
    containerProperties,
    throughput: 10000);
```

#### Configure Indexing Policy for Global Distribution

Optimizing indexing for globally distributed workloads:

```json
{
  \"indexingMode\": \"consistent\",
  \"automatic\": true,
  \"includedPaths\": [
    {
      \"path\": \"/*\",
      \"indexes\": [
        {
          \"kind\": \"Range\",
          \"dataType\": \"Number\",
          \"precision\": -1
        },
        {
          \"kind\": \"Range\",
          \"dataType\": \"String\",
          \"precision\": -1
        }
      ]
    }
  ],
  \"excludedPaths\": [
    {
      \"path\": \"/largeTextProperty/*\"
    },
    {
      \"path\": \"/infrequentlyQueriedProperty/*\"
    }
  ],
  \"spatialIndexes\": [
    {
      \"path\": \"/location/*\",
      \"types\": [
        \"Point\",
        \"Polygon\"
      ]
    }
  ],
  \"compositeIndexes\": [
    [
      {
        \"path\": \"/regionId\",
        \"order\": \"ascending\"
      },
      {
        \"path\": \"/timestamp\",
        \"order\": \"descending\"
      }
    ]
  ]
}
```

## Multi-Region Writes Configuration

### Enabling Multi-Region Writes

Multi-region writes can be enabled during account creation or updated later:

```powershell
# PowerShell example to enable multi-region writes on existing account
Update-AzCosmosDBAccount -ResourceGroupName \"your-resource-group\" `
                         -Name \"your-cosmos-account\" `
                         -EnableMultipleWriteLocations $true
```

### Conflict Resolution Strategies

When enabling multi-region writes, you must configure a conflict resolution policy:

1. **Last-Write-Wins (LWW)**: Default policy using the _ts property
2. **Custom Property**: Define a specific numeric property for conflict resolution
3. **Stored Procedure**: Implement custom conflict resolution logic
4. **Conflict Feed**: Manually resolve conflicts by reading conflict feed

#### Configuring a Custom Conflict Resolution Policy

```csharp
// C# SDK example - Configure a container with custom conflict resolution
ContainerProperties containerProperties = new ContainerProperties(\"Orders\", \"/customerId\");

// Configure conflict resolution policy with custom property
containerProperties.ConflictResolutionPolicy = new ConflictResolutionPolicy
{
    Mode = ConflictResolutionMode.LastWriterWins,
    ConflictResolutionPath = \"/modifiedTimestamp\"
};

Container container = await database.CreateContainerIfNotExistsAsync(
    containerProperties,
    throughput: 10000);
```

#### Implementing a Custom Conflict Resolution Stored Procedure

```javascript
// JavaScript stored procedure for custom conflict resolution
function resolveConflict(conflictingItems) {
    var context = getContext();
    var collection = context.getCollection();
    var response = context.getResponse();
    
    if (!conflictingItems || conflictingItems.length == 0) {
        response.setBody(\"No conflicts to resolve\");
        return;
    }
    
    // Find the item with the highest priority field value
    var winningItem = conflictingItems[0];
    for (var i = 1; i < conflictingItems.length; i++) {
        if (conflictingItems[i].priority > winningItem.priority) {
            winningItem = conflictingItems[i];
        }
    }
    
    // Replace any existing item with the winning item
    var isAccepted = collection.replaceDocument(
        conflictingItems[0]._self,
        winningItem,
        function(err, replacedDocument) {
            if (err) throw err;
            response.setBody(replacedDocument);
        });
    
    if (!isAccepted) throw new Error(\"Conflict resolution failed\");
}
```

## Consistency Models and Trade-offs

### Consistency Level Selection Guidelines

| Consistency Level | Description | Use Cases | Impact on Performance | RU Cost |
|-------------------|-------------|-----------|------------------------|---------|
| Strong | Linearizability guarantee, reads reflect latest writes | Financial transactions, inventory systems | Highest latency, lowest availability | Highest |
| Bounded Staleness | Reads lag behind writes by K versions or T time interval | Near-real-time monitoring, ticketing systems | Moderate latency and availability | High |
| Session | Consistent prefix with monotonic reads/writes for a session | User profile management, shopping carts | Good balance of performance and consistency | Medium |
| Consistent Prefix | Reads never see out-of-order writes | Social media feeds, content management | Lower latency, higher availability | Lower |
| Eventual | Lowest consistency guarantee | Analytics, non-critical data | Lowest latency, highest availability | Lowest |

### Implementing Session Consistency Example

```csharp
// C# SDK example - Using session consistency
CosmosClientOptions options = new CosmosClientOptions
{
    ConnectionMode = ConnectionMode.Direct,
    ConsistencyLevel = ConsistencyLevel.Session
};

CosmosClient client = new CosmosClient(
    accountEndpoint: \"https://your-account.documents.azure.com:443/\",
    authKeyOrResourceToken: \"your-auth-key\",
    clientOptions: options);

// Get a container reference with session token tracking
Container container = client.GetContainer(\"RetailDatabase\", \"Orders\");

// Perform operations with session consistency
try
{
    // Create a new item
    ItemResponse<Order> createResponse = 
        await container.CreateItemAsync<Order>(newOrder);
    
    // Session token is automatically tracked by the client
    
    // Read the created item - guaranteed to reflect the write we just did
    ItemResponse<Order> readResponse = 
        await container.ReadItemAsync<Order>(
            newOrder.Id, 
            new PartitionKey(newOrder.CustomerId));
}
catch (CosmosException ex)
{
    // Handle exceptions
}
```

### Mixed Consistency Scenarios

For applications requiring different consistency levels for different operations:

```csharp
// Use client-level default consistency for most operations
CosmosClient defaultClient = new CosmosClient(
    accountEndpoint: \"https://your-account.documents.azure.com:443/\",
    authKeyOrResourceToken: \"your-auth-key\",
    clientOptions: new CosmosClientOptions
    {
        ConsistencyLevel = ConsistencyLevel.Session
    });

// Create a separate client for operations requiring strong consistency
CosmosClient strongConsistencyClient = new CosmosClient(
    accountEndpoint: \"https://your-account.documents.azure.com:443/\",
    authKeyOrResourceToken: \"your-auth-key\",
    clientOptions: new CosmosClientOptions
    {
        ConsistencyLevel = ConsistencyLevel.Strong
    });

// Use the appropriate client based on operation requirements
async Task<Order> GetOrderForCheckout(string orderId, string customerId)
{
    // Use strong consistency for critical checkout flow
    Container ordersContainer = strongConsistencyClient.GetContainer(
        \"RetailDatabase\", \"Orders\");
        
    ItemResponse<Order> response = await ordersContainer.ReadItemAsync<Order>(
        orderId, new PartitionKey(customerId));
        
    return response.Resource;
}

async Task<List<Product>> GetRecommendedProducts(string customerId)
{
    // Use session consistency for non-critical recommendation flow
    Container productsContainer = defaultClient.GetContainer(
        \"RetailDatabase\", \"Products\");
        
    // Query with session consistency is sufficient here
    List<Product> products = new List<Product>();
    
    FeedIterator<Product> resultSet = productsContainer.GetItemQueryIterator<Product>(
        queryDefinition: new QueryDefinition(
            \"SELECT * FROM p WHERE p.recommendedFor = @customerId\")
            .WithParameter(\"@customerId\", customerId));
            
    while (resultSet.HasMoreResults)
    {
        foreach (var product in await resultSet.ReadNextAsync())
        {
            products.Add(product);
        }
    }
    
    return products;
}
```

## Data Partitioning Strategies

### Partition Key Selection Criteria

The ideal partition key for globally distributed deployments should:

1. Result in even distribution of both data storage and request throughput
2. Have high cardinality (many distinct values)
3. Minimize cross-partition queries for common access patterns
4. Align with regional access patterns when possible

### Partition Key Strategies for Common Scenarios

| Scenario | Recommended Partition Keys | Advantages |
|----------|---------------------------|------------|
| User profiles and preferences | `/userId` | Natural distribution, region-specific queries possible with composite indexes |
| IoT telemetry | `/deviceId` or `/deviceId/yyyy-mm` | Even distribution, limits partition size with time-based suffix |
| E-commerce platform | `/customerId` or `/productCategory/regionId` | Aligns with access patterns, enables regional query optimization |
| Content management | `/contentType/regionId` | Supports region-specific content delivery |
| Multi-tenant applications | `/tenantId` | Clean isolation between tenants |

### Synthetic Partition Keys

For scenarios with low cardinality natural keys, implement synthetic partition keys:

```csharp
// Generate a synthetic partition key for better distribution
public string GenerateSyntheticPartitionKey(string lowCardinalityValue, int bucketCount = 20)
{
    // Create a hash of the original value
    using (SHA256 sha256 = SHA256.Create())
    {
        byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(lowCardinalityValue));
        int hashValue = BitConverter.ToInt32(hashBytes, 0);
        
        // Modulo to get a bucket number within desired range
        int bucketNumber = Math.Abs(hashValue % bucketCount);
        
        // Return original value with bucket prefix for logical grouping
        return $\"{bucketNumber}_{lowCardinalityValue}\";
    }
}

// Usage example
async Task CreateItemWithSyntheticPartitionKey(Container container, Document document)
{
    // For a schema with regionId as a low-cardinality field
    string region = document.RegionId;
    document.PartitionKey = GenerateSyntheticPartitionKey(region);
    
    await container.CreateItemAsync(document, new PartitionKey(document.PartitionKey));
}
```

### Handling Hot Partitions

Strategies for addressing hot partitions in globally distributed scenarios:

1. **Partition splitting** - Implement logic to detect and split hot partitions:

```csharp
// Monitor RU consumption by partition key range
async Task<List<HotPartitionInfo>> IdentifyHotPartitions(
    CosmosClient client, 
    string databaseName, 
    string containerName, 
    double thresholdPercentage = 80.0)
{
    Container container = client.GetContainer(databaseName, containerName);
    ContainerProperties properties = await container.ReadContainerAsync();
    
    int provisionedRUs = properties.Resource.Throughput ?? 0;
    double thresholdRUs = provisionedRUs * (thresholdPercentage / 100.0);
    
    // Get partition key ranges
    FeedIterator<PartitionKeyRange> rangeIterator = 
        container.GetPartitionKeyRangesIterator();
    
    List<HotPartitionInfo> hotPartitions = new List<HotPartitionInfo>();
    
    while (rangeIterator.HasMoreResults)
    {
        foreach (PartitionKeyRange range in await rangeIterator.ReadNextAsync())
        {
            // Use diagnostics to get RU consumption per partition
            // This is simplified - actual implementation would aggregate metrics
            // from Azure Monitor or Cosmos DB metrics API
            double partitionRUConsumption = await GetPartitionRUConsumption(
                client, databaseName, containerName, range.Id);
                
            if (partitionRUConsumption > thresholdRUs)
            {
                hotPartitions.Add(new HotPartitionInfo
                {
                    PartitionKeyRangeId = range.Id,
                    RUConsumption = partitionRUConsumption,
                    PercentageOfTotal = (partitionRUConsumption / provisionedRUs) * 100
                });
            }
        }
    }
    
    return hotPartitions;
}

// If hot partitions are detected, implement remediation
async Task MitigateHotPartition(HotPartitionInfo hotPartition)
{
    // Implement strategies such as:
    // 1. Increase overall RU provisioning
    // 2. Implement caching for hot items
    // 3. Consider redesigning partition key
    // 4. Implement client-side request throttling/backoff
}
```

2. **Regional sharding** - Implement application-level sharding based on regions:

```csharp
// Example of regional sharding approach
public class RegionalShardingStrategy
{
    private readonly Dictionary<string, CosmosClient> _regionalClients;
    private readonly Dictionary<string, string> _regionToAccountMap;
    
    public RegionalShardingStrategy(Dictionary<string, string> regionToAccountMap, string authKey)
    {
        _regionToAccountMap = regionToAccountMap;
        _regionalClients = new Dictionary<string, CosmosClient>();
        
        // Initialize clients for each regional account
        foreach (var region in regionToAccountMap.Keys)
        {
            string endpoint = regionToAccountMap[region];
            
            _regionalClients[region] = new CosmosClient(
                accountEndpoint: endpoint,
                authKeyOrResourceToken: authKey,
                clientOptions: new CosmosClientOptions
                {
                    ApplicationRegion = region,
                    ConnectionMode = ConnectionMode.Direct
                });
        }
    }
    
    // Route operations to the appropriate regional client
    public Container GetContainerForRegion(string region, string databaseName, string containerName)
    {
        if (!_regionalClients.ContainsKey(region))
        {
            throw new ArgumentException($\"No client configured for region {region}\");
        }
        
        return _regionalClients[region].GetContainer(databaseName, containerName);
    }
    
    // Route operations based on user/customer region
    public async Task<T> CreateItemInAppropriateRegion<T>(
        T item, 
        string userRegion,
        string databaseName, 
        string containerName,
        Func<T, string> partitionKeySelector)
    {
        Container container = GetContainerForRegion(userRegion, databaseName, containerName);
        
        ItemResponse<T> response = await container.CreateItemAsync(
            item, new PartitionKey(partitionKeySelector(item)));
            
        return response.Resource;
    }
}
```

## Availability and Disaster Recovery

### Multi-Region Failover Configuration

#### Automatic Failover Policy

Configure automatic failover priorities for non-write-region deployments:

```powershell
# PowerShell example to set failover priorities
Update-AzCosmosDBAccount -ResourceGroupName \"your-resource-group\" `
                         -Name \"your-cosmos-account\" `
                         -LocationObject @(
                            @{ \"locationName\"=\"East US\"; \"failoverPriority\"=0 },
                            @{ \"locationName\"=\"West Europe\"; \"failoverPriority\"=1 },
                            @{ \"locationName\"=\"Southeast Asia\"; \"failoverPriority\"=2 }
                         ) `
                         -EnableAutomaticFailover $true
```

#### Manual Failover Strategy

For planned migrations or testing:

```azurecli
# Initiate a manual failover
az cosmosdb failover-priority-change \\
    --name \"your-cosmos-account\" \\
    --resource-group \"your-resource-group\" \\
    --failover-parameters '[{\"failoverPriority\":0,\"locationName\":\"West Europe\"}, {\"failoverPriority\":1,\"locationName\":\"East US\"}, {\"failoverPriority\":2,\"locationName\":\"Southeast Asia\"}]'
```

### Client-Side Disaster Recovery Strategy

Implement robust client-side retry and failover handling:

```csharp
// Configure resilient client with retries and regional failover
CosmosClientOptions resilientOptions = new CosmosClientOptions
{
    ConnectionMode = ConnectionMode.Direct,
    // Preferred regions in order of preference - client will auto-failover
    ApplicationPreferredRegions = new List<string> { \"East US\", \"West Europe\", \"Southeast Asia\" },
    MaxRetryAttemptsOnRateLimitedRequests = 9,
    MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30),
    RequestTimeout = TimeSpan.FromSeconds(10),
    OpenTcpConnectionTimeout = TimeSpan.FromSeconds(5)
};

CosmosClient resilientClient = new CosmosClient(
    accountEndpoint: \"https://your-account.documents.azure.com:443/\",
    authKeyOrResourceToken: \"your-auth-key\",
    clientOptions: resilientOptions);

// Implement additional custom resilience if needed
public async Task<T> ExecuteWithRegionalFailover<T>(
    Func<CosmosClient, Task<T>> operation,
    string[] regionPriorities,
    int maxRetries = 3)
{
    // Try operation against each regional endpoint
    Exception lastException = null;
    
    foreach (string region in regionPriorities)
    {
        CosmosClientOptions regionalOptions = new CosmosClientOptions
        {
            ApplicationRegion = region,
            ConnectionMode = ConnectionMode.Direct
        };
        
        using CosmosClient regionalClient = new CosmosClient(
            \"https://your-account.documents.azure.com:443/\",
            \"your-auth-key\",
            regionalOptions);
            
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                // Execute the operation
                return await operation(regionalClient);
            }
            catch (CosmosException ex) when 
                (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                 ex.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable)
            {
                // Exponential backoff with jitter
                int baseDelayMs = 100 * (int)Math.Pow(2, attempt);
                int jitterMs = new Random().Next(0, 100);
                await Task.Delay(baseDelayMs + jitterMs);
                
                lastException = ex;
            }
            catch (Exception ex)
            {
                // Non-retriable error, move to next region
                lastException = ex;
                break;
            }
        }
    }
    
    // If we get here, all regions failed
    throw new AggregateException(\"All regions failed\", lastException);
}
```

### RPO and RTO Planning

| Recovery Strategy | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) | Implementation Approach |
|-------------------|---------------------------------|-------------------------------|--------------------------|
| Multi-region writes | ~0 (near zero data loss) | 0 (continuous availability) | Enable multi-region writes with appropriate consistency level |
| Automatic failover | 0-5 minutes (depends on consistency) | 0-10 minutes (depends on detection) | Configure automatic failover priorities |
| Manual failover | 0-60 minutes (depends on process) | 15-60 minutes (depends on process) | Document manual failover procedures and practice regularly |
| Backup and restore | 24 hours (default backup interval) | 2-8 hours (depends on data size) | Configure continuous backup with point-in-time restore |

## Performance Tuning and Optimization

### SDK Connection Configuration Best Practices

Optimize client connections for global distribution:

```csharp
// Configure optimal connection mode for distributed environments
CosmosClientOptions distributedOptions = new CosmosClientOptions
{
    // Direct mode for better performance with TCP protocol
    ConnectionMode = ConnectionMode.Direct,
    
    // Optimize connection pooling
    GatewayModeMaxConnectionLimit = 1000,
    MaxTcpConnectionsPerEndpoint = 1000,
    
    // Regional preferences matching user distribution
    ApplicationPreferredRegions = new List<string> { 
        \"East US\", 
        \"West Europe\", 
        \"Southeast Asia\" 
    },
    
    // Enable connection sharing between clients
    EnableTcpConnectionEndpointRediscovery = true,
    
    // Optimize SDK caching behaviors
    LimitToEndpoint = false,
    
    // Configure resilience
    RequestTimeout = TimeSpan.FromSeconds(10),
    OpenTcpConnectionTimeout = TimeSpan.FromSeconds(5),
    IdleTcpConnectionTimeout = TimeSpan.FromMinutes(30),
    
    // Optimize throughput with bulk execution
    AllowBulkExecution = true
};

CosmosClient optimizedClient = new CosmosClient(
    accountEndpoint: \"https://your-account.documents.azure.com:443/\",
    authKeyOrResourceToken: \"your-auth-key\",
    clientOptions: distributedOptions);
```

### Query Optimization for Global Distribution

Optimize queries for globally distributed scenarios:

```csharp
// Optimize query execution in globally distributed environment

// 1. Use parameterized queries to leverage query plan caching
QueryDefinition parameterizedQuery = new QueryDefinition(
    \"SELECT * FROM c WHERE c.type = @type AND c.regionId = @regionId\")
    .WithParameter(\"@type\", \"product\")
    .WithParameter(\"@regionId\", \"europe\");

// 2. Include partition key in query to avoid cross-partition execution
QueryDefinition partitionedQuery = new QueryDefinition(
    \"SELECT * FROM c WHERE c.partitionKey = @partitionKey AND c.type = @type\")
    .WithParameter(\"@partitionKey\", \"electronics\")
    .WithParameter(\"@type\", \"product\");

// 3. Configure optimal query options
QueryRequestOptions optimizedOptions = new QueryRequestOptions
{
    // Specify partition key when possible to avoid fan-out
    PartitionKey = new PartitionKey(\"electronics\"),
    
    // Limit concurrent operations for large result sets
    MaxConcurrency = 10,
    
    // Enable larger page sizes for fewer network round trips
    MaxItemCount = 1000,
    
    // Disable populateQueryMetrics in production for performance
    PopulateQueryMetrics = false
};

// 4. Use FeedIterator for efficient paging through large result sets
FeedIterator<Product> feedIterator = container.GetItemQueryIterator<Product>(
    parameterizedQuery,
    requestOptions: optimizedOptions);

// 5. Process results in efficient batches
List<Product> products = new List<Product>();
int totalItemsProcessed = 0;
int batchNumber = 0;

while (feedIterator.HasMoreResults)
{
    batchNumber++;
    FeedResponse<Product> batchResponse = await feedIterator.ReadNextAsync();
    
    // Track RU consumption
    double requestCharge = batchResponse.RequestCharge;
    
    // Process batch
    foreach (Product product in batchResponse)
    {
        products.Add(product);
        totalItemsProcessed++;
    }
    
    Console.WriteLine($\"Batch {batchNumber}: Processed {batchResponse.Count} items, \" +
                      $\"Request Units: {requestCharge}, \" +
                      $\"Total: {totalItemsProcessed}\");
}
```

### Bulk Operations for High Throughput

Implement efficient bulk operations for high throughput scenarios:

```csharp
// Efficient bulk import using Tasks and dynamic RU management
public async Task BulkImportItems<T>(
    Container container,
    IReadOnlyCollection<T> items,
    Func<T, string> partitionKeySelector,
    int maxConcurrentTasks = 100,
    int maxItemsInBatch = 100)
{
    // Group items by partition key for efficient processing
    var itemsByPartitionKey = items
        .GroupBy(item => partitionKeySelector(item))
        .ToDictionary(g => g.Key, g => g.ToList());
    
    // Configure throttling and concurrency
    SemaphoreSlim concurrencySemaphore = new SemaphoreSlim(maxConcurrentTasks);
    List<Task> tasks = new List<Task>();
    
    foreach (var partitionGroup in itemsByPartitionKey)
    {
        string partitionKey = partitionGroup.Key;
        List<T> partitionItems = partitionGroup.Value;
        
        // Process each partition in batches
        for (int i = 0; i < partitionItems.Count; i += maxItemsInBatch)
        {
            int batchSize = Math.Min(maxItemsInBatch, partitionItems.Count - i);
            var batch = partitionItems.GetRange(i, batchSize);
            
            // Wait for semaphore before starting new task
            await concurrencySemaphore.WaitAsync();
            
            // Create task for batch
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await ProcessBatch(container, batch, partitionKey);
                }
                finally
                {
                    // Release semaphore when task completes
                    concurrencySemaphore.Release();
                }
            }));
        }
    }
    
    // Wait for all tasks to complete
    await Task.WhenAll(tasks);
}

private async Task ProcessBatch<T>(Container container, List<T> batch, string partitionKey)
{
    // For small batches, use parallel tasks
    if (batch.Count <= 10)
    {
        List<Task<ItemResponse<T>>> concurrentTasks = batch
            .Select(item => container.CreateItemAsync(
                item, 
                new PartitionKey(partitionKey),
                new ItemRequestOptions { EnableContentResponseOnWrite = false }))
            .ToList();
            
        await Task.WhenAll(concurrentTasks);
        return;
    }
    
    // For larger batches, use TransactionalBatch for items with same partition key
    try
    {
        TransactionalBatchResponse batchResponse = 
            await container.CreateTransactionalBatch(new PartitionKey(partitionKey))
                .ExecuteAsync();
                
        if (!batchResponse.IsSuccessStatusCode)
        {
            // Handle batch failure (may need individual retries)
            throw new Exception($\"Batch operation failed: {batchResponse.StatusCode}\");
        }
    }
    catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
    {
        // Implement exponential backoff and retry logic
        await Task.Delay(TimeSpan.FromMilliseconds(ex.RetryAfter.TotalMilliseconds));
        await ProcessBatch(container, batch, partitionKey);
    }
}
```

### Regional Caching Strategy

Implement regional caching to reduce latency and Cosmos DB request costs:

```csharp
// Example implementation of regional Redis caching with Cosmos DB
public class RegionalCachingStrategy<T> where T : class
{
    private readonly Container _cosmosContainer;
    private readonly IDistributedCache _cache;
    private readonly TimeSpan _cacheDuration;
    
    public RegionalCachingStrategy(
        Container cosmosContainer,
        IDistributedCache cache,
        TimeSpan? cacheDuration = null)
    {
        _cosmosContainer = cosmosContainer;
        _cache = cache;
        _cacheDuration = cacheDuration ?? TimeSpan.FromMinutes(10);
    }
    
    public async Task<T> GetItemAsync(string id, string partitionKey)
    {
        // Create cache key incorporating id and partition key
        string cacheKey = $\"{typeof(T).Name}:{partitionKey}:{id}\";
        
        // Try to get from cache first
        try
        {
            string cachedData = await _cache.GetStringAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedData))
            {
                // Item found in cache, deserialize and return
                return JsonConvert.DeserializeObject<T>(cachedData);
            }
        }
        catch (Exception ex)
        {
            // Log cache miss or error
            Console.WriteLine($\"Cache miss or error: {ex.Message}\");
        }
        
        // Cache miss, retrieve from Cosmos DB
        try
        {
            ItemResponse<T> response = await _cosmosContainer.ReadItemAsync<T>(
                id, new PartitionKey(partitionKey));
                
            T item = response.Resource;
            
            // Update cache with retrieved item
            await _cache.SetStringAsync(
                cacheKey,
                JsonConvert.SerializeObject(item),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _cacheDuration
                });
                
            return item;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Item not found
            return null;
        }
    }
    
    public async Task UpsertItemAsync(T item, string id, string partitionKey)
    {
        // Update Cosmos DB
        await _cosmosContainer.UpsertItemAsync(item, new PartitionKey(partitionKey));
        
        // Update cache
        string cacheKey = $\"{typeof(T).Name}:{partitionKey}:{id}\";
        await _cache.SetStringAsync(
            cacheKey,
            JsonConvert.SerializeObject(item),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _cacheDuration
            });
    }
    
    public async Task DeleteItemAsync(string id, string partitionKey)
    {
        // Delete from Cosmos DB
        await _cosmosContainer.DeleteItemAsync<T>(id, new PartitionKey(partitionKey));
        
        // Remove from cache
        string cacheKey = $\"{typeof(T).Name}:{partitionKey}:{id}\";
        await _cache.RemoveAsync(cacheKey);
    }
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

Set up comprehensive monitoring for globally distributed deployments:

| Metric Category | Key Metrics | Description | Recommended Threshold |
|-----------------|-------------|-------------|-----------------------|
| Availability | Service Availability | Cosmos DB service uptime by region | Alert at <99.99% |
| | Failed Requests | Count of requests with 4xx/5xx responses | Alert at >1% of total |
| Performance | P95/P99 Latency | Response time for operations | Alert at >100ms P95 |
| | Throttled Requests | Requests that received 429 responses | Alert at >0.1% of total |
| | Max RU/s Consumption | Peak RU usage compared to provisioned | Alert at >90% of provisioned |
| Data Distribution | Data Size | Storage consumption by collection/partition | Alert at >80% of capacity |
| | Hot Partitions | Partitions exceeding expected throughput | Alert at >70% of total RUs |
| Replication | Replication Latency | Time for changes to propagate between regions | Alert at >5 seconds |
| | Conflict Count | Number of write conflicts in multi-region setup | Alert on sustained increases |
| Cost | Normalized RU Consumption | RU usage normalized by operation count | Alert on >50% increase |
| | Provisioned vs Consumed RUs | Gap between provisioned and used capacity | Alert on >40% overcapacity |

### Implementing Monitoring with Azure Monitor

```bash
# Configure diagnostic settings with Azure CLI
az monitor diagnostic-settings create \\
    --resource \"/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmos-account>\" \\
    --name \"CosmosDBMonitoring\" \\
    --workspace \"/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.OperationalInsights/workspaces/<log-analytics-workspace>\" \\
    --logs '[
        {
            \"category\": \"DataPlaneRequests\",
            \"enabled\": true,
            \"retentionPolicy\": {
                \"days\": 90,
                \"enabled\": true
            }
        },
        {
            \"category\": \"QueryRuntimeStatistics\",
            \"enabled\": true,
            \"retentionPolicy\": {
                \"days\": 90,
                \"enabled\": true
            }
        },
        {
            \"category\": \"PartitionKeyStatistics\",
            \"enabled\": true,
            \"retentionPolicy\": {
                \"days\": 90,
                \"enabled\": true
            }
        },
        {
            \"category\": \"ControlPlaneRequests\",
            \"enabled\": true,
            \"retentionPolicy\": {
                \"days\": 90,
                \"enabled\": true
            }
        }
    ]' \\
    --metrics '[
        {
            \"category\": \"Requests\",
            \"enabled\": true,
            \"retentionPolicy\": {
                \"days\": 90,
                \"enabled\": true
            }
        }
    ]'
```

### Log Analytics Queries for Global Distribution Monitoring

```kusto
// Monitor request latency by region
AzureDiagnostics
| where ResourceProvider == \"MICROSOFT.DOCUMENTDB\"
| where Category == \"DataPlaneRequests\"
| project TimeGenerated, RegionName_s, RequestCharge_s, DurationMs, StatusCode
| summarize 
    avg(todouble(RequestCharge_s)) as AvgRU,
    avg(todouble(DurationMs)) as AvgLatencyMs,
    p95 = percentile(todouble(DurationMs), 95),
    count() as RequestCount
    by RegionName_s, bin(TimeGenerated, 5m)
| render timechart

// Detect regional availability issues
AzureDiagnostics
| where ResourceProvider == \"MICROSOFT.DOCUMENTDB\" 
| where Category == \"DataPlaneRequests\"
| summarize
    SuccessCount = countif(StatusCode < 400),
    TotalCount = count()
    by RegionName_s, bin(TimeGenerated, 5m)
| extend SuccessRate = SuccessCount * 100.0 / TotalCount
| where SuccessRate < 99.9
| order by TimeGenerated desc
| render timechart

// Monitor multi-region write conflicts
AzureDiagnostics
| where ResourceProvider == \"MICROSOFT.DOCUMENTDB\" 
| where Category == \"DataPlaneRequests\" 
| where OperationName has \"CreateDocument\" or OperationName has \"ReplaceDocument\" or OperationName has \"UpsertDocument\" 
| where StatusCode == 449
| summarize ConflictCount = count() by bin(TimeGenerated, 1h), RegionName_s
| order by TimeGenerated desc

// Identify hot partitions by region
AzureDiagnostics
| where ResourceProvider == \"MICROSOFT.DOCUMENTDB\" 
| where Category == \"DataPlaneRequests\" 
| where OperationName has \"ReadFeed\" or OperationName has \"Query\" or OperationName has \"SQLQuery\" 
| project
    TimeGenerated,
    RegionName_s,
    ActivityId_g,
    RequestCharge_s,
    ResourceType,
    PartitionKey_g
| summarize
    TotalRU = sum(todouble(RequestCharge_s)),
    QueryCount = count()
    by PartitionKey_g, RegionName_s, bin(TimeGenerated, 15m)
| top 10 by TotalRU desc

// Monitor replication latency between regions
AzureDiagnostics
| where ResourceProvider == \"MICROSOFT.DOCUMENTDB\" 
| where Category == \"DataPlaneRequests\" 
| where OperationName has \"CreateDocument\" or OperationName has \"ReplaceDocument\"
| project
    TimeGenerated,
    OperationName,
    RequestResourceId,
    RegionName_s,
    ActivityId_g
| join kind=inner (
    AzureDiagnostics
    | where ResourceProvider == \"MICROSOFT.DOCUMENTDB\" 
    | where Category == \"DataPlaneRequests\" 
    | where OperationName has \"ReadDocument\"
    | project
        ReadTime = TimeGenerated,
        ReadRegion = RegionName_s,
        ActivityId_g,
        RequestResourceId
) on RequestResourceId
| where RegionName_s != ReadRegion
| extend ReplicationLatencyMs = datetime_diff('millisecond', ReadTime, TimeGenerated)
| where ReplicationLatencyMs > 0
| summarize
    AvgLatencyMs = avg(ReplicationLatencyMs),
    P95LatencyMs = percentile(ReplicationLatencyMs, 95),
    P99LatencyMs = percentile(ReplicationLatencyMs, 99),
    MaxLatencyMs = max(ReplicationLatencyMs)
    by RegionName_s, ReadRegion, bin(TimeGenerated, 1h)
| sort by TimeGenerated desc, AvgLatencyMs desc
```

### Setting Up Regional Alerts

```powershell
# PowerShell script to create Azure Monitor alerts for Cosmos DB regional performance

# Parameters
$resourceGroupName = \"your-resource-group\"
$cosmosDbAccountName = \"your-cosmos-account\"
$actionGroupName = \"Cosmos-Critical-Alerts\"
$actionGroupShortName = \"CosmosAlert\"
$emailRecipients = @(\"admin@yourcompany.com\", \"oncall@yourcompany.com\")

# Create action group for alerts
$emails = @()
foreach ($recipient in $emailRecipients) {
    $emails += New-AzActionGroupReceiver -Name \"Email-$recipient\" -EmailReceiver -EmailAddress $recipient
}

$actionGroup = Set-AzActionGroup `
    -ResourceGroupName $resourceGroupName `
    -Name $actionGroupName `
    -ShortName $actionGroupShortName `
    -Receiver $emails

# Get the resource ID for the Cosmos DB account
$cosmosDbResourceId = (Get-AzResource -ResourceGroupName $resourceGroupName -Name $cosmosDbAccountName).ResourceId

# Create alert for regional latency issues
New-AzMetricAlertRuleV2 `
    -Name \"Cosmos-Regional-Latency-Alert\" `
    -ResourceGroupName $resourceGroupName `
    -WindowSize 00:05:00 `
    -Frequency 00:01:00 `
    -TargetResourceId $cosmosDbResourceId `
    -Condition (New-AzMetricAlertRuleV2Criteria `
        -MetricName \"P95 Latency\" `
        -TimeAggregation Average `
        -Operator GreaterThan `
        -Threshold 100 `
        -MetricNamespace \"Microsoft.DocumentDB/databaseAccounts\" `
        -DimensionSelection @{Name=\"RegionName\"; Value=\"*\"}) `
    -ActionGroup $actionGroup.Id `
    -Severity 2 `
    -Description \"Alert when P95 latency exceeds 100ms in any region\"

# Create alert for throttled requests by region
New-AzMetricAlertRuleV2 `
    -Name \"Cosmos-Regional-Throttling-Alert\" `
    -ResourceGroupName $resourceGroupName `
    -WindowSize 00:05:00 `
    -Frequency 00:01:00 `
    -TargetResourceId $cosmosDbResourceId `
    -Condition (New-AzMetricAlertRuleV2Criteria `
        -MetricName \"TotalRequests\" `
        -TimeAggregation Total `
        -Operator GreaterThan `
        -Threshold 100 `
        -MetricNamespace \"Microsoft.DocumentDB/databaseAccounts\" `
        -DimensionSelection @(
            @{Name=\"StatusCode\"; Value=\"429\"},
            @{Name=\"RegionName\"; Value=\"*\"}
        )) `
    -ActionGroup $actionGroup.Id `
    -Severity 1 `
    -Description \"Alert on throttled requests (429) in any region\"

# Create alert for availability issues by region
New-AzMetricAlertRuleV2 `
    -Name \"Cosmos-Regional-Availability-Alert\" `
    -ResourceGroupName $resourceGroupName `
    -WindowSize 00:05:00 `
    -Frequency 00:01:00 `
    -TargetResourceId $cosmosDbResourceId `
    -Condition (New-AzMetricAlertRuleV2Criteria `
        -MetricName \"Availability\" `
        -TimeAggregation Average `
        -Operator LessThan `
        -Threshold 99.9 `
        -MetricNamespace \"Microsoft.DocumentDB/databaseAccounts\" `
        -DimensionSelection @{Name=\"RegionName\"; Value=\"*\"}) `
    -ActionGroup $actionGroup.Id `
    -Severity 0 `
    -Description \"Alert when availability drops below 99.9% in any region\"
```

## Cost Management Strategies

### Understanding Global Distribution Pricing

Cosmos DB pricing for globally distributed deployments has several components:

1. **Provisioned throughput (RUs)**: 
   - Single-write region: 1× the provisioned throughput
   - Multi-write regions: N× the provisioned throughput (where N is the number of write regions)
   - Read regions: Included in the base price

2. **Storage**:
   - Charged per GB in each region
   - Each region incurs separate storage costs

3. **Backup storage**:
   - Continuous backup: Additional cost based on backup storage size
   - Point-in-time restore: Additional cost for operations

### Cost Optimization Techniques

Implement these strategies to optimize costs for globally distributed deployments:

```powershell
# PowerShell script to implement cost-saving measures for Cosmos DB

# 1. Configure autoscale throughput with appropriate max/min settings
Update-AzCosmosDBSqlContainerThroughput `
    -ResourceGroupName \"your-resource-group\" `
    -AccountName \"your-cosmos-account\" `
    -DatabaseName \"your-database\" `
    -Name \"your-container\" `
    -AutoscaleMaxThroughput 20000

# 2. Configure different read/write region combinations based on traffic patterns
# This example removes a read region during off-hours
$offPeakRegions = @(
    @{ \"locationName\"=\"East US\"; \"failoverPriority\"=0 },
    @{ \"locationName\"=\"West Europe\"; \"failoverPriority\"=1 }
    # Southeast Asia region removed during off-peak hours
)

$peakRegions = @(
    @{ \"locationName\"=\"East US\"; \"failoverPriority\"=0 },
    @{ \"locationName\"=\"West Europe\"; \"failoverPriority\"=1 },
    @{ \"locationName\"=\"Southeast Asia\"; \"failoverPriority\"=2 }
)

# Function to update regions based on time of day
function Update-CosmosDbRegions {
    param (
        [string]$ResourceGroupName,
        [string]$AccountName
    )
    
    # Get current hour in UTC
    $currentHour = (Get-Date).ToUniversalTime().Hour
    
    # Define peak hours (e.g., 8 AM to 8 PM UTC)
    $isPeakHours = ($currentHour -ge 8 -and $currentHour -lt 20)
    
    if ($isPeakHours) {
        Write-Output \"Peak hours - using all regions\"
        Update-AzCosmosDBAccount `
            -ResourceGroupName $ResourceGroupName `
            -Name $AccountName `
            -LocationObject $peakRegions
    }
    else {
        Write-Output \"Off-peak hours - using reduced regions\"
        Update-AzCosmosDBAccount `
            -ResourceGroupName $ResourceGroupName `
            -Name $AccountName `
            -LocationObject $offPeakRegions
    }
}

# Example usage - this would typically be triggered by Azure Automation on a schedule
Update-CosmosDbRegions -ResourceGroupName \"your-resource-group\" -AccountName \"your-cosmos-account\"
```

### Implement Time-to-Live (TTL) for Data Lifecycle Management

Configure TTL to automatically expire and remove old data:

```csharp
// C# SDK example - Configure container with TTL
ContainerProperties containerProperties = new ContainerProperties(
    id: \"TimeSeriesData\",
    partitionKeyPaths: new List<string> { \"/deviceId\" });

// Set default TTL for the container (30 days)
containerProperties.DefaultTimeToLive = 60 * 60 * 24 * 30; // 30 days in seconds

Container container = await database.CreateContainerIfNotExistsAsync(
    containerProperties,
    throughput: 10000);

// Create item with custom TTL
dynamic timeSeriesDocument = new
{
    id = Guid.NewGuid().ToString(),
    deviceId = \"device-123\",
    timestamp = DateTime.UtcNow,
    temperature = 72.5,
    humidity = 67.8,
    // Use custom TTL for this document (7 days)
    ttl = 60 * 60 * 24 * 7 // 7 days in seconds
};

await container.CreateItemAsync(timeSeriesDocument, new PartitionKey(\"device-123\"));

// Create item with infinite TTL (override container default)
dynamic permanentDocument = new
{
    id = Guid.NewGuid().ToString(),
    deviceId = \"device-456\",
    configType = \"baseline\",
    settings = new { threshold = 75.0, alertEnabled = true },
    // Set -1 for infinite TTL (never expire)
    ttl = -1
};

await container.CreateItemAsync(permanentDocument, new PartitionKey(\"device-456\"));
```

### Monitor and Optimize Costs with Azure Cost Management

Use Azure Cost Management to analyze and forecast Cosmos DB costs:

```powershell
# PowerShell script to export cost data for Cosmos DB accounts

# Parameters
$startDate = (Get-Date).AddDays(-30).ToString(\"yyyy-MM-dd\")
$endDate = Get-Date -Format \"yyyy-MM-dd\"
$resourceGroupName = \"your-resource-group\"
$cosmosDbAccountName = \"your-cosmos-account\"
$outputPath = \"C:\\Reports\\CosmosDbCosts.csv\"

# Get resource ID for the Cosmos DB account
$cosmosDbResourceId = (Get-AzResource -ResourceGroupName $resourceGroupName -Name $cosmosDbAccountName).ResourceId

# Create cost analysis query
$costQuery = @{
    type = 'Usage'
    timeframe = 'Custom'
    timePeriod = @{
        from = $startDate
        to = $endDate
    }
    dataset = @{
        granularity = 'Daily'
        aggregation = @{
            totalCost = @{
                name = 'PreTaxCost'
                function = 'Sum'
            }
        }
        grouping = @(
            @{
                type = 'Dimension'
                name = 'ResourceId'
            },
            @{
                type = 'Dimension'
                name = 'MeterCategory'
            },
            @{
                type = 'Dimension'
                name = 'MeterSubCategory'
            }
        )
        filter = @{
            Dimensions = @{
                Name = 'ResourceId'
                Operator = 'In'
                Values = @($cosmosDbResourceId)
            }
        }
    }
}

# Export cost data
$costs = Invoke-AzCostManagementQuery -QueryType $costQuery

# Output to CSV
$costs.Properties.Rows | ForEach-Object {
    [PSCustomObject]@{
        Date = $_[0]
        ResourceId = $_[1]
        MeterCategory = $_[2]
        MeterSubCategory = $_[3]
        Cost = $_[4]
        Currency = $_[5]
    }
} | Export-Csv -Path $outputPath -NoTypeInformation
```

## Security Considerations

### Securing Global Deployments

Implement comprehensive security for globally distributed Cosmos DB:

#### Network Security Configuration

```bash
# Configure Cosmos DB with Private Link using Azure CLI
az cosmosdb create \\
    --name \"your-secure-cosmos-account\" \\
    --resource-group \"your-resource-group\" \\
    --locations regionName=\"East US\" failoverPriority=0 isZoneRedundant=true \\
    --locations regionName=\"West Europe\" failoverPriority=1 isZoneRedundant=true \\
    --public-network-access Disabled

# Create Private Endpoints for each region
# East US Private Endpoint
az network private-endpoint create \\
    --name \"cosmos-pe-eastus\" \\
    --resource-group \"your-resource-group\" \\
    --vnet-name \"your-eastus-vnet\" \\
    --subnet \"your-eastus-subnet\" \\
    --private-connection-resource-id \"/subscriptions/<subscription-id>/resourceGroups/your-resource-group/providers/Microsoft.DocumentDB/databaseAccounts/your-secure-cosmos-account\" \\
    --group-id \"Sql\" \\
    --location \"East US\"

# West Europe Private Endpoint
az network private-endpoint create \\
    --name \"cosmos-pe-westeurope\" \\
    --resource-group \"your-resource-group\" \\
    --vnet-name \"your-westeurope-vnet\" \\
    --subnet \"your-westeurope-subnet\" \\
    --private-connection-resource-id \"/subscriptions/<subscription-id>/resourceGroups/your-resource-group/providers/Microsoft.DocumentDB/databaseAccounts/your-secure-cosmos-account\" \\
    --group-id \"Sql\" \\
    --location \"West Europe\"

# Create DNS Zones
az network private-dns zone create \\
    --resource-group \"your-resource-group\" \\
    --name \"privatelink.documents.azure.com\"

# Link DNS Zones to VNets
az network private-dns link vnet create \\
    --resource-group \"your-resource-group\" \\
    --zone-name \"privatelink.documents.azure.com\" \\
    --name \"eastus-link\" \\
    --virtual-network \"your-eastus-vnet\" \\
    --registration-enabled false

az network private-dns link vnet create \\
    --resource-group \"your-resource-group\" \\
    --zone-name \"privatelink.documents.azure.com\" \\
    --name \"westeurope-link\" \\
    --virtual-network \"your-westeurope-vnet\" \\
    --registration-enabled false

# Create DNS records for Private Endpoints
az network private-endpoint dns-zone-group create \\
    --resource-group \"your-resource-group\" \\
    --endpoint-name \"cosmos-pe-eastus\" \\
    --name \"cosmos-dns-group\" \\
    --private-dns-zone \"privatelink.documents.azure.com\" \\
    --zone-name \"documents\"

az network private-endpoint dns-zone-group create \\
    --resource-group \"your-resource-group\" \\
    --endpoint-name \"cosmos-pe-westeurope\" \\
    --name \"cosmos-dns-group\" \\
    --private-dns-zone \"privatelink.documents.azure.com\" \\
    --zone-name \"documents\"
```

#### Data Encryption Configuration

```azurecli
# Create Key Vault for Customer Managed Keys
az keyvault create \\
    --name \"your-cosmos-keyvault\" \\
    --resource-group \"your-resource-group\" \\
    --location \"East US\" \\
    --sku Premium \\
    --enable-purge-protection true \\
    --enable-soft-delete true \\
    --retention-days 90

# Create encryption key
az keyvault key create \\
    --vault-name \"your-cosmos-keyvault\" \\
    --name \"cosmos-encryption-key\" \\
    --protection software

# Get key identifier
keyId=$(az keyvault key show \\
    --vault-name \"your-cosmos-keyvault\" \\
    --name \"cosmos-encryption-key\" \\
    --query key.kid \\
    --output tsv)

# Create system-assigned managed identity for Cosmos DB
az cosmosdb update \\
    --name \"your-secure-cosmos-account\" \\
    --resource-group \"your-resource-group\" \\
    --assign-identity

# Get the principal ID of the managed identity
principalId=$(az cosmosdb show \\
    --name \"your-secure-cosmos-account\" \\
    --resource-group \"your-resource-group\" \\
    --query identity.principalId \\
    --output tsv)

# Grant key permissions to Cosmos DB identity
az keyvault set-policy \\
    --name \"your-cosmos-keyvault\" \\
    --object-id $principalId \\
    --key-permissions get unwrapKey wrapKey

# Configure Cosmos DB to use the customer-managed key
az cosmosdb update \\
    --name \"your-secure-cosmos-account\" \\
    --resource-group \"your-resource-group\" \\
    --key-uri $keyId
```

#### Authentication and Authorization with AAD

```csharp
// C# SDK example - Using AAD authentication with Cosmos DB
// Requires Microsoft.Azure.Services.AppAuthentication and Microsoft.Azure.Cosmos packages

public async Task<Container> GetCosmosContainerWithAadAuth(
    string endpoint,
    string databaseName,
    string containerName)
{
    // Get AAD token for Cosmos DB resource
    var tokenProvider = new AzureServiceTokenProvider();
    string accessToken = await tokenProvider.GetAccessTokenAsync(\"https://cosmos.azure.com/\");
    
    // Create credentials with the token
    TokenCredential tokenCredential = new TokenCredential(accessToken);
    
    // Configure cosmos client with token credentials
    CosmosClientOptions options = new CosmosClientOptions
    {
        ConnectionMode = ConnectionMode.Direct,
        ApplicationRegion = \"East US\"
    };
    
    CosmosClient client = new CosmosClient(
        endpoint,
        tokenCredential,
        options);
        
    // Get database and container references
    Database database = client.GetDatabase(databaseName);
    Container container = database.GetContainer(containerName);
    
    return container;
}
```

## Integration with Other Azure Services

### Azure Functions Integration
Implement serverless event-driven processing for Cosmos DB using Azure Functions:

```csharp
// C# Azure Function triggered by Cosmos DB changes
public static class CosmosDBTriggerFunction
{
    [FunctionName(\"CosmosDBTriggerFunction\")]
    public static async Task Run(
        [CosmosDBTrigger(
            databaseName: \"RetailDatabase\",
            containerName: \"Orders\",
            Connection = \"CosmosDBConnection\",
            LeaseContainerName = \"leases\",
            CreateLeaseContainerIfNotExists = true)]
            IReadOnlyList<Document> documents,
        [EventHub(\"processed-orders\", Connection = \"EventHubConnection\")] IAsyncCollector<string> outputEvents,
        ILogger log)
    {
        if (documents != null && documents.Count > 0)
        {
            log.LogInformation($\"Processing {documents.Count} document changes\");
            
            foreach (var document in documents)
            {
                // Process each changed document
                log.LogInformation($\"Processing document {document.Id}\");
                
                // Example: Send to Event Hub for further processing
                await outputEvents.AddAsync(JsonConvert.SerializeObject(document));
            }
        }
    }
}
```

### Azure Synapse Analytics Integration
Set up analytical capabilities over globally distributed Cosmos DB data:

```powershell
# Create Synapse Workspace with Cosmos DB connection
$synapseWorkspaceName = \"cosmos-analytics-workspace\"
$resourceGroupName = \"your-resource-group\"
$location = \"East US\"
$cosmosDbAccountName = \"your-globally-distributed-account\"
$cosmosDbDatabase = \"RetailDatabase\"
$cosmosDbContainer = \"Orders\"
$adlsGen2AccountName = \"synapsestorage\"
$fileSystemName = \"synapsefs\"

# Create Synapse workspace
New-AzSynapseWorkspace -Name $synapseWorkspaceName `
                       -ResourceGroupName $resourceGroupName `
                       -Location $location `
                       -DefaultDataLakeStorageAccountName $adlsGen2AccountName `
                       -DefaultDataLakeStorageFilesystem $fileSystemName `
                       -SqlAdministratorLoginCredential (Get-Credential)

# Create Synapse Linked Service for Cosmos DB
$linkedServiceName = \"CosmosDbLinkedService\"
$cosmosDbAccountId = (Get-AzCosmosDBAccount -ResourceGroupName $resourceGroupName -Name $cosmosDbAccountName).Id

$linkedServiceDefinition = @\"
{
    \"name\": \"$linkedServiceName\",
    \"properties\": {
        \"type\": \"CosmosDb\",
        \"typeProperties\": {
            \"connectionString\": {
                \"type\": \"SecureString\",
                \"value\": \"AccountEndpoint=https://$cosmosDbAccountName.documents.azure.com:443/;Database=$cosmosDbDatabase;AccountKey=${cosmosDbKey}\"
            }
        }
    }
}
\"@

Invoke-AzRestMethod -Path \"/subscriptions/$subscriptionId/resourceGroups/$resourceGroupName/providers/Microsoft.Synapse/workspaces/$synapseWorkspaceName/linkedservices/$linkedServiceName?api-version=2019-06-01-preview\" `
                    -Method PUT `
                    -Payload $linkedServiceDefinition
```

### Azure API Management Integration
Configure API Management for globally distributed Cosmos DB access:

```azurecli
# Create API Management service with regional deployment
az apim create \\
    --name \"global-cosmos-apim\" \\
    --resource-group \"your-resource-group\" \\
    --publisher-name \"Your Company\" \\
    --publisher-email \"admin@yourcompany.com\" \\
    --sku-name \"Premium\" \\
    --sku-capacity 1 \\
    --location \"East US\" \\
    --additional-locations \"West Europe\" \"Southeast Asia\"

# Create backend service for Cosmos DB API
az apim backend create \\
    --resource-group \"your-resource-group\" \\
    --service-name \"global-cosmos-apim\" \\
    --backend-id \"cosmos-backend\" \\
    --url \"https://your-globally-distributed-account.documents.azure.com\" \\
    --protocol http

# Create API pointing to Cosmos DB backend
az apim api create \\
    --resource-group \"your-resource-group\" \\
    --service-name \"global-cosmos-apim\" \\
    --api-id \"cosmos-api\" \\
    --display-name \"Cosmos DB API\" \\
    --path \"cosmos\" \\
    --protocols https

# Create operation for retrieving documents
az apim api operation create \\
    --resource-group \"your-resource-group\" \\
    --service-name \"global-cosmos-apim\" \\
    --api-id \"cosmos-api\" \\
    --operation-id \"get-document\" \\
    --display-name \"Get Document\" \\
    --method GET \\
    --url-template \"/api/documents/{id}\" \\
    --template-parameters name=id required=true type=string \\
    --description \"Retrieves a document by ID\"

# Configure policy with regional routing based on client location
az apim api policy set \\
    --resource-group \"your-resource-group\" \\
    --service-name \"global-cosmos-apim\" \\
    --api-id \"cosmos-api\" \\
    --policy-format xml \\
    --value \"<policies>
                <inbound>
                    <base />
                    <set-header name=\"x-ms-version\" exists-action=\"override\">
                        <value>2018-12-31</value>
                    </set-header>
                    <set-header name=\"x-ms-date\" exists-action=\"override\">
                        <value>@(DateTime.UtcNow.ToString(\"r\"))</value>
                    </set-header>
                    <choose>
                        <when condition=\\\"@(context.Request.Headers.GetValueOrDefault(\"X-Client-Region\", \"\").Contains(\"Europe\"))\\\">
                            <set-backend-service backend-id=\"cosmos-backend-europe\" />
                        </when>
                        <when condition=\\\"@(context.Request.Headers.GetValueOrDefault(\"X-Client-Region\", \"\").Contains(\"Asia\"))\\\">
                            <set-backend-service backend-id=\"cosmos-backend-asia\" />
                        </when>
                        <otherwise>
                            <set-backend-service backend-id=\"cosmos-backend\" />
                        </otherwise>
                    </choose>
                    <authentication-managed-identity resource=\"https://cosmos.azure.com\" />
                </inbound>
                <backend>
                    <base />
                </backend>
                <outbound>
                    <base />
                </outbound>
                <on-error>
                    <base />
                </on-error>
            </policies>\"
```

## Troubleshooting Common Issues

### Diagnosing Regional Availability Issues

When experiencing regional availability issues:

1. **Check Azure Status**: Verify if there are any reported outages for Cosmos DB in the affected regions
2. **Verify Network Connectivity**:
   ```powershell
   # Test network connectivity to Cosmos DB endpoints
   Test-NetConnection -ComputerName \"your-account.documents.azure.com\" -Port 443
   # Check latency to different regional endpoints
   foreach ($region in @(\"eastus\", \"westeurope\", \"southeastasia\")) {
       $endpoint = \"your-account-$region.documents.azure.com\"
       $result = Test-NetConnection -ComputerName $endpoint -Port 443 -InformationLevel Detailed
       Write-Output \"Region: $region, Success: $($result.TcpTestSucceeded), Latency: $($result.ResponseTime)ms\"
   }
   ```

3. **Check Resource Health**:
   ```azurecli
   # Get resource health for Cosmos DB account
   az resource show \\
       --resource-group \"your-resource-group\" \\
       --name \"your-cosmos-account\" \\
       --resource-type \"Microsoft.DocumentDB/databaseAccounts\" \\
       --query \"properties.failoverPolicies[].{region:locationName, priority:failoverPriority, status:isZoneRedundant}\"
   ```

4. **Verify Client Configuration**:
   ```csharp
   // Configure client with appropriate connection mode and region preferences
   CosmosClientOptions diagnosticOptions = new CosmosClientOptions
   {
       ConnectionMode = ConnectionMode.Direct,
       ApplicationPreferredRegions = new List<string> { \"East US\", \"West Europe\", \"Southeast Asia\" },
       RequestTimeout = TimeSpan.FromSeconds(10),
       EnableContentResponseOnWrite = false
   };
   
   using CosmosClient diagnosticClient = new CosmosClient(
       \"https://your-account.documents.azure.com:443/\",
       \"your-auth-key\",
       diagnosticOptions);
       
   // Test basic operations
   try
   {
       // Test account access
       DatabaseResponse dbResponse = await diagnosticClient.CreateDatabaseIfNotExistsAsync(\"diagnosticdb\");
       Console.WriteLine($\"Database access successful: {dbResponse.StatusCode}\");
       
       // Test container access
       Container container = dbResponse.Database.GetContainer(\"diagnosticContainer\");
       ContainerResponse containerResponse = await container.ReadContainerAsync();
       Console.WriteLine($\"Container access successful: {containerResponse.StatusCode}\");
       
       // Test document operations
       dynamic testDoc = new { id = Guid.NewGuid().ToString(), name = \"test\" };
       ItemResponse<dynamic> createResponse = await container.CreateItemAsync(testDoc);
       Console.WriteLine($\"Write operation successful: {createResponse.StatusCode}, \" +
                         $\"Region: {createResponse.Headers.RequestCharge}, \" +
                         $\"Latency: {createResponse.Diagnostics.GetClientElapsedTime()}\");
   }
   catch (CosmosException ex)
   {
       Console.WriteLine($\"Cosmos DB operation failed: {ex.StatusCode}, {ex.Message}\");
       Console.WriteLine($\"Activity ID: {ex.ActivityId}, Request Charge: {ex.RequestCharge}\");
       Console.WriteLine($\"Headers: {string.Join(\", \", ex.Headers.Select(h => $\"{h.Key}={h.Value}\"))}\");
   }
   ```

### Resolving Multi-Region Write Conflicts

When encountering frequent write conflicts in multi-region deployments:

1. **Analyze Conflict Feed**:
   ```csharp
   // Read conflict feed to identify patterns
   Container container = client.GetContainer(\"database\", \"container\");
   
   FeedIterator<Conflict> conflictFeed = container.Conflicts.GetConflictQueryIterator<Conflict>();
   List<Conflict> conflicts = new List<Conflict>();
   
   while (conflictFeed.HasMoreResults)
   {
       FeedResponse<Conflict> response = await conflictFeed.ReadNextAsync();
       conflicts.AddRange(response);
   }
   
   // Analyze conflict patterns
   var conflictsByType = conflicts
       .GroupBy(c => c.OperationKind)
       .Select(g => new { OperationType = g.Key, Count = g.Count() });
       
   foreach (var group in conflictsByType)
   {
       Console.WriteLine($\"Conflict type: {group.OperationType}, Count: {group.Count}\");
   }
   ```

2. **Implement Custom Conflict Resolution**:
   ```javascript
   // Custom stored procedure for resolving conflicts
   function resolveConflicts(conflictingDocs) {
       var context = getContext();
       var collection = context.getCollection();
       var response = context.getResponse();
       
       if (!conflictingDocs || conflictingDocs.length === 0) {
           response.setBody(\"No conflicts to resolve\");
           return;
       }
       
       // Sort conflicts by timestamp field
       conflictingDocs.sort(function(a, b) {
           return b.lastModified - a.lastModified;
       });
       
       // Select the most recent document as the winner
       var winningDoc = conflictingDocs[0];
       
       // Attempt to replace with the winning document
       var accepted = collection.replaceDocument(
           conflictingDocs[0]._self,
           winningDoc,
           function(err, docReplaced) {
               if (err) throw new Error(\"Error replacing document: \" + err.message);
               response.setBody(\"Conflict resolved with document \" + winningDoc.id);
           }
       );
       
       if (!accepted) throw new Error(\"Operation not accepted\");
   }
   ```

3. **Optimize Partition Key Design**:
   - Review current partition key schema and update if causing hot partitions
   - Consider implementing composite partition keys for better distribution

### Diagnosing Performance Issues

When experiencing slow performance in globally distributed environments:

1. **Analyze Request Unit (RU) Consumption**:
   ```kusto
   // Azure Monitor query to analyze RU consumption by operation and region
   let timeRange = 24h;
   AzureDiagnostics
   | where TimeGenerated > ago(timeRange)
   | where ResourceProvider == \"MICROSOFT.DOCUMENTDB\"
   | where Category == \"DataPlaneRequests\"
   | summarize 
       TotalRequests = count(),
       TotalRUs = sum(todouble(RequestCharge_s)),
       AvgRUPerRequest = avg(todouble(RequestCharge_s)),
       AvgLatencyMs = avg(todouble(DurationMs)),
       P95LatencyMs = percentile(todouble(DurationMs), 95)
       by OperationName, RegionName_s, bin(TimeGenerated, 1h)
   | order by TimeGenerated desc, TotalRUs desc
   ```

2. **Implement SDK Diagnostics**:
   ```csharp
   // Enable detailed diagnostics on the client
   CosmosClientOptions diagnosticOptions = new CosmosClientOptions
   {
       ConnectionMode = ConnectionMode.Direct,
       ApplicationRegion = \"East US\",
       EnableTcpConnectionEndpointRediscovery = true,
       // Enable diagnostics
       Diagnostics = new DiagnosticsOptions
       {
           IsLoggingEnabled = true,
           IsTelemetryEnabled = true
       }
   };
   
   CosmosClient diagnosticClient = new CosmosClient(
       \"your-account-endpoint\",
       \"your-key\",
       diagnosticOptions);
       
   // Perform operations with diagnostics
   Container container = diagnosticClient.GetContainer(\"database\", \"container\");
   
   // Track operation diagnostics
   ItemResponse<dynamic> response = await container.ReadItemAsync<dynamic>(
       \"item-id\", 
       new PartitionKey(\"partition-key-value\"));
       
   // Extract and log diagnostic information
   CosmosDiagnostics diagnostics = response.Diagnostics;
   
   Console.WriteLine($\"Client elapsed time: {diagnostics.GetClientElapsedTime()}\");
   Console.WriteLine($\"Request diagnostics: {diagnostics}\");
   ```

3. **Optimize Indexing for Global Distribution**:
   - Remove unused indexes
   - Implement selective indexing based on regional query patterns
   - Exclude large string properties from indexing

4. **Implement Regional Request Routing**:
   ```csharp
   // Create a router for directing requests to optimal regions
   public class CosmosRegionalRouter
   {
       private readonly Dictionary<string, CosmosClient> _regionalClients;
       private readonly string _defaultRegion;
       
       public CosmosRegionalRouter(
           string accountEndpoint,
           string authKey,
           Dictionary<string, int> regionLatencyMap)
       {
           _regionalClients = new Dictionary<string, CosmosClient>();
           
           // Sort regions by latency and create clients
           var sortedRegions = regionLatencyMap
               .OrderBy(kv => kv.Value)
               .Select(kv => kv.Key)
               .ToList();
               
           _defaultRegion = sortedRegions.FirstOrDefault() ?? \"East US\";
           
           // Create regional clients
           foreach (string region in sortedRegions)
           {
               _regionalClients[region] = new CosmosClient(
                   accountEndpoint,
                   authKey,
                   new CosmosClientOptions
                   {
                       ApplicationRegion = region,
                       ConnectionMode = ConnectionMode.Direct
                   });
           }
       }
       
       // Get appropriate client for user region
       public CosmosClient GetOptimalClient(string userRegion)
       {
           if (string.IsNullOrEmpty(userRegion) || !_regionalClients.ContainsKey(userRegion))
           {
               return _regionalClients[_defaultRegion];
           }
           
           return _regionalClients[userRegion];
       }
   }
   ```

## Advanced Scenarios

### Multi-Master Replication with Custom Synchronization

For advanced multi-master scenarios with custom synchronization:

```csharp
// Implement a custom synchronization service for multi-master replication
public class CustomSyncService
{
    private readonly CosmosClient _sourceClient;
    private readonly CosmosClient _destinationClient;
    private readonly Container _sourceContainer;
    private readonly Container _destinationContainer;
    private readonly string _leaseContainerName;
    
    public CustomSyncService(
        string sourceEndpoint,
        string sourceKey,
        string sourceDatabase,
        string sourceContainer,
        string destinationEndpoint,
        string destinationKey,
        string destinationDatabase,
        string destinationContainer,
        string leaseContainer)
    {
        // Initialize Cosmos clients
        _sourceClient = new CosmosClient(
            sourceEndpoint,
            sourceKey,
            new CosmosClientOptions { ApplicationRegion = \"East US\" });
            
        _destinationClient = new CosmosClient(
            destinationEndpoint,
            destinationKey,
            new CosmosClientOptions { ApplicationRegion = \"West Europe\" });
            
        // Get container references
        _sourceContainer = _sourceClient.GetContainer(sourceDatabase, sourceContainer);
        _destinationContainer = _destinationClient.GetContainer(destinationDatabase, destinationContainer);
        
        _leaseContainerName = leaseContainer;
    }
    
    // Start the change feed processor to sync changes
    public async Task StartSyncAsync()
    {
        // Create lease container if it doesn't exist
        Database database = _sourceClient.GetDatabase(_sourceContainer.Database.Id);
        Container leaseContainer = await database.CreateContainerIfNotExistsAsync(
            _leaseContainerName, \"/id\", 400);
            
        // Configure change feed processor
        ChangeFeedProcessorBuilder builder = _sourceContainer
            .GetChangeFeedProcessorBuilder(
                processorName: \"CustomSyncProcessor\",
                onChangesDelegate: HandleChangesAsync)
            .WithInstanceName(Environment.MachineName)
            .WithLeaseContainer(leaseContainer);
            
        // Start processor
        ChangeFeedProcessor processor = builder.Build();
        await processor.StartAsync();
        
        Console.WriteLine(\"Change feed processor started\");
    }
    
    // Handle changes from the change feed
    private async Task HandleChangesAsync(
        ChangeFeedProcessorContext context,
        IReadOnlyCollection<dynamic> changes,
        CancellationToken cancellationToken)
    {
        Console.WriteLine($\"Processing {changes.Count} changes\");
        
        // Group changes by partition key for efficient processing
        var changesByPartition = changes
            .GroupBy(d => GetPartitionKeyValue(d))
            .ToDictionary(g => g.Key, g => g.ToList());
            
        foreach (var partition in changesByPartition)
        {
            string partitionKey = partition.Key;
            List<dynamic> partitionChanges = partition.Value;
            
            // Process changes for each partition
            try
            {
                // Create a transactional batch for the partition
                TransactionalBatch batch = _destinationContainer.CreateTransactionalBatch(
                    new PartitionKey(partitionKey));
                    
                foreach (dynamic doc in partitionChanges)
                {
                    // Add operation to batch
                    batch.UpsertItem(doc);
                }
                
                // Execute batch
                using TransactionalBatchResponse response = await batch.ExecuteAsync(cancellationToken);
                
                // Handle response
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($\"Batch failed: {response.StatusCode}\");
                    // Handle individual operations
                    await ProcessChangesIndividually(partitionChanges, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($\"Error processing batch: {ex.Message}\");
                await ProcessChangesIndividually(partitionChanges, cancellationToken);
            }
        }
    }
    
    // Fallback to individual processing if batch fails
    private async Task ProcessChangesIndividually(
        List<dynamic> changes,
        CancellationToken cancellationToken)
    {
        foreach (dynamic doc in changes)
        {
            try
            {
                string id = doc.id;
                string pk = GetPartitionKeyValue(doc);
                
                // Check if document exists
                try
                {
                    await _destinationContainer.ReadItemAsync<dynamic>(
                        id, new PartitionKey(pk), cancellationToken: cancellationToken);
                        
                    // Document exists, replace it
                    await _destinationContainer.ReplaceItemAsync<dynamic>(
                        doc, id, new PartitionKey(pk), cancellationToken: cancellationToken);
                }
                catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    // Document doesn't exist, create it
                    await _destinationContainer.CreateItemAsync<dynamic>(
                        doc, new PartitionKey(pk), cancellationToken: cancellationToken);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($\"Error processing document {doc.id}: {ex.Message}\");
            }
        }
    }
    
    // Helper to extract partition key value from document
    private string GetPartitionKeyValue(dynamic document)
    {
        // Adapt this to your partition key path
        return document.partitionKey.ToString();
    }
}
```

### Globally Distributed Caching Architecture

Implement a distributed caching layer with Azure Redis Cache:

```csharp
// Implement distributed caching for Cosmos DB
public class DistributedCacheManager<T> where T : class
{
    private readonly Container _cosmosContainer;
    private readonly IDistributedCache _cache;
    private readonly TimeSpan _cacheDuration;
    private readonly string _regionName;
    
    public DistributedCacheManager(
        Container cosmosContainer,
        IDistributedCache cache,
        string regionName,
        TimeSpan? cacheDuration = null)
    {
        _cosmosContainer = cosmosContainer;
        _cache = cache;
        _regionName = regionName;
        _cacheDuration = cacheDuration ?? TimeSpan.FromMinutes(10);
    }
    
    // Read item with caching
    public async Task<T> ReadItemAsync(string id, string partitionKey)
    {
        // Generate region-specific cache key
        string cacheKey = $\"{_regionName}:{typeof(T).Name}:{partitionKey}:{id}\";
        
        // Try to get from cache
        byte[] cachedData = await _cache.GetAsync(cacheKey);
        if (cachedData != null)
        {
            string jsonData = Encoding.UTF8.GetString(cachedData);
            return JsonConvert.DeserializeObject<T>(jsonData);
        }
        
        // Cache miss, read from Cosmos DB
        try
        {
            ItemResponse<T> response = await _cosmosContainer.ReadItemAsync<T>(
                id, new PartitionKey(partitionKey));
                
            T item = response.Resource;
            
            // Update cache
            string serializedItem = JsonConvert.SerializeObject(item);
            await _cache.SetAsync(
                cacheKey,
                Encoding.UTF8.GetBytes(serializedItem),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _cacheDuration
                });
                
            return item;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
    
    // Create/update item and update cache
    public async Task UpsertItemAsync(T item, string id, string partitionKey)
    {
        // Update Cosmos DB
        await _cosmosContainer.UpsertItemAsync(
            item, new PartitionKey(partitionKey));
            
        // Update cache
        string cacheKey = $\"{_regionName}:{typeof(T).Name}:{partitionKey}:{id}\";
        string serializedItem = JsonConvert.SerializeObject(item);
        await _cache.SetAsync(
            cacheKey,
            Encoding.UTF8.GetBytes(serializedItem),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _cacheDuration
            });
    }
    
    // Delete item and remove from cache
    public async Task DeleteItemAsync(string id, string partitionKey)
    {
        // Delete from Cosmos DB
        await _cosmosContainer.DeleteItemAsync<T>(
            id, new PartitionKey(partitionKey));
            
        // Remove from cache
        string cacheKey = $\"{_regionName}:{typeof(T).Name}:{partitionKey}:{id}\";
        await _cache.RemoveAsync(cacheKey);
    }
    
    // Invalidate cache for specific region
    public async Task InvalidateRegionalCacheAsync(string id, string partitionKey)
    {
        string cacheKey = $\"{_regionName}:{typeof(T).Name}:{partitionKey}:{id}\";
        await _cache.RemoveAsync(cacheKey);
    }
}
```

### Global Database Migration Strategy

For migrating to globally distributed Cosmos DB:

```csharp
// Migration service for moving data to globally distributed Cosmos DB
public class CosmosDbMigrationService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<CosmosDbMigrationService> _logger;
    
    public CosmosDbMigrationService(
        IConfiguration configuration,
        ILogger<CosmosDbMigrationService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }
    
    // Migrate data from source to globally distributed Cosmos DB
    public async Task MigrateAsync(
        string sourceConnectionString,
        string sourceCollectionName,
        string targetEndpoint,
        string targetKey,
        string targetDatabase,
        string targetContainer,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(\"Starting migration to globally distributed Cosmos DB\");
        
        // Create source MongoDB client
        var mongoClient = new MongoClient(sourceConnectionString);
        var sourceDatabase = mongoClient.GetDatabase(\"sourceDb\");
        var sourceCollection = sourceDatabase.GetCollection<BsonDocument>(sourceCollectionName);
        
        // Create target Cosmos DB client
        CosmosClient cosmosClient = new CosmosClient(
            targetEndpoint,
            targetKey,
            new CosmosClientOptions
            {
                ConnectionMode = ConnectionMode.Direct,
                MaxRetryAttemptsOnRateLimitedRequests = 9,
                MaxRetryWaitTimeOnRateLimitedRequests = TimeSpan.FromSeconds(30)
            });
            
        Database cosmosDatabase = await cosmosClient.CreateDatabaseIfNotExistsAsync(
            targetDatabase, cancellationToken: cancellationToken);
            
        Container cosmosContainer = await cosmosDatabase.CreateContainerIfNotExistsAsync(
            new ContainerProperties(targetContainer, \"/partitionKey\"),
            throughput: 10000,
            cancellationToken: cancellationToken);
            
        // Configure batch size and concurrency
        int batchSize = 100;
        int maxConcurrency = 10;
        SemaphoreSlim throttler = new SemaphoreSlim(maxConcurrency);
        
        // Track progress
        long totalDocuments = await sourceCollection.CountDocumentsAsync(
            FilterDefinition<BsonDocument>.Empty);
        long processedDocuments = 0;
        long migratedDocuments = 0;
        
        _logger.LogInformation($\"Found {totalDocuments} documents to migrate\");
        
        // Create a cursor for the source collection
        using (var cursor = await sourceCollection.FindAsync(
            FilterDefinition<BsonDocument>.Empty,
            cancellationToken: cancellationToken))
        {
            List<Task> migrationTasks = new List<Task>();
            List<BsonDocument> batch = new List<BsonDocument>();
            
            // Process documents in batches
            while (await cursor.MoveNextAsync(cancellationToken))
            {
                foreach (var document in cursor.Current)
                {
                    batch.Add(document);
                    processedDocuments++;
                    
                    // When batch is full, process it
                    if (batch.Count >= batchSize)
                    {
                        List<BsonDocument> batchToProcess = new List<BsonDocument>(batch);
                        batch.Clear();
                        
                        // Wait for semaphore
                        await throttler.WaitAsync(cancellationToken);
                        
                        // Start task to process batch
                        migrationTasks.Add(Task.Run(async () =>
                        {
                            try
                            {
                                await ProcessBatchAsync(
                                    cosmosContainer,
                                    batchToProcess,
                                    cancellationToken);
                                    
                                Interlocked.Add(ref migratedDocuments, batchToProcess.Count);
                                
                                // Log progress
                                if (migratedDocuments % 1000 == 0)
                                {
                                    _logger.LogInformation(
                                        $\"Migration progress: {migratedDocuments}/{totalDocuments} \" +
                                        $\"({(double)migratedDocuments / totalDocuments:P2})\");
                                }
                            }
                            finally
                            {
                                throttler.Release();
                            }
                        }, cancellationToken));
                    }
                }
            }
            
            // Process remaining documents
            if (batch.Count > 0)
            {
                await throttler.WaitAsync(cancellationToken);
                
                migrationTasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        await ProcessBatchAsync(
                            cosmosContainer,
                            batch,
                            cancellationToken);
                            
                        Interlocked.Add(ref migratedDocuments, batch.Count);
                    }
                    finally
                    {
                        throttler.Release();
                    }
                }, cancellationToken));
            }
            
            // Wait for all tasks to complete
            await Task.WhenAll(migrationTasks);
        }
        
        _logger.LogInformation(
            $\"Migration completed: {migratedDocuments}/{totalDocuments} documents migrated\");
    }
    
    // Process a batch of documents
    private async Task ProcessBatchAsync(
        Container container,
        List<BsonDocument> documents,
        CancellationToken cancellationToken)
    {
        List<Task> tasks = new List<Task>();
        
        foreach (var doc in documents)
        {
            // Convert MongoDB document to Cosmos DB format
            dynamic cosmosDoc = ConvertToCosmosDocument(doc);
            
            // Add task to create document
            tasks.Add(container.CreateItemAsync(
                cosmosDoc,
                new PartitionKey(cosmosDoc.partitionKey.ToString()),
                new ItemRequestOptions { EnableContentResponseOnWrite = false },
                cancellationToken));
        }
        
        // Wait for all documents in batch to be created
        try
        {
            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError($\"Error processing batch: {ex.Message}\");
            
            // Handle rate limiting or other errors
            if (ex is CosmosException cosmosEx &&
                cosmosEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                // Implement exponential backoff
                await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
            }
        }
    }
    
    // Convert MongoDB document to Cosmos DB format
    private dynamic ConvertToCosmosDocument(BsonDocument document)
    {
        // Convert ObjectId to string id
        string id = document[\"_id\"].AsObjectId.ToString();
        
        // Create expanded document
        dynamic cosmosDoc = new ExpandoObject();
        cosmosDoc.id = id;
        
        // Map fields
        foreach (var element in document.Elements)
        {
            string name = element.Name;
            if (name == \"_id\") continue;
            
            // Map fields to Cosmos DB document
            ((IDictionary<string, object>)cosmosDoc)[name] = ConvertBsonValue(element.Value);
        }
        
        // Generate partition key if missing
        if (!((IDictionary<string, object>)cosmosDoc).ContainsKey(\"partitionKey\"))
        {
            // Use a default partition strategy - adapt as needed
            cosmosDoc.partitionKey = id.Substring(0, Math.Min(id.Length, 8));
        }
        
        return cosmosDoc;
    }
    
    // Convert BsonValue to appropriate .NET type
    private object ConvertBsonValue(BsonValue value)
    {
        switch (value.BsonType)
        {
            case BsonType.ObjectId:
                return value.AsObjectId.ToString();
            case BsonType.String:
                return value.AsString;
            case BsonType.Int32:
                return value.AsInt32;
            case BsonType.Int64:
                return value.AsInt64;
            case BsonType.Double:
                return value.AsDouble;
            case BsonType.Boolean:
                return value.AsBoolean;
            case BsonType.DateTime:
                return value.ToUniversalTime();
            case BsonType.Null:
                return null;
            case BsonType.Document:
                dynamic nestedDoc = new ExpandoObject();
                foreach (var element in value.AsBsonDocument.Elements)
                {
                    ((IDictionary<string, object>)nestedDoc)[element.Name] = 
                        ConvertBsonValue(element.Value);
                }
                return nestedDoc;
            case BsonType.Array:
                return value.AsBsonArray
                    .Select(x => ConvertBsonValue(x))
                    .ToList();
            default:
                return value.ToString();
        }
    }
}
```

### Global Event Sourcing Architecture

Implement event sourcing with Cosmos DB for globally distributed applications:

```csharp
// Event sourcing components for globally distributed applications
public class EventStore
{
    private readonly Container _eventsContainer;
    private readonly Container _aggregatesContainer;
    
    public EventStore(
        CosmosClient client,
        string databaseName,
        string eventsContainerName,
        string aggregatesContainerName)
    {
        _eventsContainer = client.GetContainer(databaseName, eventsContainerName);
        _aggregatesContainer = client.GetContainer(databaseName, aggregatesContainerName);
    }
    
    // Save domain events
    public async Task<IEnumerable<DomainEvent>> SaveEventsAsync(
        string aggregateId,
        string aggregateType,
        int expectedVersion,
        IEnumerable<DomainEvent> events)
    {
        // Get the aggregate
        AggregateRoot aggregate;
        try
        {
            ItemResponse<AggregateRoot> response = await _aggregatesContainer.ReadItemAsync<AggregateRoot>(
                aggregateId, new PartitionKey(aggregateType));
                
            aggregate = response.Resource;
            
            // Optimistic concurrency check
            if (aggregate.Version != expectedVersion)
            {
                throw new ConcurrencyException(
                    $\"Aggregate {aggregateId} has been modified. \" +
                    $\"Expected version {expectedVersion}, actual version {aggregate.Version}.\");
            }
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // New aggregate
            aggregate = new AggregateRoot
            {
                Id = aggregateId,
                Type = aggregateType,
                Version = 0
            };
        }
        
        // Process events
        List<DomainEvent> processedEvents = new List<DomainEvent>();
        int newVersion = aggregate.Version;
        
        foreach (var @event in events)
        {
            // Increment version
            newVersion++;
            
            // Set event metadata
            @event.AggregateId = aggregateId;
            @event.AggregateType = aggregateType;
            @event.Version = newVersion;
            @event.Timestamp = DateTime.UtcNow;
            @event.EventId = Guid.NewGuid().ToString();
            
            // Store event
            await _eventsContainer.CreateItemAsync(
                @event,
                new PartitionKey(@event.AggregateId));
                
            processedEvents.Add(@event);
        }
        
        // Update aggregate version
        aggregate.Version = newVersion;
        await _aggregatesContainer.UpsertItemAsync(
            aggregate,
            new PartitionKey(aggregate.Type));
            
        return processedEvents;
    }
    
    // Get events for an aggregate
    public async Task<IEnumerable<DomainEvent>> GetEventsAsync(
        string aggregateId,
        int fromVersion = 0)
    {
        List<DomainEvent> events = new List<DomainEvent>();
        
        QueryDefinition query = new QueryDefinition(
            \"SELECT * FROM c WHERE c.aggregateId = @aggregateId AND c.version > @version \" +
            \"ORDER BY c.version\")
            .WithParameter(\"@aggregateId\", aggregateId)
            .WithParameter(\"@version\", fromVersion);
            
        FeedIterator<DomainEvent> resultSet = _eventsContainer.GetItemQueryIterator<DomainEvent>(
            query,
            requestOptions: new QueryRequestOptions
            {
                PartitionKey = new PartitionKey(aggregateId)
            });
            
        while (resultSet.HasMoreResults)
        {
            FeedResponse<DomainEvent> response = await resultSet.ReadNextAsync();
            events.AddRange(response);
        }
        
        return events;
    }
    
    // Rebuild aggregate from events
    public async Task<T> GetAggregateAsync<T>(string aggregateId) where T : AggregateRoot, new()
    {
        T aggregate = new T();
        
        // Get all events for this aggregate
        IEnumerable<DomainEvent> events = await GetEventsAsync(aggregateId);
        
        // Apply events to rebuild state
        foreach (var @event in events)
        {
            aggregate.ApplyEvent(@event);
        }
        
        return aggregate;
    }
}

// Domain event base class
public abstract class DomainEvent
{
    public string EventId { get; set; }
    public string AggregateId { get; set; }
    public string AggregateType { get; set; }
    public int Version { get; set; }
    public DateTime Timestamp { get; set; }
    public string EventType => GetType().Name;
}

// Aggregate root base class
public abstract class AggregateRoot
{
    public string Id { get; set; }
    public string Type { get; set; }
    public int Version { get; set; }
    
    public abstract void ApplyEvent(DomainEvent @event);
}

// Custom exception for concurrency issues
public class ConcurrencyException : Exception
{
    public ConcurrencyException(string message) : base(message) { }
}
```

This concludes the Cosmos DB Global Distribution Implementation Guide.`
}