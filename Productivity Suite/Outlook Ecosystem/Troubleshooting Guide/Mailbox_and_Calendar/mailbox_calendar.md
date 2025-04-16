# Mailbox and Calendar Troubleshooting

## Overview

This document provides comprehensive troubleshooting guidance for issues related to Outlook mailboxes and calendars. These components are the core functionality of the Outlook ecosystem and require specific approaches to diagnose and resolve various problems.

## Mailbox Issues

### Mailbox Size and Quota Problems

#### Symptoms
- "Your mailbox is almost full" notifications
- Unable to send or receive emails
- Message: "Your mailbox has exceeded the size limit"
- Performance degradation with large mailboxes

#### Diagnostic Steps

1. **Check current mailbox size and quota limits**:
   
   For Exchange Online (Microsoft 365):
   ```powershell
   # Connect to Exchange Online
   Connect-ExchangeOnline -UserPrincipalName admin@contoso.com
   
   # Check mailbox statistics
   Get-MailboxStatistics -Identity user@contoso.com | Select DisplayName, TotalItemSize, ItemCount
   
   # Check quota limits
   Get-Mailbox -Identity user@contoso.com | Select DisplayName, ProhibitSendQuota, ProhibitSendReceiveQuota, IssueWarningQuota
   ```

2. **Analyze folder sizes within Outlook**:
   - Right-click on the mailbox in the folder pane
   - Select "Data File Properties"
   - Click on "Folder Size" button
   - Review which folders are consuming the most space

3. **Identify attachment-heavy emails**:
   - Use search query: `hasattachment:yes size:>5MB`
   - Sort by size to identify largest emails

#### Resolution Steps

1. **Configure Retention Policies**:
   
   **For administrators**:
   - In Exchange Admin Center, create or modify retention policies
   - Apply appropriate retention tags for automatic archiving

   **For end users**:
   - Apply AutoArchive settings in Outlook:
     - File > Options > Advanced > AutoArchive Settings
     - Set up appropriate timeframes for moving older items

2. **Enable and Configure Online Archive**:
   
   **For administrators**:
   ```powershell
   # Enable online archive
   Enable-Mailbox -Identity user@contoso.com -Archive
   
   # Configure archive policy
   Enable-Mailbox -Identity user@contoso.com -AutoExpandingArchive
   ```

   **For end users**:
   - Once archive is enabled, move items to the Online Archive
   - Create rules to automatically move older items

3. **Clean up large items**:
   - Delete large attachments (after saving them if needed)
   - Empty "Deleted Items" folder
   - Clear "Recoverable Items" folder if needed:
   ```powershell
   Search-Mailbox -Identity user@contoso.com -SearchDumpsterOnly -DeleteContent
   ```

4. **Manage large PST files**:
   - Import PST data to archive mailbox rather than keeping separate PST files
   - Use Import-PST tool in Microsoft 365 compliance center

### Corrupt Mailbox Items

#### Symptoms
- Specific emails cannot be opened ("The operation failed" error)
- Message appears as empty or with scrambled content
- Outlook crashes when accessing particular items
- Calendar items with "Subject: None" or missing details

#### Diagnostic Steps

1. **Identify specific corrupt items**:
   - Note which items or folders cause errors
   - Check if the issue persists in Outlook Web Access (OWA)
   - Determine if the problem is client-side or server-side by testing on multiple devices

2. **Run built-in repair tools**:
   - For local data, run Inbox Repair Tool (scanpst.exe)
   - Location varies by Office version:
     - Office 365/2019/2016 (32-bit): C:\Program Files (x86)\Microsoft Office\root\Office16\
     - Office 365/2019/2016 (64-bit): C:\Program Files\Microsoft Office\root\Office16\

3. **Check for pattern in corrupted items**:
   - Note whether corruption affects:
     - Items with attachments
     - Items from specific senders
     - Items created via specific applications
     - Items modified by mobile devices

#### Resolution Steps

1. **For client-side corruption**:
   - Run Inbox Repair Tool on OST/PST files:
     1. Close Outlook
     2. Run scanpst.exe
     3. Browse to and select the OST/PST file
     4. Click "Start" and follow repair instructions
     5. Create backup when prompted

2. **For server-side corruption**:
   - Export problematic items to PST if possible
   - Delete corrupted items
   - If unable to delete normally:
     - Use Outlook Web Access to delete
     - Use `New-ComplianceSearch` and `New-ComplianceSearchAction` to delete from backend

