# CI/CD Configuration Templates for Azure Functions

## Overview

Continuous Integration and Continuous Deployment (CI/CD) pipelines automate the process of building, testing, and deploying Azure Functions. This guide provides templates and best practices for setting up reliable CI/CD pipelines using Azure DevOps and GitHub Actions.

## Benefits of CI/CD for Azure Functions

- **Accelerated Delivery**: Automate the release process to deploy code changes quickly and frequently
- **Enhanced Code Quality**: Integrate automated testing to catch issues early
- **Reduced Manual Errors**: Standardize deployment processes to minimize human intervention
- **Increased Reliability**: Consistent deployment procedures lead to more stable releases
- **Improved Developer Experience**: Free developers from manual deployment tasks
- **Efficient Rollbacks**: Quickly revert to previous versions when issues arise

## Azure DevOps Pipeline Templates

### YAML Pipeline for .NET Functions

```yaml
# Azure DevOps YAML Pipeline for .NET Azure Functions
trigger:
  branches:
    include:
    - main
    - feature/*

pool:
  vmImage: 'windows-latest'

variables:
  buildConfiguration: 'Release'
  azureFunctionAppName: 'your-function-app-name'
  dotNetVersion: '8.x'

stages:
- stage: Build
  displayName: 'Build and Test'
  jobs:
  - job: BuildJob
    steps:
    - task: UseDotNet@2
      displayName: 'Use .NET SDK $(dotNetVersion)'
      inputs:
        packageType: 'sdk'
        version: '$(dotNetVersion)'

    - task: DotNetCoreCLI@2
      displayName: 'Restore NuGet packages'
      inputs:
        command: 'restore'
        projects: '**/*.csproj'

    - task: DotNetCoreCLI@2
      displayName: 'Build'
      inputs:
        command: 'build'
        projects: '**/*.csproj'
        arguments: '--configuration $(buildConfiguration)'

    - task: DotNetCoreCLI@2
      displayName: 'Run unit tests'
      inputs:
        command: 'test'
        projects: '**/*Tests/*.csproj'
        arguments: '--configuration $(buildConfiguration) --collect "Code coverage"'

    - task: DotNetCoreCLI@2
      displayName: 'Publish'
      inputs:
        command: 'publish'
        publishWebProjects: false
        projects: '**/FunctionApp.csproj'
        arguments: '--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)'
        zipAfterPublish: true

    - task: PublishBuildArtifacts@1
      displayName: 'Publish artifacts'
      inputs:
        pathToPublish: '$(Build.ArtifactStagingDirectory)'
        artifactName: 'drop'

- stage: Deploy
  displayName: 'Deploy to Azure Functions'
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: DeployFunction
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureFunctionApp@2
            displayName: 'Deploy Azure Function App'
            inputs:
              azureSubscription: 'Your-Azure-Subscription'
              appType: 'functionApp'
              appName: '$(azureFunctionAppName)'
              package: '$(Pipeline.Workspace)/drop/*.zip'
              deploymentMethod: 'auto'
```

### YAML Pipeline for Node.js Functions

```yaml
# Azure DevOps YAML Pipeline for Node.js Azure Functions
trigger:
  branches:
    include:
    - main
    - feature/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  azureFunctionAppName: 'your-node-function-app'
  nodeVersion: '18.x'

stages:
- stage: Build
  displayName: 'Build and Test'
  jobs:
  - job: BuildJob
    steps:
    - task: NodeTool@0
      displayName: 'Use Node.js $(nodeVersion)'
      inputs:
        versionSpec: '$(nodeVersion)'

    - script: |
        npm install
      workingDirectory: '$(System.DefaultWorkingDirectory)'
      displayName: 'npm install'

    - script: |
        npm run lint
      workingDirectory: '$(System.DefaultWorkingDirectory)'
      displayName: 'Run linting'

    - script: |
        npm test
      workingDirectory: '$(System.DefaultWorkingDirectory)'
      displayName: 'Run tests'

    - task: ArchiveFiles@2
      displayName: 'Archive files'
      inputs:
        rootFolderOrFile: '$(System.DefaultWorkingDirectory)'
        includeRootFolder: false
        archiveType: 'zip'
        archiveFile: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
        replaceExistingArchive: true
        exclude: |
          node_modules/**
          **/*.md
          .git/**
          .github/**
          .vscode/**
          test/**

    - task: PublishBuildArtifacts@1
      displayName: 'Publish artifacts'
      inputs:
        pathToPublish: '$(Build.ArtifactStagingDirectory)'
        artifactName: 'drop'

- stage: Deploy
  displayName: 'Deploy to Azure Functions'
  dependsOn: Build
  condition: succeeded()
  jobs:
  - deployment: DeployFunction
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureFunctionApp@2
            displayName: 'Deploy Azure Function App'
            inputs:
              azureSubscription: 'Your-Azure-Subscription'
              appType: 'functionAppLinux'
              appName: '$(azureFunctionAppName)'
              package: '$(Pipeline.Workspace)/drop/$(Build.BuildId).zip'
              runtimeStack: 'NODE|18'
              deploymentMethod: 'auto'
```

