---
title: Azure Functions - Key Vault Reference Guide
date: 2025-04-08 # Generated Date
version: 1.0
author: ACS Knowledge Base Team
area: Azure Cloud Services/Functions Ecosystem/Security Center
status: Published
# AI Actionability Level: High
# Contains specific commands, troubleshooting logic, and delegation points.
tags:
  - azure functions
  - key vault
  - key vault reference
  - managed identity
  - security
  - secrets management
  - app settings
  - C#
  - RBAC
  - access policy
  - troubleshooting
  - automation
---
# Azure Functions: Key Vault Reference Guide
**Document Purpose:** This document provides a comprehensive guide on utilizing Azure Key Vault references within Azure Functions for secure secret management. It details the setup, configuration, best practices, troubleshooting, and automation considerations necessary for developers, IT support, and AI agents managing Azure Functions security.

**Target Audience:** Azure Developers, DevOps Engineers, Security Administrators, IT Support Personnel, AI Support Agents.

**Core Objective:** Enable Azure Functions to securely access secrets (like connection strings, API keys) stored in Azure Key Vault *without* storing them directly in Application Settings or code, primarily leveraging Managed Identities.

**Default Language Context:** C# / .NET (for code examples showing consumption)

---
## 1. Introduction: Why Use Key Vault References?
### 1.1 The Challenge: Managing Secrets in Azure Functions
Storing sensitive information like database connection strings, API keys, or certificates directly in Function App configuration (Application Settings) or source code poses significant security risks and management challenges:
* **Exposure Risk:** Secrets can be inadvertently checked into source control or exposed via configuration files.
* **Management Overhead:** Rotating secrets requires updating Function App settings across multiple environments, increasing the chance of errors or downtime.
* **Audit Complexity:** Tracking who accessed or modified secrets becomes difficult.

### 1.2 The Solution: Azure Key Vault & References
* **Azure Key Vault:** A centralized, secure cloud service for storing and managing application secrets, keys, and certificates. It provides hardware security modules (HSMs), access control, and audit logging.
* **Key Vault References:** A feature of Azure App Service and Azure Functions that allows you to reference secrets stored in Key Vault directly from your Application Settings. The Functions platform securely retrieves the secret value from Key Vault at runtime and injects it as if it were a standard application setting.

**Benefits:**
* **Enhanced Security:** Secrets are stored centrally and securely in Key Vault, not in Function App config or code.
* **Simplified Management:** Rotate secrets in Key Vault without changing Function App code or configuration references (if using latest version).
* **Improved Compliance & Auditing:** Leverage Key Vault's robust auditing features.
* **No Code Changes:** Accessing the secret in your function code remains the same as reading a standard app setting.

---
## 2. Prerequisites
Before configuring Key Vault references, ensure the following are available:
1.  **Azure Subscription:** Active Azure subscription with necessary permissions.
2.  **Azure Key Vault:** An existing Key Vault instance. If not, create one.
    *AI Action:* Check for existing Key Vault or guide user/delegate task for creation.
3.  **Azure Function App:** An existing Function App where secrets are needed.
    *AI Action:* Identify target Function App.
4.  **Permissions:** Your account (or the entity performing setup) needs permissions to:
    * Modify the Function App's configuration (e.g., `Contributor`, `Website Contributor` role on the Function App).
    * Manage access control on the Key Vault (e.g., `Owner`, `User Access Administrator` on the Key Vault or Subscription/Resource Group, or specific Key Vault RBAC roles like `Key Vault Administrator`).
    * Read secrets from the Key Vault (required for validation).

---
## 3. Core Component: Managed Identity for Authentication
**Key Principle:** The Function App needs an identity to securely authenticate with Key Vault. Using **Managed Identity** is the **strongly recommended** approach as it eliminates the need to manage credentials (like client IDs/secrets) within the Function App itself.

### 3.1 Types of Managed Identities
* **System-Assigned Managed Identity (SAMI):**
    * Created and managed directly lifecycle-tied to the Azure resource (the Function App).
    * Enabled per Function App.
    * Simpler setup for single-resource scenarios.
    * Automatically deleted when the Function App is deleted.
    **Generally Recommended** for most Function App scenarios unless the identity needs to be shared or pre-authorized.
* **User-Assigned Managed Identity (UAMI):**
    * Created as a standalone Azure resource.
    * Can be assigned to one or more Azure resources (Function Apps, VMs, etc.).
    * Lifecycle is independent of the Function App.
    * Useful when multiple resources need the same identity/permissions or when permissions need to be granted *before* the Function App exists.

