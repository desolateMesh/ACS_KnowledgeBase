# Troubleshooting Guide: Azure Application Gateway and Front Door

This comprehensive troubleshooting guide addresses common issues, diagnostic approaches, and best practices for maintaining Azure Application Gateway and Azure Front Door services.

## Common Issues and Solutions

### Application Gateway Issues

#### 1. Backend Health Probe Failures

**Symptoms**:
- 502 Bad Gateway errors
- Backend servers showing as unhealthy in the portal
- Intermittent connectivity to applications

**Possible Causes**:
- Backend server not responding on the configured port/protocol
- Network Security Group (NSG) blocking probe traffic
- Custom health probe path not existing on the backend
- Backend server overloaded or timing out

**Solutions**:
1. Verify backend server is running and accepting connections on the configured port
2. Check NSG rules to ensure they allow traffic from GatewayManager service tag
3. Validate health probe path exists and returns HTTP 200
4. Increase health probe timeout if backend is slow to respond
5. Review Application Gateway logs to identify specific error codes

#### 2. SSL Certificate Issues

**Symptoms**:
- SSL handshake failures
- Certificate warnings in browsers
- 502 errors when using HTTPS

**Possible Causes**:
- Expired certificate
- Certificate chain incomplete
- Private key missing from PFX
- Certificate name mismatch with hostname
- Incompatible TLS version

**Solutions**:
1. Check certificate expiration date
2. Ensure PFX file contains the complete certificate chain
3. Verify certificate hostname matches listener hostname
4. Confirm TLS version compatibility between client, Application Gateway, and backend
5. For end-to-end SSL, verify backend certificate is trusted by Application Gateway

#### 3. Performance and Scaling Issues

**Symptoms**:
- High latency
- Request timeouts
- 503 Service Unavailable errors during high traffic

**Possible Causes**:
- Insufficient capacity (Application Gateway v1)
- Backend not scaling to meet demand
- Application Gateway hitting limits
- Incorrect SKU for traffic volume

**Solutions**:
1. For v1 SKU, increase instance count
2. For v2 SKU, verify autoscaling settings
3. Check backend performance and scaling capabilities
4. Monitor CpuUtilization and CapacityUnits metrics
5. Consider upgrading to v2 SKU for better autoscaling

#### 4. WAF Rule Blocking Legitimate Traffic

**Symptoms**:
- Legitimate requests failing with 403 Forbidden
- Applications partially working
- Specific functionality broken

**Possible Causes**:
- WAF rule triggering on legitimate traffic
- False positives in WAF detection
- Incompatible application code

**Solutions**:
1. Review WAF logs to identify triggering rules
2. Create exclusions for specific rules, request elements, or sources
3. Temporarily switch to Detection mode to identify issues
4. Use custom rules to refine protection
5. Consider adjusting application code to avoid known triggers

### Front Door Issues

#### 1. Origin Health Probe Failures

**Symptoms**:
- Traffic not reaching specific backends
- Failover not working as expected
- Traffic routing to suboptimal backends

**Possible Causes**:
- Backend service unhealthy or overloaded
- Health probe configuration incorrect
- Origin not accepting traffic from Front Door
- Network connectivity issues

**Solutions**:
1. Verify backend service is operational
2. Review health probe settings (path, interval, protocol)
3. Ensure origin is configured to accept Front Door traffic
4. Check if health probe response is HTTP 200
5. Review Front Door logs for specific failure reasons

#### 2. Caching and Purge Issues

**Symptoms**:
- Outdated content being served
- Changes not appearing for users
- Inconsistent content across regions

**Possible Causes**:
- Cache not being purged after content updates
- Caching configuration issues
- Cache-Control headers conflicting with Front Door settings
- Partial content updates

**Solutions**:
1. Manually purge cache after content updates
2. Review caching rules and duration settings
3. Check origin's Cache-Control headers
4. Implement versioned URLs for content that changes frequently
5. Use query strings for dynamic content that shouldn't be cached

#### 3. Custom Domain and Certificate Issues

**Symptoms**:
- Certificate errors in browsers
- Domain validation failures
- Custom domain not working

**Possible Causes**:
- CNAME record not properly configured
- Domain ownership validation pending
- Certificate provisioning delay
- Minimum TLS version incompatibility

**Solutions**:
1. Verify CNAME records match Front Door requirements
2. Complete domain validation process
3. Allow sufficient time for certificate provisioning (up to 24 hours)
4. Check client TLS version compatibility
5. For custom certificates, ensure they meet Front Door requirements

