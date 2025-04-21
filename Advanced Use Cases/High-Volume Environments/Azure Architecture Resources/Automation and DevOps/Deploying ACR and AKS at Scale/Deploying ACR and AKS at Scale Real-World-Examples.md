# Real-World Examples for Scalable ACR and AKS Deployments

**Document Path:** C:\Users\jrochau\projects\ACS_KnowledgeBase\Advanced Use Cases\High-Volume Environments\Azure Architecture Resources\Automation and DevOps\Deploying ACR and AKS at Scale\real-world-examples.md

**Version:** 1.0
**Date:** 2025-04-10

## 1. Introduction

This document illustrates how the design patterns and implementation steps detailed in `design-patterns.md` and `implementation-guide.md` are applied in practice through several real-world scenarios. These examples showcase how different combinations of Azure services and configurations can address specific business challenges related to scalability, availability, security, and global reach when using Azure Container Registry (ACR) and Azure Kubernetes Service (AKS).

It's important to understand that these are representative examples. Actual implementations will vary based on specific organizational requirements, existing infrastructure, compliance mandates (like PCI-DSS, HIPAA), workload characteristics, performance targets, and cost constraints. The aim here is to demonstrate the practical application of the recommended patterns in different contexts.

## 2. Scenario 1: High-Availability Regional E-commerce Platform

* **Challenge:** An online retailer requires a highly available and scalable platform within a single Azure region to host its e-commerce website and backend APIs. The platform must handle significant traffic fluctuations (e.g., Black Friday sales), ensure fast image pulls for quick scaling, maintain security for customer data, and adhere to PCI-DSS compliance standards.
* **Solution Architecture:**
    * **Region & Availability:** A single Azure region (e.g., East US 2) is chosen for primary operations. The AKS cluster control plane and critical node pools (system, frontend, backend, checkout) are deployed across all 3 **Availability Zones (AZs)** within the region for high availability against datacenter failures. Application deployments use **Pod Anti-Affinity** rules to ensure replicas are spread across AZs. A zone-redundant **Azure Standard Load Balancer** is used for public ingress traffic distribution.
    * **ACR:** **ACR Premium SKU** is used to leverage features like **Private Link** and potentially **Zone Redundancy** (if supported/needed for the registry itself). Images are scanned using **Microsoft Defender for Containers**. A **Private Endpoint** connects ACR securely to the Hub VNet, preventing public internet exposure. Public access to ACR is disabled. Geo-replication *could* be added to another region primarily for Disaster Recovery backup, even if the main application is single-region.
    * **Networking:** A **Hub-Spoke VNet topology** is implemented.
        * *Hub:* Contains shared resources: **Azure Firewall (Premium SKU)** for controlled egress filtering (including FQDN/TLS inspection), **Azure Application Gateway (WAF v2 SKU)** configured as the AKS Ingress via the **AGIC addon** (providing Web Application Firewall capabilities), Private Endpoints for ACR and Azure Key Vault, potentially Bastion for secure admin access.
        * *Spoke:* Contains the AKS cluster VNet, peered to the Hub. AKS uses **Azure CNI** for networking, allowing pods direct VNet IP addressing and integration with NSGs/UDRs. **User Defined Routes (UDRs)** force all AKS egress traffic through the Hub Azure Firewall. **Network Security Groups (NSGs)** are applied at the subnet level with strict rules.
    * **Security:**
        * **Azure AD integration** is enabled on AKS for administrative and developer access, using **Kubernetes RBAC** mapped to AAD groups.
        * **Azure Key Vault** stores all secrets (database connection strings, API keys, TLS certificates). The **Secrets Store CSI Driver** is used to securely mount these secrets into application pods.
        * Kubernetes **Network Policies** (using Calico or Azure NP) are enforced to implement micro-segmentation, strictly controlling traffic flow between pods (e.g., isolating the payment processing service namespace).
        * Application Gateway WAF protects against common web vulnerabilities (OWASP Top 10).
        * Consideration for a **Private AKS cluster** adds another security layer but increases management complexity for CI/CD and kubectl access.
    * **Scalability:**
        * **Cluster Autoscaler** is enabled on all user node pools to automatically adjust node counts based on pod resource requests.
        * **Horizontal Pod Autoscaler (HPA)** is configured for key microservices (e.g., product API, cart service) based on CPU, memory, or custom metrics (e.g., requests per second, queue length via Prometheus adapter).
        * Separate **User Node Pools** are defined for different workload types (e.g., frontend web servers, backend APIs) using appropriate VM sizes.
    * **Automation:** **Terraform** is used to define and manage all Azure infrastructure resources (VNet, Firewall, ACR, AKS, Key Vault, etc.) stored in Git. **Azure DevOps Pipelines** handle the CI/CD process: building images, scanning with Defender, pushing to ACR, and deploying applications using **Helm charts** to the AKS cluster following blue-green or canary strategies.
    * **Monitoring:** **Azure Monitor for Containers** provides infrastructure metrics and logs. **Application Insights** SDK is integrated into microservices for distributed tracing and application performance monitoring. Logs from ACR, AKS, Firewall, and App Gateway are centralized in a **Log Analytics workspace**. Alerts are configured for critical errors, performance thresholds (latency, saturation), scaling events, and security detections (WAF, Firewall, Defender).
    * **Compliance Notes (PCI-DSS):** The architecture addresses PCI requirements through:
        * Network segmentation (Hub-Spoke, NSGs, Network Policies).
        * Firewall for ingress/egress control (Azure Firewall, App Gateway WAF).
        * Secure secret management (Key Vault CSI Driver).
        * Vulnerability management (Defender for Containers on ACR).
        * Centralized logging and monitoring.
        * Restricted network access (Private Endpoints).
