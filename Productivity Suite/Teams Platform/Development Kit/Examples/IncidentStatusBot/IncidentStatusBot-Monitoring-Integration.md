# IncidentStatusBot Monitoring Integration

## Overview

The IncidentStatusBot Monitoring Integration component enables seamless connection between various monitoring platforms and the Teams IncidentStatusBot. This integration serves as a critical bridge that enables real-time incident notifications, automated alerts, and service health information to be communicated directly to the relevant teams via Microsoft Teams.

## Supported Monitoring Platforms

The IncidentStatusBot currently supports integration with the following monitoring platforms:

- **Azure Monitor** - Native integration with Azure's monitoring solution
- **Application Insights** - For application performance monitoring metrics
- **Azure Service Health** - For Azure service status updates and incidents
- **Prometheus** - For Kubernetes and container-based monitoring
- **Grafana** - For visualization and alerting
- **Nagios** - For legacy infrastructure monitoring
- **Zabbix** - For enterprise IT infrastructure monitoring
- **Datadog** - For cloud-scale infrastructure and application monitoring
- **New Relic** - For application performance monitoring
- **PagerDuty** - For incident response orchestration
- **ServiceNow** - For IT service management integration

## Architecture

The monitoring integration uses a webhook-based architecture that allows monitoring systems to push alerts directly to the IncidentStatusBot. This enables real-time notification and response capabilities.

```
┌────────────────────┐      ┌───────────────────┐      ┌─────────────────────┐
│                    │      │                   │      │                     │
│ Monitoring Systems │─────▶│ Azure Function    │─────▶│ IncidentStatusBot   │
│ (Various Sources)  │      │ (Webhook Handler) │      │ (Teams Application) │
│                    │      │                   │      │                     │
└────────────────────┘      └───────────────────┘      └─────────────────────┘
```

## Integration Setup

### Azure Monitor Integration

1. **Create an Action Group in Azure Monitor**:
   - Navigate to Azure Monitor in the Azure Portal
   - Select "Alerts" → "Manage actions"
   - Create a new Action Group
   - Add a Webhook action with the IncidentStatusBot webhook URL

2. **Configure Alert Rules**:
   - Define appropriate alert rules based on your monitoring needs
   - Ensure the Action Group created in the previous step is selected
   - Set appropriate severity levels that will be reflected in Teams notifications

### Application Insights Integration

1. **Configure Smart Detection**:
   - Navigate to Application Insights in Azure Portal
   - Select "Smart Detection"
   - Enable relevant detection rules
   - Add the Action Group created above

2. **Configure Custom Alerts**:
   - Create custom metric alerts as needed
   - Link to the IncidentStatusBot Action Group

### Prometheus Integration

1. **Install the Prometheus Alertmanager**:
   ```bash
   helm install prometheus-alertmanager prometheus-community/prometheus
   ```

2. **Configure Alertmanager to Send Webhooks**:
   Add the following to your `alertmanager.yml` configuration:

   ```yaml
   receivers:
   - name: 'teams-webhook'
     webhook_configs:
     - url: 'https://<your-function-app-url>/api/incidentWebhook'
       send_resolved: true
   ```

3. **Create Alert Rules in Prometheus**:
   ```yaml
   groups:
   - name: service-health
     rules:
     - alert: HighErrorRate
       expr: rate(http_requests_total{status="500"}[5m]) > 1
       for: 2m
       labels:
         severity: critical
       annotations:
         summary: "High error rate detected"
         description: "Error rate is above 1 req/sec for 2+ minutes"
   ```

## Webhook Payload Format

The webhook handler expects a standardized payload format regardless of the source monitoring system. The function app transforms various monitoring system formats into this standardized format.

### Standard Incident Payload Format

