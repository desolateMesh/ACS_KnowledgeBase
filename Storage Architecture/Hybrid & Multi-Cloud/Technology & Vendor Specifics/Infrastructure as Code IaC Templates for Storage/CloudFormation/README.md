# AWS CloudFormation Templates for Storage Architecture

## Overview

This repository contains a collection of AWS CloudFormation templates designed to deploy and manage various storage solutions in AWS environments. These Infrastructure as Code (IaC) templates enable consistent, version-controlled, and automated deployment of storage resources, supporting hybrid and multi-cloud architectures.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Template Categories](#template-categories)
- [Usage Guide](#usage-guide)
- [Best Practices](#best-practices)
- [Template Structure](#template-structure)
- [Parameter Management](#parameter-management)
- [Security Considerations](#security-considerations)
- [Compliance and Governance](#compliance-and-governance)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Prerequisites

Before using these templates, ensure you have:

- An active AWS account with appropriate permissions
- AWS CLI installed and configured
- Basic understanding of AWS CloudFormation concepts
- Knowledge of AWS storage services
- Required IAM permissions to create/modify resources
- AWS CloudFormation quota limits checked

## Template Categories

### S3 Storage Templates

- **s3-standard-bucket.yaml**: Basic S3 bucket with standard storage class
- **s3-versioned-bucket.yaml**: S3 bucket with versioning enabled
- **s3-lifecycle-policies.yaml**: S3 with lifecycle policies for transition and expiration
- **s3-replication.yaml**: Cross-region/account replication configuration
- **s3-encrypted-bucket.yaml**: S3 bucket with SSE-KMS encryption
- **s3-website.yaml**: Static website hosting configuration

### EBS Storage Templates

- **ebs-volume.yaml**: Standard EBS volume creation
- **ebs-snapshot-policy.yaml**: Automated EBS snapshot scheduling
- **ebs-encrypted-volume.yaml**: EBS volumes with encryption

### EFS Storage Templates

- **efs-standard.yaml**: Basic EFS file system
- **efs-access-points.yaml**: EFS with access points configuration
- **efs-backup.yaml**: EFS with AWS Backup integration

### FSx Storage Templates

- **fsx-windows.yaml**: FSx for Windows File Server
- **fsx-lustre.yaml**: FSx for Lustre file systems
- **fsx-ontap.yaml**: FSx for NetApp ONTAP

### Storage Gateway Templates

- **storage-gateway-file.yaml**: File Gateway setup
- **storage-gateway-volume.yaml**: Volume Gateway configuration
- **storage-gateway-tape.yaml**: Tape Gateway deployment

### Snow Family Templates

- **snowball-job.yaml**: Snowball job creation
- **snowcone-deployment.yaml**: Snowcone deployment

### Backup Templates

- **aws-backup-vault.yaml**: AWS Backup vault configuration
- **backup-plan.yaml**: Comprehensive backup plans and rules

## Usage Guide

### Deploying Templates

```bash
# Deploy a stack using CLI
aws cloudformation create-stack \
    --stack-name MyS3Bucket \
    --template-body file://s3-standard-bucket.yaml \
    --parameters ParameterKey=BucketName,ParameterValue=my-unique-bucket-name

# Deploy using YAML parameter file
aws cloudformation create-stack \
    --stack-name MyS3BucketWithParams \
    --template-body file://s3-standard-bucket.yaml \
    --parameters file://parameters.json

# Update an existing stack
aws cloudformation update-stack \
    --stack-name MyS3Bucket \
    --template-body file://s3-standard-bucket.yaml \
    --parameters ParameterKey=BucketName,ParameterValue=my-unique-bucket-name
```

### Console Deployment

1. Navigate to CloudFormation in AWS Console
2. Select "Create stack" > "With new resources"
3. Upload template file or specify S3 URL
4. Follow wizard to configure stack name and parameters
5. Review and create stack

## Best Practices

### Template Design

- **Modularity**: Break down complex architectures into manageable templates
- **Parameters**: Use parameters for values that might change between deployments
- **Conditions**: Implement conditional logic to adapt to different environments
- **Mappings**: Use mappings for region or environment-specific settings
- **Outputs**: Define outputs for values that might be needed by other stacks
- **Description**: Include comprehensive descriptions for templates and parameters

### Security

- Enforce encryption for sensitive data at rest and in transit
- Use IAM roles with least privilege principle
- Implement resource policies to restrict access
- Avoid hardcoding credentials or sensitive information
- Enable logging and monitoring for all storage resources
- Use Parameter Store or Secrets Manager for sensitive parameters

### Cost Optimization

- Use lifecycle policies to transition data to appropriate storage classes
- Implement auto-tiering where applicable
- Configure backup retention policies appropriate to data criticality
- Use resource tagging for cost allocation and tracking
- Configure alerts for unexpected cost increases

## Template Structure

Our templates follow a consistent structure:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Description of what the template does

Metadata:
  # Interface configurations, documentation links, etc.

Parameters:
  # Input parameters definition

Mappings:
  # Regional or environment mappings

Conditions:
  # Conditional logic

Resources:
  # AWS resources to be provisioned

Outputs:
  # Values to be returned after stack creation
```

## Parameter Management

### Parameter Types

- **String**: Standard text input
- **Number**: Numeric values
- **AWS-Specific**: Special AWS-specific parameters (e.g., AWS::EC2::KeyPair::KeyName)
- **CommaDelimitedList**: List of values separated by commas
- **StringList**: List of strings

### Parameter Constraints

Example parameter with constraints:

```yaml
Parameters:
  BucketName:
    Type: String
    Description: Name for the S3 bucket (must be globally unique)
    MinLength: 3
    MaxLength: 63
    AllowedPattern: ^[a-z0-9][a-z0-9.-]*$
    ConstraintDescription: Bucket name must be between 3 and 63 characters, start with a lowercase letter or number, and contain only lowercase letters, numbers, periods, and hyphens.
```

## Security Considerations

### Encryption

- Enable default encryption for S3 buckets
- Use KMS Customer Managed Keys for sensitive data
- Enable encryption for EBS volumes and EFS file systems
- Configure encryption for data in transit

### Access Control

- Implement least privilege IAM policies
- Use bucket policies and ACLs for S3 access control
- Configure NACLs and security groups for network-based storage
- Implement IAM roles for cross-account access

### Compliance Requirements

- Enable versioning for audit requirements
- Configure object lock for WORM compliance
- Set up access logging for audit trails
- Implement tagging for compliance categorization

## Compliance and Governance

### Regulatory Frameworks

Templates include configurations to help meet:
- GDPR
- HIPAA
- PCI DSS
- SOC 2
- NIST

### Governance Features

- Resource tagging enforcement
- Standardized naming conventions
- Policy-driven configurations
- Drift detection capabilities

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| CREATE_FAILED | Insufficient permissions | Verify IAM permissions |
| UPDATE_ROLLBACK_FAILED | Resource dependencies | Check dependency chain, may require manual intervention |
| Bucket creation failure | Name already exists | Choose a globally unique name |
| Parameter validation failure | Input doesn't match constraints | Review parameter requirements |
| Resource limit exceeded | AWS service quotas | Request quota increase |

### CloudFormation Debugging

```bash
# Get detailed status information about a stack
aws cloudformation describe-stack-events --stack-name MyS3Bucket

# Validate template syntax before deployment
aws cloudformation validate-template --template-body file://template.yaml
```

## Contributing

### Template Development Workflow

1. Fork the repository
2. Create feature branch
3. Develop and test template locally
4. Validate using CloudFormation Linter
5. Submit pull request with documentation

### Coding Standards

- Use YAML format with 2-space indentation
- Include comprehensive comments
- Follow resource naming conventions
- Implement tags for all resources
- Include parameter descriptions and constraints

### Testing

- Test templates in isolated development environment
- Verify resource creation and deletion
- Test parameter constraints
- Ensure proper error handling
- Test integration with existing infrastructure

## Example Template: S3 Encrypted Bucket

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Creates an encrypted S3 bucket with versioning and lifecycle policies'

Parameters:
  BucketName:
    Type: String
    Description: 'Name for the S3 bucket (globally unique)'
  EnableVersioning:
    Type: String
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
    Description: 'Enable versioning on the bucket?'
  TransitionDays:
    Type: Number
    Default: 90
    Description: 'Days until objects transition to Standard-IA'
  ExpirationDays:
    Type: Number
    Default: 365
    Description: 'Days until noncurrent versions expire'

Resources:
  S3Bucket:
    Type: 'AWS::S3::Bucket'
    Properties:
      BucketName: !Ref BucketName
      VersioningConfiguration:
        Status: !If [EnableVersioning, 'Enabled', 'Suspended']
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: 'AES256'
      LifecycleConfiguration:
        Rules:
          - Id: TransitionToIA
            Status: Enabled
            Transitions:
              - TransitionInDays: !Ref TransitionDays
                StorageClass: STANDARD_IA
          - Id: ExpireNoncurrentVersions
            Status: Enabled
            NoncurrentVersionExpirationInDays: !Ref ExpirationDays
      Tags:
        - Key: Environment
          Value: !Ref 'AWS::StackName'

  BucketPolicy:
    Type: 'AWS::S3::BucketPolicy'
    Properties:
      Bucket: !Ref S3Bucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Deny
            Principal: '*'
            Action: 's3:*'
            Resource:
              - !Sub 'arn:aws:s3:::${S3Bucket}'
              - !Sub 'arn:aws:s3:::${S3Bucket}/*'
            Condition:
              Bool:
                'aws:SecureTransport': 'false'

Outputs:
  BucketName:
    Description: 'Bucket Name'
    Value: !Ref S3Bucket
  BucketARN:
    Description: 'Bucket ARN'
    Value: !GetAtt S3Bucket.Arn
  BucketDomainName:
    Description: 'Bucket Domain Name'
    Value: !GetAtt S3Bucket.DomainName
```

## Additional Resources

- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [CloudFormation Template Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-reference.html)
- [AWS Storage Services Overview](https://docs.aws.amazon.com/whitepapers/latest/aws-overview/storage-services.html)
- [Storage Networking Industry Association (SNIA)](https://www.snia.org/)
