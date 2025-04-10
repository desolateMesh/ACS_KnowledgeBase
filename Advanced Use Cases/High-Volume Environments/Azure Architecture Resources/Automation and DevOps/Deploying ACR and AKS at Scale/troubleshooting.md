# Troubleshooting Guide for Scalable ACR and AKS Deployments

**Document Path:** C:\Users\jrochau\projects\ACS_KnowledgeBase\Advanced Use Cases\High-Volume Environments\Azure Architecture Resources\Automation and DevOps\Deploying ACR and AKS at Scale\troubleshooting.md

**Version:** 1.0
**Date:** 2025-04-10 (Current time is Thursday, April 10, 2025 at 7:50:38 AM MDT)
**Location Context:** Greeley, Colorado, United States

## 1. Introduction

This document provides guidance for diagnosing and resolving common issues encountered in scalable Azure Container Registry (ACR) and Azure Kubernetes Service (AKS) environments, as described in the associated `design-patterns.md`, `implementation-guide.md`, and `real-world-examples.md` documents. Troubleshooting complex, distributed systems like AKS at scale requires a systematic approach, leveraging observability data, and understanding the interactions between various Azure services and Kubernetes components.

This guide assumes familiarity with core Kubernetes concepts and access to necessary tools like `kubectl`, Azure CLI (`az`), and potentially read access to Azure Monitor Logs (Log Analytics) and Azure resource metrics/health information.

## 2. General Troubleshooting Approach

Before diving into specific issues, follow these general steps:

1.  **Define the Scope:**
    * What is the exact problem? (e.g., Pods not starting, service unreachable, slow performance).
    * When did the issue begin?
    * What is the blast radius? (e.g., Single pod, all pods in a deployment, specific namespace, entire cluster, specific region).
    * What changed recently? (e.g., New deployment, configuration change via IaC/GitOps/Pipeline, AKS upgrade, Azure platform event).
2.  **Gather Information (Observability is Key):**
    * **Kubernetes Events:** `kubectl get events -A --sort-by='.metadata.creationTimestamp'` often provides initial clues.
    * **Pod Status & Logs:** `kubectl describe pod <pod-name> -n <namespace>` and `kubectl logs <pod-name> [-n <namespace>] [--previous]`.
    * **Node Status:** `kubectl get nodes -o wide`, `kubectl describe node <node-name>`.
    * **Azure Monitor for Containers:** Check dashboards for Node/Pod CPU/Memory/Disk usage, Network I/O.
    * **Log Analytics:** Query relevant tables (e.g., `ContainerLogV2`, `KubeEvents`, `KubePodInventory`, `AzureDiagnostics` for ACR/Firewall/NSG/Load Balancer).
    * **Azure Resource Health:** Check the health status of ACR, AKS Cluster, VM Scale Sets (VMSS), Load Balancers, etc., in the Azure portal.
    * **Azure Activity Log:** Check for relevant Azure operations or platform events.
    * **AKS Diagnose & Solve Problems:** Utilize the built-in troubleshooting blade for AKS in the Azure portal.
3.  **Isolate the Component:** Systematically determine which part of the system is likely causing the issue:
    * Application code within the container?
    * Pod configuration (manifest)?
    * Kubernetes scheduling or resources?
    * AKS node health?
    * AKS control plane?
    * ACR (availability, permissions, networking)?
    * Cluster Networking (CNI, CoreDNS, Services, Network Policies)?
    * External Networking (Ingress, Egress Firewall/NSG, VNet Peering, Private Link, DNS)?
    * Identity & Access Management (Managed Identity, AAD, RBAC)?
    * Secrets Management (Key Vault CSI Driver)?
    * External Dependencies (Databases, APIs)?
4.  **Consult Documentation:** Refer to official Azure documentation, Kubernetes documentation, the specific tool's documentation (Helm, FluxCD, etc.), and internal design/implementation guides.
5.  **Test Incrementally:** Formulate a hypothesis, make one change aimed at resolving the issue, and observe the result before trying something else.

## 3. Common Problem Areas & Solutions