```json
{
  "incidentId": "INC-123456",
  "title": "High CPU Usage on Production Server",
  "severity": "Critical",
  "status": "Active",
  "source": "Azure Monitor",
  "timestamp": "2025-05-02T14:30:00Z",
  "description": "CPU usage exceeds 95% for more than 5 minutes on prod-server-01",
  "affectedResources": [
    {
      "id": "prod-server-01",
      "type": "VirtualMachine",
      "location": "East US"
    }
  ],
  "metrics": [
    {
      "name": "CPU Usage",
      "value": "97%",
      "threshold": "90%"
    }
  ],
  "links": [
    {
      "text": "View in Portal",
      "url": "https://portal.azure.com/..."
    }
  ]
}
```

### Source-Specific Payload Transformations

The integration layer handles transformations from source-specific payloads to the standardized format. Some examples include:

#### Azure Monitor

```javascript
function transformAzureMonitorPayload(payload) {
  return {
    incidentId: payload.data.essentials.alertId,
    title: payload.data.essentials.alertRule,
    severity: payload.data.essentials.severity,
    status: payload.data.essentials.monitorCondition,
    source: "Azure Monitor",
    timestamp: payload.data.essentials.firedDateTime,
    description: payload.data.essentials.description || "No description provided",
    affectedResources: [{
      id: payload.data.essentials.targetResourceName,
      type: payload.data.essentials.targetResourceType,
      location: payload.data.essentials.targetResourceGroup
    }],
    metrics: payload.data.alertContext.condition?.allOf.map(c => ({
      name: c.metricName,
      value: c.metricValue,
      threshold: c.threshold
    })) || [],
    links: [{
      text: "View in Azure Portal",
      url: payload.data.essentials.alertLink
    }]
  };
}
```

#### PagerDuty

```javascript
function transformPagerDutyPayload(payload) {
  const incident = payload.messages[0].incident;
  
  return {
    incidentId: incident.incident_number,
    title: incident.title,
    severity: incident.urgency === "high" ? "Critical" : "Warning",
    status: incident.status,
    source: "PagerDuty",
    timestamp: incident.created_at,
    description: incident.description,
    affectedResources: [],
    metrics: [],
    links: [{
      text: "View in PagerDuty",
      url: incident.html_url
    }]
  };
}
```

## Authentication and Security

All webhook endpoints must be properly secured to prevent unauthorized access or spoofing of incidents.

### Secure the Azure Function Endpoints

1. **Function-Level Authentication**:
   - Use function keys to secure your webhook endpoint
   - Store these keys securely in Azure Key Vault

2. **IP Restrictions**:
   - Restrict access to your webhook endpoint to known IP addresses of your monitoring systems
   - Configure this in the Azure Function App's networking settings

