# Open-Sourcing Abandoned macOS & iOS Apps: The Lost Source Code Playbook
*A Technical Guide to Rescuing, Reverse-Engineering, Decoupling, and Open-Sourcing Apps when Original Source Code is Lost, Obfuscated, or Only an `.ipa` / `.app` Remains.*

---

## 1. Introduction & The "Lost Source Code" Reality

Developers and engineering teams frequently find themselves holding compiled application artifacts (`.app` on macOS, `.ipa` on iOS) where:
- The original source code repository was deleted, corrupted, or lost.
- The company went out of business and shut down its cloud infrastructure.
- The app is tethered to dead cloud backends (Supabase, Firebase, proprietary gRPC/REST APIs).
- The original codebase was bundled and minified into production JavaScript (Electron, React Native) or compiled into native ARM64 Mach-O binaries (Swift, Objective-C).

**The Core Rule:** You do not have to rewrite from scratch. A compiled application artifact contains the completed UI layouts, styling, asset catalogs, routing paths, data contracts, and native platform bindings.

This document details how to reverse-engineer, decouple, and re-release both **macOS desktop applications** and **iOS mobile applications (`.ipa`)** separately as fully functional, self-hosted open-source software.

---

## 2. PART I: macOS Desktop Applications (`.app`)

macOS applications (`.app`) generally fall into two categories:
1. **Web/Electron Runtimes:** (Like VoiceOS, Slack, Notion) — JavaScript/TypeScript + Native Node C++ extensions.
2. **Native Mach-O Runtimes:** (Swift, Objective-C, AppKit/SwiftUI) — Compiled machine code.

---

### 2.1 Electron & Hybrid Desktop Apps (The VoiceOS Archetype)

#### Step 1: Extraction & Native Binary Isolation
An Electron `.app` stores its codebase in `Contents/Resources/`.
- If an `app.asar` archive exists, unpack it:
  ```bash
  npx @electron/asar extract Contents/Resources/app.asar source_recovered/
  ```
- **Preserve Native Binaries Immediately:** Isolate native dependencies before touching code:
  - `.node` files: Precompiled C++ Node addons (e.g., `window_corners.node`, `location_core.node`).
  - Mach-O CLI helpers: Helper binaries invoked via `child_process.spawn()` (e.g., audio capture, keystroke injection).
  - Helper bundles: `.app` bundles nested in `Contents/Resources/` (e.g., AppleScript/Music helpers).
  - Application icons: `Contents/Resources/icon.icns`.
  - Entitlements: `resources/build/entitlements.mac.plist`.

#### Step 2: Code Deobfuscation & Architectural Reconstruction
1. **Un-minify JavaScript:**
   ```bash
   npx prettier --write "src/**/*.js"
   ```
2. **Recover Application Routes & Components:**
   - Search for routing tables (e.g., React Router hash routes like `#/agent-notch`, `#/pill`, `#/settings`).
   - Identify IPC communication boundaries in `preload.js` (`contextBridge.exposeInMainWorld`).
   - Preserve all IPC channel names verbatim—do not rename channels that bind renderer views to the main process.

#### Step 3: Severing Cloud Tethering
Proprietary desktop apps crash or hang on boot because remote servers fail to respond.
1. **Network Guard (`networkGuard.js`):** Intercept all web requests via Electron's session API:
   ```javascript
   session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
     const url = details.url;
     if (/api\.voiceos\.com|supabase\.co|posthog\.com|sentry\.io/.test(url)) {
       return callback({ cancel: true });
     }
     callback({});
   });
   ```
2. **Local Identity Seeding:** Locate the local key-value store (`electron-store` or SQLite). Replace remote token validation checks with a persistent "Local Pro" session so login screens are bypassed permanently.

