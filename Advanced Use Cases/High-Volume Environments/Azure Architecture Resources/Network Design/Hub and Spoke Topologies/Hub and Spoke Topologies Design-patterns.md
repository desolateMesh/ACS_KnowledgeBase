# Hub and Spoke Design Patterns

This document outlines common design patterns for Hub and Spoke network architectures in Azure, providing guidance on selecting the appropriate pattern for your organization's needs.

## Basic Hub and Spoke

![Basic Hub and Spoke Diagram]

### Components:
- **Hub VNet** with shared services:
  - VPN Gateway/ExpressRoute
  - Azure Firewall or NVA
  - Bastion Host
  - Management VMs
- **Spoke VNets** for workloads:
  - Prod/Dev/Test environments
  - Application components
  - Department-specific resources

### Connectivity:
- Hub to spoke via VNet peering
- Spokes communicate through hub using User-Defined Routes (UDRs)
- All on-premises traffic routes through hub

### Ideal for:
- Organizations requiring central connectivity and security management
- Environments with moderate complexity and scale
- Core enterprise implementations

## Secured Hub and Spoke

![Secured Hub and Spoke Diagram]

### Components:
All Basic components plus:
- **DMZ subnet** in the hub for internet-facing resources
- **Azure Firewall Premium** or advanced NVAs
- **DDoS Protection Standard**
- **NSGs** at all subnet levels
- **Private Link** for PaaS services

### Connectivity:
- All traffic (east-west and north-south) inspected by security appliances
- TLS inspection at hub
- No direct internet access from spokes

### Ideal for:
- Organizations with stringent security requirements
- Regulated industries (finance, healthcare, government)
- Environments with sensitive data

## Multi-Region Hub and Spoke

![Multi-Region Hub and Spoke Diagram]

### Components:
- **Primary and Secondary Hub VNets** in different regions
- **Global VNet Peering** between hubs
- **Traffic Manager/Front Door** for global load balancing
- **Region-specific spokes** peered to local hub
- **Cross-region peering** for critical spokes

### Connectivity:
- Regional hub-to-hub connectivity
- Geo-redundant ExpressRoute/VPN connections
- Regional firewalls with synchronized policies

### Ideal for:
- Global organizations
- Applications requiring high availability
- Disaster recovery scenarios

## Transit Hub and Spoke

![Transit Hub and Spoke Diagram]

### Components:
- **Core Hub VNet** for central networking services
- **Transit Hub VNets** in additional regions
- **Hierarchical spoke structure**
- Multiple layers of peering

### Connectivity:
- Transitive routing between distant spokes
- Hierarchical security policy implementation
- Complex routing topologies

### Ideal for:
- Very large enterprise environments
- Organizations with complex organizational boundaries
- Advanced multi-region architectures

## Virtual WAN Hub and Spoke

![Virtual WAN Hub and Spoke Diagram]

### Components:
- **Azure Virtual WAN** replacing traditional hub VNets
- **Virtual WAN Hubs** in each region
- **Managed routing** through Virtual WAN
- **Spoke VNets** connected to Virtual WAN Hubs

### Connectivity:
- Simplified any-to-any connectivity
- Automated routing
- Integrated SD-WAN connectivity

### Ideal for:
- Organizations preferring managed services over custom implementations
- Branch-heavy network topologies
- Rapid deployment scenarios

## Considerations for Pattern Selection

When choosing a hub and spoke design pattern, consider:

1. **Scale requirements** - Number of spokes, regions, and resources
2. **Security needs** - Regulatory requirements and threat profile
3. **Operational model** - Team structure and responsibilities
4. **Technical expertise** - In-house skills vs. managed services
5. **Budget constraints** - Cost of inter-region traffic and redundant services
6. **Future growth** - Anticipated expansion and merger scenarios