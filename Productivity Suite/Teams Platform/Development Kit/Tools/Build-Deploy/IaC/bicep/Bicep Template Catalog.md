# Bicep Template Catalog

## Overview

This document provides a comprehensive catalog of Bicep templates for the Teams Platform Development Kit. Bicep is Microsoft's domain-specific language (DSL) for deploying Azure resources declaratively. These templates are designed to streamline Infrastructure as Code (IaC) deployments across various Teams Platform services and components.

## Table of Contents

1. [Introduction to Bicep](#introduction-to-bicep)
2. [Core Infrastructure Templates](#core-infrastructure-templates)
3. [Teams Platform-Specific Templates](#teams-platform-specific-templates)
4. [Networking Templates](#networking-templates)
5. [Security Templates](#security-templates)
6. [Monitoring and Observability Templates](#monitoring-and-observability-templates)
7. [Best Practices](#best-practices)
8. [Template Usage Guide](#template-usage-guide)
9. [Troubleshooting](#troubleshooting)

## Introduction to Bicep

Bicep is Microsoft's Infrastructure as Code (IaC) language designed specifically for deploying Azure resources. It provides a more concise syntax compared to ARM templates, with improved type safety, modularity, and developer experience.

### Key Features

- **Declarative syntax**: Define the desired end-state of your Azure resources
- **Type safety**: Catch deployment errors before runtime
- **Modularity**: Reuse common templates and patterns
- **IDE integration**: IntelliSense and validation in VS Code and other editors
- **Transparent ARM compilation**: Bicep files compile directly to ARM templates

### Getting Started

```bash
# Install the Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Bicep
az bicep install

# Verify installation
az bicep version
```

## Core Infrastructure Templates

### Base Resource Group Template

**File**: `base-resource-group.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Resource Group is created at a higher level

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      name: 'standard'
      family: 'A'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

// Output the created resource IDs
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output appInsightsId string = appInsights.id
output keyVaultId string = keyVault.id
```

### Storage Account Template

**File**: `storage-account.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Storage account name prefix')
param storageNamePrefix string = 'st'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: '${storageNamePrefix}${environmentName}${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  sku: {
    name: environmentName == 'prod' ? 'Standard_GRS' : 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// Blob Service
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2022-09-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// Create a container
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2022-09-01' = {
  parent: blobService
  name: 'data'
  properties: {
    publicAccess: 'None'
  }
}

// Output the storage account name and primary endpoint
output storageAccountName string = storageAccount.name
output storageAccountBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
```

### Azure SQL Database Template

**File**: `sql-database.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('SQL Server name')
param sqlServerName string = 'sql-${environmentName}-${uniqueString(resourceGroup().id)}'

@description('Database name')
param databaseName string = 'TeamsPlatformDB'

@description('SQL Server administrator login name')
@secure()
param administratorLogin string

@description('SQL Server administrator password')
@secure()
param administratorLoginPassword string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// SQL Server
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: sqlServerName
  location: location
  tags: tags
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: environmentName == 'prod' ? 'Disabled' : 'Enabled'
  }
}

// SQL Database
resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: databaseName
  location: location
  tags: tags
  sku: {
    name: environmentName == 'prod' ? 'Standard' : 'Basic'
    tier: environmentName == 'prod' ? 'Standard' : 'Basic'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: environmentName == 'prod' ? 268435456000 : 2147483648
    zoneRedundant: environmentName == 'prod' ? true : false
    readScale: environmentName == 'prod' ? 'Enabled' : 'Disabled'
    requestedBackupStorageRedundancy: environmentName == 'prod' ? 'Geo' : 'Local'
  }
}

// Allow Azure services and resources to access this server
resource allowAzureIPs 'Microsoft.Sql/servers/firewallRules@2022-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Output the fully qualified domain name of the SQL Server
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output databaseName string = sqlDatabase.name
```

## Teams Platform-Specific Templates

### Teams App Host Template

**File**: `teams-app-host.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

@description('App service plan SKU')
param appServicePlanSku object = {
  name: environmentName == 'prod' ? 'P1v2' : 'B1'
  tier: environmentName == 'prod' ? 'PremiumV2' : 'Basic'
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku.name
    tier: appServicePlanSku.tier
  }
  properties: {
    reserved: true // For Linux
  }
}

// Web App for hosting Teams app
resource teamsAppWebApp 'Microsoft.Web/sites@2022-03-01' = {
  name: 'app-teams-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|16-lts'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~16'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'TEAMS_APP_ID'
          value: 'your-teams-app-id' // Replace with your Teams app ID or use a parameter
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

// Configure diagnostic settings for the web app
resource webAppDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diagnostics'
  scope: teamsAppWebApp
  properties: {
    logs: [
      {
        category: 'AppServiceHTTPLogs'
        enabled: true
      }
      {
        category: 'AppServiceConsoleLogs'
        enabled: true
      }
      {
        category: 'AppServiceAppLogs'
        enabled: true
      }
      {
        category: 'AppServiceAuditLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
    // logAnalyticsDestination can be connected to a Log Analytics workspace
  }
}

// Output the web app URL
output teamsAppUrl string = 'https://${teamsAppWebApp.properties.defaultHostName}'
```

### Bot Service Template

**File**: `bot-service.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Bot name')
param botName string = 'bot-${environmentName}-${uniqueString(resourceGroup().id)}'

@description('App service plan SKU')
param appServicePlanSku object = {
  name: environmentName == 'prod' ? 'P1v2' : 'B1'
  tier: environmentName == 'prod' ? 'PremiumV2' : 'Basic'
}

@description('Microsoft App ID for the bot')
param microsoftAppId string

@description('Microsoft App password for the bot')
@secure()
param microsoftAppPassword string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-bot-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku.name
    tier: appServicePlanSku.tier
  }
  properties: {
    reserved: true // For Linux
  }
}

// Web App for Bot
resource botWebApp 'Microsoft.Web/sites@2022-03-01' = {
  name: botName
  location: location
  tags: tags
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|16-lts'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~16'
        }
        {
          name: 'MicrosoftAppId'
          value: microsoftAppId
        }
        {
          name: 'MicrosoftAppPassword'
          value: microsoftAppPassword
        }
        {
          name: 'ScmType'
          value: 'None'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

// Bot Service
resource botService 'Microsoft.BotService/botServices@2022-06-15-preview' = {
  name: botName
  location: 'global'
  tags: tags
  sku: {
    name: 'F0'
  }
  kind: 'bot'
  properties: {
    displayName: botName
    endpoint: 'https://${botWebApp.properties.defaultHostName}/api/messages'
    msaAppId: microsoftAppId
    developerAppInsightKey: ''
    developerAppInsightsApplicationId: ''
  }
}

// Bot Channel Registration - MS Teams Channel
resource botServiceMsTeamsChannel 'Microsoft.BotService/botServices/channels@2022-06-15-preview' = {
  parent: botService
  name: 'MsTeamsChannel'
  location: 'global'
  properties: {
    channelName: 'MsTeamsChannel'
    properties: {
      isEnabled: true
    }
  }
}

// Output the bot endpoint
output botEndpoint string = 'https://${botWebApp.properties.defaultHostName}/api/messages'
```

### Teams API Service Template

**File**: `teams-api-service.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('API service name')
param apiServiceName string = 'api-teams-${environmentName}-${uniqueString(resourceGroup().id)}'

@description('App service plan SKU')
param appServicePlanSku object = {
  name: environmentName == 'prod' ? 'P1v2' : 'B1'
  tier: environmentName == 'prod' ? 'PremiumV2' : 'Basic'
}

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: 'plan-api-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku.name
    tier: appServicePlanSku.tier
  }
  properties: {
    reserved: true // For Linux
  }
}

// API App Service
resource apiAppService 'Microsoft.Web/sites@2022-03-01' = {
  name: apiServiceName
  location: location
  tags: tags
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|6.0'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: environmentName
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: 'your-app-insights-connection-string' // Replace or use a parameter/reference
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
      ]
    }
  }
}

// API Management Service (optional for larger deployments)
resource apimService 'Microsoft.ApiManagement/service@2022-08-01' = if (environmentName == 'prod') {
  name: 'apim-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  sku: {
    name: 'Developer'
    capacity: 1
  }
  properties: {
    publisherEmail: 'admin@contoso.com' // Replace with your email
    publisherName: 'Contoso Teams Platform'
  }
}

// Output the API service URL
output apiServiceUrl string = 'https://${apiAppService.properties.defaultHostName}'
```

## Networking Templates

### Virtual Network Template

**File**: `virtual-network.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Virtual network CIDR')
param vnetCidr string = '10.0.0.0/16'

@description('Subnet CIDR for application services')
param appSubnetCidr string = '10.0.1.0/24'

@description('Subnet CIDR for databases')
param dbSubnetCidr string = '10.0.2.0/24'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Virtual Network
resource virtualNetwork 'Microsoft.Network/virtualNetworks@2022-07-01' = {
  name: 'vnet-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        vnetCidr
      ]
    }
    subnets: [
      {
        name: 'app-subnet'
        properties: {
          addressPrefix: appSubnetCidr
          serviceEndpoints: [
            {
              service: 'Microsoft.KeyVault'
            }
            {
              service: 'Microsoft.Storage'
            }
            {
              service: 'Microsoft.Sql'
            }
          ]
          delegations: []
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
      }
      {
        name: 'db-subnet'
        properties: {
          addressPrefix: dbSubnetCidr
          serviceEndpoints: [
            {
              service: 'Microsoft.Sql'
            }
            {
              service: 'Microsoft.Storage'
            }
          ]
          delegations: []
          privateEndpointNetworkPolicies: 'Disabled'
          privateLinkServiceNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}

// Network Security Group for App Subnet
resource appNsg 'Microsoft.Network/networkSecurityGroups@2022-07-01' = {
  name: 'nsg-app-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowHTTPSInbound'
        properties: {
          priority: 100
          access: 'Allow'
          direction: 'Inbound'
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: '*'
          destinationPortRange: '443'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

// Network Security Group for DB Subnet
resource dbNsg 'Microsoft.Network/networkSecurityGroups@2022-07-01' = {
  name: 'nsg-db-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'AllowSQLInbound'
        properties: {
          priority: 100
          access: 'Allow'
          direction: 'Inbound'
          protocol: 'Tcp'
          sourcePortRange: '*'
          sourceAddressPrefix: appSubnetCidr
          destinationPortRange: '1433'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

// Associate NSG with App Subnet
resource appSubnetNsgAssociation 'Microsoft.Network/virtualNetworks/subnets@2022-07-01' = {
  parent: virtualNetwork
  name: 'app-subnet'
  properties: {
    addressPrefix: appSubnetCidr
    networkSecurityGroup: {
      id: appNsg.id
    }
    serviceEndpoints: [
      {
        service: 'Microsoft.KeyVault'
      }
      {
        service: 'Microsoft.Storage'
      }
      {
        service: 'Microsoft.Sql'
      }
    ]
    delegations: []
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
  }
}

// Associate NSG with DB Subnet
resource dbSubnetNsgAssociation 'Microsoft.Network/virtualNetworks/subnets@2022-07-01' = {
  parent: virtualNetwork
  name: 'db-subnet'
  properties: {
    addressPrefix: dbSubnetCidr
    networkSecurityGroup: {
      id: dbNsg.id
    }
    serviceEndpoints: [
      {
        service: 'Microsoft.Sql'
      }
      {
        service: 'Microsoft.Storage'
      }
    ]
    delegations: []
    privateEndpointNetworkPolicies: 'Disabled'
    privateLinkServiceNetworkPolicies: 'Enabled'
  }
  dependsOn: [
    appSubnetNsgAssociation // Ensure we don't try to update the subnet simultaneously
  ]
}

// Output the virtual network and subnet IDs
output virtualNetworkId string = virtualNetwork.id
output appSubnetId string = resourceId('Microsoft.Network/virtualNetworks/subnets', virtualNetwork.name, 'app-subnet')
output dbSubnetId string = resourceId('Microsoft.Network/virtualNetworks/subnets', virtualNetwork.name, 'db-subnet')
```

### Front Door CDN Template

**File**: `front-door.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Frontend endpoint name')
param frontendEndpointName string = 'teamsfrontend-${environmentName}'

@description('Backend address (FQDN of your origin)')
param backendAddress string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Front Door Profile
resource frontDoorProfile 'Microsoft.Cdn/profiles@2022-11-01-preview' = {
  name: 'afd-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: 'global'
  tags: tags
  sku: {
    name: environmentName == 'prod' ? 'Standard_AzureFrontDoor' : 'Standard_AzureFrontDoor'
  }
}

// Front Door Endpoint
resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2022-11-01-preview' = {
  parent: frontDoorProfile
  name: frontendEndpointName
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

// Front Door Origin Group
resource originGroup 'Microsoft.Cdn/profiles/originGroups@2022-11-01-preview' = {
  parent: frontDoorProfile
  name: 'teams-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 100
    }
  }
}

// Front Door Origin
resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2022-11-01-preview' = {
  parent: originGroup
  name: 'teams-origin'
  properties: {
    hostName: backendAddress
    httpPort: 80
    httpsPort: 443
    originHostHeader: backendAddress
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// Front Door Route
resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2022-11-01-preview' = {
  parent: frontDoorEndpoint
  name: 'teams-route'
  properties: {
    originGroup: {
      id: originGroup.id
    }
    supportedProtocols: [
      'Http'
      'Https'
    ]
    patternsToMatch: [
      '/*'
    ]
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
  }
}

// WAF Policy (for production only)
resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = if (environmentName == 'prod') {
  name: 'wafpolicy-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: 'global'
  tags: tags
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'
    }
    managedRules: {
      managedRuleSets: [
        {
          ruleSetType: 'DefaultRuleSet'
          ruleSetVersion: '1.0'
        }
        {
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
        }
      ]
    }
  }
}

// Output the Front Door endpoint URL
output frontDoorEndpointUrl string = 'https://${frontDoorEndpoint.properties.hostName}'
```

## Security Templates

### Key Vault with Private Endpoint

**File**: `key-vault-private-endpoint.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Virtual network ID to connect to')
param vnetId string

@description('Subnet ID for private endpoints')
param subnetId string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      name: 'standard'
      family: 'A'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// Private DNS Zone for Key Vault
resource keyVaultDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

// Link the private DNS zone to the VNet
resource keyVaultDnsZoneVnetLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: keyVaultDnsZone
  name: '${environmentName}-vnet-link'
  location: 'global'
  tags: tags
  properties: {
    registrationEnabled: false
    virtualNetwork: {
      id: vnetId
    }
  }
}

// Private Endpoint for Key Vault
resource keyVaultPrivateEndpoint 'Microsoft.Network/privateEndpoints@2022-07-01' = {
  name: 'pe-kv-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: subnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'keyvault-connection'
        properties: {
          privateLinkServiceId: keyVault.id
          groupIds: [
            'vault'
          ]
        }
      }
    ]
  }
}

// Private DNS Zone Group for Key Vault
resource keyVaultPrivateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2022-07-01' = {
  parent: keyVaultPrivateEndpoint
  name: 'keyvault-dns-group'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config1'
        properties: {
          privateDnsZoneId: keyVaultDnsZone.id
        }
      }
    ]
  }
}

// Output the Key Vault ID
output keyVaultId string = keyVault.id
output keyVaultName string = keyVault.name
```

### Managed Identity Template

**File**: `managed-identity.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Managed identity name')
param identityName string = 'id-teams-${environmentName}-${uniqueString(resourceGroup().id)}'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// User Assigned Managed Identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: tags
}

// Key Vault for accessing secrets
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: 'kv-${environmentName}-${uniqueString(resourceGroup().id)}'
}

// Assign Key Vault Secrets User role to the managed identity
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentity.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User role
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Output the managed identity ID
output managedIdentityId string = managedIdentity.id
output managedIdentityPrincipalId string = managedIdentity.properties.principalId
output managedIdentityClientId string = managedIdentity.properties.clientId
```

## Monitoring and Observability Templates

### Application Insights Template

**File**: `application-insights.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Application name')
param applicationName string = 'teams-platform'

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${applicationName}-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: -1
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${applicationName}-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 90
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Action Group for Alerting
resource actionGroup 'Microsoft.Insights/actionGroups@2022-06-01' = {
  name: 'ag-${applicationName}-${environmentName}'
  location: 'global'
  properties: {
    groupShortName: 'TeamsPlatfrm'
    enabled: true
    emailReceivers: [
      {
        name: 'Email Notification'
        emailAddress: 'alerts@contoso.com' // Replace with your email
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: []
    webhookReceivers: []
    armRoleReceivers: []
    azureAppPushReceivers: []
    azureFunctionReceivers: []
    logicAppReceivers: []
    voiceReceivers: []
  }
}

// Alert Rule for Availability
resource availabilityAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-availability-${applicationName}-${environmentName}'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when application availability drops below 99% for 5 minutes'
    severity: 1
    enabled: true
    scopes: [
      appInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Availability'
          metricName: 'availabilityResults/availabilityPercentage'
          operator: 'LessThan'
          threshold: 99
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Alert Rule for Server Errors
resource serverErrorsAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-server-errors-${applicationName}-${environmentName}'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when server errors exceed threshold'
    severity: 1
    enabled: true
    scopes: [
      appInsights.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ServerErrors'
          metricName: 'requests/failed'
          operator: 'GreaterThan'
          threshold: environmentName == 'prod' ? 5 : 10
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Output the Application Insights connection string and instrumentation key
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
```

### Monitoring Dashboard Template

**File**: `monitoring-dashboard.bicep`

```bicep
@description('The Azure region for the resources')
param location string = resourceGroup().location

@description('Environment name (dev, test, prod)')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string

@description('Application Insights resource ID')
param appInsightsId string

@description('Tags to apply to all resources')
param tags object = {
  Environment: environmentName
  Application: 'Teams Platform'
}

// Dashboard with Application Insights metrics
resource dashboard 'Microsoft.Portal/dashboards@2020-09-01-preview' = {
  name: 'dashboard-teams-${environmentName}-${uniqueString(resourceGroup().id)}'
  location: location
  tags: tags
  properties: {
    lenses: [
      {
        order: 0
        parts: [
          {
            position: {
              x: 0
              y: 0
              colSpan: 6
              rowSpan: 4
            }
            metadata: {
              inputs: [
                {
                  name: 'resourceTypeMode'
                  isOptional: true
                  value: 'workspace'
                }
                {
                  name: 'ComponentId'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'Scope'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'PartId'
                  isOptional: true
                  value: 'Performance Counter'
                }
                {
                  name: 'Version'
                  isOptional: true
                  value: '2.0'
                }
                {
                  name: 'TimeRange'
                  isOptional: true
                  value: 'P1D' // Past 1 day
                }
                {
                  name: 'DashboardId'
                  isOptional: true
                  value: '7b371c0c-9342-42d3-9996-89f58436823c'
                }
              ]
              type: 'Extension/AppInsightsExtension/PartType/AvailabilityNavPartType'
              asset: {
                idInputName: 'ComponentId'
                type: 'ApplicationInsights'
              }
              defaultMenuItemId: 'availability'
            }
          }
          {
            position: {
              x: 6
              y: 0
              colSpan: 6
              rowSpan: 4
            }
            metadata: {
              inputs: [
                {
                  name: 'resourceTypeMode'
                  isOptional: true
                  value: 'workspace'
                }
                {
                  name: 'ComponentId'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'Scope'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'PartId'
                  isOptional: true
                  value: 'Performance Counter'
                }
                {
                  name: 'Version'
                  isOptional: true
                  value: '2.0'
                }
                {
                  name: 'TimeRange'
                  isOptional: true
                  value: 'P1D' // Past 1 day
                }
                {
                  name: 'DashboardId'
                  isOptional: true
                  value: '7b371c0c-9342-42d3-9996-89f58436823c'
                }
              ]
              type: 'Extension/AppInsightsExtension/PartType/PerformanceNavPartType'
              asset: {
                idInputName: 'ComponentId'
                type: 'ApplicationInsights'
              }
              defaultMenuItemId: 'performance'
            }
          }
          {
            position: {
              x: 0
              y: 4
              colSpan: 6
              rowSpan: 4
            }
            metadata: {
              inputs: [
                {
                  name: 'resourceTypeMode'
                  isOptional: true
                  value: 'workspace'
                }
                {
                  name: 'ComponentId'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'Scope'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'PartId'
                  isOptional: true
                  value: 'Performance Counter'
                }
                {
                  name: 'Version'
                  isOptional: true
                  value: '2.0'
                }
                {
                  name: 'TimeRange'
                  isOptional: true
                  value: 'P1D' // Past 1 day
                }
                {
                  name: 'DashboardId'
                  isOptional: true
                  value: '7b371c0c-9342-42d3-9996-89f58436823c'
                }
              ]
              type: 'Extension/AppInsightsExtension/PartType/UsageNavPartType'
              asset: {
                idInputName: 'ComponentId'
                type: 'ApplicationInsights'
              }
              defaultMenuItemId: 'usage'
            }
          }
          {
            position: {
              x: 6
              y: 4
              colSpan: 6
              rowSpan: 4
            }
            metadata: {
              inputs: [
                {
                  name: 'resourceTypeMode'
                  isOptional: true
                  value: 'workspace'
                }
                {
                  name: 'ComponentId'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'Scope'
                  isOptional: true
                  value: {
                    SubscriptionId: subscription().subscriptionId
                    ResourceGroup: resourceGroup().name
                    Name: appInsightsId
                    ResourceId: appInsightsId
                  }
                }
                {
                  name: 'PartId'
                  isOptional: true
                  value: 'Performance Counter'
                }
                {
                  name: 'Version'
                  isOptional: true
                  value: '2.0'
                }
                {
                  name: 'TimeRange'
                  isOptional: true
                  value: 'P1D' // Past 1 day
                }
                {
                  name: 'DashboardId'
                  isOptional: true
                  value: '7b371c0c-9342-42d3-9996-89f58436823c'
                }
              ]
              type: 'Extension/AppInsightsExtension/PartType/FailuresNavPartType'
              asset: {
                idInputName: 'ComponentId'
                type: 'ApplicationInsights'
              }
              defaultMenuItemId: 'failures'
            }
          }
        ]
      }
    ]
    metadata: {
      model: {
        timeRange: {
          value: {
            relative: {
              duration: 24
              timeUnit: 1
            }
          }
          type: 'MsPortalFx.Composition.Configuration.ValueTypes.TimeRange'
        }
      }
    }
  }
}

// Output the dashboard resource ID
output dashboardId string = dashboard.id
output dashboardName string = dashboard.name
```

## Best Practices

Bicep deployment should follow these best practices:

1. **Modular Design**: Break down complex infrastructure into reusable modules
2. **Resource Naming Convention**: Follow consistent naming patterns that include:
   - Resource type abbreviation (e.g., kv for Key Vault)
   - Environment indicator (dev, test, prod)
   - Unique suffix to ensure global uniqueness
3. **Parameter Validation**: Use parameter constraints (allowed values, min/max)
4. **Secure Handling of Secrets**: Never hardcode secrets, use Key Vault references
5. **Environment-specific Configurations**: Use conditionals to adapt to different environments
6. **Tagging Strategy**: Apply consistent tags for resource management
7. **Outputs**: Export important resource identifiers for use in other templates

## Template Usage Guide

### Deployment Process

1. **Prerequisites**:
   - Azure CLI installed
   - Sufficient permissions (Contributor role on target subscription/resource group)
   - Parameters file prepared for each environment

2. **Validate Template**:
   ```bash
   az bicep build --file template.bicep
   ```

3. **Deploy to Resource Group**:
   ```bash
   az deployment group create \
     --resource-group myResourceGroup \
     --template-file template.bicep \
     --parameters @parameters.dev.json
   ```

4. **Deploy to Subscription**:
   ```bash
   az deployment sub create \
     --location eastus \
     --template-file template.bicep \
     --parameters @parameters.dev.json
   ```

### Parameter Files

Create environment-specific parameter files to simplify deployments:

**parameters.dev.json**:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environmentName": {
      "value": "dev"
    },
    "location": {
      "value": "eastus"
    }
  }
}
```

**parameters.prod.json**:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environmentName": {
      "value": "prod"
    },
    "location": {
      "value": "eastus"
    }
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Resource Name Conflicts**:
   - Error: "Resource 'resourceName' already exists"
   - Solution: Ensure unique naming or use `uniqueString()` function

2. **Dependency Issues**:
   - Error: "Resource 'resourceName' was not found"
   - Solution: Check resource references and ensure correct dependency order with `dependsOn`

3. **Permission Problems**:
   - Error: "The client does not have authorization"
   - Solution: Verify Azure AD role assignments for the deployment identity

4. **Parameter Validation Failures**:
   - Error: "Parameter 'paramName' is not valid"
   - Solution: Ensure parameter values match constraints in the template

5. **Quota Limits**:
   - Error: "Operation could not be completed as it results in exceeding quota limits"
   - Solution: Request quota increases or adjust resource sizing

### Deployment Validation

Before large-scale deployments, test templates using the `what-if` operation:

```bash
az deployment group what-if \
  --resource-group myResourceGroup \
  --template-file template.bicep \
  --parameters @parameters.dev.json
```

### Debugging Tips

1. Use verbose logging:
   ```bash
   az deployment group create \
     --resource-group myResourceGroup \
     --template-file template.bicep \
     --parameters @parameters.dev.json \
     --debug
   ```

2. Check deployment operations in the Azure Portal:
   - Navigate to Resource Group → Deployments → Select deployment → Operations

3. For complex templates, deploy resources incrementally to isolate issues:
   ```bash
   az deployment group create \
     --resource-group myResourceGroup \
     --template-file template.bicep \
     --parameters @parameters.dev.json \
     --mode Incremental
   ```
