# Azure Update Manager - Patch Orchestration Blueprint

## Overview

Azure Update Manager provides a comprehensive approach to orchestrating patches across your Azure and hybrid environments. This blueprint outlines best practices for implementing a robust patch orchestration strategy that balances security, stability, and business continuity.

## Key Orchestration Models

Azure Update Manager supports multiple orchestration modes to meet diverse organizational needs:

### 1. Azure Orchestrated Updates (Platform-Managed)

Azure Update Manager can directly orchestrate the update process across all public and private clouds for VMs that have enabled this functionality. The orchestration follows availability-first principles across different levels of Azure availability architectures.

- **Availability Sets**: Updates are processed one update domain at a time
- **Virtual Machine Scale Sets**: Updates follow configured upgrade policies
- **Single VMs**: Updates are processed according to scheduled maintenance windows

### 2. OS Orchestrated/Automatic by OS

This mode allows the operating system to automatically install updates on Windows VMs as soon as they're available. It leverages the native Windows Update service while still providing visibility through the Azure portal.

### 3. Manually Controlled Updates

For environments requiring strict change control, Azure Update Manager supports manual approval workflows where updates can be reviewed, scheduled, and deployed during predefined maintenance windows.

## Implementation Strategy

1. **Assessment Phase**:
   - Inventory all systems requiring updates
   - Categorize workloads by criticality and availability requirements
   - Define update schedules aligned with business needs

2. **Configuration Phase**:
   - Establish update groups based on workload similarity
   - Configure maintenance windows (typically non-business hours)
   - Define pre/post-update scripts for application-specific handling

3. **Deployment Phase**:
   - Start with non-critical workloads to validate processes
   - Implement phased rollouts for critical systems
   - Utilize staggered deployments across update domains

4. **Monitoring Phase**:
   - Track update compliance against security baselines
   - Monitor system health metrics post-update
   - Document any update-related incidents for process improvement

## Best Practices

- **Target Groups**: Use Azure Policy to dynamically target groups of VMs for update deployment rather than manually managing individual machines
- **Redundancy Planning**: Ensure critical services maintain minimum capacity during update cycles
- **Rollback Planning**: Document and test rollback procedures for each update category
- **Dependency Mapping**: Understand application dependencies to prevent cascade failures
- **Compliance Reporting**: Implement regular reporting on patch compliance status

## References

- [Azure Update Manager overview](https://learn.microsoft.com/en-us/azure/update-manager/overview)
- [Update options and orchestration in Azure Update Manager](https://learn.microsoft.com/en-us/azure/update-manager/updates-maintenance-schedules)
- [Scheduled patching in Azure Update Manager](https://learn.microsoft.com/en-us/azure/update-manager/scheduled-patching)

## Related Documents

- [Maintenance Window Configurations](./Maintenance%20Window%20Configurations.md)
- [Pre- and Post-Update Script Automation](./Pre-%20and%20Post-Update%20Script%20Automation.md)
- [Phased Rollout Frameworks](./Phased%20Rollout%20Frameworks)
