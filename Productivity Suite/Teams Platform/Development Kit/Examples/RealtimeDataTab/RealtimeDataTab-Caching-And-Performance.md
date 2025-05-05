# RealtimeDataTab: Caching and Performance Optimization

## Overview

This document provides comprehensive guidance on implementing caching strategies and performance optimizations for the RealtimeDataTab application in Microsoft Teams. The RealtimeDataTab is designed to display real-time data visualizations within Teams, which requires careful performance tuning to ensure a responsive user experience even with large datasets and frequent updates.

## Table of Contents

- [Key Performance Considerations](#key-performance-considerations)
- [Client-Side Caching Strategies](#client-side-caching-strategies)
- [Server-Side Caching Implementation](#server-side-caching-implementation)
- [SignalR Performance Optimization](#signalr-performance-optimization)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Rendering Performance](#rendering-performance)
- [Measuring Performance](#measuring-performance)
- [Benchmarks and Expected Performance](#benchmarks-and-expected-performance)
- [Advanced Optimization Techniques](#advanced-optimization-techniques)
- [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

## Key Performance Considerations

When implementing the RealtimeDataTab, several factors can impact performance:

- **Data volume**: The amount of data being transferred and rendered
- **Update frequency**: How often the real-time data changes
- **Connection quality**: Network conditions between clients and servers
- **Client device capabilities**: Processing power and memory constraints
- **Teams context overhead**: Additional processing required for Teams integration
- **Number of concurrent users**: Scale considerations for multi-user scenarios

Performance optimization should be approached holistically, addressing both client and server aspects of the application.

## Client-Side Caching Strategies

### Browser Cache Configuration

```javascript
// Configure cache headers in your API responses
app.get('/api/data', (req, res) => {
  // For data that changes frequently but can be stale for a short period
  res.set('Cache-Control', 'public, max-age=60'); // Cache for 60 seconds
  res.json(data);
});

// For static assets that rarely change
app.get('/static/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  // Serve static content
});
```

### In-Memory Caching

Implement a client-side caching layer to minimize redundant data fetching:

```javascript
class DataCache {
  constructor(ttlSeconds = 60) {
    this.cache = new Map();
    this.ttlSeconds = ttlSeconds;
  }

  set(key, value) {
    const expiry = Date.now() + (this.ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  invalidate(key) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
}

// Usage example
const dataCache = new DataCache(120); // 2-minute TTL

async function fetchDataWithCaching(endpoint) {
  const cacheKey = `data-${endpoint}`;
  const cachedData = dataCache.get(cacheKey);
  
  if (cachedData) {
    console.log('Cache hit for', cacheKey);
    return cachedData;
  }
  
  console.log('Cache miss for', cacheKey);
  const response = await fetch(endpoint);
  const data = await response.json();
  
  dataCache.set(cacheKey, data);
  return data;
}
```

### IndexedDB for Larger Datasets

For larger datasets that exceed memory constraints, use IndexedDB:

```javascript
class IndexedDBCache {
  constructor(dbName = 'realtimeDataCache', storeName = 'dataStore') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
      
      request.onerror = (event) => {
        reject(`IndexedDB error: ${event.target.errorCode}`);
      };
    });
  }

  async set(key, value, ttlSeconds = 3600) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        id: key,
        value: value,
        expiry: expiry
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(key) {
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }
        
        if (Date.now() > data.expiry) {
          this.delete(key);
          resolve(null);
          return;
        }
        
        resolve(data.value);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async delete(key) {
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Usage
const largeDataCache = new IndexedDBCache();
largeDataCache.set('historical-data', largeDataset, 86400); // Cache for 24 hours
```

### Memory-Based LRU Cache

For high-frequency data access patterns:

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Refresh the key (LRU logic)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove the least recently used item
      this.cache.delete(this.cache.keys().next().value);
    }
    
    this.cache.set(key, value);
  }
}

// Initialize LRU cache with capacity of 100 items
const lruCache = new LRUCache(100);
```

## Server-Side Caching Implementation

### Redis Cache Integration

```csharp
// C# example for ASP.NET Core backend with Redis cache

public class DataController : Controller
{
    private readonly IDistributedCache _cache;
    private readonly IDataService _dataService;
    
    public DataController(IDistributedCache cache, IDataService dataService)
    {
        _cache = cache;
        _dataService = dataService;
    }
    
    [HttpGet("api/realtime-data/{dataSetId}")]
    public async Task<IActionResult> GetRealtimeData(string dataSetId)
    {
        string cacheKey = $"realtime-data-{dataSetId}";
        string cachedData = await _cache.GetStringAsync(cacheKey);
        
        if (!string.IsNullOrEmpty(cachedData))
        {
            return Ok(JsonConvert.DeserializeObject<DataSet>(cachedData));
        }
        
        // Cache miss - fetch from database/service
        var data = await _dataService.GetDataSetAsync(dataSetId);
        
        // Cache the result with a short expiration (for real-time data)
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(15)
        };
        
        await _cache.SetStringAsync(
            cacheKey, 
            JsonConvert.SerializeObject(data), 
            cacheOptions);
        
        return Ok(data);
    }
}
```

### In-Memory Caching with Cache Invalidation

```csharp
// Configure in-memory cache in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddMemoryCache();
    services.AddSingleton<ICacheInvalidationService, CacheInvalidationService>();
    // Other service registrations
}

// Implementation for cache invalidation
public class CacheInvalidationService : ICacheInvalidationService
{
    private readonly IMemoryCache _cache;
    private readonly IHubContext<DataHub> _hubContext;
    
    public CacheInvalidationService(IMemoryCache cache, IHubContext<DataHub> hubContext)
    {
        _cache = cache;
        _hubContext = hubContext;
    }
    
    public async Task InvalidateCacheAndNotifyClients(string cacheKey)
    {
        _cache.Remove(cacheKey);
        await _hubContext.Clients.All.SendAsync("CacheInvalidated", cacheKey);
    }
}
```

### Two-Level Caching Strategy

Implement a two-level caching strategy that combines memory cache and distributed cache:

```csharp
public class TwoLevelCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    
    public TwoLevelCacheService(IMemoryCache memoryCache, IDistributedCache distributedCache)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
    }
    
    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> dataFactory, TimeSpan memoryCacheExpiry, TimeSpan distributedCacheExpiry)
    {
        // Try to get from memory cache first (fastest)
        if (_memoryCache.TryGetValue(key, out T cachedValue))
        {
            return cachedValue;
        }
        
        // Try distributed cache if not in memory
        string cachedJson = await _distributedCache.GetStringAsync(key);
        if (!string.IsNullOrEmpty(cachedJson))
        {
            T value = JsonConvert.DeserializeObject<T>(cachedJson);
            
            // Store in memory cache for faster subsequent access
            _memoryCache.Set(key, value, memoryCacheExpiry);
            
            return value;
        }
        
        // Get from data source if not cached
        T freshData = await dataFactory();
        
        // Cache in both layers
        _memoryCache.Set(key, freshData, memoryCacheExpiry);
        
        await _distributedCache.SetStringAsync(
            key,
            JsonConvert.SerializeObject(freshData),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = distributedCacheExpiry }
        );
        
        return freshData;
    }
}
```

## SignalR Performance Optimization

### Connection Management

```csharp
public class DataHub : Hub
{
    private readonly ILogger<DataHub> _logger;
    