* **Key Patterns Applied:** Availability Zones, ACR Premium + Private Endpoint + Defender, Hub-Spoke Networking, Azure Firewall, Application Gateway WAF + AGIC, Azure CNI, Network Policies, Key Vault CSI Driver, Azure AD Integration, Cluster Autoscaler + HPA, Multiple Node Pools, IaC (Terraform), CI/CD (Azure DevOps + Helm), Azure Monitor + App Insights.

## 3. Scenario 2: Multi-Region Global SaaS Application

* **Challenge:** A Software-as-a-Service (SaaS) company offers a platform to global customers. They need to provide low-latency access, ensure high availability even during regional outages, implement disaster recovery, and manage deployments consistently across multiple geographic locations.
* **Solution Architecture:**
    * **Regions & Availability:** The application is deployed across multiple Azure regions (e.g., West Europe, Southeast Asia, West US 2) close to major customer bases. In each region, an independent **AKS cluster** is deployed utilizing **Availability Zones** for intra-region HA. **Azure Front Door** acts as the global entry point, providing SSL offloading, caching, WAF, and routing user traffic to the nearest healthy regional AKS cluster based on latency or priority (for active-passive DR).
    * **ACR:** **ACR Premium SKU** is essential, **geo-replicated** to every region where an AKS cluster exists. This ensures fast image pulls by allowing clusters to retrieve images from the local replica. **Private Endpoints** are configured in each regional Hub VNet.
    * **Networking:** A **Hub-Spoke VNet topology** is replicated *in each region*. Regional Hubs contain resources like Azure Firewall and Private Endpoints specific to that region's services. **Azure Front Door** directs traffic to the regional Application Gateways or Load Balancers serving as Ingress for the regional AKS clusters. AKS clusters use **Azure CNI**.
    * **Security:** **Azure AD** provides a single identity plane for managing user access across all clusters. **Azure Policy for Kubernetes** is used extensively to enforce consistent security configurations, resource tagging, and allowed image sources across all regional clusters. Regional **Key Vaults** are used, accessed via the **Secrets Store CSI Driver**. Regional **Azure Firewalls** enforce consistent egress policies.
    * **Scalability:** **Cluster Autoscaler** and **HPA** are configured independently in each regional AKS cluster, potentially tuned based on regional traffic patterns and expected load.
    * **Automation:** **Infrastructure as Code (Terraform or Bicep)** is crucial, using **modules** to define repeatable regional stacks (VNet, AKS, Firewall, etc.). A central **CI/CD pipeline** (e.g., Azure DevOps with multi-stage pipelines or GitHub Actions with matrix strategies) handles building the application image (pushed once to the primary ACR, then replicated) and orchestrates deployments across all target regional clusters, often using phased rollouts or ring-based deployments. **GitOps (FluxCD or ArgoCD)** is highly recommended here. A central Git repository defines the desired state (applications, configurations) for all clusters, and GitOps agents running in each cluster pull and apply these configurations, ensuring consistency.
    * **Monitoring:** Each regional cluster sends metrics and logs to a regional **Log Analytics workspace** using **Azure Monitor for Containers**. These regional workspaces can be aggregated using **Azure Lighthouse** for centralized management, queried via **Azure Data Explorer**, or ingested into a central **Azure Sentinel** instance for global security monitoring and threat detection. Azure Front Door provides health probes and metrics for global availability monitoring.
