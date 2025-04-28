# Terraform Module Catalog

## Overview

This catalog provides a comprehensive list of approved Terraform modules for use in the Teams Platform infrastructure deployment. Each module is designed to meet organizational standards for security, compliance, and operational efficiency. The modules in this catalog are tested, validated, and maintained by the Platform Engineering team.

## Module Usage Guidelines

### General Principles

- **Always use versioned modules**: Pin module versions to ensure reproducible infrastructure deployments
- **Follow least privilege principle**: Use modules with the minimum permissions required
- **Document module usage**: Add comments explaining module configuration and purpose
- **Test before production**: Validate module deployments in a development environment
- **Review module outputs**: Verify that modules export required outputs for downstream dependencies

### Implementation Process

1. Search the catalog for appropriate modules
2. Review module documentation and requirements
3. Implement module in your Terraform configuration with appropriate parameters
4. Validate deployment in a development environment
5. Submit for peer review
6. Deploy to production after approval

## Core Modules

### Networking

| Module Name | Description | Latest Version | Min. Terraform Version | Repository Path |
|-------------|-------------|----------------|------------------------|----------------|
| `network-hub` | Creates a central network hub with connections to all spokes | v2.3.0 | 1.3.0 | `ACS/terraform-modules/networking/hub` |
| `network-spoke` | Creates network spoke with connection back to hub | v2.1.2 | 1.3.0 | `ACS/terraform-modules/networking/spoke` |
| `subnet-module` | Creates subnets with standard naming and tagging | v1.4.0 | 1.2.0 | `ACS/terraform-modules/networking/subnet` |
| `vpn-gateway` | Configures VPN gateway with standard security policies | v2.0.1 | 1.3.0 | `ACS/terraform-modules/networking/vpn` |
| `firewall-module` | Deploys Azure Firewall with pre-configured rule sets | v3.1.0 | 1.4.0 | `ACS/terraform-modules/networking/firewall` |
| `express-route` | Configures ExpressRoute circuit and connections | v1.8.2 | 1.3.0 | `ACS/terraform-modules/networking/expressroute` |

### Compute

| Module Name | Description | Latest Version | Min. Terraform Version | Repository Path |
|-------------|-------------|----------------|------------------------|----------------|
| `vm-windows` | Windows VM with standard configurations | v3.2.1 | 1.3.0 | `ACS/terraform-modules/compute/vm-windows` |
| `vm-linux` | Linux VM with security hardening | v3.0.0 | 1.3.0 | `ACS/terraform-modules/compute/vm-linux` |
| `vmss-windows` | Windows VM Scale Set with autoscaling | v2.5.0 | 1.4.0 | `ACS/terraform-modules/compute/vmss-windows` |
| `vmss-linux` | Linux VM Scale Set with autoscaling | v2.4.1 | 1.4.0 | `ACS/terraform-modules/compute/vmss-linux` |
| `aks-cluster` | AKS cluster with security and operations best practices | v4.2.0 | 1.5.0 | `ACS/terraform-modules/compute/aks` |
| `container-instance` | Azure Container Instance with networking options | v1.6.3 | 1.3.0 | `ACS/terraform-modules/compute/container-instance` |

### Storage

| Module Name | Description | Latest Version | Min. Terraform Version | Repository Path |
|-------------|-------------|----------------|------------------------|----------------|
| `storage-account` | Storage account with security configurations | v2.8.0 | 1.3.0 | `ACS/terraform-modules/storage/account` |
| `file-share` | Azure File shares with backup options | v1.5.2 | 1.3.0 | `ACS/terraform-modules/storage/file-share` |
| `blob-storage` | Blob storage with lifecycle management | v2.3.1 | 1.3.0 | `ACS/terraform-modules/storage/blob` |
| `data-lake` | Data Lake Storage Gen2 configuration | v3.0.0 | 1.4.0 | `ACS/terraform-modules/storage/data-lake` |
| `sql-database` | Azure SQL Database with security measures | v3.1.2 | 1.3.0 | `ACS/terraform-modules/storage/sql-database` |
| `cosmos-db` | Cosmos DB with multi-region configuration | v2.2.0 | 1.4.0 | `ACS/terraform-modules/storage/cosmos-db` |

### Security

| Module Name | Description | Latest Version | Min. Terraform Version | Repository Path |
|-------------|-------------|----------------|------------------------|----------------|
| `key-vault` | Key Vault with access policies | v3.4.0 | 1.3.0 | `ACS/terraform-modules/security/key-vault` |
| `application-gateway` | App Gateway with WAF protection | v2.9.1 | 1.5.0 | `ACS/terraform-modules/security/application-gateway` |
| `ddos-protection` | DDoS Protection with standard plan | v1.2.0 | 1.3.0 | `ACS/terraform-modules/security/ddos` |
| `bastion-host` | Azure Bastion service | v2.0.3 | 1.3.0 | `ACS/terraform-modules/security/bastion` |
| `private-endpoint` | Private Endpoint for secure service connections | v2.1.0 | 1.4.0 | `ACS/terraform-modules/security/private-endpoint` |
| `iam-roles` | Standard IAM roles and assignments | v1.8.0 | 1.3.0 | `ACS/terraform-modules/security/iam` |
