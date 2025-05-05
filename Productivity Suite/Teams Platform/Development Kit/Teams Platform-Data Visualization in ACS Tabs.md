# Data Visualization in ACS Tabs

## Overview

This document provides comprehensive guidance on implementing data visualization capabilities within Microsoft Teams tabs using the Azure Communication Services (ACS) Development Kit. Data visualization is essential for presenting complex information in an accessible, actionable format, enabling better decision-making and enhanced collaboration within Teams.

## Table of Contents

- [Core Concepts](#core-concepts)
- [Supported Visualization Libraries](#supported-visualization-libraries)
- [Implementation Patterns](#implementation-patterns)
- [Authentication and Data Security](#authentication-and-data-security)
- [Performance Optimization](#performance-optimization)
- [Accessibility Considerations](#accessibility-considerations)
- [Real-time Data Visualization](#real-time-data-visualization)
- [Sample Implementations](#sample-implementations)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [References and Resources](#references-and-resources)

## Core Concepts

### ACS Tab Architecture

The Azure Communication Services (ACS) Tab framework provides a robust platform for embedding interactive visualizations within the Microsoft Teams environment. ACS Tabs leverage the Microsoft Teams JavaScript SDK and can be integrated with various data visualization libraries.

Key components include:

- **Tab Configuration Page**: Sets up data sources, authentication, and visualization preferences
- **Content Page**: Renders the visualization within the Teams interface
- **Settings Framework**: Manages user preferences for visualizations
- **Context Handlers**: Processes and adapts to Teams context changes (theme, locale, etc.)

### Data Visualization Principles in Teams Context

When designing visualizations for Teams tabs, consider these foundational principles:

1. **Context-Awareness**: Visualizations should respond to Teams themes (light/dark) and screen sizes
2. **Collaboration-Focus**: Enable shared views, annotations, and discussion around data points
3. **Performance Efficiency**: Optimize for Teams client limitations across devices
4. **Consistent Experience**: Maintain visual consistency with Teams design language

## Supported Visualization Libraries

ACS Tabs support multiple visualization libraries, each with specific strengths:

### Microsoft Power BI Embedding

```javascript
// Basic Power BI embedding in ACS Tab
import { PowerBIEmbed } from 'powerbi-client-react';

const ACSTabPowerBIVisualization = () => {
  const reportConfig = {
    type: 'report',
    id: '<report-id>',
    embedUrl: '<embed-url>',
    accessToken: '<access-token>',
    settings: {
      navContentPaneEnabled: false,
      filterPaneEnabled: false
    }
  };
  
  return (
    <div className="powerbi-visualization-container">
      <PowerBIEmbed 
        embedConfig={reportConfig}
        cssClassName="powerbi-report"
      />
    </div>
  );
};
```

**Key Considerations**:
- Requires Power BI license for content creation
- Best for enterprise analytics and dashboard scenarios
- Supports data refresh policies aligned with Teams usage patterns
- Provides robust filtering and interaction capabilities

### Chart.js

Lightweight and responsive charting library with excellent Teams integration:

```javascript
// Sample Chart.js implementation in ACS Tab
import { Chart } from 'chart.js/auto';
import { useTeamsContext } from '@microsoft/teamsfx-react';

const ACSTabChartVisualization = () => {
  const { theme } = useTeamsContext();
  const chartRef = useRef(null);
  
  useEffect(() => {
    if (chartRef.current) {
      const chart = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
          datasets: [{
            label: '# of Votes',
            data: [12, 19, 3, 5, 2, 3],
            backgroundColor: theme === 'dark' 
              ? ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)']
              : ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      
      return () => chart.destroy();
    }
  }, [theme]);
  
  return (
    <div className="chart-container">
      <canvas ref={chartRef} />
    </div>
  );
};
```

**Key Considerations**:
- Highly customizable and lightweight
- Easy Teams theme integration
- Better for simpler visualization needs
- Requires manual accessibility enhancements

### D3.js

The most flexible and powerful visualization library, ideal for custom interactive visualizations:

```javascript
// D3.js implementation example
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { useTeamsContext } from '@microsoft/teamsfx-react';

const ACSD3Visualization = () => {
  const svgRef = useRef(null);
  const { theme, context } = useTeamsContext();
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create visualization with Teams theme awareness
    const svg = d3.select(svgRef.current);
    const width = context.frameContext === 'content' ? 700 : 350;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    
    // Set up scales, axes, and data binding here
    // Example: Theme-aware visualization code
    
  }, [theme, context]);
  
  return (
    <div className="d3-visualization-container">
      <svg ref={svgRef} width="100%" height="300"></svg>
    </div>
  );
};
```

**Key Considerations**:
- Maximum flexibility for custom visualizations
- Higher learning curve
- Excellent for complex, interactive data presentations
- Requires careful performance optimization for Teams

### Additional Supported Libraries

- **Recharts**: React-based charting library with simple Teams integration
- **Highcharts**: Feature-rich interactive charts with good accessibility
- **Microsoft Fluent UI Visualization Components**: Native Teams visual language

## Implementation Patterns

### Tab Configuration Flow

To properly configure data visualization in an ACS Tab:

1. **Authentication Setup**:
   - Configure SSO or explicit authentication during tab configuration
   - Store tokens securely using Teams secure storage mechanisms

2. **Data Source Configuration**:
   - Allow selection of data sources and connection parameters
   - Test connections during configuration
   - Set up refresh policies appropriate for visualization type

3. **Visualization Selection**:
   - Present visualization type options with previews
   - Configure default views and interactions
   - Set up mobile/desktop responsive behaviors

### React Components Pattern

```javascript
// Visualization wrapper component pattern
import React, { useState, useEffect, useContext } from 'react';
import { useTeams } from '@microsoft/teamsfx-react';
import { Spinner, ThemeContext } from '@fluentui/react';

const ACSDataVisualization = ({ dataSource, visualizationType, permissions }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { theme, context } = useTeams();
  const themeContext = useContext(ThemeContext);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch data from configured source
        const result = await fetchDataFromSource(dataSource, context);
        setData(result);
        setError(null);
      } catch (err) {
        setError(`Failed to load visualization data: ${err.message}`);
        console.error('Visualization data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dataSource, context]);
  
  if (loading) {
    return <Spinner label="Loading visualization..." />;
  }
  
  if (error) {
    return <ErrorDisplay message={error} />;
  }
  
  // Render the appropriate visualization based on type
  return (
    <div className="acs-visualization" role="region" aria-label="Data Visualization">
      {renderVisualization(visualizationType, data, theme, permissions)}
    </div>
  );
};
```

### Responsive Adaptations

Visualizations must adapt to the Teams context:

```javascript
// Responsive handling example
const getResponsiveConfig = (frameContext, theme, windowWidth) => {
  // Base configuration
  const config = {
    showLegend: true,
    aspectRatio: 16/9,
    fontSize: 12,
    colorScheme: theme === 'dark' ? darkColorPalette : lightColorPalette
  };
  
  // Adapt for sidebar
  if (frameContext === 'sidePanel') {
    config.showLegend = false;
    config.fontSize = 10;
    config.aspectRatio = 4/3;
  }
  
  // Adapt for mobile
  if (windowWidth < 480) {
    config.showLegend = false;
    config.fontSize = 10;
    config.simplifyAxes = true;
  }
  
  return config;
};
```

## Authentication and Data Security

Secure visualization data access using these patterns:

### SSO Integration

```javascript
// SSO authentication for data sources
import { TeamsUserCredential } from "@microsoft/teamsfx";

const getVisualizationData = async () => {
  try {
    // Initialize the TeamsUserCredential
    const credential = new TeamsUserCredential({
      clientId: process.env.CLIENT_ID,
      initiateLoginEndpoint: process.env.INITIATE_LOGIN_ENDPOINT,
    });
    
    // Get access token for the target resource
    const accessToken = await credential.getToken(["https://graph.microsoft.com/.default"]);
    
    // Use the token to fetch data
    const response = await fetch("https://data-api-endpoint/visualization-data", {
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error("Failed to get visualization data:", error);
    throw error;
  }
};
```

### Data Handling Security Best Practices

When managing visualization data in ACS Tabs:

1. **Minimize Data Transfer**: Only transmit data points needed for visualization
2. **Apply Data Filtering Server-Side**: Limit data based on user permissions
3. **Implement Data Expiry**: Set cache control policies for sensitive visualizations
4. **Enable Audit Logging**: Track visualization access and interactions
5. **Use Teams Storage Securely**: For visualization preferences and states

```javascript
// Example of secure data minimization
const prepareSecureDataset = (rawData, userPermissions) => {
  // Filter data based on permissions
  const permissionFilter = createPermissionFilter(userPermissions);
  const filteredData = rawData.filter(permissionFilter);
  
  // Minimize dataset to required fields only
  return filteredData.map(item => ({
    id: item.id,
    label: item.label,
    value: item.value,
    // Only include category if user has category access
    ...(userPermissions.includes('viewCategories') && { category: item.category })
  }));
};
```

## Performance Optimization

Optimize visualization performance in Teams with these techniques:

### Lazy Loading and Progressive Enhancement

```javascript
// Lazy loading visualization components
import React, { Suspense, lazy } from 'react';

// Lazy-load heavy visualization components
const PowerBIVisualization = lazy(() => import('./PowerBIVisualization'));
const D3ComplexVisualization = lazy(() => import('./D3ComplexVisualization'));
const SimpleBarChart = lazy(() => import('./SimpleBarChart'));

function ACSTabVisualization({ visualizationType, data }) {
  const renderVisualization = () => {
    switch (visualizationType) {
      case 'powerbi':
        return <PowerBIVisualization data={data} />;
      case 'd3complex':
        return <D3ComplexVisualization data={data} />;
      case 'barchart':
      default:
        return <SimpleBarChart data={data} />;
    }
  };

  return (
    <div className="visualization-container">
      <Suspense fallback={<div>Loading visualization...</div>}>
        {renderVisualization()}
      </Suspense>
    </div>
  );
}
```

### Data Virtualization and Pagination

For large datasets, implement data virtualization:

```javascript
// Data virtualization example
import { ListView } from '@fluentui/react';

const VirtualizedDataVisualization = ({ data }) => {
  // Only render visible items
  const onRenderCell = (item) => {
    return (
      <div className="data-point">
        <span className="label">{item.label}</span>
        <span className="value">{item.value}</span>
      </div>
    );
  };
  
  return (
    <ListView
      items={data}
      onRenderCell={onRenderCell}
      getPageSpecification={(itemIndex, visibleRect) => {
        return {
          key: itemIndex,
          itemCount: 10
        };
      }}
    />
  );
};
```

### Caching Strategies

Implement proper caching for visualization data:

```javascript
// Caching implementation example
import { useTeamsFx } from "@microsoft/teamsfx-react";
import { createContext, useContext, useEffect, useState } from "react";

// Create a cache context
const VisualizationCacheContext = createContext();

// Cache provider
export const VisualizationCacheProvider = ({ children, ttl = 300000 }) => {
  const [cache, setCache] = useState({});
  
  const getCachedData = async (key, fetchFunction) => {
    const now = Date.now();
    
    // Check if cached data exists and is still valid
    if (cache[key] && cache[key].expiry > now) {
      return cache[key].data;
    }
    
    // Fetch fresh data
    const data = await fetchFunction();
    
    // Update cache
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        expiry: now + ttl
      }
    }));
    
    return data;
  };
  
  // Clear expired cache entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          if (newCache[key].expiry < now) {
            delete newCache[key];
          }
        });
        return newCache;
      });
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <VisualizationCacheContext.Provider value={{ getCachedData }}>
      {children}
    </VisualizationCacheContext.Provider>
  );
};

// Hook to use the cache
export const useVisualizationCache = () => useContext(VisualizationCacheContext);
```

## Accessibility Considerations

Ensure visualizations are accessible to all users:

### WCAG Compliance for Visualizations

Implement these accessibility features:

1. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
2. **Screen Reader Support**: Provide appropriate ARIA labels and roles
3. **High Contrast Modes**: Test visualizations in high contrast themes
4. **Text Alternatives**: Provide tabular data alternatives to visual charts
5. **Color Independence**: Never rely solely on color to convey information

```javascript
// Accessible chart implementation
const AccessibleChart = ({ data, title, description }) => {
  return (
    <div 
      role="region" 
      aria-label={title}
      className="chart-container"
    >
      <h3 id="chart-title">{title}</h3>
      <p id="chart-desc" className="sr-only">{description}</p>
      
      {/* Visual chart with accessibility */}
      <div 
        aria-labelledby="chart-title" 
        aria-describedby="chart-desc"
        tabIndex="0"
      >
        <ChartComponent data={data} />
      </div>
      
      {/* Alternative table representation */}
      <details>
        <summary>View data table</summary>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <th scope="row">{item.label}</th>
                <td>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};
```

### Teams-Specific Accessibility Features

Special considerations for Teams:

1. **Theme Adaptation**: Support both light, dark, and high contrast themes
2. **Focus Indicators**: Enhance focus visibility within the Teams context
3. **Responsive Text**: Ensure text scales properly in different Teams views
4. **Teams Magnifier Compatibility**: Test with the Teams magnifier feature

## Real-time Data Visualization

Implement real-time updates in ACS Tab visualizations:

### WebSocket Integration

```javascript
// WebSocket for real-time visualization updates
import { useEffect, useState } from 'react';
import { useTeamsUserCredential } from '@microsoft/teamsfx-react';

const RealTimeVisualization = ({ visualizationType, dataEndpoint }) => {
  const [data, setData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const { teamsfx } = useTeamsUserCredential();
  
  useEffect(() => {
    let socket;
    
    const connectWebSocket = async () => {
      try {
        // Get access token for the WebSocket connection
        const token = await teamsfx.getCredential().getToken("");
        
        // Connect to WebSocket with auth
        socket = new WebSocket(`${dataEndpoint}?token=${token.token}`);
        
        socket.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected');
        };
        
        socket.onmessage = (event) => {
          const newData = JSON.parse(event.data);
          setData(currentData => {
            // Update strategy depends on visualization type
            if (visualizationType === 'timeSeriesChart') {
              // For time series, append new data points
              return [...currentData, ...newData].slice(-100); // Keep last 100 points
            } else {
              // For other types, replace the dataset
              return newData;
            }
          });
        };
        
        socket.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
          // Attempt to reconnect after a delay
          setTimeout(connectWebSocket, 5000);
        };
        
        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          socket.close();
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    };
    
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [dataEndpoint, teamsfx, visualizationType]);
  
  return (
    <div className="real-time-visualization">
      {!isConnected && (
        <div className="connection-status">
          Connecting to real-time data...
        </div>
      )}
      
      <div className="visualization-container">
        {/* Render the appropriate visualization with real-time data */}
        {renderVisualization(visualizationType, data)}
      </div>
      
      <div className="status-bar">
        <span className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Live' : 'Connecting...'}
        </span>
        <span className="data-point-count">
          {data.length} data points
        </span>
      </div>
    </div>
  );
};
```

### SignalR Integration

For more complex real-time scenarios, use SignalR:

```javascript
// SignalR implementation
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useState, useEffect } from 'react';
import { useTeamsUserCredential } from '@microsoft/teamsfx-react';

const SignalRVisualization = ({ hubUrl, visualizationConfig }) => {
  const [connection, setConnection] = useState(null);
  const [data, setData] = useState([]);
  const { teamsfx } = useTeamsUserCredential();
  
  useEffect(() => {
    const createHubConnection = async () => {
      try {
        const token = await teamsfx.getCredential().getToken("");
        
        // Create the connection
        const hubConnection = new HubConnectionBuilder()
          .withUrl(hubUrl, { accessTokenFactory: () => token.token })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Information)
          .build();
        
        // Set up data handlers
        hubConnection.on("ReceiveDataUpdate", (updatedData) => {
          setData(updatedData);
        });
        
        hubConnection.on("ReceiveDataPoint", (newPoint) => {
          setData(currentData => [...currentData, newPoint]);
        });
        
        // Start the connection
        await hubConnection.start();
        setConnection(hubConnection);
        
        // Join visualization group
        await hubConnection.invoke("JoinVisualizationGroup", visualizationConfig.id);
      } catch (error) {
        console.error("Error establishing SignalR connection:", error);
      }
    };
    
    createHubConnection();
    
    // Clean up
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [hubUrl, teamsfx, visualizationConfig.id]);
  
  return (
    <div className="signalr-visualization">
      {/* Visualization rendering logic */}
    </div>
  );
};
```

## Sample Implementations

### Basic Dashboard Tab

```javascript
// Basic dashboard implementation
import React from 'react';
import { useTeams } from '@microsoft/teamsfx-react';
import { AreaChart, RadialChart, MetricCard } from './visualization-components';

const ACSTabDashboard = () => {
  const { context, theme } = useTeams();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    engagement: 0,
    satisfaction: 0
  });
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  
  // Data fetching useEffect
  useEffect(() => {
    const fetchDashboardData = async () => {
      // Fetch dashboard data here
    };
    
    fetchDashboardData();
  }, [context]);
  
  return (
    <div className="dashboard-container">
      <div className="metrics-row">
        <MetricCard 
          title="Total Users"
          value={metrics.totalUsers}
          trend={+5}
          icon="People"
        />
        <MetricCard 
          title="Active Users"
          value={metrics.activeUsers}
          trend={+2}
          icon="UserFollowed"
        />
        <MetricCard 
          title="Engagement"
          value={`${metrics.engagement}%`}
          trend={-1}
          icon="Engagement"
        />
        <MetricCard 
          title="Satisfaction"
          value={`${metrics.satisfaction}%`}
          trend={+3}
          icon="EmojiHappy"
        />
      </div>
      
      <div className="charts-row">
        <div className="chart-container">
          <h3>User Activity Over Time</h3>
          <AreaChart 
            data={timeSeriesData}
            theme={theme}
            height={300}
          />
        </div>
        
        <div className="chart-container">
          <h3>User Distribution</h3>
          <RadialChart 
            data={distributionData}
            theme={theme}
            height={300}
          />
        </div>
      </div>
    </div>
  );
};
```

### Interactive Data Explorer

```javascript
// Interactive data explorer pattern
import React, { useState } from 'react';
import { Dropdown, Slider, Toggle, PivotItem, Pivot } from '@fluentui/react';
import { DataTable, DataChart } from './visualization-components';

const ACSTabDataExplorer = ({ dataSource }) => {
  const [viewType, setViewType] = useState('chart');
  const [chartType, setChartType] = useState('bar');
  const [dimension, setDimension] = useState('time');
  const [metric, setMetric] = useState('value');
  const [filterValue, setFilterValue] = useState(null);
  const [aggregation, setAggregation] = useState('sum');
  
  // Derived/processed data based on selections
  const processedData = useMemo(() => {
    // Process data based on current selections
    return processData(dataSource, {
      dimension,
      metric,
      filterValue,
      aggregation
    });
  }, [dataSource, dimension, metric, filterValue, aggregation]);
  
  return (
    <div className="data-explorer">
      <div className="control-panel">
        <Dropdown
          label="View As"
          selectedKey={viewType}
          onChange={(_, item) => setViewType(item.key)}
          options={[
            { key: 'chart', text: 'Chart' },
            { key: 'table', text: 'Table' }
          ]}
        />
        
        {viewType === 'chart' && (
          <Dropdown
            label="Chart Type"
            selectedKey={chartType}
            onChange={(_, item) => setChartType(item.key)}
            options={[
              { key: 'bar', text: 'Bar Chart' },
              { key: 'line', text: 'Line Chart' },
              { key: 'pie', text: 'Pie Chart' }
            ]}
          />
        )}
        
        <Dropdown
          label="Dimension"
          selectedKey={dimension}
          onChange={(_, item) => setDimension(item.key)}
          options={dimensionOptions}
        />
        
        <Dropdown
          label="Metric"
          selectedKey={metric}
          onChange={(_, item) => setMetric(item.key)}
          options={metricOptions}
        />
        
        <Dropdown
          label="Aggregation"
          selectedKey={aggregation}
          onChange={(_, item) => setAggregation(item.key)}
          options={[
            { key: 'sum', text: 'Sum' },
            { key: 'average', text: 'Average' },
            { key: 'count', text: 'Count' },
            { key: 'min', text: 'Minimum' },
            { key: 'max', text: 'Maximum' }
          ]}
        />
        
        <Toggle
          label="Show Data Labels"
          checked={showDataLabels}
          onChange={(_, checked) => setShowDataLabels(checked)}
        />
      </div>
      
      <div className="visualization-container">
        <Pivot>
          <PivotItem headerText="Visualization">
            {viewType === 'chart' ? (
              <DataChart
                data={processedData}
                chartType={chartType}
                dimension={dimension}
                metric={metric}
                showDataLabels={showDataLabels}
              />
            ) : (
              <DataTable
                data={processedData}
                dimension={dimension}
                metric={metric}
              />
            )}
          </PivotItem>
          
          <PivotItem headerText="Data">
            <DataTable
              data={rawData}
              compact={true}
            />
          </PivotItem>
          
          <PivotItem headerText="Insights">
            <AutoInsights data={processedData} />
          </PivotItem>
        </Pivot>
      </div>
    </div>
  );
};
```

## Troubleshooting

Common issues and solutions for ACS Tab visualizations:

### Performance Issues

**Symptoms**:
- Slow rendering of visualizations
- Teams client lagging when interacting with charts
- Timeout errors in data requests

**Solutions**:
1. Implement data sampling for large datasets
2. Use progressive loading techniques
3. Optimize render cycles by using React.memo and useMemo hooks
4. Reduce DOM elements generated by visualization
5. Implement data filtering server-side

### Authentication Failures

**Symptoms**:
- "Access denied" errors
- Empty visualizations despite configuration
- 401/403 errors in network requests

**Solutions**:
1. Verify SSO configuration in Teams manifest
2. Check token expiration and implement proper refresh
3. Confirm API permissions in Azure AD
4. Implement proper error handling with retry logic
5. Use Teams SDK debug logging to troubleshoot auth flows

### Example Authentication Debugging

```javascript
// Authentication debugging helpers
const debugAuthFlow = async () => {
  try {
    // Initialize with debug logging
    const credential = new TeamsUserCredential({
      clientId: process.env.CLIENT_ID,
      initiateLoginEndpoint: process.env.INITIATE_LOGIN_ENDPOINT,
      logging: {
        logLevel: LogLevel.Verbose
      }
    });
    
    // Try to get a token
    console.log("Attempting to get token...");
    const result = await credential.getToken(["https://graph.microsoft.com/.default"]);
    
    console.log("Token acquired successfully");
    console.log("Token expires at:", new Date(result.expiresOn).toISOString());
    console.log("Scopes:", result.scopes);
    
    // Try a test API call
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${result.token}`
      }
    });
    
    if (response.ok) {
      console.log("Test API call succeeded");
      const data = await response.json();
      console.log("User ID:", data.id);
    } else {
      console.error("Test API call failed with status:", response.status);
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
    
    return "Auth flow completed - check console for details";
  } catch (error) {
    console.error("Auth debugging error:", error);
    return `Auth error: ${error.message}`;
  }
};
```

### Rendering and Style Issues

**Symptoms**:
- Visualizations not respecting Teams theme
- Layout breaking in different Teams clients (desktop/mobile/web)
- Missing elements in certain contexts

**Solutions**:
1. Use Teams context to detect theme and adapt styles
2. Implement responsive design with Fluent UI components
3. Test in all Teams clients and adapt accordingly
4. Use Teams theme tokens for consistent styling

## Best Practices

### Development Guidelines

1. **Start Simple**: Begin with basic charts before complex visualizations
2. **Progressive Enhancement**: Add interactivity and features incrementally
3. **Component Structure**: Use a modular approach with visualization wrappers
4. **Centralized Configuration**: Manage visualization options in a config store
5. **Testing Framework**: Implement test coverage for data processing logic

### Performance Guidelines

1. **Data Processing Server-Side**: Minimize client-side manipulation
2. **Lazy Loading**: Load visualization libraries on demand
3. **Query Optimization**: Use efficient queries with projections
4. **Limit Animation**: Use animations sparingly in Teams context
5. **Memory Management**: Clear chart instances and event listeners properly

### User Experience Guidelines

1. **Consistent Layout**: Maintain alignment with Teams UI patterns
2. **Intuitive Controls**: Use familiar interaction patterns
3. **Clear Feedback**: Provide loading states and error messages
4. **Collaboration Focus**: Enable sharing of insights
5. **Accessibility First**: Design for all users from the start

## References and Resources

### Microsoft Documentation

- [Microsoft Teams JavaScript SDK](https://docs.microsoft.com/en-us/javascript/api/overview/msteams-client)
- [Azure Communication Services Integration](https://docs.microsoft.com/en-us/azure/communication-services/concepts/teams-interop)
- [Fluent UI React Components](https://developer.microsoft.com/en-us/fluentui#/controls/web)
- [Microsoft Graph API for Teams](https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview)

### Visualization Libraries Documentation

- [Microsoft Power BI Embedding](https://docs.microsoft.com/en-us/power-bi/developer/embedded/embed-sample-for-your-organization)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [D3.js Documentation](https://d3js.org/)
- [Recharts Documentation](https://recharts.org/en-US/)

### Sample Code Repositories

- [ACS Tabs Sample Gallery](https://github.com/microsoft/teams-samples)
- [Teams Data Visualization Examples](https://github.com/pnp/teams-dev-samples)
- [Teams React Hooks Library](https://github.com/OfficeDev/microsoft-teams-library-js)

### Community Resources

- [Microsoft Teams Developer Community](https://developer.microsoft.com/en-us/microsoft-teams/community)
- [Azure Communication Services Blog](https://techcommunity.microsoft.com/t5/azure-communication-services/bg-p/AzureCommunicationServicesBlog)
- [Microsoft Q&A for Teams Development](https://docs.microsoft.com/en-us/answers/topics/teams-development.html)
