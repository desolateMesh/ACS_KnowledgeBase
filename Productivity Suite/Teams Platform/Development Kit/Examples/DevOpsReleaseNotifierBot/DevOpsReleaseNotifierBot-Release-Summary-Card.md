# DevOps Release Notifier Bot: Release Summary Card Guide

## Overview

This document provides the technical specification and implementation guidance for the **Release Summary Card** feature used by the DevOps Release Notifier Bot. This Adaptive Card is designed to present key release information in Microsoft Teams, allowing DevOps stakeholders to quickly assess, act on, and audit release activities.

---

## Purpose

The Release Summary Card serves as a **read-only, audit-friendly snapshot** of a deployment event. Unlike the actionable approval cards, this summary card is typically triggered post-deployment or upon completion of a CI/CD workflow run.

Use cases:
- Notify engineering teams of completed deployments
- Provide audit trail evidence of what was deployed, where, and when
- Link back to DevOps or GitHub build logs

---

## Card Rendering Context

- **Recipient**: Microsoft Teams channel, group chat, or 1:1 message
- **Trigger**: Webhook from Azure DevOps or GitHub Action (post-deploy)
- **Card Style**: Adaptive Card (v1.4+)
- **Interactivity**: View-only, contains outbound links for logs or artifacts

---

## Example Adaptive Card Payload

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "✅ *Release Deployment Summary*",
      "wrap": true,
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Environment:", "value": "Production" },
        { "title": "Release ID:", "value": "82745" },
        { "title": "Version:", "value": "v2024.05.01" },
        { "title": "Initiated By:", "value": "jrochau" },
        { "title": "Triggered From:", "value": "GitHub Actions" },
        { "title": "Status:", "value": "Success" },
        { "title": "Timestamp:", "value": "2024-05-01T13:55Z" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Deployment completed successfully. See logs below:",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Build Logs",
      "url": "https://github.com/org/repo/actions/runs/99291"
    },
    {
      "type": "Action.OpenUrl",
      "title": "View Release Artifacts",
      "url": "https://dev.azure.com/org/project/_release?releaseId=82745"
    }
  ]
}
```

---

## Dynamic Fields & Logic

| Field             | Source Field Mapping                          |
|-------------------|------------------------------------------------|
| Environment       | ADO `environment.name` or GitHub `env`         |
| Release ID        | ADO `release.id` or GitHub `workflow_run.id`   |
| Version           | Git tag, build number, or ADO `release.name`   |
| Initiated By      | ADO `requestedBy.displayName` or GitHub `sender.login` |
| Triggered From    | Static string based on webhook source          |
| Status            | `Success`, `Failed`, `Cancelled`, etc.         |
| Timestamp         | `DateTime.UtcNow` or event payload timestamp   |

---

## Integration Considerations

- **Use HTTPS URLs** only for links to logs and artifacts
- Ensure Adaptive Card version `1.4+` is used to support layout
- Add card deduplication logic (optional) to avoid resends in pipelines with retries
- Store a copy of the rendered card and timestamp in Cosmos DB for compliance

---

## Auditing & Logging

- Log every summary card sent with the following metadata:
  - Card payload (JSON)
  - Release ID
  - Team/channel or user ID
  - Timestamp sent
  - Webhook source
- Example storage schema in Cosmos DB or Log Analytics:

```json
{
  "type": "summary_card",
  "releaseId": "82745",
  "status": "Success",
  "timestamp": "2024-05-01T13:55Z",
  "initiator": "jrochau",
  "source": "GitHub",
  "sentTo": "TeamsChannelID123",
  "cardJson": { /* full card payload */ }
}
```

---

## Customization Options

- Add deployment region or datacenter tag if applicable
- Include service impact description for critical releases
- Support dark/light theme logo overlays based on Teams theme context
- Use different icon sets for different environments (e.g. blue for staging, green for prod)

---

## References

- [Adaptive Cards Schema Explorer](https://adaptivecards.io/explorer/)
- [Microsoft Teams Bot Framework](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [GitHub Workflow Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)
- [Azure DevOps Service Hooks](https://learn.microsoft.com/en-us/azure/devops/service-hooks/overview)
