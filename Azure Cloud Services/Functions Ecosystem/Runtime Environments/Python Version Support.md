# Python Version Support in Azure Functions

## Overview

Azure Functions provides robust support for Python applications, enabling developers to build serverless solutions using Python's rich ecosystem. This document outlines the compatibility between Python versions and Azure Functions, configuration options, and best practices for developing and deploying Python-based serverless applications.

## Supported Python Versions

Azure Functions supports specific Python versions depending on the Functions runtime version. All Python functions in Azure run on Linux-based hosting plans.

### Current Support Matrix

| Functions Runtime | Python Versions | Status |
|------------------|-----------------|--------|
| 4.x (Current) | 3.12 | Supported |
| 4.x | 3.11 | Supported |
| 4.x | 3.10 | Supported |
| 4.x | 3.9 | Supported |
| 4.x | 3.8 | Supported |
| 4.x | 3.7 | No longer supported |
| 4.x | 3.6 | No longer supported |
| 3.x (EOL) | 3.9 | Not recommended (runtime EOL) |
| 3.x (EOL) | 3.8 | Not recommended (runtime EOL) |
| 3.x (EOL) | 3.7 | Not recommended (runtime EOL) |
| 3.x (EOL) | 3.6 | Not recommended (runtime EOL) |
| 2.x (EOL) | 3.6 | Not recommended (runtime EOL) |

> **Note**: Azure Functions runs Python applications only on Linux-based hosting plans. Windows-based hosting is not supported for Python functions.

## Programming Models

Azure Functions supports two programming models for Python:

### Python v2 Programming Model (Recommended)

The Python v2 programming model provides a decorator-based approach for creating functions, offering a more intuitive and pythonic experience:

```python
import azure.functions as func

app = func.FunctionApp()

@app.function_name(name="HttpTrigger1")
@app.route(route="hello")
def test_function(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse(f"Hello from Python v2 model!")
```

This model is only supported on Functions runtime v4.x.

### Python v1 Programming Model (Legacy)

The original Python model uses a function.json file for configuration:

```python
import logging
import azure.functions as func

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger function processed a request.')
    return func.HttpResponse(f"Hello from Python v1 model!")
```

## Configuration

### Setting Python Version

#### For New Function Apps

When creating a new Function App in Azure, specify the Python version using one of these methods:

1. **Azure Portal**:
   - During function app creation, select the appropriate Python version from the Runtime stack dropdown

2. **Azure CLI**:
   ```bash
   az functionapp create --name <APP_NAME> \
     --storage-account <STORAGE_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --consumption-plan-location <REGION> \
     --runtime python \
     --runtime-version 3.11 \
     --functions-version 4
   ```

3. **Azure PowerShell**:
   ```powershell
   New-AzFunctionApp -Name <APP_NAME> `
     -StorageAccountName <STORAGE_NAME> `
     -ResourceGroupName <RESOURCE_GROUP> `
     -Location <REGION> `
     -Runtime Python `
     -RuntimeVersion 3.11 `
     -FunctionsVersion 4
   ```

#### Changing Python Version for Existing Apps

To change the Python version of an existing Function App:

1. **Azure CLI**:
   ```bash
   az functionapp config set --name <APP_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --linux-fx-version "PYTHON|3.11"
   ```

2. **Azure Portal**:
   - Navigate to the Function App
   - Under Settings > Configuration > General settings
   - Select the desired Python version
   - Save changes

> **Important**: Changing Python versions may require updates to your application code and dependencies to ensure compatibility.

### Local Development Configuration

For local development, ensure your local Python version matches the targeted Azure environment:

1. **Create a virtual environment with the matching Python version**:
   ```bash
   # Install the desired Python version if not already installed
   
   # Create a virtual environment
   python -m venv .venv --prompt .venv
   
   # Activate the virtual environment
   # On Windows:
   .venv\Scripts\activate
   # On macOS/Linux:
   source .venv/bin/activate
   ```

