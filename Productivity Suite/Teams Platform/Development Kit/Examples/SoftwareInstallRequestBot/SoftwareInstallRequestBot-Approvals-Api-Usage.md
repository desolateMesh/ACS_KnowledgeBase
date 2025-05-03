# Software Install Request Bot: Approvals API Usage

## Overview

The Approvals API is a critical component of the Software Install Request Bot that allows programmable interaction with the approval workflows. This document provides comprehensive information on how to interact with the Approvals API, including authentication, endpoints, request/response formats, and integration scenarios.

## API Architecture

The Approvals API is built on a RESTful architecture that provides programmatic access to all approval-related operations. It is designed to be:

- **Secure**: Using modern authentication and authorization mechanisms
- **Scalable**: Capable of handling high-volume approval requests
- **Extensible**: Supporting custom approval workflows and integration points
- **Compliant**: Maintaining comprehensive audit trails of all operations

### API Components

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                 │     │                  │     │                  │
│  API Gateway    │────►│  Authentication  │────►│  Rate Limiting   │
│                 │     │  & Authorization │     │  & Throttling    │
└─────────────────┘     └──────────────────┘     └──────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                 │     │                  │     │                  │
│  API Controllers│◄───►│  Service Layer   │◄───►│  Data Access     │
│                 │     │                  │     │  Layer           │
└─────────────────┘     └──────────────────┘     └──────────────────┘
         │                      │                        │
         │                      ▼                        │
         │             ┌──────────────────┐              │
         └────────────►│  Event System    │◄─────────────┘
                       │                  │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │                  │
                       │  Notification    │
                       │  Service         │
                       └──────────────────┘
```

## Authentication and Authorization

### Authentication Methods

The Approvals API supports multiple authentication methods:

1. **Azure AD OAuth 2.0**: Primary authentication method for organizational users and applications
2. **API Keys**: For system-to-system integrations
3. **Microsoft Teams SSO**: For seamless authentication from Teams apps
4. **Service Principal Authentication**: For background processes and automation

### Authorization Model

Authorization is based on a role-based access control (RBAC) model with the following roles:

| Role | Description | Permissions |
|------|-------------|------------|
| Approver | Users who can approve/reject requests | Read requests, submit decisions |
| Requester | Users who submit software requests | Create and read own requests |
| Admin | Administrative users | Full access to all API operations |
| IT Fulfillment | IT staff responsible for fulfillment | Read approved requests, update status |
| Auditor | Compliance/security auditors | Read-only access to all requests and audit logs |

### Authentication Examples

#### OAuth 2.0 Authentication Flow

```csharp
// Example OAuth authentication process
public async Task<string> GetAccessToken()
{
    var confidentialClient = ConfidentialClientApplicationBuilder
        .Create(_configuration["AzureAd:ClientId"])
        .WithClientSecret(_configuration["AzureAd:ClientSecret"])
        .WithAuthority(new Uri(_configuration["AzureAd:Authority"]))
        .Build();
    
    var scopes = new[] { _configuration["AzureAd:ApiScope"] };
    
    try
    {
        var result = await confidentialClient
            .AcquireTokenForClient(scopes)
            .ExecuteAsync();
        
        return result.AccessToken;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error acquiring access token");
        throw;
    }
}
```

#### API Key Authentication

```csharp
// Example API key validation in middleware
public async Task InvokeAsync(HttpContext context)
{
    // Try to get the API Key from the request headers
    if (!context.Request.Headers.TryGetValue("X-API-Key", out var apiKeyHeaderValues))
    {
        context.Response.StatusCode = 401; // Unauthorized
        await context.Response.WriteAsync("API Key is missing");
        return;
    }
    
    var apiKey = apiKeyHeaderValues.FirstOrDefault();
    
    // Validate the API Key
    if (!await _apiKeyService.IsValidApiKeyAsync(apiKey))
    {
        context.Response.StatusCode = 401; // Unauthorized
        await context.Response.WriteAsync("Invalid API Key");
        return;
    }
    
    // API Key is valid, assign claims to the user
    var claims = await _apiKeyService.GetClaimsForApiKeyAsync(apiKey);
    var identity = new ClaimsIdentity(claims, "ApiKey");
    context.User = new ClaimsPrincipal(identity);
    
    await _next(context);
}
```

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/approvals` | GET | List approval requests |
| `/api/approvals/{id}` | GET | Get approval request details |
| `/api/approvals` | POST | Create new approval request |
| `/api/approvals/{id}/decision` | POST | Submit approval decision |
| `/api/approvals/{id}/comments` | POST | Add comment to approval |
| `/api/approvals/{id}/delegate` | POST | Delegate approval to another user |
| `/api/approvals/pending` | GET | Get pending approvals for current user |
| `/api/approvals/search` | GET | Search approvals by criteria |
| `/api/approvals/{id}/history` | GET | Get approval history/audit trail |
| `/api/approvals/policies` | GET | Get approval policies |

### Administrative Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/approvals/config` | GET | Get approval system configuration |
| `/api/admin/approvals/config` | PUT | Update approval system configuration |
| `/api/admin/approvals/policies` | POST | Create approval policy |
| `/api/admin/approvals/policies/{id}` | PUT | Update approval policy |
| `/api/admin/approvals/policies/{id}` | DELETE | Delete approval policy |
| `/api/admin/approvals/stats` | GET | Get approval statistics |

