// VoiceOS local runtime UI, drawn inside the main window with the app's own
// components (window.__voiceosUI, exposed by the bundle):
//   SetupCard   Dashboard checklist until speech, Claude and permissions are ready
//   ClaudeTab   Settings → Claude: account, models, optional API key
//   SpeechTab   Settings → Speech: Whisper models, reply voice, permissions
//   PlutoBarTab Settings → PlutoBar: the Spotlight-style bar, its shortcut, folders to search
// State and actions come from src/main/local/index.js over "voiceos:*" IPC.
(() => {
  "use strict";

  const ui = () => window.__voiceosUI;
  const ipc = () => window.electron.ipcRenderer;

  function h(type, props, ...children) {
    const kids = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
    const { jsx, jsxs } = ui().jsx;
    const p = { ...(props || {}) };
    if (kids.length === 1) p.children = kids[0];
    else if (kids.length > 1) p.children = kids;
    return kids.length > 1 ? jsxs(type, p) : jsx(type, p);
  }

  // ------------------------------------------------------------ state

  function useVoiceOS({ pollMs } = {}) {
    const { useState, useEffect } = ui().React;
    const [state, setState] = useState(null);
    useEffect(() => {
      let alive = true;
      const take = (r) => alive && r?.state && setState(r.state);
      ipc().invoke("voiceos:get-state").then(take, () => {});
      const off = window.api.on("voiceos:state", (s) => alive && setState(s));
      const timer = pollMs ? setInterval(() => ipc().invoke("voiceos:refresh").then(take, () => {}), pollMs) : null;
      return () => {
        alive = false;
        off?.();
        if (timer) clearInterval(timer);
      };
    }, [pollMs]);
    return [state, setState];
  }

  // Runs a "voiceos:*" action, tracking which one is busy and its error.
  function useActions(setState) {
    const { useState } = ui().React;
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const run = async (name, channel, arg) => {
      setBusy(name);
      setError(null);
      try {
        const res = await ipc().invoke(channel, arg);
        if (res?.state) setState(res.state);
        if (res && !res.ok) setError({ name, message: res.error });
        return res;
      } finally {
        setBusy((b) => (b === name ? null : b));
      }
    };
    return { busy, error, run };
  }

  const openExternal = (url) => ipc().invoke("voiceos:open-external", { url });

  // --------------------------------------------------------- building blocks

  const cls = (dark) => ({
    title: "text-sm font-medium " + (dark ? "text-gray-100" : "text-gray-900"),
    desc: "text-xs mt-0.5 " + (dark ? "text-gray-400" : "text-gray-500"),
    icon: "w-5 h-5 mr-1 flex-shrink-0 " + (dark ? "text-gray-300" : "text-gray-600"),
    heading: "text-xl font-bold mb-4 " + (dark ? "text-gray-100" : "text-gray-900"),
    muted: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
    divider: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  });

  const OK = "#30D158";
  const WARN = "#FF9F0A";
  const DANGER = "#FF453A";

  function Section({ dark, title, children }) {
    return h("div", { className: "mb-8" }, h("h3", { className: cls(dark).heading, style: { letterSpacing: "-0.01em" } }, title), children);
  }

  function Group({ dark, children }) {
    const rows = [].concat(children).flat().filter(Boolean);
    return h(
      ui().Card,
      { isDarkMode: dark, className: "p-5" },
      rows.map((row, i) =>
        h("div", { key: i, style: i ? { borderTop: "1px solid " + cls(dark).divider, marginTop: 16, paddingTop: 16 } : undefined }, row),
      ),
    );
  }

  function Row({ dark, icon, lead, title, desc, children }) {
    const c = cls(dark);
    return h(
      "div",
      { className: "flex items-center justify-between gap-4" },
      h(
        "div",
        { className: "flex items-center gap-2 min-w-0 pr-6" },
        lead || (icon && h(icon, { className: c.icon })),
        h("div", { className: "min-w-0" }, h("h3", { className: c.title }, title), desc && h("p", { className: c.desc }, desc)),
      ),
      h("div", { className: "flex items-center gap-2 flex-shrink-0" }, children),
    );
  }

  function Btn({ dark, variant = "secondary", onClick, disabled, busy, children }) {
    const { Loader2 } = ui().icons;
    return h(
      ui().Button,
      { variant, size: "sm", isDarkMode: dark, onClick, disabled: disabled || busy, className: "!rounded-lg px-3 py-1 h-8 whitespace-nowrap" },
      busy ? h(Loader2, { className: "w-3.5 h-3.5 animate-spin" }) : children,
    );
  }

  function Status({ color, children }) {
    return h(
      "span",
      { className: "text-xs font-medium flex items-center gap-1.5 whitespace-nowrap", style: { color } },
      h("span", { style: { width: 6, height: 6, borderRadius: 3, background: color, display: "inline-block" } }),
      children,
    );
  }

  function Segmented({ dark, value, options, onChange, disabled }) {
    return h(
      "div",
      {
        className: "flex items-center",
        role: "radiogroup",
        style: { padding: 3, gap: 2, borderRadius: 10, background: dark ? "var(--dark-segment-track, rgba(255,255,255,0.06))" : "rgba(0,0,0,0.05)" },
      },
      options.map((o) => {
        const on = o.value === value;
        return h(
          "button",
          {
            key: o.value,
            type: "button",
            role: "radio",
            "aria-checked": on,
            disabled,
            onClick: () => !on && onChange(o.value),
            className: "text-xs px-3 whitespace-nowrap transition-colors duration-150",
            style: {
              height: 26,
              borderRadius: 8,
              fontWeight: on ? 600 : 500,
              cursor: on ? "default" : "pointer",
              color: on ? (dark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)") : dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
              background: on ? (dark ? "rgba(255,255,255,0.12)" : "#fff") : "transparent",
              boxShadow: on && !dark ? "0 1px 2px rgba(0,0,0,0.12)" : "none",
            },
          },
          o.label,
        );
      }),
    );
  }

  function Progress({ dark, download, onCancel }) {
    const pct = download.total ? Math.min(100, Math.round((download.received / download.total) * 100)) : 0;
    return h(
      "div",
      { className: "flex items-center gap-3" },
      h(
        "div",
        { style: { width: 120, height: 5, borderRadius: 3, overflow: "hidden", background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" } },
        h("div", { style: { width: pct + "%", height: "100%", background: "#0A84FF", transition: "width .25s ease" } }),
      ),
      h("span", { className: "text-xs tabular-nums", style: { color: cls(dark).muted, minWidth: 32 } }, pct + "%"),
      onCancel && h(Btn, { dark, variant: "ghost", onClick: onCancel }, "Cancel"),
    );
  }

  function ErrorNote({ error, name }) {
    if (!error || (name && error.name !== name)) return null;
    return h("p", { className: "text-xs mt-3", style: { color: DANGER } }, error.message);
  }

  const mb = (bytes) => (bytes >= 1e9 ? (bytes / 1e9).toFixed(1) + " GB" : Math.round(bytes / 1e6) + " MB");
  const shortLabel = (label) => String(label).split(" — ")[0];

  // ---------------------------------------------------------- Claude tab

  function ClaudeTab({ isDarkMode: dark }) {
    const { useState } = ui().React;
    const [state, setState] = useVoiceOS();
    const { busy, error, run } = useActions(setState);
    const [test, setTest] = useState(null);
    const [key, setKey] = useState("");
    const { Terminal, LogIn, CheckCircle, Brain, Zap, Lock, RefreshCw } = ui().icons;
    if (!state) return null;
    const c = cls(dark);
    const { claude, assistant } = state;
    const usingApi = assistant.active?.engine === "apikey";

    let account;
    if (!claude.installed)
      account = h(
        Row,
        { dark, icon: Terminal, title: "Install Claude Code", desc: "PlutoBar uses your Claude plan through Claude Code, Anthropic's official app. Install it, then come back here." },
        h(Btn, { dark, variant: "ghost", onClick: () => run("refresh", "voiceos:claude-refresh"), busy: busy === "refresh" }, "Check again"),
        h(Btn, { dark, variant: "primary", onClick: () => openExternal("https://code.claude.com/docs/en/setup") }, "Install"),
      );
    else if (!claude.signedIn)
      account = h(
        Row,
        { dark, icon: LogIn, title: "Sign in to Claude", desc: "Opens Anthropic's sign-in page in your browser. Works with Pro and Max plans. PlutoBar never sees your password or tokens." },
        h(Btn, { dark, variant: "primary", onClick: () => run("signin", "voiceos:claude-sign-in"), busy: busy === "signin" }, busy === "signin" ? "Waiting…" : "Sign in"),
      );
    else {
      const initial = (claude.email || "C").charAt(0).toUpperCase();
      account = h(
        Row,
        {
          dark,
          lead: h(
            "div",
            { className: "flex-shrink-0 mr-1", style: { width: 28, height: 28, borderRadius: 14, display: "grid", placeItems: "center", background: "#D97757", color: "#fff", fontSize: 13, fontWeight: 600 } },
            initial,
          ),
          title: claude.email || "Your Claude account",
          desc: "Claude " + (claude.plan ? claude.plan.charAt(0).toUpperCase() + claude.plan.slice(1) + " plan" : "account") + " · signed in with Claude Code",
        },
        usingApi ? h(Status, { color: c.muted }, "Not in use") : h(Status, { color: OK }, "Connected"),
      );
    }

    const runTest = async () => {
      setTest(null);
      const res = await run("test", "voiceos:claude-test");
      if (res?.ok) setTest((res.latencyMs / 1000).toFixed(1) + " s — “" + res.reply.slice(0, 60) + "”");
    };

    const modelOptions = (usingApi ? state.apiModels : state.claudeModels).map((m) => ({ value: m.id, label: shortLabel(m.label).replace(/ \d.*$/, "") }));
    const quickOptions = modelOptions.filter((o) => /haiku|sonnet/i.test(o.value));
    const modelKey = usingApi ? "assistant.apiModel" : "assistant.model";
    const fastKey = usingApi ? "assistant.apiFastModel" : "assistant.fastModel";

    return h(
      "div",
      null,
      h(
        Section,
        { dark, title: "Account" },
        h(Group, { dark }, [
          account,
          assistant.active &&
            h(
              Row,
              { dark, icon: CheckCircle, title: "Test connection", desc: test ? "Replied in " + test : "Sends Claude a one-line message." },
              h(Btn, { dark, onClick: runTest, busy: busy === "test" }, "Test"),
            ),
        ]),
        h(ErrorNote, { error }),
      ),
      h(
        Section,
        { dark, title: "Models" },
        h(Group, { dark }, [
          h(
            Row,
            { dark, icon: Brain, title: "Agent", desc: "Answers you and uses your Mac's tools. Haiku is quickest; Sonnet and Opus are smarter." },
            h(Segmented, { dark, value: assistant[usingApi ? "apiModel" : "model"], options: modelOptions, onChange: (v) => run("model", "voiceos:set", { key: modelKey, value: v }) }),
          ),
          h(
            Row,
            { dark, icon: Zap, title: "Quick tasks", desc: "Polished dictation, Write and Edit modes, conversation titles." },
            h(Segmented, { dark, value: assistant[usingApi ? "apiFastModel" : "fastModel"], options: quickOptions, onChange: (v) => run("fast", "voiceos:set", { key: fastKey, value: v }) }),
          ),
        ]),
      ),
      h(
        Section,
        { dark, title: "API key" },
        h(Group, { dark }, [
          state.apiKey
            ? h(
                Row,
                { dark, icon: Lock, title: "Anthropic API key", desc: state.apiKey.fromEnv ? "Read from ANTHROPIC_API_KEY." : "Saved, encrypted with your Keychain. Billed to your Claude Console account." },
                !state.apiKey.fromEnv && h(Btn, { dark, variant: "ghost", onClick: () => run("clear", "voiceos:clear-api-key"), busy: busy === "clear" }, "Remove"),
              )
            : h(
                "div",
                null,
                h(Row, { dark, icon: Lock, title: "Anthropic API key (optional)", desc: "Use pay-as-you-go API billing instead of your Claude plan. Stored encrypted in your Keychain." }),
                h(
                  "div",
                  { className: "flex items-center gap-2 mt-3" },
                  h("input", {
                    type: "password",
                    value: key,
                    placeholder: "sk-ant-…",
                    spellCheck: false,
                    onChange: (e) => setKey(e.target.value),
                    className: "flex-1 min-w-0 text-sm px-3 rounded-lg outline-none",
                    style: {
                      height: 32,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                      border: "1px solid " + (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                      color: dark ? "#f2f2f4" : "#1c1c1e",
                    },
                  }),
                  h(
                    Btn,
                    { dark, variant: "primary", disabled: !key.trim(), busy: busy === "key", onClick: () => run("key", "voiceos:save-api-key", { key }).then((r) => r?.ok && setKey("")) },
                    "Save",
                  ),
                ),
              ),
          state.apiKey &&
            claude.signedIn &&
            h(
              Row,
              { dark, icon: RefreshCw, title: "Use for requests", desc: "Choose which one PlutoBar uses. The other stays as a fallback." },
              h(Segmented, {
                dark,
                value: usingApi ? "apikey" : "subscription",
                options: [
                  { value: "subscription", label: "Claude plan" },
                  { value: "apikey", label: "API key" },
                ],
                onChange: (v) => run("engine", "voiceos:set", { key: "assistant.engine", value: v }),
              }),
            ),
        ]),
        h(ErrorNote, { error, name: "key" }),
        h(ErrorNote, { error, name: "clear" }),
      ),
    );
  }

  // ---------------------------------------------------------- Speech tab

  function SpeechTab({ isDarkMode: dark }) {
    const [state, setState] = useVoiceOS({ pollMs: 3000 });
    const { busy, error, run } = useActions(setState);
    const { AudioLines, Volume2, Mic, Shield, Trash2 } = ui().icons;
    if (!state) return null;
    const c = cls(dark);
    const { engines, permissions, voice } = state;
    const current = state.speech.whisperModel;

    const modelRow = (m) => {
      const selected = m.id === current;
      const dl = selected ? engines.whisper.download : null;
      let right;
      if (dl && !dl.error) right = h(Progress, { dark, download: dl, onCancel: () => run("cancel", "voiceos:cancel-download", { key: "whisper" }) });
      else if (m.ready && selected) right = h(Status, { color: engines.whisper.running ? OK : c.muted }, engines.whisper.running ? "In use" : "Starting…");
      else if (m.ready)
        right = [
          h(Btn, { key: "del", dark, variant: "ghost", onClick: () => run("del-" + m.id, "voiceos:delete-whisper", { id: m.id }), busy: busy === "del-" + m.id }, h(Trash2, { className: "w-3.5 h-3.5" })),
          h(Btn, { key: "use", dark, onClick: () => run("use-" + m.id, "voiceos:set", { key: "speech.whisperModel", value: m.id }) }, "Use"),
        ];
      else
        right = h(
          Btn,
          {
            dark,
            variant: selected ? "primary" : "secondary",
            busy: busy === "dl-" + m.id,
            onClick: async () => {
              await run("use-" + m.id, "voiceos:set", { key: "speech.whisperModel", value: m.id });
              run("dl-" + m.id, "voiceos:download-whisper", { id: m.id });
            },
          },
          "Download · " + mb(m.bytes),
        );
      return h(Row, { dark, icon: AudioLines, title: m.label, desc: m.detail + (dl?.error ? " — " + dl.error : "") }, right);
    };

    const vdl = engines.voice.download;
    const voiceRight =
      vdl && !vdl.error
        ? h(Progress, { dark, download: vdl })
        : engines.voice.downloaded
          ? h(Status, { color: engines.voice.ready ? OK : c.muted }, engines.voice.ready ? "Ready" : engines.voice.loading ? "Loading…" : "Loads on first reply")
          : h(Btn, { dark, variant: "primary", onClick: () => run("voice", "voiceos:download-voice"), busy: busy === "voice" }, "Download · 160 MB");

    const perm = (granted, action, label) => (granted ? h(Status, { color: OK }, "Allowed") : h(Btn, { dark, variant: "primary", onClick: action, busy: busy === label }, label === "mic" ? "Allow" : "Open Settings"));

    return h(
      "div",
      null,
      h(
        Section,
        { dark, title: "Speech recognition" },
        h("p", { className: c.desc + " -mt-2 mb-4" }, "Whisper runs on your Mac's GPU. Nothing you say leaves this computer."),
        h(Group, { dark }, state.whisperModels.map(modelRow)),
        h(ErrorNote, { error }),
      ),
      h(
        Section,
        { dark, title: "Spoken replies" },
        h(Group, { dark }, [
          h(
            Row,
            {
              dark,
              icon: Volume2,
              title: "Kokoro voice",
              desc: voice.enabled
                ? "Reads Claude's replies aloud, on-device. Choose the voice and speed on the Agent page."
                : "Agent voice is off. Turn it on from the Agent page.",
            },
            voiceRight,
          ),
        ]),
      ),
      h(
        Section,
        { dark, title: "Permissions" },
        h(Group, { dark }, [
          h(Row, { dark, icon: Mic, title: "Microphone", desc: "Hears you while you hold a shortcut." }, perm(permissions.microphone === "granted", () => run("mic", "voiceos:request-microphone"), "mic")),
          h(
            Row,
            { dark, icon: Shield, title: "Accessibility", desc: "Types text into apps and listens for your shortcuts." },
            perm(permissions.accessibility === "granted", () => run("ax", "voiceos:request-accessibility"), "ax"),
          ),
        ]),
        !permissions.packaged &&
          h(
            "p",
            { className: "text-xs mt-3", style: { color: WARN } },
            "This is the development build (“Electron”), which macOS doesn't grant reliably. Run npm run app for the signed PlutoBar app.",
          ),
      ),
    );
  }

  // -------------------------------------------------------- PlutoBar tab

  const SHORTCUTS = [
    ["Command+Space", "⌘ Space (like Spotlight)"],
    ["Alt+Space", "⌥ Space"],
    ["Control+Alt+Space", "⌃⌥ Space"],
    ["Command+Shift+Space", "⇧⌘ Space"],
  ];

  function PlutoBarTab({ isDarkMode: dark }) {
    const [state, setState] = useVoiceOS();
    const { busy, error, run } = useActions(setState);
    const { Sparkles, Zap, ExternalLink, Shield } = ui().icons;
    if (!state?.plutobar) return null;
    const c = cls(dark);
    const p = state.plutobar;
    const label = (SHORTCUTS.find(([k]) => k === p.shortcut) || [p.shortcut, p.shortcut])[1];
    const set = (name, patch) => run(name, "voiceos:set-plutobar", patch);

    return h(
      "div",
      null,
      h(
        Section,
        { dark, title: "PlutoBar" },
        h(
          "p",
          { className: c.desc + " -mt-2 mb-4" },
          "Press the shortcut anywhere and type or say what you want, like Spotlight with Siri. PlutoBar finds apps, actions, your Shortcuts, clipboard history and your files by what's in them, does sums and opens websites, and hands everything else to Pluto (Claude with your Mac's tools), which answers right under the bar. Return on Ask Pluto, or on any request, starts a conversation; keep typing for follow-ups. ⌘1–⌘4 browse Applications, Files, Actions and Clipboard.",
        ),
        h(Group, { dark }, [
          h(
            Row,
            {
              dark,
              key: "on",
              icon: Sparkles,
              title: "PlutoBar",
              desc: !p.available ? "Not built. Run npm run build:plutobar." : p.active ? "On: Pluto listens, works and answers in the bar." : "Off: Pluto answers in PlutoBar's classic overlay.",
            },
            p.available && p.active && h(Btn, { dark, variant: "ghost", busy: busy === "show", onClick: () => run("show", "voiceos:plutobar-show") }, "Open"),
            p.available && p.active && h(Btn, { dark, variant: "ghost", busy: busy === "setup", onClick: () => run("setup", "voiceos:plutobar-setup") }, "Run Setup"),
            p.available && h(Btn, { dark, variant: p.enabled ? "secondary" : "primary", busy: busy === "toggle", onClick: () => set("toggle", { enabled: !p.enabled }) }, p.enabled ? "Turn Off" : "Turn On"),
          ),
          h(
            Row,
            {
              dark,
              key: "shortcut",
              icon: Zap,
              title: "Shortcut",
              desc: p.active && !p.shortcutOk ? label + " is taken by another app: pick another." : p.spotlightConflict ? "Spotlight still answers ⌘ Space. Turn its shortcut off so PlutoBar gets it." : "Opens and closes PlutoBar from any app. Holding your voice shortcut still talks to Pluto.",
            },
            p.spotlightConflict && h(Btn, { dark, variant: "primary", busy: busy === "spotlight", onClick: () => run("spotlight", "voiceos:free-command-space") }, "Turn Off Spotlight's ⌘ Space"),
            h(
              "select",
              {
                value: p.shortcut,
                disabled: !p.active || busy === "shortcut",
                onChange: (e) => set("shortcut", { shortcut: e.target.value }),
                className: "text-sm rounded-lg px-2 py-1 h-8 " + (dark ? "bg-white/10 text-gray-100" : "bg-black/5 text-gray-900"),
              },
              SHORTCUTS.map(([value, text]) => h("option", { key: value, value }, text)),
            ),
          ),
          h(
            Row,
            {
              dark,
              key: "files",
              icon: ExternalLink,
              title: "Folders to search",
              desc: !p.files.roots.length
                ? "None yet. PlutoBar finds photos by what they show, PDFs at the page, recordings and videos at the moment, all on this Mac."
                : p.files.roots.length + (p.files.roots.length === 1 ? " folder" : " folders") +
                  (p.files.codeRoots.length ? " + " + p.files.codeRoots.length + " for code" : "") + " · " +
                  (p.files.model === "downloading" ? "getting the search model…" : p.files.pending ? p.files.searchable.toLocaleString() + " files searchable, " + p.files.pending.toLocaleString() + " still being read" : p.files.searchable.toLocaleString() + " files searchable"),
            },
            h(Btn, { dark, busy: busy === "folders", onClick: () => run("folders", "voiceos:choose-folders") }, "Choose Folders"),
          ),
          h(
            Row,
            { dark, key: "clip", icon: Shield, title: "Clipboard history", desc: "What you copied in the last 8 hours (⌘4), kept in memory only. Password managers' copies are never kept." },
            h(Btn, { dark, variant: "secondary", busy: busy === "clip", onClick: () => set("clip", { clipboard: !p.clipboard }) }, p.clipboard ? "Turn Off" : "Turn On"),
          ),
        ]),
        h(ErrorNote, { error }),
      ),
    );
  }

  // ----------------------------------------------------- Dashboard card

  function SetupCard({ isDarkMode: dark }) {
    const [state, setState] = useVoiceOS({ pollMs: 2000 });
    const { busy, error, run } = useActions(setState);
    const { AudioLines, Volume2, Mic, Shield, Terminal, LogIn, Check } = ui().icons;
    if (!state) return null;
    const { setup, engines, claude } = state;
    if (Object.values(setup).every(Boolean)) return null;
    const c = cls(dark);
    const whisperModel = state.whisperModels.find((m) => m.id === state.speech.whisperModel);

    const step = ({ done, icon, title, desc, action }) =>
      h(
        "div",
        { className: "flex flex-wrap items-center gap-3.5 py-3.5" },
        h(
          "div",
          { className: "flex min-w-0 flex-1 basis-[180px] items-center gap-3.5", style: { opacity: done ? 0.55 : 1 } },
          h(
            "div",
            { className: "liquid-glass-badge shrink-0 " + (dark ? "liquid-glass-badge--dark" : "liquid-glass-badge--light") },
            h("span", { className: "liquid-glass-badge__icon" }, h(done ? Check : icon, { className: "w-5 h-5", style: done ? { color: OK } : undefined })),
          ),
          h(
            "div",
            { className: "min-w-0" },
            h("h4", { className: "text-[15px] font-semibold " + (dark ? "text-gray-100" : "text-gray-900"), style: { letterSpacing: "-0.01em" } }, title),
            h("p", { className: c.desc }, desc),
          ),
        ),
        !done && action,
      );

    const download = (key, label, bytes, channel) => {
      const dl = engines[key].download;
      return dl && !dl.error ? h(Progress, { dark, download: dl }) : h(Btn, { dark, variant: "ghost", onClick: () => run(key, channel), busy: busy === key }, "Download · " + mb(bytes));
    };

    const steps = [
      {
        done: setup.speech,
        icon: AudioLines,
        title: "Speech recognition",
        desc: "Downloads Whisper once, so dictation runs on your Mac.",
        action: download("whisper", "Whisper", whisperModel?.bytes || 574e6, "voiceos:download-speech"),
      },
      !state.voice.enabled
        ? null
        : { done: setup.voice, icon: Volume2, title: "Reply voice", desc: "Downloads the Kokoro voice so Claude can answer out loud.", action: download("voice", "Voice", 160e6, "voiceos:download-voice") },
      !claude.installed
        ? {
            done: false,
            icon: Terminal,
            title: "Connect Claude",
            desc: "Install Claude Code, Anthropic's app. PlutoBar uses your Claude plan through it.",
            action: h(
              "div",
              { className: "flex gap-2" },
              h(Btn, { dark, variant: "ghost", onClick: () => run("refresh", "voiceos:claude-refresh"), busy: busy === "refresh" }, "Check again"),
              h(Btn, { dark, variant: "ghost", onClick: () => openExternal("https://code.claude.com/docs/en/setup") }, "Install"),
            ),
          }
        : {
            done: setup.claude,
            icon: LogIn,
            title: setup.claude ? "Claude connected" + (claude.email ? " · " + claude.email : "") : "Connect Claude",
            desc: "Sign in with your Claude account (Pro or Max) on Anthropic's page.",
            action: h(Btn, { dark, variant: "ghost", onClick: () => run("signin", "voiceos:claude-sign-in"), busy: busy === "signin" }, busy === "signin" ? "Waiting…" : "Sign in"),
          },
      {
        done: setup.microphone,
        icon: Mic,
        title: "Microphone",
        desc: "Lets PlutoBar hear you while you hold a shortcut.",
        action: h(Btn, { dark, variant: "ghost", onClick: () => run("mic", "voiceos:request-microphone"), busy: busy === "mic" }, "Allow"),
      },
      {
        done: setup.accessibility,
        icon: Shield,
        title: "Accessibility",
        desc: "Lets PlutoBar type into apps and hear your shortcuts. Switch on “" + (state.permissions.packaged ? "PlutoBar" : "Electron") + "”.",
        action: h(Btn, { dark, variant: "ghost", onClick: () => run("ax", "voiceos:request-accessibility") }, "Open Settings"),
      },
    ].filter(Boolean);

    const left = steps.filter((s) => !s.done).length;
    return h(
      "div",
      { className: "pb-6" },
      h(
        "div",
        { className: "flex items-baseline justify-between mb-2" },
        h("h3", { className: "text-base font-bold " + (dark ? "text-gray-100" : "text-gray-900"), style: { letterSpacing: "-0.01em" } }, "Finish setting up"),
        h("span", { className: "text-xs", style: { color: c.muted } }, left + (left === 1 ? " step" : " steps") + " left"),
      ),
      h(
        ui().Card,
        { isDarkMode: dark, className: "px-4" },
        steps.map((s, i) => h("div", { key: i, style: i ? { borderTop: "1px solid " + c.divider } : undefined }, step(s))),
      ),
      h(ErrorNote, { error }),
    );
  }

  window.VoiceOSLocalUI = { SetupCard, ClaudeTab, SpeechTab, PlutoBarTab };
})();
