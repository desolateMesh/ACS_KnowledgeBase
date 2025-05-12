# Comprehensive Troubleshooting Guide for LLM Applications on Kubernetes

This document provides detailed troubleshooting procedures, diagnostic steps, and resolution strategies for common and complex issues when running LLM applications on Kubernetes clusters.

## Table of Contents
1. [Diagnostic Framework](#diagnostic-framework)
2. [Pod Lifecycle Issues](#pod-lifecycle-issues)
3. [Performance and Resource Issues](#performance-and-resource-issues)
4. [Networking Problems](#networking-problems)
5. [Storage Issues](#storage-issues)
6. [Security and Authentication Failures](#security-and-authentication-failures)
7. [LLM-Specific Challenges](#llm-specific-challenges)
8. [Logging and Monitoring](#logging-and-monitoring)
9. [Recovery Procedures](#recovery-procedures)
10. [Advanced Debugging Techniques](#advanced-debugging-techniques)

## Diagnostic Framework

### Troubleshooting Methodology

Always follow this systematic approach when troubleshooting Kubernetes issues:

1. **Observe**: Gather information about the problem
2. **Analyze**: Determine potential causes
3. **Plan**: Develop a resolution strategy
4. **Execute**: Implement the solution
5. **Verify**: Confirm the issue is resolved
6. **Document**: Record the issue and solution for future reference

### Essential Diagnostic Commands

```bash
# Check cluster health
kubectl cluster-info
kubectl get nodes
kubectl describe node <node-name>

# Check pod status
kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace>

# Check logs
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous  # For crashed containers

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Check resource usage
kubectl top nodes
kubectl top pods -n <namespace>
```

## Pod Lifecycle Issues

### Pod Stuck in Pending State

**Symptoms**:
- Pod remains in `Pending` state
- No container creation has begun

**Diagnostic Steps**:
1. Check for resource constraints:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 5 Events
   ```
   
2. Check node capacity and allocatable resources:
   ```bash
   kubectl describe nodes | grep -A 5 "Allocated resources"
   ```

3. Check if the pod has specific node selectors or tolerations:
   ```bash
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 nodeSelector
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 tolerations
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Insufficient CPU/memory | Reduce resource requests or add more nodes to cluster |
| No nodes matching node selector | Modify node selector or label nodes appropriately |
| PersistentVolumeClaim not bound | Check PVC/PV status and provisioner |
| Scheduling constraints | Check for taints, tolerations, affinity/anti-affinity rules |

### Pod Stuck in ImagePullBackOff

**Symptoms**:
- Pod status shows `ImagePullBackOff`
- Container creation fails

**Diagnostic Steps**:
1. Check the exact error message:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 10 Events
   ```

2. Verify image name and credentials:
   ```bash
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep image:
   kubectl get secrets -n <namespace> | grep docker
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Image doesn't exist | Verify image name and tag |
| Authentication failure | Create/update imagePullSecrets |
| Network connectivity issues | Check node network connectivity to registry |
| Registry rate limits | Implement registry caching or increase limits |

### Pod Crashing or Restarting

**Symptoms**:
- Pod shows status `CrashLoopBackOff`
- Container starts but terminates abnormally

**Diagnostic Steps**:
1. Check container logs:
   ```bash
   kubectl logs <pod-name> -n <namespace>
   kubectl logs <pod-name> -n <namespace> --previous
   ```

2. Check resource usage just before crash:
   ```bash
   kubectl top pod <pod-name> -n <namespace>
   ```

3. Check for OOMKilled events:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -i "killed"
   ```

4. Check liveness/readiness probe configuration:
   ```bash
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 15 livenessProbe
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Application error | Fix application code based on error logs |
| Out of Memory (OOM) | Increase memory limits or optimize application |
| Failed liveness probe | Adjust probe parameters or fix health check endpoint |
| Missing dependencies | Ensure all required services/files are available |
| Incompatible versions | Verify compatibility of all components |

### Pod Running but Not Ready

**Symptoms**:
- Pod status is `Running` but shows `0/1` for Ready
- Service doesn't route traffic to the pod

**Diagnostic Steps**:
1. Check readiness probe configuration and status:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 10 "Readiness"
   ```

2. Check application startup logs:
   ```bash
   kubectl logs <pod-name> -n <namespace>
   ```

3. Test network connectivity to readiness endpoint:
   ```bash
   kubectl exec <some-pod> -n <namespace> -- curl -v http://<pod-ip>:<readiness-port>/<path>
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Application still initializing | Increase initialDelaySeconds in readiness probe |
| Readiness endpoint failing | Fix application health check handler |
| Dependencies not available | Ensure dependent services are available |
| Configuration issues | Verify environment variables and config maps |

## Performance and Resource Issues

### High CPU Usage

**Symptoms**:
- Slow response times
- Pod CPU metrics show high utilization
- Application timeouts

**Diagnostic Steps**:
1. Identify high CPU pods:
   ```bash
   kubectl top pods -n <namespace> --sort-by=cpu
   ```

2. Check CPU limits and requests:
   ```bash
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 resources:
   ```

3. Get detailed process information:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- top
   # or
   kubectl exec -it <pod-name> -n <namespace> -- ps aux --sort=-%cpu
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Inadequate CPU allocation | Increase CPU requests/limits |
| Inefficient code | Profile and optimize application code |
| Too many concurrent requests | Implement rate limiting |
| Background tasks consuming CPU | Schedule intensive tasks during off-peak |
| Inefficient LLM inference | Use optimized inference engines (e.g., ONNX) |

### Memory Leaks

**Symptoms**:
- Gradually increasing memory usage
- Pod eventually gets OOMKilled
- Performance degrades over time

**Diagnostic Steps**:
1. Monitor memory usage over time:
   ```bash
   kubectl top pod <pod-name> -n <namespace> --watch
   ```

2. Check container memory stats:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- cat /sys/fs/cgroup/memory/memory.stat
   ```

3. Capture heap dumps if applicable:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- jmap -dump:format=b,file=/tmp/heap.bin <java-pid>
   kubectl cp <pod-name>:/tmp/heap.bin ./heap.bin -n <namespace>
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Application memory leak | Fix memory management in application code |
| Inadequate garbage collection | Tune GC parameters |
| Cached data growing unchecked | Implement cache eviction policies |
| LLM model not being released | Explicitly unload models when not in use |
| Container memory limits too low | Increase memory limits |

### Slow Response Times

**Symptoms**:
- API requests take longer than expected
- Timeouts occur frequently
- Client applications report slow performance

**Diagnostic Steps**:
1. Check for resource bottlenecks:
   ```bash
   kubectl top pods -n <namespace>
   ```

2. Check network latency:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- ping -c 5 <service-name>
   ```

3. Check service endpoints:
   ```bash
   kubectl get endpoints <service-name> -n <namespace>
   ```

4. Analyze application metrics if available:
   ```bash
   kubectl port-forward -n <namespace> svc/prometheus 9090:9090
   # Then access Prometheus UI in browser at localhost:9090
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Resource contention | Increase CPU/memory allocation |
| Network latency | Optimize network policies or zone placements |
| Insufficient replicas | Scale deployment horizontally |
| Database/backend slowness | Optimize queries or scale backend services |
| Large LLM model loading time | Implement model caching or use smaller models |
| Cold starts | Implement keepalive mechanisms |

## Networking Problems

### Service Connectivity Issues

**Symptoms**:
- Unable to connect to service
- Connection timeouts
- "Connection refused" errors

**Diagnostic Steps**:
1. Verify service exists and has endpoints:
   ```bash
   kubectl get svc <service-name> -n <namespace>
   kubectl get endpoints <service-name> -n <namespace>
   ```

2. Check if pods are correctly labeled:
   ```bash
   kubectl get pods -n <namespace> -l app=<app-label> --show-labels
   ```

3. Try direct pod connectivity:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- curl <pod-ip>:<port>
   ```

4. Check network policies:
   ```bash
   kubectl get networkpolicies -n <namespace>
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Misconfigured selectors | Ensure service selector matches pod labels |
| Network policies blocking traffic | Adjust network policies to allow required traffic |
| Service on wrong port | Update service port configuration |
| DNS resolution issues | Check CoreDNS functionality and configuration |
| Pods not ready/healthy | Fix readiness probe issues |

### Ingress Issues

**Symptoms**:
- External URL doesn't reach application
- 404, 502, or other HTTP errors
- TLS certificate warnings

**Diagnostic Steps**:
1. Check ingress configuration:
   ```bash
   kubectl get ingress -n <namespace>
   kubectl describe ingress <ingress-name> -n <namespace>
   ```

2. Verify ingress controller is running:
   ```bash
   kubectl get pods -n ingress-nginx
   ```

3. Check ingress controller logs:
   ```bash
   kubectl logs -n ingress-nginx <ingress-controller-pod>
   ```

4. Verify TLS secrets:
   ```bash
   kubectl get secrets -n <namespace> | grep tls
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Misconfigured hosts or paths | Update ingress resource with correct configuration |
| TLS certificate issues | Check certificate validity and secret mapping |
| Ingress controller errors | Review ingress controller logs and restart if needed |
| Backend service unavailable | Ensure service and pods are running correctly |
| Path rewriting issues | Adjust path rewrite annotations |

### DNS Resolution Problems

**Symptoms**:
- "Unknown host" errors
- Intermittent connectivity
- Delays in service discovery

**Diagnostic Steps**:
1. Check CoreDNS pods:
   ```bash
   kubectl get pods -n kube-system -l k8s-app=kube-dns
   ```

2. Test DNS resolution from pod:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- nslookup <service-name>
   kubectl exec -it <pod-name> -n <namespace> -- nslookup <service-name>.<namespace>.svc.cluster.local
   ```

3. Check CoreDNS configuration:
   ```bash
   kubectl get configmap coredns -n kube-system -o yaml
   ```

4. Check CoreDNS logs:
   ```bash
   kubectl logs -n kube-system -l k8s-app=kube-dns
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| CoreDNS pods unhealthy | Restart CoreDNS pods |
| Incorrect DNS configuration | Check and update CoreDNS ConfigMap |
| Pod DNS config issues | Verify pod's dnsPolicy and dnsConfig |
| Network plugin issues | Check network plugin configuration |
| High DNS traffic/throttling | Scale up CoreDNS deployment |

## Storage Issues

### PersistentVolumeClaim Not Binding

**Symptoms**:
- PVC remains in "Pending" state
- Pod unable to start due to missing volume
- Events show provisioning issues

**Diagnostic Steps**:
1. Check PVC status:
   ```bash
   kubectl get pvc -n <namespace>
   kubectl describe pvc <pvc-name> -n <namespace>
   ```

2. Check available storage classes:
   ```bash
   kubectl get storageclass
   ```

3. Check for available PVs:
   ```bash
   kubectl get pv
   ```

4. Check storage provisioner pods:
   ```bash
   kubectl get pods -n kube-system | grep provisioner
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| No matching PV available | Create matching PV manually |
| Storage class doesn't exist | Create required storage class |
| Storage provisioner issue | Check provisioner logs and restart if needed |
| Capacity constraints | Request smaller volume or free up space |
| Zone/region constraints | Check storage class topology constraints |

### Volume Mount Failures

**Symptoms**:
- Pod fails to start with volume-related errors
- "Unable to mount volumes" events
- Permission denied errors in logs

**Diagnostic Steps**:
1. Check pod events:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 10 Events
   ```

2. Check volume mounts in pod spec:
   ```bash
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 15 volumeMounts
   ```

3. Check if PV is correctly bound:
   ```bash
   kubectl describe pv <pv-name>
   ```

4. Check node kubelet logs:
   ```bash
   # On the specific node
   journalctl -u kubelet | grep -i <volume-name>
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Permission issues | Fix ownership/permissions on persistent volume |
| Mount path already exists | Ensure mount path is empty in container |
| fstab/mount configuration | Check node's mount capabilities |
| Incorrect volume type | Verify volume type compatibility |
| Filesystem corruption | Run fsck on volume |

### Data Persistence Problems

**Symptoms**:
- Data lost when pod restarts
- Unexpected data corruption
- Inconsistent data across replicas

**Diagnostic Steps**:
1. Verify PV reclaim policy:
   ```bash
   kubectl get pv <pv-name> -o yaml | grep persistentVolumeReclaimPolicy
   ```

2. Check volume mounts in container:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- mount | grep <mount-path>
   ```

3. Verify data is being written to correct location:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- ls -la <mount-path>
   ```

4. Check for volume capacity issues:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- df -h
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Writing to ephemeral storage | Update application to use mounted volume |
| Incorrect mount paths | Fix volume mount paths in pod spec |
| PV reclaim policy set to Delete | Change policy to Retain |
| Volume capacity exhausted | Increase PVC size or clean up data |
| Multiple pods writing to same PV | Use ReadWriteMany access mode or separate PVCs |

## Security and Authentication Failures

### RBAC Permission Issues

**Symptoms**:
- "Forbidden" errors in logs
- Operations fail with 403 errors
- ServiceAccount cannot perform actions

**Diagnostic Steps**:
1. Check current permissions:
   ```bash
   kubectl auth can-i <verb> <resource> --as=system:serviceaccount:<namespace>:<serviceaccount> -n <namespace>
   ```

2. Review ServiceAccount configuration:
   ```bash
   kubectl get serviceaccount <sa-name> -n <namespace> -o yaml
   ```

3. Check associated roles and bindings:
   ```bash
   kubectl get roles,clusterroles,rolebindings,clusterrolebindings -n <namespace> | grep <sa-name>
   ```

4. Check auth-related events:
   ```bash
   kubectl get events -n <namespace> | grep -i forbidden
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Missing role bindings | Create appropriate RoleBinding/ClusterRoleBinding |
| Role with insufficient permissions | Add required permissions to Role/ClusterRole |
| Using wrong ServiceAccount | Update pod spec with correct serviceAccountName |
| Namespace scoping issues | Ensure RoleBindings are in correct namespace |
| Aggregated ClusterRole issues | Check APIService and delegated auth configuration |

### Certificate Issues

**Symptoms**:
- TLS handshake failures
- Certificate validation errors
- "x509: certificate has expired" errors

**Diagnostic Steps**:
1. Check certificate expiration:
   ```bash
   kubectl get secret <tls-secret> -n <namespace> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep "Not After"
   ```

2. Verify certificate chain:
   ```bash
   kubectl get secret <tls-secret> -n <namespace> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep "Issuer"
   ```

3. Check certificate usage:
   ```bash
   kubectl get secret <tls-secret> -n <namespace> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep -A 10 "X509v3 Extended Key Usage"
   ```

4. Verify hostname matching:
   ```bash
   kubectl get secret <tls-secret> -n <namespace> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text | grep -A 5 "Subject Alternative Name"
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Expired certificates | Renew certificates |
| Hostname mismatch | Regenerate certificate with correct hostnames |
| Self-signed certificates | Configure trust for self-signed or use proper CA |
| Missing intermediate certs | Include full certificate chain |
| Wrong certificate format | Ensure PEM format and correct key/cert pairing |

### Secret Access Problems

**Symptoms**:
- Application cannot access secrets
- "Permission denied" when reading secret data
- Environment variables missing

**Diagnostic Steps**:
1. Verify secret exists:
   ```bash
   kubectl get secret <secret-name> -n <namespace>
   ```

2. Check secret mount in pod:
   ```bash
   kubectl describe pod <pod-name> -n <namespace> | grep -A 10 Volumes
   ```

3. Check environment variables:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- env | grep <expected-var>
   ```

4. Check mounted secret content:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- ls -la /path/to/secret/mount
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Secret doesn't exist | Create required secret |
| Incorrect secret reference | Fix secretRef or env var reference |
| Pod doesn't have permission | Adjust RBAC for accessing secrets |
| Secret in wrong namespace | Create secret in correct namespace |
| Secret key name mismatch | Use correct key names in references |

## LLM-Specific Challenges

### Model Loading Failures

**Symptoms**:
- Application fails during initialization
- Errors like "Failed to load model"
- Unexpected OOM during model loading

**Diagnostic Steps**:
1. Check application logs for specific model errors:
   ```bash
   kubectl logs <pod-name> -n <namespace> | grep -i "model\|load\|initialize"
   ```

2. Verify model path and permissions:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- ls -la /path/to/model
   ```

3. Check memory usage during load:
   ```bash
   kubectl top pod <pod-name> -n <namespace> --watch
   ```

4. Verify model file integrity:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- sha256sum /path/to/model/file
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Insufficient memory | Increase memory limits and requests |
| Model file corruption | Re-download or restore model from backup |
| Incorrect model path | Update environment variables with correct path |
| Missing model dependencies | Install required libraries or frameworks |
| Incompatible model version | Update model or application version |
| GPU driver/compatibility issues | Verify CUDA/GPU driver compatibility |

### Inference Performance Issues

**Symptoms**:
- Slow prediction times
- Increasing latency over time
- Resource utilization spikes

**Diagnostic Steps**:
1. Profile inference performance:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- python -c "import time; from app import model; start = time.time(); model.predict('test input'); print(f'Time: {time.time() - start}s')"
   ```

2. Check GPU utilization if applicable:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv
   ```

3. Check for memory leaks:
   ```bash
   kubectl top pod <pod-name> -n <namespace> --watch
   ```

4. Analyze request patterns:
   ```bash
   # If using Prometheus metrics
   kubectl port-forward -n <namespace> svc/prometheus 9090:9090
   # Then query for request metrics in Prometheus UI
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Insufficient GPU resources | Add or upgrade GPUs |
| Model too large for hardware | Use model quantization or distillation |
| Inefficient batching | Implement proper batching strategies |
| Memory fragmentation | Restart pods periodically |
| Resource contention | Dedicated nodes for inference workloads |
| Inefficient tokenization | Optimize pre/post processing |

### Model Versioning and Updates

**Symptoms**:
- Unexpected model outputs
- Version mismatches
- Failed model updates

**Diagnostic Steps**:
1. Check current model version:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- cat /path/to/model/version.txt
   ```

2. Verify model storage configuration:
   ```bash
   kubectl get pvc -n <namespace>
   kubectl describe pvc <model-pvc> -n <namespace>
   ```

3. Check update logs:
   ```bash
   kubectl logs <update-job-pod> -n <namespace>
   ```

4. Verify model artifacts:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- ls -la /path/to/model/
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Incomplete model transfer | Verify transfer process and retry |
| Compatibility issues | Check model compatibility with runtime |
| Storage capacity issues | Increase PVC size or clean old models |
| Improper versioning | Implement proper model versioning system |
| Configuration mismatch | Update application config to match model |

## Logging and Monitoring

### Missing or Insufficient Logs

**Symptoms**:
- Unable to troubleshoot issues
- Logs don't contain relevant information
- Log storage fills up quickly

**Diagnostic Steps**:
1. Check logging configuration:
   ```bash
   kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 "env:"
   ```

2. Verify log collection:
   ```bash
   kubectl logs <pod-name> -n <namespace> --tail=50
   ```

3. Check logging agent status (if applicable):
   ```bash
   kubectl get pods -n logging
   kubectl logs <logging-agent-pod> -n logging
   ```

4. Test log generation:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- curl -XPOST http://localhost:8080/logtest
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Incorrect log level | Set appropriate log level (DEBUG, INFO, etc.) |
| Logs sent to wrong output | Configure application to log to stdout/stderr |
| Log aggregation issues | Check fluentd/logstash/etc. configuration |
| Log rotation not configured | Implement log rotation for large log files |
| Application not logging properly | Update application code to add meaningful logs |

### Monitoring System Failures

**Symptoms**:
- Missing metrics
- Prometheus scrape errors
- Alerting not working

**Diagnostic Steps**:
1. Check Prometheus status:
   ```bash
   kubectl get pods -n monitoring
   kubectl logs -n monitoring <prometheus-pod>
   ```

2. Verify ServiceMonitor configuration:
   ```bash
   kubectl get servicemonitor -n <namespace>
   kubectl describe servicemonitor <name> -n <namespace>
   ```

3. Check application metrics endpoint:
   ```bash
   kubectl exec -it <pod-name> -n <namespace> -- curl http://localhost:<metrics-port>/metrics
   ```

4. Verify Prometheus targets:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus 9090:9090
   # Then check targets in Prometheus UI (Status > Targets)
   ```

**Common Causes and Solutions**:

| Cause | Solution |
|-------|----------|
| Missing ServiceMonitor | Create appropriate ServiceMonitor resource |
| Metrics endpoint not exposed | Configure application to expose metrics |
| Incorrect scrape config | Update Prometheus configuration |
| RBAC permission issues | Add necessary permissions for Prometheus |
| Network policy blocking scrape | Update network policies to allow Prometheus traffic |

## Recovery Procedures

### Data Recovery

**Steps for recovering data after failure:**

1. **Identify data source:**
   ```bash
   kubectl get pv,pvc -n <namespace>
   ```

2. **Stop affected workloads:**
   ```bash
   kubectl scale deployment <deployment-name> -n <namespace> --replicas=0
   ```

3. **Create recovery pod:**
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: recovery-pod
     namespace: <namespace>
   spec:
     containers:
     - name: recovery-container
       image: ubuntu:20.04
       command: ["sleep", "3600"]
       volumeMounts:
       - name: data-volume
         mountPath: /recovery-data
     volumes:
     - name: data-volume
       persistentVolumeClaim:
         claimName: <pvc-name>
   ```

4. **Access and recover data:**
   ```bash
   kubectl exec -it recovery-pod -n <namespace> -- bash
   ```

5. **Backup recovered data:**
   ```bash
   kubectl exec -it recovery-pod -n <namespace> -- tar -czvf /tmp/backup.tar.gz /recovery-data
   kubectl cp recovery-pod:/tmp/backup.tar.gz ./backup.tar.gz -n <namespace>
   ```

### Pod Eviction Recovery

**Steps to handle pod evictions due to node issues:**

1. **Identify affected pods:**
   ```bash
   kubectl get pods -n <namespace> | grep Evicted
   ```

2. **Remove evicted pods:**
   ```bash
   kubectl get pods -n <namespace> | grep Evicted | awk '{print $1}' | xargs kubectl delete pod -n <namespace>
   ```

3. **Check node status:**
   ```bash
   kubectl describe node <node-name> | grep -A 5 Conditions
   ```

4. **Cordon problematic node:**
   ```bash
   kubectl cordon <node-name>
   ```

5. **Drain node if necessary:**
   ```bash
   kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
   ```

6. **Fix node issues and uncordon:**
   ```bash
   # After resolving issues
   kubectl uncordon <node-name>
   ```

### Cluster Disaster Recovery

**Steps for major cluster failures:**

1. **Assess the failure scope:**
   ```bash
   kubectl get nodes
   kubectl get cs # Component status
   ```

2. **Secure critical data:**
   ```bash
   # Identify persistent volumes with important data
   kubectl get pv
   
   # If cluster still functions, create backups
   kubectl exec -it -n <namespace> <pod> -- tar -czvf /tmp/backup.tar.gz /data
   kubectl cp -n <namespace> <pod>:/tmp/backup.tar.gz ./backup.tar.gz
   ```

3. **If control plane is intact but workers are down:**
   ```bash
   # Check etcd health
   kubectl exec -it -n kube-system etcd-<master-node> -- etcdctl member list
   
   # Check cluster backup status (if using tools like Velero)
   velero backup get
   ```

4. **For full cluster recovery:**
   - Restore from etcd backups
   - Reinstall cluster components using preferred method (kubeadm, etc.)
   - Apply critical manifests from backup
   - Restore PV data

5. **Verify application recovery:**
   ```bash
   kubectl get deployments,sts,pods -n <namespace>
   ```

## Advanced Debugging Techniques

### API Server Request Tracing

Enable API server request tracing for detailed debugging:

```bash
# Update kube-apiserver manifest to add --v=6 flag
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml

# Add to command section:
- --v=6

# Wait for API server to restart, then check logs
sudo crictl logs $(sudo crictl ps | grep kube-apiserver | awk '{print $1}')
```

### Network Packet Capture

Capture network traffic for detailed analysis:

```bash
# Install tcpdump on node
ssh <node>
sudo apt-get update && sudo apt-get install -y tcpdump

# Capture traffic for specific pod (get pod IP first)
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.podIP}'
sudo tcpdump -i any host <pod-ip> -w /tmp/pod-traffic.pcap

# Copy capture file locally
scp <user>@<node>:/tmp/pod-traffic.pcap ./

# Analyze with Wireshark or other tools
```

### Debugging with Ephemeral Containers

Use ephemeral debug containers (Kubernetes v1.18+):

```bash
# Add debug container to running pod
kubectl debug -it <pod-name> -n <namespace> --image=busybox --target=<container-name>

# For older Kubernetes versions, use kubectl-debug plugin
kubectl-debug <pod-name> -n <namespace>
```

### Node Problem Detector

Deploy Node Problem Detector for automated node diagnostics:

```bash
# Install using Helm
helm repo add deliveryhero https://charts.deliveryhero.io/
helm install npd deliveryhero/node-problem-detector

# Check for detected problems
kubectl get events | grep "NPD"
```

### Core Dumps Analysis

Capture and analyze application core dumps:

```bash
# Configure pod for core dumps
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
  namespace: <namespace>
spec:
  containers:
  - name: debug-container
    image: <app-image>
    securityContext:
      privileged: true
    command: ["sh", "-c", "ulimit -c unlimited && exec <original-command>"]
    volumeMounts:
    - name: core-dumps
      mountPath: /cores
  volumes:
  - name: core-dumps
    emptyDir: {}
EOF

# Trigger core dump (e.g., by sending SIGSEGV)
kubectl exec -it debug-pod -n <namespace> -- bash -c "kill -SIGSEGV 1"

# Copy core dump for analysis
kubectl cp debug-pod:/cores/core.<pid> ./core-dump -n <namespace>

# Analyze with appropriate tools (gdb, etc.)
```

## Troubleshooting Decision Tree

```
START: Pod/Application Issue Detected
├── Is the pod running?
│   ├── NO → Is it pending/waiting to start?
│   │   ├── YES → Check Events and Pod Description
│   │   │   ├── Resource constraints? → Adjust resources or scale cluster
│   │   │   ├── Image issues? → Fix image reference or registry access
│   │   │   ├── Volume issues? → Fix PVC/storage problems
│   │   │   └── Scheduling issues? → Check node selectors, taints, affinity
│   │   └── NO → Is it in CrashLoopBackOff?
│   │       ├── YES → Check logs and previous container logs
│   │       │   ├── Application error? → Fix application code
│   │       │   ├── Config error? → Fix ConfigMap/Secret/env vars
│   │       │   └── Resource exhaustion? → Check for OOMKilled events
│   │       └── NO → Is it in ImagePullBackOff?
│   │           ├── YES → Check image name and registry access
│   │           └── NO → Check other pod statuses (see Pod Lifecycle Issues)
│   └── YES → Is the application working correctly?
│       ├── NO → Is pod "Ready"?
│       │   ├── NO → Check readiness probe and application health
│       │   └── YES → Are logs showing errors?
│       │       ├── YES → Debug application-specific errors
│       │       └── NO → Check connectivity to services/dependencies
│       └── YES → Is performance acceptable?
│           ├── NO → Check resource usage and limits
│           │   ├── High CPU? → Profile and optimize code
│           │   ├── High memory? → Check for leaks or increase limits
│           │   └── Network bottlenecks? → Check network policies and latency
│           └── YES → Is this a sporadic issue?
│               ├── YES → Set up better monitoring/logging
│               └── NO → Issue resolved, document findings
```

This comprehensive troubleshooting guide provides a systematic approach to diagnosing and resolving issues with LLM applications running on Kubernetes. It covers the most common problem areas and provides specific commands, examples, and decision trees to guide resolution efforts.