# Troubleshooting Azure Reservations and Savings Plans

This guide addresses common issues that organizations encounter when implementing and managing Azure Reservations and Savings Plans, along with recommended solutions and best practices.

## Reservation Discount Not Being Applied

### Symptoms
- Resources that should be covered by a reservation are still being billed at pay-as-you-go rates
- Reservation utilization reports show low usage despite active resources

### Possible Causes and Solutions

#### 1. Scope Mismatch
**Cause**: The reservation scope doesn't include the subscription where resources are deployed.

**Solution**:
- Navigate to the reservation in the Azure Portal
- Select "Configuration"
- Verify or update the scope to include the appropriate subscriptions
- If using single scope, consider changing to shared scope for better utilization

#### 2. Resource Attribute Mismatch
**Cause**: The resource attributes (size, region, etc.) don't match the reservation specifications.

**Solution**:
- Verify that the VM size family matches the reservation
- Check that the region matches the reservation
- Ensure the OS type (Windows/Linux) matches
- For VMs with instance size flexibility, ensure they're in the same VM series group

#### 3. Recent Deployment
**Cause**: The reservation was recently purchased, and discounts haven't appeared yet.

**Solution**:
- Wait for up to 30 minutes for the reservation to be processed
- Review the resource again after this period
- Check the reservation purchase date to confirm

#### 4. Instance Size Flexibility Disabled
**Cause**: Instance size flexibility may be disabled for VM reservations.

**Solution**:
- Check if instance size flexibility is enabled for the reservation
- Navigate to the reservation's "Configuration" in the portal
- Enable instance size flexibility if appropriate

## Savings Plan Benefits Not Applying as Expected

### Symptoms
- Resources that should receive savings plan discounts still show on-demand pricing
- Savings plan utilization reports show underutilization despite active eligible resources

### Possible Causes and Solutions

#### 1. Non-Eligible Service
**Cause**: The resources attempting to use the savings plan aren't eligible for savings plan benefits.

**Solution**:
- Review the list of savings plan-eligible services in your price sheet
- Compare your resource types against this list
- For non-eligible services, consider Azure Reservations instead

#### 2. Scope Limitations
**Cause**: The resources are outside the scope assigned to the savings plan.

**Solution**:
- Check the scope configuration for your savings plan
- Update the scope to include the subscriptions with eligible resources
- Consider changing to a broader scope for better utilization

#### 3. Recent Purchase
**Cause**: The savings plan was recently purchased, and benefits aren't fully reflected yet.

**Solution**:
- Allow up to 48 hours for savings plan benefits to be fully applied and reflected in reporting
- Check again after this period

#### 4. Prioritization Issues
**Cause**: Other discounts or reservations are being applied first.

**Solution**:
- Remember that Azure will apply Reservations before Savings Plans
- Verify if reservations exist that might be covering the same resources
- Check if Azure Hybrid Benefit or other discounts are being applied

## Overcommitment and Underutilization

### Symptoms
- Reservation or savings plan utilization consistently below 80-90%
- Committed amounts significantly higher than actual usage

### Possible Causes and Solutions

#### 1. Overestimating Needs
**Cause**: Initial commitment was based on overestimated resource needs.

**Solution**:
- For reservations: Consider exchanging for smaller or different reservations
- For savings plans: No direct exchange is possible, but consider strategies to increase utilization 
- Implement more conservative estimation for future commitments

#### 2. Resource Decommissioning or Scaling
**Cause**: Resources covered by commitments have been scaled down or decommissioned.

**Solution**:
- For reservations: Consider exchanging for different reservations that match current needs
- Broaden the scope to allow other resources to benefit
- Implement governance to ensure reservation impact is considered before resource changes

#### 3. Scope Too Narrow
**Cause**: The commitment scope is too restrictive, preventing broader utilization.

**Solution**:
- Change from single subscription to shared scope
- Update the scope to include additional subscriptions or resource groups
- Consider organization-wide scope for maximum flexibility

#### 4. VM Rightsizing
**Cause**: VMs have been resized, making them ineligible for the existing reservations.

**Solution**:
- Enable instance size flexibility for VM reservations
- Exchange reservations for ones that match the new VM sizes
- Consider trading in reservations for savings plans if frequent VM resizing is expected

## High Utilization but Limited Savings

### Symptoms
- High reservation or savings plan utilization rates (90%+)
- Lower than expected overall savings on Azure bill

### Possible Causes and Solutions

#### 1. Commitment Coverage Too Low
**Cause**: Only a small percentage of eligible resources are covered by commitments.

**Solution**:
- Analyze additional resources that could benefit from commitments
- Gradually increase commitment coverage based on usage analysis
- Consider a mix of 1-year and 3-year commitments for different resource types

#### 2. Non-Compute Costs Dominating
**Cause**: Most costs are coming from services not eligible for reservations or savings plans.

**Solution**:
- Analyze cost breakdown by service type
- Investigate other cost optimization strategies for non-compute services
- Consider reserved capacity for services like Azure SQL Database if applicable

#### 3. On-Demand Surges
**Cause**: Regular usage spikes exceed commitment levels, resulting in on-demand charges.

