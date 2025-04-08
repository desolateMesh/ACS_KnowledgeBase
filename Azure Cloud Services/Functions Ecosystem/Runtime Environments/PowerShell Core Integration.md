# PowerShell Core Integration with Azure Functions

## Overview

PowerShell Core support in Azure Functions combines the flexibility of PowerShell scripting with the serverless capabilities of Azure Functions. This integration enables IT professionals and DevOps teams to build event-driven automation workflows using familiar PowerShell syntax while leveraging the scalability and reliability of the Azure Functions platform.

## Key Features

- **PowerShell 7.x Support**: Full support for PowerShell Core (PowerShell 7.x) in production environments
- **Managed Dependencies**: Automatic module installation and updates from PowerShell Gallery
- **Azure PowerShell Integration**: Native support for Az modules for Azure resource management
- **Profile Script Support**: Use profile.ps1 for shared code and initialization tasks
- **Custom Module Support**: Create and include custom PowerShell modules
- **Identity-Based Authentication**: Leverage managed identities for secure Azure authentication
- **Local Development Experience**: Full local debugging support with VS Code and Azure Functions Core Tools

## Configuration Essentials

### Host.json Configuration

The host.json file contains important settings for PowerShell Functions:

```json
{
  "version": "2.0",
  "managedDependency": {
    "enabled": true
  },
  "logging": {
    "logLevel": {
      "default": "Information"
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}
```

The `managedDependency` property is particularly important as it enables automatic module management.

### Module Management Options

#### Option 1: Managed Dependencies

Use requirements.psd1 to specify module dependencies:

```powershell
@{
    'Az' = '9.*'
    'Az.Storage' = '5.*'
    'Microsoft.Graph.Authentication' = '1.*'
}
```

**Advantages**:
- Automatic installation and updates
- Reduced deployment size
- Simplified module management

**Considerations**:
- Requires internet access to PowerShell Gallery
- Doesn't support modules requiring license acceptance
- Not supported in Flex Consumption plan

#### Option 2: Custom Modules

Include modules directly in your function app:

1. Create a `modules` folder in the function app root
2. Copy required modules to this folder or use Save-Module
3. Azure Functions will automatically import modules from this location

**Advantages**:
- Works in air-gapped environments
- Complete control over module versions
- No dependency on external repositories

**Considerations**:
- Requires manual updates for security patches
- Increases deployment package size
- Requires management of dependencies

## Authentication Methods

### Managed Identity Authentication

For secure, passwordless authentication to Azure resources:

```powershell
# Use implicit managed identity authentication
Connect-AzAccount -Identity

# Perform operations against Azure resources
$storageAccount = Get-AzStorageAccount -ResourceGroupName "myResourceGroup" -Name "myStorageAccount"
```

### Alternative Authentication Methods

- **Service Principal**: For cross-tenant scenarios or specific permission scopes
- **Certificate-Based**: For enhanced security requirements
- **User-Delegated**: For operations requiring user context

## Best Practices

### Performance Optimization

1. **Minimize Cold Starts**:
   - Use the Premium plan for latency-sensitive operations
   - Keep function code small and efficient
   - Utilize durable functions for long-running operations
 
2. **Module Efficiency**:
   - Import only required modules
   - Use specific module imports rather than entire Az module
   - Consider pre-loading modules in profile.ps1

3. **Resource Management**:
   - Close connections and dispose of objects when finished
   - Use connection pooling where appropriate
   - Implement proper error handling with try/catch blocks

### Code Organization

1. **Modular Design**:
   - Separate business logic from function entry points
   - Create reusable PowerShell modules for shared logic
   - Use classes for complex data structures and interfaces

2. **Effective Testing**:
   - Implement Pester tests for unit testing
   - Use mock commands to isolate function logic
   - Test with local.settings.json for environment variables

3. **Error Handling**:
   - Implement proper exception handling
   - Return appropriate HTTP status codes (for HTTP triggers)
   - Use Write-Error for system logging of errors

### Deployment Strategies

1. **CI/CD Integration**:
   - Use Azure DevOps pipelines or GitHub Actions
   - Implement automated testing before deployment
   - Consider deployment slots for zero-downtime updates

2. **Environment Management**:
   - Use application settings for configuration
   - Separate development, testing, and production environments
   - Implement proper secrets management with Key Vault

## Common Patterns and Use Cases

### Infrastructure Automation

PowerShell Functions excel at infrastructure management tasks:

- Resource provisioning and deprovisioning
- Scheduled environment cleanup
- Cost optimization routines
- Compliance and security scanning

### Integration Scenarios

- Cross-system data synchronization
- API integrations with legacy systems
- Event-driven notifications and alerts
- File processing and transformation

### Governance Enforcement

- Resource tagging enforcement
- Policy compliance checking
- Budget alerts and notifications
- Resource usage reporting

## Troubleshooting

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Module installation failures | Check PowerShell Gallery connectivity, verify module compatibility |
| Execution timeout | Increase timeout setting or implement durable functions |
| Memory constraints | Optimize code, reduce dependencies, or upgrade plan |
| Authentication errors | Verify identity permissions, check token expiration |
| Cold start delays | Use Premium plan with pre-warmed instances |

### Logging Best Practices

1. **Structured Logging**:
   - Use Write-Information, Write-Warning, Write-Error appropriately
   - Implement consistent log format with relevant context
   - Include correlation IDs for distributed operations

2. **Log Levels**:
   - Configure appropriate log levels in host.json
   - Use Application Insights for advanced monitoring
   - Implement custom dimensions for filtering

## Sample Implementation

### HTTP Trigger With Azure Resource Management

```powershell
using namespace System.Net

# Input bindings are passed in via param block
param($Request, $TriggerMetadata)

# Write to the Azure Functions log stream
Write-Host "Processing request for resource inventory"

# Authenticate to Azure using managed identity
try {
    Connect-AzAccount -Identity
    $resourceGroup = $Request.Query.ResourceGroup
    
    if (-not $resourceGroup) {
        $resourceGroup = $Request.Body.ResourceGroup
    }
    
    if (-not $resourceGroup) {
        $body = "Please provide a resource group name"
        Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::BadRequest
            Body = $body
        })
        return
    }
    
    # Get resources in the specified resource group
    $resources = Get-AzResource -ResourceGroupName $resourceGroup
    
    # Return response
    $body = $resources | ConvertTo-Json -Depth 4
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body = $body
        Headers = @{'Content-Type' = 'application/json'}
    })
} catch {
    Write-Error "Error processing request: $_"
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::InternalServerError
        Body = "Error retrieving resources: $_"
    })
}
```

## Migration Considerations

### From PowerShell 5.1 to PowerShell 7.x

- Review module compatibility with PowerShell 7.x
- Update Windows PowerShell-specific syntax
- Test with local development environment before deployment
- Consider leveraging new PowerShell 7.x features (parallel execution, ternary operators, etc.)

### From Azure Automation to PowerShell Functions

- Re-architect runbooks as functions
- Implement appropriate trigger types
- Adjust authentication methods
- Review execution context differences

## References and Additional Resources

- [PowerShell Developer Reference for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-powershell)
- [Create a PowerShell Function Using VS Code](https://learn.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-powershell)
- [Azure Functions Best Practices](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
- [Develop Azure Functions Locally Using Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
