# Security Configuration for LLM Applications on Kubernetes

This document details the security configurations required for deploying LLM applications on Kubernetes, with a focus on protecting sensitive models and data.

## RBAC Configuration

Role-Based Access Control (RBAC) is essential for securing Kubernetes clusters:

### Creating Service Accounts

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: llm-application-sa
  namespace: llm-production
```

### Defining Role and RoleBinding

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: llm-app-role
  namespace: llm-production
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: llm-app-role-binding
  namespace: llm-production
subjects:
- kind: ServiceAccount
  name: llm-application-sa
  namespace: llm-production
roleRef:
  kind: Role
  name: llm-app-role
  apiGroup: rbac.authorization.k8s.io
```

### Verification and Testing of RBAC Rules

Always verify RBAC configurations before relying on them:

```bash
# Test if the ServiceAccount can perform actions
kubectl auth can-i get pods --as=system:serviceaccount:llm-production:llm-application-sa -n llm-production
kubectl auth can-i update deployments --as=system:serviceaccount:llm-production:llm-application-sa -n llm-production

# Test actions it shouldn't have permission for
kubectl auth can-i delete pods --as=system:serviceaccount:llm-production:llm-application-sa -n llm-production
```

### Common RBAC Mistakes to Avoid

1. **Overly permissive roles**: Use specific resources and verbs rather than wildcards
2. **Using ClusterRoles when Roles suffice**: Prefer namespace-scoped roles when possible
3. **Forgetting to bind roles**: A role without a binding has no effect
4. **Missing necessary permissions**: Test thoroughly to ensure all required actions are permitted

## Network Policies

Restricting network traffic to and from LLM applications:

### Basic Ingress/Egress Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: llm-app-network-policy
  namespace: llm-production
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
          name: frontend
    - podSelector:
        matchLabels:
          role: api-consumer
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 9090
```

### Deny-All Policy (Default Stance)

Start with a deny-all policy and then explicitly allow required traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: llm-production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Allow DNS Resolution

Always ensure DNS resolution works with network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-resolution
  namespace: llm-production
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

### Testing Network Policies

Always test network policies after applying them:

```bash
# Create a test pod in the namespace
kubectl run -n llm-production network-policy-test --rm -it --image=alpine -- sh

# Test allowed connections
wget -qO- --timeout=2 http://llm-app-service:8080

# Test blocked connections
wget -qO- --timeout=2 http://other-service:8080
# Should fail with timeout
```

## Secrets Management

### Creating Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: llm-api-keys
  namespace: llm-production
type: Opaque
data:
  api-key: BASE64_ENCODED_API_KEY
  model-access-token: BASE64_ENCODED_TOKEN
```

### Creating Secrets via Command Line (More Secure)

Avoid storing secrets in YAML files or repositories:

```bash
# Create secret directly from literal values
kubectl create secret generic llm-api-keys \
    --from-literal=api-key=YOUR_API_KEY \
    --from-literal=model-access-token=YOUR_TOKEN \
    --namespace=llm-production

# Create secret from files
kubectl create secret generic model-credentials \
    --from-file=./credentials.json \
    --namespace=llm-production
```

### Mounting Secrets in Pods

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-app-pod
  namespace: llm-production
spec:
  containers:
  - name: llm-container
    image: myregistry/llm-app:latest
    volumeMounts:
    - name: secrets-volume
      mountPath: "/etc/llm/secrets"
      readOnly: true
    env:
    - name: API_KEY
      valueFrom:
        secretKeyRef:
          name: llm-api-keys
          key: api-key
  volumes:
  - name: secrets-volume
    secret:
      secretName: llm-api-keys
```

### Secret Rotation Strategy

Implement regular secret rotation to minimize risk:

```yaml
# Using an init container to fetch the latest secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llm-app-deployment
  namespace: llm-production
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
      initContainers:
      - name: fetch-latest-secrets
        image: myregistry/secret-fetcher:latest
        env:
        - name: SECRET_DESTINATION
          value: /tmp/secrets
        volumeMounts:
        - name: secrets-volume
          mountPath: /tmp/secrets
      containers:
      - name: llm-container
        image: myregistry/llm-app:latest
        volumeMounts:
        - name: secrets-volume
          mountPath: "/etc/llm/secrets"
          readOnly: true
      volumes:
      - name: secrets-volume
        emptyDir:
          medium: Memory
