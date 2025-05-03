# DevOps Release Notifier Bot: Enterprise Deployment Guide

## Overview

This guide provides detailed, enterprise-grade deployment instructions for the **DevOps Release Notifier Bot** — a Microsoft Teams-integrated bot designed to send actionable approval and rejection cards for releases triggered by Azure DevOps or GitHub Actions. It includes secure infrastructure provisioning, automation patterns, integration validations, and compliance-level implementation standards.

---

## 1. Required Components

### Azure Infrastructure

| Resource            | Use Case                                  |
|---------------------|-------------------------------------------|
| Azure App Service   | Bot API hosting                            |
| Azure Function App  | Webhook receiver for DevOps/GitHub         |
| Azure Cosmos DB     | Card state, deduplication, and audit logs  |
| Azure Key Vault     | Store secrets (Bot ID, Secrets, Tokens)    |
| Azure Storage       | Function bindings and deployment artifacts |
| Azure Application Insights | Bot/Function telemetry + metrics     |

### Identity & Security

- Azure AD App Registration for bot identity and Teams integration
- Admin-consented API scopes for Graph and Teams permissions
- RBAC: Assign `DevOpsApprover` group or similar in Azure AD

---

## 2. Bot Application Setup

### Register Azure AD App

1. Go to **Azure Active Directory → App registrations → New registration**
2. App Name: `DevOpsReleaseNotifierBot`
3. Redirect URI: `https://<BOT_APP_URL>/auth/callback`
4. Record:
   - Application (Client) ID
   - Directory (Tenant) ID

### Create Client Secret

- Under **Certificates & Secrets**, create a new secret and store it in Key Vault

### Configure API Permissions

| API             | Permission           | Admin Consent |
|----------------|----------------------|----------------|
| Microsoft Graph| `User.Read`, `Chat.ReadWrite`, `TeamsActivity.Send` | ✅ |
| Azure DevOps   | `Release.ReadWrite.All` (via OAuth2 or PAT)        | ✅ |

---

## 3. Enable Microsoft Teams Integration

1. Go to **Azure Bot Channels Registration**
2. Configure messaging endpoint: `https://<BOT_APP_URL>/api/messages`
3. Enable the **Teams** channel and test handshake
4. Validate bot is registered within your Teams tenant

---

## 4. Azure Function: Webhook Listener

### Setup Secrets in `local.settings.json`

```json
{
  "AzureWebJobsStorage": "<connection-string>",
  "GitHubSecret": "<webhook-secret>",
  "AzureDevOpsSharedSecret": "<ado-secret>",
  "BotAppId": "<bot-app-id>",
  "BotAppSecret": "<bot-client-secret>",
  "KeyVaultUri": "https://<vault>.vault.azure.net/",
  "CosmosDbConnection": "<cosmos-conn-string>"
}
```

### Create Function App

```bash
az functionapp create --resource-group rg-devopsbot --name devops-function --storage-account mystorage --consumption-plan-location westus --runtime dotnet --functions-version 4
az functionapp deployment source config-zip -g rg-devopsbot -n devops-function --src ./function.zip
```

---

## 5. Bot Backend Deployment

1. Build bot app (`dotnet publish -c Release`)
2. Deploy to App Service:
```bash
az webapp create --resource-group rg-devopsbot --plan bot-plan --name devops-release-bot --runtime "DOTNET|6.0"
az webapp deployment source config-zip -g rg-devopsbot -n devops-release-bot --src ./bot.zip
```

3. Link Key Vault to app configuration or inject via Bicep

---

## 6. Webhook Integration

### Azure DevOps

- Service Hook → Webhook
- Event: **Release Deployment Approval Pending**
- URL: `https://<function-app>.azurewebsites.net/api/releasehook`
- Authentication: Shared Secret or Azure DevOps OAuth

### GitHub

- Repo → Settings → Webhooks → Add Webhook
- Event: `workflow_run`
- URL: Same Azure Function endpoint
- Secret: Matches `GitHubSecret`

---

## 7. Security Implementation

| Area              | Enforcement Strategy                      |
|-------------------|--------------------------------------------|
| Request Signature | GitHub HMAC + Azure DevOps token validation |
| RBAC              | Enforced via bot logic + AD group claims    |
| Rate Limiting     | Azure API Management (optional)             |
| Idempotency       | Store webhook ID + TTL in Cosmos DB         |
| Secret Management | Azure Key Vault + Managed Identity access   |

Example RBAC snippet:

```csharp
if (!user.Roles.Contains("DevOpsApprover"))
{
    await turnContext.SendActivityAsync("🚫 Unauthorized action.");
    return;
}
```

---

## 8. Monitoring & Telemetry

### Azure Application Insights

- Dependency tracking
- Adaptive Card send/receive flow
- Alerting thresholds for bot and function downtime

### Azure Monitor Logs

- Function request logs
- Approval/rejection decision telemetry

### Sample Alert Rules

| Metric                    | Condition                | Action         |
|---------------------------|---------------------------|----------------|
| Failed HTTP (4xx/5xx)     | > 10 in 5 minutes         | Alert + email  |
| Message processing time   | > 2 seconds avg. latency  | Alert + log    |
| Adaptive card delivery    | Drops to 0 over 10 min    | Critical alert |

---

## 9. Post-Deployment Validation

| Validation Step                              | Status |
|----------------------------------------------|--------|
| Bot appears in Teams and responds to `@Bot`  | ✅/❌   |
| Webhook from GitHub triggers card            | ✅/❌   |
| Webhook from Azure DevOps triggers card      | ✅/❌   |
| Approval buttons execute and log response    | ✅/❌   |
| Cosmos DB captures audit log entry           | ✅/❌   |
| Invalid payloads are logged and rejected     | ✅/❌   |
| RBAC enforcement rejects unauthorized users  | ✅/❌   |

---

## 10. Troubleshooting Matrix

| Symptom                             | Cause                                | Resolution                                  |
|-------------------------------------|--------------------------------------|---------------------------------------------|
| Teams bot not responding            | Messaging endpoint misconfigured     | Validate Bot Channels + AAD registration    |
| Azure Function returning 403        | Invalid or missing secret            | Check GitHub or DevOps signature headers    |
| Approval not processed              | Missing webhook fields               | Log payload + verify schema                 |
| Card doesn’t show in Teams          | Invalid Adaptive Card schema         | Test in Adaptive Card Designer              |
| Double card triggered               | Deduplication logic missing          | Store and expire webhook event IDs          |

---

## 11. Automation

### Infrastructure-as-Code

- Use Bicep/Terraform to deploy:
  - Function App + Cosmos DB + Key Vault
  - App Service Plan + Bot Channel Registration

### CI/CD for Bot + Function

- GitHub Actions or Azure Pipelines:
  - Auto-publish ZIPs on merge to `main`
  - Key Vault secret binding via environment variables

---

## 12. References

- [Bot Framework SDK Setup](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-sdk-introduction)
- [Teams Messaging Endpoint Config](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [Azure Function Webhooks](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [App Insights for Bots](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-telemetry)
