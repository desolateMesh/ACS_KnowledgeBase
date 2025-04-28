# Compliance Training Reminder Bot - Adaptive Card Acknowledgement

## Overview

The Compliance Training Reminder Bot with Adaptive Card Acknowledgement is a Microsoft Teams application designed to automate and streamline the process of sending compliance training reminders to employees and tracking their acknowledgments. This documentation provides comprehensive guidance on implementing, customizing, and deploying this solution in your organization.

## Key Features

- **Scheduled Reminders**: Automatically sends compliance training reminders based on configurable schedules
- **Adaptive Cards**: Utilizes interactive Adaptive Cards for user-friendly notifications and acknowledgements
- **Acknowledgement Tracking**: Records and stores employee acknowledgements for compliance reporting
- **Integration Capabilities**: Connects with existing training systems and HR databases
- **Customizable Templates**: Easily modifiable message templates and card designs
- **Reporting Dashboard**: Provides insights into completion rates and outstanding reminders

## Architecture

The Compliance Training Reminder Bot is built using the following components:

1. **Microsoft Bot Framework**: Core framework for the Teams bot implementation
2. **Adaptive Cards**: JSON-based card format for interactive UI elements
3. **Azure Functions**: Serverless compute for scheduled reminder processing
4. **Microsoft Graph API**: For accessing user data and Teams integration
5. **Azure Table Storage/Cosmos DB**: For storing acknowledgement data
6. **Azure Key Vault**: For securely storing credentials and connection strings

```
┌─────────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│                     │      │                      │      │                   │
│    Teams Client     │◄────►│  Teams Bot Service   │◄────►│  Azure Functions  │
│                     │      │                      │      │                   │
└─────────────────────┘      └──────────────────────┘      └─────────┬─────────┘
                                                                     │
                                                                     ▼
┌─────────────────────┐      ┌──────────────────────┐      ┌───────────────────┐
│                     │      │                      │      │                   │
│   Reporting Portal  │◄────►│   Storage Services   │◄────►│   Graph API       │
│                     │      │                      │      │                   │
└─────────────────────┘      └──────────────────────┘      └───────────────────┘
```

## Implementation Guide

### Prerequisites

- Microsoft 365 developer account with Teams administration privileges
- Azure subscription
- Node.js (version 14 or higher)
- Microsoft Teams Toolkit for Visual Studio Code (optional but recommended)
- Bot Framework SDK
- Adaptive Cards SDK

### Setup and Configuration

#### 1. Register the Bot in Azure

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Create a new Bot Registration resource
3. Note the Bot ID and secret for later use
4. Configure the messaging endpoint to your deployment URL

#### 2. Configure the Teams App Manifest

Create a `manifest.json` file with the following essential components:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.12/MicrosoftTeams.schema.json",
  "manifestVersion": "1.12",
  "version": "1.0.0",
  "id": "[your-bot-id]",
  "packageName": "com.contoso.compliancetrainingbot",
  "developer": {
    "name": "Contoso",
    "websiteUrl": "https://contoso.com",
    "privacyUrl": "https://contoso.com/privacy",
    "termsOfUseUrl": "https://contoso.com/terms"
  },
  "name": {
    "short": "Compliance Training Bot",
    "full": "Compliance Training Reminder Bot"
  },
  "description": {
    "short": "Sends training reminders and collects acknowledgements",
    "full": "A bot that sends compliance training reminders to employees and tracks their acknowledgements using Adaptive Cards"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "[your-bot-id]",
      "scopes": [
        "personal",
        "team",
        "groupchat"
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
    "token.botframework.com",
    "*.azurewebsites.net"
  ]
}
```

#### 3. Set Up Azure Resources

Deploy the following Azure resources:

- **App Service**: To host the bot service
- **Azure Functions**: For scheduled reminders
- **Storage Account**: For acknowledgement data
- **Key Vault**: For secure credential storage

Use the following ARM template sample as a starting point:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "botServiceName": {
      "type": "string",
      "metadata": {
        "description": "The name of the Bot Service"
      }
    },
    "storageAccountName": {
      "type": "string",
      "metadata": {
        "description": "The name of the Storage Account"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]",
      "metadata": {
        "description": "Location for all resources"
      }
    }
  },
  "resources": [
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2021-02-01",
      "name": "[parameters('botServiceName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "S1",
        "tier": "Standard"
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2021-02-01",
      "name": "[parameters('botServiceName')]",
      "location": "[parameters('location')]",
      "kind": "app",
      "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', parameters('botServiceName'))]"
      ],
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('botServiceName'))]"
      }
    },
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2021-06-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2"
    }
  ]
}
```

