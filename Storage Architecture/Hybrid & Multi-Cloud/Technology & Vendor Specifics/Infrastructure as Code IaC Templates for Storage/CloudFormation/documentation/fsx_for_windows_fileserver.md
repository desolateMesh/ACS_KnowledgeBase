# FSx for Windows File Server CloudFormation Template Documentation

## Overview

This CloudFormation template provisions an Amazon FSx for Windows File Server, which is a fully managed, highly reliable file storage system that is built on Windows Server. This template enables you to deploy an enterprise-class file system that leverages the Windows file system features and provides fully managed file storage that's accessible via the SMB protocol.

## Template Features

- **Deployment Options**: Supports both Single-AZ and Multi-AZ deployments
- **Storage Configuration**: Configurable storage capacity and throughput
- **Active Directory Integration**: Integration with AWS Managed Microsoft AD or self-managed AD
- **Security Controls**: Security group configuration, KMS encryption
- **Backup and Maintenance**: Configurable backup retention and maintenance windows
- **Audit Logging**: Optional configuration for file and share access auditing

## Prerequisites

Before deploying this template, ensure you have:

1. An existing VPC with appropriate subnets
   - Single-AZ deployments require 1 subnet
   - Multi-AZ deployments require 2 subnets in different Availability Zones
2. Security groups with appropriate rules for FSx traffic (allow ports 445, 5985 for management)
3. For Active Directory integration:
   - Either an AWS Managed Microsoft AD or a self-managed AD
   - Domain admin credentials for self-managed AD integration
4. (Optional) A KMS key for custom encryption

## Parameters

### Network Configuration

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| VpcId | VPC where FSx will be deployed | - | Yes |
| SubnetIds | Subnets where FSx will be deployed | - | Yes |
| PreferredSubnetId | Primary subnet for Multi-AZ | - | For Multi-AZ |

### FSx for Windows Configuration

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| StorageCapacity | Storage capacity in GiB (32-65536) | 300 | Yes |
| ThroughputCapacity | Throughput capacity in MB/s | 16 | Yes |
| StorageType | Storage type (SSD or HDD) | SSD | Yes |
| DeploymentType | Deployment type (Single-AZ or Multi-AZ) | SINGLE_AZ_1 | Yes |

### Active Directory Configuration

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| DirectoryId | Directory ID for AWS Managed AD | - | No |
| DomainName | AD domain name | corp.example.com | For self-managed AD |
| AdminUsername | Admin username | Admin | For self-managed AD |
| AdminPassword | Admin password | - | For self-managed AD |

### Backup and Maintenance Configuration

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| BackupRetentionDays | Days to retain backups (0-90) | 30 | Yes |
| DailyAutomaticBackupStartTime | Daily backup start time (HH:MM) | 02:00 | Yes |
| WeeklyMaintenanceStartTime | Weekly maintenance window (d:HH:MM) | 7:02:00 | Yes |

### Security Configuration

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| SecurityGroupIds | Security groups to associate | - | No |
| KmsKeyId | KMS key for encryption | - | No |
| AuditLogConfiguration | Audit log configuration | DISABLED | No |

## Deployment Options

### Single-AZ Deployment
A Single-AZ deployment (SINGLE_AZ_1 or SINGLE_AZ_2) provides storage within a single Availability Zone. This option is more cost-effective but does not provide the same level of availability as a Multi-AZ deployment.

### Multi-AZ Deployment
A Multi-AZ deployment (MULTI_AZ_1) provides continuous availability by replicating data to a standby file server in a different Availability Zone. This option is recommended for production workloads that require high availability.

## Storage Types

### SSD Storage
SSD storage is recommended for:
- Latency-sensitive workloads
- Applications requiring high IOPS
- Workloads with random file access patterns

### HDD Storage
HDD storage is recommended for:
- Cost-sensitive workloads
- Applications that don't require high IOPS
- Workloads with sequential file access patterns

## Throughput Capacity Selection

The Throughput Capacity determines the level of file server performance and influences the availability of features:

