# ExpressRoute Troubleshooting Guide

This document provides comprehensive troubleshooting guidance for Azure ExpressRoute implementations, including diagnostic procedures, common issues, and resolution steps.

## Table of Contents
- [Diagnostic Tools and Approaches](#diagnostic-tools-and-approaches)
- [Circuit Provisioning Issues](#circuit-provisioning-issues)
- [Connectivity Problems](#connectivity-problems)
- [Routing Issues](#routing-issues)
- [Performance Concerns](#performance-concerns)
- [Gateway Challenges](#gateway-challenges)
- [Peering Configuration Problems](#peering-configuration-problems)
- [Monitoring and Alerting Best Practices](#monitoring-and-alerting-best-practices)
- [Escalation Procedures](#escalation-procedures)

## Diagnostic Tools and Approaches

### Azure Portal Diagnostics

#### ExpressRoute Circuit Metrics
1. Navigate to your ExpressRoute circuit in the Azure portal
2. Select **Metrics** from the left menu
3. Key metrics to monitor:
   - **BitsInPerSecond** and **BitsOutPerSecond** (bandwidth utilization)
   - **ArpAvailability** (layer 2 connectivity)
   - **BgpAvailability** (layer 3 connectivity)

#### Network Performance Monitor
1. Set up Network Performance Monitor in Azure Monitor
2. Configure ExpressRoute monitoring:
   - Add on-premises agents
   - Configure monitoring intervals
   - Set thresholds for alerts

### Command-Line Diagnostics

#### Azure CLI
```bash
# Check ExpressRoute circuit status
az network express-route list --output table

# Check circuit details
az network express-route show \
    --name MyExpressRouteCircuit \
    --resource-group MyResourceGroup

# Check BGP peer status
az network express-route list-route-tables \
    --path primary \
    --peering-name AzurePrivatePeering \
    --name MyExpressRouteCircuit \
    --resource-group MyResourceGroup \
    --query value

# Check advertised routes to on-premises
az network express-route list-route-tables-summary \
    --path primary \
    --peering-name AzurePrivatePeering \
    --name MyExpressRouteCircuit \
    --resource-group MyResourceGroup \
    --query value
```

#### PowerShell
```powershell
# Check ExpressRoute circuit status
Get-AzExpressRouteCircuit -Name "MyExpressRouteCircuit" -ResourceGroupName "MyResourceGroup"

# Check BGP peering status
Get-AzExpressRouteCircuitPeeringConfig -Name "AzurePrivatePeering" -ExpressRouteCircuit $circuit

# Check routes received from on-premises
Get-AzExpressRouteCircuitRouteTable -DevicePath "Primary" -ExpressRouteCircuitName "MyExpressRouteCircuit" -PeeringType "AzurePrivatePeering" -ResourceGroupName "MyResourceGroup"

# Check routes advertised to on-premises
Get-AzExpressRouteCircuitRouteTableSummary -DevicePath "Primary" -ExpressRouteCircuitName "MyExpressRouteCircuit" -PeeringType "AzurePrivatePeering" -ResourceGroupName "MyResourceGroup"
```

### On-Premises Router Diagnostics

#### Cisco IOS Commands
```
# Check BGP neighbor status
show ip bgp neighbors x.x.x.x summary

# Check received routes
show ip bgp neighbors x.x.x.x routes

# Check advertised routes
show ip bgp neighbors x.x.x.x advertised-routes

# Check interface status
show interface GigabitEthernet0/0.100 

# Verify ARP table
show arp
```

#### Juniper JunOS Commands
```
# Check BGP neighbor status
show bgp neighbor x.x.x.x

# Check received routes
show route receive-protocol bgp x.x.x.x

# Check advertised routes
show route advertising-protocol bgp x.x.x.x

# Check interface status
show interfaces xe-0/0/0.100 detail

# Verify ARP table
show arp
```

### Network Testing Tools

#### Basic Connectivity Testing
1. **Ping test**: Test basic IP connectivity
   ```
   ping 10.0.0.1
   ```

2. **Traceroute**: Verify path and identify hops
   ```
   tracert 10.0.0.1
   ```

3. **MTU testing**: Verify Maximum Transmission Unit
   ```
   ping 10.0.0.1 -f -l 1500
   ```

#### Advanced Testing
1. **iperf/ntttcp**: Measure actual bandwidth
   ```
   # On server side
   iperf -s
   
   # On client side
   iperf -c server_ip -t 30 -P 8
   ```

2. **Network Watcher packet capture**: Analyze traffic at detailed level
   - Configure in Azure portal
   - Filter for specific traffic types
   - Export captures for analysis

## Circuit Provisioning Issues

### Problem: Circuit Stuck in "Provisioning" State

#### Symptoms
- Circuit shows "Provisioning" status for more than 24 hours
- Service provider reports completion, but Azure doesn't reflect it
- Unable to configure peerings

#### Diagnostic Steps
1. Verify service key was provided correctly to the provider
2. Confirm provider has completed their configuration
3. Check for billing issues or quota limitations

#### Resolution
1. **Contact service provider**:
   - Verify configuration is complete on their side
   - Confirm correct service key was used
   - Request technical details of their configuration

2. **Azure support route**:
   - Open support ticket with ExpressRoute team
   - Provide circuit ID and service key
   - Share provider contact information

3. **Manual validation**:
   ```powershell
   # Check provider provisioning state
   $circuit = Get-AzExpressRouteCircuit -Name "MyExpressRouteCircuit" -ResourceGroupName "MyResourceGroup"
   $circuit.ServiceProviderProvisioningState
   ```

### Problem: Circuit Creation Fails

#### Symptoms
- Error message during circuit creation
- Circuit shows failed provisioning
- Unexpected subscription errors

#### Diagnostic Steps
1. Check subscription limits and quotas
2. Verify permissions of account creating the circuit
3. Confirm service provider availability in selected peering location

#### Resolution
1. **Address subscription limitations**:
   - Request quota increase if needed
   - Verify subscription is active and in good standing
   - Check for any policy restrictions

2. **Permissions correction**:
   - Ensure account has Network Contributor or higher permissions
   - Verify no custom RBAC policies are blocking operations

3. **Provider availability**:
   - Select different provider or peering location
   - Verify SKU and bandwidth options are available from provider

## Connectivity Problems

### Problem: No Connectivity Through Provisioned Circuit

#### Symptoms
- Circuit shows "Provisioned" but no traffic flows
- Virtual network gateway shows connected but no data transfer
- On-premises resources cannot reach Azure resources

#### Diagnostic Steps
1. Verify layer 2 connectivity (ARP)
   ```powershell
   Get-AzExpressRouteCircuitARPTable -ExpressRouteCircuitName "MyExpressRouteCircuit" -ResourceGroupName "MyResourceGroup" -PeeringLocation "SiliconValley" -DevicePath "Primary"
   ```

2. Check layer 3 connectivity (BGP)
   ```powershell
   Get-AzExpressRouteCircuitRouteTable -DevicePath "Primary" -ExpressRouteCircuitName "MyExpressRouteCircuit" -PeeringType "AzurePrivatePeering" -ResourceGroupName "MyResourceGroup"
   ```

3. Verify on-premises router configuration
   - Check BGP neighbor status
   - Confirm correct ASNs and IP addresses

#### Resolution
1. **Layer 2 connectivity issues**:
   - Verify VLAN configuration matches on both sides
   - Check physical port status on provider and customer equipment
   - Confirm correct MAC addresses in ARP table

2. **Layer 3 connectivity issues**:
   - Correct BGP configuration on on-premises routers
   - Verify MD5 authentication if used
   - Check for BGP session establishment

3. **Route advertisement issues**:
   - Verify routes are being advertised from on-premises
   - Check route filters or route policies
   - Confirm route limits are not exceeded

### Problem: Intermittent Connectivity

#### Symptoms
- Periodic drops in connectivity
- Inconsistent application performance
- BGP flapping observed in logs

#### Diagnostic Steps
1. Monitor BGP stability
   ```powershell
   # Set up diagnostic logging for BGP
   $circuit = Get-AzExpressRouteCircuit -Name "MyExpressRouteCircuit" -ResourceGroupName "MyResourceGroup"
   Set-AzDiagnosticSetting -ResourceId $circuit.Id -WorkspaceId $workspaceId -Enabled $true -Category "PeeringRouteLog"
   ```

2. Check for bandwidth saturation
   - Review bandwidth metrics in Azure portal
   - Look for patterns in usage that correlate with drops

3. Verify provider service health
   - Check for maintenance events
   - Confirm SLA compliance from provider

#### Resolution
1. **BGP stability improvements**:
   - Increase BGP keepalive and hold timers
   - Implement route dampening if appropriate
   - Check for MTU mismatches

2. **Bandwidth management**:
   - Implement QoS for critical traffic
   - Consider circuit upgrade if consistently near capacity
   - Distribute load across multiple circuits if available

3. **Physical path improvements**:
   - Request provider investigation of physical path
   - Move to redundant circuits with different paths
   - Implement packet capture to identify pattern of failures

## Routing Issues

### Problem: Routes Not Being Advertised or Received

#### Symptoms
- Missing routes in route tables
- Asymmetric routing observed
- Some resources unreachable over ExpressRoute

#### Diagnostic Steps
1. Check advertised routes
   ```powershell
   Get-AzExpressRouteCircuitRouteTableSummary -DevicePath "Primary" -ExpressRouteCircuitName "MyExpressRouteCircuit" -PeeringType "AzurePrivatePeering" -ResourceGroupName "MyResourceGroup"
   ```

2. Verify route filtering
   - Check for route filters on Azure side
   - Confirm prefix lists on on-premises routers

3. Check for route limits
   - Private peering: 4,000 routes per BGP session (standard)
   - Microsoft peering: 200 routes per BGP session (standard)

#### Resolution
1. **Missing route advertisement**:
   - Add missing networks to BGP advertisements
   - Check for aggregation that might be hiding specific routes
   - Verify network existence in source routing tables

2. **Route filtering issues**:
   - Adjust route filters to allow necessary prefixes
   - Update prefix lists on on-premises routers
   - Check for route maps affecting advertisements

3. **Route limit concerns**:
   - Aggregate routes where possible
   - Consider Premium SKU for higher limits
   - Split route advertisements across multiple peerings

### Problem: Asymmetric Routing

#### Symptoms
- Traffic flows through different paths in different directions
- Intermittent application timeouts
- Firewall connection tracking issues

#### Diagnostic Steps
1. Compare routes on both sides
   ```powershell
   # Azure side routes
   Get-AzExpressRouteCircuitRouteTable -DevicePath "Primary" -ExpressRouteCircuitName "MyExpressRouteCircuit" -PeeringType "AzurePrivatePeering" -ResourceGroupName "MyResourceGroup"
   
   # On-premises router: check received routes
   # Cisco: show ip bgp
   # Juniper: show route receive-protocol bgp x.x.x.x
   ```

2. Check BGP attributes
   - Look for different AS path lengths
   - Verify local preference and weight settings

3. Trace actual packet paths in both directions

#### Resolution
1. **BGP attribute adjustment**:
   - Modify AS path prepending to influence path selection
   - Adjust local preference or weight on preferred paths
   - Use BGP communities to control routing policies

2. **Route consistency**:
   - Ensure similar route advertisement in both directions
   - Use consistent route summarization
   - Apply consistent filtering policies

3. **Network design improvements**:
   - Consider redesigning for symmetric routing where critical
   - Implement stateless firewalls for asymmetric paths
   - Document and monitor expected asymmetric routes

### Problem: Route Advertisement Limits Exceeded

#### Symptoms
- BGP session instability
- Missing routes in advertisement
- Error messages about prefix limits

#### Diagnostic Steps
1. Count routes being advertised
   ```powershell
   $routes = Get-AzExpressRouteCircuitRouteTable -DevicePath "Primary" -ExpressRouteCircuitName "MyExpressRouteCircuit" -PeeringType "AzurePrivatePeering" -ResourceGroupName "MyResourceGroup"
   $routes.value.Count
   ```

2. Check circuit SKU and limits
   - Standard: 4,000 routes for private peering, 200 for Microsoft peering
   - Premium: 10,000 routes for private peering, 200 for Microsoft peering

3. Review route sources and necessity

#### Resolution
1. **Route aggregation**:
   - Implement CIDR aggregation where possible
   - Use summary routes instead of individual prefixes
   - Consolidate non-contiguous routes where feasible

2. **SKU upgrade**:
   - Upgrade to Premium SKU for higher route limits
   - Change from Microsoft peering to private peering where applicable

3. **Route filtering optimization**:
   - Only advertise necessary routes
   - Implement more specific filters
   - Use default routes where appropriate

## Performance Concerns

### Problem: Bandwidth Limitations

#### Symptoms
- Slow file transfers
- Application timeouts during peak usage
- Bandwidth metrics showing consistent saturation

#### Diagnostic Steps
1. Monitor bandwidth utilization
   ```powershell
   # Set up bandwidth metrics
   $circuit = Get-AzExpressRouteCircuit -Name "MyExpressRouteCircuit" -ResourceGroupName "MyResourceGroup"
   
   # Check metrics
   Get-AzMetric -ResourceId $circuit.Id -MetricName "BitsInPerSecond" -AggregationType Average -StartTime (Get-Date).AddDays(-1) -EndTime (Get-Date)
   ```

2. Analyze traffic patterns
   - Identify peak usage periods
   - Determine types of traffic consuming bandwidth
   - Check for abnormal or unexpected traffic

3. Performance testing
   - Run iperf or similar tools to measure actual throughput
   - Compare with expected circuit capacity
   - Test from different source/destination pairs

#### Resolution
1. **Circuit upgrade**:
   - Increase circuit bandwidth with provider
   - Consider ExpressRoute Direct for higher bandwidths
   - Add additional circuits for load distribution

2. **Traffic optimization**:
   - Implement QoS policies for critical traffic
   - Schedule large transfers during off-peak hours
   - Use compression for appropriate traffic types

3. **Architecture improvements**:
   - Distribute workloads across multiple regions
   - Leverage Azure CDN for content delivery
   - Consider direct internet access for non-critical traffic

### Problem: High Latency

#### Symptoms
- Increased application response times
- Voice/video quality issues
- Inconsistent performance

#### Diagnostic Steps
1. Measure latency from different locations
   ```bash
   # Use ping to measure round-trip time
   ping -c 20 azure-resource-ip
   
   # Use traceroute to identify path
   traceroute azure-resource-ip
   ```

2. Check for network congestion
   - Review bandwidth utilization metrics
   - Look for correlation between high utilization and latency
   - Test during different times of day

3. Verify ExpressRoute path
   - Confirm traffic is using ExpressRoute and not internet
   - Check for suboptimal routing
   - Verify no routing loops exist

#### Resolution
1. **Provider engagement**:
   - Work with ExpressRoute provider to troubleshoot path issues
   - Request provider circuit testing
   - Consider alternative peering location closer to users

2. **Network optimization**:
   - Implement ExpressRoute FastPath to bypass gateway
   - Use TCP optimization techniques for long-distance connections
   - Consider Microsoft QoS for prioritizing latency-sensitive traffic

3. **Application adjustments**:
   - Modify application timeouts to accommodate latency
   - Implement asynchronous communication patterns
   - Use caching strategies where appropriate

### Problem: Packet Loss

#### Symptoms
- Intermittent connection drops
- Poor application performance
- TCP retransmissions observed in packet captures

#### Diagnostic Steps
1. Measure packet loss
   ```bash
   # Use ping to measure packet loss
   ping -c 100 azure-resource-ip
   
   # Check for interface errors on routers
   # Cisco: show interface GigabitEthernet0/0 | include error
   ```

2. Monitor for microbursts
   - Use router buffer monitoring
   - Check for packet drops on interfaces
   - Review QoS queue drops

3. End-to-end path analysis
   - Test each segment of the path independently
   - Analyze MTU across the path
   - Check for equipment issues

#### Resolution
1. **Physical layer improvements**:
   - Request circuit quality testing from provider
   - Check and replace any suspect cabling
   - Verify equipment health and capacity

2. **Traffic management**:
   - Implement traffic shaping to prevent microbursts
   - Configure QoS to protect sensitive traffic
   - Use TCP optimization for high-throughput flows

3. **MTU optimization**:
   - Set consistent MTU across path (typically 1500 bytes)
   - Enable jumbo frames if supported end-to-end
   - Consider TCP MSS clamping if needed

## Gateway Challenges

### Problem: Gateway Creation Failure

#### Symptoms
- Error during gateway deployment
- Gateway stuck in "Updating" state
- Resource creation timeouts

#### Diagnostic Steps
1. Check gateway subnet
   - Verify /27 or larger subnet size
   - Confirm no other resources in gateway subnet
   - Check for conflicting NSGs or UDRs

2. Review quota and limits
   - Verify Virtual Network Gateway quota not exceeded
   - Check Public IP availability
   - Confirm subscription state is active

3. Check region resource availability
   - Verify gateway resources available in target region
   - Look for Azure service health notifications

#### Resolution
1. **Subnet configuration**:
   - Recreate gateway subnet with correct size
   - Remove any NSGs or UDRs from gateway subnet
   - Ensure address space doesn't overlap with other networks

2. **Resource allocation**:
   - Request quota increase if needed
   - Try different gateway SKU if resource constraints exist
   - Deploy in alternative region if persistent issues

3. **Deployment approach**:
   - Use ARM templates for consistent deployments
   - Implement proper error handling and retry logic
   - Consider staged deployment of complex configurations

### Problem: Gateway Connection Issues

#### Symptoms
- Gateway shows as "Connected" but no traffic flows
- Intermittent disconnections of the gateway
- High CPU or memory usage on gateway

#### Diagnostic Steps
1. Check gateway health
   ```powershell
   # Check connection state
   Get-AzVirtualNetworkGatewayConnection -Name "MyConnection" -ResourceGroupName "MyResourceGroup" | Select ConnectionStatus, EgressBytesTransferred, IngressBytesTransferred
   ```

2. Review gateway logs
   - Enable diagnostic logging for gateway
   - Check for error messages
   - Look for resource constraints

3. Verify gateway configuration
   - Confirm gateway matches ExpressRoute requirements
   - Check for recent changes or updates
   - Verify gateway SKU is appropriate for load

#### Resolution
1. **Gateway resizing**:
   - Upgrade gateway SKU for higher performance
   - Consider zone-redundant gateway SKUs for reliability
   - Use FastPath to bypass gateway for performance

2. **Gateway maintenance**:
   - Schedule gateway updates during maintenance windows
   - Monitor gateway health proactively
   - Consider active-active configuration for redundancy

3. **Configuration optimization**:
   - Implement proper route filtering
   - Validate BGP configuration between gateway and on-premises
   - Consider dedicated gateway for critical circuits

### Problem: Gateway Scalability Limitations

#### Symptoms
- Performance degradation with increasing load
- Connection limits reached
- Throughput below circuit capacity

#### Diagnostic Steps
1. Monitor gateway metrics
   ```powershell
   # Check gateway metrics
   Get-AzMetric -ResourceId $gatewayId -MetricName "AverageBandwidth" -AggregationType Average -StartTime (Get-Date).AddDays(-7) -EndTime (Get-Date) -TimeGrain 01:00:00
   ```

2. Analyze traffic patterns
   - Review peak vs. average usage
   - Identify traffic types causing bottlenecks
   - Check for gateway CPU/memory constraints

3. Verify gateway SKU limitations
   - Check documentation for SKU-specific limits
   - Compare against actual usage
   - Evaluate gateway processing overhead

#### Resolution
1. **Gateway upgrade**:
   - Scale up to higher performance SKU
   - Implement active-active configuration
   - Consider UltraPerformance or ErGw3AZ SKUs

2. **Architectural improvements**:
   - Implement ExpressRoute FastPath to bypass gateway
   - Distribute load across multiple gateways
   - Segment traffic based on criticality

3. **Traffic optimization**:
   - Prioritize critical traffic
   - Offload non-critical traffic to other paths
   - Consider regional proximity for latency-sensitive workloads

## Peering Configuration Problems

### Problem: Private Peering Configuration Issues

#### Symptoms
- Unable to establish BGP session
- Routing inconsistencies between Azure and on-premises
- Connectivity limited to subset of resources

#### Diagnostic Steps
1. Verify peering configuration
   ```powershell
   # Check peering configuration
   Get-AzExpressRouteCircuitPeeringConfig -Name "AzurePrivatePeering" -ExpressRouteCircuit $circuit
   ```

2. Check BGP session status
   - Verify BGP is enabled on both sides
   - Confirm ASN configuration matches
   - Check IP addressing for peering

3. Validate route advertisement
   - Verify on-premises networks being advertised
   - Check Azure VNet address spaces being advertised
   - Confirm no conflicting route advertisements

#### Resolution
1. **Peering reconfiguration**:
   - Correct mismatched BGP parameters
   - Update peer IP addresses if needed
   - Reconfigure VLAN IDs to match provider settings

2. **BGP optimization**:
   - Tune BGP timers for stability
   - Implement consistent route filtering
   - Verify MD5 authentication if used

3. **Connectivity testing**:
   - Test basic connectivity after configuration
   - Verify route propagation
   - Confirm appropriate routes in routing tables

### Problem: Microsoft Peering Configuration Issues

#### Symptoms
- Unable to access Microsoft 365 or other Microsoft services
- Public services intermittently available
- BGP session established but services unreachable

#### Diagnostic Steps
1. Verify Microsoft peering configuration
   ```powershell
   # Check Microsoft peering configuration
   Get-AzExpressRouteCircuitPeeringConfig -Name "MicrosoftPeering" -ExpressRouteCircuit $circuit
   
   # Check route filter association
   $peering = Get-AzExpressRouteCircuitPeeringConfig -Name "MicrosoftPeering" -ExpressRouteCircuit $circuit
   $peering.RouteFilter
   ```

2. Check route filter configuration
   - Verify appropriate BGP communities enabled
   - Confirm route filter rules allow required services
   - Check for restrictive filtering

3. Validate public IP addressing
   - Confirm public IP addresses registered with Microsoft
   - Verify ownership validation completed
   - Check for NAT configuration issues

#### Resolution
1. **Route filter correction**:
   - Update route filter to include necessary service communities
   - Associate route filter with Microsoft peering
   - Verify route propagation after filter changes

2. **Public IP registration**:
   - Complete proper IP registration process
   - Provide LOA/SOA documentation if required
   - Validate IP ownership through portal process

3. **NAT configuration**:
   - Implement correct NAT for Microsoft peering
   - Ensure consistent NAT across redundant circuits
   - Configure appropriate NAT pool sizes

### Problem: Global Reach Configuration Issues

#### Symptoms
- Unable to connect between ExpressRoute-connected sites
- Inconsistent connectivity between regions
- BGP routes not propagating between circuits

#### Diagnostic Steps
1. Verify Global Reach eligibility
   - Confirm Premium SKU on all circuits
   - Verify circuits in different peering locations
   - Check for regional Global Reach availability

2. Check Global Reach configuration
   ```powershell
   # Get all circuits
   $circuit1 = Get-AzExpressRouteCircuit -Name "Circuit1" -ResourceGroupName "ResourceGroup1"
   $circuit2 = Get-AzExpressRouteCircuit -Name "Circuit2" -ResourceGroupName "ResourceGroup2"
   
   # Check Global Reach connections
   Get-AzExpressRouteCircuitPeeringConfig -Name "AzurePrivatePeering" -ExpressRouteCircuit $circuit1 | Select PeerRoutingPolicies
   ```

3. Validate routing between sites
   - Check BGP advertisements from each site
   - Verify end-to-end path
   - Look for route filtering affecting propagation

#### Resolution
1. **Global Reach enablement**:
   - Upgrade circuits to Premium SKU if needed
   - Enable Global Reach between appropriate circuits
   - Configure with correct address prefixes

2. **Routing policy adjustment**:
   - Modify route filtering to allow appropriate prefixes
   - Ensure consistent BGP communities
   - Check for route suppression or aggregation

3. **Connectivity testing**:
   - Test end-to-end connectivity between sites
   - Verify routing table entries
   - Trace actual packet paths

## Monitoring and Alerting Best Practices

### Proactive Monitoring

#### Azure Monitor Configuration
1. Set up diagnostic settings for ExpressRoute
   ```powershell
   # Enable diagnostics
   $circuit = Get-AzExpressRouteCircuit -Name "MyExpressRouteCircuit" -ResourceGroupName "MyResourceGroup"
   
   # Send logs to Log Analytics
   Set-AzDiagnosticSetting -ResourceId $circuit.Id -WorkspaceId $workspaceId -Enabled $true -Category "PeeringRouteLog","RouteLog"
   ```

2. Create custom dashboards
   - Bandwidth utilization trends
   - BGP peer status
   - Circuit availability

3. Configure Network Performance Monitor
   - Set up ExpressRoute monitoring
   - Configure performance baselines
   - Monitor latency and packet loss

#### Alert Configuration

1. Bandwidth utilization alerts
   ```powershell
   # Create alert rule for bandwidth
   New-AzMetricAlertRuleV2 -Name "ExpressRoute-Bandwidth-Alert" -ResourceGroupName "MyResourceGroup" `
       -TargetResourceId $circuit.Id -TargetResourceType "Microsoft.Network/expressRouteCircuits" `
       -Condition @{metricName="BitsInPerSecond"; dimensions=""; operator="GreaterThan"; threshold=700000000; timeAggregation="Average"} `
       -Frequency 00:05:00 -WindowSize 00:15:00 -ActionGroupId $actionGroupId
   ```

2. BGP availability alerts
   - Alert on BGP peer down events
   - Set thresholds for BGP flapping
   - Configure time windows appropriate for recovery

3. Circuit health alerts
   - Circuit state changes
   - Provider-side events
   - Physical path issues

### Log Analytics Queries

#### Performance Monitoring
```kusto
// Bandwidth Utilization Query
AzureMetrics
| where ResourceProvider == "MICROSOFT.NETWORK" and ResourceType == "EXPRESSROUTECIRCUITS"
| where ResourceId contains "MyExpressRouteCircuit"
| where MetricName == "BitsInPerSecond" or MetricName == "BitsOutPerSecond"
| summarize AggBits = avg(Average) by bin(TimeGenerated, 1h), MetricName
| render timechart

// BGP Availability Query
AzureMetrics
| where ResourceProvider == "MICROSOFT.NETWORK" and ResourceType == "EXPRESSROUTECIRCUITS"
| where ResourceId contains "MyExpressRouteCircuit"
| where MetricName == "BgpAvailability"
| summarize AvgAvailability = avg(Average) by bin(TimeGenerated, 1h)
| render timechart
```

#### Route Change Analysis
```kusto
// Route change detection
AzureDiagnostics
| where ResourceType == "EXPRESSROUTECIRCUITS" 
| where Category == "PeeringRouteLog"
| where OperationName == "PeerRouteUpdate"
| extend prefix = tostring(split(Message, " ")[0])
| summarize count() by prefix, TimeGenerated
| order by TimeGenerated desc
```

#### Connectivity Problem Detection
```kusto
// Detect connection drops
AzureDiagnostics
| where ResourceType == "EXPRESSROUTECIRCUITS"
| where OperationName == "BGPConnectivityEvent"
| where Message contains "disconnected"
| project TimeGenerated, Resource, Message
| order by TimeGenerated desc

// Correlate with bandwidth spikes
let disconnects = AzureDiagnostics
| where ResourceType == "EXPRESSROUTECIRCUITS"
| where OperationName == "BGPConnectivityEvent"
| where Message contains "disconnected"
| project DisconnectTime = TimeGenerated, Resource;
let bandwidth = AzureMetrics
| where ResourceProvider == "MICROSOFT.NETWORK" and ResourceType == "EXPRESSROUTECIRCUITS"
| where MetricName == "BitsInPerSecond"
| project BandwidthTime = TimeGenerated, Resource = ResourceId, Bits = Average;
disconnects
| join kind=inner (bandwidth) on Resource
| where abs(datetime_diff('minute', DisconnectTime, BandwidthTime)) < 5
| project DisconnectTime, Resource, BandwidthTime, Bits
| order by DisconnectTime desc
```

### Automation Runbooks

#### Health Check Runbook
```powershell
# Sample health check runbook
workflow ExpressRouteHealthCheck {
    param (
        [Parameter(Mandatory=$true)]
        [string]$CircuitName,
        
        [Parameter(Mandatory=$true)]
        [string]$ResourceGroupName
    )
    
    # Connect to Azure
    $connection = Get-AutomationConnection -Name "AzureRunAsConnection"
    Connect-AzAccount -ServicePrincipal -Tenant $connection.TenantId -ApplicationId $connection.ApplicationId -CertificateThumbprint $connection.CertificateThumbprint
    
    # Get circuit details
    $circuit = Get-AzExpressRouteCircuit -Name $CircuitName -ResourceGroupName $ResourceGroupName
    
    # Check circuit provisioning state
    if ($circuit.CircuitProvisioningState -ne "Enabled") {
        Write-Output "Circuit $CircuitName is not enabled: $($circuit.CircuitProvisioningState)"
        New-AzAlertRule -Name "CircuitNotEnabled" -Description "Circuit is not in enabled state" -ResourceGroupName $ResourceGroupName
    }
    
    # Check service provider provisioning state
    if ($circuit.ServiceProviderProvisioningState -ne "Provisioned") {
        Write-Output "Provider provisioning incomplete: $($circuit.ServiceProviderProvisioningState)"
        New-AzAlertRule -Name "ProviderNotProvisioned" -Description "Provider provisioning incomplete" -ResourceGroupName $ResourceGroupName
    }
    
    # Check private peering
    $privatePeering = Get-AzExpressRouteCircuitPeeringConfig -Name "AzurePrivatePeering" -ExpressRouteCircuit $circuit
    if ($privatePeering.State -ne "Enabled") {
        Write-Output "Private peering not enabled: $($privatePeering.State)"
        New-AzAlertRule -Name "PeeringNotEnabled" -Description "Private peering not enabled" -ResourceGroupName $ResourceGroupName
    }
    
    # Check BGP state
    try {
        $routeTable = Get-AzExpressRouteCircuitRouteTable -DevicePath "Primary" -ExpressRouteCircuitName $CircuitName -PeeringType "AzurePrivatePeering" -ResourceGroupName $ResourceGroupName
        if ($routeTable.Count -eq 0) {
            Write-Output "No routes received from on-premises"
            New-AzAlertRule -Name "NoRoutesReceived" -Description "No routes received from on-premises" -ResourceGroupName $ResourceGroupName
        }
    }
    catch {
        Write-Output "Error checking BGP state: $_"
        New-AzAlertRule -Name "BGPCheckError" -Description "Error checking BGP state" -ResourceGroupName $ResourceGroupName
    }
}
```

## Escalation Procedures

### When to Escalate

#### Provider Escalation Triggers
- Circuit shows "Provisioning" for more than 48 hours
- Provider confirmed configuration but Azure doesn't reflect it
- Provider claims Azure-side issue
- Circuit shows degraded performance despite provider confirmation

#### Microsoft Escalation Triggers
- ExpressRoute gateway deployment fails repeatedly
- BGP sessions fail to establish despite correct configuration
- Unexplained route filtering or advertisement issues
- Consistent latency or packet loss through Azure infrastructure

### Escalation Process

#### Service Provider Escalation
1. **Tier 1 Support**:
   - Open standard support ticket with provider
   - Provide circuit service key and details
   - Request confirmation of circuit provisioning

2. **Tier 2 Escalation**:
   - Escalate after 4 hours without response
   - Request support manager involvement
   - Provide business impact statement

3. **Account Manager Involvement**:
   - Engage account manager after 8 hours of Tier 2
   - Request expedited troubleshooting
   - Establish regular update cadence

#### Microsoft Escalation
1. **Technical Support**:
   - Open Azure support ticket (Severity based on impact)
   - Provide circuit ID, gateway details
   - Include diagnostic logs and steps taken

2. **Support Management**:
   - Request case escalation after SLA breach
   - Ask for escalation manager contact
   - Provide updated impact statement

3. **Executive Escalation**:
   - Reserved for critical business impact
   - Engage Microsoft account team
   - Provide executive impact statement

### Required Information for Tickets

#### Technical Details
- ExpressRoute circuit service key
- Azure subscription ID
- Resource group names
- BGP ASNs and IP addresses
- Network topology diagram
- Circuit SKU and bandwidth
- Diagnostic logs from Azure and on-premises

#### Business Impact
- Number of affected users
- Revenue impact per hour
- Compliance or regulatory concerns
- Dependent critical systems affected
- Public-facing service disruption details

#### Documentation Requirements
- Timeline of issue and troubleshooting steps
- Screenshots of relevant metrics or errors
- Previous case references if recurring
- Change management records for recent changes
