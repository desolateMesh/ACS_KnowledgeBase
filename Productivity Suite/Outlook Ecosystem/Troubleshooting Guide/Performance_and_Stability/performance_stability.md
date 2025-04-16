# Performance and Stability Troubleshooting

## Overview

This document provides comprehensive guidance for resolving performance issues and stability problems in Outlook clients. Performance degradation and application crashes have significant impact on productivity and user satisfaction, making efficient troubleshooting essential.

## Performance Issues

### Slow Startup

#### Symptoms
- Outlook takes more than 30 seconds to start
- "Loading profile" message displays for extended periods
- Task Manager shows high CPU/disk activity during startup
- Splash screen remains visible for unusually long time
- Status bar shows "Processing" for extended time after launch

#### Diagnostic Steps

1. **Measure baseline performance**:
   - Record startup time under normal conditions
   - Use Windows Performance Recorder for detailed timing
   - Check Task Manager for resource utilization during startup

2. **Identify startup components**:
   - Enable startup logging:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\General
   "EnableLogging"=dword:00000001
   "StartupLog"=dword:00000001
   ```
   - Review the log at: `%TEMP%\Outlook Logging\Outlook-Startup.etl`

3. **Check add-in load times**:
   - Enable add-in performance logging:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Resiliency
   "EnableLogging"=dword:00000001
   ```
   - Check load time logs at: `%LOCALAPPDATA%\Microsoft\Office\16.0\Outlook\Resiliency\DetectedItems.plist`

4. **Analyze hardware resource constraints**:
   - Monitor disk I/O performance during startup
   - Check available RAM and paging file usage
   - Verify CPU utilization patterns

#### Resolution Steps

1. **Optimize add-ins**:
   - Start Outlook in safe mode to test without add-ins:
     `outlook.exe /safe`
   - If performance improves, selectively disable add-ins:
     1. File > Options > Add-ins
     2. Manage: COM Add-ins > Go
     3. Uncheck problematic add-ins
   - Change add-in load behavior to "Load on Demand" where possible

2. **Reduce mailbox data file size**:
   - For OST files (Exchange), reduce cached timeframe:
     1. File > Account Settings > Account Settings
     2. Double-click account > More Settings > Advanced
     3. Adjust mail to keep offline (e.g., 3 months instead of All)
   - For PST files, consider archiving or splitting large files:
     1. File > Info > Cleanup Tools > Archive
     2. Select folders to archive and choose timeframe
     3. Create new PST files for older content