### Classic Pipeline Configuration (GUI-Based)

When using the classic editor in Azure DevOps, configure the following tasks:

1. **Build Pipeline**:
   - **Source**: Connect to your Azure Repos or GitHub repository
   - **Trigger**: Enable continuous integration for your main branch
   - **Agent pool**: Choose an appropriate agent (Windows/Linux based on function type)
   - **Tasks**:
     - Restore dependencies (NuGet/npm/pip)
     - Build the function app
     - Run unit tests
     - Package the function app
     - Publish the artifacts

2. **Release Pipeline**:
   - **Artifacts**: Link to the build pipeline output
   - **Trigger**: Enable continuous deployment
   - **Stages**:
     - **Development**:
       - Deploy to development function app
       - Run automated tests
     - **Staging** (with pre-deployment approval):
       - Deploy to staging slot of production function app
       - Run integration tests
     - **Production** (with pre-deployment approval):
       - Swap staging and production slots

## GitHub Actions Workflow Templates

### .NET Azure Functions

```yaml
name: Deploy .NET Azure Function App

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_NAME: your-function-app-name
  AZURE_FUNCTIONAPP_PACKAGE_PATH: './src/FunctionApp'
  DOTNET_VERSION: '8.0.x'

jobs:
  build-and-deploy:
    runs-on: windows-latest
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Setup .NET Core
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: ${{ env.DOTNET_VERSION }}

    - name: Restore dependencies
      run: dotnet restore

    - name: Build
      run: dotnet build --configuration Release --no-restore

    - name: Test
      run: dotnet test --no-restore --verbosity normal

    - name: Publish
      run: dotnet publish ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }} --configuration Release --output ./output

    - name: Deploy to Azure Functions
      uses: Azure/functions-action@v1
      with:
        app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
        package: ./output
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

### Node.js Azure Functions

```yaml
name: Deploy Node.js Azure Function App

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_NAME: your-node-function-app
  AZURE_FUNCTIONAPP_PACKAGE_PATH: '.'
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: ${{ env.NODE_VERSION }}

    - name: Install dependencies
      run: npm install

    - name: Test
      run: npm test

    - name: Package Functions
      run: |
        zip -r function-app.zip . -x "node_modules/*" "*.git*" ".github/*" "*.md" ".vscode/*" "test/*"

    - name: Deploy to Azure Functions
      uses: Azure/functions-action@v1
      with:
        app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
        package: function-app.zip
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## Advanced CI/CD Patterns

### Multi-Stage Environments

Configure pipelines to deploy across development, testing, staging, and production environments:

```yaml
stages:
- stage: Build
  # Build configuration...

- stage: DeployToDev
  dependsOn: Build
  condition: succeeded()
  # Deploy to development environment...

- stage: DeployToTest
  dependsOn: DeployToDev
  condition: succeeded()
  # Deploy to test environment...

- stage: DeployToStaging
  dependsOn: DeployToTest
  condition: succeeded()
  # Deploy to staging environment...

- stage: DeployToProduction
  dependsOn: DeployToStaging
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  # Deploy to production environment...
```

### Progressive Deployment

Implement slot swapping for zero-downtime deployments:

```yaml
# Deploy to staging slot
- task: AzureFunctionApp@2
  displayName: 'Deploy to Staging Slot'
  inputs:
    azureSubscription: 'Your-Azure-Subscription'
    appType: 'functionApp'
    appName: '$(azureFunctionAppName)'
    deployToSlotOrASE: true
    resourceGroupName: '$(resourceGroupName)'
    slotName: 'staging'
    package: '$(Pipeline.Workspace)/drop/*.zip'
    deploymentMethod: 'auto'

# Run integration tests against staging slot
- task: PowerShell@2
  displayName: 'Run Integration Tests'
  inputs:
    targetType: 'inline'
    script: |
      # Run integration tests against the staging slot
      # Example: Invoke-Pester -Path "./tests/Integration" -OutputFile "$(System.DefaultWorkingDirectory)/TestResults.xml" -OutputFormat NUnitXml

# Swap slots
- task: AzureAppServiceManage@0
  displayName: 'Swap Slots'
  inputs:
    azureSubscription: 'Your-Azure-Subscription'
    WebAppName: '$(azureFunctionAppName)'
    ResourceGroupName: '$(resourceGroupName)'
    SourceSlot: 'staging'
```

### Infrastructure as Code Integration

