# Implementation Guide for Scalable Azure Container Registry (ACR) and Azure Kubernetes Service (AKS) Deployment

**Document Path:** C:\Users\jrochau\projects\ACS_KnowledgeBase\Advanced Use Cases\High-Volume Environments\Azure Architecture Resources\Automation and DevOps\Deploying ACR and AKS at Scale\implementation-guide.md

**Version:** 1.0
**Date:** 2025-04-10

## 1. Introduction

This document provides a step-by-step implementation guide for deploying Azure Container Registry (ACR) and Azure Kubernetes Service (AKS) based on the scalable design patterns outlined in the companion document (`design-patterns.md`). The focus is on translating architectural decisions into actionable configuration and deployment steps suitable for enterprise-grade, high-volume environments.

The goal is to provide sufficient detail for automated processes or an AI agent to understand the sequence of actions, necessary configurations, and commands required. While Azure CLI examples are provided for clarity, the use of **Infrastructure as Code (IaC)** tools like Bicep or Terraform is strongly recommended for actual implementation at scale due to benefits in consistency, repeatability, and version control.

## 2. Prerequisites

* **Tools:**
    * Azure CLI (`az`): Latest version installed and configured. Logged in (`az login`).
    * `kubectl`: Kubernetes command-line tool installed.
    * IaC Tool (Recommended): Bicep or Terraform installed and configured.
    * Git: For version control of IaC and application code/manifests.
* **Azure Permissions:** An Azure account with sufficient RBAC permissions to create and manage resource groups, networking, ACR, AKS, Key Vault, Managed Identities, Role Assignments, and potentially Azure AD objects (e.g., Contributor + User Access Administrator, or custom roles).
* **Design Decisions:** Architectural choices from the `design-patterns.md` document should be finalized (e.g., Region(s), HA/DR strategy, network plugin, security choices).
* **Network Planning:** A detailed network plan must exist, including:
    * VNet address space(s).
    * Subnet definitions and address ranges (for AKS nodes, Pods (if Azure CNI), Private Endpoints, Application Gateway, Azure Firewall, Jumpboxes, etc.).
    * IP addressing schema for Kubernetes services and DNS.
    * Firewall rules (if applicable).
* **Naming Conventions:** Established naming conventions for Azure resources.

## 3. Implementation Steps

**(Note:** Replace placeholders like `<resource-group>`, `<location>`, `<acr-name>`, `<aks-cluster-name>`, `<vnet-name>`, `<subnet-name>`, `<your-domain.com>`, etc., with your specific values. Execute commands within the appropriate Azure subscription context: `az account set --subscription <subscription-id>`)

### Phase 1: Foundational Setup (Networking & Core Services)

This phase establishes the core infrastructure components. Using IaC is highly recommended here.

1.  **Create Resource Group(s):**
    * Define a strategy (e.g., one group for shared infra, one per cluster/region).
    ```bash
    az group create --name <resource-group> --location <location>
    # Example: az group create --name rg-shared-infra-eus2 --location eastus2
    # Example: az group create --name rg-aks-prod-eus2 --location eastus2
    ```

2.  **Define and Deploy VNet & Subnets:**
    * Based on the network plan, create the VNet(s) and required subnets using IaC or CLI.
    * Example Subnets: `AksSubnet`, `PodSubnet` (if Azure CNI non-dynamic), `PrivateEndpointSubnet`, `AppGatewaySubnet`, `AzureFirewallSubnet`.
    * **Important:** Delegate `PrivateEndpointSubnet` for private endpoints (`Microsoft.Network/virtualNetworks/subnets/join/action`) and disable private endpoint network policies on it. Delegate `AppGatewaySubnet` if using AGIC.
    ```bash
    # Example VNet Creation
    az network vnet create \
      --resource-group <resource-group> \
      --name <vnet-name> \
      --address-prefixes <vnet-cidr> \
      --location <location>

    # Example Subnet Creation (Repeat for all needed subnets)
    az network vnet subnet create \
      --resource-group <resource-group> \
      --vnet-name <vnet-name> \
      --name <subnet-name> \
      --address-prefixes <subnet-cidr>
      # Add delegations / service endpoints / policies as needed per subnet type
    ```

