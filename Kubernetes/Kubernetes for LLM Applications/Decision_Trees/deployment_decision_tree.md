# Deployment Decision Tree

This document provides a structured decision-making framework for AI agents to determine the optimal deployment approach for LLM applications on Kubernetes.

## Initial Assessment

```
START
├── Is this a new deployment?
│   ├── YES → Go to "New Deployment Path"
│   └── NO → Is this an update to an existing deployment?
│       ├── YES → Go to "Update Path"
│       └── NO → Is this a scaling operation?
│           ├── YES → Go to "Scaling Path"
│           └── NO → Is this a recovery operation?
│               ├── YES → Go to "Recovery Path"
│               └── NO → Go to "Maintenance Path"
```

## New Deployment Path

```
NEW DEPLOYMENT
├── Do you have access to a Kubernetes cluster?
│   ├── NO → Set up a cluster first:
│   │         1. Choose environment (cloud/on-prem)
│   │         2. Size cluster based on model requirements
│   │         3. Enable appropriate node features (GPU, high memory)
│   │         4. Set up proper network access
│   │         5. Verify connection with: kubectl cluster-info
│   └── YES → Is the LLM container image ready?
│       ├── NO → Build container image:
│       │         1. Create Dockerfile with appropriate base image
│       │         2. Include only necessary dependencies
│       │         3. Implement proper entrypoint and healthchecks
│       │         4. Build with: docker build -t myregistry/llm-app:tag .
│       │         5. Push to registry: docker push myregistry/llm-app:tag
│       └── YES → Does the application require custom resources?
│           ├── YES → Configure resources first:
│           │         1. Determine if GPU is needed
│           │         2. Calculate memory requirements (model size * 2 + overhead)
│           │         3. Set CPU requests based on expected throughput
│           │         4. Configure persistent storage for model files
│           │         5. Apply custom resources with: kubectl apply -f custom-resources.yaml
│           └── NO → Does the deployment need special security?
│               ├── YES → Configure security first:
│               │         1. Create service accounts with: kubectl create serviceaccount llm-sa -n namespace
│               │         2. Set up RBAC with appropriate roles
│               │         3. Configure network policies
│               │         4. Set up secrets management
│               │         5. Apply security configs with: kubectl apply -f security-configs.yaml
│               └── NO → Proceed with standard deployment:
│                       1. Create namespace: kubectl create ns llm-app
│                       2. Apply deployment: kubectl apply -f deployment.yaml
│                       3. Apply service: kubectl apply -f service.yaml
│                       4. Verify deployment: kubectl get pods -n llm-app
│                       5. Test endpoint: curl http://service-ip:port/healthz
```

## Update Path

```
UPDATE PATH
├── Is this a critical update?
│   ├── YES → Consider blue-green deployment:
│   │         1. Deploy new version alongside existing: kubectl apply -f deployment-v2.yaml
│   │         2. Verify new version works: kubectl port-forward pod/new-pod 8080:8080
│   │         3. Switch traffic when ready: kubectl patch service llm-service -p '{"spec":{"selector":{"version":"v2"}}}'
│   │         4. Monitor for issues: kubectl logs -f -l version=v2
│   │         5. If issues occur, revert traffic: kubectl patch service llm-service -p '{"spec":{"selector":{"version":"v1"}}}'
│   └── NO → Is this a minor version update?
│       ├── YES → Use rolling update strategy:
│       │         1. Update image in deployment: kubectl set image deployment/llm-app container=image:newtag
│       │         2. Monitor rollout: kubectl rollout status deployment/llm-app
│       │         3. If issues occur: kubectl rollout undo deployment/llm-app
│       │         4. Verify update succeeded: kubectl describe deployment llm-app
│       └── NO → Is this a major version update?
│           ├── YES → Check for breaking changes first:
│           │         1. Review release notes for breaking changes
│           │         2. Test new version in staging environment
│           │         3. Verify API compatibility
│           │         4. Update any dependent services
│           │         5. If changes required, use blue-green deployment
│           │         6. Otherwise, use canary deployment:
│           │            a. Deploy small subset (10%): kubectl apply -f canary-deployment.yaml
│           │            b. Monitor performance: kubectl top pods -l version=canary
│           │            c. If successful, gradually increase traffic
│           │            d. Complete migration when validated
│           └── NO → Is this a configuration-only update?
│               ├── YES → Apply config changes:
│               │         1. Update ConfigMap: kubectl apply -f updated-configmap.yaml
│               │         2. Reload without restart if possible: kubectl rollout restart deployment/llm-app
│               │         3. Verify config was applied: kubectl exec pod/llm-pod -- cat /config/file
│               └── NO → Proceed with standard update procedure:
│                       1. Update resources as needed: kubectl apply -f updated-deployment.yaml
│                       2. Monitor for issues: kubectl get events --watch
│                       3. Validate functionality: kubectl exec pod/llm-pod -- curl localhost:8080/healthz
```

