# Driver Signing Requirements

## 1. Purpose
Defines the policies, tooling, and validation workflows for enforcing **driver signing** across printer ecosystems. Designed for AI agents to:
- Validate driver packages against signing policies
- Automate signing of new driver builds
- Reject or quarantine unsigned or deprecated drivers
- Generate compliance reports and remediation tasks

## 2. Scope
- **Platforms**: Windows (kernel-mode & user-mode), Linux (PPD and filter drivers), macOS (CUPS backends), embedded edge nodes
- **Driver Types**: INF-based drivers, PPD files, filter executables, kernel-mode filter drivers
- **Stakeholders**: Driver developers, CI/CD pipelines, security operations, AI automation bots

## 3. Definitions
- **Code Signing Certificate**: X.509 certificate used to sign binaries and packages
- **Catalog File**: `.cat` file listing signed file hashes for Windows driver packages
- **Kernel-Mode Driver**: Windows drivers running at kernel level requiring EV code signing
- **WHQL**: Microsoft Windows Hardware Quality Labs certification
- **GPG Signing**: Use of GNU Privacy Guard to sign PPD and filter packages on Linux

## 4. Platform-Specific Signing Requirements

### 4.1 Windows Drivers
| Driver Type            | Signing Requirement                      | Tooling                                     |
|------------------------|------------------------------------------|---------------------------------------------|
| Kernel-Mode            | EV Code Signing + WHQL Certification     | `signtool.exe sign /fd SHA256 /a`           |
| User-Mode (INF-based)  | Standard Code Signing                    | `signtool.exe sign /fd SHA256 /a`           |
| UWP Print Drivers      | MSIX packaging with certificate signing   | `MakeAppx.exe` + `signtool.exe`             |

#### 4.1.1 Signing Workflow (PowerShell)
```powershell
$certPath = 'cert:\LocalMachine\My\<thumbprint>'
$driverFolder = 'C:\Drivers\VendorXYZ'
# Create catalog
Inf2Cat /driver:$driverFolder /os:10_X64,11_X64 /verbose
# Sign catalog file
decex $driverFolder\VendorXYZ.cat -s $certPath
# Sign binaries
decex $driverFolder\filter.dll -s $certPath
```

### 4.2 Linux Drivers (CUPS)
- **PPD Signing**: GPG detached signature for `.ppd` files
- **Filter/Backend Binaries**: Sign with OpenSSL code signing certificate

#### 4.2.1 GPG Signing Example
```bash
# Generate detached signature
gpg --default-key "printer-maintainer@example.com" --armor --output printer.ppd.sig --detach-sign printer.ppd
# Verify signature
gpg --verify printer.ppd.sig printer.ppd
```

### 4.3 macOS Drivers
- **Kernel Extensions (kexts)**: Must be signed with Apple Developer ID and notarized
- **CUPS Filters**: Signed Mach-O binaries

#### 4.3.1 Notarization Workflow
```bash
# Sign kext
codesign --sign "Developer ID Application: Example Corp" --timestamp --options runtime MyPrinter.kext
# Create ZIP and submit for notarization
zip -r MyPrinter.zip MyPrinter.kext
xcrun altool --notarize-app --primary-bundle-id com.example.myprinter --username "$APPLE_ID" --password "$APP_SPECIFIC_PASSWORD" --file MyPrinter.zip
# Staple ticket
xcrun stapler staple MyPrinter.kext
```

## 5. CI/CD Integration
- **Automated Signing Pipeline**:
  1. Build drivers in CI (Windows: MSBuild, Linux: Make)
  2. Run signing jobs (PowerShell, Bash)
  3. Validate signatures (signtool verify, gpg --verify)
  4. Publish signed package to artifact repository
- **Policy Gate**: Fail pipeline if any unsigned artifact detected

## 6. Policy Definitions & Decision Logic
```yaml
signing_policies:
  windows:
    kernel: { must_sign: true, whql_required: true }
    user: { must_sign: true }
  linux:
    ppd: { gpg_signed: true }
    binaries: { cert_signed: true }
  macos:
    kext: { codesign: true, notarized: true }

actions:
  on_noncompliant:
    - quarantine_package
    - notify_security_team
    - create_remediation_ticket
```

## 7. Compliance Validation
- **Automated Checks**:
  - `signtool verify /pa driver.inf`
  - `gpg --verify` for each PPD signature
  - `codesign --verify --verbose=4 MyPrinter.kext`
- **Reporting**:
  - Generate JSON report of driver signing status
  - Dashboard metrics (percentage signed vs. total)

## 8. Troubleshooting
| Symptom                                | Likely Cause                        | Remediation                                         |
|----------------------------------------|-------------------------------------|-----------------------------------------------------|
| `ERROR: Signer not found`              | Certificate not installed           | Import code signing certificate into local store    |
| `gpg: cannot verify signature`         | Public key missing                  | Import maintainer’s public GPG key                  |
| `notarization status: ineligible`      | Missing hardened runtime flag       | Re-sign with `--options runtime --entitlements`     |

## 9. Best Practices
- Rotate code signing certificates annually
- Store signing keys in HSM or secure key vault
- Use timestamping to extend signature validity
- Automate revocation checks for compromised certificates

## 10. References
- Microsoft SignTool Documentation: https://docs.microsoft.com/windows/win32/seccrypto/signtool  
- GPG Documentation: https://gnupg.org/documentation/  
- Apple Developer Code Signing: https://developer.apple.com/support/code-signing/  