### 4.1. Image Pull Issues (ACR Related)

* **Symptom(s):** Pods stuck in `ImagePullBackOff` or `ErrImagePull` status. `kubectl describe pod <pod-name>` shows events like "Failed to pull image..." with errors like "authentication required", "manifest unknown", "connection refused", "i/o timeout".
* **Possible Causes & Diagnosis Steps:**
    1.  **Typo/Incorrect Reference:** Verify the image name and tag in the Pod manifest (`spec.containers[].image`) exactly match the repository path and tag in ACR.
    2.  **ACR Availability:** Check ACR status in Azure Resource Health. If geo-replicated, ensure the replica targeted by the AKS region is healthy.
    3.  **Network Connectivity (Critical):**
        * **DNS Resolution:** From a node or debug pod (`kubectl run -it --rm debug --image=mcr.microsoft.com/aks/fundamental/base-ubuntu:v0.0.11 -- sh`), can it resolve the ACR FQDN?
            * Public: `nslookup <acr-name>.azurecr.io`
            * Private Link: `nslookup <acr-name>.privatelink.azurecr.io` (or the non-privatelink FQDN if DNS auto-integration is correct)
        * **Private Endpoint:** If using PE:
            * Is the PE status 'Approved' and 'Connected'?
            * Is the Private DNS Zone (`privatelink.azurecr.io`) correctly configured with an A record pointing to the PE's private IP?
            * Is the Private DNS Zone linked to the AKS VNet (and any peered VNets needing access)?
            * Check `/etc/resolv.conf` on AKS nodes/pods to ensure they use DNS servers capable of resolving the private zone.
        * **Firewall/NSG Rules:** Are rules blocking traffic from the AKS node/pod subnet(s) to the ACR endpoint IP (Private or Public) on **Port 443**? Check NSG flow logs or Azure Firewall logs. Remember ACR also needs access to data endpoints (e.g., `<acr-name>.<region>.data.azurecr.io`), often resolved via CNAMEs - ensure firewall allows these too if doing FQDN filtering.
        * **Route Tables (UDRs):** Ensure UDRs don't incorrectly route ACR traffic away from its intended path (e.g., forcing private endpoint traffic over a firewall unnecessarily).
    4.  **Authentication/Authorization:**
        * **AKS-ACR Integration (`--attach-acr`):** Verify the integration exists: `az aks show -g <rg> -n <cluster> --query acrProfile`. Check that the AKS Kubelet Managed Identity (found in the `MC_` resource group -> VMSS -> Identity) has the `AcrPull` role assigned on the target ACR instance (ACR -> Access Control (IAM)).
        * **ImagePullSecrets:** If not using the managed identity integration:
            * Does the secret exist in the correct namespace? (`kubectl get secret <secret-name> -n <namespace>`)
            * Is the secret referenced correctly in the Pod spec (`spec.imagePullSecrets`)?
            * Does the secret contain valid credentials (e.g., decoded base64 username/password for an SP or ACR Token)? (`kubectl get secret <secret-name> -n <namespace> -o yaml`)
            * Does the Service Principal or Token have `AcrPull` permission on the ACR?
    5.  **ACR Network Rules (Public Endpoint):** If using the public endpoint with IP Allow-listing, ensure the AKS egress IPs (or Azure Firewall public IP if routing egress) are listed in the ACR network rules.
    6.  **ACR SKU Limits:** While less common, check if you are hitting concurrent request limits on lower ACR SKUs (Basic/Standard) during mass pod scheduling. Premium offers higher limits.
* **Potential Solutions:**
    * Correct image name/tag in the pod manifest.
    * Fix DNS resolution issues (Private DNS Zone configuration, VNet links, node DNS settings).
    * Adjust NSG/Firewall rules to allow traffic to ACR FQDNs/IPs on port 443. Correct UDRs.
    * Ensure AKS Managed Identity has `AcrPull` role on ACR, or correctly configure and reference `imagePullSecrets`.
    * Update ACR IP network rules if needed.
    * Consider upgrading ACR SKU if hitting limits.

