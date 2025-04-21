# Hub and Spoke Troubleshooting Guide

This guide addresses common issues encountered when implementing and managing Hub and Spoke network architectures in Azure, along with proven resolution steps.

## Connectivity Issues

### Problem: Spoke to Spoke Communication Failure

**Symptoms:**
- VMs in different spoke VNets cannot communicate
- Ping or TCP connections time out between spoke resources
- Traffic never reaches destination spoke

**Possible Causes:**
1. Missing or incorrect route tables
2. Firewall rules blocking traffic
3. VNet peering misconfiguration
4. NSG blocking traffic

**Troubleshooting Steps:**

1. **Verify VNet Peering Configuration:**
   ```powershell
   # Check hub to spoke peering status
   Get-AzVirtualNetworkPeering -ResourceGroupName "hub-rg" -VirtualNetworkName "hub-vnet"
   
   # Check spoke to hub peering status
   Get-AzVirtualNetworkPeering -ResourceGroupName "spoke-rg" -VirtualNetworkName "spoke-vnet"
   ```
   - Confirm `PeeringState` is "Connected"
   - Verify `AllowForwardedTraffic` is True
   - For the spoke, verify `UseRemoteGateways` is True if using hub gateways

2. **Check User-Defined Routes (UDRs):**
   ```powershell
   # Get route table applied to spoke subnet
   Get-AzRouteTable -ResourceGroupName "spoke-rg" -Name "spoke-routes"
   ```
   - Verify routes point to the Azure Firewall or NVA in the hub
   - Ensure destination prefixes cover the target spoke address space

3. **Validate Firewall Rules:**
   ```powershell
   # Check Azure Firewall rules
   Get-AzFirewall -Name "hub-firewall" -ResourceGroupName "hub-rg"
   ```
   - Look for network rules allowing communication between spoke CIDR ranges
   - Check firewall logs for denied traffic

4. **Check NSG Rules:**
   ```powershell
   # Get NSG applied to spoke subnet
   Get-AzNetworkSecurityGroup -ResourceGroupName "spoke-rg" -Name "spoke-nsg"
   ```
   - Verify no rules are blocking inter-spoke traffic
   - Check NSG flow logs for denied packets

5. **Test with Network Watcher:**
   ```powershell
   # Use Network Watcher to test connectivity
   Test-AzNetworkWatcherConnectivity -NetworkWatcherName "NetworkWatcher_eastus" `
     -ResourceGroupName "NetworkWatcherRG" `
     -SourceId $sourceVMId `
     -DestinationId $destVMId `
     -DestinationPort 3389
   ```

**Resolution:**
- Add or correct UDRs to route spoke-to-spoke traffic through the hub firewall
- Add firewall rules to allow traffic between spoke CIDRs
- Ensure NSGs allow required communication
- Verify peering configuration has correct settings enabled

### Problem: On-Premises to Spoke Connectivity Failure

**Symptoms:**
- Resources in spoke VNets cannot be reached from on-premises
- On-premises resources cannot be reached from spoke VNets
- Intermittent connectivity between on-premises and spokes

**Possible Causes:**
1. Gateway Transit not enabled
2. BGP route propagation issues
3. On-premises firewall blocking traffic
4. Asymmetric routing

**Troubleshooting Steps:**

1. **Verify Gateway Transit Settings:**
   ```powershell
   # Check hub to spoke peering
   $hubPeering = Get-AzVirtualNetworkPeering -ResourceGroupName "hub-rg" `
     -VirtualNetworkName "hub-vnet" -Name "hub-to-spoke"
   $hubPeering.AllowGatewayTransit
   
   # Check spoke to hub peering
   $spokePeering = Get-AzVirtualNetworkPeering -ResourceGroupName "spoke-rg" `
     -VirtualNetworkName "spoke-vnet" -Name "spoke-to-hub"
   $spokePeering.UseRemoteGateways
   ```
   - `AllowGatewayTransit` should be True on hub peering
   - `UseRemoteGateways` should be True on spoke peering