3.  **Implement Network Security Groups (NSGs):**
    * Create NSGs and associate them with relevant subnets (e.g., `AksSubnet`).
    * Start with minimal necessary rules (AKS requires specific ports open). Allow necessary traffic based on your design (e.g., Load Balancer probes, control plane communication, Hub VNet access). Deny all other traffic implicitly.
    ```bash
    az network nsg create --resource-group <resource-group> --name <nsg-name> --location <location>
    # Add rules: az network nsg rule create ...
    az network vnet subnet update --resource-group <resource-group> --vnet-name <vnet-name> --name <subnet-name> --network-security-group <nsg-name>
    ```

4.  **Deploy Azure Firewall (Optional but Recommended for Scale):**
    * Deploy Azure Firewall into the dedicated `AzureFirewallSubnet` (usually in the Hub VNet).
    * Configure Firewall Policies (Application Rules, Network Rules, DNAT rules).
    ```bash
    # Requires AzureFirewallSubnet subnet to exist
    # Requires Public IP for Firewall
    az network public-ip create --resource-group <resource-group> --name <fw-pip-name> --sku Standard --location <location> --allocation-method Static
    az network firewall create --resource-group <resource-group> --name <firewall-name> --location <location>
    # Associate policies: az network firewall policy create / rule-collection-group create ...
    az network firewall ip-config create --firewall-name <firewall-name> --name <fw-ipconfig-name> --public-ip-address <fw-pip-name> --resource-group <resource-group> --vnet-name <vnet-name> # Omitted subnet details for brevity
    ```

5.  **Configure User Defined Routes (UDRs):**
    * If using Azure Firewall for egress control, create a Route Table.
    * Add a default route (`0.0.0.0/0`) pointing to the Azure Firewall's private IP address as the next hop.
    * Associate the Route Table with the `AksSubnet`.
    ```bash
    az network route-table create --resource-group <resource-group> --name <aks-route-table-name>
    az network route-table route create --resource-group <resource-group> --route-table-name <aks-route-table-name> --name default-to-firewall --address-prefix 0.0.0.0/0 --next-hop-type VirtualAppliance --next-hop-ip-address <firewall-private-ip>
    az network vnet subnet update --resource-group <resource-group> --vnet-name <vnet-name> --name <AksSubnet> --route-table <aks-route-table-name>
    ```

6.  **Deploy Azure Key Vault:**
    * Create Key Vault instance(s).
    * Enable RBAC authorization (preferred over access policies).
    * Enable Private Endpoint access if required by security policy.
    * Enable Diagnostic Settings.
    ```bash
    az keyvault create \
      --resource-group <resource-group> \
      --name <keyvault-name> \
      --location <location> \
      --enable-rbac-authorization true \
      --sku premium # Or standard
      # Add --public-network-access Disabled if using private endpoint only
    ```

### Phase 2: Deploying Azure Container Registry (ACR)

1.  **Create ACR Instance:**
    ```bash
    az acr create \
      --resource-group <resource-group> \
      --name <acr-name> \
      --sku Premium \
      --location <location> \
      --admin-enabled false \ # Best practice: Keep admin user disabled unless strictly needed
      --public-network-enabled false # Recommended if using Private Endpoint exclusively
      # Add --zone-redundancy enabled if needed and supported in region/sku
    ```

2.  **Configure Geo-Replication (If Multi-Region):**
    * Repeat for each required replica region.
    ```bash
    az acr replication create \
      --registry <acr-name> \
      --resource-group <resource-group> \
      --location <replica-location>
      # Add --zone-redundancy enabled if needed for the replica
    ```

