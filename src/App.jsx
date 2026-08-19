import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

/* ============================================================================
   FOREX ANALYZER — Education & Technical Analysis Workbench
   ----------------------------------------------------------------------------
   Architecture
     DATA LAYER      -> Dataset {source, symbol, timeframe, candles[]}
     ANALYSIS LAYER  -> indicators, swings, structure, zones, liquidity, patterns
     SCENARIO ENGINE -> bullish / bearish / no-trade, confluence ledger
     RISK ENGINE     -> position sizing, R:R, invalidation, warnings
     EDUCATION LAYER -> WHY explanations, guided chart lesson, learning points
   Every number shown is computed from the loaded candles. Nothing is invented.
   ========================================================================== */

/* ---------------------------------------------------------------- tokens -- */
const T = {
  ink: "#080B11",
  panel: "#0E131C",
  panel2: "#141B27",
  line: "#1E2836",
  line2: "#2A3648",
  text: "#DCE5F2",
  dim: "#7C8CA3",
  faint: "#4E5D73",
  bull: "#14C08A",
  bullDim: "rgba(20,192,138,0.13)",
  bear: "#F0455A",
  bearDim: "rgba(240,69,90,0.13)",
  warn: "#F2A93B",
  warnDim: "rgba(242,169,59,0.13)",
  info: "#5B9CFF",
  infoDim: "rgba(91,156,255,0.13)",
  violet: "#A97BFF",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@600;700&display=swap');

.fx { --ink:${T.ink}; --panel:${T.panel}; --panel2:${T.panel2}; --line:${T.line};
  --text:${T.text}; --dim:${T.dim}; --faint:${T.faint};
  --bull:${T.bull}; --bear:${T.bear}; --warn:${T.warn}; --info:${T.info};
  background:var(--ink); color:var(--text); min-height:100%;
  font-family:'IBM Plex Sans',ui-sans-serif,system-ui,sans-serif;
  font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased;
}
.fx *,.fx *::before,.fx *::after{box-sizing:border-box}
.fx h1,.fx h2,.fx h3,.fx h4{margin:0;font-family:'IBM Plex Sans Condensed','IBM Plex Sans',sans-serif;font-weight:700;letter-spacing:.01em}
.fx p{margin:0}
.mono{font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.fx button{font:inherit;color:inherit;background:none;border:none;cursor:pointer}
.fx button:focus-visible,.fx select:focus-visible,.fx input:focus-visible,.fx textarea:focus-visible{outline:2px solid ${T.info};outline-offset:2px}
.fx input,.fx select,.fx textarea{font:inherit;background:${T.ink};color:var(--text);border:1px solid var(--line);border-radius:6px;padding:7px 9px;width:100%}
.fx input,.fx select{font-family:'IBM Plex Mono',monospace;font-size:13px}
.fx textarea{font-size:13px;resize:vertical}
.fx select{cursor:pointer}
.fx label{display:block}
.lbl{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-bottom:5px;font-family:'IBM Plex Mono',monospace}

/* shell */
.shell{max-width:1320px;margin:0 auto;padding:0 18px 72px}
.brand{display:flex;align-items:baseline;gap:9px}
.brand b{font-family:'IBM Plex Sans Condensed',sans-serif;font-size:17px;letter-spacing:.02em}
.nav{display:flex;gap:2px;flex-wrap:wrap;margin-left:auto}
.nav button{padding:7px 12px;border-radius:6px;font-size:11px;letter-spacing:.11em;text-transform:uppercase;color:var(--dim);font-family:'IBM Plex Mono',monospace;white-space:nowrap}
.nav button:hover{color:var(--text);background:var(--panel2)}
.nav button[data-on="1"]{color:var(--ink);background:var(--text);font-weight:600}
.sigbar{border-top:1px solid var(--line);background:rgba(14,19,28,.85)}
.sigin{max-width:1320px;margin:0 auto;padding:8px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.sigact{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:7px;font-family:'IBM Plex Sans Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:.05em}
.sigfld{display:flex;flex-direction:column;gap:1px;min-width:0}
.sigfld b{font-family:'IBM Plex Mono',monospace;font-size:12.5px;font-weight:600;white-space:nowrap}
.sigfld span{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
@media (max-width:640px){.sigin{padding:8px 12px;gap:10px}.sigact{font-size:12.5px;padding:4px 9px}}

/* cards */
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px}
.card>header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}
.card>header h3{font-size:12.5px;letter-spacing:.09em;text-transform:uppercase}
.card .body{padding:14px}
.grid{display:grid;gap:14px}
.mt{margin-top:14px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.spread{display:flex;justify-content:space-between;align-items:baseline;gap:12px}

/* pills, chips */
.pill{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;font-weight:500;border:1px solid transparent;white-space:nowrap}
.tf{padding:6px 10px;border-radius:6px;border:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:12px;color:var(--dim)}
.tf:hover{border-color:${T.line2};color:var(--text)}
.tf[data-on="1"]{background:var(--text);color:var(--ink);border-color:var(--text);font-weight:600}
.btn{padding:8px 13px;border-radius:7px;border:1px solid var(--line);background:var(--panel2);font-size:12.5px;font-weight:500}
.btn:hover{border-color:${T.line2}}
.btn.primary{background:var(--text);color:var(--ink);border-color:var(--text);font-weight:600}
.btn.primary:hover{opacity:.88}
.btn:disabled{opacity:.4;cursor:not-allowed}
.why{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;padding:3px 8px;border:1px solid var(--line);border-radius:5px;color:var(--dim)}
.why:hover{color:var(--text);border-color:${T.line2}}
.whybox{margin-top:10px;padding:11px 12px;border-left:2px solid ${T.info};background:${T.infoDim};border-radius:0 7px 7px 0;font-size:13px;color:#C6D4E8}

/* tables */
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:500;padding:0 10px 8px 0;border-bottom:1px solid var(--line)}
.tbl td{padding:8px 10px 8px 0;border-bottom:1px solid rgba(30,40,54,.55);vertical-align:top}
.tbl tr:last-child td{border-bottom:none}
.num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}

/* meters */
.meter{height:7px;border-radius:4px;background:var(--panel2);overflow:hidden;border:1px solid var(--line)}
.meter i{display:block;height:100%}
.ledger{display:flex;flex-direction:column;gap:7px}
.led{display:grid;grid-template-columns:14px 1fr auto;gap:9px;align-items:start;font-size:12.5px}
.led .dot{width:9px;height:9px;border-radius:2px;margin-top:5px}
.led small{display:block;color:var(--dim);font-size:11.5px;line-height:1.45}

/* checklist */
.chk{display:flex;gap:9px;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(30,40,54,.5);cursor:pointer;text-align:left;width:100%}
.chk:last-child{border-bottom:none}
.chk .box{flex:none;width:16px;height:16px;border-radius:4px;border:1.5px solid var(--line2, #2A3648);margin-top:2px;display:grid;place-items:center;font-size:11px;font-weight:700}
.stat{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.stat .v{font-family:'IBM Plex Mono',monospace;font-size:19px;font-weight:600;line-height:1.15}
.note{font-size:12px;color:var(--dim);line-height:1.55}
.warnbox{padding:10px 12px;border-radius:8px;font-size:12.5px;line-height:1.5;border:1px solid}
.scroll{overflow-x:auto}
.tag{font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 6px;border-radius:4px;border:1px solid var(--line);color:var(--dim)}
.hr{height:1px;background:var(--line);margin:13px 0}
.g2{grid-template-columns:1fr 1fr}

/* chart layer key */
.lbar{display:flex;flex-wrap:wrap;gap:5px}
.lchip{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border:1px solid var(--line);border-radius:7px;
  font-size:11.5px;color:var(--dim);background:${T.ink}}
.lchip:hover{border-color:${T.line2};color:var(--text)}
.lchip[data-on="1"]{border-color:${T.line2};background:var(--panel2);color:var(--text)}
.lchip[data-on="0"] .sw{filter:grayscale(1);opacity:.35}
.lchip em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--faint);white-space:nowrap}
.sw{width:12px;height:12px;border-radius:3px;flex:none;border:1px solid rgba(255,255,255,.14)}

/* rail: next releases */
.evrow{display:flex;align-items:center;gap:7px;padding:5px 0;border-top:1px solid var(--line);font-size:11.5px}
.evrow:first-child{border-top:none}
.evrow .dot{width:6px;height:6px;border-radius:50%;flex:none}
.evrow .mono{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--faint);flex:none}
.evname{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dim)}
.evin{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--faint);flex:none}
.evrow[data-hot="1"] .evname{color:var(--text)}
.evrow[data-hot="1"] .evin{color:${T.bear};font-weight:600}
.specs{display:grid;gap:9px;margin-bottom:12px}
.spec{border:1px solid var(--line);border-left:2px solid ${T.line2};border-radius:8px;padding:10px 12px}
.spec[data-on="0"]{opacity:.55}
.spechead{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.spechead b{font-size:12.5px;color:var(--text)}
.spec p{font-size:12.5px;line-height:1.6;color:var(--dim)}
@media (min-width:900px){.specs{grid-template-columns:1fr 1fr}}

/* ------------------------------------------------------- app shell layout -- */
.app{display:flex;min-height:100vh;align-items:flex-start}
.rail{position:fixed;left:0;top:0;bottom:0;width:262px;z-index:60;display:flex;flex-direction:column;
  background:${T.panel};border-right:1px solid var(--line);overflow-y:auto;overscroll-behavior:contain}
.rail::-webkit-scrollbar{width:8px}
.railbrand{padding:16px 16px 13px;border-bottom:1px solid var(--line)}
.railbrand b{display:block;font-size:13px;letter-spacing:.16em;color:var(--text)}
.railnav{padding:11px 10px;border-bottom:1px solid var(--line)}
.railgrp{margin-bottom:11px}
.railgrp:last-child{margin-bottom:0}
.railgrp>i{display:block;font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:.15em;
  text-transform:uppercase;color:var(--faint);padding:0 8px 6px}
.railnav button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border-radius:7px;margin-bottom:2px;
  font-size:13px;color:var(--dim);text-align:left;transition:background .15s ease,color .15s ease}
.railnav button:hover{background:var(--panel2);color:var(--text)}
.railnav button[data-on="1"]{background:var(--panel2);color:var(--text);font-weight:600;box-shadow:inset 2px 0 0 ${T.info}}
.railsec{padding:13px 14px;border-bottom:1px solid var(--line)}
.railsec select,.railsec input{width:100%}
.tfwrap{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.railfoot{padding:12px 14px;margin-top:auto}
.qbtn{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:9px;padding:8px 10px;
  border:1px solid var(--line);border-radius:7px}
.qbtn:hover{border-color:${T.line2}}
.scrim{display:none}

.content{flex:1;min-width:0;margin-left:262px}
.stickytop{position:sticky;top:0;z-index:50;background:${T.ink}f2;backdrop-filter:blur(9px);border-bottom:1px solid var(--line)}
.chead{display:flex;align-items:center;gap:11px;padding:11px 22px}
.chead h2{font-size:15px;letter-spacing:.04em;color:var(--text);white-space:nowrap}
.chead .refresh{margin-left:auto;display:inline-flex;align-items:center;white-space:nowrap}
.burger{display:none;padding:7px;border:1px solid var(--line);border-radius:7px;color:var(--dim)}
.burger:hover{color:var(--text)}
.content .shell{padding:0 22px 34px}
.content .sigbar{border-top:1px solid var(--line);border-bottom:none}

@media (max-width:980px){
  .rail{transform:translateX(-100%);transition:transform .22s ease;box-shadow:0 0 40px rgba(0,0,0,.6);width:280px}
  .app[data-nav="1"] .rail{transform:none}
  .app[data-nav="1"] .scrim{display:block;position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.55)}
  .content{margin-left:0}
  .burger{display:inline-flex}
  .chead{padding:10px 14px;gap:9px}
  .content .shell{padding:0 14px 30px}
  .hide-sm{display:none}
  .chead .refresh{padding:8px 10px}
}
ul.tight{margin:7px 0 0 17px;padding:0;font-size:13px;line-height:1.6}
ul.tight li{margin-bottom:4px}
.g3{grid-template-columns:repeat(3,1fr)}
.g4{grid-template-columns:repeat(4,1fr)}
@media (max-width:980px){.g4{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:1fr}}
@media (max-width:640px){.g2{grid-template-columns:1fr}.g4{grid-template-columns:repeat(2,1fr)}}
@media (prefers-reduced-motion:no-preference){.fade{animation:fx-fade .28s ease both}}
@keyframes fx-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.fx ::-webkit-scrollbar{height:9px;width:9px}
.fx ::-webkit-scrollbar-thumb{background:${T.line2};border-radius:9px}
.fx ::-webkit-scrollbar-track{background:transparent}


/* collapsible cards */
.fold>header{padding:0;gap:0}
.fold[data-open="0"]>header{border-bottom:none}
.foldbtn{display:flex;align-items:center;gap:9px;width:100%;padding:12px 14px;text-align:left}
.foldbtn h3{font-size:12.5px;letter-spacing:.09em;text-transform:uppercase}
.foldbtn:hover h3{color:#fff}
.chev{margin-left:auto;color:var(--faint);font-size:11px;transition:transform .18s ease;flex:none}

/* segmented control */
.seg{display:flex;gap:3px;background:${T.ink};border:1px solid var(--line);border-radius:8px;padding:3px}
.seg button{flex:1;padding:7px 6px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);white-space:nowrap}
.seg button:hover{color:var(--text);background:var(--panel2)}
.seg button[data-on="1"]{background:var(--text);color:var(--ink);font-weight:600}

/* chart toolbar, legend, tooltip */
.cbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:9px}
.cbar .sep{width:1px;height:18px;background:var(--line)}
.cbar .zbtn{padding:5px 8px;border-radius:6px;border:1px solid var(--line);font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--dim);line-height:1}
.cbar .zbtn:hover{color:var(--text);border-color:${T.line2}}
.cbar .zbtn[data-on="1"]{background:var(--text);color:var(--ink);border-color:var(--text);font-weight:600}
.cbar .zbtn:disabled{opacity:.35;cursor:not-allowed}
.legend{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0 2px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:var(--dim)}
.legend span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.legend i{display:block;width:14px;height:0;border-top:2px solid;flex:none}
.legend em{font-style:normal;color:var(--text)}
.cwrap{position:relative;touch-action:pan-y}
.cwrap svg{display:block;cursor:crosshair;touch-action:pan-y}
.cwrap[data-drag="1"] svg{cursor:grabbing}
.tip{position:absolute;top:8px;z-index:5;pointer-events:none;min-width:150px;background:rgba(8,11,17,.96);border:1px solid ${T.line2};border-radius:8px;padding:8px 10px;box-shadow:0 6px 22px rgba(0,0,0,.45)}
.tip b{display:block;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em;color:var(--faint);font-weight:500;margin-bottom:5px}
.tip .r{display:flex;justify-content:space-between;gap:14px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;line-height:1.65}
.tip .r span{color:var(--faint)}
.tip .r em{font-style:normal;color:var(--text);font-variant-numeric:tabular-nums}
.tip .div{height:1px;background:var(--line);margin:6px 0}

