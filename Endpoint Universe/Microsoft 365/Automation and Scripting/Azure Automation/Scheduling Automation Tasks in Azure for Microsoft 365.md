# Scheduling Automation Tasks in Azure for Microsoft 365

## Introduction

Azure Automation provides a powerful and scalable platform for automating administrative tasks across Azure and hybrid environments. This capability is particularly useful for managing Microsoft 365 services, allowing administrators to schedule repetitive tasks, enforce configurations, generate reports, and respond to events without manual intervention. This document outlines the process of setting up and scheduling automation tasks for Microsoft 365 using Azure Automation runbooks.

## Prerequisites

Before you begin, ensure you have the following:

1.  **Azure Subscription:** Access to an active Azure subscription.
2.  **Azure Automation Account:** An Automation account created within your Azure subscription.
3.  **Microsoft 365 Tenant:** Access to the Microsoft 365 tenant you wish to manage.
4.  **Permissions:**
    * Sufficient permissions in Azure to create and manage Automation resources (Schedules, Runbooks, Modules, Managed Identities).
    * Appropriate administrative roles or permissions within Microsoft 365 (e.g., Global Administrator, Exchange Administrator, SharePoint Administrator, Teams Administrator, or custom roles with specific permissions) for the tasks you intend to automate. These permissions will be granted to the Automation account's Managed Identity.

## Setting up Azure Automation for Microsoft 365

### 1. Create an Azure Automation Account

If you don't already have one, create an Azure Automation account in your preferred Azure region via the Azure portal.

### 2. Enable Managed Identity

Managed Identities provide a secure way for Azure resources to authenticate to cloud services without needing credentials stored in code. This is the recommended authentication method.

* Navigate to your Automation Account in the Azure portal.
* Under **Account Settings**, select **Identity**.
* Turn the **System assigned** status to **On** and Save. Note the **Object (principal) ID**.
* Alternatively, you can create and assign a **User assigned** identity.

### 3. Grant Permissions in Microsoft 365 / Azure AD (Entra ID)

The Managed Identity (represented by its Object ID) needs permissions to manage Microsoft 365 resources. The primary way to grant these permissions is via the Microsoft Graph API or specific service admin roles.

* **Microsoft Graph Permissions:**
    * Navigate to **Azure Active Directory (Entra ID)** in the Azure portal.
    * Go to **App registrations** > **All applications**.
    * Search for the Managed Identity using its name (usually the same as the Automation Account) or its Object ID. *Note: System-assigned identities might not appear here directly; granting permissions often involves PowerShell or assigning Azure AD roles.*
    * Alternatively, use PowerShell (`Connect-MgGraph`, `New-MgServicePrincipal`, `New-MgServicePrincipalAppRoleAssignment`) to assign specific **Application** permissions from Microsoft Graph to the Managed Identity's service principal. Common permissions might include `User.ReadWrite.All`, `Group.ReadWrite.All`, `Sites.ReadWrite.All`, `Mail.ReadWrite`, etc., depending on your automation needs. **Always grant the least privilege necessary.**
* **Azure AD Roles:** For broader access, you can assign built-in Azure AD roles (like `User Administrator`, `Groups Administrator`, `SharePoint Administrator`) to the Managed Identity. Navigate to **Azure Active Directory (Entra ID)** > **Roles and administrators**, select the desired role, and add the Managed Identity as a member.

### 4. Import Necessary PowerShell Modules

Runbooks often require specific PowerShell modules to interact with Microsoft 365 services. Import them into your Automation Account:

* Navigate to your Automation Account.
* Under **Shared Resources**, select **Modules** > **Add a module**.
* Browse the gallery and import required modules. Key modules include:
    * **Microsoft.Graph:** For interacting with the Microsoft Graph API (recommended for most modern M365 automation).
    * **ExchangeOnlineManagement:** For managing Exchange Online (v3 module supports Managed Identity).
    * **Microsoft.Online.SharePoint.PowerShell:** For managing SharePoint Online (may require different auth methods).
    * **MicrosoftTeams:** For managing Microsoft Teams.
    * **AzureAD:** (Legacy - prefer Microsoft.Graph) For managing Azure AD.
* Ensure you select a runtime version compatible with your runbook (e.g., PowerShell 7.1 or 7.2).

## Creating Automation Runbooks

Runbooks contain the script logic that performs the automated tasks.

### 1. Create a Runbook

* In your Automation Account, go to **Process Automation** > **Runbooks** > **Create a runbook**.
* Provide a name (e.g., `Get-M365InactiveUsers`).
* Select the **Runbook type** (e.g., PowerShell).
* Select a compatible **Runtime version**.
* Click **Create**.

### 2. Write the Runbook Script (Example: PowerShell using Managed Identity)