**Solution**:
- Analyze usage patterns to identify predictable spikes
- Consider increasing commitment levels if spikes are consistent and predictable
- Implement auto-scaling policies to optimize resource usage during peak times

## Billing and Accounting Issues

### Symptoms
- Difficulty attributing reservation or savings plan benefits to specific departments or projects
- Challenges in cost allocation and chargeback

### Possible Causes and Solutions

#### 1. Inadequate Tagging Strategy
**Cause**: Resources lack proper tags for cost allocation purposes.

**Solution**:
- Implement a comprehensive tagging strategy
- Use Azure Policy to enforce tagging standards
- Regularly audit and remediate untagged or improperly tagged resources

#### 2. Shared Benefits Allocation
**Cause**: Difficulty attributing shared reservation or savings plan benefits across multiple teams.

**Solution**:
- Use cost allocation rules in Azure Cost Management
- Consider departmental or subscription-level commitments for clearer attribution
- Implement custom reporting to show actual benefit distribution

#### 3. Amortization Challenges
**Cause**: Upfront payments create accounting challenges for amortization.

**Solution**:
- Consider monthly payment options instead of upfront for simplified accounting
- Work with finance teams to establish proper amortization procedures
- Use the Azure Cost Management API to retrieve detailed usage data for custom reporting

## Commitment Renewal and Exchange Issues

### Symptoms
- Difficulty planning for commitment renewals
- Problems with reservation exchanges or trade-ins

### Possible Causes and Solutions

#### 1. Missing Renewal Notifications
**Cause**: No system in place to track approaching commitment expirations.

**Solution**:
- Set calendar reminders 3-6 months before commitment expiration
- Establish a regular review process for all commitments
- Consider automated tools or scripts to identify approaching expirations

#### 2. Exchange Limitations
**Cause**: Attempted exchange doesn't meet Microsoft's exchange policy requirements.

**Solution**:
- Review the current exchange policy in Microsoft documentation
- Ensure the new commitment value equals or exceeds the prorated remaining value
- Note that Savings Plans cannot be exchanged or refunded directly

#### 3. Trade-in Limits Reached
**Cause**: Organization has reached the annual refund or exchange limit ($50,000 USD per 12 months).

**Solution**:
- Plan exchanges carefully throughout the year to stay within limits
- Consider timing exchanges to span different 12-month periods
- Work with Microsoft account team for special situations

## Temporary Overutilization in Savings Plans

### Symptoms
- Savings Plan utilization temporarily shows over 100% in the Azure Portal

### Possible Causes and Solutions

#### 1. Normal Reconciliation Process
**Cause**: This is a normal part of Azure's savings plan reconciliation process.

**Solution**:
- No action needed; Azure automatically reconciles utilization back to 100%
- Wait for final billing reconciliation to see accurate utilization
- Focus on long-term utilization trends rather than temporary spikes

#### 2. Recent Usage Reporting Delays
**Cause**: Some usage is reported with delay, causing temporary over-application of benefits.

**Solution**:
- Use 7-day or 30-day averages for utilization to smooth out reporting anomalies
- Wait 48 hours after the usage period for most accurate utilization data
- Verify final charges on your invoice rather than relying on real-time reports

## Governance and Management Challenges

### Symptoms
- Inconsistent approach to reservation and savings plan management
- Lack of clear decision-making process for commitments

### Possible Causes and Solutions

#### 1. Decentralized Management
**Cause**: Multiple teams purchasing and managing commitments without coordination.

**Solution**:
- Establish a central FinOps or Cloud Center of Excellence team
- Implement approval workflows for commitment purchases
- Create organization-wide policies for commitment management

#### 2. Inadequate Monitoring
**Cause**: No regular process to review and optimize commitment utilization.

**Solution**:
- Set up weekly or monthly commitment review meetings
- Implement monitoring dashboards for commitment utilization
- Establish alerting for low utilization or approaching expirations

#### 3. Knowledge Gaps
**Cause**: Team lacks understanding of how to effectively manage commitments.

**Solution**:
- Provide training on Azure cost management best practices
- Document commitment management procedures
- Consider managed services or consulting support for complex environments

## Advanced Troubleshooting Tools

### Azure Portal Tools
- **Reservations Management**: Review and manage all reservations and their utilization
- **Cost Analysis**: Detailed breakdown of costs and savings
- **Azure Advisor**: Recommendations for reservation purchases and optimizations

### Azure CLI and PowerShell
- Use Azure CLI or PowerShell for bulk operations and automated management
- Script regular reports and monitoring for large environments

### Azure Resource Graph
- Query resource configuration to identify reservation eligibility
- Monitor resource changes that might impact reservation utilization

### Third-Party Solutions
- Azure Optimization Engine (AOE) for advanced insights
- FinOps platforms for comprehensive cost management
- Custom reporting solutions for complex enterprise environments

## When to Contact Support

Contact Microsoft Support when:
1. Reservations or savings plans are not applying despite troubleshooting
2. Unexpected charges appear on your invoice related to commitments
3. Exchange or refund operations fail in the portal
4. You need assistance with complex commitment strategies

Be prepared to provide:
- Reservation or savings plan order IDs
- Resource details that should be receiving benefits
- Billing subscription information
- Specific time periods when issues occurred
