# VoiceOS & Abandoned Desktop App Revival Playbook
*A Complete Step-by-Step Blueprint for AI Agents and Developers to Deobfuscate, Decouple, Re-Architect, and Resign Modern AI Desktop Applications.*

---

## 1. Executive Summary & Architecture Paradigm

When a proprietary desktop application (Electron/Node-based) is discontinued or orphaned:
1. **The Core UI and Native Helpers Survive:** The compiled bundle contains all React components, layout code, local SQLite schemas, macOS native Mach-O binaries, and `.node` C++ extensions.
2. **The Cloud Server is Dead:** The application fails because it tries to reach dead remote endpoints (e.g., `api.voiceos.com`, Supabase, PostHog, telemetry).
3. **The Strategy:** 
   - **Do not rewrite from scratch.** Reverse-engineer and deobfuscate the survived client.
   - **Protocol Inversion:** Replace remote cloud services with an **in-process local backend** that mimics the exact gRPC/protobuf/REST wire contracts expected by the UI.
   - **On-Device Private Engines:** Run speech-to-text (Whisper with Apple Silicon Metal acceleration) and text-to-speech (Kokoro-82M) locally.
   - **Subscription-Backed AI (Zero-Key OAuth):** Connect the AI reasoning engine directly to Claude (via Claude Code CLI session or Keychain OAuth bearer token) so users do not need expensive pay-per-token API keys.
   - **Code Signing with Apple Development Identity:** Bundle and sign the app with proper entitlements so macOS preserves Microphone, Accessibility, and Screen Recording permissions across builds.

---

## 2. Stage 1: Extraction & Forensic Triage

### 2.1 Locate Survived Artifacts
Extract the contents of the installed or recovered application bundle (`Contents/Resources/app` or `app.asar`).
If inside an ASAR archive:
```bash
npx @electron/asar extract app.asar app_extracted/
```

### 2.2 Inventory of Rescued Assets
Before touching the code, isolate and protect irreplaceable native binaries:
- **Native Node Modules (`.node`):** e.g., `native/window_corners.node`, `native/location_core.node`.
- **Precompiled macOS Mach-O Executables:** e.g., `binaries/microphone-capture`, `binaries/text-injector`, `binaries/selection-reader`, `binaries/keyboard-listener`, `binaries/whisper-server`.
- **Helper Apps:** e.g., `VoiceOS Music.app` (AppleScript/ObjC bridge).
- **macOS Entitlements & Icons:** `icon.icns`, `resources/build/entitlements.mac.plist`.
- **Database Schemas:** Identify local SQLite database files (e.g., `dictations`, `voice_sessions`, `custom_instructions`).

---

## 3. Stage 2: Code Deobfuscation & Routing Reconstruction

### 3.1 Un-minification & Formatting
Minified JavaScript bundles should be formatted into clean, indented code using Prettier or Babel:
```bash
npx prettier --write "src/**/*.js"
```

### 3.2 Identifying Application Structure
- **Main Process:** `src/main/main.js` handles window creation, global shortcuts, and audio device listeners.
- **IPC Preload Bridge:** `src/preload/preload.js` defines `contextBridge.exposeInMainWorld(...)` channels.
- **Renderer UI:** `src/renderer/` contains the React bundle with hash-based routes (e.g., `#/agent-notch`, `#/pill`, `#/settings`).

### 3.3 Deobfuscation Rules
- Preserve original variable names if bound to third-party SDKs or IPC contracts.
- Replace hex-encoded string lookups (`_0x4a12[...]`) using AST transformers or automated dictionary evaluation scripts.
- Never alter the UI component route paths or IPC event names.

---

## 4. Stage 3: Severing Cloud Tethering

### 4.1 Network Guard (`networkGuard.js`)
Install an early network interceptor on `electron.session.defaultSession.webRequest` before any network calls occur:
- Intercept and block:
  - `*://api.voiceos.com/*`
  - `*://*.supabase.co/*`
  - Telemetry & Analytics (`*.posthog.com`, `*.sentry.io`, Google Analytics).
- Log any unexpected outbound requests to identify hidden dependencies.

### 4.2 Mock Local Identity (`identity.js`)
- Replace remote auth checks (e.g., `store.get("ACCESS_TOKEN")` returning `null` or triggering login redirects).
- Seed a permanent local identity:
  ```javascript
  {
    userId: "self-hosted",
    email: "local@voiceos.app",
    plan: "pro",
    authenticated: true
  }
  ```
- Bypass login screens so the application boots directly into its ready/dashboard state.

---

## 5. Stage 4: Protocol Inversion & Local Server Architecture

