# S3 Bucket With KMS Encryption - CloudFormation Template

## Overview

This CloudFormation template creates a secure Amazon S3 bucket with AWS Key Management Service (KMS) encryption. The template configures a customer-managed KMS key specifically for the S3 bucket, establishing server-side encryption for all objects stored within the bucket. This implementation follows security best practices for protecting sensitive data at rest in AWS cloud storage.

## Template Specifications

- **Template Type**: AWS CloudFormation
- **AWS Services**: Amazon S3, AWS KMS
- **Primary Function**: Creates encrypted S3 storage with dedicated KMS keys
- **Implementation Scope**: Single-region deployment
- **Security Compliance**: Suitable for HIPAA, PCI-DSS, GDPR, and FedRAMP workloads
- **Template Format Version**: 2010-09-09

## Resources Created

The template provisions the following AWS resources:

1. **AWS KMS Key** (`AWS::KMS::Key`)
   - Customer-managed symmetric encryption key
   - Configurable key rotation
   - Customizable key policy for access control
   - Optional multi-region key capability

2. **AWS KMS Alias** (`AWS::KMS::Alias`)
   - Friendly name for the KMS key
   - Simplifies key reference in policies and configurations

3. **S3 Bucket** (`AWS::S3::Bucket`)
   - Standard S3 bucket with configurable properties
   - KMS-encryption enabled by default
   - Optional versioning, lifecycle rules, and access logging
   - Optional replication configuration

4. **S3 Bucket Policy** (`AWS::S3::BucketPolicy`)
   - Enforces HTTPS for data in transit
   - Restricts bucket access based on conditions
   - Implements least privilege access patterns

## Parameters

| Parameter Name | Type | Default | Description |
|----------------|------|---------|-------------|
| `BucketName` | String | - | Globally unique name for the S3 bucket (3-63 characters, lowercase) |
| `EnableKeyRotation` | Boolean | true | Enables automatic rotation of the KMS key annually |
| `KeyAdministratorArn` | String | - | ARN of the IAM entity (user/role) that will administer the KMS key |
| `KeyUserArn` | String | - | ARN of the IAM entity (user/role) that will use the KMS key |
| `EnableVersioning` | Boolean | true | Enables versioning on the S3 bucket |
| `EnableAccessLogging` | Boolean | false | Enables S3 access logging |
| `LoggingBucketName` | String | - | Target bucket for access logs (required if EnableAccessLogging is true) |
| `LoggingPrefix` | String | - | Prefix for log objects within the logging bucket |
| `BlockPublicAccess` | Boolean | true | Enables S3 Block Public Access settings |
| `EnforceSSL` | Boolean | true | Enforces SSL/TLS for all bucket requests |

## Key Features

### Enhanced Security

1. **Data Encryption at Rest**
   - All objects are automatically encrypted using the customer-managed KMS key
   - Encryption cannot be disabled for objects in the bucket
   - Support for S3 Bucket Keys to reduce KMS API costs

2. **Access Control**
   - Fine-grained permissions via KMS key policy and bucket policy
   - Separation of key administration and usage roles
   - Integration with IAM for centralized access management

3. **Secure Transport**
   - Option to enforce HTTPS for all bucket operations
   - Prevents clear-text data transmission

4. **Public Access Prevention**
   - Block Public Access settings at bucket level
   - Prevents accidental public exposure of data

### Compliance and Governance

1. **Audit Trail**
   - Optional bucket access logging
   - Integration with AWS CloudTrail for API activity logging
   - KMS key usage tracking

2. **Data Lifecycle Management**
   - Optional versioning for change tracking and recovery
   - Customizable lifecycle rules for cost optimization
   - Protection against accidental deletion

3. **Compliance Requirements Support**
   - Meets encryption requirements for regulated workloads
   - Supporting configurations for various compliance frameworks
   - Centralized key management for regulatory requirements

## Usage Examples

### Basic Deployment

Deploy the stack with minimal required parameters:

```bash
aws cloudformation create-stack \
    --stack-name MyEncryptedS3Bucket \
    --template-body file://s3_bucket_with_kms_encryption.yaml \
    --parameters \
        ParameterKey=BucketName,ParameterValue=my-secure-company-data \
        ParameterKey=KeyAdministratorArn,ParameterValue=arn:aws:iam::123456789012:role/KeyAdminRole \
        ParameterKey=KeyUserArn,ParameterValue=arn:aws:iam::123456789012:role/S3AccessRole
```

### Advanced Deployment with Full Security Controls

