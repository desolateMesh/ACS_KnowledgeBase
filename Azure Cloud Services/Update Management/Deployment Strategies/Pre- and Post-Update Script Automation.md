# Pre- and Post-Update Script Automation

## Overview

This document outlines strategies, best practices, and implementation guidelines for automating actions before and after update deployments using Azure Update Manager. Pre- and post-update script automation allows organizations to perform critical tasks during the update lifecycle, ensuring application availability, data integrity, and system stability throughout the patching process.

## Understanding Pre- and Post-Event Execution

### Execution Timeline and Flow

Azure Update Manager supports executing automated actions at specific points in the update lifecycle:

1. **Pre-Events**:
   - Execute before the maintenance window begins
   - Run approximately 30-40 minutes before the scheduled update time
   - Allow for preparation tasks and environment validation
   - Can optionally cancel the update deployment if conditions aren't met

2. **Update Installation**:
   - Occurs during the defined maintenance window
   - Controlled by Azure Update Manager
   - Includes reboot operations if configured

3. **Post-Events**:
   - Execute after update installation completes
   - Run either within the maintenance window (if time remains) or outside it
   - Verify system state and perform cleanup operations
   - Complete final restoration of service

### Timing Considerations

Key timing aspects to understand for effective script automation:

1. **Pre-Event Scheduling**:
   - Must be created at least 40 minutes before maintenance window start
   - Shorter lead times result in automatic cancellation of the scheduled run
   - Pre-events execute outside the maintenance window timeframe

2. **Post-Event Execution**:
   - Begins immediately after update installation completes
   - May run outside the maintenance window if updates consume the entire window
   - Not delayed by reboots - executes post-reboot on Windows systems

3. **Overall Timeline Planning**:
   - Allow buffer time between events for system stabilization
   - Account for potential script execution delays
   - Consider time zone differences in global deployments

## Implementation Methods

### Event Grid Integration

Azure Update Manager uses Azure Event Grid for event handling:

1. **System Topic Creation**:
   - Event Grid system topic created for the maintenance configuration
   - Supports publishing pre/post events to subscribers
   - Enables decoupled architecture for event processing

2. **Event Types**:
   - Pre Maintenance Event - triggered before update deployment
   - Post Maintenance Event - triggered after update deployment
   - Each can be subscribed to independently

3. **Event Schema**:
   - Events follow Event Grid schema
   - Include metadata about maintenance configuration
   - Provide correlation IDs for tracking and logging

### Azure Automation Webhook Integration

One of the most common implementation methods uses Azure Automation runbooks with webhooks:

1. **Webhook Creation Process**:
   - Create PowerShell 7.2 runbook in Azure Automation account
   - Publish the runbook to make it available
   - Generate webhook URL for the runbook
   - Configure webhook as event destination

2. **Authentication Options**:
   - System-assigned managed identity
   - User-assigned managed identity
   - Appropriate permissions required for target resources

3. **Implementation Steps**:
   - Create and publish runbook with required logic
   - Create webhook for the runbook
   - Configure event subscription in maintenance configuration
   - Specify webhook as the endpoint

### Azure Functions Integration

Azure Functions provide a serverless option for event processing:

1. **Function Requirements**:
   - HTTP trigger function to receive Event Grid events
   - Authentication configured for Azure resources access
   - Appropriate error handling and logging

2. **Implementation Benefits**:
   - Serverless scaling based on event volume
   - Pay-per-execution pricing model
   - Native integration with Azure services
   - Support for multiple programming languages

## Common Automation Scenarios

### Virtual Machine Power Management

One of the most common use cases involves managing VM power states:

1. **Pre-Update VM Startup**:
   - Start powered-off VMs before update deployment
   - Verify VM is running and responsive
   - Allow sufficient warm-up time before updates begin
   - Record initial state for post-update restoration

2. **Post-Update VM Shutdown**:
   - Shut down VMs after successful update installation
   - Restore original power state (if tracking was implemented)
   - Implement cost optimization for non-production environments
   - Ensure clean shutdown to preserve system stability

3. **Implementation Considerations**:
   - Track initial VM state in shared storage or variable
   - Implement error handling for failed state transitions
   - Consider dependencies between systems
   - Apply appropriate tagging for selective power management

### Application Service Management

Managing application services ensures minimal disruption during updates:

1. **Pre-Update Application Handling**:
   - Gracefully stop application services
   - Drain connections and requests
   - Perform database checkpoints or backups
   - Put systems in maintenance mode

2. **Post-Update Application Restoration**:
   - Verify system state and prerequisites
   - Start application services in dependency order
   - Validate application health and functionality
   - Remove maintenance mode flags

3. **Implementation Patterns**:
   - Service-specific stop/start commands
   - Health check integration
   - Dependency mapping and sequencing
   - Rollback procedures for failures

