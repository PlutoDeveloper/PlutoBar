"use strict";
// Settings you can open from the bar, like Spotlight: System Settings' panes
// (and the privacy pages inside Privacy & Security) and PlutoBar's own panes.
// "privacy settings", "wifi", "battery", "pluto voice"…

const electron = require("electron");

const SYSTEM_SETTINGS = "/System/Applications/System Settings.app";
const url = (id, anchor) => "x-apple.systempreferences:" + id + (anchor ? "?" + anchor : "");

// [title, url, words]
const SYSTEM = [
  ["Wi-Fi", url("com.apple.wifi-settings-extension"), "wifi wireless network internet"],
  ["Bluetooth", url("com.apple.BluetoothSettings"), "bluetooth airpods headphones devices"],
  ["Network", url("com.apple.Network-Settings.extension"), "network ethernet vpn proxy dns internet"],
  ["VPN", url("com.apple.NetworkExtensionSettingsUI.NESettingsUIExtension"), "vpn"],
  ["Battery", url("com.apple.Battery-Settings.extension"), "battery power energy low power mode charging"],
  ["General", url("com.apple.systempreferences.GeneralSettings"), "general"],
  ["About This Mac", url("com.apple.SystemProfiler.AboutExtension"), "about mac serial storage version"],
  ["Software Update", url("com.apple.Software-Update-Settings.extension"), "software update upgrade macos version"],
  ["Storage", url("com.apple.settings.Storage"), "storage disk space"],
  ["AirDrop & Handoff", url("com.apple.AirDrop-Handoff-Settings.extension"), "airdrop handoff continuity"],
  ["Login Items & Extensions", url("com.apple.LoginItems-Settings.extension"), "login items startup extensions open at login"],
  ["Language & Region", url("com.apple.Localization-Settings.extension"), "language region locale"],
  ["Date & Time", url("com.apple.Date-Time-Settings.extension"), "date time clock timezone"],
  ["Sharing", url("com.apple.Sharing-Settings.extension"), "sharing screen sharing file sharing remote"],
  ["Time Machine", url("com.apple.Time-Machine-Settings.extension"), "time machine backup"],
  ["Startup Disk", url("com.apple.Startup-Disk-Settings.extension"), "startup disk boot"],
  ["Appearance", url("com.apple.Appearance-Settings.extension"), "appearance dark mode light mode accent color theme"],
  ["Accessibility", url("com.apple.Accessibility-Settings.extension"), "accessibility voiceover zoom display contrast"],
  ["Control Centre", url("com.apple.ControlCenter-Settings.extension"), "control center centre menu bar"],
  ["Siri & Spotlight", url("com.apple.Siri-Settings.extension"), "siri spotlight apple intelligence search"],
  ["Desktop & Dock", url("com.apple.Desktop-Settings.extension"), "desktop dock mission control stage manager hot corners"],
  ["Displays", url("com.apple.Displays-Settings.extension"), "display displays monitor resolution brightness night shift"],
  ["Wallpaper", url("com.apple.Wallpaper-Settings.extension"), "wallpaper background"],
  ["Screen Saver", url("com.apple.ScreenSaver-Settings.extension"), "screen saver"],
  ["Notifications", url("com.apple.Notifications-Settings.extension"), "notifications alerts banners"],
  ["Sound", url("com.apple.Sound-Settings.extension"), "sound volume audio output input alert"],
  ["Focus", url("com.apple.Focus-Settings.extension"), "focus do not disturb"],
  ["Screen Time", url("com.apple.Screen-Time-Settings.extension"), "screen time limits"],
  ["Lock Screen", url("com.apple.Lock-Screen-Settings.extension"), "lock screen sleep display off password after"],
  ["Privacy & Security", url("com.apple.settings.PrivacySecurity.extension"), "privacy security filevault firewall permissions gatekeeper"],
  ["Touch ID & Password", url("com.apple.Touch-ID-Settings.extension"), "touch id password fingerprint login"],
  ["Users & Groups", url("com.apple.Users-Groups-Settings.extension"), "users groups accounts guest"],
  ["Passwords", url("com.apple.Passwords-Settings.extension"), "passwords keychain"],
  ["Internet Accounts", url("com.apple.Internet-Accounts-Settings.extension"), "internet accounts mail google icloud"],
  ["Game Center", url("com.apple.Game-Center-Settings.extension"), "game center"],
  ["Wallet & Apple Pay", url("com.apple.WalletSettingsExtension"), "wallet apple pay cards"],
  ["Keyboard", url("com.apple.Keyboard-Settings.extension"), "keyboard shortcuts input sources dictation key repeat"],
  ["Mouse", url("com.apple.Mouse-Settings.extension"), "mouse scrolling pointer"],
  ["Trackpad", url("com.apple.Trackpad-Settings.extension"), "trackpad gestures tap to click scrolling"],
  ["Printers & Scanners", url("com.apple.Print-Scan-Settings.extension"), "printers scanners print"],
  ["Apple Account", url("com.apple.systempreferences.AppleIDSettings"), "apple id account icloud"],
  // Inside Privacy & Security.
  ["Microphone", url("com.apple.preference.security", "Privacy_Microphone"), "privacy microphone mic permission"],
  ["Camera", url("com.apple.preference.security", "Privacy_Camera"), "privacy camera webcam permission"],
  ["Location Services", url("com.apple.preference.security", "Privacy_LocationServices"), "privacy location gps permission"],
  ["Accessibility Access", url("com.apple.preference.security", "Privacy_Accessibility"), "privacy accessibility permission control apps"],
  ["Screen & System Audio Recording", url("com.apple.preference.security", "Privacy_ScreenCapture"), "privacy screen recording capture permission"],
  ["Full Disk Access", url("com.apple.preference.security", "Privacy_AllFiles"), "privacy full disk access permission files"],
  ["Files & Folders", url("com.apple.preference.security", "Privacy_FilesAndFolders"), "privacy files folders permission"],
  ["Automation", url("com.apple.preference.security", "Privacy_Automation"), "privacy automation apple events permission"],
  ["Contacts Access", url("com.apple.preference.security", "Privacy_Contacts"), "privacy contacts permission"],
  ["Calendars Access", url("com.apple.preference.security", "Privacy_Calendars"), "privacy calendar permission"],
  ["Photos Access", url("com.apple.preference.security", "Privacy_Photos"), "privacy photos permission"],
  ["Input Monitoring", url("com.apple.preference.security", "Privacy_ListenEvent"), "privacy input monitoring keyboard permission"],
  ["FileVault", url("com.apple.preference.security", "FileVault"), "filevault encryption disk"],
  ["Firewall", url("com.apple.Network-Settings.extension", "Firewall"), "firewall network security"],
];

