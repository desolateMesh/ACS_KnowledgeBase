## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [System Requirements](#system-requirements)
4. [Installation Process](#installation-process)
5. [Bot Framework Configuration](#bot-framework-configuration)
6. [Azure Services Integration](#azure-services-integration)
7. [Knowledge Base Configuration](#knowledge-base-configuration)
8. [Channel Configuration](#channel-configuration)
9. [User Authentication Setup](#user-authentication-setup)
10. [Middleware Components](#middleware-components)
11. [Logging and Monitoring](#logging-and-monitoring)
12. [Testing and Validation](#testing-and-validation)
13. [Production Deployment](#production-deployment)
14. [Troubleshooting](#troubleshooting)
15. [Maintenance and Updates](#maintenance-and-updates)
16. [Appendix: Configuration Templates](#appendix-configuration-templates)

## Introduction

This document provides comprehensive instructions for setting up and configuring the Help Desk Bot system for ACS operations. The Help Desk Bot is designed to provide automated support for common IT issues, ticket management, knowledge retrieval, and escalation to human agents when necessary.

### Purpose and Scope

The Help Desk Bot serves as the first line of support for employees and clients, handling:

- Common IT troubleshooting
- Service request submissions
- Knowledge base searches
- Ticket creation and status updates
- User authentication and verification
- Intelligent routing to appropriate human agents

This configuration guide covers the complete setup process from initial installation to production deployment, including integration with existing ACS systems.

### System Architecture Overview

The Help Desk Bot leverages a microservices architecture built on Azure Bot Framework with the following key components:

- **Bot Service**: Core conversational logic and dialog management
- **Language Understanding (LUIS)**: Natural language processing for intent recognition
- **QnA Maker**: Knowledge base integration for FAQ-style responses
- **Azure Cognitive Search**: Advanced content indexing and retrieval
- **Azure Functions**: Serverless components for specific business logic
- **Azure SQL Database**: Persistent storage for conversation history and user data
- **Azure Active Directory**: User authentication and authorization
- **Application Insights**: Telemetry and performance monitoring

![Bot Architecture Diagram](https://raw.githubusercontent.com/YourOrg/HelpDeskBot/main/docs/images/architecture.png)

## Prerequisites

Before beginning the installation and configuration process, ensure the following prerequisites are met:

### Required Permissions

| Resource | Required Role | Purpose |
|----------|---------------|---------|
| Azure Subscription | Contributor or Owner | Resource creation and configuration |
| Azure Active Directory | Global Administrator | Setting up authentication |
| Microsoft 365 | Teams Service Administrator | Teams channel integration |
| Azure DevOps | Project Administrator | CI/CD pipeline configuration |
| SQL Server | db_owner | Database schema creation |

### Required Subscriptions

1. **Azure Subscription** with access to:
   - Bot Services
   - Cognitive Services
   - App Service
   - Azure SQL
   - Application Insights
   
2. **Microsoft 365 Subscription** (for Teams integration)

3. **Bot Framework Developer Account**

### Required Software

- **Development Environment**:
  - Visual Studio 2022 or higher
  - Bot Framework Emulator (latest version)
  - Azure CLI 2.40.0 or higher
  - Azure PowerShell 8.0.0 or higher
  - Git 2.37.0 or higher

- **Server Environment**:
  - .NET Core 6.0 runtime or higher
  - Node.js 18.x LTS or higher (for specific components)

## System Requirements

### Minimum Hardware Requirements

| Component | Development | Testing | Production |
|-----------|-------------|---------|------------|
| CPU | 4 cores | 8 cores | 16+ cores |
| RAM | 16 GB | 32 GB | 64+ GB |
| Storage | 256 GB SSD | 512 GB SSD | 1+ TB SSD |
| Network | 100 Mbps | 1 Gbps | 10+ Gbps |

### Software Requirements

#### Operating Systems
- **Development**: Windows 10/11 Pro, macOS 12+, or Ubuntu 20.04+
- **Server**: Windows Server 2019/2022 or Ubuntu Server 20.04+

#### Azure Services Versions
- Azure Bot Service: v4.15.0 or higher
- Azure Cognitive Services: v3.1 or higher
- Azure Functions: v4.0 or higher
- Azure SQL: Latest generally available version

#### Additional Software
- **SSL Certificates**: Valid TLS/SSL certificates for all endpoints
- **DNS Configuration**: Proper DNS entries for bot endpoints
- **Firewall Rules**: Appropriate inbound/outbound rules for bot communication

## Installation Process

This section provides step-by-step instructions for installing the Help Desk Bot system components.

### Step 1: Clone the Repository

```bash
# Create a directory for the project
mkdir -p ~/projects/help-desk-bot
cd ~/projects/help-desk-bot

# Clone the repository
git clone https://github.com/ACS/help-desk-bot.git .

# Install dependencies
dotnet restore
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Bot Configuration
BOT_ID=your-bot-id
BOT_PASSWORD=your-bot-password
BOT_APP_INSIGHTS_KEY=your-app-insights-key

# Azure Configuration
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
AZURE_RESOURCE_GROUP=your-resource-group

# Database Configuration
SQL_SERVER=your-sql-server.database.windows.net
SQL_DATABASE=HelpDeskBotDB
SQL_USERNAME=your-sql-username
SQL_PASSWORD=your-sql-password

# LUIS Configuration
LUIS_AUTHORING_KEY=your-luis-authoring-key
LUIS_ENDPOINT=https://your-region.api.cognitive.microsoft.com
LUIS_APP_ID=your-luis-app-id

# QnA Maker Configuration
QNA_ENDPOINT_KEY=your-qna-endpoint-key
QNA_ENDPOINT=https://your-qna-service.azurewebsites.net
QNA_KNOWLEDGE_BASE_ID=your-knowledge-base-id

# Authentication
AAD_APP_CLIENT_ID=your-aad-client-id
AAD_APP_CLIENT_SECRET=your-aad-client-secret
AAD_APP_TENANT_ID=your-aad-tenant-id
AAD_APP_SCOPES=openid profile email

# Teams Configuration
TEAMS_APP_ID=your-teams-app-id
```

> **IMPORTANT**: Never commit the `.env` file to source control. Ensure it's included in your `.gitignore` file.

### Step 3: Deploy Azure Resources

Use the provided ARM template to deploy all required Azure resources:

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription \"your-subscription-id\"

# Create resource group if it doesn't exist
az group create --name \"your-resource-group\" --location \"eastus\"

# Deploy ARM template
az deployment group create \\
  --resource-group \"your-resource-group\" \\
  --template-file \"deploy/azuredeploy.json\" \\
  --parameters @deploy/azuredeploy.parameters.json
```

The ARM template creates the following resources:
- Bot Service
- App Service Plan
- App Service
- Application Insights
- Cognitive Services (LUIS and QnA Maker)
- Azure SQL Database
- Storage Account
- Key Vault

### Step 4: Deploy the Bot Code

Deploy the bot code to the App Service:

```bash
# Build the solution
dotnet publish -c Release -o ./publish

# Deploy to Azure App Service
az webapp deployment source config-zip \\
  --resource-group \"your-resource-group\" \\
  --name \"your-bot-app-service-name\" \\
  --src \"./publish/publish.zip\"
```

### Step 5: Initialize Database

Initialize the database schema:

```bash
# Run database migrations
dotnet ef database update --project src/HelpDeskBot.Data
```

## Bot Framework Configuration

This section covers the detailed configuration of the Bot Framework components.

### Bot Registration

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Go to your Bot Service resource
3. Under \"Settings\", configure the following:
   - **Display Name**: `ACS Help Desk Bot`
   - **Endpoint URL**: `https://your-bot-app-service.azurewebsites.net/api/messages`
   - **Microsoft App ID**: Use the value from the ARM deployment
   - **Microsoft App Password**: Use the value from the ARM deployment

### Bot Configuration File

Create or update the `appsettings.json` file with the following configuration:

```json
{
  \"MicrosoftAppId\": \"your-bot-app-id\",
  \"MicrosoftAppPassword\": \"your-bot-app-password\",
  \"ScmType\": \"None\",
  \"LuisAPIHostName\": \"your-region.api.cognitive.microsoft.com\",
  \"LuisAPIKey\": \"your-luis-api-key\",
  \"LuisAppId\": \"your-luis-app-id\",
  \"QnAKnowledgebaseId\": \"your-qna-kb-id\",
  \"QnAAuthKey\": \"your-qna-auth-key\",
  \"QnAEndpointHostName\": \"your-qna-hostname.azurewebsites.net\",
  \"AllowedHosts\": \"*\",
  \"ConnectionStrings\": {
    \"DefaultConnection\": \"Server=your-sql-server.database.windows.net;Database=HelpDeskBotDB;User Id=your-sql-username;Password=your-sql-password;\"
  },
  \"AzureAd\": {
    \"Instance\": \"https://login.microsoftonline.com/\",
    \"Domain\": \"yourdomain.onmicrosoft.com\",
    \"TenantId\": \"your-tenant-id\",
    \"ClientId\": \"your-client-id\",
    \"CallbackPath\": \"/signin-oidc\",
    \"SignedOutCallbackPath\": \"/signout-callback-oidc\",
    \"ClientSecret\": \"your-client-secret\"
  },
  \"ApplicationInsights\": {
    \"InstrumentationKey\": \"your-app-insights-key\"
  },
  \"BotConfiguration\": {
    \"WelcomeMessage\": \"Hello! I'm the ACS Help Desk Bot. How can I help you today?\",
    \"MaxConversationTimeout\": 30,
    \"TypingIndicatorDelay\": 2000,
    \"DefaultLocale\": \"en-US\",
    \"SupportedLocales\": [\"en-US\", \"es-ES\", \"fr-FR\"],
    \"FeedbackEnabled\": true,
    \"EscalationThreshold\": 3,
    \"TicketSystemIntegration\": {
      \"Enabled\": true,
      \"Endpoint\": \"https://your-ticket-system-api.com\",
      \"ApiKey\": \"your-ticket-system-api-key\",
      \"DefaultPriority\": \"Medium\",
      \"DefaultCategory\": \"IT Support\"
    }
  }
}
```

> **NOTE**: For security reasons, sensitive values like API keys and connection strings should be stored in Azure Key Vault in production environments and referenced using Key Vault references.

### Dialog Configuration

Configure the bot's dialog system in the `Dialogs` folder:

#### Main Dialog

The `MainDialog.cs` file should be updated with the following configuration:

```csharp
public class MainDialog : ComponentDialog
{
    private readonly ILogger _logger;
    private readonly IConfiguration _configuration;
    private readonly BotServices _botServices;
    
    public MainDialog(
        IConfiguration configuration,
        BotServices botServices,
        UserState userState,
        ConversationState conversationState,
        ILogger<MainDialog> logger)
        : base(nameof(MainDialog))
    {
        _logger = logger;
        _configuration = configuration;
        _botServices = botServices;
        
        // Add dialogs
        AddDialog(new TextPrompt(nameof(TextPrompt)));
        AddDialog(new ChoicePrompt(nameof(ChoicePrompt)));
        AddDialog(new ConfirmPrompt(nameof(ConfirmPrompt)));
        
        // Add specific help desk dialogs
        AddDialog(new ITSupportDialog(_configuration, _botServices, userState, conversationState));
        AddDialog(new TicketStatusDialog(_configuration, _botServices, userState, conversationState));
        AddDialog(new KnowledgeBaseDialog(_configuration, _botServices, userState, conversationState));
        AddDialog(new UserAuthenticationDialog(_configuration, userState, conversationState));
        
        // Set the main dialog flow
        var waterfallSteps = new WaterfallStep[]
        {
            InitialStepAsync,
            FinalStepAsync
        };
        
        AddDialog(new WaterfallDialog(nameof(WaterfallDialog), waterfallSteps));
        
        // Set the initial dialog
        InitialDialogId = nameof(WaterfallDialog);
    }
    
    // Dialog steps implementation...
}
```

#### Specialized Dialogs

Create specialized dialogs for each support scenario:

1. **IT Support Dialog**: Handles technical issues and troubleshooting
2. **Ticket Status Dialog**: Provides ticket status updates
3. **Knowledge Base Dialog**: Searches the knowledge base for information
4. **User Authentication Dialog**: Handles user authentication

## Azure Services Integration

### Language Understanding (LUIS)

Create a LUIS model with the following intents:

- `Greeting`: User greetings
- `Farewell`: User farewells
- `Help`: User requests for help
- `CreateTicket`: User wants to create a support ticket
- `CheckTicketStatus`: User wants to check a ticket status
- `ITSupport`: User has an IT issue
- `NetworkIssue`: User has a network-specific issue
- `SoftwareIssue`: User has a software-specific issue
- `HardwareIssue`: User has a hardware-specific issue
- `PasswordReset`: User needs a password reset
- `Escalate`: User wants to speak to a human agent
- `Feedback`: User wants to provide feedback
- `None`: Fallback intent

Example LUIS schema:

```json
{
  \"luis_schema_version\": \"7.0.0\",
  \"intents\": [
    {
      \"name\": \"Greeting\"
    },
    {
      \"name\": \"Farewell\"
    },
    {
      \"name\": \"Help\"
    },
    {
      \"name\": \"CreateTicket\"
    },
    {
      \"name\": \"CheckTicketStatus\"
    },
    {
      \"name\": \"ITSupport\"
    },
    {
      \"name\": \"NetworkIssue\"
    },
    {
      \"name\": \"SoftwareIssue\"
    },
    {
      \"name\": \"HardwareIssue\"
    },
    {
      \"name\": \"PasswordReset\"
    },
    {
      \"name\": \"Escalate\"
    },
    {
      \"name\": \"Feedback\"
    },
    {
      \"name\": \"None\"
    }
  ],
  \"entities\": [
    {
      \"name\": \"TicketNumber\",
      \"roles\": []
    },
    {
      \"name\": \"SoftwareName\",
      \"roles\": []
    },
    {
      \"name\": \"HardwareDevice\",
      \"roles\": []
    },
    {
      \"name\": \"Priority\",
      \"roles\": []
    }
  ],
  \"composites\": [],
  \"closedLists\": [
    {
      \"name\": \"Priority\",
      \"subLists\": [
        {
          \"canonicalForm\": \"High\",
          \"list\": [
            \"urgent\",
            \"critical\",
            \"emergency\",
            \"asap\",
            \"immediately\"
          ]
        },
        {
          \"canonicalForm\": \"Medium\",
          \"list\": [
            \"normal\",
            \"regular\",
            \"standard\",
            \"average\"
          ]
        },
        {
          \"canonicalForm\": \"Low\",
          \"list\": [
            \"whenever\",
            \"not urgent\",
            \"when you have time\",
            \"no rush\"
          ]
        }
      ],
      \"roles\": []
    }
  ],
  \"patternAnyEntities\": [],
  \"regex_entities\": [
    {
      \"name\": \"TicketNumber\",
      \"regexPattern\": \"TKT-[0-9]{5,7}\",
      \"roles\": []
    }
  ],
  \"prebuiltEntities\": [
    {
      \"name\": \"datetimeV2\",
      \"roles\": []
    },
    {
      \"name\": \"email\",
      \"roles\": []
    },
    {
      \"name\": \"number\",
      \"roles\": []
    }
  ],
  \"model_features\": [],
  \"regex_features\": [],
  \"patterns\": [],
  \"utterances\": [
    {
      \"text\": \"hello\",
      \"intent\": \"Greeting\",
      \"entities\": []
    },
    {
      \"text\": \"hi there\",
      \"intent\": \"Greeting\",
      \"entities\": []
    },
    // Additional utterances for each intent...
  ]
}
```

#### LUIS Integration Code

```csharp
// LuisHelper.cs
public static class LuisHelper
{
    public static async Task<HelpDeskIntent> ExecuteLuisQuery(
        ILogger logger,
        IRecognizer luisRecognizer,
        ITurnContext turnContext,
        CancellationToken cancellationToken)
    {
        var helpDeskIntent = new HelpDeskIntent();
        
        try
        {
            var recognizerResult = await luisRecognizer.RecognizeAsync(turnContext, cancellationToken);
            var topIntent = recognizerResult.GetTopScoringIntent();
            
            helpDeskIntent.Intent = topIntent.intent;
            helpDeskIntent.Score = topIntent.score;
            
            // Extract entities
            if (recognizerResult.Entities.Count > 0)
            {
                // Extract ticket number
                if (recognizerResult.Entities.TryGetValue(\"TicketNumber\", out var ticketNumberEntity))
                {
                    var ticketNumber = ticketNumberEntity.FirstOrDefault()?.ToString();
                    helpDeskIntent.TicketNumber = ticketNumber;
                }
                
                // Extract software name
                if (recognizerResult.Entities.TryGetValue(\"SoftwareName\", out var softwareNameEntity))
                {
                    var softwareName = softwareNameEntity.FirstOrDefault()?.ToString();
                    helpDeskIntent.SoftwareName = softwareName;
                }
                
                // Extract hardware device
                if (recognizerResult.Entities.TryGetValue(\"HardwareDevice\", out var hardwareDeviceEntity))
                {
                    var hardwareDevice = hardwareDeviceEntity.FirstOrDefault()?.ToString();
                    helpDeskIntent.HardwareDevice = hardwareDevice;
                }
                
                // Extract priority
                if (recognizerResult.Entities.TryGetValue(\"Priority\", out var priorityEntity))
                {
                    var priority = priorityEntity.FirstOrDefault()?.ToString();
                    helpDeskIntent.Priority = priority;
                }
                
                // Extract datetime
                if (recognizerResult.Entities.TryGetValue(\"datetimeV2\", out var datetimeEntity))
                {
                    var datetime = datetimeEntity.FirstOrDefault()?.ToString();
                    helpDeskIntent.DateTime = datetime;
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, \"Error in LUIS recognition: {Message}\", ex.Message);
        }
        
        return helpDeskIntent;
    }
}
```

### QnA Maker

Set up a QnA Maker knowledge base with the following configuration:

1. **Knowledge Base Name**: `ACS Help Desk KB`
2. **Source Documents**:
   - Help desk FAQs
   - IT support documentation
   - Common troubleshooting guides
   - Company policies
   - System user manuals

#### Knowledge Base Configuration

```json
{
  \"name\": \"ACS Help Desk KB\",
  \"qnaList\": [
    {
      \"id\": 1,
      \"answer\": \"To reset your password, please visit the self-service portal at https://password.acs.com or contact the help desk at helpdesk@acs.com.\",
      \"source\": \"Password Reset FAQ\",
      \"questions\": [
        \"How do I reset my password?\",
        \"I forgot my password\",
        \"Password reset procedure\",
        \"Can't remember my password\"
      ],
      \"metadata\": [
        {
          \"name\": \"Category\",
          \"value\": \"Password\"
        },
        {
          \"name\": \"Priority\",
          \"value\": \"High\"
        }
      ]
    },
    {
      \"id\": 2,
      \"answer\": \"If you're experiencing network connectivity issues, please try the following steps:\
\
1. Restart your computer\
2. Check your network cable connections\
3. Verify that Wi-Fi is enabled on your device\
4. Restart your router or modem\
5. Run the network troubleshooter by right-clicking the network icon in the taskbar\
\
If these steps don't resolve the issue, please contact the help desk.\",
      \"source\": \"Network Troubleshooting Guide\",
      \"questions\": [
        \"Can't connect to the internet\",
        \"Network issues\",
        \"Wi-Fi not working\",
        \"No internet connection\",
        \"Network troubleshooting\"
      ],
      \"metadata\": [
        {
          \"name\": \"Category\",
          \"value\": \"Network\"
        },
        {
          \"name\": \"Priority\",
          \"value\": \"Medium\"
        }
      ]
    }
    // Additional QnA pairs...
  ],
  \"urls\": [
    \"https://support.acs.com/faq\",
    \"https://intranet.acs.com/it-support\"
  ],
  \"files\": [
    {
      \"fileName\": \"IT Support Handbook.pdf\",
      \"fileUri\": \"https://intranet.acs.com/documents/IT-Support-Handbook.pdf\"
    },
    {
      \"fileName\": \"Common Issues Guide.docx\",
      \"fileUri\": \"https://intranet.acs.com/documents/Common-Issues-Guide.docx\"
    }
  ]
}
```

#### QnA Maker Integration Code

```csharp
// QnAHelper.cs
public static class QnAHelper
{
    public static async Task<QnAResult> GetAnswerFromQnA(
        ILogger logger,
        IQnAMakerClient qnaMaker,
        ITurnContext turnContext,
        CancellationToken cancellationToken)
    {
        var qnaResult = new QnAResult();
        
        try
        {
            var response = await qnaMaker.GetAnswersAsync(turnContext, new QnAMakerOptions
            {
                ScoreThreshold = 0.5f,
                Top = 3,
                QnAId = 0,
                RankerType = \"Default\",
                IsTest = false
            });
            
            if (response != null && response.Length > 0)
            {
                qnaResult.Answer = response[0].Answer;
                qnaResult.Score = response[0].Score;
                qnaResult.Questions = response[0].Questions;
                qnaResult.Metadata = response[0].Metadata;
                qnaResult.Source = response[0].Source;
                
                // Store alternative answers
                qnaResult.AlternativeAnswers = response
                    .Skip(1)
                    .Select(a => new QnAAlternative
                    {
                        Answer = a.Answer,
                        Score = a.Score,
                        Questions = a.Questions
                    })
                    .ToList();
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, \"Error in QnA Maker: {Message}\", ex.Message);
        }
        
        return qnaResult;
    }
}
```

## Channel Configuration

### Microsoft Teams Channel

To configure the Microsoft Teams channel:

1. Register your bot with the Bot Framework
2. Create a Teams app manifest file:

```json
{
  \"$schema\": \"https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json\",
  \"manifestVersion\": \"1.11\",
  \"version\": \"1.0.0\",
  \"id\": \"your-bot-app-id\",
  \"packageName\": \"com.acs.helpdesk.bot\",
  \"developer\": {
    \"name\": \"ACS IT Department\",
    \"websiteUrl\": \"https://www.acs.com\",
    \"privacyUrl\": \"https://www.acs.com/privacy\",
    \"termsOfUseUrl\": \"https://www.acs.com/terms\"
  },
  \"icons\": {
    \"color\": \"color.png\",
    \"outline\": \"outline.png\"
  },
  \"name\": {
    \"short\": \"Help Desk Bot\",
    \"full\": \"ACS Help Desk Bot\"
  },
  \"description\": {
    \"short\": \"IT help desk support bot\",
    \"full\": \"A bot to help with IT support, ticket management, and knowledge base searches\"
  },
  \"accentColor\": \"#FFFFFF\",
  \"bots\": [
    {
      \"botId\": \"your-bot-app-id\",
      \"scopes\": [
        \"personal\",
        \"team\",
        \"groupchat\"
      ],
      \"supportsFiles\": false,
      \"isNotificationOnly\": false,
      \"commandLists\": [
        {
          \"scopes\": [
            \"personal\",
            \"team\",
            \"groupchat\"
          ],
          \"commands\": [
            {
              \"title\": \"help\",
              \"description\": \"Get help with bot commands\"
            },
            {
              \"title\": \"new ticket\",
              \"description\": \"Create a new support ticket\"
            },
            {
              \"title\": \"status\",
              \"description\": \"Check ticket status\"
            },
            {
              \"title\": \"faq\",
              \"description\": \"Search the knowledge base\"
            }
          ]
        }
      ]
    }
  ],
  \"permissions\": [
    \"identity\",
    \"messageTeamMembers\"
  ],
  \"validDomains\": [
    \"*.acs.com\",
    \"*.botframework.com\",
    \"*.azurewebsites.net\"
  ]
}
```

3. Package the Teams app using the App Studio
4. Deploy the Teams app to your organization's app catalog

### Web Chat Channel

To configure the Web Chat channel:

1. In the Azure Portal, navigate to your Bot Service
2. Go to Channels and select Web Chat
3. Copy the generated Web Chat embed code
4. Add the embed code to your intranet or support portal pages

Example embed code:

```html
<iframe src=\"https://webchat.botframework.com/embed/your-bot-id?s=your-secret-key\"
    style=\"width: 100%; height: 500px; border: 1px solid #ccc; border-radius: 5px;\">
</iframe>
```

For enhanced customization, use the Web Chat SDK:

```html
<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>ACS Help Desk Bot</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        #webchat { width: 100%; height: 100vh; }
    </style>
</head>
<body>
    <div id=\"webchat\"></div>
    
    <script src=\"https://cdn.botframework.com/botframework-webchat/latest/webchat.js\"></script>
    <script>
        (async function() {
            // Fetch the token
            const response = await fetch('https://your-token-service.azurewebsites.net/api/token', {
                method: 'GET'
            });
            
            const { token } = await response.json();
            
            // Render the Web Chat
            window.WebChat.renderWebChat({
                directLine: window.WebChat.createDirectLine({ token }),
                styleOptions: {
                    botAvatarImage: 'https://intranet.acs.com/images/helpdesk-bot-avatar.png',
                    botAvatarInitials: 'HD',
                    userAvatarImage: 'https://intranet.acs.com/images/default-user-avatar.png',
                    userAvatarInitials: 'U',
                    bubbleBackground: '#F2F2F2',
                    bubbleBorderRadius: 10,
                    bubbleFromUserBackground: '#007AFF',
                    bubbleFromUserBorderRadius: 10,
                    bubbleFromUserTextColor: 'white',
                    bubbleTextColor: 'black',
                    sendBoxBackground: '#F2F2F2',
                    sendBoxButtonColor: '#007AFF',
                    sendBoxTextColor: 'black',
                    backgroundColor: 'white'
                },
                store: window.WebChat.createStore({}, ({ dispatch }) => next => action => {
                    // Custom middleware can be added here
                    return next(action);
                })
            }, document.getElementById('webchat'));
        })();
    </script>
</body>
</html>
```

## User Authentication Setup

### Azure AD Authentication

1. Register an application in Azure AD:
   - Name: `ACS Help Desk Bot`
   - Supported account types: `Accounts in this organizational directory only`
   - Redirect URI: `https://your-bot-service.azurewebsites.net/api/auth/callback`

2. Configure API permissions:
   - Microsoft Graph: `User.Read`, `User.ReadBasic.All`
   - ACS Help Desk API (if applicable): `user_impersonation`

3. Create a client secret and note the value

4. Implement the authentication in the bot:

```csharp
// BotAuthenticationDialog.cs
public class BotAuthenticationDialog : ComponentDialog
{
    private readonly IConfiguration _configuration;
    private readonly IStatePropertyAccessor<UserProfile> _userProfileAccessor;
    
    public BotAuthenticationDialog(
        IConfiguration configuration,
        UserState userState)
        : base(nameof(BotAuthenticationDialog))
    {
        _configuration = configuration;
        _userProfileAccessor = userState.CreateProperty<UserProfile>(\"UserProfile\");
        
        // Add dialogs
        AddDialog(new OAuthPrompt(
            nameof(OAuthPrompt),
            new OAuthPromptSettings
            {
                ConnectionName = \"AzureAD\",
                Text = \"Please sign in to access the help desk system\",
                Title = \"Sign In\",
                Timeout = 300000, // 5 minutes
            }));
        
        AddDialog(new WaterfallDialog(
            nameof(WaterfallDialog),
            new WaterfallStep[]
            {
                PromptStepAsync,
                ProcessTokenStepAsync,
                FinalStepAsync
            }));
        
        InitialDialogId = nameof(WaterfallDialog);
    }
    
    private async Task<DialogTurnResult> PromptStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        return await stepContext.BeginDialogAsync(nameof(OAuthPrompt), null, cancellationToken);
    }
    
    private async Task<DialogTurnResult> ProcessTokenStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        var tokenResponse = (TokenResponse)stepContext.Result;
        if (tokenResponse?.Token != null)
        {
            // Retrieve user information from token
            var userProfile = await GetUserProfileAsync(tokenResponse.Token, cancellationToken);
            
            // Save user information
            await _userProfileAccessor.SetAsync(stepContext.Context, userProfile, cancellationToken);
            
            // Return success
            return await stepContext.NextAsync(true, cancellationToken);
        }
        else
        {
            // Return failure
            return await stepContext.NextAsync(false, cancellationToken);
        }
    }
    
    private async Task<DialogTurnResult> FinalStepAsync(WaterfallStepContext stepContext, CancellationToken cancellationToken)
    {
        if ((bool)stepContext.Result)
        {
            var userProfile = await _userProfileAccessor.GetAsync(stepContext.Context, () => null, cancellationToken);
            await stepContext.Context.SendActivityAsync($\"Welcome, {userProfile.Name}! You are now authenticated.\", cancellationToken: cancellationToken);
        }
        else
        {
            await stepContext.Context.SendActivityAsync(\"Authentication failed. Please try again later.\", cancellationToken: cancellationToken);
        }
        
        return await stepContext.EndDialogAsync(stepContext.Result, cancellationToken);
    }
    
    private async Task<UserProfile> GetUserProfileAsync(string token, CancellationToken cancellationToken)
    {
        // Use the token to call Microsoft Graph API
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(\"Bearer\", token);
        
        var response = await client.GetAsync(\"https://graph.microsoft.com/v1.0/me\", cancellationToken);
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        var graphUser = JsonConvert.DeserializeObject<GraphUser>(content);
        
        return new UserProfile
        {
            Id = graphUser.Id,
            Name = graphUser.DisplayName,
            Email = graphUser.UserPrincipalName,
            // Additional properties as needed
        };
    }
}
```

### Bot Authentication Configuration

Add the following to `appsettings.json`:

```json
{
  \"BotAuthenticationSettings\": {
    \"RequireAuthentication\": true,
    \"AllowedTenants\": [\"your-tenant-id\"],
    \"ExcludedCommands\": [\"help\", \"about\"],
    \"SignInRetryPrompt\": \"You need to sign in to use this feature. Please sign in.\",
    \"SignInSuccessMessage\": \"You have successfully signed in. How can I help you today?\",
    \"SignInFailureMessage\": \"Sign in failed. Please try again later or contact support.\",
    \"TokenExpirationBuffer\": 300,
    \"AutoSignInUsers\": [\"admin@acs.com\", \"support@acs.com\"]
  }
}
```

## Middleware Components

### Logging Middleware

Create a logging middleware to track conversation events:

```csharp
// LoggingMiddleware.cs
public class LoggingMiddleware : IMiddleware
{
    private readonly ILogger<LoggingMiddleware> _logger;
    private readonly TelemetryClient _telemetryClient;
    
    public LoggingMiddleware(ILogger<LoggingMiddleware> logger, TelemetryClient telemetryClient)
    {
        _logger = logger;
        _telemetryClient = telemetryClient;
    }
    
    public async Task OnTurnAsync(ITurnContext turnContext, NextDelegate next, CancellationToken cancellationToken = default)
    {
        // Log incoming activity
        _logger.LogInformation(\"Received activity: {ActivityType} from user: {UserId}\", turnContext.Activity.Type, turnContext.Activity.From.Id);
        
        // Track custom event
        var properties = new Dictionary<string, string>
        {
            { \"ActivityType\", turnContext.Activity.Type },
            { \"UserId\", turnContext.Activity.From.Id },
            { \"ChannelId\", turnContext.Activity.ChannelId },
            { \"ConversationId\", turnContext.Activity.Conversation.Id }
        };
        
        if (turnContext.Activity.Type == ActivityTypes.Message)
        {
            properties.Add(\"UserText\", turnContext.Activity.Text);
        }
        
        _telemetryClient.TrackEvent(\"BotActivity\", properties);
        
        // Call next middleware
        await next(cancellationToken);
    }
}
```

### Error Handling Middleware

Create an error handling middleware:

```csharp
// ErrorHandlingMiddleware.cs
public class ErrorHandlingMiddleware : IMiddleware
{
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly TelemetryClient _telemetryClient;
    
    public ErrorHandlingMiddleware(ILogger<ErrorHandlingMiddleware> logger, TelemetryClient telemetryClient)
    {
        _logger = logger;
        _telemetryClient = telemetryClient;
    }
    
    public async Task OnTurnAsync(ITurnContext turnContext, NextDelegate next, CancellationToken cancellationToken = default)
    {
        try
        {
            // Call next middleware
            await next(cancellationToken);
        }
        catch (Exception ex)
        {
            // Log the exception
            _logger.LogError(ex, \"Error in bot middleware: {Message}\", ex.Message);
            
            // Track exception
            _telemetryClient.TrackException(ex, new Dictionary<string, string>
            {
                { \"UserId\", turnContext.Activity.From.Id },
                { \"ChannelId\", turnContext.Activity.ChannelId },
                { \"ConversationId\", turnContext.Activity.Conversation.Id },
                { \"ActivityType\", turnContext.Activity.Type },
                { \"ActivityId\", turnContext.Activity.Id }
            });
            
            // Send error message to user
            await turnContext.SendActivityAsync(
                \"I'm sorry, something went wrong. Our team has been notified of the issue. Please try again later or contact support if the problem persists.\",
                cancellationToken: cancellationToken);
        }
    }
}
```

### Translation Middleware

Create a translation middleware for multi-language support:

```csharp
// TranslationMiddleware.cs
public class TranslationMiddleware : IMiddleware
{
    private readonly ILogger<TranslationMiddleware> _logger;
    private readonly ITranslator _translator;
    private readonly IStatePropertyAccessor<UserProfile> _userProfileAccessor;
    
    public TranslationMiddleware(
        ILogger<TranslationMiddleware> logger,
        ITranslator translator,
        UserState userState)
    {
        _logger = logger;
        _translator = translator;
        _userProfileAccessor = userState.CreateProperty<UserProfile>(\"UserProfile\");
    }
    
    public async Task OnTurnAsync(ITurnContext turnContext, NextDelegate next, CancellationToken cancellationToken = default)
    {
        if (turnContext.Activity.Type == ActivityTypes.Message)
        {
            // Get user's preferred language
            var userProfile = await _userProfileAccessor.GetAsync(turnContext, () => new UserProfile { PreferredLanguage = \"en-US\" }, cancellationToken);
            
            // Detect language
            var detectedLanguage = await _translator.DetectLanguageAsync(turnContext.Activity.Text, cancellationToken);
            
            // If user's preferred language is not the same as detected language, translate
            if (!string.IsNullOrEmpty(detectedLanguage) && detectedLanguage != \"en-US\" && userProfile.PreferredLanguage == \"en-US\")
            {
                try
                {
                    // Translate to English for processing
                    var translatedText = await _translator.TranslateAsync(turnContext.Activity.Text, detectedLanguage, \"en-US\", cancellationToken);
                    
                    // Store original text and language
                    turnContext.TurnState.Add(\"OriginalText\", turnContext.Activity.Text);
                    turnContext.TurnState.Add(\"OriginalLanguage\", detectedLanguage);
                    
                    // Replace with translated text
                    turnContext.Activity.Text = translatedText;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, \"Error translating text: {Message}\", ex.Message);
                }
            }
        }
        
        // Save original responses to translate later
        var responses = new List<Activity>();
        turnContext.OnSendActivities(async (sendContext, activities, nextSend) =>
        {
            responses.AddRange(activities);
            return await nextSend();
        });
        
        // Call next middleware
        await next(cancellationToken);
        
        // Translate outgoing messages if needed
        if (turnContext.Activity.Type == ActivityTypes.Message &&
            turnContext.TurnState.ContainsKey(\"OriginalLanguage\"))
        {
            var originalLanguage = turnContext.TurnState.Get<string>(\"OriginalLanguage\");
            
            foreach (var response in responses)
            {
                if (response.Type == ActivityTypes.Message && !string.IsNullOrEmpty(response.Text))
                {
                    try
                    {
                        // Translate back to user's language
                        response.Text = await _translator.TranslateAsync(response.Text, \"en-US\", originalLanguage, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, \"Error translating response: {Message}\", ex.Message);
                    }
                }
            }
        }
    }
}
```

## Logging and Monitoring

### Application Insights Integration

Configure Application Insights integration:

1. Update `Startup.cs`:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    // Existing code...
    
    // Add Application Insights
    services.AddApplicationInsightsTelemetry(Configuration[\"ApplicationInsights:InstrumentationKey\"]);
    
    // Add TelemetryClient
    services.AddSingleton<TelemetryClient>();
    
    // Add TelemetryInitializer
    services.AddSingleton<ITelemetryInitializer, BotTelemetryInitializer>();
    
    // Add TelemetryLogger
    services.AddSingleton<IBotTelemetryClient, BotTelemetryClient>();
}
```

2. Create a custom telemetry initializer:

```csharp
// BotTelemetryInitializer.cs
public class BotTelemetryInitializer : ITelemetryInitializer
{
    public void Initialize(ITelemetry telemetry)
    {
        telemetry.Context.Cloud.RoleName = \"ACS Help Desk Bot\";
        telemetry.Context.Component.Version = \"1.0.0\";
        
        if (telemetry is RequestTelemetry requestTelemetry)
        {
            // Add custom properties
            requestTelemetry.Properties[\"BotEnvironment\"] = Environment.GetEnvironmentVariable(\"ASPNETCORE_ENVIRONMENT\") ?? \"Production\";
        }
    }
}
```

3. Create a custom telemetry logger:

```csharp
// BotTelemetryClient.cs
public class BotTelemetryClient : IBotTelemetryClient
{
    private readonly TelemetryClient _telemetryClient;
    
    public BotTelemetryClient(TelemetryClient telemetryClient)
    {
        _telemetryClient = telemetryClient;
    }
    
    public void TrackEvent(string eventName, IDictionary<string, string> properties = null, IDictionary<string, double> metrics = null)
    {
        _telemetryClient.TrackEvent(eventName, properties, metrics);
    }
    
    public void TrackException(Exception exception, IDictionary<string, string> properties = null, IDictionary<string, double> metrics = null)
    {
        _telemetryClient.TrackException(exception, properties, metrics);
    }
    
    public void TrackTrace(string message, Severity severityLevel, IDictionary<string, string> properties = null)
    {
        _telemetryClient.TrackTrace(message, (SeverityLevel)severityLevel, properties);
    }
    
    public void TrackDependency(string dependencyTypeName, string target, string dependencyName, string data, DateTime startTime, TimeSpan duration, string resultCode, bool success)
    {
        _telemetryClient.TrackDependency(dependencyTypeName, target, dependencyName, data, startTime, duration, resultCode, success);
    }
    
    public void Flush()
    {
        _telemetryClient.Flush();
    }
}
```

### Monitoring Dashboard

Create a monitoring dashboard in Application Insights:

1. Navigate to Azure Portal and open your Application Insights resource
2. Create a new dashboard with the following tiles:
   - Bot Activity Count by Channel
   - Active Users
   - Average Response Time
   - Error Count
   - User Satisfaction (based on feedback)
   - Intent Distribution
   - Top Queries

Example dashboard JSON:

```json
{
  \"properties\": {
    \"lenses\": {
      \"0\": {
        \"order\": 0,
        \"parts\": {
          \"0\": {
            \"position\": {
              \"x\": 0,
              \"y\": 0,
              \"colSpan\": 6,
              \"rowSpan\": 4
            },
            \"metadata\": {
              \"inputs\": [
                {
                  \"name\": \"ComponentId\",
                  \"value\": \"/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.Insights/components/{app-insights-name}\"
                },
                {
                  \"name\": \"TimeContext\",
                  \"value\": {
                    \"durationMs\": 86400000,
                    \"endTime\": null,
                    \"createdTime\": \"2023-01-01T00:00:00.000Z\",
                    \"isInitialTime\": true,
                    \"grain\": 1,
                    \"useDashboardTimeRange\": false
                  }
                },
                {
                  \"name\": \"Query\",
                  \"value\": \"customEvents\
| where name == \\\"BotActivity\\\"\
| summarize count() by tostring(customDimensions.ChannelId), bin(timestamp, 1h)\
| render timechart\"
                }
              ],
              \"type\": \"Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart\",
              \"settings\": {
                \"content\": {
                  \"PartTitle\": \"Bot Activity by Channel\",
                  \"PartSubTitle\": \"Last 24 hours\"
                }
              }
            }
          },
          // Additional dashboard tiles...
        }
      }
    }
  }
}
```

### Alerts Configuration

Configure alerts for critical issues:

1. Navigate to Azure Portal and open your Application Insights resource
2. Go to Alerts and create the following alert rules:

#### High Error Rate Alert

- Name: `High Error Rate`
- Description: `Alert when the bot's error rate exceeds threshold`
- Severity: `2 - Warning`
- Resource: `Your Application Insights resource`
- Condition: 
  - Signal type: `Log search`
  - Search query: `exceptions | where timestamp > ago(5m) | count`
  - Threshold: `10`
  - Frequency: `5 minutes`
  - Period: `Over the last 5 minutes`
- Action Group: `IT Support Team`

#### Bot Availability Alert

- Name: `Bot Availability`
- Description: `Alert when the bot is unavailable`
- Severity: `1 - Critical`
- Resource: `Your Application Insights resource`
- Condition:
  - Signal type: `Web test`
  - Test name: `Bot Availability Test`
  - Failed locations: `>=3`
  - Frequency: `5 minutes`
- Action Group: `IT Support Team`

## Testing and Validation

### Unit Testing

Set up unit tests for the bot's components:

```csharp
// HelpDeskBotTests.cs
[TestClass]
public class HelpDeskBotTests
{
    private TestAdapter _testAdapter;
    private IMiddleware[] _middlewares;
    private Mock<ILogger<HelpDeskBot>> _mockLogger;
    private Mock<BotSettings> _mockSettings;
    private Mock<IBotServices> _mockServices;
    private ConversationState _conversationState;
    private UserState _userState;
    
    [TestInitialize]
    public void TestInitialize()
    {
        _mockLogger = new Mock<ILogger<HelpDeskBot>>();
        _mockSettings = new Mock<BotSettings>();
        _mockServices = new Mock<IBotServices>();
        
        var storage = new MemoryStorage();
        _conversationState = new ConversationState(storage);
        _userState = new UserState(storage);
        
        _middlewares = new IMiddleware[]
        {
            new RegisterClassMiddleware<IStatePropertyAccessor<ConversationData>>(
                _conversationState.CreateProperty<ConversationData>(\"ConversationData\")),
            new RegisterClassMiddleware<IStatePropertyAccessor<UserProfile>>(
                _userState.CreateProperty<UserProfile>(\"UserProfile\"))
        };
        
        _testAdapter = new TestAdapter()
            .UseStorage(storage)
            .UseBotState(_conversationState, _userState);
        
        foreach (var middleware in _middlewares)
        {
            _testAdapter.Use(middleware);
        }
    }
    
    [TestMethod]
    public async Task Bot_Welcome_Message_Test()
    {
        // Arrange
        var welcomeMessage = \"Hello! I'm the ACS Help Desk Bot. How can I help you today?\";
        _mockSettings.Setup(s => s.WelcomeMessage).Returns(welcomeMessage);
        
        var dialog = new MainDialog(
            _mockSettings.Object,
            _mockServices.Object,
            _userState,
            _conversationState,
            _mockLogger.Object);
        
        var bot = new HelpDeskBot(
            _conversationState,
            _userState,
            dialog,
            _mockSettings.Object,
            _mockLogger.Object);
        
        // Act & Assert
        await _testAdapter.Test(\"Hi\", (turnContext, cancellationToken) =>
            bot.OnTurnAsync(turnContext, cancellationToken))
            .AssertReply(reply => Assert.AreEqual(welcomeMessage, reply.Text));
    }
    
    [TestMethod]
    public async Task Bot_Creates_Ticket_Test()
    {
        // Arrange
        var dialog = new MainDialog(
            _mockSettings.Object,
            _mockServices.Object,
            _userState,
            _conversationState,
            _mockLogger.Object);
        
        var bot = new HelpDeskBot(
            _conversationState,
            _userState,
            dialog,
            _mockSettings.Object,
            _mockLogger.Object);
        
        // Mock LUIS result
        _mockServices.Setup(s => s.LuisService.RecognizeAsync<HelpDeskIntent>(
            It.IsAny<ITurnContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RecognizerResult
            {
                Intents = new Dictionary<string, IntentScore>
                {
                    { \"CreateTicket\", new IntentScore { Score = 0.95 } }
                },
                Entities = new Dictionary<string, object>()
            });
        
        // Act & Assert
        await _testAdapter.Test(\"I need to create a ticket for my broken laptop\", async (turnContext, cancellationToken) =>
            {
                await bot.OnTurnAsync(turnContext, cancellationToken);
            })
            .AssertReply(\"I'll help you create a ticket. What's the issue you're experiencing?\")
            .Send(\"My laptop won't turn on\")
            .AssertReply(\"What's the priority of this issue? (High, Medium, Low)\")
            .Send(\"High\")
            .AssertReplyContains(\"I've created ticket\");
    }
    
    // Additional test methods...
}
```

### Integration Testing

Set up integration tests with external services:

```csharp
// IntegrationTests.cs
[TestClass]
public class IntegrationTests
{
    private IConfiguration _configuration;
    private BotServices _botServices;
    private ILogger<IntegrationTests> _logger;
    
    [TestInitialize]
    public void TestInitialize()
    {
        // Load configuration from test settings
        _configuration = new ConfigurationBuilder()
            .AddJsonFile(\"testsettings.json\")
            .AddEnvironmentVariables()
            .Build();
        
        // Set up logger
        var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder.AddConsole();
            builder.AddDebug();
        });
        
        _logger = loggerFactory.CreateLogger<IntegrationTests>();
        
        // Initialize bot services
        _botServices = new BotServices(_configuration);
    }
    
    [TestMethod]
    public async Task LUIS_Recognition_Test()
    {
        // Arrange
        var luisService = _botServices.LuisService;
        var testUtterance = \"I need to reset my password\";
        var turnContext = GetMockTurnContext(testUtterance);
        
        // Act
        var result = await luisService.RecognizeAsync<HelpDeskIntent>(turnContext, CancellationToken.None);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.IsTrue(result.Intents.ContainsKey(\"PasswordReset\"));
        Assert.IsTrue(result.Intents[\"PasswordReset\"].Score > 0.8);
    }
    
    [TestMethod]
    public async Task QnA_Maker_Test()
    {
        // Arrange
        var qnaService = _botServices.QnAMakerService;
        var testQuery = \"How do I connect to the VPN?\";
        var turnContext = GetMockTurnContext(testQuery);
        
        // Act
        var result = await qnaService.GetAnswersAsync(turnContext, null, CancellationToken.None);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.IsTrue(result.Length > 0);
        Assert.IsFalse(string.IsNullOrEmpty(result[0].Answer));
        Assert.IsTrue(result[0].Score > 0.7);
    }
    
    [TestMethod]
    public async Task Ticket_System_Integration_Test()
    {
        // Arrange
        var ticketService = new TicketService(_configuration);
        var newTicket = new Ticket
        {
            Title = \"Test Ticket\",
            Description = \"This is a test ticket created by integration tests\",
            Priority = \"Medium\",
            Category = \"IT Support\",
            CreatedBy = \"test@acs.com\"
        };
        
        // Act
        var result = await ticketService.CreateTicketAsync(newTicket, CancellationToken.None);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.IsFalse(string.IsNullOrEmpty(result.TicketId));
        
        // Cleanup
        await ticketService.DeleteTicketAsync(result.TicketId, CancellationToken.None);
    }
    
    private ITurnContext GetMockTurnContext(string text)
    {
        var activity = new Activity
        {
            Type = ActivityTypes.Message,
            Text = text,
            From = new ChannelAccount { Id = \"test-user\" },
            Recipient = new ChannelAccount { Id = \"test-bot\" },
            Conversation = new ConversationAccount { Id = \"test-conversation\" }
        };
        
        var mockAdapter = new Mock<BotAdapter>();
        var mockTurnContext = new TurnContext(mockAdapter.Object, activity);
        
        return mockTurnContext;
    }
}
```

### End-to-End Testing

Use the Bot Framework Emulator for end-to-end testing:

1. Launch the Bot Framework Emulator
2. Connect to your local bot endpoint: `http://localhost:3978/api/messages`
3. Test the following scenarios:

#### Test Script 1: Greeting and Help

```
User: Hello
Bot: Hello! I'm the ACS Help Desk Bot. How can I help you today?
User: What can you do?
Bot: [Shows capabilities menu]
```

#### Test Script 2: Create Ticket

```
User: I need to report an issue
Bot: I'll help you create a ticket. What's the issue you're experiencing?
User: My email is not working
Bot: What's the priority of this issue? (High, Medium, Low)
User: Medium
Bot: Thank you. I've created ticket #TKT-12345 for \"Email not working\" with Medium priority. Is there anything else you'd like to add to this ticket?
User: No
Bot: Great! Your ticket has been submitted. You can check the status of your ticket at any time by saying \"check ticket status\" or \"ticket status #TKT-12345\".
```

#### Test Script 3: Check Ticket Status

```
User: What's the status of my ticket?
Bot: Which ticket would you like to check? Please provide the ticket number or say \"my tickets\" to see all your tickets.
User: my tickets
Bot: [Shows list of tickets]
User: TKT-12345
Bot: Ticket #TKT-12345 \"Email not working\" is currently \"In Progress\". It was assigned to John Smith on May 15, 2025. The last update was: \"Technician is investigating the issue.\"
```

#### Test Script 4: Knowledge Base Query

```
User: How do I reset my password?
Bot: [Provides password reset instructions from knowledge base]
```

#### Test Script 5: Authentication

```
User: I need to access my personal information
Bot: You'll need to sign in to access that information. [Shows sign-in card]
[User completes sign-in]
Bot: Thanks for signing in, [User Name]! You are now authenticated.
```

## Production Deployment

### Deployment Automation

Set up a CI/CD pipeline in Azure DevOps:

1. Create an `azure-pipelines.yml` file:

```yaml
trigger:
- main

pool:
  vmImage: 'windows-latest'

variables:
  solution: '**/*.sln'
  buildPlatform: 'Any CPU'
  buildConfiguration: 'Release'
  azureSubscription: 'Your-Azure-Service-Connection'
  resourceGroup: 'your-resource-group'
  botServiceName: 'your-bot-service-name'
  appServiceName: 'your-app-service-name'

stages:
- stage: Build
  jobs:
  - job: Build
    steps:
    - task: NuGetToolInstaller@1
    
    - task: NuGetCommand@2
      inputs:
        restoreSolution: '$(solution)'
    
    - task: VSBuild@1
      inputs:
        solution: '$(solution)'
        msbuildArgs: '/p:DeployOnBuild=true /p:WebPublishMethod=Package /p:PackageAsSingleFile=true /p:SkipInvalidConfigurations=true /p:PackageLocation=\"$(build.artifactStagingDirectory)\"'
        platform: '$(buildPlatform)'
        configuration: '$(buildConfiguration)'
    
    - task: VSTest@2
      inputs:
        platform: '$(buildPlatform)'
        configuration: '$(buildConfiguration)'
        testSelector: 'testAssemblies'
        testAssemblyVer2: |
          **\\*Tests.dll
          !**\\obj\\**
        runSettingsFile: 'test.runsettings'
        codeCoverageEnabled: true
    
    - task: PublishBuildArtifacts@1
      inputs:
        PathtoPublish: '$(Build.ArtifactStagingDirectory)'
        ArtifactName: 'drop'
        publishLocation: 'Container'

- stage: DeployDev
  dependsOn: Build
  jobs:
  - deployment: DeployDev
    environment: 'Development'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureRmWebAppDeployment@4
            inputs:
              ConnectionType: 'AzureRM'
              azureSubscription: '$(azureSubscription)'
              appType: 'webApp'
              WebAppName: '$(appServiceName)-dev'
              packageForLinux: '$(Pipeline.Workspace)/drop/*.zip'
              enableCustomDeployment: true
              DeploymentType: 'zipDeploy'
              TakeAppOfflineFlag: true
              
          - task: AzureAppServiceSettings@1
            inputs:
              azureSubscription: '$(azureSubscription)'
              appName: '$(appServiceName)-dev'
              resourceGroupName: '$(resourceGroup)'
              appSettings: |
                [
                  {
                    \"name\": \"ASPNETCORE_ENVIRONMENT\",
                    \"value\": \"Development\",
                    \"slotSetting\": true
                  }
                ]

- stage: DeployProd
  dependsOn: DeployDev
  jobs:
  - deployment: DeployProd
    environment: 'Production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureRmWebAppDeployment@4
            inputs:
              ConnectionType: 'AzureRM'
              azureSubscription: '$(azureSubscription)'
              appType: 'webApp'
              WebAppName: '$(appServiceName)'
              packageForLinux: '$(Pipeline.Workspace)/drop/*.zip'
              enableCustomDeployment: true
              DeploymentType: 'zipDeploy'
              TakeAppOfflineFlag: true
              
          - task: AzureAppServiceSettings@1
            inputs:
              azureSubscription: '$(azureSubscription)'
              appName: '$(appServiceName)'
              resourceGroupName: '$(resourceGroup)'
              appSettings: |
                [
                  {
                    \"name\": \"ASPNETCORE_ENVIRONMENT\",
                    \"value\": \"Production\",
                    \"slotSetting\": true
                  }
                ]
```

### Deployment Slots

Configure deployment slots for zero-downtime deployments:

1. Create staging and production slots in your App Service
2. Configure slot-specific settings
3. Set up auto-swap for deployments

Example ARM template for deployment slots:

```json
{
  \"$schema\": \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\",
  \"contentVersion\": \"1.0.0.0\",
  \"parameters\": {
    \"appServiceName\": {
      \"type\": \"string\",
      \"metadata\": {
        \"description\": \"Name of the App Service\"
      }
    },
    \"location\": {
      \"type\": \"string\",
      \"defaultValue\": \"[resourceGroup().location]\",
      \"metadata\": {
        \"description\": \"Location for resources\"
      }
    }
  },
  \"resources\": [
    {
      \"type\": \"Microsoft.Web/sites/slots\",
      \"apiVersion\": \"2021-02-01\",
      \"name\": \"[concat(parameters('appServiceName'), '/staging')]\",
      \"location\": \"[parameters('location')]\",
      \"properties\": {
        \"siteConfig\": {
          \"app`
}



Continue from where you left off in the file

\"resources\": [
    {
      \"type\": \"Microsoft.Web/sites/slots\",
      \"apiVServiceSettings": {
            "alwaysOn": true,
            "http20Enabled": true
          },
          "appSettings": [
            {
              "name": "ASPNETCORE_ENVIRONMENT",
              "value": "Staging"
            },
            {
              "name": "DeploymentSlot",
              "value": "Staging"
            }
          ]
        }
      }
    },
    {
      "type": "Microsoft.Web/sites/slots",
      "apiVersion": "2021-02-01",
      "name": "[concat(parameters('appServiceName'), '/dev')]",
      "location": "[parameters('location')]",
      "properties": {
        "siteConfig": {
          "appServiceSettings": {
            "alwaysOn": true,
            "http20Enabled": true
          },
          "appSettings": [
            {
              "name": "ASPNETCORE_ENVIRONMENT",
              "value": "Development"
            },
            {
              "name": "DeploymentSlot",
              "value": "Development"
            }
          ]
        }
      }
    }
  ]
}
```

### Environment-Specific Configurations

Create environment-specific configuration files:

#### appsettings.Development.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "System": "Information",
      "Microsoft": "Information"
    }
  },
  "AllowedHosts": "*",
  "BotSettings": {
    "EnableDebugging": true,
    "VerboseLogging": true,
    "MockServices": true,
    "MockTicketSystem": true
  }
}
```