### Webhook Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/approvals` | POST | Receive external approval notifications |
| `/api/webhooks/approvals/register` | POST | Register a new webhook |
| `/api/webhooks/approvals/test` | POST | Test webhook delivery |

## Request and Response Formats

### Common Data Models

#### Approval Request

```json
{
  "requestId": "req_12345",
  "title": "Adobe Photoshop Installation",
  "description": "Need Adobe Photoshop for graphic design work",
  "requestType": "software_installation",
  "createdBy": {
    "id": "user123",
    "displayName": "John Smith",
    "email": "john.smith@company.com",
    "department": "Marketing"
  },
  "createdAt": "2025-04-20T10:30:45Z",
  "status": "pending",
  "priority": "medium",
  "dueBy": "2025-04-30T23:59:59Z",
  "metadata": {
    "softwareName": "Adobe Photoshop",
    "softwareVersion": "2025",
    "estimatedCost": 239.99,
    "costCenter": "MKTG-001",
    "licenseType": "subscription"
  },
  "attachments": [
    {
      "id": "att_1",
      "name": "approval_form.pdf",
      "contentType": "application/pdf",
      "size": 125000,
      "url": "https://company.sharepoint.com/approvals/files/approval_form.pdf"
    }
  ],
  "approvalChain": {
    "chainId": "chain_789",
    "currentStepId": "step_2",
    "steps": [
      {
        "stepId": "step_1",
        "level": 1,
        "approverType": "DirectManager",
        "approverId": "mgr456",
        "approverName": "Jane Doe",
        "status": "approved",
        "completedAt": "2025-04-21T15:20:30Z",
        "comments": "Approved as per department budget"
      },
      {
        "stepId": "step_2",
        "level": 2,
        "approverType": "ITManager",
        "approverId": "it789",
        "approverName": "Mike Johnson",
        "status": "pending",
        "dueBy": "2025-04-25T23:59:59Z"
      }
    ]
  }
}
```

#### Approval Decision

```json
{
  "requestId": "req_12345",
  "stepId": "step_2",
  "decision": "approved",
  "comments": "Software is approved and compliant with security policies",
  "decidedBy": {
    "id": "it789",
    "displayName": "Mike Johnson",
    "email": "mike.johnson@company.com"
  },
  "decidedAt": "2025-04-23T09:15:30Z",
  "additionalData": {
    "licenseKey": "ABCD-EFGH-IJKL-MNOP",
    "installationInstructions": "Use company software portal for installation"
  }
}
```

#### Approval Policy

```json
{
  "policyId": "pol_456",
  "name": "Standard Software Approval Policy",
  "description": "Default approval path for standard software requests",
  "isActive": true,
  "appliesTo": {
    "requestTypes": ["software_installation"],
    "departments": ["*"],
    "costRange": {
      "min": 0,
      "max": 500
    },
    "softwareCategories": ["office", "utilities", "productivity"]
  },
  "approvalSteps": [
    {
      "level": 1,
      "approverType": "DirectManager",
      "requiredApprovals": 1,
      "timeLimit": 48,
      "escalationType": "auto",
      "escalationAfter": 24,
      "escalateTo": "managerManager"
    },
    {
      "level": 2,
      "approverType": "ITSupport",
      "requiredApprovals": 1,
      "timeLimit": 72,
      "escalationType": "manual",
      "notifyAfter": [24, 48],
      "escalateTo": "ITManager"
    }
  ],
  "autoApprovals": [
    {
      "condition": "cost < 50 AND softwareCategory == 'utilities'",
      "skipLevels": [2]
    }
  ],
  "createdAt": "2025-01-15T00:00:00Z",
  "updatedAt": "2025-03-20T00:00:00Z",
  "version": 2
}
```

## API Usage Examples

### Creating an Approval Request

#### HTTP Request

```
POST /api/approvals HTTP/1.1
Host: software-request-bot.company.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Visual Studio Enterprise Installation",
  "description": "Need Visual Studio Enterprise for new .NET development project",
  "requestType": "software_installation",
  "priority": "high",
  "dueBy": "2025-05-10T23:59:59Z",
  "metadata": {
    "softwareName": "Visual Studio Enterprise",
    "softwareVersion": "2025",
    "estimatedCost": 1199.00,
    "costCenter": "DEV-002",
    "licenseType": "annual"
  }
}
```

#### HTTP Response

```
HTTP/1.1 201 Created
Content-Type: application/json
Location: https://software-request-bot.company.com/api/approvals/req_67890

{
  "requestId": "req_67890",
  "title": "Visual Studio Enterprise Installation",
  "status": "pending",
  "createdAt": "2025-04-26T08:30:15Z",
  "approvalChain": {
    "chainId": "chain_123",
    "currentStepId": "step_1",
    "steps": [
      {
        "stepId": "step_1",
        "level": 1,
        "approverType": "DirectManager",
        "approverId": "mgr456",
        "approverName": "Jane Doe",
        "status": "pending",
        "dueBy": "2025-04-28T08:30:15Z"
      },
      {
        "stepId": "step_2",
        "level": 2,
        "approverType": "DepartmentHead",
        "approverId": "dept987",
        "approverName": "Robert Brown",
        "status": "notStarted"
      },
      {
        "stepId": "step_3",
        "level": 3,
        "approverType": "ITDirector",
        "approverId": "itdir654",
        "approverName": "Sarah Wilson",
        "status": "notStarted"
      }
    ]
  }
}
```

