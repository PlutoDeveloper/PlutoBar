"use strict";
// Stock, index, crypto and currency quotes from Yahoo Finance's public chart
// API (no key), shown in the notch's native stock card (toolName
// "stock_quote").

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" };
const RANGES = { "1d": "5m", "5d": "30m", "1mo": "1d", "6mo": "1d", ytd: "1d", "1y": "1wk", "5y": "1mo" };

async function getJson(url, signal) {
  const res = await fetch(url, { signal, headers: UA });
  if (!res.ok) throw new Error("Yahoo Finance returned " + res.status);
  return res.json();
}

// "apple", "nvidia stock", "bitcoin", "AAPL", "^GSPC" → a Yahoo symbol.
async function resolveSymbol(query, signal) {
  const q = String(query || "").trim();
  if (!q) throw new Error("Pass a company name or ticker.");
  const j = await getJson("https://query1.finance.yahoo.com/v1/finance/search?quotesCount=5&newsCount=0&q=" + encodeURIComponent(q), signal);
  const quotes = (j.quotes || []).filter((x) => x.symbol && x.isYahooFinance !== false);
  const exact = quotes.find((x) => x.symbol.toUpperCase() === q.toUpperCase());
  const pick = exact || quotes.find((x) => x.quoteType === "EQUITY") || quotes[0];
  if (!pick) {
    if (/^[\^A-Z0-9.=-]{1,12}$/i.test(q)) return q.toUpperCase();
    throw new Error("Couldn't find a ticker for '" + q + "'.");
  }
  return pick.symbol;
}

const compact = (n) => (Number.isFinite(n) ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n) : undefined);
const round = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : undefined);

async function quote({ query, symbol, range = "1d" }, { signal } = {}) {
  const sym = symbol || (await resolveSymbol(query, signal));
  const r = RANGES[range] ? range : "1d";
  const j = await getJson("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?includePrePost=false&range=" + r + "&interval=" + RANGES[r], signal);
  const res = j.chart?.result?.[0];
  if (!res) throw new Error(j.chart?.error?.description || "No quote for " + sym);
  const m = res.meta;
  const q = res.indicators?.quote?.[0] || {};
  const times = res.timestamp || [];
  // Axis labels in the exchange's time zone: "10:30 AM" intraday, "Sep 12" otherwise.
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: m.exchangeTimezoneName || "UTC",
    ...(r === "1d" ? { hour: "numeric", minute: "2-digit" } : r === "5d" ? { weekday: "short", hour: "numeric" } : r === "5y" ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" }),
  });
  const chart = times.map((t, i) => ({ time: label.format(new Date(t * 1000)), price: q.close?.[i] })).filter((p) => Number.isFinite(p.price));
  const price = m.regularMarketPrice;
  const base = r === "1d" ? m.previousClose ?? m.chartPreviousClose : m.chartPreviousClose ?? chart[0]?.price;
  const change = price - base;
  const lows = (q.low || []).filter(Number.isFinite);
  const highs = (q.high || []).filter(Number.isFinite);
  return {
    ticker: m.symbol,
    name: m.longName || m.shortName || m.symbol,
    exchange: m.fullExchangeName || m.exchangeName,
    currency: m.currency,
    price: round(price, m.priceHint || 2),
    change: round(change, m.priceHint || 2),
    changePercent: round((change / base) * 100),
    range: r,
    previousClose: round(base, m.priceHint || 2),
    open: r === "1d" ? round(q.open?.find(Number.isFinite)) : undefined,
    high: round(r === "1d" ? m.regularMarketDayHigh : Math.max(...highs)),
    low: round(r === "1d" ? m.regularMarketDayLow : Math.min(...lows)),
    volume: r === "1d" ? compact(m.regularMarketVolume) : undefined,
    fiftyTwoWeekHigh: m.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: m.fiftyTwoWeekLow,
    marketTime: new Date(m.regularMarketTime * 1000).toISOString(),
    chart,
    dataSource: "Yahoo Finance",
    quotedAt: new Date(m.regularMarketTime * 1000).toISOString(),
  };
}

const TOOL = {
  name: "stock_quote",
  label: "Checking the markets",
  description:
    "Live price, change and chart for a stock, ETF, index (^GSPC, ^IXIC, ^STI), crypto (BTC-USD) or currency pair (USDSGD=X), by company name or ticker. Use for any share price, market or 'how is X doing' question. The user sees a stock card, so answer in a sentence.",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Company name or ticker, e.g. 'Apple', 'NVDA', 'bitcoin', 'S&P 500'." },
      range: { type: "string", enum: Object.keys(RANGES), description: "Chart period (default 1d)." },
    },
    required: ["query"],
  },
};

async function run(args = {}, { signal } = {}) {
  const q = await quote(args, { signal });
  const { chart, ...rest } = q;
  const sample = chart.filter((_, i) => i % Math.ceil(chart.length / 60 || 1) === 0 || i === chart.length - 1);
  return { content: JSON.stringify(rest), detail: JSON.stringify({ ...q, chart: sample }), toolName: "stock_quote" };
}

module.exports = { TOOL, run, quote };
