/* Trading AI - S/R, pivots, round numbers, zone clustering (pure JS) */
const TAI_LEVELS = (function () {

  function findSwings(candles, left, right, lookback) {
    left = left || 3; right = right || 3; lookback = lookback || 200;
    const out = [];
    const start = Math.max(left, candles.length - lookback);
    const end = candles.length - right;
    for (let i = start; i < end; i++) {
      let hMax = -Infinity, lMin = Infinity;
      for (let j = i - left; j <= i + right; j++) {
        if (candles[j].high > hMax) hMax = candles[j].high;
        if (candles[j].low  < lMin) lMin = candles[j].low;
      }
      if (candles[i].high >= hMax) out.push({ type:"high", price: candles[i].high, time: candles[i].time });
      if (candles[i].low  <= lMin) out.push({ type:"low",  price: candles[i].low,  time: candles[i].time });
    }
    return out;
  }

  function dailyPivots(ph, pl, pc) {
    const pp = (ph + pl + pc) / 3;
    return {
      PP: pp,
      R1: 2*pp - pl,  S1: 2*pp - ph,
      R2: pp + (ph - pl),  S2: pp - (ph - pl),
      R3: ph + 2*(pp - pl),  S3: pl - 2*(ph - pp),
    };
  }

  function roundNumberLevels(price, count) {
    count = count || 3;
    let step;
    if (price < 100)      step = 5;
    else if (price < 500) step = 25;
    else if (price < 1000)step = 50;
    else if (price < 5000)step = 100;
    else                  step = 250;
    const base = Math.floor(price / step) * step;
    const out = [];
    for (let k = -count; k <= count; k++) out.push(base + k * step);
    return out;
  }

  function clusterLevels(levels, tolerancePct) {
    tolerancePct = tolerancePct == null ? 0.5 : tolerancePct;
    if (!levels.length) return [];
    const items = levels.slice().sort((a,b) => a.price - b.price);
    const zones = [];
    let current = [items[0]];
    for (let i = 1; i < items.length; i++) {
      const anchor = current[current.length - 1].price;
      if (Math.abs(items[i].price - anchor) / anchor * 100 <= tolerancePct) {
        current.push(items[i]);
      } else {
        zones.push(_zone(current));
        current = [items[i]];
      }
    }
    zones.push(_zone(current));
    zones.sort((a,b) => b.strength - a.strength);
    return zones;
  }

  function _zone(items) {
    const prices = items.map(x => x.price);
    const sum = prices.reduce((a,b) => a+b, 0);
    return {
      center:   Math.round(sum / prices.length * 100) / 100,
      low:      Math.round(Math.min(...prices) * 100) / 100,
      high:     Math.round(Math.max(...prices) * 100) / 100,
      strength: items.length,
      sources:  items.map(x => x.source),
    };
  }

  function buildZoneMap(dailyCandles, intradayCandles, orderBlocks, currentPrice) {
    const raw = [];
    findSwings(dailyCandles, 3, 3, 120).forEach(s =>
      raw.push({ price: s.price, source: "daily-swing-" + s.type }));
    findSwings(intradayCandles, 3, 3, 120).forEach(s =>
      raw.push({ price: s.price, source: "intraday-swing-" + s.type }));

    if (dailyCandles.length >= 2) {
      const prev = dailyCandles[dailyCandles.length - 2];
      const piv = dailyPivots(prev.high, prev.low, prev.close);
      for (const k of Object.keys(piv)) raw.push({ price: piv[k], source: "pivot-" + k });
      raw.push({ price: prev.high,  source: "PDH" });
      raw.push({ price: prev.low,   source: "PDL" });
      raw.push({ price: prev.close, source: "PDC" });
    }
    roundNumberLevels(currentPrice, 4).forEach(rn =>
      raw.push({ price: rn, source: "round-" + rn }));
    orderBlocks.forEach(ob => {
      raw.push({ price: ob.top,    source: "OB-" + ob.type + "-top" });
      raw.push({ price: ob.bottom, source: "OB-" + ob.type + "-bottom" });
    });
    return clusterLevels(raw, 0.5);
  }

  function nearestZones(zones, price, nAbove, nBelow) {
    nAbove = nAbove || 3; nBelow = nBelow || 3;
    const above = zones.filter(z => z.center >= price).sort((a,b) => a.center - b.center).slice(0, nAbove);
    const below = zones.filter(z => z.center <  price).sort((a,b) => b.center - a.center).slice(0, nBelow);
    return { above, below };
  }

  return { findSwings, dailyPivots, roundNumberLevels, clusterLevels, buildZoneMap, nearestZones };
})();
