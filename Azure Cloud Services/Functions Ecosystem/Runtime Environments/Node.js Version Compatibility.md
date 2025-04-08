# Node.js Version Compatibility in Azure Functions

## Overview

This document provides comprehensive guidance on Node.js version compatibility within Azure Functions, including supported versions, migration strategies, and configuration best practices. Understanding the relationship between Azure Functions runtime versions and Node.js versions is crucial for developing reliable and future-proof serverless applications.

## Supported Node.js Versions

The compatibility between Node.js versions and Azure Functions is determined by the Functions runtime version. Each runtime version supports specific Node.js versions, as outlined below:

### Functions Runtime v4.x (Current)

| Node.js Version | Windows Support | Linux Support | Notes |
|-----------------|----------------|--------------|-------|
| 20.x (LTS) | ✓ | ✓ | Recommended for new projects |
| 18.x (LTS) | ✓ | ✓ | Full support |
| 16.x (LTS) | ✓ | ✓ | Supported |
| 14.x | ❌ | ❌ | No longer supported |
| 12.x | ❌ | ❌ | No longer supported |

### Functions Runtime v1.x

| Node.js Version | Windows Support | Linux Support | Notes |
|-----------------|----------------|--------------|-------|
| 8.x | ✓ | ❌ | Deprecated, migration recommended |
| 6.x | ✓ | ❌ | Deprecated, migration recommended |

> **Note**: All functions in a function app must share the same language. The language is specified in the `FUNCTIONS_WORKER_RUNTIME` setting, which cannot be changed once functions are added.

## Programming Models

In addition to runtime versions, Node.js in Azure Functions has its own programming models:

| Programming Model | Description | Supported Runtime Versions |
|-------------------|-------------|----------------------------|
| v4 | Modern model with code-centric approach | Functions runtime v4.x |
| v3 | Legacy model | Functions runtime v3.x, v4.x |

> **Important**: The programming model version corresponds to the version of the `@azure/functions` npm package, not the Functions runtime version. However, both currently use "4" as their latest major version.

## Configuration Options

### Windows Function Apps

For Windows-hosted function apps, configure the Node.js version through an application setting:

1. **Via Azure Portal**:
   - Navigate to your function app
   - Select **Configuration** > **Application settings**
   - Add or update `WEBSITE_NODE_DEFAULT_VERSION` to `~20` (or your desired major version)
   - Format: `~[MAJOR_VERSION]` (e.g., `~20` for Node.js 20.x)

2. **Via Azure CLI**:
   ```bash
   az functionapp config appsettings set --settings WEBSITE_NODE_DEFAULT_VERSION=~20 \
     --name <FUNCTION_APP_NAME> --resource-group <RESOURCE_GROUP_NAME>
   ```

### Linux Function Apps

For Linux-hosted function apps, Node.js version is configured through the container image:

1. **Premium and Dedicated Plans** (via Azure Portal):
   - Navigate to your function app
   - Select **Configuration** > **General settings**
   - Modify the **Node.js Version** dropdown
   - Save your changes

2. **Via Azure CLI** (all plans):
   ```bash
   az functionapp config set --name <FUNCTION_APP_NAME> \
     --resource-group <RESOURCE_GROUP_NAME> \
     --linux-fx-version "node|20"
   ```

3. **Consumption Plan**:
   - Must use CLI or ARM templates to set `linuxFxVersion`
   - Format: `node|[VERSION]` (e.g., `node|20`)

## Best Practices

### Version Selection

1. **Use LTS Versions**: Always prefer Long-Term Support (LTS) Node.js versions for production applications.

2. **Align Environments**: Ensure local development, CI/CD pipelines, and production environments use the same Node.js version.

3. **Future-Proof**: Select the latest LTS version when creating new projects to maximize support lifetime.

4. **Plan for Upgrades**: Stay informed about Node.js version EOL dates and plan migrations accordingly.

### Development Environment

1. **Core Tools Version**: Use Azure Functions Core Tools version that matches your target runtime.