3.  **Configure Private Endpoint(s):**
    * Create a Private Endpoint for ACR in the designated subnet.
    ```bash
    # Get ACR Resource ID
    ACR_ID=$(az acr show --resource-group <resource-group> --name <acr-name> --query id --output tsv)

    az network private-endpoint create \
      --resource-group <resource-group> \
      --name <acr-private-endpoint-name> \
      --vnet-name <vnet-name> \
      --subnet <PrivateEndpointSubnet> \
      --private-connection-resource-id $ACR_ID \
      --group-ids registry \
      --connection-name <acr-private-connection-name> \
      --location <location>
    ```
    * **Configure Private DNS Zone:** Create a Private DNS Zone `privatelink.azurecr.io`, link it to the VNet(s) needing access, and add the A record mapping the ACR name to the Private Endpoint's IP address. The `private-endpoint create` command can automate DNS integration if parameters are set correctly (`--private-dns-zone`, `--zone-name`).
    ```bash
    # Example Manual DNS Configuration (if not automated)
    az network private-dns zone create --resource-group <resource-group> --name privatelink.azurecr.io
    az network private-dns link vnet create --resource-group <resource-group> --zone-name privatelink.azurecr.io --name <vnet-link-name> --virtual-network <vnet-name> --registration-enabled false
    # Get Private IP from Private Endpoint NIC
    # az network private-dns record-set a add-record ... (map <acr-name> to private IP)
    ```

4.  **Configure Diagnostic Settings:**
    * Send logs and metrics to a Log Analytics workspace or other destinations.
    ```bash
    WORKSPACE_ID=$(az monitor log-analytics workspace show --resource-group <log-analytics-rg> --workspace-name <log-analytics-workspace-name> --query id --output tsv)
    az monitor diagnostic-settings create \
      --resource $ACR_ID \
      --name "SendToLogAnalytics" \
      --workspace $WORKSPACE_ID \
      --logs '[{"category": "ContainerRegistryRepositoryEvents", "enabled": true}, {"category": "ContainerRegistryLoginEvents", "enabled": true}]' \
      --metrics '[{"category": "AllMetrics", "enabled": true}]'
    ```

5.  **Enable Defender for Containers on ACR:**
    ```bash
    az security setting update --name MCAS --setting '{"enabled": true}' # Example - Verify exact command/setting name for Defender on ACR
    # May also be configured via Azure Policy or Defender for Cloud portal
    ```

6.  **Define Repository Permissions (Placeholder):**
    * Plan roles/tokens needed for CI/CD pipelines and AKS clusters (AKS identity will be granted `AcrPull` during cluster creation/update).
    * Example: Create a Service Principal for CI/CD.
    ```bash
    # Create SP
    # az ad sp create-for-rbac --name <cicd-sp-name> --scopes $ACR_ID --role AcrPush --query "{clientId: appId, clientSecret: password}" --output jsonc
    # Store credentials securely!
    ```

### Phase 3: Deploying Azure Kubernetes Service (AKS)

Using IaC (Bicep/Terraform) is highly recommended for deploying AKS clusters due to the number of configuration options.

1.  **Define Cluster Configuration Parameters:** Gather all required values based on design choices (see `design-patterns.md` and Prerequisites).

2.  **Create AKS Cluster (Example CLI command - Adapt for IaC):**
    ```bash
    # Get Subnet ID for AKS Nodes
    AKS_SUBNET_ID=$(az network vnet subnet show --resource-group <resource-group> --vnet-name <vnet-name> --name <AksSubnet> --query id --output tsv)
    # Get Log Analytics Workspace ID
    LOG_ANALYTICS_WORKSPACE_ID=$(az monitor log-analytics workspace show --resource-group <log-analytics-rg> --workspace-name <log-analytics-workspace-name> --query id --output tsv)
    # Get ACR Resource ID
    ACR_ID=$(az acr show --resource-group <resource-group> --name <acr-name> --query id --output tsv)
    # Get Azure AD Group Object ID for AKS Admins
    ADMIN_GROUP_ID=$(az ad group show --group "<Your Azure AD Admin Group Name>" --query id --output tsv)

    az aks create \
      --resource-group <resource-group> \
      --name <aks-cluster-name> \
      --location <location> \
      --kubernetes-version <k8s-version> \  # e.g., 1.28.5 (use 'az aks get-versions --location <location> -o table')
      --node-count 3 \                      # Initial node count for system pool
      --node-vm-size Standard_DS2_v2 \      # Choose appropriate VM size
      --zones 1 2 3 \                       # Enable Availability Zones
      --network-plugin azure \              # Use Azure CNI
      --vnet-subnet-id $AKS_SUBNET_ID \
      --docker-bridge-address 172.17.0.1/16 \ # Default, adjust if needed
      --dns-service-ip 10.2.0.10 \          # Ensure non-overlapping with VNet/Subnet space
      --service-cidr 10.2.0.0/24 \          # Ensure non-overlapping
      --enable-managed-identity \           # Use System-Assigned Managed Identity (or specify User Assigned)
      --attach-acr $ACR_ID \                # Grant AcrPull role to AKS Managed Identity
      --enable-aad \                        # Enable Azure AD Integration
      --aad-admin-group-object-ids $ADMIN_GROUP_ID \
      --enable-addons monitoring,azure-policy,azure-keyvault-secrets-provider \ # Enable essential Addons
      --workspace-resource-id $LOG_ANALYTICS_WORKSPACE_ID \
      --load-balancer-sku standard \        # Required for AZs and multiple node pools
      --nodepool-name systempool \          # Name the initial node pool
      --nodepool-mode System \              # Designate as System node pool
      --generate-ssh-keys                  # Or provide existing keys
      # Optional: --enable-private-cluster (requires additional DNS config)
      # Optional: --enable-secret-rotation (for Key Vault CSI driver)
      # Optional: --enable-cluster-autoscaler (configure min/max later or here)
      # Optional: --outbound-type userDefinedRouting (if using Azure Firewall/custom egress)
      # ... other parameters as needed (tags, api-server-authorized-ip-ranges, etc.)
    ```

