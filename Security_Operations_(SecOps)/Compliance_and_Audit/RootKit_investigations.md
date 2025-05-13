# Rootkit Investigations in Azure Cloud Environments

## Executive Summary

Rootkits represent one of the most sophisticated and dangerous forms of malware, designed to maintain persistent, undetected access to compromised systems. In Azure cloud environments, rootkit investigations require specialized approaches that combine traditional forensic techniques with cloud-native security tools. This comprehensive guide provides detailed methodologies, tools, and procedures for detecting, investigating, and remediating rootkit infections in Azure infrastructure.

## Understanding Rootkits in Cloud Context

### Definition and Characteristics

A rootkit is malicious software designed to maintain privileged access to a computer system while actively hiding its presence. Key characteristics include:

- **Stealth Operations**: Conceals processes, files, network connections, and registry entries
- **Privilege Escalation**: Operates with administrative or kernel-level privileges
- **Persistence Mechanisms**: Survives reboots and security updates
- **Anti-Detection Features**: Evades traditional antivirus and security tools

### Cloud-Specific Rootkit Behaviors

In Azure environments, rootkits may exhibit unique behaviors:

1. **Resource Manipulation**: Hijacking compute resources for cryptomining
2. **Data Exfiltration**: Stealing sensitive data from storage accounts
3. **Lateral Movement**: Spreading across virtual networks and subscriptions
4. **API Abuse**: Using Azure management APIs for persistence
5. **Container Escape**: Breaking out of containerized environments

## Detection Strategies

### Behavioral Indicators

#### System-Level Indicators
```bash
# Check for hidden processes
ps aux | grep -v grep | awk '{print $2}' > visible_pids.txt
ls -la /proc | grep -E '^d' | awk '{print $9}' | grep -E '^[0-9]+$' > proc_pids.txt
diff visible_pids.txt proc_pids.txt

# Detect anomalous kernel modules
lsmod > current_modules.txt
modinfo $(lsmod | awk '{print $1}' | tail -n +2) > module_info.txt
grep -i "filename:" module_info.txt | grep -v "/lib/modules"
```

#### Network Indicators
```bash
# Check for hidden network connections
netstat -tuln > netstat_output.txt
ss -tuln > ss_output.txt
diff netstat_output.txt ss_output.txt

# Monitor DNS queries
tcpdump -i any -n port 53 -w dns_capture.pcap
# Analyze for suspicious domains or tunneling
```

#### File System Indicators
```bash
# Scan for hidden files
find / -name ".*" -type f 2>/dev/null | grep -v "^/proc" | grep -v "^/sys"

# Check for suspicious SUID binaries
find / -perm -4000 -type f 2>/dev/null | xargs ls -la

# Verify system binary integrity
rpm -Va | grep '^..5' # For RHEL/CentOS
debsums -c # For Debian/Ubuntu
```

### Azure-Native Detection Methods

#### Azure Security Center Alerts
```powershell
# Query Security Center alerts for rootkit indicators
$alerts = Get-AzSecurityAlert -ResourceGroupName "MyResourceGroup"
$rootkitAlerts = $alerts | Where-Object {
    $_.AlertDisplayName -match "rootkit|kernel|privilege escalation"
}

foreach ($alert in $rootkitAlerts) {
    Write-Output "Alert: $($alert.AlertDisplayName)"
    Write-Output "Resource: $($alert.CompromisedEntity)"
    Write-Output "Time: $($alert.TimeGenerated)"
    Write-Output "---"
}
```

#### Azure Sentinel Queries (KQL)
```kql
// Detect potential rootkit activity
SecurityEvent
| where TimeGenerated > ago(24h)
| where EventID in (4688, 4689) // Process creation/termination
| where (
    ProcessName contains_cs "kmod" or
    ProcessName contains_cs "insmod" or
    ProcessName contains_cs "modprobe" or
    CommandLine contains "LD_PRELOAD"
)
| project TimeGenerated, Computer, Account, ProcessName, CommandLine
| sort by TimeGenerated desc

// Suspicious kernel module loading
Syslog
| where TimeGenerated > ago(24h)
| where SyslogMessage contains "module" and SyslogMessage contains "loaded"
| where ProcessName != "systemd-modules-load"
| project TimeGenerated, Computer, ProcessName, SyslogMessage
```