```bash
aws cloudformation create-stack \
    --stack-name EnterpriseSecureStorage \
    --template-body file://s3_bucket_with_kms_encryption.yaml \
    --parameters \
        ParameterKey=BucketName,ParameterValue=enterprise-secure-data-2025 \
        ParameterKey=EnableKeyRotation,ParameterValue=true \
        ParameterKey=KeyAdministratorArn,ParameterValue=arn:aws:iam::123456789012:role/SecurityTeamRole \
        ParameterKey=KeyUserArn,ParameterValue=arn:aws:iam::123456789012:role/DataScienceTeam \
        ParameterKey=EnableVersioning,ParameterValue=true \
        ParameterKey=EnableAccessLogging,ParameterValue=true \
        ParameterKey=LoggingBucketName,ParameterValue=enterprise-access-logs \
        ParameterKey=LoggingPrefix,ParameterValue=s3-access-logs/ \
        ParameterKey=BlockPublicAccess,ParameterValue=true \
        ParameterKey=EnforceSSL,ParameterValue=true
```

## Complete Template Structure

This is the full YAML structure for the CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Creates an S3 bucket with KMS encryption for secure storage'

Parameters:
  BucketName:
    Type: String
    Description: 'Globally unique name for the S3 bucket'
    MinLength: 3
    MaxLength: 63
    AllowedPattern: '^[a-z0-9][a-z0-9.-]*$'
    ConstraintDescription: 'Bucket name must be between 3 and 63 characters, start with a lowercase letter or number, and contain only lowercase letters, numbers, periods, and hyphens.'

  EnableKeyRotation:
    Type: String
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
    Description: 'Enable automatic rotation of the KMS key annually'

  KeyAdministratorArn:
    Type: String
    Description: 'ARN of the IAM entity that will administer the KMS key'

  KeyUserArn:
    Type: String
    Description: 'ARN of the IAM entity that will use the KMS key'

  EnableVersioning:
    Type: String
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
    Description: 'Enable versioning on the S3 bucket'

  EnableAccessLogging:
    Type: String
    Default: 'false'
    AllowedValues:
      - 'true'
      - 'false'
    Description: 'Enable S3 access logging'

  LoggingBucketName:
    Type: String
    Description: 'Target bucket for access logs (required if EnableAccessLogging is true)'
    Default: ''

  LoggingPrefix:
    Type: String
    Description: 'Prefix for log objects within the logging bucket'
    Default: ''

  BlockPublicAccess:
    Type: String
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
    Description: 'Enable S3 Block Public Access settings'

  EnforceSSL:
    Type: String
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
    Description: 'Enforce SSL/TLS for all bucket requests'

Conditions:
  ShouldEnableKeyRotation: !Equals [!Ref EnableKeyRotation, 'true']
  ShouldEnableVersioning: !Equals [!Ref EnableVersioning, 'true']
  ShouldEnableAccessLogging: !Equals [!Ref EnableAccessLogging, 'true']
  ShouldBlockPublicAccess: !Equals [!Ref BlockPublicAccess, 'true']
  ShouldEnforceSSL: !Equals [!Ref EnforceSSL, 'true']

