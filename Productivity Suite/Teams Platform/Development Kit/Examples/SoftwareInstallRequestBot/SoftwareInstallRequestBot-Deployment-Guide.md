# Software Install Request Bot - Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Deployment Steps](#deployment-steps)
  - [Step 1: Azure Resources Provisioning](#step-1-azure-resources-provisioning)
  - [Step 2: Bot Registration](#step-2-bot-registration)
  - [Step 3: Teams App Configuration](#step-3-teams-app-configuration)
  - [Step 4: Intune and Chocolatey Integration](#step-4-intune-and-chocolatey-integration)
  - [Step 5: Security Configuration](#step-5-security-configuration)
  - [Step 6: Testing](#step-6-testing)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Monitoring](#monitoring)
- [Scaling Considerations](#scaling-considerations)
- [Backup and Disaster Recovery](#backup-and-disaster-recovery)
- [Troubleshooting](#troubleshooting)
- [References](#references)

## Overview

The Software Install Request Bot is an automated solution that streamlines the software request and approval process in enterprise environments. This deployment guide provides step-by-step instructions for setting up and configuring the bot within Microsoft Teams, integrating with Azure services, Microsoft Intune, and Chocolatey for software deployment.

The bot enables users to:
- Submit software installation requests via an adaptive card form
- Route requests through a multi-step approval workflow
- Automatically deploy approved software via Intune and Chocolatey
- Track request status throughout the lifecycle

## Prerequisites

Before beginning deployment, ensure you have the following:

- **Administrative Access**:
  - Microsoft 365 Admin privileges
  - Azure Subscription with Owner/Contributor role
  - Intune Administrator role
  - Teams Service Administrator role

- **Azure Resources**:
  - Azure subscription with available quota for required services
  - Ability to create resource groups and assign permissions

- **Microsoft Teams**:
  - Teams Developer account with app publishing rights
  - Teams app development environment configured

- **Infrastructure**:
  - Intune environment configured for device management
  - Devices enrolled in Intune for software deployment
  - Network connectivity between Azure and on-premises resources (if applicable)

- **Software**:
  - Visual Studio 2022 or later (for any customization)
  - Azure CLI (latest version)
  - Microsoft Teams Toolkit extension for Visual Studio
  - Git client

- **Knowledge Requirements**:
  - Basic understanding of Azure services
  - Familiarity with Teams app development
  - Knowledge of Intune configuration principles
  - Understanding of OAuth 2.0 and OpenID Connect

## Architecture

The Software Install Request Bot employs a serverless architecture with the following components:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│  Microsoft Teams │────▶│  Azure Bot       │────▶│  Azure Functions │
│                  │     │  Framework       │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                                                  │
         │                                                  ▼
┌──────────────────┐                           ┌──────────────────┐
│                  │                           │                  │
│  Adaptive Cards  │                           │  Azure Logic Apps│
│                  │                           │                  │
└──────────────────┘                           └──────────────────┘
         ▲                                                  │
         │                                                  ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│  Azure SQL       │◀───▶│  Approvals API   │◀───▶│  Microsoft Intune│
│  Database        │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
                                               ┌──────────────────┐
                                               │                  │
                                               │  Chocolatey      │
                                               │                  │
                                               └──────────────────┘
```

Key components include:
- **Teams Interface**: User-facing component for submitting and managing requests
- **Azure Bot Framework**: Handles conversation flow and message processing
- **Azure Functions**: Processes business logic and API interactions
- **Azure Logic Apps**: Orchestrates the approval workflow
- **Azure SQL Database**: Stores request data and status information
- **Approvals API**: Manages the approval process lifecycle
- **Intune & Chocolatey**: Handles software package deployment to end-user devices

## Deployment Steps

### Step 1: Azure Resources Provisioning

1. **Create Resource Group**:
   ```bash
   az group create --name SoftwareRequestBot-RG --location eastus2
   ```

2. **Deploy Azure Bot Service**:
   ```bash
   az deployment group create \
     --resource-group SoftwareRequestBot-RG \
     --template-file ./templates/bot-service-template.json \
     --parameters botName=SoftwareRequestBot location=eastus2
   ```

3. **Deploy Azure Function App**:
   ```bash
   az functionapp create \
     --resource-group SoftwareRequestBot-RG \
     --consumption-plan-location eastus2 \
     --runtime dotnet \
     --functions-version 4 \
     --name SoftwareRequestBotFunc \
     --storage-account softwarereqbotstorage
   ```

4. **Deploy Azure SQL Database**:
   ```bash
   az sql server create \
     --name software-req-bot-sql \
     --resource-group SoftwareRequestBot-RG \
     --location eastus2 \
     --admin-user sqladmin \
     --admin-password "ComplexPassword123!"

   az sql db create \
     --resource-group SoftwareRequestBot-RG \
     --server software-req-bot-sql \
     --name SoftwareRequestDB \
     --service-objective S0
   ```

5. **Deploy Azure Logic App**:
   ```bash
   az logic-app create \
     --resource-group SoftwareRequestBot-RG \
     --name SoftwareRequestApprovalWorkflow \
     --location eastus2
   ```

6. **Set up Azure Storage Account**:
   ```bash
   az storage account create \
     --name softwarereqbotstorage \
     --resource-group SoftwareRequestBot-RG \
     --location eastus2 \
     --sku Standard_LRS
   ```

7. **Configure Application Insights**:
   ```bash
   az monitor app-insights component create \
     --app SoftwareRequestBotInsights \
     --resource-group SoftwareRequestBot-RG \
     --location eastus2
   ```

### Step 2: Bot Registration

1. **Register Bot in Azure**:
   - Navigate to the Azure Portal
   - Search for "Bot Services" and select "Create"
   - Choose "Azure Bot" and click "Create"
   - Fill in the following details:
     - Bot handle: SoftwareRequestBot
     - Subscription: Your subscription
     - Resource group: SoftwareRequestBot-RG
     - Location: East US 2
     - Pricing tier: Standard
     - Microsoft App ID: Create new
   - Click "Review + create" and then "Create"

2. **Configure Bot Settings**:
   - Once created, navigate to the Bot resource
   - Under "Settings", select "Configuration"
   - Set the Messaging endpoint to your Function App URL:
     ```
     https://softwarerequestbotfunc.azurewebsites.net/api/messages
     ```
   - Under "Channels", add the Microsoft Teams channel
   - Enable the following features:
     - File upload/download
     - User and conversation data storage
     - Proactive messaging

3. **Configure Authentication**:
   - Navigate to "Settings" > "Authentication"
   - Add the following OAuth connection:
     - Name: TeamsAuth
     - Service Provider: Azure Active Directory v2
     - Client ID: [Your AAD App ID]
     - Client Secret: [Your AAD App Secret]
     - Tenant ID: [Your AAD Tenant ID]
     - Scopes: User.Read, User.ReadBasic.All, offline_access

### Step 3: Teams App Configuration

1. **Create Teams App Manifest**:
   Create a manifest.json file with the following content:
   ```json
   {
     "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
     "manifestVersion": "1.11",
     "version": "1.0.0",
     "id": "[Bot Framework ID]",
     "packageName": "com.contoso.softwarerequest",
     "developer": {
       "name": "Contoso IT",
       "websiteUrl": "https://contoso.com",
       "privacyUrl": "https://contoso.com/privacy",
       "termsOfUseUrl": "https://contoso.com/terms"
     },
     "name": {
       "short": "Software Request",
       "full": "Software Installation Request Bot"
     },
     "description": {
       "short": "Request software installations",
       "full": "Submit and track software installation requests for approval and automated deployment"
     },
     "icons": {
       "outline": "outline.png",
       "color": "color.png"
     },
     "accentColor": "#FFFFFF",
     "bots": [
       {
         "botId": "[Microsoft App ID]",
         "scopes": ["personal", "team"],
         "supportsFiles": false,
         "isNotificationOnly": false
       }
     ],
     "permissions": [
       "identity",
       "messageTeamMembers"
     ],
     "validDomains": [
       "*.azurewebsites.net",
       "*.botframework.com"
     ]
   }
   ```

2. **Package Teams App**:
   - Create a ZIP file containing:
     - manifest.json
     - outline.png (20x20)
     - color.png (96x96)

3. **Upload to Teams App Catalog**:
   - Navigate to Teams Admin Center
   - Go to "Teams apps" > "Manage apps"
   - Click "Upload" and select your ZIP package
   - Approve the app for organization-wide use

### Step 4: Intune and Chocolatey Integration

1. **Set up Chocolatey Repository**:
   - Configure Chocolatey as a package source in Intune
   - Create a PowerShell script to install Chocolatey:
     ```powershell
     Set-ExecutionPolicy Bypass -Scope Process -Force
     [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
     iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
     ```

2. **Create Intune Script Deployment Package**:
   - In Microsoft Endpoint Manager Admin Center, navigate to "Devices" > "PowerShell scripts"
   - Add a new script named "ChocolateyInstall" with the above content
   - Assign to a test group of devices
   - Configure to run in system context with admin privileges

3. **Create Software Deployment Template**:
   - Create a PowerShell template that will be used by the bot:
     ```powershell
     choco install [PackageName] -y --no-progress
     ```

4. **Configure Intune-Logic App Integration**:
   - Create a service principal for Intune Graph API access
   - Grant the necessary permissions:
     - DeviceManagementConfiguration.ReadWrite.All
     - DeviceManagementApps.ReadWrite.All
   - Configure Logic App connection to Microsoft Graph API

### Step 5: Security Configuration

1. **Configure Role-Based Access Control**:
   - Create custom RBAC roles in Azure:
     ```bash
     az role definition create --role-definition ./templates/software-requester-role.json
     az role definition create --role-definition ./templates/software-approver-role.json
     ```

2. **Secure Database Access**:
   - Configure firewall rules:
     ```bash
     az sql server firewall-rule create \
       --resource-group SoftwareRequestBot-RG \
       --server software-req-bot-sql \
       --name AllowAzureServices \
       --start-ip-address 0.0.0.0 \
       --end-ip-address 0.0.0.0
     ```
   
   - Enable Advanced Data Security:
     ```bash
     az sql db security-policy update \
       --resource-group SoftwareRequestBot-RG \
       --server software-req-bot-sql \
       --database SoftwareRequestDB \
       --state Enabled
     ```

3. **Configure Bot Secret Management**:
   - Create a Key Vault for storing secrets:
     ```bash
     az keyvault create \
       --name SoftwareRequestBotVault \
       --resource-group SoftwareRequestBot-RG \
       --location eastus2
     ```

   - Add secrets to Key Vault:
     ```bash
     az keyvault secret set \
       --vault-name SoftwareRequestBotVault \
       --name "SqlConnectionString" \
       --value "Server=tcp:software-req-bot-sql.database.windows.net,1433;Database=SoftwareRequestDB;User ID=sqladmin;Password=ComplexPassword123!;Encrypt=true;Connection Timeout=30;"
     
     az keyvault secret set \
       --vault-name SoftwareRequestBotVault \
       --name "BotFrameworkKey" \
       --value "[Bot Framework Secret]"
     ```

   - Grant Function App access to Key Vault:
     ```bash
     az keyvault set-policy \
       --name SoftwareRequestBotVault \
       --object-id [Function App Managed Identity Object ID] \
       --secret-permissions get list
     ```

### Step 6: Testing

1. **Deploy Test Environment**:
   - Create a separate test resource group:
     ```bash
     az group create --name SoftwareRequestBot-Test-RG --location eastus2
     ```
   
   - Deploy test resources using ARM template:
     ```bash
     az deployment group create \
       --resource-group SoftwareRequestBot-Test-RG \
       --template-file ./templates/test-environment-template.json
     ```

2. **Test Bot Functionality**:
   - Install the Teams app in your test environment
   - Submit a test software request
   - Verify the approval workflow functions correctly
   - Confirm that approved software is deployed successfully

3. **Run Integration Tests**:
   ```bash
   cd ./tests
   dotnet test SoftwareRequestBot.Tests.csproj
   ```

## Post-Deployment Configuration

### Application Settings

Configure the following Function App settings:

| Setting Name | Value | Description |
|--------------|-------|-------------|
| WEBSITE_NODE_DEFAULT_VERSION | ~16 | Node.js version |
| FUNCTIONS_EXTENSION_VERSION | ~4 | Azure Functions runtime version |
| BOT_ID | [Microsoft App ID] | Bot Framework ID |
| SQL_CONNECTION_STRING | @Microsoft.KeyVault(SecretUri=[Key Vault Secret URI]) | Database connection string |
| APPINSIGHTS_INSTRUMENTATIONKEY | [App Insights Key] | Application Insights key |
| APPROVAL_WORKFLOW_URL | [Logic App Trigger URL] | Logic App endpoint |
| INTUNE_CLIENT_ID | [Intune App Registration ID] | Intune integration client ID |
| INTUNE_TENANT_ID | [Azure AD Tenant ID] | Azure AD tenant ID |

### Configure Approval Groups

1. Create security groups in Azure AD:
   - SoftwareRequest-L1-Approvers
   - SoftwareRequest-L2-Approvers
   - SoftwareRequest-Administrators

2. Update the configuration in the Logic App workflow to use these groups.

## Monitoring

### Set up Alerts

1. **CPU Usage Alert**:
   ```bash
   az monitor metrics alert create \
     --name "High CPU Alert" \
     --resource-group SoftwareRequestBot-RG \
     --scopes "/subscriptions/[Subscription ID]/resourceGroups/SoftwareRequestBot-RG/providers/Microsoft.Web/sites/SoftwareRequestBotFunc" \
     --condition "max percentage CPU > 80" \
     --window-size 5m \
     --evaluation-frequency 1m \
     --action "/subscriptions/[Subscription ID]/resourceGroups/SoftwareRequestBot-RG/providers/Microsoft.Insights/actionGroups/SoftwareRequestBotAdmins"
   ```

2. **Failed Requests Alert**:
   ```bash
   az monitor metrics alert create \
     --name "Failed Requests Alert" \
     --resource-group SoftwareRequestBot-RG \
     --scopes "/subscriptions/[Subscription ID]/resourceGroups/SoftwareRequestBot-RG/providers/Microsoft.Web/sites/SoftwareRequestBotFunc" \
     --condition "count Http5xx > 10" \
     --window-size 5m \
     --evaluation-frequency 1m \
     --action "/subscriptions/[Subscription ID]/resourceGroups/SoftwareRequestBot-RG/providers/Microsoft.Insights/actionGroups/SoftwareRequestBotAdmins"
   ```

### Application Insights Dashboards

1. **Create Custom Dashboard**:
   - Navigate to Azure Portal > Application Insights
   - Click "New Dashboard"
   - Add the following tiles:
     - Failed requests
     - Server response time
     - Server requests
     - Exceptions
     - Custom events (for approval workflow)

2. **Configure Log Analytics**:
   - Create custom queries for tracking approval metrics:
     ```kusto
     customEvents
     | where name == "SoftwareRequestApproved" or name == "SoftwareRequestRejected"
     | summarize count() by name, bin(timestamp, 1d)
     | render timechart
     ```

## Scaling Considerations

### Vertical Scaling

To increase the performance of individual components:

- **Function App**:
  ```bash
  az functionapp update \
    --name SoftwareRequestBotFunc \
    --resource-group SoftwareRequestBot-RG \
    --plan-name PremiumPlan \
    --sku P1V2
  ```

- **SQL Database**:
  ```bash
  az sql db update \
    --resource-group SoftwareRequestBot-RG \
    --server software-req-bot-sql \
    --name SoftwareRequestDB \
    --service-objective P2
  ```

### Horizontal Scaling

For handling increased load:

- **Function App Scale Out**:
  ```bash
  az functionapp plan update \
    --name PremiumPlan \
    --resource-group SoftwareRequestBot-RG \
    --max-burst 10 \
    --min-instances 2 \
    --max-instances 20
  ```

- **Geographic Distribution**:
  - Deploy resources to multiple regions
  - Use Traffic Manager for routing:
    ```bash
    az network traffic-manager profile create \
      --name SoftwareRequestBotTM \
      --resource-group SoftwareRequestBot-RG \
      --routing-method Performance \
      --unique-dns-name softwarerequestbot
    ```

## Backup and Disaster Recovery

### Database Backup

1. **Configure Automated Backups**:
   ```bash
   az sql db update \
     --resource-group SoftwareRequestBot-RG \
     --server software-req-bot-sql \
     --name SoftwareRequestDB \
     --backup-storage-redundancy Geo
   ```

2. **Long-term Retention**:
   ```bash
   az sql db ltr-policy set \
     --resource-group SoftwareRequestBot-RG \
     --server software-req-bot-sql \
     --database SoftwareRequestDB \
     --weekly-retention P4W \
     --monthly-retention P12M \
     --yearly-retention P5Y \
     --week-of-year 1
   ```

### Disaster Recovery Plan

1. **Create Geo-Replicated Database**:
   ```bash
   az sql db replica create \
     --resource-group SoftwareRequestBot-RG \
     --server software-req-bot-sql \
     --name SoftwareRequestDB \
     --partner-server software-req-bot-sql-dr \
     --partner-resource-group SoftwareRequestBot-DR-RG \
     --secondary-type Geo
   ```

2. **Configure Failover Group**:
   ```bash
   az sql failover-group create \
     --name software-req-bot-fg \
     --partner-server software-req-bot-sql-dr \
     --resource-group SoftwareRequestBot-RG \
     --server software-req-bot-sql \
     --databases SoftwareRequestDB \
     --failover-policy Automatic \
     --grace-period 1
   ```

## Troubleshooting

### Common Issues and Resolutions

1. **Bot Not Responding in Teams**:
   - Verify the Bot Framework endpoint is correctly configured
   - Check if the Bot Service is running
   - Review Application Insights logs for errors
   - Ensure the bot is correctly registered in Teams App manifest

2. **Approval Workflow Not Processing**:
   - Check Logic App run history for failures
   - Verify service connections are authenticated
   - Ensure approver groups are correctly configured
   - Check email notification settings

3. **Software Deployment Failures**:
   - Verify Intune connectivity
   - Check device compliance status
   - Review Chocolatey package availability
   - Ensure script execution policy is correctly set

4. **Database Connection Issues**:
   - Verify firewall rules allow Azure services
   - Check connection string in Key Vault
   - Ensure SQL Server is running
   - Review database locks and running queries

### Diagnostic Commands

Run these commands to collect diagnostic information:

```bash
# Check Function App health
az functionapp show \
  --name SoftwareRequestBotFunc \
  --resource-group SoftwareRequestBot-RG

# View recent Function App logs
az functionapp log tail \
  --name SoftwareRequestBotFunc \
  --resource-group SoftwareRequestBot-RG

# Check Logic App runs
az logic-app run list \
  --name SoftwareRequestApprovalWorkflow \
  --resource-group SoftwareRequestBot-RG \
  --query "[].{Status:status, StartTime:startTime, EndTime:endTime}" \
  --output table

# Test database connectivity
az sql db show-connection-string \
  --client sqlcmd \
  --name SoftwareRequestDB \
  --server software-req-bot-sql
```

## References

- [Microsoft Teams Bot Framework Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Microsoft Intune Documentation](https://docs.microsoft.com/en-us/mem/intune/)
- [Chocolatey Documentation](https://docs.chocolatey.org/)
- [Azure Logic Apps Documentation](https://docs.microsoft.com/en-us/azure/logic-apps/)
- [Azure Bot Service Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [Teams App Manifest Schema](https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Azure SQL Database Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)