3. **Repair data files**:
   - For OST files:
     1. Close Outlook
     2. Navigate to: `%LOCALAPPDATA%\Microsoft\Outlook\`
     3. Rename the OST file (e.g., outlook.ost to outlook.old)
     4. Restart Outlook (a new OST file will be created)
   - For PST files, run Inbox Repair Tool (scanpst.exe):
     1. Close Outlook
     2. Run scanpst.exe from Office installation folder
     3. Select PST file and click "Start"
     4. Follow repair instructions

4. **Optimize system resources**:
   - Ensure adequate disk space (at least 15% free)
   - Defragment hard drives (for traditional HDDs)
   - Upgrade to SSD if possible
   - Add RAM if available memory is consistently below 20%
   - Close other applications during Outlook startup

5. **Manage search indexes**:
   - Rebuild search index if corrupted:
     1. Control Panel > Indexing Options
     2. Advanced > Rebuild
   - Optimize index locations:
     1. Move index to faster drive if available
     2. Ensure Outlook data locations are properly indexed

### Slow Message Processing

#### Symptoms
- Significant delay when opening, replying to, or sending emails
- "Not Responding" status when working with messages
- High CPU usage when performing message operations
- Lag when switching between messages
- Delayed message download when selecting folders

#### Diagnostic Steps

1. **Profile slow operations**:
   - Time specific operations (open message, reply, send)
   - Check if delays occur with specific message types:
     - HTML vs. plain text
     - Messages with attachments
     - Messages with embedded content
     - Messages with many recipients

2. **Monitor resource utilization**:
   - Use Task Manager to monitor:
     - CPU usage per process
     - Memory consumption
     - Disk I/O activity
   - Check for resource contention with other applications

3. **Test with different message types**:
   - Create test messages of varying complexity
   - Measure performance with each type
   - Identify patterns in slow operations

4. **Analyze network impact**:
   - Test in Online vs. Cached Exchange Mode
   - Measure network latency to Exchange server
   - Check bandwidth utilization during operations

#### Resolution Steps

1. **Optimize mail formats and content**:
   - Configure preferred message format:
     1. File > Options > Mail
     2. Under "Compose messages", select "Plain Text" for improved performance
   - Reduce HTML complexity:
     1. File > Options > Mail
     2. Under "Message format", click "Editor Options"
     3. Configure HTML options for simpler rendering

2. **Manage local data**:
   - Compact data files regularly:
     1. File > Account Settings > Data Files
     2. Select data file > Settings > Compact Now
   - Reduce auto-save frequency:
     1. File > Options > Mail
     2. Under "Save messages", increase auto-save interval

3. **Improve network configuration**:
   - Adjust Exchange connection settings:
     1. File > Account Settings > Account Settings
     2. Double-click account > More Settings > Connection
     3. Configure appropriate connection type and proxy settings
   - Optimize Cached Exchange Mode:
     1. Download Headers Only for large folders
     2. Reduce offline data timeframe for non-essential content

4. **Address profile corruption**:
   - Create new Outlook profile to test:
     1. Control Panel > Mail > Show Profiles > Add
     2. Configure with same email account
     3. Test performance with new profile

5. **Apply relevant Office updates**:
   - Install latest Outlook updates
   - Check for known performance issues in Microsoft Knowledge Base
   - Apply hotfixes specific to performance problems

### Calendar Performance Issues

#### Symptoms
- Slow calendar loading and navigation
- Lag when switching between calendar views
- Delayed rendering of meeting details
- Performance degradation in rooms and resource scheduling
- Outlook freezes when accessing specific calendar items

#### Diagnostic Steps

1. **Analyze calendar complexity**:
   - Count number of calendars displayed simultaneously
   - Identify calendars with high item counts
   - Check for complex recurring meeting patterns
   - Measure shared calendar loading times

2. **Enable calendar logging**:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Calendar
   "EnableCalendarLogging"=dword:00000001
   ```
   - Review logs in: `%TEMP%\Outlook Logging\calendar*.etl`

3. **Test different calendar views**:
   - Compare performance across views:
     - Day/Week/Month/Schedule View
     - Time scale variations
     - Group schedules
   - Note which views cause most significant delays

4. **Assess shared calendar impact**:
   - Temporarily remove shared calendars
   - Measure performance improvement
   - Identify specific problematic shared calendars

#### Resolution Steps

1. **Optimize calendar view configuration**:
   - Reduce visible calendars:
     - Show only essential calendars
     - Use calendar groups for better organization
   - Optimize view settings:
     1. On Calendar tab, click "View Settings"
     2. Under "Other Settings", simplify view options
     3. Reduce items shown per page

2. **Address calendar folder corruption**:
   - Run calendar folder repair:
   ```powershell
   # For Exchange Online
   New-MailboxRepairRequest -Mailbox user@contoso.com -CorruptionType Calendar
   ```
   - For persistent issues, create new calendar folder:
     1. Create temporary calendar folder
     2. Move items from original calendar
     3. Delete and recreate original calendar
     4. Move items back

3. **Manage calendar data volume**:
   - Archive older calendar items:
     1. File > Info > Cleanup Tools > Archive
     2. Select calendar folders and set appropriate date
   - Remove unnecessary calendar items:
     1. Use search to find old or cancelled meetings
     2. Delete or archive items no longer needed

4. **Optimize shared calendars**:
   - Use "Download shared folders" option judiciously:
     1. File > Account Settings > Account Settings
     2. Double-click account > More Settings > Advanced
     3. Configure "Download shared folders" appropriately
   - Consider using alternative views for large shared calendars:
     - Web access for occasional viewing
     - Schedule view instead of overlay for multiple calendars

5. **Address resource-intensive calendars**:
   - For large room calendars:
     1. Use Scheduling Assistant instead of direct calendar view
     2. Create focused views showing only specific time periods
   - For complex recurring meetings:
     1. Simplify recurrence patterns where possible
     2. Split very long-running recurring series into shorter segments

### Search Performance Issues

