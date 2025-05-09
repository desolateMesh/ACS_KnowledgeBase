# Azure Files Share ARM Template

## Overview

This ARM (Azure Resource Manager) template automates the deployment of Azure Files shares with advanced configuration options. Azure Files offers fully managed file shares in the cloud that are accessible via the industry-standard Server Message Block (SMB) and Network File System (NFS) protocols. This template enables consistent deployment of file shares with predefined configurations for enterprise environments, supporting both hybrid and multi-cloud storage architectures.

## Template Capabilities

This template provides comprehensive configuration options for Azure Files shares, including:

- Creation of file shares with specified quota limits
- Configuration of access tiers for cost-performance optimization
- Protocol selection (SMB, NFS, or both) with advanced protocol-specific settings
- Snapshot scheduling and retention policies for data protection
- Root squash settings for NFS security
- Tagging for resource organization and cost attribution

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `storageAccountName` | string | (required) | Name of the existing storage account where the file share will be created |
| `fileShareName` | string | "default-share" | Name of the Azure Files share to be created |
| `fileShareQuota` | int | 5120 | Maximum size of the file share in GiB (1-102400) |
| `tier` | string | "TransactionOptimized" | Access tier of the file share (TransactionOptimized, Hot, Cool, Premium) |
| `enableLargeFileShares` | bool | false | Enable support for large file shares up to 100TiB |
| `protocolSettings` | object | (see template) | Protocol settings for SMB shares including version, authentication, and encryption |
| `accessTier` | string | "TransactionOptimized" | Performance tier for the file share |
| `shareAccessTier` | string | "TransactionOptimized" | Redundant parameter for backward compatibility |
| `rootSquash` | string | "NoRootSquash" | Root squash setting for NFS shares (NoRootSquash, RootSquash, AllSquash) |
| `enabledProtocols` | string | "SMB" | Protocols enabled for the share (SMB, NFS, or both) |
| `snapshotSchedule` | object | (see template) | Configuration for automated snapshot schedules |
| `tags` | object | (see template) | Tags to apply to the file share for organization |
| `location` | string | resourceGroup().location | Azure region for resource deployment |

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `fileShareResourceId` | string | Complete resource ID of the deployed file share |
| `fileShareUrl` | string | URL endpoint for accessing the file share |
| `storageAccountId` | string | Resource ID of the parent storage account |
| `deploymentTime` | string | UTC timestamp of the deployment |

## Usage Scenarios

### 1. Enterprise File Sharing

Deploy SMB file shares for corporate file sharing with proper authentication and encryption:

```json
{
  "storageAccountName": { "value": "corpfileshare01" },
  "fileShareName": { "value": "department-documents" },
  "fileShareQuota": { "value": 10240 },
  "tier": { "value": "TransactionOptimized" },
  "protocolSettings": {
    "value": {
      "smb": {
        "versions": "SMB3.0;SMB3.1.1",
        "authenticationMethods": "NTLMv2;Kerberos",
        "kerberosTicketEncryption": "AES-256",
        "channelEncryption": "AES-256-GCM"
      }
    }
  },
  "enabledProtocols": { "value": "SMB" },
  "tags": {
    "value": {
      "environment": "production",
      "department": "finance",
      "application": "erp",
      "costCenter": "123456"
    }
  }
}
```

### 2. Linux Application Data Storage

Deploy NFS shares for Linux applications with appropriate security settings:

```json
{
  "storageAccountName": { "value": "linuxappdata01" },
  "fileShareName": { "value": "app-data" },
  "fileShareQuota": { "value": 5120 },
  "tier": { "value": "Premium" },
  "enabledProtocols": { "value": "NFS" },
  "rootSquash": { "value": "RootSquash" },
  "tags": {
    "value": {
      "environment": "production",
      "application": "inventory-system",
      "costCenter": "IT-789"
    }
  }
}
```

### 3. Hybrid Cloud Storage Architecture

Deploy file shares for hybrid cloud scenarios with Azure Files and on-premises synchronization:

```json
{
  "storageAccountName": { "value": "hybridfiles01" },
  "fileShareName": { "value": "hybrid-share" },
  "fileShareQuota": { "value": 20480 },
  "tier": { "value": "TransactionOptimized" },
  "enabledProtocols": { "value": "SMB" },
  "snapshotSchedule": {
    "value": {
      "enabled": true,
      "dailySchedule": {
        "enabled": true,
        "hour": 0,
        "minute": 0,
        "retentionDays": 30,
        "snapshotsToKeep": 30
      },
      "weeklySchedule": {
        "enabled": true,
        "day": "Sunday",
        "hour": 0,
        "minute": 0,
        "retentionDays": 90,
        "snapshotsToKeep": 12
      }
    }
  }
}
```

## Deployment Instructions

