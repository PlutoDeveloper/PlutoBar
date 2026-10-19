# MISSION: Modernize VoiceOS into a Self-Contained Desktop AI with Claude, Google & OpenAI/Codex

## 1. PROJECT CONTEXT & CURRENT ARCHITECTURE
You are working on a reconstructed, deobfuscated Electron desktop application located in `src/`:
- **Main Process**: `src/main/main.js` (Window managers, audio capture, global shortcuts, SQLite database, and IPC handlers).
- **Background Chunks**: `src/main/chunks/` (14 modules including integration studio, app nudging, and scaffolders).
- **Preload Bridge**: `src/preload/preload.js` (IPC bridge exposing typed APIs to renderer).
- **Renderer UI**: `src/renderer/` (Complete React application with routes for `#/agent-notch`, `#/pill`, `#/`, etc.).
- **Local Database**: SQLite3 instance tracking `dictations`, `voice_sessions`, `custom_instructions`, and `coding_agent_tasks`.

### THE CORE PROBLEM:
The app was originally built as a client to `https://api.voiceos.com` and Supabase. Speech-to-text streaming (`TranscribeStream`) and AI agent streaming (`AgentStream`) currently attempt to connect to that remote gRPC backend, which fails without their proprietary cloud.

---

## 2. YOUR GOAL
Transform this into a **fully self-contained, multi-provider desktop AI client**. Instead of using `api.voiceos.com`, allow the user to authenticate directly with:
1. **Anthropic Claude** (Claude 3.5 Sonnet / Claude 3.7 Sonnet) via Anthropic API or Claude OAuth.
2. **Google Gemini** (Gemini 2.5 Flash / Pro) via Google OAuth or API Key.
3. **OpenAI / Codex** (GPT-4o / o3-mini / Whisper) via OpenAI API or Codex OAuth.

All macOS-native features (**Dynamic Notch**, **Floating Pill**, **Side History Drawer**, **File Drag-and-Drop to Notch**, **Global Shortcuts**, and **Accessibility Text Paste**) must remain 100% functional.

---

## 3. IMPLEMENTATION PLAN (STEP-BY-STEP)

### PHASE 1: Build Setup & Dev Run Scripts
1. Update `package.json` to include:
   - `"main": "./src/main/main.js"`
   - Scripts:
     - `"dev": "electron ."`
     - `"build": "electron-builder build --mac"`
   - devDependencies:
     - `"electron": "^34.0.0"`
     - `"electron-builder": "^25.1.8"`
2. Ensure native dependencies (`sqlite3`, `node-mac-permissions`) compile smoothly against the local Electron ABI (`npx @electron/rebuild`).

---

### PHASE 2: Local Provider Credential & Settings Engine
1. In `src/main/main.js`, locate `store$1` (the `electron-store` instance).
2. Bypass all remote auth checks (e.g., `store$1.get(STORE_KEYS.ACCESS_TOKEN)` returning `null` or checking `api.voiceos.com`). Treat the local app as permanently authenticated in "Local Pro" mode.
3. Create a provider settings manager in `src/main/services/providers.js`:
   - Support storing API Keys or OAuth tokens for:
     - `providers.anthropic.apiKey`
     - `providers.openai.apiKey` (used for both Whisper STT and GPT/Codex LLM)
     - `providers.google.apiKey`
   - Expose IPC channels for the Settings UI:
     - `ipcMain.handle("settings:get-providers", ...)`
     - `ipcMain.handle("settings:save-provider-key", ...)`
     - `ipcMain.handle("settings:set-active-provider", ...)` (Claude, Google, or OpenAI)

---

### PHASE 3: Decouple Audio Capture & Implement Direct Speech-to-Text (STT)
1. Locate the audio capture listener in `src/main/main.js`:
   - Search for `audio-capture-data` and `#silenceMonitor`.
2. Replace `TranscribeStream` and `VoiceOSSessionStream`:
   - Buffer raw PCM audio chunks during recording.
   - When `#silenceMonitor` triggers or recording stops:
     - Encode the buffered PCM into WAV/MP3 in memory using standard Node.js buffers.
     - Send the audio directly to **OpenAI Whisper** (`/v1/audio/transcriptions`) or **Groq Whisper** for sub-second transcription.
   - Dispatch the transcribed text into the local pipeline via:
     - `mainWindow.webContents.send(...)`
     - `agentNotchWindow.webContents.send(...)`
     - `pillWindow.webContents.send(...)`
   - Insert the record into the local SQLite `dictations` and `voice_sessions` tables.

---

### PHASE 4: Direct Agent Reasoning & Streaming Engine
1. Replace `VoiceOSService.AgentStream` and `ChatFollowUp`:
   - Build a unified streaming agent runner in `src/main/services/agentRunner.js` that selects the active provider:
     - **Anthropic**: Use `@anthropic-ai/sdk` with stream events (`content_block_delta`).
     - **Google Gemini**: Use `@google/genai` or `@google/generative-ai` with `generateContentStream`.
     - **OpenAI**: Use `openai` SDK with `chat.completions.create({ stream: true })`.
2. Hook into active app context:
   - Preserve the existing macOS Accessibility hooks (`getSelectedText()` and active app bundle ID detection).
   - Feed the selected text, active window title, and user prompt into the system prompt.
3. Stream the response directly to the UI:
   - Send token deltas to `agentNotchWindow` and `pillWindow` to trigger the dynamic text expansion.
   - On completion, trigger the existing text insertion routine (simulating `Cmd+V` paste into the target application).

---

### PHASE 5: Preserve the macOS Dynamic Notch
1. Do not remove or break:
   - `getAgentNotchDisplayGeometry`: Detects the physical camera notch and sets window bounds.
   - `AGENT_NOTCH_EXPANDED_UPDATE` & `AGENT_NOTCH_DISPLAY_HAS_NOTCH_UPDATE` IPC events.
   - The file drag-and-drop listener (`installNotchFileDropTarget`).
2. Verify that `agentNotchWindow` loads `index.html#/agent-notch` cleanly with transparent background and click-through flags.

---

## 4. VERIFICATION CRITERIA
1. `npm run dev` launches the desktop app without crashing.
2. The **Dynamic Notch** appears at the top of the screen flush against the MacBook notch (or floating on non-notch displays).
3. Pressing the global voice shortcut activates the microphone and changes the notch into its listening state.
4. Finished speech produces a transcription using the configured provider API key.
5. The selected AI model (Claude, Gemini, or Codex) streams text back to the notch and pastes it into the active app.
6. The entire app runs without making a single network call to `api.voiceos.com`.