```

### Secret Detection and Prevention

Implement tools to prevent accidental secret leakage:

```bash
# Install git-secrets pre-commit hook
git secrets --install
git secrets --register-aws
git secrets --add 'API_KEY[=:]\s*[A-Za-z0-9+/]{32,}'
git secrets --add 'MODEL_TOKEN[=:]\s*[A-Za-z0-9+/]{32,}'
```

## Using External Secret Management

For production, consider integrating with external secret management systems:

### HashiCorp Vault Integration

```yaml
# Install the Vault Operator first via Helm

apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: vault-auth
  namespace: llm-production
spec:
  method: kubernetes
  mount: kubernetes
  kubernetes:
    role: llm-app-role
    serviceAccount: llm-application-sa
    audiences:
    - vault

---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultConnection
metadata:
  name: vault-connection
  namespace: llm-production
spec:
  address: https://vault.example.com:8200

---
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: llm-vault-secret
  namespace: llm-production
spec:
  vaultAuthRef: vault-auth
  vaultConnectionRef: vault-connection
  mount: secret
  path: llm-app/production
  destination:
    create: true
    name: llm-secret-from-vault
  refreshAfter: 60s
```

### AWS Secrets Manager Integration

```yaml
# First install the External Secrets Operator
# https://external-secrets.io/latest/introduction/getting-started/

apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: llm-production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: llm-application-sa

---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: llm-api-secret
  namespace: llm-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: llm-api-keys
    creationPolicy: Owner
  data:
  - secretKey: api-key
    remoteRef:
      key: llm-app/api-keys
      property: api-key
  - secretKey: model-access-token
    remoteRef:
      key: llm-app/api-keys
      property: model-token
```

### Azure Key Vault Integration

```yaml
# Using Azure Key Vault Provider for Secrets Store CSI Driver

apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-kvname
  namespace: llm-production
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<identity-client-id>"
    keyvaultName: "<key-vault-name>"
    cloudName: ""
    objects: |
      array:
        - |
          objectName: api-key
          objectType: secret
        - |
          objectName: model-token
          objectType: secret
    tenantId: "<tenant-id>"
  secretObjects:
  - secretName: llm-api-keys
    type: Opaque
    data:
    - objectName: api-key
      key: api-key
    - objectName: model-token
      key: model-access-token
```

## Pod Security Context

Configure pod security context to run with least privilege:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-secure-pod
  namespace: llm-production
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: llm-container
    image: myregistry/llm-app:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    resources:
      limits:
        cpu: "2"
        memory: "4Gi"
```

### Container Hardening Checklist

For LLM applications, ensure the following:

1. **Run as non-root**: Always set `runAsUser` to a non-zero value
2. **Read-only filesystem**: Set `readOnlyRootFilesystem: true` where possible
3. **Drop all capabilities**: Use `capabilities.drop: ["ALL"]`
4. **Prevent privilege escalation**: Set `allowPrivilegeEscalation: false`
5. **Use seccomp profiles**: Set `seccompProfile.type: RuntimeDefault`
6. **Resource constraints**: Always set CPU and memory limits
7. **Mount data volumes specifically**: Only mount necessary volumes with minimal permissions

### Pod Security Standards

Apply Pod Security Standards at the namespace level:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: llm-production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Security Scanning

### Image Scanning in CI/CD Pipeline

Add this to your CI/CD configuration (example for GitHub Actions):

```yaml
name: Security Scan

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build image
      run: docker build -t myregistry/llm-app:${{ github.sha }} .
    
    - name: Scan with Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'myregistry/llm-app:${{ github.sha }}'
        format: 'table'
        exit-code: '1'
        severity: 'CRITICAL,HIGH'
```

### In-Cluster Vulnerability Scanning

Deploy vulnerability scanners within your cluster:

```yaml
# Using Starboard Operator
apiVersion: apps/v1
kind: Deployment
metadata:
  name: starboard-operator
  namespace: starboard-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: starboard-operator
  template:
    metadata:
      labels:
        app: starboard-operator
    spec:
      serviceAccountName: starboard-operator
      containers:
        - name: operator
          image: aquasec/starboard-operator:0.15.0
          imagePullPolicy: IfNotPresent
          env:
            - name: OPERATOR_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: OPERATOR_TARGET_NAMESPACES
              value: "llm-production"
            - name: OPERATOR_SERVICE_ACCOUNT
              value: "starboard-operator"
            - name: OPERATOR_LOG_DEV_MODE
              value: "false"
            - name: OPERATOR_SCAN_JOB_TIMEOUT
              value: "5m"
            - name: OPERATOR_METRICS_BIND_ADDRESS
              value: ":8080"
            - name: OPERATOR_HEALTH_PROBE_BIND_ADDRESS
              value: ":9090"
```