#### Symptoms
- Excessive time to return search results
- Incomplete or missing search results
- High CPU/disk usage during search operations
- "Search is being initialized" message persists
- Search indexing service consuming excessive resources

#### Diagnostic Steps

1. **Check Windows Search service status**:
   - Verify service is running:
     1. Open Services (services.msc)
     2. Locate "Windows Search" service
     3. Confirm status is "Running"
   - Check for search-related errors in Event Viewer:
     1. Open Event Viewer
     2. Applications and Services Logs > Microsoft > Windows > Search

2. **Monitor search index status**:
   - Check indexing status:
     1. In Outlook, go to Search tab
     2. Click "Search Tools" > "Indexing Status"
   - Review Control Panel indexing status:
     1. Control Panel > Indexing Options
     2. Note indexed locations and item counts

3. **Test search query performance**:
   - Run test searches with different parameters:
     - Simple vs. complex queries
     - Recent vs. older content
     - Queries targeting specific folders
     - Queries with attachments or specific criteria

4. **Analyze search-related resources**:
   - Monitor SearchIndexer.exe resource usage
   - Check Outlook.exe resource usage during searches
   - Measure disk I/O during search operations

#### Resolution Steps

1. **Rebuild search indexes**:
   - Rebuild Windows Search index:
     1. Control Panel > Indexing Options
     2. Click Advanced > Rebuild
     3. Allow index to complete rebuilding (may take several hours)
   - Reset Outlook search index:
     1. File > Options > Search
     2. Click "Indexing Options"
     3. Click "Advanced" > "Rebuild"

2. **Optimize indexing configuration**:
   - Verify correct locations are indexed:
     1. Control Panel > Indexing Options
     2. Click Modify
     3. Ensure Microsoft Outlook and data file locations are selected
   - Configure appropriate file types:
     1. In Indexing Options, click "Advanced"
     2. Click "File Types" tab
     3. Ensure relevant file types are indexed

3. **Manage search data scope**:
   - Limit search scope for better performance:
     - Use "Current Folder" instead of "All Outlook Items"
     - Create search folders for frequently searched content
     - Use more specific search criteria

4. **Address index corruption**:
   - For persistent issues, reset search catalog:
     1. Stop Windows Search service
     2. Delete index files at: `%ProgramData%\Microsoft\Search\Data\Applications\Windows`
     3. Restart Windows Search service
     4. Allow complete reindexing

5. **Hardware recommendations**:
   - Move search index to SSD for better performance:
     1. Control Panel > Indexing Options > Advanced
     2. Click "Index Location" tab
     3. Change index location to SSD volume
   - Ensure adequate system resources:
     - Minimum 8GB RAM recommended
     - SSD storage for Outlook data files
     - Multicore processor (4+ cores)

## Stability Issues

### Crashes and Freezes

#### Symptoms
- Outlook closes unexpectedly during specific operations
- Application becomes unresponsive ("Not Responding")
- Windows Error Reporting dialog appears
- Outlook restarts automatically after crash
- Recurring crashes when accessing specific items or folders

#### Diagnostic Steps

1. **Analyze crash patterns**:
   - Document exact actions leading to crashes
   - Note any error messages or codes displayed
   - Check frequency and predictability of crashes
   - Identify if crashes occur after specific system events (updates, etc.)

2. **Review Windows Event Logs**:
   - Check Application log for Outlook crashes:
     1. Open Event Viewer
     2. Windows Logs > Application
     3. Filter for Source: "Application Error" or "OUTLOOK"
     4. Note error codes and fault module information