## Scaling Path

```
SCALING PATH
├── Is this automated scaling?
│   ├── YES → Configure HPA:
│   │         1. Define metrics-based scaling: kubectl apply -f hpa.yaml
│   │         2. Set min/max replicas: kubectl autoscale deployment llm-app --min=3 --max=10 --cpu-percent=70
│   │         3. Verify HPA is working: kubectl get hpa
│   │         4. Monitor scaling events: kubectl describe hpa llm-app-hpa
│   │         5. Fine-tune thresholds based on observed behavior
│   └── NO → Is this vertical scaling?
│       ├── YES → Modify resource requests/limits:
│       │         1. Identify current resources: kubectl get deploy llm-app -o yaml | grep resources -A8
│       │         2. Update deployment with new resources: kubectl apply -f updated-resources.yaml
│       │         3. Or use patch: kubectl patch deployment llm-app --type='json' -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"8Gi"}]'
│       │         4. Monitor resource usage after scaling: kubectl top pods -l app=llm-app
│       │         5. Verify application performance with increased resources
│       └── NO → Is this horizontal scaling?
│           ├── YES → Increase replicas count:
│           │         1. Scale deployment: kubectl scale deployment llm-app --replicas=5
│           │         2. Monitor scaling status: kubectl get pods -w
│           │         3. Verify load distribution: kubectl top pods -l app=llm-app
│           │         4. Check if service is balancing traffic: kubectl get endpoints llm-service
│           └── NO → Is this node scaling?
│               ├── YES → Add or modify nodes:
│               │         1. Identify current nodes: kubectl get nodes
│               │         2. If using cloud provider, resize node pool
│               │         3. For custom scaling, add nodes to cluster
│               │         4. Label new nodes appropriately: kubectl label node new-node capability=gpu
│               │         5. Verify nodes are ready: kubectl get nodes
│               │         6. Ensure pods can schedule on new nodes: kubectl get pods -o wide
│               └── NO → Consult human operator:
│                       1. Document scaling request details
│                       2. Provide current state information: kubectl get all -n llm-app
│                       3. Suggest potential scaling approaches
│                       4. Request clarification on scaling objectives
```

## Recovery Path