2. **Local Settings**: Configure local.settings.json with the appropriate Node.js version settings:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "WEBSITE_NODE_DEFAULT_VERSION": "~20",
       "FUNCTIONS_EXTENSION_VERSION": "~4"
     }
   }
   ```

3. **Version Manager**: Consider using nvm (Node Version Manager) to easily switch between Node.js versions during development.

## Migration Strategies

### Upgrading Node.js Version

1. **Assessment Phase**:
   - Review package.json dependencies for compatibility
   - Identify deprecated APIs in your code
   - Run tests against the target Node.js version

2. **Update Application Settings**:
   - Windows: Update WEBSITE_NODE_DEFAULT_VERSION
   - Linux: Update linuxFxVersion 

3. **Testing**:
   - Deploy to a staging environment
   - Validate functionality
   - Monitor for performance changes

4. **Rollback Plan**:
   - Document the previous configuration
   - Prepare reversion scripts if issues arise

### Upgrading Programming Model from v3 to v4

1. **Package Update**:
   - Update @azure/functions package to v4:
   ```bash
   npm install @azure/functions@4
   ```

2. **Code Modifications**:
   - Update function handlers to match v4 pattern
   - Move logging methods to context.log
   - Update HTTP handling to match fetch standard

3. **Package.json Update**:
   - Ensure main field points to entry point
   - Set type to module for ESM support (optional)

4. **File Structure**:
   - Restructure code as needed (v4 allows flexible file structure)

## Troubleshooting

### Common Issues

1. **Incompatible Node.js Version Error**:
   - **Symptoms**: "Incompatible Node.js version" error when running locally
   - **Solution**: 
     - Update local Node.js version to match target environment
     - Update WEBSITE_NODE_DEFAULT_VERSION in local.settings.json
     - Verify Functions Core Tools version is compatible

2. **HTTP Streaming Issues**:
   - **Symptoms**: HTTP streaming not functioning correctly
   - **Requirements**:
     - @azure/functions package v4.3.0+
     - Functions runtime v4.28+
     - Core Tools v4.0.5530+

3. **Dependency Conflicts**:
   - **Symptoms**: Module not found or version conflicts
   - **Solution**:
     - Clean npm cache
     - Update package-lock.json
     - Consider using package overrides

### Diagnostic Steps

1. **Verify Environment**:
   ```bash
   # Check Node.js version
   node -v
   
   # Check Functions Core Tools version
   func --version
   
   # Check Azure CLI version
   az --version
   ```

2. **Inspect Runtime Configuration**:
   ```bash
   # Get function app status
   curl https://<function-app-name>.azurewebsites.net/admin/host/status?code=<master-key>
   
   # List application settings
   az functionapp config appsettings list --name <function-app-name> --resource-group <resource-group-name>
   ```

3. **Logging and Monitoring**:
   - Enable Application Insights
   - Check function execution logs
   - Monitor cold start times after version changes

## Advanced Features

### HTTP Streams

Available in Node.js v4 programming model with Functions runtime v4.28+, HTTP streaming enables:

- Real-time data exchange
- Processing large payloads
- Streaming responses (e.g., for AI content generation)

Requirements:
- @azure/functions package v4.3.0+
- Azure Functions runtime v4.28+
- Functions Core Tools v4.0.5530+

### ESM Support

Node.js ECMAScript modules (ESM) support:

1. **Configuration**:
   - Set "type": "module" in package.json
   - Use .mjs file extension or .js with type:module

2. **Import Patterns**:
   ```javascript
   // ESM style imports
   import { app } from '@azure/functions';
   ```

### TypeScript Integration

For TypeScript projects:

1. **Dependencies**:
   ```bash
   npm install typescript ts-node @types/node --save-dev
   ```

2. **tsconfig.json**:
   ```json
   {
     "compilerOptions": {
       "target": "es2022",
       "module": "node16",
       "moduleResolution": "node16",
       "outDir": "dist",
       "rootDir": ".",
       "strict": true,
       "esModuleInterop": true
     }
   }
   ```

3. **Build Scripts**:
   ```json
   "scripts": {
     "build": "tsc",
     "prestart": "npm run build",
     "start": "func start"
   }
   ```

## References

- [Node.js Developer Reference for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Functions Runtime Versions Overview](https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions)
- [How to Target Azure Functions Runtime Versions](https://learn.microsoft.com/en-us/azure/azure-functions/set-runtime-version)
- [Migrate to v4 of the Node.js Model for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4)
- [Use Correct Version of Node.js for Azure](https://learn.microsoft.com/en-us/azure/developer/javascript/choose-nodejs-version)
