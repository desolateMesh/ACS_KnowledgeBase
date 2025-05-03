# SoftwareInstallRequestBot - Intune and Chocolatey Integration

## Overview

The SoftwareInstallRequestBot is a Microsoft Teams bot solution that automates the software installation request process by integrating Microsoft Intune and the Chocolatey package manager. This solution streamlines the process of requesting, approving, and deploying software across an organization, reducing IT workload while maintaining security and compliance standards.

## Architecture

### Components

- **Microsoft Teams Bot**: Front-end interface for users to request software.
- **Azure Bot Service**: Hosts the bot logic and handles conversational flow.
- **Microsoft Graph API**: Interfaces with Microsoft 365 services.
- **Microsoft Intune**: Manages application deployment policies.
- **Chocolatey Integration**: Package manager for Windows software deployment.
- **Azure Functions**: Serverless compute for handling business logic.
- **Azure SQL Database**: Stores request metadata and approval workflows.
- **Azure Key Vault**: Secures API credentials and certificates.

### System Diagram

```
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │      │                   │
│  Microsoft Teams  │─────▶│   Azure Bot       │─────▶│   Azure Functions │
│                   │      │   Service         │      │                   │
└───────────────────┘      └───────────────────┘      └───────────────────┘
                                                               │
                                                               ▼
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│                   │      │                   │      │                   │
│  Chocolatey       │◀─────│   Microsoft       │◀─────│   Microsoft Graph │
│  Package Manager  │      │   Intune          │      │   API             │
└───────────────────┘      └───────────────────┘      └───────────────────┘
```

## Key Features

1. **Self-Service Software Catalog**: Presents users with a catalog of approved software.
2. **Automated Approval Workflow**: Routes requests to appropriate approvers based on software category and cost.
3. **Real-Time Status Tracking**: Allows users to track the status of their requests.
4. **Compliance Checking**: Validates requests against organizational policies.
5. **Seamless Deployment**: Automatically deploys approved software to user devices.
6. **Audit Trail**: Maintains comprehensive logs of all requests and actions.
7. **License Management**: Tracks license utilization and availability.

## Implementation Guide

### Prerequisites

- Azure subscription with administrative access
- Microsoft 365 tenant with Teams and Intune licenses
- Administrator rights to Microsoft Endpoint Manager
- Windows client devices managed by Intune
- Chocolatey infrastructure (either internal repository or public access)

### Bot Registration