* **Key Patterns Applied:** Multi-Region AKS Clusters, Availability Zones, Geo-Replicated ACR, Azure Front Door, Regional Hub-Spoke, Azure Firewall, Azure CNI, Key Vault CSI Driver, Azure AD Integration, Azure Policy for Kubernetes, Autoscaling, IaC (Modules), CI/CD (Multi-Region Deployment), GitOps, Federated/Centralized Monitoring.

## 4. Scenario 3: Large-Scale Batch Processing / Data Analytics Platform

* **Challenge:** A financial services company needs a platform to execute large-scale, data-intensive batch processing jobs (e.g., risk modeling, end-of-day reporting) triggered nightly or on-demand. Cost efficiency for the compute resources is paramount, as jobs run for limited durations but require significant CPU/memory. Jobs need secure access to internal databases and data lakes.
* **Solution Architecture:**
    * **Region & Availability:** Typically deployed in a single primary region, using AZs for the AKS control plane and any persistent job scheduling components for reliability. Individual batch jobs are often designed to be idempotent and restartable, reducing the need for high availability *during* job execution itself.
    * **ACR:** **ACR Premium SKU** used for higher throughput during concurrent job starts and **Private Link** for secure connectivity. Images contain the processing application code and all necessary libraries.
    * **Networking:** AKS cluster uses **Azure CNI** within a VNet that has connectivity (e.g., via Peering or Private Endpoints in the same VNet) to required data sources like Azure SQL Database, Azure Data Lake Storage, etc. **Private Endpoints** are used for these data sources to avoid public endpoints. Egress traffic might be controlled via **NAT Gateway** (simpler, provides stable outbound IPs) or **Azure Firewall** (more control, if needed).
    * **AKS Configuration:**
        * **System Node Pool:** A small pool using reliable, on-demand VMs (e.g., Standard_DS2_v2) running core AKS components and potentially job orchestration controllers (like Argo Workflows controller or KEDA operator). This pool does not autoscale aggressively.
        * **Spot User Node Pool:** The primary workhorse pool configured to use **Azure Spot Virtual Machines**. Larger VM sizes (CPU/Memory optimized) are chosen. This pool utilizes the **Cluster Autoscaler** configured with a minimum node count of 0 and a large maximum count. Aggressive scale-down settings are used (e.g., `--scale-down-utilization-threshold=0.1`, `--scale-down-unneeded-time=5m`). **Taints** are applied to this node pool (e.g., `workload=batch:NoSchedule`), and batch job pods use corresponding **tolerations** to ensure they land here.
        * **(Optional) On-Demand User Pool:** A small on-demand pool might exist if certain coordination tasks or smaller, quicker jobs are unsuitable for Spot instance volatility.
    * **Workload Scheduling:** Kubernetes `Job` and `CronJob` resources manage the execution lifecycle. For more complex dependencies and workflows, **Argo Workflows** is deployed. For event-driven job triggering (e.g., message in a queue, file in blob storage), **KEDA (Kubernetes Event-driven Autoscaling)** is used to scale job pods (and trigger node scaling via Cluster Autoscaler) based on external event sources.
    * **Security:** **Azure AD Workload Identity** is used to assign Azure Managed Identities to the job pods (via Kubernetes Service Accounts). These identities are granted least-privilege RBAC access to required Azure resources (e.g., Storage Blob Data Reader on ADLS, db_datareader on Azure SQL). The **Key Vault CSI Driver** provides any additional secrets needed.
    * **Scalability:** Scaling is primarily driven by the creation of job pods. The **Cluster Autoscaler** detects pending pods that cannot be scheduled on the Spot pool and provisions new Spot nodes. Once jobs complete, the autoscaler scales the Spot pool back down, potentially to zero, minimizing costs.
    * **Automation:** Infrastructure (AKS, node pools, supporting services) managed via **IaC**. A **CI/CD pipeline** builds the job container images, runs tests, scans them, and pushes them to ACR. Job definitions (YAML manifests for `Job`, `CronJob`, `Workflow`, etc.) are stored in Git and applied via the CD pipeline or a **GitOps** controller.
    * **Monitoring:** **Azure Monitor for Containers** tracks node utilization (especially for Spot pool), pod resource consumption, and job success/failure rates. Job logs are captured and sent to **Log Analytics**. Specific cost monitoring dashboards are created in **Azure Cost Management + Billing**, filtering by tags applied to the Spot node pool, to track savings achieved via Spot instances. Alerts are set for high job failure rates or Cluster Autoscaler issues.