#### Azure Monitor Metrics
```json
{
  "metrics": [
    {
      "name": "Unusual CPU Patterns",
      "query": "Perf | where ObjectName == 'Processor' and CounterName == '% Processor Time' | where CounterValue > 80 | summarize avg(CounterValue) by Computer, bin(TimeGenerated, 5m)"
    },
    {
      "name": "Memory Anomalies",
      "query": "Perf | where ObjectName == 'Memory' and CounterName == 'Available MBytes' | where CounterValue < 500 | summarize min(CounterValue) by Computer, bin(TimeGenerated, 5m)"
    }
  ]
}
```

## Investigation Methodology

### Phase 1: Initial Assessment

#### 1.1 Isolate Affected Systems
```powershell
# Isolate VM network
$vm = Get-AzVM -ResourceGroupName "InfectedRG" -Name "InfectedVM"
$nic = Get-AzNetworkInterface -ResourceId $vm.NetworkProfile.NetworkInterfaces[0].Id

# Create isolation NSG
$isolationNSG = New-AzNetworkSecurityGroup -Name "IsolationNSG" -ResourceGroupName "InfectedRG" -Location $vm.Location

# Apply isolation NSG
$nic.NetworkSecurityGroup = $isolationNSG
Set-AzNetworkInterface -NetworkInterface $nic
```

#### 1.2 Capture System State
```bash
#!/bin/bash
# Forensic data collection script

CASE_ID="ROOTKIT_$(date +%Y%m%d_%H%M%S)"
EVIDENCE_DIR="/tmp/evidence_$CASE_ID"
mkdir -p $EVIDENCE_DIR

# System information
uname -a > $EVIDENCE_DIR/system_info.txt
cat /etc/*release >> $EVIDENCE_DIR/system_info.txt

# Process snapshot
ps auxww > $EVIDENCE_DIR/processes.txt
pstree -p > $EVIDENCE_DIR/process_tree.txt

# Network connections
netstat -tulpn > $EVIDENCE_DIR/network_connections.txt
ss -tulpn >> $EVIDENCE_DIR/network_connections.txt

# Kernel modules
lsmod > $EVIDENCE_DIR/kernel_modules.txt
cat /proc/modules >> $EVIDENCE_DIR/kernel_modules.txt

# File system
mount > $EVIDENCE_DIR/mount_points.txt
df -h > $EVIDENCE_DIR/disk_usage.txt

# Create forensic image
tar czf evidence_$CASE_ID.tar.gz $EVIDENCE_DIR/
```

### Phase 2: Deep Analysis

#### 2.1 Memory Analysis
```bash
# Install and use LiME for memory capture
git clone https://github.com/504ensicsLabs/LiME.git
cd LiME/src
make
sudo insmod lime-*.ko "path=/tmp/memory.lime format=lime"

# Analyze with Volatility
volatility -f /tmp/memory.lime --profile=LinuxUbuntu2004x64 linux_psaux
volatility -f /tmp/memory.lime --profile=LinuxUbuntu2004x64 linux_hidden_modules
volatility -f /tmp/memory.lime --profile=LinuxUbuntu2004x64 linux_malfind
```

#### 2.2 Disk Analysis
```bash
# Create disk snapshot in Azure
az snapshot create \
  --resource-group MyResourceGroup \
  --source "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Compute/disks/{disk-name}" \
  --name rootkit-evidence-snapshot \
  --sku Standard_LRS

# Mount snapshot for analysis
# Create new VM from snapshot for offline analysis
```