3. **Payload Validation**:
   - Implement signature verification for sources that support it (like PagerDuty's X-PagerDuty-Signature)
   - Validate the JSON schema of incoming webhooks

### Example Configuration in Azure Function App Settings

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "...",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WebhookSecretKey": "your-secret-key",
    "AllowedIpAddresses": "1.2.3.4,5.6.7.8",
    "PagerDutyIntegrationKey": "your-pagerduty-key"
  }
}
```

## Recommended Monitoring Configuration

### Critical Infrastructure Monitoring

For critical infrastructure components, configure the following alert thresholds:

| Metric | Warning Threshold | Critical Threshold | Evaluation Period |
|--------|-------------------|-------------------|------------------|
| CPU Usage | >80% | >90% | 5 minutes |
| Memory Usage | >85% | >95% | 5 minutes |
| Disk Space | <15% free | <5% free | 15 minutes |
| Service Availability | <98% | <95% | 5 minutes |
| Error Rate | >1% | >5% | 5 minutes |
| Response Time | >500ms | >1000ms | 5 minutes |

### Application Performance Monitoring

For application-level monitoring, configure:

| Metric | Warning Threshold | Critical Threshold | Evaluation Period |
|--------|-------------------|-------------------|------------------|
| Failed Requests | >0.5% | >2% | 5 minutes |
| Server Response Time | >1s | >3s | 5 minutes |
| Dependency Call Failures | >1% | >5% | 5 minutes |
| Exception Rate | >0.1/min | >1/min | 5 minutes |
| Page Load Time | >3s | >5s | 15 minutes |

## Integration Testing

Before deploying to production, test your monitoring integration thoroughly:

1. **Azure Monitor Test Alert**:
   - Create a test resource with an intentionally triggered alert
   - Verify the alert appears in Teams via the IncidentStatusBot

2. **Manual Webhook Testing**:
   - Use tools like Postman to send test webhooks with sample payloads
   - Verify payload transformation and display in Teams

3. **End-to-End Testing Script**:
   ```bash
   # Example curl command to test webhook
   curl -X POST -H "Content-Type: application/json" \
     -H "x-functions-key: your-function-key" \
     -d @sample-payload.json \
     https://your-function-app.azurewebsites.net/api/incidentWebhook
   ```

## Troubleshooting

### Common Integration Issues

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Alerts not appearing in Teams | Webhook URL misconfiguration | Verify the webhook URL in the monitoring system configuration |
| Incorrect alert formatting | Payload transformation error | Check the function logs for transformation errors |
| Delayed notifications | Azure Function scaling | Consider dedicated App Service Plan for critical workflows |
| Authentication failures | Expired secrets or keys | Rotate and update keys in both systems |
| Missing alert details | Incomplete payload mapping | Update the transformation function to include all needed fields |

### Diagnostic Logging

Enable comprehensive logging in the Azure Function to troubleshoot integration issues:

```javascript
// Example logging in the webhook handler
module.exports = async function (context, req) {
  context.log('Webhook received from monitoring system');
  context.log('Request body:', JSON.stringify(req.body));
  
  try {
    // Process the webhook...
    const standardizedPayload = transformPayload(req.body);
    context.log('Transformed payload:', JSON.stringify(standardizedPayload));
    
    // Send to Teams...
    context.log('Successfully sent to Teams');
  } catch (error) {
    context.log.error('Error processing webhook:', error);
    throw error;
  }
};
```

## Best Practices

1. **Alert Fatigue Prevention**:
   - Carefully set appropriate thresholds to avoid excessive notifications
   - Implement alert grouping to consolidate related incidents
   - Use severity levels appropriately to distinguish between important and critical alerts

2. **Operational Efficiency**:
   - Create Team channels dedicated to specific types of alerts or services
   - Use the IncidentStatusBot's filtering capabilities to route alerts to the right channels
   - Implement auto-resolution notifications to close the loop on incidents

3. **Monitoring Coverage**:
   - Ensure all critical systems are monitored with appropriate alerts
   - Balance monitoring coverage with alert volume to avoid overwhelming responders
   - Regularly review and refine alert definitions and thresholds

4. **Integration Resilience**:
   - Implement retry logic for webhook delivery failures
   - Consider a dead-letter queue for failed notifications
   - Periodically test failover scenarios

## Reference Implementation

A complete reference implementation is available in the ACS GitHub repository, demonstrating a production-ready integration between Azure Monitor and the IncidentStatusBot.

Key components include:

- Azure Function with webhook handlers for multiple monitoring systems
- Transformation logic for standardizing alert payloads
- Teams Bot implementation for receiving and displaying alerts
- Adaptive Cards templates for rich incident visualization

## Related Documentation

- [IncidentStatusBot Overview](./IncidentStatusBot-Overview.md)
- [IncidentStatusBot Deployment Guide](./IncidentStatusBot-Deployment-Guide.md)
- [IncidentStatusBot Live Dashboard Tab](./IncidentStatusBot-Live-Dashboard-Tab.md)
- [IncidentStatusBot Proactive Alerts](./IncidentStatusBot-Proactive-Alerts.md)
- [IncidentStatusBot Service Health Aggregation](./IncidentStatusBot-Service-Health-Aggregation.md)
- [IncidentStatusBot Troubleshooting](./IncidentStatusBot-Troubleshooting.md)

## Support and Feedback

For questions, issues, or enhancement requests related to the IncidentStatusBot Monitoring Integration, contact the ACS Support Team at support@acs-support.com or submit a request through the support portal.