| Throughput (MB/s) | Recommended File Shares | User Connections | Shadow Copies |
|-------------------|-------------------------|------------------|---------------|
| 8-16              | ≤ 500                   | ≤ 1,000          | Limited       |
| 32-64             | ≤ 2,000                 | ≤ 4,000          | Yes           |
| 128-256+          | ≤ 10,000                | ≤ 20,000         | Yes           |

## Storage Capacity Considerations

- **Minimum**: 32 GiB
- **Maximum**: 65,536 GiB (64 TiB)
- **Scaling**: Can be increased but not decreased after deployment
- **Recommendation**: Provision additional capacity beyond immediate needs to accommodate growth

## Active Directory Integration

This template supports two methods of AD integration:

### AWS Managed Microsoft AD
- Specify the DirectoryId parameter
- Leave self-managed AD parameters blank

### Self-Managed AD
- Leave DirectoryId blank
- Specify DomainName, AdminUsername, and AdminPassword

## Backup Configuration

FSx for Windows File Server provides automatic daily backups. Key configurations include:

- **Retention Period**: 0-90 days (0 disables automatic backups)
- **Backup Window**: The daily time window when backups occur
- **Restore Options**: You can restore from any available backup to a new file system

## Security Considerations

### Network Security
- Ensure security groups allow SMB traffic (TCP port 445)
- For administrative operations, allow WinRM traffic (TCP port 5985)
- Consider implementing restrictive access patterns using security groups

### Data Encryption
- All data is encrypted at rest by default (AWS managed key)
- For enhanced security, provide a custom KMS key

### Audit Logging
- Enable audit logging to track file and share access
- Logs can be sent to CloudWatch Logs for analysis and retention

## Outputs

The template provides several outputs to facilitate access to the file system:

| Output | Description | Example Usage |
|--------|-------------|---------------|
| FileSystemId | FSx file system ID | Reference in other templates |
| FileSystemDNSName | DNS name for the file system | For DNS configuration |
| WindowsFileSystemDNSName | UNC path for mounting | `\\fs-xxxx.example.com` |
| RemoteAdminDNSName | Endpoint for remote administration | PowerShell management |
| ActiveDirectoryType | Type of AD configuration used | For documentation |
| DeploymentMode | Deployment type | For documentation |
| StorageCapacityInfo | Storage capacity | For documentation |
| ThroughputCapacityInfo | Throughput capacity | For documentation |

## Connecting to the File System

### From Windows Clients
1. Open File Explorer
2. In the address bar, enter the UNC path: `\\fs-xxxx.domain.com\share`
3. Authenticate with domain credentials

### From Linux Clients
```bash
# Install CIFS utilities
sudo apt-get install cifs-utils

# Create a mount point
sudo mkdir -p /mnt/fsx

# Mount the file system
sudo mount -t cifs //fs-xxxx.domain.com/share /mnt/fsx -o username=user,password=pass,domain=domain.com,vers=3.0
```

## Performance Optimization

### Performance Tips
1. **Choose the Right Throughput Capacity**: Match your workload requirements
2. **Use the Appropriate Storage Type**: SSD for IOPS-sensitive workloads, HDD for throughput-focused workloads
3. **Configure DFS Namespaces**: For Multi-AZ deployments, consider using DFS-N for transparent failover
4. **Use Shadow Copies**: For point-in-time snapshots of data
5. **Optimize I/O Patterns**: Batch small I/Os together when possible

## Cost Considerations

The cost of an FSx for Windows File Server deployment is determined by:

1. **Storage Type and Capacity**: SSD costs more than HDD
2. **Throughput Capacity**: Higher throughput increases cost
3. **Deployment Type**: Multi-AZ costs approximately 2x Single-AZ
4. **Backup Storage**: Backup retention period affects total storage costs
5. **Data Transfer**: Data transfer out of AWS incurs additional costs

## Limitations and Quotas

