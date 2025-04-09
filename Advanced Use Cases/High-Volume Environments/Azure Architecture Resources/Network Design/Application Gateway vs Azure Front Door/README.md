# Application Gateway vs Azure Front Door

This documentation provides a comprehensive comparison between Azure Application Gateway and Azure Front Door, two of Microsoft Azure's load balancing and traffic management services. While both services operate at Layer 7 (HTTP/HTTPS) and share some similarities, they serve different purposes and are designed for different scenarios.

## Overview

### Azure Application Gateway

Azure Application Gateway is a regional web traffic load balancer that enables you to manage traffic to your web applications within a specific Azure region. It operates at Layer 7 (HTTP/HTTPS) and provides advanced routing capabilities, SSL termination, and Web Application Firewall (WAF) protection.

### Azure Front Door

Azure Front Door is a global, scalable entry point that uses Microsoft's global edge network to create fast, secure, and highly scalable web applications. It provides global load balancing, multi-region failover, content acceleration, and WAF protection for applications deployed across multiple regions.

## Contents

This documentation section contains the following files:

1. [Design Patterns](./design-patterns.md) - Common architectural patterns and best practices for using Application Gateway and Front Door, including when to use each or both together.

2. [Implementation Guide](./implementation-guide.md) - Step-by-step instructions for implementing both services, including configuration details, setting up routing rules, health probes, and security features.

3. [Real-World Examples](./real-world-examples.md) - Case studies and scenarios showcasing how organizations have implemented these services to solve specific business problems.

4. [Troubleshooting](./troubleshooting.md) - Common issues and their solutions, best practices for monitoring and maintaining these services, and performance optimization tips.

## Key Differences

| Feature | Azure Application Gateway | Azure Front Door |
|---------|--------------------------|-----------------|
| **Scope** | Regional service | Global service |
| **Primary Purpose** | Regional load balancing | Global load balancing |
| **Load Balancing Level** | Within a virtual network/region | Between regions/scale units |
| **Affinity Control** | Server-level affinity | Region/backend-level affinity |
| **CDN Capabilities** | Limited | Robust CDN features |
| **Health Probes** | Basic health monitoring | Latency-aware routing |
| **Connection Draining** | Supported | Not supported |
| **Path-based Routing** | Within a regional virtual network | At a global level |

## When to Use Which Service

- **Azure Application Gateway**: Best for regional deployments, advanced traffic management within a virtual network, and when you need features like connection draining and server-level affinity.

- **Azure Front Door**: Ideal for global applications that span multiple regions, when you need content acceleration, dynamic site optimization, and global failover capabilities.

- **Both Together**: For complex architectures that require both global traffic management and regional load balancing, where Front Door routes traffic across regions and Application Gateway handles local load balancing within each region.

## References

For more information, refer to the official Microsoft documentation:

- [Azure Application Gateway Documentation](https://learn.microsoft.com/en-us/azure/application-gateway/)
- [Azure Front Door Documentation](https://learn.microsoft.com/en-us/azure/frontdoor/)