#### 4. Routing Rule Configuration Issues

**Symptoms**:
- Traffic going to wrong backends
- Routes not matching expected patterns
- Redirects not working properly

**Possible Causes**:
- Rule priority misconfiguration
- Pattern matching issues
- Conflicting route definitions
- Forwarding configuration problems

**Solutions**:
1. Review rule priorities and ordering
2. Check pattern definitions for accuracy
3. Verify origin group and backend settings
4. Test routing patterns with sample requests
5. Consider simplifying complex routing rules

## Combined Front Door and Application Gateway Issues

#### 1. End-to-End Connectivity Problems

**Symptoms**:
- Client can reach Front Door but not Application Gateway
- Internal server errors when connecting through the full chain
- Intermittent connectivity issues

**Possible Causes**:
- Application Gateway not accepting traffic from Front Door
- Header transformation issues
- Protocol or TLS version mismatches
- Session affinity inconsistencies

**Solutions**:
1. Configure Application Gateway to accept traffic only from Front Door
2. Ensure consistent protocol handling across the chain
3. Verify header transformation settings
4. Align session affinity settings between services
5. Test direct connectivity to Application Gateway to isolate issues

#### 2. WAF Policy Conflicts

**Symptoms**:
- Legitimate traffic blocked inconsistently
- Duplicate security alerts
- Unexpected traffic handling

**Possible Causes**:
- Conflicting WAF rules between Front Door and Application Gateway
- Duplicate blocking at different layers
- Inconsistent rule sets or exclusions

**Solutions**:
1. Decide which layer should handle specific security functions
2. Align WAF policies across layers
3. Create consistent exclusion lists
4. Consider dedicating specific security functions to specific layers
5. Use X-Azure-FDID header to validate traffic came through Front Door

#### 3. Performance Bottlenecks in Multi-Layer Setup

**Symptoms**:
- High latency despite global distribution
- Capacity issues during high traffic
- Unexpected throttling or backpressure

**Possible Causes**:
- Application Gateway undersized compared to Front Door capacity
- Backend not scaling to match Front Door traffic
- Inefficient routing between layers
- Connection pooling or timeout misconfigurations

**Solutions**:
1. Size Application Gateway appropriately for expected traffic from Front Door
2. Implement appropriate auto-scaling for all components
3. Optimize timeout settings between layers
4. Ensure efficient connection pooling and reuse
5. Monitor capacity metrics at each layer to identify bottlenecks

## Diagnostic Approaches

### Application Gateway Diagnostics

#### Log and Metric Analysis

1. **Enable Diagnostic Settings**:
   ```bash
   az monitor diagnostic-settings create \
     --resource $appGatewayId \
     --name AppGatewayDiagnostics \
     --storage-account $storageAccountId \
     --workspace $workspaceId \
     --logs '[{"category":"ApplicationGatewayAccessLog","enabled":true},
             {"category":"ApplicationGatewayPerformanceLog","enabled":true},
             {"category":"ApplicationGatewayFirewallLog","enabled":true}]' \
     --metrics '[{"category":"AllMetrics","enabled":true}]'
   ```

2. **Key Metrics to Monitor**:
   - BackendResponseLatency
   - FailedRequests
   - HealthyHostCount
   - ResponseStatus
   - Throughput
   - UnhealthyHostCount
   - ComputeUnits

3. **Log Queries for Common Issues**:
   - Health probe failures:
     ```
     AzureDiagnostics
     | where ResourceType == "APPLICATIONGATEWAYS" 
     | where OperationName == "ApplicationGatewayProbe" 
     | where httpStatus_d != 200
     | summarize count() by httpStatus_d, host_s, backendPoolName_s
     ```
   - Client errors:
     ```
     AzureDiagnostics
     | where ResourceType == "APPLICATIONGATEWAYS" 
     | where httpStatus_d >= 400
     | summarize count() by httpStatus_d, requestUri_s, userAgent_s
     ```

#### Backend Health Investigation

1. Test direct connectivity to backend:
   ```bash
   # For HTTP backends
   curl -v http://backend-server:port/path
   
   # For HTTPS backends
   curl -v --insecure https://backend-server:port/path
   ```

2. Verify NSG rules:
   ```bash
   az network nsg rule list --resource-group myResourceGroup --nsg-name myNSG --output table
   ```

3. Check backend server logs coinciding with health probe attempts