### 4.2. AKS Cluster & Node Issues

* **Symptom(s):** Nodes show `NotReady` status in `kubectl get nodes`. Cluster API server is slow or unresponsive. Pods fail to schedule. `kubectl` commands fail or timeout.
* **Possible Causes & Diagnosis Steps:**
    1.  **Node Status:** `kubectl describe node <node-name>`. Examine `Conditions` (e.g., `MemoryPressure`, `DiskPressure`, `PIDPressure`, `NetworkUnavailable`, `KubeletReady`). Check `Events`.
    2.  **Resource Exhaustion:** Check Azure Monitor for Containers -> Nodes for high CPU, Memory, or Disk usage. Check `kubectl top node`. Nodes might be too small for the workload.
    3.  **Kubelet Issues:** The primary agent on the node might be unhealthy. SSH onto node (using `az vmss run-command invoke` or `az aks command invoke` or node-shell) and check `journalctl -u kubelet --no-pager | tail -n 100`. Look for errors.
    4.  **Network Problems:**
        * `NetworkUnavailable=True`: CNI plugin issues. Check CNI logs on the node (e.g., `/var/log/azure-vnet*.log`, `/var/log/azure-ipam*.log` for Azure CNI). IP address exhaustion in the subnet?
        * Node-to-API Server Connectivity: Can the node reach the API server FQDN/IP (check `az aks show...` for endpoint)? Check NSG/Firewall rules blocking required ports (typically 443 or 9000/22 for tunnelfront/konnectivity). Check UDRs. Check DNS resolution for the API server FQDN from the node.
    5.  **Underlying VM/VMSS Health:** Go to the node resource group (`MC_...`) -> VM Scale Sets -> Instances. Check the health state of the underlying VM. Check Azure Activity Log for platform events affecting the VMSS.
    6.  **Disk Issues:** `DiskPressure=True`. Node disk (OS or Temp) is full. Often caused by excessive container logs if not managed, or large container images. Check `df -h` on the node.
    7.  **Control Plane Health:** Check AKS Resource Health in Azure portal. Check Azure Service Health for regional issues. Use `kubectl get componentstatuses` (limited utility).
    8.  **AKS Upgrade Issues:** Node might be stuck during an upgrade process. Check VMSS status and activity log.
* **Potential Solutions:**
    * **Resource Issues:** Scale up the node pool (increase count via `az aks nodepool scale` or adjust Cluster Autoscaler limits). Use larger VM sizes (`az aks nodepool update --node-vm-size ...`). Optimize pod resource requests/limits.
    * **Network Issues:** Fix NSG/Firewall rules. Correct UDRs. Troubleshoot CNI (may need node restart or Azure support). Ensure sufficient IP space in subnets. Fix DNS issues.
    * **Kubelet:** Restart kubelet (`sudo systemctl restart kubelet`) - use with caution. Re-image the node (`az vmss reimage ...`) or delete the underlying VM instance (AKS should replace it if part of VMSS) as a last resort.
    * **Disk Pressure:** Clean up unused images/containers (`docker system prune -a` on node - carefully). Configure log rotation for containers or ship logs off-node faster. Increase OS disk size (`az aks nodepool update --node-osdisk-size ...`).
    * **Control Plane/Platform Issues:** Escalate to Azure Support if control plane is unhealthy or underlying VM issues persist.

### 4.3. Pod Lifecycle & Scheduling Issues