### Runtime Security Monitoring

Set up runtime security monitoring:

```yaml
# Using Falco
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: falco
  namespace: security-monitoring
  labels:
    app: falco
    role: security
spec:
  selector:
    matchLabels:
      app: falco
  template:
    metadata:
      labels:
        app: falco
    spec:
      containers:
      - name: falco
        image: falcosecurity/falco:latest
        securityContext:
          privileged: true
        volumeMounts:
        - mountPath: /host/var/run/docker.sock
          name: docker-socket
        - mountPath: /host/dev
          name: dev-fs
        - mountPath: /host/proc
          name: proc-fs
          readOnly: true
        - mountPath: /host/boot
          name: boot-fs
          readOnly: true
        - mountPath: /host/lib/modules
          name: lib-modules
          readOnly: true
        - mountPath: /host/usr
          name: usr-fs
          readOnly: true
        - mountPath: /etc/falco
          name: falco-config
      volumes:
      - name: docker-socket
        hostPath:
          path: /var/run/docker.sock
      - name: dev-fs
        hostPath:
          path: /dev
      - name: proc-fs
        hostPath:
          path: /proc
      - name: boot-fs
        hostPath:
          path: /boot
      - name: lib-modules
        hostPath:
          path: /lib/modules
      - name: usr-fs
        hostPath:
          path: /usr
      - name: falco-config
        configMap:
          name: falco-config
```

## Implementing Open Policy Agent/Gatekeeper

OPA/Gatekeeper helps enforce policies across your cluster:

```yaml
# Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.9/deploy/gatekeeper.yaml

# Create constraint template
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: object
                properties:
                  key:
                    type: string
                  allowedRegex:
                    type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels

        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_].key}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("you must provide labels: %v", [missing])
        }

        violation[{"msg": msg}] {
          provided := input.review.object.metadata.labels[key]
          required := input.parameters.labels[_]
          required.key == key
          required.allowedRegex != ""
          not re_match(required.allowedRegex, provided)
          msg := sprintf("Label %v has invalid value %v; must match regex %v", [key, provided, required.allowedRegex])
        }

# Apply constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-label
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces:
      - "llm-production"
  parameters:
    labels:
      - key: "app"
        allowedRegex: "llm-[a-z]+"
```

### Enforcement vs. Audit Mode

Start with audit mode before enforcing policies:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-label-audit
  annotations:
    # Set to dryrun for audit-only mode
    enforcement.gatekeeper.sh/action: dryrun
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
    namespaces:
      - "llm-production"
  parameters:
    labels:
      - key: "app"
        allowedRegex: "llm-[a-z]+"
```

## Audit Logging

Enable audit logging in Kubernetes API server:

```yaml
# Add to kube-apiserver configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --audit-log-path=/var/log/kubernetes/audit/audit.log
    - --audit-log-maxage=30
    - --audit-log-maxbackup=10
    - --audit-log-maxsize=100
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    volumeMounts:
    - mountPath: /etc/kubernetes/audit-policy.yaml
      name: audit
      readOnly: true
    - mountPath: /var/log/kubernetes/audit/
      name: audit-log
  volumes:
  - name: audit
    hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
  - name: audit-log
    hostPath:
      path: /var/log/kubernetes/audit/
      type: DirectoryOrCreate
```

### Audit Policy Configuration

Create a detailed audit policy:

```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all requests at the Metadata level.
  - level: Metadata
    # Don't log requests to the following:
    omitStages:
      - "RequestReceived"
    
  # Log actions on sensitive resources at the Request level
  - level: Request
    resources:
    - group: ""
      resources: ["secrets"]
    
  # Log pod exec and attach at the Request level
  - level: Request
    verbs: ["create"]
    resources:
    - group: ""
      resources: ["pods/exec", "pods/attach"]
    
  # Log changes to configmaps and secrets at the Request level
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
    resources:
    - group: ""
      resources: ["configmaps", "secrets"]
    
  # Log all auth decisions
  - level: RequestResponse
    nonResourceURLs:
    - "/api/v1/namespaces/kube-system/"
    - "/api/v1/namespaces/llm-production/"
    
  # Log events at the Request level
  - level: Request
    resources:
    - group: ""
      resources: ["events"]
