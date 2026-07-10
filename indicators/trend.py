"""indicators/trend.py - multi-TF trend (EMA + ADX)."""

import pandas as pd
from ta.trend import EMAIndicator, ADXIndicator


def add_trend_columns(df, ema_fast, ema_slow, adx_period):
    out = df.copy()
    out["ema_fast"] = EMAIndicator(close=out["close"], window=ema_fast).ema_indicator()
    out["ema_slow"] = EMAIndicator(close=out["close"], window=ema_slow).ema_indicator()
    out["adx"] = ADXIndicator(high=out["high"], low=out["low"],
                               close=out["close"], window=adx_period).adx()
    return out


def classify_trend(df, adx_threshold):
    last = df.iloc[-1]
    if last["ema_fast"] > last["ema_slow"]:
        direction = "up"
    elif last["ema_fast"] < last["ema_slow"]:
        direction = "down"
    else:
        direction = "flat"
    adx_value = float(last["adx"]) if pd.notna(last["adx"]) else 0.0
    strength = "strong" if adx_value >= adx_threshold else "weak"
    if strength == "weak":
        label = "RANGING"
    elif direction == "up":
        label = "BULLISH"
    elif direction == "down":
        label = "BEARISH"
    else:
        label = "RANGING"
    return {"direction": direction, "strength": strength,
            "adx": round(adx_value, 2), "label": label,
            "price": float(last["close"])}


def analyze_multi_timeframe(dfs, ema_fast, ema_slow, adx_period, adx_threshold):
    results = {}
    for tf_label, df in dfs.items():
        enriched = add_trend_columns(df, ema_fast, ema_slow, adx_period)
        results[tf_label] = classify_trend(enriched, adx_threshold)
        results[tf_label]["dataframe"] = enriched
    high = results["high"]["label"]
    mid  = results["mid"]["label"]
    if high == mid and high in ("BULLISH", "BEARISH"):
        results["mtf_label"] = high
    else:
        results["mtf_label"] = "MIXED"
    return results
