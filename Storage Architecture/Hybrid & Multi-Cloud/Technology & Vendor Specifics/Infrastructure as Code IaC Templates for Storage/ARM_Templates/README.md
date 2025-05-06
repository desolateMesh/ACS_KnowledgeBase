# Azure Resource Manager (ARM) Templates for Storage

## Overview

This repository contains a collection of Azure Resource Manager (ARM) templates designed for deploying and managing various Azure storage resources. These templates provide Infrastructure as Code (IaC) capabilities that enable consistent, repeatable, and automated deployment of storage resources across your Azure environments.

## Templates Included

### 1. Azure Blob Container with Immutability Policy
**File**: `azure_blob_container_with_immutability_policy.json`

**Purpose**: Deploys an Azure Blob container with immutability policies that prevent blobs from being deleted or modified for a specified period.

**Key Features**:
- WORM (Write Once, Read Many) storage capabilities
- Legal hold and time-based retention policies
- Compliance with regulatory requirements (SEC 17a-4, FINRA, CFTC)

**Use Cases**:
- Financial record retention
- Healthcare data compliance
- Legal evidence preservation
- Regulatory compliance scenarios

### 2. Azure Blob Lifecycle Management Policy
**File**: `azure_blob_lifecycle_management_policy.json`

**Purpose**: Automates data lifecycle management for Azure Blob storage, optimizing storage costs by transitioning data between access tiers and deleting expired data.

**Key Features**:
- Automated tier transitions (Hot → Cool → Archive)
- Rule-based deletion of expired data
- Customizable filters based on blob prefixes and metadata
- Cost optimization through automated storage tier management

**Use Cases**:
- Long-term data archiving
- Storage cost optimization
- Compliance with data retention policies
- Automated data lifecycle management

### 3. Azure Files Share
**File**: `azure_files_share.json`

**Purpose**: Deploys Azure Files shares that provide fully managed file shares accessible via SMB and REST APIs.

**Key Features**:
- SMB 3.0 protocol support
- Integration with Azure AD for identity-based authentication
- Shared access across multiple VMs and applications
- Optional integration with Azure File Sync

**Use Cases**:
- Lift-and-shift applications with file share dependencies
- Cross-platform file sharing
- Replace on-premises file servers
- Application configuration sharing

### 4. Azure NetApp Files Volume
**File**: `azure_netapp_files_volume.json`

**Purpose**: Deploys Azure NetApp Files volumes, which provide enterprise-grade, high-performance file storage.

**Key Features**:
- Multi-protocol support (NFS v3, NFS v4.1, SMB)
- Enterprise-grade performance (sub-millisecond latency)
- Snapshot and cross-region replication capabilities
- Integration with VMware, Oracle, and SAP HANA workloads

**Use Cases**:
- Mission-critical enterprise applications
- SAP HANA deployments
- HPC (High-Performance Computing) workloads
- VDI (Virtual Desktop Infrastructure) solutions

### 5. Azure Storage Account with Geo-Redundant Storage
**File**: `azure_storage_account_grs.json`

**Purpose**: Deploys an Azure Storage Account with geo-redundant storage (GRS) or read-access geo-redundant storage (RA-GRS) replication.

**Key Features**:
- Data replication across paired regions
- 99.99% read/write availability SLA (99.9999999% durability)
- Optional read access to secondary region
- Regional failover capabilities for disaster recovery

**Use Cases**:
- Business-critical applications requiring high availability
- Compliance with geographic data residency requirements
- Disaster recovery scenarios
- Applications requiring cross-region redundancy

### 6. Azure Storage Account with Private Endpoint
**File**: `azure_storage_account_with_private_endpoint.json`

**Purpose**: Deploys an Azure Storage Account with a private endpoint to enable secure access via a private IP address within a VNet.

**Key Features**:
- Private connectivity from VNet to storage account
- Network isolation from public internet
- Integration with Azure Private DNS zones
- Enhanced security through removal of public endpoint exposure