### Backup and Recovery Procedures

Protecting data and ensuring recovery capability is critical during updates:

1. **Pre-Update Backup Actions**:
   - Create application-consistent snapshots
   - Perform database backups
   - Export configuration settings
   - Document current system state

2. **Post-Update Verification**:
   - Verify system integrity
   - Validate backup restoration capability
   - Test critical functionality
   - Update recovery documentation

3. **Implementation Considerations**:
   - Storage requirements for backups
   - Time requirements for backup operations
   - Verification of backup integrity
   - Clean-up of temporary backup artifacts

## Script Development Guidelines

### PowerShell Script Best Practices

Effective PowerShell scripts require careful planning and implementation:

1. **Authentication and Authorization**:
   - Use managed identities for secure authentication
   - Implement least-privilege access principles
   - Verify permissions before operations
   - Handle authentication failures gracefully

2. **Error Handling**:
   - Implement try-catch blocks for operations
   - Log detailed error information
   - Return meaningful error codes
   - Implement retry logic for transient failures

3. **Script Structure**:
   - Modular functions for reusability
   - Clear parameter definitions
   - Appropriate comments and documentation
   - Consistent logging patterns

4. **Performance Considerations**:
   - Optimize API calls to minimize throttling
   - Use parallel processing where appropriate
   - Implement timeout handling
   - Minimize external dependencies

### Receiving Event Data

Properly handling the event payload is crucial:

1. **Webhook Data Processing**:
   ```powershell
   param (
       [Parameter(Mandatory=$false)]
       [object] $WebhookData
   )

   # Convert the webhook JSON payload
   $notificationPayload = ConvertFrom-Json -InputObject $WebhookData.RequestBody

   # Extract the maintenance run ID for correlation
   $maintenanceRunId = $notificationPayload[0].data.CorrelationId
   ```

2. **Maintenance Information Extraction**:
   - Extract subscription information
   - Identify affected resources
   - Determine maintenance type and scope
   - Retrieve correlation identifiers

3. **Resource Targeting**:
   - Query Azure Resource Graph for target machines
   - Filter resources based on maintenance scope
   - Implement targeted actions based on resource properties
   - Handle missing or incomplete resource information

### Implementing Cancellation Logic

Pre-events can optionally cancel an update deployment:

1. **Cancellation Decision Logic**:
   - Verify system prerequisites
   - Check for blocking conditions
   - Validate environment readiness
   - Implement approval workflows if needed

2. **Cancellation Implementation**:
   - Make an API call to cancel the maintenance run
   - Provide clear cancellation reason
   - Log cancellation action and reason
   - Notify stakeholders of cancellation

3. **Post-Cancellation Cleanup**:
   - Restore systems to original state
   - Remove any temporary preparations
   - Update monitoring systems
   - Schedule retry if appropriate

## Advanced Implementation Patterns

### Staged Update Deployments

Implementing phased rollouts across environments:

1. **Multi-Stage Configuration**:
   - Development environment (Day 0)
   - Pre-production environment (Day 7)
   - Production environment (Day 14)

2. **Script Automation Approach**:
   - Create staged maintenance configurations
   - Use shared variables to track deployment success
   - Implement validation between stages
   - Carry approved updates through stages

3. **Implementation Example**:
   - Azure Automation runbook triggered after dev/test update cycle
   - Query successful updates from ARG
   - Create maintenance configurations for subsequent stages
   - Include only validated updates from previous stage

### Handling Complex Dependencies

Managing systems with interdependencies:

1. **Dependency Mapping**:
   - Document service dependencies
   - Identify startup/shutdown order
   - Map communication requirements
   - Determine validation checkpoints

2. **Orchestration Implementation**:
   - Create orchestration runbooks
   - Implement sequential execution
   - Build wait patterns for dependencies
   - Include validation between steps

3. **Fallback Procedures**:
   - Define criteria for execution continuation
   - Implement partial success handling
   - Create remediation procedures
   - Document manual intervention points

### Integration with Monitoring Systems

Enhancing visibility of update operations:

1. **Pre-Update Monitoring Adjustments**:
   - Temporarily adjust alert thresholds
   - Suppress known maintenance alerts
   - Create maintenance period annotations
   - Notify monitoring teams

2. **Post-Update Monitoring Restoration**:
   - Restore normal monitoring thresholds
   - Verify alert functionality
   - Create maintenance completion markers
   - Document unexpected behaviors

3. **Automated Analysis**:
   - Compare pre and post-update system metrics
   - Identify performance changes
   - Create update impact reports
   - Feed data into continuous improvement processes

## Troubleshooting and Optimization

### Common Issues and Resolutions

1. **Script Execution Failures**:
   - Verify authentication and permissions
   - Check for script syntax errors
   - Validate module dependencies
   - Review execution logs for errors