2. **Check BGP Route Propagation:**
   ```powershell
   # Get the VPN or ExpressRoute gateway
   $gw = Get-AzVirtualNetworkGateway -ResourceGroupName "hub-rg" -Name "hub-gateway"
   
   # Check BGP peer status
   Get-AzVirtualNetworkGatewayBGPPeerStatus -VirtualNetworkGatewayName $gw.Name `
     -ResourceGroupName "hub-rg"
   ```
   - Verify BGP peers are established
   - Check learned routes include spoke address ranges

3. **Examine Effective Routes:**
   ```powershell
   # Get NIC of a VM in the spoke
   $nic = Get-AzNetworkInterface -ResourceGroupName "spoke-rg" -Name "spoke-vm-nic"
   
   # Get effective routes
   Get-AzEffectiveRouteTable -NetworkInterfaceId $nic.Id
   ```
   - Verify routes exist for on-premises address ranges
   - Confirm next hop type is VirtualNetworkGateway

4. **Check Gateway Connection Status:**
   ```powershell
   # Check VPN connection status
   Get-AzVirtualNetworkGatewayConnection -ResourceGroupName "hub-rg" -Name "hub-to-onprem"
   ```
   - Verify `ConnectionStatus` is "Connected"
   - Check data flowing in both directions

**Resolution:**
- Enable gateway transit on hub VNet peering
- Enable "Use Remote Gateways" on spoke VNet peering
- Ensure on-premises firewall allows traffic to/from Azure spoke address ranges
- Verify BGP is propagating routes correctly
- Implement consistent routing in both directions

## Routing Problems

### Problem: Asymmetric Routing

**Symptoms:**
- Traffic flows in one direction but not the other
- Connections established but timeouts during data transfer
- TCP resets on established connections

**Possible Causes:**
1. Inconsistent UDRs between source and destination
2. Firewall rules allowing traffic in only one direction
3. Different paths for outbound vs. inbound traffic
4. BGP route priority issues

**Troubleshooting Steps:**

1. **Map the Expected Path:**
   - Draw a diagram of expected traffic flow in both directions
   - Identify all potential routing points (UDRs, firewalls, gateways)

2. **Check Route Tables for Consistency:**
   ```powershell
   # Get route tables for source subnet
   $srcRT = Get-AzRouteTable -ResourceGroupName "src-rg" -Name "src-routes"
   
   # Get route tables for destination subnet
   $dstRT = Get-AzRouteTable -ResourceGroupName "dst-rg" -Name "dst-routes"
   ```
   - Ensure consistent return paths in both directions
   - Verify no overlapping or conflicting routes

3. **Use Network Watcher Packet Capture:**
   ```powershell
   # Start packet capture on source VM
   $srcPC = New-AzNetworkWatcherPacketCapture -NetworkWatcher $networkWatcher `
     -TargetVirtualMachineId $srcVMId -PacketCaptureName "src-capture"
   
   # Start packet capture on destination VM
   $dstPC = New-AzNetworkWatcherPacketCapture -NetworkWatcher $networkWatcher `
     -TargetVirtualMachineId $dstVMId -PacketCaptureName "dst-capture"
   ```
   - Analyze captured packets to identify where return traffic is failing

4. **Verify Stateful Inspection:**
   - Check if traffic passes through stateful inspection devices (firewalls)
   - Ensure firewall state tables allow return traffic

**Resolution:**
- Implement consistent UDRs for bidirectional traffic
- Configure firewall rules for both directions if using different paths
- Consider simplifying routing design to eliminate asymmetry
- Use identical paths for traffic in both directions when possible

### Problem: Route Propagation Delays

**Symptoms:**
- New spokes temporarily unreachable after deployment
- Route changes take significant time to apply
- Intermittent connectivity after configuration changes

**Possible Causes:**
1. BGP propagation delays
2. Azure control plane propagation time
3. DNS resolution issues
4. Cached routes in OS or applications

**Troubleshooting Steps:**

1. **Verify BGP Route Propagation:**
   ```powershell
   # Check BGP learned routes
   Get-AzVirtualNetworkGatewayLearnedRoute -ResourceGroupName "hub-rg" `
     -VirtualNetworkGatewayName "hub-gateway"
   ```
   - Confirm new routes are present in the BGP table
   - Note the timestamps of learned routes

2. **Check Route Table Updates:**
   ```powershell
   # Check effective routes on VM NIC
   Get-AzEffectiveRouteTable -NetworkInterfaceId $nic.Id
   ```
   - Verify routes are updated in the VM's effective route table

3. **Test with Simple Traffic:**
   - Use ICMP (ping) as basic reachability test
   - Use TCP ports known to be allowed for further testing

**Resolution:**
- Allow sufficient time for BGP routes to propagate (can take 5-15 minutes)
- Consider static routes for critical paths requiring faster convergence
- Implement monitoring to detect route propagation completion
- For DNS-related issues, lower TTL values for rapid changes

