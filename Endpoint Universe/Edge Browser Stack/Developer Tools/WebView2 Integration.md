## 1. Overview

### What is WebView2?

WebView2 is a Microsoft control that enables developers to embed web content in native applications using the Microsoft Edge (Chromium) rendering engine. It serves as a bridge between your desktop application and web technologies, allowing you to leverage the power of HTML, CSS, and JavaScript within traditional C# applications.

### Benefits for Enterprise and Internal Tooling

- **Unified Technology Stack**: Combine the best of native applications with modern web capabilities
- **Code Reusability**: Reuse existing web assets in desktop applications
- **Rapid Development**: Iterate faster on UI components using web technologies
- **Modern Web Features**: Access to the latest web standards and capabilities through Chromium
- **Enterprise Control**: Manage deployment and updates across your organization
- **Security Sandbox**: Web content runs in an isolated environment for enhanced security

### Common Use Cases

- **Administrative Tools**: Internal management portals with rich interfaces
- **Dashboards**: Data visualization and reporting tools
- **Embedded Portals**: Integrating web-based services into desktop workflows
- **Legacy Application Modernization**: Adding modern interfaces to existing systems
- **Documentation Viewers**: Rich content display with HTML rendering
- **Interactive Reports**: Combining local data processing with web visualization

## 2. Choosing the Runtime

WebView2 offers two runtime distribution options, each with distinct advantages for enterprise scenarios:

### Evergreen Runtime

The Evergreen Runtime automatically updates alongside Microsoft Edge, providing:

- **Always Up-to-Date**: Security patches and feature improvements without manual intervention
- **Reduced Maintenance**: No need to manually deploy runtime updates
- **Smaller Deployment Package**: The runtime isn't bundled with your application
- **Consistent Web Standards**: Access to the latest web capabilities

Installation options include:
- Online bootstrapper (MicrosoftEdgeWebView2Setup.exe)
- Offline installer for enterprise deployment

### Fixed Version Runtime

The Fixed Version Runtime offers version-locked deployment for consistent behavior:

- **Version Consistency**: Identical runtime across all machines
- **Controlled Updates**: Updates occur only when you choose to deploy them
- **Predictable Behavior**: No unexpected changes due to runtime updates
- **Application Testing**: Simplified testing against a specific runtime version

### Runtime Bundling Strategies

1. **Evergreen with Online Detection**:
   ```csharp
   // Check if WebView2 runtime is installed
   try
   {
       var version = CoreWebView2Environment.GetAvailableBrowserVersionString();
       // Runtime is available
   }
   catch (WebView2RuntimeNotFoundException)
   {
       // Prompt user to install runtime
       Process.Start(\"https://go.microsoft.com/fwlink/p/?LinkId=2124703\");
   }
   ```

2. **Evergreen with Bootstrapper**:
   - Include the WebView2 bootstrapper in your installer
   - Run the bootstrapper during application installation
   - Advantage: Works offline after initial installation

3. **Fixed Version Bundling**:
   - Download the Fixed Version Runtime from Microsoft
   - Include the runtime in your application folder
   - Specify the runtime path during WebView2 initialization
   - Advantage: Complete control over the runtime version

## 3. Initial Setup in C#

### Installing the WebView2 SDK via NuGet

1. **Open your project** in Visual Studio
2. **Right-click on your project** in Solution Explorer
3. **Select \"Manage NuGet Packages\"**
4. **Search for \"Microsoft.Web.WebView2\"**
5. **Install the package**

Alternatively, use the Package Manager Console:
```powershell
Install-Package Microsoft.Web.WebView2
```

### Creating a Basic WebView2 Instance

#### WinForms: Drag-and-Drop or Code

**Designer Method**:
1. Open your form in the designer
2. From the Toolbox, drag the WebView2 control onto your form
3. Configure properties in the Properties panel

