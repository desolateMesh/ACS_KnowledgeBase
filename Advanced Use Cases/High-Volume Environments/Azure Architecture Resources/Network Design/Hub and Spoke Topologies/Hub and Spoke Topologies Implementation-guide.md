# Hub and Spoke Implementation Guide

This guide provides step-by-step instructions for implementing a hub and spoke network topology in Azure.

## Prerequisites

Before beginning implementation, ensure you have:

- **Azure subscription** with appropriate permissions
- **Address space planning** for all VNets and subnets
- **Network security requirements** documented
- **Resource naming convention** established
- **Azure resource limits** reviewed to ensure compliance

## Step 1: Create the Hub Virtual Network

```powershell
# Variables
$resourceGroup = "rg-hub-networking-prod"
$location = "eastus"
$hubVnetName = "vnet-hub-eastus-prod"
$hubVnetAddressPrefix = "10.0.0.0/16"

# Create Resource Group
New-AzResourceGroup -Name $resourceGroup -Location $location

# Create Hub VNet
$hubVnet = New-AzVirtualNetwork `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -Name $hubVnetName `
  -AddressPrefix $hubVnetAddressPrefix
```

### Hub Subnet Configuration

Create the following subnets in the hub VNet:

```powershell
# Add Gateway Subnet
Add-AzVirtualNetworkSubnetConfig `
  -Name "GatewaySubnet" `
  -AddressPrefix "10.0.0.0/24" `
  -VirtualNetwork $hubVnet

# Add Azure Firewall Subnet
Add-AzVirtualNetworkSubnetConfig `
  -Name "AzureFirewallSubnet" `
  -AddressPrefix "10.0.1.0/24" `
  -VirtualNetwork $hubVnet

# Add Bastion Subnet
Add-AzVirtualNetworkSubnetConfig `
  -Name "AzureBastionSubnet" `
  -AddressPrefix "10.0.2.0/24" `
  -VirtualNetwork $hubVnet

# Add Management Subnet
Add-AzVirtualNetworkSubnetConfig `
  -Name "snet-management" `
  -AddressPrefix "10.0.3.0/24" `
  -VirtualNetwork $hubVnet

# Save VNet configuration
$hubVnet | Set-AzVirtualNetwork
```

## Step 2: Deploy Connectivity Services in the Hub

### VPN Gateway or ExpressRoute Gateway

```powershell
# Create Public IP for VPN Gateway
$gwpip = New-AzPublicIpAddress `
  -Name "pip-vpngw-eastus-prod" `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -AllocationMethod Dynamic

# Create Gateway Configuration
$vnet = Get-AzVirtualNetwork -Name $hubVnetName -ResourceGroupName $resourceGroup
$subnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet
$gwipconfig = New-AzVirtualNetworkGatewayIpConfig `
  -Name "gwipconfig" `
  -SubnetId $subnet.Id `
  -PublicIpAddressId $gwpip.Id

# Deploy VPN Gateway
New-AzVirtualNetworkGateway `
  -Name "vpngw-hub-eastus-prod" `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -IpConfigurations $gwipconfig `
  -GatewayType Vpn `
  -VpnType RouteBased `
  -GatewaySku VpnGw1
```

### Azure Firewall

```powershell
# Create Public IP for Azure Firewall
$fwpip = New-AzPublicIpAddress `
  -Name "pip-fw-eastus-prod" `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -AllocationMethod Static `
  -Sku Standard

# Deploy Azure Firewall
$azfw = New-AzFirewall `
  -Name "fw-hub-eastus-prod" `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -VirtualNetwork $vnet `
  -PublicIpAddress $fwpip
```

### Bastion Host

```powershell
# Create Public IP for Bastion
$bastionpip = New-AzPublicIpAddress `
  -Name "pip-bastion-eastus-prod" `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -AllocationMethod Static `
  -Sku Standard

# Deploy Bastion
New-AzBastion `
  -ResourceGroupName $resourceGroup `
  -Name "bastion-hub-eastus-prod" `
  -PublicIpAddress $bastionpip `
  -VirtualNetwork $vnet
```

## Step 3: Create Spoke Virtual Networks

```powershell
# Variables
$spokeResourceGroup = "rg-spoke1-prod"
$spokeVnetName = "vnet-spoke1-eastus-prod"
$spokeVnetAddressPrefix = "10.1.0.0/16"

