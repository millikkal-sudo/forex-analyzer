/* Vercel serverless function — /api/candles
   Keeps the market-data key on the server. The browser never sees it.

   Environment variables (Project Settings -> Environment Variables):
     DATA_PROVIDER      "twelvedata" (default) or "tradermade"
     TWELVEDATA_API_KEY your key, if using Twelve Data
     TRADERMADE_API_KEY your key, if using TraderMade

   Query: /api/candles?symbol=XAU/USD&tf=1H&bars=500
   Returns: { candles: [{t,o,h,l,c,v}], provider, symbol, tf, fetchedAt }   */

const TF_MIN = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1H": 60, "4H": 240, Daily: 1440, Weekly: 10080 };
const TD_INTERVAL = { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1H": "1h", "4H": "4h", Daily: "1day", Weekly: "1week" };
const TM_INTERVAL = { "1m": ["minute", 1], "5m": ["minute", 5], "15m": ["minute", 15], "30m": ["minute", 30], "1H": ["hourly", 1], "4H": ["hourly", 4], Daily: ["daily", 1] };

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d, dateOnly) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
  (dateOnly ? "" : `-${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`);

const parseTime = (s) => {
  const str = String(s);
  return Date.parse(str.length <= 10 ? `${str}T00:00:00Z` : `${str.replace(" ", "T")}Z`);
};
const clean = (rows) =>
  rows
    .filter((r) => [r.o, r.h, r.l, r.c].every(Number.isFinite) && Number.isFinite(r.t))
    .sort((a, b) => a.t - b.t);

export default async function handler(req, res) {
  const symbol = String(req.query.symbol || "XAU/USD");
  const tf = String(req.query.tf || "1H");
  const bars = Math.min(Math.max(parseInt(req.query.bars, 10) || 500, 30), 5000);
  const provider = (process.env.DATA_PROVIDER || "twelvedata").toLowerCase();

  if (!TF_MIN[tf]) return res.status(400).json({ error: `Unsupported timeframe "${tf}".` });

  try {
    let candles;

    if (provider === "twelvedata") {
      const key = process.env.TWELVEDATA_API_KEY;
      if (!key) return res.status(500).json({ error: "TWELVEDATA_API_KEY is not set on the server. Add it in Vercel -> Settings -> Environment Variables, then redeploy." });
      const interval = TD_INTERVAL[tf];
      if (!interval) return res.status(400).json({ error: `Twelve Data has no ${tf} interval.` });
      // timezone=UTC is not optional: without it Twelve Data answers in the
      // exchange's own timezone and the "Z" appended below silently shifts
      // every candle by hours.
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${bars}&timezone=UTC&order=ASC&format=JSON&apikey=${encodeURIComponent(key)}`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.status === "error") return res.status(502).json({ error: j.message || `Provider error ${j.code}` });
      if (!Array.isArray(j.values)) return res.status(502).json({ error: "Provider returned no candle array." });
      candles = clean(j.values.map((v) => ({
        t: parseTime(v.datetime), o: +v.open, h: +v.high, l: +v.low, c: +v.close,
        v: v.volume == null ? null : +v.volume,
      })));
    } else if (provider === "tradermade") {
      const key = process.env.TRADERMADE_API_KEY;
      if (!key) return res.status(500).json({ error: "TRADERMADE_API_KEY is not set on the server." });
      const spec = TM_INTERVAL[tf];
      if (!spec) return res.status(400).json({ error: `TraderMade has no ${tf} interval.` });
      const [interval, period] = spec;
      const end = new Date();
      const start = new Date(end.getTime() - TF_MIN[tf] * bars * 60000 * (interval === "daily" ? 1.7 : 2.2));
      const dOnly = interval === "daily";
      const url = `https://marketdata.tradermade.com/api/v1/timeseries?currency=${encodeURIComponent(symbol.replace("/", ""))}&api_key=${encodeURIComponent(key)}&start_date=${stamp(start, dOnly)}&end_date=${stamp(end, dOnly)}&format=records&interval=${interval}&period=${period}`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.error) return res.status(502).json({ error: String(j.message || j.error) });
      if (!Array.isArray(j.quotes)) return res.status(502).json({ error: "Provider returned no quotes array." });
      candles = clean(j.quotes.map((v) => ({ t: parseTime(v.date), o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: null })));
    } else {
      return res.status(500).json({ error: `Unknown DATA_PROVIDER "${provider}". Use "twelvedata" or "tradermade".` });
    }

    if (candles.length < 30) return res.status(502).json({ error: `Only ${candles.length} usable candles came back. Ask for more bars, or pick a timeframe your plan covers.` });

    /* Freshness beats rate-limit thrift. The old rule cached for a tenth of a
       bar, which on 1H meant serving a six-minute-old snapshot and calling it
       live. Ten seconds absorbs a double-click without ever costing minutes.  */
    res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=20");

    /* The newest candle from any provider is the one still forming. Say so
       explicitly rather than leaving the client to guess from timestamps. */
    const barMs = TF_MIN[tf] * 60000;
    const serverNow = Date.now();
    const lastBarT = candles[candles.length - 1].t;
    const forming = lastBarT + barMs > serverNow;

    return res.status(200).json({
      candles, provider, symbol, tf,
      fetchedAt: serverNow, serverNow, lastBarT, barMs, forming,
      // how far behind the feed is, ignoring the bar that is legitimately open
      lagMs: Math.max(0, serverNow - (lastBarT + (forming ? 0 : barMs))),
    });
  } catch (e) {
    return res.status(502).json({ error: `Upstream request failed: ${e.message}` });
  }
}