### C# Example: Creating an Approval Request

```csharp
// Service class for interacting with the Approvals API
public class ApprovalsApiService
{
    private readonly HttpClient _httpClient;
    private readonly ITokenService _tokenService;
    private readonly ILogger<ApprovalsApiService> _logger;

    public ApprovalsApiService(
        HttpClient httpClient,
        ITokenService tokenService,
        ILogger<ApprovalsApiService> logger)
    {
        _httpClient = httpClient;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<ApprovalRequestResponse> CreateApprovalRequestAsync(CreateApprovalRequest request)
    {
        try
        {
            // Get access token
            var token = await _tokenService.GetAccessTokenAsync();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            
            // Send the request
            var response = await _httpClient.PostAsJsonAsync("/api/approvals", request);
            
            // Ensure success
            response.EnsureSuccessStatusCode();
            
            // Return the created approval
            return await response.Content.ReadFromJsonAsync<ApprovalRequestResponse>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating approval request");
            throw;
        }
    }
}
```

### Submitting an Approval Decision

#### HTTP Request

```
POST /api/approvals/req_67890/decision HTTP/1.1
Host: software-request-bot.company.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "stepId": "step_1",
  "decision": "approved",
  "comments": "Approved for new project requirements"
}
```

#### HTTP Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "requestId": "req_67890",
  "stepId": "step_1",
  "status": "approved",
  "updatedAt": "2025-04-27T14:20:30Z",
  "nextStepId": "step_2",
  "nextApprover": {
    "id": "dept987",
    "displayName": "Robert Brown",
    "email": "robert.brown@company.com"
  }
}
```

### PowerShell Example: Submitting an Approval Decision

```powershell
# PowerShell function to submit an approval decision
function Submit-ApprovalDecision {
    param (
        [Parameter(Mandatory=$true)]
        [string]$RequestId,
        
        [Parameter(Mandatory=$true)]
        [string]$StepId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("approved", "rejected", "moreInfo")]
        [string]$Decision,
        
        [Parameter(Mandatory=$false)]
        [string]$Comments
    )
    
    # Get access token
    $token = Get-AccessToken
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $body = @{
        stepId = $StepId
        decision = $Decision
        comments = $Comments
    } | ConvertTo-Json
    
    $uri = "https://software-request-bot.company.com/api/approvals/$RequestId/decision"
    
    try {
        $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
        return $response
    }
    catch {
        Write-Error "Error submitting approval decision: $_"
        throw
    }
}

# Example usage
Submit-ApprovalDecision -RequestId "req_67890" -StepId "step_1" -Decision "approved" -Comments "Approved for development team"
```

### Querying Pending Approvals

#### HTTP Request

```
GET /api/approvals/pending HTTP/1.1
Host: software-request-bot.company.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### HTTP Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "count": 3,
  "items": [
    {
      "requestId": "req_67890",
      "title": "Visual Studio Enterprise Installation",
      "requestType": "software_installation",
      "requester": {
        "id": "user123",
        "displayName": "John Smith"
      },
      "createdAt": "2025-04-26T08:30:15Z",
      "dueBy": "2025-04-28T08:30:15Z",
      "stepId": "step_1",
      "level": 1
    },
    {
      "requestId": "req_67891",
      "title": "Adobe Creative Cloud Suite",
      "requestType": "software_installation",
      "requester": {
        "id": "user456",
        "displayName": "Emily Davis"
      },
      "createdAt": "2025-04-25T15:45:22Z",
      "dueBy": "2025-04-28T15:45:22Z",
      "stepId": "step_1",
      "level": 1
    },
    {
      "requestId": "req_67892",
      "title": "Tableau Desktop Professional",
      "requestType": "software_installation",
      "requester": {
        "id": "user789",
        "displayName": "Michael Wilson"
      },
      "createdAt": "2025-04-24T11:20:18Z",
      "dueBy": "2025-04-29T11:20:18Z",
      "stepId": "step_2",
      "level": 2
    }
  ]
}
```

### JavaScript Example: Querying Pending Approvals

```javascript
// JavaScript function to get pending approvals
async function getPendingApprovals() {
  try {
    const token = await getAccessToken();
    
    const response = await fetch('https://software-request-bot.company.com/api/approvals/pending', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    throw error;
  }
}

// Example usage with async/await
async function displayPendingApprovals() {
  try {
    const approvals = await getPendingApprovals();
    
    // Update UI with pending approvals
    const container = document.getElementById('pendingApprovals');
    
    if (approvals.count === 0) {
      container.innerHTML = '<p>No pending approvals</p>';
      return;
    }
    
    let html = `<h3>You have ${approvals.count} pending approvals</h3><ul>`;
    
    approvals.items.forEach(approval => {
      const dueDate = new Date(approval.dueBy).toLocaleDateString();
      html += `
        <li>
          <strong>${approval.title}</strong>
          <p>Requested by: ${approval.requester.displayName}</p>
          <p>Due by: ${dueDate}</p>
          <button onclick="viewApproval('${approval.requestId}')">View Details</button>
        </li>
      `;
    });
    
    html += '</ul>';
    container.innerHTML = html;
  } catch (error) {
    document.getElementById('pendingApprovals').innerHTML = 
      '<p>Error loading approvals. Please try again later.</p>';
  }
}
```

## Webhook Integration

### Registering a Webhook

#### HTTP Request

```
POST /api/webhooks/approvals/register HTTP/1.1
Host: software-request-bot.company.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "ITSM Integration Webhook",
  "targetUrl": "https://company-itsm.service-now.com/api/webhooks/software_requests",
  "events": ["approval.created", "approval.updated", "approval.completed"],
  "secret": "your-webhook-secret-key",
  "description": "Webhook for ServiceNow ITSM integration"
}
```

#### HTTP Response

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "webhookId": "wh_12345",
  "name": "ITSM Integration Webhook",
  "targetUrl": "https://company-itsm.service-now.com/api/webhooks/software_requests",
  "events": ["approval.created", "approval.updated", "approval.completed"],
  "status": "active",
  "createdAt": "2025-04-26T10:15:30Z"
}
```

