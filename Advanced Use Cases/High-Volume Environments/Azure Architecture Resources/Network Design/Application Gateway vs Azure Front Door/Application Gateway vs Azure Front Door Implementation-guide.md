# Implementation Guide: Azure Application Gateway vs Azure Front Door

This guide provides detailed implementation instructions for both Azure Application Gateway and Azure Front Door, as well as guidance on implementing them together in a multi-layered approach.

## Azure Application Gateway Implementation

### Prerequisites
- An Azure subscription
- A virtual network with subnets for the Application Gateway and backend resources
- Backend servers/services (Azure VMs, App Services, etc.)

### Step 1: Create an Application Gateway

#### Using Azure Portal
1. Go to the Azure Portal
2. Click "Create a resource" and search for "Application Gateway"
3. Configure the basic settings:
   - Name: Enter a name for your Application Gateway
   - Region: Select the Azure region for deployment
   - Tier: Choose between Standard_v2 and WAF_v2 tiers
   - Autoscaling: Configure instance count (min and max)
4. Configure the virtual network:
   - Select an existing VNet or create a new one
   - Choose or create a subnet for the Application Gateway (must be empty)
5. Configure frontend IP:
   - Choose between Public, Private, or Both
   - Associate a new or existing Public IP
6. Configure backend pools:
   - Add target servers by IP address or FQDN
   - Alternatively, add App Service, VM Scale Sets, or other Azure resources
7. Configure routing rules:
   - Add listeners (protocol, port, frontend IP, certificate for HTTPS)
   - Add backend pools and HTTP settings
   - Set path-based routing rules if needed
8. Review and create

#### Using Azure CLI
```bash
# Create a resource group
az group create --name myResourceGroup --location eastus

# Create the VNet and subnet
az network vnet create \
  --name myVNet \
  --resource-group myResourceGroup \
  --location eastus \
  --address-prefix 10.0.0.0/16 \
  --subnet-name myAGSubnet \
  --subnet-prefix 10.0.1.0/24

# Create the Application Gateway
az network application-gateway create \
  --name myAppGateway \
  --location eastus \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet myAGSubnet \
  --capacity 2 \
  --sku Standard_v2 \
  --http-settings-cookie-based-affinity Enabled \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --public-ip-address myAppGatewayPublicIP
```

### Step 2: Configure SSL/TLS

#### For SSL Termination at Gateway
1. In the Application Gateway settings, go to "Listeners"
2. Create or edit a listener with HTTPS protocol
3. Upload your SSL certificate (PFX format) or select a Key Vault certificate
4. Configure HTTP settings for HTTP communication to backends

#### For End-to-End SSL
1. Configure the listener with HTTPS as described above
2. In HTTP Settings, select HTTPS protocol
3. Enable "Use well known CA certificate" or upload a root certificate for custom CA validation

### Step 3: Configure WAF (Web Application Firewall)

1. When creating the Application Gateway, select the WAF_v2 tier
2. In the Application Gateway settings, go to "Web application firewall"
3. Select a WAF policy or create a new one:
   - Choose between Prevention and Detection modes
   - Select rule sets (OWASP, Microsoft default)
   - Configure exclusions if needed
4. Enable WAF logging through Diagnostic settings

## Azure Front Door Implementation

### Prerequisites
- An Azure subscription
- Backend services/origins that are publicly accessible (or using Private Link with Premium tier)

### Step 1: Create a Front Door Profile

#### Using Azure Portal
1. Go to the Azure Portal
2. Click "Create a resource" and search for "Front Door and CDN profiles"
3. Select "Quick create" to begin
4. Configure the basic settings:
   - Subscription and Resource Group
   - Name: Enter a name for your Front Door profile
   - Tier: Choose between Standard and Premium tiers (Premium required for Private Link)
5. Click "Review + create" and then "Create"

### Step 2: Configure Endpoint, Origin Group, and Origin

