# Custom Metrics Scaling

## Overview

This document covers advanced scaling techniques for Azure Functions using custom metrics. While Azure Functions provides automatic scaling for many scenarios, custom metrics scaling enables more precise control over when and how your function apps scale to match specific application needs.

## Understanding Custom Metrics Scaling

Custom metrics scaling allows Azure Functions to scale based on application-specific metrics instead of relying solely on built-in platform metrics like request count or queue length. This approach is part of a broader auto-scaling strategy that dynamically allocates resources to match performance requirements.

## Key Benefits

- **Business-Aligned Scaling**: Scale based on metrics that directly reflect business value
- **Proactive Capacity Management**: Anticipate load changes before they affect performance
- **Cost Optimization**: Fine-tune scaling thresholds to balance performance and cost
- **Application-Specific Insights**: Base scaling decisions on the metrics most relevant to your application

## Implementation Approaches

### 1. Using Azure Monitor Custom Metrics

You can leverage the Azure Monitor platform to send custom metrics from your function code. This approach allows you to:

- Define application-specific metrics
- Create scaling rules based on these metrics
- Monitor and adjust scaling behavior

Implementation steps:

1. Instrument your application to emit custom metrics
2. Configure autoscale settings in the Azure portal
3. Define scaling rules using your custom metrics
4. Set appropriate thresholds and scaling actions

### 2. Event-Driven Scaling with Custom Logic

Azure Functions provides hosting plans with different scaling behaviors. The Consumption plan and Premium plan offer event-driven scaling capabilities that can be customized to your needs.

Key considerations:

- **Scale Units**: The function app is the unit of scale. When scaled out, more resources are allocated to run multiple instances of the Azure Functions host.
- **Scale Controller**: Monitors triggers and determines when to scale
- **Scale Decisions**: Based on the type of trigger and configured rules

### 3. Metric-Based Autoscaling

For more advanced scenarios, you can implement metric-based autoscaling:

1. **Identify Key Metrics**:
   - Processing time per request
   - Memory usage patterns
   - Business transaction rates
   - Integration point latency

2. **Configure Scaling Rules**:
   - Set minimum and maximum instance counts
   - Define scale-out and scale-in thresholds
   - Configure appropriate cool-down periods

3. **Test and Optimize**:
   - Verify scaling behavior under load
   - Adjust thresholds based on performance data
   - Monitor for cost efficiency

## Best Practices

When implementing custom metrics scaling for Azure Functions:

1. **Understand Your Workload Patterns**:
   - Analyze historical usage patterns
   - Identify peak usage times
   - Consider seasonal variations

2. **Set Appropriate Thresholds**:
   - Avoid over-sensitive scaling triggers
   - Include buffer capacity for sudden spikes
   - Consider scale-in conservatively to avoid thrashing

3. **Implement Proper Monitoring**:
   - Track scaling events
   - Monitor instance count over time
   - Correlate scaling with application performance

4. **Test at Scale**:
   - Verify behavior under expected and unexpected loads
   - Ensure scaling doesn't introduce instability
   - Validate cost models against actual scaling patterns

## Example: Custom Metric Implementation

Here's a simplified example of sending a custom metric from an Azure Function that could be used for scaling decisions:

```csharp
// Track a custom metric for queue processing time
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.Extensibility;

public static class QueueProcessor
{
    private static TelemetryClient telemetryClient = new TelemetryClient(TelemetryConfiguration.CreateDefault());

    [FunctionName("QueueProcessor")]
    public static async Task Run(
        [QueueTrigger("myqueue-items")] string myQueueItem,
        ILogger log)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        // Process the queue item
        await ProcessQueueItem(myQueueItem);
        
        stopwatch.Stop();
        
        // Track the processing time as a custom metric
        telemetryClient.TrackMetric("QueueProcessingTime", stopwatch.ElapsedMilliseconds);
        
        log.LogInformation($"C# Queue trigger function processed: {myQueueItem}");
    }
}
```

With this custom metric in place, you can create scaling rules based on the average queue processing time across instances.

## Advanced Scenarios

### Integration with Business Metrics

Connect your scaling rules to business metrics by:

1. Tracking business transactions per second
2. Monitoring conversion rates or other KPIs
3. Scaling based on revenue-generating activities

### Predictive Scaling

Implement predictive scaling by:

1. Analyzing historical patterns
2. Pre-scaling before anticipated events
3. Using machine learning to predict load

## Conclusion

Custom metrics scaling provides fine-grained control over Azure Functions scalability. By defining metrics that align with your application's specific characteristics, you can create scaling rules that optimize for both performance and cost.

## References

- [Microsoft Learn - Autoscaling Guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/auto-scaling)
- [Microsoft Learn - Azure Functions Scale and Hosting](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Microsoft Learn - Event-driven Scaling in Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/event-driven-scaling)
- [Microsoft Learn - Autoscale in Azure using a Custom Metric](https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-custom-metric)

# Event-Driven Autoscaling

## Overview

This document explores the implementation of event-driven autoscaling for Azure Functions. Event-driven autoscaling allows your function apps to dynamically respond to incoming workloads, scaling out during high demand and scaling in when resource needs decrease, all without manual intervention.

## Understanding Event-Driven Scaling

Azure Functions provides built-in event-driven scaling capabilities that monitor the rate of events and add or remove compute resources based on need. This approach enables functions to process events efficiently while optimizing resource usage.

## Scaling Behavior by Hosting Plan

### Consumption Plan

The Consumption plan represents the fully serverless hosting option for Azure Functions with these key characteristics:

