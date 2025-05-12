# Kubernetes API Integration Guide

This document provides detailed information on interacting with the Kubernetes API programmatically for managing LLM deployments. This is essential for automation and integration with other systems.

## Authentication Methods

### Using kubeconfig

The most common way to authenticate with the Kubernetes API:

```python
from kubernetes import client, config

# Load kubeconfig file
config.load_kube_config(context="my-context")

# Create an API client
v1 = client.CoreV1Api()
```

### Using Service Account Tokens

For in-cluster authentication:

```python
from kubernetes import client, config

# Load in-cluster config when running inside K8s
config.load_incluster_config()

# Create an API client
v1 = client.CoreV1Api()
```

## Common API Operations

### Listing Resources

```python
# List all pods in a namespace
def list_pods(namespace="default"):
    v1 = client.CoreV1Api()
    print(f"Listing pods in namespace {namespace}:")
    ret = v1.list_namespaced_pod(namespace=namespace)
    
    for pod in ret.items:
        print(f"{pod.metadata.name}\t{pod.status.phase}\t{pod.status.pod_ip}")
    
    return ret.items
```

### Creating Deployments

```python
# Create a deployment for an LLM application
def create_llm_deployment(name, image, namespace="default", replicas=3):
    apps_v1 = client.AppsV1Api()
    
    # Define container
    container = client.V1Container(
        name="llm-container",
        image=image,
        ports=[client.V1ContainerPort(container_port=8080)],
        resources=client.V1ResourceRequirements(
            requests={"cpu": "500m", "memory": "2Gi"},
            limits={"cpu": "2", "memory": "4Gi"}
        )
    )
    
    # Create template
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels={"app": name}),
        spec=client.V1PodSpec(containers=[container])
    )
    
    # Create spec
    spec = client.V1DeploymentSpec(
        replicas=replicas,
        selector=client.V1LabelSelector(
            match_labels={"app": name}
        ),
        template=template
    )
    
    # Create deployment
    deployment = client.V1Deployment(
        api_version="apps/v1",
        kind="Deployment",
        metadata=client.V1ObjectMeta(name=name),
        spec=spec
    )
    
    # Create deployment in cluster
    api_response = apps_v1.create_namespaced_deployment(
        namespace=namespace,
        body=deployment
    )
    
    print(f"Deployment {name} created.")
    return api_response
```

### Updating Deployments

```python
# Update an existing deployment
def update_deployment_image(name, new_image, namespace="default"):
    apps_v1 = client.AppsV1Api()
    
    # Get existing deployment
    deployment = apps_v1.read_namespaced_deployment(name=name, namespace=namespace)
    
    # Update container image
    deployment.spec.template.spec.containers[0].image = new_image
    
    # Update the deployment
    api_response = apps_v1.patch_namespaced_deployment(
        name=name,
        namespace=namespace,
        body=deployment
    )
    
    print(f"Deployment {name} updated with image {new_image}.")
    return api_response
```

### Monitoring Resources

```python
# Monitor pods and their status
def monitor_deployment_status(name, namespace="default"):
    apps_v1 = client.AppsV1Api()
    
    # Get deployment status
    deployment = apps_v1.read_namespaced_deployment_status(
        name=name, 
        namespace=namespace
    )
    
    print(f"Deployment {name} status:")
    print(f"Replicas: {deployment.status.replicas}")
    print(f"Available replicas: {deployment.status.available_replicas}")
    print(f"Ready replicas: {deployment.status.ready_replicas}")
    print(f"Updated replicas: {deployment.status.updated_replicas}")
    
    return deployment.status
```

## Error Handling

Always implement proper error handling when working with the Kubernetes API:

```python
from kubernetes.client.rest import ApiException

try:
    api_response = apps_v1.create_namespaced_deployment(
        namespace=namespace,
        body=deployment
    )
except ApiException as e:
    if e.status == 409:
        print(f"Deployment {name} already exists. Consider using update instead.")
    else:
        print(f"Exception when creating deployment: {e}")
    raise
```

