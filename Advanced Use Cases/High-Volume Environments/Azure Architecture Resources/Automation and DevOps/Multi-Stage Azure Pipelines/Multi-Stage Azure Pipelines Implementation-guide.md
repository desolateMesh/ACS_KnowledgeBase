# Multi-Stage Azure Pipelines: Implementation Guide

## Version
2.0

## Date
2025-04-19

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Prerequisites](#2-prerequisites)
   2.1 [Required Tools and Resources](#21-required-tools-and-resources)
   2.2 [Azure DevOps Configuration](#22-azure-devops-configuration)
   2.3 [Azure Resource Requirements](#23-azure-resource-requirements)
3. [Pipeline Structure Fundamentals](#3-pipeline-structure-fundamentals)
   3.1 [YAML Pipeline Anatomy](#31-yaml-pipeline-anatomy)
   3.2 [Stages, Jobs, and Steps Hierarchy](#32-stages-jobs-and-steps-hierarchy)
   3.3 [Working with Variables and Parameters](#33-working-with-variables-and-parameters)
4. [Setting Up Your First Multi-Stage Pipeline](#4-setting-up-your-first-multi-stage-pipeline)
   4.1 [Creating the Pipeline Definition](#41-creating-the-pipeline-definition)
   4.2 [Configuring Build Stage](#42-configuring-build-stage)
   4.3 [Adding Test and Validation Stages](#43-adding-test-and-validation-stages)
   4.4 [Implementing Deployment Stages](#44-implementing-deployment-stages)
   4.5 [Artifact Handling Between Stages](#45-artifact-handling-between-stages)
5. [Advanced Configuration Techniques](#5-advanced-configuration-techniques)
   5.1 [Environment Approvals and Checks](#51-environment-approvals-and-checks)
   5.2 [Deployment Strategies](#52-deployment-strategies)
   5.3 [Templates and Reusable Components](#53-templates-and-reusable-components)
   5.4 [Conditional Stage Execution](#54-conditional-stage-execution)
   5.5 [Service Connections and Security](#55-service-connections-and-security)
6. [Integration with Azure Services](#6-integration-with-azure-services)
   6.1 [App Service Deployments](#61-app-service-deployments)
   6.2 [Azure Kubernetes Service (AKS)](#62-azure-kubernetes-service-aks)
   6.3 [Azure Functions](#63-azure-functions)
   6.4 [Database Deployments](#64-database-deployments)
   6.5 [Infrastructure as Code Integration](#65-infrastructure-as-code-integration)
7. [Monitoring and Observability](#7-monitoring-and-observability)
   7.1 [Pipeline Analytics](#71-pipeline-analytics)
   7.2 [Environment Health Monitoring](#72-environment-health-monitoring)
   7.3 [Logging and Diagnostics](#73-logging-and-diagnostics)
8. [Pipeline Optimization for High-Volume Environments](#8-pipeline-optimization-for-high-volume-environments)
   8.1 [Caching Strategies](#81-caching-strategies)
   8.2 [Self-Hosted Agents](#82-self-hosted-agents)
   8.3 [Parallel Execution](#83-parallel-execution)
   8.4 [Resource Management](#84-resource-management)
9. [Security and Compliance](#9-security-and-compliance)
   9.1 [Secret Management](#91-secret-management)
   9.2 [Compliance Checks](#92-compliance-checks)
   9.3 [Audit and Governance](#93-audit-and-governance)
10. [References and Resources](#10-references-and-resources)

---

## 1. Introduction

This implementation guide provides comprehensive, step-by-step instructions for setting up and optimizing multi-stage Azure Pipelines. Multi-stage pipelines enable the orchestration of continuous integration and continuous delivery (CI/CD) workflows across multiple environments with governance controls and deployment strategies tailored to enterprise requirements.

Key benefits of multi-stage pipelines include:

- **Environment progression** - Control the flow of releases through development, testing, staging, and production
- **Deployment automation** - Standardize deployment processes across all environments
- **Quality gates** - Implement automated checks and manual approvals between stages
- **Traceability** - Track changes from code commit to production deployment
- **Pipeline as code** - Define pipelines as version-controlled YAML definitions
- **Compliance** - Enforce organizational policies and regulatory requirements

This guide is designed for DevOps engineers, release managers, and platform teams responsible for implementing reliable, scalable CI/CD processes in Azure environments.

---

## 2. Prerequisites

### 2.1 Required Tools and Resources

To implement multi-stage Azure Pipelines, you'll need:

- **Azure DevOps Organization** - A project with Pipelines feature enabled
- **Source Code Repository** - Azure Repos, GitHub, or another supported Git provider
- **Azure Subscription** - Active subscription for deploying resources
- **Pipeline Agents** - Microsoft-hosted or self-hosted agents for running jobs
- **Development Environment** - VS Code or Azure DevOps web editor for YAML editing

Recommended tools:
- **Azure CLI** - Version 2.45.0 or later for local testing
- **PowerShell** - Version 7.3 or later for custom scripts
- **YAML Extension** - For your preferred code editor

### 2.2 Azure DevOps Configuration

1. **Project Setup**:
   - Navigate to `https://dev.azure.com/{yourorganization}`
   - Create or select an existing project
   - Ensure Pipelines feature is enabled under Project Settings > General

2. **Service Connections**:
   - Go to Project Settings > Service Connections
   - Create a new service connection to Azure Resource Manager
   - Choose either Service Principal or Managed Identity authentication
   - Set appropriate scope (subscription or resource group)

3. **Agent Pools**:
   - Go to Project Settings > Agent pools
   - Review available Microsoft-hosted pools or set up self-hosted agents
   - For high-volume environments, consider dedicated self-hosted agents

4. **Environments**:
   - Navigate to Pipelines > Environments
   - Create environments for your deployment targets (Dev, Test, Staging, Production)
   - Configure approvals and checks for secure environments

### 2.3 Azure Resource Requirements

Ensure your Azure subscription has:

- Appropriate resource providers registered
- Required resource groups created for each environment
- RBAC permissions configured for service principals
- Networking rules allowing pipeline agent access to resources
- Sufficient quota for the resources you plan to deploy

---

## 3. Pipeline Structure Fundamentals

### 3.1 YAML Pipeline Anatomy

Azure Pipelines YAML files follow a hierarchical structure:

```yaml
# Pipeline definition
trigger:
  - main  # Configure trigger branches

variables:
  - name: serviceConnection
    value: 'MyAzureConnection'

stages:
  - stage: Build
    jobs:
      - job: CompileCode
        steps:
          - task: DotNetCoreCLI@2
            inputs:
              command: 'build'
              projects: '**/*.csproj'
          
  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployWebApp
        environment: 'Development'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: $(serviceConnection)
                    appName: 'mywebapp'
```

Key components:
- **Triggers** - Define when the pipeline runs (commits, PRs, schedules)
- **Variables** - Define values that can be used throughout the pipeline
- **Stages** - Major pipeline divisions, often mapping to environments
- **Jobs** - Groups of steps that run on an agent
- **Steps** - Individual tasks or script blocks
- **Tasks** - Pre-packaged actions from the Azure DevOps marketplace

### 3.2 Stages, Jobs, and Steps Hierarchy

Understanding the hierarchy is essential for effective pipeline design:

1. **Stages** are the top-level components of a pipeline:
   - Run sequentially by default (can be parallel with conditions)
   - Often represent environments or major pipeline phases
   - Contain one or more jobs
   - Can depend on other stages using `dependsOn`

2. **Jobs** are collections of steps:
   - Run on a single agent (virtual machine or container)
   - Can be executed in parallel within a stage
   - Contain steps that execute sequentially
   - Special job type: `deployment` jobs support deployment strategies

3. **Steps** are individual units of work:
   - Run sequentially within a job
   - Can be tasks (e.g., `AzureWebApp@1`) or scripts
   - Share the same agent workspace within a job

### 3.3 Working with Variables and Parameters

Variables make pipelines dynamic and reusable:

1. **Pipeline variables**:
   ```yaml
   variables:
     - name: environment
       value: 'Development'
     - name: azureRegion
       value: 'eastus'
   ```

2. **Variable groups** for shared values:
   ```yaml
   variables:
     - group: Common-Variables
     - group: Development-Variables
   ```

3. **Stage-level variables**:
   ```yaml
   stages:
     - stage: Deploy
       variables:
         - name: deploymentPool
           value: 'linux-agents'
   ```

4. **Parameters** for pipeline inputs:
   ```yaml
   parameters:
     - name: environment
       displayName: 'Deployment Environment'
       type: string
       default: 'Development'
       values:
         - Development
         - Test
         - Production
   ```

5. **Environment-specific variable groups**:
   ```yaml
   stages:
     - stage: DeployToDev
       variables:
         - group: Development-Variables
     - stage: DeployToTest
       variables:
         - group: Test-Variables
   ```

---

## 4. Setting Up Your First Multi-Stage Pipeline

### 4.1 Creating the Pipeline Definition

1. In your repository, create a new file `.azure-pipelines/main-pipeline.yml`

2. Add the basic pipeline structure:
   ```yaml
   trigger:
     branches:
       include:
         - main
     paths:
       include:
         - src/**
       exclude:
         - docs/**

   variables:
     - name: buildConfiguration
       value: 'Release'
     - name: dotnetVersion
       value: '7.0.x'

   stages:
     - stage: Build
       displayName: 'Build Application'
       jobs:
         - job: BuildJob
           displayName: 'Build, Test and Publish'
           pool:
             vmImage: 'ubuntu-latest'
           steps:
             # Steps will be added in the next section
   ```

3. In Azure DevOps, create a new pipeline:
   - Go to Pipelines > Pipelines > Create Pipeline
   - Select your repository type
   - Configure your repository connection
   - Choose "Existing Azure Pipelines YAML file"
   - Select the path to your YAML file
   - Click "Continue" and then "Save"

### 4.2 Configuring Build Stage

Add these steps to your Build stage:

```yaml
steps:
  - task: UseDotNet@2
    displayName: 'Use .NET Core SDK $(dotnetVersion)'
    inputs:
      version: $(dotnetVersion)

  - task: DotNetCoreCLI@2
    displayName: 'Restore NuGet packages'
    inputs:
      command: 'restore'
      projects: '**/*.csproj'

  - task: DotNetCoreCLI@2
    displayName: 'Build solution'
    inputs:
      command: 'build'
      projects: '**/*.csproj'
      arguments: '--configuration $(buildConfiguration)'

  - task: DotNetCoreCLI@2
    displayName: 'Run unit tests'
    inputs:
      command: 'test'
      projects: '**/*Tests.csproj'
      arguments: '--configuration $(buildConfiguration) --collect:"XPlat Code Coverage"'

  - task: DotNetCoreCLI@2
    displayName: 'Publish application'
    inputs:
      command: 'publish'
      publishWebProjects: true
      arguments: '--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)'
      zipAfterPublish: true

  - task: PublishPipelineArtifact@1
    displayName: 'Publish pipeline artifact'
    inputs:
      targetPath: '$(Build.ArtifactStagingDirectory)'
      artifactName: 'drop'
```

This build stage will:
1. Set up the required .NET SDK
2. Restore dependencies
3. Build the solution
4. Run unit tests with code coverage
5. Create a deployment package
6. Publish the package as a pipeline artifact

### 4.3 Adding Test and Validation Stages

Add a Test stage that depends on the Build stage:

```yaml
- stage: Test
  displayName: 'Validate and Test'
  dependsOn: Build
  jobs:
    - job: SecurityScan
      displayName: 'Security Scanning'
      pool:
        vmImage: 'ubuntu-latest'
      steps:
        - task: DownloadPipelineArtifact@2
          inputs:
            artifactName: 'drop'
            downloadPath: '$(System.ArtifactsDirectory)'
        
        - task: WhiteSource@21
          inputs:
            cwd: '$(System.ArtifactsDirectory)'
        
        - task: PublishSecurityAnalysisLogs@3
          inputs:
            ArtifactName: 'CodeAnalysisLogs'
            ArtifactType: 'Container'
    
    - job: IntegrationTests
      displayName: 'Integration Tests'
      pool:
        vmImage: 'ubuntu-latest'
      steps:
        - task: DownloadPipelineArtifact@2
          inputs:
            artifactName: 'drop'
            downloadPath: '$(System.ArtifactsDirectory)'
        
        - task: DotNetCoreCLI@2
          inputs:
            command: 'test'
            projects: '**/*Integration.Tests.csproj'
            arguments: '--configuration $(buildConfiguration)'
```

This Test stage runs two jobs in parallel:
1. Security scanning of the built artifacts
2. Integration tests against the application

### 4.4 Implementing Deployment Stages

Now add deployment stages for each environment:

```yaml
- stage: DevDeploy
  displayName: 'Deploy to Development'
  dependsOn: Test
  jobs:
    - deployment: DeployWebApp
      displayName: 'Deploy Web Application'
      environment: 'Development'
      pool:
        vmImage: 'ubuntu-latest'
      strategy:
        runOnce:
          deploy:
            steps:
              - task: DownloadPipelineArtifact@2
                inputs:
                  artifactName: 'drop'
                  downloadPath: '$(Pipeline.Workspace)'
              
              - task: AzureWebApp@1
                inputs:
                  azureSubscription: 'YourAzureServiceConnection'
                  appType: 'webApp'
                  appName: 'myapp-dev'
                  deployToSlotOrASE: true
                  resourceGroupName: 'myapp-dev-rg'
                  slotName: 'staging'
                  package: '$(Pipeline.Workspace)/**/*.zip'
                  deploymentMethod: 'auto'

              - task: AzureAppServiceManage@0
                inputs:
                  azureSubscription: 'YourAzureServiceConnection'
                  Action: 'Swap Slots'
                  WebAppName: 'myapp-dev'
                  ResourceGroupName: 'myapp-dev-rg'
                  SourceSlot: 'staging'
                  SwapWithProduction: true

- stage: StagingDeploy
  displayName: 'Deploy to Staging'
  dependsOn: DevDeploy
  jobs:
    - deployment: DeployWebApp
      displayName: 'Deploy Web Application'
      environment: 'Staging'
      pool:
        vmImage: 'ubuntu-latest'
      strategy:
        runOnce:
          deploy:
            steps:
              # Similar deployment steps as DevDeploy
              # but targeting 'myapp-staging' app

- stage: ProdDeploy
  displayName: 'Deploy to Production'
  dependsOn: StagingDeploy
  jobs:
    - deployment: DeployWebApp
      displayName: 'Deploy Web Application'
      environment: 'Production'
      pool:
        vmImage: 'ubuntu-latest'
      strategy:
        runOnce:
          deploy:
            steps:
              # Similar deployment steps as DevDeploy
              # but targeting 'myapp-prod' app
```

Key points about the deployment stages:
- Each uses the `deployment` job type, which supports deployment strategies
- Each targets a specific environment, which can have approvals and checks
- The `runOnce` strategy is used for simple deployments (other options include `rolling`, `canary`, etc.)
- Each stage depends on successful completion of the previous stage
- Blue/green deployment pattern implemented with slot swaps

### 4.5 Artifact Handling Between Stages

Artifacts are crucial for multi-stage pipelines:

1. **Publishing artifacts** in the build stage:
   ```yaml
   - task: PublishPipelineArtifact@1
     inputs:
       targetPath: '$(Build.ArtifactStagingDirectory)'
       artifactName: 'drop'
   ```

2. **Downloading artifacts** in downstream stages:
   ```yaml
   - task: DownloadPipelineArtifact@2
     inputs:
       artifactName: 'drop'
       downloadPath: '$(Pipeline.Workspace)'
   ```

3. **Best practices for artifacts**:
   - Use unique, descriptive names for different artifact types
   - Include version information in artifact names for clarity
   - Consider artifact retention policies for storage management
   - Use artifact paths consistently across stages

---

## 5. Advanced Configuration Techniques

### 5.1 Environment Approvals and Checks

Configure environments with approval workflows:

1. In Azure DevOps, go to Pipelines > Environments
2. Select or create an environment (e.g., "Production")
3. Navigate to Approvals and Checks
4. Add an approval check:
   - Add users or groups as approvers
   - Set minimum required approvals (e.g., 2)
   - Configure timeout (e.g., 7 days)
   - Optionally include instructions for approvers

Additional checks you can implement:
- **Business hours deployment**: Restrict deployments to specific hours
- **Branch control**: Ensure deployments come from specific branches
- **Required template**: Enforce specific template usage
- **Evaluate artifact**: Scan artifacts before deployment
- **Service hook**: Integrate with external systems
- **REST API**: Implement custom validation logic

### 5.2 Deployment Strategies

Azure Pipelines supports multiple deployment strategies:

1. **runOnce** (simple deployments):
   ```yaml
   strategy:
     runOnce:
       deploy:
         steps:
           # Deployment steps here
   ```

2. **rolling** (progressive deployments):
   ```yaml
   strategy:
     rolling:
       maxParallel: 2  # Number of targets to deploy to in parallel
       deploy:
         steps:
           # Deployment steps here
   ```

3. **canary** (staged percentage-based releases):
   ```yaml
   strategy:
     canary:
       increments: [10, 20, 70]  # Percentage of targets for each increment
       deploy:
         steps:
           # Deployment steps
   ```

4. Custom deployment strategies using **lifecycle hooks**:
   ```yaml
   strategy:
     runOnce:
       preDeploy:
         steps:
           # Steps before deployment
       deploy:
         steps:
           # Main deployment steps
       routeTraffic:
         steps:
           # Steps to shift traffic
       postRouteTraffic:
         steps:
           # Post-traffic shift validation
       on:
         success:
           steps:
             # Steps on successful deployment
         failure:
           steps:
             # Steps on failed deployment
   ```

### 5.3 Templates and Reusable Components

Using templates improves maintainability:

1. **Stage templates** (`templates/build-stage.yml`):
   ```yaml
   parameters:
     buildConfiguration: 'Release'
     
   stages:
   - stage: Build
     jobs:
     - job: Compile
       steps:
       - task: DotNetCoreCLI@2
         inputs:
           command: 'build'
           projects: '**/*.csproj'
           arguments: '--configuration ${{ parameters.buildConfiguration }}'
   ```

2. **Job templates** (`templates/security-scan-job.yml`):
   ```yaml
   parameters:
     artifactName: 'drop'
     
   jobs:
   - job: SecurityScan
     steps:
     - task: DownloadPipelineArtifact@2
       inputs:
         artifactName: ${{ parameters.artifactName }}
     - task: SecurityCheck@1
       # Security check configuration
   ```

3. **Step templates** (`templates/dotnet-build-steps.yml`):
   ```yaml
   parameters:
     buildConfiguration: 'Release'
     
   steps:
   - task: DotNetCoreCLI@2
     inputs:
       command: 'restore'
   - task: DotNetCoreCLI@2
     inputs:
       command: 'build'
       arguments: '--configuration ${{ parameters.buildConfiguration }}'
   ```

4. **Including templates** in your main pipeline:
   ```yaml
   stages:
   - template: templates/build-stage.yml
     parameters:
       buildConfiguration: 'Release'
       
   - stage: Test
     jobs:
     - template: templates/security-scan-job.yml
       parameters:
         artifactName: 'drop'
   ```

### 5.4 Conditional Stage Execution

Control stage execution using conditions:

1. **Basic conditions**:
   ```yaml
   stages:
   - stage: DeployToProd
     condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
     jobs:
     # ...
   ```

2. **Condition based on parameters**:
   ```yaml
   parameters:
   - name: deployProduction
     type: boolean
     default: false
     
   stages:
   - stage: DeployToProd
     condition: and(succeeded(), eq('${{ parameters.deployProduction }}', 'true'))
     jobs:
     # ...
   ```

3. **Stage dependencies with conditions**:
   ```yaml
   stages:
   - stage: Build
     # ...
   
   - stage: Test
     dependsOn: Build
     condition: succeeded('Build')
     # ...
     
   - stage: Deploy
     dependsOn: Test
     condition: in(dependencies.Test.result, 'Succeeded', 'SucceededWithIssues')
     # ...
   ```

4. **Expression functions** for complex conditions:
   ```yaml
   stages:
   - stage: DeployToRegion
     condition: |
       and(
         succeeded(),
         or(
           eq(variables['Build.SourceBranch'], 'refs/heads/main'),
           eq(variables['Build.Reason'], 'Manual')
         ),
         ne(variables['skipDeployment'], 'true')
       )
     # ...
   ```

### 5.5 Service Connections and Security

Manage secure access to resources:

1. **Reference service connections** in your pipeline:
   ```yaml
   jobs:
   - deployment: DeployWebApp
     environment: 'Production'
     strategy:
       runOnce:
         deploy:
           steps:
           - task: AzureWebApp@1
             inputs:
               azureSubscription: 'Production-ServiceConnection'  # Service connection name
               appName: 'my-web-app'
   ```

2. **Scope service connections** to specific pipelines in Azure DevOps:
   - Go to Project Settings > Service connections
   - Edit your service connection
   - Under Security, select "Grant access permission to specific pipelines"
   - Choose the pipelines that can use this connection

3. **Use different connections** for different environments:
   ```yaml
   stages:
   - stage: DeployToDev
     jobs:
     - deployment: Deploy
       environment: Development
       steps:
       - task: AzureWebApp@1
         inputs:
           azureSubscription: 'Dev-ServiceConnection'
           # Other inputs...
           
   - stage: DeployToProd
     jobs:
     - deployment: Deploy
       environment: Production
       steps:
       - task: AzureWebApp@1
         inputs:
           azureSubscription: 'Prod-ServiceConnection'
           # Other inputs...
   ```

4. **Manage secrets** securely:
   - Store secrets in Azure Key Vault
   - Use variable groups linked to Key Vault
   - Reference secrets in your pipeline:
     ```yaml
     variables:
     - group: 'KeyVault-Secrets'
     
     steps:
     - script: |
         echo "Using connection string: $(ConnectionString)"
       displayName: 'Example script'
     ```

---

## 6. Integration with Azure Services

### 6.1 App Service Deployments

Deploy to Azure App Service:

```yaml
- task: AzureWebApp@1
  inputs:
    azureSubscription: '$(serviceConnection)'
    appType: 'webApp'  # Options: webApp, webAppLinux, webAppContainer, functionApp, etc.
    appName: '$(appServiceName)'
    deployToSlotOrASE: true
    resourceGroupName: '$(resourceGroupName)'
    slotName: 'staging'
    package: '$(Pipeline.Workspace)/drop/*.zip'
    deploymentMethod: 'auto'  # Options: auto, zipDeploy, runFromPackage
```

For slot swaps:

```yaml
- task: AzureAppServiceManage@0
  inputs:
    azureSubscription: '$(serviceConnection)'
    Action: 'Swap Slots'
    WebAppName: '$(appServiceName)'
    ResourceGroupName: '$(resourceGroupName)'
    SourceSlot: 'staging'
    SwapWithProduction: true
```

### 6.2 Azure Kubernetes Service (AKS)

Deploy to AKS with kubectl:

```yaml
- task: KubernetesManifest@0
  inputs:
    action: 'deploy'
    kubernetesServiceConnection: 'my-aks-connection'
    namespace: '$(k8sNamespace)'
    manifests: '$(Pipeline.Workspace)/k8s/*.yaml'
    containers: |
      $(containerRegistry)/$(imageRepository):$(tag)
    imagePullSecrets: |
      $(imagePullSecret)
```

Using Helm:

```yaml
- task: HelmDeploy@0
  inputs:
    connectionType: 'Azure Resource Manager'
    azureSubscription: '$(serviceConnection)'
    azureResourceGroup: '$(resourceGroupName)'
    kubernetesCluster: '$(aksClusterName)'
    namespace: '$(helmNamespace)'
    command: 'upgrade'
    chartType: 'FilePath'
    chartPath: '$(Pipeline.Workspace)/helm/myapp'
    releaseName: '$(releaseName)'
    overrideValues: 'image.tag=$(tag),replicaCount=3'
    valueFile: '$(Pipeline.Workspace)/helm/values-$(Environment.Name).yaml'
```

### 6.3 Azure Functions

Deploy serverless functions:

```yaml
- task: AzureFunctionApp@1
  inputs:
    azureSubscription: '$(serviceConnection)'
    appType: 'functionApp'
    appName: '$(functionAppName)'
    package: '$(Pipeline.Workspace)/drop/*.zip'
    deploymentMethod: 'auto'
```

For container-based functions:

```yaml
- task: AzureFunctionAppContainer@1
  inputs:
    azureSubscription: '$(serviceConnection)'
    appName: '$(functionAppName)'
    imageName: '$(containerRegistry)/$(imageRepository):$(tag)'
```

### 6.4 Database Deployments

Deploy database changes with DACPAC:

```yaml
- task: SqlAzureDacpacDeployment@1
  inputs:
    azureSubscription: '$(serviceConnection)'
    AuthenticationType: 'server'
    ServerName: '$(sqlServerName).database.windows.net'
    DatabaseName: '$(databaseName)'
    SqlUsername: '$(sqlUsername)'
    SqlPassword: '$(sqlPassword)'
    DacpacFile: '$(Pipeline.Workspace)/drop/Database.dacpac'
    AdditionalArguments: '/p:BlockOnPossibleDataLoss=false'
```

Using SQL scripts:

```yaml
- task: SqlAzureDacpacDeployment@1
  inputs:
    azureSubscription: '$(serviceConnection)'
    AuthenticationType: 'server'
    ServerName: '$(sqlServerName).database.windows.net'
    DatabaseName: '$(databaseName)'
    SqlUsername: '$(sqlUsername)'
    SqlPassword: '$(sqlPassword)'
    TaskNameSelector: 'SqlTask'
    SqlFile: '$(Pipeline.Workspace)/drop/Scripts/Update.sql'
    IpDetectionMethod: 'AutoDetect'
```

### 6.5 Infrastructure as Code Integration

Deploy with Azure Resource Manager (ARM) templates:

```yaml
- task: AzureResourceManagerTemplateDeployment@3
  inputs:
    deploymentScope: 'Resource Group'
    azureResourceManagerConnection: '$(serviceConnection)'
    subscriptionId: '$(subscriptionId)'
    action: 'Create Or Update Resource Group'
    resourceGroupName: '$(resourceGroupName)'
    location: '$(location)'
    templateLocation: 'Linked artifact'
    csmFile: '$(Pipeline.Workspace)/drop/arm/template.json'
    csmParametersFile: '$(Pipeline.Workspace)/drop/arm/parameters.$(Environment.Name).json'
    deploymentMode: 'Incremental'
    deploymentOutputs: 'armOutputs'
```

Deploy with Terraform:

```yaml
- task: TerraformTaskV3@3
  inputs:
    provider: 'azurerm'
    command: 'init'
    workingDirectory: '$(Pipeline.Workspace)/drop/terraform'
    backendServiceArm: '$(serviceConnection)'
    backendAzureRmResourceGroupName: '$(tfStateRG)'
    backendAzureRmStorageAccountName: '$(tfStateStorageAccount)'
    backendAzureRmContainerName: '$(tfStateContainer)'
    backendAzureRmKey: '$(Environment.Name).terraform.tfstate'

- task: TerraformTaskV3@3
  inputs:
    provider: 'azurerm'
    command: 'apply'
    workingDirectory: '$(Pipeline.Workspace)/drop/terraform'
    environmentServiceNameAzureRM: '$(serviceConnection)'
    commandOptions: '-var-file="$(Environment.Name).tfvars" -auto-approve'
```

---

## 7. Monitoring and Observability

### 7.1 Pipeline Analytics

Monitor pipeline performance in Azure DevOps:

1. Navigate to Pipelines > Analytics
2. View metrics such as:
   - Pipeline duration
   - Pass rate
   - Success by stage
   - Wait time in approvals

Custom pipeline analytics with PowerBI:
1. Use Azure DevOps OData API to extract pipeline metrics
2. Connect PowerBI to the OData endpoint
3. Create dashboards for:
   - Deployment frequency
   - Lead time for changes
   - Mean time to recover
   - Change failure rate

### 7.2 Environment Health Monitoring

Integrate deployment verification:

```yaml
- task: AzureMonitor@1
  inputs:
    connectedServiceNameARM: '$(serviceConnection)'
    resourceGroupName: '$(resourceGroupName)'
    resourceName: '$(appServiceName)'
    alertRules: 'Critical Alerts'
```

Add post-deployment health checks:

```yaml
- script: |
    RETRY_COUNT=0
    MAX_RETRY=5
    HEALTH_URL="https://$(appServiceName).azurewebsites.net/health"
    
    while [ $RETRY_COUNT -lt $MAX_RETRY ]
    do
      HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
      if [ $HTTP_STATUS -eq 200 ]; then
        echo "Health check passed!"
        exit 0
      else
        echo "Health check failed with status $HTTP_STATUS. Retrying..."
        RETRY_COUNT=$((RETRY_COUNT+1))
        sleep 10
      fi
    done
    
    echo "Health check failed after $MAX_RETRY attempts"
    exit 1
  displayName: 'Verify application health'
```

### 7.3 Logging and Diagnostics

Enable pipeline diagnostics:

```yaml
steps:
- task: PowerShell@2
  inputs:
    targetType: 'inline'
    script: |
      Write-Host "##[debug]Debug information"
      Write-Host "##[command]Showing command being run"
      Write-Host "##[section]Starting new section"
      Write-Host "##[warning]Warning message"
      Write-Host "##[error]Error message"
  displayName: 'Pipeline diagnostics example'
```

Log deployment information to Azure Monitor:

```yaml
- task: AzureCLI@2
  inputs:
    azureSubscription: '$(serviceConnection)'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: |
      az monitor log-analytics query \
        --workspace $WORKSPACE_ID \
        --analytics-query "let deployEvent = datatable(EventTime:datetime, Environment:string, Status:string, Version:string, CommitId:string) [
          datetime('$(Build.StartTime)'), '$(Environment.Name)', 'Success', '$(Build.BuildNumber)', '$(Build.SourceVersion)'
        ]; deployEvent" \
        --out table
  displayName: 'Log deployment event'
  condition: succeeded()
```

---

## 8. Pipeline Optimization for High-Volume Environments

### 8.1 Caching Strategies

Implement caching to speed up builds:

```yaml
steps:
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    restoreKeys: |
      npm | "$(Agent.OS)"
    path: '$(Pipeline.Workspace)/.npm'
  displayName: 'Cache npm packages'

- script: npm ci
  displayName: 'npm ci'
```

For .NET projects:

```yaml
steps:
- task: Cache@2
  inputs:
    key: 'nuget | "$(Agent.OS)" | **/packages.lock.json,!**/bin/**,!**/obj/**'
    restoreKeys: |
      nuget | "$(Agent.OS)"
    path: '$(Pipeline.Workspace)/.nuget/packages'
  displayName: 'Cache NuGet packages'

- task: DotNetCoreCLI@2
  inputs:
    command: 'restore'
    projects: '**/*.csproj'
  displayName: 'dotnet restore'
```

### 8.2 Self-Hosted Agents

Configure self-hosted agents for better performance:

1. Create agent pools in Azure DevOps:
   - Go to Project Settings > Agent pools
   - Create a new pool (e.g., "High-Performance")

2. Install and configure agents:
   - Download the agent package
   - Configure with appropriate capabilities
   - Register with your Azure DevOps organization

3. Use the agent pool in your pipeline:
   ```yaml
   pool:
     name: 'High-Performance'
   ```

4. Agent sizing recommendations:
   - CPU: 4+ cores for build agents
   - Memory: 8GB+ RAM
   - Disk: SSD with at least 100GB free space
   - Network: High bandwidth, low latency connection to Azure

### 8.3 Parallel Execution

Optimize execution with parallelism:

1. **Matrix strategy** for parallel testing:
   ```yaml
   jobs:
   - job: Test
     strategy:
       matrix:
         Windows:
           vmImage: 'windows-latest'
           platform: 'win'
         Linux:
           vmImage: 'ubuntu-latest'
           platform: 'linux'
         macOS:
           vmImage: 'macOS-latest'
           platform: 'mac'
     steps:
     - script: echo Running tests for $(platform)
   ```

2. **Parallel task** for distributed tests:
   ```yaml
   - task: DotNetCoreCLI@2
     inputs:
       command: 'test'
       projects: '**/*Tests.csproj'
       arguments: '--configuration $(buildConfiguration) --filter Category=$(testCategory) -- RunConfiguration.MaxCpuCount=0'
   ```

3. **Fan out / fan in** pattern:
   ```yaml
   stages:
   - stage: Build
     jobs:
     - job: BuildApp
       # Build job steps
       
   - stage: Test
     dependsOn: Build
     jobs:
     - job: UnitTests
       # Unit test steps
     - job: IntegrationTests
       # Integration test steps
     - job: E2ETests
       # End-to-end test steps
       
   - stage: Deploy
     dependsOn: Test
     # Deployment after all test jobs succeed
   ```

### 8.4 Resource Management

Optimize resource usage:

1. **Pipeline timeouts**:
   ```yaml
   jobs:
   - job: LongRunningJob
     timeoutInMinutes: 120  # 2 hours
     steps:
     # Job steps
   ```

2. **Cancel outdated runs**:
   ```yaml
   trigger:
     batch: true  # Cancel pending runs
   ```

3. **Skip duplicate runs**:
   ```yaml
   trigger:
     batch: false
     autoCancel: true  # Cancel previous runs
   ```

4. **Resources cleanup**:
   ```yaml
   jobs:
   - job: Cleanup
     condition: always()  # Run even if previous stages fail
     steps:
     - task: AzureCLI@2
       inputs:
         azureSubscription: '$(serviceConnection)'
         scriptType: 'bash'
         scriptLocation: 'inlineScript'
         inlineScript: |
           az group delete --name $(tempResourceGroup) --yes --no-wait
   ```

---

## 9. Security and Compliance

### 9.1 Secret Management

Secure sensitive data in pipelines:

1. **Variable groups** with secret variables:
   - Create in Azure DevOps Library
   - Mark sensitive values as secrets
   - Reference in pipelines:
     ```yaml
     variables:
     - group: 'Production-Secrets'
     ```

2. **Azure Key Vault** integration:
   - Create a variable group linked to Key Vault
   - Enable Azure Key Vault secrets as variables
   - Grant pipeline access to Key Vault
   - Reference in pipelines:
     ```yaml
     variables:
     - group: 'KeyVault-LinkedGroup'
     
     steps:
     - script: |
         echo "Using connection string: $(ConnectionString)"
     ```

3. **Secure files** for certificates and configuration:
   ```yaml
   steps:
   - task: DownloadSecureFile@1
     name: certificateFile
     inputs:
       secureFile: 'certificate.pfx'
       
   - script: |
       echo "Certificate path: $(certificateFile.secureFilePath)"
   ```

### 9.2 Compliance Checks

Implement compliance validations:

1. **Static code analysis**:
   ```yaml
   - task: SonarCloudPrepare@1
     inputs:
       SonarCloud: 'SonarCloud-Connection'
       organization: 'your-organization'
       scannerMode: 'MSBuild'
       projectKey: 'your-project-key'
       projectName: 'Your Project Name'
       extraProperties: |
         sonar.exclusions=**/obj/**,**/bin/**
         
   # Build tasks here
   
   - task: SonarCloudAnalyze@1
   
   - task: SonarCloudPublish@1
     inputs:
       pollingTimeoutSec: '300'
   ```

2. **Security scanning**:
   ```yaml
   - task: WhiteSource@21
     inputs:
       cwd: '$(Build.SourcesDirectory)'
       projectName: '$(Build.Repository.Name)'
       
   - task: PublishSecurityAnalysisLogs@3
     inputs:
       ArtifactName: 'CodeAnalysisLogs'
       ArtifactType: 'Container'
   ```

3. **Credential scanning**:
   ```yaml
   - task: CredScan@3
     inputs:
       outputFormat: 'pre'
       
   - task: PostAnalysis@1
     inputs:
       AllTools: false
       CredScan: true
       ToolLogsNotFoundAction: 'Standard'
   ```

### 9.3 Audit and Governance

Implement governance and audit trails:

1. **Approval gates** for sensitive environments:
   - Configure in Environments > Approvals and checks
   - Require multiple approvers for production

2. **Branch policies**:
   - Enforce PR reviews before merging to main
   - Require build validation

3. **Deployment history**:
   - Store deployment logs as artifacts
   - Include version information in releases
   - Log deployment events to external systems

4. **Pipeline permissions**:
   - Limit who can edit and run pipelines
   - Control service connection access
   - Implement resource scope restrictions

---

## 10. References and Resources

- [Azure Pipelines YAML schema reference](https://docs.microsoft.com/en-us/azure/devops/pipelines/yaml-schema)
- [Multi-stage pipelines documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/stages)
- [Azure Pipeline tasks reference](https://docs.microsoft.com/en-us/azure/devops/pipelines/tasks)
- [Environment approvals and checks](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/approvals)
- [Deployment strategies](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs)
- [Azure DevOps Rest API reference](https://docs.microsoft.com/en-us/rest/api/azure/devops)
- [Azure DevOps Pipeline Analytics](https://docs.microsoft.com/en-us/azure/devops/pipelines/reports/pipelinereport)
- [Pipeline caching](https://docs.microsoft.com/en-us/azure/devops/pipelines/caching)
- [Self-hosted agents](https://docs.microsoft.com/en-us/azure/devops/pipelines/agents/agents)