- **Maximum Storage Capacity**: 64 TiB
- **Maximum Throughput Capacity**: 2048 MB/s
- **Maximum File Shares**: 100,000 per file system
- **Maximum File Size**: 16 TiB
- **Maximum Path Length**: 256 UTF-16 Unicode characters
- **Service Quotas**: Check AWS Service Quotas for current limits

## Troubleshooting

### Common Issues

1. **File System Creation Fails**:
   - Verify VPC and subnet configurations
   - Check security group rules
   - Validate Active Directory settings

2. **Cannot Connect to File System**:
   - Verify network connectivity (security groups, route tables)
   - Check DNS resolution for the file system endpoint
   - Validate AD credentials and membership

3. **Performance Issues**:
   - Monitor CloudWatch metrics for bottlenecks
   - Consider increasing throughput capacity
   - Analyze I/O patterns using Performance Insights

### CloudWatch Monitoring

Key metrics to monitor:

- **NetworkThroughputUtilization**: Network throughput utilization
- **DiskThroughputUtilization**: Disk throughput utilization
- **DiskIopsUtilization**: Disk IOPS utilization
- **CPUUtilization**: File server CPU utilization

## Template Deployment

### Using AWS CLI

```bash
aws cloudformation create-stack \
  --stack-name my-fsx-windows \
  --template-body file://fsx_for_windows_fileserver.yaml \
  --parameters \
    ParameterKey=VpcId,ParameterValue=vpc-xxxxxxxx \
    ParameterKey=SubnetIds,ParameterValue=subnet-xxxxxxxx \
    ParameterKey=StorageCapacity,ParameterValue=300 \
    ParameterKey=ThroughputCapacity,ParameterValue=16 \
    ParameterKey=DeploymentType,ParameterValue=SINGLE_AZ_1 \
  --capabilities CAPABILITY_IAM
```

### Using AWS Console

1. Navigate to CloudFormation in the AWS Console
2. Click "Create stack" > "With new resources (standard)"
3. Choose "Upload a template file" and select the YAML file
4. Fill in the required parameters
5. Review and create the stack

## Best Practices

1. **Sizing and Scaling**:
   - Start with capacity for current needs plus 20% growth
   - Monitor usage patterns and scale as needed

2. **Availability**:
   - Use Multi-AZ for production workloads
   - Implement DFS Namespaces for transparent failover
   - Test failover scenarios regularly

3. **Security**:
   - Use restrictive security groups
   - Implement custom KMS keys for encryption
   - Enable audit logging for compliance

4. **Backup Strategy**:
   - Define retention periods based on recovery requirements
   - Consider manual backups before major changes
   - Test restoration procedures periodically

5. **Performance**:
   - Choose appropriate storage and throughput for workload
   - Monitor performance metrics in CloudWatch
   - Optimize client-side SMB configurations

## Maintenance and Operations

1. **Weekly Maintenance Window**:
   - During maintenance, file system may be temporarily unavailable
   - Schedule during non-critical operational hours
   - For Multi-AZ, failover occurs automatically during maintenance

2. **Scaling Operations**:
   - Storage capacity increases take time to complete
   - Throughput capacity changes are typically faster
   - Monitor elastic network interface changes during scaling

3. **Updates and Patching**:
   - AWS manages OS and software updates
   - Updates occur during maintenance windows
   - No direct administrator access to underlying Windows Server

## Compliance Considerations

FSx for Windows File Server can help meet various compliance requirements:

- **Data Residency**: File systems are created in specific AWS Regions
- **Encryption**: Supports encryption at rest and in transit
- **Audit Logging**: File access auditing for compliance tracking
- **Certifications**: Complies with SOC, PCI DSS, HIPAA, and other standards

## Conclusion

This CloudFormation template provides a comprehensive solution for deploying FSx for Windows File Server in AWS. By properly configuring the parameters based on your specific requirements, you can quickly establish highly available and performant file storage for your Windows-based workloads.

For detailed information about Amazon FSx for Windows File Server, refer to the [official AWS documentation](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html).