**Code Method**:
```csharp
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public partial class Form1 : Form
{
    private WebView2 webView;

    public Form1()
    {
        InitializeComponent();
        InitializeAsync();
    }

    private async void InitializeAsync()
    {
        webView = new WebView2();
        webView.Dock = DockStyle.Fill;
        webView.DefaultBackgroundColor = Color.White;
        
        Controls.Add(webView);
        
        await webView.EnsureCoreWebView2Async(null);
        webView.CoreWebView2.Navigate(\"https://learn.microsoft.com\");
    }
}
```

#### WPF: XAML Binding + Backend Hookup

**XAML**:
```xml
<Window x:Class=\"WebView2WpfApp.MainWindow\"
        xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"
        xmlns:x=\"http://schemas.microsoft.com/winfx/2006/xaml\"
        xmlns:wv2=\"clr-namespace:Microsoft.Web.WebView2.Wpf;assembly=Microsoft.Web.WebView2.Wpf\"
        Title=\"WebView2 WPF Sample\" Height=\"450\" Width=\"800\">
    <Grid>
        <wv2:WebView2 x:Name=\"webView\" 
                     Source=\"https://learn.microsoft.com\" />
    </Grid>
</Window>
```

**Code-behind**:
```csharp
using Microsoft.Web.WebView2.Core;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        InitializeAsync();
    }

    private async void InitializeAsync()
    {
        await webView.EnsureCoreWebView2Async(null);
        webView.CoreWebView2.NavigationCompleted += CoreWebView2_NavigationCompleted;
    }

    private void CoreWebView2_NavigationCompleted(object sender, 
        CoreWebView2NavigationCompletedEventArgs e)
    {
        if (e.IsSuccess)
        {
            Title = webView.CoreWebView2.DocumentTitle;
        }
        else
        {
            MessageBox.Show($\"Navigation failed with error: {e.WebErrorStatus}\");
        }
    }
}
```

#### WinUI 3: Modern Desktop App Setup

**XAML**:
```xml
<Window
    x:Class=\"WebView2WinUIApp.MainWindow\"
    xmlns=\"http://schemas.microsoft.com/winfx/2006/xaml/presentation\"
    xmlns:x=\"http://schemas.microsoft.com/winfx/2006/xaml\"
    xmlns:d=\"http://schemas.microsoft.com/expression/blend/2008\"
    xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\"
    mc:Ignorable=\"d\">
    <Grid>
        <WebView2 x:Name=\"webView\" />
    </Grid>
</Window>
```

**Code-behind**:
```csharp
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;

public sealed partial class MainWindow : Window
{
    public MainWindow()
    {
        this.InitializeComponent();
        InitializeAsync();
    }

    private async void InitializeAsync()
    {
        await webView.EnsureCoreWebView2Async();
        webView.Source = new Uri(\"https://learn.microsoft.com\");
    }
}
```

### Setting Up Visual Studio Projects

For optimal WebView2 development:

1. **Target Framework**:
   - .NET Core 3.1 or later recommended
   - .NET Framework 4.6.2 or later is supported

2. **Platform Target**:
   - Add `<PlatformTarget>` with values AnyCPU, x86, or x64 to your project file
   - This resolves dependency issues, especially with authentication libraries

3. **Developer Tools**:
   - Enable during development: `webView.CoreWebView2.OpenDevToolsWindow();`
   - Disable for production builds

4. **Debugging Configuration**:
   - Enable \"Enable native code debugging\" in project properties
   - Add support for web debugging by checking \"Enable JavaScript debugging for ASP.NET\"

## 4. Rendering Web Apps in C#

### Hosting Local or Remote React/Angular Apps

**Local React/Angular App**:
```csharp
// Get the path to your web app files
string appDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, \"webapp\");
string indexPath = Path.Combine(appDirectory, \"index.html\");

// Convert local path to a URI
string indexUri = new Uri(indexPath).ToString();

// Navigate to the local file
await webView.EnsureCoreWebView2Async();
webView.CoreWebView2.Navigate(indexUri);
```

