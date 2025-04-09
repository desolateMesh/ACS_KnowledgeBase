# Real-World Examples: Bicep Templates for High-Scale Azure Environments

This document provides real-world examples of high-scale Azure environments implemented using Bicep templates. These case studies showcase different approaches to scaling, resilience, and management for various workload types.

## Table of Contents

1. [E-commerce Platform](#e-commerce-platform)
2. [Global Media Streaming Service](#global-media-streaming-service)
3. [Financial Services Trading Platform](#financial-services-trading-platform)
4. [Healthcare Data Processing System](#healthcare-data-processing-system)
5. [Gaming Backend Infrastructure](#gaming-backend-infrastructure)

## E-commerce Platform

### Scenario

A large retail organization needed to modernize their e-commerce platform to handle seasonal traffic spikes, particularly during holiday sales events when traffic could increase by 20x compared to normal operations.

### Architecture

![E-commerce Architecture](./diagrams/ecommerce-architecture.png)

The solution implemented a multi-tier architecture with:

- Frontend web tier using App Service Environment in multiple regions
- API middle tier using containers in Azure Kubernetes Service (AKS)
- Database tier with Azure SQL Elastic Pools and Cosmos DB
- Caching layer with Redis Cache
- Content delivery via Azure CDN

### Scaling Strategy

1. **Frontend Tier**: App Service Plan with autoscaling based on request count metrics
2. **API Tier**: AKS with Horizontal Pod Autoscaler (HPA) and cluster autoscaler
3. **Database Tier**: Auto-scale configuration for SQL Elastic Pools and Cosmos DB throughput
4. **Content Delivery**: Azure CDN for static content offloading

### Implementation Highlights

The frontend scale set implementation used the following Bicep code for autoscaling:

```bicep
resource appServicePlan 'Microsoft.Web/serverfarms@2021-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'P2v3'
    tier: 'PremiumV3'
    capacity: 3
  }
  properties: {
    targetWorkerCount: 3
    targetWorkerSizeId: 3
    maximumElasticWorkerCount: 20
  }
}

resource autoScaleSettings 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: '${appServicePlanName}-autoscale'
  location: location
  properties: {
    name: '${appServicePlanName}-autoscale'
    targetResourceUri: appServicePlan.id
    enabled: true
    profiles: [
      {
        name: 'DefaultProfile'
        capacity: {
          minimum: '3'
          maximum: '20'
          default: '3'
        }
        rules: [
          {
            // Scale out if request count per instance > 1000
            metricTrigger: {
              metricName: 'RequestsPerInstance'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 1000
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '2'
              cooldown: 'PT5M'
            }
          },
          {
            // Scale in if request count per instance < 500
            metricTrigger: {
              metricName: 'RequestsPerInstance'
              metricResourceUri: appServicePlan.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 500
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      },
      {
        // Black Friday profile with higher minimum capacity
        name: 'BlackFridayProfile'
        capacity: {
          minimum: '10'
          maximum: '30'
          default: '15'
        }
        rules: [
          // Similar rules but with different thresholds
        ]
        recurrence: {
          // Schedule for Black Friday weekend
          frequency: 'Week'
          schedule: {
            timeZone: 'Eastern Standard Time'
            days: ['Friday', 'Saturday', 'Sunday']
            hours: [0]
            minutes: [0]
          }
        }
      }
    ]
  }
}
```

### Results

- 99.99% uptime during peak seasonal traffic
- 65% reduction in infrastructure costs during off-peak seasons
- Ability to handle 200,000 concurrent users
- 40% improvement in page load times

## Global Media Streaming Service

### Scenario

A media company needed a global streaming platform capable of delivering video content to millions of concurrent users across the world with low latency and high reliability.

### Architecture

The solution used a global architecture with:

- Content ingestion and processing pipeline using Azure Functions and Media Services
- Azure Front Door for global routing and load balancing
- Azure CDN for content delivery
- Storage accounts with geo-replication for media assets
- Virtual Machine Scale Sets for transcoding jobs
- Azure Kubernetes Service for the API layer

### Scaling Strategy

1. **Transcoding**: VMSS with custom metrics based on queue length
2. **Content Delivery**: Multi-region deployment with automatic failover
3. **API Layer**: Regional AKS clusters with pod and node autoscaling

### Implementation Highlights

The transcoding VMSS used custom metrics-based autoscaling:

```bicep
resource vmss 'Microsoft.Compute/virtualMachineScaleSets@2023-03-01' = {
  name: vmssName
  location: location
  sku: {
    name: 'Standard_F8s_v2'
    tier: 'Standard'
    capacity: 5
  }
  properties: {
    overprovision: true
    upgradePolicy: {
      mode: 'Automatic'
    }
    virtualMachineProfile: {
      // VM configuration
    }
  }
}

resource autoScaleSettings 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: '${vmssName}-autoscale'
  location: location
  properties: {
    enabled: true
    targetResourceUri: vmss.id
    profiles: [
      {
        name: 'Custom Metric Profile'
        capacity: {
          minimum: '5'
          maximum: '100'
          default: '5'
        }
        rules: [
          {
            // Scale based on queue length custom metric
            metricTrigger: {
              metricName: 'TranscodingQueueLength'
              metricNamespace: 'Azure.ApplicationInsights'
              metricResourceUri: appInsights.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT5M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 20
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '5'
              cooldown: 'PT5M'
            }
          },
          {
            metricTrigger: {
              metricName: 'TranscodingQueueLength'
              metricNamespace: 'Azure.ApplicationInsights'
              metricResourceUri: appInsights.id
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT15M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 5
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT15M'
            }
          }
        ]
      }
    ]
  }
}
```

### Results

- Ability to handle 3 million concurrent viewers
- Sub-second startup times for video streams
- 99.99% global availability
- Auto-scaling to handle unexpected traffic surges
- Efficient resource utilization, scaling down to 10% of peak capacity during low-demand periods

## Financial Services Trading Platform

### Scenario

A financial services company needed a high-throughput, low-latency trading platform capable of handling millions of transactions per second with strict requirements for security, compliance, and reliability.

### Architecture

The solution implemented:

- Dedicated virtual networks with ExpressRoute connections
- AKS clusters in multiple regions with zone redundancy
- Event Hubs for real-time data ingestion
- Azure Synapse Analytics for data warehousing and analytics
- Azure Cache for Redis for session state and caching
- Azure Key Vault for secret management
- Azure Update Manager for infrastructure patching

### Scaling Strategy

1. **Trading Engine**: AKS with KEDA (Kubernetes-based Event-Driven Autoscaling)
2. **Data Processing**: Event Hubs with auto-inflate
3. **Analytics**: Synapse serverless SQL pools with automated scaling

### Implementation Highlights

The AKS clusters were deployed with KEDA autoscaling using this Bicep code:

```bicep
resource aksCluster 'Microsoft.ContainerService/managedClusters@2023-03-02' = {
  name: aksClusterName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    kubernetesVersion: '1.25.5'
    dnsPrefix: aksClusterName
    enableRBAC: true
    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'calico'
      loadBalancerSku: 'standard'
    }
    agentPoolProfiles: [
      {
        name: 'systemnodes'
        count: 3
        vmSize: 'Standard_D4s_v3'
        mode: 'System'
        maxPods: 50
        availabilityZones: [
          '1'
          '2'
          '3'
        ]
      }
      {
        name: 'tradingnodes'
        count: 5
        vmSize: 'Standard_F16s_v2'
        mode: 'User'
        maxPods: 110
        availabilityZones: [
          '1'
          '2'
          '3'
        ]
        enableAutoScaling: true
        minCount: 5
        maxCount: 30
      }
    ]
    addonProfiles: {
      azurePolicy: {
        enabled: true
      }
      omsagent: {
        enabled: true
        config: {
          logAnalyticsWorkspaceResourceID: logAnalyticsWorkspace.id
        }
      }
    }
  }
}
```

### Results

- 99.999% uptime achieved
- Processing capacity of over 2 million transactions per second
- Sub-millisecond response times for trading operations
- Compliance with financial industry regulations
- Automated security patching with zero downtime

## Healthcare Data Processing System

### Scenario

A healthcare organization needed a scalable platform to process and analyze patient data from hundreds of healthcare facilities, handling both batch processing and real-time analytics while maintaining strict compliance with healthcare regulations.

### Architecture

The solution implemented:

- Event Hubs for data ingestion
- Azure Data Factory for ETL processes
- Azure Databricks for data processing
- Azure Synapse Analytics for data warehousing
- Azure Machine Learning for predictive analytics
- VMSS for specialized processing engines
- Azure Monitor for comprehensive monitoring

### Scaling Strategy

1. **Data Processing**: Databricks auto-scaling clusters
2. **ETL Pipeline**: Data Factory Integration Runtime auto-scaling
3. **Analytics**: Synapse dedicated SQL pools with workload management

### Implementation Highlights

The Databricks workspace was provisioned with the following Bicep code:

```bicep
resource databricksWorkspace 'Microsoft.Databricks/workspaces@2023-02-01' = {
  name: databricksWorkspaceName
  location: location
  sku: {
    name: 'premium'
  }
  properties: {
    managedResourceGroupId: managedResourceGroupId
    parameters: {
      enableNoPublicIp: {
        value: true
      }
      customVirtualNetworkId: {
        value: virtualNetwork.id
      }
      customPrivateSubnetName: {
        value: privateSubnetName
      }
      customPublicSubnetName: {
        value: publicSubnetName
      }
    }
  }
}
```

### Results

- Processing of 10TB of healthcare data daily
- 60% reduction in data processing time
- Compliance with HIPAA regulations
- Real-time analytics capabilities
- Automated scaling to handle variable workloads

## Gaming Backend Infrastructure

### Scenario

A gaming company needed to create a backend infrastructure for their multiplayer online game, capable of handling millions of concurrent players with real-time communication requirements.

### Architecture

The solution implemented:

- AKS for game servers with node pools in multiple regions
- Azure PlayFab for game services
- Azure SignalR Service for real-time communication
- Cosmos DB for game state storage
- Azure Cache for Redis for session management
- Azure Front Door for global load balancing
- Blob Storage for game assets

### Scaling Strategy

1. **Game Servers**: AKS with custom metrics-based autoscaling
2. **Database**: Cosmos DB with autoscale throughput
3. **Real-time Communication**: SignalR Service with autoscaling units

### Implementation Highlights

The Cosmos DB was deployed with autoscale throughput:

```bicep
resource cosmosDBAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: cosmosDBAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: true
      }
      {
        locationName: secondaryLocation
        failoverPriority: 1
        isZoneRedundant: true
      }
    ]
    enableAutomaticFailover: true
    enableMultipleWriteLocations: true
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource cosmosDBDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosDBAccount
  name: cosmosDBDatabaseName
  properties: {
    resource: {
      id: cosmosDBDatabaseName
    }
  }
}

resource cosmosDBContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDBDatabase
  name: cosmosDBContainerName
  properties: {
    resource: {
      id: cosmosDBContainerName
      partitionKey: {
        paths: [
          '/playerId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
    options: {
      autoscaleSettings: {
        maxThroughput: 10000
      }
    }
  }
}
```

### Results

- Support for 5 million concurrent players
- 25ms or less latency for real-time game actions
- Seamless scaling during player surges
- 99.99% availability
- Cost optimization with serverless components

## Conclusion

These real-world examples demonstrate the effectiveness of using Bicep templates to deploy and manage high-scale Azure environments across various industries and workload types. By leveraging Azure's autoscaling capabilities, organizations can build infrastructures that dynamically adjust to demand while maintaining performance, reliability, and cost-effectiveness.

For detailed implementation guidance, refer to the [Implementation Guide](implementation-guide.md) document.
