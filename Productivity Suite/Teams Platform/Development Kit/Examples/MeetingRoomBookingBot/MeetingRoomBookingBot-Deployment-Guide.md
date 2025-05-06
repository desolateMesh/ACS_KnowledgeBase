# Meeting Room Booking Bot Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Deployment Steps](#deployment-steps)
  - [1. Azure Resources Setup](#1-azure-resources-setup)
  - [2. Bot Registration](#2-bot-registration)
  - [3. Infrastructure Deployment](#3-infrastructure-deployment)
  - [4. Application Deployment](#4-application-deployment)
  - [5. Microsoft Teams Integration](#5-microsoft-teams-integration)
- [Configuration](#configuration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Support](#support)

## Overview

The Meeting Room Booking Bot is a Microsoft Teams application designed to simplify the process of finding and booking meeting rooms within an organization. This bot leverages Microsoft Graph API to interact with Exchange/Outlook calendar resources and provides a conversational interface for users to search, view availability, and book meeting rooms directly from Teams.

Key features include:
- Natural language processing for room booking requests
- Room availability checking across specified time ranges
- Multiple room filtering options (capacity, location, equipment)
- Seamless booking creation with attendee management
- Meeting cancellation and modification support
- Adaptive card interfaces for enhanced user experience

This deployment guide provides comprehensive instructions for setting up and configuring the Meeting Room Booking Bot in your organization's Microsoft Teams environment.

## Prerequisites

Before deploying the Meeting Room Booking Bot, ensure you have the following:

### Administrative Access
- Microsoft 365 administrator access
- Azure subscription administrator access
- Teams administrator access

### Development Environment
- [Visual Studio 2022](https://visualstudio.microsoft.com/vs/) (latest version recommended)
- [.NET Core SDK 6.0](https://dotnet.microsoft.com/download/dotnet/6.0) or newer
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) (latest version)
- [Teams Toolkit](https://docs.microsoft.com/microsoftteams/platform/toolkit/teams-toolkit-fundamentals) for Visual Studio
- [Node.js](https://nodejs.org/) (LTS version) and npm

### Azure Resources
- Azure App Service Plan
- Azure Bot Service
- Azure Application Insights (optional but recommended)
- Azure Key Vault (for secure credential storage)
- Azure AD Application Registration

### Microsoft 365 Resources
- Exchange Online with configured resource rooms
- Microsoft Teams with app upload permissions
- Microsoft Graph API permissions

## Architecture

The Meeting Room Booking Bot follows a modern cloud-native architecture with the following components:

![Architecture Diagram](https://example.com/architecture-diagram.png)

### Core Components

1. **Bot Framework Service**: Handles conversation management and message routing
2. **Bot Application**: .NET Core application implementing the business logic and conversational flows
3. **Microsoft Graph Integration**: Connects to Microsoft 365 services for calendar operations
4. **Azure Key Vault**: Secures application credentials and configuration
5. **Application Insights**: Provides monitoring and telemetry (optional)

### Data Flow

1. User initiates a booking request in Teams
2. Bot Framework routes the message to the Azure-hosted bot application
3. Bot processes the natural language request and formulates Graph API queries
4. Graph API interacts with Exchange/Outlook resources
5. Results are formatted and presented to the user via Teams adaptive cards
6. User confirms booking details
7. Bot finalizes the reservation through Graph API

## Deployment Steps

### 1. Azure Resources Setup

#### Create Resource Group

```bash
az group create --name MeetingRoomBookingBot-RG --location eastus
```

#### Create App Service Plan

```bash
az appservice plan create --name MeetingRoomBookingBot-ASP --resource-group MeetingRoomBookingBot-RG --sku S1
```

#### Create Application Insights (Optional)

```bash
az monitor app-insights component create --app MeetingRoomBookingBot-AI --resource-group MeetingRoomBookingBot-RG --location eastus
```

#### Create Key Vault

```bash
az keyvault create --name MeetingRoomBookingBot-KV --resource-group MeetingRoomBookingBot-RG --location eastus --enabled-for-template-deployment true
```

### 2. Bot Registration

#### Register Azure AD Application

1. Sign in to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Enter application details:
   - **Name**: Meeting Room Booking Bot
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web > https://token.botframework.com/.auth/web/redirect
5. Click **Register**

#### Configure API Permissions

1. In your new app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** > **Delegated permissions**
4. Add the following permissions:
   - `Calendars.ReadWrite`
   - `Calendars.ReadWrite.Shared`
   - `Place.Read.All`
   - `User.Read`
   - `User.ReadBasic.All`
5. Click **Add permissions**
6. Grant admin consent for the directory

#### Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Enter a description and select an expiry period
4. Click **Add**
5. **IMPORTANT**: Copy the secret value immediately and store it securely

#### Register Bot with Azure Bot Service

```bash
az bot create --resource-group MeetingRoomBookingBot-RG --name MeetingRoomBookingBot --kind webapp --version v4 --endpoint "https://meetingroombookingbot.azurewebsites.net/api/messages" --msa-app-id "<your-app-id>"
```

Replace `<your-app-id>` with the Application (client) ID from your Azure AD app registration.

### 3. Infrastructure Deployment

#### Deploy Web App

```bash
az webapp create --resource-group MeetingRoomBookingBot-RG --plan MeetingRoomBookingBot-ASP --name MeetingRoomBookingBot --runtime "DOTNET|6.0"
```

#### Configure Web App Settings

```bash
az webapp config appsettings set --resource-group MeetingRoomBookingBot-RG --name MeetingRoomBookingBot --settings "MicrosoftAppId=<your-app-id>" "MicrosoftAppPassword=@Microsoft.KeyVault(SecretUri=https://meetingroombookingbot-kv.vault.azure.net/secrets/BotFrameworkSecret/)" "WEBSITE_NODE_DEFAULT_VERSION=14.16.0"
```

#### Configure Key Vault Access

```bash
az keyvault set-policy --name MeetingRoomBookingBot-KV --resource-group MeetingRoomBookingBot-RG --object-id <webapp-managed-identity-id> --secret-permissions get list
```

#### Enable Managed Identity

```bash
az webapp identity assign --resource-group MeetingRoomBookingBot-RG --name MeetingRoomBookingBot
```

### 4. Application Deployment

#### Clone the Repository

```bash
git clone https://github.com/yourorg/MeetingRoomBookingBot.git
cd MeetingRoomBookingBot
```

#### Update Configuration

Edit the `appsettings.json` file to include your application-specific settings:

```json
{
  "MicrosoftAppId": "<your-app-id>",
  "MicrosoftAppPassword": "<your-client-secret>",
  "TenantId": "<your-tenant-id>",
  "BotBaseUrl": "https://meetingroombookingbot.azurewebsites.net",
  "KeyVaultName": "MeetingRoomBookingBot-KV",
  "ApplicationInsightsKey": "<your-app-insights-key>",
  "RoomBookingSettings": {
    "DefaultLocation": "Building A",
    "MaxAdvanceBookingDays": 14,
    "DefaultMeetingDuration": 30,
    "AllowedCapacities": [2, 4, 6, 8, 10, 12, 16, 20, 30]
  }
}
```

#### Build and Publish

```bash
dotnet restore
dotnet build --configuration Release
dotnet publish --configuration Release --output ./publish
```

#### Deploy to Azure Web App

```bash
az webapp deployment source config-zip --resource-group MeetingRoomBookingBot-RG --name MeetingRoomBookingBot --src ./publish.zip
```

Alternatively, set up continuous deployment using Azure DevOps or GitHub Actions for a more streamlined workflow.

### 5. Microsoft Teams Integration

#### Create Teams App Package

1. Navigate to the `TeamsAppManifest` folder
2. Edit the `manifest.json` file to update the following:
   - `id`: Use a new GUID
   - `developer.name`: Your organization name
   - `developer.websiteUrl`: Your organization website
   - `developer.privacyUrl`: Privacy policy URL
   - `developer.termsOfUseUrl`: Terms of use URL
   - `bots[0].botId`: Your Azure AD app ID
3. Update icon files (`color.png` and `outline.png`) with your branding
4. Zip the contents of the folder (manifest.json and icon files)

#### Upload to Teams

1. Go to the Microsoft Teams admin center
2. Navigate to **Teams apps** > **Manage apps**
3. Click **Upload**
4. Select your zip package
5. Click **Add** to upload the app

#### Grant Organization-Wide Access (Optional)

1. In the Teams admin center, find your uploaded app
2. Click on the app name to access its settings
3. Under **Status**, set it to "Allowed"
4. Under **Publishing status**, choose "Publish"

## Configuration

### Room Configuration

The bot requires proper configuration of resource rooms in Exchange Online. Ensure that:

1. Room resources have accurate metadata:
   - Display names
   - Capacity information
   - Building/floor location
   - Equipment/features

2. Room mailboxes are properly configured:
   - AutoAccept setting enabled
   - ProcessExternalMeetingMessages set appropriately
   - RemovePrivateProperty set according to privacy requirements

Example PowerShell to configure a room:

```powershell
Set-CalendarProcessing -Identity "Room 123" -AutomateProcessing AutoAccept -AddOrganizerToSubject $true -DeleteComments $false -DeleteSubject $false -RemovePrivateProperty $false -ProcessExternalMeetingMessages $true
```

### Bot Configuration Settings

The following settings can be adjusted in the `appsettings.json` file or via application settings in the Azure Web App:

| Setting | Description | Default |
|---------|-------------|---------|
| DefaultLocation | Default building/location for searches | "Building A" |
| MaxAdvanceBookingDays | Maximum days ahead for booking | 14 |
| DefaultMeetingDuration | Default meeting length in minutes | 30 |
| AllowedCapacities | Available room capacity options | [2,4,6,8,10,12,16,20,30] |
| WorkingHoursStart | Start of workday | "08:00" |
| WorkingHoursEnd | End of workday | "17:00" |
| TimeZone | Default time zone | "Eastern Standard Time" |

## Testing

### Bot Framework Emulator Testing

For local development and testing:

1. Install the [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator)
2. Run the bot application locally
3. Connect the emulator to `http://localhost:3978/api/messages`
4. Configure the Microsoft App ID and Password
5. Test the conversational flows

### Teams Testing

1. Install the app to your personal Teams environment
2. Start a chat with the bot
3. Test various booking scenarios:
   - "Book a room for tomorrow at 2 PM for 4 people"
   - "Find a room with a whiteboard for next Monday at 10 AM"
   - "Show me available rooms in Building B"

### Validation Test Cases

| Test Case | Expected Result |
|-----------|-----------------|
| Book room with valid parameters | Room booked, confirmation shown |
| Book unavailable room | Conflict shown, alternatives offered |
| Book without specifying time | Bot prompts for time information |
| Cancel existing booking | Booking canceled, confirmation shown |
| Reschedule meeting | Original canceled, new booking created |

## Troubleshooting

### Common Issues

#### Bot Not Responding in Teams
- Verify the bot is registered correctly in Azure Bot Service
- Check App Service logs for errors
- Ensure the Microsoft App ID and Secret are correct
- Verify the Teams app is installed correctly

#### Authentication Errors
- Check Azure AD app registration permissions
- Verify admin consent has been granted
- Check client secret hasn't expired
- Review Azure Key Vault access policies

#### Room Booking Failures
- Verify the service account has appropriate permissions
- Check Exchange room configuration (AutoAccept settings)
- Review Microsoft Graph API call logs for specific errors

### Logging and Monitoring

1. **Application Insights**: For comprehensive telemetry, configure and use Application Insights:
   - Exception tracking
   - Dependency calls (Graph API)
   - Request performance
   - Custom events

2. **Bot Web App Logs**: Access via:
   ```bash
   az webapp log tail --resource-group MeetingRoomBookingBot-RG --name MeetingRoomBookingBot
   ```

3. **Bot Framework Channel Data**: Review incoming/outgoing messages in the Bot Framework portal

### Diagnostic Commands

Check bot health:
```bash
az bot show --resource-group MeetingRoomBookingBot-RG --name MeetingRoomBookingBot
```

Test Graph API access:
```powershell
Connect-MgGraph -ClientId "<app-id>" -TenantId "<tenant-id>" -ClientSecret "<client-secret>"
Get-MgPlace -PlaceId "room123@contoso.com"
```

## FAQ

### General Questions

**Q: Can the bot book rooms across multiple buildings?**  
A: Yes, the bot supports filtering by building or location, and can suggest rooms across multiple locations when needed.

**Q: Does the bot support recurring meetings?**  
A: Yes, the bot can create recurring meetings based on user specifications (daily, weekly, monthly).

**Q: Can the bot handle room equipment requirements?**  
A: Yes, if rooms are properly tagged with equipment metadata in Exchange, the bot can filter based on equipment needs (e.g., whiteboards, projectors, video conferencing).

**Q: How does the bot handle time zones?**  
A: The bot uses the organization's default time zone but can also interpret user-specified time zones when included in requests.

**Q: Can the bot book on behalf of others?**  
A: Yes, with proper permissions, the bot can book on behalf of authorized users.

### Technical Questions

**Q: Does the bot require an Enterprise Application in Azure AD?**  
A: No, a standard App Registration is sufficient as long as it has the appropriate Graph API permissions.

**Q: Can we customize the bot's responses?**  
A: Yes, the bot's dialog flows and response templates can be customized in the code.

**Q: How does the bot store state?**  
A: The bot uses a combination of bot state management (for conversation context) and Azure Storage (for user preferences).

**Q: Is Multi-Factor Authentication (MFA) supported?**  
A: Yes, the bot uses Microsoft identity platform authentication which supports MFA.

**Q: What is the maximum number of attendees supported?**  
A: The bot itself has no limit, but is constrained by Microsoft Graph API and Exchange Online limits.

## Support

### Internal Support

For issues with deployment or configuration, contact the Internal IT Support team:
- Email: itsupport@contoso.com
- Phone: +1-555-123-4567
- Support Portal: https://support.contoso.com

### Microsoft Support

For issues related to Microsoft Teams or Graph API:
- Microsoft 365 Admin Center: https://admin.microsoft.com
- Microsoft Support: https://support.microsoft.com/business

### Community Resources

- Teams Developer Forum: https://techcommunity.microsoft.com/t5/microsoft-teams-developer/bd-p/MicrosoftTeamsDev
- Bot Framework Documentation: https://docs.microsoft.com/azure/bot-service/
- Microsoft Graph Documentation: https://docs.microsoft.com/graph/