Incorporate ARM template deployment into your pipeline:

```yaml
- task: AzureResourceManagerTemplateDeployment@3
  displayName: 'Deploy Azure Function Infrastructure'
  inputs:
    deploymentScope: 'Resource Group'
    azureResourceManagerConnection: 'Your-Azure-Subscription'
    subscriptionId: '$(subscriptionId)'
    action: 'Create Or Update Resource Group'
    resourceGroupName: '$(resourceGroupName)'
    location: 'East US'
    templateLocation: 'Linked artifact'
    csmFile: '$(Pipeline.Workspace)/drop/arm-templates/function-app.json'
    csmParametersFile: '$(Pipeline.Workspace)/drop/arm-templates/function-app.parameters.json'
    deploymentMode: 'Incremental'
```

### Security Scanning

Integrate security scanning tools to identify vulnerabilities:

```yaml
- task: WhiteSource@21
  displayName: 'Run WhiteSource Bolt'
  inputs:
    cwd: '$(System.DefaultWorkingDirectory)'

- task: SonarCloudPrepare@1
  displayName: 'Prepare SonarCloud analysis'
  inputs:
    SonarCloud: 'Your-SonarCloud-Connection'
    organization: 'your-organization'
    scannerMode: 'MSBuild'
    projectKey: 'your-project-key'
    projectName: 'Your Project Name'
    extraProperties: |
      sonar.exclusions=**/obj/**,**/*.dll
      sonar.cs.opencover.reportsPaths=$(Build.SourcesDirectory)/**/coverage.opencover.xml
      sonar.cs.vstest.reportsPaths=$(Agent.TempDirectory)/*.trx

- task: SonarCloudAnalyze@1
  displayName: 'Run SonarCloud analysis'

- task: SonarCloudPublish@1
  displayName: 'Publish SonarCloud quality gate results'
```

## Best Practices for Azure Functions CI/CD

### 1. Pipeline Configuration

- **Use YAML pipelines**: Store pipeline definitions as code alongside your function app
- **Implement branch policies**: Require pull request reviews before merging to main branches
- **Utilize templates**: Create reusable templates for common tasks to maintain consistency
- **Keep secrets secure**: Store sensitive information in Azure Key Vault or pipeline variables

### 2. Build and Testing

- **Run comprehensive tests**: Include unit, integration, and load tests
- **Enforce code quality**: Integrate linting and static code analysis
- **Optimize build performance**: Implement caching for dependencies and parallel job execution
- **Maintain build artifacts**: Archive build outputs for traceability and rollback capability

### 3. Deployment Strategy

- **Use deployment slots**: Deploy to staging slots before swapping to production
- **Implement automated validation**: Run post-deployment tests to verify functionality
- **Configure rollback mechanisms**: Define procedures for quick rollbacks when issues occur
- **Monitor deployments**: Set up alerts and logging for deployment status and performance

### 4. Security and Compliance

- **Scan for vulnerabilities**: Integrate security scanning tools in your pipeline
- **Implement least privilege principles**: Use managed identities with minimal permissions
- **Enforce compliance checks**: Validate that deployments meet organizational standards
- **Audit deployments**: Maintain logs of all deployment activities for security and compliance

## Monitoring and Feedback

### Application Insights Integration

```yaml
- task: AzureFunctionApp@2
  displayName: 'Deploy Azure Function App'
  inputs:
    azureSubscription: 'Your-Azure-Subscription'
    appType: 'functionApp'
    appName: '$(azureFunctionAppName)'
    package: '$(Pipeline.Workspace)/drop/*.zip'
    appSettings: |
      -APPINSIGHTS_INSTRUMENTATIONKEY $(applicationInsightsInstrumentationKey)
      -APPLICATIONINSIGHTS_CONNECTION_STRING $(applicationInsightsConnectionString)
```

### Deployment Notifications

Add Teams or Slack notifications for deployment events:

```yaml
- task: PowerShell@2
  displayName: 'Send Deployment Notification'
  inputs:
    targetType: 'inline'
    script: |
      $body = @{
        "text" = "Function App $(azureFunctionAppName) has been deployed to $(releaseEnvironmentName)"
      }
      Invoke-RestMethod -Uri $(teamsWebhookUrl) -Method Post -Body (ConvertTo-Json $body) -ContentType "application/json"
```

## References

- [Official Microsoft Azure Functions CI/CD Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-azure-devops)
- [Azure DevOps Multi-Stage Pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/stages)
- [GitHub Actions for Azure Functions](https://github.com/marketplace/actions/azure-functions-action)
- [Azure Functions Infrastructure as Code](https://learn.microsoft.com/en-us/azure/azure-functions/functions-infrastructure-as-code)
- [Azure App Service Deployment Best Practices](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices)
