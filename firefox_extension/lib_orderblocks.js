/* Trading AI - automatic order block detection (pure JS) */
const TAI_OB = (function () {

  function isBullish(c) { return c.close >= c.open; }

  function detect(candles, opts) {
    opts = opts || {};
    const impulse = opts.impulseCandles || 3;
    const minPct  = opts.impulseMinPct  || 1.0;
    const look    = opts.lookback       || 100;
    const out = [];
    const start = Math.max(0, candles.length - look);
    const end   = candles.length - impulse;
    for (let i = start; i < end; i++) {
      const c  = candles[i];
      const imp = candles.slice(i + 1, i + 1 + impulse);
      if (imp.length < impulse) continue;
      const allUp   = imp.every(isBullish);
      const allDown = imp.every(x => !isBullish(x));
      if (!allUp && !allDown) continue;
      const cBull = isBullish(c);
      if (allUp && cBull) continue;
      if (allDown && !cBull) continue;
      const startP = c.close, endP = imp[imp.length - 1].close;
      const pct = Math.abs(endP - startP) / startP * 100;
      if (pct < minPct) continue;
      out.push({
        type: allUp ? "bullish" : "bearish",
        time: c.time,
        top: c.high,
        bottom: c.low,
        impulse_pct: Math.round(pct * 100) / 100,
      });
    }
    return out;
  }

  return { detect };
})();
