# Teams JS SDK Testing and Debugging

## Introduction

This document provides comprehensive guidance on testing and debugging applications built using the Microsoft Teams JavaScript SDK (TeamsJS). The Teams JS SDK is a critical component for developing applications that run within the Microsoft Teams environment, providing essential functionalities for application integration with Teams, Microsoft 365, and Outlook.

This guide covers various approaches to testing and debugging, from local development testing to comprehensive unit and integration testing methodologies. It aims to equip developers with the knowledge and tools necessary to build robust and reliable Teams applications.

## Teams JS SDK Overview

### Current SDK Version and Status

The Microsoft Teams JavaScript client library (TeamsJS) is part of the Microsoft Teams developer platform. The latest version (as of April 2025) is 2.36.0, which supports running Teams apps in Teams, Microsoft 365 app, and Outlook environments.

Key points about the current SDK:

- The TeamsJS library has been refactored to enable Teams apps to run across multiple Microsoft 365 environments.
- API patterns have been reorganized into capability-based namespaces.
- Callback-based patterns have been converted to Promise-based patterns.
- Teams apps now require TeamsJS v2.19.0 or later for new app submissions and updates.
- For Teams-only apps, using the latest version is recommended to leverage improvements and features.

### SDK Installation Methods

There are multiple ways to reference the Teams JS SDK in your project:

#### Via CDN
```html
<!-- Microsoft Teams JavaScript API (via CDN) -->
<script src="https://res.cdn.office.net/teams-js/2.36.0/js/MicrosoftTeams.min.js" 
integrity="sha384-Vg2zZJuta2CG1wHGm8f5belcapTREs0cxiGzaMgVWI/apjFxwHqOgYOon/OqPXP7" 
crossorigin="anonymous"></script>
```

#### Via NPM
```html
<!-- Microsoft Teams JavaScript API (via npm) -->
<script src="node_modules/@microsoft/teams-js@2.36.0/dist/MicrosoftTeams.min.js"></script>
```

#### Via Local Copy
```html
<!-- Microsoft Teams JavaScript API (via local) -->
<script src="MicrosoftTeams.min.js"></script>
```

> **Note**: For TypeScript developers, installing the NPM package is helpful even if you don't link to the copy in node_modules from your HTML, as IDEs like Visual Studio Code will use it for Intellisense and type checking.

## Debugging Techniques

### Local Debugging

#### Developer Tools Access

To access developer tools in Microsoft Teams desktop client:

1. **Windows/Linux**:
   - Enable developer mode by clicking 7 times on the Teams status icon
   - Right-click and select one of two options:
     - **Open DevTools (Main Window)** - For debugging the Teams client itself
     - **Open DevTools (All WebContents)** - For debugging your app content

2. **MacOS**:
   - Enter developer preview mode first
   - Then access developer tools through similar methods

#### Teams Toolkit Debugging

Microsoft Teams Toolkit provides integrated capabilities for debugging:

1. **Prerequisites Setup**:
   - Sign in to Microsoft 365
   - Ensure breakpoints can toggle in your source code
   - Configure Teams Toolkit debug settings appropriately

2. **Debug Configuration Customization**:
   - Customize in `.vscode/tasks.json` under "Validate prerequisites"
   - Set up certificate configuration in `teamsapp.local.yml`
   - Configure port settings as needed
   - Set up any custom app packages

3. **Environment Variables**:
   - Add environment variables to `.localConfigs` file
   - Configure tunnel settings if needed for bot-based apps
   - Restart local debug after adding new variables (no hot reload support)

### Teams App Test Tool

The Teams App Test Tool is an npm package that helps with testing bot-based apps:

1. **Benefits**:
   - No need for Microsoft 365 developer account
   - No tunneling required
   - No Teams app or bot registration needed
   - Supports personal, team, and group chat scopes

2. **Setup**:
   - Run `teamsapptester start` to open a web app on your local machine
   - Configure message endpoint (default: `http://localhost:3978/api/messages`)

3. **Configuration**:
   - Use a YAML configuration file to customize Teams context information
   - Set up test data for Bot Framework APIs

4. **Limitations**:
   - Some features may not be supported
   - Use Teams client for testing unsupported features