#### Step 4: Protocol Inversion (In-Process Backend)
If the frontend communicated with a remote gRPC/REST server, **invert the protocol**:
- Spawn a local HTTP/gRPC server inside the Electron main process listening on `localhost:<port>`.
- Emulate the exact protobuf or JSON wire signatures the frontend expects.
- Store dictations, transcripts, and history in a local SQLite database (`sqlite3` or `better-sqlite3`).

#### Step 5: Integrating Zero-Key AI (Claude OAuth)
To avoid forcing users to enter expensive API keys:
- **Claude Code CLI Integration:** Run Anthropic's official `claude` CLI in headless mode, passing a local MCP server bridge for app actions.
- **Keychain OAuth Token Extraction:** Read the user's active session token from the macOS Keychain:
  ```bash
  security find-generic-password -s "Claude Code-credentials" -w
  ```
  Pass the token directly to `@anthropic-ai/sdk` (`authToken: accessToken`).

#### Step 6: Native Packaging & Code Signing
- **Disable ASAR Packing:** In `package.json`, set `"build": { "asar": false }` so native binaries and worker threads execute directly from disk without extraction bugs.
- **Inside-Out Code Signing (`package-app.sh`):** macOS resets Microphone and Accessibility permissions if the app runs as an ad-hoc signed generic `Electron` binary.
- Sign all binaries, dylibs, frameworks, and the main `.app` with a stable Apple Development identity:
  ```bash
  codesign --force --timestamp=none --options runtime --entitlements "$ENT" --sign "$IDENTITY" "$APP"
  ```

---

### 2.2 Native macOS Apps (Swift / Objective-C)

If the app is pure native Swift/Objective-C without web runtimes:

1. **Extract UI & Assets:**
   - Extract compiled asset catalogs (`Assets.car`) using `assetutil` or open-source tools like `cartool`:
     ```bash
     cartool Contents/Resources/Assets.car output_assets/
     ```
   - Extract strings and translations:
     ```bash
     plutil -p Contents/Resources/en.lproj/Localizable.strings
     ```
2. **Disassemble the Mach-O Binary:**
   - Use `class-dump` or `dsdump`:
     ```bash
     class-dump Contents/MacOS/AppBinary -o Headers/
     ```
     This reconstructs all Objective-C and Swift class headers, method signatures, and data models.
3. **API Redirection via Binary Patching or Dynamic Hooking:**
   - Search strings for API endpoints:
     ```bash
     strings Contents/MacOS/AppBinary | grep -E "https?://"
     ```
   - If endpoints are in `Info.plist`, modify them directly with `plutil`.
   - If hardcoded in the binary, patch the URL strings in a hex editor (keeping string length identical) or inject a dynamic library (`DYLD_INSERT_LIBRARIES`) to hook `NSURLSession` / `URLSession` calls.

---

## 3. PART II: iOS Mobile Applications (`.ipa`)

An `.ipa` (iOS App Store Package) is a compressed zip archive containing an iOS app bundle: `Payload/AppName.app/`.

---

### 3.1 Anatomy & Inspection of an `.ipa`

#### Step 1: Unpack the `.ipa`
```bash
unzip -q AppName.ipa -d ipa_extracted/
cd ipa_extracted/Payload/*.app/
```

#### Step 2: Check FairPlay DRM Encryption
App Store binaries are encrypted with FairPlay. Sideloaded, TestFlight, or ad-hoc IPAs are decrypted.
Check encryption status:
```bash
otool -l AppExecutable | grep -A 4 LC_ENCRYPTION_INFO
```
- If `cryptid 0`: The binary is **unencrypted and ready to analyze**.
- If `cryptid 1`: The app has FairPlay DRM. A clean-room reimplementation or an unencrypted developer archive is required.

---

### 3.2 Identifying the Framework

