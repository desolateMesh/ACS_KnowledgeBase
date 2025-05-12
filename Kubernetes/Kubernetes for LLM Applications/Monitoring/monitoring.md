# Monitoring

This module covers the monitoring setup to track the health and performance of your LLM application on Kubernetes.

### Monitoring Tools

- **Prometheus:** For metric collection.
- **Grafana:** To visualize the collected metrics.

### Monitoring Setup

1. **Deploy Prometheus:**
   - Install Prometheus via Helm or direct YAML manifests.
   - Configure Prometheus to scrape metrics from your Kubernetes cluster.

2. **Set Up Grafana:**
   - Link Grafana to Prometheus as a data source.
   - Create dashboards to monitor application performance and resource usage.

### Auto-scaling Configuration

- **Configure Horizontal Pod Autoscaler (HPA):**  
  Example command:
  ```bash
  kubectl autoscale deployment llm-app-deployment --cpu-percent=80 --min=3 --max=10
  ```

### Alerting:
Use Prometheus alerts or integrate with external alerting systems like PagerDuty to get real-time notifications.

This setup ensures continuous monitoring and enables proactive resource adjustments.