#### appsettings.Staging.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "System": "Information",
      "Microsoft": "Warning"
    }
  },
  "AllowedHosts": "*",
  "BotSettings": {
    "EnableDebugging": true,
    "VerboseLogging": true,
    "MockServices": false,
    "MockTicketSystem": false
  }
}
```

#### appsettings.Production.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "System": "Warning",
      "Microsoft": "Warning"
    }
  },
  "AllowedHosts": "*",
  "BotSettings": {
    "EnableDebugging": false,
    "VerboseLogging": false,
    "MockServices": false,
    "MockTicketSystem": false
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Bot Not Responding

**Symptoms**:
- Bot does not respond to messages
- Timeout errors in logs

**Possible Causes**:
- Network connectivity issues
- App Service resource constraints
- Bot service outages

**Solutions**:
1. Check Azure Bot Service status in Azure Portal
2. Verify App Service is running and healthy
3. Check network connectivity between components
4. Ensure service endpoints are accessible
5. Check resource utilization (CPU, memory)
6. Review application logs for errors

**Diagnostic Commands**:
```powershell
# Check App Service health
az webapp show --name $appServiceName --resource-group $resourceGroup

# Check App Service metrics
az monitor metrics list --resource $appServiceId --metric "CpuPercentage" "MemoryPercentage" --interval 5m