### Webhook Payload Example

```json
{
  "webhookId": "wh_12345",
  "eventType": "approval.updated",
  "timestamp": "2025-04-27T14:20:30Z",
  "data": {
    "requestId": "req_67890",
    "title": "Visual Studio Enterprise Installation",
    "status": "in_progress",
    "approvalChain": {
      "chainId": "chain_123",
      "currentStepId": "step_2",
      "steps": [
        {
          "stepId": "step_1",
          "level": 1,
          "status": "approved",
          "completedAt": "2025-04-27T14:20:30Z",
          "completedBy": {
            "id": "mgr456",
            "displayName": "Jane Doe"
          },
          "comments": "Approved for new project requirements"
        },
        {
          "stepId": "step_2",
          "level": 2,
          "status": "pending",
          "dueBy": "2025-04-29T14:20:30Z"
        }
      ]
    },
    "metadata": {
      "softwareName": "Visual Studio Enterprise",
      "softwareVersion": "2025",
      "estimatedCost": 1199.00
    }
  }
}
```

### Python Example: Implementing a Webhook Receiver

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json
import time

app = Flask(__name__)

# Your webhook secret key
WEBHOOK_SECRET = "your-webhook-secret-key"

def verify_signature(payload, signature_header):
    """Verify the webhook signature"""
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature_header)