#### 2.3 Log Analysis
```bash
# Collect all logs
mkdir -p /evidence/logs
cp -r /var/log/* /evidence/logs/
journalctl --since "7 days ago" > /evidence/logs/journal.log

# Search for indicators
grep -r "insmod\|modprobe\|LD_PRELOAD" /evidence/logs/
grep -r "kernel:.*module.*loaded" /evidence/logs/
```

### Phase 3: Rootkit Identification

#### 3.1 Known Rootkit Signatures
```python
#!/usr/bin/env python3
import hashlib
import os

# Known rootkit hashes
ROOTKIT_SIGNATURES = {
    "reptile": ["d7c0b8c8f8e8d7c0b8c8f8e8", "a1b2c3d4e5f6a1b2c3d4e5f6"],
    "diamonphox": ["f1e2d3c4b5a6f1e2d3c4b5a6", "9876543210987654321098"],
    "beurk": ["abcdef123456abcdef123456", "123456abcdef123456abcdef"]
}

def scan_for_rootkits(directory):
    findings = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'rb') as f:
                    file_hash = hashlib.md5(f.read()).hexdigest()
                    for rootkit, signatures in ROOTKIT_SIGNATURES.items():
                        if file_hash in signatures:
                            findings.append({
                                "file": filepath,
                                "rootkit": rootkit,
                                "hash": file_hash
                            })
            except:
                pass
    return findings

# Scan system
results = scan_for_rootkits("/")
for finding in results:
    print(f"ALERT: {finding['rootkit']} found at {finding['file']}")
```

#### 3.2 Behavioral Analysis
```bash
# Check for process hiding
for pid in $(ls /proc | grep -E '^[0-9]+$'); do
    if ! ps -p $pid > /dev/null 2>&1; then
        echo "Hidden process detected: PID $pid"
        cat /proc/$pid/cmdline 2>/dev/null
    fi
done

# Check for file hiding
# Compare directory listings with different methods
ls -la /tmp > ls_output.txt
find /tmp -maxdepth 1 > find_output.txt
diff ls_output.txt find_output.txt
```

## Remediation Procedures

### Immediate Response

#### Step 1: Containment
```powershell
# Disable VM network access
$vm = Get-AzVM -Name "InfectedVM" -ResourceGroupName "MyRG"
$vm | Stop-AzVM -Force

# Create isolated recovery environment
$recoveryRG = New-AzResourceGroup -Name "RecoveryRG" -Location "EastUS"
$recoveryVNet = New-AzVirtualNetwork -Name "RecoveryVNet" `
  -ResourceGroupName "RecoveryRG" `
  -Location "EastUS" `
  -AddressPrefix "10.1.0.0/16"
```

#### Step 2: Backup Critical Data
```bash
# Mount infected disk to recovery VM
# Mount as read-only to preserve evidence
mount -o ro /dev/sdc1 /mnt/infected_disk

# Backup critical data with verification
rsync -avH --checksum /mnt/infected_disk/critical_data/ /backup/
```

#### Step 3: Rootkit Removal
```bash
#!/bin/bash
# Rootkit removal script

# Kill suspicious processes
for pid in $(cat /tmp/suspicious_pids.txt); do
    kill -9 $pid
done

# Remove kernel modules
for module in $(cat /tmp/malicious_modules.txt); do
    rmmod $module
    echo "blacklist $module" >> /etc/modprobe.d/blacklist.conf
done

# Clean file system
while read filepath; do
    rm -f "$filepath"
    echo "Removed: $filepath"
done < /tmp/malicious_files.txt

# Reset LD_PRELOAD
unset LD_PRELOAD
echo "" > /etc/ld.so.preload
```

### System Restoration

#### Option 1: Clean System Rebuild
```powershell
# Deploy new VM from clean image
$newVM = New-AzVM -ResourceGroupName "MyRG" `
  -Name "CleanVM" `
  -Location "EastUS" `
  -Image "UbuntuLTS" `
  -Size "Standard_D2s_v3" `
  -Credential $cred

# Restore data from backup
# Apply security hardening
```