# Check application logs
az webapp log tail --name $appServiceName --resource-group $resourceGroup
```

#### Issue 2: Authentication Failures

**Symptoms**:
- Users cannot sign in
- Authentication errors in logs

**Possible Causes**:
- Expired client secrets
- Misconfigured redirect URIs
- Azure AD permissions issues

**Solutions**:
1. Verify client ID and client secret are correct and not expired
2. Check redirect URI configuration in Azure AD
3. Ensure required permissions are granted
4. Verify tenant ID configuration
5. Check for CORS issues

**Diagnostic Steps**:
1. Review authentication settings in Azure AD
2. Check client secret expiration date
3. Verify redirect URI matches the bot's callback URL
4. Ensure required API permissions are granted
5. Test authentication with a simple test client

#### Issue 3: LUIS Understanding Issues

**Symptoms**:
- Bot misunderstands user intents
- Low confidence scores for intents

**Possible Causes**:
- Insufficient training data
- Outdated LUIS model
- Incorrect utterance patterns

**Solutions**:
1. Add more training examples to LUIS model
2. Retrain and republish the LUIS model
3. Review and improve utterance patterns
4. Add phrase lists for domain-specific terms
5. Use patterns for complex utterances

**Diagnostic Steps**:
1. Check LUIS app performance in LUIS portal
2. Review intent prediction scores in logs
3. Analyze misunderstood utterances
4. Test utterances directly in LUIS portal

### Diagnostic Tools

#### 1. Application Insights Analytics

Use Application Insights Analytics to query telemetry data:

```kusto
// Check for exceptions
exceptions
| where timestamp > ago(24h)
| order by timestamp desc

