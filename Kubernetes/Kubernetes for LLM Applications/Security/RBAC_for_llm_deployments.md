# RBAC for LLM Deployments in Kubernetes

## Table of Contents
1. [Introduction](#introduction)
2. [RBAC Fundamentals](#rbac-fundamentals)
3. [LLM-Specific RBAC Considerations](#llm-specific-rbac-considerations)
4. [RBAC Components for LLM Deployments](#rbac-components-for-llm-deployments)
5. [Role Design Patterns](#role-design-patterns)
6. [Implementation Guide](#implementation-guide)
7. [Use Cases and Examples](#use-cases-and-examples)
8. [Best Practices](#best-practices)
9. [Security Recommendations](#security-recommendations)
10. [Monitoring and Auditing](#monitoring-and-auditing)
11. [Troubleshooting](#troubleshooting)
12. [Advanced Scenarios](#advanced-scenarios)
13. [Integration with Other Security Features](#integration-with-other-security-features)
14. [Migration Strategies](#migration-strategies)
15. [References and Resources](#references-and-resources)

## Introduction

Role-Based Access Control (RBAC) is crucial for securing Large Language Model (LLM) deployments in Kubernetes. LLM workloads present unique security challenges due to their:
- High computational resource requirements
- Sensitive data processing capabilities
- Integration with multiple services
- Potential for adversarial attacks
- Multi-tenant deployment scenarios

This comprehensive guide provides detailed guidance on implementing RBAC specifically for LLM deployments, ensuring proper access control while maintaining functionality and performance.

## RBAC Fundamentals

### Core Components

#### Subjects
- **Users**: Human administrators, developers, and operators
- **Service Accounts**: Applications, LLM inference services, and automated processes
- **Groups**: Collections of users with similar responsibilities

#### API Objects
- **Roles**: Define permissions within a namespace
- **ClusterRoles**: Define permissions cluster-wide
- **RoleBindings**: Grant Role permissions to subjects within a namespace
- **ClusterRoleBindings**: Grant ClusterRole permissions to subjects cluster-wide

### Permission Model
```yaml
# Permission structure
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["pods", "deployments", "jobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  resourceNames: ["specific-resource-name"]  # Optional: specific resources
```

## LLM-Specific RBAC Considerations

### Resource Requirements
LLM deployments require special consideration for:
- GPU/TPU access permissions
- High memory and storage allocations
- Network bandwidth for model downloading
- Inter-pod communication for distributed inference

### Security Boundaries
```yaml
# Example security boundaries for LLM deployments
apiVersion: v1
kind: Namespace
metadata:
  name: llm-production
  labels:
    environment: production
    security-zone: high
    data-classification: sensitive
---
apiVersion: v1
kind: Namespace
metadata:
  name: llm-development
  labels:
    environment: development
    security-zone: medium
    data-classification: internal
```

### Data Access Patterns
LLM deployments typically need access to:
- Model storage (PersistentVolumes)
- Training datasets
- Inference input/output queues
- Monitoring and logging systems
- External APIs and databases

## RBAC Components for LLM Deployments

### Service Accounts

```yaml
# LLM Inference Service Account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-inference-sa
  namespace: llm-production
  annotations:
    purpose: "Service account for LLM inference pods"
    security-level: "high"
---
# Model Management Service Account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-model-manager-sa
  namespace: llm-production
  annotations:
    purpose: "Service account for model lifecycle management"
    security-level: "high"
---
# Monitoring Service Account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-monitoring-sa
  namespace: llm-production
  annotations:
    purpose: "Service account for monitoring LLM performance"
    security-level: "medium"
```

### Roles and ClusterRoles

```yaml
# LLM Inference Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-inference-role
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
  resourceNames: ["llm-config", "model-config"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["llm-api-keys", "model-credentials"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "create"]
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list"]
---
# LLM Admin ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: llm-admin
rules:
- apiGroups: ["*"]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["persistentvolumes"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["rbac.authorization.k8s.io"]
  resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
# Model Management Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-model-manager
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "create", "update", "patch"]
  resourceNames: ["model-registry-credentials", "model-checksum"]
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets"]
  verbs: ["get", "list", "watch", "update", "patch"]
```

### RoleBindings and ClusterRoleBindings

```yaml
# Bind inference role to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: llm-inference-binding
  namespace: llm-production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: llm-inference-role
subjects:
- kind: ServiceAccount
  name: llm-inference-sa
  namespace: llm-production
---
# Bind admin role to user group
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: llm-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: llm-admin
subjects:
- kind: Group
  name: llm-admins
  apiGroup: rbac.authorization.k8s.io
- kind: User
  name: alice@company.com
  apiGroup: rbac.authorization.k8s.io
```

## Role Design Patterns

### Least Privilege Pattern

```yaml
# Minimal permissions for LLM inference
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-inference-minimal
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get"]
  resourceNames: ["llm-inference-*"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]
  resourceNames: ["llm-config"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["llm-api-key"]
```

### Separation of Concerns Pattern

```yaml
# Separate roles for different concerns
# 1. Model Loading Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-model-loader
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]
  resourceNames: ["model-registry-config"]
---
# 2. Inference Execution Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-inference-executor
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["pods/exec"]
  verbs: ["create"]
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list"]
---
# 3. Monitoring Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-monitor
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
```

### Multi-Tenant Pattern

```yaml
# Tenant-specific roles
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-a-llm-user
  namespace: tenant-a-llm
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
  resourceNames: ["tenant-a-*"]
---
# Shared infrastructure role
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: llm-infrastructure-viewer
rules:
- apiGroups: [""]
  resources: ["nodes", "persistentvolumes"]
  verbs: ["get", "list"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list"]
```

## Implementation Guide

### Step 1: Plan Your RBAC Strategy

```bash
# Document your RBAC requirements
cat > rbac-requirements.md << EOF
# LLM RBAC Requirements

## Stakeholders
- LLM Developers
- ML Engineers
- DevOps Team
- Security Team
- End Users

## Access Levels
1. Read-only access to inference endpoints
2. Model deployment permissions
3. Full cluster admin for infrastructure
4. Monitoring and logging access

## Namespace Strategy
- Production: llm-production
- Staging: llm-staging
- Development: llm-dev
- Shared Services: llm-services
EOF
```

### Step 2: Create Namespaces

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: llm-production
  labels:
    environment: production
    security-zone: restricted
---
apiVersion: v1
kind: Namespace
metadata:
  name: llm-staging
  labels:
    environment: staging
    security-zone: controlled
---
apiVersion: v1
kind: Namespace
metadata:
  name: llm-dev
  labels:
    environment: development
    security-zone: open
```

### Step 3: Define Service Accounts

```yaml
# Create service accounts for different components
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-inference-sa
  namespace: llm-production
automountServiceAccountToken: true
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-training-sa
  namespace: llm-production
automountServiceAccountToken: false  # Explicitly disable if not needed
```

### Step 4: Create Roles

```yaml
# Comprehensive LLM operator role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-operator
  namespace: llm-production
rules:
# Pod management
- apiGroups: [""]
  resources: ["pods", "pods/status", "pods/log", "pods/exec"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Service management
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
# ConfigMap and Secret access
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
# Deployment management
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Job management for batch inference
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Storage management
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# HPA management
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
# Network policies
- apiGroups: ["networking.k8s.io"]
  resources: ["networkpolicies"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
```

### Step 5: Apply RoleBindings

```yaml
# Bind operator role to user group
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: llm-operator-binding
  namespace: llm-production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: llm-operator
subjects:
- kind: Group
  name: llm-operators
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: llm-inference-sa
  namespace: llm-production
```

### Step 6: Verify RBAC Configuration

```bash
# Test RBAC permissions
kubectl auth can-i create pods --namespace=llm-production --as=llm-inference-sa
kubectl auth can-i get secrets --namespace=llm-production --as=llm-inference-sa
kubectl auth can-i delete deployments --namespace=llm-production --as=llm-inference-sa

# List all role bindings in namespace
kubectl get rolebindings -n llm-production
kubectl describe rolebinding llm-operator-binding -n llm-production

# Check effective permissions
kubectl auth can-i --list --namespace=llm-production --as=llm-inference-sa
```

## Use Cases and Examples

### Use Case 1: Multi-Model Deployment

```yaml
# Different service accounts for different models
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gpt-inference-sa
  namespace: llm-production
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: bert-inference-sa
  namespace: llm-production
---
# Model-specific roles
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: gpt-model-role
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]
  resourceNames: ["gpt-config", "gpt-model-params"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["gpt-api-key"]
- apiGroups: [""]
  resources: ["persistentvolumeclaims"]
  verbs: ["get", "list"]
  resourceNames: ["gpt-model-pvc"]
---
# RoleBinding for GPT model
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: gpt-model-binding
  namespace: llm-production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: gpt-model-role
subjects:
- kind: ServiceAccount
  name: gpt-inference-sa
  namespace: llm-production
```

### Use Case 2: CI/CD Pipeline Integration

```yaml
# CI/CD service account with deployment permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-cicd-sa
  namespace: llm-staging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-cicd-deployer
  namespace: llm-staging
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "create", "delete"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: llm-cicd-binding
  namespace: llm-staging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: llm-cicd-deployer
subjects:
- kind: ServiceAccount
  name: llm-cicd-sa
  namespace: llm-staging
```

### Use Case 3: External User Access

```yaml
# Role for external API consumers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-api-consumer
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list"]
  resourceNames: ["llm-inference-service"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list"]
  resourceNames: ["llm-api-ingress"]
---
# Create user-specific binding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: external-user-binding
  namespace: llm-production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: llm-api-consumer
subjects:
- kind: User
  name: external-user@client.com
  apiGroup: rbac.authorization.k8s.io
```

### Use Case 4: Monitoring and Observability

```yaml
# Monitoring service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-monitoring-sa
  namespace: llm-monitoring
---
# ClusterRole for cross-namespace monitoring
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: llm-metrics-reader
rules:
- apiGroups: [""]
  resources: ["pods", "nodes", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get", "list"]
---
# ClusterRoleBinding for monitoring
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: llm-metrics-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: llm-metrics-reader
subjects:
- kind: ServiceAccount
  name: llm-monitoring-sa
  namespace: llm-monitoring
```

## Best Practices

### 1. Principle of Least Privilege

Always start with minimal permissions and add as needed:

```yaml
# Bad practice - too permissive
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

# Good practice - specific permissions
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
  resourceNames: ["llm-inference-*"]
```

### 2. Use Resource Names When Possible

```yaml
# More secure - limits to specific resources
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["llm-api-key", "model-credentials"]
```

### 3. Separate Roles by Function

```yaml
# Separate roles for different functions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-reader
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-writer
  namespace: llm-production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["create", "update", "patch", "delete"]
```

### 4. Regular Audits

```bash
# Audit script for RBAC review
#!/bin/bash
NAMESPACE="llm-production"

echo "=== Service Accounts ==="
kubectl get sa -n $NAMESPACE

echo "=== Roles ==="
kubectl get roles -n $NAMESPACE

echo "=== RoleBindings ==="
kubectl get rolebindings -n $NAMESPACE

echo "=== ClusterRoles (LLM-related) ==="
kubectl get clusterroles | grep llm

echo "=== ClusterRoleBindings (LLM-related) ==="
kubectl get clusterrolebindings | grep llm

echo "=== Unused Service Accounts ==="
for sa in $(kubectl get sa -n $NAMESPACE -o name); do
  SA_NAME=$(echo $sa | cut -d'/' -f2)
  USED=$(kubectl get rolebindings,clusterrolebindings -A -o json | grep -c "\"name\": \"$SA_NAME\"")
  if [ $USED -eq 0 ]; then
    echo "Unused: $SA_NAME"
  fi
done
```

### 5. Version Control RBAC Configurations

```yaml
# Store in Git with metadata
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-inference-role
  namespace: llm-production
  annotations:
    version: "1.2.0"
    last-modified: "2024-01-15"
    modified-by: "security-team@company.com"
    description: "Role for LLM inference pods with GPU access"
```

## Security Recommendations

### 1. Disable Auto-Mounting for Service Accounts

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-minimal-sa
  namespace: llm-production
automountServiceAccountToken: false  # Explicitly disable
```

### 2. Use Network Policies with RBAC

```yaml
# Combine RBAC with NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: llm-inference-netpol
  namespace: llm-production
spec:
  podSelector:
    matchLabels:
      app: llm-inference
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: llm-gateway
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: llm-model-storage
```

### 3. Implement Pod Security Standards

```yaml
# Pod Security Policy for LLM pods
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: llm-restricted-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

### 4. Regular Permission Reviews

```bash
# Review permissions for all service accounts
for ns in $(kubectl get ns -o name | cut -d'/' -f2 | grep llm); do
  echo "Namespace: $ns"
  for sa in $(kubectl get sa -n $ns -o name | cut -d'/' -f2); do
    echo "  Service Account: $sa"
    kubectl auth can-i --list --as=system:serviceaccount:$ns:$sa -n $ns | grep -v "Resources\|^$" | head -5
  done
done
```

### 5. Implement Admission Controllers

```yaml
# ValidatingAdmissionWebhook for RBAC validation
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: llm-rbac-validator
webhooks:
- name: validate.rbac.llm.io
  rules:
  - apiGroups: ["rbac.authorization.k8s.io"]
    apiVersions: ["v1"]
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
    operations: ["CREATE", "UPDATE"]
  clientConfig:
    service:
      name: llm-rbac-validator
      namespace: llm-security
      path: "/validate"
  admissionReviewVersions: ["v1", "v1beta1"]
  sideEffects: None
```

## Monitoring and Auditing

### 1. Enable Audit Logging

```yaml
# Audit policy for RBAC events
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  omitStages:
  - RequestReceived
  resources:
  - group: "rbac.authorization.k8s.io"
    resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  namespaces: ["llm-production", "llm-staging"]
- level: Metadata
  omitStages:
  - RequestReceived
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]
  namespaces: ["llm-production"]
  verbs: ["get", "list", "watch"]
```

### 2. Monitor Permission Changes

```yaml
# Prometheus rule for RBAC changes
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: llm-rbac-alerts
  namespace: llm-monitoring
spec:
  groups:
  - name: rbac
    interval: 30s
    rules:
    - alert: RBACChange
      expr: |
        kube_audit_event_count{
          verb=~"create|update|patch|delete",
          objectref_resource=~"roles|rolebindings|clusterroles|clusterrolebindings",
          objectref_namespace=~"llm-.*"
        } > 0
      for: 1m
      labels:
        severity: warning
      annotations:
        summary: "RBAC change detected in LLM namespace"
        description: "{{ $labels.verb }} on {{ $labels.objectref_resource }} in {{ $labels.objectref_namespace }}"
```

### 3. Access Pattern Analysis

```python
#!/usr/bin/env python3
import subprocess
import json
from collections import defaultdict

# Analyze kubectl auth can-i results
def analyze_rbac_permissions():
    namespaces = ["llm-production", "llm-staging", "llm-dev"]
    service_accounts = []
    
    for ns in namespaces:
        result = subprocess.run(
            ["kubectl", "get", "sa", "-n", ns, "-o", "json"],
            capture_output=True, text=True
        )
        sa_data = json.loads(result.stdout)
        
        for item in sa_data.get("items", []):
            sa_name = item["metadata"]["name"]
            service_accounts.append((ns, sa_name))
    
    permissions = defaultdict(lambda: defaultdict(list))
    
    for ns, sa in service_accounts:
        result = subprocess.run(
            ["kubectl", "auth", "can-i", "--list", 
             f"--as=system:serviceaccount:{ns}:{sa}", "-n", ns],
            capture_output=True, text=True
        )
        
        for line in result.stdout.splitlines()[1:]:  # Skip header
            if line.strip():
                parts = line.split()
                if len(parts) >= 3:
                    resource = parts[0]
                    verbs = parts[2:]
                    permissions[f"{ns}/{sa}"][resource] = verbs
    
    return permissions

# Generate report
permissions = analyze_rbac_permissions()
print("LLM RBAC Permission Report")
print("=" * 50)
for sa, resources in permissions.items():
    print(f"\nService Account: {sa}")
    for resource, verbs in resources.items():
        print(f"  {resource}: {', '.join(verbs)}")
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Permission Denied Errors

```bash
# Diagnose permission issues
kubectl auth can-i create pods \
  --as=system:serviceaccount:llm-production:llm-inference-sa \
  -n llm-production

# Check role bindings
kubectl get rolebindings,clusterrolebindings \
  --all-namespaces \
  -o custom-columns='KIND:kind,NAME:metadata.name,ROLE:roleRef.name,SUBJECTS:subjects[*].name' \
  | grep llm-inference-sa
```

#### 2. Service Account Token Issues

```bash
# Verify token exists
kubectl get secret -n llm-production | grep llm-inference-sa-token

# Check token mounting
kubectl get pod <pod-name> -n llm-production -o yaml | grep -A5 serviceAccount
```

#### 3. Role Aggregation Problems

```yaml
# Fix aggregation issues
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: llm-aggregate-role
  labels:
    rbac.authorization.k8s.io/aggregate-to-admin: "true"
    rbac.authorization.k8s.io/aggregate-to-edit: "true"
    rbac.authorization.k8s.io/aggregate-to-view: "false"
rules:
- apiGroups: ["ai.company.com"]
  resources: ["llmmodels", "inferencejobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

#### 4. Namespace Isolation Issues

```bash
# Verify namespace isolation
kubectl auth can-i --list \
  --as=system:serviceaccount:llm-dev:dev-sa \
  -n llm-production

# Should show no permissions if properly isolated
```

## Advanced Scenarios

### 1. Dynamic RBAC for Auto-Scaling

```yaml
# Role for HPA controller
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-autoscaler
  namespace: llm-production
rules:
- apiGroups: ["apps"]
  resources: ["deployments/scale", "replicasets/scale"]
  verbs: ["get", "update", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods"]
  verbs: ["list"]
---
# Custom metrics access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: llm-metrics-adapter
rules:
- apiGroups: ["custom.metrics.k8s.io"]
  resources: ["*"]
  verbs: ["list", "get"]
- apiGroups: ["external.metrics.k8s.io"]
  resources: ["*"]
  verbs: ["list", "get"]
```

### 2. Multi-Cloud RBAC Federation

```yaml
# Federated role for multi-cloud deployments
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: llm-multi-cloud-operator
  annotations:
    federation: "enabled"
    clouds: "aws,gcp,azure"
rules:
- apiGroups: ["federation.k8s.io"]
  resources: ["federateddeployments", "federatedservices"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]
```

### 3. Temporary Access Patterns

```yaml
# Time-bound role for incident response
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-incident-responder
  namespace: llm-production
  annotations:
    expires: "2024-12-31T23:59:59Z"
    purpose: "Temporary access for incident response"
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch", "update", "patch"]
---
# Controller to enforce expiration
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rbac-expiration-controller
  namespace: kube-system
spec:
  schedule: "0 * * * *"  # Hourly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rbac-controller
          containers:
          - name: expiration-checker
            image: rbac-controller:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl get roles,clusterroles -A -o json | \
              jq -r '.items[] | select(.metadata.annotations.expires != null) | 
              select(.metadata.annotations.expires < now) | 
              "\(.kind)/\(.metadata.name)/\(.metadata.namespace)"' | \
              while read obj; do
                kubectl delete $obj
              done
```

## Integration with Other Security Features

### 1. OPA (Open Policy Agent) Integration

```yaml
# OPA policy for RBAC validation
apiVersion: v1
kind: ConfigMap
metadata:
  name: llm-rbac-policies
  namespace: opa-system
data:
  rbac-policy.rego: |
    package kubernetes.rbac
    
    # Deny overly permissive roles
    deny[msg] {
      input.kind == "Role"
      input.rules[_].apiGroups[_] == "*"
      input.rules[_].resources[_] == "*"
      input.rules[_].verbs[_] == "*"
      msg := sprintf("Role '%v' is too permissive", [input.metadata.name])
    }
    
    # Require specific resource names for secrets
    deny[msg] {
      input.kind == "Role"
      input.rules[_].resources[_] == "secrets"
      not input.rules[_].resourceNames
      msg := "Secret access must specify resourceNames"
    }
    
    # Enforce naming conventions
    deny[msg] {
      input.kind == "ServiceAccount"
      not startswith(input.metadata.name, "llm-")
      msg := sprintf("ServiceAccount '%v' must start with 'llm-'", [input.metadata.name])
    }
```

### 2. Service Mesh Integration

```yaml
# Istio RBAC configuration
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: llm-inference-authz
  namespace: llm-production
spec:
  selector:
    matchLabels:
      app: llm-inference
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/llm-gateway/sa/gateway-sa"]
    to:
    - operation:
        methods: ["POST"]
        paths: ["/v1/inference"]
  - from:
    - source:
        principals: ["cluster.local/ns/llm-monitoring/sa/prometheus-sa"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/metrics"]
```

### 3. Admission Webhook for RBAC Enforcement

```go
// RBAC admission webhook
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    
    admissionv1 "k8s.io/api/admission/v1"
    rbacv1 "k8s.io/api/rbac/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func validateRBAC(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    var role rbacv1.Role
    if err := json.Unmarshal(ar.Request.Object.Raw, &role); err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("Error unmarshaling role: %v", err),
            },
        }
    }
    
    // Validate role rules
    for _, rule := range role.Rules {
        // Check for overly permissive rules
        if contains(rule.APIGroups, "*") && 
           contains(rule.Resources, "*") && 
           contains(rule.Verbs, "*") {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: "Role contains overly permissive rules",
                },
            }
        }
        
        // Require resourceNames for secrets
        if contains(rule.Resources, "secrets") && 
           len(rule.ResourceNames) == 0 {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: "Secret access must specify resourceNames",
                },
            }
        }
    }
    
    return &admissionv1.AdmissionResponse{Allowed: true}
}
```

## Migration Strategies

### 1. From Basic to Advanced RBAC

```bash
#!/bin/bash
# Migration script from basic to advanced RBAC

# Step 1: Backup existing RBAC
kubectl get roles,rolebindings,clusterroles,clusterrolebindings \
  -A -o yaml > rbac-backup-$(date +%Y%m%d).yaml

# Step 2: Create new namespaces
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: llm-production-new
  labels:
    environment: production
    migration: "in-progress"
EOF

# Step 3: Apply new RBAC configuration
kubectl apply -f advanced-rbac-config.yaml

# Step 4: Migrate workloads
kubectl get deployments -n llm-production -o json | \
  jq '.items[] | .metadata.namespace = "llm-production-new"' | \
  kubectl apply -f -

# Step 5: Test and verify
./test-rbac-permissions.sh

# Step 6: Switch over
kubectl patch namespace llm-production \
  -p '{"metadata":{"labels":{"migration":"completed"}}}'
```

### 2. Zero-Downtime RBAC Updates

```yaml
# Canary RBAC deployment
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-inference-sa-v2
  namespace: llm-production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-inference-role-v2
  namespace: llm-production
rules:
# New, more restrictive rules
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
  resourceNames: ["llm-inference-*"]
---
# Gradual rollout with feature flags
apiVersion: v1
kind: ConfigMap
metadata:
  name: rbac-feature-flags
  namespace: llm-production
data:
  use_v2_rbac: "false"
  rollout_percentage: "0"
```

## References and Resources

### Official Documentation
- [Kubernetes RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Configure Service Accounts](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

### Best Practices Guides
- [RBAC Best Practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [Security Best Practices](https://kubernetes.io/docs/concepts/security/security-best-practices/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)

### Tools and Utilities
- [rbac-tool](https://github.com/alcideio/rbac-tool) - RBAC audit and visualization
- [kubectl-who-can](https://github.com/aquasecurity/kubectl-who-can) - Show who has permissions
- [rakkess](https://github.com/corneliusweig/rakkess) - Review access matrix
- [rbac-lookup](https://github.com/FairwindsOps/rbac-lookup) - Find roles and bindings

### Security References
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [NSA Kubernetes Hardening Guide](https://www.nsa.gov/Press-Room/News-Highlights/Article/Article/2716980/)
- [OWASP Kubernetes Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html)

### LLM-Specific Resources
- [ML System Security](https://mlsystemsecurity.github.io/)
- [Securing AI/ML Workloads](https://www.cncf.io/blog/2023/03/14/securing-ai-ml-workloads/)
- [Best Practices for LLM Deployment](https://huggingface.co/docs/transformers/llm_deployment)

---

This comprehensive guide provides everything needed to implement robust RBAC for LLM deployments in Kubernetes. Regular reviews and updates of these configurations ensure continued security and compliance as your LLM infrastructure evolves.