* **Symptom(s):** Pods stuck in `Pending`. Pods repeatedly restarting (`CrashLoopBackOff`). Pods getting `Evicted`.
* **Possible Causes & Diagnosis Steps:**
    1.  **Pending Pods:** `kubectl describe pod <pod-name> -n <namespace>`. Examine `Events`:
        * `FailedScheduling - 0/X nodes are available: X Insufficient cpu/memory/gpu...`: Pod requests more resources than available on any node. Check `describe node` for Allocatable vs Allocated resources. Check pod `spec.containers[].resources.requests`.
        * `FailedScheduling - ... node(s) didn't match node selector/affinity rules`: Pod placement constraints (`nodeSelector`, `nodeAffinity`) aren't met. Check node labels (`kubectl get node --show-labels`).
        * `FailedScheduling - ... node(s) had taint {key=value: NoSchedule} that the pod didn't tolerate`: Pod lacks `tolerations` for taints present on available nodes. Check node taints (`kubectl describe node`).
        * `FailedScheduling - ... persistentvolumeclaim "<pvc-name>" not found` or `... no Persistent Volumes available ...`: Issues binding PVCs. Check PVC status (`kubectl get pvc`), PV status (`kubectl get pv`), StorageClass definition. Check CSI driver logs (e.g., Azure Disk/File CSI driver pods in `kube-system`).
        * Waiting for Cluster Autoscaler: Events might indicate waiting for nodes if CA is configured but slow or hitting limits. Check CA logs (`kubectl logs -n kube-system -l app=cluster-autoscaler`).
    2.  **CrashLoopBackOff Pods:**
        * `kubectl logs <pod-name> -n <namespace>`: Check application logs for errors causing the container to exit immediately after start.
        * `kubectl logs <pod-name> -n <namespace> --previous`: Check logs from the previously terminated instance.
        * `kubectl describe pod <pod-name> -n <namespace>`: Look for `Exit Code`. Check if Liveness/Readiness probes are failing (check probe configuration and events). Check `Last State` for `Reason: OOMKilled` (Out of Memory).
        * Dependencies: Is the application failing because it can't reach a database, external API, or required configuration?
    3.  **Evicted Pods:** `kubectl describe pod <pod-name> -n <namespace>` usually shows the reason (e.g., `The node was low on resource: memory`, `DiskPressure`). Occurs when node resources are critically low.
* **Potential Solutions:**
    * **Pending:** Add nodes or increase node size. Adjust pod resource requests. Correct node selectors/affinity rules or node labels. Add necessary tolerations to pods or remove taints from nodes. Fix storage/PVC/StorageClass issues. Check Cluster Autoscaler configuration and logs.
    * **CrashLoopBackOff:** Fix application bugs. Increase pod memory/CPU limits if OOMKilled. Adjust probe timing, thresholds, or command/endpoint. Ensure dependencies are available and reachable. Check config maps / secrets.
    * **Evicted:** Increase node resources (size or count). Set appropriate pod resource requests *and limits* to prevent overconsumption and allow Kubernetes QoS management. Clean up node disk if DiskPressure is the cause.

### 4.4. Networking Issues (Intra-Cluster & External)