// Check for failed requests
requests
| where timestamp > ago(24h)
| where success == false
| order by timestamp desc

// Check for slow responses
requests
| where timestamp > ago(24h)
| where duration > 5000
| order by duration desc

// Check for LUIS intent recognition
customEvents
| where name == "LuisIntent"
| where timestamp > ago(24h)
| project timestamp, itemId, operation_ParentId, customDimensions
| order by timestamp desc

// Check bot activity distribution
customEvents
| where name == "BotActivity"
| where timestamp > ago(24h)
| summarize count() by tostring(customDimensions.ActivityType), bin(timestamp, 1h)
| render timechart
```

#### 2. Bot Framework Emulator

Use the Bot Framework Emulator to test the bot locally:

1. Download and install the [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator/releases)
2. Launch the emulator
3. Connect to your bot endpoint
4. Use these debug features:
   - Inspect message payloads
   - View middleware execution
   - Test authentication flows
   - Simulate different channels

#### 3. Azure CLI Commands

Use Azure CLI to check service health:

```bash
# Check bot service
az bot show --name $botName --resource-group $resourceGroup

# Check App Service
az webapp show --name $appServiceName --resource-group $resourceGroup

# Check App Service logs
az webapp log tail --name $appServiceName --resource-group $resourceGroup

