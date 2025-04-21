# Implementation Guide for Azure Reservations and Savings Plans

This guide provides step-by-step instructions for implementing Azure Reservations and Savings Plans, along with best practices for each implementation phase.

## Prerequisites

Before implementing Azure Reservations or Savings Plans, ensure you have:

1. **Appropriate Access**: Owner or Contributor rights to the subscriptions where you'll apply the reservations/savings plans
2. **Usage Data**: At least 30 days of usage history to analyze for making informed decisions
3. **Budget Approval**: Authorization for the upfront or monthly commitment costs
4. **Agreement Verification**: Confirmed Enterprise Agreement (EA), Microsoft Customer Agreement (MCA), or Microsoft Partner Agreement (MPA)

## Phase 1: Assessment and Planning

### Analyze Current Usage

1. **Review Historical Data**:
   - Navigate to Azure Cost Management in the Azure Portal
   - Review at least the past 30-60 days of usage data for resources you're considering for reservations or savings plans
   - Pay special attention to consistent resource usage patterns

2. **Identify Suitable Resources**:
   - For Reservations: Look for resources with consistent usage over time (ideally 80%+ uptime)
   - For Savings Plans: Identify your consistent hourly compute spend across regions and resource types

3. **Calculate Potential Savings**:
   - Use the Azure Pricing Calculator to estimate savings for different commitment options
   - Compare 1-year vs. 3-year commitments based on your confidence in long-term needs

### Planning Decisions

1. **Select Commitment Type**:
   - Azure Reservations for stable, predictable workloads
   - Azure Savings Plans for flexible, evolving workloads

2. **Choose Commitment Term**:
   - 1-year term: For resources that may change in the medium term
   - 3-year term: For greater savings on long-term stable resources

3. **Determine Payment Option**:
   - Upfront payment: Maximum savings but requires initial capital
   - Monthly payment: Same total cost but spread over the commitment period

4. **Decide on Scope**:
   - Shared scope: Benefits apply across an entire billing account/enrollment (recommended for maximum utilization)
   - Single subscription: Benefits apply only to a specific subscription
   - Resource group: Even more targeted scope for specific workloads

## Phase 2: Implementing Azure Reservations

### Purchase Process

1. **Navigate to Reservations**:
   - In the Azure Portal, search for "Reservations"
   - Click on "+ Add" to begin the purchase process

2. **Select Product and Configuration**:
   - Choose the product type (e.g., Virtual Machines, SQL Database)
   - Select the appropriate configuration (region, tier, etc.)
   - Review the eligible instances based on your selection

3. **Set Reservation Parameters**:
   - Billing subscription: Select which subscription will be billed for the reservation
   - Scope: Choose shared, single subscription, or resource group
   - Term: Select 1-year or 3-year
   - Quantity: Enter the number of instances to reserve (follow Azure recommendations when available)

4. **Review and Purchase**:
   - Verify all selections and the estimated savings
   - Complete the purchase process

### Post-Purchase Configuration

1. **Verify Application**:
   - After purchase, verify that the reservation is being applied correctly to your resources
   - This can take up to 30 minutes to appear in the portal

2. **Configure Automatic Renewal** (optional):
   - Navigate to the reservation in the Azure Portal
   - Select "Automatic renewal" and set your preferences

3. **Adjust Instance Size Flexibility** (if applicable):
   - For VMs, you can toggle instance size flexibility to allow the reservation to apply to different sizes within the same family
   - Navigate to the reservation and select "Configuration"

## Phase 3: Implementing Azure Savings Plans

### Purchase Process

1. **Navigate to Savings Plans**:
   - In the Azure Portal, go to "Cost Management + Billing"
   - Select "Savings Plans" and click "+ Add"

2. **Select Plan Type**:
   - Choose "Compute" for compute services flexibility

3. **Configure Your Plan**:
   - Select the commitment term (1 or 3 years)
   - Enter your hourly commitment amount (review Azure recommendations when available)
   - Select the billing subscription
   - Choose the scope (shared, single subscription, or resource group)
   - Select payment option (upfront or monthly)