* **Symptom(s):** Pods cannot connect to other pods/Services within the cluster. ClusterIP Services are unreachable. Ingress doesn't route traffic to pods. Pods cannot reach the internet or specific external endpoints. DNS resolution fails.
* **Possible Causes & Diagnosis Steps:**
    1.  **Service Discovery (ClusterIP):**
        * `kubectl get svc <service-name>`: Verify ClusterIP exists.
        * `kubectl get endpoints <service-name>`: Check if backend pod IPs are listed and correct. If empty, check the service's `selector` and the pod's `labels`.
        * `kubectl get pods -l <label-key>=<label-value>`: Verify pods with matching labels exist and are Running.
    2.  **DNS Resolution:**
        * From a debug pod (`kubectl run -it --rm debug --image=mcr.microsoft.com/aks/fundamental/base-ubuntu:v0.0.11 -- sh`):
            * Test internal resolution: `nslookup <service-name>.<namespace>.svc.cluster.local`
            * Test external resolution: `nslookup www.google.com`
        * Check CoreDNS pods: `kubectl get pods -n kube-system -l k8s-app=kube-dns`. Are they running? Any restarts?
        * Check CoreDNS logs: `kubectl logs -n kube-system -l k8s-app=kube-dns`. Look for errors.
        * Check custom CoreDNS config (if applied): `kubectl get configmap coredns-custom -n kube-system -o yaml` (or `coredns`). Misconfiguration can break resolution.
        * Check node `/etc/resolv.conf`: Does it point to the CoreDNS ClusterIP?
    3.  **Network Policies:**
        * `kubectl get networkpolicy -A`: Are policies in place that might be blocking traffic?
        * Test by temporarily deleting a relevant policy (use caution in production).
        * Use tools like `np-viewer` or specific CNI tooling (e.g., `calicoctl`) to visualize or query policy effects.
    4.  **Ingress Issues:**
        * `kubectl describe ingress <ingress-name> -n <namespace>`: Check rules, backends, annotations, events.
        * Check Ingress Controller Logs: Find the controller pods (e.g., `ingress-nginx`, `traefik`, `agic`) and check their logs for errors related to the specific ingress resource or backend connectivity.
        * Check External Load Balancer (Azure LB or App Gateway): Is it healthy? Are health probes succeeding? Check Azure Monitor metrics/logs for the LB/AG. Ensure NSG rules allow traffic from the LB/AG subnet to the AKS nodes on the required ports (`NodePort` or pod ports).
        * Check AGIC (if used): Ensure AGIC pods are running and check their logs. Verify AGIC has permissions on the Application Gateway.
    5.  **Egress Issues:**
        * From a debug pod, test connectivity: `curl -v <external-url>`, `ping <external-ip>`.
        * Check NSG rules associated with the AKS subnet. Are they blocking outbound traffic?
        * Check Route Tables (UDRs). Are they correctly routing traffic (e.g., to Azure Firewall, NAT Gateway, or default internet gateway)?
        * Check Azure Firewall Logs (if used): Is the Firewall dropping the traffic? Check network/application rules.
        * Check for SNAT Port Exhaustion: Monitor `SNAT Connections` metric on the public Load Balancer or check `Diagnose and solve problems` blade on LB/VMSS. High `Failed` SNAT connections indicate exhaustion.
    6.  **CNI Issues:** Check CNI daemonset logs on nodes. Check IP address availability in the pod subnet if using Azure CNI with static block allocation.
* **Potential Solutions:**
    * Correct Service selectors or Pod labels.
    * Restart CoreDNS pods. Fix custom CoreDNS configuration. Troubleshoot node DNS settings.
    * Adjust or remove restrictive Network Policies.
    * Fix Ingress resource definition (rules, annotations). Troubleshoot Ingress controller pods. Correct Load Balancer / App Gateway health probes or backend pool configuration. Fix NSG rules blocking ingress traffic.
    * Adjust NSG/Firewall rules or UDRs for egress traffic.
    * Mitigate SNAT exhaustion: Use Azure NAT Gateway, increase outbound allocated ports on Standard LB, use Service Endpoints/Private Endpoints where possible, optimize application connection reuse.
    * Troubleshoot CNI issues (may require node restart or Azure support).

### 4.5. Security & Identity Issues

* **Symptom(s):** Pods fail to authenticate to other Azure services (Key Vault, Storage, ACR). `kubectl` commands denied due to authorization errors. Secrets Store CSI Driver fails to mount secrets.
* **Possible Causes & Diagnosis Steps:**
    1.  **Pod Identity (Workload Identity / AAD Pod Identity):**
        * Are required components running? (e.g., `aad-pod-identity-mic`, `aad-pod-identity-nmi` for Pod Identity; webhook injector for Workload Identity).
        * Does the pod have the correct label (`aadpodidbinding` for Pod Identity) or does its Service Account have the correct annotations/federation configured (for Workload Identity)?
        * Is the `AzureIdentity`/`AzureIdentityBinding` (Pod Identity) or Service Principal federation (Workload Identity) set up correctly?
        * Does the corresponding Managed Identity / Service Principal have the *correct RBAC role assignments* on the target Azure resource (e.g., Key Vault Secrets Officer, Storage Blob Data Reader)? Check IAM blade on the target resource.
        * Check Azure AD Sign-in logs for the Managed Identity / Service Principal being used by the pod.
        * Check application logs within the pod for detailed authentication errors (e.g., 401/403 status codes, specific error messages).
    2.  **Secrets Store CSI Driver (Key Vault Provider):**
        * Are driver pods running? (`kubectl get pods -n kube-system -l app=secrets-store-csi-driver`). Check logs.
        * Is the `SecretProviderClass` manifest correct? (Key Vault name, Tenant ID, objects array listing secrets/keys/certs).
        * Does the identity used by the driver (AKS Kubelet Managed Identity by default, or Pod/Workload Identity if configured) have `Get` permissions for Secrets/Keys/Certificates on the target Key Vault? Check Key Vault Access Policies or RBAC (IAM).
        * `kubectl describe pod <app-pod-name>`: Look for events related to volume mounts failing.
    3.  **Azure AD Integration / Kubernetes RBAC:**
        * User gets `Error: You must be logged in to the server (Unauthorized)` or similar with `kubectl`.
        * Did the user authenticate via `az login` and get credentials via `az aks get-credentials -g <rg> -n <cluster>` (without `--admin`)?
        * Is the user a member of an AAD group listed in `--aad-admin-group-object-ids` (for cluster-admin access)?
        * Are there `RoleBinding` or `ClusterRoleBinding` resources granting the user or their AAD group the necessary permissions within Kubernetes? Check bindings: `kubectl get clusterrolebinding`, `kubectl get rolebinding -A`. Verify the AAD group object ID in the binding is correct.