3. **Enable crash logging**:
   - Create crash dump files:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook
   "EnableCrashDumps"=dword:00000001
   "DumpFolder"="C:\CrashDumps"
   ```
   - Create folder specified in DumpFolder value

4. **Test in safe mode**:
   - Launch Outlook in safe mode:
     `outlook.exe /safe`
   - If crashes don't occur in safe mode, add-in issues are likely

#### Resolution Steps

1. **Address add-in related crashes**:
   - Disable problematic add-ins:
     1. File > Options > Add-ins
     2. Manage: COM Add-ins > Go
     3. Uncheck suspected add-ins
     4. Restart Outlook
   - Update add-ins to latest versions
   - Contact add-in vendors for known compatibility issues

2. **Repair Office installation**:
   - Run Quick Repair:
     1. Control Panel > Programs > Programs and Features
     2. Select Microsoft Office
     3. Click "Change" > "Quick Repair" > "Repair"
   - If issues persist, run Online Repair:
     1. Control Panel > Programs > Programs and Features
     2. Select Microsoft Office
     3. Click "Change" > "Online Repair" > "Repair"

3. **Fix corrupted profile and data**:
   - Create new Outlook profile:
     1. Control Panel > Mail > Show Profiles > Add
     2. Configure with same email account
     3. Test with new profile
   - Repair OST/PST files:
     - For OST: Rename/delete to force recreation
     - For PST: Run scanpst.exe to repair

4. **Address system-level issues**:
   - Update Windows to latest version
   - Install latest graphics drivers
   - Check for disk errors:
     `chkdsk C: /f /r`
   - Scan for malware
   - Verify sufficient system resources

5. **Fix specific crash scenarios**:
   - For crashes when accessing specific items:
     1. Access mailbox via Outlook Web Access
     2. Delete or move problematic items
   - For crashes related to specific folders:
     1. Create new folder
     2. Move items to new folder
     3. Delete corrupted folder

### Data File Corruption

#### Symptoms
- Error messages about data file problems
- "The operation failed" when accessing items
- Unexpected folder behavior or missing content
- Recurring search index rebuild prompts
- Outlook closes when accessing specific folders

#### Diagnostic Steps

1. **Check data file integrity**:
   - For PST files, note header information:
     1. Run scanpst.exe with file selected
     2. Note reported file size and structure
     3. Check for reported errors before repair
   - For OST files, examine synchronization status:
     1. Right-click the folder
     2. Properties > Synchronization tab
     3. Review synchronization errors

2. **Test file system integrity**:
   - Verify disk health:
     1. Run `chkdsk C: /f /r`
     2. Check for bad sectors or file system errors
   - Test alternative storage locations

3. **Analyze error patterns**:
   - Document specific operations causing errors
   - Check if errors only occur with specific folders or items
   - Note any patterns in error messages

4. **Review data file size and limits**:
   - Check current file sizes:
     1. File > Account Settings > Data Files
     2. Note size of each data file
   - Compare against known limits:
     - PST file practical limit: ~20GB
     - OST file format limit: 50GB
     - Performance degradation typically begins above 5GB

#### Resolution Steps

1. **Repair data files**:
   - For PST files, run Inbox Repair Tool:
     1. Close Outlook
     2. Run scanpst.exe (typically in Office installation folder)
     3. Select PST file and click "Start"
     4. Create backup when prompted
     5. Complete repair process
   - For OST files, recreate:
     1. Close Outlook
     2. Navigate to: `%LOCALAPPDATA%\Microsoft\Outlook\`
     3. Rename or delete OST file
     4. Restart Outlook to create new OST file

2. **Manage file size issues**:
   - Split large PST files:
     1. Create new PST: File > New > Outlook Data File
     2. Move folders to new PST file
     3. Archive older items to separate PST files
   - Reduce OST file size:
     1. Change sync settings to fewer months
     2. Remove unnecessary shared folders
     3. Exclude large folders from offline sync

3. **Implement advanced recovery**:
   - For severely corrupted PST files:
     1. Use third-party PST recovery tools
     2. Extract data to new PST file
   - For Exchange mailboxes with corruption:
   ```powershell
   # Server-side mailbox repair
   New-MailboxRepairRequest -Mailbox user@contoso.com -CorruptionType ProvisionedFolder,SearchFolder,AggregateCounts,Folderview
   ```

4. **Prevent future corruption**:
   - Configure automatic archiving:
     1. File > Options > Advanced > AutoArchive Settings
     2. Schedule regular archiving of older content
   - Implement backup strategy:
     1. Regular PST file backups
     2. For Exchange, enable litigation hold or archiving
   - Optimize storage configuration:
     1. Store data files on reliable storage
     2. Avoid network locations for PST files
     3. Ensure proper shutdown procedures

5. **Address extreme corruption cases**:
   - For completely inaccessible PST files:
     1. Restore from backup if available
     2. Use specialized data recovery services
   - For Exchange corruption beyond repair:
     1. Create new mailbox
     2. Export accessible data from old mailbox
     3. Import to new mailbox

### Memory Leaks and Resource Issues

#### Symptoms
- Outlook memory usage increases over time
- Performance degrades during extended usage session
- System becomes sluggish with Outlook running
- Memory-related error messages
- Outlook requires frequent restarts to maintain performance

#### Diagnostic Steps

1. **Monitor resource utilization**:
   - Track memory usage patterns:
     1. Open Task Manager > Details tab
     2. Observe OUTLOOK.EXE memory usage over time
     3. Note pattern and rate of increase
   - Check for related processes:
     1. Look for multiple OUTLOOK.EXE instances
     2. Monitor add-in processes (e.g., MAPISVC.EXE)

2. **Test different usage scenarios**:
   - Observe memory usage during specific activities:
     - Email processing
     - Calendar access
     - Contact management
     - With and without specific add-ins

3. **Analyze system memory pressure**:
   - Check overall system memory usage
   - Monitor paging file activity
   - Assess impact of other applications running concurrently

4. **Review Windows Performance Monitor data**:
   - Collect memory counters:
     1. Run Performance Monitor (perfmon.exe)
     2. Add counters for Process > Private Bytes for OUTLOOK.EXE
     3. Add counters for Memory > Pages/sec
     4. Record baseline and growth during usage

#### Resolution Steps

1. **Address add-in memory leaks**:
   - Identify memory-intensive add-ins:
     1. Start Outlook in safe mode (`outlook.exe /safe`)
     2. Monitor baseline memory usage
     3. Enable add-ins one by one to identify culprits
   - Update or replace problematic add-ins
   - Disable non-essential add-ins

2. **Optimize memory usage**:
   - Configure appropriate Cached Exchange Mode settings:
     1. Reduce offline data timeframe
     2. Limit number of shared folders cached
     3. Disable "Download shared folders" if not needed
   - Close unused Outlook windows and inspectors
   - Minimize number of open items and preview pane usage

3. **Implement memory-saving practices**:
   - Configure attachment handling:
     1. File > Options > Trust Center > Trust Center Settings
     2. Attachment Handling > Do not allow attachments to be saved or opened
   - Reduce autoarchive scope and frequency
   - Close and restart Outlook periodically during long sessions

4. **Address system-level memory issues**:
   - Update Windows and Office to latest versions
   - Increase system RAM if consistently at capacity
   - Configure appropriate paging file settings:
     1. System Properties > Advanced > Performance > Settings
     2. Advanced > Virtual Memory > Change
     3. Set custom size appropriate for system configuration

5. **Fix persistent memory leaks**:
   - Reset Outlook components:
     1. Close Outlook
     2. Rename/delete the OutlookSafeMode.key registry key
     3. Reset the Navigation Pane: `outlook.exe /resetnavpane`
   - Repair/reinstall Office:
     1. Run Office online repair
     2. If issues persist, completely uninstall and reinstall

### Network-Related Stability Issues

#### Symptoms
- Outlook disconnects frequently
- "Trying to connect..." message appears repeatedly
- Unexpected switches between online and offline mode
- Connection errors when accessing server resources
- Sync operations fail intermittently

#### Diagnostic Steps

1. **Analyze network connectivity**:
   - Test basic network connectivity:
     1. Ping Exchange server or outlook.office365.com
     2. Check DNS resolution
     3. Verify proxy configuration
   - Test alternative networks if available

2. **Enable connection logging**:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\Options\Mail
   "EnableConnectivityLogging"=dword:00000001
   ```
   - Check logs in: `%TEMP%\Outlook Logging\connectivity*.log`

