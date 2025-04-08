# Deployment Slot Management for Azure Functions

## Overview

Azure Functions deployment slots provide a powerful way to manage and deploy function app instances. Slots allow you to run multiple instances of your function app, each with its own endpoint, supporting seamless deployment and testing strategies. This guide covers key concepts, best practices, and implementation patterns for effectively using deployment slots with Azure Functions.

## What Are Deployment Slots?

Deployment slots are separate function app instances that share the same underlying App Service Plan. Each slot has:

- A unique hostname and endpoint
- Its own configuration settings
- Independent application content
- The ability to be swapped with other slots, including production

Deployment slots are available in Standard, Premium, and Isolated App Service Plans. The number of available slots depends on your hosting plan.

## Key Benefits

- **Zero-Downtime Deployments**: Deploy updates to a staging slot and then swap to production with no downtime
- **Pre-Production Validation**: Test changes in a live environment before exposing them to production traffic
- **Quick Rollbacks**: If issues are detected after deployment, you can immediately swap back to restore the previous version
- **Automated Deployment Pipelines**: Integrate slots into your CI/CD workflows for reliable, automated deployments
- **Environment Isolation**: Keep development, staging, and production environments separate but easily manageable

## Slot Configuration Management

### Configuration Types

When working with deployment slots, it's important to understand how configuration settings are handled during a swap operation:

1. **Swappable Settings**: Settings that move with the app instance during a swap
2. **Slot-specific Settings (Sticky Settings)**: Settings that remain with the slot during a swap

By default, most application settings are swappable, meaning they move with the app instance when swapped. However, you can mark specific settings as "slot settings" to make them sticky to a particular slot.

### Slot-Specific Settings

The following settings are always slot-specific (never swapped):

- Publishing endpoints
- Custom domain names
- Private endpoints
- Scaling configuration
- WebJobs schedulers
- IP restrictions
- Always On setting
- Diagnostic settings
- Cross-origin resource sharing (CORS)

### Making Settings Slot-Specific

To make an application setting slot-specific:

1. In the Azure Portal, navigate to your function app
2. Go to **Configuration** > **Application settings**
3. Check the **Deployment slot setting** box next to the setting you want to make slot-specific
4. Save your changes

Using Azure CLI:

```bash
# For standard settings
az functionapp config appsettings set --name <app-name> --resource-group <resource-group> --settings MySetting=MyValue

# For slot-specific settings (will stay with the slot during a swap)
az functionapp config appsettings set --name <app-name> --resource-group <resource-group> --slot <slot-name> --slot-settings MySetting=MyValue
```

## Creating and Managing Slots

### Creating a Deployment Slot

#### Using Azure Portal

1. Navigate to your function app in the Azure Portal
2. Select **Deployment slots** from the sidebar
3. Click **+ Add Slot**
4. Provide a name for the slot (e.g., "staging" or "testing")
5. Choose whether to clone settings from an existing slot
6. Click **Add** to create the slot

#### Using Azure CLI

```bash
# Create a deployment slot
az functionapp deployment slot create --name <app-name> --resource-group <resource-group> --slot <slot-name>

# Clone settings from another slot (optional)
az functionapp config appsettings set --name <app-name> --resource-group <resource-group> --slot <slot-name> --settings-file <settings-file>
```

### Accessing Slot Endpoints

Each deployment slot has its own URL in the format:
`https://<app-name>-<slot-name>.azurewebsites.net`

For example, if your function app is named "myfunctionapp" and you create a slot named "staging", the URL for the staging slot would be:
`https://myfunctionapp-staging.azurewebsites.net`

## Deployment Strategies with Slots

### Basic Deployment and Swap

1. Deploy your application to a non-production slot (e.g., staging)
2. Test and validate the application in the staging environment
3. Swap the staging slot with production when ready

#### Performing a Swap

**Using Azure Portal:**
1. Navigate to your function app
2. Select **Deployment slots**
3. Click **Swap**
4. Select the source and target slots
5. Review the configuration changes that will occur
6. Click **Swap** to start the operation

**Using Azure CLI:**
```bash
# Swap staging slot with production
az functionapp deployment slot swap --name <app-name> --resource-group <resource-group> --slot staging --target-slot production
```

### Advanced Swap with Preview

For critical applications, you can use the "swap with preview" option to validate the swap before finalizing it:

1. Initiate a swap with preview
2. The settings from the target slot are applied to the source slot
3. Validate that your application works correctly with the new settings
4. Complete the swap to finalize the operation or cancel to revert

## Best Practices

### Function App Design for Slots

1. **Write Stateless Functions**: Ensure your functions don't rely on local instance state to operate correctly
2. **Handle Termination Gracefully**: Functions can be terminated during a swap, so implement defensive programming
3. **Use Slot-Specific Settings Wisely**: Mark connection strings and environment-specific configuration as slot-specific
4. **Avoid Shared Resources Conflicts**: Be cautious when slots share resources like storage accounts to prevent lease conflicts

### Storage Account Considerations

For Azure Functions deployment slots, consider:

1. **Separate Storage Accounts**: Use different storage accounts for production and non-production slots to avoid "lease already present" conflicts
2. **Blob Lease Management**: If sharing storage, implement proper lease management and release mechanisms
3. **Storage Settings as Slot-Specific**: Mark storage connection settings as slot-specific to prevent production data access issues

### CI/CD Integration

1. **Deploy to Slots in CI/CD**: Configure your CI/CD pipelines to deploy to a non-production slot first
2. **Automated Testing**: Run automated tests against the deployment slot before swapping
3. **Automated Swaps**: For lower environments, consider automating the swap operation after successful tests
4. **Manual Approval for Production**: Require manual approval before swapping to production

Example Azure DevOps Release Pipeline:

1. **Stage 1**: Deploy to staging slot
2. **Stage 2**: Run integration tests against staging slot
3. **Stage 3**: Require manual approval from release manager
4. **Stage 4**: Swap staging and production slots

## Common Issues and Troubleshooting

### Lease Conflicts

**Issue**: "Another app likely has the lease on this container" warnings after a swap

**Solution**:
1. Use separate storage accounts for different slots
2. Make the storage connection string a slot-specific setting
3. Implement proper lease release in your code

### App Service Plan Behavior

**Issue**: App Service Plans swapping with slots

**Solution**:
- For Consumption plans: This is expected behavior as each function app slot has its own Consumption plan
- For dedicated plans: All slots share the same App Service Plan and it doesn't get swapped

### Slot-Specific Settings Not Working

**Issue**: Settings marked as slot-specific still appear to swap

**Solution**:
1. Verify the setting is correctly marked as slot-specific
2. Check for dependent settings that might not be marked as slot-specific
3. Some settings related to unswappable features are automatically considered slot-specific

## References

- [Azure Functions Deployment Slots Documentation](https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-slots)
- [Azure App Service Deployment Best Practices](https://learn.microsoft.com/en-us/azure/app-service/deploy-best-practices)
- [Azure Functions Best Practices](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
- [Setting Up Staging Environments](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