`;

/* ------------------------------------------------------------ instruments -- */
const INSTRUMENTS = {
  "EUR/USD": { digits: 5, pip: 0.0001, contract: 100000, seed: 1.0842, vol: 0.0009, unit: "lots" },
  "GBP/USD": { digits: 5, pip: 0.0001, contract: 100000, seed: 1.2685, vol: 0.0012, unit: "lots" },
  "USD/JPY": { digits: 3, pip: 0.01, contract: 100000, seed: 151.4, vol: 0.13, unit: "lots" },
  "USD/CHF": { digits: 5, pip: 0.0001, contract: 100000, seed: 0.8975, vol: 0.0008, unit: "lots" },
  "AUD/USD": { digits: 5, pip: 0.0001, contract: 100000, seed: 0.6612, vol: 0.0008, unit: "lots" },
  "USD/CAD": { digits: 5, pip: 0.0001, contract: 100000, seed: 1.3608, vol: 0.0009, unit: "lots" },
  "NZD/USD": { digits: 5, pip: 0.0001, contract: 100000, seed: 0.6085, vol: 0.0008, unit: "lots" },
  "XAU/USD": { digits: 2, pip: 0.1, contract: 100, seed: 2338.0, vol: 3.2, unit: "oz-lots" },
  "BTC/USD": { digits: 1, pip: 1, contract: 1, seed: 64200, vol: 320, unit: "coins" },
  "Custom pair": { digits: 5, pip: 0.0001, contract: 100000, seed: 1.0, vol: 0.001, unit: "units" },
};
const PAIRS = Object.keys(INSTRUMENTS);
const TFS = ["1m", "5m", "15m", "30m", "1H", "4H", "Daily", "Weekly"];
const TF_MIN = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1H": 60, "4H": 240, Daily: 1440, Weekly: 10080 };

/* How deep a fetch has to be before every part of the analysis can run. These
   are not preferences: an EMA200 needs 200 closes to exist, and a Daily
   context row has to be built by merging the loaded candles, which takes 30
   daily bars — 720 hourly ones. Fetch less and components go unmeasured. */
function barPlan(tradeTf, htfTf) {
  const tfMin = TF_MIN[tradeTf], htfMin = TF_MIN[htfTf];
  const ratio = htfMin / tfMin;
  const buildable = ratio >= 1 && Number.isInteger(ratio);
  const items = [
    { need: 260, what: `the 200 EMA to exist and settle`, key: "ema" },
    { need: buildable ? Math.ceil(30 * ratio) : Infinity, what: `a ${htfTf} context row (30 ${htfTf} bars merged from ${tradeTf})`, key: "htf" },
    { need: buildable ? Math.ceil(60 * ratio) : Infinity, what: `a ${htfTf} row with its own moving averages, not just structure`, key: "htfFull" },
    { need: 310, what: "the signal replay to have warm-up plus room to resolve", key: "replay" },
  ];
  const min = 260;
  const good = Math.min(5000, Math.max(...items.filter((i) => Number.isFinite(i.need)).map((i) => i.need)));
  return { items, min, good, ratio, buildable, htfTf, tradeTf };
}

/* ============================== INDICATOR MATH ============================= */
const last = (a) => (a && a.length ? a[a.length - 1] : undefined);
const nz = (v, d = 0) => (Number.isFinite(v) ? v : d);

function emaSeries(vals, period) {
  const out = new Array(vals.length).fill(null);
  if (vals.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += vals[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < vals.length; i++) { prev = vals[i] * k + prev * (1 - k); out[i] = prev; }
  return out;
}
function rsiSeries(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) g += d; else l -= d; }
  let ag = g / period, al = l / period;
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}
function macdSeries(closes, fast = 12, slow = 26, sig = 9) {
  const f = emaSeries(closes, fast), s = emaSeries(closes, slow);
  const line = closes.map((_, i) => (f[i] != null && s[i] != null ? f[i] - s[i] : null));
  const compact = line.filter((v) => v != null);
  const sigCompact = emaSeries(compact, sig);
  const signal = new Array(closes.length).fill(null);
  let j = 0;
  for (let i = 0; i < line.length; i++) if (line[i] != null) { signal[i] = sigCompact[j]; j++; }
  const hist = line.map((v, i) => (v != null && signal[i] != null ? v - signal[i] : null));
  return { line, signal, hist };
}
function atrSeries(c, period = 14) {
  const out = new Array(c.length).fill(null);
  if (c.length < period + 1) return out;
  const tr = c.map((k, i) => (i === 0 ? k.h - k.l : Math.max(k.h - k.l, Math.abs(k.h - c[i - 1].c), Math.abs(k.l - c[i - 1].c))));
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < c.length; i++) { prev = (prev * (period - 1) + tr[i]) / period; out[i] = prev; }
  return out;
}

/* ============================== STRUCTURE ENGINE =========================== */
/** Fractal swing detection: a pivot high is the highest high of a +/- k window. */
function findPivots(c, k = 2) {
  const p = [];
  for (let i = k; i < c.length - k; i++) {
    let isH = true, isL = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (c[j].h >= c[i].h) isH = false;
      if (c[j].l <= c[i].l) isL = false;
    }
    if (isH) p.push({ i, price: c[i].h, type: "H" });
    if (isL) p.push({ i, price: c[i].l, type: "L" });
  }
  p.sort((a, b) => a.i - b.i);
  // enforce alternation, keeping the more extreme pivot of consecutive same-type
  const alt = [];
  for (const x of p) {
    const prev = last(alt);
    if (!prev || prev.type !== x.type) alt.push({ ...x });
    else if ((x.type === "H" && x.price > prev.price) || (x.type === "L" && x.price < prev.price)) alt[alt.length - 1] = { ...x };
  }
  // label each pivot against the previous pivot of the same type
  let lastH = null, lastL = null;
  for (const x of alt) {
    if (x.type === "H") { x.label = lastH == null ? "H" : x.price > lastH ? "HH" : "LH"; lastH = x.price; }
    else { x.label = lastL == null ? "L" : x.price < lastL ? "LL" : "HL"; lastL = x.price; }
  }
  return alt;
}

function classifyStructure(pivots) {
  const highs = pivots.filter((p) => p.type === "H").slice(-3);
  const lows = pivots.filter((p) => p.type === "L").slice(-3);
  if (highs.length < 2 || lows.length < 2) return { state: "Unclear", detail: "Not enough confirmed swing points to classify structure." };
  const hUp = highs[highs.length - 1].price > highs[highs.length - 2].price;
  const lUp = lows[lows.length - 1].price > lows[lows.length - 2].price;
  if (hUp && lUp) return { state: "Bullish", detail: "The last two swing highs and the last two swing lows are both rising (higher high + higher low)." };
  if (!hUp && !lUp) return { state: "Bearish", detail: "The last two swing highs and the last two swing lows are both falling (lower high + lower low)." };
  return { state: "Range", detail: hUp ? "Swing highs are rising but swing lows are not — an expanding, indecisive structure." : "Swing highs are falling while swing lows hold — a compressing range, not a trend." };
}

/** BOS = continuation break of the prior swing in the direction of structure.
 *  CHOCH = first break against the prevailing structure. */
function findStructureEvents(c, pivots) {
  const ev = [];
  let bias = null;
  const hs = [], ls = [];
  for (const p of pivots) (p.type === "H" ? hs : ls).push(p);
  for (let i = 0; i < pivots.length; i++) {
    const p = pivots[i];
    const ref = p.type === "H" ? hs[hs.indexOf(p) - 1] : ls[ls.indexOf(p) - 1];
    if (!ref) continue;
    // find the candle that closed beyond ref between ref.i and p.i
    let brk = -1;
    for (let j = ref.i + 1; j <= p.i; j++) {
      if (p.type === "H" && c[j].c > ref.price) { brk = j; break; }
      if (p.type === "L" && c[j].c < ref.price) { brk = j; break; }
    }
    if (brk < 0) continue;
    const dir = p.type === "H" ? "up" : "down";
    const kind = bias && bias !== dir ? "CHOCH" : "BOS";
    ev.push({ i: brk, price: ref.price, dir, kind });
    bias = dir;
  }
  return ev.slice(-6);
}

/* ================================ ZONES ==================================== */
function clusterLevels(pivots, tol, type) {
  const pts = pivots.filter((p) => p.type === type).map((p) => ({ price: p.price, i: p.i }));
  const clusters = [];
  for (const pt of pts) {
    const hit = clusters.find((cl) => Math.abs(cl.mid - pt.price) <= tol);
    if (hit) { hit.pts.push(pt); hit.lo = Math.min(hit.lo, pt.price); hit.hi = Math.max(hit.hi, pt.price); hit.mid = (hit.lo + hit.hi) / 2; hit.lastI = Math.max(hit.lastI, pt.i); }
    else clusters.push({ lo: pt.price, hi: pt.price, mid: pt.price, pts: [pt], lastI: pt.i });
  }
  return clusters.map((cl) => ({
    lo: cl.lo - tol * 0.35, hi: cl.hi + tol * 0.35, mid: cl.mid,
    touches: cl.pts.length, lastI: cl.lastI, origin: type === "H" ? "swing highs" : "swing lows",
  }));
}
function buildSR(c, pivots, atr) {
  const price = last(c).c;
  const tol = Math.max(atr * 0.55, price * 0.0004);
  const raw = [...clusterLevels(pivots, tol, "H"), ...clusterLevels(pivots, tol, "L")];
  // merge overlaps across both sides
  raw.sort((a, b) => a.mid - b.mid);
  const merged = [];
  for (const z of raw) {
    const prev = last(merged);
    if (prev && z.lo <= prev.hi) {
      prev.hi = Math.max(prev.hi, z.hi); prev.lo = Math.min(prev.lo, z.lo);
      prev.mid = (prev.hi + prev.lo) / 2; prev.touches += z.touches; prev.lastI = Math.max(prev.lastI, z.lastI);
      prev.origin = "swing highs and lows";
    } else merged.push({ ...z });
  }
  const bars = c.length;
  for (const z of merged) {
    z.side = z.mid > price ? "resistance" : "support";
    z.strength = z.touches >= 3 ? "Strong" : z.touches === 2 ? "Moderate" : "Weak";
    z.dist = Math.abs(z.mid - price);
    z.age = bars - 1 - z.lastI;
    // flipped: formed as one side, price now on the other
    const formedAbove = z.mid > c[z.lastI].c;
    z.flipped = (z.side === "support" && formedAbove) || (z.side === "resistance" && !formedAbove);
  }
  const res = merged.filter((z) => z.side === "resistance").sort((a, b) => a.dist - b.dist).slice(0, 3).map((z, i) => ({ ...z, name: "R" + (i + 1) }));
  const sup = merged.filter((z) => z.side === "support").sort((a, b) => a.dist - b.dist).slice(0, 3).map((z, i) => ({ ...z, name: "S" + (i + 1) }));
  return { res, sup, all: [...res, ...sup] };
}

/** Supply/demand: a tight base immediately followed by an impulse leg > 1.6 ATR. */
function findSDZones(c, atr) {
  const out = [];
  const price = last(c).c;
  for (let i = 3; i < c.length - 3; i++) {
    const legUp = c[i + 3].c - c[i].o, legDn = c[i].o - c[i + 3].c;
    const base = c[i], baseBody = Math.abs(base.c - base.o), baseRange = base.h - base.l;
    if (baseRange <= 0) continue;
    const tight = baseBody < atr * 0.65;
    if (legUp > atr * 1.6 && tight) out.push({ i, lo: base.l, hi: Math.max(base.o, base.c), kind: "demand" });
    else if (legDn > atr * 1.6 && tight) out.push({ i, lo: Math.min(base.o, base.c), hi: base.h, kind: "supply" });
  }
  const kept = [];
  for (const z of out.reverse()) {
    if (kept.some((k) => k.kind === z.kind && z.hi > k.lo && z.lo < k.hi)) continue;
    let tests = 0, broken = false;
    for (let j = z.i + 4; j < c.length; j++) {
      const touched = c[j].l <= z.hi && c[j].h >= z.lo;
      if (touched) tests++;
      if (z.kind === "demand" && c[j].c < z.lo) broken = true;
      if (z.kind === "supply" && c[j].c > z.hi) broken = true;
    }
    z.tests = tests;
    z.state = broken ? "Broken" : tests === 0 ? "Fresh" : "Tested";
    z.dist = Math.abs((z.lo + z.hi) / 2 - price);
    kept.push(z);
    if (kept.length >= 6) break;
  }
  return kept.sort((a, b) => a.dist - b.dist).slice(0, 4);
}

/* ============================ FAIR VALUE GAPS ==============================
   A three-candle imbalance: candle 1's wick and candle 3's wick do not overlap,
   so the middle candle covered that range in one direction only. The untouched
   band between them is the gap. Detected on wicks, because the gap is defined by
   the range that was skipped, not by where candles closed. */
function findFVGs(c, atr) {
  const found = [];
  for (let i = 2; i < c.length; i++) {
    const a1 = c[i - 2], a2 = c[i - 1], a3 = c[i];
    let z = null;
    if (a3.l > a1.h) z = { lo: a1.h, hi: a3.l, kind: "bullish" };
    else if (a1.l > a3.h) z = { lo: a3.h, hi: a1.l, kind: "bearish" };
    if (!z) continue;
    z.size = z.hi - z.lo;
    if (z.size < atr * 0.22) continue;           // ignore specks below a fifth of an ATR
    z.i = i; z.originI = i - 2;
    z.impulse = Math.abs(a2.c - a2.o) / (atr || 1);
    found.push(z);
  }
  const price = last(c).c;
  for (const z of found) {
    let minLow = Infinity, maxHigh = -Infinity;
    for (let j = z.i + 1; j < c.length; j++) { if (c[j].l < minLow) minLow = c[j].l; if (c[j].h > maxHigh) maxHigh = c[j].h; }
    if (z.kind === "bullish") {
      z.filled = minLow <= z.lo;
      z.fillPct = Number.isFinite(minLow) ? Math.max(0, Math.min(1, (z.hi - minLow) / z.size)) : 0;
    } else {
      z.filled = maxHigh >= z.hi;
      z.fillPct = Number.isFinite(maxHigh) ? Math.max(0, Math.min(1, (maxHigh - z.lo) / z.size)) : 0;
    }
    z.state = z.filled ? "Filled" : z.fillPct > 0.02 ? "Partially filled" : "Unfilled";
    z.atrSize = z.size / (atr || 1);
    z.mid = (z.lo + z.hi) / 2;
    z.dist = Math.abs(z.mid - price);
    z.barsAgo = c.length - 1 - z.i;
    z.inside = price >= z.lo && price <= z.hi;
  }
  const open = found.filter((z) => !z.filled).sort((a, b) => a.dist - b.dist).slice(0, 6);
  return { zones: open, total: found.length, filled: found.filter((z) => z.filled).length };
}

/* ============================== LIQUIDITY ================================== */
function findLiquidity(c, pivots, atr, tfMin) {
  const tol = atr * 0.28;
  const out = [];
  const push = (o) => out.push(o);
  for (const type of ["H", "L"]) {
    const ps = pivots.filter((p) => p.type === type);
    for (let i = 1; i < ps.length; i++) {
      if (Math.abs(ps[i].price - ps[i - 1].price) <= tol) {
        push({
          kind: type === "H" ? "Equal highs" : "Equal lows",
          price: (ps[i].price + ps[i - 1].price) / 2, i: ps[i].i,
          note: type === "H" ? "Two swing highs at nearly the same price. Buy-stops from short positions often sit just above." : "Two swing lows at nearly the same price. Sell-stops from long positions often sit just below.",
        });
      }
    }
  }
  // session/period extremes derived from candle timestamps
  const barsPerDay = Math.max(1, Math.round(1440 / tfMin));
  if (c.length > barsPerDay * 2) {
    const dayStart = c.length - barsPerDay * 2, dayEnd = c.length - barsPerDay;
    const seg = c.slice(dayStart, dayEnd);
    push({ kind: "Previous day high", price: Math.max(...seg.map((x) => x.h)), i: dayEnd - 1, note: "The highest price of the previous session. Commonly watched as a reference and a resting-order area." });
    push({ kind: "Previous day low", price: Math.min(...seg.map((x) => x.l)), i: dayEnd - 1, note: "The lowest price of the previous session." });
  }
  if (c.length > barsPerDay * 10) {
    const seg = c.slice(c.length - barsPerDay * 10, c.length - barsPerDay * 5);
    push({ kind: "Previous week high", price: Math.max(...seg.map((x) => x.h)), i: c.length - barsPerDay * 5, note: "The highest price of the prior week of data in this series." });
    push({ kind: "Previous week low", price: Math.min(...seg.map((x) => x.l)), i: c.length - barsPerDay * 5, note: "The lowest price of the prior week of data in this series." });
  }
  // recent sweep: wick through a prior extreme, close back inside
  let sweep = null;
  for (let j = c.length - 1; j >= Math.max(0, c.length - 12); j--) {
    for (const lv of out) {
      if (lv.i >= j) continue;
      if (lv.kind.includes("high") || lv.kind.includes("highs")) {
        if (c[j].h > lv.price + tol * 0.2 && c[j].c < lv.price) { sweep = { dir: "up", level: lv, i: j }; break; }
      } else if (c[j].l < lv.price - tol * 0.2 && c[j].c > lv.price) { sweep = { dir: "down", level: lv, i: j }; break; }
    }
    if (sweep) break;
  }
  const price = last(c).c;
  out.forEach((o) => (o.dist = Math.abs(o.price - price)));
  return { levels: out.sort((a, b) => a.dist - b.dist).slice(0, 7), sweep };
}

/* ============================ CANDLESTICK PATTERNS ========================= */
function findPatterns(c, atr) {
  const res = [];
  const body = (k) => Math.abs(k.c - k.o);
  const rng = (k) => k.h - k.l || 1e-9;
  const upW = (k) => k.h - Math.max(k.o, k.c);
  const dnW = (k) => Math.min(k.o, k.c) - k.l;
  const start = Math.max(2, c.length - 8);
  for (let i = start; i < c.length; i++) {
    const k = c[i], p = c[i - 1], q = c[i - 2];
    const bars = c.length - 1 - i;
    const add = (name, meaning, need) => res.push({ name, i, barsAgo: bars, meaning, need });
    if (body(k) / rng(k) < 0.1) add("Doji", "Open and close finished at almost the same price: buyers and sellers finished the bar level.", "On its own it signals pause, not reversal. It matters far more at a tested level than in open space.");
    else if (dnW(k) > body(k) * 2 && upW(k) < body(k) * 0.6 && k.c > k.o) add("Hammer", "Price was pushed well below the open and closed back near the high — the low was rejected within the bar.", "Needs a following close above this bar's high, and it only carries weight at support or demand.");
    else if (upW(k) > body(k) * 2 && dnW(k) < body(k) * 0.6 && k.c < k.o) add("Shooting star", "Price probed above and was sold back down to close near the low — the high was rejected.", "Needs a following close below this bar's low, ideally at resistance or supply.");
    else if (Math.max(upW(k), dnW(k)) > rng(k) * 0.62) add("Pin bar", "A long wick shows price was accepted, then rejected, on one side of the bar.", "The wick's direction is the rejected side. Confirmation is the next bar closing away from the wick.");
    if (k.c > k.o && p.c < p.o && k.c > p.o && k.o < p.c && body(k) > body(p)) add("Bullish engulfing", "This bar's range fully covers the prior down bar and closes higher: buyers reversed the previous bar's work.", "Stronger when it forms at support with above-average range. Confirmation is a higher close after it.");
    if (k.c < k.o && p.c > p.o && k.c < p.o && k.o > p.c && body(k) > body(p)) add("Bearish engulfing", "This bar covers the prior up bar and closes lower: sellers reversed the previous bar's work.", "Stronger at resistance. Confirmation is a lower close after it.");
    if (k.h < p.h && k.l > p.l) add("Inside bar", "The whole bar fits inside the previous bar's range — volatility contracted and the market paused.", "It is a compression signal, direction-neutral. Traders typically wait for a close outside the mother bar.");
    if (q.c < q.o && body(p) < atr * 0.4 && k.c > k.o && k.c > (q.o + q.c) / 2) add("Morning star", "A down bar, a small indecision bar, then a strong up bar closing back into the first bar's body.", "A three-bar reversal attempt. It needs follow-through and is only meaningful after a real decline.");
    if (q.c > q.o && body(p) < atr * 0.4 && k.c < k.o && k.c < (q.o + q.c) / 2) add("Evening star", "An up bar, a small indecision bar, then a strong down bar closing back into the first bar's body.", "A three-bar reversal attempt, meaningful only after a real advance and with follow-through.");
  }
  return res.slice(-5).reverse();
}

/* ============================== RESAMPLING ================================= */
function resample(candles, ratio) {
  if (ratio <= 1) return candles;
  const out = [];
  for (let i = 0; i < candles.length; i += ratio) {
    const seg = candles.slice(i, i + ratio);
    if (seg.length < Math.min(ratio, 2)) break;
    out.push({ t: seg[0].t, o: seg[0].o, h: Math.max(...seg.map((s) => s.h)), l: Math.min(...seg.map((s) => s.l)), c: last(seg).c, v: seg.reduce((a, s) => a + nz(s.v), 0) });
  }
  return out;
}

/* ============================ ANALYSIS ORCHESTRATOR ======================== */
/* How far back the level map looks, in bars.

   Indicators need all the history they can get — a 200 EMA is meaningless
   without 200 bars behind it. Level maps are the opposite: clustering every
   swing in the series means the zones, and their reaction counts, change every
   time you fetch a different number of bars. A zone from four months ago is not
   support today, and it should not silently alter the reading either.

   So: indicators run on everything loaded, the level map runs on a fixed
   window. Fetch 800 bars or 3000 and the zones come out the same.            */
const LEVEL_WINDOW = 300;

function analyzeSeries(c, tfMin) {
  if (!c || c.length < 30) return null;
  const closes = c.map((k) => k.c);
  const price = last(closes);
  const ema = { 20: emaSeries(closes, 20), 50: emaSeries(closes, 50), 100: emaSeries(closes, 100), 200: emaSeries(closes, 200) };
  const rsi = rsiSeries(closes, 14);
  const macd = macdSeries(closes);
  const atrArr = atrSeries(c, 14);
  const atr = nz(last(atrArr.filter((v) => v != null)), (Math.max(...c.map((k) => k.h)) - Math.min(...c.map((k) => k.l))) / 20);
  const pivots = findPivots(c, 2);
  const structure = classifyStructure(pivots);
  const events = findStructureEvents(c, pivots);
  // level map: fixed lookback, with indices mapped back to the full series so
  // everything the chart draws still lines up with the right candle
  const off = Math.max(0, c.length - LEVEL_WINDOW);
  const win = off ? c.slice(off) : c;
  const winPivots = off ? pivots.filter((p) => p.i >= off).map((p) => ({ ...p, i: p.i - off })) : pivots;
  const shift = (arr) => (off ? arr.map((z) => ({ ...z, i: z.i + off })) : arr);

  const sr = buildSR(win, winPivots, atr);
  const sd = shift(findSDZones(win, atr));
  const liqRaw = findLiquidity(win, winPivots, atr, tfMin);
  const liq = off
    ? { ...liqRaw, levels: shift(liqRaw.levels), sweep: liqRaw.sweep ? { ...liqRaw.sweep, level: { ...liqRaw.sweep.level, i: liqRaw.sweep.level.i + off } } : liqRaw.sweep }
    : liqRaw;
  const fvg = findFVGs(c, atr);
  const patterns = findPatterns(c, atr);

  const e20 = last(ema[20].filter((v) => v != null));
  const e50 = last(ema[50].filter((v) => v != null));
  const e200 = last(ema[200].filter((v) => v != null));
  let maRead = "Neutral", maWhy = "Price and the moving averages are interleaved, so they are not agreeing on direction.";
  if (e20 && e50 && price > e20 && e20 > e50 && (!e200 || e50 > e200)) { maRead = "Bullish"; maWhy = "Price is above EMA20, EMA20 is above EMA50" + (e200 ? " and EMA50 is above EMA200" : "") + " — the averages are stacked in bullish order."; }
  else if (e20 && e50 && price < e20 && e20 < e50 && (!e200 || e50 < e200)) { maRead = "Bearish"; maWhy = "Price is below EMA20, EMA20 is below EMA50" + (e200 ? " and EMA50 is below EMA200" : "") + " — the averages are stacked in bearish order."; }

  const rsiVal = last(rsi.filter((v) => v != null));
  const rsiPrev = rsi.filter((v) => v != null).slice(-6)[0];
  let rsiRead = "Neutral";
  if (rsiVal != null) rsiRead = rsiVal > 55 ? "Bullish" : rsiVal < 45 ? "Bearish" : "Neutral";
  const rsiState = rsiVal == null ? "n/a" : rsiVal >= 70 ? "Overbought reading" : rsiVal <= 30 ? "Oversold reading" : "Mid-range";

  const hist = macd.hist.filter((v) => v != null);
  const h0 = last(hist), h1 = hist[hist.length - 2];
  const macdRead = h0 == null ? "Neutral" : h0 > 0 && h0 >= nz(h1) ? "Bullish" : h0 < 0 && h0 <= nz(h1) ? "Bearish" : h0 > 0 ? "Bullish" : "Bearish";
  const macdWhy = h0 == null ? "Not enough bars for MACD." : `The MACD histogram reads ${h0.toFixed(6)} and is ${h0 >= nz(h1) ? "expanding" : "contracting"} versus the prior bar. Above zero means the fast average is above the slow one; the direction of the histogram is the momentum change.`;

  const atrPct = (atr / price) * 100;
  const atrHist = atrArr.filter((v) => v != null).slice(-100);
  const rank = atrHist.length ? atrHist.filter((v) => v < atr).length / atrHist.length : 0.5;
  const volatility = rank > 0.66 ? "High" : rank < 0.33 ? "Low" : "Medium";

  const nearestSup = sr.sup[0], nearestRes = sr.res[0];
  let srRead = "Neutral", srWhy = "Price is not close enough to a mapped zone for the level to be doing any work right now.";
  const inZone = (z) => z && price >= z.lo - atr * 0.3 && price <= z.hi + atr * 0.3;
  if (inZone(nearestSup)) { srRead = "Bullish"; srWhy = `Price is inside the ${nearestSup.name} support zone, which has produced ${nearestSup.touches} reaction${nearestSup.touches === 1 ? "" : "s"}. Levels only matter while they hold.`; }
  else if (inZone(nearestRes)) { srRead = "Bearish"; srWhy = `Price is inside the ${nearestRes.name} resistance zone, which has produced ${nearestRes.touches} reaction${nearestRes.touches === 1 ? "" : "s"}.`; }

  const momentumRead = macdRead === rsiRead ? macdRead : "Neutral";
  const structRead = structure.state === "Bullish" ? "Bullish" : structure.state === "Bearish" ? "Bearish" : "Neutral";

  // trend strength from EMA slope + ADX-free proxy (structure agreement + ATR-normalised drift)
  const drift = e50 ? Math.abs(price - e50) / atr : 0;
  const strength = drift > 2.2 && maRead !== "Neutral" && structRead !== "Neutral" ? "Strong" : drift > 1 && maRead !== "Neutral" ? "Moderate" : "Weak";

  return { candles: c, price, ema, rsi, macd, atrArr, atr, atrPct, volatility, pivots, structure, structRead, events,
    levelWindow: Math.min(c.length, LEVEL_WINDOW), windowed: c.length > LEVEL_WINDOW,
    sr, sd, liq, fvg, patterns, maRead, maWhy, rsiVal, rsiPrev, rsiRead, rsiState, macdRead, macdWhy, momentumRead, srRead, srWhy, strength, tfMin };
}

/* =============================== MTF LADDER ================================ */
/**
 * The binding constraints on bar count, stated rather than guessed at:
 *   a 200 EMA needs 200 bars plus burn-in before its value settles;
 *   the higher-timeframe row is built by merging these candles, so it needs
 *     enough of them to make 60 higher-timeframe bars;
 *   the signal replay needs 260 bars of warm-up plus 40 to resolve a trade.
 */
function recommendBars(tf, htf) {
  const ratio = Math.max(1, Math.round(TF_MIN[htf] / TF_MIN[tf]));
  const whole = TF_MIN[htf] % TF_MIN[tf] === 0 && TF_MIN[htf] >= TF_MIN[tf];
  const needs = [
    { need: 300, why: "EMA200 to have a settled value (200 bars plus burn-in)" },
    { need: 310, why: "the signal replay to run at all (260 warm-up + 40 to resolve)" },
    ...(whole ? [{ need: 60 * ratio, why: `60 ${htf} bars for the higher-timeframe row (${ratio} × ${tf} each)` }] : []),
  ];
  const good = Math.min(5000, Math.ceil(Math.max(...needs.map((x) => x.need)) / 100) * 100);
  const min = Math.min(5000, Math.max(300, whole ? 30 * ratio : 300));
  return { min, good, ratio, whole, needs, capped: good >= 5000 };
}

function buildLadder(baseCandles, baseTf) {
  const baseMin = TF_MIN[baseTf];
  const ladder = [];
  for (const tf of TFS) {
    const m = TF_MIN[tf];
    if (m < baseMin) { ladder.push({ tf, available: false, reason: "below the loaded timeframe" }); continue; }
    const ratio = Math.round(m / baseMin);
    if (m % baseMin !== 0) { ladder.push({ tf, available: false, reason: "not a whole multiple of the loaded timeframe" }); continue; }
    const rs = resample(baseCandles, ratio);
    if (rs.length < 30) { ladder.push({ tf, available: false, reason: `only ${rs.length} bars after resampling` }); continue; }
    const a = analyzeSeries(rs, m);
    if (!a) { ladder.push({ tf, available: false, reason: "analysis needs at least 30 bars" }); continue; }
    const e20 = last(a.ema[20].filter((v) => v != null)), e50 = last(a.ema[50].filter((v) => v != null));
    let read = a.structRead;
    if (read === "Neutral" && e20 && e50) read = a.price > e20 && e20 > e50 ? "Bullish" : a.price < e20 && e20 < e50 ? "Bearish" : "Neutral";
    ladder.push({ tf, available: true, read, structure: a.structure.state, strength: a.strength, analysis: a });
  }
  return ladder;
}

/* ============================ CONFLUENCE LEDGER ============================ */
function buildLedger(a, htf, digits = 5) {
  const price = a.price;
  const nearSup = a.sr.sup[0], nearRes = a.sr.res[0];
  const near = (z) => z && price >= z.lo - a.atr * 0.4 && price <= z.hi + a.atr * 0.4;
  const e20 = last(a.ema[20].filter((v) => v != null)), e50 = last(a.ema[50].filter((v) => v != null));
  const sw = a.liq.sweep;
  const bullFVG = a.fvg.zones.find((z) => z.kind === "bullish" && z.inside);
  const bearFVG = a.fvg.zones.find((z) => z.kind === "bearish" && z.inside);

  const rows = [
    { key: "Market structure", max: 2,
      bull: a.structRead === "Bullish" ? 2 : 0, bear: a.structRead === "Bearish" ? 2 : 0,
      why: a.structure.detail },
    { key: "Higher timeframe", max: 2,
      bull: htf?.read === "Bullish" ? 2 : 0, bear: htf?.read === "Bearish" ? 2 : 0,
      why: htf?.available ? `${htf.tf} structure reads ${htf.structure.toLowerCase()} and its trend strength is ${htf.strength.toLowerCase()}.` : "No higher timeframe could be built from the loaded data, so this component scores zero for both sides." },
    { key: "EMA alignment", max: 1,
      bull: a.maRead === "Bullish" ? 1 : 0, bear: a.maRead === "Bearish" ? 1 : 0, why: a.maWhy },
    { key: "Momentum", max: 1,
      bull: a.macdRead === "Bullish" && nz(a.rsiVal, 50) > 50 ? 1 : 0,
      bear: a.macdRead === "Bearish" && nz(a.rsiVal, 50) < 50 ? 1 : 0,
      why: `MACD histogram reads ${a.macdRead.toLowerCase()}${a.rsiVal != null ? ` and RSI is ${a.rsiVal.toFixed(1)}` : ""}. The point is only awarded when both agree.` },
    { key: "Level reaction", max: 1,
      bull: near(nearSup) || bullFVG ? 1 : 0, bear: near(nearRes) || bearFVG ? 1 : 0,
      why: near(nearSup) ? `Price is working inside ${nearSup.name} support (${nearSup.touches} prior reaction${nearSup.touches === 1 ? "" : "s"}).`
        : bullFVG ? `Price is inside an unfilled bullish fair value gap at ${bullFVG.lo.toFixed(digits)}–${bullFVG.hi.toFixed(digits)}, ${bullFVG.barsAgo} bars old (${bullFVG.atrSize.toFixed(1)} ATR wide).`
        : near(nearRes) ? `Price is working inside ${nearRes.name} resistance (${nearRes.touches} prior reaction${nearRes.touches === 1 ? "" : "s"}).`
        : bearFVG ? `Price is inside an unfilled bearish fair value gap at ${bearFVG.lo.toFixed(digits)}–${bearFVG.hi.toFixed(digits)}, ${bearFVG.barsAgo} bars old (${bearFVG.atrSize.toFixed(1)} ATR wide).`
        : "Price is in open space — no mapped zone and no open gap is currently being tested." },
    { key: "Liquidity confirmation", max: 1,
      bull: sw && sw.dir === "down" ? 1 : 0, bear: sw && sw.dir === "up" ? 1 : 0,
      why: sw ? `A recent bar traded ${sw.dir === "down" ? "below" : "above"} ${sw.level.kind.toLowerCase()} and closed back ${sw.dir === "down" ? "above" : "below"} it — resting orders were reached and price did not hold there. This is a sweep, not proof of reversal.` : "No sweep of a mapped liquidity level in the last 12 bars." },
  ];
  /* A component with no data is not evidence against — it is a missing
     measurement. Scoring it out of eight anyway makes a shallow fetch look
     like a weak market, which is how the same chart produced BUY on 1000 bars
     and WAIT on 500. The denominator shrinks to what was actually measurable. */
  rows.forEach((r) => { if (r.measured === undefined) r.measured = true; });
  const htfRow = rows.find((r) => r.key === "Higher timeframe");
  htfRow.measured = !!(htf && htf.available);
  if (!a.ema200Ready) {
    const ma = rows.find((r) => r.key === "EMA alignment");
    ma.why += ` The 200 EMA has too little history to be included (it needs about 260 bars), so alignment is judged on the 20 and 50 only.`;
  }
  const bull = rows.reduce((s, r) => s + r.bull, 0);
  const bear = rows.reduce((s, r) => s + r.bear, 0);
  const reachable = rows.reduce((s, r) => s + (r.measured ? r.max : 0), 0);
  const unmeasured = rows.filter((r) => !r.measured);
  return { rows, bull, bear, max: 8, reachable, unmeasured };
}

function overallBias(led, a) {
  const d = led.bull - led.bear;
  if (led.bull <= 2 && led.bear <= 2) return { state: "NO CLEAR SETUP", tone: "flat" };
  if (d >= 2 && led.bull >= 4) return { state: "BULLISH", tone: "bull" };
  if (d <= -2 && led.bear >= 4) return { state: "BEARISH", tone: "bear" };
  return { state: "NEUTRAL", tone: "warn" };
}

/* ============================== SCENARIO ENGINE ============================ */
function fmt(v, digits) { return v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits); }

function buildScenarios(a, led, htf, digits) {
  const p = a.price, atr = a.atr;
  const res = a.sr.res, sup = a.sr.sup;
  const lastHL = [...a.pivots].reverse().find((x) => x.type === "L");
  const lastLH = [...a.pivots].reverse().find((x) => x.type === "H");
  const demand = a.sd.find((z) => z.kind === "demand" && z.state !== "Broken");
  const supply = a.sd.find((z) => z.kind === "supply" && z.state !== "Broken");
  const eqH = a.liq.levels.find((l) => l.kind === "Equal highs");
  const eqL = a.liq.levels.find((l) => l.kind === "Equal lows");
  const gapAbove = a.fvg.zones.filter((z) => z.mid > p && !z.inside).sort((x, y) => x.mid - y.mid)[0];
  const gapBelow = a.fvg.zones.filter((z) => z.mid < p && !z.inside).sort((x, y) => y.mid - x.mid)[0];

  const bullish = {
    tone: "bull", title: "Scenario A — Bullish continuation",
    score: led.bull,
    condition: [
      lastHL ? `Price holds above the most recent higher low at ${fmt(lastHL.price, digits)}.` : "Price forms a defined swing low that later holds on a retest.",
      demand ? `The ${demand.state.toLowerCase()} demand zone at ${fmt(demand.lo, digits)}–${fmt(demand.hi, digits)} produces a reaction rather than a clean break.` : "Price finds acceptance at or above the nearest mapped support.",
      htf?.available && htf.read === "Bullish" ? `The ${htf.tf} timeframe stays bullish while this happens.` : `The higher timeframe stops working against the idea (it currently reads ${htf?.read?.toLowerCase() || "unavailable"}).`,
    ],
    confirmation: [
      res[0] ? `A candle closing above ${fmt(res[0].hi, digits)} (the top of ${res[0].name}), not just a wick through it.` : "A close above the most recent swing high.",
      "A higher low forming after that close — the break is held, not immediately reclaimed.",
      "MACD histogram above zero and rising on the close that breaks the level.",
    ],
    targets: [res[0] && { label: `${res[0].name} zone`, v: `${fmt(res[0].lo, digits)}–${fmt(res[0].hi, digits)}`, note: `${res[0].touches} prior reaction${res[0].touches === 1 ? "" : "s"}` },
      res[1] && { label: `${res[1].name} zone`, v: `${fmt(res[1].lo, digits)}–${fmt(res[1].hi, digits)}`, note: `${res[1].touches} prior reaction${res[1].touches === 1 ? "" : "s"}` },
      eqH && { label: "Equal highs", v: fmt(eqH.price, digits), note: "resting buy-stops may sit just above" },
      gapAbove && { label: `Unfilled ${gapAbove.kind} FVG`, v: `${fmt(gapAbove.lo, digits)}–${fmt(gapAbove.hi, digits)}`, note: `${gapAbove.atrSize.toFixed(1)} ATR wide, ${gapAbove.barsAgo} bars old` }].filter(Boolean),
    invalidation: lastHL ? `A candle closing below ${fmt(lastHL.price, digits)}. That breaks the higher-low sequence, which is the whole basis of this scenario.` : `A close below ${fmt(p - atr * 1.5, digits)} (1.5 ATR under current price) with no swing low left to defend.`,
  };

  const bearish = {
    tone: "bear", title: "Scenario B — Bearish continuation or reversal",
    score: led.bear,
    condition: [
      lastLH ? `Price stays capped below the most recent swing high at ${fmt(lastLH.price, digits)}.` : "Price forms a defined swing high that then caps the next attempt.",
      supply ? `The ${supply.state.toLowerCase()} supply zone at ${fmt(supply.lo, digits)}–${fmt(supply.hi, digits)} rejects price rather than breaking.` : "Price is rejected at or below the nearest mapped resistance.",
      htf?.available && htf.read === "Bearish" ? `The ${htf.tf} timeframe stays bearish while this happens.` : `The higher timeframe stops supporting longs (it currently reads ${htf?.read?.toLowerCase() || "unavailable"}).`,
    ],
    confirmation: [
      sup[0] ? `A candle closing below ${fmt(sup[0].lo, digits)} (the base of ${sup[0].name}).` : "A close below the most recent swing low.",
      "A lower high forming afterwards — sellers defend the broken level on the retest.",
      "MACD histogram below zero and falling on the breaking close.",
    ],
    targets: [sup[0] && { label: `${sup[0].name} zone`, v: `${fmt(sup[0].lo, digits)}–${fmt(sup[0].hi, digits)}`, note: `${sup[0].touches} prior reaction${sup[0].touches === 1 ? "" : "s"}` },
      sup[1] && { label: `${sup[1].name} zone`, v: `${fmt(sup[1].lo, digits)}–${fmt(sup[1].hi, digits)}`, note: `${sup[1].touches} prior reaction${sup[1].touches === 1 ? "" : "s"}` },
      eqL && { label: "Equal lows", v: fmt(eqL.price, digits), note: "resting sell-stops may sit just below" },
      gapBelow && { label: `Unfilled ${gapBelow.kind} FVG`, v: `${fmt(gapBelow.lo, digits)}–${fmt(gapBelow.hi, digits)}`, note: `${gapBelow.atrSize.toFixed(1)} ATR wide, ${gapBelow.barsAgo} bars old` }].filter(Boolean),
    invalidation: lastLH ? `A candle closing above ${fmt(lastLH.price, digits)}. That makes a higher high and removes the lower-high sequence this scenario depends on.` : `A close above ${fmt(p + atr * 1.5, digits)} (1.5 ATR above current price).`,
  };

  // no-trade conditions, evaluated
  const conflict = htf?.available && htf.read !== "Neutral" && a.structRead !== "Neutral" && htf.read !== a.structRead;
  const midRange = a.sr.sup[0] && a.sr.res[0] && (() => {
    const span = a.sr.res[0].mid - a.sr.sup[0].mid;
    const pos = (p - a.sr.sup[0].mid) / (span || 1);
    return pos > 0.33 && pos < 0.67;
  })();
  const rr = a.sr.res[0] && a.sr.sup[0] ? Math.abs(a.sr.res[0].mid - p) / Math.max(Math.abs(p - a.sr.sup[0].mid), 1e-9) : null;
  const checks = [
    { on: a.structure.state === "Range" || a.structure.state === "Unclear", text: `Structure reads "${a.structure.state.toLowerCase()}" — swings are not stacking in one direction.` },
    { on: !!conflict, text: `Timeframes disagree: ${htf?.tf || "the higher timeframe"} is ${(htf?.read || "").toLowerCase()} while the trading timeframe is ${a.structRead.toLowerCase()}.` },
    { on: !!midRange, text: "Price sits in the middle third of the mapped range — the worst place to enter, because the stop and the target are both far away." },
    { on: rr != null && rr < 1, text: `Nearest resistance is closer than nearest support (about ${rr != null ? rr.toFixed(2) : "—"}:1 of room) — reward is smaller than risk from here.` },
    { on: a.sr.all.length < 2, text: "Fewer than two zones could be mapped from this data — there is not enough reference to define a level." },
    { on: led.bull <= 2 && led.bear <= 2, text: `Neither side clears 3 of 8 on the confluence ledger (bull ${led.bull}, bear ${led.bear}).` },
    { on: a.volatility === "High", text: `ATR is in the upper third of its own recent range (${a.atrPct.toFixed(2)}% of price) — stops that felt normal last week are too tight now.` },
    { on: Math.abs(led.bull - led.bear) < 2 && (led.bull > 2 || led.bear > 2), text: `Bull and bear scores are within one point of each other — the evidence is split.` },
  ].filter((x) => x.on);

  const noTrade = { tone: "warn", title: "Scenario C — No trade / wait", checks,
    active: checks.length >= 2 || (led.bull <= 2 && led.bear <= 2) };

  return { bullish, bearish, noTrade };
}

function currentStatus(led, sc) {
  if (sc.noTrade.active && Math.max(led.bull, led.bear) < 5) return { text: "No clear setup", tone: "flat", icon: "⚪" };
  if (led.bull >= 5 && led.bull - led.bear >= 2) return { text: "Potential bullish setup", tone: "bull", icon: "🟢" };
  if (led.bear >= 5 && led.bear - led.bull >= 2) return { text: "Potential bearish setup", tone: "bear", icon: "🔴" };
  return { text: "Waiting for confirmation", tone: "warn", icon: "🟡" };
}

/* ============================== VERDICT ENGINE =============================
   Turns the ledger, the structural events and the mapped levels into one
   directional read. It always ships with the price that triggers it and the
   price that kills it, because a direction without those is not actionable. */
function buildVerdict(a, led, scen, digits) {
  const gap = led.bull - led.bear;
  const ev = last(a.events);
  const lastHL = [...a.pivots].reverse().find((x) => x.type === "L");
  const lastLH = [...a.pivots].reverse().find((x) => x.type === "H");
  const res = a.sr.res[0], sup = a.sr.sup[0];
  const bullFVG = a.fvg.zones.find((z) => z.kind === "bullish" && z.inside);
  const bearFVG = a.fvg.zones.find((z) => z.kind === "bearish" && z.inside);

  /* Thresholds are proportions of the measurable evidence, not raw counts.
     Five of eight and four of six are the same strength of case; the old fixed
     cut-off silently downgraded every read taken on a shallow fetch. */
  const reach = led.reachable || 8;
  const strong = Math.ceil((5 / 8) * reach);
  const lean = Math.ceil((4 / 8) * reach);

  let action, tone, side;
  if (led.bull >= strong && gap >= 2) { action = "POTENTIAL BUY"; tone = "bull"; side = "bull"; }
  else if (led.bear >= strong && gap <= -2) { action = "POTENTIAL SELL"; tone = "bear"; side = "bear"; }
  else if (Math.max(led.bull, led.bear) >= lean && Math.abs(gap) >= 1) { action = gap > 0 ? "WAIT — LEANING BUY" : "WAIT — LEANING SELL"; tone = "warn"; side = gap > 0 ? "bull" : "bear"; }
  else { action = "NO SETUP"; tone = "flat"; side = null; }

  const trigger = side === "bull"
    ? (res ? `close above ${res.hi.toFixed(digits)}` : lastLH ? `close above ${lastLH.price.toFixed(digits)}` : "a close above the last swing high")
    : side === "bear"
      ? (sup ? `close below ${sup.lo.toFixed(digits)}` : lastHL ? `close below ${lastHL.price.toFixed(digits)}` : "a close below the last swing low")
      : "no level worth watching yet";
  const invalidation = side === "bull"
    ? (lastHL ? lastHL.price.toFixed(digits) : (a.price - a.atr * 1.5).toFixed(digits))
    : side === "bear"
      ? (lastLH ? lastLH.price.toFixed(digits) : (a.price + a.atr * 1.5).toFixed(digits))
      : null;

  // the components actually carrying this read, strongest first
  const carrying = led.rows.filter((r) => (side === "bull" ? r.bull : side === "bear" ? r.bear : 0) > 0)
    .sort((x, y) => (side === "bull" ? y.bull - x.bull : y.bear - x.bear)).map((r) => r.key.toLowerCase());
  const missing = led.rows.filter((r) => (side === "bull" ? r.bull : side === "bear" ? r.bear : 1) === 0).map((r) => r.key.toLowerCase());

  const evText = ev ? `${ev.kind} ${ev.dir === "up" ? "upward" : "downward"} at ${ev.price.toFixed(digits)}, ${a.candles.length - 1 - ev.i} bars ago` : "no break of structure in this data";
  const fvgText = bullFVG ? `price sitting in an unfilled bullish FVG (${bullFVG.lo.toFixed(digits)}–${bullFVG.hi.toFixed(digits)})`
    : bearFVG ? `price sitting in an unfilled bearish FVG (${bearFVG.lo.toFixed(digits)}–${bearFVG.hi.toFixed(digits)})`
    : a.fvg.zones.length ? `${a.fvg.zones.length} unfilled FVG${a.fvg.zones.length === 1 ? "" : "s"} left on the chart, none being tested` : "no unfilled FVG";

  const reason = side
    ? `Carried by ${carrying.slice(0, 3).join(", ")}. Last structural event: ${evText}. ${fvgText.charAt(0).toUpperCase() + fvgText.slice(1)}.`
    : `Neither side clears the bar (bull ${led.bull}, bear ${led.bear}). Last structural event: ${evText}.`;

  const blockers = [];
  if (side && missing.length) blockers.push(`Not yet supporting it: ${missing.join(", ")}.`);
  scen.noTrade.checks.slice(0, 2).forEach((c) => blockers.push(c.text));

  return { action, tone, side, trigger, invalidation, reason, blockers, score: side === "bull" ? led.bull : side === "bear" ? led.bear : 0,
    against: side === "bull" ? led.bear : side === "bear" ? led.bull : 0, ev, evText, fvgText };
}

/* =============================== RISK ENGINE =============================== */
/* ============================== SIGNAL REPLAY ==============================
   The confluence score is a hand-set count of agreeing evidence. On its own it
   claims nothing. This walks the loaded candles bar by bar, rebuilds the entire
   read using only the bars that existed at that moment, and records what price
   actually did next. It is still in-sample, on one instrument, over one period,
   and it excludes spread, commission and slippage — but it replaces an opinion
   about the signal with a measurement of it. */
function htfSnapshot(slice, tfMin, htfMin) {
  if (htfMin % tfMin !== 0) return null;
  const ratio = Math.round(htfMin / tfMin);
  const rs = ratio <= 1 ? slice : resample(slice, ratio);
  if (rs.length < 30) return null;
  const h = analyzeSeries(rs, htfMin);
  if (!h) return null;
  const e20 = last(h.ema[20].filter((v) => v != null)), e50 = last(h.ema[50].filter((v) => v != null));
  let read = h.structRead;
  if (read === "Neutral" && e20 && e50) read = h.price > e20 && e20 > e50 ? "Bullish" : h.price < e20 && e20 < e50 ? "Bearish" : "Neutral";
  return { tf: "higher", available: true, read, structure: h.structure.state, strength: h.strength };
}

function replaySignals({ candles, tfMin, htfMin, digits, horizon = 40, warmup = 260 }) {
  const n = candles.length;
  const need = warmup + horizon + 10;
  if (n < need) return { ok: false, reason: `${n} bars loaded. A replay needs at least ${need}: ${warmup} for the analysis to have history to read, ${horizon} for price to resolve the last signal.` };

  const step = Math.max(1, Math.round((n - warmup - horizon) / 300));
  const trades = [];
  let busyUntil = -1;

  for (let i = warmup; i < n - horizon; i += step) {
    if (i < busyUntil) continue;
    const slice = candles.slice(0, i + 1);
    const a = analyzeSeries(slice, tfMin);
    if (!a) continue;
    const htf = htfSnapshot(slice, tfMin, htfMin);
    const led = buildLedger(a, htf, digits);
    const scen = buildScenarios(a, led, htf, digits);
    const v = buildVerdict(a, led, scen, digits);
    if (!v.side) continue;

    const setup = buildSetup(a, led, scen, v.side);
    if (!setup || setup.t1v == null) continue;
    const { entry, stop, t1v } = setup;
    const risk = Math.abs(entry - stop);
    const long = v.side === "bull";
    if (!(risk > 0)) continue;
    // the plan must be coherent before it is worth measuring
    if (long ? !(t1v > entry && stop < entry) : !(t1v < entry && stop > entry)) continue;

    let fillI = null, out = null, exitI = null;
    for (let j = i + 1; j <= i + horizon && j < n; j++) {
      const k = candles[j];
      if (fillI == null) {
        if (k.l <= entry && k.h >= entry) fillI = j; else continue;
      }
      // stop is checked first: when one bar spans both, assume the worse fill
      if (long ? k.l <= stop : k.h >= stop) { out = "loss"; exitI = j; break; }
      if (long ? k.h >= t1v : k.l <= t1v) { out = "win"; exitI = j; break; }
    }

    if (fillI == null) { trades.push({ i, side: v.side, score: v.score, filled: false, out: "unfilled", r: null }); continue; }
    let r;
    if (out === "win") r = Math.abs(t1v - entry) / risk;
    else if (out === "loss") r = -1;
    else { out = "open"; const px = candles[Math.min(i + horizon, n - 1)].c; r = (long ? px - entry : entry - px) / risk; }
    trades.push({ i, side: v.side, score: v.score, filled: true, out, r });
    busyUntil = (exitI != null ? exitI : i + horizon) + 1;
  }

  const filled = trades.filter((t) => t.filled);
  const wins = filled.filter((t) => t.out === "win").length;
  const losses = filled.filter((t) => t.out === "loss").length;
  const opens = filled.filter((t) => t.out === "open").length;
  const decided = wins + losses;
  const sumR = filled.reduce((s, t) => s + t.r, 0);
  const side = (k) => {
    const f = filled.filter((t) => t.side === k);
    const w = f.filter((t) => t.out === "win").length, l = f.filter((t) => t.out === "loss").length;
    return { n: f.length, w, l, hit: w + l ? w / (w + l) : null, r: f.length ? f.reduce((s, t) => s + t.r, 0) / f.length : null };
  };
  return {
    ok: true, trades, signals: trades.length, filled: filled.length, unfilled: trades.length - filled.length,
    wins, losses, opens, decided, hit: decided ? wins / decided : null,
    expectancy: filled.length ? sumR / filled.length : null, sumR,
    bull: side("bull"), bear: side("bear"), horizon, warmup, step, bars: n,
  };
}

/* ================================ SCALPING =================================
   Scalping is not swing analysis on a faster chart. Two things dominate it and
   neither appears anywhere else in this tool: the spread you pay against a
   target measured in a handful of pips, and whether the session is liquid
   enough for the move to exist at all. Both are modelled here explicitly, and
   a setup that fails either is reported as untradeable rather than shown with
   a caveat. */
const SESSIONS = [
  { key: "sydney", name: "Sydney", from: 21, to: 6 },
  { key: "tokyo", name: "Tokyo", from: 0, to: 9 },
  { key: "london", name: "London", from: 7, to: 16 },
  { key: "newyork", name: "New York", from: 12, to: 21 },
];

/** Which FX sessions are open at a given instant, and how much that helps. */
function sessionState(now = Date.now()) {
  const d = new Date(now);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  const isIn = (s) => (s.from < s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to);
  const open = SESSIONS.filter(isIn);
  const has = (k) => open.some((s) => s.key === k);
  const overlap = has("london") && has("newyork");
  const toOverlap = ((12 - h + 24) % 24) * 60;

  let quality, note;
  if (overlap) { quality = "Best"; note = "London and New York are both open. This is where the day's volume and the tightest spreads are, and where a few pips of movement is normal rather than lucky."; }
  else if (has("london")) { quality = "Good"; note = "London is open. Enough volume for intraday ranges to develop, though the largest moves usually wait for New York."; }
  else if (has("newyork")) { quality = "Good"; note = "New York is open without London. Liquidity thins through the afternoon and trends often stall."; }
  else if (open.length) { quality = "Thin"; quality = "Thin"; note = `${open.map((s) => s.name).join(" and ")} only. Ranges are narrow and spreads wider, so the cost of trading takes a larger share of a small target.`; }
  else { quality = "Closed"; note = "No major session is open. Spreads are at their widest and moves are unreliable — this is the worst time of day to pay a spread."; }
  return { hUtc: h, open, overlap, quality, note, toOverlap, utc: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC` };
}