**Remote Web App**:
```csharp
await webView.EnsureCoreWebView2Async();

// For development environments
webView.CoreWebView2.Navigate(\"http://localhost:3000\");

// For production environments
webView.CoreWebView2.Navigate(\"https://yourdomain.com/webapp\");
```

### Loading SPAs (Single Page Applications)

When working with SPAs, additional configuration may be needed:

```csharp
await webView.EnsureCoreWebView2Async();

// Configure for SPA routing
webView.CoreWebView2.Settings.IsHistoryNavigationEnabled = true;
webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

// Handle navigation within the SPA
webView.CoreWebView2.NavigationStarting += (s, e) =>
{
    // Logic to handle route changes or external links
};

// Navigate to the SPA
webView.CoreWebView2.Navigate(\"https://yourapp.com\");
```

### Managing Azure AD Authentication Inside the Embedded View

Working with Azure AD authentication requires additional setup:

```csharp
await webView.EnsureCoreWebView2Async();

// Configure cookies for authentication
webView.CoreWebView2.CookieManager.DeleteAllCookies();

// Listen for navigation to auth endpoints
webView.CoreWebView2.NavigationStarting += (s, e) =>
{
    var uri = new Uri(e.Uri);
    if (uri.Host.Contains(\"login.microsoftonline.com\"))
    {
        // You can customize the auth experience here
        // For example, pre-fill organizational domain
    }
};

// Optional: Handle token directly with MSAL.NET
// Add Microsoft.Identity.Client NuGet package
using Microsoft.Identity.Client;

// Create public client application
var app = PublicClientApplicationBuilder
    .Create(\"YOUR-APP-ID\")
    .WithRedirectUri(\"https://your-redirect-uri\")
    .Build();

// Handle auth code in the WebView2
webView.CoreWebView2.NavigationCompleted += async (s, e) =>
{
    var uri = new Uri(webView.Source.ToString());
    if (uri.AbsolutePath.Contains(\"auth/callback\"))
    {
        // Extract auth code and exchange for tokens
        string code = uri.Query.Split('&')
            .FirstOrDefault(q => q.StartsWith(\"?code=\"))?.Substring(6);
            
        if (!string.IsNullOrEmpty(code))
        {
            var result = await app.AcquireTokenByAuthorizationCode(
                new[] { \"user.read\" },
                code
            ).ExecuteAsync();
            
            // Use the access token
            string accessToken = result.AccessToken;
        }
    }
};
```

## 5. Inter-process Communication

### JavaScript to C#

1. **Register event handler in C#**:
```csharp
await webView.EnsureCoreWebView2Async();

webView.CoreWebView2.WebMessageReceived += (s, e) =>
{
    string messageFromJs = e.WebMessageAsString;
    
    // Parse and process the message
    try
    {
        var data = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(messageFromJs);
        
        // Process the data
        string messageType = data[\"type\"].ToString();
        
        switch (messageType)
        {
            case \"getData\":
                SendDataToWebView();
                break;
            case \"saveData\":
                SaveDataFromWebView(data[\"payload\"]);
                break;
            default:
                Console.WriteLine($\"Unknown message type: {messageType}\");
                break;
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($\"Error processing message: {ex.Message}\");
    }
};
```

2. **Send message from JavaScript**:
```javascript
// In your web app
function sendMessageToHost(data) {
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({
            type: 'getData',
            payload: data
        }));
    }
}

// Example usage
document.getElementById('requestButton').addEventListener('click', () => {
    sendMessageToHost({ id: 123 });
});
```

### C# to JavaScript

1. **Execute script from C#**:
```csharp
private async Task UpdateUIFromCSharp(string data)
{
    // Ensure proper escaping of quotes and special characters
    string sanitizedData = System.Text.Json.JsonSerializer.Serialize(data);
    
    // Execute JavaScript
    string script = $\"updateDataFromHost({sanitizedData})\";
    await webView.CoreWebView2.ExecuteScriptAsync(script);
}

// Example usage
private async void btnSendData_Click(object sender, EventArgs e)
{
    string data = GetApplicationData();
    await UpdateUIFromCSharp(data);
}
```