# Check cognitive services
az cognitiveservices account show --name $luisName --resource-group $resourceGroup

# Check SQL database
az sql db show --name $dbName --server $sqlServer --resource-group $resourceGroup
```

### Escalation Procedures

When facing critical issues that cannot be resolved through standard troubleshooting:

1. **Tier 1: Internal Support Team**
   - Team Lead: [Name], contact: [Email/Phone]
   - Escalation Time: After 30 minutes of unresolved issues
   - Required Information:
     - Error logs (last 1 hour)
     - Resource metrics (CPU, memory, network)
     - Steps to reproduce

2. **Tier 2: Azure Support**
   - Support Plan: [Standard/Professional Direct/Premier]
   - Create support ticket via Azure Portal
   - Severity: A for critical production issues, B for non-critical
   - Required Information:
     - Subscription ID
     - Resource IDs
     - Error details and logs
     - Timeline of the issue
     - Impact assessment

3. **Tier 3: Microsoft Bot Framework Support**
   - Contact: [Email/Support Portal]
   - Escalation Time: After 4 hours of unresolved Tier 2 support
   - Required Information:
     - Bot ID
     - Channel information
     - Conversation IDs affected
     - Error details and logs
     - Steps to reproduce

## Maintenance and Updates

### Regular Maintenance Tasks

#### Daily Tasks

- Review error logs and alerts
- Check bot performance metrics
- Verify all channels are operational
- Test critical bot functions

#### Weekly Tasks

- Review usage patterns and popular intents
- Update QnA knowledge base with new content
- Test end-to-end scenarios
- Backup configuration and databases

#### Monthly Tasks

- Review and update LUIS model with new utterances
- Apply security patches and updates
- Review and optimize performance
- Update documentation with changes

#### Quarterly Tasks

- Perform load testing
- Review and update security configurations
- Perform disaster recovery tests
- Review and update business logic for changing requirements

### Update Procedures

#### Minor Updates (No Downtime)

For configuration changes or small code updates:

1. Make changes in development environment
2. Test thoroughly
3. Deploy to staging slot
4. Perform validation tests in staging
5. Swap staging and production slots

```powershell
# Deploy to staging slot
az webapp deployment source config-zip --resource-group $resourceGroup --name $appServiceName --slot staging --src $packagePath