/**
 * Two intraday setups, both defined only in terms of what the candles show.
 *   Continuation — trend on this timeframe, pullback into the 20 EMA, close back through it.
 *   Range fade   — no trend, price at the edge of its own recent range with a stretched RSI.
 * Everything is then measured against the spread before it is called tradeable.
 */
function buildScalp(a, { spreadPips, pip, at = Date.now(), event = null }) {
  const out = { applicable: a.tfMin <= 15, tfMin: a.tfMin, session: sessionState(at), gates: [], model: null, side: null };
  if (!out.applicable) return out;

  const c = a.candles, n = c.length, px = a.price, atr = a.atr;
  const win = c.slice(-40);
  const rangeHi = Math.max(...win.map((k) => k.h)), rangeLo = Math.min(...win.map((k) => k.l));
  const rangeMid = (rangeHi + rangeLo) / 2, rangeSize = rangeHi - rangeLo;
  const e20 = a.ema[20][n - 1], e50 = a.ema[50][n - 1];
  const rsi = a.rsiVal;
  const last3 = c.slice(-3);
  out.micro = { rangeHi, rangeLo, rangeMid, rangeSize, e20, e50 };

  const upTrend = e20 != null && e50 != null && e20 > e50 && px > e50;
  const downTrend = e20 != null && e50 != null && e20 < e50 && px < e50;
  const flat = e20 != null && e50 != null && Math.abs(e20 - e50) < atr * 0.3;

  let s = null;
  // --- continuation: the pullback has to have actually happened and been rejected
  if (upTrend && rsi != null && rsi > 40 && rsi < 72 && Math.min(...last3.map((k) => k.l)) <= e20 + atr * 0.25 && px > e20) {
    const stop = Math.min(...last3.map((k) => k.l)) - atr * 0.15;
    s = { model: "Continuation", side: "bull", entry: px, stop, why: `The 20 EMA is above the 50 and price pulled back into the 20 within the last three bars, then closed back above it at ${px.toFixed(a.digits || 5)}.` };
  } else if (downTrend && rsi != null && rsi < 60 && rsi > 28 && Math.max(...last3.map((k) => k.h)) >= e20 - atr * 0.25 && px < e20) {
    const stop = Math.max(...last3.map((k) => k.h)) + atr * 0.15;
    s = { model: "Continuation", side: "bear", entry: px, stop, why: "The 20 EMA is below the 50 and price rallied into the 20 within the last three bars, then closed back below it." };
  // --- fade: only where there is no trend to fight
  } else if (flat && rangeSize > atr * 2 && rsi != null && px <= rangeLo + rangeSize * 0.2 && rsi < 32) {
    s = { model: "Range fade", side: "bull", entry: px, stop: rangeLo - atr * 0.3, why: `No trend on this timeframe and price is in the bottom fifth of its own 40-bar range with RSI at ${rsi.toFixed(0)}.` };
  } else if (flat && rangeSize > atr * 2 && rsi != null && px >= rangeHi - rangeSize * 0.2 && rsi > 68) {
    s = { model: "Range fade", side: "bear", entry: px, stop: rangeHi + atr * 0.3, why: `No trend on this timeframe and price is in the top fifth of its own 40-bar range with RSI at ${rsi.toFixed(0)}.` };
  }

  if (!s) {
    out.model = "No setup";
    out.reason = upTrend || downTrend
      ? "There is a trend but price is not at a pullback — entering here means paying the spread to chase a move that has already run."
      : flat ? "Price is mid-range with nothing stretched. A fade needs an edge to fade from."
        : "Neither a clean trend nor a clean range. This is the condition that costs scalpers the most money.";
    return out;
  }

  const spread = spreadPips * pip;
  // you cross the spread on the way in, so the fill is worse than the close
  const entry = s.side === "bull" ? s.entry + spread : s.entry - spread;
  const risk = Math.abs(entry - s.stop);
  const t1 = s.side === "bull" ? entry + risk : entry - risk;
  const t2 = s.side === "bull" ? Math.max(rangeHi, entry + risk * 1.8) : Math.min(rangeLo, entry - risk * 1.8);
  const stopPips = risk / pip, t1Pips = Math.abs(t1 - entry) / pip, t2Pips = Math.abs(t2 - entry) / pip;
  const costR = risk > 0 ? spread / risk : Infinity;
  const costShare = t1Pips > 0 ? spreadPips / t1Pips : Infinity;

  Object.assign(out, { ...s, entry, risk, t1, t2, stopPips, t1Pips, t2Pips, costR, costShare, rr2: risk > 0 ? Math.abs(t2 - entry) / risk : null });

  const g = out.gates;
  g.push({ ok: out.session.quality === "Best" || out.session.quality === "Good", hard: out.session.quality === "Closed" || out.session.quality === "Thin",
    text: `Session: ${out.session.quality.toLowerCase()} — ${out.session.open.map((x) => x.name).join(" + ") || "all closed"} at ${out.session.utc}.` });
  g.push({ ok: costShare <= 0.2, hard: costShare > 0.33,
    text: `Spread is ${(costShare * 100).toFixed(0)}% of the ${t1Pips.toFixed(1)}-pip first target (${spreadPips} pips paid, ${costR.toFixed(2)}R). Above a third, the broker takes more of the trade than a normal edge produces.` });
  g.push({ ok: stopPips >= spreadPips * 4, hard: stopPips < spreadPips * 2,
    text: `Stop is ${stopPips.toFixed(1)} pips, which is ${(stopPips / spreadPips).toFixed(1)}× the spread. Under about four times, ordinary noise plus the spread closes the trade before the idea is wrong.` });
  g.push({ ok: stopPips >= 2.5, hard: stopPips < 1.5, text: `Stop distance ${stopPips.toFixed(1)} pips against ATR of ${(atr / pip).toFixed(1)} pips per bar.` });
  if (event) {
    const near = event.mins <= 30, soon = event.mins <= 120;
    g.push({ ok: !soon, hard: near, text: near
      ? `${event.country} ${event.name} in ${untilText(event.mins)}. Spreads widen and stops slip through a release — this is not a scalping window.`
      : soon ? `${event.country} ${event.name} in ${untilText(event.mins)}. Positions taken now may still be open across it.`
        : `Next high-impact release is ${untilText(event.mins)} away.` });
  } else {
    g.push({ ok: true, text: "No high-impact release loaded for the next few hours. Load the calendar from the left rail if you have not." });
  }

  out.blockers = g.filter((x) => x.hard);
  out.softFails = g.filter((x) => !x.ok && !x.hard);
  out.tradeable = out.blockers.length === 0;
  return out;
}

/** The same rules replayed bar by bar, with the spread charged on every trade. */
function replayScalps({ candles, tfMin, pip, spreadPips, digits, horizon = 15, warmup = 150 }) {
  const n = candles.length;
  const need = warmup + horizon + 10;
  if (n < need) return { ok: false, reason: `${n} bars loaded. A scalp replay needs at least ${need} — ${warmup} for the averages to settle and ${horizon} for each trade to resolve.` };
  const step = Math.max(1, Math.round((n - warmup - horizon) / 400));
  const trades = [];
  let busy = -1;

  for (let i = warmup; i < n - horizon; i += step) {
    if (i < busy) continue;
    const slice = candles.slice(0, i + 1);
    const a = analyzeSeries(slice, tfMin);
    if (!a) continue;
    const sc = buildScalp(a, { spreadPips, pip, at: candles[i].t });
    if (!sc.tradeable || !sc.side) continue;

    const long = sc.side === "bull";
    let out = null, exitI = null;
    for (let j = i + 1; j <= i + horizon && j < n; j++) {
      const k = candles[j];
      if (long ? k.l <= sc.stop : k.h >= sc.stop) { out = "loss"; exitI = j; break; }
      if (long ? k.h >= sc.t1 : k.l <= sc.t1) { out = "win"; exitI = j; break; }
    }
    let r;
    if (out === "win") r = Math.abs(sc.t1 - sc.entry) / sc.risk;
    else if (out === "loss") r = -1;
    else { out = "open"; const px = candles[Math.min(i + horizon, n - 1)].c; r = (long ? px - sc.entry : sc.entry - px) / sc.risk; }
    trades.push({ i, side: sc.side, model: sc.model, out, r, bars: (exitI ?? i + horizon) - i });
    busy = (exitI ?? i + horizon) + 1;
  }

  const wins = trades.filter((t) => t.out === "win").length;
  const losses = trades.filter((t) => t.out === "loss").length;
  const decided = wins + losses;
  const sumR = trades.reduce((s, t) => s + t.r, 0);
  const held = trades.length ? trades.reduce((s, t) => s + t.bars, 0) / trades.length : null;
  const byModel = (m) => {
    const f = trades.filter((t) => t.model === m);
    const w = f.filter((t) => t.out === "win").length, l = f.filter((t) => t.out === "loss").length;
    return { n: f.length, w, l, hit: w + l ? w / (w + l) : null, r: f.length ? f.reduce((s, t) => s + t.r, 0) / f.length : null };
  };
  return {
    ok: true, trades: trades.length, wins, losses, opens: trades.length - decided, decided,
    hit: decided ? wins / decided : null, expectancy: trades.length ? sumR / trades.length : null,
    heldBars: held, heldMins: held != null ? held * tfMin : null,
    cont: byModel("Continuation"), fade: byModel("Range fade"),
    spreadPips, horizon, warmup, step, bars: n,
  };
}

function riskCalc({ balance, riskPct, entry, stop, target, pairKey, atr }) {
  const inst = INSTRUMENTS[pairKey] || INSTRUMENTS["Custom pair"];
  const risk = balance * (riskPct / 100);
  const stopDist = Math.abs(entry - stop);
  const rewardDist = Math.abs(target - entry);
  const dir = stop < entry ? "long" : "short";
  const pips = stopDist / inst.pip;
  const rewardPips = rewardDist / inst.pip;
  const rr = stopDist > 0 ? rewardDist / stopDist : null;
  const units = stopDist > 0 ? risk / stopDist : null;
  const lots = units != null ? units / inst.contract : null;
  const notional = units != null ? units * entry : null;
  const leverage = notional && balance ? notional / balance : null;
  const potentialReward = units != null ? units * rewardDist : null;
  const warnings = [];
  if (riskPct > 2) warnings.push({ level: "high", text: `You are risking ${riskPct}% of the account on one idea. Above roughly 2%, a normal losing streak of six trades takes out more than a tenth of the account.` });
  if (rr != null && rr < 1) warnings.push({ level: "high", text: `Reward-to-risk is ${rr.toFixed(2)}:1. Below 1:1 you need to be right more than half the time just to break even before costs.` });
  if (atr && stopDist < atr * 0.5) warnings.push({ level: "high", text: `The stop is ${(stopDist / atr).toFixed(2)} ATR away. Average movement per bar is larger than the stop distance, so ordinary noise is likely to close the trade.` });
  if (atr && stopDist > atr * 6) warnings.push({ level: "med", text: `The stop is ${(stopDist / atr).toFixed(1)} ATR away. That is wide — check that the position size still reflects the risk you intended.` });
  if (leverage != null && leverage > 20) warnings.push({ level: "high", text: `Position notional is about ${leverage.toFixed(0)}× the account balance. High leverage turns small adverse moves into large account moves.` });
  if (rewardDist === 0) warnings.push({ level: "med", text: "No take-profit distance entered, so reward-to-risk cannot be assessed." });
  return { risk, stopDist, rewardDist, pips, rewardPips, rr, units, lots, notional, leverage, potentialReward, dir, inst, warnings };
}

/* ========================== ILLUSTRATIVE DATA SOURCE ======================= */
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Deterministic synthetic series. Clearly labelled ILLUSTRATIVE everywhere it is used. */
function makeIllustrative(pairKey, tf, n, seedNum) {
  const inst = INSTRUMENTS[pairKey] || INSTRUMENTS["Custom pair"];
  const rnd = mulberry(seedNum);
  const step = TF_MIN[tf] * 60000;
  const scale = Math.sqrt(TF_MIN[tf] / 60);
  const vol = inst.vol * scale;
  let price = inst.seed;
  const out = [];
  let t0 = Date.UTC(2024, 5, 3, 0, 0, 0) - n * step;
  // regime engine: alternating trend / range legs so structure is actually readable
  let bars = 0, regime = 0, legLen = 0, drift = 0; // first iteration always picks a fresh regime
  for (let i = 0; i < n; i++) {
    if (bars >= legLen) { bars = 0; legLen = 35 + Math.floor(rnd() * 60); regime = rnd() < 0.36 ? 0 : rnd() < 0.5 ? -1 : 1; drift = vol * (0.1 + rnd() * 0.25); }
    bars++;
    const o = price;
    const shock = (rnd() + rnd() + rnd() - 1.5) * vol;
    const c = o + shock + regime * drift;
    const wick = vol * (0.35 + rnd() * 0.8);
    const h = Math.max(o, c) + wick * rnd();
    const l = Math.min(o, c) - wick * rnd();
    out.push({ t: t0 + i * step, o, h, l, c, v: Math.round(500 + rnd() * 1500) });
    price = c;
  }
  return out;
}

/* ============================== CSV / OHLC PARSER ========================== */

/* ============================== DATA QUALITY =============================== */
function assessQuality(a, ladder, source) {
  const pts = [];
  const bars = a ? a.candles.length : 0;
  pts.push({ ok: bars >= 150, text: bars >= 150 ? `${bars} bars loaded — enough history to map structure.` : `${bars} bars loaded — thin history limits how much structure can be confirmed.` });
  const piv = a ? a.pivots.length : 0;
  pts.push({ ok: piv >= 6, text: piv >= 6 ? `${piv} confirmed swing points detected.` : `Only ${piv} confirmed swing points — structure reads are fragile with this few.` });
  const higher = ladder.filter((l) => l.available).length;
  pts.push({ ok: higher >= 2, text: higher >= 2 ? `${higher} timeframes could be built from this series for cross-checking.` : "No higher timeframe could be built, so multi-timeframe confirmation is missing." });
  const ema200 = a && last(a.ema[200].filter((v) => v != null)) != null;
  pts.push({ ok: !!ema200, text: ema200 ? "All four EMAs (20/50/100/200) have enough data." : "EMA200 has no value yet — long-term trend context is unavailable." });
  pts.push({ ok: source === "user" || source === "live", text: source === "illustrative" ? "The series is illustrative sample data, not a market feed." : "The series came from data you supplied." });
  const score = pts.filter((p) => p.ok).length;
  const level = score >= 4 ? "High" : score >= 3 ? "Medium" : "Low";
  return { level, pts, score, max: pts.length };
}

/* ============================== LIVE DATA PROVIDERS ========================
   The browser calls the provider directly with the key the user supplies.
   Nothing is proxied, stored or sent anywhere else. Each provider exposes the
   same shape so the rest of the app never learns where the candles came from. */
const pad2 = (n) => String(n).padStart(2, "0");
const tmStamp = (d, dateOnly) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}` + (dateOnly ? "" : `-${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`);

const PROVIDERS = {
  server: {
    label: "This app's own key (server-side)",
    site: "your Vercel environment variables",
    keyHint: "The key lives in a server environment variable and never reaches the browser. Nothing to paste here.",
    serverSide: true,
    intervals: { "1m": 1, "5m": 1, "15m": 1, "30m": 1, "1H": 1, "4H": 1, Daily: 1, Weekly: 1 },
    url({ symbol, tf, bars }) {
      return `/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&bars=${Math.min(bars, 5000)}`;
    },
    parse(j) {
      if (j && j.error) throw new Error(String(j.error));
      const rows = (j && j.candles) || [];
      if (!rows.length) throw new Error("The server route returned no candles. Check the API key environment variable is set in your Vercel project and redeployed.");
      return rows.map((r) => ({ t: Number(r.t), o: Number(r.o), h: Number(r.h), l: Number(r.l), c: Number(r.c), v: r.v == null ? null : Number(r.v) }))
        .filter((r) => [r.o, r.h, r.l, r.c].every(Number.isFinite))
        .sort((a, b) => a.t - b.t);
    },
  },
  twelvedata: {
    label: "Twelve Data",
    site: "twelvedata.com",
    keyHint: "Free tier: 8 requests/minute, 800/day. XAU/USD is included.",
    intervals: { "1m": "1min", "5m": "5min", "15m": "15min", "30m": "30min", "1H": "1h", "4H": "4h", Daily: "1day", Weekly: "1week" },
    url({ key, symbol, tf, bars }) {
      const iv = this.intervals[tf];
      if (!iv) throw new Error(`Twelve Data has no ${tf} interval.`);
      return `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${iv}&outputsize=${Math.min(bars, 5000)}&format=JSON&apikey=${encodeURIComponent(key)}`;
    },
    parse(j) {
      if (j && j.status === "error") throw new Error(j.message || `Provider error code ${j.code}`);
      const vals = j && j.values;
      if (!Array.isArray(vals) || !vals.length) throw new Error("The response contained no candles. Check the symbol is spelled exactly as the provider expects (XAU/USD, with the slash).");
      const rows = vals.map((v) => ({
        t: Date.parse(v.datetime.length <= 10 ? v.datetime + "T00:00:00Z" : v.datetime.replace(" ", "T") + "Z"),
        o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close), v: v.volume != null ? Number(v.volume) : null,
      })).filter((r) => [r.o, r.h, r.l, r.c].every(Number.isFinite));
      rows.sort((a, b) => a.t - b.t); // provider returns newest first
      return rows;
    },
  },
  tradermade: {
    label: "TraderMade",
    site: "tradermade.com",
    keyHint: "Free tier: 5 years daily, 2 months hourly, 2 days of minute data.",
    intervals: { "1m": ["minute", 1], "5m": ["minute", 5], "15m": ["minute", 15], "30m": ["minute", 30], "1H": ["hourly", 1], "4H": ["hourly", 4], Daily: ["daily", 1] },
    url({ key, symbol, tf, bars }) {
      const spec = this.intervals[tf];
      if (!spec) throw new Error(`TraderMade has no ${tf} interval.`);
      const [interval, period] = spec;
      const end = new Date();
      // widen the window well past bars*tf to absorb weekends and market closures
      const span = TF_MIN[tf] * bars * 60000 * (interval === "daily" ? 1.7 : 2.2);
      const start = new Date(end.getTime() - span);
      const dOnly = interval === "daily";
      return `https://marketdata.tradermade.com/api/v1/timeseries?currency=${encodeURIComponent(symbol.replace("/", ""))}&api_key=${encodeURIComponent(key)}&start_date=${tmStamp(start, dOnly)}&end_date=${tmStamp(end, dOnly)}&format=records&interval=${interval}&period=${period}`;
    },
    parse(j) {
      if (j && j.error) throw new Error(String(j.message || j.error));
      const q = j && j.quotes;
      if (!Array.isArray(q) || !q.length) throw new Error("The response contained no candles. Check the symbol (TraderMade expects XAUUSD, no slash) and that the date range is inside your plan's history limit.");
      const rows = q.map((v) => ({
        t: Date.parse(String(v.date).replace(" ", "T") + (String(v.date).length <= 10 ? "T00:00:00Z" : "Z")),
        o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close), v: null,
      })).filter((r) => [r.o, r.h, r.l, r.c].every(Number.isFinite));
      rows.sort((a, b) => a.t - b.t);
      return rows;
    },
  },
};