**Use Cases**:
- Secure application access to storage
- Compliance with data security regulations
- Multi-tier application architectures requiring private storage
- Enterprise environments with strict network security requirements

### 7. Azure Storage Sync Service and Group
**File**: `azure_storage_sync_service_and_group.json`

**Purpose**: Deploys Azure File Sync service and sync groups to synchronize on-premises file servers with Azure Files.

**Key Features**:
- Multi-directional sync between on-premises and cloud
- Cloud tiering to optimize on-premises storage usage
- Branch office file server consolidation
- Centralized backup and disaster recovery

**Use Cases**:
- Hybrid storage scenarios
- Branch office file server replacement
- Centralized backup and management
- Storage capacity optimization

## Usage Guidelines

### Prerequisites

To use these ARM templates, you need:

- An Azure subscription
- Appropriate permissions (Contributor or specific resource permissions)
- Azure CLI, Azure PowerShell, or access to Azure Portal
- Optional: VS Code with Azure Resource Manager Tools extension

### Deployment Methods

#### Azure Portal

1. Navigate to **Create a resource** > **Template deployment**
2. Choose **Build your own template in the editor**
3. Copy and paste the template content
4. Configure parameters
5. Review and create

#### Azure CLI

```bash
# Create resource group if not exists
az group create --name <resource-group-name> --location <location>

# Deploy ARM template
az deployment group create \
  --resource-group <resource-group-name> \
  --template-file <template-file-path> \
  --parameters <parameter-file-path>
```

#### Azure PowerShell

```powershell
# Create resource group if not exists
New-AzResourceGroup -Name <resource-group-name> -Location <location>

# Deploy ARM template
New-AzResourceGroupDeployment `
  -ResourceGroupName <resource-group-name> `
  -TemplateFile <template-file-path> `
  -TemplateParameterFile <parameter-file-path>
```

### Parameter Files

Each template should have an accompanying parameter file for different environments (dev, test, prod). Parameter files should be stored securely and can be used with deployment pipelines.

Example parameter file structure:
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "value": "mystorageaccount"
    },
    "location": {
      "value": "eastus2"
    }
  }
}
```

## Best Practices

### Security

- Use Azure Key Vault to store and reference sensitive parameters
- Apply least privilege access control using RBAC
- Enable advanced threat protection for storage accounts
- Implement private endpoints for network isolation
- Use managed identities for authentication instead of connection strings
- Enable soft delete to protect against accidental deletions

### Performance

- Choose the appropriate storage type for your workload
- Select the optimal location closest to your users/applications
- Configure appropriate performance tiers based on workload
- Implement proper retry logic in applications
- Consider zone-redundant storage for high-availability within a region

### Cost Optimization

- Implement lifecycle management for blob storage
- Use cool and archive tiers for infrequently accessed data
- Configure automatic archiving of older data
- Right-size storage accounts based on actual usage
- Use reserved capacity for predictable workloads

## Monitoring and Management

### Azure Monitor Integration

These templates can be extended to include diagnostic settings for integration with:

- Azure Monitor
- Log Analytics Workspace
- Event Hub

Example diagnostic settings:
```json
{
  "type": "Microsoft.Storage/storageAccounts/providers/diagnosticSettings",
  "apiVersion": "2017-05-01-preview",
  "name": "[concat(parameters('storageAccountName'), '/Microsoft.Insights/default')]",
  "dependsOn": [
    "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
  ],
  "properties": {
    "workspaceId": "[parameters('logAnalyticsWorkspaceId')]",
    "metrics": [
      {
        "category": "Transaction",
        "enabled": true,
        "retentionPolicy": {
          "days": 30,
          "enabled": true
        }
      }
    ],
    "logs": [
      {
        "category": "StorageRead",
        "enabled": true,
        "retentionPolicy": {
          "days": 30,
          "enabled": true
        }
      },
      {
        "category": "StorageWrite",
        "enabled": true,
        "retentionPolicy": {
          "days": 30,
          "enabled": true
        }
      },
      {
        "category": "StorageDelete",
        "enabled": true,
        "retentionPolicy": {
          "days": 30,
          "enabled": true
        }
      }
    ]
  }
}
```