```

### Centralized Audit Log Analysis

Forward audit logs to central monitoring:

```yaml
# Using fluentd to forward logs
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: logging
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      k8s-app: fluentd-logging
  template:
    metadata:
      labels:
        k8s-app: fluentd-logging
    spec:
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1
        env:
          - name: FLUENT_ELASTICSEARCH_HOST
            value: "elasticsearch"
          - name: FLUENT_ELASTICSEARCH_PORT
            value: "9200"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: audit-logs
          mountPath: /var/log/kubernetes/audit
        - name: config-volume
          mountPath: /fluentd/etc/conf.d
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: audit-logs
        hostPath:
          path: /var/log/kubernetes/audit
      - name: config-volume
        configMap:
          name: fluentd-config
```

## Network Encryption

### Implementing TLS for All Services

Ensure all services use TLS:

```yaml
# Create a certificate for internal service communication
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: llm-app-cert
  namespace: llm-production
spec:
  secretName: llm-app-tls
  duration: 2160h # 90 days
  renewBefore: 360h # 15 days
  subject:
    organizations:
      - Example Corp
  commonName: llm-app-service.llm-production.svc.cluster.local
  isCA: false
  privateKey:
    algorithm: RSA
    encoding: PKCS1
    size: 2048
  usages:
    - server auth
    - client auth
  dnsNames:
    - llm-app-service
    - llm-app-service.llm-production
    - llm-app-service.llm-production.svc
    - llm-app-service.llm-production.svc.cluster.local
  issuerRef:
    name: internal-issuer
    kind: ClusterIssuer
```

### Service with TLS

```yaml
apiVersion: v1
kind: Service
metadata:
  name: llm-app-service
  namespace: llm-production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: https
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:region:account-id:certificate/cert-id
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "https"
spec:
  selector:
    app: llm-app
  ports:
  - name: https
    port: 443
    targetPort: 8443
  type: LoadBalancer
```

## Data Protection Controls for LLM Applications

### Model Weight Protection

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-model-protected
  namespace: llm-production
spec:
  containers:
  - name: llm-container
    image: myregistry/llm-app:latest
    volumeMounts:
    - name: model-volume
      mountPath: /models
      readOnly: true  # Ensure model weights can't be modified
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
  volumes:
  - name: model-volume
    persistentVolumeClaim:
      claimName: model-weights-pvc
```

### Input Validation and Sanitization

Implement input validation at the API layer:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: llm-input-validation
  namespace: llm-production
spec:
  workloadSelector:
    labels:
      app: llm-app
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.wasm
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
          value:
            config:
              name: "llm-input-validation"
              root_id: "llm-input-validation"
              vm_config:
                runtime: "envoy.wasm.runtime.v8"
                code:
                  local:
                    filename: "/etc/istio/extensions/llm-input-validation.wasm"
