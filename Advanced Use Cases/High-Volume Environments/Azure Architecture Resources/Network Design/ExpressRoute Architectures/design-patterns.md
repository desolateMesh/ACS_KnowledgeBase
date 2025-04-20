# ExpressRoute Design Patterns

## Table of Contents
- [Single ExpressRoute Circuit Pattern](#single-expressroute-circuit-pattern)
- [Dual-Region ExpressRoute Pattern](#dual-region-expressroute-pattern)
- [Multi-Circuit Redundancy Pattern](#multi-circuit-redundancy-pattern)
- [Global ExpressRoute Mesh Pattern](#global-expressroute-mesh-pattern)
- [ExpressRoute Transit Network Pattern](#expressroute-transit-network-pattern)
- [ExpressRoute Direct Pattern](#expressroute-direct-pattern)
- [ExpressRoute with FastPath Pattern](#expressroute-with-fastpath-pattern)
- [Bandwidth Planning Considerations](#bandwidth-planning-considerations)
- [Security Considerations](#security-considerations)

## Single ExpressRoute Circuit Pattern

### Overview
The simplest design pattern connects a single on-premises location to a single Azure region using a single ExpressRoute circuit.

### Architecture
```
On-Premises Network <--> ExpressRoute Circuit <--> Azure VNet (Single Region)
```

### Characteristics
- **Simplicity**: Easiest pattern to implement and manage
- **Cost-effectiveness**: Minimizes circuit costs
- **Limited redundancy**: Single point of failure at the circuit level

### Best Practices
- Implement redundant physical connections from customer edge to provider edge
- Use redundant customer edge routers with BGP
- Implement a VPN backup for circuit failure scenarios
- Consider upgrading to dual circuits for production workloads

### Use Cases
- Development and testing environments
- Small-scale production workloads with limited budget
- Workloads that can tolerate occasional connectivity interruptions

## Dual-Region ExpressRoute Pattern

### Overview
This pattern extends a single ExpressRoute circuit to connect to multiple Azure regions for geographic redundancy.

### Architecture
```
                           /--> Azure VNet (Region 1)
On-Premises <--> ExpressRoute Circuit 
                           \--> Azure VNet (Region 2)
```

### Characteristics
- **Regional redundancy**: Provides connectivity to multiple Azure regions
- **Cost-effective redundancy**: Uses a single circuit for multi-region connectivity
- **Circuit bottleneck**: All cross-region traffic shares the same circuit bandwidth

### Best Practices
- Properly size the ExpressRoute circuit to handle aggregate bandwidth needs
- Use VNet peering to enable communication between regional VNets
- Implement traffic prioritization if circuit bandwidth is constrained
- Consider Global Reach for inter-region traffic to bypass the on-premises network

### Use Cases
- Multi-region deployments requiring geo-redundancy
- Disaster recovery scenarios
- Applications with regional failover requirements

## Multi-Circuit Redundancy Pattern

### Overview
This pattern uses multiple ExpressRoute circuits to eliminate single points of failure in the connectivity layer.

### Architecture
```
                    /--> ExpressRoute Circuit 1 ---\
On-Premises Network                                 >--> Azure VNet
                    \--> ExpressRoute Circuit 2 ---/
```

### Characteristics
- **High availability**: Eliminates circuit-level single points of failure
- **Load distribution**: Enables distribution of traffic across multiple circuits
- **Increased cost**: Requires payment for multiple circuits
- **Complex routing**: Requires careful BGP configuration

### Best Practices
- Deploy circuits to different peering locations when possible
- Use different service providers for maximum diversity
- Configure BGP route preferences to control traffic distribution
- Implement proper monitoring for both circuits

### Use Cases
- Mission-critical workloads with high availability requirements
- Environments needing circuit-level redundancy
- Scenarios requiring bandwidth beyond a single circuit's capacity

## Global ExpressRoute Mesh Pattern

### Overview
This pattern implements multiple ExpressRoute circuits across different global regions to create a highly available global network.

### Architecture
```
                      /--> ExpressRoute (Region 1) --> Azure VNet (Region 1)
Global On-Premises <--|--> ExpressRoute (Region 2) --> Azure VNet (Region 2)
Network               \--> ExpressRoute (Region 3) --> Azure VNet (Region 3)
```

### Characteristics
- **Global coverage**: Provides connectivity to multiple Azure regions worldwide
- **Regional proximity**: Enables local access to Azure resources for distributed sites
- **High redundancy**: Multiple paths for connectivity
- **Significant cost**: Multiple circuits across regions

### Best Practices
- Use ExpressRoute Global Reach to interconnect circuits
- Implement consistent IP addressing and routing policies across regions
- Consider traffic engineering to optimize paths based on latency and cost
- Implement centralized monitoring and management

### Use Cases
- Global enterprises with presence in multiple geographic regions
- Applications with users distributed worldwide
- Multi-region disaster recovery strategies

## ExpressRoute Transit Network Pattern

### Overview
This pattern uses ExpressRoute as a transit network to connect multiple on-premises sites through Azure.

### Architecture
```
On-Premises Site A <--> ExpressRoute <--> Azure Transit VNet <--> ExpressRoute <--> On-Premises Site B
```

### Characteristics
- **Site connectivity**: Connects geographically dispersed sites
- **Unified management**: Centralizes connectivity management in Azure
- **Flexible topology**: Can connect many sites in a hub-and-spoke model
- **Azure transit**: Leverages Azure as a transit network

### Best Practices
- Implement ExpressRoute Global Reach when available in the regions
- Properly design the transit VNet with appropriate routing
- Consider Network Virtual Appliances (NVAs) for additional security controls
- Plan for appropriate bandwidth at the transit points

### Use Cases
- Organizations with multiple data centers needing interconnection
- Mergers and acquisitions scenarios requiring network integration
- Global enterprises needing to connect regional networks

## ExpressRoute Direct Pattern

### Overview
This pattern uses ExpressRoute Direct to establish direct, high-bandwidth connections to Microsoft's network.

### Architecture
```
On-Premises Network <--> ExpressRoute Direct Port Pair <--> Microsoft Global Network <--> Azure Services
```

### Characteristics
- **Massive bandwidth**: Supports 100 Gbps or 10 Gbps connections
- **Direct connectivity**: Connects directly to Microsoft's network
- **Multiple circuits**: Supports multiple ExpressRoute circuits on a single port pair
- **High cost**: Higher investment in network infrastructure

### Best Practices
- Plan capacity carefully to justify the investment
- Implement proper physical redundancy at connection points
- Consider distributing critical circuits across multiple Direct port pairs
- Integrate with existing network monitoring and management systems

### Use Cases
- Organizations with very high bandwidth requirements
- Scenarios requiring many ExpressRoute circuits
- Large enterprises with substantial Azure consumption
- Organizations requiring the highest levels of performance

## ExpressRoute with FastPath Pattern

### Overview
This pattern leverages ExpressRoute FastPath to bypass the ExpressRoute gateway for improved performance.

### Architecture
```
On-Premises Network <--> ExpressRoute Circuit with FastPath <--> Azure VNet Resources
```

### Characteristics
- **Lower latency**: Bypasses the ExpressRoute gateway in the data path
- **Higher performance**: Reduces network hops
- **Direct connectivity**: Optimizes network path for critical workloads
- **Gateway limits**: Removes gateway performance bottlenecks

### Best Practices
- Use with Ultra Performance or ErGw3AZ gateways
- Carefully test workloads to measure latency improvements
- Understand the networking and security implications
- Monitor performance before and after implementation

### Use Cases
- Latency-sensitive applications
- High-throughput workloads
- Scenarios where ExpressRoute gateway becomes a bottleneck
- Large data transfer operations

## Bandwidth Planning Considerations

### Key Factors for Bandwidth Planning
- **Current utilization**: Baseline your existing network usage
- **Growth projections**: Account for 1-3 year growth in cloud usage
- **Workload characteristics**: Consider peak vs. average requirements
- **Cost vs. performance**: Balance budget constraints with performance needs
- **Seasonal variations**: Plan for cyclical business demands

### Bandwidth Sizing Guidelines
- **Small deployments**: 50-200 Mbps for initial or dev/test workloads
- **Medium deployments**: 500 Mbps-1 Gbps for general business applications
- **Large deployments**: 2-10 Gbps for large enterprises with significant cloud presence
- **Data-intensive**: 10+ Gbps for big data, media processing, or large backups

## Security Considerations

### Network Security
- Implement Network Security Groups (NSGs) on Azure side
- Consider firewall appliances for deep packet inspection
- Use Private Peering to isolate traffic from the internet
- Implement proper segmentation between different environments

### Routing Security
- Filter BGP advertisements to control exposed routes
- Implement route tables to control traffic flow
- Consider Azure Route Server for advanced routing scenarios
- Limit route propagation to only necessary networks

### Encryption Considerations
- ExpressRoute does not encrypt traffic by default
- Consider IPsec over ExpressRoute for sensitive workloads
- Evaluate MACsec for link-level encryption (with ExpressRoute Direct)
- Application-level encryption for sensitive data

### Monitoring and Compliance
- Implement Azure Network Watcher for visibility
- Set up alerts for unusual traffic patterns
- Regularly audit routes and security configurations
- Document compliance with security requirements