## Performance Issues

### Problem: Bandwidth Bottlenecks

**Symptoms:**
- High latency between spokes or to on-premises
- Throughput lower than expected
- Increasing transfer times during peak usage

**Possible Causes:**
1. Undersized gateway or firewall SKUs
- Azure Firewall reaching throughput limits
- Gateway size constraining bandwidth
- Resource contention on NVAs

**Troubleshooting Steps:**

1. **Monitor Gateway Metrics:**
   ```powershell
   # Get gateway metrics
   Get-AzMetric -ResourceId $gateway.Id -MetricName "AverageBandwidth" `
     -StartTime $startTime -EndTime $endTime -TimeGrain 00:05:00
   ```
   - Check utilization patterns and peak usage
   - Compare against SKU limits

2. **Check Firewall Metrics:**
   ```powershell
   # Get firewall metrics
   Get-AzMetric -ResourceId $firewall.Id -MetricName "Throughput" `
     -StartTime $startTime -EndTime $endTime -TimeGrain 00:05:00
   ```
   - Monitor SNAT port utilization
   - Check throughput against limits

3. **Analyze Traffic Patterns:**
   - Use Network Watcher Flow Logs to identify heavy traffic flows
   - Determine top talkers and traffic patterns

**Resolution:**
- Upgrade gateway or firewall SKUs for higher throughput
- Implement regional services to reduce cross-region traffic
- Consider direct spoke-to-spoke peering for high-bandwidth needs
- Scale out NVA solutions with load balancing
- Optimize application patterns to reduce unnecessary traffic

### Problem: High Latency

**Symptoms:**
- Increased response times for applications
- Timeouts for latency-sensitive applications
- Poor user experience for interactive services

**Possible Causes:**
1. Traffic inspection overhead
2. Inefficient routing paths
3. Cross-region traffic
4. Resource contention

**Troubleshooting Steps:**

1. **Measure Baseline Latency:**
   - Use network performance testing tools between endpoints
   - Establish baseline metrics during low-usage periods

2. **Analyze Network Path:**
   ```powershell
   # Use Network Watcher next hop tool
   Get-AzNetworkWatcherNextHop -NetworkWatcher $networkWatcher `
     -TargetVirtualMachineId $vmId `
     -SourceIPAddress $sourceIP -DestinationIPAddress $destIP
   ```
   - Identify all hops in the communication path
   - Measure latency contribution at each hop

3. **Check Resource Utilization:**
   - Monitor CPU and memory on NVAs or firewall
   - Check for throttling or resource contention

**Resolution:**
- Optimize traffic inspection (selective bypass for latency-sensitive traffic)
- Consider direct connectivity for latency-sensitive applications
- Implement regional deployment for user-facing services
- Use performance monitoring tools to identify and address bottlenecks
- Consider Azure Virtual WAN for optimized Microsoft backbone routing

## Security Issues

### Problem: Unintended Exposure

**Symptoms:**
- Security scanning identifies unexpected open ports
- Traffic bypassing intended inspection points
- Direct internet access from spoke resources

**Possible Causes:**
1. Missing or incorrectly configured UDRs
2. NSG rules too permissive
3. Public IPs assigned to spoke resources
4. Bypassed firewall for specific routes

**Troubleshooting Steps:**

1. **Audit Public IP Resources:**
   ```powershell
   # Find all public IPs in subscription
   Get-AzPublicIpAddress | Select-Object Name, ResourceGroupName, IpAddress, Location
   ```
   - Identify unexpected public IPs in spoke VNets

2. **Validate Route Tables:**
   ```powershell
   # Check if default route (0.0.0.0/0) points to firewall
   $rt = Get-AzRouteTable -ResourceGroupName "spoke-rg" -Name "spoke-routes"
   $rt.Routes | Where-Object { $_.AddressPrefix -eq '0.0.0.0/0' }
   ```
   - Verify default route sends traffic to firewall
   - Check for custom routes bypassing security controls

3. **Review NSG Rules:**
   ```powershell
   # Get all NSGs in subscription
   Get-AzNetworkSecurityGroup | ForEach-Object {
     $nsg = $_
     $nsg.SecurityRules | Where-Object { $_.Direction -eq 'Inbound' -and $_.Access -eq 'Allow' }
   }
   ```
   - Identify overly permissive rules
   - Look for direct internet access