/** Returns {candles} or throws an Error whose message explains what to try next. */
async function fetchLive({ providerKey, key, symbol, tf, bars }) {
  const p = PROVIDERS[providerKey];
  const url = p.url({ key, symbol, tf, bars });
  if (p.serverSide && typeof window !== "undefined" && window.location.protocol === "blob:") {
    throw new Error("BLOCKED: the server route /api/candles only exists once this is deployed (or running under `vercel dev`). In a preview frame there is no server to call.");
  }
  let res;
  try {
    // A cached response is indistinguishable from a stale market. Both the
    // browser cache and any proxy in between have to be told no.
    const bust = (url.includes("?") ? "&" : "?") + "_=" + Date.now();
    res = await fetch(url + bust, { headers: { Accept: "application/json" }, cache: "no-store" });
  } catch (e) {
    throw new Error(
      "BLOCKED: the request never left the page. This is almost always the sandbox this dashboard runs in refusing outbound calls, or the provider not sending CORS headers — it is not a problem with your key. Run this file in your own browser or a local dev server and the same button will work. Until then, use the paste box below."
    );
  }
  if (res.status === 401) throw new Error("The provider rejected the key (401). Check it was copied whole, with no trailing space.");
  if (res.status === 403) throw new Error("Refused with 403. Either the key is not valid for this symbol or plan, or something between the page and the provider is blocking the call. Try the key in a browser tab first: if the raw URL returns data there but not here, it is the sandbox, not the key.");
  if (res.status === 429) throw new Error("Rate limit hit (429). Free tiers usually allow only a handful of calls per minute — wait a minute, and turn auto-refresh off or slow it down.");
  if (!res.ok) throw new Error(`The provider returned HTTP ${res.status}.`);
  let json;
  try { json = await res.json(); } catch (e) { throw new Error("The provider replied with something that was not JSON."); }
  const candles = p.parse(json);
  if (candles.length < 30) throw new Error(`Only ${candles.length} candles came back. At least 30 are needed before anything can be measured — ask for more bars, or pick a timeframe your plan covers.`);
  // Server time, when the route supplies it, is the only clock both sides agree
  // on — a browser clock that is two minutes out makes a live feed look stale.
  return { candles, serverNow: Number.isFinite(json.serverNow) ? json.serverNow : null, lagMs: Number.isFinite(json.lagMs) ? json.lagMs : null };
}

/* ============================== ECONOMIC CALENDAR ==========================
   Scheduled releases come from /api/calendar, which is a server route because
   no calendar provider sends CORS headers and because a key in the browser is
   a key you have given away. Nothing is fetched unless asked for, and nothing
   is displayed that the route did not return. */
/** The two currencies whose releases can move this pair. */
function pairCurrencies(label) {
  const m = String(label).toUpperCase().match(/\b([A-Z]{3})\b[^A-Z]*\b([A-Z]{3})\b/);
  const known = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY"];
  const out = m ? [m[1], m[2]].filter((c) => known.includes(c)) : [];
  return out.length ? [...new Set(out)] : ["USD"];
}

/** Error payloads arrive as a string from our route and as an object from the
    hosting platform ({error:{code,message}}). Both have to end up readable. */
function errText(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  if (typeof x === "object") {
    const parts = [x.code, x.message || x.error || x.reason].filter((v) => typeof v === "string");
    if (parts.length) return parts.join(" — ");
    try { return JSON.stringify(x).slice(0, 220); } catch (e) { return String(x); }
  }
  return String(x);
}

async function fetchCalendar(days = 7, ccy = ["USD"]) {
  if (typeof window !== "undefined" && window.location.protocol === "blob:") {
    throw new Error("BLOCKED: /api/calendar only exists once this is deployed (or running under `vercel dev`). In a preview frame there is no server to call.");
  }
  const res = await fetch(`/api/calendar?days=${days}&ccy=${encodeURIComponent(ccy.join(","))}`, { headers: { Accept: "application/json" } });
  let j;
  try { j = await res.json(); } catch (e) {
    throw new Error(res.status === 404
      ? "There is no /api/calendar route on this server. It exists only on a deployment (or under `vercel dev`) — a plain `npm run dev` serves the page without any serverless functions."
      : `The calendar route replied with HTTP ${res.status} and something that was not JSON.`);
  }
  if (!res.ok || j.error) throw new Error(errText(j.error) || errText(j.message) || `The calendar route returned HTTP ${res.status}.`);
  if (!Array.isArray(j.events)) throw new Error("The calendar route returned no event array.");
  return j;
}

/** The next high-impact release, and how long until it lands. */
function nextEvent(events, level = "High") {
  const now = Date.now();
  const up = (events || []).filter((e) => e.impact === level && Number.isFinite(e.t) && e.t >= now).sort((a, b) => a.t - b.t);
  if (!up.length) return null;
  const e = up[0];
  const mins = Math.round((e.t - now) / 60000);
  return { ...e, mins, hours: mins / 60 };
}
/** mm:ss for anything under an hour, then h/m — used for bar and lag clocks. */
const untilClock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
  const h = Math.floor(s / 3600);
  return `${h}h ${Math.floor((s % 3600) / 60)}m`;
};
const untilText = (mins) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

/* ================================== UI BITS ================================ */
const toneColor = (t) => (t === "bull" ? T.bull : t === "bear" ? T.bear : t === "warn" ? T.warn : t === "info" ? T.info : T.dim);
const readTone = (r) => (r === "Bullish" ? "bull" : r === "Bearish" ? "bear" : r === "High" ? "warn" : "flat");