### 5.1 Understanding the Wire Protocol
The original client used gRPC/ConnectRPC over HTTP/2 or WebSockets (`VoiceOSService.TranscribeStream`, `VoiceOSService.AgentStream`).
Rather than rewriting the React frontend to speak standard REST:
1. Implement an in-process local ConnectRPC/HTTP server (`src/main/local/backend.js`).
2. Export the exact same protobuf service signatures:
   - `TranscribeStream`: Receives audio chunks, returns live transcriptions.
   - `AgentStream`: Receives conversation history and tool declarations, returns streaming tokens and tool calls.
   - `ChatFollowUp`: Handles follow-up conversational turns.
3. Route internal client network calls to `http://localhost:<random-port>`.

---

## 6. Stage 5: On-Device Speech Pipeline

### 6.1 Private Transcription (Whisper Metal)
- **Engine:** `whisper.cpp` server compiled with Apple Silicon Metal GPU acceleration (`GGML_METAL=1`).
- **Binary:** `binaries/whisper-server` listening on a local Unix socket or loopback port.
- **Models:** Supported quantizations (`whisper-large-v3-turbo-q5_0`, `whisper-small-q5_1`).
- **Dynamic Vocabulary:** Pass custom app names, hotwords, and technical terms into Whisper's prompt context to avoid misrecognitions.

### 6.2 Neural Text-to-Speech (Kokoro-82M)
- **Engine:** OnnxRuntime running quantized Kokoro-82M weights.
- **Voices:** British and American neural voices (`bm_george`, `af_heart`).
- **Performance:** Generates natural speech ~4× faster than real time on Apple Silicon.

---

## 7. Stage 6: The AI Brain — Zero-Key Claude OAuth

Users frequently resist paying for raw API keys when they already pay for subscription plans (Claude Pro/Team).

### 7.1 Architecture Option A: Headless Claude Code Integration (Recommended)
1. Detect installed `claude` CLI (`/opt/homebrew/bin/claude` or `~/.local/bin/claude`).
2. Execute requests in headless mode:
   ```bash
   claude -p "<prompt>" --dangerously-skip-permissions
   ```
3. **Local MCP Bridge:** Spin up a temporary localhost Model Context Protocol (MCP) server exposing VoiceOS's tools (Open apps, Apple Music, System Shortcuts, Accessibility clicking) so Claude can invoke desktop tools seamlessly.
4. **Prompt Caching:** Structure the system prompt and tool definitions into stable prefixes so Anthropic's prompt cache triggers, reducing token costs by ~90% and cutting latency.

### 7.2 Architecture Option B: Keychain OAuth Extraction
1. Extract the active OAuth Bearer token stored by Claude Code in macOS Keychain:
   ```bash
   security find-generic-password -s "Claude Code-credentials" -w
   ```
2. Parse JSON output:
   ```json
   {
     "claudeAiOauth": {
       "accessToken": "sk-ant-oat01-...",
       "refreshToken": "sk-ant-ort01-...",
       "expiresAt": 1790776228931
     }
   }
   ```
3. Initialize the official Anthropic SDK with `authToken`:
   ```javascript
   const Anthropic = require("@anthropic-ai/sdk");
   const client = new Anthropic({ authToken: accessToken });
   ```
4. Claude Code tokens have access to models like `claude-sonnet-5-5`, `claude-opus-5-5`, and `claude-haiku-4-5-20251001`.

---

## 8. Stage 7: Packaging, Entitlements & Code Signing

### 8.1 Why `npm run dev` Fails on macOS
- `npm run dev` launches the default, ad-hoc signed `Electron` binary (`bundle ID: com.github.Electron`).
- macOS TCC (Transparency, Consent, and Control) ties Microphone, Accessibility, and Screen Recording permissions to the binary's code signature and bundle ID.
- Every restart or rebuild of an ad-hoc binary invalidates macOS permission records, forcing the user to re-enable permissions in System Settings every time.

### 8.2 The Solution: `package-app.sh`
1. Disable ASAR packing in `package.json`:
   ```json
   "build": {
     "asar": false
   }
   ```
   *Why:* Native `.node` addons, child process helpers, and dylibs must reside on the actual filesystem to execute without runtime extraction bugs.
2. Build an unpacked `.app` bundle:
   ```bash
   npx electron-builder --mac --dir -c.mac.identity=null
   ```
