# Cloud-Based Printer Driver Deployment with Microsoft Intune

**Version:** 1.0
**Last Updated:** April 9, 2025
**Author/Maintainer:** [Your Name/Team]

**Purpose:** This document provides a comprehensive guide for deploying and managing printer drivers and printer connections using cloud-based solutions, primarily focusing on Microsoft Intune (formerly part of Microsoft Endpoint Manager). It covers different strategies, best practices, configuration steps, automation possibilities, and troubleshooting techniques.

**Target Audience:** IT Administrators, Endpoint Management Specialists, System Engineers responsible for managing Windows endpoints and print infrastructure within a Microsoft cloud environment (Azure AD, Intune).

---

## Table of Contents

1.  [Overview](#overview)
    * [Why Cloud-Based Deployment?](#why-cloud-based-deployment)
    * [Core Concepts](#core-concepts)
2.  [Prerequisites](#prerequisites)
3.  [Key Components & Technologies](#key-components--technologies)
    * [Microsoft Intune](#microsoft-intune)
    * [Azure Active Directory (Azure AD)](#azure-active-directory-azure-ad)
    * [Universal Print](#universal-print)
    * [Win32 Content Prep Tool](#win32-content-prep-tool)
    * [PowerShell](#powershell)
4.  [Deployment Strategies](#deployment-strategies)
    * [Strategy 1: Universal Print (Recommended)](#strategy-1-universal-print-recommended)
        * [Overview](#overview-universal-print)
        * [Setup Steps](#setup-steps-universal-print)
        * [Deployment via Intune](#deployment-via-intune-universal-print)
    * [Strategy 2: Packaging Drivers as Win32 Apps](#strategy-2-packaging-drivers-as-win32-apps)
        * [Overview](#overview-win32-apps)
        * [Packaging Process](#packaging-process-win32-apps)
        * [Deployment via Intune](#deployment-via-intune-win32-apps)
    * [Strategy 3: Using PowerShell Scripts](#strategy-3-using-powershell-scripts)
        * [Overview](#overview-powershell-scripts)
        * [Scripting Considerations](#scripting-considerations)
        * [Deployment via Intune](#deployment-via-intune-powershell-scripts)
5.  [Configuration in Intune/Endpoint Manager](#configuration-in-intuneendpoint-manager)
    * [Creating Deployment Profiles/Policies](#creating-deployment-profilespolicies)
    * [Targeting and Assignments (Groups, Filters)](#targeting-and-assignments-groups-filters)
    * [Detection Rules (Win32 Apps)](#detection-rules-win32-apps)
    * [Execution Context (Scripts)](#execution-context-scripts)
6.  [Automation Opportunities](#automation-opportunities)
    * [Scripting Driver Installation & Printer Mapping](#scripting-driver-installation--printer-mapping)
    * [Dynamic Group Membership](#dynamic-group-membership)
7.  [User Experience](#user-experience)
    * [Automatic Printer Installation](#automatic-printer-installation)
    * [Self-Service Printer Addition](#self-service-printer-addition)
8.  [Security Considerations](#security-considerations)
    * [Driver Signing](#driver-signing)
    * [Permissions and Access Control](#permissions-and-access-control)
    * [Network Considerations](#network-considerations)
9.  [Monitoring and Reporting](#monitoring-and-reporting)
    * [Intune Deployment Status](#intune-deployment-status)
    * [Client-Side Logs](#client-side-logs)
    * [Universal Print Portal](#universal-print-portal)
10. [Troubleshooting Common Deployment Issues](#troubleshooting-common-deployment-issues)
    * [Installation Failures (Error Codes)](#installation-failures-error-codes)
    * [Printers Not Appearing for Users](#printers-not-appearing-for-users)
    * [Detection Rule Failures (Win32 Apps)](#detection-rule-failures-win32-apps)
    * [Script Execution Errors](#script-execution-errors)
    * [Universal Print Connector Issues](#universal-print-connector-issues)
11. [Driver Updates and Maintenance](#driver-updates-and-maintenance)
    * [Updating Drivers (Supersedence)](#updating-drivers-supersedence)
    * [Removing Outdated Drivers/Printers](#removing-outdated-driversprinters)
12. [Conclusion](#conclusion)

---

## 1. Overview

Cloud-based driver and printer deployment shifts the management paradigm away from traditional on-premises print servers towards centralized, policy-driven distribution using cloud services like Microsoft Intune. This approach streamlines administration, enhances security, and improves scalability for modern workplaces.

### Why Cloud-Based Deployment?

* **Reduced Infrastructure:** Eliminates the need for dedicated on-premises print servers.
* **Centralized Management:** Single console (Intune) for managing deployments across the entire device fleet.
* **Scalability:** Easily scales with organizational growth or contraction.
* **Enhanced Security:** Leverages Azure AD identity and Intune's compliance/conditional access policies.
* **Anywhere Access:** Supports deployment to devices regardless of their physical location (on-prem or remote), provided they have internet connectivity and are managed by Intune.
* **Simplified User Experience:** Printers can be automatically provisioned or made available for easy self-service installation.

### Core Concepts

* **Driver Deployment:** Installing the necessary printer driver software onto the endpoint device.
* **Printer Provisioning/Mapping:** Creating the actual printer connection/queue on the endpoint that users interact with.
* **Endpoint Management:** Utilizing Intune to target devices/users and enforce configurations.
* **Zero Trust:** Aligning with Zero Trust principles by managing print access through verified identities and device compliance.

---

## 2. Prerequisites

Before implementing cloud-based printer deployment, ensure the following are in place:

* **Azure AD Tenant:** A functioning Azure Active Directory tenant.
* **Intune Subscription:** Appropriate Microsoft Intune or EMS licenses assigned to users/devices.
* **Azure AD Joined or Hybrid Azure AD Joined Devices:** Target Windows devices must be enrolled in Intune and joined to Azure AD.
* **Network Connectivity:** Devices need internet access to communicate with Intune and potentially Universal Print services. Direct line-of-sight to printers may be required for non-Universal Print scenarios unless using specific network print protocols configured for cloud access (less common).
* **Administrative Permissions:** Sufficient permissions in Azure AD and Intune (e.g., Intune Administrator, Application Administrator roles).
* **Printer Drivers:** Access to the required printer drivers (preferably V4 or Universal Print compatible). Ensure they are signed and compatible with target Windows versions.
* **(Optional) Universal Print Licenses:** If using Universal Print, assign licenses to relevant users.

---

## 3. Key Components & Technologies

### Microsoft Intune

The core Mobile Device Management (MDM) and Mobile Application Management (MAM) service. Used for:
* Deploying applications (including packaged drivers).
* Deploying PowerShell scripts.
* Deploying configuration profiles (including Universal Print settings).
* Targeting deployments to specific user or device groups.
* Monitoring deployment status and compliance.

### Azure Active Directory (Azure AD)

Provides identity management. Crucial for:
* User and Device identity.
* Group creation (for targeting deployments).
* Conditional Access policies (enhancing security).
* Authentication for Universal Print.

### Universal Print

Microsoft's modern, cloud-based print solution that eliminates the need for on-premises print servers and manages printers directly from Azure.
* **Driverless Printing (Client-Side):** Windows endpoints use a built-in Universal Print driver, eliminating the need to deploy manufacturer-specific drivers to clients.
* **Cloud Management:** Printers are registered and shared via the Azure portal.
* **Requires:** Universal Print Connector (for non-native printers) or Universal Print-ready printers.

### Win32 Content Prep Tool (`IntuneWinAppUtil.exe`)

A command-line utility provided by Microsoft to convert application installation files (like driver setup EXEs/MSIs and supporting files) into the `.intunewin` format for deployment via Intune as a Win32 application.

### PowerShell

A powerful scripting language for automating tasks on Windows. Can be used via Intune to:
* Stage/install printer drivers (`pnputil.exe`, vendor utilities).
* Create printer ports (`Add-PrinterPort`).
* Install printer drivers (`Add-PrinterDriver`).
* Create printer connections (`Add-Printer`).
* Perform complex logic or customized installation steps.

---

## 4. Deployment Strategies

Choose the strategy that best fits your environment, printer hardware, and management goals.

### Strategy 1: Universal Print (Recommended)

This is Microsoft's strategic direction for print management in the cloud. It significantly simplifies client-side driver management.

#### Overview (Universal Print)

* **Pros:** No client-side driver deployment needed (uses built-in UP driver), fully cloud-managed, integrates with Azure AD for security, good user experience for discovery.
* **Cons:** Requires Universal Print licenses, requires either UP-ready printers or the UP Connector software installed on an on-premises machine with access to the printers.

#### Setup Steps (Universal Print)

1.  **License Users:** Assign Universal Print licenses in the Microsoft 365 admin center.
2.  **Deploy Connector (If Needed):** Install the Universal Print Connector software on a Windows machine (Server or Client OS) that has network access to your existing, non-UP-native printers.
3.  **Register Printers:** Use the Connector application to register your printers with the Universal Print service in Azure. UP-native printers can often be registered directly.
4.  **Share Printers:** In the Azure portal (Universal Print section), configure printer shares and assign permissions to Azure AD users or groups.
5.  **Configure Location (Optional but Recommended):** Add location properties (Building, Floor, etc.) to printers to aid user discovery.

#### Deployment via Intune (Universal Print)

1.  **Navigate:** In the Intune admin center, go to `Devices` > `Configuration profiles` > `Create profile`.
2.  **Platform:** Select `Windows 10 and later`.
3.  **Profile Type:** Select `Settings catalog`.
4.  **Search:** Search for and select `Printer Provisioning`.
5.  **Configure:** Add the printers you want to deploy:
    * Specify the `Printer Shared ID`, `Printer Shared Name`, and `Cloud Device ID` (obtainable from the Universal Print portal or via PowerShell).
    * Choose whether to install for `User` or `Device` context (User context is common).
6.  **Assign:** Assign the profile to the desired Azure AD user or device groups.

### Strategy 2: Packaging Drivers as Win32 Apps

Use this method when Universal Print is not feasible or when specific, complex manufacturer drivers (often V3 drivers) are absolutely required on the client.

#### Overview (Win32 Apps)

* **Pros:** Highly flexible, supports complex installations (EXEs, MSIs, scripts), allows deployment of specific V3/V4 drivers if needed.
* **Cons:** Requires packaging drivers into `.intunewin` format, requires robust detection rules, managing driver updates can be more complex (supersedence).

#### Packaging Process (Win32 Apps)

1.  **Gather Files:** Collect all necessary driver files (INF, CAT, DLLs, etc.) and any setup executable or script needed for silent installation.
2.  **Create Install/Uninstall Logic:** Determine the silent install command (e.g., `setup.exe /s`, `msiexec /i driver.msi /qn`) and the uninstall command. Often, `pnputil /delete-driver oemXX.inf /uninstall /force` is needed for removal, but identifying the correct `oemXX.inf` post-install can be tricky. A wrapper script might be needed.
3.  **Use Win32 Content Prep Tool:**
    ```bash
    IntuneWinAppUtil.exe -c <source_folder> -s <setup_file> -o <output_folder>
    ```
    * `<source_folder>`: Contains all driver files and setup files/scripts.
    * `<setup_file>`: The primary setup executable or script (e.g., `setup.exe`, `install.ps1`).
    * `<output_folder>`: Where the `.intunewin` file will be created.

#### Deployment via Intune (Win32 Apps)

1.  **Navigate:** In Intune, go to `Apps` > `Windows` > `Add`.
2.  **App Type:** Select `Windows app (Win32)`.
3.  **Upload:** Upload the `.intunewin` file.
4.  **Program:**
    * **Install command:** Enter the silent install command determined earlier.
    * **Uninstall command:** Enter the silent uninstall command.
    * **Install behavior:** Usually `System` (installs with system privileges). User context might be needed in rare cases but is less common for drivers.
5.  **Requirements:** Specify OS architecture (x86/x64) and minimum OS version.
6.  **Detection Rules:** **CRITICAL STEP.** Define how Intune detects if the driver is already installed successfully. Options:
    * **File/Folder:** Check for the existence of a specific driver file (e.g., `C:\Windows\System32\DriverStore\FileRepository\driver_folder_name\driver.sys`).
    * **Registry:** Check for a specific registry key/value created by the driver installation.
    * **Script:** Use a custom PowerShell script to perform more complex detection logic (e.g., check `Get-PrinterDriver`). The script must output something to `STDOUT` for success and exit with code `0`.
7.  **Assignments:** Assign the app as `Required` (automatic install) or `Available` (user installs via Company Portal) to target groups.

### Strategy 3: Using PowerShell Scripts

Offers maximum flexibility for complex scenarios, such as mapping network printers directly (less common in pure cloud setups) or performing multi-step driver installations.

#### Overview (PowerShell Scripts)

* **Pros:** Very flexible, can handle complex logic, useful for tasks beyond simple driver staging (port creation, printer mapping).
* **Cons:** Requires scripting expertise, error handling within the script is crucial, less integrated reporting in Intune compared to Win32 Apps (reports script success/failure, not necessarily driver state).

#### Scripting Considerations

* **Error Handling:** Use `try/catch` blocks and logging.
* **Idempotency:** Design scripts to be safely run multiple times (e.g., check if the driver/printer exists before trying to add it).
* **Driver Staging:** Use `pnputil /add-driver <driver.inf> /install`.
* **Printer Port Creation:** `Add-PrinterPort -Name "IP_1.2.3.4" -PrinterHostAddress "1.2.3.4"` (Typically for direct IP printing, less ideal in cloud-first).
* **Printer Creation:** `Add-Printer -Name "PrinterName" -DriverName "Exact Driver Name" -PortName "PortName"`
* **Execution Context:** Scripts deployed via Intune run as `SYSTEM` by default. If user-specific printer mapping is needed, the script logic or deployment method needs careful consideration (e.g., running as the logged-on user, using Active Setup, or deploying to users).

#### Deployment via Intune (PowerShell Scripts)

1.  **Navigate:** In Intune, go to `Devices` > `Scripts` > `Add` > `Windows 10 and later`.
2.  **Basics:** Provide a name and description.
3.  **Script settings:**
    * **Upload:** Upload your `.ps1` script file.
    * **Run this script using the logged on credentials:** Usually `No` (run as System) for driver installation. Set to `Yes` *only* if the script specifically needs to run actions in the user's context and understands the implications.
    * **Enforce script signature check:** `Yes` if your scripts are code-signed (recommended).
    * **Run script in 64 bit PowerShell Host:** Usually `Yes`.
4.  **Assignments:** Assign the script to the required device or user groups.

---

## 5. Configuration in Intune/Endpoint Manager

### Creating Deployment Profiles/Policies

* **Universal Print:** Use `Configuration profiles` > `Settings catalog` > `Printer Provisioning`.
* **Win32 Apps:** Use `Apps` > `Windows` > `Add` > `Windows app (Win32)`.
* **PowerShell Scripts:** Use `Devices` > `Scripts`.

### Targeting and Assignments (Groups, Filters)

* **Azure AD Groups:** Create User or Device groups in Azure AD (Static or Dynamic). Assign policies/apps/scripts to these groups.
    * *Device Groups:* Best for ensuring drivers are installed on the machine regardless of who logs in (System context deployments).
    * *User Groups:* Best for printers specific to user roles or when deploying using User context (like Universal Print user-based assignment or Available Win32 apps).
* **Intune Filters:** Refine assignments based on device properties (OS version, manufacturer, model, enrollment profile name, etc.). Allows targeting specific hardware or deployment rings within larger groups. Example: Deploy a specific Dell driver only to Dell Latitude devices within the "All Staff Devices" group.

### Detection Rules (Win32 Apps)

* Essential for preventing unnecessary re-installations and for accurate reporting.
* Must reliably indicate the successful installation of the *specific driver version* being deployed.
* Registry keys or specific file versions within the Driver Store (`FileRepository`) are often the most reliable methods.

### Execution Context (Scripts)

* **System:** Default, runs with highest local privilege. Required for most driver installations. Cannot interact directly with the logged-on user's profile/registry hives easily.
* **User:** Runs as the currently logged-on user. Necessary for user-specific settings (e.g., mapping a printer only for that user). Requires the user to be logged in when the script runs. Limited privileges.

---

## 6. Automation Opportunities

### Scripting Driver Installation & Printer Mapping

* Develop robust PowerShell scripts (as described in Strategy 3) for consistent, repeatable deployments, especially for complex drivers or non-Universal Print scenarios.
* Consider using vendor-provided utilities within scripts for more reliable installation/configuration.

### Dynamic Group Membership

* Leverage Azure AD Dynamic Device Groups based on attributes like device model, OU (for Hybrid Joined), or Enrollment Profile Name to automatically target devices with the correct drivers/printers as they are enrolled.
    * Example Rule (Model): `(device.deviceModel -match "Latitude 5420")`
    * Example Rule (Enrollment Profile): `(device.enrollmentProfileName -eq "Kiosk_Profile")`

---

## 7. User Experience

### Automatic Printer Installation

* Achieved via `Required` assignments for Intune policies (Universal Print), Win32 Apps, or Scripts targeted at device groups.
* Printers appear automatically for users after the policy applies and installs successfully. This is often preferred for standard office printers.

### Self-Service Printer Addition

* **Universal Print:** Users can browse and add nearby Universal Print printers (if location is configured and permissions allow) directly through Windows Settings > Bluetooth & devices > Printers & scanners > Add device.
* **Company Portal:** Win32 Apps assigned as `Available` can be listed in the Company Portal app, allowing users to install specific drivers/printer packages on demand.

---

## 8. Security Considerations

### Driver Signing

* **Always** use drivers digitally signed by the manufacturer and verified by Microsoft (WHQL certification preferred). Unsigned drivers require disabling security settings on endpoints (highly discouraged) or complex workarounds. Intune deployments may fail with unsigned drivers.

### Permissions and Access Control

* **Universal Print:** Manage access via Azure AD user/group assignments on the printer share in the Azure portal.
* **Traditional Methods (IP-based, etc.):** Ensure appropriate network segmentation and potentially printer ACLs (though less manageable at scale). Limit administrative access to Intune and Azure.

### Network Considerations

* Ensure firewalls allow communication from endpoints to Intune (`*.manage.microsoft.com`, etc.) and Universal Print services (`*.print.microsoft.com`).
* If using the UP Connector, ensure the connector host can reach the printers (usually via TCP 9100 or manufacturer-specific ports) and the Universal Print cloud service (outbound HTTPS 443).

---

## 9. Monitoring and Reporting

### Intune Deployment Status

* **Configuration Profiles:** Monitor assignment status (Success, Error, Conflict, Pending) per device/user.
* **Win32 Apps:** Detailed reporting including installation success/failure per device, linked to detection rule evaluation. Check `Device install status` and `User install status` under the App deployment.
* **Scripts:** Monitor run status (Success, Failed) per device/user. Note: Script 'Success' only means the script ran without throwing a terminating error; it doesn't guarantee the printer works.

### Client-Side Logs

* **Intune Management Extension (IME) Log:** Crucial for troubleshooting Win32 app and PowerShell script deployments. Located at `C:\ProgramData\Microsoft\IntuneManagementExtension\Logs\IntuneManagementExtension.log`. Also check `AgentExecutor.log` and other logs in that directory.
* **Windows Event Viewer:**
    * `Applications and Services Logs > Microsoft > Windows > PrintService > Admin` (For print spooler, driver install events)
    * `Applications and Services Logs > Microsoft > Windows > DeviceManagement-Enterprise-Diagnostics-Provider > Admin` (General MDM/Intune events)
    * `Windows Logs > Application` (Check for MSI installer errors, etc.)

### Universal Print Portal

* Monitor printer status, connector health, and print job history directly within the Universal Print section of the Azure portal.

---

## 10. Troubleshooting Common Deployment Issues

### Installation Failures (Error Codes)

* **Check IME Logs:** Provides detailed error messages from Win32 app installs or script executions.
* **Event Viewer (PrintService):** Look for specific driver installation errors (e.g., signature issues, compatibility problems, access denied).
* **Win32 App Error Codes:** Correlate error codes seen in Intune with standard Windows Installer codes (MSI) or application-specific codes. Common examples: `1603` (Fatal error), `1618` (Another installation in progress).
* **Permissions:** Ensure deployment is running in the correct context (System vs. User) and has rights to modify system locations (System32, Registry).

### Printers Not Appearing for Users

* **Policy Sync:** Ensure the device has synced with Intune recently. Force sync via Company Portal or Windows Settings.
* **Targeting:** Double-check group memberships and filter evaluations for the specific user/device.
* **Dependencies:** Did the driver install correctly *before* the printer mapping script/policy ran? Check Intune app/script dependencies if configured.
* **Universal Print:** Verify user permissions on the printer share in Azure. Check connector status. Ensure the user has a UP license.
* **Detection Rules:** Incorrect detection rules might report success even if the installation failed partially.

### Detection Rule Failures (Win32 Apps)

* **Verify Logic:** Manually check the file path, registry key, or run the detection script on a test machine where the app *is* installed to confirm it works as expected. Check script exit codes and STDOUT.
* **Timing:** Ensure the detection rule checks for something that exists *only after* a successful installation is fully complete.

### Script Execution Errors

* **Check IME Logs:** `IntuneManagementExtension.log` and `AgentExecutor.log` are key.
* **Run Script Manually:** Test the script locally on a target machine using `psexec -i -s powershell.exe` (to simulate System context) or as a standard user to replicate Intune's execution environment.
* **PowerShell Transcript Logging:** Add `Start-Transcript` and `Stop-Transcript` to your script for detailed logging during Intune execution. Ensure the SYSTEM account has permissions to write the log file.

### Universal Print Connector Issues

* **Service Status:** Ensure the `Print Connector service` is running on the connector host machine.
* **Network Connectivity:** Verify the host can reach Azure (`*.print.microsoft.com`) and the local printers.
* **Connector Registration:** Check the connector status in the Azure portal (Universal Print > Connectors). Re-register if necessary.
* **Permissions:** Ensure the account running the connector service has appropriate permissions if interacting with domain resources (less common, usually local system).

---

## 11. Driver Updates and Maintenance

### Updating Drivers (Supersedence)

* **Universal Print:** Generally handled by Microsoft or printer manufacturers updating compatibility; less direct admin action needed unless replacing a connector or re-registering printers.
* **Win32 Apps:**
    1.  Package the *new* driver version as a separate Win32 App.
    2.  In Intune, edit the *new* app's configuration. Go to the `Supersedence` tab.
    3.  Add the *old* driver app to the list of apps to be superseded.
    4.  Choose `Uninstall previous version` if Intune should actively remove the old driver when installing the new one.
    5.  Assign the *new* app to the same groups. Intune will manage the upgrade process based on the supersedence rules.
* **Scripts:** Requires creating a new script for the update and potentially another script to explicitly remove the old version (`pnputil /delete-driver`). Manage assignments carefully.

### Removing Outdated Drivers/Printers

* **Universal Print:** Un-share the printer in Azure, remove user/group assignments from the Intune configuration profile. De-register the printer if it's decommissioned.
* **Win32 Apps:** Change the assignment type from `Required`/`Available` to `Uninstall` for the target group. Intune will trigger the uninstall command defined in the app package.
* **Scripts:** Deploy a script specifically designed to remove the printer (`Remove-Printer`) and uninstall the driver (`pnputil /delete-driver oemXX.inf /uninstall`). Identifying the correct `oemXX.inf` dynamically can be challenging and often requires custom logic or storing metadata during installation.

---

## 12. Conclusion

Migrating printer driver and queue deployment to Microsoft Intune offers significant advantages over traditional methods. **Universal Print** represents the most streamlined, cloud-native approach and should be the preferred strategy where feasible, as it eliminates client-side driver management. For scenarios requiring specific legacy drivers or complex setups, packaging drivers as **Win32 Apps** with robust detection rules or utilizing targeted **PowerShell Scripts** provide flexible alternatives. Careful planning around deployment strategy, rigorous testing, effective monitoring, and understanding troubleshooting techniques are key to a successful implementation. By leveraging Intune's capabilities, organizations can achieve a more efficient, secure, and scalable print environment.

---