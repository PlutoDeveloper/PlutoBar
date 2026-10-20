# PlutoBar

A Spotlight-style assistant for macOS (it grew out of VoiceOS). Press ⌥Space and type, or hold a shortcut and talk: it finds apps, actions, your clipboard and your files by what's in them, and otherwise it types what you say into any app, or Claude does things on your Mac, like opening apps, drafting replies, playing music or checking reminders, and answers out loud.

- **Speech and file search run on your Mac.** Whisper large-v3 turbo for speech-to-text, Kokoro for the voice, and DigUp's engine with EmbeddingGemma 2 for finding files by what's in them, all on-device and offline.
- **Claude is the brain.** It uses the Claude account you're already signed into in Claude Code, or an Anthropic API key.
- **Nothing goes to the VoiceOS cloud.** Its servers, Supabase and telemetry are all blocked.

## Run it

```bash
npm install
npm run build:digup   # once: builds the file-search engine (llama.cpp needs CMake)
npm run app           # build, sign and open "PlutoBar.app"
```

The first launch opens **setup**, one step at a time like DigUp's:

1. **Welcome:** Get Started downloads the models once (Whisper ~570 MB, the Kokoro voice ~160 MB, the search model 865 MB), shown at the bottom of every later step.
2. **Permissions:** Microphone and Accessibility.
3. **Claude:** detects your Claude Code sign-in. **Sign In** opens Anthropic's own sign-in page; or paste an API key.
4. **Files:** which folders to search, each with how many files it holds and how long its first pass takes; optionally your code. Indexing starts as you continue.
5. **Shortcut:** pick one and press it to try it.
6. **Ready:** things to try, and open at login.

Run it again from the menu bar icon (Set Up PlutoBar…) or Settings → PlutoBar. Later changes live where you'd expect them:

- **Settings → Claude:** account, Agent model (Haiku, Sonnet, Opus), the model for quick tasks, an optional API key
- **Settings → Speech:** Whisper models, the reply voice engine, permissions
- **Agent page → Agent voice:** which voice reads replies, its speed, on/off (Jarvis is the British butler)
- **Dictation page → Polishing:** None (Whisper's text), Light (instant on-device cleanup), Polished (rewritten by Claude)

> **Use `npm run app`, not `npm run dev`, for real use.** macOS ties Microphone and Accessibility permissions to a signed app. `npm run dev` runs as the generic "Electron" binary, so permissions don't stick. `npm run app` signs the build with your Apple Development certificate, so permissions survive rebuilds. `npm run dev` is still handy for quick code changes.

Other commands: `npm run dist` builds a `.dmg`. `npm run build:whisper` rebuilds the Whisper engine from source. `npm run build:ui-control` rebuilds the Accessibility helper behind computer use.

## How it works

The original app was a thin client for a VoiceOS cloud server. That server is now replaced by a local one inside the app (`src/main/local/`). It speaks the same protocol, so the pill, history drawer, shortcuts and paste logic all work unchanged.

```
 hold shortcut ─▶ microphone ─▶ Whisper (on-device, Metal GPU) ─▶ text
                                                    │
                     dictation ◀────────────────────┤  (optionally tidied by Claude)
                                                    ▼
                                        Claude  ◀─▶  VoiceOS tools
                                   (Claude Code or   (open apps, draft replies,
                                    API key)          music, calendar, reminders,
                                        │             files, your MCP servers)
                                        ▼
                       PlutoBar answer  +  Kokoro voice (on-device)
```

**Token use.** Every request re-sends the tool definitions. With several apps connected that was 70+ tools (~45k tokens). Now:

- Everyday tools keep full definitions. That covers opening apps and sites, drafting text, playback, volume, location, reminders, YouTube, weather, Music, computer use and the screenshot.
- Every other connected-app action (Mail, Messages, Notes, Calendar, Finder, workflows…) is one line inside a single `app_tool`, which runs it by name.
- The split never changes between requests, so Claude Code's prompt cache stays valid. Within ~5 minutes of your last request, the next one reads the ~8k-token prefix from cache at a tenth of the cost.
- Replies skip extended thinking, which made voice answers about 3× slower.
- The automatic screenshot is only sent when Claude asks for it (`view_screen`), and window text is capped at 4k characters.
- Light dictation polish runs on your Mac, so it costs no tokens.
- Short requests are used as their own conversation title.
- Follow-ups reuse one Claude session, which re-reads its whole history each time. A conversation idle for 20 minutes, or grown past ~40k tokens, continues in a fresh session with a short recap of the last four exchanges.

Each request's token count is logged as `[Claude] turn haiku: in N (+M cached)`.

**Doing things on your Mac.** Besides the app's own tools (open apps and sites, music, reminders, the connectors on the Apps page), Claude has:

- `youtube_play`: searches YouTube (including live streams) and opens the actual video
- `youtube_transcript`: a video's captions with timestamps, title and chapters, so Claude can summarize it or answer questions about it. Needs [yt-dlp](https://github.com/yt-dlp/yt-dlp) on the Mac (`brew install yt-dlp`, or the copy Agent Reach installs in `~/.agent-reach-venv`); without it the tool says so.
- `get_weather`: weather, forecast and air quality from Open-Meteo (free, no key)
- `music_app`: plays your library and playlists in the real Music app (stays in sync); the Apple Music connector is only used for catalog songs you don't have, and the two pause each other
- Claude Code's `WebSearch` and `WebFetch` for anything current
- `mac_look` / `mac_act`: computer use. Claude reads the front window's buttons, links and fields through the Accessibility API (web pages in Chrome and Safari included), and can press, type, send key combos, scroll, or click by screenshot. When VoiceOS's own window is in front (you typed the request), it works on the app behind it. The helper is `resources/src/ui-control/main.swift`.
- `view_screen`: the screenshot taken when you spoke
- `stock_quote`: stocks, indices, crypto and currencies from Yahoo Finance (no key)
- `mac_system`: volume, mute, dark mode, battery, Wi-Fi, display sleep, lock screen, and your own Shortcuts (`list_shortcuts`, `run_shortcut`)
- `x_twitter` (when X is on in Apps): reads public posts, profiles and search through the FxTwitter API (no key, no login). Posting, replying, quoting, reposting, liking and DMs open X with everything filled in, and you press Post yourself.

Weather and stock results show as cards in PlutoBar.

**PlutoBar.** VoiceOS is a Spotlight-style bar (Liquid Glass, native SwiftUI in `resources/src/plutobar`), modeled on Spotlight with Siri in macOS 27. Press **⌥Space** (Settings → PlutoBar to change it) and type or say what you want. Whatever you type, it works out what you mean:

- **A name:** apps ("saf" → Safari, "vsc" → Visual Studio Code, the ones you open most win ties), actions and your own Shortcuts, clipboard history, and your files.
- **A description of a file:** found by what's in it, with [DigUp](https://github.com/ARahim3/DigUp)'s engine built in (MIT, in `resources/src/digup`; nothing to install separately): photos by what they show, screenshots by their text, PDFs at the page, recordings and videos at the moment ("zebra in a video" opens QuickTime at the zebra). Start with `code:` to search your code and open it in your editor at the line. PlutoBar runs the bundled `digup` tool the way DigUp's app does: `download-model` once, `index-service` to keep the folders you chose indexed (new files first, the first pass while on power, again a moment after anything changes), and `search-service` for exact words while you type and meaning when you pause. If DigUp itself was set up on the Mac, its model, index and folders are taken over on first launch (APFS clones: instant, no extra space). Until folders are indexed, file names come from Spotlight.
- **A sum or a website:** "12% of 80" answers right there (Return copies it); "github.com" opens it.
- **A question or a request:** **Ask Pluto** (Claude with all of VoiceOS's Mac tools) is offered on every query, and it's the top hit when the query reads like a request ("what's…", "remind me…", a question mark, a long phrase). Return asks; the answer streams in under the bar with its weather, stock and approval cards, and whatever you type next is a follow-up. ⌘N starts over. Pluto can also search your files itself (`search_files`, through DigUp).

Keys: ↑↓ move, Return opens (a file at its page or moment), ⌘Return shows it in Finder, ⌘1–⌘4 browse Applications, Files, Actions and Clipboard, Esc steps back then closes. Resting the pointer on the empty bar shows your last conversation and the four places. Holding your voice shortcut, or the mic in the bar, talks to Pluto: the bar's edge glows while it listens and works.

Clipboard history (⌘4) keeps what you copied in the last 8 hours, in memory only; copies a password manager marks concealed are never kept.

The original Electron agent notch still runs underneath as an invisible engine: it plays the spoken replies and runs the turn state machine, but it is never shown and never takes the mouse. Turning PlutoBar off (Settings → PlutoBar) brings that classic overlay back. Rebuild PlutoBar with `npm run build:plutobar`; `scripts/dev/plutobar.sh` drives it in the running app.

**Approvals.** Connected-app actions marked "needs approval" (sending a message or email, moving or creating files…) show an approval card in PlutoBar. You can edit the content, then approve or cancel. Nothing runs until you approve, and the request waits up to 5 minutes. The same card appears when Claude operates a window itself and is about to click a button named Send, Post, Buy, Pay, Delete, Confirm, Accept, Sign out and the like, or to press Return in a messaging or mail app. This is checked in code against the control's real label, so text on a page can't talk Claude past it. For other irreversible steps it's told to ask first. A request stops after 25 computer-use actions (with a nudge at 12) and won't repeat the same action three times. Computer use never clicks or types into macOS permission, password or security prompts, or the Privacy & Security settings pages. Those are refused in code, not only by instruction.

**Claude through Claude Code.** VoiceOS runs your installed, unmodified `claude` command in the background, one request at a time. Anthropic permits this for Pro and Max plans. VoiceOS never reads or stores your Claude credentials; sign-in status comes from `claude auth status`. Each request runs isolated from your own Claude Code setup: an empty folder, none of your hooks, plugins or MCP servers, and no file or shell tools. It only gets VoiceOS's tools, served over a private localhost connection that lasts one request. The Haiku option is pinned to Claude Haiku 5.5 (`claude-haiku-5-5`), because Claude Code versions from before its release still resolve `haiku` to 4.5; the constant is `HAIKU` in `claudeCode.js`.

## Project layout

```
src/
  main/
    main.js            the original app (patches marked "// [local-runtime]")
    chunks/            the original app's lazy-loaded modules
    local/             ← everything new
      index.js           wiring, state + IPC for the setup/settings UI
      backend.js         the local stand-in for the VoiceOS server
      settings.js        preferences (+ optional API key, Keychain-encrypted)
      identity.js        the local "account" (no login screen)
      networkGuard.js    blocks VoiceOS cloud, Supabase, PostHog, Sentry
      assistant/         Claude: files.js (search_files, on the built-in index), claudeCode.js, claudeApi.js, toolBridge.js, prompts.js,
                         tools.js (tool table + app_tool catalog), youtube.js,
                         youtubeTranscript.js, weather.js, stocks.js, x.js, musicApp.js,
                         macSystem.js, computer.js (computer use)
      plutobar/          PlutoBar: index.js (routing + rows), digup.js (file search: DigUp's engine),
                         apps.js, actions.js (actions, Shortcuts, calculator), clipboard.js
      agentEvents.js     the assistant's events, as PlutoBar shows them
      speech/            whisper.js, transcribe.js, tidy.js, tts.js (Kokoro), models.js
  preload/             preload.js (original)
  renderer/            original UI (assets/, patches marked "[local-runtime]")
    voiceos/local-ui.js  Dashboard setup card + Settings → Claude / Speech / PlutoBar tabs
resources/
  bin/                 macOS helper binaries + whisper-server + ui-control
  src/ui-control/      Swift source of the computer-use helper
  src/plutobar/        Swift source of PlutoBar (SwiftUI + Node-API addon): the bar and setup
  src/digup/           DigUp's search engine (MIT), built into bin/digup by scripts/build-digup.sh
  plutobar/            plutobar.node, built by scripts/build-plutobar.sh
  native/              native addons (window corners, location)
  build/               icon, tray icon, entitlements
  VoiceOS Music.app    Apple Music helper
scripts/               package-app.sh · build-whisper.sh · build-ui-control.sh · build-plutobar.sh · build-digup.sh · brand/ (icon, wordmark)
  dev/                 backend-harness.js (`npm test`, no Electron or Claude needed) ·
                       launch-debug.sh + turn.sh + cdp.js (send a request to the running app
                       and print its tool calls and token use) · plutobar.sh (drive PlutoBar)
docs/                  original build spec
```

## Where your data lives

`~/Library/Application Support/PlutoBar/` holds (moved there from `VoiceOS opensourced/` on the first launch after the rename):

- `models/`: the speech and voice models
- `Search/`: the search model and the index of your folders
- `voiceos.db`: your dictation and assistant history
- `config.json`: settings

Logs are in `~/Library/Logs/PlutoBar/main.log`; the indexer's in `Search/index.noindex/indexer.log`.

## Troubleshooting

- **The shortcut does nothing:** check System Settings → Privacy & Security → Accessibility and make sure "PlutoBar" is on. Make sure you launched the app with `npm run app`.
- **"Claude isn't connected":** open Settings → Claude. You can also run `claude auth status` in Terminal. If it says you're not logged in, run `claude auth login`.
- **"You've reached your Claude plan's usage limit":** this is your plan's normal limit. It resets on Anthropic's schedule, or you can add an API key in Settings.

## Not available offline

These features needed servers that VoiceOS ran, so they're hidden or inactive: cloud connectors on the Apps page (Gmail, Slack, Google Calendar; the local ones like Messages, Mail, Notes, Music and Spotify work), teams, billing, referrals, tutorials, help chat, mobile pairing, the hands-free wake word and auto-update.
