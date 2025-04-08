# ARM Template Library for Azure Functions

## Overview

Azure Resource Manager (ARM) templates provide a declarative approach to define and deploy Azure Functions and their dependencies. This ARM Template Library offers reusable templates, patterns, and best practices for deploying Azure Functions infrastructure using Infrastructure as Code (IaC).

## Benefits of ARM Templates for Azure Functions

- **Declarative Syntax**: Define the desired state of your Azure Functions infrastructure
- **Idempotent Deployments**: Deploy the same template multiple times with consistent results
- **Version Control**: Track infrastructure changes alongside application code
- **Validation**: Catch errors early through template validation
- **CI/CD Integration**: Automate deployments through Azure DevOps, GitHub Actions, or other CI/CD tools
- **Environment Consistency**: Ensure development, testing, and production environments use identical configurations

## Core Templates

### Basic Function App (Consumption Plan)

This template creates a minimal Azure Function app with its required resources on a Consumption plan:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "functionAppName": {
      "type": "string",
      "metadata": {
        "description": "Name of the function app"
      }
    },
    "storageAccountName": {
      "type": "string",
      "metadata": {
        "description": "Name of the storage account"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]",
      "metadata": {
        "description": "Location for all resources"
      }
    },
    "runtime": {
      "type": "string",
      "defaultValue": "dotnet",
      "allowedValues": ["node", "dotnet", "java", "python"],
      "metadata": {
        "description": "The language worker runtime"
      }
    }
  },
  "variables": {
    "hostingPlanName": "[parameters('functionAppName')]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2022-09-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_LRS"
      },
      "kind": "StorageV2"
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2022-03-01",
      "name": "[variables('hostingPlanName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Y1",
        "tier": "Dynamic"
      },
      "properties": {
        "name": "[variables('hostingPlanName')]",
        "computeMode": "Dynamic"
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2022-03-01",
      "name": "[parameters('functionAppName')]",
      "location": "[parameters('location')]",
      "kind": "functionapp",
      "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', variables('hostingPlanName'))]",
        "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
      ],
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('hostingPlanName'))]",
        "siteConfig": {
          "appSettings": [
            {
              "name": "AzureWebJobsStorage",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';EndpointSuffix=', environment().suffixes.storage, ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2022-09-01').keys[0].value)]"
            },
            {
              "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';EndpointSuffix=', environment().suffixes.storage, ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2022-09-01').keys[0].value)]"
            },
            {
              "name": "FUNCTIONS_EXTENSION_VERSION",
              "value": "~4"
            },
            {
              "name": "FUNCTIONS_WORKER_RUNTIME",
              "value": "[parameters('runtime')]"
            },
            {
              "name": "WEBSITE_RUN_FROM_PACKAGE",
              "value": "1"
            }
          ]
        }
      }
    }
  ],
  "outputs": {
    "functionAppUrl": {
      "type": "string",
      "value": "[concat('https://', parameters('functionAppName'), '.azurewebsites.net')]"
    }
  }
}
```

### Premium Function App

This template creates a Function App with Premium plan for enhanced performance and features:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "functionAppName": { "type": "string" },
    "storageAccountName": { "type": "string" },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    },
    "runtime": {
      "type": "string",
      "defaultValue": "dotnet",
      "allowedValues": ["node", "dotnet", "java", "python"]
    },
    "planSku": {
      "type": "string",
      "defaultValue": "EP1",
      "allowedValues": ["EP1", "EP2", "EP3"]
    }
  },
  "variables": {
    "hostingPlanName": "[concat(parameters('functionAppName'), '-plan')]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2022-09-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": { "name": "Standard_LRS" },
      "kind": "StorageV2"
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "apiVersion": "2022-03-01",
      "name": "[variables('hostingPlanName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "[parameters('planSku')]",
        "tier": "ElasticPremium"
      },
      "properties": {
        "maximumElasticWorkerCount": 20
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2022-03-01",
      "name": "[parameters('functionAppName')]",
      "location": "[parameters('location')]",
      "kind": "functionapp",
      "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', variables('hostingPlanName'))]",
        "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
      ],
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', variables('hostingPlanName'))]",
        "siteConfig": {
          "appSettings": [
            {
              "name": "AzureWebJobsStorage",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';EndpointSuffix=', environment().suffixes.storage, ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2022-09-01').keys[0].value)]"
            },
            {
              "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', parameters('storageAccountName'), ';EndpointSuffix=', environment().suffixes.storage, ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName')), '2022-09-01').keys[0].value)]"
            },
            {
              "name": "FUNCTIONS_EXTENSION_VERSION",
              "value": "~4"
            },
            {
              "name": "FUNCTIONS_WORKER_RUNTIME",
              "value": "[parameters('runtime')]"
            },
            {
              "name": "WEBSITE_RUN_FROM_PACKAGE",
              "value": "1"
            }
          ]
        }
      }
    }
  ],
  "outputs": {
    "functionAppUrl": {
      "type": "string",
      "value": "[concat('https://', parameters('functionAppName'), '.azurewebsites.net')]"
    }
  }
}
```

## Specialized Templates

### Function App with Application Insights

