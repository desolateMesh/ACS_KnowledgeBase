# Incident Status Bot - Service Health Aggregation

## Overview

The Incident Status Bot for Microsoft Teams is a powerful solution that aggregates service health data from multiple sources to provide real-time incident monitoring and management directly within Microsoft Teams. This integration enables IT operations teams to stay informed about service health incidents, collaborate effectively during outages, and manage incident response workflows without leaving their primary collaboration platform.

## Architecture

The Incident Status Bot leverages Azure Functions to create a serverless implementation that connects with various service health APIs and surfaces data within Microsoft Teams conversations. The architecture consists of the following components:

### Core Components

1. **Azure Functions Backend**
   - Provides webhook endpoints for Teams integration
   - Processes incoming service health data
   - Stores incident status information
   - Handles notification logic

2. **Service Health Data Sources**
   - Azure Service Health: Provides information about Azure service incidents and planned maintenance
   - Microsoft 365 Service Health: Reports on Microsoft 365 services status
   - Custom monitoring systems: Can be integrated to provide additional health data

3. **Teams Bot Framework Integration**
   - Adaptive cards for displaying incident information
   - Messaging extension for querying service health
   - Bot commands for incident management
   - Webhook connections for real-time updates

4. **Storage Layer**
   - Azure Table Storage for maintaining incident records
   - Status history for historical tracking and analysis

## Features

### 1. Service Health Aggregation

The bot aggregates health information from multiple sources to provide a single, consolidated view of service health across your entire infrastructure:

- **Cross-platform monitoring**: Combines data from Azure, Microsoft 365, and other sources
- **Real-time synchronization**: Updates status information as soon as new data is available
- **Deduplication engine**: Prevents multiple alerts for the same incident from different sources
- **Correlation logic**: Links related incidents that may span multiple services

### 2. Incident Management Workflow

- **Incident creation**: Automatically creates incidents based on service health notifications or manual user input
- **Status tracking**: Tracks incident status through its lifecycle (Investigating, Identified, Mitigating, Resolved)
- **Owner assignment**: Assigns incidents to responsible team members
- **Updates and notes**: Allows team members to add context and updates to incidents
- **Resolution tracking**: Records resolution steps and post-incident analysis data

### 3. Teams Integration

- **Channel notifications**: Posts updates to designated Teams channels
- **Personal notifications**: Alerts specific individuals based on service impact
- **Interactive cards**: Provides actionable cards that allow immediate response
- **Command interface**: Allows users to query and manage incidents using natural language
- **Mobile support**: Works seamlessly with Teams mobile clients for on-the-go incident management

### 4. Reporting and Analytics

- **Incident history**: Maintains a searchable history of past incidents
- **Impact analysis**: Helps quantify service impact and downtime
- **Trend identification**: Identifies recurring issues or problematic services
- **SLA tracking**: Assists with monitoring service level agreements and compliance

## Implementation Guide

### Prerequisites

- Azure subscription with access to create Azure Functions
- Microsoft Teams environment with administrative access
- Service Principal for accessing Azure Service Health
- Microsoft 365 Admin credentials (for Microsoft 365 Service Health integration)

### Configuration Steps

#### 1. Azure Resources Deployment

1. Deploy the Azure Function app using the provided ARM template:
   ```bash
   az deployment group create --resource-group <resource-group-name> --template-file azuredeploy.json
   ```

2. Create a Storage Account table named `statuses` to store incident information:
   ```bash
   az storage table create --name statuses --account-name <storage-account-name>
   ```

3. Configure application settings with necessary connection strings and credentials:
   ```bash
   az functionapp config appsettings set --name <function-app-name> --resource-group <resource-group-name> --settings "AzureServiceHealthConnection=<connection-string>" "M365ServiceHealthConnection=<connection-string>"
   ```

#### 2. Teams Bot Registration

