/* Vercel serverless function — /api/calendar
   Scheduled US economic releases. The key stays on the server, and the browser
   could not call these hosts directly anyway: none of them send CORS headers.

   Environment variables (Project Settings -> Environment Variables):
     CALENDAR_PROVIDER   "forexfactory" (default, NO KEY REQUIRED)
                         | "fred" | "fmp" | "tradingeconomics"
     FRED_API_KEY        free key from fred.stlouisfed.org/docs/api/api_key.html
     FMP_API_KEY         financialmodelingprep.com
     TE_API_KEY          tradingeconomics.com  (format "user:key")

   Query:   /api/calendar?days=7&ccy=EUR,USD
   Returns: { events: [{t, date, time, name, impact, country,
                        forecast, previous, actual, timeFromFeed}],
              provider, source, fetchedAt }

   `timeFromFeed` is false when the provider supplied only a date. The clock
   time then comes from the published release schedule below, not from the
   feed, and the UI must say so. Nothing here is guessed: a release with no
   known scheduled time is returned with time: null.                          */

const DAY = 86400000;

/* Every upstream call is bounded. Without this, a host that accepts the socket
   and then stalls takes the whole function down with a platform timeout, and
   the browser gets an opaque object instead of a sentence it can act on. */
async function getText(url, ms = 8000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: { Accept: "application/json", "User-Agent": "forex-analyzer/1.0 (+vercel)" },
    });
    return { status: r.status, ok: r.ok, body: await r.text() };
  } catch (e) {
    if (e.name === "AbortError") throw new Error(`no reply from ${new URL(url).host} within ${ms / 1000}s`);
    throw new Error(`${new URL(url).host} could not be reached (${e.message})`);
  } finally {
    clearTimeout(timer);
  }
}
async function getJson(url, ms) {
  const r = await getText(url, ms);
  try { return { ...r, json: JSON.parse(r.body) }; }
  catch (e) { throw new Error(`${new URL(url).host} answered HTTP ${r.status} with something that was not JSON: "${r.body.slice(0, 120).replace(/\s+/g, " ").trim()}"`); }
}

/* US releases that move FX, with their customary Eastern release time.
   Source: the issuing agency's own published schedule (BLS 08:30, BEA 08:30,
   Census 08:30, Federal Reserve 14:00 for FOMC statements).                  */
const US_RELEASES = {
  "Employment Situation": { impact: "High", et: "08:30", short: "Non-Farm Payrolls" },
  "Consumer Price Index": { impact: "High", et: "08:30", short: "CPI" },
  "FOMC Press Release": { impact: "High", et: "14:00", short: "FOMC decision" },
  "Gross Domestic Product": { impact: "High", et: "08:30", short: "GDP" },
  "Personal Income and Outlays": { impact: "High", et: "08:30", short: "PCE inflation" },
  "Producer Price Index": { impact: "High", et: "08:30", short: "PPI" },
  "Advance Monthly Sales for Retail and Food Services": { impact: "High", et: "08:30", short: "Retail sales" },
  "Unemployment Insurance Weekly Claims Report": { impact: "Medium", et: "08:30", short: "Jobless claims" },
  "Job Openings and Labor Turnover Survey": { impact: "Medium", et: "10:00", short: "JOLTS" },
  "Employment Cost Index": { impact: "Medium", et: "08:30", short: "ECI" },
  "Industrial Production and Capacity Utilization": { impact: "Medium", et: "09:15", short: "Industrial production" },
  "New Residential Construction": { impact: "Medium", et: "08:30", short: "Housing starts" },
  "Advance Report on Durable Goods": { impact: "Medium", et: "08:30", short: "Durable goods" },
  "New Residential Sales": { impact: "Medium", et: "10:00", short: "New home sales" },
  "U.S. International Trade in Goods and Services": { impact: "Medium", et: "08:30", short: "Trade balance" },
};

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** Eastern wall-clock time on a given date -> UTC epoch ms, DST included. */
function etToUtc(dateStr, hhmm) {
  if (!hhmm) return null;
  const naive = Date.parse(`${dateStr}T${hhmm}:00Z`);
  if (!Number.isFinite(naive)) return null;
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" })
    .formatToParts(new Date(naive))
    .find((p) => p.type === "timeZoneName").value;
  return naive + (name === "EDT" ? 4 : 5) * 3600000;
}