3. **Recreate problem items**:
   - For calendar items, create new meeting and copy details
   - For contacts, export to CSV, edit, and reimport
   - For emails, forward content to yourself in new message

4. **For persistent corruption issues**:
   ```powershell
   # Run server-side mailbox repair
   New-MailboxRepairRequest -Mailbox user@contoso.com -CorruptionType ProvisionedFolder,SearchFolder,AggregateCounts,Folderview
   ```

### Mailbox Access and Permission Problems

#### Symptoms
- "You do not have permission to access this mailbox"
- Unable to open shared mailboxes
- Permission errors when accessing folders
- Delegate access not working correctly

#### Diagnostic Steps

1. **Verify current permissions**:
   ```powershell
   # Check mailbox permissions
   Get-MailboxPermission -Identity shared@contoso.com | Where-Object {$_.User -like "*username*"}
   
   # Check folder permissions
   Get-MailboxFolderPermission -Identity shared@contoso.com:\Calendar
   ```

2. **Check delegation settings**:
   - In Outlook: File > Account Settings > Delegate Access
   - Verify appropriate permissions are assigned
   - Check "Deliver meeting requests" settings

3. **Verify license and account status**:
   - Ensure shared mailbox does not exceed 50GB (requires license if larger)
   - Check that user account is active and not blocked

#### Resolution Steps

1. **Set appropriate mailbox permissions**:
   ```powershell
   # Grant Full Access
   Add-MailboxPermission -Identity shared@contoso.com -User user@contoso.com -AccessRights FullAccess -InheritanceType All
   
   # Grant Send As permission
   Add-RecipientPermission -Identity shared@contoso.com -Trustee user@contoso.com -AccessRights SendAs -Confirm:$false
   ```

2. **Configure folder-level permissions**:
   ```powershell
   # Grant specific folder access
   Add-MailboxFolderPermission -Identity shared@contoso.com:\Inbox -User user@contoso.com -AccessRights Editor
   ```

3. **Setup delegation properly**:
   - Have mailbox owner set up delegation:
     1. File > Account Settings > Delegate Access > Add
     2. Select appropriate permission levels
     3. Configure meeting delivery preferences

4. **Troubleshoot AutoMapping issues**:
   - If shared mailbox doesn't auto-map in Outlook:
   ```powershell
   # Remove and re-add with AutoMapping
   Remove-MailboxPermission -Identity shared@contoso.com -User user@contoso.com -AccessRights FullAccess
   Add-MailboxPermission -Identity shared@contoso.com -User user@contoso.com -AccessRights FullAccess -AutoMapping $true
   ```

   - To prevent AutoMapping:
   ```powershell
   Add-MailboxPermission -Identity shared@contoso.com -User user@contoso.com -AccessRights FullAccess -AutoMapping $false
   ```

5. **For cached/non-cached mode issues**:
   - Try changing download settings:
     1. File > Account Settings > Account Settings
     2. Double-click account > More Settings > Advanced
     3. Adjust "Download shared folders" setting

## Calendar Issues

### Calendar Sync Problems

#### Symptoms
- Calendar items missing or duplicated across devices
- Meeting updates not reflected correctly
- Inconsistency between Outlook client and Outlook Web Access
- Events showing on mobile but not desktop or vice versa

#### Diagnostic Steps

1. **Identify sync pattern issues**:
   - Determine if problem affects specific item types:
     - All-day events
     - Recurring meetings
     - Meetings with specific properties (e.g., large attendee lists)
     - Meetings crossing time zones

2. **Check client synchronization status**:
   - In Outlook, press F9 or click Send/Receive tab > Send/Receive All Folders
   - Check sync status in mobile apps
   - Verify last sync time in client settings

3. **Test in different clients**:
   - Compare calendar view in:
     - Outlook desktop client
     - Outlook Web Access
     - Outlook mobile app
     - Other connected devices

#### Resolution Steps

1. **Reset client-side calendar cache**:
   - Close Outlook
   - Rename/delete the OST file
   - Restart Outlook to create a fresh OST file
   - For mobile devices, remove and re-add account

2. **Fix calendar folder view**:
   - Right-click on Calendar folder > Properties
   - Click "Reset View"
   - Check "Show all" view settings

3. **Repair calendar inconsistencies**:
   ```powershell
   # Run calendar repair
   New-MailboxRepairRequest -Mailbox user@contoso.com -CorruptionType Calendar
   ```