2. **Receive data in JavaScript**:
```javascript
// In your web app
function updateDataFromHost(data) {
    console.log('Received data from host application:', data);
    
    // Update UI based on received data
    document.getElementById('hostData').textContent = JSON.stringify(data, null, 2);
}
```

### Structured Communication Pattern

For more complex applications, implement a structured messaging system:

```csharp
// C# Message Handler
private async void HandleWebViewMessages(object sender, CoreWebView2WebMessageReceivedEventArgs e)
{
    try
    {
        var message = System.Text.Json.JsonSerializer.Deserialize<WebViewMessage>(e.WebMessageAsString);
        
        switch (message.Action)
        {
            case \"getCustomers\":
                var customers = await _customerService.GetCustomersAsync();
                await SendToWebView(\"customersData\", customers);
                break;
                
            case \"saveCustomer\":
                var customer = System.Text.Json.JsonSerializer.Deserialize<Customer>(
                    message.Data.ToString());
                await _customerService.SaveCustomerAsync(customer);
                await SendToWebView(\"customerSaved\", new { Success = true });
                break;
                
            // Additional actions
        }
    }
    catch (Exception ex)
    {
        await SendToWebView(\"error\", new { Message = ex.Message });
    }
}

private async Task SendToWebView(string action, object data)
{
    var message = new { Action = action, Data = data };
    string json = System.Text.Json.JsonSerializer.Serialize(message);
    
    // Escape quotes for JavaScript
    json = json.Replace(\"\\\"\", \"\\\\\\\"\");
    
    await webView.CoreWebView2.ExecuteScriptAsync($\"window.processHostMessage(\\\"{json}\\\")\");
}

// Class to structure messages
public class WebViewMessage
{
    public string Action { get; set; }
    public object Data { get; set; }
}
```

## 6. Security Considerations

### Restricting Navigation to Trusted Domains

```csharp
await webView.EnsureCoreWebView2Async();

// Define trusted domains
var trustedDomains = new List<string> 
{
    \"https://learn.microsoft.com\",
    \"https://your-internal-app.company.com\"
};

// Monitor and block navigation to untrusted sites
webView.CoreWebView2.NavigationStarting += (s, e) =>
{
    bool isTrusted = false;
    Uri uri = new Uri(e.Uri);
    
    foreach (var domain in trustedDomains)
    {
        if (e.Uri.StartsWith(domain))
        {
            isTrusted = true;
            break;
        }
    }
    
    if (!isTrusted)
    {
        e.Cancel = true;
        MessageBox.Show($\"Navigation to {uri.Host} is not allowed.\");
    }
};
```

### Disabling Dev Tools and Right-Click

```csharp
await webView.EnsureCoreWebView2Async();

// Disable context menus (right-click)
webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

// Disable dev tools
webView.CoreWebView2.Settings.AreDevToolsEnabled = false;

// Disable right-click inspection via JavaScript
await webView.CoreWebView2.ExecuteScriptAsync(@\"
    document.addEventListener('contextmenu', event => event.preventDefault());
\");
```

### Managing Cookies, Sessions, and Local Storage

```csharp
// Clear cookies on application exit
private async void ClearCookiesAndStorage()
{
    await webView.CoreWebView2.ExecuteScriptAsync(@\"
        localStorage.clear();
        sessionStorage.clear();
    \");
    
    await webView.CoreWebView2.CookieManager.DeleteAllCookiesAsync();
}

// Configure cookie settings
webView.CoreWebView2.Settings.IsPinchZoomEnabled = true;

// Block third-party cookies
var env = await CoreWebView2Environment.CreateAsync(null, null, 
    new CoreWebView2EnvironmentOptions
    {
        AdditionalBrowserArguments = \"--block-new-web-contents --disable-third-party-cookies\"
    });
```

### Sandboxing the Browser Instance

