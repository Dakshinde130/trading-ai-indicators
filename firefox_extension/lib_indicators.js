/* Trading AI - indicators (EMA, ADX, ATR, trend classification) in pure JS */
const TAI_IND = (function () {

  function ema(values, period) {
    if (values.length < period) return [];
    const k = 2 / (period + 1);
    const out = new Array(values.length).fill(null);
    // Seed with SMA of the first `period` values
    let sma = 0;
    for (let i = 0; i < period; i++) sma += values[i];
    sma /= period;
    out[period - 1] = sma;
    for (let i = period; i < values.length; i++) {
      out[i] = values[i] * k + out[i-1] * (1 - k);
    }
    return out;
  }

  // True Range and Wilder ATR (matches the `ta` library output reasonably well)
  function trueRange(candles) {
    const tr = new Array(candles.length).fill(null);
    for (let i = 1; i < candles.length; i++) {
      const h = candles[i].high, l = candles[i].low, pc = candles[i-1].close;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
    return tr;
  }

  function atr(candles, period) {
    const tr = trueRange(candles);
    const out = new Array(candles.length).fill(null);
    if (tr.length <= period) return out;
    // Initial seed = simple mean of first `period` TR values (skipping null at idx 0)
    let sum = 0, count = 0;
    for (let i = 1; i <= period; i++) { if (tr[i] != null) { sum += tr[i]; count++; } }
    if (count === 0) return out;
    out[period] = sum / count;
    for (let i = period + 1; i < tr.length; i++) {
      // Wilder smoothing
      out[i] = (out[i-1] * (period - 1) + tr[i]) / period;
    }
    return out;
  }

  // ADX (Wilder). Returns array same length as candles, mostly nulls until ready.
  function adx(candles, period) {
    const n = candles.length;
    const plusDM  = new Array(n).fill(0);
    const minusDM = new Array(n).fill(0);
    const tr      = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const upMove   = candles[i].high - candles[i-1].high;
      const downMove = candles[i-1].low - candles[i].low;
      plusDM[i]  = (upMove   > downMove && upMove   > 0) ? upMove   : 0;
      minusDM[i] = (downMove > upMove   && downMove > 0) ? downMove : 0;
      const h = candles[i].high, l = candles[i].low, pc = candles[i-1].close;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
    // Wilder smoothed sums
    const smTR = new Array(n).fill(0);
    const smP  = new Array(n).fill(0);
    const smM  = new Array(n).fill(0);
    for (let i = 1; i <= period && i < n; i++) {
      smTR[period] += tr[i]; smP[period] += plusDM[i]; smM[period] += minusDM[i];
    }
    for (let i = period + 1; i < n; i++) {
      smTR[i] = smTR[i-1] - smTR[i-1] / period + tr[i];
      smP[i]  = smP[i-1]  - smP[i-1]  / period + plusDM[i];
      smM[i]  = smM[i-1]  - smM[i-1]  / period + minusDM[i];
    }
    const dx = new Array(n).fill(null);
    for (let i = period; i < n; i++) {
      if (!smTR[i]) continue;
      const pDI = 100 * smP[i] / smTR[i];
      const mDI = 100 * smM[i] / smTR[i];
      const denom = pDI + mDI;
      dx[i] = denom ? 100 * Math.abs(pDI - mDI) / denom : 0;
    }
    const out = new Array(n).fill(null);
    // ADX = Wilder smoothing of DX
    let firstAdxIdx = period * 2;
    if (firstAdxIdx < n) {
      let s = 0, c = 0;
      for (let i = period; i < firstAdxIdx && i < n; i++) {
        if (dx[i] != null) { s += dx[i]; c++; }
      }
      if (c > 0) out[firstAdxIdx] = s / c;
      for (let i = firstAdxIdx + 1; i < n; i++) {
        if (dx[i] == null || out[i-1] == null) continue;
        out[i] = (out[i-1] * (period - 1) + dx[i]) / period;
      }
    }
    return out;
  }

  function classifyTrend(candles, opts) {
    opts = opts || {};
    const emaFast    = opts.emaFast    || 21;
    const emaSlow    = opts.emaSlow    || 50;
    const adxPeriod  = opts.adxPeriod  || 14;
    const adxThresh  = opts.adxThresh  || 25;
    const minBars    = Math.max(emaSlow, adxPeriod * 2) + 5;
    if (candles.length < minBars) return { label: "N/A", adx: 0, price: null };

    const closes = candles.map(c => c.close);
    const fast = ema(closes, emaFast);
    const slow = ema(closes, emaSlow);
    const adxArr = adx(candles, adxPeriod);

    const i = candles.length - 1;
    const f = fast[i], s = slow[i], a = adxArr[i] || 0;
    if (f == null || s == null) return { label: "N/A", adx: a, price: candles[i].close };

    const direction = f > s ? "up" : f < s ? "down" : "flat";
    const strong = a >= adxThresh;
    let label = "Neutral";
    if (strong && direction === "up")   label = "Bullish";
    if (strong && direction === "down") label = "Bearish";

    return { label, adx: Math.round(a * 10) / 10, price: candles[i].close, ema_fast: f, ema_slow: s };
  }

  return { ema, atr, adx, classifyTrend };
})();
