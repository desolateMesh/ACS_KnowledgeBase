# Container Security Best Practices

## Table of Contents
- [Introduction](#introduction)
- [Container Security Fundamentals](#container-security-fundamentals)
- [Secure Container Images](#secure-container-images)
- [Container Runtime Security](#container-runtime-security)
- [Kubernetes Security](#kubernetes-security)
- [Network Security for Containers](#network-security-for-containers)
- [Secrets Management](#secrets-management)
- [Monitoring and Detection](#monitoring-and-detection)
- [Incident Response for Container Environments](#incident-response-for-container-environments)
- [Compliance and Auditing](#compliance-and-auditing)
- [DevSecOps Integration](#devsecops-integration)
- [Tools and Resources](#tools-and-resources)
- [Common Vulnerabilities and Mitigations](#common-vulnerabilities-and-mitigations)
- [References](#references)

## Introduction

Container technology has revolutionized application development and deployment by providing lightweight, portable, and isolated environments. However, this paradigm shift brings unique security challenges that must be addressed throughout the container lifecycle.

This document provides comprehensive security best practices for containerized environments, covering the entire container lifecycle from development to production. These guidelines are applicable to Docker, Kubernetes, and other container orchestration platforms.

### Why Container Security Matters

Containers face unique security challenges:

- **Shared kernel**: Unlike VMs, containers share the host OS kernel, potentially increasing the attack surface
- **Ephemeral nature**: Containers are temporary, making traditional security approaches less effective
- **Image-based deployment**: Security issues in base images can propagate to all derived containers
- **Complex orchestration**: Container orchestration adds additional layers that need to be secured
- **DevOps velocity**: Rapid deployment cycles require automated security controls

### Container Security Principles

1. **Defense in depth**: Implement multiple layers of security controls
2. **Least privilege**: Only provide the minimum access necessary
3. **Immutability**: Treat containers as immutable and replace rather than modify them
4. **Automated security**: Build security into CI/CD pipelines
5. **Continuous monitoring**: Implement real-time visibility across the container ecosystem

## Container Security Fundamentals

### Container vs. VM Security Model

Containers differ fundamentally from virtual machines in their security architecture:

```
┌─────────────┐ ┌─────────────┐   ┌─────────────┐ ┌─────────────┐
│    App A    │ │    App B    │   │    App A    │ │    App B    │
├─────────────┤ ├─────────────┤   ├─────────────┤ ├─────────────┤
│ Bin/Libs A  │ │ Bin/Libs B  │   │  Guest OS A │ │  Guest OS B │
├─────────────┴─┴─────────────┤   ├─────────────┤ ├─────────────┤
│      Container Engine       │   │ Hypervisor  │ │ Hypervisor  │
├───────────────────────────┬─┤   ├─────────────┴─┴─────────────┤
│           Host OS         │ │   │           Host OS           │
├───────────────────────────┤ │   ├───────────────────────────┬─┤
│        Infrastructure     │ │   │       Infrastructure      │ │
└───────────────────────────┘ │   └───────────────────────────┘ │
                            \_/                               \_/
                      Container Model                     VM Model
```

**Security implications:**
- Containers provide process-level isolation rather than hardware-level isolation
- Container escapes can compromise the host and all other containers
- Kernel vulnerabilities affect all containers on the host

### Threat Model for Containerized Applications

Understanding the threat model is essential for effective security:

| Threat Vector | Description | Mitigation Strategies |
|---------------|-------------|------------------------|
| Vulnerable application code | Application vulnerabilities in containerized apps | Secure coding, dependency scanning |
| Vulnerable dependencies | Outdated or vulnerable libraries | Dependency scanning, regular updates |
| Insecure container images | Backdoors, malware in base images | Image scanning, trusted repositories |
| Container escape | Breaking out of container isolation | Kernel hardening, runtime security |
| Excessive privileges | Unnecessary capabilities or permissions | Least privilege principle |
| Secrets exposure | Credentials embedded in images or environment | Secrets management solutions |
| Network attacks | Lateral movement between containers | Network segmentation, firewalls |
| Supply chain attacks | Compromising the build pipeline | Secure CI/CD, signing |

## Secure Container Images

### Minimal Base Images

Use minimal, purpose-built base images to reduce attack surface:

```dockerfile
# BAD: Using a full OS image
FROM ubuntu:22.04

# BETTER: Using a minimal base image
FROM alpine:3.18

# BEST: Using a distroless image for production
FROM gcr.io/distroless/static-debian11
```

**Why it matters**: Each additional package in the base image increases the attack surface and potential vulnerabilities. Distroless images contain only your application and its runtime dependencies, nothing else.

### Multi-stage Builds

Implement multi-stage builds to minimize final image size:

```dockerfile
# Build stage
FROM golang:1.20 AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app .

# Final stage
FROM alpine:3.18
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/app .
CMD ["./app"]
```

**Benefits**:
- Smaller final images
- No build tools in production image
- Reduced attack surface
- Separation of build dependencies from runtime dependencies

### Image Scanning

Integrate vulnerability scanning into your build pipeline:

```bash
# Using Trivy scanner example
trivy image --severity HIGH,CRITICAL --exit-code 1 my-app:latest

# Using Anchore example
anchore-cli image add my-app:latest
anchore-cli image wait my-app:latest
anchore-cli image vuln my-app:latest os
```

**Scanning recommendations**:
- Scan both base images and final images
- Scan for vulnerabilities AND misconfigurations
- Establish vulnerability thresholds for blocking builds
- Implement exception processes for false positives
- Integrate scanning into CI/CD pipelines

**Example Jenkins pipeline with scanning**:

```groovy
pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'docker build -t myapp:$BUILD_NUMBER .'
            }
        }
        stage('Scan') {
            steps {
                sh 'trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:$BUILD_NUMBER'
            }
        }
        // Remaining pipeline stages
    }
}
```

### Image Signing and Verification

Implement image signing to ensure image integrity:

```bash
# Using Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push mycompany/myapp:1.0.0

# Using Cosign
cosign sign --key cosign.key mycompany/myapp:1.0.0
cosign verify --key cosign.pub mycompany/myapp:1.0.0
```

**Best practices for image signing**:
- Use hardware security modules (HSMs) for storing signing keys
- Implement role separation for signing authority
- Verify signatures before deployment
- Configure registries to reject unsigned images
- Rotate signing keys regularly

### Private Registries and Access Control

Set up private registries with proper access controls:

```bash
# Example: Setting up authorization in Azure Container Registry
az acr create --resource-group myResourceGroup --name myRegistry --sku Premium
az acr update --name myRegistry --admin-enabled false
az role assignment create --assignee <user-principal-id> --role AcrPush --scope <registry-resource-id>
```

**Registry security requirements**:
- Implement RBAC for registry access
- Enable vulnerability scanning in the registry
- Configure image retention and deletion policies
- Use separate repositories for development and production images
- Apply content trust policies at the registry level
- Monitor and audit registry access and operations

## Container Runtime Security

### Container Isolation

Enhance container isolation with security settings:

```yaml
# Kubernetes pod security context example
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  containers:
  - name: secure-container
    image: nginx
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
          - ALL
        add:
          - NET_BIND_SERVICE
```

**Key isolation mechanisms**:
- **Namespaces**: Isolate container process trees, networking, mounts, etc.
- **Control Groups (cgroups)**: Limit resource usage to prevent DoS
- **Capabilities**: Granular privileges instead of full root access
- **Seccomp**: Restrict available system calls
- **AppArmor/SELinux**: Mandatory access control

### Secure Container Runtime Configuration

Apply secure defaults to container runtimes:

```json
// Example Docker daemon configuration (/etc/docker/daemon.json)
{
  "icc": false,
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
```

**Docker runtime security settings**:
- `icc: false` - Disable inter-container communication
- `no-new-privileges: true` - Prevent gaining additional privileges
- `userland-proxy: false` - Reduce attack surface
- `live-restore: true` - Keep containers running during daemon updates

### Non-Root Containers

Run containers as non-root users:

```dockerfile
FROM alpine:3.18

# Create a non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

# Set working directory and permissions
WORKDIR /app
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

CMD ["./app"]
```

**Why non-root matters**:
- Reduces the impact of container escapes
- Follows principle of least privilege
- Required by many Kubernetes security policies
- Makes container-to-host privilege escalation harder

### Read-Only Filesystems

Configure containers with read-only filesystems:

```yaml
# Kubernetes example
apiVersion: v1
kind: Pod
metadata:
  name: readonly-pod
spec:
  containers:
  - name: readonly-container
    image: nginx
    securityContext:
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: temp
      mountPath: /tmp
    - name: nginx-cache
      mountPath: /var/cache/nginx
  volumes:
  - name: temp
    emptyDir: {}
  - name: nginx-cache
    emptyDir: {}
```

**Implementation tips**:
- Identify writable paths needed by application
- Mount specific volumes for required write access
- Use temporary storage (`emptyDir` in Kubernetes) for logs and caches
- Test thoroughly before deploying to production

### Container Resource Limits

Set memory and CPU limits to prevent resource exhaustion:

```yaml
# Kubernetes example
apiVersion: v1
kind: Pod
metadata:
  name: limited-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "500m"
```

**Docker example**:
```bash
docker run -d --memory="256m" --memory-swap="256m" --cpu-shares=1024 --pids-limit=100 myapp:1.0
```

**Best practices for resource limits**:
- Set both requests and limits
- Base limits on actual application requirements
- Include headroom for peak usage
- Limit process counts to prevent fork bombs
- Configure out-of-memory (OOM) behavior

## Kubernetes Security

### Pod Security Standards

Apply Pod Security Standards to enforce container security:

```yaml
# Example: Applying Pod Security Standards in Kubernetes 1.25+
apiVersion: v1
kind: Namespace
metadata:
  name: secure-ns
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Pod Security Standards levels**:
- **Privileged**: No restrictions (avoid in production)
- **Baseline**: Prevents known privilege escalations
- **Restricted**: Heavily restricted context following security best practices

**Key restrictions in "restricted" profile**:
- Runs as non-root user
- Prevents privilege escalation
- Drops all capabilities by default
- Uses strict seccomp profiles
- Requires read-only root filesystem

### RBAC Configuration

Implement proper RBAC (Role-Based Access Control):

```yaml
# Role definition
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**RBAC best practices**:
- Follow principle of least privilege
- Use namespaced roles instead of cluster roles when possible
- Create roles for specific functions, not per-person
- Regularly audit RBAC configurations
- Implement a process for RBAC change requests
- Use Groups for role assignments rather than individual Users

### Network Policies

Define network policies to control pod communication:

```yaml
# Example: Restricting pod network access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

**Network policy strategy**:
1. Start with a default-deny policy
2. Add specific allow rules for required communication
3. Segment network by namespace and labels
4. Restrict egress to prevent data exfiltration
5. Implement DNS policies for name resolution control

### Admission Controllers

Use admission controllers to enforce security policies:

```yaml
# Example: OPA Gatekeeper constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels: ["team"]
```

**Key admission controllers for security**:
- **PodSecurityPolicy** (deprecated in K8s 1.25+, replaced by Pod Security Standards)
- **OPA Gatekeeper** or **Kyverno** for policy enforcement
- **ImagePolicyWebhook** for image validation
- **ValidatingAdmissionWebhook** for custom validation logic
- **AlwaysPullImages** to enforce fresh image pulls
- **LimitRanger** for resource constraints

**Example Kyverno policy to enforce image signing**:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: verify-cosign-signatures
    match:
      resources:
        kinds:
        - Pod
    verifyImages:
    - imageReferences:
      - "registry.example.com/*"
      attestors:
      - entries:
        - keyless:
            subject: "https://github.com/organization/app/.github/workflows/build.yaml@refs/heads/main"
            issuer: "https://token.actions.githubusercontent.com"
```

### Control Plane Security

Secure the Kubernetes control plane components:

```bash
# Example: Secure API server configuration
kube-apiserver \
  --anonymous-auth=false \
  --audit-log-path=/var/log/kubernetes/audit.log \
  --audit-log-maxage=30 \
  --audit-log-maxbackup=10 \
  --audit-log-maxsize=100 \
  --authorization-mode=Node,RBAC \
  --client-ca-file=/etc/kubernetes/pki/ca.crt \
  --enable-admission-plugins=NodeRestriction,PodSecurityPolicy \
  --encryption-provider-config=/etc/kubernetes/encryption-config.yaml \
  --tls-cert-file=/etc/kubernetes/pki/apiserver.crt \
  --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
```

**Control plane hardening recommendations**:
1. **API Server**:
   - Enable RBAC and webhook authorization
   - Configure TLS properly
   - Implement API server audit logging
   - Use admission controllers
   - Enable encryption at rest

2. **etcd**:
   - Configure TLS for client and peer communication
   - Implement proper authentication
   - Encrypt sensitive data
   - Set up regular backups
   - Restrict network access to etcd servers

3. **Controller Manager & Scheduler**:
   - Use secure kubeconfig files
   - Limit service account token creation
   - Configure appropriate logging levels

### Kubernetes Secrets Management

Properly handle Kubernetes secrets:

```yaml
# Example: Creating and using encrypted secrets
apiVersion: v1
kind: Secret
metadata:
  name: database-creds
type: Opaque
data:
  username: YWRtaW4=       # base64 encoded "admin"
  password: UEAkc3cwcmQ=   # base64 encoded "P@$sw0rd"

---
# Using the secret in a pod
apiVersion: v1
kind: Pod
metadata:
  name: db-client
spec:
  containers:
  - name: app
    image: myapp:1.0
    env:
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: database-creds
          key: username
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: database-creds
          key: password
```

**Kubernetes secrets best practices**:
- Enable encryption at rest for etcd
- Use external secrets management systems (HashiCorp Vault, AWS Secrets Manager, etc.)
- Mount secrets as volumes instead of environment variables when possible
- Set appropriate RBAC for secrets access
- Implement secret rotation procedures
- Avoid committing secrets to version control
- Consider using sealed secrets for GitOps workflows

## Network Security for Containers

### Container Network Segmentation

Implement proper network segmentation:

```yaml
# Example: Network segmentation using Cilium NetworkPolicy
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "app-layer-policy"
spec:
  endpointSelector:
    matchLabels:
      app: online-shop
      tier: frontend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: online-shop
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/products"
```

**Key network segmentation approaches**:
- Namespace-based isolation
- Label-based policies
- Application-layer (L7) filtering
- Zero-trust network architecture
- Network microsegmentation

### Service Mesh Security

Implement a service mesh for additional security controls:

```yaml
# Example: Istio AuthorizationPolicy
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: frontend-ingress
  namespace: default
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/gateway"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/ui/*"]
```

**Service mesh security capabilities**:
- **mTLS** for service-to-service encryption
- **Authentication** of service identities
- **Authorization** for fine-grained access control
- **Certificate management** and rotation
- **Traffic monitoring** and anomaly detection
- **Rate limiting** to prevent DoS attacks

### Container Ingress Security

Secure container ingress with proper controls:

```yaml
# Example: Secure Ingress with TLS and rate limiting
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secured-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/enable-modsecurity: "true"
    nginx.ingress.kubernetes.io/modsecurity-snippet: |
      SecRuleEngine On
      SecRequestBodyLimit 10485760
    nginx.ingress.kubernetes.io/limit-rps: "10"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - secure-app.example.com
    secretName: secure-app-tls
  rules:
  - host: secure-app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: secure-app
            port:
              number: 80
```

**Ingress security controls**:
- TLS termination with strong ciphers
- Web Application Firewall (WAF) rules
- Rate limiting and connection limits
- HTTP security headers
- IP whitelisting for admin interfaces
- CSRF protection
- Bot protection

## Secrets Management

### External Secrets Management

Integrate with external secrets management systems:

```yaml
# Example: Using external-secrets to fetch from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: "15m"
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: production/db/credentials
      property: username
  - secretKey: password
    remoteRef:
      key: production/db/credentials
      property: password
```

**External secrets management options**:
- **HashiCorp Vault**: Full-featured secrets management
- **AWS Secrets Manager**: Cloud-native AWS solution
- **Azure Key Vault**: Microsoft's secrets service
- **GCP Secret Manager**: Google Cloud's offering
- **CyberArk**: Enterprise secrets management

### Runtime Secrets Injection

Dynamically inject secrets at runtime:

```yaml
# Example: HashiCorp Vault Agent Injector
apiVersion: v1
kind: Pod
metadata:
  name: vault-agent-demo
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/agent-inject-secret-database-creds: "database/creds/db-app"
    vault.hashicorp.com/agent-inject-template-database-creds: |
      {{- with secret "database/creds/db-app" -}}
      {
        "username": "{{ .Data.username }}",
        "password": "{{ .Data.password }}"
      }
      {{- end -}}
    vault.hashicorp.com/role: "db-app"
spec:
  containers:
  - name: app
    image: myapp:1.0
```

**Runtime secrets benefits**:
- Short-lived credentials
- No secrets stored in container images or configs
- Automatic rotation
- Access audit trail
- Integration with identity platforms
- Secure transit with TLS

### Sensitive Data Protection

Protect sensitive data in container environments:

```yaml
# Example: Using Sealed Secrets for GitOps
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: mysecret
  namespace: default
spec:
  encryptedData:
    username: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEq...
    password: AgBy3i4OJSWK+PiTySYZZA9rO43cGDEq...
```

**Tools for sensitive data protection**:
- **Sealed Secrets**: Encrypt secrets for secure storage in Git
- **SOPS**: Encrypt files with AWS KMS, GCP KMS, Azure Key Vault, or PGP
- **git-crypt**: Transparent file encryption in Git
- **Vault Agent**: Dynamic secrets creation and injection

## Monitoring and Detection

### Container Runtime Monitoring

Implement comprehensive runtime security monitoring:

```yaml
# Example: Falco rule for detecting suspicious activity
- rule: Terminal Shell in Container
  desc: A shell was spawned in a container with an attached terminal
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and container_entrypoint != "sh"
    and container_entrypoint != "bash"
  output: >
    A shell was spawned in a container with terminal (user=%user.name
    container_id=%container.id container_name=%container.name shell=%proc.name parent=%proc.pname)
  priority: NOTICE
```

**Runtime monitoring capabilities**:
- System call monitoring
- Process activity monitoring
- File integrity monitoring
- Network traffic analysis
- Privilege escalation detection
- Container drift detection
- Anomaly detection

### Centralized Logging

Set up centralized logging for security analysis:

```yaml
# Example: Fluent Bit DaemonSet for container log collection
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:1.9
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
```

**Logging best practices**:
- Collect logs from all container and orchestration layers
- Use a consistent log format (structured logging)
- Include container metadata in logs
- Set appropriate log retention policies
- Filter sensitive information
- Implement real-time log analysis
- Establish log correlation capabilities

### Container Security Scanning

Implement continuous security scanning:

```yaml
# Example: Trivy Operator for continuous scanning
apiVersion: aquasecurity.github.io/v1alpha1
kind: VulnerabilityReport
metadata:
  name: replicaset-nginx-6d4cf56db6-nginx
  namespace: default
  labels:
    trivy-operator.resource.kind: ReplicaSet
    trivy-operator.resource.name: nginx-6d4cf56db6
    trivy-operator.resource.namespace: default
    trivy-operator.container.name: nginx
report:
  registry:
    server: index.docker.io
  artifact:
    repository: library/nginx
    tag: 1.16
  summary:
    criticalCount: 2
    highCount: 10
    mediumCount: 23
    lowCount: 3
    unknownCount: 0
  vulnerabilities:
    - vulnerabilityID: CVE-2020-3810
      resource: apt
      installedVersion: 1.8.2
      fixedVersion: 1.8.2.1
      severity: CRITICAL
      title: Integer overflow in APT
```

**Container scanning areas**:
- Image vulnerability scanning
- Configuration scanning
- Secret scanning
- License compliance
- Malware detection
- SBOM (Software Bill of Materials) generation

## Incident Response for Container Environments

### Container Forensics

Implement forensics capabilities for containers:

```bash
# Example: Capturing a running container for forensics
docker checkpoint create --checkpoint-dir=/tmp/checkpoints mycontainer checkpoint1

# Creating a forensic container image
docker commit <container-id> forensic-image:incident-123

# Extracting container filesystem
docker save forensic-image:incident-123 | tar -xf - -C /forensics

# Using Sysdig Inspect for container forensics
docker run -d --name sysdig-inspect -v /tmp/captures:/captures -p 3000:3000 sysdig/sysdig-inspect
```

**Container forensics challenges and solutions**:
1. **Ephemeral nature**:
   - Use continuous monitoring with history
   - Implement proper logging
   - Consider forensic sidecars

2. **Isolation boundaries**:
   - Collect host-level and container-level data
   - Use container-aware forensic tools
   - Capture both process and network activity

3. **Immutability**:
   - Preserve container state with checkpoints
   - Create forensic images of suspect containers
   - Implement pod-level forensics in Kubernetes

### Incident Response Plan

Develop a container-specific incident response plan:

**1. Preparation**:
- Container inventory and dependencies mapping
- Runtime monitoring tools
- Forensic toolkit for containers
- Team training on container technologies
- Communication procedures
- Documentation of infrastructure

**2. Detection**:
- Runtime anomaly detection
- Container drift monitoring
- Image integrity verification
- Network traffic analysis
- Log correlation
- Alert triage procedures

**3. Containment**:
- Pod/container isolation procedures
- Network segmentation enforcement
- Scaling down compromised services
- Container kill and prevention of restart
- Evidence preservation

**4. Eradication**:
- Vulnerable image identification
- Compromised container removal
- Build pipeline remediation
- Secret rotation
- Configuration updates

**5. Recovery**:
- Deployment of clean images
- Verification of remediations
- Gradual service restoration
- Performance monitoring
- Validation of security controls

**6. Lessons Learned**:
- Root cause analysis
- Security control improvements
- Documentation updates
- Team debrief
- Process improvement

### Kubernetes Incident Response

Kubernetes-specific incident response procedures:

```bash
# Example: Containment actions for compromised pod
# 1. Isolate the pod by applying a deny-all network policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-compromised-pod
  namespace: target-namespace
spec:
  podSelector:
    matchLabels:
      app: compromised-app
  policyTypes:
  - Ingress
  - Egress
EOF

# 2. Preserve the pod state without terminating
kubectl get pod compromised-pod -o yaml > compromised-pod.yaml

# 3. Create a forensic copy if possible
kubectl debug -it compromised-pod --image=forensic-tools:latest --target=compromised-container

# 4. Collect logs before termination
kubectl logs compromised-pod > compromised-pod-logs.txt

# 5. Scale down deployment to prevent new instances
kubectl scale deployment compromised-deployment --replicas=0
```

**Kubernetes forensic data sources**:
- Pod/container logs
- API server audit logs
- Node journal logs
- etcd transaction logs
- Network flow logs
- Resource state exports
- Container runtime logs
- Service mesh telemetry

## Compliance and Auditing

### Container Compliance Frameworks

Map container security controls to common compliance frameworks:

**PCI DSS for Containers**:
| Requirement | Container Security Controls |
|-------------|---------------------------|
| 1. Network Security | Network policies, service mesh, firewalls |
| 2. Secure Passwords | Secrets management, no hardcoded credentials |
| 3. Cardholder Data Protection | Encryption, minimal data in containers |
| 4. Transmission Encryption | TLS, mTLS via service mesh |
| 5. Malware Protection | Image scanning, runtime protection |
| 6. Secure Systems | Minimal images, security patching |
| 7. Access Control | RBAC, least privilege |
| 8. Authentication | Service accounts, MFA for admin access |
| 9. Physical Access | Cloud provider controls |
| 10. Logging & Monitoring | Container runtime monitoring, centralized logs |
| 11. Security Testing | Vulnerability scanning, penetration testing |
| 12. Security Policy | Container security policy |

**HIPAA for Containers**:
| Requirement | Container Security Controls |
|-------------|---------------------------|
| Access Controls | RBAC, namespaces, network policies |
| Audit Controls | Logging, runtime monitoring |
| Integrity Controls | Image signing, immutability |
| Transmission Security | TLS, service mesh encryption |

### Security Benchmarks

Implement container security benchmarks:

```yaml
# Example: Using kube-bench for CIS benchmark scanning
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench
spec:
  template:
    spec:
      hostPID: true
      containers:
      - name: kube-bench
        image: aquasec/kube-bench:latest
        command: ["kube-bench", "--json", "--group=master,node", "--benchmark=cis-1.6"]
        volumeMounts:
        - name: var-lib-kubelet
          mountPath: /var/lib/kubelet
        - name: etc-kubernetes
          mountPath: /etc/kubernetes
      volumes:
      - name: var-lib-kubelet
        hostPath:
          path: /var/lib/kubelet
      - name: etc-kubernetes
        hostPath:
          path: /etc/kubernetes
      restartPolicy: Never
```

**Key security benchmarks**:
- CIS Docker Benchmark
- CIS Kubernetes Benchmark
- NIST SP 800-190 (Container Security)
- OWASP Container Security Verification Standard
- SOC 2 for Container Environments

### Audit Logging

Configure comprehensive audit logging:

```yaml
# Example: Kubernetes API server audit policy
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["pods"]

- level: RequestResponse
  resources:
  - group: ""
    resources: ["pods/exec", "pods/portforward", "pods/proxy", "secrets", "configmaps"]
  - group: "rbac.authorization.k8s.io"
    resources: ["rolebindings", "clusterrolebindings", "roles", "clusterroles"]

- level: Request
  verbs: ["create", "update", "patch", "delete"]

- level: None
  users: ["system:kube-proxy"]
  verbs: ["watch"]
  resources:
  - group: ""
    resources: ["endpoints", "services", "services/status"]
```

**Audit logging best practices**:
- Enable API server audit logging
- Configure appropriate detail levels based on sensitivity
- Implement log forwarding to SIEM
- Set retention policies based on compliance requirements
- Establish log monitoring and alerting
- Create role-based access to audit logs
- Test log collection regularly

## DevSecOps Integration

### Secure CI/CD Pipeline

Integrate security into CI/CD pipelines:

```yaml
# Example: GitLab CI pipeline with security stages
stages:
  - build
  - test
  - scan
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .

unit_tests:
  stage: test
  script:
    - ./run_tests.sh

dependency_scan:
  stage: scan
  script:
    - trivy fs --security-checks vuln,config .

image_scan:
  stage: scan
  script:
    - trivy image --severity HIGH,CRITICAL --exit-code 1 $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

secret_scan:
  stage: scan
  script:
    - gitleaks detect --source . --verbose

deploy:
  stage: deploy
  script:
    - kubectl apply -f k8s/deployment.yml
  only:
    - main
```

**DevSecOps pipeline stages**:
1. **Pre-commit** - Developer workstation:
   - Linting and static analysis
   - Secret scanning
   - Commit signing

2. **Build** - CI system:
   - Dependency scanning
   - SBOM generation
   - Container image building with minimal base

3. **Test** - CI system:
   - Unit and integration testing
   - Container image scanning
   - Compliance validation

4. **Deploy** - CD system:
   - Image signing
   - Deployment with security contexts
   - Network policy enforcement
   - Admission control validation

5. **Runtime** - Production:
   - Drift detection
   - Runtime vulnerability scanning
   - Behavioral monitoring

### Infrastructure as Code Security

Secure IaC templates for container deployments:

```yaml
# Example: Checkov scanning for Terraform
- name: Run Checkov action
  uses: bridgecrewio/checkov-action@master
  with:
    directory: terraform/
    framework: terraform
    output_format: cli
    quiet: true
    soft_fail: false
```

**IaC security best practices**:
- Implement IaC security scanning
- Enforce security standards via policy-as-code
- Use immutable infrastructure patterns
- Version control all infrastructure definitions
- Implement peer review for infrastructure changes
- Create reusable secure infrastructure modules
- Automate security testing for infrastructure

### Container Supply Chain Security

Secure the container supply chain:

```yaml
# Example: Sigstore Cosign for image signing
- name: Sign container image
  run: |
    echo "${{ secrets.COSIGN_PRIVATE_KEY }}" > cosign.key
    cosign sign --key cosign.key $IMAGE_NAME:$IMAGE_TAG
    rm cosign.key
```

**Supply chain security controls**:
1. **Source code**:
   - Code scanning
   - Dependency analysis
   - Source control security

2. **Build process**:
   - Secure build systems
   - Reproducible builds
   - Build provenance

3. **Artifacts**:
   - Image signing
   - SBOM generation
   - Artifact scanning

4. **Distribution**:
   - Secure registries
   - Image verification
   - Policy enforcement

5. **Deployment**:
   - Admission control
   - Runtime verification
   - Continuous validation

### Secure GitOps for Containers

Implement secure GitOps practices:

```yaml
# Example: Flux with image verification
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImagePolicy
metadata:
  name: secure-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: secure-app
  verify:
    - provider: cosign
      secretRef:
        name: cosign-public-key
  policy:
    semver:
      range: '>=1.0.0'
```

**Secure GitOps best practices**:
- Use signed commits
- Implement branch protection rules
- Separate repositories for application and configuration
- Encrypt sensitive values (using Sealed Secrets, SOPS, etc.)
- Implement policy enforcement
- Deploy with reconciliation controllers (Flux, ArgoCD)
- Verify artifact signatures
- Monitor for drift between desired and actual state

## Tools and Resources

### Container Security Tools

Essential tools for container security:

**Image Security**:
- Trivy - Open-source vulnerability scanner
- Clair - Open-source vulnerability analyzer
- Anchore - Container security platform
- Docker Scout - Docker's integrated scanning
- Syft - SBOM generator

**Runtime Security**:
- Falco - Runtime security monitoring
- Tracee - Runtime security tracing
- Sysdig Secure - Container security platform
- Aqua Security - Container security platform
- NeuVector - Container security platform

**Kubernetes Security**:
- kube-bench - CIS benchmark checking
- kube-hunter - Penetration testing
- Kyverno - Policy enforcement
- OPA Gatekeeper - Policy enforcement
- Starboard - Security toolset operator

**Supply Chain Security**:
- Cosign - Container signing
- in-toto - Supply chain integrity
- Notation - Artifact signing
- Kritis - Deploy-time enforcement
- Grafeas - Metadata API for supply chain

### Container Hardening Checklists

**Docker Security Checklist**:
- [ ] Use minimal base images
- [ ] Scan images for vulnerabilities
- [ ] Run containers as non-root user
- [ ] Implement content trust and signing
- [ ] Apply proper resource limits
- [ ] Use read-only filesystem when possible
- [ ] Remove unnecessary capabilities
- [ ] Enable seccomp profiles
- [ ] Implement network segmentation
- [ ] Use secrets management

**Kubernetes Security Checklist**:
- [ ] Implement network policies
- [ ] Configure RBAC properly
- [ ] Apply Pod Security Standards
- [ ] Enable audit logging
- [ ] Secure etcd with encryption
- [ ] Use namespaces for isolation
- [ ] Implement admission controllers
- [ ] Scan workloads continuously
- [ ] Manage secrets securely
- [ ] Keep Kubernetes updated

### Security Monitoring and Response

**Metrics to monitor for container security**:
- Privileged container count
- Container vulnerability metrics
- Image age and update status
- Runtime security events
- Failed access attempts
- Configuration drift metrics
- Network policy violations
- Resource utilization anomalies

**Container security alerts to implement**:
- Privilege escalation attempts
- Container escape attempts
- Unusual network connections
- Runtime binary modifications
- Suspicious process execution
- Volume mount attempts
- Unusual syscall patterns
- API server abuse patterns

## Common Vulnerabilities and Mitigations

### Top Container Security Risks

**Container Escape**:
- **Description**: Attacker breaks out of container isolation
- **Mitigations**:
  - Keep runtime and kernel updated
  - Implement seccomp profiles
  - Drop unnecessary capabilities
  - Use runtime security monitoring
  - Apply LSM (AppArmor/SELinux)

**Vulnerable Dependencies**:
- **Description**: Exploitable libraries in container
- **Mitigations**:
  - Regular dependency scanning
  - Automated updates
  - Minimal base images
  - SBOM management
  - Vulnerability prioritization

**Excessive Privileges**:
- **Description**: Container runs with unnecessary privileges
- **Mitigations**:
  - Run as non-root user
  - Drop capabilities
  - Use read-only filesystems
  - Implement Pod Security Standards
  - Follow principle of least privilege

**Supply Chain Attacks**:
- **Description**: Compromise of build pipeline or base images
- **Mitigations**:
  - Verify image signatures
  - Use trusted base images
  - Implement build provenance
  - Apply CI/CD security controls
  - Monitor for unusual image changes

**Secrets Exposure**:
- **Description**: Credentials accessible in container environment
- **Mitigations**:
  - Use external secrets management
  - Implement secret rotation
  - Conduct secrets scanning
  - Avoid environment variables for secrets
  - Implement least privilege access

### Kubernetes-Specific Vulnerabilities

**RBAC Misconfiguration**:
- **Description**: Excessive permissions granted to users or service accounts
- **Mitigations**:
  - Regular RBAC audits
  - Apply least privilege
  - Use namespace isolation
  - Implement role aggregation
  - Avoid cluster-wide permissions

**Insecure API Server**:
- **Description**: Unsecured Kubernetes API access
- **Mitigations**:
  - Enable authentication
  - Implement proper authorization
  - Use TLS encryption
  - Configure network policies
  - Implement API server audit logging

**etcd Exposure**:
- **Description**: Unsecured access to etcd data store
- **Mitigations**:
  - Enable TLS for etcd
  - Implement encryption at rest
  - Restrict network access
  - Configure proper authentication
  - Regular etcd backups

**Vulnerable Admission Controller**:
- **Description**: Bypass or compromise of admission control
- **Mitigations**:
  - Keep admission controllers updated
  - Implement defense in depth
  - Monitor webhook availability
  - Use multiple policy enforcers
  - Regular security testing

## References

### Standards and Guidelines

- [NIST SP 800-190: Application Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [OWASP Container Security Verification Standard](https://github.com/OWASP/Container-Security-Verification-Standard)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/security-best-practices/)

### Documentation

- [Docker Security](https://docs.docker.com/engine/security/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [Istio Security](https://istio.io/latest/docs/concepts/security/)
- [Open Policy Agent](https://www.openpolicyagent.org/docs/latest/)
- [Falco Runtime Security](https://falco.org/docs/)

### Books

- "Container Security" by Liz Rice
- "Kubernetes Security" by Liz Rice and Michael Hausenblas
- "Hacking Kubernetes" by Andrew Martin and Michael Hausenblas
- "DevOpsSec" by Jim Bird
- "Docker Deep Dive" by Nigel Poulton (Security Chapters)

### Blogs and Articles

- [Aqua Security Blog](https://blog.aquasec.com/)
- [Snyk Container Security Blog](https://snyk.io/blog/category/container-security/)
- [Sysdig Blog](https://sysdig.com/blog/)
- [Trail of Bits Blog](https://blog.trailofbits.com/)
- [NCC Group Research](https://research.nccgroup.com/)

### Training and Courses

- Kubernetes Security Essentials (Linux Foundation)
- Advanced Kubernetes Security (Linux Foundation)
- Container Security Fundamentals (A Cloud Guru)
- Docker Security (Pluralsight)
- Kubernetes Security (Pluralsight)
