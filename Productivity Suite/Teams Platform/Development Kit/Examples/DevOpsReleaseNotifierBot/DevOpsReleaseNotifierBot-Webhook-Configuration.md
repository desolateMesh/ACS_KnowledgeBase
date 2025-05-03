# DevOps Release Notifier Bot – Webhook Configuration Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Supported CI/CD Integrations](#supported-cicd-integrations)
3. [Webhook Endpoint Specifications](#webhook-endpoint-specifications)
4. [Deployment Prerequisites](#deployment-prerequisites)
5. [Webhook Configuration Instructions](#webhook-configuration-instructions)
6. [Payload Schema Definition](#payload-schema-definition)
7. [Authentication & Validation](#authentication--validation)
8. [Error Handling & Troubleshooting](#error-handling--troubleshooting)
9. [Testing and Simulation](#testing-and-simulation)
10. [Monitoring & Telemetry](#monitoring--telemetry)
11. [Security Best Practices](#security-best-practices)
12. [Scalability and Fault Tolerance](#scalability-and-fault-tolerance)
13. [Versioning and Backward Compatibility](#versioning-and-backward-compatibility)
14. [Appendix: Sample Payloads](#appendix-sample-payloads)

---

## Introduction

The DevOps Release Notifier Bot enables delivery of release event notifications from CI/CD systems (Azure DevOps, GitHub Actions, Jenkins, etc.) into Microsoft Teams. This guide provides comprehensive instructions for configuring the bot's webhook endpoint to receive, authenticate, and process these notifications securely and reliably.

---

## Supported CI/CD Integrations

| CI/CD Provider | Supported Events                                     | Notes                       |
| -------------- | ---------------------------------------------------- | --------------------------- |
| Azure DevOps   | Release Created, Release Completed, Approval Pending | Via Service Hooks           |
| GitHub         | `release`, `workflow_run`, `deployment_status`       | Requires PAT or App Secret  |
| GitHub Actions | Workflow Completion Events                           | Relay via GitHub Webhooks   |
| Jenkins        | Custom Webhook Trigger                               | JSON POST via script        |
| Custom Systems | JSON POST to endpoint                                | Must follow schema contract |

---

## Webhook Endpoint Specifications

* **HTTP Method**: POST
* **Endpoint**: `/api/webhook`
* **Content-Type**: `application/json`
* **Authentication Options**:

  * HMAC SHA256 signature (`X-Hub-Signature-256` – GitHub)
  * Header-based secret (`x-api-key`)
* **Response Codes**:

  * `200 OK` / `202 Accepted` – Accepted or queued
  * `400 Bad Request` – Schema violation or malformed payload
  * `401 Unauthorized` / `403 Forbidden` – Auth failure

---

## Deployment Prerequisites

* Deployed bot backend with HTTPS (Function App, App Service, etc.)
* TLS/SSL certificate (required for GitHub and Teams)
* Registered endpoint in Microsoft Teams bot manifest
* AppSettings keys:

  * `WEBHOOK_SECRET`
  * `ENABLE_SIGNATURE_VALIDATION`
  * `ALLOWED_SOURCES` (IP allow list – optional)

---

## Webhook Configuration Instructions

### Azure DevOps Service Hook

1. Navigate to `Project Settings > Service Hooks`
2. Select **Web Hooks** and choose desired event (e.g., `Release Completed`)
3. Set the **Payload URL**:

   ```
   https://<YOUR_DOMAIN>/api/webhook
   ```
4. (Optional) Add filters by branch or environment
5. Save and test the configuration

### GitHub Webhook

1. Go to **Settings > Webhooks** in your repository
2. Add a new webhook:

   * **Payload URL**:

     ```
     https://<YOUR_DOMAIN>/api/webhook
     ```
   * **Content Type**: `application/json`
   * **Secret**: Match `WEBHOOK_SECRET`
3. Select Events: `release`, `workflow_run`, `deployment_status`
4. Save and test with **Redeliver** option

---

## Payload Schema Definition

Webhook payloads must follow this JSON structure:

```json
{
  "source": "azure-devops" | "github" | "jenkins" | "custom",
  "eventType": "releaseCompleted" | "releaseCreated" | "workflowRun",
  "project": {
    "name": "MyProject",
    "id": "abc123"
  },
  "release": {
    "name": "Release-2025.05.01",
    "status": "succeeded",
    "environment": "Production",
    "triggeredBy": "CI/CD Pipeline"
  },
  "repository": {
    "provider": "GitHub",
    "name": "repo-name",
    "commitHash": "abcdef123456"
  },
  "timestamp": "2025-05-01T16:21:00Z"
}
```

> Required fields: `source`, `eventType`, `release.name`, `release.status`, `timestamp`

---

## Authentication & Validation

### GitHub Signature Validation

* Enabled by `ENABLE_SIGNATURE_VALIDATION=true`
* Steps:

  1. Compute HMAC SHA256 using `WEBHOOK_SECRET`
  2. Compare with `X-Hub-Signature-256` header
  3. Reject request if mismatched

### Timestamp Validation

* Reject any payloads older than **5 minutes** (UTC drift protection)

### IP Filtering (Optional)

* Enforce source IP restrictions using IP allowlist from `ALLOWED_SOURCES`

---

## Error Handling & Troubleshooting

| Code | Condition                     | Action                                                       |
| ---- | ----------------------------- | ------------------------------------------------------------ |
| 400  | Schema violation              | Validate JSON fields, refer to payload contract              |
| 401  | Missing/invalid signature     | Validate shared secret or GitHub signature                   |
| 403  | Unauthorized IP or access     | Check IP allowlist or token scope                            |
| 422  | Unknown `eventType` value     | Extend parser to support additional event types              |
| 500  | Internal processing exception | Review logs in Application Insights; retry with test payload |

> All errors include `errorCode` and `traceId` for diagnostics.

---

## Testing and Simulation

### Curl Test Example

```bash
curl -X POST https://<YOUR_DOMAIN>/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: <WEBHOOK_SECRET>" \
  -d @sample-payload.json
```

### GitHub Delivery Simulation

* Navigate to repository webhook settings
* Click on recent event → **Redeliver** to retry

### Azure DevOps Trigger

* Trigger a pipeline manually
* Confirm webhook logs in Service Hooks dashboard

---

## Monitoring & Telemetry

* **Azure Application Insights**

  * `customEvent: webhook_received`
  * `customMetric: webhook_duration_ms`
  * Traceable exceptions and request correlation

#### Kusto Query Example

```kusto
requests
| where url endswith "/api/webhook"
| order by timestamp desc
```

---

## Security Best Practices

* Enforce HTTPS on all endpoints
* Store `WEBHOOK_SECRET` securely in Azure Key Vault
* Do not log full payloads with PII or secrets
* Limit retries to prevent replay abuse
* Implement idempotency for duplicate events
* Enable rate limiting (via Azure API Management / Front Door)

---

## Scalability and Fault Tolerance

* Use queue-based ingestion (Azure Queue Storage / Service Bus)
* Return `202 Accepted` immediately and defer heavy processing
* Enable autoscaling on App Service or Function Plan
* Track dropped messages via dead-letter queue or failed telemetry

---

## Versioning and Backward Compatibility

* Include `schemaVersion` in payloads for versioned parsing
* Maintain compatibility for all known versions
* Version-based routing handled by webhook dispatcher logic
* Track and version payload schema in Git (in `schemas/` folder)

---

## Appendix: Sample Payloads

### Sample: Azure DevOps Release Completed

```json
{
  "source": "azure-devops",
  "eventType": "releaseCompleted",
  "project": { "name": "AppService" },
  "release": {
    "name": "Release-Prod-2025.05.01",
    "status": "succeeded",
    "environment": "Production",
    "triggeredBy": "CI Pipeline"
  },
  "timestamp": "2025-05-01T18:00:00Z"
}
```

### Sample: GitHub Release

```json
{
  "source": "github",
  "eventType": "release",
  "repository": {
    "provider": "GitHub",
    "name": "notifier-service",
    "commitHash": "def456abc789"
  },
  "release": {
    "name": "v3.2.0",
    "status": "published",
    "environment": "prod",
    "triggeredBy": "release-pipeline"
  },
  "timestamp": "2025-05-02T10:35:00Z"
}
