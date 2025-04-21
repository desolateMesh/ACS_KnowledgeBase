# AWS Lambda Print Queues

## 1. Purpose
This document provides a detailed reference for implementing **serverless print queue management** on AWS using Lambda, SQS, S3, API Gateway, DynamoDB, and CloudWatch. It’s designed so that AI agents can generate infrastructure as code (IaC), deployment scripts, and operational runbooks.

## 2. Scope
- Ingesting print jobs via REST API or S3 events
- Queueing and processing jobs asynchronously with Lambda
- Persisting job metadata and status in DynamoDB
- Storing raw print data in S3
- Exposing APIs for job submission, status, and retrieval
- Ensuring security, scalability, observability, and cost-effectiveness

## 3. Definitions
- **Print Job**: A document or data payload submitted for printing (PDF, PCL, PostScript).
- **Job Queue**: AWS SQS queue that buffers print job events.
- **Processor Lambda**: AWS Lambda function that reads from SQS, processes and routes to printers.
- **API Gateway**: Provides RESTful interface for clients to submit and query jobs.
- **Job Table**: DynamoDB table storing job metadata (ID, status, timestamps).
- **Storage Bucket**: S3 bucket where raw job payloads are saved.

## 4. Architecture Overview

### 4.1 Components
| Component           | AWS Service        | Responsibility                                    |
|---------------------|--------------------|---------------------------------------------------|
| Ingestion API       | API Gateway        | Expose `/jobs` POST and GET endpoints             |
| Event Queue         | SQS                | Buffer job submission events                      |
| Compute             | Lambda             | Fetch queue messages, process print logic         |
| Storage             | S3                 | Store raw job files                               |
| Metadata Store      | DynamoDB           | Persist job metadata and state transitions        |
| Monitoring & Logs   | CloudWatch         | Collect metrics, logs, and set alarms             |

### 4.2 Data Flow
1. **Submit Job**: Client `POST /jobs` with JSON metadata and S3 pre-signed URL for upload.
2. **Upload Payload**: Client PUTs file to S3 bucket `print-jobs-raw`.
3. **S3 Event**: S3 triggers `JobSubmitLambda` with event data.
4. **Enqueue**: `JobSubmitLambda` writes metadata to DynamoDB (Status: PENDING) and sends message to SQS.
5. **Process**: `JobProcessorLambda` polls SQS, fetches file from S3, executes print conversion or spooling logic, invokes CUPS or third-party print API.
6. **Update**: Upon success/failure, Lambda updates DynamoDB status (COMPLETED / FAILED), and optionally sends notification (SNS/email).
7. **Query**: Client `GET /jobs/{jobId}` reads metadata from DynamoDB to check status and log details.

## 5. Use Cases
- **Direct PDF Printing**: Small docs printed immediately.
- **High-Volume Batch Jobs**: Large print runs segmented and processed in parallel Lambdas.
- **Secure Print Release**: Hold jobs until user authentication then process.
- **Cost-Aware Processing**: Offload heavy conversion tasks only during low-cost windows.

## 6. Prerequisites
- AWS Account with permissions for: IAM, S3, SQS, Lambda, API Gateway, DynamoDB, CloudWatch.
- AWS CLI or IaC tool (Terraform/CloudFormation).
- Existing VPC and subnets if Lambda requires private connectivity.
- Printer endpoint access (via on-prem gateway or internet-enabled printer API).

## 7. Infrastructure as Code Example

### 7.1 Terraform Snippet
```hcl
resource "aws_s3_bucket" "print_jobs" {
  bucket = "print-jobs-raw-${var.environment}"
  versioning { enabled = true }
  server_side_encryption_configuration {
    rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
  }
}

resource "aws_dynamodb_table" "job_table" {
  name           = "print-jobs-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "JobId"
  attribute { name = "JobId", type = "S" }
  attribute { name = "Status", type = "S" }
}

resource "aws_sqs_queue" "job_queue" {
  name                       = "print-job-queue-${var.environment}"
  visibility_timeout_seconds = 300
}
```

### 7.2 Lambda Function (Python)
```python
import boto3
import os

def handler(event, context):
    sqs = boto3.client('sqs')
    queue_url = os.environ['QUEUE_URL']

    for record in event['Records']:
        job_id = record['dynamodb']['NewImage']['JobId']['S']
        message = {'job_id': job_id}
        sqs.send_message(QueueUrl=queue_url, MessageBody=json.dumps(message))
```

## 8. API Gateway Configuration
- **Endpoint**: `https://{api_id}.execute-api.{region}.amazonaws.com/{stage}/jobs`
- **Methods**:
  - `POST /jobs`: _Lambda proxy integration_ → `JobSubmitLambda`
  - `GET /jobs/{jobId}`: _Lambda proxy integration_ → `JobQueryLambda`
- **Request Validation**: JSON schema enforcement for metadata fields.

## 9. IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::print-jobs-raw-*/*"},
    {"Effect":"Allow","Action":["sqs:SendMessage","sqs:ReceiveMessage","sqs:DeleteMessage"],"Resource":"arn:aws:sqs:*:*:print-job-queue-*"},
    {"Effect":"Allow","Action":["dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:GetItem"],"Resource":"arn:aws:dynamodb:*:*:table/print-jobs-*"}
  ]
}
```

## 10. Security Best Practices
- **Least Privilege**: Grant each Lambda only required permissions.
- **Encryption**: S3 SSE, SQS encryption, DynamoDB encryption at rest.
- **VPC**: Deploy Lambdas inside a VPC for private printer access.
- **Traffic Control**: Use API Gateway WAF for rate limiting.
- **Audit Logging**: Enable CloudTrail on all services.

## 11. Performance Optimization
- **Batch Size**: Configure SQS batch size (up to 10) for `JobProcessorLambda`.
- **Concurrency**: Reserve concurrency for heavy workloads.
- **Provisioned Concurrency**: Mitigate cold starts for critical paths.
- **Memory/Timeout**: Tune per observed processing time.

## 12. Monitoring & Alerts
- **Metrics**: `ApproximateNumberOfMessagesVisible`, Lambda `Errors`, `Duration`.
- **Alarms**: Set CloudWatch alarms on message backlog > 50 or Lambda errors > 1%.
- **Logs**: Structured JSON logs to CloudWatch Logs; implement log retention policy.

## 13. Error Handling & Retries
- **SQS Redrive Policy**: Dead-letter queue for messages failing > 3 attempts.
- **Lambda Retries**: Automatic retry on function error.
- **Alerting**: SNS notification on DLQ message arrival.

## 14. Testing & Validation
- **Unit Tests**: Mock S3, SQS, DynamoDB clients to test job lifecycle.
- **Integration Tests**: Deploy in a test stage; submit sample jobs via API and verify end-to-end flow.
- **Performance Tests**: Simulate bulk uploads (1000 jobs/hour) and measure processing times.

## 15. Troubleshooting
| Symptom                      | Possible Cause            | Resolution                                           |
|------------------------------|---------------------------|------------------------------------------------------|
| Jobs stuck in queue          | Lambda permissions error  | Verify IAM role for `sqs:ReceiveMessage`             |
| Missing files in S3          | Incorrect S3 event config | Check S3 event notification filter and prefix        |
| API 5XX errors               | Lambda timeout too low    | Increase function `Timeout` and test locally         |

## 16. References
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)  
- [Amazon SQS Developer Guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/)  
- [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api.html)  
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)