3.  **Add User Node Pools:**
    * Create separate node pools for application workloads.
    ```bash
    # Example User Node Pool with Autoscaling
    az aks nodepool add \
      --resource-group <resource-group> \
      --cluster-name <aks-cluster-name> \
      --name userpool1 \
      --node-count 3 \
      --min-count 3 \
      --max-count 10 \
      --node-vm-size Standard_DS3_v2 \
      --zones 1 2 3 \
      --mode User \
      --enable-cluster-autoscaler \
      --labels environment=production app=backend \
      --tags dept=finance creator=iaac
      # Add --node-taints key=value:NoSchedule if needed
    ```
    * Repeat for other specialized node pools (e.g., spot instances: `--priority Spot --spot-max-price -1`, GPU: `--node-vm-size Standard_NC6s_v3 --aks-custom-headers UseGPUPartitioning=true`).

4.  **Configure `kubectl` Access:**
    * Download credentials for the cluster. Use the `--admin` flag for initial cluster admin access, then rely on Azure AD integration for user access.
    ```bash
    az aks get-credentials --resource-group <resource-group> --name <aks-cluster-name> --admin
    # Test connection
    kubectl get nodes
    ```
    * Users will run `az aks get-credentials` without `--admin` and authenticate via Azure AD.

5.  **(If Private Cluster):** Configure DNS resolution for the private API server FQDN (usually involves a Private DNS Zone `privatelink.<region>.azmk8s.io` or custom DNS server configuration). Ensure clients (dev machines, CI/CD agents) have network path and DNS resolution.

### Phase 4: Post-Deployment Configuration & Integrations

Perform these steps using `kubectl` connected to the cluster, potentially automated via CI/CD or GitOps after initial setup.

1.  **Networking:**
    * **Deploy Ingress Controller:**
        * **AGIC:** If using Application Gateway, enable the AGIC addon (`az aks addon enable --addons ingress-appgw ...`) or deploy via Helm, configuring it to use the correct Application Gateway instance.
        * **Nginx/Other:** Deploy using Helm chart. Ensure the LoadBalancer service is created correctly.
        ```bash
        # Example Nginx Install (using Helm)
        helm repo add ingress-nginx [https://kubernetes.github.io/ingress-nginx](https://kubernetes.github.io/ingress-nginx)
        helm repo update
        helm install ingress-nginx ingress-nginx/ingress-nginx \
          --namespace ingress-basic \
          --create-namespace \
          --set controller.replicaCount=2 \
          --set controller.nodeSelector."kubernetes\.io/os"=linux \
          --set defaultBackend.enabled=true \
          --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
        ```
    * **Configure Ingress Resources:** Deploy sample Ingress manifests pointing to test services.
    * **Verify Egress:** Run a test pod and attempt outbound connections (`curl ifconfig.me`, `curl <internal-service>`). Check Azure Firewall logs if applicable.
    * **Implement Network Policies:** Apply `NetworkPolicy` resources (requires Azure CNI and enabling the feature, either Azure or Calico). Start with default deny and explicitly allow required flows.