```csharp
// Create environment with enhanced security options
var options = new CoreWebView2EnvironmentOptions
{
    AdditionalBrowserArguments = \"--disable-gpu --disable-extensions --disable-plugins\" +
        \" --disable-background-networking --disable-background-timer-throttling\" +
        \" --disable-backgrounding-occluded-windows --disable-breakpad\"
};

var env = await CoreWebView2Environment.CreateAsync(null, null, options);
await webView.EnsureCoreWebView2Async(env);

// Further lockdown settings
webView.CoreWebView2.Settings.IsScriptEnabled = true; // Enable only if needed
webView.CoreWebView2.Settings.AreHostObjectsAllowed = false;
webView.CoreWebView2.Settings.IsWebMessageEnabled = true; // Required for communication
webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
```

## 7. Performance Optimization

### Lazy Loading Large Scripts or Assets

1. **Implement lazy loading in your web content**:
```javascript
// In your web app
function lazyLoadModule(moduleName) {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = `modules/${moduleName}.js`;
        script.onload = () => resolve(true);
        document.head.appendChild(script);
    });
}

// Usage
async function onButtonClick() {
    const dataVisModule = await lazyLoadModule('data-visualization');
    // Use the module
    dataVisModule.initChart();
}
```

2. **Initialize WebView2 only when needed**:
```csharp
private WebView2 webView;
private bool isWebViewInitialized = false;

private async void InitializeWebViewOnDemand()
{
    if (!isWebViewInitialized)
    {
        LoadingIndicator.Visibility = Visibility.Visible;
        webView = new WebView2();
        MainContainer.Children.Add(webView);
        await webView.EnsureCoreWebView2Async();
        webView.CoreWebView2.Navigate(\"https://your-app.com\");
        isWebViewInitialized = true;
        LoadingIndicator.Visibility = Visibility.Collapsed;
    }
}
```

### Minimizing Overhead by Disabling Unused Features

```csharp
await webView.EnsureCoreWebView2Async();

// Disable features not needed for your application
webView.CoreWebView2.Settings.IsBuiltInErrorPageEnabled = false;
webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
webView.CoreWebView2.Settings.IsPinchZoomEnabled = false;
webView.CoreWebView2.Settings.IsSwipeNavigationEnabled = false;
webView.CoreWebView2.Settings.IsGeneralAutofillEnabled = false;
webView.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;

// Prevent unnecessary network requests
var options = new CoreWebView2EnvironmentOptions
{
    AdditionalBrowserArguments = \"--disable-background-networking --disable-domain-reliability\"
};
```

### Efficient Memory Management in Long-Running Apps

```csharp
// Periodically clean up resources
private void SetupPeriodicCleanup()
{
    var timer = new System.Threading.Timer(async (state) =>
    {
        await Dispatcher.InvokeAsync(async () =>
        {
            // Clear cache to prevent excessive growth
            await webView.CoreWebView2.ExecuteScriptAsync(@\"
                if (window.gc) {
                    window.gc();
                }
                
                // Clear console logs that may accumulate
                console.clear();
            \");
            
            // Suggest garbage collection
            GC.Collect();
            GC.WaitForPendingFinalizers();
        });
    }, null, TimeSpan.FromHours(1), TimeSpan.FromHours(1));
}

// Handle suspension/resume for memory optimization
private void OnAppSuspending(object sender, SuspendingEventArgs e)
{
    // Reduce memory footprint when app is not in foreground
    if (webView != null && webView.CoreWebView2 != null)
    {
        webView.CoreWebView2.ExecuteScriptAsync(\"document.body.style.display='none';\");
    }
}

private void OnAppResuming(object sender, object e)
{
    // Restore UI when app returns to foreground
    if (webView != null && webView.CoreWebView2 != null)
    {
        webView.CoreWebView2.ExecuteScriptAsync(\"document.body.style.display='';\");
    }
}
```

## 8. Logging and Monitoring

### Capturing Browser Console Output