### 3.2 Enabling Managed Identity
*(AI Action: Check if MI is enabled, guide user/delegate task to enable if needed)*

**Method 1: Azure Portal**
1.  Navigate to your Function App.
2.  Under "Settings", select "Identity".
3.  Select the "System assigned" tab.
4.  Toggle "Status" to **On**.
5.  Click "Save". Note the **Object (principal) ID** created.
6.  (Optional) For User assigned, select the "User assigned" tab, click "Add", and select your existing UAMI.

**Method 2: Azure CLI**
```bash
# Enable System-Assigned Managed Identity
az functionapp identity assign --name <YourFunctionAppName> --resource-group <YourResourceGroupName>

# Get the Principal ID (needed for granting access)
PRINCIPAL_ID=$(az functionapp identity show --name <YourFunctionAppName> --resource-group <YourResourceGroupName> --query principalId --output tsv)
echo "System-Assigned Principal ID: $PRINCIPAL_ID"

# --- OR ---
# Assign an existing User-Assigned Managed Identity
# First, get the UAMI Resource ID and Client ID
UAMI_RESOURCE_ID=$(az identity show --name <YourUAMIName> --resource-group <YourResourceGroupName> --query id --output tsv)
UAMI_PRINCIPAL_ID=$(az identity show --name <YourUAMIName> --resource-group <YourResourceGroupName> --query principalId --output tsv)

az functionapp identity assign --name <YourFunctionAppName> --resource-group <YourResourceGroupName> --identities $UAMI_RESOURCE_ID
echo "User-Assigned Principal ID: $UAMI_PRINCIPAL_ID"
# Use the UAMI_PRINCIPAL_ID when granting Key Vault access
```

---
## 4. Granting Function App Access to Key Vault
Once the Managed Identity is enabled, it needs permission to read secrets from the target Key Vault. RBAC is the preferred method.
*(AI Action: Check existing permissions, guide user/delegate task to grant permissions)*

### 4.1 Method 1: Role-Based Access Control (RBAC) - Recommended
**Why Preferred:** Aligns with standard Azure IAM, offers finer-grained control (can be scoped), easier to manage across Azure services. Uses the Azure Resource Manager (ARM) data plane.

**Required Role:** Key Vault Secrets User. This role grants the necessary Microsoft.KeyVault/vaults/secrets/getSecret/action permission.

**Scope:** Can be assigned at the Key Vault level (recommended), Resource Group, or Subscription level. Assign at the narrowest required scope.

**Granting Access via Azure CLI:**
```bash
# Variables (Set these first!)
FUNCTION_APP_NAME="<YourFunctionAppName>"
RESOURCE_GROUP_NAME="<YourResourceGroupName>"
KEY_VAULT_NAME="<YourVaultName>"

# Use the correct Principal ID obtained in Step 3.2
MANAGED_IDENTITY_PRINCIPAL_ID="<YourManagedIdentityPrincipalID>" # (From Step 3.2 CLI output)

# Assign 'Key Vault Secrets User' role at the Key Vault scope
az role assignment create --role "Key Vault Secrets User" \
    --assignee-object-id $MANAGED_IDENTITY_PRINCIPAL_ID \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME" \
    --assignee-principal-type ServicePrincipal # Use ServicePrincipal for both SAMI and UAMI
```

### 4.2 Method 2: Key Vault Access Policies (Legacy)
**How it Works:** Vault-specific policies configured directly on the Key Vault resource. Operates on the Key Vault data plane directly.

**Required Permission:** Get permission under "Secret permissions".

**Note:** While functional, Microsoft recommends transitioning to the RBAC model for consistency and granularity.

**Granting Access via Azure CLI:**
```bash
# Variables (Set these first!)
FUNCTION_APP_NAME="<YourFunctionAppName>"
RESOURCE_GROUP_NAME="<YourResourceGroupName>"
KEY_VAULT_NAME="<YourVaultName>"

# Use the correct Principal ID obtained in Step 3.2
MANAGED_IDENTITY_PRINCIPAL_ID="<YourManagedIdentityPrincipalID>" # (From Step 3.2 CLI output)

# Add Key Vault Access Policy
az keyvault set-policy --name $KEY_VAULT_NAME \
    --resource-group $RESOURCE_GROUP_NAME \
    --object-id $MANAGED_IDENTITY_PRINCIPAL_ID \
    --secret-permissions get
```