### Front Door Diagnostics

#### Log and Metric Analysis

1. **Enable Diagnostic Settings**:
   ```bash
   az monitor diagnostic-settings create \
     --resource $frontDoorId \
     --name FrontDoorDiagnostics \
     --storage-account $storageAccountId \
     --workspace $workspaceId \
     --logs '[{"category":"FrontdoorAccessLog","enabled":true},
             {"category":"FrontdoorWebApplicationFirewallLog","enabled":true}]' \
     --metrics '[{"category":"AllMetrics","enabled":true}]'
   ```

2. **Key Metrics to Monitor**:
   - RequestCount
   - BackendRequestCount
   - BackendHealthPercentage
   - TotalLatency
   - BackendRequestLatency
   - OriginHealthPercentage

3. **Log Queries for Common Issues**:
   - Origin health failures:
     ```
     AzureDiagnostics
     | where ResourceType == "FRONTDOORS" 
     | where OperationName == "OriginHealthProbeResult" 
     | where isHealthy_b == false
     | summarize count() by origin_s, timestamp
     ```
   - Client and backend errors:
     ```
     AzureDiagnostics
     | where ResourceType == "FRONTDOORS" 
     | where httpStatusCode_d >= 400
     | summarize count() by httpStatusCode_d, requestUri_s
     ```

#### WAF and Security Analysis

1. Analyze WAF blocks:
   ```
   AzureDiagnostics
   | where ResourceType == "FRONTDOORS" 
   | where action_s == "Block"
   | summarize count() by clientIP_s, ruleName_s, requestUri_s
   ```

2. Verify rule matches:
   ```
   AzureDiagnostics
   | where ResourceType == "FRONTDOORS" 
   | where ruleSetType_s == "Microsoft_DefaultRuleSet"
   | summarize count() by ruleName_s, requestUri_s
   ```

## Preventative Measures and Best Practices

### Monitoring and Alerting

#### Application Gateway Alerts

1. **Health Probe Status Alert**:
   ```json
   {
     "criteria": {
       "metricName": "UnhealthyHostCount",
       "dimensions": [],
       "operator": "GreaterThan",
       "threshold": 0,
       "timeAggregation": "Average"
     },
     "description": "Alert when any backend becomes unhealthy",
     "enabled": true,
     "evaluationFrequency": "PT1M",
     "severity": 2,
     "windowSize": "PT5M"
   }
   ```

2. **High Backend Latency Alert**:
   ```json
   {
     "criteria": {
       "metricName": "BackendResponseLatency",
       "dimensions": [],
       "operator": "GreaterThan",
       "threshold": 100,
       "timeAggregation": "Average"
     },
     "description": "Alert when backend latency exceeds 100ms",
     "enabled": true,
     "evaluationFrequency": "PT1M",
     "severity": 2,
     "windowSize": "PT5M"
   }
   ```

#### Front Door Alerts

1. **Origin Health Alert**:
   ```json
   {
     "criteria": {
       "metricName": "OriginHealthPercentage",
       "dimensions": [],
       "operator": "LessThan",
       "threshold": 90,
       "timeAggregation": "Average"
     },
     "description": "Alert when origin health drops below 90%",
     "enabled": true,
     "evaluationFrequency": "PT1M",
     "severity": 2,
     "windowSize": "PT5M"
   }
   ```

2. **Unusual Traffic Alert**:
   ```json
   {
     "criteria": {
       "metricName": "RequestCount",
       "dimensions": [],
       "operator": "GreaterThan",
       "threshold": "[your baseline + buffer]",
       "timeAggregation": "Total"
     },
     "description": "Alert on unusual traffic patterns",
     "enabled": true,
     "evaluationFrequency": "PT5M",
     "severity": 3,
     "windowSize": "PT15M"
   }
   ```

### Maintenance and Update Strategies

1. **Certificate Renewal Process**:
   - Set up alerts for certificates approaching expiration (60-90 days in advance)
   - Use automated certificate management where possible
   - Maintain an inventory of certificates with expiration dates
   - Test certificate rollover procedures periodically

2. **Regular Health Checks**:
   - Implement synthetic monitoring tests that verify end-to-end functionality
   - Test failover scenarios quarterly
   - Validate WAF rule effectiveness periodically
   - Review performance metrics to identify trends or degradation

3. **Configuration Backup and Version Control**:
   - Use ARM templates or Terraform to maintain infrastructure as code
   - Version control all configuration changes
   - Document configuration decisions and rationales
   - Implement peer review for configuration changes