3. **Monitor connection states**:
   - Observe Outlook status bar indicators
   - Check connection status in system tray
   - Note timing and pattern of disconnections

4. **Test different connection modes**:
   - Compare behavior in:
     - Cached Exchange Mode vs. Online Mode
     - Different network environments
     - VPN vs. direct connection
     - Wired vs. wireless

#### Resolution Steps

1. **Optimize connection settings**:
   - Configure appropriate connection mode:
     1. File > Account Settings > Account Settings
     2. Double-click account > More Settings > Connection
     3. Select "Connect to Microsoft Exchange using HTTP"
     4. Configure proxy settings appropriately
   - Adjust Exchange connection timeout:
   ```
   HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\Outlook\RPC
   "ConnectionTimeout"=dword:00000023  (35 seconds in hex)
   ```

2. **Address network infrastructure issues**:
   - Check for firewall/proxy interference:
     1. Verify required ports are open (443 for Exchange Online)
     2. Test with temporarily disabled firewall if possible
     3. Configure proxy exceptions for Outlook servers
   - Resolve DNS issues:
     1. Flush DNS cache: `ipconfig /flushdns`
     2. Test with alternative DNS servers
     3. Check host file for conflicting entries

3. **Implement connection resilience**:
   - Configure offline mode behavior:
     1. File > Options > Advanced > Send/Receive
     2. Adjust "When Outlook is offline" settings
   - Set appropriate cached mode settings:
     1. Ensure appropriate data is available offline
     2. Configure Download Settings for shared folders