```csharp
await webView.EnsureCoreWebView2Async();

// Subscribe to console messages
webView.CoreWebView2.ConsoleMessage += (s, e) =>
{
    string sourceId = e.SourceId;
    uint line = e.Line;
    string message = e.Message;
    
    // Log based on severity
    switch (e.Severity)
    {
        case CoreWebView2ConsoleMessageSeverity.Error:
            Logger.LogError($\"WebView Error: {message} at {sourceId}:{line}\");
            break;
        case CoreWebView2ConsoleMessageSeverity.Warning:
            Logger.LogWarning($\"WebView Warning: {message} at {sourceId}:{line}\");
            break;
        default:
            Logger.LogInformation($\"WebView Log: {message} at {sourceId}:{line}\");
            break;
    }
};

// Inject console logger to capture additional details
await webView.CoreWebView2.ExecuteScriptAsync(@\"
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = function() {
        const args = Array.from(arguments);
        originalConsoleLog.apply(console, args);
    };
    
    console.error = function() {
        const args = Array.from(arguments);
        originalConsoleError.apply(console, args);
    };
    
    console.warn = function() {
        const args = Array.from(arguments);
        originalConsoleWarn.apply(console, args);
    };
    
    window.addEventListener('error', function(e) {
        console.error('Uncaught error:', e.error);
    });
\");
```

### Hooking into WebView2 Events

```csharp
await webView.EnsureCoreWebView2Async();

// Navigation events
webView.CoreWebView2.NavigationStarting += (s, e) => 
    Logger.LogInformation($\"Navigation starting: {e.Uri}\");
    
webView.CoreWebView2.NavigationCompleted += (s, e) => 
    Logger.LogInformation($\"Navigation completed: {e.IsSuccess}, Status: {e.WebErrorStatus}\");

webView.CoreWebView2.DownloadStarting += (s, e) => 
    Logger.LogInformation($\"Download starting: {e.DownloadOperation.Uri}\");

// Process events
webView.CoreWebView2.ProcessFailed += (s, e) => 
{
    var kind = e.ProcessFailedKind;
    Logger.LogError($\"WebView process failed: {kind}\");
    
    if (kind == CoreWebView2ProcessFailedKind.BrowserProcessExited)
    {
        // Critical failure - attempt recovery
        RestartWebView();
    }
};

// Permission requests
webView.CoreWebView2.PermissionRequested += (s, e) =>
{
    var kind = e.PermissionKind;
    var uri = e.Uri;
    
    Logger.LogInformation($\"Permission requested: {kind} for {uri}\");
    
    // Automatically deny certain permissions
    if (kind == CoreWebView2PermissionKind.Geolocation ||
        kind == CoreWebView2PermissionKind.Camera ||
        kind == CoreWebView2PermissionKind.Microphone)
    {
        e.State = CoreWebView2PermissionState.Deny;
    }
};
```

### Debugging Unexpected Errors or Blank Loads

