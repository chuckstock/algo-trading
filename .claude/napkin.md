# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-03-02 | self | Assumed the repo already had `.claude/napkin.md`; the first read failed. | Create the napkin file at session start if it is missing before continuing work. |

## User Preferences
- Keep BTC and ETH on a 20-day moving average instead of the default equity lookback.
- Prefer the dashboard to feel editorial and newspaper-like rather than like a generic SaaS panel.

## Patterns That Work
- Make SMA configuration symbol-aware and return the actual SMA period in analysis results so UI and notifications stay accurate.
- For this UI, a broadsheet treatment works well: serif masthead, mono ticker labels, paper-toned palette, and section rules instead of rounded app cards.

## Patterns That Don't Work
- Hard-coding `200-day SMA` strings in shared models and messages makes crypto-specific strategy changes error-prone.

## Domain Notes
- This repo monitors mixed assets, including equities and crypto tickers (`BTC-USD`, `ETH-USD`), so strategy defaults may need per-symbol overrides.
- The frontend surface is concentrated in `app/page.tsx`, `app/layout.tsx`, and `app/globals.css`; searching `components/` or `src/` is wasted motion in this repo.

- `npm run lint` fails on existing `no-explicit-any` errors in `app/api/trading-bot/route.ts`; if touching that route, clear them so validation passes.
- Separating weekday and month-end cron routes avoids duplicate or skipped runs when schedules overlap on days 28-31.
| 2026-03-03 | self | Tried to patch `app/page.tsx` with context that no longer matched after a large rewrite and the patch failed. | When replacing most of a small page component, rewrite the file in one patch instead of anchoring to many brittle context lines. |
