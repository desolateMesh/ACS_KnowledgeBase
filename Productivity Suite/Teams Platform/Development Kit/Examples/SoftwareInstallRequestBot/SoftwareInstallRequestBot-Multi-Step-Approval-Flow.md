# SoftwareInstallRequestBot: Multi-Step Approval Flow

## Overview

The multi-step approval flow is a critical component of the Software Install Request Bot that manages the sequential approval process for software installation requests. This document provides comprehensive information about the design, implementation, and customization of the approval workflow.

## Key Features

- Configurable approval chains based on organizational hierarchy
- Support for parallel and sequential approval paths
- Automatic escalation after defined time periods
- Delegation capabilities for approvers
- Comprehensive audit trail of all approval actions
- Real-time notifications for all stakeholders
- Integration with enterprise approval systems

## Architecture

The multi-step approval flow is built on a modular architecture that separates concerns and allows for flexible customization:

```
┌─────────────────────┐     ┌────────────────────┐     ┌───────────────────┐
│                     │     │                    │     │                   │
│  Approval Manager   │◄────►  Workflow Engine   │◄────►  Notification     │
│                     │     │                    │     │  Service          │
└─────────────────────┘     └────────────────────┘     └───────────────────┘
         ▲                          ▲                         ▲
         │                          │                         │
         ▼                          ▼                         ▼
┌─────────────────────┐     ┌────────────────────┐     ┌───────────────────┐
│                     │     │                    │     │                   │
│  Policy Resolver    │     │  State Manager     │     │  Teams Adapter    │
│                     │     │                    │     │                   │
└─────────────────────┘     └────────────────────┘     └───────────────────┘
         ▲                          ▲                         ▲
         │                          │                         │
         └──────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────────┐
                          │                    │
                          │  Storage Provider  │
                          │                    │
                          └────────────────────┘
```

### Component Responsibilities

1. **Approval Manager**: Orchestrates the entire approval process, delegating specific tasks to specialized components
2. **Workflow Engine**: Executes the business rules that define approval paths and transitions
3. **Notification Service**: Manages the delivery of approval requests and status updates
4. **Policy Resolver**: Determines approval requirements based on configurable business rules
5. **State Manager**: Maintains the current state of each approval chain
6. **Teams Adapter**: Renders adaptive cards and processes responses within Microsoft Teams
7. **Storage Provider**: Persists approval state and history

## Approval Flow Process

### 1. Initialization Phase

When a software request is submitted, the approval flow is initialized through these steps:

```csharp
// Example code for initializing an approval flow
public async Task<ApprovalChain> InitializeApprovalFlow(SoftwareRequest request)
{
    // Determine approval policy based on request attributes
    var policy = await _policyResolver.ResolveApprovalPolicy(request);
    
    // Create the approval chain with initial state
    var approvalChain = new ApprovalChain
    {
        RequestId = request.RequestId,
        Status = ApprovalStatus.Pending,
        CreatedAt = DateTime.UtcNow,
        Steps = policy.RequiredApprovals.Select(ra => new ApprovalStep
        {
            StepId = Guid.NewGuid().ToString(),
            ApproverType = ra.ApproverType,
            ApproverId = ra.GetApproverIdForRequest(request),
            Status = ApprovalStepStatus.Pending,
            DueBy = DateTime.UtcNow.AddHours(ra.TimeLimitHours)
        }).ToList()
    };
    
    // Persist the approval chain
    await _storageProvider.SaveApprovalChainAsync(approvalChain);
    
    // Notify the first approver(s)
    await NotifyNextApprovers(approvalChain);
    
    return approvalChain;
}
```

### 2. Approval Routing

The system determines the appropriate approval chain based on:

- Software category (security implications, cost tier)
- Requester's department or role
- Organizational policies
- Compliance requirements

#### Example Routing Logic

