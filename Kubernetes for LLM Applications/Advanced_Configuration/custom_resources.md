# Custom Resources for LLM Applications

This document provides detailed information on custom resource definitions (CRDs) and configurations specifically optimized for large language model workloads on Kubernetes.

## GPU Resource Configuration

### NVIDIA GPU Operator

For LLM applications requiring GPU acceleration, the NVIDIA GPU Operator simplifies GPU management.

```yaml
# Example: Installing NVIDIA GPU Operator with Helm
apiVersion: v1
kind: Namespace
metadata:
  name: gpu-operator
---
# Run these commands:
# helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
# helm install gpu-operator nvidia/gpu-operator --namespace gpu-operator
```

### GPU Pod Specification

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-gpu-pod
spec:
  containers:
    - name: llm-container
      image: myregistry/llm-app:latest
      resources:
        limits:
          nvidia.com/gpu: 1  # Request 1 GPU
      env:
        - name: NVIDIA_VISIBLE_DEVICES
          value: "all"
        - name: NVIDIA_DRIVER_CAPABILITIES
          value: "compute,utility"
```

## Memory Optimization

LLM applications are often memory-intensive. Configure appropriate memory limits and requests:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-memory-optimized
spec:
  containers:
    - name: llm-container
      image: myregistry/llm-app:latest
      resources:
        requests:
          memory: "8Gi"  # Minimum memory needed
          cpu: "2"       # Minimum CPU cores
        limits:
          memory: "16Gi" # Maximum memory allocation
          cpu: "4"       # Maximum CPU cores
      env:
        - name: MALLOC_ARENA_MAX
          value: "2"     # Limit malloc arenas to reduce memory fragmentation
```

## Custom Scheduling

To ensure LLM pods are scheduled on appropriate nodes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-scheduled-pod
spec:
  nodeSelector:
    accelerator: gpu    # Schedule only on nodes with this label
  tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"
  containers:
    - name: llm-container
      image: myregistry/llm-app:latest
      resources:
        limits:
          nvidia.com/gpu: 1
```

## HorizontalPodAutoscaler for LLM Workloads

Customize HPA for LLM applications with variable load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llm-app-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
      - type: Percent
        value: 20
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0    # Scale up immediately when needed
      policies:
      - type: Percent
        value: 50
        periodSeconds: 30
```

## Custom Resource Definitions (CRDs) for LLM Applications

Create a custom LLM configuration CRD to standardize deployments:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: llmconfigs.ai.example.com
spec:
  group: ai.example.com
  names:
    kind: LLMConfig
    plural: llmconfigs
    singular: llmconfig
    shortNames:
    - llm
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              modelSize:
                type: string
                enum: [small, medium, large]
                description: "Size of the language model"
              gpuRequired:
                type: boolean
                description: "Whether the model requires GPU acceleration"
              minMemory:
                type: string
                description: "Minimum memory required (e.g., '8Gi')"
              minCPU:
                type: string
                description: "Minimum CPU required (e.g., '2')"
              replicaCount:
                type: integer
                minimum: 1
                description: "Number of replica pods"
              autoscaling:
                type: object
                properties:
                  enabled:
                    type: boolean
                  minReplicas:
                    type: integer
                  maxReplicas:
                    type: integer
                  targetCPUUtilization:
                    type: integer
```

## Example Usage of LLM Custom Resource

```yaml
apiVersion: ai.example.com/v1
kind: LLMConfig
metadata:
  name: gpt-medium-deployment
spec:
  modelSize: medium
  gpuRequired: true
  minMemory: "12Gi"
  minCPU: "4"
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilization: 70
```

## Decision Matrix for Resource Allocation

| Model Size | Min Memory | Min CPU | GPU Required | Typical Replicas |
|------------|------------|---------|--------------|------------------|
| Small (<3B params) | 4Gi | 2 | Optional | 3-5 |
| Medium (3B-10B params) | 8Gi | 4 | Recommended | 2-4 |
| Large (>10B params) | 16Gi+ | 8+ | Required | 1-3 |

Use this table to help determine appropriate resource allocation based on your model size.