@app.route('/api/webhooks/software_requests', methods=['POST'])
def handle_webhook():
    # Get the signature from headers
    signature = request.headers.get('X-Webhook-Signature')
    
    if not signature:
        return jsonify({'error': 'Missing signature'}), 401
    
    # Get the raw request payload
    payload = request.get_data()
    
    # Verify the signature
    if not verify_signature(payload, signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Parse the JSON payload
    webhook_data = json.loads(payload)
    
    # Process different event types
    event_type = webhook_data.get('eventType')
    
    if event_type == 'approval.created':
        # Handle new approval request
        create_ticket_in_itsm(webhook_data['data'])
    elif event_type == 'approval.updated':
        # Handle approval update
        update_ticket_in_itsm(webhook_data['data'])
    elif event_type == 'approval.completed':
        # Handle completed approval
        complete_ticket_in_itsm(webhook_data['data'])
    
    # Acknowledge receipt
    return jsonify({'status': 'success', 'received_at': time.time()}), 200

def create_ticket_in_itsm(data):
    # Implementation to create a ticket in your ITSM system
    request_id = data['requestId']
    title = data['title']
    print(f"Creating ITSM ticket for approval request: {title} (ID: {request_id})")
    # Add your ITSM integration code here

def update_ticket_in_itsm(data):
    # Implementation to update a ticket in your ITSM system
    request_id = data['requestId']
    status = data['status']
    print(f"Updating ITSM ticket for approval request: {request_id} (Status: {status})")
    # Add your ITSM integration code here

def complete_ticket_in_itsm(data):
    # Implementation to complete a ticket in your ITSM system
    request_id = data['requestId']
    final_status = data['status']
    print(f"Completing ITSM ticket for approval request: {request_id} (Final Status: {final_status})")
    # Add your ITSM integration code here

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

## Bulk Operations

### Batch Approval Processing

#### HTTP Request

```
POST /api/approvals/batch HTTP/1.1
Host: software-request-bot.company.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "items": [
    {
      "requestId": "req_67890",
      "stepId": "step_1",
      "decision": "approved",
      "comments": "Batch approval for development team software"
    },
    {
      "requestId": "req_67891",
      "stepId": "step_1",
      "decision": "approved",
      "comments": "Batch approval for development team software"
    },
    {
      "requestId": "req_67892",
      "stepId": "step_2",
      "decision": "rejected",
      "comments": "Budget constraints for Q2, please resubmit in Q3"
    }
  ]
}
```

#### HTTP Response

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "batchId": "batch_12345",
  "processedAt": "2025-04-27T16:45:30Z",
  "results": [
    {
      "requestId": "req_67890",
      "stepId": "step_1",
      "status": "success",
      "message": "Approval decision processed"
    },
    {
      "requestId": "req_67891",
      "stepId": "step_1",
      "status": "success",
      "message": "Approval decision processed"
    },
    {
      "requestId": "req_67892",
      "stepId": "step_2",
      "status": "error",
      "message": "Step already completed"
    }
  ],
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  }
}
```

## Integration with Microsoft Teams

### Teams Adaptive Card Integration

The Approvals API supports direct integration with Microsoft Teams through adaptive cards. This enables a rich, interactive approval experience within the Teams interface.

#### Creating a Teams Approval Card

```csharp
// Method to generate an adaptive card for Teams approval
public AdaptiveCard CreateTeamsApprovalCard(ApprovalRequest request, ApprovalStep step)
{
    // Create the adaptive card
    var card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
    {
        Body = new List<AdaptiveElement>
        {
            new AdaptiveTextBlock
            {
                Text = $"Software Installation Request: {request.Title}",
                Size = AdaptiveTextSize.Large,
                Weight = AdaptiveTextWeight.Bolder,
                Wrap = true
            },
            new AdaptiveTextBlock
            {
                Text = $"Request ID: {request.RequestId}",
                IsSubtle = true,
                Spacing = AdaptiveSpacing.None,
                Wrap = true
            },
            new AdaptiveFactSet
            {
                Facts = new List<AdaptiveFact>
                {
                    new AdaptiveFact("Requested By:", request.CreatedBy.DisplayName),
                    new AdaptiveFact("Software:", request.Metadata["softwareName"]),
                    new AdaptiveFact("Version:", request.Metadata["softwareVersion"]),
                    new AdaptiveFact("Estimated Cost:", $"${request.Metadata["estimatedCost"]}"),
                    new AdaptiveFact("Business Justification:", request.Description)
                }
            },
            new AdaptiveTextBlock
            {
                Text = "Your approval is required",
                Weight = AdaptiveTextWeight.Bolder,
                Spacing = AdaptiveSpacing.Medium
            },
            new AdaptiveTextBlock
            {
                Text = $"Due by: {step.DueBy.ToString("MMM dd, yyyy")}",
                IsSubtle = true
            },
            new AdaptiveTextInput
            {
                Id = "comments",
                Placeholder = "Add comments (optional)",
                IsMultiline = true
            }
        },
        Actions = new List<AdaptiveAction>
        {
            new AdaptiveSubmitAction
            {
                Title = "Approve",
                Style = AdaptiveActionStyle.Positive,
                Data = new ApprovalActionData
                {
                    Action = "approve",
                    RequestId = request.RequestId,
                    StepId = step.StepId
                }
            },
            new AdaptiveSubmitAction
            {
                Title = "Reject",
                Style = AdaptiveActionStyle.Destructive,
                Data = new ApprovalActionData
                {
                    Action = "reject",
                    RequestId = request.RequestId,
                    StepId = step.StepId
                }
            },
            new AdaptiveShowCardAction
            {
                Title = "Request More Info",
                Card = new AdaptiveCard(new AdaptiveSchemaVersion(1, 3))
                {
                    Body = new List<AdaptiveElement>
                    {
                        new AdaptiveTextInput
                        {
                            Id = "moreInfoRequest",
                            Placeholder = "Specify what additional information is needed",
                            IsMultiline = true
                        }
                    },
                    Actions = new List<AdaptiveAction>
                    {
                        new AdaptiveSubmitAction
                        {
                            Title = "Submit Request",
                            Data = new ApprovalActionData
                            {
                                Action = "moreInfo",
                                RequestId = request.RequestId,
                                StepId = step.StepId
                            }
                        }
                    }
                }
            }
        }
    };

    return card;
}
```

#### Processing Teams Adaptive Card Responses

```csharp
// Azure Function to process Teams adaptive card submissions
[FunctionName("ProcessTeamsApprovalAction")]
public async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "teams/approval-action")] HttpRequest req,
    ILogger log)
{
    log.LogInformation("Processing Teams approval action");

    // Get the request body
    string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
    var adaptiveCardData = JsonConvert.DeserializeObject<TeamsAdaptiveCardData>(requestBody);
    
    // Extract the action data
    var actionData = adaptiveCardData.Data as JObject;
    string action = actionData["action"].ToString();
    string requestId = actionData["requestId"].ToString();
    string stepId = actionData["stepId"].ToString();
    
    // Get comments if provided
    string comments = null;
    if (adaptiveCardData.Data.ContainsKey("comments"))
    {
        comments = adaptiveCardData.Data["comments"]?.ToString();
    }
    
    // Process the approval action
    var request = new ApprovalDecisionRequest
    {
        StepId = stepId,
        Decision = action,
        Comments = comments
    };
    
    // Authenticate the user from Teams
    var token = await GetTeamsUserTokenAsync(adaptiveCardData.Context);
    
    // Call the Approvals API
    var response = await _approvalsApiService.SubmitDecisionAsync(token, requestId, request);
    
    // Create a response card
    var responseCard = CreateResponseCard(action, response);
    
    // Return the response
    return new ContentResult
    {
        Content = JsonConvert.SerializeObject(new { card = responseCard }),
        ContentType = "application/json",
        StatusCode = 200
    };
}
```

## Error Handling

### Error Codes and Meanings

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_REQUEST | Request data is malformed or incomplete |
| 401 | UNAUTHORIZED | Authentication failed or token expired |
| 403 | FORBIDDEN | User doesn't have permission for the operation |
| 404 | NOT_FOUND | Requested resource not found |
| 409 | CONFLICT | Resource state conflicts with request (e.g., already approved) |
| 422 | VALIDATION_ERROR | Request failed validation rules |
| 429 | RATE_LIMITED | Too many requests, client should back off |
| 500 | SERVER_ERROR | Internal server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid approval decision",
    "details": [
      {
        "field": "decision",
        "message": "Value must be one of: approved, rejected, moreInfo"
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2025-04-26T15:30:45Z"
  }
}
```

