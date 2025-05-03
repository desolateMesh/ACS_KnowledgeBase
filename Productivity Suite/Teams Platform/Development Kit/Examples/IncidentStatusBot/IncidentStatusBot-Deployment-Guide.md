# IncidentStatusBot Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Azure Resources Setup](#azure-resources-setup)
- [Bot Registration](#bot-registration)
- [Application Configuration](#application-configuration)
- [Teams Integration](#teams-integration)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Overview

The IncidentStatusBot is a Microsoft Teams bot designed to provide real-time status updates for IT incidents, enabling teams to efficiently manage and respond to service disruptions. This deployment guide provides step-by-step instructions for setting up the IncidentStatusBot in your Microsoft Teams environment.

The bot offers the following key features:
- Real-time incident status updates directly in Teams channels
- Integration with popular monitoring and alerting systems
- Incident timeline visualization
- Configurable notification rules
- Service health aggregation dashboard
- Proactive alerting for critical events

## Prerequisites

Before deploying the IncidentStatusBot, ensure you have the following prerequisites:

- **Microsoft Azure Subscription** with permissions to create:
  - Azure Bot Service
  - Azure App Service
  - Azure Functions
  - Azure Storage Account
  - Azure Key Vault
  - Azure Application Insights

- **Microsoft 365 Tenant** with:
  - Microsoft Teams
  - Admin permissions to register applications and approve API permissions
  - Teams Service Administrator role

- **Development Environment**:
  - Visual Studio 2022 or later
  - .NET 6.0 SDK or later
  - Bot Framework SDK v4.18 or later
  - Teams Toolkit extension for Visual Studio (recommended)
  - Azure CLI (optional, for scripted deployments)

- **Monitoring System Credentials** (if integrating with existing systems like Azure Monitor, Grafana, Prometheus, etc.)

## Azure Resources Setup

### 1. Resource Group Creation

Create a dedicated resource group for the IncidentStatusBot:

```powershell
# PowerShell Example
$resourceGroupName = "rg-incidentstatusbot-prod"
$location = "eastus"

New-AzResourceGroup -Name $resourceGroupName -Location $location
```

```bash
# Azure CLI Example
resourceGroupName="rg-incidentstatusbot-prod"
location="eastus"

az group create --name $resourceGroupName --location $location
```

### 2. Azure Storage Account

Deploy an Azure Storage Account for bot state management:

```powershell
# PowerShell Example
$storageAccountName = "stincidentbotprod"
$sku = "Standard_LRS"

New-AzStorageAccount -ResourceGroupName $resourceGroupName `
                     -Name $storageAccountName `
                     -Location $location `
                     -SkuName $sku `
                     -Kind StorageV2 `
                     -EnableHttpsTrafficOnly $true
```

```bash
# Azure CLI Example
storageAccountName="stincidentbotprod"
sku="Standard_LRS"

az storage account create --name $storageAccountName --resource-group $resourceGroupName --location $location --sku $sku --kind StorageV2 --https-only true
```

### 3. Azure Key Vault

Create a Key Vault to securely store the bot's secrets:

```powershell
# PowerShell Example
$keyVaultName = "kv-incidentbot-prod"

New-AzKeyVault -ResourceGroupName $resourceGroupName `
               -Name $keyVaultName `
               -Location $location `
               -EnabledForDeployment `
               -EnabledForTemplateDeployment `
               -EnabledForDiskEncryption `
               -EnableRbacAuthorization $true
```

```bash
# Azure CLI Example
keyVaultName="kv-incidentbot-prod"

az keyvault create --name $keyVaultName --resource-group $resourceGroupName --location $location --enabled-for-deployment true --enabled-for-template-deployment true --enabled-for-disk-encryption true --enable-rbac-authorization true
```

### 4. Application Insights

Deploy Application Insights for monitoring and telemetry:

```powershell
# PowerShell Example
$appInsightsName = "appi-incidentbot-prod"

New-AzApplicationInsights -ResourceGroupName $resourceGroupName `
                          -Name $appInsightsName `
                          -Location $location
```

```bash
# Azure CLI Example
appInsightsName="appi-incidentbot-prod"

az monitor app-insights component create --app $appInsightsName --location $location --resource-group $resourceGroupName --application-type web
```

### 5. App Service Plan

Create an App Service Plan to host the bot:

```powershell
# PowerShell Example
$appServicePlanName = "asp-incidentbot-prod"
$tier = "Standard"
$sku = "S1"

New-AzAppServicePlan -ResourceGroupName $resourceGroupName `
                     -Name $appServicePlanName `
                     -Location $location `
                     -Tier $tier `
                     -NumberofWorkers 2 `
                     -WorkerSize $sku
```

```bash
# Azure CLI Example
appServicePlanName="asp-incidentbot-prod"
tier="Standard"
sku="S1"

az appservice plan create --name $appServicePlanName --resource-group $resourceGroupName --location $location --sku $sku
```

### 6. Web App for Bot

Deploy the Web App that will host the bot service:

```powershell
# PowerShell Example
$webAppName = "app-incidentbot-prod"

New-AzWebApp -ResourceGroupName $resourceGroupName `
             -Name $webAppName `
             -Location $location `
             -AppServicePlan $appServicePlanName `
             -RuntimeStack "DOTNET|6.0"
```

```bash
# Azure CLI Example
webAppName="app-incidentbot-prod"

az webapp create --name $webAppName --resource-group $resourceGroupName --plan $appServicePlanName --runtime "DOTNET|6.0"
```

## Bot Registration

### 1. Create Azure Bot Service

Register a new bot in the Azure Bot Service:

```powershell
# PowerShell Example
$botName = "incidentstatusbot-prod"
$botDisplayName = "Incident Status Bot"
$microsoftAppId = (New-Guid).Guid

New-AzBotService -ResourceGroupName $resourceGroupName `
                 -Name $botName `
                 -Location $location `
                 -Sku S1 `
                 -Microsoft-App-Id $microsoftAppId `
                 -DisplayName $botDisplayName
```

```bash
# Azure CLI Example
botName="incidentstatusbot-prod"
botDisplayName="Incident Status Bot"
microsoftAppId=$(uuidgen)

az bot create --name $botName --resource-group $resourceGroupName --location $location --sku S1 --microsoft-app-id $microsoftAppId --display-name "$botDisplayName" --kind WebApp
```

### 2. Create Bot Registration in Microsoft App Registration Portal

1. Navigate to the [Azure Portal](https://portal.azure.com/)
2. Go to "Azure Active Directory" > "App Registrations" > "New Registration"
3. Provide the following details:
   - Name: "Incident Status Bot"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: Leave blank for now
4. Click "Register"
5. Note the Application (client) ID for future use
6. Navigate to "Certificates & secrets" and create a new client secret
   - Description: "Bot Authentication"
   - Expiry: 24 months (adjust based on your security requirements)
7. Note the generated secret value immediately (it will be displayed only once)

### 3. Store Bot Credentials in Key Vault

Store the bot credentials in the previously created Key Vault:

```powershell
# PowerShell Example
$appId = "your-app-id-from-step-2"
$appPassword = "your-app-secret-from-step-2"

$secretAppId = ConvertTo-SecureString -String $appId -AsPlainText -Force
$secretAppPassword = ConvertTo-SecureString -String $appPassword -AsPlainText -Force

Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "MicrosoftAppId" -SecretValue $secretAppId
Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "MicrosoftAppPassword" -SecretValue $secretAppPassword
```

```bash
# Azure CLI Example
appId="your-app-id-from-step-2"
appPassword="your-app-secret-from-step-2"

az keyvault secret set --vault-name $keyVaultName --name "MicrosoftAppId" --value "$appId"
az keyvault secret set --vault-name $keyVaultName --name "MicrosoftAppPassword" --value "$appPassword"
```

## Application Configuration

### 1. Configure Web App Settings

Configure application settings for the Web App, referencing the Key Vault secrets:

```powershell
# PowerShell Example
$keyVaultReference = "@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=MicrosoftAppId)"
$keyVaultPasswordReference = "@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=MicrosoftAppPassword)"

$appSettings = @{
    "MicrosoftAppType" = "MultiTenant"
    "MicrosoftAppId" = $keyVaultReference
    "MicrosoftAppPassword" = $keyVaultPasswordReference
    "MicrosoftAppTenantId" = "your-tenant-id"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = (Get-AzApplicationInsights -ResourceGroupName $resourceGroupName -Name $appInsightsName).InstrumentationKey
    "StorageConnectionString" = (Get-AzStorageAccount -ResourceGroupName $resourceGroupName -Name $storageAccountName).PrimaryEndpoints.Blob
    "AllowedTenants" = "your-tenant-id"
    "IncidentDataStorage" = "AzureTableStorage" # Options: AzureTableStorage, CosmosDB
    "ServiceHealthAggregationEndpoint" = "https://your-service-health-api.com"
    "ServiceHealthAggregationApiKey" = "@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=ServiceHealthApiKey)"
    "WEBSITE_RUN_FROM_PACKAGE" = "1"
}

Set-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName -AppSettings $appSettings
```

```bash
# Azure CLI Example
keyVaultReference="@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=MicrosoftAppId)"
keyVaultPasswordReference="@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=MicrosoftAppPassword)"
appInsightsKey=$(az monitor app-insights component show --app $appInsightsName --resource-group $resourceGroupName --query instrumentationKey --output tsv)
storageConnectionString=$(az storage account show-connection-string --name $storageAccountName --resource-group $resourceGroupName --query connectionString --output tsv)

az webapp config appsettings set --name $webAppName --resource-group $resourceGroupName --settings \
    MicrosoftAppType=MultiTenant \
    MicrosoftAppId=$keyVaultReference \
    MicrosoftAppPassword=$keyVaultPasswordReference \
    MicrosoftAppTenantId="your-tenant-id" \
    APPINSIGHTS_INSTRUMENTATIONKEY="$appInsightsKey" \
    StorageConnectionString="$storageConnectionString" \
    AllowedTenants="your-tenant-id" \
    IncidentDataStorage="AzureTableStorage" \
    ServiceHealthAggregationEndpoint="https://your-service-health-api.com" \
    ServiceHealthAggregationApiKey="@Microsoft.KeyVault(VaultName=$keyVaultName;SecretName=ServiceHealthApiKey)" \
    WEBSITE_RUN_FROM_PACKAGE="1"
```

### 2. Assign Managed Identity to Web App

Configure a system-assigned managed identity for the web app:

```powershell
# PowerShell Example
$webapp = Set-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName -AssignIdentity $true
$webapp.Identity.PrincipalId # Note this value for the next step
```

```bash
# Azure CLI Example
principalId=$(az webapp identity assign --name $webAppName --resource-group $resourceGroupName --query principalId --output tsv)
echo $principalId # Note this value for the next step
```

### 3. Grant Key Vault Access to the Managed Identity

Allow the web app's managed identity to access the Key Vault secrets:

```powershell
# PowerShell Example
$principalId = "managed-identity-principal-id-from-previous-step"
$keyVaultResource = Get-AzResource -ResourceGroupName $resourceGroupName -Name $keyVaultName

New-AzRoleAssignment -ObjectId $principalId `
                     -RoleDefinitionName "Key Vault Secrets User" `
                     -Scope $keyVaultResource.ResourceId
```

```bash
# Azure CLI Example
keyVaultResourceId=$(az keyvault show --name $keyVaultName --resource-group $resourceGroupName --query id --output tsv)

az role assignment create --assignee $principalId --role "Key Vault Secrets User" --scope $keyVaultResourceId
```

### 4. Deploy Application Code

Deploy the IncidentStatusBot code to the Web App:

```powershell
# PowerShell Example
# Assuming the compiled application is packaged as a ZIP file
$packagePath = "path\to\IncidentStatusBot.zip"
Publish-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName -ArchivePath $packagePath -Force
```

```bash
# Azure CLI Example
packagePath="path/to/IncidentStatusBot.zip"
az webapp deployment source config-zip --name $webAppName --resource-group $resourceGroupName --src $packagePath
```

## Teams Integration

### 1. Create Teams App Manifest

Create a Teams App Manifest file named `manifest.json` with the following content (customize as needed):

```json
{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
    "manifestVersion": "1.14",
    "version": "1.0.0",
    "id": "{{MicrosoftAppId}}",
    "packageName": "com.yourcompany.incidentstatusbot",
    "developer": {
        "name": "Your Company",
        "websiteUrl": "https://www.yourcompany.com",
        "privacyUrl": "https://www.yourcompany.com/privacy",
        "termsOfUseUrl": "https://www.yourcompany.com/terms"
    },
    "icons": {
        "color": "color.png",
        "outline": "outline.png"
    },
    "name": {
        "short": "Incident Status Bot",
        "full": "Incident Status Bot for IT Service Management"
    },
    "description": {
        "short": "Track IT incidents in real-time",
        "full": "Stay informed about IT service incidents in real-time. Get proactive alerts, view service health dashboards, and collaborate with your team to resolve issues faster."
    },
    "accentColor": "#FFFFFF",
    "bots": [
        {
            "botId": "{{MicrosoftAppId}}",
            "scopes": [
                "personal",
                "team",
                "groupchat"
            ],
            "supportsFiles": false,
            "isNotificationOnly": false,
            "commandLists": [
                {
                    "scopes": [
                        "personal",
                        "team",
                        "groupchat"
                    ],
                    "commands": [
                        {
                            "title": "help",
                            "description": "Shows help information"
                        },
                        {
                            "title": "status",
                            "description": "Shows current incident status"
                        },
                        {
                            "title": "subscribe",
                            "description": "Subscribe to incident updates"
                        },
                        {
                            "title": "incidents",
                            "description": "List active incidents"
                        }
                    ]
                }
            ]
        }
    ],
    "permissions": [
        "identity",
        "messageTeamMembers"
    ],
    "validDomains": [
        "token.botframework.com",
        "*.execute-api.us-east-1.amazonaws.com",
        "*.azurewebsites.net"
    ],
    "webApplicationInfo": {
        "id": "{{MicrosoftAppId}}",
        "resource": "https://api.botframework.com"
    }
}
```

### 2. Create App Package

1. Prepare necessary image files:
   - `color.png`: 192x192 pixel color icon
   - `outline.png`: 32x32 pixel transparent outline icon

2. Create a ZIP file containing:
   - `manifest.json` (with the Microsoft App ID properly filled in)
   - `color.png`
   - `outline.png`

3. Name the ZIP file `IncidentStatusBot.zip`

### 3. Upload the App to Teams

#### Option 1: For Individual Team (Testing)

1. Navigate to the target Teams team
2. Click on the "..." menu next to the team name
3. Select "Manage team"
4. Go to the "Apps" tab
5. Click "Upload a custom app" in the bottom-right corner
6. Select the `IncidentStatusBot.zip` file
7. Follow the prompts to complete the installation

#### Option 2: For Organization-wide Deployment

1. Go to the [Microsoft Teams Admin Center](https://admin.teams.microsoft.com/)
2. Navigate to "Teams apps" > "Manage apps"
3. Click "Upload" and select the `IncidentStatusBot.zip` file
4. Configure app permission policies to control which users can access the app
5. Optionally, set up app setup policies to pin the app for specific user groups

## Security Considerations

### 1. Bot Framework Channel Encryption

Ensure bot channel encryption is enabled:

```powershell
# PowerShell Example
Update-AzBotService -ResourceGroupName $resourceGroupName -Name $botName -EnableChannelEncryption
```

```bash
# Azure CLI Example
az bot update --name $botName --resource-group $resourceGroupName --enable-encryption true
```

### 2. Data Protection

Configure appropriate security measures for incident data:

1. Enable Azure Storage encryption for data at rest:

```powershell
# PowerShell Example
$storageAccount = Get-AzStorageAccount -ResourceGroupName $resourceGroupName -Name $storageAccountName
$storageAccount | Set-AzStorageAccount -EnableHttpsTrafficOnly $true -MinimumTlsVersion TLS1_2
```

```bash
# Azure CLI Example
az storage account update --name $storageAccountName --resource-group $resourceGroupName --https-only true --min-tls-version TLS1_2
```

2. Configure Private Endpoints (if required by your security policy):

```powershell
# PowerShell Example - High-security setup with Private Link
# This is an advanced configuration requiring VNet setup
# Consult Azure documentation for complete implementation
$vnetName = "vnet-incidentbot-prod"
$subnetName = "subnet-private-endpoints"

New-AzPrivateLinkServiceConnection -Name "pl-storage-connection" `
                                   -PrivateLinkServiceId (Get-AzStorageAccount -ResourceGroupName $resourceGroupName -Name $storageAccountName).Id `
                                   -GroupId "blob" `
                                   -RequestMessage "Connection for incident data storage"
```

### 3. Authentication and Authorization

Ensure proper authentication is configured:

1. Update bot authentication settings:

```powershell
# PowerShell Example
Update-AzBotService -ResourceGroupName $resourceGroupName -Name $botName -EnableMsiAuthentication
```

2. For additional securing service integrations, create and manage API keys in Key Vault:

```powershell
# PowerShell Example
$apiKey = [guid]::NewGuid().Guid
$secretApiKey = ConvertTo-SecureString -String $apiKey -AsPlainText -Force
Set-AzKeyVaultSecret -VaultName $keyVaultName -Name "ServiceHealthApiKey" -SecretValue $secretApiKey
```

## Monitoring and Logging

### 1. Configure Application Insights

Enable robust monitoring with Application Insights:

```powershell
# PowerShell Example
$webAppConfig = @{
    "ApplicationInsightsAgent_EXTENSION_VERSION" = "~3"
    "XDT_MicrosoftApplicationInsights_Mode" = "Recommended"
    "APPINSIGHTS_PROFILERFEATURE_VERSION" = "1.0.0"
    "APPINSIGHTS_SNAPSHOTFEATURE_VERSION" = "1.0.0"
    "DiagnosticServices_EXTENSION_VERSION" = "~3"
    "InstrumentationEngine_EXTENSION_VERSION" = "~1"
    "SnapshotDebugger_EXTENSION_VERSION" = "~1"
}

Set-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName -AppSettings $webAppConfig -ErrorAction SilentlyContinue
```

```bash
# Azure CLI Example
az webapp config appsettings set --name $webAppName --resource-group $resourceGroupName --settings \
    ApplicationInsightsAgent_EXTENSION_VERSION="~3" \
    XDT_MicrosoftApplicationInsights_Mode="Recommended" \
    APPINSIGHTS_PROFILERFEATURE_VERSION="1.0.0" \
    APPINSIGHTS_SNAPSHOTFEATURE_VERSION="1.0.0" \
    DiagnosticServices_EXTENSION_VERSION="~3" \
    InstrumentationEngine_EXTENSION_VERSION="~1" \
    SnapshotDebugger_EXTENSION_VERSION="~1"
```

### 2. Set Up Alert Rules

Create alert rules to monitor bot health:

```powershell
# PowerShell Example
$actionGroupName = "ag-incidentbot-alerts"
$actionGroupShortName = "IncidentBot"
$emailRecipient = "it-alerts@yourcompany.com"

# Create Action Group
New-AzActionGroup -ResourceGroupName $resourceGroupName `
                 -Name $actionGroupName `
                 -ShortName $actionGroupShortName `
                 -Receiver @(
                     @{
                         "Name" = "EmailNotification"
                         "EmailReceiver" = @{
                             "EmailAddress" = $emailRecipient
                         }
                     }
                 )

# Create Alert Rule for Request Failures
New-AzMetricAlertRule -ResourceGroupName $resourceGroupName `
                      -Name "IncidentBot-RequestFailures" `
                      -Location "global" `
                      -TargetResourceId (Get-AzWebApp -ResourceGroupName $resourceGroupName -Name $webAppName).Id `
                      -MetricName "Http5xx" `
                      -Operator GreaterThan `
                      -Threshold 5 `
                      -WindowSize (New-TimeSpan -Minutes 5) `
                      -TimeAggregationOperator Total `
                      -ActionGroupId (Get-AzActionGroup -ResourceGroupName $resourceGroupName -Name $actionGroupName).Id
```

## Scaling Considerations

### 1. App Service Scaling

Configure autoscaling to handle variable loads:

```powershell
# PowerShell Example
$autoscaleSettingName = "as-incidentbot-prod"

Add-AzAutoscaleSetting -ResourceGroupName $resourceGroupName `
                       -Name $autoscaleSettingName `
                       -Location $location `
                       -TargetResourceId (Get-AzAppServicePlan -ResourceGroupName $resourceGroupName -Name $appServicePlanName).Id `
                       -AutoscaleProfile @(
                           @{
                               "Name" = "DefaultProfile"
                               "Capacity" = @{
                                   "Minimum" = 2
                                   "Maximum" = 10
                                   "Default" = 2
                               }
                               "Rules" = @(
                                   @{
                                       "MetricTrigger" = @{
                                           "MetricName" = "CpuPercentage"
                                           "MetricResourceId" = (Get-AzAppServicePlan -ResourceGroupName $resourceGroupName -Name $appServicePlanName).Id
                                           "TimeGrain" = (New-TimeSpan -Minutes 1)
                                           "Statistic" = "Average"
                                           "TimeWindow" = (New-TimeSpan -Minutes 10)
                                           "TimeAggregation" = "Average"
                                           "Operator" = "GreaterThan"
                                           "Threshold" = 70
                                       }
                                       "ScaleAction" = @{
                                           "Direction" = "Increase"
                                           "Type" = "ChangeCount"
                                           "Value" = 1
                                           "Cooldown" = (New-TimeSpan -Minutes 10)
                                       }
                                   },
                                   @{
                                       "MetricTrigger" = @{
                                           "MetricName" = "CpuPercentage"
                                           "MetricResourceId" = (Get-AzAppServicePlan -ResourceGroupName $resourceGroupName -Name $appServicePlanName).Id
                                           "TimeGrain" = (New-TimeSpan -Minutes 1)
                                           "Statistic" = "Average"
                                           "TimeWindow" = (New-TimeSpan -Minutes 10)
                                           "TimeAggregation" = "Average"
                                           "Operator" = "LessThan"
                                           "Threshold" = 30
                                       }
                                       "ScaleAction" = @{
                                           "Direction" = "Decrease"
                                           "Type" = "ChangeCount"
                                           "Value" = 1
                                           "Cooldown" = (New-TimeSpan -Minutes 10)
                                       }
                                   }
                               )
                           }
                       )
```

```bash
# Azure CLI Example
appServicePlanId=$(az appservice plan show --name $appServicePlanName --resource-group $resourceGroupName --query id --output tsv)

az monitor autoscale create --name "as-incidentbot-prod" \
                           --resource-group $resourceGroupName \
                           --resource $appServicePlanId \
                           --min-count 2 \
                           --max-count 10 \
                           --count 2

# Add scale out rule
az monitor autoscale rule create --autoscale-name "as-incidentbot-prod" \
                                --resource-group $resourceGroupName \
                                --condition "Percentage CPU > 70 avg 10m" \
                                --scale out 1

# Add scale in rule
az monitor autoscale rule create --autoscale-name "as-incidentbot-prod" \
                                --resource-group $resourceGroupName \
                                --condition "Percentage CPU < 30 avg 10m" \
                                --scale in 1
```

### 2. Bot Framework Capacity Planning

For high-volume scenarios, consider the following guidelines:

- Standard tier Bot Service can handle up to 300 messages per second
- For higher volumes, implement message queuing with Azure Service Bus or Azure Queue Storage
- Implement rate limiting for channel-specific interactions
- Configure proper storage scaling for incident data persistence

## Troubleshooting

For common deployment issues, refer to the following troubleshooting steps:

### 1. Bot Registration Issues

If the bot does not appear in Teams:

1. Verify the App ID in the manifest.json matches the Microsoft App ID from the Azure Bot Service
2. Check that the bot endpoint is accessible and responding with a 200 OK status
3. Inspect bot registration in the Azure Bot Service to ensure all channels are properly configured
4. Verify the Teams channel is enabled in the Azure Bot Service

### 2. Authentication Problems

If the bot fails to authenticate:

1. Confirm the MicrosoftAppId and MicrosoftAppPassword are correctly set in the application settings
2. Verify the Azure Key Vault secrets are accessible to the web app's managed identity
3. Check the bot framework authorization configuration
4. Review Application Insights logs for specific authentication errors

### 3. Storage Connectivity Issues

If the bot cannot access storage:

1. Verify the storage connection string is correctly set in the application settings
2. Check network security group settings if using VNet integration
3. Ensure the bot service has the necessary permissions to access the storage account
4. Test the storage connection from the Azure Cloud Shell or a development environment

## Additional Resources

- [Microsoft Teams Bot Framework Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Azure Bot Service Documentation](https://learn.microsoft.com/en-us/azure/bot-service/?view=azure-bot-service-4.0)
- [Key Vault Managed Identity Integration](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)
- [App Service Deployment Best Practices](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices)
- [Teams App Manifest Schema Reference](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Bot Framework SDK GitHub Repository](https://github.com/microsoft/botbuilder-dotnet)
- [Application Insights for .NET Core Applications](https://learn.microsoft.com/en-us/azure/azure-monitor/app/asp-net-core)
