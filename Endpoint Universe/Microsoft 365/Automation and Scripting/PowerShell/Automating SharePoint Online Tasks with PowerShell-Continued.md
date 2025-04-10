# Automating SharePoint Online Tasks with PowerShell-Continued

## Table of Contents

- [Information Management and Compliance](#information-management-and-compliance)
  - [Retention Policies](#retention-policies)
  - [DLP Policies](#dlp-policies)
  - [Site Policies](#site-policies)
  - [Information Rights Management](#information-rights-management)
- [Performance Optimization](#performance-optimization)
  - [Batching Operations](#batching-operations)
  - [Throttling Management](#throttling-management)
  - [Best Practices for Performance](#best-practices-for-performance)
- [Workflow and Automation](#workflow-and-automation)
  - [Flow Integration](#flow-integration)
  - [Legacy Workflow Interaction](#legacy-workflow-interaction)
  - [Event Receivers](#event-receivers)
- [Tenant-Level Operations](#tenant-level-operations)
  - [Tenant Settings Management](#tenant-settings-management)
  - [Tenant-Wide Content Types](#tenant-wide-content-types)
  - [Site Designs and Site Scripts](#site-designs-and-site-scripts)
- [Error Handling and Logging](#error-handling-and-logging)
  - [Best Practices](#best-practices)
  - [Custom Logging Framework](#custom-logging-framework)
  - [Error Recovery Strategies](#error-recovery-strategies)
- [Advanced Scenarios](#advanced-scenarios)
  - [Migration Scenarios](#migration-scenarios)
  - [Bulk Operations](#bulk-operations)
  - [Cross-Site Collection Operations](#cross-site-collection-operations)
  - [Hybrid SharePoint Management](#hybrid-sharepoint-management)
- [Security Best Practices](#security-best-practices)
  - [Handling Credentials](#handling-credentials)
  - [Least Privilege Principle](#least-privilege-principle)
  - [Audit Logging](#audit-logging)
- [Scripting Examples](#scripting-examples)
  - [Site Creation Scripts](#site-creation-scripts)
  - [Content Management Scripts](#content-management-scripts)
  - [Reporting Scripts](#reporting-scripts)
  - [Maintenance Scripts](#maintenance-scripts)
- [Troubleshooting](#troubleshooting)
  - [Common Issues and Resolutions](#common-issues-and-resolutions)
  - [Debugging Techniques](#debugging-techniques)
  - [Support Resources](#support-resources)
- [References and Resources](#references-and-resources)

## Information Management and Compliance

### Retention Policies

Retention policies in SharePoint Online help organizations manage content lifecycle by determining how long content should be kept and what happens when it reaches the end of its retention period.

```powershell
# Connect to SharePoint Online Management Shell
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get all retention policies applied to SharePoint sites
$retentionPolicies = Get-RetentionCompliancePolicy | Where-Object {$_.SharePointLocation -ne $null}

# Apply a retention policy to a specific site
Set-RetentionCompliancePolicy -Identity "Company Documents Retention" -AddSharePointLocation "https://contoso.sharepoint.com/sites/Finance"

# Create a new retention policy using the Security & Compliance PowerShell
$retentionPolicy = New-RetentionCompliancePolicy -Name "Finance Documents Retention" -SharePointLocation "https://contoso.sharepoint.com/sites/Finance" -ExchangeLocation "All"

# Create a retention rule for the policy
New-RetentionComplianceRule -Name "7 Year Retention Rule" -Policy $retentionPolicy.Id -RetentionDuration 2557
```

Key considerations when working with retention policies:
- You must have appropriate permissions in the Security & Compliance Center
- Changes may take up to 24 hours to propagate
- Use the `-RetentionComplianceRule` cmdlets to create different retention rules for different content types

### DLP Policies

Data Loss Prevention (DLP) policies help protect sensitive information in SharePoint Online by identifying, monitoring, and protecting content containing sensitive data.

```powershell
# Connect to Security & Compliance PowerShell
Connect-IPPSSession

# Get all DLP policies that apply to SharePoint
Get-DlpCompliancePolicy | Where-Object {$_.SharePointLocation -ne $null}

# Create a new DLP policy for SharePoint
New-DlpCompliancePolicy -Name "Financial Data Protection" -Mode Enable -SharePointLocation "https://contoso.sharepoint.com/sites/Finance" -Comment "Protects financial data"

# Create a rule for credit card information
New-DlpComplianceRule -Name "Credit Card Rule" -Policy "Financial Data Protection" -ContentContainsSensitiveInformation @{Name="Credit Card Number"; minCount="1"} -BlockAccess $true -GenerateIncidentReport "SiteAdmin"
```

Important points about DLP policies:
- Use the `-ContentContainsSensitiveInformation` parameter to specify what types of sensitive information to look for
- Set appropriate actions with `-BlockAccess`, `-NotifyUser`, etc.
- Consider using policy tips to inform users about potential policy violations

### Site Policies

Site policies allow administrators to manage the lifecycle of SharePoint sites, including retention and closure schedules.

```powershell
# Connect to PnP PowerShell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/Finance" -Interactive

# Get current site policy
$currentPolicy = Get-PnPSitePolicy

# Get all available site policies
$availablePolicies = Get-PnPSitePolicyWeb

# Apply a site policy
Set-PnPSitePolicy -Name "Temporary Sites Policy"

# Create a custom site policy (requires CSOM)
$context = Get-PnPContext
$web = Get-PnPWeb
$policy = New-Object Microsoft.SharePoint.Client.Site.SitePolicy($context)
$policy.Name = "Project Sites Policy"
$policy.Description = "Policy for temporary project sites"
$policy.EmailBody = "Your project site will be closed in 30 days."
$policy.SiteClosureAndDeletionDays = 30
$policy.Update()
$context.ExecuteQuery()
```

Site policy management best practices:
- Document all site policies in a central location
- Implement a governance plan for site lifecycle management
- Regularly audit site policies to ensure they meet compliance requirements

### Information Rights Management

Information Rights Management (IRM) provides additional protection for sensitive content through encryption and usage restrictions.

```powershell
# Enable IRM for a SharePoint tenant
Set-SPOTenant -IrmEnabled $true

# Enable IRM for a specific document library
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/Legal" -Interactive
$list = Get-PnPList -Identity "Confidential Documents"
$list.IrmEnabled = $true
$list.IrmExpire = $true
$list.IrmReject = $true
$list.Update()
Invoke-PnPQuery
```

Key IRM settings to consider:
- `IrmEnabled` - Turns on IRM for the library
- `IrmExpire` - Enables document expiration
- `IrmReject` - Prevents protected content from being downloaded to non-compliant applications

## Performance Optimization

### Batching Operations

When performing multiple operations against SharePoint, batching can significantly improve performance by reducing round trips to the server.

```powershell
# Connect to SharePoint Online
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/ProjectX" -Interactive

# Use batching for creating multiple list items
$batch = New-PnPBatch
1..100 | ForEach-Object {
    $itemProperties = @{
        "Title" = "Item $_"
        "Description" = "Description for item $_"
    }
    Add-PnPListItem -List "Project Tasks" -Values $itemProperties -Batch $batch
}
Invoke-PnPBatch -Batch $batch

# Use batching for updating multiple items
$batch = New-PnPBatch
$items = Get-PnPListItem -List "Project Tasks" -PageSize 500
foreach ($item in $items) {
    Set-PnPListItem -List "Project Tasks" -Identity $item.Id -Values @{"Status" = "In Progress"} -Batch $batch
}
Invoke-PnPBatch -Batch $batch
```

Batching best practices:
- Keep batch sizes manageable (typically 50-100 operations)
- Use batching for repetitive operations like creating multiple items
- Monitor performance to determine optimal batch sizes for your environment

### Throttling Management

SharePoint Online implements throttling to maintain service performance. PowerShell scripts need to handle throttling gracefully.

```powershell
# Function to handle throttling with exponential backoff
function Invoke-WithRetry {
    param(
        [ScriptBlock]$ScriptBlock,
        [int]$MaxRetries = 5,
        [int]$InitialDelaySeconds = 2
    )
    
    $retryCount = 0
    $success = $false
    $delay = $InitialDelaySeconds
    
    while (-not $success -and $retryCount -lt $MaxRetries) {
        try {
            & $ScriptBlock
            $success = $true
        }
        catch {
            if ($_.Exception.Message -like "*throttled*" -or $_.Exception.Message -like "*429*") {
                Write-Warning "Operation throttled, waiting $delay seconds before retry..."
                Start-Sleep -Seconds $delay
                $retryCount++
                $delay = $delay * 2  # Exponential backoff
            }
            else {
                throw $_  # Re-throw if not a throttling exception
            }
        }
    }
    
    if (-not $success) {
        throw "Operation failed after $MaxRetries retries due to throttling"
    }
}

# Example usage
Invoke-WithRetry -ScriptBlock {
    Get-PnPListItem -List "Very Large List" -PageSize 2000
}
```

Additional throttling mitigation techniques:
- Implement incremental processing using paging
- Schedule scripts to run during off-peak hours
- Distribute workload across multiple tenants if possible
- Use the `-Defer` parameter with CSOM operations to reduce load

### Best Practices for Performance

Optimize your SharePoint Online PowerShell scripts for better performance:

```powershell
# Use select-specific fields to reduce data transfer
$items = Get-PnPListItem -List "Documents" -Fields "ID", "Title", "Modified" -PageSize 1000

# Limit result sets
$recentItems = Get-PnPListItem -List "Documents" -Query "<View><Query><Where><Geq><FieldRef Name='Modified'/><Value Type='DateTime'><Today OffsetDays='-7'/></Value></Geq></Where><OrderBy><FieldRef Name='Modified' Ascending='False'/></OrderBy></Query><RowLimit>100</RowLimit></View>"

# Use server-side filtering with CAML
$camlQuery = "<View><Query><Where><Eq><FieldRef Name='Status'/><Value Type='Choice'>Completed</Value></Eq></Where></Query></View>"
$completedItems = Get-PnPListItem -List "Tasks" -Query $camlQuery

# Minimize context creation
$context = Get-PnPContext
$web = Get-PnPWeb
$lists = $web.Lists
$context.Load($lists)
Invoke-PnPQuery
foreach ($list in $lists) {
    Write-Output $list.Title
}
```

Performance optimization guidelines:
- Always retrieve only the fields you need
- Use appropriate page sizes (typically 1000-2000 items)
- Implement server-side filtering with CAML queries
- Cache context objects and reuse them
- Monitor script execution time to identify bottlenecks

## Workflow and Automation

### Flow Integration

Power Automate (formerly Flow) can be managed and integrated with PowerShell for SharePoint Online automation.

```powershell
# Install Power Platform PowerShell modules
Install-Module -Name Microsoft.PowerApps.Administration.PowerShell
Install-Module -Name Microsoft.PowerApps.PowerShell

# Connect to Power Platform
Add-PowerAppsAccount

# Get flows in an environment
$flows = Get-AdminFlow -EnvironmentName Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Enable/disable a flow
Set-AdminFlowStatus -FlowName $flows[0].FlowName -EnvironmentName $flows[0].EnvironmentName -Status Enabled

# Export a flow for backup or migration
$flowObject = Get-AdminFlow -FlowName $flows[0].FlowName -EnvironmentName $flows[0].EnvironmentName
$flowDefinition = Get-AdminFlowDetails -EnvironmentName $flowObject.EnvironmentName -FlowName $flowObject.FlowName
$flowDefinition | ConvertTo-Json -Depth 20 | Out-File "C:\Temp\FlowBackup.json"

# Create a SharePoint trigger-based flow using REST API
$flowDefinition = @{
    "displayName" = "Document Library Flow"
    "definition" = @{
        # Flow definition JSON
    }
}
$jsonDefinition = $flowDefinition | ConvertTo-Json -Depth 20
Invoke-RestMethod -Uri "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/Default-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/flows" -Method POST -Body $jsonDefinition -Headers @{"Authorization" = "Bearer $accessToken"; "Content-Type" = "application/json"}
```

Flow management best practices:
- Document all automated flows in a central inventory
- Implement proper error handling and notification mechanisms
- Use service accounts for flow connections when appropriate
- Regularly audit and test flows to ensure they're working as expected

### Legacy Workflow Interaction

SharePoint 2010 and 2013 workflows can still be managed via PowerShell in SharePoint Online.

```powershell
# Connect to PnP PowerShell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/ProjectX" -Interactive

# Get all workflows in a site
$workflows = Get-PnPWorkflowDefinition

# Get workflow subscriptions (associations)
$subscriptions = Get-PnPWorkflowSubscription

# Start a workflow on a list item
Start-PnPWorkflowInstance -Definition $workflows[0] -ListItem $item -AssociationValues @{"EmailBody" = "Please review this item"}

# Remove a workflow
Remove-PnPWorkflowDefinition -Identity $workflows[0]

# Create a site workflow (requires CSOM)
$ctx = Get-PnPContext
$workflowServicesManager = New-Object Microsoft.SharePoint.Client.WorkflowServices.WorkflowServicesManager($ctx, $ctx.Web)
$deploymentService = $workflowServicesManager.GetWorkflowDeploymentService()
$definitionName = "Site Approval Workflow"
$xaml = Get-Content -Path "C:\Workflows\SiteApproval.xaml" -Raw
$deploymentService.SaveDefinition($definitionName, $xaml)
$ctx.ExecuteQuery()
```

Legacy workflow migration considerations:
- Document all current workflow functionality before migration
- Test workflows thoroughly in each environment
- Consider migrating to Power Automate for long-term sustainability
- Archive workflow history data if needed for compliance

### Event Receivers

Remote event receivers can be managed with PowerShell in SharePoint Online.

```powershell
# Connect to PnP PowerShell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/HR" -Interactive

# Add a remote event receiver
Add-PnPEventReceiver -List "Documents" -Name "Document Added Handler" -Url "https://azure-function-app.azurewebsites.net/api/DocumentHandler" -EventReceiverType ItemAdded -Synchronization Synchronous

# Get all event receivers
$receivers = Get-PnPEventReceiver -List "Documents"

# Remove an event receiver
Remove-PnPEventReceiver -List "Documents" -Identity $receivers[0].Id -Force

# Update an event receiver
Set-PnPEventReceiver -List "Documents" -Identity $receivers[0].Id -Url "https://new-azure-function.azurewebsites.net/api/UpdatedHandler"
```

Remote event receiver tips:
- Implement proper error handling and logging in remote event handlers
- Consider performance implications for synchronous event receivers
- Use Azure Functions for scalable, serverless event handling
- Implement retry logic for event handler communication

## Tenant-Level Operations

### Tenant Settings Management

PowerShell enables management of tenant-wide settings for SharePoint Online.

```powershell
# Connect to SharePoint Online Admin Center
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get current tenant settings
$tenantSettings = Get-SPOTenant

# Display important tenant settings
Write-Output "SharePoint storage quota (MB): $($tenantSettings.StorageQuota)"
Write-Output "External sharing enabled: $($tenantSettings.SharingCapability)"
Write-Output "Legacy authentication protocols: $($tenantSettings.LegacyAuthProtocolsEnabled)"

# Update tenant settings
Set-SPOTenant -SharingCapability ExternalUserSharingOnly -DefaultSharingLinkType Internal -PreventExternalUsersFromResharing $true

# Enable modern authentication
Set-SPOTenant -LegacyAuthProtocolsEnabled $false

# Configure tenant CDN settings
Get-SPOTenantCdnEnabled -CdnType Public
Set-SPOTenantCdnEnabled -CdnType Public -Enable $true
Add-SPOTenantCdnOrigin -CdnType Public -OriginUrl "/sites/marketing/siteassets"
```

Tenant management best practices:
- Document all tenant setting changes
- Test changes in a test tenant before applying to production
- Implement change control processes for tenant-level changes
- Regularly audit tenant settings for security compliance

### Tenant-Wide Content Types

Manage SharePoint content types at the tenant level using PowerShell.

```powershell
# Connect to SharePoint Online Admin Center
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Get tenant-wide content type hub site
$contentTypeHubUrl = Get-SPOTenantContentTypeHub

# Connect to content type hub
Connect-PnPOnline -Url $contentTypeHubUrl -Interactive

# Get all content types
$contentTypes = Get-PnPContentType

# Create a new tenant-wide content type
$parentContentType = Get-PnPContentType -Identity "0x0101" # Document content type
Add-PnPContentType -Name "Company Contract" -Description "Contract template for company use" -ParentContentType $parentContentType -Group "Company Content Types"

# Add a site column to content type
$field = Get-PnPField -Identity "ContractValue"
Add-PnPFieldToContentType -Field $field -ContentType "Company Contract"

# Publish content type to make it available tenant-wide
$contentType = Get-PnPContentType -Identity "Company Contract"
Publish-PnPContentType -ContentType $contentType
```

Content type hub considerations:
- Changes may take several hours to propagate across the tenant
- Use a dedicated site collection as content type hub
- Document all tenant-wide content types
- Test content type changes before publishing

### Site Designs and Site Scripts

Site designs and site scripts allow for consistent site provisioning across the tenant.

```powershell
# Connect to SharePoint Online Admin Center
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Create a site script
$siteScript = @{
    "$schema" = "schema.json"
    "actions" = @(
        @{
            "verb" = "createSPList"
            "listName" = "Project Documents"
            "templateType" = 101
            "subactions" = @(
                @{
                    "verb" = "addContentType"
                    "name" = "Document"
                }
            )
        }
    )
    "version" = 1
}

$siteScriptJSON = $siteScript | ConvertTo-Json -Depth 10
$createdScript = Add-SPOSiteScript -Title "Project Site Template" -Description "Template for project sites" -Content $siteScriptJSON

# Create a site design that uses the site script
Add-SPOSiteDesign -Title "Standard Project Site" -WebTemplate "64" -SiteScripts $createdScript.Id -Description "Creates a standard project site with document library"

# Get all site designs
Get-SPOSiteDesign

# Grant permissions to site design
Grant-SPOSiteDesignRights -Identity $createdScript.Id -Principals "user@contoso.com" -Rights View

# Apply a site design to an existing site
Invoke-SPOSiteDesign -Identity $createdScript.Id -WebUrl "https://contoso.sharepoint.com/sites/NewProject"

# Remove a site design
Remove-SPOSiteDesign -Identity $createdScript.Id
```

Site design best practices:
- Start with simple site designs and build complexity incrementally
- Test site designs thoroughly before making them available
- Document all site scripts and designs
- Consider using PnP provisioning templates for more complex scenarios

## Error Handling and Logging

### Best Practices

Implement robust error handling in your SharePoint PowerShell scripts.

```powershell
# Basic error handling with try/catch
try {
    Connect-PnPOnline -Url "https://contoso.sharepoint.com" -Interactive
    # Your script logic here
}
catch {
    Write-Error "Failed to connect to SharePoint: $_"
    # Log the error
    Add-Content -Path "C:\Logs\SharePoint_Error_Log.txt" -Value "$(Get-Date) - Error: $_"
    # Exit or take appropriate action
    exit 1
}
finally {
    # Cleanup code that should run regardless of success or failure
    Disconnect-PnPOnline
}

# Advanced error handling with error action preference
$ErrorActionPreference = "Stop"  # Makes non-terminating errors terminating
try {
    $web = Get-PnPWeb -ErrorAction Stop
    $list = Get-PnPList -Identity "NonExistentList" -ErrorAction Stop
}
catch [System.Exception] {
    if ($_.Exception.Message -like "*The specified list does not exist*") {
        Write-Warning "List not found, creating it now"
        New-PnPList -Title "NonExistentList" -Template GenericList
    }
    else {
        throw $_  # Re-throw unexpected exceptions
    }
}
```

Error handling recommendations:
- Always implement try/catch blocks for critical operations
- Use specific exception types when possible
- Log errors with sufficient context to aid troubleshooting
- Consider implementing retry logic for transient errors
- Set appropriate error action preferences

### Custom Logging Framework

Create a custom logging framework for your SharePoint PowerShell scripts.

```powershell
function Write-Log {
    [CmdletBinding()]
    Param(
        [Parameter(Mandatory=$true, ValueFromPipeline=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("INFO", "WARN", "ERROR", "DEBUG")]
        [string]$Level = "INFO",
        
        [Parameter(Mandatory=$false)]
        [string]$LogFilePath = "C:\Logs\SharePoint_Operations.log"
    )
    
    # Create log directory if it doesn't exist
    $logDir = Split-Path -Path $LogFilePath -Parent
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    # Format log message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] - $Message"
    
    # Write to console with appropriate color
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "INFO"  { Write-Host $logMessage -ForegroundColor Green }
        "DEBUG" { Write-Host $logMessage -ForegroundColor Gray }
    }
    
    # Append to log file
    Add-Content -Path $LogFilePath -Value $logMessage
}

# Usage examples
Write-Log -Message "Starting SharePoint site creation" -Level INFO
try {
    # Script logic
    Write-Log -Message "Site created successfully" -Level INFO
}
catch {
    Write-Log -Message "Failed to create site: $_" -Level ERROR
}
```

Logging best practices:
- Include timestamps, severity levels, and contextual information
- Log the start and completion of major operations
- Use DEBUG level for detailed information useful during development
- Implement log rotation for long-running scripts
- Consider integrating with enterprise logging systems

### Error Recovery Strategies

Implement recovery strategies for common SharePoint Online errors.

```powershell
# Function to implement retry logic
function Invoke-CommandWithRetry {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [scriptblock]$ScriptBlock,
        
        [Parameter(Mandatory=$false)]
        [int]$MaxRetries = 3,
        
        [Parameter(Mandatory=$false)]
        [int]$RetryDelaySeconds = 5
    )
    
    $retryCount = 0
    $completed = $false
    $result = $null
    
    while (-not $completed -and $retryCount -lt $MaxRetries) {
        try {
            $result = & $ScriptBlock
            $completed = $true
        }
        catch {
            $retryCount++
            $exception = $_
            
            if ($retryCount -ge $MaxRetries) {
                Write-Error "Failed after $MaxRetries retries. Last error: $($exception.Exception.Message)"
                throw $exception
            }
            else {
                Write-Warning "Operation failed. Retrying in $RetryDelaySeconds seconds... (Attempt $retryCount of $MaxRetries)"
                Write-Warning "Error: $($exception.Exception.Message)"
                Start-Sleep -Seconds $RetryDelaySeconds
            }
        }
    }
    
    return $result
}

# Example usage
$listItems = Invoke-CommandWithRetry -ScriptBlock {
    Get-PnPListItem -List "Large Document Library" -PageSize 2000
} -MaxRetries 5 -RetryDelaySeconds 10

# Transaction-like functionality with checkpoints
function New-SPOSiteWithCheckpoint {
    param(
        [string]$SiteUrl,
        [string]$Owner,
        [string]$Title,
        [string]$CheckpointFile = "C:\Temp\site_creation_checkpoint.json"
    )
    
    # Load checkpoint if it exists
    $checkpoint = @{
        "SiteCreated" = $false
        "GroupsCreated" = $false
        "ListsCreated" = $false
        "CompletedSuccessfully" = $false
    }
    
    if (Test-Path $CheckpointFile) {
        $checkpoint = Get-Content $CheckpointFile | ConvertFrom-Json
    }
    
    try {
        # Step 1: Create the site
        if (-not $checkpoint.SiteCreated) {
            New-PnPSite -Type TeamSite -Title $Title -Url $SiteUrl -Owner $Owner
            $checkpoint.SiteCreated = $true
            $checkpoint | ConvertTo-Json | Out-File $CheckpointFile
        }
        
        # Connect to the site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Step 2: Create groups
        if (-not $checkpoint.GroupsCreated) {
            New-PnPGroup -Title "$Title Visitors" -SetAssociatedGroup Visitors
            New-PnPGroup -Title "$Title Members" -SetAssociatedGroup Members
            New-PnPGroup -Title "$Title Owners" -SetAssociatedGroup Owners
            $checkpoint.GroupsCreated = $true
            $checkpoint | ConvertTo-Json | Out-File $CheckpointFile
        }
        
        # Step 3: Create lists
        if (-not $checkpoint.ListsCreated) {
            New-PnPList -Title "Documents" -Template DocumentLibrary
            New-PnPList -Title "Tasks" -Template TaskList
            $checkpoint.ListsCreated = $true
            $checkpoint | ConvertTo-Json | Out-File $CheckpointFile
        }
        
        # Mark as completed successfully
        $checkpoint.CompletedSuccessfully = $true
        $checkpoint | ConvertTo-Json | Out-File $CheckpointFile
        
        return $true
    }
    catch {
        Write-Error "Error during site creation: $_"
        # Checkpoint file is already updated for completed steps
        return $false
    }
}
```

Recovery strategy recommendations:
- Implement checkpoints for multi-step processes
- Use idempotent operations where possible
- Log detailed error information for troubleshooting
- Consider rollback procedures for critical operations
- Implement notification mechanisms for failed operations

## Advanced Scenarios

### Migration Scenarios

Automate content migration between SharePoint environments.

```powershell
# Install required modules
Install-Module -Name Microsoft.SharePoint.MigrationTool -Force

# Connect to source and target environments
$sourceCred = Get-Credential -Message "Enter credentials for source environment"
Connect-PnPOnline -Url "https://source.sharepoint.com/sites/OldTeamSite" -Credentials $sourceCred
$sourceContext = Get-PnPContext

$targetCred = Get-Credential -Message "Enter credentials for target environment"
Connect-PnPOnline -Url "https://target.sharepoint.com/sites/NewTeamSite" -Credentials $targetCred
$targetContext = Get-PnPContext

# Export site template with content
$template = Get-PnPProvisioningTemplate -OutputInstance -IncludeAllPages -IncludeSiteCollectionTermGroup -IncludeSearchConfiguration -IncludeNativePublishingFiles -PersistBrandingFiles -PersistPublishingFiles

# Save template to file
Save-PnPProvisioningTemplate -Path "C:\Temp\SiteTemplate.pnp" -InputInstance $template

# Apply template to target site
Connect-PnPOnline -Url "https://target.sharepoint.com/sites/NewTeamSite" -Credentials $targetCred
Apply-PnPProvisioningTemplate -Path "C:\Temp\SiteTemplate.pnp"

# Use SharePoint Migration Tool for bulk document migration
$migrationParameters = @{
    SourcePath = "C:\MigrationPackage"
    TargetWebUrl = "https://target.sharepoint.com/sites/NewTeamSite"
    TargetList = "Documents"
    TargetListRelativePath = "2023/Project Files"
    LogVerbose = $true
}
Import-SPMTContent @migrationParameters -MigrateWithoutAzure
```