3. Sign inside-out with a stable Apple Development identity:
   ```bash
   # 1. Sign helper binaries and dylibs
   find "$APP/Contents/Resources" -type f \( -perm -u+x -o -name "*.node" -o -name "*.dylib" \) \
     -exec codesign --force --options runtime --entitlements "$ENT" --sign "$IDENTITY" {} +

   # 2. Sign frameworks
   for fw in "$APP"/Contents/Frameworks/*; do
     codesign --force --options runtime --entitlements "$ENT" --sign "$IDENTITY" "$fw"
   done

   # 3. Sign main application bundle
   codesign --force --options runtime --entitlements "$ENT" --sign "$IDENTITY" "$APP"
   ```

---

## 9. Stage 8: Applying This Process to Mobile Apps (`.ipa` / iOS)

A common question is: **Can this exact process be applied to iOS apps (`.ipa`)?**

### 9.1 Comparison: Electron Desktop vs. iOS `.ipa`

| Dimension | macOS Electron App | iOS `.ipa` App |
|---|---|---|
| **Archive Format** | Directory / ASAR archive | Zip archive containing `Payload/AppName.app` |
| **Code Type** | Interpreted JavaScript + Native Node addons | Compiled ARM64 Mach-O binary (Swift / ObjC / C++) |
| **Decompilation** | Clean readable JavaScript easily recovered | Assembly / Disassembly only (Ghidra, Hopper, IDA) |
| **Subprocesses** | Can spawn `whisper.cpp`, `claude`, Node scripts | **Strictly Forbidden:** iOS sandboxing blocks `spawn` |
| **API Endpoints** | Readily editable in JS | Often defined in `Info.plist` or hardcoded in binary |
| **Signing** | Ad-hoc or macOS Apple Developer ID | Mandatory Apple Developer Provisioning Profile |

### 9.2 The iOS Revival Playbook

#### Step 1: Extract and Inspect the `.ipa`
An `.ipa` is an ordinary zip archive:
```bash
unzip app.ipa -d extracted_app/
cd extracted_app/Payload/*.app
```

#### Step 2: Check `Info.plist` for Configuration Keys
Often, developers place backend base URLs directly in `Info.plist`:
```bash
plutil -p Info.plist | grep -i "url"
```
*Example (from PEAKD / TheFinalRep):*
```json
"apiBaseUrl" => "https://aia-api.detoxxp.com/api/v1"
```
If the backend endpoint is in `Info.plist`, you can change it **without touching the binary**:
```bash
plutil -replace apiBaseUrl -string "https://my-local-server.com/api/v1" Info.plist
```

#### Step 3: Binary Reverse Engineering (If Endpoints are Hardcoded)
If URLs or contracts are compiled into the ARM64 Mach-O executable:
- Run `strings AppExecutable | grep "https://"` to find API routes.
- Use `class-dump` or `ipsw class-dump` to inspect Swift/ObjC class interfaces and data models.
- Use Charles Proxy, Proxyman, or mitmproxy to capture network requests while running the app on a test device.

#### Step 4: Protocol Inversion via Self-Hosted API Bridge
Because an iOS app cannot spawn Node.js or run heavy local Whisper Metal daemons inside the phone sandbox:
1. Build a lightweight Python / Node.js backend server (`api-bridge`) running on your Mac, local network, or a private VPS.
2. Replicate the dead backend endpoints (e.g., `/api/v1/auth`, `/api/v1/chat`, `/api/v1/transcribe`).
3. Connect the bridge directly to Anthropic Claude (via Claude OAuth or API) and Whisper.
4. Point the iOS app to your server.

#### Step 5: Resigning & Sideloading the `.ipa`
After modifying `Info.plist` or assets:
1. Repackage into `.ipa`:
   ```bash
   zip -qr ../ModifiedApp.ipa Payload/
   ```
2. Resign using your Apple Development Identity (`codesign` + `embedded.mobileprovision` from your developer account):
   ```bash
   codesign -f -s "Apple Development: Your Name (ID)" --entitlements Entitlements.plist Payload/AppName.app
   ```
3. Sideload onto iPhone using Xcode (`Window -> Devices and Simulators`), AltStore, or Sideloadly.

---

## 10. Summary Checklist for Future Agents

- [x] Protect and inventory native Mach-O binaries and `.node` addons.
- [x] Deobfuscate JavaScript without renaming IPC channels or UI routes.
- [x] Install an early network guard to silence dead cloud servers and telemetry.
- [x] Mock authentication to establish permanent local status.
- [x] Build an in-process backend matching the client's original wire protocol.
- [x] Wire up on-device speech (Whisper + Kokoro) for privacy and speed.
- [x] Connect Claude via zero-key Claude Code CLI session or Keychain OAuth token.
- [x] Disable ASAR packaging and sign inside-out with a stable developer certificate.
- [x] For mobile `.ipa` apps: redirect backend endpoints in `Info.plist` to a local proxy bridge and resign for sideloading.