2. **Timing and Coordination Problems**:
   - Ensure sufficient lead time for pre-events (40+ minutes)
   - Verify timezone configurations
   - Check for scheduling conflicts
   - Implement appropriate wait conditions

3. **Resource Access Issues**:
   - Verify role assignments for managed identities
   - Check network connectivity to resources
   - Validate resource existence and state
   - Implement proper error handling for resource access

### Performance Optimization

1. **Script Execution Efficiency**:
   - Parallelize independent operations
   - Implement batch processing for multiple resources
   - Optimize API calls to reduce throttling
   - Remove unnecessary operations

2. **Resource Utilization**:
   - Monitor script resource consumption
   - Implement appropriate throttling
   - Balance parallel operations
   - Consider execution time impacts

### Maintenance and Governance

1. **Script Version Control**:
   - Implement source control for scripts
   - Document changes and versions
   - Test script changes before deployment
   - Maintain backward compatibility

2. **Access Control and Auditing**:
   - Implement least privilege for script execution
   - Log all script activities
   - Review access permissions regularly
   - Document approval workflows for changes

## Reference Implementations

### VM Power Management Example

The following example outlines a pre-update script for starting VMs:

```powershell
param (
    [Parameter(Mandatory=$false)]
    [object] $WebhookData
)

# Connect using managed identity
Connect-AzAccount -Identity

# Parse webhook data
$notificationPayload = ConvertFrom-Json -InputObject $WebhookData.RequestBody
$maintenanceRunId = $notificationPayload[0].data.CorrelationId

# Query target VMs using Resource Graph
$query = "Resources | where type =~ 'Microsoft.Compute/virtualMachines' | where tags.UpdateGroup == 'Group1'"
$machines = Search-AzGraph -Query $query

# Variable to track VMs that were started
$startedVMs = @()

foreach ($machine in $machines) {
    # Get current power state
    $vm = Get-AzVM -ResourceGroupName $machine.resourceGroup -Name $machine.name -Status
    $powerState = ($vm.Statuses | Where-Object Code -like "PowerState/*").Code -replace "PowerState/", ""
    
    if ($powerState -eq "deallocated") {
        # Start the VM
        Write-Output "Starting VM: $($machine.name)"
        Start-AzVM -ResourceGroupName $machine.resourceGroup -Name $machine.name
        $startedVMs += $machine.id
    }
}

# Store list of started VMs for post-update script
$automationAccountName = "YourAutomationAccount"
$resourceGroupName = "YourResourceGroup"
Set-AzAutomationVariable -Name "StartedVMs_$maintenanceRunId" -Value $startedVMs -Encrypted $false -AutomationAccountName $automationAccountName -ResourceGroupName $resourceGroupName
```

### Application Service Management Example

The following example outlines a pre-update script for stopping services:

```powershell
param (
    [Parameter(Mandatory=$false)]
    [object] $WebhookData
)

# Connect using managed identity
Connect-AzAccount -Identity

# Parse webhook data
$notificationPayload = ConvertFrom-Json -InputObject $WebhookData.RequestBody
$maintenanceRunId = $notificationPayload[0].data.CorrelationId

# Query target VMs
$query = "Resources | where type =~ 'Microsoft.Compute/virtualMachines' | where tags.AppRole == 'WebServer'"
$machines = Search-AzGraph -Query $query

foreach ($machine in $machines) {
    # Run command to stop services
    $scriptBlock = @"
    Stop-Service -Name 'W3SVC' -Force
    Stop-Service -Name 'AppPool' -Force
    Write-Output "Services stopped on $($machine.name)"
"@
    
    Invoke-AzVMRunCommand -ResourceGroupName $machine.resourceGroup -VMName $machine.name -CommandId 'RunPowerShellScript' -ScriptString $scriptBlock
}

Write-Output "Pre-update service stop completed for all web servers"
```

## Conclusion

Implementing pre- and post-update script automation enhances the update management process by ensuring proper preparation, validation, and restoration of systems during maintenance activities. By following the patterns and practices outlined in this document, organizations can minimize service disruption, enhance update reliability, and maintain system stability throughout the update lifecycle.

## References

- [Overview of Pre and Post Events in Azure Update Manager](https://learn.microsoft.com/en-us/azure/update-manager/pre-post-scripts-overview)
- [Create Pre and Post Events with Azure Automation Runbooks](https://learn.microsoft.com/en-us/azure/update-manager/tutorial-webhooks-using-runbooks)
- [Azure Event Grid Integration for Pre and Post Events](https://learn.microsoft.com/en-us/azure/automation/update-management/pre-post-scripts)
- [Azure Update Manager Documentation](https://learn.microsoft.com/en-us/azure/update-manager/overview)
