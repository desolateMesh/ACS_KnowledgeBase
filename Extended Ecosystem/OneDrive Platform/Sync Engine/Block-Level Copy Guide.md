# Block-Level Copy Guide for OneDrive

## Overview

Block-level copying is a technology implemented in the OneDrive sync engine that significantly improves sync performance and efficiency by only transferring the modified portions of a file rather than the entire file. This document provides a comprehensive guide to understanding, implementing, and troubleshooting block-level copy functionality in OneDrive.

## How Block-Level Copy Works

Block-level copy (also known as differential sync) works by:

1. **File Segmentation**: When a file is first uploaded, it's divided into small blocks (typically 4MB in size).
2. **Block Hashing**: Each block is hashed with a unique identifier.
3. **Change Detection**: When a file is modified, OneDrive identifies which blocks have changed.
4. **Selective Transfer**: Only the modified blocks are uploaded, rather than the entire file.

## Key Benefits

- **Bandwidth Optimization**: Reduces network usage by up to 90% for large file edits.
- **Sync Speed Improvement**: Significantly faster sync times for large files with small changes.
- **Enhanced User Experience**: Minimizes disruption during file editing and sharing.
- **Reduced Server Load**: Decreases processing requirements on both client and server sides.
- **Lower Data Transfer Costs**: Particularly beneficial for metered connections or limited data plans.

## Supported File Types

Block-level copy is supported for most common file types, including:

- Office documents (.docx, .xlsx, .pptx)
- PDFs (.pdf)
- Images (.jpg, .png, .gif)
- Text files (.txt, .rtf, .md)
- Video files (.mp4, .mov)
- Audio files (.mp3, .wav)

Note: Some file formats may not benefit from block-level copying due to their structure.

## Implementation Requirements

### Client-Side Requirements

- OneDrive sync client version 17.3.6943.0625 or later
- Windows 7, 8, 10, or 11
- macOS 10.12 (Sierra) or later
- Minimum of 1GB RAM
- .NET Framework 4.5 or later (Windows)

### Server-Side Requirements

- SharePoint Online or OneDrive for Business
- SharePoint Server 2019 or later (for on-premises implementations)
- Block-level copy API enabled at the tenant level

## Configuration Steps

### Enabling Block-Level Copy for a Tenant

1. **Admin Center Configuration**:
   - Navigate to the Microsoft 365 Admin Center
   - Select "SharePoint" > "Settings" > "Sync"
   - Ensure "Use OneDrive Files On-Demand and sync only the files you use" is enabled

2. **PowerShell Configuration** (alternative method):
   ```powershell
   Connect-SPOService -Url https://contoso-admin.sharepoint.com
   Set-SPOTenant -BlockDeleteSourceIfSyncDeleteFails $true -EnableBlockSyncOnFileExtensions $false
   ```

3. **Client Registry Settings** (Windows):
   ```
   [HKEY_CURRENT_USER\SOFTWARE\Microsoft\OneDrive]
   "EnableBlockLevelSync"=dword:00000001
   ```

4. **Client Configuration File** (macOS):
   ```
   ~/Library/Containers/com.microsoft.OneDrive-mac/Data/Library/Application Support/OneDrive/settings/sync_settings.plist
   ```
   Add entry for EnableBlockLevelSync = 1

### Testing Block-Level Copy Functionality

1. **Simple Test Method**:
   - Create a large file (>100MB, such as a PowerPoint with many images)
   - Upload to OneDrive and wait for initial sync completion
   - Make a small change to the file (e.g., edit a single slide)
   - Monitor network traffic to confirm only a small amount of data is transferred

2. **Advanced Testing with SyncDiagnostics**:
   ```powershell
   Get-SyncDiagnostics | Select-String "BlockLevel"
   ```

## Performance Monitoring

### Key Metrics to Monitor

- **Upload/Download Block Count**: Number of blocks being transferred
- **Block Transfer Size**: Size of individual blocks being synced
- **Block Transfer Time**: Time taken to sync each block
- **Block Cache Hit Rate**: Efficiency of the block cache system