This template adds comprehensive monitoring capabilities to your Function App:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "functionAppName": { "type": "string" },
    "storageAccountName": { "type": "string" },
    "applicationInsightsName": { "type": "string" },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Insights/components",
      "apiVersion": "2020-02-02",
      "name": "[parameters('applicationInsightsName')]",
      "location": "[parameters('location')]",
      "kind": "web",
      "properties": {
        "Application_Type": "web",
        "Request_Source": "IbizaWebAppExtensionCreate"
      }
    },
    // Storage account and function app resources with App Insights integration
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2022-03-01",
      "name": "[parameters('functionAppName')]",
      "properties": {
        "siteConfig": {
          "appSettings": [
            // Other app settings...
            {
              "name": "APPINSIGHTS_INSTRUMENTATIONKEY",
              "value": "[reference(resourceId('Microsoft.Insights/components', parameters('applicationInsightsName')), '2020-02-02').InstrumentationKey]"
            },
            {
              "name": "APPLICATIONINSIGHTS_CONNECTION_STRING",
              "value": "[reference(resourceId('Microsoft.Insights/components', parameters('applicationInsightsName')), '2020-02-02').ConnectionString]"
            }
          ]
        }
      },
      "dependsOn": [
        "[resourceId('Microsoft.Insights/components', parameters('applicationInsightsName'))]"
      ]
    }
  ]
}
```

### Function App with Key Vault Integration

Securely store and access secrets with Key Vault integration:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "functionAppName": { "type": "string" },
    "keyVaultName": { "type": "string" },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "resources": [
    {
      "type": "Microsoft.KeyVault/vaults",
      "apiVersion": "2022-07-01",
      "name": "[parameters('keyVaultName')]",
      "location": "[parameters('location')]",
      "properties": {
        "tenantId": "[subscription().tenantId]",
        "sku": {
          "family": "A",
          "name": "standard"
        },
        "accessPolicies": []
      }
    },
    // Function app with system-assigned managed identity
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2022-03-01",
      "name": "[parameters('functionAppName')]",
      "identity": {
        "type": "SystemAssigned"
      },
      "properties": {
        "siteConfig": {
          "appSettings": [
            // Other app settings...
            {
              "name": "AZURE_KEY_VAULT_ENDPOINT",
              "value": "[reference(resourceId('Microsoft.KeyVault/vaults', parameters('keyVaultName'))).vaultUri]"
            }
          ]
        }
      }
    },
    // Key Vault access policy for the function app
    {
      "type": "Microsoft.KeyVault/vaults/accessPolicies",
      "apiVersion": "2022-07-01",
      "name": "[concat(parameters('keyVaultName'), '/add')]",
      "dependsOn": [
        "[resourceId('Microsoft.Web/sites', parameters('functionAppName'))]",
        "[resourceId('Microsoft.KeyVault/vaults', parameters('keyVaultName'))]"
      ],
      "properties": {
        "accessPolicies": [
          {
            "tenantId": "[subscription().tenantId]",
            "objectId": "[reference(resourceId('Microsoft.Web/sites', parameters('functionAppName')), '2022-03-01', 'Full').identity.principalId]",
            "permissions": {
              "secrets": ["get", "list"]
            }
          }
        ]
      }
    }
  ]
}
```

## Best Practices for ARM Templates

### Template Organization

- **Limit template size**: Keep templates under 4MB, with resource definitions under 1MB
- **Use parameter files**: Store environment-specific values in separate parameter files
- **Template modularization**: Break complex deployments into linked/nested templates
- **Resource dependencies**: Explicitly define dependencies using the `dependsOn` property

### Security

- **Use managed identities**: Replace connection strings with managed identities where possible
- **Parameter validation**: Add constraints to parameters to enforce security standards
- **Secure secrets**: Utilize Key Vault references for secrets instead of embedding them
- **Least privilege**: Apply principle of least privilege for all service identities

### Deployment Tooling

- **Use ARM Tools extension**: Install the Azure Resource Manager Tools for Visual Studio Code
- **ARM template test toolkit**: Validate templates against best practices before deployment
- **CI/CD integration**: Automate template validation and deployment through pipelines

## Deployment Methods

### Azure Portal

```powershell
# Navigate to: https://portal.azure.com/#create/Microsoft.Template
# Use "Build your own template in the editor" option
```

### Azure CLI

```bash
# Create resource group
az group create --name MyFunctionResourceGroup --location eastus

# Deploy ARM template
az deployment group create \
  --name FunctionDeployment \
  --resource-group MyFunctionResourceGroup \
  --template-file template.json \
  --parameters parameters.json
```

### Azure PowerShell

```powershell
# Create resource group
New-AzResourceGroup -Name MyFunctionResourceGroup -Location eastus

# Deploy ARM template
New-AzResourceGroupDeployment `
  -Name FunctionDeployment `
  -ResourceGroupName MyFunctionResourceGroup `
  -TemplateFile template.json `
  -TemplateParameterFile parameters.json
```

### GitHub Actions

```yaml
- name: Deploy ARM Template
  uses: azure/arm-deploy@v1
  with:
    subscriptionId: ${{ secrets.AZURE_SUBSCRIPTION }}
    resourceGroupName: MyFunctionResourceGroup
    template: ./template.json
    parameters: ./parameters.json
```

## References and Resources

- [Official Microsoft ARM Template documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/)
- [Azure Functions ARM Template samples](https://github.com/Azure-Samples/function-app-arm-templates)
- [ARM Template best practices](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/best-practices)
- [ARM Template test toolkit](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/test-toolkit)
- [Bicep for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-infrastructure-as-code)