```
RECOVERY PATH
├── Is the application completely down?
│   ├── YES → Follow full recovery procedure:
│   │         1. Check node status: kubectl get nodes
│   │         2. Check pod status: kubectl get pods -n llm-app
│   │         3. Check logs: kubectl logs -l app=llm-app -n llm-app
│   │         4. Check events: kubectl get events -n llm-app --sort-by='.lastTimestamp'
│   │         5. If pods are stuck in CrashLoopBackOff:
│   │            a. Check previous logs: kubectl logs pod-name -n llm-app --previous
│   │            b. Check if out of memory: kubectl describe pod pod-name -n llm-app | grep -i "killed"
│   │            c. Fix root cause based on error messages
│   │         6. If pods are pending:
│   │            a. Check for resource constraints: kubectl describe pod pod-name -n llm-app
│   │            b. Verify PVC binding if used: kubectl get pvc -n llm-app
│   │            c. Address scheduling issues
│   │         7. If service is down but pods are running:
│   │            a. Check service configuration: kubectl describe svc service-name -n llm-app
│   │            b. Verify endpoints: kubectl get endpoints service-name -n llm-app
│   │            c. Test direct pod connectivity: kubectl exec test-pod -n llm-app -- curl pod-ip:port
│   │         8. Restore to last known good configuration if needed:
│   │            kubectl apply -f known-good-deployment.yaml
│   └── NO → Is the application responding slowly?
│       ├── YES → Check for performance issues:
│       │         1. Check resource utilization: kubectl top pods -n llm-app
│       │         2. Check for memory leaks: kubectl top pods -n llm-app --sort-by=memory
│       │         3. Check for CPU bottlenecks: kubectl top pods -n llm-app --sort-by=cpu
│       │         4. Scale horizontally if under load: kubectl scale deployment llm-app --replicas=5
│       │         5. Check network issues:
│       │            a. Verify service latency: time curl service-ip:port
│       │            b. Check for network policies restricting traffic
│       │            c. Verify DNS resolution within cluster
│       │         6. If LLM-specific issue:
│       │            a. Check for multiple large inference requests
│       │            b. Implement request queuing or batching
│       │            c. Consider model quantization for faster inference
│       └── NO → Are specific features failing?
│           ├── YES → Check component-specific logs:
│           │         1. Identify failing component: kubectl logs -l app=llm-app -n llm-app | grep ERROR
│           │         2. Check related services: kubectl get all -n other-namespace
│           │         3. For data issues:
│           │            a. Check storage: kubectl describe pvc -n llm-app
│           │            b. Verify database connectivity: kubectl exec pod-name -n llm-app -- pg_isready -h db-host
│           │         4. For model-specific issues:
│           │            a. Verify model files exist: kubectl exec pod-name -n llm-app -- ls -la /models
│           │            b. Check model loading logs: kubectl logs pod-name -n llm-app | grep "model"
│           │            c. Restore model files if corrupted
│           └── NO → Verify recent changes/updates:
│                   1. Check recent deployments: kubectl rollout history deployment llm-app -n llm-app
│                   2. Review recent config changes: kubectl get configmaps -n llm-app
│                   3. Check for external dependencies changes:
│                      a. API endpoints that may have changed
│                      b. Database schema updates
│                      c. Network or firewall changes
│                   4. Revert recent changes if needed:
│                      kubectl rollout undo deployment llm-app -n llm-app
```

## Maintenance Path

```
MAINTENANCE PATH
├── Is this routine maintenance?
│   ├── YES → Follow standard maintenance procedure:
│   │         1. Notify stakeholders: [communication step]
│   │         2. Apply maintenance window if needed:
│   │            kubectl cordon node node-name  # Prevent new pods
│   │         3. Drain workloads if needed:
│   │            kubectl drain node node-name --ignore-daemonsets
│   │         4. Perform maintenance tasks
│   │         5. Verify all systems operational:
│   │            kubectl get pods -A | grep -v Running
│   │         6. Uncordon nodes:
│   │            kubectl uncordon node node-name
│   │         7. Verify pods have rescheduled:
│   │            kubectl get pods -o wide | grep node-name
│   └── NO → Is this emergency maintenance?
│       ├── YES → Follow emergency procedure:
│       │         1. Assess impact: kubectl top nodes; kubectl get pods -A -o wide | grep node-name
│       │         2. For critical workloads, reschedule first:
│       │            kubectl scale deployment critical-app --replicas=6  # Scale up to distribute
│       │            kubectl cordon node node-name  # Prevent new pods
│       │         3. Isolate affected components:
│       │            kubectl drain node node-name --ignore-daemonsets --force --delete-local-data
│       │         4. Apply emergency fixes
│       │         5. Verify fixes resolved issue:
│       │            kubectl describe node node-name | grep -A5 Conditions
│       │         6. Reintegrate components:
│       │            kubectl uncordon node node-name
│       └── NO → Is this a scheduled upgrade?
│           ├── YES → Follow upgrade procedure:
│           │         1. Review upgrade documentation
│           │         2. Backup critical components:
│           │            kubectl get all -A -o yaml > pre-upgrade-backup.yaml
│           │         3. For Kubernetes upgrades:
│           │            a. Check version compatibility
│           │            b. Upgrade control plane first
│           │            c. Upgrade worker nodes in batches
│           │            d. Verify all components: kubectl get componentstatuses
│           │         4. For application upgrade:
│           │            a. Test in staging first
│           │            b. Follow "Update Path" workflow
│           │         5. Validate entire system post-upgrade:
│           │            kubectl get pods -A | grep -v Running
│           └── NO → Is this a database migration?
│               ├── YES → Follow database migration procedure:
│               │         1. Create database backup
│               │         2. Scale down application: kubectl scale deployment app --replicas=0
│               │         3. Apply database schema changes
│               │         4. Verify schema migration successful
│               │         5. Update application configuration if needed:
│               │            kubectl apply -f updated-db-config.yaml
│               │         6. Scale up application: kubectl scale deployment app --replicas=3
│               │         7. Verify connectivity: kubectl logs -l app=name | grep "db connection"
│               └── NO → Consult human operator:
│                       1. Document maintenance requirements
│                       2. Collect system state: kubectl get all -n namespace
│                       3. Propose recommended procedure
│                       4. Request specific maintenance instructions
```

