# Environment Promotion Implementation Guide for High-Volume Azure Architectures

## Overview
This guide provides a tactical roadmap for implementing environment promotion strategies in Azure, focusing on automation, scalability, and reliability. It complements the [design patterns document](design-patterns.md) with concrete steps and toolchain configurations.

---

## Prerequisites
1. **Azure Foundation**:
   - Production-ready Azure subscription with resource quotas
   - Network topology (Hub-Spoke/VWAN) pre-configured
2. **Toolchain Setup**:
   - Azure DevOps Organization or GitHub Enterprise
   - Terraform Cloud/Enterprise or Azure Bicep
   - Azure Container Registry (ACR)
3. **Security Baseline**:
   - Azure Active Directory (AAD) groups for environment access
   - Key Vault with certificate/secret rotation configured

---

## Implementation Steps

### 1. Environment Setup
#### Infrastructure-as-Code (IaC) Foundation
```bash
# Create base environments using Terraform
az login --service-principal -u $ARM_CLIENT_ID -p $ARM_CLIENT_SECRET --tenant $ARM_TENANT_ID
terraform apply -var-file=environments/dev/terraform.tfvars
Environment	Purpose	Azure Region	Resource Tags
Dev	Rapid iteration/testing	East US 2	{env: dev, temp: true}
Staging	Pre-production validation	West Europe	{env: staging}
Production	Live customer traffic	Multi-region	{env: prod, critical: true}
```
---

### 2. Pipeline Configuration
#### Multi-Stage Azure Pipeline (YAML)
```
variables:
  - group: Global-Secrets
  - name: buildConfiguration
    value: 'Release'

stages:
- stage: Build
  jobs:
  - job: BuildJob
    steps:
    - task: DotNetCoreCLI@2
      inputs:
        command: 'publish'
        publishWebProjects: true
        arguments: '--configuration $(buildConfiguration)'

- stage: Deploy_Dev
  dependsOn: Build
  jobs:
  - deployment: DevDeployment
    environment: Dev
    strategy:
      runOnce:
        deploy:
          steps:
          - template: deploy-steps.yml

- stage: Deploy_Prod
  dependsOn: Deploy_Dev
  condition: succeeded()
  jobs:
  - deployment: ProdDeployment
    environment: Prod
    strategy:
      canary:
        increments: [10, 50, 100]
        deploy:
          steps:
          - template: prod-canary-steps.yml
```
----

### 3. Environment-Specific Gates
#### Environment	Approval Type	Automated Checks	SLA

Dev	None Unit tests, code coverage >80%	<15min
Staging	Team Lead + Security	Pen test results, OWASP ZAP scan	<4hrs
Production	Change Advisory Board	Load test (10K RPS), DR drill validation	<72hrs

### 4. Testing Automation

# Integration test job example
```
- job: Run_Integration_Tests
  pool: 
    vmImage: 'ubuntu-latest'
  steps:
  - task: AzureCLI@2
    inputs:
      script: |
        az deployment group create --template-file test-env.bicep
        ./run-tests.sh --env $(EnvironmentName)
  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/test-results.xml'
```
### 5. Security Enforcement

Pipeline Security Checklist
Secret Handling:

#### Key Vault integration
az keyvault secret show --name "prod-db-connection" --vault-name MyVault
Container Scanning:
```
- task: ContainerScan@0
  inputs:
    imageName: '$(ACR.Name)/myapp:$(Build.BuildId)'
    failOnHighSeverity: true
```

#### Network Policies:

### NSG rules for environment isolation
```
resource "azurerm_network_security_rule" "dev_deny_prod" {
  name                        = "block-prod-access"
  priority                    = 100
  direction                   = "Outbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "10.0.1.0/24" # Dev subnet
  destination_address_prefix  = "10.1.0.0/16" # Prod VNet
}
```
#### Monitoring & Validation
Deployment Health Dashboard
Metric	Dev Threshold	Prod Threshold	Measurement Tool
API Error Rate	<5%	<0.5%	Application Insights
Deployment Duration	<20min	<60min	Azure Monitor
Resource Provisioning	<5min	<15min	ARM Deployment History
Post-Deployment Checks
Synthetic Transactions:

```
Invoke-WebRequest -Uri https://prod-api.contoso.com/healthcheck -Headers @{"x-functions-key"="$(funcKey)"}
```
### Real-User Monitoring:
```
kusto
requests
| where timestamp > ago(15m)
| summarize errorCount=countif(success == false) by bin(timestamp, 1m)
| render timechart
Rollback Procedures
Automated Rollback Triggers
```
### Azure Pipeline condition
```
- stage: Rollback
  condition: |
    and(
      failed(),
      contains(stageDependencies.Deploy_Prod.result, 'Failed')
    )
  jobs:
  - job: RestorePreviousVersion
    steps:
    - task: AzureAppServiceManage@0
      inputs:
        action: 'Rollback'
```

### Database Rollback Steps
#### Identify last good version:

```
SELECT TOP 1 [DeploymentId] FROM [dbo].[SchemaVersions] ORDER BY [Applied] DESC
```

### Execute rollback:
```
flyway -url=$(DB_URI) -user=$(DB_USER) -password=$(DB_PASSWORD) undo -target=2.1
```
High-Volume Optimization
Parallel Deployment Strategy

#### Fan-out/fan-in pattern
```
jobs:
- job: Deploy_Region_A
  strategy:
    parallel: 3
  steps: [ ... ]

- job: Deploy_Region_B
  dependsOn: Deploy_Region_A
  steps: [ ... ]
```
### Pipeline Scaling
Component	Scaling Approach	Target Throughput
Build Agents	Azure DevOps Scale Sets	100+ concurrent
Container Registry	ACR Premium (Geo-replication)	10K pulls/min
Test Execution	Load Test Service integration	50K VUs
Real-World Example: E-Commerce Platform
Scenario: Promote Black Friday readiness changes with zero downtime

### Pre-Warm Environments:
```

az vmss update-instances --resource-group prod-rg --name web-vmss --instance-ids *

```
### Canary Release

```
- task: AzureTrafficManager@1
  inputs:
    operation: 'UpdateProfile'
    endpointName: 'prod-canary'
    weight: 5 # 5% traffic to new version
```
Monitoring:
Alert rule: If cart abandonment rate increases >10% in 5min window

Full Rollout:

```
az network front-door backend-pool update --resource-group fd-rg --front-door-name main-fd 
  --name backendPool --priority 1
```