Resources:
  # KMS Key for S3 Bucket Encryption
  S3BucketKMSKey:
    Type: 'AWS::KMS::Key'
    Properties:
      Description: 'KMS key for S3 bucket encryption'
      EnableKeyRotation: !If [ShouldEnableKeyRotation, true, false]
      KeyPolicy:
        Version: '2012-10-17'
        Id: key-policy-1
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow Key Administrator
            Effect: Allow
            Principal:
              AWS: !Ref KeyAdministratorArn
            Action:
              - 'kms:Create*'
              - 'kms:Describe*'
              - 'kms:Enable*'
              - 'kms:List*'
              - 'kms:Put*'
              - 'kms:Update*'
              - 'kms:Revoke*'
              - 'kms:Disable*'
              - 'kms:Get*'
              - 'kms:Delete*'
              - 'kms:TagResource'
              - 'kms:UntagResource'
              - 'kms:ScheduleKeyDeletion'
              - 'kms:CancelKeyDeletion'
            Resource: '*'
          - Sid: Allow Key Usage
            Effect: Allow
            Principal:
              AWS: !Ref KeyUserArn
            Action:
              - 'kms:Encrypt'
              - 'kms:Decrypt'
              - 'kms:ReEncrypt*'
              - 'kms:GenerateDataKey*'
              - 'kms:DescribeKey'
            Resource: '*'
          - Sid: Allow S3 Service to Use the Key
            Effect: Allow
            Principal:
              Service: s3.amazonaws.com
            Action:
              - 'kms:GenerateDataKey*'
              - 'kms:Decrypt'
            Resource: '*'
      Tags:
        - Key: Name
          Value: !Sub 'S3-KMS-Key-${BucketName}'
        - Key: Purpose
          Value: 'S3 Encryption'

  # KMS Alias for easier key reference
  S3BucketKMSKeyAlias:
    Type: 'AWS::KMS::Alias'
    Properties:
      AliasName: !Sub 'alias/${BucketName}-key'
      TargetKeyId: !Ref S3BucketKMSKey

  # S3 Bucket with KMS Encryption
  S3Bucket:
    Type: 'AWS::S3::Bucket'
    Properties:
      BucketName: !Ref BucketName
      VersioningConfiguration:
        Status: !If [ShouldEnableVersioning, 'Enabled', 'Suspended']
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: 'aws:kms'
              KMSMasterKeyID: !GetAtt S3BucketKMSKey.Arn
            BucketKeyEnabled: true
      LoggingConfiguration: !If
        - ShouldEnableAccessLogging
        - DestinationBucketName: !Ref LoggingBucketName
          LogFilePrefix: !Ref LoggingPrefix
        - !Ref AWS::NoValue
      PublicAccessBlockConfiguration: !If
        - ShouldBlockPublicAccess
        - BlockPublicAcls: true
          BlockPublicPolicy: true
          IgnorePublicAcls: true
          RestrictPublicBuckets: true
        - !Ref AWS::NoValue
      Tags:
        - Key: Name
          Value: !Ref BucketName
        - Key: Environment
          Value: !Ref 'AWS::StackName'
        - Key: Encryption
          Value: 'KMS'

  # S3 Bucket Policy to enforce HTTPS
  BucketPolicy:
    Type: 'AWS::S3::BucketPolicy'
    Condition: ShouldEnforceSSL
    Properties:
      Bucket: !Ref S3Bucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: ForceSSLOnly
            Effect: Deny
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
    Description: 'Name of the S3 bucket'
    Value: !Ref S3Bucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'

  BucketARN:
    Description: 'ARN of the S3 bucket'
    Value: !GetAtt S3Bucket.Arn
    Export:
      Name: !Sub '${AWS::StackName}-BucketARN'

  KMSKeyID:
    Description: 'ID of the KMS key'
    Value: !Ref S3BucketKMSKey
    Export:
      Name: !Sub '${AWS::StackName}-KMSKeyID'

  KMSKeyARN:
    Description: 'ARN of the KMS key'
    Value: !GetAtt S3BucketKMSKey.Arn
    Export:
      Name: !Sub '${AWS::StackName}-KMSKeyARN'

  KMSKeyAlias:
    Description: 'Alias of the KMS key'
    Value: !Ref S3BucketKMSKeyAlias
    Export:
      Name: !Sub '${AWS::StackName}-KMSKeyAlias'