| Software Category | Cost Tier | Approval Chain |
|-------------------|-----------|----------------|
| Standard Office   | < $100    | Direct Manager |
| Standard Office   | $100-$1000 | Direct Manager → Department Head |
| Standard Office   | > $1000   | Direct Manager → Department Head → Finance |
| Security Related  | Any       | Direct Manager → Security Team → IT Director |
| Development Tools | Any       | Direct Manager → Dev Team Lead → IT |
| Custom Software   | Any       | Direct Manager → Department Head → IT Director → Finance |

### 3. Notification Delivery

Approvers receive notifications through:

- Teams chat messages with adaptive cards
- Email notifications (optional)
- Mobile push notifications (if Teams mobile is configured)

Each notification contains:

- Request details (software name, version, cost)
- Requester information
- Business justification
- Action buttons (Approve, Reject, Request More Info)
- Due date for the approval action

### 4. Approval Actions

Approvers can take the following actions:

- **Approve**: Moves the request to the next approval level
- **Reject**: Terminates the approval chain with rejection status
- **Request More Information**: Pauses the approval chain and prompts the requester
- **Delegate**: Transfers approval responsibility to another authorized approver
- **Escalate**: Manually escalates to a higher-level approver

```csharp
// Example action handler for approval decisions
public async Task ProcessApprovalAction(string requestId, string stepId, ApprovalAction action, string actionComments, string actorId)
{
    // Retrieve current approval chain
    var approvalChain = await _storageProvider.GetApprovalChainAsync(requestId);
    
    // Find the specific step
    var step = approvalChain.Steps.FirstOrDefault(s => s.StepId == stepId);
    if (step == null) throw new ArgumentException("Invalid approval step ID");
    
    // Verify the actor is authorized to act on this step
    await VerifyApproverAuthorization(step, actorId);
    
    // Process the action
    switch (action)
    {
        case ApprovalAction.Approve:
            step.Status = ApprovalStepStatus.Approved;
            step.CompletedAt = DateTime.UtcNow;
            step.CompletedBy = actorId;
            step.Comments = actionComments;
            
            // Check if this completes the chain
            await AdvanceApprovalChain(approvalChain);
            break;
            
        case ApprovalAction.Reject:
            step.Status = ApprovalStepStatus.Rejected;
            step.CompletedAt = DateTime.UtcNow;
            step.CompletedBy = actorId;
            step.Comments = actionComments;
            
            // Reject the entire chain
            approvalChain.Status = ApprovalStatus.Rejected;
            approvalChain.CompletedAt = DateTime.UtcNow;
            
            // Notify the requester
            await NotifyRequesterOfRejection(approvalChain, step);
            break;
            
        // Additional cases for other actions...
    }
    
    // Persist updated chain
    await _storageProvider.SaveApprovalChainAsync(approvalChain);
    
    // Record audit entry
    await _auditService.RecordApprovalAction(requestId, stepId, action, actorId, actionComments);
}
```

### 5. Auto-Escalation

If an approver doesn't respond within the configured time period:

1. Reminder notifications are sent at defined intervals
2. After the final reminder, the approval is automatically escalated based on:
   - Organizational hierarchy
   - Designated escalation contacts
   - Fallback rules

```csharp
// Example escalation logic
public async Task CheckForEscalations()
{
    // Retrieve all pending approval steps that have exceeded their due time
    var overdueSteps = await _storageProvider.GetOverdueApprovalStepsAsync();
    
    foreach (var step in overdueSteps)
    {
        var approvalChain = await _storageProvider.GetApprovalChainAsync(step.RequestId);
        
        // Check if reminders have been exhausted
        if (step.RemindersSent >= _configuration.MaxRemindersBeforeEscalation)
        {
            // Time to escalate
            await EscalateApprovalStep(approvalChain, step);
        }
        else
        {
            // Send another reminder
            await SendApprovalReminder(approvalChain, step);
            step.RemindersSent++;
            await _storageProvider.UpdateApprovalStepAsync(step);
        }
    }
}
```

### 6. Request Completion

Once all required approvals are received:

1. The request status is updated to "Approved"
2. The requester is notified of the approval
3. The request is forwarded to the IT team for fulfillment
4. A record is created in the connected ITSM system
5. The complete approval chain is stored for audit purposes

## Approval Policies

### Policy Definition

Approval policies are defined in a JSON configuration format that specifies:

1. Policy triggers (conditions that activate the policy)
2. Required approval levels
3. Time limits for each approval
4. Escalation paths

#### Example Policy Definition

```json
{
  "policyId": "high-cost-software-policy",
  "displayName": "High Cost Software Approval Policy",
  "description": "Approval process for software costing more than $1000",
  "triggers": {
    "costThreshold": 1000,
    "softwareCategories": ["any"]
  },
  "approvalLevels": [
    {
      "level": 1,
      "approverType": "DirectManager",
      "timeLimit": 24,
      "escalationPath": {
        "type": "HierarchyUp",
        "levels": 1
      }
    },
    {
      "level": 2,
      "approverType": "DepartmentHead",
      "timeLimit": 48,
      "escalationPath": {
        "type": "SpecificRole",
        "roleId": "IT_DIRECTOR"
      }
    },
    {
      "level": 3,
      "approverType": "Finance",
      "specificApprover": "finance-approvers@company.com",
      "timeLimit": 72,
      "escalationPath": {
        "type": "SpecificPerson",
        "userId": "cfo@company.com"
      }
    }
  ],
  "parallelApprovals": false,
  "requiredApprovalCount": 3,
  "autoApproveIfUnderCost": 100
}
```

### Policy Repository

The policy repository manages the collection of approval policies and handles:

- Policy retrieval based on request attributes
- Policy versioning and history
- Policy evaluation and matching
- Administrative interface for policy management

```csharp
// Example policy resolution logic
public async Task<ApprovalPolicy> ResolveApprovalPolicy(SoftwareRequest request)
{
    // Retrieve all active policies
    var policies = await _policyRepository.GetActivePoliciesAsync();
    
    // Find matching policies based on request attributes
    var matchingPolicies = policies.Where(p => 
        (p.Triggers.CostThreshold == null || request.EstimatedCost >= p.Triggers.CostThreshold) &&
        (p.Triggers.SoftwareCategories.Contains("any") || p.Triggers.SoftwareCategories.Contains(request.SoftwareCategory))
    ).ToList();
    
    // Select the most specific policy (priority order)
    if (matchingPolicies.Count == 0)
    {
        return await _policyRepository.GetDefaultPolicyAsync();
    }
    
    return matchingPolicies.OrderByDescending(p => p.Specificity).First();
}
```

## Adaptive Card Templates

The approval flow uses adaptive cards within Microsoft Teams for interactive approval experiences.

