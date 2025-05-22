## Table of Contents
- [Introduction](#introduction)
- [WAF Architecture](#waf-architecture)
- [Azure WAF Solutions](#azure-waf-solutions)
  - [Azure Front Door WAF](#azure-front-door-waf)
  - [Azure Application Gateway WAF](#azure-application-gateway-waf)
  - [Azure WAF Policies](#azure-waf-policies)
- [WAF Rule Sets](#waf-rule-sets)
  - [OWASP Core Rule Set](#owasp-core-rule-set)
  - [Microsoft Default Rule Set](#microsoft-default-rule-set)
  - [Bot Protection Rules](#bot-protection-rules)
- [WAF Deployment and Configuration](#waf-deployment-and-configuration)
  - [Deployment Models](#deployment-models)
  - [Initial Configuration](#initial-configuration)
  - [Configuration Best Practices](#configuration-best-practices)
- [WAF Operations](#waf-operations)
  - [Monitoring and Alerting](#monitoring-and-alerting)
  - [Log Analysis](#log-analysis)
  - [Performance Tuning](#performance-tuning)
- [WAF Rules Management](#waf-rules-management)
  - [Rule Types](#rule-types)
  - [Creating Custom Rules](#creating-custom-rules)
  - [Rule Exclusions](#rule-exclusions)
  - [Rule Testing](#rule-testing)
- [Incident Response](#incident-response)
  - [Attack Detection](#attack-detection)
  - [Mitigation Actions](#mitigation-actions)
  - [Post-Incident Analysis](#post-incident-analysis)
- [WAF Optimization](#waf-optimization)
  - [False Positive Management](#false-positive-management)
  - [Performance Optimization](#performance-optimization)
  - [Cost Optimization](#cost-optimization)
- [Integration with Other Security Systems](#integration-with-other-security-systems)
  - [SIEM Integration](#siem-integration)
  - [SOC Operations](#soc-operations)
  - [Threat Intelligence](#threat-intelligence)
- [Compliance and Governance](#compliance-and-governance)
  - [Regulatory Requirements](#regulatory-requirements)
  - [Security Standards](#security-standards)
  - [Audit and Reporting](#audit-and-reporting)
- [Advanced WAF Scenarios](#advanced-waf-scenarios)
  - [Multi-Region Deployments](#multi-region-deployments)
  - [WAF-as-Code](#waf-as-code)
  - [API Protection](#api-protection)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Diagnostic Tools](#diagnostic-tools)
  - [Case Studies](#case-studies)
- [References and Resources](#references-and-resources)

## Introduction

A Web Application Firewall (WAF) is a critical security control that protects web applications from a variety of attacks targeting application vulnerabilities. Unlike traditional network firewalls, WAFs operate at Layer 7 (application layer) of the OSI model, enabling them to analyze HTTP/HTTPS traffic at a much deeper level.

WAFs protect against common web application threats including:

- SQL Injection attacks
- Cross-Site Scripting (XSS)
- Cross-Site Request Forgery (CSRF)
- Command Injection
- Path traversal attacks
- Invalid request handling
- Malicious bots and scrapers
- API abuse
- DDoS attacks (application layer)

This document provides comprehensive guidance for deploying, configuring, operating, and optimizing Web Application Firewalls in Azure environments. It serves as a reference for both day-to-day operations and incident response scenarios.

## WAF Architecture

### Architectural Components

A complete WAF solution typically consists of the following components:

1. **Traffic Processing Engine**: Analyzes incoming and outgoing HTTP/HTTPS requests
2. **Rule Engine**: Evaluates traffic against security rules
3. **Rule Sets**: Collections of security rules targeting specific attack vectors
4. **Configuration Management**: Controls WAF behavior and rule application
5. **Logging and Monitoring**: Records traffic and security events
6. **Integration Points**: Connects with broader security ecosystem

### Deployment Models

WAFs can be deployed in various models:

1. **Reverse Proxy Mode**: All traffic passes through the WAF before reaching the application
   - Provides strongest protection but requires careful configuration
   - Most common deployment model in Azure (Application Gateway, Front Door)

2. **Bridge Mode**: WAF sits transparently in the traffic path
   - Less common in cloud environments

3. **Out-of-Band Monitoring**: WAF analyzes a copy of the traffic
   - Detection only (no active blocking)
   - Used in sensitive environments to minimize disruption risk

4. **Agent-Based**: WAF functionality runs directly on application servers
   - Not typical in Azure deployments

5. **API-Based**: Modern cloud WAFs often use API calls to apply protections
   - Azure WAF Policies use this model

### Traffic Flow

In Azure environments, the typical traffic flow through a WAF is:

```
Internet → Azure WAF (Front Door/Application Gateway) → Backend Application (App Service/VM/AKS)
```

This architecture provides the following security benefits:

- Application servers never receive direct Internet traffic
- Malicious requests are filtered before reaching application code
- DDoS protection can be applied at the edge
- TLS termination occurs at the WAF layer

## Azure WAF Solutions

Azure provides multiple WAF implementation options, each suited to different architectural requirements.

### Azure Front Door WAF

Azure Front Door WAF is a global, multi-tenant service that provides:

- Edge security at Microsoft's global points of presence
- Global load balancing
- WAF protection
- DDoS protection
- URL-based routing

**Key Features:**
- Global reach and low latency
- Integration with Azure CDN
- Anycast networking
- Global HTTP/HTTPS load balancing
- Application acceleration
- Session affinity

**Ideal Use Cases:**
- Multi-region applications requiring global load balancing
- Applications needing edge security and acceleration
- Protection for globally distributed web applications

**Configuration Example:**

```json
{
  \"properties\": {
    \"enabled\": true,
    \"mode\": \"Prevention\",
    \"customRules\": {
      \"rules\": [
        {
          \"name\": \"BlockCountryRule\",
          \"priority\": 100,
          \"enabledState\": \"Enabled\",
          \"ruleType\": \"MatchRule\",
          \"matchConditions\": [
            {
              \"matchVariable\": \"RemoteAddr\",
              \"operator\": \"GeoMatch\",
              \"matchValues\": [
                \"HK\",
                \"CN\"
              ]
            }
          ],
          \"action\": \"Block\"
        }
      ]
    },
    \"managedRules\": {
      \"managedRuleSets\": [
        {
          \"ruleSetType\": \"Microsoft_DefaultRuleSet\",
          \"ruleSetVersion\": \"2.1\",
          \"ruleGroupOverrides\": []
        },
        {
          \"ruleSetType\": \"Microsoft_BotManagerRuleSet\",
          \"ruleSetVersion\": \"1.0\",
          \"ruleGroupOverrides\": []
        }
      ]
    }
  }
}
```

**Azure CLI Example:**

```bash
# Create a Front Door WAF policy
az network front-door waf-policy create \\
  --name \"GlobalWafPolicy\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --disabled false \\
  --mode \"Prevention\" \\
  --redirect-url \"https://securitypage.contoso.com/blocked.html\"

# Add a custom rule to block specific countries
az network front-door waf-policy rule create \\
  --name \"BlockCountryRule\" \\
  --policy-name \"GlobalWafPolicy\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --action \"Block\" \\
  --priority 100 \\
  --rule-type \"MatchRule\" \\
  --match-condition operator=\"GeoMatch\" match-variable=\"RemoteAddr\" match-values \"HK\" \"CN\"

# Add managed rule sets
az network front-door waf-policy managed-rules add \\
  --policy-name \"GlobalWafPolicy\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --type \"Microsoft_DefaultRuleSet\" \\
  --version \"2.1\"
```

### Azure Application Gateway WAF

Azure Application Gateway WAF is a regional service that provides:

- Layer 7 load balancing
- WAF functionality
- SSL termination
- End-to-end TLS
- URL-based routing
- Cookie-based session affinity

**Key Features:**
- Regional deployment
- Deep integration with Azure Virtual Networks
- Operates at the regional level
- Support for WebSocket and HTTP/2 protocols
- Autoscaling
- Zone redundancy
- Static VIP

**Ideal Use Cases:**
- Applications hosted in Azure Virtual Networks
- Scenarios requiring advanced routing capabilities
- When network integration with Azure resources is critical
- Need for WebSocket or HTTP/2 support

**Configuration Example:**

```json
{
  \"properties\": {
    \"webApplicationFirewallConfiguration\": {
      \"enabled\": true,
      \"firewallMode\": \"Prevention\",
      \"ruleSetType\": \"OWASP\",
      \"ruleSetVersion\": \"3.2\",
      \"disabledRuleGroups\": [
        {
          \"ruleGroupName\": \"REQUEST-942-APPLICATION-ATTACK-SQLI\",
          \"rules\": [942130, 942140]
        }
      ],
      \"exclusions\": [
        {
          \"matchVariable\": \"RequestHeaderNames\",
          \"selectorMatchOperator\": \"Equals\",
          \"selector\": \"User-Agent\",
          \"exclusionManagedRuleSets\": [
            {
              \"ruleSetType\": \"OWASP\",
              \"ruleSetVersion\": \"3.2\",
              \"ruleGroups\": [
                {
                  \"ruleGroupName\": \"REQUEST-920-PROTOCOL-ENFORCEMENT\",
                  \"rules\": [920300, 920330]
                }
              ]
            }
          ]
        }
      ],
      \"requestBodyCheck\": true,
      \"maxRequestBodySizeInKb\": 128,
      \"fileUploadLimitInMb\": 100
    }
  }
}
```

**Azure CLI Example:**

```bash
# Create Application Gateway with WAF configuration
az network application-gateway create \\
  --name \"AppGatewayWAF\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --location \"East US\" \\
  --vnet-name \"ProductionVNet\" \\
  --subnet \"AppGatewaySubnet\" \\
  --capacity 2 \\
  --sku WAF_v2 \\
  --http-settings-cookie-based-affinity Enabled \\
  --frontend-port 443 \\
  --http-settings-port 443 \\
  --http-settings-protocol Https \\
  --public-ip-address \"AppGatewayPublicIP\" \\
  --cert-file \"appgw-cert.pfx\" \\
  --cert-password \"password\"

# Configure WAF settings
az network application-gateway waf-config set \\
  --gateway-name \"AppGatewayWAF\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --enabled true \\
  --firewall-mode Prevention \\
  --rule-set-type OWASP \\
  --rule-set-version 3.2 \\
  --request-body-check true \\
  --max-request-body-size 128 \\
  --file-upload-limit 100
```

### Azure WAF Policies

Azure WAF Policies provide a centralized way to manage WAF rules across multiple WAF endpoints. This allows for consistent security policy enforcement across different applications and environments.

**Key Benefits:**
- Centralized policy management
- Reusable configurations
- Consistent rule enforcement
- Simplified governance

**Policy Structure:**
1. **Custom Rules**: Application-specific rules
2. **Managed Rule Sets**: Pre-configured rule collections (OWASP CRS, Microsoft rule sets)
3. **Settings**: Global WAF configurations
4. **Exclusions**: Exceptions to rule processing

**Example PowerShell for WAF Policy Creation:**

```powershell
# Create a WAF policy
New-AzFrontDoorWafPolicy `
  -Name \"CentralWafPolicy\" `
  -ResourceGroupName \"SecurityResourceGroup\" `
  -Sku \"Premium_AzureFrontDoor\" `
  -Mode \"Prevention\" `
  -EnabledState \"Enabled\"

# Add a managed rule set
$ManagedRuleSet = New-AzFrontDoorWafManagedRuleSetObject `
  -Type \"Microsoft_DefaultRuleSet\" `
  -Version \"2.1\"

$ManagedRuleGroupOverride = New-AzFrontDoorWafManagedRuleGroupOverrideObject `
  -RuleGroupName \"PHP\" `
  -Rule @(
    New-AzFrontDoorWafManagedRuleOverrideObject -RuleId \"933100\" -Action \"Block\" -EnabledState \"Enabled\",
    New-AzFrontDoorWafManagedRuleOverrideObject -RuleId \"933110\" -Action \"Block\" -EnabledState \"Enabled\"
  )

$ManagedRule = New-AzFrontDoorWafManagedRuleObject `
  -ManagedRuleSet $ManagedRuleSet `
  -ManagedRuleGroupOverride $ManagedRuleGroupOverride

Update-AzFrontDoorWafPolicy `
  -Name \"CentralWafPolicy\" `
  -ResourceGroupName \"SecurityResourceGroup\" `
  -ManagedRule $ManagedRule
```

## WAF Rule Sets

WAF rule sets are collections of security rules designed to protect against specific types of attacks. Azure WAF supports multiple rule sets that can be applied simultaneously.

### OWASP Core Rule Set

The Open Web Application Security Project (OWASP) Core Rule Set (CRS) is an open-source collection of rules providing protection against common web application vulnerabilities.

**Versions Supported in Azure:**
- OWASP CRS 3.2 (Current)
- OWASP CRS 3.1
- OWASP CRS 3.0 (Legacy)

**Rule Groups:**

| Rule Group | Description | Example Rules |
|------------|-------------|---------------|
| REQUEST-920-PROTOCOL-ENFORCEMENT | Enforces proper HTTP protocol usage | 920300: Missing HTTP Header, 920350: Host header is a numeric IP address |
| REQUEST-921-PROTOCOL-ATTACK | Blocks protocol attacks | 921110: HTTP Request Smuggling Attack, 921120: HTTP Response Splitting Attack |
| REQUEST-930-APPLICATION-ATTACK-LFI | Prevents Local File Inclusion attacks | 930100: Path Traversal Attack, 930110: Path Traversal Attack via URL encoding |
| REQUEST-931-APPLICATION-ATTACK-RFI | Prevents Remote File Inclusion attacks | 931100: RFI Attack, 931110: RFI Attack via URL encoding |
| REQUEST-932-APPLICATION-ATTACK-RCE | Blocks Remote Code Execution attempts | 932100: RCE via OS command injection, 932105: RCE via Command Line Argument |
| REQUEST-933-APPLICATION-ATTACK-PHP | Protects against PHP specific attacks | 933100: PHP Injection Attack, 933110: PHP Code Injection |
| REQUEST-941-APPLICATION-ATTACK-XSS | Prevents Cross-Site Scripting attacks | 941100: XSS Attack, 941110: XSS Filter Evasion Attack |
| REQUEST-942-APPLICATION-ATTACK-SQLI | Blocks SQL Injection attacks | 942100: SQL Injection Attack, 942200: SQL Injection Detection |
| REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION | Prevents session fixation attacks | 943100: Session Fixation Attack, 943110: Session Fixation Detection |

**Rule Severity Levels:**

| Severity | Description | Action Guidance |
|----------|-------------|----------------|
| Critical | Indicates a severe security vulnerability with immediate risk | Immediate blocking recommended |
| Warning | Potential security issue that may require attention | Monitor and block if validated |
| Notice | Informational detection with lower risk | Monitor for patterns, typically safe to exclude |

**Example - Disabling Specific OWASP Rules:**

```json
{
  \"managedRules\": {
    \"managedRuleSets\": [
      {
        \"ruleSetType\": \"OWASP\",
        \"ruleSetVersion\": \"3.2\",
        \"ruleGroupOverrides\": [
          {
            \"ruleGroupName\": \"REQUEST-942-APPLICATION-ATTACK-SQLI\",
            \"rules\": [
              {
                \"ruleId\": \"942130\",
                \"state\": \"Disabled\",
                \"exclusions\": []
              },
              {
                \"ruleId\": \"942140\",
                \"state\": \"Disabled\",
                \"exclusions\": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**ARM Template Example:**

```json
{
  \"resources\": [
    {
      \"type\": \"Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies\",
      \"apiVersion\": \"2020-11-01\",
      \"name\": \"OWASPPolicy\",
      \"location\": \"[resourceGroup().location]\",
      \"properties\": {
        \"policySettings\": {
          \"requestBodyCheck\": true,
          \"maxRequestBodySizeInKb\": 128,
          \"fileUploadLimitInMb\": 100,
          \"state\": \"Enabled\",
          \"mode\": \"Prevention\"
        },
        \"managedRules\": {
          \"managedRuleSets\": [
            {
              \"ruleSetType\": \"OWASP\",
              \"ruleSetVersion\": \"3.2\",
              \"ruleGroupOverrides\": [
                {
                  \"ruleGroupName\": \"REQUEST-942-APPLICATION-ATTACK-SQLI\",
                  \"rules\": [
                    {
                      \"ruleId\": \"942130\",
                      \"state\": \"Disabled\"
                    },
                    {
                      \"ruleId\": \"942140\",
                      \"state\": \"Disabled\"
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    }
  ]
}
```

### Microsoft Default Rule Set

The Microsoft Default Rule Set is a Microsoft-managed collection of rules designed to protect against common web vulnerabilities, with specific optimizations for Azure environments.

**Versions:**
- Microsoft_DefaultRuleSet 2.1 (Current)
- Microsoft_DefaultRuleSet 1.1 (Legacy)

**Key Rule Categories:**

| Category | Description | Example Protection |
|----------|-------------|-------------------|
| Microsoft_SqlInjection | Protection against SQL injection | Detects and blocks various SQL injection patterns |
| Microsoft_XSS | Cross-site scripting protection | Blocks attempts to inject malicious scripts |
| Microsoft_RFI | Remote file inclusion protection | Prevents attackers from including remote files |
| Microsoft_FileUpload | File upload protection | Controls file uploads to prevent malicious file uploads |
| Microsoft_PHP | PHP-specific protections | Blocks PHP injection attacks |
| Microsoft_RCE | Remote code execution protection | Prevents command execution attempts |
| Microsoft_Scanner | Scanner detection | Identifies and blocks automated scanning tools |
| Microsoft_ProtocolEnforcement | Protocol enforcement | Ensures proper use of HTTP protocol |

**Example - Configuring Microsoft Default Rule Set:**

```json
{
  \"managedRules\": {
    \"managedRuleSets\": [
      {
        \"ruleSetType\": \"Microsoft_DefaultRuleSet\",
        \"ruleSetVersion\": \"2.1\",
        \"ruleGroupOverrides\": [
          {
            \"ruleGroupName\": \"Microsoft_XSS\",
            \"rules\": [
              {
                \"ruleId\": \"100023\",
                \"state\": \"Disabled\"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**PowerShell Configuration:**

```powershell
# Create new WAF policy using Microsoft Default Rule Set
$DefaultRules = New-AzFrontDoorWafManagedRuleObject `
  -Type \"Microsoft_DefaultRuleSet\" `
  -Version \"2.1\"

New-AzFrontDoorWafPolicy `
  -Name \"MsftDefaultPolicy\" `
  -ResourceGroupName \"SecurityResourceGroup\" `
  -Sku \"Premium_AzureFrontDoor\" `
  -Mode \"Prevention\" `
  -ManagedRule $DefaultRules
```

### Bot Protection Rules

Bot Protection Rules in Azure WAF help identify and mitigate malicious bot activity, while allowing legitimate bots to access your applications.

**Bot Categories:**

| Bot Type | Description | Default Action |
|----------|-------------|----------------|
| Good Bots | Known legitimate bots (search engines, monitoring) | Allow |
| Bad Bots | Known malicious bots | Block |
| Unknown Bots | Unclassified bot traffic | Based on rule configuration |
| Verified Bots | Microsoft-verified legitimate bots | Allow |

**Key Bot Protection Features:**
1. **Bot Classification**: Identifies and categorizes bot traffic
2. **Challenge-Response Mechanisms**: CAPTCHA and JavaScript challenges
3. **Rate Limiting**: Controls request frequency
4. **Fingerprinting**: Detects bot signatures
5. **Behavioral Analysis**: Identifies suspicious patterns

**Example - Bot Manager Configuration:**

```json
{
  \"managedRules\": {
    \"managedRuleSets\": [
      {
        \"ruleSetType\": \"Microsoft_BotManagerRuleSet\",
        \"ruleSetVersion\": \"1.0\",
        \"ruleGroupOverrides\": [
          {
            \"ruleGroupName\": \"BadBots\",
            \"rules\": [
              {
                \"ruleId\": \"botmanager-100\",
                \"action\": \"Block\",
                \"state\": \"Enabled\"
              }
            ]
          },
          {
            \"ruleGroupName\": \"KnownBots\",
            \"rules\": [
              {
                \"ruleId\": \"botmanager-200\",
                \"action\": \"Log\",
                \"state\": \"Enabled\"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Azure CLI Configuration:**

```bash
# Add Bot Manager Rule Set to an existing WAF policy
az network front-door waf-policy managed-rules add \\
  --policy-name \"MainWafPolicy\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --type \"Microsoft_BotManagerRuleSet\" \\
  --version \"1.0\"

# Configure Bot Manager Rule Group overrides
az network front-door waf-policy managed-rules override-rule group add \\
  --policy-name \"MainWafPolicy\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --rule-set-type \"Microsoft_BotManagerRuleSet\" \\
  --rule-set-version \"1.0\" \\
  --rule-group-name \"BadBots\" \\
  --rules ruleId=\"botmanager-100\" state=\"Enabled\" action=\"Block\"
```

## WAF Deployment and Configuration

### Deployment Models

Azure WAF deployments typically follow one of these models:

1. **Edge Deployment (Azure Front Door)**
   - WAF at the network edge
   - Global distribution
   - First line of defense
   - Protects all Azure regions

2. **Regional Deployment (Application Gateway)**
   - WAF within a specific Azure region
   - Integrated with Virtual Networks
   - Closer to application backends
   - Region-specific protection

3. **Layered Deployment (Front Door + Application Gateway)**
   - Multiple WAF layers
   - Edge protection via Front Door
   - Regional protection via Application Gateway
   - Defense in depth approach

**Example Architecture - Layered Deployment:**

```
Internet → Azure Front Door WAF → Regional Traffic Manager → Application Gateway WAF → Backend Applications
```

**Key Considerations for Deployment Model Selection:**

| Factor | Front Door WAF | Application Gateway WAF | Layered Approach |
|--------|---------------|------------------------|------------------|
| Global Footprint | ✓ | ✗ | ✓ |
| VNet Integration | ✗ | ✓ | ✓ |
| Edge Protection | ✓ | ✗ | ✓ |
| Regional Control | ✗ | ✓ | ✓ |
| Cost | $$ | $$ | $$$ |
| Management Complexity | Low | Medium | High |

### Initial Configuration

When deploying a new WAF, follow these configuration steps:

1. **Basic Setup**
   ```powershell
   # Create a WAF policy with detection mode first
   New-AzFrontDoorWafPolicy `
     -Name \"InitialWafPolicy\" `
     -ResourceGroupName \"SecurityResourceGroup\" `
     -Mode \"Detection\" `
     -EnabledState \"Enabled\"
   ```

2. **Apply Default Rule Sets**
   ```powershell
   # Add OWASP CRS or Microsoft Default Rule Set
   $DefaultRules = New-AzFrontDoorWafManagedRuleObject `
     -Type \"Microsoft_DefaultRuleSet\" `
     -Version \"2.1\"
   
   Update-AzFrontDoorWafPolicy `
     -Name \"InitialWafPolicy\" `
     -ResourceGroupName \"SecurityResourceGroup\" `
     -ManagedRule $DefaultRules
   ```

3. **Configure Logging**
   ```powershell
   # Enable diagnostic settings for WAF
   $diagSetting = @{
     Name = 'wafDiagnostics'
     ResourceId = $wafPolicy.Id
     WorkspaceId = $logWorkspace.ResourceId
     Enabled = $true
     Category = @('FrontdoorAccessLog','FrontdoorWebApplicationFirewallLog')
   }
   
   Set-AzDiagnosticSetting @diagSetting
   ```

4. **Test and Monitor**
   - Run in Detection mode for at least 2 weeks
   - Monitor logs for false positives
   - Adjust rules based on findings

5. **Transition to Prevention Mode**
   ```powershell
   # After testing, switch to prevention mode
   Update-AzFrontDoorWafPolicy `
     -Name \"InitialWafPolicy\" `
     -ResourceGroupName \"SecurityResourceGroup\" `
     -Mode \"Prevention\"
   ```

### Configuration Best Practices

Follow these best practices for optimal WAF configuration:

1. **Start Conservative**
   - Begin with Detection mode
   - Apply managed rule sets first
   - Add custom rules incrementally

2. **Document Exceptions**
   - Maintain a registry of all rule exclusions
   - Document justification for each exception
   - Review exclusions quarterly

3. **Use WAF Policies**
   - Create reusable WAF policies
   - Apply consistent policies across endpoints
   - Define environment-specific policies (prod, non-prod)

4. **Rule Optimization**
   - Disable irrelevant rules (e.g., PHP rules for .NET applications)
   - Tune rule sensitivity based on application context
   - Prioritize custom rules appropriately

5. **Defense in Depth**
   - WAF should not be your only security control
   - Combine with secure coding practices
   - Implement additional security layers

**Example Configuration Checklist:**

```markdown
## WAF Deployment Checklist

### Initial Setup
- [ ] Create WAF Policy in Detection mode
- [ ] Apply default rule sets
- [ ] Configure logging to Log Analytics
- [ ] Set up alert rules for WAF events

### Testing Phase
- [ ] Run in Detection mode for 2+ weeks
- [ ] Monitor for false positives
- [ ] Create necessary rule exclusions
- [ ] Document all exceptions

### Production Deployment
- [ ] Switch to Prevention mode
- [ ] Implement custom rules for application-specific threats
- [ ] Set up ongoing monitoring
- [ ] Schedule regular rule reviews

### Documentation
- [ ] Document WAF architecture
- [ ] Create exception registry
- [ ] Document incident response procedures
- [ ] Create runbooks for common WAF tasks
```

## WAF Operations

### Monitoring and Alerting

Effective WAF monitoring requires:

1. **Comprehensive Logging**
   - Enable diagnostic settings for WAF logs
   - Send logs to Log Analytics
   - Retain logs for at least 90 days

2. **Key Metrics to Monitor**
   - Blocked request count
   - Matched rule distribution
   - Traffic patterns
   - Response latency
   - Rule exclusion usage

3. **Alert Configuration**

| Alert Type | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| High Block Rate | >10% of traffic | High | Notify Security Team |
| Sudden Block Increase | 200% increase over baseline | Medium | Notify Application Team |
| WAF Bypass Detection | Any | Critical | Trigger Incident |
| Rule Exclusion Abuse | >100 hits on exclusion | Medium | Review Exclusion |
| Geographic Anomalies | Traffic from unusual countries | Low | Monitor |

**Example KQL Query for WAF Monitoring:**

```kusto
// Azure Front Door WAF Alert Query
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| summarize BlockCount=count() by bin(TimeGenerated, 5m), 
    ruleName=ruleId_s,
    requestUri=requestUri_s,
    clientIP=clientIP_s
| where BlockCount > 10
| order by BlockCount desc
```

```kusto
// Application Gateway WAF Alert Query
AzureDiagnostics
| where ResourceType == \"APPLICATIONGATEWAYS\" and OperationName == \"ApplicationGatewayFirewall\"
| where action_s == \"Blocked\"
| summarize BlockCount=count() by bin(TimeGenerated, 5m), 
    ruleName=ruleId_s,
    requestUri_s,
    clientIP_s
| where BlockCount > 10
| order by BlockCount desc
```

**PowerShell for Setting Up WAF Alerts:**

```powershell
# Create an action group for WAF alerts
$actionGroup = New-AzActionGroup `
  -ResourceGroupName \"SecurityResourceGroup\" `
  -Name \"WafAlertActionGroup\" `
  -ShortName \"WafAlerts\" `
  -Receiver @(
    @{
      Name = \"EmailSecurityTeam\"
      UseCommonAlertSchema = $true
      EmailReceiver = @{
        Name = \"Security Team\"
        EmailAddress = \"security@contoso.com\"
      }
    },
    @{
      Name = \"SecurityTeamsChannel\"
      UseCommonAlertSchema = $true
      ArmRoleReceiver = @{
        Name = \"Teams Channel\"
        WebhookUri = \"https://outlook.office.com/webhook/...\"
      }
    }
  )

# Create a scheduled query rule alert for high WAF block rates
$source = New-AzScheduledQueryRuleSource `
  -Query 'AzureDiagnostics | where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\" | where action_s == \"Block\" | summarize BlockCount=count() by bin(TimeGenerated, 5m) | where BlockCount > 100' `
  -DataSourceId $logWorkspace.ResourceId

$schedule = New-AzScheduledQueryRuleSchedule -FrequencyInMinutes 5 -TimeWindowInMinutes 5

$trigger = New-AzScheduledQueryRuleTriggerCondition -ThresholdOperator \"GreaterThan\" -Threshold 0

$aznsAction = New-AzScheduledQueryRuleAlertingAction `
  -AznsAction @{ActionGroup=@($actionGroup.Id); EmailSubject=\"High WAF Block Rate Detected\"} `
  -Severity 2 `
  -Trigger $trigger

New-AzScheduledQueryRule `
  -ResourceGroupName \"SecurityResourceGroup\" `
  -Location $logWorkspace.Location `
  -Name \"High WAF Block Rate\" `
  -Description \"Alert when WAF block rate exceeds threshold\" `
  -Enabled $true `
  -Source $source `
  -Schedule $schedule `
  -Action $aznsAction
```

### Log Analysis

WAF logs provide rich insights for security operations. Key log analysis activities include:

1. **Regular Log Reviews**
   - Daily review of blocked requests
   - Weekly review of rule triggers
   - Monthly trend analysis

2. **Analysis Queries**

**Top Blocked Request Sources:**
```kusto
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| summarize BlockCount=count() by clientIP_s
| top 10 by BlockCount desc
```

**Most Triggered WAF Rules:**
```kusto
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| summarize HitCount=count() by ruleName=ruleId_s
| top 20 by HitCount desc
```

**Geographic Distribution of Attacks:**
```kusto
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| extend Country = tostring(clientCountry_s)
| summarize BlockCount=count() by Country
| top 10 by BlockCount desc
```

**False Positive Identification:**
```kusto
// Potential false positives - High volume of blocks from same rule and same legitimate client
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| summarize BlockCount=count() by 
    ruleName=ruleId_s,
    clientIP_s,
    requestUri_s
| where BlockCount > 50
| join kind=inner (
    // Known corporate/legitimate IPs
    externaldata(LegitimateIP:string) [@\"https://corporate-storage.blob.core.windows.net/security/legitimate-ips.csv\"]
    with (format=\"csv\")
) on $left.clientIP_s == $right.LegitimateIP
| project ruleName, clientIP_s, requestUri_s, BlockCount
| order by BlockCount desc
```

3. **Visualization Dashboards**

Create dashboards in Azure Portal or Power BI with:
- WAF block trends over time
- Geographic attack distribution
- Rule trigger heat maps
- Application impact metrics

**Sample ARM Template for WAF Dashboard:**

```json
{
  \"$schema\": \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\",
  \"contentVersion\": \"1.0.0.0\",
  \"parameters\": {
    \"workspaceName\": {
      \"type\": \"string\",
      \"metadata\": {
        \"description\": \"Log Analytics workspace name\"
      }
    }
  },
  \"resources\": [
    {
      \"type\": \"Microsoft.Portal/dashboards\",
      \"apiVersion\": \"2020-09-01-preview\",
      \"name\": \"WafSecurityDashboard\",
      \"location\": \"[resourceGroup().location]\",
      \"properties\": {
        \"lenses\": [
          {
            \"order\": 0,
            \"parts\": [
              {
                \"position\": {
                  \"x\": 0,
                  \"y\": 0,
                  \"rowSpan\": 2,
                  \"colSpan\": 3
                },
                \"metadata\": {
                  \"inputs\": [
                    {
                      \"name\": \"chartType\",
                      \"value\": \"bar\"
                    },
                    {
                      \"name\": \"query\",
                      \"value\": \"AzureDiagnostics | where ResourceType == \\\"FRONTDOORS\\\" and Category == \\\"FrontdoorWebApplicationFirewallLog\\\" | where action_s == \\\"Block\\\" | summarize BlockCount=count() by bin(TimeGenerated, 1h) | render barchart\"
                    },
                    {
                      \"name\": \"workspaceId\",
                      \"value\": \"[resourceId('Microsoft.OperationalInsights/workspaces', parameters('workspaceName'))]\"
                    }
                  ],
                  \"type\": \"Extension/Microsoft_OperationsManagementSuite_Workspace/PartType/LogsDashboardPart\",
                  \"settings\": {
                    \"content\": {
                      \"PartTitle\": \"WAF Blocks Over Time\"
                    }
                  }
                }
              }
              // Additional dashboard parts would be defined here
            ]
          }
        ]
      }
    }
  ]
}
```

### Performance Tuning

WAF performance must be monitored and tuned regularly to ensure optimal protection without degrading application performance.

**Key Performance Metrics:**

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Request Latency Added by WAF | <50ms | 50-200ms | >200ms |
| WAF CPU Utilization | <60% | 60-85% | >85% |
| WAF Memory Usage | <70% | 70-90% | >90% |
| SSL Handshake Time | <100ms | 100-300ms | >300ms |
| Instance Count (App Gateway) | N/A | N/A | Min 2 |

**Performance Optimization Techniques:**

1. **Capacity Planning**
   - Size WAF instances appropriately for peak traffic
   - Application Gateway: Min 2 instances for high availability
   - Monitor capacity during traffic spikes

2. **Rule Optimization**
   - Disable unnecessary rule groups
   - Reduce inspection body size for non-upload endpoints
   - Apply detailed rule sets only to sensitive paths

3. **Caching Configuration**
   - Enable caching for static content
   - Configure appropriate cache durations
   - Use Azure CDN for offloading static content

4. **SSL Optimization**
   - Use ECDHE cipher suites
   - Enable SSL session reuse
   - Consider terminating SSL at the WAF

**Performance Tuning Workflow:**

```
1. Establish baseline performance metrics
2. Identify performance bottlenecks
3. Implement targeted optimizations
4. Measure impact
5. Document effective changes
6. Repeat periodically
```

**Example PowerShell for WAF Performance Monitoring:**

```powershell
# Get WAF performance metrics for Application Gateway
$endTime = Get-Date
$startTime = $endTime.AddDays(-1)
$timeGrain = \"00:05:00\"
$metric = \"ApplicationGatewayTotalTime\"

$metricData = Get-AzMetric `
  -ResourceId $appGateway.Id `
  -MetricName $metric `
  -StartTime $startTime `
  -EndTime $endTime `
  -TimeGrain $timeGrain `
  -AggregationType \"Average\"

# Calculate performance statistics
$values = $metricData.Data | Select-Object -ExpandProperty Average
$average = ($values | Measure-Object -Average).Average
$max = ($values | Measure-Object -Maximum).Maximum
$min = ($values | Measure-Object -Minimum).Minimum
$p95 = $values | Sort-Object | Select-Object -Index ([int]($values.Count * 0.95))

Write-Output \"WAF Performance Stats (ms):\"
Write-Output \"  Average: $average\"
Write-Output \"  Maximum: $max\"
Write-Output \"  Minimum: $min\"
Write-Output \"  95th Percentile: $p95\"
```

## WAF Rules Management

### Rule Types

Azure WAF supports several rule types, each addressing different security requirements:

1. **Managed Rules**
   - Pre-configured rule sets (OWASP CRS, Microsoft Default)
   - Maintained by Microsoft
   - Updated regularly
   - Broad protection coverage

2. **Custom Rules**
   - Application-specific protection
   - Business logic enforcement
   - Tailored security policies
   - Environment-specific restrictions

3. **Rate Limiting Rules**
   - Control request frequency
   - Prevent brute force attacks
   - Mitigate DDoS attempts
   - Manage API consumption

**Rule Execution Order:**

1. Custom rules (processed in order of priority)
2. Bot Protection rules
3. Managed rule sets
4. Default rule (pass or block)

**Match Conditions Operators:**

| Operator | Description | Example Usage |
|----------|-------------|---------------|
| Contains | String contains value | User-Agent contains \"Vulnerability Scanner\" |
| StartsWith | String starts with value | URL path starts with \"/admin/\" |
| EndsWith | String ends with value | File name ends with \".sql\" |
| Equals | Exact string match | HTTP method equals \"TRACE\" |
| GeoMatch | Matches country code | Client IP in \"RU\", \"CN\" |
| LessThan | Numeric comparison | Content-Length less than 1000 |
| GreaterThan | Numeric comparison | Request count greater than 100 |
| LessThanOrEqual | Numeric comparison | Content-Length less than or equal to 1000 |
| GreaterThanOrEqual | Numeric comparison | Request count greater than or equal to 100 |
| IPMatch | IP address match | Client IP matches 10.10.10.0/24 |
| RegEx | Regular expression | URL path matches pattern \"^/api/v[0-9]+/\" |

### Creating Custom Rules

Custom rules allow you to address application-specific security requirements. Follow this process for creating effective custom rules:

1. **Define Rule Purpose**
   - Identify the specific threat or requirement
   - Document expected behavior
   - Define rule success criteria

2. **Determine Match Conditions**
   - Select appropriate match variables
   - Choose proper operators
   - Define match values
   - Consider combining multiple conditions

3. **Set Rule Action**
   - Block: Deny the request
   - Allow: Permit the request
   - Log: Record but take no action
   - Redirect: Send to another URL

4. **Assign Priority**
   - Lower numbers = higher priority
   - Leave gaps (100, 200, 300) for future insertion
   - Most specific rules first

**Example - Custom Rule to Block Access to Admin Portal from Non-Corporate IPs:**

```json
{
  \"customRules\": {
    \"rules\": [
      {
        \"name\": \"AdminPortalProtection\",
        \"priority\": 100,
        \"ruleType\": \"MatchRule\",
        \"matchConditions\": [
          {
            \"matchVariable\": \"RequestUri\",
            \"operator\": \"Contains\",
            \"matchValue\": \"/admin/\"
          },
          {
            \"matchVariable\": \"RemoteAddr\",
            \"operator\": \"IPMatch\",
            \"matchValue\": [
              \"23.45.67.0/24\",
              \"98.76.54.0/24\"
            ],
            \"negationConditional\": true
          }
        ],
        \"action\": \"Block\"
      }
    ]
  }
}
```

**Example - Rate Limiting Rule for API Endpoints:**

```json
{
  \"customRules\": {
    \"rules\": [
      {
        \"name\": \"RateLimitRule\",
        \"priority\": 200,
        \"ruleType\": \"RateLimitRule\",
        \"matchConditions\": [
          {
            \"matchVariable\": \"RequestUri\",
            \"operator\": \"Contains\",
            \"matchValue\": \"/api/\"
          }
        ],
        \"rateLimitThreshold\": 100,
        \"rateLimitDurationInMinutes\": 1,
        \"action\": \"Block\"
      }
    ]
  }
}
```

**PowerShell for Creating Custom Rules:**

```powershell
# Create a custom rule to block requests to sensitive endpoints from unauthorized countries
$matchCondition1 = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable \"RequestUri\" `
  -OperatorProperty \"Contains\" `
  -MatchValue \"/finance/\", \"/hr/\", \"/admin/\"

$matchCondition2 = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable \"RemoteAddr\" `
  -OperatorProperty \"GeoMatch\" `
  -MatchValue \"RU\", \"CN\", \"IR\", \"KP\"

$customRule = New-AzFrontDoorWafCustomRuleObject `
  -Name \"BlockSensitiveEndpoints\" `
  -Priority 100 `
  -RuleType MatchRule `
  -MatchCondition $matchCondition1, $matchCondition2 `
  -Action \"Block\"

$policy = Get-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\"
$policy.CustomRules.Rules.Add($customRule)

Set-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\" -CustomRule $policy.CustomRules
```

### Rule Exclusions

Rule exclusions allow you to prevent rule matches in specific contexts, helping manage false positives without completely disabling rules.

**When to Use Exclusions:**
- Legitimate application behavior triggers rules
- Specific endpoints require special handling
- Legacy application components cannot be remediated
- Third-party components cause false positives

**Exclusion Types:**

1. **Attribute-Based Exclusions**
   - Exclude based on specific request attributes
   - Example: Exclude a specific parameter from XSS inspection

2. **Rule-Based Exclusions**
   - Exclude specific rules from processing
   - Example: Disable SQL injection rules for a reporting endpoint

3. **Request-Based Exclusions**
   - Exclude entire requests from inspection
   - Example: Skip WAF for a specific user agent

**Best Practices for Exclusions:**
- Create narrowly scoped exclusions
- Document all exclusions with rationale
- Review exclusions regularly
- Prefer attribute exclusions over rule disablement
- Monitor exclusion usage

**Example - Exclude Parameter from XSS Detection:**

```json
{
  \"exclusions\": [
    {
      \"matchVariable\": \"RequestArgNames\",
      \"selectorMatchOperator\": \"Equals\",
      \"selector\": \"htmlContent\",
      \"exclusionManagedRuleSets\": [
        {
          \"ruleSetType\": \"OWASP\",
          \"ruleSetVersion\": \"3.2\",
          \"ruleGroups\": [
            {
              \"ruleGroupName\": \"REQUEST-941-APPLICATION-ATTACK-XSS\",
              \"rules\": [
                941100,
                941110,
                941120
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Azure CLI for Creating Rule Exclusions:**

```bash
# Add an exclusion to allow a specific parameter to contain HTML content
az network application-gateway waf-policy managed-rules exclusion add \\
  --policy-name \"MainWafPolicy\" \\
  --resource-group \"SecurityResourceGroup\" \\
  --match-variable \"RequestArgNames\" \\
  --selector-match-operator \"Equals\" \\
  --selector \"htmlContent\" \\
  --exclusion-managed-rule-set \\
    ruleSets=\"OWASP:3.2\" \\
    ruleGroups=\"REQUEST-941-APPLICATION-ATTACK-XSS:941100,941110,941120\"
```

### Rule Testing

Proper testing of WAF rules is essential to ensure they function as expected without causing disruption.

**Testing Methodology:**

1. **Development Environment Testing**
   - Test new rules in isolated environment
   - Use synthetic traffic generators
   - Verify rule logic with controlled inputs

2. **Detection Mode Testing**
   - Deploy to production in Detection mode
   - Monitor logs for expected matches
   - Analyze potential impacts

3. **Canary Testing**
   - Apply rules to a small traffic subset
   - Monitor application health metrics
   - Gradually increase traffic percentage

4. **Full Deployment**
   - Roll out to all traffic
   - Monitor for unexpected behavior
   - Maintain ability to roll back quickly

**Testing Tools:**

1. **OWASP ZAP**
   - Open-source security testing tool
   - Can generate attack traffic
   - Validates WAF effectiveness

2. **Azure WAF Testing Tool**
   - [github.com/Azure/Azure-WAF-Tester](https://github.com/Azure/Azure-WAF-Tester)
   - Tests rule coverage
   - Simulates various attack types

3. **Custom Test Scripts**

```powershell
# Example PowerShell script to test WAF rules
$endpoint = \"https://www.contoso.com/api/test\"
$headers = @{
    \"User-Agent\" = \"WAF-Test-Script/1.0\"
    \"Content-Type\" = \"application/json\"
}

# Test SQL Injection protection
$sqlInjectionTests = @(
    \"1' OR '1'='1\",
    \"1'; DROP TABLE users; --\",
    \"1 UNION SELECT username, password FROM users\"
)

foreach ($payload in $sqlInjectionTests) {
    $body = @{ \"id\" = $payload } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers -Body $body -ErrorAction SilentlyContinue
        Write-Warning \"SQL Injection test FAILED: Payload '$payload' was not blocked\"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
            Write-Output \"SQL Injection test PASSED: Payload '$payload' was properly blocked\"
        }
        else {
            Write-Error \"Test failed with unexpected error: $_\"
        }
    }
}
```

**Test Case Documentation Example:**

```markdown
# WAF Rule Test Case: Admin Portal Access Restriction

## Rule Details
- Name: AdminPortalProtection
- Priority: 100
- Action: Block
- Match Conditions:
  1. RequestUri Contains \"/admin/\"
  2. RemoteAddr NOT IPMatch Corporate Networks

## Test Scenarios

### Test 1: Access from Corporate Network
- Request: GET https://www.contoso.com/admin/dashboard
- Source IP: 23.45.67.89 (Corporate Range)
- Expected Outcome: Allow
- Actual Outcome: [RESULT]
- Status: [PASS/FAIL]

### Test 2: Access from Non-Corporate Network
- Request: GET https://www.contoso.com/admin/dashboard
- Source IP: 98.12.34.56 (Non-Corporate)
- Expected Outcome: Block
- Actual Outcome: [RESULT]
- Status: [PASS/FAIL]

### Test 3: Non-Admin Access from Non-Corporate Network
- Request: GET https://www.contoso.com/public/about
- Source IP: 98.12.34.56 (Non-Corporate)
- Expected Outcome: Allow
- Actual Outcome: [RESULT]
- Status: [PASS/FAIL]
```

## Incident Response

### Attack Detection

Effective attack detection depends on properly configured WAF monitoring and alerting.

**Key Attack Indicators:**

1. **High Block Rates**
   - Sudden increase in blocked requests
   - Multiple blocks from same IP or IP range
   - Blocks across multiple applications

2. **Rule Trigger Patterns**
   - Multiple rules triggered by same client
   - Sequential triggering of related rules
   - Targeted attacks on specific endpoints

3. **Advanced Attack Patterns**
   - Distributed attacks from multiple sources
   - Low and slow attacks evading rate limits
   - Sophisticated evasion techniques

**Detection Queries:**

**Potential SQL Injection Attack:**
```kusto
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where ruleId_s startswith \"942\" // SQL Injection rule group
| where action_s == \"Block\"
| summarize BlockCount=count() by clientIP_s, bin(TimeGenerated, 5m)
| where BlockCount > 10
| order by TimeGenerated desc
```

**Potential Reconnaissance Activity:**
```kusto
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| extend path = toupper(requestUri_s)
| where path contains \"/WP-\" or 
        path contains \"PHPMYADMIN\" or 
        path contains \".GIT\" or
        path contains \".ENV\" or
        path contains \"WEBSHELL\" or
        path endswith \".PHP\" or
        path endswith \".ASP\"
| summarize BlockCount=count() by clientIP_s, bin(TimeGenerated, 1h)
| order by BlockCount desc
```

**Distributed Attack Detection:**
```kusto
// Find IPs that are part of a coordinated attack
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| extend attackGroup = ruleId_s
| summarize IPCount=dcount(clientIP_s) by attackGroup, bin(TimeGenerated, 10m)
| where IPCount > 10
| order by TimeGenerated desc, IPCount desc
```

### Mitigation Actions

When attacks are detected, follow these mitigation steps:

1. **Immediate Actions**
   - Verify alert legitimacy
   - Assess attack scope and impact
   - Document initial findings

2. **Initial Containment**
   - Block attacking IP addresses
   - Enable additional WAF protections
   - Consider geoblocking if appropriate

3. **Enhanced Protections**
   - Deploy custom rules for specific attack patterns
   - Decrease rate limits during attack
   - Enable additional logging

4. **Attack-Specific Mitigations**

| Attack Type | WAF Mitigation |
|-------------|----------------|
| SQL Injection | Enable all SQL injection rule groups, lower sensitivity threshold |
| XSS Attack | Enable all XSS rule groups, add custom rules for specific patterns |
| Bot Attack | Enable bot protection, add CAPTCHA challenges |
| DDoS (L7) | Implement aggressive rate limiting, enable Azure DDoS Protection |
| Vulnerability Scanning | Block common scanner user agents, implement progressive challenges |

**Example - Emergency IP Blocking Rule:**

```powershell
# Create an emergency custom rule to block attacking IPs
$attackerIPs = @(\"23.45.67.89\", \"98.76.54.32\", \"12.34.56.78\")

$matchCondition = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable \"RemoteAddr\" `
  -OperatorProperty \"IPMatch\" `
  -MatchValue $attackerIPs

$emergencyRule = New-AzFrontDoorWafCustomRuleObject `
  -Name \"EmergencyIPBlock\" `
  -Priority 1 `
  -RuleType MatchRule `
  -MatchCondition $matchCondition `
  -Action \"Block\"

$policy = Get-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\"
$policy.CustomRules.Rules.Add($emergencyRule)

Set-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\" -CustomRule $policy.CustomRules
```

**Example - Temporary Enhanced Protection During Attack:**

```powershell
# During an active attack, increase WAF protection
# 1. Switch to Prevention mode if in Detection
$policy = Get-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\"
if ($policy.PolicySettings.Mode -eq \"Detection\") {
    Update-AzFrontDoorWafPolicy `
      -Name \"MainWafPolicy\" `
      -ResourceGroupName \"SecurityResourceGroup\" `
      -Mode \"Prevention\"
    Write-Output \"WAF policy switched to Prevention mode\"
}

# 2. Enable all relevant protection rule groups
$ruleGroups = @(\"REQUEST-942-APPLICATION-ATTACK-SQLI\", \"REQUEST-941-APPLICATION-ATTACK-XSS\")
foreach ($group in $ruleGroups) {
    # Find any disabled rules in these groups
    $disabledRules = $policy.ManagedRules.ManagedRuleSets[0].RuleGroupOverrides | 
                   Where-Object { $_.RuleGroupName -eq $group }
    
    if ($disabledRules) {
        # Enable these rules temporarily
        # In a real script, you'd save the original state first for restoration later
        $policy.ManagedRules.ManagedRuleSets[0].RuleGroupOverrides = 
            $policy.ManagedRules.ManagedRuleSets[0].RuleGroupOverrides | 
            Where-Object { $_.RuleGroupName -ne $group }
            
        Set-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\" -ManagedRule $policy.ManagedRules
        Write-Output \"Enabled all rules in group $group\"
    }
}

# 3. Add stricter rate limiting
$matchCondition = New-AzFrontDoorWafMatchConditionObject `
  -MatchVariable \"RequestUri\" `
  -OperatorProperty \"Contains\" `
  -MatchValue \"/\"  # Applies to all URLs

$rateLimitRule = New-AzFrontDoorWafCustomRuleObject `
  -Name \"EmergencyRateLimit\" `
  -Priority 50 `
  -RuleType RateLimitRule `
  -MatchCondition $matchCondition `
  -Action \"Block\" `
  -RateLimitThreshold 50 `
  -RateLimitDurationInMinutes 1

$policy = Get-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\"
$policy.CustomRules.Rules.Add($rateLimitRule)

Set-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\" -CustomRule $policy.CustomRules
Write-Output \"Added emergency rate limiting\"
```

### Post-Incident Analysis

After the attack has been mitigated, conduct a thorough post-incident analysis:

1. **Attack Timeline**
   - Document attack progression
   - Identify initial vector
   - Map attack evolution

2. **Effectiveness Assessment**
   - Evaluate WAF response
   - Identify any bypass methods
   - Assess detection speed

3. **Improvement Opportunities**
   - Identify rule gaps
   - Evaluate alert effectiveness
   - Consider architectural changes

**Post-Incident Report Template:**

```markdown
# WAF Security Incident Report

## Incident Summary
- **Incident ID**: WAF-2024-001
- **Date/Time**: May 16, 2024, 14:30-17:45 UTC
- **Type**: SQL Injection Attack Campaign
- **Target Applications**: Customer Portal, Partner API
- **Impact**: Medium (No data breach, 15 minutes of degraded performance)
- **Status**: Resolved

## Attack Details
- **Initial Detection**: WAF Alert - Multiple SQL Injection rule triggers
- **Attack Source**: IP range 203.0.113.0/24 (Country: Netherlands)
- **Attack Pattern**: Automated SQL injection attempts targeting login endpoints
- **Attack Volume**: Approximately 15,000 requests over 3 hours
- **Targeted Vulnerabilities**: SQL Injection, Authentication bypass

## Response Actions
1. **14:35** - Initial alert triggered, investigation started
2. **14:40** - Confirmed malicious intent, created emergency IP block rule
3. **14:55** - Enhanced WAF logging enabled
4. **15:10** - Added custom WAF rule to specifically target the attack pattern
5. **15:30** - Blocked attacking IP range at network level
6. **17:00** - Verified attack cessation
7. **17:45** - Incident closed

## Effectiveness Analysis
- **What Worked Well**:
  - WAF correctly identified and blocked 98% of malicious requests
  - Alert thresholds were appropriate for timely detection
  - Custom rules were effective at targeting specific attack patterns
  
- **Areas for Improvement**:
  - Initial WAF rules allowed 2% of malicious traffic through
  - Detection-to-mitigation time (20 minutes) could be improved
  - Some legitimate traffic was temporarily blocked

## Recommendations
1. **Short-term Actions**:
   - Update WAF rules to address the specific bypass technique identified
   - Adjust rate limiting thresholds for login endpoints
   - Create pre-approved emergency response playbook for similar attacks
   
2. **Long-term Improvements**:
   - Implement additional WAF testing with this attack pattern
   - Improve automation of IP blocking process
   - Consider architectural changes to better isolate authentication systems
   - Conduct targeted penetration testing of authentication endpoints

## Attachments
- Attack pattern samples
- WAF log excerpts
- Timeline visualization
- Mitigation scripts
```

## WAF Optimization

### False Positive Management

False positives occur when legitimate traffic is incorrectly blocked by WAF rules. Managing these effectively is critical for application usability.

**False Positive Identification:**

1. **User Reports**
   - Application errors reported by users
   - Support tickets with specific error descriptions
   - Business process failures

2. **Systematic Detection**
   - Log analysis for pattern identification
   - Correlation with application errors
   - Testing with known-good traffic

**False Positive Handling Process:**

1. **Verification**
   - Confirm the issue is WAF-related
   - Identify specific blocking rule(s)
   - Reproduce the issue if possible

2. **Risk Assessment**
   - Evaluate security impact of rule modification
   - Consider business impact of the false positive
   - Determine appropriate mitigation

3. **Mitigation Options**

| Approach | When to Use | Risk Level |
|----------|-------------|------------|
| Rule Exclusion | When specific legitimate pattern triggers rule | Medium |
| Rule Modification | When rule is too sensitive for your environment | Medium-High |
| Rule Disablement | Only when rule provides no value or has excessive FPs | High |

4. **Implementation and Validation**
   - Apply minimal necessary changes
   - Verify issue resolution
   - Monitor for security impact

**Example - False Positive Analysis Query:**

```kusto
// Identify potential false positives by finding blocks of known good user agents
AzureDiagnostics
| where ResourceType == \"FRONTDOORS\" and Category == \"FrontdoorWebApplicationFirewallLog\"
| where action_s == \"Block\"
| where clientIP_s in (
    // Corporate IP ranges or known good IPs
    \"203.0.113.0/24\", \"198.51.100.0/24\"
) or userAgent_s in (
    // Known good user agents
    \"CorporateApp/1.0\",
    \"LegacySystem/2.1\"
)
| extend RuleInfo = strcat(ruleId_s, \": \", details_matches_s)
| project TimeGenerated, clientIP_s, requestUri_s, RuleInfo, userAgent_s
| order by TimeGenerated desc
```

**PowerShell for Adding a False Positive Exclusion:**

```powershell
# Add an exclusion for a specific parameter in a form submission
$policy = Get-AzFrontDoorWafPolicy -ResourceGroupName \"SecurityResourceGroup\" -Name \"MainWafPolicy\"

$exclusion = [Microsoft.Azure.Commands.FrontDoor.Models.PSAzureFirewallExclusion]::new()
$exclusion.MatchVariable = \"RequestArgNames\"
$exclusion.SelectorMatchOperator = \"Equals\"
$exclusion.Selector = \"commentField\"

$ruleGroup = [Microsoft.Azure.Commands.FrontDoor.Models.PSAzureFirewallExclusionManagedRuleGroup]::new()
$ruleGroup.RuleGroupName = \"REQUEST-941-APPLICATION-ATTACK-XSS\"
$ruleGroup.Rules = @(941100, 941110, 941120)

$ruleSet = [Microsoft.Azure.Commands.FrontDoor.Models.PSAzureFirewallExclusionManagedRuleSet]::new()
$ruleSet.RuleSetType = \"OWASP`