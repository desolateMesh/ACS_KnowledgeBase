# Automating SharePoint Online Tasks with PowerShell

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
  - [Required PowerShell Modules](#required-powershell-modules)
  - [Permissions and Authentication](#permissions-and-authentication)
- [Connecting to SharePoint Online](#connecting-to-sharepoint-online)
  - [Using PnP PowerShell](#using-pnp-powershell)
  - [Using SharePoint Online Management Shell](#using-sharepoint-online-management-shell)
  - [Connection Examples](#connection-examples) 
  - [Authentication Methods](#authentication-methods)
  - [Service Principal Authentication](#service-principal-authentication)
- [Site Management](#site-management)
  - [Creating Sites](#creating-sites)
  - [Managing Site Collections](#managing-site-collections)
  - [Site Properties and Settings](#site-properties-and-settings)
  - [Site Provisioning Templates](#site-provisioning-templates)
  - [Site Lifecycle Management](#site-lifecycle-management)
- [List and Library Management](#list-and-library-management)
  - [Creating Lists and Libraries](#creating-lists-and-libraries)
  - [Managing List Settings](#managing-list-settings)
  - [Content Type Operations](#content-type-operations)
  - [Field/Column Management](#fieldcolumn-management)
  - [View Management](#view-management)
- [Document Management](#document-management)
  - [Uploading Documents](#uploading-documents)
  - [Downloading Documents](#downloading-documents)
  - [Managing Document Metadata](#managing-document-metadata)
  - [Version Management](#version-management)
  - [Check-in/Check-out Operations](#check-incheck-out-operations)
- [User and Permission Management](#user-and-permission-management)
  - [Managing Site Users](#managing-site-users)
  - [Permission Level Management](#permission-level-management)
  - [Sharing and Access Requests](#sharing-and-access-requests)
  - [Group Management](#group-management)
  - [Inheritance Breaking](#inheritance-breaking)
- [Search Operations](#search-operations)
  - [Basic Search Functions](#basic-search-functions)
  - [Advanced Search Queries](#advanced-search-queries)
  - [Search Result Processing](#search-result-processing)

## Introduction

PowerShell has become the go-to solution for automating and managing SharePoint Online environments at scale. By leveraging PowerShell's scripting capabilities with SharePoint Online's extensive API exposure, administrators and developers can accomplish complex tasks efficiently, ensure consistent configurations, and reduce the risk of human error.

This comprehensive guide covers the full spectrum of SharePoint Online automation using PowerShell, from basic connection scenarios to complex enterprise-grade solutions. The document is structured to serve both as a learning resource and a reference for implementing automated solutions in your SharePoint Online environment.

Key benefits of automating SharePoint Online tasks with PowerShell include:

- **Efficiency**: Accomplish in minutes what would take hours through the user interface
- **Consistency**: Ensure standardized implementations across your tenant
- **Scale**: Perform operations across hundreds or thousands of sites simultaneously
- **Precision**: Target specific changes with exact control
- **Documentation**: Scripts serve as documentation of changes and configurations
- **Repeatability**: Create reusable scripts for common administrative tasks
- **Error Handling**: Implement proper error handling and logging for operations

This guide focuses primarily on using PnP PowerShell (PowerShell for SharePoint Online Patterns and Practices), which has become the de facto standard for SharePoint Online automation. However, we'll also cover the SharePoint Online Management Shell where appropriate, especially for tenant-level operations.

## Prerequisites

### Required PowerShell Modules

Before automating SharePoint Online tasks, ensure you have the proper PowerShell modules installed:

#### PnP PowerShell Module

The PnP PowerShell module is the primary tool for SharePoint Online automation:

```powershell
# Check if PnP PowerShell is installed
Get-Module -Name PnP.PowerShell -ListAvailable

# If not installed, install it (requires PowerShell 5.1 or higher)
Install-Module -Name PnP.PowerShell -Scope CurrentUser -Force

# If you need to update to the latest version
Update-Module -Name PnP.PowerShell

# Importing the module for use in the current session
Import-Module -Name PnP.PowerShell
```

For legacy environments using older versions:
```powershell
# For older SharePoint environments (deprecated)
Install-Module -Name SharePointPnPPowerShellOnline -Scope CurrentUser -Force
```

#### SharePoint Online Management Shell

For tenant-level operations and some administrative tasks:

```powershell
# Check if SharePoint Online Management Shell is installed
Get-Module -Name Microsoft.Online.SharePoint.PowerShell -ListAvailable

# If not installed, install it
Install-Module -Name Microsoft.Online.SharePoint.PowerShell -Scope CurrentUser -Force

# If you need to update to the latest version
Update-Module -Name Microsoft.Online.SharePoint.PowerShell

# Importing the module for use in the current session
Import-Module -Name Microsoft.Online.SharePoint.PowerShell
```

#### Microsoft Graph PowerShell SDK (Optional but Recommended)

For integrations with other Microsoft 365 services:

```powershell
# Install Microsoft Graph PowerShell modules
Install-Module -Name Microsoft.Graph -Scope CurrentUser -Force

# Import Microsoft Graph modules (choose what you need)
Import-Module Microsoft.Graph.Authentication
Import-Module Microsoft.Graph.Sites
Import-Module Microsoft.Graph.Users
```

### Permissions and Authentication

Different operations require different permission levels:

1. **Site Collection Administrator**: For most site collection level operations
2. **SharePoint Administrator**: For tenant-level operations
3. **Global Administrator**: For some security-related configurations
4. **App-Only Permissions**: For service principal/unattended automation

For automation scenarios, consider using service principal authentication with certificates (covered in detail in the [Service Principal Authentication](#service-principal-authentication) section).

## Connecting to SharePoint Online

### Using PnP PowerShell

PnP PowerShell provides several connection methods suitable for different scenarios:

```powershell
# Basic interactive connection with modern authentication
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Using credentials (not recommended for production)
$cred = Get-Credential
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Credentials $cred

# Using device code authentication (good for remote/headless scenarios)
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -UseDeviceCode

# Using certificate authentication (recommended for automation)
Connect-PnPOnline -Url "https://contoso.sharepoint.com" -ClientId "aad_application_id" -CertificatePath "C:\Certificates\MyCertificate.pfx" -CertificatePassword (ConvertTo-SecureString -String "CertPassword" -AsPlainText -Force)

# Using managed identity (for Azure-hosted automation)
Connect-PnPOnline -Url "https://contoso.sharepoint.com" -ManagedIdentity
```

### Using SharePoint Online Management Shell

For tenant-level operations, use the SharePoint Online Management Shell:

```powershell
# Basic interactive connection
Connect-SPOService -Url "https://contoso-admin.sharepoint.com"

# Using credentials (not recommended for production)
$cred = Get-Credential
Connect-SPOService -Url "https://contoso-admin.sharepoint.com" -Credential $cred
```

### Connection Examples

#### Example 1: Basic Script Connection Pattern

```powershell
function Connect-ToSPO {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $false)]
        [switch]$UseInteractive
    )
    
    try {
        if ($UseInteractive) {
            Write-Host "Connecting to $SiteUrl using interactive authentication..."
            Connect-PnPOnline -Url $SiteUrl -Interactive
        }
        else {
            # For CI/CD or scheduled tasks, use certificate auth
            Write-Host "Connecting to $SiteUrl using certificate authentication..."
            $certPwd = Get-AutomationVariable -Name "CertPassword" # Example for Azure Automation
            Connect-PnPOnline -Url $SiteUrl -ClientId $env:SPO_CLIENT_ID -CertificatePath $env:CERT_PATH -CertificatePassword (ConvertTo-SecureString -String $certPwd -AsPlainText -Force)
        }
        
        # Verify connection
        $web = Get-PnPWeb
        Write-Host "Connected to: $($web.Title)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to connect to SharePoint Online: $_"
        return $false
    }
}

# Usage
$connected = Connect-ToSPO -SiteUrl "https://contoso.sharepoint.com/sites/teamsite" -UseInteractive
if ($connected) {
    # Proceed with operations
}
```

#### Example 2: Connecting to Multiple Site Collections

```powershell
function Process-MultipleSites {
    param (
        [Parameter(Mandatory = $true)]
        [string[]]$SiteUrls,
        [Parameter(Mandatory = $true)]
        [scriptblock]$ProcessingScript
    )
    
    foreach ($siteUrl in $SiteUrls) {
        try {
            Write-Host "Connecting to $siteUrl..."
            Connect-PnPOnline -Url $siteUrl -Interactive
            
            # Execute the script block for this site
            & $ProcessingScript
            
            # Disconnect before moving to next site
            Disconnect-PnPOnline
            Write-Host "Completed processing for $siteUrl" -ForegroundColor Green
        }
        catch {
            Write-Error "Error processing $siteUrl: $_"
        }
    }
}

# Usage
$sites = @(
    "https://contoso.sharepoint.com/sites/HR",
    "https://contoso.sharepoint.com/sites/Finance",
    "https://contoso.sharepoint.com/sites/Marketing"
)

$processingLogic = {
    # Get all lists in the site
    $lists = Get-PnPList
    Write-Host "Found $($lists.Count) lists in current site"
    
    # Process each list as needed
    foreach ($list in $lists) {
        if ($list.ItemCount -gt 1000) {
            Write-Host "Large list found: $($list.Title) with $($list.ItemCount) items" -ForegroundColor Yellow
        }
    }
}

Process-MultipleSites -SiteUrls $sites -ProcessingScript $processingLogic
```

### Authentication Methods

PnP PowerShell supports multiple authentication methods suitable for different scenarios:

#### Interactive Authentication

Best for user-driven, ad-hoc operations:

```powershell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive
```

#### Device Code Authentication

Ideal for remote sessions or systems without a browser:

```powershell
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -UseDeviceCode
```

#### Credential Authentication (Legacy)

Not recommended due to security concerns, but useful in legacy scenarios:

```powershell
$cred = Get-Credential
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Credentials $cred
```

### Service Principal Authentication

For production automation, service principal authentication with certificates is the recommended approach:

#### Step 1: Create an Azure AD Application

1. Navigate to Azure Portal > Azure Active Directory > App registrations
2. Create a new registration
3. Set up proper redirect URIs
4. Note the Application (client) ID

#### Step 2: Create a Self-Signed Certificate

```powershell
# Create a self-signed certificate valid for 2 years
$cert = New-SelfSignedCertificate -Subject "CN=SPO-Automation" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(2)

# Export the certificate to PFX file with private key
$certPassword = ConvertTo-SecureString -String "YourStrongPassword" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "C:\Certificates\SPO-Automation.pfx" -Password $certPassword

# Export the public key as Base64-encoded string for Azure AD App registration
$base64Value = [System.Convert]::ToBase64String($cert.GetRawCertData())
$base64Thumbprint = [System.Convert]::ToBase64String($cert.GetCertHash())

# Display the values needed for Azure AD App registration
Write-Host "Certificate Key Value: $base64Value"
Write-Host "Certificate Thumbprint: $base64Thumbprint"
```

#### Step 3: Upload Certificate to Azure AD Application

1. In your Azure AD App registration, go to "Certificates & secrets"
2. Upload the certificate using the values from the previous step

#### Step 4: Grant API Permissions

1. In your Azure AD App registration, go to "API permissions"
2. Add permissions for "SharePoint" with appropriate permissions (e.g., Sites.FullControl.All)
3. Grant admin consent

#### Step 5: Grant Site Collection Permissions

```powershell
# First connect as admin
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Grant app-only access to a specific site collection
$site = "https://contoso.sharepoint.com/sites/teamsite"
$clientId = "your-application-id-guid"
$appName = "SPO Automation App"

# Grant the app Site Collection Admin rights (or adjust permission level as needed)
Grant-PnPAzureADAppSitePermission -AppId $clientId -DisplayName $appName -Site $site -Permissions FullControl
```

#### Step 6: Connect Using the Service Principal

```powershell
# Connect using the certificate
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -ClientId "your-application-id-guid" -CertificatePath "C:\Certificates\SPO-Automation.pfx" -CertificatePassword (ConvertTo-SecureString -String "YourStrongPassword" -AsPlainText -Force)
```

#### Service Principal Connection Function Example

```powershell
function Connect-SPOWithServicePrincipal {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$TenantId,
        [Parameter(Mandatory = $true)]
        [string]$ClientId,
        [Parameter(Mandatory = $true)]
        [string]$CertificatePath,
        [Parameter(Mandatory = $true)]
        [securestring]$CertificatePassword
    )
    
    try {
        Write-Host "Connecting to $SiteUrl using service principal authentication..."
        Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -TenantId $TenantId -CertificatePath $CertificatePath -CertificatePassword $CertificatePassword
        
        # Verify connection
        $web = Get-PnPWeb
        Write-Host "Connected to: $($web.Title) using service principal" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to connect with service principal: $_"
        return $false
    }
}

# Usage example with secure password handling
$certPwd = Read-Host -Prompt "Enter certificate password" -AsSecureString
$connected = Connect-SPOWithServicePrincipal -SiteUrl "https://contoso.sharepoint.com/sites/teamsite" -TenantId "your-tenant-id" -ClientId "your-client-id" -CertificatePath "C:\Certificates\SPO-Automation.pfx" -CertificatePassword $certPwd
```

## Site Management

### Creating Sites

SharePoint Online supports both classic and modern site creation, including team sites, communication sites, and hub sites.

#### Creating a Modern Team Site

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Create a new team site
$siteTitle = "Finance Team"
$siteUrl = "FinanceTeam"
$siteDescription = "Site for Finance Department collaboration"
$timeZone = 4 # Eastern Time (US & Canada)
$owner = "john.doe@contoso.com"

New-PnPSite -Type TeamSite -Title $siteTitle -Alias $siteUrl -Description $siteDescription -TimeZone $timeZone -Owner $owner
```

#### Creating a Communication Site

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Create a new communication site
$siteTitle = "Company News"
$siteUrl = "CompanyNews"
$siteDescription = "Corporate news and announcements"
$timeZone = 4 # Eastern Time (US & Canada)
$owner = "communications@contoso.com"

New-PnPSite -Type CommunicationSite -Title $siteTitle -Url $siteUrl -Description $siteDescription -TimeZone $timeZone -Owner $owner
```

#### Creating a Site Using a Specific Template

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Create a site using a specific template
New-PnPSite -Type TeamSite -Title "Project X" -Alias "ProjectX" -Template "STS#3" -TimeZone 4 -Owner "project.manager@contoso.com"
```

### Managing Site Collections

#### Getting Site Collection Information

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Get all site collections
$sites = Get-PnPTenantSite

# Filter sites by specific properties
$specificSites = Get-PnPTenantSite -Filter "Url -like 'teams' -or Title -eq 'HR'"

# Find sites by template
$teamSites = Get-PnPTenantSite -Template "GROUP#0"

# Export site details to CSV
$sites | Select-Object Url, Title, Template, StorageUsage, Owner | Export-Csv -Path "C:\Reports\SiteCollections.csv" -NoTypeInformation
```

#### Setting Site Collection Properties

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Set site properties
Set-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/projectx" -Title "Project X (Updated)" -SharingCapability ExternalUserSharingOnly

# Change site owner
Set-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/projectx" -Owner "new.owner@contoso.com"

# Set storage quota
Set-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/projectx" -StorageQuota 26214400 # 25GB in MB
```

#### Removing Site Collections

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Soft-delete a site (moves to recycle bin)
Remove-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/obsolete" -Force

# Permanently delete a site (skips recycle bin)
Remove-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/obsolete" -Force -SkipRecycleBin

# Restore a deleted site from recycle bin
Restore-PnPTenantDeletedSite -Url "https://contoso.sharepoint.com/sites/obsolete"
```

### Site Properties and Settings

#### Managing Site Features

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get all site features
Get-PnPFeature

# Enable a feature
Enable-PnPFeature -Identity "b6917cb1-93a0-4b97-a84d-7cf49975d4ec" # Publishing feature

# Disable a feature
Disable-PnPFeature -Identity "b6917cb1-93a0-4b97-a84d-7cf49975d4ec" -Force

# Common feature IDs
# Publishing: "b6917cb1-93a0-4b97-a84d-7cf49975d4ec"
# Team Collaboration: "00bfea71-4ea5-48d4-a4ad-7ea5c011abe5"
# Metadata Navigation: "7201d6a4-a5d3-49a1-8c19-19c4bac6e668"
```

#### Managing Site Navigation

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get quick launch (left navigation)
$quickLaunch = Get-PnPNavigationNode -Location QuickLaunch

# Add a navigation node
Add-PnPNavigationNode -Location QuickLaunch -Title "Important Documents" -Url "/sites/teamsite/Shared Documents/Important"

# Remove a navigation node
Remove-PnPNavigationNode -Identity 2003 -Force # Use the ID from Get-PnPNavigationNode

# Rearrange navigation
$node = Get-PnPNavigationNode -Id 2003
$node.Title = "Updated Title"
$node.Url = "/sites/teamsite/newlocation"
$node.Update()
```

#### Theme Management

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get current theme
Get-PnPWeb -Includes ThemeInfo | Select-Object -ExpandProperty ThemeInfo

# Apply a built-in theme
Set-PnPWebTheme -Theme "Red"

# Apply a custom theme
$themeJson = @{
    "themePrimary" = "#0078d4";
    "themeLighterAlt" = "#eff6fc";
    "themeLighter" = "#deecf9";
    "themeLight" = "#c7e0f4";
    "themeTertiary" = "#71afe5";
    "themeSecondary" = "#2b88d8";
    "themeDarkAlt" = "#106ebe";
    "themeDark" = "#005a9e";
    "themeDarker" = "#004578";
}

Add-PnPTenantTheme -Name "Corporate Blue" -Palette $themeJson -IsInverted $false
Set-PnPWebTheme -Theme "Corporate Blue"
```

### Site Provisioning Templates

PnP PowerShell provides powerful templating capabilities to standardize site creation:

#### Extracting a Template from an Existing Site

```powershell
# Connect to source site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/templatesite" -Interactive

# Extract template with various components
Get-PnPSiteTemplate -Out "C:\Templates\teamtemplate.xml" -IncludeAllPages -IncludeNavigationSettings -IncludeSiteGroups -IncludeTermGroupsSecurity -PersistBrandingFiles -IncludeAllContentTypes
```

#### Applying a Template to a Site

```powershell
# Connect to target site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/newsite" -Interactive

# Apply template
Invoke-PnPSiteTemplate -Path "C:\Templates\teamtemplate.xml"
```

#### Creating a Template Programmatically

```powershell
# Create a new template
$template = New-PnPSiteTemplate

# Add a list to the template
Add-PnPListToSiteTemplate -List "Documents" -Template $template -IncludeContents

# Add navigation to the template
Add-PnPNavigationNodeToSiteTemplate -Template $template -Title "Home" -Url "/sites/target" -Location "QuickLaunch"

# Save the template
Save-PnPSiteTemplate -Template $template -Out "C:\Templates\custom-template.xml"
```

#### Provisioning Script with Template

```powershell
function Provision-DepartmentSite {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$SiteTitle,
        [Parameter(Mandatory = $true)]
        [string]$DepartmentName,
        [Parameter(Mandatory = $true)]
        [string]$SiteOwner
    )
    
    try {
        # Create site collection
        Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive
        
        Write-Host "Creating site collection for $DepartmentName..." -ForegroundColor Yellow
        New-PnPSite -Type TeamSite -Title $SiteTitle -Alias $DepartmentName -Owner $SiteOwner
        
        # Wait for site creation to complete
        Start-Sleep -Seconds 60
        
        # Connect to new site and apply template
        Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/$DepartmentName" -Interactive
        
        Write-Host "Applying department template..." -ForegroundColor Yellow
        Invoke-PnPSiteTemplate -Path "C:\Templates\department-template.xml"
        
        # Customize site based on department
        Write-Host "Customizing site for $DepartmentName..." -ForegroundColor Yellow
        Set-PnPWeb -Title "$DepartmentName - Team Site" -Description "Collaboration site for $DepartmentName department"
        
        # Create department-specific lists
        Add-PnPList -Title "$DepartmentName Projects" -Template GenericList -EnableVersioning
        
        Write-Host "Site provisioning complete!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Error provisioning site: $_"
        return $false
    }
}

# Usage
Provision-DepartmentSite -SiteUrl "https://contoso.sharepoint.com/sites/finance" -SiteTitle "Finance Team" -DepartmentName "Finance" -SiteOwner "finance.lead@contoso.com"
```

### Site Lifecycle Management

#### Site Lifecycle Status Management

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive

# Lock a site (read-only)
Set-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/projectcomplete" -LockState ReadOnly

# Lock a site (no access)
Set-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/projectarchived" -LockState NoAccess

# Unlock a site
Set-PnPTenantSite -Url "https://contoso.sharepoint.com/sites/projectreactivated" -LockState Unlock
```

#### Site Collection Lifecycle Script

```powershell
function Manage-SiteLifecycle {
    param (
        [Parameter(Mandatory = $true)]
        [string]$CsvPath,
        [Parameter(Mandatory = $false)]
        [switch]$WhatIf
    )
    
    # Connect to admin center
    Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive
    
    # Import CSV with format: SiteUrl,Action,Reason
    # Actions: NoAccess, ReadOnly, Unlock, Archive, Delete
    $sites = Import-Csv -Path $CsvPath
    
    foreach ($site in $sites) {
        try {
            Write-Host "Processing site: $($site.SiteUrl) - Action: $($site.Action)" -ForegroundColor Yellow
            
            if ($WhatIf) {
                Write-Host "WhatIf: Would process $($site.SiteUrl) with action $($site.Action)" -ForegroundColor Cyan
                continue
            }
            
            switch ($site.Action) {
                "NoAccess" {
                    Set-PnPTenantSite -Url $site.SiteUrl -LockState NoAccess
                    Write-Host "Site set to NoAccess: $($site.SiteUrl)" -ForegroundColor Green
                }
                "ReadOnly" {
                    Set-PnPTenantSite -Url $site.SiteUrl -LockState ReadOnly
                    Write-Host "Site set to ReadOnly: $($site.SiteUrl)" -ForegroundColor Green
                }
                "Unlock" {
                    Set-PnPTenantSite -Url $site.SiteUrl -LockState Unlock
                    Write-Host "Site unlocked: $($site.SiteUrl)" -ForegroundColor Green
                }
                "Archive" {
                    # Archive process - export content, then lock site
                    Write-Host "Archiving site: $($site.SiteUrl)"
                    
                    # Connect to the site to export content
                    Connect-PnPOnline -Url $site.SiteUrl -Interactive
                    
                    # Create timestamp for archive name
                    $timestamp = Get-Date -Format "yyyy-MM-dd"
                    $siteName = ($site.SiteUrl -split "/")[-1]
                    
                    # Export template with content
                    Get-PnPSiteTemplate -Out "C:\Archives\$siteName-$timestamp.pnp" -IncludeAllPages -IncludeSecurity -IncludeNativePublishingFiles
                    
                    # Return to admin connection
                    Connect-PnPOnline -Url "https://contoso-admin.sharepoint.com" -Interactive
                    
                    # Set to read-only
                    Set-PnPTenantSite -Url $site.SiteUrl -LockState ReadOnly
                    
                    Write-Host "Site archived: $($site.SiteUrl)" -ForegroundColor Green
                }
                "Delete" {
                    # Permanently delete the site
                    Remove-PnPTenantSite -Url $site.SiteUrl -Force -SkipRecycleBin
                    Write-Host "Site deleted: $($site.SiteUrl)" -ForegroundColor Green
                }
                default {
                    Write-Warning "Unknown action '$($site.Action)' for site $($site.SiteUrl)"
                }
            }
            
            # Log the action
            Add-Content -Path "C:\Logs\SiteLifecycleActions.log" -Value "$(Get-Date) - $($site.SiteUrl) - $($site.Action) - $($site.Reason)"
        }
        catch {
            Write-Error "Error processing site $($site.SiteUrl): $_"
            Add-Content -Path "C:\Logs\SiteLifecycleActions.log" -Value "$(Get-Date) - ERROR - $($site.SiteUrl) - $($site.Action) - $_"
        }
    }
}

# Usage example
# Manage-SiteLifecycle -CsvPath "C:\Data\SitesToProcess.csv" -WhatIf
```

## List and Library Management

### Creating Lists and Libraries

#### Basic List and Library Creation

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Create a document library
Add-PnPList -Title "Project Documents" -Template DocumentLibrary -OnQuickLaunch

# Create a generic list
Add-PnPList -Title "Project Tasks" -Template GenericList -EnableVersioning

# Create a custom list with description
Add-PnPList -Title "Risk Register" -Template GenericList -Description "Track project risks and mitigation plans" -EnableVersioning -EnableContentTypes -OnQuickLaunch

# Common list templates:
# DocumentLibrary - Document Library
# GenericList - Custom List
# Tasks - Tasks List
# Events - Calendar
# Announcements - Announcements
# Issue Tracking - Issue Tracking
# Links - Links List
# Survey - Survey
```

#### Advanced Library Creation

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Create a document library with advanced settings
$listTitle = "Contract Documents"
Add-PnPList -Title $listTitle -Template DocumentLibrary -EnableVersioning -EnableContentTypes -OnQuickLaunch

# Set library-specific settings
$list = Get-PnPList -Identity $listTitle
$list.EnableMinorVersions = $true
$list.MajorVersionLimit = 10
$list.MinorVersionLimit = 5
$list.EnableModeration = $true
$list.DraftVersionVisibility = 1 # 0=Reader, 1=Author, 2=Approver
$list.Update()
Invoke-PnPQuery

# Set additional properties
Set-PnPList -Identity $listTitle -EnableAttachments $false -EnableFolderCreation $true -Hidden $false
```

#### List Creation Script Example

```powershell
function Create-ProjectLibraries {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$ProjectName,
        [Parameter(Mandatory = $false)]
        [switch]$IncludeArchive
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Create standard project document libraries
        $libraries = @(
            @{Title = "$ProjectName - Requirements"; Template = "DocumentLibrary"; Description = "Store requirements documentation" },
            @{Title = "$ProjectName - Design"; Template = "DocumentLibrary"; Description = "Store design documentation" },
            @{Title = "$ProjectName - Implementation"; Template = "DocumentLibrary"; Description = "Store implementation documentation" },
            @{Title = "$ProjectName - Testing"; Template = "DocumentLibrary"; Description = "Store testing documentation" }
        )
        
        if ($IncludeArchive) {
            $libraries += @{Title = "$ProjectName - Archive"; Template = "DocumentLibrary"; Description = "Archive for historical documents" }
        }
        
        foreach ($library in $libraries) {
            Write-Host "Creating library: $($library.Title)" -ForegroundColor Yellow
            
            # Create the library
            Add-PnPList -Title $library.Title -Template $library.Template -Description $library.Description -EnableVersioning -OnQuickLaunch
            
            # Set additional properties
            Set-PnPList -Identity $library.Title -EnableFolderCreation $true -MajorVersions 10
            
            Write-Host "Created library: $($library.Title)" -ForegroundColor Green
        }
        
        # Create project lists
        $lists = @(
            @{Title = "$ProjectName - Risks"; Template = "GenericList"; Description = "Track project risks" },
            @{Title = "$ProjectName - Issues"; Template = "GenericList"; Description = "Track project issues" },
            @{Title = "$ProjectName - Decisions"; Template = "GenericList"; Description = "Track project decisions" }
        )
        
        foreach ($list in $lists) {
            Write-Host "Creating list: $($list.Title)" -ForegroundColor Yellow
            
            # Create the list
            Add-PnPList -Title $list.Title -Template $list.Template -Description $list.Description -EnableVersioning -OnQuickLaunch
            
            Write-Host "Created list: $($list.Title)" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Error "Error creating project libraries: $_"
        return $false
    }
}

# Usage
Create-ProjectLibraries -SiteUrl "https://contoso.sharepoint.com/sites/project-x" -ProjectName "Project X" -IncludeArchive
```

### Managing List Settings

#### Basic List Settings

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get list information
$list = Get-PnPList -Identity "Documents"
$list | Format-List Title, Id, ItemCount, LastItemModifiedDate, EnableVersioning, EnableMinorVersions

# Enable versioning
Set-PnPList -Identity "Documents" -EnableVersioning $true

# Set major version limit
Set-PnPList -Identity "Documents" -MajorVersions 10

# Configure basic settings
Set-PnPList -Identity "Documents" -EnableAttachments $false -EnableFolderCreation $true -Hidden $false -EnableModeration $true
```

#### List Validation Settings

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Set validation formula
$validationFormula = "=IF([Due Date]<TODAY(),FALSE,TRUE)"
$validationMessage = "Due date cannot be in the past"
Set-PnPList -Identity "Tasks" -ValidationFormula $validationFormula -ValidationMessage $validationMessage

# Set content approval settings
$list = Get-PnPList -Identity "Tasks"
$list.EnableModeration = $true
$list.Update()
Invoke-PnPQuery
```

#### List Permission Settings

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Break role inheritance
Set-PnPList -Identity "Confidential Documents" -BreakRoleInheritance

# Add permissions
$group = Get-PnPGroup -Name "Project Managers"
Set-PnPListPermission -Identity "Confidential Documents" -Group $group -AddRole "Contribute"

# Remove permissions
Set-PnPListPermission -Identity "Confidential Documents" -User "user@contoso.com" -RemoveRole "Edit"

# Reset to inherit permissions
Set-PnPList -Identity "Confidential Documents" -ResetRoleInheritance
```

### Content Type Operations

#### Adding Content Types to a List

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Enable content types on the list if not already enabled
Set-PnPList -Identity "Documents" -EnableContentTypes $true

# Get a content type from the site
$contentType = Get-PnPContentType -Identity "Project Document"

# Add the content type to the list
Add-PnPContentTypeToList -List "Documents" -ContentType $contentType

# Remove the content type from the list
Remove-PnPContentTypeFromList -List "Documents" -ContentType "Project Document"
```

#### Creating a New Content Type

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Create a content type inheriting from Document
Add-PnPContentType -Name "Contract Document" -Description "Content type for contracts" -Group "Custom Content Types" -ParentContentType "Document"

# Add a site column to the content type
Add-PnPFieldToContentType -Field "Contract Number" -ContentType "Contract Document"

# Create a content type with multiple fields in one operation
$contentTypeId = Add-PnPContentType -Name "Project Deliverable" -Description "Content type for project deliverables" -Group "Custom Content Types" -ParentContentType "Document"

# Add multiple fields to the new content type
Add-PnPFieldToContentType -Field "Project Code" -ContentType $contentTypeId
Add-PnPFieldToContentType -Field "Deliverable ID" -ContentType $contentTypeId
Add-PnPFieldToContentType -Field "Review Status" -ContentType $contentTypeId
```

#### Content Type Hub Integration

```powershell
# Connect to content type hub
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/contentTypeHub" -Interactive

# Publish a content type
$contentType = Get-PnPContentType -Identity "Project Document"
$contentType.Name
$contentType.Id.StringValue

# Make content type available for publishing
$contentType = Get-PnPContentType -Identity "Project Document"
$contentType.Group = "Enterprise Content Types"
$contentType.Update($false)
Invoke-PnPQuery

# Publish the content type
$contentType = Get-PnPContentType -Identity "Project Document"
$contentType.Publish()
Invoke-PnPQuery
```

### Field/Column Management

#### Creating Fields/Columns

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Create a text field at the site level
Add-PnPField -DisplayName "Project Code" -InternalName "ProjectCode" -Type Text -Group "Custom Columns" -AddToAllContentTypes

# Create a required field with max length
Add-PnPField -DisplayName "Contract Number" -InternalName "ContractNumber" -Type Text -Required -MaxLength 20 -Group "Custom Columns"

# Create a Choice field
Add-PnPField -DisplayName "Status" -InternalName "ProjectStatus" -Type Choice -Group "Custom Columns" -Choices "Not Started","In Progress","Completed","On Hold"

# Create a Managed Metadata field
Add-PnPField -DisplayName "Department" -InternalName "Department" -Type TaxonomyFieldType -Group "Custom Columns" -TermSetPath "Departments"

# Create a Person field
Add-PnPField -DisplayName "Project Manager" -InternalName "ProjectManager" -Type User -Group "Custom Columns"

# Create a Multiple Person field
Add-PnPField -DisplayName "Team Members" -InternalName "TeamMembers" -Type UserMulti -Group "Custom Columns" -AddToDefaultView

# Create a date field
Add-PnPField -DisplayName "Due Date" -InternalName "DueDate" -Type DateTime -Group "Custom Columns" -AddToDefaultView
```

#### Adding Fields to Lists

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Add site column to a list
Add-PnPFieldFromXml -List "Project Tasks" -FieldXml "<Field Type='Text' DisplayName='Task ID' Required='TRUE' Name='TaskID' ID='{a5d345d7-c503-4118-b081-c3b6b30ae328}' StaticName='TaskID' />"

# Add existing site column to a list
Add-PnPField -List "Project Tasks" -Field "Project Code"

# Create a calculated column in a list
$calculatedFieldXml = "<Field Type='Calculated' DisplayName='Days Remaining' Name='DaysRemaining' ResultType='Number'><Formula>=IF([Due Date]&gt;=TODAY(),[Due Date]-TODAY(),0)</Formula><FieldRefs><FieldRef Name='DueDate' /></FieldRefs></Field>"
Add-PnPFieldFromXml -List "Project Tasks" -FieldXml $calculatedFieldXml
```

#### Updating Fields

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get a field
$field = Get-PnPField -Identity "ProjectCode"

# Update a field's properties
$field.Title = "Project ID"
$field.Description = "Unique identifier for the project"
$field.Required = $true
$field.Update()
Invoke-PnPQuery

# Update a field using XML
Set-PnPField -Identity "ProjectCode" -Values @{
    Title = "Project ID";
    Description = "Unique identifier for the project";
    Required = $true;
}
```

#### Field Script Examples

```powershell
function Add-StandardProjectFields {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$ListName
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Standard fields for project management
        $fields = @(
            @{DisplayName = "Project ID"; InternalName = "ProjectID"; Type = "Text"; Required = $true; Group = "Project Fields" },
            @{DisplayName = "Project Phase"; InternalName = "ProjectPhase"; Type = "Choice"; Choices = "Initiation,Planning,Execution,Monitoring,Closure"; Group = "Project Fields" },
            @{DisplayName = "Priority"; InternalName = "ProjectPriority"; Type = "Choice"; Choices = "Low,Medium,High,Critical"; Group = "Project Fields" },
            @{DisplayName = "Start Date"; InternalName = "ProjectStart"; Type = "DateTime"; Group = "Project Fields" },
            @{DisplayName = "End Date"; InternalName = "ProjectEnd"; Type = "DateTime"; Group = "Project Fields" },
            @{DisplayName = "Project Manager"; InternalName = "ProjectManager"; Type = "User"; Group = "Project Fields" }
        )
        
        # Create or update each field
        foreach ($field in $fields) {
            try {
                # Check if field exists
                $existingField = Get-PnPField -Identity $field.InternalName -ErrorAction SilentlyContinue
                
                if ($existingField -eq $null) {
                    # Create new field
                    Write-Host "Creating field: $($field.DisplayName)" -ForegroundColor Yellow
                    
                    if ($field.Type -eq "Choice") {
                        # Handle choice fields
                        $choiceValues = $field.Choices -split ","
                        Add-PnPField -DisplayName $field.DisplayName -InternalName $field.InternalName -Type $field.Type -Group $field.Group -Choices $choiceValues -List $ListName
                    }
                    else {
                        # Handle other field types
                        $params = @{
                            DisplayName = $field.DisplayName
                            InternalName = $field.InternalName
                            Type = $field.Type
                            Group = $field.Group
                            List = $ListName
                        }
                        
                        if ($field.Required -eq $true) {
                            $params.Add("Required", $true)
                        }
                        
                        Add-PnPField @params
                    }
                }
                else {
                    # Field exists, add to list if not already added
                    Write-Host "Field $($field.DisplayName) already exists, adding to list" -ForegroundColor Yellow
                    Add-PnPField -List $ListName -Field $field.InternalName -ErrorAction SilentlyContinue
                }
            }
            catch {
                Write-Warning "Error processing field $($field.DisplayName): $_"
            }
        }
        
        Write-Host "Standard project fields added to $ListName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Error adding standard fields: $_"
        return $false
    }
}

# Usage
Add-StandardProjectFields -SiteUrl "https://contoso.sharepoint.com/sites/project" -ListName "Project Tasks"
```

### View Management

#### Creating and Managing Views

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Create a new view
Add-PnPView -List "Tasks" -Title "Due This Week" -Fields "Title","Status","DueDate","AssignedTo" -Query "<Where><Leq><FieldRef Name='DueDate'/><Value Type='DateTime'><Today OffsetDays='7'/></Value></Leq></Where>" -RowLimit 30 -SetAsDefault

# Get all views from a list
Get-PnPView -List "Tasks" | Select-Object Title, Id, DefaultView, ViewQuery

# Get a specific view
$view = Get-PnPView -List "Tasks" -Identity "Due This Week"
$view.ViewQuery

# Update a view
$view = Get-PnPView -List "Tasks" -Identity "Due This Week"
$view.RowLimit = 50
$view.ViewQuery = "<Where><And><Geq><FieldRef Name='DueDate'/><Value Type='DateTime'><Today/></Value></Geq><Leq><FieldRef Name='DueDate'/><Value Type='DateTime'><Today OffsetDays='7'/></Value></Leq></And></Where>"
$view.Update()
Invoke-PnPQuery

# Remove a view
Remove-PnPView -List "Tasks" -Identity "Due This Week"
```

#### Complex View Creation

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Create a grouped view with sorting
$fields = @("Title", "Status", "Priority", "DueDate", "AssignedTo", "Complete")
$query = "<OrderBy><FieldRef Name='Priority' Ascending='FALSE'/><FieldRef Name='DueDate' Ascending='TRUE'/></OrderBy>"
$viewXml = "<GroupBy Collapse='TRUE'><FieldRef Name='Status'/></GroupBy>"

Add-PnPView -List "Tasks" -Title "Priority by Status" -Fields $fields -Query $query -ViewType Html -AdditionalSettings $viewXml
```

#### Creating Standard Views Script

```powershell
function Add-StandardListViews {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$ListName
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Define standard views
        $views = @(
            @{
                Title = "All Items (Custom)";
                Fields = "Title,ProjectID,Status,DueDate,Priority,AssignedTo,Complete";
                Query = "<OrderBy><FieldRef Name='DueDate' Ascending='TRUE'/></OrderBy>";
                RowLimit = 100;
                SetAsDefault = $true
            },
            @{
                Title = "My Items";
                Fields = "Title,Status,DueDate,Priority,Complete";
                Query = "<Where><Eq><FieldRef Name='AssignedTo'/><Value Type='Integer'><UserID/></Value></Eq></Where><OrderBy><FieldRef Name='DueDate' Ascending='TRUE'/></OrderBy>";
                RowLimit = 50
            },
            @{
                Title = "Overdue Items";
                Fields = "Title,Status,DueDate,Priority,AssignedTo,Complete";
                Query = "<Where><And><Lt><FieldRef Name='DueDate'/><Value Type='DateTime'><Today/></Value></Lt><Neq><FieldRef Name='Complete'/><Value Type='Boolean'>1</Value></Neq></And></Where><OrderBy><FieldRef Name='Priority' Ascending='FALSE'/></OrderBy>";
                RowLimit = 50
            },
            @{
                Title = "Grouped by Priority";
                Fields = "Title,Status,DueDate,AssignedTo,Complete";
                Query = "<OrderBy><FieldRef Name='DueDate' Ascending='TRUE'/></OrderBy>";
                AdditionalSettings = "<GroupBy Collapse='TRUE'><FieldRef Name='Priority'/></GroupBy>";
                RowLimit = 100
            }
        )
        
        # Create each view
        foreach ($view in $views) {
            try {
                Write-Host "Creating view: $($view.Title)" -ForegroundColor Yellow
                
                $params = @{
                    List = $ListName
                    Title = $view.Title
                    Fields = $view.Fields -split ","
                    Query = $view.Query
                    RowLimit = $view.RowLimit
                }
                
                if ($view.SetAsDefault -eq $true) {
                    $params.Add("SetAsDefault", $true)
                }
                
                if ($view.AdditionalSettings) {
                    $params.Add("AdditionalSettings", $view.AdditionalSettings)
                }
                
                Add-PnPView @params
                Write-Host "Created view: $($view.Title)" -ForegroundColor Green
            }
            catch {
                Write-Warning "Error creating view $($view.Title): $_"
            }
        }
        
        return $true
    }
    catch {
        Write-Error "Error adding standard views: $_"
        return $false
    }
}

# Usage
Add-StandardListViews -SiteUrl "https://contoso.sharepoint.com/sites/project" -ListName "Tasks"
```

## Document Management

### Uploading Documents

#### Basic Document Upload

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Upload a single document
Add-PnPFile -Path "C:\Documents\Project Plan.docx" -Folder "Shared Documents"

# Upload with metadata
Add-PnPFile -Path "C:\Documents\Project Plan.docx" -Folder "Shared Documents" -Values @{
    Title = "Project X Implementation Plan"
    Category = "Planning"
}
```

#### Bulk Document Upload

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Upload all files from a folder
$sourceFolder = "C:\Documents\Project Files"
$targetFolder = "Shared Documents/Project X"

# Get all files from the source folder
$files = Get-ChildItem -Path $sourceFolder -File -Recurse

foreach ($file in $files) {
    try {
        # Determine target location, preserving folder structure
        $relativePath = $file.FullName.Substring($sourceFolder.Length)
        $relativePath = $relativePath.Replace("\", "/")
        $targetPath = "$targetFolder$relativePath"
        $targetDirectory = Split-Path -Path $targetPath -Parent
        
        # Ensure target folder exists
        $folderExists = Get-PnPFolder -Url $targetDirectory -ErrorAction SilentlyContinue
        if ($null -eq $folderExists) {
            Resolve-PnPFolder -SiteRelativePath $targetDirectory
        }
        
        # Upload the file
        Write-Host "Uploading $($file.Name) to $targetDirectory" -ForegroundColor Yellow
        $uploadedFile = Add-PnPFile -Path $file.FullName -Folder $targetDirectory
        
        # Add metadata if needed
        if ($uploadedFile) {
            $item = $uploadedFile.ListItemAllFields
            $item["Title"] = $file.BaseName # Setting the Title property
            $item.Update()
            Invoke-PnPQuery
        }
        
        Write-Host "Uploaded $($file.Name)" -ForegroundColor Green
    }
    catch {
        Write-Error "Error uploading $($file.Name): $_"
    }
}
```

#### Upload with Version Handling

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

function Add-DocumentWithVersion {
    param (
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetFolder,
        [Parameter(Mandatory = $false)]
        [hashtable]$Metadata,
        [Parameter(Mandatory = $false)]
        [string]$CheckInComment = "Initial version",
        [Parameter(Mandatory = $false)]
        [switch]$Publish
    )
    
    try {
        # Upload the document
        Write-Host "Uploading $FilePath to $TargetFolder" -ForegroundColor Yellow
        $uploadedFile = Add-PnPFile -Path $FilePath -Folder $TargetFolder
        $item = $uploadedFile.ListItemAllFields
        
        # Apply metadata if provided
        if ($Metadata -and $Metadata.Count -gt 0) {
            foreach ($key in $Metadata.Keys) {
                $item[$key] = $Metadata[$key]
            }
            $item.Update()
            Invoke-PnPQuery
        }
        
        # Check in and publish if needed
        if ($Publish) {
            Set-PnPFileCheckedIn -Url $uploadedFile.ServerRelativeUrl -Comment $CheckInComment -CheckinType MajorCheckIn
            Write-Host "File checked in and published" -ForegroundColor Green
        }
        
        return $uploadedFile
    }
    catch {
        Write-Error "Error uploading file: $_"
        return $null
    }
}

# Usage
$metadata = @{
    Title = "Project Implementation Plan"
    DocumentStatus = "Draft"
    ReviewDate = (Get-Date).AddMonths(1)
}

Add-DocumentWithVersion -FilePath "C:\Documents\Project Plan.docx" -TargetFolder "Shared Documents/Project X" -Metadata $metadata -CheckInComment "Initial draft for review" -Publish
```

### Downloading Documents

#### Basic Document Download

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Download a file
Get-PnPFile -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -Path "C:\Downloads" -Filename "Project_Plan.docx" -AsFile

# Download a file by server relative URL
Get-PnPFile -ServerRelativeUrl "/sites/teamsite/Shared Documents/Project Plan.docx" -Path "C:\Downloads" -AsFile
```

#### Bulk Document Download

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

function Export-SharePointLibrary {
    param (
        [Parameter(Mandatory = $true)]
        [string]$LibraryName,
        [Parameter(Mandatory = $true)]
        [string]$DownloadPath,
        [Parameter(Mandatory = $false)]
        [string]$FolderPath = "",
        [Parameter(Mandatory = $false)]
        [switch]$PreserveStructure,
        [Parameter(Mandatory = $false)]
        [switch]$Recursive
    )
    
    try {
        # Create target directory if it doesn't exist
        if (-not (Test-Path -Path $DownloadPath)) {
            New-Item -Path $DownloadPath -ItemType Directory -Force | Out-Null
        }
        
        # Get the library
        $library = Get-PnPList -Identity $LibraryName
        if (-not $library) {
            throw "Library '$LibraryName' not found"
        }
        
        # Determine the folder to work with
        $folderUrl = $library.RootFolder.ServerRelativeUrl
        if (-not [string]::IsNullOrEmpty($FolderPath)) {
            $folderUrl = "$folderUrl/$FolderPath"
        }
        
        # Get items from the folder
        $folder = Get-PnPFolder -Url $folderUrl
        $folderItems = Get-PnPFolderItem -FolderSiteRelativeUrl $folder.ServerRelativeUrl -ItemType File
        
        # Download each file
        foreach ($file in $folderItems) {
            $targetPath = $DownloadPath
            
                            if ($PreserveStructure) {
                # Create path that mirrors the SharePoint structure
                $relativePath = $file.ServerRelativeUrl.Substring($library.RootFolder.ServerRelativeUrl.Length)
                $relativePath = $relativePath.TrimStart('/')
                $relativePath = Split-Path -Path $relativePath -Parent
                $relativePath = $relativePath.Replace("/", "\")
                
                if (-not [string]::IsNullOrEmpty($relativePath)) {
                    $targetPath = Join-Path -Path $DownloadPath -ChildPath $relativePath
                    if (-not (Test-Path -Path $targetPath)) {
                        New-Item -Path $targetPath -ItemType Directory -Force | Out-Null
                    }
                }
            }
            
            # Download the file
            $fileName = Split-Path -Path $file.ServerRelativeUrl -Leaf
            $targetFile = Join-Path -Path $targetPath -ChildPath $fileName
            
            Write-Host "Downloading: $($file.ServerRelativeUrl) to $targetFile" -ForegroundColor Yellow
            Get-PnPFile -ServerRelativeUrl $file.ServerRelativeUrl -Path $targetPath -Filename $fileName -AsFile
            Write-Host "Downloaded: $fileName" -ForegroundColor Green
        }
        
        # Process subfolders if recursive
        if ($Recursive) {
            $subFolders = Get-PnPFolderItem -FolderSiteRelativeUrl $folder.ServerRelativeUrl -ItemType Folder
            
            foreach ($subFolder in $subFolders) {
                $subFolderPath = $subFolder.ServerRelativeUrl.Substring($library.RootFolder.ServerRelativeUrl.Length).TrimStart('/')
                Write-Host "Processing subfolder: $subFolderPath" -ForegroundColor Yellow
                
                Export-SharePointLibrary -LibraryName $LibraryName -DownloadPath $DownloadPath -FolderPath $subFolderPath -PreserveStructure:$PreserveStructure -Recursive:$Recursive
            }
        }
        
        Write-Host "Completed downloading content from $folderUrl" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Error exporting library: $_"
        return $false
    }
}

# Usage
Export-SharePointLibrary -LibraryName "Documents" -DownloadPath "C:\Downloads\SharePointExport" -FolderPath "Project X" -PreserveStructure -Recursive
```

#### Downloading Files with Specific Criteria

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

function Export-DocumentsByQuery {
    param (
        [Parameter(Mandatory = $true)]
        [string]$ListName,
        [Parameter(Mandatory = $true)]
        [string]$DownloadPath,
        [Parameter(Mandatory = $false)]
        [string]$CamlQuery,
        [Parameter(Mandatory = $false)]
        [switch]$IncludeMetadataFile
    )
    
    try {
        # Create target directory if it doesn't exist
        if (-not (Test-Path -Path $DownloadPath)) {
            New-Item -Path $DownloadPath -ItemType Directory -Force | Out-Null
        }
        
        # Set up default query if none provided
        if ([string]::IsNullOrEmpty($CamlQuery)) {
            $CamlQuery = "<View><Query><Where><Geq><FieldRef Name='Modified' /><Value Type='DateTime'><Today OffsetDays='-30' /></Value></Geq></Where></Query></View>"
        }
        
        # Get the items that match the query
        $items = Get-PnPListItem -List $ListName -Query $CamlQuery
        Write-Host "Found $($items.Count) items matching the query" -ForegroundColor Yellow
        
        # Create an array to store metadata
        $metadataArray = @()
        
        # Download each file
        foreach ($item in $items) {
            # Get file information
            $file = Get-PnPProperty -ClientObject $item -Property File
            
            if ($null -ne $file) {
                $serverRelativeUrl = $file.ServerRelativeUrl
                $fileName = Split-Path -Path $serverRelativeUrl -Leaf
                $targetFile = Join-Path -Path $DownloadPath -ChildPath $fileName
                
                # Download the file
                Write-Host "Downloading: $serverRelativeUrl to $targetFile" -ForegroundColor Yellow
                Get-PnPFile -ServerRelativeUrl $serverRelativeUrl -Path $DownloadPath -Filename $fileName -AsFile
                
                # If we need to track metadata
                if ($IncludeMetadataFile) {
                    # Get properties we want to track
                    $metadata = [ordered]@{
                        FileName = $fileName
                        ServerRelativeUrl = $serverRelativeUrl
                        Title = $item["Title"]
                        Modified = $item["Modified"]
                        ModifiedBy = $item["Editor"].Email
                        Created = $item["Created"]
                        CreatedBy = $item["Author"].Email
                    }
                    
                    # Add any custom fields you want here
                    if ($item["DocumentType"]) {
                        $metadata.Add("DocumentType", $item["DocumentType"])
                    }
                    
                    # Add to array
                    $metadataArray += New-Object PSObject -Property $metadata
                }
                
                Write-Host "Downloaded: $fileName" -ForegroundColor Green
            }
        }
        
        # Output metadata to CSV if needed
        if ($IncludeMetadataFile -and $metadataArray.Count -gt 0) {
            $metadataCsvPath = Join-Path -Path $DownloadPath -ChildPath "_metadata.csv"
            $metadataArray | Export-Csv -Path $metadataCsvPath -NoTypeInformation
            Write-Host "Metadata exported to: $metadataCsvPath" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Error "Error exporting documents: $_"
        return $false
    }
}

# Usage examples

# Download documents modified in the last 30 days
Export-DocumentsByQuery -ListName "Documents" -DownloadPath "C:\Downloads\Recent" -IncludeMetadataFile

# Download documents by a specific author
$query = "<View><Query><Where><Eq><FieldRef Name='Author' LookupId='TRUE' /><Value Type='Integer'><UserID /></Value></Eq></Where></Query></View>"
Export-DocumentsByQuery -ListName "Documents" -DownloadPath "C:\Downloads\MyDocs" -CamlQuery $query -IncludeMetadataFile

# Download documents by content type
$query = "<View><Query><Where><Eq><FieldRef Name='ContentType' /><Value Type='Text'>Project Document</Value></Eq></Where></Query></View>"
Export-DocumentsByQuery -ListName "Documents" -DownloadPath "C:\Downloads\ProjectDocs" -CamlQuery $query -IncludeMetadataFile
```

### Managing Document Metadata

#### Setting Document Metadata

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get the file
$file = Get-PnPFile -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -AsListItem

# Update metadata
$file["Title"] = "Updated Project Plan"
$file["DocumentStatus"] = "Final"
$file["ReviewDate"] = Get-Date
$file.Update()
Invoke-PnPQuery

# Set metadata for multiple files that match a pattern
$camlQuery = "<View><Query><Where><Eq><FieldRef Name='ContentType' /><Value Type='Text'>Project Document</Value></Eq></Where></Query></View>"
$items = Get-PnPListItem -List "Documents" -Query $camlQuery

foreach ($item in $items) {
    $item["DocumentStatus"] = "Under Review"
    $item["ReviewDate"] = (Get-Date).AddDays(30)
    $item.Update()
}
Invoke-PnPQuery
```

#### Bulk Metadata Update

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

function Update-DocumentMetadataFromCsv {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$LibraryName,
        [Parameter(Mandatory = $true)]
        [string]$CsvPath
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Import the CSV data
        $updates = Import-Csv -Path $CsvPath
        Write-Host "Loaded $($updates.Count) records from CSV" -ForegroundColor Yellow
        
        # Process each row in the CSV
        foreach ($row in $updates) {
            try {
                # CSV should have a "FilePath" column with the file path relative to the library
                if (-not $row.FilePath) {
                    Write-Warning "Skipping row - missing FilePath"
                    continue
                }
                
                # Get the file
                $fileRelativeUrl = "$LibraryName/$($row.FilePath.Replace('\', '/'))"
                Write-Host "Processing file: $fileRelativeUrl" -ForegroundColor Yellow
                
                # Get the file as a list item
                $file = Get-PnPFile -Url $fileRelativeUrl -AsListItem -ErrorAction SilentlyContinue
                
                if ($null -eq $file) {
                    Write-Warning "File not found: $fileRelativeUrl"
                    continue
                }
                
                # Update properties from CSV columns
                $updated = $false
                
                foreach ($property in $row.PSObject.Properties) {
                    $propName = $property.Name
                    $propValue = $property.Value
                    
                    # Skip the FilePath column itself
                    if ($propName -eq "FilePath") {
                        continue
                    }
                    
                    # Update the property if it has a value
                    if (-not [string]::IsNullOrEmpty($propValue)) {
                        # Handle special types like dates
                        if ($propName -like "*Date*" -and [DateTime]::TryParse($propValue, [ref]$null)) {
                            $file[$propName] = [DateTime]::Parse($propValue)
                        }
                        else {
                            $file[$propName] = $propValue
                        }
                        $updated = $true
                        Write-Host "  - Updated $propName to: $propValue" -ForegroundColor Cyan
                    }
                }
                
                # Save changes if any were made
                if ($updated) {
                    $file.Update()
                    Write-Host "Updated metadata for: $fileRelativeUrl" -ForegroundColor Green
                }
                else {
                    Write-Host "No changes needed for: $fileRelativeUrl" -ForegroundColor Gray
                }
            }
            catch {
                Write-Error "Error updating file metadata: $_"
            }
        }
        
        # Execute all pending changes
        Invoke-PnPQuery
        Write-Host "Completed metadata updates" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Error in Update-DocumentMetadataFromCsv: $_"
        return $false
    }
}

# Usage
Update-DocumentMetadataFromCsv -SiteUrl "https://contoso.sharepoint.com/sites/teamsite" -LibraryName "Shared Documents" -CsvPath "C:\Data\DocumentUpdates.csv"
```

Example CSV format for bulk updates:
```
FilePath,Title,DocumentType,ReviewDate,Status
Project X/Requirements.docx,Project X Requirements,Specification,2023-06-30,Approved
Project X/Architecture.docx,System Architecture,Technical Design,2023-07-15,Draft
Project X/Testing/TestPlan.docx,Test Plan and Strategy,Test Document,2023-08-01,Under Review
```

### Version Management

#### Working with Document Versions

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get version history of a document
$file = Get-PnPFile -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -AsFileObject
$versions = Get-PnPProperty -ClientObject $file -Property Versions
$versions | Format-Table ID, CreatedBy, VersionLabel, CheckInComment

# Download a specific version
$version = $versions | Where-Object { $_.VersionLabel -eq "3.0" }
if ($version) {
    $openBinaryUrl = $version.OpenBinaryUrl
    $webUrl = Get-PnPWeb
    $context = Get-PnPContext
    $context.Load($webUrl)
    Invoke-PnPQuery
    $fullUrl = $webUrl.Url + $openBinaryUrl
    
    # Use Invoke-WebRequest to download
    $tempFile = [System.IO.Path]::GetTempFileName()
    Invoke-WebRequest -Uri $fullUrl -OutFile $tempFile -UseDefaultCredentials
    
    # Rename the file to a proper name
    $targetFile = "C:\Downloads\Project Plan v3.0.docx"
    Move-Item -Path $tempFile -Destination $targetFile -Force
    
    Write-Host "Downloaded version $($version.VersionLabel) to $targetFile" -ForegroundColor Green
}
```

#### Publishing and Approving Documents

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Check in a document with comments
Set-PnPFileCheckedIn -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -Comment "Completed the implementation section" -CheckinType MajorCheckIn

# Check out a document
Set-PnPFileCheckedOut -Url "/sites/teamsite/Shared Documents/Project Plan.docx"

# Discard checkout
Set-PnPFileCheckedIn -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -CheckinType MajorCheckIn -DiscardCheckOut

# Publish a major version
$file = Get-PnPFile -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -AsFileObject
$file.Publish("Published for stakeholder review")
Invoke-PnPQuery

# Approve a document in a library with approval workflow
$item = Get-PnPFile -Url "/sites/teamsite/Shared Documents/Project Plan.docx" -AsListItem
$item["_ModerationStatus"] = 0  # 0 = Approved, 1 = Rejected, 2 = Pending
$item["_ModerationComments"] = "Approved by PowerShell automation"
$item.Update()
Invoke-PnPQuery
```

#### Version Management Script

```powershell
function Manage-DocumentVersions {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$LibraryName,
        [Parameter(Mandatory = $false)]
        [string]$FolderPath = "",
        [Parameter(Mandatory = $false)]
        [int]$KeepVersions = 5,
        [Parameter(Mandatory = $false)]
        [switch]$IncludeMinorVersions,
        [Parameter(Mandatory = $false)]
        [switch]$WhatIf
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Determine the folder path to work with
        $folderUrl = "/$LibraryName"
        if (-not [string]::IsNullOrEmpty($FolderPath)) {
            $folderUrl = "$folderUrl/$FolderPath"
        }
        
        # Get all files in the folder
        $web = Get-PnPWeb
        $folder = Get-PnPFolder -Url "$($web.ServerRelativeUrl)$folderUrl"
        $files = Get-PnPFolderItem -FolderSiteRelativeUrl $folder.ServerRelativeUrl -ItemType File
        
        Write-Host "Found $($files.Count) files to process" -ForegroundColor Yellow
        
        foreach ($fileItem in $files) {
            try {
                # Get the file object
                $file = Get-PnPFile -Url $fileItem.ServerRelativeUrl -AsFileObject
                $versions = Get-PnPProperty -ClientObject $file -Property Versions
                
                # Skip files with few versions
                if ($versions.Count -le $KeepVersions) {
                    Write-Host "Skipping $($fileItem.Name) - only has $($versions.Count) versions" -ForegroundColor Gray
                    continue
                }
                
                Write-Host "Processing $($fileItem.Name) - has $($versions.Count) versions" -ForegroundColor Yellow
                
                # Sort versions by label to get the correct order
                $versionsSorted = $versions | Sort-Object -Property { 
                    # Convert version label to numeric value for sorting
                    [double]($_.VersionLabel -replace '(\d+)\.(\d+)', '$1$2') 
                } -Descending
                
                # Keep track of versions to delete
                $versionsToDelete = @()
                $keptMajorVersions = 0
                
                # Identify versions to keep/delete
                foreach ($version in $versionsSorted) {
                    # Check if this is a major version (x.0)
                    $isMajorVersion = $version.VersionLabel -match '\d+\.0
                    
                    if ($isMajorVersion) {
                        $keptMajorVersions++
                        if ($keptMajorVersions > $KeepVersions) {
                            $versionsToDelete += $version
                        }
                    }
                    elseif ($IncludeMinorVersions) {
                        # For minor versions, keep only if they're related to kept major versions
                        $majorVersionNum = [int]($version.VersionLabel -replace '(\d+)\..*', '$1')
                        $latestMajorNum = [int]($versionsSorted[0].VersionLabel -replace '(\d+)\..*', '$1')
                        
                        if ($majorVersionNum < ($latestMajorNum - $KeepVersions + 1)) {
                            $versionsToDelete += $version
                        }
                    }
                    else {
                        # If not including minor versions, keep all of them
                        continue
                    }
                }
                
                # Delete the identified versions
                if ($versionsToDelete.Count -gt 0) {
                    Write-Host "Will delete $($versionsToDelete.Count) versions from $($fileItem.Name)" -ForegroundColor Cyan
                    
                    foreach ($versionToDelete in $versionsToDelete) {
                        if ($WhatIf) {
                            Write-Host "  WhatIf: Would delete version $($versionToDelete.VersionLabel)" -ForegroundColor Gray
                        }
                        else {
                            Write-Host "  Deleting version $($versionToDelete.VersionLabel)" -ForegroundColor Yellow
                            $versionToDelete.DeleteObject()
                        }
                    }
                    
                    if (-not $WhatIf) {
                        Invoke-PnPQuery
                        Write-Host "Deleted versions for $($fileItem.Name)" -ForegroundColor Green
                    }
                }
                else {
                    Write-Host "No versions to delete for $($fileItem.Name)" -ForegroundColor Gray
                }
            }
            catch {
                Write-Error "Error processing file $($fileItem.Name): $_"
            }
        }
        
        Write-Host "Completed version management for $LibraryName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Error in version management: $_"
        return $false
    }
}

# Usage example
Manage-DocumentVersions -SiteUrl "https://contoso.sharepoint.com/sites/teamsite" -LibraryName "Documents" -KeepVersions 5 -IncludeMinorVersions -WhatIf
```

### Check-in/Check-out Operations

#### Managing Document Checkouts

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Get all checked out files in a library
$checkedOutFiles = Get-PnPListItem -List "Documents" -Query "<View><Query><Where><IsNotNull><FieldRef Name='CheckoutUser' /></IsNotNull></Where></Query></View>"

foreach ($item in $checkedOutFiles) {
    # Get file info
    $file = Get-PnPProperty -ClientObject $item -Property File
    $checkoutUser = Get-PnPProperty -ClientObject $file -Property CheckedOutByUser
    
    Write-Host "File: $($file.Name)" -ForegroundColor Yellow
    Write-Host "  - Checked out by: $($checkoutUser.Email)" -ForegroundColor Cyan
    Write-Host "  - Checked out since: $($file.CheckOutDate)" -ForegroundColor Cyan
}

# Discard all checkouts (admin operation)
foreach ($item in $checkedOutFiles) {
    $file = Get-PnPProperty -ClientObject $item -Property File
    $serverRelativeUrl = $file.ServerRelativeUrl
    
    # Check for special management cases (e.g., long checkout)
    $daysCheckedOut = (Get-Date) - $file.CheckOutDate
    
    if ($daysCheckedOut.TotalDays -gt 30) {
        Write-Host "File checked out for over 30 days: $($file.Name)" -ForegroundColor Red
        
        # Discard checkout
        Set-PnPFileCheckedIn -Url $serverRelativeUrl -CheckinType MajorCheckIn -DiscardCheckOut
        Write-Host "Discarded checkout for: $($file.Name)" -ForegroundColor Green
    }
}
```

#### Checkout Management Script

```powershell
function Manage-CheckedOutFiles {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$LibraryName,
        [Parameter(Mandatory = $false)]
        [int]$OlderThanDays = 7,
        [Parameter(Mandatory = $false)]
        [switch]$NotifyUsers,
        [Parameter(Mandatory = $false)]
        [switch]$ForceCheckin,
        [Parameter(Mandatory = $false)]
        [switch]$WhatIf
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Get checked out files
        $cutoffDate = (Get-Date).AddDays(-$OlderThanDays)
        $camlQuery = "<View><Query><Where><And><IsNotNull><FieldRef Name='CheckoutUser' /></IsNotNull><Lt><FieldRef Name='Modified' /><Value Type='DateTime'>$($cutoffDate.ToString('yyyy-MM-ddTHH:mm:ssZ'))</Value></Lt></And></Where></Query></View>"
        
        $checkedOutFiles = Get-PnPListItem -List $LibraryName -Query $camlQuery
        
        if ($checkedOutFiles.Count -eq 0) {
            Write-Host "No files found checked out longer than $OlderThanDays days" -ForegroundColor Green
            return
        }
        
        Write-Host "Found $($checkedOutFiles.Count) files checked out longer than $OlderThanDays days" -ForegroundColor Yellow
        
        # Group files by checkout user
        $filesByUser = @{}
        
        foreach ($item in $checkedOutFiles) {
            $file = Get-PnPProperty -ClientObject $item -Property File
            $checkoutUser = Get-PnPProperty -ClientObject $file -Property CheckedOutByUser
            
            if (-not $filesByUser.ContainsKey($checkoutUser.Email)) {
                $filesByUser[$checkoutUser.Email] = @()
            }
            
            $filesByUser[$checkoutUser.Email] += @{
                Name = $file.Name
                Url = $file.ServerRelativeUrl
                CheckoutDate = $file.CheckOutDate
                DaysCheckedOut = ((Get-Date) - $file.CheckOutDate).Days
            }
        }
        
        # Process each user's files
        foreach ($userEmail in $filesByUser.Keys) {
            $userFiles = $filesByUser[$userEmail]
            Write-Host "User: $userEmail has $($userFiles.Count) files checked out" -ForegroundColor Cyan
            
            foreach ($fileInfo in $userFiles) {
                Write-Host "  - $($fileInfo.Name) - Checked out for $($fileInfo.DaysCheckedOut) days" -ForegroundColor Yellow
                
                if ($ForceCheckin) {
                    if ($WhatIf) {
                        Write-Host "    WhatIf: Would force check-in file" -ForegroundColor Gray
                    }
                    else {
                        Write-Host "    Force checking in file" -ForegroundColor Red
                        Set-PnPFileCheckedIn -Url $fileInfo.Url -CheckinType MajorCheckIn -DiscardCheckOut -Comment "Automatically checked in after $($fileInfo.DaysCheckedOut) days of inactivity"
                    }
                }
            }
            
            # Notify user if required
            if ($NotifyUsers) {
                if ($WhatIf) {
                    Write-Host "  WhatIf: Would send email notification to $userEmail" -ForegroundColor Gray
                }
                else {
                    # Compose email body
                    $emailBody = @"
<p>Dear $userEmail,</p>
<p>You have the following files checked out in the $LibraryName library for more than $OlderThanDays days:</p>
<ul>
$($userFiles | ForEach-Object { "<li>$($_.Name) - Checked out on $($_.CheckoutDate.ToString('yyyy-MM-dd'))</li>" })
</ul>
<p>Please check in these files or discard your checkout if you are no longer working on them.</p>
<p>Thank you,<br>SharePoint Administrator</p>
"@
                    
                    # Send email (requires Exchange Online or other email functionality)
                    # This is just a placeholder - implement your email sending logic here
                    Write-Host "  Would send email to $userEmail with $($userFiles.Count) files" -ForegroundColor Gray
                }
            }
        }
        
        return $true
    }
    catch {
        Write-Error "Error managing checked out files: $_"
        return $false
    }
}

# Usage example
Manage-CheckedOutFiles -SiteUrl "https://contoso.sharepoint.com/sites/teamsite" -LibraryName "Documents" -OlderThanDays 14 -NotifyUsers -WhatIf
```

## User and Permission Management

### Managing Site Users

#### Adding and Removing Users

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Add a user to a SharePoint group
Add-PnPUserToGroup -LoginName "user@contoso.com" -Identity "Project Managers"

# Add multiple users to a group
$users = @("user1@contoso.com", "user2@contoso.com", "user3@contoso.com")
foreach ($user in $users) {
    Add-PnPUserToGroup -LoginName $user -Identity "Site Members"
}

# Add a user with a specific role (direct permission)
Set-PnPWebPermission -User "external@partner.com" -AddRole "Read"

# Remove a user from a group
Remove-PnPUserFromGroup -LoginName "user@contoso.com" -Identity "Project Managers"

# Remove user permissions completely
Remove-PnPUserFromSite -LoginName "external@partner.com"

# Get all users in a site
Get-PnPUser | Select-Object Title, LoginName, Email
```

#### Managing External Users

```powershell
# Connect to site
Connect-PnPOnline -Url "https://contoso.sharepoint.com/sites/teamsite" -Interactive

# Check external sharing settings
$web = Get-PnPWeb -Includes SharingAllowedDomainList, SharingBlockedDomainList, SharingDomainRestrictionMode
$web | Select-Object Title, SharingDomainRestrictionMode, SharingAllowedDomainList, SharingBlockedDomainList

# Set allowed domains for external sharing
Set-PnPWeb -SharingAllowedDomainList "partner.com,vendor.com" -SharingDomainRestrictionMode "AllowList"

# Set blocked domains for external sharing
Set-PnPWeb -SharingBlockedDomainList "competitor.com" -SharingDomainRestrictionMode "BlockList"

# Check if a user exists (useful for external users)
$userExists = Get-PnPUser | Where-Object { $_.Email -eq "external@partner.com" }
if ($userExists) {
    Write-Host "User already exists in site" -ForegroundColor Green
}
else {
    Write-Host "User does not exist in site" -ForegroundColor Yellow
}

# Report on external users
$externalUsers = Get-PnPUser | Where-Object { $_.LoginName -like "*#ext#*" }
$externalUsers | Select-Object Title, Email, LoginName | Export-Csv -Path "C:\Reports\ExternalUsers.csv" -NoTypeInformation
```

#### User Management Script

```powershell
function Sync-SiteUsers {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$CsvPath,
        [Parameter(Mandatory = $false)]
        [switch]$RemoveUnlistedUsers,
        [Parameter(Mandatory = $false)]
        [switch]$WhatIf
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Import user data from CSV
        # Expected CSV format: Email,Group,Role
        # Group can be a SharePoint group name, Role can be "Full Control", "Edit", "Contribute", "Read", etc.
        $userData = Import-Csv -Path $CsvPath
        Write-Host "Loaded $($userData.Count) user entries from CSV" -ForegroundColor Yellow
        
        # Get existing site users and groups for comparison
        $existingUsers = Get-PnPUser
        $existingGroups = Get-PnPGroup
        
        # Keep track of processed users for removal if $RemoveUnlistedUsers is specified
        $processedUsers = @{}
        
        # Process each user from CSV
        foreach ($user in $userData) {
            try {
                # Validate required fields
                if ([string]::IsNullOrEmpty($user.Email)) {
                    Write-Warning "Skipping entry - missing Email field"
                    continue
                }
                
                # Determine if we're adding to a group or assigning a direct permission
                $usingGroup = -not [string]::IsNullOrEmpty($user.Group)
                $usingRole = -not [string]::IsNullOrEmpty($user.Role)
                
                if (-not ($usingGroup -or $usingRole)) {
                    Write-Warning "Skipping $($user.Email) - neither Group nor Role specified"
                    continue
                }
                
                # Track user as processed
                $processedUsers[$user.Email.ToLower()] = $true
                
                # Check if user exists in the site
                $userExists = $existingUsers | Where-Object { $_.Email -eq $user.Email }
                
                if ($usingGroup) {
                    # Check if group exists
                    $group = $existingGroups | Where-Object { $_.Title -eq $user.Group }
                    
                    if ($null -eq $group) {
                        Write-Warning "Group '$($user.Group)' not found - skipping user $($user.Email)"
                        continue
                    }
                    
                    # Check if user is already in the group
                    $groupUsers = Get-PnPGroupMember -Identity $user.Group
                    $userInGroup = $groupUsers | Where-Object { $_.Email -eq $user.Email }
                    
                    if ($null -eq $userInGroup) {
                        # Add user to group
                        if ($WhatIf) {
                            Write-Host "WhatIf: Would add $($user.Email) to group '$($user.Group)'" -ForegroundColor Cyan
                        } else {
                            Write-Host "Adding $($user.Email) to group '$($user.Group)'" -ForegroundColor Yellow
                            Add-PnPUserToGroup -LoginName $user.Email -Identity $user.Group
                            Write-Host "Added $($user.Email) to group '$($user.Group)'" -ForegroundColor Green
                        }
                    } else {
                        Write-Host "User $($user.Email) already in group '$($user.Group)'" -ForegroundColor Gray
                    }
                }
                
                if ($usingRole) {
                    # Check if user already has this permission level
                    if ($userExists) {
                        # For direct permission assignment, this would require checking current permissions
                        # This is a simplified check that could be enhanced
                        
                        if ($WhatIf) {
                            Write-Host "WhatIf: Would assign role '$($user.Role)' to $($user.Email)" -ForegroundColor Cyan
                        } else {
                            Write-Host "Assigning role '$($user.Role)' to $($user.Email)" -ForegroundColor Yellow
                            Set-PnPWebPermission -User $user.Email -AddRole $user.Role
                            Write-Host "Assigned role '$($user.Role)' to $($user.Email)" -ForegroundColor Green
                        }
                    } else {
                        # User doesn't exist in site yet, need to add with permissions
                        if ($WhatIf) {
                            Write-Host "WhatIf: Would add $($user.Email) with role '$($user.Role)'" -ForegroundColor Cyan
                        } else {
                            Write-Host "Adding $($user.Email) with role '$($user.Role)'" -ForegroundColor Yellow
                            Set-PnPWebPermission -User $user.Email -AddRole $user.Role
                            Write-Host "Added $($user.Email) with role '$($user.Role)'" -ForegroundColor Green
                        }
                    }
                }
            }
            catch {
                Write-Error "Error processing user $($user.Email): $_"
            }
        }
        
        # Remove users not in the CSV if requested
        if ($RemoveUnlistedUsers) {
            Write-Host "Checking for users to remove..." -ForegroundColor Yellow
            
            foreach ($existingUser in $existingUsers) {
                # Skip system accounts and empty emails
                if ([string]::IsNullOrEmpty($existingUser.Email) -or $existingUser.LoginName -like "*app@sharepoint") {
                    continue
                }
                
                # Skip processed users
                if ($processedUsers.ContainsKey($existingUser.Email.ToLower())) {
                    continue
                }
                
                if ($WhatIf) {
                    Write-Host "WhatIf: Would remove user $($existingUser.Email) from site" -ForegroundColor Cyan
                } else {
                    Write-Host "Removing user $($existingUser.Email) from site" -ForegroundColor Yellow
                    try {
                        Remove-PnPUserFromSite -LoginName $existingUser.LoginName
                        Write-Host "Removed user $($existingUser.Email) from site" -ForegroundColor Green
                    }
                    catch {
                        Write-Error "Error removing user $($existingUser.Email): $_"
                    }
                }
            }
        }
        
        Write-Host "Completed user synchronization for site" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Error in Sync-SiteUsers: $_"
        return $false
    }
}
### Advanced Search Queries

```powershell
# Connect to site
Connect-PnPOnline -Url \"https://contoso.sharepoint.com/sites/teamsite\" -Interactive

# Using SharePoint Search Query Language (KQL)
# Search for documents modified by a specific person in the last month
$searchResults = Submit-PnPSearchQuery -Query \"Author:john.doe@contoso.com LastModifiedTime>2023-05-01\"

# Search for documents with specific content type and keywords
$searchResults = Submit-PnPSearchQuery -Query \"ContentType:\\\"Project Document\\\" AND (requirements OR specifications)\"

# Search with wildcards
$searchResults = Submit-PnPSearchQuery -Query \"Project*Plan\"

# Search with proximity operators
$searchResults = Submit-PnPSearchQuery -Query \"\\\"project implementation\\\"~5\"

# Exclude certain results
$searchResults = Submit-PnPSearchQuery -Query \"project -draft -archive\"

# Combine multiple criteria
$searchQuery = \"ContentType:\\\"Project Document\\\" AND FileType:docx AND LastModifiedTime>2023-05-01 NOT(Status:Completed)\"
$searchResults = Submit-PnPSearchQuery -Query $searchQuery

# Search with managed properties
$searchResults = Submit-PnPSearchQuery -Query \"DepartmentOWSTEXT:Finance\"

# Search for specific file types
$searchResults = Submit-PnPSearchQuery -Query \"FileType:xlsx OR FileType:pptx\"
```

#### Complex Search Function Example

```powershell
function Search-SharePointContent {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$Keywords,
        [Parameter(Mandatory = $false)]
        [string]$ContentType,
        [Parameter(Mandatory = $false)]
        [string]$FileType,
        [Parameter(Mandatory = $false)]
        [string]$Author,
        [Parameter(Mandatory = $false)]
        [DateTime]$ModifiedAfter,
        [Parameter(Mandatory = $false)]
        [DateTime]$ModifiedBefore,
        [Parameter(Mandatory = $false)]
        [string]$Path,
        [Parameter(Mandatory = $false)]
        [int]$MaxResults = 50
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Build search query
        $searchQuery = $Keywords
        
        # Add content type filter if specified
        if (-not [string]::IsNullOrEmpty($ContentType)) {
            $searchQuery += \" ContentType:\\\"$ContentType\\\"\"
        }
        
        # Add file type filter if specified
        if (-not [string]::IsNullOrEmpty($FileType)) {
            $searchQuery += \" FileType:$FileType\"
        }
        
        # Add author filter if specified
        if (-not [string]::IsNullOrEmpty($Author)) {
            $searchQuery += \" Author:$Author\"
        }
        
        # Add modified date range if specified
        if ($ModifiedAfter -ne $null) {
            $dateString = $ModifiedAfter.ToString(\"yyyy-MM-dd\")
            $searchQuery += \" LastModifiedTime>=$dateString\"
        }
        
        if ($ModifiedBefore -ne $null) {
            $dateString = $ModifiedBefore.ToString(\"yyyy-MM-dd\")
            $searchQuery += \" LastModifiedTime<=$dateString\"
        }
        
        # Add path filter if specified
        if (-not [string]::IsNullOrEmpty($Path)) {
            $searchQuery += \" Path:$Path\"
        }
        
        Write-Host \"Executing search query: $searchQuery\" -ForegroundColor Yellow
        
        # Execute search
        $searchResults = Submit-PnPSearchQuery -Query $searchQuery -MaxResults $MaxResults
        
        Write-Host \"Found $($searchResults.TotalRows) results\" -ForegroundColor Green
        return $searchResults.PrimarySearchResults
    }
    catch {
        Write-Error \"Error performing search: $_\"
        return $null
    }
}

# Usage example
$results = Search-SharePointContent \\
    -SiteUrl \"https://contoso.sharepoint.com/sites/teamsite\" \\
    -Keywords \"project plan\" \\
    -ContentType \"Project Document\" \\
    -FileType \"docx\" \\
    -ModifiedAfter (Get-Date).AddMonths(-1) \\
    -Path \"https://contoso.sharepoint.com/sites/teamsite/Shared Documents\"

$results | Select-Object Title, Path, Author, LastModifiedTime
```

### Search Result Processing

```powershell
# Connect to site
Connect-PnPOnline -Url \"https://contoso.sharepoint.com/sites/teamsite\" -Interactive

# Get search results
$searchResults = Submit-PnPSearchQuery -Query \"Project Plan\" -MaxResults 100

# Process primary results
$primaryResults = $searchResults.PrimarySearchResults

# Display basic information
$primaryResults | Select-Object Title, Path | Format-Table -AutoSize

# Access all properties of the results
$primaryResults | ForEach-Object { $_.Properties }

# Extract specific managed properties
$primaryResults | ForEach-Object {
    [PSCustomObject]@{
        Title = $_.Title
        Author = $_.Author
        FileType = $_.FileExtension
        ModifiedDate = $_.LastModifiedTime
        URL = $_.Path
    }
} | Format-Table -AutoSize

# Filter results
$filteredResults = $primaryResults | Where-Object { $_.Author -eq \"john.doe@contoso.com\" }
$filteredResults | Select-Object Title, Path

# Sort results
$sortedResults = $primaryResults | Sort-Object -Property LastModifiedTime -Descending
$sortedResults | Select-Object Title, LastModifiedTime, Path | Format-Table -AutoSize

# Group results
$groupedResults = $primaryResults | Group-Object -Property FileExtension
$groupedResults | Select-Object Name, Count | Format-Table -AutoSize
```

#### Export Search Results

```powershell
function Export-SearchResults {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$SearchQuery,
        [Parameter(Mandatory = $false)]
        [string]$OutputPath = \"C:\\Reports\",
        [Parameter(Mandatory = $false)]
        [int]$MaxResults = 500,
        [Parameter(Mandatory = $false)]
        [switch]$IncludeAllProperties
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Execute search
        Write-Host \"Executing search query: $SearchQuery\" -ForegroundColor Yellow
        $searchResults = Submit-PnPSearchQuery -Query $SearchQuery -MaxResults $MaxResults
        
        if ($searchResults.TotalRows -eq 0) {
            Write-Host \"No results found for the query\" -ForegroundColor Yellow
            return
        }
        
        Write-Host \"Found $($searchResults.TotalRows) results\" -ForegroundColor Green
        
        # Create directory if it doesn't exist
        if (-not (Test-Path -Path $OutputPath)) {
            New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
        }
        
        # Create timestamp for filename
        $timestamp = Get-Date -Format \"yyyyMMdd_HHmmss\"
        $sanitizedQuery = $SearchQuery -replace \"[\\\\/:*?\\\"<>|]\", \"_\" # Remove invalid filename characters
        $fileName = \"SearchResults_$($sanitizedQuery.Substring(0, [Math]::Min(50, $sanitizedQuery.Length)))_$timestamp.csv\"
        $filePath = Join-Path -Path $OutputPath -ChildPath $fileName
        
        # Process results
        $exportData = @()
        
        foreach ($result in $searchResults.PrimarySearchResults) {
            if ($IncludeAllProperties) {
                # Include all properties
                $exportData += $result
            } else {
                # Include only common properties
                $exportData += [PSCustomObject]@{
                    Title = $result.Title
                    Path = $result.Path
                    Author = $result.Author
                    ContentType = $result.ContentType
                    FileType = $result.FileExtension
                    Size = $result.Size
                    Created = $result.Created
                    LastModified = $result.LastModifiedTime
                }
            }
        }
        
        # Export to CSV
        $exportData | Export-Csv -Path $filePath -NoTypeInformation
        
        Write-Host \"Exported search results to $filePath\" -ForegroundColor Green
        return $filePath
    }
    catch {
        Write-Error \"Error exporting search results: $_\"
        return $null
    }
}

# Usage example
Export-SearchResults -SiteUrl \"https://contoso.sharepoint.com/sites/teamsite\" -SearchQuery \"ContentType:\\\"Project Document\\\"\" -IncludeAllProperties
```

## Information Management and Compliance

### Retention Policies

```powershell
# Connect to SharePoint Admin Center
Connect-PnPOnline -Url \"https://contoso-admin.sharepoint.com\" -Interactive

# Get retention policies at tenant level
# Note: This requires SharePoint Admin or Global Admin permissions
$retentionPolicies = Get-PnPTenantRecycleBinItem -IncludeChildren -Filter \"ItemType eq 'SPSite'\"
$retentionPolicies | Select-Object Title, TimeDeleted, DaysRemaining

# Working with list retention settings
# Connect to site
Connect-PnPOnline -Url \"https://contoso.sharepoint.com/sites/teamsite\" -Interactive

# Check if retention is enabled on a list
$list = Get-PnPList -Identity \"Documents\"
$list.EnableModeration

# Enable content approval (a form of retention)
$list.EnableModeration = $true
$list.Update()
Invoke-PnPQuery

# Configure expiration policy via list information policy settings
# This is more complex and often requires custom solutions or using the UI
# Basic example to set expiration as a calculated column:
$expirationFormulaXml = \"<Field Type='Calculated' DisplayName='Expiration Date' Name='ExpirationDate' ResultType='DateTime'><Formula>=Created+365</Formula><FieldRefs><FieldRef Name='Created' /></FieldRefs></Field>\"
Add-PnPFieldFromXml -List \"Documents\" -FieldXml $expirationFormulaXml
```

#### Retention Policy Reporting Script

```powershell
function Get-SiteListsRetentionReport {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $false)]
        [switch]$ExportToCsv,
        [Parameter(Mandatory = $false)]
        [string]$OutputPath = \"C:\\Reports\"
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Get all lists and libraries
        $lists = Get-PnPList
        
        # Build report data
        $reportData = @()
        
        foreach ($list in $lists) {
            # Skip hidden system lists
            if ($list.Hidden -and $list.Title -like \"*_*\") {
                continue
            }
            
            try {
                # Get additional list properties
                $enableVersioning = $list.EnableVersioning
                $majorVersionLimit = $list.MajorVersionLimit
                $enableMinorVersions = $list.EnableMinorVersions
                $minorVersionLimit = $list.MinorVersionLimit
                $enableModeration = $list.EnableModeration
                
                # Create report entry
                $reportEntry = [PSCustomObject]@{
                    ListTitle = $list.Title
                    ListUrl = \"$SiteUrl/$($list.DefaultViewUrl.Split('?')[0])\"
                    ItemCount = $list.ItemCount
                    VersioningEnabled = $enableVersioning
                    MajorVersionLimit = if ($majorVersionLimit -eq 0) { \"Unlimited\" } else { $majorVersionLimit }
                    MinorVersioningEnabled = $enableMinorVersions
                    MinorVersionLimit = if ($minorVersionLimit -eq 0) { \"Unlimited\" } else { $minorVersionLimit }
                    ContentApprovalEnabled = $enableModeration
                    LastModified = $list.LastItemModifiedDate
                }
                
                $reportData += $reportEntry
            }
            catch {
                Write-Warning \"Error processing list '$($list.Title)': $_\"
            }
        }
        
        # Output report
        $reportData | Format-Table -AutoSize
        
        # Export to CSV if requested
        if ($ExportToCsv -and $reportData.Count -gt 0) {
            # Create directory if it doesn't exist
            if (-not (Test-Path -Path $OutputPath)) {
                New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null
            }
            
            $timestamp = Get-Date -Format \"yyyyMMdd_HHmmss\"
            $siteName = $SiteUrl.TrimEnd('/').Split('/')[-1]
            $csvPath = Join-Path -Path $OutputPath -ChildPath \"$siteName`_RetentionReport_$timestamp.csv\"
            
            $reportData | Export-Csv -Path $csvPath -NoTypeInformation
            Write-Host \"Exported retention report to $csvPath\" -ForegroundColor Green
        }
        
        return $reportData
    }
    catch {
        Write-Error \"Error generating retention report: $_\"
        return $null
    }
}

# Usage example
Get-SiteListsRetentionReport -SiteUrl \"https://contoso.sharepoint.com/sites/project\" -ExportToCsv
```

### DLP Policies

```powershell
# Connect to SharePoint Online Management Shell - requires Global Admin or Security Admin rights
Connect-SPOService -Url \"https://contoso-admin.sharepoint.com\"

# Get information about DLP policies
# Note: Full DLP policy management is typically done via the Security & Compliance Center PowerShell
# This example focuses on what can be done via SharePoint Online PowerShell

# Get sites that may be excluded from DLP policies
$sites = Get-SPOSite -Limit All
$sites | Where-Object { $_.DenyAddAndCustomizePages -eq \"Disabled\" } | Select-Object Url, Title

# Enable tenant capabilities to ensure DLP policies apply correctly
Set-SPOTenant -EnableAIPIntegration $true

# View important tenant-level settings related to DLP
Get-SPOTenant | Select-Object AllowDownloadingNonWebViewableFiles, DisableReportProblemDialog, `
    EnableAIPIntegration, ExternalServicesEnabled, OwnerAnonymousNotification, `
    ShowPeoplePickerSuggestionsForGuestUsers, UseFindPeopleInPeoplePicker | Format-List
```

#### SharePoint Security Baseline Configuration

```powershell
function Set-SharePointSecurityBaseline {
    param (
        [Parameter(Mandatory = $true)]
        [string]$AdminSiteUrl,
        [Parameter(Mandatory = $false)]
        [switch]$WhatIf
    )
    
    try {
        # Connect to SharePoint Admin Center
        Connect-SPOService -Url $AdminSiteUrl
        
        Write-Host \"Configuring SharePoint Online security baseline settings...\" -ForegroundColor Yellow
        
        if ($WhatIf) {
            # WhatIf mode - just show what would be changed
            Write-Host \"WhatIf: Would configure the following security settings:\" -ForegroundColor Cyan
            Write-Host \"  - Disable legacy authentication protocols\" -ForegroundColor Cyan
            Write-Host \"  - Restrict sharing to authenticated users only\" -ForegroundColor Cyan
            Write-Host \"  - Prevent downloading of non-viewable files\" -ForegroundColor Cyan
            Write-Host \"  - Enable AIP integration\" -ForegroundColor Cyan
            Write-Host \"  - Disable custom script execution on personal sites\" -ForegroundColor Cyan
            Write-Host \"  - Set conditional access policy\" -ForegroundColor Cyan
            return
        }
        
        # Configure security settings
        Set-SPOTenant -LegacyAuthProtocolsEnabled $false
        Write-Host \"Disabled legacy authentication protocols\" -ForegroundColor Green
        
        Set-SPOTenant -SharingCapability ExternalUserSharingOnly
        Write-Host \"Restricted sharing to authenticated users only\" -ForegroundColor Green
        
        Set-SPOTenant -AllowDownloadingNonWebViewableFiles $false
        Write-Host \"Prevented downloading of non-viewable files\" -ForegroundColor Green
        
        Set-SPOTenant -EnableAIPIntegration $true
        Write-Host \"Enabled AIP integration\" -ForegroundColor Green
        
        Set-SPOSite -Identity \"https://contoso-my.sharepoint.com/\" -DenyAddAndCustomizePages 1
        Write-Host \"Disabled custom script execution on personal sites\" -ForegroundColor Green
        
        # Note: Conditional access policies are typically configured via Azure AD PowerShell
        # This is just a placeholder to indicate that it should be part of your security baseline
        Write-Host \"⚠️ Remember to configure Conditional Access Policies via Azure AD PowerShell\" -ForegroundColor Yellow
        
        Write-Host \"SharePoint Online security baseline configured successfully\" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error \"Error configuring security baseline: $_\"
        return $false
    }
}

# Usage example
Set-SharePointSecurityBaseline -AdminSiteUrl \"https://contoso-admin.sharepoint.com\" -WhatIf
```

### Site Policies

```powershell
# Connect to site
Connect-PnPOnline -Url \"https://contoso.sharepoint.com/sites/teamsite\" -Interactive

# Get current site policies
$site = Get-PnPSite
$web = Get-PnPWeb

# Check site sharing capabilities
$site = Get-PnPSite -Includes SharingCapability
$site.SharingCapability

# Check external sharing settings for the site
$web = Get-PnPWeb -Includes SharingAllowedDomainList, SharingBlockedDomainList, SharingDomainRestrictionMode
$web | Select-Object Title, SharingDomainRestrictionMode, SharingAllowedDomainList, SharingBlockedDomainList

# Set allowed domains for external sharing
Set-PnPWeb -SharingAllowedDomainList \"partner.com,vendor.com\" -SharingDomainRestrictionMode \"AllowList\"

# Set blocked domains for external sharing
Set-PnPWeb -SharingBlockedDomainList \"competitor.com\" -SharingDomainRestrictionMode \"BlockList\"

# Check site expiration settings (requires tenant admin)
Connect-PnPOnline -Url \"https://contoso-admin.sharepoint.com\" -Interactive
$sites = Get-PnPTenantSite -Detailed
$sites | Select-Object Url, Title, TimeZoneId, Owner, SharingCapability, LocaleId, LockState, Status

# Set site to read-only (e.g., for archived projects)
Set-PnPTenantSite -Url \"https://contoso.sharepoint.com/sites/completedproject\" -LockState ReadOnly
```

### Information Rights Management

```powershell
# Connect to SharePoint Admin Center
Connect-SPOService -Url \"https://contoso-admin.sharepoint.com\"

# Check if IRM is enabled at the tenant level
$tenantSettings = Get-SPOTenant
$tenantSettings | Select-Object IRMEnabled, IRMPrefix, IRMRejectedReason

# Enable IRM at the tenant level
Set-SPOTenant -IrmEnabled $true

# Connect to site to work with list-level IRM
Connect-PnPOnline -Url \"https://contoso.sharepoint.com/sites/teamsite\" -Interactive

# Enable IRM on a document library
$list = Get-PnPList -Identity \"Confidential Documents\"
$list.IrmEnabled = $true
$list.IrmExpire = $true
$list.IrmReject = $true

# Set IRM policy timeout (days)
$list.IrmExpirationDays = 90

# Update the list with new IRM settings
$list.Update()
Invoke-PnPQuery
```

#### Managing Information Rights Policies

```powershell
function Set-DocumentLibraryIRM {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$LibraryName,
        [Parameter(Mandatory = $true)]
        [bool]$EnableIRM,
        [Parameter(Mandatory = $false)]
        [int]$ExpirationDays,
        [Parameter(Mandatory = $false)]
        [bool]$AllowPrint = $true,
        [Parameter(Mandatory = $false)]
        [bool]$AllowScript = $false,
        [Parameter(Mandatory = $false)]
        [bool]$DocumentAccessExpires = $true,
        [Parameter(Mandatory = $false)]
        [bool]$RejectDocumentsWithoutIRM = $true,
        [Parameter(Mandatory = $false)]
        [switch]$WhatIf
    )
    
    try {
        # Connect to site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Get the document library
        $library = Get-PnPList -Identity $LibraryName
        
        if ($null -eq $library) {
            throw \"Library '$LibraryName' not found\"
        }
        
        # Check if it's a document library
        if ($library.BaseTemplate -ne 101) {
            throw \"'$LibraryName' is not a document library\"
        }
        
        if ($WhatIf) {
            Write-Host \"WhatIf: Would configure the following IRM settings for '$LibraryName':\" -ForegroundColor Cyan
            Write-Host \"  - Enable IRM: $EnableIRM\" -ForegroundColor Cyan
            
            if ($EnableIRM) {
                Write-Host \"  - Document access expires: $DocumentAccessExpires\" -ForegroundColor Cyan
                if ($DocumentAccessExpires -and $ExpirationDays -gt 0) {
                    Write-Host \"  - Expiration days: $ExpirationDays\" -ForegroundColor Cyan
                }
                Write-Host \"  - Allow print: $AllowPrint\" -ForegroundColor Cyan
                Write-Host \"  - Allow script: $AllowScript\" -ForegroundColor Cyan
                Write-Host \"  - Reject documents without IRM: $RejectDocumentsWithoutIRM\" -ForegroundColor Cyan
            }
            return
        }
        
        # Configure IRM settings
        $library.IrmEnabled = $EnableIRM
        
        if ($EnableIRM) {
            $library.IrmExpire = $DocumentAccessExpires
            
            if ($DocumentAccessExpires -and $ExpirationDays -gt 0) {
                $library.IrmExpirationDays = $ExpirationDays
            }
            
            $library.IrmAllowPrint = $AllowPrint
            $library.IrmAllowScript = $AllowScript
            $library.IrmReject = $RejectDocumentsWithoutIRM
        }
        
        # Update the library
        $library.Update()
        Invoke-PnPQuery
        
        if ($EnableIRM) {
            Write-Host \"Enabled IRM on '$LibraryName' with specified settings\" -ForegroundColor Green
        } else {
            Write-Host \"Disabled IRM on '$LibraryName'\" -ForegroundColor Green
        }
        
        return $true
    }
    catch {
        Write-Error \"Error configuring IRM: $_\"
        return $false
    }
}

# Usage example
Set-DocumentLibraryIRM \\
    -SiteUrl \"https://contoso.sharepoint.com/sites/hr\" \\
    -LibraryName \"Employee Documents\" \\
    -EnableIRM $true \\
    -ExpirationDays 180 \\
    -AllowPrint $false \\
    -AllowScript $false \\
    -DocumentAccessExpires $true \\
    -RejectDocumentsWithoutIRM $true
```

## Performance Optimization

### Batching Operations

```powershell
# Connect to site
Connect-PnPOnline -Url \"https://contoso.sharepoint.com/sites/teamsite\" -Interactive

# Example of batch processing list items
$list = Get-PnPList -Identity \"Tasks\"
$items = Get-PnPListItem -List $list -PageSize 500

# Start a new batch
$batch = New-PnPBatch

# Process items in batches
$count = 0
$batchSize = 50
$totalItems = $items.Count

Write-Host \"Processing $totalItems items in batches of $batchSize...\"

foreach ($item in $items) {
    # Update each item (example: set a field value)
    $item[\"Status\"] = \"In Progress\"
    $item.Update()
    
    # Add to current batch
    Add-PnPListItemToBatch -Batch $batch -ListItem $item
    $count++
    
    # Execute batch when it reaches batch size or we're at the end
    if ($count % $batchSize -eq 0 -or $count -eq $totalItems) {
        Write-Host \"Executing batch for items $($count-($count % $batchSize)+1)-$count of $totalItems\"
        Invoke-PnPBatch -Batch $batch
        
        # Start new batch if not at the end
        if ($count -lt $totalItems) {
            $batch = New-PnPBatch
        }
    }
}

Write-Host \"Batch operations complete\" -ForegroundColor Green
```

#### Batched Document Upload Function

```powershell
function Add-DocumentsBatched {
    param (
        [Parameter(Mandatory = $true)]
        [string]$SiteUrl,
        [Parameter(Mandatory = $true)]
        [string]$LibraryName,
        [Parameter(Mandatory = $true)]
        [string]$SourceFolderPath,
        [Parameter(Mandatory = $false)]
        [string]$TargetFolderPath = \"\",
        [Parameter(Mandatory = $false)]
        [int]$BatchSize = 10,
        [Parameter(Mandatory = $false)]
        [switch]$PreserveFileStructure
    )
    
    try {
        # Verify source folder exists
        if (-not (Test-Path -Path $SourceFolderPath)) {
            throw \"Source folder not found: $SourceFolderPath\"
        }
        
        # Connect to the site
        Connect-PnPOnline -Url $SiteUrl -Interactive
        
        # Get document library
        $library = Get-PnPList -Identity $LibraryName -ErrorAction Stop
        
        # Construct the target folder URL
        $targetFolderUrl = $library.RootFolder.ServerRelativeUrl
        if (-not [string]::IsNullOrEmpty($TargetFolderPath)) {
            $targetFolderUrl = \"$targetFolderUrl/$TargetFolderPath\"
            
            # Ensure target folder exists
            Resolve-PnPFolder -SiteRelativePath $targetFolderUrl
        }
        
        # Get all files from the source folder
        $files = Get-ChildItem -Path $SourceFolderPath -File -Recurse
        $totalFiles = $files.Count
        $processedCount = 0
        
        Write-Host \"Found $totalFiles files to upload in batches of $BatchSize\" -ForegroundColor Yellow
        
        # Process files in batches
        for ($i = 0; $i -lt $totalFiles; $i += $BatchSize) {
            $currentBatch = $files[$i..([Math]::Min($i + $BatchSize - 1, $totalFiles - 1))]
            $batchCount = $currentBatch.Count
            
            Write-Host \"Processing batch $([Math]::Floor($i / $BatchSize) + 1`
    }
  ]
}