### Adaptive Card Implementation

Create an Adaptive Card template for the compliance training reminder. Here's a sample implementation:

```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Compliance Training Reminder"
    },
    {
      "type": "TextBlock",
      "text": "You have pending compliance training that requires completion.",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Training Module:",
          "value": "${trainingName}"
        },
        {
          "title": "Due Date:",
          "value": "${dueDate}"
        },
        {
          "title": "Estimated Duration:",
          "value": "${duration} minutes"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Please acknowledge this reminder and complete your training by the due date.",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Start Training",
      "url": "${trainingUrl}"
    },
    {
      "type": "Action.Submit",
      "title": "Acknowledge",
      "data": {
        "actionType": "acknowledge",
        "trainingId": "${trainingId}",
        "userId": "${userId}"
      }
    }
  ],
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4"
}
```

### Bot Implementation

Below is a sample implementation of the bot's main functionality using the Bot Framework SDK:

```javascript
// Import required dependencies
const { TeamsActivityHandler, CardFactory, TurnContext } = require('botbuilder');
const ACData = require('adaptivecards-templating');
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// Sample reminder card template
const reminderCardTemplate = require('./cards/reminderCard.json');

class ComplianceTrainingBot extends TeamsActivityHandler {
  constructor() {
    super();
    
    // Initialize database connections
    this.initializeDatabase();
    
    // Handle message reactions
    this.onMessage(async (context, next) => {
      if (context.activity.value && context.activity.value.actionType === 'acknowledge') {
        await this.handleAcknowledgement(context);
      }
      await next();
    });
  }
  
  async initializeDatabase() {
    // Securely access connection strings from Key Vault
    const credential = new DefaultAzureCredential();
    const keyVaultClient = new SecretClient(
      process.env.KEY_VAULT_URI,
      credential
    );
    
    const cosmosConnectionString = await keyVaultClient.getSecret('CosmosConnectionString');
    
    // Initialize Cosmos DB client
    const cosmosClient = new CosmosClient(cosmosConnectionString.value);
    this.database = cosmosClient.database('compliancebot');
    this.acknowledgementsContainer = this.database.container('acknowledgements');
  }
  
  async sendTrainingReminder(userId, trainingDetails) {
    // Create adaptive card from template
    const cardTemplate = new ACData.Template(reminderCardTemplate);
    const cardPayload = cardTemplate.expand({
      $root: {
        trainingName: trainingDetails.name,
        dueDate: trainingDetails.dueDate,
        duration: trainingDetails.duration,
        trainingUrl: trainingDetails.url,
        trainingId: trainingDetails.id,
        userId: userId
      }
    });
    
    const cardAttachment = CardFactory.adaptiveCard(cardPayload);
    
    // Send reminder to user
    const reference = await this.createConversationReference(userId);
    await this.adapter.continueConversation(reference, async (turnContext) => {
      await turnContext.sendActivity({ attachments: [cardAttachment] });
    });
    
    // Log the reminder in database
    await this.acknowledgementsContainer.items.create({
      userId: userId,
      trainingId: trainingDetails.id,
      reminderSent: new Date().toISOString(),
      acknowledged: false
    });
  }
  
  async handleAcknowledgement(context) {
    const payload = context.activity.value;
    
    // Update the acknowledgement record
    const { resource: record } = await this.acknowledgementsContainer
      .item(`${payload.userId}-${payload.trainingId}`)
      .read();
    
    if (record) {
      record.acknowledged = true;
      record.acknowledgedDate = new Date().toISOString();
      
      await this.acknowledgementsContainer
        .item(record.id)
        .replace(record);
      
      // Send confirmation to user
      await context.sendActivity('Thank you for acknowledging the training reminder. Please complete the training by the due date.');
    }
  }
  
  async createConversationReference(userId) {
    // Implementation to create conversation reference for proactive messaging
    // This would typically use Microsoft Graph API to get necessary information
  }
}

module.exports.ComplianceTrainingBot = ComplianceTrainingBot;
```