## Advanced Troubleshooting Techniques

### Network Tracing and Traffic Analysis

1. **Network Watcher Packet Capture** (for Application Gateway):
   ```bash
   az network watcher packet-capture create \
     --resource-group myResourceGroup \
     --name AppGwCapture \
     --target-resource-id $appGatewayId \
     --storage-account $storageAccountId \
     --filters "[{\"protocol\":\"TCP\", \"remoteIPAddress\":\"*\", \"localIPAddress\":\"*\"}]"
   ```

2. **Client-Side Network Tracing**:
   - Use browser developer tools to analyze network requests
   - Check for TLS handshake failures
   - Analyze response headers for caching directives
   - Identify redirect chains and potential loops

3. **Backend Connection Validation**:
   - Test connectivity from jumpbox VMs in the same network
   - Use tcpdump or Wireshark to capture backend traffic
   - Verify correct TLS versions and cipher suites

### Performance Optimization

1. **Application Gateway Performance Tuning**:
   - Right-size instance count or enable autoscaling for v2 SKU
   - Implement connection draining for backend maintenance
   - Configure appropriate request timeout settings
   - Use URL path-based routing efficiently

2. **Front Door Performance Optimization**:
   - Implement effective caching strategies
   - Configure compression for appropriate content types
   - Use dynamic site acceleration for dynamic content
   - Configure appropriate origin response timeout settings

3. **End-to-End Optimization**:
   - Minimize the number of redirects in the application
   - Optimize static content delivery with proper caching
   - Implement CDN for static assets
   - Configure session affinity only when necessary

## Disaster Recovery Planning

### Front Door Disaster Recovery Scenarios

1. **Region Failure Handling**:
   - Configure multiple origins across different regions
   - Set appropriate health probe sensitivity
   - Test failover scenarios regularly

2. **Global Front Door Issues**:
   - Consider Traffic Manager as a backup for critical systems
   - Implement DNS fallback strategies for extreme scenarios

### Application Gateway Disaster Recovery

1. **Gateway Failure Recovery**:
   - For critical applications, deploy redundant Application Gateways
   - Maintain configuration backups for quick recovery
   - Document manual recovery procedures

2. **Zone-Redundant Deployment** (v2 SKU):
   - Deploy Application Gateway v2 with zone redundancy
   - Configure backends across availability zones
   - Test zone failure scenarios

## Common Error Codes and Troubleshooting

### Application Gateway Error Codes

| Error Code | Description | Troubleshooting Steps |
|------------|-------------|----------------------|
| 502 Bad Gateway | Backend server not responding or rejecting connection | Check backend health, NSG rules, application availability |
| 503 Service Unavailable | Gateway is overloaded or in maintenance | Check capacity, scaling settings, backend availability |
| 504 Gateway Timeout | Backend server taking too long to respond | Increase timeout settings, check backend performance |
| 403 Forbidden | WAF rule blocking request | Check WAF logs, create exclusions if needed |
| 400 Bad Request | Invalid request to Application Gateway | Check client request format, headers, URL structure |

### Front Door Error Codes

| Error Code | Description | Troubleshooting Steps |
|------------|-------------|----------------------|
| AFD400 | Invalid request | Verify client request format and structure |
| AFD401 | Authentication failure | Check authentication requirements and credentials |
| AFD403 | Access forbidden (WAF or geo-filtering) | Review WAF logs, geo-filtering settings |
| AFD404 | Resource not found | Verify route patterns and backend URL paths |
| AFD405 | Method not allowed | Check HTTP methods allowed by backend |
| AFD413 | Payload too large | Verify request size limits, adjust if needed |
| AFD415 | Unsupported media type | Check content-type requirements |
| AFD429 | Too many requests | Review rate limiting settings |
| AFD500 | Internal server error | Check backend functionality |
| AFD501 | Not implemented | Verify backend feature support |
| AFD502 | Bad gateway | Check origin health and connectivity |
| AFD503 | Service unavailable | Verify backend availability |
| AFD504 | Gateway timeout | Increase timeout settings, check backend performance |

## Troubleshooting Decision Trees

### Application Gateway Connectivity Issues

