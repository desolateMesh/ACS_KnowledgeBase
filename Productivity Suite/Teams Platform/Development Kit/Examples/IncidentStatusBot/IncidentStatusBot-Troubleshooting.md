# IncidentStatusBot Troubleshooting Guide

## Table of Contents
1. [Common Issues](#common-issues)
2. [Authentication Problems](#authentication-problems)
3. [API Integration Issues](#api-integration-issues)
4. [Bot Registration and Manifest Errors](#bot-registration-and-manifest-errors)
5. [Teams Platform Integration Problems](#teams-platform-integration-problems)
6. [Dashboard Rendering Issues](#dashboard-rendering-issues)
7. [Notification Delivery Failures](#notification-delivery-failures)
8. [Performance Considerations](#performance-considerations)
9. [Error Logging and Diagnostics](#error-logging-and-diagnostics)
10. [Deployment Troubleshooting](#deployment-troubleshooting)
11. [FAQ](#faq)

## Common Issues

### Bot Unresponsive or Not Loading
- **Symptom**: Bot fails to respond to commands or the dashboard doesn't load in Teams
- **Potential Causes**:
  - Azure Bot Service is not running
  - API connection issues with your monitoring platforms
  - Authentication token expiration
  - Teams app registration issues
- **Resolution Steps**:
  1. Check Azure Bot Service status in the Azure Portal
  2. Verify API connectivity to monitoring systems
  3. Check Application Insights logs for exceptions
  4. Validate Azure AD application registration settings
  5. Ensure bot endpoint is accessible from Teams platform

### Missing Incident Data
- **Symptom**: Some or all incident data is missing from responses or dashboard
- **Potential Causes**:
  - API connection failure to specific monitoring system
  - Data transformation errors
  - Permission issues with monitoring system APIs
  - Filtering settings excluding relevant data
- **Resolution Steps**:
  1. Check monitoring system API connectivity
  2. Review data transformation logic for errors
  3. Verify service account permissions
  4. Validate query parameters and filters
  5. Check Application Insights for specific exceptions

### Delayed Notifications
- **Symptom**: Incident notifications are received with significant delay
- **Potential Causes**:
  - Webhook processing delays
  - Azure function timeout or throttling
  - Teams message throttling
  - Network latency between services
- **Resolution Steps**:
  1. Check webhook processing metrics in Application Insights
  2. Review Azure function execution times and throttling metrics
  3. Verify Teams message delivery status
  4. Check for network latency between Azure regions

## Authentication Problems

### Azure AD Authentication Failures
- **Symptom**: "Unauthorized" errors in logs or inability to access monitoring APIs
- **Potential Causes**:
  - Expired client secret
  - Incorrect tenant ID configuration
  - Missing API permissions
  - Consent not granted for required permissions
- **Resolution Steps**:
  1. Verify and renew client secrets if needed
  2. Check tenant ID configuration matches the AAD tenant
  3. Review API permissions in Azure AD app registration
  4. Re-consent to app permissions as admin
  5. Check if service principal has been disabled

### Monitoring System API Authentication
- **Symptom**: 401 or 403 errors when trying to retrieve monitoring data
- **Potential Causes**:
  - Expired API keys
  - IP restrictions on API access
  - Rate limiting
  - Permission changes on monitoring system
- **Resolution Steps**:
  1. Regenerate and update API keys for monitoring systems
  2. Check for IP restrictions and add Azure bot service IPs if needed
  3. Implement exponential backoff for rate limiting
  4. Verify user permissions in monitoring platforms

### Bot Framework Authentication Issues
- **Symptom**: Bot fails to authenticate with Microsoft Bot Framework
- **Potential Causes**:
  - Mismatched app ID and password
  - Bot channel registration issues
  - Microsoft service issues
- **Resolution Steps**:
  1. Verify App ID and password match in bot registration and code
  2. Check Bot Channels Registration in Azure
  3. Validate Microsoft Bot Framework service status
  4. Review any channel-specific authentication issues

## API Integration Issues

### Monitoring System Connection Failures
- **Symptom**: Unable to retrieve data from specific monitoring system
- **Potential Causes**:
  - API endpoint changes
  - Network connectivity issues
  - API version compatibility
  - Rate limiting or throttling
- **Resolution Steps**:
  1. Validate API endpoint URLs
  2. Test API connectivity directly using tools like Postman
  3. Check for API version changes and update integration
  4. Implement retry logic with exponential backoff
  5. Verify network security group settings

### Data Parsing Errors
- **Symptom**: Errors when processing API responses or malformed incident data
- **Potential Causes**:
  - API response format changes
  - Unexpected null values
  - Character encoding issues
  - Schema mismatch
- **Resolution Steps**:
  1. Implement more robust null checking in data processing
  2. Update data transformation logic to handle schema changes
  3. Add detailed logging of API responses for troubleshooting
  4. Test with mock data to isolate parsing issues

### Rate Limiting and Throttling
- **Symptom**: Intermittent 429 errors or degraded performance
- **Potential Causes**:
  - Exceeding API rate limits
  - Excessive polling frequency
  - Missing caching layer
  - Multiple concurrent requests
- **Resolution Steps**:
  1. Implement proper caching of API responses
  2. Add exponential backoff for retries
  3. Consolidate requests when possible
  4. Respect Retry-After headers in responses
  5. Monitor and adjust polling intervals

## Bot Registration and Manifest Errors

### Bot Registration Issues
- **Symptom**: Bot channel registration errors or invalid configuration
- **Potential Causes**:
  - Incorrect app ID or password
  - Missing messaging endpoint
  - Unregistered Teams channel
  - Missing OAuth connection settings
- **Resolution Steps**:
  1. Verify App ID and password in Azure Bot Service
  2. Ensure messaging endpoint is correctly configured
  3. Check that Teams channel is enabled
  4. Validate OAuth connection settings

### Teams App Manifest Errors
- **Symptom**: Unable to upload app manifest or manifest validation errors
- **Potential Causes**:
  - Invalid manifest format
  - Missing required fields
  - Incorrect bot ID
  - Icon format issues
- **Resolution Steps**:
  1. Validate app manifest against Teams schema
  2. Check that bot ID matches Azure Bot Service ID
  3. Verify icon sizes and formats meet Teams requirements
  4. Use Teams App Studio to validate manifest

### Permission Consent Issues
- **Symptom**: Users unable to use bot due to consent prompts or permission errors
- **Potential Causes**:
  - Missing admin consent
  - Excessive permission requests
  - Tenant restrictions
- **Resolution Steps**:
  1. Request admin consent for required permissions
  2. Review and minimize required permissions
  3. Check tenant app policies and restrictions
  4. Ensure proper scopes are defined in manifest

## Teams Platform Integration Problems

### Message Extension Failures
- **Symptom**: Message extensions not appearing or functioning incorrectly
- **Potential Causes**:
  - Incorrect command definition in manifest
  - Handler exceptions
  - Authentication issues with backend services
- **Resolution Steps**:
  1. Verify command definitions in app manifest
  2. Check command handler implementation
  3. Test authentication flow for message extensions
  4. Review Application Insights logs for exceptions

### Adaptive Card Rendering Issues
- **Symptom**: Cards appear incorrectly or are missing elements
- **Potential Causes**:
  - Unsupported card elements
  - Card version mismatch
  - Card size limitations
  - Data binding errors
- **Resolution Steps**:
  1. Validate card against Adaptive Card schema
  2. Test cards in Adaptive Card Designer
  3. Check for unsupported elements in Teams
  4. Implement fallback handling for unsupported elements

### Tab Loading Problems
- **Symptom**: Dashboard tab fails to load or displays errors
- **Potential Causes**:
  - Content security policy issues
  - Authentication failures
  - JavaScript errors
  - Incorrect configuration URL
- **Resolution Steps**:
  1. Check browser console for JavaScript errors
  2. Verify content security policy settings
  3. Test tab authentication flow
  4. Validate configuration URL
  5. Check Teams client version compatibility

## Dashboard Rendering Issues

### Chart Loading Failures
- **Symptom**: Charts not appearing or showing errors on dashboard
- **Potential Causes**:
  - JavaScript library loading issues
  - Data format incompatibilities
  - Browser compatibility problems
  - CSS conflicts
- **Resolution Steps**:
  1. Check browser console for JavaScript errors
  2. Verify data format matches chart library expectations
  3. Test in different browsers and Teams clients
  4. Isolate CSS conflicts with Teams styles

### Real-time Updates Not Working
- **Symptom**: Dashboard data not refreshing automatically
- **Potential Causes**:
  - SignalR connection issues
  - WebSocket limitations in Teams
  - Polling configuration problems
  - Backend service disconnections
- **Resolution Steps**:
  1. Check SignalR connection status
  2. Implement fallback to polling when WebSockets unavailable
  3. Verify Azure Function timers for polling jobs
  4. Test connection resilience with network interruptions

### Layout and Responsiveness Issues
- **Symptom**: Dashboard layout broken or unusable on certain devices
- **Potential Causes**:
  - Missing responsive design
  - Teams iframe limitations
  - CSS conflicts
  - Device-specific rendering issues
- **Resolution Steps**:
  1. Implement responsive design with media queries
  2. Test on multiple device types and screen sizes
  3. Use Teams-specific CSS variables where available
  4. Simplify complex layouts for mobile clients

## Notification Delivery Failures

### Missing Proactive Notifications
- **Symptom**: Incident notifications not being delivered to Teams
- **Potential Causes**:
  - Webhook configuration issues
  - Conversation reference storage failures
  - Teams message throttling
  - Service principal permission issues
- **Resolution Steps**:
  1. Verify webhook configuration in monitoring systems
  2. Check conversation reference storage integrity
  3. Implement retry logic for message delivery
  4. Review service principal permissions

### Notification Format Issues
- **Symptom**: Notifications delivered but formatting incorrect or missing data
- **Potential Causes**:
  - Adaptive card template errors
  - Data transformation issues
  - Missing localization
  - Card version incompatibilities
- **Resolution Steps**:
  1. Validate adaptive card templates
  2. Implement strict data validation before card creation
  3. Test notifications with different data scenarios
  4. Add fallback text for card rendering failures

### Channel Message Delivery Problems
- **Symptom**: Notifications not appearing in specific channels
- **Potential Causes**:
  - Bot not added to channel
  - Channel messaging permissions
  - Channel notification settings
  - Tenant policies blocking apps
- **Resolution Steps**:
  1. Verify bot is added to the channel
  2. Check channel permissions for app messaging
  3. Review tenant policies for app restrictions
  4. Test with admin account to isolate permission issues

## Performance Considerations

### High Latency Issues
- **Symptom**: Slow responses from bot or dashboard loading delays
- **Potential Causes**:
  - Inefficient API queries
  - Missing caching layer
  - Database performance issues
  - Resource constraints in Azure services
- **Resolution Steps**:
  1. Implement appropriate caching strategies
  2. Optimize database queries and indexes
  3. Review Azure service tier and scaling settings
  4. Use Application Insights performance data to identify bottlenecks

### Memory Usage Problems
- **Symptom**: Out of memory exceptions or degraded performance over time
- **Potential Causes**:
  - Memory leaks in code
  - Excessive caching without eviction
  - Large dataset processing without pagination
  - Inefficient object creation
- **Resolution Steps**:
  1. Implement memory profiling to identify leaks
  2. Add cache eviction policies
  3. Process large datasets in chunks
  4. Review object lifecycle management

### Scaling Challenges
- **Symptom**: Performance degradation with increased usage
- **Potential Causes**:
  - Fixed-scale App Service plan
  - Missing auto-scaling rules
  - Database connection limits
  - Resource contention
- **Resolution Steps**:
  1. Configure appropriate auto-scaling rules
  2. Implement connection pooling for databases
  3. Review resource allocation across services
  4. Consider implementing queue-based architecture for high load

## Error Logging and Diagnostics

### Enabling Detailed Logging
- **Implementation Steps**:
  1. Configure Application Insights in Azure Portal
  2. Set appropriate sampling rate for telemetry
  3. Add custom dimensions for contextual information
  4. Implement structured logging with severity levels
  5. Add correlation IDs across service boundaries

### Common Error Codes and Solutions
| Error Code | Description | Resolution |
|------------|-------------|------------|
| AUTH001 | Azure AD authentication failure | Check client secret expiration and permissions |
| API002 | Monitoring system API connection failure | Verify endpoint and credentials |
| BOT003 | Bot Framework message delivery failure | Check bot registration and channel status |
| CARD004 | Adaptive card rendering error | Validate card format against schema |
| DB005 | Database connection failure | Check connection string and firewall settings |

### Diagnostic Tools
- **Application Insights**: Primary tool for monitoring and diagnostics
  - Review live metrics during incident response
  - Use Analytics queries to correlate issues
  - Set up alerts for critical failures
  - Enable dependency tracking
- **Bot Framework Emulator**: Test bot interactions locally
  - Inspect message payloads
  - Verify authentication flow
  - Test adaptive card rendering
- **Teams Developer Portal**: Validate Teams-specific functionality
  - Test app manifest
  - Validate adaptive cards
  - Check tab configuration

## Deployment Troubleshooting

### Failed Deployments
- **Symptom**: ARM template deployment failures or incomplete deployments
- **Potential Causes**:
  - Invalid template parameters
  - Resource naming conflicts
  - Insufficient permissions
  - Resource provider registration issues
- **Resolution Steps**:
  1. Check deployment logs in Azure Portal
  2. Verify parameter values against requirements
  3. Review service principal deployment permissions
  4. Check for resource name availability
  5. Validate all required resource providers are registered

### Post-Deployment Configuration Issues
- **Symptom**: Services deployed but not functioning correctly
- **Potential Causes**:
  - Missing application settings
  - Incorrect connection strings
  - CORS configuration issues
  - Networking security groups blocking traffic
- **Resolution Steps**:
  1. Verify all application settings from deployment template
  2. Test connection strings independently
  3. Check CORS settings for frontend services
  4. Review network security groups and firewall rules
  5. Validate SSL certificate configuration

### Update and Upgrade Problems
- **Symptom**: Issues after updating bot or Teams app
- **Potential Causes**:
  - Schema changes in storage
  - API version incompatibilities
  - Client caching issues
  - Incomplete updates
- **Resolution Steps**:
  1. Implement proper version handling for storage schema
  2. Test API compatibility before deployment
  3. Add cache-busting mechanisms for frontend resources
  4. Perform staged rollouts for major updates
  5. Maintain rollback procedures for critical updates

## FAQ

### Why can't users see the bot in their Teams client?
Users need appropriate permissions to access the bot. Check that:
- The app has been approved in Teams admin center
- Users are part of the correct security group if distribution is limited
- The tenant app catalog has the latest version of the app
- Users have refreshed their Teams client

### Why are incident details not updating in real-time?
Real-time updates require:
- Properly configured SignalR connection
- Webhook delivery from monitoring systems
- Frontend JavaScript properly handling update events
- No network issues blocking WebSocket connections

### How can I reset a user's bot conversation?
- Use the `/reset` command in a chat with the bot
- Clear Teams app cache in the client
- Remove and re-add the bot to the conversation
- As an admin, you can clear state in the bot's storage

### What permissions are required for full functionality?
The bot requires:
- Microsoft Graph permissions for user profile information
- Teams Channel Message permissions for posting to channels
- Resource-specific permissions for each monitoring system
- Azure AD application permissions for authentication

### How do I add a new monitoring system integration?
1. Implement a new provider in the monitoring integration layer
2. Configure authentication for the new system
3. Map the system's incident schema to the bot's unified schema
4. Update the dashboard to display the new data source
5. Add appropriate error handling and retry logic

### Why do some adaptive cards appear differently for some users?
- Different Teams clients (desktop, web, mobile) have varying support for card elements
- Teams client versions may support different Adaptive Card schema versions
- User theme settings (dark/light mode) affect card appearance
- Some organizations have custom Teams policies that may modify card rendering