1. Register a new bot in the [Azure portal](https://portal.azure.com):
   - Navigate to Azure Active Directory > App registrations > New registration
   - Name: "SoftwareInstallRequestBot"
   - Supported account types: Single tenant
   - Redirect URI: Web > https://token.botframework.com/_api/auth/callback

2. Create a client secret:
   - Navigate to the bot registration > Certificates & secrets
   - Add a new client secret and record its value

3. Add API permissions:
   - Microsoft Graph > Application permissions:
     - DeviceManagementApps.ReadWrite.All
     - DeviceManagementConfiguration.ReadWrite.All
     - User.Read.All
     - Group.ReadWrite.All

### Azure Resources Deployment

```bash
# Deploy Azure resources using ARM template
az deployment group create \
  --resource-group SoftwareInstallBot-RG \
  --template-file deploy/azuredeploy.json \
  --parameters @deploy/parameters.json
```

### Microsoft Intune Configuration

1. **Create Intune Connection**:
   - Open Microsoft Endpoint Manager admin center
   - Navigate to Tenant administration > Connectors and tokens
   - Create a new app connector for Chocolatey

2. **Configure Application Categories**:
   - Navigate to Apps > App categories
   - Create categories for different software types (e.g., "Development Tools", "Productivity Apps")

3. **Deploy Chocolatey Client**:
   - Create a PowerShell script to install Chocolatey client:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
```

   - Deploy this script to all managed devices as a proactive remediation script

### Chocolatey Configuration

1. **Package Repository Setup**:
   - Option A: Use public Chocolatey repository
   - Option B: Set up internal repository:

```powershell
# Install Chocolatey.Server
choco install chocolatey.server -y

# Configure IIS settings
& C:\tools\chocolatey.server\setup.ps1

# Push packages to internal repository
choco push MyPackage.1.0.0.nupkg -s http://internal-choco-repo/chocolatey
```

2. **Create Custom Packages**:
   - For internal applications, create custom Chocolatey packages:

```powershell
# Create package template
choco new MyInternalApp

# Edit MyInternalApp/MyInternalApp.nuspec and MyInternalApp/tools/chocolateyInstall.ps1

# Pack the application
cd MyInternalApp
choco pack
```

### Bot Implementation

1. **Create Teams App Manifest**:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
  "manifestVersion": "1.14",
  "version": "1.0.0",
  "id": "{{bot-id}}",
  "packageName": "com.company.softwareinstallbot",
  "developer": {
    "name": "Your Company",
    "websiteUrl": "https://website.com",
    "privacyUrl": "https://website.com/privacy",
    "termsOfUseUrl": "https://website.com/terms"
  },
  "name": {
    "short": "Software Install Bot",
    "full": "Software Installation Request Bot"
  },
  "description": {
    "short": "Request software installations",
    "full": "A bot that lets users request software and automatically deploys approved requests via Intune and Chocolatey"
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#FFFFFF",
  "bots": [
    {
      "botId": "{{bot-id}}",
      "scopes": ["personal", "team", "groupchat"],
      "commandLists": [
        {
          "scopes": ["personal", "team", "groupchat"],
          "commands": [
            {
              "title": "request",
              "description": "Request new software"
            },
            {
              "title": "status",
              "description": "Check request status"
            },
            {
              "title": "catalog",
              "description": "Browse software catalog"
            },
            {
              "title": "help",
              "description": "Get help using this bot"
            }
          ]
        }
      ],
      "isNotificationOnly": false
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": [
    "token.botframework.com",
    "{{bot-domain}}.azurewebsites.net"
  ]
}
```

2. **Implement Bot Logic**:

```csharp
// Main dialog class for bot
public class SoftwareRequestDialog : ComponentDialog
{
    private const string WaterfallDialogId = "softwareRequestDialog";
    private readonly IConfiguration _configuration;
    private readonly IIntuneService _intuneService;
    private readonly IChocolateyService _chocolateyService;

    public SoftwareRequestDialog(
        IConfiguration configuration,
        IIntuneService intuneService,
        IChocolateyService chocolateyService) : base(nameof(SoftwareRequestDialog))
    {
        _configuration = configuration;
        _intuneService = intuneService;
        _chocolateyService = chocolateyService;

        AddDialog(new WaterfallDialog(WaterfallDialogId, new WaterfallStep[]
        {
            InitiateRequestAsync,
            CollectSoftwareInfoAsync,
            ConfirmRequestAsync,
            ProcessRequestAsync,
            FinalStepAsync
        }));

        AddDialog(new TextPrompt(nameof(TextPrompt)));
        AddDialog(new ChoicePrompt(nameof(ChoicePrompt)));
        AddDialog(new ConfirmPrompt(nameof(ConfirmPrompt)));

        InitialDialogId = WaterfallDialogId;
    }

    // Dialog steps implementation...
}
```

3. **Intune Integration Service**:

```csharp
public class IntuneService : IIntuneService
{
    private readonly GraphServiceClient _graphClient;
    private readonly IConfiguration _configuration;

    public IntuneService(GraphServiceClient graphClient, IConfiguration configuration)
    {
        _graphClient = graphClient;
        _configuration = configuration;
    }

    public async Task<bool> DeployApplicationAsync(string appId, string deviceId)
    {
        try
        {
            // Create an application assignment
            var assignment = new MobileAppAssignment
            {
                Intent = InstallIntent.Required,
                Target = new DeviceAndAppManagementAssignmentTarget
                {
                    DeviceIds = new List<string> { deviceId }
                }
            };

            await _graphClient.DeviceAppManagement.MobileApps[appId]
                .Assignments
                .Request()
                .AddAsync(assignment);

            return true;
        }
        catch (Exception ex)
        {
            // Log exception
            return false;
        }
    }

    // Additional Intune integration methods...
}
```

4. **Chocolatey Integration Service**:

```csharp
public class ChocolateyService : IChocolateyService
{
    private readonly IConfiguration _configuration;
    private readonly string _chocolateyRepo;

    public ChocolateyService(IConfiguration configuration)
    {
        _configuration = configuration;
        _chocolateyRepo = configuration["ChocolateyRepository"];
    }

    public async Task<IEnumerable<ChocolateyPackage>> SearchPackagesAsync(string query)
    {
        // Implementation to search Chocolatey packages
        // This could use Chocolatey API or internal repository API
        
        // Sample implementation
        using (var client = new HttpClient())
        {
            var response = await client.GetAsync($"{_chocolateyRepo}/api/v2/Search()?$filter=IsLatestVersion&$skip=0&$top=10&searchTerm='{query}'&targetFramework=''");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                // Parse OData response and return packages
                // ...
            }
        }
        
        return new List<ChocolateyPackage>();
    }

    public async Task<bool> CreateIntuneWinPackageAsync(string packageId, string version)
    {
        // Create Win32 app package from Chocolatey package for Intune deployment
        // ...
        return true;
    }

    // Additional Chocolatey integration methods...
}
```

### Deployment Pipeline

1. **CI/CD Configuration** (Azure DevOps example):

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
    - main

pool:
  vmImage: 'windows-latest'

variables:
  buildConfiguration: 'Release'
  dotNetVersion: '6.x'

stages:
- stage: Build
  jobs:
  - job: BuildJob
    steps:
    - task: UseDotNet@2
      inputs:
        packageType: 'sdk'
        version: '$(dotNetVersion)'
    
    - script: dotnet restore
      displayName: 'Restore NuGet packages'
    
    - script: dotnet build --configuration $(buildConfiguration)
      displayName: 'Build solution'
    
    - script: dotnet test --configuration $(buildConfiguration) --no-build
      displayName: 'Run tests'
    
    - task: DotNetCoreCLI@2
      inputs:
        command: publish
        publishWebProjects: True
        arguments: '--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)'
    
    - task: PublishBuildArtifacts@1
      inputs:
        pathtoPublish: '$(Build.ArtifactStagingDirectory)'
        artifactName: 'drop'

- stage: Deploy
  dependsOn: Build
  jobs:
  - deployment: DeployBot
    environment: Production
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureRmWebAppDeployment@4
            inputs:
              ConnectionType: 'AzureRM'
              azureSubscription: '$(AzureSubscription)'
              appType: 'webApp'
              WebAppName: '$(WebAppName)'
              packageForLinux: '$(Pipeline.Workspace)/drop/*.zip'
              AppSettings: '-MICROSOFT_APPID "$(BotAppId)" -MICROSOFT_APP_PASSWORD "$(BotAppSecret)"'
```

## Usage Workflow

### Request Process

1. **User Initiates Request**:
   - User messages the bot in Teams with "request" command
   - Bot presents available software categories

2. **Software Selection**:
   - User selects software category
   - Bot presents available software within that category
   - User selects specific software and version

3. **Approval Process**:
   - Bot checks if approval is required based on software policies
   - If approval needed, request is routed to approver (manager or IT admin)
   - Approver receives notification in Teams and approves/rejects

4. **Deployment Process**:
   - Upon approval, bot triggers deployment through Intune
   - Intune uses Chocolatey to install the software package
   - User receives notification of successful deployment

5. **Status Tracking**:
   - User can check status using "status" command
   - Bot provides real-time updates on request progress

### Admin Workflows

1. **Software Catalog Management**:
   - Admins can add/remove software from catalog
   - Configure approval requirements per software
   - Set deployment options and parameters

2. **Reporting**:
   - View request statistics and trends
   - Monitor approval timelines
   - Track software deployment success rates

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify Azure AD app registration permissions
   - Check client secret expiration
   - Ensure proper consent has been granted

2. **Deployment Failures**:
   - Verify device is Intune-managed
   - Check Chocolatey client installation
   - Verify network connectivity to Chocolatey repository
   - Review Intune deployment logs

3. **Bot Communication Issues**:
   - Validate Bot Framework registration
   - Check Azure Web App service status
   - Verify Teams app manifest configuration

### Logging and Monitoring

1. **Enable Diagnostic Logging**:

```powershell
# On client device, enable Chocolatey logging
choco feature enable -n logEnvironmentValues
choco feature enable -n logWithoutTimestamp

# Check logs at:
Get-Content "$env:ChocolateyInstall\logs\chocolatey.log"
```

2. **Intune Monitoring**:
   - Navigate to Microsoft Endpoint Manager admin center
   - Check Device Management > Monitor > Deployment Status

3. **Application Insights Integration**:
   - Add the following to appsettings.json:

```json
{
  "ApplicationInsights": {
    "InstrumentationKey": "your-key-here"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning",
      "Microsoft.Hosting.Lifetime": "Information"
    },
    "ApplicationInsights": {
      "LogLevel": {
        "Default": "Information"
      }
    }
  }
}
```

## Security Considerations

1. **Least Privilege Access**:
   - Use service principals with minimal required permissions
   - Rotate client secrets regularly
   - Use managed identities where possible

2. **Data Protection**:
   - Store credentials in Azure Key Vault
   - Encrypt sensitive data in transit and at rest
   - Implement proper data retention policies

3. **Compliance Controls**:
   - Restrict software catalog to approved applications
   - Enforce approval workflows for non-standard software
   - Maintain audit logs for compliance reporting

## Performance Optimization

1. **Scaling Considerations**:
   - Configure App Service Plan for auto-scaling
   - Implement caching for software catalog
   - Use Azure SQL elastic pools for database scaling

2. **Batch Processing**:
   - Process multiple deployment requests in batches
   - Schedule resource-intensive operations during off-hours
   - Implement queue-based processing for large organizations

## Future Enhancements

1. **Cross-Platform Support**:
   - Extend to macOS using Homebrew integration
   - Add Linux support with apt/yum package managers

2. **Advanced Analytics**:
   - Software usage tracking
   - Cost optimization recommendations
   - Predictive analytics for software requests

3. **Integration Extensions**:
   - ServiceNow integration for ITSM alignment
   - Power BI dashboards for reporting
   - Microsoft Endpoint Configuration Manager (MECM) integration

## References

- [Microsoft Intune Documentation](https://docs.microsoft.com/en-us/mem/intune/)
- [Chocolatey Documentation](https://docs.chocolatey.org/)
- [Microsoft Teams Bot Framework](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/overview)
- [Azure Bot Service](https://docs.microsoft.com/en-us/azure/bot-service/bot-service-overview-introduction)

## Appendix

### Sample Configurations

#### Chocolatey Configuration (chocolatey.config)

```xml
<?xml version="1.0" encoding="utf-8"?>
<chocolatey xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <config>
    <add key="cacheLocation" value="" />
    <add key="containsLegacyPackageInstalls" value="true" />
    <add key="commandExecutionTimeoutSeconds" value="2700" />
    <add key="proxy" value="" />
    <add key="proxyUser" value="" />
    <add key="proxyPassword" value="" />
    <add key="webRequestTimeoutSeconds" value="30" />
    <add key="proxyBypassList" value="" />
    <add key="proxyBypassOnLocal" value="true" />
  </config>
  <sources>
    <source id="chocolatey" value="https://chocolatey.org/api/v2/" disabled="false" priority="0" />
    <source id="internal-repo" value="http://internal-choco-repo/chocolatey" disabled="false" priority="-1" />
  </sources>
  <features>
    <feature name="checksumFiles" enabled="true" />
    <feature name="autoUninstaller" enabled="true" />
    <feature name="allowGlobalConfirmation" enabled="false" />
    <feature name="failOnAutoUninstaller" enabled="false" />
    <feature name="failOnStandardError" enabled="false" />
    <feature name="powershellHost" enabled="true" />
    <feature name="logEnvironmentValues" enabled="false" />
    <feature name="virusCheck" enabled="false" />
    <feature name="downloadCache" enabled="true" />
    <feature name="skipPackageUpgradesWhenNotInstalled" enabled="false" />
  </features>
  <apiKeys />