#### Option 2: In-Place Cleaning
```bash
# Reinstall system packages
apt-get update
apt-get install --reinstall $(dpkg -l | grep ^ii | awk '{print $2}')

# Verify system integrity
debsums -c
find /usr/bin /usr/sbin -type f -exec md5sum {} \; > system_checksums.txt

# Apply security updates
apt-get upgrade -y
apt-get dist-upgrade -y
```

## Prevention Strategies

### Security Hardening

#### Kernel Protection
```bash
# Enable kernel protection features
echo "kernel.kptr_restrict = 2" >> /etc/sysctl.conf
echo "kernel.dmesg_restrict = 1" >> /etc/sysctl.conf
echo "kernel.perf_event_paranoid = 3" >> /etc/sysctl.conf
echo "kernel.yama.ptrace_scope = 2" >> /etc/sysctl.conf
sysctl -p

# Implement Secure Boot
# Configure UEFI secure boot in Azure VM
```

#### Access Controls
```bash
# Restrict module loading
echo "install usb-storage /bin/true" >> /etc/modprobe.d/disable-usb-storage.conf
echo "kernel.modules_disabled = 1" >> /etc/sysctl.conf

# Implement strict file permissions
find / -type f -perm -4000 -exec chmod u-s {} \;
find / -type f -perm -2000 -exec chmod g-s {} \;
```

### Monitoring Implementation

#### Azure Sentinel Rules
```kql
// Rootkit detection rule
let suspicious_modules = dynamic(["rootkit", "reptile", "beurk"]);
let suspicious_paths = dynamic(["/tmp/", "/var/tmp/", "/dev/shm/"]);

Syslog
| where TimeGenerated > ago(1h)
| where SyslogMessage has "module" and SyslogMessage has "loaded"
| where ProcessName !in ("systemd", "kernel")
| extend Module = extract(@"module\s+(\S+)", 1, SyslogMessage)
| where Module has_any (suspicious_modules) or 
        SyslogMessage has_any (suspicious_paths)
| project TimeGenerated, Computer, Module, ProcessName, SyslogMessage
| summarize Count=count() by Computer, Module
| where Count > 1
```

#### Automated Response Playbook
```json
{
  "definition": {
    "actions": {
      "Isolate_VM": {
        "type": "AzureFunction",
        "inputs": {
          "function": "IsolateInfectedVM",
          "parameters": {
            "vmName": "@triggerBody()?['CompromisedEntity']",
            "resourceGroup": "@triggerBody()?['ResourceGroup']"
          }
        }
      },
      "Capture_Evidence": {
        "type": "AzureFunction",
        "inputs": {
          "function": "CaptureForensicEvidence",
          "parameters": {
            "vmName": "@triggerBody()?['CompromisedEntity']",
            "caseId": "@guid()"
          }
        },
        "runAfter": {
          "Isolate_VM": ["Succeeded"]
        }
      },
      "Notify_Security_Team": {
        "type": "EmailV2",
        "inputs": {
          "to": "security@company.com",
          "subject": "Rootkit Detection Alert",
          "body": "Potential rootkit detected on @{triggerBody()?['CompromisedEntity']}"
        },
        "runAfter": {
          "Capture_Evidence": ["Succeeded"]
        }
      }
    }
  }
}
```

## Azure-Specific Considerations

### VM Extensions and Rootkits
```powershell
# Audit VM extensions for compromise
$vms = Get-AzVM
foreach ($vm in $vms) {
    $extensions = Get-AzVMExtension -ResourceGroupName $vm.ResourceGroupName -VMName $vm.Name
    foreach ($ext in $extensions) {
        Write-Output "VM: $($vm.Name), Extension: $($ext.Name), Publisher: $($ext.Publisher)"
        # Verify against known good extensions
    }
}
```

