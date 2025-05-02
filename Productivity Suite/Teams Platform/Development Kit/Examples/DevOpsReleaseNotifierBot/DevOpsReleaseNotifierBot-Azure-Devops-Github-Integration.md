# DevOps Release Notifier Bot: Azure DevOps & GitHub Integration Guide

## Overview

This document outlines a complete integration strategy for enabling the DevOps Release Notifier Bot to receive and process release events from **both Azure DevOps and GitHub Actions**, sending actionable deployment notifications to Microsoft Teams.

It provides detailed instructions and logic flows to support AI-based automation and implementation.

---

## Architecture Overview

- **CI/CD Sources**: Azure DevOps Pipelines and GitHub Actions
- **Message Dispatcher**: Azure Function (HTTP Trigger)
- **Notification Bot**: Microsoft Bot Framework with Teams channel
- **Unified Handler**: Common webhook payload normalizer
- **Output**: Adaptive Card to Teams with Approve/Reject buttons

---

## Integration Objectives

- Normalize webhook events across platforms
- Trigger the same card template regardless of source
- Provide unified audit logging and RBAC enforcement
- Route deployment data to the Teams bot with enriched context

---

## Webhook Configuration

### Azure DevOps Service Hook

- **Event**: Release deployment approval pending
- **Target**: Azure Function HTTP endpoint
- **Authentication**: OAuth or shared secret
- **Payload Example**:

```json
{
  "eventType": "ms.vss-release.deployment-approval-pending-event",
  "resource": {
    "release": {
      "id": 82745,
      "name": "v2024.05.01"
    },
    "environment": {
      "name": "Production"
    },
    "requestedBy": {
      "displayName": "jrochau"
    }
  }
}
```

### GitHub Actions Webhook

- **Event**: `workflow_run`
- **Target**: Same Azure Function HTTP endpoint
- **Authentication**: GitHub secret token
- **Payload Example**:

```json
{
  "action": "completed",
  "workflow_run": {
    "id": 99291,
    "name": "Release Deployment",
    "conclusion": "success",
    "head_branch": "main",
    "head_sha": "abc123def456",
    "created_at": "2024-05-01T12:00:00Z"
  },
  "repository": {
    "full_name": "org/app-service",
    "html_url": "https://github.com/org/app-service"
  },
  "sender": {
    "login": "jrochau"
  }
}
```

---

## Azure Function: Event Normalizer

```csharp
public static async Task<IActionResult> Run(HttpRequest req, ILogger log)
{
    string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
    dynamic data = JsonConvert.DeserializeObject(requestBody);

    string source = DetectSource(req, data);
    NormalizedReleasePayload normalized = NormalizePayload(source, data);

    await TeamsBotDispatcher.SendReleaseCardAsync(normalized);
    return new OkObjectResult("Notification dispatched.");
}
```

### Payload Normalization Structure

```csharp
public class NormalizedReleasePayload
{
    public string ReleaseId { get; set; }
    public string Environment { get; set; }
    public string ReleaseName { get; set; }
    public string TriggeredBy { get; set; }
    public string SourceSystem { get; set; }
}
```

---

## Teams Bot Message Dispatcher

Receives `NormalizedReleasePayload` and formats the Adaptive Card accordingly.

### Adaptive Card Actions

- **Approve**: `Action.Submit` with `action=approve_release`
- **Reject**: `Action.Submit` with `action=reject_release`

Each card includes a badge (`Azure DevOps` or `GitHub`) and a `View Logs` button linking to the source platform.

---

## Security Considerations

- **Request Signature Validation**:
  - Azure DevOps: Shared secret or OAuth token validation
  - GitHub: X-Hub-Signature and token verification

- **Rate Limiting**: Azure Function protected via Azure API Management or built-in throttling

- **Authentication**:
  - Caller identity logged per webhook source
  - Teams bot validates user role before responding

- **Audit Logging**:
  - Log source, repository, release ID, action, and actor

---

## Testing and Validation

| Scenario                            | Expected Result                                       |
|-------------------------------------|--------------------------------------------------------|
| Azure DevOps release approval event | Card shows up in Teams with correct metadata          |
| GitHub Action release completed     | Card shows in Teams, action buttons respond           |
| Invalid webhook format              | Function returns 400 Bad Request                      |
| Unauthorized GitHub signature       | Request rejected, log entry created                   |
| Repeated event                      | Card deduplication logic prevents reprocessing        |

---

## Diagram

See `DevOpsReleaseNotifierBot-DecisionFlow.mmd` for full flow from GitHub/Azure DevOps to Teams.

---

## References

- [Azure DevOps Webhooks](https://learn.microsoft.com/en-us/azure/devops/service-hooks/overview)
- [GitHub Actions Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks)
- [Azure Functions for Webhook Integration](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook)
- [Teams Bots + Adaptive Cards](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-actions)