### Handling Rate Limits

The API implements rate limiting to prevent abuse:

- Default limit: 100 requests per minute per client
- Batch operations count as a single request for rate limiting purposes
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum requests allowed per window
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Timestamp when the limit resets

When rate limited, clients should implement exponential backoff:

```javascript
// Example JavaScript implementation of exponential backoff
async function makeApiRequestWithBackoff(url, options, maxRetries = 5) {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Extract retry-after header or default to exponential backoff
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, retries);
        const waitTime = parseInt(retryAfter, 10) * 1000;
        
        console.log(`Rate limited. Retrying in ${waitTime}ms (retry ${retries + 1} of ${maxRetries})`);
        
        // Wait for the specified time
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Increment retry counter
        retries++;
        continue;
      }
      
      // Return successful response
      return response;
    } catch (error) {
      lastError = error;
      retries++;
      
      if (retries < maxRetries) {
        // Calculate backoff time
        const waitTime = Math.pow(2, retries) * 1000;
        
        console.log(`Request failed. Retrying in ${waitTime}ms (retry ${retries} of ${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error(`Failed after ${maxRetries} retries`);
}
```

## Versioning and Backward Compatibility

### API Versioning

The Approvals API uses versioning to ensure backward compatibility:

- Version is specified in the URL path: `/api/v1/approvals`
- Current stable version: v1
- Preview versions are available: `/api/v2-preview/approvals`

### Deprecation Policy

- APIs are supported for at least 12 months after deprecation notice
- Deprecated endpoints return a `X-API-Deprecated` header with deprecation date
- Release notes document all deprecations and migrations

### Migration Examples

#### Migrating from v1 to v2 Approval Creation

v1 Request:
```json
POST /api/v1/approvals

{
  "title": "Software Request",
  "software": {
    "name": "Adobe Photoshop",
    "version": "2025",
    "cost": 239.99
  },
  "justification": "Needed for design work"
}
```

v2 Request:
```json
POST /api/v2/approvals

{
  "title": "Software Request",
  "description": "Needed for design work", 
  "metadata": {
    "softwareName": "Adobe Photoshop", 
    "softwareVersion": "2025", 
    "estimatedCost": 239.99
  }
}
```

Migration code example:
```csharp
// Helper to migrate v1 to v2 format
public CreateApprovalRequestV2 MigrateToV2Format(CreateApprovalRequestV1 v1Request)
{
    return new CreateApprovalRequestV2
    {
        Title = v1Request.Title,
        Description = v1Request.Justification,
        RequestType = "software_installation",
        Metadata = new Dictionary<string, object>
        {
            ["softwareName"] = v1Request.Software.Name,
            ["softwareVersion"] = v1Request.Software.Version,
            ["estimatedCost"] = v1Request.Software.Cost
        }
    };
}
```

## Security Considerations

### Data Protection

- All API communications use TLS 1.2+
- PII and sensitive data is encrypted at rest
- Access tokens have limited lifetimes (1 hour)
- Refresh tokens are rotated on each use

### API Keys Security

- API keys should be stored securely
- Keys are scoped to specific operations
- Keys can be revoked at any time
- Key rotation should be performed regularly

### Cross-Origin Resource Sharing (CORS)

The API implements CORS with the following restrictions:

- Only allowed origins can access the API
- Credentials are required for cross-origin requests
- Only necessary HTTP methods are allowed
- Preflight requests are cached for performance

```csharp
// CORS configuration example
services.AddCors(options =>
{
    options.AddPolicy("ApprovalApiPolicy", builder =>
    {
        builder
            .WithOrigins(
                "https://company.sharepoint.com",
                "https://teams.microsoft.com"
            )
            .AllowCredentials()
            .WithMethods("GET", "POST", "PUT", "DELETE")
            .WithHeaders("Authorization", "Content-Type", "X-API-Key");
    });
});
```

## Rate Limiting and Throttling

### Rate Limiting Tiers

| Tier | Requests/Minute | Burst Capacity | Clients |
|------|----------------|---------------|---------|
| Basic | 100 | 150 | Standard applications |
| Premium | 300 | 500 | High-volume applications |
| Internal | 1000 | 1500 | Company internal services |

### Implementation with Azure API Management

```csharp
// Rate limiting policy in Azure API Management
<policies>
    <inbound>
        <base />
        <rate-limit calls="100" renewal-period="60" />
        <quota calls="10000" renewal-period="86400" />
        <set-header name="X-RateLimit-Limit" exists-action="override">
            <value>100</value>
        </set-header>
        <set-header name="X-RateLimit-Remaining" exists-action="override">
            <value>@(context.Variables.GetValueOrDefault<long>("rate-limit-remaining"))</value>
        </set-header>
        <set-header name="X-RateLimit-Reset" exists-action="override">
            <value>@(context.Variables.GetValueOrDefault<long>("rate-limit-reset"))</value>
        </set-header>
    </inbound>
</policies>
```

## Monitoring and Diagnostics

### Request Tracing

Every API request includes a unique trace ID in the response headers:

```
X-Request-Id: 9f5a2d87-c453-4746-9a58-e86c5a7f545c
```

This ID can be used for end-to-end request tracking in logs and diagnostic tools.

### Application Insights Integration

```csharp
// Middleware for Application Insights request tracking
public class RequestTrackingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly TelemetryClient _telemetryClient;

    public RequestTrackingMiddleware(RequestDelegate next, TelemetryClient telemetryClient)
    {
        _next = next;
        _telemetryClient = telemetryClient;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Generate or extract request ID
        string requestId = context.Request.Headers["X-Request-Id"].FirstOrDefault() ?? 
                          Guid.NewGuid().ToString();
        
        // Add request ID to response headers
        context.Response.Headers["X-Request-Id"] = requestId;
        
        // Start operation for tracking
        using (var operation = _telemetryClient.StartOperation<RequestTelemetry>("ApiRequest", requestId))
        {
            // Add custom properties
            operation.Telemetry.Properties["Endpoint"] = context.Request.Path;
            operation.Telemetry.Properties["UserId"] = context.User.Identity.Name ?? "anonymous";
            
            try
            {
                // Process the request
                await _next(context);
                
                // Record result
                operation.Telemetry.Success = context.Response.StatusCode < 400;
                operation.Telemetry.ResponseCode = context.Response.StatusCode.ToString();
            }
            catch (Exception ex)
            {
                // Track exception
                _telemetryClient.TrackException(ex);
                operation.Telemetry.Success = false;
                throw;
            }
        }
    }
}
```

## Advanced Integration Scenarios

### Integration with ServiceNow

```csharp
// ServiceNow integration service
public class ServiceNowIntegrationService : IITSMIntegrationService
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<ServiceNowOptions> _options;
    private readonly ILogger<ServiceNowIntegrationService> _logger;

    public ServiceNowIntegrationService(
        HttpClient httpClient,
        IOptions<ServiceNowOptions> options,
        ILogger<ServiceNowIntegrationService> logger)
    {
        _httpClient = httpClient;
        _options = options;
        _logger = logger;
    }

    public async Task<string> CreateTicketAsync(ApprovalRequest approvalRequest)
    {
        try
        {
            // Set up authentication
            string auth = Convert.ToBase64String(Encoding.ASCII.GetBytes(
                $"{_options.Value.Username}:{_options.Value.Password}"));
            _httpClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Basic", auth);
            
            // Create ServiceNow incident
            var incident = new
            {
                short_description = $"Software Request: {approvalRequest.Title}",
                description = approvalRequest.Description,
                category = "Software",
                subcategory = "Installation",
                impact = MapPriorityToImpact(approvalRequest.Priority),
                urgency = MapPriorityToUrgency(approvalRequest.Priority),
                correlation_id = approvalRequest.RequestId,
                comments = $"Requested by: {approvalRequest.CreatedBy.DisplayName}",
                u_requested_for = approvalRequest.CreatedBy.Email
            };
            
            // Send request to ServiceNow
            var response = await _httpClient.PostAsJsonAsync(
                $"{_options.Value.InstanceUrl}/api/now/table/incident", incident);
            
            // Check response
            response.EnsureSuccessStatusCode();
            
            // Parse response
            var responseContent = await response.Content.ReadFromJsonAsync<ServiceNowResponse>();
            
            // Return ServiceNow ticket ID
            return responseContent.Result.SysId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ServiceNow ticket");
            throw;
        }
    }

    public async Task UpdateTicketAsync(string ticketId, ApprovalRequest approvalRequest)
    {
        // Implementation for updating a ServiceNow ticket
        // ...
    }

    private int MapPriorityToImpact(string priority)
    {
        return priority.ToLower() switch
        {
            "high" => 1,
            "medium" => 2,
            "low" => 3,
            _ => 3
        };
    }

    private int MapPriorityToUrgency(string priority)
    {
        return priority.ToLower() switch
        {
            "high" => 1,
            "medium" => 2,
            "low" => 3,
            _ => 3
        };
    }
}
```

### Integration with Power Automate

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "connections_servicenow_name": {
      "defaultValue": "servicenow",
      "type": "String"
    },
    "connections_approvals_name": {
      "defaultValue": "softwarerequestbotapprovals",
      "type": "String"
    }
  },
  "variables": {},
  "resources": [
    {
      "type": "Microsoft.Web/connections",
      "apiVersion": "2016-06-01",
      "name": "[parameters('connections_approvals_name')]",
      "location": "eastus",
      "properties": {
        "displayName": "Software Request Bot Approvals",
        "customParameterValues": {},
        "api": {
          "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/eastus/managedApis/custom')]"
        },
        "parameterValues": {
          "authType": "oauth2",
          "baseUrl": "https://software-request-bot.company.com/api"
        }
      }
    },
    {
      "type": "Microsoft.Logic/workflows",
      "apiVersion": "2017-07-01",
      "name": "SoftwareRequestApprovalFlow",
      "location": "eastus",
      "dependsOn": [
        "[resourceId('Microsoft.Web/connections', parameters('connections_approvals_name'))]",
        "[resourceId('Microsoft.Web/connections', parameters('connections_servicenow_name'))]"
      ],
      "properties": {
        "state": "Enabled",
        "definition": {
          "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
          "contentVersion": "1.0.0.0",
          "parameters": {
            "$connections": {
              "defaultValue": {},
              "type": "Object"
            }
          },
          "triggers": {
            "When_an_approval_is_completed": {
              "type": "ApiConnectionWebhook",
              "inputs": {
                "body": {
                  "callbackUrl": "@{listCallbackUrl()}"
                },
                "host": {
                  "connection": {
                    "name": "@parameters('$connections')['approvals']['connectionId']"
                  }
                },
                "path": "/webhooks/onApprovalCompleted"
              }
            }
          },
          "actions": {
            "Create_ServiceNow_ticket_if_approved": {
              "runAfter": {
                "Parse_approval_data": [
                  "Succeeded"
                ]
              },
              "type": "Conditional",
              "expression": {
                "and": [
                  {
                    "equals": [
                      "@body('Parse_approval_data')?['status']",
                      "approved"
                    ]
                  }
                ]
              },
              "actions": {
                "Create_record": {
                  "runAfter": {},
                  "type": "ApiConnection",
                  "inputs": {
                    "body": {
                      "short_description": "@{body('Parse_approval_data')?['title']}",
                      "description": "@{body('Parse_approval_data')?['description']}",
                      "category": "Software",
                      "correlation_id": "@{body('Parse_approval_data')?['requestId']}"
                    },
                    "host": {
                      "connection": {
                        "name": "@parameters('$connections')['servicenow']['connectionId']"
                      }
                    },
                    "method": "post",
                    "path": "/api/now/table/incident"
                  }
                }
              },
              "else": {
                "actions": {
                  "Notify_requester_of_rejection": {
                    "runAfter": {},
                    "type": "ApiConnection",
                    "inputs": {
                      "body": {
                        "message": "Your software request was not approved",
                        "requestId": "@body('Parse_approval_data')?['requestId']",
                        "recipient": "@body('Parse_approval_data')?['createdBy']['email']"
                      },
                      "host": {
                        "connection": {
                          "name": "@parameters('$connections')['approvals']['connectionId']"
                        }
                      },
                      "method": "post",
                      "path": "/api/notifications"
                    }
                  }
                }
              }
            },
            "Parse_approval_data": {
              "runAfter": {},
              "type": "ParseJson",
              "inputs": {
                "content": "@triggerBody()?['data']",
                "schema": {
                  "properties": {
                    "createdBy": {
                      "properties": {
                        "displayName": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        },
                        "id": {
                          "type": "string"
                        }
                      },
                      "type": "object"
                    },
                    "description": {
                      "type": "string"
                    },
                    "metadata": {
                      "properties": {
                        "estimatedCost": {
                          "type": "number"
                        },
                        "softwareName": {
                          "type": "string"
                        },
                        "softwareVersion": {
                          "type": "string"
                        }
                      },
                      "type": "object"
                    },
                    "requestId": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    }
                  },
                  "type": "object"
                }
              }
            }
          },
          "outputs": {}
        },
        "parameters": {
          "$connections": {
            "value": {
              "approvals": {
                "connectionId": "[resourceId('Microsoft.Web/connections', parameters('connections_approvals_name'))]",
                "connectionName": "softwarerequestbotapprovals",
                "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/eastus/managedApis/custom')]"
              },
              "servicenow": {
                "connectionId": "[resourceId('Microsoft.Web/connections', parameters('connections_servicenow_name'))]",
                "connectionName": "servicenow",
                "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/eastus/managedApis/servicenow')]"
              }
            }
          }
        }
      }
    }
  ]
}
```