# Test in staging
# Run validation tests...

# Swap slots
az webapp deployment slot swap --resource-group $resourceGroup --name $appServiceName --slot staging --target-slot production
```

#### Major Updates (Planned Downtime)

For significant changes requiring downtime:

1. Schedule maintenance window
2. Notify users in advance
3. Create detailed rollback plan
4. Perform database backups
5. Deploy to staging environment
6. Perform extensive testing
7. Deploy to production during maintenance window
8. Verify functionality after deployment

```powershell
# Backup database
az sql db export --admin-password $password --admin-user $username --server $sqlServer --name $dbName --storage-key $storageKey --storage-key-type StorageAccessKey --storage-uri $storageUri

# Deploy to staging
az webapp deployment source config-zip --resource-group $resourceGroup --name $appServiceName --slot staging --src $packagePath

# Extensive testing in staging
# Run validation tests...

# Deploy to production
az webapp deployment source config-zip --resource-group $resourceGroup --name $appServiceName --src $packagePath

# Verify production
# Run smoke tests...
```

### LUIS and QnA Updates

#### LUIS Model Updates

1. Access the LUIS portal at [luis.ai](https://www.luis.ai)
2. Select your LUIS application
3. Add new intents or utterances based on user interactions
4. Improve entity recognition
5. Train the model
6. Test with sample utterances
7. Publish to production slot

Batch update via API:

```csharp
// LuisUpdater.cs
public async Task AddUtterancesAsync(List<ExampleUtterance> utterances)
{
    var luisClient = new LUISAuthoringClient(
        new ApiKeyServiceClientCredentials(_configuration["LuisAuthoringKey"]))
    {
        Endpoint = _configuration["LuisEndpoint"]
    };
    
    var appId = _configuration["LuisAppId"];
    var version = _configuration["LuisVersion"];
    
    // Add utterances in batches of 100
    for (int i = 0; i < utterances.Count; i += 100)
    {
        var batch = utterances.Skip(i).Take(100).ToList();
        await luisClient.Examples.BatchAddAsync(appId, version, batch);
    }
    
    // Train the model
    await luisClient.Train.TrainVersionAsync(appId, version);
    
    // Wait for training to complete
    await WaitForTrainingAsync(luisClient, appId, version);
    
    // Publish the model
    var publishRequestBody = new ApplicationPublishObject
    {
        VersionId = version,
        IsStaging = false
    };
    
    await luisClient.Apps.PublishAsync(appId, publishRequestBody);
}

