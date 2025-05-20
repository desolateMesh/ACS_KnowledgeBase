## Table of Contents
- [Introduction](#introduction)
- [API Security Fundamentals](#api-security-fundamentals)
- [Authentication Methods](#authentication-methods)
  - [API Keys](#api-keys)
  - [OAuth 2.0](#oauth-20)
  - [JWT Implementation](#jwt-implementation)
  - [OpenID Connect](#openid-connect)
  - [Mutual TLS (mTLS)](#mutual-tls-mtls)
- [Authorization Frameworks](#authorization-frameworks)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Attribute-Based Access Control (ABAC)](#attribute-based-access-control-abac)
  - [Policy-Based Access Control](#policy-based-access-control)
- [API Gateway Implementation](#api-gateway-implementation)
  - [Azure API Management](#azure-api-management)
  - [AWS API Gateway](#aws-api-gateway)
  - [Kong API Gateway](#kong-api-gateway)
- [Rate Limiting and Throttling](#rate-limiting-and-throttling)
- [Input Validation and Sanitization](#input-validation-and-sanitization)
- [Data Encryption Strategies](#data-encryption-strategies)
- [API Vulnerability Scanning](#api-vulnerability-scanning)
- [API Security Monitoring](#api-security-monitoring)
- [Incident Response for API Security](#incident-response-for-api-security)
- [Secure API Development Lifecycle](#secure-api-development-lifecycle)
- [Containerized API Security](#containerized-api-security)
- [Serverless API Security](#serverless-api-security)
- [Regulatory Compliance for APIs](#regulatory-compliance-for-apis)
- [API Security Testing](#api-security-testing)
- [Common API Attack Vectors and Mitigations](#common-api-attack-vectors-and-mitigations)
- [References and Resources](#references-and-resources)

## Introduction

Application Programming Interfaces (APIs) enable systems to communicate with each other, facilitating data exchange and service integration across diverse platforms and applications. However, APIs also represent a significant attack surface that requires robust security controls. This document provides comprehensive guidance on implementing secure APIs, protecting sensitive data, and maintaining regulatory compliance.

The guidance in this document applies to RESTful APIs, GraphQL, SOAP, gRPC, and WebSockets. Security controls should be tailored based on the specific API architecture, data sensitivity, and threat landscape.

## API Security Fundamentals

### Key API Security Principles

1. **Defense in Depth**: Implement multiple layers of security controls to protect APIs
2. **Principle of Least Privilege**: Grant only necessary permissions required for operation
3. **Zero Trust Architecture**: Verify every request regardless of origin
4. **Secure by Design**: Integrate security throughout the API development lifecycle
5. **Continuous Validation**: Regularly test and monitor API security posture

### Critical API Security Controls

| Security Control | Purpose | Implementation Priority |
|------------------|---------|-------------------------|
| Authentication | Verify identity of API clients | Critical |
| Authorization | Enforce access policies | Critical |
| Transport Security | Protect data in transit | Critical |
| Input Validation | Prevent injection attacks | Critical |
| Rate Limiting | Mitigate DoS attacks | High |
| Output Encoding | Prevent data leakage | High |
| Logging & Monitoring | Detect security incidents | High |
| API Inventory | Track API assets | Medium |

## Authentication Methods

### API Keys

API keys provide a simple authentication mechanism but should only be used for low-risk scenarios or in combination with other security controls.

#### Implementation Example

```csharp
// ASP.NET Core API Key Authentication Handler
public class ApiKeyAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private const string ApiKeyHeaderName = \"X-API-Key\";
    private readonly IApiKeyValidator _apiKeyValidator;
    
    public ApiKeyAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock,
        IApiKeyValidator apiKeyValidator) : base(options, logger, encoder, clock)
    {
        _apiKeyValidator = apiKeyValidator;
    }
    
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(ApiKeyHeaderName, out var apiKeyHeaderValues))
        {
            return AuthenticateResult.Fail(\"API Key header not found.\");
        }
        
        var providedApiKey = apiKeyHeaderValues.FirstOrDefault();
        
        if (string.IsNullOrWhiteSpace(providedApiKey))
        {
            return AuthenticateResult.Fail(\"API Key cannot be empty.\");
        }
        
        var isValidApiKey = await _apiKeyValidator.IsValidApiKeyAsync(providedApiKey);
        
        if (!isValidApiKey)
        {
            return AuthenticateResult.Fail(\"Invalid API Key provided.\");
        }
        
        var identity = new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.Name, \"API Client\")
        }, Scheme.Name);
        
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        
        return AuthenticateResult.Success(ticket);
    }
}

// Register API Key Authentication in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = \"ApiKey\";
        options.DefaultChallengeScheme = \"ApiKey\";
    })
    .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthHandler>(\"ApiKey\", null);
    
    services.AddSingleton<IApiKeyValidator, ApiKeyValidator>();
}
```

#### API Key Security Considerations

1. **API Key Storage**: Store API keys securely using hashing algorithms (like PBKDF2, Argon2) rather than plaintext.
2. **Key Rotation**: Implement automatic key rotation policies (e.g., every 90 days).
3. **Transport Security**: Always transmit API keys over HTTPS/TLS.
4. **Revocation Mechanism**: Implement capability to immediately revoke compromised keys.
5. **Scope Limitation**: Restrict API keys to specific operations or resources.

Example API key storage implementation:

```csharp
public class ApiKeyValidator : IApiKeyValidator
{
    private readonly IRepository<ApiKeyEntity> _repository;
    private readonly IEncryptionService _encryptionService;
    
    public ApiKeyValidator(IRepository<ApiKeyEntity> repository, IEncryptionService encryptionService)
    {
        _repository = repository;
        _encryptionService = encryptionService;
    }
    
    public async Task<bool> IsValidApiKeyAsync(string providedApiKey)
    {
        // Avoid timing attacks by using a constant-time comparison
        var allApiKeys = await _repository.GetAllAsync();
        
        foreach (var storedKey in allApiKeys)
        {
            if (!storedKey.IsActive || storedKey.ExpirationDate < DateTime.UtcNow)
            {
                continue;
            }
            
            if (_encryptionService.ConstantTimeEquals(providedApiKey, storedKey.HashedKey))
            {
                // Update last used timestamp
                storedKey.LastUsed = DateTime.UtcNow;
                await _repository.UpdateAsync(storedKey);
                return true;
            }
        }
        
        return false;
    }
}
```

### OAuth 2.0

OAuth 2.0 is an industry-standard authorization framework that provides secure delegated access to API resources.

#### OAuth 2.0 Grant Types

| Grant Type | Use Case | Security Level |
|------------|----------|----------------|
| Authorization Code | Server-side web apps | High |
| Authorization Code with PKCE | Mobile/SPA apps | High |
| Client Credentials | Service-to-service | Medium-High |
| Resource Owner Password | Legacy applications | Low |
| Implicit Flow (deprecated) | Browser-based apps | Low |
| Device Code | Limited input devices | Medium |

#### OAuth 2.0 Implementation with IdentityServer4

```csharp
// Startup.cs configuration for IdentityServer4
public void ConfigureServices(IServiceCollection services)
{
    // Add IdentityServer
    services.AddIdentityServer()
        .AddDeveloperSigningCredential() // Use AddSigningCredential() in production
        .AddInMemoryApiScopes(Config.ApiScopes)
        .AddInMemoryClients(Config.Clients)
        .AddInMemoryApiResources(Config.ApiResources);
    
    // Add API authentication
    services.AddAuthentication(\"Bearer\")
        .AddJwtBearer(\"Bearer\", options =>
        {
            options.Authority = \"https://identity.example.com\";
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = true,
                ValidAudience = \"api1\",
                ValidateIssuer = true,
                ValidIssuer = \"https://identity.example.com\",
                ValidateLifetime = true
            };
        });
}

// Configuration
public static class Config
{
    public static IEnumerable<ApiScope> ApiScopes =>
        new ApiScope[]
        {
            new ApiScope(\"api1.read\", \"Read access to API 1\"),
            new ApiScope(\"api1.write\", \"Write access to API 1\")
        };
    
    public static IEnumerable<ApiResource> ApiResources =>
        new ApiResource[]
        {
            new ApiResource(\"api1\", \"API 1\")
            {
                Scopes = { \"api1.read\", \"api1.write\" }
            }
        };
    
    public static IEnumerable<Client> Clients =>
        new Client[]
        {
            // Client credentials client
            new Client
            {
                ClientId = \"service_client\",
                ClientSecrets = { new Secret(\"secret\".Sha256()) },
                AllowedGrantTypes = GrantTypes.ClientCredentials,
                AllowedScopes = { \"api1.read\", \"api1.write\" }
            },
            
            // Authorization code client
            new Client
            {
                ClientId = \"web_client\",
                ClientSecrets = { new Secret(\"secret\".Sha256()) },
                AllowedGrantTypes = GrantTypes.Code,
                RedirectUris = { \"https://client.example.com/callback\" },
                PostLogoutRedirectUris = { \"https://client.example.com/signout-callback\" },
                RequirePkce = true,
                AllowedScopes = { \"api1.read\", \"openid\", \"profile\" },
                RequireConsent = true,
                AccessTokenLifetime = 3600, // 1 hour
                RefreshTokenUsage = TokenUsage.OneTimeOnly,
                RefreshTokenExpiration = TokenExpiration.Absolute,
                AbsoluteRefreshTokenLifetime = 2592000, // 30 days
                UpdateAccessTokenClaimsOnRefresh = true
            }
        };
}
```

#### OAuth 2.0 Security Considerations

1. **Enforce PKCE**: Always use PKCE (Proof Key for Code Exchange) for public clients.
2. **Token Storage**: Store tokens in secure HTTP-only cookies or secure storage mechanisms.
3. **Scope Restriction**: Implement the principle of least privilege with granular scopes.
4. **Short-lived Tokens**: Set appropriate token lifetimes (e.g., access tokens: 1 hour, refresh tokens: 14-30 days).
5. **Certificate-based Authentication**: For high-security environments, use certificate-based client authentication.
6. **State Parameter**: Always validate the state parameter to prevent CSRF attacks.
7. **Redirect URI Validation**: Strictly validate redirect URIs against a whitelist.

Example OAuth client implementation:

```csharp
public class OAuthClient
{
    private readonly HttpClient _httpClient;
    private readonly ITokenStore _tokenStore;
    private readonly OAuthOptions _options;
    
    public OAuthClient(HttpClient httpClient, ITokenStore tokenStore, OAuthOptions options)
    {
        _httpClient = httpClient;
        _tokenStore = tokenStore;
        _options = options;
    }
    
    public async Task<string> GetAuthorizationUrlAsync()
    {
        var codeVerifier = GenerateCodeVerifier();
        var codeChallenge = GenerateCodeChallenge(codeVerifier);
        var state = GenerateState();
        
        // Store code_verifier and state for later verification
        await _tokenStore.StoreAsync(\"code_verifier\", codeVerifier);
        await _tokenStore.StoreAsync(\"state\", state);
        
        var queryParams = new Dictionary<string, string>
        {
            [\"response_type\"] = \"code\",
            [\"client_id\"] = _options.ClientId,
            [\"redirect_uri\"] = _options.RedirectUri,
            [\"scope\"] = string.Join(\" \", _options.Scopes),
            [\"state\"] = state,
            [\"code_challenge\"] = codeChallenge,
            [\"code_challenge_method\"] = \"S256\"
        };
        
        var queryString = string.Join(\"&\", queryParams.Select(p => $\"{p.Key}={Uri.EscapeDataString(p.Value)}\"));
        return $\"{_options.AuthorizationEndpoint}?{queryString}\";
    }
    
    public async Task<TokenResponse> ExchangeCodeForTokensAsync(string code, string returnedState)
    {
        // Verify state to prevent CSRF
        var savedState = await _tokenStore.RetrieveAsync(\"state\");
        if (savedState != returnedState)
        {
            throw new SecurityException(\"Invalid state parameter\");
        }
        
        var codeVerifier = await _tokenStore.RetrieveAsync(\"code_verifier\");
        
        var tokenRequestParams = new Dictionary<string, string>
        {
            [\"grant_type\"] = \"authorization_code\",
            [\"code\"] = code,
            [\"redirect_uri\"] = _options.RedirectUri,
            [\"client_id\"] = _options.ClientId,
            [\"client_secret\"] = _options.ClientSecret, // Only for confidential clients
            [\"code_verifier\"] = codeVerifier
        };
        
        var request = new HttpRequestMessage(HttpMethod.Post, _options.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(tokenRequestParams)
        };
        
        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<TokenResponse>(content);
    }
    
    private string GenerateCodeVerifier()
    {
        var bytes = new byte[64];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return Convert.ToBase64String(bytes)
            .Replace(\"+\", \"-\")
            .Replace(\"/\", \"_\")
            .Replace(\"=\", \"\");
    }
    
    private string GenerateCodeChallenge(string codeVerifier)
    {
        using (var sha256 = SHA256.Create())
        {
            var challengeBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(codeVerifier));
            return Convert.ToBase64String(challengeBytes)
                .Replace(\"+\", \"-\")
                .Replace(\"/\", \"_\")
                .Replace(\"=\", \"\");
        }
    }
    
    private string GenerateState()
    {
        var stateBytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(stateBytes);
        }
        return Convert.ToBase64String(stateBytes);
    }
}
```

### JWT Implementation

JSON Web Tokens (JWT) provide a compact, self-contained means of representing claims securely between parties.

#### JWT Structure

1. **Header**: Specifies token type and signing algorithm
2. **Payload**: Contains claims (assertions about an entity)
3. **Signature**: Ensures token integrity and authenticity

#### Implementing JWT Authentication in ASP.NET Core

```csharp
// Startup.cs JWT Authentication Configuration
public void ConfigureServices(IServiceCollection services)
{
    // Add JWT Authentication
    services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = Configuration[\"Jwt:Issuer\"],
            ValidAudience = Configuration[\"Jwt:Audience\"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(Configuration[\"Jwt:Key\"])),
            ClockSkew = TimeSpan.Zero // Reduce the default 5 min clock skew
        };
        
        // Capture JWT validation errors for logging
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                {
                    context.Response.Headers.Add(\"Token-Expired\", \"true\");
                }
                return Task.CompletedTask;
            }
        };
    });
}

// JWT Token Service Implementation
public class JwtTokenService : ITokenService
{
    private readonly JwtOptions _jwtOptions;
    private readonly ILogger<JwtTokenService> _logger;
    
    public JwtTokenService(IOptions<JwtOptions> jwtOptions, ILogger<JwtTokenService> logger)
    {
        _jwtOptions = jwtOptions.Value;
        _logger = logger;
    }
    
    public string GenerateToken(User user, IEnumerable<string> roles)
    {
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(\"name\", user.Name)
        };
        
        // Add roles as claims
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiryMinutes),
            signingCredentials: creds
        );
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    
    public bool ValidateToken(string token, out ClaimsPrincipal principal)
    {
        principal = null;
        
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtOptions.SecretKey);
            
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _jwtOptions.Issuer,
                ValidAudience = _jwtOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = TimeSpan.Zero
            };
            
            SecurityToken validatedToken;
            principal = tokenHandler.ValidateToken(token, validationParameters, out validatedToken);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Token validation failed\");
            return false;
        }
    }
}
```

#### JWT Security Considerations

1. **Signing Algorithm**: Use strong algorithms like RS256 (asymmetric) rather than HS256 (symmetric) for high-security environments.
2. **Claims Minimization**: Include only necessary claims to reduce token size and limit sensitive information exposure.
3. **Short Lifetimes**: Keep access tokens short-lived (15-60 minutes).
4. **Secure Storage**: Store JWTs securely (HTTP-only cookies for web applications).
5. **Don't Store Sensitive Data**: Never store sensitive data in JWT payloads (tokens can be decoded).
6. **Token Revocation Strategy**: Implement a token blacklist or use a Redis cache for immediate token revocation.
7. **Algorithm Validation**: Explicitly validate the signing algorithm to prevent algorithm switching attacks.

Example JWT token blacklist implementation:

```csharp
public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<TokenBlacklistService> _logger;
    
    public TokenBlacklistService(IDistributedCache cache, ILogger<TokenBlacklistService> logger)
    {
        _cache = cache;
        _logger = logger;
    }
    
    public async Task BlacklistTokenAsync(string token, DateTime expiryTime)
    {
        try
        {
            var tokenId = ExtractJti(token);
            if (string.IsNullOrEmpty(tokenId))
            {
                _logger.LogWarning(\"Could not extract JTI from token during blacklisting\");
                return;
            }
            
            // Calculate time until token expiry
            var expiryTimespan = expiryTime - DateTime.UtcNow;
            if (expiryTimespan <= TimeSpan.Zero)
            {
                // Token already expired, no need to blacklist
                return;
            }
            
            // Add token to blacklist with expiry matching the token's expiry
            await _cache.SetStringAsync(
                $\"blacklist_token_{tokenId}\",
                DateTime.UtcNow.ToString(\"O\"),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = expiryTimespan
                });
            
            _logger.LogInformation(\"Token {TokenId} blacklisted until {ExpiryTime}\", tokenId, expiryTime);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error blacklisting token\");
            throw;
        }
    }
    
    public async Task<bool> IsTokenBlacklistedAsync(string token)
    {
        try
        {
            var tokenId = ExtractJti(token);
            if (string.IsNullOrEmpty(tokenId))
            {
                _logger.LogWarning(\"Could not extract JTI from token during blacklist check\");
                return true; // Fail secure - if we can't verify, assume blacklisted
            }
            
            var cachedValue = await _cache.GetStringAsync($\"blacklist_token_{tokenId}\");
            return cachedValue != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error checking token blacklist\");
            return true; // Fail secure
        }
    }
    
    private string ExtractJti(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            if (handler.CanReadToken(token))
            {
                var jwtToken = handler.ReadJwtToken(token);
                return jwtToken.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error extracting JTI from token\");
        }
        
        return null;
    }
}

// Using the blacklist in JWT validation
options.Events = new JwtBearerEvents
{
    OnTokenValidated = async context =>
    {
        var tokenBlacklistService = context.HttpContext.RequestServices
            .GetRequiredService<ITokenBlacklistService>();
            
        var token = context.SecurityToken as JwtSecurityToken;
        if (token != null)
        {
            var isBlacklisted = await tokenBlacklistService
                .IsTokenBlacklistedAsync(context.Request.Headers[\"Authorization\"].ToString().Replace(\"Bearer \", \"\"));
                
            if (isBlacklisted)
            {
                context.Fail(\"Token has been revoked\");
            }
        }
    }
};
```

### OpenID Connect

OpenID Connect (OIDC) is an identity layer built on top of OAuth 2.0, providing authentication capabilities in addition to authorization.

#### OIDC Flows

| Flow | Description | Use Case |
|------|-------------|----------|
| Authorization Code | Most secure, returns code | Server-side web apps |
| Implicit | Returns tokens directly to client | Legacy browser apps (not recommended) |
| Hybrid | Returns both code and tokens | Native apps with immediate access need |

#### ASP.NET Core OIDC Client Implementation

```csharp
// Startup.cs OIDC Client Configuration
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthentication(options =>
    {
        options.DefaultScheme = \"Cookies\";
        options.DefaultChallengeScheme = \"oidc\";
    })
    .AddCookie(\"Cookies\")
    .AddOpenIdConnect(\"oidc\", options =>
    {
        options.Authority = \"https://identity.example.com\";
        options.ClientId = \"mvc_client\";
        options.ClientSecret = \"secret\";
        options.ResponseType = \"code\";
        options.Scope.Add(\"openid\");
        options.Scope.Add(\"profile\");
        options.Scope.Add(\"api1.read\");
        options.SaveTokens = true;
        options.GetClaimsFromUserInfoEndpoint = true;
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            NameClaimType = \"name\",
            RoleClaimType = \"role\"
        };
        
        // PKCE support (required for public clients)
        options.UsePkce = true;
        
        // Security options
        options.RequireHttpsMetadata = true;
        
        // Events for additional security validation
        options.Events = new OpenIdConnectEvents
        {
            OnRedirectToIdentityProvider = context =>
            {
                // Add additional parameters or modify the request
                return Task.CompletedTask;
            },
            
            OnTokenValidated = context =>
            {
                // Additional validation or claim transformation
                var identity = context.Principal.Identity as ClaimsIdentity;
                
                // Add additional claims or transform existing ones
                if (identity != null)
                {
                    // Example: Add a new claim based on existing ones
                    var nameClaim = identity.FindFirst(\"name\");
                    if (nameClaim != null)
                    {
                        identity.AddClaim(new Claim(\"display_name\", nameClaim.Value));
                    }
                }
                
                return Task.CompletedTask;
            }
        };
    });
}
```

#### OIDC Security Considerations

1. **Front-Channel Logout**: Implement front-channel logout for improved security.
2. **ID Token Validation**: Validate all ID tokens including signature, issuer, audience, and expiration.
3. **Refresh Token Rotation**: Use rotation of refresh tokens for enhanced security.
4. **Nonce Verification**: Always verify the nonce parameter to prevent replay attacks.
5. **Response Mode Concerns**: Use form_post response mode instead of fragment for better security.
6. **Silent Authentication**: For SPAs, implement silent authentication with refresh tokens.

Example OIDC token validator:

```csharp
public class OidcTokenValidator : ITokenValidator
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OidcOptions _options;
    private readonly ILogger<OidcTokenValidator> _logger;
    
    public OidcTokenValidator(
        IHttpClientFactory httpClientFactory,
        IOptions<OidcOptions> options,
        ILogger<OidcTokenValidator> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }
    
    public async Task<ClaimsPrincipal> ValidateTokenAsync(string token)
    {
        try
        {
            // Fetch discovery document
            var discoveryClient = _httpClientFactory.CreateClient();
            var discoveryDoc = await discoveryClient.GetDiscoveryDocumentAsync(_options.Authority);
            
            if (discoveryDoc.IsError)
            {
                _logger.LogError(\"Error retrieving discovery document: {Error}\", discoveryDoc.Error);
                throw new SecurityException(\"Unable to retrieve OIDC discovery document\");
            }
            
            // Fetch the signing keys
            var client = _httpClientFactory.CreateClient();
            var jwksResponse = await client.GetAsync(discoveryDoc.JwksUri);
            jwksResponse.EnsureSuccessStatusCode();
            
            var jwksJson = await jwksResponse.Content.ReadAsStringAsync();
            var jwks = new JsonWebKeySet(jwksJson);
            
            // Set up validation parameters
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = discoveryDoc.Issuer,
                ValidateAudience = true,
                ValidAudience = _options.ClientId,
                ValidateLifetime = true,
                IssuerSigningKeys = jwks.Keys,
                ValidateIssuerSigningKey = true,
                ClockSkew = TimeSpan.FromMinutes(2)
            };
            
            // Validate the token
            var handler = new JwtSecurityTokenHandler();
            SecurityToken validatedToken;
            var principal = handler.ValidateToken(token, validationParameters, out validatedToken);
            
            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Token validation failed\");
            throw new SecurityException(\"Token validation failed\", ex);
        }
    }
}
```

### Mutual TLS (mTLS)

Mutual TLS (mTLS) provides strong authentication by requiring both client and server to present certificates.

#### Implementing mTLS in ASP.NET Core

```csharp
// Startup.cs mTLS Configuration
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthentication(CertificateAuthenticationDefaults.AuthenticationScheme)
        .AddCertificate(options =>
        {
            // Basic certificate validation
            options.AllowedCertificateTypes = CertificateTypes.All;
            
            // Check certificate revocation
            options.RevocationMode = X509RevocationMode.Online;
            options.RevocationFlag = X509RevocationFlag.ExcludeRoot;
            
            // Add custom validation logic
            options.ValidateCertificateUse = true;
            options.ValidateValidityPeriod = true;
            
            // Events for custom validation
            options.Events = new CertificateAuthenticationEvents
            {
                OnCertificateValidated = context =>
                {
                    var validationService = context.HttpContext.RequestServices
                        .GetRequiredService<ICertificateValidationService>();
                    
                    if (validationService.ValidateCertificate(context.ClientCertificate))
                    {
                        var claims = new[]
                        {
                            new Claim(
                                ClaimTypes.NameIdentifier,
                                context.ClientCertificate.Subject,
                                ClaimValueTypes.String,
                                context.Options.ClaimsIssuer),
                            new Claim(
                                ClaimTypes.Name,
                                context.ClientCertificate.Subject,
                                ClaimValueTypes.String,
                                context.Options.ClaimsIssuer)
                        };
                        
                        context.Principal = new ClaimsPrincipal(
                            new ClaimsIdentity(claims, context.Scheme.Name));
                        context.Success();
                    }
                    
                    return Task.CompletedTask;
                }
            };
        });
}

// Kestrel webserver configuration for requiring client certificates
public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
    WebHost.CreateDefaultBuilder(args)
        .ConfigureKestrel(options =>
        {
            options.ConfigureHttpsDefaults(opt =>
            {
                opt.ServerCertificate = new X509Certificate2(\"server.pfx\", \"password\");
                opt.ClientCertificateMode = ClientCertificateMode.RequireCertificate;
                opt.CheckCertificateRevocation = true;
            });
        })
        .UseStartup<Startup>();

// Custom certificate validation service
public class CertificateValidationService : ICertificateValidationService
{
    private readonly ICertificateStore _certificateStore;
    private readonly ILogger<CertificateValidationService> _logger;
    
    public CertificateValidationService(
        ICertificateStore certificateStore,
        ILogger<CertificateValidationService> logger)
    {
        _certificateStore = certificateStore;
        _logger = logger;
    }
    
    public bool ValidateCertificate(X509Certificate2 certificate)
    {
        try
        {
            // Check if the certificate is in our trusted store
            if (!_certificateStore.IsTrustedCertificate(certificate.Thumbprint))
            {
                _logger.LogWarning(\"Certificate {Thumbprint} is not in trusted store\", certificate.Thumbprint);
                return false;
            }
            
            // Verify the certificate is not expired
            if (DateTime.Now < certificate.NotBefore || DateTime.Now > certificate.NotAfter)
            {
                _logger.LogWarning(\"Certificate {Thumbprint} is outside its validity period\", certificate.Thumbprint);
                return false;
            }
            
            // Verify certificate chain
            using (var chain = new X509Chain())
            {
                chain.ChainPolicy.RevocationMode = X509RevocationMode.Online;
                chain.ChainPolicy.RevocationFlag = X509RevocationFlag.EntireChain;
                chain.ChainPolicy.VerificationFlags = X509VerificationFlags.NoFlag;
                
                if (!chain.Build(certificate))
                {
                    foreach (var status in chain.ChainStatus)
                    {
                        _logger.LogWarning(\"Certificate {Thumbprint} chain error: {Status}\", 
                            certificate.Thumbprint, status.StatusInformation);
                    }
                    return false;
                }
                
                // Additional custom validation logic can be added here
                
                return true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error validating certificate {Thumbprint}\", certificate.Thumbprint);
            return false;
        }
    }
}
```

#### Client Implementation for mTLS

```csharp
public class MtlsHttpClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MtlsHttpClient> _logger;
    
    public MtlsHttpClient(X509Certificate2 clientCertificate, ILogger<MtlsHttpClient> logger)
    {
        _logger = logger;
        
        var handler = new HttpClientHandler();
        handler.ClientCertificates.Add(clientCertificate);
        handler.ServerCertificateCustomValidationCallback = ValidateServerCertificate;
        
        _httpClient = new HttpClient(handler);
    }
    
    public async Task<string> GetAsync(string url)
    {
        try
        {
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error making mTLS request to {Url}\", url);
            throw;
        }
    }
    
    private bool ValidateServerCertificate(
        HttpRequestMessage request,
        X509Certificate2 certificate, 
        X509Chain chain,
        SslPolicyErrors errors)
    {
        // Implement custom server certificate validation logic
        if (errors == SslPolicyErrors.None)
        {
            return true;
        }
        
        _logger.LogWarning(\"Server certificate validation errors: {Errors}\", errors);
        
        // Additional validation logic
        // For example, pin the expected certificate thumbprint
        var expectedThumbprint = \"EXPECTED_THUMBPRINT\";
        if (certificate.Thumbprint.Equals(expectedThumbprint, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        
        return false;
    }
}
```

#### mTLS Security Considerations

1. **Certificate Management**: Implement robust certificate lifecycle management.
2. **Private Key Protection**: Secure client private keys using hardware security modules (HSMs) when possible.
3. **Certificate Revocation**: Implement and check certificate revocation lists (CRLs) or OCSP.
4. **Certificate Pinning**: Consider certificate pinning for highly sensitive APIs.
5. **Strong Cipher Suites**: Configure servers to only accept strong cipher suites.
6. **Automation**: Automate certificate renewal and deployment processes.

## Authorization Frameworks

### Role-Based Access Control (RBAC)

RBAC assigns permissions to roles, and users are assigned to those roles, simplifying access management.

#### ASP.NET Core RBAC Implementation

```csharp
// Role-based authorization in controllers
[Authorize(Roles = \"Admin\")]
public class AdminController : Controller
{
    [HttpGet]
    public IActionResult Dashboard()
    {
        return View();
    }
    
    [Authorize(Roles = \"SuperAdmin\")] // Further restriction for specific action
    [HttpPost]
    public async Task<IActionResult> DeleteUser(string userId)
    {
        // Implementation
    }
}

// Role-based authorization with policy
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthorization(options =>
    {
        options.AddPolicy(\"RequireAdminRole\", policy => 
            policy.RequireRole(\"Admin\"));
            
        options.AddPolicy(\"DataManagement\", policy =>
            policy.RequireRole(\"DataAdmin\", \"DataOperator\"));
            
        options.AddPolicy(\"UserManagement\", policy =>
            policy.RequireRole(\"UserAdmin\")
                 .RequireClaim(\"Department\", \"HR\"));
    });
}

// Using policy-based authorization
[Authorize(Policy = \"UserManagement\")]
public class UserManagementController : Controller
{
    // Implementation
}
```

#### RBAC Database Schema

```csharp
public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    // Other user properties
    
    public ICollection<UserRole> UserRoles { get; set; }
}

public class Role
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    
    public ICollection<UserRole> UserRoles { get; set; }
    public ICollection<RolePermission> RolePermissions { get; set; }
}

public class Permission
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public string Resource { get; set; }
    public string Action { get; set; }
    
    public ICollection<RolePermission> RolePermissions { get; set; }
}

// Join tables
public class UserRole
{
    public int UserId { get; set; }
    public User User { get; set; }
    
    public int RoleId { get; set; }
    public Role Role { get; set; }
}

public class RolePermission
{
    public int RoleId { get; set; }
    public Role Role { get; set; }
    
    public int PermissionId { get; set; }
    public Permission Permission { get; set; }
}
```

#### RBAC Security Considerations

1. **Role Explosion**: Avoid creating too many roles; use attribute-based access control for fine-grained permissions.
2. **Least Privilege**: Assign the minimum roles needed for users to perform their jobs.
3. **Role Hierarchies**: Implement role hierarchies for complex organizations.
4. **Separation of Duties**: Enforce separation of duties for sensitive operations.
5. **Regular Reviews**: Conduct periodic role and permission reviews (quarterly).
6. **Logging**: Maintain comprehensive logs of role assignments and changes.

### Attribute-Based Access Control (ABAC)

ABAC makes access decisions based on attributes associated with users, resources, actions, and context.

#### ASP.NET Core ABAC Implementation

```csharp
// Custom authorization requirement
public class MinimumAgeRequirement : IAuthorizationRequirement
{
    public int MinimumAge { get; }
    
    public MinimumAgeRequirement(int minimumAge)
    {
        MinimumAge = minimumAge;
    }
}

// Custom authorization handler
public class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        MinimumAgeRequirement requirement)
    {
        if (!context.User.HasClaim(c => c.Type == ClaimTypes.DateOfBirth))
        {
            return Task.CompletedTask;
        }
        
        var dateOfBirthClaim = context.User.FindFirst(c => c.Type == ClaimTypes.DateOfBirth);
        var dateOfBirth = Convert.ToDateTime(dateOfBirthClaim.Value);
        var age = DateTime.Today.Year - dateOfBirth.Year;
        
        if (dateOfBirth > DateTime.Today.AddYears(-age))
        {
            age--;
        }
        
        if (age >= requirement.MinimumAge)
        {
            context.Succeed(requirement);
        }
        
        return Task.CompletedTask;
    }
}

// Department-specific data access requirement
public class DepartmentDataAccessRequirement : IAuthorizationRequirement
{
    public string Department { get; }
    public string AccessLevel { get; }
    
    public DepartmentDataAccessRequirement(string department, string accessLevel)
    {
        Department = department;
        AccessLevel = accessLevel;
    }
}

// Department data access handler
public class DepartmentDataAccessHandler : AuthorizationHandler<DepartmentDataAccessRequirement, CustomerData>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DepartmentDataAccessRequirement requirement,
        CustomerData resource)
    {
        if (!context.User.HasClaim(c => c.Type == \"Department\"))
        {
            return Task.CompletedTask;
        }
        
        // Check if user is in the required department
        var departmentClaim = context.User.FindFirst(c => c.Type == \"Department\");
        if (departmentClaim.Value != requirement.Department)
        {
            return Task.CompletedTask;
        }
        
        // Check if user has required access level
        if (!context.User.HasClaim(c => c.Type == \"AccessLevel\"))
        {
            return Task.CompletedTask;
        }
        
        var accessLevelClaim = context.User.FindFirst(c => c.Type == \"AccessLevel\");
        var userAccessLevel = accessLevelClaim.Value;
        
        // Check if resource belongs to user's region (additional attribute)
        if (context.User.HasClaim(c => c.Type == \"Region\"))
        {
            var regionClaim = context.User.FindFirst(c => c.Type == \"Region\");
            if (resource.Region != regionClaim.Value)
            {
                return Task.CompletedTask;
            }
        }
        
        // Define access level hierarchy
        var accessLevels = new Dictionary<string, int>
        {
            { \"Read\", 1 },
            { \"Write\", 2 },
            { \"Admin\", 3 }
        };
        
        // Check if user's access level is sufficient
        if (accessLevels.TryGetValue(userAccessLevel, out var userLevel) &&
            accessLevels.TryGetValue(requirement.AccessLevel, out var requiredLevel))
        {
            if (userLevel >= requiredLevel)
            {
                context.Succeed(requirement);
            }
        }
        
        return Task.CompletedTask;
    }
}

// Register the handlers
public void ConfigureServices(IServiceCollection services)
{
    services.AddAuthorization(options =>
    {
        options.AddPolicy(\"Over18\", policy =>
            policy.Requirements.Add(new MinimumAgeRequirement(18)));
            
        options.AddPolicy(\"FinanceReadAccess\", policy =>
            policy.Requirements.Add(new DepartmentDataAccessRequirement(\"Finance\", \"Read\")));
            
        options.AddPolicy(\"HRAdminAccess\", policy =>
            policy.Requirements.Add(new DepartmentDataAccessRequirement(\"HR\", \"Admin\")));
    });
    
    // Register authorization handlers
    services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();
    services.AddSingleton<IAuthorizationHandler, DepartmentDataAccessHandler>();
}

// Using the policies
[Authorize(Policy = \"Over18\")]
public class AdultContentController : Controller
{
    // Implementation
}

// Resource-based authorization
public class CustomerDataController : Controller
{
    private readonly IAuthorizationService _authorizationService;
    
    public CustomerDataController(IAuthorizationService authorizationService)
    {
        _authorizationService = authorizationService;
    }
    
    [HttpGet(\"{id}\")]
    public async Task<IActionResult> Get(int id)
    {
        var customerData = await _repository.GetCustomerDataAsync(id);
        
        var authResult = await _authorizationService.AuthorizeAsync(
            User, customerData, \"FinanceReadAccess\");
            
        if (!authResult.Succeeded)
        {
            return Forbid();
        }
        
        return Ok(customerData);
    }
}
```

#### ABAC Security Considerations

1. **Complex Rules**: Be cautious of overly complex attribute rules that can be difficult to audit.
2. **Performance Impact**: ABAC can impact performance; consider caching authorization decisions.
3. **Attribute Validation**: Validate user-provided attributes through trusted sources.
4. **Rule Conflicts**: Establish conflict resolution procedures for contradictory rules.
5. **Dynamic Evaluation**: Implement real-time attribute evaluation for high-security contexts.

### Policy-Based Access Control

Policy-based access control centralizes authorization decisions through policies defined in a policy engine.

#### Open Policy Agent (OPA) Implementation

```csharp
// ASP.NET Core middleware for Open Policy Agent integration
public class OpaPolicyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpaPolicyMiddleware> _logger;
    
    public OpaPolicyMiddleware(
        RequestDelegate next,
        IHttpClientFactory httpClientFactory,
        ILogger<OpaPolicyMiddleware> logger)
    {
        _next = next;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // Build input for OPA evaluation
            var input = BuildOpaInput(context);
            
            // Check policy
            var allowed = await EvaluatePolicyAsync(input);
            
            if (!allowed)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsync(\"Forbidden by policy\");
                return;
            }
            
            // Continue with the request
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error in OPA policy evaluation\");
            
            // Fail closed - deny access on error
            context.Response.StatusCode = 500;
            await context.Response.WriteAsync(\"Policy evaluation error\");
        }
    }
    
    private object BuildOpaInput(HttpContext context)
    {
        // Extract user information from claims
        var user = new Dictionary<string, object>();
        if (context.User.Identity.IsAuthenticated)
        {
            var claims = context.User.Claims.ToDictionary(
                c => c.Type,
                c => (object)c.Value);
                
            user[\"claims\"] = claims;
        }
        
        // Extract request information
        var request = new Dictionary<string, object>
        {
            { \"method\", context.Request.Method },
            { \"path\", context.Request.Path.Value.Split('/').Where(p => !string.IsNullOrEmpty(p)).ToArray() },
            { \"query_params\", context.Request.Query.ToDictionary(q => q.Key, q => q.Value.ToString()) }
        };
        
        // Extract headers (may contain additional context information)
        var headers = context.Request.Headers.ToDictionary(
            h => h.Key,
            h => (object)h.Value.ToString());
            
        return new Dictionary<string, object>
        {
            { \"user\", user },
            { \"request\", request },
            { \"headers\", headers },
            { \"resource\", context.GetEndpoint()?.DisplayName }
        };
    }
    
    private async Task<bool> EvaluatePolicyAsync(object input)
    {
        var client = _httpClientFactory.CreateClient(\"OPA\");
        
        var requestContent = new StringContent(
            JsonSerializer.Serialize(new { input }),
            Encoding.UTF8,
            \"application/json\");
            
        var response = await client.PostAsync(\"/v1/data/api/authz/allow\", requestContent);
        
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(\"OPA returned non-success status code: {StatusCode}\", response.StatusCode);
            return false; // Fail closed
        }
        
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<OpaResult>(content);
        
        return result?.Result?.Allow ?? false;
    }
    
    private class OpaResult
    {
        public ResultData Result { get; set; }
        
        public class ResultData
        {
            public bool Allow { get; set; }
        }
    }
}

// Extension method to add the middleware
public static class OpaPolicyMiddlewareExtensions
{
    public static IApplicationBuilder UseOpaPolicy(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<OpaPolicyMiddleware>();
    }
}

// Startup.cs configuration
public void ConfigureServices(IServiceCollection services)
{
    services.AddHttpClient(\"OPA\", client =>
    {
        client.BaseAddress = new Uri(\"http://opa:8181\"); // OPA service URI
        client.DefaultRequestHeaders.Add(\"Accept\", \"application/json\");
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Add the OPA middleware
    app.UseOpaPolicy();
    
    // Other middleware
}
```

#### Example Rego Policy

```
package api.authz

default allow = false

# Allow developers to access any resource in their own projects
allow {
    # User has developer role
    input.user.claims.role == \"developer\"
    
    # Extract project from request path
    project_id = input.request.path[0]
    
    # Verify user has access to this project
    user_projects = data.projects[input.user.claims.sub]
    project_id == user_projects[_]
}

# Allow admins to access any resource
allow {
    # User has admin role
    input.user.claims.role == \"admin\"
}

# Allow specific read operations for authenticated users
allow {
    # Request is a GET
    input.request.method == \"GET\"
    
    # Path starts with /api/public
    input.request.path[0] == \"api\"
    input.request.path[1] == \"public\"
    
    # User is authenticated
    input.user.claims.sub != null
}
```

#### Policy-Based Access Control Security Considerations

1. **Policy Versioning**: Implement versioning for policies and track changes.
2. **Centralized Management**: Use a central repository for policy definitions.
3. **Policy Testing**: Thoroughly test policies before deployment.
4. **Audit Logging**: Log all policy decisions for audit trails.
5. **Fail-Closed Approach**: Default to denying access when policy evaluation fails.
6. **Performance Optimization**: Cache policy decisions for frequently accessed resources.

## API Gateway Implementation

### Azure API Management

Azure API Management (APIM) provides a comprehensive API gateway solution with security, monitoring, and developer portal capabilities.

#### Key Security Features

1. **Authentication**: OAuth 2.0, JWT, API keys, client certificates
2. **Rate Limiting**: Request throttling at different scopes
3. **IP Filtering**: Restrict access based on IP addresses/ranges
4. **Backend Security**: Send client certificates to backend services
5. **Content Validation**: Schema validation of requests/responses

#### Azure API Management Setup with ARM Template

```json
{
  \"$schema\": \"https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#\",
  \"contentVersion\": \"1.0.0.0\",
  \"parameters\": {
    \"apiManagementServiceName\": {
      \"type\": \"string\"
    },
    \"publisherEmail\": {
      \"type\": \"string\"
    },
    \"publisherName\": {
      \"type\": \"string\"
    },
    \"sku\": {
      \"type\": \"string\",
      \"defaultValue\": \"Developer\",
      \"allowedValues\": [
        \"Developer\",
        \"Basic\",
        \"Standard\",
        \"Premium\"
      ]
    },
    \"skuCount\": {
      \"type\": \"int\",
      \"defaultValue\": 1
    },
    \"location\": {
      \"type\": \"string\",
      \"defaultValue\": \"[resourceGroup().location]\"
    }
  },
  \"resources\": [
    {
      \"apiVersion\": \"2020-06-01-preview\",
      \"name\": \"[parameters('apiManagementServiceName')]\",
      \"type\": \"Microsoft.ApiManagement/service\",
      \"location\": \"[parameters('location')]\",
      \"sku\": {
        \"name\": \"[parameters('sku')]\",
        \"capacity\": \"[parameters('skuCount')]\"
      },
      \"properties\": {
        \"publisherEmail\": \"[parameters('publisherEmail')]\",
        \"publisherName\": \"[parameters('publisherName')]\"
      },
      \"resources\": [
        {
          \"apiVersion\": \"2020-06-01-preview\",
          \"type\": \"apis\",
          \"name\": \"secure-api\",
          \"dependsOn\": [
            \"[concat('Microsoft.ApiManagement/service/', parameters('apiManagementServiceName'))]\"
          ],
          \"properties\": {
            \"displayName\": \"Secure API\",
            \"description\": \"A secure API with various security policies\",
            \"subscriptionRequired\": true,
            \"serviceUrl\": \"https://backend-service.example.com\",
            \"path\": \"secure\",
            \"protocols\": [
              \"https\"
            ]
          },
          \"resources\": [
            {
              \"apiVersion\": \"2020-06-01-preview\",
              \"type\": \"operations\",
              \"name\": \"get-data\",
              \"dependsOn\": [
                \"[concat('Microsoft.ApiManagement/service/', parameters('apiManagementServiceName'), '/apis/secure-api')]\"
              ],
              \"properties\": {
                \"displayName\": \"Get Data\",
                \"method\": \"GET\",
                \"urlTemplate\": \"/data\",
                \"description\": \"Get secure data\"
              }
            },
            {
              \"apiVersion\": \"2020-06-01-preview\",
              \"type\": \"policies\",
              \"name\": \"policy\",
              \"dependsOn\": [
                \"[concat('Microsoft.ApiManagement/service/', parameters('apiManagementServiceName'), '/apis/secure-api')]\"
              ],
              \"properties\": {
                \"value\": \"<policies>\\r\
  <inbound>\\r\
    <base />\\r\
    <cors>\\r\
      <allowed-origins>\\r\
        <origin>https://trusted-app.example.com</origin>\\r\
      </allowed-origins>\\r\
      <allowed-methods>\\r\
        <method>GET</method>\\r\
        <method>POST</method>\\r\
      </allowed-methods>\\r\
      <allowed-headers>\\r\
        <header>Content-Type</header>\\r\
        <header>Authorization</header>\\r\
      </allowed-headers>\\r\
    </cors>\\r\
    <validate-jwt header-name=\\\"Authorization\\\" failed-validation-httpcode=\\\"401\\\" failed-validation-error-message=\\\"Invalid JWT token\\\">\\r\
      <openid-config url=\\\"https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration\\\" />\\r\
      <required-claims>\\r\
        <claim name=\\\"aud\\\">\\r\
          <value>api://my-api-id</value>\\r\
        </claim>\\r\
      </required-claims>\\r\
    </validate-jwt>\\r\
    <rate-limit calls=\\\"5\\\" renewal-period=\\\"60\\\" />\\r\
    <ip-filter action=\\\"allow\\\">\\r\
      <address>203.0.113.0/24</address>\\r\
    </ip-filter>\\r\
    <check-header name=\\\"Content-Type\\\" failed-check-httpcode=\\\"400\\\" failed-check-error-message=\\\"Unsupported content type\\\" ignore-case=\\\"true\\\">\\r\
      <value>application/json</value>\\r\
    </check-header>\\r\
  </inbound>\\r\
  <backend>\\r\
    <forward-request timeout=\\\"60\\\" follow-redirects=\\\"true\\\" />\\r\
  </backend>\\r\
  <outbound>\\r\
    <base />\\r\
    <set-header name=\\\"X-Content-Type-Options\\\" exists-action=\\\"override\\\">\\r\
      <value>nosniff</value>\\r\
    </set-header>\\r\
    <set-header name=\\\"Strict-Transport-Security\\\" exists-action=\\\"override\\\">\\r\
      <value>max-age=31536000; includeSubDomains</value>\\r\
    </set-header>\\r\
    <set-header name=\\\"X-Frame-Options\\\" exists-action=\\\"override\\\">\\r\
      <value>deny</value>\\r\
    </set-header>\\r\
    <set-header name=\\\"X-XSS-Protection\\\" exists-action=\\\"override\\\">\\r\
      <value>1; mode=block</value>\\r\
    </set-header>\\r\
    <set-header name=\\\"Cache-Control\\\" exists-action=\\\"override\\\">\\r\
      <value>no-store, no-cache</value>\\r\
    </set-header>\\r\
  </outbound>\\r\
  <on-error>\\r\
    <base />\\r\
    <set-header name=\\\"X-Error-Source\\\" exists-action=\\\"override\\\">\\r\
      <value>API Management</value>\\r\
    </set-header>\\r\
    <set-body template=\\\"liquid\\\">\\r\
      { \\\"error\\\": { \\\"code\\\": \\\"{{context.LastError.Code}}\\\", \\\"message\\\": \\\"An error occurred during processing\\\", \\\"requestId\\\": \\\"{{context.RequestId}}\\\" } }\\r\
    </set-body>\\r\
  </on-error>\\r\
</policies>\",
                \"format\": \"xml\"
              }
            }
          ]
        },
        {
          \"apiVersion\": \"2020-06-01-preview\",
          \"type\": \"products\",
          \"name\": \"secure-product\",
          \"dependsOn\": [
            \"[concat('Microsoft.ApiManagement/service/', parameters('apiManagementServiceName'))]\"
          ],
          \"properties\": {
            \"displayName\": \"Secure Product\",
            \"description\": \"Secure product with API key and approval required\",
            \"subscriptionRequired\": true,
            \"approvalRequired\": true,
            \"state\": \"published\"
          },
          \"resources\": [
            {
              \"apiVersion\": \"2020-06-01-preview\",
              \"type\": \"apis\",
              \"name\": \"secure-api\",
              \"dependsOn\": [
                \"[concat('Microsoft.ApiManagement/service/', parameters('apiManagementServiceName'), '/products/secure-product')]\",
                \"[concat('Microsoft.ApiManagement/service/', parameters('apiManagementServiceName'), '/apis/secure-api')]\"
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

#### Custom JWT Validation Policy

```xml
<policies>
  <inbound>
    <base />
    <validate-jwt header-name=\"Authorization\" failed-validation-httpcode=\"401\" require-scheme=\"Bearer\">
      <openid-config url=\"https://identity.example.com/.well-known/openid-configuration\" />
      <audiences>
        <audience>https://api.example.com</audience>
      </audiences>
      <issuers>
        <issuer>https://identity.example.com</issuer>
      </issuers>
      <required-claims>
        <claim name=\"scope\" match=\"all\">
          <value>api.read</value>
        </claim>
        <claim name=\"client_id\" />
      </required-claims>
    </validate-jwt>
    <set-variable name=\"userId\" value=\"@{
      var jwt = context.Request.Headers.GetValueOrDefault(\"Authorization\",\"\").AsJwt();
      return jwt.Claims.GetValueOrDefault(\"sub\", \"\");
    }\" />
    <cache-lookup-value key=\"@(\"user-permissions-\" + context.Variables[\"userId\"])\" variable-name=\"userPermissions\" />
    <choose>
      <when condition=\"@(!context.Variables.ContainsKey(\"userPermissions\"))\">
        <send-request mode=\"new\" response-variable-name=\"permissionsResponse\" timeout=\"20\" ignore-error=\"true\">
          <set-url>@(\"https://permissions-service.example.com/users/\" + context.Variables[\"userId\"] + \"/permissions\")</set-url>
          <set-method>GET</set-method>
          <authentication-certificate thumbprint=\"0123456789ABCDEF0123456789ABCDEF01234567\" />
        </send-request>
        <choose>
          <when condition=\"@(((IResponse)context.Variables[\"permissionsResponse\"]).StatusCode == 200)\">
            <set-variable name=\"userPermissions\" value=\"@(((IResponse)context.Variables[\"permissionsResponse\"]).Body.As<string>())\" />
            <cache-store-value key=\"@(\"user-permissions-\" + context.Variables[\"userId\"])\" value=\"@((string)context.Variables[\"userPermissions\"])\" duration=\"300\" />
          </when>
          <otherwise>
            <return-response>
              <set-status code=\"500\" reason=\"Internal Server Error\" />
              <set-header name=\"Content-Type\" exists-action=\"override\">
                <value>application/json</value>
              </set-header>
              <set-body>{\"error\": \"Failed to retrieve user permissions\"}</set-body>
            </return-response>
          </otherwise>
        </choose>
      </when>
    </choose>
    <!-- Check if user has required permission -->
    <choose>
      <when condition=\"@(!context.Variables.ContainsKey(\"userPermissions\") || !((string)context.Variables[\"userPermissions\"]).Contains(\"read:data\"))\">
        <return-response>
          <set-status code=\"403\" reason=\"Forbidden\" />
          <set-header name=\"Content-Type\" exists-action=\"override\">
            <value>application/json</value>
          </set-header>
          <set-body>{\"error\": \"Insufficient permissions\"}</set-body>
        </return-response>
      </when>
    </choose>
  </inbound>
  <backend>
    <base />
  </backend>
  <outbound>
    <base />
  </outbound>
  <on-error>
    <base />
  </on-error>
</policies>
```

#### Azure API Management Security Best Practices

1. **Network Security**: Deploy APIM in an internal virtual network for enhanced security.
2. **Managed Identities**: Use managed identities to access Azure resources securely.
3. **Application Insights**: Enable detailed logging and monitoring with Application Insights.
4. **IP Restriction**: Configure IP restrictions at both the APIM and individual API levels.
5. **Client Certificate Authentication**: Enforce client certificates for high-security APIs.
6. **Secrets Management**: Store API secrets in Azure Key Vault rather than directly in APIM.
7. **Custom Domains with TLS**: Configure custom domains with strong TLS protocols (TLS 1.2+).

Example KeyVault integration:

```csharp
// ARM template for KeyVault reference in APIM
{
  \"properties\": {
    \"value\": \"<policies>\\r\
  <inbound>\\r\
    <base />\\r\
    <authentication-managed-identity resource=\\\"https://vault.azure.net\\\" />\\r\
    <send-request mode=\\\"new\\\" response-variable-name=\\\"kvResponse\\\" timeout=\\\"20\\\" ignore-error=\\\"true\\\">\\r\
      <set-url>{{KeyVaultUri}}/secrets/apiBackendKey/{{KeyVaultSecretVersion}}?api-version=7.0</set-url>\\r\
      <set-method>GET</set-method>\\r\
    </send-request>\\r\
    <set-header name=\\\"x-api-key\\\" exists-action=\\\"override\\\">\\r\
      <value>@{\\r\
          JObject kvResponseBody = ((IResponse)context.Variables[\\\"kvResponse\\\"]).Body.As<JObject>();\\r\
          return kvResponseBody[\\\"value\\\"].ToString();\\r\
      }</value>\\r\
    </set-header>\\r\
  </inbound>\\r\
</policies>\",
    \"format\": \"xml\"
  }
}
```

### AWS API Gateway

AWS API Gateway provides a robust service for creating, publishing, maintaining, and securing APIs.

#### Key Security Features

1. **AWS IAM Authorization**: Leverage AWS Identity and Access Management.
2. **Amazon Cognito Integration**: User pool integration for authentication.
3. **Lambda Authorizers**: Custom authorization logic using Lambda functions.
4. **API Keys and Usage Plans**: Control API access and throttling.
5. **WAF Integration**: Web Application Firewall for protecting APIs.

#### AWS API Gateway Implementation with CloudFormation

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  SecureApiGateway:
    Type: 'AWS::ApiGateway::RestApi'
    Properties:
      Name: 'SecureAPI'
      Description: 'Secure API Gateway with multiple authorization methods'
      EndpointConfiguration:
        Types:
          - REGIONAL
      MinimumCompressionSize: 1024
      ApiKeySourceType: HEADER

  # Cognito User Pool for Authentication
  UserPool:
    Type: 'AWS::Cognito::UserPool'
    Properties:
      UserPoolName: 'api-users'
      MfaConfiguration: 'OFF'
      AutoVerifiedAttributes:
        - email
      Policies:
        PasswordPolicy:
          MinimumLength: 12
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: true
          RequireUppercase: true
          TemporaryPasswordValidityDays: 7
      Schema:
        - Name: email
          AttributeDataType: String
          Mutable: false
          Required: true
        - Name: name
          AttributeDataType: String
          Mutable: true
          Required: true

  # Cognito User Pool Client
  UserPoolClient:
    Type: 'AWS::Cognito::UserPoolClient'
    Properties:
      ClientName: 'api-client'
      UserPoolId: !Ref UserPool
      GenerateSecret: true
      AllowedOAuthFlows:
        - code
        - implicit
      AllowedOAuthFlowsUserPoolClient: true
      AllowedOAuthScopes:
        - email
        - openid
        - profile
      CallbackURLs:
        - 'https://client.example.com/callback'
      SupportedIdentityProviders:
        - COGNITO

  # Authorizer for Cognito
  CognitoAuthorizer:
    Type: 'AWS::ApiGateway::Authorizer'
    Properties:
      Name: 'cognito-authorizer'
      RestApiId: !Ref SecureApiGateway
      Type: COGNITO_USER_POOLS
      IdentitySource: 'method.request.header.Authorization'
      ProviderARNs:
        - !GetAtt UserPool.Arn

  # Lambda Function for Custom Authorizer
  CustomAuthorizerFunction:
    Type: 'AWS::Lambda::Function'
    Properties:
      Handler: 'index.handler'
      Role: !GetAtt LambdaExecutionRole.Arn
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            console.log('Event: ', JSON.stringify(event, null, 2));
            
            // Get token from header
            const token = event.authorizationToken;
            if (!token) {
              throw new Error('Unauthorized');
            }
            
            // Implement token validation logic
            // This is a simplified example
            if (token === 'valid-token') {
              return generatePolicy('user', 'Allow', event.methodArn);
            }
            
            throw new Error('Unauthorized');
          };
          
          // Generate IAM policy for API Gateway
          function generatePolicy(principalId, effect, resource) {
            const policy = {
              principalId: principalId,
              policyDocument: {
                Version: '2012-10-17',
                Statement: [{
                  Action: 'execute-api:Invoke',
                  Effect: effect,
                  Resource: resource
                }]
              },
              context: {
                // Additional context values if needed
                userId: 'user-id',
                scope: 'read:data'
              }
            };
            
            return policy;
          }
      Runtime: 'nodejs14.x'
      Timeout: 10
      MemorySize: 128

  # Custom Lambda Authorizer
  LambdaAuthorizer:
    Type: 'AWS::ApiGateway::Authorizer'
    Properties:
      Name: 'custom-lambda-authorizer'
      RestApiId: !Ref SecureApiGateway
      Type: TOKEN
      IdentitySource: 'method.request.header.Authorization'
      AuthorizerUri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${CustomAuthorizerFunction.Arn}/invocations'
      AuthorizerResultTtlInSeconds: 300

  # API Resource
  ApiResource:
    Type: 'AWS::ApiGateway::Resource'
    Properties:
      RestApiId: !Ref SecureApiGateway
      ParentId: !GetAtt SecureApiGateway.RootResourceId
      PathPart: 'data'

  # GET Method with Cognito Authorizer
  GetMethod:
    Type: 'AWS::ApiGateway::Method'
    Properties:
      RestApiId: !Ref SecureApiGateway
      ResourceId: !Ref ApiResource
      HttpMethod: 'GET'
      AuthorizationType: 'COGNITO_USER_POOLS'
      AuthorizerId: !Ref CognitoAuthorizer
      ApiKeyRequired: false
      RequestParameters:
        'method.request.header.Content-Type': true
      Integration:
        Type: 'AWS'
        IntegrationHttpMethod: 'POST'
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${BackendFunction.Arn}/invocations'
        PassthroughBehavior: 'WHEN_NO_MATCH'
        IntegrationResponses:
          - StatusCode: '200'
            ResponseParameters:
              'method.response.header.Content-Type': \"'application/json'\"
              'method.response.header.X-Content-Type-Options': \"'nosniff'\"
              'method.response.header.X-Frame-Options': \"'DENY'\"
              'method.response.header.X-XSS-Protection': \"'1; mode=block'\"
          - StatusCode: '400'
            SelectionPattern: '.*BadRequest.*'
            ResponseParameters:
              'method.response.header.Content-Type': \"'application/json'\"
      MethodResponses:
        - StatusCode: '200'
          ResponseParameters:
            'method.response.header.Content-Type': true
            'method.response.header.X-Content-Type-Options': true
            'method.response.header.X-Frame-Options': true
            'method.response.header.X-XSS-Protection': true
        - StatusCode: '400'
          ResponseParameters:
            'method.response.header.Content-Type': true

  # POST Method with Lambda Authorizer
  PostMethod:
    Type: 'AWS::ApiGateway::Method'
    Properties:
      RestApiId: !Ref SecureApiGateway
      ResourceId: !Ref ApiResource
      HttpMethod: 'POST'
      AuthorizationType: 'CUSTOM'
      AuthorizerId: !Ref LambdaAuthorizer
      ApiKeyRequired: true
      RequestParameters:
        'method.request.header.Content-Type': true
      RequestValidatorId: !Ref RequestValidator
      RequestModels:
        'application/json': !Ref RequestModel
      Integration:
        Type: 'AWS'
        IntegrationHttpMethod: 'POST'
        Uri: !Sub 'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${BackendFunction.Arn}/invocations'
        PassthroughBehavior: 'WHEN_NO_MATCH'
        IntegrationResponses:
          - StatusCode: '201'
            ResponseParameters:
              'method.response.header.Content-Type': \"'application/json'\"
          - StatusCode: '400'
            SelectionPattern: '.*BadRequest.*'
            ResponseParameters:
              'method.response.header.Content-Type': \"'application/json'\"
      MethodResponses:
        - StatusCode: '201'
          ResponseParameters:
            'method.response.header.Content-Type': true
        - StatusCode: '400'
          ResponseParameters:
            'method.response.header.Content-Type': true

  # Request Validator for Schema Validation
  RequestValidator:
    Type: 'AWS::ApiGateway::RequestValidator'
    Properties:
      Name: 'request-validator'
      RestApiId: !Ref SecureApiGateway
      ValidateRequestBody: true
      ValidateRequestParameters: true

  # Request Model for Schema Validation
  RequestModel:
    Type: 'AWS::ApiGateway::Model'
    Properties:
      RestApiId: !Ref SecureApiGateway
      ContentType: 'application/json'
      Name: 'DataModel'
      Schema:
        $schema: 'http://json-schema.org/draft-04/schema#'
        title: 'DataModel'
        type: 'object'
        required:
          - 'name'
          - 'value'
        properties:
          name:
            type: 'string'
            minLength: 1
          value:
            type: 'string'
            pattern: '^[A-Za-z0-9_\\\\-\\\\.]+$'

  # API Key
  ApiKey:
    Type: 'AWS::ApiGateway::ApiKey'
    DependsOn: 'ApiDeployment'
    Properties:
      Name: 'secure-api-key'
      Description: 'API Key for secure API'
      Enabled: true

  # Usage Plan
  UsagePlan:
    Type: 'AWS::ApiGateway::UsagePlan'
    DependsOn: 'ApiDeployment'
    Properties:
      UsagePlanName: 'standard-usage-plan'
      Description: 'Standard usage plan with rate and burst limits'
      ApiStages:
        - ApiId: !Ref SecureApiGateway
          Stage: 'prod'
      Throttle:
        BurstLimit: 5
        RateLimit: 10
      Quota:
        Limit: 1000
        Period: 'MONTH'

  # Usage Plan Key
  UsagePlanKey:
    Type: 'AWS::ApiGateway::UsagePlanKey'
    Properties:
      KeyId: !Ref ApiKey
      KeyType: 'API_KEY'
      UsagePlanId: !Ref UsagePlan

  # Deployment
  ApiDeployment:
    Type: 'AWS::ApiGateway::Deployment'
    DependsOn:
      - 'GetMethod'
      - 'PostMethod'
    Properties:
      RestApiId: !Ref SecureApiGateway
      StageName: 'prod'
      StageDescription:
        AccessLogSetting:
          DestinationArn: !GetAtt AccessLogs.Arn
          Format: '{\"requestId\":\"$context.requestId\", \"ip\":\"$context.identity.sourceIp\", \"caller\":\"$context.identity.caller\", \"user\":\"$context.identity.user\", \"requestTime\":\"$context.requestTime\", \"httpMethod\":\"$context.httpMethod\", \"resourcePath\":\"$context.resourcePath\", \"status\":\"$context.status\", \"protocol\":\"$context.protocol\", \"responseLength\":\"$context.responseLength\"}'
        MethodSettings:
          - ResourcePath: '/*'
            HttpMethod: '*'
            MetricsEnabled: true
            DataTraceEnabled: true
            LoggingLevel: 'INFO'
            ThrottlingBurstLimit: 5
            ThrottlingRateLimit: 10

  # CloudWatch Log Group for API Gateway Access Logs
  AccessLogs:
    Type: 'AWS::Logs::LogGroup'
    Properties:
      LogGroupName: !Sub '/aws/apigateway/${SecureApiGateway}'
      RetentionInDays: 90

  # Lambda Execution Role
  LambdaExecutionRole:
    Type: 'AWS::IAM::Role'
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: 'Allow'
            Principal:
              Service: 'lambda.amazonaws.com'
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'

  # WAF Web ACL for API Gateway
  WebACL:
    Type: 'AWS::WAFv2::WebACL'
    Properties:
      Name: 'ApiGatewayWebACL'
      Scope: 'REGIONAL'
      DefaultAction:
        Allow: {}
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: 'ApiGatewayWebACL'
      Rules:
        - Name: 'AWSManagedRulesCommonRuleSet'
          Priority: 0
          Statement:
            ManagedRuleGroupStatement:
              VendorName: 'AWS'
              Name: 'AWSManagedRulesCommonRuleSet'
          OverrideAction:
            None: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: 'AWSManagedRulesCommonRuleSet'
        - Name: 'RateLimit'
          Priority: 1
          Statement:
            RateBasedStatement:
              Limit: 100
              AggregateKeyType: 'IP'
          Action:
            Block: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: 'RateLimit'

  # Associate WAF WebACL with API Gateway
  WebACLAssociation:
    Type: 'AWS::WAFv2::WebACLAssociation'
    Properties:
      ResourceArn: !Sub 'arn:aws:apigateway:${AWS::Region}::/restapis/${SecureApiGateway}/stages/prod'
      WebACLArn: !GetAtt WebACL.Arn
```

#### AWS API Gateway Security Best Practices

1. **Private API**: Consider using a private API Gateway with VPC endpoints for internal services.
2. **Multi-Layer Defense**: Combine IAM policies, resource policies, and Lambda authorizers.
3. **API Deployment Stages**: Use separate stages for development, testing, and production.
4. **Encryption**: Enforce HTTPS and strong encryption for all API endpoints.
5. **Resource-Based Policy**: Apply resource-based policies to restrict API Gateway access.
6. **Request/Response Validation**: Implement request and response validation using JSON schemas.
7. **AWS Secrets Manager**: Use Secrets Manager for storing and retrieving API credentials.

Example Lambda authorizer with enhanced security:

```javascript
// Enhanced Lambda authorizer with JWT validation
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Set up JWKS client
const client = jwksClient({
  jwksUri: 'https://your-identity-provider/.well-known/jwks.json',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000 // 10 minutes
});

// Get signing key
const getSigningKey = async (kid) => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      
      const signingKey = key.publicKey || key.rsaPublicKey;
      resolve(signingKey);
    });
  });
};

// Verify JWT token
const verifyToken = async (token) => {
  try {
    // Decode token header to get key ID (kid)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid token');
    }
    
    // Get signing key
    const signingKey = await getSigningKey(decoded.header.kid);
    
    // Verify token
    const verified = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer: 'https://your-identity-provider/',
      audience: 'your-api-audience'
    });
    
    return verified;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw error;
  }
};

exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Extract token from header (remove 'Bearer ' prefix if present)
    const token = event.authorizationToken;
    if (!token) {
      throw new Error('Unauthorized - No token provided');
    }
    
    const tokenValue = token.replace(/^Bearer\\s+/i, '');
    
    // Verify JWT token
    const claims = await verifyToken(tokenValue);
    
    // Check required scopes/permissions
    const requiredScopes = ['read:data'];
    const tokenScopes = claims.scope ? claims.scope.split(' ') : [];
    
    const hasRequiredScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
    if (!hasRequiredScopes) {
      throw new Error('Insufficient permissions');
    }
    
    // Generate policy
    return generatePolicy(claims.sub, 'Allow', event.methodArn, {
      userId: claims.sub,
      scope: claims.scope
    });
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};

// Generate AWS IAM policy
function generatePolicy(principalId, effect, resource, context) {
  const policy = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource
      }]
    },
    context: context || {}
  };
  
  return policy;
}
```

### Kong API Gateway

Kong is a widely-used open-source API gateway that can be deployed on-premises or in the cloud.

#### Key Security Features

1. **Authentication Plugins**: Support for various authentication methods (JWT, OAuth, API keys, etc.)
2. **Rate Limiting**: Protect APIs from abuse with configurable rate limits
3. **ACL Plugin**: Control API access based on consumer groups
4. **Request Transformation**: Modify requests and responses for security hardening
5. **IP Restriction**: Allow or deny access based on client IP addresses

#### Kong Gateway Installation and Setup

Using Docker Compose:

```yaml
version: '3'

services:
  # Kong database
  kong-database:
    image: postgres:13
    container_name: kong-database
    restart: always
    networks:
      - kong-net
    environment:
      POSTGRES_USER: kong
      POSTGRES_DB: kong
      POSTGRES_PASSWORD: kong_password
    ports:
      - \"5432:5432\"
    volumes:
      - kong-database-data:/var/lib/postgresql/data
    healthcheck:
      test: [\"CMD\", \"pg_isready\", \"-U\", \"kong\"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Kong migrations
  kong-migrations:
    image: kong:2.7
    command: kong migrations bootstrap
    networks:
      - kong-net
    depends_on:
      - kong-database
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong_password
      KONG_PG_DATABASE: kong
    restart: on-failure

  # Kong service
  kong:
    image: kong:2.7
    container_name: kong
    restart: always
    networks:
      - kong-net
    depends_on:
      - kong-database
      - kong-migrations
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PG_USER: kong
      KONG_PG_PASSWORD: kong_password
      KONG_PG_DATABASE: kong
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: 0.0.0.0:8001, 0.0.0.0:8444 ssl
      KONG_LOG_LEVEL: notice
      KONG_PROXY_LISTEN: 0.0.0.0:8000, 0.0.0.0:8443 ssl
    ports:
      - \"8000:8000\"
      - \"8443:8443\"
      - \"8001:8001\"
      - \"8444:8444\"
    healthcheck:
      test: [\"CMD\", \"kong\", \"health\"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Kong Manager UI
  kong-manager:
    image: pantsel/konga:0.14.9
    container_name: kong-manager
    restart: always
    networks:
      - kong-net
    depends_on:
      - kong
    environment:
      NODE_ENV: production
      DB_ADAPTER: postgres
      DB_HOST: kong-database
      DB_USER: kong
      DB_PASSWORD: kong_password
      DB_DATABASE: konga
      KONGA_HOOK_TIMEOUT: 120000
      KONGA_LOG_LEVEL: debug
    ports:
      - \"1337:1337\"

networks:
  kong-net:
    driver: bridge

volumes:
  kong-database-data:
```

#### Kong Declarative Configuration

```yaml
# kong.yaml - Declarative configuration for Kong
_format_version: \"2.1\"

# Services and Routes
services:
  - name: secure-api
    url: https://backend-service.example.com
    plugins:
      - name: cors
        config:
          origins:
            - https://trusted-app.example.com
          methods:
            - GET
            - POST
            - PUT
            - DELETE
          headers:
            - Authorization
            - Content-Type
          exposed_headers:
            - X-Auth-Token
          credentials: true
          max_age: 3600
          preflight_continue: false
      - name: rate-limiting
        config:
          second: 5
          minute: 30
          hour: 500
          policy: local
          fault_tolerant: true
          hide_client_headers: false
          redis_timeout: 2000
      - name: proxy-cache
        config:
          content_type:
            - application/json
          cache_ttl: 300
          strategy: memory
      - name: response-transformer
        config:
          add:
            headers:
              - X-Content-Type-Options:nosniff
              - X-Frame-Options:DENY
              - X-XSS-Protection:1; mode=block
              - Strict-Transport-Security:max-age=31536000; includeSubDomains
    routes:
      - name: api-route
        paths:
          - /api
        strip_path: true
        preserve_host: false
        protocols:
          - https
        plugins:
          - name: request-transformer
            config:
              add:
                headers:
                  - X-Request-ID:$(uuid)
              remove:
                headers:
                  - Server
                  - X-Powered-By

# Consumers
consumers:
  - username: api-client
    custom_id: client-001

# JWT Authentication
plugins:
  - name: jwt
    service: secure-api
    config:
      claims_to_verify:
        - exp
        - nbf
      key_claim_name: kid
      secret_is_base64: false
      run_on_preflight: false

# JWT credentials for consumer
jwt_secrets:
  - consumer: api-client
    algorithm: RS256
    key: \"client-key\"
    rsa_public_key: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxzYuc1RV+rcbAHmlJf9F
      r4hrXGKUEwDha0ggeV8cX+0cCnXZdFQ3JTbX0ZLLR+G92R+efHYvF9Vqt6cjZ2O0
      Em0aBmWzqDpJc6jTYzBKMj9oLjdB5X5rHmYiCOvK0zoxnYwXwV2qqA/4QySQugKJ
      qY2WJh5rOEyP8cQQmKn0ZYcR4XY4gKwKbULYfD9bi8p8nGu4K4OdUJAF0gKXQBXh
      bUKCFuIVbHPZiEcOLMJJY82F0rHcKnIh/uL/sZsTZhIyxiRrCcLmCLYzl3x0OZ0F
      In5T6ODRgYqvan1Q8qBR8lCYWhg4PLBAJ3evBZqzBtUNnpGJ9prdFEtYDkZ9yLbq
      ZQIDAQAB
      -----END PUBLIC KEY-----

# ACLS for consumer groups
acls:
  - consumer: api-client
    group: api-users

# ACL plugin to restrict access based on consumer groups
plugins:
  - name: acl
    service: secure-api
    config:
      allow:
        - api-users
      hide_groups_header: true

# IP restriction plugin
plugins:
  - name: ip-restriction
    service: secure-api
    config:
      allow:
        - 192.168.1.0/24
        - 203.0.113.0/24
```

#### Kong Security Best Practices

1. **Secure Admin API**: Restrict access to the Kong Admin API using firewalls or API Gateway.
2. **Plugin Chaining**: Implement multiple security plugins in the correct order for defense in depth.
3. **Mutual TLS**: Configure mTLS for service-to-service communication.
4. **Custom Plugins**: Develop custom plugins for organization-specific security requirements.
5. **Monitoring**: Implement comprehensive monitoring for Kong nodes and plugins.
6. **Automatic TLS**: Use Let's Encrypt integration for automatic certificate management.
7. **Rate Limiting Scope**: Apply rate limiting at different scopes (IP, consumer, service).

Example custom security plugin (Kong plugin in Lua):

```lua
-- Custom security plugin for Kong
local BasePlugin = require \"kong.plugins.base_plugin\"
local cjson = require \"cjson\"
local http = require \"resty.http\"

local SecurityPlugin = BasePlugin:extend()

SecurityPlugin.PRIORITY = 1000
SecurityPlugin.VERSION = \"1.0.0\"

-- Constructor
function SecurityPlugin:new()
  SecurityPlugin.super.new(self, \"custom-security\")
end

-- Configure plugin
function SecurityPlugin:access(conf)
  SecurityPlugin.super.access(self)
  
  local headers = kong.request.get_headers()
  local client_ip = kong.client.get_forwarded_ip()
  local request_path = kong.request.get_path()
  local request_method = kong.request.get_method()
  
  -- Check for required security headers
  if not headers[\"x-api-key\"] then
    return kong.response.exit(401, { message = \"API key is required\" })
  end
  
  -- Verify API key with external security service
  local httpc = http.new()
  httpc:set_timeout(conf.timeout)
  
  local res, err = httpc:request_uri(conf.security_service_url, {
    method = \"POST\",
    body = cjson.encode({
      api_key = headers[\"x-api-key\"],
      client_ip = client_ip,
      path = request_path,
      method = request_method
    }),
    headers = {
      [\"Content-Type\"] = \"application/json\"
    }
  })
  
  if not res then
    kong.log.err(\"Failed to connect to security service: \", err)
    return kong.response.exit(500, { message = \"Internal server error\" })
  end
  
  if res.status ~= 200 then
    kong.log.warn(\"Security validation failed: \", res.body)
    return kong.response.exit(res.status, cjson.decode(res.body))
  end
  
  -- Add additional security headers
  kong.service.request.add_header(\"X-Security-Validated\", \"true\")
  kong.service.request.add_header(\"X-Security-Validation-Time\", ngx.now())
  
  -- Add user context from security service response
  local security_data = cjson.decode(res.body)
  if security_data and security_data.user_id then
    kong.service.request.add_header(\"X-User-ID\", security_data.user_id)
    
    -- Set consumer if available
    if security_data.consumer_id then
      local consumer_id = security_data.consumer_id
      kong.client.authenticate(consumer_id, \"custom-security\")
    end
  end
end

return SecurityPlugin
```

## Rate Limiting and Throttling

Rate limiting protects APIs from abuse, denial of service attacks, and ensures fair usage among consumers.

### Rate Limiting Implementation Patterns

#### Token Bucket Algorithm

The token bucket algorithm limits requests by adding tokens to a virtual bucket at a fixed rate.

```csharp
public class TokenBucketRateLimiter : IRateLimiter
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<TokenBucketRateLimiter> _logger;
    
    public TokenBucketRateLimiter(IDistributedCache cache, ILogger<TokenBucketRateLimiter> logger)
    {
        _cache = cache;
        _logger = logger;
    }
    
    public async Task<bool> AllowRequestAsync(string clientId, int maxBurst, int refillRate)
    {
        var key = $\"rate_limit:{clientId}\";
        var currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        
        try
        {
            var bucketJson = await _cache.GetStringAsync(key);
            TokenBucket bucket;
            
            if (string.IsNullOrEmpty(bucketJson))
            {
                // Create a new bucket for the client
                bucket = new TokenBucket
                {
                    Tokens = maxBurst,
                    LastRefill = currentTime
                };
            }
            else
            {
                bucket = JsonSerializer.Deserialize<TokenBucket>(bucketJson);
                
                // Calculate tokens to add based on time elapsed
                var secondsElapsed = currentTime - bucket.LastRefill;
                var tokensToAdd = secondsElapsed * refillRate;
                
                if (tokensToAdd > 0)
                {
                    bucket.Tokens = Math.Min(maxBurst, bucket.Tokens + tokensToAdd);
                    bucket.LastRefill = currentTime;
                }
            }
            
            // Check if we have tokens available
            if (bucket.Tokens >= 1)
            {
                // Consume a token
                bucket.Tokens -= 1;
                
                // Update the bucket in the cache
                await _cache.SetStringAsync(
                    key,
                    JsonSerializer.Serialize(bucket),
                    new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
                    });
                
                return true;
            }
            
            // No tokens available, rate limit exceeded
            _logger.LogWarning(\"Rate limit exceeded for client {ClientId}\", clientId);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing rate limit for client {ClientId}\", clientId);
            // Fail open to prevent blocking all requests when Redis is down
            return true;
        }
    }
    
    private class TokenBucket
    {
        public double Tokens { get; set; }
        public long LastRefill { get; set; }
    }
}
```

#### Fixed Window Algorithm

The fixed window algorithm limits requests within a specific time window.

```csharp
public class FixedWindowRateLimiter : IRateLimiter
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<FixedWindowRateLimiter> _logger;
    
    public FixedWindowRateLimiter(IDistributedCache cache, ILogger<FixedWindowRateLimiter> logger)
    {
        _cache = cache;
        _logger = logger;
    }
    
    public async Task<bool> AllowRequestAsync(string clientId, int limit, int windowSeconds)
    {
        var currentTime = DateTimeOffset.UtcNow;
        var currentWindow = currentTime.ToUnixTimeSeconds() / windowSeconds;
        var key = $\"rate_limit:{clientId}:{currentWindow}\";
        
        try
        {
            // Get current count for this window
            var countString = await _cache.GetStringAsync(key);
            int count = 0;
            
            if (!string.IsNullOrEmpty(countString) && int.TryParse(countString, out var parsedCount))
            {
                count = parsedCount;
            }
            
            // Check if we've exceeded the limit
            if (count >= limit)
            {
                _logger.LogWarning(\"Rate limit exceeded for client {ClientId} in window {Window}\", clientId, currentWindow);
                return false;
            }
            
            // Increment the count
            count++;
            
            // Store the updated count with expiry at the end of the window
            var windowEndTime = (currentWindow + 1) * windowSeconds;
            var secondsToExpiry = windowEndTime - currentTime.ToUnixTimeSeconds();
            
            await _cache.SetStringAsync(
                key,
                count.ToString(),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(secondsToExpiry > 0 ? secondsToExpiry : windowSeconds)
                });
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing rate limit for client {ClientId}\", clientId);
            // Fail open to prevent blocking all requests when Redis is down
            return true;
        }
    }
}
```

#### Sliding Window Algorithm

The sliding window algorithm provides smoother rate limiting by combining aspects of fixed window and token bucket.

```csharp
public class SlidingWindowRateLimiter : IRateLimiter
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<SlidingWindowRateLimiter> _logger;
    
    public SlidingWindowRateLimiter(IDistributedCache cache, ILogger<SlidingWindowRateLimiter> logger)
    {
        _cache = cache;
        _logger = logger;
    }
    
    public async Task<bool> AllowRequestAsync(string clientId, int limit, int windowSeconds)
    {
        var currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var windowStart = currentTime - windowSeconds;
        var key = $\"rate_limit_sliding:{clientId}\";
        
        try
        {
            // Get the list of timestamps for this client
            var timestampsJson = await _cache.GetStringAsync(key);
            List<long> timestamps = new List<long>();
            
            if (!string.IsNullOrEmpty(timestampsJson))
            {
                timestamps = JsonSerializer.Deserialize<List<long>>(timestampsJson);
                
                // Remove timestamps outside the current window
                timestamps.RemoveAll(ts => ts <= windowStart);
            }
            
            // Check if we've exceeded the limit
            if (timestamps.Count >= limit)
            {
                _logger.LogWarning(\"Rate limit exceeded for client {ClientId}\", clientId);
                return false;
            }
            
            // Add the current timestamp
            timestamps.Add(currentTime);
            
            // Store the updated timestamps
            await _cache.SetStringAsync(
                key,
                JsonSerializer.Serialize(timestamps),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(windowSeconds * 2)
                });
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing rate limit for client {ClientId}\", clientId);
            // Fail open to prevent blocking all requests when Redis is down
            return true;
        }
    }
}
```

### ASP.NET Core Rate Limiting Middleware

```csharp
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IRateLimiter _rateLimiter;
    private readonly RateLimitingOptions _options;
    
    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IRateLimiter rateLimiter,
        IOptions<RateLimitingOptions> options)
    {
        _next = next;
        _logger = logger;
        _rateLimiter = rateLimiter;
        _options = options.Value;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        
        // Check if endpoint has rate limiting attribute
        var rateLimitAttribute = endpoint?.Metadata.GetMetadata<RateLimitAttribute>();
        
        if (rateLimitAttribute != null)
        {
            // Extract client identifier from the request
            string clientId = GetClientIdentifier(context);
            
            // Apply rate limiting
            bool allowed = await _rateLimiter.AllowRequestAsync(
                clientId,
                rateLimitAttribute.Limit,
                rateLimitAttribute.WindowSeconds);
                
            if (!allowed)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.Add(\"Retry-After\", rateLimitAttribute.WindowSeconds.ToString());
                context.Response.ContentType = \"application/json\";
                
                var response = new
                {
                    error = \"Too many requests\",
                    retryAfter = rateLimitAttribute.WindowSeconds
                };
                
                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
                return;
            }
            
            // Add rate limit headers
            AddRateLimitHeaders(context, rateLimitAttribute.Limit, rateLimitAttribute.WindowSeconds);
        }
        
        await _next(context);
    }
    
    private string GetClientIdentifier(HttpContext context)
    {
        // Choose client identifier method based on options
        switch (_options.ClientIdSource)
        {
            case ClientIdSource.IpAddress:
                return context.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";
                
            case ClientIdSource.AuthenticatedUser:
                return context.User?.Identity?.Name ?? context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? \"anonymous\";
                
            case ClientIdSource.ApiKey:
                return context.Request.Headers[\"X-API-Key\"].FirstOrDefault() ?? \"unknown\";
                
            case ClientIdSource.Custom:
                // Call custom provider if configured
                return _options.CustomClientIdProvider?.Invoke(context) ?? \"unknown\";
                
            default:
                return \"default\";
        }
    }
    
    private void AddRateLimitHeaders(HttpContext context, int limit, int windowSeconds)
    {
        // Add rate limit headers following standard convention
        context.Response.Headers.Add(\"X-RateLimit-Limit\", limit.ToString());
        context.Response.Headers.Add(\"X-RateLimit-Window\", windowSeconds.ToString());
    }
}

// Rate limit attribute for controllers and actions
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RateLimitAttribute : Attribute
{
    public int Limit { get; }
    public int WindowSeconds { get; }
    
    public RateLimitAttribute(int limit, int windowSeconds)
    {
        Limit = limit;
        WindowSeconds = windowSeconds;
    }
}

// Usage in controller
[ApiController]
[Route(\"api/[controller]\")]
public class DataController : ControllerBase
{
    [HttpGet]
    [RateLimit(100, 60)] // 100 requests per minute
    public IActionResult Get()
    {
        return Ok(\"Data\");
    }
    
    [HttpPost]
    [RateLimit(10, 60)] // 10 requests per minute for write operations
    public IActionResult Post()
    {
        return Ok(\"Data created\");
    }
}

// Registration in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = Configuration.GetConnectionString(\"Redis\");
        options.InstanceName = \"ApiRateLimit:\";
    });
    
    services.Configure<RateLimitingOptions>(options =>
    {
        options.ClientIdSource = ClientIdSource.IpAddress;
        // For APIs requiring authentication
        // options.ClientIdSource = ClientIdSource.AuthenticatedUser;
    });
    
    // Choose appropriate rate limiting algorithm
    services.AddSingleton<IRateLimiter, SlidingWindowRateLimiter>();
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Add rate limiting middleware
    app.UseMiddleware<RateLimitingMiddleware>();
    
    // Other middleware
}
```

### Rate Limiting Security Considerations

1. **Client Identification**: Choose appropriate client identifiers (IP, API key, user ID).
2. **Distributed Systems**: Use distributed caching for multi-node API deployments.
3. **Graceful Degradation**: Return proper 429 responses with Retry-After headers.
4. **Tiered Limits**: Implement different limits for different API consumers.
5. **Burst Handling**: Allow short bursts while limiting sustained traffic.
6. **Monitoring and Alerts**: Monitor rate limit events and set up alerts for unusual patterns.
7. **Differentiated Limits**: Apply different limits to different endpoints based on sensitivity.

## Input Validation and Sanitization

Proper input validation and sanitization are critical for preventing injection attacks and ensuring data integrity.

### Request Validation Strategies

#### Model Validation in ASP.NET Core

```csharp
// Data transfer object with validation attributes
public class CreateUserRequest
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    [RegularExpression(\"^[a-zA-Z0-9_-]+$\", ErrorMessage = \"Username can only contain letters, numbers, underscores, and hyphens.\")]
    public string Username { get; set; }
    
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    
    [Required]
    [StringLength(100, MinimumLength = 12)]
    [RegularExpression(@\"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{12,}$\", 
        ErrorMessage = \"Password must be at least 12 characters and include uppercase, lowercase, number, and special character.\")]
    public string Password { get; set; }
    
    [Range(18, 120)]
    public int? Age { get; set; }
    
    [Phone]
    public string PhoneNumber { get; set; }
}

// Controller with automatic model validation
[ApiController]
[Route(\"api/[controller]\")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    
    public UsersController(IUserService userService)
    {
        _userService = userService;
    }
    
    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUserRequest request)
    {
        // ModelState is automatically validated due to [ApiController] attribute
        // If validation fails, a 400 Bad Request is returned with validation errors
        
        // Additional custom validation
        if (await _userService.EmailExistsAsync(request.Email))
        {
            ModelState.AddModelError(\"Email\", \"Email is already registered.\");
            return BadRequest(ModelState);
        }
        
        // Process valid request
        var userId = await _userService.CreateUserAsync(request);
        
        return CreatedAtAction(nameof(GetUser), new { id = userId }, null);
    }
    
    [HttpGet(\"{id}\")]
    public async Task<IActionResult> GetUser(string id)
    {
        // Validate ID format before processing
        if (!Guid.TryParse(id, out var userId))
        {
            return BadRequest(\"Invalid user ID format.\");
        }
        
        var user = await _userService.GetUserAsync(userId);
        
        if (user == null)
        {
            return NotFound();
        }
        
        return Ok(user);
    }
}
```

#### Custom Model Validation with FluentValidation

```csharp
// FluentValidation validator
public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    private readonly IUserService _userService;
    
    public CreateUserValidator(IUserService userService)
    {
        _userService = userService;
        
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage(\"Username is required.\")
            .Length(3, 50).WithMessage(\"Username must be between 3 and 50 characters.\")
            .Matches(\"^[a-zA-Z0-9_-]+$\").WithMessage(\"Username can only contain letters, numbers, underscores, and hyphens.\")
            .MustAsync(BeUniqueUsername).WithMessage(\"Username is already taken.\");
            
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage(\"Email is required.\")
            .EmailAddress().WithMessage(\"Email format is invalid.\")
            .MustAsync(BeUniqueEmail).WithMessage(\"Email is already registered.\");
            
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage(\"Password is required.\")
            .MinimumLength(12).WithMessage(\"Password must be at least 12 characters.\")
            .Matches(\"[A-Z]\").WithMessage(\"Password must contain at least one uppercase letter.\")
            .Matches(\"[a-z]\").WithMessage(\"Password must contain at least one lowercase letter.\")
            .Matches(\"[0-9]\").WithMessage(\"Password must contain at least one number.\")
            .Matches(\"[^a-zA-Z0-9]\").WithMessage(\"Password must contain at least one special character.\");
            
        RuleFor(x => x.Age)
            .InclusiveBetween(18, 120).When(x => x.Age.HasValue)
            .WithMessage(\"Age must be between 18 and 120.\");
            
        RuleFor(x => x.PhoneNumber)
            .Matches(@\"^\\+?[0-9\\s-\\(\\)]+$\").When(x => !string.IsNullOrEmpty(x.PhoneNumber))
            .WithMessage(\"Phone number format is invalid.\");
    }
    
    private async Task<bool> BeUniqueUsername(string username, CancellationToken cancellationToken)
    {
        return !await _userService.UsernameExistsAsync(username);
    }
    
    private async Task<bool> BeUniqueEmail(string email, CancellationToken cancellationToken)
    {
        return !await _userService.EmailExistsAsync(email);
    }
}

// Register FluentValidation in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddControllers()
        .AddFluentValidation(fv => 
        {
            fv.RegisterValidatorsFromAssemblyContaining<CreateUserValidator>();
            fv.ImplicitlyValidateChildProperties = true;
        });
}
```

#### JSON Schema Validation

```csharp
// JSON Schema validation middleware
public class JsonSchemaValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<JsonSchemaValidationMiddleware> _logger;
    private readonly Dictionary<string, JsonSchema> _schemas;
    
    public JsonSchemaValidationMiddleware(
        RequestDelegate next,
        ILogger<JsonSchemaValidationMiddleware> logger,
        ISchemaProvider schemaProvider)
    {
        _next = next;
        _logger = logger;
        _schemas = schemaProvider.GetSchemas();
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        
        // Check if endpoint has schema validation attribute
        var schemaAttribute = endpoint?.Metadata.GetMetadata<ValidateSchemaAttribute>();
        
        if (schemaAttribute != null && 
            context.Request.ContentType != null && 
            context.Request.ContentType.Contains(\"application/json\"))
        {
            // Enable buffering to read the request body multiple times
            context.Request.EnableBuffering();
            
            // Read the request body
            using var reader = new StreamReader(
                context.Request.Body,
                encoding: Encoding.UTF8,
                detectEncodingFromByteOrderMarks: false,
                leaveOpen: true);
                
            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;
            
            // Validate the request body against the schema
            if (_schemas.TryGetValue(schemaAttribute.SchemaName, out var schema))
            {
                var jToken = JToken.Parse(body);
                var validationResults = schema.Validate(jToken);
                
                if (validationResults.Count > 0)
                {
                    _logger.LogWarning(\"JSON Schema validation failed: {Errors}\", 
                        string.Join(\", \", validationResults.Select(r => r.ToString())));
                        
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = \"application/json\";
                    
                    var errors = validationResults.Select(r => new
                    {
                        path = r.Path,
                        message = r.Kind.ToString()
                    });
                    
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new
                    {
                        error = \"Schema validation failed\",
                        details = errors
                    }));
                    
                    return;
                }
            }
            else
            {
                _logger.LogWarning(\"Schema {SchemaName} not found\", schemaAttribute.SchemaName);
            }
        }
        
        await _next(context);
    }
}

// Schema validation attribute
[AttributeUsage(AttributeTargets.Method)]
public class ValidateSchemaAttribute : Attribute
{
    public string SchemaName { get; }
    
    public ValidateSchemaAttribute(string schemaName)
    {
        SchemaName = schemaName;
    }
}

// Schema provider service
public interface ISchemaProvider
{
    Dictionary<string, JsonSchema> GetSchemas();
}

public class FileSystemSchemaProvider : ISchemaProvider
{
    private readonly string _schemaDirectory;
    private readonly ILogger<FileSystemSchemaProvider> _logger;
    
    public FileSystemSchemaProvider(string schemaDirectory, ILogger<FileSystemSchemaProvider> logger)
    {
        _schemaDirectory = schemaDirectory;
        _logger = logger;
    }
    
    public Dictionary<string, JsonSchema> GetSchemas()
    {
        var schemas = new Dictionary<string, JsonSchema>();
        
        try
        {
            foreach (var file in Directory.GetFiles(_schemaDirectory, \"*.json\"))
            {
                var schemaName = Path.GetFileNameWithoutExtension(file);
                var schemaJson = File.ReadAllText(file);
                var schema = JsonSchema.FromText(schemaJson);
                
                schemas.Add(schemaName, schema);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error loading JSON schemas\");
        }
        
        return schemas;
    }
}

// Register in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddSingleton<ISchemaProvider>(sp => 
    {
        var logger = sp.GetRequiredService<ILogger<FileSystemSchemaProvider>>();
        return new FileSystemSchemaProvider(\"./Schemas\", logger);
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseMiddleware<JsonSchemaValidationMiddleware>();
    
    // Other middleware
}

// Usage in controller
[HttpPost]
[ValidateSchema(\"user-create\")]
public async Task<IActionResult> CreateUser([FromBody] JObject userModel)
{
    // The request has already been validated against the schema
    // Process the request
    
    return Ok();
}
```

### Input Sanitization

#### HTML Sanitization

```csharp
public class HtmlSanitizerService : IHtmlSanitizerService
{
    private readonly HtmlSanitizer _sanitizer;
    
    public HtmlSanitizerService()
    {
        _sanitizer = new HtmlSanitizer();
        
        // Allow only specific tags
        _sanitizer.AllowedTags.Clear();
        _sanitizer.AllowedTags.Add(\"b\");
        _sanitizer.AllowedTags.Add(\"i\");
        _sanitizer.AllowedTags.Add(\"p\");
        _sanitizer.AllowedTags.Add(\"br\");
        _sanitizer.AllowedTags.Add(\"ul\");
        _sanitizer.AllowedTags.Add(\"ol\");
        _sanitizer.AllowedTags.Add(\"li\");
        _sanitizer.AllowedTags.Add(\"a\");
        
        // Allow only specific attributes
        _sanitizer.AllowedAttributes.Clear();
        _sanitizer.AllowedAttributes.Add(\"href\");
        _sanitizer.AllowedAttributes.Add(\"title\");
        
        // Set URL protocols
        _sanitizer.AllowedSchemes.Clear();
        _sanitizer.AllowedSchemes.Add(\"http\");
        _sanitizer.AllowedSchemes.Add(\"https\");
        _sanitizer.AllowedSchemes.Add(\"mailto\");
        
        // Set URL callback to check for malicious URLs
        _sanitizer.AllowedAttributes.Add(\"href\");
        _sanitizer.FilterUrl += (sender, args) =>
        {
            if (args.OriginalUrl.StartsWith(\"javascript:\", StringComparison.OrdinalIgnoreCase))
            {
                args.SanitizedUrl = \"#\";
            }
        };
    }
    
    public string Sanitize(string html)
    {
        if (string.IsNullOrEmpty(html))
        {
            return html;
        }
        
        return _sanitizer.Sanitize(html);
    }
}

// Usage in a service
public class CommentService : ICommentService
{
    private readonly IHtmlSanitizerService _sanitizer;
    private readonly ICommentRepository _repository;
    
    public CommentService(IHtmlSanitizerService sanitizer, ICommentRepository repository)
    {
        _sanitizer = sanitizer;
        _repository = repository;
    }
    
    public async Task<Comment> CreateCommentAsync(CommentRequest request)
    {
        // Sanitize HTML content before storing
        var sanitizedContent = _sanitizer.Sanitize(request.Content);
        
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Content = sanitizedContent,
            CreatedAt = DateTime.UtcNow
        };
        
        await _repository.CreateAsync(comment);
        
        return comment;
    }
}
```

#### SQL Injection Prevention with EF Core

```csharp
public class UserRepository : IUserRepository
{
    private readonly AppDbContext _dbContext;
    
    public UserRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    // Safe: Uses parameterized queries through EF Core
    public async Task<User> GetUserByUsernameAsync(string username)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Username == username);
    }
    
    // Safe: Uses parameterized search with LIKE
    public async Task<IEnumerable<User>> SearchUsersByNameAsync(string searchTerm)
    {
        if (string.IsNullOrEmpty(searchTerm))
        {
            return Enumerable.Empty<User>();
        }
        
        return await _dbContext.Users
            .Where(u => EF.Functions.Like(u.Name, $\"%{searchTerm}%\"))
            .ToListAsync();
    }
    
    // Safe: Validates ID format before querying
    public async Task<User> GetUserByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var userId))
        {
            return null;
        }
        
        return await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId);
    }
    
    // Safe: Uses strongly-typed parameters for sorting
    public async Task<IEnumerable<User>> GetUsersSortedAsync(string sortField, bool ascending)
    {
        IQueryable<User> query = _dbContext.Users;
        
        // Use a whitelist of allowed sort fields
        switch (sortField?.ToLower())
        {
            case \"name\":
                query = ascending ? query.OrderBy(u => u.Name) : query.OrderByDescending(u => u.Name);
                break;
            case \"createdat\":
                query = ascending ? query.OrderBy(u => u.CreatedAt) : query.OrderByDescending(u => u.CreatedAt);
                break;
            default:
                // Default sort by ID
                query = ascending ? query.OrderBy(u => u.Id) : query.OrderByDescending(u => u.Id);
                break;
        }
        
        return await query.ToListAsync();
    }
}
```

### Input Validation Security Considerations

1. **Defense in Depth**: Implement validation at multiple layers (client, API gateway, application).
2. **Strict Schemas**: Define and enforce strict schemas for all API requests.
3. **Contextual Validation**: Validate inputs in the context they will be used (e.g., HTML in HTML context).
4. **Positive Validation**: Use whitelist approach rather than blacklist for input validation.
5. **Type Conversion**: Safely convert strings to their target types before using them.
6. **Null Handling**: Properly handle null or empty inputs in validation logic.
7. **Canonicalization**: Normalize inputs before validation to prevent bypass attacks.

## Data Encryption Strategies

Protecting sensitive data through encryption is essential for API security.

### Data Encryption at Rest

#### Implementing Field-Level Encryption

```csharp
// Encryption service interface
public interface IEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
    byte[] Encrypt(byte[] plainData);
    byte[] Decrypt(byte[] cipherData);
}

// AES encryption implementation
public class AesEncryptionService : IEncryptionService
{
    private readonly byte[] _key;
    private readonly byte[] _iv;
    private readonly ILogger<AesEncryptionService> _logger;
    
    public AesEncryptionService(IOptions<EncryptionOptions> options, ILogger<AesEncryptionService> logger)
    {
        // In production, key should come from a secure key management system like Azure Key Vault
        _key = Convert.FromBase64String(options.Value.EncryptionKey);
        _iv = Convert.FromBase64String(options.Value.InitializationVector);
        _logger = logger;
    }

public async Task<bool> AllowRequestAsync(string clientId, int limit, int windowSeconds)
    {
        var currentTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var windowStart = currentTime - windowSeconds;
        var key = $\"rate_limit_sliding:{clientId}\";
        
        try
        {
            // Get the list of timestamps for this client
            var timestampsJson = await _cache.GetStringAsync(key);
            List<long> timestamps = new List<long>();
            
            if (!string.IsNullOrEmpty(timestampsJson))
            {
                timestamps = JsonSerializer.Deserialize<List<long>>(timestampsJson);
                
                // Remove timestamps outside the current window
                timestamps.RemoveAll(ts => ts <= windowStart);
            }
            
            // Check if we've exceeded the limit
            if (timestamps.Count >= limit)
            {
                _logger.LogWarning(\"Rate limit exceeded for client {ClientId}\", clientId);
                return false;
            }
            
            // Add the current timestamp
            timestamps.Add(currentTime);
            
            // Store the updated timestamps
            await _cache.SetStringAsync(
                key,
                JsonSerializer.Serialize(timestamps),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(windowSeconds * 2)
                });
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing rate limit for client {ClientId}\", clientId);
            // Fail open to prevent blocking all requests when Redis is down
            return true;
        }
    }
}
```

### ASP.NET Core Rate Limiting Middleware

```csharp
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IRateLimiter _rateLimiter;
    private readonly RateLimitingOptions _options;
    
    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IRateLimiter rateLimiter,
        IOptions<RateLimitingOptions> options)
    {
        _next = next;
        _logger = logger;
        _rateLimiter = rateLimiter;
        _options = options.Value;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        
        // Check if endpoint has rate limiting attribute
        var rateLimitAttribute = endpoint?.Metadata.GetMetadata<RateLimitAttribute>();
        
        if (rateLimitAttribute != null)
        {
            // Extract client identifier from the request
            string clientId = GetClientIdentifier(context);
            
            // Apply rate limiting
            bool allowed = await _rateLimiter.AllowRequestAsync(
                clientId,
                rateLimitAttribute.Limit,
                rateLimitAttribute.WindowSeconds);
                
            if (!allowed)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.Add(\"Retry-After\", rateLimitAttribute.WindowSeconds.ToString());
                context.Response.ContentType = \"application/json\";
                
                var response = new
                {
                    error = \"Too many requests\",
                    retryAfter = rateLimitAttribute.WindowSeconds
                };
                
                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
                return;
            }
            
            // Add rate limit headers
            AddRateLimitHeaders(context, rateLimitAttribute.Limit, rateLimitAttribute.WindowSeconds);
        }
        
        await _next(context);
    }
    
    private string GetClientIdentifier(HttpContext context)
    {
        // Choose client identifier method based on options
        switch (_options.ClientIdSource)
        {
            case ClientIdSource.IpAddress:
                return context.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";
                
            case ClientIdSource.AuthenticatedUser:
                return context.User?.Identity?.Name ?? context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? \"anonymous\";
                
            case ClientIdSource.ApiKey:
                return context.Request.Headers[\"X-API-Key\"].FirstOrDefault() ?? \"unknown\";
                
            case ClientIdSource.Custom:
                // Call custom provider if configured
                return _options.CustomClientIdProvider?.Invoke(context) ?? \"unknown\";
                
            default:
                return \"default\";
        }
    }
    
    private void AddRateLimitHeaders(HttpContext context, int limit, int windowSeconds)
    {
        // Add rate limit headers following standard convention
        context.Response.Headers.Add(\"X-RateLimit-Limit\", limit.ToString());
        context.Response.Headers.Add(\"X-RateLimit-Window\", windowSeconds.ToString());
    }
}

// Rate limit attribute for controllers and actions
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RateLimitAttribute : Attribute
{
    public int Limit { get; }
    public int WindowSeconds { get; }
    
    public RateLimitAttribute(int limit, int windowSeconds)
    {
        Limit = limit;
        WindowSeconds = windowSeconds;
    }
}

// Usage in controller
[ApiController]
[Route(\"api/[controller]\")]
public class DataController : ControllerBase
{
    [HttpGet]
    [RateLimit(100, 60)] // 100 requests per minute
    public IActionResult Get()
    {
        return Ok(\"Data\");
    }
    
    [HttpPost]
    [RateLimit(10, 60)] // 10 requests per minute for write operations
    public IActionResult Post()
    {
        return Ok(\"Data created\");
    }
}

// Registration in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = Configuration.GetConnectionString(\"Redis\");
        options.InstanceName = \"ApiRateLimit:\";
    });
    
    services.Configure<RateLimitingOptions>(options =>
    {
        options.ClientIdSource = ClientIdSource.IpAddress;
        // For APIs requiring authentication
        // options.ClientIdSource = ClientIdSource.AuthenticatedUser;
    });
    
    // Choose appropriate rate limiting algorithm
    services.AddSingleton<IRateLimiter, SlidingWindowRateLimiter>();
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Add rate limiting middleware
    app.UseMiddleware<RateLimitingMiddleware>();
    
    // Other middleware
}
```

### Rate Limiting Security Considerations

1. **Client Identification**: Choose appropriate client identifiers (IP, API key, user ID).
2. **Distributed Systems**: Use distributed caching for multi-node API deployments.
3. **Graceful Degradation**: Return proper 429 responses with Retry-After headers.
4. **Tiered Limits**: Implement different limits for different API consumers.
5. **Burst Handling**: Allow short bursts while limiting sustained traffic.
6. **Monitoring and Alerts**: Monitor rate limit events and set up alerts for unusual patterns.
7. **Differentiated Limits**: Apply different limits to different endpoints based on sensitivity.

## Input Validation and Sanitization

Proper input validation and sanitization are critical for preventing injection attacks and ensuring data integrity.

### Request Validation Strategies

#### Model Validation in ASP.NET Core

```csharp
// Data transfer object with validation attributes
public class CreateUserRequest
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    [RegularExpression(\"^[a-zA-Z0-9_-]+$\", ErrorMessage = \"Username can only contain letters, numbers, underscores, and hyphens.\")]
    public string Username { get; set; }
    
    [Required]
    [EmailAddress]
    public string Email { get; set; }
    
    [Required]
    [StringLength(100, MinimumLength = 12)]
    [RegularExpression(@\"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{12,}$\", 
        ErrorMessage = \"Password must be at least 12 characters and include uppercase, lowercase, number, and special character.\")]
    public string Password { get; set; }
    
    [Range(18, 120)]
    public int? Age { get; set; }
    
    [Phone]
    public string PhoneNumber { get; set; }
}

// Controller with automatic model validation
[ApiController]
[Route(\"api/[controller]\")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    
    public UsersController(IUserService userService)
    {
        _userService = userService;
    }
    
    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUserRequest request)
    {
        // ModelState is automatically validated due to [ApiController] attribute
        // If validation fails, a 400 Bad Request is returned with validation errors
        
        // Additional custom validation
        if (await _userService.EmailExistsAsync(request.Email))
        {
            ModelState.AddModelError(\"Email\", \"Email is already registered.\");
            return BadRequest(ModelState);
        }
        
        // Process valid request
        var userId = await _userService.CreateUserAsync(request);
        
        return CreatedAtAction(nameof(GetUser), new { id = userId }, null);
    }
    
    [HttpGet(\"{id}\")]
    public async Task<IActionResult> GetUser(string id)
    {
        // Validate ID format before processing
        if (!Guid.TryParse(id, out var userId))
        {
            return BadRequest(\"Invalid user ID format.\");
        }
        
        var user = await _userService.GetUserAsync(userId);
        
        if (user == null)
        {
            return NotFound();
        }
        
        return Ok(user);
    }
}
```

#### Custom Model Validation with FluentValidation

```csharp
// FluentValidation validator
public class CreateUserValidator : AbstractValidator<CreateUserRequest>
{
    private readonly IUserService _userService;
    
    public CreateUserValidator(IUserService userService)
    {
        _userService = userService;
        
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage(\"Username is required.\")
            .Length(3, 50).WithMessage(\"Username must be between 3 and 50 characters.\")
            .Matches(\"^[a-zA-Z0-9_-]+$\").WithMessage(\"Username can only contain letters, numbers, underscores, and hyphens.\")
            .MustAsync(BeUniqueUsername).WithMessage(\"Username is already taken.\");
            
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage(\"Email is required.\")
            .EmailAddress().WithMessage(\"Email format is invalid.\")
            .MustAsync(BeUniqueEmail).WithMessage(\"Email is already registered.\");
            
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage(\"Password is required.\")
            .MinimumLength(12).WithMessage(\"Password must be at least 12 characters.\")
            .Matches(\"[A-Z]\").WithMessage(\"Password must contain at least one uppercase letter.\")
            .Matches(\"[a-z]\").WithMessage(\"Password must contain at least one lowercase letter.\")
            .Matches(\"[0-9]\").WithMessage(\"Password must contain at least one number.\")
            .Matches(\"[^a-zA-Z0-9]\").WithMessage(\"Password must contain at least one special character.\");
            
        RuleFor(x => x.Age)
            .InclusiveBetween(18, 120).When(x => x.Age.HasValue)
            .WithMessage(\"Age must be between 18 and 120.\");
            
        RuleFor(x => x.PhoneNumber)
            .Matches(@\"^\\+?[0-9\\s-\\(\\)]+$\").When(x => !string.IsNullOrEmpty(x.PhoneNumber))
            .WithMessage(\"Phone number format is invalid.\");
    }
    
    private async Task<bool> BeUniqueUsername(string username, CancellationToken cancellationToken)
    {
        return !await _userService.UsernameExistsAsync(username);
    }
    
    private async Task<bool> BeUniqueEmail(string email, CancellationToken cancellationToken)
    {
        return !await _userService.EmailExistsAsync(email);
    }
}

// Register FluentValidation in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddControllers()
        .AddFluentValidation(fv => 
        {
            fv.RegisterValidatorsFromAssemblyContaining<CreateUserValidator>();
            fv.ImplicitlyValidateChildProperties = true;
        });
}
```

#### JSON Schema Validation

```csharp
// JSON Schema validation middleware
public class JsonSchemaValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<JsonSchemaValidationMiddleware> _logger;
    private readonly Dictionary<string, JsonSchema> _schemas;
    
    public JsonSchemaValidationMiddleware(
        RequestDelegate next,
        ILogger<JsonSchemaValidationMiddleware> logger,
        ISchemaProvider schemaProvider)
    {
        _next = next;
        _logger = logger;
        _schemas = schemaProvider.GetSchemas();
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        
        // Check if endpoint has schema validation attribute
        var schemaAttribute = endpoint?.Metadata.GetMetadata<ValidateSchemaAttribute>();
        
        if (schemaAttribute != null && 
            context.Request.ContentType != null && 
            context.Request.ContentType.Contains(\"application/json\"))
        {
            // Enable buffering to read the request body multiple times
            context.Request.EnableBuffering();
            
            // Read the request body
            using var reader = new StreamReader(
                context.Request.Body,
                encoding: Encoding.UTF8,
                detectEncodingFromByteOrderMarks: false,
                leaveOpen: true);
                
            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;
            
            // Validate the request body against the schema
            if (_schemas.TryGetValue(schemaAttribute.SchemaName, out var schema))
            {
                var jToken = JToken.Parse(body);
                var validationResults = schema.Validate(jToken);
                
                if (validationResults.Count > 0)
                {
                    _logger.LogWarning(\"JSON Schema validation failed: {Errors}\", 
                        string.Join(\", \", validationResults.Select(r => r.ToString())));
                        
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    context.Response.ContentType = \"application/json\";
                    
                    var errors = validationResults.Select(r => new
                    {
                        path = r.Path,
                        message = r.Kind.ToString()
                    });
                    
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new
                    {
                        error = \"Schema validation failed\",
                        details = errors
                    }));
                    
                    return;
                }
            }
            else
            {
                _logger.LogWarning(\"Schema {SchemaName} not found\", schemaAttribute.SchemaName);
            }
        }
        
        await _next(context);
    }
}

// Schema validation attribute
[AttributeUsage(AttributeTargets.Method)]
public class ValidateSchemaAttribute : Attribute
{
    public string SchemaName { get; }
    
    public ValidateSchemaAttribute(string schemaName)
    {
        SchemaName = schemaName;
    }
}

// Schema provider service
public interface ISchemaProvider
{
    Dictionary<string, JsonSchema> GetSchemas();
}

public class FileSystemSchemaProvider : ISchemaProvider
{
    private readonly string _schemaDirectory;
    private readonly ILogger<FileSystemSchemaProvider> _logger;
    
    public FileSystemSchemaProvider(string schemaDirectory, ILogger<FileSystemSchemaProvider> logger)
    {
        _schemaDirectory = schemaDirectory;
        _logger = logger;
    }
    
    public Dictionary<string, JsonSchema> GetSchemas()
    {
        var schemas = new Dictionary<string, JsonSchema>();
        
        try
        {
            foreach (var file in Directory.GetFiles(_schemaDirectory, \"*.json\"))
            {
                var schemaName = Path.GetFileNameWithoutExtension(file);
                var schemaJson = File.ReadAllText(file);
                var schema = JsonSchema.FromText(schemaJson);
                
                schemas.Add(schemaName, schema);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error loading JSON schemas\");
        }
        
        return schemas;
    }
}

// Register in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddSingleton<ISchemaProvider>(sp => 
    {
        var logger = sp.GetRequiredService<ILogger<FileSystemSchemaProvider>>();
        return new FileSystemSchemaProvider(\"./Schemas\", logger);
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseMiddleware<JsonSchemaValidationMiddleware>();
    
    // Other middleware
}

// Usage in controller
[HttpPost]
[ValidateSchema(\"user-create\")]
public async Task<IActionResult> CreateUser([FromBody] JObject userModel)
{
    // The request has already been validated against the schema
    // Process the request
    
    return Ok();
}
```

### Input Sanitization

#### HTML Sanitization

```csharp
public class HtmlSanitizerService : IHtmlSanitizerService
{
    private readonly HtmlSanitizer _sanitizer;
    
    public HtmlSanitizerService()
    {
        _sanitizer = new HtmlSanitizer();
        
        // Allow only specific tags
        _sanitizer.AllowedTags.Clear();
        _sanitizer.AllowedTags.Add(\"b\");
        _sanitizer.AllowedTags.Add(\"i\");
        _sanitizer.AllowedTags.Add(\"p\");
        _sanitizer.AllowedTags.Add(\"br\");
        _sanitizer.AllowedTags.Add(\"ul\");
        _sanitizer.AllowedTags.Add(\"ol\");
        _sanitizer.AllowedTags.Add(\"li\");
        _sanitizer.AllowedTags.Add(\"a\");
        
        // Allow only specific attributes
        _sanitizer.AllowedAttributes.Clear();
        _sanitizer.AllowedAttributes.Add(\"href\");
        _sanitizer.AllowedAttributes.Add(\"title\");
        
        // Set URL protocols
        _sanitizer.AllowedSchemes.Clear();
        _sanitizer.AllowedSchemes.Add(\"http\");
        _sanitizer.AllowedSchemes.Add(\"https\");
        _sanitizer.AllowedSchemes.Add(\"mailto\");
        
        // Set URL callback to check for malicious URLs
        _sanitizer.AllowedAttributes.Add(\"href\");
        _sanitizer.FilterUrl += (sender, args) =>
        {
            if (args.OriginalUrl.StartsWith(\"javascript:\", StringComparison.OrdinalIgnoreCase))
            {
                args.SanitizedUrl = \"#\";
            }
        };
    }
    
    public string Sanitize(string html)
    {
        if (string.IsNullOrEmpty(html))
        {
            return html;
        }
        
        return _sanitizer.Sanitize(html);
    }
}

// Usage in a service
public class CommentService : ICommentService
{
    private readonly IHtmlSanitizerService _sanitizer;
    private readonly ICommentRepository _repository;
    
    public CommentService(IHtmlSanitizerService sanitizer, ICommentRepository repository)
    {
        _sanitizer = sanitizer;
        _repository = repository;
    }
    
    public async Task<Comment> CreateCommentAsync(CommentRequest request)
    {
        // Sanitize HTML content before storing
        var sanitizedContent = _sanitizer.Sanitize(request.Content);
        
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Content = sanitizedContent,
            CreatedAt = DateTime.UtcNow
        };
        
        await _repository.CreateAsync(comment);
        
        return comment;
    }
}
```

#### SQL Injection Prevention with EF Core

```csharp
public class UserRepository : IUserRepository
{
    private readonly AppDbContext _dbContext;
    
    public UserRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }
    
    // Safe: Uses parameterized queries through EF Core
    public async Task<User> GetUserByUsernameAsync(string username)
    {
        return await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Username == username);
    }
    
    // Safe: Uses parameterized search with LIKE
    public async Task<IEnumerable<User>> SearchUsersByNameAsync(string searchTerm)
    {
        if (string.IsNullOrEmpty(searchTerm))
        {
            return Enumerable.Empty<User>();
        }
        
        return await _dbContext.Users
            .Where(u => EF.Functions.Like(u.Name, $\"%{searchTerm}%\"))
            .ToListAsync();
    }
    
    // Safe: Validates ID format before querying
    public async Task<User> GetUserByIdAsync(string id)
    {
        if (!Guid.TryParse(id, out var userId))
        {
            return null;
        }
        
        return await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == userId);
    }
    
    // Safe: Uses strongly-typed parameters for sorting
    public async Task<IEnumerable<User>> GetUsersSortedAsync(string sortField, bool ascending)
    {
        IQueryable<User> query = _dbContext.Users;
        
        // Use a whitelist of allowed sort fields
        switch (sortField?.ToLower())
        {
            case \"name\":
                query = ascending ? query.OrderBy(u => u.Name) : query.OrderByDescending(u => u.Name);
                break;
            case \"createdat\":
                query = ascending ? query.OrderBy(u => u.CreatedAt) : query.OrderByDescending(u => u.CreatedAt);
                break;
            default:
                // Default sort by ID
                query = ascending ? query.OrderBy(u => u.Id) : query.OrderByDescending(u => u.Id);
                break;
        }
        
        return await query.ToListAsync();
    }
}
```

### Input Validation Security Considerations

1. **Defense in Depth**: Implement validation at multiple layers (client, API gateway, application).
2. **Strict Schemas**: Define and enforce strict schemas for all API requests.
3. **Contextual Validation**: Validate inputs in the context they will be used (e.g., HTML in HTML context).
4. **Positive Validation**: Use whitelist approach rather than blacklist for input validation.
5. **Type Conversion**: Safely convert strings to their target types before using them.
6. **Null Handling**: Properly handle null or empty inputs in validation logic.
7. **Canonicalization**: Normalize inputs before validation to prevent bypass attacks.

## Data Encryption Strategies

Protecting sensitive data through encryption is essential for API security.

### Data Encryption at Rest

#### Field-Level Encryption

```csharp
// Encryption service interface
public interface IEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
    byte[] Encrypt(byte[] plainData);
    byte[] Decrypt(byte[] cipherData);
}

// AES encryption implementation
public class AesEncryptionService : IEncryptionService
{
    private readonly byte[] _key;
    private readonly byte[] _iv;
    private readonly ILogger<AesEncryptionService> _logger;
    
    public AesEncryptionService(IOptions<EncryptionOptions> options, ILogger<AesEncryptionService> logger)
    {
        // In production, key should come from a secure key management system like Azure Key Vault
        _key = Convert.FromBase64String(options.Value.EncryptionKey);
        _iv = Convert.FromBase64String(options.Value.InitializationVector);
        _logger = logger;
    }
    
    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
        {
            return plainText;
        }
        
        try
        {
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var cipherBytes = Encrypt(plainBytes);
            return Convert.ToBase64String(cipherBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error encrypting string\");
            throw;
        }
    }
    
    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
        {
            return cipherText;
        }
        
        try
        {
            var cipherBytes = Convert.FromBase64String(cipherText);
            var plainBytes = Decrypt(cipherBytes);
            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error decrypting string\");
            throw;
        }
    }
    
    public byte[] Encrypt(byte[] plainData)
    {
        if (plainData == null || plainData.Length == 0)
        {
            return plainData;
        }
        
        try
        {
            using (var aes = Aes.Create())
            {
                aes.Key = _key;
                aes.IV = _iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                
                using (var encryptor = aes.CreateEncryptor(aes.Key, aes.IV))
                using (var ms = new MemoryStream())
                {
                    using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                    {
                        cs.Write(plainData, 0, plainData.Length);
                        cs.FlushFinalBlock();
                    }
                    
                    return ms.ToArray();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error encrypting data\");
            throw;
        }
    }
    
    public byte[] Decrypt(byte[] cipherData)
    {
        if (cipherData == null || cipherData.Length == 0)
        {
            return cipherData;
        }
        
        try
        {
            using (var aes = Aes.Create())
            {
                aes.Key = _key;
                aes.IV = _iv;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                
                using (var decryptor = aes.CreateDecryptor(aes.Key, aes.IV))
                using (var ms = new MemoryStream())
                {
                    using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Write))
                    {
                        cs.Write(cipherData, 0, cipherData.Length);
                        cs.FlushFinalBlock();
                    }
                    
                    return ms.ToArray();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error decrypting data\");
            throw;
        }
    }
}

// Entity with encrypted fields
public class Customer
{
    public Guid Id { get; set; }
    
    public string FirstName { get; set; }
    public string LastName { get; set; }
    
    [Encrypted]
    public string SocialSecurityNumber { get; set; }
    
    [Encrypted]
    public string CreditCardNumber { get; set; }
    
    public string Email { get; set; }
    
    [Encrypted]
    public string PhoneNumber { get; set; }
    
    public DateTime CreatedAt { get; set; }
}

// Encryption attribute
[AttributeUsage(AttributeTargets.Property)]
public class EncryptedAttribute : Attribute
{
}

// Entity Framework value converter for encrypted fields
public class EncryptedValueConverter : ValueConverter<string, string>
{
    public EncryptedValueConverter(IEncryptionService encryptionService)
        : base(
            v => encryptionService.Encrypt(v),
            v => encryptionService.Decrypt(v))
    {
    }
}

// Entity Framework model configuration
public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    private readonly IEncryptionService _encryptionService;
    
    public CustomerConfiguration(IEncryptionService encryptionService)
    {
        _encryptionService = encryptionService;
    }
    
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        // Configure encrypted properties
        builder.Property(c => c.SocialSecurityNumber)
            .HasConversion(new EncryptedValueConverter(_encryptionService));
            
        builder.Property(c => c.CreditCardNumber)
            .HasConversion(new EncryptedValueConverter(_encryptionService));
            
        builder.Property(c => c.PhoneNumber)
            .HasConversion(new EncryptedValueConverter(_encryptionService));
    }
}

// Registration in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    // Register encryption service
    services.Configure<EncryptionOptions>(Configuration.GetSection(\"Encryption\"));
    services.AddSingleton<IEncryptionService, AesEncryptionService>();
    
    // Configure DbContext with encryption
    services.AddDbContext<AppDbContext>((sp, options) =>
    {
        var encryptionService = sp.GetRequiredService<IEncryptionService>();
        
        options.UseSqlServer(Configuration.GetConnectionString(\"DefaultConnection\"));
        options.UseEncryptionService(encryptionService);
    });
}

// DbContext extension for encryption
public static class DbContextEncryptionExtensions
{
    public static void UseEncryptionService(this DbContextOptionsBuilder optionsBuilder, IEncryptionService encryptionService)
    {
        var extension = optionsBuilder.Options.FindExtension<DbContextEncryptionExtension>() 
                        ?? new DbContextEncryptionExtension();
                        
        extension.EncryptionService = encryptionService;
        
        ((IDbContextOptionsBuilderInfrastructure)optionsBuilder).AddOrUpdateExtension(extension);
    }
    
    private class DbContextEncryptionExtension : IDbContextOptionsExtension
    {
        public IEncryptionService EncryptionService { get; set; }
        
        public DbContextOptionsExtensionInfo Info => new ExtensionInfo(this);
        
        public void ApplyServices(IServiceCollection services)
        {
            services.AddSingleton(EncryptionService);
        }
        
        public void Validate(IDbContextOptions options)
        {
        }
        
        private class ExtensionInfo : DbContextOptionsExtensionInfo
        {
            public ExtensionInfo(DbContextEncryptionExtension extension)
                : base(extension)
            {
            }
            
            public override bool IsDatabaseProvider => false;
            
            public override string LogFragment => \"using encryption\";
            
            public override void PopulateDebugInfo(IDictionary<string, string> debugInfo)
            {
                debugInfo[\"Encryption\"] = \"True\";
            }
        }
    }
}

// DbContext with encryption
public class AppDbContext : DbContext
{
    private readonly IEncryptionService _encryptionService;
    
    public AppDbContext(DbContextOptions<AppDbContext> options, IEncryptionService encryptionService)
        : base(options)
    {
        _encryptionService = encryptionService;
    }
    
    public DbSet<Customer> Customers { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.ApplyConfiguration(new CustomerConfiguration(_encryptionService));
    }
}
```

### Transport Layer Security

#### HTTPS Configuration in ASP.NET Core

```csharp
// HTTPS configuration in Startup.cs
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Redirect HTTP to HTTPS
    app.UseHttpsRedirection();
    
    // HSTS configuration
    app.UseHsts();
    
    // Other middleware
}

// Program.cs with enhanced HTTPS configuration
public static IHostBuilder CreateHostBuilder(string[] args) =>
    Host.CreateDefaultBuilder(args)
        .ConfigureWebHostDefaults(webBuilder =>
        {
            webBuilder.UseStartup<Startup>();
            webBuilder.ConfigureKestrel(options =>
            {
                // Configure HTTPS with specific TLS version and cipher suites
                options.ConfigureHttpsDefaults(https =>
                {
                    https.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;
                    
                    // Configure server certificate
                    https.ServerCertificate = LoadCertificate();
                });
            });
        });

// Load certificate from store or file
private static X509Certificate2 LoadCertificate()
{
    // Load from certificate store
    var store = new X509Store(StoreName.My, StoreLocation.LocalMachine);
    store.Open(OpenFlags.ReadOnly);
    
    try
    {
        var certs = store.Certificates.Find(
            X509FindType.FindBySubjectName,
            \"api.example.com\",
            validOnly: true);
            
        if (certs.Count > 0)
        {
            return certs[0];
        }
        
        // Fallback to file
        return new X509Certificate2(
            \"certificate.pfx\",
            \"password\",
            X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.PersistKeySet);
    }
    finally
    {
        store.Close();
    }
}

// HTTPS options in appsettings.json
{
  \"HttpsConfig\": {
    \"UseHsts\": true,
    \"HstsMaxAge\": 365,
    \"IncludeSubDomains\": true,
    \"Preload\": true,
    \"RedirectToHttps\": true,
    \"HttpsPort\": 443
  }
}

// Custom HTTPS configuration options
public class HttpsOptions
{
    public bool UseHsts { get; set; } = true;
    public int HstsMaxAge { get; set; } = 365; // In days
    public bool IncludeSubDomains { get; set; } = true;
    public bool Preload { get; set; } = true;
    public bool RedirectToHttps { get; set; } = true;
    public int HttpsPort { get; set; } = 443;
}

// Custom middleware for HSTS
public class CustomHstsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HttpsOptions _options;
    private readonly ILogger<CustomHstsMiddleware> _logger;
    
    public CustomHstsMiddleware(
        RequestDelegate next,
        IOptions<HttpsOptions> options,
        ILogger<CustomHstsMiddleware> logger)
    {
        _next = next;
        _options = options.Value;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        if (_options.UseHsts && context.Request.IsHttps)
        {
            // Configure HSTS
            var maxAge = TimeSpan.FromDays(_options.HstsMaxAge);
            var header = $\"max-age={maxAge.TotalSeconds}\";
            
            if (_options.IncludeSubDomains)
            {
                header += \"; includeSubDomains\";
            }
            
            if (_options.Preload)
            {
                header += \"; preload\";
            }
            
            context.Response.Headers.Add(\"Strict-Transport-Security\", header);
            _logger.LogDebug(\"Added HSTS header: {Header}\", header);
        }
        
        await _next(context);
    }
}

// Configure custom HTTPS middleware in Startup.cs
public void ConfigureServices(IServiceCollection services)
{
    // Configure HTTPS options
    services.Configure<HttpsOptions>(Configuration.GetSection(\"HttpsConfig\"));
    
    // Add HTTPS redirection
    services.AddHttpsRedirection(options =>
    {
        var httpsOptions = Configuration.GetSection(\"HttpsConfig\").Get<HttpsOptions>();
        options.RedirectStatusCode = StatusCodes.Status307TemporaryRedirect;
        options.HttpsPort = httpsOptions.HttpsPort;
    });
    
    // Add HSTS (if custom middleware not used)
    services.AddHsts(options =>
    {
        var httpsOptions = Configuration.GetSection(\"HttpsConfig\").Get<HttpsOptions>();
        options.MaxAge = TimeSpan.FromDays(httpsOptions.HstsMaxAge);
        options.IncludeSubDomains = httpsOptions.IncludeSubDomains;
        options.Preload = httpsOptions.Preload;
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Use custom middleware, or built-in HSTS middleware
    app.UseMiddleware<CustomHstsMiddleware>();
    // app.UseHsts();
    
    if (Configuration.GetValue<bool>(\"HttpsConfig:RedirectToHttps\"))
    {
        app.UseHttpsRedirection();
    }
    
    // Other middleware
}
```

### Client-Side Encryption

```csharp
// Client-side encryption for sensitive data
public class ApiClient
{
    private readonly HttpClient _httpClient;
    private readonly IEncryptionService _encryptionService;
    private readonly ApiClientOptions _options;
    private readonly ILogger<ApiClient> _logger;
    
    public ApiClient(
        HttpClient httpClient,
        IEncryptionService encryptionService,
        IOptions<ApiClientOptions> options,
        ILogger<ApiClient> logger)
    {
        _httpClient = httpClient;
        _encryptionService = encryptionService;
        _options = options.Value;
        _logger = logger;
        
        // Configure the HttpClient
        _httpClient.BaseAddress = new Uri(_options.BaseUrl);
        _httpClient.DefaultRequestHeaders.Add(\"X-API-Key\", _options.ApiKey);
    }
    
    public async Task<PaymentResponse> ProcessPaymentAsync(PaymentRequest request)
    {
        try
        {
            // Encrypt sensitive fields before sending
            var encryptedRequest = new EncryptedPaymentRequest
            {
                OrderId = request.OrderId,
                Amount = request.Amount,
                Currency = request.Currency,
                
                // Encrypt sensitive data
                CardNumber = _encryptionService.Encrypt(request.CardNumber),
                CardHolderName = _encryptionService.Encrypt(request.CardHolderName),
                ExpiryDate = _encryptionService.Encrypt(request.ExpiryDate),
                Cvv = _encryptionService.Encrypt(request.Cvv)
            };
            
            // Create the HTTP request
            var content = new StringContent(
                JsonSerializer.Serialize(encryptedRequest),
                Encoding.UTF8,
                \"application/json\");
                
            // Send the request
            var response = await _httpClient.PostAsync(\"api/payments\", content);
            
            // Ensure success response
            response.EnsureSuccessStatusCode();
            
            // Parse the response
            var responseContent = await response.Content.ReadAsStringAsync();
            var paymentResponse = JsonSerializer.Deserialize<PaymentResponse>(responseContent);
            
            return paymentResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing payment\");
            throw;
        }
    }
}

// Models for payment processing
public class PaymentRequest
{
    public string OrderId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; }
    
    // Sensitive data
    public string CardNumber { get; set; }
    public string CardHolderName { get; set; }
    public string ExpiryDate { get; set; }
    public string Cvv { get; set; }
}

public class EncryptedPaymentRequest
{
    public string OrderId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; }
    
    // Encrypted sensitive data
    public string CardNumber { get; set; }
    public string CardHolderName { get; set; }
    public string ExpiryDate { get; set; }
    public string Cvv { get; set; }
}

public class PaymentResponse
{
    public string TransactionId { get; set; }
    public string Status { get; set; }
    public DateTime Timestamp { get; set; }
}
```

### Data Encryption Security Considerations

1. **Key Management**: Use a secure key management system (e.g., Azure Key Vault, AWS KMS).
2. **Key Rotation**: Implement regular key rotation policies.
3. **Algorithm Selection**: Choose strong, standardized encryption algorithms (AES-256, RSA-2048).
4. **Protect Key Material**: Never hardcode or store encryption keys in plain text.
5. **Encrypt in Motion**: Always use TLS 1.2+ with strong cipher suites.
6. **Encrypt at Rest**: Protect sensitive data stored in databases and files.
7. **Field-Level Encryption**: Apply encryption only to sensitive fields, not entire databases.

## API Vulnerability Scanning

Regular security testing is essential for identifying and addressing vulnerabilities in APIs.

### OWASP API Security Top 10

The OWASP API Security Top 10 represents the most critical API security risks:

1. **Broken Object Level Authorization**: APIs expose endpoints that handle object identifiers, creating a wide attack surface of Object Level Access Control issues.
2. **Broken User Authentication**: Authentication mechanisms are implemented incorrectly, allowing attackers to assume other users' identities.
3. **Excessive Data Exposure**: APIs may expose more data than necessary, relying on clients to filter the results.
4. **Lack of Resources & Rate Limiting**: APIs do not implement proper rate limiting, leaving them vulnerable to denial of service attacks.
5. **Broken Function Level Authorization**: APIs may not properly restrict function access based on user roles and permissions.
6. **Mass Assignment**: Binding client-provided data to data models without proper filtering can allow attackers to modify object properties they shouldn't have access to.
7. **Security Misconfiguration**: Security controls may be missing or improperly configured, exposing sensitive data or functionality.
8. **Injection**: Attackers can inject malicious code into APIs to extract data or execute unauthorized commands.
9. **Improper Assets Management**: Outdated or unmaintained API versions may expose critical vulnerabilities.
10. **Insufficient Logging & Monitoring**: Inadequate logging and monitoring prevent the timely detection of security incidents.

### API Scanning Tools

#### OWASP ZAP for API Security Testing

```bash
# Basic ZAP API scan
docker run -t owasp/zap2docker-stable zap-api-scan.py -t https://api.example.com/openapi.json -f openapi

# Advanced ZAP scan with authentication
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable zap-api-scan.py \\
  -t https://api.example.com/openapi.json \\
  -f openapi \\
  -d \\
  -r api-scan-report.html \\
  -w api-scan-report.md \\
  -J json-report.json \\
  -z \"-config api.disablekey=true -config scanner.attackStrength=HIGH\"
```

#### Postman Collection Security Testing with Newman

```bash
# Run security tests with Newman
npm install -g newman
newman run API_Security_Tests.postman_collection.json -e Dev_Environment.json

# Generate report
newman run API_Security_Tests.postman_collection.json -e Dev_Environment.json \\
  --reporters cli,htmlextra \\
  --reporter-htmlextra-export ./reports/api-security-report.html
```

Example Postman test for token validation:

```javascript
// Postman Collection - JWT Token Validation Tests
pm.test(\"Response should have valid JWT\", function() {
    const response = pm.response.json();
    
    // Check if token exists
    pm.expect(response.token).to.exist;
    
    // Parse JWT token
    const [header, payload, signature] = response.token.split('.');
    
    // Decode header
    const decodedHeader = JSON.parse(atob(header));
    
    // Verify header components
    pm.expect(decodedHeader.alg).to.equal(\"RS256\");
    pm.expect(decodedHeader.typ).to.equal(\"JWT\");
    
    // Decode payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Verify payload components
    pm.expect(decodedPayload.iss).to.equal(\"https://auth.example.com\");
    pm.expect(decodedPayload.aud).to.equal(\"api.example.com\");
    
    // Validate expiration
    pm.expect(decodedPayload.exp).to.be.above(Math.floor(Date.now() / 1000));
    
    // Store token for next request
    pm.environment.set(\"auth_token\", response.token);
});
```

#### Automated API Security Testing in CI/CD

```yaml
# GitHub Actions workflow for API security testing
name: API Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1'  # Weekly scan on Mondays at 2:00 AM

jobs:
  zap_scan:
    name: ZAP API Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        
      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.1.0
        with:
          target: 'https://dev-api.example.com/openapi.json'
          format: 'openapi'
          fail_action: 'false'
          token: ${{ secrets.GITHUB_TOKEN }}
          docker_name: 'owasp/zap2docker-stable'
          
      - name: Upload ZAP Report
        uses: actions/upload-artifact@v2
        with:
          name: zap-scan-report
          path: report.html
          
  security_tests:
    name: API Security Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        
      - name: Install Newman
        run: |
          npm install -g newman
          npm install -g newman-reporter-htmlextra
          
      - name: Run API Security Tests
        run: |
          newman run ./tests/API_Security_Tests.postman_collection.json \\
            -e ./tests/Dev_Environment.json \\
            --reporters cli,htmlextra \\
            --reporter-htmlextra-export ./security-report.html
            
      - name: Upload Security Test Report
        uses: actions/upload-artifact@v2
        with:
          name: security-test-report
          path: security-report.html
          
  dependency_scan:
    name: Dependency Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        
      - name: Setup .NET
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: '7.0.x'
          
      - name: Scan for vulnerabilities
        id: scan
        uses: snyk/actions/dotnet@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
          
      - name: Upload vulnerability report
        uses: actions/upload-artifact@v2
        with:
          name: vulnerability-report
          path: snyk-report.json
```

### Custom Security Testing Tools

#### API Fuzzer for Input Validation Testing

```csharp
public class ApiFuzzer
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ApiFuzzer> _logger;
    private readonly FuzzerOptions _options;
    
    public ApiFuzzer(
        HttpClient httpClient,
        ILogger<ApiFuzzer> logger,
        IOptions<FuzzerOptions> options)
    {
        _httpClient = httpClient;
        _logger = logger;
        _options = options.Value;
        
        // Configure the HttpClient
        _httpClient.BaseAddress = new Uri(_options.BaseUrl);
        
        if (!string.IsNullOrEmpty(_options.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Add(\"X-API-Key\", _options.ApiKey);
        }
        
        if (!string.IsNullOrEmpty(_options.AuthToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(\"Bearer\", _options.AuthToken);
        }
    }
    
    public async Task<FuzzingReport> FuzzEndpointAsync(string endpoint, HttpMethod method, Dictionary<string, string> parameters)
    {
        var report = new FuzzingReport
        {
            Endpoint = endpoint,
            Method = method.ToString(),
            StartTime = DateTime.UtcNow,
            TestResults = new List<FuzzingTestResult>()
        };
        
        try
        {
            // Generate fuzzing payloads
            var payloads = GenerateFuzzingPayloads();
            
            foreach (var param in parameters)
            {
                foreach (var payload in payloads)
                {
                    // Clone the parameters and inject the fuzzing payload
                    var fuzzedParams = new Dictionary<string, string>(parameters);
                    fuzzedParams[param.Key] = payload;
                    
                    // Execute the test
                    var result = await ExecuteFuzzTestAsync(endpoint, method, fuzzedParams);
                    report.TestResults.Add(result);
                    
                    // Check for potential vulnerabilities
                    if (result.StatusCode >= 500 || result.ResponseTime > _options.SlowResponseThreshold)
                    {
                        result.PotentialIssue = true;
                        result.IssueDescription = $\"Potential vulnerability detected: Server error or slow response with payload: {payload}\";
                    }
                    
                    // Add a delay between requests to avoid overloading the API
                    await Task.Delay(_options.RequestDelay);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error during fuzzing test for {Endpoint}\", endpoint);
            report.Error = ex.Message;
        }
        
        report.EndTime = DateTime.UtcNow;
        report.Duration = report.EndTime - report.StartTime;
        report.TotalTests = report.TestResults.Count;
        report.SuccessfulTests = report.TestResults.Count(r => r.Success);
        report.PotentialIssues = report.TestResults.Count(r => r.PotentialIssue);
        
        return report;
    }
    
    private List<string> GenerateFuzzingPayloads()
    {
        // List of common payloads for fuzzing
        return new List<string>
        {
            // SQL Injection
            \"' OR 1=1 --\",
            \"admin' --\",
            \"' UNION SELECT NULL, NULL, NULL --\",
            
            // XSS
            \"<script>alert(1)</script>\",
            \"javascript:alert(1)\",
            \"<img src=x onerror=alert(1)>\",
            
            // Command Injection
            \"& ls -la\",
            \"| cat /etc/passwd\",
            \"; echo 'pwned'\",
            
            // Path Traversal
            \"../../../etc/passwd\",
            \"..%2F..%2F..%2Fetc%2Fpasswd\",
            \"\\\\..\\\\..\\\\Windows\\\\System32\\\\cmd.exe\",
            
            // NoSQL Injection
            \"{ \\\"$gt\\\": \\\"\\\" }\",
            \"{ \\\"$where\\\": \\\"this.password == this.password\\\" }\",
            
            // Special Characters
            \"!@#$%^&*()_+{}|\\\"><?\",
            \"😀😁😂🤣😃😄😅\",
            
            // Buffer Overflow Attempts
            new string('A', 1000),
            new string('A', 10000),
            
            // Format String
            \"%s%s%s%s%s%s%s%s%s%s\",
            \"%x%x%x%x%x%x%x%x%x%x\",
            
            // Null Bytes
            \"test\\0\",
            \"test%00\",
            
            // LDAP Injection
            \"*)(|(objectClass=*)\",
            \"*)((|userPassword=*)\"
        };
    }
    
    private async Task<FuzzingTestResult> ExecuteFuzzTestAsync(string endpoint, HttpMethod method, Dictionary<string, string> parameters)
    {
        var result = new FuzzingTestResult
        {
            Parameter = parameters.FirstOrDefault(p => p.Value.Contains(\"<\") || p.Value.Contains(\"'\") || p.Value.Length > 100).Key,
            Payload = parameters.FirstOrDefault(p => p.Value.Contains(\"<\") || p.Value.Contains(\"'\") || p.Value.Length > 100).Value,
            Timestamp = DateTime.UtcNow,
            Success = false
        };
        
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            HttpResponseMessage response;
            
            if (method == HttpMethod.Get)
            {
                // Build query string
                var queryString = string.Join(\"&\", parameters.Select(p => $\"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}\"));
                var url = $\"{endpoint}?{queryString}\";
                
                response = await _httpClient.GetAsync(url);
            }
            else // POST
            {
                var content = new FormUrlEncodedContent(parameters);
                response = await _httpClient.PostAsync(endpoint, content);
            }
            
            stopwatch.Stop();
            result.ResponseTime = stopwatch.ElapsedMilliseconds;
            result.StatusCode = (int)response.StatusCode;
            result.Success = true;
            
            if (response.IsSuccessStatusCode)
            {
                result.ResponseContent = await response.Content.ReadAsStringAsync();
                
                // Truncate very large responses
                if (result.ResponseContent.Length > _options.MaxResponseLength)
                {
                    result.ResponseContent = result.ResponseContent.Substring(0, _options.MaxResponseLength) + \"...\";
                }
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            result.ResponseTime = stopwatch.ElapsedMilliseconds;
            result.Error = ex.Message;
            _logger.LogWarning(ex, \"Error during fuzz test with payload {Payload}\", result.Payload);
        }
        
        return result;
    }
}

// Fuzzing options
public class FuzzerOptions
{
    public string BaseUrl { get; set; }
    public string ApiKey { get; set; }
    public string AuthToken { get; set; }
    public int RequestDelay { get; set; } = 500; // ms
    public int SlowResponseThreshold { get; set; } = 5000; // ms
    public int MaxResponseLength { get; set; } = 1000; // chars
}

// Fuzzing report models
public class FuzzingReport
{
    public string Endpoint { get; set; }
    public string Method { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public TimeSpan Duration { get; set; }
    public int TotalTests { get; set; }
    public int SuccessfulTests { get; set; }
    public int PotentialIssues { get; set; }
    public string Error { get; set; }
    public List<FuzzingTestResult> TestResults { get; set; }
}

public class FuzzingTestResult
{
    public string Parameter { get; set; }
    public string Payload { get; set; }
    public DateTime Timestamp { get; set; }
    public long ResponseTime { get; set; }
    public int StatusCode { get; set; }
    public bool Success { get; set; }
    public string ResponseContent { get; set; }
    public string Error { get; set; }
    public bool PotentialIssue { get; set; }
    public string IssueDescription { get; set; }
}
```

## API Security Monitoring

Robust monitoring and logging are essential for detecting, investigating, and responding to security incidents.

### Logging Best Practices

```csharp
// API logging middleware
public class ApiLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiLoggingMiddleware> _logger;
    private readonly ApiLoggingOptions _options;
    
    public ApiLoggingMiddleware(
        RequestDelegate next,
        ILogger<ApiLoggingMiddleware> logger,
        IOptions<ApiLoggingOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        context.Request.EnableBuffering();
        
        var correlationId = GetOrCreateCorrelationId(context);
        var userId = GetUserIdentifier(context);
        
        // Create a scope for the request
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            [\"CorrelationId\"] = correlationId,
            [\"UserId\"] = userId ?? \"anonymous\",
            [\"ClientIp\"] = context.Connection.RemoteIpAddress?.ToString() ?? \"unknown\",
            [\"UserAgent\"] = context.Request.Headers[\"User-Agent\"].ToString()
        });
        
        // Log request details
        await LogRequestAsync(context);
        
        // Capture the original body stream
        var originalBodyStream = context.Response.Body;
        
        // Create a new memory stream to capture the response
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;
        
        var sw = Stopwatch.StartNew();
        
        try
        {
            // Call the next middleware
            await _next(context);
            
            sw.Stop();
            
            // Log response details
            await LogResponseAsync(context, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            
            // Log the exception
            _logger.LogError(ex, \"Request failed: {Method} {Path} - {StatusCode} in {ElapsedMs}ms\",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds);
                
            // Re-throw the exception
            throw;
        }
        finally
        {
            // Copy the response body to the original stream
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
            
            // Restore the original body stream
            context.Response.Body = originalBodyStream;
        }
    }
    
    private string GetOrCreateCorrelationId(HttpContext context)
    {
        // Check for existing correlation ID in the request headers
        if (context.Request.Headers.TryGetValue(_options.CorrelationIdHeader, out var correlationId) &&
            !string.IsNullOrEmpty(correlationId))
        {
            return correlationId;
        }
        
        // Generate a new correlation ID
        var newCorrelationId = Guid.NewGuid().ToString();
        
        // Add to response headers
        context.Response.Headers[_options.CorrelationIdHeader] = newCorrelationId;
        
        return newCorrelationId;
    }
    
    private string GetUserIdentifier(HttpContext context)
    {
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            // Try to get from claims
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)
                           ?? context.User.FindFirst(\"sub\");
                           
            if (userIdClaim != null)
            {
                return userIdClaim.Value;
            }
            
            return context.User.Identity.Name;
        }
        
        return null;
    }
    
    private async Task LogRequestAsync(HttpContext context)
    {
        // Don't log health check endpoints
        if (IsHealthCheckEndpoint(context.Request.Path))
        {
            return;
        }
        
        var request = context.Request;
        var logLevel = _options.DefaultLogLevel;
        
        // Increase log level for sensitive endpoints
        if (IsSensitiveEndpoint(request.Path))
        {
            logLevel = LogLevel.Information;
        }
        
        // Basic request details
        var logMessage = $\"HTTP {request.Method} {request.Path}{request.QueryString} - {request.ContentType}\";
        
        // Log request headers if enabled
        if (_options.LogRequestHeaders)
        {
            var headers = string.Join(\", \", 
                request.Headers
                    .Where(h => !_options.ExcludedHeaders.Contains(h.Key, StringComparer.OrdinalIgnoreCase))
                    .Select(h => $\"{h.Key}: {h.Value}\"));
                    
            logMessage += $\" - Headers: {headers}\";
        }
        
        // Log request body if enabled and content type matches
        if (_options.LogRequestBody && 
            request.ContentType != null && 
            _options.LogContentTypes.Any(ct => request.ContentType.Contains(ct)))
        {
            // Read the request body
            request.Body.Position = 0;
            using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
            
            // Sanitize body to remove sensitive data
            var sanitizedBody = SanitizeBody(body);
            
            if (!string.IsNullOrEmpty(sanitizedBody))
            {
                logMessage += $\" - Body: {sanitizedBody}\";
            }
        }
        _logger.Log(logLevel, logMessage);
    }
    
    private async Task LogResponseAsync(HttpContext context, long elapsedMs)
    {
        if (IsHealthCheckEndpoint(context.Request.Path))
        {
            return;
        }
        
        var response = context.Response;
        var logLevel = _options.DefaultLogLevel;
        
        // Increase log level for errors
        if (response.StatusCode >= 400)
        {
            logLevel = response.StatusCode >= 500 ? LogLevel.Error : LogLevel.Warning;
        }
        
        // Basic response details
        var logMessage = $\"HTTP {context.Request.Method} {context.Request.Path} - {response.StatusCode} in {elapsedMs}ms\";
        
        // Log response headers if enabled
        if (_options.LogResponseHeaders)
        {
            var headers = string.Join(\", \", 
                response.Headers
                    .Where(h => !_options.ExcludedHeaders.Contains(h.Key, StringComparer.OrdinalIgnoreCase))
                    .Select(h => $\"{h.Key}: {h.Value}\"));
                    
            logMessage += $\" - Headers: {headers}\";
        }
        
        // Log response body if enabled and content type matches
        if (_options.LogResponseBody &&
            response.ContentType != null &&
            _options.LogContentTypes.Any(ct => response.ContentType.Contains(ct)))
        {
            // Read the response body
            response.Body.Position = 0;
            using var reader = new StreamReader(response.Body, Encoding.UTF8, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            response.Body.Position = 0;
            
            // Truncate body if it's too large
            var truncatedBody = body.Length > _options.MaxBodyLength
                ? body.Substring(0, _options.MaxBodyLength) + \"...\"
                : body;
                
            logMessage += $\" - Body: {truncatedBody}\";
        }
        
        // Log the response
        _logger.Log(logLevel, logMessage);
    }
    
    private bool IsHealthCheckEndpoint(PathString path)
    {
        return _options.HealthCheckEndpoints.Any(endpoint => path.StartsWithSegments(endpoint));
    }
    
    private bool IsSensitiveEndpoint(PathString path)
    {
        return _options.SensitiveEndpoints.Any(endpoint => path.StartsWithSegments(endpoint));
    }
    
    private string SanitizeBody(string body)
    {
        if (string.IsNullOrEmpty(body))
        {
            return body;
        }
        
        // Truncate if too large
        var truncatedBody = body.Length > _options.MaxBodyLength
            ? body.Substring(0, _options.MaxBodyLength) + \"...\"
            : body;
            
        // Try to parse as JSON to redact sensitive fields
        try
        {
            if (body.StartsWith(\"{\") || body.StartsWith(\"[\"))
            {
                var jsonDoc = JsonDocument.Parse(body);
                var output = new MemoryStream();
                
                using (var writer = new Utf8JsonWriter(output, new JsonWriterOptions { Indented = false }))
                {
                    RedactSensitiveData(jsonDoc.RootElement, writer, _options.SensitiveFieldNames);
                }
                
                output.Position = 0;
                using var reader = new StreamReader(output);
                return reader.ReadToEnd();
            }
        }
        catch (JsonException)
        {
            // Not valid JSON, return as is
        }
        
        // For non-JSON payloads, apply regex-based redaction of sensitive values
        var redactedBody = truncatedBody;
        
        foreach (var pattern in _options.SensitiveValuePatterns)
        {
            redactedBody = Regex.Replace(redactedBody, pattern, \"[REDACTED]\");
        }
        
        return redactedBody;
    }
    
    private void RedactSensitiveData(JsonElement element, Utf8JsonWriter writer, HashSet<string> sensitiveFields)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                
                foreach (var property in element.EnumerateObject())
                {
                    writer.WritePropertyName(property.Name);
                    
                    if (sensitiveFields.Contains(property.Name, StringComparer.OrdinalIgnoreCase))
                    {
                        writer.WriteStringValue(\"[REDACTED]\");
                    }
                    else
                    {
                        RedactSensitiveData(property.Value, writer, sensitiveFields);
                    }
                }
                
                writer.WriteEndObject();
                break;
                
            case JsonValueKind.Array:
                writer.WriteStartArray();
                
                foreach (var item in element.EnumerateArray())
                {
                    RedactSensitiveData(item, writer, sensitiveFields);
                }
                
                writer.WriteEndArray();
                break;
                
            default:
                element.WriteTo(writer);
                break;
        }
    }
}

// API logging options
public class ApiLoggingOptions
{
    public LogLevel DefaultLogLevel { get; set; } = LogLevel.Information;
    public string CorrelationIdHeader { get; set; } = \"X-Correlation-ID\";
    public bool LogRequestHeaders { get; set; } = true;
    public bool LogResponseHeaders { get; set; } = true;
    public bool LogRequestBody { get; set; } = true;
    public bool LogResponseBody { get; set; } = true;
    public int MaxBodyLength { get; set; } = 4096;
    public List<string> LogContentTypes { get; set; } = new List<string> { \"application/json\", \"application/xml\", \"text/\" };
    public HashSet<string> ExcludedHeaders { get; set; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        \"Authorization\",
        \"Cookie\",
        \"X-API-Key\"
    };
    public HashSet<string> SensitiveFieldNames { get; set; } = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        \"password\",
        \"passwordConfirmation\",
        \"secret\",
        \"token\",
        \"apiKey\",
        \"creditCard\",
        \"ssn\",
        \"socialSecurity\",
        \"accountNumber\",
        \"cvv\"
    };
    public List<string> SensitiveValuePatterns { get; set; } = new List<string>
    {
        // Credit card pattern
        \"\\\\b(?:\\\\d[ -]*?){13,16}\\\\b\",
        // SSN pattern
        \"\\\\b\\\\d{3}-\\\\d{2}-\\\\d{4}\\\\b\"
    };
    public List<string> HealthCheckEndpoints { get; set; } = new List<string>
    {
        \"/health\",
        \"/healthcheck\",
        \"/ping\"
    };
    public List<string> SensitiveEndpoints { get; set; } = new List<string>
    {
        \"/api/auth\",
        \"/api/users\",
        \"/api/admin\"
    };
}
```

### Security Monitoring with Azure Application Insights

```csharp
// Startup.cs configuration for Application Insights
public void ConfigureServices(IServiceCollection services)
{
    // Add Application Insights
    services.AddApplicationInsightsTelemetry(options =>
    {
        options.EnableAdaptiveSampling = false; // Ensure all security events are captured
        options.EnableQuickPulseMetricStream = true; // Enable Live Metrics
    });
    
    // Add custom security telemetry initializer
    services.AddSingleton<ITelemetryInitializer, SecurityTelemetryInitializer>();
}

// Custom telemetry initializer for security events
public class SecurityTelemetryInitializer : ITelemetryInitializer
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    public SecurityTelemetryInitializer(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }
    
    public void Initialize(ITelemetry telemetry)
    {
        var context = _httpContextAccessor.HttpContext;
        
        if (context == null)
        {
            return;
        }
        
        // Add security-related properties to all telemetry
        AddSecurityProperties(telemetry, context);
        
        // For request telemetry, add additional security context
        if (telemetry is RequestTelemetry requestTelemetry)
        {
            EnhanceRequestTelemetry(requestTelemetry, context);
        }
        
        // For exception telemetry, mark security-related exceptions
        if (telemetry is ExceptionTelemetry exceptionTelemetry)
        {
            IdentifySecurityExceptions(exceptionTelemetry);
        }
    }
    
    private void AddSecurityProperties(ITelemetry telemetry, HttpContext context)
    {
        // Add user identity information
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.Identity.Name;
            telemetry.Context.User.AuthenticatedUserId = userId;
            
            // Add roles if available
            var roles = context.User.FindAll(ClaimTypes.Role).Select(c => c.Value);
            if (roles.Any())
            {
                telemetry.Context.GlobalProperties[\"UserRoles\"] = string.Join(\",\", roles);
            }
        }
        
        // Add client IP address with appropriate masking for privacy
        var clientIp = context.Connection.RemoteIpAddress?.ToString();
        if (!string.IsNullOrEmpty(clientIp))
        {
            // Optionally mask the last octet for privacy
            // var maskedIp = MaskIpAddress(clientIp);
            telemetry.Context.GlobalProperties[\"ClientIP\"] = clientIp;
        }
        
        // Add API key identifier if present (without the actual key value)
        if (context.Request.Headers.TryGetValue(\"X-API-Key\", out var apiKey))
        {
            // Store a hash of the API key, not the actual key
            using var sha = SHA256.Create();
            var hash = Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(apiKey)));
            telemetry.Context.GlobalProperties[\"ApiKeyHash\"] = hash;
        }
    }
    
    private void EnhanceRequestTelemetry(RequestTelemetry requestTelemetry, HttpContext context)
    {
        // Tag requests to sensitive endpoints
        var path = context.Request.Path.Value.ToLowerInvariant();
        
        if (path.Contains(\"/auth\") || path.Contains(\"/login\") || path.Contains(\"/token\"))
        {
            requestTelemetry.Properties[\"IsSensitiveEndpoint\"] = \"true\";
            requestTelemetry.Properties[\"EndpointType\"] = \"Authentication\";
        }
        else if (path.Contains(\"/admin\") || path.Contains(\"/users\"))
        {
            requestTelemetry.Properties[\"IsSensitiveEndpoint\"] = \"true\";
            requestTelemetry.Properties[\"EndpointType\"] = \"UserManagement\";
        }
        
        // Mark potential security probes
        if (IsPotentialSecurityProbe(context))
        {
            requestTelemetry.Properties[\"IsPotentialSecurityProbe\"] = \"true\";
            
            // Set higher severity for monitoring alerts
            requestTelemetry.Properties[\"Severity\"] = \"High\";
        }
    }
    
    private bool IsPotentialSecurityProbe(HttpContext context)
    {
        var request = context.Request;
        var path = request.Path.Value.ToLowerInvariant();
        var query = request.QueryString.Value.ToLowerInvariant();
        
        // Check for common attack patterns in the URL
        if (path.Contains(\"admin\") || path.Contains(\"phpMyAdmin\") || path.Contains(\"wp-login\") ||
            path.Contains(\".env\") || path.Contains(\".git\") || path.Contains(\".htaccess\"))
        {
            return true;
        }
        
        // Check for SQL injection attempts
        if (query.Contains(\"'\") || query.Contains(\"--\") || query.Contains(\";\") ||
            query.Contains(\"=1=1\") || query.Contains(\"union select\"))
        {
            return true;
        }
        
        // Check for XSS attempts
        if (query.Contains(\"<script\") || query.Contains(\"javascript:\") ||
            query.Contains(\"onerror=\") || query.Contains(\"onload=\"))
        {
            return true;
        }
        
        return false;
    }
    
    private void IdentifySecurityExceptions(ExceptionTelemetry exceptionTelemetry)
    {
        var exception = exceptionTelemetry.Exception;
        
        // Identify security-related exceptions
        if (exception is SecurityException ||
            exception is AuthenticationException ||
            exception is AuthorizationException ||
            exception.Message.Contains(\"auth\") ||
            exception.Message.Contains(\"permission\") ||
            exception.Message.Contains(\"access denied\") ||
            exception.Message.Contains(\"unauthorized\") ||
            exception.Message.Contains(\"forbidden\"))
        {
            exceptionTelemetry.Properties[\"IsSecurityException\"] = \"true\";
            
            // Set higher severity for monitoring alerts
            exceptionTelemetry.Properties[\"Severity\"] = \"High\";
        }
    }
    
    // Optionally mask the last octet of IP address for privacy
    private string MaskIpAddress(string ipAddress)
    {
        if (ipAddress.Contains(\".\"))
        {
            // IPv4
            var parts = ipAddress.Split('.');
            if (parts.Length == 4)
            {
                return $\"{parts[0]}.{parts[1]}.{parts[2]}.*\";
            }
        }
        else if (ipAddress.Contains(\":\"))
        {
            // IPv6
            var parts = ipAddress.Split(':');
            if (parts.Length > 4)
            {
                var maskedParts = parts.Take(4).Concat(Enumerable.Repeat(\"*\", parts.Length - 4));
                return string.Join(\":\", maskedParts);
            }
        }
        
        return ipAddress;
    }
}

// Security monitoring service with Application Insights
public class SecurityMonitoringService : ISecurityMonitoringService
{
    private readonly TelemetryClient _telemetryClient;
    private readonly ILogger<SecurityMonitoringService> _logger;
    
    public SecurityMonitoringService(
        TelemetryClient telemetryClient,
        ILogger<SecurityMonitoringService> logger)
    {
        _telemetryClient = telemetryClient;
        _logger = logger;
    }
    
    public void TrackAuthenticationEvent(AuthenticationEventType eventType, string userId, bool success, string ipAddress, Dictionary<string, string> additionalProperties = null)
    {
        var properties = new Dictionary<string, string>
        {
            [\"EventCategory\"] = \"Authentication\",
            [\"EventType\"] = eventType.ToString(),
            [\"UserId\"] = userId,
            [\"Success\"] = success.ToString(),
            [\"IPAddress\"] = ipAddress
        };
        
        // Add additional properties
        if (additionalProperties != null)
        {
            foreach (var prop in additionalProperties)
            {
                properties[prop.Key] = prop.Value;
            }
        }
        
        // Track custom event
        _telemetryClient.TrackEvent(\"AuthenticationEvent\", properties);
        
        // Log the event
        var logLevel = success ? LogLevel.Information : LogLevel.Warning;
        _logger.Log(logLevel, \"Authentication {EventType} for user {UserId} from {IPAddress}: {Success}\",
            eventType, userId, ipAddress, success ? \"Success\" : \"Failure\");
            
        // For failures, track as metric for alerting
        if (!success)
        {
            _telemetryClient.GetMetric(\"FailedAuthentications\").TrackValue(1);
        }
    }
    
    public void TrackAuthorizationEvent(string userId, string resource, string action, bool success, Dictionary<string, string> additionalProperties = null)
    {
        var properties = new Dictionary<string, string>
        {
            [\"EventCategory\"] = \"Authorization\",
            [\"UserId\"] = userId,
            [\"Resource\"] = resource,
            [\"Action\"] = action,
            [\"Success\"] = success.ToString()
        };
        
        // Add additional properties
        if (additionalProperties != null)
        {
            foreach (var prop in additionalProperties)
            {
                properties[prop.Key] = prop.Value;
            }
        }
        
        // Track custom event
        _telemetryClient.TrackEvent(\"AuthorizationEvent\", properties);
        
        // Log the event
        var logLevel = success ? LogLevel.Information : LogLevel.Warning;
        _logger.Log(logLevel, \"Authorization {Action} on {Resource} for user {UserId}: {Success}\",
            action, resource, userId, success ? \"Success\" : \"Failure\");
            
        // For failures, track as metric for alerting
        if (!success)
        {
            _telemetryClient.GetMetric(\"FailedAuthorizations\").TrackValue(1);
        }
    }
    
    public void TrackSecurityEvent(SecurityEventType eventType, string description, SeverityLevel severity, Dictionary<string, string> additionalProperties = null)
    {
        var properties = new Dictionary<string, string>
        {
            [\"EventCategory\"] = \"Security\",
            [\"EventType\"] = eventType.ToString(),
            [\"Description\"] = description,
            [\"Severity\"] = severity.ToString()
        };
        
        // Add additional properties
        if (additionalProperties != null)
        {
            foreach (var prop in additionalProperties)
            {
                properties[prop.Key] = prop.Value;
            }
        }
        
        // Track custom event
        _telemetryClient.TrackEvent(\"SecurityEvent\", properties);
        
        // Log the event
        var logLevel = severity switch
        {
            SeverityLevel.Verbose => LogLevel.Trace,
            SeverityLevel.Information => LogLevel.Information,
            SeverityLevel.Warning => LogLevel.Warning,
            SeverityLevel.Error => LogLevel.Error,
            SeverityLevel.Critical => LogLevel.Critical,
            _ => LogLevel.Information
        };
        
        _logger.Log(logLevel, \"Security event {EventType}: {Description} (Severity: {Severity})\",
            eventType, description, severity);
            
        // For high severity events, track as metric for alerting
        if (severity >= SeverityLevel.Warning)
        {
            _telemetryClient.GetMetric(\"SecurityEvents\").TrackValue(1, severity.ToString());
        }
    }
    
    public void TrackRateLimitingEvent(string clientId, string endpoint, int limitExceededCount)
    {
        var properties = new Dictionary<string, string>
        {
            [\"EventCategory\"] = \"RateLimiting\",
            [\"ClientId\"] = clientId,
            [\"Endpoint\"] = endpoint,
            [\"LimitExceededCount\"] = limitExceededCount.ToString()
        };
        
        // Track custom event
        _telemetryClient.TrackEvent(\"RateLimitingEvent\", properties);
        
        // Log the event
        _logger.LogWarning(\"Rate limit exceeded for client {ClientId} on endpoint {Endpoint} ({Count} times)\",
            clientId, endpoint, limitExceededCount);
            
        // Track as metric for alerting
        _telemetryClient.GetMetric(\"RateLimitingEvents\").TrackValue(limitExceededCount);
    }
}

// Security event types
public enum AuthenticationEventType
{
    Login,
    Logout,
    PasswordChange,
    PasswordReset,
    MfaChallenge,
    TokenRefresh,
    ApiKeyUsage
}

public enum SecurityEventType
{
    AccessControl,
    DataAccess,
    DataModification,
    ConfigurationChange,
    UserCreation,
    UserModification,
    RoleChange,
    ApiKeyGeneration,
    ApiKeyRevocation,
    SuspiciousActivity,
    BruteForceAttempt,
    PotentialDataLeakage,
    AnomalousApiUsage
}
```

### Security Alerting and Notifications

```csharp
// Security alert manager for incident detection and notification
public class SecurityAlertManager : ISecurityAlertManager
{
    private readonly IEmailService _emailService;
    private readonly ISlackService _slackService;
    private readonly IEventHubService _eventHubService;
    private readonly SecurityAlertOptions _options;
    private readonly ILogger<SecurityAlertManager> _logger;
    
    public SecurityAlertManager(
        IEmailService emailService,
        ISlackService slackService,
        IEventHubService eventHubService,
        IOptions<SecurityAlertOptions> options,
        ILogger<SecurityAlertManager> logger)
    {
        _emailService = emailService;
        _slackService = slackService;
        _eventHubService = eventHubService;
        _options = options.Value;
        _logger = logger;
    }
    
    public async Task TriggerAlertAsync(SecurityAlertType alertType, string details, SeverityLevel severity, Dictionary<string, string> additionalInfo = null)
    {
        var alertId = Guid.NewGuid().ToString();
        var timestamp = DateTime.UtcNow;
        
        // Create the alert message
        var alert = new SecurityAlert
        {
            AlertId = alertId,
            AlertType = alertType,
            Timestamp = timestamp,
            Details = details,
            Severity = severity,
            AdditionalInfo = additionalInfo ?? new Dictionary<string, string>()
        };
        
        // Log the alert
        LogAlert(alert);
        
        // Determine which notification channels to use based on severity
        var notificationTasks = new List<Task>();
        
        if (severity >= _options.EmailAlertMinimumSeverity)
        {
            notificationTasks.Add(SendEmailAlertAsync(alert));
        }
        
        if (severity >= _options.SlackAlertMinimumSeverity)
        {
            notificationTasks.Add(SendSlackAlertAsync(alert));
        }
        
        // Always send to Event Hub for SIEM integration
        notificationTasks.Add(SendToEventHubAsync(alert));
        
        // Wait for all notifications to complete
        await Task.WhenAll(notificationTasks);
        
        // For critical alerts, ensure notifications were sent successfully
        if (severity == SeverityLevel.Critical)
        {
            foreach (var task in notificationTasks)
            {
                if (task.IsFaulted)
                {
                    _logger.LogCritical(\"Failed to send critical security alert notification: {Details}\", details);
                    
                    // Fallback notification mechanism
                    await SendFallbackNotificationAsync(alert);
                }
            }
        }
    }
    
    private void LogAlert(SecurityAlert alert)
    {
        var logLevel = alert.Severity switch
        {
            SeverityLevel.Verbose => LogLevel.Debug,
            SeverityLevel.Information => LogLevel.Information,
            SeverityLevel.Warning => LogLevel.Warning,
            SeverityLevel.Error => LogLevel.Error,
            SeverityLevel.Critical => LogLevel.Critical,
            _ => LogLevel.Information
        };
        
        _logger.Log(logLevel, \"Security Alert: {AlertType} - {Details} - Severity: {Severity} - Alert ID: {AlertId}\",
            alert.AlertType, alert.Details, alert.Severity, alert.AlertId);
            
        // Include additional information
        if (alert.AdditionalInfo.Count > 0)
        {
            foreach (var info in alert.AdditionalInfo)
            {
                _logger.Log(logLevel, \"Alert {AlertId} - {Key}: {Value}\",
                    alert.AlertId, info.Key, info.Value);
            }
        }
    }
    
    private async Task SendEmailAlertAsync(SecurityAlert alert)
    {
        try
        {
            var recipients = _options.AlertRecipients;
            
            // For critical alerts, also notify emergency contacts
            if (alert.Severity == SeverityLevel.Critical)
            {
                recipients = recipients.Concat(_options.EmergencyContacts).ToList();
            }
            
            // Create email message
            var subject = $\"Security Alert: {alert.AlertType} - {alert.Severity}\";
            var body = GenerateAlertEmailBody(alert);
            
            // Send the email
            await _emailService.SendEmailAsync(recipients, subject, body, isHtml: true);
            
            _logger.LogInformation(\"Security alert email sent for alert {AlertId}\", alert.AlertId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Failed to send security alert email for alert {AlertId}\", alert.AlertId);
            throw;
        }
    }
    
    private async Task SendSlackAlertAsync(SecurityAlert alert)
    {
        try
        {
            // Determine which Slack channel to use based on severity
            var channel = alert.Severity switch
            {
                SeverityLevel.Critical => _options.SlackCriticalChannel,
                SeverityLevel.Error => _options.SlackErrorChannel,
                _ => _options.SlackDefaultChannel
            };
            
            // Create Slack message
            var message = GenerateSlackAlertMessage(alert);
            
            // Send the message
            await _slackService.SendMessageAsync(channel, message);
            
            _logger.LogInformation(\"Security alert Slack message sent for alert {AlertId}\", alert.AlertId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Failed to send security alert Slack message for alert {AlertId}\", alert.AlertId);
            throw;
        }
    }
    
    private async Task SendToEventHubAsync(SecurityAlert alert)
    {
        try
        {
            // Convert alert to JSON
            var alertJson = JsonSerializer.Serialize(alert);
            
            // Send to Event Hub
            await _eventHubService.SendEventAsync(_options.EventHubName, alertJson);
            
            _logger.LogInformation(\"Security alert sent to Event Hub for alert {AlertId}\", alert.AlertId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Failed to send security alert to Event Hub for alert {AlertId}\", alert.AlertId);
            throw;
        }
    }
    
    private async Task SendFallbackNotificationAsync(SecurityAlert alert)
    {
        // Implement a fallback notification mechanism for critical alerts
        // when primary channels fail (e.g., SMS via Twilio, direct call to on-call phone, etc.)
        try
        {
            // Example: Send SMS to on-call team
            // await _smsService.SendSmsAsync(_options.OnCallPhoneNumber, $\"CRITICAL ALERT: {alert.Details}\");
            
            _logger.LogInformation(\"Fallback notification sent for critical alert {AlertId}\", alert.AlertId);
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, \"Failed to send fallback notification for critical alert {AlertId}\", alert.AlertId);
        }
    }
    
    private string GenerateAlertEmailBody(SecurityAlert alert)
    {
        var sb = new StringBuilder();
        
        sb.AppendLine(\"<html><body>\");
        sb.AppendLine($\"<h2>Security Alert: {alert.AlertType}</h2>\");
        sb.AppendLine($\"<p><strong>Severity:</strong> {alert.Severity}</p>\");
        sb.AppendLine($\"<p><strong>Time (UTC):</strong> {alert.Timestamp}</p>\");
        sb.AppendLine($\"<p><strong>Alert ID:</strong> {alert.AlertId}</p>\");
        sb.AppendLine($\"<p><strong>Details:</strong> {WebUtility.HtmlEncode(alert.Details)}</p>\");
        
        if (alert.AdditionalInfo.Count > 0)
        {
            sb.AppendLine(\"<h3>Additional Information</h3>\");
            sb.AppendLine(\"<table border='1' cellpadding='5'>\");
            sb.AppendLine(\"<tr><th>Key</th><th>Value</th></tr>\");
            
            foreach (var info in alert.AdditionalInfo)
            {
                sb.AppendLine($\"<tr><td>{WebUtility.HtmlEncode(info.Key)}</td><td>{WebUtility.HtmlEncode(info.Value)}</td></tr>\");
            }
            
            sb.AppendLine(\"</table>\");
        }
        
        sb.AppendLine(\"<p>Please investigate this alert immediately.</p>\");
        sb.AppendLine($\"<p>View in Security Portal: <a href='{_options.SecurityPortalUrl}/alerts/{alert.AlertId}'>{alert.AlertId}</a></p>\");
        sb.AppendLine(\"</body></html>\");
        
        return sb.ToString();
    }
    
    private object GenerateSlackAlertMessage(SecurityAlert alert)
    {
        // Slack message formatting using Block Kit
        var blocks = new List<object>();
        
        // Header section
        blocks.Add(new
        {
            type = \"header\",
            text = new
            {
                type = \"plain_text\",
                text = $\"Security Alert: {alert.AlertType}\",
                emoji = true
            }
        });
        
        // Severity and timestamp section
        var severityEmoji = alert.Severity switch
        {
            SeverityLevel.Critical => \":rotating_light:\",
            SeverityLevel.Error => \":x:\",
            SeverityLevel.Warning => \":warning:\",
            _ => \":information_source:\"
        };
        
        blocks.Add(new
        {
            type = \"section\",
            fields = new[]
            {
                new
                {
                    type = \"mrkdwn\",
                    text = $\"*Severity:*\
{severityEmoji} {alert.Severity}\"
                },
                new
                {
                    type = \"mrkdwn\",
                    text = $\"*Time (UTC):*\
{alert.Timestamp}\"
                }
            }
        });
        
        // Details section
        blocks.Add(new
        {
            type = \"section\",
            text = new
            {
                type = \"mrkdwn\",
                text = $\"*Details:*\
{alert.Details}\"
            }
        });
        
        // Additional info section
        if (alert.AdditionalInfo.Count > 0)
        {
            var additionalInfoText = new StringBuilder();
            additionalInfoText.AppendLine(\"*Additional Information:*\");
            
            foreach (var info in alert.AdditionalInfo)
            {
                additionalInfoText.AppendLine($\"• *{info.Key}:* {info.Value}\");
            }
            
            blocks.Add(new
            {
                type = \"section\",
                text = new
                {
                    type = \"mrkdwn\",
                    text = additionalInfoText.ToString()
                }
            });
        }
        
        // Link to security portal
        blocks.Add(new
        {
            type = \"actions\",
            elements = new[]
            {
                new
                {
                    type = \"button\",
                    text = new
                    {
                        type = \"plain_text\",
                        text = \"View in Security Portal\",
                        emoji = true
                    },
                    url = $\"{_options.SecurityPortalUrl}/alerts/{alert.AlertId}\"
                }
            }
        });
        
        // Divider
        blocks.Add(new
        {
            type = \"divider\"
        });
        
        // Return the formatted message
        return new
        {
            blocks
        };
    }
}

// Security alert model and types
public class SecurityAlert
{
    public string AlertId { get; set; }
    public SecurityAlertType AlertType { get; set; }
    public DateTime Timestamp { get; set; }
    public string Details { get; set; }
    public SeverityLevel Severity { get; set; }
    public Dictionary<string, string> AdditionalInfo { get; set; }
}

public enum SecurityAlertType
{
    AuthenticationFailure,
    BruteForceAttempt,
    SuspiciousActivity,
    UnauthorizedAccess,
    DataLeakage,
    AnomalousApiUsage,
    ConfigurationChange,
    RateLimitExceeded,
    ApiKeyCompromise,
    MaliciousIpDetected,
    UnexpectedApiCall,
    SystemHealthIssue
}

public enum SeverityLevel
{
    Verbose,
    Information,
    Warning,
    Error,
    Critical
}

// Security alert configuration options
public class SecurityAlertOptions
{
    public List<string> AlertRecipients { get; set; } = new List<string>();
    public List<string> EmergencyContacts { get; set; } = new List<string>();
    public SeverityLevel EmailAlertMinimumSeverity { get; set; } = SeverityLevel.Warning;
    public SeverityLevel SlackAlertMinimumSeverity { get; set; } = SeverityLevel.Warning;
    public string SlackDefaultChannel { get; set; } = \"#api-security\";
    public string SlackErrorChannel { get; set; } = \"#api-errors\";
    public string SlackCriticalChannel { get; set; } = \"#critical-alerts\";
    public string EventHubName { get; set; } = \"security-events\";
    public string SecurityPortalUrl { get; set; } = \"https://security.example.com\";
    public string OnCallPhoneNumber { get; set; } = \"+15555555555\";
}
```

## Incident Response for API Security

Effective incident response processes are crucial for managing and mitigating security incidents.

### Incident Response Plan for API Security

```csharp
// Incident response handler for API security events
public class ApiSecurityIncidentHandler : IApiSecurityIncidentHandler
{
    private readonly ISecurityAlertManager _alertManager;
    private readonly IIncidentRepository _incidentRepository;
    private readonly ILogger<ApiSecurityIncidentHandler> _logger;
    
    public ApiSecurityIncidentHandler(
        ISecurityAlertManager alertManager,
        IIncidentRepository incidentRepository,
        ILogger<ApiSecurityIncidentHandler> logger)
    {
        _alertManager = alertManager;
        _incidentRepository = incidentRepository;
        _logger = logger;
    }
    
    public async Task HandleAuthenticationIncidentAsync(AuthenticationIncident incident)
    {
        // Log the incident
        _logger.LogWarning(\"Authentication incident detected: {IncidentType} - User: {UserId} - IP: {IpAddress}\",
            incident.IncidentType, incident.UserId, incident.IpAddress);
            
        // Determine severity based on incident type and frequency
        var severity = DetermineSeverity(incident);
        
        // Create an incident record
        var incidentId = await CreateIncidentRecordAsync(incident, severity);
        
        // Implement response actions based on incident type and severity
        switch (incident.IncidentType)
        {
            case AuthenticationIncidentType.RepeatedFailedLogins:
                await HandleRepeatedFailedLoginsAsync(incident, incidentId, severity);
                break;
                
            case AuthenticationIncidentType.CredentialStuffing:
                await HandleCredentialStuffingAsync(incident, incidentId, severity);
                break;
                
            case AuthenticationIncidentType.BruteForceAttack:
                await HandleBruteForceAttackAsync(incident, incidentId, severity);
                break;
                
            case AuthenticationIncidentType.UnusualLoginLocation:
                await HandleUnusualLoginLocationAsync(incident, incidentId, severity);
                break;
                
            case AuthenticationIncidentType.SuccessfulLoginAfterFailures:
                await HandleSuccessfulLoginAfterFailuresAsync(incident, incidentId, severity);
                break;
                
            default:
                await HandleGenericAuthenticationIncidentAsync(incident, incidentId, severity);
                break;
        }
    }
    
    public async Task HandleAuthorizationIncidentAsync(AuthorizationIncident incident)
    {
        // Log the incident
        _logger.LogWarning(\"Authorization incident detected: {IncidentType} - User: {UserId} - Resource: {Resource}\",
            incident.IncidentType, incident.UserId, incident.Resource);
            
        // Determine severity based on incident type and frequency
        var severity = DetermineSeverity(incident);
        
        // Create an incident record
        var incidentId = await CreateIncidentRecordAsync(incident, severity);
        
        // Implement response actions based on incident type and severity
        switch (incident.IncidentType)
        {
            case AuthorizationIncidentType.UnauthorizedResourceAccess:
                await HandleUnauthorizedResourceAccessAsync(incident, incidentId, severity);
                break;
                
            case AuthorizationIncidentType.ExcessiveAccessAttempts:
                await HandleExcessiveAccessAttemptsAsync(incident, incidentId, severity);
                break;
                
            case AuthorizationIncidentType.PrivilegeEscalation:
                await HandlePrivilegeEscalationAsync(incident, incidentId, severity);
                break;
                
            case AuthorizationIncidentType.UnusualAccessPattern:
                await HandleUnusualAccessPatternAsync(incident, incidentId, severity);
                break;
                
            default:
                await HandleGenericAuthorizationIncidentAsync(incident, incidentId, severity);
                break;
        }
    }
    
    public async Task HandleDataLeakageIncidentAsync(DataLeakageIncident incident)
    {
        // Log the incident
        _logger.LogError(\"Data leakage incident detected: {IncidentType} - DataType: {DataType}\",
            incident.IncidentType, incident.DataType);
            
        // Data leakage incidents are always high severity
        var severity = SeverityLevel.Error;
        
        if (incident.DataType == \"PII\" || incident.DataType == \"Financial\" || incident.DataType == \"HealthData\")
        {
            severity = SeverityLevel.Critical;
        }
        
        // Create an incident record
        var incidentId = await CreateIncidentRecordAsync(incident, severity);
        
        // Trigger a security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.DataLeakage,
            $\"Potential data leakage detected: {incident.IncidentType} - {incident.DataType}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"EndpointPath\"] = incident.EndpointPath,
                [\"UserId\"] = incident.UserId,
                [\"DataType\"] = incident.DataType,
                [\"DataSize\"] = incident.DataSize.ToString()
            });
            
        // Implement containment and response actions
        await ImplementDataLeakageContainmentAsync(incident, incidentId);
    }
    
    public async Task HandleAnomalousApiUsageIncidentAsync(AnomalousApiUsageIncident incident)
    {
        // Log the incident
        _logger.LogWarning(\"Anomalous API usage detected: {IncidentType} - Client: {ClientId}\",
            incident.IncidentType, incident.ClientId);
            
        // Determine severity based on incident type and frequency
        var severity = DetermineSeverity(incident);
        
        // Create an incident record
        var incidentId = await CreateIncidentRecordAsync(incident, severity);
        
        // Implement response actions based on incident type
        switch (incident.IncidentType)
        {
            case AnomalousApiUsageType.HighFrequencyRequests:
                await HandleHighFrequencyRequestsAsync(incident, incidentId, severity);
                break;
                
            case AnomalousApiUsageType.UnusualEndpointAccess:
                await HandleUnusualEndpointAccessAsync(incident, incidentId, severity);
                break;
                
            case AnomalousApiUsageType.UnexpectedRequestPatterns:
                await HandleUnexpectedRequestPatternsAsync(incident, incidentId, severity);
                break;
                
            case AnomalousApiUsageType.UnexpectedDataAccess:
                await HandleUnexpectedDataAccessAsync(incident, incidentId, severity);
                break;
                
            default:
                await HandleGenericAnomalousApiUsageAsync(incident, incidentId, severity);
                break;
        }
    }
    
    // Helper methods for specific incident types
    
    private async Task HandleRepeatedFailedLoginsAsync(AuthenticationIncident incident, string incidentId, SeverityLevel severity)
    {
        // If frequent failed logins from same IP, implement temporary IP ban
        if (incident.FailureCount >= 10)
        {
            await ImplementTemporaryIpBanAsync(incident.IpAddress, TimeSpan.FromMinutes(15));
            
            _logger.LogInformation(\"Implemented temporary IP ban for {IpAddress} due to repeated failed logins\",
                incident.IpAddress);
        }
        
        // Trigger security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.AuthenticationFailure,
            $\"Repeated failed login attempts for user {incident.UserId}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IPAddress\"] = incident.IpAddress,
                [\"FailureCount\"] = incident.FailureCount.ToString(),
                [\"TimeWindow\"] = incident.TimeWindow.ToString()
            });
    }
    
    private async Task HandleCredentialStuffingAsync(AuthenticationIncident incident, string incidentId, SeverityLevel severity)
    {
        // Credential stuffing is a serious attack - implement stronger countermeasures
        await ImplementTemporaryIpBanAsync(incident.IpAddress, TimeSpan.FromHours(1));
        
        // Enable additional protections for affected accounts
        await EnableAdditionalAccountProtectionAsync(incident.UserId);
        
        // Trigger high-priority security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.BruteForceAttempt,
            $\"Potential credential stuffing attack detected against user {incident.UserId}\",
            SeverityLevel.Error, // Escalate severity
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IPAddress\"] = incident.IpAddress,
                [\"AttemptCount\"] = incident.AttemptCount.ToString(),
                [\"AffectedAccounts\"] = incident.AdditionalData.ContainsKey(\"AffectedAccounts\") 
                    ? incident.AdditionalData[\"AffectedAccounts\"] 
                    : \"Unknown\"
            });
    }
    
    private async Task HandleBruteForceAttackAsync(AuthenticationIncident incident, string incidentId, SeverityLevel severity)
    {
        // Implement strong countermeasures for brute force attacks
        await ImplementTemporaryIpBanAsync(incident.IpAddress, TimeSpan.FromHours(2));
        
        // Lock the affected account temporarily
        await TemporarilyLockAccountAsync(incident.UserId, TimeSpan.FromMinutes(30));
        
        // Trigger high-priority security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.BruteForceAttempt,
            $\"Brute force attack detected against user {incident.UserId}\",
            SeverityLevel.Error, // Escalate severity
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IPAddress\"] = incident.IpAddress,
                [\"AttemptCount\"] = incident.AttemptCount.ToString(),
                [\"TimeWindow\"] = incident.TimeWindow.ToString()
            });
    }
    
    private async Task HandleUnusualLoginLocationAsync(AuthenticationIncident incident, string incidentId, SeverityLevel severity)
    {
        // For unusual login locations, don't take immediate action but notify the user
        await SendUserSecurityNotificationAsync(
            incident.UserId,
            $\"Unusual login detected from {incident.Location} at {incident.Timestamp}\");
            
        // Update user's risk score
        await UpdateUserRiskScoreAsync(incident.UserId, 10);
        
        // Trigger security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.SuspiciousActivity,
            $\"Unusual login location for user {incident.UserId}: {incident.Location}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IPAddress\"] = incident.IpAddress,
                [\"Location\"] = incident.Location,
                [\"PreviousLocation\"] = incident.AdditionalData.ContainsKey(\"PreviousLocation\")
                    ? incident.AdditionalData[\"PreviousLocation\"]
                    : \"Unknown\"
            });
    }
    
    private async Task HandleSuccessfulLoginAfterFailuresAsync(AuthenticationIncident incident, string incidentId, SeverityLevel severity)
    {
        // This pattern could indicate a successful account compromise
        
        // Require additional verification for this session
        await RequireAdditionalVerificationAsync(incident.UserId);
        
        // Notify the user
        await SendUserSecurityNotificationAsync(
            incident.UserId,
            $\"Successful login after multiple failed attempts at {incident.Timestamp}\");
            
        // Trigger security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.SuspiciousActivity,
            $\"Successful login after multiple failures for user {incident.UserId}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IPAddress\"] = incident.IpAddress,
                [\"FailureCount\"] = incident.FailureCount.ToString(),
                [\"TimeWindow\"] = incident.TimeWindow.ToString()
            });
    }
    
    private async Task HandleUnauthorizedResourceAccessAsync(AuthorizationIncident incident, string incidentId, SeverityLevel severity)
    {
        // Log detailed information about the access attempt
        _logger.LogWarning(
            \"Unauthorized resource access attempt - User: {UserId}, Resource: {Resource}, Action: {Action}\",
            incident.UserId, incident.Resource, incident.Action);
            
        // Update user's risk score
        await UpdateUserRiskScoreAsync(incident.UserId, 15);
        
        // Trigger security alert
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.UnauthorizedAccess,
            $\"Unauthorized access attempt to {incident.Resource} by user {incident.UserId}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"Resource\"] = incident.Resource,
                [\"Action\"] = incident.Action,
                [\"AttemptCount\"] = incident.AttemptCount.ToString()
            });
            
        // For repeated attempts, consider session termination
        if (incident.AttemptCount > 3)
        {
            await TerminateUserSessionAsync(incident.UserId);
            _logger.LogInformation(\"Terminated session for user {UserId} due to repeated unauthorized access attempts\", 
                incident.UserId);
        }
    }
    
    // Helper methods for incident handling
    
    private SeverityLevel DetermineSeverity(IncidentBase incident)
    {
        // Default severity
        var severity = SeverityLevel.Warning;
        
        // Adjust based on incident type
        if (incident is AuthenticationIncident authIncident)
        {
            switch (authIncident.IncidentType)
            {
                case AuthenticationIncidentType.CredentialStuffing:
                case AuthenticationIncidentType.BruteForceAttack:
                    severity = SeverityLevel.Error;
                    break;
            }
            
            // Escalate based on attempt count
            if (authIncident.AttemptCount > 20)
            {
                severity = SeverityLevel.Error;
            }
            else if (authIncident.AttemptCount > 50)
            {
                severity = SeverityLevel.Critical;
            }
        }
        else if (incident is AuthorizationIncident authzIncident)
        {
            switch (authzIncident.IncidentType)
            {
                case AuthorizationIncidentType.PrivilegeEscalation:
                    severity = SeverityLevel.Error;
                    break;
            }
            
            // Escalate for sensitive resources
            if (authzIncident.Resource.Contains(\"admin\") || 
                authzIncident.Resource.Contains(\"security\") ||
                authzIncident.Resource.Contains(\"config\"))
            {
                severity = SeverityLevel.Error;
            }
        }
        else if (incident is AnomalousApiUsageIncident apiIncident)
        {
            switch (apiIncident.IncidentType)
            {
                case AnomalousApiUsageType.UnexpectedDataAccess:
                    severity = SeverityLevel.Error;
                    break;
            }
            
            // Escalate based on deviation
            if (apiIncident.DeviationPercentage > 200)
            {
                severity = SeverityLevel.Error;
            }
        }
        
        return severity;
    }
    
    private async Task<string> CreateIncidentRecordAsync(IncidentBase incident, SeverityLevel severity)
    {
        var incidentRecord = new SecurityIncident
        {
            Id = Guid.NewGuid().ToString(),
            IncidentType = incident.GetType().Name,
            SubType = incident.GetIncidentSubType(),
            Timestamp = DateTime.UtcNow,
            Severity = severity,
            Status = IncidentStatus.Open,
            UserId = incident.GetUserId(),
            IpAddress = incident.GetIpAddress(),
            Details = JsonSerializer.Serialize(incident),
            ResponseActions = new List<IncidentResponseAction>()
        };
        
        await _incidentRepository.CreateIncidentAsync(incidentRecord);
        
        _logger.LogInformation(\"Created incident record {IncidentId} of type {IncidentType} with severity {Severity}\",
            incidentRecord.Id, incidentRecord.IncidentType, incidentRecord.Severity);
            
        return incidentRecord.Id;
    }
    
    private async Task ImplementTemporaryIpBanAsync(string ipAddress, TimeSpan duration)
    {
        // Implementation would connect to a WAF, API Gateway, or firewall service
        _logger.LogInformation(\"Implementing temporary IP ban for {IpAddress} for {Duration}\", 
            ipAddress, duration);
    }
    
    private async Task EnableAdditionalAccountProtectionAsync(string userId)
    {
        // Implementation would connect to the identity management system
        _logger.LogInformation(\"Enabling additional account protection for user {UserId}\", userId);
    }
    
    private async Task TemporarilyLockAccountAsync(string userId, TimeSpan duration)
    {
        // Implementation would connect to the identity management system
        _logger.LogInformation(\"Temporarily locking account for user {UserId} for {Duration}\",
            userId, duration);
    }
    
    private async Task SendUserSecurityNotificationAsync(string userId, string message)
    {
        // Implementation would send an email, SMS, or in-app notification
        _logger.LogInformation(\"Sending security notification to user {UserId}: {Message}\",
            userId, message);
    }
    
    private async Task UpdateUserRiskScoreAsync(string userId, int increment)
    {
        // Implementation would update a user risk score in a security database
        _logger.LogInformation(\"Updating risk score for user {UserId} by +{Increment}\",
            userId, increment);
    }
    
    private async Task RequireAdditionalVerificationAsync(string userId)
    {
        // Implementation would flag the user session for additional verification
        _logger.LogInformation(\"Requiring additional verification for user {UserId}\", userId);
    }
    
    private async Task TerminateUserSessionAsync(string userId)
    {
        // Implementation would force logout of the user
        _logger.LogInformation(\"Terminating session for user {UserId}\", userId);
    }
    
    private async Task ImplementDataLeakageContainmentAsync(DataLeakageIncident incident, string incidentId)
    {
        // Log containment actions
        _logger.LogInformation(\"Implementing containment measures for data leakage incident {IncidentId}\",
            incidentId);
            
        // Update the incident record with containment actions
        await _incidentRepository.AddResponseActionAsync(
            incidentId,
            new IncidentResponseAction
            {
                ActionType = \"Containment\",
                Timestamp = DateTime.UtcNow,
                Description = \"Implementing data leakage containment measures\",
                ActionTaken = \"Restricted data access for affected endpoints\"
            });
    }
    
    private async Task HandleGenericAuthenticationIncidentAsync(AuthenticationIncident incident, string incidentId, SeverityLevel severity)
    {
        // Generic handling for other authentication incidents
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.AuthenticationFailure,
            $\"Authentication incident detected for user {incident.UserId}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IncidentType\"] = incident.IncidentType.ToString(),
                [\"IPAddress\"] = incident.IpAddress
            });
    }
    
    private async Task HandleGenericAuthorizationIncidentAsync(AuthorizationIncident incident, string incidentId, SeverityLevel severity)
    {
        // Generic handling for other authorization incidents
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.UnauthorizedAccess,
            $\"Authorization incident detected for user {incident.UserId}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"UserId\"] = incident.UserId,
                [\"IncidentType\"] = incident.IncidentType.ToString(),
                [\"Resource\"] = incident.Resource,
                [\"Action\"] = incident.Action
            });
    }
    
    private async Task HandleGenericAnomalousApiUsageAsync(AnomalousApiUsageIncident incident, string incidentId, SeverityLevel severity)
    {
        // Generic handling for other API usage incidents
        await _alertManager.TriggerAlertAsync(
            SecurityAlertType.AnomalousApiUsage,
            $\"Anomalous API usage detected for client {incident.ClientId}\",
            severity,
            new Dictionary<string, string>
            {
                [\"IncidentId\"] = incidentId,
                [\"ClientId\"] = incident.ClientId,
                [\"IncidentType\"] = incident.IncidentType.ToString(),
                [\"Endpoint\"] = incident.Endpoint,
                [\"DeviationPercentage\"] = incident.DeviationPercentage.ToString()
            });
    }
}

// Incident base class
public abstract class IncidentBase
{
    public DateTime Timestamp { get; set; }
    public Dictionary<string, string> AdditionalData { get; set; } = new Dictionary<string, string>();
    
    public abstract string GetIncidentSubType();
    public abstract string GetUserId();
    public abstract string GetIpAddress();
}

// Authentication incident model
public class AuthenticationIncident : IncidentBase
{
    public AuthenticationIncidentType IncidentType { get; set; }
    public string UserId { get; set; }
    public string IpAddress { get; set; }
    public string Location { get; set; }
    public int FailureCount { get; set; }
    public int AttemptCount { get; set; }
    public TimeSpan TimeWindow { get; set; }
    
    public override string GetIncidentSubType() => IncidentType.ToString();
    public override string GetUserId() => UserId;
    public override string GetIpAddress() => IpAddress;
}

public enum AuthenticationIncidentType
{
    RepeatedFailedLogins,
    CredentialStuffing,
    BruteForceAttack,
    UnusualLoginLocation,
    SuccessfulLoginAfterFailures,
    UnusualLoginTime,
    MultiAccountAccessFromSameIp
}

// Authorization incident model
public class AuthorizationIncident : IncidentBase
{
    public AuthorizationIncidentType IncidentType { get; set; }
    public string UserId { get; set; }
    public string Resource { get; set; }
    public string Action { get; set; }
    public int AttemptCount { get; set; }
    public string IpAddress { get; set; }
    
    public override string GetIncidentSubType() => IncidentType.ToString();
    public override string GetUserId() => UserId;
    public override string GetIpAddress() => IpAddress;
}

public enum AuthorizationIncidentType
{
    UnauthorizedResourceAccess,
    ExcessiveAccessAttempts,
    PrivilegeEscalation,
    UnusualAccessPattern,
    AccessToMultipleRestrictedResources
}

// Data leakage incident model
public class DataLeakageIncident : IncidentBase
{
    public DataLeakageIncidentType IncidentType { get; set; }
    public string UserId { get; set; }
    public string EndpointPath { get; set; }
    public string DataType { get; set; }
    public long DataSize { get; set; }
    public string IpAddress { get; set; }
    
    public override string GetIncidentSubType() => IncidentType.ToString();
    public override string GetUserId() => UserId;
    public override string GetIpAddress() => IpAddress;
}

public enum DataLeakageIncidentType
{
    ExcessiveDataRetrieval,
    SensitiveDataExposure,
    UnauthorizedDataAccess,
    AbnormalDataAccessPattern,
    DataExfiltration
}

// Anomalous API usage incident model
public class AnomalousApiUsageIncident : IncidentBase
{
    public AnomalousApiUsageType IncidentType { get; set; }
    public string ClientId { get; set; }
    public string Endpoint { get; set; }
    public double DeviationPercentage { get; set; }
    public string IpAddress { get; set; }
    
    public override string GetIncidentSubType() => IncidentType.ToString();
    public override string GetUserId() => ClientId;
    public override string GetIpAddress() => IpAddress;
}

public enum AnomalousApiUsageType
{
    HighFrequencyRequests,
    UnusualEndpointAccess,
    UnexpectedRequestPatterns,
    UnexpectedDataAccess,
    ApiScanningActivity
}

// Security incident model for database storage
public class SecurityIncident
{
    public string Id { get; set; }
    public string IncidentType { get; set; }
    public string SubType { get; set; }
    public DateTime Timestamp { get; set; }
    public SeverityLevel Severity { get; set; }
    public IncidentStatus Status { get; set; }
    public string UserId { get; set; }
    public string IpAddress { get; set; }
    public string Details { get; set; }
    public List<IncidentResponseAction> ResponseActions { get; set; }
}

public enum IncidentStatus
{
    Open,
    InProgress,
    Contained,
    Resolved,
    Closed
}

public class IncidentResponseAction
{
    public string ActionType { get; set; }
    public DateTime Timestamp { get; set; }
    public string Description { get; set; }
    public string ActionTaken { get; set; }
    public string PerformedBy { get; set; }
}
```

## Secure API Development Lifecycle

Integrating security throughout the API development lifecycle is crucial for building secure APIs.

### Security Requirements and Design

#### Security Requirements Documentation

```markdown
# API Security Requirements

## Authentication and Authorization

### Authentication Requirements

1. **AUTH-1**: The API must support OAuth 2.0 with JWT tokens for authentication.
2. **AUTH-2**: Token lifetime must be configurable and not exceed 1 hour by default.
3. **AUTH-3**: Refresh tokens must be supported with a maximum lifetime of 7 days.
4. **AUTH-4**: All authentication credentials must be transmitted over TLS 1.2+.
5. **AUTH-5**: Failed authentication attempts must be logged with client IP address and timestamp.
6. **AUTH-6**: After 5 consecutive failed authentication attempts from the same IP address within 10 minutes, that IP must be temporarily blocked for 15 minutes.

### Authorization Requirements

1. **AUTHZ-1**: The API must implement role-based access control for all endpoints.
2. **AUTHZ-2**: Each API endpoint must explicitly define required roles and permissions.
3. **AUTHZ-3**: API responses must not reveal information about resources the user is not authorized to access.
4. **AUTHZ-4**: Administrative operations must require higher-level permissions.
5. **AUTHZ-5**: Authorization decisions must be logged for audit purposes.

## Data Protection

1. **DATA-1**: All sensitive data must be encrypted at rest using AES-256.
2. **DATA-2**: All API communication must use TLS 1.2+ with strong cipher suites.
3. **DATA-3**: Personally identifiable information (PII) must be protected according to relevant regulations (GDPR, CCPA, etc.).
4. **DATA-4**: Sensitive data fields must be masked in logs.
5. **DATA-5**: Sensitive data must not be included in URLs.

## Input Validation and Output Encoding

1. **INPUT-1**: All API inputs must be validated against a strict schema before processing.
2. **INPUT-2**: Input validation must occur on the server side, regardless of client-side validation.
3. **INPUT-3**: Query parameters and request bodies must have size limits enforced.
4. **INPUT-4**: Input validation failures must return appropriate error codes and messages without revealing implementation details.
5. **INPUT-5**: All responses containing HTML/XML content must apply appropriate output encoding.

## Rate Limiting and Resource Protection

1. **RATE-1**: API endpoints must implement rate limiting based on client IP or API key.
2. **RATE-2**: Rate limits must be enforced per user, per IP address, and globally.
3. **RATE-3**: Rate limit thresholds must be configurable based on endpoint sensitivity.
4. **RATE-4**: Resources with high computational cost must have lower rate limits.
5. **RATE-5**: Rate limit exceeded responses must include Retry-After headers.

## Logging and Monitoring

1. **LOG-1**: All authentication and authorization events must be logged.
2. **LOG-2**: API access logs must include client IP, timestamp, endpoint, HTTP method, response code, and response time.
3. **LOG-3**: Log entries must have a correlation ID to track requests across services.
4. **LOG-4**: Logs must not contain sensitive data such as passwords, tokens, or personal information.
5. **LOG-5**: Security events must be monitored in real-time for incident response.

## Error Handling

1. **ERR-1**: Error responses must not expose implementation details or stack traces.
2. **ERR-2**: Error responses must use appropriate HTTP status codes.
3. **ERR-3**: Error messages must be descriptive enough for debugging
4. **ERR-4**: Security-related errors must be logged with appropriate detail for incident investigation.
5. **ERR-5**: Error handling mechanisms must be fail-secure rather than fail-open.

## API Documentation

1. **DOC-1**: API documentation must not expose implementation details that could aid attackers.
2. **DOC-2**: Security requirements for API usage must be clearly documented.
3. **DOC-3**: Authentication and authorization mechanisms must be documented.
4. **DOC-4**: Error codes and their meanings must be documented.
5. **DOC-5**: Rate limits and other usage constraints must be documented.

## Security Testing

1. **TEST-1**: API endpoints must undergo security testing before deployment.
2. **TEST-2**: Automated security scanning must be integrated into the CI/CD pipeline.
3. **TEST-3**: Penetration testing must be conducted annually or after significant changes.
4. **TEST-4**: Security test coverage must include authentication, authorization, input validation, and error handling.
5. **TEST-5**: Security testing results must be documented and tracked for remediation.
```

### Secure API Architecture and Design

#### Defense-in-Depth Architecture

A secure API architecture should implement multiple layers of protection:

1. **API Gateway Layer**
   - TLS termination
   - Request rate limiting
   - IP filtering
   - Basic request validation
   - API key validation
   - Request logging

2. **Authentication Layer**
   - Token validation
   - Certificate validation
   - Authentication logging
   - Credential security

3. **Authorization Layer**
   - Role-based access control
   - Attribute-based policies
   - Resource ownership verification
   - Authorization decision logging

4. **Application Layer**
   - Input validation and sanitization
   - Business logic validation
   - Error handling and logging
   - Data access control

5. **Data Layer**
   - Encryption at rest
   - Database access controls
   - Query parameterization
   - Data integrity checks

#### Security Architecture Diagram

```
  +---------------------+
  |                     |
  |  Client Application |
  |                     |
  +----------+----------+
             | HTTPS
             v
  +----------+----------+     +-------------------+
  |                     |     |                   |
  |    API Gateway      +----->  Rate Limiter     |
  |                     |     |                   |
  +----------+----------+     +-------------------+
             |
             | HTTPS
             v
  +----------+----------+     +-------------------+
  |                     |     |                   |
  |  Identity Provider  <-----> User Directory    |
  |                     |     |                   |
  +----------+----------+     +-------------------+
             |
             | JWT Token
             v
  +----------+----------+     +-------------------+
  |                     |     |                   |
  |    API Service      +----->  Policy Engine    |
  |                     |     |                   |
  +----------+----------+     +-------------------+
             |
             | Encrypted Data
             v
  +----------+----------+     +-------------------+
  |                     |     |                   |
  |  Database Service   +----->  Encryption Keys  |
  |                     |     |                   |
  +---------------------+     +-------------------+
```

#### Security Design Patterns

1. **Gatekeeper Pattern**
   
   Centralize access control decisions in a dedicated component that checks all requests before they reach protected resources.

   ```csharp
   public class ApiGatekeeper : IApiGatekeeper
   {
       private readonly IAuthenticationService _authService;
       private readonly IAuthorizationService _authzService;
       private readonly IInputValidationService _validationService;
       private readonly ILogger<ApiGatekeeper> _logger;
       
       public ApiGatekeeper(
           IAuthenticationService authService,
           IAuthorizationService authzService,
           IInputValidationService validationService,
           ILogger<ApiGatekeeper> logger)
       {
           _authService = authService;
           _authzService = authzService;
           _validationService = validationService;
           _logger = logger;
       }
       
       public async Task<GatekeeperResult> ValidateRequestAsync(HttpContext context, string requiredPermission)
       {
           try
           {
               // Step 1: Authenticate the request
               var authResult = await _authService.AuthenticateAsync(context);
               if (!authResult.Succeeded)
               {
                   _logger.LogWarning(\"Authentication failed for request to {Path}\", context.Request.Path);
                   return GatekeeperResult.Fail(GatekeeperFailureReason.AuthenticationFailed);
               }
               
               // Step 2: Authorize the request
               var authzResult = await _authzService.AuthorizeAsync(
                   authResult.Principal, 
                   requiredPermission);
                   
               if (!authzResult.Succeeded)
               {
                   _logger.LogWarning(\"Authorization failed for user {UserId} requesting permission {Permission}\",
                       authResult.Principal.Identity.Name, requiredPermission);
                   return GatekeeperResult.Fail(GatekeeperFailureReason.AuthorizationFailed);
               }
               
               // Step 3: Validate input
               if (context.Request.ContentLength > 0)
               {
                   var validationResult = await _validationService.ValidateRequestAsync(context);
                   if (!validationResult.IsValid)
                   {
                       _logger.LogWarning(\"Input validation failed for request to {Path}: {Errors}\",
                           context.Request.Path, string.Join(\", \", validationResult.Errors));
                       return GatekeeperResult.Fail(GatekeeperFailureReason.ValidationFailed, validationResult.Errors);
                   }
               }
               
               // All checks passed
               return GatekeeperResult.Success(authResult.Principal);
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, \"Error in request validation for {Path}\", context.Request.Path);
               return GatekeeperResult.Fail(GatekeeperFailureReason.SystemError);
           }
       }
   }
   ```

2. **Defense in Depth Pattern**
   
   Apply multiple security controls at different layers of the application to ensure that if one control fails, others are still in place.

   ```yaml
   # API Gateway configuration (defense in depth example)
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: api-ingress
     annotations:
       # TLS configuration
       kubernetes.io/ingress.class: \"nginx\"
       nginx.ingress.kubernetes.io/ssl-redirect: \"true\"
       nginx.ingress.kubernetes.io/force-ssl-redirect: \"true\"
       
       # Security headers
       nginx.ingress.kubernetes.io/configuration-snippet: |
         more_set_headers \"X-Content-Type-Options: nosniff\";
         more_set_headers \"X-Frame-Options: DENY\";
         more_set_headers \"X-XSS-Protection: 1; mode=block\";
         more_set_headers \"Content-Security-Policy: default-src 'self'\";
         
       # Rate limiting
       nginx.ingress.kubernetes.io/limit-rps: \"10\"
       nginx.ingress.kubernetes.io/limit-connections: \"5\"
       
       # Request size limiting
       nginx.ingress.kubernetes.io/proxy-body-size: \"1m\"
       
       # Whitelisted IPs (example)
       nginx.ingress.kubernetes.io/whitelist-source-range: \"10.0.0.0/8,172.16.0.0/12,192.168.0.0/16\"
   spec:
     tls:
     - hosts:
       - api.example.com
       secretName: api-tls-secret
     rules:
     - host: api.example.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: api-service
               port:
                 number: 80
   ```

3. **Secure Pipe Pattern**
   
   Ensure that data is protected while in transit between components.

   ```csharp
   public class SecurePipe : ISecurePipe
   {
       private readonly IEncryptionService _encryptionService;
       private readonly IHttpClientFactory _httpClientFactory;
       private readonly ILogger<SecurePipe> _logger;
       
       public SecurePipe(
           IEncryptionService encryptionService,
           IHttpClientFactory httpClientFactory,
           ILogger<SecurePipe> logger)
       {
           _encryptionService = encryptionService;
           _httpClientFactory = httpClientFactory;
           _logger = logger;
       }
       
       public async Task<TResponse> SendAsync<TRequest, TResponse>(
           string endpoint, 
           TRequest request)
           where TRequest : class
           where TResponse : class
       {
           try
           {
               // Step 1: Serialize the request
               var serializedRequest = JsonSerializer.Serialize(request);
               
               // Step 2: Encrypt the payload
               var encryptedPayload = _encryptionService.Encrypt(serializedRequest);
               
               // Step 3: Prepare the secure envelope
               var envelope = new SecureEnvelope
               {
                   Payload = encryptedPayload,
                   Timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                   Nonce = Guid.NewGuid().ToString()
               };
               
               // Step 4: Calculate HMAC for the envelope
               envelope.Signature = _encryptionService.ComputeHmac(
                   $\"{envelope.Payload}|{envelope.Timestamp}|{envelope.Nonce}\");
                   
               // Step 5: Send over HTTPS
               var client = _httpClientFactory.CreateClient(\"SecurePipe\");
               client.DefaultRequestHeaders.Add(\"X-Secure-Transport\", \"true\");
               
               var httpResponse = await client.PostAsJsonAsync(endpoint, envelope);
               httpResponse.EnsureSuccessStatusCode();
               
               // Step 6: Receive and validate response envelope
               var responseEnvelope = await httpResponse.Content.ReadFromJsonAsync<SecureEnvelope>();
               
               var calculatedSignature = _encryptionService.ComputeHmac(
                   $\"{responseEnvelope.Payload}|{responseEnvelope.Timestamp}|{responseEnvelope.Nonce}\");
                   
               if (calculatedSignature != responseEnvelope.Signature)
               {
                   throw new SecurityException(\"Response signature validation failed\");
               }
               
               // Step 7: Decrypt and deserialize response
               var decryptedResponse = _encryptionService.Decrypt(responseEnvelope.Payload);
               var response = JsonSerializer.Deserialize<TResponse>(decryptedResponse);
               
               return response;
           }
           catch (Exception ex)
           {
               _logger.LogError(ex, \"Error in secure pipe communication with {Endpoint}\", endpoint);
               throw;
           }
       }
   }
   
   public class SecureEnvelope
   {
       public string Payload { get; set; }
       public long Timestamp { get; set; }
       public string Nonce { get; set; }
       public string Signature { get; set; }
   }
   ```

4. **Secure Decorator Pattern**
   
   Apply security controls by decorating methods or classes without changing their implementation.

   ```csharp
   // Authorization decorator example
   public class AuthorizationDecorator<T> : IService<T> where T : class
   {
       private readonly IService<T> _innerService;
       private readonly IAuthorizationService _authorizationService;
       private readonly IHttpContextAccessor _httpContextAccessor;
       private readonly ILogger<AuthorizationDecorator<T>> _logger;
       
       public AuthorizationDecorator(
           IService<T> innerService,
           IAuthorizationService authorizationService,
           IHttpContextAccessor httpContextAccessor,
           ILogger<AuthorizationDecorator<T>> logger)
       {
           _innerService = innerService;
           _authorizationService = authorizationService;
           _httpContextAccessor = httpContextAccessor;
           _logger = logger;
       }
       
       public async Task<T> GetByIdAsync(int id)
       {
           var user = _httpContextAccessor.HttpContext.User;
           var resource = await _innerService.GetByIdAsync(id);
           
           // Authorize access to the resource
           var authzResult = await _authorizationService.AuthorizeAsync(
               user, 
               resource, 
               \"Read\");
               
           if (!authzResult.Succeeded)
           {
               _logger.LogWarning(\"Authorization failed for user {UserId} accessing resource {ResourceId}\",
                   user.Identity.Name, id);
               throw new AuthorizationException(\"Access denied\");
           }
           
           return resource;
       }
       
       public async Task<IEnumerable<T>> GetAllAsync()
       {
           var user = _httpContextAccessor.HttpContext.User;
           var resources = await _innerService.GetAllAsync();
           
           // Filter resources based on user's permissions
           var authorizedResources = new List<T>();
           
           foreach (var resource in resources)
           {
               var authzResult = await _authorizationService.AuthorizeAsync(
                   user, 
                   resource, 
                   \"Read\");
                   
               if (authzResult.Succeeded)
               {
                   authorizedResources.Add(resource);
               }
           }
           
           return authorizedResources;
       }
       
       public async Task<T> CreateAsync(T entity)
       {
           var user = _httpContextAccessor.HttpContext.User;
           
           // Authorize creation
           var authzResult = await _authorizationService.AuthorizeAsync(
               user, 
               entity, 
               \"Create\");
               
           if (!authzResult.Succeeded)
           {
               _logger.LogWarning(\"Creation authorization failed for user {UserId}\",
                   user.Identity.Name);
               throw new AuthorizationException(\"Access denied\");
           }
           
           return await _innerService.CreateAsync(entity);
       }
       
       public async Task<T> UpdateAsync(T entity)
       {
           var user = _httpContextAccessor.HttpContext.User;
           
           // Authorize update
           var authzResult = await _authorizationService.AuthorizeAsync(
               user, 
               entity, 
               \"Update\");
               
           if (!authzResult.Succeeded)
           {
               _logger.LogWarning(\"Update authorization failed for user {UserId}\",
                   user.Identity.Name);
               throw new AuthorizationException(\"Access denied\");
           }
           
           return await _innerService.UpdateAsync(entity);
       }
       
       public async Task DeleteAsync(int id)
       {
           var user = _httpContextAccessor.HttpContext.User;
           var resource = await _innerService.GetByIdAsync(id);
           
           // Authorize deletion
           var authzResult = await _authorizationService.AuthorizeAsync(
               user, 
               resource, 
               \"Delete\");
               
           if (!authzResult.Succeeded)
           {
               _logger.LogWarning(\"Deletion authorization failed for user {UserId} for resource {ResourceId}\",
                   user.Identity.Name, id);
               throw new AuthorizationException(\"Access denied\");
           }
           
           await _innerService.DeleteAsync(id);
       }
   }
   ```

## Secure API Code Samples

### Secure API Controller

```csharp
[ApiController]
[Route(\"api/[controller]\")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly ILogger<CustomersController> _logger;
    private readonly ISecurityAuditService _auditService;
    
    public CustomersController(
        ICustomerService customerService,
        ILogger<CustomersController> logger,
        ISecurityAuditService auditService)
    {
        _customerService = customerService;
        _logger = logger;
        _auditService = auditService;
    }
    
    // GET: api/customers
    [HttpGet]
    [Authorize(Policy = \"ReadCustomers\")]
    [ResponseCache(Duration = 60, VaryByQueryKeys = new[] { \"*\" })]
    public async Task<ActionResult<IEnumerable<CustomerDto>>> GetCustomers()
    {
        try
        {
            _logger.LogInformation(\"Retrieving all customers\");
            var customers = await _customerService.GetAllCustomersAsync();
            
            // Audit the access
            await _auditService.LogAccessAsync(
                User.Identity.Name, 
                \"Customer\", 
                \"ReadAll\", 
                null);
                
            return Ok(customers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving customers\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // GET: api/customers/{id}
    [HttpGet(\"{id}\")]
    [Authorize(Policy = \"ReadCustomers\")]
    [ResponseCache(Duration = 30, VaryByQueryKeys = new[] { \"id\" })]
    public async Task<ActionResult<CustomerDto>> GetCustomer(int id)
    {
        try
        {
            _logger.LogInformation(\"Retrieving customer {CustomerId}\", id);
            
            var customer = await _customerService.GetCustomerByIdAsync(id);
            if (customer == null)
            {
                return NotFound(new ErrorResponse(\"Customer not found\"));
            }
            
            // Audit the access
            await _auditService.LogAccessAsync(
                User.Identity.Name, 
                \"Customer\", 
                \"Read\", 
                id.ToString());
                
            return Ok(customer);
        }
        catch (AuthorizationException ex)
        {
            _logger.LogWarning(ex, \"Authorization failure for customer {CustomerId}\", id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving customer {CustomerId}\", id);
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // POST: api/customers
    [HttpPost]
    [Authorize(Policy = \"CreateCustomers\")]
    [ValidateModel]
    public async Task<ActionResult<CustomerDto>> CreateCustomer(CreateCustomerRequest request)
    {
        try
        {
            _logger.LogInformation(\"Creating new customer\");
            
            // Additional validation beyond data annotations
            if (request.DateOfBirth.HasValue && request.DateOfBirth > DateTime.Today)
            {
                ModelState.AddModelError(\"DateOfBirth\", \"Date of birth cannot be in the future\");
                return BadRequest(ModelState);
            }
            
            var customer = await _customerService.CreateCustomerAsync(request);
            
            // Audit the creation
            await _auditService.LogAccessAsync(
                User.Identity.Name, 
                \"Customer\", 
                \"Create\", 
                customer.Id.ToString());
                
            return CreatedAtAction(
                nameof(GetCustomer), 
                new { id = customer.Id }, 
                customer);
        }
        catch (DuplicateResourceException ex)
        {
            _logger.LogWarning(ex, \"Duplicate resource detected\");
            return Conflict(new ErrorResponse(\"A customer with this email already exists\"));
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, \"Validation error while creating customer\");
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error creating customer\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // PUT: api/customers/{id}
    [HttpPut(\"{id}\")]
    [Authorize(Policy = \"UpdateCustomers\")]
    [ValidateModel]
    public async Task<IActionResult> UpdateCustomer(int id, UpdateCustomerRequest request)
    {
        try
        {
            if (id != request.Id)
            {
                return BadRequest(new ErrorResponse(\"ID in the URL does not match ID in the request body\"));
            }
            
            _logger.LogInformation(\"Updating customer {CustomerId}\", id);
            
            var customer = await _customerService.UpdateCustomerAsync(request);
            if (customer == null)
            {
                return NotFound(new ErrorResponse(\"Customer not found\"));
            }
            
            // Audit the update
            await _auditService.LogAccessAsync(
                User.Identity.Name, 
                \"Customer\", 
                \"Update\", 
                id.ToString());
                
            return Ok(customer);
        }
        catch (AuthorizationException ex)
        {
            _logger.LogWarning(ex, \"Authorization failure updating customer {CustomerId}\", id);
            return Forbid();
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, \"Validation error while updating customer {CustomerId}\", id);
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (ConcurrencyException ex)
        {
            _logger.LogWarning(ex, \"Concurrency conflict updating customer {CustomerId}\", id);
            return Conflict(new ErrorResponse(\"The customer was modified by another user\"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error updating customer {CustomerId}\", id);
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // DELETE: api/customers/{id}
    [HttpDelete(\"{id}\")]
    [Authorize(Policy = \"DeleteCustomers\")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        try
        {
            _logger.LogInformation(\"Deleting customer {CustomerId}\", id);
            
            var result = await _customerService.DeleteCustomerAsync(id);
            if (!result)
            {
                return NotFound(new ErrorResponse(\"Customer not found\"));
            }
            
            // Audit the deletion
            await _auditService.LogAccessAsync(
                User.Identity.Name, 
                \"Customer\", 
                \"Delete\", 
                id.ToString());
                
            return NoContent();
        }
        catch (AuthorizationException ex)
        {
            _logger.LogWarning(ex, \"Authorization failure deleting customer {CustomerId}\", id);
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error deleting customer {CustomerId}\", id);
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
}

// Model validation attribute
public class ValidateModelAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(e => e.Value.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                );
                
            context.Result = new BadRequestObjectResult(new ValidationErrorResponse(errors));
        }
    }
}

// Error response models
public class ErrorResponse
{
    public string Message { get; set; }
    public string RequestId { get; set; }
    
    public ErrorResponse(string message)
    {
        Message = message;
        RequestId = Guid.NewGuid().ToString();
    }
}

public class ValidationErrorResponse : ErrorResponse
{
    public Dictionary<string, string[]> Errors { get; set; }
    
    public ValidationErrorResponse(Dictionary<string, string[]> errors)
        : base(\"Validation failed\")
    {
        Errors = errors;
    }
}
```

### Secure Middleware Configuration

```csharp
// Startup.cs secure middleware configuration
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Use exception handler middleware for all environments
    app.UseExceptionHandler(\"/api/error\");
    
    // Enable HTTP Strict Transport Security
    app.UseHsts();
    
    // Redirect HTTP requests to HTTPS
    app.UseHttpsRedirection();
    
    // Security headers middleware
    app.UseSecurityHeaders(options =>
    {
        options.AddDefaultSecurityHeaders()
            .AddContentSecurityPolicy(builder =>
            {
                builder.AddDefaultSrc().Self();
                builder.AddObjectSrc().None();
                builder.AddScriptSrc().Self();
            })
            .AddPermissionsPolicy(builder =>
            {
                builder.AddCamera().None();
                builder.AddMicrophone().None();
                builder.AddGeolocation().None();
            });
    });
    
    // Add custom security middleware
    app.UseMiddleware<ApiKeyValidationMiddleware>();
    app.UseMiddleware<ApiLoggingMiddleware>();
    app.UseMiddleware<RateLimitingMiddleware>();
    
    // Standard ASP.NET Core middleware
    app.UseRouting();
    
    // Authenticate before authorizing
    app.UseAuthentication();
    app.UseAuthorization();
    
    // API endpoints
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
        endpoints.MapHealthChecks(\"/health\")
            .AllowAnonymous();
    });
}

public void ConfigureServices(IServiceCollection services)
{
    // Configure HTTPS
    services.AddHttpsRedirection(options =>
    {
        options.RedirectStatusCode = StatusCodes.Status307TemporaryRedirect;
        options.HttpsPort = 443;
    });
    
    // Configure CORS with strict policy
    services.AddCors(options =>
    {
        options.AddPolicy(\"SecureApiPolicy\", builder =>
        {
            builder.WithOrigins(\"https://app.example.com\")
                .AllowCredentials()
                .WithMethods(\"GET\", \"POST\", \"PUT\", \"DELETE\")
                .WithHeaders(\"Authorization\", \"Content-Type\");
        });
    });
    
    // Configure authentication
    services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        var jwtOptions = Configuration.GetSection(\"Jwt\").Get<JwtOptions>();
        
        options.Authority = jwtOptions.Authority;
        options.Audience = jwtOptions.Audience;
        options.RequireHttpsMetadata = true;
        options.SaveToken = true;
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(2)
        };
        
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                {
                    context.Response.Headers.Add(\"Token-Expired\", \"true\");
                }
                return Task.CompletedTask;
            }
        };
    });
    
    // Configure authorization policies
    services.AddAuthorization(options =>
    {
        options.AddPolicy(\"ReadCustomers\", policy =>
            policy.RequireClaim(\"permission\", \"customers:read\"));
            
        options.AddPolicy(\"CreateCustomers\", policy =>
            policy.RequireClaim(\"permission\", \"customers:create\"));
            
        options.AddPolicy(\"UpdateCustomers\", policy =>
            policy.RequireClaim(\"permission\", \"customers:update\"));
            
        options.AddPolicy(\"DeleteCustomers\", policy =>
            policy.RequireClaim(\"permission\", \"customers:delete\"));
            
        options.AddPolicy(\"AdminOnly\", policy =>
            policy.RequireRole(\"admin\"));
    });
    
    // Configure API behavior options
    services.Configure<ApiBehaviorOptions>(options =>
    {
        // Customize automatic 400 response
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                );
                
            return new BadRequestObjectResult(new ValidationErrorResponse(errors));
        };
    });
    
    // Add controllers with security options
    services.AddControllers(options =>
    {
        // Add global authorization filter
        options.Filters.Add(new AuthorizeFilter());
        
        // Require HTTPS for all controllers
        options.Filters.Add(new RequireHttpsAttribute());
    })
    .AddJsonOptions(options =>
    {
        // Configure JSON serialization security
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
    
    // Configure Anti-forgery
    services.AddAntiforgery(options =>
    {
        options.HeaderName = \"X-XSRF-TOKEN\";
        options.Cookie.Name = \"XSRF-TOKEN\";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    });
    
    // Configure data protection
    services.AddDataProtection()
        .PersistKeysToAzureKeyVault(new Uri(\"https://keyvault.example.com/keys/dataprotection\"))
        .ProtectKeysWithAzureKeyVault(new Uri(\"https://keyvault.example.com/keys/masterkey\"), \"dataprotection-key\")
        .SetDefaultKeyLifetime(TimeSpan.FromDays(90));
        
    // Add health checks
    services.AddHealthChecks()
        .AddDbContextCheck<ApplicationDbContext>()
        .AddUrlGroup(new Uri(\"https://identity.example.com/health\"), \"Identity Provider\")
        .AddCheck<ApiHealthCheck>(\"API Health\");
        
    // Configure rate limiting
    services.Configure<RateLimitOptions>(Configuration.GetSection(\"RateLimit\"));
    services.AddMemoryCache();
    services.AddSingleton<IRateLimitingService, RateLimitingService>();
    
    // Add logging with security enhancements
    services.AddLogging(builder =>
    {
        builder.AddFilter(\"Microsoft\", LogLevel.Warning)
               .AddFilter(\"System\", LogLevel.Warning)
               .AddFilter(\"API\", LogLevel.Information);
                
        builder.AddApplicationInsights();
        builder.AddSeq(Configuration.GetSection(\"Seq\"));
        
        // Add log scrubbing to prevent sensitive data logging
        services.AddSingleton<ILogScrubber, LogScrubber>();
    });
    
    // Register security services
    services.AddSingleton<ISecurityAuditService, SecurityAuditService>();
    services.AddScoped<IEncryptionService, AesEncryptionService>();
    services.AddScoped<IApiKeyValidator, ApiKeyValidator>();
}
```

## Containerized API Security

Securing APIs deployed in containers requires additional security measures.

### Docker Security Configuration

```dockerfile
# Use official, minimal image
FROM mcr.microsoft.com/dotnet/aspnet:7.0-alpine AS base
WORKDIR /app
EXPOSE 8080

# Set security-focused environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_EnableDiagnostics=0

# Create non-root user for running the application
RUN addgroup -g 1000 -S appgroup && \\
    adduser -u 1000 -S appuser -G appgroup

# Build application
FROM mcr.microsoft.com/dotnet/sdk:7.0-alpine AS build
WORKDIR /src
COPY [\"SecureApi.csproj\", \"./\"]
RUN dotnet restore \"SecureApi.csproj\"
COPY . .
RUN dotnet build \"SecureApi.csproj\" -c Release -o /app/build

# Publish application
FROM build AS publish
RUN dotnet publish \"SecureApi.csproj\" -c Release -o /app/publish /p:UseAppHost=false

# Create final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Set permissions
RUN chown -R appuser:appgroup /app
USER appuser

# Set security labels
LABEL org.opencontainers.image.vendor=\"Example Corp\"
LABEL org.opencontainers.image.title=\"Secure API\"
LABEL org.opencontainers.image.description=\"Secure API implementation\"
LABEL org.opencontainers.image.version=\"1.0.0\"
LABEL securityContext.runAsUser=\"1000\"
LABEL securityContext.runAsGroup=\"1000\"
LABEL securityContext.readOnlyRootFilesystem=\"true\"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT [\"dotnet\", \"SecureApi.dll\"]
```

### Kubernetes Security Context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-api
  labels:
    app: secure-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-api
  template:
    metadata:
      labels:
        app: secure-api
    spec:
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
      - name: secure-api
        image: example/secure-api:1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
          privileged: false
        resources:
          limits:
            cpu: \"500m\"
            memory: \"512Mi\"
          requests:
            cpu: \"100m\"
            memory: \"128Mi\"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: \"Production\"
        - name: ConnectionStrings__DefaultConnection
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: db-connection
        - name: ApiKey__Secret
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: api-key
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: secrets
          mountPath: /app/secrets
          readOnly: true
      volumes:
      - name: tmp
        emptyDir: {}
      - name: secrets
        secret:
          secretName: api-certificates
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: secure-api-network-policy
spec:
  podSelector:
    matchLabels:
      app: secure-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: identity-service
    ports:
    - protocol: TCP
      port: 443
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
```

## Serverless API Security

Securing serverless APIs requires specific security controls tailored to the serverless environment.

### Azure Function App Security

```json
{
  \"version\": \"2.0\",
  \"logging\": {
    \"applicationInsights\": {
      \"samplingSettings\": {
        \"isEnabled\": true,
        \"excludedTypes\": \"Request\"
      }
    }
  },
  \"extensions\": {
    \"http\": {
      \"routePrefix\": \"api\",
      \"maxOutstandingRequests\": 200,
      \"maxConcurrentRequests\": 100,
      \"dynamicThrottlesEnabled\": true
    }
  },
  \"extensionBundle\": {
    \"id\": \"Microsoft.Azure.Functions.ExtensionBundle\",
    \"version\": \"[2.*, 3.0.0)\"
  },
  \"functionTimeout\": \"00:05:00\",
  \"watchDirectories\": [ \"Middlewares\" ],
  \"healthMonitor\": {
    \"enabled\": true,
    \"healthCheckInterval\": \"00:00:10\",
    \"healthCheckWindow\": \"00:02:00\",
    \"healthCheckThreshold\": 6,
    \"counterThreshold\": 0.80
  },
  \"security\": {
    \"authentication\": {
      \"unauthenticatedClientAction\": \"RedirectToLoginPage\",
      \"defaultProvider\": \"JWT\",
      \"providers\": {
        \"JWT\": {
          \"openIdConfiguration\": \"https://identity.example.com/.well-known/openid-configuration\",
          \"audiences\": [\"api://secure-api\"],
          \"issuer\": \"https://identity.example.com\",
          \"validateIssuer\": true,
          \"validateAudience\": true,
          \"validateLifetime\": true,
          \"clockSkew\": \"00:02:00\"
        }
      }
    }
  }
}
```

### AWS Lambda Security Configuration

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  SecureApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./src/
      Handler: SecureApi::SecureApi.Function::FunctionHandler
      Runtime: dotnet6
      MemorySize: 512
      Timeout: 30
      Environment:
        Variables:
          ENVIRONMENT: Production
          LOG_LEVEL: Information
      Policies:
        - AWSLambdaBasicExecutionRole
        - DynamoDBReadPolicy:
            TableName: !Ref DataTable
        - SSMParameterReadPolicy:
            ParameterName: /secure-api/*
      Events:
        ApiEvent:
          Type: Api
          Properties:
            RestApiId: !Ref SecureApi
            Path: /data
            Method: get
            Auth:
              Authorizer: JwtAuthorizer
      VpcConfig:
        SecurityGroupIds:
          - !Ref SecurityGroup
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
      ReservedConcurrentExecutions: 100
      Tracing: Active
  
  # API Gateway with JWT Authorizer
  SecureApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Auth:
        DefaultAuthorizer: JwtAuthorizer
        Authorizers:
          JwtAuthorizer:
            JwtConfiguration:
              issuer: https://identity.example.com
              audience:
                - api://secure-api
      AccessLogSetting:
        DestinationArn: !GetAtt ApiAccessLogGroup.Arn
        Format: '{\"requestId\":\"$context.requestId\", \"ip\":\"$context.identity.sourceIp\", \"requestTime\":\"$context.requestTime\", \"httpMethod\":\"$context.httpMethod\", \"path\":\"$context.path\", \"status\":\"$context.status\", \"protocol\":\"$context.protocol\", \"responseLength\":\"$context.responseLength\", \"userAgent\":\"$context.identity.userAgent\"}'
      MethodSettings:
        - ResourcePath: '/*'
          HttpMethod: '*'
          MetricsEnabled: true
          DataTraceEnabled: false
          ThrottlingBurstLimit: 10
          ThrottlingRateLimit: 5
      EndpointConfiguration: REGIONAL
      TracingEnabled: true
  
  # Security group for Lambda function
  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for API Lambda function
      VpcId: !Ref VpcId
      SecurityGroupEgress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          DestinationSecurityGroupId: !Ref DatabaseSecurityGroup
  
  # WAF for API Gateway
  ApiWaf:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: secure-api-waf
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: SecureApiWaf
      Rules:
        - Name: CommonRuleSet
          Priority: 0
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
          OverrideAction:
            None: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: CommonRuleSet
        - Name: IPRateLimit
          Priority: 1
          Statement:
            RateBasedStatement:
              Limit: 100
              AggregateKeyType: IP
          Action:
            Block: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: IPRateLimit
  
  # WAF Association
  ApiWafAssociation:
    Type: AWS::WAFv2::WebACLAssociation
    Properties:
      ResourceArn: !Sub arn:aws:apigateway:${AWS::Region}::/restapis/${SecureApi}/stages/prod
      WebACLArn: !GetAtt ApiWaf.Arn
```

## Regulatory Compliance for APIs

APIs must comply with various regulatory requirements depending on the data they process and the regions they operate in.

### GDPR Compliance for APIs

#### Data Subject Rights Implementation

```csharp
[ApiController]
[Route(\"api/[controller]\")]
[Authorize]
public class DataSubjectRightsController : ControllerBase
{
    private readonly IDataSubjectService _dataSubjectService;
    private readonly ILogger<DataSubjectRightsController> _logger;
    
    public DataSubjectRightsController(
        IDataSubjectService dataSubjectService,
        ILogger<DataSubjectRightsController> logger)
    {
        _dataSubjectService = dataSubjectService;
        _logger = logger;
    }
    
    // Get all personal data for a data subject (Right of Access)
    [HttpGet(\"data\")]
    [Authorize(Policy = \"DataSubjectAccess\")]
    public async Task<IActionResult> GetPersonalData()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Processing data access request for user {UserId}\", userId);
            
            var personalData = await _dataSubjectService.GetPersonalDataAsync(userId);
            
            return Ok(personalData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing personal data access request\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Update personal data (Right to Rectification)
    [HttpPut(\"data\")]
    [Authorize(Policy = \"DataSubjectRectification\")]
    public async Task<IActionResult> UpdatePersonalData(UpdatePersonalDataRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Processing data rectification request for user {UserId}\", userId);
            
            await _dataSubjectService.UpdatePersonalDataAsync(userId, request);
            
            return NoContent();
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, \"Validation error during data rectification\");
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing personal data rectification request\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Delete personal data (Right to Erasure)
    [HttpDelete(\"data\")]
    [Authorize(Policy = \"DataSubjectErasure\")]
    public async Task<IActionResult> DeletePersonalData()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Processing data erasure request for user {UserId}\", userId);
            
            await _dataSubjectService.DeletePersonalDataAsync(userId);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing personal data erasure request\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Export personal data (Right to Data Portability)
    [HttpGet(\"export\")]
    [Authorize(Policy = \"DataSubjectPortability\")]
    public async Task<IActionResult> ExportPersonalData(string format = \"json\")
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Processing data export request for user {UserId} in format {Format}\", 
                userId, format);
            
            if (format.ToLower() != \"json\" && format.ToLower() != \"xml\")
            {
                return BadRequest(new ErrorResponse(\"Supported formats are 'json' and 'xml'\"));
            }
            
            var exportData = await _dataSubjectService.ExportPersonalDataAsync(userId);
            
            if (format.ToLower() == \"xml\")
            {
                var xmlData = ConvertToXml(exportData);
                return File(Encoding.UTF8.GetBytes(xmlData), \"application/xml\", \"personal_data.xml\");
            }
            
            return File(
                Encoding.UTF8.GetBytes(JsonSerializer.Serialize(exportData, new JsonSerializerOptions
                {
                    WriteIndented = true
                })),
                \"application/json\",
                \"personal_data.json\");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing personal data export request\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Record a data processing objection (Right to Object)
    [HttpPost(\"objection\")]
    [Authorize(Policy = \"DataSubjectObjection\")]
    public async Task<IActionResult> RecordObjection(DataProcessingObjectionRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Processing data objection request for user {UserId}\", userId);
            
            await _dataSubjectService.RecordObjectionAsync(userId, request);
            
            return NoContent();
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, \"Validation error during objection request\");
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing data objection request\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    private string ConvertToXml(PersonalDataExport data)
    {
        var serializer = new XmlSerializer(typeof(PersonalDataExport));
        using var stringWriter = new StringWriter();
        using var xmlWriter = XmlWriter.Create(stringWriter, new XmlWriterSettings
        {
            Indent = true,
            IndentChars = \"  \"
        });
        
        serializer.Serialize(xmlWriter, data);
        return stringWriter.ToString();
    }
}
```

#### GDPR-Compliant Consent Management

```csharp
[ApiController]
[Route(\"api/[controller]\")]
[Authorize]
public class ConsentController : ControllerBase
{
    private readonly IConsentService _consentService;
    private readonly ILogger<ConsentController> _logger;
    
    public ConsentController(
        IConsentService consentService,
        ILogger<ConsentController> logger)
    {
        _consentService = consentService;
        _logger = logger;
    }
    
    // Get current consent settings
    [HttpGet]
    public async Task<ActionResult<UserConsentDto>> GetUserConsent()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var consent = await _consentService.GetUserConsentAsync(userId);
            
            return Ok(consent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving user consent settings\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Update consent settings
    [HttpPut]
    public async Task<IActionResult> UpdateUserConsent(UpdateConsentRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Updating consent settings for user {UserId}\", userId);
            
            await _consentService.UpdateUserConsentAsync(userId, request);
            
            return NoContent();
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, \"Validation error during consent update\");
            return BadRequest(new ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error updating user consent settings\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Get consent history
    [HttpGet(\"history\")]
    public async Task<ActionResult<IEnumerable<ConsentHistoryDto>>> GetConsentHistory()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var history = await _consentService.GetConsentHistoryAsync(userId);
            
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving user consent history\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Revoke all consent
    [HttpDelete]
    public async Task<IActionResult> RevokeAllConsent()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            _logger.LogInformation(\"Revoking all consent for user {UserId}\", userId);
            
            await _consentService.RevokeAllConsentAsync(userId);
            
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error revoking user consent\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
}
```

### PCI DSS Compliance for Payment APIs

```csharp
[ApiController]
[Route(\"api/[controller]\")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<PaymentsController> _logger;
    private readonly IEncryptionService _encryptionService;
    
    public PaymentsController(
        IPaymentService paymentService,
        ILogger<PaymentsController> logger,
        IEncryptionService encryptionService)
    {
        _paymentService = paymentService;
        _logger = logger;
        _encryptionService = encryptionService;
    }
    
    // Process payment (with PCI DSS compliance)
    [HttpPost]
    [Authorize(Policy = \"ProcessPayments\")]
    public async Task<ActionResult<PaymentResponseDto>> ProcessPayment(PaymentRequestDto request)
    {
        try
        {
            // Validate the request
            if (!IsValid(request))
            {
                return BadRequest(new ErrorResponse(\"Invalid payment request\"));
            }
            
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            // Mask card number for logging (only store last 4 digits)
            var maskedCardNumber = MaskCardNumber(request.CardNumber);
            
            _logger.LogInformation(\"Processing payment for user {UserId} with card ending in {LastFour}\",
                userId, maskedCardNumber.Substring(maskedCardNumber.Length - 4));
            
            // Process the payment
            var paymentResult = await _paymentService.ProcessPaymentAsync(new PaymentRequest
            {
                UserId = userId,
                Amount = request.Amount,
                Currency = request.Currency,
                CardNumber = request.CardNumber,
                CardHolderName = request.CardHolderName,
                ExpiryMonth = request.ExpiryMonth,
                ExpiryYear = request.ExpiryYear,
                Cvv = request.Cvv
            });
            
            if (!paymentResult.Success)
            {
                return BadRequest(new ErrorResponse(paymentResult.ErrorMessage));
            }
            
            // Return success response with transaction ID (never return card details)
            return Ok(new PaymentResponseDto
            {
                TransactionId = paymentResult.TransactionId,
                Status = paymentResult.Status,
                Timestamp = paymentResult.Timestamp
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error processing payment\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your payment\"));
        }
    }
    
    // Get payment history (no sensitive data)
    [HttpGet(\"history\")]
    [Authorize(Policy = \"ViewPaymentHistory\")]
    public async Task<ActionResult<IEnumerable<PaymentHistoryDto>>> GetPaymentHistory()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var history = await _paymentService.GetPaymentHistoryAsync(userId);
            
            // Ensure no sensitive data is included
            var sanitizedHistory = history.Select(p => new PaymentHistoryDto
            {
                TransactionId = p.TransactionId,
                Amount = p.Amount,
                Currency = p.Currency,
                Status = p.Status,
                Timestamp = p.Timestamp,
                // Only include last 4 digits of card number
                LastFourDigits = p.LastFourDigits
            });
            
            return Ok(sanitizedHistory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving payment history\");
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Get payment receipt (no sensitive data)
    [HttpGet(\"{transactionId}/receipt\")]
    [Authorize(Policy = \"ViewPaymentReceipts\")]
    public async Task<ActionResult<PaymentReceiptDto>> GetPaymentReceipt(string transactionId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            
            var receipt = await _paymentService.GetPaymentReceiptAsync(userId, transactionId);
            
            if (receipt == null)
            {
                return NotFound(new ErrorResponse(\"Receipt not found\"));
            }
            
            // Ensure no sensitive data is included
            var sanitizedReceipt = new PaymentReceiptDto
            {
                TransactionId = receipt.TransactionId,
                Amount = receipt.Amount,
                Currency = receipt.Currency,
                Status = receipt.Status,
                Timestamp = receipt.Timestamp,
                MerchantName = receipt.MerchantName,
                // Only include last 4 digits of card number
                LastFourDigits = receipt.LastFourDigits
            };
            
            return Ok(sanitizedReceipt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving payment receipt for transaction {TransactionId}\", 
                transactionId);
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
    
    // Validate payment request
    private bool IsValid(PaymentRequestDto request)
    {
        // Validate amount
        if (request.Amount <= 0)
        {
            return false;
        }
        
        // Validate card number (Luhn algorithm check)
        if (!IsValidCardNumber(request.CardNumber))
        {
            return false;
        }
        
        // Validate expiry date
        if (!IsValidExpiryDate(request.ExpiryMonth, request.ExpiryYear))
        {
            return false;
        }
        
        // Validate CVV (3-4 digits)
        if (!IsValidCvv(request.Cvv))
        {
            return false;
        }
        
        return true;
    }
    
    // Mask card number, leaving only last 4 digits visible
    private string MaskCardNumber(string cardNumber)
    {
        if (string.IsNullOrEmpty(cardNumber) || cardNumber.Length < 4)
        {
            return \"****\";
        }
        
        return new string('*', cardNumber.Length - 4) + cardNumber.Substring(cardNumber.Length - 4);
    }
    
    // Validate card number using Luhn algorithm
    private bool IsValidCardNumber(string cardNumber)
    {
        // Remove spaces and non-digit characters
        cardNumber = Regex.Replace(cardNumber, @\"\\D\", \"\");
        
        if (string.IsNullOrEmpty(cardNumber) || cardNumber.Length < 13 || cardNumber.Length > 19)
        {
            return false;
        }
        
        // Luhn algorithm implementation
        int sum = 0;
        bool alternate = false;
        
        for (int i = cardNumber.Length - 1; i >= 0; i--)
        {
            int digit = int.Parse(cardNumber[i].ToString());
            
            if (alternate)
            {
                digit *= 2;
                if (digit > 9)
                {
                    digit -= 9;
                }
            }
            
            sum += digit;
            alternate = !alternate;
        }
        
        return sum % 10 == 0;
    }
    
    // Validate expiry date
    private bool IsValidExpiryDate(int month, int year)
    {
        if (month < 1 || month > 12)
        {
            return false;
        }
        
        var now = DateTime.UtcNow;
        
        // Check if the card is expired
        if (year < now.Year || (year == now.Year && month < now.Month))
        {
            return false;
        }
        
        return true;
    }
    
    // Validate CVV
    private bool IsValidCvv(string cvv)
    {
        // CVV should be 3-4 digits
        return !string.IsNullOrEmpty(cvv) && Regex.IsMatch(cvv, @\"^\\d{3,4}$\");
    }
}
```

## API Security Testing

### API Security Testing with OWASP ZAP

```powershell
# PowerShell script for automated API security testing with OWASP ZAP

# Parameters
param (
    [string]$ApiUrl = \"https://api.example.com\",
    [string]$ApiSpec = \"./openapi.json\",
    [string]$OutputDir = \"./security-reports\",
    [string]$JwtToken,
    [string]$ApiKey
)

# Create output directory if it doesn't exist
if (-not (Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Timestamp for report names
$timestamp = Get-Date -Format \"yyyyMMdd-HHmmss\"

# Basic API scan with OpenAPI/Swagger specification
Write-Host \"Starting basic API scan with OpenAPI specification...\" -ForegroundColor Cyan
docker run --rm -v ${PWD}:/zap/wrk/:rw -t owasp/zap2docker-stable zap-api-scan.py `
    -t $ApiSpec `
    -f openapi `
    -r \"$OutputDir/api-scan-report-$timestamp.html\" `
    -w \"$OutputDir/api-scan-report-$timestamp.md\" `
    -J \"$OutputDir/api-scan-report-$timestamp.json\" `
    -d

# Advanced scan with authentication
if ($JwtToken) {
    Write-Host \"Starting authenticated API scan...\" -ForegroundColor Cyan
    
    # Create auth script and context
    $authScript = @\"
function authenticate(helper, paramsValues, credentials) {
    var AuthHeader = credentials.getParam(\"AuthHeader\");
    var token = credentials.getParam(\"Token\");
    
    helper.getCorrespondingHttpMessage().getRequestHeader().setHeader(AuthHeader, \"Bearer \" + token);
    return true;
}

function getRequiredParamsNames() {
    return [\"AuthHeader\", \"Token\"];
}

function getCredentialsParamsNames() {
    return [];
}

function getOptionalParamsNames() {
    return [];
}
\"@

    $authScriptPath = \"$OutputDir/auth-script-$timestamp.js\"
    $authScript | Out-File -FilePath $authScriptPath -Encoding ASCII
    
    # Run authenticated scan
    docker run --rm -v ${PWD}:/zap/wrk/:rw -t owasp/zap2docker-stable zap-api-scan.py `
        -t $ApiSpec `
        -f openapi `
        -r \"$OutputDir/api-auth-scan-report-$timestamp.html\" `
        -w \"$OutputDir/api-auth-scan-report-$timestamp.md\" `
        -J \"$OutputDir/api-auth-scan-report-$timestamp.json\" `
        -z \"-config api.disablekey=true -config authentication.script.name=jwt-auth -config authentication.script.file=/zap/wrk/$authScriptPath -config authentication.script.params.AuthHeader=Authorization -config authentication.script.params.Token=$JwtToken\"
}

# Create API Key context file
    $apiKeyConfig = @\"
!OpenAPI Scan
!Context=API Key Context
!URL=$ApiUrl
!Format=JSON
!Target=$ApiUrl
!Header=X-API-Key:$ApiKey
\"@

    $apiKeyConfigPath = \"$OutputDir/api-key-context-$timestamp.conf\"
    $apiKeyConfig | Out-File -FilePath $apiKeyConfigPath -Encoding ASCII
    
    # Run API Key authenticated scan
    docker run --rm -v ${PWD}:/zap/wrk/:rw -t owasp/zap2docker-stable zap-api-scan.py `
        -t $ApiSpec `
        -f openapi `
        -r \"$OutputDir/api-key-scan-report-$timestamp.html\" `
        -w \"$OutputDir/api-key-scan-report-$timestamp.md\" `
        -J \"$OutputDir/api-key-scan-report-$timestamp.json\" `
        -n \"$OutputDir/api-key-context-$timestamp.conf\"
}

# Run security scans with different user roles
if ($JwtToken) {
    Write-Host \"Running security scans with different user roles...\" -ForegroundColor Cyan
    
    # Sample tokens for different roles
    $adminToken = $JwtToken # Assume the provided token has admin privileges
    $userToken = \"user-jwt-token-here\" # Replace with actual user token
    $guestToken = \"guest-jwt-token-here\" # Replace with actual guest token
    
    $roles = @{
        \"admin\" = $adminToken
        \"user\" = $userToken
        \"guest\" = $guestToken
    }
    
    foreach ($role in $roles.Keys) {
        if ($roles[$role]) {
            Write-Host \"Running scan with $role role...\" -ForegroundColor Yellow
            
            docker run --rm -v ${PWD}:/zap/wrk/:rw -t owasp/zap2docker-stable zap-api-scan.py `
                -t $ApiSpec `
                -f openapi `
                -r \"$OutputDir/role-$role-scan-report-$timestamp.html\" `
                -w \"$OutputDir/role-$role-scan-report-$timestamp.md\" `
                -J \"$OutputDir/role-$role-scan-report-$timestamp.json\" `
                -z \"-config api.disablekey=true\" `
                -H \"Authorization: Bearer $($roles[$role])\"
        }
    }
}

# Active scan with custom rules
Write-Host \"Running active scan with custom security rules...\" -ForegroundColor Cyan
docker run --rm -v ${PWD}:/zap/wrk/:rw -t owasp/zap2docker-stable zap-full-scan.py `
    -t $ApiUrl `
    -g gen.conf `
    -r \"$OutputDir/active-scan-report-$timestamp.html\" `
    -w \"$OutputDir/active-scan-report-$timestamp.md\" `
    -J \"$OutputDir/active-scan-report-$timestamp.json\" `
    -j `
    -z \"-config api.disablekey=true -config scanner.attackStrength=HIGH -config scanner.alertThreshold=LOW\"

# Consolidate findings
Write-Host \"Consolidating security findings...\" -ForegroundColor Cyan
$reportSummary = @\"
# API Security Scan Summary

Date: $(Get-Date -Format \"yyyy-MM-dd HH:mm:ss\")
API: $ApiUrl

## Scan Reports

\"@

# List all generated reports
Get-ChildItem -Path $OutputDir -Filter \"*$timestamp*\" | ForEach-Object {
    $reportSummary += \"- [$($_.Name)]($($_.Name))`n\"
}

$reportSummary | Out-File -FilePath \"$OutputDir/summary-$timestamp.md\" -Encoding ASCII

Write-Host \"API security testing completed!\" -ForegroundColor Green
Write-Host \"Reports saved to: $OutputDir\" -ForegroundColor Green
```

### Automated Security Testing in CI/CD

```yaml
# GitHub Actions workflow for API security testing
name: API Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1'  # Weekly scan on Mondays at 2:00 AM

jobs:
  security-scan:
    name: API Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      
      - name: Set up .NET
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: '7.0.x'
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pytest
          pip install checkov
          pip install semgrep
          dotnet tool install -g security-scan
      
      # Static Application Security Testing (SAST)
      - name: Run static code analysis
        run: |
          semgrep --config=p/owasp-top-ten ./src
          checkov -d ./infrastructure --framework all
      
      # Secrets scanning
      - name: Scan for secrets
        uses: gitleaks/gitleaks-action@v1.6.0
      
      # Dependency checks
      - name: Scan dependencies for vulnerabilities
        run: |
          dotnet list package --vulnerable
          dotnet list package --outdated
      
      # API security testing with ZAP
      - name: Run OWASP ZAP API Scan
        uses: zaproxy/action-api-scan@v0.1.0
        with:
          target: 'https://dev-api.example.com/openapi.json'
          format: 'openapi'
          fail_action: false
          token: ${{ secrets.GITHUB_TOKEN }}
          docker_name: 'owasp/zap2docker-stable'
      
      # Upload security reports
      - name: Upload security reports
        uses: actions/upload-artifact@v2
        with:
          name: security-reports
          path: |
            zap-report.html
            semgrep-results.json
            checkov-report.json
          
      # Security Quality Gate
      - name: Security Quality Gate
        run: |
          # Check for critical and high severity findings
          critical_findings=$(grep -c \"Critical\" zap-report.html || true)
          high_findings=$(grep -c \"High\" zap-report.html || true)
          
          echo \"Critical findings: $critical_findings\"
          echo \"High findings: $high_findings\"
          
          # Fail the build if critical findings are present
          if [ $critical_findings -gt 0 ]; then
            echo \"Critical security vulnerabilities found. Pipeline failed.\"
            exit 1
          fi
          
          # Warn but don't fail for high findings
          if [ $high_findings -gt 0 ]; then
            echo \"High security vulnerabilities found. Please review.\"
          fi
```

## Common API Attack Vectors and Mitigations

APIs face various security threats that require specific countermeasures:

### 1. Broken Authentication

**Attack Vectors:**
- Credential stuffing attacks
- Brute force attacks on login endpoints
- Token theft through client-side storage
- Weak password reset flows

**Mitigations:**
```csharp
// Rate limiting middleware for authentication endpoints
public class AuthRateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger<AuthRateLimitingMiddleware> _logger;
    
    public AuthRateLimitingMiddleware(
        RequestDelegate next,
        IDistributedCache cache,
        ILogger<AuthRateLimitingMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        // Only apply rate limiting to authentication endpoints
        if (IsAuthEndpoint(context.Request.Path))
        {
            string clientIp = context.Connection.RemoteIpAddress?.ToString() ?? \"unknown\";
            string cacheKey = $\"auth_ratelimit:{clientIp}\";
            
            // Check if client has exceeded rate limit
            if (await IsRateLimitExceededAsync(cacheKey))
            {
                _logger.LogWarning(\"Authentication rate limit exceeded for IP: {ClientIp}\", clientIp);
                
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.Add(\"Retry-After\", \"300\"); // 5 minutes
                await context.Response.WriteAsync(\"Too many authentication attempts. Please try again later.\");
                
                return;
            }
            
            // Increment the counter
            await IncrementCounterAsync(cacheKey);
        }
        
        await _next(context);
    }
    
    private bool IsAuthEndpoint(PathString path)
    {
        return path.StartsWithSegments(\"/api/auth\") || 
               path.StartsWithSegments(\"/api/login\") ||
               path.StartsWithSegments(\"/api/token\") ||
               path.StartsWithSegments(\"/api/register\");
    }
    
    private async Task<bool> IsRateLimitExceededAsync(string cacheKey)
    {
        var counterJson = await _cache.GetStringAsync(cacheKey);
        if (string.IsNullOrEmpty(counterJson))
        {
            return false;
        }
        
        var counter = JsonSerializer.Deserialize<RateLimitCounter>(counterJson);
        
        // Allow 5 attempts per 5 minutes
        return counter.Count >= 5;
    }
    
    private async Task IncrementCounterAsync(string cacheKey)
    {
        var counterJson = await _cache.GetStringAsync(cacheKey);
        var counter = string.IsNullOrEmpty(counterJson)
            ? new RateLimitCounter { Count = 0, Timestamp = DateTimeOffset.UtcNow }
            : JsonSerializer.Deserialize<RateLimitCounter>(counterJson);
        
        // Reset counter if 5 minutes have passed
        if (DateTimeOffset.UtcNow - counter.Timestamp > TimeSpan.FromMinutes(5))
        {
            counter.Count = 0;
            counter.Timestamp = DateTimeOffset.UtcNow;
        }
        
        // Increment counter
        counter.Count++;
        
        // Store counter with 5-minute expiration
        await _cache.SetStringAsync(
            cacheKey,
            JsonSerializer.Serialize(counter),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });
    }
    
    private class RateLimitCounter
    {
        public int Count { get; set; }
        public DateTimeOffset Timestamp { get; set; }
    }
}
```

### 2. Broken Object Level Authorization

**Attack Vectors:**
- API endpoints that expose object identifiers
- Replacing IDs in API requests to access unauthorized resources
- Insecure direct object references (IDOR)

**Mitigations:**
```csharp
// Resource authorization handler
public class ResourceAuthorizationHandler<T> : AuthorizationHandler<ResourceAccessRequirement, T> where T : IResource
{
    private readonly IResourceAccessPolicy _accessPolicy;
    private readonly ILogger<ResourceAuthorizationHandler<T>> _logger;
    
    public ResourceAuthorizationHandler(
        IResourceAccessPolicy accessPolicy,
        ILogger<ResourceAuthorizationHandler<T>> logger)
    {
        _accessPolicy = accessPolicy;
        _logger = logger;
    }
    
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        ResourceAccessRequirement requirement,
        T resource)
    {
        var user = context.User;
        
        if (!user.Identity.IsAuthenticated)
        {
            _logger.LogWarning(\"Unauthenticated access attempt to resource {ResourceType}/{ResourceId}\",
                typeof(T).Name, resource.Id);
            return;
        }
        
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Check if user has access to the resource
        bool hasAccess = await _accessPolicy.HasAccessAsync(userId, resource, requirement.AccessType);
        
        if (hasAccess)
        {
            context.Succeed(requirement);
            _logger.LogDebug(\"User {UserId} granted {AccessType} access to {ResourceType}/{ResourceId}\",
                userId, requirement.AccessType, typeof(T).Name, resource.Id);
        }
        else
        {
            _logger.LogWarning(\"User {UserId} denied {AccessType} access to {ResourceType}/{ResourceId}\",
                userId, requirement.AccessType, typeof(T).Name, resource.Id);
        }
    }
}

// Resource access requirement
public class ResourceAccessRequirement : IAuthorizationRequirement
{
    public AccessType AccessType { get; }
    
    public ResourceAccessRequirement(AccessType accessType)
    {
        AccessType = accessType;
    }
}

public enum AccessType
{
    Read,
    Create,
    Update,
    Delete
}

// Resource interface
public interface IResource
{
    string Id { get; }
}

// Resource access policy implementation
public class ResourceAccessPolicy : IResourceAccessPolicy
{
    private readonly IRepository _repository;
    
    public ResourceAccessPolicy(IRepository repository)
    {
        _repository = repository;
    }
    
    public async Task<bool> HasAccessAsync(string userId, IResource resource, AccessType accessType)
    {
        // Check resource ownership
        var ownership = await _repository.GetResourceOwnershipAsync(resource.Id);
        
        // Owner has full access
        if (ownership.OwnerId == userId)
        {
            return true;
        }
        
        // Check shared access
        var accessGrants = await _repository.GetResourceAccessGrantsAsync(resource.Id);
        var userGrant = accessGrants.FirstOrDefault(g => g.UserId == userId);
        
        if (userGrant != null)
        {
            return accessType switch
            {
                AccessType.Read => userGrant.CanRead,
                AccessType.Update => userGrant.CanUpdate,
                AccessType.Delete => userGrant.CanDelete,
                _ => false
            };
        }
        
        // Check organization-level access
        var userOrganizations = await _repository.GetUserOrganizationsAsync(userId);
        var resourceOrganization = await _repository.GetResourceOrganizationAsync(resource.Id);
        
        if (resourceOrganization != null && userOrganizations.Contains(resourceOrganization))
        {
            var orgRole = await _repository.GetUserOrganizationRoleAsync(userId, resourceOrganization);
            
            return accessType switch
            {
                AccessType.Read => orgRole >= OrganizationRole.Member,
                AccessType.Create => orgRole >= OrganizationRole.Contributor,
                AccessType.Update => orgRole >= OrganizationRole.Contributor,
                AccessType.Delete => orgRole >= OrganizationRole.Admin,
                _ => false
            };
        }
        
        // Default: no access
        return false;
    }
}

// Using resource authorization in a controller
[ApiController]
[Route(\"api/[controller]\")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;
    private readonly IAuthorizationService _authorizationService;
    private readonly ILogger<DocumentsController> _logger;
    
    public DocumentsController(
        IDocumentService documentService,
        IAuthorizationService authorizationService,
        ILogger<DocumentsController> logger)
    {
        _documentService = documentService;
        _authorizationService = authorizationService;
        _logger = logger;
    }
    
    [HttpGet(\"{id}\")]
    public async Task<IActionResult> GetDocument(string id)
    {
        try
        {
            var document = await _documentService.GetDocumentByIdAsync(id);
            if (document == null)
            {
                return NotFound();
            }
            
            // Check if user has read access to the document
            var authResult = await _authorizationService.AuthorizeAsync(
                User, 
                document, 
                new ResourceAccessRequirement(AccessType.Read));
                
            if (!authResult.Succeeded)
            {
                // Return 404 instead of 403 to avoid revealing resource existence
                return NotFound();
            }
            
            return Ok(document);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, \"Error retrieving document {DocumentId}\", id);
            return StatusCode(500, new ErrorResponse(\"An error occurred while processing your request\"));
        }
    }
}
```

### 3. Excessive Data Exposure

**Attack Vectors:**
- APIs returning too much data
- Sensitive information in responses
- Relying on client-side filtering

**Mitigations:**
```csharp
// DTO mapping with data filtering
public class UserProfileDto
{
    public string Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public string FullName { get; set; }
    public DateTime CreatedAt { get; set; }
    // Sensitive fields not included: password hash, security questions, etc.
}

// User profile service with role-based data filtering
public class UserProfileService : IUserProfileService
{
    private readonly IUserRepository _userRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<UserProfileService> _logger;
    
    public UserProfileService(
        IUserRepository userRepository,
        IHttpContextAccessor httpContextAccessor,
        ILogger<UserProfileService> logger)
    {
        _userRepository = userRepository;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }
    
    public async Task<UserProfileDto> GetUserProfileAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }
        
        // Get current user roles
        var currentUser = _httpContextAccessor.HttpContext.User;
        bool isAdmin = currentUser.IsInRole(\"Admin\");
        bool isSelf = currentUser.FindFirstValue(ClaimTypes.NameIdentifier) == userId;
        
        // Apply data filtering based on roles
        var profile = new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            CreatedAt = user.CreatedAt
        };
        
        // Only show email to admins or the user themselves
        if (isAdmin || isSelf)
        {
            profile.Email = user.Email;
        }
        
        return profile;
    }
    
    public async Task<IEnumerable<UserProfileDto>> GetAllUserProfilesAsync()
    {
        var users = await _userRepository.GetAllAsync();
        
        // Get current user roles
        var currentUser = _httpContextAccessor.HttpContext.User;
        bool isAdmin = currentUser.IsInRole(\"Admin\");
        string currentUserId = currentUser.FindFirstValue(ClaimTypes.NameIdentifier);
        
        // Apply data filtering based on roles
        return users.Select(user =>
        {
            bool isSelf = user.Id == currentUserId;
            
            var profile = new UserProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                CreatedAt = user.CreatedAt
            };
            
            // Only show email to admins or the user themselves
            if (isAdmin || isSelf)
            {
                profile.Email = user.Email;
            }
            
            return profile;
        });
    }
}
```

### 4. Mass Assignment

**Attack Vectors:**
- APIs binding request data directly to models
- Adding unexpected properties in request payloads
- Modifying object properties that should be read-only

**Mitigations:**
```csharp
// Request models with explicit properties
public class CreateUserRequest
{
    public string Username { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    public string FullName { get; set; }
    
    // No sensitive properties like IsAdmin, Role, etc.
}

public class UpdateUserRequest
{
    public string FullName { get; set; }
    public string Email { get; set; }
    
    // No sensitive properties like IsAdmin, Role, etc.
}

// User service with explicit property mapping
public class UserService : IUserService
{
    private readonly IUserRepository _repository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<UserService> _logger;
    
    public UserService(
        IUserRepository repository,
        IPasswordHasher passwordHasher,
        ILogger<UserService> logger)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }
    
    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        // Check if user already exists
        if (await _repository.GetByUsernameAsync(request.Username) != null)
        {
            throw new DuplicateResourceException(\"Username already exists\");
        }
        
        if (await _repository.GetByEmailAsync(request.Email) != null)
        {
            throw new DuplicateResourceException(\"Email already exists\");
        }
        
        // Create user with explicit property mapping
        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Username = request.Username,
            Email = request.Email,
            FullName = request.FullName,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            Role = \"User\" // Default role
        };
        
        await _repository.CreateAsync(user);
        
        _logger.LogInformation(\"User created: {UserId}\", user.Id);
        
        return user;
    }
    
    public async Task<User> UpdateUserAsync(string userId, UpdateUserRequest request)
    {
        var user = await _repository.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }
        
        // Update only allowed properties
        user.FullName = request.FullName;
        user.Email = request.Email;
        user.UpdatedAt = DateTime.UtcNow;
        
        await _repository.UpdateAsync(user);
        
        _logger.LogInformation(\"User updated: {UserId}\", user.Id);
        
        return user;
    }
}
```

### 5. Security Misconfiguration

**Attack Vectors:**
- Default configurations with security weaknesses
- Unpatched systems with known vulnerabilities
- Verbose error messages revealing implementation details
- Missing security headers

**Mitigations:**
```csharp
// Security headers middleware
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SecurityHeadersOptions _options;
    
    public SecurityHeadersMiddleware(RequestDelegate next, IOptions<SecurityHeadersOptions> options)
    {
        _next = next;
        _options = options.Value;
    }
    
    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers to all responses
        var headers = context.Response.Headers;
        
        // Prevent XSS attacks
        headers[\"X-XSS-Protection\"] = \"1; mode=block\";
        
        // Prevent MIME type sniffing
        headers[\"X-Content-Type-Options\"] = \"nosniff\";
        
        // Prevent clickjacking
        headers[\"X-Frame-Options\"] = \"DENY\";
        
        // Enforce HTTPS
        headers[\"Strict-Transport-Security\"] = $\"max-age={_options.HstsMaxAge}; includeSubDomains; preload\";
        
        // Content Security Policy
        if (_options.EnableCsp)
        {
            headers[\"Content-Security-Policy\"] = _options.ContentSecurityPolicy;
        }
        
        // Referrer Policy
        headers[\"Referrer-Policy\"] = \"strict-origin-when-cross-origin\";
        
        // Permissions Policy
        headers[\"Permissions-Policy\"] = \"camera=(), microphone=(), geolocation=()\";
        
        await _next(context);
    }
}

// Security headers options
public class SecurityHeadersOptions
{
    public int HstsMaxAge { get; set; } = 31536000; // 1 year
    public bool EnableCsp { get; set; } = true;
    public string ContentSecurityPolicy { get; set; } = \"default-src 'self'; script-src 'self'; object-src 'none';\";
}

// Register middleware in Startup.cs
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    // Configure security headers
    app.UseMiddleware<SecurityHeadersMiddleware>();
    
    // Other middleware
}
```

### 6. Injection Attacks

**Attack Vectors:**
- SQL injection
- NoSQL injection
- OS command injection
- XML injection

**Mitigations:**
```csharp
// Repository with parameterized queries
public class ProductRepository : IProductRepository
{
    private readonly DbContext _dbContext;
    private readonly ILogger<ProductRepository> _logger;
    
    public ProductRepository(DbContext dbContext, ILogger<ProductRepository> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }
    
    public async Task<IEnumerable<Product>> SearchProductsAsync(string searchTerm)
    {
        // Safe: Uses parameterized query with EF Core
        return await _dbContext.Products
            .Where(p => p.Name.Contains(searchTerm) || p.Description.Contains(searchTerm))
            .ToListAsync();
    }
    
    public async Task<IEnumerable<Product>> GetProductsByIdsAsync(IEnumerable<int> ids)
    {
        // Safe: Uses parameterized query with EF Core
        return await _dbContext.Products
            .Where(p => ids.Contains(p.Id))
            .ToListAsync();
    }
    
    public async Task<IEnumerable<Product>> GetProductsInCategoryAsync(string category)
    {
        // Validate input before using in query
        if (string.IsNullOrWhiteSpace(category))
        {
            throw new ArgumentException(\"Category cannot be empty\", nameof(category));
        }
        
        // Safe: Uses parameterized query with EF Core
        return await _dbContext.Products
            .Where(p => p.Category == category)
            .ToListAsync();
    }
    
    public async Task<Product> CreateProductAsync(Product product)
    {
        // Validate product before saving
        ValidateProduct(product);
        
        _dbContext.Products.Add(product);
        await _dbContext.SaveChangesAsync();
        
        return product;
    }
    
    private void ValidateProduct(Product product)
    {
        if (product == null)
        {
            throw new ArgumentNullException(nameof(product));
        }
        
        if (string.IsNullOrWhiteSpace(product.Name))
        {
            throw new ValidationException(\"Product name is required\");
        }
        
        if (product.Price <= 0)
        {
            throw new ValidationException(\"Product price must be greater than zero\");
        }
        
        // Additional validation as needed
    }
}
```

## References and Resources

### API Security Standards and Guidelines

1. OWASP API Security Top 10: [https://owasp.org/API-Security/editions/2023/en/0x00-introduction/](https://owasp.org/API-Security/editions/2023/en/0x00-introduction/)
2. NIST Special Publication 800-204: [https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-204.pdf](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-204.pdf)
3. PCI DSS API Security Guidelines: [https://www.pcisecuritystandards.org/document_library](https://www.pcisecuritystandards.org/document_library)
4. OAuth 2.0 Security Best Practices: [https://oauth.net/2/](https://oauth.net/2/)

### API Security Testing Tools

1. OWASP ZAP: [https://www.zaproxy.org/](https://www.zaproxy.org/)
2. Postman: [https://www.postman.com/](https://www.postman.com/)
3. Burp Suite: [https://portswigger.net/burp](https://portswigger.net/burp)
4. API Security Audit Checklist: [https://github.com/shieldfy/API-Security-Checklist](https://github.com/shieldfy/API-Security-Checklist)

### API Security Blogs and Resources

1. API Security Best Practices (Microsoft): [https://docs.microsoft.com/en-us/azure/api-management/api-management-security-best-practices](https://docs.microsoft.com/en-us/azure/api-management/api-management-security-best-practices)
2. API Security Articles (Auth0): [https://auth0.com/blog/tag/api-security/](https://auth0.com/blog/tag/api-security/)
3. API Security Encyclopedia: [https://apisecurity.io/encyclopedia/](https://apisecurity.io/encyclopedia/)

### Recommended Books

1. \"API Security in Action\" by Neil Madden
2. \"Microservices Security in Action\" by Prabath Siriwardena and Nuwan Dias
3. \"OAuth 2.0 in Action\" by Justin Richer and Antonio Sanso
4. \"API Design Patterns\" by JJ Geewax

### Security Monitoring and Incident Response

1. Azure Security Center: [https://azure.microsoft.com/en-us/services/security-center/](https://azure.microsoft.com/en-us/services/security-center/)
2. AWS Security Hub: [https://aws.amazon.com/security-hub/](https://aws.amazon.com/security-hub/)
3. Elastic Stack for Security Monitoring: [https://www.elastic.co/security](https://www.elastic.co/security)
4. NIST Incident Response Guidelines: [https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf)

    