### Remote Debugging

For production-scale debugging:

1. **Tunneling Services**:
   - Use ngrok or similar services to expose local endpoints
   - Update all URL references in code, config, and manifest.json
   - Update messaging endpoints in Bot Framework or Developer Portal

2. **Validation**:
   - Ensure all domains accessed are listed in the `validDomains` object in manifest.json
   - Be explicit about domains and subdomains

3. **Deployment Testing**:
   - Create separate packages for testing vs. production
   - Register separate development and production resources
   - Test production packages before submission to Microsoft Teams Store

## Testing Methodologies

### Unit Testing

Unit testing allows you to test individual components in isolation, focusing on specific functionality without making actual network calls or requiring external services.

#### Mocking the Teams JS SDK

Since the TeamsJS library typically runs within the Teams client environment, mocking is essential for effective unit testing:

1. **Common Mocking Libraries**:
   - Jest
   - Mocha with Sinon.JS
   - Other JavaScript testing frameworks

2. **Mocking Challenges**:
   - TeamsJS API needs to be loaded by an HTML file
   - Some APIs may require mocking complex objects
   - Handling asynchronous operations and promises
   - Simulating initialization and context

#### Sample Mock Implementation

```javascript
// Example of mocking Teams SDK initialization
jest.mock('@microsoft/teams-js', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  getContext: jest.fn().mockResolvedValue({
    entityId: 'test-entity-id',
    locale: 'en-us',
    userObjectId: 'test-user-id',
    theme: 'default',
    hostName: 'teams'
  }),
  // Mock other methods as needed
  app: {
    getContext: jest.fn().mockResolvedValue({
      app: { locale: 'en-us' },
      page: { id: 'test-page' },
      user: { id: 'test-user-id' }
    })
  },
  pages: {
    currentApp: {
      navigateTo: jest.fn().mockResolvedValue(undefined)
    }
  }
}));
```

#### Testing Capabilities Support

Since TeamsJS organizes APIs into capabilities, your tests should include capability support checks:

```javascript
// Testing capability support
test('should check dialog capability support', async () => {
  const mockIsSupported = jest.fn().mockResolvedValue(true);
  require('@microsoft/teams-js').dialog.isSupported = mockIsSupported;
  
  const result = await yourFunctionThatUsesDialogCapability();
  
  expect(mockIsSupported).toHaveBeenCalled();
  // Additional assertions...
});
```

### Integration Testing

Integration testing verifies that different components of your application work together correctly, including the interaction with TeamsJS.

#### Testing Approaches

1. **Local Integration Testing**:
   - Test integration between your components without Teams client
   - Mock external services but use real implementation of your code
   - Focus on data flow between components

2. **Teams Client Integration Testing**:
   - Deploy your app to Teams
   - Test within the Teams environment
   - Validate end-to-end user flows

#### Test Environment Setup

To create reliable integration tests:

1. **Controlled Environment**:
   - Create a dedicated test tenant
   - Automate app deployment
   - Use test accounts with known permissions

2. **Continuous Integration**:
   - Integrate with CI/CD pipelines
   - Automate test execution
   - Use tools like Azure DevOps or GitHub Actions

### Test Doubles for Teams JS SDK

When testing applications that use TeamsJS, you'll need to create test doubles to replace the real SDK functionality:

1. **Stubs**:
   - Provide predetermined responses
   - Useful for simulating specific SDK behaviors
   - Don't verify behavior, only return fixed responses

2. **Mocks**:
   - Verify behavior and interactions
   - Check how many times methods were called
   - Validate argument values

3. **Fakes**:
   - Provide working implementations without external dependencies
   - More complex than stubs but more reliable than mocks
   - Can sometimes be promoted to production code

4. **Spies**:
   - Record method calls without changing behavior
   - Useful for verifying interactions without changing functionality

## Best Practices

### Testing Best Practices

1. **Test Isolation**:
   - Each test should run independently
   - Reset mocks between tests
   - Don't rely on test execution order

2. **Realistic Test Data**:
   - Simulate realistic Teams context data
   - Test with different locales, themes, and permissions
   - Consider mobile vs. desktop client differences