### Scheduled Reminders Implementation

Use Azure Functions to implement scheduled reminders. Here's a sample implementation:

```javascript
// sendReminders.js - Azure Function
const { BotFrameworkAdapter } = require('botbuilder');
const { ComplianceTrainingBot } = require('../bots/complianceTrainingBot');
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');
const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, myTimer) {
  // Setup bot adapter
  const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
  });
  
  const bot = new ComplianceTrainingBot();
  
  // Connect to database to retrieve pending reminders
  const credential = new DefaultAzureCredential();
  const keyVaultClient = new SecretClient(
    process.env.KEY_VAULT_URI,
    credential
  );
  
  const cosmosConnectionString = await keyVaultClient.getSecret('CosmosConnectionString');
  
  const cosmosClient = new CosmosClient(cosmosConnectionString.value);
  const database = cosmosClient.database('compliancebot');
  const scheduledRemindersContainer = database.container('scheduledReminders');
  const employeesContainer = database.container('employees');
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Query for reminders scheduled for today
  const querySpec = {
    query: "SELECT * FROM c WHERE c.scheduledDate = @currentDate AND c.sent = false",
    parameters: [
      {
        name: "@currentDate",
        value: currentDate
      }
    ]
  };
  
  const { resources: reminders } = await scheduledRemindersContainer.items
    .query(querySpec)
    .fetchAll();
  
  // Send reminders to each user
  for (const reminder of reminders) {
    // Get employee details
    const { resource: employee } = await employeesContainer.item(reminder.employeeId).read();
    
    if (employee) {
      // Send reminder
      await bot.sendTrainingReminder(employee.userId, {
        id: reminder.trainingId,
        name: reminder.trainingName,
        dueDate: reminder.dueDate,
        duration: reminder.estimatedDuration,
        url: reminder.trainingUrl
      });
      
      // Mark reminder as sent
      reminder.sent = true;
      reminder.sentDate = new Date().toISOString();
      
      await scheduledRemindersContainer
        .item(reminder.id)
        .replace(reminder);
    }
  }
  
  context.log(`Sent ${reminders.length} compliance training reminders`);
};
```

### Reporting and Analytics

Implement a reporting system to track acknowledgements and completions:

```javascript
// reportingApi.js
const express = require('express');
const router = express.Router();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// Authentication middleware
const authenticate = async (req, res, next) => {
  // Implement your authentication logic here
  next();
};

// Initialize database connection
let acknowledgementsContainer;
const initializeDatabase = async () => {
  const credential = new DefaultAzureCredential();
  const keyVaultClient = new SecretClient(
    process.env.KEY_VAULT_URI,
    credential
  );
  
  const cosmosConnectionString = await keyVaultClient.getSecret('CosmosConnectionString');
  
  const cosmosClient = new CosmosClient(cosmosConnectionString.value);
  const database = cosmosClient.database('compliancebot');
  acknowledgementsContainer = database.container('acknowledgements');
};

initializeDatabase().catch(console.error);

// Get acknowledgement summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const querySpec = {
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.reminderSent >= @startDate AND c.reminderSent <= @endDate",
      parameters: [
        {
          name: "@startDate",
          value: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: "@endDate",
          value: req.query.endDate || new Date().toISOString()
        }
      ]
    };
    
    const { resources: [totalCount] } = await acknowledgementsContainer.items
      .query(querySpec)
      .fetchAll();
    
    const acknowledgedQuerySpec = {
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.reminderSent >= @startDate AND c.reminderSent <= @endDate AND c.acknowledged = true",
      parameters: [
        {
          name: "@startDate",
          value: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: "@endDate",
          value: req.query.endDate || new Date().toISOString()
        }
      ]
    };
    
    const { resources: [acknowledgedCount] } = await acknowledgementsContainer.items
      .query(acknowledgedQuerySpec)
      .fetchAll();
    
    res.json({
      totalReminders: totalCount,
      acknowledged: acknowledgedCount,
      acknowledgedPercentage: totalCount > 0 ? (acknowledgedCount / totalCount) * 100 : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve acknowledgement summary' });
  }
});

// Get detailed acknowledgement records
router.get('/details', authenticate, async (req, res) => {
  try {
    const querySpec = {
      query: "SELECT c.userId, c.trainingId, c.reminderSent, c.acknowledged, c.acknowledgedDate FROM c WHERE c.reminderSent >= @startDate AND c.reminderSent <= @endDate",
      parameters: [
        {
          name: "@startDate",
          value: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: "@endDate",
          value: req.query.endDate || new Date().toISOString()
        }
      ]
    };
    
    const { resources: records } = await acknowledgementsContainer.items
      .query(querySpec)
      .fetchAll();
    
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve acknowledgement details' });
  }
});

module.exports = router;
```