- **Scale Trigger**: Scales based on event rate and execution duration
- **Scale Units**: Functions scale at the function app level, not individual functions
- **Instance Limits**: Default limit of 200 instances, configurable up to 100-300 depending on region
- **Cold Start**: New instances may experience cold start latency
- **Cost Model**: Pay only for execution time and resources used, billed per second

### Premium Plan

The Premium plan provides enhanced capabilities with predictable pricing:

- **Scale Trigger**: Same event-based scaling as Consumption plan
- **Pre-warmed Instances**: Maintains a specified number of instances to eliminate cold starts
- **Scaling Speed**: Faster scaling with pre-allocated infrastructure
- **Higher Limits**: Supports higher memory and longer execution duration
- **Cost Model**: Pay for allocated instances regardless of execution, with a minimum of one instance always running

### Dedicated (App Service) Plan

The App Service plan runs functions on dedicated VMs:

- **Manual Scaling**: No automatic event-driven scaling by default
- **VM Resources**: Access to all resources on the VM instance
- **Predictability**: Consistent performance with fixed resources
- **Integration**: Works well with existing App Service deployments

## Scaling Properties and Limits

When implementing event-driven autoscaling, consider these key properties:

| Property | Consumption Plan | Premium Plan |
|----------|------------------|--------------|
| Always Ready Instances | 0 (scale to zero) | 1+ (configurable) |
| Maximum Instances | 200-300 | 100 |
| Scale Decision Time | 1-2 minutes | 30 seconds |
| Memory per Instance | Up to 1.5 GB | Up to 14 GB |
| Function Timeout | 10 minutes | 30 minutes |

## Scaling Behavior by Trigger Type

Different trigger types have unique scaling behaviors:

### HTTP Triggers

- Scale based on request rate (requests per second)
- Each instance can process multiple concurrent requests
- New instances added when current instances approach CPU and memory limits

### Queue Triggers

- Scale based on queue length
- New instance created when queue count exceeds 2,000 messages or oldest message age threshold
- Requires Storage Events provider for scaling triggers

### Event Hub Triggers

- Scale based on partition count and events per partition
- Each instance can process events from one partition at a time
- Maximum instances equals number of partitions to ensure balanced processing

### Timer Triggers

- Single instance processing by default for timer triggers
- No automatic scaling as load is predictable
- Can be configured for parallel execution with singleton lock pattern

## Optimizing Event-Driven Scale

To ensure efficient event-driven scaling:

1. **Understand Trigger Scaling**:
   - Know how your specific triggers influence scaling
   - Design with partition count in mind for event hubs
   - Consider message batching for queue triggers

2. **Monitor and Configure Limits**:
   - Set appropriate `maxConcurrentCalls` for queue and event hub triggers
   - Configure `batchSize` for optimal throughput
   - Use host.json settings to control concurrency

3. **Manage Cold Starts**:
   - Consider Premium plan for performance-sensitive applications
   - Implement warmup triggers for HTTP functions
   - Optimize code for faster startup

4. **Optimize Scale-In Behavior**:
   - Functions scale in when resources are idle
   - Default scale-in evaluation occurs every 5 minutes (Premium) or 10 minutes (Consumption)
   - Consider impact on stateful applications

## Example Configuration

Here's an example host.json configuration for optimizing event-driven scaling with queue triggers:

```json
{
  "version": "2.0",
  "extensions": {
    "queues": {
      "maxPollingInterval": "00:00:02",
      "visibilityTimeout": "00:00:30",
      "batchSize": 16,
      "maxDequeueCount": 5,
      "newBatchThreshold": 8
    }
  },
  "functionTimeout": "00:05:00",
  "concurrency": {
    "dynamicConcurrencyEnabled": true,
    "snapshotPersistenceEnabled": true
  }
}
```

This configuration:
- Polls queue frequently (every 2 seconds)
- Processes up to 16 messages simultaneously
- Starts fetching a new batch when 8 items are processed
- Enables dynamic concurrency for optimal resource usage

## Monitoring Scaling Behavior

To effectively monitor scaling behavior:

1. **Azure Monitor Metrics**:
   - Track function execution count
   - Monitor memory usage and execution units
   - Observe instance count over time

2. **Live Metrics Stream**:
   - View real-time scaling activity
   - Identify bottlenecks during scaling events
   - Troubleshoot scaling issues in real-time

3. **Log Analytics**:
   - Query platform logs for scaling events
   - Analyze patterns to optimize scaling rules
   - Create alerts for unexpected scaling behavior

## Advanced Scenarios

### Combining Different Trigger Types

When a function app contains multiple function triggers:

- The app scales to handle all functions' needs
- Different trigger types may have different scaling needs
- Consider separating high-scale functions into dedicated function apps

### Achieving Higher Scale

For scenarios requiring scaling beyond standard limits:

- Implement partitioning strategies
- Use multiple function apps with load distribution
- Consider queue-based load leveling patterns

### Hybrid Scaling Approaches

Combine event-driven scaling with other techniques:

- Use custom metrics in conjunction with event triggers
- Implement pre-scaling based on predictable patterns
- Create custom scale controllers for specialized needs

## Conclusion

Event-driven autoscaling provides Azure Functions with powerful capabilities to respond dynamically to workload changes. By understanding the scaling behaviors of different plans and trigger types, and by implementing appropriate configurations, you can achieve optimal performance and cost efficiency for your serverless applications.

## References

- [Microsoft Learn - Event-driven Scaling in Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/event-driven-scaling)
- [Microsoft Learn - Azure Functions Scale and Hosting Options](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
- [Microsoft Learn - Azure Functions Best Practices](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