const impactOf = (s) => {
  const v = String(s || "").toLowerCase();
  if (["high", "3", "major"].includes(v)) return "High";
  if (["medium", "moderate", "2"].includes(v)) return "Medium";
  return "Low";
};

export default async function handler(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 30);
  const provider = (process.env.CALENDAR_PROVIDER || "forexfactory").toLowerCase();
  const wanted = String(req.query.ccy || "USD").toUpperCase().split(",").map((x) => x.trim()).filter(Boolean);
  const now = new Date();
  const from = ymd(now);
  const to = ymd(new Date(now.getTime() + days * DAY));

  try {
    let events = [];
    let source = "";

    if (provider === "forexfactory") {
      /* Fair Economy publishes the ForexFactory calendar as a public weekly JSON
         file. No key, no signup. Two constraints matter and are handled here:
         the endpoint allows only a couple of downloads per five minutes and
         answers an HTML "Request Denied" page past that, and it is an
         unofficial feed that can move or change shape without notice. */
      const hosts = ["https://nfs.faireconomy.media", "https://cdn-nfs.faireconomy.media"];
      const weeks = days > 7 ? ["thisweek", "nextweek"] : ["thisweek"];
      const rows = [];
      let lastErr = null;
      for (const week of weeks) {
        let got = false;
        for (const host of hosts) {
          try {
            const r = await getText(`${host}/ff_calendar_${week}.json`);
            if (r.body.trimStart().startsWith("<")) {
              lastErr = r.status === 403 || /denied|limit/i.test(r.body)
                ? "ForexFactory refused the download. Its calendar export allows only a couple of requests every five minutes across everyone using this deployment, and it also blocks some datacentre IP ranges outright. Wait five minutes; if it keeps failing, the server's address is blocked and you need a different CALENDAR_PROVIDER."
                : `The feed answered HTTP ${r.status} with a web page instead of JSON.`;
              continue;
            }
            const j = JSON.parse(r.body);
            if (Array.isArray(j)) { rows.push(...j); got = true; break; }
            lastErr = "The feed returned JSON that was not an array of events.";
          } catch (e) { lastErr = e.message; }
        }
        if (!got && week === "thisweek") return res.status(502).json({ error: `Calendar feed unavailable — ${lastErr || "unknown reason"}.` });
      }

      const horizon = now.getTime() + days * DAY;
      events = rows
        .map((e) => {
          const t = Date.parse(e.date);
          const ccy = String(e.country || "").toUpperCase();
          if (!Number.isFinite(t)) return null;
          const iso = new Date(t).toISOString();
          const allDay = String(e.date).includes("T00:00:00") && impactOf(e.impact) === "Low";
          return {
            t, date: iso.slice(0, 10),
            time: allDay ? null : `${iso.slice(11, 16)} UTC`,
            name: e.title, fullName: e.title,
            impact: String(e.impact).toLowerCase() === "holiday" ? "Low" : impactOf(e.impact),
            country: ccy,
            forecast: e.forecast || null, previous: e.previous || null, actual: null,
            timeFromFeed: true,
          };
        })
        .filter((e) => e && e.t <= horizon && wanted.includes(e.country));
      source = "ForexFactory public calendar feed (Fair Economy) — unofficial, no affiliation";
    } else if (provider === "fred") {
      const key = process.env.FRED_API_KEY;
      if (!key) return res.status(500).json({ error: "FRED_API_KEY is not set on the server. Get a free key at fred.stlouisfed.org/docs/api/api_key.html, add it in Vercel -> Settings -> Environment Variables, then redeploy." });
      const url = `https://api.stlouisfed.org/fred/releases/dates?api_key=${encodeURIComponent(key)}&file_type=json&realtime_start=${from}&realtime_end=${to}&include_release_dates_with_no_data=true&sort_order=asc&limit=1000`;
      const { json: j } = await getJson(url);
      if (j.error_message) return res.status(502).json({ error: `FRED: ${j.error_message}` });
      const rows = Array.isArray(j.release_dates) ? j.release_dates : [];
      events = rows
        .map((row) => {
          const meta = US_RELEASES[row.release_name];
          if (!meta) return null; // unrated releases are dropped, not invented
          return {
            t: etToUtc(row.date, meta.et),
            date: row.date,
            time: meta.et ? `${meta.et} ET` : null,
            name: meta.short,
            fullName: row.release_name,
            impact: meta.impact,
            country: "US",
            forecast: null, previous: null, actual: null,
            timeFromFeed: false,
          };
        })
        .filter(Boolean);
      source = "Federal Reserve Bank of St. Louis (FRED release calendar) — US releases only";
    } else if (provider === "fmp") {
      const key = process.env.FMP_API_KEY;
      if (!key) return res.status(500).json({ error: "FMP_API_KEY is not set on the server." });
      const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${from}&to=${to}&apikey=${encodeURIComponent(key)}`;
      const { json: j } = await getJson(url);
      if (!Array.isArray(j)) return res.status(502).json({ error: j?.["Error Message"] || "The provider did not return an event array." });
      events = j
        .filter((e) => wanted.includes("USD") && String(e.country).toUpperCase() === "US")
        .map((e) => ({
          t: Date.parse(String(e.date).replace(" ", "T") + "Z"),
          date: String(e.date).slice(0, 10),
          time: String(e.date).slice(11, 16) + " UTC",
          name: e.event,
          fullName: e.event,
          impact: impactOf(e.impact),
          country: "US",
          forecast: e.estimate ?? null, previous: e.previous ?? null, actual: e.actual ?? null,
          timeFromFeed: true,
        }));
      source = "Financial Modeling Prep economic calendar";
    } else if (provider === "tradingeconomics") {
      const key = process.env.TE_API_KEY;
      if (!key) return res.status(500).json({ error: "TE_API_KEY is not set on the server." });
      const url = `https://api.tradingeconomics.com/calendar/country/united%20states/${from}/${to}?c=${encodeURIComponent(key)}&f=json`;
      const { json: j } = await getJson(url);
      if (!Array.isArray(j)) return res.status(502).json({ error: "Trading Economics did not return an event array. Check the key format is user:key." });
      events = j.map((e) => ({
        t: Date.parse(String(e.Date).endsWith("Z") ? e.Date : e.Date + "Z"),
        date: String(e.Date).slice(0, 10),
        time: String(e.Date).slice(11, 16) + " UTC",
        name: e.Event,
        fullName: e.Event,
        impact: impactOf(e.Importance),
        country: "US",
        forecast: e.Forecast ?? null, previous: e.Previous ?? null, actual: e.Actual ?? null,
        timeFromFeed: true,
      }));
      source = "Trading Economics calendar";
    } else {
      return res.status(400).json({ error: `Unknown CALENDAR_PROVIDER "${provider}". Use forexfactory, fred, fmp or tradingeconomics.` });
    }

    const cutoff = now.getTime() - 6 * 3600000; // keep today's releases visible after the fact
    events = events
      .filter((e) => e.t == null || e.t >= cutoff)
      .sort((x, y) => (x.t ?? Infinity) - (y.t ?? Infinity))
      .slice(0, 60);

    // A long CDN cache is not an optimisation here — it is what keeps the free
    // feed inside its rate limit no matter how many people open the page.
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({ events, provider, source, days, currencies: wanted, fetchedAt: Date.now() });
  } catch (err) {
    return res.status(502).json({ error: `The calendar request failed: ${err.message}` });
  }
}

export const config = { maxDuration: 20 };