---
## 5. Configuring Key Vault References in Function App Settings
This is where you link an Application Setting name to a specific secret in Key Vault.
*(AI Action: Validate syntax, guide user/delegate task to set app setting)*

### 5.1 Reference Syntax
Use the following format for the value of your Application Setting:

**Option 1: Using Secret URI (Recommended for clarity)**
Retrieves a specific version of the secret.
```
@Microsoft.KeyVault(SecretUri=https://<YourVaultName>.vault.azure.net/secrets/<YourSecretName>/<YourSecretVersion>)
```

To reference the latest version, omit the version identifier from the URI:
```
@Microsoft.KeyVault(SecretUri=https://<YourVaultName>.vault.azure.net/secrets/<YourSecretName>/)
```

**Option 2: Using Vault Name and Secret Name**
Can reference the latest version or a specific version.
```
@Microsoft.KeyVault(VaultName=<YourVaultName>;SecretName=<YourSecretName>)
```

```
@Microsoft.KeyVault(VaultName=<YourVaultName>;SecretName=<YourSecretName>;SecretVersion=<YourSecretVersion>)
```

**Note:** This syntax might require additional permissions for the service principal used by the management plane if certain configurations are used, making the URI syntax generally more straightforward when using Managed Identity.

### 5.2 Configuration Methods

**Method 1: Azure Portal**
1. Navigate to your Function App.
2. Under "Settings", select "Configuration".
3. Under "Application settings", click "+ New application setting".
4. Enter the desired Name for your setting (e.g., MyDatabaseConnectionString).
5. Enter the Key Vault reference syntax (from 5.1) as the Value.
6. Click "OK".
7. Click "Save" at the top of the Configuration page. A restart may be prompted.

**Method 2: Azure CLI**
```bash
# Variables (Set these first!)
FUNCTION_APP_NAME="<YourFunctionAppName>"
RESOURCE_GROUP_NAME="<YourResourceGroupName>"
KEY_VAULT_NAME="<YourVaultName>"
SECRET_NAME="<YourSecretName>" # e.g., "CosmosDbConnectionString"
APP_SETTING_NAME="<YourAppSettingName>" # e.g., "ConnectionStrings:CosmosDB"

# --- Example using Secret URI (Latest Version) ---
SECRET_URI_LATEST="https://$KEY_VAULT_NAME.vault.azure.net/secrets/$SECRET_NAME/"

# Or for a specific version, get the full identifier:
# SECRET_URI_VERSIONED=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name $SECRET_NAME --query id -o tsv)

echo "Using Secret URI: $SECRET_URI_LATEST"

az functionapp config appsettings set --name $FUNCTION_APP_NAME \
    --resource-group $RESOURCE_GROUP_NAME \
    --settings "$APP_SETTING_NAME=@Microsoft.KeyVault(SecretUri=$SECRET_URI_LATEST)"

# --- Example using VaultName/SecretName (Latest Version) ---
# echo "Using VaultName/SecretName syntax"
# az functionapp config appsettings set --name $FUNCTION_APP_NAME \
#    --resource-group $RESOURCE_GROUP_NAME \
#    --settings "$APP_SETTING_NAME=@Microsoft.KeyVault(VaultName=$KEY_VAULT_NAME;SecretName=$SECRET_NAME)"
```

### 5.3 Consuming Secrets in Function Code (C# Example)
Key Vault references are resolved before the application code runs. Your code accesses them exactly like any other Application Setting or environment variable.

```csharp
using System;
using Microsoft.Extensions.Configuration; // Use this for .NET Core DI patterns
using Microsoft.Azure.Functions.Worker; // Or appropriate namespace for your model
using Microsoft.Extensions.Logging;

public class MyFunction
{
    private readonly IConfiguration _configuration;
    private readonly ILogger _logger;
    
    // Inject IConfiguration (recommended in .NET Isolated/DI models)
    public MyFunction(IConfiguration configuration, ILoggerFactory loggerFactory)
    {
        _configuration = configuration;
        _logger = loggerFactory.CreateLogger<MyFunction>();
    }
    
    [Function("MyHttpTrigger")]
    public void Run([HttpTrigger(AuthorizationLevel.Function, "get", "post")] /* HttpRequestData req */ )
    {
        // Option 1: Using IConfiguration (Recommended)
        string secretValue = _configuration["<YourAppSettingName>"]; // e.g., _configuration["ConnectionStrings:CosmosDB"]
        
        // Option 2: Using Environment Variables (Works in all models)
        // string secretValue = Environment.GetEnvironmentVariable("<YourAppSettingName>");
        
        if (string.IsNullOrEmpty(secretValue) || secretValue.StartsWith("@Microsoft.KeyVault("))
        {
            _logger.LogError("Failed to resolve Key Vault secret for setting: <YourAppSettingName>");
            // Handle error appropriately
        }
        else
        {
            _logger.LogInformation("Successfully retrieved secret.");
            // Use the secret value... Be careful not to log the actual secret!
        }
    }
}
```

