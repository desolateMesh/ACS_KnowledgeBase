# Azure Reservations and Savings Plans

## Overview

This guide provides comprehensive information about Microsoft Azure's two primary cost optimization options: Azure Reservations and Azure Savings Plans. These purchasing models offer significant discounts compared to pay-as-you-go rates when you commit to specific resources or spending levels for one or three years.

Azure Reservations help you save money by committing to one-year or three-year plans for multiple products. Committing allows you to get a discount on the resources you use. Reservations can significantly reduce your resource costs by up to 72% from pay-as-you-go prices.

Azure Savings Plans for compute enable organizations to reduce eligible compute usage costs by up to 65% (off list pay-as-you-go rates) by making an hourly spend commitment for 1 or 3 years.

## Key Differences

When you opt for reservations, you're making a commitment to use a specific type of compute instance or instance family, in a specific Azure region, for a set period of time. An Azure savings plan involves committing to a specific hourly expenditure on eligible compute services across all Azure regions for a certain period.

| Feature | Azure Reservations | Azure Savings Plans |
|---------|-------------------|---------------------|
| Maximum Discount | Up to 72% | Up to 65% |
| Commitment Type | Specific resources | Hourly spending amount |
| Regional Flexibility | Limited to specific regions | Applied across all regions |
| Resource Flexibility | Limited to specific resource types | Applies to multiple eligible compute services |
| Best For | Stable, predictable workloads | Dynamic, evolving workloads |
| Services Covered | VMs, SQL Database, App Service, etc. | Compute services only |

## When To Use Each Option

### Azure Reservations
- Stable workloads with consistent resource needs
- Workloads running in specific regions with no expected changes
- Maximizing discount percentages
- Covering various Azure services including storage and databases

### Azure Savings Plans
- Dynamic workloads that may change over time
- Workloads that run across multiple regions
- When flexibility is more important than maximum discount
- When you want to simplify management of cost commitments

## Resources in This Guide

This guide includes the following documents:

1. [Design Patterns](./design-patterns.md) - Common architectural patterns for effectively implementing Azure Reservations and Savings Plans
2. [Implementation Guide](./implementation-guide.md) - Step-by-step instructions for setting up and configuring both options
3. [Real-World Examples](./real-world-examples.md) - Case studies and scenarios showing successful implementations
4. [Troubleshooting](./troubleshooting.md) - Common issues and their solutions

## Additional Resources

- [Microsoft Learn: What are Azure Reservations?](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations)
- [Microsoft Learn: What is Azure savings plans for compute?](https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/savings-plan-compute-overview)
- [Microsoft Learn: Deciding between a savings plan and a reservation](https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/decide-between-savings-plan-reservation)
