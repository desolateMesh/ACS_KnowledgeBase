# DevOpsReleaseNotifierBot Troubleshooting Guide

## Table of Contents
1. [Overview](#overview)
2. [Common Issues](#common-issues)
3. [Authentication and Authorization Problems](#authentication-and-authorization-problems)
4. [DevOps Integration Issues](#devops-integration-issues)
5. [GitHub Integration Issues](#github-integration-issues)
6. [Webhook Problems](#webhook-problems)
7. [Teams Platform Issues](#teams-platform-issues)
8. [Notification Delivery Failures](#notification-delivery-failures)
9. [Actionable Button Malfunctions](#actionable-button-malfunctions)
10. [Performance Considerations](#performance-considerations)
11. [Error Logging and Diagnostics](#error-logging-and-diagnostics)
12. [Deployment Troubleshooting](#deployment-troubleshooting)
13. [FAQ](#faq)

## Overview

The DevOpsReleaseNotifierBot is designed to notify Teams users about software releases from Azure DevOps and GitHub. This troubleshooting guide addresses common issues that may arise during deployment, configuration, and operation of the bot. The guide provides detailed diagnostics, resolution steps, and best practices for maintaining optimal performance.

## Common Issues

### Bot Unresponsive or Not Appearing in Teams
- **Symptoms**:
  - Bot doesn't respond to direct messages
  - Bot is missing from Teams channels or personal scope
  - "Bot unavailable" error message in Teams
- **Potential Causes**:
  - Bot service is not running in Azure
  - Incorrect App ID or password configuration
  - Teams app manifest issues
  - Bot registration problems
- **Resolution Steps**:
  1. Verify Azure App Service is running (Status: Running)
  2. Check Application Insights for exception logs
  3. Validate Bot Framework registration settings in Azure
  4. Confirm Teams app manifest contains correct botId
  5. Test bot endpoint using Bot Framework Emulator
  6. Verify network connectivity between Teams and bot endpoint

### Missing Release Notifications
- **Symptoms**:
  - No notifications appearing for new releases
  - Inconsistent delivery of notifications
  - Partial release information in notifications
- **Potential Causes**:
  - Webhook configuration issues
  - Azure DevOps/GitHub service hook misconfiguration
  - Event filtering excluding relevant releases
  - Permission issues with DevOps or GitHub APIs
- **Resolution Steps**:
  1. Verify webhook endpoint URL in DevOps/GitHub settings
  2. Check webhook logs for delivery attempts and responses
  3. Validate service hook trigger conditions
  4. Review event filtering settings
  5. Test webhook manually using Postman or cURL
  ```
  curl -X POST https://your-bot-webhook-url.azurewebsites.net/api/webhook 
  -H "Content-Type: application/json" 
  -d "{\"eventType\":\"release\",\"releaseId\":\"12345\"}"
  ```
  6. Check service principal permissions for the relevant APIs

### Configuration Errors
- **Symptoms**:
  - Bot starts but logs configuration errors
  - Error messages mentioning missing settings
  - Features partially working
- **Potential Causes**:
  - Incomplete application settings
  - Malformed connection strings
  - Missing API keys or tokens
  - Environment-specific configuration missing
- **Resolution Steps**:
  1. Verify required app settings in Azure App Service Configuration
  2. Check for malformed JSON in configuration values
  3. Validate all required connection strings are present
  4. Compare configuration against deployment template
  5. Implement configuration validation during startup

## Authentication and Authorization Problems

### Azure AD Authentication Failures
- **Symptoms**:
  - 401 Unauthorized errors in logs
  - "Failed to acquire token" error messages
  - Unable to access Microsoft Graph API
- **Potential Causes**:
  - Expired client secrets
  - Incorrect tenant ID
  - Missing API permissions
  - Consent not granted
- **Resolution Steps**:
  1. Check client secret expiration in Azure AD App Registration
  2. Verify tenant ID configuration matches your environment
  3. Review required API permissions in Azure AD:
     - Microsoft Graph User.Read
     - Microsoft Graph Group.Read.All
     - Azure DevOps user_impersonation (for DevOps integration)
  4. Re-grant admin consent for permissions
  5. Check for conditional access policies affecting service accounts

### Personal Access Token (PAT) Issues
- **Symptoms**:
  - DevOps or GitHub API calls returning 401 errors
  - Unable to access release information
  - "Invalid authentication credentials" errors in logs
- **Potential Causes**:
  - Expired PAT
  - Insufficient scope for PAT
  - Token revoked
  - Incorrect organization access
- **Resolution Steps**:
  1. Verify PAT expiration date in DevOps/GitHub settings
  2. Check PAT has required scopes:
     - For Azure DevOps: `vso.release_execute vso.release_manage`
     - For GitHub: `repo workflow admin:org`
  3. Generate a new PAT if necessary
  4. Validate PAT has access to the correct organizations
  5. Test PAT with a simple API call using cURL or Postman

### Service Principal Permission Issues
- **Symptoms**:
  - 403 Forbidden errors in logs
  - Unable to access specific resources
  - Permission-related error messages
- **Potential Causes**:
  - Service principal missing required roles
  - Resource-specific permissions not granted
  - RBAC policies restricting access
- **Resolution Steps**:
  1. Review service principal role assignments in Azure Portal
  2. Add missing role assignments:
     - Azure DevOps: Project Collection Build Service
     - Azure KeyVault: Secret Reader (if using KeyVault)
     - Storage Account: Storage Blob Data Contributor (if using blob storage)
  3. Check for custom RBAC policies that might be restricting access
  4. Verify service principal hasn't been disabled

## DevOps Integration Issues

### Pipeline Event Subscription Problems
- **Symptoms**:
  - Not receiving notifications for specific pipelines
  - Inconsistent notification delivery
  - Error logs showing webhook processing failures
- **Potential Causes**:
  - Service hook misconfiguration
  - Pipeline-specific permission issues
  - Event filter excluding relevant pipelines
  - Webhook payload format changes
- **Resolution Steps**:
  1. Verify service hook configuration in Azure DevOps:
     - Navigate to Project Settings > Service Hooks
     - Check event filters and notification settings
     - Validate webhook URL is correct
  2. Review pipeline security settings
  3. Test with a manual pipeline run
  4. Check webhook payload format against expected schema
  5. Update event filters to include all relevant pipelines

### Release Information Parsing Errors
- **Symptoms**:
  - Notifications missing specific release details
  - Error logs showing serialization or parsing exceptions
  - Malformed adaptive cards in Teams
- **Potential Causes**:
  - DevOps API response format changes
  - Custom fields not handled properly
  - null values in API responses
  - Schema version mismatch
- **Resolution Steps**:
  1. Implement more robust null checking in response parsing
  2. Update expected schema to match current API version
  3. Log full API responses for debugging
  4. Test with different release types (prod, staging, etc.)
  5. Handle custom fields more gracefully in the code

### Multiple Organization Integration Issues
- **Symptoms**:
  - Notifications working for some DevOps organizations but not others
  - Organization-specific error messages
  - Inconsistent behavior across projects
- **Potential Causes**:
  - PAT not having cross-organization access
  - Organization-specific configuration missing
  - Different schema versions between organizations
  - Custom process templates affecting API responses
- **Resolution Steps**:
  1. Verify PAT has access to all required organizations
  2. Configure organization-specific settings properly
  3. Implement organization detection logic in webhook handling
  4. Test each organization integration separately
  5. Update schema handling to accommodate differences

## GitHub Integration Issues

### GitHub Webhook Delivery Failures
- **Symptoms**:
  - GitHub release events not triggering notifications
  - Webhook delivery failures in GitHub settings
  - Timeout errors in webhook logs
- **Potential Causes**:
  - Incorrect webhook URL
  - Missing webhook secret
  - Content type misconfiguration
  - SSL verification issues
  - GitHub IP range changes
- **Resolution Steps**:
  1. Verify webhook URL in GitHub repository settings
  2. Check webhook secret matches between GitHub and bot configuration
  3. Set content type to `application/json`
  4. Disable SSL verification only for testing, then fix SSL issues
  5. Review GitHub's IP ranges if using IP filtering
  6. Check Recent Deliveries tab in GitHub webhook settings for specific errors

### GitHub Action Integration Problems
- **Symptoms**:
  - GitHub Actions not triggering notifications
  - Missing information from GitHub Action runs
  - Errors specific to workflow events
- **Potential Causes**:
  - Workflow file misconfiguration
  - Missing action step for notification
  - Repository permission issues
  - Action secret configuration problems
- **Resolution Steps**:
  1. Verify GitHub Action workflow YAML file contains proper notification step:
     ```yaml
     - name: Notify Teams
       uses: ./.github/actions/teams-notify
       with:
         webhook-url: ${{ secrets.TEAMS_WEBHOOK_URL }}
         title: "Release ${{ github.ref }}"
     ```
  2. Check action secrets are properly configured
  3. Validate repository permissions for the GitHub Action
  4. Test with a manual workflow dispatch
  5. Review GitHub Action run logs for specific errors

### Repository Access and Permission Issues
- **Symptoms**:
  - Unable to access specific repositories
  - "Resource not accessible by integration" errors
  - Repository-specific failures
- **Potential Causes**:
  - GitHub App or PAT missing repository access
  - Repository transferred to different organization
  - Private repository access issues
  - Branch protection rules
- **Resolution Steps**:
  1. Check GitHub App installation settings
  2. Verify PAT has access to the repository
  3. Request access to private repositories if needed
  4. Review branch protection rules that might affect webhook delivery
  5. Validate organization membership for service accounts

## Webhook Problems

### Webhook Validation Failures
- **Symptoms**:
  - 401 or 403 errors returned to webhook calls
  - "Invalid signature" or "Failed validation" error messages
  - Webhook calls rejected by bot
- **Potential Causes**:
  - Mismatched webhook secret
  - Missing or incorrect signature header
  - Timestamp validation failures
  - Request format issues
- **Resolution Steps**:
  1. Verify webhook secret matches between source (DevOps/GitHub) and bot configuration
  2. Check signature header is properly formatted
  3. Validate timestamp within acceptable range
  4. Implement better logging of rejected webhook calls
  5. Test with a manually constructed webhook payload

### Webhook Processing Timeouts
- **Symptoms**:
  - Webhook calls timing out
  - Gateway timeout errors (504)
  - Incomplete webhook processing
- **Potential Causes**:
  - Long-running operations in webhook handler
  - Database or external API latency
  - Resource constraints
  - Synchronous processing bottlenecks
- **Resolution Steps**:
  1. Implement asynchronous webhook processing pattern:
     - Accept webhook quickly and return 202 Accepted
     - Process payload in background job
  2. Add timeout handling for external API calls
  3. Optimize database operations in webhook handler
  4. Scale up webhook processing resources
  5. Monitor webhook processing times in Application Insights

### Duplicate Webhook Deliveries
- **Symptoms**:
  - Duplicate notifications for the same event
  - Log messages showing repeated webhook processing
  - Multiple identical messages in Teams
- **Potential Causes**:
  - Webhook retry mechanisms
  - Missing idempotency handling
  - Load-balanced webhook endpoints
  - DevOps/GitHub retry policies
- **Resolution Steps**:
  1. Implement idempotency checks using event IDs
  2. Store processed webhook IDs in a cache or database
  3. Add deduplication logic based on content hash
  4. Configure proper retry policies in webhook sources
  5. Add unique message references in Teams notifications

## Teams Platform Issues

### Bot Registration Problems
- **Symptoms**:
  - Bot not appearing in Teams
  - "Bot not found" errors
  - Unable to add bot to channels or chats
- **Potential Causes**:
  - Incorrect App ID or password
  - Bot Framework registration issues
  - Teams channel not enabled
  - Manifest validation errors
- **Resolution Steps**:
  1. Verify App ID and password match between code and Bot Framework registration
  2. Check Teams channel is enabled in Bot Framework channels
  3. Validate bot endpoint is correctly configured
  4. Review Teams app manifest for validation errors
  5. Test bot using Bot Framework Emulator

### Adaptive Card Rendering Issues
- **Symptoms**:
  - Cards not displaying properly in Teams
  - Missing buttons or actions
  - Formatting inconsistencies
  - Card version errors
- **Potential Causes**:
  - Unsupported Adaptive Card elements
  - Schema version mismatch
  - Teams client version limitations
  - Localization problems
- **Resolution Steps**:
  1. Validate Adaptive Cards using Adaptive Card Designer
  2. Ensure card schema version is compatible with Teams
  3. Test cards across different Teams clients (desktop, web, mobile)
  4. Remove or replace unsupported elements
  5. Implement fallback content for older clients

### App Installation and Distribution Issues
- **Symptoms**:
  - Unable to distribute app to users
  - App installation failures
  - "App not approved" errors
  - Installation timeout issues
- **Potential Causes**:
  - Missing admin approval
  - App catalog issues
  - Tenant restrictions
  - Package validation errors
- **Resolution Steps**:
  1. Submit app for admin approval in Teams Admin Center
  2. Check organization app policies and settings
  3. Verify app package meets all requirements
  4. Test with a sideloaded app for validation
  5. Review Teams admin approval process documentation

## Notification Delivery Failures

### Message Delivery Failures
- **Symptoms**:
  - Notifications not being delivered to Teams
  - Error logs showing message delivery failures
  - Inconsistent notification behavior
- **Potential Causes**:
  - Rate limiting from Bot Framework
  - Invalid conversation references
  - Teams message size limitations
  - Channel or chat permissions
- **Resolution Steps**:
  1. Implement rate limiting and backoff strategies
  2. Validate conversation references are current
  3. Check message size and reduce if exceeding limits
  4. Verify bot has permission to message the channel
  5. Test with different message formats and sizes

### User Targeting Issues
- **Symptoms**:
  - Notifications not reaching specific users
  - Group or team notifications inconsistent
  - User-specific error messages
- **Potential Causes**:
  - User not in conversation
  - Mention format issues
  - User settings blocking notifications
  - Permission problems
- **Resolution Steps**:
  1. Verify user is a member of the target conversation
  2. Check mention format follows Teams requirements
  3. Review user notification settings in Teams
  4. Test with different user types (admin, regular user)
  5. Implement better error handling for user-specific failures

### Proactive Message Failures
- **Symptoms**:
  - Unable to send proactive messages
  - Bot can respond but not initiate
  - "Unauthorized" errors when sending proactive messages
- **Potential Causes**:
  - Missing or expired conversation references
  - Bot not installed for target users
  - Permission scopes missing
  - Teams tenant restrictions
- **Resolution Steps**:
  1. Refresh conversation references regularly
  2. Ensure bot is installed for target users
  3. Verify proper permission scopes in manifest
  4. Store conversation references securely
  5. Implement fallback for failed proactive messages

## Actionable Button Malfunctions

### Button Click Not Registered
- **Symptoms**:
  - Button clicks have no effect
  - No response from bot after button click
  - Action URL errors in console
- **Potential Causes**:
  - Invalid action URL
  - Button handler not implemented
  - Authentication issues
  - Teams client bugs
- **Resolution Steps**:
  1. Verify action URL is correct and accessible
  2. Implement proper button click handlers
  3. Check authentication flow for button actions
  4. Test on different Teams clients
  5. Add better error handling for button clicks

### Action Response Errors
- **Symptoms**:
  - Error message after button click
  - "Failed to process action" alerts
  - Timeout waiting for action response
- **Potential Causes**:
  - Long-running action processing
  - Backend service failures
  - Invalid action parameters
  - Response format issues
- **Resolution Steps**:
  1. Implement asynchronous processing for long-running actions
  2. Add timeout handling for backend services
  3. Validate action parameters before processing
  4. Return proper response format to Teams
  5. Provide user feedback during long operations

### Permission-Based Button Problems
- **Symptoms**:
  - Buttons appearing for unauthorized users
  - Permission errors after button click
  - Inconsistent button visibility
- **Potential Causes**:
  - Missing permission checks in card generation
  - User role changes after card delivery
  - DevOps/GitHub permission changes
  - Role mapping issues
- **Resolution Steps**:
  1. Implement proper permission checks before showing buttons
  2. Refresh cards after role changes
  3. Verify permission mapping between Teams and DevOps/GitHub
  4. Add clear error messages for permission issues
  5. Create role-based card templates

## Performance Considerations

### Latency Issues
- **Symptoms**:
  - Slow response times
  - Notification delays
  - Timeouts during high load
- **Potential Causes**:
  - Insufficient server resources
  - Inefficient database queries
  - Missing caching layer
  - External API bottlenecks
- **Resolution Steps**:
  1. Implement appropriate caching for external API responses
  2. Optimize database queries with proper indexes
  3. Scale up App Service plan during high load periods
  4. Use async patterns for I/O-bound operations
  5. Monitor performance metrics in Application Insights

### Memory Usage Optimization
- **Symptoms**:
  - Out of memory exceptions
  - Growing memory usage over time
  - Degraded performance during high load
- **Potential Causes**:
  - Memory leaks
  - Large object caching without limits
  - Inefficient resource disposal
  - Large message processing
- **Resolution Steps**:
  1. Implement memory profiling to identify leaks
  2. Add cache size limits and eviction policies
  3. Properly dispose resources using `using` statements
  4. Process large messages in chunks
  5. Monitor memory metrics in Azure portal

### Scaling for High Load
- **Symptoms**:
  - Service degradation during release events
  - Increased error rates under load
  - Webhook processing backlog
- **Potential Causes**:
  - Fixed instance count
  - Missing auto-scale rules
  - Resource contention
  - Inefficient processing architecture
- **Resolution Steps**:
  1. Configure auto-scaling based on CPU and memory metrics
  2. Implement queue-based processing for webhooks
  3. Optimize database connection usage
  4. Use performance testing to identify bottlenecks
  5. Consider premium tier for critical workloads

## Error Logging and Diagnostics

### Configuring Comprehensive Logging
- **Implementation Steps**:
  1. Set up Application Insights with appropriate sampling
  2. Configure structured logging with severity levels
  3. Add correlation IDs across service boundaries
  4. Implement custom metrics for business events
  5. Set up alerting for critical errors
  6. Configure log retention policies

### Common Error Codes and Resolution
| Error Code | Description | Resolution |
|------------|-------------|------------|
| AUTH001 | Azure AD token acquisition failure | Check client secret expiration and grant admin consent |
| PAT002 | DevOps/GitHub PAT validation error | Verify PAT has correct scopes and isn't expired |
| HOOK003 | Webhook signature validation failure | Check webhook secret configuration |
| BOT004 | Bot Framework message delivery failure | Verify conversation reference and retry with backoff |
| CARD005 | Adaptive card rendering error | Validate card against schema and test in Card Designer |
| API006 | DevOps/GitHub API rate limiting | Implement retry with exponential backoff |

### Diagnostic Tools and Resources
- **Bot Framework Emulator**: Local testing of bot functionality
  - Configure with App ID and password
  - Test webhook endpoints locally
  - Inspect message payloads
- **Application Insights**: Production monitoring
  - Live Metrics stream for real-time monitoring
  - Failure analysis for tracking exceptions
  - Performance monitoring for bottlenecks
  - Custom queries for specific scenarios
- **Webhook Testing Tools**:
  - Postman for manual webhook testing
  - GitHub webhook delivery inspection
  - Azure DevOps service hook logs

## Deployment Troubleshooting

### Azure Resource Deployment Issues
- **Symptoms**:
  - ARM template deployment failures
  - Missing resources after deployment
  - Configuration errors post-deployment
- **Potential Causes**:
  - Template validation errors
  - Parameter values incorrect
  - Resource naming conflicts
  - Permission issues during deployment
- **Resolution Steps**:
  1. Validate ARM template before deployment
  2. Check all parameter values against requirements
  3. Use unique resource names with namespacing
  4. Verify deployment logs in Azure Portal
  5. Ensure service principal has contributor permissions

### Bot Registration Deployment Problems
- **Symptoms**:
  - Bot registration missing or incorrect
  - Endpoint mismatch after deployment
  - Channel registration failures
- **Potential Causes**:
  - Missing Bot Framework resource
  - Incorrect endpoint configuration
  - Manual registration steps missed
  - Multi-environment confusion
- **Resolution Steps**:
  1. Include Bot Framework resource in ARM template
  2. Automate endpoint configuration post-deployment
  3. Verify all channels are properly registered
  4. Use environment-specific bot registrations
  5. Document any required manual steps

### Teams App Package Deployment Issues
- **Symptoms**:
  - App manifest validation errors
  - Unable to upload app package
  - App not appearing in Teams after upload
- **Potential Causes**:
  - Manifest schema validation failures
  - Icon format or size issues
  - BotId mismatch with registration
  - Missing required fields
- **Resolution Steps**:
  1. Validate manifest against Teams schema
  2. Check icon files meet Teams requirements (PNG, 192x192)
  3. Verify botId matches Bot Framework registration
  4. Include all required fields in manifest
  5. Test package with App Studio before deployment

## FAQ

### How do I reset the bot if it stops responding?
- **Solution**: Try the following steps in order:
  1. Restart the Azure App Service
  2. Clear the bot's state in your storage account (if applicable)
  3. Remove and re-add the bot to Teams
  4. Check Application Insights for specific error messages
  5. If using a custom domain, verify SSL certificate is valid

### Why are notifications delayed sometimes?
- **Solution**: Notification delays can result from:
  1. Azure DevOps/GitHub webhook processing delays
  2. Bot service scaling during high load
  3. Teams message delivery throttling
  4. Background processing queues backing up
  
  Implement webhook processing metrics to identify the specific bottleneck.

### How do I add support for a new DevOps project?
- **Solution**:
  1. Add a new service hook in Azure DevOps Project Settings
  2. Configure the webhook URL to point to your bot's endpoint
  3. Select appropriate event filters (releases, builds, etc.)
  4. Test the webhook with a manual release
  5. Update any project-specific configuration in the bot

### What permissions are needed for full functionality?
- **Solution**: The following permissions are required:
  - Azure DevOps: `vso.release_execute`, `vso.build_execute`, `vso.project`
  - GitHub: `repo`, `workflow`, `admin:org` (if using organization features)
  - Teams: `TeamsAppInstallation.ReadWriteSelfForChat.All` (for proactive messaging)
  - Microsoft Graph: `User.Read`, `Group.Read.All` (for user targeting)

### How can I customize the notification cards?
- **Solution**:
  1. Modify Adaptive Card templates in the bot's code
  2. Use Adaptive Cards Designer to preview changes
  3. Add conditional elements based on release information
  4. Update the release summary format as needed
  5. Test on different Teams clients (desktop, mobile, web)

### Why are some users not receiving notifications?
- **Solution**:
  1. Verify the user is part of the target Teams channel or chat
  2. Check user notification settings in Teams
  3. Ensure the bot has been installed for the user
  4. Validate conversation references are up-to-date
  5. Check for tenant-specific message policies blocking notifications