4. **For mobile sync issues**:
   - Verify account sync settings on device
   - Check that calendar permissions allow synchronization
   - Update mobile app to latest version
   - Check for device-specific sync limitations

5. **Cross-time zone fixes**:
   - Configure correct time zone in all clients
   - For problematic items, recreate with proper time zone settings

### Meeting Request and Response Issues

#### Symptoms
- Meeting invites not being delivered
- Response status not updating for organizer
- Attendees missing from tracking list
- "Inconsistent meeting" warnings
- Calendar items showing as "tentative" after acceptance

#### Diagnostic Steps

1. **Check meeting tracking status**:
   - Open meeting as organizer
   - Click Tracking button to view responses
   - Compare with actual responses from attendees

2. **Verify meeting configuration**:
   - Check if "Request Responses" is enabled
   - Review audience type (Required, Optional, Resource)
   - Check for unusual settings (private flag, custom properties)

3. **Test mail flow for meeting requests**:
   - Send test meeting to affected users
   - Review message trace logs in Exchange Admin Center

#### Resolution Steps

1. **Fix tracking issues**:
   - Send meeting update with minor change to refresh tracking
   - If needed, recreate meeting completely

2. **Address calendar corruption**:
   - Identify inconsistent meeting copies:
     1. Open Calendar folder
     2. Change view to List view
     3. Sort by subject to identify duplicate items
   - Remove problematic duplicates and send fresh invite

3. **Resolve delegate issues**:
   - Check if meeting requests are being routed to delegates
   - Configure appropriate delegate settings:
     1. File > Account Settings > Delegate Access
     2. Adjust "Meeting requests" handling
   
4. **Fix resource booking problems**:
   - Verify room mailbox is properly configured
   - Check processing limits and restrictions
   - For persistent issues:
   ```powershell
   # Reset calendar processing
   Set-CalendarProcessing -Identity room@contoso.com -AutomateProcessing AutoAccept -AllBookInPolicy $true
   ```

5. **Address NDR issues for meeting requests**:
   - Check recipient limits (large meetings)
   - Verify distribution group configurations
   - Use BCC for very large attendee lists

### Calendar Permissions and Sharing

#### Symptoms
- "Calendar can't be displayed" errors
- Unable to view others' calendars
- Calendar sharing invitations not working
- Inconsistent calendar visibility across platforms

#### Diagnostic Steps

1. **Check current calendar permissions**:
   ```powershell
   # Verify calendar folder permissions
   Get-MailboxFolderPermission -Identity user@contoso.com:\Calendar
   ```

2. **Review sharing method used**:
   - Exchange permissions
   - Calendar sharing invitation
   - Published internet calendar
   - Shared via Microsoft 365 Group

3. **Test access in different clients**:
   - Verify access in Outlook desktop client
   - Check Outlook Web Access
   - Test on mobile devices

#### Resolution Steps

1. **Set appropriate calendar permissions**:
   ```powershell
   # Grant calendar access
   Add-MailboxFolderPermission -Identity user@contoso.com:\Calendar -User viewer@contoso.com -AccessRights Reviewer
   
   # Common access rights:
   # - Owner: Full control
   # - PublishingEditor: Create, edit all
   # - Editor: Edit all
   # - PublishingAuthor: Create, edit own
   # - Author: Edit own
   # - Reviewer: Read only
   # - AvailabilityOnly: Free/busy time only
   ```

2. **Share calendar via sharing invitation**:
   - In Outlook:
     1. Right-click Calendar > Share > Calendar
     2. Enter recipient email
     3. Select appropriate permission level
     4. Add message if needed and send

3. **Fix sharing invitation issues**:
   - Verify recipient can access sharing invitations:
     1. Check for email delivery issues
     2. Have recipient check Junk/Spam folders
     3. Verify recipient is using compatible Outlook version

4. **Resolve cross-platform sharing issues**:
   - For mobile access issues, verify Exchange ActiveSync settings
   - For Mac/iOS access, ensure users are on compatible versions
   - For non-Microsoft clients, use iCalendar publishing instead

5. **Troubleshoot shared calendar visibility**:
   - In Outlook, verify shared calendar is visible in folder pane
   - If not visible:
     1. Click "Open Calendar" > "From Address Book"
     2. Select the user and click "Calendar"
   - For folder hierarchy issues:
     ```powershell
     # Run folder hierarchy repair
     New-MailboxRepairRequest -Mailbox user@contoso.com -CorruptionType FolderView
     ```