private async Task WaitForTrainingAsync(LUISAuthoringClient client, string appId, string version)
{
    var trainingStatus = await client.Train.GetStatusAsync(appId, version);
    
    // Wait until all models are trained
    while (trainingStatus.Any(m => m.Details.Status == "InProgress"))
    {
        await Task.Delay(1000);
        trainingStatus = await client.Train.GetStatusAsync(appId, version);
    }
}
```

#### QnA Maker Updates

1. Access the QnA Maker portal at [qnamaker.ai](https://www.qnamaker.ai)
2. Select your knowledge base
3. Add new question-answer pairs
4. Update existing answers
5. Import new knowledge base sources
6. Test with sample questions
7. Publish to production

Batch update via API:

```csharp
// QnAUpdater.cs
public async Task UpdateKnowledgeBaseAsync(List<QnADTO> qnaPairs)
{
    var qnaClient = new QnAMakerClient(
        new ApiKeyServiceClientCredentials(_configuration["QnASubscriptionKey"]))
    {
        Endpoint = _configuration["QnAEndpoint"]
    };
    
    var kbId = _configuration["QnAKnowledgeBaseId"];
    
    // Create update payload
    var updateKbOperationDTO = new UpdateKbOperationDTO
    {
        Add = new UpdateKbOperationDTOAdd
        {
            QnaList = qnaPairs
        }
    };
    
    // Update knowledge base
    await qnaClient.Knowledgebase.UpdateAsync(kbId, updateKbOperationDTO);
    
    // Publish knowledge base
    await qnaClient.Knowledgebase.PublishAsync(kbId);
}
```

## Appendix: Configuration Templates

### App Settings Template

```json
{
  "MicrosoftAppId": "",
  "MicrosoftAppPassword": "",
  "ScmType": "None",
  "LuisAPIHostName": "",
  "LuisAPIKey": "",
  "LuisAppId": "",
  "QnAKnowledgebaseId": "",
  "QnAAuthKey": "",
  "QnAEndpointHostName": "",
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": ""
  },
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "Domain": "",
    "TenantId": "",
    "ClientId": "",
    "CallbackPath": "/signin-oidc",
    "SignedOutCallbackPath": "/signout-callback-oidc",
    "ClientSecret": ""
  },
  "ApplicationInsights": {
    "InstrumentationKey": ""
  },
  "BotConfiguration": {
    "WelcomeMessage": "Hello! I'm the ACS Help Desk Bot. How can I help you today?",
    "MaxConversationTimeout": 30,
    "TypingIndicatorDelay": 2000,
    "DefaultLocale": "en-US",
    "SupportedLocales": ["en-US", "es-ES", "fr-FR"],
    "FeedbackEnabled": true,
    "EscalationThreshold": 3,
    "TicketSystemIntegration": {
      "Enabled": true,
      "Endpoint": "",
      "ApiKey": "",
      "DefaultPriority": "Medium",
      "DefaultCategory": "IT Support"
    }
  }
}
```

### ARM Template for Bot Resources

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
    "appServicePlanName": {
      "type": "string",
      "metadata": {
        "description": "The name of the App Service Plan"
      }
    },
    "appServiceName": {
      "type": "string",
      "metadata": {
        "description": "The name of the App Service"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]",
      "metadata": {
        "description": "Location for all resources"
      }
    },
    "sku": {
      "type": "string",
      "defaultValue": "S1",
      "allowedValues": [
        "F1",
        "D1",
        "B1",
        "B2",
        "B3",
        "S1",
        "S2",
        "S3",
        "P1",
        "P2",
        "P3"
      ],
      "metadata": {
        "description": "The SKU of the App Service Plan"
      }
    },
    "luisServiceName": {
      "type": "string",
      "metadata": {
        "description": "The name of the LUIS service"
      }
    },
    "qnaMakerServiceName": {
      "type": "string",
      "metadata": {
        "description": "The name of the QnA Maker service"
      }
    },
    "sqlServerName": {
      "type": "string",
      "metadata": {
        "description": "The name of the SQL Server"
      }
    },
    "sqlDatabaseName": {
      "type": "string",
      "metadata": {
        "description": "The name of the SQL Database"
      }
    },
    "sqlAdminLogin": {
      "type": "string",
      "metadata": {
        "description": "The SQL Server administrator login"
      }
    },
    "sqlAdminPassword": {
      "type": "securestring",
      "metadata": {
        "description": "The SQL Server administrator password"
      }
    },
    "insightsName": {
      "type": "string",
      "metadata": {
        "description": "The name of the Application Insights instance"
      }
    }
  },
  "variables": {
    "botEndpoint": "[concat('https://', parameters('appServiceName'), '.azurewebsites.net/api/messages')]",
    "botMsiName": "[concat(parameters('botServiceName'), '-MSI')]",
    "storageAccountName": "[concat('st', uniqueString(resourceGroup().id))]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2021-04-01",
      "name": "[variables('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2",
      "properties": {
        "supportsHttpsTrafficOnly": true,
        "encryption": {
          "services": {
            "file": {
              "keyType": "Account",
              "enabled": true
            },
            "blob": {
              "keyType": "Account",
              "enabled": true
            }
          },
          "keySource": "Microsoft.Storage"
        }
      }
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2021-02-01",
      "name": "[parameters('appServicePlanName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "[parameters('sku')]"
      },
      "properties": {}
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2021-02-01",
      "name": "[parameters('appServiceName')]",
      "location": "[parameters('location')]",
      "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]",
        "[resourceId('Microsoft.Insights/components', parameters('insightsName'))]"
      ],
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]",
        "siteConfig": {
          "appSettings": [
            {
              "name": "MicrosoftAppId",
              "value": "[reference(resourceId('Microsoft.BotService/botServices', parameters('botServiceName'))).appId]"
            },
            {
              "name": "MicrosoftAppPassword",
              "value": "[listKeys(resourceId('Microsoft.BotService/botServices', parameters('botServiceName')), '2021-03-01').key]"
            },
            {
              "name": "WEBSITE_NODE_DEFAULT_VERSION",
              "value": "14.16.0"
            },
            {
              "name": "APPINSIGHTS_INSTRUMENTATIONKEY",
              "value": "[reference(resourceId('Microsoft.Insights/components', parameters('insightsName')), '2020-02-02').InstrumentationKey]"
            },
            {
              "name": "LuisAPIHostName",
              "value": "[reference(resourceId('Microsoft.CognitiveServices/accounts', parameters('luisServiceName'))).endpoint]"
            },
            {
              "name": "LuisAPIKey",
              "value": "[listKeys(resourceId('Microsoft.CognitiveServices/accounts', parameters('luisServiceName')), '2021-04-30').key1]"
            },
            {
              "name": "QnAEndpointHostName",
              "value": "[reference(resourceId('Microsoft.CognitiveServices/accounts', parameters('qnaMakerServiceName'))).endpoint]"
            },
            {
              "name": "QnAAuthKey",
              "value": "[listKeys(resourceId('Microsoft.CognitiveServices/accounts', parameters('qnaMakerServiceName')), '2021-04-30').key1]"
            },
            {
              "name": "AzureWebJobsStorage",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', variables('storageAccountName'), ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName')), '2021-04-01').keys[0].value, ';EndpointSuffix=core.windows.net')]"
            }
          ],
          "connectionStrings": [
            {
              "name": "DefaultConnection",
              "connectionString": "[concat('Server=tcp:', parameters('sqlServerName'), '.database.windows.net,1433;Initial Catalog=', parameters('sqlDatabaseName'), ';Persist Security Info=False;User ID=', parameters('sqlAdminLogin'), ';Password=', parameters('sqlAdminPassword'), ';MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;')]",
              "type": "SQLAzure"
            }
          ]
        },
        "httpsOnly": true
      }
    },
    {
      "type": "Microsoft.BotService/botServices",
      "apiVersion": "2021-03-01",
      "name": "[parameters('botServiceName')]",
      "location": "global",
      "sku": {
        "name": "S1"
      },
      "kind": "bot",
      "properties": {
        "displayName": "[parameters('botServiceName')]",
        "endpoint": "[variables('botEndpoint')]",
        "msaAppId": "[reference(resourceId('Microsoft.Web/sites', parameters('appServiceName')), '2021-02-01', 'Full').identity.principalId]",
        "luisAppIds": [],
        "developerAppInsightKey": "[reference(resourceId('Microsoft.Insights/components', parameters('insightsName')), '2020-02-02').InstrumentationKey]",
        "isStreamingSupported": false
      },
      "dependsOn": [
        "[resourceId('Microsoft.Web/sites', parameters('appServiceName'))]"
      ]
    },
    {
      "type": "Microsoft.CognitiveServices/accounts",
      "apiVersion": "2021-04-30",
      "name": "[parameters('luisServiceName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "S0"
      },
      "kind": "LUIS",
      "properties": {
        "apiProperties": {
          "qnaRuntimeEndpoint": "[concat('https://', parameters('location'), '.api.cognitive.microsoft.com')]"
        }
      }
    },
    {
      "type": "Microsoft.CognitiveServices/accounts",
      "apiVersion": "2021-04-30",
      "name": "[parameters('qnaMakerServiceName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "S0"
      },
      "kind": "QnAMaker",
      "properties": {
        "apiProperties": {
          "qnaRuntimeEndpoint": "[concat('https://', parameters('qnaMakerServiceName'), '.azurewebsites.net')]"
        }
      }
    },
    {
      "type": "Microsoft.Sql/servers",
      "apiVersion": "2021-02-01-preview",
      "name": "[parameters('sqlServerName')]",
      "location": "[parameters('location')]",
      "properties": {
        "administratorLogin": "[parameters('sqlAdminLogin')]",
        "administratorLoginPassword": "[parameters('sqlAdminPassword')]",
        "version": "12.0"
      },
      "resources": [
        {
          "type": "databases",
          "apiVersion": "2021-02-01-preview",
          "name": "[parameters('sqlDatabaseName')]",
          "location": "[parameters('location')]",
          "sku": {
            "name": "Standard",
            "tier": "Standard"
          },
          "properties": {
            "collation": "SQL_Latin1_General_CP1_CI_AS",
            "maxSizeBytes": 268435456000
          },
          "dependsOn": [
            "[resourceId('Microsoft.Sql/servers', parameters('sqlServerName'))]"
          ]
        },
        {
          "type": "firewallRules",
          "apiVersion": "2021-02-01-preview",
          "name": "AllowAllAzureIPs",
          "properties": {
            "startIpAddress": "0.0.0.0",
            "endIpAddress": "0.0.0.0"
          },
          "dependsOn": [
            "[resourceId('Microsoft.Sql/servers', parameters('sqlServerName'))]"
          ]
        }
      ]
    },
    {
      "type": "Microsoft.Insights/components",
      "apiVersion": "2020-02-02",
      "name": "[parameters('insightsName')]",
      "location": "[parameters('location')]",
      "kind": "web",
      "properties": {
        "Application_Type": "web",
        "Flow_Type": "Redfield",
        "Request_Source": "IbizaAIExtension"
      }
    }
  ],
  "outputs": {
    "botId": {
      "type": "string",
      "value": "[reference(resourceId('Microsoft.BotService/botServices', parameters('botServiceName'))).appId]"
    },
    "appServiceUrl": {
      "type": "string",
      "value": "[concat('https://', parameters('appServiceName'), '.azurewebsites.net')]"
    },
    "insightsInstrumentationKey": {
      "type": "string",
      "value": "[reference(resourceId('Microsoft.Insights/components', parameters('insightsName')), '2020-02-02').InstrumentationKey]"
    }
  }
}
```