1. In your Front Door profile, go to "Front Door manager"
2. Create an endpoint:
   - Click "Endpoint" and then "+ Add an endpoint"
   - Enter a name for your endpoint
   - Enable or disable the endpoint as needed
3. Create an origin group:
   - Click "Origin groups" and then "+ Add an origin group"
   - Enter a name for your origin group
   - Configure health probes and load balancing settings
4. Add origins to the origin group:
   - Click "Origins" within the origin group
   - Click "+ Add an origin"
   - Enter a name for your origin
   - Specify the origin type (Azure service or Custom host)
   - Enter the origin host name
   - Configure host header, HTTP/HTTPS port, priority, and weight

### Step 3: Configure Routes

1. In your Front Door profile, go to "Routes"
2. Click "+ Add a route"
3. Configure route settings:
   - Name: Enter a name for the route
   - Enable/disable the route as needed
   - Domains: Select the endpoint domain
   - Patterns to match: Define URL patterns (e.g., /* for all traffic)
   - Accepted protocols: HTTP, HTTPS, or both
   - Redirect: Configure redirects if needed
   - Origin group: Select the origin group to route traffic to
   - Forwarding protocol: Match request or specify HTTP/HTTPS
   - Caching: Enable/disable and configure as needed

### Step 4: Configure WAF Policy (Optional)

1. In the Azure Portal, search for "Web Application Firewalls" and create a new policy
2. Configure the policy settings:
   - Policy mode: Prevention or Detection
   - Rule sets: OWASP, Microsoft managed rules, custom rules
3. Attach the WAF policy to your Front Door:
   - Go to your Front Door profile
   - Select "Security Policies"
   - Create a new security policy and select your WAF policy
   - Associate it with your endpoint

### Step 5: Configure Custom Domains (Optional)

1. In your Front Door profile, go to "Domains"
2. Click "Add domain"
3. Enter your custom domain name
4. Configure TLS settings:
   - Select Front Door managed certificate or bring your own certificate
   - Set minimum TLS version
5. Validate domain ownership using CNAME records

## Implementing Front Door with Application Gateway

### Architecture Overview
```
Internet → Azure Front Door → Application Gateway (Region 1) → Backend Pool 1
                          → Application Gateway (Region 2) → Backend Pool 2
```

### Implementation Steps

#### Step 1: Deploy Application Gateways in Each Region
1. Follow the Application Gateway implementation steps above to create an Application Gateway in each target region
2. Configure each Application Gateway with appropriate backend pools for that region

#### Step 2: Configure Front Door to Use Application Gateways as Origins
1. Create a Front Door profile as described above
2. Create origin groups for each region:
   - Configure appropriate health probes
   - Set load balancing parameters (weights, priorities)
3. Add Application Gateways as origins:
   - Use the public IP or DNS name of each Application Gateway
   - Configure appropriate host headers that Application Gateway expects
4. Configure routes to direct traffic to the appropriate origin groups based on your requirements

#### Step 3: Secure Application Gateway to Accept Traffic Only from Front Door
1. Create a WAF policy for each Application Gateway
2. Add a custom rule to validate the `X-Azure-FDID` header:
   - Match condition: Check for header `X-Azure-FDID`
   - Operator: Equals
   - Value: Your Front Door ID (found in the Front Door Overview page)
   - Action: Allow
   - Default Action: Block
3. Apply the WAF policy to your Application Gateway

#### Step 4: Configure Health Probes
1. Configure Front Door health probes to check Application Gateway health
2. Configure Application Gateway health probes to check backend health
3. Ensure probe intervals and thresholds are aligned for consistent failover behavior

## Advanced Configuration Scenarios

### Private Link with Front Door Premium
1. Deploy your backends in a private network not accessible from the internet
2. Create a Private Link Service for each backend
3. In Front Door (Premium tier), add origins using Private Link
4. Approve the Private Link connection requests

### URL-Based Routing with Application Gateway Behind Front Door
1. Configure Front Door to route all traffic to regional Application Gateways
2. Configure each Application Gateway with URL path-based rules to route to different backends
3. This creates a hierarchical routing structure: global routing (Front Door) → regional routing (Application Gateway)

### Session Affinity Configuration
1. For Front Door: Enable session affinity in route configuration
2. For Application Gateway: Enable cookie-based affinity in HTTP settings
3. This creates a layered affinity: region-level (Front Door) → server-level (Application Gateway)

## Monitoring and Troubleshooting

### Key Metrics to Monitor
1. **Front Door**:
   - RequestCount
   - RequestSize
   - ResponseSize
   - TotalLatency
   - BackendRequestCount
   - BackendRequestLatency
   - BackendHealthPercentage

2. **Application Gateway**:
   - Throughput
   - HealthyHostCount
   - UnhealthyHostCount
   - ResponseStatus
   - ComputeUnits
   - EstimatedBilledCapacityUnits

### Diagnostic Logging
1. **Front Door**:
   - Enable diagnostic settings
   - Send logs to Log Analytics, Storage Account, or Event Hub
   - Important logs: access logs, health probe logs, WAF logs

2. **Application Gateway**:
   - Enable diagnostic settings
   - Configure firewall logs, access logs, and performance logs
   - Send to Log Analytics for querying

### Common Troubleshooting Steps
1. **Connectivity Issues**:
   - Verify Network Security Group rules
   - Check health probe configurations
   - Validate backend health
   - Review access logs for error codes

2. **Performance Issues**:
   - Check scaling settings (auto-scale enabled)
   - Validate backend response times
   - Review capacity metrics
   - Check for throttling

3. **Certificate Issues**:
   - Verify certificate validity
   - Check for correct certificate chain
   - Ensure private key is included (PFX)
   - Validate TLS version compatibility

## Deployment Automation

### ARM Templates
```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "appGatewayName": {
      "type": "string",
      "defaultValue": "myAppGateway"
    },
    "frontDoorName": {
      "type": "string",
      "defaultValue": "myFrontDoor"
    }
    // Add other necessary parameters
  },
  "resources": [
    // Application Gateway resource definition
    // Front Door resource definition
    // Other supporting resources
  ]
}
```

### Terraform Example
```hcl
# Application Gateway
resource "azurerm_application_gateway" "app_gateway" {
  name                = "example-appgateway"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "my-gateway-ip-configuration"
    subnet_id = azurerm_subnet.example.id
  }

  # Add frontend ports, listeners, backend pools, etc.
}

# Front Door
resource "azurerm_frontdoor" "example" {
  name                = "example-frontdoor"
  resource_group_name = azurerm_resource_group.example.name

  routing_rule {
    name               = "exampleRoutingRule"
    accepted_protocols = ["Http", "Https"]
    patterns_to_match  = ["/*"]
    frontend_endpoints = ["exampleFrontendEndpoint"]
    forwarding_configuration {
      forwarding_protocol = "MatchRequest"
      backend_pool_name   = "exampleBackendPool"
    }
  }

  # Add backend pools, health probes, etc.
}
```

## Cost Considerations

### Application Gateway Pricing Factors
- Tier (Standard_v2 or WAF_v2)
- Capacity units consumed
- Data processed
- Fixed hourly cost (v1 SKU only)
- WAF rules and policies

### Front Door Pricing Factors
- Tier (Standard, Premium, Classic)
- Outbound data transfer
- Inbound data transfer
- Routing rules
- WAF rules and policies
- Private Link connections (Premium tier only)

### Cost Optimization Tips
1. Right-size instances based on traffic patterns
2. Enable auto-scaling to handle variable loads
3. Implement caching where possible to reduce backend traffic
4. Choose the appropriate tier based on feature requirements
5. Monitor capacity utilization and adjust as needed
6. Use Azure Monitor alerts to detect unusual traffic patterns that might indicate increased costs