### Calendar Free/Busy Information Issues

#### Symptoms
- Free/Busy information shows as "No information" for others
- Organization scheduling grid shows incorrect availability
- Room Finder can't determine available meeting times
- Calendar shows "Working Elsewhere" when it should be "Busy"

#### Diagnostic Steps

1. **Check organization relationship settings**:
   ```powershell
   # For hybrid environments
   Get-OrganizationRelationship | Format-List
   
   # Check availability configuration
   Get-AvailabilityConfig
   ```

2. **Verify calendar publishing settings**:
   - In Outlook: File > Options > Calendar
   - Review "Free/Busy Options" section

3. **Test Free/Busy sharing between specific users**:
   - Create test meeting with problematic attendees
   - Check scheduling assistant results

#### Resolution Steps

1. **Fix Organization Configuration**:
   ```powershell
   # Set availability address space for hybrid
   Get-AvailabilityAddressSpace | Set-AvailabilityAddressSpace -AccessMethod OrgWideFB
   ```

2. **Configure user-level Free/Busy sharing**:
   - In Outlook: File > Options > Calendar
   - Set appropriate details in "Free/Busy Options"
   - Ensure "Calendar Publishing" is configured properly

3. **Update free/busy information**:
   - Send free/busy update:
     1. In Outlook, create dummy meeting
     2. Add affected users
     3. Check scheduling grid
     4. Discard meeting afterward

4. **Fix Room Finder issues**:
   - Verify room mailboxes are correctly configured
   - Check resource booking policies
   - Update room capacity and features if needed
   ```powershell
   # Configure room mailbox for proper free/busy
   Set-CalendarProcessing -Identity room@contoso.com -DeleteComments $false -DeleteSubject $false -AddOrganizerToSubject $true
   ```

5. **Resolve cross-forest Free/Busy problems**:
   - Verify trust relationship between forests
   - Check Availability Service configuration
   - For Microsoft 365 hybrid scenarios, validate OAuth setup:
   ```powershell
   # Check OAuth configuration
   Get-IntraOrganizationConnector | Format-List
   ```

## Mailbox and Calendar Troubleshooting Best Practices

### Diagnostic Collection Approach

When troubleshooting complex mailbox or calendar issues:

1. **Document baseline behavior**:
   - Capture screenshots of current state
   - Document exact error messages
   - Note when issue began and any changes made

2. **Use appropriate diagnostic tools**:
   - Exchange Online PowerShell for server-side investigation
   - Outlook logging for client-side issues
   - Message tracking for mail flow problems
   - MFCMAPI for advanced mailbox troubleshooting

3. **Test in multiple environments**:
   - Check behavior in Outlook desktop vs. Outlook Web Access
   - Test on multiple devices where possible
   - Isolate client-specific issues from server-side problems

### Common Troubleshooting Workflows

**For mailbox issues**:
1. Verify server-side status and quotas
2. Check client connectivity and synchronization
3. Examine folder and item-level issues
4. Review permissions and access controls
5. Investigate client-side caching and local data files

**For calendar issues**:
1. Verify calendar item details across clients
2. Check sync status between devices
3. Review permissions and sharing configuration
4. Examine meeting tracking and response flow
5. Investigate time zone and regional setting impacts

### When to Engage Additional Support

Escalate to second-level support when:
- Server-side repairs fail to resolve corruption
- Persistent synchronization issues occur across multiple users
- Authentication problems cannot be resolved with standard methods
- Hybrid configuration issues affect calendar or free/busy sharing
- Data loss or mailbox integrity issues are detected

## Related Documentation

- [Exchange Online Mailbox Sizes and Limits](https://docs.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- [Calendar Repair Tools and Procedures](https://docs.microsoft.com/en-us/exchange/calendar-repair-procedures)
- [Outlook Sync Issues Troubleshooting](https://docs.microsoft.com/en-us/outlook/troubleshoot/synchronization/synchronization-issues)
- [Microsoft 365 Group Calendar Permissions](https://docs.microsoft.com/en-us/microsoft-365/admin/create-groups/manage-group-calendar)
- [Exchange Hybrid Free/Busy Configuration](https://docs.microsoft.com/en-us/exchange/hybrid-free-busy-configuration)