### Approval Request Card

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Software Installation Approval Required"
    },
    {
      "type": "TextBlock",
      "text": "Request #${requestId}",
      "isSubtle": true,
      "spacing": "None"
    },
    {
      "type": "ColumnSet",
      "columns": [
        {
          "type": "Column",
          "width": "auto",
          "items": [
            {
              "type": "Image",
              "url": "${requesterPhoto}",
              "size": "Small",
              "style": "Person"
            }
          ]
        },
        {
          "type": "Column",
          "width": "stretch",
          "items": [
            {
              "type": "TextBlock",
              "text": "${requesterName} has requested software installation",
              "wrap": true
            },
            {
              "type": "TextBlock",
              "spacing": "None",
              "text": "Department: ${requesterDepartment}",
              "isSubtle": true,
              "wrap": true
            }
          ]
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Software:",
          "value": "${softwareName}"
        },
        {
          "title": "Version:",
          "value": "${softwareVersion}"
        },
        {
          "title": "Estimated Cost:",
          "value": "${estimatedCost}"
        },
        {
          "title": "Category:",
          "value": "${softwareCategory}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Business Justification:",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "${businessJustification}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your approval is required as: ${approverRole}",
      "weight": "Bolder",
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Please respond by: ${dueDate}",
      "isSubtle": true
    },
    {
      "type": "Input.Text",
      "id": "comments",
      "placeholder": "Add comments (optional)",
      "isMultiline": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Approve",
      "style": "positive",
      "data": {
        "action": "approve",
        "requestId": "${requestId}",
        "stepId": "${stepId}"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Reject",
      "style": "destructive",
      "data": {
        "action": "reject",
        "requestId": "${requestId}",
        "stepId": "${stepId}"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Request More Info",
      "data": {
        "action": "moreInfo",
        "requestId": "${requestId}",
        "stepId": "${stepId}"
      }
    },
    {
      "type": "Action.ShowCard",
      "title": "Delegate",
      "card": {
        "type": "AdaptiveCard",
        "body": [
          {
            "type": "Input.ChoiceSet",
            "id": "delegateTo",
            "label": "Delegate approval to:",
            "choices": ${delegateOptions}
          }
        ],
        "actions": [
          {
            "type": "Action.Submit",
            "title": "Confirm Delegation",
            "data": {
              "action": "delegate",
              "requestId": "${requestId}",
              "stepId": "${stepId}"
            }
          }
        ]
      }
    }
  ]
}
```

### Approval Status Card

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Software Request Status Update"
    },
    {
      "type": "TextBlock",
      "text": "Request #${requestId}",
      "isSubtle": true,
      "spacing": "None"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Software:",
          "value": "${softwareName} ${softwareVersion}"
        },
        {
          "title": "Current Status:",
          "value": "${currentStatus}"
        },
        {
          "title": "Updated:",
          "value": "${lastUpdateTime}"
        }
      ]
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Approval Progress",
          "weight": "Bolder"
        },
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "ColumnSet",
                  "columns": ${approvalStepsColumns}
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "View Details",
      "data": {
        "action": "viewDetails",
        "requestId": "${requestId}"
      }
    }
  ]
}
```

## Integration with External Approval Systems

The multi-step approval flow can integrate with external approval systems to leverage existing corporate governance structures.

### Integration Options

1. **Microsoft Approvals API**: Seamless integration with other Microsoft 365 approval processes
2. **ServiceNow Approvals**: Connect with ServiceNow approval workflows
3. **Custom REST API Integration**: Connect to proprietary approval systems

### Microsoft Approvals API Integration

```csharp
// Example of creating an approval in Microsoft Approvals
public async Task<string> CreateMicrosoftApproval(ApprovalChain approvalChain, SoftwareRequest request)
{
    var client = _httpClientFactory.CreateClient("MSApprovalsClient");
    
    // Set authentication headers
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await _tokenProvider.GetTokenAsync());
    
    // Create the approval request
    var approvalRequest = new
    {
        title = $"Software Request: {request.SoftwareName}",
        requestorId = request.RequesterId,
        details = new
        {
            requestId = request.RequestId,
            softwareName = request.SoftwareName,
            version = request.SoftwareVersion,
            justification = request.BusinessJustification,
            cost = request.EstimatedCost
        },
        approvers = approvalChain.Steps.Select(s => new
        {
            id = s.ApproverId,
            order = s.Level
        }).ToArray()
    };
    
    // Send the request
    var response = await client.PostAsJsonAsync("api/v1/approvals", approvalRequest);
    response.EnsureSuccessStatusCode();
    
    // Parse the response to get the external approval ID
    var result = await response.Content.ReadFromJsonAsync<ApprovalCreationResponse>();
    
    return result.approvalId;
}
```

### Webhook Listener for External Approval Updates

```csharp
[HttpPost("api/approvals/callback")]
public async Task<IActionResult> HandleExternalApprovalUpdate([FromBody] ExternalApprovalUpdate update)
{
    // Validate the callback signature
    if (!_securityService.ValidateWebhookSignature(Request.Headers["X-Signature"], update))
    {
        return Unauthorized();
    }
    
    // Find the corresponding approval chain
    var approvalChain = await _storageProvider.GetApprovalChainByExternalIdAsync(update.ExternalApprovalId);
    if (approvalChain == null)
    {
        return NotFound();
    }
    
    // Update the approval step
    var step = approvalChain.Steps.FirstOrDefault(s => s.ApproverId == update.ApproverId);
    if (step != null)
    {
        step.Status = MapExternalStatus(update.Status);
        step.CompletedAt = update.CompletedAt ?? DateTime.UtcNow;
        step.Comments = update.Comments;
        
        await _storageProvider.SaveApprovalChainAsync(approvalChain);
        
        // Process any next steps
        await _approvalManager.ProcessApprovalUpdate(approvalChain, step);
    }
    
    return Ok();
}
```

## Approval Chain Data Model

The approval chain is represented by the following data model:

```csharp
public class ApprovalChain
{
    public string ChainId { get; set; } = Guid.NewGuid().ToString();
    public string RequestId { get; set; }
    public ApprovalStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string ExternalApprovalId { get; set; }
    public List<ApprovalStep> Steps { get; set; } = new List<ApprovalStep>();
    public Dictionary<string, string> Metadata { get; set; } = new Dictionary<string, string>();
}

public class ApprovalStep
{
    public string StepId { get; set; }
    public int Level { get; set; }
    public string ApproverType { get; set; }
    public string ApproverId { get; set; }
    public string ApproverName { get; set; }
    public string ApproverEmail { get; set; }
    public ApprovalStepStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime DueBy { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string CompletedBy { get; set; }
    public string Comments { get; set; }
    public int RemindersSent { get; set; }
    public bool WasEscalated { get; set; }
    public string OriginalApproverId { get; set; }
}

public enum ApprovalStatus
{
    Pending,
    InProgress,
    Approved,
    Rejected,
    Canceled,
    MoreInfoRequired
}

public enum ApprovalStepStatus
{
    Pending,
    InProgress,
    Approved,
    Rejected,
    Skipped,
    Delegated,
    Escalated
}
```

## Audit Trail

The approval system maintains a comprehensive audit trail of all actions:

### Audit Events Captured

- Approval chain creation
- Approval/rejection decisions
- Delegation actions
- Escalations (both manual and automatic)
- Comments and feedback
- Status changes
- Stakeholder notifications

### Audit Record Format

```json
{
  "eventId": "evt_12345",
  "requestId": "req_67890",
  "stepId": "step_24680",
  "eventType": "APPROVAL_DECISION",
  "actorId": "user@company.com",
  "actorName": "Jane Smith",
  "actorIpAddress": "10.20.30.40",
  "timestamp": "2025-01-15T14:30:45Z",
  "details": {
    "decision": "APPROVED",
    "comments": "Software meets security requirements.",
    "previousStatus": "PENDING",
    "newStatus": "APPROVED"
  }
}
```

### Audit Reporting

The system provides audit reports accessible to:

- IT administrators
- Compliance officers
- Security teams
- Request stakeholders (limited view)

## Advanced Customization

### Conditional Approval Rules

The system supports conditional approval rules based on:

- Cost thresholds
- Department-specific requirements
- Software categories (security implications)
- User roles and access levels

Example conditional logic:

```csharp
public async Task<bool> ShouldAutoApprove(SoftwareRequest request, ApprovalStep step)
{
    // Auto-approve for standard software under cost threshold
    if (request.SoftwareCategory == "Standard" && 
        request.EstimatedCost < _configuration.AutoApprovalThreshold &&
        step.ApproverType == "ITManager")
    {
        return true;
    }
    
    // Auto-approve renewals of existing licenses
    if (request.IsRenewal && 
        await _licenseRepository.HasExistingLicense(request.RequesterId, request.SoftwareName))
    {
        return true;
    }
    
    // Additional conditional logic...
    
    return false;
}
```

### Custom Approval Stages

Organizations can define custom approval stages beyond the standard hierarchy:

- Security review stage for sensitive software
- License compliance review
- Architecture review board approval
- Vendor management approval
- Budgetary approval

### Delegation Rules

Configurable delegation rules allow:

- Preauthorized delegates for specific approvers
- Time-bound delegation (vacation coverage)
- Role-based delegation
- Delegation restrictions for sensitive requests

## Performance Considerations

The multi-step approval system is designed for scale with these optimizations:

### Database Considerations

- Indexing on frequently queried fields (RequestId, ApproverId, Status)
- Denormalized approval status for quick retrieval
- Archive strategy for completed approval chains

### Caching Strategy

- Cache active approval chains
- Cache approver hierarchies and organizational structure
- Use distributed cache for multi-instance deployments

### Asynchronous Processing

- Background processing for notifications
- Batch processing for escalation checks
- Webhook retry mechanism with exponential backoff

## Security Measures

### Data Protection

- Encryption of approval data at rest
- Secure transmission of approval notifications
- Role-based access control for approval chain data
- Audit trail of all approval actions

### Authorization Checks

- Verification that approvers have correct permissions
- Validation of delegation authority
- Authentication of webhook callbacks
- Prevention of approval spoofing through digital signatures

## Monitoring and Telemetry

The system provides comprehensive monitoring capabilities:

### Key Metrics

- Average approval time per stage
- Escalation frequency
- Rejection rates by department/software type
- SLA compliance for approval timelines
- Active vs. completed approval chains

### Alert Conditions

- Stalled approval chains
- High-priority requests pending approval
- Unusual rejection patterns
- System performance degradation
- Integration failures with external systems

## Troubleshooting Guide

### Common Issues and Resolutions

| Issue | Possible Causes | Resolution Steps |
|-------|----------------|------------------|
| Approver not receiving notifications | 1. Teams notification settings<br>2. Incorrect approver mapping<br>3. Permissions issue | 1. Verify Teams notification settings<br>2. Check approver mapping in AD/policy<br>3. Verify approver has proper Teams permissions |
| Approval chain stuck in pending state | 1. Missing configuration<br>2. Failed escalation<br>3. Database inconsistency | 1. Check approval policy configuration<br>2. Verify escalation paths<br>3. Run database consistency check |
| Duplicate notifications | 1. Retry logic issue<br>2. Multiple event triggers<br>3. Webhook duplication | 1. Check notification service logs<br>2. Review event handling<br>3. Implement idempotent processing |
| Incorrect approval routing | 1. Outdated organizational data<br>2. Policy configuration error<br>3. Custom rules conflict | 1. Sync organizational data<br>2. Review policy definitions<br>3. Check for rule precedence issues |

### Diagnostic Procedures

1. **Approval Chain Tracing**:
   ```powershell
   # Retrieve approval chain details
   Get-ApprovalChain -RequestId "req_12345" -IncludeHistory
   ```

2. **Policy Evaluation Debugging**:
   ```powershell
   # Test policy resolution for a request
   Test-ApprovalPolicy -SoftwareCategory "Development" -Cost 1500 -Department "Engineering" -Verbose
   ```

3. **Notification Delivery Verification**:
   ```powershell
   # Verify notification delivery status
   Get-NotificationStatus -RequestId "req_12345" -Verbose
   ```

## Best Practices

### Implementation Recommendations

1. **Start Simple**: Begin with a basic approval flow before enabling complex conditional logic
2. **Pilot Testing**: Test with a small group of users before full deployment
3. **Stakeholder Training**: Ensure approvers understand their role and action requirements
4. **Regular Policy Review**: Review and update approval policies periodically
5. **Monitor Performance**: Track approval times and identify bottlenecks

### Scalability Considerations

1. Implement database sharding for large deployments
2. Use queue-based processing for notifications
3. Consider regional deployments for global organizations
4. Implement caching for frequently accessed data
5. Use event-driven architecture for real-time updates

## Conclusion

The multi-step approval flow provides a robust, flexible framework for managing software installation approvals within organizations. By leveraging configurable policies, integration with external systems, and comprehensive auditing, organizations can maintain proper governance while streamlining the approval process.