// PlutoBar's own Settings panes (settingsWindow.js).
const PLUTO = [
  ["PlutoBar Settings", "general", "plutobar settings preferences shortcut dock login clipboard"],
  ["PlutoBar Search Settings", "search", "plutobar search folders index indexing files code"],
  ["Pluto Settings", "pluto", "pluto claude model api key voice assistant"],
  ["PlutoBar Apps & Actions", "apps", "plutobar apps connectors integrations actions"],
  ["PlutoBar Dictation & Speech", "dictation", "dictation speech whisper"],
  ["PlutoBar Privacy & Permissions", "permissions", "plutobar privacy permissions"],
];

// The words a query must cover: "privacy settings" → privacy (settings, system
// and preferences only make it lean towards settings).
const FILLER = new Set(["settings", "setting", "system", "preferences", "preference", "prefs", "open", "show", "the", "my", "pane", "page"]);

function score(q, title, words) {
  const t = title.toLowerCase();
  const all = (t + " " + words).split(/[\s&,]+/).filter(Boolean);
  const parts = q.split(/\s+/).filter((w) => w && !FILLER.has(w));
  const settingsy = q.split(/\s+/).some((w) => FILLER.has(w));
  if (!parts.length) return 0;
  if (t === parts.join(" ")) return 100;
  if (t.startsWith(q)) return 90;
  if (!parts.every((p) => all.some((w) => w.startsWith(p)))) return 0;
  const titleHit = parts.every((p) => t.split(/[\s&,]+/).some((w) => w.startsWith(p)));
  return (titleHit ? 70 : 50) + (settingsy ? 15 : 0);
}

function appBundle() {
  const exe = process.execPath;
  const i = exe.indexOf(".app/");
  return i > 0 ? exe.slice(0, i + 4) : SYSTEM_SETTINGS;
}

// Rows for a query: the best few, Spotlight-style ("System Settings" under each).
function match(query, limit = 3) {
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 3) return [];
  const rows = [];
  for (const [title, link, words] of SYSTEM) {
    const s = score(q, title, words);
    if (s) rows.push({ s, item: { id: "syspane:" + link, kind: "setting", title, subtitle: "System Settings", icon: { type: "file", path: SYSTEM_SETTINGS } } });
  }
  for (const [title, pane, words] of PLUTO) {
    const s = score(q, title, words);
    // PlutoBar's own panes come first only when you ask for them by name.
    if (s) rows.push({ s: s + (/pluto/.test(q) ? 20 : -5), item: { id: "plutopane:" + pane, kind: "setting", title, subtitle: "PlutoBar Settings", icon: { type: "file", path: appBundle() } } });
  }
  rows.sort((a, b) => b.s - a.s);
  return rows.slice(0, limit).map((r) => ({ ...r.item, score: r.s }));
}

function open(id, { openPlutoSettings }) {
  if (id.startsWith("syspane:")) return electron.shell.openExternal(id.slice("syspane:".length));
  if (id.startsWith("plutopane:")) return openPlutoSettings?.(id.slice("plutopane:".length));
}

module.exports = { match, open };