# Create Resource Group
New-AzResourceGroup -Name $spokeResourceGroup -Location $location

# Create Spoke VNet
$spokeVnet = New-AzVirtualNetwork `
  -ResourceGroupName $spokeResourceGroup `
  -Location $location `
  -Name $spokeVnetName `
  -AddressPrefix $spokeVnetAddressPrefix

# Add Workload Subnet
Add-AzVirtualNetworkSubnetConfig `
  -Name "snet-workload" `
  -AddressPrefix "10.1.0.0/24" `
  -VirtualNetwork $spokeVnet

# Save VNet configuration
$spokeVnet | Set-AzVirtualNetwork
```

## Step 4: Establish Hub and Spoke Connectivity

```powershell
# Get Hub and Spoke VNets
$hubVnet = Get-AzVirtualNetwork -Name $hubVnetName -ResourceGroupName $resourceGroup
$spokeVnet = Get-AzVirtualNetwork -Name $spokeVnetName -ResourceGroupName $spokeResourceGroup

# Create Hub to Spoke Peering
Add-AzVirtualNetworkPeering `
  -Name "peer-hub-to-spoke1" `
  -VirtualNetwork $hubVnet `
  -RemoteVirtualNetworkId $spokeVnet.Id `
  -AllowForwardedTraffic `
  -AllowGatewayTransit

# Create Spoke to Hub Peering
Add-AzVirtualNetworkPeering `
  -Name "peer-spoke1-to-hub" `
  -VirtualNetwork $spokeVnet `
  -RemoteVirtualNetworkId $hubVnet.Id `
  -AllowForwardedTraffic `
  -UseRemoteGateways
```

## Step 5: Configure Routing for Spoke-to-Spoke Communication

### Create User-Defined Routes for Spokes

```powershell
# Get Azure Firewall private IP
$azfw = Get-AzFirewall -Name "fw-hub-eastus-prod" -ResourceGroupName $resourceGroup
$fwPrivateIP = $azfw.IpConfigurations[0].PrivateIPAddress

# Create Route Table
$routeTableSpoke = New-AzRouteTable `
  -Name "rt-spoke-to-hub" `
  -ResourceGroupName $spokeResourceGroup `
  -Location $location

# Add route to other spoke networks via firewall
Add-AzRouteConfig `
  -Name "route-to-spokes" `
  -RouteTable $routeTableSpoke `
  -AddressPrefix "10.0.0.0/8" `
  -NextHopType "VirtualAppliance" `
  -NextHopIpAddress $fwPrivateIP

# Add route to on-premises via firewall
Add-AzRouteConfig `
  -Name "route-to-onprem" `
  -RouteTable $routeTableSpoke `
  -AddressPrefix "172.16.0.0/12" `
  -NextHopType "VirtualAppliance" `
  -NextHopIpAddress $fwPrivateIP

# Add route to internet via firewall
Add-AzRouteConfig `
  -Name "route-to-internet" `
  -RouteTable $routeTableSpoke `
  -AddressPrefix "0.0.0.0/0" `
  -NextHopType "VirtualAppliance" `
  -NextHopIpAddress $fwPrivateIP

# Save route table
$routeTableSpoke | Set-AzRouteTable

# Associate route table with spoke subnet
$spokeVnet = Get-AzVirtualNetwork -Name $spokeVnetName -ResourceGroupName $spokeResourceGroup
$spokeSnet = Get-AzVirtualNetworkSubnetConfig -Name "snet-workload" -VirtualNetwork $spokeVnet
$spokeSnet.RouteTable = $routeTableSpoke
$spokeVnet | Set-AzVirtualNetwork
```

## Step 6: Configure Network Security Groups

```powershell
# Create NSG for management subnet
$nsgManagement = New-AzNetworkSecurityGroup `
  -ResourceGroupName $resourceGroup `
  -Location $location `
  -Name "nsg-management"

# Add rules to management NSG
$nsgManagement | Add-AzNetworkSecurityRuleConfig `
  -Name "Allow-RDP-HTTPS" `
  -Description "Allow RDP and HTTPS inbound from authorized IPs" `
  -Access Allow `
  -Protocol Tcp `
  -Direction Inbound `
  -Priority 100 `
  -SourceAddressPrefix "AuthorizedIPs" `
  -SourcePortRange * `
  -DestinationAddressPrefix * `
  -DestinationPortRange 3389,443