## Environment-Specific Considerations

### Cloud Provider Specific

#### AWS EKS

```
AWS EKS DEPLOYMENT
├── Is the cluster already provisioned?
│   ├── NO → Create EKS cluster:
│   │         1. Use eksctl: eksctl create cluster --name=llm-cluster --nodegroup-name=standard-workers --node-type=m5.xlarge --nodes=3 --nodes-min=1 --nodes-max=5 --region=us-west-2
│   │         2. Or use Terraform for IaC approach
│   │         3. Configure kubectl: aws eks update-kubeconfig --name llm-cluster --region us-west-2
│   │         4. Verify connection: kubectl cluster-info
│   └── YES → Do you need GPU nodes?
│       ├── YES → Add GPU node group:
│       │         1. Create GPU node group: eksctl create nodegroup --cluster=llm-cluster --name=gpu-workers --node-type=p3.2xlarge --nodes=2 --nodes-min=0 --nodes-max=4 --region=us-west-2
│       │         2. Install NVIDIA device plugin: kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/master/nvidia-device-plugin.yml
│       │         3. Verify GPU nodes: kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
│       └── NO → Configure IAM roles:
│               1. Create IAM OIDC provider: eksctl utils associate-iam-oidc-provider --cluster=llm-cluster --approve
│               2. Create service account with IAM role: eksctl create iamserviceaccount --name=llm-app-sa --namespace=llm-app --cluster=llm-cluster --attach-policy-arn=arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess --approve
│               3. Use service account in deployment: spec.template.spec.serviceAccountName: llm-app-sa
```

#### Azure AKS

```
AZURE AKS DEPLOYMENT
├── Is the cluster already provisioned?
│   ├── NO → Create AKS cluster:
│   │         1. Use Azure CLI: az aks create --resource-group myResourceGroup --name llm-cluster --node-count 3 --enable-addons monitoring --generate-ssh-keys
│   │         2. Or use Terraform for IaC approach
│   │         3. Configure kubectl: az aks get-credentials --resource-group myResourceGroup --name llm-cluster
│   │         4. Verify connection: kubectl cluster-info
│   └── YES → Do you need GPU nodes?
│       ├── YES → Add GPU node pool:
│       │         1. Create GPU node pool: az aks nodepool add --resource-group myResourceGroup --cluster-name llm-cluster --name gpunodepool --node-count 2 --node-vm-size Standard_NC6 --no-wait
│       │         2. Verify GPU nodes: kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
│       └── NO → Configure Azure identities:
│               1. Create managed identity: az identity create --name llm-app-identity --resource-group myResourceGroup
│               2. Get client ID: CLIENT_ID=$(az identity show --name llm-app-identity --resource-group myResourceGroup --query clientId -o tsv)
│               3. Assign role: az role assignment create --assignee $CLIENT_ID --role "Storage Blob Data Reader" --scope /subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount
│               4. Configure pod identity in AKS: az aks pod-identity add --resource-group myResourceGroup --cluster-name llm-cluster --namespace llm-app --name llm-identity --identity-resource-id /subscriptions/{subscription-id}/resourceGroups/myResourceGroup/providers/Microsoft.ManagedIdentity/userAssignedIdentities/llm-app-identity
```

#### GCP GKE

