"use strict";
// X (Twitter) without an API key or the user's password.
//   Reading goes through the public FxTwitter API (api.fxtwitter.com):
//   search (X search operators work), a user's latest posts, a profile, a post.
//   Writing opens X in the browser with the post, reply, quote or DM filled
//   in; the user presses Post/Send there, so nothing is published unseen.
// Results also come back as the notch's X card (TwitterReadCard).

const API = "https://api.fxtwitter.com";
const MAX_POSTS = 10;

async function getJson(path, signal) {
  const res = await fetch(API + path, { signal, headers: { "User-Agent": "VoiceOS" } });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || (body.code && body.code !== 200)) {
    if (res.status === 404 || body?.code === 404) throw new Error("Not found on X (the account may not exist, be private or suspended).");
    throw new Error("X returned " + (body?.message || res.status));
  }
  return body;
}

const handle = (s) => String(s || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").split(/[/?#]/)[0];
const postId = (s) => String(s || "").match(/(\d{5,})/)?.[1] || null;

function media(all = []) {
  return all.slice(0, 4).map((m) => {
    const mp4 = (m.formats || []).filter((f) => f.container === "mp4" || /\.mp4/.test(f.url || "")).sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));
    const type = m.type === "gif" ? "animated_gif" : m.type;
    return type === "photo"
      ? { media_key: m.id || m.url, type, url: m.url, alt_text: m.altText || m.alt_text }
      : { media_key: m.id || m.url, type, preview_image_url: m.thumbnail_url, playback_url: mp4[Math.min(1, mp4.length - 1)]?.url || m.url };
  });
}

// FxTwitter status → the card's post shape.
function toPost(s) {
  const a = s.author || {};
  const v = a.verification || {};
  return {
    id: s.id,
    text: s.text || "",
    created_at: s.created_timestamp ? new Date(s.created_timestamp * 1000).toISOString() : s.created_at,
    author_name: a.name,
    author_username: a.screen_name,
    author_avatar_url: a.avatar_url,
    author_verified: !!v.verified,
    author_verified_type: v.verified ? v.type || "blue" : undefined,
    media: media(s.media?.all),
    ...(s.reposted_by ? { is_repost: true, reposted_by_name: s.reposted_by.name, reposted_by_username: s.reposted_by.screen_name } : {}),
  };
}

// What Claude reads: compact, no media URLs.
function summarize(s) {
  return {
    id: s.id,
    author: "@" + s.author?.screen_name + (s.author?.name ? " (" + s.author.name + ")" : ""),
    ...(s.reposted_by ? { reposted_by: "@" + s.reposted_by.screen_name } : {}),
    date: s.created_at,
    text: s.text,
    ...(s.quote ? { quoting: "@" + s.quote.author?.screen_name + ": " + s.quote.text } : {}),
    ...(s.media?.all?.length ? { media: s.media.all.map((m) => m.type).join(", ") } : {}),
    likes: s.likes,
    reposts: s.reposts,
    replies: s.replies,
    views: s.views,
    url: s.url,
  };
}

function toUser(u) {
  return {
    id: u.id,
    name: u.name,
    username: u.screen_name,
    description: u.description,
    avatar_url: u.avatar_url?.replace("_normal.", "_200x200."),
    verified: !!u.verification?.verified,
    verified_type: u.verification?.type,
    followers_count: u.followers,
    created_at: u.joined,
  };
}

const card = (action, data, webUrl) =>
  JSON.stringify({ kind: "agent_ui", blocks: [{ type: "divider" }], legacy: { action, successful: true, data, ...(webUrl ? { web_url: webUrl } : {}) } });

const reply = (content, detail) => ({ content: JSON.stringify(content), ...(detail ? { detail } : {}) });

