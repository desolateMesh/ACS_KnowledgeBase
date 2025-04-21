{
  `path`: `C:\\Users\\jrochau\\projects\\ACS_KnowledgeBase\\Advanced Use Cases\\High-Volume Environments\\Azure Architecture Resources\\Automation and DevOps\\GitHub Actions for Multi-Region Deployments\\implementation-guide.md`,
  `content`: `# GitHub Actions for Multi-Region Deployments: Implementation Guide

## Version
2.0

## Date
2025-04-19

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Prerequisites](#2-prerequisites)
   2.1 [Required Tools](#21-required-tools)
   2.2 [Azure Requirements](#22-azure-requirements)
   2.3 [GitHub Requirements](#23-github-requirements)
3. [Architecture Overview](#3-architecture-overview)
   3.1 [High-Level Design](#31-high-level-design)
   3.2 [Components and Resources](#32-components-and-resources)
   3.3 [GitHub Actions Pipeline Structure](#33-github-actions-pipeline-structure)
4. [Implementation Steps](#4-implementation-steps)
   4.1 [Setting Up Azure Resources](#41-setting-up-azure-resources)
   4.2 [Configuring GitHub Repository](#42-configuring-github-repository)
   4.3 [Creating Workflow Files](#43-creating-workflow-files)
   4.4 [Implementing Matrix Strategy for Regions](#44-implementing-matrix-strategy-for-regions)
   4.5 [Adding Deployment Jobs](#45-adding-deployment-jobs)
   4.6 [Configuring Health Checks](#46-configuring-health-checks)
   4.7 [Setting Up Rollback Mechanisms](#47-setting-up-rollback-mechanisms)
5. [Advanced Configuration](#5-advanced-configuration)
   5.1 [Handling Region-Specific Configurations](#51-handling-region-specific-configurations)
   5.2 [Staged Rollouts and Progressive Delivery](#52-staged-rollouts-and-progressive-delivery)
   5.3 [Integration with Azure Traffic Manager](#53-integration-with-azure-traffic-manager)
   5.4 [Disaster Recovery Considerations](#54-disaster-recovery-considerations)
   5.5 [Monitoring and Alerting](#55-monitoring-and-alerting)
6. [Sample Workflows](#6-sample-workflows)
   6.1 [Basic Multi-Region Deployment](#61-basic-multi-region-deployment)
   6.2 [Advanced Canary Deployment](#62-advanced-canary-deployment)
   6.3 [Region-Aware Testing](#63-region-aware-testing)
7. [Security Best Practices](#7-security-best-practices)
   7.1 [Secure Credential Management](#71-secure-credential-management)
   7.2 [IP Restrictions and Network Security](#72-ip-restrictions-and-network-security)
   7.3 [Audit and Compliance](#73-audit-and-compliance)
8. [Cost Optimization](#8-cost-optimization)
   8.1 [GitHub Actions Runner Considerations](#81-github-actions-runner-considerations)
   8.2 [Resource Scaling Strategies](#82-resource-scaling-strategies)
9. [Troubleshooting Common Issues](#9-troubleshooting-common-issues)
10. [References and Resources](#10-references-and-resources)

---

## 1. Introduction

This implementation guide provides detailed instructions for setting up GitHub Actions workflows to manage multi-region deployments in Azure environments. The focus is on creating robust, automated CI/CD pipelines that can deploy your applications across multiple Azure regions simultaneously or in a controlled sequence.

Multi-region deployments provide several advantages:
- **High availability**: Ensure your application remains available even if one region experiences an outage
- **Reduced latency**: Serve users from the closest geographical region
- **Disaster recovery**: Rapidly recover from regional failures
- **Compliance**: Meet data residency requirements across different jurisdictions

This guide is designed for DevOps engineers, cloud architects, and development teams looking to implement a scalable, repeatable approach to multi-region deployments using GitHub Actions as their CI/CD platform.

---

## 2. Prerequisites

### 2.1 Required Tools

Before implementing GitHub Actions for multi-region deployments, ensure you have:

- **Git**: Latest version
- **Azure CLI**: Version 2.45.0 or later
- **GitHub CLI** (optional but recommended): gh 2.30.0 or later
- **Terraform** (if using IaC): Version 1.5.0 or later
- **Bicep** (if using Azure-native IaC): Latest version
- **Node.js**: LTS version (if using JavaScript/TypeScript applications)
- **Docker**: Latest version (if containerizing applications)

### 2.2 Azure Requirements

- **Azure Subscription**: Active subscription with contributor access
- **Service Principal**: With appropriate permissions across targeted regions
- **Resource Groups**: Pre-created in each target region
- **Azure Resource Providers**: Registered for services you plan to deploy
- **Role Assignments**: Proper RBAC for service principals in each region

### 2.3 GitHub Requirements

- **Repository**: Source code repository with admin access
- **GitHub Actions**: Enabled for your repository
- **GitHub Secrets**: Ability to create and manage secrets
- **Branch Protection**: Configured to prevent direct pushes to main branch (recommended)
- **Runners**: Determine if you'll use GitHub-hosted or self-hosted runners

---

## 3. Architecture Overview

### 3.1 High-Level Design

A typical multi-region deployment architecture using GitHub Actions consists of:

1. **GitHub Repository**: Contains application code, infrastructure definitions, and workflow files
2. **GitHub Actions Workflow**: Orchestrates the CI/CD pipeline
3. **Multiple Azure Regions**: Target environments (e.g., East US, West Europe, Southeast Asia)
4. **Azure Traffic Manager**: Routes users to the appropriate regional deployment
5. **Monitoring and Logging**: Centralized monitoring across regions

### 3.2 Components and Resources

Key Azure resources that may be part of your multi-region deployment:

- **App Services**: Regional web applications
- **Azure Functions**: Serverless compute
- **Azure Kubernetes Service (AKS)**: Container orchestration
- **Virtual Machines**: IaaS compute
- **Azure SQL Database**: Regional databases with geo-replication
- **Cosmos DB**: Globally distributed database
- **Storage Accounts**: Regional storage
- **Azure Front Door/Traffic Manager**: Global routing and load balancing
- **Azure Monitor**: Cross-region monitoring and alerting
- **Log Analytics**: Centralized logging

### 3.3 GitHub Actions Pipeline Structure

A well-designed GitHub Actions workflow for multi-region deployment typically includes:

1. **Trigger**: Define when the workflow runs (e.g., on push to main, on release creation)
2. **Build Job**: Compile code, run tests, and create artifacts
3. **Region Matrix**: Define target regions and their configurations
4. **Deployment Jobs**: Deploy to multiple regions in parallel or sequence
5. **Validation**: Verify deployments in each region
6. **Post-Deployment**: Update routing rules, documentation, or notifications

---

## 4. Implementation Steps

### 4.1 Setting Up Azure Resources

1. Create resource groups in each target region:

```bash
# Create resource groups in multiple regions
az group create --name myapp-eastus --location eastus
az group create --name myapp-westeurope --location westeurope
az group create --name myapp-southeastasia --location southeastasia
```

2. Create a service principal for GitHub Actions:

```bash
# Create service principal and save output
az ad sp create-for-rbac --name \"github-actions-multiregion\" --role contributor \\
                          --scopes /subscriptions/{subscription-id}/resourceGroups/myapp-eastus \\
                                  /subscriptions/{subscription-id}/resourceGroups/myapp-westeurope \\
                                  /subscriptions/{subscription-id}/resourceGroups/myapp-southeastasia \\
                          --sdk-auth > github-actions-sp.json
```

3. Set up Traffic Manager (optional but recommended):

```bash
# Create Traffic Manager profile
az network traffic-manager profile create --name myapp-global --resource-group myapp-global \\
                                         --routing-method Performance --unique-dns-name myapp-global

# Add endpoints (will be populated after app deployments)
```

### 4.2 Configuring GitHub Repository

1. Store Azure credentials as GitHub Secrets:

   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Create a new repository secret named `AZURE_CREDENTIALS`
   - Paste the entire JSON output from the service principal creation

2. Add additional secrets as needed:
   - `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID
   - Region-specific secrets (if applicable)

3. Create a `.github/workflows` directory in your repository to store workflow files.

### 4.3 Creating Workflow Files

Create a basic workflow file at `.github/workflows/multi-region-deploy.yml`:

```yaml
name: Multi-Region Deployment

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run tests
        run: npm test
      
      - name: Upload build artifact
        uses: actions/upload-artifact@v3
        with:
          name: app-build
          path: build/
          retention-days: 1
```

### 4.4 Implementing Matrix Strategy for Regions

Add a deployment job using matrix strategy to target multiple regions:

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false  # Continue with other regions if one fails
      matrix:
        region: [
          { name: 'eastus', resource_group: 'myapp-eastus', location: 'East US' },
          { name: 'westeurope', resource_group: 'myapp-westeurope', location: 'West Europe' },
          { name: 'southeastasia', resource_group: 'myapp-southeastasia', location: 'Southeast Asia' }
        ]
    
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v3
        with:
          name: app-build
          path: build
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      # Deployment steps will follow
```

### 4.5 Adding Deployment Jobs

Add steps to deploy to each region. For example, for an App Service deployment:

```yaml
      - name: Deploy to App Service in ${{ matrix.region.location }}
        uses: azure/webapps-deploy@v2
        with:
          app-name: myapp-${{ matrix.region.name }}
          resource-group: ${{ matrix.region.resource_group }}
          slot-name: 'production'
          package: build/
```

For Kubernetes deployment:

```yaml
      - name: Set AKS context for ${{ matrix.region.name }}
        uses: azure/aks-set-context@v3
        with:
          resource-group: ${{ matrix.region.resource_group }}
          cluster-name: myapp-aks-${{ matrix.region.name }}
      
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          namespace: production
          manifests: |
            kubernetes/deployment.yaml
            kubernetes/service.yaml
          images: |
            myacr.azurecr.io/myapp:${{ github.sha }}
```

### 4.6 Configuring Health Checks

After deployment, add health check validation:

```yaml
      - name: Verify deployment health in ${{ matrix.region.location }}
        run: |
          # Allow some time for the app to start
          sleep 30
          
          # Check if the app is responding
          STATUS_CODE=$(curl -s -o /dev/null -w \"%{http_code}\" https://myapp-${{ matrix.region.name }}.azurewebsites.net/health)
          
          if [ $STATUS_CODE -ne 200 ]; then
            echo \"Health check failed in ${{ matrix.region.location }} with status code $STATUS_CODE\"
            exit 1
          else
            echo \"Deployment in ${{ matrix.region.location }} is healthy\"
          fi
```

### 4.7 Setting Up Rollback Mechanisms

Add rollback steps that trigger on failure:

```yaml
      - name: Rollback on failure in ${{ matrix.region.location }}
        if: failure()
        run: |
          echo \"Deployment failed in ${{ matrix.region.location }}, rolling back to previous version\"
          
          # For App Service, you could swap back to previous slot
          az webapp deployment slot swap -g ${{ matrix.region.resource_group }} \\
                                        -n myapp-${{ matrix.region.name }} \\
                                        --slot staging \\
                                        --target-slot production
          
          # For AKS, you could reapply the previous manifest
          # kubectl rollout undo deployment/myapp
```

---

## 5. Advanced Configuration

### 5.1 Handling Region-Specific Configurations

Create a directory structure for region-specific configurations:

```
/configs
  /eastus
    settings.json
  /westeurope
    settings.json
  /southeastasia
    settings.json
  default.json
```

Then apply these configurations during deployment:

```yaml
      - name: Apply region-specific configuration
        run: |
          # Check if region-specific config exists, otherwise use default
          if [ -f \"configs/${{ matrix.region.name }}/settings.json\" ]; then
            cp configs/${{ matrix.region.name }}/settings.json build/settings.json
          else
            cp configs/default.json build/settings.json
          fi
```

### 5.2 Staged Rollouts and Progressive Delivery

Implement canary or blue-green deployments:

```yaml
  canary_deployment:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to canary region (East US)
        # Deploy to canary region first
      
      - name: Run smoke tests on canary
        # Run tests to verify canary deployment
      
      - name: Wait for approval
        uses: trstringer/manual-approval@v1
        with:
          secret: ${{ github.TOKEN }}
          approvers: username1,username2
          minimum-approvals: 1
          issue-title: \"Approve deployment to all regions\"
          issue-body: \"Please approve the deployment to all regions\"
          timeout-minutes: 60
      
  full_deployment:
    needs: canary_deployment
    # Deploy to other regions after approval
```

### 5.3 Integration with Azure Traffic Manager

Update Traffic Manager endpoints after successful deployments:

```yaml
  update_traffic_manager:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Update Traffic Manager endpoints
        run: |
          # Enable all healthy endpoints
          az network traffic-manager endpoint update \\
            --resource-group myapp-global \\
            --profile-name myapp-global \\
            --name eastus \\
            --type azureEndpoints \\
            --target-resource-id /subscriptions/{subscription-id}/resourceGroups/myapp-eastus/providers/Microsoft.Web/sites/myapp-eastus \\
            --endpoint-status Enabled
          
          # Repeat for other regions...
```

### 5.4 Disaster Recovery Considerations

Add steps to test failover capabilities:

```yaml
  test_failover:
    needs: deploy
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.test_failover == 'true'
    steps:
      - name: Simulate region failure
        run: |
          # Temporarily disable primary region in Traffic Manager
          az network traffic-manager endpoint update \\
            --resource-group myapp-global \\
            --profile-name myapp-global \\
            --name eastus \\
            --type azureEndpoints \\
            --endpoint-status Disabled
      
      - name: Verify traffic routing to secondary regions
        # Add verification logic
      
      - name: Restore primary region
        run: |
          # Re-enable primary region
          az network traffic-manager endpoint update \\
            --resource-group myapp-global \\
            --profile-name myapp-global \\
            --name eastus \\
            --type azureEndpoints \\
            --endpoint-status Enabled
```

### 5.5 Monitoring and Alerting

Set up cross-region monitoring:

```yaml
  setup_monitoring:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Configure alert rules
        run: |
          # Create alert rules for availability across regions
          az monitor alert create \\
            --resource-group myapp-global \\
            --name \"Multi-Region-Availability\" \\
            # Additional parameters for alert configuration
```

---

## 6. Sample Workflows

### 6.1 Basic Multi-Region Deployment

```yaml
name: Basic Multi-Region Deployment

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '7.0.x'
      - name: Restore dependencies
        run: dotnet restore
      - name: Build
        run: dotnet build --no-restore
      - name: Test
        run: dotnet test --no-build
      - name: Publish
        run: dotnet publish -c Release -o publish
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: app-publish
          path: publish

  deploy:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        region: [
          { name: 'eastus', resource_group: 'myapp-eastus', location: 'East US' },
          { name: 'westeurope', resource_group: 'myapp-westeurope', location: 'West Europe' }
        ]
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: app-publish
          path: publish
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy to App Service
        uses: azure/webapps-deploy@v2
        with:
          app-name: myapp-${{ matrix.region.name }}
          resource-group: ${{ matrix.region.resource_group }}
          package: publish/
```

### 6.2 Advanced Canary Deployment

```yaml
name: Advanced Canary Multi-Region Deployment

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    # Build job (as in previous example)
    
  deploy_canary:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: app-publish
          path: publish
      
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy to Canary Region (East US)
        uses: azure/webapps-deploy@v2
        with:
          app-name: myapp-eastus
          resource-group: myapp-eastus
          slot-name: 'staging'
          package: publish/
      
      - name: Swap staging slot with production (10% traffic)
        run: |
          az webapp traffic-routing set -g myapp-eastus -n myapp-eastus --distribution staging=10 production=90
      
      - name: Run canary tests
        run: |
          # Custom tests to validate canary deployment
          sleep 60
          # Run health checks, performance tests, etc.
      
      - name: Check error rates
        run: |
          # Query logs for error rates in the canary deployment
          ERROR_RATE=$(az monitor metrics list --resource-group myapp-eastus --resource-name myapp-eastus --metric \"Http5xx\" --output tsv)
          
          if (( $(echo \"$ERROR_RATE > 0.01\" | bc -l) )); then
            echo \"Error rate too high in canary: $ERROR_RATE\"
            az webapp traffic-routing set -g myapp-eastus -n myapp-eastus --distribution production=100
            exit 1
          fi
  
  promote_canary:
    needs: deploy_canary
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Promote canary to 100% in East US
        run: |
          az webapp traffic-routing set -g myapp-eastus -n myapp-eastus --distribution staging=100
          sleep 300  # Wait for observation
          az webapp deployment slot swap -g myapp-eastus -n myapp-eastus --slot staging --target-slot production
  
  deploy_remaining:
    needs: promote_canary
    # Deploy to remaining regions (similar to base example)
```

### 6.3 Region-Aware Testing

```yaml
name: Region-Aware Testing

on:
  workflow_dispatch:
    inputs:
      regions:
        description: 'Comma-separated list of regions to test'
        required: true
        default: 'eastus,westeurope,southeastasia'

jobs:
  parse_regions:
    runs-on: ubuntu-latest
    outputs:
      region_matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - id: set-matrix
        run: |
          REGIONS=\"${{ github.event.inputs.regions }}\"
          JSON_ARRAY=\"[\"
          IFS=',' read -ra REGION_ARRAY <<< \"$REGIONS\"
          for i in \"${!REGION_ARRAY[@]}\"; do
            REGION=\"${REGION_ARRAY[$i]}\"
            JSON_ARRAY+=\"{\\\"name\\\":\\\"$REGION\\\", \\\"endpoint\\\":\\\"https://myapp-$REGION.azurewebsites.net\\\"}\"
            if [ $i -lt $((${#REGION_ARRAY[@]}-1)) ]; then
              JSON_ARRAY+=\",\"
            fi
          done
          JSON_ARRAY+=\"]\"
          echo \"matrix=$JSON_ARRAY\" >> $GITHUB_OUTPUT
  
  test_regions:
    needs: parse_regions
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        region: ${{ fromJson(needs.parse_regions.outputs.region_matrix) }}
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up test environment
        run: npm ci
      
      - name: Run tests against ${{ matrix.region.name }}
        run: |
          # Set the endpoint for tests
          export API_ENDPOINT=${{ matrix.region.endpoint }}
          npm run test:e2e
      
      - name: Report results
        if: always()
        run: |
          echo \"Tests in ${{ matrix.region.name }} completed with status: ${{ job.status }}\"
```

---

## 7. Security Best Practices

### 7.1 Secure Credential Management

Always use GitHub Secrets for storing sensitive information:

```yaml
- name: Login to Azure
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

For more granular control, use separate credentials for different environments:

```yaml
- name: Login to Azure
  uses: azure/login@v1
  with:
    creds: ${{ secrets[format('AZURE_CREDENTIALS_{0}', matrix.region.name)] }}
```

### 7.2 IP Restrictions and Network Security

Restrict access to your Azure resources by IP:

```yaml
- name: Configure IP restrictions
  run: |
    # Get GitHub Actions runner IP
    RUNNER_IP=$(curl -s https://api.ipify.org)
    
    # Allow GitHub Actions runner IP to access resources
    az webapp config access-restriction add \\
      --resource-group ${{ matrix.region.resource_group }} \\
      --name myapp-${{ matrix.region.name }} \\
      --rule-name 'Allow GitHub Actions' \\
      --action Allow \\
      --ip-address $RUNNER_IP/32 \\
      --priority 100
      
    # Deploy application
    
    # Remove temporary IP access after deployment
    az webapp config access-restriction remove \\
      --resource-group ${{ matrix.region.resource_group }} \\
      --name myapp-${{ matrix.region.name }} \\
      --rule-name 'Allow GitHub Actions'
```

### 7.3 Audit and Compliance

Implement audit logging for deployments:

```yaml
- name: Log deployment details for audit
  run: |
    TIMESTAMP=$(date -u +\"%Y-%m-%dT%H:%M:%SZ\")
    DEPLOYER=\"${{ github.actor }}\"
    COMMIT=\"${{ github.sha }}\"
    REGION=\"${{ matrix.region.name }}\"
    
    # Log to Azure Log Analytics
    az monitor log-analytics query \\
      --workspace ${{ secrets.LOG_ANALYTICS_WORKSPACE_ID }} \\
      --analytics-query \"customEvents | where name == 'Deployment' | project timestamp, deployer, commit, region, status\"
```

---

## 8. Cost Optimization

### 8.1 GitHub Actions Runner Considerations

Self-hosted runners can reduce costs for frequent deployments:

```yaml
jobs:
  deploy:
    runs-on: self-hosted  # Use self-hosted runners
    # Job steps...
```

Consider using ephemeral runners in Azure to reduce costs:

```yaml
  create_runner:
    runs-on: ubuntu-latest
    steps:
      - name: Create ephemeral runner VM in Azure
        # Create a VM in Azure for running jobs
      
      # Remaining steps to register runner
  
  deploy:
    needs: create_runner
    runs-on: [self-hosted, ephemeral]
    # Deployment steps
  
  cleanup_runner:
    needs: deploy
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Remove ephemeral runner VM
        # Clean up the runner VM
```

### 8.2 Resource Scaling Strategies

Implement cost-saving measures for non-production regions:

```yaml
- name: Scale down non-production regions
  if: matrix.region.name != 'eastus'  # Assuming eastus is primary production
  run: |
    # Scale down App Service Plan outside business hours
    HOUR=$(date +\"%H\")
    WEEKDAY=$(date +\"%u\")
    
    # If weekend or outside business hours (8 AM - 6 PM)
    if [ $WEEKDAY -gt 5 ] || [ $HOUR -lt 8 ] || [ $HOUR -gt 18 ]; then
      az appservice plan update \\
        --resource-group ${{ matrix.region.resource_group }} \\
        --name myapp-plan-${{ matrix.region.name }} \\
        --sku B1
    else
      az appservice plan update \\
        --resource-group ${{ matrix.region.resource_group }} \\
        --name myapp-plan-${{ matrix.region.name }} \\
        --sku P1V2
    fi
```

---

## 9. Troubleshooting Common Issues

**Issue**: Authentication failures when deploying to Azure.

**Solution**:
- Verify that the Azure credentials secret is correctly formatted.
- Ensure the service principal has appropriate permissions in all target regions.
- Check if the service principal secret has expired.

**Issue**: Deployment succeeds in some regions but fails in others.

**Solution**:
- Check region-specific resource quotas and limits.
- Verify that all required resource providers are registered in all regions.
- Look for region-specific configuration issues.

**Issue**: Slow deployments when targeting many regions simultaneously.

**Solution**:
- Consider using self-hosted runners in Azure regions.
- Optimize artifact sizes to reduce download times.
- Use parallel jobs with higher concurrency limits.

**Issue**: Traffic Manager not routing traffic correctly after deployment.

**Solution**:
- Verify endpoint health probe configurations.
- Check DNS propagation and TTL settings.
- Ensure all endpoints are properly registered and enabled.

---

## 10. References and Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure DevOps Documentation](https://learn.microsoft.com/en-us/azure/devops/)
- [Azure Multi-Region Architectures](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/app-service-web-app/multi-region)
- [Traffic Manager Documentation](https://learn.microsoft.com/en-us/azure/traffic-manager/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Azure Regions Overview](https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/)
- [Azure Service Health](https://azure.microsoft.com/en-us/features/service-health/)
`
}