Check the contents of `Payload/*.app/`:
- **React Native:** Contains `main.jsbundle` (plain JavaScript or Hermes bytecode `.hbc`).
- **Flutter:** Contains `Frameworks/Flutter.framework` and `App.framework`.
- **Native Swift/ObjC (e.g., PEAKD / TheFinalRep):** Contains a native ARM64 Mach-O binary (`TBDApp`), system bundles (`PostHog`, `Firebase`, `GoogleSignIn`), and `Assets.car`.

---

### 3.3 Deobfuscation & Reverse Engineering by Framework

#### Scenario A: React Native (`main.jsbundle`)
1. **If Plain JavaScript:**
   - Format with Prettier:
     ```bash
     npx prettier --write main.jsbundle
     ```
   - Locate API baseURL definitions, Redux/Zustand store schemas, and authentication handlers.
2. **If Hermes Bytecode (`.hbc`):**
   - Check Hermes bytecode version:
     ```bash
     head -c 8 main.jsbundle
     ```
   - Disassemble using `hermes-dec` or `hbctool`:
     ```bash
     hermes-dec -d main.jsbundle -o decompiled_bundle.js
     ```

#### Scenario B: Native Swift / Objective-C
When there is no JavaScript bundle, the application logic is compiled into the native binary.

1. **Check `Info.plist` First (The Golden Shortcut):**
   Many modern iOS apps store their backend base URLs directly in `Info.plist`:
   ```bash
   plutil -p Info.plist | grep -i "url"
   ```
   *Real Example:*
   ```
   "apiBaseUrl" => "https://aia-api.detoxxp.com/api/v1"
   ```
   If found, **you do not need to reverse-engineer or decompile the binary**. You can redirect the entire app to your own open-source server simply by updating this string!
2. **Extract Class Interfaces & Data Models:**
   Generate Swift/ObjC headers using `class-dump`:
   ```bash
   class-dump TBDApp -o Headers/
   ```
   This gives you the exact data models (e.g., `User`, `WorkoutSession`, `ChatMessage`, `DietLog`).
3. **Trace Network Endpoints:**
   ```bash
   strings TBDApp | grep -E "^/api/v1"
   ```
   This reveals the complete REST API routing table (e.g., `/api/v1/auth/login`, `/api/v1/chat/message`, `/api/v1/estimate/calories`).

---

### 3.4 Decoupling & The "Self-Hosted Proxy Bridge" Architecture

#### Why You Cannot Run Everything on the Phone
On macOS Electron, VoiceOS runs Node.js, SQLite, and Whisper on-device.
**On iOS, this is impossible:**
- Apple's sandbox prevents running `child_process.spawn()`.
- iOS kills background processes that exceed memory limits.
- Background daemons cannot be kept alive indefinitely.

#### The Architecture: The Self-Hosted Proxy Bridge
Instead of running servers on the phone, build a lightweight, open-source backend server (Node.js/FastAPI) that runs on the user's Mac, home server, or a free VPS:

```
[ iPhone (Modified .ipa) ]
           │
           │  (Redirected HTTPS traffic)
           ▼
[ Open-Source Local Bridge Server ] (Node.js / Python)
     │                     │
     ▼                     ▼
[ Claude / LLM ]      [ Whisper STT ]
(Via Claude OAuth)    (Local or Cloud)
```

1. **Replicate the Dead Backend API:**
   Build endpoints matching what the app calls:
   - `POST /api/v1/auth/verify` → Return mock user token.
   - `POST /api/v1/chat/stream` → Call Anthropic Claude and stream reply back in the app's expected JSON format.
   - `POST /api/v1/audio/transcribe` → Run Whisper and return text.
2. **Repoint the iOS App:**
   Update `Info.plist`:
   ```bash
   plutil -replace apiBaseUrl -string "https://my-bridge.mydomain.com/api/v1" Info.plist
   ```

---

### 3.5 Re-Signing & Sideloading the Modified `.ipa`

Once `Info.plist` or assets are modified, the original App Store signature is invalid. You must re-sign the app for iOS to run it.