4. **Review and Purchase**:
   - Verify all selections and the estimated savings
   - Complete the purchase process

### Post-Purchase Verification

1. **Confirm Activation**:
   - Savings Plan benefits should apply within a few hours of purchase
   - Check Cost Analysis reports to verify discounts are being applied

2. **Review Initial Benefit Application**:
   - After 24-48 hours, review how the benefits are being applied across your resources
   - Verify that high-discount resources are being prioritized automatically

## Phase 4: Monitoring and Optimization

### Implement Regular Review Processes

1. **Schedule Monthly Reviews**:
   - Set calendar reminders for monthly utilization reviews
   - Use Azure Cost Management to generate utilization reports

2. **Monitor Utilization Rates**:
   - Check reservation utilization metrics in the Azure Portal
   - For savings plans, review benefit application across resources
   - Investigate any instances of under-utilization (below 90%)

3. **Track Savings**:
   - Use Cost Management to quantify actual savings versus pay-as-you-go rates
   - Document ROI for stakeholders

### Optimization Actions

1. **Address Under-utilization**:
   - For reservations with low utilization, consider:
     - Adjusting reservation scope to broaden benefit application
     - Exchanging for different reservations that better match your usage
     - Trading in for a savings plan if flexibility is needed

2. **Plan for Renewals and Expansions**:
   - Start planning for renewals 3-6 months before expiration
   - Regularly assess whether additional resources should be moved to commitment-based pricing

3. **Adjust for Changing Needs**:
   - Reassess the balance between reservations and savings plans quarterly
   - Consider trading in reservations for savings plans if your workloads become more dynamic

## Advanced Implementation Strategies

### Combining Reservations and Savings Plans

1. **Layered Approach**:
   - Purchase reservations for stable, high-usage resources first
   - Add savings plans to cover variable or evolving resource needs
   - Reservations will be consumed first when both apply to the same resource

2. **Organizational Division**:
   - Apply reservations to production workloads with steady-state requirements
   - Use savings plans for development, testing, and experimental workloads

### Extending Savings with Hybrid Benefits

1. **Azure Hybrid Benefit Integration**:
   - For Windows VMs, SQL Server, and other eligible services, combine Azure Hybrid Benefit with reservations or savings plans
   - This combination can increase savings to up to 80% off pay-as-you-go rates

2. **Implementation Steps**:
   - Ensure you have eligible on-premises licenses with Software Assurance
   - Enable Azure Hybrid Benefit when deploying resources
   - Apply reservations or savings plans to these resources

### Enterprise-Scale Management

1. **Centralized Purchasing and Management**:
   - Establish a cloud center of excellence (CCoE) or FinOps team
   - Centralize reservation and savings plan purchases to maximize shared benefit utilization
   - Implement chargeback models for departmental accountability

2. **Governance and Controls**:
   - Create policies for when and how reservations/savings plans are purchased
   - Implement approval workflows for new commitments
   - Establish minimum utilization thresholds for reservation purchases

## Implementation Tools and Resources

### Native Azure Tools

- **Azure Advisor**: Provides recommendations for reservations based on your usage patterns
- **Azure Cost Management**: Offers detailed views of your costs and commitment utilization
- **Azure Pricing Calculator**: Helps estimate potential savings with different commitment options

### Third-Party Solutions

- **Azure Optimization Engine (AOE)**: Provides additional reporting capabilities for reservation insights
- **FinOps Platforms**: Tools like Cloudability, CloudHealth, and others can help manage complex commitment strategies
- **Azure Monitor**: Can be configured to alert on significant changes in resource usage patterns

## Next Steps

After implementing your Azure Reservations and/or Savings Plans:

1. Document your implementation decisions and rationale
2. Schedule regular review sessions to assess effectiveness
3. Create a renewal strategy for expiring commitments
4. Consider implementing additional cost optimization strategies beyond commitments
