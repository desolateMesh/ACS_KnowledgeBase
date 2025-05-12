# Advanced Deployment Strategies

This document details various deployment strategies for LLM applications on Kubernetes, providing the necessary context and configuration examples for an AI agent to implement them.

## Strategy Comparison

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| Rolling Update | Standard deployment method | Simple, built-in | Brief downtime possible |
| Blue-Green | Zero-downtime critical apps | No downtime, easy rollback | Requires double resources |
| Canary | Gradual feature testing | Reduces risk, allows testing | More complex to configure |
| A/B Testing | Feature comparison | Enables data-driven decisions | Requires additional analysis |

## Rolling Update Configuration

Rolling updates are the default strategy in Kubernetes. They gradually replace old pods with new ones.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # How many pods can be created above desired number
      maxUnavailable: 1  # How many pods can be unavailable during the update
  selector:
    matchLabels:
      app: llm-app
  template:
    metadata:
      labels:
        app: llm-app
    spec:
      containers:
      - name: llm-container
        image: myregistry/llm-app:v2
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## Blue-Green Deployment

Blue-Green deployments maintain two identical environments, with only one active at a time.

### Step 1: Deploy the "green" environment alongside existing "blue"

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-app
      version: green
  template:
    metadata:
      labels:
        app: llm-app
        version: green
    spec:
      containers:
      - name: llm-container
        image: myregistry/llm-app:v2
        ports:
        - containerPort: 8080
```

### Step 2: Test the green environment

### Step 3: Switch traffic (update the service selector)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: llm-app-service
spec:
  selector:
    app: llm-app
    version: green  # Changed from 'blue' to 'green'
  ports:
  - port: 80
    targetPort: 8080
```

### Step 4: Remove the old "blue" deployment when confident

```bash
kubectl delete deployment llm-app-blue
```

## Canary Deployment

Canary deployments route a small percentage of traffic to the new version.

### Step 1: Keep the main deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app-stable
spec:
  replicas: 9  # 90% of pods
  selector:
    matchLabels:
      app: llm-app
      version: stable
  template:
    metadata:
      labels:
        app: llm-app
        version: stable
    spec:
      containers:
      - name: llm-container
        image: myregistry/llm-app:v1
        ports:
        - containerPort: 8080
```

### Step 2: Create a canary deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app-canary
spec:
  replicas: 1  # 10% of pods
  selector:
    matchLabels:
      app: llm-app
      version: canary
  template:
    metadata:
      labels:
        app: llm-app
        version: canary
    spec:
      containers:
      - name: llm-container
        image: myregistry/llm-app:v2
        ports:
        - containerPort: 8080
```

### Step 3: Create a service that targets both deployments

```yaml
apiVersion: v1
kind: Service
metadata:
  name: llm-app-service
spec:
  selector:
    app: llm-app  # This selects both stable and canary pods
  ports:
  - port: 80
    targetPort: 8080
```

## Decision Criteria for Strategy Selection

Use this decision tree to determine the optimal deployment strategy:

```
START
├── Is downtime acceptable?
│   ├── YES → Is this a high-risk change?
│   │   ├── YES → Use Canary Deployment
│   │   └── NO → Use Rolling Update (Default)
│   └── NO → Is this a critical application?
│       ├── YES → Use Blue-Green Deployment
│       └── NO → Need to compare new features?
│           ├── YES → Use A/B Testing Deployment
│           └── NO → Use Blue-Green Deployment
```

## Monitoring During Deployment

Always monitor these metrics during deployments:
- Error rates
- Response times
- Resource utilization
- User-centric metrics

Refer to the Monitoring/monitoring.md document for detailed configuration of monitoring during deployments.