# Algo Trading Bot

An algorithmic trading bot that monitors selected tickers and executes trades based on the 200-day Simple Moving Average (SMA) strategy.

## Strategy

The bot checks each ticker every 2 weeks and:
- **Buys** when the price moves 1% or more **above** the 200-day SMA (momentum strategy)
- **Sells** when the price moves 1% or more **below** the 200-day SMA (trend weakness)
- **Holds** when the price is within 1% of the 200-day SMA

## Setup

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Robinhood credentials:
```
ROBINHOOD_USERNAME=your_username
ROBINHOOD_PASSWORD=your_password
ROBINHOOD_MFA_CODE=  # Optional if 2FA is enabled
TRADE_AMOUNT=1000  # Dollar amount per buy order
DRY_RUN=true  # Set to false for real trades
```

### 3. Configure Tickers

Edit `config/tickers.json` to add your desired tickers:

```json
{
  "tickers": [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "TSLA"
  ]
}
```

## Usage

### Run Locally (Manual Execution)

For local testing:

```bash
npm run trading-bot
```

### Deploy to Vercel with Cron Jobs

The bot is configured to run automatically on Vercel using cron jobs.

**1. Deploy to Vercel:**

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Deploy
vercel
```

**2. Set Environment Variables in Vercel:**

Go to your Vercel project settings → Environment Variables and add:
- `ROBINHOOD_USERNAME`
- `ROBINHOOD_PASSWORD`
- `ROBINHOOD_MFA_CODE` (if 2FA is enabled)
- `ROBINHOOD_CLIENT_ID` (optional, defaults to public client ID)
- `TRADE_AMOUNT` (default: 1000)
- `DRY_RUN` (set to `true` for testing, `false` for real trades)
- `CRON_SECRET` (optional, for additional security)

**3. Cron Schedule:**

The bot is configured in `vercel.json` to run on the **1st and 15th of each month at 9:00 AM UTC**. 

To modify the schedule, edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/trading-bot",
      "schedule": "0 9 1,15 * *"  // 9 AM UTC on 1st and 15th of each month
    }
  ]
}
```

**4. Manual Trigger (for testing):**

You can manually trigger the bot by visiting:
```
https://your-app.vercel.app/api/trading-bot
```

Or using curl:
```bash
curl https://your-app.vercel.app/api/trading-bot
```

## Important Notes

### ⚠️ Robinhood API Authentication

**Current Implementation**: The bot now implements Robinhood's OAuth2 authentication flow as documented at [https://docs.robinhood.com/crypto/trading/#section/Authentication](https://docs.robinhood.com/crypto/trading/#section/Authentication).

The authentication flow includes:
1. **Device Token Generation**: Generates a unique device token for each session
2. **OAuth2 Token Request**: Uses device token + credentials to obtain access token
3. **Token Refresh**: Supports refreshing expired access tokens

**Note**: While this follows Robinhood's documented authentication pattern, be aware that:
- Robinhood's API is not officially public
- The API may change without notice
- Using automated trading may violate Robinhood's Terms of Service
- Your account could be restricted

**Testing**: Always start with `DRY_RUN=true` to test the logic without executing real trades.

### ⚠️ Risk Management

- **Start with DRY_RUN=true** to test the bot without executing real trades
- Test thoroughly before enabling real trading
- Be aware of pattern day trading rules (accounts under $25k)
- Consider implementing additional safeguards (stop losses, position sizing, etc.)

### ⚠️ Legal & Compliance

- Ensure compliance with Robinhood's Terms of Service
- Be aware of trading regulations in your jurisdiction
- Consider consulting with a financial advisor
- This bot is for educational purposes - use at your own risk

## Project Structure

```
├── config/
│   └── tickers.json          # List of tickers to monitor
├── lib/
│   ├── robinhood.ts          # Robinhood API client
│   ├── sma.ts                # SMA calculation utilities
│   └── trading-strategy.ts   # Trading logic
├── scripts/
│   └── trading-bot.ts        # Main bot script
└── .env                      # Environment variables (not in git)
```

## Development

This is a [Next.js](https://nextjs.org) project, but the trading bot runs as a standalone Node.js script.

To run the Next.js app:
```bash
npm run dev
```

## Next Steps

1. **Implement proper Robinhood authentication** (see notes above)
2. **Add error handling and retry logic**
3. **Implement logging** (consider using Winston or similar)
4. **Add position management** (track what you own)
5. **Add email/notification alerts** for trades
6. **Backtest your strategy** before going live
7. **Add unit tests** for critical functions

## Disclaimer

This software is provided for educational purposes only. Trading stocks involves risk, and you should never invest more than you can afford to lose. The authors are not responsible for any financial losses incurred from using this bot.
