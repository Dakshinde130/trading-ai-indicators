"""indicators/levels.py - S/R + pivots + round numbers + zone clustering."""

import math
import pandas as pd


def find_swings(df, left=3, right=3, lookback=200):
    swings = []
    start = max(left, len(df) - lookback)
    end = len(df) - right
    for i in range(start, end):
        win_h = df["high"].iloc[i-left : i+right+1]
        win_l = df["low"].iloc[i-left : i+right+1]
        if df["high"].iloc[i] >= win_h.max():
            swings.append({"type":"high","price":float(df["high"].iloc[i]),"timestamp":df.index[i]})
        if df["low"].iloc[i] <= win_l.min():
            swings.append({"type":"low","price":float(df["low"].iloc[i]),"timestamp":df.index[i]})
    return swings


def daily_pivots(ph, pl, pc):
    pp = (ph + pl + pc) / 3
    return {
        "PP": round(pp, 2),
        "R1": round(2*pp - pl, 2),  "S1": round(2*pp - ph, 2),
        "R2": round(pp + (ph-pl), 2), "S2": round(pp - (ph-pl), 2),
        "R3": round(ph + 2*(pp-pl), 2), "S3": round(pl - 2*(ph-pp), 2),
    }


def prev_day_levels(df_daily):
    prev = df_daily.iloc[-2]
    return {"PDH": float(prev["high"]), "PDL": float(prev["low"]), "PDC": float(prev["close"])}


def round_number_levels(price, count=3, step=None):
    if step is None:
        if price < 100:    step = 5
        elif price < 500:  step = 25
        elif price < 1000: step = 50
        elif price < 5000: step = 100
        else:              step = 250
    base = math.floor(price / step) * step
    return [round(base + k * step, 2) for k in range(-count, count+1)]


def cluster_levels(levels, tolerance_pct=0.5):
    if not levels:
        return []
    items = sorted(levels, key=lambda x: x["price"])
    zones = []
    current = [items[0]]
    for lv in items[1:]:
        anchor = current[-1]["price"]
        if abs(lv["price"] - anchor) / anchor * 100 <= tolerance_pct:
            current.append(lv)
        else:
            zones.append(_zone(current)); current = [lv]
    zones.append(_zone(current))
    zones.sort(key=lambda z: z["strength"], reverse=True)
    return zones


def _zone(items):
    prices = [x["price"] for x in items]
    return {"center": round(sum(prices)/len(prices), 2),
            "low": round(min(prices), 2), "high": round(max(prices), 2),
            "strength": len(items), "sources": [x["source"] for x in items]}


def build_zone_map(df_daily, df_intraday, order_blocks, current_price, tolerance_pct=0.5):
    raw = []
    for s in find_swings(df_daily, 3, 3, 120):
        raw.append({"price": s["price"], "source": f"daily-swing-{s['type']}"})
    for s in find_swings(df_intraday, 3, 3, 120):
        raw.append({"price": s["price"], "source": f"intraday-swing-{s['type']}"})
    if len(df_daily) >= 2:
        prev = df_daily.iloc[-2]
        piv = daily_pivots(float(prev["high"]), float(prev["low"]), float(prev["close"]))
        for name, p in piv.items():
            raw.append({"price": p, "source": f"pivot-{name}"})
        pdl = prev_day_levels(df_daily)
        for name in ("PDH","PDL","PDC"):
            raw.append({"price": pdl[name], "source": name})
    for rn in round_number_levels(current_price, count=4):
        raw.append({"price": rn, "source": f"round-{rn}"})
    for ob in order_blocks:
        raw.append({"price": ob["top"],    "source": f"OB-{ob['type']}-top"})
        raw.append({"price": ob["bottom"], "source": f"OB-{ob['type']}-bottom"})
    return cluster_levels(raw, tolerance_pct=tolerance_pct)


def nearest_zones(zones, price, n_above=2, n_below=2):
    above = sorted([z for z in zones if z["center"] >= price], key=lambda z: z["center"])
    below = sorted([z for z in zones if z["center"] < price], key=lambda z: z["center"], reverse=True)
    return {"above": above[:n_above], "below": below[:n_below]}
