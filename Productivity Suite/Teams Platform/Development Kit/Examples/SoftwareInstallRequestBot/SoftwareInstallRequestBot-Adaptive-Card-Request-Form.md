# Software Installation Request Bot - Adaptive Card Request Form

## Overview

This document provides comprehensive information about the Adaptive Card Request Form used by the Software Installation Request Bot in Microsoft Teams. The form enables users to submit software installation requests through an intuitive interface that streamlines the approval process and integrates with existing IT management systems.

## Table of Contents

1. [Introduction](#introduction)
2. [Adaptive Card Architecture](#adaptive-card-architecture)
3. [Form Components](#form-components)
4. [Data Schema](#data-schema)
5. [Implementation Guide](#implementation-guide)
6. [Validation Logic](#validation-logic)
7. [Accessibility Considerations](#accessibility-considerations)
8. [Integration Points](#integration-points)
9. [Customization Options](#customization-options)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Examples](#examples)

## Introduction

The Software Installation Request Bot (SIRB) uses Adaptive Cards as the primary user interface for collecting software installation requests from end users. This form-based approach provides several advantages:

- **Consistent Experience**: Ensures all requests contain the required information
- **Cross-Platform Compatibility**: Works across Teams desktop, web, and mobile clients
- **Reduced Training Overhead**: Intuitive design requires minimal user training
- **Workflow Integration**: Seamlessly connects with approval processes and IT systems
- **Customizability**: Easily adaptable to organization-specific requirements

The Adaptive Card Request Form serves as the entry point for the software installation workflow, collecting critical information that will be processed by IT administrators and potentially automated installation systems.

## Adaptive Card Architecture

### Card Structure

The Software Installation Request Form is built using the Adaptive Cards framework, which follows a JSON-based schema. The card consists of:

```json
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    // Container elements
    // Input elements
    // Action elements
  ],
  "actions": [
    // Primary actions (Submit, Cancel)
  ]
}
```

### Responsive Design

The card employs responsive design principles that allow it to render appropriately across different screen sizes and orientations:

- **ColumnSets**: For multi-column layouts that adjust on mobile
- **Containers**: For logical grouping of related inputs
- **ActionSets**: For contextual button placement
- **Spacing Properties**: For consistent visual hierarchy

### Card Versioning

The form uses Adaptive Cards version 1.3, which provides support for:
- Input validation
- Action show/hide
- Required fields
- Enhanced styling options

## Form Components

### Header Section

The header provides context and instructions for the request form:

```json
{
  "type": "Container",
  "items": [
    {
      "type": "TextBlock",
      "text": "Software Installation Request",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Please provide the following information to request software installation.",
      "wrap": true
    }
  ]
}
```

### User Information Section

This section captures information about the requesting user:

- **Display Name**: Auto-populated from Teams user profile
- **Email**: Auto-populated from Teams user profile
- **Department**: Drop-down selection (can be pre-populated via Graph API)
- **Manager**: Auto-populated via Graph API

### Software Request Details

Core fields for the software request:

1. **Software Name**: Text input with autocomplete suggestions from approved software catalog
2. **Version**: Text input with validation
3. **Urgency Level**: Choice set (Low, Medium, High, Critical)
4. **Justification**: Multi-line text input with minimum character requirement
5. **Business Impact**: Multi-line text input explaining the benefit to business operations
6. **Platform**: Choice set (Windows, macOS, Linux, iOS, Android, Web)

### Advanced Options

Expanded options that appear based on previous selections:

1. **License Type**: Choice set (Single User, Department-wide, Enterprise)
2. **Cost Center**: Text input with validation
3. **Alternative Solutions**: Text input for possible alternatives
4. **Required Installation Date**: Date picker with validation
5. **Special Requirements**: Toggle + text area for additional requirements

### Supporting Files

Attachment capabilities for supporting documentation:

```json
{
  "type": "Container",
  "items": [
    {
      "type": "TextBlock", 
      "text": "Supporting Documentation (Optional)",
      "weight": "Bolder"
    },
    {
      "type": "Input.Text",
      "id": "supportingDocumentation",
      "placeholder": "Enter URL to supporting documentation"
    }
  ]
}
```

### Action Buttons

Primary actions available to the user:

```json
"actions": [
  {
    "type": "Action.Submit",
    "title": "Submit Request",
    "data": {
      "actionType": "submit"
    }
  },
  {
    "type": "Action.Submit", 
    "title": "Save Draft",
    "data": {
      "actionType": "saveDraft"
    }
  },
  {
    "type": "Action.Submit",
    "title": "Cancel",
    "data": {
      "actionType": "cancel"
    }
  }
]
```

## Data Schema

### Request Object Model

When submitted, the form data is structured as follows:

```json
{
  "requester": {
    "name": "string",
    "email": "string",
    "department": "string",
    "manager": "string"
  },
  "software": {
    "name": "string",
    "version": "string",
    "platform": "string"
  },
  "request": {
    "urgency": "string",
    "justification": "string",
    "businessImpact": "string",
    "licenseType": "string",
    "costCenter": "string",
    "alternativeSolutions": "string",
    "requiredDate": "date",
    "specialRequirements": "string"
  },
  "supporting": {
    "documentationUrl": "string"
  },
  "metadata": {
    "requestId": "guid",
    "timestamp": "datetime",
    "clientInfo": {
      "platform": "string",
      "version": "string"
    }
  }
}
```

### Data Validation

The form implements the following validation rules:

| Field | Validation Rule |
|-------|----------------|
| Software Name | Required, Min length: 2 |
| Version | Required, Format check |
| Urgency | Required |
| Justification | Required, Min length: 50 |
| Business Impact | Required, Min length: 50 |
| Platform | Required |
| Cost Center | Conditional required if License Type is not "Single User" |
| Required Date | Must be future date, not more than 90 days ahead |

## Implementation Guide

### Bot Framework Integration

The Adaptive Card form is delivered through the Bot Framework with these components:

1. **Message Extension**: Launches the form from command bar
2. **Task Module**: Displays the form in a modal dialog
3. **Bot Activity Handler**: Processes form submissions

### Sample Implementation

```javascript
// Creating and sending the Adaptive Card as a response
async function createSoftwareRequestCard(context) {
  // Load the adaptive card template
  const cardTemplate = require('./adaptiveCards/softwareRequestForm.json');
  
  // Fill user information from context
  cardTemplate.body[0].items[1].value = context.activity.from.name;
  cardTemplate.body[0].items[3].value = await getUserEmail(context);
  
  // Create attachment
  const cardAttachment = CardFactory.adaptiveCard(cardTemplate);
  
  // Return as a response
  await context.sendActivity({ attachments: [cardAttachment] });
}

// Processing submission
async function handleAdaptiveCardSubmit(context) {
  const data = context.activity.value;
  
  if (data.actionType === "submit") {
    // Process the submission
    const requestId = await createSoftwareRequest(data);
    
    // Send confirmation
    await sendConfirmationCard(context, requestId);
    
    // Notify IT department
    await notifyITDepartment(context, data, requestId);
  } else if (data.actionType === "saveDraft") {
    // Save draft logic
    await saveDraftRequest(context, data);
  }
}
```

### Deployment Process

To deploy the Software Installation Request Bot with this form:

1. Register a bot in the Azure portal
2. Configure Microsoft Teams app manifest
3. Set up necessary permissions for Graph API integration
4. Deploy the bot to Azure App Service
5. Install the app to Microsoft Teams

## Validation Logic

### Client-Side Validation

Adaptive Card validations are implemented using the following techniques:

```json
{
  "type": "Input.Text",
  "id": "softwareName",
  "label": "Software Name",
  "isRequired": true,
  "errorMessage": "Software name is required",
  "regex": "^.{2,}$",
  "validation": {
    "necessity": "Required",
    "errorMessage": "Please enter a valid software name (minimum 2 characters)"
  }
}
```

### Server-Side Validation

Additional validation performed before processing the request:

1. **Software Catalog Check**: Verifies if requested software exists in the approved catalog
2. **License Availability**: Checks for existing licenses before processing new requests
3. **Budget Validation**: Verifies cost center has available budget
4. **Security Scan**: Automated check against security compliance database
5. **Duplicate Request Check**: Prevents redundant requests for the same software

## Accessibility Considerations

The Adaptive Card form follows accessibility best practices:

- **Proper Labels**: All input fields have associated labels
- **Tab Order**: Logical tab sequence for keyboard navigation
- **Error Messages**: Clear, descriptive error feedback
- **Color Contrast**: Meets WCAG 2.1 AA standards
- **Screen Reader Support**: Compatible with screen readers via appropriate ARIA attributes

### ARIA Attributes

```json
{
  "type": "Input.Text",
  "id": "justification",
  "label": "Justification",
  "placeholder": "Explain why this software is needed",
  "isMultiline": true,
  "isRequired": true,
  "errorMessage": "Justification is required (minimum 50 characters)",
  "aria-describedby": "justification-help",
  "aria-required": "true"
}
```

## Integration Points

### Microsoft Graph API

The form leverages Graph API for enhanced functionality:

- **User Profile Data**: Auto-populates user information
- **Organizational Structure**: Retrieves manager information
- **Department Information**: Populates department drop-down
- **Calendar Integration**: Checks for installation scheduling conflicts

### Service Management Systems

Integration capabilities with popular IT service management platforms:

- **ServiceNow**: Direct API integration for ticket creation
- **JIRA Service Desk**: Webhook support for request creation
- **Microsoft Endpoint Configuration Manager**: For automated deployment
- **Azure DevOps**: For tracking implementation tasks

### Directory Services

Integration with identity providers:

- **Azure Active Directory**: For user validation and group membership checks
- **Okta**: Alternative identity provider integration
- **Other LDAP-compatible services**: Through custom connectors

## Customization Options

### Organization-Specific Fields

The form can be extended with custom fields:

```json
{
  "type": "Container",
  "id": "customFieldsContainer",
  "items": [
    {
      "type": "TextBlock",
      "text": "Organization-Specific Information",
      "weight": "Bolder"
    },
    {
      "type": "Input.Text",
      "id": "customField1",
      "label": "Project Code"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "customField2",
      "label": "Business Unit",
      "choices": []
    }
  ]
}
```

### Theming

Style customization options:

- **Corporate Branding**: Colors and logos
- **Custom CSS**: For enhanced visual styling
- **Light/Dark Mode**: Support for Teams theme changes
- **Localization**: Multi-language support

### Workflow Customization

Configurable workflow options:

- **Approval Levels**: Single or multi-tier approval process
- **Notification Templates**: Customizable email templates
- **Escalation Rules**: Time-based escalation paths
- **Custom Actions**: Additional action buttons based on organizational needs

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Form doesn't load | Bot service unavailable | Check Azure service health |
| Field validation fails | Incorrect input format | Review validation error messages |
| Form submission error | Network connectivity issue | Retry or save draft |
| Missing user information | Graph API permission issue | Check app permissions |
| Attachment upload fails | File size limitation | Reduce file size or use URL |

### Debugging Tools

- **Bot Framework Emulator**: For local testing
- **Teams Developer Portal**: For app validation
- **Application Insights**: For telemetry and error logging
- **Adaptive Card Designer**: For visual troubleshooting

### Error Handling

Example of handling submission errors:

```javascript
try {
  const result = await submitRequest(formData);
  await context.sendActivity("Your request has been submitted successfully.");
  return result;
} catch (error) {
  // Log the error
  telemetry.trackException(error);
  
  // Determine error type
  if (error.name === "ValidationError") {
    await context.sendActivity("There was a problem with your submission. Please check your inputs.");
  } else if (error.name === "ServiceError") {
    await context.sendActivity("We're experiencing technical difficulties. Your request has been saved as a draft.");
    await saveDraft(formData);
  } else {
    await context.sendActivity("An unexpected error occurred. Please try again later.");
  }
}
```

## Best Practices

### Design Guidelines

- Keep the form concise and focused
- Group related fields logically
- Provide clear instructions for complex fields
- Use progressive disclosure for advanced options
- Maintain consistent validation feedback

### Performance Optimization

- Minimize network calls during form rendering
- Cache reference data (departments, platforms, etc.)
- Optimize image sizes for company branding
- Use lightweight validation techniques
- Implement request throttling for high-volume scenarios

### Security Considerations

- Implement proper authentication and authorization
- Validate all input server-side
- Sanitize data to prevent injection attacks
- Use encrypted communication channels
- Implement rate limiting to prevent abuse

## Examples

### Basic Request Form

A minimal implementation of the Software Installation Request form:

```json
{
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "Software Installation Request",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "Input.Text",
      "id": "softwareName",
      "label": "Software Name",
      "isRequired": true
    },
    {
      "type": "Input.Text",
      "id": "version",
      "label": "Version",
      "isRequired": true
    },
    {
      "type": "Input.ChoiceSet",
      "id": "platform",
      "label": "Platform",
      "isRequired": true,
      "choices": [
        { "title": "Windows", "value": "windows" },
        { "title": "macOS", "value": "macos" },
        { "title": "Linux", "value": "linux" },
        { "title": "Web", "value": "web" }
      ]
    },
    {
      "type": "Input.Text",
      "id": "justification",
      "label": "Justification",
      "isMultiline": true,
      "isRequired": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Submit",
      "data": { "actionType": "submit" }
    }
  ]
}
```

### Advanced Request Form

A more comprehensive implementation with conditional fields:

```json
{
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    // User information section
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "User Information",
          "weight": "Bolder"
        },
        {
          "type": "Input.Text",
          "id": "userName",
          "label": "Name",
          "value": "${userName}",
          "isReadOnly": true
        },
        {
          "type": "Input.Text",
          "id": "userEmail",
          "label": "Email",
          "value": "${userEmail}",
          "isReadOnly": true
        }
      ]
    },
    // Software details section
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Software Details",
          "weight": "Bolder"
        },
        {
          "type": "Input.Text",
          "id": "softwareName",
          "label": "Software Name",
          "isRequired": true
        },
        {
          "type": "Input.Text",
          "id": "version",
          "label": "Version",
          "isRequired": true
        },
        {
          "type": "Input.ChoiceSet",
          "id": "platform",
          "label": "Platform",
          "isRequired": true,
          "choices": [
            { "title": "Windows", "value": "windows" },
            { "title": "macOS", "value": "macos" },
            { "title": "Linux", "value": "linux" },
            { "title": "iOS", "value": "ios" },
            { "title": "Android", "value": "android" },
            { "title": "Web", "value": "web" }
          ]
        }
      ]
    },
    // Request details section
    {
      "type": "Container",
      "items": [
        {
          "type": "TextBlock",
          "text": "Request Details",
          "weight": "Bolder"
        },
        {
          "type": "Input.ChoiceSet",
          "id": "urgency",
          "label": "Urgency",
          "isRequired": true,
          "choices": [
            { "title": "Low", "value": "low" },
            { "title": "Medium", "value": "medium" },
            { "title": "High", "value": "high" },
            { "title": "Critical", "value": "critical" }
          ]
        },
        {
          "type": "Input.Text",
          "id": "justification",
          "label": "Justification",
          "isMultiline": true,
          "isRequired": true,
          "placeholder": "Explain why this software is needed (min. 50 characters)"
        },
        {
          "type": "Input.Text",
          "id": "businessImpact",
          "label": "Business Impact",
          "isMultiline": true,
          "isRequired": true,
          "placeholder": "Explain the benefit to business operations (min. 50 characters)"
        },
        {
          "type": "Input.Date",
          "id": "requiredDate",
          "label": "Required By Date"
        }
      ]
    },
    // Conditional section for high/critical urgency
    {
      "type": "Container",
      "id": "criticalContainer",
      "isVisible": false,
      "items": [
        {
          "type": "TextBlock",
          "text": "Critical Request Information",
          "weight": "Bolder"
        },
        {
          "type": "Input.Text",
          "id": "criticalJustification",
          "label": "Critical Justification",
          "isMultiline": true,
          "isRequired": true,
          "placeholder": "Please explain why this request is critical"
        },
        {
          "type": "Input.Text",
          "id": "managerApproval",
          "label": "Manager Name",
          "isRequired": true
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Submit Request",
      "data": { "actionType": "submit" }
    },
    {
      "type": "Action.Submit",
      "title": "Save Draft",
      "data": { "actionType": "saveDraft" }
    }
  ]
}
```

### Request Status Card

After submission, users receive a status card:

```json
{
  "type": "AdaptiveCard",
  "version": "1.3",
  "body": [
    {
      "type": "TextBlock",
      "text": "Software Installation Request - Status",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Request ID:",
          "value": "${requestId}"
        },
        {
          "title": "Software:",
          "value": "${softwareName} ${version}"
        },
        {
          "title": "Status:",
          "value": "${status}"
        },
        {
          "title": "Submitted:",
          "value": "${submissionDate}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Current Status: ${statusDescription}",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View Details",
      "url": "${detailsUrl}"
    }
  ]
}
```

---

This documentation provides a comprehensive guide to the Software Installation Request Bot's Adaptive Card Request Form. By implementing this form according to the specifications provided, organizations can create a streamlined, user-friendly process for software installation requests that integrates with existing IT management systems while maintaining proper governance and approval workflows.