# Apply NSG to management subnet
$nsgManagement | Set-AzNetworkSecurityGroup
$hubVnet = Get-AzVirtualNetwork -Name $hubVnetName -ResourceGroupName $resourceGroup
$managementSubnet = Get-AzVirtualNetworkSubnetConfig -Name "snet-management" -VirtualNetwork $hubVnet
$managementSubnet.NetworkSecurityGroup = $nsgManagement
$hubVnet | Set-AzVirtualNetwork
```

## Step 7: Configure Azure Firewall Rules

```powershell
# Create network rule collection
$netRuleCollection = New-AzFirewallNetworkRuleCollection `
  -Name "AllowInterSpokeTraffic" `
  -Priority 100 `
  -Action Allow

# Add rule to allow spoke-to-spoke traffic
$netRule = New-AzFirewallNetworkRule `
  -Name "AllowSpokes" `
  -Protocol Any `
  -SourceAddress "10.1.0.0/16","10.2.0.0/16" `
  -DestinationAddress "10.1.0.0/16","10.2.0.0/16" `
  -DestinationPort *

# Add network rule to firewall
$netRuleCollection.Rules = $netRule
$azfw.NetworkRuleCollections = $netRuleCollection
Set-AzFirewall -AzureFirewall $azfw
```

## Step 8: Implement Monitoring and Diagnostics

```powershell
# Create Log Analytics workspace
New-AzOperationalInsightsWorkspace `
  -Location $location `
  -Name "log-hub-networking-prod" `
  -ResourceGroupName $resourceGroup `
  -Sku PerGB2018

# Enable diagnostics for key resources
$logWorkspace = Get-AzOperationalInsightsWorkspace -ResourceGroupName $resourceGroup -Name "log-hub-networking-prod"

# Enable diagnostic settings for hub VNet
Set-AzDiagnosticSetting `
  -ResourceId $hubVnet.Id `
  -WorkspaceId $logWorkspace.ResourceId `
  -Enabled $true `
  -Category NetworkSecurityGroupEvent,NetworkSecurityGroupRuleCounter

# Enable diagnostic settings for Azure Firewall
Set-AzDiagnosticSetting `
  -ResourceId $azfw.Id `
  -WorkspaceId $logWorkspace.ResourceId `
  -Enabled $true `
  -Category AzureFirewallApplicationRule,AzureFirewallNetworkRule,AzureFirewallDnsProxy
```

## Step 9: Automate with Infrastructure as Code

For production implementations, consider using:
- **Azure Resource Manager (ARM) templates**
- **Terraform**
- **Bicep**

Example Terraform snippet for hub VNet:

```hcl
resource "azurerm_resource_group" "hub_rg" {
  name     = "rg-hub-networking-prod"
  location = "eastus"
}

resource "azurerm_virtual_network" "hub_vnet" {
  name                = "vnet-hub-eastus-prod"
  location            = azurerm_resource_group.hub_rg.location
  resource_group_name = azurerm_resource_group.hub_rg.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_subnet" "gateway_subnet" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.hub_rg.name
  virtual_network_name = azurerm_virtual_network.hub_vnet.name
  address_prefixes     = ["10.0.0.0/24"]
}

resource "azurerm_subnet" "firewall_subnet" {
  name                 = "AzureFirewallSubnet"
  resource_group_name  = azurerm_resource_group.hub_rg.name
  virtual_network_name = azurerm_virtual_network.hub_vnet.name
  address_prefixes     = ["10.0.1.0/24"]
}
```

## Step 10: Validate and Test

After implementation, perform these validation tests:

1. **Connectivity validation**:
   - Spoke to hub
   - Spoke to spoke
   - Spoke to on-premises
   - Spoke to internet

2. **Security validation**:
   - NSG rule effectiveness
   - Firewall rule logging
   - Traffic inspection

3. **Performance testing**:
   - Latency between spokes
   - Throughput through firewall
   - VPN/ExpressRoute performance

## Common Pitfalls to Avoid

1. **Address space overlap** - Ensure all VNets have non-overlapping address spaces
2. **Asymmetric routing** - Verify all traffic follows the same path in both directions
3. **Too many peerings** - VNet peering has subscription limits (check Azure limits)
4. **Insufficient subnet sizing** - Plan for growth in subnet address allocations
5. **Missing diagnostics** - Enable logging for all network resources
6. **Firewall bottlenecks** - Size Azure Firewall appropriately for expected throughput