</chocolatey>
```

#### Intune Win32 App Detection Script (detect-chocolatey-app.ps1)

```powershell
$packageName = "vscode"
$installedPackages = choco list --local-only --limit-output

$packageInstalled = $installedPackages | Where-Object { $_ -match "^$packageName\|" }

if ($packageInstalled) {
    Write-Host "Installed: $packageInstalled"
    exit 0
} else {
    Write-Host "$packageName not installed"
    exit 1
}
```

#### Intune Win32 App Installation Script (install-chocolatey-app.ps1)

```powershell
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageName,
    
    [Parameter(Mandatory = $false)]
    [string]$Version,
    
    [Parameter(Mandatory = $false)]
    [string]$Source = ""
)

$chocoArgs = @("install", $PackageName, "-y", "--no-progress")

if ($Version) {
    $chocoArgs += "--version=$Version"
}

if ($Source) {
    $chocoArgs += "--source=$Source"
}

$process = Start-Process -FilePath "choco" -ArgumentList $chocoArgs -NoNewWindow -Wait -PassThru

exit $process.ExitCode
```

### Glossary

- **Chocolatey**: A package manager for Windows that can be used to automate software installation.
- **Intune**: Microsoft's cloud-based device management solution.
- **Win32 App**: A traditional Windows application (.exe, .msi) managed through Intune.
- **Bot Framework**: Microsoft's platform for building conversational bots.
- **Adaptive Cards**: Interactive cards that can be used in Teams to create rich interfaces.
- **Microsoft Graph API**: A unified API for accessing Microsoft cloud services.
- **CI/CD**: Continuous Integration/Continuous Deployment, automated software delivery process.
