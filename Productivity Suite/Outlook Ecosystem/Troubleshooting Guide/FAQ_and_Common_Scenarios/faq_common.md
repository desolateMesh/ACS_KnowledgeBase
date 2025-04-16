# FAQ and Common Scenarios

## Overview

This document provides ready-to-use solutions for frequently encountered Outlook issues across the enterprise. Each scenario includes symptoms, common causes, and step-by-step resolution procedures designed to minimize downtime and restore functionality quickly.

## Authentication and Login Issues

### Repeated Password Prompts

**Symptoms:**
- User is repeatedly prompted for credentials despite entering them correctly
- Authentication loops even after successful credential entry
- "Need Password" notification persists in Outlook status bar

**Common Causes:**
- Credential cache corruption
- Modern Authentication conflicts
- Conditional Access policies
- Outdated client version

**Resolution Steps:**

1. **Clear cached credentials:**
   - Close Outlook
   - Open Control Panel > Credential Manager
   - Remove all entries containing "Outlook," "Microsoft," or "Office"
   - Restart Outlook and re-enter credentials

2. **If using Modern Authentication:**
   - Verify the account is configured for Modern Auth in Microsoft 365 Admin Center
   - Check for Conditional Access policies that might be blocking the user
   - Ensure the Outlook client version supports Modern Authentication

3. **For persistent issues:**
   - Create a new Outlook profile:
     1. Control Panel > Mail > Show Profiles > Add
     2. Configure with the same email address
     3. Test with the new profile

### "Cannot Start Microsoft Outlook" Error

**Symptoms:**
- Error: "Cannot start Microsoft Outlook. Cannot open the Outlook window."
- Outlook crashes immediately upon launch
- Outlook appears in task manager briefly then disappears

**Common Causes:**
- Corrupt Outlook profile
- Damaged Navigation Pane settings
- Add-in conflicts
- Corrupt OST file

**Resolution Steps:**

1. **Start Outlook in Safe Mode:**
   - Hold Ctrl key while launching Outlook or
   - Run: `outlook.exe /safe` from Start > Run

2. **If Outlook opens in Safe Mode:**
   - Issue is likely with an add-in
   - Go to File > Options > Add-ins
   - Manage: COM Add-ins > Go
   - Uncheck all add-ins, click OK
   - Restart Outlook normally
   - Re-enable add-ins one by one to identify the problematic one

3. **Reset Navigation Pane:**
   - Run: `outlook.exe /resetnavpane`