---
## 6. Secret Rotation and Versioning Considerations

**Latest Version References:** (SecretUri without version, or VaultName/SecretName without version)
* The Function App automatically picks up the latest enabled version of the secret in Key Vault.
* **Refresh Cadence:** The platform checks for updated secret versions periodically (roughly every hour, but not guaranteed). Changes are not instantaneous.
* **Forcing Refresh:** Restarting the Function App will force an immediate refresh of all Key Vault references.

**Specific Version References:** (SecretUri with version, or VaultName/SecretName with version)
* The reference is pinned to that exact secret version.
* To use a new version, you must update the Application Setting with the new Secret URI or version identifier and restart the Function App.
* **Use Case:** Useful for controlled rollouts or when strict version alignment is required.

*(AI Action: Advise user on implications of rotation based on reference type, suggest restart if immediate update needed)*

---
## 7. Networking Considerations

If your Key Vault has network restrictions enabled (Firewall, Private Endpoints), ensure the Function App can reach it.

**Key Vault Firewall / Service Endpoints:**
* If enabled, you must allowlist the Function App's outbound IP addresses OR enable Service Endpoints for Microsoft.KeyVault on the subnet if the Function App is VNet integrated.
* *AI Action: Check Key Vault network settings, check Function App outbound IPs/VNet integration status, guide user/delegate task to update firewall rules or VNet config.*

**Key Vault Private Endpoint:**
* If the Key Vault uses a Private Endpoint, the Function App must be integrated into a Virtual Network that has connectivity (peering, private DNS zone integration) to the subnet hosting the Private Endpoint.
* Ensure DNS resolves the Key Vault name (<YourVaultName>.vault.azure.net) to the private IP address.
* *AI Action: Check Key Vault Private Endpoint status, check Function App VNet integration, check Private DNS Zone configuration, guide user/delegate task for network/DNS adjustments.*

---
## 8. Security Best Practices Checklist
*(AI Action: Audit Function App/Key Vault configuration against these practices)*

✅ **Use Managed Identity:** ALWAYS use System-Assigned or User-Assigned Managed Identity. Avoid storing credentials.

✅ **Use RBAC:** Prefer the RBAC model (Key Vault Secrets User role) over Access Policies for granting permissions.

✅ **Least Privilege:** Grant only the necessary permissions (Get for secrets needed at runtime). Avoid granting excessive permissions like List or Set to the runtime identity.

✅ **Separate Vaults:** Use distinct Key Vaults for different environments (Dev, Test, Prod) and potentially different applications.

✅ **Specific Versioning (Optional but Recommended):** Consider pinning critical secrets to specific versions in production for stability, updating deliberately during deployment windows. Use latest version references cautiously in production or for less critical secrets.

✅ **Secret Rotation:** Implement automated or manual processes to rotate secrets regularly according to your security policy.

✅ **Enable Key Vault Auditing:** Turn on Key Vault Diagnostic Logs and send them to Log Analytics or Storage for monitoring and alerting on secret access.

✅ **Protect Managed Identity:** Secure the Function App itself, as its identity holds the keys to the vault.

✅ **Review Permissions Regularly:** Periodically audit who/what has access to your Key Vaults.

❌ **Avoid Storing Secrets Elsewhere:** Do not fall back to storing secrets in app settings, code, or deployment pipelines.

---
## 9. Troubleshooting Common Issues
*(AI Reasoning: Use error messages/symptoms to diagnose and suggest resolution steps based on this section)*