* **Key Patterns Applied:** Spot Node Pools, Cluster Autoscaler (Scale-to-Zero), Azure CNI, Private Endpoints (for Data Sources), Azure AD Workload Identity, Key Vault CSI Driver, Kubernetes Jobs/CronJobs/Argo/KEDA, IaC, CI/CD, Azure Monitor, Cost Optimization Focus.

## 5. Common Threads & Takeaways Across Scenarios

Reviewing these diverse scenarios reveals recurring best practices when deploying ACR and AKS at scale:

* **Infrastructure as Code (IaC) is Foundational:** Tools like Terraform or Bicep are indispensable for managing the inherent complexity, ensuring consistency, and enabling repeatable deployments across environments or regions.
* **Layered Security is Paramount:** Security isn't a single product but a combination of controls at different layers: network (Firewall, NSGs, Private Link, Network Policies), identity (Azure AD, Managed/Workload Identity), secrets (Key Vault), image integrity (ACR Scanning, Content Trust), and runtime security (Defender for Containers, Pod Security Admission/Policies).
* **Automation is Non-Negotiable:** Robust CI/CD pipelines for building, testing, scanning, and deploying applications, often combined with GitOps for managing cluster state and application configurations declaratively, are essential for velocity and reliability.
* **Comprehensive Monitoring is Critical:** Deep visibility into both the AKS/ACR infrastructure (Azure Monitor) and the applications running within (e.g., Application Insights, Prometheus) is necessary for troubleshooting, performance optimization, and security.
* **Premium Tier Services Add Value:** ACR Premium and features like Azure Firewall Premium, Application Gateway WAF v2, Standard Load Balancer often provide necessary capabilities (geo-replication, private link, advanced security, AZ support) for enterprise-scale deployments.
* **Network Design Matters:** Azure CNI is typically the preferred network plugin for better VNet integration. Careful planning of IP space, subnet delegation, and traffic flow (ingress/egress) using Hub-Spoke, Firewalls, and Private Endpoints is crucial.
* **Modularity Reduces Complexity:** Breaking down infrastructure (Hub-Spoke, IaC Modules) and applications (Microservices, Helm Charts) into smaller, manageable units simplifies development, deployment, and operations.
* **Cost Optimization is Deliberate:** Leveraging features like Spot Instances, autoscaling (HPA, Cluster Autoscaler with scale-to-zero), right-sizing nodes, and implementing resource lifecycle management (ACR purge tasks) requires conscious design choices.

## 6. Conclusion

These real-world examples demonstrate that successfully deploying ACR and AKS at scale involves thoughtfully combining various Azure features and established cloud-native patterns. The specific architecture depends heavily on the unique requirements of the application and the organization. By understanding the trade-offs and applying the principles outlined in the `design-patterns.md` and `implementation-guide.md`, teams can build robust, secure, scalable, and cost-effective container platforms on Azure.

## 7. References

* [Design Patterns for Deploying Azure Container Registry (ACR) and Azure Kubernetes Service (AKS) at Scale (`design-patterns.md`)](./design-patterns.md)
* [Azure Architecture Center - Reference Architectures](https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/)
* [Azure Kubernetes Service (AKS) solution journeys](https://learn.microsoft.com/en-us/azure/aks/solution-journeys/categories)