#### Step 1: Remove Old Signature
```bash
rm -rf Payload/*.app/_CodeSignature
```

#### Step 2: Obtain a Provisioning Profile
- Create a free or paid Apple Developer account.
- In Xcode, create an empty iOS app with the bundle identifier (e.g., `com.myname.thefinalrep`), select your Team, and build once to create an `embedded.mobileprovision` file.
- Copy the provisioning profile into the bundle:
  ```bash
  cp path/to/embedded.mobileprovision Payload/*.app/
  ```

#### Step 3: Extract Entitlements
```bash
security cms -D -i Payload/*.app/embedded.mobileprovision > profile.plist
plutil -extract Entitlements xml1 -o entitlements.plist profile.plist
```

#### Step 4: Re-Sign All Components Inside-Out
```bash
IDENTITY="Apple Development: Your Name (XXXXXXXXXX)"

# Sign nested frameworks and bundles
find Payload/*.app/Frameworks -type f -exec codesign --force --sign "$IDENTITY" {} + 2>/dev/null || true

# Sign main app
codesign --force --sign "$IDENTITY" --entitlements entitlements.plist Payload/*.app
```

#### Step 5: Pack the `.ipa`
```bash
zip -qr ResurrectedApp.ipa Payload/
```

#### Step 6: Install on Device
- **Via Xcode:** Open Xcode → `Window` → `Devices and Simulators` (`⌘ + Shift + 2`) → Drag and drop `ResurrectedApp.ipa`.
- **Via Sideloadly / AltStore:** Drag the IPA to install wirelessly.

---

## 4. PART III: Structuring the Open-Source Release

To publish the resurrected project cleanly on GitHub without copyright or legal issues:

### 4.1 Recommended Repository Structure

```
├── README.md               # Setup, features, and run instructions
├── docs/                   # Reverse-engineering documentation & API schemas
├── src/                    # Deobfuscated / reconstructed client code
├── server/                 # Open-source backend bridge (replaces dead cloud)
│   ├── index.js            # Express/FastAPI API bridge
│   ├── claude.js           # Claude OAuth / API integration
│   └── whisper.js          # Speech transcription integration
├── scripts/
│   ├── package-app.sh      # macOS build & inside-out signing script
│   └── resign-ipa.sh       # iOS IPA resign & packaging script
└── resources/              # Icons, plists, and entitlements
```

### 4.2 Legal & Clean-Room Best Practices
1. **Strip All Proprietary Telemetry:** Ensure all tracking keys (PostHog API keys, Firebase project IDs, Sentry DSNs, Mixpanel tokens) are stripped from the code.
2. **Never Check In Proprietary Secrets:** Never commit company client secrets, private keys, or credentials.
3. **Use BYO (Bring-Your-Own) Authentication:** Provide OAuth login (Claude Code / Google) or let the user supply their own API keys.
4. **Document Wire Contracts:** Publish the JSON schemas for the API so others can build alternative backends.

---

## 5. Summary Blueprint Checklist

| Phase | macOS Desktop (.app) | iOS Mobile (.ipa) |
|---|---|---|
| **1. Extraction** | Unpack `.asar` / `.app` | Unpack `.ipa` with `unzip` |
| **2. Triage** | Protect `.node` & Mach-O helpers | Inspect `Info.plist` & check `cryptid 0` |
| **3. Code Recovery** | Un-minify JS / Prettier | Format JS bundle or dump class headers |
| **4. Cloud Decoupling** | Local in-process backend (`backend.js`) | Point `apiBaseUrl` to external proxy server |
| **5. AI Brain** | Local Whisper Metal + Claude Code OAuth | Proxy server handles Claude & Whisper calls |
| **6. Code Signing** | `codesign` with Developer ID & entitlements | `codesign` with `embedded.mobileprovision` |
| **7. Distribution** | Packaged `.app` / `npm run app` | Re-signed `.ipa` via Xcode or AltStore |