3. **Error Handling**:
   - Test error scenarios and edge cases
   - Verify error handling behavior
   - Simulate network issues and timeouts

4. **Testing Promises**:
   - Remember TeamsJS v2+ uses Promises
   - Test both resolved and rejected states
   - Use async/await for cleaner test code

5. **Test Coverage**:
   - Aim for comprehensive test coverage
   - Test all capability support scenarios
   - Consider cross-platform testing (web, desktop, mobile)

### Debugging Best Practices

1. **Logging Strategy**:
   - Implement consistent logging
   - Use different log levels (debug, info, warn, error)
   - Consider client vs. server logging needs

2. **Diagnostic Tools**:
   - Use browser developer tools
   - Leverage Teams Toolkit features
   - Implement telemetry for production monitoring

3. **Environment-specific Debugging**:
   - Debug across different host applications (Teams, Outlook, Microsoft 365)
   - Test in multiple client types (web, desktop, mobile)
   - Validate in different browsers

## Common Issues and Solutions

### Initialization Issues

**Problem**: Teams SDK initialization failures

**Solutions**:
- Ensure initialization happens after DOM is ready
- Check for correct SDK version inclusion
- Verify hosting environment supports Teams SDK
- Use capability checks before using specific features

### Context Data Problems

**Problem**: Missing or incorrect context data

**Solutions**:
- Implement proper error handling for getContext
- Check for required properties before using them
- Use default values for missing context properties
- Log context data for debugging

### Authentication Challenges

**Problem**: Authentication flows not working correctly

**Solutions**:
- Ensure authentication is properly configured
- Check redirect URL configuration
- Verify scopes and permissions
- Test with different user accounts

### Mobile Client Limitations

**Problem**: Features working on desktop but not mobile

**Solutions**:
- Check mobile support for specific capabilities
- Test explicitly on mobile clients
- Implement fallback behavior for unsupported features
- Use responsive design patterns

## Advanced Testing Scenarios

### Cross-host Testing

With TeamsJS supporting multiple hosts (Teams, Outlook, Microsoft 365), test across different environments:

1. **Capability Support Testing**:
   - Test isSupported() checks for each capability
   - Verify graceful degradation when features aren't supported
   - Test host-specific behaviors

2. **Host-specific Testing**:
   - Create test scenarios for each host
   - Verify context data differences between hosts
   - Test host-specific UI adaptations

### Performance Testing

Assess your app's performance with TeamsJS:

1. **Load Time Testing**:
   - Measure initialization time
   - Track rendering performance
   - Monitor API call latency

2. **Resource Usage**:
   - Monitor memory consumption
   - Check CPU usage patterns
   - Identify potential memory leaks

### Accessibility Testing

Ensure your Teams app meets accessibility requirements:

1. **Screen Reader Compatibility**:
   - Test with screen readers
   - Ensure proper focus management
   - Verify keyboard navigation

2. **Color Contrast**:
   - Test in different Teams themes
   - Validate contrast ratios
   - Support high contrast mode

### Security Testing

Validate security aspects of your Teams application:

1. **Authentication Testing**:
   - Test SSO implementation
   - Verify token handling
   - Check permission scopes

2. **Data Protection**:
   - Validate secure storage practices
   - Test data transmission security
   - Verify proper handling of sensitive information

## Conclusion

Thorough testing and debugging are essential for creating robust Teams applications. By leveraging the techniques and best practices outlined in this document, developers can ensure their applications work reliably across different environments and scenarios.

Remember that debugging tools, testing methodologies, and SDK features continue to evolve. Stay updated with the latest Microsoft Teams developer documentation and best practices to maintain high-quality applications.

## Resources

- [Microsoft Teams JavaScript Client Library Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/using-teams-client-library)
- [Teams Toolkit Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/debug-overview)
- [Teams App Test Tool](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/debug-your-teams-app-test-tool)
- [TeamsJS Support across Microsoft 365](https://learn.microsoft.com/en-us/microsoftteams/platform/m365-apps/teamsjs-support-m365)
- [Microsoft Teams GitHub Repository](https://github.com/OfficeDev/microsoft-teams-library-js)