| Symptom / Error Message | Potential Cause(s) | Troubleshooting Steps (AI/User Actions) |
|------------------------|-------------------|----------------------------------------|
| App Setting value shows as @Microsoft.KeyVault(...) | 1. Syntax error in the reference string.<br>2. Reference resolution failed (permissions, MI, networking).<br>3. Key Vault soft-deleted.<br>4. App needs restart. | 1. Verify Syntax: Double-check @Microsoft.KeyVault(...) format, Secret URI / VaultName/SecretName spelling, versions.<br>2. Check Permissions: Verify Managed Identity has Key Vault Secrets User RBAC role or Get secret permission via Access Policy (see Step 4).<br>3. Check MI: Ensure Managed Identity is enabled on Function App (see Step 3).<br>4. Check Networking: If KV firewall/PE is enabled, verify connectivity (see Step 7).<br>5. Check Vault Status: Ensure Key Vault is not soft-deleted (az keyvault list-deleted).<br>6. Restart Function App: az functionapp restart ... |
| Microsoft.KeyVault.SecretNotFound error in logs | 1. Secret name misspelled in reference.<br>2. Secret does not exist or is disabled/deleted.<br>3. Vault name misspelled (if using VaultName syntax).<br>4. Incorrect Vault specified. | 1. Verify Secret Name/Vault Name: Check spelling and case sensitivity against Key Vault.<br>2. Check Secret Existence: Confirm the secret exists and is enabled in the correct Key Vault (az keyvault secret show ...).<br>3. Check Reference Syntax: Ensure the correct vault and secret are referenced in the app setting. |
| Microsoft.KeyVault.Forbidden / Access denied in logs | 1. Permissions Issue: Managed Identity lacks required RBAC role or Access Policy permission.<br>2. Network Restriction: Key Vault firewall or Private Endpoint blocking access.<br>3. Incorrect Tenant: Managed Identity is in a different tenant than Key Vault (less common, requires specific cross-tenant setup). | 1. Verify Permissions: Re-check RBAC role assignment (Key Vault Secrets User) or Access Policy (Get secrets) for the Function App's MI Principal ID on the correct Key Vault (see Step 4). Allow time for propagation.<br>2. Verify Networking: Check KV Firewall/PE rules allow Function App outbound IPs or VNet (see Step 7). Use connection troubleshooting tools if needed.<br>3. Check Tenant ID: Ensure Function App MI and Key Vault are in the same Azure AD Tenant, or cross-tenant access is configured. |
| Secret value is outdated / Not reflecting recent changes | 1. Using latest-version reference and Function App cache hasn't expired (~1hr).<br>2. Using version-pinned reference, and the app setting wasn't updated. | 1. Restart Function App: Forces immediate refresh of all KV references. az functionapp restart ...<br>2. Wait: Allow up to ~1 hour for automatic cache refresh if using latest version.<br>3. Update App Setting: If pinned to a version, update the reference in Function App config to the new version URI/ID and restart. |
| Managed Identity authentication failure (general) | 1. System/User Assigned MI not enabled correctly.<br>2. User-Assigned MI detached from Function App.<br>3. Underlying Azure AD issues (rare). | 1. Verify MI Status: Check Function App Identity blade in Portal or use az functionapp identity show ... (Step 3).<br>2. Re-assign MI: If UAMI, ensure it's still assigned. Try re-assigning.<br>3. Check Azure Status: Look for any Azure AD or Managed Identity service health issues. |
| Key Vault reference was not able to be resolved because site Managed Identity not enabled | 1. Using User-Assigned Identity but keyVaultReferenceIdentity property not set.<br>2. Managed Identity was just enabled and needs time to propagate.<br>3. System-assigned identity status shows as "Off". | 1. For User-Assigned MI: Set the keyVaultReferenceIdentity property to the resource ID of the UAMI.<br>2. Wait for identity to propagate (can take up to 10 minutes).<br>3. Verify System-Assigned identity is correctly enabled. |
| Network-related timeout when accessing Key Vault | 1. Function App cannot reach Key Vault due to networking restrictions (VNet, NSG, Private Endpoint).<br>2. DNS resolution issues with Private Endpoint. | 1. Check if Key Vault has Private Endpoint - verify Function App has VNet integration to access it.<br>2. Check NSG rules to ensure outbound traffic to Key Vault allowed.<br>3. Verify DNS resolution of Key Vault domain name to proper IP (privatelink.* for PE).<br>4. Use TCPing/Kudu tools to test connectivity from Function App to Key Vault. |

---
## 10. Automation and AI Agent Actionability
This document enables an AI agent to reason about and perform/delegate tasks related to Key Vault references.

### 10.1 Delegatable Tasks (Examples)