1. Register a new bot in the [Azure Bot Service](https://portal.azure.com/#blade/Microsoft_Azure_BotService/BotServiceMenuBlade/Bots)
2. Create a Teams app package using the provided manifest template
3. Use "StatusPage" as the bot name (hardcoded in current implementation)
4. Configure the bot's messaging endpoint to point to your Azure Function webhook URL

#### 3. Service Health Connectors

Configure connectors for each service health source:

##### Azure Service Health

1. Navigate to Azure Portal > Service Health
2. Create a new activity log alert:
   - Filter for Service Health notifications
   - Select the action group connected to your Azure Function endpoint

##### Microsoft 365 Service Health

1. Use Microsoft Graph API to access Service Health information
2. Configure a scheduled Function to poll for new incidents every 5 minutes
3. Store credentials securely in Azure Key Vault

#### 4. Teams Integration

1. Install the Teams app in your Teams environment
2. Add the bot to relevant incident management channels
3. Configure notification preferences in the bot settings

### Data Flow

1. Service Health incidents are detected from multiple sources
2. The Azure Function processes incoming incident data
3. Incident information is stored in the Azure Table Storage
4. The bot sends notifications to configured Teams channels
5. Users interact with incidents through adaptive cards and commands
6. Updates are synchronized back to the storage layer
7. Resolution information is recorded for reporting purposes

## Usage Guide

### Bot Commands

The following commands can be used to interact with the Incident Status Bot:

- `!incident list` - View active incidents
- `!incident create` - Manually create a new incident
- `!incident update <id>` - Update an existing incident
- `!incident resolve <id>` - Mark an incident as resolved
- `!status` - Get the current service health overview
- `!help` - View available commands and syntax

### Notification Management

Customize how and where notifications are delivered:

1. **Channel targeting**: Specify which incidents go to which channels based on service type
2. **Severity filtering**: Filter notifications based on severity level
3. **Mention rules**: Configure automatic @mentions for critical services
4. **Quiet hours**: Set times when notifications should be suppressed or delayed

### Incident Lifecycle Management

When an incident occurs, the bot supports the following workflow:

1. **Detection**: Incident is detected from service health sources or created manually
2. **Classification**: Incident is categorized by service and severity
3. **Assignment**: Incident is assigned to a team or individual
4. **Investigation**: Updates are posted as the investigation proceeds
5. **Resolution**: Resolution steps are documented
6. **Closure**: Incident is marked as resolved with summary information
7. **Analysis**: Post-incident review data is collected

## Best Practices

- **Channel strategy**: Create dedicated channels for different service types or severity levels
- **Automation balance**: Use automatic creation for known services, manual for custom systems
- **Update frequency**: Configure appropriate update frequency to avoid notification fatigue
- **Security considerations**: Use service principals with least-privilege access
- **Backup communications**: Maintain alternative notification methods for critical incidents

## Troubleshooting

### Common Issues

1. **Missing notifications**:
   - Verify webhook connection is active
   - Check Azure Function logs for processing errors
   - Confirm notification settings in Teams

2. **Duplicate incidents**:
   - Review deduplication settings
   - Check for multiple alert rules triggering for the same services

3. **Access errors**:
   - Verify service principal permissions
   - Check expiration dates on credentials
   - Ensure Azure AD application has proper consent

4. **Performance issues**:
   - Scale up Azure Function plan if handling large volumes
   - Review storage performance and throttling limits
   - Consider implementing caching for frequent queries

### Diagnostic Steps

1. Review function logs:
   ```bash
   az functionapp log tail --name <function-app-name> --resource-group <resource-group-name>
   ```

2. Test webhook endpoint directly:
   ```bash
   curl -X POST -H "Content-Type: application/json" -d @test-payload.json <function-url>
   ```

3. Verify storage connectivity:
   ```bash
   az storage table exists --name statuses --account-name <storage-account-name> --connection-string <connection-string>
   ```

## Advanced Configuration

### Custom Service Integration

The bot can be extended to monitor additional services beyond Azure and Microsoft 365:

1. Create a custom connector class implementing the `IServiceHealthConnector` interface
2. Register the connector in the `ServiceHealthManager`
3. Configure authentication and polling settings for your service
4. Map the service-specific health states to the bot's standardized states

### Advanced Analytics

For deeper insights into service health patterns:

1. Configure export of incident data to Azure Data Explorer
2. Create Power BI dashboards for visualization
3. Implement Machine Learning models for predictive maintenance

### Automations

Enhance incident response with automated actions:

1. Create runbooks that can be triggered from Teams
2. Configure automatic escalation for long-running incidents
3. Implement automatic remediation for known issues

## References

- [Azure Service Health Documentation](https://learn.microsoft.com/en-us/azure/service-health/)
- [Microsoft Teams Bot Framework](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Azure Functions Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/)
- [Microsoft Graph Service Health API](https://learn.microsoft.com/en-us/graph/api/resources/servicehealth)

## Example Implementation

The example implementation provided in this repository demonstrates a basic version of the Incident Status Bot with Azure Service Health integration. To deploy the full solution with all features described in this documentation, additional development work will be required to implement the more advanced scenarios.

The core functionality covered in the example includes:

- Azure Function webhook endpoint
- Teams messaging integration
- Basic incident tracking
- Simple notification flow

---

*This documentation is intended for development and implementation teams seeking to deploy the Incident Status Bot within their own Microsoft Teams environment. The solution can be customized and extended to meet specific organizational requirements for incident management and service health monitoring.*