2.  **Security:**
    * **Configure Kubernetes RBAC:** Create `Role` / `ClusterRole` and `RoleBinding` / `ClusterRoleBinding` manifests referencing Azure AD group object IDs to grant permissions within the cluster.
    ```yaml
    # Example RoleBinding (save as rbac-binding.yaml)
    apiVersion: rbac.authorization.k8s.io/v1
    kind: RoleBinding
    metadata:
      name: aad-developers-binding
      namespace: dev-namespace
    subjects:
    - kind: Group
      name: "<azure-ad-developer-group-object-id>" # Use Object ID from Azure AD
      apiGroup: rbac.authorization.k8s.io
    roleRef:
      kind: ClusterRole # Or Role
      name: edit # Example built-in role
      apiGroup: rbac.authorization.k8s.io
    # --- Apply with: kubectl apply -f rbac-binding.yaml
    ```
    * **Configure Workload Identity:** Follow Azure documentation to set up federation between application Service Principals/Managed Identities and Kubernetes Service Accounts.
    * **Deploy App with Key Vault CSI:** Deploy a sample application configured to mount secrets from the Azure Key Vault deployed earlier, using the CSI driver. Verify the pod can access the secret.
    * **Review Defender for Containers:** Check the Azure portal for security recommendations related to the AKS cluster.
    * **Apply Azure Policies for AKS:** Assign built-in or custom Azure Policy initiatives for Kubernetes to enforce governance (e.g., Allowed Images, Pod Security Standards).

3.  **Monitoring & Logging:**
    * **Verify Azure Monitor:** Navigate to the AKS cluster resource in Azure portal -> Monitoring -> Insights. Check node/pod metrics. Query logs in the linked Log Analytics workspace.
    ```kusto
    // Example Kusto Query in Log Analytics
    ContainerLogV2
    | where PodName contains "my-app"
    | project TimeGenerated, PodName, ContainerName, LogMessage
    | order by TimeGenerated desc
    ```
    * **Set up Alerts:** Create Alert rules in Azure Monitor based on metrics (e.g., high CPU/memory, low disk space on nodes) or log queries (e.g., critical application errors).

4.  **Backup/Restore (Velero):**
    * **Install Velero:** Use the official Velero Helm chart.
    ```bash
    # Requires Azure Storage Account and Blob Container
    # Requires Service Principal or Managed Identity with permissions on Storage & VM Disks/Snapshots
    helm repo add vmware-tanzu [https://vmware-tanzu.github.io/helm-charts](https://vmware-tanzu.github.io/helm-charts)
    helm install velero vmware-tanzu/velero \
      --namespace velero \
      --create-namespace \
      --set-file credentials.secretContents.cloud=<path-to-azure-credentials-file> \
      --set configuration.provider=azure \
      --set configuration.backupStorageLocation.name=azure \
      --set configuration.backupStorageLocation.bucket=<blob-container-name> \
      --set configuration.backupStorageLocation.config.resourceGroup=<storage-rg> \
      --set configuration.backupStorageLocation.config.storageAccount=<storage-account-name> \
      --set configuration.volumeSnapshotLocation.name=azure \
      --set configuration.volumeSnapshotLocation.config.resourceGroup=<storage-rg> \
      --set initContainers[0].name=velero-plugin-for-azure \
      --set initContainers[0].image=velero/velero-plugin-for-azure:v1.8.1 \ # Use latest compatible version
      --set initContainers[0].volumeMounts[0].mountPath=/target \
      --set initContainers[0].volumeMounts[0].name=plugins
    ```
    * **Perform Test Backup/Restore:**
    ```bash
    velero backup create test-backup --include-namespaces <test-namespace>
    # (Simulate deletion or change)
    velero restore create --from-backup test-backup
    ```

### Phase 5: Automation Setup (CI/CD & GitOps)

1.  **Create CI/CD Service Principal:** (See ACR step, ensure it also has permissions on AKS, e.g., `Azure Kubernetes Service Cluster User Role` plus specific RBAC within cluster, or `Azure Kubernetes Service Contributor Role`). Store credentials securely in your CI/CD platform (Azure DevOps Service Connection, GitHub Secrets).

