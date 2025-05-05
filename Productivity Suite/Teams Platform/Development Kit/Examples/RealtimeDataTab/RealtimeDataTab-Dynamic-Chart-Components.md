# RealtimeDataTab Dynamic Chart Components

## Overview

The RealtimeDataTab Dynamic Chart Components module provides a comprehensive set of React components for implementing real-time data visualization within Microsoft Teams tabs. This documentation covers the architecture, implementation details, and best practices for utilizing these components to create responsive, dynamic charts that update with real-time data streams within Teams applications.

## Table of Contents

- [Architecture](#architecture)
- [Component Hierarchy](#component-hierarchy)
- [Data Flow](#data-flow)
- [Available Chart Components](#available-chart-components)
- [Core API Reference](#core-api-reference)
- [Real-time Data Integration](#real-time-data-integration)
- [Styling and Customization](#styling-and-customization)
- [Performance Considerations](#performance-considerations)
- [Accessibility Compliance](#accessibility-compliance)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Architecture

### Overview

The Dynamic Chart Components follow a modular architecture that separates concerns between:

1. **Data Management** - Handlers for real-time data streams, transformations, and state management
2. **Visualization Components** - The actual chart rendering components
3. **Configuration** - Theme integration and customization options

### Technology Stack

- **React** - Core view library
- **TypeScript** - Type-safe development
- **Teams JS SDK** - Integration with Microsoft Teams
- **Recharts** - Underlying chart library
- **RxJS** - Reactive programming for real-time data streams

### Integration Points

- Microsoft Teams context
- Backend data services
- Fluent UI theming

## Component Hierarchy

```
RealtimeDataContainer
├── DataSourceConnector
│   ├── SignalRConnector
│   ├── WebSocketConnector
│   └── PollingConnector
├── DataTransformer
└── ChartComponents
    ├── LineChartComponent
    ├── BarChartComponent
    ├── AreaChartComponent
    ├── PieChartComponent
    ├── ScatterChartComponent
    └── CustomChartComponent
```

## Data Flow

The data flow in RealtimeDataTab follows this pattern:

1. **Data Source Connection**: Establish connection with real-time data provider
2. **Data Stream Subscription**: Listen for data updates via WebSockets, SignalR, or polling
3. **Data Transformation**: Process incoming data into chart-compatible format
4. **State Management**: Update component state with new data
5. **Rendering**: Trigger re-renders of visualization components
6. **Animation**: Apply transitions to visual elements for smooth updates

### Code Example - Basic Data Flow Implementation

```typescript
import { useState, useEffect } from 'react';
import { createSignalRConnection } from './dataConnectors';
import { transformChartData } from './dataTransformers';
import { LineChartComponent } from './chartComponents';

export const RealtimeChartContainer: React.FC<Props> = ({ endpoint, refreshInterval, chartConfig }) => {
  const [chartData, setChartData] = useState<ChartDataType[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    // Establish connection
    const connection = createSignalRConnection(endpoint);
    
    connection.onConnected(() => {
      setConnectionStatus('connected');
    });
    
    // Subscribe to data stream
    connection.subscribe('dataStream', (newData) => {
      // Transform data
      const transformedData = transformChartData(newData, chartConfig.dataKeys);
      
      // Update state
      setChartData(currentData => {
        // Apply data window limits if specified
        if (chartConfig.maxDataPoints && currentData.length >= chartConfig.maxDataPoints) {
          return [...currentData.slice(1), transformedData];
        }
        return [...currentData, transformedData];
      });
    });
    
    return () => {
      // Clean up connection
      connection.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [endpoint, chartConfig]);
  
  return (
    <div className="realtime-chart-container">
      <ConnectionStatusIndicator status={connectionStatus} />
      <LineChartComponent 
        data={chartData} 
        config={chartConfig}
        animationDuration={500}
      />
    </div>
  );
};
```

## Available Chart Components

### LineChartComponent

Ideal for time-series data visualization showing trends over time.

**Props:**
- `data: DataPoint[]` - Array of data points
- `xKey: string` - Property name for X-axis values
- `yKeys: string[]` - Property names for Y-axis values
- `colors: string[]` - Line colors (uses theme defaults if not provided)
- `animationDuration: number` - Transition duration in ms
- `showGridLines: boolean` - Toggle grid lines visibility
- `tooltipFormatter?: (value: any) => string` - Custom tooltip format function

### BarChartComponent

For comparing quantities across categories.

**Props:**
- `data: DataPoint[]` - Array of data points
- `categoryKey: string` - Property name for categories
- `valueKeys: string[]` - Property names for values
- `stacked: boolean` - Whether to stack bars
- `colors: string[]` - Bar colors
- `animationDuration: number` - Transition duration in ms

### AreaChartComponent

For showing volumes over time or cumulative values.

**Props:**
- `data: DataPoint[]` - Array of data points
- `xKey: string` - Property name for X-axis values
- `yKeys: string[]` - Property names for Y-axis values
- `stacked: boolean` - Whether to stack areas
- `colors: string[]` - Area colors
- `gradients: boolean` - Whether to use gradient fills
- `animationDuration: number` - Transition duration in ms

### PieChartComponent

For showing proportions of a whole.

**Props:**
- `data: DataPoint[]` - Array of data points
- `nameKey: string` - Property name for segment names
- `valueKey: string` - Property name for segment values
- `colors: string[]` - Segment colors
- `innerRadius: number` - For creating donut charts (0 for pie)
- `animationDuration: number` - Transition duration in ms

### ScatterChartComponent

For showing relationships between two variables.

**Props:**
- `data: DataPoint[]` - Array of data points
- `xKey: string` - Property name for X-axis values
- `yKey: string` - Property name for Y-axis values
- `sizeKey?: string` - Optional property for point size
- `colorKey?: string` - Optional property for point color
- `animationDuration: number` - Transition duration in ms

### CustomChartComponent

Base component for creating specialized chart types.

**Props:**
- `data: DataPoint[]` - Array of data points
- `renderFn: (data: DataPoint[], container: HTMLElement) => void` - Custom render function
- `updateFn: (data: DataPoint[], container: HTMLElement) => void` - Custom update function
- `cleanupFn?: (container: HTMLElement) => void` - Custom cleanup function

## Core API Reference

### `useRealtimeData` Hook

Core hook for connecting to real-time data sources.

```typescript
const { 
  data, 
  isConnected, 
  error, 
  pauseStream, 
  resumeStream 
} = useRealtimeData({
  source: 'websocket' | 'signalr' | 'polling',
  endpoint: string,
  interval?: number, // For polling
  transformFn?: (rawData: any) => ChartDataType,
  maxDataPoints?: number
});
```

### DataSourceConnector

Abstract class for implementing data source connectors.

```typescript
abstract class DataSourceConnector<T> {
  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract isConnected(): boolean;
  abstract subscribe(callback: (data: T) => void): void;
  abstract unsubscribe(): void;
  abstract pause(): void;
  abstract resume(): void;
}
```

### ChartThemeProvider

Context provider for chart theming.

```typescript
<ChartThemeProvider 
  theme={{
    colors: string[],
    fontFamily: string,
    fontSize: number,
    backgroundColor: string,
    gridColor: string,
    tooltipStyle: React.CSSProperties,
    // Additional theme properties
  }}
>
  {/* Chart components */}
</ChartThemeProvider>
```

## Real-time Data Integration

### Supported Protocols

1. **WebSockets**
   - Low-latency, bi-directional communication
   - Ideal for high-frequency updates
   - Requires WebSocket server implementation

2. **SignalR**
   - Microsoft's real-time communication library
   - Fallback mechanisms for environments that don't support WebSockets
   - Simplified API with automatic reconnection

3. **HTTP Polling**
   - Simple implementation for less frequent updates
   - Higher latency but works in all environments
   - Configurable poll interval

### Sample SignalR Implementation

```typescript
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { DataSourceConnector } from './dataConnector';

export class SignalRConnector extends DataSourceConnector<any> {
  private connection: signalR.HubConnection;
  private callback: ((data: any) => void) | null = null;
  private hubName: string;
  private method: string;
  
  constructor(endpoint: string, hubName: string, method: string) {
    super();
    this.hubName = hubName;
    this.method = method;
    
    this.connection = new HubConnectionBuilder()
      .withUrl(`${endpoint}/${hubName}`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();
  }
  
  async connect(): Promise<void> {
    try {
      await this.connection.start();
      console.log('SignalR connection established');
      
      if (this.callback) {
        this.subscribe(this.callback);
      }
    } catch (error) {
      console.error('Error establishing SignalR connection:', error);
      throw error;
    }
  }
  
  disconnect(): void {
    this.connection.stop();
  }
  
  isConnected(): boolean {
    return this.connection.state === signalR.HubConnectionState.Connected;
  }
  
  subscribe(callback: (data: any) => void): void {
    this.callback = callback;
    
    if (this.isConnected()) {
      this.connection.on(this.method, (data) => {
        if (this.callback) {
          this.callback(data);
        }
      });
    }
  }
  
  unsubscribe(): void {
    this.connection.off(this.method);
    this.callback = null;
  }
  
  pause(): void {
    this.unsubscribe();
  }
  
  resume(): void {
    if (this.callback) {
      this.subscribe(this.callback);
    }
  }
}
```

## Styling and Customization

### Theme Integration

The chart components automatically integrate with the Teams theme and respect light/dark mode preferences.

```typescript
import { useTeamsTheme } from './hooks';
import { LineChartComponent } from './chartComponents';

const ThemedChart: React.FC<Props> = (props) => {
  const theme = useTeamsTheme();
  
  return (
    <LineChartComponent
      {...props}
      colors={theme.palette.accent}
      backgroundColor={theme.palette.neutralLighter}
      textColor={theme.palette.neutralPrimary}
    />
  );
};
```

### Custom Styling

All components accept style overrides for fine-grained control:

```typescript
<LineChartComponent
  data={chartData}
  customStyles={{
    chart: {
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
    },
    lines: {
      strokeWidth: 2,
      strokeDasharray: '5 5', // For dashed lines
    },
    axis: {
      stroke: '#888',
      strokeWidth: 1,
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      borderRadius: '4px',
      padding: '8px',
    },
  }}
/>
```

## Performance Considerations

### Data Volume Management

For high-frequency data streams, consider:

1. **Throttling updates** - Limit UI updates to a reasonable frequency
2. **Data windowing** - Keep only a sliding window of most recent data points
3. **Data aggregation** - Combine multiple updates into batches

```typescript
// Example of throttled updates
import { throttle } from 'lodash';

const throttledUpdate = throttle((newData) => {
  setChartData(newData);
}, 500); // Update at most every 500ms

dataSource.subscribe((rawData) => {
  const transformedData = transformData(rawData);
  throttledUpdate(transformedData);
});
```

### Optimization Techniques

1. **Memoization** - Use React.memo and useMemo to prevent unnecessary re-renders
2. **Canvas Rendering** - For very large datasets, consider using canvas-based rendering
3. **Virtualization** - For many chart instances, implement virtual scrolling

## Accessibility Compliance

The Dynamic Chart Components meet WCAG 2.1 AA compliance requirements:

1. **Screen Reader Support** - All charts include appropriate ARIA attributes
2. **Keyboard Navigation** - All interactive elements are keyboard accessible
3. **Color Contrast** - Default colors meet contrast requirements
4. **Text Alternatives** - Charts include descriptive text alternatives

### Example: Accessible Chart Implementation

```typescript
<LineChartComponent
  data={chartData}
  accessibilityProps={{
    chartAriaLabel: "Monthly sales trend for 2023",
    dataSeriesLabel: (series) => `${series.name} data series`,
    dataPointLabel: (point) => `${point.x}: ${point.y} units`,
    summaryText: "Chart showing increasing trend in Q1 and Q2, with peak sales in June."
  }}
/>
```

## Examples

### Basic Real-time Line Chart

```typescript
import React from 'react';
import { RealtimeDataContainer, LineChartComponent } from './components';

export const SalesMonitoringTab: React.FC = () => {
  return (
    <RealtimeDataContainer
      source="signalr"
      endpoint="https://api.example.com/hub"
      hubName="salesHub"
      method="ReceiveSalesData"
      maxDataPoints={100}
    >
      {({ data, isConnected, error }) => (
        <div className="sales-dashboard">
          <h2>Real-time Sales Dashboard</h2>
          {error && <div className="error-banner">{error.message}</div>}
          <div className="connection-status">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <LineChartComponent
            data={data}
            xKey="timestamp"
            yKeys={["sales", "returns"]}
            colors={["#0078d4", "#d13438"]}
            animationDuration={300}
            showGridLines={true}
          />
        </div>
      )}
    </RealtimeDataContainer>
  );
};
```

### Multi-Chart Dashboard

```typescript
import React from 'react';
import { 
  RealtimeDataContainer, 
  LineChartComponent,
  BarChartComponent,
  PieChartComponent,
  useDataTransformer
} from './components';

export const MetricsDashboardTab: React.FC = () => {
  // Custom data transformer for different chart formats
  const { transform } = useDataTransformer();
  
  return (
    <RealtimeDataContainer
      source="websocket"
      endpoint="wss://metrics.example.com/stream"
      maxDataPoints={50}
    >
      {({ data, isConnected, error, pauseStream, resumeStream }) => {
        const timeSeriesData = transform(data, 'timeSeries');
        const categoryData = transform(data, 'category');
        const pieData = transform(data, 'aggregate');
        
        return (
          <div className="metrics-dashboard">
            <h2>System Metrics Dashboard</h2>
            <div className="controls">
              <button onClick={pauseStream}>Pause</button>
              <button onClick={resumeStream}>Resume</button>
            </div>
            
            <div className="charts-grid">
              <div className="chart-container">
                <h3>CPU & Memory Usage</h3>
                <LineChartComponent
                  data={timeSeriesData}
                  xKey="timestamp"
                  yKeys={["cpuUsage", "memoryUsage"]}
                />
              </div>
              
              <div className="chart-container">
                <h3>Requests by Endpoint</h3>
                <BarChartComponent
                  data={categoryData}
                  categoryKey="endpoint"
                  valueKeys={["requestCount"]}
                />
              </div>
              
              <div className="chart-container">
                <h3>Error Distribution</h3>
                <PieChartComponent
                  data={pieData}
                  nameKey="errorType"
                  valueKey="count"
                />
              </div>
            </div>
          </div>
        );
      }}
    </RealtimeDataContainer>
  );
};
```

## Troubleshooting

### Common Issues

#### Connection Problems

**Symptoms:**
- Charts remain in "Connecting..." state
- Error messages about failed connections

**Solutions:**
1. Verify endpoint URLs are correct and accessible from Teams client
2. Check network permissions and firewall settings
3. Ensure authentication tokens are valid if using authenticated endpoints
4. Verify the backend service is running and accepting connections

#### Performance Issues

**Symptoms:**
- UI becoming sluggish over time
- High memory usage
- Delayed updates

**Solutions:**
1. Implement data windowing to limit stored data points
2. Reduce update frequency
3. Simplify chart renderings (fewer data series, simpler designs)
4. Use the `dispose` method when unmounting to clean up resources

#### Rendering Glitches

**Symptoms:**
- Charts disappearing or showing incomplete data
- Animation issues

**Solutions:**
1. Verify data format consistency
2. Check for null or undefined values in the data
3. Try reducing animation duration or disabling animations
4. Test with smaller datasets to isolate the issue

### Diagnostic Tools

1. **ConnectionDebugger Component**

```typescript
import React from 'react';
import { useRealtimeData } from './hooks';

export const ConnectionDebugger: React.FC<Props> = (props) => {
  const { 
    isConnected, 
    connectionEvents, 
    latency, 
    lastError 
  } = useRealtimeData(props);
  
  return (
    <div className="connection-debugger">
      <h3>Connection Diagnostics</h3>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Latency: {latency}ms</div>
      {lastError && (
        <div className="error-details">
          <h4>Last Error</h4>
          <pre>{JSON.stringify(lastError, null, 2)}</pre>
        </div>
      )}
      <h4>Connection Events</h4>
      <ul>
        {connectionEvents.map((event, index) => (
          <li key={index}>
            {new Date(event.timestamp).toLocaleTimeString()}: {event.type} - {event.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

2. **Performance Profiler**

```typescript
import React, { useEffect, useState } from 'react';

export const PerformanceProfiler: React.FC<{
  componentId: string;
  enabled: boolean;
}> = ({ componentId, enabled, children }) => {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
  });
  
  useEffect(() => {
    if (!enabled) return;
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        renderCount: prev.renderCount + 1,
        lastRenderTime: renderTime,
        averageRenderTime: 
          (prev.averageRenderTime * prev.renderCount + renderTime) / 
          (prev.renderCount + 1),
      }));
      
      console.log(`[${componentId}] Render #${metrics.renderCount + 1}: ${renderTime.toFixed(2)}ms`);
    };
  });
  
  return (
    <>
      {enabled && (
        <div className="performance-metrics" style={{ fontSize: '10px', opacity: 0.7 }}>
          Renders: {metrics.renderCount} | 
          Last: {metrics.lastRenderTime.toFixed(2)}ms | 
          Avg: {metrics.averageRenderTime.toFixed(2)}ms
        </div>
      )}
      {children}
    </>
  );
};
```

## Security Considerations

### Authentication and Authorization

- All real-time data connections should implement appropriate authentication
- Ensure data sources enforce proper authorization checks
- Use secure connection protocols (WSS, HTTPS)

### Data Validation

- Always validate incoming data before rendering
- Implement error boundaries to gracefully handle malformed data
- Consider sanitization for data that might contain HTML or other potentially unsafe content

## Best Practices

1. **Error Handling**: Implement comprehensive error handling and recovery mechanisms
2. **Graceful Fallbacks**: Provide static fallback views when real-time data is unavailable
3. **Progressive Enhancement**: Start with a basic chart and enhance with real-time capabilities
4. **Testing**: Thoroughly test with various data shapes, volumes, and update frequencies
5. **Monitoring**: Implement client-side telemetry to track connection health and performance
