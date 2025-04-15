# Complete LLM Deployment Example

This document provides a comprehensive, end-to-end example of deploying an LLM application on Kubernetes. It includes all necessary YAML files and commands in the correct sequence.

## Directory Structure

First, create a directory structure to organize your deployment files:

```bash
mkdir -p llm-k8s-deployment/base
mkdir -p llm-k8s-deployment/overlays/{dev,staging,production}
```

## Base Configuration

### 1. Namespace Configuration (base/namespace.yaml)

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: llm-app
```

### 2. Service Account (base/serviceaccount.yaml)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-app-sa
  namespace: llm-app
```

### 3. Deployment (base/deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app
  namespace: llm-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: llm-app
  template:
    metadata:
      labels:
        app: llm-app
    spec:
      serviceAccountName: llm-app-sa
      containers:
      - name: llm-service
        image: ${LLM_IMAGE}:${LLM_TAG}
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
        env:
        - name: MODEL_PATH
          value: "/models/llm-model"
        - name: LOG_LEVEL
          value: "info"
        volumeMounts:
        - name: model-storage
          mountPath: /models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: llm-model-pvc
```

### 4. Service (base/service.yaml)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: llm-app-service
  namespace: llm-app
spec:
  selector:
    app: llm-app
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

### 5. Persistent Volume Claim (base/pvc.yaml)

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: llm-model-pvc
  namespace: llm-app
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

### 6. Horizontal Pod Autoscaler (base/hpa.yaml)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-app-hpa
  namespace: llm-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: llm-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 7. Kustomization File (base/kustomization.yaml)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- namespace.yaml
- serviceaccount.yaml
- deployment.yaml
- service.yaml
- pvc.yaml
- hpa.yaml
```

## Environment-Specific Configurations

### Development Environment (overlays/dev/kustomization.yaml)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

namespace: llm-app-dev

namePrefix: dev-

commonLabels:
  environment: development

patchesStrategicMerge:
- deployment-patch.yaml
- hpa-patch.yaml

configMapGenerator:
- name: llm-app-config
  literals:
  - LOG_LEVEL=debug

vars:
- name: LLM_IMAGE
  objref:
    kind: Deployment
    name: llm-app
    apiVersion: apps/v1
  fieldref:
    fieldpath: spec.template.spec.containers[0].image
```

### Development Patches (overlays/dev/deployment-patch.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: llm-service
        image: myregistry/llm-app:dev
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1"
        env:
        - name: LOG_LEVEL
          value: "debug"
```

### Development HPA Patch (overlays/dev/hpa-patch.yaml)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: llm-app-hpa
spec:
  minReplicas: 1
  maxReplicas: 3
```

### Production Environment (overlays/production/kustomization.yaml)

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base
- network-policy.yaml
- ingress.yaml

namespace: llm-app-prod

namePrefix: prod-

commonLabels:
  environment: production

patchesStrategicMerge:
- deployment-patch.yaml
- hpa-patch.yaml

configMapGenerator:
- name: llm-app-config
  literals:
  - LOG_LEVEL=info
```

### Production Deployment Patch (overlays/production/deployment-patch.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: llm-service
        image: myregistry/llm-app:latest
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        env:
        - name: LOG_LEVEL
          value: "info"
```

### Production Network Policy (overlays/production/network-policy.yaml)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: llm-app-network-policy
spec:
  podSelector:
    matchLabels:
      app: llm-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 53
```

### Production Ingress (overlays/production/ingress.yaml)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: llm-app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
  - host: llm-api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: llm-app-service
            port:
              number: 80
  tls:
  - hosts:
    - llm-api.example.com
    secretName: llm-api-tls
```

## Deployment Steps

### 1. Create the directory structure and files as shown above.

### 2. Deploy to Development

```bash
# Apply development configuration
kubectl apply -k ./llm-k8s-deployment/overlays/dev

# Verify deployment
kubectl get all -n llm-app-dev

# Get the service URL (for cluster-internal access)
kubectl get service -n llm-app-dev

# Port forward for local testing
kubectl port-forward -n llm-app-dev service/dev-llm-app-service 8080:80
```

### 3. Deploy to Production

```bash
# Create TLS Secret for HTTPS
kubectl create secret tls llm-api-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n llm-app-prod

# Apply production configuration
kubectl apply -k ./llm-k8s-deployment/overlays/production

# Verify deployment
kubectl get all -n llm-app-prod

# Check that ingress is configured
kubectl get ingress -n llm-app-prod
```

### 4. Monitoring the Deployment

```bash
# Watch deployment status
kubectl rollout status deployment/prod-llm-app -n llm-app-prod

# Check pod logs
kubectl logs -n llm-app-prod -l app=llm-app

# Check HPA status
kubectl get hpa -n llm-app-prod

# Monitor resource usage
kubectl top pods -n llm-app-prod
```

### 5. Updating the Deployment

```bash
# Update the image in the development environment
kubectl set image deployment/dev-llm-app llm-service=myregistry/llm-app:dev-v2 -n llm-app-dev

# Promote to production after testing
kubectl set image deployment/prod-llm-app llm-service=myregistry/llm-app:v2 -n llm-app-prod
```

### 6. Scaling the Deployment

```bash
# Manual scaling
kubectl scale deployment/prod-llm-app --replicas=8 -n llm-app-prod

# Automatic scaling is handled by the HPA
```

### 7. Rollback if Needed

```bash
# Check revision history
kubectl rollout history deployment/prod-llm-app -n llm-app-prod

# Rollback to previous version
kubectl rollout undo deployment/prod-llm-app -n llm-app-prod

# Rollback to specific revision
kubectl rollout undo deployment/prod-llm-app --to-revision=2 -n llm-app-prod
```

## Integration with CI/CD

Here's an example GitHub Actions workflow file (.github/workflows/deploy.yml):

```yaml
name: Deploy LLM Application

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Registry
      uses: docker/login-action@v2
      with:
        registry: myregistry
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and Test
      uses: docker/build-push-action@v4
      with:
        context: .
        push: false
        load: true
        tags: myregistry/llm-app:test
    
    - name: Run Tests
      run: |
        docker run --rm myregistry/llm-app:test pytest

  deploy-dev:
    needs: build-and-test
    if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Registry
      uses: docker/login-action@v2
      with:
        registry: myregistry
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and Push Dev Image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: myregistry/llm-app:dev
    
    - name: Set up kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBE_CONFIG }}
    
    - name: Deploy to Dev
      run: |
        kubectl apply -k ./llm-k8s-deployment/overlays/dev

  deploy-production:
    needs: [build-and-test, deploy-dev]
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Registry
      uses: docker/login-action@v2
      with:
        registry: myregistry
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Get version
      id: get_version
      run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_ENV
    
    - name: Build and Push Production Image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          myregistry/llm-app:latest
          myregistry/llm-app:${{ env.VERSION }}
    
    - name: Set up kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.KUBE_CONFIG_PROD }}
    
    - name: Deploy to Production
      run: |
        kubectl apply -k ./llm-k8s-deployment/overlays/production
        kubectl set image deployment/prod-llm-app llm-service=myregistry/llm-app:${{ env.VERSION }} -n llm-app-prod
```

This comprehensive example demonstrates a complete end-to-end deployment process for LLM applications on Kubernetes, including environment-specific configurations, deployment steps, and CI/CD integration.