## Customization Guide

### Modifying the Adaptive Card

To customize the appearance and content of the Adaptive Card:

1. Edit the `reminderCard.json` template file
2. Use the [Adaptive Card Designer](https://adaptivecards.io/designer/) for visual editing
3. Test your card design with sample data
4. Update the template variables as needed

### Custom Reminder Schedules

Configure custom reminder schedules by modifying the scheduled reminders database:

1. Create a new scheduled reminder document:
   ```json
   {
     "employeeId": "employee123",
     "trainingId": "training456",
     "trainingName": "Data Privacy 2025",
     "scheduledDate": "2025-05-15",
     "dueDate": "2025-05-30",
     "estimatedDuration": 45,
     "trainingUrl": "https://training.contoso.com/courses/data-privacy-2025",
     "sent": false
   }
   ```

2. For recurring reminders, use Azure Logic Apps or Functions to generate reminder schedules

### Integration with HR Systems

Integrate with HR systems to automate employee tracking:

1. Use Azure Logic Apps to sync employee data
2. Implement webhooks to receive employee updates
3. Connect to HR APIs to fetch training requirements

## Deployment Guide

### Development Environment Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure environment variables in a `.env` file:
   ```
   MicrosoftAppId=your-bot-id
   MicrosoftAppPassword=your-bot-password
   KEY_VAULT_URI=your-key-vault-uri
   ```
4. Start the local development server with `npm start`

### Teams App Package Creation

1. Package the Teams app manifest and icons:
   ```
   manifest.json
   outline.png
   color.png
   ```
2. Zip the files to create a Teams app package
3. Upload the package to your Teams tenant

### Azure Deployment

Deploy the solution to Azure using Azure DevOps or GitHub Actions:

1. Set up a CI/CD pipeline
2. Configure deployment variables
3. Deploy to Azure App Service and Azure Functions
4. Verify deployment with health checks

## Best Practices

1. **Security Considerations**:
   - Use Azure Key Vault for all secrets
   - Implement proper authentication for the bot and reporting API
   - Regularly audit access controls

2. **Performance Optimization**:
   - Use caching for frequently accessed data
   - Optimize database queries
   - Implement rate limiting for API endpoints

3. **Compliance Recommendations**:
   - Store acknowledgement data for audit purposes
   - Implement data retention policies
   - Provide reporting capabilities for compliance audits

4. **Monitoring and Logging**:
   - Use Application Insights for monitoring
   - Implement structured logging
   - Set up alerts for error conditions

## Troubleshooting

### Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Bot not responding | Authentication failure | Verify Bot ID and password |
| Cards not rendering | Malformed Adaptive Card JSON | Validate using the Adaptive Card Designer |
| Scheduled reminders not sending | Azure Function configuration | Check function app settings and logs |
| Database connection errors | Connection string or permissions | Verify Key Vault access and connection strings |

### Logging and Diagnostics

1. Enable Application Insights for comprehensive logging
2. Use structured logging with context information
3. Implement correlation IDs across system components

## Additional Resources

- [Microsoft Teams Developer Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [Bot Framework Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Adaptive Cards Documentation](https://adaptivecards.io/documentation/)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