```csharp
private async Task DiagnoseBlankScreen()
{
    try
    {
        // Check if webview is properly initialized
        if (webView.CoreWebView2 == null)
        {
            Logger.LogError(\"CoreWebView2 is null - initialization failed\");
            return;
        }
        
        // Check for rendering issues
        string visibility = await webView.CoreWebView2.ExecuteScriptAsync(
            \"document.body ? document.body.style.visibility : 'unknown'\");
        Logger.LogInformation($\"Body visibility: {visibility}\");
        
        // Check document state
        string readyState = await webView.CoreWebView2.ExecuteScriptAsync(
            \"document.readyState\");
        Logger.LogInformation($\"Document ready state: {readyState}\");
        
        // Check for JavaScript errors
        await webView.CoreWebView2.ExecuteScriptAsync(@\"
            if (window.diagnosticInfo === undefined) {
                window.diagnosticInfo = {
                    errors: [],
                    captures: []
                };
                
                window.addEventListener('error', function(e) {
                    window.diagnosticInfo.errors.push({
                        message: e.message,
                        source: e.filename,
                        line: e.lineno,
                        time: new Date().toISOString()
                    });
                });
            }
            
            // Capture DOM state
            window.diagnosticInfo.captures.push({
                time: new Date().toISOString(),
                bodyChildren: document.body ? document.body.children.length : 0,
                documentElement: document.documentElement ? true : false,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            });
            
            JSON.stringify(window.diagnosticInfo);
        \");
        
        // Force repaint as a potential fix
        await webView.CoreWebView2.ExecuteScriptAsync(@\"
            if (document.body) {
                // Force reflow
                void document.body.offsetHeight;
                
                // Toggle visibility to trigger repaint
                document.body.style.visibility = 'hidden';
                setTimeout(function() {
                    document.body.style.visibility = 'visible';
                }, 50);
            }
        \");
    }
    catch (Exception ex)
    {
        Logger.LogError($\"Diagnostics error: {ex.Message}\");
    }
}

// Detect potential blank screen issues
webView.CoreWebView2.NavigationCompleted += async (s, e) =>
{
    if (e.IsSuccess)
    {
        // Check if page might be blank after successful load
        await Task.Delay(500); // Allow time for rendering
        
        // Check if content is visible
        string contentCheck = await webView.CoreWebView2.ExecuteScriptAsync(@\"
            (function() {
                if (!document.body) return 'no-body';
                if (document.body.children.length === 0) return 'empty-body';
                return 'has-content';
            })()
        \");
        
        if (contentCheck != \"has-content\")
        {
            Logger.LogWarning($\"Possible blank screen detected: {contentCheck}\");
            await DiagnoseBlankScreen();
        }
    }
};
```

## 9. Enterprise Deployment

### Distributing WebView2 Runtime with Your C# App

#### Evergreen Runtime Approach

```csharp
// Check for WebView2 runtime and prompt for installation if needed
private async Task<bool> EnsureWebView2Runtime()
{
    try
    {
        // Check if runtime is available
        string version = CoreWebView2Environment.GetAvailableBrowserVersionString();
        return true;
    }
    catch (WebView2RuntimeNotFoundException)
    {
        // Runtime not found
        var result = MessageBox.Show(
            \"This application requires the WebView2 Runtime to be installed. \" +
            \"Would you like to download and install it now?\",
            \"WebView2 Runtime Required\",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Information);
            
        if (result == DialogResult.Yes)
        {
            // Launch bootstrapper
            string bootstrapperPath = Path.Combine(
                AppDomain.CurrentDomain.BaseDirectory, 
                \"MicrosoftEdgeWebView2Setup.exe\");
                
            if (File.Exists(bootstrapperPath))
            {
                // Execute local bootstrapper
                var process = Process.Start(bootstrapperPath);
                await process.WaitForExitAsync();
                return process.ExitCode == 0;
            }
            else
            {
                // Download online bootstrapper
                Process.Start(\"https://go.microsoft.com/fwlink/p/?LinkId=2124703\");
                MessageBox.Show(
                    \"Please restart the application after installing WebView2 Runtime.\",
                    \"Restart Required\",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return false;
            }
        }
        
        return false;
    }
}
```

#### Fixed Version Runtime Approach

```csharp
// Initialize WebView2 with Fixed Version Runtime
private async Task InitializeWithFixedRuntime()
{
    // Path to the fixed version runtime relative to the application
    string runtimePath = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory, 
        "WebView2Runtime");
        
    try
    {
        // Create environment using the fixed version
        var env = await CoreWebView2Environment.CreateAsync(
            runtimePath, 
            Path.Combine(Path.GetTempPath(), "WebView2UserData"));
            
        // Initialize WebView2 with the custom environment
        await webView.EnsureCoreWebView2Async(env);
        
        // Continue with initialization
        webView.CoreWebView2.Navigate("https://yourapp.com");
    }
    catch (Exception ex)
    {
        Logger.LogError($"WebView2 initialization failed: {ex.Message}");
        MessageBox.Show("Failed to initialize WebView2. Please contact IT support.", 
            "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}