1. **Client can't reach Application Gateway**
   - Is the frontend public IP accessible? → Yes → Continue / No → Check NSG rules
   - Is DNS resolving correctly? → Yes → Continue / No → Fix DNS configuration
   - Is the client sending to correct protocol/port? → Yes → Continue / No → Correct client configuration
   - Is there a firewall blocking access? → Yes → Update firewall rules / No → Continue
   - Is WAF blocking the request? → Yes → Check WAF logs and rules / No → Check backend health

2. **Application Gateway can't reach backend**
   - Is the backend responding to health probes? → Yes → Continue / No → Check backend health
   - Are backend NSG rules allowing traffic? → Yes → Continue / No → Update NSG rules
   - Is backend overloaded? → Yes → Scale backend / No → Continue
   - Is backend certificate valid (for HTTPS)? → Yes → Continue / No → Update certificate
   - Check backend logs for specific errors

### Front Door Routing Issues

1. **Client request not reaching correct backend**
   - Is the route pattern matching? → Yes → Continue / No → Update route pattern
   - Is origin group properly configured? → Yes → Continue / No → Check origin group settings
   - Are origins healthy? → Yes → Continue / No → Check origin health
   - Is there a caching issue? → Yes → Purge cache / No → Continue
   - Check routing rules priority and ordering

2. **Front Door not properly failing over**
   - Are health probes correctly configured? → Yes → Continue / No → Update health probe settings
   - Is origin group failover configured? → Yes → Continue / No → Configure failover
   - Are all origins unhealthy? → Yes → Fix origin issues / No → Check origin priority and weights
   - Is the latency-based routing working correctly? → Yes → Continue / No → Review network topology

## Security Troubleshooting

### WAF Issues and Remediation

1. **Legitimate traffic being blocked**
   - Identify specific rule triggering in WAF logs
   - Create exclusion for specific rule and request component
   - Consider custom rule to allow specific patterns
   - Balance security with functionality requirements

2. **Malicious traffic not being blocked**
   - Review WAF mode (Detection vs. Prevention)
   - Verify rule sets are properly enabled
   - Create custom rules for specific attack patterns
   - Consider using rate limiting for suspicious clients

### Origin Protection

1. **Ensuring traffic only comes through Front Door**
   - Configure Application Gateway to check for X-Azure-FDID header
   - Set up NSG rules to allow only Front Door IPs
   - Implement custom header validation in your application
   - Use Front Door Premium with Private Link for critical systems

## Performance Optimization Guidelines

### Application Gateway Performance Tuning

1. **Capacity Planning**
   - For v1 SKU: Size based on peak traffic (+30% buffer)
   - For v2 SKU: Configure appropriate min/max instance counts
   - Monitor capacity units and adjust as needed

2. **Timeout Optimization**
   - Request timeout: Set based on expected backend response time
   - Connection timeout: Balance between resource utilization and availability
   - Idle timeout: Optimize based on client behavior

### Front Door Performance Settings

1. **Caching Strategies**
   - Cache static content with appropriate TTL
   - Use query string parameters to version dynamic content
   - Configure cache rules based on content type
   - Implement cache purge automation for content updates

2. **Routing Optimization**
   - Configure appropriate origin priorities and weights
   - Use latency-based routing for performance-sensitive applications
   - Set health probe intervals based on application stability
   - Optimize origin response timeout settings

## Integration with Azure Monitor and Application Insights

### Application Gateway Monitoring

1. **Azure Monitor Integration**:
   - Configure diagnostic settings to send logs to Log Analytics
   - Create dashboards with key performance metrics
   - Set up proactive alerts for capacity, health, and errors
   - Use Application Insights for end-to-end transaction monitoring

2. **Sample Monitoring Dashboard**:
   - Backend Health Status
   - Request Count by Status Code
   - Latency Metrics (Total, Backend)
   - Capacity Utilization
   - WAF Rule Triggers

### Front Door Monitoring

1. **Azure Monitor Integration**:
   - Configure diagnostic settings to send logs to Log Analytics
   - Create dashboards for global performance view
   - Set up alerts for origin health changes
   - Monitor backend latency across regions

2. **Sample KQL Queries**:
   - Request distribution by region:
     ```
     AzureDiagnostics
     | where ResourceType == "FRONTDOORS"
     | summarize RequestCount=count() by clientCountry_s, bin(TimeGenerated, 1h)
     | render timechart
     ```
   - Backend performance:
     ```
     AzureDiagnostics
     | where ResourceType == "FRONTDOORS"
     | summarize AvgLatency=avg(backendLatency_d) by backend_s, bin(TimeGenerated, 5m)
     | render timechart
     ```