4. **Fix VPN-related issues**:
   - Configure split tunneling if available
   - Adjust VPN connection priority
   - Test alternative VPN protocols if available

5. **Resolve Wi-Fi stability problems**:
   - Update wireless drivers
   - Configure static IP address if DHCP issues
   - Address wireless signal strength issues:
     1. Relocate closer to access point
     2. Remove interference sources
     3. Change wireless channel or band

## Performance Monitoring and Baseline

### Establishing Performance Metrics

Create baseline performance measurements to detect degradation:

1. **Startup Time**:
   - Normal: 5-15 seconds
   - Concerning: >30 seconds
   - Critical: >60 seconds

2. **Operation Response Times**:
   - Open email: <2 seconds
   - Switch folders: <3 seconds
   - Calendar view change: <3 seconds
   - Search response: <5 seconds
   - Send message: <3 seconds

3. **Resource Utilization**:
   - Memory usage (normal operation): 100-300 MB
   - Memory usage (maximum expected): <700 MB
   - CPU usage (idle): <5%
   - CPU usage (active operations): 15-40%
   - CPU usage (search/sync): Up to 70% briefly

### Ongoing Monitoring

Implement ongoing performance monitoring:

1. **System-level monitoring**:
   - Windows Performance Monitor counters
   - Task Manager resource tracking
   - Event log monitoring for errors

2. **Outlook-specific tracking**:
   - EnableLogging registry settings
   - Microsoft Support and Recovery Assistant diagnostics
   - Regular profile verification

3. **Key performance indicators**:
   - Weekly restart frequency
   - Error occurrence rate
   - Sync completion times
   - User-reported lag incidents

## System Requirements and Recommendations

### Minimum System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Processor | 1.6 GHz, 2-core | 2.5+ GHz, 4+ core |
| Memory | 4 GB RAM | 8+ GB RAM |
| Storage | 4 GB available | SSD with 10+ GB free |
| Display | 1280 x 768 | Full HD or higher |
| OS | Windows 10 | Windows 10/11 latest build |
| .NET | 3.5 SP1 | 4.8 or later |

### Optimal Configuration Recommendations

For enterprise environments:

1. **Hardware optimization**:
   - Deploy SSDs for all Outlook users
   - Provision minimum 8GB RAM (16GB preferred)
   - Ensure high-performance graphics for multiple monitors
   - Consider CPU priority for communication roles

2. **Profile configuration**:
   - Implement GPO-managed profiles
   - Configure appropriate cached content timeframes
   - Standardize add-in deployment
   - Set up regular maintenance schedule

3. **Network configuration**:
   - Ensure low-latency connections to Exchange
   - Prioritize Outlook traffic where possible
   - Optimize VPN for Exchange connectivity
   - Configure appropriate proxy settings

## Related Documentation

- [Outlook Performance Optimization Guide](https://docs.microsoft.com/en-us/outlook/troubleshoot/performance/performance-issues-in-outlook)
- [Advanced Troubleshooting for Outlook Crashes](https://docs.microsoft.com/en-us/outlook/troubleshoot/crashes/crashes-in-outlook)
- [Exchange Connectivity Best Practices](https://docs.microsoft.com/en-us/exchange/clients/outlook-for-windows/configure-outlook-for-exchange)
- [System Requirements for Microsoft 365 Apps](https://docs.microsoft.com/en-us/deployoffice/system-requirements-for-office)
- [Enterprise Outlook Performance Management](https://docs.microsoft.com/en-us/microsoft-365/enterprise/tune-microsoft-365-performance)