    public DataHub(ILogger<DataHub> logger)
    {
        _logger = logger;
    }
    
    public override async Task OnConnectedAsync()
    {
        // Log connection for debugging performance issues
        _logger.LogInformation($"Client connected: {Context.ConnectionId}");
        
        // Add connection to a default group to manage broadcasts
        await Groups.AddToGroupAsync(Context.ConnectionId, "default");
        
        await base.OnConnectedAsync();
    }
    
    public async Task JoinDataGroup(string groupName)
    {
        // Allow clients to join specific data groups to receive targeted updates
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation($"Client {Context.ConnectionId} joined group: {groupName}");
    }
    
    public async Task LeaveDataGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation($"Client {Context.ConnectionId} left group: {groupName}");
    }
}
```

### Optimizing SignalR Message Size

```javascript
// Client-side code to compress/decompress SignalR messages
connection.on("ReceiveData", async (compressedData) => {
  try {
    // Decompress data using pako (a JavaScript port of zlib)
    const decompressedStr = pako.inflate(new Uint8Array(compressedData), { to: 'string' });
    const data = JSON.parse(decompressedStr);
    
    // Process decompressed data
    updateCharts(data);
  } catch (error) {
    console.error("Error decompressing data:", error);
  }
});

// Server-side compression (C#)
public async Task BroadcastData(object data)
{
    string jsonData = JsonConvert.SerializeObject(data);
    byte[] compressedData = CompressData(jsonData);
    
    await _hubContext.Clients.All.SendAsync("ReceiveData", compressedData);
}