## Real-World Troubleshooting Scenarios

### Scenario 1: Intermittent 502 Errors

**Problem Description**:
Users reporting intermittent 502 Bad Gateway errors when accessing the application through Front Door, especially during peak hours.

**Troubleshooting Steps**:
1. Check Front Door metrics for backend health:
   - Verify if specific origins show degraded health percentages
   - Analyze backend response latency during error periods

2. Review Application Gateway metrics:
   - Check for capacity constraints (high CPU utilization)
   - Verify backend pool health status

3. Analyze backend application logs:
   - Look for timeout or connection issues
   - Check for resource constraints (memory, CPU)

4. Solution: Implement auto-scaling for Application Gateway and backend services, increase timeout settings, and optimize backend application performance.

### Scenario 2: WAF Blocking Legitimate Traffic

**Problem Description**:
After enabling WAF in Prevention mode, specific application functionality stops working, but no obvious errors appear in application logs.

**Troubleshooting Steps**:
1. Review WAF logs for blocked requests:
   - Identify specific rule IDs triggering blocks
   - Analyze request patterns causing blocks

2. Test in WAF Detection mode:
   - Temporarily switch to Detection mode
   - Monitor which legitimate requests would have been blocked

3. Create targeted exclusions:
   - Exclude specific rules for specific URL paths
   - Configure exclusions for specific request elements (headers, body, cookies)

4. Solution: Implement precise WAF exclusions for specific rules and paths while maintaining security for other parts of the application.

### Scenario 3: Global Performance Degradation

**Problem Description**:
Users in certain regions experiencing significantly slower performance than others, despite having regional deployments.

**Troubleshooting Steps**:
1. Analyze Front Door routing behavior:
   - Check if traffic is routing to optimal regions
   - Verify latency metrics by region

2. Investigate regional Application Gateway performance:
   - Check backend response latency in affected regions
   - Verify capacity and scaling settings

3. Evaluate network path:
   - Use Network Watcher to analyze routing
   - Check for network congestion or restrictions

4. Solution: Optimize regional deployment capacity, implement or improve caching strategies, and fine-tune Front Door routing priorities and weights.

## Reference Architecture Templates

### Multi-Region High Availability Architecture

```
Internet → Azure Front Door [WAF]
                          → [Region 1] Application Gateway [WAF] → Web Tier → App Tier → Data Tier
                          → [Region 2] Application Gateway [WAF] → Web Tier → App Tier → Data Tier
                          → Azure CDN → Static Content Storage
```

**Key Configuration Points**:
- Front Door: Global routing, WAF for edge security, health probes for failover
- Application Gateway: Regional routing, SSL termination, session affinity
- WAF Policies: Coordinated between Front Door and Application Gateway
- Health Probes: Configured at both levels with appropriate intervals and thresholds

### Secure Private Application Architecture

```
Internet → Azure Front Door Premium [WAF]
                                  → Private Link → [Region 1] Application Gateway → Private Services
                                  → Private Link → [Region 2] Application Gateway → Private Services
```

**Key Configuration Points**:
- Front Door Premium: WAF, Private Link support, custom domains
- Private Link: Secure private connectivity to backend services
- Application Gateway: Internal deployment with private IP
- NSG Rules: Configured to allow only Front Door traffic

## Conclusion and Best Practices Summary

### Key Takeaways

1. **Layered Defense**: Implement security at both global (Front Door) and regional (Application Gateway) levels.

2. **Proper Monitoring**: Configure comprehensive logging and alerting for both services.

3. **Performance Optimization**: Balance security controls with performance requirements.

4. **Regular Testing**: Conduct regular failover tests and security assessments.

5. **Configuration as Code**: Maintain infrastructure configuration in version-controlled templates.

### Best Practices Checklist

- [ ] WAF policies implemented and regularly updated
- [ ] Health probes configured appropriately for application needs
- [ ] SSL certificates managed with automation and alerting
- [ ] Diagnostic logging enabled and sent to Log Analytics
- [ ] Alerts configured for critical metrics
- [ ] Disaster recovery procedures documented and tested
- [ ] Performance baselines established and monitored
- [ ] Security headers and policies implemented
- [ ] Origin protection configured
- [ ] Caching strategies optimized for content types

By following this troubleshooting guide, you can effectively diagnose and resolve issues with Azure Application Gateway and Azure Front Door deployments, ensuring optimal performance, security, and availability for your applications.