4. **If issue persists:**
   - Locate and rename OST file:
     1. Close Outlook
     2. Navigate to: `%localappdata%\Microsoft\Outlook\`
     3. Rename the OST file (e.g., outlook.ost to outlook.old)
     4. Restart Outlook (a new OST file will be created)

## Email Delivery Issues

### Emails Stuck in Outbox

**Symptoms:**
- Messages remain in Outbox folder and aren't sent
- "Working Offline" may appear in the status bar
- Send/Receive errors in the status bar

**Common Causes:**
- Network connectivity issues
- Large attachments
- Offline mode enabled
- Send/Receive settings issues
- Add-in interference

**Resolution Steps:**

1. **Check Offline Mode:**
   - Look for "Working Offline" in the status bar
   - If present, click Send/Receive tab > Work Offline to disable

2. **Verify network connectivity:**
   - Ensure the device has internet access
   - Test connection to outlook.office365.com in a browser
   - Check for VPN issues if applicable

3. **Check attachment size:**
   - Microsoft 365 limits attachments to 25MB
   - If message has large attachments, suggest using OneDrive links instead

4. **Reset Send/Receive groups:**
   - Send/Receive tab > Send/Receive Groups > Define Send/Receive Groups
   - Click Reset
   - Click OK and try sending again

5. **For persistent issues:**
   - Move the stuck email from Outbox to Drafts:
     1. Start Outlook in safe mode (`outlook.exe /safe`)
     2. Drag message from Outbox to Drafts
     3. Close and restart Outlook normally
     4. Edit the message in Drafts and try sending again

### External Recipients Not Receiving Emails

**Symptoms:**
- Emails to external domains aren't delivered
- No NDR (Non-Delivery Report) is received
- Internal email delivery works correctly

**Common Causes:**
- Mail flow rules in Exchange Online
- External domain spam filtering
- Recipient email address typos
- Email being quarantined

**Resolution Steps:**

1. **Verify recipient address:**
   - Check for typos in the email address
   - Confirm domain spelling
   - Try sending to an alternate email address for the recipient

2. **Check message tracking:**
   - Administrator should check message trace in Exchange Admin Center:
     1. Navigate to Mail flow > Message trace
     2. Search for the specific message
     3. Review delivery status and any policy hits

3. **Check for quarantined messages:**
   - Administrator should check Security & Compliance Center:
     1. Navigate to Threat management > Review > Quarantine
     2. Search for the message and release if appropriate

4. **Test external mail flow:**
   - Send a test message to an external email system you control
   - If that works, the issue may be specific to the recipient's domain

5. **Check for blocking rules:**
   - Administrator should review mail flow rules that might affect external messages
   - Check for domain-specific transport rules

## Calendar and Meeting Issues

### Missing or Duplicate Calendar Items

**Symptoms:**
- Calendar appointments disappear unexpectedly
- Same meeting appears multiple times
- Meeting updates don't correctly replace existing items

**Common Causes:**
- Calendar view filtering
- Sync issues with mobile devices
- Corrupt calendar items
- Permissions problems with shared calendars

**Resolution Steps:**

1. **Check calendar view settings:**
   - In Calendar view, verify the date range being displayed
   - Check View Settings > Filter to ensure no filters are applied
   - Try different views (Day, Week, Month) to see if items appear

2. **Reset calendar view:**
   - Right-click the Calendar in the folder pane
   - Select "Reset View"

3. **Check for synchronization issues:**
   - If using multiple devices, check if the issue appears on all devices
   - Remove and re-add account on mobile devices if necessary

4. **Rebuild Calendar cache:**
   - Close Outlook
   - Navigate to: `%localappdata%\Microsoft\Outlook\`
   - Rename outcmd.dat to outcmd.old
   - Restart Outlook

5. **For shared calendars:**
   - Verify user has appropriate permissions
   - Remove and re-add the shared calendar

### Meeting Response Tracking Issues

**Symptoms:**
- Meeting responses not updating organizer's tracking
- Attendees show as "No Response" despite having responded
- Meeting tracking statistics are incorrect

**Common Causes:**
- Responses sent to wrong meeting instance
- Delegate access configuration issues
- Large recipient lists causing delays
- Tracking disabled for the meeting

**Resolution Steps:**

1. **Verify tracking is enabled:**
   - Open the meeting as the organizer
   - Click Tracking button to view current responses
   - Ensure "Track Responses" is enabled in meeting options

2. **Check for meeting corruption:**
   - If it's a recurring meeting, check if responses are updating for some occurrences but not others
   - Consider recreating problematic meeting instances

3. **For delegate scenarios:**
   - Verify delegate permissions are correctly configured
   - Check if responses are being directed to the delegate instead of the organizer
   - Review Delegate Access settings in Outlook options

4. **Force update:**
   - Send a meeting update with a minor change
   - This often triggers response tracking to refresh

5. **For persistent issues:**
   - Export calendar to PST
   - Import to a test profile
   - Check if tracking works correctly there

## Performance Issues

### Outlook Running Slowly

**Symptoms:**
- Delayed response when switching folders
- Sluggish message loading and scrolling
- Search operations taking excessive time
- General UI lag and frozen windows

**Common Causes:**
- Large OST/PST files
- Too many items in critical folders
- Add-in performance impact
- System resource constraints
- Outdated Outlook version

**Resolution Steps:**

1. **Check OST/PST file size:**
   - Right-click the Outlook data file in the folder pane
   - Select Data File Properties > Advanced
   - Note the size, for optimal performance:
     - PST files should be under 10GB
     - OST files should be under 50GB

2. **Implement Auto-Archive for older items:**
   - File > Options > Advanced > AutoArchive Settings
   - Configure to move older items to an archive
   - Consider enabling Online Archive for Microsoft 365 accounts

3. **Review add-in performance:**
   - Disable add-ins temporarily to test performance:
     1. File > Options > Add-ins
     2. Manage: COM Add-ins > Go
     3. Uncheck all add-ins, restart Outlook
     4. If performance improves, re-enable add-ins one by one

4. **Optimize folder structure:**
   - Keep Inbox, Sent Items, and Deleted Items under 5,000 items each
   - Create archive folders for older emails
   - Empty Deleted Items regularly

5. **Update Outlook:**
   - Ensure the latest version and updates are installed
   - For Microsoft 365 users, switch to Current Channel for latest fixes

6. **Check Cached Exchange Mode settings:**
   - File > Account Settings > Account Settings
   - Double-click the account > More Settings > Advanced
   - Adjust slider to cache fewer months of mail

### Outlook Search Not Working

**Symptoms:**
- Search returns no results despite known matching items
- "Something went wrong and your search couldn't be completed"
- Extremely slow search performance
- Inconsistent search results

**Common Causes:**
- Corrupt search index
- Windows Search service issues
- Outlook running in non-cached mode
- Indexing options misconfigured

**Resolution Steps:**

1. **Verify Windows Search is running:**
   - Press Windows+R, type: services.msc
   - Find "Windows Search" service
   - Ensure status is "Running" and startup type is "Automatic"
   - If stopped, right-click > Start

2. **Rebuild Outlook search index:**
   - Close Outlook
   - Control Panel > Indexing Options
   - Click Advanced > Rebuild
   - Wait for indexing to complete (may take several hours)

3. **Check Outlook indexing status:**
   - In Outlook, go to Search tab > Search Tools > Indexing Status
   - Verify that all mail items are indexed

4. **Ensure correct locations are indexed:**
   - Control Panel > Indexing Options
   - Click Modify
   - Ensure "Microsoft Outlook" is checked
   - For PST files, make sure the PST location is included

5. **For Microsoft 365 accounts:**
   - Check if search works in Outlook on the web
   - If web search works but client doesn't, focus on client-side indexing

## Mobile and Cross-Platform Issues

### Mobile Device Email Not Syncing

**Symptoms:**
- New emails not appearing on mobile device
- Sent items from mobile not showing in Outlook
- Calendar or contacts not updating across devices
- Sync errors in mobile Outlook app

**Common Causes:**
- Account authentication issues
- App permissions problems
- Background sync restrictions
- Conditional Access policies
- Outdated mobile app version

**Resolution Steps:**

1. **Verify account status:**
   - Check that the account is active in Microsoft 365 Admin Center
   - Ensure the user has appropriate licenses assigned
   - Verify mobile device is not blocked by Conditional Access

2. **Check app permissions:**
   - In device settings, verify Outlook app has:
     - Background app refresh enabled
     - Notification permissions
     - Full network access
     - Calendar/Contacts access (if applicable)

3. **Remove and re-add account:**
   - In Outlook mobile app:
     1. Go to Settings > Account settings
     2. Select the problematic account
     3. Remove Account
     4. Add it back with fresh authentication

4. **Update app and OS:**
   - Ensure Outlook mobile app is updated to latest version
   - Check if device OS needs updating

5. **Check for data-saving modes:**
   - Disable battery optimization for Outlook app
   - Disable data-saving features that might restrict background syncing

### Web Access Works but Desktop Client Doesn't

**Symptoms:**
- Outlook on the web (OWA) functions correctly
- Desktop Outlook client has connection or authentication issues
- Error messages when trying to connect in desktop client

**Common Causes:**
- Corrupt Outlook profile
- Network restrictions specific to desktop client
- Outdated desktop client
- Proxy or firewall interference
- TLS/SSL configuration issues

**Resolution Steps:**

1. **Create a new profile to test:**
   - Control Panel > Mail > Show Profiles > Add
   - Configure with same email address
   - Test with the new profile

2. **Check network connectivity:**
   - Test connection to key endpoints:
     - outlook.office365.com (TCP 443)
     - autodiscover-s.outlook.com (TCP 443)

3. **Verify proxy settings:**
   - File > Options > Advanced > Network
   - Click "Connection Settings"
   - Test both "Use system proxy settings" and "No proxy"

4. **Check TLS configuration:**
   - Ensure TLS 1.2 is enabled in Windows:
     1. Internet Options > Advanced tab
     2. Scroll to Security section
     3. Ensure "Use TLS 1.2" is checked

5. **Update Office:**
   - Run Office updates to ensure latest version
   - For older versions, check for required updates specific to TLS 1.2 support

## Related Documentation

- [Outlook Profile Management Guide](link-to-profile-guide)
- [Search Troubleshooting Deep Dive](link-to-search-guide)
- [Performance Optimization Strategies](link-to-performance-guide)
- [Mobile Configuration Best Practices](link-to-mobile-guide)