```

## Implementation Considerations

### Security Considerations

1. **KMS Key Security**
   - Key administrators should be limited to security personnel
   - Key users should only include necessary application roles
   - Avoid using individual IAM users in key policies
   - Regularly audit key access via CloudTrail

2. **S3 Access Controls**
   - Implement least privilege access to the bucket
   - Consider using IAM conditions to restrict access from specific VPCs
   - Use S3 Object Lock for sensitive data that should not be deleted
   - Regularly review bucket policies and access patterns

3. **Encryption Constraints**
   - KMS encryption slightly increases latency for S3 operations
   - KMS API call limits apply (consider S3 Bucket Keys for optimization)
   - Cross-region replication requires additional KMS key configuration
   - AWS service integrations may require specific KMS key permissions

### Cost Implications

1. **KMS Costs**
   - Monthly fee for each KMS Customer Managed Key
   - API request charges for KMS operations (encrypt/decrypt)
   - Cost optimization via S3 Bucket Keys (reduces KMS API calls)

2. **S3 Costs**
   - Standard S3 storage costs apply
   - Additional charges for versioning (more objects stored)
   - Potential data transfer costs between AWS services
   - Consider lifecycle policies to manage long-term storage costs

## Operational Best Practices

1. **Backup and Disaster Recovery**
   - Enable versioning to protect against accidental deletion
   - Consider cross-region replication for geographic redundancy
   - Implement AWS Backup plans for systematic backups
   - Test restore procedures periodically

2. **Monitoring and Alerting**
   - Set up CloudWatch alarms for unauthorized access attempts
   - Monitor for unexpected cost increases
   - Track KMS key usage patterns
   - Configure S3 event notifications for critical operations

3. **Maintenance**
   - Regularly review and update IAM policies
   - Check CloudTrail logs for suspicious activities
   - Ensure key rotation is functioning as expected
   - Apply any AWS security recommendations promptly

## Integration Patterns

### Hybrid Cloud Integration

1. **On-premises to S3 Transfer**
   - AWS Storage Gateway for seamless on-premises integration
   - Direct Connect for secure, dedicated connectivity
   - AWS Transfer Family for SFTP/FTPS/FTP access to encrypted buckets
   - AWS DataSync for large-scale migrations

2. **Multi-cloud Considerations**
   - S3 Replication to another AWS region for redundancy
   - Custom solutions required for S3 to non-AWS cloud storage
   - Key management considerations when spanning cloud providers
   - Authentication mechanisms for cross-cloud access

### Application Integration

1. **AWS Services**
   - IAM roles for EC2/Lambda/ECS to access the encrypted bucket
   - CloudFront distribution for secure content delivery
   - AWS S3 Select for efficient querying of encrypted objects
   - AWS Lambda for event-driven processing of bucket events

2. **Third-party Applications**
   - Application-level encryption considerations
   - SDK/API access patterns for encrypted buckets
   - Integration with third-party key management systems
   - Performance considerations for encryption/decryption operations

## Compliance Documentation

### HIPAA Compliance

This template supports HIPAA compliance by:
- Implementing encryption at rest with customer-managed keys
- Enabling transport encryption (HTTPS only)
- Supporting access logging for audit purposes
- Providing mechanisms for access control and least privilege

### PCI-DSS Compliance

This template supports PCI-DSS compliance by:
- Enforcing encryption for cardholder data at rest
- Restricting access to cryptographic keys
- Supporting secure transmission of cardholder data
- Enabling logging mechanisms for activity tracking

### GDPR Considerations

This template supports GDPR requirements by:
- Implementing technical safeguards for personal data
- Enabling mechanisms to support data subject rights
- Providing logging capabilities for accountability
- Supporting encryption for data protection

## Troubleshooting

### Common Deployment Issues

1. **Bucket Name Already Exists**
   - S3 bucket names must be globally unique across all AWS accounts
   - Change the bucket name parameter and redeploy
   - Check for existing buckets in the AWS account

2. **IAM Permission Errors**
   - Ensure deployment role has sufficient permissions
   - Verify IAM ARNs for key administration and usage
   - Check IAM policy syntax and formatting

3. **KMS Throttling Issues**
   - Monitor KMS API usage and request increases if needed
   - Implement S3 Bucket Keys to reduce API calls
   - Implement exponential backoff in applications

### Operational Troubleshooting

1. **Access Denied Errors**
   - Check bucket policy and IAM permissions
   - Verify KMS key access for the identity
   - Confirm HTTPS usage if SSL enforcement is enabled
   - Review S3 Block Public Access settings

2. **Performance Concerns**
   - KMS adds minimal overhead for most operations
   - Consider S3 Bucket Keys for high-throughput workloads
   - Monitor KMS API call quotas in CloudWatch
   - Use appropriate SDK handling for KMS-related operations

## Modification Guidelines

### Template Customization

To modify this template for different requirements:

1. **Additional S3 Features**
   - Add CORS configuration for web applications
   - Configure event notifications for workflows
   - Implement lifecycle rules for cost optimization
   - Set up replication for disaster recovery

2. **Enhanced Security**
   - Add VPC endpoint policy constraints
   - Implement S3 Object Lock for WORM compliance
   - Configure more restrictive bucket policies
   - Add CloudWatch alarms for security monitoring

### Version Control Best Practices

1. **Template Management**
   - Store templates in a version control system
   - Document changes between versions
   - Use nested stacks for complex architectures
   - Implement CI/CD pipelines for template validation

2. **Parameter Management**
   - Store environment-specific parameters separately
   - Use AWS Systems Manager Parameter Store for sensitive values
   - Implement parameter validation in deployment scripts
   - Document parameter interdependencies

## Related Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/latest/developerguide/overview.html)
- [CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)
- [S3 Encryption Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)

## Conclusion

This S3 bucket with KMS encryption CloudFormation template provides a robust foundation for secure data storage in AWS. By implementing industry best practices for encryption, access control, and security monitoring, this template helps organizations meet their security and compliance requirements while maintaining operational flexibility.

The template's parameterization allows for customization to specific organizational needs, while the default configurations establish a secure baseline. By leveraging AWS CloudFormation, organizations can ensure consistent, repeatable deployments of secure storage infrastructure across multiple environments.