function Pill({ tone = "flat", children, solid }) {
  const c = toneColor(tone);
  return <span className="pill" style={solid ? { background: c, color: T.ink, borderColor: c, fontWeight: 600 } : { color: c, borderColor: c + "55", background: c + "14" }}>{children}</span>;
}
function Card({ title, right, children, accent }) {
  return (
    <section className="card fade" style={accent ? { borderTopColor: accent, borderTopWidth: 2 } : undefined}>
      {title && <header><h3>{title}</h3><div style={{ marginLeft: "auto" }}>{right}</div></header>}
      <div className="body">{children}</div>
    </section>
  );
}
function Why({ id, open, setOpen, children }) {
  const on = open === id;
  return (
    <>
      <button className="why" aria-expanded={on} onClick={() => setOpen(on ? null : id)}>WHY?</button>
      {on && <div className="whybox">{children}</div>}
    </>
  );
}
function Stat({ label, value, tone, sub }) {
  return (
    <div className="stat">
      <div className="lbl" style={{ marginBottom: 4 }}>{label}</div>
      <div className="v" style={{ color: tone ? toneColor(tone) : T.text }}>{value}</div>
      {sub && <div className="note" style={{ marginTop: 3, fontSize: 11 }}>{sub}</div>}
    </div>
  );
}
function Bar({ value, max, color }) {
  return <div className="meter"><i style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%`, background: color }} /></div>;
}
function Warn({ level = "med", children }) {
  const c = level === "high" ? T.bear : level === "info" ? T.info : T.warn;
  return <div className="warnbox" style={{ borderColor: c + "66", background: c + "12", color: "#D8E2F0" }}>{children}</div>;
}
function SourceTag({ source }) {
  const map = { live: ["LIVE DATA", T.bull], user: ["USER-PROVIDED DATA", T.info], illustrative: ["ILLUSTRATIVE DATA", T.warn] };
  // A snapshot is only ever labelled LIVE while it is genuinely a fetched series.
  const [txt, c] = map[source] || map.illustrative;
  return <span className="pill" style={{ color: c, borderColor: c + "66", background: c + "14", fontWeight: 600 }}>{txt}</span>;
}

/* ------------------------------------------------- collapsible card shell -- */
function Fold({ title, right, hint, open, onToggle, children, accent }) {
  return (
    <section className="card fold fade" data-open={open ? "1" : "0"} style={accent ? { borderTopColor: accent, borderTopWidth: 2 } : undefined}>
      <header>
        <button className="foldbtn" aria-expanded={open} onClick={onToggle}>
          <h3>{title}</h3>
          {hint && <span className="tag">{hint}</span>}
          {right}
          <span className="chev" style={{ transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </button>
      </header>
      {open && <div className="body">{children}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ icons -- */
const ICON_PATHS = {
  analyzer: <><path d="M7 3v4M7 15v6M17 3v6M17 17v4" /><rect x="4.5" y="7" width="5" height="8" rx="1" /><rect x="14.5" y="9" width="5" height="8" rx="1" /></>,
  structure: <path d="M3 17l5-6 4 4 5-8 4 5" />,
  scenarios: <><path d="M4 12h5" /><path d="M9 12l6-6h5" /><path d="M9 12l6 6h5" /></>,
  risk: <path d="M12 3l7 3v6c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6z" />,
  learn: <><path d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5z" /><path d="M19 18v3H6.5" /></>,
  journal: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  scalp: <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z" />,
};
/** A colour key that matches how the layer actually appears on the chart. */
function Swatch({ sp }) {
  const c = sp.swatch;
  const style = sp.hatch
    ? { background: `repeating-linear-gradient(45deg, ${c[0]} 0 2px, transparent 2px 5px), repeating-linear-gradient(45deg, ${c[1]} 0 2px, transparent 2px 5px)`, backgroundSize: "100% 50%, 100% 50%", backgroundPosition: "top, bottom", backgroundRepeat: "no-repeat" }
    : c.length === 3
      ? { background: `linear-gradient(180deg, ${c[0]} 0 33%, ${c[1]} 33% 66%, ${c[2]} 66% 100%)` }
      : c.length === 2
        ? { background: `linear-gradient(180deg, ${c[1]} 0 50%, ${c[0]} 50% 100%)` }
        : { background: c[0] };
  return <span className="sw" style={style} aria-hidden="true" />;
}

function Ico({ name }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>
  );
}

/* ================================== CHART ================================== */
const clampN = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Axis label: only as much of the stamp as the timeframe and the visible span need. */
function fmtBarTime(t, tfMin, withDate) {
  const d = new Date(t);
  const day = `${pad2(d.getUTCDate())} ${MON3[d.getUTCMonth()]}`;
  const hm = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  if (tfMin >= 10080) return `${day} '${String(d.getUTCFullYear()).slice(2)}`;
  if (tfMin >= 1440) return day;
  return withDate ? `${day} ${hm}` : hm;
}
function fmtBarStamp(t, tfMin) {
  const d = new Date(t);
  const base = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  return tfMin >= 1440 ? base : `${base} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

/**
 * One SVG, stacked panels: price, then whichever subpanels are switched on, then a
 * shared time axis. The crosshair spans all of them, which is the whole point of
 * keeping them in a single coordinate space.
 */
function ChartPanel({ a, digits, layers, scenarioLines }) {
  const wrap = useRef(null);
  const svgRef = useRef(null);
  const geo = useRef({ padL: 8, plotW: 800, len: 1 });
  const drag = useRef(null);
  const [w, setW] = useState(900);
  const [panes, setPanes] = useState({ rsi: true, macd: false, volume: false });
  const [hover, setHover] = useState(null);
  const [dragging, setDragging] = useState(false);
  const len = a ? a.candles.length : 0;
  const [view, setView] = useState({ span: 150, end: len });

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(320, e[0].contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  // A different series — reload, refresh, timeframe change — snaps back to the newest bar.
  useEffect(() => { setView((v) => ({ span: clampN(v.span, Math.min(30, len || 30), Math.max(len, 30)), end: len })); }, [len]);

  const zoomAt = useCallback((frac, factor) => {
    setView((v) => {
      const total = geo.current.len || 1;
      const span = clampN(Math.round(v.span * factor), Math.min(30, total), total);
      const anchor = v.end - v.span + frac * v.span;
      return { span, end: clampN(Math.round(anchor + (1 - frac) * span), span, total) };
    });
  }, []);

  // Wheel has to be a native non-passive listener: React's synthetic one cannot preventDefault.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (!e.deltaY) return;
      e.preventDefault();
      const g = geo.current;
      const r = el.getBoundingClientRect();
      zoomAt(clampN((e.clientX - r.left - g.padL) / g.plotW, 0, 1), e.deltaY > 0 ? 1.18 : 1 / 1.18);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, a ? 1 : 0]);

  if (!a) return null;

  /* ---- geometry ---- */
  const narrow = w < 560;
  const padL = 8, padR = narrow ? 52 : 64, padT = 12, GAP = 10, AXIS_H = 22;
  const priceH = narrow ? 300 : 384;
  const total = a.candles.length;
  const span = clampN(view.span, Math.min(30, total), total);
  const end = clampN(view.end, span, total);
  const start = end - span;
  const c = a.candles.slice(start, end);
  const plotW = Math.max(80, w - padL - padR);
  const plotH = priceH - padT - 6;
  const step = plotW / span;
  const cw = Math.max(1, Math.min(15, step * 0.62));
  geo.current = { padL, plotW, len: total };

  const subs = [];
  let cur = padT + plotH + GAP;
  if (panes.rsi) { subs.push({ key: "rsi", y0: cur, h: 76 }); cur += 86; }
  if (panes.macd) { subs.push({ key: "macd", y0: cur, h: 78 }); cur += 88; }
  if (panes.volume) { subs.push({ key: "volume", y0: cur, h: 56 }); cur += 66; }
  const axisY = cur;
  const H = axisY + AXIS_H;

  let lo = Math.min(...c.map((k) => k.l)), hi = Math.max(...c.map((k) => k.h));
  const extra = [];
  if (layers.sr) a.sr.all.forEach((z) => extra.push(z.lo, z.hi));
  if (layers.fvg) a.fvg.zones.forEach((z) => extra.push(z.lo, z.hi));
  if (layers.scenario) scenarioLines.forEach((l) => extra.push(l.price));
  extra.filter(Number.isFinite).forEach((v) => { if (v > lo - (hi - lo) * 0.5 && v < hi + (hi - lo) * 0.5) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
  const pad = (hi - lo) * 0.06 || 1;
  lo -= pad; hi += pad;

  const X = (i) => padL + (i + 0.5) * step;
  const Y = (p) => padT + (1 - (p - lo) / (hi - lo)) * plotH;
  const paneY = (p, frac) => p.y0 + 13 + (1 - clampN(frac, 0, 1)) * (p.h - 18);
  const idx = (g) => g - start;
  const inView = (g) => g >= start && g < end;

  const EMAS = [[20, "#6EA8FF"], [50, "#F2A93B"], [200, "#A97BFF"]];
  const emaLine = ([period, color]) => {
    const arr = a.ema[period], pts = [];
    for (let i = 0; i < c.length; i++) { const v = arr[start + i]; if (v != null) pts.push(`${X(i)},${Y(v)}`); }
    return pts.length > 1 ? <polyline key={period} points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.3" opacity="0.9" /> : null;
  };

  const ticks = 6;
  const priceTicks = Array.from({ length: ticks }, (_, i) => lo + ((hi - lo) * i) / (ticks - 1));
  const tickCount = Math.max(2, Math.min(9, Math.floor(plotW / 96)));
  const tickStep = Math.max(1, Math.ceil(span / tickCount));
  const timeTicks = [];
  for (let i = span - 1; i >= 0; i -= tickStep) timeTicks.push(i);
  const withDate = a.tfMin < 1440 && span * a.tfMin > 1440;

  const rsiV = a.rsi.slice(start, end);
  const mH = a.macd.hist.slice(start, end), mL = a.macd.line.slice(start, end), mS = a.macd.signal.slice(start, end);
  const mMax = Math.max(1e-12, ...[...mH, ...mL, ...mS].filter((v) => v != null).map(Math.abs));
  const vols = c.map((k) => nz(k.v, 0));
  const volMax = Math.max(0, ...vols);

  const labelColor = { HH: T.bull, HL: T.bull, LH: T.bear, LL: T.bear, H: T.dim, L: T.dim };
  // Past ~220 visible bars, per-bar text stops being readable and starts being noise.
  const dense = span > 220;
  const named = new Set([a.sr.sup[0], a.sr.res[0]].filter(Boolean).map((z) => z.name));
  const liveFvg = a.fvg.zones.find((z) => z.inside) || a.fvg.zones[0];
  const hi_ = hover != null && hover >= 0 && hover < c.length ? hover : null;
  const hk = hi_ != null ? c[hi_] : null;

  /* ---- pan + hover ---- */
  const onDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { x: e.clientX, end };
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onMove = (e) => {
    if (drag.current) {
      const shift = Math.round(-(e.clientX - drag.current.x) / step);
      const nEnd = clampN(drag.current.end + shift, span, total);
      if (nEnd !== end) setView({ span, end: nEnd });
      if (hover != null) setHover(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - padL) / step);
    setHover(i >= 0 && i < span ? i : null);
  };
  const onUp = (e) => {
    if (!drag.current) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    drag.current = null; setDragging(false);
  };

  const setSpan = (n) => setView((v) => { const s = clampN(n, Math.min(30, total), total); return { span: s, end: clampN(v.end, s, total) }; });
  const pan = (bars) => setView((v) => ({ span, end: clampN(v.end + bars, span, total) }));
  const presets = [60, 150, 300, 600].filter((n) => n < total);
  const pane = (k) => setPanes((s) => ({ ...s, [k]: !s[k] }));
  const emaVal = (p) => { const v = a.ema[p][end - 1]; return v == null ? "—" : v.toFixed(digits); };

  return (
    <div ref={wrap} style={{ width: "100%" }}>
      <div className="cbar">
        <span className="lbl" style={{ margin: 0 }}>Zoom</span>
        {presets.map((n) => <button key={n} className="zbtn" data-on={span === n ? "1" : "0"} onClick={() => setSpan(n)}>{n}</button>)}
        <button className="zbtn" data-on={span === total ? "1" : "0"} onClick={() => setSpan(total)}>All</button>
        <button className="zbtn" onClick={() => zoomAt(0.5, 1 / 1.35)} aria-label="Zoom in">+</button>
        <button className="zbtn" onClick={() => zoomAt(0.5, 1.35)} aria-label="Zoom out">−</button>
        <span className="sep" />
        <button className="zbtn" onClick={() => pan(-Math.max(1, Math.round(span / 4)))} disabled={start === 0} aria-label="Scroll back">‹</button>
        <button className="zbtn" onClick={() => pan(Math.max(1, Math.round(span / 4)))} disabled={end === total} aria-label="Scroll forward">›</button>
        {end !== total && <button className="zbtn" onClick={() => setView({ span, end: total })}>Latest</button>}
        <span className="sep" />
        <span className="lbl" style={{ margin: 0 }}>Panels</span>
        {[["rsi", "RSI"], ["macd", "MACD"], ["volume", "Volume"]].map(([k, l]) => (
          <button key={k} className="zbtn" data-on={panes[k] ? "1" : "0"} onClick={() => pane(k)}>{l}</button>
        ))}
        <span className="tag" style={{ marginLeft: "auto" }}>bars {start + 1}–{end} of {total}</span>
      </div>

      <div className="cwrap" data-drag={dragging ? "1" : "0"}>
        <svg ref={svgRef} width={w} height={H} role="img" aria-label={`Annotated price chart, bars ${start + 1} to ${end} of ${total}`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
          onPointerLeave={() => { if (!drag.current) setHover(null); }}
          onDoubleClick={() => setView({ span: Math.min(150, total), end: total })}>
          <defs>
            <pattern id="fvgBull" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="rgba(20,192,138,0.07)" />
              <line x1="0" y1="0" x2="0" y2="7" stroke={T.bull} strokeWidth="1.6" opacity="0.5" />
            </pattern>
            <pattern id="fvgBear" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="rgba(240,69,90,0.07)" />
              <line x1="0" y1="0" x2="0" y2="7" stroke={T.bear} strokeWidth="1.6" opacity="0.5" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={w} height={H} fill={T.panel} />

          {/* price gridlines + right-hand price scale */}
          {priceTicks.map((p, i) => (
            <g key={"pt" + i}>
              <line x1={padL} x2={w - padR} y1={Y(p)} y2={Y(p)} stroke={T.line} strokeWidth="1" />
              <text x={w - padR + 6} y={Y(p) + 3.5} fill={T.faint} fontSize="10" fontFamily="IBM Plex Mono, monospace">{p.toFixed(digits)}</text>
            </g>
          ))}

          {/* time gridlines across every panel */}
          {timeTicks.map((i) => (
            <line key={"tg" + i} x1={X(i)} x2={X(i)} y1={padT} y2={axisY} stroke={T.line} strokeWidth="1" opacity="0.55" />
          ))}

          {layers.sr && a.sr.all.map((z, i) => (
            <g key={"z" + i}>
              <rect x={padL} y={Y(z.hi)} width={plotW} height={Math.max(2, Y(z.lo) - Y(z.hi))}
                fill={z.side === "support" ? T.bullDim : T.bearDim} stroke={(z.side === "support" ? T.bull : T.bear) + "55"} strokeWidth="1" />
              {named.has(z.name) && <text x={padL + 5} y={Y(z.hi) - 3} fill={z.side === "support" ? T.bull : T.bear} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">{z.name} · {z.touches}×</text>}
            </g>
          ))}

          {layers.sd && a.sd.map((z, i) => inView(z.i) && (
            <rect key={"sd" + i} x={X(idx(z.i))} y={Y(z.hi)} width={Math.max(4, w - padR - X(idx(z.i)))} height={Math.max(2, Y(z.lo) - Y(z.hi))}
              fill={z.kind === "demand" ? "rgba(20,192,138,0.10)" : "rgba(240,69,90,0.10)"}
              stroke={(z.kind === "demand" ? T.bull : T.bear) + "44"} strokeDasharray="3 3" strokeWidth="1" />
          ))}

          {layers.fvg && a.fvg.zones.filter((z) => z.i < end).map((z, i) => {
            const x0 = Math.max(padL, X(idx(z.i)));
            const yTop = Y(z.hi), hh = Math.max(2.5, Y(z.lo) - Y(z.hi));
            return (
              <g key={"f" + i}>
                <rect x={x0} y={yTop} width={Math.max(6, w - padR - x0)} height={hh}
                  fill={z.kind === "bullish" ? "url(#fvgBull)" : "url(#fvgBear)"}
                  stroke={(z.kind === "bullish" ? T.bull : T.bear) + "66"} strokeWidth="1" />
                {z === liveFvg && (
                  <text x={x0 + 4} y={yTop + hh / 2 + 3} fill={z.kind === "bullish" ? T.bull : T.bear}
                    fontSize="8.5" fontWeight="700" fontFamily="IBM Plex Mono, monospace">
                    FVG{z.state === "Partially filled" ? " \u00bd" : ""}
                  </text>
                )}
              </g>
            );
          })}

          {layers.liquidity && a.liq.levels.slice(0, 3).map((l, i) => (
            <g key={"l" + i}>
              <line x1={padL} x2={w - padR} y1={Y(l.price)} y2={Y(l.price)} stroke={T.violet} strokeWidth="1" strokeDasharray="2 4" opacity="0.8" />
              <text x={padL + 5} y={Y(l.price) - 3} fill={T.violet} fontSize="9" fontFamily="IBM Plex Mono, monospace" opacity="0.95">{l.kind}</text>
            </g>
          ))}

          {layers.ema && <g>{EMAS.map(emaLine)}</g>}

          {c.map((k, i) => {
            const up = k.c >= k.o, col = up ? T.bull : T.bear;
            const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
            return (
              <g key={i}>
                <line x1={X(i)} x2={X(i)} y1={Y(k.h)} y2={Y(k.l)} stroke={col} strokeWidth="1" />
                <rect x={X(i) - cw / 2} y={y1} width={cw} height={Math.max(1, y2 - y1)} fill={up ? "none" : col} stroke={col} strokeWidth="1" />
              </g>
            );
          })}

          {layers.structure && !dense && a.pivots.filter((p) => inView(p.i)).map((p, i) => (
            <text key={"p" + i} x={X(idx(p.i))} y={p.type === "H" ? Y(p.price) - 6 : Y(p.price) + 13}
              fill={labelColor[p.label] || T.dim} fontSize="9.5" fontWeight="600" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{p.label}</text>
          ))}

          {layers.structure && a.events.filter((e) => inView(e.i)).map((e, i) => (
            <g key={"e" + i}>
              <line x1={X(Math.max(0, idx(e.i) - 6))} x2={X(Math.min(span - 1, idx(e.i) + 3))} y1={Y(e.price)} y2={Y(e.price)}
                stroke={e.dir === "up" ? T.bull : T.bear} strokeWidth="1.2" strokeDasharray="5 3" />
              {!dense && <text x={X(idx(e.i)) + 5} y={Y(e.price) - 4} fill={e.dir === "up" ? T.bull : T.bear} fontSize="9" fontWeight="700" fontFamily="IBM Plex Mono, monospace">{e.kind}</text>}
            </g>
          ))}

          {layers.scenario && scenarioLines.filter((l) => l.price > lo && l.price < hi).map((l, i) => (
            <g key={"s" + i}>
              <line x1={padL} x2={w - padR} y1={Y(l.price)} y2={Y(l.price)} stroke={toneColor(l.tone)} strokeWidth="1.1" strokeDasharray="7 4" opacity="0.85" />
              <text x={w - padR - 4} y={Y(l.price) - 4} fill={toneColor(l.tone)} fontSize="9" textAnchor="end" fontFamily="IBM Plex Mono, monospace">{l.label}</text>
            </g>
          ))}

          {/* last price */}
          <line x1={padL} x2={w - padR} y1={Y(a.price)} y2={Y(a.price)} stroke={T.text} strokeWidth="1" opacity="0.55" />
          <rect x={w - padR + 1} y={Y(a.price) - 8} width={padR - 4} height={16} fill={T.text} rx="3" />
          <text x={w - padR + 5} y={Y(a.price) + 3.5} fill={T.ink} fontSize="10" fontWeight="700" fontFamily="IBM Plex Mono, monospace">{a.price.toFixed(digits)}</text>

          {/* ---------------------------- subpanels ---------------------------- */}
          {subs.map((p) => {
            if (p.key === "rsi") {
              const pts = rsiV.map((v, i) => (v == null ? null : `${X(i)},${paneY(p, v / 100)}`)).filter(Boolean);
              return (
                <g key="rsi">
                  <line x1={padL} x2={w - padR} y1={p.y0} y2={p.y0} stroke={T.line} strokeWidth="1" />
                  {[30, 50, 70].map((lv) => (
                    <g key={lv}>
                      <line x1={padL} x2={w - padR} y1={paneY(p, lv / 100)} y2={paneY(p, lv / 100)} stroke={lv === 50 ? T.line : T.line2} strokeDasharray={lv === 50 ? "" : "3 3"} strokeWidth="1" />
                      <text x={w - padR + 6} y={paneY(p, lv / 100) + 3} fill={T.faint} fontSize="9" fontFamily="IBM Plex Mono, monospace">{lv}</text>
                    </g>
                  ))}
                  {pts.length > 1 && <polyline points={pts.join(" ")} fill="none" stroke={T.info} strokeWidth="1.3" />}
                  <text x={padL + 4} y={p.y0 + 11} fill={T.faint} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">RSI 14 · {a.rsiVal != null ? a.rsiVal.toFixed(1) : "—"}</text>
                </g>
              );
            }
            if (p.key === "macd") {
              const f = (v) => (v == null ? null : (v / mMax + 1) / 2);
              const lPts = mL.map((v, i) => (v == null ? null : `${X(i)},${paneY(p, f(v))}`)).filter(Boolean);
              const sPts = mS.map((v, i) => (v == null ? null : `${X(i)},${paneY(p, f(v))}`)).filter(Boolean);
              const zeroY = paneY(p, 0.5);
              const bw = Math.max(1, Math.min(9, step * 0.55));
              return (
                <g key="macd">
                  <line x1={padL} x2={w - padR} y1={p.y0} y2={p.y0} stroke={T.line} strokeWidth="1" />
                  <line x1={padL} x2={w - padR} y1={zeroY} y2={zeroY} stroke={T.line2} strokeWidth="1" />
                  <text x={w - padR + 6} y={zeroY + 3} fill={T.faint} fontSize="9" fontFamily="IBM Plex Mono, monospace">0</text>
                  {mH.map((v, i) => {
                    if (v == null) return null;
                    const y = paneY(p, f(v));
                    return <rect key={i} x={X(i) - bw / 2} y={Math.min(y, zeroY)} width={bw} height={Math.max(0.8, Math.abs(zeroY - y))}
                      fill={v >= 0 ? T.bull : T.bear} opacity="0.5" />;
                  })}
                  {lPts.length > 1 && <polyline points={lPts.join(" ")} fill="none" stroke={T.info} strokeWidth="1.2" />}
                  {sPts.length > 1 && <polyline points={sPts.join(" ")} fill="none" stroke={T.warn} strokeWidth="1.2" />}
                  <text x={padL + 4} y={p.y0 + 11} fill={T.faint} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">MACD 12/26/9 · histogram {last(mH.filter((v) => v != null)) != null ? last(mH.filter((v) => v != null)).toFixed(digits > 2 ? 5 : 3) : "—"}</text>
                </g>
              );
            }
            const bw = Math.max(1, Math.min(11, step * 0.6));
            return (
              <g key="volume">
                <line x1={padL} x2={w - padR} y1={p.y0} y2={p.y0} stroke={T.line} strokeWidth="1" />
                {volMax > 0 ? (
                  <>
                    {vols.map((v, i) => {
                      const y = paneY(p, v / volMax), base = paneY(p, 0);
                      return <rect key={i} x={X(i) - bw / 2} y={y} width={bw} height={Math.max(0.8, base - y)}
                        fill={c[i].c >= c[i].o ? T.bull : T.bear} opacity="0.42" />;
                    })}
                    <text x={w - padR + 6} y={paneY(p, 1) + 8} fill={T.faint} fontSize="9" fontFamily="IBM Plex Mono, monospace">{volMax >= 1000 ? `${Math.round(volMax / 1000)}k` : Math.round(volMax)}</text>
                    <text x={padL + 4} y={p.y0 + 11} fill={T.faint} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">Volume</text>
                  </>
                ) : (
                  <text x={padL + 4} y={p.y0 + 11} fill={T.faint} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">Volume — not present in this data</text>
                )}
              </g>
            );
          })}

          {/* ---------------------------- time axis ---------------------------- */}
          <line x1={padL} x2={w - padR} y1={axisY} y2={axisY} stroke={T.line2} strokeWidth="1" />
          {timeTicks.map((i) => {
            const x = clampN(X(i), padL + 22, w - padR - 22);
            return <text key={"tt" + i} x={x} y={axisY + 14} fill={T.faint} fontSize="9.5" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{fmtBarTime(c[i].t, a.tfMin, withDate)}</text>;
          })}

          {/* ---------------------------- crosshair ---------------------------- */}
          {hk && (
            <g pointerEvents="none">
              <line x1={X(hi_)} x2={X(hi_)} y1={padT} y2={axisY} stroke={T.text} strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
              <line x1={padL} x2={w - padR} y1={Y(hk.c)} y2={Y(hk.c)} stroke={T.text} strokeWidth="1" strokeDasharray="3 3" opacity="0.28" />
              <rect x={w - padR + 1} y={Y(hk.c) - 8} width={padR - 4} height={16} fill={T.panel2} stroke={T.line2} rx="3" />
              <text x={w - padR + 5} y={Y(hk.c) + 3.5} fill={T.text} fontSize="10" fontFamily="IBM Plex Mono, monospace">{hk.c.toFixed(digits)}</text>
              <rect x={clampN(X(hi_) - 44, padL, w - padR - 88)} y={axisY + 2} width="88" height="17" fill={T.panel2} stroke={T.line2} rx="3" />
              <text x={clampN(X(hi_), padL + 44, w - padR - 44)} y={axisY + 14} fill={T.text} fontSize="9.5" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{fmtBarTime(hk.t, a.tfMin, a.tfMin < 1440)}</text>
            </g>
          )}
        </svg>

        {hk && (
          <div className="tip" style={{ left: X(hi_), transform: X(hi_) > plotW * 0.58 ? "translateX(calc(-100% - 16px))" : "translateX(16px)" }}>
            <b>{fmtBarStamp(hk.t, a.tfMin)}</b>
            {[["O", hk.o], ["H", hk.h], ["L", hk.l], ["C", hk.c]].map(([k, v]) => (
              <div className="r" key={k}><span>{k}</span><em style={{ color: k === "C" ? (hk.c >= hk.o ? T.bull : T.bear) : T.text }}>{v.toFixed(digits)}</em></div>
            ))}
            <div className="r"><span>Change</span><em style={{ color: hk.c >= hk.o ? T.bull : T.bear }}>{(hk.c - hk.o >= 0 ? "+" : "") + (hk.c - hk.o).toFixed(digits)} ({(((hk.c - hk.o) / hk.o) * 100).toFixed(2)}%)</em></div>
            {hk.v != null && <div className="r"><span>Vol</span><em>{Math.round(hk.v).toLocaleString()}</em></div>}
            <div className="div" />
            {layers.ema && EMAS.map(([p, col]) => {
              const v = a.ema[p][start + hi_];
              return <div className="r" key={p}><span style={{ color: col }}>EMA{p}</span><em>{v == null ? "—" : v.toFixed(digits)}</em></div>;
            })}
            <div className="r"><span>RSI</span><em>{rsiV[hi_] == null ? "—" : rsiV[hi_].toFixed(1)}</em></div>
            <div className="r"><span>MACD hist</span><em style={{ color: mH[hi_] == null ? T.text : mH[hi_] >= 0 ? T.bull : T.bear }}>{mH[hi_] == null ? "—" : mH[hi_].toFixed(digits > 2 ? 5 : 3)}</em></div>
          </div>
        )}
      </div>

      <div className="legend">
        {layers.ema && EMAS.map(([p, col]) => <span key={p}><i style={{ borderColor: col }} />EMA{p} <em>{emaVal(p)}</em></span>)}
        <span><i style={{ borderColor: T.bull }} />up bar</span>
        <span><i style={{ borderColor: T.bear }} />down bar</span>
        {panes.macd && <><span><i style={{ borderColor: T.info }} />MACD line</span><span><i style={{ borderColor: T.warn }} />signal</span></>}
        <span style={{ marginLeft: "auto", color: T.faint }}>drag to pan · scroll to zoom · double-click to reset · hover for values{a.tfMin < 1440 ? " · times UTC" : ""}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------- navigation, by workflow -- */
const NAV_GROUPS = [
  { stage: "Decide", items: [["desk", "Trade desk", "scenarios"], ["scalp", "Scalping", "scalp"], ["chart", "Chart", "analyzer"]] },
  { stage: "Detail", items: [["detail", "Breakdown", "learn"], ["risk", "Risk calc", "risk"], ["journal", "Journal", "journal"]] },
];
const PAGE_TITLE = { desk: "Trade desk", scalp: "Scalping", chart: "Chart", detail: "Breakdown", risk: "Risk calc", journal: "Journal" };
const LAYER_KEYS = ["ema", "sr", "sd", "liquidity", "fvg", "structure", "scenario"];
const LAYER_SPEC = [
  {
    key: "ema", label: "EMAs", swatch: ["#6EA8FF", "#F2A93B", "#A97BFF"],
    what: "20, 50 and 200 exponential moving averages.",
    rule: "Plotted from the close of every loaded bar. Their order — price above 20 above 50 above 200, or the mirror — is what the moving-average row on the Breakdown page scores. Current values sit in the legend under the chart.",
    count: (a) => `${[20, 50, 200].filter((p) => a.ema[p].some((v) => v != null)).length} of 3 plotted`,
  },
  {
    key: "sr", label: "S/R zones", swatch: [T.bull, T.bear],
    what: "Support and resistance bands, named S1/R1 outward from price.",
    rule: "Swing pivots at a similar price are clustered together — within 0.55 ATR, or 4 basis points of price, whichever is wider — and drawn as a band rather than a line. The label carries how many times price reacted there. Only the nearest support and resistance are labelled on the chart; the full table is on the Chart page below.",
    count: (a) => `${a.sr.all.length} zones · ${a.sr.sup.length} below, ${a.sr.res.length} above`,
  },
  {
    key: "structure", label: "Structure", swatch: [T.bull, T.bear],
    what: "HH / HL / LH / LL pivot labels, and BOS / CHOCH break markers.",
    rule: "A pivot is confirmed only once it is the highest high (or lowest low) of the two bars either side of it — which means the most recent bars can never carry a label yet. BOS or CHOCH is marked where a candle closed through a prior swing. Labels switch off past 220 visible bars, where they stop being readable.",
    count: (a) => `${a.pivots.length} pivots · ${a.events.length} breaks`,
  },
  {
    key: "fvg", label: "FVG", swatch: [T.bull, T.bear], hatch: true,
    what: "Fair value gaps — three-bar imbalances price has not filled.",
    rule: "Bar 1's high sits below bar 3's low, or the mirror, leaving a gap the middle bar tore through. Gaps smaller than 0.22 ATR are ignored as noise. Hatched forward to the right edge until price trades back through; only the gap currently being tested carries a tag.",
    count: (a) => `${a.fvg.zones.length} unfilled${a.fvg.zones.some((z) => z.inside) ? " · price in one" : ""}`,
  },
  {
    key: "sd", label: "Supply / demand", swatch: [T.bull, T.bear],
    what: "The base candle a strong move originated from, extended forward.",
    rule: "A tight candle — body under 0.65 ATR — followed by a move of at least 1.6 ATR within three bars. The premise is that orders left unfilled at the origin may still rest there. Overlapping zones of the same kind are merged, newest kept.",
    count: (a) => `${a.sd.length} zones`,
  },
  {
    key: "liquidity", label: "Liquidity", swatch: [T.violet],
    what: "Equal highs and lows, plus the previous session's extremes.",
    rule: "Two swing points within 0.28 ATR of each other count as equal, and the prior day's high and low are added from the candle timestamps. These are the prices where stop orders tend to rest — not levels to trade off, but places price often reaches for. The three nearest are drawn.",
    count: (a) => `${a.liq.levels.length} levels${a.liq.sweep ? " · one swept recently" : ""}`,
  },
  {
    key: "scenario", label: "Scenario levels", swatch: [T.warn],
    what: "Entry, target and invalidation prices from the Trade desk.",
    rule: "Taken from the scenario the evidence currently favours, so they move as the read changes. They are consequences of the analysis, not inputs to it.",
    count: (a, lines) => `${lines.length} levels`,
  },
];
const LAYER_PRESETS = {
  clean: { ema: true, sr: false, sd: false, liquidity: false, fvg: false, structure: false, scenario: false },
  standard: { ema: true, sr: true, sd: false, liquidity: false, fvg: false, structure: true, scenario: false },
  full: { ema: true, sr: true, sd: true, liquidity: true, fvg: true, structure: true, scenario: true },
};

/* ================================ MAIN APP ================================= */
export default function ForexAnalyzer() {
  const [tab, setTab] = useState("desk");
  const [pair, setPair] = useState("EUR/USD");
  const [customPair, setCustomPair] = useState("");
  const [tradeTf, setTradeTf] = useState("1H");
  const [htfTf, setHtfTf] = useState("4H");

  const [source, setSource] = useState("illustrative");
  const seedNum = 7; // the sample series is a fixed placeholder, not a setting

  const [openWhy, setOpenWhy] = useState(null);
  const [layers, setLayers] = useState({ ...LAYER_PRESETS.standard });
  const [checks, setChecks] = useState({});
  const [teach, setTeach] = useState(false);
  const [events, setEvents] = useState([]);
  const [live, setLive] = useState({ provider: "twelvedata", key: "", bars: 500, tf: null, symbol: null, candles: null, fetchedAt: null, status: "idle", error: null });
  const [auto, setAuto] = useState(0);
  const [eventDraft, setEventDraft] = useState({ when: "", name: "", impact: "High" });
  const [navOpen, setNavOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [closedOnly, setClosedOnly] = useState(true);
  const [cal, setCal] = useState({ status: "idle", events: [], source: null, fetchedAt: null, error: null });


  const digits = (INSTRUMENTS[pair] || INSTRUMENTS["Custom pair"]).digits;
  const pairLabel = pair === "Custom pair" ? (customPair.trim() || "Custom pair") : pair;

  /* ---- DATA LAYER ---- */
  const rawAll = useMemo(() => {
    if (source === "live" && live.candles && live.candles.length >= 30) return live.candles;
    return makeIllustrative(pair, tradeTf, 620, seedNum);
  }, [source, live.candles, pair, tradeTf, seedNum]);

  /* The newest candle a provider sends is still open: its high, low and close
     will all change before it finishes. Analysing it makes structure signals
     repaint — a BOS that appears at 14:32 and is gone by 14:35. Dropping it
     costs freshness in the readings and buys the property that a signal, once
     printed, stays printed. The live price is kept separately for display. */
  const livePrice = source === "live" && rawAll.length ? last(rawAll).c : null;
  const raw = useMemo(() => {
    if (!closedOnly || source !== "live" || rawAll.length < 31) return rawAll;
    const bm = TF_MIN[live.tf || tradeTf] * 60000;
    const lastT = last(rawAll).t;
    return lastT + bm > Date.now() ? rawAll.slice(0, -1) : rawAll;
  }, [rawAll, closedOnly, source, live.tf, tradeTf, clock]);
  const nativeTf = source === "live" ? (live.tf || tradeTf) : tradeTf;

  const plan = useMemo(() => barPlan(tradeTf, htfTf), [tradeTf, htfTf]);
  const ratio = TF_MIN[tradeTf] / TF_MIN[nativeTf];
  const tfMismatch = ratio < 1 || !Number.isInteger(ratio);
  const series = useMemo(() => (tfMismatch ? raw : resample(raw, ratio)), [raw, ratio, tfMismatch]);

  const a = useMemo(() => analyzeSeries(series, TF_MIN[tfMismatch ? nativeTf : tradeTf]), [series, tradeTf, nativeTf, tfMismatch]);
  const ladder = useMemo(() => buildLadder(raw, nativeTf), [raw, nativeTf]);
  const htf = ladder.find((l) => l.tf === htfTf);
  const led = useMemo(() => (a ? buildLedger(a, htf, digits) : null), [a, htf, digits]);
  const scen = useMemo(() => (a && led ? buildScenarios(a, led, htf, digits) : null), [a, led, htf, digits]);
  const bias = a && led ? overallBias(led, a) : null;
  const status = led && scen ? currentStatus(led, scen) : null;
  const quality = useMemo(() => (a ? assessQuality(a, ladder, source) : null), [a, ladder, source]);
  const verdict = useMemo(() => (a && led && scen ? buildVerdict(a, led, scen, digits) : null), [a, led, scen, digits]);

  const scenarioLines = useMemo(() => {
    if (!a || !scen) return [];
    const out = [];
    scen.bullish.targets.slice(0, 2).forEach((t) => { const v = parseFloat(String(t.v).split("–")[0]); if (Number.isFinite(v)) out.push({ price: v, label: "Bull target", tone: "bull" }); });
    scen.bearish.targets.slice(0, 2).forEach((t) => { const v = parseFloat(String(t.v).split("–")[0]); if (Number.isFinite(v)) out.push({ price: v, label: "Bear target", tone: "bear" }); });
    const hl = [...a.pivots].reverse().find((x) => x.type === "L");
    const lh = [...a.pivots].reverse().find((x) => x.type === "H");
    if (hl) out.push({ price: hl.price, label: "Bull invalidation", tone: "warn" });
    if (lh) out.push({ price: lh.price, label: "Bear invalidation", tone: "warn" });
    return out;
  }, [a, scen]);

  /* ---- live feed ---- */
  const runFetch = useCallback(async () => {
    if (!PROVIDERS[live.provider].serverSide && !live.key.trim()) { setLive((s) => ({ ...s, status: "error", error: "Enter your API key first." })); return; }
    setLive((s) => ({ ...s, status: "loading", error: null }));
    try {
      const { candles, serverNow, lagMs } = await fetchLive({ providerKey: live.provider, key: live.key.trim(), symbol: pairLabel, tf: tradeTf, bars: Number(live.bars) || 500 });
      const at = Date.now();
      setLive((s) => ({ ...s, candles, tf: tradeTf, symbol: pairLabel, fetchedAt: at, status: "ok", error: null,
        skew: serverNow != null ? serverNow - at : 0, lagMs }));
      setSource("live");
    } catch (e) {
      setLive((s) => ({ ...s, status: "error", error: e.message }));
    }
  }, [live.provider, live.key, live.bars, pairLabel, tradeTf]);

  useEffect(() => {
    if (!auto || source !== "live" || !live.candles.length) return;
    // Refetching mid-bar returns the same forming candle. Land four seconds
    // after the next close instead, when there is genuinely something new.
    const barMs = TF_MIN[live.tf || tradeTf] * 60000;
    const lastT = last(live.candles).t;
    const toClose = lastT + barMs + 4000 - Date.now();
    const wait = Math.max(5000, Math.min(auto * 1000, toClose > 0 ? toClose : auto * 1000));
    const id = setTimeout(runFetch, wait);
    return () => clearTimeout(id);
  }, [auto, source, runFetch, live.candles, live.tf, tradeTf, clock]);

  /* ---- freshness, measured against the bar clock rather than the fetch clock ---- */
  const barMs = TF_MIN[live.tf || tradeTf] * 60000;
  const lastBarT = source === "live" && live.candles.length ? last(live.candles).t : null;
  const serverClock = clock + (live.skew || 0);
  const barCloseAt = lastBarT != null ? lastBarT + barMs : null;
  const barForming = barCloseAt != null && barCloseAt > serverClock;
  const msToClose = barCloseAt != null ? Math.max(0, barCloseAt - serverClock) : null;
  // a feed is late only once the bar it should have delivered is itself finished
  const feedLagMs = barCloseAt != null && !barForming ? serverClock - barCloseAt : 0;
  const isStale = source === "live" && feedLagMs > barMs;
  const staleMs = feedLagMs;

  /* ---- input handlers ---- */
  const toggleCheck = (k) => setChecks((s) => ({ ...s, [k]: !s[k] }));
  useEffect(() => { const id = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(id); }, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (cal.events || [])
      .filter((e) => Number.isFinite(e.t) && e.t >= now - 30 * 60000)
      .map((e) => ({ ...e, mins: Math.round((e.t - now) / 60000) }));
  }, [cal.events]);

  const loadCalendar = useCallback(async (days = 7) => {
    setCal((s) => ({ ...s, status: "loading", error: null }));
    try {
      const j = await fetchCalendar(days, pairCurrencies(pairLabel));
      setCal({ status: "ok", events: j.events, source: j.source, currencies: j.currencies, fetchedAt: j.fetchedAt || Date.now(), error: null });
    } catch (e) {
      setCal((s) => ({ ...s, status: "error", error: e.message }));
    }
  }, [pairLabel]);

  return (
    <div className="fx app" data-nav={navOpen ? "1" : "0"}>
      <style>{CSS}</style>

      {/* ================================ LEFT RAIL ============================== */}
      <aside className="rail" aria-label="Navigation and data">
        <div className="railbrand">
          <b>FOREX ANALYZER</b>
          <span className="eyebrow">scenarios, not predictions</span>
        </div>

        <nav className="railnav" aria-label="Pages">
          {NAV_GROUPS.map((g) => (
            <div className="railgrp" key={g.stage}>
              <i>{g.stage}</i>
              {g.items.map(([k, l, ic]) => (
                <button key={k} data-on={tab === k ? "1" : "0"} aria-current={tab === k ? "page" : undefined}
                  onClick={() => { setTab(k); setNavOpen(false); }}>
                  <Ico name={ic} />{l}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="railsec">
          <div className="lbl">Instrument</div>
          <select value={pair} onChange={(e) => setPair(e.target.value)}>{PAIRS.map((p) => <option key={p}>{p}</option>)}</select>
          {pair === "Custom pair" && (
            <input style={{ marginTop: 6 }} value={customPair} onChange={(e) => setCustomPair(e.target.value)} placeholder="e.g. EUR/NOK" />
          )}
          <div className="lbl" style={{ marginTop: 11 }}>Trading timeframe</div>
          <div className="tfwrap">{TFS.map((t) => <button key={t} className="tf" data-on={tradeTf === t ? "1" : "0"} onClick={() => setTradeTf(t)}>{t}</button>)}</div>
          <div className="lbl" style={{ marginTop: 11 }}>Higher timeframe</div>
          <div className="tfwrap">{TFS.map((t) => <button key={t} className="tf" data-on={htfTf === t ? "1" : "0"} onClick={() => setHtfTf(t)}>{t}</button>)}</div>
        </div>

        <div className="railsec">
          <div className="spread"><span className="lbl" style={{ margin: 0 }}>Live feed</span><SourceTag source={source} /></div>
          <select style={{ marginTop: 7 }} value={live.provider} onChange={(e) => setLive((s) => ({ ...s, provider: e.target.value, error: null }))}>
            {Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {!PROVIDERS[live.provider].serverSide && (
            <input style={{ marginTop: 6 }} type="password" value={live.key} placeholder="API key" autoComplete="off"
              onChange={(e) => setLive((s) => ({ ...s, key: e.target.value, error: null }))} />
          )}
          <div className="row" style={{ gap: 6, marginTop: 7 }}>
            <input style={{ width: 78 }} type="number" min="50" max="5000" value={live.bars}
              onChange={(e) => setLive((s) => ({ ...s, bars: e.target.value }))} aria-label="Bars to pull" />
            <button className="btn primary" style={{ flex: 1 }} onClick={runFetch} disabled={live.status === "loading"}>
              {live.status === "loading" ? "Fetching…" : source === "live" ? "Refresh" : "Fetch"}
            </button>
          </div>
          <button className="why" style={{ marginTop: 6 }} onClick={() => setLive((s) => ({ ...s, bars: plan.good }))}
            title={`${plan.good} bars covers every component for ${tradeTf} with a ${htfTf} context`}>
            {Number(live.bars) >= plan.good ? `✓ ${plan.good} IS ENOUGH FOR ${tradeTf}+${htfTf}` : `USE ${plan.good} FOR ${tradeTf}+${htfTf} →`}
          </button>
          {source === "live" && (
            <div style={{ marginTop: 10, padding: "9px 10px", border: `1px solid ${T.line}`, borderRadius: 7 }}>
              <div className="spread">
                <span className="lbl" style={{ margin: 0 }}>Live price</span>
                <span className="mono" style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{livePrice != null ? livePrice.toFixed(digits) : "—"}</span>
              </div>
              <div className="spread" style={{ marginTop: 4 }}>
                <span className="lbl" style={{ margin: 0 }}>{barForming ? "Bar closes in" : "Feed behind by"}</span>
                <span className="mono" style={{ fontSize: 11.5, color: isStale ? T.warn : T.dim }}>
                  {barForming ? untilClock(msToClose) : feedLagMs > 0 ? untilClock(feedLagMs) : "—"}
                </span>
              </div>
              <button className="chk" style={{ marginTop: 7, padding: 0 }} onClick={() => setClosedOnly((v) => !v)} aria-pressed={closedOnly}>
                <span className="box" style={{ background: closedOnly ? T.info : "transparent", color: T.ink, borderColor: closedOnly ? T.info : T.line2 }}>{closedOnly ? "✓" : ""}</span>
                <span style={{ fontSize: 11.5 }}>Analyse closed bars only
                  <small style={{ display: "block", color: T.faint, fontSize: 10.5, marginTop: 2 }}>
                    {closedOnly ? "Signals cannot repaint. Readings are one bar behind." : "Includes the forming bar — readings can change before it closes."}
                  </small>
                </span>
              </button>
            </div>
          )}
          <div className="lbl" style={{ marginTop: 11 }}>Auto-refresh</div>
          <div className="tfwrap">
            {[[0, "Off"], [60, "60s"], [300, "5m"], [900, "15m"]].map(([v, l]) => (
              <button key={v} className="tf" data-on={auto === v ? "1" : "0"} onClick={() => setAuto(v)}>{l}</button>
            ))}
          </div>
          {live.error && (
            <p className="note" style={{ marginTop: 8, color: T.bear, fontSize: 11.5 }}>
              {live.error.startsWith("BLOCKED") ? live.error.replace("BLOCKED: ", "") : live.error}
            </p>
          )}
          {!PROVIDERS[live.provider].serverSide && (
            <p className="note" style={{ marginTop: 8, fontSize: 11 }}>{PROVIDERS[live.provider].keyHint} The key stays in this page's memory — never saved, never sent anywhere but {PROVIDERS[live.provider].label}.</p>
          )}
        </div>

        <div className="railsec">
          <div className="spread">
            <span className="lbl" style={{ margin: 0 }}>Economic calendar</span>
            {cal.status === "ok" && <span className="tag">{(cal.currencies || ["USD"]).join("+")}</span>}
          </div>
          <button className="btn" style={{ width: "100%", marginTop: 7 }} onClick={() => loadCalendar(7)} disabled={cal.status === "loading"}>
            {cal.status === "loading" ? "Loading…" : cal.status === "ok" ? "Refresh calendar" : "Load calendar"}
          </button>

          {cal.status === "idle" && <p className="note" style={{ marginTop: 7, fontSize: 11 }}>Scheduled releases for {pairLabel}. Nothing is fetched until you ask.</p>}
          {cal.status === "error" && <p className="note" style={{ marginTop: 7, fontSize: 11, color: T.bear }}>{cal.error}</p>}
          {cal.status === "ok" && (
            upcoming.length === 0 ? (
              <p className="note" style={{ marginTop: 7, fontSize: 11 }}>No releases for these currencies in the next 7 days.</p>
            ) : (
              <>
                <div style={{ marginTop: 8 }}>
                  {upcoming.slice(0, 5).map((e, i) => (
                    <div className="evrow" key={i} data-hot={e.impact === "High" && e.mins <= 240 ? "1" : "0"}>
                      <span className="dot" style={{ background: e.impact === "High" ? T.bear : e.impact === "Medium" ? T.warn : T.line2 }} />
                      <span className="mono">{e.country}</span>
                      <span className="evname">{e.name}</span>
                      <span className="evin">{e.mins < 0 ? "now" : untilText(e.mins)}</span>
                    </div>
                  ))}
                </div>
                <button className="why" style={{ marginTop: 8 }} onClick={() => { setTab("risk"); setNavOpen(false); }}>FULL CALENDAR →</button>
              </>
            )
          )}
        </div>

        <div className="railfoot">
          <div className="spread"><span className="lbl" style={{ margin: 0 }}>Loaded</span><span className="mono" style={{ fontSize: 11.5 }}>{series.length} bars</span></div>
          {live.fetchedAt && <div className="spread" style={{ marginTop: 4 }}><span className="lbl" style={{ margin: 0 }}>Fetched</span><span className="mono" style={{ fontSize: 11.5, color: isStale ? T.warn : T.dim }}>{new Date(live.fetchedAt).toLocaleTimeString()}</span></div>}
          {quality && (
            <button className="qbtn" onClick={() => { setTab("detail"); setOpenWhy("quality"); }}>
              <span className="lbl" style={{ margin: 0 }}>Data quality</span>
              <Pill tone={quality.level === "High" ? "bull" : quality.level === "Medium" ? "warn" : "bear"}>{quality.level}</Pill>
            </button>
          )}
        </div>
      </aside>
      <div className="scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

      {/* ================================= CONTENT =============================== */}
      <main className="content">
        <div className="stickytop">
          <div className="chead">
            <button className="burger" onClick={() => setNavOpen((v) => !v)} aria-label="Open navigation" aria-expanded={navOpen}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <h2>{PAGE_TITLE[tab]}</h2>
            <span className="tag hide-sm">{pairLabel} · {tfMismatch ? nativeTf : tradeTf} · higher {htfTf}</span>
            {source === "live" && livePrice != null && (
              <span className="tag" style={{ color: T.text, borderColor: T.line2 }}>
                {livePrice.toFixed(digits)}
                <span style={{ color: isStale ? T.warn : T.faint, marginLeft: 7 }}>
                  {barForming ? `bar ${untilClock(msToClose)}` : `late ${untilClock(feedLagMs)}`}
                </span>
              </span>
            )}
            <button className="btn refresh" onClick={runFetch} disabled={live.status === "loading"}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6" />
              </svg>
              {live.status === "loading" ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
          {verdict && (
            <div className="sigbar">
              <div className="sigin">
                <span className="sigact" style={{ background: toneColor(verdict.tone), color: T.ink }}>{verdict.action}</span>
                <span className="sigfld"><span>Confluence</span><b style={{ color: toneColor(verdict.tone) }}>{verdict.score} vs {verdict.against} of {led.reachable}</b></span>
                <span className="sigfld"><span>Trigger</span><b>{verdict.trigger}</b></span>
                {verdict.invalidation && <span className="sigfld"><span>Invalidation</span><b style={{ color: T.warn }}>{verdict.invalidation}</b></span>}
                <button className="why" style={{ marginLeft: "auto" }} onClick={() => { setTab("desk"); setOpenWhy(openWhy === "verdict" ? null : "verdict"); }}>WHY?</button>
              </div>
            </div>
          )}
        </div>

        <div className="shell">
          {source === "illustrative" && (
            <div style={{ paddingTop: 14 }}>
              <Warn level="med">
                <b>This is illustrative sample data.</b> A deterministic synthetic series generated in the browser so the tools have something real to compute on. It is not a market feed and no price here corresponds to a traded price. Press <b>Refresh data</b> to fetch a live series.
              </Warn>
            </div>
          )}
          {isStale && (
            <div className="mt"><Warn level="med">
              <b>The feed is {untilClock(feedLagMs)} behind.</b> The most recent {live.tf} candle finished {untilClock(feedLagMs)} ago and no newer one has arrived, so this is not a picture of the market right now. Press <b>Refresh data</b>; if the lag persists, your plan is serving delayed data for this symbol rather than real-time.
            </Warn></div>
          )}
          {tfMismatch && (
            <div className="mt"><Warn level="high">The loaded series is {nativeTf}. A {tradeTf} view cannot be built from it, because you can only combine candles upward, never split them. Analysis is running on {nativeTf} instead.</Warn></div>
          )}
          {led && led.unmeasured.length > 0 && (
            <div className="mt"><Warn level="med">
              <b>{led.unmeasured.map((r) => r.key).join(" and ")} could not be measured from {series.length} bars,</b> so the score is out of {led.reachable} rather than 8.
              {plan.buildable
                ? ` Fetching ${plan.good} bars of ${tfMismatch ? nativeTf : tradeTf} would build the ${htfTf} row — that is ${plan.ratio} ${tfMismatch ? nativeTf : tradeTf} candles per ${htfTf} candle, and 30 ${htfTf} candles is the minimum to read structure from.`
                : ` A ${htfTf} series cannot be built from ${tfMismatch ? nativeTf : tradeTf} candles at all — pick a higher timeframe that is a whole multiple of it.`}
            </Warn></div>
          )}
          {!a && (
            <div className="mt"><Warn level="high">Not enough candles to analyse. At least 30 are needed before any level, pivot or reading can be computed.</Warn></div>
          )}

          <div className="grid" style={{ gap: 14, marginTop: 14 }}>
            {a && tab === "desk" && <DeskTab {...{ a, led, bias, status, scen, verdict, digits, htf, htfTf, pair, pairLabel, tradeTf: tfMismatch ? nativeTf : tradeTf, checks, toggleCheck, openWhy, setOpenWhy, setTab, cal, loadCalendar }} />}
            {a && tab === "scalp" && <ScalpTab {...{ a, digits, pair, pairLabel, tradeTf: tfMismatch ? nativeTf : tradeTf, setTradeTf, cal, setTab, openWhy, setOpenWhy }} />}
            {a && tab === "chart" && <ChartTab {...{ a, digits, layers, setLayers, scenarioLines, ladder, htfTf, tradeTf: tfMismatch ? nativeTf : tradeTf, openWhy, setOpenWhy }} />}
            {a && tab === "detail" && <DetailTab {...{ a, led, scen, bias, status, ladder, htf, digits, pairLabel, tradeTf: tfMismatch ? nativeTf : tradeTf, htfTf, openWhy, setOpenWhy, teach, setTeach, source, quality }} />}
            {a && tab === "risk" && <RiskTab {...{ a, scen, digits, pair, pairLabel, events, setEvents, eventDraft, setEventDraft, cal, loadCalendar }} />}
            {tab === "journal" && <JournalTab {...{ pairLabel, tradeTf, digits }} />}
          </div>

          <footer style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
            <p className="note">Educational tool. Nothing here is a recommendation to buy or sell, and no reading on this page is a forecast. Every figure is computed from the candles currently loaded — change the data and every figure changes. Trading leveraged products can lose more than the amount you put in.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* =============================== PAGE TABS ================================= */
/* ---------------------------------------------------------- shared helpers -- */
/** Entry / stop / targets for one direction, built only from mapped references. */
function buildSetup(a, led, scen, dir) {
  const s = dir === "bull" ? scen.bullish : scen.bearish;
  const entryZone = dir === "bull" ? a.sr.sup[0] : a.sr.res[0];
  const pivot = [...a.pivots].reverse().find((x) => (dir === "bull" ? x.type === "L" : x.type === "H"));
  if (!entryZone || !pivot) return null;
  const entry = entryZone.mid;
  const stop = dir === "bull" ? Math.min(pivot.price, entryZone.lo) - a.atr * 0.3 : Math.max(pivot.price, entryZone.hi) + a.atr * 0.3;
  const t1v = s.targets[0] ? parseFloat(String(s.targets[0].v).split("–")[0]) : null;
  const t2v = s.targets[1] ? parseFloat(String(s.targets[1].v).split("–")[0]) : null;
  const rr1 = t1v != null ? Math.abs(t1v - entry) / Math.abs(entry - stop) : null;
  const rr2 = t2v != null ? Math.abs(t2v - entry) / Math.abs(entry - stop) : null;
  return { dir, entry, stop, t1v, t2v, rr1, rr2, entryZone, pivot };
}

function ScenarioBody({ s, digits }) {
  return (
    <div className="grid g2" style={{ gap: 16 }}>
      <div>
        <div className="eyebrow">What has to happen</div>
        <ul className="tight">{s.condition.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <div className="eyebrow" style={{ marginTop: 13 }}>What confirms it</div>
        <ul className="tight">{s.confirmation.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </div>
      <div>
        <div className="eyebrow">Target areas</div>
        {s.targets.length ? (
          <table className="tbl" style={{ marginTop: 6 }}>
            <tbody>{s.targets.map((t, i) => (
              <tr key={i}><td style={{ width: 118 }}>{t.label}</td><td className="num">{t.v}</td><td className="note">{t.note}</td></tr>
            ))}</tbody>
          </table>
        ) : <p className="note mt">No target area could be mapped this way. Trading toward an unmapped area gives you no basis for where to take profit.</p>}
        <div className="mt"><Warn level="med"><b>Invalidation.</b> {s.invalidation}</Warn></div>
      </div>
    </div>
  );
}

/* ================================ TRADE DESK ===============================
   One page for the decision: buy or sell or wait, how strong the case is on
   each side, the two scenarios, and the numbers that follow from them. Every
   long explanation lives on the Breakdown tab instead. */
function DeskTab({ a, led, bias, status, scen, verdict, digits, htf, htfTf, pair, pairLabel, tradeTf, checks, toggleCheck, openWhy, setOpenWhy, setTab, cal, loadCalendar }) {
  const favoured = led.bull === led.bear ? (verdict && verdict.side ? verdict.side : "bull") : led.bull > led.bear ? "bull" : "bear";
  const [scTab, setScTab] = useState(favoured);
  const [chkSide, setChkSide] = useState(favoured);
  const [openChk, setOpenChk] = useState(false);
  const [f, setF] = useState({ balance: 10000, riskPct: 1 });
  const [openTest, setOpenTest] = useState(false);
  const [test, setTest] = useState(null);
  const [running, setRunning] = useState(false);

  // Follow the data: if the evidence flips sides, the page flips with it.
  useEffect(() => { setScTab(favoured); setChkSide(favoured); }, [favoured]);
  // A result belongs to the series it was measured on, and to no other.
  useEffect(() => { setTest(null); }, [a]);

  const runTest = () => {
    setRunning(true);
    setTimeout(() => {
      try { setTest(replaySignals({ candles: a.candles, tfMin: a.tfMin, htfMin: TF_MIN[htfTf], digits })); }
      catch (err) { setTest({ ok: false, reason: `The replay could not finish: ${err.message}` }); }
      setRunning(false);
    }, 30);
  };

  const dir = scTab === "none" ? favoured : scTab;
  const setup = useMemo(() => buildSetup(a, led, scen, dir), [a, led, scen, dir]);
  const money = setup && setup.t1v != null
    ? riskCalc({ balance: nz(Number(f.balance)), riskPct: nz(Number(f.riskPct)), entry: setup.entry, stop: setup.stop, target: setup.t1v, pairKey: pair, atr: a.atr })
    : null;

  const list = chkSide === "bull" ? BULL_CHECKS : BEAR_CHECKS;
  const done = list.filter(([k]) => checks[k]).length;
  const ev = useMemo(() => nextEvent(cal.events), [cal.events]);
  const SC = [["bull", "Bullish", T.bull], ["bear", "Bearish", T.bear], ["none", "No trade", T.warn]];

  return (
    <>
      {/* ------------------------------- the call -------------------------------- */}
      {ev && ev.hours <= 24 && (
        <Warn level={ev.hours <= 2 ? "high" : "med"}>
          <b>{ev.country} {ev.name} in {untilText(ev.mins)}</b> ({ev.date}{ev.time ? ` · ${ev.time}` : ""}). Technical levels hold poorly across a scheduled release and spreads widen through it, so the stop you calculated may not be the stop you get.
          {!ev.timeFromFeed && " The date is from the release calendar; the clock time is the agency's customary one, so confirm it."}
        </Warn>
      )}
      <Card accent={toneColor(verdict ? verdict.tone : bias.tone)}>
        <div className="spread" style={{ flexWrap: "wrap", gap: 18 }}>
          <div style={{ minWidth: 240, flex: "1 1 260px" }}>
            <div className="eyebrow">Decision · {pairLabel} · {tradeTf}</div>
            <h1 style={{ fontSize: 38, lineHeight: 1.05, marginTop: 6, color: toneColor(verdict ? verdict.tone : bias.tone) }}>
              {verdict ? verdict.action : bias.state}
            </h1>
            <div className="row mt" style={{ gap: 7 }}>
              <Pill tone={bias.tone} solid>{bias.state}</Pill>
              <Pill tone={status.tone}>{status.icon} {status.text}</Pill>
              <Pill tone={bias.tone}>Trend {a.strength}</Pill>
            </div>
          </div>
          <div style={{ minWidth: 230, flex: "1 1 240px" }}>
            <div className="spread"><span className="lbl" style={{ margin: 0 }}>Bullish evidence</span><span className="mono" style={{ color: T.bull, fontWeight: 600 }}>{led.bull}/{led.reachable}</span></div>
            <Bar value={led.bull} max={led.reachable} color={T.bull} />
            <div className="spread" style={{ marginTop: 9 }}><span className="lbl" style={{ margin: 0 }}>Bearish evidence</span><span className="mono" style={{ color: T.bear, fontWeight: 600 }}>{led.bear}/{led.reachable}</span></div>
            <Bar value={led.bear} max={led.reachable} color={T.bear} />
            <button className="why" style={{ marginTop: 9 }} onClick={() => setTab("detail")}>SEE THE {led.reachable} POINTS →</button>
            {cal.status === "idle" && (
              <button className="why" style={{ marginTop: 9, marginLeft: 6 }} onClick={() => loadCalendar(7)}>CHECK CALENDAR →</button>
            )}
            {cal.status === "loading" && <span className="tag" style={{ marginLeft: 6 }}>loading calendar…</span>}
            {cal.status === "ok" && !ev && <span className="tag" style={{ marginTop: 9, marginLeft: 6 }}>no high-impact release in 7 days</span>}
          </div>
        </div>

        {verdict && (
          <>
            <div className="grid g3 mt" style={{ gap: 10 }}>
              <Stat label="Trigger — not yet met" value={verdict.trigger} tone={verdict.tone} />
              <Stat label="Invalidation" value={verdict.invalidation || "—"} tone="warn" sub={verdict.side ? `a close past this ends the ${verdict.side === "bull" ? "bullish" : "bearish"} case` : "nothing to invalidate"} />
              <Stat label="Volatility" value={`${a.atr.toFixed(digits)} ATR`} sub={`${a.volatility.toLowerCase()} — size the stop against this`} />
            </div>
            <p className="note mt" style={{ fontSize: 13 }}>{verdict.reason}</p>
            {verdict.blockers.length > 0 && (
              <div className="mt"><Warn level="med"><b>Working against it.</b>
                <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>{verdict.blockers.map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}</ul>
              </Warn></div>
            )}
            <div className="mt"><Why id="verdict" open={openWhy} setOpen={setOpenWhy}>
              "Potential" is doing real work here. This counts agreeing evidence in the loaded candles — it is not a forecast and has never been tested against outcomes. Until the trigger price closes, the read is a hypothesis; the invalidation is where the reasoning stops being true.
            </Why></div>
          </>
        )}
      </Card>

      {/* ------------------------------ scenarios -------------------------------- */}
      <Card title="Scenarios" right={
        <span className="tag">{scTab === "none" ? (scen.noTrade.active ? "conditions met" : "not indicated") : `${scTab === "bull" ? led.bull : led.bear}/${led.reachable} evidence`}</span>
      }>
        <div className="seg">
          {SC.map(([k, l, col]) => (
            <button key={k} data-on={scTab === k ? "1" : "0"} onClick={() => setScTab(k)}
              style={scTab === k ? { background: col, color: T.ink } : undefined}>
              {l}{k !== "none" ? ` ${k === "bull" ? led.bull : led.bear}/${led.reachable}` : scen.noTrade.active ? " ●" : ""}
            </button>
          ))}
        </div>
        <div className="mt">
          {scTab === "bull" && <ScenarioBody s={scen.bullish} digits={digits} />}
          {scTab === "bear" && <ScenarioBody s={scen.bearish} digits={digits} />}
          {scTab === "none" && (
            scen.noTrade.checks.length === 0 ? (
              <p className="note">None of the standard stand-aside conditions are present. That is not permission to trade — only that the obvious reasons to wait are absent.</p>
            ) : (
              <>
                <p style={{ fontSize: 14, marginBottom: 9 }}>{scen.noTrade.active ? "The honest read here is: no clear setup — wait." : "Some stand-aside conditions are present. They weaken any case without cancelling it."}</p>
                <div className="ledger">
                  {scen.noTrade.checks.map((c, i) => (
                    <div className="led" key={i}><span className="dot" style={{ background: T.warn }} /><span>{c.text}</span><span /></div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </Card>

      {/* ------------------------------ the numbers ------------------------------ */}
      <Card title={`Plan — ${dir === "bull" ? "buy" : "sell"} side`} accent={dir === "bull" ? T.bull : T.bear}
        right={<span className="tag">from mapped levels only</span>}>
        {!setup ? (
          <p className="note">No plan can be built this way: the data does not give both an entry reference (a mapped zone in this direction) and a structural stop location. Rather than invent numbers, the tool stops here.</p>
        ) : (
          <>
            <div className="grid g4" style={{ gap: 10 }}>
              <Stat label="Entry zone" value={`${setup.entryZone.lo.toFixed(digits)} – ${setup.entryZone.hi.toFixed(digits)}`} tone={dir === "bull" ? "bull" : "bear"} sub={`${setup.entryZone.name} · ${setup.entryZone.touches} reactions`} />
              <Stat label="Stop-loss" value={setup.stop.toFixed(digits)} tone="warn" sub={`past the ${dir === "bull" ? "higher low" : "lower high"} at ${setup.pivot.price.toFixed(digits)}`} />
              <Stat label="Target 1" value={setup.t1v != null ? setup.t1v.toFixed(digits) : "none mapped"} sub={setup.rr1 != null ? `${setup.rr1.toFixed(2)}:1 reward-to-risk` : "no mapped area"} />
              <Stat label="Target 2" value={setup.t2v != null ? setup.t2v.toFixed(digits) : "none mapped"} sub={setup.rr2 != null ? `${setup.rr2.toFixed(2)}:1` : ""} />
            </div>
            <div className="hr" />
            <div className="row" style={{ gap: 10, alignItems: "flex-end" }}>
              <label style={{ width: 130 }}><span className="lbl">Account balance</span>
                <input type="number" value={f.balance} onChange={(e) => setF((s) => ({ ...s, balance: e.target.value }))} />
              </label>
              <label style={{ width: 96 }}><span className="lbl">Risk %</span>
                <input type="number" step="0.1" value={f.riskPct} onChange={(e) => setF((s) => ({ ...s, riskPct: e.target.value }))} />
              </label>
              <button className="why" onClick={() => setTab("risk")}>FULL RISK CALCULATOR →</button>
            </div>
            {money && (
              <>
                <div className="grid g4 mt" style={{ gap: 10 }}>
                  <Stat label="Risk on this trade" value={`${money.risk.toFixed(2)}`} sub={`${f.riskPct}% of ${Number(f.balance).toLocaleString()}`} />
                  <Stat label="Position size" value={money.lots != null ? `${money.lots.toFixed(2)} ${money.inst.unit}` : "—"} sub={`stop ${money.pips.toFixed(1)} pips · ${(money.stopDist / a.atr).toFixed(2)} ATR`} />
                  <Stat label="If target 1 hits" value={money.potentialReward != null ? `+${money.potentialReward.toFixed(2)}` : "—"} tone="bull" sub={money.rr != null ? `${money.rr.toFixed(2)}:1` : ""} />
                  <Stat label="Direction" value={money.dir === "long" ? "Long" : "Short"} tone={dir === "bull" ? "bull" : "bear"} sub={`entry at zone mid ${setup.entry.toFixed(digits)}`} />
                </div>
                {money.warnings.slice(0, 2).map((wn, i) => <div className="mt" key={i}><Warn level={wn.level}>{wn.text}</Warn></div>)}
              </>
            )}
            <p className="note mt">Educational scenario, not a recommendation. Entry is the middle of a mapped zone, the stop sits beyond the structure that would invalidate the idea, targets are the next mapped areas. It carries no view on whether to take the trade.</p>
          </>
        )}
      </Card>

      {/* --------------------------- signal measurement -------------------------- */}
      <Fold title="How has this signal actually done?" open={openTest} onToggle={() => setOpenTest((v) => !v)}
        right={<Pill tone={test && test.ok ? (test.decided >= 30 ? "info" : "warn") : "flat"}>{test && test.ok ? `${test.filled} trades` : "not measured"}</Pill>}>
        <p className="note">The score above is a count of agreeing evidence that nobody has checked against outcomes. This replays the loaded candles bar by bar — rebuilding the whole read from only the bars that existed at each point, then recording what price did over the next 40 bars. It is the difference between a claim and a measurement.</p>
        <div className="row mt" style={{ gap: 8 }}>
          <button className="btn primary" onClick={runTest} disabled={running}>{running ? "Replaying…" : test ? "Run again" : "Replay this signal on the loaded data"}</button>
          <span className="note" style={{ fontSize: 11.5 }}>{a.candles.length} bars · takes a moment</span>
        </div>

        {test && !test.ok && <div className="mt"><Warn level="med">{test.reason}</Warn></div>}

        {test && test.ok && (
          <>
            <div className="grid g4 mt" style={{ gap: 10 }}>
              <Stat label="Signals raised" value={String(test.signals)} sub={`${test.unfilled} never reached the entry zone`} />
              <Stat label="Trades filled" value={String(test.filled)} sub={`${test.wins}W / ${test.losses}L / ${test.opens} unresolved`} />
              <Stat label="Hit rate" value={test.hit != null ? `${(test.hit * 100).toFixed(0)}%` : "—"}
                tone={test.decided < 30 ? "warn" : test.hit >= 0.5 ? "bull" : "bear"} sub={`of ${test.decided} that resolved`} />
              <Stat label="Average result" value={test.expectancy != null ? `${test.expectancy >= 0 ? "+" : ""}${test.expectancy.toFixed(2)}R` : "—"}
                tone={test.expectancy > 0 ? "bull" : "bear"} sub="per filled trade, before costs" />
            </div>
            <div className="scroll mt">
              <table className="tbl">
                <thead><tr><th>Side</th><th>Filled</th><th>Won</th><th>Lost</th><th>Hit rate</th><th>Avg R</th></tr></thead>
                <tbody>
                  {[["Bullish", test.bull, "bull"], ["Bearish", test.bear, "bear"]].map(([l, d, tone]) => (
                    <tr key={l}>
                      <td><Pill tone={tone}>{l}</Pill></td>
                      <td className="num">{d.n}</td><td className="num">{d.w}</td><td className="num">{d.l}</td>
                      <td className="num">{d.hit != null ? `${(d.hit * 100).toFixed(0)}%` : "—"}</td>
                      <td className="num" style={{ color: d.r > 0 ? T.bull : d.r < 0 ? T.bear : T.dim }}>{d.r != null ? `${d.r >= 0 ? "+" : ""}${d.r.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {test.decided < 30 && (
              <div className="mt"><Warn level="high">
                <b>{test.decided} resolved trades is not a sample.</b> At this count the hit rate could move ten points either way on one more trade. Nothing here supports a conclusion — load a longer series before reading anything into it.
              </Warn></div>
            )}
            <div className="mt"><Warn level="med">
              <b>What this is not.</b> One instrument, one period, and the same data the rules were written against — that is in-sample, and in-sample results are optimistic by construction. Spread, commission, slippage and swap are all excluded, and a losing bar that touches both the stop and the target is counted as a loss. A real edge has to survive a period the rules never saw.
            </Warn></div>
            <p className="note mt">Method: replayed every {test.step === 1 ? "bar" : `${test.step} bars`} from bar {test.warmup} onward. Entry is the mid of the mapped zone as a resting order, stop beyond the invalidating swing, exit at the first mapped target, giving up after {test.horizon} bars. Overlapping signals are skipped while a trade is still open.</p>
          </>
        )}
      </Fold>

      {/* ------------------------------ checklist -------------------------------- */}
      <Fold title="Confirmation checklist" open={openChk} onToggle={() => setOpenChk((v) => !v)}
        right={<Pill tone={done >= 6 ? "bull" : "flat"}>{done}/{list.length} ticked</Pill>}>
        <div className="row" style={{ gap: 5, marginBottom: 10 }}>
          <button className="tf" data-on={chkSide === "bull" ? "1" : "0"} onClick={() => setChkSide("bull")}>Bullish</button>
          <button className="tf" data-on={chkSide === "bear" ? "1" : "0"} onClick={() => setChkSide("bear")}>Bearish</button>
        </div>
        <Bar value={done} max={list.length} color={chkSide === "bull" ? T.bull : T.bear} />
        <div style={{ marginTop: 10 }}>
          {list.map(([k, label]) => {
            const auto = autoState(k, a, led, htf);
            const on = !!checks[k];
            return (
              <button key={k} className="chk" onClick={() => toggleCheck(k)} aria-pressed={on}>
                <span className="box" style={{ background: on ? (chkSide === "bull" ? T.bull : T.bear) : "transparent", color: T.ink, borderColor: on ? (chkSide === "bull" ? T.bull : T.bear) : T.line2 }}>{on ? "✓" : ""}</span>
                <span style={{ fontSize: 13 }}>{label}
                  <small style={{ display: "block", color: auto === true ? T.bull : auto === false ? T.dim : T.faint, fontSize: 11.5, marginTop: 2 }}>
                    {auto === true ? "The loaded data supports this." : auto === false ? "The loaded data does not support this yet." : "Only you can judge this one — it depends on the candle in front of you."}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        {done < 6 && <div className="mt"><Warn level="med">Fewer than six boxes ticked. An unticked box is a specific piece of evidence you do not have yet.</Warn></div>}
      </Fold>
    </>
  );
}

/* ================================ SCALP TAB ================================ */
function ScalpTab({ a, digits, pair, pairLabel, tradeTf, setTradeTf, cal, setTab, openWhy, setOpenWhy }) {
  const inst = INSTRUMENTS[pair] || INSTRUMENTS["Custom pair"];
  const [spread, setSpread] = useState(pair === "XAU/USD" ? 2.5 : pair === "BTC/USD" ? 8 : 1);
  const [tick, setTick] = useState(Date.now());
  const [test, setTest] = useState(null);
  const [running, setRunning] = useState(false);
  const [openTest, setOpenTest] = useState(false);

  // the session clock is only useful if it moves
  useEffect(() => { const id = setInterval(() => setTick(Date.now()), 30000); return () => clearInterval(id); }, []);
  useEffect(() => { setTest(null); }, [a, spread]);

  const ev = useMemo(() => nextEvent(cal.events), [cal.events]);
  const sc = useMemo(() => buildScalp(a, { spreadPips: nz(Number(spread), 1), pip: inst.pip, at: tick, event: ev }), [a, spread, inst.pip, tick, ev]);
  const ses = sc.session;

  const runTest = () => {
    setRunning(true);
    setTimeout(() => {
      try { setTest(replayScalps({ candles: a.candles, tfMin: a.tfMin, pip: inst.pip, spreadPips: nz(Number(spread), 1), digits })); }
      catch (err) { setTest({ ok: false, reason: `The replay could not finish: ${err.message}` }); }
      setRunning(false);
    }, 30);
  };

  if (!sc.applicable) {
    return (
      <Card title="Scalping needs an intraday series" accent={T.warn}>
        <p style={{ fontSize: 14 }}>
          The loaded candles are <b>{tradeTf}</b>. A scalp is held for minutes, so a stop placed from {tradeTf} structure is
          tens of pips wide and stops being a scalp. Nothing here will pretend otherwise by dividing a large candle into small ones —
          candles merge upward only.
        </p>
        <div className="row mt" style={{ gap: 5 }}>
          <span className="lbl" style={{ margin: 0 }}>Switch to</span>
          {["1m", "5m", "15m"].map((t) => <button key={t} className="tf" data-on={tradeTf === t ? "1" : "0"} onClick={() => setTradeTf(t)}>{t}</button>)}
          <span className="note" style={{ fontSize: 12 }}>then press <b>Refresh data</b> to pull that series.</span>
        </div>
        <p className="note mt">Not every provider serves 1M history, and free tiers often cap it at a few hundred bars. 5m is usually the shortest that comes back with enough depth to analyse.</p>
      </Card>
    );
  }

  const tone = sc.tradeable ? (sc.side === "bull" ? "bull" : "bear") : "warn";

  return (
    <>
      {/* ------------------------------- session --------------------------------- */}
      <Card title="Session clock" accent={ses.quality === "Best" ? T.bull : ses.quality === "Good" ? T.info : T.warn}
        right={<Pill tone={ses.quality === "Best" ? "bull" : ses.quality === "Good" ? "info" : "warn"} solid>{ses.quality}</Pill>}>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {SESSIONS.map((s) => {
            const on = ses.open.some((o) => o.key === s.key);
            return <span key={s.key} className="tag" style={{ color: on ? T.text : T.faint, borderColor: on ? T.line2 : T.line, background: on ? T.panel2 : "transparent" }}>{s.name} {on ? "open" : "closed"}</span>;
          })}
          <span className="tag" style={{ marginLeft: "auto" }}>{ses.utc}</span>
        </div>
        <p className="note mt">{ses.note}</p>
        {!ses.overlap && <p className="note" style={{ marginTop: 6 }}>The London–New York overlap opens in {untilText(Math.round(ses.toOverlap))}. Roughly half of a normal day's range prints inside it.</p>}
      </Card>

      {/* -------------------------------- signal --------------------------------- */}
      <Card accent={toneColor(tone)}>
        <div className="spread" style={{ flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: "1 1 280px" }}>
            <div className="eyebrow">Scalp signal · {pairLabel} · {tradeTf}</div>
            <h1 style={{ fontSize: 34, lineHeight: 1.05, marginTop: 6, color: toneColor(tone) }}>
              {sc.model === "No setup" ? "NO SETUP" : sc.tradeable ? `${sc.side === "bull" ? "LONG" : "SHORT"} — ${sc.model.toUpperCase()}` : "SETUP BLOCKED"}
            </h1>
            <p className="note mt" style={{ fontSize: 13 }}>{sc.model === "No setup" ? sc.reason : sc.why}</p>
          </div>
          <div style={{ flex: "0 0 190px" }}>
            <label><span className="lbl">Your spread (pips)</span>
              <input type="number" step="0.1" min="0" value={spread} onChange={(e) => setSpread(e.target.value)} />
            </label>
            <p className="note" style={{ marginTop: 6, fontSize: 11 }}>Take this from your platform at the time of day you actually trade, not the headline number.</p>
          </div>
        </div>

        {sc.model !== "No setup" && (
          <>
            <div className="grid g4 mt" style={{ gap: 10 }}>
              <Stat label="Entry (after spread)" value={sc.entry.toFixed(digits)} tone={tone} sub={`close ${a.price.toFixed(digits)} + ${spread} pip cost`} />
              <Stat label="Stop" value={sc.stop.toFixed(digits)} tone="warn" sub={`${sc.stopPips.toFixed(1)} pips`} />
              <Stat label="Target 1" value={sc.t1.toFixed(digits)} sub={`${sc.t1Pips.toFixed(1)} pips · 1:1`} />
              <Stat label="Target 2" value={sc.t2.toFixed(digits)} sub={`${sc.t2Pips.toFixed(1)} pips · ${sc.rr2 != null ? sc.rr2.toFixed(1) : "—"}:1`} />
            </div>
            <div className="hr" />
            <div className="eyebrow">Gates — every one has to pass</div>
            <div className="ledger" style={{ marginTop: 6 }}>
              {sc.gates.map((g, i) => (
                <div className="led" key={i}>
                  <span className="dot" style={{ background: g.hard ? T.bear : g.ok ? T.bull : T.warn }} />
                  <span style={{ color: g.ok ? T.text : T.dim }}>{g.text}</span><span />
                </div>
              ))}
            </div>
            {!sc.tradeable && (
              <div className="mt"><Warn level="high">
                <b>Not tradeable as a scalp.</b> {sc.blockers.length} gate{sc.blockers.length > 1 ? "s" : ""} failed outright. The setup may still be valid on a longer hold where the spread is a smaller share of the move — but as a scalp the arithmetic does not work.
              </Warn></div>
            )}
            {sc.tradeable && sc.softFails.length > 0 && (
              <div className="mt"><Warn level="med"><b>Passable, not clean.</b> {sc.softFails.length} gate{sc.softFails.length > 1 ? "s are" : " is"} marginal. Marginal scalps are where the spread quietly eats the month.</Warn></div>
            )}
            <div className="mt"><Why id="scalpcost" open={openWhy} setOpen={setOpenWhy}>
              At {spread} pips against a {sc.t1Pips.toFixed(1)}-pip target, the broker takes {(sc.costShare * 100).toFixed(0)}% of a winning trade before you do. That is why the entry above is worse than the close: you buy at the ask and sell at the bid, and a model that ignores it will show an edge that does not survive contact with an account.
            </Why></div>
          </>
        )}
      </Card>

      {/* ----------------------------- micro levels ------------------------------ */}
      <div className="grid g2">
        <Card title="Intraday levels">
          <table className="tbl">
            <tbody>
              <tr><td>40-bar high</td><td className="num">{sc.micro.rangeHi.toFixed(digits)}</td><td className="note">{((sc.micro.rangeHi - a.price) / inst.pip).toFixed(1)} pips above</td></tr>
              <tr><td>Range mid</td><td className="num">{sc.micro.rangeMid.toFixed(digits)}</td><td className="note">the fade target when there is no trend</td></tr>
              <tr><td>40-bar low</td><td className="num">{sc.micro.rangeLo.toFixed(digits)}</td><td className="note">{((a.price - sc.micro.rangeLo) / inst.pip).toFixed(1)} pips below</td></tr>
              <tr><td>20 EMA</td><td className="num">{sc.micro.e20 != null ? sc.micro.e20.toFixed(digits) : "—"}</td><td className="note">the pullback reference for continuation</td></tr>
              <tr><td>ATR per bar</td><td className="num">{(a.atr / inst.pip).toFixed(1)} pips</td><td className="note">a {tradeTf} bar moves this much on average</td></tr>
              <tr><td>Range width</td><td className="num">{(sc.micro.rangeSize / inst.pip).toFixed(1)} pips</td><td className="note">{(sc.micro.rangeSize / a.atr).toFixed(1)} ATR — under 2 there is nothing to fade</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="What these two setups are">
          <p style={{ fontSize: 13, marginBottom: 9 }}><b style={{ color: T.text }}>Continuation.</b> The 20 EMA is on the trend side of the 50, price pulled back into the 20 within the last three bars and closed back through it. Stop goes beyond the pullback low, first target at 1:1. It fails when the trend was already exhausted.</p>
          <p style={{ fontSize: 13 }}><b style={{ color: T.text }}>Range fade.</b> The two EMAs are within 0.3 ATR of each other — no trend — and price sits in the outer fifth of its own 40-bar range with RSI past 68 or under 32. Stop beyond the range edge, target the mid. It fails when the range was actually the start of a breakout.</p>
          <p className="note mt">Neither is proprietary and neither is a prediction. They are two of the few intraday patterns that can be stated precisely enough for a computer to check honestly — which is the only reason they are here.</p>
        </Card>
      </div>

      {/* ------------------------------- measurement ----------------------------- */}
      <Fold title="How have these scalps actually done — net of your spread?" open={openTest} onToggle={() => setOpenTest((v) => !v)}
        right={<Pill tone={test && test.ok ? (test.decided >= 30 ? "info" : "warn") : "flat"}>{test && test.ok ? `${test.trades} trades` : "not measured"}</Pill>}>
        <p className="note">Replays these exact rules bar by bar across the loaded series, charging {spread} pips of spread on every entry and applying the same session gate using each bar's own timestamp. Scalping strategies almost always look profitable until the spread goes in.</p>
        <div className="row mt" style={{ gap: 8 }}>
          <button className="btn primary" onClick={runTest} disabled={running}>{running ? "Replaying…" : test ? "Run again" : "Replay with costs"}</button>
          <span className="note" style={{ fontSize: 11.5 }}>{a.candles.length} bars of {tradeTf}</span>
        </div>
        {test && !test.ok && <div className="mt"><Warn level="med">{test.reason}</Warn></div>}
        {test && test.ok && (
          <>
            <div className="grid g4 mt" style={{ gap: 10 }}>
              <Stat label="Trades taken" value={String(test.trades)} sub={`${test.wins}W / ${test.losses}L / ${test.opens} timed out`} />
              <Stat label="Hit rate" value={test.hit != null ? `${(test.hit * 100).toFixed(0)}%` : "—"} tone={test.decided < 30 ? "warn" : test.hit >= 0.5 ? "bull" : "bear"} sub={`of ${test.decided} resolved`} />
              <Stat label="Average result" value={test.expectancy != null ? `${test.expectancy >= 0 ? "+" : ""}${test.expectancy.toFixed(2)}R` : "—"} tone={test.expectancy > 0 ? "bull" : "bear"} sub={`after ${spread} pips of spread`} />
              <Stat label="Average hold" value={test.heldMins != null ? `${Math.round(test.heldMins)} min` : "—"} sub={`${test.heldBars != null ? test.heldBars.toFixed(1) : "—"} bars`} />
            </div>
            <div className="scroll mt">
              <table className="tbl">
                <thead><tr><th>Setup</th><th>Trades</th><th>Won</th><th>Lost</th><th>Hit rate</th><th>Avg R</th></tr></thead>
                <tbody>
                  {[["Continuation", test.cont], ["Range fade", test.fade]].map(([l, d]) => (
                    <tr key={l}>
                      <td>{l}</td><td className="num">{d.n}</td><td className="num">{d.w}</td><td className="num">{d.l}</td>
                      <td className="num">{d.hit != null ? `${(d.hit * 100).toFixed(0)}%` : "—"}</td>
                      <td className="num" style={{ color: d.r > 0 ? T.bull : d.r < 0 ? T.bear : T.dim }}>{d.r != null ? `${d.r >= 0 ? "+" : ""}${d.r.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {test.decided < 30 && <div className="mt"><Warn level="high"><b>{test.decided} resolved trades proves nothing.</b> Scalping needs hundreds of trades before a hit rate means anything, because the edge per trade is small enough to hide inside ordinary variance.</Warn></div>}
            <div className="mt"><Warn level="med">
              <b>Still optimistic.</b> Spread is charged but commission, swap and slippage are not, and slippage is worst exactly where scalps are taken — fast markets and session opens. Stops are assumed to fill at the price, which is the assumption that breaks first. And this is the same data the rules were written against.
            </Warn></div>
          </>
        )}
      </Fold>
    </>
  );
}

/* ================================= CHART TAB =============================== */
function ChartTab({ a, digits, layers, setLayers, scenarioLines, ladder, htfTf, tradeTf, openWhy, setOpenWhy }) {
  const [custom, setCustom] = useState(false);
  const preset = Object.keys(LAYER_PRESETS).find((k) => LAYER_KEYS.every((x) => !!LAYER_PRESETS[k][x] === !!layers[x]));
  return (
    <>
      <Card title="Annotated chart" right={<span className="tag">{a.candles.length} bars loaded</span>}>
        <div className="lbar">
          {LAYER_SPEC.map((sp) => (
            <button key={sp.key} className="lchip" data-on={layers[sp.key] ? "1" : "0"} aria-pressed={!!layers[sp.key]}
              onClick={() => setLayers((s) => ({ ...s, [sp.key]: !s[sp.key] }))}>
              <Swatch sp={sp} />
              <span>{sp.label}</span>
              <em>{sp.count(a, scenarioLines)}</em>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 6, margin: "8px 0 12px" }}>
          <span className="lbl" style={{ margin: 0 }}>Preset</span>
          {[["clean", "Price only"], ["standard", "Standard"], ["full", "Everything"]].map(([k, l]) => (
            <button key={k} className="tf" data-on={preset === k ? "1" : "0"} onClick={() => setLayers({ ...LAYER_PRESETS[k] })}>{l}</button>
          ))}
          <button className="why" style={{ marginLeft: "auto" }} onClick={() => setCustom((v) => !v)}>{custom ? "HIDE SPECS" : "WHAT DOES EACH LAYER MEAN?"}</button>
        </div>
        {custom && (
          <div className="specs">
            {LAYER_SPEC.map((sp) => (
              <div className="spec" key={sp.key} data-on={layers[sp.key] ? "1" : "0"}>
                <div className="spechead"><Swatch sp={sp} /><b>{sp.label}</b><span className="tag">{sp.count(a, scenarioLines)}</span>{!layers[sp.key] && <span className="tag" style={{ opacity: .6 }}>hidden</span>}</div>
                <p><b style={{ color: T.text, fontWeight: 500 }}>{sp.what}</b> {sp.rule}</p>
              </div>
            ))}
          </div>
        )}
        <ChartPanel a={a} digits={digits} layers={layers} scenarioLines={scenarioLines} />
        <p className="note mt">Every label comes from the data: HH/HL/LH/LL from confirmed swing pivots, BOS and CHOCH from closes through a prior swing, zones from clustered pivot prices. RSI, MACD and volume read off the same candles — switch them on above the chart.</p>
      </Card>

      <div className="grid g2">
        <Card title="Multi-timeframe ladder" right={<Why id="mtf" open={openWhy} setOpen={setOpenWhy}>Every row is the same candles merged into larger ones, so all rows describe one price series at different resolutions. A timeframe smaller than the loaded series cannot be reconstructed — candles merge, they never split.</Why>}>
          <div className="ledger">
            {ladder.map((l) => (
              <div key={l.tf} className="led" style={{ gridTemplateColumns: "56px 14px 1fr" }}>
                <span className="mono" style={{ fontSize: 12, color: l.tf === tradeTf ? T.text : T.dim, fontWeight: l.tf === tradeTf || l.tf === htfTf ? 600 : 400 }}>{l.tf}</span>
                <span className="dot" style={{ background: l.available ? toneColor(readTone(l.read)) : T.line2 }} />
                <span style={{ fontSize: 12.5, color: l.available ? T.text : T.faint }}>
                  {l.available ? <>{l.read}<small>{l.structure} structure · {l.strength.toLowerCase()} strength{l.tf === htfTf ? " · higher timeframe" : ""}{l.tf === tradeTf ? " · trading timeframe" : ""}</small></> : <>Unavailable<small>{l.reason}</small></>}
                </span>
              </div>
            ))}
          </div>
          <p className="note mt">{(() => {
            const av = ladder.filter((l) => l.available);
            const bulls = av.filter((l) => l.read === "Bullish").length, bears = av.filter((l) => l.read === "Bearish").length;
            if (!av.length) return "No timeframe could be assessed.";
            if (bulls && bears) return `Timeframes disagree: ${bulls} bullish, ${bears} bearish. When context and entry point opposite ways, the smaller timeframe is usually the one that gets you into trouble.`;
            if (bulls) return `All ${bulls} assessable timeframes read bullish. Alignment raises the odds that a pullback is a pullback — it does not remove the need for a level and a trigger.`;
            if (bears) return `All ${bears} assessable timeframes read bearish.`;
            return "Every assessable timeframe reads neutral — structure is not stacking anywhere.";
          })()}</p>
        </Card>

        <Card title="Support and resistance">
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Zone</th><th>Range</th><th>Strength</th><th>Reactions</th><th>State</th></tr></thead>
              <tbody>
                {[...a.sr.res].reverse().map((z) => <SRRow key={z.name} z={z} digits={digits} price={a.price} />)}
                <tr><td colSpan={5} style={{ padding: "9px 0" }}>
                  <div className="row" style={{ gap: 8 }}><span className="mono" style={{ color: T.text, fontWeight: 600 }}>{a.price.toFixed(digits)}</span><span className="lbl" style={{ margin: 0 }}>current price</span></div>
                </td></tr>
                {a.sr.sup.map((z) => <SRRow key={z.name} z={z} digits={digits} price={a.price} />)}
              </tbody>
            </table>
          </div>
          {a.sr.all.length === 0 && <p className="note">No zone could be built: the series has too few clustered swing points. No levels are invented to fill the gap.</p>}
          <p className="note mt">Zones are clusters of swing prices widened by a fraction of ATR. They are areas, not lines.</p>
        </Card>
      </div>

      <StructureTab a={a} digits={digits} openWhy={openWhy} setOpenWhy={setOpenWhy} ladder={ladder} htfTf={htfTf} tradeTf={tradeTf} />
    </>
  );
}

/* ================================ BREAKDOWN ================================ */
function DetailTab({ a, led, scen, bias, status, ladder, htf, digits, pairLabel, tradeTf, htfTf, openWhy, setOpenWhy, teach, setTeach, source, quality }) {
  const rows = [
    ["Higher timeframe", htf?.available ? htf.read : "Unavailable", htf?.available ? `The ${htf.tf} series built from this data reads ${htf.structure.toLowerCase()} structure with ${htf.strength.toLowerCase()} trend strength.` : `A ${htfTf} series cannot be built from the loaded data (${htf?.reason || "unavailable"}).`],
    ["Market structure", a.structRead, a.structure.detail],
    ["Momentum", a.momentumRead, `MACD reads ${a.macdRead.toLowerCase()} and RSI reads ${a.rsiRead.toLowerCase()}. This row only leaves neutral when both agree.`],
    ["Moving averages", a.maRead, a.maWhy],
    ["RSI", a.rsiRead, `RSI(14) is ${a.rsiVal != null ? a.rsiVal.toFixed(1) : "unavailable"} — ${a.rsiState.toLowerCase()}. A high RSI in a strong trend is a sign of strength, not an automatic sell; it can stay above 70 for a long time.`],
    ["MACD", a.macdRead, a.macdWhy],
    ["Support / resistance", a.srRead, a.srWhy],
    ["Liquidity", a.liq.sweep ? "Relevant" : "Neutral", a.liq.sweep ? `A bar in the last 12 traded through ${a.liq.sweep.level.kind.toLowerCase()} at ${a.liq.sweep.level.price.toFixed(digits)} and closed back inside. Orders resting there were reached. That is information, not a reversal signal.` : "No mapped liquidity level has been swept in the last 12 bars."],
    ["Volatility", a.volatility, `ATR(14) is ${a.atr.toFixed(digits)}, which is ${a.atrPct.toFixed(2)}% of price and sits in the ${a.volatility.toLowerCase()} part of its own recent range. This is the number your stop distance should be measured against.`],
  ];

  return (
    <>
      {quality && (
        <Card title="Data quality" accent={quality.level === "High" ? T.bull : quality.level === "Medium" ? T.warn : T.bear}
          right={<Pill tone={quality.level === "High" ? "bull" : quality.level === "Medium" ? "warn" : "bear"} solid>{quality.level}</Pill>}>
          <div className="ledger">
            {quality.pts.map((p, i) => (
              <div className="led" key={i}>
                <span className="dot" style={{ background: p.ok ? T.bull : T.warn }} />
                <span style={{ color: p.ok ? T.text : T.dim }}>{p.text}</span><span />
              </div>
            ))}
          </div>
          {quality.level !== "High" && (
            <p className="note mt">{quality.pts.filter((p) => !p.ok).length} of the {quality.max} evidence checks are not met, so every reading on these pages is provisional. Loading more bars from the live feed is usually what fixes it.</p>
          )}
        </Card>
      )}

      <Card title="Confluence ledger — where the 8 points come from"
        right={<Why id="ledger" open={openWhy} setOpen={setOpenWhy}>Each row scores independently and the maximum is eight. Structure and higher timeframe are worth two because they change slowly and set context; the rest are worth one because they change bar to bar. Every point ships with the evidence that produced it, so you can disagree with a line rather than with a black box.</Why>}>
        <div className="scroll">
          <table className="tbl">
            <thead><tr><th style={{ width: "22%" }}>Component</th><th style={{ width: 66 }}>Bull</th><th style={{ width: 66 }}>Bear</th><th>Evidence</th></tr></thead>
            <tbody>
              {led.rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.key}<div className="note" style={{ fontSize: 11 }}>{r.measured ? `max ${r.max}` : "not measurable"}</div></td>
                  <td className="num" style={{ color: r.bull ? T.bull : T.faint, fontWeight: r.bull ? 700 : 400 }}>+{r.bull}</td>
                  <td className="num" style={{ color: r.bear ? T.bear : T.faint, fontWeight: r.bear ? 700 : 400 }}>+{r.bear}</td>
                  <td className="note">{r.why}</td>
                </tr>
              ))}
              <tr><td><b>Total</b></td>
                <td className="num" style={{ color: T.bull, fontWeight: 700 }}>{led.bull}/{led.reachable}</td>
                <td className="num" style={{ color: T.bear, fontWeight: 700 }}>{led.bear}/{led.reachable}</td>
                <td className="note">Technical Confluence Score. A tally of agreeing evidence — not a probability, and not validated against historical outcomes.</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Analysis breakdown">
        <div className="scroll">
          <table className="tbl">
            <thead><tr><th style={{ width: "24%" }}>Analysis</th><th style={{ width: "18%" }}>Reading</th><th>Why</th></tr></thead>
            <tbody>
              {rows.map(([k, v, why]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td><Pill tone={readTone(v)}>{v}</Pill></td>
                  <td className="note">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Market summary" accent={toneColor(status.tone)}>
        <div className="grid g4" style={{ gap: 10 }}>
          <Stat label="Pair" value={pairLabel} />
          <Stat label="Timeframe" value={tradeTf} sub={`higher: ${htfTf}`} />
          <Stat label="Higher TF bias" value={htf?.available ? htf.read : "n/a"} tone={htf?.available ? readTone(htf.read) : "flat"} />
          <Stat label="Structure" value={a.structure.state} tone={readTone(a.structRead)} />
          <Stat label="Momentum" value={a.strength} sub={`${a.momentumRead.toLowerCase()} reading`} />
          <Stat label="Volatility" value={a.volatility} sub={`ATR ${a.atr.toFixed(digits)}`} />
          <Stat label="Key support" value={a.sr.sup[0] ? a.sr.sup[0].mid.toFixed(digits) : "none mapped"} tone="bull" sub={a.sr.sup[0] ? `${a.sr.sup[0].touches} reactions` : "not enough clustered lows"} />
          <Stat label="Key resistance" value={a.sr.res[0] ? a.sr.res[0].mid.toFixed(digits) : "none mapped"} tone="bear" sub={a.sr.res[0] ? `${a.sr.res[0].touches} reactions` : "not enough clustered highs"} />
        </div>
        <div className="hr" />
        <div className="grid g2" style={{ gap: 12 }}>
          <div>
            <div className="eyebrow">Scenario the evidence favours</div>
            <p className="note mt">{led.bull > led.bear ? scen.bullish.condition[0] + " " + scen.bullish.confirmation[0] : led.bear > led.bull ? scen.bearish.condition[0] + " " + scen.bearish.confirmation[0] : "Neither side has the stronger case. The market is between references and the honest read is that there is nothing to do yet."}</p>
          </div>
          <div>
            <div className="eyebrow">If that fails</div>
            <p className="note mt">{led.bull > led.bear ? scen.bearish.condition[0] + " " + (scen.bearish.targets[0] ? `The first area below is ${scen.bearish.targets[0].v}.` : "") : scen.bullish.condition[0] + " " + (scen.bullish.targets[0] ? `The first area above is ${scen.bullish.targets[0].v}.` : "")}</p>
          </div>
        </div>
      </Card>

      <LearnTab a={a} led={led} scen={scen} bias={bias} status={status} ladder={ladder} htf={htf} digits={digits}
        pairLabel={pairLabel} tradeTf={tradeTf} htfTf={htfTf} teach={teach} setTeach={setTeach} source={source} />
    </>
  );
}

function SRRow({ z, digits, price }) {
  const inside = price >= z.lo && price <= z.hi;
  return (
    <tr>
      <td><Pill tone={z.side === "support" ? "bull" : "bear"}>{z.name}</Pill></td>
      <td className="num">{z.lo.toFixed(digits)} – {z.hi.toFixed(digits)}</td>
      <td>{z.strength}</td>
      <td className="num">{z.touches}</td>
      <td className="note">{inside ? "price inside now" : z.flipped ? "broken, may now act in reverse" : `${z.age} bars since last touch`}</td>
    </tr>
  );
}

/* ============================= STRUCTURE TAB =============================== */
function StructureTab({ a, digits, openWhy, setOpenWhy, ladder, htfTf, tradeTf }) {
  const recent = [...a.pivots].slice(-8).reverse();
  const lastHL = [...a.pivots].reverse().find((x) => x.type === "L");
  return (
    <>
      <Card title="Market structure" accent={toneColor(readTone(a.structRead))}
        right={<Pill tone={readTone(a.structRead)} solid>{a.structure.state}</Pill>}>
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          {a.structure.state === "Bullish" && <>Price is making higher highs and higher lows. Each pullback so far has stopped above the previous one, which is what "buyers in control" actually means in structural terms — not a feeling, a sequence.{lastHL && <> The sequence breaks on a close below <span className="mono" style={{ color: T.warn }}>{lastHL.price.toFixed(digits)}</span>, the most recent higher low.</>}</>}
          {a.structure.state === "Bearish" && <>Price is making lower lows and lower highs. Rallies are being sold before reaching the previous high. That is the bearish sequence, and it holds until a close takes out the most recent lower high.</>}
          {a.structure.state === "Range" && <>{a.structure.detail} A range is not a failed trend — it is its own condition, and the cost of trading it like a trend is buying the top of it.</>}
          {a.structure.state === "Unclear" && <>{a.structure.detail} With this few confirmed swings, any structural claim would be an opinion dressed as analysis.</>}
        </p>
        <div className="mt"><Why id="struct" open={openWhy} setOpen={setOpenWhy}>
          Swing points are found with a 5-bar fractal test: a bar is a swing high only if no bar within two on either side traded higher. That is why the most recent bars carry no label yet — a swing cannot be confirmed until two bars have passed on the right. The structure reading then compares the last two swing highs and the last two swing lows.
        </Why></div>
      </Card>

      <div className="grid g2">
        <Card title="Swing sequence">
          <table className="tbl">
            <thead><tr><th>Label</th><th>Price</th><th>Bars ago</th><th>Meaning</th></tr></thead>
            <tbody>
              {recent.map((p, i) => (
                <tr key={i}>
                  <td><Pill tone={p.label === "HH" || p.label === "HL" ? "bull" : p.label === "LH" || p.label === "LL" ? "bear" : "flat"}>{p.label}</Pill></td>
                  <td className="num">{p.price.toFixed(digits)}</td>
                  <td className="num">{a.candles.length - 1 - p.i}</td>
                  <td className="note">{({ HH: "Higher high — the advance went further than the last one.", HL: "Higher low — the pullback held above the last one.", LH: "Lower high — the rally stopped short of the last one.", LL: "Lower low — the decline went further than the last one.", H: "First mapped swing high, nothing to compare it to yet.", L: "First mapped swing low, nothing to compare it to yet." })[p.label]}</td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={4} className="note">No confirmed swing points in this series.</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card title="Break of structure / change of character">
          {a.events.length === 0 && <p className="note">No close through a prior swing level in the visible history. Structure has not been broken or reversed in this data.</p>}
          <div className="ledger">
            {[...a.events].reverse().map((e, i) => (
              <div className="led" key={i}>
                <span className="dot" style={{ background: e.dir === "up" ? T.bull : T.bear }} />
                <span><b style={{ color: e.dir === "up" ? T.bull : T.bear }}>{e.kind}</b> {e.dir === "up" ? "upward" : "downward"} at <span className="mono">{e.price.toFixed(digits)}</span>
                  <small>{e.kind === "BOS" ? "Break of structure: a close beyond the prior swing in the same direction the market was already going. Continuation evidence." : "Change of character: the first close through a swing against the prevailing direction. It is the earliest structural warning that control may be changing — and the most commonly over-traded one."}</small>
                  <small>{a.candles.length - 1 - e.i} bars ago</small>
                </span><span />
              </div>
            ))}
          </div>
          <div className="mt"><Why id="bos" open={openWhy} setOpen={setOpenWhy}>Both are detected on candle <i>closes</i>, not wicks. A wick through a level shows the price was reached and rejected; a close through it shows it was accepted. Using wicks produces far more signals and far more false ones.</Why></div>
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Supply and demand zones">
          {a.sd.length === 0 && <p className="note">No zone met the test: a tight base candle followed within three bars by a move larger than 1.6 ATR. Nothing is drawn where the evidence is not there.</p>}
          <div className="ledger">
            {a.sd.map((z, i) => (
              <div className="led" key={i}>
                <span className="dot" style={{ background: z.kind === "demand" ? T.bull : T.bear }} />
                <span>
                  <b style={{ color: z.kind === "demand" ? T.bull : T.bear, textTransform: "capitalize" }}>{z.kind} zone</b>{" "}
                  <span className="mono">{z.lo.toFixed(digits)} – {z.hi.toFixed(digits)}</span> <span className="tag">{z.state}</span>
                  <small>{z.kind === "demand" ? "Price left this area quickly to the upside, which suggests orders here were filled in size and the move away was unbalanced." : "Price left this area quickly to the downside."} {z.state === "Fresh" ? "It has not been revisited since it formed." : z.state === "Tested" ? `It has been revisited ${z.tests} time${z.tests === 1 ? "" : "s"} — each test uses up some of the unfilled interest.` : "Price has since closed through it, so it is no longer defending anything."}</small>
                </span><span />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Liquidity map">
          <div className="ledger">
            {a.liq.levels.map((l, i) => (
              <div className="led" key={i}>
                <span className="dot" style={{ background: T.violet }} />
                <span><b>{l.kind}</b> <span className="mono">{l.price.toFixed(digits)}</span><small>{l.note}</small></span><span />
              </div>
            ))}
            {!a.liq.levels.length && <p className="note">No equal highs, equal lows or prior-period extremes could be identified in this series.</p>}
          </div>
          {a.liq.sweep && (
            <div className="mt"><Warn level="info"><b>Recent sweep.</b> A bar {a.candles.length - 1 - a.liq.sweep.i} bars ago traded {a.liq.sweep.dir === "down" ? "below" : "above"} {a.liq.sweep.level.kind.toLowerCase()} at {a.liq.sweep.level.price.toFixed(digits)} and closed back inside.</Warn></div>
          )}
          <p className="note mt">Liquidity zones are simply places where a lot of orders are likely to be resting — stops behind obvious swing points, entries at obvious levels. Price reaching them explains why moves sometimes overshoot. A sweep is not a reversal signal on its own, and describing it as "institutions hunting stops" is a story, not evidence.</p>
        </Card>
      </div>

      <Card title="Fair value gaps" right={<span className="tag">{a.fvg.zones.length} open of {a.fvg.total} found</span>}>
        {a.fvg.zones.length === 0 ? (
          <p className="note">No unfilled gap wider than a fifth of an ATR in this series. {a.fvg.total > 0 ? `All ${a.fvg.total} that formed have since been traded back through.` : "Price has not moved with enough one-way urgency to leave one."}</p>
        ) : (
          <div className="ledger">
            {a.fvg.zones.map((z, i) => (
              <div className="led" key={i}>
                <span className="dot" style={{ background: z.kind === "bullish" ? T.bull : T.bear }} />
                <span>
                  <b style={{ color: z.kind === "bullish" ? T.bull : T.bear, textTransform: "capitalize" }}>{z.kind} FVG</b>{" "}
                  <span className="mono">{z.lo.toFixed(digits)} - {z.hi.toFixed(digits)}</span>{" "}
                  <span className="tag">{z.state}</span>{z.inside && <span className="tag" style={{ color: T.warn, borderColor: T.warn + "66" }}>price inside</span>}
                  <small>{z.atrSize.toFixed(1)} ATR wide, formed {z.barsAgo} bars ago{z.fillPct > 0.02 ? `, ${Math.round(z.fillPct * 100)}% traded back into` : ""}. The middle candle covered this range in one direction only, so no two-sided trading happened here.</small>
                </span><span />
              </div>
            ))}
          </div>
        )}
        <div className="mt"><Why id="fvg" open={openWhy} setOpen={setOpenWhy}>
          A fair value gap is found by comparing candle 1 and candle 3 of every three-bar sequence. If candle 1's high sits below candle 3's low, the market jumped that band without trading both ways through it, and that band is the gap. Detection uses wicks, not closes, because the gap is defined by the range that was skipped. Anything narrower than a fifth of an ATR is ignored, otherwise every ordinary bar produces one.
        </Why></div>
        <p className="note mt">The common claim is that gaps get filled. In this particular series {a.fvg.total > 0 ? `${a.fvg.filled} of ${a.fvg.total} did (${Math.round((a.fvg.filled / a.fvg.total) * 100)}%)` : "there is not enough of a sample to say"} - which is a useful number precisely because it is not 100%. An unfilled gap is a plausible area price may be drawn back to, not an appointment it has to keep.</p>
      </Card>

      <Card title="Candlestick readings">
        {a.patterns.length === 0 && <p className="note">No recognisable pattern in the last eight candles. That is the normal state of a chart.</p>}
        <div className="ledger">
          {a.patterns.map((p, i) => {
            const k = a.candles[p.i];
            const nearZone = a.sr.all.find((z) => k.l <= z.hi && k.h >= z.lo);
            return (
              <div className="led" key={i}>
                <span className="dot" style={{ background: T.info }} />
                <span><b>{p.name}</b> · {p.barsAgo === 0 ? "current bar" : `${p.barsAgo} bars ago`} at <span className="mono">{k.c.toFixed(digits)}</span>
                  <small>{p.meaning}</small>
                  <small><b style={{ color: nearZone ? T.text : T.faint }}>Location:</b> {nearZone ? `formed inside the ${nearZone.name} ${nearZone.side} zone — location is most of what gives a pattern meaning.` : "formed in open space, away from any mapped zone, which weakens it considerably."}</small>
                  <small><b style={{ color: T.text }}>Agrees with structure?</b> {a.structRead === "Neutral" ? "Structure is unclear, so there is nothing to agree with." : `Structure reads ${a.structRead.toLowerCase()}.`}</small>
                  <small><b style={{ color: T.warn }}>Confirmation:</b> {p.need}</small>
                </span><span />
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

/* ============================== SCENARIOS TAB ============================== */
const BULL_CHECKS = [
  ["b1", "Higher timeframe supports the bullish direction"],
  ["b2", "Price has reached relevant support or demand"],
  ["b3", "Bullish structure has formed (higher low after a break)"],
  ["b4", "Liquidity sweep or rejection, if applicable"],
  ["b5", "A confirmation candle has closed"],
  ["b6", "Momentum supports the move"],
  ["b7", "Risk/reward to the first target is acceptable"],
  ["b8", "No major conflicting signal"],
];
const BEAR_CHECKS = [
  ["s1", "Higher timeframe supports the bearish direction"],
  ["s2", "Price has reached relevant resistance or supply"],
  ["s3", "Bearish structure has formed (lower high after a break)"],
  ["s4", "Liquidity sweep or rejection, if applicable"],
  ["s5", "A confirmation candle has closed"],
  ["s6", "Momentum supports the move"],
  ["s7", "Risk/reward to the first target is acceptable"],
  ["s8", "No major conflicting signal"],
];

function autoState(key, a, led, htf) {
  const near = (z) => z && a.price >= z.lo - a.atr * 0.4 && a.price <= z.hi + a.atr * 0.4;
  const map = {
    b1: htf?.available && htf.read === "Bullish", b2: near(a.sr.sup[0]), b3: a.structRead === "Bullish",
    b4: !!(a.liq.sweep && a.liq.sweep.dir === "down"), b5: null, b6: a.macdRead === "Bullish" && nz(a.rsiVal, 50) > 50,
    b7: null, b8: !(htf?.available && htf.read === "Bearish"),
    s1: htf?.available && htf.read === "Bearish", s2: near(a.sr.res[0]), s3: a.structRead === "Bearish",
    s4: !!(a.liq.sweep && a.liq.sweep.dir === "up"), s5: null, s6: a.macdRead === "Bearish" && nz(a.rsiVal, 50) < 50,
    s7: null, s8: !(htf?.available && htf.read === "Bullish"),
  };
  return map[key];
}

/* ================================= RISK TAB ================================ */
function RiskTab({ a, scen, digits, pair, pairLabel, events, setEvents, eventDraft, setEventDraft, cal, loadCalendar }) {
  const sup = a.sr.sup[0], res = a.sr.res[0];
  const [f, setF] = useState({ balance: 10000, riskPct: 1, entry: a.price, stop: sup ? sup.lo : a.price - a.atr * 1.5, target: res ? res.mid : a.price + a.atr * 3 });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value === "" ? "" : Number(e.target.value) }));
  const nums = { balance: nz(Number(f.balance)), riskPct: nz(Number(f.riskPct)), entry: nz(Number(f.entry)), stop: nz(Number(f.stop)), target: nz(Number(f.target)) };
  const r = riskCalc({ ...nums, pairKey: pair, atr: a.atr });

  const addEvent = () => {
    if (!eventDraft.name.trim()) return;
    setEvents((s) => [...s, { ...eventDraft, id: Date.now() }]);
    setEventDraft({ when: "", name: "", impact: "High" });
  };

  return (
    <>
      <Card title="Risk calculator">
        <div className="grid g3" style={{ gap: 10 }}>
          <label><span className="lbl">Account balance</span><input type="number" value={f.balance} onChange={set("balance")} /></label>
          <label><span className="lbl">Risk per trade (%)</span><input type="number" step="0.1" value={f.riskPct} onChange={set("riskPct")} /></label>
          <label><span className="lbl">Instrument</span><input value={pairLabel} readOnly /></label>
          <label><span className="lbl">Entry price</span><input type="number" step="any" value={f.entry} onChange={set("entry")} /></label>
          <label><span className="lbl">Stop loss</span><input type="number" step="any" value={f.stop} onChange={set("stop")} /></label>
          <label><span className="lbl">Take profit</span><input type="number" step="any" value={f.target} onChange={set("target")} /></label>
        </div>
        <div className="row mt" style={{ gap: 8 }}>
          <button className="btn" onClick={() => setF((s) => ({ ...s, entry: Number(a.price.toFixed(digits)), stop: Number((sup ? sup.lo - a.atr * 0.3 : a.price - a.atr * 1.5).toFixed(digits)), target: Number((res ? res.mid : a.price + a.atr * 3).toFixed(digits)) }))}>Fill from mapped levels</button>
          <span className="note">Uses current price, the base of {sup ? sup.name : "the nearest support"} for the stop, and {res ? res.name : "the nearest resistance"} for the target.</span>
        </div>

        <div className="hr" />
        <div className="grid g4" style={{ gap: 10 }}>
          <Stat label="Amount at risk" value={r.risk.toLocaleString(undefined, { maximumFractionDigits: 2 })} tone="warn" sub={`${nums.riskPct}% of balance`} />
          <Stat label="Stop distance" value={r.stopDist.toFixed(digits)} sub={`${r.pips.toFixed(1)} pips · ${(r.stopDist / a.atr).toFixed(2)} ATR`} />
          <Stat label="Potential reward" value={r.potentialReward != null ? r.potentialReward.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"} tone="bull" sub={`${r.rewardPips.toFixed(1)} pips`} />
          <Stat label="Reward : risk" value={r.rr != null ? `${r.rr.toFixed(2)} : 1` : "—"} tone={r.rr != null && r.rr >= 1.5 ? "bull" : r.rr != null && r.rr < 1 ? "bear" : "warn"} />
          <Stat label="Position size" value={r.units != null ? r.units.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"} sub="units of the base instrument" />
          <Stat label="Standard lots" value={r.lots != null ? r.lots.toFixed(3) : "—"} sub={`contract size ${r.inst.contract.toLocaleString()}`} />
          <Stat label="Notional exposure" value={r.notional != null ? r.notional.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"} />
          <Stat label="Effective leverage" value={r.leverage != null ? `${r.leverage.toFixed(1)}×` : "—"} tone={r.leverage > 20 ? "bear" : r.leverage > 10 ? "warn" : "flat"} />
        </div>

        <div className="mt"><Warn level="med"><b>Read the sizing assumption.</b> Position size is risk divided by stop distance, which assumes your account is denominated in the quote currency of this instrument. If it is not, your broker's pip value for the pair will differ and the size must be converted before use.</Warn></div>

        {r.warnings.length > 0 && (
          <div className="grid mt" style={{ gap: 8 }}>
            {r.warnings.map((w, i) => <Warn key={i} level={w.level}>{w.text}</Warn>)}
          </div>
        )}
        <div className="mt"><Warn level="high"><b>Standing warning.</b> Avoid risking money you cannot afford to lose. Leverage magnifies losses as readily as gains, and a run of losing trades is a normal feature of every strategy, not a sign that something has gone wrong.</Warn></div>
      </Card>

      <Card title="Risk in context of volatility">
        <div className="grid g3" style={{ gap: 10 }}>
          <Stat label="ATR(14)" value={a.atr.toFixed(digits)} sub={`${a.atrPct.toFixed(2)}% of price`} />
          <Stat label="Volatility state" value={a.volatility} tone={a.volatility === "High" ? "warn" : "flat"} sub="versus its own last 100 bars" />
          <Stat label="Stop in ATR terms" value={`${(r.stopDist / a.atr).toFixed(2)}×`} tone={r.stopDist < a.atr * 0.5 ? "bear" : "flat"} />
        </div>
        <p className="note mt">ATR is the average distance price travels in a single bar on this timeframe. A stop closer than one ATR sits inside ordinary noise: it is not protecting you from being wrong, it is guaranteeing you get taken out by being early. When ATR rises, the same stop in price terms is a smaller stop in market terms — position size has to come down to hold risk constant.</p>
      </Card>

      <Card title="Economic calendar">
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <button className="btn" onClick={() => loadCalendar(7)} disabled={cal.status === "loading"}>
            {cal.status === "loading" ? "Loading…" : cal.status === "ok" ? "Refresh calendar" : "Load calendar"}
          </button>
          {cal.status === "ok" && <span className="tag">{cal.events.length} releases · {(cal.currencies || ["USD"]).join(" + ")} · next 7 days</span>}
          {cal.status === "ok" && cal.fetchedAt && <span className="tag">loaded {new Date(cal.fetchedAt).toLocaleTimeString()}</span>}
        </div>

        {cal.status === "idle" && (
          <Warn level="med">No calendar feed loaded yet. Load it from the left rail (or the button above) and the scheduled releases come from the server route — nothing here invents a date. You can also log events you have verified yourself, below.</Warn>
        )}
        {cal.status === "error" && (
          <Warn level={cal.error.startsWith("BLOCKED") ? "med" : "high"}>
            {cal.error.startsWith("BLOCKED") ? <><b>Blocked by the sandbox.</b> {cal.error.replace("BLOCKED: ", "")}</> : <><b>Calendar unavailable.</b> {cal.error}</>}
          </Warn>
        )}
        {cal.status === "ok" && (
          cal.events.length === 0 ? (
            <Warn level="med">The feed returned no scheduled releases for these currencies in the next 7 days. That is the feed's answer, not an assurance that the week is quiet — check a second source before trading through it.</Warn>
          ) : (
            <>
              <div className="scroll">
                <table className="tbl">
                  <thead><tr><th>When</th><th>Ccy</th><th>Release</th><th>Impact</th><th>Forecast</th><th>Previous</th></tr></thead>
                  <tbody>
                    {cal.events.slice(0, 14).map((e, i) => {
                      const mins = Number.isFinite(e.t) ? Math.round((e.t - Date.now()) / 60000) : null;
                      return (
                        <tr key={i}>
                          <td className="num">{e.date}{e.time ? <div className="note" style={{ fontSize: 11 }}>{e.time}{!e.timeFromFeed ? " *" : ""}</div> : null}</td>
                          <td className="mono" style={{ fontSize: 11.5 }}>{e.country}</td>
                          <td>{e.name}{mins != null && mins >= 0 && mins < 2880 ? <div className="note" style={{ fontSize: 11 }}>in {untilText(mins)}</div> : null}</td>
                          <td><Pill tone={e.impact === "High" ? "bear" : e.impact === "Medium" ? "warn" : "flat"}>{e.impact}</Pill></td>
                          <td className="num">{e.forecast ?? "—"}</td>
                          <td className="num">{e.previous ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="note mt">Source: {cal.source}. {cal.events.some((e) => !e.timeFromFeed) && "* the feed supplies the date only — the clock time is the issuing agency's customary release time, so confirm it against the agency before sizing a trade around it. "}Releases the feed does not carry are simply absent; none are inferred.</p>
              {(() => {
                const soon = nextEvent(cal.events);
                return soon && soon.hours <= 24 ? (
                  <div className="mt"><Warn level={soon.hours <= 2 ? "high" : "med"}>
                    <b>{soon.country} {soon.name} in {untilText(soon.mins)}.</b> Across a scheduled release, the stop distance you sized from ATR is measured on bars that did not contain a release. Spreads widen, slippage stops being theoretical, and a level that held all week means very little for those few minutes.
                  </Warn></div>
                ) : null;
              })()}
            </>
          )
        )}
        <div className="hr" />
        <p className="note mt">Scheduled releases that routinely move currency pairs, regardless of what the chart shows beforehand:</p>
        <div className="grid g2 mt" style={{ gap: 8 }}>
          {[["Interest-rate decisions", "The central bank's policy rate and the statement around it. Usually the single largest scheduled mover for a currency."],
            ["CPI / inflation", "Feeds directly into rate expectations, which is what actually prices the currency."],
            ["Non-farm payrolls", "US employment. Moves USD pairs and often everything correlated to them."],
            ["GDP", "Slower-burning, but revisions can surprise."],
            ["Central-bank speeches", "Unscheduled in effect — tone matters more than content."],
            ["Employment data", "Claims, unemployment rate, wage growth: the labour side of the rate decision."]].map(([k, v]) => (
            <div key={k} className="stat"><div style={{ fontWeight: 600, fontSize: 13 }}>{k}</div><div className="note" style={{ marginTop: 3 }}>{v}</div></div>
          ))}
        </div>
        <div className="hr" />
        <div className="lbl">Log events you have verified yourself</div>
        <div className="row" style={{ gap: 8, alignItems: "flex-end" }}>
          <label style={{ flex: "1 1 130px" }}><span className="lbl">When</span><input value={eventDraft.when} onChange={(e) => setEventDraft({ ...eventDraft, when: e.target.value })} placeholder="Thu 14:30" /></label>
          <label style={{ flex: "2 1 200px" }}><span className="lbl">Event</span><input value={eventDraft.name} onChange={(e) => setEventDraft({ ...eventDraft, name: e.target.value })} placeholder="ECB rate decision" /></label>
          <label style={{ flex: "1 1 110px" }}><span className="lbl">Impact</span><select value={eventDraft.impact} onChange={(e) => setEventDraft({ ...eventDraft, impact: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>
          <button className="btn primary" onClick={addEvent}>Add</button>
        </div>
        {events.length > 0 && (
          <table className="tbl mt">
            <thead><tr><th>When</th><th>Event</th><th>Impact</th><th /></tr></thead>
            <tbody>{events.map((e) => (
              <tr key={e.id}><td className="num">{e.when || "—"}</td><td>{e.name}</td>
                <td><Pill tone={e.impact === "High" ? "bear" : e.impact === "Medium" ? "warn" : "flat"}>{e.impact}</Pill></td>
                <td style={{ textAlign: "right" }}><button className="why" onClick={() => setEvents((s) => s.filter((x) => x.id !== e.id))}>REMOVE</button></td></tr>
            ))}</tbody>
          </table>
        )}
        {events.some((e) => e.impact === "High") && <div className="mt"><Warn level="high">You have logged a high-impact event. Technical levels hold far less reliably across a scheduled release, and spreads widen through it — which means the stop you calculated may not be the stop you get.</Warn></div>}
      </Card>
    </>
  );
}

/* ================================ LEARN TAB ================================ */
function buildLesson({ a, led, scen, bias, status, ladder, htf, digits, pairLabel, tradeTf, htfTf, source }) {
  const c = a.candles, n = c.length;
  const first = c[Math.max(0, n - 60)].c, move = ((a.price - first) / first) * 100;
  const up = c.slice(-20).filter((k) => k.c >= k.o).length;
  const av = ladder.filter((l) => l.available);
  const lastHL = [...a.pivots].reverse().find((x) => x.type === "L");
  const lastLH = [...a.pivots].reverse().find((x) => x.type === "H");
  const sup = a.sr.sup[0], res = a.sr.res[0];
  return [
    ["What happened", `Over the last 60 bars on the ${tradeTf} chart, ${pairLabel} has moved ${move >= 0 ? "up" : "down"} ${Math.abs(move).toFixed(2)}%. Of the last 20 candles, ${up} closed higher than they opened and ${20 - up} closed lower. The current price is ${a.price.toFixed(digits)}. That is a description, not an interpretation — always separate the two.`],
    ["What the structure says", `${a.structure.detail} In plain terms, "market structure" just means the pattern made by the peaks and troughs. A trend is a sequence, and the sequence is what you watch, not the individual candle.${lastHL ? ` The last confirmed trough sits at ${lastHL.price.toFixed(digits)}.` : ""}${lastLH ? ` The last confirmed peak sits at ${lastLH.price.toFixed(digits)}.` : ""}`],
    ["Who appears to have control", a.structRead === "Bullish" ? `Buyers, on this timeframe, for now. Each dip has been bought before reaching the previous dip. Trend strength reads ${a.strength.toLowerCase()}, measured as how far price sits from the 50-period average in ATR units — currently ${(Math.abs(a.price - nz(last(a.ema[50].filter((v) => v != null)), a.price)) / a.atr).toFixed(1)} ATR.` : a.structRead === "Bearish" ? `Sellers, on this timeframe. Rallies are stopping short of the previous peak. Trend strength reads ${a.strength.toLowerCase()}.` : `Neither side clearly. Peaks and troughs are not stacking in one direction, which usually means the market is rotating between two references rather than going somewhere.`],
    ["Where the important levels are", `${sup ? `The nearest support zone is ${sup.lo.toFixed(digits)}–${sup.hi.toFixed(digits)}, built from ${sup.touches} swing point${sup.touches === 1 ? "" : "s"} clustered together.` : "No support zone could be mapped — there are not enough clustered swing lows."} ${res ? `The nearest resistance zone is ${res.lo.toFixed(digits)}–${res.hi.toFixed(digits)}, from ${res.touches} swing point${res.touches === 1 ? "" : "s"}.` : "No resistance zone could be mapped."} Note that these are ranges, not lines. A level is an area where behaviour changed before, and behaviour is imprecise.`],
    ["Where liquidity might sit", a.liq.levels.length ? `The closest reference points are ${a.liq.levels.slice(0, 3).map((l) => `${l.kind.toLowerCase()} at ${l.price.toFixed(digits)}`).join(", ")}. "Liquidity" here means nothing mystical: obvious price points attract orders — stops placed just beyond a visible swing, entries at a round level. That is why price sometimes runs slightly past an obvious point and turns. It is also why it sometimes runs past and keeps going.` : "No equal highs, equal lows or prior-period extremes were identifiable in this data, so there is nothing to say about where orders might be resting."],
    ["What the indicators add", `EMAs: ${a.maWhy} RSI(14) is ${a.rsiVal != null ? a.rsiVal.toFixed(1) : "unavailable"} — ${a.rsiState.toLowerCase()}. RSI measures the pace of recent gains against recent losses; it is not a reversal signal, and in a real trend it can stay pinned above 70 for weeks. MACD: ${a.macdWhy} Indicators are derived from price, so they can never tell you anything price has not already said — they just say it more consistently than the eye does.`],
    ["The bullish possibility", `${scen.bullish.condition[0]} Confirmation would be: ${scen.bullish.confirmation[0].toLowerCase()} ${scen.bullish.targets[0] ? `The first area above is ${scen.bullish.targets[0].v}.` : "No area above could be mapped, which is itself a reason for caution."} This case currently scores ${led.bull} out of ${led.reachable}.`],
    ["The bearish possibility", `${scen.bearish.condition[0]} Confirmation would be: ${scen.bearish.confirmation[0].toLowerCase()} ${scen.bearish.targets[0] ? `The first area below is ${scen.bearish.targets[0].v}.` : "No area below could be mapped."} This case currently scores ${led.bear} out of ${led.reachable}.`],
    ["What would invalidate each", `Bullish case: ${scen.bullish.invalidation} Bearish case: ${scen.bearish.invalidation} Deciding this before entering is the single habit that separates a plan from a hope — afterwards, every adverse candle becomes an argument for moving the line.`],
    ["What a beginner should take from this chart", `${scen.noTrade.active ? "The most useful lesson right now is that this chart does not offer a readable setup, and the correct response to that is nothing. " : ""}The order of reading matters: trend, then structure, then level, then confluence, then scenario, then confirmation, then invalidation, then risk. Most losing decisions come from starting at the end — seeing an indicator, deciding a direction, and looking for evidence afterwards.${source === "illustrative" ? " Remember that this particular series is illustrative sample data, so treat this as a reading exercise rather than a market view." : ""}`],
  ];
}

function LearnTab({ a, led, scen, bias, status, ladder, htf, digits, pairLabel, tradeTf, htfTf, teach, setTeach, source }) {
  const lesson = useMemo(() => buildLesson({ a, led, scen, bias, status, ladder, htf, digits, pairLabel, tradeTf, htfTf, source }), [a, led, scen, ladder, htf, digits, pairLabel, tradeTf, htfTf, source, bias, status]);
  const points = useMemo(() => {
    const out = [];
    out.push("Read the sequence of swing highs and lows, not the last candle. One candle is a bar of a song, not the song.");
    if (a.sr.all.length) out.push("Support and resistance are zones with width, not exact prices. Expect reactions near them, not at them.");
    if (a.rsiVal != null && (a.rsiVal > 70 || a.rsiVal < 30)) out.push(`RSI is ${a.rsiVal.toFixed(0)} here. In a trending market an extreme RSI is evidence of strength, not a signal to fade. Fading strong trends on an oscillator is one of the most reliable ways to lose money slowly.`);
    if (a.volatility === "High") out.push(`Volatility is in the upper third of its recent range (ATR ${a.atr.toFixed(digits)}). The same stop distance that was comfortable last week is too tight now.`);
    if (scen.noTrade.active) out.push("When timeframes conflict or price sits mid-range, the highest-value action is to wait. Missing a move costs nothing you had.");
    if (a.liq.sweep) out.push("A level was swept and price closed back inside. That tells you orders were reached there — it does not tell you the direction has changed.");
    if (a.events.some((e) => e.kind === "CHOCH")) out.push("A change of character appeared in this data. It is the earliest structural warning available, and also the one most often traded too early — it is a reason to watch, not a reason to enter.");
    out.push("Define invalidation before entry, in price terms, and let it be the thing that closes the trade.");
    return out.slice(0, 5);
  }, [a, scen, digits]);

  return (
    <>
      <Card accent={T.info}>
        <div className="spread" style={{ flexWrap: "wrap", gap: 10 }}>
          <div style={{ maxWidth: 560 }}>
            <div className="eyebrow">Education mode</div>
            <h2 style={{ fontSize: 22, marginTop: 5 }}>Teach me this chart</h2>
            <p className="note mt">A plain-language walkthrough of the loaded series in ten steps, built from the same computed values the rest of the dashboard uses. Jargon is explained where it appears.</p>
          </div>
          <button className="btn primary" onClick={() => setTeach((t) => !t)}>{teach ? "Hide the walkthrough" : "Teach me this chart"}</button>
        </div>
        {teach && (
          <div className="mt fade">
            {lesson.map(([h, body], i) => (
              <div key={i} style={{ padding: "13px 0", borderTop: `1px solid ${T.line}` }}>
                <div className="row" style={{ gap: 9, alignItems: "baseline" }}>
                  <span className="mono" style={{ color: T.faint, fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</span>
                  <h4 style={{ fontSize: 14 }}>{h}</h4>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 6, color: "#C9D5E6" }}>{body}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="What you should learn from this chart">
        <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: 13.5, lineHeight: 1.7 }}>
          {points.map((p, i) => <li key={i} style={{ marginBottom: 7 }}>{p}</li>)}
        </ol>
      </Card>

      <Card title="The order of reading" accent={T.violet}>
        <div className="scroll">
          <div className="row" style={{ gap: 6, flexWrap: "nowrap", paddingBottom: 4 }}>
            {["Trend", "Structure", "Level", "Confluence", "Scenario", "Confirmation", "Invalidation", "Risk"].map((s, i, arr) => (
              <React.Fragment key={s}>
                <span className="pill" style={{ color: T.text, borderColor: T.line2, background: T.panel2 }}>{s}</span>
                {i < arr.length - 1 && <span style={{ color: T.faint }}>→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p className="note mt">Compare that with the sequence most people actually use: indicator → buy → hope. The difference is not sophistication, it is order. Every step above constrains the next one, so by the time you reach "risk" there is only one sensible position size left. Start at the end and every step becomes a justification instead of a filter.</p>
      </Card>

      <Card title="Terms used on this page">
        <div className="grid g2" style={{ gap: 9 }}>
          {[["Higher high (HH)", "A peak above the previous peak."],
            ["Higher low (HL)", "A trough above the previous trough. Two of these plus two higher highs is an uptrend."],
            ["Lower high (LH) / lower low (LL)", "The mirror image, forming a downtrend."],
            ["BOS — break of structure", "A candle closing beyond the last swing in the direction the market was already moving. Continuation evidence."],
            ["CHOCH — change of character", "The first close through a swing in the opposite direction. An early warning that control may be shifting."],
            ["Supply / demand zone", "The small area price left in a hurry, suggesting orders were filled there in size."],
            ["FVG - fair value gap", "A band of price the market jumped in one move, leaving no two-way trade inside it. Sometimes revisited, often not - treat it as a possible destination, never a scheduled one."],
            ["Liquidity", "Places where many orders are likely resting — usually just beyond an obvious high or low."],
            ["Sweep", "Price trading through such an area and closing back inside it."],
            ["ATR", "Average true range: the typical distance price covers in one bar. Use it to size stops."],
            ["Confluence", "Independent pieces of evidence pointing the same way. More confluence is a better argument, never a guarantee."],
            ["Invalidation", "The price at which the reason for the trade no longer exists."],
            ["R multiple", "Profit or loss measured in units of the amount you risked. A 2R win made twice what you put at risk."]].map(([k, v]) => (
            <div key={k} className="stat"><div style={{ fontWeight: 600, fontSize: 12.5 }}>{k}</div><div className="note" style={{ marginTop: 3 }}>{v}</div></div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* =============================== JOURNAL TAB =============================== */
const J_KEY = "fx-journal:v1";
const emptyEntry = (pairLabel, tf) => ({ id: Date.now(), date: new Date().toISOString().slice(0, 10), pair: pairLabel, tf, bias: "Bullish", setup: "Trend continuation", entry: "", stop: "", target: "", result: "Open", r: "", saw: "", happened: "", lesson: "" });
const SETUPS = ["Trend continuation", "Range reversal", "Breakout", "Break and retest", "Liquidity sweep", "Counter-trend", "Other"];

function JournalTab({ pairLabel, tradeTf, digits }) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [storeOk, setStoreOk] = useState(true);
  const [draft, setDraft] = useState(() => emptyEntry(pairLabel, tradeTf));
  const [filt, setFilt] = useState({ pair: "All", setup: "All", result: "All", tf: "All" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await window.storage.get(J_KEY);
        if (alive && res && res.value) setEntries(JSON.parse(res.value));
      } catch (e) { /* no saved journal yet, or storage unavailable */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  const persist = useCallback(async (next) => {
    setEntries(next);
    try { const ok = await window.storage.set(J_KEY, JSON.stringify(next)); setStoreOk(!!ok); }
    catch (e) { setStoreOk(false); }
  }, []);

  const add = () => {
    const e = { ...draft, id: Date.now() };
    if (e.entry !== "" && e.stop !== "" && e.r === "" && e.target !== "" && e.result !== "Open") {
      const risk = Math.abs(Number(e.entry) - Number(e.stop));
      const move = Math.abs(Number(e.target) - Number(e.entry));
      if (risk > 0) e.r = (e.result === "Win" ? move / risk : e.result === "Loss" ? -1 : 0).toFixed(2);
    }
    persist([e, ...entries]);
    setDraft(emptyEntry(pairLabel, tradeTf));
  };
  const remove = (id) => persist(entries.filter((e) => e.id !== id));

  const shown = entries.filter((e) =>
    (filt.pair === "All" || e.pair === filt.pair) && (filt.setup === "All" || e.setup === filt.setup) &&
    (filt.result === "All" || e.result === filt.result) && (filt.tf === "All" || e.tf === filt.tf));
  const closed = shown.filter((e) => e.result === "Win" || e.result === "Loss");
  const wins = closed.filter((e) => e.result === "Win").length;
  const rs = closed.map((e) => Number(e.r)).filter(Number.isFinite);
  const totalR = rs.reduce((s, v) => s + v, 0);
  const bySetup = {};
  closed.forEach((e) => { const v = Number(e.r); if (Number.isFinite(v)) { bySetup[e.setup] = bySetup[e.setup] || { n: 0, r: 0 }; bySetup[e.setup].n++; bySetup[e.setup].r += v; } });
  const ranked = Object.entries(bySetup).sort((x, y) => y[1].r - x[1].r);
  const uniq = (k) => ["All", ...Array.from(new Set(entries.map((e) => e[k])))];

  const D = (k, label, type = "text", opts) => (
    <label><span className="lbl">{label}</span>
      {opts ? <select value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
        : <input type={type} step="any" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />}
    </label>
  );

  return (
    <>
      <Card title="Log a trade">
        <div className="grid g4" style={{ gap: 10 }}>
          {D("date", "Date", "date")}{D("pair", "Pair")}{D("tf", "Timeframe", "text", TFS)}{D("bias", "Market bias", "text", ["Bullish", "Bearish", "Neutral", "No clear setup"])}
          {D("setup", "Setup type", "text", SETUPS)}{D("entry", "Entry", "number")}{D("stop", "Stop loss", "number")}{D("target", "Take profit", "number")}
          {D("result", "Result", "text", ["Open", "Win", "Loss", "Breakeven"])}{D("r", "R multiple", "number")}
        </div>
        <div className="grid g3 mt" style={{ gap: 10 }}>
          <label><span className="lbl">What I saw</span><textarea rows={3} value={draft.saw} onChange={(e) => setDraft({ ...draft, saw: e.target.value })} placeholder="The read at the time of entry" /></label>
          <label><span className="lbl">What actually happened</span><textarea rows={3} value={draft.happened} onChange={(e) => setDraft({ ...draft, happened: e.target.value })} /></label>
          <label><span className="lbl">Lesson learned</span><textarea rows={3} value={draft.lesson} onChange={(e) => setDraft({ ...draft, lesson: e.target.value })} /></label>
        </div>
        <div className="row mt"><button className="btn primary" onClick={add}>Save entry</button>
          <span className="note">R multiple is filled in automatically from entry, stop and target when you record a win or a loss and leave it blank.</span></div>
        {!storeOk && <div className="mt"><Warn level="med">Entries are being kept for this session only — saved storage is not available here, so they will not survive a reload.</Warn></div>}
      </Card>

      <Card title="Performance" right={<span className="tag">{closed.length} closed of {shown.length} shown</span>}>
        <div className="grid g4" style={{ gap: 10 }}>
          <Stat label="Trades" value={shown.length} />
          <Stat label="Win rate" value={closed.length ? `${((wins / closed.length) * 100).toFixed(0)}%` : "—"} tone={closed.length && wins / closed.length >= 0.5 ? "bull" : "flat"} sub={`${wins} of ${closed.length} closed`} />
          <Stat label="Average R" value={rs.length ? (totalR / rs.length).toFixed(2) : "—"} tone={rs.length && totalR / rs.length > 0 ? "bull" : rs.length ? "bear" : "flat"} />
          <Stat label="Total R" value={rs.length ? totalR.toFixed(2) : "—"} tone={totalR > 0 ? "bull" : totalR < 0 ? "bear" : "flat"} />
          <Stat label="Best setup" value={ranked[0] ? ranked[0][0] : "—"} tone="bull" sub={ranked[0] ? `${ranked[0][1].r.toFixed(2)}R over ${ranked[0][1].n} trades` : "needs closed trades"} />
          <Stat label="Worst setup" value={ranked.length > 1 ? ranked[ranked.length - 1][0] : "—"} tone="bear" sub={ranked.length > 1 ? `${ranked[ranked.length - 1][1].r.toFixed(2)}R over ${ranked[ranked.length - 1][1].n} trades` : "needs closed trades"} />
        </div>
        {closed.length > 0 && closed.length < 20 && <div className="mt"><Warn level="med">With {closed.length} closed trade{closed.length === 1 ? "" : "s"}, none of these figures mean much yet. Win rate in particular needs a few dozen results before it stops being noise.</Warn></div>}
        <p className="note mt">Past results in this journal describe what happened, not what will happen. A setup with the best R so far may simply have met the friendliest conditions so far.</p>
      </Card>

      <Card title="Entries" right={
        <div className="row" style={{ gap: 6 }}>
          {[["pair", "Pair"], ["setup", "Setup"], ["result", "Result"], ["tf", "TF"]].map(([k, l]) => (
            <select key={k} value={filt[k]} onChange={(e) => setFilt({ ...filt, [k]: e.target.value })} style={{ width: "auto", padding: "5px 7px", fontSize: 11.5 }}>
              {(k === "result" ? ["All", "Open", "Win", "Loss", "Breakeven"] : k === "setup" ? ["All", ...SETUPS] : uniq(k)).map((o) => <option key={o}>{l === "Pair" || l === "TF" ? o : o}</option>)}
            </select>
          ))}
        </div>}>
        {!loaded && <p className="note">Loading saved entries…</p>}
        {loaded && shown.length === 0 && <p className="note">No entries yet. The journal earns its keep when "what I saw" and "what actually happened" start disagreeing in the same way repeatedly.</p>}
        {shown.length > 0 && (
          <div className="scroll">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Pair</th><th>TF</th><th>Setup</th><th>Bias</th><th>Entry</th><th>Stop</th><th>TP</th><th>Result</th><th>R</th><th>Notes</th><th /></tr></thead>
              <tbody>{shown.map((e) => (
                <tr key={e.id}>
                  <td className="num">{e.date}</td><td>{e.pair}</td><td className="num">{e.tf}</td><td>{e.setup}</td>
                  <td><Pill tone={readTone(e.bias)}>{e.bias}</Pill></td>
                  <td className="num">{e.entry}</td><td className="num">{e.stop}</td><td className="num">{e.target}</td>
                  <td><Pill tone={e.result === "Win" ? "bull" : e.result === "Loss" ? "bear" : "flat"}>{e.result}</Pill></td>
                  <td className="num">{e.r}</td>
                  <td className="note" style={{ minWidth: 190 }}>{e.saw && <div><b>Saw:</b> {e.saw}</div>}{e.happened && <div><b>Happened:</b> {e.happened}</div>}{e.lesson && <div style={{ color: T.warn }}><b>Lesson:</b> {e.lesson}</div>}</td>
                  <td style={{ textAlign: "right" }}><button className="why" onClick={() => remove(e.id)}>DELETE</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