private byte[] CompressData(string json)
{
    var encoding = Encoding.UTF8;
    var inputBytes = encoding.GetBytes(json);
    
    using (var outputStream = new MemoryStream())
    {
        using (var gzipStream = new GZipStream(outputStream, CompressionLevel.Fastest))
        {
            gzipStream.Write(inputBytes, 0, inputBytes.Length);
        }
        return outputStream.ToArray();
    }
}
```

### Data Throttling for Real-Time Updates

```javascript
// Client-side throttling for updating UI
const throttleTime = 200; // ms between updates
let lastUpdateTime = 0;
let pendingUpdate = null;

connection.on("ReceiveDataUpdate", (data) => {
  const now = Date.now();
  
  if (now - lastUpdateTime >= throttleTime) {
    // Update immediately if enough time has passed
    updateChartData(data);
    lastUpdateTime = now;
    
    if (pendingUpdate) {
      clearTimeout(pendingUpdate);
      pendingUpdate = null;
    }
  } else if (!pendingUpdate) {
    // Schedule update for later
    const delay = throttleTime - (now - lastUpdateTime);
    pendingUpdate = setTimeout(() => {
      updateChartData(data);
      lastUpdateTime = Date.now();
      pendingUpdate = null;
    }, delay);
  }
});

function updateChartData(data) {
  // Update chart with new data
  myChart.data.datasets[0].data = data;
  myChart.update();
}
```

### SignalR Transport Configuration

```javascript
// Client-side configuration for optimal transport
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/datahub", {
    // Prefer WebSockets, fall back to other transports if needed
    skipNegotiation: true,
    transport: signalR.HttpTransportType.WebSockets
  })
  .configureLogging(signalR.LogLevel.Information)
  .withAutomaticReconnect([0, 2000, 10000, 30000, null]) // Configurable backoff
  .build();