### Managed Identity Abuse
```powershell
# Check for suspicious managed identity usage
$logs = Get-AzLog -StartTime (Get-Date).AddDays(-7) | 
    Where-Object {$_.Authorization.Action -like "*identity*"}

foreach ($log in $logs) {
    if ($log.Caller -notlike "*@yourdomain.com") {
        Write-Warning "Suspicious identity activity: $($log.Caller) at $($log.EventTimestamp)"
    }
}
```

### Storage Account Security
```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

def scan_storage_for_malware(storage_account_name):
    """Scan storage account for potential rootkit payloads"""
    credential = DefaultAzureCredential()
    blob_service = BlobServiceClient(
        account_url=f"https://{storage_account_name}.blob.core.windows.net",
        credential=credential
    )
    
    suspicious_files = []
    containers = blob_service.list_containers()
    
    for container in containers:
        container_client = blob_service.get_container_client(container.name)
        blobs = container_client.list_blobs()
        
        for blob in blobs:
            # Check for suspicious patterns
            if any(pattern in blob.name.lower() for pattern in 
                   ['rootkit', '.ko', 'LD_PRELOAD', 'hide_']):
                suspicious_files.append({
                    'container': container.name,
                    'blob': blob.name,
                    'size': blob.size,
                    'last_modified': blob.last_modified
                })
    
    return suspicious_files
```

## Investigation Checklist

### Initial Response
- [ ] Isolate affected systems
- [ ] Document initial observations
- [ ] Notify incident response team
- [ ] Begin evidence collection
- [ ] Create system snapshots

### Evidence Collection
- [ ] Memory dump capture
- [ ] Disk image creation
- [ ] Network traffic capture
- [ ] Log file preservation
- [ ] Configuration backup

### Analysis Phase
- [ ] Process analysis
- [ ] Network connection review
- [ ] File system examination
- [ ] Registry analysis (Windows)
- [ ] Kernel module inspection (Linux)

### Remediation Steps
- [ ] Rootkit removal
- [ ] System patching
- [ ] Configuration hardening
- [ ] Security tool deployment
- [ ] Monitoring implementation

### Post-Incident
- [ ] Incident report creation
- [ ] Lessons learned documentation
- [ ] Security posture improvement
- [ ] Playbook updates
- [ ] Team training

## Tools and Resources

### Essential Tools
1. **Memory Analysis**: Volatility, LiME, WinPMEM
2. **Disk Forensics**: Sleuth Kit, Autopsy, FTK
3. **Network Analysis**: Wireshark, tcpdump, NetworkMiner
4. **Rootkit Scanners**: chkrootkit, rkhunter, GMER
5. **System Monitoring**: osquery, Sysmon, auditd

### Azure-Native Tools
1. **Azure Security Center**: Threat detection and response
2. **Azure Sentinel**: SIEM and SOAR capabilities
3. **Azure Monitor**: Performance and diagnostic data
4. **Azure Policy**: Compliance and configuration management
5. **Azure Defender**: Advanced threat protection

### Command References
```bash
# Quick rootkit check commands
chkrootkit
rkhunter --check
unhide sys
unhide proc

# System integrity
aide --check
tripwire --check
debsums -c

# Kernel analysis
dmesg | grep -i "module\|kernel\|error"
cat /proc/kallsyms | grep -i "hide\|hook"
```

## Conclusion

Rootkit investigations in Azure environments require a comprehensive approach combining traditional forensic techniques with cloud-native security tools. Success depends on preparation, rapid response, thorough analysis, and continuous improvement of security postures. This guide provides the foundation for effective rootkit detection, investigation, and remediation in Azure cloud infrastructure.

Regular training, tool updates, and process refinement ensure readiness for sophisticated rootkit threats. Integration with Azure's security ecosystem enhances detection capabilities and enables automated response to minimize impact and reduce recovery time.
