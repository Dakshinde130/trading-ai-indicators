# Trading AI — Indicator Reference

A small, **educational** collection of technical-analysis (TA) indicator code,
in both Python and JavaScript. It implements common indicator math — EMA/ADX
trend classification, support/resistance & pivot levels, and order-block
detection.

> **This is not a working trading tool.** It contains **no live market-data
> fetching** and **no trade-signal / entry-exit generation**. It cannot connect
> to any exchange, broker, or data provider, and it produces no buy/sell calls.
> The code is published purely as a reference for how these indicators are
> calculated.

## Contents

```
├── config.py                # default indicator parameters (EMA/ADX, order blocks)
├── requirements.txt         # pandas, numpy, ta
├── watchlist.txt            # example list of public NSE tickers
│
├── indicators/              # Python indicator math
│   ├── trend.py             # EMA + ADX trend per timeframe
│   ├── levels.py            # support/resistance, pivots, round numbers, zones
│   └── order_blocks.py      # order-block detection
│
└── firefox_extension/       # browser-side indicator math (reference only)
    ├── manifest.json        # inert MV3 manifest — no host permissions, no network
    ├── lib_indicators.js    # EMA / ADX
    ├── lib_levels.js        # support/resistance & zones
    ├── lib_orderblocks.js   # order-block detection
    └── icons/
```

## Using the Python indicators

```python
import pandas as pd
from indicators.trend import add_trend_columns, classify_trend

# df must be an OHLCV DataFrame you supply yourself (columns: open, high, low, close, volume)
enriched = add_trend_columns(df, ema_fast=21, ema_slow=50, adx_period=14)
print(classify_trend(enriched, adx_threshold=25))
```

You bring your own price data (e.g. a CSV you already have). Nothing here
downloads data for you.

## Disclaimer

Educational reference only. Not financial advice, not a signal service, and
not intended for live trading. No warranty of any kind.

## License

Released under the [MIT License](LICENSE).