### Azure Portal

1. Navigate to the Azure Portal (https://portal.azure.com)
2. Search for "Deploy a custom template"
3. Click "Build your own template in the editor"
4. Copy and paste the contents of this ARM template
5. Click "Save"
6. Fill in the required parameters
7. Review and create the deployment

### Azure CLI

```bash
# Create a parameters file named parameters.json with your configuration values
az deployment group create \
  --resource-group YourResourceGroup \
  --template-file azure_files_share.json \
  --parameters @parameters.json
```

### Azure PowerShell

```powershell
# Create a parameters file named parameters.json with your configuration values
New-AzResourceGroupDeployment `
  -ResourceGroupName YourResourceGroup `
  -TemplateFile azure_files_share.json `
  -TemplateParameterFile parameters.json
```

## Technical Considerations

### Storage Account Requirements

- The storage account must already exist before deploying this template
- For Premium file shares, the storage account must be a Premium FileStorage account
- For NFS shares, the storage account must be a Premium FileStorage account and have proper network security configured

### Performance Considerations

- **Transaction-Optimized**: Best for general purpose file sharing with moderate performance needs
- **Hot**: Optimized for frequent access with moderate performance
- **Cool**: Lower costs for infrequently accessed data
- **Premium**: Highest performance with SSD backing, suitable for IO-intensive workloads

### Security Considerations

- SMB 3.0+ with encryption is recommended for all production workloads
- Properly configure network access using storage account firewall, private endpoints, or service endpoints
- Consider using Azure AD authentication for SMB shares for enhanced security
- For NFS shares, enable root squash to prevent potential security issues with root access

### Cost Optimization

- Select the appropriate access tier based on workload requirements
- Implement lifecycle management for data that transitions between access frequencies
- Monitor and adjust quota sizes to avoid over-provisioning
- Use tags for proper cost allocation and monitoring

## Monitoring and Management

After deployment, monitor the file share using:

- Azure Monitor metrics for file shares (IOPS, throughput, latency)
- Azure Storage Explorer for direct management of share contents
- Azure Security Center for security recommendations
- Cost Management + Billing for cost tracking and optimization

## Troubleshooting

Common issues and solutions:

1. **Deployment fails with "Storage account not found"**:
   - Verify that the storage account exists and is in the same resource group
   - Check for typos in the storage account name

2. **NFS protocol not available**:
   - Ensure the storage account is Premium FileStorage tier
   - Verify that NFS 4.1 protocol is enabled on the storage account

3. **SMB authentication issues**:
   - Check firewall settings on the storage account
   - Verify that the proper authentication methods are configured
   - Ensure proper network connectivity between clients and the storage account

4. **Quota limitations**:
   - Premium shares: Maximum 100 TiB
   - Standard shares: Maximum 5 TiB unless large file shares are enabled

## Related Resources

- [Azure Files Documentation](https://docs.microsoft.com/en-us/azure/storage/files/)
- [Azure Files SMB Security](https://docs.microsoft.com/en-us/azure/storage/files/storage-files-smb-security)
- [Azure Files NFS Overview](https://docs.microsoft.com/en-us/azure/storage/files/files-nfs-protocol)
- [Azure Storage Account Overview](https://docs.microsoft.com/en-us/azure/storage/common/storage-account-overview)
- [ARM Template Reference for Storage Accounts](https://docs.microsoft.com/en-us/azure/templates/microsoft.storage/storageaccounts)

## Advanced Configurations

### Azure Files with Private Endpoints

To enhance security by keeping all traffic on the Microsoft Azure backbone network, consider deploying this file share with private endpoints:

```json
{
  "storageAccountName": { "value": "privatefileshare01" },
  "fileShareName": { "value": "secure-share" },
  "fileShareQuota": { "value": 5120 },
  "tier": { "value": "Premium" },
  "enabledProtocols": { "value": "SMB" }
}
```

Then deploy the Private Endpoint separately or use the `azure_storage_account_with_private_endpoint.json` template.

### Azure Files with Azure File Sync

For hybrid storage scenarios with on-premises file servers, deploy this file share and then configure Azure File Sync:

```json
{
  "storageAccountName": { "value": "syncfileshare01" },
  "fileShareName": { "value": "sync-share" },
  "fileShareQuota": { "value": 10240 },
  "tier": { "value": "TransactionOptimized" },
  "enabledProtocols": { "value": "SMB" }
}
```

Then deploy Azure File Sync using the `azure_storage_sync_service_and_group.json` template.

## Template Version History

- **1.0.0** - Initial template with basic file share creation
- **1.0.1** - Added support for SMB protocol settings
- **1.0.2** - Added support for NFS shares and root squash
- **1.0.3** - Added snapshot scheduling capabilities
- **1.0.4** - Added support for tagging and extended outputs