## Webhook Integration

Create a simple webhook server to receive Kubernetes events:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/k8s/events', methods=['POST'])
def kubernetes_event_handler():
    event = request.json
    # Process the event
    print(f"Received event: {json.dumps(event, indent=2)}")
    
    # Take action based on event type
    if event.get('type') == 'ADDED':
        print(f"New resource added: {event.get('object', {}).get('metadata', {}).get('name')}")
    elif event.get('type') == 'MODIFIED':
        print(f"Resource modified: {event.get('object', {}).get('metadata', {}).get('name')}")
    elif event.get('type') == 'DELETED':
        print(f"Resource deleted: {event.get('object', {}).get('metadata', {}).get('name')}")
    
    return jsonify({"status": "processed"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Custom Controller Example

Implement a simple custom controller for LLM deployments:

```python
import kopf
import kubernetes.client as k8s
from kubernetes.client.rest import ApiException
import time

@kopf.on.create('ai.example.com', 'v1', 'llmconfigs')
def create_on_llmconfig(spec, name, namespace, logger, **kwargs):
    # Extract configuration
    model_size = spec.get('modelSize', 'small')
    gpu_required = spec.get('gpuRequired', False)
    min_memory = spec.get('minMemory', '4Gi')
    min_cpu = spec.get('minCPU', '2')
    replica_count = spec.get('replicaCount', 1)
    
    # Determine image based on model size
    image_mapping = {
        'small': 'myregistry/llm-app:small',
        'medium': 'myregistry/llm-app:medium',
        'large': 'myregistry/llm-app:large'
    }
    image = image_mapping.get(model_size, 'myregistry/llm-app:latest')
    
    # Create deployment
    apps_v1 = k8s.AppsV1Api()
    
    # Build container with GPU if required
    resources = k8s.V1ResourceRequirements(
        requests={"cpu": min_cpu, "memory": min_memory},
        limits={"cpu": str(int(min_cpu) * 2), "memory": min_memory}
    )
    
    if gpu_required:
        resources.limits["nvidia.com/gpu"] = "1"
    
    container = k8s.V1Container(
        name="llm-container",
        image=image,
        ports=[k8s.V1ContainerPort(container_port=8080)],
        resources=resources
    )
    
    # Create deployment object
    deployment = k8s.V1Deployment(
        api_version="apps/v1",
        kind="Deployment",
        metadata=k8s.V1ObjectMeta(
            name=f"{name}-deployment",
            namespace=namespace,
            labels={"app": name}
        ),
        spec=k8s.V1DeploymentSpec(
            replicas=replica_count,
            selector=k8s.V1LabelSelector(
                match_labels={"app": name}
            ),
            template=k8s.V1PodTemplateSpec(
                metadata=k8s.V1ObjectMeta(labels={"app": name}),
                spec=k8s.V1PodSpec(containers=[container])
            )
        )
    )
    
    # Create deployment in cluster
    try:
        api_response = apps_v1.create_namespaced_deployment(
            namespace=namespace,
            body=deployment
        )
        logger.info(f"Deployment {name}-deployment created")
        return {'deployment_name': f"{name}-deployment"}
    except ApiException as e:
        logger.error(f"Exception when creating deployment: {e}")
        raise kopf.PermanentError(f"Failed to create deployment: {e}")
```

## API Endpoints Reference

| API Group | Version | Kind | Description |
|-----------|---------|------|-------------|
| apps | v1 | Deployment | Manage deployments |
| apps | v1 | StatefulSet | Manage stateful applications |
| core | v1 | Pod | Manage individual pods |
| core | v1 | Service | Manage services |
| autoscaling | v2 | HorizontalPodAutoscaler | Configure autoscaling |
| batch | v1 | Job | Manage batch jobs |
| networking.k8s.io | v1 | Ingress | Configure ingress rules |

This documentation provides a foundation for integrating with the Kubernetes API for LLM application deployment and management. Adapt the code examples to your specific requirements and infrastructure.