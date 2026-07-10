"""indicators/order_blocks.py - auto-detect bullish/bearish order blocks."""

import pandas as pd


def _is_bullish(c):
    return c["close"] >= c["open"]


def detect_order_blocks(df, impulse_candles, impulse_min_pct, lookback):
    blocks = []
    start = max(len(df) - lookback, 0)
    end = len(df) - impulse_candles
    for i in range(start, end):
        candle = df.iloc[i]
        impulse = df.iloc[i+1 : i+1+impulse_candles]
        if len(impulse) < impulse_candles:
            continue
        impulse_bullish = (impulse["close"] >= impulse["open"]).all()
        impulse_bearish = (impulse["close"] < impulse["open"]).all()
        if not (impulse_bullish or impulse_bearish):
            continue
        candle_bullish = _is_bullish(candle)
        if impulse_bullish and candle_bullish:
            continue
        if impulse_bearish and not candle_bullish:
            continue
        start_p = candle["close"]; end_p = impulse.iloc[-1]["close"]
        move_pct = abs(end_p - start_p) / start_p * 100
        if move_pct < impulse_min_pct:
            continue
        blocks.append({
            "type": "bullish" if impulse_bullish else "bearish",
            "timestamp": candle.name,
            "top": float(candle["high"]),
            "bottom": float(candle["low"]),
            "impulse_pct": round(float(move_pct), 2),
        })
    return blocks


def latest_block(blocks, block_type):
    filtered = [b for b in blocks if b["type"] == block_type]
    if not filtered:
        return None
    return max(filtered, key=lambda b: b["timestamp"])
