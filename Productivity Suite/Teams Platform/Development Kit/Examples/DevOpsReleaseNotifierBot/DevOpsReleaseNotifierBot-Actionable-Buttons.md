# DevOps Release Notifier Bot: Actionable Buttons Integration

## Overview

This document provides a comprehensive implementation and decision-support guide for integrating **Actionable Buttons** into the DevOps Release Notifier Bot in Microsoft Teams. The bot enhances the CI/CD experience by allowing DevOps stakeholders to respond to deployment events—such as approvals and rejections—directly within Teams via Adaptive Cards.

---

## Architectural Summary

- **Trigger**: Azure DevOps Release Pipeline Webhook
- **Delivery**: Microsoft Bot Framework with Teams Channel
- **Payload Type**: Adaptive Card with `Action.Submit` buttons
- **Processing**: Bot backend evaluates input and calls Azure DevOps REST API
- **Audit Trail**: All actions logged to a secure store or telemetry platform

---

## Permissions and Security

- **Azure DevOps API Scope**:
  - `Release.ReadWrite.All` (for approving/rejecting releases)
- **Bot Identity**:
  - Registered Azure AD App with Teams channel enabled
- **Authentication**:
  - OAuth2 with Azure AD using client credentials or delegated token
- **User Validation**:
  - Token validated for presence of proper AAD groups or DevOps permissions
- **Message Verification**:
  - `conversationReference` validated before sending
  - Rate-limiting enforced for spam protection

---

## Adaptive Card Example

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "🚀 *Release Notification*",
      "wrap": true,
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Release **v2024.05.01** is ready for deployment to **Production**.",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {"title": "Environment:", "value": "Production"},
        {"title": "Requested By:", "value": "jrochau"},
        {"title": "Release ID:", "value": "82745"},
        {"title": "Build Artifact:", "value": "webapi-azurecontainer.zip"}
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Approve",
      "data": {
        "action": "approve_release",
        "releaseId": "82745",
        "environment": "Production"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Reject",
      "style": "destructive",
      "data": {
        "action": "reject_release",
        "releaseId": "82745",
        "environment": "Production"
      }
    }
  ]
}
```

---

## Backend Logic: Bot Handler

```csharp
public async Task OnTeamsMessagingExtensionSubmitActionAsync(
    ITurnContext<IInvokeActivity> turnContext,
    MessagingExtensionAction action,
    CancellationToken cancellationToken)
{
    var data = JObject.FromObject(action.Data);
    var releaseId = data["releaseId"]?.ToString();
    var environment = data["environment"]?.ToString();
    var user = turnContext.Activity.From?.AadObjectId ?? "unknown-user";
    var actionType = data["action"]?.ToString();

    await _auditService.LogAsync(user, actionType, releaseId, environment);

    if (actionType == "approve_release")
    {
        await _devOpsService.ApproveReleaseAsync(releaseId, user);
        await turnContext.SendActivityAsync($"✅ Release `{releaseId}` approved for `{environment}`.");
    }
    else if (actionType == "reject_release")
    {
        await _devOpsService.RejectReleaseAsync(releaseId, user);
        await turnContext.SendActivityAsync($"❌ Release `{releaseId}` rejected from `{environment}`.");
    }
}
```

---

## Audit Logging Requirements

| Event Type       | Fields Logged                                   |
|------------------|--------------------------------------------------|
| Button Clicked   | `User ID`, `Release ID`, `Environment`, `Action` |
| DevOps Action    | `Response`, `Status`, `Error (if any)`          |
| Message Delivery | `Message ID`, `Timestamp`, `Conversation ID`    |

Logs should be retained for 1 year and forwarded to Azure Log Analytics or Sentinel.

---

## Error Handling

| Condition                        | Bot Response                              |
|----------------------------------|-------------------------------------------|
| Invalid Token                    | "🔐 You are not authorized to perform this action." |
| Release API Failure              | "⚠️ Failed to process release: [Error Message]" |
| User Not in DevOps Group         | "🚫 You lack the permissions to approve this release." |
| Duplicate Button Click (Timeout) | "⏱️ This action has already been processed." |

---

## Compliance Considerations

- **RBAC Validation**: Validate against AAD roles or DevOps project scopes.
- **Message Integrity**: Use encrypted payloads for sensitive contexts.
- **Token Expiry**: Use token refresh and short-lived credentials.

---

## Testing Matrix

| Scenario                          | Expected Outcome                         |
|-----------------------------------|------------------------------------------|
| Valid Approval                    | API call succeeds, Teams updates card    |
| Valid Rejection                   | API call halts release, updates card     |
| Unauthorized User Interaction     | Denied with audit log                    |
| Teams Bot Down                    | Retry logic, error logged                |
| Duplicate Card Actions            | One action processed, others ignored     |

---

## Related Diagrams

Refer to `DevOpsReleaseNotifierBot-DecisionFlow.mmd` for a full logic path overview.

---

## References

- [Azure DevOps REST API: Release Approvals](https://learn.microsoft.com/en-us/rest/api/azure/devops/release/approvals)
- [Microsoft Bot Framework - Adaptive Cards](https://adaptivecards.io)
- [Teams Bot - Proactive Messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
