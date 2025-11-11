# Weekly Market Analysis Bot

A market analysis bot that monitors selected tickers using the 200-day Simple Moving Average (SMA) strategy and sends weekly chart updates to your Telegram device every Friday at market close.

## Strategy

The bot analyzes each ticker weekly and provides:
- **BUY signal** when the price is 1% or more **above** the 200-day SMA (momentum)
- **SELL signal** when the price is 1% or more **below** the 200-day SMA (trend weakness)
- **HOLD signal** when the price is within 1% of the 200-day SMA

Instead of automatically executing trades, the bot sends you detailed charts and analysis via Telegram, allowing you to make informed trading decisions.

## Setup

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Set Up Telegram Bot

**Create a Telegram Bot:**
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` and follow the instructions
3. Save the **Bot Token** you receive
4. Start a chat with your new bot
5. Get your **Chat ID**:
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your `chat.id` in the response

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your Telegram credentials:
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id
CRON_SECRET=your_secret_for_vercel_cron  # Optional
```

### 4. Configure Tickers

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

### Deploy to Vercel with Cron Jobs

The bot is configured to run automatically on Vercel using cron jobs to send weekly market analysis every Friday at market close.

**1. Deploy to Vercel:**

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Deploy
vercel
```

**2. Set Environment Variables in Vercel:**

Go to your Vercel project settings → Environment Variables and add:
- `TELEGRAM_BOT_TOKEN` (required - from BotFather)
- `TELEGRAM_CHAT_ID` (required - your chat ID)
- `CRON_SECRET` (optional, for additional security)

**3. Cron Schedule:**

The bot is configured in `vercel.json` to run **every Friday at 9:00 PM UTC** (approximately 4-5 PM ET, depending on DST).

The schedule in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/trading-bot",
      "schedule": "0 21 * * 5"  // 9 PM UTC every Friday
    }
  ]
}
```

**4. Manual Trigger (for testing):**

You can manually trigger the analysis by visiting:
```
https://your-app.vercel.app/api/trading-bot
```

Or using curl:
```bash
curl https://your-app.vercel.app/api/trading-bot
```

### What You'll Receive

Every Friday after market close, you'll receive a Telegram message containing:
- 📊 **Summary statistics** (number of BUY/SELL/HOLD signals)
- 📈 **Detailed analysis** for each ticker with current price and deviation from 200-day SMA
- 📉 **Visual chart** showing all tickers and their signals

## Important Notes

### 📱 Telegram Bot Setup

Make sure to:
1. Start a chat with your bot before it can send you messages
2. Keep your bot token secure (never commit it to git)
3. The bot sends messages using the chat ID you configured

### 📊 Data Source

- Market data is fetched from **Yahoo Finance** API
- The bot analyzes the last 200 trading days to calculate the SMA
- Analysis runs automatically every Friday at market close

### ⚠️ Disclaimer

This bot is for **informational and educational purposes only**. The signals provided are based on a simple technical indicator and should not be considered financial advice. Always:
- Do your own research before making trading decisions
- Consider consulting with a financial advisor
- Be aware of trading regulations in your jurisdiction
- Understand that past performance does not guarantee future results

## Project Structure

```
├── app/
│   └── api/
│       └── trading-bot/
│           └── route.ts      # API endpoint for weekly analysis
├── config/
│   └── tickers.json          # List of tickers to monitor
├── lib/
│   ├── telegram.ts           # Telegram bot service
│   ├── charts.ts             # Chart generation utilities
│   ├── sma.ts                # SMA calculation utilities
│   └── trading-strategy.ts   # Analysis logic
└── .env                      # Environment variables (not in git)
```

## Development

This is a [Next.js](https://nextjs.org) project. To run the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Future Enhancements

Potential improvements to consider:
1. **Additional technical indicators** (RSI, MACD, Bollinger Bands)
2. **Individual ticker charts** sent along with the summary
3. **Historical performance tracking** of signals
4. **Customizable alert thresholds** per ticker
5. **Multiple notification channels** (email, Discord, etc.)
6. **Backtesting dashboard** to evaluate strategy performance
7. **Mobile app** for easier chart viewing
