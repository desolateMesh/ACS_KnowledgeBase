# Password Reset Bot: Adaptive Card UI Implementation Guide

## Table of Contents
- [Introduction](#introduction)
- [Adaptive Cards Overview](#adaptive-cards-overview)
- [Card Design Principles](#card-design-principles)
- [Core UI Components](#core-ui-components)
- [Implementation Flow](#implementation-flow)
- [Card Schemas](#card-schemas)
- [Localization Support](#localization-support)
- [Accessibility Considerations](#accessibility-considerations)
- [Error Handling and User Feedback](#error-handling-and-user-feedback)
- [Responsive Design](#responsive-design)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)
- [Testing Strategy](#testing-strategy)
- [Integration with Teams](#integration-with-teams)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [References](#references)

## Introduction

The Password Reset Bot Adaptive Card UI module provides a seamless, user-friendly interface for self-service password reset functionality within Microsoft Teams. This document offers comprehensive technical details on implementing the Adaptive Card UI for the Password Reset Bot, enabling an autonomous agent to understand, modify, extend, and troubleshoot the implementation.

The Adaptive Card interface is the primary interaction point between users and the bot's functionality, allowing users to securely reset their passwords without leaving the Teams environment. This design eliminates the need to navigate to external portals, enhancing user productivity and reducing support desk tickets.

## Adaptive Cards Overview

### What Are Adaptive Cards?

Adaptive Cards are platform-agnostic card-based UI snippets that can be rendered in different applications while maintaining native look and feel. In our context, they provide a rich, interactive experience within Microsoft Teams.

### Key Components

Adaptive Cards consist of:
- **Card Schema**: JSON structure defining the card's content and elements
- **Card Template**: Layout pattern for organizing content
- **Card Actions**: Interactive elements that trigger events
- **Data Binding**: Dynamic content population based on user context

### Version Compatibility

The Password Reset Bot utilizes Adaptive Cards schema version 1.5, which provides necessary capabilities for secure password reset workflows while maintaining broad platform compatibility. The implementation is designed to gracefully degrade functionality on clients supporting only older schema versions (1.3+).

## Card Design Principles

The Password Reset Bot's Adaptive Cards follow these design principles:

1. **Progressive Disclosure**: Information presented in logical steps, revealing complexity only when necessary
2. **Guided Experience**: Clear instructions and sequential workflow guiding users through the reset process
3. **Error Prevention**: Proactive validation to prevent errors before submission
4. **Visual Hierarchy**: Important actions and information visually distinguished
5. **Consistent Branding**: Organization-specific theming capabilities
6. **Minimal User Input**: Only essential information requested from users
7. **Context Awareness**: Adapting display based on user permissions and status

## Core UI Components

### Initial Request Card

The entry point card contains:
- Welcome message with clear purpose statement
- Brief explanation of the password reset process
- User identity confirmation (display name and email)
- Primary action button to initiate process
- Secondary action to cancel
- Help/FAQ link

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Password Reset Assistant",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Welcome to the self-service password reset tool. This secure process will allow you to reset your password without contacting IT support.",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "User:",
          "value": "${userName}"
        },
        {
          "title": "Email:",
          "value": "${userEmail}"
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Ready to reset your password?",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Start Reset Process",
      "data": {
        "action": "initiate_reset"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Cancel",
      "data": {
        "action": "cancel"
      }
    }
  ]
}
```

### Verification Method Selection Card

After initiation, users select their preferred verification method:
- Clear title and instructions
- Multiple verification options (based on configured methods)
- Option icons for visual recognition
- Brief explanation of each method

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Select Verification Method",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "To verify your identity, please choose one of the following methods:",
      "wrap": true
    },
    {
      "type": "Container",
      "items": [
        {
          "type": "Input.ChoiceSet",
          "id": "verificationMethod",
          "style": "expanded",
          "value": "email",
          "choices": [
            {
              "title": "📱 Text message to registered phone (ending in ${phoneLastFour})",
              "value": "sms"
            },
            {
              "title": "📧 Email to registered address (${userEmail})",
              "value": "email"
            },
            {
              "title": "📲 Microsoft Authenticator app",
              "value": "authenticator"
            }
          ]
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Continue",
      "data": {
        "action": "select_verification"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Back",
      "data": {
        "action": "back_to_start"
      }
    }
  ]
}
```

### OTP Verification Card

For OTP-based verification:
- Clear instructions on where the code was sent
- Emphasis on time-limited nature of code
- Masked input field for code entry
- Error state handling
- Resend option with rate limiting

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Enter Verification Code",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "${codeDeliveryMessage}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "This code is valid for 10 minutes.",
      "wrap": true,
      "size": "Small",
      "isSubtle": true
    },
    {
      "type": "Input.Text",
      "id": "otpCode",
      "label": "Verification Code",
      "maxLength": 8,
      "placeholder": "Enter code",
      "style": "password",
      "validation": {
        "necessity": "required",
        "errorMessage": "Please enter the verification code"
      }
    },
    {
      "type": "TextBlock",
      "id": "errorMessage",
      "text": "${errorMessage}",
      "wrap": true,
      "color": "attention",
      "isVisible": false
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Verify",
      "data": {
        "action": "verify_otp"
      }
    },
    {
      "type": "Action.Submit",
      "title": "Resend Code",
      "data": {
        "action": "resend_otp"
      },
      "isEnabled": "${resendEnabled}"
    },
    {
      "type": "Action.Submit",
      "title": "Back",
      "data": {
        "action": "back_to_method"
      }
    }
  ]
}
```

### New Password Entry Card

For password creation:
- Password requirements clearly displayed
- Real-time password strength indicator
- Confirmation field with match validation
- Visual validation states for each requirement

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Create New Password",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your identity has been verified. Please create a new password.",
      "wrap": true
    },
    {
      "type": "Input.Text",
      "id": "newPassword",
      "label": "New Password",
      "style": "password",
      "isRequired": true
    },
    {
      "type": "Input.Text",
      "id": "confirmPassword",
      "label": "Confirm Password",
      "style": "password",
      "isRequired": true
    },
    {
      "type": "Container",
      "id": "requirementsContainer",
      "items": [
        {
          "type": "TextBlock",
          "text": "Password Requirements:",
          "wrap": true,
          "weight": "Bolder",
          "size": "Small"
        },
        {
          "type": "FactSet",
          "facts": [
            {
              "title": "${req1Status}",
              "value": "Minimum length: 12 characters"
            },
            {
              "title": "${req2Status}",
              "value": "At least 1 uppercase letter"
            },
            {
              "title": "${req3Status}",
              "value": "At least 1 lowercase letter"
            },
            {
              "title": "${req4Status}",
              "value": "At least 1 number"
            },
            {
              "title": "${req5Status}",
              "value": "At least 1 special character"
            },
            {
              "title": "${req6Status}",
              "value": "Not similar to previous passwords"
            },
            {
              "title": "${req7Status}",
              "value": "Passwords match"
            }
          ]
        }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Password Strength: ${strengthIndicator}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "id": "errorMessage",
      "text": "${errorMessage}",
      "wrap": true,
      "color": "attention",
      "isVisible": false
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Reset Password",
      "data": {
        "action": "reset_password"
      },
      "isEnabled": "${submitEnabled}"
    },
    {
      "type": "Action.Submit",
      "title": "Cancel",
      "data": {
        "action": "cancel"
      }
    }
  ]
}
```

### Success Confirmation Card

Upon successful reset:
- Clear success message
- Summary of action
- Next steps guidance
- Session timeout information

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Password Reset Successful",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "Your password has been successfully reset.",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "For security reasons, you may be prompted to sign in again on your devices with your new password.",
      "wrap": true
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Account:",
          "value": "${userEmail}"
        },
        {
          "title": "Reset Date:",
          "value": "${resetDate}"
        },
        {
          "title": "Reset Time:",
          "value": "${resetTime}"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Done",
      "data": {
        "action": "complete"
      }
    },
    {
      "type": "Action.OpenUrl",
      "title": "Sign in to Office.com",
      "url": "https://office.com"
    }
  ]
}
```

### Error Card

For handling errors:
- Clear error message
- Specific guidance on resolution
- Support options
- Retry functionality where appropriate

```json
{
  "type": "AdaptiveCard",
  "version": "1.5",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "Error Occurred",
      "wrap": true,
      "color": "attention"
    },
    {
      "type": "TextBlock",
      "text": "${errorMessage}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "${errorGuidance}",
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "If you continue to experience issues, please contact IT support.",
      "wrap": true,
      "size": "Small"
    },
    {
      "type": "FactSet",
      "facts": [
        {
          "title": "Error Code:",
          "value": "${errorCode}"
        },
        {
          "title": "Timestamp:",
          "value": "${errorTimestamp}"
        }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "${retryActionText}",
      "data": {
        "action": "${retryAction}"
      },
      "isEnabled": "${retryEnabled}"
    },
    {
      "type": "Action.Submit",
      "title": "Start Over",
      "data": {
        "action": "restart"
      }
    },
    {
      "type": "Action.OpenUrl",
      "title": "Contact Support",
      "url": "${supportUrl}"
    }
  ]
}
```

## Implementation Flow

The Adaptive Card UI flow follows these sequential steps:

1. **Initialization**
   - Bot proactively sends welcome card or responds to user query
   - User identity pre-populated when possible
   - Corporate branding applied through theme properties

2. **Verification Method Selection**
   - Available methods retrieved from Azure AD configuration
   - Methods filtered based on user registration status
   - Fallback to IT support when no methods available

3. **OTP Verification**
   - Dynamic generation of OTP using Microsoft Graph API
   - Delivery to selected verification channel
   - Input validation with error handling
   - Rate limiting for retries (3 attempts before lockout)

4. **Password Entry and Validation**
   - Real-time client-side validation via card refresh
   - Password complexity requirements checked against policy
   - Password history compliance verification
   - Match confirmation between fields

5. **Password Update**
   - Secure transmission using encrypted channel
   - Password update via Microsoft Graph API
   - Synchronization with on-premises AD when configured

6. **Completion and Feedback**
   - Success confirmation
   - Session cleanup and token invalidation
   - Optional feedback collection

## Card Schemas

### Data Model Integration

Each card template integrates with the bot's data model through the following key objects:

#### User Context Object
```typescript
interface UserContext {
  id: string;                      // Azure AD user ID
  displayName: string;             // User's display name
  userPrincipalName: string;       // UPN/email address
  verificationMethods: Method[];   // Available verification methods
  preferredLanguage: string;       // User's language preference
  phoneNumbers: PhoneNumber[];     // Registered phone numbers
  accessToken: string;             // Graph API access token
  passwordPolicies: Policy[];      // Applicable password policies
}
```

#### Verification Method Object
```typescript
interface Method {
  type: 'email' | 'sms' | 'call' | 'authenticator';
  isRegistered: boolean;           // If method is available
  maskedTarget: string;            // Partially masked destination
  lastUsed: Date | null;           // Last successful verification
}
```

#### Password Policy Object
```typescript
interface Policy {
  minLength: number;               // Minimum character count
  requireUppercase: boolean;       // Requires uppercase letters
  requireLowercase: boolean;       // Requires lowercase letters
  requireNumbers: boolean;         // Requires numeric characters
  requireSpecialChars: boolean;    // Requires special characters
  preventPasswordReuse: number;    // Number of previous passwords checked
  maxPasswordAge: number;          // Days until expiration
}
```

#### Card State Object
```typescript
interface CardState {
  currentStep: ResetStep;          // Current workflow step
  errorState: ErrorState | null;   // Current error if any
  attempts: number;                // Number of verification attempts
  lastAttempt: Date | null;        // Timestamp of last attempt
  verificationExpiry: Date | null; // When current verification expires
  selectedMethod: Method | null;   // User's chosen verification method
  passwordStrength: number;        // 0-100 strength score
  requirementsMet: boolean[];      // Array of requirement statuses
}
```

## Localization Support

The Password Reset Bot Adaptive Card UI supports multiple languages through:

1. **Resource Files**
   - Language-specific string resources in JSON format
   - Support for RTL (Right-to-Left) languages
   - Culture-specific formatting (dates, times, numbers)

2. **Dynamic Content Loading**
   - Language determined from user profile settings
   - Fallback to Teams client language when user preference unavailable
   - Default to English when other options unavailable

3. **Localization Implementation**
   - Card templates include placeholders for localized strings
   - Dynamic binding of string resources during card creation
   - Character encoding handling for non-Latin alphabets

Example of a localized string resource:
```json
{
  "en": {
    "welcome_title": "Password Reset Assistant",
    "welcome_message": "Welcome to the self-service password reset tool. This secure process will allow you to reset your password without contacting IT support.",
    "start_button": "Start Reset Process",
    "cancel_button": "Cancel"
  },
  "es": {
    "welcome_title": "Asistente de restablecimiento de contraseña",
    "welcome_message": "Bienvenido a la herramienta de autoservicio de restablecimiento de contraseña. Este proceso seguro le permitirá restablecer su contraseña sin contactar con el soporte técnico.",
    "start_button": "Iniciar proceso de restablecimiento",
    "cancel_button": "Cancelar"
  },
  "fr": {
    "welcome_title": "Assistant de réinitialisation de mot de passe",
    "welcome_message": "Bienvenue dans l'outil de réinitialisation de mot de passe en libre-service. Ce processus sécurisé vous permettra de réinitialiser votre mot de passe sans contacter le support informatique.",
    "start_button": "Démarrer le processus de réinitialisation",
    "cancel_button": "Annuler"
  }
}
```

## Accessibility Considerations

The Password Reset Bot Adaptive Card UI is designed to be accessible according to WCAG 2.1 AA standards:

1. **Keyboard Navigation**
   - All interactive elements are keyboard accessible
   - Logical tab order preserved across card elements
   - Focus states clearly visible

2. **Screen Reader Support**
   - Appropriate ARIA labels for interactive elements
   - Alt text for all images and icons
   - Semantic structure for logical content hierarchy

3. **Visual Accessibility**
   - High contrast mode compatibility
   - Text size adjustments supported
   - Color not used as the sole means of conveying information

4. **Cognitive Accessibility**
   - Clear, simple language
   - Step-by-step instructions
   - Consistent layout and control positioning

Implementation example for an accessible input field:
```json
{
  "type": "Input.Text",
  "id": "otpCode",
  "label": "Verification Code",
  "maxLength": 8,
  "placeholder": "Enter code",
  "style": "password",
  "errorMessage": "Please enter the verification code",
  "validation": {
    "necessity": "required",
    "errorMessage": "Please enter the verification code"
  },
  "accessibilityLabel": "Enter the 6-digit verification code sent to your device"
}
```

## Error Handling and User Feedback

Comprehensive error handling strategies ensure users receive clear guidance when issues occur:

1. **Error Categories**
   - **Validation Errors**: Input format/content issues
   - **Authentication Errors**: Verification failures
   - **Policy Violations**: Password requirement failures
   - **Service Errors**: Backend service issues
   - **Timeout Errors**: Session expiration issues

2. **Error Presentation**
   - Contextual error messaging near relevant input
   - Clear explanations of the issue
   - Specific guidance on resolution
   - Error codes for support reference

3. **Error Recovery**
   - Preservation of entered data where security-appropriate
   - Clear path to retry operations
   - Graceful handling of rate limiting
   - Escalation path to IT support

4. **Error Logging**
   - Client-side error capture
   - Telemetry integration
   - User session correlation
   - Error categorization for analytics

Error handling examples:

```typescript
// Error handling function for OTP verification
function handleOTPError(errorCode: string, context: UserContext): CardPayload {
  let errorMessage = "";
  let errorGuidance = "";
  let retryEnabled = true;
  
  switch(errorCode) {
    case "OTP_INVALID":
      errorMessage = "The verification code you entered is incorrect.";
      errorGuidance = "Please check the code and try again. Make sure to enter the most recent code sent.";
      break;
    case "OTP_EXPIRED":
      errorMessage = "The verification code has expired.";
      errorGuidance = "Please request a new verification code.";
      retryEnabled = false;
      break;
    case "OTP_MAX_ATTEMPTS":
      errorMessage = "You've exceeded the maximum number of verification attempts.";
      errorGuidance = "For security reasons, please restart the password reset process.";
      retryEnabled = false;
      break;
    case "SERVICE_UNAVAILABLE":
      errorMessage = "The verification service is temporarily unavailable.";
      errorGuidance = "Please try again later or contact IT support if the issue persists.";
      break;
    default:
      errorMessage = "An unexpected error occurred.";
      errorGuidance = "Please try again or contact IT support.";
  }
  
  // Create error card payload
  return {
    cardType: "error",
    data: {
      errorMessage,
      errorGuidance,
      errorCode,
      errorTimestamp: new Date().toISOString(),
      retryEnabled,
      retryAction: retryEnabled ? "verify_otp" : "restart",
      retryActionText: retryEnabled ? "Try Again" : "Start Over",
      supportUrl: `https://support.contoso.com/password-reset?code=${errorCode}`
    }
  };
}
```

## Responsive Design

The Password Reset Bot Adaptive Card UI is designed to function across different device form factors:

1. **Desktop Optimization**
   - Full keyboard support
   - High-density information layout
   - Support for larger input forms

2. **Mobile Optimization**
   - Touch-friendly tap targets (min 44x44px)
   - Responsive content adjustment
   - Optimized for portrait orientation
   - Limited scrolling requirements

3. **Implementation Techniques**
   - Dynamic spacing based on viewport
   - Flexible containers
   - Prioritized content for small screens
   - Conditional elements based on screen size

Example responsive design considerations:

```typescript
// Function to adjust card based on device context
function createResponsiveCard(context: UserContext, hostContext: HostContext): AdaptiveCard {
  const isMobile = hostContext.deviceType === 'mobile';
  
  // Base card template
  const cardPayload = { /* Card JSON */ };
  
  // Apply responsive adjustments
  if (isMobile) {
    // Simplify layout for mobile
    cardPayload.body = cardPayload.body.filter(element => !element.isOptional);
    
    // Enlarge touch targets
    cardPayload.actions.forEach(action => {
      action.style = "default";
      action.height = "STRETCH";
    });
    
    // Adjust spacing
    cardPayload.spacing = "medium";
    cardPayload.separator = true;
  } else {
    // Desktop optimizations
    cardPayload.width = "medium";
    
    // Add keyboard shortcuts
    cardPayload.selectAction = {
      type: "Action.Submit",
      title: "Continue",
      data: { action: "next_step" }
    };
  }
  
  return cardPayload;
}
```

## Best Practices

### Performance Optimization

1. **Card Payload Size**
   - Minimize JSON payload size (<50KB recommended)
   - Optimize image resources
   - Remove unused elements

2. **Rendering Efficiency**
   - Minimize card updates/refreshes
   - Batch state changes
   - Avoid complex nested containers

3. **Network Considerations**
   - Cache static card templates
   - Implement progressive loading for multi-step flows
   - Optimize backend service calls

### User Experience

1. **Consistent Visual Language**
   - Maintain consistent UI patterns
   - Align with Microsoft Teams design language
   - Follow organizational branding guidelines

2. **Intuitive Navigation**
   - Clear progression through steps
   - Persistent navigation options
   - Consistent action positioning

3. **Helpful Guidance**
   - Contextual help at each step
   - Clear error recovery paths
   - Progress indication

## Security Considerations

The Adaptive Card UI implements several security measures:

1. **Data Protection**
   - Sensitive data never stored in card state
   - Password inputs masked
   - OTP codes never persisted client-side

2. **Transport Security**
   - All communication over HTTPS
   - Authorization tokens never exposed in UI
   - Data minimization in payloads

3. **Input Validation**
   - Client-side validation for immediate feedback
   - Server-side validation for security enforcement
   - Input sanitization to prevent injection attacks

4. **Session Management**
   - Timeout handling for abandoned flows
   - Automatic cleanup of sensitive data
   - One-time use tokens for verification

5. **Audit Logging**
   - All password reset attempts logged
   - Source IP and device information recorded
   - Correlation IDs for end-to-end tracing

Example security implementation:

```typescript
// Security measures in card rendering
function createSecureCard(context: UserContext, cardData: CardData): AdaptiveCard {
  // Create base card
  const card = { /* Card JSON */ };
  
  // Apply security measures
  
  // 1. Remove sensitive data from state
  if (cardData.userContext) {
    cardData.userContext = sanitizeUserContext(cardData.userContext);
  }
  
  // 2. Add CSRF token
  card.csrfToken = generateCSRFToken(context.sessionId);
  
  // 3. Set maximum lifetime for card
  card.expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  
  // 4. Add correlation ID for audit logging
  card.correlationId = context.correlationId;
  
  return card;
}

// Function to sanitize sensitive data
function sanitizeUserContext(userContext: UserContext): SafeUserContext {
  return {
    displayName: userContext.displayName,
    userPrincipalName: maskEmail(userContext.userPrincipalName),
    // Remove tokens, full phone numbers, etc.
    phoneNumbers: userContext.phoneNumbers.map(phone => ({
      type: phone.type,
      number: maskPhoneNumber(phone.number)
    })),
    // Include only necessary verification methods
    verificationMethods: userContext.verificationMethods.map(method => ({
      type: method.type,
      isRegistered: method.isRegistered,
      maskedTarget: method.maskedTarget
    }))
  };
}
```

## Testing Strategy

Comprehensive testing ensures reliable operation of the Adaptive Card UI:

1. **Unit Testing**
   - Card template validation
   - Data binding verification
   - Input validation logic
   - Error handling paths

2. **Integration Testing**
   - End-to-end flow testing
   - API integration verification
   - Authentication pathway validation

3. **User Acceptance Testing**
   - Multi-device testing
   - Accessibility validation
   - Localization verification

4. **Security Testing**
   - Penetration testing
   - Input fuzzing
   - Token validation
   - Session management verification

Example test cases:
- Verify all card templates render correctly in Teams client
- Confirm password validation matches policy requirements
- Test OTP expiration and retry logic
- Validate error handling for all error categories
- Confirm successful password update via Graph API
- Test across mobile, desktop, and web clients
- Verify screen reader compatibility
- Test with various language settings

## Integration with Teams

The Password Reset Bot integrates with Microsoft Teams through:

1. **Bot Framework Integration**
   - Registration in Teams admin portal
   - Channel configuration
   - Permissions management

2. **Authentication Flow**
   - SSO implementation with Teams identity
   - Token management
   - Scopes configuration

3. **Deployment Considerations**
   - Multi-tenant vs. single-tenant configuration
   - Regional deployment options
   - CDN integration for resources

Implementation example:

```typescript
// Teams-specific integration for Adaptive Cards
async function sendAdaptiveCardToTeams(context: TurnContext, cardPayload: any): Promise<void> {
  // Create attachment
  const attachment = CardFactory.adaptiveCard(cardPayload);
  
  // Create activity with attachment
  const activity = MessageFactory.attachment(attachment);
  
  // Add Teams-specific properties
  activity.channelData = {
    notification: {
      alert: true  // Triggers notification for user
    },
    onBehalfOf: [  // Shows as sent by the bot app
      {
        itemid: 0,
        mentionType: 'person',
        mri: context.activity.from.id,
        displayname: 'Password Reset Assistant'
      }
    ]
  };
  
  // Send the activity
  await context.sendActivity(activity);
}
```

## Troubleshooting

Common issues and resolution paths:

1. **Card Rendering Issues**
   - **Symptom**: Card appears blank or improperly formatted
   - **Possible Causes**: Schema version mismatch, unsupported features
   - **Resolution**: Verify Teams client version, check card schema compatibility, simplify complex elements

2. **Input Validation Problems**
   - **Symptom**: Input validation not working as expected
   - **Possible Causes**: Client-side validation not triggered, validation rules mismatch
   - **Resolution**: Verify JSON schema syntax, check validation functions, update validation rules

3. **State Management Errors**
   - **Symptom**: Card loses state between interactions
   - **Possible Causes**: Missing state preservation, token expiration
   - **Resolution**: Verify state management approach, check session timeout settings

4. **Integration Failures**
   - **Symptom**: Graph API calls failing from Adaptive Card
   - **Possible Causes**: Permission issues, token expiration, endpoint configuration
   - **Resolution**: Verify permissions, refresh tokens, check endpoint URLs

Example troubleshooting guide:

```
ERROR: Card Action Failed - "Cannot process verification code"

Diagnostic Steps:
1. Check bot service logs for API errors
2. Verify OTP generation service health
3. Confirm user has required permissions
4. Check rate limiting status

Common Resolutions:
- If error code GRAPH_AUTH_FAILED: Refresh Graph API access token
- If error code OTP_SERVICE_UNAVAILABLE: Check OTP service status
- If error code USER_THROTTLED: Advise user to wait and retry
- If error code INVALID_INPUT: Check input validation logic
```

## FAQ

**Q: Can users reset passwords for other users?**
A: No, the Password Reset Bot only allows users to reset their own passwords. Admin-level password resets require elevated permissions and are handled through a separate administrative interface.

**Q: How long are verification codes valid?**
A: Verification codes (OTPs) are valid for 10 minutes by default. This timeout can be configured in the bot settings based on organizational security requirements.

**Q: What happens if a user enters an incorrect verification code multiple times?**
A: After three consecutive failed attempts, the verification process is locked for 15 minutes as a security measure. Users must restart the password reset process after this period.

**Q: Can the Password Reset Bot integrate with on-premises Active Directory?**
A: Yes, through Azure AD Connect, password changes can synchronize to on-premises Active Directory. The synchronization timing depends on your Azure AD Connect configuration.

**Q: How does the bot handle network interruptions during the reset process?**
A: The bot maintains session state for 15 minutes (configurable). If connectivity is restored within this window, users can continue from their last completed step.

**Q: Is the password reset process compliant with security regulations?**
A: Yes, the process is designed to comply with common security frameworks including NIST SP 800-63B. All actions are logged for audit purposes, and security measures prevent common attack vectors.

## References

- [Adaptive Cards Schema Documentation](https://adaptivecards.io/explorer/)
- [Microsoft Teams Bot Framework Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
- [Microsoft Graph API - Password Reset Endpoints](https://docs.microsoft.com/en-us/graph/api/resources/passwordresetinformation)
- [Azure Active Directory Self-Service Password Reset](https://docs.microsoft.com/en-us/azure/active-directory/authentication/concept-sspr-howitworks)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/)