### Azure Policy Compliance

To ensure storage resources deployed via these templates meet organizational standards, consider implementing Azure Policies for:

- Enforcing encryption at rest
- Requiring secure transfer (HTTPS)
- Ensuring appropriate redundancy levels
- Limiting public network access
- Enforcing resource tagging

## Integration with DevOps Pipelines

These ARM templates can be integrated into CI/CD pipelines using:

- Azure DevOps
- GitHub Actions
- Jenkins
- Other CI/CD tools

Example Azure DevOps YAML pipeline snippet:
```yaml
jobs:
- job: DeployARMTemplate
  displayName: 'Deploy Storage Resources'
  steps:
  - task: AzureResourceManagerTemplateDeployment@3
    inputs:
      deploymentScope: 'Resource Group'
      azureResourceManagerConnection: '$(serviceConnection)'
      subscriptionId: '$(subscriptionId)'
      action: 'Create Or Update Resource Group'
      resourceGroupName: '$(resourceGroupName)'
      location: '$(location)'
      templateLocation: 'Linked artifact'
      csmFile: '$(System.DefaultWorkingDirectory)/templates/azure_storage_account_grs.json'
      csmParametersFile: '$(System.DefaultWorkingDirectory)/parameters/storage_account_params.json'
      deploymentMode: 'Incremental'
```

## Customization Guidelines

### Template Modification

When customizing these templates for your environment:

1. Start with a copy of the original template
2. Update parameters and variables as needed
3. Add or modify resources based on requirements
4. Test in a non-production environment first
5. Document changes and reasons for modifications
6. Version control your customized templates

### Common Customizations

- Adding tags for better resource organization
- Integrating with existing VNets and subnets
- Modifying networking rules and access policies
- Adding resource locks to prevent accidental deletion
- Incorporating custom RBAC role assignments

## Troubleshooting

### Common Deployment Issues

1. **Naming conflicts**: Storage account names must be globally unique
   - Solution: Use a naming convention with unique identifiers

2. **Permission issues**: Insufficient permissions for deployment
   - Solution: Ensure deployment account has Contributor role

3. **Resource provider not registered**
   - Solution: Register required resource providers in subscription

4. **Validation errors**
   - Solution: Use ARM template validation before deployment:
     ```bash
     az deployment group validate --resource-group <rg-name> --template-file <template-file>
     ```

5. **Dependency errors**
   - Solution: Ensure proper dependsOn configuration in templates

### Getting Help

For issues with these templates:

- Review Azure Resource Manager documentation
- Check Azure Storage service limits and constraints
- Use Azure Resource Graph to inspect deployed resources
- Review ARM template deployment logs in Azure Portal

## References and Resources

### Microsoft Documentation

- [Azure Resource Manager overview](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/overview)
- [ARM template documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/)
- [Azure Storage documentation](https://learn.microsoft.com/en-us/azure/storage/)
- [Azure Files documentation](https://learn.microsoft.com/en-us/azure/storage/files/)
- [Azure NetApp Files documentation](https://learn.microsoft.com/en-us/azure/azure-netapp-files/)

### Community Resources

- [Azure QuickStart Templates](https://github.com/Azure/azure-quickstart-templates)
- [Azure Storage REST API Reference](https://learn.microsoft.com/en-us/rest/api/storagerp/)
- [Microsoft Q&A for Storage](https://learn.microsoft.com/en-us/answers/tags/164/azure-storage)

### Training Resources

- [Microsoft Learn - Storage Modules](https://learn.microsoft.com/en-us/training/browse/?products=azure-storage)
- [ARM Template Best Practices](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/best-practices)

## Contributing

When contributing to this repository:

1. Ensure all templates are validated against latest ARM schema
2. Include documentation within templates using comments
3. Update README.md to reflect new or modified templates
4. Follow naming conventions for consistency
5. Include parameter files with sample values
6. Test all templates in a development environment