### Logging and Diagnostics

OneDrive sync client logs relevant to block-level copy are located at:

- Windows: `%localappdata%\Microsoft\OneDrive\logs\Business1`
- macOS: `~/Library/Logs/OneDrive`

Important log entries contain the string "BlockLevel" or "DifferentialSync".

## Common Issues and Troubleshooting

### Problem: Block-Level Copy Not Working for Specific Files

**Possible Causes and Solutions**:
- **File Too Small**: Files under 8MB use full-file sync by default
  - *Solution*: Adjust minimum file size threshold through registry settings
- **Unsupported File Format**: Some binary formats cannot use block-level copy
  - *Solution*: Check file compatibility list and consider alternative formats
- **Corrupted File Blocks**: Hash verification failures
  - *Solution*: Force a full re-upload by making a significant change to the file

### Problem: Excessive CPU Usage During Block Processing

**Possible Causes and Solutions**:
- **Block Size Too Small**: Causing high processing overhead
  - *Solution*: Increase block size through advanced settings
- **Insufficient System Resources**: 
  - *Solution*: Close resource-intensive applications during sync or upgrade hardware

### Problem: Sync Failures with "Block Mismatch" Errors

**Possible Causes and Solutions**:
- **Client/Server Version Mismatch**:
  - *Solution*: Update OneDrive client to latest version
- **Network Interruptions During Block Transfer**:
  - *Solution*: Implement sync resume capabilities and improve network stability

## Advanced Configurations

### Customizing Block Size

Default block size is 4MB but can be adjusted for specific scenarios:

```powershell
# Increase block size to 8MB for better performance with large files
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" -Name "BlockSizeInMB" -Value 8 -Type DWORD

# Decrease block size to 2MB for better performance with smaller, frequent changes
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" -Name "BlockSizeInMB" -Value 2 -Type DWORD
```

### Optimizing Block Cache

The block cache improves performance but can consume disk space:

```powershell
# Set maximum block cache size to 10GB
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" -Name "MaxBlockCacheSizeInGB" -Value 10 -Type DWORD

# Set block cache location to a faster drive
Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" -Name "BlockCachePath" -Value "D:\OneDriveCache" -Type String
```

## Enterprise Deployment Considerations

### Group Policy Settings

Block-level copy can be controlled via Group Policy:

1. **Download** the [OneDrive administrative templates](https://docs.microsoft.com/en-us/onedrive/use-group-policy)
2. **Install** the ADMX templates in your Group Policy central store
3. **Configure** the policy "Enable block-level sync" under Computer Configuration > Administrative Templates > OneDrive

### Bandwidth Management

For organizations with limited bandwidth:

- **Throttling**: Configure sync throttling during business hours
- **Scheduling**: Set block-level sync to occur during off-peak hours
- **QoS**: Implement Quality of Service rules for OneDrive sync traffic

### Security Implications

Block-level copy has minimal security impact, but consider:

- **Encryption**: Blocks are encrypted during transfer (TLS 1.2+)
- **Block Verification**: Hashes verify block integrity
- **Access Controls**: Standard OneDrive permissions apply to all blocks

## Future Developments

Microsoft continues to enhance block-level copy technology:

- **Smaller Block Sizes**: For more granular changes
- **Smart Block Prediction**: AI-based prediction of which blocks will change
- **Cross-File Block Deduplication**: Recognizing identical blocks across different files

## References and Additional Resources

- [Official Microsoft Documentation on Block-Level Copy](https://docs.microsoft.com/en-us/onedrive/block-level-copy)
- [OneDrive Sync Performance Optimization Guide](https://docs.microsoft.com/en-us/onedrive/sync-performance)
- [OneDrive Tech Community](https://techcommunity.microsoft.com/t5/onedrive-for-business/bd-p/OneDriveforBusiness)
- [Block-Level Copy API Reference](https://docs.microsoft.com/en-us/graph/api/resources/driveitem)

---

*Last Updated: April 2025*
*Author: ACS Knowledge Base Team*