```

## Memory Management

### React Component Optimizations

```jsx
// Use React.memo to prevent unnecessary re-renders
const DataChart = React.memo(({ data }) => {
  // Chart rendering logic
  return <canvas ref={chartRef} />;
}, (prevProps, nextProps) => {
  // Custom comparison function for props
  // Only re-render if data has actually changed
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

// Use useCallback to memoize event handlers
const handleDataUpdate = useCallback((newData) => {
  setData(newData);
}, []);

// Use useMemo for expensive calculations
const processedData = useMemo(() => {
  // Expensive data transformation
  return data.map(item => transformItem(item));
}, [data]);
```

### Garbage Collection Optimization

```javascript
// Avoid creating new objects in render loops
class ChartUpdater {
  constructor() {
    // Pre-allocate buffer arrays
    this.dataBuffer = new Array(100);
    this.labelBuffer = new Array(100);
  }
  
  updateChart(chart, newData) {
    // Reuse existing arrays instead of creating new ones
    for (let i = 0; i < newData.length; i++) {
      this.dataBuffer[i] = newData[i].value;
      this.labelBuffer[i] = newData[i].label;
    }
    
    // Reference existing arrays
    chart.data.datasets[0].data = this.dataBuffer.slice(0, newData.length);
    chart.data.labels = this.labelBuffer.slice(0, newData.length);
    chart.update();
  }
}
```

## Network Optimization

### Data Compression

```javascript
// Client-side compression for data sent to server
async function sendCompressedData(data) {
  const jsonString = JSON.stringify(data);
  
  // Use CompressionStream API if available
  if (window.CompressionStream) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const stream = blob.stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const compressedBlob = await new Response(compressedStream).blob();
    
    // Send compressed data
    await fetch('/api/data', {
      method: 'POST',
      body: compressedBlob,
      headers: {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json'
      }
    });
  } else {
    // Fallback for browsers without CompressionStream
    await fetch('/api/data', {
      method: 'POST',
      body: jsonString,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
```

### Data Transfer Optimization

```javascript
// Only transfer changed data
class DeltaTransfer {
  constructor() {
    this.lastSentData = null;
  }
  
  calculateDelta(newData) {
    if (!this.lastSentData) {
      this.lastSentData = newData;
      return { full: true, data: newData };
    }
    
    const delta = {};
    let hasChanges = false;
    
    for (const key in newData) {
      if (!this.lastSentData.hasOwnProperty(key) || 
          JSON.stringify(newData[key]) !== JSON.stringify(this.lastSentData[key])) {
        delta[key] = newData[key];
        hasChanges = true;
      }
    }
    
    // Store last sent data
    this.lastSentData = {...newData};
    
    return {
      full: false,
      hasChanges,
      delta
    };
  }
  
  applyDelta(baseData, delta) {
    return {...baseData, ...delta};
  }
}

// Usage
const deltaTransfer = new DeltaTransfer();

function sendDataUpdate(data) {
  const { full, hasChanges, delta } = deltaTransfer.calculateDelta(data);
  
  if (full || hasChanges) {
    connection.invoke("UpdateData", {
      full,
      data: full ? data : delta
    });
  }
}
```

## Rendering Performance

### Canvas Optimization for Charts

```javascript
class OptimizedChartRenderer {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.options = options || {};
    
    // Use an offscreen canvas for pre-rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    
    // Pre-calculate frequently used values
    this.xAxisY = this.height - 30;
    this.chartAreaHeight = this.xAxisY - 20;
    
    // Create a throttled render function
    this.throttledRender = this.throttle(this.render.bind(this), 16); // ~60fps
  }
  
  throttle(func, limit) {
    let inThrottle = false;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  updateData(newData) {
    this.data = newData;
    this.throttledRender();
  }
  
  render() {
    if (!this.data || this.data.length === 0) return;
    
    // Clear the offscreen canvas
    this.offscreenCtx.clearRect(0, 0, this.width, this.height);
    
    // Draw chart elements on offscreen canvas
    this.drawAxes(this.offscreenCtx);
    this.drawData(this.offscreenCtx, this.data);
    
    // Copy to visible canvas in one operation
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }
  
  drawAxes(ctx) {
    // Draw axes implementation
  }
  
  drawData(ctx, data) {
    // Efficient data drawing implementation
  }
}

// Usage
const chartRenderer = new OptimizedChartRenderer(
  document.getElementById('chart-canvas'),
  { animationDuration: 300 }
);

// Update with new data
connection.on("ReceiveData", (data) => {
  chartRenderer.updateData(data);
});
```

### WebGL Rendering for Large Datasets

```javascript
class WebGLChartRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Initialize WebGL context
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
    
    // Initialize shaders, buffers, etc.
    this.initShaders();
    this.initBuffers();
  }
  
  initShaders() {
    // Vertex shader source
    const vsSource = `
      attribute vec2 aPosition;
      attribute vec3 aColor;
      varying vec3 vColor;
      uniform vec2 uResolution;
      
      void main() {
        // Convert from pixel space to clip space
        vec2 zeroToOne = aPosition / uResolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        vColor = aColor;
      }
    `;
    
    // Fragment shader source
    const fsSource = `
      precision mediump float;
      varying vec3 vColor;
      
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;
    
    // Create shader program
    // ... implementation details ...
  }
  
  // Other WebGL setup and rendering methods
  // ...
  
  updateData(data) {
    // Update GPU buffers with new data
    // ... implementation details ...
    
    // Render the new data
    this.render();
  }
}
```

## Measuring Performance

### Performance Monitoring Utilities

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: [],
      dataProcessingTime: [],
      renderTime: [],
      networkLatency: []
    };
    
    this.startTime = performance.now();
    this.frameCount = 0;
    this.lastFrameTime = this.startTime;
  }
  
  recordFrameRendered() {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    this.frameCount++;
    this.lastFrameTime = now;
    
    // Calculate instantaneous FPS
    const fps = 1000 / elapsed;
    this.metrics.fps.push(fps);
    
    // Keep only last 100 measurements
    if (this.metrics.fps.length > 100) {
      this.metrics.fps.shift();
    }
    
    return fps;
  }
  
  measureExecutionTime(callback, metricName) {
    const start = performance.now();
    callback();
    const end = performance.now();
    
    const duration = end - start;
    this.metrics[metricName].push(duration);
    
    // Keep only last 100 measurements
    if (this.metrics[metricName].length > 100) {
      this.metrics[metricName].shift();
    }
    
    return duration;
  }
  
  getAverageMetric(metricName, sampleCount = 100) {
    const samples = this.metrics[metricName].slice(-sampleCount);
    if (samples.length === 0) return 0;
    
    const sum = samples.reduce((acc, val) => acc + val, 0);
    return sum / samples.length;
  }
  
  recordNetworkLatency(startTime) {
    const latency = performance.now() - startTime;
    this.metrics.networkLatency.push(latency);
    
    if (this.metrics.networkLatency.length > 100) {
      this.metrics.networkLatency.shift();
    }
    
    return latency;
  }
  
  getReport() {
    return {
      averageFPS: this.getAverageMetric('fps'),
      averageDataProcessingTime: this.getAverageMetric('dataProcessingTime'),
      averageRenderTime: this.getAverageMetric('renderTime'),
      averageNetworkLatency: this.getAverageMetric('networkLatency'),
      totalFrames: this.frameCount,
      uptime: (performance.now() - this.startTime) / 1000
    };
  }
}

// Usage
const perfMonitor = new PerformanceMonitor();

// Measure data processing performance
function processData(data) {
  return perfMonitor.measureExecutionTime(() => {
    // Data processing logic
    return transformedData;
  }, 'dataProcessingTime');
}

// Measure rendering performance
function renderChart(chart, data) {
  perfMonitor.measureExecutionTime(() => {
    chart.data = data;
    chart.update();
  }, 'renderTime');
  
  perfMonitor.recordFrameRendered();
}

// Measure network latency
async function fetchData() {
  const fetchStart = performance.now();
  const response = await fetch('/api/data');
  const data = await response.json();
  
  perfMonitor.recordNetworkLatency(fetchStart);
  return data;
}

// Get performance report periodically
setInterval(() => {
  console.log(perfMonitor.getReport());
}, 10000);
```

## Benchmarks and Expected Performance

The RealtimeDataTab should meet the following performance benchmarks:

1. **Initial load time**: < 2 seconds
2. **Time to first meaningful display**: < 1 second
3. **UI response time**: < 100ms
4. **Data update frequency**: Support 10+ updates per second
5. **Memory consumption**: < 200MB even with large datasets
6. **CPU utilization**: < 30% of a single core

### Performance Test Results

| Scenario | Dataset Size | Update Frequency | Memory Usage | CPU Usage | Update Latency |
|----------|--------------|------------------|--------------|-----------|----------------|
| Small    | < 1,000 items| 10 Hz            | 50-70 MB     | 5-10%     | < 16 ms        |
| Medium   | < 10,000 items| 5 Hz            | 100-150 MB   | 15-20%    | < 50 ms        |
| Large    | < 100,000 items| 1 Hz           | 150-200 MB   | 25-30%    | < 200 ms       |

## Advanced Optimization Techniques

### Web Workers for Data Processing

```javascript
// main.js
let worker;

function initWorker() {
  worker = new Worker('data-worker.js');
  
  worker.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
      case 'processedData':
        updateChartWithData(data);
        break;
      case 'error':
        console.error('Worker error:', data);
        break;
    }
  };
}

