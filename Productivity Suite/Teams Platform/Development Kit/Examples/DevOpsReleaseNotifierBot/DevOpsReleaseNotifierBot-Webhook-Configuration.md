# DevOpsReleaseNotifierBot – Webhook Configuration Guide

## Table of Contents
- [Overview](#overview)
- [Supported CI/CD Sources](#supported-cicd-sources)
- [Webhook Endpoint Details](#webhook-endpoint-details)
- [Deployment Prerequisites](#deployment-prerequisites)
- [Webhook Setup Instructions](#webhook-setup-instructions)
- [Payload Schema](#payload-schema)
- [Authentication & Validation](#authentication--validation)
- [Error Handling & Common Failures](#error-handling--common-failures)
- [Testing & Simulation](#testing--simulation)
- [Monitoring & Logging](#monitoring--logging)
- [Security Considerations](#security-considerations)
- [Scalability & Reliability](#scalability--reliability)
- [Change Management & Versioning](#change-management--versioning)
- [Appendix: Example Payloads](#appendix-example-payloads)

---

## Overview

The `DevOpsReleaseNotifierBot` leverages webhook event subscriptions to receive release-related payloads from CI/CD systems (primarily Azure DevOps and GitHub). These webhook events are parsed, validated, and forwarded into Microsoft Teams channels using the bot’s adaptive card notification system.

This guide defines how to configure, secure, and troubleshoot the webhook ingestion pipeline.

---

## Supported CI/CD Sources

| Source         | Events Supported                    | Notes |
|----------------|--------------------------------------|-------|
| Azure DevOps   | Release Created, Release Completed, Approval Pending | Via service hooks |
| GitHub         | `release`, `workflow_run`, `deployment_status`      | Requires PAT or GitHub App |
| GitHub Actions | Workflow run notifications           | Triggered by successful pipelines |
| Jenkins        | Manual webhook POST (custom JSON)    | Requires adapter |
| Custom CI/CD   | Any system capable of JSON POST      | Must conform to schema |

---

## Webhook Endpoint Details

- **Endpoint Path**: `/api/webhook`
- **HTTP Method**: `POST`
- **Content Type**: `application/json`
- **Authentication (Optional)**:
  - HMAC with `X-Signature-256` (GitHub)
  - Header-based shared secret (`x-api-key`)
- **Expected Response**:
  - `200 OK` or `202 Accepted`
  - `400 Bad Request` for invalid payloads
  - `401/403` for failed auth

---

## Deployment Prerequisites

- Publicly available HTTPS endpoint (Azure App Service, Function App, or API Gateway)
- Valid TLS/SSL certificate
- Endpoint registered in Teams bot manifest
- Azure Application Insights enabled
- AppSettings variables:
  - `WEBHOOK_SECRET`
  - `ALLOWED_SOURCES` (optional IP filter)
  - `ENABLE_SIGNATURE_VALIDATION` = true/false

---

## Webhook Setup Instructions

### Azure DevOps

1. Go to `Project Settings > Service Hooks`
2. Choose **Web Hooks** as the consumer
3. Select an event (e.g., Release Completed)
4. Set payload URL:
   ```
   https://<your-domain>/api/webhook
   ```
5. Set filters (optional)
6. Save and send test

### GitHub

1. Go to repository → Settings → Webhooks → Add webhook
2. Payload URL:
   ```
   https://<your-domain>/api/webhook
   ```
3. Set content type to `application/json`
4. Set secret (same as `WEBHOOK_SECRET`)
5. Events: `release`, `workflow_run`, `deployment_status`
6. Save and test using “Redeliver”

---

## Payload Schema

All incoming payloads must conform to this core contract:

```json
{
  "source": "azure-devops" | "github" | "jenkins" | "custom",
  "eventType": "releaseCreated" | "releaseCompleted" | "workflowRun",
  "project": {
    "name": "AppService",
    "id": "a1b2c3d4"
  },
  "release": {
    "name": "Release-2025.05.01",
    "status": "succeeded",
    "environment": "Production",
    "triggeredBy": "CI/CD Pipeline"
  },
  "repository": {
    "provider": "GitHub",
    "name": "my-repo",
    "commitHash": "abc123"
  },
  "timestamp": "2025-05-01T16:21:00Z"
}
```

Required fields:
- `source`, `eventType`, `project.name`, `release.name`, `release.status`, `timestamp`

---

## Authentication & Validation

### Signature Validation (GitHub)
If enabled:
1. HMAC SHA256 using `WEBHOOK_SECRET`
2. Compare against `X-Hub-Signature-256` header
3. Reject if mismatch or missing

### Timestamp Drift Protection
Reject payloads older than `5 minutes` from `timestamp`

### Optional IP Validation
Whitelist GitHub / Azure DevOps IP blocks via middleware

---

## Error Handling & Common Failures

| Code | Symptom                                  | Resolution |
|------|------------------------------------------|------------|
| 400  | Invalid/missing JSON fields              | Validate schema against contract |
| 401  | Missing or invalid webhook secret        | Check shared secret or GitHub signature |
| 403  | Unauthorized IP or org                   | Validate source and token scope |
| 422  | Unknown eventType                        | Extend parser to handle new type |
| 500  | Unexpected exception in handler          | Check telemetry and retry with test payload |

Bot will return descriptive error messages with `errorCode` and `traceId`.

---

## Testing & Simulation

### Curl Test

```bash
curl -X POST https://your-domain/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret" \
  -d @sample-payload.json
```

### GitHub Redeliver

- Go to Webhook → “Recent Deliveries”
- Click a failed event → “Redeliver”

### Azure DevOps

- Manually trigger pipeline
- Confirm webhook event in service hook logs

---

## Monitoring & Logging

- **Application Insights**:
  - `customEvent: webhook_received`
  - `customMetric: webhook_processing_duration_ms`
  - Exception stack traces, correlation IDs
- **Kusto Query**:

```kusto
requests
| where url endswith "/api/webhook"
| order by timestamp desc
```

- **Teams Delivery Status**: Logged per message
- **Enable traces** with env: `APPINSIGHTS_INSTRUMENTATIONKEY`

---

## Security Considerations

- Validate every payload against schema
- Never log secrets or tokens
- Implement retry limits and idempotency
- Rate limit using Azure Front Door or API Gateway
- Use encrypted secret storage (Key Vault)

---

## Scalability & Reliability

- Use `queue-based ingestion` for processing payloads
- Return `202 Accepted` immediately; offload processing to worker
- Scale app service or function app with autoscaling rules
- Track dropped events using dead-letter telemetry

---

## Change Management & Versioning

- Version parser by `eventType` and `source`
- Include `schemaVersion` in future payloads
- Backward compatibility must be preserved for API clients
- All schema changes logged and version-controlled in Git

---

## Appendix: Example Payloads

### Azure DevOps – Release Completed

```json
{
  "source": "azure-devops",
  "eventType": "releaseCompleted",
  "project": {
    "name": "CoreAPI"
  },
  "release": {
    "name": "Release-Prod-2025.05.02",
    "status": "succeeded",
    "environment": "Production",
    "triggeredBy": "Manual"
  },
  "timestamp": "2025-05-02T17:04:00Z"
}
```

### GitHub – Release Published

```json
{
  "source": "github",
  "eventType": "release",
  "repository": {
    "provider": "GitHub",
    "name": "bot-service",
    "commitHash": "abcdef123456"
  },
  "release": {
    "name": "v2.4.1",
    "status": "published",
    "environment": "prod",
    "triggeredBy": "release-automation"
  },
  "timestamp": "2025-05-02T16:45:00Z"
}
```