```
GCP GKE DEPLOYMENT
├── Is the cluster already provisioned?
│   ├── NO → Create GKE cluster:
│   │         1. Use gcloud CLI: gcloud container clusters create llm-cluster --num-nodes=3 --zone=us-central1-a
│   │         2. Or use Terraform for IaC approach
│   │         3. Configure kubectl: gcloud container clusters get-credentials llm-cluster --zone=us-central1-a
│   │         4. Verify connection: kubectl cluster-info
│   └── YES → Do you need GPU nodes?
│       ├── YES → Add GPU node pool:
│       │         1. Create GPU node pool: gcloud container node-pools create gpu-pool --cluster=llm-cluster --accelerator=type=nvidia-tesla-t4,count=1 --machine-type=n1-standard-4 --num-nodes=2 --zone=us-central1-a
│       │         2. Install NVIDIA drivers: kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/master/nvidia-driver-installer/cos/daemonset-preloaded.yaml
│       │         3. Verify GPU nodes: kubectl get nodes "-o=custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu"
│       └── NO → Configure Workload Identity:
│               1. Enable Workload Identity: gcloud container clusters update llm-cluster --zone=us-central1-a --workload-pool=PROJECT_ID.svc.id.goog
│               2. Create IAM service account: gcloud iam service-accounts create llm-app-sa
│               3. Grant permissions: gcloud projects add-iam-policy-binding PROJECT_ID --member="serviceAccount:llm-app-sa@PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.objectViewer"
│               4. Create Kubernetes service account: kubectl create serviceaccount llm-k8s-sa -n llm-app
│               5. Bind IAM and K8s service accounts: gcloud iam service-accounts add-iam-policy-binding llm-app-sa@PROJECT_ID.iam.gserviceaccount.com --role="roles/iam.workloadIdentityUser" --member="serviceAccount:PROJECT_ID.svc.id.goog[llm-app/llm-k8s-sa]"
│               6. Annotate K8s service account: kubectl annotate serviceaccount llm-k8s-sa -n llm-app iam.gke.io/gcp-service-account=llm-app-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Common Error Resolution Path

```
ERROR RESOLUTION
├── What type of error is occurring?
│   ├── ImagePullBackOff → Image pull issues:
│   │         1. Check image name/tag: kubectl describe pod pod-name -n namespace | grep "Image:"
│   │         2. Verify registry credentials: kubectl get secret regcred -n namespace -o yaml
│   │         3. Check registry accessibility from nodes
│   │         4. Resolution:
│   │            a. Update image reference: kubectl set image deployment/name container=correct:tag
│   │            b. Create/update pull secret: kubectl create secret docker-registry regcred --docker-server=registry --docker-username=user --docker-password=pass -n namespace
│   │            c. If temporary registry issue, force pull on nodes directly
│   └── CrashLoopBackOff → Application crash issues:
│       ├── Check container logs: kubectl logs pod-name -n namespace
│       ├── Check previous crash logs: kubectl logs pod-name -n namespace --previous
│       ├── Check for OOM: kubectl describe pod pod-name -n namespace | grep -A5 "Last State"
│       ├── Check configuration: kubectl describe configmap config-name -n namespace
│       ├── Resolution:
│       │   1. Fix application issues based on error messages
│       │   2. Increase memory limit if OOM: kubectl patch deployment name -p '{"spec":{"template":{"spec":{"containers":[{"name":"container-name","resources":{"limits":{"memory":"8Gi"}}}]}}}}'
│       │   3. Fix configuration: kubectl apply -f fixed-configmap.yaml
│       │   4. If severe, debug with temporary debug container: kubectl debug -it pod-name --image=busybox --target=container-name -n namespace
│       └── PodUnschedulable → Scheduling issues:
│           ├── Check for resource constraints: kubectl describe pod pod-name -n namespace
│           ├── Check node status: kubectl get nodes
│           ├── Check taints and tolerations: kubectl describe nodes | grep -A5 Taints
│           ├── Resolution:
│           │   1. Modify resource requests: kubectl apply -f adjusted-deployment.yaml
│           │   2. Add tolerations to handle taints:
│           │      spec.template.spec.tolerations:
│           │      - key: "gpu"
│           │        operator: "Exists"
│           │        effect: "NoSchedule"
│           │   3. If node specific, add node affinity rules:
│           │      spec.template.spec.affinity.nodeAffinity
│           └── ServiceUnavailable → Network/service issues:
│               ├── Check service definition: kubectl describe service service-name -n namespace
│               ├── Check endpoints: kubectl get endpoints service-name -n namespace
│               ├── Check if pods match selector: kubectl get pods -l key=value -n namespace
│               ├── Check network policies: kubectl get networkpolicies -n namespace
│               ├── Resolution:
│               │   1. Fix service selector to match pod labels
│               │   2. Update pod labels to match service selector
│               │   3. Verify pods are Running and Ready
│               │   4. Modify network policies to allow traffic
│               │   5. Test directly from pod: kubectl exec pod-name -n namespace -- curl service-name:port
```

These decision trees provide AI agents with clear, structured paths for making deployment decisions. Follow the appropriate path based on the current operation context.