2.  **Develop CI Pipeline (Conceptual Steps):**
    * Trigger: On code push to specific branches (e.g., `main`, `develop`).
    * Checkout code.
    * Run linters, unit tests.
    * Build Docker image (`docker build`).
    * Scan image (e.g., integrate with Defender for Cloud API, Trivy, etc.). Fail pipeline on critical vulnerabilities.
    * Tag image (e.g., with Git commit SHA, version number).
    * Login to ACR (`az acr login --name <acr-name>` or `docker login <acr-name>.azurecr.io -u <sp-client-id> -p <sp-client-secret>`).
    * Push image to ACR (`docker push <acr-name>.azurecr.io/<repo>:<tag>`).

3.  **Develop CD Pipeline (Conceptual Steps):**
    * Trigger: On successful CI pipeline, or manually.
    * Checkout deployment manifests (Kubernetes YAML or Helm Chart).
    * Update image tag in manifests/chart values.
    * Login to AKS cluster (`az aks get-credentials ...` using the CI/CD Service Principal or via Workload Identity Federation).
    * Deploy (`kubectl apply -f <manifest-dir>` or `helm upgrade --install <release-name> <chart-path> -f <values-file> --namespace <target-namespace>`).
    * Run post-deployment smoke tests.

4.  **(Optional) Configure GitOps Agent (FluxCD Example):**
    * Install FluxCD components into the AKS cluster (Helm or `flux bootstrap` command).
    * Configure Flux `GitRepository` and `Kustomization` resources pointing to the Git repository containing the application and infrastructure manifests.
    * Flux automatically synchronizes the cluster state with the Git repository.

## 4. Validation and Testing

* **Application Deployment:** Deploy a sample multi-tier application.
* **ACR Integration:** Verify pods start successfully, pulling images from the geo-replicated ACR (check node events for pull source).
* **Ingress:** Access the sample application externally via the Ingress endpoint (Application Gateway or Nginx LB IP/DNS).
* **Egress:** Confirm outbound traffic flows correctly (e.g., via Firewall) and expected restrictions apply.
* **Scaling:** Generate load to trigger HPA (pod scaling) and subsequently Cluster Autoscaler (node scaling). Verify scaling actions occur.
* **Secrets:** Ensure applications using Key Vault CSI driver retrieve secrets successfully.
* **Monitoring:** Check Azure Monitor for metrics/logs related to the sample app and scaling events.
* **Failure Simulation:** (Carefully, in non-prod) Cordon/drain a node, delete a pod, stop a node in one AZ to test HA mechanisms (replica scheduling, AZ failover).
* **RBAC:** Test access for different Azure AD user groups as defined in Kubernetes RBAC.

## 5. Operational Considerations

* **Upgrade Strategy:** Plan regular upgrades for AKS Kubernetes versions and node images (`az aks upgrade`, `az aks nodepool upgrade`). Test upgrades in staging first. Plan application upgrades (CI/CD strategies like blue-green/canary).
* **Monitoring & Alerting:** Refine monitoring dashboards and alerts based on application behavior and operational experience.
* **Security Reviews:** Regularly review Defender for Cloud recommendations, scan images, audit RBAC, rotate secrets.
* **Cost Management:** Continuously monitor costs using Azure Cost Management + Billing, refine resource sizing, evaluate spot instance usage.
* **Backup/Restore Drills:** Schedule regular Velero backup tests and occasional full restore drills.

## 6. Conclusion

This guide provides a practical sequence for implementing scalable ACR and AKS deployments on Azure. Adhering to these steps, leveraging Infrastructure as Code, and incorporating robust automation via CI/CD or GitOps are critical for managing complex container environments effectively. Remember that this is a foundation; continuous monitoring, optimization, and adaptation based on workload performance and evolving requirements are essential for long-term success.

## 7. Appendix/References

* [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
* [AKS CLI Reference (`az aks`)](https://docs.microsoft.com/en-us/cli/azure/aks)
* [ACR CLI Reference (`az acr`)](https://docs.microsoft.com/en-us/cli/azure/acr)
* [Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
* [Terraform AzureRM Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
* [Helm Documentation](https://helm.sh/docs/)
* [Velero Documentation](https://velero.io/docs/v1.13/)
* [FluxCD Documentation](https://fluxcd.io/docs/)
* [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheat-sheet/)