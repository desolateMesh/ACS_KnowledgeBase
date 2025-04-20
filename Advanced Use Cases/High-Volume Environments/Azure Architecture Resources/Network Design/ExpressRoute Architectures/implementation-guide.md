# ExpressRoute Implementation Guide

## Table of Contents
- [Prerequisites and Planning](#prerequisites-and-planning)
- [ExpressRoute Circuit Provisioning](#expressroute-circuit-provisioning)
- [Configuring ExpressRoute Gateway](#configuring-expressroute-gateway)
- [Establishing Connectivity](#establishing-connectivity)
- [Configuring Routing](#configuring-routing)
- [Testing and Validation](#testing-and-validation)
- [Monitoring and Management](#monitoring-and-management)
- [Scaling and Optimization](#scaling-and-optimization)
- [Security Implementation](#security-implementation)
- [Automation and Infrastructure as Code](#automation-and-infrastructure-as-code)

## Prerequisites and Planning

### Requirements Assessment
Before implementing ExpressRoute, gather the following information:

1. **Bandwidth requirements**
   - Current network utilization metrics
   - Projected growth over 12-36 months
   - Peak usage patterns

2. **Geographic considerations**
   - Primary on-premises locations requiring connectivity
   - Target Azure regions for workloads
   - ExpressRoute peering locations availability

3. **Network topology**
   - Current on-premises network architecture
   - IP addressing scheme
   - Existing routing protocols and policies

4. **Provider selection**
   - Available connectivity providers at your location
   - Service level agreements (SLAs)
   - Pricing models and contract terms

### Azure Environment Preparation
1. **Subscription readiness**
   - Ensure subscription limits accommodate ExpressRoute requirements
   - Verify appropriate RBAC permissions
   - Review any Enterprise Agreement (EA) terms

2. **Networking foundations**
   - Plan Virtual Network address spaces
   - Design subnet architecture
   - Document gateway subnet requirements (/27 or larger)

3. **Compliance considerations**
   - Document regulatory requirements
   - Plan for any required encryption
   - Establish monitoring and logging requirements

## ExpressRoute Circuit Provisioning

### Azure Portal Deployment
1. Sign in to the Azure portal
2. Navigate to **+ Create a resource**
3. Search for and select "ExpressRoute"
4. Complete the creation form:
   - **Subscription**: Select target subscription
   - **Resource group**: Create new or select existing
   - **Location**: Select the closest peering location
   - **Provider**: Choose connectivity provider
   - **Bandwidth**: Select appropriate circuit speed
   - **SKU**: Standard or Premium tier based on requirements
   - **Billing model**: Metered or Unlimited
5. Review + create the circuit

### Azure CLI Deployment
```bash
# Create resource group if not exists
az group create --name ExpressRouteResourceGroup --location "East US"

# Create the ExpressRoute circuit
az network express-route create \
    --resource-group ExpressRouteResourceGroup \
    --name MyExpressRouteCircuit \
    --location "East US" \
    --provider "Equinix" \
    --peering-location "New York" \
    --bandwidth 1000 \
    --sku-tier Standard \
    --sku-family MeteredData
```

### Provider Coordination
After provisioning the circuit in Azure:
1. Note the Service Key from the circuit properties
2. Contact your ExpressRoute provider
3. Provide the Service Key for circuit provisioning
4. Track the provider's provisioning process
5. Verify circuit status changes to "Provisioned" in Azure portal

## Configuring ExpressRoute Gateway

### Gateway Planning
1. **Gateway type selection**:
   | Gateway SKU | Circuits | Bandwidth | Tunnel Support | Notes |
   |-------------|----------|-----------|---------------|-------|
   | Standard    | 4        | 1 Gbps    | 10            | Basic connectivity |
   | High Performance | 4  | 2 Gbps    | 10            | Enhanced performance |
   | UltraPerformance | 8  | 10 Gbps   | 10            | Highest performance |
   | ErGw1AZ     | 4        | 1 Gbps    | 10            | Zone-redundant |
   | ErGw2AZ     | 8        | 2 Gbps    | 10            | Zone-redundant |
   | ErGw3AZ     | 16       | 10 Gbps   | 10            | Zone-redundant |

2. **Availability zone consideration**:
   - ErGwAZ SKUs provide zone redundancy
   - Recommended for mission-critical workloads
   - Available in supported regions only

### Gateway Deployment

#### Azure Portal Deployment:
1. Navigate to the Virtual Network
2. Select **Subnets** from the left menu
3. Create a "GatewaySubnet" with at least /27 address space
4. Navigate to **+ Create a resource**
5. Search for and select "Virtual Network Gateway"
6. Configure the gateway:
   - **Name**: Provide a descriptive name
   - **Gateway type**: ExpressRoute
   - **SKU**: Select appropriate SKU
   - **Virtual network**: Select target VNet
   - **Public IP address**: Create new or select existing
   - **Enable active-active mode**: Based on requirements
   - **Configure BGP**: Based on requirements
7. Review + create the gateway

#### Terraform Deployment:
```hcl
resource "azurerm_subnet" "gateway_subnet" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = ["10.0.255.0/27"]
}

resource "azurerm_public_ip" "gateway_ip" {
  name                = "gateway-ip"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
  allocation_method   = "Dynamic"
}

resource "azurerm_virtual_network_gateway" "expressroute_gateway" {
  name                = "expressroute-gateway"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
  type                = "ExpressRoute"
  sku                 = "Standard"
  
  ip_configuration {
    name                 = "vnetGatewayConfig"
    public_ip_address_id = azurerm_public_ip.gateway_ip.id
    subnet_id            = azurerm_subnet.gateway_subnet.id
  }
}
```

## Establishing Connectivity

### Connecting Circuit to Gateway

#### Azure Portal:
1. Navigate to the ExpressRoute circuit
2. Select **Connections** from the left menu
3. Click **+ Add**
4. Configure the connection:
   - **Name**: Provide a descriptive name
   - **Subscription**: Select target subscription
   - **Virtual network gateway**: Select the ExpressRoute gateway
   - **Resource group**: Select the gateway's resource group
5. Save the connection

#### Azure CLI:
```bash
# Get the IDs of the circuit and gateway
circuitId=$(az network express-route show \
    --resource-group ExpressRouteResourceGroup \
    --name MyExpressRouteCircuit \
    --query id -o tsv)

gatewayId=$(az network vnet-gateway show \
    --resource-group GatewayResourceGroup \
    --name MyExpressRouteGateway \
    --query id -o tsv)

# Create the connection
az network vpn-connection create \
    --name MyERConnection \
    --resource-group GatewayResourceGroup \
    --vnet-gateway1 $gatewayId \
    --express-route-circuit2 $circuitId
```

### Connection Validation
1. Check the connection status in the Azure portal
2. Verify the circuit status shows "Established"
3. Review BGP peer status
4. Check advertised routes

## Configuring Routing

### BGP Configuration for Private Peering

#### Basic BGP Setup:
1. Obtain the following from Azure:
   - Azure BGP ASN (typically 12076)
   - Primary and secondary peer IP addresses
   - VLAN ID for the connection
2. Configure your on-premises router:
   - Set local ASN and IP addresses
   - Establish BGP sessions to Azure peer IPs
   - Configure route filtering as needed

#### Sample Cisco IOS Configuration:
```
interface GigabitEthernet0/0.100
 description ExpressRoute Primary Connection
 encapsulation dot1Q <VLAN_ID>
 ip address <Your_Router_IP_1> <Subnet_Mask>

router bgp <Your_ASN>
 bgp router-id <Your_Router_IP_1>
 bgp log-neighbor-changes
 
 neighbor <Azure_Peer_IP_1> remote-as 12076
 neighbor <Azure_Peer_IP_1> ebgp-multihop 2
 neighbor <Azure_Peer_IP_1> update-source GigabitEthernet0/0.100
 
 address-family ipv4
  neighbor <Azure_Peer_IP_1> activate
  neighbor <Azure_Peer_IP_1> soft-reconfiguration inbound
  network <Your_Local_Network_1> mask <Subnet_Mask>
  network <Your_Local_Network_2> mask <Subnet_Mask>
 exit-address-family
```

### Route Filter Configuration for Microsoft Peering

#### Azure Portal:
1. Navigate to **+ Create a resource**
2. Search for and select "Route filter"
3. Create the filter with appropriate rule(s)
4. Associate the filter with the ExpressRoute circuit's Microsoft peering

#### Azure CLI:
```bash
# Create route filter
az network route-filter create \
    --name MyRouteFilter \
    --resource-group ExpressRouteResourceGroup \
    --location "East US"

# Add rule to allow specific services
az network route-filter rule create \
    --filter-name MyRouteFilter \
    --resource-group ExpressRouteResourceGroup \
    --name AllowO365 \
    --access Allow \
    --communities 12076:5010 \
    --type Community

# Associate filter with Microsoft peering
az network express-route peering update \
    --circuit-name MyExpressRouteCircuit \
    --name MicrosoftPeering \
    --resource-group ExpressRouteResourceGroup \
    --route-filter MyRouteFilter
```

### Route Advertisement Considerations
1. **On-premises route filtering**:
   - Filter routes advertised to Azure
   - Summarize routes where possible
   - Limit prefixes to 200 per circuit (standard limit)

2. **Azure route advertisement**:
   - Control Azure-to-on-premises advertisements with connection route filters
   - Use route tables to control routing within Azure

## Testing and Validation

### Connectivity Testing
1. **Basic connectivity tests**:
   - Ping tests from on-premises to Azure
   - Ping tests from Azure to on-premises
   - Traceroute analysis

2. **BGP validation**:
   - Verify BGP sessions are established
   - Check routes received from Azure
   - Confirm routes advertised to Azure

3. **Throughput testing**:
   - Measure actual bandwidth using iperf or similar tools
   - Test across multiple VMs for aggregated bandwidth
   - Compare results against expected performance

### End-to-End Testing
1. Create test VMs in both on-premises and Azure environments
2. Test application-level connectivity
3. Measure latency for critical application flows
4. Validate DNS resolution across environments
5. Test failover scenarios if redundant circuits are implemented

## Monitoring and Management

### ExpressRoute Monitoring

#### Azure Portal Monitoring:
1. Navigate to the ExpressRoute circuit
2. Review the **Metrics** section
3. Configure key metrics:
   - BitsInPerSecond/BitsOutPerSecond
   - BGP availability
   - ARP availability

#### Azure Monitor Setup:
1. Create custom dashboards for ExpressRoute metrics
2. Set up alerts for:
   - Circuit state changes
   - Bandwidth thresholds (e.g., 80% utilization)
   - BGP status changes

#### Log Analytics Integration:
```powershell
# Enable diagnostics for ExpressRoute circuit
Set-AzDiagnosticSetting `
    -ResourceId $circuitId `
    -WorkspaceId $workspaceId `
    -Enabled $true `
    -Category "PeeringRouteLog","RouteLog"
```

### Management and Operations

#### Regular Maintenance Tasks:
1. Review circuit metrics weekly
2. Check for available ExpressRoute updates quarterly
3. Validate BGP configuration monthly
4. Test failover procedures quarterly

#### Documentation Requirements:
1. Circuit service keys and provider details
2. BGP configuration parameters
3. IP addressing scheme
4. Route filtering policies
5. Escalation procedures for circuit issues

## Scaling and Optimization

### Bandwidth Upgrades
1. **Assessing need for upgrade**:
   - Monitor utilization trends
   - Identify peak usage patterns
   - Project future requirements

2. **Upgrade process**:
   - Portal: Navigate to circuit and select "Configuration"
   - CLI: Use `az network express-route update` command
   - Coordinate with ExpressRoute provider for physical changes

3. **Testing after upgrade**:
   - Validate new bandwidth availability
   - Rerun performance tests
   - Update monitoring thresholds

### Multi-Circuit Implementations

#### Architectural considerations:
1. **Active/Active configuration**:
   - Configure weight/priority of routes
   - Test load distribution
   - Monitor utilization across circuits

2. **Active/Standby configuration**:
   - Set up appropriate AS PATH prepending
   - Test failover mechanisms
   - Document recovery procedures

#### ExpressRoute Global Reach:
1. **Enabling Global Reach**:
   - Verify premium circuit tier
   - Configure in the portal or via CLI
   - Test connectivity between regions

## Security Implementation

### Network Security Controls
1. **Network Security Groups (NSGs)**:
   - Create NSGs for Azure resources
   - Define appropriate security rules
   - Apply least privilege principle

2. **Azure Firewall integration**:
   - Deploy Azure Firewall in hub VNet
   - Configure rules for ExpressRoute traffic
   - Enable threat intelligence features

3. **Private Link Services**:
   - Configure for PaaS service security
   - Limit exposure to public endpoints
   - Test connectivity through private endpoints

### Encryption Options
1. **IPsec over ExpressRoute**:
   - Configure VPN gateway for redundancy
   - Establish IPsec tunnels over ExpressRoute
   - Document encryption overhead impact

2. **Application-level encryption**:
   - Identify sensitive data requiring encryption
   - Implement TLS for application traffic
   - Use certificate-based authentication where appropriate

## Automation and Infrastructure as Code

### ARM Templates
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "circuitName": {
      "type": "string",
      "metadata": {
        "description": "ExpressRoute circuit name"
      }
    },
    "serviceProviderName": {
      "type": "string",
      "metadata": {
        "description": "ExpressRoute service provider name"
      }
    },
    "peeringLocation": {
      "type": "string",
      "metadata": {
        "description": "ExpressRoute peering location"
      }
    },
    "bandwidthInMbps": {
      "type": "int",
      "metadata": {
        "description": "ExpressRoute circuit bandwidth in Mbps"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]",
      "metadata": {
        "description": "Location for all resources"
      }
    }
  },
  "resources": [
    {
      "type": "Microsoft.Network/expressRouteCircuits",
      "apiVersion": "2020-06-01",
      "name": "[parameters('circuitName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Standard_MeteredData",
        "tier": "Standard",
        "family": "MeteredData"
      },
      "properties": {
        "serviceProviderProperties": {
          "serviceProviderName": "[parameters('serviceProviderName')]",
          "peeringLocation": "[parameters('peeringLocation')]",
          "bandwidthInMbps": "[parameters('bandwidthInMbps')]"
        },
        "allowClassicOperations": false
      }
    }
  ],
  "outputs": {
    "expressRouteCircuitId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Network/expressRouteCircuits', parameters('circuitName'))]"
    },
    "serviceKey": {
      "type": "string",
      "value": "[reference(parameters('circuitName')).serviceKey]"
    }
  }
}
```

### Terraform Modules
```hcl
module "expressroute" {
  source = "./modules/expressroute"
  
  name                = "my-expressroute"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  
  service_provider_name = "Equinix"
  peering_location      = "Silicon Valley"
  bandwidth_in_mbps     = 1000
  
  sku = {
    tier   = "Premium"
    family = "MeteredData"
  }
  
  peerings = {
    private = {
      primary_peer_address_prefix   = "10.0.0.0/30"
      secondary_peer_address_prefix = "10.0.0.4/30"
      vlan_id                       = 100
      peer_asn                      = 65001
    }
  }
  
  tags = {
    Environment = "Production"
    Department  = "IT"
  }
}
```

### Azure DevOps Integration
1. **Pipeline configuration**:
   - Set up CI/CD pipeline for ExpressRoute infrastructure
   - Include automated testing
   - Implement approval gates for changes

2. **Sample pipeline YAML**:
```yaml
trigger:
  branches:
    include:
    - main
  paths:
    include:
    - 'infrastructure/expressroute/**'

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Validate
  jobs:
  - job: ValidateTemplates
    steps:
    - task: AzureCLI@2
      inputs:
        azureSubscription: 'Production'
        scriptType: 'bash'
        scriptLocation: 'inlineScript'
        inlineScript: |
          az deployment group validate \
            --resource-group ExpressRouteRG \
            --template-file expressroute/templates/circuit.json \
            --parameters expressroute/parameters/prod.parameters.json

- stage: Deploy
  dependsOn: Validate
  jobs:
  - deployment: DeployExpressRoute
    environment: 'Production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: 'Production'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az deployment group create \
                  --resource-group ExpressRouteRG \
                  --template-file expressroute/templates/circuit.json \
                  --parameters expressroute/parameters/prod.parameters.json
```

3. **Configuration management**:
   - Store configuration parameters in secure vaults
   - Version control all infrastructure code
   - Document deployment and rollback procedures