* **Potential Solutions:**
    * Correct Pod/Workload Identity configuration (labels, annotations, federation, Azure resources). Assign required Azure RBAC roles to the identity.
    * Ensure CSI driver pods are running. Correct `SecretProviderClass` definition. Grant appropriate permissions on Key Vault to the driver's identity.
    * Ensure users authenticate correctly via `az aks get-credentials`. Add users to relevant AAD groups. Create or fix Kubernetes `RoleBinding`/`ClusterRoleBinding` resources with correct AAD object IDs and desired roles.

### 4.6. Scaling Issues

* **Symptom(s):** Horizontal Pod Autoscaler (HPA) doesn't scale deployments up/down as expected. Cluster Autoscaler (CA) doesn't add new nodes when pods are Pending, or doesn't remove underutilized nodes.
* **Possible Causes & Diagnosis Steps:**
    1.  **HPA Issues:**
        * `kubectl describe hpa <hpa-name> -n <namespace>`: Check `Metrics` section (are current metrics reported?), `Events` section (any scaling errors?), `Conditions`.
        * Is `metrics-server` deployed and running? (`kubectl get deployment metrics-server -n kube-system`). Check its logs. Are metrics available? (`kubectl top pod -n <namespace>`, `kubectl top node`).
        * Are **resource requests** set on the pods targeted by the HPA? HPA needs requests (especially for CPU/Memory percentage targets) to calculate utilization.
        * If using custom or external metrics: Is the metrics adapter (e.g., Prometheus adapter, Azure Monitor adapter) deployed and configured correctly? Are the custom metrics being scraped/reported?
        * Are HPA `minReplicas` / `maxReplicas` configured appropriately? Is the current replica count already at the max/min limit?
    2.  **Cluster Autoscaler Issues:**
        * Check CA logs: `kubectl logs -n kube-system -l app=cluster-autoscaler`. Look for errors like:
            * Azure API throttling.
            * Node group discovery issues.
            * Failure to provision VMSS instances (check Azure Activity Log for VMSS).
            * Nodes reported as unready, preventing scale-down.
            * Pods that cannot be evicted preventing scale-down (e.g., due to strict `PodDisruptionBudget`, local storage usage, certain annotations).
            * Pods requesting resources (e.g., specific GPU type, huge memory) that cannot be satisfied by any available VM size in the configured node pools.
        * Check CA deployment configuration (scan interval, scale-down thresholds, node pool min/max limits).
        * Check Azure subscription quotas/limits for vCPUs, Public IPs, etc.
        * Are nodes underutilized but not scaling down? Check scale-down delay settings. Check for pods with annotations preventing eviction.
