# IncidentStatusBot Live Dashboard Tab

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Development Guidelines](#development-guidelines)
- [Setup and Configuration](#setup-and-configuration)
- [Data Integration](#data-integration)
- [UI Components](#ui-components)
- [Authentication and Authorization](#authentication-and-authorization)
- [Performance Optimization](#performance-optimization)
- [Theming and Accessibility](#theming-and-accessibility)
- [Troubleshooting](#troubleshooting)
- [Examples and Templates](#examples-and-templates)
- [Additional Resources](#additional-resources)

## Overview

The IncidentStatusBot Live Dashboard Tab provides a real-time visualization interface for monitoring IT service incidents directly within Microsoft Teams. This tab extension complements the IncidentStatusBot by offering a persistent, interactive dashboard that displays current incident status, historical data, service health metrics, and actionable insights.

The dashboard serves as a central command center for IT operations teams, enabling them to:
- Monitor active incidents in real-time
- Track incident resolution progress
- Identify service degradation patterns
- Coordinate response activities
- Access historical incident data for post-mortem analysis

This documentation outlines the technical specifications, setup procedures, and best practices for implementing and customizing the Live Dashboard Tab component of the IncidentStatusBot solution.

## Architecture

### High-Level Architecture

The Live Dashboard Tab is built using the following architecture:

```
+---------------------------------------------------+
|                Microsoft Teams                     |
+-------------------------+-------------------------+
                          |
+-------------------------v-------------------------+
|           Teams Tab Application Wrapper           |
+-------------------------+-------------------------+
                          |
        +----------------+v+----------------+
        |                                   |
+-------v------+    +------------+    +-----v-------+
| React-based  |    | Azure API  |    | SignalR     |
| Frontend     |<-->| Management |<-->| Real-time   |
| Framework    |    | Backend    |    | Service     |
+-------+------+    +------+-----+    +-------------+
        |                  |
        |           +-----v------+
        |           | Data Store  |
        |           +------+------+
        |                  |
+-------v------------------v-------+
|     Integration Services Layer    |
+----------------------------------+
          |            |            |
+---------v-+  +-------v--+  +-----v------+
| Azure     |  | Service   |  | Third-    |
| Monitor   |  | Health    |  | Party     |
| API       |  | API       |  | Systems   |
+-----------+  +----------+  +------------+
```

### Component Breakdown

1. **Frontend Framework**: A React-based single-page application (SPA) that renders the dashboard interface.
2. **Backend API**: Azure Functions or App Service that processes data and serves it to the frontend.
3. **Real-time Service**: Azure SignalR Service that enables real-time updates without polling.
4. **Data Store**: Azure Cosmos DB or Azure Table Storage for incident data persistence.
5. **Integration Services**: Connectors to various monitoring systems (Azure Monitor, Service Health, third-party tools).

## Features

### Core Dashboard Features

1. **Incident Overview Panel**
   - Active incidents summary with severity indicators
   - Incident count by status (New, Investigating, Mitigating, Resolved)
   - Mean Time To Resolution (MTTR) metrics
   - Incident impact assessment visualization

2. **Service Health Heatmap**
   - Color-coded service status indicators
   - Service dependency mapping
   - Regional availability visualization
   - Historical service health trends

3. **Incident Timeline**
   - Chronological view of incident activities
   - Incident state transitions
   - Response action tracking
   - Notification history log

4. **Real-time Metrics**
   - System performance indicators
   - Error rate tracking
   - Response time monitoring
   - Availability percentage

5. **Actionable Insights**
   - One-click incident response actions
   - Runbook access shortcuts
   - Recommended remediation steps
   - Subject matter expert identification

### Advanced Features

1. **Customizable Widgets**
   - Drag-and-drop layout configuration
   - User-specific dashboard views
   - Widget addition/removal capabilities
   - Parameter customization options

2. **Filtering and Search**
   - Multi-criteria incident filtering
   - Full-text search across incidents
   - Saved search templates
   - Advanced query capabilities

3. **Reporting and Export**
   - PDF/Excel export functionality
   - Scheduled report generation
   - Email distribution options
   - Custom report templates

4. **Alert Management**
   - Alert rule configuration
   - Notification preference settings
   - Alert suppression management
   - Alert correlation view

## Development Guidelines

### Microsoft Teams Tab Development Best Practices

When developing the Live Dashboard Tab, adhere to the following best practices:

1. **Design for Multiple Contexts**
   - Ensure the dashboard works in personal, channel, and meeting contexts
   - Implement context-aware behavior (e.g., show team-specific incidents in channel context)
   - Maintain consistent core functionality across contexts

2. **Responsive Design**
   - Design for all Teams client platforms (desktop, web, mobile)
   - Implement fluid layout with CSS Grid/Flexbox
   - Use relative units (rem, %, vh/vw) instead of fixed pixels
   - Test on various screen sizes and device orientations

3. **Teams Design Language**
   - Follow Fluent UI design principles
   - Use Teams color palette and typography
   - Maintain consistent spacing and component styling
   - Leverage Teams UI kit components

4. **Performance Optimization**
   - Implement code splitting for dashboard components
   - Optimize bundle size with tree shaking
   - Utilize web workers for data processing
   - Cache API responses appropriately

### Development Prerequisites

Before starting development, ensure you have:

- Node.js (v14 or higher)
- Microsoft Teams Toolkit extension for Visual Studio Code
- Microsoft 365 developer account
- Azure subscription for backend services
- Git for version control
- Familiarity with React and TypeScript
- Understanding of Microsoft Teams extensibility model

### Development Environment Setup

1. Install the required tools:
   ```bash
   # Install Teams Toolkit CLI
   npm install -g @microsoft/teamsfx-cli
   
   # Create a new Teams tab project
   teamsfx new
   ```

2. Select the tab application template and configure it:
   - Choose "Tab" as the capability
   - Select "React" as the frontend framework
   - Enable "Azure Functions" for backend (if needed)
   - Configure "Azure storage" for state management

3. Initialize the project structure:
   ```bash
   cd your-project-name
   npm install
   ```

## Setup and Configuration

### Tab Manifest Configuration

Configure the Teams app manifest (`manifest.json`) with the following settings:

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
  "manifestVersion": "1.14",
  "version": "1.0.0",
  "id": "{{MICROSOFT_APP_ID}}",
  "packageName": "com.yourcompany.incidentstatusbot.dashboard",
  "name": {
    "short": "Incident Dashboard",
    "full": "Incident Status Live Dashboard"
  },
  "description": {
    "short": "Real-time incident monitoring dashboard",
    "full": "Track and respond to IT service incidents in real-time with comprehensive visualization and response tools."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "staticTabs": [
    {
      "entityId": "dashboard",
      "name": "Live Dashboard",
      "contentUrl": "https://{{HOSTNAME}}/dashboard",
      "websiteUrl": "https://{{HOSTNAME}}/dashboard",
      "scopes": ["personal"]
    }
  ],
  "configurableTabs": [
    {
      "configurationUrl": "https://{{HOSTNAME}}/config",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupchat"]
    }
  ],
  "permissions": [
    "identity",
    "messageTeamMembers"
  ],
  "validDomains": [
    "{{HOSTNAME}}",
    "*.azurewebsites.net",
    "*.azure-api.net"
  ],
  "webApplicationInfo": {
    "id": "{{MICROSOFT_APP_ID}}",
    "resource": "api://{{HOSTNAME}}/{{MICROSOFT_APP_ID}}"
  }
}
```

### Backend Services Configuration

1. **Azure Functions Configuration**:
   ```json
   {
     "bindings": [
       {
         "authLevel": "anonymous",
         "type": "httpTrigger",
         "direction": "in",
         "name": "req",
         "methods": ["get", "post"],
         "route": "incidents/{action?}"
       },
       {
         "type": "http",
         "direction": "out",
         "name": "res"
       }
     ]
   }
   ```

2. **SignalR Service Configuration**:
   ```json
   {
     "bindings": [
       {
         "type": "signalR",
         "name": "signalRMessages",
         "hubName": "incidentHub",
         "connectionStringSetting": "AzureSignalRConnectionString",
         "direction": "out"
       }
     ]
   }
   ```

3. **Environment Variables**:
   ```
   REACT_APP_API_ENDPOINT=https://your-api-endpoint.azurewebsites.net
   REACT_APP_SIGNALR_ENDPOINT=https://your-signalr-service.service.signalr.net
   REACT_APP_INSIGHTS_KEY=your-app-insights-instrumentation-key
   REACT_APP_AAD_CLIENT_ID=your-aad-client-id
   ```

## Data Integration

### Data Sources

The Live Dashboard integrates with the following data sources:

1. **IncidentStatusBot API**
   - Incident CRUD operations
   - Status update endpoints
   - Timeline event log

2. **Azure Monitor**
   - Service metrics retrieval
   - Log Analytics queries
   - Alert status information

3. **Azure Service Health**
   - Azure service health status
   - Service health event correlation
   - Planned maintenance notifications

4. **Custom Monitoring Sources**
   - Third-party monitoring system integration
   - Custom application health checks
   - External service status APIs

### Integration Patterns

Implement the following integration patterns for data connectivity:

1. **REST API Integration**:
   ```typescript
   // Example REST API service for incident data
   export class IncidentService {
     private apiBaseUrl: string;
     
     constructor() {
       this.apiBaseUrl = process.env.REACT_APP_API_ENDPOINT || '';
     }
     
     async getActiveIncidents(): Promise<Incident[]> {
       const response = await fetch(`${this.apiBaseUrl}/api/incidents/active`, {
         headers: {
           'Authorization': `Bearer ${await this.getAuthToken()}`
         }
       });
       
       if (!response.ok) {
         throw new Error(`Failed to fetch active incidents: ${response.status}`);
       }
       
       return await response.json();
     }
     
     // Additional methods for other incident operations
   }
   ```

2. **SignalR Real-time Updates**:
   ```typescript
   // Example SignalR connection for real-time updates
   export class RealTimeService {
     private connection: HubConnection | null = null;
     
     async initialize(): Promise<void> {
       try {
         const token = await this.getAuthToken();
         
         this.connection = new HubConnectionBuilder()
           .withUrl(`${process.env.REACT_APP_SIGNALR_ENDPOINT}/incidentHub`, {
             accessTokenFactory: () => token
           })
           .withAutomaticReconnect()
           .build();
           
         this.connection.on('IncidentUpdated', (incident: Incident) => {
           // Handle incident update
           this.notifyListeners('incidentUpdated', incident);
         });
         
         await this.connection.start();
         console.log('SignalR connection established');
       } catch (error) {
         console.error('Failed to establish SignalR connection', error);
       }
     }
     
     // Additional methods for handling real-time events
   }
   ```

3. **Graph API Integration** (for Teams user context):
   ```typescript
   // Example Microsoft Graph API integration
   export class GraphService {
     private graphClient: Client;
     
     constructor(authProvider: AuthProvider) {
       this.graphClient = Client.initWithMiddleware({
         authProvider: authProvider
       });
     }
     
     async getCurrentUserProfile(): Promise<User> {
       try {
         return await this.graphClient.api('/me').get();
       } catch (error) {
         console.error('Error fetching user profile:', error);
         throw error;
       }
     }
     
     async getTeamMembers(teamId: string): Promise<User[]> {
       try {
         const response = await this.graphClient.api(`/teams/${teamId}/members`).get();
         return response.value;
       } catch (error) {
         console.error(`Error fetching team members for team ${teamId}:`, error);
         throw error;
       }
     }
   }
   ```

### Data Models

Define the following core data models for the dashboard:

1. **Incident Model**:
   ```typescript
   export interface Incident {
     id: string;
     title: string;
     description: string;
     severity: 'critical' | 'high' | 'medium' | 'low';
     status: 'new' | 'investigating' | 'mitigating' | 'resolved';
     affectedServices: string[];
     startTime: string;
     lastUpdateTime: string;
     resolutionTime?: string;
     owner?: string;
     assignedTeam?: string;
     impactedUsers?: number;
     updates: IncidentUpdate[];
   }
   
   export interface IncidentUpdate {
     id: string;
     incidentId: string;
     message: string;
     timestamp: string;
     author: string;
     status?: 'new' | 'investigating' | 'mitigating' | 'resolved';
   }
   ```

2. **Service Health Model**:
   ```typescript
   export interface ServiceHealth {
     id: string;
     name: string;
     status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
     lastChecked: string;
     metrics: ServiceMetric[];
     dependencies: ServiceDependency[];
     regions: ServiceRegion[];
   }
   
   export interface ServiceMetric {
     name: string;
     value: number;
     threshold: number;
     unit: string;
     status: 'good' | 'warning' | 'critical';
   }
   
   export interface ServiceDependency {
     name: string;
     status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
   }
   
   export interface ServiceRegion {
     name: string;
     status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
   }
   ```

3. **Alert Model**:
   ```typescript
   export interface Alert {
     id: string;
     title: string;
     description: string;
     severity: 'critical' | 'warning' | 'information';
     status: 'active' | 'acknowledged' | 'resolved';
     source: string;
     timestamp: string;
     relatedIncidentId?: string;
     affectedResource: string;
     actionable: boolean;
     actions?: AlertAction[];
   }
   
   export interface AlertAction {
     id: string;
     name: string;
     description: string;
     actionType: 'runbook' | 'webhook' | 'manual';
     actionLink?: string;
   }
   ```

## UI Components

### Dashboard Layout

The dashboard layout uses a responsive grid system with the following structure:

```
+-----------------------------------------------------+
| Header - Filter Bar, Time Range, Refresh Controls   |
+-------------+---------------------+-----------------+
| Incident    | Service Health      | Active Alerts   |
| Summary     | Status              | Panel           |
|             |                     |                 |
+-------------+---------------------+-----------------+
| Incident Timeline / Activity Stream                 |
+-----------------------------------------------------+
| Detailed View (Selected Incident/Service)           |
+-----------------------------------------------------+
| Action Panel / Response Tools                       |
+-----------------------------------------------------+
```

### Core Components

1. **IncidentSummaryWidget**:
   ```tsx
   import React, { useState, useEffect } from 'react';
   import { Card, Text, Spinner, Badge } from '@fluentui/react';
   import { IncidentService } from '../services/IncidentService';
   import { Incident } from '../models/Incident';
   
   export const IncidentSummaryWidget: React.FC = () => {
     const [incidents, setIncidents] = useState<Incident[]>([]);
     const [loading, setLoading] = useState<boolean>(true);
     const [error, setError] = useState<string | null>(null);
     
     useEffect(() => {
       const fetchIncidents = async () => {
         try {
           setLoading(true);
           const incidentService = new IncidentService();
           const activeIncidents = await incidentService.getActiveIncidents();
           setIncidents(activeIncidents);
           setError(null);
         } catch (err) {
           setError('Failed to load incidents');
           console.error(err);
         } finally {
           setLoading(false);
         }
       };
       
       fetchIncidents();
       
       // Set up polling or real-time updates
       const interval = setInterval(fetchIncidents, 60000);
       return () => clearInterval(interval);
     }, []);
     
     if (loading) {
       return <Spinner label="Loading incidents..." />;
     }
     
     if (error) {
       return <Text variant="large" style={{ color: 'red' }}>{error}</Text>;
     }
     
     const criticalCount = incidents.filter(i => i.severity === 'critical').length;
     const highCount = incidents.filter(i => i.severity === 'high').length;
     const mediumCount = incidents.filter(i => i.severity === 'medium').length;
     const lowCount = incidents.filter(i => i.severity === 'low').length;
     
     return (
       <Card>
         <Text variant="large">Incident Summary</Text>
         <div className="incident-counts">
           <div className="count-item">
             <Badge variant="filled" color="severe">{criticalCount}</Badge>
             <Text>Critical</Text>
           </div>
           <div className="count-item">
             <Badge variant="filled" color="warning">{highCount}</Badge>
             <Text>High</Text>
           </div>
           <div className="count-item">
             <Badge variant="filled" color="moderate">{mediumCount}</Badge>
             <Text>Medium</Text>
           </div>
           <div className="count-item">
             <Badge variant="filled" color="info">{lowCount}</Badge>
             <Text>Low</Text>
           </div>
         </div>
         
         <Text variant="medium">Total Active: {incidents.length}</Text>
         
         {/* Additional summary information can be displayed here */}
       </Card>
     );
   };
   ```

2. **ServiceHealthWidget**:
   ```tsx
   import React, { useState, useEffect } from 'react';
   import { Card, Text, Spinner } from '@fluentui/react';
   import { ServiceHealthService } from '../services/ServiceHealthService';
   import { ServiceHealth } from '../models/ServiceHealth';
   
   export const ServiceHealthWidget: React.FC = () => {
     const [services, setServices] = useState<ServiceHealth[]>([]);
     const [loading, setLoading] = useState<boolean>(true);
     const [error, setError] = useState<string | null>(null);
     
     useEffect(() => {
       const fetchServiceHealth = async () => {
         try {
           setLoading(true);
           const serviceHealthService = new ServiceHealthService();
           const healthData = await serviceHealthService.getServiceHealthStatus();
           setServices(healthData);
           setError(null);
         } catch (err) {
           setError('Failed to load service health data');
           console.error(err);
         } finally {
           setLoading(false);
         }
       };
       
       fetchServiceHealth();
       
       // Set up polling or real-time updates
       const interval = setInterval(fetchServiceHealth, 60000);
       return () => clearInterval(interval);
     }, []);
     
     if (loading) {
       return <Spinner label="Loading service health..." />;
     }
     
     if (error) {
       return <Text variant="large" style={{ color: 'red' }}>{error}</Text>;
     }
     
     return (
       <Card>
         <Text variant="large">Service Health</Text>
         <div className="service-health-grid">
           {services.map(service => (
             <div key={service.id} className="service-health-item">
               <div className={`status-indicator ${service.status}`}></div>
               <Text>{service.name}</Text>
               <Text variant="small">{service.status}</Text>
               {service.regions.length > 0 && (
                 <div className="region-indicators">
                   {service.regions.map(region => (
                     <div key={region.name} className={`region-indicator ${region.status}`} title={`${region.name}: ${region.status}`}></div>
                   ))}
                 </div>
               )}
             </div>
           ))}
         </div>
       </Card>
     );
   };
   ```

3. **IncidentTimelineWidget**:
   ```tsx
   import React, { useState, useEffect } from 'react';
   import { Card, Text, Spinner, Timeline, TimelineItem } from '@fluentui/react';
   import { IncidentService } from '../services/IncidentService';
   import { IncidentUpdate } from '../models/Incident';
   
   export const IncidentTimelineWidget: React.FC<{ incidentId: string }> = ({ incidentId }) => {
     const [updates, setUpdates] = useState<IncidentUpdate[]>([]);
     const [loading, setLoading] = useState<boolean>(true);
     const [error, setError] = useState<string | null>(null);
     
     useEffect(() => {
       const fetchUpdates = async () => {
         try {
           setLoading(true);
           const incidentService = new IncidentService();
           const timelineData = await incidentService.getIncidentTimeline(incidentId);
           setUpdates(timelineData);
           setError(null);
         } catch (err) {
           setError('Failed to load incident timeline');
           console.error(err);
         } finally {
           setLoading(false);
         }
       };
       
       fetchUpdates();
       
       // Set up real-time updates
       const realTimeService = getRealTimeService();
       const subscription = realTimeService.subscribe('incidentUpdated', (incident) => {
         if (incident.id === incidentId) {
           fetchUpdates();
         }
       });
       
       return () => subscription.unsubscribe();
     }, [incidentId]);
     
     if (loading) {
       return <Spinner label="Loading timeline..." />;
     }
     
     if (error) {
       return <Text variant="large" style={{ color: 'red' }}>{error}</Text>;
     }
     
     return (
       <Card>
         <Text variant="large">Incident Timeline</Text>
         <Timeline>
           {updates.map(update => (
             <TimelineItem
               key={update.id}
               timestamp={new Date(update.timestamp)}
               title={update.status ? `Status changed to: ${update.status}` : 'Update'}
               description={update.message}
               itemDetails={`Updated by: ${update.author}`}
             />
           ))}
         </Timeline>
       </Card>
     );
   };
   ```

### Widget Configuration

Implement a widget configuration system that allows users to customize their dashboard:

```typescript
// Widget configuration model
export interface WidgetConfig {
  id: string;
  type: 'incidentSummary' | 'serviceHealth' | 'incidentTimeline' | 'alertPanel' | 'metricChart';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: {
    [key: string]: any;
  };
  refreshInterval?: number;
}

// Default configuration
export const defaultWidgetConfig: WidgetConfig[] = [
  {
    id: 'incident-summary',
    type: 'incidentSummary',
    title: 'Incident Overview',
    position: { x: 0, y: 0, width: 1, height: 1 },
    settings: {
      showResolvedIncidents: false,
      groupBySeverity: true
    },
    refreshInterval: 60
  },
  {
    id: 'service-health',
    type: 'serviceHealth',
    title: 'Service Health Status',
    position: { x: 1, y: 0, width: 1, height: 1 },
    settings: {
      showDependencies: true,
      showRegions: true
    },
    refreshInterval: 60
  },
  // Additional default widgets...
];

// WidgetRegistry for mapping widget types to components
export const WidgetRegistry = {
  'incidentSummary': IncidentSummaryWidget,
  'serviceHealth': ServiceHealthWidget,
  'incidentTimeline': IncidentTimelineWidget,
  'alertPanel': AlertPanelWidget,
  'metricChart': MetricChartWidget
};
```

## Authentication and Authorization

### Microsoft Teams SSO

Implement Single Sign-On (SSO) with Microsoft Teams:

```typescript
// Authentication service for Teams SSO
export class TeamsAuthService {
  private tokenRequestInProgress: boolean = false;
  private cachedToken: string | null = null;
  private tokenExpiration: number = 0;
  
  async initialize(): Promise<void> {
    try {
      // Initialize Teams SDK
      await microsoftTeams.initialize();
    } catch (error) {
      console.error('Failed to initialize Microsoft Teams SDK', error);
      throw error;
    }
  }
  
  async getAuthToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && Date.now() < this.tokenExpiration) {
      return this.cachedToken;
    }
    
    // Prevent multiple token requests
    if (this.tokenRequestInProgress) {
      return new Promise<string>((resolve, reject) => {
        const checkToken = setInterval(() => {
          if (!this.tokenRequestInProgress) {
            clearInterval(checkToken);
            if (this.cachedToken) {
              resolve(this.cachedToken);
            } else {
              reject(new Error('Failed to acquire token'));
            }
          }
        }, 100);
      });
    }
    
    this.tokenRequestInProgress = true;
    
    try {
      return new Promise<string>((resolve, reject) => {
        microsoftTeams.authentication.getAuthToken({
          successCallback: (token: string) => {
            this.cachedToken = token;
            this.tokenExpiration = Date.now() + (3600 * 1000); // 1 hour expiration
            this.tokenRequestInProgress = false;
            resolve(token);
          },
          failureCallback: (error: string) => {
            this.tokenRequestInProgress = false;
            reject(new Error(`Failed to get auth token: ${error}`));
          }
        });
      });
    } catch (error) {
      this.tokenRequestInProgress = false;
      throw error;
    }
  }
  
  async getUserInfo(): Promise<any> {
    try {
      const token = await this.getAuthToken();
      // Parse the JWT token to get user info (or call Graph API)
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: tokenPayload.oid || tokenPayload.sub,
        name: tokenPayload.name,
        email: tokenPayload.preferred_username || tokenPayload.email
      };
    } catch (error) {
      console.error('Failed to get user info', error);
      throw error;
    }
  }
}
```

### Role-Based Access Control

Implement RBAC to control dashboard access and features:

```typescript
// Role definitions
export enum UserRole {
  Viewer = 'viewer',
  Responder = 'responder',
  Administrator = 'administrator'
}

// Permission definitions
export enum Permission {
  ViewIncidents = 'view:incidents',
  CreateIncidents = 'create:incidents',
  UpdateIncidents = 'update:incidents',
  CloseIncidents = 'close:incidents',
  ConfigureDashboard = 'configure:dashboard',
  ManageSettings = 'manage:settings',
  ViewReports = 'view:reports'
}

// Role to permission mapping
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.Viewer]: [
    Permission.ViewIncidents,
    Permission.ViewReports
  ],
  [UserRole.Responder]: [
    Permission.ViewIncidents,
    Permission.UpdateIncidents,
    Permission.ViewReports
  ],
  [UserRole.Administrator]: [
    Permission.ViewIncidents,
    Permission.CreateIncidents,
    Permission.UpdateIncidents,
    Permission.CloseIncidents,
    Permission.ConfigureDashboard,
    Permission.ManageSettings,
    Permission.ViewReports
  ]
};

// Permission check hook
export function usePermission(permission: Permission): boolean {
  const { user } = useCurrentUser();
  
  if (!user || !user.roles) {
    return false;
  }
  
  return user.roles.some(role => {
    const permissions = RolePermissions[role];
    return permissions && permissions.includes(permission);
  });
}
```

## Performance Optimization

### React Component Optimization

Optimize React components for the dashboard:

1. **Memoization**:
   ```typescript
   import React, { useMemo } from 'react';
   
   export const IncidentList: React.FC<{ incidents: Incident[] }> = React.memo(({ incidents }) => {
     const sortedIncidents = useMemo(() => {
       return [...incidents].sort((a, b) => {
         // Sort by severity first, then by start time
         if (a.severity !== b.severity) {
           const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
           return severityOrder[a.severity] - severityOrder[b.severity];
         }
         return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
       });
     }, [incidents]);
     
     return (
       <div className="incident-list">
         {sortedIncidents.map(incident => (
           <IncidentCard key={incident.id} incident={incident} />
         ))}
       </div>
     );
   });
   ```

2. **Virtualized Lists**:
   ```typescript
   import { List } from 'react-virtualized';
   
   export const VirtualizedIncidentList: React.FC<{ incidents: Incident[] }> = ({ incidents }) => {
     const rowRenderer = ({ index, key, style }) => {
       const incident = incidents[index];
       return (
         <div key={key} style={style}>
           <IncidentCard incident={incident} />
         </div>
       );
     };
     
     return (
       <List
         width={800}
         height={600}
         rowCount={incidents.length}
         rowHeight={120}
         rowRenderer={rowRenderer}
       />
     );
   };
   ```

### Data Loading Strategies

Implement efficient data loading strategies:

1. **Pagination**:
   ```typescript
   async getIncidents(page: number, pageSize: number): Promise<{ incidents: Incident[], totalCount: number }> {
     const response = await fetch(`${this.apiBaseUrl}/api/incidents?page=${page}&pageSize=${pageSize}`);
     if (!response.ok) {
       throw new Error(`Failed to fetch incidents: ${response.status}`);
     }
     return await response.json();
   }
   ```

2. **Data Caching**:
   ```typescript
   import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
   
   interface CacheEntry<T> {
     data: T;
     timestamp: number;
     expiresAt: number;
   }
   
   interface Cache {
     [key: string]: CacheEntry<any>;
   }
   
   interface DataCacheContextValue {
     getData: <T>(key: string, fetchFunc: () => Promise<T>, ttlSeconds?: number) => Promise<T>;
     invalidateCache: (key: string) => void;
     clearCache: () => void;
   }
   
   const DataCacheContext = createContext<DataCacheContextValue | null>(null);
   
   export const DataCacheProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
     const [cache, setCache] = useState<Cache>({});
     
     const getData = async <T,>(key: string, fetchFunc: () => Promise<T>, ttlSeconds = 300): Promise<T> => {
       const now = Date.now();
       const cacheEntry = cache[key];
       
       // Return cached data if it exists and hasn't expired
       if (cacheEntry && cacheEntry.expiresAt > now) {
         return cacheEntry.data;
       }
       
       // Fetch new data
       const data = await fetchFunc();
       
       // Update cache
       setCache(prevCache => ({
         ...prevCache,
         [key]: {
           data,
           timestamp: now,
           expiresAt: now + (ttlSeconds * 1000)
         }
       }));
       
       return data;
     };
     
     const invalidateCache = (key: string) => {
       setCache(prevCache => {
         const newCache = { ...prevCache };
         delete newCache[key];
         return newCache;
       });
     };
     
     const clearCache = () => {
       setCache({});
     };
     
     useEffect(() => {
       // Clean up expired cache entries periodically
       const cleanup = setInterval(() => {
         const now = Date.now();
         setCache(prevCache => {
           const newCache = { ...prevCache };
           Object.keys(newCache).forEach(key => {
             if (newCache[key].expiresAt <= now) {
               delete newCache[key];
             }
           });
           return newCache;
         });
       }, 60000); // Run every minute
       
       return () => clearInterval(cleanup);
     }, []);
     
     return (
       <DataCacheContext.Provider value={{ getData, invalidateCache, clearCache }}>
         {children}
       </DataCacheContext.Provider>
     );
   };
   
   export const useDataCache = () => {
     const context = useContext(DataCacheContext);
     if (!context) {
       throw new Error('useDataCache must be used within a DataCacheProvider');
     }
     return context;
   };
   ```

3. **Real-time Data Optimization**:
   ```typescript
   export class OptimizedRealTimeService {
     private connection: HubConnection | null = null;
     private listeners: Map<string, Set<(data: any) => void>> = new Map();
     private batchedUpdates: Map<string, any[]> = new Map();
     private batchUpdateInterval: number = 1000; // 1 second
     
     constructor() {
       // Set up batched update processing
       setInterval(() => this.processBatchedUpdates(), this.batchUpdateInterval);
     }
     
     async initialize(): Promise<void> {
       // SignalR initialization code as before
       
       // Set up message handlers to batch updates
       this.connection?.on('IncidentUpdated', (incident: Incident) => {
         this.addToBatch('incidentUpdated', incident);
       });
       
       this.connection?.on('ServiceHealthChanged', (service: ServiceHealth) => {
         this.addToBatch('serviceHealthChanged', service);
       });
     }
     
     private addToBatch(eventType: string, data: any): void {
       if (!this.batchedUpdates.has(eventType)) {
         this.batchedUpdates.set(eventType, []);
       }
       
       this.batchedUpdates.get(eventType)?.push(data);
     }
     
     private processBatchedUpdates(): void {
       for (const [eventType, updates] of this.batchedUpdates.entries()) {
         if (updates.length > 0) {
           this.notifyListeners(eventType, updates);
           this.batchedUpdates.set(eventType, []);
         }
       }
     }
     
     private notifyListeners(eventType: string, data: any[]): void {
       const eventListeners = this.listeners.get(eventType);
       if (eventListeners) {
         for (const listener of eventListeners) {
           listener(data);
         }
       }
     }
     
     subscribe(eventType: string, callback: (data: any) => void): { unsubscribe: () => void } {
       if (!this.listeners.has(eventType)) {
         this.listeners.set(eventType, new Set());
       }
       
       this.listeners.get(eventType)?.add(callback);
       
       return {
         unsubscribe: () => {
           const eventListeners = this.listeners.get(eventType);
           if (eventListeners) {
             eventListeners.delete(callback);
           }
         }
       };
     }
   }
   ```

## Theming and Accessibility

### Teams Theme Support

Implement Teams theme support for the dashboard:

```typescript
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeProvider as FluentThemeProvider, Theme, teamsLightTheme, teamsDarkTheme, teamsHighContrastTheme } from '@fluentui/react';

type TeamsTheme = 'default' | 'dark' | 'contrast';

interface ThemeContextValue {
  currentTheme: TeamsTheme;
  fluentTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: 'default',
  fluentTheme: teamsLightTheme
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<TeamsTheme>('default');
  
  useEffect(() => {
    microsoftTeams.initialize();
    
    // Get the Teams theme
    microsoftTeams.getContext(context => {
      if (context.theme) {
        setCurrentTheme(context.theme as TeamsTheme);
      }
    });
    
    // Listen for theme changes
    microsoftTeams.registerOnThemeChangeHandler(theme => {
      setCurrentTheme(theme as TeamsTheme);
    });
  }, []);
  
  // Map Teams theme to Fluent UI theme
  const fluentTheme = React.useMemo(() => {
    switch (currentTheme) {
      case 'dark':
        return teamsDarkTheme;
      case 'contrast':
        return teamsHighContrastTheme;
      case 'default':
      default:
        return teamsLightTheme;
    }
  }, [currentTheme]);
  
  return (
    <ThemeContext.Provider value={{ currentTheme, fluentTheme }}>
      <FluentThemeProvider theme={fluentTheme}>
        {children}
      </FluentThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTeamsTheme = () => useContext(ThemeContext);
```

### Accessibility Implementation

Ensure the dashboard meets accessibility standards:

1. **ARIA Attributes**:
   ```tsx
   <div role="region" aria-label="Incident Summary">
     <h2 id="summary-heading">Incident Summary</h2>
     <div role="list" aria-labelledby="summary-heading">
       <div role="listitem">
         <span aria-label="Critical incidents" role="status">{criticalCount}</span>
         <span>Critical</span>
       </div>
       {/* Additional list items */}
     </div>
   </div>
   ```

2. **Keyboard Navigation**:
   ```tsx
   const IncidentCard: React.FC<{ incident: Incident }> = ({ incident }) => {
     const handleKeyDown = (event: React.KeyboardEvent) => {
       if (event.key === 'Enter' || event.key === ' ') {
         // Handle selection/activation
         onSelectIncident(incident);
         event.preventDefault();
       }
     };
     
     return (
       <div 
         className="incident-card" 
         tabIndex={0} 
         role="button"
         aria-pressed="false"
         onKeyDown={handleKeyDown}
         onClick={() => onSelectIncident(incident)}
       >
         {/* Card content */}
       </div>
     );
   };
   ```

3. **Color Contrast**:
   ```css
   /* Ensure all colors meet WCAG 2.1 AA contrast requirements */
   :root {
     --color-critical: #d13438; /* Passes contrast on light background */
     --color-critical-text: #ffffff; /* For text on critical background */
     --color-high: #ff8c00; /* Passes contrast on light background */
     --color-high-text: #000000; /* For text on high background */
     --color-medium: #ffd700; /* Passes contrast on light background */
     --color-medium-text: #000000; /* For text on medium background */
     --color-low: #107c10; /* Passes contrast on light background */
     --color-low-text: #ffffff; /* For text on low background */
   }
   
   /* High contrast theme overrides */
   @media (forced-colors: active) {
     :root {
       --color-critical: CanvasText;
       --color-critical-text: Canvas;
       --color-high: CanvasText;
       --color-high-text: Canvas;
       --color-medium: CanvasText;
       --color-medium-text: Canvas;
       --color-low: CanvasText;
       --color-low-text: Canvas;
     }
     
     .incident-card {
       border: 1px solid CanvasText;
     }
   }
   ```

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - **Symptom**: Users unable to access the dashboard or seeing 401/403 errors
   - **Possible Causes**:
     - Incorrect App ID or secret
     - Missing Teams SSO configuration
     - Azure AD permissions not consented
   - **Resolution Steps**:
     - Verify App ID matches between Teams app manifest and Azure AD registration
     - Check Azure AD app registration has proper redirect URIs
     - Ensure proper API permissions are granted and admin consent provided

2. **Real-time Updates Not Working**:
   - **Symptom**: Dashboard does not update in real-time without manual refresh
   - **Possible Causes**:
     - SignalR connection failures
     - Networking issues between client and SignalR service
     - CORS configuration issues
   - **Resolution Steps**:
     - Check browser console for connection errors
     - Verify SignalR service connection string
     - Ensure proper CORS headers are configured
     - Test connection with SignalR echo test

3. **Dashboard Performance Issues**:
   - **Symptom**: Dashboard is slow to load or update
   - **Possible Causes**:
     - Too many simultaneous API requests
     - Large data volumes without pagination
     - Inefficient React component rendering
   - **Resolution Steps**:
     - Implement data caching and pagination
     - Use React.memo for components that don't need frequent re-renders
     - Optimize API calls with batching
     - Enable component-level performance profiling

### Debugging Techniques

1. **Teams Developer Portal Debugging**:
   ```
   1. Open the Teams Developer Portal (https://dev.teams.microsoft.com/)
   2. Navigate to 'Apps' and find your registered app
   3. Check the app configuration for errors
   4. Use the validation tools to check manifest
   5. Test the app in the Teams client with Developer Mode enabled
   ```

2. **Browser DevTools Debugging**:
   ```
   1. Open browser DevTools (F12)
   2. Check Console for error messages
   3. Network tab: Verify API calls are succeeding
   4. Application tab: Inspect local storage and cache
   5. React DevTools: Inspect component hierarchy and props
   ```

3. **Backend Logs Analysis**:
   ```
   1. Check Azure Function Logs in Application Insights
   2. Use Log Analytics to query for error patterns
   3. Monitor SignalR Service diagnostic logs
   4. Check Azure App Service log stream for real-time debugging
   ```

## Examples and Templates

### Dashboard Configuration Example

```json
{
  "version": "1.0",
  "settings": {
    "refreshInterval": 60,
    "theme": "auto",
    "dataSources": {
      "incidentApi": {
        "url": "https://your-api-endpoint.azurewebsites.net/api",
        "cacheTimeoutMinutes": 5
      },
      "serviceHealthApi": {
        "url": "https://your-service-health-api.azurewebsites.net/api",
        "cacheTimeoutMinutes": 5
      }
    }
  },
  "layout": {
    "type": "grid",
    "columns": 3,
    "widgets": [
      {
        "id": "incident-summary",
        "type": "incidentSummary",
        "position": { "x": 0, "y": 0, "w": 1, "h": 1 },
        "settings": {
          "showResolvedIncidents": false,
          "groupBySeverity": true
        }
      },
      {
        "id": "service-health",
        "type": "serviceHealth",
        "position": { "x": 1, "y": 0, "w": 2, "h": 1 },
        "settings": {
          "showDependencies": true,
          "showRegions": true
        }
      },
      {
        "id": "incident-timeline",
        "type": "incidentTimeline",
        "position": { "x": 0, "y": 1, "w": 3, "h": 1 },
        "settings": {
          "maxItems": 20,
          "showFilterControls": true
        }
      },
      {
        "id": "metrics-chart",
        "type": "metricChart",
        "position": { "x": 0, "y": 2, "w": 2, "h": 1 },
        "settings": {
          "metrics": ["cpu", "memory", "disk", "network"],
          "timeRange": "1h",
          "chartType": "line"
        }
      },
      {
        "id": "action-panel",
        "type": "actionPanel",
        "position": { "x": 2, "y": 2, "w": 1, "h": 1 },
        "settings": {
          "showRunbooks": true,
          "showEscalation": true
        }
      }
    ]
  }
}
```

### Dashboard Template Structure

```
/src
  /components
    /widgets
      IncidentSummaryWidget.tsx
      ServiceHealthWidget.tsx
      IncidentTimelineWidget.tsx
      MetricChartWidget.tsx
      ActionPanelWidget.tsx
    /common
      Header.tsx
      FilterBar.tsx
      WidgetWrapper.tsx
      ErrorBoundary.tsx
  /services
    IncidentService.ts
    ServiceHealthService.ts
    RealTimeService.ts
    TeamsAuthService.ts
  /models
    Incident.ts
    ServiceHealth.ts
    Alert.ts
    Widget.ts
  /hooks
    useDataCache.ts
    useRealTimeData.ts
    useTeamsContext.ts
    usePermission.ts
  /utils
    dateUtils.ts
    formatters.ts
    colorUtils.ts
  /context
    ThemeContext.tsx
    AuthContext.tsx
    DashboardContext.tsx
  /config
    widgetRegistry.ts
    defaultConfig.ts
  Dashboard.tsx
  index.tsx
```

## Additional Resources

### Microsoft Teams Development Resources

- [Microsoft Teams Platform Documentation](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- [Teams JavaScript SDK](https://learn.microsoft.com/en-us/javascript/api/overview/msteams-client)
- [Teams Toolkit for Visual Studio Code](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/teams-toolkit-fundamentals)
- [Fluent UI React Components](https://developer.microsoft.com/en-us/fluentui#/controls/web)

### Monitoring Integration Resources

- [Azure Monitor REST API Reference](https://learn.microsoft.com/en-us/rest/api/monitor/)
- [Azure Service Health API](https://learn.microsoft.com/en-us/rest/api/resourcehealth/)
- [SignalR Service Documentation](https://learn.microsoft.com/en-us/azure/azure-signalr/)
- [Graph API for Teams Integration](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview)

### Best Practices and Patterns

- [React Performance Optimization Techniques](https://reactjs.org/docs/optimizing-performance.html)
- [Microsoft Teams App Design Guidelines](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/design/design-teams-app-overview)
- [Responsive Design for Teams Tabs](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/design/tabs-mobile)
- [Accessibility Guidelines for Microsoft Teams Apps](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/design/design-teams-app-accessibility)