function sendDataToWorker(data) {
  worker.postMessage({
    type: 'processData',
    data: data
  });
}

// data-worker.js
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'processData':
      try {
        const processed = processData(data);
        self.postMessage({
          type: 'processedData',
          data: processed
        });
      } catch (err) {
        self.postMessage({
          type: 'error',
          data: err.message
        });
      }
      break;
  }
};

function processData(data) {
  // CPU-intensive data transformations
  // ...
  return transformedData;
}
```

### Virtualization for Large Tables/Lists

```jsx
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// React component with virtualized list
function DataTable({ items }) {
  const Row = ({ index, style }) => (
    <div style={style} className="table-row">
      <div className="table-cell">{items[index].id}</div>
      <div className="table-cell">{items[index].name}</div>
      <div className="table-cell">{items[index].value}</div>
    </div>
  );
  
  return (
    <div style={{ height: '500px', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={items.length}
            itemSize={35}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
}
```

## Troubleshooting Performance Issues

### Common Issues and Solutions

#### High Memory Usage

**Symptoms:**
- Browser tab memory consumption keeps growing
- Application becomes sluggish over time
- Browser tab crashes

**Solutions:**
1. Check for memory leaks:
   - Detach event listeners when components unmount
   - Cancel subscriptions when no longer needed
   - Clear intervals and timeouts

2. Implement data windowing:
   ```javascript
   class DataWindow {
     constructor(maxLength = 1000) {
       this.maxLength = maxLength;
       this.data = [];
     }
     
     add(item) {
       this.data.push(item);
       
       if (this.data.length > this.maxLength) {
         this.data.shift(); // Remove oldest item
       }
     }
     
     getAll() {
       return this.data;
     }
   }
   
   // Usage
   const dataWindow = new DataWindow(1000);
   
   // When new data arrives
   connection.on("ReceiveDataPoint", (point) => {
     dataWindow.add(point);
     updateChart(dataWindow.getAll());
   });
   ```

#### Slow Rendering

**Symptoms:**
- UI updates lag behind data updates
- Choppy animations
- High CPU usage during rendering

**Solutions:**
1. Implement debouncing for UI updates:
   ```javascript
   function debounce(func, wait) {
     let timeout;
     return function(...args) {
       clearTimeout(timeout);
       timeout = setTimeout(() => func.apply(this, args), wait);
     };
   }
   
   const debouncedUpdate = debounce((data) => {
     chart.data = data;
     chart.update();
   }, 50); // Update every 50ms at most
   ```

2. Use requestAnimationFrame for timing-critical rendering:
   ```javascript
   class AnimationFrameUpdate {
     constructor(updateFn) {
       this.updateFn = updateFn;
       this.needsUpdate = false;
       this.data = null;
       this.animationFrameId = null;
     }
     
     update(data) {
       this.data = data;
       this.needsUpdate = true;
       
       if (!this.animationFrameId) {
         this.animationFrameId = requestAnimationFrame(() => this.performUpdate());
       }
     }
     
     performUpdate() {
       this.animationFrameId = null;
       
       if (this.needsUpdate) {
         this.updateFn(this.data);
         this.needsUpdate = false;
       }
     }
     
     cancel() {
       if (this.animationFrameId) {
         cancelAnimationFrame(this.animationFrameId);
         this.animationFrameId = null;
       }
     }
   }
   
   // Usage
   const chartUpdater = new AnimationFrameUpdate((data) => {
     chart.data = data;
     chart.update();
   });
   
   // When data changes
   connection.on("ReceiveData", (data) => {
     chartUpdater.update(data);
   });
   ```

#### Network Bottlenecks

**Symptoms:**
- Data arrives in bursts
- Long delays between updates
- Network tab shows large data transfers

**Solutions:**
1. Implement server-side data aggregation:
   ```csharp
   // C# server-side aggregation
   public class DataAggregator : BackgroundService
   {
       private readonly IHubContext<DataHub> _hubContext;
       private readonly IDataService _dataService;
       private readonly IOptions<AggregationOptions> _options;
       
       public DataAggregator(
           IHubContext<DataHub> hubContext,
           IDataService dataService,
           IOptions<AggregationOptions> options)
       {
           _hubContext = hubContext;
           _dataService = dataService;
           _options = options;
       }
       
       protected override async Task ExecuteAsync(CancellationToken stoppingToken)
       {
           var buffer = new List<DataPoint>();
           
           while (!stoppingToken.IsCancellationRequested)
           {
               // Get latest data points
               var newPoints = await _dataService.GetLatestDataPointsAsync();
               buffer.AddRange(newPoints);
               
               // Wait until buffer reaches threshold or max time elapsed
               if (buffer.Count >= _options.Value.BatchSize || 
                   buffer.Any() && DateTime.UtcNow - buffer[0].Timestamp >= _options.Value.MaxDelay)
               {
                   // Send aggregated data
                   await _hubContext.Clients.All.SendAsync("ReceiveDataBatch", buffer, stoppingToken);
                   buffer.Clear();
               }
               
               await Task.Delay(_options.Value.PollingInterval, stoppingToken);
           }
       }
   }
   ```

2. Implement binary data transfer formats:
   ```javascript
   // Use MessagePack for compact binary serialization
   import * as msgpack from '@msgpack/msgpack';
   
   // Sending data
   const connection = new signalR.HubConnectionBuilder()
     .withUrl("/datahub")
     .withHubProtocol(new signalR.protocols.msgpack.MessagePackHubProtocol())
     .build();
   
   // The SignalR MessagePack protocol will handle serialization/deserialization
   ```

### Performance Profiling Tools

#### Browser Developer Tools

Use Chrome DevTools to profile performance:

1. Memory usage:
   - Open Chrome DevTools > Memory tab
   - Take heap snapshots before and after operations
   - Compare snapshots to identify memory leaks

2. Performance timeline:
   - Open Chrome DevTools > Performance tab
   - Click "Record" and perform actions in the app
   - Analyze the timeline to identify bottlenecks

#### Custom Performance Markers

Add custom performance markers for precise timing:

```javascript
// Start performance measurement
performance.mark('dataProcessingStart');

// Perform data processing
const processedData = processData(rawData);

// End measurement and store
performance.mark('dataProcessingEnd');
performance.measure(
  'dataProcessingDuration',
  'dataProcessingStart',
  'dataProcessingEnd'
);

// Log results
const measures = performance.getEntriesByType('measure');
console.log(`Data processing took ${measures[0].duration.toFixed(2)}ms`);

// Clear marks and measures to avoid memory leaks
performance.clearMarks();
performance.clearMeasures();
```

## Summary

Optimizing the RealtimeDataTab for performance requires a multi-faceted approach:

1. **Implement appropriate caching strategies** at both client and server levels
2. **Optimize SignalR communication** through compression and targeted updates
3. **Manage memory effectively** using proper React patterns and garbage collection practices
4. **Optimize network usage** through delta updates and compression
5. **Enhance rendering performance** with canvas or WebGL-based optimizations
6. **Monitor and measure performance** to identify bottlenecks
7. **Apply advanced techniques** like web workers and virtualization for large datasets

By following these guidelines and implementing the techniques described in this document, your RealtimeDataTab application will deliver a responsive and efficient experience even when handling large volumes of real-time data within Microsoft Teams.