## Performance Optimization

### Response Caching

The API implements caching for appropriate endpoints:

- GET requests for reference data are cached
- Cache-Control headers specify cache duration
- ETag support for conditional requests
- Cache invalidation on write operations

Example implementation:

```csharp
// Controller method with caching
[HttpGet("policies")]
[ResponseCache(Duration = 300)]  // Cache for 5 minutes
public async Task<ActionResult<IEnumerable<ApprovalPolicy>>> GetPolicies()
{
    var policies = await _policyRepository.GetActivePoliciesAsync();
    
    // Generate ETag based on content
    string etag = ComputeETag(policies);
    
    // Check If-None-Match header
    if (Request.Headers.TryGetValue("If-None-Match", out var ifNoneMatchValues))
    {
        if (ifNoneMatchValues.Contains(etag))
        {
            return StatusCode(304); // Not Modified
        }
    }
    
    Response.Headers.Add("ETag", etag);
    
    return Ok(policies);
}
```

### Query Optimization

For large result sets, the API supports:

- Pagination with `limit` and `offset` parameters
- Projection to select specific fields: `fields=id,title,status`
- Sorting with `sort` parameter: `sort=createdAt:desc`
- Filtering with `filter` parameter: `filter=status:pending`

Example query URL:
```
GET /api/approvals?limit=20&offset=40&fields=id,title,status&sort=createdAt:desc&filter=status:pending
```

## Conclusion

The Approvals API provides a robust and flexible interface for integrating with the Software Install Request Bot's approval workflows. By following the guidelines and examples in this documentation, developers can create powerful integrations that streamline the software request and approval process within their organizations.

For additional support or to report issues, please contact:

- Email: softwarerequest-support@company.com
- Teams Channel: Software Request Bot Support
- Documentation Portal: https://internal.company.com/knowledgebase/software-request-bot

For updates, feature requests, and roadmap information, please visit the Software Install Request Bot project site on the company intranet.