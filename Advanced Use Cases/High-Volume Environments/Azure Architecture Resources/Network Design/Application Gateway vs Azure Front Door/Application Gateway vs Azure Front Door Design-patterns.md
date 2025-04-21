# Design Patterns: Azure Application Gateway vs Azure Front Door

This document outlines the key architectural design patterns for using Azure Application Gateway and Azure Front Door, including scenarios where they can be used separately or together.

## Core Design Patterns

### Pattern 1: Regional Web Application with Application Gateway

**Scenario**: Single-region web application deployment requiring advanced traffic management within the region.

**Architecture**:
```
Internet → Application Gateway → Backend Pools (VMs, App Services, etc.)
```

**Benefits**:
- URL-based routing to different backend pools
- SSL termination at the gateway
- Session affinity for stateful applications
- Connection draining during backend updates
- WAF protection against common web vulnerabilities

**Use Cases**:
- Enterprise web applications hosted on VMs
- Web applications requiring complex routing rules
- Applications that need to maintain session state

### Pattern 2: Global Web Application with Front Door

**Scenario**: Multi-region web application deployment requiring global load balancing and content delivery.

**Architecture**:
```
Internet → Azure Front Door → Backends across multiple regions
```

**Benefits**:
- Global load balancing across regions
- Acceleration of static and dynamic content
- Automated failover between regions
- Edge caching for improved performance
- Global WAF protection

**Use Cases**:
- Modern web applications (SPAs, APIs) requiring global reach
- Content-heavy websites needing performance optimization
- Applications requiring high availability across regions

### Pattern 3: Layered Approach with Front Door and Application Gateway

**Scenario**: Complex global application requiring both global traffic management and regional traffic optimization.

**Architecture**:
```
Internet → Azure Front Door → Application Gateway (Region 1) → Backend Pool 1
                          → Application Gateway (Region 2) → Backend Pool 2
```

**Benefits**:
- Global routing to the nearest region (Front Door)
- Advanced regional routing within each region (Application Gateway)
- Multi-layered security with WAF at both global and regional levels
- Optimized performance through CDN capabilities and regional traffic management

**Use Cases**:
- Enterprise applications requiring both global reach and complex regional routing
- High-security applications needing defense in depth
- Applications with different backend types across regions

### Pattern 4: Private Applications with Front Door Premium and Private Link

**Scenario**: Secure access to internal applications without public exposure.

**Architecture**:
```
Internet → Azure Front Door Premium → Private Link → Internal Applications
```

**Benefits**:
- Zero trust security model with private connectivity
- No public exposure of backend resources
- Global access to internal applications
- Central WAF protection for all applications

**Use Cases**:
- Internal line-of-business applications requiring external access
- Applications with strict security and compliance requirements
- Multi-tenant SaaS applications requiring tenant isolation

## Specialized Design Patterns

### Pattern 5: API Gateway Offloading

**Scenario**: Using Front Door or Application Gateway to offload common API gateway functionality.

**Architecture Options**:
- For global APIs: `Internet → Front Door → API Backends`
- For regional APIs: `Internet → Application Gateway → API Backends`

**Offloaded Functionality**:
- Authentication and authorization
- Rate limiting (Front Door only)
- Request/response transformation
- Caching common responses
- Monitoring and analytics

### Pattern 6: Microservices Routing

**Scenario**: Microservices-based application with multiple service endpoints.

**Architecture**:
```
Internet → Front Door → Application Gateway → Microservice 1
                                          → Microservice 2
                                          → Microservice 3
```

**Benefits**:
- Path-based routing to different microservices
- Independent scaling of each microservice
- Centralized security and authentication
- Consistent client experience with a single endpoint

### Pattern 7: Zero Trust Network Access

**Scenario**: Implementing zero trust principles for application access.

**Architecture**:
```
Internet → Front Door Premium with WAF → Private Link → Internal Applications
```

**Security Features**:
- WAF protection at the edge
- Private connectivity to backends
- Header-based authentication
- No direct internet exposure for backend resources

## Decision Framework

When deciding between Azure Application Gateway and Azure Front Door, consider the following:

### Use Application Gateway When:
- Your application is deployed in a single region
- You need advanced traffic routing within a virtual network
- You require connection draining capabilities
- You need server-level (not just backend-level) affinity
- You're routing traffic to VMs, containers, or specific endpoints within a region

### Use Front Door When:
- Your application spans multiple regions
- Global load balancing is required
- You need content caching and acceleration
- You want automatic failover across regions
- You're looking for a combined CDN and global load balancing solution

### Use Both Together When:
- You need both global routing and complex regional traffic management
- You want layered security with WAF at both global and regional levels
- Your architecture includes a mix of public and private endpoints
- You have different types of backends across regions that require different routing rules

## Integration with Other Azure Services

### Application Gateway Integrations:
- **Azure Kubernetes Service (AKS)**: Using Application Gateway Ingress Controller
- **Azure Firewall**: For layered security with Application Gateway in front or behind
- **Azure API Management**: For complete API management scenarios
- **Azure Web Application Firewall**: For enhanced security posture

### Front Door Integrations:
- **Azure CDN**: For enhanced content delivery capabilities
- **Azure DNS**: For domain management
- **Azure Monitor**: For real-time monitoring and alerts
- **Azure Private Link**: For private connectivity to backends (Premium tier)

## Best Practices for Combined Deployments

1. **Origin Protection**: When using both services, configure Application Gateway to only accept traffic from Front Door to prevent bypass attacks.

2. **Health Probe Consistency**: Ensure health probe configurations are consistent between Front Door and Application Gateway to prevent routing inconsistencies.

3. **Header Preservation**: Configure Application Gateway to preserve original client information using X-Forwarded-For headers.

4. **WAF Policy Alignment**: When using WAF on both services, ensure policies are aligned to prevent conflicts.

5. **Traffic Manager as Fallback**: In mission-critical scenarios, consider putting Traffic Manager in front of Front Door (not behind) for additional resilience.