2. **Install required packages**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run locally with Azure Functions Core Tools**:
   ```bash
   func start
   ```

## Dependencies and Package Management

### requirements.txt

Define dependencies in a requirements.txt file at the project root:

```
azure-functions==1.18.0
numpy==1.26.3
pandas==2.1.4
```

> **Best Practice**: Pin specific versions to ensure consistent behavior between local development and Azure deployment.

### Using Python Native Dependencies

For packages with native dependencies:

1. **Enable remote build**:
   - Add the setting `--build remote` when deploying with Azure Functions Core Tools
   ```bash
   func azure functionapp publish <APP_NAME> --build remote
   ```

2. **Use custom Docker images** for complex dependency scenarios:
   - Create a Dockerfile based on the Azure Functions Python image
   - Install dependencies in the image
   - Deploy the custom image to Azure Functions

## Performance Optimization

### Asynchronous Functions

Enhance throughput by implementing asynchronous functions with `async`/`await`:

```python
import azure.functions as func
import asyncio

app = func.FunctionApp()

@app.function_name(name="AsyncFunction")
@app.route(route="async")
async def async_function(req: func.HttpRequest) -> func.HttpResponse:
    # Asynchronous operations
    await asyncio.sleep(1)
    return func.HttpResponse(f"Async function complete!")
```

### Worker Process Configuration

Improve performance by configuring multiple worker processes:

1. **Set the FUNCTIONS_WORKER_PROCESS_COUNT setting**:
   - Add to Application Settings in Azure Portal
   - Value range: 1-10 (default: 1)

2. **Enable shared memory**:
   - Set `PYTHON_ENABLE_SHARED_MEMORY_DATA_TRANSFER: 1`
   - Improves throughput for I/O operations

## Common Issues and Troubleshooting

### Module Not Found Errors

If encountering "ModuleNotFoundError: No module named 'module_name'":

1. **Check module version compatibility**:
   - Ensure packages support your Python version
   - Verify packages have Linux binaries (wheels)

2. **Version mismatch between environments**:
   - Align local Python version with Azure environment
   - Add explicit Python version constraint in requirements.txt

3. **Native dependencies**:
   - Use `--build remote` flag during deployment
   - Consider using a custom Docker image

### Error Resolution Steps

1. **Check Python version**:
   ```bash
   # Locally
   python --version
   
   # In Azure
   az functionapp config show --name <APP_NAME> \
     --resource-group <RESOURCE_GROUP> \
     --query linuxFxVersion
   ```

2. **Isolate worker dependencies**:
   - Set `PYTHON_ISOLATE_WORKER_DEPENDENCIES` to `1` (default) or `0`

3. **Enable diagnostic logs**:
   - Navigate to Function App > Monitoring > Log stream
   - Check application logs for specific error messages

## Best Practices

1. **Version Consistency**:
   - Use the same Python version across development, build, and production environments
   - Pin dependency versions in requirements.txt

2. **Use the Latest Programming Model**:
   - Prefer the Python v2 programming model for new projects
   - Consider migrating existing v1 model functions to v2

3. **Dependency Management**:
   - Regularly update dependencies for security patches
   - Use virtual environments for local development
   - Test deployments in a staging environment

4. **Performance Optimization**:
   - Implement asynchronous functions for I/O-bound operations
   - Configure multiple worker processes for CPU-bound operations
   - Minimize cold start times by keeping package dependencies lean

5. **Monitoring and Diagnostics**:
   - Enable Application Insights for comprehensive monitoring
   - Implement structured logging with appropriate log levels
   - Set up alerts for function failures and performance issues

## References

- [Python Developer Reference for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python)
- [Azure Functions Runtime Versions Overview](https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions)
- [Create a Python Function Using Visual Studio Code](https://learn.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-python)
- [Troubleshoot Python Function Apps](https://learn.microsoft.com/en-us/azure/azure-functions/recover-python-functions)
- [Azure Functions Python Library](https://github.com/Azure/azure-functions-python-library)