**Resolution:**
- Implement default routes (0.0.0.0/0) to hub firewall for all spokes
- Remove directly assigned public IPs from spoke resources
- Use Azure Private Link for PaaS services
- Implement NSG baseline policies
- Regularly audit network configuration for compliance

### Problem: Policy Enforcement Failures

**Symptoms:**
- Security policies not consistently applied
- Certain traffic bypassing inspection
- Audit logs showing unauthorized access attempts

**Possible Causes:**
1. Traffic bypassing intended path
2. Firewall misconfiguration
3. Inconsistent policy application
4. Rule precedence issues

**Troubleshooting Steps:**

1. **Review Firewall Logs:**
   ```powershell
   # Query firewall logs in Log Analytics
   $query = "AzureDiagnostics
   | where Category == 'AzureFirewallNetworkRule' or Category == 'AzureFirewallApplicationRule'
   | where TimeGenerated >= ago(1h)
   | where Action == 'Deny'
   | summarize count() by Resource, SourceIP, DestinationIP, DestinationPort"
   
   Invoke-AzOperationalInsightsQuery -WorkspaceId $workspaceId -Query $query
   ```
   - Look for unexpected allowed or denied traffic
   - Identify patterns of policy bypass

2. **Validate Routing Logic:**
   - Trace full path of traffic through the network
   - Verify all traffic flows through inspection points
   - Check for direct peering or connections bypassing hub

3. **Test from Multiple Sources:**
   - Verify policy enforcement from different spoke VNets
   - Test from on-premises and Azure endpoints
   - Check policy consistency across regions

**Resolution:**
- Implement consistent UDRs across all spokes
- Enforce traffic inspection with Azure Firewall Policy
- Use centralized policy application
- Implement network traffic analysis tools
- Consider Azure Firewall Premium for enhanced inspection

## Scaling and Growth Problems

### Problem: VNet Peering Limits

**Symptoms:**
- Unable to create new VNet peerings
- Error messages about peering limits
- New spoke deployment failures

**Possible Causes:**
1. Reached Azure limit for VNet peerings per VNet (500 per VNet)
2. Subscription level limits
3. Regional resource constraints

**Troubleshooting Steps:**

1. **Check Current Peering Count:**
   ```powershell
   # Count peerings for hub VNet
   $hubVnet = Get-AzVirtualNetwork -ResourceGroupName "hub-rg" -Name "hub-vnet"
   $hubVnet.VirtualNetworkPeerings.Count
   
   # Check Azure limits
   Get-AzNetworkUsage -Location "eastus" | Where-Object { $_.Name.Value -eq 'VirtualNetworkPeerings' }
   ```
   - Compare against Azure limits (500 peerings per VNet)

2. **Analyze Growth Patterns:**
   - Review historical rate of new spoke creation
   - Project future peering requirements

**Resolution:**
- Implement transit hub architecture with multiple hub VNets
- Consider Azure Virtual WAN for large-scale deployments
- Use hierarchical hub structure for very large environments
- Consolidate related workloads in shared spoke VNets
- Implement multi-tenant design patterns

### Problem: Address Space Exhaustion

**Symptoms:**
- Unable to create new subnets
- IP address assignment failures
- CIDR conflicts during VNet creation

**Possible Causes:**
1. Initial address space allocation too small
2. Inefficient subnet allocation
3. Address space conflicts with on-premises
4. Mergers and acquisitions bringing overlapping ranges

**Troubleshooting Steps:**

1. **Audit Current Address Utilization:**
   ```powershell
   # Get all VNets and their address spaces
   Get-AzVirtualNetwork | Select-Object Name, ResourceGroupName, AddressSpace
   
   # Get all subnets in a VNet
   $vnet = Get-AzVirtualNetwork -ResourceGroupName "spoke-rg" -Name "spoke-vnet"
   $vnet.Subnets | Select-Object Name, AddressPrefix
   ```
   - Identify fragmentation and inefficient allocation
   - Calculate available space for growth

2. **Analyze IP Utilization in Subnets:**
   - Check IP allocation logs
   - Determine actual usage vs. allocated ranges

**Resolution:**
- Redesign address space with non-overlapping CIDR blocks
- Implement transit routing between different address spaces
- Use NAT for overlapping ranges (in extreme cases)
- Reserve large address spaces for future growth
- Consider IPv6 for dual-stack implementations
- Document IP addressing scheme and enforce governance