### Teams App Manifest Template

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.11/MicrosoftTeams.schema.json",
  "manifestVersion": "1.11",
  "version": "1.0.0",
  "id": "{{BOT_ID}}",
  "packageName": "com.acs.helpdesk.bot",
  "developer": {
    "name": "ACS IT Department",
    "websiteUrl": "https://www.acs.com",
    "privacyUrl": "https://www.acs.com/privacy",
    "termsOfUseUrl": "https://www.acs.com/terms"
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "name": {
    "short": "Help Desk Bot",
    "full": "ACS Help Desk Bot"
  },
  "description": {
    "short": "IT help desk support bot",
    "full": "A bot to help with IT support, ticket management, and knowledge base searches"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "{{BOT_ID}}",
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
              "description": "Get help with bot commands"
            },
            {
              "title": "new ticket",
              "description": "Create a new support ticket"
            },
            {
              "title": "status",
              "description": "Check ticket status"
            },
            {
              "title": "faq",
              "description": "Search the knowledge base"
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
    "*.acs.com",
    "*.botframework.com",
    "*.azurewebsites.net"
  ]
}
```

### Deployment Parameters Template

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "botServiceName": {
      "value": "acs-help-desk-bot"
    },
    "appServicePlanName": {
      "value": "acs-help-desk-plan"
    },
    "appServiceName": {
      "value": "acs-help-desk-app"
    },
    "location": {
      "value": "eastus"
    },
    "sku": {
      "value": "S1"
    },
    "luisServiceName": {
      "value": "acs-help-desk-luis"
    },
    "qnaMakerServiceName": {
      "value": "acs-help-desk-qna"
    },
    "sqlServerName": {
      "value": "acs-help-desk-sql"
    },
    "sqlDatabaseName": {
      "value": "HelpDeskBotDB"
    },
    "sqlAdminLogin": {
      "value": "botadmin"
    },
    "sqlAdminPassword": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/{resource-group}/providers/Microsoft.KeyVault/vaults/{key-vault-name}"
        },
        "secretName": "SqlAdminPassword"
      }
    },
    "insightsName": {
      "value": "acs-help-desk-insights"
    }
  }
}
```

This comprehensive documentation provides all the necessary information for setting up, configuring, deploying, and maintaining the Help Desk Bot system. It includes detailed technical instructions, code samples, configuration templates, and troubleshooting guidelines to ensure successful implementation and operation.
