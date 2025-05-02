# ComplianceTrainingReminderBot Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Deployment Steps](#deployment-steps)
  - [Step 1: Azure Resource Provisioning](#step-1-azure-resource-provisioning)
  - [Step 2: Bot Registration](#step-2-bot-registration)
  - [Step 3: Teams App Configuration](#step-3-teams-app-configuration)
  - [Step 4: Authentication Setup](#step-4-authentication-setup)
  - [Step 5: Database Configuration](#step-5-database-configuration)
  - [Step 6: Scheduled Jobs Setup](#step-6-scheduled-jobs-setup)
- [Environment Configuration](#environment-configuration)
- [Deployment Verification](#deployment-verification)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Scaling Considerations](#scaling-considerations)

## Overview

The ComplianceTrainingReminderBot is a Microsoft Teams bot designed to help organizations improve compliance training completion rates by automatically sending scheduled reminders to employees who have pending training requirements. This deployment guide provides detailed instructions for setting up the bot in your Azure and Microsoft Teams environment.

## Prerequisites

Before deploying the ComplianceTrainingReminderBot, ensure you have the following:

- **Azure Subscription** with permissions to create resources
- **Microsoft 365 Developer account** with admin access to Microsoft Teams
- **Azure CLI** (version 2.40.0 or later)
- **Bot Framework SDK** (version 4.18.0 or later)
- **Microsoft Teams Developer Portal** access
- **Required permissions**:
  - Application Developer role in Azure AD
  - Global Administrator or Teams Service Administrator role in Microsoft 365
  - Contributor access to target Azure subscription
- **Compliance Training System API** endpoints available (for integration with existing training systems)

## Architecture

The ComplianceTrainingReminderBot is built using the following Azure components:

- **Azure Bot Service**: Manages the bot registration and connection to Teams
- **Azure App Service**: Hosts the bot's core functionality
- **Azure Functions**: Handles scheduled reminders and background processing
- **Azure Key Vault**: Securely stores connection strings and API keys
- **Azure SQL Database**: Stores user training status and tracking information
- **Azure Storage Account**: Stores bot state and conversation history
- **Azure Application Insights**: Provides monitoring and logging
- **Microsoft Graph API**: Accesses user information and Teams integration

![Architecture Diagram](https://example.com/architecture-diagram.png)

## Deployment Steps

### Step 1: Azure Resource Provisioning

1. **Create Resource Group**

   ```bash
   az group create --name rg-compliance-bot-prod --location eastus
   ```

2. **Deploy Azure Resources using ARM Template**

   ```bash
   az deployment group create \
     --resource-group rg-compliance-bot-prod \
     --template-file deploy/azuredeploy.json \
     --parameters @deploy/parameters.json
   ```

3. **Verify Resource Deployment**

   ```bash
   az resource list --resource-group rg-compliance-bot-prod --output table
   ```

### Step 2: Bot Registration

1. **Register Bot in Azure Bot Service**

   Navigate to the [Azure Portal](https://portal.azure.com):
   - Go to "Azure Bot Service"
   - Click "Create"
   - Fill required details:
     - Bot handle: `ComplianceTrainingReminderBot`
     - Subscription: [Your subscription]
     - Resource group: `rg-compliance-bot-prod`
     - Location: Same as resource group
     - Pricing tier: Standard S1
   - Click "Review + create" and then "Create"

2. **Configure Bot Settings**

   - Go to the newly created bot resource
   - Under "Settings", configure:
     - Messaging endpoint: `https://[your-app-service-name].azurewebsites.net/api/messages`
     - Microsoft App ID: [Auto-populated]
     - App insights key: Select from dropdown
   - Click "Apply"

3. **Create Bot Channels Registration**

   - Under "Channels", click "Add a featured channel"
   - Select "Microsoft Teams"
   - Accept terms and click "Agree"
   - Click "Save"

### Step 3: Teams App Configuration

1. **Create Teams App Manifest**

   Create a `manifest.json` file with the following structure:

   ```json
   {
     "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.13/MicrosoftTeams.schema.json",
     "manifestVersion": "1.13",
     "version": "1.0.0",
     "id": "{{BOT_ID}}",
     "packageName": "com.microsoft.teams.compliancebot",
     "developer": {
       "name": "Your Company Name",
       "websiteUrl": "https://example.com",
       "privacyUrl": "https://example.com/privacy",
       "termsOfUseUrl": "https://example.com/terms"
     },
     "icons": {
       "color": "color.png",
       "outline": "outline.png"
     },
     "name": {
       "short": "Compliance Reminder",
       "full": "Compliance Training Reminder Bot"
     },
     "description": {
       "short": "Reminds users of pending compliance training",
       "full": "A bot that helps track and remind users about pending compliance training requirements"
     },
     "accentColor": "#FFFFFF",
     "bots": [
       {
         "botId": "{{BOT_ID}}",
         "scopes": [
           "personal",
           "team"
         ],
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
       "*.token.botframework.com"
     ]
   }
   ```

2. **Package the Teams App**

   - Create a `color.png` (192x192) and `outline.png` (32x32) icons
   - Create a ZIP file containing:
     - manifest.json (with BOT_ID replaced)
     - color.png
     - outline.png

3. **Upload to Teams Admin Center**

   - Go to [Teams Admin Center](https://admin.teams.microsoft.com)
   - Navigate to "Teams apps" > "Manage apps"
   - Click "Upload" and select your ZIP package
   - Follow prompts to complete the app upload

4. **Configure App Policies**

   - In Teams Admin Center, go to "Setup policies"
   - Edit the global policy or create a new one
   - Add the Compliance Training Reminder Bot to the list of pinned apps
   - Click "Save"

### Step 4: Authentication Setup

1. **Configure Authentication in Azure AD**

   - Go to [Azure Portal](https://portal.azure.com) > "Azure Active Directory"
   - Navigate to "App registrations" and select your bot
   - Under "Authentication":
     - Add redirect URIs: `https://[your-app-service-name].azurewebsites.net/auth-end`
     - Enable implicit grant for Access tokens and ID tokens
   - Click "Save"

2. **Add API Permissions**

   - Under "API permissions", click "Add a permission"
   - Select "Microsoft Graph" > "Delegated permissions"
   - Add the following permissions:
     - User.Read
     - User.ReadBasic.All
     - Team.ReadBasic.All
     - ChannelMessage.Send
     - Chat.ReadWrite
   - Click "Add permissions"
   - Click "Grant admin consent for [your organization]"

### Step 5: Database Configuration

1. **Create Schema in Azure SQL**

   Use the following SQL script to create required tables:

   ```sql
   CREATE TABLE TrainingStatus (
       UserId NVARCHAR(100) PRIMARY KEY,
       UserEmail NVARCHAR(255) NOT NULL,
       UserName NVARCHAR(255) NOT NULL,
       TrainingId NVARCHAR(100) NOT NULL,
       TrainingName NVARCHAR(255) NOT NULL,
       DueDate DATETIME NOT NULL,
       CompletionDate DATETIME NULL,
       ReminderCount INT DEFAULT 0,
       LastReminderDate DATETIME NULL,
       Status NVARCHAR(50) NOT NULL -- Pending, Completed, Overdue
   );

   CREATE TABLE AcknowledgementTracking (
       Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
       UserId NVARCHAR(100) NOT NULL,
       TrainingId NVARCHAR(100) NOT NULL,
       AcknowledgementDate DATETIME NOT NULL,
       ResponseText NVARCHAR(MAX) NULL,
       CONSTRAINT FK_AcknowledgementTracking_TrainingStatus FOREIGN KEY (UserId, TrainingId) 
       REFERENCES TrainingStatus(UserId, TrainingId)
   );

   CREATE TABLE ComplianceConfig (
       ConfigId INT PRIMARY KEY,
       ReminderFrequencyDays INT NOT NULL,
       EscalationDays INT NOT NULL,
       MaxReminders INT NOT NULL,
       NotificationTemplate NVARCHAR(MAX) NOT NULL
   );
   ```

2. **Configure Connection String**

   - Go to your App Service in Azure Portal
   - Navigate to "Configuration" > "Connection strings"
   - Add a new connection string:
     - Name: `ComplianceDB`
     - Value: `Server=tcp:[your-sql-server].database.windows.net,1433;Database=ComplianceDB;User ID=[username];Password=[password];Encrypt=true;Connection Timeout=30;`
     - Type: `SQLAzure`
   - Click "Save"

3. **Secure Connection String in Key Vault**

   ```bash
   # Store the connection string in Key Vault
   az keyvault secret set --vault-name kv-compliance-bot-prod \
     --name "SqlConnectionString" \
     --value "Server=tcp:[your-sql-server].database.windows.net,1433;Database=ComplianceDB;..."

   # Grant access to the App Service managed identity
   az keyvault set-policy --vault-name kv-compliance-bot-prod \
     --object-id $(az webapp identity show --name app-compliance-bot-prod --resource-group rg-compliance-bot-prod --query principalId -o tsv) \
     --secret-permissions get list
   ```

### Step 6: Scheduled Jobs Setup

1. **Create Azure Function for Scheduled Reminders**

   ```bash
   # Deploy Azure Function
   az functionapp deployment source config-zip \
     --resource-group rg-compliance-bot-prod \
     --name func-compliance-reminder-prod \
     --src ./deploy/function-deploy.zip
   ```

2. **Configure the Function Timer**

   - In Azure Portal, go to your Function App
   - Select the "ReminderProcessor" function
   - Under "Integration", edit the timer trigger:
     - Schedule: `0 0 8 * * 1-5` (8:00 AM on weekdays)
   - Click "Save"

3. **Link Function to Bot Service**

   - Under Function App configuration, add these settings:
     - BotId: [Your Bot's Microsoft App ID]
     - BotPassword: [Your Bot's Microsoft App Password]
     - ServiceEndpoint: `https://[your-app-service-name].azurewebsites.net/api/messages`

## Environment Configuration

Configure the following environment variables in your App Service:

| Name | Value | Description |
|------|-------|-------------|
| MicrosoftAppId | [Bot App ID] | The Microsoft App ID for your bot |
| MicrosoftAppPassword | [Bot App Secret] | The Microsoft App Secret for your bot |
| WEBSITE_NODE_DEFAULT_VERSION | 16.14.2 | Node.js version for App Service |
| KeyVaultName | kv-compliance-bot-prod | Name of your Key Vault resource |
| SqlConnectionStringSecretName | SqlConnectionString | Name of secret in Key Vault |
| TrainingApiEndpoint | https://[your-api]/training | Endpoint for compliance training system |
| TrainingApiKey | [API Key] | API key for compliance training system |
| LogLevel | Information | Logging level (Debug, Information, Warning, Error) |

## Deployment Verification

After deployment, verify the bot is working correctly:

1. **Verify Bot Service**
   - Go to Azure Bot Service and check that the bot is online
   - Review any errors in the Bot Framework Emulator

2. **Verify Teams Integration**
   - Open Microsoft Teams
   - Search for "Compliance Training Reminder"
   - Start a conversation with the bot
   - Send a test message: "Hello"
   - Verify the bot responds with a welcome message

3. **Verify Database Connection**
   - Check Azure SQL Database connection logs
   - Verify schema creation and access permissions

4. **Verify Scheduled Jobs**
   - Manually trigger the Azure Function
   - Check logs to confirm reminders were processed
   - Verify messages are sent to test users

## Post-Deployment Tasks

After successful deployment, complete these tasks:

1. **Add Initial Compliance Data**

   ```sql
   INSERT INTO ComplianceConfig (ConfigId, ReminderFrequencyDays, EscalationDays, MaxReminders, NotificationTemplate)
   VALUES (
       1, 
       7, 
       14, 
       3, 
       'Hello {{UserName}}, this is a reminder that your {{TrainingName}} training is due by {{DueDate}}. Please complete it at your earliest convenience.'
   );

   -- Add sample training records for testing
   INSERT INTO TrainingStatus (UserId, UserEmail, UserName, TrainingId, TrainingName, DueDate, Status)
   VALUES 
   ('test-user-1', 'test1@example.com', 'Test User 1', 'TR-001', 'Annual Security Training', DATEADD(day, 30, GETDATE()), 'Pending'),
   ('test-user-2', 'test2@example.com', 'Test User 2', 'TR-002', 'GDPR Compliance', DATEADD(day, 15, GETDATE()), 'Pending');
   ```

2. **Test End-to-End User Flow**
   - Send test reminders to sample users
   - Verify acknowledgment card delivery
   - Complete a training in the system
   - Verify status updates correctly

3. **Document Deployment Details**
   - Record all deployed resources
   - Document service endpoints
   - Store credentials securely
   - Update runbooks with deployment information

## Troubleshooting

Common deployment issues and their solutions:

| Issue | Solution |
|-------|----------|
| Bot not responding in Teams | Check Bot Service connectivity and messaging endpoint configuration |
| Database connection errors | Verify connection string and firewall settings on Azure SQL Server |
| Authentication failures | Check Microsoft App ID and Secret in environment variables |
| Scheduled reminders not sent | Verify Azure Function timer trigger and permission to call bot service |
| Error 401 Unauthorized | Check if admin consent has been granted for all required permissions |
| Users not receiving messages | Verify Teams channel is configured correctly and bot has messaging permissions |
| Missing user data | Check integration with compliance training system API |

## Security Considerations

Implement these security best practices:

1. **Data Protection**
   - Encrypt sensitive data at rest in Azure SQL using Transparent Data Encryption (TDE)
   - Use Always Encrypted for columns containing personally identifiable information (PII)

2. **Access Control**
   - Implement least privilege access for all components
   - Use Managed Identities instead of service principals where possible
   - Store secrets in Azure Key Vault, not in application settings

3. **Network Security**
   - Configure Azure SQL firewall to allow only necessary IP ranges
   - Use Private Endpoints for Key Vault and SQL access
   - Enable SSL/TLS for all connections

4. **Compliance Requirements**
   - Implement appropriate data retention policies
   - Ensure GDPR compliance for EU users
   - Configure appropriate audit logging for compliance verification

## Monitoring and Maintenance

Setup proper monitoring for the solution:

1. **Application Insights**
   - Configure custom alerts for error rates exceeding thresholds
   - Set up availability tests for the bot endpoint
   - Create dashboards for key performance metrics

2. **Logging Strategy**
   - Implement structured logging with correlation IDs
   - Configure log retention periods
   - Setup log analytics workspaces for centralized logging

3. **Regular Maintenance Tasks**
   - Database index maintenance (weekly)
   - Certificate rotation (quarterly)
   - Secret rotation (quarterly)
   - Dependency updates (monthly)

## Scaling Considerations

Guidelines for scaling the solution:

1. **Vertical Scaling**
   - Start with S1 App Service Plan
   - Monitor CPU/Memory utilization
   - Upgrade to P1V2 for over 1,000 concurrent users

2. **Horizontal Scaling**
   - Enable autoscaling based on queue length
   - Configure scale-out rules: Scale when CPU > 70% for 10 minutes
   - Configure scale-in rules: Scale when CPU < 30% for 20 minutes

3. **Database Scaling**
   - Start with S1 tier for up to 5,000 users
   - Upgrade to S2 for 5,000-15,000 users
   - Consider elastic pools for multi-region deployments

4. **Regional Expansion**
   - Deploy to multiple regions for global organizations
   - Use Traffic Manager for routing
   - Implement geo-replication for the database