```powershell
<#
.SYNOPSIS
Connects to Microsoft Graph using the Azure Automation system-assigned managed identity
and retrieves a list of users who haven't signed in recently.

.DESCRIPTION
This runbook authenticates to Microsoft Graph via the managed identity,
queries for users based on their last sign-in date, and outputs their UPNs.
Ensure the Managed Identity has the 'AuditLog.Read.All' and 'User.Read.All'
Graph API permissions granted.

.NOTES
Requires the Microsoft.Graph.Authentication and Microsoft.Graph.Users modules
in the Automation Account.
#>

param (
    [int]$InactiveDays = 90 # Number of days to consider inactive
)

try {
    # Ensures you Automation script has the latest Az module
    # Disable-AzContextAutosave -Scope Process | Out-Null

    # Connect to Microsoft Graph using the System Assigned Managed Identity
    Write-Output "Connecting to Microsoft Graph..."
    Connect-MgGraph -Identity
    Write-Output "Successfully connected to Microsoft Graph."

    # Calculate the date threshold
    $inactiveThresholdDate = (Get-Date).AddDays(-$InactiveDays).ToString('yyyy-MM-ddTHH:mm:ssZ')
    Write-Output "Checking for users inactive since: $inactiveThresholdDate"

    # Query for users whose last sign-in is older than the threshold date
    # Note: This requires Azure AD Premium P1 or P2 license for sign-in activity data
    # The filter requires consistency level = eventual for advanced queries
    # Requires AuditLog.Read.All and User.Read.All permissions
    $inactiveUsers = Get-MgUser -Filter "signInActivity/lastSignInDateTime le $inactiveThresholdDate" -ConsistencyLevel eventual -CountVariable userCount -All:$true -Property 'id,userPrincipalName,displayName,signInActivity'

    if ($userCount -gt 0) {
        Write-Output "Found $userCount inactive users:"
        foreach ($user in $inactiveUsers) {
            Write-Output "- $($user.UserPrincipalName) (Last SignIn: $($user.SignInActivity.LastSignInDateTime))"
            # Add actions here: e.g., disable account, remove licenses, notify manager
        }
    } else {
        Write-Output "No users found inactive for more than $InactiveDays days."
    }

} catch {
    Write-Error "An error occurred: $($_.Exception.Message)"
    throw # Re-throw the error to ensure the job status reflects failure
} finally {
    # Disconnect if necessary, though managed identity connections are often token-based
    # Disconnect-MgGraph (Include if required by specific session logic)
    Write-Output "Script finished."
}
```
### 3. Test the Runbook
Use the Test pane within the runbook editor to run the script and verify its functionality before publishing.

### 4. Publish the Runbook
Once tested, click Publish.

## Scheduling the Runbook

### 1. Create a Schedule
* In your Automation Account, go to Shared Resources > Schedules > Add a schedule.

* Give the schedule a Name (e.g., Daily-M365-InactiveUserCheck).

* Set the Start time, Time zone, and Recurrence (e.g., Recurring, Every 1 Day).

* Set an Expiration if needed.

### 2. Link the Schedule to the Runbook
Navigate back to your published Runbook.
Select the Schedules tab > Add a schedule.
Choose Link a schedule to your runbook.

Select the schedule you created (e.g., Daily-M365-InactiveUserCheck).
***Configure parameters and run settings***: If your runbook has parameters (like $InactiveDays in the example), you can set their values here for the scheduled run.

Click OK.

## Common Microsoft 365 Automation Use Cases

* ***User & Group Management***: Automate onboarding/offboarding, license assignment/removal based on group membership, password resets, group membership updates.

* ***Reporting***: Generate reports on license usage, mailbox sizes, SharePoint storage, Teams activity, inactive users/guests.

* ***Security & Compliance***: Enforce MFA settings, audit permission changes, configure retention policies, manage external sharing settings.

* ***Resource Management***: Clean up inactive Teams, archive old SharePoint sites, manage mailbox quotas.

* ***Notifications***: Alert administrators about critical changes or upcoming license expirations.

## Monitoring and Logging

* ***Job History***: Track the status (Completed, Failed, Suspended, Stopped) of each runbook execution under the runbook's Jobs tab.

* ***Output Streams***: View detailed logs, warnings, errors, and verbose output from script executions within each job's details.

* ***Azure Monitor Integration***: Configure diagnostic settings on your Automation Account to send job logs and metrics to Azure Monitor Logs (Log Analytics workspace) for advanced querying, alerting, and dashboarding.

---

## Best Practices
* ***Use Managed Identities***: Prioritize System-Assigned or User-Assigned Managed Identities for authentication. Avoid storing credentials directly in scripts.
* ***Least Privilege***: Grant only the necessary permissions to the Managed Identity. Regularly review assigned roles and permissions.
Error Handling: Implement robust try/catch blocks in your runbooks to handle errors gracefully and provide meaningful logs.

* ***Modularity***: Break down complex tasks into smaller, reusable runbooks.

* ***Source Control***: Integrate your runbook development with source control systems like Azure Repos or GitHub for versioning and collaboration.

* ***Testing***: Thoroughly test runbooks in a non-production environment before deploying and scheduling them against your production Microsoft 365 tenant.

* ***Parameterization***: Use runbook parameters for flexibility (e.g., target groups, thresholds, email recipients).

---

### Conclusion
Azure Automation offers a robust framework for scheduling administrative tasks within Microsoft 365. By leveraging runbooks, managed identities, and schedules, administrators can significantly reduce manual effort, improve consistency, enhance security, and ensure timely execution of critical M365 management operations.