```

## Security Checklist

Use this checklist to verify your security configuration:

- [ ] RBAC configured with least-privilege principle
  - [ ] Service accounts created with specific purposes
  - [ ] Roles limited to necessary resources and verbs
  - [ ] RoleBindings connecting service accounts to roles
  - [ ] Verified permissions with `kubectl auth can-i`

- [ ] Network policies restricting traffic
  - [ ] Default deny-all policy in place
  - [ ] Specific ingress/egress rules for required traffic
  - [ ] DNS resolution allowed
  - [ ] Testing performed to verify policy enforcement

- [ ] Secrets managed securely (not in code/YAML)
  - [ ] Secrets created via CLI or external management
  - [ ] Secret rotation strategy implemented
  - [ ] Secrets mounted as needed in containers
  - [ ] Integration with external secret management (production)

- [ ] Pod security context configured
  - [ ] Non-root user configured
  - [ ] Read-only root filesystem where possible
  - [ ] Dropped capabilities and no privilege escalation
  - [ ] Resource limits defined for all containers
  - [ ] Pod Security Standards applied at namespace level

- [ ] Container images scanned for vulnerabilities
  - [ ] CI/CD pipeline includes vulnerability scanning
  - [ ] In-cluster scanning deployed
  - [ ] Image pull policy set to IfNotPresent or Never
  - [ ] Base images regularly updated

- [ ] Kubernetes version up-to-date
  - [ ] Version within N-2 of latest release
  - [ ] CVE monitoring for Kubernetes components
  - [ ] Upgrade plan in place

- [ ] API server audit logging enabled
  - [ ] Detailed audit policy defined
  - [ ] Audit logs forwarded to central monitoring
  - [ ] Regular audit log review processes

- [ ] Regular security scanning of deployments
  - [ ] Periodic vulnerability assessments
  - [ ] Compliance scanning against CIS benchmarks
  - [ ] Container runtime security monitoring

- [ ] Monitoring for security events in place
  - [ ] Alert system for suspicious activity
  - [ ] Runtime security monitoring tools deployed
  - [ ] Regular review of security events

- [ ] Ingress traffic encrypted (TLS)
  - [ ] Valid certificates for all ingress points
  - [ ] Certificate management automated
  - [ ] Internal service communication encrypted

- [ ] Model API endpoints properly authenticated
  - [ ] Authentication required for all API access
  - [ ] Rate limiting implemented
  - [ ] Input validation for all requests
  - [ ] Token-based authentication with short expiry

## Security Decision Tree

```
START
├── Is this a production deployment?
│   ├── YES → Implement full security suite:
│   │         - External secrets management (Vault/AWS/Azure)
│   │         - Network policies with default deny
│   │         - Pod security standards (restricted)
│   │         - Image scanning in CI/CD and runtime
│   │         - Runtime protection
│   │         - Comprehensive RBAC
│   │         - Automated certificate management
│   │         - Central logging with alerting
│   │         - Regular security audits
│   └── NO → Is this a development environment?
│       ├── YES → Implement basic security:
│       │         - Basic RBAC
│       │         - Namespace isolation
│       │         - Local secrets (but not plain text)
│       │         - Relaxed pod security (baseline)
│       │         - Development certificates
│       └── NO → Is this a testing environment?
│           ├── YES → Implement moderate security:
│           │         - Test-specific RBAC
│           │         - Basic network policies
│           │         - Kubernetes secrets
│           │         - Pod security standards (baseline)
│           │         - Monitoring without alerting
│           └── NO → Consult with security team
```

## Remediation Procedures

### RBAC Violations

If unauthorized access is detected:

1. Immediately revoke excessive permissions:
   ```bash
   kubectl delete rolebinding <violating-binding> -n <namespace>
   ```

2. Create proper role with minimal permissions:
   ```bash
   kubectl apply -f proper-role.yaml
   ```

3. Review audit logs to identify any actions taken:
   ```bash
   kubectl logs -n kube-system <audit-pod> | grep <service-account>
   ```

### Secret Exposure

If secrets are exposed:

1. Revoke compromised secrets immediately:
   ```bash
   # Delete and recreate with new values
   kubectl delete secret <exposed-secret> -n <namespace>
   kubectl create secret generic <new-secret> --from-literal=key=newvalue -n <namespace>
   ```

2. Update all applications using the secret:
   ```bash
   kubectl set env deployment/<deployment-name> API_KEY=<new-reference> -n <namespace>
   kubectl rollout restart deployment/<deployment-name> -n <namespace>
   ```

3. Investigate exposure:
   ```bash
   kubectl get events -n <namespace> | grep <secret-name>
   ```

### Network Policy Violations

If unauthorized network traffic is detected:

1. Apply immediate isolation:
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: emergency-isolation
     namespace: <namespace>
   spec:
     podSelector:
       matchLabels:
         app: <compromised-app>
     policyTypes:
     - Ingress
     - Egress
     # Only allow DNS
     egress:
     - to:
       - namespaceSelector:
           matchLabels:
             kubernetes.io/metadata.name: kube-system
         podSelector:
           matchLabels:
             k8s-app: kube-dns
       ports:
       - protocol: UDP
         port: 53
       - protocol: TCP
         port: 53
   ```

2. Investigate traffic patterns:
   ```bash
   # Use network policy logging if available
   kubectl logs -n <namespace> <network-policy-log-pod>
   ```

3. Implement proper network policies based on investigation.

By following these security configurations, you can help ensure that your LLM applications on Kubernetes are protected from common security threats and vulnerabilities.