async function read(args, signal) {
  const count = Math.min(Math.max(Number(args.count) || 5, 1), MAX_POSTS);
  switch (args.action) {
    case "search": {
      if (!args.query) throw new Error("search needs a query");
      const j = await getJson("/2/search?count=" + count + "&q=" + encodeURIComponent(args.query) + (args.top ? "&feed=top" : ""), signal);
      const results = (j.results || []).slice(0, count);
      if (!results.length) return reply({ results: [], note: "No posts found." });
      return reply({ results: results.map(summarize) }, card("TWITTER_RECENT_SEARCH", { kind: "posts", posts: results.map(toPost) }, "https://x.com/search?q=" + encodeURIComponent(args.query)));
    }
    case "user_posts": {
      const user = handle(args.username);
      if (!user) throw new Error("user_posts needs a username");
      const j = await getJson("/2/profile/" + encodeURIComponent(user) + "/statuses", signal);
      const results = (j.results || []).filter((s) => args.include_reposts || !s.reposted_by).slice(0, count);
      return reply({ results: results.map(summarize) }, results.length ? card("TWITTER_USER_POSTS", { kind: "posts", posts: results.map(toPost) }, "https://x.com/" + user) : null);
    }
    case "profile": {
      const user = handle(args.username);
      if (!user) throw new Error("profile needs a username");
      const u = (await getJson("/" + encodeURIComponent(user), signal)).user;
      const info = { name: u.name, username: "@" + u.screen_name, bio: u.description, location: u.location, website: u.website?.url, followers: u.followers, following: u.following, posts: u.tweets, joined: u.joined, verified: !!u.verification?.verified, url: u.url };
      return reply(info, card("TWITTER_USER_LOOKUP_BY_USERNAME", { kind: "user", user: toUser(u) }, u.url));
    }
    case "get_post": {
      const id = postId(args.post);
      if (!id) throw new Error("get_post needs a post id or URL");
      const s = (await getJson("/2/status/" + id, signal)).status;
      return reply(summarize(s), card("TWITTER_POST_LOOKUP", { kind: "posts", posts: [toPost(s)] }, s.url));
    }
  }
  return null;
}

// Opens X with everything filled in. Returns the URL it opened.
async function compose(args, signal) {
  const text = String(args.text || "");
  const q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString();
  const id = postId(args.post);
  switch (args.action) {
    case "post":
      if (!text) throw new Error("post needs text");
      return "https://x.com/intent/post?" + q({ text });
    case "reply":
      if (!id) throw new Error("reply needs the post id or URL");
      return "https://x.com/intent/post?" + q({ in_reply_to: id, text });
    case "quote":
      if (!id) throw new Error("quote needs the post id or URL");
      return "https://x.com/intent/post?" + q({ text, url: "https://x.com/i/status/" + id });
    case "repost":
      if (!id) throw new Error("repost needs the post id or URL");
      return "https://x.com/intent/retweet?tweet_id=" + id;
    case "like":
      if (!id) throw new Error("like needs the post id or URL");
      return "https://x.com/intent/like?tweet_id=" + id;
    case "dm": {
      const user = handle(args.username);
      if (!user) throw new Error("dm needs a username");
      const u = (await getJson("/" + encodeURIComponent(user), signal)).user;
      return "https://x.com/messages/compose?" + q({ recipient_id: u.id, text });
    }
    case "open":
      if (id) return "https://x.com/i/status/" + id;
      if (args.username) return "https://x.com/" + handle(args.username);
      if (args.query) return "https://x.com/search?" + q({ q: args.query, f: args.top ? "top" : "live" });
      return "https://x.com/home";
  }
  throw new Error("Unknown action: " + args.action);
}

const TOOL = {
  name: "x_twitter",
  label: "Checking X",
  description:
    "X (Twitter). Read public posts: search (X operators work: from:user, to:user, since:YYYY-MM-DD, until:, lang:en, min_faves:100, filter:media, -filter:replies; set top=true for popular instead of latest), user_posts (someone's latest posts), profile, get_post. Results are shown to the user as a card, so answer briefly. " +
    "Write: post, reply, quote, repost, like, dm open X in the browser with it filled in; the user presses Post/Send there themselves, so say it's ready for them to send. open shows a profile, post, search or the home feed in the browser. " +
    "The user's own home feed, notifications and DMs can't be read here; use open, then mac_look if needed.",
  schema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["search", "user_posts", "profile", "get_post", "post", "reply", "quote", "repost", "like", "dm", "open"] },
      query: { type: "string", description: "search / open: search text with optional operators." },
      username: { type: "string", description: "Handle without @, for user_posts, profile, dm, open." },
      post: { type: "string", description: "Post id or x.com URL, for get_post, reply, quote, repost, like, open." },
      text: { type: "string", description: "Text for post, reply, quote or dm." },
      count: { type: "integer", description: "How many posts to read, 1-10 (default 5)." },
      top: { type: "boolean", description: "search: popular posts instead of latest." },
      include_reposts: { type: "boolean", description: "user_posts: include reposts (default false)." },
    },
    required: ["action"],
  },
};

async function run(args = {}, { openUrl, signal } = {}) {
  const res = await read(args, signal);
  if (res) return res;
  const url = await compose(args, signal);
  await openUrl(url);
  const verb = { post: "post", reply: "reply", quote: "quote post", repost: "repost", like: "like", dm: "message" }[args.action];
  return reply(verb ? { ok: true, opened: url, note: "X is open with the " + verb + " ready. The user presses " + (args.action === "dm" ? "Send" : args.action === "like" ? "Like" : args.action === "repost" ? "Repost" : "Post") + " to publish it; it isn't sent yet." } : { ok: true, opened: url });
}

module.exports = { TOOL, run };