* **Potential Solutions:**
    * **HPA:** Ensure `metrics-server` is running. Set pod resource requests. Fix custom/external metrics adapter configuration. Adjust HPA min/max replicas or target utilization levels.
    * **CA:** Adjust node pool min/max sizes (`az aks nodepool update --update-cluster-autoscaler ...`). Fix node readiness issues. Review/adjust `PodDisruptionBudget` configurations. Ensure node pools have appropriate VM sizes/types available for requested pod resources. Check/increase Azure quotas. Adjust CA configuration parameters (e.g., `--scan-interval`, `--scale-down-unneeded-time`). Address Azure API throttling (may require support ticket or optimizing calls).

## 5. Tools & Commands Cheatsheet

* **Pod Info:**
    * `kubectl get pods -A -o wide`
    * `kubectl describe pod <pod> -n <ns>`
    * `kubectl logs <pod> [-n <ns>] [-c <container>] [-f] [--previous]`
    * `kubectl exec -it <pod> -n <ns> -- sh` (or `bash`)
    * `kubectl top pod -A`
* **Node Info:**
    * `kubectl get nodes -o wide`
    * `kubectl describe node <node>`
    * `kubectl top node`
    * `kubectl cordon <node>` / `kubectl uncordon <node>`
    * `kubectl drain <node> --ignore-daemonsets --delete-local-data` (Use with care)
* **Cluster & API Objects:**
    * `kubectl get events -A --sort-by='.metadata.creationTimestamp'`
    * `kubectl get all -n <ns>`
    * `kubectl get svc -A`
    * `kubectl get endpoints -A`
    * `kubectl get ingress -A`
    * `kubectl get networkpolicy -A`
    * `kubectl get pvc -A`
    * `kubectl get pv`
    * `kubectl get sc` (StorageClass)
    * `kubectl get secret [-n <ns>]`
    * `kubectl get configmap [-n <ns>]`
    * `kubectl api-resources`
    * `kubectl api-versions`
* **Scaling:**
    * `kubectl get hpa -A`
    * `kubectl describe hpa <hpa> -n <ns>`
    * `kubectl logs -n kube-system -l app=cluster-autoscaler`
* **Networking/DNS:**
    * `kubectl logs -n kube-system -l k8s-app=kube-dns`
    * (Inside debug pod): `nslookup <service>.<ns>`, `ping <ip>`, `curl -v <url>`
* **Azure CLI:**
    * `az aks show -g <rg> -n <cluster>`
    * `az aks get-credentials -g <rg> -n <cluster> [--admin]`
    * `az aks nodepool list/show/scale/update -g <rg> --cluster-name <cluster> ...`
    * `az aks check-acr -g <rg> -n <cluster> --acr <acr-name>.azurecr.io`
    * `az aks command invoke -g <rg> -n <cluster> --command "<kubectl command>"`
    * `az acr show/check-health -n <acr-name>`
    * `az network nsg/firewall/route-table/vnet/private-endpoint ...`
* **Azure Portal:** Resource Health, Activity Logs, Metrics (Monitor), Log Analytics, AKS Diagnose & Solve Problems.

## 6. Escalation

Consider contacting Azure Support when:

* Suspected Azure platform issues (VM health, underlying network problems, control plane instability).
* Persistent AKS control plane unresponsiveness or errors after standard checks.
* Unresolved networking issues where Azure infrastructure (LB, Firewall, PE, VNet) is suspected after verifying configurations.
* Consistent Azure API throttling impacting operations (e.g., Cluster Autoscaler).
* Complex identity or integration issues involving multiple Azure services that defy standard troubleshooting.
* Issues occurring during or immediately after an AKS version upgrade.

**When creating a support request:** Provide detailed information including the cluster FQDN/Resource ID, region, approximate time of issue occurrence, specific error messages, correlation IDs (if available from Azure logs), troubleshooting steps already taken, and impact assessment.

## 7. Conclusion

Troubleshooting ACR and AKS at scale requires a methodical approach, leveraging the rich observability data provided by Kubernetes and Azure Monitor. By understanding the common failure points outlined in this guide, particularly those related to networking, identity, and scaling in complex environments, engineers can more effectively diagnose and resolve issues. Remember to correlate symptoms with recent changes and consult the specific design and implementation details of your environment.