**Check Key Vault Access**
* **Inputs:** Function App Name, RG Name, Key Vault Name, (Optional) Secret Name.
* **Actions:**
  * Get Function App Managed Identity Principal ID (az functionapp identity show).
  * Check RBAC role assignments for Principal ID on Key Vault scope (az role assignment list --assignee <PID> --scope <KV Scope>). Look for Key Vault Secrets User.
  * Check Access Policies on Key Vault (az keyvault show --query properties.accessPolicies). Look for Principal ID with get secret permission.
  * Check Key Vault Network Rules (az keyvault show --query properties.networkAcls).
  * (Optional) Check Secret existence (az keyvault secret show).
* **Output:** Report on MI status, permissions (RBAC/Policy), networking rules, secret status.

**Configure Key Vault Reference**
* **Inputs:** Function App Name, RG Name, App Setting Name, Key Vault Name, Secret Name, (Optional) Use Specific Version ID.
* **Actions:**
  * Ensure MI is enabled on Function App (Enable if necessary: az functionapp identity assign). Get Principal ID.
  * Grant Key Vault Secrets User RBAC role (or Access Policy) to MI on Key Vault (az role assignment create or az keyvault set-policy).
  * Construct Secret URI (latest or specific version: az keyvault secret show --query id).
  * Set Application Setting (az functionapp config appsettings set).
  * (Optional) Trigger Function App restart (az functionapp restart).
* **Output:** Confirmation of setup, final App Setting value.

**Audit Function App Key Vault References**
* **Inputs:** Function App Name, RG Name.
* **Actions:**
  * List all application settings (az functionapp config appsettings list).
  * Filter for settings where value starts with @Microsoft.KeyVault(.
  * For each reference, parse Vault Name and Secret Name/URI.
  * Perform Check Key Vault Access sub-task for each unique Vault/Secret referenced.
* **Output:** List of KV references, validation status (syntax OK, permissions OK, secret found).

### 10.2 Reasoning Points (Examples)

**Scenario:** User reports function failing to start, logs show Microsoft.KeyVault.Forbidden.
* **Reasoning:** Forbidden error strongly implies a permissions issue between the Function App's identity and the Key Vault, or a network block.
* **Next Steps:** Trigger Check Key Vault Access task. Prioritize checking RBAC/Access Policies and Key Vault network rules.

**Scenario:** User wants to securely store a new API Key for a Function App.
* **Reasoning:** Storing secrets directly is insecure. Key Vault reference with Managed Identity is the best practice.
* **Next Steps:** Check prerequisites (Vault exists?). Guide user or trigger Configure Key Vault Reference task. Recommend System-Assigned MI if appropriate. Recommend RBAC for permissions.

**Scenario:** User rotated a secret in Key Vault, but the function still uses the old value.
* **Reasoning:** Function Apps cache resolved secrets. The cache likely hasn't expired, or the reference might be pinned to the old version.
* **Next Steps:** Ask user if the reference uses a specific version. If latest, recommend restarting the Function App or waiting. If versioned, explain the app setting needs updating.

---
## 11. Related Resources

* [Microsoft Docs: Use Key Vault references for App Service and Azure Functions](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)   
* [Microsoft Docs: Managed identities for Azure resources](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
* [Microsoft Docs: Assign Azure roles using Azure CLI](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli)
* [Microsoft Docs: Secure access to a key vault](https://learn.microsoft.com/en-us/azure/key-vault/general/security-features)
* [Microsoft Docs: Azure Key Vault security recommendations](https://learn.microsoft.com/en-us/azure/key-vault/general/security-overview)
* [Microsoft Docs: Azure Key Vault recovery overview](https://learn.microsoft.com/en-us/azure/key-vault/general/key-vault-recovery) (Relevant for soft-delete issues)

---

This document aims for robustness by:
1.  **Structuring:** Clear sections with logical flow (Why -> How -> Verify -> Troubleshoot -> Automate).
2.  **Detailing:** Explaining *why* specific approaches (Managed Identity, RBAC) are recommended. Providing specific syntax and CLI commands.
3.  **Actionability:** Including explicit CLI commands for setup and verification. Defining troubleshooting steps linked to specific errors.
4.  **AI Focus:** Adding sections (Prerequisites check, Step intros, Troubleshooting table logic, Section 10) explicitly outlining checks, tasks, and reasoning processes an AI could follow.
5.  **Completeness:** Covering core setup, authentication, configuration, rotation, networking, best practices, and troubleshooting.
6.  **Clarity:** Using formatting (bolding, code blocks, tables) to improve readability for both humans and AI parsing.